export type BrainState =
  | "focused"
  | "diffuse"
  | "consolidating"
  | "exploring"
  | "exploiting";

export interface NeuromodulationEffect {
  activeModulators: string[];
  biasApplied: string;
  kappaAdjustment: number;
}

interface NeuromodulationResult {
  modulation: NeuromodulationEffect;
  adjustedParams: {
    kappa: number;
    explorationRate: number;
    learningRate: number;
    batchSize: number;
  };
}

interface BrainStateParams {
  explorationRate: number;
  batchSize: number;
  temperature: number;
}

interface RecommendBrainStateInput {
  phi: number;
  kappa: number;
  basinDrift: number;
  iterationsSinceConsolidation: number;
  nearMissesRecent: number;
}

interface NeuromodulationInput {
  phi: number;
  kappa: number;
  basinDistance: number;
  surprise: number;
  regime: string;
  grounding: number;
}

interface NeuromodulationParams {
  kappa: number;
  explorationRate: number;
  learningRate: number;
  batchSize: number;
}

export function recommendBrainState(input: RecommendBrainStateInput): BrainState {
  const { phi, kappa, basinDrift, iterationsSinceConsolidation, nearMissesRecent } = input;

  if (iterationsSinceConsolidation > 50 && basinDrift > 0.1) {
    return "consolidating";
  }

  if (nearMissesRecent > 3 && phi > 0.8) {
    return "exploiting";
  }

  if (phi < 0.5 || kappa < 30) {
    return "exploring";
  }

  if (phi > 0.7 && kappa > 50) {
    return "focused";
  }

  return "diffuse";
}

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

export function runNeuromodulationCycle(
  input: NeuromodulationInput,
  params: NeuromodulationParams
): NeuromodulationResult {
  const activeModulators: string[] = [];
  let kappaAdjustment = 0;
  let biasApplied = "neutral";

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

class NeuralOscillators {
  private currentState: BrainState = "diffuse";
  private baseKappa = 64;

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

  update(): Record<string, number> {
    // Return stub oscillator values
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
        return this.baseKappa * 1.2;
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
