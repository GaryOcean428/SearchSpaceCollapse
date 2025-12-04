import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
  // In deployments, always treat as production even if NODE_ENV isn't set
  const isDev = !isDeployment && process.env.NODE_ENV === "development";
  
  console.log(`[Session] Environment: NODE_ENV=${process.env.NODE_ENV}, isDev=${isDev}, isDeployment=${isDeployment}`);
  console.log(`[Session] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
  console.log(`[Session] SESSION_SECRET exists: ${!!process.env.SESSION_SECRET}`);
  
  // Ensure SESSION_SECRET exists
  if (!process.env.SESSION_SECRET) {
    console.error(`[Session] ERROR: SESSION_SECRET is not set!`);
    throw new Error('SESSION_SECRET environment variable must be set for authentication');
  }
  
  // Use database session store if DATABASE_URL is available, otherwise use memory store
  let sessionStore;
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true, // Auto-create if missing
      ttl: sessionTtl,
      tableName: "sessions",
      pruneSessionInterval: 60 * 60, // Prune expired sessions every hour
      errorLog: (err: Error) => {
        console.error("[Session] PostgreSQL session store error:", err.message);
      },
    });
    console.log("[Session] Using PostgreSQL session store");
  } else {
    console.log("[Session] Using memory session store (no DATABASE_URL)");
  }
  
  // For Replit deployments, use 'lax' sameSite which works better with OIDC redirects
  // 'none' requires third-party cookie support which many browsers block
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore, // undefined = use default memory store
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isDev, // Only secure in production (HTTPS)
      sameSite: 'lax', // 'lax' works for same-site navigation including OIDC redirects
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
  user.refresh_token = tokens.refresh_token;
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

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
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
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
      console.log(`[Auth] Registered strategy for domain: ${domain}`);
    }
  };

  app.get("/api/login", (req, res, next) => {
    const domain = req.hostname;
    console.log(`[Auth] Login initiated for domain: ${domain}`);
    ensureStrategy(domain);
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const domain = req.hostname;
    const protocol = req.protocol;
    const fullUrl = `${protocol}://${domain}${req.originalUrl}`;
    console.log(`[Auth] Callback received:`);
    console.log(`[Auth]   Domain: ${domain}`);
    console.log(`[Auth]   Protocol: ${protocol}`);
    console.log(`[Auth]   Full URL: ${fullUrl}`);
    console.log(`[Auth]   Query params: ${JSON.stringify(req.query)}`);
    
    ensureStrategy(domain);
    passport.authenticate(`replitauth:${domain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        console.error(`[Auth] Callback error:`, err);
        return res.redirect('/api/login?error=' + encodeURIComponent(err.message || 'Unknown error'));
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `https://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
