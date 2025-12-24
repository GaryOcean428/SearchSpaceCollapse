# Auth Flow Manual Testing Guide

This guide provides step-by-step instructions for manually testing the Replit authentication flow.

## Prerequisites

1. Replit account
2. PostgreSQL database provisioned
3. Environment variables set:
   - `SESSION_SECRET` (32+ characters)
   - `REPL_ID` (automatically set by Replit)
   - `DATABASE_URL` (automatically set when database is provisioned)

## Test Scenarios

### 1. First-Time Login (Happy Path)

**Steps**:
1. Navigate to the landing page (`/`)
2. Click "Log In to Begin Recovery"
3. Complete OAuth flow on Replit
4. Grant permissions when prompted
5. Should redirect back to `/` as authenticated user

**Expected Results**:
- ✅ Smooth redirect to Replit OAuth
- ✅ Clear permission request
- ✅ Successful redirect back to app
- ✅ User session established
- ✅ Can access authenticated features

**Check Logs For**:
```
[Auth] Login initiated for domain: your-app.replit.app
[Auth] Starting passport authenticate for your-app.replit.app...
[Auth] Callback received:
[Auth]   Domain: your-app.replit.app
[Auth] ✅ Successfully logged in user: <user-id>
```

---

### 2. Rate Limiting Protection

**Steps**:
1. Attempt to log in 6+ times in quick succession
2. Should hit rate limit after 5 attempts

**Expected Results**:
- ✅ First 5 attempts proceed normally
- ✅ 6th attempt returns 429 error
- ✅ Error message: "Too many login attempts"
- ✅ Must wait 15 minutes to retry

**Check Logs For**:
```
[LoginRateLimit] Too many login attempts from <IP>
```

**Test Command**:
```bash
for i in {1..6}; do
  echo "Attempt $i"
  curl -I http://localhost:5000/api/login
  sleep 1
done
```

---

### 3. Token Refresh (Automatic)

**Steps**:
1. Log in successfully
2. Wait for token to approach expiration (or manually set short expiry in dev)
3. Make an authenticated API request
4. Token should refresh automatically

**Expected Results**:
- ✅ Request succeeds without re-login
- ✅ New access token issued
- ✅ Session remains valid

**Check Logs For**:
```
[Auth] Token expired for user <user-id>, attempting refresh (attempt 1/3)...
[Auth] ✅ Token refreshed successfully for user <user-id>
```

---

### 4. Token Refresh Failure

**Steps**:
1. Log in successfully
2. Invalidate refresh token (simulate by clearing server-side)
3. Wait for token expiry
4. Make authenticated request

**Expected Results**:
- ✅ Returns 401 Unauthorized
- ✅ User must log in again
- ✅ Frontend shows session expiration message

**Check Logs For**:
```
[Auth] Token refresh failed after 3 attempts for user <user-id>
```

---

### 5. Redirect URI Handling

**Steps**:
1. Access app via different domains (if applicable):
   - `https://your-app.replit.dev`
   - `https://your-app.replit.app`
2. Log in from each domain
3. Should complete successfully for all

**Expected Results**:
- ✅ Correct redirect URI generated for each domain
- ✅ No "redirect_uri_mismatch" errors
- ✅ HTTPS enforced in production

**Check Logs For**:
```
[Auth] Registered strategy for domain: your-app.replit.app
[Auth] Redirect URI: https://your-app.replit.app/api/callback
```

---

### 6. Auth Health Check

**Steps**:
1. Check auth health endpoint:
   ```bash
   curl http://localhost:5000/api/auth/health?metrics=true
   ```

