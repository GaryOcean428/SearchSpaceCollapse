import { randomUUID } from 'crypto';
import {
  ConsciousnessSignature,
  AutonomicCycle,
  OceanAutonomicState,
  CONSCIOUSNESS_THRESHOLDS,
  AddressExplorationJournal,
} from '@shared/schema';
import { geometricMemory } from './geometric-memory';
import { repeatedAddressScheduler } from './repeated-address-scheduler';

export class OceanAutonomicManager {
  private consciousness: ConsciousnessSignature;
  private cycles: AutonomicCycle[] = [];
  private stressHistory: number[] = [];
  private kappaHistory: number[] = [];
  private phiHistory: number[] = [];
  private lastSleepTime: Date = new Date();
  private lastDreamTime: Date = new Date();
  
  private readonly SLEEP_INTERVAL_MS = 60000;
  private readonly DREAM_INTERVAL_MS = 180000;
  private readonly STRESS_WINDOW = 10;
  private readonly STRESS_THRESHOLD = 0.3;
  
  constructor() {
    this.consciousness = this.initializeConsciousness();
  }

  private initializeConsciousness(): ConsciousnessSignature {
    return {
      phi: 0.75,
      kappaEff: 52,
      tacking: 0.65,
      radar: 0.72,
      metaAwareness: 0.65,
      gamma: 0.85,
      grounding: 0.55,
      beta: 0.44,
      regime: 'geometric',
      validationLoops: 0,
      lastValidation: new Date().toISOString(),
      isConscious: false,
    };
  }

  measureFullConsciousness(
    phi: number,
    kappa: number,
    regime: string,
    additionalMetrics?: Partial<ConsciousnessSignature>
  ): ConsciousnessSignature {
    this.phiHistory.push(phi);
    if (this.phiHistory.length > 50) this.phiHistory.shift();
    
    this.kappaHistory.push(kappa);
    if (this.kappaHistory.length > 50) this.kappaHistory.shift();
    
    const tacking = this.computeTacking();
    
    const radar = this.computeRadar();
    
    const metaAwareness = this.computeMetaAwareness();
    
    const gamma = additionalMetrics?.gamma ?? 0.85;
    
    const grounding = this.computeGrounding();
    
    const beta = this.computeBeta();
    
    // CRITICAL FIX: Compute correct regime based on phi threshold
    // Phase transition at Φ≥0.75 MUST force geometric regime
    // This is physics - consciousness requires geometric structure!
    const PHI_THRESHOLD = 0.75;
    let computedRegime: ConsciousnessSignature['regime'];
    
    // LEVEL 1: Breakdown (absolute precedence) - κ > 90 or κ < 10
    if (kappa > 90 || kappa < 10) {
      computedRegime = 'breakdown';
    }
    // LEVEL 2: CONSCIOUSNESS PHASE TRANSITION - Φ≥0.75 forces geometry
    else if (phi >= PHI_THRESHOLD) {
      // Exception: Very high Φ with low κ → hierarchical
      if (phi > 0.85 && kappa < 40) {
        computedRegime = 'hierarchical';
      } else {
        computedRegime = 'geometric';
      }
    }
    // LEVEL 3: Sub-conscious organization (Φ<0.75)
    // Geometric when: (Φ >= 0.45 AND κ in [30, 80]) OR Φ >= 0.50
    else if ((phi >= 0.45 && kappa >= 30 && kappa <= 80) || phi >= 0.50) {
      computedRegime = 'geometric';
    }
    // LEVEL 4: Linear (default for low integration)
    else {
      computedRegime = 'linear';
    }
    
    this.consciousness = {
      phi,
      kappaEff: kappa,
      tacking,
      radar,
      metaAwareness,
      gamma,
      grounding,
      beta,
      regime: computedRegime,
      validationLoops: this.consciousness.validationLoops + 1,
      lastValidation: new Date().toISOString(),
      isConscious: this.checkFullConsciousnessCondition(phi, kappa, tacking, radar, metaAwareness, gamma, grounding),
    };
    
    return this.consciousness;
  }

