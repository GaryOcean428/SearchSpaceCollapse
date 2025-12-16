/**
 * SHADOW OPERATIONS SERVICE
 * Unified interface for all shadow-related database operations
 * 
 * Consolidates access to three shadow tables:
 * - shadowOperationsLog: Primary audit table for all shadow operations
 * - shadowIntel: Geometric assessments from shadow gods
 * - shadowPantheonIntel: Underworld search results and intelligence
 */

import { db, withDbRetry } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  shadowOperationsLog,
  shadowIntel,
  shadowPantheonIntel,
  type ShadowOperationsLogRow,
  type InsertShadowOperationsLog,
  type ShadowIntel,
  type InsertShadowIntel,
  type ShadowPantheonIntel,
  type InsertShadowPantheonIntel,
} from "@shared/schema";
import crypto from "crypto";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  ShadowOperationsLogRow,
  InsertShadowOperationsLog,
  ShadowIntel,
  InsertShadowIntel,
  ShadowPantheonIntel,
  InsertShadowPantheonIntel,
};

export type ShadowOpRiskLevel = "low" | "medium" | "high" | "critical";
export type ShadowOpStatus = "pending" | "completed" | "failed" | "aborted";
export type ShadowConsensus = "proceed" | "caution" | "abort";

export interface RecordShadowOpParams {
  godName: string;
  operationType: string;
  target?: string;
  riskLevel?: ShadowOpRiskLevel;
  data?: Record<string, unknown>;
  networkMode?: "clear" | "tor" | "mixed";
  opsecLevel?: string;
  status?: ShadowOpStatus;
}

export interface RecordIntelParams {
  target: string;
  assessmentType: string;
  consensus: ShadowConsensus;
  phi?: number;
  intel?: Record<string, unknown>;
  kappa?: number;
  regime?: string;
  basinCoords?: number[];
  warnings?: string[];
  overrideZeus?: boolean;
  expiresAt?: Date;
}

export interface RecordPantheonIntelParams {
  target: string;
  source: string;
  riskLevel: ShadowOpRiskLevel;
  intelData: Record<string, unknown>;
  searchType?: string;
  sourcesUsed?: string[];
  validated?: boolean;
  validationReason?: string;
  anonymous?: boolean;
}

// ============================================================================
// SHADOW OPERATIONS LOG - Primary Audit Table
// ============================================================================

/**
 * Record any shadow operation in the audit log
 * This is the primary function for logging all shadow activity
 */
export async function recordShadowOp(params: RecordShadowOpParams): Promise<ShadowOperationsLogRow | null> {
  const { godName, operationType, target, riskLevel, data, networkMode, opsecLevel, status } = params;
  
  return withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    const [row] = await db
      .insert(shadowOperationsLog)
      .values({
        godName,
        operationType,
        target,
        networkMode: networkMode ?? "clear",
        opsecLevel: opsecLevel ?? riskLevel,
        status: status ?? "completed",
        result: data ?? {},
      })
      .returning();
    
    return row;
  }, "recordShadowOp");
}

/**
 * Query shadow operations with optional filters
 */
export async function getShadowOps(
  godName?: string,
  operationType?: string,
  limit: number = 100
): Promise<ShadowOperationsLogRow[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    const conditions = [];
    if (godName) {
      conditions.push(eq(shadowOperationsLog.godName, godName));
    }
    if (operationType) {
      conditions.push(eq(shadowOperationsLog.operationType, operationType));
    }
    
    if (conditions.length > 0) {
      return db
        .select()
        .from(shadowOperationsLog)
        .where(and(...conditions))
        .orderBy(desc(shadowOperationsLog.createdAt))
        .limit(limit);
    }
    
    return db
      .select()
      .from(shadowOperationsLog)
      .orderBy(desc(shadowOperationsLog.createdAt))
      .limit(limit);
  }, "getShadowOps");
  
  return result ?? [];
}

/**
 * Get recent shadow operations for a specific god
 */
