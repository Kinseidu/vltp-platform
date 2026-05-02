// src/lib/utils/api.ts
// Shared API response helpers and error handlers

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { SessionUser, UserRole } from '@/types';
import { ZodError } from 'zod';

// ─── RESPONSE HELPERS ─────────────────────────────────────────────────────────

export function ok<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({ success: true, data, ...(message && { message }) });
}

export function created<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({ success: true, data, ...(message && { message }) }, { status: 201 });
}

export function error(message: string, status = 400, details?: Record<string, string[]>): NextResponse {
  return NextResponse.json({ success: false, error: message, ...(details && { details }) }, { status });
}

export function unauthorized(message = 'Authentication required'): NextResponse {
  return error(message, 401);
}

export function forbidden(message = 'You do not have permission to perform this action'): NextResponse {
  return error(message, 403);
}

export function notFound(message = 'Resource not found'): NextResponse {
  return error(message, 404);
}

export function serverError(message = 'An unexpected error occurred'): NextResponse {
  return error(message, 500);
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

/**
 * Get authenticated session or return 401 response.
 */
export async function requireAuth(
  req: NextRequest,
  ...allowedRoles: UserRole[]
): Promise<{ session: SessionUser; errorResponse: null } | { session: null; errorResponse: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return { session: null, errorResponse: unauthorized() };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role as UserRole)) {
    return { session: null, errorResponse: forbidden() };
  }

  return { session, errorResponse: null };
}

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────

/**
 * Wrap route handlers to catch and format errors consistently.
 */
export function withErrorHandler(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.flatten().fieldErrors as Record<string, string[]>;
        return error('Validation failed', 422, details);
      }
      if (err instanceof Error) {
        if (err.message === 'UNAUTHORIZED') return unauthorized();
        if (err.message === 'FORBIDDEN') return forbidden();
        if (err.message === 'NOT_FOUND') return notFound();
        console.error('[API Error]', err.message, err.stack);
      }
      return serverError();
    }
  };
}

// ─── PAGINATION HELPER ────────────────────────────────────────────────────────

export function getPagination(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}
