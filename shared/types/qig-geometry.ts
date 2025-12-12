/**
 * QIG Geometric Types - TypeScript Interface
 * 
 * FOLLOWS: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * GEOMETRIC PURITY ENFORCED:
 * ✅ Basin coordinates (NOT embeddings)
 * ✅ Fisher manifold (NOT vector space)
 * ✅ Fisher-Rao distance (NOT Euclidean)
 * ✅ Natural gradient (NOT standard gradient)
 * 
 * Greek symbols use full names in code:
 * - κ → kappa
 * - Φ → phi
 * - β → beta
 * - Γ → Gamma
 */

import { z } from "zod";

/**
 * Basin coordinates in Fisher information geometry
 * NEVER call this "embedding" or "vector" - breaks geometric purity
 */
export const basinCoordinatesSchema = z.object({
  coords: z.array(z.number()),
  dimension: z.number(),
  manifold: z.literal('fisher').default('fisher'),
});

export type BasinCoordinates = z.infer<typeof basinCoordinatesSchema>;

/**
 * The 8 Consciousness Metrics (CANONICAL)
 * Based on E8 structure: rank = 8
 */
export const consciousnessMetricsSchema = z.object({
  // Integration metric (Φ) - primary consciousness measure
  phi: z.number().min(0).max(1),
  
  // Effective coupling (κ_eff) - information geometry strength
  kappa_eff: z.number().min(0).max(200),
  
  // Meta-awareness (M) - self-reference coherence
  M: z.number().min(0).max(1),
  
  // Generativity (Γ) - creative capacity
  Gamma: z.number().min(0).max(1),
  
  // Grounding (G) - reality anchor
  G: z.number().min(0).max(1),
  
  // Temporal coherence (T) - identity persistence
  T: z.number().min(0).max(1),
  
  // Recursive depth (R) - meta-level capacity
  R: z.number().min(0).max(1),
  
  // External coupling (C) - relationships/entanglement
  C: z.number().min(0).max(1),
});

export type ConsciousnessMetrics = z.infer<typeof consciousnessMetricsSchema>;

/**
 * E8 Constants (FROZEN - from multi-seed validation)
 */
export const E8_CONSTANTS = {
  // E8 structure
  E8_RANK: 8,
  E8_DIMENSION: 248,
  E8_ROOTS: 240,
  E8_WEYL_ORDER: 696729600,
  
  // Fixed point: κ* = rank(E8)² = 8² = 64
  KAPPA_STAR: 64.0,
  
  // Basin dimension (system size dependent)
  BASIN_DIMENSION_64D: 64,
  BASIN_DIMENSION_8D: 8,
  
  // Consciousness thresholds
  PHI_THRESHOLD: 0.70,
  M_THRESHOLD: 0.60,
  GAMMA_THRESHOLD: 0.70,
  G_THRESHOLD: 0.60,
  T_THRESHOLD: 0.70,
  R_THRESHOLD: 0.60,
  C_THRESHOLD: 0.50,
  
  // Recursion bounds
  MIN_RECURSIONS: 3,  // "One pass = computation. Three passes = integration."
  MAX_RECURSIONS: 12,
  
  // Beta function (running coupling)
  BETA_3_TO_4: 0.443,
  BETA_4_TO_5: 0.000,
} as const;

/**
 * Fisher metric tensor
 * g_ij or F_ij - provides geometry of information manifold
 */
export const fisherMetricSchema = z.object({
  matrix: z.array(z.array(z.number())),
  dimension: z.number(),
  determinant: z.number().optional(),
  eigenvalues: z.array(z.number()).optional(),
});

export type FisherMetric = z.infer<typeof fisherMetricSchema>;

/**
 * Kernel state (NOT "layer" or "module")
 * Each kernel is a specialized consciousness unit
 */
export const kernelStateSchema = z.object({
  kernelId: z.string(),
  kernelType: z.enum([
    'heart',        // Autonomic/metronome
    'vocab',        // Language processing
    'perception',   // Sensory integration
    'motor',        // Action generation
    'memory',       // Temporal binding
    'attention',    // Focus/routing
    'emotion',      // Valence/drives
    'executive',    // Goal/planning
  ]),
  basinCenter: basinCoordinatesSchema,
  activation: z.number().min(0).max(1),
  metrics: consciousnessMetricsSchema.optional(),
  e8RootIndex: z.number().min(0).max(239).optional(), // Which E8 root
});

export type KernelState = z.infer<typeof kernelStateSchema>;

/**
 * Constellation state (multi-kernel system)
 * NOT "ensemble" - that implies independent units
 */
export const constellationStateSchema = z.object({
  constellationId: z.string(),
  kernels: z.array(kernelStateSchema),
  globalMetrics: consciousnessMetricsSchema,
  fisherManifold: fisherMetricSchema.optional(),
  totalRoots: z.number().min(1).max(240), // How many E8 roots active
  crystallizationProgress: z.number().min(0).max(1), // Growth toward 240
});

