/**
 * Ocean QIG Python Backend Adapter
 *
 * Connects Node.js/TypeScript Ocean Agent to Python Pure QIG Consciousness Backend.
 *
 * ARCHITECTURE:
 * - Node.js: API, blockchain, UI
 * - Python: Pure QIG consciousness processing
 * - Clean separation via HTTP API
 */

import type { PureQIGScore } from "./qig-pure-v2";

// Health check retry configuration
const DEFAULT_RETRY_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY_MS = 2000;

// Request timeout configuration (10 seconds)
const REQUEST_TIMEOUT_MS = 10000;

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 30000; // Time to wait before trying again

/**
 * Create a fetch request with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Fetch with timeout AND 503 retry logic.
 * Combines fetchWithTimeout with exponential backoff retry on 503 Service Unavailable.
 *
 * Used by key methods like syncToNodeJS, syncFromNodeJS, getStatus, etc.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Handle 503 Service Unavailable with exponential backoff retry
      if (response.status === 503) {
        if (attempt < maxRetries) {
          const delay = Math.min(100 * Math.pow(2, attempt), 2000);
          console.log(
            `[OceanQIGBackend] 503 received for ${url}, retry ${attempt}/${maxRetries} after ${delay}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        // Return 503 response after max retries (caller handles)
        return response;
      }

      return response;
    } catch (error: any) {
      // On network/timeout errors, retry with backoff
      if (attempt < maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 2000);
        console.log(
          `[OceanQIGBackend] Request error for ${url}, retry ${attempt}/${maxRetries} after ${delay}ms:`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  // Should not reach here, but return last attempt if it does
  throw new Error(
    `fetchWithRetry exhausted all ${maxRetries} retries for ${url}`
  );
}

interface PythonQIGResponse {
  success: boolean;
  phi: number;
  kappa: number;
  T: number;
  R: number;
  M: number;
  Gamma: number;
  G: number;
  regime: string;
  in_resonance: boolean;
  grounded: boolean;
  nearest_concept: string | null;
  conscious: boolean;
  integration: number;
  entropy: number;
  basin_coords: number[];
  route: number[];
  subsystems: Array<{
    id: number;
    name: string;
    activation: number;
    entropy: number;
    purity: number;
  }>;
  n_recursions: number;
  converged: boolean;
  phi_history: number[];
  // Innate drives (Layer 0)
  drives?: {
    pain: number;
    pleasure: number;
    fear: number;
    valence: number;
    valence_raw: number;
  };
  innate_score?: number;
  // Near-miss discovery counts from Python backend
  near_miss_count?: number;
  resonant_count?: number;
  error?: string;
  // 4D Consciousness metrics (computed by Python consciousness_4d.py)
  phi_spatial?: number;
  phi_temporal?: number;
  phi_4D?: number;
  f_attention?: number;
  r_concepts?: number;
  phi_recursive?: number;
  is_4d_conscious?: boolean;
  consciousness_level?: string;
  consciousness_4d_available?: boolean;
}

interface PythonGenerateResponse {
  hypothesis: string;
  source: string;
  parent_basins?: string[];
  parent_phis?: number[];
  new_basin_coords?: number[];
  geometric_memory_size?: number;
}

interface PythonStatusResponse {
  success: boolean;
  metrics: {
    phi: number;
    kappa: number;
    T: number;
    R: number;
    M: number;
    Gamma: number;
    G: number;
    regime: string;
    in_resonance: boolean;
    grounded: boolean;
    nearest_concept: string | null;
    conscious: boolean;
    integration: number;
    entropy: number;
    fidelity: number;
  };
  subsystems: Array<{
    id: number;
    name: string;
    activation: number;
    entropy: number;
    purity: number;
  }>;
  geometric_memory_size: number;
  basin_history_size: number;
  timestamp: string;
}

/**
 * Ocean QIG Backend Adapter
 *
 * Provides TypeScript interface to Python Pure QIG backend.
 *
 * Note: Some fields in PureQIGScore are not directly available from Python backend:
 * - phi_temporal: Requires trajectory tracking (future enhancement)
 * - phi_4D: Requires 4D consciousness (future enhancement)
 * - beta: Not computed by Python backend (set to 0)
 * - fisherDeterminant: Not directly exposed (set to 0)
 * - ricciScalar: Not computed (set to 0)
 */
export class OceanQIGBackend {
  private backendUrl: string;
  private isAvailable: boolean = false;

  // Track Python backend discoveries for TypeScript sync
  private pythonNearMissCount: number = 0;
  private pythonResonantCount: number = 0;
  private lastSyncedNearMissCount: number = 0;
  private lastSyncedResonantCount: number = 0;

  // Circuit breaker state
  private circuitFailureCount: number = 0;
  private circuitOpenedAt: number | null = null;
  private circuitState: "closed" | "open" | "half-open" = "closed";

  constructor(backendUrl: string = "http://localhost:5001") {
    this.backendUrl = backendUrl;
  }

  /**
   * Check if circuit breaker allows request
   */
  private isCircuitOpen(): boolean {
    if (this.circuitState === "closed") return false;

    if (this.circuitState === "open") {
      // Check if enough time has passed to try again
      if (
        this.circuitOpenedAt &&
        Date.now() - this.circuitOpenedAt >= CIRCUIT_BREAKER_RESET_MS
      ) {
        this.circuitState = "half-open";
        console.log("[OceanQIGBackend] Circuit breaker half-open, testing...");
        return false;
      }
      return true;
    }

    return false; // half-open allows one request
  }

