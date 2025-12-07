/**
 * Near-Miss Manager
 * 
 * Tiered classification and intelligent management of near-miss discoveries.
 * Near-misses are high-Φ candidates that didn't match but indicate promising areas.
 * 
 * TIER SYSTEM:
 * - HOT (Φ > 0.92): Immediate intensive exploration
 * - WARM (Φ > 0.85): Priority queue for next batch
 * - COOL (Φ > 0.80): Standard near-miss handling
 * 
 * Features:
 * - Tiered classification with different handling strategies
 * - Temporal decay with recency weighting
 * - Pattern clustering by structure/semantics
 * - Cross-session persistence
 */

import * as fs from 'fs';
import * as path from 'path';

export type NearMissTier = 'hot' | 'warm' | 'cool';

export interface NearMissEntry {
  id: string;
  phrase: string;
  phi: number;
  kappa: number;
  regime: string;
  tier: NearMissTier;
  discoveredAt: string;
  lastAccessedAt: string;
  explorationCount: number;
  source: string;
  clusterId?: string;
  structuralSignature?: StructuralSignature;
}

export interface StructuralSignature {
  wordCount: number;
  avgWordLength: number;
  charCount: number;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  startsWithCapital: boolean;
  entropyEstimate: number;
}

export interface NearMissCluster {
  id: string;
  centroidPhrase: string;
  centroidPhi: number;
  memberCount: number;
  avgPhi: number;
  maxPhi: number;
  commonWords: string[];
  structuralPattern: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface NearMissStats {
  total: number;
  hot: number;
  warm: number;
  cool: number;
  clusters: number;
  avgPhi: number;
  maxPhi: number;
  recentDiscoveries: number;
  staleCount: number;
}

export interface TieredNearMissConfig {
  hotThreshold: number;
  warmThreshold: number;
  coolThreshold: number;
  decayRatePerHour: number;
  maxEntries: number;
  maxClusters: number;
  clusterSimilarityThreshold: number;
  staleThresholdHours: number;
}

const DEFAULT_CONFIG: TieredNearMissConfig = {
  hotThreshold: 0.92,
  warmThreshold: 0.85,
  coolThreshold: 0.80,
  decayRatePerHour: 0.02,
  maxEntries: 1000,
  maxClusters: 50,
  clusterSimilarityThreshold: 0.6,
  staleThresholdHours: 24,
};

const DATA_DIR = path.join(process.cwd(), 'data');
const NEAR_MISS_FILE = path.join(DATA_DIR, 'near-miss-state.json');

export class NearMissManager {
  private entries: Map<string, NearMissEntry> = new Map();
  private clusters: Map<string, NearMissCluster> = new Map();
  private config: TieredNearMissConfig;
  private isDirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<TieredNearMissConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.load();
    this.startAutoSave();
  }

  /**
   * Classify a phi value into a tier
   */
  classifyTier(phi: number): NearMissTier | null {
    if (phi > this.config.hotThreshold) return 'hot';
    if (phi > this.config.warmThreshold) return 'warm';
    if (phi > this.config.coolThreshold) return 'cool';
    return null;
  }

  /**
   * Add a new near-miss entry with automatic tiering
   */
  addNearMiss(data: {
    phrase: string;
    phi: number;
    kappa: number;
    regime: string;
    source: string;
  }): NearMissEntry | null {
    const tier = this.classifyTier(data.phi);
    if (!tier) return null;

    const id = this.generateId(data.phrase);
    const existing = this.entries.get(id);

    if (existing) {
      if (data.phi > existing.phi) {
        existing.phi = data.phi;
        existing.tier = tier;
        existing.lastAccessedAt = new Date().toISOString();
        existing.explorationCount++;
        this.isDirty = true;
        console.log(`[NearMiss] 📈 Upgraded: "${data.phrase.slice(0, 30)}..." → ${tier.toUpperCase()} (Φ=${data.phi.toFixed(3)})`);
      }
      return existing;
    }

    const entry: NearMissEntry = {
      id,
      phrase: data.phrase,
      phi: data.phi,
      kappa: data.kappa,
      regime: data.regime,
      tier,
      discoveredAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      explorationCount: 1,
      source: data.source,
      structuralSignature: this.computeStructuralSignature(data.phrase),
    };

    this.entries.set(id, entry);
    this.isDirty = true;

    this.assignToCluster(entry);
    this.enforceLimit();

    console.log(`[NearMiss] 🎯 ${tier.toUpperCase()}: "${data.phrase.slice(0, 30)}..." (Φ=${data.phi.toFixed(3)})`);

    return entry;
  }

