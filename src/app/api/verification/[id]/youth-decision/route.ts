// src/app/api/verification/[id]/youth-decision/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, error, unauthorized, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { notifyVerificationUpdate } from '@/lib/services/notification.service';
import { UserRole, VerificationStatus } from '@prisma/client';

const DecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(500).optional(),
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.YOUTH_PRESIDENT) return forbidden();

  const requestId = parseInt(params.id);
  const body = DecisionSchema.parse(await req.json());

  // Verify the request exists and belongs to this YP's community
  const verReq = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      applicant: {
        include: {
          community: true,
          user: { select: { id: true } },
        },
      },
      youthVerification: true,
    },
  });

  if (!verReq) return notFound('Verification request not found');
  if (verReq.youthVerification) return error('This request has already been reviewed', 409);

  // Enforce community scope — YP can only review their own community
  const yPCommunity = await prisma.community.findFirst({
    where: { youthPresidentId: session.id },
  });
  if (!yPCommunity || yPCommunity.id !== verReq.applicant.communityId) {
    return forbidden('You can only review applicants from your assigned community');
  }

  const newStatus = body.decision === 'APPROVE'
    ? VerificationStatus.VERIFIED
    : VerificationStatus.REJECTED;

  // Create youth verification record
  await prisma.youthVerification.create({
    data: {
      requestId,
      youthPresidentId: session.id,
      decision: body.decision === 'APPROVE' ? VerificationStatus.YOUTH_APPROVED : VerificationStatus.REJECTED,
      notes: body.notes,
    },
  });

  // Update request and profile status
  await prisma.verificationRequest.update({
    where: { id: requestId },
    data: { 
      status: newStatus, 
      resolvedAt: new Date() // Always set resolvedAt when YP makes the final call
    },
  });

  await prisma.applicantProfile.update({
    where: { id: verReq.applicantId },
    data: { verificationStatus: newStatus },
  });

  await audit({
    actorId: session.id,
    action: body.decision === 'APPROVE' ? 'VERIFICATION_YOUTH_APPROVED' : 'VERIFICATION_YOUTH_REJECTED',
    entity: 'VerificationRequest',
    entityId: requestId,
    after: { decision: newStatus, notes: body.notes } as any,
  });

  await notifyVerificationUpdate(verReq.applicant.user.id, newStatus);

  return ok({ status: newStatus }, `Applicant ${body.decision === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
});
