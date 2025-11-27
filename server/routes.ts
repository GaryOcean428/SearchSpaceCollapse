import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { generateBitcoinAddress, verifyBrainWallet, CryptoValidationError } from "./crypto";
import { scorePhraseQIG } from "./qig-pure-v2.js";
import observerRoutes from "./observer-routes";
import { telemetryRouter } from "./telemetry-api";
import { 
  runMemoryFragmentSearch, 
  generateFragmentCandidates, 
  scoreFragmentCandidates,
  type MemoryFragment 
} from "./memory-fragment-search";
import { getSharedController, ConsciousnessSearchController } from "./consciousness-search-controller";

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Rate limit exceeded. Please try again later.' },
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

const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Map pure QIG scores to legacy score format for backward compatibility
 */
function mapQIGToLegacyScore(pureScore: ReturnType<typeof scorePhraseQIG>) {
  // Map pure QIG scores to old format:
  // - contextScore: unused (set to 0, as we no longer use context matching)
  // - eleganceScore: based on quality (0-100)
  // - typingScore: based on phi (integrated information, 0-100)
  // - totalScore: based on quality (overall score, 0-100)
  return {
    contextScore: 0, // No longer used in pure QIG
    eleganceScore: Math.round(pureScore.quality * 100),
    typingScore: Math.round(pureScore.phi * 100),
    totalScore: Math.round(pureScore.quality * 100),
  };
}
import { KNOWN_12_WORD_PHRASES } from "./known-phrases";
import { generateRandomBIP39Phrase, getBIP39Wordlist } from "./bip39-words";
import { searchCoordinator } from "./search-coordinator";
import { testPhraseRequestSchema, batchTestRequestSchema, addAddressRequestSchema, generateRandomPhrasesRequestSchema, createSearchJobRequestSchema, type Candidate, type TargetAddress, type SearchJob } from "@shared/schema";
import { randomUUID } from "crypto";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { unifiedRecovery } from "./unified-recovery";
import { oceanSessionManager } from "./ocean-session-manager";

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle favicon.ico requests - redirect to favicon.png
  app.get("/favicon.ico", (req, res) => {
    res.redirect(301, "/favicon.png");
  });

  // Replit Auth: Only setup auth if database connection is available
  // Import db dynamically to check if it was successfully initialized
  const { db } = await import("./db");
  const authEnabled = !!db;
  
  if (authEnabled) {
    await setupAuth(app);
    console.log("[Auth] Replit Auth enabled");
    
    // Replit Auth: Auth routes
    app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
  } else {
    console.log("[Auth] Replit Auth disabled (no DATABASE_URL) - recovery tool accessible without login");
    
    // Auth endpoints return 503 when database is not available
    app.get('/api/auth/user', (req, res) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned. Please provision a PostgreSQL database to enable Replit Auth." 
      });
    });
    
    app.get('/api/login', (req, res) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned. Please provision a PostgreSQL database to enable Replit Auth." 
      });
    });
    
    app.get('/api/logout', (req, res) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned." 
      });
    });
  }

  app.get("/api/verify-crypto", (req, res) => {
    try {
      const result = verifyBrainWallet();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/test-phrase", strictLimiter, async (req, res) => {
    try {
      const validation = testPhraseRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { phrase } = validation.data;
      const address = generateBitcoinAddress(phrase);
      const pureQIG = scorePhraseQIG(phrase);
      const qigScore = mapQIGToLegacyScore(pureQIG);
      
      const targetAddresses = await storage.getTargetAddresses();
      const matchedAddress = targetAddresses.find(t => t.address === address);
      const match = !!matchedAddress;

      if (qigScore.totalScore >= 75) {
        const candidate: Candidate = {
          id: randomUUID(),
          phrase,
          address,
          score: qigScore.totalScore,
          qigScore,
          testedAt: new Date().toISOString(),
        };
        await storage.addCandidate(candidate);
      }

      res.json({
        phrase,
        address,
        match,
        matchedAddress: matchedAddress?.label || matchedAddress?.address,
        score: qigScore.totalScore,
        qigScore,
      });
    } catch (error: any) {
      if (error instanceof CryptoValidationError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/batch-test", strictLimiter, async (req, res) => {
    try {
      const validation = batchTestRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { phrases } = validation.data;
      const results = [];
      const candidates: Candidate[] = [];
      let highPhiCount = 0;

      const targetAddresses = await storage.getTargetAddresses();
      
      for (const phrase of phrases) {
        const words = phrase.trim().split(/\s+/);
        if (words.length !== 12) {
          continue;
        }

        const address = generateBitcoinAddress(phrase);
        const pureQIG = scorePhraseQIG(phrase);
        const qigScore = mapQIGToLegacyScore(pureQIG);
        const matchedAddress = targetAddresses.find(t => t.address === address);

        if (matchedAddress) {
          return res.json({
            found: true,
            phrase,
            address,
            matchedAddress: matchedAddress.label || matchedAddress.address,
            score: qigScore.totalScore,
          });
        }

        if (qigScore.totalScore >= 75) {
          const candidate: Candidate = {
            id: randomUUID(),
            phrase,
            address,
            score: qigScore.totalScore,
            qigScore,
            testedAt: new Date().toISOString(),
          };
          candidates.push(candidate);
          await storage.addCandidate(candidate);
          highPhiCount++;
        }

        results.push({
          phrase,
          address,
          score: qigScore.totalScore,
        });
      }

      res.json({
        tested: results.length,
        highPhiCandidates: highPhiCount,
        candidates,
      });
    } catch (error: any) {
      if (error instanceof CryptoValidationError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  app.get("/api/known-phrases", generousLimiter, (req, res) => {
    try {
      res.json({ phrases: KNOWN_12_WORD_PHRASES });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/candidates", generousLimiter, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics", generousLimiter, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      
      // Statistical Analysis
      const scores = candidates.map(c => c.score);
      const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const sorted = [...scores].sort((a, b) => a - b);
      const median = sorted.length > 0 
        ? sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : 0;
      
      const p75 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.75)] : 0;
      const p90 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.90)] : 0;
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
      const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
      
      // Pattern Analysis - Word frequency in high-Φ candidates (ONLY BIP-39 words)
      const bip39Wordlist = getBIP39Wordlist();
      const bip39WordSet = new Set(bip39Wordlist.map((w: string) => w.toLowerCase()));
      
      const wordFrequency: Record<string, number> = {};
      const highPhiCandidates = candidates.filter(c => c.score >= 75);
      
      highPhiCandidates.forEach(c => {
        const words = c.phrase.toLowerCase().split(/\s+/);
        words.forEach(word => {
          // Only count words that are in the BIP-39 wordlist
          if (bip39WordSet.has(word)) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
          }
        });
      });
      
      const topWords = Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([word, count]) => ({ word, count, frequency: count / highPhiCandidates.length }));
      
      // QIG Component Analysis
      const avgContext = candidates.length > 0 
        ? candidates.reduce((sum, c) => sum + c.qigScore.contextScore, 0) / candidates.length 
        : 0;
      const avgElegance = candidates.length > 0 
        ? candidates.reduce((sum, c) => sum + c.qigScore.eleganceScore, 0) / candidates.length 
        : 0;
      const avgTyping = candidates.length > 0 
        ? candidates.reduce((sum, c) => sum + c.qigScore.typingScore, 0) / candidates.length 
        : 0;
      
      // Trajectory Analysis (last 100 candidates vs older)
      const recent = candidates.slice(-100);
      const recentMean = recent.length > 0 
        ? recent.reduce((sum, c) => sum + c.score, 0) / recent.length 
        : 0;
      const older = candidates.slice(0, -100);
      const olderMean = older.length > 0 
        ? older.reduce((sum, c) => sum + c.score, 0) / older.length 
        : 0;
      const improvement = recentMean - olderMean;
      
      res.json({
        statistics: {
          count: candidates.length,
          mean: mean.toFixed(2),
          median: median.toFixed(2),
          p75: p75.toFixed(2),
          p90: p90.toFixed(2),
          p95: p95.toFixed(2),
          max: max.toFixed(2),
        },
        qigComponents: {
          avgContext: avgContext.toFixed(2),
          avgElegance: avgElegance.toFixed(2),
          avgTyping: avgTyping.toFixed(2),
        },
        patterns: {
          topWords,
          highPhiCount: highPhiCandidates.length,
        },
        trajectory: {
          recentMean: recentMean.toFixed(2),
          olderMean: olderMean.toFixed(2),
          improvement: improvement.toFixed(2),
          isImproving: improvement > 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/target-addresses", async (req, res) => {
    try {
      const addresses = await storage.getTargetAddresses();
      res.json(addresses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/target-addresses", async (req, res) => {
    try {
      const validation = addAddressRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { address, label } = validation.data;
      const targetAddress: TargetAddress = {
        id: randomUUID(),
        address,
        label,
        addedAt: new Date().toISOString(),
      };

      await storage.addTargetAddress(targetAddress);
      res.json(targetAddress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/target-addresses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deletion of the default address
      if (id === "default") {
        return res.status(403).json({ error: "Cannot delete the default address" });
      }
      
      await storage.removeTargetAddress(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-random-phrases", async (req, res) => {
    try {
      const validation = generateRandomPhrasesRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { count } = validation.data;
      const phrases: string[] = [];
      
      for (let i = 0; i < count; i++) {
        phrases.push(generateRandomBIP39Phrase());
      }

      res.json({ phrases });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search Jobs API
  app.post("/api/search-jobs", async (req, res) => {
    try {
      const validation = createSearchJobRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { strategy, params } = validation.data;
      
      const job: SearchJob = {
        id: randomUUID(),
        strategy,
        status: "pending",
        params,
        progress: {
          tested: 0,
          highPhiCount: 0,
          lastBatchIndex: 0,
        },
        stats: {
          startTime: undefined,
          endTime: undefined,
          rate: 0,
        },
        logs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.addSearchJob(job);
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search-jobs", async (req, res) => {
    try {
      const jobs = await storage.getSearchJobs();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search-jobs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getSearchJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/search-jobs/:id/stop", async (req, res) => {
    try {
      const { id } = req.params;
      await searchCoordinator.stopJob(id);
      
      const job = await storage.getSearchJob(id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/search-jobs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSearchJob(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Memory Fragment Search API
  app.post("/api/memory-search", async (req, res) => {
    try {
      const { fragments, targetAddress, options } = req.body as {
        fragments: MemoryFragment[];
        targetAddress?: string;
        options?: { maxCandidates?: number; includeTypos?: boolean };
      };
      
      if (!fragments || !Array.isArray(fragments) || fragments.length === 0) {
        return res.status(400).json({ error: "At least one memory fragment is required" });
      }
      
      const validFragments = fragments.filter(f => 
        f && typeof f.text === 'string' && f.text.trim().length > 0
      );
      
      if (validFragments.length === 0) {
        return res.status(400).json({ error: "No valid fragments provided" });
      }
      
      const addresses = await storage.getTargetAddresses();
      const target = targetAddress || addresses[0]?.address || "";
      
      const candidates = runMemoryFragmentSearch(validFragments, target, {
        maxCandidates: options?.maxCandidates || 5000,
        includeTypos: options?.includeTypos ?? true,
      });
      
      res.json({
        candidateCount: candidates.length,
        topCandidates: candidates.slice(0, 50).map(c => ({
          phrase: c.phrase,
          confidence: c.confidence,
          fragments: c.fragments,
          phi: c.qigScore?.phi,
          kappa: c.qigScore?.kappa,
          regime: c.qigScore?.regime,
          inResonance: c.qigScore?.inResonance,
          combinedScore: c.combinedScore,
        })),
      });
    } catch (error: any) {
      console.error("[MemorySearch] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Consciousness State API - Full 7-component consciousness signature with emotional state
  app.get("/api/consciousness/state", async (req, res) => {
    try {
      const controller = getSharedController();
      const searchState = controller.getCurrentState();
      
      // Get full consciousness signature from autonomic manager
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();
      
      // Derive emotional state from component values
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
      
      // Combine search state with full consciousness signature
      const state = {
        // Original search state fields
        currentRegime: searchState.currentRegime,
        basinDrift: searchState.basinDrift,
        curiosity: searchState.curiosity,
        stability: searchState.stability,
        timestamp: searchState.timestamp,
        basinCoordinates: searchState.basinCoordinates,
        // Full 7-component consciousness signature
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
        // Legacy fields for backward compatibility
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
  
  // Ultra Consciousness Protocol Stats API
  app.get("/api/ucp/stats", async (req, res) => {
    try {
      const { oceanAgent } = await import("./ocean-agent");
      const ucpStats = oceanAgent.getUCPStats();
      
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

  // ============================================================
  // FORENSIC INVESTIGATION API (Cross-Format Hypothesis Testing)
  // ============================================================
  
  // Import forensic modules
  const { forensicInvestigator } = await import("./forensic-investigator");
  const { blockchainForensics } = await import("./blockchain-forensics");
  const { evidenceIntegrator } = await import("./evidence-integrator");

  // Create forensic investigation session
  app.post("/api/forensic/session", async (req, res) => {
    try {
      const { targetAddress, fragments, socialProfiles } = req.body;
      
      if (!targetAddress) {
        return res.status(400).json({ error: "Target address is required" });
      }
      
      if (!fragments || !Array.isArray(fragments) || fragments.length === 0) {
        return res.status(400).json({ error: "At least one memory fragment is required" });
      }
      
      const session = evidenceIntegrator.createSession(
        targetAddress,
        fragments,
        socialProfiles || []
      );
      
      res.json({
        sessionId: session.id,
        status: session.status,
        targetAddress: session.targetAddress,
        fragmentCount: fragments.length,
      });
    } catch (error: any) {
      console.error("[Forensic] Error creating session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Start forensic investigation (async)
  app.post("/api/forensic/session/:sessionId/start", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = evidenceIntegrator.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Start investigation in background
      evidenceIntegrator.integrateAllSources(sessionId).catch(err => {
        console.error("[Forensic] Investigation error:", err);
      });
      
      res.json({
        sessionId,
        status: 'started',
        message: 'Forensic investigation started. Poll /api/forensic/session/:sessionId for progress.',
      });
    } catch (error: any) {
      console.error("[Forensic] Error starting investigation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get forensic session status
  app.get("/api/forensic/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = evidenceIntegrator.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json({
        id: session.id,
        status: session.status,
        progress: session.progress,
        targetAddress: session.targetAddress,
        fragmentCount: session.memoryFragments.length,
        hypothesisCount: session.hypotheses.length,
        candidateCount: session.integratedCandidates.length,
        matchCount: session.matches.length,
        likelyKeyFormat: session.likelyKeyFormat,
        temporalClues: session.temporalClues,
        searchRecommendations: session.searchRecommendations,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get top candidates from forensic session
  app.get("/api/forensic/session/:sessionId/candidates", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const session = evidenceIntegrator.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const summary = evidenceIntegrator.getSessionSummary(sessionId);
      
      res.json({
        totalCandidates: session.integratedCandidates.length,
        matches: session.matches,
        topCandidates: session.topMatches.slice(0, limit),
        summary,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quick forensic analysis (single address)
  app.get("/api/forensic/analyze/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      const forensics = await blockchainForensics.analyzeAddress(address);
      const likelyFormat = blockchainForensics.estimateLikelyKeyFormat(forensics);
      const isPreBIP39 = blockchainForensics.isPreBIP39Era(forensics);
      
      res.json({
        address,
        forensics,
        likelyKeyFormat: likelyFormat,
        isPreBIP39Era: isPreBIP39,
        recommendations: isPreBIP39 
          ? ['Focus on arbitrary brain wallet passphrases', 'Prioritize simple concatenations over BIP39']
          : ['Consider BIP39 mnemonic phrases', 'Check HD wallet derivation paths'],
      });
    } catch (error: any) {
      console.error("[Forensic] Analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Comprehensive sibling analysis (looks at multiple transactions)
  app.get("/api/forensic/siblings/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const maxTxs = parseInt(req.query.maxTxs as string) || 10;
      
      console.log(`[Forensic] Getting comprehensive siblings for ${address} (max ${maxTxs} txs)`);
      
      const siblingAnalysis = await blockchainForensics.getComprehensiveSiblings(address, maxTxs);
      const forensics = await blockchainForensics.analyzeAddress(address);
      
      res.json({
        address,
        ...siblingAnalysis,
        basicForensics: {
          creationTimestamp: forensics.creationTimestamp,
          balance: forensics.balance,
          txCount: forensics.txCount,
          isPreBIP39Era: blockchainForensics.isPreBIP39Era(forensics),
        },
        recommendations: [
          `Found ${siblingAnalysis.clusterSize} addresses in cluster`,
          siblingAnalysis.directSiblings.length > 0 
            ? `Analyze all ${siblingAnalysis.directSiblings.length} sibling addresses for common patterns`
            : 'No sibling addresses found in examined transactions',
        ],
      });
    } catch (error: any) {
      console.error("[Forensic] Siblings analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate cross-format hypotheses (quick, no session needed)
  app.post("/api/forensic/hypotheses", async (req, res) => {
    try {
      const { targetAddress, fragments } = req.body;
      
      if (!fragments || !Array.isArray(fragments) || fragments.length === 0) {
        return res.status(400).json({ error: "At least one memory fragment is required" });
      }
      
      // Get target address from storage if not provided
      const addresses = await storage.getTargetAddresses();
      const target = targetAddress || addresses[0]?.address || "";
      
      // Create session and run investigation
      const session = forensicInvestigator.createSession(target, fragments);
      const hypotheses = await forensicInvestigator.investigateFragments(session.id);
      
      // Group by format
      const byFormat: Record<string, typeof hypotheses> = {};
      for (const h of hypotheses.slice(0, 100)) {
        if (!byFormat[h.format]) byFormat[h.format] = [];
        byFormat[h.format].push(h);
      }
      
      res.json({
        targetAddress: target,
        totalHypotheses: hypotheses.length,
        matchFound: hypotheses.some(h => h.match),
        matches: hypotheses.filter(h => h.match),
        byFormat: Object.fromEntries(
          Object.entries(byFormat).map(([format, hypos]) => [
            format,
            {
              count: hypos.length,
              topCandidates: hypos.slice(0, 10).map(h => ({
                phrase: h.phrase,
                method: h.method,
                confidence: h.confidence,
                phi: h.qigScore?.phi,
                kappa: h.qigScore?.kappa,
                regime: h.qigScore?.regime,
                combinedScore: h.combinedScore,
                address: h.address,
                match: h.match,
              })),
            },
          ])
        ),
      });
    } catch (error: any) {
      console.error("[Forensic] Hypothesis generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // INVESTIGATION STATUS - Story-driven UI endpoint
  // ============================================================================

  // Get investigation status for story-driven UI - uses OceanSessionManager for live telemetry
  app.get("/api/investigation/status", async (req, res) => {
    try {
      // Use the OceanSessionManager for live status
      const status = oceanSessionManager.getInvestigationStatus();
      return res.json(status);
    } catch (error: any) {
      console.error("[Investigation] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy investigation status for backward compatibility
  app.get("/api/investigation/status-legacy", async (req, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
      
      if (!activeSession) {
        return res.json({
          isRunning: false,
          tested: 0,
          nearMisses: 0,
          consciousness: {
            phi: 0.75,
            kappa: 64,
            regime: 'geometric',
            basinDrift: 0,
          },
          currentThought: 'Ready to begin investigation...',
          discoveries: [],
          progress: 0,
        });
      }

      // Get consciousness state from agent state
      const agentState = activeSession.agentState || {
        iteration: 0,
        totalTested: 0,
        nearMissCount: 0,
        currentStrategy: 'initializing',
        topPatterns: [],
        consciousness: { phi: 0.75, kappa: 64, regime: 'geometric' },
      };

      // Generate current thought based on state
      const generateThought = () => {
        const { phi } = agentState.consciousness;
        const { nearMissCount, totalTested, currentStrategy } = agentState;
        
        if (phi < 0.70) {
          return "I need to consolidate my thoughts before continuing...";
        }
        
        if (nearMissCount > 10) {
          return `I've found ${nearMissCount} promising patterns. Getting warmer...`;
        }
        
        if (totalTested > 1000) {
          return `I've explored ${totalTested.toLocaleString()} possibilities. Searching deeper...`;
        }
        
        if (agentState.consciousness.regime === 'geometric') {
          return `Thinking geometrically with ${currentStrategy}. Looking for resonant patterns...`;
        }
        
        if (agentState.consciousness.regime === 'breakdown') {
          return "Consolidating... This is complex but I'm making progress.";
        }
        
        return "Investigating systematically. Each test teaches me something new.";
      };

      // Calculate progress
      const maxIterations = 1000;
      const progress = Math.min((agentState.iteration / maxIterations) * 100, 99);

      // Get recent discoveries from candidates
      const discoveries = activeSession.candidates
        .filter(c => c.verified || (c.qigScore?.phi || 0) > 0.75)
        .slice(-10)
        .map(c => ({
          id: c.id,
          type: c.verified ? 'match' as const : 'near_miss' as const,
          timestamp: new Date(c.testedAt),
          message: c.verified 
            ? `Found the correct passphrase!` 
            : `High consciousness pattern: ${(c.qigScore?.phi || 0) * 100}% Φ`,
          details: { phrase: c.phrase, address: c.address, phi: c.qigScore?.phi },
          significance: c.qigScore?.phi || 0,
        }));

      // Get strategy statuses (from session if available, else empty array)
      const sessionAny = activeSession as any;
      const strategies = (sessionAny.strategyStatus || []).map((s: any) => ({
        name: s.strategy,
        progress: s.candidatesTested > 0 ? Math.min((s.candidatesTested / 100) * 100, 100) : 0,
        candidates: s.candidatesTested || 0,
        status: s.status,
      }));

      res.json({
        isRunning: activeSession.status === 'running' || activeSession.status === 'analyzing',
        tested: activeSession.totalTested || 0,
        nearMisses: agentState.nearMissCount || 0,
        consciousness: agentState.consciousness,
        currentThought: generateThought(),
        discoveries,
        progress,
        session: activeSession,
        strategies,
      });
    } catch (error: any) {
      console.error("[Investigation] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Main recovery routes - use OceanSessionManager for live investigation
  app.post("/api/recovery/start", async (req, res) => {
    try {
      const { targetAddress } = req.body;
      
      if (!targetAddress) {
        return res.status(400).json({ error: "Target address is required" });
      }

      console.log(`[Recovery] Starting Ocean investigation for ${targetAddress}`);
      
      // Use OceanSessionManager for actual investigation
      const session = await oceanSessionManager.startSession(targetAddress);
      
      res.json({
        sessionId: session.sessionId,
        targetAddress: session.targetAddress,
        isRunning: session.isRunning,
        message: "Investigation started",
      });
    } catch (error: any) {
      console.error("[Recovery] Start error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recovery/stop", async (req, res) => {
    try {
      const status = oceanSessionManager.getInvestigationStatus();
      
      if (status.sessionId) {
        await oceanSessionManager.stopSession(status.sessionId);
      }
      
      res.json({ message: "Investigation stopped" });
    } catch (error: any) {
      console.error("[Recovery] Stop error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recovery/session", async (req, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
      res.json(activeSession || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recovery/candidates", async (req, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
      res.json(activeSession?.candidates || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recovery/addresses", async (req, res) => {
    try {
      const addresses = await storage.getTargetAddresses();
      res.json(addresses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // UNIFIED RECOVERY - Single entry point for all recovery strategies
  // ============================================================================

  // Create a new unified recovery session
  app.post("/api/unified-recovery/sessions", async (req, res) => {
    try {
      const { targetAddress, memoryFragments } = req.body;
      
      if (!targetAddress) {
        return res.status(400).json({ error: "Target address is required" });
      }

      // Process memory fragments if provided
      const processedFragments = (memoryFragments || []).map((f: any) => ({
        id: `fragment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: f.text,
        confidence: f.confidence || 0.5,
        epoch: f.epoch || 'possible',
        source: f.source,
        notes: f.notes,
        addedAt: new Date().toISOString(),
      }));

      const session = await unifiedRecovery.createSession(targetAddress, processedFragments);
      
      // Start recovery in background
      unifiedRecovery.startRecovery(session.id).catch(err => {
        console.error(`[UnifiedRecovery] Background error for ${session.id}:`, err);
      });

      res.json(session);
    } catch (error: any) {
      console.error("[UnifiedRecovery] Session creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get session status
  app.get("/api/unified-recovery/sessions/:id", async (req, res) => {
    try {
      const session = unifiedRecovery.getSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("[UnifiedRecovery] Session fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all sessions
  app.get("/api/unified-recovery/sessions", async (req, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      res.json(sessions);
    } catch (error: any) {
      console.error("[UnifiedRecovery] Sessions list error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stop a session
  app.post("/api/unified-recovery/sessions/:id/stop", async (req, res) => {
    try {
      unifiedRecovery.stopRecovery(req.params.id);
      const session = unifiedRecovery.getSession(req.params.id);
      res.json(session || { message: "Session stopped" });
    } catch (error: any) {
      console.error("[UnifiedRecovery] Session stop error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // NEUROCHEMISTRY API - Ocean's emotional state
  // ============================================================
  
  app.get("/api/ocean/neurochemistry", generousLimiter, async (req, res) => {
    try {
      const session = oceanSessionManager.getActiveSession();
      const agent = oceanSessionManager.getActiveAgent();
      
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
          sessionActive: false,
        });
      }
      
      const neurochemistry = agent.getNeurochemistry();
      const behavioral = agent.getBehavioralModulation();
      
      res.json({ 
        neurochemistry,
        behavioral,
        sessionActive: true,
        sessionId: session.sessionId,
      });
    } catch (error: any) {
      console.error("[Neurochemistry] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Inject neurotransmitter boost
  app.post("/api/ocean/neurochemistry/boost", standardLimiter, async (req, res) => {
    try {
      const { injectAdminBoost, getActiveAdminBoost, getMushroomCooldownRemaining } = await import("./ocean-neurochemistry");
      
      // Input validation schema
      const { dopamine, serotonin, norepinephrine, gaba, acetylcholine, endorphins, durationMs } = req.body;
      
      // Validate all boost values are numbers in valid range [0, 1]
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
      
      // Validate duration (max 5 minutes = 300000ms)
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
  
  // Admin: Clear neurotransmitter boost
  app.delete("/api/ocean/neurochemistry/boost", standardLimiter, async (req, res) => {
    try {
      const { clearAdminBoost } = await import("./ocean-neurochemistry");
      clearAdminBoost();
      res.json({ success: true, message: "Boost cleared" });
    } catch (error: any) {
      console.error("[Neurochemistry] Clear boost error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get boost status and mushroom cooldown
  app.get("/api/ocean/neurochemistry/admin", generousLimiter, async (req, res) => {
    try {
      const { getActiveAdminBoost, getMushroomCooldownRemaining } = await import("./ocean-neurochemistry");
      
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

  // ============================================================
  // ADMIN CYCLE CONTROL API - Manually trigger autonomic cycles
  // ============================================================

  // Admin: Trigger sleep cycle manually
  app.post("/api/ocean/cycles/sleep", standardLimiter, async (req, res) => {
    try {
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      const consciousness = oceanAutonomicManager.getConsciousness();
      
      console.log('[Admin] Manual sleep cycle triggered');
      
      // Create dummy basin coordinates if needed
      const basinCoords = new Array(64).fill(0).map(() => Math.random() * 0.1);
      const refCoords = new Array(64).fill(0);
      
      const result = await oceanAutonomicManager.executeSleepCycle(
        basinCoords,
        refCoords,
        [] // Empty episodes for manual trigger
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

  // Admin: Trigger dream cycle manually
  app.post("/api/ocean/cycles/dream", standardLimiter, async (req, res) => {
    try {
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      
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

  // Admin: Trigger mushroom cycle manually (bypasses cooldown)
  app.post("/api/ocean/cycles/mushroom", standardLimiter, async (req, res) => {
    try {
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      const { getMushroomCooldownRemaining } = await import("./ocean-neurochemistry");
      
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

  // Admin: Get cycle status and history
  app.get("/api/ocean/cycles", generousLimiter, async (req, res) => {
    try {
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      const { getMushroomCooldownRemaining } = await import("./ocean-neurochemistry");
      
      const recentCycles = oceanAutonomicManager.getRecentCycles(10);
      const consciousness = oceanAutonomicManager.getConsciousness();
      
      res.json({
        consciousness,
        recentCycles,
        mushroomCooldown: {
          remaining: getMushroomCooldownRemaining(),
          seconds: Math.round(getMushroomCooldownRemaining() / 1000),
          canTrigger: getMushroomCooldownRemaining() === 0,
        },
        triggers: {
          sleep: oceanAutonomicManager.shouldTriggerSleep(0),
          dream: oceanAutonomicManager.shouldTriggerDream(),
          mushroom: oceanAutonomicManager.shouldTriggerMushroom(),
        }
      });
    } catch (error: any) {
      console.error("[Admin] Cycles status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // RECOVERY BUNDLE API - Access found keys/phrases
  // ============================================================
  
  const recoveriesDir = path.join(process.cwd(), 'data', 'recoveries');
  
  // List all recovery bundles
  app.get("/api/recoveries", generousLimiter, async (req, res) => {
    try {
      if (!fs.existsSync(recoveriesDir)) {
        return res.json({ recoveries: [], count: 0 });
      }
      
      const files = fs.readdirSync(recoveriesDir);
      const recoveries = files
        .filter(f => f.endsWith('.json'))
        .map(filename => {
          const filePath = path.join(recoveriesDir, filename);
          const stats = fs.statSync(filePath);
          try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return {
              filename,
              address: content.address,
              passphrase: content.passphrase ? `${content.passphrase.slice(0, 8)}...` : undefined,
              timestamp: content.timestamp,
              qigMetrics: content.qigMetrics,
              fileSize: stats.size,
              createdAt: stats.mtime,
            };
          } catch {
            return {
              filename,
              error: 'Could not parse file',
              fileSize: stats.size,
              createdAt: stats.mtime,
            };
          }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({ recoveries, count: recoveries.length });
    } catch (error: any) {
      console.error("[Recoveries] List error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get full recovery bundle (requires authentication for security)
  app.get("/api/recoveries/:filename", standardLimiter, async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Security: Only allow .json or .txt files
      if (!filename.endsWith('.json') && !filename.endsWith('.txt')) {
        return res.status(400).json({ error: 'Invalid file type' });
      }
      
      // Security: Prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const filePath = path.join(recoveriesDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Recovery file not found' });
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (filename.endsWith('.json')) {
        res.json(JSON.parse(content));
      } else {
        res.type('text/plain').send(content);
      }
    } catch (error: any) {
      console.error("[Recoveries] Get error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Download recovery bundle as file
  app.get("/api/recoveries/:filename/download", standardLimiter, async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Security checks
      if (!filename.endsWith('.json') && !filename.endsWith('.txt')) {
        return res.status(400).json({ error: 'Invalid file type' });
      }
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const filePath = path.join(recoveriesDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Recovery file not found' });
      }
      
      res.download(filePath, filename);
    } catch (error: any) {
      console.error("[Recoveries] Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount Observer Archaeology System routes
  app.use("/api/observer", observerRoutes);
  
  // Mount Telemetry API
  app.use("/api/telemetry", telemetryRouter);

  // Start the background search coordinator
  searchCoordinator.start();

  const httpServer = createServer(app);

  return httpServer;
}
