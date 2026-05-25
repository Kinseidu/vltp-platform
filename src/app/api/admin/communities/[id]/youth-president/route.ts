import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole, VerificationStatus } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';
import { ok, unauthorized, error, withErrorHandler } from '@/lib/utils/api';

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return unauthorized();
  }

  const { youthPresidentId } = await req.json();
  const communityId = parseInt(params.id);

  if (youthPresidentId) {
    const ypUser = await prisma.user.findUnique({ where: { id: youthPresidentId } });
    if (!ypUser || ypUser.role !== UserRole.YOUTH_PRESIDENT) {
      return error('User is not a valid Youth President', 400);
    }

    const existing = await prisma.community.findFirst({ where: { youthPresidentId } });
    if (existing && existing.id !== communityId) {
      return error('Youth President is already assigned to another community', 400);
    }
  }

  const updatedCommunity = await prisma.community.update({
    where: { id: communityId },
    data: { youthPresidentId: youthPresidentId || null },
    select: { 
      id: true, 
      name: true, 
      youthPresidentId: true 
    }
  });

  const pendingApplicantsCount = await prisma.verificationRequest.count({
    where: {
      applicant: {
        communityId: updatedCommunity.id,
      },
      status: VerificationStatus.PENDING,
      youthVerification: null,
    },
  });

  await audit({
    actorId: session.id,
    action: 'COMMUNITY_UPDATED',
    entity: 'Community',
    entityId: communityId,
    after: { youthPresidentId },
  });

  return ok({ 
    community: updatedCommunity, 
    pendingApplicantsCount 
  });
});