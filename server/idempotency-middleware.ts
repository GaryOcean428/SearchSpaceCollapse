/**
 * Idempotency Middleware
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * Prevents duplicate request processing using idempotency keys.
 * Stores request results in memory/cache for replay on duplicate requests.
 */

import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

interface IdempotencyStore {
  get(key: string): Promise<StoredResponse | null>;
  set(key: string, value: StoredResponse, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface StoredResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

/**
 * In-memory idempotency store (for development)
 * In production, use Redis or similar distributed cache
 */
class MemoryIdempotencyStore implements IdempotencyStore {
  private store: Map<string, { value: StoredResponse; expiresAt: number }>;
  
  constructor() {
    this.store = new Map();
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  async get(key: string): Promise<StoredResponse | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: StoredResponse, ttl: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
  
  getSize(): number {
    return this.store.size;
  }
}

// Singleton instance
const defaultStore = new MemoryIdempotencyStore();

export interface IdempotencyOptions {
  /**
   * Header name for idempotency key
   * Default: 'Idempotency-Key'
   */
  headerName?: string;
  
  /**
   * TTL for stored responses (seconds)
   * Default: 86400 (24 hours)
   */
  ttl?: number;
  
  /**
   * Store implementation
   * Default: MemoryIdempotencyStore
   */
  store?: IdempotencyStore;
  
  /**
   * Methods to apply idempotency to
   * Default: ['POST', 'PUT', 'PATCH']
   */
  methods?: string[];
  
  /**
   * Generate idempotency key from request if not provided
   * Default: hash of method + url + body
   */
  keyGenerator?: (req: Request) => string;
}

/**
 * Generate default idempotency key from request
 */
function generateKey(req: Request): string {
  const data = JSON.stringify({
    method: req.method,
    url: req.url,
    body: req.body,
  });
  
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Idempotency middleware factory
 */
export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const {
    headerName = 'Idempotency-Key',
    ttl = 86400, // 24 hours
    store = defaultStore,
    methods = ['POST', 'PUT', 'PATCH'],
    keyGenerator = generateKey,
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to specified methods
    if (!methods.includes(req.method)) {
      return next();
    }
    
    // Get idempotency key from header or generate one
    let idempotencyKey = req.headers[headerName.toLowerCase()] as string;
    
    if (!idempotencyKey) {
      // Auto-generate key if not provided
      idempotencyKey = keyGenerator(req);
      console.debug(`[Idempotency] Generated key: ${idempotencyKey.substring(0, 8)}...`);
    } else {
      console.debug(`[Idempotency] Using provided key: ${idempotencyKey.substring(0, 8)}...`);
    }
    
    // Check if we've seen this request before
    const stored = await store.get(idempotencyKey);
    
    if (stored) {
      // Replay stored response
      console.log(`[Idempotency] Replaying response for key: ${idempotencyKey.substring(0, 8)}...`, {
        originalTimestamp: new Date(stored.timestamp).toISOString(),
        age: Date.now() - stored.timestamp,
      });
      
      // Set stored headers
      Object.entries(stored.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Add idempotency header
      res.setHeader('X-Idempotency-Replay', 'true');
      res.setHeader('X-Original-Timestamp', new Date(stored.timestamp).toISOString());
      
      return res.status(stored.statusCode).json(stored.body);
    }
    
    // First time seeing this request - intercept response
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let responseBody: any;
    let responseSent = false;
    
    // Intercept json()
    res.json = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
        
        // Store response asynchronously (don't wait)
        const storedResponse: StoredResponse = {
          statusCode: res.statusCode,
          headers: {},
          body: body,
          timestamp: Date.now(),
        };
        
        // Capture important headers
        const headersToStore = ['content-type', 'x-trace-id'];
        headersToStore.forEach(headerName => {
          const value = res.getHeader(headerName);
          if (value) {
            storedResponse.headers[headerName] = String(value);
          }
        });
        
        store.set(idempotencyKey, storedResponse, ttl).catch(err => {
          console.error(`[Idempotency] Failed to store response: ${err}`);
        });
        
        res.setHeader('X-Idempotency-Key', idempotencyKey);
      }
      
      return originalJson(body);
    };
    
    // Intercept send()
    res.send = function(body: any) {
      if (!responseSent && body) {
        responseSent = true;
        
        try {
          responseBody = typeof body === 'string' ? JSON.parse(body) : body;
          
          const storedResponse: StoredResponse = {
            statusCode: res.statusCode,
            headers: {},
            body: responseBody,
            timestamp: Date.now(),
          };
          
          store.set(idempotencyKey, storedResponse, ttl).catch(err => {
            console.error(`[Idempotency] Failed to store response: ${err}`);
          });
          
          res.setHeader('X-Idempotency-Key', idempotencyKey);
        } catch (err) {
          console.error(`[Idempotency] Failed to parse response body: ${err}`);
        }
      }
      
      return originalSend(body);
    };
    
    next();
  };
}

/**
 * Export store for testing/inspection
 */
export function getIdempotencyStore(): MemoryIdempotencyStore {
  return defaultStore as MemoryIdempotencyStore;
}

/**
 * Clear all idempotency keys (for testing)
 */
export async function clearIdempotencyStore(): Promise<void> {
  const store = getIdempotencyStore();
  // Access private store through type assertion
  (store as any).store.clear();
}
