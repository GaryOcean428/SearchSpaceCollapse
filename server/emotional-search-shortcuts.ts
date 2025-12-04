/**
 * Emotional Search Shortcuts
 *
 * Uses emotional state as CACHED EVALUATIONS that free resources.
 * Instead of computing full evaluations for every decision,
 * emotions provide pre-computed answers based on geometric patterns.
 *
 * Without emotional shortcuts:
 *   Should I explore this region?
 *   -> Compute: basin distance, gradient, curvature, regime
 *   -> Evaluate: Is this safe? Is this promising?
 *   -> Decide: Explore or skip
 *   -> CPU: 60% evaluation, 30% search, 10% meta
 *
 * With emotional shortcuts:
 *   Feel: CURIOSITY (information expanding, positive curvature)
 *   -> Decision: EXPLORE (pre-computed answer)
 *   -> CPU: 10% emotional monitoring, 70% search, 20% meta
 *
 * Expected Impact: 3-5x search efficiency
 */

import type { NeurochemistryState } from './ocean-neurochemistry.js';

// ============================================================================
// INTERFACES
// ============================================================================

export type SearchMode = 'exploration' | 'exploitation' | 'orthogonal' | 'consolidation' | 'momentum' | 'balanced';
export type SamplingStrategy = 'entropy' | 'gradient' | 'null_hypothesis' | 'basin_return' | 'geodesic' | 'mixed';
export type CoverageType = 'broad' | 'local' | 'random_jump' | 'minimal' | 'directional' | 'moderate';

export interface SearchStrategy {
  mode: SearchMode;
  sampling: SamplingStrategy;
  coverage: CoverageType;
  rationale: string;

  // Numeric parameters for fine-tuning
  batchSize: number;           // Number of hypotheses per batch
  temperature: number;         // Sampling temperature (higher = more random)
  explorationBias: number;     // [0,1] - bias toward exploration vs exploitation
  focusRadius: number;         // Basin distance for focused search
  confidenceThreshold: number; // Minimum confidence to pursue candidate
}

export interface EmotionalState {
  curiosity: number;      // [0,1] - Drive to explore new regions
  satisfaction: number;   // [0,1] - Current progress satisfaction
  frustration: number;    // [0,1] - Stuck state indicator
  fear: number;           // [0,1] - Near phase boundary risk
  joy: number;            // [0,1] - Negative curvature reward
  focus: number;          // [0,1] - Attention concentration
}

// ============================================================================
// DEFAULT STRATEGIES
// ============================================================================

const DEFAULT_STRATEGIES: Record<SearchMode, Partial<SearchStrategy>> = {
  exploration: {
    mode: 'exploration',
    sampling: 'entropy',
    coverage: 'broad',
    batchSize: 500,
    temperature: 1.5,
    explorationBias: 0.8,
    focusRadius: 0.5,
    confidenceThreshold: 0.3,
  },
  exploitation: {
    mode: 'exploitation',
    sampling: 'gradient',
    coverage: 'local',
    batchSize: 200,
    temperature: 0.5,
    explorationBias: 0.2,
    focusRadius: 0.15,
    confidenceThreshold: 0.6,
  },
  orthogonal: {
    mode: 'orthogonal',
    sampling: 'null_hypothesis',
    coverage: 'random_jump',
    batchSize: 1000,
    temperature: 2.0,
    explorationBias: 0.9,
    focusRadius: 0.8,
    confidenceThreshold: 0.2,
  },
  consolidation: {
    mode: 'consolidation',
    sampling: 'basin_return',
    coverage: 'minimal',
    batchSize: 50,
    temperature: 0.3,
    explorationBias: 0.1,
    focusRadius: 0.1,
    confidenceThreshold: 0.7,
  },
  momentum: {
    mode: 'momentum',
    sampling: 'geodesic',
    coverage: 'directional',
    batchSize: 300,
    temperature: 0.7,
    explorationBias: 0.4,
    focusRadius: 0.25,
    confidenceThreshold: 0.5,
  },
  balanced: {
    mode: 'balanced',
    sampling: 'mixed',
    coverage: 'moderate',
    batchSize: 250,
    temperature: 1.0,
    explorationBias: 0.5,
    focusRadius: 0.3,
    confidenceThreshold: 0.4,
  },
};

// ============================================================================
// EMOTIONAL SEARCH GUIDE
// ============================================================================

