// src/app/api/verification/[id]/chief-confirm/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, error, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { notifyVerificationUpdate } from '@/lib/services/notification.service';
import { UserRole, VerificationStatus } from '@prisma/client';

const ChiefConfirmSchema = z.object({
  chiefName: z.string().min(2).max(100),
  status: z.enum(['CONFIRM', 'REJECT']),
  notes: z.string().max(500).optional(),
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.CHIEF_STAFF && session.role !== UserRole.ADMIN)) {
    return forbidden('Only Chief Staff or Admins can log chief confirmations');
  }

  const requestId = parseInt(params.id);
  const body = ChiefConfirmSchema.parse(await req.json());

  const verReq = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      applicant: { include: { user: { select: { id: true } } } },
      youthVerification: true,
      chiefConfirmation: true,
    },
  });

  if (!verReq) return notFound('Verification request not found');
  if (verReq.chiefConfirmation) return error('Chief confirmation already recorded for this request', 409);

  // Must have Youth President approval first
  if (!verReq.youthVerification || verReq.youthVerification.decision !== VerificationStatus.YOUTH_APPROVED) {
    return error('Youth President approval is required before Chief confirmation', 422);
  }

  const newStatus = body.status === 'CONFIRM'
    ? VerificationStatus.VERIFIED
    : VerificationStatus.REJECTED;

  await prisma.chiefConfirmation.create({
    data: {
      requestId,
      confirmingStaffId: session.id,
      status: body.status === 'CONFIRM' ? VerificationStatus.CHIEF_CONFIRMED : VerificationStatus.REJECTED,
      chiefName: body.chiefName,
      notes: body.notes,
    },
  });

  await prisma.verificationRequest.update({
    where: { id: requestId },
    data: { status: newStatus, resolvedAt: new Date() },
  });

  await prisma.applicantProfile.update({
    where: { id: verReq.applicantId },
    data: { verificationStatus: newStatus },
  });

  await audit({
    actorId: session.id,
    action: body.status === 'CONFIRM' ? 'VERIFICATION_CHIEF_CONFIRMED' : 'VERIFICATION_CHIEF_REJECTED',
    entity: 'VerificationRequest',
    entityId: requestId,
    after: { chiefName: body.chiefName, status: newStatus, notes: body.notes } as any,
  });

  await notifyVerificationUpdate(verReq.applicant.user.id, newStatus);

  return ok({ status: newStatus }, `Chief confirmation recorded successfully`);
});
