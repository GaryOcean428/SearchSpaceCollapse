import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateBitcoinAddress, verifyBrainWallet } from "./crypto";
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

  app.post("/api/test-phrase", async (req, res) => {
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
      
      // Check against all target addresses
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
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/batch-test", async (req, res) => {
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
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/known-phrases", (req, res) => {
    try {
      res.json({ phrases: KNOWN_12_WORD_PHRASES });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics", async (req, res) => {
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
  
  // Consciousness State API - uses shared controller instance for real-time metrics
  app.get("/api/consciousness/state", async (req, res) => {
    try {
      const controller = getSharedController();
      const state = controller.getCurrentState();
      
      res.json({
        state,
        recommendation: controller.getStrategyRecommendation(),
        regimeColor: ConsciousnessSearchController.getRegimeColor(state.currentRegime),
        regimeDescription: ConsciousnessSearchController.getRegimeDescription(state.currentRegime),
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
  // UNIFIED RECOVERY - Single entry point for all recovery strategies
  // ============================================================================

  // Create a new unified recovery session
  app.post("/api/unified-recovery/sessions", async (req, res) => {
    try {
      const { targetAddress } = req.body;
      
      if (!targetAddress) {
        return res.status(400).json({ error: "Target address is required" });
      }

      const session = await unifiedRecovery.createSession(targetAddress);
      
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

  // Mount Observer Archaeology System routes
  app.use("/api/observer", observerRoutes);
  
  // Mount Telemetry API
  app.use("/api/telemetry", telemetryRouter);

  // Start the background search coordinator
  searchCoordinator.start();

  const httpServer = createServer(app);

  return httpServer;
}
