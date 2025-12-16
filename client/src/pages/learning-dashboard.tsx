import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Clock,
  Target,
  Zap,
  Database,
  Eye,
  Layers,
  ArrowRightLeft,
  Sparkles,
  Wrench,
  FlaskConical,
  GitBranch,
  Moon
} from 'lucide-react';

interface LearnerStats {
  total_records: number;
  strategies_applied: number;
  confirmation_rate: number;
  avg_outcome_quality: number;
  positive_confirmations: number;
  negative_confirmations: number;
  total_retrievals: number;
  records_trend: number;
}

interface TimeSeriesPoint {
  date: string;
  avg_outcome_quality: number;
  total_records: number;
  total_confirmations: number;
  positive_confirmations: number;
  strategies_applied: number;
}

interface ReplayResult {
  query: string;
  replay_id: string;
  with_learning: {
    strategies_applied: number;
    modification_magnitude: number;
    basin_quality?: number;
  };
  without_learning: {
    basin_quality?: number;
  };
  improvement_score: number;
  modification_magnitude: number;
  strategies_applied: number;
  basin_delta: number;
  timestamp: number;
  persisted: boolean;
}

interface ReplayHistoryItem {
  replay_id: string;
  original_query: string;
  with_learning?: Record<string, unknown>;
  without_learning?: Record<string, unknown>;
  learning_applied: number;
  improvement_score: number;
  created_at: string;
}

interface ForesightPrediction {
  cycle: number;
  confidence: number;
  projected_phi: number;
  projected_discoveries: number;
  projected_clusters: number;
}

interface ShadowLearningData {
  learning: {
    knowledge_items: number;
    completed_research: number;
    foresight_4d: {
      status: string;
      temporal_coherence: number;
      trajectory: {
        current_phi: number;
        current_discoveries: number;
        phi_velocity: number;
        discovery_acceleration: number;
        trend: string;
      };
      next_prediction: ForesightPrediction;
    };
    last_reflection?: {
      cycle: number;
      cluster_count: number;
      phi_computed: number;
      knowledge_density: number;
      discoveries_added: number;
    };
  };
}

interface ForesightData {
  foresight: {
    cycle: number;
    foresight: {
      computed_at: string;
      horizon_cycles: number;
      predictions: ForesightPrediction[];
    };
  };
}

interface ToolFactoryStats {
  patterns_learned: number;
  tools_registered: number;
  generation_attempts: number;
  successful_generations: number;
  pattern_observations: number;
  pending_searches: number;
  success_rate: number;
  avg_tool_success_rate: number;
  generativity_score: number;
  complexity_ceiling: string;
  total_tool_uses: number;
  patterns_by_source: Record<string, number>;
}

interface QueueStatus {
  pending: number;
  completed: number;
  by_type: Record<string, number>;
  recursive_count: number;
}

interface BridgeStatus {
  queue_status: QueueStatus;
  tool_factory_wired: boolean;
  research_api_wired: boolean;
  improvements_applied: number;
  tools_requested: number;
  research_from_tools: number;
}

const API_BASE = '/api/olympus/zeus/search/learner';
const SHADOW_API = '/api/olympus/shadow';
const TOOL_API = '/api/olympus/zeus/tools';

