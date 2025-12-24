/**
 * Auth Constants
 * 
 * Shared constants for authentication system.
 * Centralized to avoid duplication and ensure consistency.
 */

// Session configuration
export const MIN_SESSION_SECRET_LENGTH = 32;
export const DEFAULT_SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const DEFAULT_TOKEN_REFRESH_BUFFER = 300; // 5 minutes

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_LOGIN_ATTEMPTS = 5;
export const MAX_CALLBACK_ATTEMPTS = 20;
export const MAX_AUTH_ATTEMPTS = 10;
export const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour
export const LOCKOUT_THRESHOLD = 10;

// Retry configuration
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_BACKOFF_MS = 1000;

// OAuth configuration
export const DEFAULT_ISSUER_URL = 'https://replit.com/oidc';
export const DEFAULT_SCOPES = ['openid', 'email', 'profile', 'offline_access'];

// Monitoring
export const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_AUDIT_LOGS = 1000;
export const MAX_LATENCY_HISTORY = 100;
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