  /**
   * Get entries by tier with optional recency weighting
   */
  getByTier(tier: NearMissTier, limit?: number): NearMissEntry[] {
    const entries = Array.from(this.entries.values())
      .filter(e => e.tier === tier)
      .sort((a, b) => {
        const scoreA = this.computeRecencyScore(a);
        const scoreB = this.computeRecencyScore(b);
        return scoreB - scoreA;
      });

    return limit ? entries.slice(0, limit) : entries;
  }

  /**
   * Get all hot entries for immediate exploration
   */
  getHotEntries(limit = 10): NearMissEntry[] {
    return this.getByTier('hot', limit);
  }

  /**
   * Get warm entries for priority queuing
   */
  getWarmEntries(limit = 25): NearMissEntry[] {
    return this.getByTier('warm', limit);
  }

  /**
   * Get cool entries for background processing
   */
  getCoolEntries(limit = 50): NearMissEntry[] {
    return this.getByTier('cool', limit);
  }

  /**
   * Get entries prioritized by recency-weighted score
   */
  getPrioritizedEntries(limit = 20): NearMissEntry[] {
    return Array.from(this.entries.values())
      .map(e => ({
        entry: e,
        score: this.computeRecencyScore(e),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.entry);
  }

  /**
   * Compute recency-weighted score for prioritization
   */
  private computeRecencyScore(entry: NearMissEntry): number {
    const now = Date.now();
    const discoveredAt = new Date(entry.discoveredAt).getTime();
    const hoursAgo = (now - discoveredAt) / (1000 * 60 * 60);

    const tierWeight = entry.tier === 'hot' ? 1.5 : entry.tier === 'warm' ? 1.2 : 1.0;
    const decay = Math.exp(-this.config.decayRatePerHour * hoursAgo);
    const explorationPenalty = 1 / (1 + entry.explorationCount * 0.1);

    return entry.phi * tierWeight * decay * explorationPenalty;
  }

  /**
   * Apply temporal decay to all entries
   */
  applyDecay(): { promoted: number; demoted: number; expired: number } {
    let promoted = 0;
    let demoted = 0;
    let expired = 0;
    const toRemove: string[] = [];

    for (const [id, entry] of this.entries) {
      const score = this.computeRecencyScore(entry);
      const effectivePhi = entry.phi * score / entry.phi;

      const newTier = this.classifyTier(effectivePhi);

      if (!newTier) {
        toRemove.push(id);
        expired++;
      } else if (newTier !== entry.tier) {
        const tierRank = { hot: 3, warm: 2, cool: 1 };
        if (tierRank[newTier] > tierRank[entry.tier]) {
          promoted++;
        } else {
          demoted++;
        }
        entry.tier = newTier;
        this.isDirty = true;
      }
    }

    for (const id of toRemove) {
      this.entries.delete(id);
    }

    if (toRemove.length > 0) {
      this.isDirty = true;
    }

    return { promoted, demoted, expired };
  }

  /**
   * Get clusters sorted by average phi
   */
  getClusters(): NearMissCluster[] {
    return Array.from(this.clusters.values())
      .sort((a, b) => b.avgPhi - a.avgPhi);
  }

  /**
   * Get entries belonging to a cluster
   */
  getClusterMembers(clusterId: string): NearMissEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.clusterId === clusterId)
      .sort((a, b) => b.phi - a.phi);
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): NearMissStats {
    const entries = Array.from(this.entries.values());
    const now = Date.now();
    const staleThreshold = this.config.staleThresholdHours * 60 * 60 * 1000;

    let hot = 0, warm = 0, cool = 0, totalPhi = 0, maxPhi = 0, recentCount = 0, staleCount = 0;

    for (const entry of entries) {
      if (entry.tier === 'hot') hot++;
      else if (entry.tier === 'warm') warm++;
      else cool++;

      totalPhi += entry.phi;
      if (entry.phi > maxPhi) maxPhi = entry.phi;

      const discoveredAt = new Date(entry.discoveredAt).getTime();
      if (now - discoveredAt < 60 * 60 * 1000) recentCount++;
      if (now - discoveredAt > staleThreshold) staleCount++;
    }

    return {
      total: entries.length,
      hot,
      warm,
      cool,
      clusters: this.clusters.size,
      avgPhi: entries.length > 0 ? totalPhi / entries.length : 0,
      maxPhi,
      recentDiscoveries: recentCount,
      staleCount,
    };
  }

