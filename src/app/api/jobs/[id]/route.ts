// src/app/api/jobs/[id]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, forbidden, notFound, error, withErrorHandler } from '@/lib/utils/api';
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
  requirements: z.array(z.object({
    skillId: z.number().int().positive(),
    isMandatory: z.boolean(),
    minYears: z.number().int().min(0),
  })).optional(),
  eligibleCommunityIds: z.array(z.number().int().positive()).optional(),
  requiredDocTypes: z.array(z.object({
    docType: z.string(), // Use string to avoid Zod/Prisma enum mismatch if needed, or z.nativeEnum(DocumentType)
    label: z.string(),
    required: z.boolean(),
  })).optional(),
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

  // Use a transaction to update the job and its relations
  const job = await prisma.$transaction(async (tx) => {
    // 1. Update basic fields
    const updatedJob = await tx.job.update({
      where: { id: jobId },
      data: {
        title: body.title,
        description: body.description,
        scope: body.scope,
        responsibilities: body.responsibilities,
        minExperience: body.minExperience,
        status: body.status,
        applicationDeadline: body.applicationDeadline !== undefined 
          ? (body.applicationDeadline ? new Date(body.applicationDeadline) : null)
          : undefined,
      },
    });

    // 2. Update requirements if provided
    if (body.requirements) {
      await tx.jobRequirement.deleteMany({ where: { jobId } });
      await tx.jobRequirement.createMany({
        data: body.requirements.map(r => ({ ...r, jobId })),
      });
    }

    // 3. Update communities if provided
    if (body.eligibleCommunityIds) {
      await tx.jobEligibleCommunity.deleteMany({ where: { jobId } });
      await tx.jobEligibleCommunity.createMany({
        data: body.eligibleCommunityIds.map(id => ({ communityId: id, jobId })),
      });
    }

    // 4. Update doc types if provided
    if (body.requiredDocTypes) {
      await tx.jobRequiredDocument.deleteMany({ where: { jobId } });
      await tx.jobRequiredDocument.createMany({
        data: body.requiredDocTypes.map(d => ({ ...d, jobId, docType: d.docType as any })),
      });
    }

    return tx.job.findUnique({
      where: { id: jobId },
      include: {
        requirements: { include: { skill: true } },
        eligibleCommunities: { include: { community: true } },
        requiredDocTypes: true,
        _count: { select: { applications: true } },
      },
    });
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
    await runJobMatchingAndNotify(job!.id, job!.title).catch(console.error);
  }

  return ok({ job });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const jobId = parseInt(params.id);
  const job = await prisma.job.findUnique({ 
    where: { id: jobId },
    include: { _count: { select: { applications: true } } }
  });
  
  if (!job) return notFound('Job not found');
  if (job._count.applications > 0) {
    return error('Cannot delete a job that already has applications. Try closing it instead.', 400);
  }

  await prisma.job.delete({ where: { id: jobId } });

  await audit({
    actorId: session.id,
    action: 'JOB_DELETED',
    entity: 'Job',
    entityId: jobId,
    before: job as any,
  });

  return ok(null, 'Job deleted successfully');
});
