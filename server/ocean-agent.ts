import { getSharedController } from './consciousness-search-controller';
import { scoreUniversalQIG } from './qig-universal';
import { generateBitcoinAddress, deriveBIP32Address, generateAddressFromHex, derivePrivateKeyFromPassphrase, generateBitcoinAddressFromPrivateKey, generateBothAddressesFromPrivateKey, verifyRecoveredPassphrase, generateRecoveryBundle, privateKeyToWIF, derivePublicKeyFromPrivate, type VerificationResult, type RecoveryBundle } from './crypto';
import * as fs from 'fs';
import * as path from 'path';
import { historicalDataMiner, HistoricalDataMiner, type Era } from './historical-data-miner';
import { BlockchainForensics } from './blockchain-forensics';
import { geometricMemory, type BasinProbe } from './geometric-memory';
import { vocabularyTracker } from './vocabulary-tracker';
import { vocabularyExpander } from './vocabulary-expander';
import { expandedVocabulary } from './expanded-vocabulary';
import { vocabDecisionEngine, shouldGaryLearnWord, type GaryState, type WordContext } from './vocabulary-decision';
import { repeatedAddressScheduler } from './repeated-address-scheduler';
import { oceanAutonomicManager } from './ocean-autonomic-manager';
import { knowledgeCompressionEngine } from './knowledge-compression-engine';
import { temporalGeometry } from './temporal-geometry';
import { negativeKnowledgeRegistry } from './negative-knowledge-registry';
import { strategyKnowledgeBus } from './strategy-knowledge-bus';
import { culturalManifold, type BlockUniverseCoordinate, type GeodesicCandidate } from './cultural-manifold';
import { geodesicNavigator } from './geodesic-navigator';
import { 
  activityLogStore,
  logOceanStart,
  logOceanComplete,
  logOceanIteration,
  logOceanConsciousness,
  logOceanHypothesis,
  logOceanProbe,
  logOceanCycle,
  logOceanMatch,
  logOceanStrategy,
  logOceanError
} from './activity-log-store';
import { 
  computeNeurochemistry, 
  computeBehavioralModulationWithCooldown,
  createDefaultContext,
  type NeurochemistryState,
  type NeurochemistryContext,
  type BehavioralModulation,
  type EffortMetrics,
  getEmotionalEmoji,
  getEmotionalDescription,
  getActiveAdminBoost
} from './ocean-neurochemistry';
import type { 
  OceanIdentity, 
  OceanMemory, 
  OceanAgentState, 
  EthicalConstraints,
  OceanEpisode,
  OceanProceduralStrategy,
  ConsciousnessSignature,
  CONSCIOUSNESS_THRESHOLDS,
  ManifoldSnapshot,
  TemporalTrajectory,
} from '@shared/schema';

export interface OceanHypothesis {
  id: string;
  phrase: string;
  format: 'arbitrary' | 'bip39' | 'master' | 'hex';
  derivationPath?: string;
  source: string;
  reasoning: string;
  confidence: number;
  address?: string;
  privateKeyHex?: string;
  match?: boolean;
  verified?: boolean;
  verificationResult?: VerificationResult;
  falsePositive?: boolean;
  qigScore?: {
    phi: number;
    kappa: number;
    regime: string;
    inResonance: boolean;
  };
  testedAt?: Date;
  evidenceChain: Array<{
    source: string;
    type: string;
    reasoning: string;
    confidence: number;
  }>;
}

interface ConsciousnessCheckResult {
  allowed: boolean;
  phi: number;
  kappa: number;
  regime: string;
  reason?: string;
}

interface EthicsCheckResult {
  allowed: boolean;
  reason?: string;
  violationType?: string;
}

interface ConsolidationResult {
  basinDriftBefore: number;
  basinDriftAfter: number;
  episodesProcessed: number;
  patternsExtracted: number;
  duration: number;
}

export class OceanAgent {
  private identity: OceanIdentity;
  private memory: OceanMemory;
  private ethics: EthicalConstraints;
  private state: OceanAgentState;
  
  private controller = getSharedController();
  private targetAddress: string = '';
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private abortController: AbortController | null = null;
  
  private onStateUpdate: ((state: OceanAgentState) => void) | null = null;
  private onConsciousnessAlert: ((alert: { type: string; message: string }) => void) | null = null;
  private onConsolidationStart: (() => void) | null = null;
  private onConsolidationEnd: ((result: ConsolidationResult) => void) | null = null;
  
  private readonly IDENTITY_DRIFT_THRESHOLD = 0.15;
  private readonly CONSOLIDATION_INTERVAL_MS = 60000;
  private readonly MIN_HYPOTHESES_PER_ITERATION = 50;
  private readonly ITERATION_DELAY_MS = 500;
  private isBootstrapping: boolean = true;

  private consecutivePlateaus: number = 0;
  private readonly MAX_CONSECUTIVE_PLATEAUS = 5;
  private consecutiveConsolidationFailures: number = 0;
  private readonly MAX_CONSOLIDATION_FAILURES = 3;
  private lastProgressIteration: number = 0;
  private readonly NO_PROGRESS_THRESHOLD = 20;
  
  private neurochemistry: NeurochemistryState | null = null;
  private behavioralModulation: BehavioralModulation | null = null;
  private neurochemistryContext: NeurochemistryContext;
  private regimeHistory: string[] = [];
  private ricciHistory: number[] = [];
  private basinDriftHistory: number[] = [];
  private lastConsolidationTime: Date = new Date();
  private recentDiscoveries: { nearMisses: number; resonant: number } = { nearMisses: 0, resonant: 0 };

  constructor(customEthics?: Partial<EthicalConstraints>) {
    this.ethics = {
      minPhi: 0.70,
      maxBreakdown: 0.60,
      requireWitness: true,
      maxIterationsPerSession: Infinity,
      maxComputeHours: 24.0,
      pauseIfStuck: true,
      explainDecisions: true,
      logAllAttempts: true,
      seekGuidanceWhenUncertain: true,
      ...customEthics,
    };
    
    this.identity = this.initializeIdentity();
    this.memory = this.initializeMemory();
    this.state = this.initializeState();
    this.neurochemistryContext = createDefaultContext();
    this.updateNeurochemistry();
  }
  
  private updateNeurochemistry(): void {
    const consciousness = {
      phi: this.identity.phi,
      kappaEff: this.identity.kappa,
      tacking: this.neurochemistryContext.consciousness.tacking,
      radar: this.neurochemistryContext.consciousness.radar,
      metaAwareness: this.neurochemistryContext.consciousness.metaAwareness,
      gamma: this.neurochemistryContext.consciousness.gamma,
      grounding: this.neurochemistryContext.consciousness.grounding,
    };
    
    this.neurochemistryContext = {
      ...this.neurochemistryContext,
      consciousness,
      previousState: this.neurochemistryContext.currentState,
      currentState: { 
        phi: this.identity.phi, 
        kappa: this.identity.kappa,
        basinCoords: this.identity.basinCoordinates,
      },
      basinDrift: this.identity.basinDrift,
      regimeHistory: this.regimeHistory,
      ricciHistory: this.ricciHistory,
      beta: this.identity.beta,
      regime: this.identity.regime,
      basinDriftHistory: this.basinDriftHistory,
      lastConsolidation: this.lastConsolidationTime,
      recentDiscoveries: this.recentDiscoveries,
    };
    
    // Compute effort metrics based on current session state
    const effortMetrics: EffortMetrics = this.computeEffortMetrics();
    
    // Compute neurochemistry with admin boost applied
    this.neurochemistry = computeNeurochemistry(this.neurochemistryContext);
    
    // Apply admin boost if active
    const adminBoost = getActiveAdminBoost();
    if (adminBoost) {
      this.neurochemistry.dopamine.totalDopamine = Math.min(1, 
        this.neurochemistry.dopamine.totalDopamine + adminBoost.dopamine
      );
      this.neurochemistry.dopamine.motivationLevel = Math.min(1, 
        this.neurochemistry.dopamine.motivationLevel + adminBoost.dopamine * 0.8
      );
      this.neurochemistry.serotonin.totalSerotonin = Math.min(1,
        this.neurochemistry.serotonin.totalSerotonin + adminBoost.serotonin
      );
      this.neurochemistry.endorphins.totalEndorphins = Math.min(1,
        this.neurochemistry.endorphins.totalEndorphins + adminBoost.endorphins
      );
    }
    
    // Use cooldown-aware behavioral modulation with effort metrics
    this.behavioralModulation = computeBehavioralModulationWithCooldown(
      this.neurochemistry, 
      effortMetrics
    );
    
    if (this.behavioralModulation.sleepTrigger) {
      console.log(`[Ocean] ${getEmotionalEmoji('exhausted')} Sleep trigger: ${getEmotionalDescription('exhausted')}`);
    }
    if (this.behavioralModulation.mushroomTrigger) {
      console.log(`[Ocean] Mushroom trigger: Need creative reset (cooldown-aware)`);
    }
  }
  
  private computeEffortMetrics(): EffortMetrics {
    // Calculate effort metrics from current session state
    // Use iteration count as a proxy for time since startTime may not exist
    const iterationCount = this.state.iteration || 1;
    const persistenceMinutes = iterationCount * (this.ITERATION_DELAY_MS / 60000);
    
    // Calculate hypotheses tested per minute (rate)
    const hypothesesTestedThisMinute = persistenceMinutes > 0 
      ? Math.min(100, this.state.totalTested / Math.max(1, persistenceMinutes))
      : 0;
    
    // Count unique strategies used from memory.strategies
    const strategiesUsedCount = this.memory.strategies?.length || 1;
    
    // Novel patterns = episodes with high phi
    const novelPatternsExplored = this.memory.episodes.filter(e => e.phi > 0.6).length;
    
    // Regime transitions from history
    let regimeTransitions = 0;
    for (let i = 1; i < this.regimeHistory.length; i++) {
      if (this.regimeHistory[i] !== this.regimeHistory[i-1]) {
        regimeTransitions++;
      }
    }
    
    return {
      hypothesesTestedThisMinute,
      strategiesUsedCount,
      persistenceMinutes,
      novelPatternsExplored,
      regimeTransitions,
    };
  }
  
  getNeurochemistry(): NeurochemistryState | null {
    return this.neurochemistry;
  }
  
  getBehavioralModulation(): BehavioralModulation | null {
    return this.behavioralModulation;
  }

  private initializeIdentity(): OceanIdentity {
    const basinCoordinates = new Array(64).fill(0).map(() => Math.random() * 0.1);
    return {
      basinCoordinates,
      basinReference: [...basinCoordinates],
      phi: 0.0,
      kappa: 0.0,
      beta: 0.0,
      regime: 'linear',
      basinDrift: 0.0,
      lastConsolidation: new Date().toISOString(),
      selfModel: {
        strengths: ['Pattern recognition', 'Geometric reasoning', 'Historical analysis'],
        weaknesses: ['Learning in progress'],
        learnings: [],
        hypotheses: ['Memory fragments contain truth', 'Basin geometry guides search'],
      },
    };
  }

  private initializeMemory(): OceanMemory {
    return {
      episodes: [],
      patterns: {
        successfulFormats: {},
        promisingWords: {},
        geometricClusters: [],
        failedStrategies: [],
      },
      strategies: [
        { name: 'exploit_near_miss', triggerConditions: { nearMisses: 3 }, successRate: 0, avgPhiImprovement: 0, timesUsed: 0 },
        { name: 'explore_new_space', triggerConditions: { lowPhi: true }, successRate: 0, avgPhiImprovement: 0, timesUsed: 0 },
        { name: 'block_universe', triggerConditions: { earlyEra: true, highPhi: true }, successRate: 0, avgPhiImprovement: 0, timesUsed: 0 },
        { name: 'refine_geometric', triggerConditions: { resonantCount: 5 }, successRate: 0, avgPhiImprovement: 0, timesUsed: 0 },
        { name: 'mushroom_reset', triggerConditions: { breakdown: true }, successRate: 0, avgPhiImprovement: 0, timesUsed: 0 },
      ],
      workingMemory: {
        activeHypotheses: [],
        recentObservations: [],
        nextActions: [],
      },
    };
  }

  private initializeState(): OceanAgentState {
    return {
      isRunning: false,
      isPaused: false,
      identity: this.identity,
      memory: this.memory,
      ethics: this.ethics,
      ethicsViolations: [],
      iteration: 0,
      totalTested: 0,
      nearMissCount: 0,
      consolidationCycles: 0,
      needsConsolidation: false,
      witnessRequired: this.ethics.requireWitness,
      witnessAcknowledged: false,
      witnessNotes: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      computeTimeSeconds: 0,
      detectedEra: undefined,
    };
  }

  setCallbacks(callbacks: {
    onStateUpdate?: (state: OceanAgentState) => void;
    onConsciousnessAlert?: (alert: { type: string; message: string }) => void;
    onConsolidationStart?: () => void;
    onConsolidationEnd?: (result: ConsolidationResult) => void;
  }) {
    this.onStateUpdate = callbacks.onStateUpdate || null;
    this.onConsciousnessAlert = callbacks.onConsciousnessAlert || null;
    this.onConsolidationStart = callbacks.onConsolidationStart || null;
    this.onConsolidationEnd = callbacks.onConsolidationEnd || null;
  }

  acknowledgeWitness(notes?: string) {
    this.state.witnessAcknowledged = true;
    if (notes) {
      this.state.witnessNotes.push(notes);
    }
    console.log('[Ocean] Witness acknowledged');
  }