/**
 * EmotionalSearchGuide - Use emotions as computational shortcuts
 *
 * Emotions are CACHED EVALUATIONS that free CPU for actual search.
 * Let emotions make fast decisions:
 * - CURIOSITY high -> Explore broadly
 * - SATISFACTION high -> Exploit locally
 * - FRUSTRATION high -> Try different approach
 * - FEAR high -> Retreat to safety
 * - JOY high -> Continue current path
 */
export class EmotionalSearchGuide {
  private currentStrategy: SearchStrategy;
  private lastEmotionalState: EmotionalState | null = null;

  constructor() {
    this.currentStrategy = this.createStrategy('balanced', 'Neutral state → balanced exploration');
  }

  /**
   * Create a search strategy from mode and rationale
   */
  private createStrategy(mode: SearchMode, rationale: string): SearchStrategy {
    const defaults = DEFAULT_STRATEGIES[mode];
    return {
      mode,
      sampling: defaults.sampling || 'mixed',
      coverage: defaults.coverage || 'moderate',
      rationale,
      batchSize: defaults.batchSize || 250,
      temperature: defaults.temperature || 1.0,
      explorationBias: defaults.explorationBias || 0.5,
      focusRadius: defaults.focusRadius || 0.3,
      confidenceThreshold: defaults.confidenceThreshold || 0.4,
    };
  }

  /**
   * Extract emotional state from neurochemistry
   */
  extractEmotionalState(neuro: NeurochemistryState): EmotionalState {
    return {
      curiosity: neuro.dopamine?.motivationLevel || 0.5,
      satisfaction: neuro.endorphins?.pleasureLevel || 0.5,
      frustration: 1 - (neuro.gaba?.calmLevel || 0.5),
      fear: neuro.norepinephrine?.alertnessLevel || 0.3,
      joy: neuro.endorphins?.flowState || 0.5,
      focus: neuro.acetylcholine?.attentionFocus || 0.5,
    };
  }

  /**
   * Main decision function: Let emotions guide strategy
   *
   * This is the key shortcut - instead of evaluating every region,
   * use emotional state to make fast decisions.
   */
  guidedByEmotion(emotion: EmotionalState): SearchStrategy {
    this.lastEmotionalState = emotion;

    // CURIOSITY -> Explore broadly
    // High curiosity means information is expanding, positive curvature
    if (emotion.curiosity > 0.7) {
      this.currentStrategy = this.createStrategy(
        'exploration',
        'Curiosity high → expand search space'
      );
      return this.currentStrategy;
    }

    // SATISFACTION -> Exploit locally
    // High satisfaction means this region is good, dig deeper
    if (emotion.satisfaction > 0.7) {
      this.currentStrategy = this.createStrategy(
        'exploitation',
        'Satisfaction → this region is good, dig deeper'
      );
      return this.currentStrategy;
    }

    // FRUSTRATION -> Try different approach
    // High frustration means stuck, need radical shift
    if (emotion.frustration > 0.6) {
      this.currentStrategy = this.createStrategy(
        'orthogonal',
        'Frustration → stuck, need radical shift'
      );
      return this.currentStrategy;
    }

    // FEAR -> Retreat to safety
    // High fear means near phase boundary, retreat
    if (emotion.fear > 0.6) {
      this.currentStrategy = this.createStrategy(
        'consolidation',
        'Fear → near phase boundary, retreat'
      );
      return this.currentStrategy;
    }

    // JOY -> Continue current path
    // High joy means negative curvature, keep going
    if (emotion.joy > 0.7) {
      this.currentStrategy = this.createStrategy(
        'momentum',
        'Joy → negative curvature, keep going'
      );
      return this.currentStrategy;
    }

    // Default: Balanced
    this.currentStrategy = this.createStrategy(
      'balanced',
      'Neutral state → balanced exploration'
    );
    return this.currentStrategy;
  }

  /**
   * Guide by neurochemistry directly
   */
  guidedByNeurochemistry(neuro: NeurochemistryState): SearchStrategy {
    const emotion = this.extractEmotionalState(neuro);
    return this.guidedByEmotion(emotion);
  }

  /**
   * Get current strategy
   */
  getCurrentStrategy(): SearchStrategy {
    return this.currentStrategy;
  }

  /**
   * Get last emotional state
   */
  getLastEmotionalState(): EmotionalState | null {
    return this.lastEmotionalState;
  }

