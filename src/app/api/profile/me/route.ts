// src/app/api/profile/me/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, unauthorized, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  highestEducation: z.string().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: session.id },
    include: {
      user: { select: { id: true, email: true, phone: true } },
      community: true,
      skills: { include: { skill: true }, orderBy: { yearsOfExp: 'desc' } },
      workExperiences: { orderBy: { startDate: 'desc' } },
      verificationRequest: {
        include: {
          youthVerification: { include: { youthPresident: { select: { email: true } } } },
          chiefConfirmation: { include: { confirmingStaff: { select: { email: true } } } },
        },
      },
    },
  });

  if (!profile) return notFound('Applicant profile not found');
  return ok({ profile });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const body = UpdateProfileSchema.parse(await req.json());

  const before = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });

  const profile = await prisma.applicantProfile.update({
    where: { userId: session.id },
    data: {
      ...(body.fullName && { fullName: body.fullName }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.dateOfBirth && { dateOfBirth: new Date(body.dateOfBirth) }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.highestEducation !== undefined && { highestEducation: body.highestEducation }),
    },
    include: { community: true },
  });

  // Also update phone on user if provided
  if (body.phone) {
    await prisma.user.update({
      where: { id: session.id },
      data: { phone: body.phone },
    });
  }

  await audit({
    actorId: session.id,
    action: 'PROFILE_UPDATED',
    entity: 'ApplicantProfile',
    entityId: profile.id,
    before: before as any,
    after: body as any,
  });

  return ok({ profile });
});
