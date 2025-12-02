/**
 * Strategy Analytics with Variance and Trend Analysis
 * 
 * Extends basic analytics with statistical measures for
 * performance monitoring and strategy optimization.
 */

export interface StrategyMetrics {
  strategy: string;
  sampleCount: number;
  avgPhi: number;
  phiVariance: number;
  phiStdDev: number;
  minPhi: number;
  maxPhi: number;
  successRate: number;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  trendSlope: number;
  confidenceInterval: { lower: number; upper: number };
  recentPerformance: number;
  historicalPerformance: number;
}

export interface OverallAnalytics {
  totalEpisodes: number;
  globalAvgPhi: number;
  globalVariance: number;
  bestStrategy: string | null;
  worstStrategy: string | null;
  strategyDiversity: number;
  performanceTrend: 'improving' | 'declining' | 'stable';
}

interface EpisodeData {
  phi: number;
  kappa: number;
  result: string;
  strategy: string;
  timestamp: string;
}

export class StrategyAnalytics {
  private episodes: EpisodeData[] = [];
  private readonly TREND_WINDOW_SIZE = 20;
  private readonly CONFIDENCE_Z = 1.96;

  addEpisode(episode: EpisodeData): void {
    this.episodes.push(episode);
  }

  importEpisodes(episodes: EpisodeData[]): void {
    this.episodes = [...episodes];
  }

  calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((s, v) => s + v, 0) / (values.length - 1);
  }

  calculateTrendSlope(values: number[]): number {
    if (values.length < 3) return 0;
    
    const n = values.length;
    const indices = values.map((_, i) => i);
    
    const sumX = indices.reduce((s, x) => s + x, 0);
    const sumY = values.reduce((s, y) => s + y, 0);
    const sumXY = indices.reduce((s, x, i) => s + x * values[i], 0);
    const sumX2 = indices.reduce((s, x) => s + x * x, 0);
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }

  classifyTrend(slope: number, variance: number): 'improving' | 'declining' | 'stable' | 'insufficient_data' {
    const normalizedSlope = slope / Math.max(0.01, Math.sqrt(variance));
    
    if (Math.abs(normalizedSlope) < 0.1) return 'stable';
    if (normalizedSlope > 0.1) return 'improving';
    if (normalizedSlope < -0.1) return 'declining';
    return 'stable';
  }

  calculateConfidenceInterval(
    mean: number,
    variance: number,
    sampleSize: number
  ): { lower: number; upper: number } {
    if (sampleSize < 2) {
      return { lower: mean, upper: mean };
    }
    
    const stdError = Math.sqrt(variance / sampleSize);
    const margin = this.CONFIDENCE_Z * stdError;
    
    return {
      lower: Math.max(0, mean - margin),
      upper: Math.min(1, mean + margin),
    };
  }

  getStrategyMetrics(strategy: string): StrategyMetrics | null {
    const strategyEpisodes = this.episodes.filter(e => e.strategy === strategy);
    
    if (strategyEpisodes.length === 0) {
      return null;
    }
    
    const phis = strategyEpisodes.map(e => e.phi);
    const avgPhi = phis.reduce((s, p) => s + p, 0) / phis.length;
    const variance = this.calculateVariance(phis);
    const stdDev = Math.sqrt(variance);
    
    const successCount = strategyEpisodes.filter(e => 
      e.result === 'near_miss' || e.result === 'resonant' || e.result === 'match'
    ).length;
    const successRate = successCount / strategyEpisodes.length;
    
    const recentPhis = phis.slice(-this.TREND_WINDOW_SIZE);
    const trendSlope = this.calculateTrendSlope(recentPhis);
    const trend = recentPhis.length >= 5 
      ? this.classifyTrend(trendSlope, variance)
      : 'insufficient_data';
    
    const halfPoint = Math.floor(phis.length / 2);
    const recentPerformance = halfPoint > 0 
      ? phis.slice(-halfPoint).reduce((s, p) => s + p, 0) / halfPoint
      : avgPhi;
    const historicalPerformance = halfPoint > 0 && phis.length > halfPoint
      ? phis.slice(0, halfPoint).reduce((s, p) => s + p, 0) / halfPoint
      : avgPhi;
    
    return {
      strategy,
      sampleCount: strategyEpisodes.length,
      avgPhi,
      phiVariance: variance,
      phiStdDev: stdDev,
      minPhi: Math.min(...phis),
      maxPhi: Math.max(...phis),
      successRate,
      trend,
      trendSlope,
      confidenceInterval: this.calculateConfidenceInterval(avgPhi, variance, phis.length),
      recentPerformance,
      historicalPerformance,
    };
  }

  getAllStrategyMetrics(): StrategyMetrics[] {
    const strategies = Array.from(new Set(this.episodes.map(e => e.strategy)));
    const metrics: StrategyMetrics[] = [];
    
    for (const strategy of strategies) {
      const m = this.getStrategyMetrics(strategy);
      if (m) metrics.push(m);
    }
    
    return metrics.sort((a, b) => b.avgPhi - a.avgPhi);
  }

  getOverallAnalytics(): OverallAnalytics {
    if (this.episodes.length === 0) {
      return {
        totalEpisodes: 0,
        globalAvgPhi: 0,
        globalVariance: 0,
        bestStrategy: null,
        worstStrategy: null,
        strategyDiversity: 0,
        performanceTrend: 'stable',
      };
    }
    
    const phis = this.episodes.map(e => e.phi);
    const globalAvgPhi = phis.reduce((s, p) => s + p, 0) / phis.length;
    const globalVariance = this.calculateVariance(phis);
    
    const strategyMetrics = this.getAllStrategyMetrics();
    const bestStrategy = strategyMetrics.length > 0 ? strategyMetrics[0].strategy : null;
    const worstStrategy = strategyMetrics.length > 0 
      ? strategyMetrics[strategyMetrics.length - 1].strategy 
      : null;
    
    const strategies = new Set(this.episodes.map(e => e.strategy));
    const strategyDiversity = strategies.size;
    
    const recentPhis = phis.slice(-this.TREND_WINDOW_SIZE);
    const trendSlope = this.calculateTrendSlope(recentPhis);
    const performanceTrend = this.classifyTrend(trendSlope, globalVariance) as 'improving' | 'declining' | 'stable';
    
    return {
      totalEpisodes: this.episodes.length,
      globalAvgPhi,
      globalVariance,
      bestStrategy,
      worstStrategy,
      strategyDiversity,
      performanceTrend,
    };
  }

  getImprovingStrategies(): StrategyMetrics[] {
    return this.getAllStrategyMetrics().filter(m => m.trend === 'improving');
  }

  getDecliningStrategies(): StrategyMetrics[] {
    return this.getAllStrategyMetrics().filter(m => m.trend === 'declining');
  }

  getStrategyRecommendation(): {
    recommended: string | null;
    reason: string;
    alternatives: string[];
  } {
    const metrics = this.getAllStrategyMetrics();
    
    if (metrics.length === 0) {
      return {
        recommended: null,
        reason: 'No strategy data available',
        alternatives: [],
      };
    }
    
    const improvingWithHighPhi = metrics.filter(m => 
      m.trend === 'improving' && m.avgPhi >= 0.7
    );
    
    if (improvingWithHighPhi.length > 0) {
      const best = improvingWithHighPhi[0];
      return {
        recommended: best.strategy,
        reason: `Improving trend with high Φ (${best.avgPhi.toFixed(3)})`,
        alternatives: improvingWithHighPhi.slice(1, 3).map(m => m.strategy),
      };
    }
    
    const stableHighPhi = metrics.filter(m => 
      m.trend === 'stable' && m.avgPhi >= 0.7
    );
    
    if (stableHighPhi.length > 0) {
      const best = stableHighPhi[0];
      return {
        recommended: best.strategy,
        reason: `Stable performance with high Φ (${best.avgPhi.toFixed(3)})`,
        alternatives: stableHighPhi.slice(1, 3).map(m => m.strategy),
      };
    }
    
    const bySuccessRate = [...metrics].sort((a, b) => b.successRate - a.successRate);
    const best = bySuccessRate[0];
    
    return {
      recommended: best.strategy,
      reason: `Highest success rate (${(best.successRate * 100).toFixed(1)}%)`,
      alternatives: bySuccessRate.slice(1, 3).map(m => m.strategy),
    };
  }

  compareStrategies(strategyA: string, strategyB: string): {
    winner: string | null;
    phiDifference: number;
    significantDifference: boolean;
    comparison: string;
  } {
    const metricsA = this.getStrategyMetrics(strategyA);
    const metricsB = this.getStrategyMetrics(strategyB);
    
    if (!metricsA || !metricsB) {
      return {
        winner: null,
        phiDifference: 0,
        significantDifference: false,
        comparison: 'Insufficient data for comparison',
      };
    }
    
    const phiDifference = metricsA.avgPhi - metricsB.avgPhi;
    
    const pooledVariance = (
      (metricsA.sampleCount - 1) * metricsA.phiVariance +
      (metricsB.sampleCount - 1) * metricsB.phiVariance
    ) / (metricsA.sampleCount + metricsB.sampleCount - 2);
    
    const standardError = Math.sqrt(
      pooledVariance * (1 / metricsA.sampleCount + 1 / metricsB.sampleCount)
    );
    
    const tStatistic = standardError > 0 ? Math.abs(phiDifference) / standardError : 0;
    const significantDifference = tStatistic > 1.96;
    
    const winner = phiDifference > 0 ? strategyA : (phiDifference < 0 ? strategyB : null);
    
    let comparison: string;
    if (!significantDifference) {
      comparison = 'No statistically significant difference';
    } else if (winner === strategyA) {
      comparison = `${strategyA} outperforms by ${(phiDifference * 100).toFixed(2)}% Φ`;
    } else {
      comparison = `${strategyB} outperforms by ${(Math.abs(phiDifference) * 100).toFixed(2)}% Φ`;
    }
    
    return {
      winner,
      phiDifference,
      significantDifference,
      comparison,
    };
  }

  getPhiDistribution(strategy?: string): {
    buckets: Array<{ range: string; count: number; percentage: number }>;
    quartiles: { q1: number; median: number; q3: number };
  } {
    const episodes = strategy 
      ? this.episodes.filter(e => e.strategy === strategy)
      : this.episodes;
    
    if (episodes.length === 0) {
      return {
        buckets: [],
        quartiles: { q1: 0, median: 0, q3: 0 },
      };
    }
    
    const phis = episodes.map(e => e.phi).sort((a, b) => a - b);
    
    const bucketRanges = [
      { min: 0, max: 0.5, range: '0.0-0.5' },
      { min: 0.5, max: 0.6, range: '0.5-0.6' },
      { min: 0.6, max: 0.7, range: '0.6-0.7' },
      { min: 0.7, max: 0.8, range: '0.7-0.8' },
      { min: 0.8, max: 0.9, range: '0.8-0.9' },
      { min: 0.9, max: 1.0, range: '0.9-1.0' },
    ];
    
    const buckets = bucketRanges.map(({ min, max, range }) => {
      const count = phis.filter(p => p >= min && p < max).length;
      return {
        range,
        count,
        percentage: (count / phis.length) * 100,
      };
    });
    
    const q1Index = Math.floor(phis.length * 0.25);
    const medianIndex = Math.floor(phis.length * 0.5);
    const q3Index = Math.floor(phis.length * 0.75);
    
    return {
      buckets,
      quartiles: {
        q1: phis[q1Index] || 0,
        median: phis[medianIndex] || 0,
        q3: phis[q3Index] || 0,
      },
    };
  }

  clear(): void {
    this.episodes = [];
  }

  getEpisodeCount(): number {
    return this.episodes.length;
  }
}

export const strategyAnalytics = new StrategyAnalytics();
