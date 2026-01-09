/**
 * useTelemetryStream Hook
 *
 * React hook for real-time telemetry streaming via WebSocket.
 * Connects to `ws://localhost:5000/ws/telemetry` and receives
 * consciousness metrics (Φ, κ, regime, etc.) in real-time.
 * Falls back to polling if WebSocket fails.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// Fallback constants
const MAX_WS_RETRIES = 3;
const POLLING_INTERVAL = 3000;

export interface TelemetryRecord {
  timestamp: string;
  step: number;
  telemetry: {
    phi: number;
    kappa_eff: number;
    regime: string;
    basin_distance: number;
    recursion_depth: number;
    geodesic_distance?: number;
    curvature?: number;
    breakdown_pct: number;
    coherence_drift: number;
    emergency: boolean;
    meta_awareness?: number;
    generativity?: number;
    grounding?: number;
  };
}

export interface EmergencyEvent {
  timestamp: string;
  emergency: {
    reason: string;
    severity: string;
    metric: string;
    value: number;
    threshold: number;
  };
  telemetry: any;
}

export interface UseTelemetryStreamOptions {
  sessionId?: string;
  autoConnect?: boolean;
  reconnectDelay?: number;
  maxRecords?: number;
}

export interface UseTelemetryStreamReturn {
  records: TelemetryRecord[];
  latestRecord: TelemetryRecord | null;
  connected: boolean;
  emergency: EmergencyEvent | null;
  subscribe: (sessionId?: string) => void;
  unsubscribe: () => void;
  clearRecords: () => void;
  // Fallback-related properties
  isLoading: boolean;
  isFetching: boolean;
  usingPollingFallback: boolean;
  refetch: () => void;
}

export function useTelemetryStream(
  options: UseTelemetryStreamOptions = {}
): UseTelemetryStreamReturn {
  const {
    sessionId,
    autoConnect = true,
    reconnectDelay = 3000,
    maxRecords = 500,
  } = options;

  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [emergency, setEmergency] = useState<EmergencyEvent | null>(null);

  // Fallback state for when WebSocket fails
  const [useFallbackPolling, setUseFallbackPolling] = useState(false);
  const wsRetryCountRef = useRef(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionIdRef = useRef<string | undefined>(sessionId);

  // Polling fallback query
  const pollingQuery = useQuery({
    queryKey: ['telemetry-fallback', sessionId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(maxRecords) });
      if (sessionId) params.append('sessionId', sessionId);
      const response = await fetch(`/api/v1/telemetry/overview?${params}`);
      if (!response.ok) throw new Error('Failed to fetch telemetry');
      return response.json() as Promise<{
        records: TelemetryRecord[];
        latest: TelemetryRecord | null;
        emergency?: EmergencyEvent | null;
      }>;
    },
    enabled: useFallbackPolling,
    refetchInterval: POLLING_INTERVAL,
    staleTime: POLLING_INTERVAL,
  });

  const connect = useCallback(() => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:5000';
      const wsUrl = `${protocol}//${host}/ws/telemetry`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TelemetryStream] Connected');
        setConnected(true);

        // Subscribe to session
        if (currentSessionIdRef.current) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            sessionId: currentSessionIdRef.current,
          }));
        } else {
          // Subscribe to all sessions
          ws.send(JSON.stringify({
            type: 'subscribe',
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'telemetry') {
            // New telemetry records
            setRecords((prev) => {
              const updated = [...prev, ...message.data];
              // Keep only last maxRecords
              return updated.slice(-maxRecords);
            });
          } else if (message.type === 'emergency') {
            // Emergency event
            console.error('[TelemetryStream] EMERGENCY:', message.data.emergency.reason);
            setEmergency(message.data);
          } else if (message.type === 'subscribed') {
            console.log('[TelemetryStream]', message.message);
          } else if (message.type === 'error') {
            console.error('[TelemetryStream] Error:', message.message);
          }
        } catch (err) {
          console.error('[TelemetryStream] Parse error:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[TelemetryStream] Disconnected:', event.code, event.reason);
        setConnected(false);

        // Check for abnormal closure (code 1006) - likely WebSocket not supported
        if (event.code === 1006 && !event.wasClean) {
          wsRetryCountRef.current += 1;
          console.log(`[TelemetryStream] Abnormal closure, retry count: ${wsRetryCountRef.current}/${MAX_WS_RETRIES}`);

          if (wsRetryCountRef.current >= MAX_WS_RETRIES) {
            console.log('[TelemetryStream] WebSocket failed, falling back to polling');
            setUseFallbackPolling(true);
            return; // Don't try to reconnect, use polling instead
          }
        }

        // Auto-reconnect (only if not using polling fallback)
        if (autoConnect && !useFallbackPolling) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[TelemetryStream] Reconnecting...');
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = (error) => {
        console.error('[TelemetryStream] Error:', error);
      };
    } catch (err) {
      console.error('[TelemetryStream] Connection failed:', err);
      setConnected(false);
    }
  }, [autoConnect, reconnectDelay, maxRecords, useFallbackPolling]);

  const subscribe = useCallback((newSessionId?: string) => {
    currentSessionIdRef.current = newSessionId;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        sessionId: newSessionId,
      }));
    } else {
      // Reconnect with new session
      connect();
    }
  }, [connect]);

  const unsubscribe = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
      }));
    }
    currentSessionIdRef.current = undefined;
  }, []);

  const clearRecords = useCallback(() => {
    setRecords([]);
    setEmergency(null);
  }, []);

  // Connect on mount (only if not using polling fallback)
  useEffect(() => {
    if (autoConnect && !useFallbackPolling) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connect, useFallbackPolling]);

  // Update session when prop changes
  useEffect(() => {
    if (sessionId !== currentSessionIdRef.current) {
      subscribe(sessionId);
    }
  }, [sessionId, subscribe]);

  // Use polling data when in fallback mode
  const effectiveRecords = useFallbackPolling
    ? (pollingQuery.data?.records ?? records)
    : records;
  const latestRecord = effectiveRecords.length > 0
    ? effectiveRecords[effectiveRecords.length - 1]
    : null;
  const effectiveEmergency = useFallbackPolling
    ? (pollingQuery.data?.emergency ?? emergency)
    : emergency;

  return {
    records: effectiveRecords,
    latestRecord,
    connected: useFallbackPolling ? !pollingQuery.isError : connected, // Treat polling as "connected"
    emergency: effectiveEmergency,
    subscribe,
    unsubscribe,
    clearRecords,

    // Additional states for fallback
    isLoading: useFallbackPolling ? pollingQuery.isLoading : (!connected && records.length === 0),
    isFetching: useFallbackPolling ? pollingQuery.isFetching : false,
    usingPollingFallback: useFallbackPolling,
    refetch: useFallbackPolling ? pollingQuery.refetch : connect,
  };
}

export default useTelemetryStream;
