import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateBitcoinAddress, verifyBrainWallet } from "./crypto";
import { scorePhrase } from "./qig-scoring";
import { KNOWN_12_WORD_PHRASES } from "./known-phrases";
import { generateRandomBIP39Phrase } from "./bip39-words";
import { searchCoordinator } from "./search-coordinator";
import { testPhraseRequestSchema, batchTestRequestSchema, addAddressRequestSchema, generateRandomPhrasesRequestSchema, createSearchJobRequestSchema, type Candidate, type TargetAddress, type SearchJob } from "@shared/schema";
import { randomUUID } from "crypto";
import { setupAuth, isAuthenticated } from "./replitAuth";

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
      const qigScore = scorePhrase(phrase);
      
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
        const qigScore = scorePhrase(phrase);
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
      
      // Pattern Analysis - Word frequency in high-Φ candidates
      const wordFrequency: Record<string, number> = {};
      const highPhiCandidates = candidates.filter(c => c.score >= 75);
      
      highPhiCandidates.forEach(c => {
        const words = c.phrase.toLowerCase().split(/\s+/);
        words.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
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
      
      // Additional sanitization for memory fragments
      if (params.memoryFragments && params.memoryFragments.length > 0) {
        params.memoryFragments = params.memoryFragments
          .map(f => f.trim())
          .filter(f => f.length > 0 && f.length <= 100);
        
        // Ensure we don't exceed reasonable limits
        if (params.memoryFragments.length > 50) {
          return res.status(400).json({
            error: "Too many memory fragments (max 50)",
          });
        }
      }
      
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

  // Start the background search coordinator
  searchCoordinator.start();

  const httpServer = createServer(app);

  return httpServer;
}