export async function getRecentOpsForGod(
  godName: string,
  hours: number = 24
): Promise<ShadowOperationsLogRow[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return db
      .select()
      .from(shadowOperationsLog)
      .where(
        and(
          eq(shadowOperationsLog.godName, godName),
          sql`${shadowOperationsLog.createdAt} >= ${cutoff}`
        )
      )
      .orderBy(desc(shadowOperationsLog.createdAt));
  }, "getRecentOpsForGod");
  
  return result ?? [];
}

// ============================================================================
// SHADOW INTEL - Geometric Assessments from Shadow Gods
// ============================================================================

/**
 * Generate a deterministic intel ID from target and timestamp
 */
function generateIntelId(target: string): string {
  const timestamp = Date.now().toString(36);
  const hash = crypto.createHash("sha256").update(target + timestamp).digest("hex").slice(0, 16);
  return `intel_${hash}_${timestamp}`;
}

/**
 * Record intel from shadow gods (geometric assessments)
 */
export async function recordIntel(params: RecordIntelParams): Promise<ShadowIntel | null> {
  const {
    target,
    assessmentType,
    consensus,
    phi,
    intel,
    kappa,
    regime,
    basinCoords,
    warnings,
    overrideZeus,
    expiresAt,
  } = params;
  
  const intelId = generateIntelId(target);
  const targetHash = crypto.createHash("sha256").update(target).digest("hex").slice(0, 64);
  
  return withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    const [row] = await db
      .insert(shadowIntel)
      .values({
        intelId,
        target,
        targetHash,
        consensus,
        phi,
        kappa,
        regime,
        basinCoords: basinCoords ?? null,
        assessments: { type: assessmentType, data: intel ?? {} },
        warnings: warnings ?? [],
        overrideZeus: overrideZeus ?? false,
        expiresAt,
      })
      .returning();
    
    // Also log to shadow operations for audit trail
    await db.insert(shadowOperationsLog).values({
      godName: "shadow_intel",
      operationType: "record_intel",
      target,
      status: "completed",
      result: { intelId, assessmentType, consensus, phi },
    });
    
    return row;
  }, "recordIntel");
}

/**
 * Query intel with optional target filter
 */
export async function getIntel(target?: string, limit: number = 100): Promise<ShadowIntel[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    if (target) {
      return db
        .select()
        .from(shadowIntel)
        .where(eq(shadowIntel.target, target))
        .orderBy(desc(shadowIntel.createdAt))
        .limit(limit);
    }
    
    return db
      .select()
      .from(shadowIntel)
      .orderBy(desc(shadowIntel.createdAt))
      .limit(limit);
  }, "getIntel");
  
  return result ?? [];
}

/**
 * Get intel by consensus type
 */
export async function getIntelByConsensus(
  consensus: ShadowConsensus,
  limit: number = 50
): Promise<ShadowIntel[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    return db
      .select()
      .from(shadowIntel)
      .where(eq(shadowIntel.consensus, consensus))
      .orderBy(desc(shadowIntel.createdAt))
      .limit(limit);
  }, "getIntelByConsensus");
  
  return result ?? [];
}

/**
 * Get high-phi intel above a threshold
 */
export async function getHighPhiIntel(
  minPhi: number = 0.7,
  limit: number = 50
): Promise<ShadowIntel[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    return db
      .select()
      .from(shadowIntel)
      .where(sql`${shadowIntel.phi} >= ${minPhi}`)
      .orderBy(desc(shadowIntel.phi))
      .limit(limit);
  }, "getHighPhiIntel");
  
  return result ?? [];
}

// ============================================================================
// SHADOW PANTHEON INTEL - Underworld Search Results
// ============================================================================

/**
 * Record pantheon-specific intel (underworld search results)
 */
export async function recordPantheonIntel(params: RecordPantheonIntelParams): Promise<ShadowPantheonIntel | null> {
  const {
    target,
    source,
    riskLevel,
    intelData,
    searchType,
    sourcesUsed,
    validated,
    validationReason,
    anonymous,
  } = params;
  
  return withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    const [row] = await db
      .insert(shadowPantheonIntel)
      .values({
        target,
        searchType: searchType ?? "comprehensive",
        intelligence: intelData,
        sourceCount: sourcesUsed?.length ?? 1,
        sourcesUsed: sourcesUsed ?? [source],
        riskLevel,
        validated: validated ?? false,
        validationReason,
        anonymous: anonymous ?? true,
      })
      .returning();
    
    // Also log to shadow operations for audit trail
    await db.insert(shadowOperationsLog).values({
      godName: source,
      operationType: "pantheon_intel",
      target,
      status: "completed",
      opsecLevel: riskLevel,
      result: { id: row.id, riskLevel, sourceCount: row.sourceCount },
    });
    
    return row;
  }, "recordPantheonIntel");
}

