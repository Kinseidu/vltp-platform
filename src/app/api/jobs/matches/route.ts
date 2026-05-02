// src/app/api/jobs/matches/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, unauthorized, error, withErrorHandler } from '@/lib/utils/api';
import { getMatchedJobsForApplicant } from '@/lib/services/matching.service';
import { UserRole } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: session.id },
    select: { id: true, verificationStatus: true },
  });

  if (!profile) return error('Profile not found', 404);

  const jobs = await getMatchedJobsForApplicant(profile.id);
  return ok({ jobs, total: jobs.length });
});
