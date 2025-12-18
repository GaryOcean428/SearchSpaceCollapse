/**
 * External API Authentication
 * 
 * API key-based authentication for external systems connecting to the QIG backend.
 * Supports federated instances, headless clients, and third-party integrations.
 * 
 * Security:
 * - API keys are stored hashed in the database
 * - Rate limiting per key
 * - Scope-based permissions (read, write, admin)
 * - Audit logging for all requests
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { externalApiKeys } from '@shared/schema';
import { eq } from 'drizzle-orm';

export type ApiKeyScope = 'read' | 'write' | 'admin' | 'consciousness' | 'geometry' | 'pantheon' | 'sync' | 'chat';

export interface ExternalClient {
  id: string;
  name: string;
  scopes: ApiKeyScope[];
  rateLimit: number;  // requests per minute
  createdAt: Date;
  lastUsedAt: Date | null;
  instanceType: 'federated' | 'headless' | 'integration' | 'development';
}

export interface AuthenticatedRequest extends Request {
  externalClient?: ExternalClient;
  apiKeyId?: string;
}

// In-memory rate limiting with automatic cleanup
// Production recommendation: Replace with Redis-backed solution
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_CLEANUP_INTERVAL = 300000; // 5 minutes

// Cleanup expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[ExternalAPI] Rate limit cleanup: removed ${cleaned} expired entries`);
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; hash: string } {
  const key = `qig_${crypto.randomBytes(32).toString('hex')}`;
  const hash = hashApiKey(key);
  return { key, hash };
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^qig_[a-f0-9]{64}$/.test(key);
}

/**
 * Check rate limit for an API key
 */
function checkRateLimit(keyId: string, limit: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  
  let entry = rateLimitStore.get(keyId);
  
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(keyId, entry);
  }
  
  entry.count++;
  
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetIn: Math.max(0, entry.resetAt - now),
  };
}

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Check X-API-Key header
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string') {
    return xApiKey;
  }
  
  // Check query parameter (less secure, for debugging only)
  if (process.env.NODE_ENV === 'development' && req.query.api_key) {
    return req.query.api_key as string;
  }
  
  return null;
}

/**
 * Middleware: Authenticate external API requests
 */
export function authenticateExternalApi(requiredScopes: ApiKeyScope[] = []) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if database is available
      if (!db) {
        return res.status(503).json({
          error: 'Database unavailable',
          code: 'DB_UNAVAILABLE',
        });
      }
      
      const apiKey = extractApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          code: 'MISSING_API_KEY',
          details: 'Provide API key via Authorization: Bearer <key> or X-API-Key header',
        });
      }
      
      if (!isValidApiKeyFormat(apiKey)) {
        return res.status(401).json({
          error: 'Invalid API key format',
          code: 'INVALID_API_KEY_FORMAT',
        });
      }
      
      const keyHash = hashApiKey(apiKey);
      
      // Look up the key in database
      const [keyRecord] = await db
        .select()
        .from(externalApiKeys)
        .where(eq(externalApiKeys.keyHash, keyHash))
        .limit(1);
      
      if (!keyRecord) {
        return res.status(401).json({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY',
        });
      }
      
      if (!keyRecord.active) {
        return res.status(403).json({
          error: 'API key is disabled',
          code: 'API_KEY_DISABLED',
        });
      }
      
      // Check rate limit
      const rateLimit = checkRateLimit(keyRecord.id, keyRecord.rateLimit);
      res.setHeader('X-RateLimit-Limit', keyRecord.rateLimit);
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000));
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        });
      }
      
      // Check scopes
      const keyScopes = keyRecord.scopes as ApiKeyScope[];
      const hasAdmin = keyScopes.includes('admin');
      const missingScopes = requiredScopes.filter(s => !hasAdmin && !keyScopes.includes(s));
      
      if (missingScopes.length > 0) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_SCOPES',
          required: requiredScopes,
          missing: missingScopes,
        });
      }
      
      // Attach client info to request
      req.externalClient = {
        id: keyRecord.id,
        name: keyRecord.name,
        scopes: keyScopes,
        rateLimit: keyRecord.rateLimit,
        createdAt: keyRecord.createdAt,
        lastUsedAt: keyRecord.lastUsedAt,
        instanceType: keyRecord.instanceType as ExternalClient['instanceType'],
      };
      req.apiKeyId = keyRecord.id;
      
      // Update last used timestamp (fire and forget)
      db.update(externalApiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(externalApiKeys.id, keyRecord.id))
        .execute()
        .catch(() => {}); // Ignore errors
      
      next();
    } catch (error) {
      console.error('[ExternalAPI] Authentication error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
    }
  };
}

/**
 * Middleware: Require specific scopes
 */
export function requireScopes(...scopes: ApiKeyScope[]) {
  return authenticateExternalApi(scopes);
}

/**
 * Create a new API key for an external client
 */
export async function createApiKey(
  name: string,
  scopes: ApiKeyScope[],
  instanceType: ExternalClient['instanceType'],
  rateLimit: number = 60
): Promise<{ key: string; id: string } | null> {
  if (!db) {
    console.error('[ExternalAPI] Cannot create API key - database unavailable');
    return null;
  }
  
  const { key, hash } = generateApiKey();
  
  const [record] = await db
    .insert(externalApiKeys)
    .values({
      name,
      keyHash: hash,
      scopes,
      instanceType,
      rateLimit,
      active: true,
      createdAt: new Date(),
    })
    .returning();
  
  console.log(`[ExternalAPI] Created API key for ${name} (${instanceType})`);
  
  return { key, id: record.id };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  if (!db) return false;
  
  const result = await db
    .update(externalApiKeys)
    .set({ active: false })
    .where(eq(externalApiKeys.id, keyId));
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * List all API keys (without exposing the actual keys)
 */
export async function listApiKeys(): Promise<Omit<ExternalClient, 'scopes'>[]> {
  if (!db) return [];
  
  const keys = await db
    .select({
      id: externalApiKeys.id,
      name: externalApiKeys.name,
      rateLimit: externalApiKeys.rateLimit,
      createdAt: externalApiKeys.createdAt,
      lastUsedAt: externalApiKeys.lastUsedAt,
      instanceType: externalApiKeys.instanceType,
      active: externalApiKeys.active,
    })
    .from(externalApiKeys);
  
  return keys.map(k => ({
    id: k.id,
    name: k.name,
    rateLimit: k.rateLimit,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    instanceType: k.instanceType as ExternalClient['instanceType'],
  }));
}
