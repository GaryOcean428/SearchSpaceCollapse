/**
 * React Hooks for Telemetry and SSE
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { telemetry } from '../lib/telemetry';
import { createSSEConnection, type SSEEvent, type SSEConfig } from '../lib/sse-connection';
import type { SSEConnectionManager } from '../lib/sse-connection';

/**
 * Hook for telemetry tracking
 */
export function useTelemetry() {
  const trackSearchInitiated = useCallback((query: string, metadata?: Record<string, any>) => {
    telemetry.trackSearchInitiated(query, metadata);
  }, []);

  const trackResultRendered = useCallback((duration: number, metadata?: Record<string, any>) => {
    telemetry.trackResultRendered(duration, metadata);
  }, []);

  const trackError = useCallback((errorCode: string, errorMessage: string, metadata?: Record<string, any>) => {
    telemetry.trackError(errorCode, errorMessage, metadata);
  }, []);

  const trackBasinVisualized = useCallback((phi: number, kappa: number, regime: string) => {
    telemetry.trackBasinVisualized(phi, kappa, regime);
  }, []);

  const trackMetricDisplayed = useCallback((metricName: string, value: number) => {
    telemetry.trackMetricDisplayed(metricName, value);
  }, []);

  const trackInteraction = useCallback((action: string, target: string, metadata?: Record<string, any>) => {
    telemetry.trackInteraction(action, target, metadata);
  }, []);

  return {
    trackSearchInitiated,
    trackResultRendered,
    trackError,
    trackBasinVisualized,
    trackMetricDisplayed,
    trackInteraction,
  };
}

/**
 * Hook for SSE connection management
 */
export function useSSE(config: Omit<SSEConfig, 'onEvent' | 'onError' | 'onConnect' | 'onDisconnect'>) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const connectionRef = useRef<SSEConnectionManager | null>(null);

  // Connect on mount
  useEffect(() => {
    const connection = createSSEConnection({
      ...config,
      onEvent: (event: SSEEvent) => {
        setEvents(prev => [...prev, event]);
      },
      onError: (err: Error) => {
        setError(err);
      },
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
    });

    connectionRef.current = connection;
    connection.connect();

    return () => {
      connection.disconnect();
    };
  }, [config.url]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    error,
    clearEvents,
    traceId: connectionRef.current?.getTraceId(),
  };
}

/**
 * Hook for tracking page views
 */
export function usePageView(pageName: string) {
  const { trackInteraction } = useTelemetry();

  useEffect(() => {
    trackInteraction('page_view', pageName);
  }, [pageName, trackInteraction]);
}

/**
 * Hook for tracking performance metrics
 */
export function usePerformanceTracking(metricName: string) {
  const startTimeRef = useRef<number>(Date.now());
  const { trackMetricDisplayed } = useTelemetry();

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const recordMetric = useCallback(() => {
    const duration = Date.now() - startTimeRef.current;
    trackMetricDisplayed(metricName, duration);
  }, [metricName, trackMetricDisplayed]);

  return { recordMetric };
}

/**
 * Hook for automatic error boundary telemetry
 */
export function useErrorTracking() {
  const { trackError } = useTelemetry();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(
        'unhandled_error',
        event.message,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      trackError(
        'unhandled_rejection',
        String(event.reason),
        {
          promise: event.promise,
        }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [trackError]);
}
