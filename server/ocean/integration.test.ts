/**
 * Integration tests for trajectory and episode flows
 * 
 * Tests verify the lifecycle management of trajectories and
 * episode recording with memory compression using REAL modules.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TrajectoryManager, TrajectoryOutcome } from './trajectory-manager';
import { OceanMemoryManager, OceanEpisode } from './memory-manager';
import { GeometricMemoryPressure, EpisodePoint } from './geometric-memory-pressure';
import { StrategyAnalytics } from './strategy-analytics';

describe('TrajectoryManager Integration (Real Module)', () => {
  let manager: TrajectoryManager;

  beforeEach(() => {
    manager = new TrajectoryManager();
  });

  afterEach(() => {
    manager.cleanupAll();
  });

  describe('trajectory lifecycle', () => {
    it('should start a trajectory and return valid ID', () => {
      const address = '1TestAddress123456789';
      const id = manager.startTrajectory(address);
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(5);
      expect(manager.hasActiveTrajectory(address)).toBe(true);
      expect(manager.getActiveCount()).toBe(1);
    });

    it('should record waypoints during search', () => {
      const address = '1WaypointTest456789';
      manager.startTrajectory(address);
      
      manager.recordWaypoint(address, 0.72, 61, 'linear', [0.1, 0.2], 'test', 'waypoint 1');
      manager.recordWaypoint(address, 0.75, 63, 'geometric', [0.2, 0.3], 'test', 'waypoint 2');
      manager.recordWaypoint(address, 0.78, 64, 'geometric', [0.3, 0.4], 'test', 'waypoint 3');
      
      const trajectory = manager.getActiveTrajectory(address);
      expect(trajectory).toBeDefined();
      expect(trajectory!.waypointCount).toBe(3);
      expect(trajectory!.lastPhi).toBe(0.78);
      expect(trajectory!.lastKappa).toBe(64);
    });

    it('should complete trajectory with outcome metrics', () => {
      const address = '1CompleteTest789';
      manager.startTrajectory(address);
      manager.recordWaypoint(address, 0.80, 64, 'geometric', [], 'search', 'final');
      
      const outcome: TrajectoryOutcome = {
        success: true,
        finalPhi: 0.85,
        finalKappa: 64,
        totalWaypoints: 10,
        duration: 45.5,
        nearMissCount: 2,
        resonantCount: 1,
        finalResult: 'match',
      };
      
      manager.completeTrajectory(address, outcome);
      
      expect(manager.hasActiveTrajectory(address)).toBe(false);
      expect(manager.getCompletedCount()).toBe(1);
      expect(manager.getActiveCount()).toBe(0);
    });

    it('should handle multiple concurrent trajectories', () => {
      const addresses = ['1Addr1Test', '1Addr2Test', '1Addr3Test'];
      
      for (const addr of addresses) {
        manager.startTrajectory(addr);
      }
      
      expect(manager.getActiveCount()).toBe(3);
      
      manager.completeTrajectory('1Addr2Test', {
        success: false,
        finalPhi: 0.65,
        finalKappa: 55,
        totalWaypoints: 5,
        duration: 10,
        nearMissCount: 0,
        resonantCount: 0,
        finalResult: 'stopped',
      });
      
      expect(manager.getActiveCount()).toBe(2);
      expect(manager.hasActiveTrajectory('1Addr1Test')).toBe(true);
      expect(manager.hasActiveTrajectory('1Addr2Test')).toBe(false);
      expect(manager.hasActiveTrajectory('1Addr3Test')).toBe(true);
    });

    it('should get statistics for active trajectories', () => {
      manager.startTrajectory('1StatsTest1');
      manager.startTrajectory('1StatsTest2');
      manager.recordWaypoint('1StatsTest1', 0.75, 62, 'geometric', [], 'test', 'waypoint');
      
      const stats = manager.getStatistics();
      
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(0);
      expect(stats.activeDetails.length).toBe(2);
      expect(stats.activeDetails[0].waypoints).toBeGreaterThanOrEqual(0);
    });

    it('should abandon trajectory with reason', () => {
      const address = '1AbandonTest';
      manager.startTrajectory(address);
      manager.recordWaypoint(address, 0.55, 45, 'breakdown', [], 'error', 'failed');
      
      manager.abandonTrajectory(address, 'Ethics violation detected');
      
      expect(manager.hasActiveTrajectory(address)).toBe(false);
      expect(manager.getArchivedCount()).toBe(1);
    });
  });
});

describe('OceanMemoryManager Integration (Real Module)', () => {
  let memory: OceanMemoryManager;

  beforeEach(() => {
    memory = new OceanMemoryManager({ testMode: true });
  });

  afterEach(() => {
    memory.stopAutoSave();
  });

  function createEpisode(overrides: Partial<OceanEpisode> = {}): OceanEpisode {
    return memory.createEpisode({
      phi: 0.75,
      kappa: 62,
      regime: 'geometric',
      result: 'tested',
      strategy: 'cultural_resonance',
      phrasesTestedCount: 50,
      nearMissCount: 0,
      durationMs: 1200,
      ...overrides,
    });
  }

  describe('episode recording', () => {
    it('should record episodes and track them', () => {
      for (let i = 0; i < 5; i++) {
        memory.addEpisode(createEpisode({ phi: 0.70 + i * 0.01 }));
      }
      
      const episodes = memory.getRecentEpisodes();
      expect(episodes.length).toBe(5);
    });

    it('should create episodes with unique IDs', () => {
      const ep1 = createEpisode();
      const ep2 = createEpisode();
      
      expect(ep1.id).not.toBe(ep2.id);
      expect(ep1.id).toMatch(/^ep_\d+_[a-z0-9]+$/);
    });

    it('should track statistics correctly', () => {
      for (let i = 0; i < 10; i++) {
        memory.addEpisode(createEpisode());
      }
      
      const stats = memory.getStatistics();
      
      expect(stats.recentEpisodes).toBe(10);
      expect(stats.totalRepresented).toBeGreaterThanOrEqual(10);
      expect(stats.memoryMB).toBeGreaterThan(0);
    });
  });

  describe('strategy analytics', () => {
    it('should calculate average phi by strategy', () => {
      memory.addEpisode(createEpisode({ strategy: 'A', phi: 0.80 }));
      memory.addEpisode(createEpisode({ strategy: 'A', phi: 0.70 }));
      memory.addEpisode(createEpisode({ strategy: 'B', phi: 0.90 }));
      
      const avgByStrategy = memory.getAveragePhiByStrategy();
      
      expect(avgByStrategy.get('A')?.avgPhi).toBeCloseTo(0.75, 2);
      expect(avgByStrategy.get('B')?.avgPhi).toBeCloseTo(0.90, 2);
    });

    it('should calculate success rate by strategy', () => {
      memory.addEpisode(createEpisode({ strategy: 'X', result: 'tested' }));
      memory.addEpisode(createEpisode({ strategy: 'X', result: 'near_miss' }));
      memory.addEpisode(createEpisode({ strategy: 'X', result: 'tested' }));
      memory.addEpisode(createEpisode({ strategy: 'X', result: 'resonant' }));
      
      const successRate = memory.getSuccessRateByStrategy();
      
      expect(successRate.get('X')).toBeCloseTo(0.5, 2);
    });

    it('should query episodes by result', () => {
      memory.addEpisode(createEpisode({ result: 'tested' }));
      memory.addEpisode(createEpisode({ result: 'near_miss' }));
      memory.addEpisode(createEpisode({ result: 'tested' }));
      
      const nearMisses = memory.queryRecentByResult('near_miss');
      expect(nearMisses.length).toBe(1);
      
      const tested = memory.queryRecentByResult('tested');
      expect(tested.length).toBe(2);
    });

    it('should query episodes by regime', () => {
      memory.addEpisode(createEpisode({ regime: 'geometric' }));
      memory.addEpisode(createEpisode({ regime: 'breakdown' }));
      memory.addEpisode(createEpisode({ regime: 'geometric' }));
      
      const geometric = memory.queryRecentByRegime('geometric');
      expect(geometric.length).toBe(2);
      
      const breakdown = memory.queryRecentByRegime('breakdown');
      expect(breakdown.length).toBe(1);
    });
  });
});

describe('GeometricMemoryPressure Integration (Real Module)', () => {
  let gmp: GeometricMemoryPressure;

  beforeEach(() => {
    gmp = new GeometricMemoryPressure();
  });

  it('should persist diverse episodes and merge similar ones', () => {
    const diversePoint: EpisodePoint = {
      phi: 0.85, kappa: 64, regime: 'geometric', strategy: 'A', result: 'tested'
    };
    
    const result1 = gmp.addPoint(diversePoint);
    expect(result1.persisted).toBe(true);
    
    const similarPoint: EpisodePoint = {
      phi: 0.86, kappa: 64.1, regime: 'geometric', strategy: 'A', result: 'tested'
    };
    
    const result2 = gmp.addPoint(similarPoint);
    expect(result2.persisted || result2.mergedIntoBasi).toBe(true);
  });

  it('should calculate meaningful metrics', () => {
    for (let i = 0; i < 15; i++) {
      gmp.addPoint({
        phi: 0.7 + i * 0.01,
        kappa: 60 + i * 0.3,
        regime: i % 3 === 0 ? 'breakdown' : 'geometric',
        strategy: `strategy_${i % 3}`,
        result: 'tested',
      });
    }
    
    const metrics = gmp.getMetrics();
    
    expect(metrics.fisherCurvature).toBeGreaterThanOrEqual(0);
    expect(metrics.manifoldVolume).toBeGreaterThan(0);
    expect(metrics.averageGeodesicDistance).toBeGreaterThanOrEqual(0);
  });

  it('should export and import state', () => {
    for (let i = 0; i < 10; i++) {
      gmp.addPoint({
        phi: 0.75 + i * 0.01,
        kappa: 62 + i,
        regime: 'geometric',
        strategy: 'test',
        result: 'tested',
      });
    }
    
    const exported = gmp.exportState();
    expect(exported.recentPoints.length).toBeGreaterThan(0);
    
    const newGmp = new GeometricMemoryPressure();
    newGmp.importState({ basins: exported.basins, recentPoints: exported.recentPoints });
    
    expect(newGmp.getRecentPoints().length).toBe(exported.recentPoints.length);
    expect(newGmp.getBasins().length).toBe(exported.basins.length);
  });
});

describe('StrategyAnalytics Integration (Real Module)', () => {
  let analytics: StrategyAnalytics;

  beforeEach(() => {
    analytics = new StrategyAnalytics();
  });

  it('should import episodes and calculate metrics', () => {
    const episodes: Array<{ phi: number; kappa: number; result: string; strategy: string; timestamp: string }> = [];
    for (let i = 0; i < 30; i++) {
      episodes.push({
        phi: 0.7 + i * 0.008,
        kappa: 60 + i * 0.5,
        result: i % 5 === 0 ? 'near_miss' : 'tested',
        strategy: 'improving_strategy',
        timestamp: new Date().toISOString(),
      });
    }
    
    analytics.importEpisodes(episodes);
    
    const metrics = analytics.getStrategyMetrics('improving_strategy');
    
    expect(metrics).not.toBeNull();
    expect(metrics!.sampleCount).toBe(30);
    expect(metrics!.trend).toBe('improving');
    expect(metrics!.phiVariance).toBeGreaterThan(0);
    expect(metrics!.confidenceInterval.lower).toBeLessThan(metrics!.avgPhi);
    expect(metrics!.confidenceInterval.upper).toBeGreaterThan(metrics!.avgPhi);
  });

  it('should provide strategy recommendations', () => {
    for (let i = 0; i < 25; i++) {
      analytics.addEpisode({
        phi: 0.75 + i * 0.005,
        kappa: 62,
        result: i % 4 === 0 ? 'near_miss' : 'tested',
        strategy: 'good_strategy',
        timestamp: new Date().toISOString(),
      });
      
      analytics.addEpisode({
        phi: 0.55 - i * 0.003,
        kappa: 50,
        result: 'tested',
        strategy: 'poor_strategy',
        timestamp: new Date().toISOString(),
      });
    }
    
    const recommendation = analytics.getStrategyRecommendation();
    
    expect(recommendation.recommended).toBe('good_strategy');
    expect(recommendation.reason.length).toBeGreaterThan(0);
  });

  it('should get overall analytics with best/worst strategies', () => {
    for (let i = 0; i < 20; i++) {
      analytics.addEpisode({
        phi: 0.9, kappa: 64, result: 'tested', strategy: 'excellent',
        timestamp: new Date().toISOString(),
      });
      analytics.addEpisode({
        phi: 0.5, kappa: 50, result: 'tested', strategy: 'poor',
        timestamp: new Date().toISOString(),
      });
    }
    
    const overall = analytics.getOverallAnalytics();
    
    expect(overall.totalEpisodes).toBe(40);
    expect(overall.bestStrategy).toBe('excellent');
    expect(overall.worstStrategy).toBe('poor');
    expect(overall.strategyDiversity).toBe(2);
  });
});
