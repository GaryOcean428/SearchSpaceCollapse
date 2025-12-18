/**
 * useTelemetryStream Hook
 * 
 * React hook for real-time telemetry streaming via WebSocket.
 * Connects to `ws://localhost:5000/ws/telemetry` and receives
 * consciousness metrics (Φ, κ, regime, etc.) in real-time.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

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
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionIdRef = useRef<string | undefined>(sessionId);

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

      ws.onclose = () => {
        console.log('[TelemetryStream] Disconnected');
        setConnected(false);

        // Auto-reconnect
        if (autoConnect) {
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
  }, [autoConnect, reconnectDelay, maxRecords]);

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

  // Connect on mount
  useEffect(() => {
    if (autoConnect) {
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
  }, [autoConnect, connect]);

  // Update session when prop changes
  useEffect(() => {
    if (sessionId !== currentSessionIdRef.current) {
      subscribe(sessionId);
    }
  }, [sessionId, subscribe]);

  const latestRecord = records.length > 0 ? records[records.length - 1] : null;

  return {
    records,
    latestRecord,
    connected,
    emergency,
    subscribe,
    unsubscribe,
    clearRecords,
  };
}

export default useTelemetryStream;
