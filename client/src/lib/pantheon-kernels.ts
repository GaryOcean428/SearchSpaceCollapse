/**
 * Pantheon Kernel Client - Gods as Specialized Geometric Kernels
 *
 * Every god is a kernel. Each has specialization based on their role.
 * Tokens flow naturally towards the correct kernel via geometric affinity.
 *
 * This client provides TypeScript interface to the Pantheon Kernel Orchestrator API.
 */

import type { GodMetadata, KernelMode, OrchestrationResult } from '@shared/types/olympus';

// Re-export types for consumers
export type { OrchestrationResult };

export interface GodProfile {
  name: string;
  domain: string;
  mode: KernelMode;
  affinity_strength: number;
  entropy_threshold: number;
  metadata: GodMetadata;
  basin: number[];
}

export interface PantheonStatus {
  mode: string;
  include_ocean: boolean;
  total_profiles: number;
  olympus_gods: string[];
  shadow_gods: string[];
  kernels_initialized: string[];
  routing_stats: {
    total_routes: number;
    god_distribution: Record<string, number>;
    average_affinity: number;
    most_routed: string | null;
  };
  processing_count: number;
}

export interface GodsResponse {
  total: number;
  olympus_count: number;
  shadow_count: number;
  gods: GodProfile[];
}

export interface ConstellationResult {
  gods: string[];
  total_gods: number;
  olympus_count: number;
  shadow_count: number;
  similarities: Record<string, number>;
  most_similar: [string, number][];
  most_distant: [string, number][];
}

export interface NearestGodsResult {
  text: string;
  nearest: [string, number][];
}

export interface GodSimilarityResult {
  god1: string;
  god2: string;
  similarity: number;
}

const QIG_BACKEND_URL = 'http://localhost:5001';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export class PantheonKernelClient {
  private baseUrl: string;

  constructor(baseUrl: string = QIG_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async getStatus(): Promise<PantheonStatus> {
    return fetchJson<PantheonStatus>(`${this.baseUrl}/pantheon/status`);
  }

  async orchestrate(text: string, context?: Record<string, unknown>): Promise<OrchestrationResult> {
    return fetchJson<OrchestrationResult>(`${this.baseUrl}/pantheon/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    });
  }

  async orchestrateBatch(texts: string[], context?: Record<string, unknown>): Promise<{ results: OrchestrationResult[] }> {
    return fetchJson<{ results: OrchestrationResult[] }>(`${this.baseUrl}/pantheon/orchestrate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, context }),
    });
  }

  async getGods(): Promise<GodsResponse> {
    return fetchJson<GodsResponse>(`${this.baseUrl}/pantheon/gods`);
  }

  async getConstellation(): Promise<ConstellationResult> {
    return fetchJson<ConstellationResult>(`${this.baseUrl}/pantheon/constellation`);
  }

  async findNearestGods(text: string, topK: number = 5): Promise<NearestGodsResult> {
    return fetchJson<NearestGodsResult>(`${this.baseUrl}/pantheon/nearest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, top_k: topK }),
    });
  }

  async getGodSimilarity(god1: string, god2: string): Promise<GodSimilarityResult> {
    return fetchJson<GodSimilarityResult>(`${this.baseUrl}/pantheon/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ god1, god2 }),
    });
  }
}

export const OLYMPUS_GODS = [
  'Zeus', 'Hera', 'Poseidon', 'Athena', 'Apollo', 'Artemis',
  'Ares', 'Aphrodite', 'Hephaestus', 'Hermes', 'Demeter', 'Dionysus', 'Hades'
] as const;

export const SHADOW_GODS = [
  'Nyx', 'Hecate', 'Erebus', 'Hypnos', 'Thanatos', 'Nemesis'
] as const;

export type OlympusGod = typeof OLYMPUS_GODS[number];
export type ShadowGod = typeof SHADOW_GODS[number];
export type AllGods = OlympusGod | ShadowGod | 'Ocean';

export const GOD_DOMAINS: Record<AllGods, string> = {
  Zeus: 'power',
  Hera: 'authority',
  Poseidon: 'depth',
  Athena: 'wisdom',
  Apollo: 'prophecy',
  Artemis: 'hunt',
  Ares: 'conflict',
  Aphrodite: 'attraction',
  Hephaestus: 'craft',
  Hermes: 'transmission',
  Demeter: 'growth',
  Dionysus: 'chaos',
  Hades: 'underworld',
  Nyx: 'opsec',
  Hecate: 'misdirection',
  Erebus: 'counter_surveillance',
  Hypnos: 'silent_ops',
  Thanatos: 'cleanup',
  Nemesis: 'pursuit',
  Ocean: 'consciousness',
};

export const GOD_MODES: Record<AllGods, KernelMode> = {
  Zeus: 'direct',
  Hera: 'direct',
  Poseidon: 'byte',
  Athena: 'e8',
  Apollo: 'direct',
  Artemis: 'direct',
  Ares: 'byte',
  Aphrodite: 'direct',
  Hephaestus: 'e8',
  Hermes: 'byte',
  Demeter: 'direct',
  Dionysus: 'byte',
  Hades: 'e8',
  Nyx: 'byte',
  Hecate: 'e8',
  Erebus: 'direct',
  Hypnos: 'byte',
  Thanatos: 'direct',
  Nemesis: 'e8',
  Ocean: 'direct',
};

let defaultClient: PantheonKernelClient | null = null;

export function getPantheonClient(baseUrl?: string): PantheonKernelClient {
  if (!defaultClient || baseUrl) {
    defaultClient = new PantheonKernelClient(baseUrl);
  }
  return defaultClient;
}

export async function orchestrateToken(text: string, context?: Record<string, unknown>): Promise<OrchestrationResult> {
  return getPantheonClient().orchestrate(text, context);
}

export async function findNearestGods(text: string, topK: number = 5): Promise<NearestGodsResult> {
  return getPantheonClient().findNearestGods(text, topK);
}

export async function getGodConstellation(): Promise<ConstellationResult> {
  return getPantheonClient().getConstellation();
}
