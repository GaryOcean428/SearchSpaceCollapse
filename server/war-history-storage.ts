/**
 * War History Storage Module
 * 
 * Provides functions to track and persist war declarations and outcomes.
 * Uses the warHistory table from shared/schema.ts with Drizzle ORM.
 */

import { db, withDbRetry } from './db';
import { warHistory, type WarHistoryRecord, type InsertWarHistory } from '@shared/schema';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export type WarMode = 'BLITZKRIEG' | 'SIEGE' | 'HUNT';
export type WarOutcome = 'success' | 'partial_success' | 'failure' | 'aborted';
export type WarStatus = 'active' | 'completed' | 'aborted';

export interface ShadowWarDecision {
  godName: string;
  operation: string;
  result: Record<string, unknown> | null;
  timestamp: string;
  riskFlags: string[];
}

export interface WarMetrics {
  phrasesTested?: number;
  discoveries?: number;
  kernelsSpawned?: number;
  shadowDecisions?: ShadowWarDecision[];
  metadata?: Record<string, unknown>;
}

function generateWarId(): string {
  return `war_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

/**
 * Record the start of a new war
 */
export async function recordWarStart(
  mode: WarMode,
  target: string,
  strategy?: string,
  godsEngaged?: string[]
): Promise<WarHistoryRecord | null> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return null;
  }

  const warRecord: InsertWarHistory = {
    id: generateWarId(),
    mode,
    target,
    status: 'active',
    strategy: strategy || null,
    godsEngaged: godsEngaged || null,
    declaredAt: new Date(),
  };

  const result = await withDbRetry(async () => {
    const inserted = await db!.insert(warHistory).values(warRecord).returning();
    return inserted[0];
  }, 'recordWarStart');

  if (result) {
    console.log(`[WarHistory] War started: ${result.id} (${mode} on ${target})`);
  }

  return result;
}

/**
 * Record the end of a war with outcome and metrics
 */
export async function recordWarEnd(
  id: string,
  outcome: WarOutcome,
  convergenceScore?: number,
  metrics?: WarMetrics
): Promise<WarHistoryRecord | null> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return null;
  }

  const status: WarStatus = outcome === 'aborted' ? 'aborted' : 'completed';

  const result = await withDbRetry(async () => {
    const updated = await db!.update(warHistory)
      .set({
        endedAt: new Date(),
        status,
        outcome,
        convergenceScore: convergenceScore ?? null,
        phrasesTestedDuringWar: metrics?.phrasesTested ?? 0,
        discoveriesDuringWar: metrics?.discoveries ?? 0,
        kernelsSpawnedDuringWar: metrics?.kernelsSpawned ?? 0,
        metadata: metrics?.metadata ?? null,
      })
      .where(eq(warHistory.id, id))
      .returning();
    return updated[0];
  }, 'recordWarEnd');

  if (result) {
    console.log(`[WarHistory] War ended: ${id} (outcome: ${outcome})`);
  }

  return result;
}

/**
 * Get the currently active war (if any)
 */
export async function getActiveWar(): Promise<WarHistoryRecord | null> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return null;
  }

  const result = await withDbRetry(async () => {
    const active = await db!.select()
      .from(warHistory)
      .where(eq(warHistory.status, 'active'))
      .orderBy(desc(warHistory.declaredAt))
      .limit(1);
    return active[0] || null;
  }, 'getActiveWar');

  return result;
}

/**
 * Get war history records, newest first
 */
export async function getWarHistory(limit: number = 50): Promise<WarHistoryRecord[]> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return [];
  }

  const result = await withDbRetry(async () => {
    return db!.select()
      .from(warHistory)
      .orderBy(desc(warHistory.declaredAt))
      .limit(limit);
  }, 'getWarHistory');

  return result || [];
}

/**
 * Get a specific war record by ID
 */
export async function getWarById(id: string): Promise<WarHistoryRecord | null> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return null;
  }

  const result = await withDbRetry(async () => {
    const records = await db!.select()
      .from(warHistory)
      .where(eq(warHistory.id, id))
      .limit(1);
    return records[0] || null;
  }, 'getWarById');

  return result;
}

/**
 * Update war metrics during an active war
 */
export async function updateWarMetrics(
  id: string,
  metrics: Partial<WarMetrics>
): Promise<WarHistoryRecord | null> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return null;
  }

  const updateFields: Record<string, unknown> = {};
  if (metrics.phrasesTested !== undefined) {
    updateFields.phrasesTestedDuringWar = metrics.phrasesTested;
  }
  if (metrics.discoveries !== undefined) {
    updateFields.discoveriesDuringWar = metrics.discoveries;
  }
  if (metrics.kernelsSpawned !== undefined) {
    updateFields.kernelsSpawnedDuringWar = metrics.kernelsSpawned;
  }
  if (metrics.metadata !== undefined) {
    updateFields.metadata = metrics.metadata;
  }

  if (Object.keys(updateFields).length === 0) {
    return getWarById(id);
  }

  const result = await withDbRetry(async () => {
    const updated = await db!.update(warHistory)
      .set(updateFields)
      .where(eq(warHistory.id, id))
      .returning();
    return updated[0];
  }, 'updateWarMetrics');

  return result;
}

/**
 * Abort all active wars (cleanup on startup or error)
 */
export async function abortAllActiveWars(): Promise<number> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return 0;
  }

  const result = await withDbRetry(async () => {
    const aborted = await db!.update(warHistory)
      .set({
        endedAt: new Date(),
        status: 'aborted',
        outcome: 'aborted',
      })
      .where(eq(warHistory.status, 'active'))
      .returning();
    return aborted.length;
  }, 'abortAllActiveWars');

  if (result && result > 0) {
    console.log(`[WarHistory] Aborted ${result} active war(s)`);
  }

  return result || 0;
}
