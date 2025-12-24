/**
 * Auth Flow Integration Tests
 * 
 * Tests for Replit authentication flow including:
 * - Configuration validation
 * - Rate limiting
 * - Token refresh
 * - Health checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadAuthConfig, normalizeRedirectUri, buildRedirectUri, isTrustedOrigin } from '../auth-config';
import { 
  trackLogin, 
  trackTokenRefresh, 
  getAuthMetrics,
  clearFailedAttempts,
  isLockedOut 
} from '../auth-rate-limiter';

describe('Auth Configuration', () => {
  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = 'test';
    process.env.REPL_ID = 'test-repl-id';
    process.env.SESSION_SECRET = 'test-secret-with-at-least-32-characters-long';
  });

  afterEach(() => {
    delete process.env.REPL_ID;
    delete process.env.SESSION_SECRET;
  });

  describe('loadAuthConfig', () => {
    it('should load auth config when database is available', () => {
      const config = loadAuthConfig(true);
      
      expect(config.enabled).toBe(true);
      expect(config.clientId).toBe('test-repl-id');
      expect(config.issuerUrl).toBe('https://replit.com/oidc');
      expect(config.scopes).toContain('openid');
      expect(config.scopes).toContain('offline_access');
    });

    it('should disable auth when database is not available', () => {
      const config = loadAuthConfig(false);
      
      expect(config.enabled).toBe(false);
    });

    it('should disable auth when REPL_ID is missing', () => {
      delete process.env.REPL_ID;
      
      const config = loadAuthConfig(true);
      
      expect(config.enabled).toBe(false);
    });

    it('should disable auth when SESSION_SECRET is missing', () => {
      delete process.env.SESSION_SECRET;
      
      const config = loadAuthConfig(true);
      
      expect(config.enabled).toBe(false);
    });

    it('should use custom issuer URL if provided', () => {
      process.env.ISSUER_URL = 'https://custom-issuer.example.com';
      
      const config = loadAuthConfig(true);
      
      expect(config.issuerUrl).toBe('https://custom-issuer.example.com');
      
      delete process.env.ISSUER_URL;
    });

    it('should use custom scopes if provided', () => {
      process.env.AUTH_SCOPES = 'openid email';
      
      const config = loadAuthConfig(true);
      
      expect(config.scopes).toEqual(['openid', 'email']);
      
      delete process.env.AUTH_SCOPES;
    });

    it('should parse numeric configuration values', () => {
      process.env.SESSION_TTL = '3600000';
      process.env.TOKEN_REFRESH_BUFFER = '600';
      process.env.AUTH_MAX_RETRIES = '5';
      process.env.AUTH_RETRY_BACKOFF = '2000';
      
      const config = loadAuthConfig(true);
      
      expect(config.sessionTtl).toBe(3600000);
      expect(config.tokenRefreshBuffer).toBe(600);
      expect(config.maxRetries).toBe(5);
      expect(config.retryBackoffMs).toBe(2000);
      
      delete process.env.SESSION_TTL;
      delete process.env.TOKEN_REFRESH_BUFFER;
      delete process.env.AUTH_MAX_RETRIES;
      delete process.env.AUTH_RETRY_BACKOFF;
    });
  });

  describe('normalizeRedirectUri', () => {
    it('should remove trailing slash', () => {
      expect(normalizeRedirectUri('https://example.com/')).toBe('https://example.com');
      expect(normalizeRedirectUri('https://example.com/callback/')).toBe('https://example.com/callback');
    });

    it('should not modify URI without trailing slash', () => {
      expect(normalizeRedirectUri('https://example.com')).toBe('https://example.com');
    });

    it('should upgrade HTTP to HTTPS in production', () => {
      process.env.REPLIT_DEPLOYMENT = '1';
      
      expect(normalizeRedirectUri('http://example.com')).toBe('https://example.com');
      
      delete process.env.REPLIT_DEPLOYMENT;
    });

    it('should not upgrade HTTP in development', () => {
      process.env.REPLIT_DEPLOYMENT = '0';
      
      expect(normalizeRedirectUri('http://localhost:5000')).toBe('http://localhost:5000');
      
      delete process.env.REPLIT_DEPLOYMENT;
    });
  });

  describe('buildRedirectUri', () => {
    it('should build URI with default protocol in development', () => {
      const config = loadAuthConfig(true);
      
      const uri = buildRedirectUri('localhost', config);
      
      expect(uri).toBe('http://localhost/api/callback');
    });

    it('should build URI with HTTPS in production', () => {
      process.env.REPLIT_DEPLOYMENT = '1';
      const config = loadAuthConfig(true);
      
      const uri = buildRedirectUri('my-app.replit.app', config);
      
      expect(uri).toBe('https://my-app.replit.app/api/callback');
      
      delete process.env.REPLIT_DEPLOYMENT;
    });

    it('should use REDIRECT_URI_BASE if provided', () => {
      process.env.REDIRECT_URI_BASE = 'https://custom-domain.com';
      const config = loadAuthConfig(true);
      
      const uri = buildRedirectUri('localhost', config);
      
      expect(uri).toBe('https://custom-domain.com/api/callback');
      
      delete process.env.REDIRECT_URI_BASE;
    });
  });

  describe('isTrustedOrigin', () => {
    it('should trust localhost origins in development', () => {
      const config = loadAuthConfig(true);
      
      expect(isTrustedOrigin('http://localhost:5173', config)).toBe(true);
      expect(isTrustedOrigin('http://127.0.0.1:5000', config)).toBe(true);
    });

    it('should trust Replit domains', () => {
      const config = loadAuthConfig(true);
      
      expect(isTrustedOrigin('https://my-app.replit.dev', config)).toBe(true);
      expect(isTrustedOrigin('https://my-app.replit.app', config)).toBe(true);
      expect(isTrustedOrigin('https://my-app.repl.co', config)).toBe(true);
    });

    it('should not trust unknown origins', () => {
      const config = loadAuthConfig(true);
      
      expect(isTrustedOrigin('https://evil.com', config)).toBe(false);
    });

    it('should not trust undefined origin', () => {
      const config = loadAuthConfig(true);
      
      expect(isTrustedOrigin(undefined, config)).toBe(false);
    });
  });
});

describe('Auth Rate Limiting', () => {
  beforeEach(() => {
    // Reset metrics
    vi.clearAllMocks();
  });

  describe('metrics tracking', () => {
    it('should track successful logins', () => {
      const initialMetrics = getAuthMetrics();
      
      trackLogin(true, 150);
      
      const metrics = getAuthMetrics();
      expect(metrics.totalLogins).toBe(initialMetrics.totalLogins + 1);
    });

    it('should track failed logins', () => {
      const initialMetrics = getAuthMetrics();
      
      trackLogin(false);
      
      const metrics = getAuthMetrics();
      expect(metrics.failedLogins).toBe(initialMetrics.failedLogins + 1);
    });

    it('should track token refreshes', () => {
      const initialMetrics = getAuthMetrics();
      
      trackTokenRefresh();
      
      const metrics = getAuthMetrics();
      expect(metrics.tokenRefreshes).toBe(initialMetrics.tokenRefreshes + 1);
    });

    it('should calculate average latency', () => {
      trackLogin(true, 100);
      trackLogin(true, 200);
      trackLogin(true, 300);
      
      const metrics = getAuthMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it('should calculate success rate', () => {
      trackLogin(true);
      trackLogin(true);
      trackLogin(false);
      
      const metrics = getAuthMetrics();
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('lockout protection', () => {
    it('should not lock out after few failures', () => {
      const mockReq = { ip: '192.168.1.1' } as any;
      
      expect(isLockedOut(mockReq)).toBe(false);
    });

    it('should clear failed attempts on successful auth', () => {
      const mockReq = { ip: '192.168.1.1' } as any;
      
      clearFailedAttempts(mockReq);
      
      expect(isLockedOut(mockReq)).toBe(false);
    });
  });
});

describe('Auth Health Check', () => {
  it('should export authHealthCheck function', async () => {
    const { authHealthCheck } = await import('../auth-health');
    
    expect(typeof authHealthCheck).toBe('function');
  });

  it('should export getTroubleshootingInfo function', async () => {
    const { getTroubleshootingInfo } = await import('../auth-health');
    
    expect(typeof getTroubleshootingInfo).toBe('function');
  });

  it('should provide troubleshooting info for known errors', async () => {
    const { getTroubleshootingInfo } = await import('../auth-health');
    
    const info = getTroubleshootingInfo('SESSION_SECRET not set');
    
    expect(info).toBeDefined();
    expect(info.problem).toContain('SESSION_SECRET');
    expect(info.solution).toBeDefined();
  });

  it('should return null for unknown errors', async () => {
    const { getTroubleshootingInfo } = await import('../auth-health');
    
    const info = getTroubleshootingInfo('Some random error');
    
    expect(info).toBeNull();
  });
});