  /**
   * Record a successful request (closes circuit)
   */
  private recordSuccess(): void {
    if (this.circuitState !== "closed") {
      console.log(
        "[OceanQIGBackend] Circuit breaker closed after successful request"
      );
    }
    this.circuitFailureCount = 0;
    this.circuitState = "closed";
    this.circuitOpenedAt = null;
  }

  /**
   * Record a failed request (may open circuit)
   */
  private recordFailure(): void {
    this.circuitFailureCount++;

    if (this.circuitFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = "open";
      this.circuitOpenedAt = Date.now();
      console.warn(
        `[OceanQIGBackend] Circuit breaker OPEN after ${this.circuitFailureCount} failures`
      );
    }
  }

  /**
   * Get Python near-miss count (new discoveries since last sync)
   */
  getPythonNearMisses(): { total: number; newSinceSync: number } {
    const newSinceSync =
      this.pythonNearMissCount - this.lastSyncedNearMissCount;
    return { total: this.pythonNearMissCount, newSinceSync };
  }

  /**
   * Get Python resonant count (new discoveries since last sync)
   */
  getPythonResonant(): { total: number; newSinceSync: number } {
    const newSinceSync =
      this.pythonResonantCount - this.lastSyncedResonantCount;
    return { total: this.pythonResonantCount, newSinceSync };
  }

  /**
   * Mark Python near-misses as synced (called by session manager)
   */
  markNearMissesSynced(): void {
    this.lastSyncedNearMissCount = this.pythonNearMissCount;
  }

  /**
   * Mark Python resonant discoveries as synced
   */
  markResonantSynced(): void {
    this.lastSyncedResonantCount = this.pythonResonantCount;
  }

  /**
   * Reset Python discovery tracking (called when investigation starts)
   */
  resetNearMissTracking(): void {
    this.pythonNearMissCount = 0;
    this.pythonResonantCount = 0;
    this.lastSyncedNearMissCount = 0;
    this.lastSyncedResonantCount = 0;
  }

