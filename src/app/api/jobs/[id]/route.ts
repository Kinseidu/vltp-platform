// src/app/api/jobs/[id]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { runJobMatchingAndNotify } from '@/lib/services/matching.service';
import { JobStatus, UserRole } from '@prisma/client';

const UpdateJobSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(10).optional(),
  scope: z.string().min(10).optional(),
  responsibilities: z.string().optional(),
  minExperience: z.number().int().min(0).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  applicationDeadline: z.string().nullable().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const job = await prisma.job.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      postedBy: { select: { id: true, email: true } },
      requirements: { include: { skill: true } },
      eligibleCommunities: { include: { community: true } },
      requiredDocTypes: true,
      _count: { select: { applications: true } },
    },
  });

  if (!job) return notFound('Job not found');
  return ok({ job });
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const jobId = parseInt(params.id);
  const before = await prisma.job.findUnique({ where: { id: jobId } });
  if (!before) return notFound('Job not found');

  const body = UpdateJobSchema.parse(await req.json());

  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      ...body,
      ...(body.applicationDeadline !== undefined && {
        applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null,
      }),
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
    action: 'JOB_UPDATED',
    entity: 'Job',
    entityId: jobId,
    before: before as any,
    after: body as any,
  });

  // Re-run matching if job just opened
  if (body.status === JobStatus.OPEN && before.status !== JobStatus.OPEN) {
    await runJobMatchingAndNotify(job.id, job.title).catch(console.error);
  }

  return ok({ job });
});
