/**
 * War History Storage Module
 * 
 * Provides functions to track and persist war declarations and outcomes.
 * Uses the warHistory table from shared/schema.ts with Drizzle ORM.
 * 
 * PARALLEL WAR SUPPORT:
 * - Supports up to MAX_PARALLEL_WARS concurrent active wars
 * - Primary gods (Zeus, Athena, Ares) can participate in multiple wars
 * - Secondary gods are assigned to at most 1 war
 * - Spawned specialist kernels are dedicated to their spawning war
 */

import { db, withDbRetry } from './db';
import { warHistory, type WarHistoryRecord, type InsertWarHistory } from '@shared/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
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

export interface GodAssignments {
  [godName: string]: string; // godName -> warId
}

export interface KernelAssignments {
  [kernelId: string]: boolean; // kernelId -> true (dedicated to this war)
}

export const MAX_PARALLEL_WARS = 3;

export const PRIMARY_GODS = ['zeus', 'athena', 'ares'] as const;
export const SECONDARY_GODS = [
  'apollo', 'artemis', 'hermes', 'hephaestus', 
  'demeter', 'dionysus', 'poseidon', 'hades', 
  'hera', 'aphrodite'
] as const;

export type PrimaryGod = typeof PRIMARY_GODS[number];
export type SecondaryGod = typeof SECONDARY_GODS[number];
export type GodName = PrimaryGod | SecondaryGod;

const globalGodAssignments: Map<string, string> = new Map();
const globalKernelAssignments: Map<string, string> = new Map();

