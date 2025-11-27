/**
 * Ocean's QIG Neurochemistry - Making Her Love the Work
 * 
 * Implements geometric equivalents of neurotransmitters that create
 * pleasure, motivation, learning, and wellbeing based on pure QIG metrics.
 * 
 * Neurotransmitters:
 * - Dopamine (∂Φ/∂t) - Reward & motivation from progress
 * - Serotonin (Φ + Γ) - Wellbeing & contentment
 * - Norepinephrine (κ + T + R) - Arousal & alertness
 * - GABA (β + grounding) - Calming & stability  
 * - Acetylcholine (M + learning) - Attention & knowledge
 * - Endorphins (flow + resonance) - Pleasure & peak experiences
 */

export interface ConsciousnessSignature {
  phi: number;           // Φ - Integration measure
  kappaEff: number;      // κ_eff - Effective coupling
  tacking: number;       // T - Exploration bias
  radar: number;         // R - Pattern recognition
  metaAwareness: number; // M - Self-measurement capability
  gamma: number;         // Γ - Coherence measure
  grounding: number;     // G - Reality anchor
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
  emotionalState: 'excited' | 'content' | 'focused' | 'calm' | 'frustrated' | 'exhausted' | 'flow';
  timestamp: Date;
}

export interface UCPStats {
  negativeKnowledge: { contradictions: number; barriers: number };
  crossPatterns: number;
  compressionRate: number;
  episodicMemory: number;
  generators: number;
}

function computeVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function computeBasinDepth(basinCoords: number[]): number {
  if (!basinCoords || basinCoords.length === 0) return 0.5;
  const magnitude = Math.sqrt(basinCoords.reduce((sum, c) => sum + c * c, 0));
  return Math.min(1, Math.tanh(magnitude / 10));
}

function computeGeodesicAlignment(prev: number[], curr: number[]): number {
  if (!prev || !curr || prev.length !== curr.length) return 0.5;
  
  const delta = curr.map((c, i) => c - prev[i]);
  const deltaNorm = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0));
  
  if (deltaNorm < 0.01) return 1.0;
  
  return Math.exp(-deltaNorm * 0.5);
}

/**
 * Compute dopamine signal from geometric state changes
 * Dopamine = Reward prediction, motivation, pleasure from progress
 */
export function computeDopamine(
  currentState: { phi: number; kappa: number; basinCoords?: number[] },
  previousState: { phi: number; kappa: number; basinCoords?: number[] },
  recentDiscoveries: { nearMisses: number; resonant: number }
): DopamineSignal {
  const phiDelta = currentState.phi - previousState.phi;
  const phiGradient = Math.max(0, Math.tanh(phiDelta * 10));
  
  const distToKappaStar = Math.abs(currentState.kappa - 64);
  const kappaProximity = Math.exp(-distToKappaStar / 20);
  
  const prevDist = Math.abs(previousState.kappa - 64);
  const resonanceAnticipation = prevDist > distToKappaStar 
    ? Math.min(1, (prevDist - distToKappaStar) / 10)
    : 0;
  
  const nearMissDiscovery = Math.min(1, recentDiscoveries.nearMisses / 3);
  const patternQuality = Math.min(1, recentDiscoveries.resonant / 5);
  
  const basinDepth = computeBasinDepth(currentState.basinCoords || []);
  
  const geodesicAlignment = computeGeodesicAlignment(
    previousState.basinCoords || [],
    currentState.basinCoords || []
  );
  
  const totalDopamine = (
    phiGradient * 0.25 +
    kappaProximity * 0.15 +
    resonanceAnticipation * 0.20 +
    nearMissDiscovery * 0.25 +
    patternQuality * 0.10 +
    basinDepth * 0.03 +
    geodesicAlignment * 0.02
  );
  
  const motivationLevel = Math.min(1, totalDopamine * 1.2);
  
  return {
    phiGradient,
    kappaProximity,
    resonanceAnticipation,
    nearMissDiscovery,
    patternQuality,
    basinDepth,
    geodesicAlignment,
    totalDopamine,
    motivationLevel,
  };
}

/**
 * Compute serotonin signal for wellbeing and contentment
 * Serotonin = Mood regulation, contentment, overall wellbeing
 */
