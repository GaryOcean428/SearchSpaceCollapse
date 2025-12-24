/**
 * Auth Rate Limiter
 * 
 * Protects OAuth endpoints from abuse and prevents hitting Replit's
 * rate limits. Implements sliding window rate limiting per IP and per user.
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import {
  RATE_LIMIT_WINDOW_MS,
  MAX_LOGIN_ATTEMPTS,
  MAX_CALLBACK_ATTEMPTS,
  MAX_AUTH_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  LOCKOUT_THRESHOLD,
  CLEANUP_INTERVAL_MS,
} from './auth-constants';

// Helper to safely get IP address (handles both IPv4 and IPv6)
function getClientIp(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  // Normalize IPv6-mapped IPv4 addresses
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

// Store for tracking failed auth attempts
const failedAttempts = new Map<string, { count: number; firstAttempt: number; locked: boolean }>();

// Cleanup interval ID for proper cleanup
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * General auth endpoint rate limiter
 * Protects /api/login, /api/callback, /api/logout
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_AUTH_ATTEMPTS,
  message: {
    error: 'Too many authentication requests. Please try again in 15 minutes.',
    retryAfter: RATE_LIMIT_WINDOW_MS / 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from counting against limit
  skipSuccessfulRequests: false,
  // Disable IP validation since we handle IPv6 normalization manually
  validate: { ip: false },
  // Custom key generator - use IP + user agent for better tracking
  keyGenerator: (req: Request) => {
    const ip = getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  },
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    console.warn(`[AuthRateLimit] Rate limit exceeded for ${getClientIp(req)} on ${req.path}`);
    res.status(429).json({
      error: 'Too many authentication requests',
      message: 'Please wait 15 minutes before trying again',
      retryAfter: RATE_LIMIT_WINDOW_MS / 1000,
    });
  },
});

/**
 * Stricter rate limiter for login endpoint
 * More restrictive to prevent brute force
 */
export const loginRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_LOGIN_ATTEMPTS,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: RATE_LIMIT_WINDOW_MS / 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  keyGenerator: (req: Request) => {
    return `login:${getClientIp(req)}`;
  },
  handler: (req: Request, res: Response) => {
    console.warn(`[LoginRateLimit] Too many login attempts from ${getClientIp(req)}`);
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Your IP has been temporarily blocked. Please try again in 15 minutes.',
      retryAfter: RATE_LIMIT_WINDOW_MS / 1000,
    });
  },
});

/**
 * More lenient rate limiter for OAuth callback
 * Callbacks can retry legitimately due to network issues
 */
export const callbackRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_CALLBACK_ATTEMPTS,
  message: {
    error: 'Too many callback attempts. Please try again in 15 minutes.',
    retryAfter: RATE_LIMIT_WINDOW_MS / 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful callbacks
  validate: { ip: false },
  keyGenerator: (req: Request) => {
    return `callback:${getClientIp(req)}`;
  },
});

/**
 * Track failed authentication attempts for lockout
 * Locks out IPs that repeatedly fail authentication
 */
export function trackFailedAuth(req: Request): void {
  const key = getClientIp(req);
  const now = Date.now();
  
  const entry = failedAttempts.get(key);
  
  if (!entry) {
    failedAttempts.set(key, {
      count: 1,
      firstAttempt: now,
      locked: false,
    });
    return;
  }
  
  // Reset counter if window has passed
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.firstAttempt = now;
    entry.locked = false;
    return;
  }
  
  entry.count++;
  
  // Lock out after too many failures
  if (entry.count >= LOCKOUT_THRESHOLD) {
    entry.locked = true;
    console.warn(`[AuthLockout] IP ${key} locked out after ${entry.count} failed attempts`);
  }
}

/**
 * Check if an IP is locked out
 */
export function isLockedOut(req: Request): boolean {
  const key = getClientIp(req);
  const entry = failedAttempts.get(key);
  
  if (!entry || !entry.locked) return false;
  
  const now = Date.now();
  
  // Check if lockout has expired
  if (now - entry.firstAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Middleware to check for lockout
 */
export function checkLockout(req: Request, res: Response, next: NextFunction): void {
  if (isLockedOut(req)) {
    const key = getClientIp(req);
    const entry = failedAttempts.get(key);
    const lockoutEnd = entry ? entry.firstAttempt + LOCKOUT_DURATION_MS : Date.now();
    const remainingSeconds = Math.ceil((lockoutEnd - Date.now()) / 1000);
    
    console.warn(`[AuthLockout] Blocked request from locked out IP ${key}`);
    
    res.status(403).json({
      error: 'Account temporarily locked',
      message: `Too many failed authentication attempts. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
      retryAfter: remainingSeconds,
    });
    return;
  }
  
  next();
}

/**
 * Clear failed attempts for an IP (call on successful auth)
 */
export function clearFailedAttempts(req: Request): void {
  const key = getClientIp(req);
  failedAttempts.delete(key);
}

/**
 * Cleanup old entries periodically
 * Initialize cleanup on module load
 */
function startCleanup(): void {
  if (cleanupIntervalId) return; // Already started
  
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of failedAttempts.entries()) {
      if (now - entry.firstAttempt > LOCKOUT_DURATION_MS) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      failedAttempts.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`[AuthRateLimit] Cleaned up ${expiredKeys.length} expired lockout entries`);
    }
  }, CLEANUP_INTERVAL_MS); // Clean up every 5 minutes
  
  // Unref so it doesn't keep the process alive
  if (cleanupIntervalId.unref) {
    cleanupIntervalId.unref();
  }
}

/**
 * Stop cleanup (for testing or module unload)
 */
export function stopCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Start cleanup on module load
startCleanup();
