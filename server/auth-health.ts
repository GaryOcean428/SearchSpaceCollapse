/**
 * Auth Health Check and Monitoring
 * 
 * Provides health checks and metrics for the authentication system.
 * Helps diagnose auth issues and monitor system health.
 */

import type { Request, Response } from 'express';

interface AuthHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: number;
  checks: {
    config: { status: 'pass' | 'fail'; message: string };
    oidc: { status: 'pass' | 'fail'; message: string; latency?: number };
    session: { status: 'pass' | 'fail'; message: string };
    database: { status: 'pass' | 'fail'; message: string };
  };
  metrics?: {
    activeSessions: number;
    totalLogins: number;
    failedLogins: number;
    tokenRefreshes: number;
    averageLatency: number;
  };
}

// Metrics tracking
const authMetrics = {
  totalLogins: 0,
  failedLogins: 0,
  tokenRefreshes: 0,
  latencies: [] as number[],
  maxLatencyHistory: 100,
};

export function trackLogin(success: boolean, latency?: number): void {
  if (success) {
    authMetrics.totalLogins++;
  } else {
    authMetrics.failedLogins++;
  }
  
  if (latency !== undefined) {
    authMetrics.latencies.push(latency);
    if (authMetrics.latencies.length > authMetrics.maxLatencyHistory) {
      authMetrics.latencies.shift();
    }
  }
}

export function trackTokenRefresh(): void {
  authMetrics.tokenRefreshes++;
}

export function getAuthMetrics() {
  const avgLatency = authMetrics.latencies.length > 0
    ? authMetrics.latencies.reduce((a, b) => a + b, 0) / authMetrics.latencies.length
    : 0;
  
  return {
    totalLogins: authMetrics.totalLogins,
    failedLogins: authMetrics.failedLogins,
    tokenRefreshes: authMetrics.tokenRefreshes,
    averageLatency: Math.round(avgLatency),
    successRate: authMetrics.totalLogins > 0 
      ? Math.round((authMetrics.totalLogins / (authMetrics.totalLogins + authMetrics.failedLogins)) * 100)
      : 0,
  };
}

/**
 * Auth health check endpoint handler
 */
export async function authHealthCheck(req: Request, res: Response): Promise<void> {
  const health: AuthHealth = {
    status: 'healthy',
    timestamp: Date.now(),
    checks: {
      config: { status: 'pass', message: 'Config loaded' },
      oidc: { status: 'pass', message: 'OIDC available' },
      session: { status: 'pass', message: 'Session store active' },
      database: { status: 'pass', message: 'Database connected' },
    },
  };

  // Check configuration
  try {
    const { loadAuthConfig } = await import('./auth-config');
    const config = loadAuthConfig(true);
    
    if (!config.enabled) {
      health.checks.config = { status: 'fail', message: 'Auth disabled' };
      health.status = 'down';
    }
  } catch (error: any) {
    health.checks.config = { status: 'fail', message: error.message };
    health.status = 'degraded';
  }

  // Check OIDC discovery endpoint
  try {
    const issuerUrl = process.env.ISSUER_URL || 'https://replit.com/oidc';
    const startTime = Date.now();
    
    const response = await fetch(`${issuerUrl}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      health.checks.oidc = { 
        status: 'pass', 
        message: 'OIDC provider reachable',
        latency,
      };
    } else {
      health.checks.oidc = { 
        status: 'fail', 
        message: `OIDC provider returned ${response.status}`,
      };
      health.status = 'degraded';
    }
  } catch (error: any) {
    health.checks.oidc = { 
      status: 'fail', 
      message: `OIDC unreachable: ${error.message}`,
    };
    health.status = 'degraded';
  }

  // Check session store (basic check - we're using in-memory)
  if (!process.env.SESSION_SECRET) {
    health.checks.session = { status: 'fail', message: 'SESSION_SECRET not set' };
    health.status = 'down';
  }

  // Check database
  try {
    const { db } = await import('./db');
    if (db) {
      await db.execute('SELECT 1');
      health.checks.database = { status: 'pass', message: 'Database connected' };
    } else {
      health.checks.database = { status: 'fail', message: 'Database not configured' };
      health.status = 'degraded';
    }
  } catch (error: any) {
    health.checks.database = { status: 'fail', message: error.message };
    health.status = 'degraded';
  }

  // Add metrics if requested
  if (req.query.metrics === 'true') {
    health.metrics = {
      activeSessions: 0, // TODO: Track this if needed
      ...getAuthMetrics(),
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
}

/**
 * Auth troubleshooting guide
 */
export const authTroubleshootingGuide = {
  'SESSION_SECRET not set': {
    problem: 'SESSION_SECRET environment variable is missing',
    solution: 'Add SESSION_SECRET to Replit Secrets with a random 32+ character string',
    command: 'openssl rand -base64 32',
  },
  'REPL_ID not set': {
    problem: 'REPL_ID environment variable is missing',
    solution: 'REPL_ID is automatically set by Replit. If missing, ensure you are running on Replit.',
  },
  'OIDC unreachable': {
    problem: 'Cannot connect to Replit OIDC provider',
    solution: 'Check network connectivity and firewall rules. Verify ISSUER_URL is correct.',
  },
  'Database not configured': {
    problem: 'PostgreSQL database is not set up',
    solution: 'Provision a PostgreSQL database in Replit and set DATABASE_URL in Secrets.',
  },
  'Token refresh failed': {
    problem: 'Refresh token is invalid or expired',
    solution: 'User needs to log in again. Ensure offline_access scope is included.',
  },
  'Rate limit exceeded': {
    problem: 'Too many authentication requests',
    solution: 'Wait 15 minutes and try again. Check for authentication loops in client code.',
  },
  'Redirect URI mismatch': {
    problem: 'OAuth redirect URI does not match registered URI',
    solution: 'Ensure REDIRECT_URI_BASE matches your deployed domain (https://your-app.replit.app)',
  },
};

/**
 * Get troubleshooting info for an error
 */
export function getTroubleshootingInfo(errorMessage: string): any {
  for (const [key, value] of Object.entries(authTroubleshootingGuide)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return null;
}
