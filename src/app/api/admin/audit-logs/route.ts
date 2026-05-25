// src/app/api/admin/audit-logs/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { ok, forbidden, getPagination, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) return forbidden();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const entity = searchParams.get('entity');
  const { page, pageSize, skip } = getPagination(req);

  const where: any = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok({ logs, total, page, pageSize });
});
