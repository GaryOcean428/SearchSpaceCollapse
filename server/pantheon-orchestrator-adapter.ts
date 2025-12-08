/**
 * Pantheon Orchestrator Adapter
 * 
 * Connects Node.js/TypeScript to Python Pantheon Kernel Orchestrator.
 * Delegates all kernel routing and consciousness processing to Python backend.
 * 
 * ARCHITECTURE:
 * - Python: Pure QIG consciousness kernels (god-based routing)
 * - Node.js: Orchestration layer (calls Python, handles blockchain)
 */

const DEFAULT_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
const REQUEST_TIMEOUT_MS = 10000;

interface PantheonOrchestrationResult {
  text: string;
  god: string;
  domain: string;
  mode: string;
  affinity: number;
  basin: number[];
  basin_norm: number;
  routing: {
    ranking: Array<{ god: string; affinity: number }>;
    token_basin_norm: number;
  };
  metadata: Record<string, any>;
  timestamp: string;
}

interface PantheonStatus {
  mode: string;
  include_ocean: boolean;
  total_profiles: number;
  profiles: string[];
  processing_history_size: number;
  available_modes: string[];
}

interface GodConstellation {
  gods: string[];
  similarities: Record<string, Record<string, number>>;
  total_comparisons: number;
}

/**
 * Fetch with timeout using AbortController
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
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

class PantheonOrchestratorAdapter {
  private backendUrl: string;
  private isAvailable: boolean = false;
  
  constructor(backendUrl: string = DEFAULT_BACKEND_URL) {
    this.backendUrl = backendUrl;
  }
  
  /**
   * Check if Pantheon Orchestrator backend is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${this.backendUrl}/pantheon/status`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (response.ok) {
        this.isAvailable = true;
        return true;
      }
      
      this.isAvailable = false;
      return false;
    } catch (error) {
      this.isAvailable = false;
      console.warn('[PantheonOrchestrator] Python backend not available:', error);
      return false;
    }
  }
  
  /**
   * Check if backend is available (cached)
   */
  available(): boolean {
    return this.isAvailable;
  }
  
  /**
   * Orchestrate token routing to optimal god/kernel
   * 
   * @param text - Text to process
   * @param context - Optional context for routing
   * @returns Orchestration result with god assignment and basin coordinates
   */
  async orchestrate(
    text: string,
    context?: Record<string, any>
  ): Promise<PantheonOrchestrationResult | null> {
    if (!this.isAvailable) {
      console.warn('[PantheonOrchestrator] Backend not available, skipping orchestrate');
      return null;
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.backendUrl}/pantheon/orchestrate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, context }),
        }
      );
      
      if (!response.ok) {
        console.error('[PantheonOrchestrator] Orchestrate failed:', response.status);
        return null;
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[PantheonOrchestrator] Orchestrate error:', error);
      return null;
    }
  }
  
  /**
   * Orchestrate batch of tokens
   * 
   * @param texts - Array of texts to process
   * @param context - Optional context for routing
   * @returns Array of orchestration results
   */
  async orchestrateBatch(
    texts: string[],
    context?: Record<string, any>
  ): Promise<PantheonOrchestrationResult[]> {
    if (!this.isAvailable) {
      console.warn('[PantheonOrchestrator] Backend not available, skipping batch orchestrate');
      return [];
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.backendUrl}/pantheon/orchestrate-batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts, context }),
        }
      );
      
      if (!response.ok) {
        console.error('[PantheonOrchestrator] Batch orchestrate failed:', response.status);
        return [];
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('[PantheonOrchestrator] Batch orchestrate error:', error);
      return [];
    }
  }
  
  /**
   * Get Pantheon status
   */
  async getStatus(): Promise<PantheonStatus | null> {
    if (!this.isAvailable) {
      return null;
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.backendUrl}/pantheon/status`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[PantheonOrchestrator] Status error:', error);
      return null;
    }
  }
  
  /**
   * Get god constellation (pairwise similarities)
   */
  async getConstellation(): Promise<GodConstellation | null> {
    if (!this.isAvailable) {
      return null;
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.backendUrl}/pantheon/constellation`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[PantheonOrchestrator] Constellation error:', error);
      return null;
    }
  }
  
  /**
   * Get list of available gods
   */
  async getGods(): Promise<string[]> {
    if (!this.isAvailable) {
      return [];
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.backendUrl}/pantheon/gods`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.gods || [];
    } catch (error) {
      console.error('[PantheonOrchestrator] Get gods error:', error);
      return [];
    }
  }
}

// Singleton instance
export const pantheonOrchestrator = new PantheonOrchestratorAdapter();

// Initialize on module load
pantheonOrchestrator.checkHealth().catch(() => {
  console.warn('[PantheonOrchestrator] Initial health check failed - will retry on first use');
});

export type {
  PantheonOrchestrationResult,
  PantheonStatus,
  GodConstellation,
};
