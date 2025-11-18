import { randomUUID } from "crypto";
import { storage } from "./storage";
import { generateBitcoinAddress, generateMasterPrivateKey, generateBitcoinAddressFromPrivateKey } from "./crypto";
import { scorePhrase } from "./qig-scoring";
import { KNOWN_12_WORD_PHRASES } from "./known-phrases";
import { generateRandomBIP39Phrase } from "./bip39-words";
import { generateFragmentVariations } from "./fragment-variations";
import { generateLocalSearchVariations } from "./local-search";
import { DiscoveryTracker } from "./discovery-tracker";
import type { SearchJob, SearchJobLog, Candidate } from "@shared/schema";

class SearchCoordinator {
  private isRunning = false;
  private currentJobId: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private discoveryTrackers = new Map<string, DiscoveryTracker>();
  private modeExplorationBatches = new Map<string, number>(); // Track batches in exploration mode
  private modeInvestigationBatches = new Map<string, number>(); // Track batches in investigation mode

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
        stats: { startTime: new Date().toISOString(), rate: 0 }
      });
      await storage.appendJobLog(jobId, { message: "Search started", type: "info" });
      job = await storage.getSearchJob(jobId) as SearchJob;
    }

    // Continuous mode for BIP-39
    if (job.strategy === "bip39-continuous") {
      await this.executeContinuousJob(jobId);
      return;
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
          ...job.progress,
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
        const finalJob = await storage.getSearchJob(jobId) as SearchJob;
        await storage.updateSearchJob(jobId, {
          status: "completed",
          stats: { endTime: new Date().toISOString(), rate: finalJob.stats.rate },
        });
        await storage.appendJobLog(jobId, { 
          message: `🎉 MATCH FOUND! ${results.matchedPhrase}`, 
          type: "success" 
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalJob = await storage.getSearchJob(jobId) as SearchJob;
    await storage.updateSearchJob(jobId, {
      status: "completed",
      stats: { endTime: new Date().toISOString(), rate: finalJob.stats.rate },
    });
    await storage.appendJobLog(jobId, { message: "Search completed", type: "info" });
  }

  private async executeContinuousJob(jobId: string) {
    const BATCH_SIZE = 10;
    let job = await storage.getSearchJob(jobId) as SearchJob;
    const minHighPhi = job.params.minHighPhi || 2;
    const wordLength = job.params.wordLength || 24; // Default to max entropy
    const allLengths = wordLength === 0; // 0 = all lengths
    const validLengths = [12, 15, 18, 21, 24];
    const generationMode = job.params.generationMode || "bip39"; // Default to BIP-39

    // Initialize discovery tracker for this job
    if (!this.discoveryTrackers.has(jobId)) {
      this.discoveryTrackers.set(jobId, new DiscoveryTracker());
      this.modeExplorationBatches.set(jobId, 0);
      this.modeInvestigationBatches.set(jobId, 0);
    }
    const tracker = this.discoveryTrackers.get(jobId)!;

    // Initialize search mode if not set
    if (!job.progress.searchMode) {
      await storage.updateSearchJob(jobId, {
        progress: { ...job.progress, searchMode: "exploration" }
      });
      job = await storage.getSearchJob(jobId) as SearchJob;
    }

    const lengthDesc = allLengths 
      ? "all lengths (12-24 words)" 
      : `${wordLength} words`;
    
    const modeDesc = generationMode === "both" 
      ? "BIP-39 passphrases + master private keys"
      : generationMode === "master-key"
      ? "master private keys (256-bit)"
      : `BIP-39 passphrases (${lengthDesc})`;
    
    await storage.appendJobLog(jobId, { 
      message: `Continuous generation (${modeDesc}): running until ${minHighPhi}+ high-Φ candidates found. Adaptive mode switching enabled.`, 
      type: "info" 
    });

    // Test memory fragments first if provided (only once per job)
    const shouldTestFragments = job.params.testMemoryFragments && 
      job.params.memoryFragments && 
      job.params.memoryFragments.length > 0 &&
      (!job.progress.fragmentsTotal || job.progress.fragmentsTested === undefined || job.progress.fragmentsTested < job.progress.fragmentsTotal);
    
    if (shouldTestFragments) {
      await this.testMemoryFragments(jobId, job.params.memoryFragments!);
      
      // Reload job state after fragment testing
      job = await storage.getSearchJob(jobId) as SearchJob;
      if (!job || job.status === "stopped" || job.status === "completed") {
        return;
      }
    }

    while (true) {
      // Reload job state to check for stop signals
      job = await storage.getSearchJob(jobId) as SearchJob;
      if (!job || job.status === "stopped") {
        await storage.appendJobLog(jobId, { message: "Search stopped by user", type: "info" });
        return;
      }

      // Determine current search mode (exploration vs investigation)
      const currentMode = job.progress.searchMode || "exploration";
      const recommendedMode = tracker.getRecommendedMode();
      
      // Switch mode if recommendation differs and we have enough data
      let actualMode = currentMode;
      if (recommendedMode !== currentMode && tracker.getAllRates().batchCount >= 10) {
        actualMode = recommendedMode;
        await storage.updateSearchJob(jobId, {
          progress: { ...job.progress, searchMode: actualMode }
        });
        await storage.appendJobLog(jobId, { 
          message: `🔄 Mode switch: ${currentMode} → ${actualMode}`, 
          type: "info" 
        });
      }

      // Generate batch based on current mode
      const batch: Array<{ value: string; type: "bip39" | "master-key" }> = [];
      
      if (actualMode === "investigation" && job.progress.investigationTarget && generationMode !== "master-key") {
        // Investigation mode: generate variations around high-Φ target
        const targetPhrase = job.progress.investigationTarget;
        const variations = generateLocalSearchVariations(targetPhrase, BATCH_SIZE * 2);
        
        for (let i = 0; i < Math.min(BATCH_SIZE, variations.length); i++) {
          batch.push({ value: variations[i], type: "bip39" });
        }
        
        // Track investigation batches
        this.modeInvestigationBatches.set(jobId, (this.modeInvestigationBatches.get(jobId) || 0) + 1);
      } else {
        // Exploration mode: pure random sampling
        for (let i = 0; i < BATCH_SIZE; i++) {
          if (generationMode === "both") {
            // Alternate between BIP-39 and master keys
            if (i % 2 === 0) {
              const length = allLengths ? validLengths[i % validLengths.length] : wordLength;
              batch.push({ value: generateRandomBIP39Phrase(length), type: "bip39" });
            } else {
              batch.push({ value: generateMasterPrivateKey(), type: "master-key" });
            }
          } else if (generationMode === "master-key") {
            batch.push({ value: generateMasterPrivateKey(), type: "master-key" });
          } else {
            // BIP-39 mode
            if (allLengths) {
              const length = validLengths[i % validLengths.length];
              batch.push({ value: generateRandomBIP39Phrase(length), type: "bip39" });
            } else {
              batch.push({ value: generateRandomBIP39Phrase(wordLength), type: "bip39" });
            }
          }
        }
        
        // Track exploration batches
        this.modeExplorationBatches.set(jobId, (this.modeExplorationBatches.get(jobId) || 0) + 1);
      }

      const results = await this.processBatchWithTypes(batch, jobId);

      // Record batch results in discovery tracker
      tracker.recordBatch(results.highPhiCandidates);
      const rates = tracker.getAllRates();

      // Reload job again for fresh state before updating
      job = await storage.getSearchJob(jobId) as SearchJob;
      const newTested = job.progress.tested + batch.length;
      const newHighPhi = job.progress.highPhiCount + results.highPhiCandidates;
      const elapsed = Date.now() - new Date(job.stats.startTime!).getTime();
      const rate = Math.round((newTested / (elapsed / 1000)) * 10) / 10;

      // Update investigation target if we found new high-Φ candidate
      let investigationTarget = job.progress.investigationTarget;
      let lastHighPhiStep = job.progress.lastHighPhiStep;
      if (results.highPhiCandidates > 0 && results.highestCandidate) {
        investigationTarget = results.highestCandidate;
        lastHighPhiStep = newTested;
      }

      // Calculate exploration ratio
      const totalBatches = (this.modeExplorationBatches.get(jobId) || 0) + (this.modeInvestigationBatches.get(jobId) || 0);
      const explorationRatio = totalBatches > 0 
        ? Math.round(((this.modeExplorationBatches.get(jobId) || 0) / totalBatches) * 100) / 100 
        : 1.0;

      await storage.updateSearchJob(jobId, {
        progress: {
          ...job.progress,
          tested: newTested,
          highPhiCount: newHighPhi,
          lastBatchIndex: 0, // Not applicable for continuous
          investigationTarget,
          lastHighPhiStep,
        },
        stats: { 
          rate,
          discoveryRateFast: rates.fast,
          discoveryRateMedium: rates.medium,
          discoveryRateSlow: rates.slow,
          explorationRatio,
        },
      });

      const modeLabel = actualMode === "investigation" ? "🔍" : "🌐";
      await storage.appendJobLog(jobId, { 
        message: `${modeLabel} Batch complete (${actualMode}): ${batch.length} tested, ${results.highPhiCandidates} high-Φ (total: ${newHighPhi})`, 
        type: "info" 
      });

      if (results.matchFound) {
        const finalJob = await storage.getSearchJob(jobId) as SearchJob;
        await storage.updateSearchJob(jobId, {
          status: "completed",
          stats: { endTime: new Date().toISOString(), rate: finalJob.stats.rate },
        });
        await storage.appendJobLog(jobId, { 
          message: `🎉 MATCH FOUND! ${results.matchedPhrase}`, 
          type: "success" 
        });
        return;
      }

      // Check if we've found enough high-Φ candidates
      if (newHighPhi >= minHighPhi) {
        const finalJob = await storage.getSearchJob(jobId) as SearchJob;
        await storage.updateSearchJob(jobId, {
          status: "completed",
          stats: { endTime: new Date().toISOString(), rate: finalJob.stats.rate },
        });
        await storage.appendJobLog(jobId, { 
          message: `✓ Target reached: ${newHighPhi} high-Φ candidates found`, 
          type: "success" 
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
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
        const wordLength = job.params.wordLength || 24; // Default to max entropy
        const allLengths = wordLength === 0; // 0 = all lengths
        const validLengths = [12, 15, 18, 21, 24];
        const phrases: string[] = [];
        for (let i = 0; i < count; i++) {
          if (allLengths) {
            // Cycle through all valid lengths
            const length = validLengths[i % validLengths.length];
            phrases.push(generateRandomBIP39Phrase(length));
          } else {
            phrases.push(generateRandomBIP39Phrase(wordLength));
          }
        }
        return phrases;

      case "bip39-continuous":
        // Continuous mode handles phrase generation internally
        return [];

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
          type: "bip39",
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

  private async processBatchWithTypes(items: Array<{ value: string; type: "bip39" | "master-key" }>, jobId: string): Promise<{
    highPhiCandidates: number;
    matchFound: boolean;
    matchedPhrase?: string;
    highestCandidate?: string;
    highestScore?: number;
  }> {
    let highPhiCount = 0;
    let highestScore = 0;
    let highestCandidate: string | undefined;
    const targetAddresses = await storage.getTargetAddresses();

    for (const item of items) {
      let address: string;

      if (item.type === "master-key") {
        address = generateBitcoinAddressFromPrivateKey(item.value);
      } else {
        address = generateBitcoinAddress(item.value);
      }

      const matchedAddress = targetAddresses.find(t => t.address === address);

      if (matchedAddress) {
        // Save the match as a candidate for recovery
        const matchCandidate: Candidate = {
          id: randomUUID(),
          phrase: item.value,
          address,
          score: 100, // Exact match = 100% score
          qigScore: {
            contextScore: item.type === "master-key" ? 0 : 100,
            eleganceScore: item.type === "master-key" ? 0 : 100,
            typingScore: item.type === "master-key" ? 0 : 100,
            totalScore: 100,
          },
          testedAt: new Date().toISOString(),
          type: item.type,
        };
        await storage.addCandidate(matchCandidate);
        await storage.appendJobLog(jobId, { 
          message: `🎉 MATCH FOUND! Address: ${matchedAddress.address} | Type: ${item.type}`, 
          type: "success" 
        });
        
        return {
          highPhiCandidates: highPhiCount,
          matchFound: true,
          matchedPhrase: item.value,
          highestCandidate,
          highestScore,
        };
      }

      // Only score and save BIP-39 phrases with high QIG scores
      if (item.type === "bip39") {
        const qigScore = scorePhrase(item.value);
        
        // Track highest scoring candidate in this batch
        if (qigScore.totalScore > highestScore) {
          highestScore = qigScore.totalScore;
          highestCandidate = item.value;
        }
        
        if (qigScore.totalScore >= 75) {
          const candidate: Candidate = {
            id: randomUUID(),
            phrase: item.value,
            address,
            score: qigScore.totalScore,
            qigScore,
            testedAt: new Date().toISOString(),
            type: "bip39",
          };
          await storage.addCandidate(candidate);
          highPhiCount++;
        }
      }
    }

    return {
      highPhiCandidates: highPhiCount,
      matchFound: false,
      highestCandidate: highPhiCount > 0 ? highestCandidate : undefined,
      highestScore: highPhiCount > 0 ? highestScore : undefined,
    };
  }

  private async testMemoryFragments(jobId: string, baseFragments: string[]) {
    await storage.appendJobLog(jobId, { 
      message: `🧠 Testing memory fragments: ${baseFragments.length} base phrases provided`, 
      type: "info" 
    });

    // Generate all variations
    const variations = generateFragmentVariations(baseFragments);
    const totalVariations = variations.length;
    
    await storage.appendJobLog(jobId, { 
      message: `Generated ${totalVariations} variations from memory fragments`, 
      type: "info" 
    });

    // Initialize fragment progress tracking (preserve existing progress)
    const job = await storage.getSearchJob(jobId) as SearchJob;
    await storage.updateSearchJob(jobId, {
      progress: {
        ...job.progress,
        fragmentsTested: 0,
        fragmentsTotal: totalVariations,
      }
    });

    const BATCH_SIZE = 50; // Test fragments in larger batches
    const targetAddresses = await storage.getTargetAddresses();

    for (let i = 0; i < variations.length; i += BATCH_SIZE) {
      // Check for stop signal
      const job = await storage.getSearchJob(jobId);
      if (!job || job.status === "stopped") {
        await storage.appendJobLog(jobId, { message: "Fragment testing stopped by user", type: "info" });
        return;
      }

      const batch = variations.slice(i, i + BATCH_SIZE);
      
      for (const variation of batch) {
        // Test as passphrase-derived private key (early Bitcoin brain wallet method)
        const address = generateBitcoinAddress(variation.value);
        
        const matchedAddress = targetAddresses.find(t => t.address === address);
        
        if (matchedAddress) {
          // MATCH FOUND!
          const matchCandidate: Candidate = {
            id: randomUUID(),
            phrase: variation.value,
            address,
            score: 100,
            qigScore: {
              contextScore: 100,
              eleganceScore: 100,
              typingScore: 100,
              totalScore: 100,
            },
            testedAt: new Date().toISOString(),
            type: "bip39",
          };
          await storage.addCandidate(matchCandidate);
          
          await storage.updateSearchJob(jobId, {
            status: "completed",
            stats: { endTime: new Date().toISOString(), rate: 0 },
          });
          
          await storage.appendJobLog(jobId, { 
            message: `🎉 MATCH FOUND IN MEMORY FRAGMENTS! "${variation.value}" (${variation.description})`, 
            type: "success" 
          });
          return;
        }
      }

      // Update progress (preserve existing progress)
      const fragmentsTested = Math.min(i + BATCH_SIZE, totalVariations);
      const currentJob = await storage.getSearchJob(jobId) as SearchJob;
      await storage.updateSearchJob(jobId, {
        progress: {
          ...currentJob.progress,
          fragmentsTested,
          fragmentsTotal: totalVariations,
        }
      });

      await storage.appendJobLog(jobId, { 
        message: `Fragment testing progress: ${fragmentsTested}/${totalVariations} variations tested`, 
        type: "info" 
      });

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Mark fragment testing as complete (preserve existing progress)
    const finalJob = await storage.getSearchJob(jobId) as SearchJob;
    await storage.updateSearchJob(jobId, {
      progress: {
        ...finalJob.progress,
        fragmentsTested: totalVariations,
        fragmentsTotal: totalVariations,
      }
    });
    
    await storage.appendJobLog(jobId, { 
      message: `✓ Memory fragment testing complete: ${totalVariations} variations tested, no match found. Continuing with random exploration...`, 
      type: "info" 
    });
  }

  async stopJob(jobId: string) {
    const job = await storage.getSearchJob(jobId);
    if (job && (job.status === "pending" || job.status === "running")) {
      await storage.updateSearchJob(jobId, {
        status: "stopped",
        stats: { endTime: new Date().toISOString(), rate: job.stats.rate },
      });
    }
  }
}

export const searchCoordinator = new SearchCoordinator();