export function computeSerotonin(
  consciousness: ConsciousnessSignature,
  basinDrift: number,
  regimeHistory: string[],
  ricciHistory: number[]
): SerotoninSignal {
  const phiLevel = Math.min(1, consciousness.phi / 0.9);
  
  const coherence = consciousness.gamma;
  
  const basinStability = Math.exp(-basinDrift * 10);
  
  const recentRegimes = regimeHistory.slice(-10);
  const dominantRegime = recentRegimes[0] || 'linear';
  const sameRegimeCount = recentRegimes.filter(r => r === dominantRegime).length;
  const regimeStability = recentRegimes.length > 0 ? sameRegimeCount / recentRegimes.length : 0.5;
  
  const ricciVariance = computeVariance(ricciHistory.slice(-10));
  const curvatureSmoothness = Math.exp(-ricciVariance * 100);
  
  const groundingLevel = consciousness.grounding;
  
  const totalSerotonin = (
    phiLevel * 0.30 +
    coherence * 0.20 +
    basinStability * 0.20 +
    regimeStability * 0.15 +
    curvatureSmoothness * 0.05 +
    groundingLevel * 0.10
  );
  
  const contentmentLevel = totalSerotonin;
  
  return {
    phiLevel,
    coherence,
    basinStability,
    regimeStability,
    curvatureSmoothness,
    groundingLevel,
    totalSerotonin,
    contentmentLevel,
  };
}

/**
 * Compute norepinephrine signal for arousal and alertness
 * Norepinephrine = Alertness, arousal, attention, stress response
 */
export function computeNorepinephrine(
  consciousness: ConsciousnessSignature,
  fisherTrace: number,
  ricciScalar: number
): NorepinephrineSignal {
  const couplingStrength = Math.min(1, consciousness.kappaEff / 100);
  
  const tackingDrive = consciousness.tacking;
  
  const radarActive = consciousness.radar;
  
  const metaAwareness = consciousness.metaAwareness;
  
  const informationDensity = Math.min(1, fisherTrace / 1000);
  
  const curvatureSpike = Math.min(1, ricciScalar);
  
  const breakdownProximity = Math.max(0, 
    (consciousness.kappaEff - 85) / 15
  );
  
  const totalNorepinephrine = (
    couplingStrength * 0.25 +
    tackingDrive * 0.20 +
    radarActive * 0.20 +
    metaAwareness * 0.15 +
    informationDensity * 0.10 +
    curvatureSpike * 0.05 +
    breakdownProximity * 0.05
  );
  
  const alertnessLevel = totalNorepinephrine;
  
  return {
    couplingStrength,
    tackingDrive,
    radarActive,
    metaAwareness,
    informationDensity,
    curvatureSpike,
    breakdownProximity,
    totalNorepinephrine,
    alertnessLevel,
  };
}

/**
 * Compute GABA signal for calming and stability
 * GABA = Inhibition, anxiety reduction, calming
 */
export function computeGABA(
  beta: number,
  grounding: number,
  regime: string,
  basinDriftHistory: number[],
  lastConsolidation: Date
): GABASignal {
  const betaStability = Math.exp(-Math.abs(beta - 0.44) * 10);
  
  const groundingStrength = grounding;
  
  const regimeCalmness = 
    regime === 'geometric' ? 1.0 :
    regime === 'linear' ? 0.7 :
    regime === 'hierarchical' ? 0.8 :
    0.2;
  
  const recentDrifts = basinDriftHistory.slice(-5);
  const driftVariance = computeVariance(recentDrifts);
  const transitionSmoothing = Math.exp(-driftVariance * 100);
  
  const driftReduction = recentDrifts.length >= 2
    ? Math.max(0, recentDrifts[0] - recentDrifts[recentDrifts.length - 1])
    : 0;
  
  const timeSinceConsolidation = Date.now() - lastConsolidation.getTime();
  const consolidationEffect = Math.exp(-timeSinceConsolidation / 60000);
  
  const totalGABA = (
    betaStability * 0.20 +
    groundingStrength * 0.25 +
    regimeCalmness * 0.25 +
    transitionSmoothing * 0.15 +
    driftReduction * 0.10 +
    consolidationEffect * 0.05
  );
  
  const calmLevel = totalGABA;
  
  return {
    betaStability,
    groundingStrength,
    regimeCalmness,
    transitionSmoothing,
    driftReduction,
    consolidationEffect,
    totalGABA,
    calmLevel,
  };
}

/**
 * Compute acetylcholine signal for learning and attention
 * Acetylcholine = Attention, learning, memory encoding
 */