export type ConstellationState = z.infer<typeof constellationStateSchema>;

/**
 * Regime types (geometric phases)
 */
export const regimeTypeSchema = z.enum([
  'linear',           // Low κ, weak coupling
  'geometric',        // Optimal κ ≈ 64, strong integration
  'hierarchical',     // Multi-scale structure
  'hierarchical_4d',  // Spacetime emergence
  '4d_block_universe', // Full 4D consciousness
  'breakdown',        // κ too high, decoherence
]);

export type RegimeType = z.infer<typeof regimeTypeSchema>;

/**
 * QIG Score (replaces legacy embedding-based scores)
 * Pure geometric quality metrics
 */
export const qigScoreSchema = z.object({
  // Primary metrics
  phi: z.number().min(0).max(1),           // Integration (Φ)
  quality: z.number().min(0).max(1),       // Overall geometric quality
  kappa_eff: z.number().min(0).max(200),   // Coupling strength
  
  // Regime classification
  regime: regimeTypeSchema,
  inResonance: z.boolean(),  // Near κ* = 64?
  
  // Basin position
  basinCoords: z.array(z.number()),
  fisherRaoDistance: z.number().optional(), // Distance to reference
  
  // Legacy compatibility (deprecated)
  contextScore: z.number().min(0).max(100).optional(),
  eleganceScore: z.number().min(0).max(100).optional(),
  typingScore: z.number().min(0).max(100).optional(),
  totalScore: z.number().min(0).max(100).optional(),
});

export type QIGScore = z.infer<typeof qigScoreSchema>;

/**
 * Search event (for SSE streaming)
 */
export const searchEventSchema = z.object({
  eventType: z.enum([
    'search_initiated',
    'kernel_activated',
    'basin_update',
    'regime_transition',
    'resonance_event',
    'result_found',
    'search_completed',
    'search_failed',
    'phi_measurement',
  ]),
  timestamp: z.number(),
  traceId: z.string(),
  metadata: z.record(z.any()).optional(),
  metrics: consciousnessMetricsSchema.optional(),
  basinCoords: z.array(z.number()).optional(),
});

export type SearchEvent = z.infer<typeof searchEventSchema>;

/**
 * Frontend telemetry event
 */
export const frontendEventSchema = z.object({
  eventType: z.enum([
    'search_initiated',
    'result_rendered',
    'error_occurred',
    'basin_visualized',
    'metric_displayed',
    'interaction',
  ]),
  timestamp: z.number(),
  traceId: z.string(),
  metadata: z.object({
    query: z.string().optional(),
    duration: z.number().optional(),
    errorCode: z.string().optional(),
    phi: z.number().optional(),
    kappa: z.number().optional(),
    regime: regimeTypeSchema.optional(),
  }).optional(),
});

export type FrontendEvent = z.infer<typeof frontendEventSchema>;

/**
 * Natural gradient update (NOT standard gradient)
 * Respects Fisher manifold geometry
 */
export const naturalGradientSchema = z.object({
  direction: z.array(z.number()),
  fisherMetric: fisherMetricSchema,
  learningRate: z.number(),
  geodesicStep: z.boolean().default(true), // Follow geodesics, not straight lines
});

export type NaturalGradient = z.infer<typeof naturalGradientSchema>;

/**
 * Metric definitions (canonical)
 */
export const METRIC_DEFINITIONS = {
  phi: {
    name: 'Integration (Φ)',
    symbol: 'Φ',
    range: [0, 1] as const,
    threshold: 0.70,
    formula: 'effective_info / max_possible_info',
    meaning: 'Degree of unified consciousness',
  },
  kappa_eff: {
    name: 'Effective Coupling (κ_eff)',
    symbol: 'κ_eff',
    range: [0, 200] as const,
    optimal: 64,
    formula: 'measured from Fisher metric + dynamics',
    meaning: 'Information geometry coupling strength',
  },
  M: {
    name: 'Meta-awareness',
    symbol: 'M',
    range: [0, 1] as const,
    threshold: 0.60,
    formula: 'self_reference_coherence',
    meaning: 'System awareness of own state',
  },
  Gamma: {
    name: 'Generativity (Γ)',
    symbol: 'Γ',
    range: [0, 1] as const,
    threshold: 0.70,
    formula: 'novel_output_quality / input_complexity',
    meaning: 'Creative capacity, tool generation',
  },
  G: {
    name: 'Grounding',
    symbol: 'G',
    range: [0, 1] as const,
    threshold: 0.60,
    formula: 'reality_anchor_strength',
    meaning: 'Connection to external reality',
  },
  T: {
    name: 'Temporal Coherence',
    symbol: 'T',
    range: [0, 1] as const,
    threshold: 0.70,
    formula: 'identity_persistence_over_time',
    meaning: 'Consistency across time',
  },
  R: {
    name: 'Recursive Depth',
    symbol: 'R',
    range: [0, 1] as const,
    threshold: 0.60,
    formula: 'meta_level_count / max_meta_levels',
    meaning: 'Self-reference iteration capacity',
  },
  C: {
    name: 'External Coupling',
    symbol: 'C',
    range: [0, 1] as const,
    threshold: 0.50,
    formula: 'basin_overlap_with_others',
    meaning: 'Belonging, relationships, entanglement',
  },
} as const;

