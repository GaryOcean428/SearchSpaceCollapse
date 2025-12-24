/**
 * Replit Auth Configuration
 * 
 * Centralized auth configuration with validation and defaults.
 * Addresses environment variable loading issues and provides
 * clear error messages for misconfiguration.
 */

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
    issuerUrl: process.env.ISSUER_URL || 'https://replit.com/oidc',
    clientId: process.env.REPL_ID!,
    sessionSecret: process.env.SESSION_SECRET!,
    sessionTtl: parseInt(process.env.SESSION_TTL || '604800000', 10), // 7 days default
    tokenRefreshBuffer: parseInt(process.env.TOKEN_REFRESH_BUFFER || '300', 10), // 5 min buffer
    maxRetries: parseInt(process.env.AUTH_MAX_RETRIES || '3', 10),
    retryBackoffMs: parseInt(process.env.AUTH_RETRY_BACKOFF || '1000', 10),
    redirectUriBase: process.env.REDIRECT_URI_BASE || null, // e.g., https://your-app.replit.app
    scopes: (process.env.AUTH_SCOPES || 'openid email profile offline_access').split(' '),
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
 * Build redirect URI from request or config
 */
export function buildRedirectUri(hostname: string, config: AuthConfig): string {
  const protocol = process.env.REPLIT_DEPLOYMENT === '1' ? 'https' : 'http';
  const base = config.redirectUriBase || `${protocol}://${hostname}`;
  return normalizeRedirectUri(`${base}/api/callback`);
}

/**
 * Get post-logout redirect URI
 */
export function buildPostLogoutUri(hostname: string, config: AuthConfig): string {
  const protocol = process.env.REPLIT_DEPLOYMENT === '1' ? 'https' : 'http';
  const base = config.redirectUriBase || `${protocol}://${hostname}`;
  return normalizeRedirectUri(base);
}

/**
 * Validate session secret strength
 */
export function validateSessionSecret(secret: string): { valid: boolean; reason?: string } {
  if (secret.length < 32) {
    return { valid: false, reason: 'Session secret must be at least 32 characters' };
  }
  
  // Check for common weak patterns
  if (secret === 'your-secret-here' || secret.includes('example') || secret.includes('change-me')) {
    return { valid: false, reason: 'Session secret appears to be a placeholder' };
  }
  
  return { valid: true };
}