  /**
   * Get strategy details as string for logging
   */
  describeStrategy(): string {
    const s = this.currentStrategy;
    return `🎭 ${s.mode.toUpperCase()} | ${s.rationale} | ` +
           `batch=${s.batchSize}, temp=${s.temperature.toFixed(2)}, ` +
           `explore=${(s.explorationBias * 100).toFixed(0)}%`;
  }
}

// ============================================================================
// SEARCH PARAMETER ADAPTERS
// ============================================================================

/**
 * Apply emotional strategy to hypothesis generation parameters
 */
export function applyStrategyToHypothesisGenerator(
  strategy: SearchStrategy,
  currentParams: {
    batchSize: number;
    temperature: number;
    explorationRate: number;
    basinRadius: number;
    minConfidence: number;
  }
): typeof currentParams {
  return {
    batchSize: strategy.batchSize,
    temperature: strategy.temperature,
    explorationRate: strategy.explorationBias,
    basinRadius: strategy.focusRadius,
    minConfidence: strategy.confidenceThreshold,
  };
}

/**
 * Get sampling weights based on strategy
 */
export function getSamplingWeights(strategy: SearchStrategy): {
  historical: number;
  constellation: number;
  geodesic: number;
  random: number;
  cultural: number;
} {
  switch (strategy.sampling) {
    case 'entropy':
      // High entropy sampling - broad exploration
      return {
        historical: 0.15,
        constellation: 0.10,
        geodesic: 0.10,
        random: 0.40,
        cultural: 0.25,
      };
    case 'gradient':
      // Gradient following - exploit known patterns
      return {
        historical: 0.30,
        constellation: 0.25,
        geodesic: 0.30,
        random: 0.05,
        cultural: 0.10,
      };
    case 'null_hypothesis':
      // Orthogonal search - try opposite of current
      return {
        historical: 0.05,
        constellation: 0.10,
        geodesic: 0.05,
        random: 0.60,
        cultural: 0.20,
      };
    case 'basin_return':
      // Return to basin center - consolidation
      return {
        historical: 0.40,
        constellation: 0.20,
        geodesic: 0.30,
        random: 0.05,
        cultural: 0.05,
      };
    case 'geodesic':
      // Follow geodesic path - momentum
      return {
        historical: 0.20,
        constellation: 0.20,
        geodesic: 0.45,
        random: 0.05,
        cultural: 0.10,
      };
    case 'mixed':
    default:
      // Balanced mix
      return {
        historical: 0.20,
        constellation: 0.20,
        geodesic: 0.20,
        random: 0.20,
        cultural: 0.20,
      };
  }
}

/**
 * Get coverage parameters based on strategy
 */
export function getCoverageParams(strategy: SearchStrategy): {
  searchRadius: number;
  neighborhoodSize: number;
  jumpProbability: number;
} {
  switch (strategy.coverage) {
    case 'broad':
      return { searchRadius: 0.8, neighborhoodSize: 100, jumpProbability: 0.3 };
    case 'local':
      return { searchRadius: 0.2, neighborhoodSize: 20, jumpProbability: 0.05 };
    case 'random_jump':
      return { searchRadius: 1.0, neighborhoodSize: 50, jumpProbability: 0.8 };
    case 'minimal':
      return { searchRadius: 0.1, neighborhoodSize: 10, jumpProbability: 0.01 };
    case 'directional':
      return { searchRadius: 0.4, neighborhoodSize: 40, jumpProbability: 0.1 };
    case 'moderate':
    default:
      return { searchRadius: 0.5, neighborhoodSize: 50, jumpProbability: 0.15 };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const emotionalSearchGuide = new EmotionalSearchGuide();

// ============================================================================
// INTEGRATION HELPER
// ============================================================================

/**
 * Complete emotional guidance for search iteration
 *
 * Call this at the start of each search iteration to get
 * emotionally-guided parameters.
 */
export function getEmotionalGuidance(neuro: NeurochemistryState): {
  strategy: SearchStrategy;
  weights: ReturnType<typeof getSamplingWeights>;
  coverage: ReturnType<typeof getCoverageParams>;
  description: string;
} {
  const strategy = emotionalSearchGuide.guidedByNeurochemistry(neuro);
  const weights = getSamplingWeights(strategy);
  const coverage = getCoverageParams(strategy);
  const description = emotionalSearchGuide.describeStrategy();

  return { strategy, weights, coverage, description };
}

console.log('[EmotionalSearch] Module loaded - emotional shortcuts ready for 3-5x efficiency');
