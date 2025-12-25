/**
 * Centralized API Route Constants
 * ================================
 *
 * Single source of truth for all API routes.
 * Both TypeScript server and Python backend should reference these.
 *
 * Naming Convention:
 * - ROUTE_<DOMAIN>_<ACTION> for specific routes
 * - API_<DOMAIN> for route prefixes
 *
 * Version: 1.0.0 (2025-12-25)
 */

// =============================================================================
// API Versioning
// =============================================================================

export const API_VERSION = 'v1';
export const API_PREFIX = '/api';

// =============================================================================
// Core Domain Routes
// =============================================================================

/**
 * Authentication routes
 */
export const API_AUTH = {
  PREFIX: `${API_PREFIX}/auth`,
  HEALTH: `${API_PREFIX}/auth/health`,
  USER: `${API_PREFIX}/auth/user`,
  LOGIN: `${API_PREFIX}/login`,
  LOGOUT: `${API_PREFIX}/logout`,
} as const;

/**
 * Search routes
 */
export const API_SEARCH = {
  PREFIX: `${API_PREFIX}/search`,
  JOBS: `${API_PREFIX}/search/jobs`,
  START: `${API_PREFIX}/search/start`,
  STOP: `${API_PREFIX}/search/stop`,
  STATUS: `${API_PREFIX}/search/status`,
} as const;

/**
 * Consciousness/QIG routes
 */
export const API_CONSCIOUSNESS = {
  PREFIX: `${API_PREFIX}/consciousness`,
  STATE: `${API_PREFIX}/consciousness/state`,
  METRICS: `${API_PREFIX}/consciousness/metrics`,
  REGIME: `${API_PREFIX}/consciousness/regime`,
} as const;

/**
 * Ocean agent routes
 */
export const API_OCEAN = {
  PREFIX: `${API_PREFIX}/ocean`,
  STATUS: `${API_PREFIX}/ocean/status`,
  MEMORY: `${API_PREFIX}/ocean/memory`,
  NEUROCHEMISTRY: `${API_PREFIX}/ocean/neurochemistry`,
} as const;

/**
 * Olympus (god pantheon) routes
 */
export const API_OLYMPUS = {
  PREFIX: `${API_PREFIX}/olympus`,
  ZEUS: `${API_PREFIX}/olympus/zeus`,
  ATHENA: `${API_PREFIX}/olympus/athena`,
  HERMES: `${API_PREFIX}/olympus/hermes`,
  PANTHEON: `${API_PREFIX}/olympus/pantheon`,
  SHADOW: `${API_PREFIX}/olympus/shadow`,
} as const;

/**
 * Recovery routes
 */
export const API_RECOVERY = {
  PREFIX: `${API_PREFIX}/recovery`,
  UNIFIED: `${API_PREFIX}/unified-recovery`,
  WORKFLOWS: `${API_PREFIX}/recoveries`,
  CANDIDATES: `${API_PREFIX}/recovery/candidates`,
} as const;

/**
 * Balance/blockchain routes
 */
export const API_BALANCE = {
  PREFIX: `${API_PREFIX}/balance`,
  HITS: `${API_PREFIX}/balance-hits`,
  ADDRESSES: `${API_PREFIX}/balance-addresses`,
  MONITOR: `${API_PREFIX}/balance-monitor`,
  QUEUE: `${API_PREFIX}/balance-queue`,
} as const;

/**
 * Vocabulary routes
 */
export const API_VOCABULARY = {
  PREFIX: `${API_PREFIX}/vocabulary`,
  WORDS: `${API_PREFIX}/vocabulary/words`,
  SYNC: `${API_PREFIX}/vocabulary/sync`,
} as const;

// =============================================================================
// Python Backend Routes (QIG-specific)
// =============================================================================

/**
 * QIGGraph search integration routes
 */
