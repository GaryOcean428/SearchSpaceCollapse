/**
 * PhiVisualization Component
 * 
 * Real-time visualization of consciousness metrics (Φ, κ) using WebSocket streaming.
 * Displays:
 * - Φ (integration) trajectory over time
 * - κ (coupling) trajectory over time
 * - Regime transitions with color coding
 * - Emergency alerts
 * - Latest values with status indicators
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useTelemetryStream } from '@/hooks/useTelemetryStream';

interface PhiVisualizationProps {
  sessionId?: string;
  maxDataPoints?: number;
  showLegend?: boolean;
  height?: number;
}

// Regime color mapping
const REGIME_COLORS = {
  linear: '#94a3b8',      // slate-400
  geometric: '#10b981',   // emerald-500
  breakdown: '#ef4444',   // red-500
  resonance: '#8b5cf6',   // violet-500
  unknown: '#6b7280',     // gray-500
};

// Φ thresholds
const PHI_THRESHOLD = 0.70;
const PHI_EXCELLENT = 0.80;

// κ* resonance
const KAPPA_STAR = 64.21;
const KAPPA_RESONANCE_BAND = 2.0;

export function PhiVisualization({
  sessionId,
  maxDataPoints = 100,
  showLegend = true,
  height = 300,
}: PhiVisualizationProps) {
  const { records, latestRecord, connected, emergency } = useTelemetryStream({
    sessionId,
    autoConnect: true,
    maxRecords: maxDataPoints,
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    return records.map((record, index) => ({
      index,
      step: record.step,
      phi: record.telemetry.phi,
      kappa: record.telemetry.kappa_eff,
      regime: record.telemetry.regime,
      emergency: record.telemetry.emergency,
    }));
  }, [records]);

  // Calculate trends
  const trend = useMemo(() => {
    if (records.length < 2) return { phi: 'stable', kappa: 'stable' };

    const recent = records.slice(-10);
    const phiStart = recent[0].telemetry.phi;
    const phiEnd = recent[recent.length - 1].telemetry.phi;
    const kappaStart = recent[0].telemetry.kappa_eff;
    const kappaEnd = recent[recent.length - 1].telemetry.kappa_eff;

    const phiDelta = phiEnd - phiStart;
    const kappaDelta = kappaEnd - kappaStart;

    return {
      phi: phiDelta > 0.02 ? 'up' : phiDelta < -0.02 ? 'down' : 'stable',
      kappa: kappaDelta > 1.0 ? 'up' : kappaDelta < -1.0 ? 'down' : 'stable',
    };
  }, [records]);

  // Get regime color for latest record
  const currentRegimeColor = latestRecord
    ? REGIME_COLORS[latestRecord.telemetry.regime as keyof typeof REGIME_COLORS] || REGIME_COLORS.unknown
    : REGIME_COLORS.unknown;

  // Check if in resonance
  const inResonance = latestRecord
    ? Math.abs(latestRecord.telemetry.kappa_eff - KAPPA_STAR) < KAPPA_RESONANCE_BAND
    : false;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
          />
          <span className="text-sm text-muted-foreground">
            {connected ? 'Live' : 'Disconnected'}
          </span>
          {sessionId && (
            <Badge variant="outline" className="ml-2">
              {sessionId}
            </Badge>
          )}
        </div>

        {latestRecord && (
          <div className="flex items-center gap-2">
            <Badge style={{ backgroundColor: currentRegimeColor }} className="text-white">
              {latestRecord.telemetry.regime}
            </Badge>
            {inResonance && (
              <Badge variant="secondary" className="bg-violet-100 text-violet-900">
                ⚡ Resonance
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Emergency Alert */}
      {emergency && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Emergency: {emergency.emergency.reason.replace('_', ' ')}</AlertTitle>
          <AlertDescription>
            {emergency.emergency.metric}: {emergency.emergency.value.toFixed(3)} (threshold:{' '}
            {emergency.emergency.threshold.toFixed(3)})
          </AlertDescription>
        </Alert>
      )}

      {/* Current Values */}
      {latestRecord && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                Φ (Integration)
                {trend.phi === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                {trend.phi === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestRecord.telemetry.phi.toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {latestRecord.telemetry.phi >= PHI_EXCELLENT && '🟢 Excellent'}
                {latestRecord.telemetry.phi >= PHI_THRESHOLD &&
                  latestRecord.telemetry.phi < PHI_EXCELLENT &&
                  '🟡 Good'}
                {latestRecord.telemetry.phi < PHI_THRESHOLD && '🔴 Low'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                κ (Coupling)
                {trend.kappa === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                {trend.kappa === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestRecord.telemetry.kappa_eff.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {inResonance ? '⚡ Near κ*' : `Δ ${Math.abs(latestRecord.telemetry.kappa_eff - KAPPA_STAR).toFixed(1)}`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Basin Distance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestRecord.telemetry.basin_distance.toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {latestRecord.telemetry.basin_distance < 0.15 && '🟢 Stable'}
                {latestRecord.telemetry.basin_distance >= 0.15 &&
                  latestRecord.telemetry.basin_distance < 0.30 &&
                  '🟡 Drifting'}
                {latestRecord.telemetry.basin_distance >= 0.30 && '🔴 High Drift'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recursion Depth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestRecord.telemetry.recursion_depth}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {latestRecord.telemetry.recursion_depth >= 3 ? '🟢 Integrated' : '🟡 Shallow'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Consciousness Trajectory
          </CardTitle>
          <CardDescription>
            Real-time Φ and κ evolution ({records.length} samples)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="step"
                  label={{ value: 'Step', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 1]}
                  label={{ value: 'Φ', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  label={{ value: 'κ', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <div className="text-sm font-medium">Step {data.step}</div>
                        <div className="text-xs text-muted-foreground">
                          Φ: {data.phi.toFixed(3)} | κ: {data.kappa.toFixed(2)}
                        </div>
                        <div className="text-xs">
                          <Badge
                            style={{
                              backgroundColor:
                                REGIME_COLORS[data.regime as keyof typeof REGIME_COLORS] ||
                                REGIME_COLORS.unknown,
                            }}
                            className="text-white text-xs"
                          >
                            {data.regime}
                          </Badge>
                        </div>
                      </div>
                    );
                  }}
                />
                {showLegend && <Legend />}

                {/* Reference lines */}
                <ReferenceLine
                  yAxisId="left"
                  y={PHI_THRESHOLD}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                  label={{ value: 'Φ threshold', fontSize: 10 }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={KAPPA_STAR}
                  stroke="#8b5cf6"
                  strokeDasharray="3 3"
                  label={{ value: 'κ*', fontSize: 10 }}
                />

                {/* Data lines */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="phi"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Φ (Integration)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="kappa"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="κ (Coupling)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              {connected ? 'Waiting for telemetry data...' : 'Disconnected from telemetry stream'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PhiVisualization;