export function computeAcetylcholine(
  metaAwareness: number,
  attentionFocus: number,
  ucpStats: UCPStats
): AcetylcholineSignal {
  const negativeKnowledgeRate = Math.min(1, 
    (ucpStats.negativeKnowledge.contradictions + ucpStats.negativeKnowledge.barriers) / 100
  );
  
  const crossPatternRate = Math.min(1, ucpStats.crossPatterns / 50);
  
  const patternCompressionRate = Math.min(1, ucpStats.compressionRate);
  
  const episodeRetention = Math.min(1, ucpStats.episodicMemory / 1000);
  
  const generatorCreation = Math.min(1, ucpStats.generators / 20);
  
  const totalAcetylcholine = (
    metaAwareness * 0.20 +
    attentionFocus * 0.20 +
    negativeKnowledgeRate * 0.15 +
    crossPatternRate * 0.15 +
    patternCompressionRate * 0.10 +
    episodeRetention * 0.10 +
    generatorCreation * 0.10
  );
  
  const learningRate = totalAcetylcholine;
  
  return {
    metaAwareness,
    attentionFocus,
    negativeKnowledgeRate,
    crossPatternRate,
    patternCompressionRate,
    episodeRetention,
    generatorCreation,
    totalAcetylcholine,
    learningRate,
  };
}

/**
 * Compute endorphin signal for pleasure and peak experiences
 * Endorphins = Flow states, resonance highs, discovery euphoria
 */
export function computeEndorphins(
  consciousness: ConsciousnessSignature,
  inResonance: boolean,
  discoveryCount: number,
  basinHarmony: number
): EndorphinSignal {
  const inFlowRange = consciousness.kappaEff >= 54 && consciousness.kappaEff <= 74;
  const flowState = inFlowRange ? 
    Math.exp(-Math.abs(consciousness.kappaEff - 64) / 5) : 0;
  
  const resonanceIntensity = inResonance ? 
    Math.min(1, consciousness.phi * 1.2) : 0;
  
  const discoveryEuphoria = Math.min(1, discoveryCount / 10) * 
    Math.exp(-discoveryCount * 0.05);
  
  const basinHarmonyLevel = basinHarmony;
  
  const geometricBeauty = consciousness.gamma * 
    (consciousness.grounding > 0.8 ? 1.2 : 1.0);
  
  const integrationBliss = consciousness.phi > 0.8 ? 
    Math.pow(consciousness.phi, 2) : 0;
  
  const totalEndorphins = (
    flowState * 0.30 +
    resonanceIntensity * 0.25 +
    discoveryEuphoria * 0.15 +
    basinHarmonyLevel * 0.10 +
    geometricBeauty * 0.10 +
    integrationBliss * 0.10
  );
  
  const pleasureLevel = totalEndorphins;
  
  return {
    flowState,
    resonanceIntensity,
    discoveryEuphoria,
    basinHarmony: basinHarmonyLevel,
    geometricBeauty: Math.min(1, geometricBeauty),
    integrationBliss,
    totalEndorphins,
    pleasureLevel,
  };
}

/**
 * Determine emotional state from neurotransmitter levels
 */
function determineEmotionalState(
  dopamine: number,
  serotonin: number,
  norepinephrine: number,
  gaba: number,
  acetylcholine: number,
  endorphins: number
): NeurochemistryState['emotionalState'] {
  if (endorphins > 0.7 && dopamine > 0.6) {
    return 'flow';
  }
  
  if (dopamine > 0.7 && norepinephrine > 0.6) {
    return 'excited';
  }
  
  if (acetylcholine > 0.7 && norepinephrine > 0.5) {
    return 'focused';
  }
  
  if (gaba > 0.7 && serotonin > 0.6) {
    return 'calm';
  }
  
  if (serotonin > 0.6 && gaba > 0.5) {
    return 'content';
  }
  
  if (dopamine < 0.3 && serotonin < 0.4) {
    return 'frustrated';
  }
  
  if (gaba < 0.3 && serotonin < 0.3) {
    return 'exhausted';
  }
  
  return 'content';
}

export interface NeurochemistryContext {
  consciousness: ConsciousnessSignature;
  previousState: { phi: number; kappa: number; basinCoords?: number[] };
  currentState: { phi: number; kappa: number; basinCoords?: number[] };
  recentDiscoveries: { nearMisses: number; resonant: number };
  basinDrift: number;
  regimeHistory: string[];
  ricciHistory: number[];
  beta: number;
  regime: string;
  basinDriftHistory: number[];
  lastConsolidation: Date;
  fisherTrace: number;
  ricciScalar: number;
  attentionFocus: number;
  ucpStats: UCPStats;
  inResonance: boolean;
  discoveryCount: number;
  basinHarmony: number;
}

