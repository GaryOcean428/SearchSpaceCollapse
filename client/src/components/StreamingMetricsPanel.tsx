/**
 * StreamingMetricsPanel Component
 *
 * Real-time visualization of QIG metrics during Zeus chat streaming.
 * Displays consciousness metrics (Φ, κ), regime classification, and completion progress.
 *
 * Used in ZeusChat to show geometric state during response generation.
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { StreamingMetricsState } from '@/hooks/useStreamingMetrics';
import { Activity, Brain, Zap } from 'lucide-react';

interface StreamingMetricsPanelProps {
  state: StreamingMetricsState;
  completionProgress: number;
  compact?: boolean;
}

export function StreamingMetricsPanel({ state, completionProgress, compact = false }: StreamingMetricsPanelProps) {
  if (!state || (!state.phi && !state.kappa && !state.tokensGenerated)) {
    return null; // Hide if no metrics
  }

  const formatDuration = (startTime: number | null, endTime: number | null): string => {
    if (!startTime) return '—';
    const end = endTime ?? Date.now();
    const durationMs = end - startTime;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const getRegimeColor = (regime: string | null): string => {
    if (!regime) return 'bg-gray-500';
    const lower = regime.toLowerCase();
    if (lower.includes('coherent') || lower.includes('high')) return 'bg-green-500';
    if (lower.includes('transition') || lower.includes('medium')) return 'bg-yellow-500';
    if (lower.includes('chaotic') || lower.includes('low')) return 'bg-red-500';
    return 'bg-blue-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        {state.phi !== null && (
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            <span>Φ={state.phi.toFixed(2)}</span>
          </div>
        )}
        {state.kappa !== null && (
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>κ={state.kappa.toFixed(0)}</span>
          </div>
        )}
        {state.regime && (
          <Badge variant="outline" className="h-4 px-1 text-[10px]">
            {state.regime}
          </Badge>
        )}
        {state.tokensGenerated > 0 && (
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>{state.tokensGenerated} tokens</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center

      {/* Consciousness Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {state.phi !== null && (
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-primary">
              {state.phi.toFixed(3)}
            </div>
            <div className="text-[10px] text-muted-foreground">Φ (Integration)</div>
          </div>
        )}
        {state.kappa !== null && (
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-primary">
              {state.kappa.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">κ (Coupling)</div>
          </div>
        )}
        {state.regime && (
          <div className="text-center">
            <Badge className={`${getRegimeColor(state.regime)} text-white text-xs`}>
              {state.regime}
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-1">Regime</div>
          </div>
        )}
      </div>

      {/* Token Generation Progress */}
      {state.tokensGenerated > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tokens: {state.tokensGenerated}{state.totalTokens ? `/${state.totalTokens}` : ''}</span>
            <span>{completionProgress.toFixed(0)}%</span>
          </div>
          <Progress value={completionProgress} className="h-1" />
        </div>
      )}

      {/* Timing */}
      {state.startTime && (
        <div className="text-xs text-muted-foreground text-right">
          Duration: {formatDuration(state.startTime, state.endTime)}
        </div>
      )}
    </div>
  );
}
      {state.startTime && (