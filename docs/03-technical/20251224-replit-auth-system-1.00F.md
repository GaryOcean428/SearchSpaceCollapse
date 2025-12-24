# Replit Authentication System

## Overview

Comprehensive OAuth 2.0 / OpenID Connect authentication system for Replit applications with built-in security, monitoring, and error handling.

## Features

### 🔐 Security
- **Rate Limiting**: Protects against brute force (5-20 req/15min)
- **IP Lockout**: Automatic 1-hour lockout after 10+ failures
- **Token Leakage Detection**: Scans responses for exposed tokens
- **Security Audit Log**: Tracks all auth events
- **Session Secret Validation**: Enforces strong secrets
- **Security Headers**: no-cache, no-referrer, etc.

### 🔄 Reliability
- **Token Refresh**: Automatic refresh 5 min before expiry
- **Retry Logic**: 3 retries with exponential backoff
- **Error Recovery**: Smart retry on transient errors
- **Graceful Degradation**: Works without database (no auth)

### 📊 Monitoring
- **Health Check**: `/api/auth/health?metrics=true`
- **Metrics**: Login count, failures, latency, success rate
- **Audit Logs**: Security events with IP and user tracking
- **Detailed Logging**: Comprehensive auth flow logs

### 🎨 User Experience
- **Clear Error Messages**: Specific failure types
- **Health Status Display**: Shows system status on errors
- **Retry Mechanism**: Easy retry with status check
- **Progressive Timeouts**: Updates message based on wait time

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (React)                        │
│  - Landing page with login                              │
│  - Error handling with health checks                    │
│  - Session expiration modal                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│               Server (Express + Passport)                │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ auth-config.ts                                   │   │
│  │ - Load & validate configuration                  │   │
│  │ - Environment variable management                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ auth-rate-limiter.ts                            │   │
│  │ - Rate limiting (5-20 req/15min)                │   │
│  │ - IP lockout (1hr after 10+ failures)           │   │
│  │ - Per-endpoint limits                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ auth-health.ts                                   │   │
│  │ - Health checks (config, OIDC, session, DB)     │   │
│  │ - Metrics tracking (logins, failures, latency)  │   │
│  │ - Troubleshooting info                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ auth-security.ts                                 │   │
│  │ - Token leakage detection                        │   │
│  │ - Security audit logging                         │   │
│  │ - Security headers                               │   │
│  │ - Secret validation                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ replitAuth.ts                                    │   │
│  │ - OAuth 2.0 / OpenID Connect flow               │   │
│  │ - Token management & refresh                     │   │
│  │ - Session management                             │   │
│  │ - Multi-domain strategy registration             │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Replit OAuth Provider                       │
│  - https://replit.com/oidc                              │
│  - OAuth 2.0 Authorization Code Flow                    │
│  - OpenID Connect                                        │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Set Environment Variables

In Replit Secrets:

```bash
# Required
SESSION_SECRET=<32+ random characters>

# Generate with:
openssl rand -base64 32

# Optional (uses defaults if not set)
REDIRECT_URI_BASE=https://your-app.replit.app
AUTH_SCOPES=openid email profile offline_access
SESSION_TTL=604800000
TOKEN_REFRESH_BUFFER=300
```

### 2. Provision Database

Auth requires PostgreSQL for user storage:

1. Click "Database" in Replit sidebar
2. Select "PostgreSQL"
3. `DATABASE_URL` will be automatically set

### 3. Test Auth Flow

1. Navigate to `/` (landing page)
2. Click "Log In to Begin Recovery"
3. Complete OAuth on Replit
4. Should redirect back authenticated

### 4. Check Health

```bash
curl https://your-app.replit.app/api/auth/health?metrics=true
```

## API Reference

### Endpoints

#### `GET /api/login`
Initiates OAuth login flow.

**Rate Limit**: 5 requests per 15 minutes

**Response**: Redirects to Replit OAuth

#### `GET /api/callback`
OAuth callback endpoint.

**Rate Limit**: 20 requests per 15 minutes

**Response**: Redirects to `/` on success, `/?authError=...` on failure

#### `GET /api/logout`
Logs out user and clears session.