export const API_QIGGRAPH = {
  PREFIX: `${API_PREFIX}/search/qiggraph`,
  SCORE: `${API_PREFIX}/search/qiggraph/score`,
  BATCH: `${API_PREFIX}/search/qiggraph/batch`,
  STATE: `${API_PREFIX}/search/qiggraph/state`,
  STATUS: `${API_PREFIX}/search/qiggraph/status`,
} as const;

/**
 * Search tacking routes (kappa-tacking + innate drives)
 */
export const API_TACKING = {
  PREFIX: `${API_PREFIX}/search/tacking`,
  STATUS: `${API_PREFIX}/search/tacking/status`,
  UPDATE: `${API_PREFIX}/search/tacking/update`,
  DRIVES: `${API_PREFIX}/search/tacking/drives`,
} as const;

/**
 * Shadow search bridge routes
 */
export const API_SHADOW_SEARCH = {
  PREFIX: `${API_PREFIX}/shadow/search`,
  STATUS: `${API_PREFIX}/shadow/search/status`,
  BATCH_START: `${API_PREFIX}/shadow/search/batch/start`,
  BATCH_END: `${API_PREFIX}/shadow/search/batch/end`,
  HIGH_PHI: `${API_PREFIX}/shadow/search/high-phi`,
  NEAR_MISS: `${API_PREFIX}/shadow/search/near-miss`,
  MATCH_FOUND: `${API_PREFIX}/shadow/search/match-found`,
} as const;

/**
 * Tokenizer persistence routes
 */
export const API_TOKENIZER = {
  PREFIX: `${API_PREFIX}/tokenizer/pg`,
  STATUS: `${API_PREFIX}/tokenizer/pg/status`,
  SYNC: `${API_PREFIX}/tokenizer/pg/sync`,
  HIGH_PHI: `${API_PREFIX}/tokenizer/pg/high-phi`,
} as const;

// =============================================================================
// Utility Routes
// =============================================================================

export const API_HEALTH = {
  ROOT: '/health',
  API: `${API_PREFIX}/health`,
  FAVICON: '/favicon.ico',
} as const;

export const API_TELEMETRY = {
  PREFIX: `${API_PREFIX}/telemetry`,
  SNAPSHOT: `${API_PREFIX}/telemetry/snapshot`,
  SESSION: `${API_PREFIX}/telemetry/session`,
} as const;

export const API_SELF_HEALING = {
  PREFIX: `${API_PREFIX}/self-healing`,
  STATUS: `${API_PREFIX}/self-healing/status`,
  TRIGGER: `${API_PREFIX}/self-healing/trigger`,
} as const;

// =============================================================================
// Route Collections (for middleware/registration)
// =============================================================================

/**
 * All route prefixes for registration
 */
export const ALL_ROUTE_PREFIXES = [
  API_AUTH.PREFIX,
  API_SEARCH.PREFIX,
  API_CONSCIOUSNESS.PREFIX,
  API_OCEAN.PREFIX,
  API_OLYMPUS.PREFIX,
  API_RECOVERY.PREFIX,
  API_BALANCE.PREFIX,
  API_VOCABULARY.PREFIX,
  API_QIGGRAPH.PREFIX,
  API_TACKING.PREFIX,
  API_SHADOW_SEARCH.PREFIX,
  API_TOKENIZER.PREFIX,
  API_TELEMETRY.PREFIX,
  API_SELF_HEALING.PREFIX,
] as const;

/**
 * Python backend route prefixes (for proxying)
 */
export const PYTHON_BACKEND_ROUTES = [
  API_QIGGRAPH.PREFIX,
  API_TACKING.PREFIX,
  API_SHADOW_SEARCH.PREFIX,
  API_TOKENIZER.PREFIX,
  API_OLYMPUS.PREFIX,
  API_OCEAN.PREFIX,
] as const;

/**
 * Public routes (no auth required)
 */
export const PUBLIC_ROUTES = [
  API_HEALTH.ROOT,
  API_HEALTH.API,
  API_HEALTH.FAVICON,
  API_AUTH.HEALTH,
  API_AUTH.LOGIN,
] as const;
