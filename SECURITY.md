# Security & JWT Guidelines

This document outlines best practices for managing authentication secrets and JWT configuration in the VLTP platform.

## JWT Configuration

### Secret Management

**Current Configuration (Development)**:
- `JWT_SECRET`: Must be at least 32 characters for production
- Algorithm: HS256 (HMAC-SHA256)
- Token Expiry: 7 days
- Storage: HttpOnly secure cookie (httpOnly=true, secure=true in production)

### Generating a Secure JWT Secret

For production, generate a cryptographically secure secret:

```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([byte[]](1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Result example: `vEDEieyDUyNf66E9tOFzGiCoin9leda94pTWQiuSfXWGWS31sG5Tl4I0PbhzKJmD`

### Production Deployment

1. **Generate new secret** using the command above
2. **Set as environment variable** in your deployment platform (e.g., Vercel, Heroku, AWS):
   - Variable name: `JWT_SECRET`
   - Value: The 32+ character secret
3. **Never commit secrets** to version control
4. **Rotate secrets** annually or after security incidents:
   - Old tokens become invalid after rotation
   - Users must re-login
   - Keep old secret available for grace period if needed

### Environment Variables

Required for production:

```bash
# Authentication
JWT_SECRET="<32+ character cryptographic secret>"

# AI (Google Gemini)
GEMINI_API_KEY="<your-google-api-key>"
GEMINI_MODEL="gemini-2.5-flash"

# Database
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"

# File Storage (MVP uses local, replace with S3/Supabase for production)
UPLOAD_DIR="./uploads"

# Application
NEXT_PUBLIC_APP_URL="<your-domain>"
NODE_ENV="production"
```

**Never use:**
- Generic or weak secrets (e.g., "secret", "password")
- Secrets in `.env` files committed to git
- The example secret from `.env.example`

## Session Management

### Cookie Configuration

Cookies are automatically secured:

```typescript
// src/lib/auth/jwt.ts
cookieStore.set(COOKIE_NAME, token, {
  httpOnly: true,                // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'lax',               // CSRF protection
  maxAge: 60 * 60 * 24 * 7,      // 7 days
  path: '/',
});
```

### Session Verification

The middleware (`src/middleware.ts`) verifies sessions on every request:

1. Checks for `vltp_session` cookie
2. Verifies JWT signature using `JWT_SECRET`
3. Validates expiration
4. Redirects to login if invalid or expired
5. Enforces role-based path access

### Token Refresh Strategy

Current implementation uses a simple 7-day token with automatic refresh on login. For enhanced security:

**Optional Future Enhancement:**
- **Access Token** (15 min): Short-lived token for API requests
- **Refresh Token** (7 days): Longer-lived token in httpOnly cookie for renewal
- Implement `POST /api/auth/refresh` endpoint to get new access token

## Rate Limiting

### Current Implementation

Auth and AI routes have built-in rate limiting:

- **Login/Register**: 3 attempts per minute per IP
- **AI Operations**: 5 requests per minute per user
- **General API**: 20 requests per minute per IP

See [src/lib/utils/rate-limit.ts](src/lib/utils/rate-limit.ts) for configuration.

### Production Upgrade

For production, migrate from in-memory to distributed rate limiting:

```bash
# Option 1: Upstash Redis (recommended for Vercel)
npm install @upstash/ratelimit @upstash/redis

# Option 2: Self-hosted Redis
npm install redis ioredis

# Option 3: Edge Functions
# Use Cloudflare Workers or similar for edge-level rate limiting
```

Example with Upstash:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 m'),
});

const { success } = await ratelimit.limit(clientIp);
```

## Role-Based Access Control (RBAC)

### Roles

- `ADMIN`: Full platform access
- `HR_OFFICER`: Job management, shortlisting, interviews
- `YOUTH_PRESIDENT`: Verification oversight for their community
- `CHIEF_STAFF`: Chief confirmation queue
- `APPLICANT`: Profile, applications, notifications

### Middleware Protection

Protected paths are enforced at middleware level:

```typescript
// src/middleware.ts
const ROLE_PATHS: Record<string, string[]> = {
  APPLICANT: ['/applicant'],
  YOUTH_PRESIDENT: ['/youth-president'],
  CHIEF_STAFF: ['/chief-staff'],
  HR_OFFICER: ['/hr', '/admin'],
  ADMIN: ['/admin'],
};
```

### Guard Functions

Use in API routes and server components:

```typescript
import { getSession, requireRole, isAdmin } from '@/lib/auth/jwt';

// Example: Admin-only API route
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  
  // Option 1: Require specific role(s)
  requireRole(session, 'ADMIN');
  
  // Option 2: Check role
  if (!isAdmin(session)) {
    return forbidden('Admin access required');
  }
  
  // Your handler here
});
```

## Security Checklist

- [ ] `JWT_SECRET` is 32+ characters
- [ ] Secrets are NOT committed to git
- [ ] `.env.example` contains only placeholder values
- [ ] `NODE_ENV` is set to `production` in deployment
- [ ] HTTPS is enabled (enforces `secure` cookie flag)
- [ ] Rate limiting is active
- [ ] Middleware is protecting all role-based paths
- [ ] Password hashing uses bcrypt (12+ rounds)
- [ ] No sensitive data in logs or error messages
- [ ] CORS is properly configured for your domain

## Troubleshooting

### "Session required" after login

**Cause**: JWT_SECRET mismatch between environments
**Fix**: Ensure `JWT_SECRET` is identical on all deployment targets

### Rate limit triggered too quickly

**Cause**: In-memory rate limiter resets with server restart
**Fix**: Deploy distributed rate limiter (Redis/Upstash) for production

### Cookie not persisting

**Cause**: Browser or middleware issue
**Fix**:
- Verify `secure` flag matches your protocol (HTTP/HTTPS)
- Check `sameSite` policy against your domain
- Ensure cookies are not blocked by browser settings

## Additional Resources

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 7519 - JWT Specification](https://tools.ietf.org/html/rfc7519)
- [Next.js Security Best Practices](https://nextjs.org/docs/going-to-production/security)
- [jose Library Documentation](https://github.com/panva/jose)
