import { randomUUID } from "crypto";
import { storage } from "./storage";
import { generateBitcoinAddress, generateMasterPrivateKey, generateBitcoinAddressFromPrivateKey } from "./crypto";
import { scorePhraseQIG, validatePurity } from "./qig-pure-v2.js";
import { BasinVelocityMonitor } from "./basin-velocity-monitor.js";
import { ResonanceDetector } from "./resonance-detector.js";
import { KNOWN_12_WORD_PHRASES } from "./known-phrases";
import { generateRandomBIP39Phrase } from "./bip39-words";
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
  
  // Pure QIG monitors (measurements only, no optimization)
  private velocityMonitors = new Map<string, BasinVelocityMonitor>();
  private resonanceDetectors = new Map<string, ResonanceDetector>();

  async start() {
    if (this.isRunning) {
      console.log("[SearchCoordinator] Already running");
      return;
    }
    
    // VALIDATE PURITY: Ensure QIG implementation follows pure principles
    const purityCheck = validatePurity();
    if (!purityCheck.isPure) {
      console.error("[SearchCoordinator] ⚠️  PURITY VIOLATION DETECTED:");
      for (const violation of purityCheck.violations) {
        console.error(`  ❌ ${violation}`);
      }
      throw new Error("QIG implementation is impure. Cannot start search coordinator.");
    }
    console.log("[SearchCoordinator] ✅ QIG purity validated");

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

    // Algorithmic search strategies (continuous generation)
    if (job.strategy === "bip39-continuous" || 
        job.strategy === "bip39-adaptive" || 
        job.strategy === "master-key-sweep" || 
        job.strategy === "arbitrary-exploration") {
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
    
    const modeDesc = generationMode === "master-key"
      ? "master private keys (256-bit)"
      : generationMode === "arbitrary"
      ? "arbitrary brain wallet passphrases (2009 era, no BIP-39 validation)"
      : `BIP-39 passphrases (${lengthDesc})`;
    
    await storage.appendJobLog(jobId, { 
      message: `Continuous generation (${modeDesc}): running until ${minHighPhi}+ high-Φ candidates found. Adaptive mode switching enabled.`, 
      type: "info" 
    });

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
      const batch: Array<{ value: string; type: "bip39" | "master-key" | "arbitrary" }> = [];
      
      if (actualMode === "investigation" && job.progress.investigationTarget && generationMode !== "master-key" && generationMode !== "arbitrary") {
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
          if (generationMode === "master-key") {
            batch.push({ value: generateMasterPrivateKey(), type: "master-key" });
          } else if (generationMode === "arbitrary") {
            // Arbitrary brain wallet mode - random 2009-era passphrases (no BIP-39 validation)
            // Generates short phrases using common crypto-era vocabulary and patterns
            const commonWords = ['white', 'tiger', 'gary', 'ocean', 'bitcoin', 'satoshi', 'crypto', 'password', 'secret', 'key', 'wallet', 'money', 'hash', 'coin', 'digital'];
            const numbers = ['77', '17', '07', '1', '7', '17', '2009', '2010', '2008', '08', '09'];
            const wordCount = 2 + (i % 4); // 2-5 elements
            const elements: string[] = [];
            
            for (let w = 0; w < wordCount; w++) {
              if (w < wordCount - 1 || Math.random() < 0.7) {
                elements.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
              } else {
                elements.push(numbers[Math.floor(Math.random() * numbers.length)]);
              }
            }
            
            // Try different combinations: space-separated, concatenated, with numbers
            const phrase = Math.random() < 0.5 ? elements.join(' ') : elements.join('');
            batch.push({ value: phrase, type: "arbitrary" });
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

      case "batch":
        return job.params.batchPhrases || [];

      case "bip39-continuous":
      case "bip39-adaptive":
      case "master-key-sweep":
      case "arbitrary-exploration":
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
      const pureScore = scorePhraseQIG(phrase);
      const matchedAddress = targetAddresses.find(t => t.address === address);

      if (matchedAddress) {
        return {
          highPhiCandidates: highPhiCount,
          matchFound: true,
          matchedPhrase: phrase,
        };
      }

      // PURE QIG: Quality is emergent (Φ + κ proximity + curvature)
      // High quality (≥0.75) indicates meaningful geometric integration
      if (pureScore.quality >= 0.75) {
        const candidate: Candidate = {
          id: randomUUID(),
          phrase,
          address,
          score: pureScore.quality * 100, // Convert to 0-100 scale for consistency
          qigScore: {
            contextScore: 0,
            eleganceScore: 0,
            typingScore: 0,
            totalScore: pureScore.quality * 100
          },
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

  private async processBatchWithTypes(items: Array<{ value: string; type: "bip39" | "master-key" | "arbitrary" }>, jobId: string): Promise<{
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
        // Both BIP-39 and arbitrary passphrases use the same SHA-256 → address flow
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

      // Only score and save BIP-39 phrases with high QIG scores (PURE MEASUREMENT)
      if (item.type === "bip39") {
        const pureScore = scorePhraseQIG(item.value);
        const qualityPercent = pureScore.quality * 100;
        
        // Initialize monitors for this job if not exists
        if (!this.velocityMonitors.has(jobId)) {
          this.velocityMonitors.set(jobId, new BasinVelocityMonitor());
          this.resonanceDetectors.set(jobId, new ResonanceDetector());
        }
        
        // PURE MEASUREMENT: Track basin velocity (no optimization)
        const velocity = this.velocityMonitors.get(jobId)!.update(item.value, Date.now());
        
        // PURE MEASUREMENT: Check resonance proximity (no optimization toward κ*)
        const resonance = this.resonanceDetectors.get(jobId)!.checkResonance(pureScore.kappa);
        
        // Track highest scoring candidate in this batch
        if (qualityPercent > highestScore) {
          highestScore = qualityPercent;
          highestCandidate = item.value;
        }
        
        // PURE QIG: Quality ≥0.75 indicates phase transition (meaningful integration)
        // This is a MEASUREMENT threshold, not an optimization target
        if (pureScore.quality >= 0.75) {
          const candidate: Candidate = {
            id: randomUUID(),
            phrase: item.value,
            address,
            score: qualityPercent,
            qigScore: {
              contextScore: Math.round(pureScore.phi * 100),
              eleganceScore: Math.round((1 - Math.abs(pureScore.kappa - 64) / 64) * 100),
              typingScore: Math.round(Math.exp(-pureScore.ricciScalar) * 100),
              totalScore: qualityPercent,
            },
            testedAt: new Date().toISOString(),
            type: "bip39",
          };
          await storage.addCandidate(candidate);
          highPhiCount++;
          
          // Log pure QIG metrics for high-quality candidates
          await storage.appendJobLog(jobId, {
            message: `📊 High-Φ found | Φ=${pureScore.phi.toFixed(3)} κ=${pureScore.kappa.toFixed(1)} quality=${qualityPercent.toFixed(1)}% | velocity=${velocity.isSafe ? '✓' : '⚠️'} resonance=${resonance.inResonance ? '⚡' : '-'}`,
            type: "info"
          });
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
