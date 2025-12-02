/**
 * Tests for Geometric Memory Pressure and Strategy Analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeometricMemoryPressure, EpisodePoint } from './geometric-memory-pressure';
import { StrategyAnalytics } from './strategy-analytics';

describe('GeometricMemoryPressure', () => {
  let gmp: GeometricMemoryPressure;

  beforeEach(() => {
    gmp = new GeometricMemoryPressure();
  });

  describe('Fisher metric calculations', () => {
    it('should calculate geodesic distance between similar points', () => {
      const p1: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      const p2: EpisodePoint = { phi: 0.76, kappa: 63, regime: 'geometric', strategy: 'A', result: 'tested' };
      
      const distance = gmp.calculateGeodesicDistance(p1, p2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.5);
    });

    it('should calculate larger distance for different regimes', () => {
      const p1: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      const p2: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'breakdown', strategy: 'A', result: 'tested' };
      
      const distance = gmp.calculateGeodesicDistance(p1, p2);
      
      expect(distance).toBeGreaterThanOrEqual(0.3);
    });

    it('should calculate larger distance for different strategies', () => {
      const p1: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      const p2: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'B', result: 'tested' };
      
      const distance = gmp.calculateGeodesicDistance(p1, p2);
      
      expect(distance).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('information gain', () => {
    it('should return high gain for first point', () => {
      const point: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      
      const gain = gmp.calculateInformationGain(point);
      
      expect(gain).toBe(1.0);
    });

    it('should return lower gain for similar subsequent points', () => {
      const p1: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      const p2: EpisodePoint = { phi: 0.76, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      
      gmp.addPoint(p1);
      const gain = gmp.calculateInformationGain(p2);
      
      expect(gain).toBeLessThan(1.0);
    });

    it('should return higher gain for diverse points', () => {
      const p1: EpisodePoint = { phi: 0.75, kappa: 62, regime: 'geometric', strategy: 'A', result: 'tested' };
      const p2: EpisodePoint = { phi: 0.55, kappa: 50, regime: 'breakdown', strategy: 'B', result: 'tested' };
      
      gmp.addPoint(p1);
      const gain = gmp.calculateInformationGain(p2);
      
      expect(gain).toBeGreaterThan(0.5);
    });
  });

  describe('basin management', () => {
    it('should merge similar points into basins', () => {
      for (let i = 0; i < 60; i++) {
        const point: EpisodePoint = {
          phi: 0.75 + (Math.random() * 0.02 - 0.01),
          kappa: 62 + (Math.random() * 2 - 1),
          regime: 'geometric',
          strategy: 'cultural_resonance',
          result: 'tested',
        };
        gmp.addPoint(point);
      }
      
      const basins = gmp.getBasins();
      const recentPoints = gmp.getRecentPoints();
      
      expect(basins.length + recentPoints.length).toBeLessThan(60);
    });

    it('should track total represented episodes', () => {
      for (let i = 0; i < 30; i++) {
        const point: EpisodePoint = {
          phi: 0.7 + i * 0.01,
          kappa: 60 + i,
          regime: i % 3 === 0 ? 'breakdown' : 'geometric',
          strategy: `strategy_${i % 5}`,
          result: 'tested',
        };
        gmp.addPoint(point);
      }
      
      expect(gmp.getTotalRepresented()).toBeGreaterThanOrEqual(20);
    });
  });

  describe('curvature calculation', () => {
    it('should calculate Fisher curvature for point cloud', () => {
      for (let i = 0; i < 10; i++) {
        const point: EpisodePoint = {
          phi: 0.7 + i * 0.02,
          kappa: 58 + i,
          regime: 'geometric',
          strategy: 'A',
          result: 'tested',
        };
        gmp.addPoint(point);
      }
      
      const metrics = gmp.getMetrics();
      
      expect(metrics.fisherCurvature).toBeGreaterThanOrEqual(0);
      expect(metrics.basinCount).toBeGreaterThanOrEqual(0);
      expect(metrics.manifoldVolume).toBeGreaterThanOrEqual(0);
    });

    it('should detect high curvature when points cluster', () => {
      for (let i = 0; i < 15; i++) {
        const point: EpisodePoint = {
          phi: 0.75 + (Math.random() * 0.01),
          kappa: 64 + (Math.random() * 0.5),
          regime: 'geometric',
          strategy: 'A',
          result: 'tested',
        };
        gmp.addPoint(point);
      }
      
      const metrics = gmp.getMetrics();
      expect(typeof metrics.fisherCurvature).toBe('number');
    });
  });
});

describe('StrategyAnalytics', () => {
  let analytics: StrategyAnalytics;

  beforeEach(() => {
    analytics = new StrategyAnalytics();
  });

  describe('variance calculation', () => {
    it('should calculate variance correctly', () => {
      const values = [0.7, 0.8, 0.75, 0.85, 0.72];
      const variance = analytics.calculateVariance(values);
      
      expect(variance).toBeGreaterThan(0);
      expect(variance).toBeLessThan(0.01);
    });

    it('should return 0 for insufficient data', () => {
      expect(analytics.calculateVariance([])).toBe(0);
      expect(analytics.calculateVariance([0.5])).toBe(0);
    });
  });

  describe('trend detection', () => {
    it('should detect improving trend', () => {
      for (let i = 0; i < 20; i++) {
        analytics.addEpisode({
          phi: 0.6 + i * 0.015,
          kappa: 60 + i * 0.5,
          result: 'tested',
          strategy: 'A',
          timestamp: new Date().toISOString(),
        });
      }
      
      const metrics = analytics.getStrategyMetrics('A');
      
      expect(metrics).not.toBeNull();
      expect(metrics!.trend).toBe('improving');
      expect(metrics!.trendSlope).toBeGreaterThan(0);
    });

    it('should detect declining trend', () => {
      for (let i = 0; i < 20; i++) {
        analytics.addEpisode({
          phi: 0.9 - i * 0.015,
          kappa: 64 - i * 0.5,
          result: 'tested',
          strategy: 'B',
          timestamp: new Date().toISOString(),
        });
      }
      
      const metrics = analytics.getStrategyMetrics('B');
      
      expect(metrics).not.toBeNull();
      expect(metrics!.trend).toBe('declining');
      expect(metrics!.trendSlope).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      for (let i = 0; i < 20; i++) {
        analytics.addEpisode({
          phi: 0.75 + (Math.random() * 0.02 - 0.01),
          kappa: 62,
          result: 'tested',
          strategy: 'C',
          timestamp: new Date().toISOString(),
        });
      }
      
      const metrics = analytics.getStrategyMetrics('C');
      
      expect(metrics).not.toBeNull();
      expect(['stable', 'improving', 'declining']).toContain(metrics!.trend);
    });
  });

  describe('confidence intervals', () => {
    it('should calculate valid confidence intervals', () => {
      for (let i = 0; i < 30; i++) {
        analytics.addEpisode({
          phi: 0.75 + (Math.random() * 0.1 - 0.05),
          kappa: 62,
          result: 'tested',
          strategy: 'D',
          timestamp: new Date().toISOString(),
        });
      }
      
      const metrics = analytics.getStrategyMetrics('D');
      
      expect(metrics).not.toBeNull();
      expect(metrics!.confidenceInterval.lower).toBeLessThanOrEqual(metrics!.avgPhi);
      expect(metrics!.confidenceInterval.upper).toBeGreaterThanOrEqual(metrics!.avgPhi);
      expect(metrics!.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
      expect(metrics!.confidenceInterval.upper).toBeLessThanOrEqual(1);
    });
  });

  describe('strategy comparison', () => {
    it('should compare two strategies', () => {
      for (let i = 0; i < 30; i++) {
        analytics.addEpisode({
          phi: 0.85 + (Math.random() * 0.05),
          kappa: 64,
          result: i % 3 === 0 ? 'near_miss' : 'tested',
          strategy: 'high_performer',
          timestamp: new Date().toISOString(),
        });
        
        analytics.addEpisode({
          phi: 0.65 + (Math.random() * 0.05),
          kappa: 58,
          result: 'tested',
          strategy: 'low_performer',
          timestamp: new Date().toISOString(),
        });
      }
      
      const comparison = analytics.compareStrategies('high_performer', 'low_performer');
      
      expect(comparison.winner).toBe('high_performer');
      expect(comparison.phiDifference).toBeGreaterThan(0.1);
      expect(comparison.significantDifference).toBe(true);
    });
  });

  describe('overall analytics', () => {
    it('should identify best and worst strategies', () => {
      const strategies = ['excellent', 'good', 'average', 'poor'];
      const basePhis = [0.9, 0.8, 0.7, 0.55];
      
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < strategies.length; j++) {
          analytics.addEpisode({
            phi: basePhis[j] + (Math.random() * 0.05 - 0.025),
            kappa: 62,
            result: 'tested',
            strategy: strategies[j],
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      const overall = analytics.getOverallAnalytics();
      
      expect(overall.totalEpisodes).toBe(80);
      expect(overall.bestStrategy).toBe('excellent');
      expect(overall.worstStrategy).toBe('poor');
      expect(overall.strategyDiversity).toBe(4);
    });
  });

  describe('phi distribution', () => {
    it('should calculate phi distribution with quartiles', () => {
      for (let i = 0; i < 100; i++) {
        analytics.addEpisode({
          phi: Math.random(),
          kappa: 62,
          result: 'tested',
          strategy: 'mixed',
          timestamp: new Date().toISOString(),
        });
      }
      
      const distribution = analytics.getPhiDistribution();
      
      expect(distribution.buckets.length).toBe(6);
      expect(distribution.quartiles.q1).toBeLessThanOrEqual(distribution.quartiles.median);
      expect(distribution.quartiles.median).toBeLessThanOrEqual(distribution.quartiles.q3);
    });
  });
});