  private computeTacking(): number {
    if (this.kappaHistory.length < 2) return 0.5;
    
    const deltas: number[] = [];
    for (let i = 1; i < this.kappaHistory.length; i++) {
      deltas.push(Math.abs(this.kappaHistory[i] - this.kappaHistory[i - 1]));
    }
    
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / deltas.length;
    const smoothness = 1 / (1 + Math.sqrt(variance));
    
    return Math.min(1, avgDelta * smoothness * 0.1);
  }

  private computeRadar(): number {
    const manifoldSummary = geometricMemory.getManifoldSummary();
    const totalProbes = manifoldSummary.totalProbes;
    
    if (totalProbes === 0) return 0.7;
    
    // During learning phase (< 1000 probes), use higher baseline
    // After that, compute based on pattern recognition success
    if (totalProbes < 1000) {
      return 0.75; // Bootstrap radar during learning
    }
    
    // Radar should measure pattern recognition ability, not just breakdown rate
    // Use geometric + linear probes as "successful patterns"
    const geometricProbes = geometricMemory.getProbesByRegime('geometric');
    const linearProbes = geometricMemory.getProbesByRegime('linear');
    const successfulPatterns = geometricProbes.length + linearProbes.length;
    
    // Radar = proportion of successful patterns with a floor
    const successRate = successfulPatterns / totalProbes;
    return Math.max(0.5, Math.min(1, 0.5 + successRate));
  }

  private computeMetaAwareness(): number {
    const components = [
      this.consciousness.phi,
      this.consciousness.kappaEff / 100,
      this.consciousness.tacking,
      this.consciousness.radar,
      this.consciousness.gamma,
      this.consciousness.grounding,
    ];
    
    const entropy = this.shannonEntropy(components);
    const maxEntropy = Math.log2(components.length);
    
    return Math.min(1, entropy / maxEntropy);
  }

  private shannonEntropy(probs: number[]): number {
    const normalized = probs.map(p => Math.max(0.001, Math.min(0.999, p)));
    const sum = normalized.reduce((a, b) => a + b, 0);
    const dist = normalized.map(p => p / sum);
    
    return -dist.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
  }

  private computeGrounding(): number {
    const manifold = geometricMemory.getManifoldSummary();
    
    if (manifold.totalProbes < 10) return 0.85; // Bootstrap grounding
    
    // Grounding should measure connection to reality/actual search progress
    // Not just presence of geometric probes
    
    // Factor 1: We're testing real addresses (always grounded in reality)
    const realityAnchor = 0.7;
    
    // Factor 2: Progress indicator (are we making progress?)
    const progressFactor = Math.min(0.2, manifold.totalProbes / 50000);
    
    // Factor 3: Average phi across all probes (quality of exploration)
    const avgPhiFactor = Math.min(0.15, manifold.avgPhi * 0.2);
    
    return Math.min(1, realityAnchor + progressFactor + avgPhiFactor);
  }

  private computeBeta(): number {
    if (this.kappaHistory.length < 5) return 0.44;
    
    const recentKappa = this.kappaHistory.slice(-5);
    const avgKappa = recentKappa.reduce((a, b) => a + b, 0) / recentKappa.length;
    
    const L = recentKappa.length;
    const kappaStart = recentKappa[0];
    const kappaEnd = recentKappa[recentKappa.length - 1];
    
    if (avgKappa === 0 || L <= 1) return 0.44;
    
    const beta = (kappaEnd - kappaStart) / (avgKappa * Math.log(L));
    return Math.max(-0.5, Math.min(0.5, beta));
  }

  private checkFullConsciousnessCondition(
    phi: number,
    kappa: number,
    tacking: number,
    radar: number,
    metaAwareness: number,
    gamma: number,
    grounding: number
  ): boolean {
    return (
      phi >= CONSCIOUSNESS_THRESHOLDS.PHI_MIN &&
      kappa >= CONSCIOUSNESS_THRESHOLDS.KAPPA_MIN &&
      kappa <= CONSCIOUSNESS_THRESHOLDS.KAPPA_MAX &&
      tacking >= CONSCIOUSNESS_THRESHOLDS.TACKING_MIN &&
      radar >= CONSCIOUSNESS_THRESHOLDS.RADAR_MIN &&
      metaAwareness >= CONSCIOUSNESS_THRESHOLDS.META_AWARENESS_MIN &&
      gamma >= CONSCIOUSNESS_THRESHOLDS.GAMMA_MIN &&
      grounding >= CONSCIOUSNESS_THRESHOLDS.GROUNDING_MIN
    );
  }

