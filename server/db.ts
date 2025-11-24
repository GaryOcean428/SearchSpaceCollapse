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
    } catch (err) {
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

if (databaseUrl) {
  try {
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle(pool, { schema });
    console.log("[DB] Database connection initialized");
  } catch (err) {
    console.error("[DB] Failed to initialize database connection:", err);
    console.log("[DB] Running without database - Replit Auth will be unavailable");
    pool = null;
    db = null;
  }
} else {
  console.log("[DB] No DATABASE_URL found - running without database (Replit Auth will be unavailable)");
}

export { pool, db };