**Rate Limit**: 10 requests per 15 minutes

**Response**: Redirects to Replit end session

#### `GET /api/auth/user`
Get current user info (requires authentication).

**Response**:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://..."
}
```

#### `GET /api/auth/health?metrics=true`
Health check with optional metrics.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "checks": {
    "config": { "status": "pass", "message": "Config loaded" },
    "oidc": { "status": "pass", "message": "OIDC reachable", "latency": 150 },
    "session": { "status": "pass", "message": "Session store active" },
    "database": { "status": "pass", "message": "Database connected" }
  },
  "metrics": {
    "totalLogins": 42,
    "failedLogins": 3,
    "tokenRefreshes": 15,
    "averageLatency": 125,
    "successRate": 93
  }
}
```

### Middleware

#### `isAuthenticated`
Protects routes requiring authentication.

```typescript
import { isAuthenticated } from './replitAuth';

app.get('/api/protected', isAuthenticated, (req, res) => {
  // User is authenticated
  const userId = req.user.claims.sub;
  res.json({ message: 'Hello ' + userId });
});
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_SECRET` | Yes | - | 32+ character secret for sessions |
| `REPL_ID` | Yes* | - | Auto-set by Replit |
| `DATABASE_URL` | Yes* | - | Auto-set when DB provisioned |
| `ISSUER_URL` | No | `https://replit.com/oidc` | OAuth issuer |
| `REDIRECT_URI_BASE` | No | Dynamic | Base URL for callbacks |
| `AUTH_SCOPES` | No | `openid email profile offline_access` | OAuth scopes |
| `SESSION_TTL` | No | `604800000` (7 days) | Session lifetime (ms) |
| `TOKEN_REFRESH_BUFFER` | No | `300` (5 min) | Refresh buffer (seconds) |
| `AUTH_MAX_RETRIES` | No | `3` | Token refresh retries |
| `AUTH_RETRY_BACKOFF` | No | `1000` | Retry backoff (ms) |

\* Automatically set by Replit

### Rate Limits

| Endpoint | Limit | Window | Lockout |
|----------|-------|--------|---------|
| `/api/login` | 5 | 15 min | 1 hour after 10+ failures |
| `/api/callback` | 20 | 15 min | 1 hour after 10+ failures |
| `/api/logout` | 10 | 15 min | - |

## Error Handling

### Error Types

| Type | Cause | User Action |
|------|-------|-------------|
| `timeout` | OAuth timeout | Retry login |
| `failed` | User declined permissions | Grant permissions and retry |
| `login` | Login process error | Check logs, retry |
| `error` | Generic error | Check health status |

### Error Response

Errors redirect to `/?authError=<type>&message=<details>`

Frontend displays:
- Error title
- Explanation
- Detailed message
- Health status (if degraded)
- Retry button
- Check Status button

## Security

### Best Practices

✅ **Use strong SESSION_SECRET**
- Generate with `openssl rand -base64 32`
- Never commit to git
- Store in Replit Secrets

✅ **Monitor failed attempts**
- Check logs for patterns
- Investigate lockouts
- Review audit logs

✅ **Keep dependencies updated**
- `openid-client`
- `passport`
- `express-session`

✅ **Use HTTPS in production**
- Automatic for Replit deployments
- Never use HTTP for OAuth

✅ **Validate redirect URIs**
- Set `REDIRECT_URI_BASE` for strict matching
- Ensure HTTPS

✅ **Review audit logs**
- `/api/auth/health?metrics=true`
- Check security events
- Monitor success rate

### Security Headers

