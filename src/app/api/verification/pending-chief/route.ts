import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { forbidden, ok, withErrorHandler } from '@/lib/utils/api';
import { UserRole, VerificationStatus } from '@prisma/client';

export const GET = withErrorHandler(async (_req: NextRequest) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.CHIEF_STAFF && session.role !== UserRole.ADMIN)) {
    return forbidden('Only Chief Staff or Admin can view pending chief confirmations');
  }

  const requests = await prisma.verificationRequest.findMany({
    where: {
      status: VerificationStatus.YOUTH_APPROVED,
      chiefConfirmation: null,
      youthVerification: { isNot: null },
    },
    include: {
      applicant: {
        include: {
          user: { select: { id: true, email: true, phone: true } },
          community: true,
          skills: { include: { skill: true } },
          workExperiences: { orderBy: { startDate: 'desc' }, take: 3 },
        },
      },
      youthVerification: {
        include: { youthPresident: { select: { email: true } } },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  return ok({ requests, total: requests.length });
});
