# Replit Authentication Troubleshooting Guide

## Overview

This guide covers common issues with Replit OAuth authentication and how to resolve them.

## Quick Diagnostics

### Check Auth Health

```bash
curl https://your-app.replit.app/api/auth/health?metrics=true
```

This will show the status of all auth subsystems.

### Check Logs

Look for these log prefixes:
- `[Auth]` - Authentication flow
- `[Session]` - Session management
- `[AuthRateLimit]` - Rate limiting
- `[OIDC]` - OAuth/OIDC operations

## Common Issues

### 1. "SESSION_SECRET not set"

**Problem**: The SESSION_SECRET environment variable is missing.

**Solution**:
1. Go to Replit Secrets panel
2. Add `SESSION_SECRET` with a random 32+ character string
3. Generate one with: `openssl rand -base64 32`
4. Restart the application

**Why**: Sessions require a secret key for encryption. Without it, authentication cannot work.

---

### 2. "REPL_ID not set"

**Problem**: The REPL_ID environment variable is missing.

**Solution**:
1. Ensure you're running on Replit (not locally)
2. REPL_ID is automatically set by Replit
3. If missing, try restarting the Repl

**Why**: REPL_ID identifies your application to Replit's OAuth provider.

---

### 3. "Too many authentication requests"

**Problem**: Rate limit exceeded (10-20 requests per 15 minutes).

**Solution**:
1. Wait 15 minutes
2. Check for authentication loops in client code
3. Ensure you're not calling `/api/login` repeatedly
4. Check browser console for infinite redirects

**Why**: Protects against abuse and prevents hitting Replit's OAuth rate limits.

---

### 4. "Redirect URI mismatch"

**Problem**: The OAuth callback URL doesn't match the registered redirect URI.

**Solution**:
1. Set `REDIRECT_URI_BASE` in Replit Secrets to your deployed URL
   - Example: `https://your-app.replit.app`
2. Ensure no trailing slash
3. Use HTTPS for deployed apps
4. Check that your domain matches exactly

**Why**: OAuth requires strict matching of redirect URIs for security.

---

### 5. "Token expired / Session expired"

**Problem**: Access token has expired and refresh failed.

**Solution**:
1. User needs to log in again
2. Ensure `offline_access` scope is included (it is by default)
3. Check that refresh tokens are being stored
4. Verify token refresh logic is working

**Why**: Access tokens have limited lifespans (typically 1 hour). Refresh tokens allow renewal without re-authentication.

---

### 6. "Database not configured"

**Problem**: PostgreSQL database is required but not set up.

**Solution**:
1. Provision a PostgreSQL database in Replit
2. Set `DATABASE_URL` in Replit Secrets
3. Run database migrations: `npm run db:push`
4. Restart the application

**Why**: Auth requires database storage for user sessions and profiles.

---

### 7. "CORS blocked"

**Problem**: Browser blocks authentication requests due to CORS policy.

**Solution**:
1. Verify you're accessing via the correct domain
2. Check that origin is a Replit domain (*.replit.dev, *.replit.app)
3. For custom domains, add to `trustedOrigins` in auth-config.ts

**Why**: Security policy prevents cross-origin requests unless explicitly allowed.

---

### 8. "Authentication timeout"

**Problem**: OAuth flow takes too long and times out.

**Solution**:
1. Check network connectivity
2. Verify Replit OAuth service is up
3. Try again in a few minutes
4. Check for browser extensions blocking redirects

**Why**: Network issues or slow OAuth provider can cause timeouts.

---

### 9. "2FA required but not completing"

**Problem**: User has 2FA enabled and flow gets stuck.

**Solution**:
1. Complete 2FA on Replit's auth page
2. Ensure popup blockers are disabled
3. Try in an incognito window
4. Clear browser cookies

**Why**: 2FA adds an extra step that must complete for authentication.

---

### 10. "User consent denied"

**Problem**: User declined to grant permissions.

**Solution**:
1. User needs to retry login and accept permissions
2. Review requested scopes (openid, email, profile, offline_access)
3. Ensure scopes are reasonable and explained

**Why**: Users must explicitly grant permission for the app to access their data.

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Secret key for session encryption (32+ chars) | `openssl rand -base64 32` |
| `REPL_ID` | Your Replit app ID (auto-set by Replit) | `abc123...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ISSUER_URL` | OAuth issuer URL | `https://replit.com/oidc` |
| `REDIRECT_URI_BASE` | Base URL for OAuth callbacks | Dynamic (from request) |
| `AUTH_SCOPES` | OAuth scopes (space-separated) | `openid email profile offline_access` |
| `SESSION_TTL` | Session lifetime (ms) | `604800000` (7 days) |
| `TOKEN_REFRESH_BUFFER` | Seconds before expiry to refresh | `300` (5 minutes) |
| `AUTH_MAX_RETRIES` | Max retries for token refresh | `3` |
| `AUTH_RETRY_BACKOFF` | Initial retry backoff (ms) | `1000` |

---

## Rate Limits

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `/api/login` | 5 requests | 15 minutes | Stricter to prevent brute force |
| `/api/callback` | 20 requests | 15 minutes | More lenient for legitimate retries |
| `/api/logout` | 10 requests | 15 minutes | Standard rate limit |

After exceeding limits, the IP is locked out for 1 hour after 10+ failures.

---

## Testing Auth Flow

### Local Development

1. Set environment variables:
   ```bash
   export SESSION_SECRET=$(openssl rand -base64 32)
   export NODE_ENV=development
   ```

2. Database must be available (use PostgreSQL or set up locally)

3. Auth will use HTTP instead of HTTPS in development

### Production (Replit Deployment)

1. Ensure all required secrets are set in Replit Secrets panel
2. Deploy the app
3. Test the auth flow:
   - Navigate to `/` (landing page)
   - Click "Log In to Begin Recovery"
   - Complete OAuth flow on Replit
   - Should redirect back to `/` as authenticated user

---

## Monitoring

### Check Auth Metrics

```bash
curl https://your-app.replit.app/api/auth/health?metrics=true
```

Returns:
- Total logins
- Failed logins
- Success rate
- Token refreshes
- Average latency

### Check Logs

```bash
# In Replit console
grep "\[Auth\]" .logs/output.log
```

---

## Security Best Practices

1. **Never commit SESSION_SECRET** - Always use Replit Secrets
2. **Use strong secrets** - 32+ random characters
3. **Monitor failed attempts** - Check logs for repeated failures
4. **Keep dependencies updated** - Regularly update openid-client and passport
5. **Validate redirect URIs** - Ensure only your domains are allowed
6. **Use HTTPS in production** - Never use HTTP for OAuth in production
7. **Implement session expiration** - Don't allow infinite sessions
8. **Log security events** - Track failed auth, lockouts, etc.

---

## Getting Help

If you're still experiencing issues:

1. Check the health endpoint: `/api/auth/health?metrics=true`
2. Review server logs for `[Auth]` messages
3. Verify all environment variables are set correctly
4. Try in an incognito window to rule out browser cache issues
5. Contact support with:
   - Error message
   - Health check output
   - Relevant log lines
   - Steps to reproduce

---

## Related Documentation

- [Replit Authentication Guide](https://docs.replit.com/hosting/authentication/replit-auth)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OpenID Connect](https://openid.net/connect/)
