/**
 * Near-Miss Manager - ADAPTIVE VERSION
 * 
 * Tiered classification and intelligent management of near-miss discoveries.
 * Near-misses are high-Φ candidates that didn't match but indicate promising areas.
 * 
 * ADAPTIVE TIER SYSTEM (NO STATIC CAPS):
 * - HOT: Top 10% of rolling Φ distribution (immediate intensive exploration)
 * - WARM: Top 25% of rolling Φ distribution (priority queue for next batch)
 * - COOL: Top 50% of rolling Φ distribution (standard near-miss handling)
 * - ALL entries above minimum threshold are kept (no artificial caps)
 * 
 * Features:
 * - Adaptive percentile-based thresholds using rolling Φ distribution
 * - Temporal decay with recency weighting
 * - Pattern clustering by structure/semantics (unlimited clusters)
 * - Cross-session persistence via oceanPersistence
 * - Φ feedback loop with automatic tier escalation
 * - Tier-weighted balance queue priority
 */

import * as fs from 'fs';
import * as path from 'path';
import { NEAR_MISS_CONFIG } from './ocean-config';
import { oceanPersistence } from './ocean/ocean-persistence';

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
  phiHistory?: number[];
  isEscalating?: boolean;
  queuePriority?: number;
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
  ageHours?: number;
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
  adaptiveThresholds: {
    hot: number;
    warm: number;
    cool: number;
    distributionSize: number;
  };
  escalatingCount: number;
}

export interface AdaptiveThresholds {
  hot: number;
  warm: number;
  cool: number;
  distributionSize: number;
  lastComputed: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const NEAR_MISS_FILE = path.join(DATA_DIR, 'near-miss-state.json');

export class NearMissManager {
  private entries: Map<string, NearMissEntry> = new Map();
  private clusters: Map<string, NearMissCluster> = new Map();
  private isDirty = false;
  private saveTimer: NodeJS.Timeout | null = null;
  
  private rollingPhiDistribution: number[] = [];
  private adaptiveThresholds: AdaptiveThresholds;

  constructor() {
    this.adaptiveThresholds = {
      hot: NEAR_MISS_CONFIG.FALLBACK_HOT_THRESHOLD,
      warm: NEAR_MISS_CONFIG.FALLBACK_WARM_THRESHOLD,
      cool: NEAR_MISS_CONFIG.FALLBACK_COOL_THRESHOLD,
      distributionSize: 0,
      lastComputed: new Date().toISOString(),
    };
    this.load();
    this.startAutoSave();
    this.recomputeAdaptiveThresholds();
  }

  /**
   * Add a Φ value to the rolling distribution for adaptive threshold computation
   */
  recordPhiObservation(phi: number): void {
    if (phi > 0 && phi <= 1) {
      this.rollingPhiDistribution.push(phi);
      if (this.rollingPhiDistribution.length > NEAR_MISS_CONFIG.DISTRIBUTION_WINDOW_SIZE) {
        this.rollingPhiDistribution.shift();
      }
      if (this.rollingPhiDistribution.length % 100 === 0) {
        this.recomputeAdaptiveThresholds();
      }
    }
  }

  /**
   * Recompute adaptive thresholds from rolling Φ distribution
   */
  recomputeAdaptiveThresholds(): void {
    if (this.rollingPhiDistribution.length < 10) {
      return;
    }

    const sorted = [...this.rollingPhiDistribution].sort((a, b) => b - a);
    const len = sorted.length;

    const hotIdx = Math.floor(len * (1 - NEAR_MISS_CONFIG.BASE_HOT_PERCENTILE / 100));
    const warmIdx = Math.floor(len * (1 - NEAR_MISS_CONFIG.BASE_WARM_PERCENTILE / 100));
    const coolIdx = Math.floor(len * (1 - NEAR_MISS_CONFIG.BASE_COOL_PERCENTILE / 100));

    this.adaptiveThresholds = {
      hot: sorted[hotIdx] || NEAR_MISS_CONFIG.FALLBACK_HOT_THRESHOLD,
      warm: sorted[warmIdx] || NEAR_MISS_CONFIG.FALLBACK_WARM_THRESHOLD,
      cool: sorted[coolIdx] || NEAR_MISS_CONFIG.FALLBACK_COOL_THRESHOLD,
      distributionSize: len,
      lastComputed: new Date().toISOString(),
    };

    console.log(`[NearMiss] Adaptive thresholds updated: HOT≥${this.adaptiveThresholds.hot.toFixed(3)} WARM≥${this.adaptiveThresholds.warm.toFixed(3)} COOL≥${this.adaptiveThresholds.cool.toFixed(3)} (n=${len})`);
  }

