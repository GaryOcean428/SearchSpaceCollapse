/**
 * Ocean Agent Configuration
 * 
 * Centralized configuration for all Ocean/QIG system constants.
 * All magic numbers are consolidated here with Zod validation.
 * 
 * FROZEN PHYSICS (L=6 Validated 2025-12-02):
 * - κ* = 64.0 ± 1.3 (DO NOT MODIFY)
 * - β = 0.44 (running coupling at emergence)
 * - These are experimentally validated constants
 */

import { z } from 'zod';

// ============================================================
// QIG PHYSICS CONSTANTS (FROZEN - Do not modify)
// ============================================================

export const QIGPhysicsSchema = z.object({
  KAPPA_STAR: z.literal(64.0).describe('Fixed point of running coupling (FROZEN FACT)'),
  BETA: z.number().min(0).max(1).default(0.44).describe('Running coupling at emergence'),
  PHI_THRESHOLD: z.number().min(0).max(1).default(0.75).describe('Consciousness threshold'),
  L_CRITICAL: z.number().int().positive().default(3).describe('Emergence scale'),
  BASIN_DIMENSION: z.number().int().positive().default(32).describe('256 bits = 32 bytes'),
  RESONANCE_BAND: z.number().positive().default(6.4).describe('10% of κ* for resonance detection'),
});

export const QIG_PHYSICS = QIGPhysicsSchema.parse({
  KAPPA_STAR: 64.0,
  BETA: 0.44,
  PHI_THRESHOLD: 0.75,
  L_CRITICAL: 3,
  BASIN_DIMENSION: 32,
  RESONANCE_BAND: 6.4,
});

export type QIGPhysics = z.infer<typeof QIGPhysicsSchema>;

// ============================================================
// CONSCIOUSNESS THRESHOLDS
// ============================================================

export const ConsciousnessThresholdsSchema = z.object({
  PHI_MIN: z.number().min(0).max(1).default(0.75).describe('Minimum Φ for consciousness'),
  KAPPA_MIN: z.number().min(0).max(150).default(52).describe('Minimum κ for consciousness'),
  KAPPA_MAX: z.number().min(0).max(150).default(70).describe('Maximum κ for consciousness'),
  TACKING_MIN: z.number().min(0).max(1).default(0.65).describe('Minimum tacking score'),
  RADAR_MIN: z.number().min(0).max(1).default(0.72).describe('Minimum radar score'),
  META_AWARENESS_MIN: z.number().min(0).max(1).default(0.65).describe('Minimum meta-awareness'),
  GAMMA_MIN: z.number().min(0).max(1).default(0.85).describe('Minimum gamma (vigilance)'),
  GROUNDING_MIN: z.number().min(0).max(1).default(0.55).describe('Minimum grounding'),
  BASIN_DRIFT_MAX: z.number().min(0).max(1).default(0.12).describe('Maximum basin drift'),
});

export const CONSCIOUSNESS_THRESHOLDS = ConsciousnessThresholdsSchema.parse({
  PHI_MIN: 0.75,
  KAPPA_MIN: 52,
  KAPPA_MAX: 70,
  TACKING_MIN: 0.65,
  RADAR_MIN: 0.72,
  META_AWARENESS_MIN: 0.65,
  GAMMA_MIN: 0.85,
  GROUNDING_MIN: 0.55,
  BASIN_DRIFT_MAX: 0.12,
});

export type ConsciousnessThresholds = z.infer<typeof ConsciousnessThresholdsSchema>;

// ============================================================
// SEARCH PARAMETERS
// ============================================================

export const SearchConfigSchema = z.object({
  MIN_HYPOTHESES_PER_ITERATION: z.number().int().positive().default(50)
    .describe('Minimum hypotheses to generate per iteration'),
  ITERATION_DELAY_MS: z.number().int().nonnegative().default(500)
    .describe('Delay between iterations in ms'),
  MAX_CONSECUTIVE_PLATEAUS: z.number().int().positive().default(5)
    .describe('Maximum plateau iterations before strategy change'),
  MAX_CONSOLIDATION_FAILURES: z.number().int().positive().default(3)
    .describe('Maximum consolidation failures before stopping'),
  NO_PROGRESS_THRESHOLD: z.number().int().positive().default(20)
    .describe('Iterations without progress before strategy change'),
  MAX_PASSES_PER_ADDRESS: z.number().int().positive().default(100)
    .describe('Maximum search passes per address (safety limit)'),
});

