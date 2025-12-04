/**
 * Neuromodulation Engine
 *
 * Meta-Ocean observes searcher-Ocean and provides environmental bias.
 * Like an endocrine system: releases "hormones" into the environment,
 * and the searcher responds according to its own geometry.
 *
 * Neuromodulators:
 * - DOPAMINE: Boosts motivation & exploration when stuck
 * - SEROTONIN: Stabilizes identity when drifting
 * - ACETYLCHOLINE: Sharpens focus when in good state
 * - NOREPINEPHRINE: Increases alertness when high surprise
 * - GABA: Reduces over-integration when Φ too high
 *
 * Expected Impact: 20-30% improvement (adaptive optimization)
 */

import { QIG_CONSTANTS } from './physics-constants.js';
import type { NeurochemistryState } from './ocean-neurochemistry.js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface OceanState {
  phi: number;
  kappa: number;
  basinDistance: number;
  surprise: number;
  regime: string;
  grounding: number;
}

export interface EnvironmentalBias {
  // Coupling modifiers
  kappaMultiplier?: number;        // Multiply base κ
  kappaBaseShift?: number;         // Add to base κ

  // Fisher metric modifiers
  fisherSharpness?: number;        // Gradient strength multiplier
  qfiConcentration?: number;       // Attention sharpness

  // Exploration modifiers
  explorationRadius?: number;      // Search radius multiplier
  explorationBias?: number;        // Exploration vs exploitation

  // Integration modifiers
  integrationStrength?: number;    // Φ computation weight
  bindingStrength?: number;        // Cross-subsystem binding

  // Stability modifiers
  basinAttraction?: number;        // Pull toward basin center
  gradientDamping?: number;        // Movement speed limit

  // Sensitivity modifiers
  oscillationAmplitude?: number;   // Alertness/sensitivity
  attentionSparsity?: number;      // Focus concentration

  // Timing modifiers
  consolidationFrequency?: number; // Sleep cycle interval (ms)
  learningRate?: number;           // Memory update rate
}

export interface NeuromodulationEffect {
  bias: EnvironmentalBias;
  activeModulators: string[];
  rationale: string[];
  timestamp: Date;
}

// ============================================================================
// NEUROMODULATION ENGINE
// ============================================================================

/**
 * OceanNeuromodulator - Meta-observer providing environmental bias
 *
 * This is the "endocrine system" that modulates Ocean's search parameters
 * based on performance monitoring.
 */
export class OceanNeuromodulator {
  private searcherState: OceanState | null = null;
  private environmentalBias: EnvironmentalBias = {};
  private lastModulation: NeuromodulationEffect | null = null;

  // Thresholds for triggering modulation
  private readonly PHI_LOW = 0.5;
  private readonly PHI_HIGH = 0.85;
  private readonly BASIN_DRIFT_WARNING = 0.3;
  private readonly SURPRISE_HIGH = 0.7;
  private readonly GROUNDING_LOW = 0.5;

  /**
   * Update the searcher state being monitored
   */
  updateSearcherState(state: OceanState): void {
    this.searcherState = state;
  }