  /**
   * Get current adaptive thresholds
   */
  getAdaptiveThresholds(): AdaptiveThresholds {
    return { ...this.adaptiveThresholds };
  }

  /**
   * Classify a phi value into a tier using adaptive thresholds
   * Returns tier for ANY positive Φ (no minimum cutoff)
   */
  classifyTier(phi: number): NearMissTier {
    if (phi >= this.adaptiveThresholds.hot) return 'hot';
    if (phi >= this.adaptiveThresholds.warm) return 'warm';
    return 'cool';
  }

  /**
   * Compute tier-weighted priority for balance queue
   */
  computeQueuePriority(entry: NearMissEntry): number {
    const tierBase = entry.tier === 'hot' ? 10 : entry.tier === 'warm' ? 5 : 1;
    const phiBoost = entry.phi * 10;
    const escalationBoost = entry.isEscalating && NEAR_MISS_CONFIG.ESCALATION_ENABLED 
      ? NEAR_MISS_CONFIG.ESCALATION_BOOST 
      : 1;
    const recencyBoost = this.computeRecencyFactor(entry);
    
    return Math.round((tierBase + phiBoost) * escalationBoost * recencyBoost);
  }

  /**
   * Compute recency factor (1.0 for fresh, decays over time)
   */
  private computeRecencyFactor(entry: NearMissEntry): number {
    const now = Date.now();
    const discoveredAt = new Date(entry.discoveredAt).getTime();
    const hoursAgo = (now - discoveredAt) / (1000 * 60 * 60);
    return Math.exp(-NEAR_MISS_CONFIG.DECAY_RATE_PER_HOUR * hoursAgo);
  }

  /**
   * Add a new near-miss entry with automatic tiering and feedback loop
   */
  addNearMiss(data: {
    phrase: string;
    phi: number;
    kappa: number;
    regime: string;
    source: string;
  }): NearMissEntry | null {
    if (!data.phrase || data.phi <= 0) return null;

    this.recordPhiObservation(data.phi);
    
    const tier = this.classifyTier(data.phi);
    const id = this.generateId(data.phrase);
    const existing = this.entries.get(id);

    if (existing) {
      const isEscalating = data.phi > existing.phi;
      existing.phiHistory = existing.phiHistory || [];
      existing.phiHistory.push(data.phi);
      if (existing.phiHistory.length > 20) existing.phiHistory.shift();

      if (isEscalating || data.phi >= existing.phi) {
        existing.phi = Math.max(existing.phi, data.phi);
        existing.tier = this.classifyTier(existing.phi);
        existing.isEscalating = isEscalating;
        existing.lastAccessedAt = new Date().toISOString();
        existing.explorationCount++;
        existing.queuePriority = this.computeQueuePriority(existing);
        this.isDirty = true;
        
        if (isEscalating) {
          console.log(`[NearMiss] 📈 ESCALATING: "${data.phrase.slice(0, 30)}..." → ${existing.tier.toUpperCase()} (Φ=${data.phi.toFixed(4)} ↑)`);
        }
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
      phiHistory: [data.phi],
      isEscalating: false,
      queuePriority: 1,
    };
    
    entry.queuePriority = this.computeQueuePriority(entry);
    this.entries.set(id, entry);
    this.isDirty = true;

    this.assignToCluster(entry);

    console.log(`[NearMiss] 🎯 ${tier.toUpperCase()}: "${data.phrase.slice(0, 30)}..." (Φ=${data.phi.toFixed(4)}, priority=${entry.queuePriority})`);

    return entry;
  }

  /**
   * Get entries by tier with recency weighting
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
  getHotEntries(limit?: number): NearMissEntry[] {
    return this.getByTier('hot', limit);
  }

  /**
   * Get warm entries for priority queuing
   */
  getWarmEntries(limit?: number): NearMissEntry[] {
    return this.getByTier('warm', limit);
  }

  /**
   * Get cool entries for background processing
   */
  getCoolEntries(limit?: number): NearMissEntry[] {
    return this.getByTier('cool', limit);
  }

  /**
   * Get all escalating entries (Φ is rising)
   */
  getEscalatingEntries(): NearMissEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.isEscalating)
      .sort((a, b) => b.phi - a.phi);
  }

