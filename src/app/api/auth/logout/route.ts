// src/app/api/auth/logout/route.ts
import { NextRequest } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/jwt';
import { ok, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (session) {
    await audit({ actorId: session.id, action: 'USER_LOGOUT', entity: 'User', entityId: session.id });
  }
  await clearSessionCookie();
  return ok(null, 'Logged out successfully');
});
