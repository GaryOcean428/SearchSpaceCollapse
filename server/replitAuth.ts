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

// Global auth configuration
let authConfig: AuthConfig | null = null;

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = authConfig?.issuerUrl || process.env.ISSUER_URL || "https://replit.com/oidc";
    const clientId = authConfig?.clientId || process.env.REPL_ID!;
    
    console.log(`[OIDC] Discovering configuration from ${issuerUrl}`);
    
    return await client.discovery(
      new URL(issuerUrl),
      clientId
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
  app.get("/api/login", checkLockout, loginRateLimiter, async (req, res, next) => {
    const domain = req.hostname;
    console.log(`[Auth] Login initiated for domain: ${domain}`);
    console.log(`[Auth] Request headers: ${JSON.stringify({ origin: req.get('origin'), referer: req.get('referer') })}`);
    
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
      res.status(500).json({ error: 'Login failed', details: error.message });
    }
  });

  app.get("/api/callback", checkLockout, callbackRateLimiter, (req, res, next) => {
    const domain = req.hostname;
    const protocol = req.protocol;
    const fullUrl = `${protocol}://${domain}${req.originalUrl}`;
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
        // Redirect to landing with error so user can retry
        const errorMsg = err.message || 'Unknown error';
        const errorType = errorMsg.toLowerCase().includes('timed out') || errorMsg.toLowerCase().includes('timeout') ? 'timeout' : 'error';
        return res.redirect('/?authError=' + errorType + '&message=' + encodeURIComponent(errorMsg));
      }
      
      if (!user) {
        console.error(`[Auth] No user returned:`, info);
        trackFailedAuth(req);
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
          return res.redirect('/?authError=login&message=' + encodeURIComponent(loginErr.message || 'Login failed'));
        }
        
        console.log(`[Auth] ✅ Successfully logged in user: ${user.claims?.sub}`);
        clearFailedAttempts(req); // Clear any failed attempts on successful login
        // Redirect to home page after successful login
        return res.redirect('/');
      });
    })(req, res, next);
  });

  app.get("/api/logout", authRateLimiter, (req, res) => {
    const domain = req.hostname;
    console.log(`[Auth] Logout initiated for domain: ${domain}`);
    
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
      
      // Save the session after updating it to persist the refreshed tokens
      if (req.session) {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error(`[Auth] Failed to save session after refresh:`, err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      console.log(`[Auth] ✅ Token refreshed successfully for user ${user.claims?.sub}`);
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
  return res.status(401).json({ message: "Unauthorized" });
};
