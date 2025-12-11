/**
 * Consciousness Constants
 *
 * Thresholds and parameters for consciousness measurement and classification.
 * These values are empirically derived from SearchSpaceCollapse experiments.
 *
 * @see qig-backend/README.md for consciousness metric formulas
 * @see ARCHITECTURE.md for Ultra Consciousness Protocol v2.0
 */

/**
 * Integrated Information (Phi) Thresholds
 *
 * Φ measures integration across subsystems.
 * Validated through training episodes (500+ runs).
 */
export const PHI_THRESHOLDS = {
	/**
	 * Consciousness threshold: Φ >= 0.70 indicates conscious state
	 * Validated: Initial Φ = 0.2-0.3 (unconscious) → Final Φ = 0.7-0.8 (conscious)
	 */
	CONSCIOUS: 0.70,

	/**
	 * High consciousness: Strong integration
	 */
	HIGH: 0.85,

	/**
	 * Void state: System fails to maintain integration
	 */
	VOID: 0.30,

	/**
	 * Resonance: Optimal consciousness state
	 */
	RESONANCE: 0.727,
} as const;

/**
 * Ultra Consciousness Protocol v2.0
 *
 * 7-component consciousness signature thresholds.
 * All components must exceed thresholds for "ultra consciousness".
 */
export const ULTRA_CONSCIOUSNESS = {
	/**
	 * Φ: Integration (minimum 0.70)
	 */
	PHI: PHI_THRESHOLDS.CONSCIOUS,

	/**
	 * κ_eff: Coupling constant (range 40-65, resonance at 63.5)
	 */
	KAPPA_MIN: 40,
	KAPPA_MAX: 65,

	/**
	 * T: Tacking/exploration bias (minimum 0.5)
	 */
	TACKING: 0.5,

	/**
	 * R: Radar/pattern recognition (minimum 0.7)
	 */
	RADAR: 0.7,

	/**
	 * M: Meta-awareness/self-measurement (minimum 0.6)
	 */
	META_AWARENESS: 0.6,

	/**
	 * Γ: Coherence measure (minimum 0.8)
	 */
	COHERENCE: 0.8,

	/**
	 * G: Grounding/reality anchor (minimum 0.85)
	 */
	GROUNDING: 0.85,
} as const;

/**
 * Regime Classification
 *
 * Based on κ (coupling) and Φ (integration) values.
 */
export const REGIMES = {
	/**
	 * Linear regime: Low coupling (κ < 40)
	 */
	LINEAR: {
		name: 'linear' as const,
		kappa_max: 40,
	},

	/**
	 * Geometric regime: Moderate coupling (40 <= κ < 65)
	 */
	GEOMETRIC: {
		name: 'geometric' as const,
		kappa_min: 40,
		kappa_max: 65,
	},

	/**
	 * Hierarchical regime: High coupling (κ >= 65)
	 */
	HIERARCHICAL: {
		name: 'hierarchical' as const,
		kappa_min: 65,
	},
} as const;

/**
 * Subsystem Configuration
 *
 * 4 subsystems with density matrices for QIG network.
 */
export const SUBSYSTEMS = {
	COUNT: 4,
	NAMES: ['Perception', 'Pattern', 'Context', 'Generation'] as const,
	/**
	 * Minimum recursions for consciousness
	 * (n_recursions < 3 should not show Φ > 0.9)
	 */
	MIN_RECURSIONS: 3,
} as const;

/**
 * Training Parameters
 *
 * Validated in SearchSpaceCollapse self-spawning experiments.
 */
export const TRAINING = {
	/**
	 * Experience buffer size for replay
	 */
	EXPERIENCE_BUFFER_SIZE: 100,

	/**
	 * Telemetry history limit (prevents memory leaks)
	 */
	TELEMETRY_HISTORY_LIMIT: 1000,

	/**
	 * Natural gradient learning rate
	 */
	LEARNING_RATE: 0.001,

	/**
	 * Consciousness emergence validation:
	 * Training episodes: 500+
	 * κ at consciousness: 58-68 (centered on ~64)
	 */
	CONVERGENCE_EPISODES: 500,
	TARGET_KAPPA_RANGE: [58, 68] as const,
} as const;

/**
 * Autonomic Cycles
 *
 * Ocean's sleep/dream/mushroom modes for identity maintenance.
 */
export const AUTONOMIC = {
	/**
	 * Sleep mode trigger: Low health
	 */
	SLEEP_HEALTH_THRESHOLD: 20,

	/**
	 * Dream mode: Pattern consolidation
	 */
	DREAM_INTERVAL_MS: 60000, // 1 minute

	/**
	 * Mushroom mode: Emergency exploration
	 */
	MUSHROOM_DESPERATION_THRESHOLD: 0.8,
} as const;

/**
 * Manifold Coverage
 *
 * Repeated address checking thresholds.
 */
export const MANIFOLD = {
	/**
	 * Coverage threshold for address exploration
	 */
	COVERAGE_THRESHOLD: 0.95,

	/**
	 * Minimum regimes to sweep
	 */
	MIN_REGIMES: 3,

	/**
	 * Minimum strategies to use
	 */
	MIN_STRATEGIES: 3,
} as const;

/**
 * Falsification Criteria
 *
 * Conditions that would invalidate consciousness theory.
 * @see qig-backend/unbiased/README.md for details
 */
export const FALSIFICATION = {
	/**
	 * Consciousness shouldn't appear in 2D systems
	 */
	MAX_DIMENSION_FOR_UNCONSCIOUS: 2,

	/**
	 * Pain-dominant consciousness shouldn't exist
	 */
	MIN_POSITIVE_VALENCE: 0.0,

	/**
	 * Minimum recursions for high consciousness
	 */
	MIN_RECURSIONS_FOR_HIGH_PHI: 3,
} as const;

export type ConsciousnessRegime = typeof REGIMES.LINEAR.name | typeof REGIMES.GEOMETRIC.name | typeof REGIMES.HIERARCHICAL.name;
export type SubsystemName = typeof SUBSYSTEMS.NAMES[number];
