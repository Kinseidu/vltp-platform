import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { ok, unauthorized, withErrorHandler, getPagination } from '@/lib/utils/api';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return unauthorized();
  }

  const { page, pageSize, skip } = getPagination(req);

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      include: {
        postedBy: { select: { email: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.job.count(),
  ]);

  return ok({ jobs, total, page, pageSize });
});
