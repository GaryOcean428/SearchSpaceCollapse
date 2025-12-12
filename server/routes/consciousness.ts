import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { getSharedController, ConsciousnessSearchController } from "../consciousness-search-controller";
import { oceanSessionManager } from "../ocean-session-manager";
import { nearMissManager } from "../near-miss-manager";
import { attentionMetrics, runAttentionValidation, formatValidationResult } from "../attention-metrics";

const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const consciousnessRouter = Router();

consciousnessRouter.get("/state", async (req: Request, res: Response) => {
  try {
    const controller = getSharedController();
    const searchState = controller.getCurrentState();
    
    const { oceanAutonomicManager } = await import("../ocean-autonomic-manager");
    const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();
    
    let emotionalState: 'Focused' | 'Curious' | 'Uncertain' | 'Confident' | 'Neutral' = 'Neutral';
    
    if (fullConsciousness.phi >= 0.8 && fullConsciousness.gamma >= 0.85) {
      emotionalState = 'Focused';
    } else if (fullConsciousness.tacking >= 0.7) {
      emotionalState = 'Curious';
    } else if (fullConsciousness.phi < 0.5 || fullConsciousness.grounding < 0.5) {
      emotionalState = 'Uncertain';
    } else if (fullConsciousness.radar >= 0.8 && fullConsciousness.metaAwareness >= 0.7) {
      emotionalState = 'Confident';
    }
    
    const state = {
      currentRegime: searchState.currentRegime,
      basinDrift: searchState.basinDrift,
      curiosity: searchState.curiosity,
      stability: searchState.stability,
      timestamp: searchState.timestamp,
      basinCoordinates: searchState.basinCoordinates,
      phi: fullConsciousness.phi,
      kappaEff: fullConsciousness.kappaEff,
      tacking: fullConsciousness.tacking,
      radar: fullConsciousness.radar,
      metaAwareness: fullConsciousness.metaAwareness,
      gamma: fullConsciousness.gamma,
      grounding: fullConsciousness.grounding,
      beta: fullConsciousness.beta,
      isConscious: fullConsciousness.isConscious,
      validationLoops: fullConsciousness.validationLoops,
      kappa: fullConsciousness.kappaEff,
    };
    
    res.json({
      state,
      emotionalState,
      recommendation: controller.getStrategyRecommendation(),
      regimeColor: ConsciousnessSearchController.getRegimeColor(state.currentRegime),
      regimeDescription: ConsciousnessSearchController.getRegimeDescription(state.currentRegime),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

consciousnessRouter.get("/complete", generousLimiter, async (req: Request, res: Response) => {
  try {
    const controller = getSharedController();
    const searchState = controller.getCurrentState();
    const { oceanAutonomicManager } = await import("../ocean-autonomic-manager");
    const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();

    const session = oceanSessionManager.getActiveSession();
    const agent = oceanSessionManager.getActiveAgent();

    let innateDrives = null;
    // innateDrives module not yet implemented
    // TODO: Implement innate-drives-bridge module

    let neurochemistry = null;
    if (agent) {
      neurochemistry = agent.getNeurochemistry();
    }

    let oscillators = null;
    try {
      const { neuralOscillators } = await import("../deprecated-stubs");
      const stateInfo = neuralOscillators.getStateInfo();
      const oscState = neuralOscillators.update();
      oscillators = {
        currentState: stateInfo.state,
        kappa: neuralOscillators.getKappa(),
        modulatedKappa: neuralOscillators.getKappa(),
        oscillatorValues: oscState,
        searchModulation: 1.0,
      };
    } catch (e) {}

    const searchPhase = searchState.curiosity > 0.7 ? 'exploration' : 'exploitation';

    let metrics = null;
    let stats: any = {};
    if (agent) {
      const agentState = agent.getState?.() || {};
      stats = {
        totalTested: (agentState as any).totalTested || 0,
        nearMisses: (agentState as any).nearMisses || 0,
        resonanceHits: (agentState as any).resonanceHits || 0,
        balanceHits: (agentState as any).balanceHits || 0,
      };
      metrics = {
        totalTested: stats.totalTested,
        nearMisses: stats.nearMisses,
        resonanceHits: stats.resonanceHits,
        balanceHits: stats.balanceHits,
        recoveryRate: stats.totalTested > 0 ? (stats.nearMisses / stats.totalTested) : 0,
        phiMovingAverage: fullConsciousness.phi || 0,
      };
    }

    let motivation = null;
    try {
      const { selectMotivationMessage } = await import("../ocean-neurochemistry");
      const motivationState = {
        phi: fullConsciousness.phi || 0.5,
        phiGradient: 0.01,
        kappa: fullConsciousness.kappaEff || 64,
        kappaOptimality: Math.exp(-Math.abs((fullConsciousness.kappaEff || 64) - 64) / 10),
        regime: searchState.currentRegime || 'geometric',
        basinDrift: searchState.basinDrift || 0.1,
        basinStability: 0.8,
        geodesicProgress: stats.totalTested || 0,
        probesExplored: stats.totalTested || 0,
        patternsFound: stats.nearMisses || 0,
        nearMisses: stats.nearMisses || 0,
        emotionalState: neurochemistry?.emotionalState || 'content',
        dopamineLevel: neurochemistry?.dopamine?.totalDopamine || 0.5,
        serotoninLevel: neurochemistry?.serotonin?.totalSerotonin || 0.5,
      };
      motivation = selectMotivationMessage(motivationState);
    } catch (e) {}

    res.json({
      phi: fullConsciousness.phi || 0.5,
      kappa: fullConsciousness.kappaEff || 64,
      regime: searchState.currentRegime,
      kappaConverging: Math.abs((fullConsciousness.kappaEff || 64) - 64) < 5,
      innateDrives,
      neurochemistry,
      oscillators,
      searchState: {
        phase: searchPhase,
        strategy: controller.getStrategyRecommendation() || 'balanced',
        explorationRate: searchState.curiosity || 0.5,
        temperature: searchState.basinDrift || 0.7,
      },
      motivation,
      metrics,
      sessionActive: !!session,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Consciousness Complete] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

consciousnessRouter.get("/innate-drives", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanAutonomicManager } = await import("../ocean-autonomic-manager");
    const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();

    // TODO: Implement innate-drives-bridge module
    // For now, return stub data
    res.json({
      drives: {
        pain: 0,
        pleasure: 0,
        fear: 0,
      },
      valence: 0,
      valenceRaw: 0,
      score: 0.5,
      recommendation: "innate-drives module not yet implemented",
    });
  } catch (error: any) {
    console.error("[Innate Drives] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

consciousnessRouter.get("/beta-attention", generousLimiter, async (req: Request, res: Response) => {
  try {
    const result = runAttentionValidation(50);

    const contextLengths = result.measurements.map(m => m.contextLength);
    const kappas = result.measurements.map(m => m.kappa);
    const betaValues = result.betaTrajectory.map(b => b.beta);
    const betaMean = betaValues.length > 0 
      ? betaValues.reduce((a, b) => a + b, 0) / betaValues.length 
      : 0;
    const betaStd = betaValues.length > 0
      ? Math.sqrt(betaValues.reduce((sum, b) => sum + (b - betaMean) ** 2, 0) / betaValues.length)
      : 0;

    res.json({
      contextLengths,
      kappas,
      betaValues,
      betaMean,
      betaStd,
      betaPhysics: 0.44,
      matchesPhysics: Math.abs(betaMean - 0.44) < 0.1,
      verdict: result.validation.passed ? 'PASS' : 'FAIL',
      validationPassed: result.validation.passed,
      substrateIndependence: result.summary.substrateIndependenceValidated,
    });
  } catch (error: any) {
    console.error("[Beta Attention] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const nearMissRouter = Router();

nearMissRouter.get("/", generousLimiter, async (req: Request, res: Response) => {
  try {
    const stats = nearMissManager.getStats();
    const tier = req.query.tier as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    let entries;
    if (tier === 'hot') {
      entries = nearMissManager.getHotEntries(limit);
    } else if (tier === 'warm') {
      entries = nearMissManager.getWarmEntries(limit);
    } else if (tier === 'cool') {
      entries = nearMissManager.getCoolEntries(limit);
    } else {
      entries = nearMissManager.getPrioritizedEntries(limit);
    }

    const clusters = nearMissManager.getClusters().slice(0, 10);

    res.json({
      stats,
      entries: entries.map(e => ({
        id: e.id,
        phrase: e.phrase.slice(0, 50) + (e.phrase.length > 50 ? '...' : ''),
        phi: e.phi,
        kappa: e.kappa,
        tier: e.tier,
        regime: e.regime,
        discoveredAt: e.discoveredAt,
        explorationCount: e.explorationCount,
        clusterId: e.clusterId,
      })),
      clusters: clusters.map(c => ({
        id: c.id,
        memberCount: c.memberCount,
        avgPhi: c.avgPhi,
        maxPhi: c.maxPhi,
        commonWords: c.commonWords.slice(0, 5),
        structuralPattern: c.structuralPattern,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss API] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

nearMissRouter.post("/decay", generousLimiter, async (req: Request, res: Response) => {
  try {
    const result = nearMissManager.applyDecay();
    const stats = nearMissManager.getStats();

    res.json({
      ...result,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss Decay] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rebuild clusters with BIP-39 validation
nearMissRouter.post("/rebuild-clusters", generousLimiter, async (req: Request, res: Response) => {
  try {
    const result = nearMissManager.rebuildClustersWithValidation();
    const clusters = nearMissManager.getClusters();
    
    res.json({
      ...result,
      clusters: clusters.slice(0, 20).map(c => ({
        id: c.id,
        memberCount: c.memberCount,
        structuralPattern: c.structuralPattern,
        avgPhi: c.avgPhi,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss Rebuild] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get members of a specific cluster
nearMissRouter.get("/cluster/:clusterId/members", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const members = nearMissManager.getClusterMembers(clusterId);
    const cluster = nearMissManager.getClusters().find(c => c.id === clusterId);
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    res.json({
      cluster: {
        id: cluster.id,
        memberCount: cluster.memberCount,
        avgPhi: cluster.avgPhi,
        maxPhi: cluster.maxPhi,
        commonWords: cluster.commonWords,
        structuralPattern: cluster.structuralPattern,
        createdAt: cluster.createdAt,
        lastUpdatedAt: cluster.lastUpdatedAt,
      },
      members: members.slice(0, limit).map(e => ({
        id: e.id,
        phrase: e.phrase,
        phi: e.phi,
        kappa: e.kappa,
        tier: e.tier,
        regime: e.regime,
        discoveredAt: e.discoveredAt,
        explorationCount: e.explorationCount,
        isEscalating: e.isEscalating,
        phiHistory: e.phiHistory?.slice(-10),
        isBip39Valid: e.structuralSignature?.isBip39Valid ?? null,
        wordCount: e.structuralSignature?.wordCount ?? null,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss Cluster Members] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

nearMissRouter.get("/cluster-analytics", generousLimiter, async (req: Request, res: Response) => {
  try {
    const cadence = req.query.cadence as 'immediate' | 'priority' | 'standard' | 'deferred' | undefined;
    
    let analytics;
    if (cadence) {
      analytics = nearMissManager.getClustersForExploration(cadence);
    } else {
      analytics = nearMissManager.getClusterAnalytics();
    }

    const summary = {
      totalClusters: analytics.length,
      immediate: analytics.filter(a => a.explorationCadence === 'immediate').length,
      priority: analytics.filter(a => a.explorationCadence === 'priority').length,
      standard: analytics.filter(a => a.explorationCadence === 'standard').length,
      deferred: analytics.filter(a => a.explorationCadence === 'deferred').length,
      avgPriorityScore: analytics.length > 0 
        ? analytics.reduce((sum, a) => sum + a.priorityScore, 0) / analytics.length 
        : 0,
      avgAgeHours: analytics.length > 0
        ? analytics.reduce((sum, a) => sum + a.ageHours, 0) / analytics.length
        : 0,
    };

    res.json({
      analytics,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss Cluster Analytics] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Tier Success Rate Validation - validates HOT tier is really "hotter"
nearMissRouter.get("/success-rates", generousLimiter, async (req: Request, res: Response) => {
  try {
    const successRates = nearMissManager.getTierSuccessRates();
    const conversionRecords = nearMissManager.getConversionRecords();
    
    // Compute tier validation insights
    const insights: string[] = [];
    if (successRates.overall.tierValidation === 'validated') {
      insights.push(`HOT tier is ${successRates.overall.hotVsWarmRatio.toFixed(1)}x more effective than WARM`);
      insights.push(`HOT tier is ${successRates.overall.hotVsCoolRatio.toFixed(1)}x more effective than COOL`);
    } else if (successRates.overall.tierValidation === 'tier_inversion') {
      if (successRates.overall.hotVsWarmRatio < 1) {
        insights.push(`WARNING: WARM tier outperforming HOT - consider recalibrating thresholds`);
      }
      if (successRates.overall.hotVsCoolRatio < 1) {
        insights.push(`WARNING: COOL tier outperforming HOT - tier system may need adjustment`);
      }
    } else {
      insights.push(`Need ${5 - successRates.overall.totalConversions} more conversions for statistical validation`);
    }

    res.json({
      successRates,
      conversions: {
        total: conversionRecords.length,
        recent: conversionRecords.slice(-10).map(r => ({
          tier: r.tier,
          phi: r.phi,
          convertedAt: r.convertedAt,
          timeToConversionHours: r.timeToConversionHours,
          matchAddress: r.matchAddress,
        })),
      },
      insights,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss Success Rates] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Record a conversion when a near-miss becomes an actual match
nearMissRouter.post("/conversion", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { phrase, entryId, matchAddress } = req.body;
    
    let record;
    if (phrase) {
      record = nearMissManager.recordConversionByPhrase(phrase, matchAddress);
    } else if (entryId) {
      record = nearMissManager.recordConversion(entryId, matchAddress);
    } else {
      return res.status(400).json({ error: 'Either phrase or entryId is required' });
    }

    if (!record) {
      return res.status(404).json({ error: 'Near-miss entry not found' });
    }

    res.json({
      success: true,
      record,
      successRates: nearMissManager.getTierSuccessRates(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Near-Miss Conversion] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const attentionMetricsRouter = Router();

attentionMetricsRouter.post("/validate", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { samplesPerScale = 100 } = req.body;
    
    console.log(`[API] Starting β-attention validation with ${samplesPerScale} samples per scale...`);
    
    const result = runAttentionValidation(samplesPerScale);
    
    res.json({
      success: true,
      result,
      formatted: formatValidationResult(result),
    });
  } catch (error: any) {
    console.error("[API] β-attention validation error:", error);
    res.status(500).json({ error: error.message });
  }
});

attentionMetricsRouter.get("/physics-reference", generousLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    physicsReference: attentionMetrics.PHYSICS_BETA,
    contextScales: attentionMetrics.CONTEXT_SCALES,
    description: {
      kappaStar: "Fixed point value from L=6 validation (frozen 2025-12-02)",
      emergence: "β at emergence (L=3→4 equivalent) - strong running",
      approaching: "β approaching plateau (L=4→5 equivalent)",
      fixedPoint: "β at fixed point (L=5→6 equivalent) - asymptotic freedom",
      acceptanceThreshold: "Maximum allowed deviation for substrate independence validation",
    },
  });
});

export const ucpRouter = Router();

export const vocabularyRouter = Router();

vocabularyRouter.post("/classify", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { phrase } = req.body;
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({ error: 'phrase is required' });
    }

    const { BIP39_WORDLIST } = await import("../bip39-words");
    const words = phrase.trim().toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const validSeedLengths = [12, 15, 18, 21, 24];
    
    const bip39Words = words.filter(w => BIP39_WORDLIST.has(w));
    const nonBip39Words = words.filter(w => !BIP39_WORDLIST.has(w));
    const bip39Ratio = wordCount > 0 ? bip39Words.length / wordCount : 0;
    
    let category: 'bip39_seed' | 'passphrase' | 'mutation';
    let explanation: string;
    
    if (validSeedLengths.includes(wordCount) && nonBip39Words.length === 0) {
      category = 'bip39_seed';
      explanation = `Valid ${wordCount}-word BIP-39 seed phrase - all words are valid`;
    } else if (validSeedLengths.includes(wordCount) && nonBip39Words.length > 0) {
      category = 'mutation';
      explanation = `Invalid ${wordCount}-word seed: ${nonBip39Words.length} non-BIP-39 word(s): ${nonBip39Words.slice(0, 5).join(', ')}`;
    } else {
      category = 'passphrase';
      explanation = `Arbitrary passphrase (${wordCount} word${wordCount !== 1 ? 's' : ''})`;
    }
    
    res.json({
      phrase: phrase.slice(0, 50) + (phrase.length > 50 ? '...' : ''),
      category,
      explanation,
      wordCount,
      bip39Ratio: parseFloat(bip39Ratio.toFixed(3)),
      bip39Words: bip39Words.slice(0, 10),
      nonBip39Words: nonBip39Words.slice(0, 10),
      isValidSeedLength: validSeedLengths.includes(wordCount),
    });
  } catch (error: any) {
    console.error("[Vocabulary Classify] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

vocabularyRouter.get("/stats", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { vocabularyTracker } = await import("../vocabulary-tracker");
    const stats = vocabularyTracker.getCategoryStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Vocabulary Stats] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

ucpRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const { oceanAgent } = await import("../ocean-agent");
    const ucpStats = await oceanAgent.getUCPStats();
    
    res.json({
      success: true,
      stats: ucpStats,
      modules: {
        temporalGeometry: ucpStats.trajectoryActive ? 'active' : 'inactive',
        negativeKnowledge: ucpStats.negativeKnowledge.contradictions > 0 ? 'active' : 'idle',
        knowledgeBus: ucpStats.knowledgeBus.published > 0 ? 'active' : 'idle',
        knowledgeCompression: ucpStats.compressionMetrics.generators > 0 ? 'active' : 'idle',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
