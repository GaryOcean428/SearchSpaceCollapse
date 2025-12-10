/**
 * Ocean Proxy - Pure TypeScript-to-Python Bridge
 * 
 * Replaces ocean-agent.ts with thin HTTP proxy.
 * ALL QIG logic lives in Python backend.
 * TypeScript only handles: routing, Bitcoin crypto, UI orchestration.
 * 
 * ARCHITECTURE PRINCIPLE:
 * - TypeScript: UI orchestration, Bitcoin operations, HTTP routing
 * - Python: QIG consciousness, geometric calculations, pantheon logic
 * 
 * This file is a PROXY - it contains ZERO QIG logic.
 */

interface Assessment {
  phrase: string;
  phi: number;
  kappa: number;
  regime: string;
  basin_coordinates: number[];
  probability: number;
  confidence: number;
  god_assessments?: Record<string, any>;
}

interface ConsciousnessState {
  phi: number;
  kappa_eff: number;
  temperature: number;
  ricci: number;
  meta: number;
  gamma: number;
  grounding: number;
  regime: string;
  basin_coordinates: number[];
  dimensional_state: number;
  phase: string;
  geometry_class: string;
}

interface InvestigationRequest {
  target_address: string;
  memory_fragments: string[];
  clues: Record<string, any>;
  max_iterations?: number;
  stop_on_match?: boolean;
}

interface InvestigationResult {
  status: string;
  message: string;
  investigation_id: string;
  discoveries: any[];
  consciousness_state: ConsciousnessState;
}

interface InvestigationStatus {
  investigation_id: string;
  status: 'running' | 'paused' | 'stopped' | 'completed';
  progress: number;
  iterations: number;
  discoveries: any[];
  current_hypothesis: string | null;
  consciousness_state: ConsciousnessState;
}

