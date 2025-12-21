/**
 * Self-Healing Adapter - TypeScript Bridge to Python Backend
 * 
 * Provides TypeScript interface to Python self-healing modules.
 * All healing logic lives in Python (qig-backend/self_healing/).
 * This adapter handles HTTP/WebSocket communication.
 */

import axios, { type AxiosInstance } from 'axios';

// Types matching Python GeometricSnapshot
export interface GeometricSnapshot {
  timestamp: string;
  phi: number;
  kappa_eff: number;
  basin_coords: number[];  // 64D
  confidence: number;
  surprise: number;
  agency: number;
  regime: 'linear' | 'geometric' | 'breakdown';
  
  // Code fingerprint
  code_hash: string;
  active_modules: string[];
  module_versions: Record<string, string>;
  
  // Performance metrics
  error_rate: number;
  avg_latency: number;
  memory_usage_mb: number;
  cpu_usage_pct: number;
}

export interface HealthDegradation {
  degraded: boolean;
  issues: string[];
  severity: 'critical' | 'warning' | 'normal';
  basin_distance: number;
  phi_current: number;
  timestamp: string;
}

export interface CodeFitnessResult {
  fitness_score: number;
  phi_impact: number;
  basin_impact: number;
  regime_stable: boolean;
  performance_impact: {
    latency_ratio: number;
    memory_change_mb: number;
  };
  recommendation: 'apply' | 'reject' | 'test_more';
  detailed_metrics?: any;
}

export interface HealingResult {
  healed: boolean;
  strategy?: string;
  patch?: string;
  fitness_improvement?: number;
  reason?: string;
}

export class SelfHealingAdapter {
  private client: AxiosInstance;
  private backendUrl: string;
  
  constructor(backendUrl: string = 'http://localhost:5001') {
    this.backendUrl = backendUrl;
    this.client = axios.create({
      baseURL: backendUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Capture a geometric snapshot
   */
  async captureSnapshot(systemState: Record<string, any>): Promise<GeometricSnapshot> {
    try {
      const response = await this.client.post('/self-healing/snapshot', systemState);
      return response.data;
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Check for geometric degradation
   */
  async detectDegradation(): Promise<HealthDegradation> {
    try {
      const response = await this.client.get('/self-healing/health');
      return response.data;
    } catch (error) {
      console.error('Failed to detect degradation:', error);
      throw error;
    }
  }
  
  /**
   * Evaluate fitness of code change
   */
  async evaluateCodeChange(
    moduleName: string,
    newCode: string,
    testEnv?: Record<string, any>
  ): Promise<CodeFitnessResult> {
    try {
      const response = await this.client.post('/self-healing/evaluate', {
        module_name: moduleName,
        new_code: newCode,
        test_env: testEnv || {},
      });
      return response.data;
    } catch (error) {
      console.error('Failed to evaluate code change:', error);
      throw error;
    }
  }
  
  /**
   * Attempt autonomous healing
   */
  async attemptHealing(): Promise<HealingResult> {
    try {
      const response = await this.client.post('/self-healing/heal');
      return response.data;
    } catch (error) {
      console.error('Failed to attempt healing:', error);
      throw error;
    }
  }
  
  /**
   * Get monitoring statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get('/self-healing/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }
  
  /**
   * Check if backend is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const selfHealingAdapter = new SelfHealingAdapter();
