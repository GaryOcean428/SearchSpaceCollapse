/**
 * Frontend Telemetry Client
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * Captures frontend events and sends to /api/telemetry/capture
 * Tracks user interactions, search flows, and performance metrics
 */

import type { FrontendEventType } from '@shared/types/qig-generated';

interface TelemetryEvent {
  event_type: FrontendEventType;
  timestamp: number;
  trace_id: string;
  metadata?: Record<string, any>;
}

interface TelemetryConfig {
  apiUrl: string;
  batchSize?: number;
  flushInterval?: number;
  enableDebug?: boolean;
}

class TelemetryClient {
  private config: Required<TelemetryConfig>;
  private eventQueue: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor(config: TelemetryConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      enableDebug: false,
      ...config,
    };
    
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Generate trace ID for event
   */
  private generateTraceId(): string {
    return `fe-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Capture telemetry event
   */
  capture(
    eventType: FrontendEventType,
    metadata?: Record<string, any>
  ): void {
    const event: TelemetryEvent = {
      event_type: eventType,
      timestamp: Date.now(),
      trace_id: this.generateTraceId(),
      metadata: {
        ...metadata,
        sessionId: this.sessionId,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    };
    
    if (this.config.enableDebug) {
      console.log('[Telemetry]', event);
    }
    
    this.eventQueue.push(event);
    
    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush event queue to backend
   */
  private async flush(synchronous = false): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // Send events to backend
      for (const event of events) {
        const promise = fetch(`${this.config.apiUrl}/api/telemetry/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-ID': event.trace_id,
          },
          body: JSON.stringify(event),
          keepalive: synchronous, // Use keepalive for beforeunload
        });
        
        if (!synchronous) {
          promise.catch(error => {
            console.error('[Telemetry] Failed to send event', error);
          });
        } else {
          await promise;
        }
      }
      
      if (this.config.enableDebug) {
        console.log(`[Telemetry] Flushed ${events.length} events`);
      }
    } catch (error) {
      console.error('[Telemetry] Flush error', error);
      
      // Re-queue events on error (unless synchronous)
      if (!synchronous) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  /**
   * Track search initiation
   */
  trackSearchInitiated(query: string, metadata?: Record<string, any>): void {
    this.capture('search_initiated', {
      query,
      ...metadata,
    });
  }

  /**
   * Track result rendering
   */
  trackResultRendered(duration: number, metadata?: Record<string, any>): void {
    this.capture('result_rendered', {
      duration,
      ...metadata,
    });
  }

  /**
   * Track error occurrence
   */
  trackError(errorCode: string, errorMessage: string, metadata?: Record<string, any>): void {
    this.capture('error_occurred', {
      errorCode,
      errorMessage,
      ...metadata,
    });
  }

  /**
   * Track basin visualization
   */
  trackBasinVisualized(phi: number, kappa: number, regime: string): void {
    this.capture('basin_visualized', {
      phi,
      kappa,
      regime,
    });
  }

  /**
   * Track metric display
   */
  trackMetricDisplayed(metricName: string, value: number): void {
    this.capture('metric_displayed', {
      metricName,
      value,
    });
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, target: string, metadata?: Record<string, any>): void {
    this.capture('interaction', {
      action,
      target,
      ...metadata,
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    this.flush(true);
  }
}

// Singleton instance
let telemetryInstance: TelemetryClient | null = null;

/**
 * Initialize telemetry client
 */
export function initTelemetry(config: TelemetryConfig): TelemetryClient {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryClient(config);
  }
  return telemetryInstance;
}

/**
 * Get telemetry client instance
 */
export function getTelemetry(): TelemetryClient {
  if (!telemetryInstance) {
    throw new Error('Telemetry not initialized. Call initTelemetry() first.');
  }
  return telemetryInstance;
}

/**
 * Convenience export of telemetry methods
 */
export const telemetry = {
  init: initTelemetry,
  get: getTelemetry,
  trackSearchInitiated: (query: string, metadata?: Record<string, any>) => 
    getTelemetry().trackSearchInitiated(query, metadata),
  trackResultRendered: (duration: number, metadata?: Record<string, any>) => 
    getTelemetry().trackResultRendered(duration, metadata),
  trackError: (errorCode: string, errorMessage: string, metadata?: Record<string, any>) => 
    getTelemetry().trackError(errorCode, errorMessage, metadata),
  trackBasinVisualized: (phi: number, kappa: number, regime: string) => 
    getTelemetry().trackBasinVisualized(phi, kappa, regime),
  trackMetricDisplayed: (metricName: string, value: number) => 
    getTelemetry().trackMetricDisplayed(metricName, value),
  trackInteraction: (action: string, target: string, metadata?: Record<string, any>) => 
    getTelemetry().trackInteraction(action, target, metadata),
};
