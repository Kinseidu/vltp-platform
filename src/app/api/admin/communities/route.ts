// src/app/api/admin/communities/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, forbidden, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const CreateCommunitySchema = z.object({
  name: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  youthPresidentId: z.string().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return forbidden();

  const communities = await prisma.community.findMany({
    where: { isActive: true },
    include: {
      youthPresident: { select: { id: true, email: true } },
      _count: { select: { applicantProfiles: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok({ communities });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) return forbidden();

  const body = CreateCommunitySchema.parse(await req.json());

  const community = await prisma.community.create({
    data: body,
    include: { youthPresident: { select: { id: true, email: true } } },
  });

  await audit({
    actorId: session.id,
    action: 'COMMUNITY_CREATED',
    entity: 'Community',
    entityId: community.id,
    after: body as any,
  });

  return created({ community });
});
