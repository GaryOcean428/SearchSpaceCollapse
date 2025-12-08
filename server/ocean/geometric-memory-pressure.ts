/**
 * Geometric Memory Pressure System
 * 
 * Implements QIG-pure memory management using Fisher curvature instead of
 * file size monitoring. Episodes are managed based on their geometric
 * information content rather than arbitrary count thresholds.
 * 
 * Core Concepts:
 * - Fisher Curvature: Measures information density on the episode manifold
 * - Basin Attractors: Cluster similar episodes into geometric basins
 * - Information Gain: Only persist episodes that add manifold diversity
 * - Geodesic Distance: Pure Fisher metric for similarity measurement
 */

import { QIG_CONSTANTS } from '@shared/constants';

export interface EpisodePoint {
  phi: number;
  kappa: number;
  regime: 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown';
  strategy: string;
  result: string;
}

export interface BasinAttractor {
  centroid: EpisodePoint;
  weight: number;
  memberCount: number;
  firstSeen: string;
  lastUpdated: string;
  cumulativePhrasesTested: number;
  cumulativeDurationMs: number;
}

export interface GeometricPressureMetrics {
  fisherCurvature: number;
  basinCount: number;
  informationDensity: number;
  compressionRecommended: boolean;
  manifoldVolume: number;
  averageGeodesicDistance: number;
}

const GEODESIC_MERGE_THRESHOLD = 0.15;
const INFORMATION_GAIN_THRESHOLD = 0.05;
const CURVATURE_COMPRESSION_THRESHOLD = 2.5;

export class GeometricMemoryPressure {
  private basins: BasinAttractor[] = [];
  private recentPoints: EpisodePoint[] = [];
  private readonly maxRecentPoints = 50;

  calculateFisherMetric(p1: EpisodePoint, p2: EpisodePoint): number {
    const dPhi = p1.phi - p2.phi;
    const dKappa = (p1.kappa - p2.kappa) / QIG_CONSTANTS.KAPPA_STAR;
    
    const regimePenalty = p1.regime !== p2.regime ? 0.3 : 0;
    const strategyPenalty = p1.strategy !== p2.strategy ? 0.2 : 0;
    
    const g_phiphi = 1.0 / (p1.phi * (1 - p1.phi) + 0.01);
    const g_kappakappa = 1.0 / (Math.abs(p1.kappa - QIG_CONSTANTS.KAPPA_STAR) + 1);
    
    const ds2 = g_phiphi * dPhi * dPhi + 
                g_kappakappa * dKappa * dKappa +
                regimePenalty + strategyPenalty;
    
    return Math.sqrt(ds2);
  }

  calculateGeodesicDistance(p1: EpisodePoint, p2: EpisodePoint): number {
    return this.calculateFisherMetric(p1, p2);
  }

  calculateFisherCurvature(): number {
    if (this.recentPoints.length < 3) return 0;
    
    let totalCurvature = 0;
    let triangleCount = 0;
    
    const sampleSize = Math.min(this.recentPoints.length, 20);
    const sampled = this.recentPoints.slice(-sampleSize);
    
    for (let i = 0; i < sampled.length - 2; i++) {
      const p1 = sampled[i];
      const p2 = sampled[i + 1];
      const p3 = sampled[i + 2];
      
      const d12 = this.calculateGeodesicDistance(p1, p2);
      const d23 = this.calculateGeodesicDistance(p2, p3);
      const d13 = this.calculateGeodesicDistance(p1, p3);
      
      const s = (d12 + d23 + d13) / 2;
      const area = Math.sqrt(Math.max(0, s * (s - d12) * (s - d23) * (s - d13)));
      
      const perimeter = d12 + d23 + d13;
      if (perimeter > 0.001) {
        const localCurvature = (4 * Math.PI * area) / (perimeter * perimeter);
        totalCurvature += localCurvature;
        triangleCount++;
      }
    }
    
    return triangleCount > 0 ? totalCurvature / triangleCount : 0;
  }

