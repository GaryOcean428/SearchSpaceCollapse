/**
 * Replit Auth Configuration
 * 
 * Centralized auth configuration with validation and defaults.
 * Addresses environment variable loading issues and provides
 * clear error messages for misconfiguration.
 */

import {
  MIN_SESSION_SECRET_LENGTH,
  DEFAULT_SESSION_TTL,
  DEFAULT_TOKEN_REFRESH_BUFFER,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BACKOFF_MS,
  DEFAULT_ISSUER_URL,
  DEFAULT_SCOPES,
} from './auth-constants';

export interface AuthConfig {
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  sessionSecret: string;
  sessionTtl: number;
  tokenRefreshBuffer: number; // seconds before expiry to refresh
  maxRetries: number;
  retryBackoffMs: number;
  redirectUriBase: string | null; // Override for strict URI matching
  scopes: string[];
  trustedOrigins: string[];
}

/**
 * Validate and load auth configuration from environment
 * Throws clear errors if required variables are missing
 */
export function loadAuthConfig(dbAvailable: boolean): AuthConfig {
  const isDev = process.env.NODE_ENV === 'development';
  const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
  
  // Auth requires database for user storage
  if (!dbAvailable) {
    console.log('[AuthConfig] Auth disabled - database not available');
    return {
      enabled: false,
      issuerUrl: '',
      clientId: '',
      sessionSecret: '',
      sessionTtl: 0,
      tokenRefreshBuffer: 300,
      maxRetries: 3,
      retryBackoffMs: 1000,
      redirectUriBase: null,
      scopes: [],
      trustedOrigins: [],
    };
  }

  // Check for required environment variables
  const requiredVars: Record<string, string | undefined> = {
    REPL_ID: process.env.REPL_ID,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };

  const missing: string[] = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[AuthConfig] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[AuthConfig] Auth will be disabled. Set these variables in Replit Secrets.');
    
    // Don't throw in production - gracefully disable auth
    if (isDeployment) {
      console.warn('[AuthConfig] Running without authentication in production!');
    }
    
    return {
      enabled: false,
      issuerUrl: '',
      clientId: '',
      sessionSecret: '',
      sessionTtl: 0,
      tokenRefreshBuffer: 300,
      maxRetries: 3,
      retryBackoffMs: 1000,
      redirectUriBase: null,
      scopes: [],
      trustedOrigins: [],
    };
  }

  // Load configuration with defaults
  const config: AuthConfig = {
    enabled: true,
    issuerUrl: process.env.ISSUER_URL || DEFAULT_ISSUER_URL,
    clientId: process.env.REPL_ID!,
    sessionSecret: process.env.SESSION_SECRET!,
    sessionTtl: parseInt(process.env.SESSION_TTL || String(DEFAULT_SESSION_TTL), 10),
    tokenRefreshBuffer: parseInt(process.env.TOKEN_REFRESH_BUFFER || String(DEFAULT_TOKEN_REFRESH_BUFFER), 10),
    maxRetries: parseInt(process.env.AUTH_MAX_RETRIES || String(DEFAULT_MAX_RETRIES), 10),
    retryBackoffMs: parseInt(process.env.AUTH_RETRY_BACKOFF || String(DEFAULT_RETRY_BACKOFF_MS), 10),
    redirectUriBase: process.env.REDIRECT_URI_BASE || null, // e.g., https://your-app.replit.app
    scopes: (process.env.AUTH_SCOPES || DEFAULT_SCOPES.join(' ')).split(' '),
    trustedOrigins: [
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ],
  };

  // Log configuration (without secrets)
  console.log('[AuthConfig] Auth enabled with configuration:');
  console.log(`  Issuer: ${config.issuerUrl}`);
  console.log(`  Client ID: ${config.clientId.substring(0, 8)}...`);
  console.log(`  Session TTL: ${config.sessionTtl}ms`);
  console.log(`  Token Refresh Buffer: ${config.tokenRefreshBuffer}s`);
  console.log(`  Scopes: ${config.scopes.join(', ')}`);
  console.log(`  Redirect URI Base: ${config.redirectUriBase || 'dynamic (from request)'}`);

  return config;
}

/**
 * Check if an origin should be trusted for CORS
 */
export function isTrustedOrigin(origin: string | undefined, config: AuthConfig): boolean {
  if (!origin) return false;
  
  // Check configured origins
  if (config.trustedOrigins.includes(origin)) return true;
  
  // Check Replit domains
  return (
    origin.endsWith('.replit.dev') ||
    origin.endsWith('.replit.app') ||
    origin.endsWith('.repl.co') ||
    origin.includes('.picard.replit.dev')
  );
}

/**
 * Normalize redirect URI to handle trailing slashes and protocol mismatches
 */
export function normalizeRedirectUri(uri: string): string {
  // Remove trailing slash for consistency
  const normalized = uri.replace(/\/$/, '');
  
  // Ensure HTTPS in production (Replit deployments)
  if (process.env.REPLIT_DEPLOYMENT === '1' && normalized.startsWith('http://')) {
    return normalized.replace('http://', 'https://');
  }
  
  return normalized;
}

/**
 * Determine protocol for Replit environments
 * Replit uses a reverse proxy that terminates HTTPS - always use HTTPS for Replit domains
 */
function getProtocolForHost(hostname: string): string {
  // Replit domains are always accessed via HTTPS (proxy terminates SSL)
  const isReplitDomain = 
    hostname.endsWith('.replit.dev') ||
    hostname.endsWith('.replit.app') ||
    hostname.endsWith('.repl.co') ||
    hostname.includes('.picard.');
  
  // Always HTTPS for Replit, or if explicitly deployed
  if (isReplitDomain || process.env.REPLIT_DEPLOYMENT === '1') {
    return 'https';
  }
  
  // Local development
  return 'http';
}

/**
 * Build redirect URI from request or config
 */
export function buildRedirectUri(hostname: string, config: AuthConfig): string {
  const protocol = getProtocolForHost(hostname);
  const base = config.redirectUriBase || `${protocol}://${hostname}`;
  return normalizeRedirectUri(`${base}/api/callback`);
}

/**
 * Get post-logout redirect URI
 */
export function buildPostLogoutUri(hostname: string, config: AuthConfig): string {
  const protocol = getProtocolForHost(hostname);
  const base = config.redirectUriBase || `${protocol}://${hostname}`;
  return normalizeRedirectUri(base);
}

/**
 * Validate session secret strength
 */
export function validateSessionSecret(secret: string): { valid: boolean; reason?: string } {
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    return { valid: false, reason: `Session secret must be at least ${MIN_SESSION_SECRET_LENGTH} characters` };
  }
  
  // Check for common weak patterns
  if (secret === 'your-secret-here' || secret.includes('example') || secret.includes('change-me')) {
    return { valid: false, reason: 'Session secret appears to be a placeholder' };
  }
  
  return { valid: true };
}
