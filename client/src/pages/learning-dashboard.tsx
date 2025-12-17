import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, Input, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Progress } from '@/components/ui';
import { MarkdownUpload } from '@/components/MarkdownUpload';
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


interface AutonomousTestStatus {
  running: boolean;
  last_run: number | null;
  last_result: ReplayResult | null;
  run_count: number;
  average_improvement: number;
  recent_average_improvement: number;
  test_interval_seconds: number;
  next_query: string;
  sample_queries_count: number;
  results_history_count: number;
}

const API_BASE = '/api/olympus/zeus/search/learner';
const SHADOW_API = '/api/olympus/shadow';
const TOOL_API = '/api/olympus/zeus/tools';

export default function LearningDashboard() {

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


  const { data: autoTestStatus, isLoading: autoTestLoading, refetch: refetchAutoTest } = useQuery<AutonomousTestStatus>({
    queryKey: [`${API_BASE}/replay/auto/status`],
    refetchInterval: 5000,
  });

  const startAutoTestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `${API_BASE}/replay/auto/start`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/replay/auto/status`] });
    },
  });

  const stopAutoTestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `${API_BASE}/replay/auto/stop`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/replay/auto/status`] });
    },
  });

  const runSingleTestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `${API_BASE}/replay/auto/run`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/replay/auto/status`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/replay/history`] });
    },
  });


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

      <MarkdownUpload />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-background/50 backdrop-blur border-indigo-500/20" data-testid="card-replay-testing">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 font-mono">
                <Play className="h-5 w-5 text-indigo-400" />
                Autonomous Learning Validation
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Continuously measures how much learning improves search quality
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={`font-mono text-xs ${autoTestStatus?.running ? 'text-green-400 border-green-400/50' : 'text-muted-foreground'}`}
              data-testid="badge-auto-status"
            >
              {autoTestStatus?.running ? (
                <>
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  Running
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Idle
                </>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/30 border border-border rounded-md">
              <p className="text-sm font-mono text-muted-foreground">
                This system automatically tests recovery queries to measure how much the learning system 
                improves results compared to baseline. Higher improvement means better learning.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {autoTestStatus?.running ? (
                <Button 
                  variant="outline"
                  onClick={() => stopAutoTestMutation.mutate()}
                  disabled={stopAutoTestMutation.isPending}
                  data-testid="button-stop-auto"
                >
                  {stopAutoTestMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Stop Auto-Testing
                </Button>
              ) : (
                <Button 
                  onClick={() => startAutoTestMutation.mutate()}
                  disabled={startAutoTestMutation.isPending}
                  data-testid="button-start-auto"
                >
                  {startAutoTestMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start Auto-Testing
                </Button>
              )}
              <Button 
                variant="ghost"
                onClick={() => runSingleTestMutation.mutate()}
                disabled={runSingleTestMutation.isPending}
                data-testid="button-run-single"
              >
                {runSingleTestMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Run One Test
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => refetchAutoTest()}
                data-testid="button-refresh-auto"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {autoTestLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : autoTestStatus ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Tests Run</div>
                    <div className="text-2xl font-bold font-mono text-indigo-400" data-testid="text-run-count">
                      {autoTestStatus.run_count}
                    </div>
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Avg Improvement</div>
                    <div className={`text-2xl font-bold font-mono ${autoTestStatus.average_improvement > 0 ? 'text-green-400' : 'text-muted-foreground'}`} data-testid="text-avg-improvement">
                      {autoTestStatus.average_improvement > 0 ? '+' : ''}{(autoTestStatus.average_improvement * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Recent Avg</div>
                    <div className={`text-2xl font-bold font-mono ${autoTestStatus.recent_average_improvement > 0 ? 'text-cyan-400' : 'text-muted-foreground'}`} data-testid="text-recent-improvement">
                      {autoTestStatus.recent_average_improvement > 0 ? '+' : ''}{(autoTestStatus.recent_average_improvement * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Test Queries</div>
                    <div className="text-2xl font-bold font-mono text-purple-400" data-testid="text-query-count">
                      {autoTestStatus.sample_queries_count}
                    </div>
                  </div>
                </div>

                {autoTestStatus.last_result && (
                  <div className="p-3 bg-gradient-to-r from-green-500/5 to-indigo-500/5 border border-green-500/20 rounded-md">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Last Test Result</span>
                      {autoTestStatus.last_run && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(autoTestStatus.last_run * 1000).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm font-mono">
                      <div>
                        <span className="text-muted-foreground">Query:</span>
                        <span className="ml-2 text-foreground truncate block" data-testid="text-last-query">
                          {autoTestStatus.last_result.query}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Strategies:</span>
                        <span className="ml-2 text-green-400">{autoTestStatus.last_result.strategies_applied}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Improvement:</span>
                        <span className={`ml-2 ${(autoTestStatus.last_result.improvement_score ?? 0) > 0 ? 'text-green-400' : 'text-muted-foreground'}`} data-testid="text-last-improvement">
                          {(autoTestStatus.last_result.improvement_score ?? 0) > 0 ? '+' : ''}{((autoTestStatus.last_result.improvement_score ?? 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {autoTestStatus.running && (
                  <div className="p-2 bg-muted/30 border border-border rounded-md flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                    <span className="text-xs font-mono text-muted-foreground">
                      Next test in ~{autoTestStatus.test_interval_seconds}s: "{autoTestStatus.next_query}"
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-sm">Click "Start Auto-Testing" to begin</p>
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

      {/* Shadow Learning Loop Panel */}
      <Card className="bg-background/50 backdrop-blur border-purple-500/20" data-testid="card-shadow-learning">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 font-mono">
              <Moon className="h-5 w-5 text-purple-400" />
              Shadow Learning Loop
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Proactive learning with 4D foresight temporal predictions
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => refetchShadow()}
            data-testid="button-refresh-shadow"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {shadowLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : shadowLearning?.learning ? (
            <div className="space-y-4">
              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    <Database className="h-3 w-3" />
                    Knowledge Items
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-400 mt-1" data-testid="text-knowledge-items">
                    {shadowLearning.learning.knowledge_items?.toLocaleString() ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    <CheckCircle2 className="h-3 w-3" />
                    Research Completed
                  </div>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1" data-testid="text-research-completed">
                    {shadowLearning.learning.completed_research ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    <Sparkles className="h-3 w-3" />
                    Discovery Rate
                  </div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1" data-testid="text-discovery-rate">
                    {shadowLearning.learning.foresight_4d?.trajectory?.discovery_acceleration?.toFixed(2) ?? '0.00'}/cycle
                  </div>
                </div>

                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    <Activity className="h-3 w-3" />
                    Current Φ
                  </div>
                  <div className="text-2xl font-bold font-mono text-green-400 mt-1" data-testid="text-current-phi">
                    {shadowLearning.learning.foresight_4d?.trajectory?.current_phi?.toFixed(3) ?? '0.000'}
                  </div>
                </div>
              </div>

              {/* 4D Foresight Section */}
              {shadowLearning.learning.foresight_4d && (
                <div className="p-4 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-500/20 rounded-md">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="text-sm font-mono font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-400" />
                      4D Temporal Foresight
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`font-mono text-xs ${
                        shadowLearning.learning.foresight_4d.status === 'computed' 
                          ? 'text-green-400 border-green-400/50' 
                          : 'text-yellow-400 border-yellow-400/50'
                      }`}
                    >
                      {shadowLearning.learning.foresight_4d.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trajectory */}
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Trajectory</span>
                      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                        <div>
                          <span className="text-muted-foreground">Trend:</span>
                          <Badge className="ml-2 text-xs" variant="outline">
                            {shadowLearning.learning.foresight_4d.trajectory?.trend ?? 'unknown'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Φ Velocity:</span>
                          <span className={`ml-2 ${(shadowLearning.learning.foresight_4d.trajectory?.phi_velocity ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(shadowLearning.learning.foresight_4d.trajectory?.phi_velocity ?? 0).toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Discoveries:</span>
                          <span className="ml-2 text-cyan-400">
                            {shadowLearning.learning.foresight_4d.trajectory?.current_discoveries ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coherence:</span>
                          <span className="ml-2">
                            {((shadowLearning.learning.foresight_4d.temporal_coherence ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Prediction */}
                    {shadowLearning.learning.foresight_4d.next_prediction && (
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Next Prediction (Cycle {shadowLearning.learning.foresight_4d.next_prediction.cycle})</span>
                        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className="ml-2 text-green-400">
                              {((shadowLearning.learning.foresight_4d.next_prediction.confidence ?? 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Projected Φ:</span>
                            <span className="ml-2 text-purple-400">
                              {shadowLearning.learning.foresight_4d.next_prediction.projected_phi?.toFixed(3) ?? '0.000'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Proj. Discoveries:</span>
                            <span className="ml-2 text-cyan-400">
                              {shadowLearning.learning.foresight_4d.next_prediction.projected_discoveries ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Proj. Clusters:</span>
                            <span className="ml-2">
                              {shadowLearning.learning.foresight_4d.next_prediction.projected_clusters ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Last Reflection */}
              {shadowLearning.learning.last_reflection && (
                <div className="p-3 bg-muted/30 border border-border rounded-md">
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    <Brain className="h-3 w-3" />
                    Last Meta-Reflection (Cycle {shadowLearning.learning.last_reflection.cycle})
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-mono">
                    <div>
                      <span className="text-muted-foreground">Clusters:</span>
                      <span className="ml-2">{shadowLearning.learning.last_reflection.cluster_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Φ Computed:</span>
                      <span className="ml-2">{shadowLearning.learning.last_reflection.phi_computed?.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Density:</span>
                      <span className="ml-2">{shadowLearning.learning.last_reflection.knowledge_density?.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">+Discoveries:</span>
                      <span className="ml-2 text-green-400">+{shadowLearning.learning.last_reflection.discoveries_added}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Moon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-mono text-sm">Shadow Learning Loop not active</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4D Foresight Predictions Chart */}
      {foresightData?.foresight?.foresight?.predictions && foresightData.foresight.foresight.predictions.length > 0 && (
        <Card className="bg-background/50 backdrop-blur border-indigo-500/20" data-testid="card-foresight-chart">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-mono">
              <Eye className="h-5 w-5 text-indigo-400" />
              4D Foresight Prediction Horizon
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Temporal predictions with confidence decay over {foresightData.foresight.foresight.horizon_cycles} cycles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={foresightData.foresight.foresight.predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis 
                  dataKey="cycle" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  label={{ value: 'Cycle', position: 'bottom', fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
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
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'confidence') return [`${(value * 100).toFixed(1)}%`, 'Confidence'];
                    if (name === 'projected_phi') return [value.toFixed(3), 'Projected Φ'];
                    if (name === 'projected_discoveries') return [value, 'Discoveries'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="Confidence"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="projected_discoveries" 
                  stroke="#22d3ee" 
                  strokeWidth={2}
                  dot={{ fill: '#22d3ee', strokeWidth: 0, r: 3 }}
                  name="Projected Discoveries"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tool Factory & Bidirectional Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Factory Stats */}
        <Card className="bg-background/50 backdrop-blur border-amber-500/20" data-testid="card-tool-factory">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 font-mono">
                <Wrench className="h-5 w-5 text-amber-400" />
                Tool Factory
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Self-learning tool generation from patterns
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetchTools()}
              data-testid="button-refresh-tools"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {toolStatsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : toolStats ? (
              <div className="space-y-4">
                {/* Key Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Patterns Learned</div>
                    <div className="text-2xl font-bold font-mono text-amber-400" data-testid="text-patterns-learned">
                      {toolStats.patterns_learned}
                    </div>
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Tools Generated</div>
                    <div className="text-2xl font-bold font-mono text-green-400" data-testid="text-tools-generated">
                      {toolStats.tools_registered}
                    </div>
                  </div>
                </div>

                {/* Generation Stats */}
                <div className="p-3 bg-muted/30 border border-border rounded-md space-y-2">
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Generation Attempts:</span>
                    <span>{toolStats.generation_attempts}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Successful:</span>
                    <span className="text-green-400">{toolStats.successful_generations}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className={toolStats.success_rate > 0.5 ? 'text-green-400' : 'text-yellow-400'}>
                      {(toolStats.success_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Complexity Ceiling:</span>
                    <Badge variant="outline" className="text-xs">{toolStats.complexity_ceiling}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Generativity Score:</span>
                    <span className="text-purple-400">{toolStats.generativity_score?.toFixed(3) ?? '0.000'}</span>
                  </div>
                </div>

                {/* Pattern Sources */}
                {toolStats.patterns_by_source && Object.keys(toolStats.patterns_by_source).length > 0 && (
                  <div className="p-3 bg-muted/30 border border-border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-2">Pattern Sources</div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {Object.entries(toolStats.patterns_by_source).map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between">
                          <span className="text-muted-foreground truncate">{source.replace(/_/g, ' ')}:</span>
                          <span>{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {toolStats.patterns_learned === 0 && toolStats.tools_registered === 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <div className="flex items-center gap-2 text-sm font-mono text-yellow-400">
                      <FlaskConical className="h-4 w-4" />
                      Tool Factory awaiting patterns to learn
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Patterns come from: git repos, tutorials, chat links, file uploads, observations
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-sm">Tool Factory not available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bidirectional Queue Status */}
        <Card className="bg-background/50 backdrop-blur border-cyan-500/20" data-testid="card-bidirectional-queue">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-mono">
              <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
              Research ↔ Tool Bridge
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Bidirectional queue connecting Shadow Research and Tool Factory
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bridgeLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : bridgeStatus ? (
              <div className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs ${bridgeStatus.tool_factory_wired ? 'text-green-400 border-green-400/50' : 'text-red-400 border-red-400/50'}`}
                  >
                    <Wrench className="h-3 w-3 mr-1" />
                    Tool Factory: {bridgeStatus.tool_factory_wired ? 'Connected' : 'Disconnected'}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs ${bridgeStatus.research_api_wired ? 'text-green-400 border-green-400/50' : 'text-red-400 border-red-400/50'}`}
                  >
                    <FlaskConical className="h-3 w-3 mr-1" />
                    Research API: {bridgeStatus.research_api_wired ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Pending Requests</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400" data-testid="text-pending-requests">
                      {bridgeStatus.queue_status?.pending ?? 0}
                    </div>
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Completed</div>
                    <div className="text-2xl font-bold font-mono text-green-400" data-testid="text-completed-requests">
                      {bridgeStatus.queue_status?.completed ?? 0}
                    </div>
                  </div>
                </div>

                {/* Flow Stats */}
                <div className="p-3 bg-muted/30 border border-border rounded-md space-y-2">
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      Recursive Requests:
                    </span>
                    <span>{bridgeStatus.queue_status?.recursive_count ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Tools Requested by Research:</span>
                    <span className="text-amber-400">{bridgeStatus.tools_requested ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Research from Tool Factory:</span>
                    <span className="text-purple-400">{bridgeStatus.research_from_tools ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Improvements Applied:</span>
                    <span className="text-green-400">{bridgeStatus.improvements_applied ?? 0}</span>
                  </div>
                </div>

                {/* Request Types */}
                {bridgeStatus.queue_status?.by_type && Object.keys(bridgeStatus.queue_status.by_type).length > 0 && (
                  <div className="p-3 bg-muted/30 border border-border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-2">Pending by Type</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {Object.entries(bridgeStatus.queue_status.by_type).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="font-mono text-xs">
                          {type}: {count as number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-sm">Bridge not available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
