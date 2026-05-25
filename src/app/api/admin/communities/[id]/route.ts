// src/app/api/admin/communities/[id]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, notFound, forbidden, error, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const UpdateCommunitySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  region: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session) return forbidden();

  const community = await prisma.community.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      youthPresident: { select: { id: true, email: true, applicantProfile: { select: { fullName: true } } } },
      _count: { select: { applicantProfiles: true } },
    },
  });

  if (!community) return notFound('Community not found');

  return ok({ community });
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) return forbidden();

  const body = UpdateCommunitySchema.parse(await req.json());
  const communityId = parseInt(params.id);

  const existingCommunity = await prisma.community.findUnique({ where: { id: communityId } });
  if (!existingCommunity) return notFound('Community not found');

  const updatedCommunity = await prisma.community.update({
    where: { id: communityId },
    data: body,
    include: {
      youthPresident: { select: { id: true, email: true, applicantProfile: { select: { fullName: true } } } },
    },
  });

  await audit({
    actorId: session.id,
    action: 'COMMUNITY_UPDATED',
    entity: 'Community',
    entityId: communityId,
    before: existingCommunity,
    after: updatedCommunity,
  });

  return ok({ community: updatedCommunity });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) return forbidden();

  const communityId = parseInt(params.id);

  const existingCommunity = await prisma.community.findUnique({
    where: { id: communityId },
    include: { _count: { select: { applicantProfiles: true } } },
  });

  if (!existingCommunity) return notFound('Community not found');

  // Prevent deletion if community has applicants
  if (existingCommunity._count.applicantProfiles > 0) {
    return error('Cannot delete community with active applicants. Move applicants to another community first.', 400);
  }

  await prisma.community.update({
    where: { id: communityId },
    data: { isActive: false },
  });

  await audit({
    actorId: session.id,
    action: 'COMMUNITY_DELETED',
    entity: 'Community',
    entityId: communityId,
    before: existingCommunity,
  });

  return ok({ message: 'Community deactivated successfully' });
});