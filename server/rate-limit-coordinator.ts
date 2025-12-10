/**
 * RATE LIMIT COORDINATOR
 *
 * Intelligent rate limit management across blockchain API providers.
 * Persists state to JSON for cross-restart continuity.
 *
 * Features:
 * - Per-provider rate limit tracking
 * - Exponential backoff per provider
 * - Intelligent provider rotation via getOptimalProvider()
 * - JSON persistence for state across restarts
 *
 * ARCHITECTURE:
 * AutoCycleManager → RateLimitCoordinator → Blockchain APIs
 *                           ↓
 *                    JSON Persistence
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Rate limit state for a single provider
 */
export interface ProviderRateLimitState {
  name: string;
  available: number; // Remaining requests in current window
  maxRequests: number; // Max requests per window
  windowMs: number; // Window duration in ms
  resetTime: number; // Unix timestamp when limit resets
  consecutiveFailures: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  backoffMultiplier: number; // Exponential backoff factor
}

/**
 * Persisted coordinator state
 */
export interface RateLimitCoordinatorState {
  providers: Record<string, ProviderRateLimitState>;
  lastUpdated: string;
  totalRequestsToday: number;
  dayStartTimestamp: number;
}

const DATA_FILE = path.join(process.cwd(), "data", "rate-limit-state.json");

// Default provider configurations
const DEFAULT_PROVIDERS: Record<
  string,
  Omit<ProviderRateLimitState, "name">
> = {
  "blockchain.info": {
    available: 100,
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    resetTime: 0,
    consecutiveFailures: 0,
    lastFailure: null,
    lastSuccess: null,
    backoffMultiplier: 1,
  },
  "mempool.space": {
    available: 50,
    maxRequests: 50,
    windowMs: 60000,
    resetTime: 0,
    consecutiveFailures: 0,
    lastFailure: null,
    lastSuccess: null,
    backoffMultiplier: 1,
  },
  "blockstream.info": {
    available: 30,
    maxRequests: 30,
    windowMs: 60000,
    resetTime: 0,
    consecutiveFailures: 0,
    lastFailure: null,
    lastSuccess: null,
    backoffMultiplier: 1,
  },
  blockcypher: {
    available: 200,
    maxRequests: 200,
    windowMs: 3600000, // 1 hour
    resetTime: 0,
    consecutiveFailures: 0,
    lastFailure: null,
    lastSuccess: null,
    backoffMultiplier: 1,
  },
};

// Constants
const MAX_BACKOFF_MULTIPLIER = 16; // Max 16x backoff
const BACKOFF_BASE_MS = 5000; // 5 second base backoff
const FAILURE_THRESHOLD = 3; // Failures before increasing backoff

