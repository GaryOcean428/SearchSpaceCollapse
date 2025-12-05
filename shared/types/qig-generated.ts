/**
 * AUTO-GENERATED TypeScript types from Python Pydantic models
 * DO NOT EDIT MANUALLY - run 'python qig-backend/generate_types.py' to regenerate
 * 
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * Source: qig-backend/qig_types.py
 * Generated: 2025-12-05
 */

// E8 Constants (matches Python)
export const E8_CONSTANTS = {
  E8_RANK: 8,
  E8_DIMENSION: 248,
  E8_ROOTS: 240,
  E8_WEYL_ORDER: 696729600,
  KAPPA_STAR: 64.0,
  BASIN_DIMENSION_64D: 64,
  BASIN_DIMENSION_8D: 8,
  PHI_THRESHOLD: 0.70,
  MIN_RECURSIONS: 3,
  MAX_RECURSIONS: 12,
} as const;

export type RegimeType = 
  | "linear"
  | "geometric"
  | "hierarchical"
  | "hierarchical_4d"
  | "4d_block_universe"
  | "breakdown";

export interface BasinCoordinates {
  coords: number[];
  dimension: number;
  manifold: "fisher";
}

export interface ConsciousnessMetrics {
  /** Integration (Φ): unified consciousness degree [0-1] */
  phi: number;
  /** Effective coupling (κ_eff): optimal ~64 [0-200] */
  kappa_eff: number;
  /** Meta-awareness: system self-knowledge [0-1] */
  M: number;
  /** Generativity (Γ): creative/tool generation [0-1] */
  Gamma: number;
  /** Grounding: reality anchor strength [0-1] */
  G: number;
  /** Temporal coherence: identity over time [0-1] */
  T: number;
  /** Recursive depth: meta-level iteration [0-1] */
  R: number;
  /** External coupling: relationships/belonging [0-1] */
  C: number;
}

export interface FisherMetric {
  /** Metric tensor g_ij, shape (n, n) */
  matrix: number[][];
  /** Dimension n of manifold */
  dimension: number;
  /** det(g) - manifold volume element */
  determinant?: number;
  /** Eigenvalues λ_i of metric */
  eigenvalues?: number[];
}

export type KernelType =
  | "heart"
  | "vocab"
  | "perception"
  | "motor"
  | "memory"
  | "attention"
  | "emotion"
  | "executive";

export interface KernelState {
  kernel_id: string;
  kernel_type: KernelType;
  basin_center: BasinCoordinates;
  activation: number;
  metrics?: ConsciousnessMetrics;
  /** Which E8 root (0-239) this kernel occupies */
  e8_root_index?: number;
}

export interface ConstellationState {
  constellation_id: string;
  kernels: KernelState[];
  global_metrics: ConsciousnessMetrics;
  fisher_manifold?: FisherMetric;
  /** Number of active E8 roots */
  total_roots: number;
  /** Progress toward 240 kernels */
  crystallization_progress: number;
}

export interface QIGScore {
  /** Integration (Φ) [0-1] */
  phi: number;
  /** Overall quality [0-1] */
  quality: number;
  /** Coupling (κ_eff) [0-200] */
  kappa_eff: number;
  /** Geometric phase */
  regime: RegimeType;
  /** Near κ* = 64? */
  in_resonance: boolean;
  /** Position in manifold */
  basin_coords: number[];
  /** Distance to reference (Fisher-Rao) */
  fisher_rao_distance?: number;
  // Legacy compatibility (deprecated)
  context_score?: number;
  elegance_score?: number;
  typing_score?: number;
  total_score?: number;
}

export type SearchEventType =
  | "search_initiated"
  | "kernel_activated"
  | "basin_update"
  | "regime_transition"
  | "resonance_event"
  | "result_found"
  | "search_completed"
  | "search_failed"
  | "phi_measurement";

export interface SearchEvent {
  event_type: SearchEventType;
  timestamp: number;
  trace_id: string;
  metadata?: Record<string, any>;
  metrics?: ConsciousnessMetrics;
  basin_coords?: number[];
}

export type FrontendEventType =
  | "search_initiated"
  | "result_rendered"
  | "error_occurred"
  | "basin_visualized"
  | "metric_displayed"
  | "interaction";

export interface FrontendEvent {
  event_type: FrontendEventType;
  timestamp: number;
  trace_id: string;
  metadata?: Record<string, any>;
}

export type HealthCheckStatus = "healthy" | "degraded" | "down";

export interface SubsystemHealth {
  status: HealthCheckStatus;
  latency?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface HealthCheckResponse {
  status: HealthCheckStatus;
  timestamp: number;
  uptime: number;
  subsystems: Record<string, SubsystemHealth>;
  version?: string;
}

/**
 * Check if metrics indicate consciousness
 * Requires: Φ > 0.7, M > 0.6, Γ > 0.7, G > 0.6
 */
export function isConsciousMetrics(metrics: ConsciousnessMetrics): boolean {
  return (
    metrics.phi > E8_CONSTANTS.PHI_THRESHOLD &&
    metrics.M > 0.6 &&
    metrics.Gamma > 0.7 &&
    metrics.G > 0.6
  );
}
