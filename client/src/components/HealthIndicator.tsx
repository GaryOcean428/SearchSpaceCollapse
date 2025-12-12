/**
 * Health Indicator Component
 * 
 * Displays system health status in the UI with automatic polling.
 * Shows connection status, subsystem health, and provides quick diagnostics.
 */

import { useQuery } from '@tanstack/react-query';
import { Circle, Activity, AlertTriangle, XCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { get } from '@/lib/api/client';

interface SubsystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
  details?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: number;
  uptime: number;
  subsystems: {
    database: SubsystemHealth;
    pythonBackend: SubsystemHealth;
    storage: SubsystemHealth;
  };
  version?: string;
}

const POLL_INTERVAL = 30000; // Poll every 30 seconds

export function HealthIndicator() {
  const { data, isLoading, error } = useQuery<HealthCheckResponse>({
    queryKey: ['/api/health'],
    queryFn: () => get<HealthCheckResponse>('/api/health'),
    refetchInterval: POLL_INTERVAL,
    retry: 3,
    retryDelay: 5000,
  });

  // Determine icon and color based on status
  const getStatusIcon = () => {
    if (isLoading) {
      return <Activity className="h-3 w-3 animate-pulse text-yellow-500" aria-hidden="true" />;
    }

    if (error || !data) {
      return <XCircle className="h-3 w-3 text-red-500" aria-hidden="true" />;
    }

    switch (data.status) {
      case 'healthy':
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" aria-hidden="true" />;
      case 'degraded':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" aria-hidden="true" />;
      case 'down':
        return <XCircle className="h-3 w-3 text-red-500" aria-hidden="true" />;
      default:
        return <Circle className="h-3 w-3 text-gray-400" aria-hidden="true" />;
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    if (error) return 'Disconnected';
    if (!data) return 'Unknown';
    
    switch (data.status) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getTooltipContent = () => {
    if (error) {
      return (
        <div className="text-sm">
          <p className="font-semibold text-red-500">Connection Error</p>
          <p className="text-xs text-muted-foreground mt-1">
            Unable to reach backend. Please check your connection.
          </p>
        </div>
      );
    }

    if (!data) {
      return <p className="text-sm">No health data available</p>;
    }

    return (
      <div className="space-y-2 text-sm">
        <div>
          <p className="font-semibold">System Status: {data.status.toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">
            Uptime: {formatUptime(data.uptime)}
          </p>
          {data.version && (
            <p className="text-xs text-muted-foreground">
              Version: {data.version}
            </p>
          )}
        </div>

        <div className="border-t pt-2">
          <p className="font-semibold text-xs mb-1">Subsystems</p>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SubsystemStatusIcon status={data.subsystems.database.status} />
              <span className="text-xs">
                Database: {data.subsystems.database.status}
              </span>
              {data.subsystems.database.latency !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({data.subsystems.database.latency}ms)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SubsystemStatusIcon status={data.subsystems.pythonBackend.status} />
              <span className="text-xs">
                Python Backend: {data.subsystems.pythonBackend.status}
              </span>
              {data.subsystems.pythonBackend.latency !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({data.subsystems.pythonBackend.latency}ms)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SubsystemStatusIcon status={data.subsystems.storage.status} />
              <span className="text-xs">
                Storage: {data.subsystems.storage.status}
              </span>
              {data.subsystems.storage.latency !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({data.subsystems.storage.latency}ms)
                </span>
              )}
            </div>
          </div>
        </div>

        {(data.subsystems.database.message || 
          data.subsystems.pythonBackend.message || 
          data.subsystems.storage.message) && (
          <div className="border-t pt-2">
            <p className="font-semibold text-xs mb-1">Messages</p>
            {data.subsystems.database.message && (
              <p className="text-xs text-muted-foreground">
                DB: {data.subsystems.database.message}
              </p>
            )}
            {data.subsystems.pythonBackend.message && (
              <p className="text-xs text-muted-foreground">
                Python: {data.subsystems.pythonBackend.message}
              </p>
            )}
            {data.subsystems.storage.message && (
              <p className="text-xs text-muted-foreground">
                Storage: {data.subsystems.storage.message}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent transition-colors"
          aria-label={`System health: ${getStatusText()}`}
        >
          {getStatusIcon()}
          <span className="text-xs text-muted-foreground">
            {getStatusText()}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
}

function SubsystemStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <Circle className="h-2 w-2 fill-green-500 text-green-500" aria-hidden="true" />;
    case 'degraded':
      return <AlertTriangle className="h-2 w-2 text-yellow-500" aria-hidden="true" />;
    case 'down':
      return <XCircle className="h-2 w-2 text-red-500" aria-hidden="true" />;
    default:
      return <Circle className="h-2 w-2 text-gray-400" aria-hidden="true" />;
  }
}
