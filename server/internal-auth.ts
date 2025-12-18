/**
 * Internal API Authentication - Centralized DRY Pattern
 * 
 * Provides shared middleware and utilities for authenticating 
 * internal API calls between Python and TypeScript backends.
 * 
 * Security: Internal API key validated via X-Internal-Key header.
 */

import { Request, Response, NextFunction } from 'express';

const INTERNAL_KEY_HEADER = 'x-internal-key';

/**
 * Get the expected internal API key from environment.
 * 
 * @returns The internal API key
 */
export function getInternalApiKey(): string {
  const key = process.env.INTERNAL_API_KEY;
  if (key) {
    return key;
  }
  
  if (process.env.REPLIT_DEPLOYMENT) {
    console.warn('[InternalAuth] INTERNAL_API_KEY not set in production!');
  }
  
  return 'olympus-internal-key-dev';
}

/**
 * Validate an internal API key from request headers.
 * 
 * @param req - Express request object
 * @returns true if key is valid, false otherwise
 */
export function validateInternalKey(req: Request): boolean {
  const providedKey = req.headers[INTERNAL_KEY_HEADER];
  const expectedKey = getInternalApiKey();
  return providedKey === expectedKey;
}

/**
 * Express middleware for authenticating internal API requests.
 * 
 * Use this middleware on endpoints that should only be accessible
 * from the Python backend or other internal services.
 * 
 * Usage:
 *   router.post('/internal-endpoint', requireInternalAuth, handler);
 */
export function requireInternalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!validateInternalKey(req)) {
    const routeName = req.path;
    console.warn(`[InternalAuth] Rejected ${req.method} ${routeName} - invalid or missing X-Internal-Key`);
    res.status(403).json({ 
      error: 'Unauthorized - invalid internal key',
      code: 'INTERNAL_AUTH_FAILED'
    });
    return;
  }
  next();
}

/**
 * Get headers for making internal API calls to Python backend.
 * 
 * @param extraHeaders - Additional headers to merge
 * @returns Headers object with Content-Type and X-Internal-Key
 */
export function getInternalHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Key': getInternalApiKey()
  };
  
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  
  return headers;
}
