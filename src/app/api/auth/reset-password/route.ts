import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { ok, error, withErrorHandler } from '@/lib/utils/api';
import { checkRateLimit, createRateLimitKey, getClientIp, AUTH_RATE_LIMIT } from '@/lib/utils/rate-limit';
import bcrypt from 'bcryptjs';

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const clientIp = getClientIp(req.ip, Object.fromEntries(req.headers));
  const rateLimitKey = createRateLimitKey(clientIp, '/api/auth/reset-password');
  const { allowed } = checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT);
  if (!allowed) return error('Too many attempts. Try again later.', 429);

  const { token, password } = ResetPasswordSchema.parse(await req.json());

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken) return error('Invalid or expired reset token', 400);
  if (resetToken.usedAt) return error('This reset link has already been used', 400);
  if (new Date() > resetToken.expiresAt) return error('This reset link has expired. Request a new one.', 400);

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return ok(null, 'Password reset successful. You can now sign in with your new password.');
});
