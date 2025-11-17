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
    const pendingJob = jobs.find(j => j.status === "pending" || j.status === "running");

    if (!pendingJob) {
      return;
    }

    this.currentJobId = pendingJob.id;

    try {
      await this.executeJob(pendingJob);
    } catch (error: any) {
      console.error(`[SearchCoordinator] Job ${pendingJob.id} failed:`, error);
      await this.updateJob(pendingJob.id, {
        status: "failed",
        logs: [...pendingJob.logs, this.createLog(`Job failed: ${error.message}`, "error")],
      });
    } finally {
      this.currentJobId = null;
    }
  }

  private async executeJob(job: SearchJob) {
    if (job.status === "stopped") {
      return;
    }

    if (job.status === "pending") {
      await this.updateJob(job.id, {
        status: "running",
        stats: { ...job.stats, startTime: new Date().toISOString() },
        logs: [...job.logs, this.createLog("Search started", "info")],
      });
      job = await storage.getSearchJob(job.id) as SearchJob;
    }

    const phrases = await this.getPhrasesForStrategy(job);
    const BATCH_SIZE = 10;
    const startIndex = job.progress.lastBatchIndex;

    for (let i = startIndex; i < phrases.length; i += BATCH_SIZE) {
      const currentJob = await storage.getSearchJob(job.id);
      if (!currentJob || currentJob.status === "stopped") {
        await this.updateJob(job.id, {
          logs: [...(currentJob?.logs || []), this.createLog("Search stopped by user", "info")],
        });
        return;
      }

      const batch = phrases.slice(i, i + BATCH_SIZE);
      const results = await this.processBatch(batch, job.id);

      const newTested = job.progress.tested + batch.length;
      const newHighPhi = job.progress.highPhiCount + results.highPhiCandidates;
      const elapsed = Date.now() - new Date(job.stats.startTime!).getTime();
      const rate = Math.round((newTested / (elapsed / 1000)) * 10) / 10;

      await this.updateJob(job.id, {
        progress: {
          tested: newTested,
          highPhiCount: newHighPhi,
          lastBatchIndex: i + BATCH_SIZE,
        },
        stats: { ...job.stats, rate },
        logs: [...job.logs, this.createLog(`Batch complete: ${batch.length} phrases tested, ${results.highPhiCandidates} high-Φ`, "info")],
      });

      job = await storage.getSearchJob(job.id) as SearchJob;

      if (results.matchFound) {
        await this.updateJob(job.id, {
          status: "completed",
          stats: { ...job.stats, endTime: new Date().toISOString() },
          logs: [...job.logs, this.createLog(`🎉 MATCH FOUND! ${results.matchedPhrase}`, "success")],
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.updateJob(job.id, {
      status: "completed",
      stats: { ...job.stats, endTime: new Date().toISOString() },
      logs: [...job.logs, this.createLog("Search completed", "info")],
    });
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

  private async updateJob(id: string, updates: Partial<SearchJob>) {
    await storage.updateSearchJob(id, { ...updates, updatedAt: new Date().toISOString() });
  }

  private createLog(message: string, type: "info" | "success" | "error"): SearchJobLog {
    return {
      message,
      type,
      timestamp: new Date().toISOString(),
    };
  }

  async stopJob(jobId: string) {
    const job = await storage.getSearchJob(jobId);
    if (job && (job.status === "pending" || job.status === "running")) {
      await this.updateJob(jobId, {
        status: "stopped",
        stats: { ...job.stats, endTime: new Date().toISOString() },
      });
    }
  }
}

export const searchCoordinator = new SearchCoordinator();