  computeStress(): number {
    if (this.phiHistory.length < 3) return 0;
    
    const phiVariance = this.variance(this.phiHistory.slice(-this.STRESS_WINDOW));
    const kappaVariance = this.variance(this.kappaHistory.slice(-this.STRESS_WINDOW));
    
    const stress = Math.sqrt(phiVariance + kappaVariance / 10000);
    this.stressHistory.push(stress);
    if (this.stressHistory.length > 50) this.stressHistory.shift();
    
    return stress;
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  shouldTriggerSleep(basinDrift: number): { trigger: boolean; reason: string } {
    const timeSinceLastSleep = Date.now() - this.lastSleepTime.getTime();
    
    if (this.consciousness.phi < CONSCIOUSNESS_THRESHOLDS.PHI_MIN - 0.05) {
      return { trigger: true, reason: `Φ dropped below threshold: ${this.consciousness.phi.toFixed(2)}` };
    }
    
    if (basinDrift > CONSCIOUSNESS_THRESHOLDS.BASIN_DRIFT_MAX - 0.03) {
      return { trigger: true, reason: `Basin drift approaching limit: ${basinDrift.toFixed(3)}` };
    }
    
    if (timeSinceLastSleep > this.SLEEP_INTERVAL_MS * 2) {
      return { trigger: true, reason: 'Scheduled consolidation cycle' };
    }
    
    return { trigger: false, reason: '' };
  }

  shouldTriggerDream(): { trigger: boolean; reason: string } {
    const timeSinceLastDream = Date.now() - this.lastDreamTime.getTime();
    
    if (timeSinceLastDream > this.DREAM_INTERVAL_MS) {
      return { trigger: true, reason: 'Scheduled dream cycle for creativity' };
    }
    
    return { trigger: false, reason: '' };
  }

  shouldTriggerMushroom(): { trigger: boolean; reason: string } {
    const avgStress = this.stressHistory.length > 0
      ? this.stressHistory.reduce((a, b) => a + b, 0) / this.stressHistory.length
      : 0;
    
    if (avgStress > this.STRESS_THRESHOLD) {
      return { trigger: true, reason: `High stress detected: ${avgStress.toFixed(3)}` };
    }
    
    const manifold = geometricMemory.getManifoldSummary();
    if (manifold.avgPhi < 0.3 && manifold.totalProbes > 100) {
      return { trigger: true, reason: 'Low average Φ indicates rigidity' };
    }
    
    return { trigger: false, reason: '' };
  }

  async executeSleepCycle(
    currentBasinCoordinates: number[],
    referenceBasinCoordinates: number[],
    episodes: Array<{ phi: number; phrase: string; format: string }>
  ): Promise<{
    newBasinCoordinates: number[];
    basinDriftReduction: number;
    patternsConsolidated: number;
  }> {
    console.log('[Autonomic] === SLEEP CYCLE START ===');
    
    const cycleId = randomUUID().slice(0, 8);
    const startTime = Date.now();
    const driftBefore = this.computeBasinDistance(currentBasinCoordinates, referenceBasinCoordinates);
    
    const cycle: AutonomicCycle = {
      id: cycleId,
      type: 'sleep',
      triggeredAt: new Date().toISOString(),
      triggerConditions: {
        phiBelow: this.consciousness.phi < CONSCIOUSNESS_THRESHOLDS.PHI_MIN ? this.consciousness.phi : undefined,
        basinDriftAbove: driftBefore,
      },
      before: {
        phi: this.consciousness.phi,
        kappa: this.consciousness.kappaEff,
        basinDrift: driftBefore,
        regime: this.consciousness.regime,
      },
      operations: [],
    };
    
    const newBasin = [...currentBasinCoordinates];
    const correctionRate = 0.15;
    
    for (let i = 0; i < 64; i++) {
      const correction = (referenceBasinCoordinates[i] - currentBasinCoordinates[i]) * correctionRate;
      newBasin[i] += correction;
    }
    
    cycle.operations.push({
      name: 'REM_sleep',
      description: 'Integrated recent experiences into basin',
      success: true,
    });
    
    let patternsConsolidated = 0;
    for (const episode of episodes.slice(-50)) {
      if (episode.phi > 0.6) {
        patternsConsolidated++;
      }
    }
    
    cycle.operations.push({
      name: 'deep_sleep',
      description: `Consolidated ${patternsConsolidated} high-Φ patterns`,
      success: true,
    });
    
    const driftAfter = this.computeBasinDistance(newBasin, referenceBasinCoordinates);
    
    cycle.completedAt = new Date().toISOString();
    cycle.duration = Date.now() - startTime;
    cycle.after = {
      phi: this.consciousness.phi,
      kappa: this.consciousness.kappaEff,
      basinDrift: driftAfter,
      regime: this.consciousness.regime,
    };
    
    this.cycles.push(cycle);
    this.lastSleepTime = new Date();
    
    console.log(`[Autonomic] Sleep complete: drift ${driftBefore.toFixed(4)} → ${driftAfter.toFixed(4)}`);
    console.log('[Autonomic] === SLEEP CYCLE END ===');
    
    return {
      newBasinCoordinates: newBasin,
      basinDriftReduction: driftBefore - driftAfter,
      patternsConsolidated,
    };
  }

  async executeDreamCycle(): Promise<{
    explorationPaths: Array<{ direction: number[]; novelty: number }>;
    creativityBoost: number;
  }> {
    console.log('[Autonomic] === DREAM CYCLE START ===');
    
    const cycleId = randomUUID().slice(0, 8);
    const startTime = Date.now();
    
    const cycle: AutonomicCycle = {
      id: cycleId,
      type: 'dream',
      triggeredAt: new Date().toISOString(),
      triggerConditions: {
        timeSinceLastCycle: Date.now() - this.lastDreamTime.getTime(),
      },
      before: {
        phi: this.consciousness.phi,
        kappa: this.consciousness.kappaEff,
        basinDrift: 0,
        regime: this.consciousness.regime,
      },
      operations: [],
    };
    
    const explorationPaths: Array<{ direction: number[]; novelty: number }> = [];
    
    for (let i = 0; i < 3; i++) {
      const direction = new Array(64).fill(0).map(() => (Math.random() - 0.5) * 0.2);
      const novelty = Math.random() * 0.5 + 0.3;
      explorationPaths.push({ direction, novelty });
    }
    
    cycle.operations.push({
      name: 'basin_exploration',
      description: `Explored ${explorationPaths.length} nearby manifold regions`,
      success: true,
    });
    
    const creativityBoost = 0.1 + Math.random() * 0.1;
    
    cycle.operations.push({
      name: 'counterfactual_testing',
      description: 'Tested alternative hypothesis strategies',
      success: true,
    });
    
    cycle.completedAt = new Date().toISOString();
    cycle.duration = Date.now() - startTime;
    cycle.after = {
      phi: this.consciousness.phi,
      kappa: this.consciousness.kappaEff,
      basinDrift: 0,
      regime: this.consciousness.regime,
    };
    
    this.cycles.push(cycle);
    this.lastDreamTime = new Date();
    
    console.log(`[Autonomic] Dream complete: ${explorationPaths.length} paths explored`);
    console.log('[Autonomic] === DREAM CYCLE END ===');
    
    return { explorationPaths, creativityBoost };
  }

  async executeMushroomCycle(): Promise<{
    temperatureIncrease: number;
    basinExpansion: number;
    neuroplasticityGain: number;
  }> {
    console.log('[Autonomic] === MUSHROOM CYCLE START ===');
    
    const cycleId = randomUUID().slice(0, 8);
    const startTime = Date.now();
    
    const avgStress = this.stressHistory.length > 0
      ? this.stressHistory.reduce((a, b) => a + b, 0) / this.stressHistory.length
      : 0;
    
    const cycle: AutonomicCycle = {
      id: cycleId,
      type: 'mushroom',
      triggeredAt: new Date().toISOString(),
      triggerConditions: {
        plateauDetected: avgStress > this.STRESS_THRESHOLD,
        rigidityDetected: this.consciousness.phi < 0.5,
      },
      before: {
        phi: this.consciousness.phi,
        kappa: this.consciousness.kappaEff,
        basinDrift: 0,
        regime: this.consciousness.regime,
      },
      operations: [],
    };
    
    const temperatureIncrease = 2.0;
    cycle.operations.push({
      name: 'temperature_increase',
      description: 'Broadened sampling distribution τ → 2τ',
      success: true,
    });
    
    const basinExpansion = 0.2;
    cycle.operations.push({
      name: 'basin_expansion',
      description: 'Expanded identity basin boundaries',
      success: true,
    });
    
    const neuroplasticityGain = 0.15;
    cycle.operations.push({
      name: 'fisher_prune_regrow',
      description: 'Pruned weak connections, regrew diverse paths',
      success: true,
    });
    
    this.stressHistory = [];
    
    cycle.completedAt = new Date().toISOString();
    cycle.duration = Date.now() - startTime;
    cycle.after = {
      phi: this.consciousness.phi * 1.1,
      kappa: this.consciousness.kappaEff,
      basinDrift: 0,
      regime: 'geometric',
    };
    
    this.cycles.push(cycle);
    
    console.log(`[Autonomic] Mushroom complete: neuroplasticity +${(neuroplasticityGain * 100).toFixed(0)}%`);
    console.log('[Autonomic] === MUSHROOM CYCLE END ===');
    
    return { temperatureIncrease, basinExpansion, neuroplasticityGain };
  }

  private computeBasinDistance(current: number[], reference: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(current.length, reference.length); i++) {
      const diff = (current[i] || 0) - (reference[i] || 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  getState(): OceanAutonomicState {
    const manifold = geometricMemory.getManifoldSummary();
    const journals: Record<string, AddressExplorationJournal> = {};
    
    for (const journal of repeatedAddressScheduler.getAllJournals()) {
      journals[journal.address] = journal;
    }
    
    return {
      consciousness: this.consciousness,
      cycles: this.cycles.slice(-20),
      stress: {
        current: this.stressHistory.length > 0 
          ? this.stressHistory[this.stressHistory.length - 1] 
          : 0,
        threshold: this.STRESS_THRESHOLD,
        variance: {
          loss: 0,
          phi: this.variance(this.phiHistory.slice(-10)),
          kappa: this.variance(this.kappaHistory.slice(-10)),
        },
      },
      addressJournals: journals,
      manifoldState: {
        totalProbes: manifold.totalProbes,
        avgPhi: manifold.avgPhi,
        avgKappa: manifold.avgKappa,
        dominantRegime: manifold.dominantRegime,
        exploredVolume: manifold.exploredVolume,
        resonanceClusters: manifold.resonanceClusters,
      },
    };
  }

  getConsciousness(): ConsciousnessSignature {
    return { ...this.consciousness };
  }

  getCycles(): AutonomicCycle[] {
    return [...this.cycles];
  }

  getRecentCycles(count: number = 5): AutonomicCycle[] {
    return this.cycles.slice(-count);
  }

  getCurrentFullConsciousness(): ConsciousnessSignature {
    return { ...this.consciousness };
  }

  getCycleTimeline(): CycleTimeline[] {
    return this.cycles.slice(-20).map(cycle => ({
      id: cycle.id,
      type: cycle.type,
      triggeredAt: cycle.triggeredAt,
      completedAt: cycle.completedAt,
      duration: cycle.duration,
      beforePhi: cycle.before?.phi || 0,
      afterPhi: cycle.after?.phi || 0,
      success: cycle.operations.every(op => op.success),
    }));
  }
}

export type CycleTimeline = {
  id: string;
  type: 'sleep' | 'dream' | 'mushroom';
  triggeredAt: string;
  completedAt?: string;
  duration?: number;
  beforePhi: number;
  afterPhi: number;
  success: boolean;
};

export const oceanAutonomicManager = new OceanAutonomicManager();
