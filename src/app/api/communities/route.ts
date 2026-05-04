// src/app/api/communities/route.ts
import { prisma } from '@/lib/db/prisma';
import { ok, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async () => {
  const communities = await prisma.community.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      region: true,
    },
    orderBy: { name: 'asc' },
  });

  return ok({ communities });
});