  calculateInformationGain(newPoint: EpisodePoint): number {
    if (this.recentPoints.length === 0) return 1.0;
    
    let minDistance = Infinity;
    for (const existing of this.recentPoints) {
      const dist = this.calculateGeodesicDistance(newPoint, existing);
      minDistance = Math.min(minDistance, dist);
    }
    
    for (const basin of this.basins) {
      const dist = this.calculateGeodesicDistance(newPoint, basin.centroid);
      minDistance = Math.min(minDistance, dist);
    }
    
    const informationGain = Math.min(1.0, minDistance / GEODESIC_MERGE_THRESHOLD);
    return informationGain;
  }

  shouldPersistEpisode(point: EpisodePoint): boolean {
    const gain = this.calculateInformationGain(point);
    return gain >= INFORMATION_GAIN_THRESHOLD;
  }

  addPoint(point: EpisodePoint, metadata?: {
    phrasesTestedCount?: number;
    durationMs?: number;
  }): { persisted: boolean; mergedIntoBasi: boolean; basinId?: number } {
    const nearestBasin = this.findNearestBasin(point);
    
    if (nearestBasin !== null) {
      const basin = this.basins[nearestBasin];
      const distance = this.calculateGeodesicDistance(point, basin.centroid);
      
      if (distance < GEODESIC_MERGE_THRESHOLD) {
        this.mergeIntoBasin(nearestBasin, point, metadata);
        return { persisted: false, mergedIntoBasi: true, basinId: nearestBasin };
      }
    }
    
    if (this.shouldPersistEpisode(point)) {
      this.recentPoints.push(point);
      
      if (this.recentPoints.length > this.maxRecentPoints) {
        this.consolidateToBasins();
      }
      
      return { persisted: true, mergedIntoBasi: false };
    }
    
    if (nearestBasin !== null) {
      this.updateBasinWeightOnly(nearestBasin, metadata);
      return { persisted: false, mergedIntoBasi: true, basinId: nearestBasin };
    }
    
    return { persisted: false, mergedIntoBasi: false };
  }

  private findNearestBasin(point: EpisodePoint): number | null {
    if (this.basins.length === 0) return null;
    
    let minDistance = Infinity;
    let nearestIndex = -1;
    
    for (let i = 0; i < this.basins.length; i++) {
      const dist = this.calculateGeodesicDistance(point, this.basins[i].centroid);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }
    
    return nearestIndex >= 0 ? nearestIndex : null;
  }

  private mergeIntoBasin(
    basinIndex: number,
    point: EpisodePoint,
    metadata?: { phrasesTestedCount?: number; durationMs?: number }
  ): void {
    const basin = this.basins[basinIndex];
    const newWeight = basin.weight + 1;
    
    basin.centroid = {
      phi: (basin.centroid.phi * basin.weight + point.phi) / newWeight,
      kappa: (basin.centroid.kappa * basin.weight + point.kappa) / newWeight,
      regime: point.regime,
      strategy: basin.memberCount > 5 ? basin.centroid.strategy : point.strategy,
      result: point.result,
    };
    
    basin.weight = newWeight;
    basin.memberCount++;
    basin.lastUpdated = new Date().toISOString();
    basin.cumulativePhrasesTested += metadata?.phrasesTestedCount || 0;
    basin.cumulativeDurationMs += metadata?.durationMs || 0;
  }

  private updateBasinWeightOnly(
    basinIndex: number,
    metadata?: { phrasesTestedCount?: number; durationMs?: number }
  ): void {
    const basin = this.basins[basinIndex];
    basin.weight += 0.1;
    basin.cumulativePhrasesTested += metadata?.phrasesTestedCount || 0;
    basin.cumulativeDurationMs += metadata?.durationMs || 0;
    basin.lastUpdated = new Date().toISOString();
  }