  /**
   * Get entries prioritized by recency-weighted score
   */
  getPrioritizedEntries(limit?: number): NearMissEntry[] {
    const all = Array.from(this.entries.values())
      .map(e => ({
        entry: e,
        score: this.computeRecencyScore(e),
      }))
      .sort((a, b) => b.score - a.score);
    
    return limit ? all.slice(0, limit).map(x => x.entry) : all.map(x => x.entry);
  }

  /**
   * Compute recency-weighted score for prioritization
   */
  private computeRecencyScore(entry: NearMissEntry): number {
    const tierWeight = entry.tier === 'hot' ? 2.0 : entry.tier === 'warm' ? 1.5 : 1.0;
    const decay = this.computeRecencyFactor(entry);
    const explorationPenalty = 1 / (1 + entry.explorationCount * 0.05);
    const escalationBoost = entry.isEscalating ? NEAR_MISS_CONFIG.ESCALATION_BOOST : 1.0;

    return entry.phi * tierWeight * decay * explorationPenalty * escalationBoost;
  }

  /**
   * Apply temporal decay and re-tier all entries
   */
  applyDecay(): { promoted: number; demoted: number; escalating: number } {
    let promoted = 0;
    let demoted = 0;
    let escalating = 0;

    for (const entry of this.entries.values()) {
      const oldTier = entry.tier;
      entry.tier = this.classifyTier(entry.phi);
      entry.queuePriority = this.computeQueuePriority(entry);
      
      if (entry.isEscalating) escalating++;

      const tierRank = { hot: 3, warm: 2, cool: 1 };
      if (tierRank[entry.tier] > tierRank[oldTier]) {
        promoted++;
        this.isDirty = true;
      } else if (tierRank[entry.tier] < tierRank[oldTier]) {
        demoted++;
        this.isDirty = true;
      }
    }

    return { promoted, demoted, escalating };
  }