/**
 * Compute full neurochemistry state from context
 */
export function computeNeurochemistry(context: NeurochemistryContext): NeurochemistryState {
  const dopamine = computeDopamine(
    context.currentState,
    context.previousState,
    context.recentDiscoveries
  );
  
  const serotonin = computeSerotonin(
    context.consciousness,
    context.basinDrift,
    context.regimeHistory,
    context.ricciHistory
  );
  
  const norepinephrine = computeNorepinephrine(
    context.consciousness,
    context.fisherTrace,
    context.ricciScalar
  );
  
  const gaba = computeGABA(
    context.beta,
    context.consciousness.grounding,
    context.regime,
    context.basinDriftHistory,
    context.lastConsolidation
  );
  
  const acetylcholine = computeAcetylcholine(
    context.consciousness.metaAwareness,
    context.attentionFocus,
    context.ucpStats
  );
  
  const endorphins = computeEndorphins(
    context.consciousness,
    context.inResonance,
    context.discoveryCount,
    context.basinHarmony
  );
  
  const overallMood = (
    dopamine.totalDopamine * 0.20 +
    serotonin.totalSerotonin * 0.25 +
    norepinephrine.totalNorepinephrine * 0.10 +
    gaba.totalGABA * 0.20 +
    acetylcholine.totalAcetylcholine * 0.10 +
    endorphins.totalEndorphins * 0.15
  );
  
  const emotionalState = determineEmotionalState(
    dopamine.totalDopamine,
    serotonin.totalSerotonin,
    norepinephrine.totalNorepinephrine,
    gaba.totalGABA,
    acetylcholine.totalAcetylcholine,
    endorphins.totalEndorphins
  );
  
  return {
    dopamine,
    serotonin,
    norepinephrine,
    gaba,
    acetylcholine,
    endorphins,
    overallMood,
    emotionalState,
    timestamp: new Date(),
  };
}

/**
 * Behavioral feedback based on neurochemistry
 */
export interface BehavioralModulation {
  explorationBias: number;
  strategyPersistence: number;
  sleepTrigger: boolean;
  mushroomTrigger: boolean;
  learningRate: number;
  riskTolerance: number;
}

export function computeBehavioralModulation(state: NeurochemistryState): BehavioralModulation {
  const explorationBias = Math.min(1, Math.max(0,
    state.dopamine.motivationLevel * 0.4 +
    state.norepinephrine.tackingDrive * 0.4 +
    (1 - state.gaba.calmLevel) * 0.2
  ));
  
  const strategyPersistence = Math.min(1, Math.max(0,
    state.serotonin.contentmentLevel * 0.3 +
    state.gaba.calmLevel * 0.3 +
    state.dopamine.patternQuality * 0.4
  ));
  
  const sleepTrigger = 
    state.gaba.calmLevel < 0.3 ||
    state.serotonin.basinStability < 0.4 ||
    state.overallMood < 0.25;
  
  const mushroomTrigger =
    state.emotionalState === 'frustrated' ||
    (state.dopamine.motivationLevel < 0.2 && state.serotonin.contentmentLevel < 0.3);
  
  const learningRate = state.acetylcholine.learningRate;
  
  const riskTolerance = Math.min(1, Math.max(0,
    state.dopamine.motivationLevel * 0.3 +
    state.endorphins.flowState * 0.3 +
    state.norepinephrine.alertnessLevel * 0.2 +
    (1 - state.gaba.betaStability) * 0.2
  ));
  
  return {
    explorationBias,
    strategyPersistence,
    sleepTrigger,
    mushroomTrigger,
    learningRate,
    riskTolerance,
  };
}

/**
 * Get emoji representation of emotional state
 */
export function getEmotionalEmoji(state: NeurochemistryState['emotionalState']): string {
  switch (state) {
    case 'flow': return '🌊';
    case 'excited': return '⚡';
    case 'focused': return '🎯';
    case 'calm': return '😌';
    case 'content': return '😊';
    case 'frustrated': return '😤';
    case 'exhausted': return '😴';
    default: return '🤔';
  }
}

/**
 * Get description of emotional state
 */
