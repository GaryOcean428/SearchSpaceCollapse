/**
 * Tests for Idempotency Middleware and Chaos Engineering
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { 
  idempotencyMiddleware, 
  getIdempotencyStore, 
  clearIdempotencyStore 
} from '../idempotency-middleware';
import { 
  initChaos, 
  getChaos, 
  chaosMiddleware, 
  getChaosMetrics 
} from '../chaos-engineering';

describe('Idempotency Middleware', () => {
  let app: Express;
  
  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(idempotencyMiddleware({
      ttl: 60, // 60 seconds for testing
    }));
    
    // Test route
    app.post('/api/test', (req, res) => {
      res.json({ 
        data: req.body,
        timestamp: Date.now(),
        random: Math.random()
      });
    });
    
    await clearIdempotencyStore();
  });
  
  afterEach(async () => {
    await clearIdempotencyStore();
  });
  
  it('should allow first request through', async () => {
    const response = await request(app)
      .post('/api/test')
      .set('Idempotency-Key', 'test-key-1')
      .send({ value: 'test' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.value).toBe('test');
    expect(response.headers['x-idempotency-key']).toBe('test-key-1');
  });
  
  it('should replay response for duplicate request', async () => {
    const key = 'test-key-2';
    
    // First request
    const response1 = await request(app)
      .post('/api/test')
      .set('Idempotency-Key', key)
      .send({ value: 'original' });
    
    const originalRandom = response1.body.random;
    
    // Duplicate request
    const response2 = await request(app)
      .post('/api/test')
      .set('Idempotency-Key', key)
      .send({ value: 'duplicate' });
    
    // Should get same response
    expect(response2.status).toBe(200);
    expect(response2.body.random).toBe(originalRandom);
    expect(response2.body.data.value).toBe('original'); // Original value, not duplicate
    expect(response2.headers['x-idempotency-replay']).toBe('true');
  });
  
  it('should auto-generate key if not provided', async () => {
    const response1 = await request(app)
      .post('/api/test')
      .send({ value: 'test' });
    
    expect(response1.status).toBe(200);
    expect(response1.headers['x-idempotency-key']).toBeTruthy();
    
    const generatedKey = response1.headers['x-idempotency-key'];
    
    // Same request should get same key
    const response2 = await request(app)
      .post('/api/test')
      .send({ value: 'test' });
    
    expect(response2.headers['x-idempotency-key']).toBe(generatedKey);
  });
  
  it('should only apply to POST, PUT, PATCH', async () => {
    const key = 'test-key-3';
    
    // POST should be idempotent
    const postResponse = await request(app)
      .post('/api/test')
      .set('Idempotency-Key', key)
      .send({ value: 'test' });
    
    expect(postResponse.headers['x-idempotency-key']).toBe(key);
    
    // GET should not be idempotent
    app.get('/api/test', (req, res) => {
      res.json({ method: 'GET' });
    });
    
    const getResponse = await request(app)
      .get('/api/test')
      .set('Idempotency-Key', key);
    
    expect(getResponse.headers['x-idempotency-key']).toBeUndefined();
  });
  
  it('should store and retrieve from store', async () => {
    const key = 'test-key-4';
    const store = getIdempotencyStore();
    
    await request(app)
      .post('/api/test')
      .set('Idempotency-Key', key)
      .send({ value: 'test' });
    
    // Check store has entry
    const stored = await store.get(key);
    expect(stored).toBeTruthy();
    expect(stored!.body.data.value).toBe('test');
  });
  
  it('should expire entries after TTL', async () => {
    const key = 'test-key-5';
    
    // Use very short TTL for testing
    const shortTTLApp = express();
    shortTTLApp.use(express.json());
    shortTTLApp.use(idempotencyMiddleware({ ttl: 1 })); // 1 second
    shortTTLApp.post('/api/test', (req, res) => {
      res.json({ data: req.body });
    });
    
    await request(shortTTLApp)
      .post('/api/test')
      .set('Idempotency-Key', key)
      .send({ value: 'test' });
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Should allow new request (not replay)
    const response = await request(shortTTLApp)
      .post('/api/test')
      .set('Idempotency-Key', key)
      .send({ value: 'new' });
    
    expect(response.headers['x-idempotency-replay']).toBeUndefined();
  });
});

describe('Chaos Engineering', () => {
  let app: Express;
  
  beforeEach(() => {
    // Reset chaos instance
    if (getChaos()) {
      (getChaos() as any).resetMetrics();
    }
  });
  
  it('should require explicit enablement', () => {
    expect(() => {
      initChaos({ enabled: false });
    }).toThrow('explicitly enabled');
  });
  
  it('should prevent production use without override', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    expect(() => {
      initChaos({ enabled: true });
    }).toThrow('disabled in production');
    
    process.env.NODE_ENV = originalEnv;
  });
  
  it('should inject latency', async () => {
    // Force development mode
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    try {
      initChaos({
        enabled: true,
        latencyProbability: 1.0, // Always inject
        failureProbability: 0,
        latencyRange: [100, 200],
      });
      
      app = express();
      app.use(chaosMiddleware());
      app.get('/api/test', (req, res) => {
        res.json({ ok: true });
      });
      
      const start = Date.now();
      const response = await request(app).get('/api/test');
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeGreaterThanOrEqual(90); // At least 100ms latency (with tolerance)
      
      const metrics = getChaosMetrics();
      expect(metrics?.latenciesInjected).toBeGreaterThan(0);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
  
  it('should inject failures', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    try {
      initChaos({
        enabled: true,
        failureProbability: 1.0, // Always fail
        latencyProbability: 0,
      });
      
      app = express();
      app.use(chaosMiddleware());
      app.get('/api/test', (req, res) => {
        res.json({ ok: true });
      });
      
      const response = await request(app).get('/api/test');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.chaos).toBe(true);
      
      const metrics = getChaosMetrics();
      expect(metrics?.failuresInjected).toBeGreaterThan(0);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
  
  it('should exclude specified paths', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    try {
      initChaos({
        enabled: true,
        failureProbability: 1.0,
        excludedPaths: ['/api/health'],
      });
      
      app = express();
      app.use(chaosMiddleware());
      app.get('/api/health', (req, res) => {
        res.json({ status: 'healthy' });
      });
      app.get('/api/test', (req, res) => {
        res.json({ ok: true });
      });
      
      // Health check should not fail
      const healthResponse = await request(app).get('/api/health');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('healthy');
      
      // Other endpoints should fail
      const testResponse = await request(app).get('/api/test');
      expect(testResponse.status).toBeGreaterThanOrEqual(400);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
  
  it('should track metrics', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    try {
      const chaos = initChaos({
        enabled: true,
        failureProbability: 0.5,
        latencyProbability: 0.5,
      });
      
      chaos.resetMetrics();
      
      app = express();
      app.use(chaosMiddleware());
      app.get('/api/test', (req, res) => {
        res.json({ ok: true });
      });
      
      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/test');
      }
      
      const metrics = getChaosMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics!.totalRequests).toBe(10);
      expect(metrics!.failureRate).toBeGreaterThanOrEqual(0);
      expect(metrics!.failureRate).toBeLessThanOrEqual(1);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
