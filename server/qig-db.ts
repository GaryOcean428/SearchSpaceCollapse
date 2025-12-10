/**
 * QIG Database Access Layer
 *
 * Drizzle ORM queries for QIG vector tables:
 * - Shadow Intel
 * - Basin History
 * - Learning Events
 * - Hermes Conversations
 * - Narrow Path Events
 * - Autonomic Cycle History
 */

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  autonomicCycleHistory,
  basinHistory,
  hermesConversations,
  kernelGeometry,
  learningEvents,
  narrowPathEvents,
  shadowIntel,
  type AutonomicCycleHistory,
  type BasinHistory,
  type HermesConversation,
  type InsertAutonomicCycleHistory,
  type InsertKernelGeometry,
  type InsertLearningEvent,
  type InsertNarrowPathEvent,
  type InsertShadowIntel,
  type KernelGeometryRecord,
  type LearningEvent,
  type NarrowPathEvent,
  type ShadowIntel,
} from "../shared/schema";

// ============================================================================
// SHADOW INTEL
// ============================================================================

export async function storeShadowIntel(
  data: Omit<InsertShadowIntel, "intelId" | "createdAt">
): Promise<ShadowIntel | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(shadowIntel)
      .values({
        ...data,
        intelId: `intel_${Date.now()}`,
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to store shadow intel:", error);
    return null;
  }
}