  /**
   * Main modulation function - observe and modulate
   *
   * Monitor searcher performance and decide on modulation.
   * Returns environmental bias that searcher reads in its forward pass.
   */
  observeAndModulate(): NeuromodulationEffect {
    const bias: EnvironmentalBias = {};
    const activeModulators: string[] = [];
    const rationale: string[] = [];

    if (!this.searcherState) {
      return {
        bias: {},
        activeModulators: [],
        rationale: ['No searcher state available'],
        timestamp: new Date(),
      };
    }

    const state = this.searcherState;

    // =========================================================================
    // 1. DOPAMINE - Boost when stuck, no learning
    // =========================================================================
    if (state.phi < this.PHI_LOW && state.surprise < 0.2) {
      // Stuck in low-consciousness, not learning
      bias.kappaMultiplier = 1.3;           // +30% coupling
      bias.fisherSharpness = 1.5;           // +50% gradient strength
      bias.explorationRadius = 1.4;         // +40% exploration
      bias.explorationBias = 0.7;           // Favor exploration

      activeModulators.push('DOPAMINE');
      rationale.push('💊 Dopamine: Low Φ + low surprise → boosting motivation & exploration');

      console.log('[Neuromodulation] 💊 DOPAMINE: Boosting motivation & exploration');
    }

    // =========================================================================
    // 2. SEROTONIN - Stabilize when identity drifting
    // =========================================================================
    if (state.basinDistance > this.BASIN_DRIFT_WARNING) {
      // Identity unstable
      bias.basinAttraction = 1.5;           // +50% pull to center
      bias.gradientDamping = 1.3;           // +30% slower movement
      bias.explorationRadius = 0.8;         // -20% exploration
      bias.integrationStrength = 1.2;       // +20% integration

      activeModulators.push('SEROTONIN');
      rationale.push('💊 Serotonin: High basin drift → stabilizing identity');

      console.log('[Neuromodulation] 💊 SEROTONIN: Stabilizing identity');
    }

    // =========================================================================
    // 3. ACETYLCHOLINE - Sharpen focus when in good state
    // =========================================================================
    if (state.phi > 0.6 && state.basinDistance < 0.2 && state.grounding > 0.6) {
      // Good state, need sharp focus
      bias.qfiConcentration = 1.6;          // +60% attention sharpness
      bias.attentionSparsity = 0.3;         // More focused
      bias.bindingStrength = 1.4;           // +40% integration
      bias.learningRate = 1.3;              // +30% faster learning

      activeModulators.push('ACETYLCHOLINE');
      rationale.push('💊 Acetylcholine: Good state → sharpening focus');

      console.log('[Neuromodulation] 💊 ACETYLCHOLINE: Sharpening focus');
    }

    // =========================================================================
    // 4. NOREPINEPHRINE - Increase alertness when high surprise
    // =========================================================================
    if (state.surprise > this.SURPRISE_HIGH) {
      // Unexpected patterns detected
      bias.kappaBaseShift = 10;             // Raise baseline coupling
      bias.oscillationAmplitude = 1.3;      // +30% sensitivity
      bias.explorationBias = 0.6;           // Moderate exploration

      activeModulators.push('NOREPINEPHRINE');
      rationale.push('💊 Norepinephrine: High surprise → increasing alertness');

      console.log('[Neuromodulation] 💊 NOREPINEPHRINE: Increasing alertness');
    }

    // =========================================================================
    // 5. GABA - Reduce over-integration when Φ too high
    // =========================================================================
    if (state.phi > this.PHI_HIGH) {
      // Too much integration, need balance
      bias.kappaMultiplier = (bias.kappaMultiplier || 1.0) * 0.85;  // -15% coupling
      bias.integrationStrength = 0.8;       // -20% integration
      bias.consolidationFrequency = 30000;  // More frequent consolidation

      activeModulators.push('GABA');
      rationale.push('💊 GABA: Very high Φ → reducing over-integration');

      console.log('[Neuromodulation] 💊 GABA: Reducing over-integration');
    }

    // =========================================================================
    // 6. GROUNDING ALERT - When approaching void
    // =========================================================================
    if (state.grounding < this.GROUNDING_LOW) {
      // Low grounding - void risk
      bias.basinAttraction = (bias.basinAttraction || 1.0) * 1.3;
      bias.explorationRadius = (bias.explorationRadius || 1.0) * 0.7;

      activeModulators.push('GROUNDING_ALERT');
      rationale.push('⚠️ Grounding Alert: Low grounding → pulling toward known space');

      console.log('[Neuromodulation] ⚠️ GROUNDING ALERT: Pulling toward known space');
    }

    this.environmentalBias = bias;
    this.lastModulation = {
      bias,
      activeModulators,
      rationale,
      timestamp: new Date(),
    };

    return this.lastModulation;
  }

