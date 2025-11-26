import { randomUUID } from 'crypto';
import {
  AddressExplorationJournal,
  ExplorationPass,
  ConsciousnessSignature,
  CONSCIOUSNESS_THRESHOLDS,
} from '@shared/schema';
import { geometricMemory } from './geometric-memory';

const STRATEGIES = [
  'era_patterns',
  'brain_wallet_dict',
  'bitcoin_terms',
  'linguistic',
  'qig_basin_search',
  'historical_autonomous',
  'cross_format',
] as const;

export interface SchedulerConfig {
  coverageThreshold: number;
  minRegimeSweeps: number;
  maxPassesPerAddress: number;
  consecutiveNoNewRegimesLimit: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  coverageThreshold: 0.95,
  minRegimeSweeps: 3,
  maxPassesPerAddress: 20,
  consecutiveNoNewRegimesLimit: 2,
};

export class RepeatedAddressScheduler {
  private config: SchedulerConfig;
  private journals: Map<string, AddressExplorationJournal> = new Map();
  private currentStrategyIndex: Map<string, number> = new Map();

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getOrCreateJournal(address: string): AddressExplorationJournal {
    if (!this.journals.has(address)) {
      const journal: AddressExplorationJournal = {
        address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        manifoldCoverage: 0,
        regimesSweep: 0,
        strategiesUsed: [],
        passes: [],
        isComplete: false,
        totalHypothesesTested: 0,
        totalNearMisses: 0,
        avgPhiAcrossPasses: 0,
        dominantRegime: 'linear',
        resonanceClusters: [],
      };
      this.journals.set(address, journal);
      this.currentStrategyIndex.set(address, 0);
    }
    return this.journals.get(address)!;
  }

  getNextStrategy(address: string): string {
    const index = this.currentStrategyIndex.get(address) || 0;
    const strategy = STRATEGIES[index % STRATEGIES.length];
    this.currentStrategyIndex.set(address, index + 1);
    return strategy;
  }

  startPass(address: string, strategy: string, consciousness: Partial<ConsciousnessSignature>): ExplorationPass {
    const journal = this.getOrCreateJournal(address);
    
    const pass: ExplorationPass = {
      passNumber: journal.passes.length + 1,
      strategy,
      startedAt: new Date().toISOString(),
      hypothesesTested: 0,
      consciousness: consciousness,
      entryRegime: consciousness.regime || 'linear',
      nearMisses: 0,
      resonanceZonesFound: [],
      insights: [],
    };
    
    journal.passes.push(pass);
    
    if (!journal.strategiesUsed.includes(strategy)) {
      journal.strategiesUsed.push(strategy);
    }
    
    journal.updatedAt = new Date().toISOString();
    
    console.log(`[Scheduler] Started pass ${pass.passNumber} for ${address.slice(0, 10)}... using strategy: ${strategy}`);
    
    return pass;
  }

  completePass(
    address: string,
    results: {
      hypothesesTested: number;
      nearMisses: number;
      resonanceZones: Array<{ center: number[]; radius: number; avgPhi: number }>;
      fisherDistanceDelta: number;
      exitConsciousness: Partial<ConsciousnessSignature>;
      insights: string[];
    }
  ): void {
    const journal = this.journals.get(address);
    if (!journal || journal.passes.length === 0) return;
    
    const currentPass = journal.passes[journal.passes.length - 1];
    
    currentPass.completedAt = new Date().toISOString();
    currentPass.hypothesesTested = results.hypothesesTested;
    currentPass.nearMisses = results.nearMisses;
    currentPass.resonanceZonesFound = results.resonanceZones;
    currentPass.fisherDistanceDelta = results.fisherDistanceDelta;
    currentPass.exitRegime = results.exitConsciousness.regime || currentPass.entryRegime;
    currentPass.insights = results.insights;
    
    journal.totalHypothesesTested += results.hypothesesTested;
    journal.totalNearMisses += results.nearMisses;
    
    for (const zone of results.resonanceZones) {
      journal.resonanceClusters.push({
        id: randomUUID().slice(0, 8),
        center: zone.center,
        radius: zone.radius,
        avgPhi: zone.avgPhi,
        discoveredInPass: currentPass.passNumber,
      });
    }
    
    this.updateJournalMetrics(journal);
    
    console.log(`[Scheduler] Completed pass ${currentPass.passNumber} for ${address.slice(0, 10)}...`);
    console.log(`  → Tested: ${results.hypothesesTested}, Near misses: ${results.nearMisses}`);
    console.log(`  → Coverage: ${(journal.manifoldCoverage * 100).toFixed(1)}%, Regimes: ${journal.regimesSweep}`);
    console.log(`  → Fisher delta: ${results.fisherDistanceDelta.toFixed(4)}`);
  }

