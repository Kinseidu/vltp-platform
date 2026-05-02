// src/app/api/applications/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, error, unauthorized, forbidden, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole, ApplicationStatus, VerificationStatus, JobStatus } from '@prisma/client';

const SubmitApplicationSchema = z.object({
  jobId: z.number().int().positive(),
  coverNote: z.string().max(1000).optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  // Applicant: see own applications
  if (session.role === UserRole.APPLICANT) {
    const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
    if (!profile) return error('Profile not found', 404);

    const applications = await prisma.application.findMany({
      where: { applicantId: profile.id },
      include: {
        job: {
          select: { id: true, title: true, status: true, applicationDeadline: true },
        },
        documents: true,
        shortlistResult: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok({ applications, total: applications.length });
  }

  // HR/Admin: list all applications with optional jobId filter
  if (session.role === UserRole.HR_OFFICER || session.role === UserRole.ADMIN) {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId') ? parseInt(url.searchParams.get('jobId')!) : undefined;
    const status = url.searchParams.get('status') as ApplicationStatus | null;

    const applications = await prisma.application.findMany({
      where: {
        ...(jobId && { jobId }),
        ...(status && { status }),
      },
      include: {
        job: { select: { id: true, title: true } },
        applicant: {
          include: {
            community: true,
            skills: { include: { skill: true } },
          },
        },
        documents: true,
        shortlistResult: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return ok({ applications, total: applications.length });
  }

  return forbidden();
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const body = SubmitApplicationSchema.parse(await req.json());

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: session.id },
    include: { community: true },
  });
  if (!profile) return error('Profile not found', 404);

  // Must be verified
  if (profile.verificationStatus !== VerificationStatus.VERIFIED) {
    return error('You must be a Verified Local before applying for jobs', 403);
  }

  // Job must be open
  const job = await prisma.job.findUnique({
    where: { id: body.jobId },
    include: { eligibleCommunities: true },
  });
  if (!job || job.status !== JobStatus.OPEN) return error('This job is not currently open for applications', 404);

  // Community eligibility check
  const communityEligible = job.eligibleCommunities.some(ec => ec.communityId === profile.communityId);
  if (!communityEligible) {
    return error('Your community is not eligible for this job posting', 403);
  }

  // Check for duplicate application
  const existing = await prisma.application.findUnique({
    where: { jobId_applicantId: { jobId: body.jobId, applicantId: profile.id } },
  });
  if (existing) return error('You have already applied for this job', 409);

  const application = await prisma.application.create({
    data: {
      jobId: body.jobId,
      applicantId: profile.id,
      status: ApplicationStatus.SUBMITTED,
      coverNote: body.coverNote,
      submittedAt: new Date(),
    },
    include: {
      job: { select: { id: true, title: true } },
      documents: true,
    },
  });

  await audit({
    actorId: session.id,
    action: 'APPLICATION_SUBMITTED',
    entity: 'Application',
    entityId: application.id,
    after: { jobId: body.jobId, jobTitle: application.job.title } as any,
  });

  return created({ application }, 'Application submitted. Please upload your documents.');
});