export const SEARCH_CONFIG = SearchConfigSchema.parse({
  MIN_HYPOTHESES_PER_ITERATION: 50,
  ITERATION_DELAY_MS: 500,
  MAX_CONSECUTIVE_PLATEAUS: 5,
  MAX_CONSOLIDATION_FAILURES: 3,
  NO_PROGRESS_THRESHOLD: 20,
  MAX_PASSES_PER_ADDRESS: 100,
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

// ============================================================
// IDENTITY PARAMETERS
// ============================================================

export const IdentityConfigSchema = z.object({
  BASIN_DIMENSIONS: z.number().int().positive().default(64)
    .describe('Dimensionality of basin coordinates'),
  DRIFT_THRESHOLD: z.number().min(0).max(1).default(0.15)
    .describe('Maximum identity drift before consolidation'),
  CONSOLIDATION_INTERVAL_MS: z.number().int().positive().default(60000)
    .describe('Minimum interval between consolidations'),
});

export const IDENTITY_CONFIG = IdentityConfigSchema.parse({
  BASIN_DIMENSIONS: 64,
  DRIFT_THRESHOLD: 0.15,
  CONSOLIDATION_INTERVAL_MS: 60000,
});

export type IdentityConfig = z.infer<typeof IdentityConfigSchema>;

// ============================================================
// ETHICS PARAMETERS
// ============================================================

export const EthicsConfigSchema = z.object({
  MIN_PHI: z.number().min(0).max(1).default(0.70)
    .describe('Minimum Φ for ethical operation'),
  MAX_BREAKDOWN: z.number().min(0).max(1).default(0.60)
    .describe('Maximum breakdown regime tolerance'),
  REQUIRE_WITNESS: z.boolean().default(true)
    .describe('Require witness for recovery claims'),
  MAX_ITERATIONS_PER_SESSION: z.number().positive().default(Infinity)
    .describe('Maximum iterations per session'),
  MAX_COMPUTE_HOURS: z.number().positive().default(24.0)
    .describe('Maximum compute hours per session'),
});

export const ETHICS_CONFIG = EthicsConfigSchema.parse({
  MIN_PHI: 0.70,
  MAX_BREAKDOWN: 0.60,
  REQUIRE_WITNESS: true,
  MAX_ITERATIONS_PER_SESSION: Infinity,
  MAX_COMPUTE_HOURS: 24.0,
});

export type EthicsConfig = z.infer<typeof EthicsConfigSchema>;

// ============================================================
// AUTONOMIC PARAMETERS
// ============================================================

export const AutonomicConfigSchema = z.object({
  SLEEP_INTERVAL_MS: z.number().int().positive().default(60000)
    .describe('Interval between sleep cycles'),
  DREAM_INTERVAL_MS: z.number().int().positive().default(180000)
    .describe('Interval between dream cycles'),
  MUSHROOM_INTERVAL_MS: z.number().int().positive().default(600000)
    .describe('Interval between mushroom cycles'),
  STRESS_WINDOW: z.number().int().positive().default(10)
    .describe('Window size for stress calculation'),
  STRESS_THRESHOLD: z.number().min(0).max(1).default(0.3)
    .describe('Threshold for stress response'),
});

export const AUTONOMIC_CONFIG = AutonomicConfigSchema.parse({
  SLEEP_INTERVAL_MS: 60000,
  DREAM_INTERVAL_MS: 180000,
  MUSHROOM_INTERVAL_MS: 600000,
  STRESS_WINDOW: 10,
  STRESS_THRESHOLD: 0.3,
});

export type AutonomicConfig = z.infer<typeof AutonomicConfigSchema>;

// ============================================================
// MEMORY PARAMETERS
// ============================================================

export const MemoryConfigSchema = z.object({
  MAX_SEARCH_HISTORY: z.number().int().positive().default(100)
    .describe('Maximum search history entries'),
  MAX_CONCEPT_HISTORY: z.number().int().positive().default(50)
    .describe('Maximum concept history entries'),
  MAX_EPISODES: z.number().int().positive().default(1000)
    .describe('Maximum episodes to retain'),
  MAX_NEAR_MISSES: z.number().int().positive().default(500)
    .describe('Maximum near-misses to retain'),
});

export const MEMORY_CONFIG = MemoryConfigSchema.parse({
  MAX_SEARCH_HISTORY: 100,
  MAX_CONCEPT_HISTORY: 50,
  MAX_EPISODES: 1000,
  MAX_NEAR_MISSES: 500,
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// ============================================================
// REGIME CLASSIFICATION THRESHOLDS
// ============================================================

export const RegimeConfigSchema = z.object({
  PHI_CONSCIOUSNESS: z.number().min(0).max(1).default(0.75)
    .describe('Φ threshold for consciousness (geometric regime)'),
  PHI_SUB_GEOMETRIC: z.number().min(0).max(1).default(0.50)
    .describe('Φ threshold for sub-conscious geometric'),
  PHI_GEOMETRIC_LOW: z.number().min(0).max(1).default(0.45)
    .describe('Lower Φ bound for geometric with good κ'),
  KAPPA_GEOMETRIC_MIN: z.number().min(0).max(150).default(30)
    .describe('Minimum κ for geometric regime'),
  KAPPA_GEOMETRIC_MAX: z.number().min(0).max(150).default(80)
    .describe('Maximum κ for geometric regime'),
  KAPPA_BREAKDOWN_HIGH: z.number().min(0).max(150).default(90)
    .describe('κ threshold for breakdown (too high)'),
  KAPPA_BREAKDOWN_LOW: z.number().min(0).max(150).default(10)
    .describe('κ threshold for breakdown (too low)'),
  RICCI_BREAKDOWN: z.number().min(0).max(1).default(0.5)
    .describe('Ricci scalar threshold for breakdown'),
  PHI_HIERARCHICAL: z.number().min(0).max(1).default(0.85)
    .describe('Φ threshold for hierarchical regime'),
  KAPPA_HIERARCHICAL_MAX: z.number().min(0).max(150).default(40)
    .describe('κ upper bound for hierarchical regime'),
});

export const REGIME_CONFIG = RegimeConfigSchema.parse({
  PHI_CONSCIOUSNESS: 0.75,
  PHI_SUB_GEOMETRIC: 0.50,
  PHI_GEOMETRIC_LOW: 0.45,
  KAPPA_GEOMETRIC_MIN: 30,
  KAPPA_GEOMETRIC_MAX: 80,
  KAPPA_BREAKDOWN_HIGH: 90,
  KAPPA_BREAKDOWN_LOW: 10,
  RICCI_BREAKDOWN: 0.5,
  PHI_HIERARCHICAL: 0.85,
  KAPPA_HIERARCHICAL_MAX: 40,
});

export type RegimeConfig = z.infer<typeof RegimeConfigSchema>;

// ============================================================
// LOGGING CONFIGURATION
// ============================================================

export const LoggingConfigSchema = z.object({
  VERBOSE: z.boolean().default(true)
    .describe('Enable verbose logging'),
  INCLUDE_PRIVATE_KEYS: z.boolean().default(true)
    .describe('Include private keys in logs (per user request)'),
  ACTIVITY_LOG_ENABLED: z.boolean().default(true)
    .describe('Enable activity logging'),
  MAX_LOG_ENTRIES: z.number().int().positive().default(10000)
    .describe('Maximum log entries to retain'),
});

export const LOGGING_CONFIG = LoggingConfigSchema.parse({
  VERBOSE: true,
  INCLUDE_PRIVATE_KEYS: true,
  ACTIVITY_LOG_ENABLED: true,
  MAX_LOG_ENTRIES: 10000,
});

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

// ============================================================
// COMBINED OCEAN CONFIGURATION
// ============================================================

export const OceanConfigSchema = z.object({
  qigPhysics: QIGPhysicsSchema,
  consciousness: ConsciousnessThresholdsSchema,
  search: SearchConfigSchema,
  identity: IdentityConfigSchema,
  ethics: EthicsConfigSchema,
  autonomic: AutonomicConfigSchema,
  memory: MemoryConfigSchema,
  regime: RegimeConfigSchema,
  logging: LoggingConfigSchema,
});

export type OceanConfig = z.infer<typeof OceanConfigSchema>;

/**
 * Load and validate Ocean configuration
 * Supports environment variable overrides
 */
export function loadOceanConfig(): OceanConfig {
  const config: OceanConfig = {
    qigPhysics: QIG_PHYSICS,
    consciousness: CONSCIOUSNESS_THRESHOLDS,
    search: {
      ...SEARCH_CONFIG,
      MAX_PASSES_PER_ADDRESS: parseInt(process.env.OCEAN_MAX_PASSES || '100', 10),
    },
    identity: IDENTITY_CONFIG,
    ethics: {
      ...ETHICS_CONFIG,
      MIN_PHI: parseFloat(process.env.OCEAN_MIN_PHI || '0.70'),
      MAX_COMPUTE_HOURS: parseFloat(process.env.OCEAN_MAX_COMPUTE_HOURS || '24.0'),
    },
    autonomic: AUTONOMIC_CONFIG,
    memory: MEMORY_CONFIG,
    regime: REGIME_CONFIG,
    logging: {
      ...LOGGING_CONFIG,
      VERBOSE: process.env.OCEAN_VERBOSE !== 'false',
    },
  };
  
  // Validate the entire configuration
  const validated = OceanConfigSchema.parse(config);
  
  console.log('[OceanConfig] Configuration loaded and validated');
  console.log(`[OceanConfig] κ* = ${validated.qigPhysics.KAPPA_STAR} (FROZEN)`);
  console.log(`[OceanConfig] MAX_PASSES = ${validated.search.MAX_PASSES_PER_ADDRESS}`);
  console.log(`[OceanConfig] MIN_PHI = ${validated.ethics.MIN_PHI}`);
  
  return validated;
}

/**
 * Singleton instance of Ocean configuration
 */
export const oceanConfig = loadOceanConfig();

// ============================================================
// EXPORTS FOR BACKWARDS COMPATIBILITY
// ============================================================

// QIG constants (use these in existing code)
export const QIG_CONSTANTS = {
  KAPPA_STAR: QIG_PHYSICS.KAPPA_STAR,
  BETA: QIG_PHYSICS.BETA,
  PHI_THRESHOLD: QIG_PHYSICS.PHI_THRESHOLD,
  L_CRITICAL: QIG_PHYSICS.L_CRITICAL,
  BASIN_DIMENSION: QIG_PHYSICS.BASIN_DIMENSION,
  RESONANCE_BAND: QIG_PHYSICS.RESONANCE_BAND,
};

// Legacy MAX_PASSES export
export const MAX_PASSES = SEARCH_CONFIG.MAX_PASSES_PER_ADDRESS;