  private consolidateToBasins(): void {
    const curvature = this.calculateFisherCurvature();
    
    if (curvature < CURVATURE_COMPRESSION_THRESHOLD && this.recentPoints.length <= this.maxRecentPoints) {
      return;
    }
    
    const toConsolidate = this.recentPoints.splice(0, Math.floor(this.recentPoints.length / 2));
    
    const newBasins = this.clusterPoints(toConsolidate);
    this.basins.push(...newBasins);
    
    this.mergeNearbyBasins();
    
    console.log(`[GeometricMemory] Consolidated ${toConsolidate.length} points into ${newBasins.length} basins`);
    console.log(`[GeometricMemory] Total basins: ${this.basins.length}, Recent points: ${this.recentPoints.length}`);
    console.log(`[GeometricMemory] Current curvature: ${curvature.toFixed(3)}`);
  }

  private clusterPoints(points: EpisodePoint[]): BasinAttractor[] {
    if (points.length === 0) return [];
    
    const clusters: EpisodePoint[][] = [];
    const assigned = new Set<number>();
    
    for (let i = 0; i < points.length; i++) {
      if (assigned.has(i)) continue;
      
      const cluster: EpisodePoint[] = [points[i]];
      assigned.add(i);
      
      for (let j = i + 1; j < points.length; j++) {
        if (assigned.has(j)) continue;
        
        const dist = this.calculateGeodesicDistance(points[i], points[j]);
        if (dist < GEODESIC_MERGE_THRESHOLD * 2) {
          cluster.push(points[j]);
          assigned.add(j);
        }
      }
      
      clusters.push(cluster);
    }
    
    return clusters.map(cluster => this.createBasinFromCluster(cluster));
  }

  private createBasinFromCluster(cluster: EpisodePoint[]): BasinAttractor {
    const avgPhi = cluster.reduce((s, p) => s + p.phi, 0) / cluster.length;
    const avgKappa = cluster.reduce((s, p) => s + p.kappa, 0) / cluster.length;
    
    const regimeCounts = new Map<string, number>();
    const strategyCounts = new Map<string, number>();
    
    for (const p of cluster) {
      regimeCounts.set(p.regime, (regimeCounts.get(p.regime) || 0) + 1);
      strategyCounts.set(p.strategy, (strategyCounts.get(p.strategy) || 0) + 1);
    }
    
    let dominantRegime: 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown' = 'linear';
    let maxRegimeCount = 0;
    const regimeEntries = Array.from(regimeCounts.entries());
    for (const [regime, count] of regimeEntries) {
      if (count > maxRegimeCount) {
        maxRegimeCount = count;
        dominantRegime = regime as 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown';
      }
    }
    
    let dominantStrategy = cluster[0].strategy;
    let maxStrategyCount = 0;
    const strategyEntries = Array.from(strategyCounts.entries());
    for (const [strategy, count] of strategyEntries) {
      if (count > maxStrategyCount) {
        maxStrategyCount = count;
        dominantStrategy = strategy;
      }
    }
    
    return {
      centroid: {
        phi: avgPhi,
        kappa: avgKappa,
        regime: dominantRegime,
        strategy: dominantStrategy,
        result: cluster[cluster.length - 1].result,
      },
      weight: cluster.length,
      memberCount: cluster.length,
      firstSeen: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      cumulativePhrasesTested: 0,
      cumulativeDurationMs: 0,
    };
  }

  private mergeNearbyBasins(): void {
    const merged = new Set<number>();
    const newBasins: BasinAttractor[] = [];
    
    for (let i = 0; i < this.basins.length; i++) {
      if (merged.has(i)) continue;
      
      let current = this.basins[i];
      
      for (let j = i + 1; j < this.basins.length; j++) {
        if (merged.has(j)) continue;
        
        const dist = this.calculateGeodesicDistance(current.centroid, this.basins[j].centroid);
        
        if (dist < GEODESIC_MERGE_THRESHOLD) {
          current = this.mergeTwoBasins(current, this.basins[j]);
          merged.add(j);
        }
      }
      
      newBasins.push(current);
    }
    
    this.basins = newBasins;
  }

