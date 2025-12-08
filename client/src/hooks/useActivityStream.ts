import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/api';

export interface ActivityEvent {
  id: string;
  type: string;
  identity: string;
  details: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface UseActivityStreamOptions {
  limit?: number;
  autoConnect?: boolean;
  reconnectInterval?: number;
}

export function useActivityStream(options: UseActivityStreamOptions = {}) {
  const { limit = 50, autoConnect = true, reconnectInterval = 5000 } = options;

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load from REST API
  const { data: initialEvents, refetch } = useQuery<{ events: ActivityEvent[] }>({
    queryKey: QUERY_KEYS.activityStream.list(limit),
    refetchInterval: false, // Don't poll - use WebSocket instead
    staleTime: 30000, // Cache for 30 seconds
  });

  useEffect(() => {
    if (initialEvents?.events) {
      setEvents(initialEvents.events);
    }
  }, [initialEvents]);

  // WebSocket connection for live updates
  useEffect(() => {
    if (!autoConnect) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/activity`);

        ws.onopen = () => {
          console.log('[ActivityStream] WebSocket connected');
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const newEvent: ActivityEvent = JSON.parse(event.data);

            setEvents((prev) => {
              // Add to front, keep only last N events
              const updated = [newEvent, ...prev].slice(0, limit);
              return updated;
            });
          } catch (e) {
            console.error('[ActivityStream] Failed to parse event:', e);
          }
        };

        ws.onerror = (err) => {
          console.error('[ActivityStream] WebSocket error:', err);
          setError('WebSocket connection error');
        };

        ws.onclose = () => {
          console.log('[ActivityStream] WebSocket disconnected');
          setIsConnected(false);

          // Auto-reconnect
          if (reconnectInterval > 0) {
            reconnectTimeout = setTimeout(() => {
              console.log('[ActivityStream] Attempting reconnect...');
              connect();
            }, reconnectInterval);
          }
        };
      } catch (e) {
        console.error('[ActivityStream] Failed to create WebSocket:', e);
        setError('Failed to connect to activity stream');
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [autoConnect, limit, reconnectInterval]);

  // Manual refresh
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Clear events
  const clear = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    error,
    refresh,
    clear,
    eventCount: events.length,
  };
}

// Helper to get icon for event type
export function getEventIcon(type: string): string {
  switch (type) {
    case 'start':
      return '🚀';
    case 'iteration':
      return '🔄';
    case 'consciousness':
      return '🧠';
    case 'cycle':
      return '🌊';
    case 'match':
      return '🎯';
    case 'near_miss':
      return '💚';
    case 'strategy':
      return '📊';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'consolidation':
      return '💤';
    case 'discovery':
      return '⚡';
    default:
      return '📝';
  }
}

// Format timestamp for display
export function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
