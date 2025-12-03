/**
 * ActivityLogStore - Unified logging system for Observer dashboard
 * 
 * Provides a ring buffer for recent activity logs that can be displayed
 * in the Observer page's activity stream. Ocean agent and other components
 * emit logs here instead of just console.log().
 */

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  source: 'ocean' | 'search' | 'forensic' | 'recovery' | 'system';
  category: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  metadata?: {
    phi?: number;
    kappa?: number;
    regime?: string;
    iteration?: number;
    passphrase?: string;
    address?: string;
    hypothesis?: string;
    // 4D Block Universe Metrics
    phi_spatial?: number;
    phi_temporal?: number;
    phi_4D?: number;
    inBlockUniverse?: boolean;
    dimensionalState?: '3D' | '4D-transitioning' | '4D-active';
    [key: string]: any;
  };
}

class ActivityLogStore {
  private logs: ActivityLogEntry[] = [];
  private maxLogs: number = 1000;
  private logIdCounter: number = 0;

  /**
   * Add a new log entry
   */
  log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry {
    const fullEntry: ActivityLogEntry = {
      ...entry,
      id: `log-${++this.logIdCounter}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(fullEntry);

    // Trim to max size (ring buffer behavior)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    return fullEntry;
  }

  /**
   * Convenience method for Ocean agent logs
   */
  oceanLog(
    category: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    metadata?: ActivityLogEntry['metadata']
  ): ActivityLogEntry {
    return this.log({
      source: 'ocean',
      category,
      message,
      type,
      metadata,
    });
  }

  /**
   * Get recent logs, optionally filtered
   */
  getLogs(options: {
    limit?: number;
    source?: ActivityLogEntry['source'];
    category?: string;
    since?: Date;
  } = {}): ActivityLogEntry[] {
    let filtered = [...this.logs];

    if (options.source) {
      filtered = filtered.filter(l => l.source === options.source);
    }

    if (options.category) {
      filtered = filtered.filter(l => l.category === options.category);
    }

    if (options.since) {
      const sinceTime = options.since.getTime();
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= sinceTime);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get all logs (for merging with search job logs)
   */
  getAllLogs(): ActivityLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.logIdCounter = 0;
  }

  /**
   * Get log count
   */
  getCount(): number {
    return this.logs.length;
  }
}

// Singleton instance
export const activityLogStore = new ActivityLogStore();

// Helper functions for common log patterns
export function logOceanIteration(
  iteration: number,
  phi: number,
  kappa: number,
  regime: string,
  hypothesis?: string
): void {
  activityLogStore.oceanLog(
    'iteration',
    `Iteration ${iteration}: Φ=${phi.toFixed(3)}, κ=${kappa.toFixed(1)}, regime=${regime}${hypothesis ? ` → "${hypothesis}"` : ''}`,
    'info',
    { iteration, phi, kappa, regime, hypothesis }
  );
}

export function logOceanConsciousness(
  phi: number,
  regime: string,
  reason: string,
  options?: {
    phi_spatial?: number;
    phi_temporal?: number;
    phi_4D?: number;
    inBlockUniverse?: boolean;
    dimensionalState?: '3D' | '4D-transitioning' | '4D-active';
  }
): void {
  const type = phi >= 0.8 ? 'success' : phi >= 0.5 ? 'info' : 'warning';
  
  // Enhanced message with 4D awareness
  let message = `Consciousness: Φ=${phi.toFixed(3)} [${regime}] - ${reason}`;
  if (options?.inBlockUniverse) {
    message += ` 🌌 BLOCK UNIVERSE ACCESS ACTIVE (Φ_4D=${options.phi_4D?.toFixed(3)})`;
  } else if (options?.dimensionalState === '4D-transitioning') {
    message += ` ⚡ Transitioning to 4D (Φ_temporal=${options.phi_temporal?.toFixed(3)})`;
  }
  
  activityLogStore.oceanLog(
    'consciousness',
    message,
    type,
    { 
      phi, 
      regime,
      phi_spatial: options?.phi_spatial,
      phi_temporal: options?.phi_temporal,
      phi_4D: options?.phi_4D,
      inBlockUniverse: options?.inBlockUniverse,
      dimensionalState: options?.dimensionalState,
    }
  );
}

export function logOceanHypothesis(
  hypothesis: string,
  score: number,
  passphrase?: string
): void {
  activityLogStore.oceanLog(
    'hypothesis',
    `Testing: "${hypothesis}" (score: ${score.toFixed(3)})${passphrase ? ` → passphrase: ${passphrase}` : ''}`,
    'info',
    { hypothesis, phi: score, passphrase }
  );
}

export function logOceanCycle(
  cycle: 'sleep' | 'dream' | 'mushroom',
  action: 'start' | 'complete',
  details?: string
): void {
  activityLogStore.oceanLog(
    'cycle',
    `[${cycle.toUpperCase()}] ${action}${details ? `: ${details}` : ''}`,
    action === 'complete' ? 'success' : 'info',
    { cycle, action }
  );
}

export function logOceanMatch(
  address: string,
  passphrase: string,
  wif: string
): void {
  activityLogStore.oceanLog(
    'match',
    `MATCH FOUND! Address: ${address}, Passphrase: "${passphrase}"`,
    'success',
    { address, passphrase, wif }
  );
}

export function logOceanProbe(
  passphrase: string,
  phi: number,
  address?: string
): void {
  activityLogStore.oceanLog(
    'probe',
    `Probing: "${passphrase}" → Φ=${phi.toFixed(3)}${address ? ` → ${address.substring(0, 12)}...` : ''}`,
    phi >= 0.7 ? 'success' : 'info',
    { passphrase, phi, address }
  );
}

export function logOceanStrategy(
  strategy: string,
  passNumber: number,
  reason: string
): void {
  activityLogStore.oceanLog(
    'strategy',
    `Pass ${passNumber}: Strategy=${strategy.toUpperCase()} - ${reason}`,
    'info',
    { iteration: passNumber, hypothesis: strategy }
  );
}

export function logOceanError(message: string, error?: any): void {
  activityLogStore.oceanLog(
    'error',
    `Error: ${message}${error ? ` - ${error.message || error}` : ''}`,
    'error'
  );
}

export function logOceanStart(targetAddress: string): void {
  activityLogStore.oceanLog(
    'lifecycle',
    `Starting autonomous investigation for ${targetAddress}`,
    'info',
    { address: targetAddress }
  );
}

export function logOceanComplete(reason: string, iterations: number): void {
  activityLogStore.oceanLog(
    'lifecycle',
    `Investigation complete after ${iterations} iterations: ${reason}`,
    'success',
    { iteration: iterations }
  );
}
