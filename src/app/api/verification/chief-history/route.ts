// src/app/api/verification/chief-history/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { forbidden, ok, withErrorHandler } from '@/lib/utils/api';
import { UserRole } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.CHIEF_STAFF && session.role !== UserRole.ADMIN)) {
    return forbidden('Only Chief Staff or Admin can view verification history');
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const history = await prisma.chiefConfirmation.findMany({
    where: session.role === UserRole.ADMIN ? {} : { confirmingStaffId: session.id },
    include: {
      request: {
        include: {
          applicant: {
            include: {
              user: { select: { email: true } },
              community: true,
            },
          },
        },
      },
    },
    orderBy: { confirmedAt: 'desc' },
    take: limit,
  });

  return ok({ history });
});
