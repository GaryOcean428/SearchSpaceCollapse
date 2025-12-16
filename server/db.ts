import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { readFileSync } from 'fs';

// Detect deployment mode early for Neon configuration
const isDeployedEnv = process.env.REPLIT_DEPLOYMENT === '1' || !process.env.DATABASE_URL;

// In production/deployment, use HTTP fetch exclusively to avoid WebSocket issues
// The Neon ErrorEvent has a read-only 'message' property that causes errors with ws
if (isDeployedEnv) {
  // Use HTTP fetch for all queries - avoids WebSocket entirely
  neonConfig.fetchConnectionCache = true;
  neonConfig.poolQueryViaFetch = true;
  // Don't set webSocketConstructor - forces HTTP mode
} else {
  // Development mode - use WebSocket for real-time features
  neonConfig.webSocketConstructor = ws;
  neonConfig.poolQueryViaFetch = true;
}

// ============================================================================
// CONNECTION SEMAPHORE - Prevents pool exhaustion
// ============================================================================
// Neon serverless has connection limits. This semaphore ensures we don't
// queue more operations than the pool can handle, preventing the
// "terminating connection due to administrator command" errors.

class ConnectionSemaphore {
  private currentCount = 0;
  private readonly maxConcurrent: number;
  private readonly queue: Array<() => void> = [];
  private readonly name: string;
  
  constructor(maxConcurrent: number, name: string = 'DB') {
    this.maxConcurrent = maxConcurrent;
    this.name = name;
  }
  
  async acquire(): Promise<void> {
    if (this.currentCount < this.maxConcurrent) {
      this.currentCount++;
      return;
    }
    
    // Queue and wait
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.currentCount++;
        resolve();
      });
    });
  }
  
  release(): void {
    this.currentCount--;
    if (this.queue.length > 0 && this.currentCount < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
  
  get stats() {
    return {
      active: this.currentCount,
      waiting: this.queue.length,
      max: this.maxConcurrent
    };
  }
}

// Global semaphore: limit to 20 concurrent operations (leaving headroom for pool's 30)
const dbSemaphore = new ConnectionSemaphore(20, 'DB');

// Export for monitoring
export function getDbSemaphoreStats() {
  return dbSemaphore.stats;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

// Database initialization is required for persistence-backed services.
// The code will still skip initialization if DATABASE_URL is absent, but
// higher-level storage layers now fail fast without a database to avoid
// falling back to JSON or in-memory paths.
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Get DATABASE_URL from environment or /tmp/replitdb (for deployed apps)
// Automatically converts to pooler URL for deployed apps
function getDatabaseUrl(): string | undefined {
  let dbUrl: string | undefined;
  let isDeployedApp = false;
  
  // First check environment variable (development)
  if (process.env.DATABASE_URL) {
    dbUrl = process.env.DATABASE_URL;
  } else {
    // Check /tmp/replitdb (deployed/published apps)
    try {
      const urlFromFile = readFileSync('/tmp/replitdb', 'utf-8').trim();
      if (urlFromFile) {
        console.log("[DB] Using DATABASE_URL from /tmp/replitdb (deployed app)");
        dbUrl = urlFromFile;
        isDeployedApp = true;
      }
    } catch {
      // File doesn't exist - this is fine, we're probably in dev mode
    }
  }
  
  if (!dbUrl) {
    return undefined;
  }
  
  // For deployed apps using Neon, convert to pooler URL to avoid DNS issues
  // Replace .us-east-2 (or other regions) with -pooler.us-east-2
  if (isDeployedApp && dbUrl.includes('.neon.tech')) {
    const poolerUrl = dbUrl.replace(/\.([a-z0-9-]+)\.neon\.tech/, '-pooler.$1.neon.tech');
    if (poolerUrl !== dbUrl) {
      console.log("[DB] Converted to pooler URL for deployed app");
      return poolerUrl;
    }
  }
  
  return dbUrl;
}

const databaseUrl = getDatabaseUrl();

// Detect if we're in production/deployment
const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';

if (databaseUrl) {
  try {
    // Both dev and production need longer timeouts for Neon serverless cold starts
    // Neon can take 5-10s to wake from cold, so use 15s minimum
    const connectionTimeout = isDeployment ? 20000 : 15000;
    
    pool = new Pool({ 
      connectionString: databaseUrl,
      max: 30, // Neon serverless limits ~50 connections - keep pool conservative
      idleTimeoutMillis: 30000, // 30s - matches Neon serverless compute timeout
      connectionTimeoutMillis: connectionTimeout,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000 // 5s keepalive to maintain warm connections
    });
    db = drizzle(pool, { schema });
    console.log(`[DB] Database connection pool initialized (max: 30, idle: 30s, timeout: ${connectionTimeout}ms)`);
    
    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err);
    });

    pool.on('connect', () => {
      console.log('[DB] New connection acquired');
    });
    
    // Warm up connection pool on startup to prevent first-query timeouts
    pool.query('SELECT 1').catch(() => {
      console.log('[DB] Initial connection warmup pending - Neon cold start expected');
    });
    
    // Log pool health periodically (every 5 minutes)
    setInterval(() => {
      if (pool) {
        const semStats = dbSemaphore.stats;
        console.log(`[DB] Pool health: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount} | Semaphore: active=${semStats.active}/${semStats.max}, queued=${semStats.waiting}`);
      }
    }, 300000);
  } catch (err) {
    console.error("[DB] Failed to initialize database connection:", err);
    console.log("[DB] Running without database - Replit Auth will be unavailable");
    pool = null;
    db = null;
  }
} else {
  console.log("[DB] No DATABASE_URL found - running without database (Replit Auth will be unavailable)");
}

