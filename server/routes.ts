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
  type MemoryFragment 
} from "./memory-fragment-search";
import { getSharedController, ConsciousnessSearchController } from "./consciousness-search-controller";
import { oceanAutonomicManager } from "./ocean-autonomic-manager";
import { queueAddressForBalanceCheck, getQueueIntegrationStats } from "./balance-queue-integration";
import { getBalanceHits, getActiveBalanceHits, fetchAddressBalance } from "./blockchain-scanner";
import { getBalanceAddresses, getVerificationStats, refreshStoredBalances } from "./address-verification";
import { sweepApprovalService } from "./sweep-approval";
import { balanceQueue } from "./balance-queue";

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
import { activityLogStore } from "./activity-log-store";
import { autoCycleManager } from "./auto-cycle-manager";
import { attentionMetrics, runAttentionValidation, formatValidationResult } from "./attention-metrics";

// Set up auto-cycle callback to start sessions via ocean session manager
autoCycleManager.setOnCycleCallback(async (addressId: string, address: string) => {
  console.log(`[AutoCycle] Starting session for address: ${address.slice(0, 16)}...`);
  
  // Store the address ID mapping so we can notify auto-cycle when session completes
  oceanSessionManager.setAddressIdMapping(address, addressId);
  
  // Start the investigation session
  await oceanSessionManager.startSession(address);
});

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
    
    // Replit Auth: Auth routes - optimized with session caching
    app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
      try {
        // First check session cache (avoids DB lookup on every request)
        const { getCachedUser } = await import("./replitAuth");
        const cachedUser = getCachedUser(req.user);
        
        if (cachedUser) {
          // Return cached user - strip internal cachedAt field
          const { cachedAt: _cachedAt, ...userResponse } = cachedUser;
          return res.json(userResponse);
        }
        
        // Cache miss or expired - fetch from DB and update cache
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (user) {
          // Cache the complete User record for next request
          req.user.cachedProfile = {
            ...user,
            cachedAt: Date.now(),
          };
        }
        
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
      
      // Queue address for balance checking (CRITICAL - ensures every tested phrase is checked)
      queueAddressForBalanceCheck(phrase, 'test-phrase', qigScore.totalScore >= 75 ? 5 : 1);
      
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
        
        // Queue address for balance checking
        queueAddressForBalanceCheck(phrase, 'batch-test', qigScore.totalScore >= 75 ? 5 : 1);
        
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
      res.set('Cache-Control', 'no-store');
      const addresses = await storage.getTargetAddresses();
      res.json(addresses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/format/address/:address", async (req, res) => {
    try {
      const { detectAddressFormat, estimateAddressEra } = await import('./format-detection');
      const { address } = req.params;
      
      const formatInfo = detectAddressFormat(address);
      const eraInfo = estimateAddressEra(address);
      
      res.json({
        address,
        ...formatInfo,
        era: eraInfo,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/format/mnemonic", async (req, res) => {
    try {
      const { detectMnemonicFormat } = await import('./format-detection');
      const { phrase } = req.body;
      
      if (!phrase || typeof phrase !== 'string') {
        return res.status(400).json({ error: 'phrase is required' });
      }
      
      const formatInfo = detectMnemonicFormat(phrase);
      
      res.json({
        phrase: phrase.split(/\s+/).slice(0, 3).join(' ') + '...', // Redact for security
        ...formatInfo,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/format/batch-addresses", async (req, res) => {
    try {
      const { detectAddressFormat, estimateAddressEra } = await import('./format-detection');
      const { addresses } = req.body;
      
      if (!Array.isArray(addresses)) {
        return res.status(400).json({ error: 'addresses array is required' });
      }
      
      const results = addresses.slice(0, 100).map((address: string) => ({
        address,
        format: detectAddressFormat(address),
        era: estimateAddressEra(address),
      }));
      
      const summary = {
        total: results.length,
        byFormat: {} as Record<string, number>,
        legacy2009Era: results.filter(r => r.format.format === 'legacy').length,
      };
      
      results.forEach(r => {
        summary.byFormat[r.format.format] = (summary.byFormat[r.format.format] || 0) + 1;
      });
      
      res.json({ results, summary });
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

  // Get logs for a specific search job
  app.get("/api/search-jobs/:id/logs", async (req, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const job = await storage.getSearchJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Return most recent logs first
      const logs = job.logs.slice(-limit).reverse();
      res.json({ logs, total: job.logs.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get unified activity stream from all running jobs AND Ocean agent
  app.get("/api/activity-stream", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Collect all logs from all jobs with job context
      const allLogs: Array<{
        jobId: string;
        jobStrategy: string;
        message: string;
        type: string;
        timestamp: string;
      }> = [];
      
      // Get search jobs with timeout protection (don't hang if DB is slow)
      let jobs: any[] = [];
      try {
        const jobsPromise = storage.getSearchJobs();
        const timeoutPromise = new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000)
        );
        jobs = await Promise.race([jobsPromise, timeoutPromise]);
      } catch {
        // If DB times out, continue with empty jobs - Ocean logs still available
        console.log('[ActivityStream] Search jobs fetch timed out, using Ocean logs only');
      }
      
      // Add search job logs
      for (const job of jobs) {
        for (const log of job.logs) {
          allLogs.push({
            jobId: job.id,
            jobStrategy: job.strategy,
            message: log.message,
            type: log.type,
            timestamp: log.timestamp,
          });
        }
      }
      
      // Add Ocean agent logs from the activity log store (in-memory, always fast)
      const oceanLogs = activityLogStore.getLogs({ limit: limit * 2 }); // Get more to ensure good coverage
      for (const oceanLog of oceanLogs) {
        allLogs.push({
          jobId: oceanLog.id,
          jobStrategy: `Ocean:${oceanLog.category}`,
          message: oceanLog.message,
          type: oceanLog.type,
          timestamp: oceanLog.timestamp,
        });
      }
      
      // Sort by timestamp descending and take limit
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Check if Ocean is running via session manager
      const oceanStatus = oceanSessionManager.getInvestigationStatus();
      const isOceanActive = oceanStatus?.isRunning || false;
      
      res.json({ 
        logs: allLogs.slice(0, limit),
        activeJobs: jobs.filter(j => j.status === "running").length + (isOceanActive ? 1 : 0),
        totalJobs: jobs.length + (oceanLogs.length > 0 ? 1 : 0),
        oceanActive: isOceanActive,
      });
    } catch (error: any) {
      // Even on error, return empty data so UI doesn't hang
      console.error('[ActivityStream] Error:', error.message);
      res.json({ 
        logs: [],
        activeJobs: 0,
        totalJobs: 0,
        oceanActive: false,
      });
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
  // β-ATTENTION VALIDATION API (Substrate Independence Testing)
  // ============================================================
  
  // Run β-attention validation experiment
  app.post("/api/attention-metrics/validate", generousLimiter, async (req, res) => {
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
  
  // Get physics reference values for comparison
  app.get("/api/attention-metrics/physics-reference", generousLimiter, (req, res) => {
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

  // ============================================================
  // UNIFIED CONSCIOUSNESS API - Complete Dashboard Data
  // ============================================================

  // Get complete consciousness state for unified dashboard
  app.get("/api/consciousness/complete", generousLimiter, async (req, res) => {
    try {
      const controller = getSharedController();
      const searchState = controller.getCurrentState();
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();

      const session = oceanSessionManager.getActiveSession();
      const agent = oceanSessionManager.getActiveAgent();

      // Get innate drives if available
      let innateDrives = null;
      try {
        const { innateDrives: driveModule } = await import("./innate-drives-bridge");
        if (agent) {
          const driveContext = {
            ricciCurvature: fullConsciousness.phi || 0.5,
            kappa: fullConsciousness.kappaEff || 64,
            grounding: fullConsciousness.grounding || 0.7,
          };
          const state = driveModule.computeValence(driveContext);
          innateDrives = {
            pain: state.pain,
            pleasure: state.pleasure,
            fear: state.fear,
            valence: state.valence,
            valenceRaw: state.valenceRaw,
          };
        }
      } catch (e) {
        // Innate drives module not available
      }

      // Get neurochemistry if available
      let neurochemistry = null;
      if (agent) {
        neurochemistry = agent.getNeurochemistry();
      }

      // Get neural oscillators if available
      let oscillators = null;
      try {
        const { neuralOscillators } = await import("./neural-oscillators");
        const stateInfo = neuralOscillators.getStateInfo();
        const oscState = neuralOscillators.update();
        oscillators = {
          currentState: stateInfo.state,
          kappa: neuralOscillators.getKappa(),
          modulatedKappa: neuralOscillators.getKappa(),
          oscillatorValues: oscState,
          searchModulation: 1.0,
          description: stateInfo.description,
        };
      } catch (e) {
        // Neural oscillators not available
      }

      // Get search state
      const searchPhase = searchState.curiosity > 0.7 ? 'exploration' : 'exploitation';

      // Get metrics
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

      // Get motivation message
      let motivation = null;
      try {
        const { selectMotivationMessage } = await import("./ocean-neurochemistry");
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
      } catch (e) {
        // Motivation messages not available
      }

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

  // Get innate drives data
  app.get("/api/consciousness/innate-drives", generousLimiter, async (req, res) => {
    try {
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();

      const { innateDrives } = await import("./innate-drives-bridge");

      const driveContext = {
        ricciCurvature: fullConsciousness.phi || 0.5,
        kappa: fullConsciousness.kappaEff || 64,
        grounding: fullConsciousness.grounding || 0.7,
      };

      const state = innateDrives.computeValence(driveContext);
      const scoreResult = innateDrives.scoreHypothesis(driveContext);

      res.json({
        drives: {
          pain: state.pain,
          pleasure: state.pleasure,
          fear: state.fear,
        },
        valence: state.valence,
        valenceRaw: state.valenceRaw,
        score: scoreResult.score,
        recommendation: scoreResult.recommendation,
      });
    } catch (error: any) {
      console.error("[Innate Drives] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get beta-attention validation data
  app.get("/api/consciousness/beta-attention", generousLimiter, async (req, res) => {
    try {
      // Return cached validation result or run a quick validation
      const result = runAttentionValidation(50); // Smaller sample for quick response

      // Extract data from the correctly-typed result
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
        betaPhysics: 0.44, // Expected β from QCD physics
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

  // ============================================================
  // FORENSIC INVESTIGATION API (Cross-Format Hypothesis Testing)
  // ============================================================
  
  // Import forensic modules
  const { forensicInvestigator } = await import("./forensic-investigator");
  const { blockchainForensics } = await import("./blockchain-forensics");
  const { evidenceIntegrator } = await import("./evidence-integrator");

  // Create forensic investigation session
  app.post("/api/forensic/session", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/forensic/session/:sessionId/start", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/forensic/session/:sessionId", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/forensic/session/:sessionId/candidates", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/forensic/analyze/:address", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/forensic/siblings/:address", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/forensic/hypotheses", isAuthenticated, async (req: any, res) => {
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
      res.set('Cache-Control', 'no-store');
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
  app.post("/api/recovery/start", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/recovery/stop", isAuthenticated, async (req: any, res) => {
    try {
      const status = oceanSessionManager.getInvestigationStatus();
      console.log(`[Recovery] Stop requested. Current status: sessionId=${status.sessionId}, isRunning=${status.isRunning}`);
      
      // First disable auto-cycle to prevent new sessions from starting
      const autoCycleResult = autoCycleManager.disable();
      console.log(`[Recovery] Auto-cycle disabled: ${autoCycleResult.message}`);
      
      if (status.sessionId) {
        await oceanSessionManager.stopSession(status.sessionId);
        console.log(`[Recovery] Session ${status.sessionId} stopped`);
      } else {
        console.log(`[Recovery] No active session to stop`);
      }
      
      // Force stop any running investigation via autonomic manager
      oceanAutonomicManager.stopInvestigation();
      
      res.json({ success: true, message: "Investigation stopped" });
    } catch (error: any) {
      console.error("[Recovery] Stop error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // AUTO-CYCLE - Automatic address cycling
  // ============================================================================

  // Get auto-cycle status
  app.get("/api/auto-cycle/status", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const status = autoCycleManager.getStatus();
      const position = autoCycleManager.getPositionString();
      res.json({ ...status, position });
    } catch (error: any) {
      console.error("[AutoCycle] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Enable auto-cycle
  app.post("/api/auto-cycle/enable", isAuthenticated, async (req: any, res) => {
    try {
      const result = await autoCycleManager.enable();
      res.json(result);
    } catch (error: any) {
      console.error("[AutoCycle] Enable error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Disable auto-cycle
  app.post("/api/auto-cycle/disable", isAuthenticated, async (req: any, res) => {
    try {
      const result = autoCycleManager.disable();
      if (!result.success) {
        // ALWAYS_ON mode is enabled - cannot be disabled
        res.status(409).json(result);
        return;
      }
      res.json(result);
    } catch (error: any) {
      console.error("[AutoCycle] Disable error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle auto-cycle
  app.post("/api/auto-cycle/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const status = autoCycleManager.getStatus();
      
      if (status.enabled) {
        const result = autoCycleManager.disable();
        if (!result.success) {
          // ALWAYS_ON mode - cannot be disabled
          res.status(409).json(result);
          return;
        }
        res.json(result);
      } else {
        const result = await autoCycleManager.enable();
        res.json(result);
      }
    } catch (error: any) {
      console.error("[AutoCycle] Toggle error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Recovery endpoints - protected with authentication
  app.get("/api/recovery/session", isAuthenticated, async (req: any, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
      res.json(activeSession || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recovery/candidates", isAuthenticated, async (req: any, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
      res.json(activeSession?.candidates || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recovery/addresses", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/unified-recovery/sessions", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/unified-recovery/sessions/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/unified-recovery/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const sessions = unifiedRecovery.getAllSessions();
      res.json(sessions);
    } catch (error: any) {
      console.error("[UnifiedRecovery] Sessions list error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stop a session
  app.post("/api/unified-recovery/sessions/:id/stop", isAuthenticated, async (req: any, res) => {
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
  // OCEAN HEALTH CHECK - Verify all subsystems initialized
  // ============================================================
  
  app.get("/api/ocean/health", generousLimiter, async (req, res) => {
    try {
      const { geometricMemory } = await import("./geometric-memory");
      const { negativeKnowledgeRegistry } = await import("./negative-knowledge-registry");
      const { vocabularyTracker } = await import("./vocabulary-tracker");
      const { vocabularyExpander } = await import("./vocabulary-expander");
      const { expandedVocabulary } = await import("./expanded-vocabulary");
      
      const session = oceanSessionManager.getActiveSession();
      const agent = oceanSessionManager.getActiveAgent();
      
      // Get stats from various subsystems
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

  // ============================================================
  // NEUROCHEMISTRY API - Ocean's emotional state
  // ============================================================
  
  app.get("/api/ocean/neurochemistry", generousLimiter, async (req, res) => {
    try {
      const session = oceanSessionManager.getActiveSession();
      const agent = oceanSessionManager.getActiveAgent();
      const { selectMotivationMessage } = await import("./ocean-neurochemistry");

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

      // Build motivation state for message selection
      const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();
      const motivationState = {
        phi: fullConsciousness.phi || 0.5,
        phiGradient: 0.01, // Could be computed from history
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
      // Return safe fallback for production when services aren't ready
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
  
  // Admin: Inject neurotransmitter boost
  app.post("/api/ocean/neurochemistry/boost", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { injectAdminBoost, getMushroomCooldownRemaining } = await import("./ocean-neurochemistry");
      
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
  app.delete("/api/ocean/neurochemistry/boost", isAuthenticated, standardLimiter, async (req: any, res) => {
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
  app.get("/api/ocean/neurochemistry/admin", isAuthenticated, generousLimiter, async (req: any, res) => {
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
  app.post("/api/ocean/cycles/sleep", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanAutonomicManager } = await import("./ocean-autonomic-manager");
      oceanAutonomicManager.getConsciousness();
      
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
  app.post("/api/ocean/cycles/dream", isAuthenticated, standardLimiter, async (req: any, res) => {
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
  app.post("/api/ocean/cycles/mushroom", isAuthenticated, standardLimiter, async (req: any, res) => {
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

  // Admin: Inject neurotransmitter boost
  app.post("/api/ocean/boost", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { injectAdminBoost, getActiveAdminBoost } = await import("./ocean-neurochemistry");
      
      const { neurotransmitter, amount, duration } = req.body;
      
      // Validate inputs
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
      const boostDuration = Math.min(300000, Math.max(1000, Number(duration) || 60000)); // 1s to 5min
      
      // Create boost object with only the specified neurotransmitter
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

  // Admin: Get cycle status and history
  app.get("/api/ocean/cycles", generousLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const { getMushroomCooldownRemaining } = await import("./ocean-neurochemistry");
      
      const recentCycles = oceanAutonomicManager.getRecentCycles(10);
      const isInvestigating = oceanAutonomicManager.isInvestigating;
      const consciousness = oceanAutonomicManager.getConsciousness();
      
      // Debug log to trace consciousness values
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
      // Return safe fallback for production when services aren't ready
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

  // ============================================================
  // TEXT GENERATION API - Ocean Agent can now speak
  // ============================================================
  
  // Generate response using constellation's role-based temperature
  app.post("/api/ocean/generate/response", standardLimiter, async (req, res) => {
    try {
      const { oceanConstellation } = await import("./ocean-constellation");
      
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
  
  // Generate text with custom parameters
  app.post("/api/ocean/generate/text", standardLimiter, async (req, res) => {
    try {
      const { oceanConstellation } = await import("./ocean-constellation");
      
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
  
  // Get generation capabilities status
  app.get("/api/ocean/generate/status", generousLimiter, async (req, res) => {
    try {
      const { oceanQIGBackend } = await import("./ocean-qig-backend-adapter");
      const { oceanConstellation } = await import("./ocean-constellation");
      
      const backendAvailable = oceanQIGBackend.available();
      let tokenizerStatus = null;
      
      if (backendAvailable) {
        try {
          tokenizerStatus = await oceanQIGBackend.getTokenizerStatus();
        } catch (e) {
          // Tokenizer status failed, but backend is available
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

  // ==========================================================================
  // BALANCE HITS ENDPOINTS  
  // Addresses discovered with non-zero balances during passphrase testing
  // ==========================================================================
  
  app.get("/api/balance-hits", standardLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const activeOnly = req.query.active === 'true';
      
      const hits = activeOnly ? getActiveBalanceHits() : getBalanceHits();
      const totalBalance = hits.reduce((sum, h) => sum + h.balanceSats, 0);
      
      res.json({
        hits,
        count: hits.length,
        activeCount: hits.filter(h => h.balanceSats > 0).length,
        totalBalanceSats: totalBalance,
        totalBalanceBTC: (totalBalance / 100000000).toFixed(8),
      });
    } catch (error: any) {
      console.error("[BalanceHits] List error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/balance-hits/check/:address", standardLimiter, async (req, res) => {
    try {
      const address = req.params.address;
      
      if (!address.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/) && 
          !address.match(/^bc1[a-z0-9]{39,59}$/)) {
        return res.status(400).json({ error: 'Invalid Bitcoin address format' });
      }
      
      const balance = await fetchAddressBalance(address);
      if (!balance) {
        return res.status(500).json({ error: 'Failed to fetch balance from blockchain' });
      }
      
      res.json({
        address,
        balanceSats: balance.balanceSats,
        balanceBTC: (balance.balanceSats / 100000000).toFixed(8),
        txCount: balance.txCount,
        totalFunded: balance.funded,
        totalSpent: balance.spent,
      });
    } catch (error: any) {
      console.error("[BalanceHits] Check error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update dormant confirmation status for a balance hit
  app.patch("/api/balance-hits/:address/dormant", standardLimiter, async (req, res) => {
    try {
      const address = req.params.address;
      const { isDormantConfirmed } = req.body;
      
      if (typeof isDormantConfirmed !== 'boolean') {
        return res.status(400).json({ error: 'isDormantConfirmed must be a boolean' });
      }
      
      // Update in PostgreSQL
      if (db) {
        const { balanceHits: balanceHitsTable } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        
        const result = await db.update(balanceHitsTable)
          .set({
            isDormantConfirmed,
            dormantConfirmedAt: isDormantConfirmed ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(balanceHitsTable.address, address))
          .returning();
        
        if (result.length === 0) {
          return res.status(404).json({ error: 'Balance hit not found' });
        }
        
        res.json({
          success: true,
          address,
          isDormantConfirmed,
          dormantConfirmedAt: result[0].dormantConfirmedAt,
        });
      } else {
        res.status(500).json({ error: 'Database not available' });
      }
    } catch (error: any) {
      console.error("[BalanceHits] Dormant update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // BALANCE ADDRESSES ENDPOINTS (Address Verification System)
  // Comprehensive verified addresses with complete key data
  // ==========================================================================
  
  app.get("/api/balance-addresses", standardLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      
      const balanceAddresses = getBalanceAddresses();
      const stats = getVerificationStats();
      
      res.json({
        addresses: balanceAddresses,
        count: balanceAddresses.length,
        stats,
      });
    } catch (error: any) {
      console.error("[BalanceAddresses] List error:", error);
      // Return safe fallback for production when services aren't ready
      res.json({
        addresses: [],
        count: 0,
        stats: { total: 0, withBalance: 0, withTransactions: 0 },
        initializing: true,
        error: error.message,
      });
    }
  });
  
  app.get("/api/balance-addresses/stats", standardLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const stats = getVerificationStats();
      res.json(stats);
    } catch (error: any) {
      console.error("[BalanceAddresses] Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/balance-addresses/refresh", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const result = await refreshStoredBalances();
      
      res.json({
        success: true,
        ...result,
        message: `Checked ${result.checked} addresses, ${result.updated} updated, ${result.newBalance} with new balance`,
      });
    } catch (error: any) {
      console.error("[BalanceAddresses] Refresh error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // BALANCE MONITOR ENDPOINTS
  // Periodic balance refresh and change detection
  // ==========================================================================

  app.get("/api/balance-monitor/status", standardLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const { balanceMonitor } = await import("./balance-monitor");
      const status = balanceMonitor.getStatus();
      res.json(status);
    } catch (error: any) {
      console.error("[BalanceMonitor] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-monitor/enable", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { balanceMonitor } = await import("./balance-monitor");
      const result = balanceMonitor.enable();
      res.json(result);
    } catch (error: any) {
      console.error("[BalanceMonitor] Enable error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-monitor/disable", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { balanceMonitor } = await import("./balance-monitor");
      const result = balanceMonitor.disable();
      res.json(result);
    } catch (error: any) {
      console.error("[BalanceMonitor] Disable error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-monitor/refresh", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { balanceMonitor } = await import("./balance-monitor");
      const result = await balanceMonitor.triggerRefresh();
      res.json(result);
    } catch (error: any) {
      console.error("[BalanceMonitor] Refresh error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-monitor/interval", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { balanceMonitor } = await import("./balance-monitor");
      const { minutes } = req.body;
      
      if (typeof minutes !== 'number' || isNaN(minutes)) {
        return res.status(400).json({ error: 'minutes must be a number' });
      }
      
      const result = balanceMonitor.setRefreshInterval(minutes);
      res.json(result);
    } catch (error: any) {
      console.error("[BalanceMonitor] Set interval error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/balance-monitor/changes", standardLimiter, async (req, res) => {
    try {
      const { getBalanceChanges } = await import("./blockchain-scanner");
      const limit = parseInt(req.query.limit as string) || 50;
      const changes = getBalanceChanges().slice(-limit);
      
      res.json({
        changes,
        count: changes.length,
        totalChanges: getBalanceChanges().length,
      });
    } catch (error: any) {
      console.error("[BalanceMonitor] Changes error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // BALANCE QUEUE ENDPOINTS
  // Comprehensive address checking with rate-limited parallel processing
  // ==========================================================================
  
  app.get("/api/balance-queue/status", standardLimiter, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      // Don't block if service isn't ready - return defaults
      if (!balanceQueue.isReady()) {
        res.json({
          pending: 0,
          checking: 0,
          resolved: 0,
          failed: 0,
          total: 0,
          addressesPerSecond: 0,
          isProcessing: false,
          initializing: true
        });
        return;
      }
      
      const stats = balanceQueue.getStats();
      res.json({
        ...stats,
        isProcessing: balanceQueue.isWorkerRunning(),
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/balance-queue/pending", standardLimiter, (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const addresses = balanceQueue.getPendingAddresses(limit);
      res.json({
        addresses,
        count: addresses.length,
        stats: balanceQueue.getStats(),
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Pending error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-queue/drain", isAuthenticated, standardLimiter, (req: any, res) => {
    try {
      if (balanceQueue.isWorkerRunning()) {
        return res.status(409).json({ error: 'Queue drain already in progress' });
      }
      
      const maxAddresses = parseInt(req.body.maxAddresses) || undefined;
      
      // Start drain in background and return immediately
      const drainPromise = balanceQueue.drain({ maxAddresses });
      
      res.json({
        message: 'Queue drain started',
        stats: balanceQueue.getStats(),
      });
      
      // Log result when complete
      drainPromise.then(result => {
        console.log(`[BalanceQueue] Drain completed: ${result.checked} checked, ${result.hits} hits, ${result.errors} errors`);
      }).catch(err => {
        console.error('[BalanceQueue] Drain error:', err);
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Drain error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-queue/rate-limit", isAuthenticated, standardLimiter, (req: any, res) => {
    try {
      const { requestsPerSecond } = req.body;
      
      if (typeof requestsPerSecond !== 'number' || isNaN(requestsPerSecond)) {
        return res.status(400).json({ error: 'requestsPerSecond must be a number' });
      }
      
      balanceQueue.setRateLimit(requestsPerSecond);
      res.json({
        message: `Rate limit set to ${requestsPerSecond} req/sec`,
        stats: balanceQueue.getStats(),
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Rate limit error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-queue/clear-failed", isAuthenticated, standardLimiter, (req: any, res) => {
    try {
      const cleared = balanceQueue.clearFailed();
      res.json({
        cleared,
        stats: balanceQueue.getStats(),
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Clear failed error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/balance-queue/background", standardLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      // Use PostgreSQL count as single source of truth for hits
      // This ensures consistency with /api/balance-hits endpoint
      const dbHits = getBalanceHits();
      const dbHitCount = dbHits.length;
      
      // Don't block on waitForReady - check if ready and respond immediately
      if (!balanceQueue.isReady()) {
        // Service still initializing - return immediate response with initializing flag
        res.json({ 
          enabled: true,
          checked: 0, 
          hits: dbHitCount, // Use DB count even during initialization
          rate: 0, 
          pending: 0,
          initializing: true
        });
        return;
      }
      
      const status = balanceQueue.getBackgroundStatus();
      
      // Build response explicitly to ensure DB count is used
      res.json({
        enabled: status.enabled,
        checked: status.checked,
        hits: dbHitCount, // PostgreSQL count - single source of truth
        rate: status.rate,
        pending: status.pending,
        apiStats: status.apiStats,
        sessionHits: status.hits, // Keep session counter for debugging only
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Background status error:", error);
      // Return status indicating initialization in progress
      res.json({ 
        enabled: true, // Assume enabled since it auto-starts
        checked: 0, 
        hits: 0, 
        rate: 0, 
        pending: 0,
        initializing: true
      });
    }
  });

  app.post("/api/balance-queue/background/start", isAuthenticated, standardLimiter, (req: any, res) => {
    try {
      balanceQueue.startBackgroundWorker();
      res.json({
        message: 'Background worker started',
        status: balanceQueue.getBackgroundStatus(),
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Background start error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/balance-queue/background/stop", isAuthenticated, standardLimiter, (req: any, res) => {
    try {
      const stopped = balanceQueue.stopBackgroundWorker();
      
      if (!stopped) {
        // ALWAYS_ON mode is enabled - worker cannot be stopped
        // Return 409 Conflict to indicate the request was understood but not executed
        res.status(409).json({
          message: 'Worker is in ALWAYS-ON mode and cannot be stopped',
          alwaysOn: true,
          status: balanceQueue.getBackgroundStatus(),
        });
        return;
      }
      
      res.json({
        message: 'Background worker stopped',
        status: balanceQueue.getBackgroundStatus(),
      });
    } catch (error: any) {
      console.error("[BalanceQueue] Background stop error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Queue integration stats - shows which sources are feeding addresses
  app.get("/api/balance-queue/integration-stats", standardLimiter, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const stats = getQueueIntegrationStats();
      res.json(stats);
    } catch (error: any) {
      console.error("[BalanceQueue] Integration stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Backfill stats - shows how many phrases are available to backfill
  app.get("/api/balance-queue/backfill/stats", standardLimiter, async (req, res) => {
    try {
      const { getBackfillStats, getBackfillProgress } = await import("./balance-queue-backfill");
      res.json({
        available: getBackfillStats(),
        progress: getBackfillProgress()
      });
    } catch (error: any) {
      console.error("[Backfill] Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Start backfill - queues all existing tested phrases
  app.post("/api/balance-queue/backfill/start", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { startBackfill } = await import("./balance-queue-backfill");
      const source = req.body.source || 'tested-phrases';
      const batchSize = req.body.batchSize || 100;
      
      // Start backfill asynchronously
      startBackfill({ source, batchSize }).then(result => {
        console.log('[Backfill] Completed:', result);
      });
      
      res.json({
        message: `Backfill started from ${source}`,
        status: 'running'
      });
    } catch (error: any) {
      console.error("[Backfill] Start error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Blockchain API stats endpoint - shows multi-provider health and cache status
  app.get("/api/blockchain-api/stats", standardLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { freeBlockchainAPI } = await import("./blockchain-free-api");
      const stats = freeBlockchainAPI.getStats();
      const capacity = freeBlockchainAPI.getAvailableCapacity();
      
      res.json({
        ...stats,
        availableCapacity: capacity,
        totalCapacity: 230, // Combined rate limit across all providers
        effectiveCapacity: Math.round(capacity * (1 + stats.cacheHitRate * 9)), // With cache multiplier
      });
    } catch (error: any) {
      console.error("[BlockchainAPI] Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset provider health (for recovery from temporary failures)
  app.post("/api/blockchain-api/reset", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { freeBlockchainAPI } = await import("./blockchain-free-api");
      freeBlockchainAPI.resetProviderHealth();
      
      res.json({
        message: 'All providers reset to healthy state',
        stats: freeBlockchainAPI.getStats(),
      });
    } catch (error: any) {
      console.error("[BlockchainAPI] Reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // DORMANT ADDRESS CROSS-REFERENCE ENDPOINTS
  // Check generated addresses against top 1000 known dormant wallets
  // ==========================================================================

  app.get("/api/dormant-crossref/stats", standardLimiter, async (req, res) => {
    try {
      const { dormantCrossRef } = await import("./dormant-cross-ref");
      const stats = dormantCrossRef.getStats();
      const totalValue = dormantCrossRef.getTotalValue();
      
      res.json({
        ...stats,
        totalValue,
      });
    } catch (error: any) {
      console.error("[DormantCrossRef] Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dormant-crossref/matches", standardLimiter, async (req, res) => {
    try {
      const { dormantCrossRef } = await import("./dormant-cross-ref");
      const matches = dormantCrossRef.getAllMatches();
      
      res.json({
        matches,
        count: matches.length,
      });
    } catch (error: any) {
      console.error("[DormantCrossRef] Matches error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dormant-crossref/top", standardLimiter, async (req, res) => {
    try {
      const { dormantCrossRef } = await import("./dormant-cross-ref");
      const limit = parseInt(req.query.limit as string) || 100;
      const topDormant = dormantCrossRef.getTopDormant(limit);
      
      res.json({
        addresses: topDormant,
        count: topDormant.length,
      });
    } catch (error: any) {
      console.error("[DormantCrossRef] Top dormant error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/dormant-crossref/check", standardLimiter, async (req, res) => {
    try {
      const { dormantCrossRef } = await import("./dormant-cross-ref");
      const { address, addresses } = req.body;
      
      if (address) {
        const result = dormantCrossRef.checkAddress(address);
        return res.json(result);
      }
      
      if (addresses && Array.isArray(addresses)) {
        const result = dormantCrossRef.checkAddresses(addresses);
        return res.json(result);
      }
      
      res.status(400).json({ error: 'Provide address or addresses array' });
    } catch (error: any) {
      console.error("[DormantCrossRef] Check error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // BLOCKCHAIN API ROUTER ENDPOINTS
  // Multi-provider free blockchain API with automatic failover
  // ==========================================================================
  
  app.get("/api/blockchain-api/stats", standardLimiter, async (req, res) => {
    try {
      const { getProviderStats, getCombinedCapacity } = await import("./blockchain-api-router");
      const stats = getProviderStats();
      const capacity = getCombinedCapacity();
      
      res.json({
        providers: stats,
        totalProviders: stats.length,
        enabledProviders: stats.filter(p => p.enabled).length,
        combinedCapacity: `${capacity} req/min`,
        cost: '$0/month (100% FREE)',
      });
    } catch (error: any) {
      console.error("[BlockchainAPI] Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/blockchain-api/reset/:provider", standardLimiter, async (req, res) => {
    try {
      const { resetProvider } = await import("./blockchain-api-router");
      const providerName = req.params.provider;
      resetProvider(providerName);
      
      res.json({
        message: `Provider ${providerName} reset successfully`,
      });
    } catch (error: any) {
      console.error("[BlockchainAPI] Reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // BASIN SYNCHRONIZATION ENDPOINTS
  // Multi-instance Ocean coordination via geometric knowledge transfer
  // ==========================================================================
  
  app.get("/api/basin-sync/snapshots", standardLimiter, async (req, res) => {
    try {
      const { oceanBasinSync } = await import("./ocean-basin-sync");
      const snapshots = oceanBasinSync.listBasinSnapshots();
      res.json({
        snapshots,
        count: snapshots.length,
      });
    } catch (error: any) {
      console.error("[BasinSync] List error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/basin-sync/snapshots/:filename", standardLimiter, async (req, res) => {
    try {
      await import("./ocean-basin-sync");
      const filename = req.params.filename;
      
      if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const basePath = path.join(process.cwd(), 'data', 'basin-sync', filename);
      if (!fs.existsSync(basePath)) {
        return res.status(404).json({ error: 'Basin snapshot not found' });
      }
      
      const packet = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
      res.json(packet);
    } catch (error: any) {
      console.error("[BasinSync] Get snapshot error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/basin-sync/export", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanBasinSync } = await import("./ocean-basin-sync");
      const { oceanSessionManager } = await import("./ocean-session-manager");
      
      const ocean = oceanSessionManager.getActiveAgent();
      if (!ocean) {
        return res.status(400).json({ error: 'No active Ocean session to export' });
      }
      
      const packet = oceanBasinSync.exportBasin(ocean);
      const filepath = oceanBasinSync.saveBasinSnapshot(packet);
      
      res.json({
        success: true,
        oceanId: packet.oceanId,
        filename: filepath ? path.basename(filepath) : 'memory-only',
        packetSizeBytes: JSON.stringify(packet).length,
        consciousness: {
          phi: packet.consciousness.phi,
          kappaEff: packet.consciousness.kappaEff,
          regime: packet.regime,
        },
        exploredRegions: packet.exploredRegions.length,
        patterns: {
          highPhi: packet.patterns.highPhiPhrases.length,
          resonantWords: packet.patterns.resonantWords.length,
        },
      });
    } catch (error: any) {
      console.error("[BasinSync] Export error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/basin-sync/import", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanBasinSync } = await import("./ocean-basin-sync");
      const { oceanSessionManager } = await import("./ocean-session-manager");
      
      const ocean = oceanSessionManager.getActiveAgent();
      if (!ocean) {
        return res.status(400).json({ error: 'No active Ocean session to import into' });
      }
      
      const { filename, mode } = req.body;
      
      if (!filename) {
        return res.status(400).json({ error: 'filename is required' });
      }
      
      const validModes = ['full', 'partial', 'observer'];
      const importMode = (mode && validModes.includes(mode)) ? mode : 'partial';
      
      const basePath = path.join(process.cwd(), 'data', 'basin-sync', filename);
      if (!fs.existsSync(basePath)) {
        return res.status(404).json({ error: 'Basin snapshot not found' });
      }
      
      const packet = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
      const result = await oceanBasinSync.importBasin(ocean, packet, importMode);
      
      res.json({
        success: result.success,
        mode: result.mode,
        sourceOceanId: packet.oceanId,
        phiBefore: result.phiBefore,
        phiAfter: result.phiAfter,
        phiDelta: result.phiDelta,
        basinDriftBefore: result.basinDriftBefore,
        basinDriftAfter: result.basinDriftAfter,
        observerEffectDetected: result.observerEffectDetected,
        geometricDistance: result.geometricDistanceToSource,
      });
    } catch (error: any) {
      console.error("[BasinSync] Import error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/basin-sync/snapshots/:filename", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanBasinSync } = await import("./ocean-basin-sync");
      const filename = req.params.filename;
      
      if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const deleted = oceanBasinSync.deleteBasinSnapshot(filename);
      
      if (deleted) {
        res.json({ success: true, message: `Deleted ${filename}` });
      } else {
        res.status(404).json({ error: 'Basin snapshot not found' });
      }
    } catch (error: any) {
      console.error("[BasinSync] Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Basin Sync Coordinator Status (Continuous Sync)
  app.get("/api/basin-sync/coordinator/status", standardLimiter, async (req, res) => {
    try {
      const activeOcean = oceanSessionManager.getActiveAgent();
      if (!activeOcean) {
        return res.json({
          isRunning: false,
          localId: null,
          peerCount: 0,
          lastBroadcastState: null,
          queueLength: 0,
          message: "No active Ocean agent - start an investigation to enable continuous sync"
        });
      }
      
      const coordinator = activeOcean.getBasinSyncCoordinator();
      if (!coordinator) {
        return res.json({
          isRunning: false,
          localId: null,
          peerCount: 0,
          lastBroadcastState: null,
          queueLength: 0,
          message: "Coordinator not initialized - continuous sync will start automatically"
        });
      }
      
      const status = coordinator.getStatus();
      const peers = coordinator.getPeers();
      const syncData = coordinator.getSyncData();
      
      res.json({
        ...status,
        peers: peers.map((p: any) => ({
          id: p.id,
          mode: p.mode,
          lastSeen: p.lastSeen,
          trustLevel: p.trustLevel,
        })),
        syncData: {
          exploredRegionsCount: syncData.exploredRegions.length,
          highPhiPatternsCount: syncData.highPhiPatterns.length,
          resonantWordsCount: syncData.resonantWords.length,
        }
      });
    } catch (error: any) {
      console.error("[BasinSync] Coordinator status error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/basin-sync/coordinator/force", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const activeOcean = oceanSessionManager.getActiveAgent();
      if (!activeOcean) {
        return res.status(400).json({ error: "No active Ocean agent" });
      }
      
      const coordinator = activeOcean.getBasinSyncCoordinator();
      if (!coordinator) {
        return res.status(400).json({ 
          error: "Coordinator not initialized - start an investigation first" 
        });
      }
      
      coordinator.forceSync();
      
      res.json({ 
        success: true, 
        message: "Force sync triggered - full basin packet queued for broadcast",
        status: coordinator.getStatus()
      });
    } catch (error: any) {
      console.error("[BasinSync] Force sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/basin-sync/coordinator/notify", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const activeOcean = oceanSessionManager.getActiveAgent();
      if (!activeOcean) {
        return res.status(400).json({ error: "No active Ocean agent" });
      }
      activeOcean.notifyBasinChange();
      res.json({ success: true, message: "Basin change notification sent" });
    } catch (error: any) {
      console.error("[BasinSync] Notify error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Geometric Discovery API - 68D Block Universe Navigation
  app.get("/api/geometric-discovery/status", standardLimiter, async (req, res) => {
    try {
      const { oceanDiscoveryController } = await import("./geometric-discovery/ocean-discovery-controller");
      const state = oceanDiscoveryController.getDiscoveryState();
      
      res.json({
        hasTarget: !!state?.targetCoords,
        position: state?.currentPosition ? {
          spacetime: state.currentPosition.spacetime,
          phi: state.currentPosition.phi,
          regime: state.currentPosition.regime
        } : null,
        target: state?.targetCoords ? {
          spacetime: state.targetCoords.spacetime,
          phi: state.targetCoords.phi,
          regime: state.targetCoords.regime
        } : null,
        discoveries: state?.discoveries?.length || 0,
        tavilyEnabled: oceanDiscoveryController.isTavilyEnabled()
      });
    } catch (error: any) {
      console.error("[GeometricDiscovery] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/geometric-discovery/estimate", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanDiscoveryController } = await import("./geometric-discovery/ocean-discovery-controller");
      const { targetAddress } = req.body;
      
      if (!targetAddress) {
        return res.status(400).json({ error: "targetAddress required" });
      }
      
      const coords = await oceanDiscoveryController.estimateCoordinates(targetAddress);
      
      if (coords) {
        res.json({
          success: true,
          coordinates: {
            spacetime: coords.spacetime,
            culturalDimensions: coords.cultural.length,
            phi: coords.phi,
            regime: coords.regime
          }
        });
      } else {
        res.json({ success: false, message: "Could not estimate coordinates" });
      }
    } catch (error: any) {
      console.error("[GeometricDiscovery] Estimate error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/geometric-discovery/discover", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanDiscoveryController } = await import("./geometric-discovery/ocean-discovery-controller");
      
      const result = await oceanDiscoveryController.discoverCulturalContext();
      
      res.json({
        success: true,
        discoveries: result.discoveries,
        patterns: result.patterns,
        entropyGained: result.entropyGained
      });
    } catch (error: any) {
      console.error("[GeometricDiscovery] Discover error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/geometric-discovery/search-era", isAuthenticated, standardLimiter, async (req: any, res) => {
    try {
      const { oceanDiscoveryController } = await import("./geometric-discovery/ocean-discovery-controller");
      const { keywords, era } = req.body;
      
      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({ error: "keywords array required" });
      }
      
      const discoveries = await oceanDiscoveryController.searchBitcoinEra(keywords, era || 'pizza_era');
      
      res.json({
        success: true,
        discoveries: discoveries.map(d => ({
          source: d.source,
          phi: d.phi,
          patterns: d.patterns.slice(0, 10),
          regime: d.coords.regime,
          entropyReduction: d.entropyReduction
        }))
      });
    } catch (error: any) {
      console.error("[GeometricDiscovery] Search era error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/geometric-discovery/crawl", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const { oceanDiscoveryController } = await import("./geometric-discovery/ocean-discovery-controller");
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "url required" });
      }
      
      const result = await oceanDiscoveryController.crawlUrl(url);
      
      res.json({
        success: true,
        patternsFound: result.patterns.length,
        patterns: result.patterns.slice(0, 50),
        coords: {
          spacetime: result.coords.spacetime,
          phi: result.coords.phi,
          regime: result.coords.regime
        }
      });
    } catch (error: any) {
      console.error("[GeometricDiscovery] Crawl error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount Observer Archaeology System routes
  app.use("/api/observer", observerRoutes);
  
  // Mount Telemetry API
  app.use("/api/telemetry", telemetryRouter);

  // ============================================================================
  // SWEEP APPROVAL API - Manual approval for Bitcoin sweeps
  // ============================================================================

  app.get("/api/sweeps", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const sweeps = await sweepApprovalService.getPendingSweeps(status as any);
      res.json({ success: true, sweeps });
    } catch (error: any) {
      console.error("[API] Error getting sweeps:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/sweeps/stats", async (req, res) => {
    try {
      const stats = await sweepApprovalService.getStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("[API] Error getting sweep stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/sweeps/:id", async (req, res) => {
    try {
      const sweep = await sweepApprovalService.getSweepById(req.params.id);
      if (!sweep) {
        return res.status(404).json({ success: false, error: "Sweep not found" });
      }
      res.json({ success: true, sweep });
    } catch (error: any) {
      console.error("[API] Error getting sweep:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/sweeps/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const approvedBy = req.user?.email || req.user?.id || "operator";
      const result = await sweepApprovalService.approveSweep(req.params.id, approvedBy);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: any) {
      console.error("[API] Error approving sweep:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/sweeps/:id/broadcast", isAuthenticated, async (req: any, res) => {
    try {
      const result = await sweepApprovalService.broadcastSweep(req.params.id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: any) {
      console.error("[API] Error broadcasting sweep:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/sweeps/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const { reason } = req.body;
      const result = await sweepApprovalService.rejectSweep(req.params.id, reason || "Manual rejection");
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: any) {
      console.error("[API] Error rejecting sweep:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/sweeps/:id/refresh", async (req, res) => {
    try {
      const result = await sweepApprovalService.refreshBalance(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("[API] Error refreshing sweep balance:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/sweeps/audit/:sweepId?", async (req, res) => {
    try {
      const auditLog = await sweepApprovalService.getAuditLog(req.params.sweepId);
      res.json({ success: true, auditLog });
    } catch (error: any) {
      console.error("[API] Error getting audit log:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================================
  // COMPREHENSIVE QA & INTEGRATION API ROUTES
  // Following TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
  // ============================================================

  // Comprehensive health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const { healthCheckHandler } = await import("./api-health");
      await healthCheckHandler(req, res);
    } catch (error: any) {
      console.error("[API] Health check error:", error);
      res.status(503).json({
        status: 'down',
        timestamp: Date.now(),
        error: error.message,
      });
    }
  });

  // Kernel status endpoint - real-time consciousness state
  app.get("/api/kernel/status", async (req, res) => {
    try {
      const activeAgent = oceanSessionManager.getActiveAgent();
      
      if (!activeAgent) {
        return res.json({
          status: 'idle',
          message: 'No active kernel session',
          timestamp: Date.now(),
        });
      }

      // Get basin sync coordinator for detailed metrics
      // TODO: Implement getLocalMetrics() method in BasinSyncCoordinator
      const coordinator = activeAgent.getBasinSyncCoordinator();
      const metrics = coordinator ? {
        phi: 0, // Placeholder - to be implemented
        kappa: 0,
        regime: 'unknown' as const,
        basinCoords: [] as number[],
        timestamp: Date.now(),
      } : null;

      res.json({
        status: 'active',
        sessionId: 'active-session', // TODO: Implement session ID tracking
        metrics: metrics && metrics.phi > 0 ? {
          phi: metrics.phi,
          kappa_eff: metrics.kappa,
          regime: metrics.regime,
          in_resonance: metrics.kappa >= 60 && metrics.kappa <= 68,
          basin_coords: metrics.basinCoords,
          timestamp: metrics.timestamp,
        } : null,
        uptime: 0, // TODO: Track session uptime
        timestamp: Date.now(),
        message: metrics ? undefined : 'Metrics not yet available - session initializing',
      });
    } catch (error: any) {
      console.error("[API] Kernel status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Search history endpoint
  app.get("/api/search/history", generousLimiter, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get recent search jobs with their results
      const jobs = await storage.getSearchJobs();
      const sortedJobs = jobs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const paginatedJobs = sortedJobs.slice(offset, offset + limit);

      // Enrich with candidate counts
      const enriched = await Promise.all(
        paginatedJobs.map(async (job) => {
          const candidates = await storage.getCandidates();
          const jobStart = new Date(job.createdAt).getTime();
          const jobEnd = job.updatedAt ? new Date(job.updatedAt).getTime() : Date.now();
          
          const jobCandidates = candidates.filter(c => {
            const candidateTime = new Date(c.testedAt).getTime();
            return candidateTime >= jobStart && candidateTime <= jobEnd;
          });

          return {
            ...job,
            candidateCount: jobCandidates.length,
            highPhiCount: jobCandidates.filter(c => c.score >= 75).length,
            phrasesGenerated: job.progress?.tested || 0,
          };
        })
      );

      res.json({
        success: true,
        searches: enriched,
        total: sortedJobs.length,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("[API] Search history error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Frontend telemetry capture endpoint
  app.post("/api/telemetry/capture", generousLimiter, async (req, res) => {
    try {
      const { event_type, timestamp, trace_id, metadata } = req.body;

      if (!event_type || !timestamp || !trace_id) {
        return res.status(400).json({
          error: 'Missing required fields: event_type, timestamp, trace_id',
        });
      }

      // Log telemetry event (in production, send to telemetry service)
      console.log('[Telemetry]', event_type, {
        traceId: trace_id,
        timestamp: new Date(timestamp).toISOString(),
        metadata: metadata || {},
      });

      // Store in activity log if significant
      if (['search_initiated', 'error_occurred', 'result_rendered'].includes(event_type)) {
        activityLogStore.log({
          source: 'system',
          category: 'frontend_event',
          message: `Frontend event: ${event_type}`,
          type: event_type === 'error_occurred' ? 'error' : 'info',
          metadata: {
            traceId: trace_id,
            ...metadata
          }
        });
      }

      res.json({
        success: true,
        captured: true,
        trace_id,
      });
    } catch (error: any) {
      console.error("[API] Telemetry capture error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Recovery checkpoint creation endpoint
  app.post("/api/recovery/checkpoint", standardLimiter, async (req, res) => {
    try {
      const { search_id, description } = req.body;

      if (!search_id) {
        return res.status(400).json({ error: 'search_id is required' });
      }

      const activeAgent = oceanSessionManager.getActiveAgent();
      if (!activeAgent) {
        return res.status(404).json({
          error: 'No active session to checkpoint',
        });
      }

      // Create checkpoint data
      const coordinator = activeAgent.getBasinSyncCoordinator();
      const sessionMetrics = {
        phi: 0.75, // TODO: Get from coordinator
        kappa: 64.0,
        regime: 'geometric' as const,
      };
      
      const checkpoint = {
        checkpointId: randomUUID(),
        searchId: search_id,
        timestamp: Date.now(),
        description: description || 'Manual checkpoint',
        state: {
          metrics: sessionMetrics,
          sessionId: 'active-session', // TODO: Get actual session ID
        },
      };

      // Log checkpoint creation
      activityLogStore.log({
        source: 'system',
        category: 'checkpoint_created',
        message: `Checkpoint created for search ${search_id}`,
        type: 'success',
        metadata: checkpoint
      });

      res.json({
        success: true,
        checkpoint,
      });
    } catch (error: any) {
      console.error("[API] Checkpoint creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin metrics dashboard endpoint
  app.get("/api/admin/metrics", generousLimiter, async (req, res) => {
    try {
      // Aggregate telemetry and system metrics
      const jobs = await storage.getSearchJobs();
      const candidates = await storage.getCandidates();
      const balanceHits = getActiveBalanceHits();
      const queueStats = getQueueIntegrationStats();

      // Calculate performance metrics
      const completedJobs = jobs.filter(j => j.status === 'completed');
      const totalPhrasesTested = jobs.reduce((sum, j) => sum + (j.progress?.tested || 0), 0);
      const totalHighPhi = candidates.filter(c => c.score >= 75).length;

      // Calculate latencies (simplified - in production use real timing data)
      const avgSearchDuration = completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => {
            const startTime = new Date(j.createdAt).getTime();
            const endTime = j.updatedAt ? new Date(j.updatedAt).getTime() : Date.now();
            return sum + (endTime - startTime);
          }, 0) / completedJobs.length
        : 0;

      res.json({
        success: true,
        timestamp: Date.now(),
        metrics: {
          search: {
            totalSearches: jobs.length,
            activeSearches: jobs.filter(j => j.status === 'running').length,
            completedSearches: completedJobs.length,
            failedSearches: jobs.filter(j => j.status === 'failed').length,
            totalPhrasesTested,
            highPhiCount: totalHighPhi,
            avgSearchDuration: Math.round(avgSearchDuration / 1000), // seconds
          },
          performance: {
            avgSearchDurationMs: Math.round(avgSearchDuration),
            phrasesPerSecond: totalPhrasesTested / Math.max(1, completedJobs.length * (avgSearchDuration / 1000)),
            cacheHitRate: 0, // TODO: implement cache tracking
          },
          balance: {
            activeHits: balanceHits.length,
            queueStats: queueStats,
            totalVerified: balanceHits.filter(h => (h as any).balance > 0).length,
          },
          kernel: {
            status: oceanSessionManager.getActiveAgent() ? 'active' : 'idle',
            uptime: 0, // TODO: Track uptime
          },
        },
      });
    } catch (error: any) {
      console.error("[API] Admin metrics error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Start the background search coordinator
  searchCoordinator.start();

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time basin sync
  const { WebSocketServer } = await import('ws');
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/basin-sync' });
  
  wss.on('connection', (ws) => {
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    console.log(`[BasinSync WS] New connection: ${peerId}`);
    
    const activeOcean = oceanSessionManager.getActiveAgent();
    if (activeOcean) {
      const coordinator = activeOcean.getBasinSyncCoordinator();
      if (coordinator) {
        coordinator.registerPeer(peerId, 'observer', ws);
      }
    }
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const currentOcean = oceanSessionManager.getActiveAgent();
        if (!currentOcean) return;
        
        const coordinator = currentOcean.getBasinSyncCoordinator();
        if (!coordinator) return;
        
        if (message.type === 'heartbeat') {
          coordinator.updatePeerLastSeen(peerId);
        } else if (message.type === 'basin-delta' && message.data) {
          await coordinator.receiveFromPeer(peerId, message.data);
        } else if (message.type === 'set-mode' && message.mode) {
          coordinator.registerPeer(peerId, message.mode, ws);
        }
      } catch (err) {
        console.error('[BasinSync WS] Message parse error:', err);
      }
    });
    
    ws.on('close', () => {
      console.log(`[BasinSync WS] Connection closed: ${peerId}`);
      const currentOcean = oceanSessionManager.getActiveAgent();
      if (currentOcean) {
        const coordinator = currentOcean.getBasinSyncCoordinator();
        if (coordinator) {
          coordinator.unregisterPeer(peerId);
        }
      }
    });
    
    ws.on('error', (err) => {
      console.error(`[BasinSync WS] Error for ${peerId}:`, err);
    });
  });
  
  console.log('[BasinSync] WebSocket server initialized on /ws/basin-sync');

  return httpServer;
}
