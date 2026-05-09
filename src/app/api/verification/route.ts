// src/app/api/verification/route.ts
// POST: Applicant submits verification request
// GET:  Applicant checks own verification status
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, error, unauthorized, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole, VerificationStatus } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: session.id },
    select: {
      id: true,
      verificationStatus: true,
      verificationRequest: {
        include: {
          youthVerification: {
            include: { youthPresident: { select: { email: true } } },
          },
          chiefConfirmation: {
            include: { confirmingStaff: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (!profile) return error('Profile not found', 404);
  return ok({ verificationStatus: profile.verificationStatus, request: profile.verificationRequest });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: session.id },
    include: { skills: true, workExperiences: true },
  });

  if (!profile) return error('Profile not found', 404);

  // Must have at least 1 skill and 1 experience entry
  if (profile.skills.length === 0) {
    return error('Please add at least one skill before requesting verification', 422);
  }
  if (profile.workExperiences.length === 0) {
    return error('Please add at least one work experience before requesting verification', 422);
  }
  if (!profile.communityId) {
    return error('Please select your community before requesting verification', 422);
  }

  // Check no existing request
  const existing = await prisma.verificationRequest.findUnique({
    where: { applicantId: profile.id },
  });
  if (existing && existing.status !== VerificationStatus.REJECTED) {
    return error('A verification request already exists for your profile', 409);
  }

  // Delete old rejected request if re-applying
  if (existing?.status === VerificationStatus.REJECTED) {
    await prisma.verificationRequest.delete({ where: { id: existing.id } });
  }

  const request = await prisma.verificationRequest.create({
    data: {
      applicantId: profile.id,
      status: VerificationStatus.PENDING,
    },
  });

  // Update profile status
  await prisma.applicantProfile.update({
    where: { id: profile.id },
    data: { verificationStatus: VerificationStatus.PENDING },
  });

  await audit({
    actorId: session.id,
    action: 'VERIFICATION_REQUESTED',
    entity: 'VerificationRequest',
    entityId: request.id,
  });

  return created({ request }, 'Verification request submitted successfully');
});