/**
 * Execute a database operation with semaphore protection
 * Prevents pool exhaustion by limiting concurrent operations
 */
export async function withDbSemaphore<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  await dbSemaphore.acquire();
  try {
    return await operation();
  } finally {
    dbSemaphore.release();
  }
}

/**
 * Helper function to execute database operations with retry logic AND semaphore protection
 * Useful for handling transient connection issues in serverless environments
 * Returns operation result on success, or null on failure with proper logging
 * 
 * Default: 7 retries with exponential backoff (500ms → 1s → 2s → 4s → 5s → 5s → 5s)
 * Total max wait: ~22.5s before final attempt, within 30s timeout goal
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 7
): Promise<T | null> {
  if (!db) return null;
  
  // Acquire semaphore before attempting any database operation
  await dbSemaphore.acquire();
  
  let lastError: Error | null = null;
  let delay = 500; // Start with 500ms
  let attempts = 0;
  
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts++;
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Detect retryable errors - covers Neon serverless transient failures
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code || '';
        
        const isRetryable = 
          // Timeout errors
          errorMessage.includes('timeout') || 
          errorCode === 'ETIMEDOUT' ||
          // Connection errors  
          errorMessage.includes('connect') || 
          errorCode === 'ECONNREFUSED' ||
          errorCode === 'ECONNRESET' ||
          // Neon/PostgreSQL transient errors
          errorCode === '57P01' ||  // admin_shutdown
          errorCode === '57P02' ||  // crash_shutdown  
          errorCode === '57P03' ||  // cannot_connect_now
          errorCode === '53300' ||  // too_many_connections
          errorCode === '08006' ||  // connection_failure
          errorCode === '08003' ||  // connection_does_not_exist
          // Server closed connection unexpectedly
          errorMessage.includes('server closed') ||
          errorMessage.includes('connection unexpectedly') ||
          errorMessage.includes('terminating connection') ||
          // AbortError from fetch timeouts
          error.name === 'AbortError';
        
        if (attempt < maxRetries && isRetryable) {
          console.log(`[DB] ${operationName} retry ${attempt}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 5000); // Exponential backoff, cap at 5s
        } else {
          // Log with full error for debugging
          const errorType = isRetryable ? 'exhausted retries' : 'non-retryable';
          console.error(`[DB] ${operationName} failed (${errorType}, ${attempts} attempts):`, error);
          break;
        }
      }
    }
    
    return null;
  } finally {
    // Always release semaphore
    dbSemaphore.release();
  }
}

export { pool, db };
