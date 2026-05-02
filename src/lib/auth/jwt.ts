// src/lib/auth/jwt.ts
// JWT token creation and verification using jose (Edge-compatible)

import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, SessionUser } from '@/types';
import { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-use-32-char-minimum'
);

const COOKIE_NAME = 'vltp_session';
const TOKEN_EXPIRY = '7d';

// ─── CREATE TOKEN ─────────────────────────────────────────────────────────────

export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET);
}

// ─── VERIFY TOKEN ─────────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── GET SESSION FROM COOKIE (Server Components / Route Handlers) ─────────────

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

// ─── SET SESSION COOKIE ───────────────────────────────────────────────────────

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// ─── CLEAR SESSION COOKIE ─────────────────────────────────────────────────────

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── ROLE GUARDS ──────────────────────────────────────────────────────────────

export function requireRole(session: SessionUser | null, ...roles: UserRole[]): SessionUser {
  if (!session) throw new Error('UNAUTHORIZED');
  if (!roles.includes(session.role)) throw new Error('FORBIDDEN');
  return session;
}

export function isHR(session: SessionUser | null): boolean {
  return session?.role === UserRole.HR_OFFICER || session?.role === UserRole.ADMIN;
}

export function isAdmin(session: SessionUser | null): boolean {
  return session?.role === UserRole.ADMIN;
}

export function isYouthPresident(session: SessionUser | null): boolean {
  return session?.role === UserRole.YOUTH_PRESIDENT;
}

export function isChiefStaff(session: SessionUser | null): boolean {
  return session?.role === UserRole.CHIEF_STAFF || session?.role === UserRole.ADMIN;
}