Auth endpoints automatically include:
- `Cache-Control: no-store, no-cache, must-revalidate, private`
- `Pragma: no-cache`
- `Expires: 0`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`

### Token Leakage Detection

Responses are scanned for:
- Access tokens
- Refresh tokens
- Session secrets
- JWT tokens
- API keys
- Passwords

Detected leaks are:
- Logged as warnings
- Redacted in production
- Tracked in audit log

## Monitoring

### Health Check

```bash
curl https://your-app.replit.app/api/auth/health?metrics=true
```

**Status Codes**:
- `200 healthy` - All systems operational
- `200 degraded` - Some issues but auth working
- `503 down` - Auth not available

### Metrics

- **totalLogins**: Successful login count
- **failedLogins**: Failed login attempts
- **tokenRefreshes**: Automatic refresh count
- **averageLatency**: Average auth latency (ms)
- **successRate**: Login success percentage

### Logs

Filter logs by prefix:
- `[Auth]` - Authentication flow
- `[Session]` - Session management
- `[AuthRateLimit]` - Rate limiting
- `[AuthLockout]` - IP lockouts
- `[OIDC]` - OAuth/OIDC operations
- `[Security]` - Security events
- `[SecurityAudit:<severity>]` - Audit events

## Testing

### Unit Tests

```bash
npm test server/tests/auth-flow.test.ts
```

Tests cover:
- Configuration validation
- Rate limiting
- Metrics tracking
- Security utilities
- Error handling

### Manual Testing

See `docs/02-procedures/20251224-replit-auth-testing-guide-1.00F.md`

Scenarios:
- First-time login
- Token refresh
- Rate limiting
- Error handling
- CORS
- Logout
- IP lockout
- Health checks

### E2E Testing

```bash
npm run test:e2e
```

Tests full auth flow in browser.

## Troubleshooting

### Common Issues

See `docs/02-procedures/20251224-replit-auth-troubleshooting-1.00F.md`

**Quick fixes**:

1. **"SESSION_SECRET not set"**
   ```bash
   # In Replit Secrets
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

2. **"Database not configured"**
   - Provision PostgreSQL in Replit
   - `DATABASE_URL` will be auto-set

3. **"Rate limit exceeded"**
   - Wait 15 minutes
   - Or restart server (dev only)

4. **"Redirect URI mismatch"**
   - Set `REDIRECT_URI_BASE` in Secrets
   - Match your deployed domain exactly

5. **"Token expired"**
   - User needs to log in again
   - Check `offline_access` scope is included

### Debug Mode

Enable verbose logging:

```typescript
// In replitAuth.ts
console.log('[Auth] Debug:', {
  user: req.user,
  session: req.session,
  authenticated: req.isAuthenticated(),
});
```

### Health Diagnostics

```bash
# Check all subsystems
curl localhost:5000/api/auth/health?metrics=true | jq

# Check specific component
curl localhost:5000/api/auth/health | jq '.checks.oidc'

# Monitor in real-time
watch -n 5 'curl -s localhost:5000/api/auth/health | jq .status'
```

## Performance

### Benchmarks

- **Login flow**: < 5 seconds (network dependent)
- **Token refresh**: < 500ms
- **Health check**: < 100ms (cached)
- **Auth middleware**: < 5ms (in-memory session)

### Optimization

✅ **Session caching**
- User profile cached for 5 minutes
- Avoids DB lookups on every request

✅ **OIDC config caching**
- Discovery endpoint cached for 1 hour
- Reduces OAuth provider requests

✅ **In-memory session store**
- Fast session access
- No DB contention

⚠️ **Consider for scale**:
- PostgreSQL-backed sessions
- Redis rate limiting
- Multi-instance load balancing

## Migration Guide

### From Basic Auth

1. Install dependencies (already included)
2. Set `SESSION_SECRET` in Secrets
3. Provision PostgreSQL database
4. Restart application
5. Test login flow

### From Another OAuth

1. Update issuer URL
2. Update client ID
3. Map user claims
4. Test end-to-end

## Contributing

### Adding Features

1. Add to appropriate module:
   - `auth-config.ts` - Configuration
   - `auth-rate-limiter.ts` - Rate limiting
   - `auth-health.ts` - Monitoring
   - `auth-security.ts` - Security
   - `replitAuth.ts` - Core auth

2. Add tests in `server/tests/auth-flow.test.ts`

3. Update documentation

4. Test manually using testing guide

### Code Style

- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Follow existing patterns
- Keep functions focused (<50 lines)
- Log errors with context

## License

MIT

## Support

- **Issues**: GitHub Issues
- **Docs**: `docs/02-procedures/`
- **Health**: `/api/auth/health`
- **Logs**: Search for `[Auth]` prefix