export async function getShadowIntel(
  target?: string,
  limit: number = 20
): Promise<ShadowIntel[]> {
  try {
    if (!db) return [];
    if (target) {
      return await db
        .select()
        .from(shadowIntel)
        .where(sql`${shadowIntel.target} ILIKE ${"%" + target + "%"}`)
        .orderBy(desc(shadowIntel.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(shadowIntel)
      .orderBy(desc(shadowIntel.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get shadow intel:", error);
    return [];
  }
}

export async function getShadowWarnings(
  limit: number = 10
): Promise<ShadowIntel[]> {
  try {
    if (!db) return [];
    return await db
      .select()
      .from(shadowIntel)
      .where(eq(shadowIntel.consensus, "caution"))
      .orderBy(desc(shadowIntel.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get shadow warnings:", error);
    return [];
  }
}

// ============================================================================
// BASIN HISTORY
// ============================================================================

export async function recordBasin(
  basinCoords: number[],
  phi: number,
  kappa: number,
  source: string = "typescript",
  instanceId?: string
): Promise<BasinHistory | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(basinHistory)
      .values({
        historyId: Date.now(),
        basinCoords,
        phi,
        kappa,
        source,
        instanceId,
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to record basin:", error);
    return null;
  }
}

export async function getBasinHistory(
  limit: number = 100,
  minPhi: number = 0.0
): Promise<BasinHistory[]> {
  try {
    if (!db) return [];
    return await db
      .select()
      .from(basinHistory)
      .where(gte(basinHistory.phi, minPhi))
      .orderBy(desc(basinHistory.recordedAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get basin history:", error);
    return [];
  }
}

export async function findSimilarBasins(
  queryBasin: number[],
  limit: number = 10,
  minPhi: number = 0.3
): Promise<Array<BasinHistory & { similarity: number }>> {
  try {
    if (!db) return [];
    // Use pgvector cosine similarity operator
    const vectorStr = `[${queryBasin.join(",")}]`;
    const results = await db.execute(sql`
      SELECT
        *,
        1 - (basin_coords <=> ${vectorStr}::vector) as similarity
      FROM basin_history
      WHERE phi >= ${minPhi}
      ORDER BY basin_coords <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);
    return results.rows as Array<BasinHistory & { similarity: number }>;
  } catch (error) {
    console.error("[QIG-DB] Failed to find similar basins:", error);
    return [];
  }
}

// ============================================================================
// LEARNING EVENTS
// ============================================================================

export async function recordLearningEvent(
  data: Omit<InsertLearningEvent, "eventId" | "createdAt">
): Promise<LearningEvent | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(learningEvents)
      .values({
        ...data,
        eventId: `learn_${Date.now()}`,
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to record learning event:", error);
    return null;
  }
}

export async function getLearningEvents(
  eventType?: string,
  minPhi: number = 0.0,
  limit: number = 50
): Promise<LearningEvent[]> {
  try {
    if (!db) return [];
    if (eventType) {
      return await db
        .select()
        .from(learningEvents)
        .where(
          and(
            eq(learningEvents.eventType, eventType),
            gte(learningEvents.phi, minPhi)
          )
        )
        .orderBy(desc(learningEvents.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(learningEvents)
      .where(gte(learningEvents.phi, minPhi))
      .orderBy(desc(learningEvents.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get learning events:", error);
    return [];
  }
}

export async function getHighPhiEvents(
  minPhi: number = 0.7,
  limit: number = 100
): Promise<LearningEvent[]> {
  try {
    if (!db) return [];
    return await db
      .select()
      .from(learningEvents)
      .where(gte(learningEvents.phi, minPhi))
      .orderBy(desc(learningEvents.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get high phi events:", error);
    return [];
  }
}

// ============================================================================
// HERMES CONVERSATIONS
// ============================================================================

export async function storeConversation(
  userMessage: string,
  systemResponse: string,
  messageBasin?: number[],
  responseBasin?: number[],
  phi?: number,
  context?: Record<string, unknown>,
  instanceId?: string
): Promise<HermesConversation | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(hermesConversations)
      .values({
        conversationId: `conv_${Date.now()}`,
        userMessage,
        systemResponse,
        messageBasin,
        responseBasin,
        phi,
        context,
        instanceId,
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to store conversation:", error);
    return null;
  }
}

export async function findSimilarConversations(
  queryBasin: number[],
  limit: number = 5,
  minPhi: number = 0.3
): Promise<Array<HermesConversation & { similarity: number }>> {
  try {
    if (!db) return [];
    const vectorStr = `[${queryBasin.join(",")}]`;
    const results = await db.execute(sql`
      SELECT
        *,
        1 - (message_basin <=> ${vectorStr}::vector) as similarity
      FROM hermes_conversations
      WHERE phi >= ${minPhi}
        AND message_basin IS NOT NULL
      ORDER BY message_basin <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);
    return results.rows as Array<HermesConversation & { similarity: number }>;
  } catch (error) {
    console.error("[QIG-DB] Failed to find similar conversations:", error);
    return [];
  }
}

export async function getRecentConversations(
  limit: number = 20
): Promise<HermesConversation[]> {
  try {
    if (!db) return [];
    return await db
      .select()
      .from(hermesConversations)
      .orderBy(desc(hermesConversations.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get recent conversations:", error);
    return [];
  }
}

// ============================================================================
// NARROW PATH EVENTS
// ============================================================================

export async function recordNarrowPathEvent(
  data: Omit<InsertNarrowPathEvent, "eventId" | "detectedAt">
): Promise<NarrowPathEvent | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(narrowPathEvents)
      .values({
        ...data,
        eventId: Date.now(),
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to record narrow path event:", error);
    return null;
  }
}

export async function resolveNarrowPathEvent(
  eventId: number
): Promise<boolean> {
  try {
    if (!db) return false;
    await db
      .update(narrowPathEvents)
      .set({ resolvedAt: new Date() })
      .where(eq(narrowPathEvents.eventId, eventId));
    return true;
  } catch (error) {
    console.error("[QIG-DB] Failed to resolve narrow path event:", error);
    return false;
  }
}

export async function getNarrowPathEvents(
  severity?: string,
  limit: number = 50
): Promise<NarrowPathEvent[]> {
  try {
    if (!db) return [];
    if (severity) {
      return await db
        .select()
        .from(narrowPathEvents)
        .where(eq(narrowPathEvents.severity, severity))
        .orderBy(desc(narrowPathEvents.detectedAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(narrowPathEvents)
      .orderBy(desc(narrowPathEvents.detectedAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get narrow path events:", error);
    return [];
  }
}

// ============================================================================
// AUTONOMIC CYCLE HISTORY
// ============================================================================

export async function recordAutonomicCycle(
  data: Omit<InsertAutonomicCycleHistory, "cycleId" | "startedAt">
): Promise<AutonomicCycleHistory | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(autonomicCycleHistory)
      .values({
        ...data,
        cycleId: Date.now(),
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to record autonomic cycle:", error);
    return null;
  }
}

export async function getAutonomicHistory(
  cycleType?: string,
  limit: number = 50
): Promise<AutonomicCycleHistory[]> {
  try {
    if (!db) return [];
    if (cycleType) {
      return await db
        .select()
        .from(autonomicCycleHistory)
        .where(eq(autonomicCycleHistory.cycleType, cycleType))
        .orderBy(desc(autonomicCycleHistory.startedAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(autonomicCycleHistory)
      .orderBy(desc(autonomicCycleHistory.startedAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get autonomic history:", error);
    return [];
  }
}

export async function getCycleStats(): Promise<{
  sleepCount: number;
  dreamCount: number;
  mushroomCount: number;
  avgPhiImprovement: number;
}> {
  try {
    if (!db) return {
      sleepCount: 0,
      dreamCount: 0,
      mushroomCount: 0,
      avgPhiImprovement: 0,
    };
    const results = await db.execute(sql`
      SELECT
        COUNT(CASE WHEN cycle_type = 'sleep' THEN 1 END) as sleep_count,
        COUNT(CASE WHEN cycle_type = 'dream' THEN 1 END) as dream_count,
        COUNT(CASE WHEN cycle_type = 'mushroom' THEN 1 END) as mushroom_count,
        AVG(phi_after - phi_before) as avg_phi_improvement
      FROM autonomic_cycle_history
      WHERE started_at > NOW() - INTERVAL '24 hours'
    `);
    const row = results.rows[0] as Record<string, number>;
    return {
      sleepCount: row.sleep_count || 0,
      dreamCount: row.dream_count || 0,
      mushroomCount: row.mushroom_count || 0,
      avgPhiImprovement: row.avg_phi_improvement || 0,
    };
  } catch (error) {
    console.error("[QIG-DB] Failed to get cycle stats:", error);
    return {
      sleepCount: 0,
      dreamCount: 0,
      mushroomCount: 0,
      avgPhiImprovement: 0,
    };
  }
}

// ============================================================================
// ANALYTICS & UTILITIES
// ============================================================================

export async function getPhiTrend(hours: number = 24): Promise<
  Array<{
    hour: Date;
    avgPhi: number;
    avgKappa: number;
    samples: number;
  }>
> {
  try {
    if (!db) return [];
    const results = await db.execute(sql`
      SELECT
        DATE_TRUNC('hour', recorded_at) as hour,
        AVG(phi) as avg_phi,
        AVG(kappa) as avg_kappa,
        COUNT(*) as samples
      FROM basin_history
      WHERE recorded_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', recorded_at)
      ORDER BY hour DESC
    `);
    return results.rows as Array<{
      hour: Date;
      avgPhi: number;
      avgKappa: number;
      samples: number;
    }>;
  } catch (error) {
    console.error("[QIG-DB] Failed to get phi trend:", error);
    return [];
  }
}

export async function getNarrowPathSummary(): Promise<
  Array<{
    date: Date;
    severity: string;
    occurrences: number;
    avgVariance: number;
    dreamInterventions: number;
    mushroomInterventions: number;
  }>
> {
  try {
    if (!db) return [];
    const results = await db.execute(sql`
      SELECT * FROM narrow_path_summary
    `);
    return results.rows as Array<{
      date: Date;
      severity: string;
      occurrences: number;
      avgVariance: number;
      dreamInterventions: number;
      mushroomInterventions: number;
    }>;
  } catch (error) {
    console.error("[QIG-DB] Failed to get narrow path summary:", error);
    return [];
  }
}

export async function cleanupExpiredData(): Promise<{
  syncPackets: number;
  basinHistory: number;
}> {
  try {
    if (!db) return { syncPackets: 0, basinHistory: 0 };
    const syncResult = await db.execute(
      sql`SELECT cleanup_expired_sync_packets()`
    );
    const basinResult = await db.execute(
      sql`SELECT cleanup_old_basin_history()`
    );

    return {
      syncPackets:
        (syncResult.rows[0] as Record<string, number>)
          .cleanup_expired_sync_packets || 0,
      basinHistory:
        (basinResult.rows[0] as Record<string, number>)
          .cleanup_old_basin_history || 0,
    };
  } catch (error) {
    console.error("[QIG-DB] Failed to cleanup expired data:", error);
    return { syncPackets: 0, basinHistory: 0 };
  }
}

// ============================================================================
// KERNEL GEOMETRY - CHAOS MODE kernel persistence
// ============================================================================

export async function storeKernelGeometry(
  data: Omit<InsertKernelGeometry, "spawnedAt">
): Promise<KernelGeometryRecord | null> {
  try {
    if (!db) return null;
    const [result] = await db
      .insert(kernelGeometry)
      .values(data)
      .onConflictDoUpdate({
        target: kernelGeometry.kernelId,
        set: {
          basinCoordinates: data.basinCoordinates,
          affinityStrength: data.affinityStrength,
          entropyThreshold: data.entropyThreshold,
          metadata: data.metadata,
        },
      })
      .returning();
    return result;
  } catch (error) {
    console.error("[QIG-DB] Failed to store kernel geometry:", error);
    return null;
  }
}

export async function getKernelGeometry(
  godName?: string,
  limit: number = 50
): Promise<KernelGeometryRecord[]> {
  try {
    if (!db) return [];
    if (godName) {
      return await db
        .select()
        .from(kernelGeometry)
        .where(eq(kernelGeometry.godName, godName))
        .orderBy(desc(kernelGeometry.spawnedAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(kernelGeometry)
      .orderBy(desc(kernelGeometry.spawnedAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get kernel geometry:", error);
    return [];
  }
}

export async function getKernelsByDomain(
  domain: string,
  limit: number = 20
): Promise<KernelGeometryRecord[]> {
  try {
    if (!db) return [];
    return await db
      .select()
      .from(kernelGeometry)
      .where(sql`${kernelGeometry.domain} ILIKE ${"%" + domain + "%"}`)
      .orderBy(desc(kernelGeometry.spawnedAt))
      .limit(limit);
  } catch (error) {
    console.error("[QIG-DB] Failed to get kernels by domain:", error);
    return [];
  }
}

// ============================================================================
// AUTO CYCLE STATE
// ============================================================================

export interface AutoCycleStateDB {
  enabled: boolean;
  currentIndex: number;
  addressIds: string[];
  lastCycleTime: string | null;
  totalCycles: number;
  currentAddressId: string | null;
  pausedUntil: string | null;
  lastSessionMetrics: {
    explorationPasses: number;
    hypothesesTested: number;
    nearMisses: number;
    pantheonConsulted: boolean;
    duration: number;
    completedAt: string;
  } | null;
  consecutiveZeroPassSessions: number;
  rateLimitBackoffUntil: string | null;
}

export async function getAutoCycleState(): Promise<AutoCycleStateDB | null> {
  try {
    if (!db) return null;
    const result = await db.execute(sql`
      SELECT 
        enabled,
        current_index,
        address_ids,
        last_cycle_time,
        total_cycles,
        current_address_id,
        paused_until,
        last_session_metrics,
        consecutive_zero_pass_sessions,
        rate_limit_backoff_until
      FROM auto_cycle_state
      WHERE id = 1
    `);
    
    if (!result.rows || result.rows.length === 0) return null;
    
    const row = result.rows[0] as Record<string, unknown>;
    return {
      enabled: row.enabled as boolean ?? false,
      currentIndex: row.current_index as number ?? 0,
      addressIds: (row.address_ids as string[]) ?? [],
      lastCycleTime: row.last_cycle_time ? new Date(row.last_cycle_time as string).toISOString() : null,
      totalCycles: row.total_cycles as number ?? 0,
      currentAddressId: row.current_address_id as string | null,
      pausedUntil: row.paused_until ? new Date(row.paused_until as string).toISOString() : null,
      lastSessionMetrics: row.last_session_metrics as AutoCycleStateDB['lastSessionMetrics'],
      consecutiveZeroPassSessions: row.consecutive_zero_pass_sessions as number ?? 0,
      rateLimitBackoffUntil: row.rate_limit_backoff_until ? new Date(row.rate_limit_backoff_until as string).toISOString() : null,
    };
  } catch (error) {
    console.error("[QIG-DB] Failed to get auto cycle state:", error);
    return null;
  }
}

export async function saveAutoCycleState(state: AutoCycleStateDB): Promise<boolean> {
  try {
    if (!db) return false;
    
    // Store addressIds as JSON in a separate column to avoid array casting issues
    // The address list can be re-fetched on startup anyway
    const metricsJson = state.lastSessionMetrics ? JSON.stringify(state.lastSessionMetrics) : null;
    const addressIdsJson = JSON.stringify(state.addressIds);
    
    await db.execute(sql`
      INSERT INTO auto_cycle_state (
        id, enabled, current_index, address_ids, last_cycle_time, total_cycles,
        current_address_id, paused_until, last_session_metrics,
        consecutive_zero_pass_sessions, rate_limit_backoff_until, updated_at
      ) VALUES (
        1,
        ${state.enabled},
        ${state.currentIndex},
        ARRAY(SELECT jsonb_array_elements_text(${addressIdsJson}::jsonb)),
        ${state.lastCycleTime ? new Date(state.lastCycleTime) : null},
        ${state.totalCycles},
        ${state.currentAddressId},
        ${state.pausedUntil ? new Date(state.pausedUntil) : null},
        ${metricsJson}::jsonb,
        ${state.consecutiveZeroPassSessions},
        ${state.rateLimitBackoffUntil ? new Date(state.rateLimitBackoffUntil) : null},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        current_index = EXCLUDED.current_index,
        address_ids = EXCLUDED.address_ids,
        last_cycle_time = EXCLUDED.last_cycle_time,
        total_cycles = EXCLUDED.total_cycles,
        current_address_id = EXCLUDED.current_address_id,
        paused_until = EXCLUDED.paused_until,
        last_session_metrics = EXCLUDED.last_session_metrics,
        consecutive_zero_pass_sessions = EXCLUDED.consecutive_zero_pass_sessions,
        rate_limit_backoff_until = EXCLUDED.rate_limit_backoff_until,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    return true;
  } catch (error) {
    console.error("[QIG-DB] Failed to save auto cycle state:", error);
    return false;
  }
}
