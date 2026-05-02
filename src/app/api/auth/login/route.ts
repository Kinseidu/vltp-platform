// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { createToken, setSessionCookie } from '@/lib/auth/jwt';
import { ok, error, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = LoginSchema.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      applicantProfile: {
        select: { id: true, fullName: true, communityId: true, verificationStatus: true },
      },
    },
  });

  if (!user || !user.isActive) {
    return error('Invalid email or password', 401);
  }

  const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
  if (!passwordValid) return error('Invalid email or password', 401);

  const token = await createToken({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);

  await audit({
    actorId: user.id,
    action: 'USER_LOGIN',
    entity: 'User',
    entityId: user.id,
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.applicantProfile,
    },
  }, 'Login successful');
});
