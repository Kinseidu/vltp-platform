// src/app/api/jobs/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, unauthorized, forbidden, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { runJobMatchingAndNotify } from '@/lib/services/matching.service';
import { DocumentType, JobStatus, UserRole } from '@prisma/client';

const PostJobSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10),
  scope: z.string().min(10),
  responsibilities: z.string().min(10),
  minExperience: z.number().int().min(0).max(40),
  applicationDeadline: z.string().optional(),
  status: z.nativeEnum(JobStatus).optional().default(JobStatus.DRAFT),
  requirements: z.array(z.object({
    skillId: z.number().int().positive(),
    isMandatory: z.boolean(),
    minYears: z.number().int().min(0),
  })),
  eligibleCommunityIds: z.array(z.number().int().positive()),
  requiredDocTypes: z.array(z.object({
    docType: z.nativeEnum(DocumentType),
    label: z.string(),
    required: z.boolean(),
  })),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get('status') as JobStatus | null;
  const search = url.searchParams.get('search') || '';

  const where: any = {
    ...(status ? { status } : { status: JobStatus.OPEN }),
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
  };

  // HR / Admin see all jobs; Applicants see only OPEN
  if (session.role === UserRole.APPLICANT) {
    where.status = JobStatus.OPEN;
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      postedBy: { select: { id: true, email: true } },
      requirements: { include: { skill: true } },
      eligibleCommunities: { include: { community: true } },
      requiredDocTypes: true,
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ jobs, total: jobs.length });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden('Only HR Officers can post jobs');
  }

  const body = PostJobSchema.parse(await req.json());

  const job = await prisma.job.create({
    data: {
      postedById: session.id,
      title: body.title,
      description: body.description,
      scope: body.scope,
      responsibilities: body.responsibilities,
      minExperience: body.minExperience,
      status: body.status,
      applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null,
      requirements: { create: body.requirements },
      eligibleCommunities: {
        create: body.eligibleCommunityIds.map(id => ({ communityId: id })),
      },
      requiredDocTypes: { create: body.requiredDocTypes },
    },
    include: {
      requirements: { include: { skill: true } },
      eligibleCommunities: { include: { community: true } },
      requiredDocTypes: true,
      _count: { select: { applications: true } },
    },
  });

  await audit({
    actorId: session.id,
    action: 'JOB_POSTED',
    entity: 'Job',
    entityId: job.id,
    after: { title: job.title, status: job.status } as any,
  });

  // If job is immediately OPEN, run matching and notify
  if (job.status === JobStatus.OPEN) {
    await runJobMatchingAndNotify(job.id, job.title).catch(console.error);
  }

  return created({ job });
});
