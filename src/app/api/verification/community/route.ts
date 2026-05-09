// src/app/api/verification/community/route.ts
// GET: Youth President fetches pending requests for their community
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, unauthorized, forbidden, withErrorHandler } from '@/lib/utils/api';
import { UserRole } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.YOUTH_PRESIDENT) return forbidden();

  // Find the community this YP is assigned to
  const community = await prisma.community.findFirst({
    where: { youthPresidentId: session.id },
  });

  if (!community) return forbidden('You are not assigned to any community');

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;

  const requests = await prisma.verificationRequest.findMany({
    where: {
      status: status as any || undefined,
      applicant: { communityId: community.id },
      // Only unreviewed requests for this community queue.
      // If a Youth President is reassigned, these pending verification requests
      // must automatically appear in the new Youth President's queue.
      youthVerification: { is: null },

    },
    include: {
      applicant: {
        include: {
          user: { select: { email: true, phone: true } },
          community: true,
          skills: { include: { skill: true } },
          workExperiences: true,
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  return ok({ community, requests, total: requests.length });
});