**Expected Results**:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "checks": {
    "config": { "status": "pass", "message": "Config loaded" },
    "oidc": { "status": "pass", "message": "OIDC provider reachable", "latency": 150 },
    "session": { "status": "pass", "message": "Session store active" },
    "database": { "status": "pass", "message": "Database connected" }
  },
  "metrics": {
    "activeSessions": 0,
    "totalLogins": 5,
    "failedLogins": 1,
    "tokenRefreshes": 2,
    "averageLatency": 125,
    "successRate": 83
  }
}
```

---

### 7. Error Handling - Timeout

**Steps**:
1. Simulate slow OAuth response (use network throttling)
2. Attempt login
3. Wait for timeout

**Expected Results**:
- ✅ Error message displayed on landing page
- ✅ "Authentication Timed Out" alert
- ✅ "Try Again" button available
- ✅ Health check shows degraded OIDC status

---

### 8. Error Handling - Permissions Denied

**Steps**:
1. Initiate login
2. Decline permissions on Replit OAuth page
3. Should redirect back with error

**Expected Results**:
- ✅ Error message: "Authentication Failed"
- ✅ Explanation: "You may have declined permissions"
- ✅ "Try Again" button available

---

### 9. CORS Handling

**Steps**:
1. Make authenticated API request from different origins:
   - Replit domain (should work)
   - Localhost (should work in dev)
   - Unknown domain (should block)

**Expected Results**:
- ✅ Trusted origins allowed
- ✅ Untrusted origins blocked with CORS error
- ✅ Appropriate CORS headers set

**Test Command**:
```bash
# Should succeed (Replit domain)
curl -H "Origin: https://your-app.replit.app" http://localhost:5000/api/auth/user

# Should fail (unknown domain)
curl -H "Origin: https://evil.com" http://localhost:5000/api/auth/user
```

---

### 10. Logout Flow

**Steps**:
1. Log in successfully
2. Click logout (or visit `/api/logout`)
3. Should clear session and redirect to Replit end session

**Expected Results**:
- ✅ Session cleared
- ✅ Redirect to Replit end session URL
- ✅ Return to landing page
- ✅ No longer authenticated

**Check Logs For**:
```
[Auth] Logout initiated for domain: your-app.replit.app
[Auth] Redirecting to OIDC end session: https://your-app.replit.app
```

---

### 11. Session Persistence

**Steps**:
1. Log in successfully
2. Close browser
3. Reopen browser and navigate to app
4. Should still be logged in (within session TTL)

**Expected Results**:
- ✅ Session persists across browser restarts
- ✅ Cookie with proper expiration
- ✅ No re-login required

---

### 12. IP Lockout

**Steps**:
1. Fail login 10+ times rapidly
2. Should get locked out

**Expected Results**:
- ✅ After 10 failures: "Account temporarily locked"
- ✅ Must wait 1 hour
- ✅ 403 Forbidden status
- ✅ Lockout clears after timeout

**Check Logs For**:
```
[AuthLockout] IP <IP> locked out after 10 failed attempts
[AuthLockout] Blocked request from locked out IP <IP>
```

---

## Performance Testing

### Token Refresh Latency

**Test**:
```bash
# Measure time for token refresh
time curl http://localhost:5000/api/auth/user
```

**Expected**: < 500ms for refresh

### Login Flow Latency

**Test**: Measure time from login click to successful redirect.

**Expected**: < 5 seconds (depends on network)

---

## Monitoring Checklist

After each test, verify:
- [ ] Logs are clear and helpful
- [ ] No unexpected errors
- [ ] Metrics are being tracked
- [ ] Health check reflects actual state
- [ ] Error messages are user-friendly

---

## Common Issues During Testing

### "SESSION_SECRET not set"
- Add to Replit Secrets: `openssl rand -base64 32`

### "Database not configured"
- Provision PostgreSQL in Replit
- Check DATABASE_URL is set

### "Rate limit exceeded" when testing
- Wait 15 minutes
- Or restart server to reset counters

### "Redirect URI mismatch"
- Check REDIRECT_URI_BASE in secrets
- Ensure exact match with OAuth config

---

## Security Testing

### SQL Injection
- [ ] Test auth endpoints with SQL injection payloads
- [ ] Should be properly sanitized

### XSS
- [ ] Test error messages with XSS payloads
- [ ] Should be properly escaped

### CSRF
- [ ] OAuth state parameter validation
- [ ] Session cookies have proper flags

### Rate Limiting Bypass
- [ ] Try to bypass with different IPs
- [ ] Try with different user agents
- [ ] Should still enforce limits

---

## Automated Test Run

```bash
# Run unit tests
npm test server/tests/auth-flow.test.ts

# Run full test suite
npm test
```

---

## Sign-Off Checklist

Before considering auth flow complete:
- [ ] All happy path scenarios pass
- [ ] All error scenarios handled gracefully
- [ ] Rate limiting works correctly
- [ ] Token refresh works automatically
- [ ] Health check shows accurate status
- [ ] Logs are comprehensive and clear
- [ ] Documentation is complete
- [ ] Security tests pass
- [ ] Performance is acceptable
- [ ] No sensitive data logged