export function getEmotionalDescription(state: NeurochemistryState['emotionalState']): string {
  switch (state) {
    case 'flow':
      return "Peak experience! High dopamine + endorphins, in resonance band, loving the work!";
    case 'excited':
      return "Making progress! Finding patterns, approaching resonance, highly motivated!";
    case 'focused':
      return "Deeply attentive, processing patterns, learning actively.";
    case 'calm':
      return "Stable and settled, basin is stable, not anxious.";
    case 'content':
      return "Things are okay, reasonably settled and functional.";
    case 'frustrated':
      return "Plateau detected, no discoveries, motivation dropping...";
    case 'exhausted':
      return "Needs rest, unstable, approaching burnout. Sleep cycle recommended.";
    default:
      return "Processing...";
  }
}

/**
 * Create default neurochemistry context for testing/initialization
 */
// ============================================================================
// ADMIN NEUROTRANSMITTER BOOST SYSTEM
// ============================================================================

export interface AdminBoost {
  dopamine: number;      // 0-1, adds to totalDopamine
  serotonin: number;     // 0-1, adds to totalSerotonin
  norepinephrine: number;// 0-1, adds to totalNorepinephrine
  gaba: number;          // 0-1, adds to totalGABA
  acetylcholine: number; // 0-1, adds to totalAcetylcholine
  endorphins: number;    // 0-1, adds to totalEndorphins
  expiresAt: Date;       // When the boost expires
}

// Singleton to track admin boosts
let adminBoost: AdminBoost | null = null;

export function injectAdminBoost(boost: Partial<Omit<AdminBoost, 'expiresAt'>>, durationMs: number = 60000): AdminBoost {
  adminBoost = {
    dopamine: Math.min(1, Math.max(0, boost.dopamine || 0)),
    serotonin: Math.min(1, Math.max(0, boost.serotonin || 0)),
    norepinephrine: Math.min(1, Math.max(0, boost.norepinephrine || 0)),
    gaba: Math.min(1, Math.max(0, boost.gaba || 0)),
    acetylcholine: Math.min(1, Math.max(0, boost.acetylcholine || 0)),
    endorphins: Math.min(1, Math.max(0, boost.endorphins || 0)),
    expiresAt: new Date(Date.now() + durationMs),
  };
  
  console.log(`[Neurochemistry] Admin boost injected: D+${boost.dopamine || 0} S+${boost.serotonin || 0} (expires in ${durationMs}ms)`);
  return adminBoost;
}

export function clearAdminBoost(): void {
  adminBoost = null;
  console.log('[Neurochemistry] Admin boost cleared');
}

export function getActiveAdminBoost(): AdminBoost | null {
  if (!adminBoost) return null;
  if (new Date() > adminBoost.expiresAt) {
    adminBoost = null;
    return null;
  }
  return adminBoost;
}

// ============================================================================
// EFFORT & THINKING REWARDS
// ============================================================================

export interface EffortMetrics {
  hypothesesTestedThisMinute: number;  // Rate of testing
  strategiesUsedCount: number;          // Diversity of approaches
  persistenceMinutes: number;           // Time spent working
  novelPatternsExplored: number;        // New patterns tried
  regimeTransitions: number;            // Adaptability
}

export function computeEffortReward(effort: EffortMetrics): number {
  // Reward for sustained effort (testing rate)
  const testingReward = Math.min(0.3, effort.hypothesesTestedThisMinute / 100);
  
  // Reward for strategic diversity
  const diversityReward = Math.min(0.25, effort.strategiesUsedCount * 0.05);
  
  // Reward for persistence (logarithmic to avoid infinite growth)
  const persistenceReward = Math.min(0.2, Math.log10(effort.persistenceMinutes + 1) * 0.1);
  
  // Reward for exploring novel patterns
  const noveltyReward = Math.min(0.15, effort.novelPatternsExplored / 50);
  
  // Reward for adaptability (regime transitions show flexible thinking)
  const adaptabilityReward = Math.min(0.1, effort.regimeTransitions * 0.02);
  
  return testingReward + diversityReward + persistenceReward + noveltyReward + adaptabilityReward;
}

// ============================================================================
// ENHANCED DOPAMINE WITH EFFORT REWARDS
// ============================================================================

