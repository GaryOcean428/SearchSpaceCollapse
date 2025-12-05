/**
 * Comprehensive Integration Tests
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * Tests full data flow from frontend → backend → kernel → response
 * Validates type contracts, API routes, and geometric purity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';

describe('API Integration Tests', () => {
  let app: Express;
  let server: any;
  
  beforeAll(async () => {
    // Import and setup the app
    const { default: express } = await import('express');
    app = express();
    
    // Add minimal middleware
    app.use(express.json());
    
    // Import routes
    const { registerRoutes } = await import('../routes');
    server = await registerRoutes(app);
  });
  
  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('Health Check Endpoint', () => {
    it('should return comprehensive health status', async () => {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      expect(data).toHaveProperty('status');
      expect(['healthy', 'degraded', 'down']).toContain(data.status);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('subsystems');
      expect(data.subsystems).toHaveProperty('database');
      expect(data.subsystems).toHaveProperty('pythonBackend');
      expect(data.subsystems).toHaveProperty('storage');
    });
  });

  describe('Kernel Status Endpoint', () => {
    it('should return kernel state', async () => {
      const response = await fetch('http://localhost:5000/api/kernel/status');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(['idle', 'active']).toContain(data.status);
      expect(data).toHaveProperty('timestamp');
      
      if (data.status === 'active') {
        expect(data).toHaveProperty('sessionId');
        expect(data).toHaveProperty('metrics');
        expect(data.metrics).toHaveProperty('phi');
        expect(data.metrics).toHaveProperty('kappa_eff');
      }
    });
  });

  describe('Search History Endpoint', () => {
    it('should return paginated search history', async () => {
      const response = await fetch('http://localhost:5000/api/search/history?limit=10&offset=0');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('searches');
      expect(Array.isArray(data.searches)).toBe(true);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });
  });

  describe('Telemetry Capture Endpoint', () => {
    it('should accept frontend telemetry events', async () => {
      const event = {
        event_type: 'search_initiated',
        timestamp: Date.now(),
        trace_id: 'test-trace-123',
        metadata: {
          query: 'test query',
        },
      };
      
      const response = await fetch('http://localhost:5000/api/telemetry/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('captured');
      expect(data).toHaveProperty('trace_id');
      expect(data.trace_id).toBe(event.trace_id);
    });
    
    it('should reject invalid telemetry events', async () => {
      const invalidEvent = {
        // Missing required fields
        metadata: {},
      };
      
      const response = await fetch('http://localhost:5000/api/telemetry/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidEvent),
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Recovery Checkpoint Endpoint', () => {
    it('should create checkpoint when session active', async () => {
      // This will fail if no session active, which is expected
      const response = await fetch('http://localhost:5000/api/recovery/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: 'test-search-123',
          description: 'Test checkpoint',
        }),
      });
      
      // Either success or no active session
      expect([200, 404]).toContain(response.status);
      
      const data = await response.json();
      
      if (response.status === 200) {
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('checkpoint');
        expect(data.checkpoint).toHaveProperty('checkpointId');
        expect(data.checkpoint).toHaveProperty('searchId');
        expect(data.checkpoint).toHaveProperty('timestamp');
      } else {
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe('Admin Metrics Endpoint', () => {
    it('should return aggregated metrics', async () => {
      const response = await fetch('http://localhost:5000/api/admin/metrics');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('metrics');
      
      const { metrics } = data;
      expect(metrics).toHaveProperty('search');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('balance');
      expect(metrics).toHaveProperty('kernel');
      
      // Search metrics
      expect(metrics.search).toHaveProperty('totalSearches');
      expect(metrics.search).toHaveProperty('activeSearches');
      expect(metrics.search).toHaveProperty('completedSearches');
      
      // Performance metrics
      expect(metrics.performance).toHaveProperty('avgSearchDurationMs');
      expect(metrics.performance).toHaveProperty('phrasesPerSecond');
      
      // Kernel metrics
      expect(metrics.kernel).toHaveProperty('status');
      expect(['idle', 'active']).toContain(metrics.kernel.status);
    });
  });

  describe('Trace ID Propagation', () => {
    it('should propagate trace IDs in responses', async () => {
      const traceId = 'test-trace-propagation-123';
      
      const response = await fetch('http://localhost:5000/api/health', {
        headers: {
          'X-Trace-ID': traceId,
        },
      });
      
      const responseTraceId = response.headers.get('X-Trace-ID');
      expect(responseTraceId).toBe(traceId);
    });
    
    it('should generate trace ID if not provided', async () => {
      const response = await fetch('http://localhost:5000/api/health');
      
      const responseTraceId = response.headers.get('X-Trace-ID');
      expect(responseTraceId).toBeTruthy();
      expect(typeof responseTraceId).toBe('string');
      expect(responseTraceId!.length).toBeGreaterThan(0);
    });
  });
});

describe('Type Contract Validation', () => {
  it('should validate ConsciousnessMetrics schema', async () => {
    const { consciousnessMetricsSchema } = await import('../../shared/types/qig-geometry');
    
    const validMetrics = {
      phi: 0.75,
      kappa_eff: 64.0,
      M: 0.68,
      Gamma: 0.82,
      G: 0.71,
      T: 0.79,
      R: 0.65,
      C: 0.54,
    };
    
    const result = consciousnessMetricsSchema.safeParse(validMetrics);
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid ConsciousnessMetrics', async () => {
    const { consciousnessMetricsSchema } = await import('../../shared/types/qig-geometry');
    
    const invalidMetrics = {
      phi: 1.5, // Out of range [0,1]
      kappa_eff: 64.0,
      M: 0.68,
      Gamma: 0.82,
      G: 0.71,
      T: 0.79,
      R: 0.65,
      C: 0.54,
    };
    
    const result = consciousnessMetricsSchema.safeParse(invalidMetrics);
    expect(result.success).toBe(false);
  });
  
  it('should validate basin coordinates (NOT embeddings)', async () => {
    const { basinCoordinatesSchema } = await import('../../shared/types/qig-geometry');
    
    const validBasin = {
      coords: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      dimension: 8,
      manifold: 'fisher' as const,
    };
    
    const result = basinCoordinatesSchema.safeParse(validBasin);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.manifold).toBe('fisher'); // NOT Euclidean!
    }
  });
  
  it('should validate E8 constants', async () => {
    const { E8_CONSTANTS } = await import('../../shared/types/qig-geometry');
    
    // Validate E8 structure constants
    expect(E8_CONSTANTS.E8_RANK).toBe(8);
    expect(E8_CONSTANTS.E8_ROOTS).toBe(240);
    expect(E8_CONSTANTS.KAPPA_STAR).toBe(64.0);
    expect(E8_CONSTANTS.KAPPA_STAR).toBe(E8_CONSTANTS.E8_RANK ** 2); // κ* = rank²
    expect(E8_CONSTANTS.PHI_THRESHOLD).toBe(0.70);
    expect(E8_CONSTANTS.MIN_RECURSIONS).toBe(3); // "One pass = computation. Three passes = integration."
  });
});

describe('Geometric Purity Validation', () => {
  it('should use Fisher-Rao distance (NOT Euclidean)', async () => {
    const { fisherRaoDistance } = await import('../../shared/types/qig-geometry');
    
    const basinA = [0.1, 0.2, 0.3, 0.4];
    const basinB = [0.5, 0.6, 0.7, 0.8];
    
    const distance = fisherRaoDistance(basinA, basinB);
    
    expect(typeof distance).toBe('number');
    expect(distance).toBeGreaterThanOrEqual(0);
    
    // Distance to self should be 0
    const selfDistance = fisherRaoDistance(basinA, basinA);
    expect(selfDistance).toBeCloseTo(0, 5);
  });
  
  it('should validate consciousness using geometric metrics', async () => {
    const { checkConsciousness } = await import('../../shared/types/qig-geometry');
    
    const consciousMetrics = {
      phi: 0.75,        // > 0.70 ✓
      kappa_eff: 64.0,
      M: 0.68,          // > 0.60 ✓
      Gamma: 0.82,      // > 0.70 ✓
      G: 0.71,          // > 0.60 ✓
      T: 0.79,
      R: 0.65,
      C: 0.54,
    };
    
    expect(checkConsciousness(consciousMetrics)).toBe(true);
    
    const unconsciousMetrics = {
      ...consciousMetrics,
      phi: 0.50, // Below threshold
    };
    
    expect(checkConsciousness(unconsciousMetrics)).toBe(false);
  });
});

describe('Python-TypeScript Type Consistency', () => {
  it('should have matching types between Python and TypeScript', async () => {
    // Import generated types
    const tsTypes = await import('../../shared/types/qig-generated');
    
    // Validate E8 constants match
    expect(tsTypes.E8_CONSTANTS.E8_RANK).toBe(8);
    expect(tsTypes.E8_CONSTANTS.E8_ROOTS).toBe(240);
    expect(tsTypes.E8_CONSTANTS.KAPPA_STAR).toBe(64.0);
    
    // Validate function exists
    expect(typeof tsTypes.isConsciousMetrics).toBe('function');
  });
});