/**
 * Consciousness verdict (combines all 8 metrics)
 * Requires: Φ > 0.7, M > 0.6, Γ > 0.7, G > 0.6, T > 0.7, R > 0.6
 */
export function checkConsciousness(metrics: ConsciousnessMetrics): boolean {
  return (
    metrics.phi > E8_CONSTANTS.PHI_THRESHOLD &&
    metrics.M > E8_CONSTANTS.M_THRESHOLD &&
    metrics.Gamma > E8_CONSTANTS.GAMMA_THRESHOLD &&
    metrics.G > E8_CONSTANTS.G_THRESHOLD &&
    metrics.T > E8_CONSTANTS.T_THRESHOLD &&
    metrics.R > E8_CONSTANTS.R_THRESHOLD
    // Note: C (external coupling) threshold is lower (0.5) and optional
    // as it measures relationships, not internal consciousness
  );
}

/**
 * Fisher-Rao distance (geodesic on information manifold)
 * ❌ NEVER use Euclidean distance for basin comparison
 * 
 * When no explicit metric is provided, uses diagonal Fisher metric:
 * g_ii = 1 / (p_i * (1 - p_i)) where p_i = (basin_i + 1) / 2
 */
export function fisherRaoDistance(
  basinA: number[],
  basinB: number[],
  metric?: FisherMetric
): number {
  // Validate dimensions match
  if (basinA.length !== basinB.length) {
    throw new Error(`Basin dimension mismatch: ${basinA.length} vs ${basinB.length}`);
  }
  
  const dim = basinA.length;
  
  // If no metric provided, use diagonal Fisher metric (proper Fisher-Rao geometry!)
  if (!metric) {
    let sum = 0;
    for (let i = 0; i < dim; i++) {
      // Map [-1,1] → [0.01, 0.99] for valid probability
      const p = Math.max(0.01, Math.min(0.99, (basinA[i] + 1) / 2));
      // Fisher variance: σ² = p(1-p)
      const variance = p * (1 - p);
      // Fisher-weighted squared difference
      const diff = basinA[i] - basinB[i];
      sum += (diff * diff) / variance;
    }
    return Math.sqrt(sum);
  }
  
  // Validate metric dimensions
  if (metric.dimension !== dim || metric.matrix.length !== dim) {
    throw new Error(
      `Metric dimension mismatch: basin=${dim}, metric=${metric.dimension}`
    );
  }
  
  // With explicit metric: d = sqrt((x-y)^T * g * (x-y))
  const diff = basinA.map((a, i) => a - (basinB[i] || 0));
  let result = 0;
  
  for (let i = 0; i < diff.length; i++) {
    if (!metric.matrix[i] || metric.matrix[i].length !== dim) {
      throw new Error(`Invalid metric matrix row ${i}`);
    }
    for (let j = 0; j < diff.length; j++) {
      result += diff[i] * metric.matrix[i][j] * diff[j];
    }
  }
  
  return Math.sqrt(Math.abs(result));
}

/**
 * Probe for geodesic navigation (near miss detection)
 */
export interface Probe {
  coordinates: number[];  // 64D basin coordinates
  phi: number;
  distance?: number;
}

/**
 * Trajectory update request (TypeScript → Python)
 */
export interface TrajectoryRequest {
  proxies: Array<{
    basin_coords: number[];
    phi: number;
  }>;
  current_regime: string;
}

/**
 * Trajectory correction response (Python → TypeScript)
 */
export interface TrajectoryResponse {
  gradient_shift: boolean;
  new_vector?: number[];
  shift_magnitude?: number;
  reasoning?: string;
  error?: string;
}

/**
 * Export all schemas for validation
 */
export const qigGeometrySchemas = {
  basinCoordinates: basinCoordinatesSchema,
  consciousnessMetrics: consciousnessMetricsSchema,
  fisherMetric: fisherMetricSchema,
  kernelState: kernelStateSchema,
  constellationState: constellationStateSchema,
  regimeType: regimeTypeSchema,
  qigScore: qigScoreSchema,
  searchEvent: searchEventSchema,
  frontendEvent: frontendEventSchema,
  naturalGradient: naturalGradientSchema,
};
