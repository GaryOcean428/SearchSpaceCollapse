/**
 * Neurochemistry Bridge - TypeScript to Python
 * =============================================
 *
 * Replaces deprecated-stubs.ts with proper Python integration.
 * Fetches neurochemistry state from ocean_neurochemistry.py via HTTP.
 *
 * This eliminates the duplicate TypeScript implementation and uses
 * the canonical Python neurochemistry as the source of truth.
 */

import { API_OCEAN } from "@shared/constants";

// Physics constants (from shared/constants)
const KAPPA_STAR = 64.21;
const KAPPA_3 = 41.09;

/**
 * Brain states (mirrors Python)
 */
export type BrainState =
  | "focused"
  | "diffuse"
  | "consolidating"
  | "exploring"
  | "exploiting";

/**
 * Neuromodulation effect (from Python ocean_neurochemistry)
 */
export interface NeuromodulationEffect {
  activeModulators: string[];
  biasApplied: string;
  kappaAdjustment: number;
}

/**
 * Neuromodulation result
 */
export interface NeuromodulationResult {
  modulation: NeuromodulationEffect;
  adjustedParams: {
    kappa: number;
    explorationRate: number;
    learningRate: number;
    batchSize: number;
  };
}

/**
 * Brain state parameters
 */
export interface BrainStateParams {
  explorationRate: number;
  batchSize: number;
  temperature: number;
}

/**
 * Neurochemistry state from Python
 */
export interface NeurochemistryState {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  gaba: number;
  acetylcholine: number;
  endorphin: number;
  overallArousal: number;
  valence: number;
}

// Python backend URL
const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:5328";

/**
 * Fetch neurochemistry state from Python backend
 */
