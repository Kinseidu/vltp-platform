// src/app/api/admin/audit-logs/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, forbidden, withErrorHandler } from '@/lib/utils/api';
import { UserRole } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) return forbidden();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') || '50'));
  const action = url.searchParams.get('action') || undefined;
  const entity = url.searchParams.get('entity') || undefined;
  const actorId = url.searchParams.get('actorId') || undefined;

  const where = {
    ...(action && { action }),
    ...(entity && { entity }),
    ...(actorId && { actorId }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok({
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});
