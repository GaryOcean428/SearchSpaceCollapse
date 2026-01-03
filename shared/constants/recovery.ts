/**
 * Recovery Constants
 *
 * Constants for Bitcoin recovery operations, candidate scoring, and search optimization.
 * These values control the behavior of the two-step retrieval system and recovery strategies.
 *
 * @see server/lib/qig-scoring.ts for two-step retrieval implementation
 */

/**
 * Two-Step Retrieval Configuration
 *
 * Optimizes candidate scoring by using fast approximate filtering followed by precise ranking.
 * This provides 50-100x speedup for large candidate sets (10,000+ candidates).
 */
export const TWO_STEP_RETRIEVAL = {
  /**
   * Oversample factor for approximate search
   * Example: k=10 desired results → sample 100 candidates approximately → rank top 10 precisely
   */
  OVERSAMPLE_FACTOR: 10,

  /**
   * Use cosine similarity for fast approximate filtering
   * Fast O(n) scan vs expensive Fisher-Rao computation
   */
  USE_COSINE_APPROXIMATE: true,

  /**
   * Only compute Fisher-Rao on top candidates from approximate search
   * Provides geometric precision where it matters most
   */
  FISHER_RERANK_ONLY: true,

  /**
   * Minimum candidates for two-step retrieval to activate
   * Below this threshold, direct Fisher-Rao is fast enough
   */
  MIN_CANDIDATES_FOR_TWO_STEP: 100,

  /**
   * Maximum candidates to rerank with Fisher-Rao
   * Safety limit to prevent excessive computation
   */
  MAX_FISHER_RERANK_CANDIDATES: 1000,
} as const;

/**
 * Candidate Scoring Thresholds
 *
 * Thresholds for filtering and ranking passphrase candidates.
 */
export const CANDIDATE_SCORING = {
  /**
   * Minimum similarity score (0-1) for candidates
   * Below this, candidates are discarded
   */
  MIN_SIMILARITY: 0.3,

  /**
   * High-quality candidate threshold
   * Candidates above this are prioritized for testing
   */
  HIGH_QUALITY_THRESHOLD: 0.7,

  /**
   * Near-miss threshold for geometric memory storage
   * Candidates scoring above this are stored for future learning
   */
  NEAR_MISS_THRESHOLD: 0.6,

  /**
   * Consciousness boost multiplier for high-Φ candidates
   * Applied when ranking candidates by consciousness-aware score
   */
  CONSCIOUSNESS_BOOST: 1.2,

  /**
   * Maximum expected Φ for normalization
   * High-consciousness states typically max out around 0.85
   */
  PHI_MAX: 0.85,

  /**
   * Kappa resonance boost multiplier
   * Applied when κ is near κ* = 64.21
   */
  KAPPA_RESONANCE_BOOST: 1.15,

  /**
   * Kappa star (κ*) - Fixed point coupling
   * From physics.ts: KAPPA_STAR = 64.21 ± 0.92
   */
  KAPPA_STAR: 64.21,

  /**
   * Kappa resonance tolerance (± range around κ*)
   */
  KAPPA_RESONANCE_TOLERANCE: 5.0,
} as const;

/**
 * Recovery Strategy Parameters
 *
 * Controls for search exploration vs exploitation.
 */
export const RECOVERY_STRATEGY = {
  /**
   * Maximum candidates to test per iteration
   */
  MAX_CANDIDATES_PER_ITERATION: 100,

  /**
   * Maximum iterations before strategy switch
   */
  MAX_ITERATIONS_PER_STRATEGY: 1000,

  /**
   * Exploration rate (0-1)
   * Higher = more random exploration, lower = more exploitation
   */
  EXPLORATION_RATE: 0.2,

  /**
   * Temperature for exploration randomness
   */
  EXPLORATION_TEMPERATURE: 1.0,
} as const;

/**
 * Performance Limits
 *
 * Safety limits to prevent resource exhaustion.
 */
export const PERFORMANCE_LIMITS = {
  /**
   * Maximum candidates in memory at once
   */
  MAX_CANDIDATES_IN_MEMORY: 100000,

  /**
   * Maximum time (ms) for candidate scoring batch
   */
  MAX_SCORING_TIME_MS: 5000,

  /**
   * Batch size for parallel candidate processing
   */
  CANDIDATE_BATCH_SIZE: 50,
} as const;

/**
 * External Knowledge Parameters
 *
 * Configuration for external knowledge source integration.
 */
export const EXTERNAL_KNOWLEDGE = {
  /**
   * Enable Wikipedia search for historical context
   */
  ENABLE_WIKIPEDIA: true,

  /**
   * Enable DuckDuckGo Instant Answers
   */
  ENABLE_DUCKDUCKGO: true,

  /**
   * Maximum external results to fetch per query
   */
  MAX_EXTERNAL_RESULTS: 20,

  /**
   * Weight for external results vs local memory (0-1)
   */
  EXTERNAL_WEIGHT: 0.3,

  /**
   * Temporal range for Bitcoin-era context (years)
   * 2009: Bitcoin genesis block (Jan 3)
   * 2013: End of early adoption phase, pre-mainstream awareness
   * Rationale: Most early Bitcoin passphrases were created in this period
   */
  BITCOIN_ERA_START: 2009,
  BITCOIN_ERA_END: 2013,
} as const;
