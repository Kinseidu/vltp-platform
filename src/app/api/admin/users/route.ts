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

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const { page, pageSize, skip } = getPagination(req);

  const where: any = {};
  if (role) where.role = role as UserRole;
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { applicantProfile: { fullName: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        applicantProfile: {
          select: {
            fullName: true,
            verificationStatus: true,
            community: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ users, total, page, pageSize });
});