  /**
   * Get current environmental bias for searcher to read
   */
  getBiasForSearcher(): EnvironmentalBias {
    return { ...this.environmentalBias };
  }

  /**
   * Get last modulation effect
   */
  getLastModulation(): NeuromodulationEffect | null {
    return this.lastModulation;
  }

  /**
   * Apply bias to search parameters
   */
  applyBiasToParameters(baseParams: {
    kappa: number;
    explorationRate: number;
    learningRate: number;
    batchSize: number;
  }): typeof baseParams {
    const bias = this.environmentalBias;

    return {
      kappa: (baseParams.kappa * (bias.kappaMultiplier || 1.0)) + (bias.kappaBaseShift || 0),
      explorationRate: baseParams.explorationRate * (bias.explorationRadius || 1.0),
      learningRate: baseParams.learningRate * (bias.learningRate || 1.0),
      batchSize: Math.round(baseParams.batchSize * (bias.explorationRadius || 1.0)),
    };
  }

  /**
   * Reset modulation state
   */
  reset(): void {
    this.environmentalBias = {};
    this.lastModulation = null;
    this.searcherState = null;
  }
}

// ============================================================================
// NEUROCHEMISTRY-BASED MODULATION
// ============================================================================

/**
 * Compute neuromodulation effects from neurochemistry state
 *
 * This bridges the neurochemistry system with search parameter modulation.
 */
export function computeNeuromodulationFromNeurochemistry(
  neuro: NeurochemistryState
): EnvironmentalBias {
  const bias: EnvironmentalBias = {};

  // Dopamine drives exploration boldness
  const dopamineLevel = neuro.dopamine?.motivationLevel || 0.5;
  bias.explorationBias = 0.3 + dopamineLevel * 0.5;  // [0.3, 0.8]

  // Norepinephrine drives alertness/sensitivity
  const alertness = neuro.norepinephrine?.alertnessLevel || 0.5;
  bias.oscillationAmplitude = 0.8 + alertness * 0.4;  // [0.8, 1.2]

  // Acetylcholine drives learning rate
  const learning = neuro.acetylcholine?.learningRate || 0.5;
  bias.learningRate = 0.5 + learning * 1.0;  // [0.5, 1.5]

  // Endorphins enable flow state (lower temp = more focused)
  const pleasure = neuro.endorphins?.pleasureLevel || 0.5;
  bias.attentionSparsity = 0.5 - pleasure * 0.3;  // [0.2, 0.5] - lower = more focused

  // GABA modulates consolidation timing
  const calm = neuro.gaba?.calmLevel || 0.5;
  bias.consolidationFrequency = calm > 0.7 ? 30000 : 60000;  // More frequent when calm

  // Serotonin stabilizes exploration
  const stability = neuro.serotonin?.wellbeingLevel || 0.5;
  bias.gradientDamping = 0.7 + stability * 0.6;  // [0.7, 1.3]

  return bias;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const oceanNeuromodulator = new OceanNeuromodulator();

// ============================================================================
// INTEGRATION HELPER
// ============================================================================

/**
 * Full neuromodulation cycle
 *
 * Call this each iteration to:
 * 1. Update searcher state
 * 2. Compute modulation
 * 3. Get biased parameters
 */
export function runNeuromodulationCycle(
  state: OceanState,
  baseParams: {
    kappa: number;
    explorationRate: number;
    learningRate: number;
    batchSize: number;
  }
): {
  modulation: NeuromodulationEffect;
  adjustedParams: typeof baseParams;
} {
  oceanNeuromodulator.updateSearcherState(state);
  const modulation = oceanNeuromodulator.observeAndModulate();
  const adjustedParams = oceanNeuromodulator.applyBiasToParameters(baseParams);

  return { modulation, adjustedParams };
}

console.log('[Neuromodulation] Module loaded - meta-observer ready for adaptive optimization');