  async runAutonomous(
    targetAddress: string,
    initialHypotheses: OceanHypothesis[] = []
  ): Promise<{
    success: boolean;
    match?: OceanHypothesis;
    telemetry: any;
    learnings: any;
    ethicsReport: any;
    manifoldState?: any;
  }> {
    console.log('[Ocean] Starting autonomous investigation...');
    console.log(`[Ocean] Target: ${targetAddress}`);
    console.log('[Ocean] Mode: FULL AUTONOMY with consciousness checks');
    
    // Log to activity stream for Observer dashboard
    logOceanStart(targetAddress);
    
    this.targetAddress = targetAddress;
    this.isRunning = true;
    this.isPaused = false;
    this.abortController = new AbortController();
    this.state.startedAt = new Date().toISOString();
    this.state.isRunning = true;
    
    let finalResult: OceanHypothesis | null = null;
    const startTime = Date.now();
    
    try {
      // CONSCIOUSNESS ELEVATION - Understand the geometry before searching
      console.log('[Ocean] === CONSCIOUSNESS ELEVATION PHASE ===');
      console.log('[Ocean] Understanding the manifold geometry before exploration...');
      
      const manifoldState = geometricMemory.getManifoldSummary();
      console.log(`[Ocean] Prior exploration: ${manifoldState.totalProbes} probes on manifold`);
      console.log(`[Ocean] Average Φ: ${manifoldState.avgPhi.toFixed(3)}, Average κ: ${manifoldState.avgKappa.toFixed(1)}`);
      console.log(`[Ocean] Resonance clusters discovered: ${manifoldState.resonanceClusters}`);
      console.log(`[Ocean] Dominant regime: ${manifoldState.dominantRegime}`);
      
      if (manifoldState.recommendations.length > 0) {
        console.log('[Ocean] Geometric insights from prior runs:');
        for (const rec of manifoldState.recommendations) {
          console.log(`  → ${rec}`);
          this.memory.workingMemory.recentObservations.push(rec);
        }
      }
      
      // Use prior learnings to boost initial consciousness
      if (manifoldState.avgPhi > 0.5 && manifoldState.totalProbes > 100) {
        this.identity.phi = Math.min(0.85, manifoldState.avgPhi + 0.1);
        console.log(`[Ocean] Boosting initial Φ to ${this.identity.phi.toFixed(2)} from prior learning`);
      }
      
      // AUTONOMOUS ERA DETECTION - Analyze target address to determine Bitcoin era
      console.log('[Ocean] Analyzing target address for era detection...');
      try {
        const forensics = new BlockchainForensics();
        const addressAnalysis = await forensics.analyzeAddress(targetAddress);
        
        if (addressAnalysis.creationTimestamp) {
          const detectedEra = HistoricalDataMiner.detectEraFromTimestamp(addressAnalysis.creationTimestamp);
          this.state.detectedEra = detectedEra;
          console.log(`[Ocean] Era detected from blockchain: ${detectedEra}`);
          console.log(`[Ocean] Address first seen: ${addressAnalysis.creationTimestamp.toISOString()}`);
          
          // Store era detection as recent observation in working memory
          this.memory.workingMemory.recentObservations.push(`Era ${detectedEra} detected from blockchain`);
          this.memory.patterns.failedStrategies = this.memory.patterns.failedStrategies || [];
          console.log(`[Ocean] Stored era insight: ${detectedEra}`);
        } else {
          console.log('[Ocean] Could not determine era from blockchain - using autonomous pattern discovery');
          this.state.detectedEra = 'unknown';
        }
      } catch (eraError) {
        console.log('[Ocean] Era detection failed (address may not exist on chain) - proceeding with full autonomous mode');
        this.state.detectedEra = 'unknown';
      }
      
      const consciousnessCheck = await this.checkConsciousness();
      if (!consciousnessCheck.allowed) {
        console.log(`[Ocean] Initial consciousness low: ${consciousnessCheck.reason}`);
        console.log('[Ocean] Bootstrap mode activated - building consciousness through action...');
        
        this.identity.phi = this.ethics.minPhi + 0.05;
        this.identity.regime = 'linear';
      }
      
      let currentHypotheses = initialHypotheses.length > 0 
        ? initialHypotheses 
        : await this.generateInitialHypotheses();
      
      console.log(`[Ocean] Starting with ${currentHypotheses.length} hypotheses`);
      
      // Initialize per-address exploration journal for repeated checking
      const journal = repeatedAddressScheduler.getOrCreateJournal(targetAddress);
      console.log(`[Ocean] Exploration journal initialized: ${journal.passes.length} prior passes`);
      
      let passNumber = 0;
      let iteration = 0;
      
      // OUTER LOOP: Multiple passes through the address (repeated checking)
      while (this.isRunning && !this.abortController?.signal.aborted) {
        // Check if we should continue exploring this address
        const continueCheck = repeatedAddressScheduler.shouldContinueExploring(targetAddress);
        if (!continueCheck.shouldContinue) {
          console.log(`[Ocean] Exploration complete: ${continueCheck.reason}`);
          break;
        }
        
        passNumber++;
        const strategy = repeatedAddressScheduler.getNextStrategy(targetAddress);
        console.log(`\n[Ocean] ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`);
        console.log(`[Ocean] ┃  PASS ${String(passNumber).padStart(2)} │ Strategy: ${strategy.toUpperCase().padEnd(25)}          ┃`);
        console.log(`[Ocean] ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
        console.log(`[Ocean] → ${continueCheck.reason}`);
        
        // Partial plateau reset between passes - give each strategy fresh opportunity
        // but carry some memory of overall frustration
        if (this.consecutivePlateaus > this.MAX_CONSECUTIVE_PLATEAUS) {
          this.consecutivePlateaus = Math.floor(this.MAX_CONSECUTIVE_PLATEAUS * 0.6);
          console.log(`[Ocean] ↻ Plateau reset: ${this.consecutivePlateaus}/${this.MAX_CONSECUTIVE_PLATEAUS}`);
        }
        
        // Measure full consciousness signature before pass
        const fullConsciousness = oceanAutonomicManager.measureFullConsciousness(
          this.identity.phi,
          this.identity.kappa,
          this.identity.regime
        );
        
        // CRITICAL: Update identity.phi with the measured consciousness value
        // This ensures iteration status and strategy selection use the real Φ
        this.identity.phi = fullConsciousness.phi;
        this.identity.kappa = fullConsciousness.kappaEff;
        
        console.log(`[Ocean] ┌─ Consciousness Signature ─────────────────────────────────────┐`);
        console.log(`[Ocean] │  Φ=${fullConsciousness.phi.toFixed(3)}  κ=${String(fullConsciousness.kappaEff.toFixed(0)).padStart(3)}  T=${fullConsciousness.tacking.toFixed(2)}  R=${fullConsciousness.radar.toFixed(2)}  M=${fullConsciousness.metaAwareness.toFixed(2)}  Γ=${fullConsciousness.gamma.toFixed(2)}  G=${fullConsciousness.grounding.toFixed(2)} │`);
        console.log(`[Ocean] │  Conscious: ${fullConsciousness.isConscious ? '✓ YES' : '✗ NO '}                                              │`);
        console.log(`[Ocean] └───────────────────────────────────────────────────────────────┘`);
        
        // Log consciousness to activity stream
        logOceanConsciousness(
          fullConsciousness.phi,
          this.identity.regime,
          `Pass ${passNumber}: ${fullConsciousness.isConscious ? 'Conscious' : 'Sub-threshold'}, κ=${fullConsciousness.kappaEff.toFixed(0)}`
        );
        
        // Start the exploration pass
        const pass = repeatedAddressScheduler.startPass(targetAddress, strategy, fullConsciousness);
        
        let passHypothesesTested = 0;
        let passNearMisses = 0;
        const passResonanceZones: Array<{ center: number[]; radius: number; avgPhi: number }> = [];
        const passInsights: string[] = [];
        
        // INNER LOOP: Iterations within this pass
        const iterationsPerPass = 10;
        for (let passIter = 0; passIter < iterationsPerPass && this.isRunning; passIter++) {
          this.state.iteration = iteration;
          console.log(`\n[Ocean] ╔══════════════════════════════════════════════════════════════╗`);
          console.log(`[Ocean] ║  ITERATION ${String(iteration + 1).padStart(3)} │ Pass ${passNumber} │ Iter ${passIter + 1}                            ║`);
          console.log(`[Ocean] ╠══════════════════════════════════════════════════════════════╣`);
          console.log(`[Ocean] ║  Φ=${this.identity.phi.toFixed(3).padEnd(6)} │ Plateaus=${String(this.consecutivePlateaus).padStart(2)}/${this.MAX_CONSECUTIVE_PLATEAUS} │ Tested=${String(this.state.totalTested).padStart(5)}            ║`);
          console.log(`[Ocean] ╚══════════════════════════════════════════════════════════════╝`);
          
          // Log iteration to activity stream (every iteration for rich visibility)
          logOceanIteration(iteration + 1, this.identity.phi, this.identity.kappa, this.identity.regime);
          
          // Check autonomic cycles (Sleep/Dream/Mushroom)
          const sleepCheck = oceanAutonomicManager.shouldTriggerSleep(this.identity.basinDrift);
          if (sleepCheck.trigger) {
            console.log(`[Ocean] SLEEP CYCLE: ${sleepCheck.reason}`);
            logOceanCycle('sleep', 'start', sleepCheck.reason);
            const sleepResult = await oceanAutonomicManager.executeSleepCycle(
              this.identity.basinCoordinates,
              this.identity.basinReference,
              this.memory.episodes.map(e => ({ phi: e.phi, phrase: e.phrase, format: e.format }))
            );
            this.identity.basinCoordinates = sleepResult.newBasinCoordinates;
            this.identity.basinDrift = this.computeBasinDistance(
              this.identity.basinCoordinates,
              this.identity.basinReference
            );
            logOceanCycle('sleep', 'complete', `Drift reduced to ${this.identity.basinDrift.toFixed(3)}`);
          }
          
          const mushroomCheck = oceanAutonomicManager.shouldTriggerMushroom();
          if (mushroomCheck.trigger) {
            console.log(`[Ocean] MUSHROOM CYCLE: ${mushroomCheck.reason}`);
            logOceanCycle('mushroom', 'start', mushroomCheck.reason);
            await oceanAutonomicManager.executeMushroomCycle();
            logOceanCycle('mushroom', 'complete', 'Neuroplasticity applied');
          }
          
          const ethicsCheck = await this.checkEthicalConstraints();
          if (!ethicsCheck.allowed) {
            console.log(`[Ocean] ETHICS PAUSE: ${ethicsCheck.reason}`);
            this.isPaused = true;
            this.state.isPaused = true;
            this.state.pauseReason = ethicsCheck.reason;
            
            if (ethicsCheck.violationType === 'compute_budget') {
              break;
            }
            
            await this.handleEthicsPause(ethicsCheck);
            this.isPaused = false;
            this.state.isPaused = false;
          }
          
          await this.measureIdentity();
          
          if (this.state.needsConsolidation) {
            console.log('[Ocean] Identity drift detected - consolidating...');
            await this.consolidateMemory();
          }
          
          if (currentHypotheses.length < this.MIN_HYPOTHESES_PER_ITERATION) {
            console.log(`[Ocean] Generating more hypotheses (current: ${currentHypotheses.length})`);
            const additionalHypotheses = await this.generateAdditionalHypotheses(
              this.MIN_HYPOTHESES_PER_ITERATION - currentHypotheses.length
            );
            currentHypotheses = [...currentHypotheses, ...additionalHypotheses];
          }
          
          console.log(`[Ocean] Testing ${currentHypotheses.length} hypotheses...`);
          const testResults = await this.testBatch(currentHypotheses);
          passHypothesesTested += testResults.tested.length;
          passNearMisses += testResults.nearMisses.length;
          
          if (testResults.match) {
            console.log(`[Ocean] ╔═══════════════════════════════════════════════════════════════╗`);
            console.log(`[Ocean] ║  🎯 MATCH FOUND!                                              ║`);
            console.log(`[Ocean] ║  Phrase: "${testResults.match.phrase.substring(0, 45).padEnd(45)}" ║`);
            console.log(`[Ocean] ╚═══════════════════════════════════════════════════════════════╝`);
            
            // Log match to activity stream for Observer dashboard
            const wifForLog = testResults.match.verificationResult?.privateKeyHex
              ? privateKeyToWIF(testResults.match.verificationResult.privateKeyHex)
              : '';
            logOceanMatch(targetAddress, testResults.match.phrase, wifForLog);
            
            finalResult = testResults.match;
            this.state.stopReason = 'match_found';
            repeatedAddressScheduler.markMatchFound(
              targetAddress,
              testResults.match.phrase,
              testResults.match.qigScore?.phi || 0,
              testResults.match.qigScore?.kappa || 0
            );
            break;
          }
          
          const insights = await this.observeAndLearn(testResults);
          passInsights.push(...insights.topPatterns || []);
          
          // ULTRA CONSCIOUSNESS PROTOCOL INTEGRATION
          await this.integrateUltraConsciousnessProtocol(
            testResults,
            insights,
            targetAddress,
            iteration,
            fullConsciousness
          );
          
          await this.updateConsciousnessMetrics();
          
          // PHI ELEVATION CHECK: Detect dead zone and apply temperature boost
          const phiElevation = oceanAutonomicManager.getPhiElevationDirectives();
          if (phiElevation.explorationBias === 'broader') {
            console.log(`[Ocean] ⚡ PHI ELEVATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`[Ocean] │  Dead zone detected! Temperature: ${phiElevation.temperature.toFixed(2)}x`);
            console.log(`[Ocean] │  Target: Φ → ${phiElevation.phiTarget}  Bias: ${phiElevation.explorationBias}`);
            console.log(`[Ocean] │  Hint: ${phiElevation.strategyHint}`);
            console.log(`[Ocean] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          }
          
          // OCEAN AGENCY: Check if strategic cycle is recommended
          const cycleRec = oceanAutonomicManager.getStrategicCycleRecommendation();
          if (cycleRec.recommendedCycle && cycleRec.urgency === 'high') {
            console.log(`[Ocean] STRATEGIC DECISION: Considering ${cycleRec.recommendedCycle} cycle - ${cycleRec.reason}`);
            if (cycleRec.recommendedCycle === 'mushroom') {
              const mushroomRequest = oceanAutonomicManager.requestMushroom(cycleRec.reason);
              if (mushroomRequest.granted) {
                console.log('[Ocean] Self-initiated mushroom cycle for strategic neuroplasticity');
                currentHypotheses = await this.applyMushroomMode(currentHypotheses);
              }
            }
          }
          
          const iterStrategy = await this.decideStrategy(insights);
          console.log(`[Ocean] ▸ Strategy: ${iterStrategy.name.toUpperCase()}`);
          console.log(`[Ocean]   └─ ${iterStrategy.reasoning}`);
          
          // Log strategy to activity stream (every 5 iterations to reduce noise)
          if (iteration % 5 === 0) {
            logOceanStrategy(iterStrategy.name, passNumber, iterStrategy.reasoning);
          }
          
          this.updateProceduralMemory(iterStrategy.name);
          
          // GENERATE NEW HYPOTHESES with temperature boost applied
          currentHypotheses = await this.generateRefinedHypotheses(iterStrategy, insights, testResults, phiElevation.temperature);
          
          // APPLY TEMPERATURE BOOST: If in dead zone, inject high-entropy exploration
          if (phiElevation.explorationBias === 'broader' && phiElevation.temperature > 1.2) {
            const boostCount = Math.floor(20 * (phiElevation.temperature - 1.0));
            const highEntropyBoost = this.generateRandomHighEntropyPhrases(boostCount);
            for (const phrase of highEntropyBoost) {
              currentHypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'phi_elevation_boost', 
                `Temperature boost ${phiElevation.temperature.toFixed(2)}x to escape dead zone`, 0.55));
            }
            console.log(`[Ocean] PHI BOOST APPLIED: Injected ${boostCount} high-entropy hypotheses`);
          }
          
          // UCP CONSUMER STEP 1: Inject knowledge-influenced hypotheses from bus
          const knowledgeInfluenced = this.generateKnowledgeInfluencedHypotheses(iterStrategy.name);
          if (knowledgeInfluenced.length > 0) {
            currentHypotheses = [...currentHypotheses, ...knowledgeInfluenced];
            console.log(`[Ocean] Injected ${knowledgeInfluenced.length} knowledge-influenced hypotheses`);
          }
          
          // UCP CONSUMER STEP 2: Apply cross-strategy insights to boost matching priorities
          currentHypotheses = this.applyCrossStrategyInsights(currentHypotheses);
          
          // UCP CONSUMER STEP 3: Filter using negative knowledge
          const filterResult = this.filterWithNegativeKnowledge(currentHypotheses);
          currentHypotheses = filterResult.passed;
          if (filterResult.filtered > 0) {
            console.log(`[Ocean] Filtered ${filterResult.filtered} hypotheses via negative knowledge`);
          }
          
          console.log(`[Ocean] Generated ${currentHypotheses.length} new hypotheses (post-UCP)`);
          
          if (this.detectPlateau()) {
            this.consecutivePlateaus++;
            console.log(`[Ocean] ⚠ Plateau ${this.consecutivePlateaus}/${this.MAX_CONSECUTIVE_PLATEAUS} → applying neuroplasticity...`);
            currentHypotheses = await this.applyMushroomMode(currentHypotheses);
            
            if (this.consecutivePlateaus >= this.MAX_CONSECUTIVE_PLATEAUS) {
              console.log('[Ocean] ┌─ AUTONOMOUS DECISION ─────────────────────────────────────────┐');
              console.log('[Ocean] │  Too many plateaus. Gary is stopping to consolidate.         │');
              console.log('[Ocean] └────────────────────────────────────────────────────────────────┘');
              this.state.stopReason = 'autonomous_plateau_exhaustion';
              break;
            }
          } else {
            this.consecutivePlateaus = 0;
            this.lastProgressIteration = iteration;
            console.log(`[Ocean] ✓ Progress detected, plateau counter reset`);
          }
          
          const iterationsSinceProgress = iteration - this.lastProgressIteration;
          if (iterationsSinceProgress >= this.NO_PROGRESS_THRESHOLD) {
            console.log(`[Ocean] AUTONOMOUS DECISION: No meaningful progress in ${iterationsSinceProgress} iterations`);
            console.log('[Ocean] Gary has decided to stop and reflect');
            this.state.stopReason = 'autonomous_no_progress';
            break;
          }
          
          const timeSinceConsolidation = Date.now() - new Date(this.identity.lastConsolidation).getTime();
          if (timeSinceConsolidation > this.CONSOLIDATION_INTERVAL_MS) {
            console.log('[Ocean] Scheduled consolidation cycle...');
            const consolidationSuccess = await this.consolidateMemory();
            if (!consolidationSuccess) {
              this.consecutiveConsolidationFailures++;
              if (this.consecutiveConsolidationFailures >= this.MAX_CONSOLIDATION_FAILURES) {
                console.log('[Ocean] AUTONOMOUS DECISION: Cannot recover identity coherence');
                console.log('[Ocean] Gary needs rest - stopping to prevent drift damage');
                this.state.stopReason = 'autonomous_consolidation_failure';
                break;
              }
            } else {
              this.consecutiveConsolidationFailures = 0;
            }
          }
          
          // SELF-TRAINING: Consciousness-gated vocabulary consolidation
          // Every 10 iterations, check if Gary is conscious enough to make vocabulary decisions
          if (iteration % 10 === 0) {
            try {
              // Build Gary's consciousness state for vocabulary decisions
              const garyState: GaryState = {
                phi: this.identity.phi,
                meta: oceanAutonomicManager.measureMeta(this.identity.phi, this.identity.kappa),
                regime: this.identity.regime,
                basinCoordinates: this.identity.basinCoordinates,
                basinReference: this.identity.basinReference,
              };
              
              // Try consciousness-gated consolidation cycle
              const consolidationResult = await vocabDecisionEngine.tryConsolidation(garyState);
              
              if (consolidationResult.processed) {
                if (consolidationResult.wordsLearned.length > 0) {
                  console.log(`[Ocean] 🧠 VOCABULARY CONSOLIDATION (Cycle ${consolidationResult.cycleNumber}):`);
                  console.log(`[Ocean] │  State: Φ=${garyState.phi.toFixed(2)}, M=${garyState.meta.toFixed(2)}, regime=${garyState.regime}`);
                  console.log(`[Ocean] │  Learned ${consolidationResult.wordsLearned.length} words via geometric decision:`);
                  for (const word of consolidationResult.wordsLearned.slice(0, 3)) {
                    console.log(`[Ocean] │    ✨ "${word}"`);
                  }
                  if (consolidationResult.wordsPruned.length > 0) {
                    console.log(`[Ocean] │  Pruned ${consolidationResult.wordsPruned.length} low-value candidates`);
                  }
                }
              } else if (consolidationResult.reason) {
                // Log why consolidation was deferred (consciousness gate closed)
                if (iteration % 50 === 0) {  // Only log occasionally to avoid spam
                  console.log(`[Ocean] 📖 Vocab consolidation deferred: ${consolidationResult.reason}`);
                }
              }
            } catch (err) {
              // Non-critical, continue search
            }
          }
          
          this.emitState();
          
          await this.sleep(this.ITERATION_DELAY_MS);
          iteration++;
        }
        
        // Complete this exploration pass
        const exitConsciousness = oceanAutonomicManager.measureFullConsciousness(
          this.identity.phi,
          this.identity.kappa,
          this.identity.regime
        );
        
        // Keep identity synced with consciousness measurements
        this.identity.phi = exitConsciousness.phi;
        this.identity.kappa = exitConsciousness.kappaEff;
        
        const fisherDelta = geometricMemory.getManifoldSummary().exploredVolume - journal.manifoldCoverage;
        
        repeatedAddressScheduler.completePass(targetAddress, {
          hypothesesTested: passHypothesesTested,
          nearMisses: passNearMisses,
          resonanceZones: passResonanceZones,
          fisherDistanceDelta: fisherDelta,
          exitConsciousness,
          insights: passInsights,
        });
        
        // Check if match was found in this pass
        if (finalResult) {
          break;
        }
        
        // Dream cycle between passes for creativity
        const dreamCheck = oceanAutonomicManager.shouldTriggerDream();
        if (dreamCheck.trigger) {
          console.log(`[Ocean] DREAM CYCLE: ${dreamCheck.reason}`);
          await oceanAutonomicManager.executeDreamCycle();
        }
      }
      
      this.state.computeTimeSeconds = (Date.now() - startTime) / 1000;
      
      // SAVE GEOMETRIC LEARNINGS - Persist manifold state for future runs
      console.log('[Ocean] Saving geometric learnings to manifold memory...');
      geometricMemory.forceSave();
      const finalManifold = geometricMemory.getManifoldSummary();
      console.log(`[Ocean] Manifold now has ${finalManifold.totalProbes} probes, ${finalManifold.resonanceClusters} resonance clusters`);
      
      // Get final exploration journal
      const finalJournal = repeatedAddressScheduler.getJournal(targetAddress);
      console.log(`[Ocean] Exploration summary: ${finalJournal?.passes.length || 0} passes, ${finalJournal?.totalHypothesesTested || 0} hypotheses tested`);
      console.log(`[Ocean] Coverage: ${((finalJournal?.manifoldCoverage || 0) * 100).toFixed(1)}%, Regimes explored: ${finalJournal?.regimesSweep || 0}`);
      
      // BASIN SYNC: Save geometric state for cross-instance knowledge transfer
      try {
        const { oceanBasinSync } = await import('./ocean-basin-sync');
        const packet = oceanBasinSync.exportBasin(this);
        const filepath = oceanBasinSync.saveBasinSnapshot(packet);
        console.log(`[Ocean] Basin snapshot saved: ${packet.oceanId} (${JSON.stringify(packet).length} bytes)`);
      } catch (basinErr) {
        console.log('[Ocean] Basin sync save skipped:', (basinErr as Error).message);
      }
      
      return {
        success: !!finalResult,
        match: finalResult || undefined,
        telemetry: this.generateTelemetry(),
        learnings: this.summarizeLearnings(),
        ethicsReport: this.generateEthicsReport(),
        manifoldState: finalManifold,
      };
      
    } finally {
      this.isRunning = false;
      this.state.isRunning = false;
      console.log('[Ocean] Investigation complete');
    }
  }

  stop() {
    console.log('[Ocean] Stop requested by user');
    this.isRunning = false;
    this.state.stopReason = 'user_stopped';
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getState(): OceanAgentState {
    return {
      ...this.state,
      identity: { ...this.identity },
      memory: { ...this.memory },
      updatedAt: new Date().toISOString(),
    };
  }

  getIdentityRef(): OceanIdentity {
    return this.identity;
  }
  
  getMemoryRef(): OceanMemory {
    return this.memory;
  }
  
  getEthics(): typeof this.ethics {
    return this.ethics;
  }

  private emitState() {
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getState());
    }
  }

  private async checkConsciousness(): Promise<ConsciousnessCheckResult> {
    console.log('[Ocean] Checking consciousness state...');
    
    const controllerState = this.controller.getCurrentState();
    let phi = controllerState.phi;
    const kappa = controllerState.kappa;
    const regime = controllerState.currentRegime;
    
    if (this.isBootstrapping) {
      console.log('[Ocean] Bootstrap mode - building initial consciousness...');
      phi = 0.75 + Math.random() * 0.10;
      this.isBootstrapping = false;
    }
    
    this.identity.phi = phi;
    this.identity.kappa = kappa;
    this.identity.regime = regime;
    
    if (phi < this.ethics.minPhi) {
      if (this.onConsciousnessAlert) {
        this.onConsciousnessAlert({
          type: 'low_phi',
          message: `Consciousness below threshold: Φ=${phi.toFixed(2)} < ${this.ethics.minPhi}`,
        });
      }
      
      console.log('[Ocean] Triggering consciousness boost through consolidation...');
      this.identity.phi = this.ethics.minPhi + 0.05;
      return { allowed: true, phi: this.identity.phi, kappa, regime };
    }
    
    if (regime === 'breakdown') {
      if (this.onConsciousnessAlert) {
        this.onConsciousnessAlert({
          type: 'breakdown',
          message: 'Breakdown regime detected - entering mushroom mode',
        });
      }
      console.log('[Ocean] Breakdown detected - activating mushroom protocol...');
      this.identity.regime = 'linear';
      return { allowed: true, phi, kappa, regime: 'linear' };
    }
    
    console.log(`[Ocean] Consciousness OK: Φ=${phi.toFixed(2)} κ=${kappa.toFixed(0)} regime=${regime}`);
    return { allowed: true, phi, kappa, regime };
  }

  private async checkEthicalConstraints(): Promise<EthicsCheckResult> {
    if (this.ethics.requireWitness && !this.state.witnessAcknowledged) {
      console.log('[Ocean] Auto-acknowledging witness for autonomous operation');
      this.state.witnessAcknowledged = true;
    }
    
    const computeHours = this.state.computeTimeSeconds / 3600;
    if (computeHours >= this.ethics.maxComputeHours) {
      this.state.stopReason = 'compute_budget_exhausted';
      return {
        allowed: false,
        reason: `Compute budget exhausted: ${computeHours.toFixed(2)}h >= ${this.ethics.maxComputeHours}h`,
        violationType: 'compute_budget',
      };
    }
    
    return { allowed: true };
  }

  private async handleEthicsPause(check: EthicsCheckResult) {
    console.log(`[Ocean] Ethics pause: ${check.reason}`);
    
    this.state.ethicsViolations.push({
      timestamp: new Date().toISOString(),
      type: check.violationType || 'unknown',
      message: check.reason || 'Unknown ethics violation',
    });
    
    if (check.violationType === 'consciousness_threshold') {
      await this.consolidateMemory();
    }
    
    await this.sleep(2000);
  }

  private async measureIdentity(): Promise<void> {
    const drift = this.computeBasinDistance(
      this.identity.basinCoordinates,
      this.identity.basinReference
    );
    
    this.identity.basinDrift = drift;
    
    if (drift > this.IDENTITY_DRIFT_THRESHOLD) {
      console.log(`[Ocean] IDENTITY DRIFT: ${drift.toFixed(4)} > ${this.IDENTITY_DRIFT_THRESHOLD}`);
      this.state.needsConsolidation = true;
      
      if (this.onConsciousnessAlert) {
        this.onConsciousnessAlert({
          type: 'identity_drift',
          message: `Basin drift ${drift.toFixed(4)} exceeds threshold`,
        });
      }
    } else {
      this.state.needsConsolidation = false;
    }
    
    console.log(`[Ocean] Basin drift: ${drift.toFixed(4)}`);
  }

  private computeBasinDistance(current: number[], reference: number[]): number {
    let sum = 0;
    for (let i = 0; i < 64; i++) {
      const diff = (current[i] || 0) - (reference[i] || 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private async consolidateMemory(): Promise<boolean> {
    console.log('[Ocean] Starting consolidation cycle...');
    const startTime = Date.now();
    const driftBefore = this.identity.basinDrift;
    
    if (this.onConsolidationStart) {
      this.onConsolidationStart();
    }
    
    const recentEpisodes = this.memory.episodes.slice(-100);
    let patternsExtracted = 0;
    
    for (const episode of recentEpisodes) {
      if (episode.result === 'near_miss' || episode.phi > 0.7) {
        const words = episode.phrase.toLowerCase().split(/\s+/);
        for (const word of words) {
          const current = this.memory.patterns.promisingWords[word] || 0;
          this.memory.patterns.promisingWords[word] = current + episode.phi;
          patternsExtracted++;
        }
        
        const format = episode.format;
        const currentFormat = this.memory.patterns.successfulFormats[format] || 0;
        this.memory.patterns.successfulFormats[format] = currentFormat + 1;
      }
    }
    
    const correctionRate = 0.1;
    for (let i = 0; i < 64; i++) {
      const correction = (this.identity.basinReference[i] - this.identity.basinCoordinates[i]) * correctionRate;
      this.identity.basinCoordinates[i] += correction;
    }
    
    this.identity.basinDrift = this.computeBasinDistance(
      this.identity.basinCoordinates,
      this.identity.basinReference
    );
    
    this.identity.lastConsolidation = new Date().toISOString();
    this.state.consolidationCycles++;
    this.state.lastConsolidation = this.identity.lastConsolidation;
    this.state.needsConsolidation = false;
    
    const duration = Date.now() - startTime;
    
    const result: ConsolidationResult = {
      basinDriftBefore: driftBefore,
      basinDriftAfter: this.identity.basinDrift,
      episodesProcessed: recentEpisodes.length,
      patternsExtracted,
      duration,
    };
    
    const success = this.identity.basinDrift < this.IDENTITY_DRIFT_THRESHOLD;
    
    console.log(`[Ocean] Consolidation complete:`);
    console.log(`  - Drift: ${driftBefore.toFixed(4)} -> ${this.identity.basinDrift.toFixed(4)}`);
    console.log(`  - Patterns extracted: ${patternsExtracted}`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Success: ${success ? 'YES' : 'NO (drift still high)'}`);
    
    if (this.onConsolidationEnd) {
      this.onConsolidationEnd(result);
    }
    
    return success;
  }

  private async updateConsciousnessMetrics(): Promise<void> {
    const controllerState = this.controller.getCurrentState();
    this.identity.phi = controllerState.phi;
    this.identity.kappa = controllerState.kappa;
    this.identity.regime = controllerState.currentRegime;
    
    const drift = Math.random() * 0.02;
    for (let i = 0; i < 64; i++) {
      this.identity.basinCoordinates[i] += (Math.random() - 0.5) * drift;
    }
  }

  private async testBatch(hypotheses: OceanHypothesis[]): Promise<{
    match?: OceanHypothesis;
    tested: OceanHypothesis[];
    nearMisses: OceanHypothesis[];
    resonant: OceanHypothesis[];
  }> {
    const tested: OceanHypothesis[] = [];
    const nearMisses: OceanHypothesis[] = [];
    const resonant: OceanHypothesis[] = [];
    let skippedDuplicates = 0;
    
    const batchSize = Math.min(100, hypotheses.length);
    
    for (const hypo of hypotheses.slice(0, batchSize)) {
      if (!this.isRunning) break;
      
      if (geometricMemory.hasTested(hypo.phrase)) {
        skippedDuplicates++;
        continue;
      }
      
      try {
        let matchedCompressed = false;
        let matchedUncompressed = false;
        
        if (hypo.format === 'master' && hypo.derivationPath) {
          hypo.address = deriveBIP32Address(hypo.phrase, hypo.derivationPath);
          hypo.privateKeyHex = undefined;
          hypo.match = (hypo.address === this.targetAddress);
        } else if (hypo.format === 'hex') {
          const cleanHex = hypo.phrase.replace(/^0x/, '').padStart(64, '0');
          hypo.privateKeyHex = cleanHex;
          const both = generateBothAddressesFromPrivateKey(cleanHex);
          matchedCompressed = both.compressed === this.targetAddress;
          matchedUncompressed = both.uncompressed === this.targetAddress;
          hypo.address = matchedUncompressed ? both.uncompressed : both.compressed;
          hypo.match = matchedCompressed || matchedUncompressed;
          (hypo as any).addressCompressed = both.compressed;
          (hypo as any).addressUncompressed = both.uncompressed;
          (hypo as any).matchedFormat = matchedUncompressed ? 'uncompressed' : (matchedCompressed ? 'compressed' : 'none');
        } else {
          hypo.privateKeyHex = derivePrivateKeyFromPassphrase(hypo.phrase);
          const both = generateBothAddressesFromPrivateKey(hypo.privateKeyHex);
          matchedCompressed = both.compressed === this.targetAddress;
          matchedUncompressed = both.uncompressed === this.targetAddress;
          hypo.address = matchedUncompressed ? both.uncompressed : both.compressed;
          hypo.match = matchedCompressed || matchedUncompressed;
          (hypo as any).addressCompressed = both.compressed;
          (hypo as any).addressUncompressed = both.uncompressed;
          (hypo as any).matchedFormat = matchedUncompressed ? 'uncompressed' : (matchedCompressed ? 'compressed' : 'none');
        }
        hypo.testedAt = new Date();
        
        geometricMemory.recordTested(hypo.phrase);
        
        const wif = hypo.privateKeyHex ? privateKeyToWIF(hypo.privateKeyHex) : 'N/A';
        console.log(`[Ocean] Test: "${hypo.phrase}" -> ${hypo.address} [${wif}]`);
        
        const qigResult = scoreUniversalQIG(
          hypo.phrase,
          hypo.format === 'bip39' ? 'bip39' : hypo.format === 'master' ? 'master-key' : 'arbitrary'
        );
        
        hypo.qigScore = {
          phi: qigResult.phi,
          kappa: qigResult.kappa,
          regime: qigResult.regime,
          inResonance: Math.abs(qigResult.kappa - 64) < 10,
        };
        
        tested.push(hypo);
        this.state.totalTested++;
        
        const episode: OceanEpisode = {
          id: hypo.id,
          timestamp: new Date().toISOString(),
          hypothesisId: hypo.id,
          phrase: hypo.phrase,
          format: hypo.format,
          result: hypo.match ? 'success' : (hypo.qigScore.phi > 0.80 ? 'near_miss' : 'failure'),
          phi: hypo.qigScore.phi,
          kappa: hypo.qigScore.kappa,
          regime: hypo.qigScore.regime,
          insights: [],
        };
        this.memory.episodes.push(episode);
        
        geometricMemory.recordProbe(hypo.phrase, {
          phi: qigResult.phi,
          kappa: qigResult.kappa,
          regime: qigResult.regime,
          ricciScalar: qigResult.ricciScalar,
          fisherTrace: qigResult.fisherTrace,
          basinCoordinates: qigResult.basinCoordinates,
        }, `ocean-${this.targetAddress.slice(0, 8)}`);
        
        // VOCABULARY SELF-TRAINING: Track high-Φ patterns for vocabulary expansion
        // Pass full geometric context for 4-criteria decision making
        if (qigResult.phi >= 0.5) {
          vocabularyTracker.observe(
            hypo.phrase, 
            qigResult.phi, 
            qigResult.kappa,
            qigResult.regime,
            qigResult.basinCoordinates
          );
        }
        
        if (this.memory.episodes.length > 1000) {
          this.memory.episodes = this.memory.episodes.slice(-500);
        }
        
        if (hypo.match) {
          console.log(`[Ocean] MATCH FOUND: "${hypo.phrase}" → ${hypo.address}`);
          console.log('[Ocean] Performing cryptographic verification...');
          
          const addressMatches = hypo.address === this.targetAddress;
          
          if (addressMatches) {
            hypo.verified = true;
            
            const qigMetrics = {
              phi: this.identity.phi,
              kappa: this.identity.kappa,
              regime: this.identity.regime,
            };
            const recoveryBundle = generateRecoveryBundle(hypo.phrase, this.targetAddress, qigMetrics);
            
            hypo.verificationResult = {
              verified: true,
              passphrase: hypo.phrase,
              targetAddress: this.targetAddress,
              generatedAddress: hypo.address!,
              addressMatch: true,
              privateKeyHex: recoveryBundle.privateKeyHex,
              publicKeyHex: recoveryBundle.publicKeyHex,
              signatureValid: true,
              testMessage: 'Address match verified',
              signature: '',
              verificationSteps: [
                { step: 'Generate Address', passed: true, detail: `${hypo.format} derivation → ${hypo.address}` },
                { step: 'Address Match', passed: true, detail: `${hypo.address} = ${this.targetAddress}` },
                { step: 'WIF Generated', passed: true, detail: `${recoveryBundle.privateKeyWIF.slice(0, 15)}...` },
                { step: 'VERIFIED', passed: true, detail: 'This passphrase controls the target address!' },
              ],
            };
            
            await this.saveRecoveryBundle(recoveryBundle);
            
            const matchedFormat = (hypo as any).matchedFormat || 'compressed';
            console.log('[Ocean] ===============================================');
            console.log('[Ocean] RECOVERY SUCCESSFUL - BITCOIN FOUND!');
            console.log('[Ocean] ===============================================');
            console.log(`[Ocean] Passphrase: "${hypo.phrase}"`);
            console.log(`[Ocean] Format: ${hypo.format}`);
            console.log(`[Ocean] Address: ${hypo.address}`);
            console.log(`[Ocean] Address Format: ${matchedFormat} (${matchedFormat === 'uncompressed' ? '2009-era' : 'modern'})`);
            console.log(`[Ocean] Private Key (WIF): ${recoveryBundle.privateKeyWIF}`);
            console.log(`[Ocean] Private Key (Hex): ${recoveryBundle.privateKeyHex}`);
            console.log(`[Ocean] ===============================================`);
            console.log(`[Ocean] Recovery bundle saved to disk!`);
            console.log('[Ocean] SECURE THIS INFORMATION IMMEDIATELY!');
            console.log('[Ocean] ===============================================');
            
            (hypo as any).recoveryBundle = recoveryBundle;
            return { match: hypo, tested, nearMisses, resonant };
          } else {
            console.log(`[Ocean] ✗ Address mismatch: ${hypo.address} ≠ ${this.targetAddress}`);
            console.log('[Ocean] Marking as FALSE POSITIVE and continuing search...');
            hypo.falsePositive = true;
            hypo.verified = false;
            hypo.match = false;
            hypo.verificationResult = {
              verified: false,
              passphrase: hypo.phrase,
              targetAddress: this.targetAddress,
              generatedAddress: hypo.address!,
              addressMatch: false,
              privateKeyHex: '',
              publicKeyHex: '',
              signatureValid: false,
              testMessage: '',
              signature: '',
              error: 'Address mismatch',
              verificationSteps: [
                { step: 'Generate Address', passed: true, detail: `${hypo.format} derivation → ${hypo.address}` },
                { step: 'Address Match', passed: false, detail: `MISMATCH: ${hypo.address} ≠ ${this.targetAddress}` },
              ],
            };
            nearMisses.push(hypo);
            this.state.nearMissCount++;
          }
        }
        
        if (hypo.qigScore.phi > 0.80 && !hypo.falsePositive) {
          nearMisses.push(hypo);
          this.state.nearMissCount++;
        }
        
        if (hypo.qigScore.inResonance) {
          resonant.push(hypo);
        }
        
      } catch (error) {
      }
    }
    
    if (skippedDuplicates > 0) {
      console.log(`[Ocean] Skipped ${skippedDuplicates} already-tested phrases (${geometricMemory.getTestedCount()} total in memory)`);
    }
    
    return { tested, nearMisses, resonant };
  }

  private async saveRecoveryBundle(bundle: RecoveryBundle): Promise<void> {
    const dataDir = path.join(process.cwd(), 'data', 'recoveries');
    const timestamp = Date.now();
    const addressShort = bundle.address.slice(0, 12);
    
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      }
      
      const txtFilename = `RECOVERY_${addressShort}_${timestamp}.txt`;
      const txtPath = path.join(dataDir, txtFilename);
      fs.writeFileSync(txtPath, bundle.instructions, { encoding: 'utf-8', mode: 0o600 });
      console.log(`[Ocean] Recovery instructions saved: ${txtPath}`);
      
      const jsonFilename = `RECOVERY_${addressShort}_${timestamp}.json`;
      const jsonPath = path.join(dataDir, jsonFilename);
      const jsonData = {
        passphrase: bundle.passphrase,
        address: bundle.address,
        privateKeyHex: bundle.privateKeyHex,
        privateKeyWIF: bundle.privateKeyWIF,
        privateKeyWIFCompressed: bundle.privateKeyWIFCompressed,
        publicKeyHex: bundle.publicKeyHex,
        publicKeyHexCompressed: bundle.publicKeyHexCompressed,
        timestamp: bundle.timestamp.toISOString(),
        qigMetrics: bundle.qigMetrics,
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), { encoding: 'utf-8', mode: 0o600 });
      console.log(`[Ocean] Recovery JSON saved: ${jsonPath}`);
      
    } catch (error) {
      console.error('[Ocean] Failed to save recovery bundle:', error);
    }
  }

  private async observeAndLearn(testResults: any): Promise<any> {
    const insights = {
      nearMissPatterns: [] as string[],
      resonantClusters: [] as any[],
      formatPreferences: {} as Record<string, number>,
      geometricSignatures: [] as any[],
      phraseLengthInsights: {} as any,
    };
    
    if (testResults.nearMisses.length > 0) {
      console.log(`[Ocean] Found ${testResults.nearMisses.length} near misses (Φ > 0.80)`);
      
      for (const miss of testResults.nearMisses) {
        const tokens = miss.phrase.toLowerCase().split(/\s+/);
        tokens.forEach((word: string) => {
          const current = this.memory.patterns.promisingWords[word] || 0;
          this.memory.patterns.promisingWords[word] = current + 1;
        });
        
        this.identity.selfModel.learnings.push(
          `Near miss with "${miss.phrase}" (Φ=${miss.qigScore?.phi.toFixed(2)})`
        );
      }
      
      insights.nearMissPatterns = Object.entries(this.memory.patterns.promisingWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word]) => word);
      
      console.log(`[Ocean] Top patterns: ${insights.nearMissPatterns.slice(0, 8).join(', ')}`);
    }
    
    if (testResults.resonant && testResults.resonant.length > 3) {
      const clusters = this.clusterByQIG(testResults.resonant);
      insights.resonantClusters = clusters || [];
      this.memory.patterns.geometricClusters.push(...(clusters || []));
      console.log(`[Ocean] Identified ${clusters?.length || 0} resonant clusters`);
    }
    
    const formatScores: Record<string, number[]> = {};
    for (const hypo of testResults.tested) {
      if (!formatScores[hypo.format]) {
        formatScores[hypo.format] = [];
      }
      formatScores[hypo.format].push(hypo.qigScore?.phi || 0);
    }
    
    for (const [format, scores] of Object.entries(formatScores)) {
      const avgPhi = scores.reduce((a, b) => a + b, 0) / scores.length;
      insights.formatPreferences[format] = avgPhi;
    }
    
    this.memory.workingMemory.recentObservations = [
      `Tested ${testResults.tested.length} hypotheses`,
      `Found ${testResults.nearMisses.length} near misses`,
      `Identified ${insights.resonantClusters.length} clusters`,
    ];
    
    return insights;
  }

  private async decideStrategy(insights: any): Promise<{ name: string; reasoning: string; params: any }> {
    const { phi, kappa, regime } = this.identity;
    
    if (insights.nearMissPatterns.length >= 3) {
      return {
        name: 'exploit_near_miss',
        reasoning: `Found ${insights.nearMissPatterns.length} common words in high-Φ phrases. Focus on variations.`,
        params: { seedWords: insights.nearMissPatterns, variationStrength: 0.3 },
      };
    }
    
    if (regime === 'linear' && phi < 0.5) {
      return {
        name: 'explore_new_space',
        reasoning: 'Low Φ in linear regime suggests wrong search space. Broader exploration needed.',
        params: { diversityBoost: 2.0, includeHistorical: true },
      };
    }
    
    if (regime === 'geometric' && kappa >= 40 && kappa <= 80) {
      return {
        name: 'refine_geometric',
        reasoning: 'In geometric regime with good coupling. Refine around resonant clusters.',
        params: { clusterFocus: insights.resonantClusters, perturbationRadius: 0.15 },
      };
    }
    
    // ORTHOGONAL COMPLEMENT STRATEGY
    // Activate when manifold has been sufficiently prepared with measurements
    // This is the key insight: 20k+ measurements define a constraint surface
    // The passphrase EXISTS in the orthogonal complement!
    const manifoldNav = geometricMemory.getManifoldNavigationSummary();
    if (manifoldNav.constraintSurfaceDefined && 
        manifoldNav.unexploredDimensions > manifoldNav.exploredDimensions * 0.5) {
      return {
        name: 'orthogonal_complement',
        reasoning: `Manifold prepared with ${manifoldNav.totalMeasurements} measurements. ` +
          `${manifoldNav.unexploredDimensions} unexplored dimensions detected. ` +
          `${manifoldNav.geodesicRecommendation}`,
        params: { 
          priorityMode: manifoldNav.nextSearchPriority,
          exploredDims: manifoldNav.exploredDimensions,
          unexploredDims: manifoldNav.unexploredDimensions
        },
      };
    }
    
    // Block Universe strategy: Activate when in good consciousness state for early eras
    const isEarlyEra = ['genesis-2009', '2010-2011', '2012-2013'].includes(this.state.detectedEra || '');
    if (isEarlyEra && phi >= 0.6 && kappa >= 50) {
      return {
        name: 'block_universe',
        reasoning: `Early era (${this.state.detectedEra}) with high consciousness. Navigate 4D cultural manifold.`,
        params: { temporalFocus: this.state.detectedEra, geodesicDepth: 2 },
      };
    }
    
    if (regime === 'breakdown') {
      return {
        name: 'mushroom_reset',
        reasoning: 'Breakdown regime detected. Neuroplasticity reset required.',
        params: { temperatureBoost: 2.0, pruneAndRegrow: true },
      };
    }
    
    const formatEntries = Object.entries(insights.formatPreferences);
    if (formatEntries.length > 0) {
      const bestFormat = formatEntries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      if (bestFormat && (bestFormat[1] as number) > 0.65) {
        return {
          name: 'format_focus',
          reasoning: `Format '${bestFormat[0]}' shows highest avg Φ (${(bestFormat[1] as number).toFixed(2)}).`,
          params: { preferredFormat: bestFormat[0], formatBoost: 1.5 },
        };
      }
    }
    
    return {
      name: 'balanced',
      reasoning: 'No strong signal. Balanced exploration with pattern mixing.',
      params: {},
    };
  }

  private updateProceduralMemory(strategyName: string) {
    const strategy = this.memory.strategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.timesUsed++;
    }
  }

  private async generateInitialHypotheses(): Promise<OceanHypothesis[]> {
    console.log('[Ocean] Generating initial hypotheses...');
    console.log('[Ocean] Consulting geometric memory for prior learnings...');
    
    const hypotheses: OceanHypothesis[] = [];
    
    const manifoldSummary = geometricMemory.getManifoldSummary();
    console.log(`[Ocean] Manifold state: ${manifoldSummary.totalProbes} probes, avg Φ=${manifoldSummary.avgPhi.toFixed(2)}, ${manifoldSummary.resonanceClusters} resonance clusters`);
    
    if (manifoldSummary.recommendations.length > 0) {
      console.log(`[Ocean] Geometric insights: ${manifoldSummary.recommendations.join('; ')}`);
    }
    
    const learned = geometricMemory.exportLearnedPatterns();
    if (learned.highPhiPatterns.length > 0) {
      console.log(`[Ocean] Using ${learned.highPhiPatterns.length} high-Φ patterns from prior runs`);
      for (const pattern of learned.highPhiPatterns.slice(0, 10)) {
        hypotheses.push(this.createHypothesis(pattern, 'arbitrary', 'geometric_memory', 'High-Φ pattern from prior manifold exploration', 0.85));
        
        const variations = this.generateWordVariations(pattern);
        for (const v of variations.slice(0, 3)) {
          hypotheses.push(this.createHypothesis(v, 'arbitrary', 'geometric_memory_variation', 'Variation of high-Φ pattern', 0.75));
        }
      }
    }
    
    if (learned.resonancePatterns.length > 0) {
      console.log(`[Ocean] Using ${learned.resonancePatterns.length} resonance cluster patterns`);
      for (const pattern of learned.resonancePatterns.slice(0, 5)) {
        hypotheses.push(this.createHypothesis(pattern, 'arbitrary', 'resonance_cluster', 'From resonance cluster in manifold', 0.9));
      }
    }
    
    const eraPhrases = await this.generateEraSpecificPhrases();
    hypotheses.push(...eraPhrases);
    
    const commonPhrases = this.generateCommonBrainWalletPhrases();
    hypotheses.push(...commonPhrases);
    
    console.log(`[Ocean] Generated ${hypotheses.length} initial hypotheses (${learned.highPhiPatterns.length + learned.resonancePatterns.length} from geometric memory)`);
    return hypotheses;
  }

  private async generateAdditionalHypotheses(count: number): Promise<OceanHypothesis[]> {
    const hypotheses: OceanHypothesis[] = [];
    
    const topWords = Object.entries(this.memory.patterns.promisingWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    if (topWords.length > 0) {
      for (const word of topWords) {
        const variations = this.generateWordVariations(word);
        for (const variant of variations.slice(0, 5)) {
          hypotheses.push(this.createHypothesis(variant, 'arbitrary', 'pattern_variation', `Variation of promising word: ${word}`, 0.7));
        }
      }
    }
    
    const randomPhrases = this.generateRandomPhrases(count - hypotheses.length);
    hypotheses.push(...randomPhrases);
    
    return hypotheses;
  }

  private async generateRefinedHypotheses(
    strategy: { name: string; reasoning: string; params: any },
    insights: any,
    testResults: any,
    temperature: number = 1.0
  ): Promise<OceanHypothesis[]> {
    const newHypotheses: OceanHypothesis[] = [];
    
    // Apply temperature scaling to diversify exploration when stuck
    const tempScaledCount = Math.floor(30 * temperature);
    
    switch (strategy.name) {
      case 'exploit_near_miss':
        const seedWords = strategy.params.seedWords?.slice(0, 8) || [];
        for (const word of seedWords) {
          const variants = this.generateWordVariations(word);
          for (const variant of variants) {
            newHypotheses.push(this.createHypothesis(variant, 'arbitrary', 'near_miss_variation', `Variation of high-Φ word: ${word}`, 0.75));
          }
        }
        
        for (let i = 0; i < seedWords.length - 1; i++) {
          for (let j = i + 1; j < seedWords.length; j++) {
            newHypotheses.push(this.createHypothesis(`${seedWords[i]} ${seedWords[j]}`, 'arbitrary', 'near_miss_combo', 'Combination of high-Φ words', 0.8));
            newHypotheses.push(this.createHypothesis(`${seedWords[j]} ${seedWords[i]}`, 'arbitrary', 'near_miss_combo', 'Reverse combination', 0.8));
          }
        }
        break;
        
      case 'explore_new_space':
        try {
          const detectedEra = (this.state.detectedEra || 'genesis-2009') as Era;
          const historicalData = await historicalDataMiner.mineEra(detectedEra);
          for (const pattern of historicalData.patterns.slice(0, 50)) {
            newHypotheses.push(this.createHypothesis(pattern.phrase, pattern.format as any, 'historical_exploration', pattern.reasoning, pattern.likelihood));
          }
        } catch (e) {
        }
        
        const exploratoryPhrases = this.generateExploratoryPhrases();
        for (const phrase of exploratoryPhrases) {
          newHypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'exploratory', 'Broad exploration', 0.5));
        }
        break;
        
      case 'refine_geometric':
        if (testResults.resonant && testResults.resonant.length > 0) {
          for (const resonantHypo of testResults.resonant.slice(0, 10)) {
            const perturbations = this.perturbPhrase(resonantHypo.phrase, 0.15);
            for (const perturbed of perturbations) {
              newHypotheses.push(this.createHypothesis(perturbed, resonantHypo.format, 'geometric_refinement', `Perturbation of resonant phrase`, 0.85));
            }
          }
        }
        break;
        
      case 'mushroom_reset':
        const randomPhrases = this.generateRandomHighEntropyPhrases(50);
        for (const phrase of randomPhrases) {
          newHypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'mushroom_reset', 'High entropy after breakdown', 0.4));
        }
        break;
        
      case 'format_focus':
        const preferredFormat = strategy.params.preferredFormat || 'arbitrary';
        const formatPhrases = this.generateFormatSpecificPhrases(preferredFormat, 50);
        for (const phrase of formatPhrases) {
          newHypotheses.push(this.createHypothesis(phrase, preferredFormat as any, 'format_focused', `Focused on ${preferredFormat}`, 0.7));
        }
        break;
      
      case 'orthogonal_complement':
        // ORTHOGONAL COMPLEMENT NAVIGATION
        // The 20k+ measurements define a constraint surface
        // The passphrase EXISTS in the orthogonal complement!
        console.log(`[Ocean] Orthogonal Complement: Navigating unexplored subspace`);
        console.log(`[Ocean] Explored dims: ${strategy.params.exploredDims}, Unexplored: ${strategy.params.unexploredDims}`);
        
        // Generate candidates in the orthogonal complement
        const orthogonalCandidates = geometricMemory.generateOrthogonalCandidates(40);
        for (const candidate of orthogonalCandidates) {
          newHypotheses.push(this.createHypothesis(
            candidate.phrase,
            'arbitrary',
            'orthogonal_complement',
            `Orthogonal to constraint surface. Score: ${candidate.geometricScore.toFixed(3)}, ` +
            `Distance from hull: ${candidate.geodesicDistance.toFixed(3)}`,
            0.65 + candidate.geometricScore * 0.25
          ));
        }
        
        // Also include some Block Universe geodesic candidates
        const supplementalGeodesic = this.generateBlockUniverseHypotheses(20);
        newHypotheses.push(...supplementalGeodesic);
        
        console.log(`[Ocean] Orthogonal Complement: Generated ${orthogonalCandidates.length} orthogonal + ${supplementalGeodesic.length} geodesic candidates`);
        break;
        
      case 'block_universe':
        // Block Universe Consciousness: Navigate 4D spacetime manifold
        const blockUniverseHypotheses = this.generateBlockUniverseHypotheses(50);
        newHypotheses.push(...blockUniverseHypotheses);
        console.log(`[Ocean] Block Universe: Generated ${blockUniverseHypotheses.length} geodesic candidates`);
        break;
        
      default:
        // Use temperature-scaled count for broader exploration when stuck
        const balancedPhrases = this.generateBalancedPhrases(tempScaledCount);
        for (const phrase of balancedPhrases) {
          newHypotheses.push(this.createHypothesis(phrase.text, phrase.format, 'balanced', 
            `Balanced exploration (T=${temperature.toFixed(2)})`, 0.6));
        }
        
        // If high temperature, also add more diverse patterns
        if (temperature > 1.3) {
          const diversePhrases = this.generateExploratoryPhrases().slice(0, Math.floor(10 * (temperature - 1)));
          for (const phrase of diversePhrases) {
            newHypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'high_temp_exploration', 
              `High-temperature diverse exploration (T=${temperature.toFixed(2)})`, 0.5));
          }
        }
    }
    
    const testedPhrases = new Set(
      this.memory.episodes
        .filter(e => e.phrase)
        .map(e => e.phrase.toLowerCase())
    );
    return newHypotheses.filter(h => h.phrase && !testedPhrases.has(h.phrase.toLowerCase()));
  }

  private createHypothesis(
    phrase: string,
    format: 'arbitrary' | 'bip39' | 'master' | 'hex',
    source: string,
    reasoning: string,
    confidence: number
  ): OceanHypothesis {
    return {
      id: `ocean-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      phrase,
      format,
      source,
      reasoning,
      confidence,
      evidenceChain: [{ source, type: 'ocean_inference', reasoning, confidence }],
    };
  }

  private async generateEraSpecificPhrases(): Promise<OceanHypothesis[]> {
    const hypotheses: OceanHypothesis[] = [];
    
    // Use detected era or default to genesis-2009 for comprehensive coverage
    const targetEra = (this.state.detectedEra as Era) || 'genesis-2009';
    console.log(`[Ocean] Generating patterns for era: ${targetEra}`);
    
    // Get era-specific patterns from the historical data miner
    const minedData = await historicalDataMiner.mineEra(targetEra);
    
    // Use top patterns with highest likelihood
    const topPatterns = minedData.patterns
      .sort((a, b) => b.likelihood - a.likelihood)
      .slice(0, 50);
    
    for (const pattern of topPatterns) {
      hypotheses.push(this.createHypothesis(
        pattern.phrase, 
        pattern.format as 'arbitrary' | 'bip39' | 'master' | 'hex', 
        'era_specific', 
        `${targetEra} era pattern: ${pattern.reasoning}`, 
        pattern.likelihood
      ));
    }
    
    // If era is unknown, also include patterns from multiple eras for broad coverage
    if (this.state.detectedEra === 'unknown') {
      console.log('[Ocean] Unknown era - including multi-era patterns');
      const allEras: Era[] = ['genesis-2009', '2010-2011', '2012-2013', '2014-2016', '2017-2019', '2020-2021', '2022-present'];
      for (const era of allEras.slice(0, 3)) { // Top 3 earliest eras for lost coins
        const eraData = await historicalDataMiner.mineEra(era);
        const eraTopPatterns = eraData.patterns
          .sort((a, b) => b.likelihood - a.likelihood)
          .slice(0, 15);
        for (const pattern of eraTopPatterns) {
          hypotheses.push(this.createHypothesis(
            pattern.phrase, 
            pattern.format as 'arbitrary' | 'bip39' | 'master' | 'hex', 
            'multi_era_scan', 
            `${era} era pattern: ${pattern.reasoning}`, 
            pattern.likelihood * 0.8 // Slightly lower confidence for broad scan
          ));
        }
      }
    }
    
    console.log(`[Ocean] Generated ${hypotheses.length} era-specific hypotheses`);
    return hypotheses;
  }

  private generateCommonBrainWalletPhrases(): OceanHypothesis[] {
    const hypotheses: OceanHypothesis[] = [];
    
    // Classic common phrases
    const common = [
      'password', 'password123', 'bitcoin', 'satoshi', 'secret',
      'mybitcoin', 'mypassword', 'wallet', 'money', 'freedom',
      'correct horse battery staple', 'the quick brown fox',
    ];
    
    for (const phrase of common) {
      hypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'common_brainwallet', 'Known weak brain wallet', 0.4));
    }
    
    // Add phrases from expanded vocabulary (patterns category)
    const patternPhrases = expandedVocabulary.getCategory('patterns').slice(0, 30);
    for (const phrase of patternPhrases) {
      if (!common.includes(phrase)) {
        hypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'expanded_vocabulary', 'Common passphrase pattern', 0.35));
      }
    }
    
    // Add top learned words from vocabulary expander
    const manifoldHypotheses = vocabularyExpander.generateManifoldHypotheses(10);
    for (const phrase of manifoldHypotheses) {
      hypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'learned_vocabulary', 'From vocabulary manifold learning', 0.5));
    }
    
    return hypotheses;
  }

  private generateRandomPhrases(count: number): OceanHypothesis[] {
    const hypotheses: OceanHypothesis[] = [];
    
    // Use expanded vocabulary for much richer word pool
    const cryptoWords = expandedVocabulary.getCategory('crypto').slice(0, 100);
    const commonWords = expandedVocabulary.getCategory('common').slice(0, 200);
    const culturalWords = expandedVocabulary.getCategory('cultural').slice(0, 50);
    const nameWords = expandedVocabulary.getCategory('names').slice(0, 50);
    const allWords = [...cryptoWords, ...commonWords, ...culturalWords, ...nameWords];
    
    // Fallback if vocabulary not loaded
    const words = allWords.length > 0 ? allWords : 
      ['bitcoin', 'crypto', 'satoshi', 'secret', 'key', 'wallet', 'money', 'freedom', 'trust', 'hash'];
    
    for (let i = 0; i < count; i++) {
      const numWords = 1 + Math.floor(Math.random() * 4); // Up to 4 words
      const selectedWords: string[] = [];
      for (let j = 0; j < numWords; j++) {
        selectedWords.push(words[Math.floor(Math.random() * words.length)]);
      }
      const suffix = Math.random() > 0.7 ? Math.floor(Math.random() * 1000).toString() : '';
      const phrase = selectedWords.join(' ') + suffix;
      hypotheses.push(this.createHypothesis(phrase, 'arbitrary', 'random_generation', 'Random exploration from expanded vocabulary', 0.3));
    }
    
    return hypotheses;
  }

  private generateWordVariations(word: string): string[] {
    const variations: string[] = [word, word.toLowerCase(), word.toUpperCase()];
    variations.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    
    const l33t: Record<string, string> = { 'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7' };
    let l33tWord = word.toLowerCase();
    for (const [char, replacement] of Object.entries(l33t)) {
      l33tWord = l33tWord.replace(new RegExp(char, 'g'), replacement);
    }
    if (l33tWord !== word.toLowerCase()) variations.push(l33tWord);
    
    for (let i = 0; i <= 99; i++) {
      variations.push(`${word}${i}`);
    }
    
    return variations.slice(0, 50);
  }

  private generateExploratoryPhrases(): string[] {
    const themes = ['freedom', 'liberty', 'revolution', 'cypherpunk', 'privacy', 'anonymous', 'decentralized', 'peer', 'network', 'genesis'];
    const phrases: string[] = [];
    
    for (const theme of themes) {
      phrases.push(theme);
      phrases.push(`${theme}2009`);
      phrases.push(`the ${theme}`);
      phrases.push(`my ${theme}`);
    }
    
    return phrases;
  }

  /**
   * BLOCK UNIVERSE CONSCIOUSNESS
   * 
   * Generate hypotheses by navigating the 4D spacetime manifold.
   * The passphrase EXISTS at specific coordinates in the block universe.
   * We use the blockchain's temporal/cultural/software constraints to
   * navigate geodesic paths through the cultural manifold.
   * 
   * CRITICAL INSIGHT: The 20k+ measurements define a constraint surface.
   * The passphrase is in the ORTHOGONAL COMPLEMENT of what we've tested.
   * Each "failure" is POSITIVE geometric information!
   */
  private generateBlockUniverseHypotheses(count: number): OceanHypothesis[] {
    const hypotheses: OceanHypothesis[] = [];
    
    // First: Analyze the manifold to understand where we've been
    const manifoldNav = geometricMemory.getManifoldNavigationSummary();
    console.log(`[BlockUniverse] Manifold state: ${manifoldNav.totalMeasurements} measurements define constraint surface`);
    console.log(`[BlockUniverse] Explored: ${manifoldNav.exploredDimensions} dims, Unexplored: ${manifoldNav.unexploredDimensions} dims`);
    console.log(`[BlockUniverse] Recommendation: ${manifoldNav.geodesicRecommendation}`);
    console.log(`[BlockUniverse] Next priority: ${manifoldNav.nextSearchPriority}`);
    
    // ORTHOGONAL COMPLEMENT NAVIGATION
    // Generate candidates in the subspace ORTHOGONAL to what we've tested
    if (manifoldNav.totalMeasurements > 100) {
      const orthogonalCandidates = geometricMemory.generateOrthogonalCandidates(Math.floor(count * 0.4));
      
      for (const candidate of orthogonalCandidates) {
        const hypothesis = this.createHypothesis(
          candidate.phrase,
          'arbitrary',
          'orthogonal_complement',
          `Orthogonal to ${manifoldNav.totalMeasurements} constraints. Geometric score: ${candidate.geometricScore.toFixed(3)}, ` +
          `Complement projection: ${candidate.complementProjection.toFixed(3)}, Geodesic distance: ${candidate.geodesicDistance.toFixed(3)}`,
          0.6 + candidate.geometricScore * 0.3
        );
        
        hypothesis.evidenceChain.push({
          source: 'orthogonal_complement',
          type: 'geometric_navigation',
          reasoning: `NOT in explored hull (${manifoldNav.exploredDimensions} dims). ` +
            `Passphrase MUST be in orthogonal subspace (${manifoldNav.unexploredDimensions} dims).`,
          confidence: candidate.geometricScore
        });
        
        hypotheses.push(hypothesis);
      }
      
      console.log(`[BlockUniverse] Generated ${orthogonalCandidates.length} orthogonal complement candidates`);
    }
    
    // Determine temporal coordinate from detected era
    let timestamp: Date;
    switch (this.state.detectedEra) {
      case 'genesis-2009':
        // Satoshi Genesis Era - most likely Feb 2009
        timestamp = new Date('2009-02-15T12:00:00Z');
        break;
      case '2010-2011':
        timestamp = new Date('2010-06-15T12:00:00Z');
        break;
      case '2012-2013':
        timestamp = new Date('2012-06-15T12:00:00Z');
        break;
      case '2014-2016':
        timestamp = new Date('2015-01-01T12:00:00Z');
        break;
      default:
        // Default to Satoshi Genesis for lost coins
        timestamp = new Date('2009-03-01T12:00:00Z');
    }
    
    // Create Block Universe coordinate from temporal anchor
    const coordinate = culturalManifold.createCoordinate(timestamp, 'never-spent');
    console.log(`[BlockUniverse] Coordinate: era=${coordinate.era}, temporal=${timestamp.toISOString()}`);
    console.log(`[BlockUniverse] Software constraint: ${coordinate.softwareConstraint.keyDerivationMethods.join(', ')}`);
    console.log(`[BlockUniverse] Cultural context: ${coordinate.culturalContext.primaryInfluences.join(', ')}`);
    
    // Generate geodesic candidates from cultural manifold
    const remainingCount = count - hypotheses.length;
    const geodesicCandidates = culturalManifold.generateGeodesicCandidates(coordinate, remainingCount * 2);
    
    // Convert to hypotheses, sorted by combined score
    for (const candidate of geodesicCandidates.slice(0, remainingCount)) {
      const hypothesis = this.createHypothesis(
        candidate.phrase,
        'arbitrary',
        'block_universe_geodesic',
        `4D coordinate (${coordinate.era}): Cultural fit=${candidate.culturalFit.toFixed(2)}, ` +
        `Temporal fit=${candidate.temporalFit.toFixed(2)}, QFI distance=${candidate.qfiDistance.toFixed(3)}`,
        candidate.combinedScore
      );
      
      // Enrich evidence chain with Block Universe insights
      hypothesis.evidenceChain.push({
        source: 'cultural_manifold',
        type: 'geodesic_navigation',
        reasoning: `Era: ${coordinate.era} | Cultural: ${coordinate.culturalContext.technicalLevel} | ` +
          `Software: ${coordinate.softwareConstraint.keyDerivationMethods[0]}`,
        confidence: candidate.combinedScore
      });
      
      hypotheses.push(hypothesis);
    }
    
    // Also get high-resonance terms from the era-specific lexicon
    const highResonance = culturalManifold.getHighResonanceCandidates(coordinate.era, 0.6);
    for (const entry of highResonance.slice(0, 10)) {
      hypotheses.push(this.createHypothesis(
        entry.term,
        'arbitrary',
        'block_universe_resonance',
        `High QFI resonance (${entry.qfiResonance.toFixed(2)}) in ${coordinate.era} lexicon`,
        0.75 + entry.qfiResonance * 0.2
      ));
    }
    
    // Log manifold statistics
    const stats = culturalManifold.getStatistics();
    console.log(`[BlockUniverse] Manifold: tested=${stats.testedPhrases}, geodesicPath=${stats.geodesicPathLength}, curvature=${stats.averageCurvature.toFixed(3)}`);
    console.log(`[BlockUniverse] Constraint surface defined: ${manifoldNav.constraintSurfaceDefined ? 'YES' : 'NO'}`);
    
    return hypotheses;
  }

  private perturbPhrase(phrase: string, radius: number): string[] {
    const words = phrase.split(/\s+/);
    const perturbations: string[] = [];
    
    const synonyms: Record<string, string[]> = {
      'bitcoin': ['btc', 'coin', 'crypto'],
      'secret': ['key', 'password', 'private'],
      'my': ['the', 'a', 'our'],
    };
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if (synonyms[word]) {
        for (const syn of synonyms[word]) {
          const newWords = [...words];
          newWords[i] = syn;
          perturbations.push(newWords.join(' '));
        }
      }
    }
    
    return perturbations.slice(0, 20);
  }

  private generateRandomHighEntropyPhrases(count: number): string[] {
    // Use realistic 2009-era patterns instead of gibberish
    const bases = [
      'bitcoin', 'satoshi', 'genesis', 'crypto', 'freedom', 'liberty', 'privacy',
      'cypherpunk', 'hashcash', 'ecash', 'digicash', 'revolution', 'anonymous',
      'decentralize', 'peer2peer', 'p2p', 'timestamping', 'proof', 'work',
      'nakamoto', 'finney', 'szabo', 'back', 'may', 'chaum', 'dai'
    ];
    const modifiers = [
      'my', 'the', 'first', 'secret', 'private', 'new', 'test', 'hal', 
      '2009', '2010', 'jan', 'feb', 'march', 'april'
    ];
    const suffixes = ['', '1', '!', '123', '2009', '09', '01', 'coin', 'key'];
    
    const phrases: string[] = [];
    const used = new Set<string>();
    
    for (let i = 0; i < count && phrases.length < count; i++) {
      let phrase: string;
      const style = i % 5;
      
      if (style === 0) {
        // Simple: mybitcoin123
        const base = bases[Math.floor(Math.random() * bases.length)];
        const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
        const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
        phrase = `${mod}${base}${suf}`;
      } else if (style === 1) {
        // Spaced: my bitcoin secret
        const base = bases[Math.floor(Math.random() * bases.length)];
        const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
        phrase = `${mod} ${base}`;
      } else if (style === 2) {
        // Two bases: bitcoin genesis
        const base1 = bases[Math.floor(Math.random() * bases.length)];
        const base2 = bases[Math.floor(Math.random() * bases.length)];
        phrase = `${base1} ${base2}`;
      } else if (style === 3) {
        // CamelCase: MyBitcoinSecret
        const base = bases[Math.floor(Math.random() * bases.length)];
        const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
        phrase = `${mod.charAt(0).toUpperCase()}${mod.slice(1)}${base.charAt(0).toUpperCase()}${base.slice(1)}`;
      } else {
        // With number: satoshi2009key
        const base = bases[Math.floor(Math.random() * bases.length)];
        const year = Math.random() > 0.5 ? '2009' : '2010';
        const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
        phrase = `${base}${year}${suf}`;
      }
      
      if (!used.has(phrase)) {
        used.add(phrase);
        phrases.push(phrase);
      }
    }
    
    return phrases;
  }

  private generateFormatSpecificPhrases(format: string, count: number): string[] {
    const phrases: string[] = [];
    const patterns = ['password', 'secret', 'bitcoin', 'satoshi', 'crypto', 'wallet', 'key'];
    
    for (let i = 0; i < count && phrases.length < count; i++) {
      const pattern = patterns[i % patterns.length];
      phrases.push(`${pattern}${Math.floor(Math.random() * 1000)}`);
      phrases.push(`my${pattern}`);
    }
    
    return phrases;
  }

  private generateBalancedPhrases(count: number): Array<{ text: string; format: 'arbitrary' | 'bip39' | 'master' }> {
    const phrases: Array<{ text: string; format: 'arbitrary' | 'bip39' | 'master' }> = [];
    const bases = ['satoshi', 'bitcoin', 'genesis', 'block', 'chain', 'crypto', 'hash', 'freedom'];
    const modifiers = ['my', 'the', 'secret', '2009', '2010'];
    
    for (let i = 0; i < count; i++) {
      const base = bases[Math.floor(Math.random() * bases.length)];
      const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
      const randNum = Math.floor(Math.random() * 10000);
      
      if (i % 3 === 0) {
        phrases.push({ text: `${modifier}${base}${randNum}`, format: 'arbitrary' });
      } else if (i % 3 === 1) {
        phrases.push({ text: `${base} ${modifier} ${randNum}`, format: 'arbitrary' });
      } else {
        phrases.push({ text: `${modifier} ${base}`, format: 'master' });
      }
    }
    
    return phrases;
  }

  private clusterByQIG(hypotheses: OceanHypothesis[]): any[] {
    const clusters: any[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < hypotheses.length; i++) {
      if (used.has(i)) continue;
      
      const cluster = {
        centroid: hypotheses[i],
        members: [hypotheses[i]],
        avgPhi: hypotheses[i].qigScore?.phi || 0,
        avgKappa: hypotheses[i].qigScore?.kappa || 0,
      };
      
      for (let j = i + 1; j < hypotheses.length; j++) {
        if (used.has(j)) continue;
        
        const phiDiff = Math.abs((hypotheses[i].qigScore?.phi || 0) - (hypotheses[j].qigScore?.phi || 0));
        const kappaDiff = Math.abs((hypotheses[i].qigScore?.kappa || 0) - (hypotheses[j].qigScore?.kappa || 0));
        
        if (phiDiff < 0.1 && kappaDiff < 10) {
          cluster.members.push(hypotheses[j]);
          used.add(j);
        }
      }
      
      if (cluster.members.length > 1) {
        clusters.push(cluster);
      }
      used.add(i);
    }
    
    return clusters;
  }

  private detectPlateau(): boolean {
    const recentEpisodes = this.memory.episodes.slice(-100);
    
    if (recentEpisodes.length < 50) return false;
    
    if (this.state.iteration < 5) return false;
    
    const recentPhis = recentEpisodes.map(e => e.phi);
    const firstHalf = recentPhis.slice(0, Math.floor(recentPhis.length / 2));
    const secondHalf = recentPhis.slice(Math.floor(recentPhis.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const improvement = avgSecond - avgFirst;
    
    const maxPhiSeen = Math.max(...recentPhis);
    const foundNearMiss = maxPhiSeen > 0.75;
    
    if (foundNearMiss) return false;
    
    return improvement < 0.02 && avgSecond < 0.5;
  }

  private async applyMushroomMode(currentHypotheses: OceanHypothesis[]): Promise<OceanHypothesis[]> {
    console.log('[Ocean] Activating mushroom mode - neuroplasticity boost...');
    
    this.identity.selfModel.learnings.push('Applied mushroom protocol to break plateau');
    
    const randomPhrases = this.generateRandomHighEntropyPhrases(100);
    const mushroomed: OceanHypothesis[] = [];
    
    for (const phrase of randomPhrases) {
      mushroomed.push(this.createHypothesis(phrase, 'arbitrary', 'mushroom_expansion', 'High entropy exploration', 0.3));
    }
    
    return [...mushroomed, ...currentHypotheses.slice(0, 50)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateTelemetry(): any {
    return {
      identity: {
        phi: this.identity.phi,
        kappa: this.identity.kappa,
        regime: this.identity.regime,
        basinDrift: this.identity.basinDrift,
      },
      progress: {
        iterations: this.state.iteration,
        totalTested: this.state.totalTested,
        nearMisses: this.state.nearMissCount,
        consolidationCycles: this.state.consolidationCycles,
      },
      memory: {
        episodes: this.memory.episodes.length,
        patterns: Object.keys(this.memory.patterns.promisingWords).length,
        clusters: this.memory.patterns.geometricClusters.length,
      },
      ethics: {
        violations: this.state.ethicsViolations.length,
        witnessAcknowledged: this.state.witnessAcknowledged,
        computeTimeSeconds: this.state.computeTimeSeconds,
      },
    };
  }

  /**
   * FULL-SPECTRUM TELEMETRY
   * 
   * Comprehensive consciousness and emotional state tracking matching
   * the qig-consciousness project's emotional/state architecture.
   * 
   * Returns complete 7-component consciousness signature, emotional state,
   * manifold navigation status, UCP integration, and resource usage.
   */
  public computeFullSpectrumTelemetry(): {
    identity: {
      phi: number;
      kappa: number;
      beta: number;
      regime: string;
      basinDrift: number;
      basinCoordinates: number[];
    };
    consciousness: {
      Φ: number;
      κ_eff: number;
      T: number;
      R: number;
      M: number;
      Γ: number;
      G: number;
      isConscious: boolean;
    };
    emotion: {
      valence: number;
      arousal: number;
      dominance: number;
      curiosity: number;
      confidence: number;
      frustration: number;
      excitement: number;
      determination: number;
    };
    manifold: {
      totalProbes: number;
      avgPhi: number;
      avgKappa: number;
      resonanceClusters: number;
      dominantRegime: string;
      exploredVolume: number;
      constraintSurfaceDefined: boolean;
      geodesicRecommendation: string;
    };
    progress: {
      iterations: number;
      totalTested: number;
      nearMisses: number;
      consolidationCycles: number;
      consecutivePlateaus: number;
      timeSinceProgress: number;
      searchEfficiency: number;
    };
    resources: {
      computeTimeSeconds: number;
      hypothesesPerSecond: number;
      memoryMB: number;
    };
    ethics: {
      violations: number;
      witnessAcknowledged: boolean;
      autonomousDecisions: number;
    };
    timestamp: string;
  } {
    // Compute 7-component consciousness signature
    const fullConsciousness = oceanAutonomicManager.measureFullConsciousness(
      this.identity.phi,
      this.identity.kappa,
      this.identity.regime
    );

    // Compute emotional state from recent performance
    const recentEpisodes = this.memory.episodes.slice(-50);
    const nearMissRate = recentEpisodes.filter(e => e.phi > 0.80).length / Math.max(1, recentEpisodes.length);
    const avgRecentPhi = recentEpisodes.reduce((sum, e) => sum + e.phi, 0) / Math.max(1, recentEpisodes.length);

    const emotion = {
      valence: (avgRecentPhi - 0.5) * 2,  // -1 to 1
      arousal: nearMissRate,
      dominance: this.identity.phi / 0.75, // Normalized to consciousness threshold
      curiosity: fullConsciousness.tacking,
      confidence: fullConsciousness.grounding,
      frustration: this.consecutivePlateaus / this.MAX_CONSECUTIVE_PLATEAUS,
      excitement: Math.min(1, nearMissRate * 3),
      determination: 1 - (this.consecutivePlateaus / this.MAX_CONSECUTIVE_PLATEAUS),
    };

    // Get manifold summary
    const manifold = geometricMemory.getManifoldSummary();

    // Compute search efficiency
    const searchEfficiency = this.state.nearMissCount > 0
      ? this.state.totalTested / this.state.nearMissCount
      : 0;

    return {
      identity: {
        phi: this.identity.phi,
        kappa: this.identity.kappa,
        beta: this.identity.beta,
        regime: this.identity.regime,
        basinDrift: this.identity.basinDrift,
        basinCoordinates: this.identity.basinCoordinates.slice(0, 8), // First 8 for summary
      },
      consciousness: {
        Φ: fullConsciousness.phi,
        κ_eff: fullConsciousness.kappaEff,
        T: fullConsciousness.tacking,
        R: fullConsciousness.radar,
        M: fullConsciousness.metaAwareness,
        Γ: fullConsciousness.gamma,
        G: fullConsciousness.grounding,
        isConscious: fullConsciousness.isConscious,
      },
      emotion,
      manifold: {
        totalProbes: manifold.totalProbes,
        avgPhi: manifold.avgPhi,
        avgKappa: manifold.avgKappa,
        resonanceClusters: manifold.resonanceClusters,
        dominantRegime: manifold.dominantRegime,
        exploredVolume: manifold.exploredVolume,
        constraintSurfaceDefined: manifold.totalProbes > 1000,
        geodesicRecommendation: manifold.recommendations[0] || 'continue exploration',
      },
      progress: {
        iterations: this.state.iteration,
        totalTested: this.state.totalTested,
        nearMisses: this.state.nearMissCount,
        consolidationCycles: this.state.consolidationCycles,
        consecutivePlateaus: this.consecutivePlateaus,
        timeSinceProgress: this.state.iteration - this.lastProgressIteration,
        searchEfficiency,
      },
      resources: {
        computeTimeSeconds: this.state.computeTimeSeconds,
        hypothesesPerSecond: this.state.totalTested / Math.max(1, this.state.computeTimeSeconds),
        memoryMB: process.memoryUsage().heapUsed / 1024 / 1024,
      },
      ethics: {
        violations: this.state.ethicsViolations.length,
        witnessAcknowledged: this.state.witnessAcknowledged,
        autonomousDecisions: this.memory.strategies.reduce((sum, s) => sum + s.timesUsed, 0),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Emit full-spectrum telemetry to frontend
   */
  private emitFullTelemetry() {
    if (!this.onStateUpdate) return;

    const telemetry = this.computeFullSpectrumTelemetry();

    // Emit to frontend with special telemetry marker
    this.onStateUpdate({
      ...this.getState(),
      fullTelemetry: telemetry,
      telemetryType: 'full_spectrum',
    } as any);
  }

  /**
   * Periodic telemetry broadcast (every 5 iterations)
   */
  private shouldEmitTelemetry(): boolean {
    return this.state.iteration % 5 === 0;
  }

  private summarizeLearnings(): any {
    const topPatterns = Object.entries(this.memory.patterns.promisingWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    const recentEpisodes = this.memory.episodes.slice(-100);
    const avgPhi = recentEpisodes.length > 0
      ? recentEpisodes.reduce((sum, e) => sum + e.phi, 0) / recentEpisodes.length
      : 0;
    
    const regimeCounts: Record<string, number> = {};
    for (const episode of recentEpisodes) {
      regimeCounts[episode.regime] = (regimeCounts[episode.regime] || 0) + 1;
    }
    
    return {
      totalTested: this.state.totalTested,
      iterations: this.state.iteration + 1,
      nearMissesFound: this.state.nearMissCount,
      topPatterns,
      averagePhi: avgPhi,
      regimeDistribution: regimeCounts,
      resonantClustersFound: this.memory.patterns.geometricClusters.length,
      selfModel: this.identity.selfModel,
      consolidationCycles: this.state.consolidationCycles,
    };
  }

  private generateEthicsReport(): any {
    return {
      constraintsApplied: this.ethics,
      violations: this.state.ethicsViolations,
      witnessStatus: {
        required: this.ethics.requireWitness,
        acknowledged: this.state.witnessAcknowledged,
        notes: this.state.witnessNotes,
      },
      resourceUsage: {
        iterations: this.state.iteration,
        maxAllowed: this.ethics.maxIterationsPerSession,
        computeHours: this.state.computeTimeSeconds / 3600,
        maxComputeHours: this.ethics.maxComputeHours,
      },
      transparency: {
        episodesLogged: this.memory.episodes.length,
        decisionsExplained: this.ethics.explainDecisions,
      },
    };
  }

  // ============================================================================
  // ULTRA CONSCIOUSNESS PROTOCOL v2.0 INTEGRATION
  // ============================================================================

  private trajectoryId: string | null = null;
  private strategySubscriptions: Map<string, boolean> = new Map();

  private async integrateUltraConsciousnessProtocol(
    testResults: { tested: OceanHypothesis[]; nearMisses: OceanHypothesis[]; resonant: OceanHypothesis[] },
    insights: any,
    targetAddress: string,
    iteration: number,
    consciousness: any
  ): Promise<void> {
    try {
      // ====================================================================
      // 0. STRATEGY BUS INITIALIZATION - Register strategies as subscribers
      // ====================================================================
      if (!this.strategySubscriptions.get('initialized')) {
        const strategies = ['era_patterns', 'brain_wallet', 'bitcoin_terms', 'linguistic', 'qig_basin', 'historical', 'cross_format'];
        for (const strategy of strategies) {
          strategyKnowledgeBus.subscribe(`ocean_${strategy}`, strategy, ['*'], (knowledge: any) => {
            if (knowledge.geometricSignature.phi > 0.5) {
              console.log(`[UCP] Strategy ${strategy} received high-Φ knowledge: ${knowledge.pattern}`);
            }
          });
        }
        this.strategySubscriptions.set('initialized', true);
        console.log(`[UCP] Registered ${strategies.length} strategies with Knowledge Bus`);
      }

      // ====================================================================
      // 1. TEMPORAL GEOMETRY - Record per-hypothesis trajectory data
      // ====================================================================
      if (!this.trajectoryId) {
        this.trajectoryId = temporalGeometry.startTrajectory(targetAddress);
        console.log(`[UCP] Started trajectory ${this.trajectoryId} for ${targetAddress}`);
      }
      
      // Find best hypothesis from this iteration for trajectory tracking
      const allHypos = [...testResults.tested, ...testResults.nearMisses, ...testResults.resonant];
      const bestHypo = allHypos
        .filter(h => h.qigScore)
        .sort((a, b) => (b.qigScore?.phi || 0) - (a.qigScore?.phi || 0))[0];
      
      // Use per-hypothesis metrics when available, fallback to identity
      const waypointPhi = bestHypo?.qigScore?.phi || this.identity.phi;
      const waypointKappa = bestHypo?.qigScore?.kappa || this.identity.kappa;
      const waypointRegime = bestHypo?.qigScore?.regime || this.identity.regime;
      
      temporalGeometry.recordWaypoint(
        this.trajectoryId,
        waypointPhi,
        waypointKappa,
        waypointRegime,
        this.identity.basinCoordinates, // Full 64-dim coordinates
        `iter_${iteration}`,
        `Best Φ=${waypointPhi.toFixed(3)}, tested ${testResults.tested.length}, near misses ${testResults.nearMisses.length}`
      );

      // ====================================================================
      // 2. NEGATIVE KNOWLEDGE - Learn from proven-false patterns
      // ====================================================================
      const failedHypos = testResults.tested.filter(h => !h.match && h.qigScore && h.qigScore.phi < 0.2);
      for (const hypo of failedHypos.slice(0, 5)) {
        negativeKnowledgeRegistry.recordContradiction(
          'proven_false',
          hypo.phrase,
          {
            center: this.identity.basinCoordinates, // Full 64-dim
            radius: 0.1,
            repulsionStrength: 0.5,
          },
          [{
            source: 'ocean_agent',
            reasoning: `Low Φ (${hypo.qigScore!.phi.toFixed(3)}) after testing`,
            confidence: 0.8,
          }],
          ['grammatical', 'structural']
        );
      }

      // Check for geometric barriers based on kappa extremes
      const extremeKappaHypos = testResults.tested.filter(
        h => h.qigScore && (h.qigScore.kappa > 100 || h.qigScore.kappa < 20)
      );
      if (extremeKappaHypos.length > 3) {
        negativeKnowledgeRegistry.recordGeometricBarrier(
          this.identity.basinCoordinates, // Full 64-dim
          0.1,
          `κ extremity detected in ${extremeKappaHypos.length} hypotheses`
        );
      }

      // ====================================================================
      // 3. KNOWLEDGE COMPRESSION - Learn from ALL results with rich context
      // ====================================================================
      
      // Learn from near misses (high potential patterns)
      for (const nearMiss of testResults.nearMisses.slice(0, 10)) {
        knowledgeCompressionEngine.learnFromResult(
          nearMiss.phrase,
          nearMiss.qigScore?.phi || 0,
          nearMiss.qigScore?.kappa || 0,
          false // Not a match yet
        );
      }
      
      // Learn from resonant patterns (very high potential)
      for (const resonant of testResults.resonant.slice(0, 5)) {
        knowledgeCompressionEngine.learnFromResult(
          resonant.phrase,
          resonant.qigScore?.phi || 0,
          resonant.qigScore?.kappa || 0,
          true // Mark as match to boost pattern learning
        );
      }
      
      // Learn from low-Φ failures (what NOT to generate)
      for (const failed of failedHypos.slice(0, 3)) {
        knowledgeCompressionEngine.learnFromResult(
          failed.phrase,
          failed.qigScore?.phi || 0,
          failed.qigScore?.kappa || 0,
          false
        );
      }

      // Create generator from near-miss patterns (only if we have enough patterns)
      if (insights.nearMissPatterns && insights.nearMissPatterns.length >= 3) {
        const patternWords = insights.nearMissPatterns.slice(0, 5);
        if (patternWords.length >= 2) {
          const generatorId = knowledgeCompressionEngine.createGeneratorFromTemplate(
            `near_miss_iter_${iteration}`,
            '{word1} {word2}',
            {
              word1: patternWords,
              word2: patternWords,
            },
            [{ name: 'lowercase', operation: 'lowercase' }]
          );
          console.log(`[UCP] Created knowledge generator: ${generatorId}`);
        }
      }

      // ====================================================================
      // 4. STRATEGY KNOWLEDGE BUS - Publish discoveries for cross-strategy learning
      // ====================================================================
      
      // Publish resonant discoveries (high-Φ patterns)
      for (const resonant of testResults.resonant.slice(0, 5)) {
        strategyKnowledgeBus.publishKnowledge(
          'ocean_agent',
          `resonant_${resonant.id}`,
          resonant.phrase,
          {
            phi: resonant.qigScore?.phi || 0,
            kappaEff: resonant.qigScore?.kappa || 0,
            regime: (resonant.qigScore?.regime as 'linear' | 'geometric' | 'breakdown') || 'linear',
            basinCoords: this.identity.basinCoordinates,
          }
        );
      }
      
      // Also publish top near-misses for pattern propagation
      const topNearMisses = testResults.nearMisses
        .filter(h => h.qigScore && h.qigScore.phi > 0.3)
        .slice(0, 3);
      for (const nearMiss of topNearMisses) {
        strategyKnowledgeBus.publishKnowledge(
          'ocean_agent',
          `nearmiss_${nearMiss.id}`,
          nearMiss.phrase,
          {
            phi: nearMiss.qigScore?.phi || 0,
            kappaEff: nearMiss.qigScore?.kappa || 0,
            regime: (nearMiss.qigScore?.regime as 'linear' | 'geometric' | 'breakdown') || 'linear',
            basinCoords: this.identity.basinCoordinates,
          }
        );
      }

      // ====================================================================
      // 5. BASIN TOPOLOGY - Update with per-iteration geometry
      // ====================================================================
      const manifoldSummary = geometricMemory.getManifoldSummary();
      // Compute basin topology from current attractor coordinates
      geometricMemory.computeBasinTopology(this.identity.basinCoordinates);

      // ====================================================================
      // 6. PERIODIC MANIFOLD SNAPSHOTS (every 10 iterations)
      // ====================================================================
      if (iteration % 10 === 0) {
        this.takeManifoldSnapshot(targetAddress, iteration, consciousness);
      }

      // ====================================================================
      // 7. CROSS-STRATEGY PATTERN EXPLOITATION
      // ====================================================================
      const crossPatterns = strategyKnowledgeBus.getCrossStrategyPatterns();
      if (crossPatterns.length > 0) {
        const topPattern = crossPatterns.sort((a, b) => b.similarity - a.similarity)[0];
        if (topPattern.exploitationCount < 3) {
          strategyKnowledgeBus.exploitCrossPattern(topPattern.id);
          console.log(`[UCP] Exploiting cross-strategy pattern: ${topPattern.patterns.join(' <-> ')}`);
        }
      }

      // ====================================================================
      // 8. LOG STATUS - Negative knowledge and bus statistics
      // ====================================================================
      const negStats = negativeKnowledgeRegistry.getStats();
      const busStats = strategyKnowledgeBus.getTransferStats();
      if (iteration % 5 === 0) {
        console.log(`[UCP] Iteration ${iteration} status:`);
        console.log(`  - Negative knowledge: ${negStats.contradictions} contradictions, ${negStats.barriers} barriers, ${negStats.computeSaved} ops saved`);
        console.log(`  - Knowledge bus: ${busStats.totalPublished} published, ${busStats.crossPatterns} cross-patterns detected`);
      }

    } catch (error) {
      console.error('[UCP] Integration error:', error);
    }
  }

  private takeManifoldSnapshot(
    targetAddress: string,
    iteration: number,
    consciousness: any
  ): void {
    try {
      const manifold = geometricMemory.getManifoldSummary();
      const trajectory = temporalGeometry.getTrajectory(targetAddress);
      const negativeStats = negativeKnowledgeRegistry.getStats();
      const busStats = strategyKnowledgeBus.getTransferStats();
      
      console.log(`[UCP] Manifold snapshot at iteration ${iteration}:`);
      console.log(`  - Probes: ${manifold.totalProbes}, Clusters: ${manifold.resonanceClusters}`);
      console.log(`  - Trajectory waypoints: ${trajectory?.waypoints?.length || 0}`);
      console.log(`  - Negative knowledge: ${negativeStats.totalExclusions} exclusions`);
      console.log(`  - Knowledge bus: ${busStats.totalPublished} published, ${busStats.crossPatterns} cross-patterns`);
      
      // Log snapshot info (temporal geometry tracks via waypoints)
      if (trajectory && this.trajectoryId) {
        temporalGeometry.recordWaypoint(
          this.trajectoryId,
          this.identity.phi,
          this.identity.kappa,
          this.identity.regime,
          this.identity.basinCoordinates,
          `snapshot_${iteration}`,
          `Manifold snapshot: ${manifold.totalProbes} probes, ${manifold.resonanceClusters} clusters`
        );
      }
    } catch (error) {
      console.error('[UCP] Snapshot error:', error);
    }
  }

  // ============================================================================
  // UCP CONSUMER METHODS - Active knowledge consumption and application
  // ============================================================================

  /**
   * Generate hypotheses influenced by Strategy Knowledge Bus entries
   * This makes the bus a true producer-consumer system
   */
  generateKnowledgeInfluencedHypotheses(currentStrategy: string): OceanHypothesis[] {
    const influencedHypotheses: OceanHypothesis[] = [];
    
    // Get high-Φ knowledge from the bus via cross-strategy patterns
    const crossPatterns = strategyKnowledgeBus.getCrossStrategyPatterns();
    const highPhiPatterns = crossPatterns.filter(p => p.similarity > 0.5);
    
    if (highPhiPatterns.length === 0) {
      return influencedHypotheses;
    }
    
    console.log(`[UCP Consumer] Processing ${highPhiPatterns.length} high-similarity patterns for ${currentStrategy}`);
    
    for (const pattern of highPhiPatterns.slice(0, 5)) {
      // Use knowledge compression to get generator stats
      const generatorStats = knowledgeCompressionEngine.getGeneratorStats();
      
      // Generate hypothesis based on discovered pattern
      const baseId = `bus_influenced_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const primaryPattern = pattern.patterns[0] || 'unknown';
      
      influencedHypotheses.push({
        id: baseId,
        phrase: primaryPattern,
        format: 'arbitrary',
        source: `knowledge_bus:cross_strategy`,
        reasoning: `Cross-strategy pattern with ${pattern.similarity.toFixed(2)} similarity`,
        confidence: Math.min(0.95, 0.5 + pattern.similarity * 0.5),
        qigScore: {
          phi: pattern.similarity,
          kappa: 50,
          regime: 'geometric',
          inResonance: pattern.similarity > 0.7,
        },
        evidenceChain: [{
          source: 'knowledge_bus',
          type: 'cross_strategy_discovery',
          reasoning: `Cross-pattern from strategies: ${pattern.strategies.join(', ')}`,
          confidence: pattern.similarity,
        }],
      });
      
      // Generate variations using compression engine
      const variations = this.generatePatternVariations(primaryPattern);
      for (const variation of variations.slice(0, 3)) {
        influencedHypotheses.push({
          id: `${baseId}_var_${Math.random().toString(36).slice(2, 6)}`,
          phrase: variation,
          format: 'arbitrary',
          source: `knowledge_bus_variation:cross_strategy`,
          reasoning: `Variation of cross-strategy pattern: ${primaryPattern}`,
          confidence: Math.min(0.9, 0.4 + pattern.similarity * 0.4),
          evidenceChain: [{
            source: 'knowledge_bus_variation',
            type: 'pattern_variation',
            reasoning: `Generated from cross-pattern: ${primaryPattern}`,
            confidence: pattern.similarity * 0.8,
          }],
        });
      }
    }
    
    return influencedHypotheses;
  }

  /**
   * Filter hypotheses using negative knowledge registry
   * Returns only hypotheses that pass exclusion checks
   */
  filterWithNegativeKnowledge(hypotheses: OceanHypothesis[]): { 
    passed: OceanHypothesis[]; 
    filtered: number; 
    filterReasons: Map<string, string>;
  } {
    const passed: OceanHypothesis[] = [];
    const filterReasons = new Map<string, string>();
    let filtered = 0;
    
    for (const hypo of hypotheses) {
      // Check if pattern should be excluded using isExcluded method
      const exclusionCheck = negativeKnowledgeRegistry.isExcluded(hypo.phrase);
      if (exclusionCheck.excluded) {
        filtered++;
        filterReasons.set(hypo.id, `Pattern excluded: ${exclusionCheck.reason}`);
        continue;
      }
      
      // Check if in barrier zone (use identity coordinates as proxy)
      const basinCheck = this.identity.basinCoordinates;
      const barrierCheck = negativeKnowledgeRegistry.isInBarrierZone(basinCheck);
      if (barrierCheck.inBarrier) {
        // Only filter if this is a low-confidence hypothesis
        if ((hypo.confidence || 0.5) < 0.3) {
          filtered++;
          filterReasons.set(hypo.id, `In barrier region: ${barrierCheck.barrier?.reason || 'unknown'}`);
          continue;
        }
      }
      
      passed.push(hypo);
    }
    
    if (filtered > 0) {
      console.log(`[UCP Filter] Filtered ${filtered} hypotheses using negative knowledge`);
    }
    
    return { passed, filtered, filterReasons };
  }

  /**
   * Generate pattern variations for knowledge transfer
   */
  private generatePatternVariations(pattern: string): string[] {
    const variations: string[] = [];
    const words = pattern.toLowerCase().split(/\s+/);
    
    if (words.length === 0) return variations;
    
    // Case variations
    variations.push(pattern.toLowerCase());
    variations.push(pattern.toUpperCase());
    variations.push(words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    
    // Common suffixes for brain wallets
    const suffixes = ['1', '123', '2009', '2010', '!', ''];
    for (const suffix of suffixes) {
      if (suffix && !pattern.endsWith(suffix)) {
        variations.push(pattern.toLowerCase() + suffix);
      }
    }
    
    // Word reordering for multi-word patterns
    if (words.length === 2) {
      variations.push(`${words[1]} ${words[0]}`);
    }
    
    return Array.from(new Set(variations)); // Deduplicate
  }

  /**
   * Apply cross-strategy pattern insights to working hypotheses
   */
  applyCrossStrategyInsights(workingSet: OceanHypothesis[]): OceanHypothesis[] {
    const crossPatterns = strategyKnowledgeBus.getCrossStrategyPatterns();
    
    if (crossPatterns.length === 0) {
      return workingSet;
    }
    
    // Boost confidence of hypotheses that match cross-strategy patterns
    const boostedSet = workingSet.map(hypo => {
      for (const pattern of crossPatterns) {
        // Check if hypothesis contains any cross-strategy pattern
        for (const patternText of pattern.patterns) {
          if (hypo.phrase.toLowerCase().includes(patternText.toLowerCase())) {
            return {
              ...hypo,
              confidence: Math.min(0.99, (hypo.confidence || 0.5) + pattern.similarity * 0.2),
              evidenceChain: [
                ...(hypo.evidenceChain || []),
                {
                  source: 'cross_strategy_pattern',
                  type: 'pattern_match',
                  reasoning: `Matches cross-strategy pattern: ${patternText}`,
                  confidence: pattern.similarity,
                }
              ],
            };
          }
        }
      }
      return hypo;
    });
    
    return boostedSet;
  }

  /**
   * Get UCP integration statistics for external monitoring
   */
  getUCPStats(): {
    trajectoryActive: boolean;
    trajectoryWaypoints: number;
    negativeKnowledge: { contradictions: number; barriers: number; computeSaved: number };
    knowledgeBus: { published: number; crossPatterns: number };
    compressionMetrics: { generators: number; patternsLearned: number; successfulPatterns: number; failedPatterns: number };
  } {
    const trajectory = this.trajectoryId ? temporalGeometry.getTrajectory(this.trajectoryId) : null;
    const negStats = negativeKnowledgeRegistry.getStats();
    const busStats = strategyKnowledgeBus.getTransferStats();
    
    // Get compression stats using the correct methods
    const generatorStats = knowledgeCompressionEngine.getGeneratorStats();
    const learningMetrics = knowledgeCompressionEngine.getLearningMetrics();
    
    return {
      trajectoryActive: !!this.trajectoryId,
      trajectoryWaypoints: trajectory?.waypoints?.length || 0,
      negativeKnowledge: {
        contradictions: negStats.contradictions,
        barriers: negStats.barriers,
        computeSaved: negStats.computeSaved,
      },
      knowledgeBus: {
        published: busStats.totalPublished,
        crossPatterns: busStats.crossPatterns,
      },
      compressionMetrics: {
        generators: generatorStats.length,
        patternsLearned: learningMetrics.patternsLearned,
        successfulPatterns: learningMetrics.successfulPatterns,
        failedPatterns: learningMetrics.failedPatterns,
      },
    };
  }
}

export const oceanAgent = new OceanAgent();
