/**
 * Ocean Memory Manager
 * 
 * Sliding window memory with compression for efficient episode storage.
 * Implements recommendations from optnPR Part 5.2.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface OceanEpisode {
  id: string;
  timestamp: string;
  phi: number;
  kappa: number;
  regime: 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown';
  result: 'tested' | 'near_miss' | 'resonant' | 'match' | 'skip';
  strategy: string;
  phrasesTestedCount: number;
  nearMissCount: number;
  durationMs: number;
  notes?: string;
}

export interface CompressedEpisode {
  resultRegime: string;
  count: number;
  avgPhi: number;
  avgKappa: number;
  totalPhrasesTested: number;
  totalDurationMs: number;
  timestamp: string;
  strategies: string[];
}

export interface MemoryStatistics {
  recentEpisodes: number;
  compressedEpisodes: number;
  totalRepresented: number;
  memoryMB: number;
  oldestRecent: string | null;
  newestRecent: string | null;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'ocean-memory-state.json');

export class OceanMemoryManager {
  private readonly MAX_RECENT_EPISODES = 200;
  private readonly MAX_COMPRESSED_EPISODES = 500;
  
  private recentEpisodes: OceanEpisode[] = [];
  private compressedEpisodes: CompressedEpisode[] = [];
  private isDirty = false;
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly testMode: boolean;

  constructor(options?: { testMode?: boolean }) {
    this.testMode = options?.testMode ?? false;
    
    if (!this.testMode) {
      this.load();
      this.startAutoSave();
    }
  }

  addEpisode(episode: OceanEpisode): void {
    this.recentEpisodes.push(episode);
    this.isDirty = true;
    
    if (this.recentEpisodes.length > this.MAX_RECENT_EPISODES) {
      this.compress();
    }
  }

  createEpisode(data: {
    phi: number;
    kappa: number;
    regime: 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown';
    result: 'tested' | 'near_miss' | 'resonant' | 'match' | 'skip';
    strategy: string;
    phrasesTestedCount: number;
    nearMissCount: number;
    durationMs: number;
    notes?: string;
  }): OceanEpisode {
    return {
      id: `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...data,
    };
  }

  private compress(): void {
    const toCompress = this.recentEpisodes.splice(
      0,
      this.recentEpisodes.length - this.MAX_RECENT_EPISODES
    );
    
    if (toCompress.length === 0) return;

    const compressed = this.compressEpisodes(toCompress);
    this.compressedEpisodes.push(...compressed);

    if (this.compressedEpisodes.length > this.MAX_COMPRESSED_EPISODES) {
      this.compressedEpisodes = this.compressedEpisodes.slice(-this.MAX_COMPRESSED_EPISODES);
    }

    console.log(`[OceanMemory] Compressed ${toCompress.length} episodes into ${compressed.length} summaries`);
    console.log(`[OceanMemory] Memory: ${this.recentEpisodes.length} recent, ${this.compressedEpisodes.length} compressed`);
  }

  private compressEpisodes(episodes: OceanEpisode[]): CompressedEpisode[] {
    const byResultRegime = new Map<string, OceanEpisode[]>();

    for (const ep of episodes) {
      const key = `${ep.result}_${ep.regime}`;
      if (!byResultRegime.has(key)) {
        byResultRegime.set(key, []);
      }
      byResultRegime.get(key)!.push(ep);
    }

    const compressed: CompressedEpisode[] = [];

    const entries = Array.from(byResultRegime.entries());
    for (const [key, group] of entries) {
      const avgPhi = group.reduce((sum: number, ep: OceanEpisode) => sum + ep.phi, 0) / group.length;
      const avgKappa = group.reduce((sum: number, ep: OceanEpisode) => sum + ep.kappa, 0) / group.length;
      const totalPhrasesTested = group.reduce((sum: number, ep: OceanEpisode) => sum + ep.phrasesTestedCount, 0);
      const totalDurationMs = group.reduce((sum: number, ep: OceanEpisode) => sum + ep.durationMs, 0);
      const strategies = Array.from(new Set(group.map((ep: OceanEpisode) => ep.strategy)));

      compressed.push({
        resultRegime: key,
        count: group.length,
        avgPhi,
        avgKappa,
        totalPhrasesTested,
        totalDurationMs,
        timestamp: group[0].timestamp,
        strategies,
      });
    }

    return compressed;
  }

  getRecentEpisodes(): OceanEpisode[] {
    return [...this.recentEpisodes];
  }

  getCompressedEpisodes(): CompressedEpisode[] {
    return [...this.compressedEpisodes];
  }

  getStatistics(): MemoryStatistics {
    const totalRepresented = this.recentEpisodes.length +
      this.compressedEpisodes.reduce((sum, c) => sum + c.count, 0);

    const memoryMB = (
      JSON.stringify(this.recentEpisodes).length +
      JSON.stringify(this.compressedEpisodes).length
    ) / 1024 / 1024;

    return {
      recentEpisodes: this.recentEpisodes.length,
      compressedEpisodes: this.compressedEpisodes.length,
      totalRepresented,
      memoryMB,
      oldestRecent: this.recentEpisodes[0]?.timestamp || null,
      newestRecent: this.recentEpisodes[this.recentEpisodes.length - 1]?.timestamp || null,
    };
  }

  queryRecentByResult(result: OceanEpisode['result']): OceanEpisode[] {
    return this.recentEpisodes.filter(ep => ep.result === result);
  }

  queryRecentByRegime(regime: OceanEpisode['regime']): OceanEpisode[] {
    return this.recentEpisodes.filter(ep => ep.regime === regime);
  }

  getAveragePhiByStrategy(): Map<string, { avgPhi: number; count: number }> {
    const byStrategy = new Map<string, { sum: number; count: number }>();

    for (const ep of this.recentEpisodes) {
      const stats = byStrategy.get(ep.strategy) || { sum: 0, count: 0 };
      stats.sum += ep.phi;
      stats.count++;
      byStrategy.set(ep.strategy, stats);
    }

    const result = new Map<string, { avgPhi: number; count: number }>();
    const entries = Array.from(byStrategy.entries());
    for (const [strategy, stats] of entries) {
      result.set(strategy, {
        avgPhi: stats.sum / stats.count,
        count: stats.count,
      });
    }

    return result;
  }

  getSuccessRateByStrategy(): Map<string, number> {
    const byStrategy = new Map<string, { nearMiss: number; total: number }>();

    for (const ep of this.recentEpisodes) {
      const stats = byStrategy.get(ep.strategy) || { nearMiss: 0, total: 0 };
      if (ep.result === 'near_miss' || ep.result === 'resonant' || ep.result === 'match') {
        stats.nearMiss++;
      }
      stats.total++;
      byStrategy.set(ep.strategy, stats);
    }

    const result = new Map<string, number>();
    const strategyEntries = Array.from(byStrategy.entries());
    for (const [strategy, stats] of strategyEntries) {
      result.set(strategy, stats.total > 0 ? stats.nearMiss / stats.total : 0);
    }

    return result;
  }

  private startAutoSave(): void {
    this.saveTimer = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, 60000);
  }

  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const state = {
        recentEpisodes: this.recentEpisodes,
        compressedEpisodes: this.compressedEpisodes,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(MEMORY_FILE, JSON.stringify(state, null, 2));
      this.isDirty = false;
      console.log(`[OceanMemory] Saved ${this.recentEpisodes.length} recent + ${this.compressedEpisodes.length} compressed episodes`);
    } catch (error) {
      console.error('[OceanMemory] Save failed:', error);
    }
  }

  private load(): void {
    try {
      if (!fs.existsSync(MEMORY_FILE)) {
        console.log('[OceanMemory] No saved state found, starting fresh');
        return;
      }

      const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
      this.recentEpisodes = data.recentEpisodes || [];
      this.compressedEpisodes = data.compressedEpisodes || [];

      console.log(`[OceanMemory] Loaded ${this.recentEpisodes.length} recent + ${this.compressedEpisodes.length} compressed episodes`);
    } catch (error) {
      console.error('[OceanMemory] Load failed:', error);
      this.recentEpisodes = [];
      this.compressedEpisodes = [];
    }
  }

  forceSave(): void {
    this.save();
  }

  clear(): void {
    this.recentEpisodes = [];
    this.compressedEpisodes = [];
    this.isDirty = true;
    console.log('[OceanMemory] Memory cleared');
  }
}

export const oceanMemoryManager = new OceanMemoryManager();
