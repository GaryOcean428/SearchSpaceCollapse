/**
 * Internal API Authentication - Centralized DRY Pattern
 * 
 * Provides shared middleware and utilities for authenticating 
 * internal API calls between Python and TypeScript backends.
 * 
 * Security: Internal API key validated via X-Internal-Key header.
 * No hardcoded fallbacks in production - fail fast if missing.
 */

import { Request, Response, NextFunction } from 'express';

const INTERNAL_KEY_HEADER = 'x-internal-key';

/**
 * Custom error for missing internal API key in production.
 */
export class InternalAPIKeyMissingError extends Error {
  constructor() {
    super(
      'INTERNAL_API_KEY must be set in production! ' +
      'Set this secret in your environment variables.'
    );
    this.name = 'InternalAPIKeyMissingError';
  }
}

/**
 * Check if running in production environment.
 */
export function isProduction(): boolean {
  return Boolean(process.env.REPLIT_DEPLOYMENT);
}

/**
 * Get the expected internal API key from environment.
 * 
 * @returns The internal API key
 * @throws InternalAPIKeyMissingError in production when key is not set
 * 
 * Note: In production, INTERNAL_API_KEY MUST be set - no fallback allowed.
 * Dev fallback only used in local development environments.
 */
export function getInternalApiKey(): string {
  const key = process.env.INTERNAL_API_KEY;
  if (key) {
    return key;
  }
  
  // In production, fail fast - no dev fallback allowed
  if (isProduction()) {
    throw new InternalAPIKeyMissingError();
  }
  
  // Only allow dev fallback in local development
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