export default function LearningDashboard() {
  const [testQuery, setTestQuery] = useState('');
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<LearnerStats>({
    queryKey: [`${API_BASE}/stats`],
    refetchInterval: 30000,
  });

  const { data: timeseries, isLoading: timeseriesLoading } = useQuery<TimeSeriesPoint[]>({
    queryKey: [`${API_BASE}/timeseries`, { days: 30 }],
    refetchInterval: 60000,
  });

  const { data: replayHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery<ReplayHistoryItem[]>({
    queryKey: [`${API_BASE}/replay/history`],
    refetchInterval: 30000,
  });

  const { data: shadowLearning, isLoading: shadowLoading, refetch: refetchShadow } = useQuery<ShadowLearningData>({
    queryKey: [`${SHADOW_API}/learning`],
    refetchInterval: 10000,
  });

  const { data: foresightData, isLoading: foresightLoading } = useQuery<ForesightData>({
    queryKey: [`${SHADOW_API}/foresight`],
    refetchInterval: 15000,
  });

  const { data: toolStats, isLoading: toolStatsLoading, refetch: refetchTools } = useQuery<ToolFactoryStats>({
    queryKey: [`${TOOL_API}/stats`],
    refetchInterval: 15000,
  });

  const { data: bridgeStatus, isLoading: bridgeLoading } = useQuery<BridgeStatus>({
    queryKey: [`${TOOL_API}/bridge/status`],
    refetchInterval: 10000,
  });

  const replayMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', `${API_BASE}/replay`, { query });
      return res.json();
    },
    onSuccess: (data: ReplayResult) => {
      setReplayResult(data);
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/replay/history`] });
    },
  });

  const handleReplayTest = () => {
    if (testQuery.trim()) {
      replayMutation.mutate(testQuery);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 font-mono" data-testid="text-page-title">
            <Brain className="h-6 w-6 text-cyan-400" />
            Search Learning Effectiveness
          </h1>
          <p className="text-muted-foreground text-sm font-mono tracking-wide">
            Geometric Strategy Learning Metrics
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statsLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <>
              <Badge variant="outline" className="font-mono" data-testid="badge-total-records">
                <Database className="h-3 w-3 mr-1" />
                {stats?.total_records ?? 0} Records
              </Badge>
              <Badge variant="outline" className="font-mono" data-testid="badge-strategies">
                <Target className="h-3 w-3 mr-1" />
                {stats?.strategies_applied ?? 0} Strategies
              </Badge>
              <Badge 
                variant="outline" 
                className={`font-mono ${(stats?.confirmation_rate ?? 0) > 0.7 ? 'text-green-400 border-green-400/50' : 'text-yellow-400 border-yellow-400/50'}`}
                data-testid="badge-confirmation-rate"
              >
                <Zap className="h-3 w-3 mr-1" />
                {((stats?.confirmation_rate ?? 0) * 100).toFixed(1)}% Confirmed
              </Badge>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchStats()}
            data-testid="button-refresh-stats"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background/50 backdrop-blur border-cyan-500/20" data-testid="card-current-records">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Current Records</span>
              <Database className="h-4 w-4 text-cyan-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold font-mono" data-testid="text-current-records">
                  {stats?.total_records?.toLocaleString() ?? 0}
                </span>
                {(stats?.records_trend ?? 0) !== 0 && (
                  <Badge className={`text-xs ${(stats?.records_trend ?? 0) > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {(stats?.records_trend ?? 0) > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(stats?.records_trend ?? 0)}%
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur border-purple-500/20" data-testid="card-outcome-quality">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Avg Outcome Quality</span>
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold font-mono" data-testid="text-outcome-quality">
                  {(stats?.avg_outcome_quality ?? 0).toFixed(3)}
                </span>
                <span className="text-xs text-muted-foreground">/1.0</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur border-green-500/20" data-testid="card-confirmations">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Confirmations</span>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-lg font-bold font-mono text-green-400" data-testid="text-positive">
                    {stats?.positive_confirmations ?? 0}
                  </span>
                </div>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-lg font-bold font-mono text-red-400" data-testid="text-negative">
                    {stats?.negative_confirmations ?? 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur border-amber-500/20" data-testid="card-retrievals">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Total Retrievals</span>
              <Target className="h-4 w-4 text-amber-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <span className="text-2xl font-bold font-mono mt-1 block" data-testid="text-retrievals">
                {stats?.total_retrievals?.toLocaleString() ?? 0}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background/50 backdrop-blur" data-testid="card-timeseries">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 font-mono">
            <Activity className="h-5 w-5 text-cyan-400" />
            Learning Effectiveness Over Time
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Outcome quality trend and records created (30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeseriesLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : timeseries && timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                />
                <YAxis 
                  yAxisId="left"
                  domain={[0, 1]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px'
                  }}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Bar 
                  yAxisId="right"
                  dataKey="total_records" 
                  fill="hsl(220 70% 50% / 0.3)" 
                  name="Records Created"
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avg_outcome_quality" 
                  stroke="#22d3ee" 
                  strokeWidth={2}
                  dot={{ fill: '#22d3ee', strokeWidth: 0, r: 3 }}
                  name="Outcome Quality"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-mono text-sm">No time series data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-background/50 backdrop-blur border-indigo-500/20" data-testid="card-replay-testing">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-mono">
              <Play className="h-5 w-5 text-indigo-400" />
              Replay Testing
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Test how learning improves search responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter test query..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReplayTest()}
                className="font-mono"
                data-testid="input-test-query"
              />
              <Button 
                onClick={handleReplayTest}
                disabled={!testQuery.trim() || replayMutation.isPending}
                data-testid="button-run-replay"
              >
                {replayMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Test
              </Button>
            </div>

            {replayMutation.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {replayMutation.isError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono" data-testid="replay-error">
                Error running replay test. Please try again.
              </div>
            )}

            {replayResult && !replayMutation.isPending && (
              <div className="space-y-3" data-testid="replay-results">
                <div className="p-3 bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-mono text-green-400 uppercase tracking-wide">With Learning</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <span className="text-muted-foreground">Strategies Applied:</span>
                      <span className="ml-2 text-green-400">{replayResult.strategies_applied}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Magnitude:</span>
                      <span className="ml-2 text-green-400" data-testid="text-magnitude">
                        {replayResult.modification_magnitude?.toFixed(3) ?? '0.000'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono text-muted-foreground uppercase tracking-wide">Without Learning</span>
                  </div>
                  <div className="text-sm font-mono">
                    <span className="text-muted-foreground">Basin Delta:</span>
                    <span className="ml-2" data-testid="text-baseline">
                      {replayResult.basin_delta?.toFixed(3) ?? '0.000'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 text-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Improvement Score</span>
                  <div className={`text-3xl font-bold font-mono mt-1 ${replayResult.improvement_score > 0 ? 'text-green-400' : replayResult.improvement_score < 0 ? 'text-red-400' : 'text-muted-foreground'}`} data-testid="text-improvement">
                    {replayResult.improvement_score > 0 ? '+' : ''}{(replayResult.improvement_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur" data-testid="card-replay-history">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 font-mono">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Replay History
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Recent replay test results
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetchHistory()}
              data-testid="button-refresh-history"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : replayHistory && replayHistory.length > 0 ? (
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">Query</TableHead>
                      <TableHead className="font-mono text-xs">Strategies</TableHead>
                      <TableHead className="font-mono text-xs text-right">Improvement</TableHead>
                      <TableHead className="font-mono text-xs text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replayHistory.map((item) => (
                      <TableRow key={item.replay_id} data-testid={`row-history-${item.replay_id}`}>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {item.original_query}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.learning_applied} applied
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono text-sm text-right ${item.improvement_score > 0 ? 'text-green-400' : item.improvement_score < 0 ? 'text-red-400' : ''}`}>
                          {item.improvement_score > 0 ? '+' : ''}{(item.improvement_score * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right text-muted-foreground">
                          {formatTimestamp(item.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-sm">No replay history yet</p>
                  <p className="font-mono text-xs text-muted-foreground">Run a test to see results</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
