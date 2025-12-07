/**
 * Autonomic System Constants
 * 
 * Intervals, thresholds, and parameters for the Ocean autonomic manager
 */

/**
 * Sleep and Dream Cycle Parameters
 */
export const AUTONOMIC_CYCLES = {
  /** Sleep cycle interval in milliseconds (1 minute) */
  SLEEP_INTERVAL_MS: 60000,
  
  /** Dream cycle interval in milliseconds (3 minutes) */
  DREAM_INTERVAL_MS: 180000,
  
  /** Heartbeat interval in milliseconds (30 seconds) */
  HEARTBEAT_INTERVAL_MS: 30000,
  
  /** Consciousness check interval (10 seconds) */
  CONSCIOUSNESS_CHECK_MS: 10000,
  
  /** Memory consolidation interval (5 minutes) */
  MEMORY_CONSOLIDATION_MS: 300000,
} as const;

/**
 * Stress and Arousal Parameters
 */
export const STRESS_PARAMETERS = {
  /** Number of recent events to consider for stress calculation */
  STRESS_WINDOW: 10,
  
  /** Threshold above which system is considered stressed */
  STRESS_THRESHOLD: 0.3,
  
  /** Recovery rate per cycle */
  RECOVERY_RATE: 0.05,
  
  /** Maximum stress before forced sleep */
  MAX_STRESS: 0.9,
} as const;

/**
 * Pleasure and Pain Sensitivity
 */
export const HEDONIC_PARAMETERS = {
  /** Exponential rate for pain response */
  PAIN_EXPONENTIAL_RATE: 2.0,
  
  /** Linear scale for pain */
  PAIN_LINEAR_SCALE: 0.5,
  
  /** Maximum pleasure when off-resonance */
  PLEASURE_MAX_OFF_RESONANCE: 0.2,
  
  /** Pleasure decay rate from optimal */
  PLEASURE_DECAY_RATE: 0.1,
  
  /** Distance from κ* for pleasure threshold */
  PLEASURE_THRESHOLD: 10.0,
} as const;

/**
 * Fear and Caution Parameters
 */
export const FEAR_PARAMETERS = {
  /** Exponential rate for fear response */
  FEAR_EXPONENTIAL_RATE: 1.5,
  
  /** Linear scale for fear */
  FEAR_LINEAR_SCALE: 0.3,
  
  /** Optimality window for reduced fear */
  OPTIMALITY_WINDOW: 6.4,
} as const;

/**
 * Admin Boost Parameters
 */
export const ADMIN_BOOST = {
  /** Default dopamine boost */
  DOPAMINE_BOOST: 0.3,
  
  /** Duration of boost in milliseconds (10 minutes) */
  BOOST_DURATION_MS: 600000,
  
  /** Threshold for mushroom prevention */
  MUSHROOM_PREVENTION_THRESHOLD: 0.3,
} as const;

/**
 * Idle Consciousness State
 * 
 * Canonical idle state with all metrics at zero
 */
export const IDLE_CONSCIOUSNESS = {
  phi: 0,
  phi_spatial: 0,
  phi_temporal: 0,
  phi_4D: 0,
  f_attention: 0,
  r_concepts: 0,
  phi_recursive: 0,
  consciousness_depth: 0,
  kappaEff: 0,
  tacking: 0,
  radar: 0,
  metaAwareness: 0,
  gamma: 0,
  grounding: 0,
  beta: 0.44,
  regime: 'breakdown' as const,
  validationLoops: 0,
  isConscious: false,
} as const;