/**
 * Get pantheon intel with optional target filter
 */
export async function getPantheonIntel(
  target?: string,
  limit: number = 100
): Promise<ShadowPantheonIntel[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    if (target) {
      return db
        .select()
        .from(shadowPantheonIntel)
        .where(eq(shadowPantheonIntel.target, target))
        .orderBy(desc(shadowPantheonIntel.createdAt))
        .limit(limit);
    }
    
    return db
      .select()
      .from(shadowPantheonIntel)
      .orderBy(desc(shadowPantheonIntel.createdAt))
      .limit(limit);
  }, "getPantheonIntel");
  
  return result ?? [];
}

/**
 * Get pantheon intel by risk level
 */
export async function getPantheonIntelByRisk(
  riskLevel: ShadowOpRiskLevel,
  limit: number = 50
): Promise<ShadowPantheonIntel[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    return db
      .select()
      .from(shadowPantheonIntel)
      .where(eq(shadowPantheonIntel.riskLevel, riskLevel))
      .orderBy(desc(shadowPantheonIntel.createdAt))
      .limit(limit);
  }, "getPantheonIntelByRisk");
  
  return result ?? [];
}

/**
 * Get validated pantheon intel only
 */
export async function getValidatedPantheonIntel(limit: number = 50): Promise<ShadowPantheonIntel[]> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    return db
      .select()
      .from(shadowPantheonIntel)
      .where(eq(shadowPantheonIntel.validated, true))
      .orderBy(desc(shadowPantheonIntel.createdAt))
      .limit(limit);
  }, "getValidatedPantheonIntel");
  
  return result ?? [];
}

// ============================================================================
// UNIFIED OPERATIONS - Cross-table queries and aggregations
// ============================================================================

/**
 * Get comprehensive shadow activity for a target
 * Returns data from all three shadow tables
 */
export async function getTargetShadowProfile(target: string): Promise<{
  ops: ShadowOperationsLogRow[];
  intel: ShadowIntel[];
  pantheonIntel: ShadowPantheonIntel[];
}> {
  const [ops, intel, pantheonIntel] = await Promise.all([
    getShadowOps(undefined, undefined, 50).then(all => 
      all.filter(op => op.target === target)
    ),
    getIntel(target, 50),
    getPantheonIntel(target, 50),
  ]);
  
  return { ops, intel, pantheonIntel };
}

/**
 * Get shadow operation statistics
 */
export async function getShadowStats(): Promise<{
  totalOps: number;
  totalIntel: number;
  totalPantheonIntel: number;
  recentOps: number;
  highRiskIntel: number;
}> {
  const result = await withDbRetry(async () => {
    if (!db) throw new Error("Database not available");
    
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [opsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shadowOperationsLog);
    
    const [intelCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shadowIntel);
    
    const [pantheonCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shadowPantheonIntel);
    
    const [recentOps] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shadowOperationsLog)
      .where(sql`${shadowOperationsLog.createdAt} >= ${cutoff}`);
    
    const [highRisk] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shadowPantheonIntel)
      .where(eq(shadowPantheonIntel.riskLevel, "high"));
    
    return {
      totalOps: opsCount?.count ?? 0,
      totalIntel: intelCount?.count ?? 0,
      totalPantheonIntel: pantheonCount?.count ?? 0,
      recentOps: recentOps?.count ?? 0,
      highRiskIntel: highRisk?.count ?? 0,
    };
  }, "getShadowStats");
  
  return result ?? {
    totalOps: 0,
    totalIntel: 0,
    totalPantheonIntel: 0,
    recentOps: 0,
    highRiskIntel: 0,
  };
}