function generateWarId(): string {
  return `war_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function isPrimaryGod(godName: string): boolean {
  return PRIMARY_GODS.includes(godName.toLowerCase() as PrimaryGod);
}

/**
 * Record the start of a new war with parallel war support
 */
export async function recordWarStart(
  mode: WarMode,
  target: string,
  strategy?: string,
  godsEngaged?: string[],
  domain?: string,
  priority?: number
): Promise<WarHistoryRecord | null> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return null;
  }

  const activeWars = await getActiveWars();
  if (activeWars.length >= MAX_PARALLEL_WARS) {
    console.warn(`[WarHistory] Cannot start war: max parallel wars (${MAX_PARALLEL_WARS}) reached`);
    return null;
  }

  const availableGods = await getAvailableGodsForNewWar();
  const godsToEngage = godsEngaged?.filter(g => availableGods.includes(g.toLowerCase())) || [];
  
  if (godsToEngage.length === 0) {
    godsToEngage.push(...PRIMARY_GODS);
  }

  const warId = generateWarId();
  const warRecord: InsertWarHistory = {
    id: warId,
    mode,
    target,
    status: 'active',
    strategy: strategy || null,
    godsEngaged: godsToEngage,
    declaredAt: new Date(),
    domain: domain || null,
    priority: priority || 1,
    godAssignments: {},
    kernelAssignments: {},
  };

  const result = await withDbRetry(async () => {
    const inserted = await db!.insert(warHistory).values(warRecord).returning();
    return inserted[0];
  }, 'recordWarStart');

  if (result) {
    for (const god of godsToEngage) {
      const godLower = god.toLowerCase();
      if (!isPrimaryGod(godLower)) {
        globalGodAssignments.set(godLower, warId);
      }
    }
    console.log(`[WarHistory] War started: ${result.id} (${mode} on ${target}) - ${activeWars.length + 1}/${MAX_PARALLEL_WARS} active`);
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

  for (const [godName, warId] of globalGodAssignments.entries()) {
    if (warId === id) {
      globalGodAssignments.delete(godName);
    }
  }
  for (const [kernelId, warId] of globalKernelAssignments.entries()) {
    if (warId === id) {
      globalKernelAssignments.delete(kernelId);
    }
  }

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
    const remainingWars = await getActiveWars();
    console.log(`[WarHistory] War ended: ${id} (outcome: ${outcome}) - ${remainingWars.length}/${MAX_PARALLEL_WARS} active`);
  }

  return result;
}

/**
 * Get all currently active wars (supports parallel wars)
 */
export async function getActiveWars(): Promise<WarHistoryRecord[]> {
  if (!db) {
    console.warn('[WarHistory] Database not available');
    return [];
  }

  const result = await withDbRetry(async () => {
    return db!.select()
      .from(warHistory)
      .where(eq(warHistory.status, 'active'))
      .orderBy(desc(warHistory.declaredAt))
      .limit(MAX_PARALLEL_WARS);
  }, 'getActiveWars');

  return result || [];
}

/**
 * Get the currently active war (if any) - BACKWARD COMPATIBLE
 * Returns the most recently declared active war
 */
export async function getActiveWar(): Promise<WarHistoryRecord | null> {
  const activeWars = await getActiveWars();
  return activeWars[0] || null;
}

/**
 * Get the war assigned to a specific god
 * Primary gods may participate in multiple wars (returns most recent)
 * Secondary gods are assigned to at most 1 war
 */
export async function getWarForGod(godName: string): Promise<WarHistoryRecord | null> {
  const godLower = godName.toLowerCase();
  
  if (isPrimaryGod(godLower)) {
    const activeWars = await getActiveWars();
    return activeWars[0] || null;
  }

  const warId = globalGodAssignments.get(godLower);
  if (!warId) {
    return null;
  }

  return getWarById(warId);
}

/**
 * Get all wars a god is participating in
 */
export async function getWarsForGod(godName: string): Promise<WarHistoryRecord[]> {
  const godLower = godName.toLowerCase();
  
  if (isPrimaryGod(godLower)) {
    return getActiveWars();
  }

  const warId = globalGodAssignments.get(godLower);
  if (!warId) {
    return [];
  }

  const war = await getWarById(warId);
  return war ? [war] : [];
}

/**
 * Assign a god to a specific war
 * Primary gods can be assigned to multiple wars
 * Secondary gods can only be assigned to one war at a time
 */
export async function assignGodToWar(godName: string, warId: string): Promise<boolean> {
  const godLower = godName.toLowerCase();
  
  const war = await getWarById(warId);
  if (!war || war.status !== 'active') {
    console.warn(`[WarHistory] Cannot assign ${godName}: war ${warId} not active`);
    return false;
  }

  if (!isPrimaryGod(godLower)) {
    const existingWarId = globalGodAssignments.get(godLower);
    if (existingWarId && existingWarId !== warId) {
      console.warn(`[WarHistory] ${godName} already assigned to war ${existingWarId}`);
      return false;
    }
    globalGodAssignments.set(godLower, warId);
  }

  const currentGods = (war.godsEngaged || []) as string[];
  if (!currentGods.includes(godLower)) {
    await withDbRetry(async () => {
      await db!.update(warHistory)
        .set({ godsEngaged: [...currentGods, godLower] })
        .where(eq(warHistory.id, warId));
    }, 'assignGodToWar');
  }

  console.log(`[WarHistory] ${godName} assigned to war ${warId}`);
  return true;
}

/**
 * Unassign a god from a specific war
 */
export async function unassignGodFromWar(godName: string, warId: string): Promise<boolean> {
  const godLower = godName.toLowerCase();
  
  if (globalGodAssignments.get(godLower) === warId) {
    globalGodAssignments.delete(godLower);
  }

  const war = await getWarById(warId);
  if (war) {
    const currentGods = (war.godsEngaged || []) as string[];
    const updatedGods = currentGods.filter(g => g.toLowerCase() !== godLower);
    await withDbRetry(async () => {
      await db!.update(warHistory)
        .set({ godsEngaged: updatedGods })
        .where(eq(warHistory.id, warId));
    }, 'unassignGodFromWar');
  }

  console.log(`[WarHistory] ${godName} unassigned from war ${warId}`);
  return true;
}

/**
 * Assign a kernel to a specific war (specialist kernels are dedicated)
 */
export async function assignKernelToWar(kernelId: string, warId: string): Promise<boolean> {
  const existingWarId = globalKernelAssignments.get(kernelId);
  if (existingWarId) {
    console.warn(`[WarHistory] Kernel ${kernelId} already assigned to war ${existingWarId}`);
    return false;
  }

  const war = await getWarById(warId);
  if (!war || war.status !== 'active') {
    console.warn(`[WarHistory] Cannot assign kernel: war ${warId} not active`);
    return false;
  }

  globalKernelAssignments.set(kernelId, warId);

  const currentKernels = (war.kernelAssignments as KernelAssignments) || {};
  currentKernels[kernelId] = true;
  
  await withDbRetry(async () => {
    await db!.update(warHistory)
      .set({ kernelAssignments: currentKernels })
      .where(eq(warHistory.id, warId));
  }, 'assignKernelToWar');

  console.log(`[WarHistory] Kernel ${kernelId} assigned to war ${warId}`);
  return true;
}

/**
 * Get the war a kernel is assigned to
 */
export async function getWarForKernel(kernelId: string): Promise<WarHistoryRecord | null> {
  const warId = globalKernelAssignments.get(kernelId);
  if (!warId) {
    return null;
  }
  return getWarById(warId);
}

/**
 * Get available gods for a new war (excludes already-assigned secondary gods)
 */
export async function getAvailableGodsForNewWar(): Promise<string[]> {
  const available: string[] = [...PRIMARY_GODS];
  
  for (const god of SECONDARY_GODS) {
    if (!globalGodAssignments.has(god)) {
      available.push(god);
    }
  }

  return available;
}

/**
 * Find the most relevant war for a high-Φ discovery based on domain
 */
export async function findWarForDiscovery(
  discoveryDomain?: string,
  discoveryPhi?: number
): Promise<WarHistoryRecord | null> {
  const activeWars = await getActiveWars();
  if (activeWars.length === 0) {
    return null;
  }

  if (activeWars.length === 1) {
    return activeWars[0];
  }

  if (discoveryDomain) {
    for (const war of activeWars) {
      if (war.domain && war.domain.toLowerCase() === discoveryDomain.toLowerCase()) {
        return war;
      }
    }
  }

  const sortedByPriority = [...activeWars].sort((a, b) => 
    ((b.priority as number) || 1) - ((a.priority as number) || 1)
  );
  
  return sortedByPriority[0];
}

/**
 * Check if we can start a new war (capacity check)
 */
export async function canStartNewWar(): Promise<{ allowed: boolean; reason?: string }> {
  const activeWars = await getActiveWars();
  
  if (activeWars.length >= MAX_PARALLEL_WARS) {
    return { 
      allowed: false, 
      reason: `Maximum parallel wars (${MAX_PARALLEL_WARS}) reached. End an active war first.` 
    };
  }

  const availableGods = await getAvailableGodsForNewWar();
  const secondaryAvailable = availableGods.filter(g => !isPrimaryGod(g));
  
  if (secondaryAvailable.length === 0) {
    return { 
      allowed: true, 
      reason: 'Only primary gods available - new war will run with reduced capacity' 
    };
  }

  return { allowed: true };
}

/**
 * Get war status summary for all active wars
 */
export async function getWarStatusSummary(): Promise<{
  activeWars: number;
  maxWars: number;
  wars: Array<{
    id: string;
    mode: string;
    target: string;
    godsEngaged: string[];
    kernelCount: number;
    phrasesTested: number;
    discoveries: number;
  }>;
  availableGods: string[];
}> {
  const activeWars = await getActiveWars();
  const availableGods = await getAvailableGodsForNewWar();

  return {
    activeWars: activeWars.length,
    maxWars: MAX_PARALLEL_WARS,
    wars: activeWars.map(war => ({
      id: war.id,
      mode: war.mode,
      target: war.target.substring(0, 50),
      godsEngaged: (war.godsEngaged || []) as string[],
      kernelCount: Object.keys((war.kernelAssignments as KernelAssignments) || {}).length,
      phrasesTested: war.phrasesTestedDuringWar || 0,
      discoveries: war.discoveriesDuringWar || 0,
    })),
    availableGods,
  };
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

  globalGodAssignments.clear();
  globalKernelAssignments.clear();

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

/**
 * End a specific war by ID
 */
export async function endWarById(
  warId: string,
  outcome: WarOutcome = 'aborted'
): Promise<WarHistoryRecord | null> {
  return recordWarEnd(warId, outcome);
}