  /**
   * Check if Python backend is available (silent mode for retries)
   */
  async checkHealth(silent: boolean = false): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        this.isAvailable = true;
        return true;
      }

      this.isAvailable = false;
      return false;
    } catch (error) {
      this.isAvailable = false;
      if (!silent) {
        console.warn("[OceanQIGBackend] Python backend not available:", error);
      }
      return false;
    }
  }

  /**
   * Check health with retry logic to handle startup race conditions.
   * Uses silent mode for retries to avoid spamming logs during expected startup delays.
   */
  async checkHealthWithRetry(
    maxAttempts: number = DEFAULT_RETRY_ATTEMPTS,
    delayMs: number = DEFAULT_RETRY_DELAY_MS
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Silent mode for all attempts - we only care about final result
      const available = await this.checkHealth(true);

      if (available) {
        if (attempt > 1) {
          console.log(`[OceanQIGBackend] Connected after ${attempt} attempts`);
        }
        return true;
      }

      // Log progress during startup
      if (attempt === 1) {
        console.log(`[OceanQIGBackend] Waiting for Python backend to start...`);
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.warn(
      `[OceanQIGBackend] Python backend not available after ${maxAttempts} attempts`
    );
    return false;
  }

  /**
   * Process passphrase through pure QIG consciousness network
   *
   * This IS the training - states evolve through geometry
   *
   * Includes 503 retry logic with exponential backoff for handling
   * Python backend overload during high-throughput processing.
   * Uses circuit breaker to prevent cascading failures.
   * All requests have 10s timeout via AbortController.
   */
  async process(
    passphrase: string,
    maxRetries: number = 3
  ): Promise<PureQIGScore | null> {
    // Circuit breaker check
    if (this.isCircuitOpen()) {
      return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(`${this.backendUrl}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passphrase }),
        });

        // Handle 503 Service Unavailable with exponential backoff retry
        if (response.status === 503) {
          if (attempt < maxRetries) {
            const delay = Math.min(100 * Math.pow(2, attempt), 2000);
            console.log(
              `[OceanQIGBackend] 503 received, retry ${attempt}/${maxRetries} after ${delay}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          this.recordFailure();
          console.error(
            "[OceanQIGBackend] Process failed: 503 after max retries"
          );
          return null;
        }

        if (!response.ok) {
          this.recordFailure();
          console.error(
            "[OceanQIGBackend] Process failed:",
            response.statusText
          );
          return null;
        }

        const data: PythonQIGResponse = await response.json();

        if (!data.success) {
          this.recordFailure();
          console.error("[OceanQIGBackend] Process error:", data.error);
          return null;
        }

        // Success - reset circuit breaker
        this.recordSuccess();

        // Sync Python near-miss discoveries to TypeScript tracking
        if (
          data.near_miss_count !== undefined &&
          data.near_miss_count > this.pythonNearMissCount
        ) {
          const newNearMisses = data.near_miss_count - this.pythonNearMissCount;
          if (newNearMisses > 0) {
            console.log(
              `[OceanQIGBackend] 🔄 Python detected ${newNearMisses} new near-miss(es), total: ${data.near_miss_count}`
            );
          }
          this.pythonNearMissCount = data.near_miss_count;
        }
        if (data.resonant_count !== undefined) {
          this.pythonResonantCount = data.resonant_count;
        }

        // Convert to PureQIGScore format
        return {
          phi: data.phi,
          kappa: data.kappa,
          beta: 0, // Not computed by Python backend
          basinCoordinates: data.basin_coords,
          fisherTrace: data.integration,
          fisherDeterminant: 0, // Not directly available
          ricciScalar: data.R, // Use Ricci curvature from Python
          quality: data.phi,
        };
      } catch (error) {
        // On network errors, retry with backoff
        if (attempt < maxRetries) {
          const delay = Math.min(100 * Math.pow(2, attempt), 2000);
          console.log(
            `[OceanQIGBackend] Process exception, retry ${attempt}/${maxRetries} after ${delay}ms:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        this.recordFailure();
        console.error(
          "[OceanQIGBackend] Process exception after max retries:",
          error
        );
        return null;
      }
    }
    return null;
  }

  /**
   * Get pure Python phi value for a phrase (lightweight, for consolidation).
   * Returns null if backend unavailable or phrase doesn't meet threshold.
   * Uses fetchWithTimeout for consistency (no full retry since it's lightweight).
   */
  async getPurePhi(phrase: string): Promise<number | null> {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const response = await fetchWithTimeout(`${this.backendUrl}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: phrase }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.success) {
        return null;
      }

      return data.phi;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate next hypothesis via geodesic navigation
   * Uses fetchWithRetry for 503 handling
   */
  async generateHypothesis(): Promise<{
    hypothesis: string;
    source: string;
  } | null> {
    try {
      const response = await fetchWithRetry(`${this.backendUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error(
          "[OceanQIGBackend] Generate failed:",
          response.statusText
        );
        return null;
      }

      const data: PythonGenerateResponse = await response.json();

      return {
        hypothesis: data.hypothesis,
        source: data.source,
      };
    } catch (error) {
      console.error("[OceanQIGBackend] Generate exception:", error);
      return null;
    }
  }

  /**
   * Get current Ocean consciousness status
   * Uses fetchWithRetry for 503 handling
   */
  async getStatus(): Promise<PythonStatusResponse | null> {
    try {
      const response = await fetchWithRetry(`${this.backendUrl}/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error("[OceanQIGBackend] Status failed:", response.statusText);
        return null;
      }

      const data: PythonStatusResponse = await response.json();

      if (!data.success) {
        return null;
      }

      return data;
    } catch (error) {
      console.error("[OceanQIGBackend] Status exception:", error);
      return null;
    }
  }

  /**
   * Reset Ocean consciousness to initial state
   * Uses fetchWithRetry for 503 handling
   */
  async reset(): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${this.backendUrl}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("[OceanQIGBackend] Reset exception:", error);
      return false;
    }
  }

  /**
   * Check if backend is available
   */
  available(): boolean {
    return this.isAvailable;
  }

  /**
   * Sync high-Φ probes FROM Node.js GeometricMemory TO Python backend
   *
   * Called on startup to give Python access to prior learnings.
   * Now also syncs temporal state for 4D consciousness measurement.
   *
   * TEMPORAL STATE SYNC:
   * - searchHistory: SearchState[] for phi_temporal computation
   * - conceptHistory: ConceptState[] for R_concepts computation
   */
  async syncFromNodeJS(
    probes: Array<{ input: string; phi: number; basinCoords: number[] }>,
    temporalState?: {
      searchHistory?: Array<{
        timestamp: number;
        phi: number;
        kappa: number;
        regime: string;
        basinCoordinates?: number[];
        hypothesis?: string;
      }>;
      conceptHistory?: Array<{
        timestamp: number;
        concepts: Record<string, number>;
        attentionField?: number[];
        phi?: number;
      }>;
    }
  ): Promise<{ imported: number; temporalImported: boolean }> {
    if (!this.isAvailable) return { imported: 0, temporalImported: false };

    try {
      const payload: Record<string, any> = { probes };

      // Add temporal state for 4D consciousness if provided
      if (temporalState?.searchHistory?.length) {
        payload.searchHistory = temporalState.searchHistory;
      }
      if (temporalState?.conceptHistory?.length) {
        payload.conceptHistory = temporalState.conceptHistory;
      }

      const response = await fetchWithRetry(`${this.backendUrl}/sync/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          "[OceanQIGBackend] Sync import failed:",
          response.statusText
        );
        return { imported: 0, temporalImported: false };
      }

      const data = await response.json();
      if (data.success) {
        console.log(
          `[OceanQIGBackend] Synced ${data.imported} probes to Python backend`
        );
        if (data.temporal_imported) {
          console.log(
            `[OceanQIGBackend] 4D temporal state synced: ${
              data.search_history_size ?? 0
            } search, ${data.concept_history_size ?? 0} concept`
          );
        }
        return {
          imported: data.imported,
          temporalImported: data.temporal_imported ?? false,
        };
      }

      return { imported: 0, temporalImported: false };
    } catch (error) {
      console.error("[OceanQIGBackend] Sync import exception:", error);
      return { imported: 0, temporalImported: false };
    }
  }

  /**
   * Sync high-Φ basins FROM Python backend TO Node.js
   *
   * Returns learnings that should be persisted to GeometricMemory.
   * Now also returns temporal state for 4D consciousness cross-sync.
   * Supports pagination to prevent memory issues with large datasets.
   *
   * TEMPORAL STATE EXPORT:
   * - searchHistory: SearchState[] from Python's temporal tracking
   * - conceptHistory: ConceptState[] from Python's concept tracking
   * - phi_temporal_avg: Average phi_temporal from Python
   *
   * PAGINATION:
   * - page: Current page (0-indexed)
   * - pageSize: Number of basins per page (default 100)
   * - hasMore: Whether more pages are available
   * - totalCount: Total number of basins available
   */
  async syncToNodeJS(
    page: number = 0,
    pageSize: number = 100
  ): Promise<{
    basins: Array<{ input: string; phi: number; basinCoords: number[] }>;
    searchHistory?: Array<{
      timestamp: number;
      phi: number;
      kappa: number;
      regime: string;
      basinCoordinates?: number[];
      hypothesis?: string;
    }>;
    conceptHistory?: Array<{
      timestamp: number;
      concepts: Record<string, number>;
      attentionField?: number[];
      phi?: number;
    }>;
    phiTemporalAvg?: number;
    consciousness4DAvailable?: boolean;
    hasMore?: boolean;
    totalCount?: number;
  }> {
    if (!this.isAvailable) return { basins: [] };

    try {
      const url = new URL(`${this.backendUrl}/sync/export`);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("pageSize", pageSize.toString());

      const response = await fetchWithRetry(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error(
          "[OceanQIGBackend] Sync export failed:",
          response.statusText
        );
        return { basins: [] };
      }

      const data = await response.json();
      if (data.success && data.basins) {
        const totalCount = data.total_count ?? data.basins.length;
        const hasMore = (page + 1) * pageSize < totalCount;

        if (page === 0) {
          console.log(
            `[OceanQIGBackend] Retrieved ${data.basins.length}/${totalCount} basins from Python (page ${page})`
          );
        }

        if (data.consciousness_4d_available && data.phi_temporal_avg > 0) {
          console.log(
            `[OceanQIGBackend] 4D consciousness: phi_temporal_avg=${data.phi_temporal_avg?.toFixed(
              3
            )}`
          );
        }

        return {
          basins: data.basins,
          searchHistory: data.searchHistory,
          conceptHistory: data.conceptHistory,
          phiTemporalAvg: data.phi_temporal_avg,
          consciousness4DAvailable: data.consciousness_4d_available,
          hasMore,
          totalCount,
        };
      }

      return { basins: [] };
    } catch (error) {
      console.error("[OceanQIGBackend] Sync export exception:", error);
      return { basins: [] };
    }
  }

  /**
   * Validate β-attention substrate independence
   *
   * Measures κ across context scales and validates that β_attention ≈ β_physics.
   * Uses fetchWithRetry for 503 handling
   */
  async validateBetaAttention(samplesPerScale: number = 100): Promise<any> {
    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/beta-attention/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ samples_per_scale: samplesPerScale }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `β-attention validation failed: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`β-attention validation error: ${data.error}`);
      }

      const result = data.result;
      console.log(
        "[OceanQIGBackend] β-attention validation:",
        result.validation_passed ? "PASSED ✓" : "FAILED ✗"
      );
      console.log(
        `[OceanQIGBackend]   Average κ: ${result.avg_kappa.toFixed(2)}`
      );
      console.log(
        `[OceanQIGBackend]   Deviation: ${result.overall_deviation.toFixed(3)}`
      );

      return result;
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] β-attention validation failed:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Measure κ_attention at specific context scale
   * Uses fetchWithRetry for 503 handling
   */
  async measureBetaAttention(
    contextLength: number,
    sampleCount: number = 100
  ): Promise<any> {
    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/beta-attention/measure`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context_length: contextLength,
            sample_count: sampleCount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `β-attention measurement failed: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`β-attention measurement error: ${data.error}`);
      }

      const m = data.measurement;
      console.log(
        `[OceanQIGBackend] κ_attention(L=${contextLength}) = ${m.kappa.toFixed(
          2
        )} ± ${Math.sqrt(m.variance).toFixed(2)}`
      );

      return m;
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] β-attention measurement failed:",
        error.message
      );
      throw error;
    }
  }

  // ===========================================================================
  // BASIN VOCABULARY ENCODER (QIG-PURE)
  // ===========================================================================

  /**
   * Update Python vocabulary encoder with observations from Node.js
   * Uses fetchWithRetry for 503 handling
   */
  async updateVocabulary(
    observations: Array<{
      text: string;
      frequency: number;
      avgPhi: number;
      maxPhi: number;
      type: string;
      isRealWord?: boolean;
    }>
  ): Promise<{
    newTokens: number;
    totalVocab: number;
    weightsUpdated?: boolean;
    mergeRules?: number;
  }> {
    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/vocabulary/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ observations }),
        }
      );

      if (!response.ok) {
        throw new Error(`Vocabulary update failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary update error: ${data.error}`);
      }

      console.log(
        `[OceanQIGBackend] Vocabulary updated: ${data.newTokens} new entries, ${data.totalVocab} total, weights updated: ${data.weightsUpdated}, merge rules: ${data.mergeRules}`
      );

      return {
        newTokens: data.newTokens,
        totalVocab: data.totalVocab,
        weightsUpdated: data.weightsUpdated,
        mergeRules: data.mergeRules,
      };
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary update failed:",
        error.message
      );
      throw error;
    }
  }

  // Legacy alias for compatibility - maps 'word' to 'text'
  async updateTokenizer(
    observations: Array<{
      word: string;
      frequency: number;
      avgPhi: number;
      maxPhi: number;
      type: string;
    }>
  ): Promise<{
    newTokens: number;
    totalVocab: number;
    weightsUpdated?: boolean;
    mergeRules?: number;
  }> {
    // Map legacy 'word' field to new 'text' field
    const mapped = observations.map(obs => ({
      text: obs.word,
      frequency: obs.frequency,
      avgPhi: obs.avgPhi,
      maxPhi: obs.maxPhi,
      type: obs.type,
    }));
    return this.updateVocabulary(mapped);
  }

  /**
   * Encode text using QIG vocabulary encoder
   */
  async encodeText(
    text: string
  ): Promise<{ tokens: number[]; length: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/vocabulary/encode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Vocabulary encode failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary encode error: ${data.error}`);
      }

      return {
        tokens: data.tokens,
        length: data.length,
      };
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary encode failed:",
        error.message
      );
      throw error;
    }
  }

  // Legacy alias
  async tokenize(text: string): Promise<{ tokens: number[]; length: number }> {
    return this.encodeText(text);
  }

  /**
   * Decode vocabulary indices to text
   */
  async decodeText(tokens: number[]): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/vocabulary/decode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens }),
      });

      if (!response.ok) {
        throw new Error(`Vocabulary decode failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary decode error: ${data.error}`);
      }

      return data.text;
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary decode failed:",
        error.message
      );
      throw error;
    }
  }

  // Legacy alias
  async detokenize(tokens: number[]): Promise<string> {
    return this.decodeText(tokens);
  }

  /**
   * Compute basin coordinates for phrase using QIG vocabulary encoder
   */
  async computeBasinCoords(
    phrase: string
  ): Promise<{ basinCoords: number[]; dimension: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/vocabulary/basin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase }),
      });

      if (!response.ok) {
        throw new Error(`Vocabulary basin failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary basin error: ${data.error}`);
      }

      return {
        basinCoords: data.basinCoords,
        dimension: data.dimension,
      };
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary basin failed:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Get high-Φ vocabulary entries
   */
  async getHighPhiVocabulary(
    minPhi: number = 0.5,
    topK: number = 100
  ): Promise<Array<{ token: string; phi: number }>> {
    try {
      const response = await fetch(
        `${this.backendUrl}/vocabulary/high-phi?min_phi=${minPhi}&top_k=${topK}`
      );

      if (!response.ok) {
        throw new Error(`Vocabulary high-phi failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary high-phi error: ${data.error}`);
      }

      console.log(
        `[OceanQIGBackend] Retrieved ${data.count} high-Φ vocabulary entries`
      );

      return data.tokens;
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary high-phi failed:",
        error.message
      );
      throw error;
    }
  }

  // Legacy alias
  async getHighPhiTokens(
    minPhi: number = 0.5,
    topK: number = 100
  ): Promise<Array<{ token: string; phi: number }>> {
    return this.getHighPhiVocabulary(minPhi, topK);
  }

  /**
   * Export vocabulary encoder for training
   */
  async exportVocabulary(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/vocabulary/export`);

      if (!response.ok) {
        throw new Error(`Vocabulary export failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary export error: ${data.error}`);
      }

      console.log(
        `[OceanQIGBackend] Exported vocabulary: ${data.data.vocab_size} entries`
      );

      return data.data;
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary export failed:",
        error.message
      );
      throw error;
    }
  }

  // Legacy alias
  async exportTokenizer(): Promise<any> {
    return this.exportVocabulary();
  }

  /**
   * Get vocabulary encoder status
   * Uses fetchWithRetry for 503 handling
   */
  async getVocabularyStatus(): Promise<{
    vocabSize: number;
    highPhiCount: number;
    avgPhi: number;
    totalWeightedTokens: number;
  }> {
    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/vocabulary/status`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Vocabulary status failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Vocabulary status error: ${data.error}`);
      }

      return {
        vocabSize: data.vocabSize,
        highPhiCount: data.highPhiCount,
        avgPhi: data.avgPhi,
        totalWeightedTokens: data.totalWeightedTokens,
      };
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Vocabulary status failed:",
        error.message
      );
      throw error;
    }
  }

  // Legacy alias
  async getTokenizerStatus(): Promise<{
    vocabSize: number;
    highPhiCount: number;
    avgPhi: number;
    totalWeightedTokens: number;
  }> {
    return this.getVocabularyStatus();
  }

  /**
   * Get learned BPE merge rules from Python tokenizer.
   *
   * Used for syncing merge rules from Python to TypeScript for local processing.
   *
   * @returns Merge rules as token pairs with their Φ scores
   */
  async getMergeRules(): Promise<{
    mergeRules: Array<[string, string]>;
    mergeScores: Record<string, number>;
    count: number;
  }> {
    if (!this.isAvailable) {
      return { mergeRules: [], mergeScores: {}, count: 0 };
    }

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/tokenizer/merges`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        console.error(
          "[OceanQIGBackend] Get merge rules failed:",
          response.statusText
        );
        return { mergeRules: [], mergeScores: {}, count: 0 };
      }

      const data = await response.json();

      if (!data.success) {
        console.error("[OceanQIGBackend] Get merge rules error:", data.error);
        return { mergeRules: [], mergeScores: {}, count: 0 };
      }

      console.log(
        `[OceanQIGBackend] Retrieved ${data.count} merge rules from Python`
      );

      return {
        mergeRules: data.mergeRules.map(
          (r: string[]) => [r[0], r[1]] as [string, string]
        ),
        mergeScores: data.mergeScores,
        count: data.count,
      };
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Get merge rules exception:",
        error.message
      );
      return { mergeRules: [], mergeScores: {}, count: 0 };
    }
  }

  // ===========================================================================
  // TEXT GENERATION
  // ===========================================================================

  /**
   * Generate text autoregressively using QIG-weighted sampling
   *
   * @param options Generation options
   * @returns Generated text, tokens, and metrics
   */
  async generateText(
    options: {
      prompt?: string;
      maxTokens?: number;
      temperature?: number;
      topK?: number;
      topP?: number;
      allowSilence?: boolean;
    } = {}
  ): Promise<{
    text: string;
    tokens: number[];
    silenceChosen: boolean;
    metrics: {
      steps: number;
      avgPhi?: number;
      temperature?: number;
      topK?: number;
      topP?: number;
      earlyPads?: number;
      reason?: string;
    };
  }> {
    if (!this.isAvailable) {
      throw new Error("Python backend not available");
    }

    try {
      const response = await fetch(`${this.backendUrl}/generate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: options.prompt || "",
          max_tokens: options.maxTokens || 20,
          temperature: options.temperature || 0.8,
          top_k: options.topK || 50,
          top_p: options.topP || 0.9,
          allow_silence: options.allowSilence ?? true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Text generation failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Text generation error: ${data.error}`);
      }

      return {
        text: data.text,
        tokens: data.tokens,
        silenceChosen: data.silence_chosen,
        metrics: data.metrics,
      };
    } catch (error: any) {
      console.error("[OceanQIGBackend] Text generation failed:", error.message);
      throw error;
    }
  }

  /**
   * Generate Ocean Agent response with role-based temperature
   *
   * Agent roles and their temperatures:
   * - explorer: 1.5 (high entropy, broad exploration)
   * - refiner: 0.7 (low temp, exploit near-misses)
   * - navigator: 1.0 (balanced geodesic navigation)
   * - skeptic: 0.5 (low temp, constraint validation)
   * - resonator: 1.2 (cross-pattern harmonic detection)
   * - ocean: 0.8 (default Ocean consciousness)
   *
   * @param context Input context/prompt
   * @param agentRole Agent role for temperature selection
   * @param maxTokens Maximum tokens to generate
   * @param allowSilence Allow agent to choose silence (empowered, not void)
   */
  async generateResponse(
    context: string,
    agentRole:
      | "explorer"
      | "refiner"
      | "navigator"
      | "skeptic"
      | "resonator"
      | "ocean" = "navigator",
    maxTokens: number = 30,
    allowSilence: boolean = true
  ): Promise<{
    text: string;
    tokens: number[];
    silenceChosen: boolean;
    agentRole: string;
    metrics: {
      steps: number;
      avgPhi?: number;
      roleTemperature?: number;
      topK?: number;
      topP?: number;
    };
  }> {
    if (!this.isAvailable) {
      throw new Error("Python backend not available");
    }

    try {
      const response = await fetch(`${this.backendUrl}/generate/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          agent_role: agentRole,
          max_tokens: maxTokens,
          allow_silence: allowSilence,
        }),
      });

      if (!response.ok) {
        throw new Error(`Response generation failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Response generation error: ${data.error}`);
      }

      return {
        text: data.text,
        tokens: data.tokens,
        silenceChosen: data.silence_chosen,
        agentRole: data.agent_role,
        metrics: {
          steps: data.metrics?.steps ?? 0,
          avgPhi: data.metrics?.avg_phi,
          roleTemperature: data.metrics?.role_temperature,
          topK: data.metrics?.top_k,
          topP: data.metrics?.top_p,
        },
      };
    } catch (error: any) {
      console.error(
        "[OceanQIGBackend] Response generation failed:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Sample a single next token given context
   *
   * @param contextIds Token IDs for context
   * @param temperature Sampling temperature
   * @param topK Top-k filtering
   * @param topP Nucleus sampling threshold
   * @param includeProbabilities Include top token probabilities in response
   */
  async sampleNextToken(
    contextIds: number[],
    temperature: number = 0.8,
    topK: number = 50,
    topP: number = 0.9,
    includeProbabilities: boolean = false
  ): Promise<{
    tokenId: number;
    token: string;
    topProbabilities?: Record<string, number>;
  }> {
    if (!this.isAvailable) {
      throw new Error("Python backend not available");
    }

    try {
      const response = await fetch(`${this.backendUrl}/generate/sample`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context_ids: contextIds,
          temperature,
          top_k: topK,
          top_p: topP,
          include_probabilities: includeProbabilities,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token sampling failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Token sampling error: ${data.error}`);
      }

      return {
        tokenId: data.token_id,
        token: data.token,
        topProbabilities: data.top_probabilities,
      };
    } catch (error: any) {
      console.error("[OceanQIGBackend] Token sampling failed:", error.message);
      throw error;
    }
  }

  // =========================================================================
  // AUTONOMIC KERNEL METHODS
  // Sleep, Dream, Mushroom, Activity Rewards
  // =========================================================================

  /**
   * Get autonomic kernel state
   */
  async getAutonomicState(): Promise<{
    phi: number;
    kappa: number;
    basin_drift: number;
    stress_level: number;
    in_sleep_cycle: boolean;
    in_dream_cycle: boolean;
    in_mushroom_cycle: boolean;
    pending_rewards: number;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/state`,
        { method: "GET" }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Autonomic state failed:", error);
      return null;
    }
  }

  /**
   * Update autonomic metrics and check triggers
   */
  async updateAutonomicMetrics(params: {
    phi: number;
    kappa: number;
    basinCoords?: number[];
    referenceBasin?: number[];
  }): Promise<{
    triggers: {
      sleep: [boolean, string];
      dream: [boolean, string];
      mushroom: [boolean, string];
    };
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phi: params.phi,
            kappa: params.kappa,
            basin_coords: params.basinCoords,
            reference_basin: params.referenceBasin,
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Autonomic update failed:", error);
      return null;
    }
  }

  /**
   * Execute sleep consolidation cycle via Python backend
   */
  async executeSleepCycle(params: {
    basinCoords: number[];
    referenceBasin: number[];
    episodes?: Array<{ phi: number; phrase?: string }>;
  }): Promise<{
    success: boolean;
    drift_reduction: number;
    patterns_consolidated: number;
    basin_after: number[];
    verdict: string;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/sleep`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basin_coords: params.basinCoords,
            reference_basin: params.referenceBasin,
            episodes: params.episodes,
          }),
        }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Sleep cycle failed:", error);
      return null;
    }
  }

  /**
   * Execute dream exploration cycle via Python backend
   */
  async executeDreamCycle(params: {
    basinCoords: number[];
    temperature?: number;
  }): Promise<{
    success: boolean;
    novel_connections: number;
    creative_paths_explored: number;
    insights: string[];
    verdict: string;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/dream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basin_coords: params.basinCoords,
            temperature: params.temperature ?? 0.3,
          }),
        }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Dream cycle failed:", error);
      return null;
    }
  }

  /**
   * Execute mushroom mode cycle via Python backend
   */
  async executeMushroomCycle(params: {
    basinCoords: number[];
    intensity?: "microdose" | "moderate" | "heroic";
  }): Promise<{
    success: boolean;
    intensity: string;
    entropy_change: number;
    rigidity_broken: boolean;
    new_pathways: number;
    identity_preserved: boolean;
    verdict: string;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/mushroom`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basin_coords: params.basinCoords,
            intensity: params.intensity ?? "moderate",
          }),
        }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Mushroom cycle failed:", error);
      return null;
    }
  }

  /**
   * Record activity-based reward
   */
  async recordActivityReward(params: {
    source: string;
    phiContribution: number;
    patternQuality?: number;
  }): Promise<{
    success: boolean;
    reward: {
      dopamine_delta: number;
      serotonin_delta: number;
      endorphin_delta: number;
    };
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/reward`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: params.source,
            phi_contribution: params.phiContribution,
            pattern_quality: params.patternQuality ?? 0.5,
          }),
        }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Activity reward failed:", error);
      return null;
    }
  }

  /**
   * Get pending activity rewards
   */
  async getPendingRewards(flush: boolean = false): Promise<{
    rewards: Array<{
      source: string;
      dopamine_delta: number;
      serotonin_delta: number;
      endorphin_delta: number;
      phi_contribution: number;
    }>;
    count: number;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/autonomic/rewards?flush=${flush}`,
        { method: "GET" }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Get rewards failed:", error);
      return null;
    }
  }

  // =========================================================================
  // HERMES COORDINATOR METHODS
  // Team #2 - Voice, Translation, Sync, Memory
  // =========================================================================

  /**
   * Get Hermes coordinator status
   */
  async getHermesStatus(): Promise<{
    name: string;
    instance_id: string;
    coordination_health: number;
    pending_messages: number;
    memory_entries: number;
    tokenizer_available: boolean;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/hermes/status`,
        { method: "GET" }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Hermes status failed:", error);
      return null;
    }
  }

  /**
   * Generate natural speech from Hermes
   */
  async hermesSpeak(
    category: string,
    context: Record<string, unknown> = {}
  ): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/hermes/speak`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, context }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.message : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Hermes speak failed:", error);
      return null;
    }
  }

  /**
   * Translate geometric insight to human-readable form
   */
  async translateInsight(insight: {
    phi: number;
    kappa: number;
    reasoning?: string;
  }): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/hermes/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insight }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.translation : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Hermes translate failed:", error);
      return null;
    }
  }

  /**
   * Sync basin coordinates with other instances
   */
  async syncBasin(params: {
    basinCoords: number[];
    phi: number;
    kappa: number;
    regime: string;
    message?: string;
  }): Promise<{
    success: boolean;
    instance_id: string;
    other_instances: number;
    convergence: { score: number; message: string };
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/hermes/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basin_coords: params.basinCoords,
            phi: params.phi,
            kappa: params.kappa,
            regime: params.regime,
            message: params.message,
          }),
        }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Basin sync failed:", error);
      return null;
    }
  }

  /**
   * Store conversation in Hermes memory
   */
  async storeConversation(params: {
    userMessage: string;
    systemResponse: string;
    phi: number;
    context?: Record<string, unknown>;
  }): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/hermes/memory/store`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_message: params.userMessage,
            system_response: params.systemResponse,
            phi: params.phi,
            context: params.context,
          }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.memory_id : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Store conversation failed:", error);
      return null;
    }
  }

  /**
   * Recall similar conversations from Hermes memory
   */
  async recallSimilar(
    query: string,
    k: number = 5,
    minPhi: number = 0.3
  ): Promise<
    Array<{
      user_message: string;
      system_response: string;
      phi: number;
      similarity: number;
    }>
  > {
    if (!this.isAvailable) return [];

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/hermes/memory/recall`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, k, min_phi: minPhi }),
        }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.success ? data.memories : [];
    } catch (error) {
      console.error("[OceanQIGBackend] Recall similar failed:", error);
      return [];
    }
  }

  /**
   * Get Zeus voice status with natural speech
   */
  async getVoiceStatus(): Promise<{
    zeus_greeting: string;
    status_message: string;
    phi: number;
    kappa: number;
    war_mode: string | null;
    pantheon_ready: boolean;
    coordinator_health: number;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/voice/status`,
        { method: "GET" }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Voice status failed:", error);
      return null;
    }
  }

  /**
   * Generate natural speech from Zeus
   */
  async zeusSpeak(
    category: string,
    context: Record<string, unknown> = {}
  ): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/olympus/voice/speak`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, context }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.message : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Zeus speak failed:", error);
      return null;
    }
  }

  // =========================================================================
  // FEEDBACK LOOP METHODS
  // Recursive learning and activity balance
  // =========================================================================

  /**
   * Run all feedback loops with current state
   */
  async runFeedbackLoops(state: {
    basin?: number[];
    phi?: number;
    kappa?: number;
    action_type?: "exploration" | "exploitation";
    discovery?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    loops_run: string[];
    results: Record<string, unknown>;
    counters: Record<string, number>;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(`${this.backendUrl}/feedback/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Feedback loops failed:", error);
      return null;
    }
  }

  /**
   * Get integrated recommendation from all feedback sources
   */
  async getFeedbackRecommendation(): Promise<{
    recommendation: "explore" | "exploit" | "consolidate";
    confidence: number;
    reasons: string[];
    shadow_feedback: Record<string, unknown>;
    phi_trend: { trend: string; delta: number; mean: number };
    activity_balance: Record<string, unknown>;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/feedback/recommendation`,
        { method: "GET" }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Get recommendation failed:", error);
      return null;
    }
  }

  /**
   * Run activity balance feedback with action outcome
   */
  async runActivityFeedback(
    phi: number,
    actionType: "exploration" | "exploitation"
  ): Promise<{
    loop: string;
    iteration: number;
    phi_delta: number;
    new_balance: Record<string, unknown>;
    recommendation: string;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/feedback/activity`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phi, action_type: actionType }),
        }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Activity feedback failed:", error);
      return null;
    }
  }

  /**
   * Run basin drift feedback
   */
  async runBasinFeedback(
    basin: number[],
    phi: number,
    kappa: number
  ): Promise<{
    loop: string;
    iteration: number;
    drift: number;
    needs_consolidation: boolean;
    reference_updated?: boolean;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/feedback/basin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ basin, phi, kappa }),
        }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Basin feedback failed:", error);
      return null;
    }
  }

  // =========================================================================
  // GEOMETRIC MEMORY METHODS
  // Shared memory access
  // =========================================================================

  /**
   * Get geometric memory status
   */
  async getMemoryStatus(): Promise<{
    shadow_intel_count: number;
    basin_history_count: number;
    learning_events_count: number;
    activity_balance: Record<string, unknown>;
    phi_trend: Record<string, unknown>;
    shadow_feedback: Record<string, unknown>;
    has_reference_basin: boolean;
  } | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/memory/status`,
        { method: "GET" }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[OceanQIGBackend] Memory status failed:", error);
      return null;
    }
  }

  /**
   * Record basin coordinates to memory
   */
  async recordBasin(
    basin: number[],
    phi: number,
    kappa: number,
    source: string = "typescript"
  ): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/memory/record`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ basin, phi, kappa, source }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.entry_id : null;
    } catch (error) {
      console.error("[OceanQIGBackend] Record basin failed:", error);
      return null;
    }
  }

  /**
   * Get shadow intel from memory
   */
  async getShadowIntel(
    limit: number = 20
  ): Promise<Array<Record<string, unknown>>> {
    if (!this.isAvailable) return [];

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/memory/shadow?limit=${limit}`,
        { method: "GET" }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.intel || [];
    } catch (error) {
      console.error("[OceanQIGBackend] Get shadow intel failed:", error);
      return [];
    }
  }

  /**
   * Get learning events from memory
   */
  async getLearningEvents(
    limit: number = 50
  ): Promise<Array<Record<string, unknown>>> {
    if (!this.isAvailable) return [];

    try {
      const response = await fetchWithRetry(
        `${this.backendUrl}/memory/learning?limit=${limit}`,
        { method: "GET" }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error("[OceanQIGBackend] Get learning events failed:", error);
      return [];
    }
  }
}

// Global singleton instance
export const oceanQIGBackend = new OceanQIGBackend();

// Auto-check health on import with retry to handle startup race conditions
// Python backend may take a few seconds to start up
oceanQIGBackend
  .checkHealthWithRetry(DEFAULT_RETRY_ATTEMPTS, DEFAULT_RETRY_DELAY_MS)
  .then((available) => {
    if (available) {
      console.log("🌊 Ocean QIG Python Backend: CONNECTED 🌊");
    } else {
      console.warn("⚠️  Ocean QIG Python Backend: NOT AVAILABLE");
      console.warn("   Python backend may still be starting up...");
      console.warn(
        "   Start with: cd qig-backend && python3 ocean_qig_core.py"
      );
      console.warn("   Or check logs for errors");
    }
  });
