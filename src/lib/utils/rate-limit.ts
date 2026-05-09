// src/lib/utils/rate-limit.ts
// In-memory rate limiting for MVP (upgradeable to Redis for production)
// For production, consider: Upstash, Redis, or cloud provider edge functions

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional custom key generator */
  keyGenerator?: (ip: string, path: string) => string;
}

/**
 * Check rate limit for a given key
 * Returns: { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store[key];

  // First request or window expired
  if (!entry || now > entry.resetAt) {
    store[key] = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: store[key].resetAt,
    };
  }

  // Within window
  entry.count++;
  const allowed = entry.count <= config.max;
  return {
    allowed,
    remaining: Math.max(0, config.max - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Create a rate limit key from IP and endpoint
 */
export function createRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`;
}

/**
 * Extract client IP from Next.js request
 * Supports: direct connection, X-Forwarded-For (behind proxy), Cloudflare
 */
export function getClientIp(
  ip?: string | null,
  headers?: Record<string, string | string[] | undefined>
): string {
  if (!headers) return ip || 'unknown';

  // Cloudflare
  if (headers['cf-connecting-ip']) {
    const cfIp = headers['cf-connecting-ip'];
    return typeof cfIp === 'string' ? cfIp : cfIp[0];
  }

  // X-Forwarded-For (first IP in list)
  if (headers['x-forwarded-for']) {
    const xff = headers['x-forwarded-for'];
    const firstIp = typeof xff === 'string' ? xff.split(',')[0] : xff[0];
    return firstIp.trim();
  }

  return ip || 'unknown';
}

// ─── PREDEFINED RATE LIMIT CONFIGS ──────────────────────────────────────────

/**
 * Strict limit for login/register (3 attempts per minute)
 */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  max: 3,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Moderate limit for AI operations (5 per minute per user/IP)
 */
export const AI_RATE_LIMIT: RateLimitConfig = {
  max: 5,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * General API rate limit (20 per minute)
 */
export const GENERAL_RATE_LIMIT: RateLimitConfig = {
  max: 20,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Cleanup old entries from store (call periodically)
 * Prevents memory leak in long-running processes
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
