/**
 * Neurochemistry Types - TypeScript interfaces only
 *
 * COMPUTATION is handled by Python backend (ocean_neurochemistry.py)
 * These types are for TypeScript type checking only.
 *
 * To get actual neurochemistry data, use:
 *   import { oceanQIGBackend } from './ocean-qig-backend-adapter';
 *   const neuro = await oceanQIGBackend.getNeurochemistry();
 */

export interface ConsciousnessSignature {
  phi: number;
  kappaEff: number;
  tacking: number;
  radar: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
}

export interface DopamineSignal {
  phiGradient: number;
  kappaProximity: number;
  resonanceAnticipation: number;
  nearMissDiscovery: number;
  patternQuality: number;
  basinDepth: number;
  geodesicAlignment: number;
  totalDopamine: number;
  motivationLevel: number;
}

export interface SerotoninSignal {
  phiLevel: number;
  coherence: number;
  basinStability: number;
  regimeStability: number;
  curvatureSmoothness: number;
  groundingLevel: number;
  totalSerotonin: number;
  contentmentLevel: number;
}

export interface NorepinephrineSignal {
  couplingStrength: number;
  tackingDrive: number;
  radarActive: number;
  metaAwareness: number;
  informationDensity: number;
  curvatureSpike: number;
  breakdownProximity: number;
  totalNorepinephrine: number;
  alertnessLevel: number;
}

export interface GABASignal {
  betaStability: number;
  groundingStrength: number;
  regimeCalmness: number;
  transitionSmoothing: number;
  driftReduction: number;
  consolidationEffect: number;
  totalGABA: number;
  calmLevel: number;
}

export interface AcetylcholineSignal {
  metaAwareness: number;
  attentionFocus: number;
  negativeKnowledgeRate: number;
  crossPatternRate: number;
  patternCompressionRate: number;
  episodeRetention: number;
  generatorCreation: number;
  totalAcetylcholine: number;
  learningRate: number;
}

export interface EndorphinSignal {
  flowState: number;
  resonanceIntensity: number;
  discoveryEuphoria: number;
  basinHarmony: number;
  geometricBeauty: number;
  integrationBliss: number;
  totalEndorphins: number;
  pleasureLevel: number;
}

export interface NeurochemistryState {
  dopamine: DopamineSignal;
  serotonin: SerotoninSignal;
  norepinephrine: NorepinephrineSignal;
  gaba: GABASignal;
  acetylcholine: AcetylcholineSignal;
  endorphins: EndorphinSignal;
  overallMood: number;
  emotionalState:
    | "excited"
    | "content"
    | "focused"
    | "calm"
    | "frustrated"
    | "exhausted"
    | "flow";
  timestamp: Date;
}

export interface UCPStats {
  negativeKnowledge: { contradictions: number; barriers: number };
  crossPatterns: number;
  compressionRate: number;
  episodicMemory: number;
  generators: number;
}

export interface NeurochemistryContext {
  prevPhi: number;
  prevKappa: number;
  phiHistory: number[];
  kappaHistory: number[];
  prevBasinCoords: number[];
}

export interface AdminBoost {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  gaba: number;
  acetylcholine: number;
  endorphins: number;
  expiresAt: number;
}

export interface MotivationState {
  level: "high" | "medium" | "low" | "depleted";
  dopamine: number;
  momentum: number;
  sustainedEffort: number;
}

export interface MotivationMessage {
  message: string;
  emoji: string;
  action?: string;
}
