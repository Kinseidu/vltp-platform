// src/middleware.ts
// Session verification and role-based routing middleware
// Runs on every request to protected paths

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import type { JWTPayload } from '@/types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-use-32-char-minimum'
);

// ─── ROLE-BASED PATH PATTERNS ─────────────────────────────────────────────────
// Maps roles to the paths they're allowed to access

const ROLE_PATHS: Record<string, string[]> = {
  APPLICANT: ['/applicant'],
  YOUTH_PRESIDENT: ['/youth-president'],
  CHIEF_STAFF: ['/chief-staff'],
  HR_OFFICER: ['/hr', '/admin'], // HR can access admin routes too
  ADMIN: ['/admin'],
};

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/communities', // Needed for register page to fetch communities
];

// Paths that require authentication but no specific role (all authenticated users)
const PROTECTED_PATHS = [
  '/api/profile',
  '/api/notifications',
  '/api/skills',
  '/api/jobs',
  '/api/applications',
  '/api/verification',
  '/api/me',
];

// High-value paths requiring rate limiting (checked separately)
const RATE_LIMITED_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/ai/shortlist',
  '/api/ai/interview-questions',
];

// ─── UTILITY: Get session from token ──────────────────────────────────────────

async function getSessionFromToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── UTILITY: Check if path matches pattern ──────────────────────────────────

function matchesPath(path: string, pattern: string): boolean {
  // Exact match or prefix match for directory paths
  return path === pattern || path.startsWith(pattern + '/') || path.startsWith(pattern + '?');
}

// ─── UTILITY: Check if path requires auth ───────────────────────────────────

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => matchesPath(path, p));
}

function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some(p => matchesPath(path, p)) ||
         Object.values(ROLE_PATHS).flat().some(p => matchesPath(path, p));
}

// ─── UTILITY: Check role authorization ──────────────────────────────────────

function isRoleAuthorized(role: string, path: string): boolean {
  const allowedPaths = ROLE_PATHS[role] || [];
  return allowedPaths.some(p => matchesPath(path, p));
}

// ─── MAIN MIDDLEWARE ────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('vltp_session')?.value;

  // Allow public paths (auth, home)
  if (isPublicPath(pathname)) {
    // If logged in, redirect away from auth pages
    if (token && pathname.startsWith('/auth/')) {
      const session = await getSessionFromToken(token);
      if (session) {
        const redirectPath = ROLE_PATHS[session.role]?.[0] || '/applicant';
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected paths require valid session
  if (isProtectedPath(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      // Token invalid or expired
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('vltp_session');
      return response;
    }

    // Role-based access control (for role-specific paths)
    const requiresSpecificRole = Object.values(ROLE_PATHS)
      .flat()
      .some(p => matchesPath(pathname, p));

    if (requiresSpecificRole && !isRoleAuthorized(session.role, pathname)) {
      // User doesn't have access to this path
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN: Insufficient permissions for this path' },
        { status: 403 }
      );
    }

    // Attach session to request headers for server components / API routes to read
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-user-id', session.sub || '');
    requestHeaders.set('x-session-user-role', session.role || '');
    requestHeaders.set('x-session-user-email', session.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Other paths allowed (e.g., static assets, public API routes)
  return NextResponse.next();
}

// ─── MIDDLEWARE CONFIG ──────────────────────────────────────────────────────

export const config = {
  // Apply middleware to all routes except static assets and images
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
};
