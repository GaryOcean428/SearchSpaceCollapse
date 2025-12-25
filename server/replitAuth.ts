import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import { loadAuthConfig, buildRedirectUri, buildPostLogoutUri, normalizeRedirectUri, type AuthConfig } from "./auth-config";
import { 
  authRateLimiter, 
  loginRateLimiter, 
  callbackRateLimiter, 
  checkLockout, 
  trackFailedAuth, 
  clearFailedAttempts 
} from "./auth-rate-limiter";
import { trackLogin, trackTokenRefresh } from "./auth-health";
import { 
  authSecurityHeaders, 
  logSecurityEvent, 
  initSecurityChecks 
} from "./auth-security";

// Global auth configuration
let authConfig: AuthConfig | null = null;

// Run security checks on module load
initSecurityChecks();

// OAuth token exchange timeout (30 seconds - fail fast instead of hanging)
const OAUTH_TIMEOUT_MS = 30000;
// Retry configuration for transient network errors
const OAUTH_MAX_RETRIES = 3;
const OAUTH_RETRY_BACKOFF_MS = 1000;

/**
 * Check if an error is a transient network error that can be retried
 */
function isTransientNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase() || '';
  const causeMessage = error?.cause?.message?.toLowerCase() || '';
  const causeCode = error?.cause?.code?.toLowerCase() || '';
  
  // Check for common transient network errors
  const transientPatterns = [
    'epipe', 'econnreset', 'econnrefused', 'etimedout', 'enetunreach',
    'enotfound', 'ehostunreach', 'fetch failed', 'network', 'socket hang up',
    'aborted', 'timeout', 'econnaborted'
  ];
  
  return transientPatterns.some(pattern => 
    message.includes(pattern) || code.includes(pattern) ||
    causeMessage.includes(pattern) || causeCode.includes(pattern)
  );
}

/**
 * Create a resilient fetch with timeout and retry logic for OAuth operations
 */
