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
function getDatabaseUrl(): string | undefined {
  // First check environment variable (development)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Check /tmp/replitdb (deployed/published apps)
  try {
    const dbUrl = readFileSync('/tmp/replitdb', 'utf-8').trim();
    if (dbUrl) {
      console.log("[DB] Using DATABASE_URL from /tmp/replitdb (deployed app)");
      return dbUrl;
    }
  } catch (err) {
    // File doesn't exist - this is fine, we're probably in dev mode
  }
  
  return undefined;
}

const databaseUrl = getDatabaseUrl();

if (databaseUrl) {
  try {
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle({ client: pool, schema });
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
