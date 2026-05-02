// src/app/api/auth/me/route.ts
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { ok, unauthorized, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      applicantProfile: {
        select: {
          id: true,
          fullName: true,
          communityId: true,
          verificationStatus: true,
          bio: true,
          community: { select: { id: true, name: true, region: true } },
        },
      },
    },
  });

  if (!user) return unauthorized();
  return ok({ user });
});
