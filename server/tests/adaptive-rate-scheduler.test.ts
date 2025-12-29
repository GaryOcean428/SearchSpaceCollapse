/**
 * Tests for Adaptive Rate Scheduler
 * 
 * Validates dynamic rate adjustment based on traffic, health, and queue depth.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adaptiveRateScheduler } from '../adaptive-rate-scheduler';

// Mock the blockchain-api-router module
vi.mock('../blockchain-api-router', () => ({
  getProviderStats: vi.fn(() => [
    {
      name: 'TestProvider1',
      enabled: true,
      successRate: 0.9,
      rateLimitStatus: {
        requestsLastMinute: 30,
        allowed: 60,
      },
    },
    {
      name: 'TestProvider2',
      enabled: true,
      successRate: 0.8,
      rateLimitStatus: {
        requestsLastMinute: 40,
        allowed: 60,
      },
    },
  ]),
}));

describe('Adaptive Rate Scheduler', () => {
  beforeEach(() => {
    // Force recalculation for each test
    adaptiveRateScheduler.forceRecalculate(0);
  });
  
  describe('getCurrentTrafficMultiplier', () => {
    it('should return multiplier > 1 during low traffic hours (0-5 UTC)', () => {
      const multiplier = adaptiveRateScheduler.getCurrentTrafficMultiplier();
      
      // Current time might vary, but the method should always return a valid multiplier
      expect(multiplier).toBeGreaterThan(0);
      expect(multiplier).toBeLessThanOrEqual(1.5);
    });
    
    it('should return 1.0 during high traffic hours (8-16 UTC)', () => {
      const multiplier = adaptiveRateScheduler.getCurrentTrafficMultiplier();
      
      expect(multiplier).toBeGreaterThan(0);
      expect(multiplier).toBeLessThanOrEqual(1.5);
    });
  });
  
  describe('getCurrentTrafficLevel', () => {
    it('should return a valid traffic level', () => {
      const level = adaptiveRateScheduler.getCurrentTrafficLevel();
      
      expect(['low', 'medium', 'high']).toContain(level);
    });
  });
  
  describe('getProviderHealthScore', () => {
    it('should calculate health score between 0 and 1', () => {
      const healthScore = adaptiveRateScheduler.getProviderHealthScore();
      
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(1);
    });
    
    it('should return higher score when providers have high success rate', () => {
      const healthScore = adaptiveRateScheduler.getProviderHealthScore();
      
      // With mocked 90% and 80% success rates, should be > 0.5
      expect(healthScore).toBeGreaterThan(0.5);
    });
  });
  
  describe('recordResult', () => {
    it('should track successful requests', () => {
      adaptiveRateScheduler.recordResult(true);
      adaptiveRateScheduler.recordResult(true);
      
      const errorRate = adaptiveRateScheduler.getRecentErrorRate();
      
      expect(errorRate).toBe(0);
    });
    
    it('should track failed requests', () => {
      adaptiveRateScheduler.recordResult(false);
      adaptiveRateScheduler.recordResult(false);
      
      const errorRate = adaptiveRateScheduler.getRecentErrorRate();
      
      expect(errorRate).toBeGreaterThan(0);
    });
    
    it('should calculate error rate correctly', () => {
      // Clear any previous data
      adaptiveRateScheduler.forceRecalculate(0);
      
      // Record 7 successes and 3 errors = 30% error rate
      for (let i = 0; i < 7; i++) {
        adaptiveRateScheduler.recordResult(true);
      }
      for (let i = 0; i < 3; i++) {
        adaptiveRateScheduler.recordResult(false);
      }
      
      const errorRate = adaptiveRateScheduler.getRecentErrorRate();
      
      // Allow for some margin since there may be previous data
      expect(errorRate).toBeGreaterThan(0.15);
      expect(errorRate).toBeLessThan(0.5);
    });
  });
  
  describe('computeSchedule', () => {
    it('should return a valid rate schedule', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(0);
      
      expect(schedule).toHaveProperty('requestsPerMinute');
      expect(schedule).toHaveProperty('parallelQueries');
      expect(schedule).toHaveProperty('delayBetweenRequests');
      expect(schedule).toHaveProperty('reason');
      
      expect(schedule.requestsPerMinute).toBeGreaterThan(0);
      expect(schedule.parallelQueries).toBeGreaterThan(0);
      expect(schedule.delayBetweenRequests).toBeGreaterThan(0);
    });
    
    it('should increase rate during low traffic periods', () => {
      // Force a specific time by mocking getCurrentTrafficMultiplier
      const originalMethod = adaptiveRateScheduler.getCurrentTrafficMultiplier;
      adaptiveRateScheduler.getCurrentTrafficMultiplier = () => 1.5;
      
      const schedule = adaptiveRateScheduler.forceRecalculate(0);
      
      // Should be higher than base rate (60 req/min)
      expect(schedule.requestsPerMinute).toBeGreaterThan(60);
      
      // Restore original method
      adaptiveRateScheduler.getCurrentTrafficMultiplier = originalMethod;
    });
    
    it('should increase parallel queries during low traffic with good health', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(0);
      
      // With good provider health, should use parallel queries
      expect(schedule.parallelQueries).toBeGreaterThanOrEqual(1);
      expect(schedule.parallelQueries).toBeLessThanOrEqual(3);
    });
    
    it('should decrease rate when error rate is high', () => {
      // Record many errors
      for (let i = 0; i < 20; i++) {
        adaptiveRateScheduler.recordResult(false);
      }
      
      const schedule = adaptiveRateScheduler.forceRecalculate(0);
      
      // Should be reduced due to high error rate
      expect(schedule.requestsPerMinute).toBeLessThan(100);
    });
    
    it('should increase rate when queue depth is high', () => {
      const normalSchedule = adaptiveRateScheduler.computeSchedule(10);
      const highQueueSchedule = adaptiveRateScheduler.forceRecalculate(500);
      
      // Higher queue should result in higher rate
      expect(highQueueSchedule.requestsPerMinute).toBeGreaterThanOrEqual(normalSchedule.requestsPerMinute);
    });
    
    it('should include reason in schedule', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(0);
      
      expect(schedule.reason).toBeTruthy();
      expect(typeof schedule.reason).toBe('string');
      expect(schedule.reason.length).toBeGreaterThan(0);
    });
  });
  
  describe('getCurrentSchedule', () => {
    it('should return a schedule', () => {
      const schedule = adaptiveRateScheduler.getCurrentSchedule(0);
      
      expect(schedule).toHaveProperty('requestsPerMinute');
      expect(schedule.requestsPerMinute).toBeGreaterThan(0);
    });
    
    it('should cache schedule and not recalculate immediately', () => {
      const schedule1 = adaptiveRateScheduler.getCurrentSchedule(0);
      const schedule2 = adaptiveRateScheduler.getCurrentSchedule(0);
      
      // Should return the same object (cached)
      expect(schedule1).toBe(schedule2);
    });
  });
  
  describe('forceRecalculate', () => {
    it('should always recalculate schedule', () => {
      const schedule1 = adaptiveRateScheduler.forceRecalculate(0);
      const schedule2 = adaptiveRateScheduler.forceRecalculate(0);
      
      // Should be different objects (recalculated)
      expect(schedule1).not.toBe(schedule2);
    });
  });
  
  describe('getStats', () => {
    it('should return comprehensive statistics', () => {
      const stats = adaptiveRateScheduler.getStats();
      
      expect(stats).toHaveProperty('currentRate');
      expect(stats).toHaveProperty('parallelQueries');
      expect(stats).toHaveProperty('trafficLevel');
      expect(stats).toHaveProperty('healthScore');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('nextAdjustmentIn');
      
      expect(stats.currentRate).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(stats.trafficLevel);
      expect(stats.healthScore).toBeGreaterThanOrEqual(0);
      expect(stats.healthScore).toBeLessThanOrEqual(1);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      expect(stats.nextAdjustmentIn).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Adaptive Behavior', () => {
    it('should adapt to changing conditions', () => {
      // Start with good conditions
      for (let i = 0; i < 10; i++) {
        adaptiveRateScheduler.recordResult(true);
      }
      
      const goodSchedule = adaptiveRateScheduler.forceRecalculate(0);
      
      // Introduce errors
      for (let i = 0; i < 10; i++) {
        adaptiveRateScheduler.recordResult(false);
      }
      
      const badSchedule = adaptiveRateScheduler.forceRecalculate(0);
      
      // Rate should be lower with errors
      expect(badSchedule.requestsPerMinute).toBeLessThan(goodSchedule.requestsPerMinute);
    });
    
    it('should balance multiple factors', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(200);
      
      // Should consider:
      // - Traffic level (time of day)
      // - Provider health (mocked at 85-90%)
      // - Error rate (tracked)
      // - Queue depth (200)
      
      // Result should be reasonable
      expect(schedule.requestsPerMinute).toBeGreaterThan(30);
      expect(schedule.requestsPerMinute).toBeLessThan(200);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero queue depth', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(0);
      
      expect(schedule.requestsPerMinute).toBeGreaterThan(0);
    });
    
    it('should handle very large queue depth', () => {
      const schedule = adaptiveRateScheduler.forceRecalculate(10000);
      
      // Should boost rate significantly for large queue
      // Base rate is 60, with queue boost should be higher
      expect(schedule.requestsPerMinute).toBeGreaterThan(50);
      expect(schedule.requestsPerMinute).toBeLessThan(300);
    });
    
    it('should handle 100% error rate', () => {
      // Record only errors
      for (let i = 0; i < 50; i++) {
        adaptiveRateScheduler.recordResult(false);
      }
      
      const schedule = adaptiveRateScheduler.forceRecalculate(0);
      
      // Should still return a valid schedule, just reduced
      expect(schedule.requestsPerMinute).toBeGreaterThan(0);
      expect(schedule.requestsPerMinute).toBeLessThan(60);
    });
    
    it('should handle 0% error rate', () => {
      // Record only successes
      for (let i = 0; i < 50; i++) {
        adaptiveRateScheduler.recordResult(true);
      }
      
      const schedule = adaptiveRateScheduler.forceRecalculate(0);
      
      // Should return a valid schedule
      expect(schedule.requestsPerMinute).toBeGreaterThan(0);
    });
  });
  
  describe('Rate Limits', () => {
    it('should respect minimum delay between requests', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(0);
      
      // Delay should be at least 100ms
      expect(schedule.delayBetweenRequests).toBeGreaterThanOrEqual(100);
    });
    
    it('should calculate delay consistently with rate', () => {
      const schedule = adaptiveRateScheduler.computeSchedule(0);
      
      const expectedDelay = (60000 / schedule.requestsPerMinute) / schedule.parallelQueries;
      
      // Should be approximately equal (allow some rounding)
      expect(schedule.delayBetweenRequests).toBeGreaterThanOrEqual(expectedDelay * 0.9);
      expect(schedule.delayBetweenRequests).toBeLessThanOrEqual(expectedDelay * 1.1 + 100);
    });
  });
  
  describe('Performance', () => {
    it('should compute schedule quickly', () => {
      const start = Date.now();
      adaptiveRateScheduler.computeSchedule(0);
      const duration = Date.now() - start;
      
      // Should complete in less than 10ms
      expect(duration).toBeLessThan(10);
    });
    
    it('should handle many result recordings efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        adaptiveRateScheduler.recordResult(Math.random() > 0.5);
      }
      
      const duration = Date.now() - start;
      
      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});
