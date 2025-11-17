import { randomUUID } from "crypto";
import { storage } from "./storage";
import { generateBitcoinAddress } from "./crypto";
import { scorePhrase } from "./qig-scoring";
import { KNOWN_12_WORD_PHRASES } from "./known-phrases";
import { generateRandomBIP39Phrase } from "./bip39-words";
import type { SearchJob, SearchJobLog, Candidate } from "@shared/schema";

class SearchCoordinator {
  private isRunning = false;
  private currentJobId: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  async start() {
    if (this.isRunning) {
      console.log("[SearchCoordinator] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[SearchCoordinator] Starting background worker");

    this.intervalId = setInterval(async () => {
      await this.processJobs();
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[SearchCoordinator] Stopped background worker");
  }

  private async processJobs() {
    if (this.currentJobId) {
      return;
    }

    const jobs = await storage.getSearchJobs();
    
    // Prefer currently running job, then first pending job
    let jobToProcess = jobs.find(j => j.status === "running");
    if (!jobToProcess) {
      jobToProcess = jobs.find(j => j.status === "pending");
    }

    if (!jobToProcess) {
      return;
    }

    this.currentJobId = jobToProcess.id;

    try {
      await this.executeJob(jobToProcess.id);
    } catch (error: any) {
      console.error(`[SearchCoordinator] Job ${jobToProcess.id} failed:`, error);
      await storage.appendJobLog(jobToProcess.id, { message: `Job failed: ${error.message}`, type: "error" });
      await storage.updateSearchJob(jobToProcess.id, { status: "failed" });
    } finally {
      this.currentJobId = null;
    }
  }

  private async executeJob(jobId: string) {
    // Always reload fresh job state
    let job = await storage.getSearchJob(jobId);
    if (!job || job.status === "stopped") {
      return;
    }

    if (job.status === "pending") {
      await storage.updateSearchJob(jobId, { 
        status: "running",
        stats: { startTime: new Date().toISOString() }
      });
      await storage.appendJobLog(jobId, { message: "Search started", type: "info" });
      job = await storage.getSearchJob(jobId) as SearchJob;
    }

    const phrases = await this.getPhrasesForStrategy(job);
    const BATCH_SIZE = 10;

    for (let i = job.progress.lastBatchIndex; i < phrases.length; i += BATCH_SIZE) {
      // Reload job state to check for stop signals
      job = await storage.getSearchJob(jobId) as SearchJob;
      if (!job || job.status === "stopped") {
        await storage.appendJobLog(jobId, { message: "Search stopped by user", type: "info" });
        return;
      }

      const batch = phrases.slice(i, i + BATCH_SIZE);
      const results = await this.processBatch(batch, jobId);

      // Reload job again for fresh state before updating
      job = await storage.getSearchJob(jobId) as SearchJob;
      const newTested = job.progress.tested + batch.length;
      const newHighPhi = job.progress.highPhiCount + results.highPhiCandidates;
      const elapsed = Date.now() - new Date(job.stats.startTime!).getTime();
      const rate = Math.round((newTested / (elapsed / 1000)) * 10) / 10;

      await storage.updateSearchJob(jobId, {
        progress: {
          tested: newTested,
          highPhiCount: newHighPhi,
          lastBatchIndex: i + BATCH_SIZE,
        },
        stats: { rate },
      });
      await storage.appendJobLog(jobId, { 
        message: `Batch complete: ${batch.length} phrases tested, ${results.highPhiCandidates} high-Φ`, 
        type: "info" 
      });

      if (results.matchFound) {
        await storage.updateSearchJob(jobId, {
          status: "completed",
          stats: { endTime: new Date().toISOString() },
        });
        await storage.appendJobLog(jobId, { 
          message: `🎉 MATCH FOUND! ${results.matchedPhrase}`, 
          type: "success" 
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await storage.updateSearchJob(jobId, {
      status: "completed",
      stats: { endTime: new Date().toISOString() },
    });
    await storage.appendJobLog(jobId, { message: "Search completed", type: "info" });
  }

  private async getPhrasesForStrategy(job: SearchJob): Promise<string[]> {
    switch (job.strategy) {
      case "custom":
        return job.params.customPhrase ? [job.params.customPhrase] : [];

      case "known":
        return KNOWN_12_WORD_PHRASES;

      case "batch":
        return job.params.batchPhrases || [];

      case "bip39-random":
        const count = job.params.bip39Count || 10;
        const phrases: string[] = [];
        for (let i = 0; i < count; i++) {
          phrases.push(generateRandomBIP39Phrase());
        }
        return phrases;

      default:
        return [];
    }
  }

  private async processBatch(phrases: string[], jobId: string): Promise<{
    highPhiCandidates: number;
    matchFound: boolean;
    matchedPhrase?: string;
  }> {
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
        return {
          highPhiCandidates: highPhiCount,
          matchFound: true,
          matchedPhrase: phrase,
        };
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
        await storage.addCandidate(candidate);
        highPhiCount++;
      }
    }

    return {
      highPhiCandidates: highPhiCount,
      matchFound: false,
    };
  }

  async stopJob(jobId: string) {
    const job = await storage.getSearchJob(jobId);
    if (job && (job.status === "pending" || job.status === "running")) {
      await storage.updateSearchJob(jobId, {
        status: "stopped",
        stats: { endTime: new Date().toISOString() },
      });
    }
  }
}

export const searchCoordinator = new SearchCoordinator();
