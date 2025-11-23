import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Database is optional - only initialize if DATABASE_URL is set
// This allows the brain wallet tool to run without database (using MemStorage)
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log("[DB] Database connection initialized");
} else {
  console.log("[DB] No DATABASE_URL found - running without database (Replit Auth will be unavailable)");
}

export { pool, db };