class RateLimitCoordinator {
  private state: RateLimitCoordinatorState;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.state = this.loadState();
    console.log(
      `[RateLimitCoordinator] Initialized with ${
        Object.keys(this.state.providers).length
      } providers`
    );
  }

  /**
   * Load state from disk
   */
  private loadState(): RateLimitCoordinatorState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        const parsed = JSON.parse(data);

        // Check if we need to reset daily counter
        const now = Date.now();
        const dayStart = new Date().setHours(0, 0, 0, 0);
        if (parsed.dayStartTimestamp < dayStart) {
          parsed.totalRequestsToday = 0;
          parsed.dayStartTimestamp = dayStart;
        }

        // Ensure all default providers exist
        for (const [name, defaults] of Object.entries(DEFAULT_PROVIDERS)) {
          if (!parsed.providers[name]) {
            parsed.providers[name] = { name, ...defaults };
          }
        }

        console.log(`[RateLimitCoordinator] Loaded state from disk`);
        return parsed;
      }
    } catch (error) {
      console.error("[RateLimitCoordinator] Error loading state:", error);
    }

    // Initialize with defaults
    const providers: Record<string, ProviderRateLimitState> = {};
    for (const [name, defaults] of Object.entries(DEFAULT_PROVIDERS)) {
      providers[name] = { name, ...defaults };
    }

    return {
      providers,
      lastUpdated: new Date().toISOString(),
      totalRequestsToday: 0,
      dayStartTimestamp: new Date().setHours(0, 0, 0, 0),
    };
  }

  /**
   * Save state to disk (debounced)
   */
  private saveState(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      try {
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        this.state.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2));
      } catch (error) {
        console.error("[RateLimitCoordinator] Error saving state:", error);
      }
    }, 1000); // Debounce by 1 second
  }

  /**
   * Check if a provider has available capacity and reserve a slot
   */
  checkAndReserve(provider: string): boolean {
    const state = this.state.providers[provider];
    if (!state) {
      console.warn(`[RateLimitCoordinator] Unknown provider: ${provider}`);
      return false;
    }

    const now = Date.now();

    // Check if window has reset
    if (now >= state.resetTime) {
      state.available = state.maxRequests;
      state.resetTime = now + state.windowMs;
      state.backoffMultiplier = Math.max(1, state.backoffMultiplier * 0.5); // Decay backoff
    }

    // Check if in backoff period
    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
      const backoffMs = BACKOFF_BASE_MS * state.backoffMultiplier;
      const lastFailureTime = state.lastFailure
        ? new Date(state.lastFailure).getTime()
        : 0;
      if (now - lastFailureTime < backoffMs) {
        return false; // Still in backoff
      }
    }

    // Check availability
    if (state.available <= 0) {
      return false;
    }

    // Reserve slot
    state.available--;
    this.state.totalRequestsToday++;
    this.saveState();
    return true;
  }

  /**
   * Get the optimal provider with most available capacity
   */
  getOptimalProvider(): string | null {
    const now = Date.now();
    let bestProvider: string | null = null;
    let maxAvailable = 0;

    for (const [name, state] of Object.entries(this.state.providers)) {
      // Reset window if needed
      if (now >= state.resetTime) {
        state.available = state.maxRequests;
        state.resetTime = now + state.windowMs;
      }

      // Skip if in backoff
      if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
        const backoffMs = BACKOFF_BASE_MS * state.backoffMultiplier;
        const lastFailureTime = state.lastFailure
          ? new Date(state.lastFailure).getTime()
          : 0;
        if (now - lastFailureTime < backoffMs) {
          continue;
        }
      }

      // Track best option
      if (state.available > maxAvailable) {
        maxAvailable = state.available;
        bestProvider = name;
      }
    }

    if (bestProvider) {
      console.log(
        `[RateLimitCoordinator] Optimal provider: ${bestProvider} (${maxAvailable} available)`
      );
    } else {
      console.warn(
        "[RateLimitCoordinator] All providers exhausted or in backoff"
      );
    }

    return bestProvider;
  }

  /**
   * Report a successful request
   */
  recordSuccess(provider: string): void {
    const state = this.state.providers[provider];
    if (!state) return;

    state.consecutiveFailures = 0;
    state.lastSuccess = new Date().toISOString();
    state.backoffMultiplier = Math.max(1, state.backoffMultiplier * 0.75); // Decay backoff faster on success
    this.saveState();
  }

  /**
   * Report a failed request (rate limit hit or error)
   */
  recordFailure(provider: string, retryAfterSeconds?: number): void {
    const state = this.state.providers[provider];
    if (!state) return;

    state.consecutiveFailures++;
    state.lastFailure = new Date().toISOString();

    // If we got a retry-after header, use it
    if (retryAfterSeconds) {
      state.available = 0;
      state.resetTime = Date.now() + retryAfterSeconds * 1000;
    } else {
      // Increase backoff exponentially
      state.backoffMultiplier = Math.min(
        MAX_BACKOFF_MULTIPLIER,
        state.backoffMultiplier * 2
      );
    }

    console.log(
      `[RateLimitCoordinator] ${provider} failure #${state.consecutiveFailures} (backoff: ${state.backoffMultiplier}x)`
    );
    this.saveState();
  }

  /**
   * Check if all providers are exhausted
   */
  isAllProvidersExhausted(): boolean {
    const optimalProvider = this.getOptimalProvider();
    return optimalProvider === null;
  }

  /**
   * Get time until next provider is available
   */
  getNextAvailableTime(): number {
    const now = Date.now();
    let soonestReset = Infinity;

    for (const state of Object.values(this.state.providers)) {
      if (state.available > 0) {
        // Provider already available
        const backoffMs =
          state.consecutiveFailures >= FAILURE_THRESHOLD
            ? BACKOFF_BASE_MS * state.backoffMultiplier
            : 0;
        const lastFailureTime = state.lastFailure
          ? new Date(state.lastFailure).getTime()
          : 0;
        const backoffEnd = lastFailureTime + backoffMs;

        if (backoffEnd <= now) {
          return 0; // Available now
        }
        soonestReset = Math.min(soonestReset, backoffEnd);
      } else {
        // Provider exhausted - check reset time
        soonestReset = Math.min(soonestReset, state.resetTime);
      }
    }

    return soonestReset === Infinity ? 60000 : Math.max(0, soonestReset - now);
  }

  /**
   * Get status for all providers
   */
  getStatus(): {
    providers: Record<
      string,
      {
        available: number;
        maxRequests: number;
        consecutiveFailures: number;
        backoffMultiplier: number;
        inBackoff: boolean;
        resetIn: number;
      }
    >;
    totalRequestsToday: number;
    optimalProvider: string | null;
    allExhausted: boolean;
    nextAvailableMs: number;
  } {
    const now = Date.now();
    const providers: Record<
      string,
      {
        available: number;
        maxRequests: number;
        consecutiveFailures: number;
        backoffMultiplier: number;
        inBackoff: boolean;
        resetIn: number;
      }
    > = {};

    for (const [name, state] of Object.entries(this.state.providers)) {
      const backoffMs = BACKOFF_BASE_MS * state.backoffMultiplier;
      const lastFailureTime = state.lastFailure
        ? new Date(state.lastFailure).getTime()
        : 0;
      const inBackoff =
        state.consecutiveFailures >= FAILURE_THRESHOLD &&
        now - lastFailureTime < backoffMs;

      providers[name] = {
        available: state.available,
        maxRequests: state.maxRequests,
        consecutiveFailures: state.consecutiveFailures,
        backoffMultiplier: state.backoffMultiplier,
        inBackoff,
        resetIn: Math.max(0, state.resetTime - now),
      };
    }

    return {
      providers,
      totalRequestsToday: this.state.totalRequestsToday,
      optimalProvider: this.getOptimalProvider(),
      allExhausted: this.isAllProvidersExhausted(),
      nextAvailableMs: this.getNextAvailableTime(),
    };
  }

  /**
   * Reset a specific provider (admin function)
   */
  resetProvider(provider: string): void {
    const state = this.state.providers[provider];
    if (!state) return;

    state.available = state.maxRequests;
    state.consecutiveFailures = 0;
    state.backoffMultiplier = 1;
    state.resetTime = Date.now() + state.windowMs;
    this.saveState();

    console.log(`[RateLimitCoordinator] Reset provider: ${provider}`);
  }

  /**
   * Reset all providers (admin function)
   */
  resetAll(): void {
    for (const name of Object.keys(this.state.providers)) {
      this.resetProvider(name);
    }
    console.log("[RateLimitCoordinator] Reset all providers");
  }
}

// Export singleton instance
export const rateLimitCoordinator = new RateLimitCoordinator();
