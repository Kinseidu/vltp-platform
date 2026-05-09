// src/lib/auth/jwt.ts
// JWT token creation and verification using jose (Edge-compatible)
// Role guards and access control utilities

import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, SessionUser } from '@/types';
import { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

// ─── ROLE GUARDS (for API routes and server actions) ─────────────────────────

/**
 * Require specific role(s). Throws error if not met.
 * Use in API routes: session = requireRole(await getSession(), 'HR_OFFICER', 'ADMIN')
 */
export function requireRole(session: SessionUser | null, ...roles: UserRole[]): SessionUser {
  if (!session) throw new Error('UNAUTHORIZED');
  if (!roles.includes(session.role)) throw new Error('FORBIDDEN');
  return session;
}

/**
 * Require authentication. Throws error if not logged in.
 */
export function requireAuth(session: SessionUser | null): SessionUser {
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

/**
 * Check if user is admin
 */
export function isAdmin(session: SessionUser | null): boolean {
  return session?.role === UserRole.ADMIN;
}

/**
 * Check if user is admin or HR officer
 */
export function isHR(session: SessionUser | null): boolean {
  return session?.role === UserRole.HR_OFFICER || session?.role === UserRole.ADMIN;
}

/**
 * Check if user is chief staff or admin
 */
export function isChiefStaff(session: SessionUser | null): boolean {
  return session?.role === UserRole.CHIEF_STAFF || session?.role === UserRole.ADMIN;
}

/**
 * Check if user is youth president or admin
 */
export function isYouthPresident(session: SessionUser | null): boolean {
  return session?.role === UserRole.YOUTH_PRESIDENT || session?.role === UserRole.ADMIN;
}

/**
 * Check if user is applicant
 */
export function isApplicant(session: SessionUser | null): boolean {
  return session?.role === UserRole.APPLICANT;
}

// ─── API RESPONSE HELPERS ──────────────────────────────────────────────────────

/**
 * Return 401 Unauthorized response
 */
export function unauthorized(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Return 403 Forbidden response
 */
export function forbidden(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Middleware-style guard for API routes with proper error handling
 * Usage: 
 *   const session = await getSession();
 *   if (!session) return unauthorized('Login required');
 *   if (session.role !== 'ADMIN') return forbidden('Admin access required');
 */
export async function guardApiRoute(
  request: NextRequest,
  requiredRoles?: UserRole[]
): Promise<{ session: SessionUser | null; error?: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return { session: null, error: unauthorized('Session required') };
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(session.role)) {
    return { session, error: forbidden('Insufficient permissions') };
  }

  return { session };
}

