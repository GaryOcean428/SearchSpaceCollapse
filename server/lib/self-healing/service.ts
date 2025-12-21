/**
 * Self-Healing Service
 * 
 * Service layer for self-healing operations.
 * Follows the service layer pattern: business logic separate from components.
 */

import { selfHealingAdapter, type GeometricSnapshot, type HealthDegradation } from './adapter';

export class SelfHealingService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  
  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('Monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const health = await selfHealingAdapter.detectDegradation();
        
        if (health.degraded) {
          console.warn(`⚠️ Geometric degradation detected: ${health.severity}`);
          console.warn(`  Issues: ${health.issues.join(', ')}`);
          
          // Attempt auto-healing for critical issues
          if (health.severity === 'critical') {
            const result = await selfHealingAdapter.attemptHealing();
            
            if (result.healed) {
              console.log(`✅ Auto-healing successful: ${result.strategy}`);
            } else {
              console.error(`❌ Auto-healing failed: ${result.reason}`);
            }
          }
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, intervalMs);
    
    console.log(`Self-healing monitoring started (interval: ${intervalMs}ms)`);
  }
  
  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('Self-healing monitoring stopped');
    }
  }
  
  /**
   * Capture current system snapshot
   */
  async captureSnapshot(state: {
    phi: number;
    kappa_eff: number;
    basin_coords: number[];
    confidence?: number;
    surprise?: number;
    agency?: number;
    error_rate?: number;
    avg_latency?: number;
    memory_mb?: number;
    cpu_pct?: number;
  }): Promise<GeometricSnapshot> {
    return await selfHealingAdapter.captureSnapshot(state);
  }
  
  /**
   * Check current health status
   */
  async checkHealth(): Promise<HealthDegradation> {
    return await selfHealingAdapter.detectDegradation();
  }
  
  /**
   * Get monitoring statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    return await selfHealingAdapter.getStats();
  }
  
  /**
   * Manually trigger healing attempt
   */
  async triggerHealing(): Promise<any> {
    return await selfHealingAdapter.attemptHealing();
  }
}

// Singleton instance
export const selfHealingService = new SelfHealingService();