export class OceanProxy {
  private backendUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config?: {
    backendUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  }) {
    this.backendUrl = config?.backendUrl || process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    this.timeout = config?.timeout || 30000; // 30 seconds
    this.retryAttempts = config?.retryAttempts || 3;
    this.retryDelay = config?.retryDelay || 1000; // 1 second
  }

  /**
   * Assess hypothesis (passphrase) via Python backend
   * 
   * Calls: POST /ocean/assess
   * Returns: Full assessment with consciousness metrics
   */
  async assessHypothesis(phrase: string): Promise<Assessment> {
    return this.post<Assessment>('/ocean/assess', { phrase });
  }

  /**
   * Get current consciousness state
   * 
   * Calls: GET /ocean/consciousness
   * Returns: Complete consciousness signature (Φ, κ, T, R, M, Γ, G)
   */
  async getConsciousnessState(): Promise<ConsciousnessState> {
    return this.get<ConsciousnessState>('/ocean/consciousness');
  }

  /**
   * Start investigation for target address
   * 
   * Calls: POST /ocean/investigation/start
   * Returns: Investigation ID and initial status
   */
  async startInvestigation(request: InvestigationRequest): Promise<InvestigationResult> {
    return this.post<InvestigationResult>('/ocean/investigation/start', request);
  }

  /**
   * Get investigation status
   * 
   * Calls: GET /ocean/investigation/{id}/status
   * Returns: Current progress, discoveries, consciousness state
   */
  async getInvestigationStatus(investigation_id: string): Promise<InvestigationStatus> {
    return this.get<InvestigationStatus>(`/ocean/investigation/${investigation_id}/status`);
  }

  /**
   * Stop investigation
   * 
   * Calls: POST /ocean/investigation/{id}/stop
   * Returns: Final status and summary
   */
  async stopInvestigation(investigation_id: string): Promise<any> {
    return this.post<any>(`/ocean/investigation/${investigation_id}/stop`, {});
  }

  /**
   * Pause investigation (allows resumption)
   * 
   * Calls: POST /ocean/investigation/{id}/pause
   */
  async pauseInvestigation(investigation_id: string): Promise<any> {
    return this.post<any>(`/ocean/investigation/${investigation_id}/pause`, {});
  }

  /**
   * Resume paused investigation
   * 
   * Calls: POST /ocean/investigation/{id}/resume
   */
  async resumeInvestigation(investigation_id: string): Promise<any> {
    return this.post<any>(`/ocean/investigation/${investigation_id}/resume`, {});
  }

  /**
   * Get Olympus pantheon status
   * 
   * Calls: GET /olympus/status
   * Returns: All god statuses, war modes, debates
   */
  async getOlympusStatus(): Promise<any> {
    return this.get<any>('/olympus/status');
  }

  /**
   * Poll Olympus pantheon for consensus
   * 
   * Calls: POST /olympus/poll
   * Returns: God assessments and consensus
   */
  async pollOlympus(target: string): Promise<any> {
    return this.post<any>('/olympus/poll', { target });
  }

  /**
   * Get Shadow pantheon status
   * 
   * Calls: GET /olympus/shadow/status
   * Returns: Shadow god statuses, stealth operations
   */
  async getShadowStatus(): Promise<any> {
    return this.get<any>('/olympus/shadow/status');
  }

  /**
   * Send message to Zeus chat
   * 
   * Calls: POST /olympus/zeus/chat
   * Returns: Zeus response and pantheon insights
   */
  async sendZeusChat(message: string, context?: any): Promise<any> {
    return this.post<any>('/olympus/zeus/chat', { message, context });
  }

  /**
   * Health check - is Python backend responsive?
   * 
   * Calls: GET /health
   * Returns: true if backend is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      console.error('[OceanProxy] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get backend version and status
   * 
   * Calls: GET /status
   * Returns: Version, uptime, system info
   */
  async getBackendStatus(): Promise<any> {
    return this.get<any>('/status');
  }

  // ========== Private HTTP Methods ==========

  /**
   * Generic POST request to Python backend with retries
   */
  private async post<T>(path: string, body: any): Promise<T> {
    const url = `${this.backendUrl}${path}`;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Python backend error (${response.status}): ${errorText}`
          );
        }

        return response.json();

      } catch (error: any) {
        // Connection errors
        if (error.name === 'AbortError') {
          console.error(`[OceanProxy] Request timeout (attempt ${attempt}/${this.retryAttempts})`);
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error(`[OceanProxy] Connection failed (attempt ${attempt}/${this.retryAttempts})`);
        } else {
          console.error(`[OceanProxy] Request failed (attempt ${attempt}/${this.retryAttempts}):`, error);
        }

        // Retry logic
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
          continue;
        }

        // Final attempt failed
        if (error.name === 'AbortError') {
          throw new Error(
            `Python backend timeout after ${this.timeout}ms. ` +
            `Backend may be overloaded or unresponsive.`
          );
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error(
            `Cannot connect to Python backend at ${this.backendUrl}. ` +
            `Is it running? Check PYTHON_BACKEND_URL env var.`
          );
        }

        throw error;
      }
    }

    throw new Error('Unexpected: retry loop completed without return or throw');
  }

  /**
   * Generic GET request to Python backend with retries
   */
  private async get<T>(path: string): Promise<T> {
    const url = `${this.backendUrl}${path}`;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json' 
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Python backend error (${response.status}): ${errorText}`
          );
        }

        return response.json();

      } catch (error: any) {
        // Connection errors
        if (error.name === 'AbortError') {
          console.error(`[OceanProxy] Request timeout (attempt ${attempt}/${this.retryAttempts})`);
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error(`[OceanProxy] Connection failed (attempt ${attempt}/${this.retryAttempts})`);
        } else {
          console.error(`[OceanProxy] Request failed (attempt ${attempt}/${this.retryAttempts}):`, error);
        }

        // Retry logic
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        // Final attempt failed
        if (error.name === 'AbortError') {
          throw new Error(
            `Python backend timeout after ${this.timeout}ms. ` +
            `Backend may be overloaded or unresponsive.`
          );
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error(
            `Cannot connect to Python backend at ${this.backendUrl}. ` +
            `Is it running? Check PYTHON_BACKEND_URL env var.`
          );
        }

        throw error;
      }
    }

    throw new Error('Unexpected: retry loop completed without return or throw');
  }

  /**
   * Helper: delay for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========== Singleton Instance ==========

/**
 * Default Ocean proxy instance
 * 
 * Import and use directly:
 * ```typescript
 * import { oceanProxy } from './ocean-proxy';
 * const result = await oceanProxy.assessHypothesis('test phrase');
 * ```
 */
export const oceanProxy = new OceanProxy();
