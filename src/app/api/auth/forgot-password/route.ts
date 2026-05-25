import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { ok, error, withErrorHandler } from '@/lib/utils/api';
import { checkRateLimit, createRateLimitKey, getClientIp, AUTH_RATE_LIMIT } from '@/lib/utils/rate-limit';
import { sendPasswordResetEmail } from '@/lib/services/email.service';
import crypto from 'crypto';

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const clientIp = getClientIp(req.ip, Object.fromEntries(req.headers));
  const rateLimitKey = createRateLimitKey(clientIp, '/api/auth/forgot-password');
  const { allowed } = checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT);
  if (!allowed) return error('Too many attempts. Try again later.', 429);

  const { email } = ForgotPasswordSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return ok(null, 'If an account exists with that email, a password reset link has been sent.');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  await sendPasswordResetEmail(email, token);

  return ok(null, 'If an account exists with that email, a password reset link has been sent.');
});