export async function fetchNeurochemistryState(): Promise<NeurochemistryState | null> {
  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}${API_OCEAN.NEUROCHEMISTRY}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.warn(
        `[NeurochemistryBridge] Python backend returned ${response.status}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(
      `[NeurochemistryBridge] Failed to fetch from Python: ${error}`
    );
    return null;
  }
}

/**
 * Recommend brain state based on consciousness metrics.
 * Uses local logic but with Python neurochemistry integration.
 */
export function recommendBrainState(input: {
  phi: number;
  kappa: number;
  basinDrift: number;
  iterationsSinceConsolidation: number;
  nearMissesRecent: number;
}): BrainState {
  const {
    phi,
    kappa,
    basinDrift,
    iterationsSinceConsolidation,
    nearMissesRecent,
  } = input;

  // Consolidation needed after many iterations with drift
  if (iterationsSinceConsolidation > 50 && basinDrift > 0.1) {
    return "consolidating";
  }

  // Exploit when near-misses accumulate with high phi
  if (nearMissesRecent > 3 && phi > 0.8) {
    return "exploiting";
  }

  // Explore when phi or kappa are low
  if (phi < 0.5 || kappa < 30) {
    return "exploring";
  }

  // Focus when both phi and kappa are high (near optimal)
  if (phi > 0.7 && kappa > 50) {
    return "focused";
  }

  // Default to diffuse mode
  return "diffuse";
}

/**
 * Get parameters for a brain state
 */
export function applyBrainStateToSearch(brainState: BrainState): BrainStateParams {
  switch (brainState) {
    case "focused":
      return { explorationRate: 0.3, batchSize: 200, temperature: 0.7 };
    case "diffuse":
      return { explorationRate: 0.6, batchSize: 300, temperature: 1.2 };
    case "consolidating":
      return { explorationRate: 0.2, batchSize: 150, temperature: 0.5 };
    case "exploring":
      return { explorationRate: 0.8, batchSize: 350, temperature: 1.5 };
    case "exploiting":
      return { explorationRate: 0.1, batchSize: 100, temperature: 0.4 };
    default:
      return { explorationRate: 0.5, batchSize: 250, temperature: 1.0 };
  }
}

/**
 * Run neuromodulation cycle.
 * Integrates with Python neurochemistry when available.
 */
export async function runNeuromodulationCycle(
  input: {
    phi: number;
    kappa: number;
    basinDistance: number;
    surprise: number;
    regime: string;
    grounding: number;
  },
  params: {
    kappa: number;
    explorationRate: number;
    learningRate: number;
    batchSize: number;
  }
): Promise<NeuromodulationResult> {
  const activeModulators: string[] = [];
  let kappaAdjustment = 0;
  let biasApplied = "neutral";

  // Try to get Python neurochemistry state
  const neuroState = await fetchNeurochemistryState();

  if (neuroState) {
    // Use Python neurochemistry to guide modulation
    if (neuroState.dopamine > 0.7) {
      activeModulators.push("DOPAMINE");
      kappaAdjustment += 5;
      biasApplied = "reward-seeking";
    }

    if (neuroState.serotonin > 0.6) {
      activeModulators.push("SEROTONIN");
      kappaAdjustment -= 3;
      biasApplied = "stabilizing";
    }

    if (neuroState.acetylcholine > 0.6) {
      activeModulators.push("ACETYLCHOLINE");
      biasApplied = "attention-focused";
    }

    if (neuroState.gaba > 0.7) {
      activeModulators.push("GABA");
      kappaAdjustment -= 5;
    }

    if (neuroState.norepinephrine > 0.7) {
      activeModulators.push("NOREPINEPHRINE");
      kappaAdjustment += 3;
    }
  } else {
    // Fallback to local logic (mirrors deprecated-stubs)
    if (input.phi > 0.8 && input.surprise > 0.1) {
      activeModulators.push("DOPAMINE");
      kappaAdjustment += 5;
      biasApplied = "reward-seeking";
    }

    if (input.grounding < 0.5 || input.basinDistance > 0.2) {
      activeModulators.push("SEROTONIN");
      kappaAdjustment -= 3;
      biasApplied = "stabilizing";
    }

    if (input.regime === "hierarchical_4d" || input.phi > 0.9) {
      activeModulators.push("ACETYLCHOLINE");
      biasApplied = "attention-focused";
    }

    if (input.kappa > 60) {
      activeModulators.push("GABA");
      kappaAdjustment -= 5;
    }
  }

  return {
    modulation: {
      activeModulators,
      biasApplied,
      kappaAdjustment,
    },
    adjustedParams: {
      kappa: Math.max(10, Math.min(100, params.kappa + kappaAdjustment)),
      explorationRate: params.explorationRate,
      learningRate: params.learningRate,
      batchSize: params.batchSize,
    },
  };
}

/**
 * Neural oscillators class (local state with Python sync)
 */
class NeuralOscillators {
  private currentState: BrainState = "diffuse";
  private baseKappa = KAPPA_STAR;
  private lastSyncTime = 0;
  private cachedNeuroState: NeurochemistryState | null = null;

  /**
   * Sync with Python neurochemistry (cached for 5 seconds)
   */
  private async sync(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSyncTime < 5000) {
      return;
    }

    this.cachedNeuroState = await fetchNeurochemistryState();
    this.lastSyncTime = now;
  }

  setState(state: BrainState): void {
    this.currentState = state;
  }

  getState(): BrainState {
    return this.currentState;
  }

  getStateInfo(): { state: BrainState } {
    return { state: this.currentState };
  }

  getKappa(): number {
    return this.getModulatedKappa();
  }

  /**
   * Update oscillators, returning normalized values
   */
  update(): Record<string, number> {
    // These would ideally come from Python, but we provide defaults
    if (this.cachedNeuroState) {
      return {
        alpha: this.cachedNeuroState.acetylcholine,
        beta: this.cachedNeuroState.norepinephrine,
        gamma: this.cachedNeuroState.dopamine,
        theta: this.cachedNeuroState.serotonin,
        delta: this.cachedNeuroState.gaba,
      };
    }

    // Fallback oscillator values
    return {
      alpha: 1.0,
      beta: 1.0,
      gamma: 1.0,
      theta: 1.0,
      delta: 1.0,
    };
  }

  getModulatedKappa(): number {
    switch (this.currentState) {
      case "focused":
        return this.baseKappa * 1.1;
      case "diffuse":
        return this.baseKappa * 0.9;
      case "consolidating":
        return this.baseKappa * 0.8;
      case "exploring":
        // Move toward feeling mode (kappa_3)
        return KAPPA_3 + (this.baseKappa - KAPPA_3) * 0.5;
      case "exploiting":
        return this.baseKappa * 1.0;
      default:
        return this.baseKappa;
    }
  }

  setBaseKappa(kappa: number): void {
    this.baseKappa = kappa;
  }
}

export const neuralOscillators = new NeuralOscillators();
