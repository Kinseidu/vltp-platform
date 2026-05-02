// src/app/api/applications/[id]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { notifyApplicationStatus } from '@/lib/services/notification.service';
import { ApplicationStatus, UserRole } from '@prisma/client';

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
  note: z.string().max(500).optional(),
});

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session) return forbidden();

  const appId = parseInt(params.id);

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      job: {
        include: {
          requirements: { include: { skill: true } },
          eligibleCommunities: { include: { community: true } },
          requiredDocTypes: true,
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
      shortlistResult: true,
      interviewPacks: {
        include: { questions: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { generatedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!application) return notFound('Application not found');

  // Scope: applicant can only see own application
  if (session.role === UserRole.APPLICANT) {
    const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
    if (!profile || application.applicantId !== profile.id) return forbidden();
  }

  return ok({ application });
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden('Only HR Officers can update application status');
  }

  const appId = parseInt(params.id);
  const body = UpdateStatusSchema.parse(await req.json());

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      job: { select: { title: true } },
      applicant: { include: { user: { select: { id: true } } } },
    },
  });
  if (!application) return notFound('Application not found');

  const before = { status: application.status };

  const updated = await prisma.application.update({
    where: { id: appId },
    data: { status: body.status },
  });

  await audit({
    actorId: session.id,
    action: 'APPLICATION_STATUS_UPDATED',
    entity: 'Application',
    entityId: appId,
    before: before as any,
    after: { status: body.status, note: body.note } as any,
  });

  await notifyApplicationStatus(
    application.applicant.user.id,
    body.status,
    application.job.title,
    appId,
  );

  return ok({ application: updated });
});