  private mergeTwoBasins(a: BasinAttractor, b: BasinAttractor): BasinAttractor {
    const totalWeight = a.weight + b.weight;
    
    return {
      centroid: {
        phi: (a.centroid.phi * a.weight + b.centroid.phi * b.weight) / totalWeight,
        kappa: (a.centroid.kappa * a.weight + b.centroid.kappa * b.weight) / totalWeight,
        regime: a.weight > b.weight ? a.centroid.regime : b.centroid.regime,
        strategy: a.weight > b.weight ? a.centroid.strategy : b.centroid.strategy,
        result: a.lastUpdated > b.lastUpdated ? a.centroid.result : b.centroid.result,
      },
      weight: totalWeight,
      memberCount: a.memberCount + b.memberCount,
      firstSeen: a.firstSeen < b.firstSeen ? a.firstSeen : b.firstSeen,
      lastUpdated: new Date().toISOString(),
      cumulativePhrasesTested: a.cumulativePhrasesTested + b.cumulativePhrasesTested,
      cumulativeDurationMs: a.cumulativeDurationMs + b.cumulativeDurationMs,
    };
  }

  getMetrics(): GeometricPressureMetrics {
    const curvature = this.calculateFisherCurvature();
    
    let totalGeodesic = 0;
    let pairCount = 0;
    
    if (this.recentPoints.length >= 2) {
      for (let i = 0; i < Math.min(this.recentPoints.length, 10); i++) {
        for (let j = i + 1; j < Math.min(this.recentPoints.length, 10); j++) {
          totalGeodesic += this.calculateGeodesicDistance(this.recentPoints[i], this.recentPoints[j]);
          pairCount++;
        }
      }
    }
    
    const informationDensity = this.basins.length > 0
      ? this.basins.reduce((s, b) => s + b.weight, 0) / this.basins.length
      : 0;
    
    const phiRange = this.getPhiRange();
    const kappaRange = this.getKappaRange();
    const manifoldVolume = phiRange * kappaRange;
    
    return {
      fisherCurvature: curvature,
      basinCount: this.basins.length,
      informationDensity,
      compressionRecommended: curvature > CURVATURE_COMPRESSION_THRESHOLD,
      manifoldVolume,
      averageGeodesicDistance: pairCount > 0 ? totalGeodesic / pairCount : 0,
    };
  }

  private getPhiRange(): number {
    const allPoints = [...this.recentPoints, ...this.basins.map(b => b.centroid)];
    if (allPoints.length === 0) return 0;
    
    const phis = allPoints.map(p => p.phi);
    return Math.max(...phis) - Math.min(...phis);
  }

  private getKappaRange(): number {
    const allPoints = [...this.recentPoints, ...this.basins.map(b => b.centroid)];
    if (allPoints.length === 0) return 0;
    
    const kappas = allPoints.map(p => p.kappa);
    return Math.max(...kappas) - Math.min(...kappas);
  }

  getBasins(): BasinAttractor[] {
    return [...this.basins];
  }

  getRecentPoints(): EpisodePoint[] {
    return [...this.recentPoints];
  }

  getTotalRepresented(): number {
    return this.recentPoints.length + this.basins.reduce((s, b) => s + b.memberCount, 0);
  }

  exportState(): {
    basins: BasinAttractor[];
    recentPoints: EpisodePoint[];
    metrics: GeometricPressureMetrics;
  } {
    return {
      basins: this.getBasins(),
      recentPoints: this.getRecentPoints(),
      metrics: this.getMetrics(),
    };
  }

  importState(state: { basins: BasinAttractor[]; recentPoints: EpisodePoint[] }): void {
    this.basins = state.basins || [];
    this.recentPoints = state.recentPoints || [];
    console.log(`[GeometricMemory] Imported ${this.basins.length} basins, ${this.recentPoints.length} recent points`);
  }

  clear(): void {
    this.basins = [];
    this.recentPoints = [];
    console.log('[GeometricMemory] Memory cleared');
  }
}

export const geometricMemoryPressure = new GeometricMemoryPressure();