  /**
   * Mark an entry as accessed (for recency tracking)
   */
  markAccessed(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.lastAccessedAt = new Date().toISOString();
      entry.explorationCount++;
      this.isDirty = true;
    }
  }

  /**
   * Remove an entry (e.g., after successful match)
   */
  remove(id: string): boolean {
    const deleted = this.entries.delete(id);
    if (deleted) {
      this.isDirty = true;
      this.rebuildClusters();
    }
    return deleted;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.clusters.clear();
    this.isDirty = true;
  }

  /**
   * Generate a deterministic ID for a phrase
   */
  private generateId(phrase: string): string {
    const normalized = phrase.toLowerCase().trim().replace(/\s+/g, ' ');
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `nm_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Compute structural signature for clustering
   */
  private computeStructuralSignature(phrase: string): StructuralSignature {
    const words = phrase.trim().split(/\s+/);
    const chars = phrase.replace(/\s/g, '');

    const charCounts = new Map<string, number>();
    for (const c of chars.toLowerCase()) {
      charCounts.set(c, (charCounts.get(c) || 0) + 1);
    }

    let entropy = 0;
    const total = chars.length;
    for (const count of charCounts.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return {
      wordCount: words.length,
      avgWordLength: words.reduce((s, w) => s + w.length, 0) / words.length,
      charCount: phrase.length,
      hasNumbers: /\d/.test(phrase),
      hasSpecialChars: /[^a-zA-Z0-9\s]/.test(phrase),
      startsWithCapital: /^[A-Z]/.test(phrase),
      entropyEstimate: entropy,
    };
  }

  /**
   * Compute similarity between two structural signatures
   */
  private computeStructuralSimilarity(a: StructuralSignature, b: StructuralSignature): number {
    let similarity = 0;
    let weights = 0;

    if (a.wordCount === b.wordCount) { similarity += 0.25; weights += 0.25; }
    else { weights += 0.25; }

    const avgLenDiff = Math.abs(a.avgWordLength - b.avgWordLength);
    similarity += 0.2 * Math.max(0, 1 - avgLenDiff / 5);
    weights += 0.2;

    if (a.hasNumbers === b.hasNumbers) { similarity += 0.15; weights += 0.15; }
    else { weights += 0.15; }

    if (a.hasSpecialChars === b.hasSpecialChars) { similarity += 0.15; weights += 0.15; }
    else { weights += 0.15; }

    const entropyDiff = Math.abs(a.entropyEstimate - b.entropyEstimate);
    similarity += 0.25 * Math.max(0, 1 - entropyDiff / 2);
    weights += 0.25;

    return similarity / weights;
  }

  /**
   * Extract common words between phrases
   */
  private extractCommonWords(phrases: string[]): string[] {
    if (phrases.length === 0) return [];

    const wordCounts = new Map<string, number>();
    for (const phrase of phrases) {
      const words = new Set(phrase.toLowerCase().split(/\s+/));
      for (const word of words) {
        if (word.length > 2) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }

    const threshold = Math.max(2, Math.floor(phrases.length * 0.3));
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Assign an entry to the most suitable cluster
   */
  private assignToCluster(entry: NearMissEntry): void {
    if (!entry.structuralSignature) return;

    let bestCluster: NearMissCluster | null = null;
    let bestSimilarity = 0;

    for (const cluster of this.clusters.values()) {
      const members = this.getClusterMembers(cluster.id);
      if (members.length === 0) continue;

      const representative = members[0];
      if (!representative.structuralSignature) continue;

      const similarity = this.computeStructuralSimilarity(
        entry.structuralSignature,
        representative.structuralSignature
      );

      if (similarity > bestSimilarity && similarity >= this.config.clusterSimilarityThreshold) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      entry.clusterId = bestCluster.id;
      this.updateClusterStats(bestCluster.id);
    } else if (this.clusters.size < this.config.maxClusters) {
      const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const cluster: NearMissCluster = {
        id: clusterId,
        centroidPhrase: entry.phrase,
        centroidPhi: entry.phi,
        memberCount: 1,
        avgPhi: entry.phi,
        maxPhi: entry.phi,
        commonWords: entry.phrase.toLowerCase().split(/\s+/).filter(w => w.length > 2),
        structuralPattern: this.describeStructure(entry.structuralSignature),
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };
      this.clusters.set(clusterId, cluster);
      entry.clusterId = clusterId;
    }
  }

  /**
   * Update cluster statistics
   */
  private updateClusterStats(clusterId: string): void {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;

    const members = this.getClusterMembers(clusterId);
    if (members.length === 0) {
      this.clusters.delete(clusterId);
      return;
    }

    let totalPhi = 0, maxPhi = 0;
    const phrases: string[] = [];

    for (const member of members) {
      totalPhi += member.phi;
      if (member.phi > maxPhi) {
        maxPhi = member.phi;
        cluster.centroidPhrase = member.phrase;
        cluster.centroidPhi = member.phi;
      }
      phrases.push(member.phrase);
    }

    cluster.memberCount = members.length;
    cluster.avgPhi = totalPhi / members.length;
    cluster.maxPhi = maxPhi;
    cluster.commonWords = this.extractCommonWords(phrases);
    cluster.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Rebuild all clusters from scratch
   */
  private rebuildClusters(): void {
    this.clusters.clear();
    for (const entry of this.entries.values()) {
      entry.clusterId = undefined;
    }
    for (const entry of this.entries.values()) {
      this.assignToCluster(entry);
    }
  }

  /**
   * Describe structural pattern in human-readable form
   */
  private describeStructure(sig: StructuralSignature): string {
    const parts: string[] = [];
    parts.push(`${sig.wordCount}-word`);

    if (sig.hasNumbers) parts.push('with-numbers');
    if (sig.hasSpecialChars) parts.push('with-special');
    if (sig.startsWithCapital) parts.push('capitalized');

    if (sig.entropyEstimate < 3) parts.push('low-entropy');
    else if (sig.entropyEstimate > 4) parts.push('high-entropy');

    return parts.join(' ');
  }

  /**
   * Enforce maximum entry limit
   */
  private enforceLimit(): void {
    if (this.entries.size <= this.config.maxEntries) return;

    const sorted = Array.from(this.entries.values())
      .map(e => ({ id: e.id, score: this.computeRecencyScore(e) }))
      .sort((a, b) => a.score - b.score);

    const toRemove = sorted.slice(0, this.entries.size - this.config.maxEntries);
    for (const { id } of toRemove) {
      this.entries.delete(id);
    }

    this.isDirty = true;
    console.log(`[NearMiss] Pruned ${toRemove.length} low-priority entries`);
  }

  /**
   * Load state from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(NEAR_MISS_FILE)) {
        const data = JSON.parse(fs.readFileSync(NEAR_MISS_FILE, 'utf-8'));

        if (data.entries) {
          for (const entry of data.entries) {
            this.entries.set(entry.id, entry);
          }
        }

        if (data.clusters) {
          for (const cluster of data.clusters) {
            this.clusters.set(cluster.id, cluster);
          }
        }

        console.log(`[NearMiss] Loaded ${this.entries.size} entries, ${this.clusters.size} clusters`);
      }
    } catch (error) {
      console.error('[NearMiss] Failed to load state:', error);
    }
  }

  /**
   * Save state to disk
   */
  private save(): void {
    if (!this.isDirty) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const data = {
        savedAt: new Date().toISOString(),
        entries: Array.from(this.entries.values()),
        clusters: Array.from(this.clusters.values()),
      };

      fs.writeFileSync(NEAR_MISS_FILE, JSON.stringify(data, null, 2));
      this.isDirty = false;
    } catch (error) {
      console.error('[NearMiss] Failed to save state:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.saveTimer = setInterval(() => this.save(), 30000);
  }

  /**
   * Cleanup resources
   */
  shutdown(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    this.save();
  }
}

export const nearMissManager = new NearMissManager();
