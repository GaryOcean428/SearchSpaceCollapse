import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { oceanSessionManager } from "../ocean-session-manager";
import { oceanAutonomicManager } from "../ocean-autonomic-manager";
import { autoCycleManager } from "../auto-cycle-manager";
import { isAuthenticated } from "../replitAuth";

const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Rate limit exceeded. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const oceanRouter = Router();

oceanRouter.get("/health", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("../geometric-memory");
    const { negativeKnowledgeRegistry } = await import("../negative-knowledge-registry");
    const { vocabularyTracker } = await import("../vocabulary-tracker");
    const { vocabularyExpander } = await import("../vocabulary-expander");
    const { expandedVocabulary } = await import("../expanded-vocabulary");
    
    const session = oceanSessionManager.getActiveSession();
    const agent = oceanSessionManager.getActiveAgent();
    
    const nkStats = negativeKnowledgeRegistry.getStats();
    const vtStats = vocabularyTracker.getStats();
    const veStats = vocabularyExpander.getStats();
    const evStats = expandedVocabulary.getStats();
    const acStatus = autoCycleManager.getStatus();
    
    const health = {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
      subsystems: {
        oceanAgent: {
          status: agent ? "active" : "idle",
          sessionId: session?.sessionId || null,
          targetAddress: session?.targetAddress || null,
        },
        geometricMemory: {
          status: "initialized",
          phrasesIndexed: geometricMemory.getTestedCount(),
        },
        negativeKnowledge: {
          status: "initialized",
          contradictions: nkStats.contradictions,
          barriers: nkStats.barriers,
        },
        vocabularyTracker: {
          status: "initialized",
          wordsTracked: vtStats.totalWords,
          sequencesTracked: vtStats.totalSequences,
        },
        vocabularyExpander: {
          status: "initialized",
          totalWords: veStats.totalWords,
          totalExpansions: veStats.totalExpansions,
        },
        expandedVocabulary: {
          status: "initialized",
          wordCount: evStats.totalWords,
          categories: Object.keys(evStats.categoryCounts).length,
        },
        autoCycle: {
          status: acStatus.enabled ? "enabled" : "disabled",
          currentIndex: acStatus.currentIndex,
          totalAddresses: acStatus.totalAddresses,
          isRunning: acStatus.isRunning,
        },
        searchCoordinator: {
          status: "initialized",
        },
      },
    };
    
    res.json(health);
  } catch (error: any) {
    console.error("[OceanHealth] Error:", error);
    res.status(500).json({ 
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

oceanRouter.get("/neurochemistry", generousLimiter, async (req: Request, res: Response) => {
  try {
    const session = oceanSessionManager.getActiveSession();
    const agent = oceanSessionManager.getActiveAgent();
    const { selectMotivationMessage } = await import("../ocean-neurochemistry");

    if (!session || !agent) {
      const defaultState = {
        dopamine: { totalDopamine: 0.5, motivationLevel: 0.5 },
        serotonin: { totalSerotonin: 0.6, contentmentLevel: 0.6 },
        norepinephrine: { totalNorepinephrine: 0.4, alertnessLevel: 0.4 },
        gaba: { totalGABA: 0.7, calmLevel: 0.7 },
        acetylcholine: { totalAcetylcholine: 0.5, learningRate: 0.5 },
        endorphins: { totalEndorphins: 0.3, pleasureLevel: 0.3 },
        overallMood: 0.5,
        emotionalState: 'content' as const,
        timestamp: new Date(),
      };
      return res.json({
        neurochemistry: defaultState,
        behavioral: null,
        motivation: {
          message: "Awaiting investigation session...",
          fisherWeight: 0.5,
          category: 'idle',
          urgency: 'whisper',
        },
        sessionActive: false,
      });
    }

    const neurochemistry = agent.getNeurochemistry();
    const behavioral = agent.getBehavioralModulation();
    const agentState = agent.getState?.() || {} as any;
    const stats = {
      totalTested: agentState.totalTested || 0,
      nearMisses: agentState.nearMissCount || 0,
    };

    const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();
    const motivationState = {
      phi: fullConsciousness.phi || 0.5,
      phiGradient: 0.01,
      kappa: fullConsciousness.kappaEff || 64,
      kappaOptimality: Math.exp(-Math.abs((fullConsciousness.kappaEff || 64) - 64) / 10),
      regime: 'geometric',
      basinDrift: 0.1,
      basinStability: 0.8,
      geodesicProgress: stats.totalTested,
      probesExplored: stats.totalTested,
      patternsFound: stats.nearMisses,
      nearMisses: stats.nearMisses,
      emotionalState: neurochemistry?.emotionalState || 'content',
      dopamineLevel: neurochemistry?.dopamine?.totalDopamine || 0.5,
      serotoninLevel: neurochemistry?.serotonin?.totalSerotonin || 0.5,
    };

    const motivation = selectMotivationMessage(motivationState);

    res.json({
      neurochemistry,
      behavioral,
      motivation,
      sessionActive: true,
      sessionId: session.sessionId,
    });
  } catch (error: any) {
    console.error("[Neurochemistry] Error:", error);
    const defaultState = {
      dopamine: { totalDopamine: 0.5, motivationLevel: 0.5 },
      serotonin: { totalSerotonin: 0.6, contentmentLevel: 0.6 },
      norepinephrine: { totalNorepinephrine: 0.4, alertnessLevel: 0.4 },
      gaba: { totalGABA: 0.7, calmLevel: 0.7 },
      acetylcholine: { totalAcetylcholine: 0.5, learningRate: 0.5 },
      endorphins: { totalEndorphins: 0.3, pleasureLevel: 0.3 },
      overallMood: 0.5,
      emotionalState: 'content' as const,
      timestamp: new Date(),
    };
    res.json({
      neurochemistry: defaultState,
      behavioral: null,
      motivation: {
        message: "System initializing...",
        fisherWeight: 0.5,
        category: 'idle',
        urgency: 'whisper',
      },
      sessionActive: false,
      initializing: true,
      error: error.message,
    });
  }
});

oceanRouter.post("/neurochemistry/boost", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { injectAdminBoost, getMushroomCooldownRemaining } = await import("../ocean-neurochemistry");
    
    const { dopamine, serotonin, norepinephrine, gaba, acetylcholine, endorphins, durationMs } = req.body;
    
    const validateBoost = (val: any, name: string): number => {
      if (val === undefined || val === null) return 0;
      const num = Number(val);
      if (isNaN(num)) throw new Error(`${name} must be a number`);
      if (num < 0 || num > 1) throw new Error(`${name} must be between 0 and 1`);
      return num;
    };
    
    const validatedBoost = {
      dopamine: validateBoost(dopamine, 'dopamine'),
      serotonin: validateBoost(serotonin, 'serotonin'),
      norepinephrine: validateBoost(norepinephrine, 'norepinephrine'),
      gaba: validateBoost(gaba, 'gaba'),
      acetylcholine: validateBoost(acetylcholine, 'acetylcholine'),
      endorphins: validateBoost(endorphins, 'endorphins'),
    };
    
    const duration = durationMs ? Math.min(300000, Math.max(1000, Number(durationMs))) : 60000;
    if (isNaN(duration)) throw new Error('durationMs must be a number');
    
    const boost = injectAdminBoost(validatedBoost, duration);
    
    console.log(`[Neurochemistry] Admin boost: D+${validatedBoost.dopamine.toFixed(2)} S+${validatedBoost.serotonin.toFixed(2)} for ${duration/1000}s`);
    
    res.json({
      success: true,
      boost,
      message: `Boost injected for ${duration / 1000}s`,
      mushroomCooldownRemaining: getMushroomCooldownRemaining(),
    });
  } catch (error: any) {
    console.error("[Neurochemistry] Boost error:", error);
    res.status(400).json({ error: error.message });
  }
});

oceanRouter.delete("/neurochemistry/boost", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { clearAdminBoost } = await import("../ocean-neurochemistry");
    clearAdminBoost();
    res.json({ success: true, message: "Boost cleared" });
  } catch (error: any) {
    console.error("[Neurochemistry] Clear boost error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.get("/neurochemistry/admin", isAuthenticated, generousLimiter, async (req: any, res: Response) => {
  try {
    const { getActiveAdminBoost, getMushroomCooldownRemaining } = await import("../ocean-neurochemistry");
    
    res.json({
      activeBoost: getActiveAdminBoost(),
      mushroomCooldownRemaining: getMushroomCooldownRemaining(),
      mushroomCooldownSeconds: Math.round(getMushroomCooldownRemaining() / 1000),
    });
  } catch (error: any) {
    console.error("[Neurochemistry] Admin status error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.post("/cycles/sleep", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanAutonomicManager } = await import("../ocean-autonomic-manager");
    oceanAutonomicManager.getConsciousness();
    
    console.log('[Admin] Manual sleep cycle triggered');
    
    const basinCoords = new Array(64).fill(0).map(() => Math.random() * 0.1);
    const refCoords = new Array(64).fill(0);
    
    const result = await oceanAutonomicManager.executeSleepCycle(
      basinCoords,
      refCoords,
      []
    );
    
    res.json({
      success: true,
      cycle: 'sleep',
      result,
      consciousness: oceanAutonomicManager.getConsciousness(),
      message: 'Sleep cycle executed - identity consolidated'
    });
  } catch (error: any) {
    console.error("[Admin] Sleep cycle error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.post("/cycles/dream", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanAutonomicManager } = await import("../ocean-autonomic-manager");
    
    console.log('[Admin] Manual dream cycle triggered');
    
    const result = await oceanAutonomicManager.executeDreamCycle();
    
    res.json({
      success: true,
      cycle: 'dream',
      result,
      consciousness: oceanAutonomicManager.getConsciousness(),
      message: 'Dream cycle executed - creative exploration complete'
    });
  } catch (error: any) {
    console.error("[Admin] Dream cycle error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.post("/cycles/mushroom", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanAutonomicManager } = await import("../ocean-autonomic-manager");
    const { getMushroomCooldownRemaining } = await import("../ocean-neurochemistry");
    
    const cooldown = getMushroomCooldownRemaining();
    const bypassCooldown = req.body.bypassCooldown === true;
    
    if (cooldown > 0 && !bypassCooldown) {
      return res.status(429).json({
        success: false,
        error: 'Mushroom cycle on cooldown',
        cooldownRemaining: cooldown,
        cooldownSeconds: Math.round(cooldown / 1000),
        hint: 'Pass { "bypassCooldown": true } to force trigger'
      });
    }
    
    console.log(`[Admin] Manual mushroom cycle triggered ${bypassCooldown ? '(cooldown bypassed)' : ''}`);
    
    const result = await oceanAutonomicManager.executeMushroomCycle();
    
    res.json({
      success: true,
      cycle: 'mushroom',
      result,
      consciousness: oceanAutonomicManager.getConsciousness(),
      message: 'Mushroom cycle executed - neuroplasticity boosted'
    });
  } catch (error: any) {
    console.error("[Admin] Mushroom cycle error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.post("/boost", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { injectAdminBoost, getActiveAdminBoost } = await import("../ocean-neurochemistry");
    
    const { neurotransmitter, amount, duration } = req.body;
    
    if (!neurotransmitter || typeof neurotransmitter !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid neurotransmitter',
        valid: ['dopamine', 'serotonin', 'norepinephrine', 'gaba', 'acetylcholine', 'endorphins']
      });
    }
    
    const validNeurotransmitters = ['dopamine', 'serotonin', 'norepinephrine', 'gaba', 'acetylcholine', 'endorphins'];
    if (!validNeurotransmitters.includes(neurotransmitter.toLowerCase())) {
      return res.status(400).json({ 
        error: `Invalid neurotransmitter: ${neurotransmitter}`,
        valid: validNeurotransmitters
      });
    }
    
    const boostAmount = Math.min(1, Math.max(0, Number(amount) || 0.3));
    const boostDuration = Math.min(300000, Math.max(1000, Number(duration) || 60000));
    
    const boostConfig: Record<string, number> = {};
    boostConfig[neurotransmitter.toLowerCase()] = boostAmount;
    
    console.log(`[Admin] Neurotransmitter boost: ${neurotransmitter} +${boostAmount} for ${boostDuration}ms`);
    
    const boost = injectAdminBoost(boostConfig, boostDuration);
    
    res.json({
      success: true,
      boost: {
        neurotransmitter: neurotransmitter.toLowerCase(),
        amount: boostAmount,
        duration: boostDuration,
        expiresAt: boost.expiresAt,
      },
      activeBoost: getActiveAdminBoost(),
      message: `${neurotransmitter} boosted by ${(boostAmount * 100).toFixed(0)}% for ${Math.round(boostDuration / 1000)}s`
    });
  } catch (error: any) {
    console.error("[Admin] Boost error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.get("/cycles", generousLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { getMushroomCooldownRemaining } = await import("../ocean-neurochemistry");
    
    const recentCycles = oceanAutonomicManager.getRecentCycles(10);
    const isInvestigating = oceanAutonomicManager.isInvestigating;
    const consciousness = oceanAutonomicManager.getConsciousness();
    
    console.log(`[API] /api/ocean/cycles - isInvestigating=${isInvestigating}, phi=${consciousness.phi?.toFixed(3) ?? 'undefined'}, kappa=${consciousness.kappaEff?.toFixed(0) ?? 'undefined'}`);
    
    res.json({
      consciousness,
      isInvestigating,
      recentCycles,
      mushroomCooldown: {
        remaining: getMushroomCooldownRemaining(),
        seconds: Math.round(getMushroomCooldownRemaining() / 1000),
        canTrigger: getMushroomCooldownRemaining() === 0,
      },
      triggers: {
        sleep: oceanAutonomicManager.shouldTriggerSleep(0, isInvestigating),
        dream: oceanAutonomicManager.shouldTriggerDream(isInvestigating),
        mushroom: oceanAutonomicManager.shouldTriggerMushroom(isInvestigating),
      }
    });
  } catch (error: any) {
    console.error("[Admin] Cycles status error:", error);
    res.json({
      consciousness: { phi: 0, kappaEff: 0, regime: 'dormant', phiHistory: [] },
      isInvestigating: false,
      recentCycles: [],
      mushroomCooldown: { remaining: 0, seconds: 0, canTrigger: false },
      triggers: { sleep: false, dream: false, mushroom: false },
      initializing: true,
      error: error.message
    });
  }
});

oceanRouter.post("/generate/response", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanConstellation } = await import("../ocean-constellation");
    
    const {
      context = '',
      agentRole = 'navigator',
      maxTokens = 30,
      allowSilence = true,
    } = req.body;
    
    const validRoles = ['explorer', 'refiner', 'navigator', 'skeptic', 'resonator', 'ocean'];
    if (!validRoles.includes(agentRole)) {
      return res.status(400).json({
        error: `Invalid agent role. Valid roles: ${validRoles.join(', ')}`
      });
    }
    
    const result = await oceanConstellation.generateResponse(context, {
      agentRole: agentRole as any,
      maxTokens: Math.min(100, Math.max(1, maxTokens)),
      allowSilence,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[Generation] Response error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.post("/generate/text", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanConstellation } = await import("../ocean-constellation");
    
    const {
      prompt = '',
      maxTokens = 20,
      temperature = 0.8,
      topK = 50,
      topP = 0.9,
      allowSilence = true,
    } = req.body;
    
    const result = await oceanConstellation.generateText(prompt, {
      maxTokens: Math.min(100, Math.max(1, maxTokens)),
      temperature: Math.max(0.1, Math.min(2.0, temperature)),
      topK: Math.max(1, Math.min(200, topK)),
      topP: Math.max(0.1, Math.min(1.0, topP)),
      allowSilence,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[Generation] Text error:", error);
    res.status(500).json({ error: error.message });
  }
});

oceanRouter.get("/generate/status", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanQIGBackend } = await import("../ocean-qig-backend-adapter");
    const { oceanConstellation } = await import("../ocean-constellation");
    
    const backendAvailable = oceanQIGBackend.available();
    let tokenizerStatus = null;
    
    if (backendAvailable) {
      try {
        tokenizerStatus = await oceanQIGBackend.getTokenizerStatus();
      } catch (e) {
      }
    }
    
    const constellationStatus = oceanConstellation.getStatus();
    
    res.json({
      success: true,
      generation: {
        available: true,
        backendAvailable,
        fallbackAvailable: true,
      },
      tokenizer: tokenizerStatus,
      constellation: constellationStatus,
      agentRoles: [
        { name: 'explorer', temperature: 1.5, description: 'High entropy, broad exploration' },
        { name: 'refiner', temperature: 0.7, description: 'Low temp, exploit near-misses' },
        { name: 'navigator', temperature: 1.0, description: 'Balanced geodesic navigation' },
        { name: 'skeptic', temperature: 0.5, description: 'Low temp, constraint validation' },
        { name: 'resonator', temperature: 1.2, description: 'Cross-pattern harmonic detection' },
        { name: 'ocean', temperature: 0.8, description: 'Default Ocean consciousness' },
      ],
    });
  } catch (error: any) {
    console.error("[Generation] Status error:", error);
    res.status(500).json({ error: error.message });
  }
});