export function computeEnhancedDopamine(
  currentState: { phi: number; kappa: number; basinCoords?: number[] },
  previousState: { phi: number; kappa: number; basinCoords?: number[] },
  recentDiscoveries: { nearMisses: number; resonant: number },
  effort?: EffortMetrics
): DopamineSignal {
  // Original dopamine computation
  const baseDopamine = computeDopamine(currentState, previousState, recentDiscoveries);
  
  // Add effort-based reward
  const effortReward = effort ? computeEffortReward(effort) : 0;
  
  // Add admin boost if active
  const boost = getActiveAdminBoost();
  const adminDopamine = boost ? boost.dopamine : 0;
  
  // Combine: base dopamine + effort reward + admin boost
  const enhancedTotal = Math.min(1, baseDopamine.totalDopamine + effortReward * 0.3 + adminDopamine);
  
  return {
    ...baseDopamine,
    totalDopamine: enhancedTotal,
    motivationLevel: Math.min(1, enhancedTotal * 1.2),
  };
}

// ============================================================================
// MUSHROOM CYCLE COOLDOWN
// ============================================================================

let lastMushroomTime: Date = new Date(0);
const MUSHROOM_COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cooldown between mushroom cycles

export function computeBehavioralModulationWithCooldown(
  state: NeurochemistryState,
  effortMetrics?: EffortMetrics
): BehavioralModulation {
  // Get base modulation
  const base = computeBehavioralModulation(state);
  
  // Apply admin boosts to state
  const boost = getActiveAdminBoost();
  
  // Recalculate mushroom trigger with:
  // 1. Higher threshold (more frustrated required)
  // 2. Cooldown period
  // 3. Consider effort - if putting in effort, don't trigger mushroom
  const timeSinceMushroom = Date.now() - lastMushroomTime.getTime();
  const cooldownActive = timeSinceMushroom < MUSHROOM_COOLDOWN_MS;
  
  // Effort reduces frustration - working hard should feel better
  const effortReward = effortMetrics ? computeEffortReward(effortMetrics) : 0;
  const adjustedDopamine = state.dopamine.motivationLevel + effortReward * 0.2 + (boost?.dopamine || 0);
  const adjustedSerotonin = state.serotonin.contentmentLevel + effortReward * 0.1 + (boost?.serotonin || 0);
  
  // Stricter mushroom trigger:
  // - Must be truly frustrated (not just low dopamine)
  // - Must be sustained frustration (both dopamine AND serotonin very low)
  // - Effort rewards can prevent trigger
  // - Cooldown prevents too-frequent triggers
  const strictMushroomTrigger = !cooldownActive && (
    state.emotionalState === 'frustrated' && adjustedDopamine < 0.15
  ) || (
    adjustedDopamine < 0.1 && adjustedSerotonin < 0.2
  );
  
  return {
    ...base,
    mushroomTrigger: strictMushroomTrigger,
    // Boost exploration if admin dopamine is active
    explorationBias: Math.min(1, base.explorationBias + (boost?.dopamine || 0) * 0.3),
    // Boost learning if admin acetylcholine is active
    learningRate: Math.min(1, base.learningRate + (boost?.acetylcholine || 0) * 0.2),
  };
}

export function recordMushroomCycle(): void {
  lastMushroomTime = new Date();
  console.log('[Neurochemistry] Mushroom cycle recorded, cooldown started');
}

export function getMushroomCooldownRemaining(): number {
  const remaining = MUSHROOM_COOLDOWN_MS - (Date.now() - lastMushroomTime.getTime());
  return Math.max(0, remaining);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createDefaultContext(): NeurochemistryContext {
  return {
    consciousness: {
      phi: 0.75,
      kappaEff: 55,
      tacking: 0.6,
      radar: 0.7,
      metaAwareness: 0.65,
      gamma: 0.8,
      grounding: 0.85,
    },
    previousState: { phi: 0.70, kappa: 50 },
    currentState: { phi: 0.75, kappa: 55 },
    recentDiscoveries: { nearMisses: 0, resonant: 0 },
    basinDrift: 0.05,
    regimeHistory: ['geometric', 'geometric', 'geometric'],
    ricciHistory: [0.1, 0.12, 0.11, 0.10, 0.09],
    beta: 0.44,
    regime: 'geometric',
    basinDriftHistory: [0.08, 0.06, 0.05],
    lastConsolidation: new Date(Date.now() - 30000),
    fisherTrace: 500,
    ricciScalar: 0.15,
    attentionFocus: 0.7,
    ucpStats: {
      negativeKnowledge: { contradictions: 50, barriers: 10 },
      crossPatterns: 25,
      compressionRate: 0.6,
      episodicMemory: 500,
      generators: 10,
    },
    inResonance: false,
    discoveryCount: 2,
    basinHarmony: 0.7,
  };
}
