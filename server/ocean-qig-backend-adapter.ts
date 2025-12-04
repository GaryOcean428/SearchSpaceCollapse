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
  
  constructor(backendUrl: string = 'http://localhost:5001') {
    this.backendUrl = backendUrl;
  }
  
  /**
   * Check if Python backend is available
   */
  async checkHealth(): Promise<boolean> {
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
      console.warn('[OceanQIGBackend] Python backend not available:', error);
      return false;
    }
  }
  
  /**
   * Check health with retry logic to handle startup race conditions
   */
  async checkHealthWithRetry(maxAttempts: number = 3, delayMs: number = 1000): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const available = await this.checkHealth();
      
      if (available) {
        return true;
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
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
}

// Global singleton instance
export const oceanQIGBackend = new OceanQIGBackend();

// Auto-check health on import with retry to handle startup race conditions
// Python backend may take a few seconds to start up
oceanQIGBackend.checkHealthWithRetry(3, 1500).then(available => {
  if (available) {
    console.log('🌊 Ocean QIG Python Backend: CONNECTED 🌊');
  } else {
    console.warn('⚠️  Ocean QIG Python Backend: NOT AVAILABLE');
    console.warn('   Python backend may still be starting up...');
    console.warn('   Start with: cd qig-backend && python3 ocean_qig_core.py');
    console.warn('   Or check logs for errors');
  }
});