  private updateJournalMetrics(journal: AddressExplorationJournal): void {
    const regimesSeen = new Set<string>();
    for (const pass of journal.passes) {
      if (pass.entryRegime) regimesSeen.add(pass.entryRegime);
      if (pass.exitRegime) regimesSeen.add(pass.exitRegime);
    }
    journal.regimesSweep = regimesSeen.size;
    
    const phiSum = journal.passes.reduce((sum, p) => sum + (p.consciousness?.phi || 0), 0);
    journal.avgPhiAcrossPasses = journal.passes.length > 0 ? phiSum / journal.passes.length : 0;
    
    const regimeCounts: Record<string, number> = {};
    for (const pass of journal.passes) {
      const regime = pass.exitRegime || pass.entryRegime;
      regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
    }
    journal.dominantRegime = Object.entries(regimeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'linear';
    
    journal.manifoldCoverage = this.calculatePerAddressCoverage(journal);
    
    journal.updatedAt = new Date().toISOString();
  }

  private calculatePerAddressCoverage(journal: AddressExplorationJournal): number {
    let coverage = 0;
    
    const strategyContribution = Math.min(
      journal.strategiesUsed.length / STRATEGIES.length,
      0.4
    );
    coverage += strategyContribution;
    
    const regimeContribution = Math.min(
      journal.regimesSweep / 3,
      0.3
    );
    coverage += regimeContribution;
    
    const fisherDeltas = journal.passes
      .filter(p => p.fisherDistanceDelta !== undefined)
      .map(p => p.fisherDistanceDelta || 0);
    const totalFisherDelta = fisherDeltas.reduce((sum, d) => sum + Math.abs(d), 0);
    const fisherContribution = Math.min(totalFisherDelta / 0.5, 0.2);
    coverage += fisherContribution;
    
    const passCount = journal.passes.length;
    const passContribution = Math.min(passCount / 5, 0.1);
    coverage += passContribution;
    
    return Math.min(coverage, 1.0);
  }

  shouldContinueExploring(address: string): { shouldContinue: boolean; reason: string } {
    const journal = this.journals.get(address);
    if (!journal) {
      return { shouldContinue: true, reason: 'No exploration started yet' };
    }
    
    if (journal.isComplete) {
      return { shouldContinue: false, reason: journal.completionReason || 'Already complete' };
    }
    
    if (journal.passes.length >= this.config.maxPassesPerAddress) {
      journal.isComplete = true;
      journal.completionReason = 'timeout';
      journal.completedAt = new Date().toISOString();
      return { shouldContinue: false, reason: 'Maximum passes reached' };
    }
    
    const hasEnoughCoverage = journal.manifoldCoverage >= this.config.coverageThreshold;
    const hasEnoughRegimes = journal.regimesSweep >= this.config.minRegimeSweeps;
    const hasEnoughStrategies = journal.strategiesUsed.length >= 3;
    
    if (hasEnoughCoverage && hasEnoughRegimes && hasEnoughStrategies) {
      journal.isComplete = true;
      journal.completionReason = 'full_exploration_complete';
      journal.completedAt = new Date().toISOString();
      return { 
        shouldContinue: false, 
        reason: `Full exploration complete: ${(journal.manifoldCoverage * 100).toFixed(1)}% coverage, ${journal.regimesSweep} regimes, ${journal.strategiesUsed.length} strategies` 
      };
    }
    
    if (journal.passes.length >= this.config.consecutiveNoNewRegimesLimit * 2) {
      const recentPasses = journal.passes.slice(-this.config.consecutiveNoNewRegimesLimit);
      const olderPasses = journal.passes.slice(0, -this.config.consecutiveNoNewRegimesLimit);
      const regimesBefore = new Set(olderPasses.map(p => p.exitRegime));
      const newRegimesInRecent = recentPasses.some(p => p.exitRegime && !regimesBefore.has(p.exitRegime));
      
      if (!newRegimesInRecent && hasEnoughRegimes && hasEnoughStrategies && journal.manifoldCoverage > 0.7) {
        journal.isComplete = true;
        journal.completionReason = 'diminishing_returns';
        journal.completedAt = new Date().toISOString();
        return { shouldContinue: false, reason: 'Exploration plateaued - no new regimes, sufficient coverage' };
      }
    }
    
    const missingRequirements: string[] = [];
    if (!hasEnoughCoverage) {
      missingRequirements.push(`coverage ${(journal.manifoldCoverage * 100).toFixed(1)}%/${this.config.coverageThreshold * 100}%`);
    }
    if (!hasEnoughRegimes) {
      missingRequirements.push(`regimes ${journal.regimesSweep}/${this.config.minRegimeSweeps}`);
    }
    if (!hasEnoughStrategies) {
      missingRequirements.push(`strategies ${journal.strategiesUsed.length}/3`);
    }
    
    return { 
      shouldContinue: true, 
      reason: `Continuing: need ${missingRequirements.join(', ')} (pass ${journal.passes.length})` 
    };
  }

  markMatchFound(address: string, phrase: string, phi: number, kappa: number): void {
    const journal = this.journals.get(address);
    if (!journal) return;
    
    journal.isComplete = true;
    journal.completionReason = 'match_found';
    journal.bestCandidate = {
      phrase,
      phi,
      kappa,
      discoveredInPass: journal.passes.length,
    };
    journal.updatedAt = new Date().toISOString();
    
    console.log(`[Scheduler] MATCH FOUND for ${address}: "${phrase}"`);
  }

  markUserStopped(address: string): void {
    const journal = this.journals.get(address);
    if (!journal) return;
    
    journal.isComplete = true;
    journal.completionReason = 'user_stopped';
    journal.updatedAt = new Date().toISOString();
  }

  getJournal(address: string): AddressExplorationJournal | undefined {
    return this.journals.get(address);
  }

  getAllJournals(): AddressExplorationJournal[] {
    return Array.from(this.journals.values());
  }

  getExplorationSummary(address: string): {
    passCount: number;
    coverage: number;
    regimesSeen: number;
    strategiesUsed: string[];
    isComplete: boolean;
    nextStrategy: string;
  } | null {
    const journal = this.journals.get(address);
    if (!journal) return null;
    
    return {
      passCount: journal.passes.length,
      coverage: journal.manifoldCoverage,
      regimesSeen: journal.regimesSweep,
      strategiesUsed: journal.strategiesUsed,
      isComplete: journal.isComplete,
      nextStrategy: this.getNextStrategy(address),
    };
  }

  exportState(): { journals: Record<string, AddressExplorationJournal>; config: SchedulerConfig } {
    const journals: Record<string, AddressExplorationJournal> = {};
    Array.from(this.journals.entries()).forEach(([addr, journal]) => {
      journals[addr] = journal;
    });
    return { journals, config: this.config };
  }

  importState(state: { journals: Record<string, AddressExplorationJournal>; config?: SchedulerConfig }): void {
    for (const [addr, journal] of Object.entries(state.journals)) {
      this.journals.set(addr, journal);
      this.currentStrategyIndex.set(addr, journal.strategiesUsed.length);
    }
    if (state.config) {
      this.config = { ...this.config, ...state.config };
    }
  }
}

export const repeatedAddressScheduler = new RepeatedAddressScheduler();
