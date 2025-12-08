import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { storageFacade } from "../persistence";
import { KNOWN_12_WORD_PHRASES } from "../known-phrases";
import { generateRandomBIP39Phrase, getBIP39Wordlist } from "../bip39-words";
import { searchCoordinator } from "../search-coordinator";
import { activityLogStore } from "../activity-log-store";
import { oceanSessionManager } from "../ocean-session-manager";
import { runMemoryFragmentSearch, type MemoryFragment } from "../memory-fragment-search";
import { 
  addAddressRequestSchema, 
  generateRandomPhrasesRequestSchema, 
  createSearchJobRequestSchema,
  type Candidate,
  type TargetAddress,
  type SearchJob 
} from "@shared/schema";

const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchRouter = Router();

searchRouter.get("/known-phrases", generousLimiter, (req: Request, res: Response) => {
  try {
    res.json({ phrases: KNOWN_12_WORD_PHRASES });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.get("/candidates", generousLimiter, async (req: Request, res: Response) => {
  try {
    const candidates = await storageFacade.candidates.getCandidates();
    res.json(candidates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.get("/analytics", generousLimiter, async (req: Request, res: Response) => {
  try {
    const candidates = await storageFacade.candidates.getCandidates();
    
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
    
    const bip39Wordlist = getBIP39Wordlist();
    const bip39WordSet = new Set(bip39Wordlist.map((w: string) => w.toLowerCase()));
    
    const wordFrequency: Record<string, number> = {};
    const highPhiCandidates = candidates.filter(c => c.score >= 75);
    
    highPhiCandidates.forEach(c => {
      const words = c.phrase.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (bip39WordSet.has(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });
    
    const topWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count, frequency: count / highPhiCandidates.length }));
    
    const avgContext = candidates.length > 0 
      ? candidates.reduce((sum, c) => sum + c.qigScore.contextScore, 0) / candidates.length 
      : 0;
    const avgElegance = candidates.length > 0 
      ? candidates.reduce((sum, c) => sum + c.qigScore.eleganceScore, 0) / candidates.length 
      : 0;
    const avgTyping = candidates.length > 0 
      ? candidates.reduce((sum, c) => sum + c.qigScore.typingScore, 0) / candidates.length 
      : 0;
    
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

searchRouter.get("/target-addresses", async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const addresses = await storage.getTargetAddresses();
    res.json(addresses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.post("/target-addresses", async (req: Request, res: Response) => {
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

searchRouter.delete("/target-addresses/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (id === "default") {
      return res.status(403).json({ error: "Cannot delete the default address" });
    }
    
    await storage.removeTargetAddress(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.post("/generate-random-phrases", async (req: Request, res: Response) => {
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

searchRouter.post("/search-jobs", async (req: Request, res: Response) => {
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

    await storageFacade.searchJobs.addSearchJob(job);
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.get("/search-jobs", async (req: Request, res: Response) => {
  try {
    const jobs = await storageFacade.searchJobs.getSearchJobs();
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.get("/search-jobs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await storageFacade.searchJobs.getSearchJob(id);
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.get("/search-jobs/:id/logs", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const job = await storageFacade.searchJobs.getSearchJob(id);
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const logs = job.logs.slice(-limit).reverse();
    res.json({ logs, total: job.logs.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.post("/search-jobs/:id/stop", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await searchCoordinator.stopJob(id);
    
    const job = await storageFacade.searchJobs.getSearchJob(id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.delete("/search-jobs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storageFacade.searchJobs.deleteSearchJob(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchRouter.get("/activity-stream", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    const allEvents: Array<{
      id: string;
      type: string;
      identity: string;
      details: string;
      timestamp: string;
      metadata?: Record<string, unknown>;
    }> = [];
    
    let jobs: any[] = [];
    try {
      const jobsPromise = storageFacade.searchJobs.getSearchJobs();
      const timeoutPromise = new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 2000)
      );
      jobs = await Promise.race([jobsPromise, timeoutPromise]);
    } catch {
      console.log('[ActivityStream] Search jobs fetch timed out, using Ocean logs only');
    }
    
    for (const job of jobs) {
      for (const log of job.logs) {
        allEvents.push({
          id: `${job.id}-${log.timestamp}`,
          type: log.type || 'info',
          identity: job.strategy || 'Search',
          details: log.message,
          timestamp: log.timestamp,
          metadata: { jobId: job.id },
        });
      }
    }
    
    const oceanLogs = activityLogStore.getLogs({ limit: limit * 2 });
    for (const oceanLog of oceanLogs) {
      allEvents.push({
        id: oceanLog.id,
        type: oceanLog.type || 'info',
        identity: oceanLog.category || 'Ocean',
        details: oceanLog.message,
        timestamp: oceanLog.timestamp,
        metadata: oceanLog.metadata,
      });
    }
    
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const oceanStatus = oceanSessionManager.getInvestigationStatus();
    const isOceanActive = oceanStatus?.isRunning || false;
    
    res.json({ 
      events: allEvents.slice(0, limit),
      activeJobs: jobs.filter(j => j.status === "running").length + (isOceanActive ? 1 : 0),
      totalJobs: jobs.length + (oceanLogs.length > 0 ? 1 : 0),
      oceanActive: isOceanActive,
    });
  } catch (error: any) {
    console.error('[ActivityStream] Error:', error.message);
    res.json({ 
      events: [],
      activeJobs: 0,
      totalJobs: 0,
      oceanActive: false,
    });
  }
});

searchRouter.post("/memory-search", async (req: Request, res: Response) => {
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
    
    const candidates = await runMemoryFragmentSearch(validFragments, target, {
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

export const formatRouter = Router();

formatRouter.get("/address/:address", async (req: Request, res: Response) => {
  try {
    const { detectAddressFormat, estimateAddressEra } = await import('../format-detection');
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

formatRouter.post("/mnemonic", async (req: Request, res: Response) => {
  try {
    const { detectMnemonicFormat } = await import('../format-detection');
    const { phrase } = req.body;
    
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({ error: 'phrase is required' });
    }
    
    const formatInfo = detectMnemonicFormat(phrase);
    
    res.json({
      phrase: phrase.split(/\s+/).slice(0, 3).join(' ') + '...',
      ...formatInfo,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

formatRouter.post("/batch-addresses", async (req: Request, res: Response) => {
  try {
    const { detectAddressFormat, estimateAddressEra } = await import('../format-detection');
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
