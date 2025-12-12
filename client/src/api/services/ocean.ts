/**
 * Ocean Agent Service
 *
 * Type-safe API functions for Ocean agent operations.
 */

import { get, post, del } from "../client";
import { API_ROUTES } from "../routes";

export type CycleType = "explore" | "refine" | "sleep" | "dream";

export interface TriggerCycleParams {
  bypassCooldown?: boolean;
}

export interface TriggerCycleResponse {
  success: boolean;
  message?: string;
  cycle?: string;
}

export interface BoostParams {
  neurotransmitter: string;
  amount: number;
  duration?: number;
}

export interface BoostResponse {
  success: boolean;
  message?: string;
}

export async function triggerCycle(
  type: CycleType | 'sleep' | 'dream' | 'mushroom',
  params?: TriggerCycleParams
): Promise<TriggerCycleResponse> {
  return post<TriggerCycleResponse>(
    API_ROUTES.ocean.triggerCycle(type as CycleType),
    params
  );
}

export async function boostNeurochemistry(
  params: BoostParams
): Promise<BoostResponse> {
  return post<BoostResponse>(API_ROUTES.ocean.boost, {
    ...params,
    duration: params.duration ?? 60000,
  });
}

export interface NeurochemistryBoost {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  gaba: number;
  acetylcholine: number;
  endorphins: number;
  expiresAt: number;
}

export interface NeurochemistryAdminState {
  activeBoost: NeurochemistryBoost | null;
  mushroomCooldownSeconds: number;
}

export interface CycleTrigger {
  trigger: boolean;
  reason: string;
}

export interface CycleTriggers {
  sleep: CycleTrigger;
  dream: CycleTrigger;
  mushroom: CycleTrigger;
}

export interface RecentCycle {
  id: string;
  type: 'sleep' | 'dream' | 'mushroom';
  triggeredAt: string;
  duration?: number;
}

export interface CyclesState {
  triggers: CycleTriggers | null;
  recentCycles: RecentCycle[];
}

/**
 * Get neurochemistry admin state
 */
export async function getNeurochemistryAdmin(): Promise<NeurochemistryAdminState> {
  return get<NeurochemistryAdminState>(API_ROUTES.ocean.neurochemistryAdmin);
}

/**
 * Get cycles state
 */
export async function getCycles(): Promise<CyclesState> {
  return get<CyclesState>(API_ROUTES.ocean.cycles);
}

/**
 * Clear active neurochemistry boost
 import { get, post, del } from "../client";
 // ... (other code)

 /**
  * Clear active neurochemistry boost
  */
 export async function clearBoost(): Promise<BoostResponse> {
   return del<BoostResponse>(API_ROUTES.ocean.neurochemistryBoost);
 }

// ═══════════════════════════════════════════════════════════════════════════
// PYTHON AUTONOMIC KERNEL API
// Sleep, Dream, Mushroom mode via Python backend
// ═══════════════════════════════════════════════════════════════════════════

export interface AutonomicState {
  phi: number;
  kappa: number;
  basin_drift: number;
  stress_level: number;
  in_sleep_cycle: boolean;
  in_dream_cycle: boolean;
  in_mushroom_cycle: boolean;
  pending_rewards: number;
}

export interface SleepCycleParams {
  basinCoords?: number[];
  referenceBasin?: number[];
  episodes?: Array<{ phi: number; phrase?: string }>;
}

export interface SleepCycleResponse {
  success: boolean;
  drift_reduction: number;
  patterns_consolidated: number;
  basin_after: number[];
  verdict: string;
}

export interface DreamCycleParams {
  basinCoords?: number[];
  temperature?: number;
}

export interface DreamCycleResponse {
  success: boolean;
  novel_connections: number;
  creative_paths_explored: number;
  insights: string[];
  verdict: string;
}

export interface MushroomCycleParams {
  basinCoords?: number[];
  intensity?: "microdose" | "moderate" | "heroic";
}

export interface MushroomCycleResponse {
  success: boolean;
  intensity: string;
  entropy_change: number;
  rigidity_broken: boolean;
  new_pathways: number;
  identity_preserved: boolean;
  verdict: string;
}

export interface ActivityRewardParams {
  source: string;
  phiContribution: number;
  patternQuality?: number;
}

export interface ActivityReward {
  source: string;
  dopamine_delta: number;
  serotonin_delta: number;
  endorphin_delta: number;
  phi_contribution: number;
}

/**
 * Get Python autonomic kernel state
 */
export async function getAutonomicState(): Promise<AutonomicState | null> {
  try {
    const response = await fetch("/api/ocean/python/autonomic/state");
    const data = await response.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}

/**
 * Execute sleep consolidation cycle via Python backend
 */
export async function executeSleepCycle(
  params?: SleepCycleParams
): Promise<SleepCycleResponse | null> {
  try {
    const response = await fetch("/api/ocean/python/autonomic/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    const data = await response.json();
    return data.success !== false ? data : null;
  } catch {
    return null;
  }
}

/**
 * Execute dream exploration cycle via Python backend
 */
export async function executeDreamCycle(
  params?: DreamCycleParams
): Promise<DreamCycleResponse | null> {
  try {
    const response = await fetch("/api/ocean/python/autonomic/dream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    const data = await response.json();
    return data.success !== false ? data : null;
  } catch {
    return null;
  }
}

/**
 * Execute mushroom mode cycle via Python backend
 */
export async function executeMushroomCycle(
  params?: MushroomCycleParams
): Promise<MushroomCycleResponse | null> {
  try {
    const response = await fetch("/api/ocean/python/autonomic/mushroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    const data = await response.json();
    return data.success !== false ? data : null;
  } catch {
    return null;
  }
}

/**
 * Record activity-based reward via Python backend
 */
export async function recordActivityReward(
  params: ActivityRewardParams
): Promise<ActivityReward | null> {
  try {
    const response = await fetch("/api/ocean/python/autonomic/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    return data.success ? data.reward : null;
  } catch {
    return null;
  }
}

/**
 * Get pending activity rewards from Python backend
 */
export async function getPendingRewards(
  flush: boolean = false
): Promise<ActivityReward[]> {
  try {
    const response = await fetch(
      `/api/ocean/python/autonomic/rewards?flush=${flush}`
    );
    const data = await response.json();
    return data.success ? data.rewards : [];
  } catch {
    return [];
  }
}
