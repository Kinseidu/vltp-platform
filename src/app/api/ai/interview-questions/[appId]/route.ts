// src/app/api/ai/interview-questions/[appId]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { unauthorized, notFound, serverError, ok, created, error as apiError, forbidden, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { generateInterviewQuestions } from '@/lib/ai/ai.service';
import { QuestionType, UserRole } from '@prisma/client';

// GET: Fetch latest interview question pack for an application
export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { appId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return unauthorized();
  }

  const appId = parseInt(params.appId);
  const pack = await prisma.interviewQuestionPack.findFirst({
    where: { applicationId: appId },
    include: { questions: { orderBy: { displayOrder: 'asc' } } },
    orderBy: { generatedAt: 'desc' },
  });

  if (!pack) return notFound('No interview question pack found for this application');
  return ok({ pack });
});

// POST: Generate new interview question pack
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { appId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return unauthorized();
  }

  const appId = parseInt(params.appId);

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      job: {
        include: {
          requirements: { include: { skill: true } },
          eligibleCommunities: { include: { community: true } },
          requiredDocTypes: true,
          postedBy: { select: { id: true, email: true } },
          _count: { select: { applications: true } },
        },
      },
      applicant: {
        include: {
          user: { select: { id: true, email: true, phone: true } },
          community: true,
          skills: { include: { skill: true } },
          workExperiences: true,
        },
      },
      documents: true,
    },
  });

  if (!application) return notFound('Application not found');

  try {
    // Generate questions via AI
    const questions = await generateInterviewQuestions(application.job as any, application as any);

    // Persist the pack
    const pack = await prisma.interviewQuestionPack.create({
      data: {
        applicationId: appId,
        questions: {
          create: questions.map((q, idx) => ({
            type: q.type,
            question: q.question,
            rubric: q.rubric,
            mappedTo: q.mappedTo,
            displayOrder: idx + 1,
          })),
        },
      },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    });

    await audit({
      actorId: session.id,
      action: 'INTERVIEW_QUESTIONS_GENERATED',
      entity: 'InterviewQuestionPack',
      entityId: pack.id,
      after: { applicationId: appId, questionCount: questions.length } as any,
    });

    return created({ pack }, `Generated ${questions.length} interview questions`);
  } catch (err: any) {
    console.error('[AI Interview Questions POST]', err);
    return serverError(err.message || 'Failed to generate interview questions');
  }
});

// PUT: Edit questions in a pack
const EditPackSchema = z.object({
  packId: z.number().int().positive(),
  questions: z.array(z.object({
    id: z.number().int().positive().optional(),
    type: z.nativeEnum(QuestionType),
    question: z.string().min(5),
    rubric: z.string().optional(),
    mappedTo: z.string().optional(),
    displayOrder: z.number().int().min(1),
  })),
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { appId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const body = EditPackSchema.parse(await req.json());

  const pack = await prisma.interviewQuestionPack.findUnique({
    where: { id: body.packId },
  });
  if (!pack) return notFound('Question pack not found');

  // Delete all existing questions and replace
  await prisma.interviewQuestion.deleteMany({ where: { packId: pack.id } });
  await prisma.interviewQuestion.createMany({
    data: body.questions.map(q => ({
      packId: pack.id,
      type: q.type,
      question: q.question,
      rubric: q.rubric,
      mappedTo: q.mappedTo,
      displayOrder: q.displayOrder,
    })),
  });

  await prisma.interviewQuestionPack.update({
    where: { id: pack.id },
    data: { isEdited: true },
  });

  const updated = await prisma.interviewQuestionPack.findUnique({
    where: { id: pack.id },
    include: { questions: { orderBy: { displayOrder: 'asc' } } },
  });

  await audit({
    actorId: session.id,
    action: 'INTERVIEW_QUESTIONS_GENERATED',
    entity: 'InterviewQuestionPack',
    entityId: pack.id,
    after: { questionCount: body.questions.length, edited: true } as any,
  });

  return ok({ pack: updated }, 'Question pack updated');
});