  /**
   * Get clusters sorted by average phi
   */
  getClusters(): NearMissCluster[] {
    const now = Date.now();
    return Array.from(this.clusters.values())
      .map(c => ({
        ...c,
        ageHours: (now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60),
      }))
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
    const staleThreshold = NEAR_MISS_CONFIG.STALE_THRESHOLD_HOURS * 60 * 60 * 1000;

    let hot = 0, warm = 0, cool = 0, totalPhi = 0, maxPhi = 0, recentCount = 0, staleCount = 0, escalatingCount = 0;

    for (const entry of entries) {
      if (entry.tier === 'hot') hot++;
      else if (entry.tier === 'warm') warm++;
      else cool++;

      totalPhi += entry.phi;
      if (entry.phi > maxPhi) maxPhi = entry.phi;

      const discoveredAt = new Date(entry.discoveredAt).getTime();
      if (now - discoveredAt < 60 * 60 * 1000) recentCount++;
      if (now - discoveredAt > staleThreshold) staleCount++;
      if (entry.isEscalating) escalatingCount++;
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
      adaptiveThresholds: {
        hot: this.adaptiveThresholds.hot,
        warm: this.adaptiveThresholds.warm,
        cool: this.adaptiveThresholds.cool,
        distributionSize: this.adaptiveThresholds.distributionSize,
      },
      escalatingCount,
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
      entry.queuePriority = this.computeQueuePriority(entry);
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
    this.rollingPhiDistribution = [];
    this.isDirty = true;
  }

  /**
   * Get all entries as array
   */
  getAllEntries(): NearMissEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get Φ trajectory for an entry (for UI visualization)
   */
  getPhiTrajectory(id: string): number[] {
    const entry = this.entries.get(id);
    return entry?.phiHistory || [];
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
   * Assign an entry to the most suitable cluster (no limit on clusters)
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

      if (similarity > bestSimilarity && similarity >= NEAR_MISS_CONFIG.CLUSTER_SIMILARITY_THRESHOLD) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      entry.clusterId = bestCluster.id;
      this.updateClusterStats(bestCluster.id);
    } else {
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
   * Load state from PostgreSQL first, fall back to JSON
   */
  private load(): void {
    this.loadAsync().catch(err => {
      console.error('[NearMiss] Async load failed:', err);
    });
  }

  /**
   * Async load implementation - PostgreSQL first, JSON fallback
   */
  private async loadAsync(): Promise<void> {
    try {
      if (oceanPersistence.isPersistenceAvailable()) {
        const loadedFromDb = await this.loadFromPostgres();
        if (loadedFromDb) {
          console.log(`[NearMiss] Loaded from PostgreSQL: ${this.entries.size} entries, ${this.clusters.size} clusters`);
          this.recomputeAdaptiveThresholds();
          this.applyDecay();
          return;
        }
      }
      
      this.loadFromJson();
      this.recomputeAdaptiveThresholds();
      this.applyDecay();
    } catch (error) {
      console.error('[NearMiss] Failed to load state:', error);
      this.loadFromJson();
    }
  }

  /**
   * Load state from PostgreSQL
   */
  private async loadFromPostgres(): Promise<boolean> {
    try {
      const [entries, clusters, adaptiveState] = await Promise.all([
        oceanPersistence.getAllNearMissEntries(),
        oceanPersistence.getAllNearMissClusters(),
        oceanPersistence.loadNearMissAdaptiveState(),
      ]);

      if (entries.length === 0 && clusters.length === 0 && !adaptiveState) {
        console.log('[NearMiss] No data in PostgreSQL, will try JSON fallback');
        return false;
      }

      for (const record of entries) {
        const entry: NearMissEntry = {
          id: record.id,
          phrase: record.phrase,
          phi: record.phi,
          kappa: record.kappa,
          regime: record.regime,
          tier: record.tier as NearMissTier,
          discoveredAt: record.discoveredAt.toISOString(),
          lastAccessedAt: record.lastAccessedAt.toISOString(),
          explorationCount: record.explorationCount ?? 1,
          source: record.source ?? 'unknown',
          clusterId: record.clusterId ?? undefined,
          structuralSignature: record.structuralSignature as StructuralSignature | undefined,
          phiHistory: record.phiHistory as number[] | undefined,
          isEscalating: record.isEscalating ?? false,
          queuePriority: record.queuePriority ?? 1,
        };
        this.entries.set(entry.id, entry);
        if (entry.phi) {
          this.rollingPhiDistribution.push(entry.phi);
        }
      }

      for (const record of clusters) {
        const cluster: NearMissCluster = {
          id: record.id,
          centroidPhrase: record.centroidPhrase,
          centroidPhi: record.centroidPhi,
          memberCount: record.memberCount,
          avgPhi: record.avgPhi,
          maxPhi: record.maxPhi,
          commonWords: record.commonWords as string[] ?? [],
          structuralPattern: record.structuralPattern ?? '',
          createdAt: record.createdAt.toISOString(),
          lastUpdatedAt: record.lastUpdatedAt.toISOString(),
        };
        this.clusters.set(cluster.id, cluster);
      }

      if (adaptiveState) {
        this.rollingPhiDistribution = (adaptiveState.rollingPhiDistribution as number[] ?? [])
          .slice(-NEAR_MISS_CONFIG.DISTRIBUTION_WINDOW_SIZE);
        this.adaptiveThresholds = {
          hot: adaptiveState.hotThreshold,
          warm: adaptiveState.warmThreshold,
          cool: adaptiveState.coolThreshold,
          distributionSize: adaptiveState.distributionSize,
          lastComputed: adaptiveState.lastComputed.toISOString(),
        };
      }

      return true;
    } catch (error) {
      console.error('[NearMiss] Failed to load from PostgreSQL:', error);
      return false;
    }
  }

  /**
   * Load state from JSON file (fallback)
   */
  private loadFromJson(): void {
    try {
      if (fs.existsSync(NEAR_MISS_FILE)) {
        const data = JSON.parse(fs.readFileSync(NEAR_MISS_FILE, 'utf-8'));

        if (data.entries) {
          for (const entry of data.entries) {
            this.entries.set(entry.id, entry);
            if (entry.phi) {
              this.rollingPhiDistribution.push(entry.phi);
            }
          }
        }

        if (data.clusters) {
          for (const cluster of data.clusters) {
            this.clusters.set(cluster.id, cluster);
          }
        }

        if (data.rollingPhiDistribution) {
          this.rollingPhiDistribution = data.rollingPhiDistribution.slice(-NEAR_MISS_CONFIG.DISTRIBUTION_WINDOW_SIZE);
        }

        console.log(`[NearMiss] Loaded from JSON: ${this.entries.size} entries, ${this.clusters.size} clusters, ${this.rollingPhiDistribution.length} Φ observations`);
      }
    } catch (error) {
      console.error('[NearMiss] Failed to load from JSON:', error);
    }
  }

  /**
   * Save state to both PostgreSQL and JSON
   */
  private save(): void {
    if (!this.isDirty) return;

    this.saveToJson();
    
    this.saveToPostgres().catch(err => {
      console.error('[NearMiss] PostgreSQL save failed:', err);
    });

    this.isDirty = false;
  }

  /**
   * Save state to JSON file (backup/fallback)
   */
  private saveToJson(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const data = {
        savedAt: new Date().toISOString(),
        entries: Array.from(this.entries.values()),
        clusters: Array.from(this.clusters.values()),
        rollingPhiDistribution: this.rollingPhiDistribution,
        adaptiveThresholds: this.adaptiveThresholds,
      };

      fs.writeFileSync(NEAR_MISS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[NearMiss] Failed to save to JSON:', error);
    }
  }

  /**
   * Save state to PostgreSQL
   */
  private async saveToPostgres(): Promise<void> {
    if (!oceanPersistence.isPersistenceAvailable()) return;

    try {
      const entries = Array.from(this.entries.values());
      const clusters = Array.from(this.clusters.values());

      const entryData = entries.map(e => ({
        id: e.id,
        phrase: e.phrase,
        phi: e.phi,
        kappa: e.kappa,
        regime: e.regime,
        tier: e.tier as 'hot' | 'warm' | 'cool',
        source: e.source,
        clusterId: e.clusterId,
        phiHistory: e.phiHistory,
        isEscalating: e.isEscalating,
        queuePriority: e.queuePriority,
        structuralSignature: e.structuralSignature as Record<string, unknown> | undefined,
        explorationCount: e.explorationCount,
      }));

      const [entrySaveCount] = await Promise.all([
        oceanPersistence.batchUpsertNearMissEntries(entryData),
        ...clusters.map(c => oceanPersistence.upsertNearMissCluster({
          id: c.id,
          centroidPhrase: c.centroidPhrase,
          centroidPhi: c.centroidPhi,
          memberCount: c.memberCount,
          avgPhi: c.avgPhi,
          maxPhi: c.maxPhi,
          commonWords: c.commonWords,
          structuralPattern: c.structuralPattern,
        })),
        oceanPersistence.saveNearMissAdaptiveState({
          rollingPhiDistribution: this.rollingPhiDistribution,
          hotThreshold: this.adaptiveThresholds.hot,
          warmThreshold: this.adaptiveThresholds.warm,
          coolThreshold: this.adaptiveThresholds.cool,
        }),
      ]);

      console.log(`[NearMiss] Saved to PostgreSQL: ${entrySaveCount} entries, ${clusters.length} clusters`);
    } catch (error) {
      console.error('[NearMiss] Failed to save to PostgreSQL:', error);
    }
  }

  /**
   * Force save immediately
   */
  forceSave(): void {
    this.isDirty = true;
    this.save();
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
