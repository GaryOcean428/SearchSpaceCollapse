/**
 * Centralized Rate Limiters
 * 
 * DRY-compliant rate limiting configurations.
 * Import from here instead of defining inline in route files.
 */

import rateLimit from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Standard rate limiter - 20 requests per minute
 * Use for typical API endpoints
 */
export const standardLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Generous rate limiter - 60 requests per minute
 * Use for high-frequency endpoints like consciousness, admin, recovery
 */
export const generousLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter - 5 requests per minute
 * Use for expensive operations like blockchain queries
 */
export const strictLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: 5,
  message: { error: 'Rate limit exceeded. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Factory function for custom rate limiters
 * Use when standard tiers don't fit
 */
export function createRateLimiter(
  max: number,
  message: string = 'Too many requests. Please try again later.',
  windowMs: number = DEFAULT_WINDOW_MS
) {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
