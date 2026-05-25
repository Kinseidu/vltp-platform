import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { ok, unauthorized, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async () => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return unauthorized();
  }

  const logs = await prisma.chiefConfirmation.findMany({
    include: {
      confirmingStaff: { select: { email: true } },
      request: {
        include: {
          applicant: { select: { fullName: true, community: { select: { name: true } } } }
        }
      }
    },
    orderBy: { confirmedAt: 'desc' },
    take: 50,
  });

  return ok({ logs });
});
