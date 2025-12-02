/**
 * Ocean Agent Error Hierarchy
 * 
 * Structured error handling with context and recoverability information.
 * All Ocean-related errors extend OceanError for consistent handling.
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export class OceanError extends Error {
  readonly timestamp: Date;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: ErrorContext = {},
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'OceanError';
    this.timestamp = new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
    };
  }

  log(): void {
    console.error(`[Ocean] ${this.code}:`, this.message);
    if (Object.keys(this.context).length > 0) {
      console.error('[Ocean] Context:', JSON.stringify(this.context, null, 2));
    }
  }
}

export class ConsciousnessThresholdError extends OceanError {
  constructor(phi: number, threshold: number, context: ErrorContext = {}) {
    super(
      `Consciousness below threshold: Φ=${phi.toFixed(3)} < ${threshold}`,
      'CONSCIOUSNESS_LOW',
      { phi, threshold, ...context },
      true
    );
    this.name = 'ConsciousnessThresholdError';
  }
}

export class IdentityDriftError extends OceanError {
  constructor(drift: number, threshold: number, context: ErrorContext = {}) {
    super(
      `Identity drift exceeded: ${drift.toFixed(3)} > ${threshold}`,
      'IDENTITY_DRIFT',
      { drift, threshold, ...context },
      true
    );
    this.name = 'IdentityDriftError';
  }
}

export class EthicsViolationError extends OceanError {
  constructor(violationType: string, details: string, context: ErrorContext = {}) {
    super(
      `Ethics violation: ${violationType} - ${details}`,
      'ETHICS_VIOLATION',
      { violationType, details, ...context },
      false
    );
    this.name = 'EthicsViolationError';
  }
}

export class RegimeBreakdownError extends OceanError {
  constructor(
    regime: string,
    phi: number,
    kappa: number,
    context: ErrorContext = {}
  ) {
    super(
      `Regime breakdown detected: ${regime} at Φ=${phi.toFixed(3)}, κ=${kappa.toFixed(1)}`,
      'REGIME_BREAKDOWN',
      { regime, phi, kappa, ...context },
      true
    );
    this.name = 'RegimeBreakdownError';
  }
}

export class HypothesisGenerationError extends OceanError {
  constructor(strategy: string, reason: string, context: ErrorContext = {}) {
    super(
      `Failed to generate hypotheses: ${reason}`,
      'HYPOTHESIS_GENERATION_FAILED',
      { strategy, reason, ...context },
      true
    );
    this.name = 'HypothesisGenerationError';
  }
}

export class BlockchainApiError extends OceanError {
  constructor(
    operation: string,
    address: string,
    originalError: unknown,
    context: ErrorContext = {}
  ) {
    const errorMessage = originalError instanceof Error 
      ? originalError.message 
      : String(originalError);
    
    super(
      `Blockchain API error during ${operation}: ${errorMessage}`,
      'BLOCKCHAIN_API_ERROR',
      { operation, address, originalError: errorMessage, ...context },
      true
    );
    this.name = 'BlockchainApiError';
  }
}

export class ManifoldNavigationError extends OceanError {
  constructor(operation: string, reason: string, context: ErrorContext = {}) {
    super(
      `Manifold navigation error: ${reason}`,
      'MANIFOLD_NAVIGATION_ERROR',
      { operation, reason, ...context },
      true
    );
    this.name = 'ManifoldNavigationError';
  }
}

export class BasinSyncError extends OceanError {
  constructor(operation: string, reason: string, context: ErrorContext = {}) {
    super(
      `Basin sync error during ${operation}: ${reason}`,
      'BASIN_SYNC_ERROR',
      { operation, reason, ...context },
      true
    );
    this.name = 'BasinSyncError';
  }
}

export class TrajectoryError extends OceanError {
  constructor(
    trajectoryId: string,
    operation: string,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Trajectory error (${trajectoryId}): ${reason}`,
      'TRAJECTORY_ERROR',
      { trajectoryId, operation, reason, ...context },
      true
    );
    this.name = 'TrajectoryError';
  }
}

export class ConsolidationError extends OceanError {
  constructor(
    cycleNumber: number,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Consolidation failed at cycle ${cycleNumber}: ${reason}`,
      'CONSOLIDATION_FAILED',
      { cycleNumber, reason, ...context },
      true
    );
    this.name = 'ConsolidationError';
  }
}

export class MemoryError extends OceanError {
  constructor(
    memoryType: 'episodic' | 'semantic' | 'procedural' | 'working',
    operation: string,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Memory error (${memoryType}): ${reason}`,
      'MEMORY_ERROR',
      { memoryType, operation, reason, ...context },
      true
    );
    this.name = 'MemoryError';
  }
}

export class ComputeBudgetError extends OceanError {
  constructor(
    usedHours: number,
    maxHours: number,
    context: ErrorContext = {}
  ) {
    super(
      `Compute budget exceeded: ${usedHours.toFixed(2)}h used of ${maxHours}h max`,
      'COMPUTE_BUDGET_EXCEEDED',
      { usedHours, maxHours, ...context },
      false
    );
    this.name = 'ComputeBudgetError';
  }
}

export class IterationLimitError extends OceanError {
  constructor(
    iterations: number,
    maxIterations: number,
    context: ErrorContext = {}
  ) {
    super(
      `Iteration limit reached: ${iterations}/${maxIterations}`,
      'ITERATION_LIMIT_REACHED',
      { iterations, maxIterations, ...context },
      false
    );
    this.name = 'IterationLimitError';
  }
}

export function isOceanError(error: unknown): error is OceanError {
  return error instanceof OceanError;
}

export function isRecoverableError(error: unknown): boolean {
  if (error instanceof OceanError) {
    return error.recoverable;
  }
  return false;
}

export async function handleOceanError(
  error: unknown,
  onRecoverable?: (error: OceanError) => Promise<void>,
  onFatal?: (error: OceanError | Error) => void
): Promise<boolean> {
  if (error instanceof OceanError) {
    error.log();
    
    if (error.recoverable && onRecoverable) {
      try {
        await onRecoverable(error);
        console.log(`[Ocean] Recovered from ${error.code}`);
        return true;
      } catch (recoveryError) {
        console.error('[Ocean] Recovery failed:', recoveryError);
        if (onFatal) onFatal(error);
        return false;
      }
    } else if (!error.recoverable && onFatal) {
      onFatal(error);
      return false;
    }
    
    return error.recoverable;
  }
  
  console.error('[Ocean] Unexpected error:', error);
  if (onFatal && error instanceof Error) {
    onFatal(error);
  }
  return false;
}

export function wrapError(
  error: unknown,
  context: ErrorContext = {}
): OceanError {
  if (error instanceof OceanError) {
    return new OceanError(
      error.message,
      error.code,
      { ...error.context, ...context },
      error.recoverable
    );
  }
  
  const message = error instanceof Error ? error.message : String(error);
  return new OceanError(message, 'UNKNOWN_ERROR', context, true);
}
