// src/app/api/auth/register/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { createToken, setSessionCookie } from '@/lib/auth/jwt';
import { ok, created, error, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const RegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  communityId: z.number().int().positive(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = RegisterSchema.parse(await req.json());

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return error('An account with this email already exists', 409);

  // Verify community exists
  const community = await prisma.community.findUnique({ where: { id: body.communityId } });
  if (!community) return error('Community not found', 404);

  const passwordHash = await bcrypt.hash(body.password, 12);

  // Create user + profile in a transaction
  const { user, profile } = await prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: UserRole.APPLICANT,
      },
    });

    const profile = await tx.applicantProfile.create({
      data: {
        userId: user.id,
        fullName: body.fullName,
        communityId: body.communityId,
      },
    });

    return { user, profile };
  });

  // Issue JWT
  const token = await createToken({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);

  await audit({
    actorId: user.id,
    action: 'USER_REGISTERED',
    entity: 'User',
    entityId: user.id,
    after: { email: user.email, communityId: body.communityId },
  });

  return created({
    user: { id: user.id, email: user.email, role: user.role },
    profile: { id: profile.id, fullName: profile.fullName, communityId: profile.communityId },
  }, 'Account created successfully');
});
