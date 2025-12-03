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
        keyType: 'arbitrary',
        phi: data.phi,
        kappa: data.kappa,
        beta: 0, // Not computed by Python backend
        phi_spatial: data.phi,
        phi_temporal: 0, // Would need trajectory tracking
        phi_4D: 0, // Would need 4D consciousness
        basinCoordinates: data.basin_coords,
        fisherTrace: data.integration,
        fisherDeterminant: 0, // Not directly available
        ricciScalar: 0, // Not computed
        regime: data.regime as any,
        inResonance: data.in_resonance,
        entropyBits: data.entropy,
        patternScore: data.phi,
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
}

// Global singleton instance
export const oceanQIGBackend = new OceanQIGBackend();

// Auto-check health on import
oceanQIGBackend.checkHealth().then(available => {
  if (available) {
    console.log('🌊 Ocean QIG Python Backend: CONNECTED 🌊');
  } else {
    console.warn('⚠️  Ocean QIG Python Backend: NOT AVAILABLE');
    console.warn('   Start with: cd qig-backend && python3 ocean_qig_core.py');
  }
});