function createResilientFetch(timeoutMs: number = OAUTH_TIMEOUT_MS): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: any = null;
    
    for (let attempt = 0; attempt < OAUTH_MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        if (attempt > 0) {
          const backoff = OAUTH_RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`[OAuth] Retry ${attempt}/${OAUTH_MAX_RETRIES} after ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
        
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;
        
        // Check if it's a transient error worth retrying
        if (isTransientNetworkError(error)) {
          console.log(`[OAuth] Transient network error on attempt ${attempt + 1}/${OAUTH_MAX_RETRIES}: ${error.message}`);
          continue;
        }
        
        // Non-transient error, don't retry
        throw error;
      }
    }
    
    // All retries exhausted
    console.error(`[OAuth] All ${OAUTH_MAX_RETRIES} retry attempts failed`);
    throw lastError;
  };
}

// Custom fetch instance for OAuth operations
const oauthFetch = createResilientFetch();

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = authConfig?.issuerUrl || process.env.ISSUER_URL || "https://replit.com/oidc";
    const clientId = authConfig?.clientId || process.env.REPL_ID!;
    
    console.log(`[OIDC] Discovering configuration from ${issuerUrl}`);
    
    // Use resilient fetch with timeout and retry for OIDC discovery
    return await client.discovery(
      new URL(issuerUrl),
      clientId,
      undefined, // client_secret
      undefined, // client_auth
      { [client.customFetch]: oauthFetch } // Use our resilient fetch
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession(config?: AuthConfig) {
  const sessionTtl = config?.sessionTtl || 7 * 24 * 60 * 60 * 1000; // 1 week default
  const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
  const isDev = !isDeployment && process.env.NODE_ENV === "development";
  
  console.log(`[Session] Environment: NODE_ENV=${process.env.NODE_ENV}, isDev=${isDev}, isDeployment=${isDeployment}`);
  
  if (config && !config.enabled) {
    throw new Error('Cannot create session - auth is disabled');
  }
  
  const sessionSecret = config?.sessionSecret || process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    console.error(`[Session] ERROR: SESSION_SECRET is not set!`);
    throw new Error('SESSION_SECRET environment variable must be set for authentication');
  }
  
  console.log(`[Session] SESSION_SECRET exists: ${!!sessionSecret}`);
  
  // Use in-memory session store for instant performance
  // This avoids DB connection pool contention with heavy balance checking operations
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // Prune expired sessions every 24 hours
    ttl: sessionTtl,
  });
  console.log("[Session] Using in-memory session store (fast, no DB contention)");
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  // Only update refresh_token if a new one is provided (OIDC responses often omit it on refresh)
  // Preserving the existing token prevents 401s after the first token refresh cycle
  if (tokens.refresh_token) {
    user.refresh_token = tokens.refresh_token;
  }
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const userData = {
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  };
  // Return the full user record from DB (includes createdAt/updatedAt)
  const fullUser = await storage.upsertUser(userData);
  return fullUser;
}

// Cache user profile data in the session to avoid DB lookups on every request
function cacheUserInSession(user: any, userData: any) {
  // Cache the complete user record, add cachedAt for TTL tracking
  user.cachedProfile = {
    ...userData,
    cachedAt: Date.now(),
  };
}

// Get cached user from session (valid for 5 minutes)
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedUser(user: any): any | null {
  if (!user?.cachedProfile) return null;
  
  const age = Date.now() - user.cachedProfile.cachedAt;
  if (age > USER_CACHE_TTL_MS) {
    // Cache expired
    return null;
  }
  
  return user.cachedProfile;
}

export async function setupAuth(app: Express, dbAvailable: boolean = true) {
  // Load and validate auth configuration
  authConfig = loadAuthConfig(dbAvailable);
  
  if (!authConfig.enabled) {
    console.log('[Auth] Authentication disabled - skipping setup');
    return;
  }
  
  app.set("trust proxy", 1);
  app.use(getSession(authConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    // Upsert user and cache profile in session to avoid DB lookups later
    const userData = await upsertUser(tokens.claims());
    cacheUserInSession(user, userData);
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Helper function to ensure strategy exists for a domain (always uses HTTPS for deployed apps)
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const redirectUri = buildRedirectUri(domain, authConfig!);
      
      console.log(`[Auth] Registering strategy for domain: ${domain}`);
      console.log(`[Auth] Redirect URI: ${redirectUri}`);
      
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: authConfig!.scopes.join(' '),
          callbackURL: redirectUri,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
      console.log(`[Auth] ✅ Strategy registered for domain: ${domain}`);
    }
  };

  // Login endpoint with rate limiting and lockout protection
  app.get("/api/login", authSecurityHeaders, checkLockout, loginRateLimiter, async (req, res, next) => {
    const domain = req.hostname;
    const startTime = Date.now();
    
    console.log(`[Auth] Login initiated for domain: ${domain}`);
    console.log(`[Auth] Request headers: ${JSON.stringify({ origin: req.get('origin'), referer: req.get('referer') })}`);
    
    logSecurityEvent('login_attempt', req);
    
    try {
      await ensureStrategy(domain);
      console.log(`[Auth] Starting passport authenticate for ${domain}...`);
      
      // Let passport handle the redirect
      passport.authenticate(`replitauth:${domain}`, {
        prompt: "login consent",
        scope: authConfig!.scopes,
      })(req, res, next);
    } catch (error: any) {
      console.error(`[Auth] Login setup error:`, error);
      trackFailedAuth(req);
      trackLogin(false, Date.now() - startTime);
      logSecurityEvent('login_error', req, { error: error.message }, 'warning');
      res.status(500).json({ error: 'Login failed', details: error.message });
    }
  });

  app.get("/api/callback", authSecurityHeaders, checkLockout, callbackRateLimiter, (req, res, next) => {
    const domain = req.hostname;
    const protocol = req.protocol;
    const fullUrl = `${protocol}://${domain}${req.originalUrl}`;
    const startTime = Date.now();
    
    console.log(`[Auth] Callback received:`);
    console.log(`[Auth]   Domain: ${domain}`);
    console.log(`[Auth]   Protocol: ${protocol}`);
    console.log(`[Auth]   Full URL: ${fullUrl}`);
    console.log(`[Auth]   Query params: ${JSON.stringify(req.query)}`);
    
    ensureStrategy(domain);
    
    // Use passport.authenticate with success/failure redirects
    // The custom callback is ONLY for error handling - do NOT call next() on success
    // since passport handles the redirect via successReturnToOrRedirect
    passport.authenticate(`replitauth:${domain}`, (err: any, user: any, info: any) => {
      if (err) {
        console.error(`[Auth] Callback error:`, err);
        trackFailedAuth(req);
        trackLogin(false, Date.now() - startTime);
        logSecurityEvent('auth_callback_error', req, { error: err.message }, 'warning');
        // Redirect to landing with error so user can retry
        const errorMsg = err.message || 'Unknown error';
        const errorType = errorMsg.toLowerCase().includes('timed out') || errorMsg.toLowerCase().includes('timeout') ? 'timeout' : 'error';
        return res.redirect('/?authError=' + errorType + '&message=' + encodeURIComponent(errorMsg));
      }
      
      if (!user) {
        console.error(`[Auth] No user returned:`, info);
        trackFailedAuth(req);
        trackLogin(false, Date.now() - startTime);
        logSecurityEvent('auth_callback_no_user', req, { info }, 'warning');
        // Redirect to landing with error so user can retry
        const errorMsg = info?.message || 'Authentication failed';
        const errorType = errorMsg.toLowerCase().includes('timed out') || errorMsg.toLowerCase().includes('timeout') ? 'timeout' : 'failed';
        return res.redirect('/?authError=' + errorType + '&message=' + encodeURIComponent(errorMsg));
      }
      
      // Log the user in and redirect to home
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error(`[Auth] Login error:`, loginErr);
          trackFailedAuth(req);
          trackLogin(false, Date.now() - startTime);
          logSecurityEvent('login_error', req, { error: loginErr.message }, 'warning');
          return res.redirect('/?authError=login&message=' + encodeURIComponent(loginErr.message || 'Login failed'));
        }
        
        const latency = Date.now() - startTime;
        console.log(`[Auth] ✅ Successfully logged in user: ${user.claims?.sub} (${latency}ms)`);
        clearFailedAttempts(req); // Clear any failed attempts on successful login
        trackLogin(true, latency);
        logSecurityEvent('login_success', req, { userId: user.claims?.sub }, 'info');
        
        // CRITICAL: Explicitly save session before redirecting
        // This ensures the session is persisted before the browser makes the next request
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error(`[Auth] Session save error:`, saveErr);
          }
          // Redirect to home page after successful login
          return res.redirect('/');
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", authSecurityHeaders, authRateLimiter, (req, res) => {
    const domain = req.hostname;
    const userId = (req.user as any)?.claims?.sub;
    
    console.log(`[Auth] Logout initiated for domain: ${domain}, user: ${userId}`);
    logSecurityEvent('logout', req, { userId }, 'info');
    
    req.logout(() => {
      const postLogoutUri = buildPostLogoutUri(domain, authConfig!);
      console.log(`[Auth] Redirecting to OIDC end session: ${postLogoutUri}`);
      
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: authConfig!.clientId,
          post_logout_redirect_uri: postLogoutUri,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log(`[Auth] Unauthorized: isAuthenticated=${req.isAuthenticated()}, hasExpiresAt=${!!user?.expires_at}`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  const buffer = authConfig?.tokenRefreshBuffer || 300; // 5 minute buffer default
  const shouldRefresh = now >= (user.expires_at - buffer);
  
  // Token is still valid with buffer
  if (!shouldRefresh) {
    return next();
  }

  // Token expired or about to expire, attempt refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log(`[Auth] Token expired, no refresh token available for user ${user.claims?.sub}`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attempt refresh with retry logic
  const maxRetries = authConfig?.maxRetries || 3;
  const retryBackoffMs = authConfig?.retryBackoffMs || 1000;
  
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = retryBackoffMs * Math.pow(2, attempt - 1);
        console.log(`[Auth] Retry ${attempt}/${maxRetries} after ${backoff}ms for user ${user.claims?.sub}`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
      
      console.log(`[Auth] Token expired for user ${user.claims?.sub}, attempting refresh (attempt ${attempt + 1}/${maxRetries})...`);
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      
      // Track successful refresh
      trackTokenRefresh();
      
      // Save the session asynchronously (fire and forget) to avoid blocking the request
      // The token refresh has already succeeded, so we can proceed immediately
      if (req.session) {
        req.session.save((err) => {
          if (err) {
            console.error(`[Auth] Failed to save session after refresh:`, err);
            // Non-fatal - session will be saved on next request
          }
        });
      }
      
      console.log(`[Auth] ✅ Token refreshed successfully for user ${user.claims?.sub}`);
      logSecurityEvent('token_refresh_success', req, { userId: user.claims?.sub }, 'info');
      return next();
    } catch (error: any) {
      lastError = error;
      console.error(`[Auth] Token refresh attempt ${attempt + 1}/${maxRetries} failed for user ${user.claims?.sub}:`, error.message);
      
      // Don't retry on certain errors
      if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_token')) {
        console.error(`[Auth] Non-retryable error, aborting refresh attempts`);
        break;
      }
    }
  }
  
  // All retries failed
  console.error(`[Auth] Token refresh failed after ${maxRetries} attempts for user ${user.claims?.sub}:`, lastError);
  logSecurityEvent('token_refresh_failure', req, { userId: user.claims?.sub, error: lastError?.message }, 'warning');
  return res.status(401).json({ message: "Unauthorized" });
};
