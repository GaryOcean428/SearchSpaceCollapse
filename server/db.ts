import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { readFileSync } from 'fs';

neonConfig.webSocketConstructor = ws;

// Database is optional - only initialize if DATABASE_URL is set
// This allows the brain wallet tool to run without database (using MemStorage)
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
    // Production needs longer timeouts for serverless Neon cold starts
    // Development can use shorter timeouts for faster feedback
    const connectionTimeout = isDeployment ? 15000 : 5000;
    
    pool = new Pool({ 
      connectionString: databaseUrl,
      max: 20, // Increased from 10 for better concurrency during high-throughput
      idleTimeoutMillis: 60000, // Increased from 30s - keep connections warmer
      connectionTimeoutMillis: connectionTimeout, // Longer timeout for production
    });
    db = drizzle(pool, { schema });
    console.log(`[DB] Database connection pool initialized (max: 20, idle: 60s, timeout: ${connectionTimeout}ms)`);
    
    // Log pool health periodically (every 5 minutes)
    setInterval(() => {
      if (pool) {
        console.log(`[DB] Pool health: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
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
 * Helper function to execute database operations with retry logic
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
  
  let lastError: Error | null = null;
  let delay = 500; // Start with 500ms
  let attempts = 0;
  
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
}

export { pool, db };
