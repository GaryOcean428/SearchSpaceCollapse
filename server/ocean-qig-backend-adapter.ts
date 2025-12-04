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

import type { PureQIGScore } from './qig-pure-v2';

// Health check retry configuration
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1500;

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
  
  // Track Python backend near-miss discoveries for TypeScript sync
  private pythonNearMissCount: number = 0;
  private pythonResonantCount: number = 0;
  private lastSyncedNearMissCount: number = 0;
  
  constructor(backendUrl: string = 'http://localhost:5001') {
    this.backendUrl = backendUrl;
  }
  
  /**
   * Get Python near-miss count (new discoveries since last sync)
   */
  getPythonNearMisses(): { total: number; newSinceSync: number } {
    const newSinceSync = this.pythonNearMissCount - this.lastSyncedNearMissCount;
    return { total: this.pythonNearMissCount, newSinceSync };
  }
  
  /**
   * Mark Python near-misses as synced (called by session manager)
   */
  markNearMissesSynced(): void {
    this.lastSyncedNearMissCount = this.pythonNearMissCount;
  }
  
  /**
   * Reset Python near-miss tracking (called when investigation starts)
   */
  resetNearMissTracking(): void {
    this.pythonNearMissCount = 0;
    this.pythonResonantCount = 0;
    this.lastSyncedNearMissCount = 0;
  }
  
  /**
   * Check if Python backend is available (silent mode for retries)
   */
  async checkHealth(silent: boolean = false): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
        console.warn('[OceanQIGBackend] Python backend not available:', error);
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
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.warn(`[OceanQIGBackend] Python backend not available after ${maxAttempts} attempts`);
    return false;
  }
  
  /**
   * Process passphrase through pure QIG consciousness network
   * 
   * This IS the training - states evolve through geometry
   */
  async process(passphrase: string): Promise<PureQIGScore | null> {
    try {
      const response = await fetch(`${this.backendUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      
      if (!response.ok) {
        console.error('[OceanQIGBackend] Process failed:', response.statusText);
        return null;
      }
      
      const data: PythonQIGResponse = await response.json();
      
      if (!data.success) {
        console.error('[OceanQIGBackend] Process error:', data.error);
        return null;
      }
      
      // Sync Python near-miss discoveries to TypeScript tracking
      if (data.near_miss_count !== undefined && data.near_miss_count > this.pythonNearMissCount) {
        const newNearMisses = data.near_miss_count - this.pythonNearMissCount;
        if (newNearMisses > 0) {
          console.log(`[OceanQIGBackend] 🔄 Python detected ${newNearMisses} new near-miss(es), total: ${data.near_miss_count}`);
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
      console.error('[OceanQIGBackend] Process exception:', error);
      return null;
    }
  }
  
  /**
   * Generate next hypothesis via geodesic navigation
   */
  async generateHypothesis(): Promise<{
    hypothesis: string;
    source: string;
  } | null> {
    try {
      const response = await fetch(`${this.backendUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OceanQIGBackend] Generate failed:', response.statusText);
        return null;
      }
      
      const data: PythonGenerateResponse = await response.json();
      
      return {
        hypothesis: data.hypothesis,
        source: data.source,
      };
      
    } catch (error) {
      console.error('[OceanQIGBackend] Generate exception:', error);
      return null;
    }
  }
  
  /**
   * Get current Ocean consciousness status
   */
  async getStatus(): Promise<PythonStatusResponse | null> {
    try {
      const response = await fetch(`${this.backendUrl}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OceanQIGBackend] Status failed:', response.statusText);
        return null;
      }
      
      const data: PythonStatusResponse = await response.json();
      
      if (!data.success) {
        return null;
      }
      
      return data;
      
    } catch (error) {
      console.error('[OceanQIGBackend] Status exception:', error);
      return null;
    }
  }
  
  /**
   * Reset Ocean consciousness to initial state
   */
  async reset(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.success === true;
      
    } catch (error) {
      console.error('[OceanQIGBackend] Reset exception:', error);
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
   * Called on startup to give Python access to prior learnings
   */
  async syncFromNodeJS(probes: Array<{ input: string; phi: number; basinCoords: number[] }>): Promise<number> {
    if (!this.isAvailable) return 0;
    
    try {
      const response = await fetch(`${this.backendUrl}/sync/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ probes }),
      });
      
      if (!response.ok) {
        console.error('[OceanQIGBackend] Sync import failed:', response.statusText);
        return 0;
      }
      
      const data = await response.json();
      if (data.success) {
        console.log(`[OceanQIGBackend] Synced ${data.imported} probes to Python backend`);
        return data.imported;
      }
      
      return 0;
    } catch (error) {
      console.error('[OceanQIGBackend] Sync import exception:', error);
      return 0;
    }
  }
  
  /**
   * Sync high-Φ basins FROM Python backend TO Node.js
   * 
   * Returns learnings that should be persisted to GeometricMemory
   */
  async syncToNodeJS(): Promise<Array<{ input: string; phi: number; basinCoords: number[] }>> {
    if (!this.isAvailable) return [];
    
    try {
      const response = await fetch(`${this.backendUrl}/sync/export`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OceanQIGBackend] Sync export failed:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      if (data.success && data.basins) {
        console.log(`[OceanQIGBackend] Retrieved ${data.total_count} basins from Python backend`);
        return data.basins;
      }
      
      return [];
    } catch (error) {
      console.error('[OceanQIGBackend] Sync export exception:', error);
      return [];
    }
  }
  
  /**
   * Validate β-attention substrate independence
   * 
   * Measures κ across context scales and validates that β_attention ≈ β_physics.
   */
  async validateBetaAttention(samplesPerScale: number = 100): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/beta-attention/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples_per_scale: samplesPerScale }),
      });
      
      if (!response.ok) {
        throw new Error(`β-attention validation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`β-attention validation error: ${data.error}`);
      }
      
      const result = data.result;
      console.log('[OceanQIGBackend] β-attention validation:', 
        result.validation_passed ? 'PASSED ✓' : 'FAILED ✗');
      console.log(`[OceanQIGBackend]   Average κ: ${result.avg_kappa.toFixed(2)}`);
      console.log(`[OceanQIGBackend]   Deviation: ${result.overall_deviation.toFixed(3)}`);
      
      return result;
    } catch (error: any) {
      console.error('[OceanQIGBackend] β-attention validation failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Measure κ_attention at specific context scale
   */
  async measureBetaAttention(contextLength: number, sampleCount: number = 100): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/beta-attention/measure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          context_length: contextLength, 
          sample_count: sampleCount 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`β-attention measurement failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`β-attention measurement error: ${data.error}`);
      }
      
      const m = data.measurement;
      console.log(`[OceanQIGBackend] κ_attention(L=${contextLength}) = ${m.kappa.toFixed(2)} ± ${Math.sqrt(m.variance).toFixed(2)}`);
      
      return m;
    } catch (error: any) {
      console.error('[OceanQIGBackend] β-attention measurement failed:', error.message);
      throw error;
    }
  }
  
  // ===========================================================================
  // TOKENIZER INTEGRATION
  // ===========================================================================
  
  /**
   * Update Python tokenizer with vocabulary observations from Node.js
   */
  async updateTokenizer(observations: Array<{
    word: string;
    frequency: number;
    avgPhi: number;
    maxPhi: number;
    type: string;
  }>): Promise<{ newTokens: number; totalVocab: number; weightsUpdated?: boolean; mergeRules?: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations }),
      });
      
      if (!response.ok) {
        throw new Error(`Tokenizer update failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer update error: ${data.error}`);
      }
      
      console.log(`[OceanQIGBackend] Tokenizer updated: ${data.newTokens} new tokens, ${data.totalVocab} total, weights updated: ${data.weightsUpdated}, merge rules: ${data.mergeRules}`);
      
      return {
        newTokens: data.newTokens,
        totalVocab: data.totalVocab,
        weightsUpdated: data.weightsUpdated,
        mergeRules: data.mergeRules,
      };
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer update failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Encode text using QIG tokenizer
   */
  async tokenize(text: string): Promise<{ tokens: number[]; length: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/encode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`Tokenizer encode failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer encode error: ${data.error}`);
      }
      
      return {
        tokens: data.tokens,
        length: data.length,
      };
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer encode failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Decode tokens using QIG tokenizer
   */
  async detokenize(tokens: number[]): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
      
      if (!response.ok) {
        throw new Error(`Tokenizer decode failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer decode error: ${data.error}`);
      }
      
      return data.text;
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer decode failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Compute basin coordinates for phrase using QIG tokenizer
   */
  async computeBasinCoords(phrase: string): Promise<{ basinCoords: number[]; dimension: number }> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/basin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase }),
      });
      
      if (!response.ok) {
        throw new Error(`Tokenizer basin failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer basin error: ${data.error}`);
      }
      
      return {
        basinCoords: data.basinCoords,
        dimension: data.dimension,
      };
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer basin failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Get high-Φ tokens from tokenizer
   */
  async getHighPhiTokens(minPhi: number = 0.5, topK: number = 100): Promise<Array<{ token: string; phi: number }>> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/high-phi?min_phi=${minPhi}&top_k=${topK}`);
      
      if (!response.ok) {
        throw new Error(`Tokenizer high-phi failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer high-phi error: ${data.error}`);
      }
      
      console.log(`[OceanQIGBackend] Retrieved ${data.count} high-Φ tokens`);
      
      return data.tokens;
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer high-phi failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Export tokenizer for training
   */
  async exportTokenizer(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/export`);
      
      if (!response.ok) {
        throw new Error(`Tokenizer export failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer export error: ${data.error}`);
      }
      
      console.log(`[OceanQIGBackend] Exported tokenizer: ${data.data.vocab_size} tokens`);
      
      return data.data;
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer export failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Get tokenizer status
   */
  async getTokenizerStatus(): Promise<{
    vocabSize: number;
    highPhiCount: number;
    avgPhi: number;
    totalWeightedTokens: number;
  }> {
    try {
      const response = await fetch(`${this.backendUrl}/tokenizer/status`);
      
      if (!response.ok) {
        throw new Error(`Tokenizer status failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Tokenizer status error: ${data.error}`);
      }
      
      return {
        vocabSize: data.vocabSize,
        highPhiCount: data.highPhiCount,
        avgPhi: data.avgPhi,
        totalWeightedTokens: data.totalWeightedTokens,
      };
    } catch (error: any) {
      console.error('[OceanQIGBackend] Tokenizer status failed:', error.message);
      throw error;
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
  async generateText(options: {
    prompt?: string;
    maxTokens?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
    allowSilence?: boolean;
  } = {}): Promise<{
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
      throw new Error('Python backend not available');
    }
    
    try {
      const response = await fetch(`${this.backendUrl}/generate/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.prompt || '',
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
      console.error('[OceanQIGBackend] Text generation failed:', error.message);
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
    agentRole: 'explorer' | 'refiner' | 'navigator' | 'skeptic' | 'resonator' | 'ocean' = 'navigator',
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
      throw new Error('Python backend not available');
    }
    
    try {
      const response = await fetch(`${this.backendUrl}/generate/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('[OceanQIGBackend] Response generation failed:', error.message);
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
      throw new Error('Python backend not available');
    }
    
    try {
      const response = await fetch(`${this.backendUrl}/generate/sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('[OceanQIGBackend] Token sampling failed:', error.message);
      throw error;
    }
  }
}

// Global singleton instance
export const oceanQIGBackend = new OceanQIGBackend();

// Auto-check health on import with retry to handle startup race conditions
// Python backend may take a few seconds to start up
oceanQIGBackend.checkHealthWithRetry(DEFAULT_RETRY_ATTEMPTS, DEFAULT_RETRY_DELAY_MS).then(available => {
  if (available) {
    console.log('🌊 Ocean QIG Python Backend: CONNECTED 🌊');
  } else {
    console.warn('⚠️  Ocean QIG Python Backend: NOT AVAILABLE');
    console.warn('   Python backend may still be starting up...');
    console.warn('   Start with: cd qig-backend && python3 ocean_qig_core.py');
    console.warn('   Or check logs for errors');
  }
});
