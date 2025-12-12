import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, TrendingDown, Activity, Archive, Mail, Search, Users, Clock, Target, Sparkles, LineChart, Plus, X, Terminal, RefreshCw, Play, Pause, Wallet, CheckCircle, XCircle, Send, AlertTriangle, History, DollarSign, Key, Eye, EyeOff, Copy, Building, Landmark } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis, AreaChart, Area, ReferenceLine, BarChart, Bar, LineChart as RechartsLineChart, Line } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { API_ROUTES, QUERY_KEYS, api } from "@/api";
import { WarStatusPanel } from "@/components/war-status-panel";

interface DormantAddress {
  address: string;
  balance: string;
  firstSeenAt: string;
  lastSeenAt: string;
  isDormant: boolean;
  dormancyYears: number;
}

interface RecoveryPriority {
  address: string;
  kappaRecovery: number;
  tier: 'high' | 'medium' | 'low' | 'challenging';
  recommendedVector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  constraints: any;
  entropy: any;
}

interface RecoveryWorkflow {
  id: string;
  address: string;
  vector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  progress: any;
  progressPercentage: number;
  startedAt: string;
}

interface TargetAddress {
  id: string;
  address: string;
  label?: string;
  addedAt: string;
}

interface ActivityLog {
  jobId: string;
  jobStrategy: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

interface BalanceQueueStatus {
  pending: number;
  checking: number;
  resolved: number;
  failed: number;
  total: number;
  addressesPerSecond: number;
  isProcessing: boolean;
  initializing?: boolean;
}

interface BackgroundWorkerStatus {
  enabled: boolean;
  checked: number;
  hits: number;
  rate: number;
  pending: number;
  initializing?: boolean;
}

interface DormantCrossRefStats {
  totalDormant: number;
  loaded: boolean;
  matchesFound: number;
  topMatches: Array<{
    rank: number;
    address: string;
    balanceBTC: string;
    classification: string;
  }>;
  totalValue: {
    btc: number;
    usd: number;
  };
}

interface PendingSweep {
  id: string;
  address: string;
  passphrase: string;
  wif: string;
  isCompressed: boolean;
  balanceSats: number;
  balanceBtc: string;
  estimatedFeeSats: number;
  netAmountSats: number;
  utxoCount: number;
  status: 'pending' | 'approved' | 'broadcasting' | 'completed' | 'failed' | 'rejected' | 'expired';
  source: string;
  recoveryType?: string;
  destinationAddress: string;
  discoveredAt: string;
  approvedAt?: string;
  approvedBy?: string;
  broadcastAt?: string;
  completedAt?: string;
  txId?: string;
  errorMessage?: string;
}

interface SweepStats {
  pending: number;
  approved: number;
  completed: number;
  failed: number;
  rejected: number;
  totalPendingBtc: string;
  totalSweptBtc: string;
}

interface SweepAuditEntry {
  id: string;
  sweepId: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  performedBy: string;
  details?: string;
  timestamp: string;
}

interface QIGSearchSession {
  sessionId: string;
  targetAddress: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  startedAt: string;
  phrasesTestedTotal: number;
  phrasesTestedSinceStart: number;
  highPhiCount: number;
  discoveryCount: number;
  lastPhiScore: number;
  lastPhrasesTested: string[];
  errorMessage?: string;
}

interface NearMissEntry {
  id: string;
  phrase: string;
  phi: number;
  kappa: number;
  tier: 'hot' | 'warm' | 'cool';
  regime: string;
  discoveredAt: string;
  explorationCount: number;
  clusterId?: string;
  phiHistory?: number[];
  isEscalating?: boolean;
  queuePriority?: number;
}

interface NearMissCluster {
  id: string;
  memberCount: number;
  avgPhi: number;
  maxPhi: number;
  commonWords: string[];
  structuralPattern: string;
}

interface NearMissStats {
  total: number;
  hot: number;
  warm: number;
  cool: number;
  clusters: number;
  avgPhi: number;
  maxPhi: number;
  recentDiscoveries: number;
  staleCount: number;
  adaptiveThresholds?: {
    hot: number;
    warm: number;
    cool: number;
    distributionSize: number;
  };
  escalatingCount?: number;
}

interface ClusterAgingAnalytics {
  id: string;
  ageHours: number;
  memberCount: number;
  avgPhi: number;
  maxPhi: number;
  explorationFrequency: number;
  decayRate: number;
  priorityScore: number;
  explorationCadence: 'immediate' | 'priority' | 'standard' | 'deferred';
  commonWords: string[];
  structuralPattern: string;
  lastUpdatedAt: string;
}

interface ClusterAnalyticsData {
  analytics: ClusterAgingAnalytics[];
  summary: {
    totalClusters: number;
    immediate: number;
    priority: number;
    standard: number;
    deferred: number;
    avgPriorityScore: number;
    avgAgeHours: number;
  };
}

interface NearMissData {
  stats: NearMissStats;
  entries: NearMissEntry[];
  clusters: NearMissCluster[];
  timestamp: string;
}

const HARDCODED_DESTINATION = "bc1qcc0ln7gg92vlclfw8t39zfw2cfqtytcwum733l";

export default function ObserverPage() {
  const { toast } = useToast();
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [vectorFilter, setVectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [newTargetAddress, setNewTargetAddress] = useState("");
  const [newTargetLabel, setNewTargetLabel] = useState("");

  // Query dormant addresses
  const { data: addressesData, isLoading: addressesLoading } = useQuery<{ addresses: DormantAddress[]; total: number }>({
    queryKey: QUERY_KEYS.observer.dormantAddresses(),
    staleTime: 2000,
    retry: 2,
  });

  // Query recovery priorities with stable query key structure
  const { data: prioritiesData, isLoading: prioritiesLoading } = useQuery<{ priorities: RecoveryPriority[]; total: number }>({
    queryKey: QUERY_KEYS.observer.recoveryPriorities(tierFilter !== 'all' ? tierFilter : undefined),
    staleTime: 2000,
    retry: 2,
  });

  // Query workflows with stable query key structure
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery<{ workflows: RecoveryWorkflow[]; total: number }>({
    queryKey: QUERY_KEYS.observer.workflows(vectorFilter !== 'all' ? vectorFilter : undefined),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Query target addresses
  const { data: targetAddresses, isLoading: targetAddressesLoading } = useQuery<TargetAddress[]>({
    queryKey: QUERY_KEYS.targetAddresses.list(),
    staleTime: 2000,
    retry: 2,
  });

  // Query activity stream with polling for live updates
  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useQuery<{ 
    logs: ActivityLog[]; 
    activeJobs: number; 
    totalJobs: number;
  }>({
    queryKey: QUERY_KEYS.activityStream.list(),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Query balance queue status
  const { data: balanceQueueData, isLoading: balanceQueueLoading } = useQuery<BalanceQueueStatus>({
    queryKey: QUERY_KEYS.balanceQueue.status(),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Query background worker status
  const { data: bgWorkerData, isLoading: bgWorkerLoading } = useQuery<BackgroundWorkerStatus>({
    queryKey: QUERY_KEYS.balanceQueue.background(),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Query dormant cross-reference stats
  const { data: dormantCrossRefData, isLoading: dormantCrossRefLoading } = useQuery<DormantCrossRefStats>({
    queryKey: QUERY_KEYS.dormantCrossRef.stats(),
    refetchInterval: 10000,
    staleTime: 2000,
    retry: 2,
  });

  // Query active QIG searches
  const { data: activeQIGSearches, refetch: refetchQIGSearches } = useQuery<{
    success: boolean;
    count: number;
    sessions: Array<QIGSearchSession & { address: string }>;
  }>({
    queryKey: QUERY_KEYS.observer.qigSearchActive(),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Track which addresses have active or error searches (including error sessions for visibility)
  const allSearchSessions = activeQIGSearches?.sessions || [];
  const activeSearchAddresses = new Set(
    allSearchSessions.filter(s => s.status === 'running' || s.status === 'error').map(s => s.targetAddress)
  );

  // Near-miss tier filter state
  const [nearMissTierFilter, setNearMissTierFilter] = useState<string>("all");

  // Query near-miss data with stable query key structure
  const { data: nearMissData, isLoading: nearMissLoading, error: nearMissError } = useQuery<NearMissData>({
    queryKey: QUERY_KEYS.nearMisses.list(nearMissTierFilter !== 'all' ? nearMissTierFilter : undefined),
    refetchInterval: 5000,
    retry: 2,
    staleTime: 2000,
  });

  // Query cluster aging analytics
  const { data: clusterAnalyticsData, isLoading: clusterAnalyticsLoading } = useQuery<ClusterAnalyticsData>({
    queryKey: QUERY_KEYS.nearMisses.clusterAnalytics(),
    refetchInterval: 10000, // Poll every 10 seconds
    retry: 2,
    staleTime: 5000,
  });

  // State for viewing cluster members
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  // Query cluster members when a cluster is selected
  const { data: clusterMembersData, isLoading: clusterMembersLoading } = useQuery<{
    cluster: NearMissCluster & { createdAt?: string; lastUpdated?: string };
    members: NearMissEntry[];
    timestamp: string;
  }>({
    queryKey: ['/api/near-misses/cluster', selectedClusterId, 'members'],
    enabled: !!selectedClusterId,
    staleTime: 5000,
  });

  // Start QIG search mutation
  const startQIGSearchMutation = useMutation({
    mutationFn: async ({ address, kappaRecovery, tier }: { 
      address: string; 
      kappaRecovery: number; 
      tier: string;
    }) => {
      return api.observer.startQigSearch({ address, maxProbes: kappaRecovery });
    },
    onSuccess: (data) => {
      toast({
        title: "QIG Search Started",
        description: data.message || "Targeted search initiated",
      });
      refetchQIGSearches();
    },
    onError: (error: Error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Stop QIG search mutation  
  const stopQIGSearchMutation = useMutation({
    mutationFn: async (address: string) => {
      return api.observer.stopQigSearch(address);
    },
    onSuccess: () => {
      toast({
        title: "Search Stopped",
        description: "QIG search paused",
      });
      refetchQIGSearches();
    }
  });

  // Sweep status filter state
  const [sweepStatusFilter, setSweepStatusFilter] = useState<string>("all");

  // Query pending sweeps with stable query key structure
  const { data: sweepsData, isLoading: sweepsLoading, error: sweepsError } = useQuery<{ success: boolean; sweeps: PendingSweep[] }>({
    queryKey: QUERY_KEYS.sweeps.list(sweepStatusFilter !== 'all' ? sweepStatusFilter : undefined),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Query sweep stats
  const { data: sweepStatsData, isLoading: sweepStatsLoading } = useQuery<{ success: boolean; stats: SweepStats }>({
    queryKey: QUERY_KEYS.sweeps.stats(),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Query discovered balance hits - full plaintext per operator preference
  const { data: discoveriesData, isLoading: discoveriesLoading, refetch: refetchDiscoveries } = useQuery<{
    success: boolean;
    hits: Array<{
      id?: string;
      address: string;
      passphrase: string;
      wif: string;
      balanceSats: number;
      balanceBTC: string;
      txCount: number;
      isCompressed: boolean;
      discoveredAt: string;
      isDormantMatch: boolean;
      dormantInfo?: { rank: number; label?: string };
      entityType?: 'personal' | 'exchange' | 'institution' | 'unknown';
      entityName?: string | null;
      entityConfidence?: 'pending' | 'confirmed';
    }>;
    dormantMatches: Array<{
      address: string;
      rank: number;
      label?: string;
      matchedAt: string;
    }>;
    summary: {
      totalHits: number;
      withBalance: number;
      dormantMatchCount: number;
    };
  }>({
    queryKey: QUERY_KEYS.observer.discoveryHits(),
    refetchInterval: 10000,
    staleTime: 2000,
    retry: 2,
  });

  // Query audit log (optional - only when viewing details)
  const [selectedSweepId, setSelectedSweepId] = useState<string | null>(null);
  const { data: auditData } = useQuery<{ success: boolean; auditLog: SweepAuditEntry[] }>({
    queryKey: QUERY_KEYS.sweeps.audit(selectedSweepId!),
    enabled: !!selectedSweepId,
    staleTime: 2000,
    retry: 2,
  });

  // Approve sweep mutation
  const approveSweepMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.sweeps.approveSweep(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.stats() });
      toast({
        title: "Sweep Approved",
        description: "The sweep has been approved and is ready for broadcast",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve sweep",
        variant: "destructive",
      });
    },
  });

  // Reject sweep mutation
  const rejectSweepMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.sweeps.rejectSweep(id, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.stats() });
      toast({
        title: "Sweep Rejected",
        description: "The sweep has been rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject sweep",
        variant: "destructive",
      });
    },
  });

  // Broadcast sweep mutation
  const broadcastSweepMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.sweeps.broadcastSweep(id);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.stats() });
      toast({
        title: "Sweep Broadcast",
        description: data.txId ? `Transaction broadcast: ${data.txId.slice(0, 16)}...` : "Transaction broadcast initiated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Broadcast Failed",
        description: error.message || "Failed to broadcast sweep",
        variant: "destructive",
      });
    },
  });

  // Refresh sweep balance mutation
  const refreshSweepMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.sweeps.refreshSweep(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sweeps.list() });
      toast({
        title: "Balance Refreshed",
        description: "Sweep balance has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh balance",
        variant: "destructive",
      });
    },
  });

  // Start background worker mutation
  const startBgWorkerMutation = useMutation({
    mutationFn: async () => {
      return api.balanceQueue.startBackgroundQueue();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.balanceQueue.background() });
      toast({
        title: "Worker Started",
        description: "Background balance checking is now active",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start worker",
        variant: "destructive",
      });
    },
  });

  // Stop background worker mutation
  const stopBgWorkerMutation = useMutation({
    mutationFn: async () => {
      return api.balanceQueue.stopBackgroundQueue();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.balanceQueue.background() });
      toast({
        title: "Worker Stopped",
        description: "Background balance checking paused",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop worker",
        variant: "destructive",
      });
    },
  });

  // Add target address mutation
  const addTargetMutation = useMutation({
    mutationFn: async (data: { address: string; label?: string }) => {
      return api.targetAddresses.createTargetAddress(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.targetAddresses.list() });
      setNewTargetAddress("");
      setNewTargetLabel("");
      toast({
        title: "Address added",
        description: "Target address added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add address",
        variant: "destructive",
      });
    },
  });

  // Remove target address mutation
  const removeTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.targetAddresses.deleteTargetAddress(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.targetAddresses.list() });
      toast({
        title: "Address removed",
        description: "Target address removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove address",
        variant: "destructive",
      });
    },
  });

  // Get selected priority details
  const selectedPriority = prioritiesData?.priorities.find(p => p.address === selectedAddress);
  const selectedWorkflows = (workflowsData?.workflows || []).filter(w => w.address === selectedAddress);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" data-testid="text-page-title">
            <Database className="w-10 h-10 text-primary" />
            Observer Archaeology System
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-page-description">
            Bitcoin Lost Coin Recovery via Quantum Information Geometry
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-stat-dormant-addresses">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dormant Addresses</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-stat-dormant-count">
                {addressesLoading ? "..." : addressesData?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">2009-2011 era</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-high-priority">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Target className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-stat-high-priority-count">
                {prioritiesLoading ? "..." : (prioritiesData?.priorities || []).filter(p => p.tier === 'high').length}
              </div>
              <p className="text-xs text-muted-foreground">κ &lt; 10</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-active-workflows">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-stat-active-workflows-count">
                {workflowsLoading ? "..." : (workflowsData?.workflows || []).filter(w => w.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed-recoveries">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Sparkles className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-stat-completed-count">
                {workflowsLoading ? "..." : (workflowsData?.workflows || []).filter(w => w.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">Recoveries</p>
            </CardContent>
          </Card>
        </div>

        {/* War Status Panel */}
        <div className="mb-8">
          <WarStatusPanel />
        </div>

        {/* Balance Queue Status */}
        <Card className="mb-8" data-testid="card-balance-queue-status">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Balance Check Queue
                </CardTitle>
                <CardDescription>
                  All generated addresses are queued for balance verification
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-600/5">
                  Always On
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Background Worker Status */}
            <div className="mb-4 p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {bgWorkerData?.initializing ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      <span className="text-sm font-medium text-blue-600" data-testid="text-worker-status">
                        Initializing...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-green-600" data-testid="text-worker-status">
                        Background Worker Active (Always On)
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span data-testid="text-worker-checked">
                    Checked: <strong className="text-foreground">{bgWorkerLoading || bgWorkerData?.initializing ? "..." : bgWorkerData?.checked || 0}</strong>
                  </span>
                  <span data-testid="text-worker-hits">
                    Hits: <strong className="text-green-600">{bgWorkerLoading || bgWorkerData?.initializing ? "..." : bgWorkerData?.hits || 0}</strong>
                  </span>
                  <span data-testid="text-worker-rate">
                    Rate: <strong className="text-foreground">{bgWorkerLoading || bgWorkerData?.initializing ? "..." : (bgWorkerData?.rate?.toFixed(2) || "0.00")}/sec</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Queue Stats Grid */}
            {balanceQueueData?.initializing && (
              <div className="mb-3 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="text-sm text-blue-600 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading queue data...
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-orange-500" data-testid="text-queue-pending">
                  {balanceQueueLoading || balanceQueueData?.initializing ? "..." : balanceQueueData?.pending || 0}
                </div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-500" data-testid="text-queue-checking">
                  {balanceQueueLoading || balanceQueueData?.initializing ? "..." : balanceQueueData?.checking || 0}
                </div>
                <p className="text-xs text-muted-foreground">Checking</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-green-500" data-testid="text-queue-resolved">
                  {balanceQueueLoading || balanceQueueData?.initializing ? "..." : balanceQueueData?.resolved || 0}
                </div>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-destructive" data-testid="text-queue-failed">
                  {balanceQueueLoading || balanceQueueData?.initializing ? "..." : balanceQueueData?.failed || 0}
                </div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold" data-testid="text-queue-total">
                  {balanceQueueLoading || balanceQueueData?.initializing ? "..." : balanceQueueData?.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
            {balanceQueueData?.isProcessing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing queue at {balanceQueueData?.addressesPerSecond?.toFixed(2) || 0} addr/sec
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dormant Address Cross-Reference */}
        <Card className="mb-8" data-testid="card-dormant-crossref">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Dormant Address Cross-Reference
            </CardTitle>
            <CardDescription>
              Checking generated addresses against top 1000 known dormant wallets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-amber-500" data-testid="text-dormant-loaded">
                  {dormantCrossRefLoading ? "..." : dormantCrossRefData?.totalDormant || 0}
                </div>
                <p className="text-xs text-muted-foreground">Known Dormant</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-green-500" data-testid="text-dormant-matches">
                  {dormantCrossRefLoading ? "..." : dormantCrossRefData?.matchesFound || 0}
                </div>
                <p className="text-xs text-muted-foreground">Matches Found</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold" data-testid="text-dormant-btc">
                  {dormantCrossRefLoading ? "..." : (dormantCrossRefData?.totalValue?.btc?.toLocaleString() || 0)} BTC
                </div>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary" data-testid="text-dormant-usd">
                  ${dormantCrossRefLoading ? "..." : ((dormantCrossRefData?.totalValue?.usd || 0) / 1e9).toFixed(1)}B
                </div>
                <p className="text-xs text-muted-foreground">USD Value</p>
              </div>
            </div>
            {dormantCrossRefData?.matchesFound && dormantCrossRefData.matchesFound > 0 && (
              <div className="mt-3 p-3 rounded-lg border border-green-500/50 bg-green-500/10 space-y-2">
                <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {dormantCrossRefData.matchesFound} address(es) match known dormant wallets!
                </p>
                {dormantCrossRefData.topMatches && dormantCrossRefData.topMatches.length > 0 && (
                  <div className="space-y-1">
                    {dormantCrossRefData.topMatches.map((match: { address: string; rank: number; walletLabel?: string; balanceBTC?: string; classification?: string }) => (
                      <div key={match.address} className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="font-mono text-green-700 dark:text-green-400">{match.address}</span>
                        {match.classification === 'Dormant Wallet' && match.rank > 0 ? (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                            Dormant Rank #{match.rank}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-600">
                            Your Target
                          </Badge>
                        )}
                        {match.walletLabel && (
                          <span className="text-muted-foreground">{match.walletLabel}</span>
                        )}
                        {match.balanceBTC && (
                          <span className="text-green-600 font-medium">{match.balanceBTC}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {dormantCrossRefData?.loaded && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cross-referencing all generated addresses against known high-value dormant wallets from 2009-2014 era
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="catalog" className="space-y-4">
          <div className="sticky top-0 z-50 bg-background py-2 border-b">
            <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-main-navigation">
              <TabsTrigger value="catalog" data-testid="tab-catalog">
                <Database className="w-4 h-4 mr-2" />
                Address Catalog
              </TabsTrigger>
              <TabsTrigger value="rankings" data-testid="tab-rankings">
                <TrendingDown className="w-4 h-4 mr-2" />
                κ_recovery Rankings
              </TabsTrigger>
              <TabsTrigger value="workflows" data-testid="tab-workflows">
                <Activity className="w-4 h-4 mr-2" />
                Recovery Workflows
              </TabsTrigger>
              <TabsTrigger value="geometry" data-testid="tab-geometry">
                <LineChart className="w-4 h-4 mr-2" />
                Geometric Visualization
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                <Terminal className="w-4 h-4 mr-2" />
                Live Activity
              </TabsTrigger>
              <TabsTrigger value="sweeps" data-testid="tab-sweeps">
                <Wallet className="w-4 h-4 mr-2" />
                Sweep Manager
                {(sweepStatsData?.stats?.pending || 0) > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-orange-500/10 text-orange-600 border-orange-500/30">
                    {sweepStatsData?.stats?.pending}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="discoveries" data-testid="tab-discoveries">
                <Key className="w-4 h-4 mr-2" />
                Discoveries
                {dormantCrossRefData?.matchesFound && dormantCrossRefData.matchesFound > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-green-500/10 text-green-600 border-green-500/30">
                    {dormantCrossRefData.matchesFound}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="near-misses" data-testid="tab-near-misses">
                <Target className="w-4 h-4 mr-2" />
                Near-Misses
                {nearMissData?.stats?.hot && nearMissData.stats.hot > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-600 border-red-500/30">
                    {nearMissData.stats.hot} HOT
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Address Catalog Tab */}
          <TabsContent value="catalog" className="space-y-4">
            {/* Target Address Management */}
            <Card data-testid="card-target-addresses">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Target Addresses
                </CardTitle>
                <CardDescription>
                  Bitcoin addresses to recover - all searches will check against these targets simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Address Form */}
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <Label className="text-sm font-medium">Add New Target Address</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Bitcoin address (e.g., 1A1zP1eP...)"
                        value={newTargetAddress}
                        onChange={(e) => setNewTargetAddress(e.target.value)}
                        data-testid="input-new-target-address"
                      />
                    </div>
                    <div className="w-48">
                      <Input
                        placeholder="Label (optional)"
                        value={newTargetLabel}
                        onChange={(e) => setNewTargetLabel(e.target.value)}
                        data-testid="input-new-target-label"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const address = newTargetAddress.trim();
                        
                        if (!address) {
                          toast({
                            title: "Error",
                            description: "Please enter a Bitcoin address",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        // Basic Bitcoin address format validation
                        // P2PKH (1...): 25-34 chars, P2SH (3...): 34 chars, Bech32 (bc1...): 42-62 chars
                        if (!/^[13][a-km-zA-HJ-NP-Z1-9]{24,33}$|^bc1[a-z0-9]{39,59}$/.test(address)) {
                          toast({
                            title: "Invalid Address",
                            description: "Please enter a valid Bitcoin address format",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        // Check for duplicates
                        if (targetAddresses?.some(t => t.address === address)) {
                          toast({
                            title: "Duplicate Address",
                            description: "This address is already in your target list",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        addTargetMutation.mutate({
                          address,
                          label: newTargetLabel.trim() || undefined,
                        });
                      }}
                      disabled={addTargetMutation.isPending || !newTargetAddress.trim()}
                      data-testid="button-add-target-address"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid="text-help-multiple-addresses">
                    💡 Tip: All constrained searches will check passphrases against all target addresses
                  </p>
                </div>

                {/* Target Address List */}
                {targetAddressesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading target addresses...</div>
                ) : (
                  <div className="space-y-2">
                    {(targetAddresses || []).map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        data-testid={`target-address-item-${target.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium truncate" data-testid={`text-target-address-${target.id}`}>
                              {target.address}
                            </span>
                            {target.label && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-target-label-${target.id}`}>
                                {target.label}
                              </Badge>
                            )}
                            {targetAddresses && targetAddresses[0]?.id === target.id && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary" data-testid={`badge-target-primary-${target.id}`}>
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1" data-testid={`text-target-date-${target.id}`}>
                            Added {new Date(target.addedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {targetAddresses && targetAddresses[0]?.id !== target.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Remove ${target.address}?`)) {
                                removeTargetMutation.mutate(target.id);
                              }
                            }}
                            disabled={removeTargetMutation.isPending}
                            data-testid={`button-remove-target-${target.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dormant Address Catalog */}
            <Card data-testid="card-address-catalog">
              <CardHeader>
                <CardTitle>Dormant Address Catalog</CardTitle>
                <CardDescription>
                  {addressesData?.total || 0} dormant addresses from 2009-2011 era blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <Input
                    placeholder="Search by address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-address-search"
                    className="max-w-md"
                  />
                </div>

                {/* Address List */}
                {addressesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading addresses...</div>
                ) : (
                  <div className="space-y-2">
                    {addressesData?.addresses
                      .filter(addr => 
                        searchQuery === "" || 
                        addr.address.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 50)
                      .map((addr) => (
                        <div
                          key={addr.address}
                          className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => setSelectedAddress(addr.address)}
                          data-testid={`address-item-${addr.address}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm font-medium truncate" data-testid={`text-address-${addr.address}`}>
                              {addr.address}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>First: {new Date(addr.firstSeenAt).toLocaleDateString()}</span>
                              <span>Last: {new Date(addr.lastSeenAt).toLocaleDateString()}</span>
                              <span>{addr.dormancyYears?.toFixed(1) || 'N/A'} years dormant</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold">{addr.balance?.toLocaleString() ?? '0'} BTC</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* κ_recovery Rankings Tab */}
          <TabsContent value="rankings" className="space-y-4">
            <Card data-testid="card-kappa-rankings">
              <CardHeader>
                <CardTitle>κ_recovery Priority Rankings</CardTitle>
                <CardDescription>
                  Addresses ranked by recovery difficulty (Φ_constraints / H_creation)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tier Filter */}
                <div className="mb-4 flex gap-2">
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-48" data-testid="select-tier-filter">
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="challenging">Challenging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority List */}
                {prioritiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading priorities...</div>
                ) : !prioritiesData?.priorities || prioritiesData.priorities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-priorities">
                    <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No κ_recovery rankings computed yet</p>
                    <p className="text-sm mt-2">
                      Rankings are computed from dormant address analysis.
                      Start an Ocean investigation on the Investigation page to begin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prioritiesData?.priorities.slice(0, 50).map((priority) => {
                      const isSearching = activeSearchAddresses.has(priority.address);
                      const searchSession = allSearchSessions.find(
                        s => s.targetAddress === priority.address
                      );
                      
                      return (
                        <div
                          key={priority.address}
                          className={`p-4 rounded-lg border ${isSearching ? 'border-primary/50 bg-primary/5' : ''}`}
                          data-testid={`priority-item-${priority.address}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span 
                                  className="font-mono text-sm font-medium cursor-pointer hover:text-primary"
                                  onClick={() => setSelectedAddress(priority.address)}
                                >
                                  {priority.address}
                                </span>
                                <TierBadge tier={priority.tier} />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                κ_recovery = {priority.kappaRecovery.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right mr-2">
                                <div className="text-2xl font-bold font-mono">
                                  {priority.kappaRecovery.toFixed(1)}
                                </div>
                              </div>
                              {priority.recommendedVector === 'constrained_search' ? (
                                isSearching ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      stopQIGSearchMutation.mutate(priority.address);
                                    }}
                                    disabled={stopQIGSearchMutation.isPending || startQIGSearchMutation.isPending}
                                    className="border-primary text-primary"
                                    data-testid={`button-stop-qig-${priority.address.slice(0, 8)}`}
                                  >
                                    {stopQIGSearchMutation.isPending ? (
                                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Pause className="w-3 h-3 mr-1" />
                                    )}
                                    {stopQIGSearchMutation.isPending ? "Stopping..." : "Stop"}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startQIGSearchMutation.mutate({
                                        address: priority.address,
                                        kappaRecovery: priority.kappaRecovery,
                                        tier: priority.tier
                                      });
                                    }}
                                    disabled={startQIGSearchMutation.isPending || stopQIGSearchMutation.isPending}
                                    data-testid={`button-start-qig-${priority.address.slice(0, 8)}`}
                                  >
                                    {startQIGSearchMutation.isPending ? (
                                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Play className="w-3 h-3 mr-1" />
                                    )}
                                    {startQIGSearchMutation.isPending ? "Starting..." : "QIG Search"}
                                  </Button>
                                )
                              ) : (
                                <VectorBadge vector={priority.recommendedVector} />
                              )}
                            </div>
                          </div>
                          
                          {/* Show search progress when active */}
                          {isSearching && searchSession && (
                            <div className="mt-3 pt-3 border-t">
                              {searchSession.status === 'error' ? (
                                <div className="p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Search error: {searchSession.errorMessage || 'Unknown error'}</span>
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="p-2 rounded bg-muted/50">
                                      <div className="text-lg font-bold font-mono text-primary">
                                        {searchSession.phrasesTestedSinceStart.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Tested</div>
                                    </div>
                                    <div className="p-2 rounded bg-muted/50">
                                      <div className="text-lg font-bold font-mono text-green-500">
                                        {searchSession.highPhiCount}
                                      </div>
                                      <div className="text-xs text-muted-foreground">High-Φ</div>
                                    </div>
                                    <div className="p-2 rounded bg-muted/50">
                                      <div className="text-lg font-bold font-mono">
                                        {searchSession.lastPhiScore.toFixed(3)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Last Φ</div>
                                    </div>
                                    <div className="p-2 rounded bg-muted/50">
                                      <div className="text-lg font-bold font-mono text-amber-500">
                                        {searchSession.discoveryCount}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Discoveries</div>
                                    </div>
                                  </div>
                                  {searchSession.lastPhrasesTested.length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <span className="font-medium">Recent: </span>
                                      {searchSession.lastPhrasesTested.slice(0, 3).map((p, i) => (
                                        <span key={i} className="font-mono mr-2">"{p.slice(0, 15)}..."</span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recovery Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            {/* Recovery Vector Explanations */}
            <Card data-testid="card-vector-explanations" className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Understanding Recovery Vectors</CardTitle>
                <CardDescription>
                  The system uses four distinct approaches to recover lost Bitcoin
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-chart-1" />
                    <span className="font-semibold text-sm">Estate Contact</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reaches out to estates of deceased Bitcoin holders. Includes legal documentation and cooperation to execute recovery.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Estate contact found, outreach attempts, legal documents, verification
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Constrained Search (QIG)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Algorithmic passphrase search using Quantum Information Geometry. Tests BIP-39 and arbitrary brain wallet phrases against your target addresses.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Phrases tested, high-Φ candidates, search rate, κ/Φ/H metrics
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-chart-2" />
                    <span className="font-semibold text-sm">Social Outreach</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Community engagement on BitcoinTalk forums, GitHub, and email. Posts recovery requests and monitors responses.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Platforms identified, posts created, messages sent, responses received
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-chart-3" />
                    <span className="font-semibold text-sm">Temporal Archive</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analyzes historical archives (mailing lists, forums) to identify patterns and narrow down the time period of wallet creation.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Archives identified, time period narrowed, artifacts analyzed, patterns found
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Workflows */}
            <Card data-testid="card-workflows">
              <CardHeader>
                <CardTitle>Active Recovery Workflows</CardTitle>
                <CardDescription>
                  Real-time status of ongoing recovery operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Vector Filter */}
                <div className="mb-4 flex gap-2">
                  <Select value={vectorFilter} onValueChange={setVectorFilter}>
                    <SelectTrigger className="w-48" data-testid="select-vector-filter">
                      <SelectValue placeholder="Filter by vector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vectors</SelectItem>
                      <SelectItem value="estate">Estate Contact</SelectItem>
                      <SelectItem value="constrained_search">Constrained Search</SelectItem>
                      <SelectItem value="social">Social Outreach</SelectItem>
                      <SelectItem value="temporal">Temporal Archive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Workflow List */}
                {workflowsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
                ) : !workflowsData?.workflows || workflowsData.workflows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-workflows">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No recovery workflows active</p>
                    <p className="text-sm mt-2">
                      Workflows are created when Ocean investigates target addresses.
                      Visit the Investigation page to start autonomous recovery.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflowsData.workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="p-4 rounded-lg border"
                        data-testid={`workflow-item-${workflow.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {workflow.address}
                            </span>
                            <VectorBadge vector={workflow.vector} />
                            <StatusBadge status={workflow.status} />
                          </div>
                        </div>
                        
                        {/* Vector-Specific Progress Details */}
                        {workflow.status === 'active' ? (
                          <>
                            {workflow.vector === 'constrained_search' && <ConstrainedSearchProgress workflowId={workflow.id} />}
                            {workflow.vector === 'estate' && <EstateProgress workflow={workflow} />}
                            {workflow.vector === 'social' && <SocialProgress workflow={workflow} />}
                            {workflow.vector === 'temporal' && <TemporalProgress workflow={workflow} />}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{workflow.progressPercentage}%</span>
                            </div>
                            <Progress value={workflow.progressPercentage} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              Started: {workflow.startedAt ? new Date(workflow.startedAt).toLocaleString() : 'Not yet started'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geometric Visualization Tab */}
          <TabsContent value="geometry" className="space-y-4">
            <Card data-testid="card-geometric-visualization">
              <CardHeader>
                <CardTitle>Quantum Information Geometry Manifold</CardTitle>
                <CardDescription>
                  Φ_constraints vs H_creation scatter plot - lower κ_recovery (Φ/H) indicates easier recovery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prioritiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading geometric data...</div>
                ) : !prioritiesData || prioritiesData.priorities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-geometry">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No geometric data yet</p>
                    <p className="text-sm mt-2">
                      Run κ_recovery computation to visualize the QIG manifold.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Scatter Plot */}
                    <div className="w-full h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            type="number" 
                            dataKey="phi" 
                            name="Φ_constraints"
                            label={{ value: 'Φ_constraints (Integrated Information)', position: 'insideBottom', offset: -10 }}
                            domain={[0, 'auto']}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="h" 
                            name="H_creation"
                            label={{ value: 'H_creation (Creation Entropy)', angle: -90, position: 'insideLeft' }}
                            domain={[0, 'auto']}
                          />
                          <ZAxis type="number" dataKey="kappa" name="κ_recovery" range={[50, 400]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-card border rounded-lg p-3 shadow-lg">
                                    <p className="font-mono text-xs mb-2">{data.address}</p>
                                    <div className="space-y-1 text-xs">
                                      <p>Φ_constraints: <span className="font-mono">{data.phi.toFixed(2)}</span></p>
                                      <p>H_creation: <span className="font-mono">{data.h.toFixed(2)}</span></p>
                                      <p>κ_recovery: <span className="font-mono font-bold">{data.kappa.toFixed(2)}</span></p>
                                      <p className="mt-2">
                                        <TierBadge tier={data.tier} />
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter 
                            name="Addresses" 
                            data={(prioritiesData?.priorities || []).map(p => ({
                              address: p.address,
                              phi: (p.constraints as any)?.phiConstraints || 0,
                              h: (p.entropy as any)?.hCreation || 0,
                              kappa: p.kappaRecovery || 0,
                              tier: p.tier,
                              isSelected: p.address === selectedAddress,
                            }))}
                            fill="hsl(var(--primary))"
                          >
                            {(prioritiesData?.priorities || []).map((p, index) => (
                              <Cell 
                                key={`cell-${index}`}
                                fill={
                                  p.address === selectedAddress 
                                    ? "hsl(var(--destructive))" 
                                    : p.tier === 'high'
                                    ? "hsl(var(--destructive) / 0.6)"
                                    : p.tier === 'medium'
                                    ? "hsl(25 95% 53% / 0.6)"
                                    : p.tier === 'low'
                                    ? "hsl(217 91% 60% / 0.6)"
                                    : "hsl(var(--muted-foreground) / 0.3)"
                                }
                                stroke={p.address === selectedAddress ? "hsl(var(--destructive))" : undefined}
                                strokeWidth={p.address === selectedAddress ? 3 : undefined}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Recovery Tier Legend */}
                    <div className="flex flex-wrap gap-4 justify-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-destructive/60"></div>
                        <span>High Priority (κ &lt; 10)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(25 95% 53% / 0.6)" }}></div>
                        <span>Medium Priority (10 ≤ κ &lt; 50)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(217 91% 60% / 0.6)" }}></div>
                        <span>Low Priority (50 ≤ κ &lt; 100)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-muted-foreground/30"></div>
                        <span>Challenging (κ ≥ 100)</span>
                      </div>
                      {selectedAddress && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-destructive border-2 border-destructive"></div>
                          <span className="font-semibold">Selected Address</span>
                        </div>
                      )}
                    </div>

                    {/* Address Entity Type Legend */}
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground text-center mb-3">Address Entity Types (from Tavily classification)</p>
                      <div className="flex flex-wrap gap-4 justify-center text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
                            Personal
                          </Badge>
                          <span className="text-xs text-muted-foreground">Individual wallet</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                            <Building className="w-3 h-3 mr-1" />
                            Exchange
                          </Badge>
                          <span className="text-xs text-muted-foreground">Trading platform</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                            <Landmark className="w-3 h-3 mr-1" />
                            Institution
                          </Badge>
                          <span className="text-xs text-muted-foreground">Corporate/Government</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Note: Nothing is truly "unrecoverable" - exchanges/institutions require different recovery approaches
                      </p>
                    </div>

                    {/* Geometric Interpretation */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">Lower Left Quadrant</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            Low Φ, Low H - Minimal constraints and entropy. Requires entity research or sibling analysis.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">Upper Left Quadrant</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            Low Φ, High H - High entropy but few constraints. Difficult recovery requiring broad search.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-destructive">Upper Right Quadrant</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            High Φ, High H - <span className="font-semibold">Optimal recovery zone</span>. Rich constraints reduce effective entropy via geometric intersection.
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Click instruction */}
                    <p className="text-center text-sm text-muted-foreground">
                      Click an address in the Rankings tab to highlight it on the manifold
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card data-testid="card-live-activity">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Live Activity Stream
                  </CardTitle>
                  <CardDescription>
                    Real-time view of passphrase testing, QIG scoring, and recovery progress
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={activityData?.activeJobs ? "default" : "secondary"} data-testid="badge-active-jobs">
                      {activityData?.activeJobs || 0} Active Jobs
                    </Badge>
                    <Badge variant="outline" data-testid="badge-total-jobs">
                      {activityData?.totalJobs || 0} Total
                    </Badge>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => refetchActivity()}
                    data-testid="button-refresh-activity"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading activity stream...</div>
                ) : !activityData?.logs || activityData.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-activity">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No activity yet</p>
                    <p className="text-sm mt-2">
                      Start an Ocean investigation on the Investigation page to see live
                      passphrase testing, QIG scoring, and consciousness state updates.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-xs bg-black/90 text-green-400 p-4 rounded-lg max-h-[600px] overflow-y-auto" data-testid="container-activity-log">
                    {activityData.logs.map((log, index) => (
                      <div 
                        key={`${log.timestamp}-${index}`}
                        className={`flex gap-2 py-0.5 border-b border-green-900/30 last:border-b-0 ${
                          log.type === 'success' ? 'text-yellow-400 font-bold' : 
                          log.type === 'error' ? 'text-red-400' : 
                          'text-green-400'
                        }`}
                        data-testid={`log-entry-${index}`}
                      >
                        <span className="text-gray-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-cyan-400 shrink-0">
                          [{log.jobStrategy}]
                        </span>
                        <span className="break-all">
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Info (batch progress, mode switches)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Success (matches found, targets reached)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Error (job failures)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sweep Manager Tab */}
          <TabsContent value="sweeps" className="space-y-4">
            {/* Destination Address Banner */}
            <Card className="border-primary/50 bg-primary/5" data-testid="card-destination-address">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Hardcoded Destination Address</p>
                      <p className="text-xs text-muted-foreground">All swept funds go here (immutable)</p>
                    </div>
                  </div>
                  <div className="font-mono text-sm bg-background px-3 py-1.5 rounded border" data-testid="text-destination-address">
                    {HARDCODED_DESTINATION}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sweep Stats Overview */}
            <Card data-testid="card-sweep-stats">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Sweep Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-500" data-testid="text-sweep-pending">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.pending || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-500" data-testid="text-sweep-approved">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.approved || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-2xl font-bold text-green-500" data-testid="text-sweep-completed">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.completed || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-2xl font-bold text-red-500" data-testid="text-sweep-failed">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.failed || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-sweep-rejected">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.rejected || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Pending BTC Value</p>
                    <p className="text-lg font-bold font-mono" data-testid="text-sweep-pending-btc">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.totalPendingBtc || "0.00000000"} BTC
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Total Swept</p>
                    <p className="text-lg font-bold font-mono text-green-600" data-testid="text-sweep-total-btc">
                      {sweepStatsLoading ? "..." : sweepStatsData?.stats?.totalSweptBtc || "0.00000000"} BTC
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Sweeps List */}
            <Card data-testid="card-sweep-list">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Sweep Approval Queue
                    </CardTitle>
                    <CardDescription>
                      Review and approve sweeps before broadcasting transactions
                    </CardDescription>
                  </div>
                  <Select value={sweepStatusFilter} onValueChange={setSweepStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-sweep-status-filter">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {sweepsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading sweeps...</div>
                ) : sweepsError ? (
                  <div className="text-center py-8 text-destructive">
                    Failed to load sweeps. Please try again.
                  </div>
                ) : !sweepsData?.sweeps || sweepsData.sweeps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-sweeps">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No sweeps found</p>
                    <p className="text-sm mt-2">
                      Sweeps are created automatically when addresses with balance are discovered
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sweepsData.sweeps.map((sweep) => (
                      <SweepItem
                        key={sweep.id}
                        sweep={sweep}
                        onApprove={() => approveSweepMutation.mutate(sweep.id)}
                        onReject={(reason) => rejectSweepMutation.mutate({ id: sweep.id, reason })}
                        onBroadcast={() => broadcastSweepMutation.mutate(sweep.id)}
                        onRefresh={() => refreshSweepMutation.mutate(sweep.id)}
                        onViewAudit={() => setSelectedSweepId(selectedSweepId === sweep.id ? null : sweep.id)}
                        isApproving={approveSweepMutation.isPending}
                        isRejecting={rejectSweepMutation.isPending}
                        isBroadcasting={broadcastSweepMutation.isPending}
                        isRefreshing={refreshSweepMutation.isPending}
                        showAudit={selectedSweepId === sweep.id}
                        auditLog={selectedSweepId === sweep.id ? auditData?.auditLog : undefined}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discoveries Tab - Shows discovered balance hits with keys */}
          <TabsContent value="discoveries" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card data-testid="card-discovery-total">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold" data-testid="text-discoveries-total">
                      {discoveriesLoading ? "..." : discoveriesData?.summary?.totalHits || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Discoveries</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-discovery-balance">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600" data-testid="text-discoveries-balance">
                      {discoveriesLoading ? "..." : discoveriesData?.summary?.withBalance || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">With Balance</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-discovery-dormant">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary" data-testid="text-discoveries-dormant">
                      {discoveriesLoading ? "..." : discoveriesData?.summary?.dormantMatchCount || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Dormant Matches</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dormant Wallet Matches Section */}
            {discoveriesData?.dormantMatches && discoveriesData.dormantMatches.length > 0 && (
              <Card className="border-green-500/50 bg-green-500/5" data-testid="card-dormant-matches">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Sparkles className="w-5 h-5" />
                    Dormant Wallet Matches
                  </CardTitle>
                  <CardDescription>
                    These addresses matched against the top 1000 known dormant wallets from 2009-2014 era
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {discoveriesData.dormantMatches.map((match, idx) => (
                      <div 
                        key={match.address}
                        className="flex items-center justify-between p-3 rounded-lg border border-green-500/30 bg-card"
                        data-testid={`dormant-match-${idx}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate" data-testid={`text-dormant-address-${idx}`}>
                            {match.address}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Rank #{match.rank} • Matched {new Date(match.matchedAt).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          Rank #{match.rank}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Discovered Hits */}
            <Card data-testid="card-discoveries-list">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Discovered Addresses & Keys
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchDiscoveries()}
                    data-testid="button-refresh-discoveries"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  All addresses discovered from passphrase searches. Full plaintext keys shown per operator preference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discoveriesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading discoveries...</div>
                ) : !discoveriesData?.hits || discoveriesData.hits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-discoveries">
                    <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No discoveries yet</p>
                    <p className="text-sm mt-2">
                      Addresses will appear here when found during passphrase searches
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discoveriesData.hits.map((hit, idx) => (
                      <div 
                        key={hit.address}
                        className={`p-4 rounded-lg border ${hit.isDormantMatch ? 'border-green-500/50 bg-green-500/5' : ''}`}
                        data-testid={`discovery-item-${idx}`}
                      >
                        {/* Header row with address and badges */}
                        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium" data-testid={`text-discovery-address-${idx}`}>
                              {hit.address}
                            </span>
                            {hit.isDormantMatch && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Dormant #{hit.dormantInfo?.rank}{hit.dormantInfo?.label ? ` (${hit.dormantInfo.label})` : ''}
                              </Badge>
                            )}
                            {/* Address Type Badge - Exchange/Institution/Personal */}
                            {hit.entityType && hit.entityType !== 'unknown' && (
                              <Badge 
                                variant="outline" 
                                className={
                                  hit.entityType === 'exchange' 
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                    : hit.entityType === 'institution'
                                    ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                    : "bg-gray-500/10 text-gray-600 border-gray-500/30"
                                }
                                data-testid={`badge-entity-type-${idx}`}
                              >
                                {hit.entityType === 'exchange' && <Building className="w-3 h-3 mr-1" />}
                                {hit.entityType === 'institution' && <Landmark className="w-3 h-3 mr-1" />}
                                {hit.entityName || hit.entityType.charAt(0).toUpperCase() + hit.entityType.slice(1)}
                                {hit.entityConfidence === 'pending' && (
                                  <span className="ml-1 text-xs opacity-70">(pending)</span>
                                )}
                              </Badge>
                            )}
                            {hit.entityType === 'unknown' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={async () => {
                                  try {
                                    const data = await api.observer.classifyAddress({ address: hit.address });
                                    if (data.success) {
                                      toast({
                                        title: "Classification Complete",
                                        description: `${hit.address.slice(0, 12)}... classified as ${data.format || 'unknown'}`,
                                      });
                                      refetchDiscoveries();
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Classification Failed",
                                      description: "Could not classify address",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                data-testid={`button-classify-${idx}`}
                              >
                                <Search className="w-3 h-3 mr-1" />
                                Classify
                              </Button>
                            )}
                            <Badge variant="outline" className={hit.balanceSats > 0 ? "bg-green-500/10 text-green-600" : ""}>
                              {hit.balanceBTC} BTC
                            </Badge>
                            <Badge variant="outline">
                              {hit.isCompressed ? "Compressed" : "Uncompressed"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(hit.discoveredAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Passphrase */}
                        <div className="p-2 rounded bg-muted/30 mb-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Passphrase</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(hit.passphrase);
                                toast({
                                  title: "Copied",
                                  description: "Passphrase copied to clipboard",
                                });
                              }}
                              data-testid={`button-copy-passphrase-${idx}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="font-mono text-sm break-all" data-testid={`text-passphrase-${idx}`}>
                            {hit.passphrase}
                          </p>
                        </div>

                        {/* WIF Key - Full plaintext per operator preference */}
                        <div className="p-2 rounded bg-muted/30">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              WIF Private Key
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(hit.wif);
                                toast({
                                  title: "Copied",
                                  description: "WIF private key copied to clipboard",
                                });
                              }}
                              data-testid={`button-copy-wif-${idx}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="font-mono text-sm break-all" data-testid={`text-wif-${idx}`}>
                            {hit.wif}
                          </p>
                        </div>

                        {/* Transaction count */}
                        {hit.txCount > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Transaction History: {hit.txCount} tx(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Near-Misses Tab */}
          <TabsContent value="near-misses" className="space-y-4">
            {/* Error State */}
            {nearMissError && (
              <Card className="border-destructive/50">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">Failed to load near-miss data</p>
                  <p className="text-xs text-muted-foreground mt-1">Will retry automatically</p>
                </CardContent>
              </Card>
            )}

            {/* Near-Miss Stats Overview with Adaptive Thresholds */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card data-testid="card-near-miss-stat-total">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold" data-testid="text-near-miss-total">
                    {nearMissLoading ? "..." : nearMissData?.stats?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Near-Misses</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/30" data-testid="card-near-miss-stat-hot">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-500" data-testid="text-near-miss-hot">
                    {nearMissLoading ? "..." : nearMissData?.stats?.hot || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    HOT (Φ ≥ {nearMissData?.stats?.adaptiveThresholds?.hot?.toFixed(3) || '0.920'})
                  </p>
                </CardContent>
              </Card>
              <Card className="border-orange-500/30" data-testid="card-near-miss-stat-warm">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500" data-testid="text-near-miss-warm">
                    {nearMissLoading ? "..." : nearMissData?.stats?.warm || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    WARM (Φ ≥ {nearMissData?.stats?.adaptiveThresholds?.warm?.toFixed(3) || '0.850'})
                  </p>
                </CardContent>
              </Card>
              <Card className="border-blue-500/30" data-testid="card-near-miss-stat-cool">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500" data-testid="text-near-miss-cool">
                    {nearMissLoading ? "..." : nearMissData?.stats?.cool || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    COOL (Φ ≥ {nearMissData?.stats?.adaptiveThresholds?.cool?.toFixed(3) || '0.800'})
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-near-miss-stat-phi">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-near-miss-avg-phi">
                    {nearMissLoading ? "..." : (nearMissData?.stats?.avgPhi || 0).toFixed(3)}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Φ Score</p>
                </CardContent>
              </Card>
              <Card className="border-green-500/30" data-testid="card-near-miss-stat-escalating">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-500" data-testid="text-near-miss-escalating">
                    {nearMissLoading ? "..." : nearMissData?.stats?.escalatingCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Escalating ↑</p>
                </CardContent>
              </Card>
            </div>

            {/* Φ Distribution Visualization */}
            <Card data-testid="card-phi-distribution">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Φ Distribution with Adaptive Thresholds
                </CardTitle>
                <CardDescription>
                  Real-time threshold adaptation based on rolling Φ distribution (n={nearMissData?.stats?.adaptiveThresholds?.distributionSize || 0})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nearMissLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading distribution...</div>
                ) : (nearMissData?.entries || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-phi-distribution">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No Φ data yet</p>
                    <p className="text-sm mt-2">
                      Near-miss data will appear here as Ocean explores the manifold.
                    </p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={(() => {
                          const entries = nearMissData?.entries || [];
                          const bins: { phi: number; count: number; tier: string }[] = [];
                          for (let i = 0; i <= 10; i++) {
                            const phiMin = 0.7 + i * 0.03;
                            const phiMax = phiMin + 0.03;
                            const count = entries.filter(e => e.phi >= phiMin && e.phi < phiMax).length;
                            const thresholds = nearMissData?.stats?.adaptiveThresholds;
                            let tier = 'cool';
                            if (thresholds) {
                              if (phiMin >= thresholds.hot) tier = 'hot';
                              else if (phiMin >= thresholds.warm) tier = 'warm';
                            }
                            bins.push({ phi: phiMin, count, tier });
                          }
                          return bins;
                        })()}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="phi" 
                          tickFormatter={(v) => v.toFixed(2)}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border rounded p-2 text-xs">
                                  <p>Φ: {data.phi.toFixed(3)}</p>
                                  <p>Count: {data.count}</p>
                                  <p>Tier: {data.tier.toUpperCase()}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                        {nearMissData?.stats?.adaptiveThresholds && (
                          <>
                            <ReferenceLine 
                              x={nearMissData.stats.adaptiveThresholds.hot} 
                              stroke="#ef4444" 
                              strokeDasharray="5 5"
                              label={{ value: 'HOT', position: 'top', fontSize: 10, fill: '#ef4444' }}
                            />
                            <ReferenceLine 
                              x={nearMissData.stats.adaptiveThresholds.warm} 
                              stroke="#f97316" 
                              strokeDasharray="5 5"
                              label={{ value: 'WARM', position: 'top', fontSize: 10, fill: '#f97316' }}
                            />
                            <ReferenceLine 
                              x={nearMissData.stats.adaptiveThresholds.cool} 
                              stroke="#3b82f6" 
                              strokeDasharray="5 5"
                              label={{ value: 'COOL', position: 'top', fontSize: 10, fill: '#3b82f6' }}
                            />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Φ Progression Stats */}
            <Card data-testid="card-near-miss-progression">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-primary" />
                  Φ Progression & Statistics
                </CardTitle>
                <CardDescription>
                  Near-miss quality metrics and discovery rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold text-green-500" data-testid="text-near-miss-max-phi">
                      {nearMissLoading ? "..." : (nearMissData?.stats?.maxPhi || 0).toFixed(3)}
                    </div>
                    <p className="text-xs text-muted-foreground">Max Φ Achieved</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold" data-testid="text-near-miss-clusters">
                      {nearMissLoading ? "..." : nearMissData?.stats?.clusters || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Pattern Clusters</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold text-amber-500" data-testid="text-near-miss-recent">
                      {nearMissLoading ? "..." : nearMissData?.stats?.recentDiscoveries || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Recent (1hr)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold text-muted-foreground" data-testid="text-near-miss-stale">
                      {nearMissLoading ? "..." : nearMissData?.stats?.staleCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Stale (&gt;24hr)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pattern Clusters */}
            <Card data-testid="card-near-miss-clusters">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  Pattern Clusters
                </CardTitle>
                <CardDescription>
                  Grouped near-misses by structural and semantic similarity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nearMissLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading clusters...</div>
                ) : (nearMissData?.clusters || []).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No clusters discovered yet</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(nearMissData?.clusters || []).map((cluster) => (
                      <div
                        key={cluster.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedClusterId === cluster.id 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-card hover-elevate'
                        }`}
                        onClick={() => setSelectedClusterId(
                          selectedClusterId === cluster.id ? null : cluster.id
                        )}
                        data-testid={`cluster-${cluster.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {cluster.memberCount} members
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            Φ: {cluster.avgPhi.toFixed(3)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Pattern: {cluster.structuralPattern}
                        </div>
                        {cluster.commonWords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {cluster.commonWords.map((word, i) => (
                              <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                                {word}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-primary mt-2 text-center">
                          Click to view phrases
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cluster Members Detail View */}
            {selectedClusterId && (
              <Card data-testid="card-cluster-members">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5 text-purple-500" />
                        Cluster Members
                      </CardTitle>
                      <CardDescription>
                        {clusterMembersData?.cluster?.structuralPattern || 'Loading...'} - 
                        {' '}{clusterMembersData?.members?.length || 0} phrases
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedClusterId(null)}
                      data-testid="button-close-cluster-members"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {clusterMembersLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading phrases...</div>
                  ) : !clusterMembersData?.members?.length ? (
                    <div className="text-center py-4 text-muted-foreground">No members found</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {clusterMembersData.members.map((member, index) => (
                        <div
                          key={member.id || index}
                          className="p-3 rounded-lg border bg-muted/30 font-mono text-sm"
                          data-testid={`cluster-member-${index}`}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex-1 min-w-0 break-all">
                              {member.phrase}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge 
                                variant="outline" 
                                className={
                                  member.tier === 'hot' 
                                    ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                                    : member.tier === 'warm' 
                                      ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                      : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                }
                              >
                                {member.tier?.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Φ: {member.phi?.toFixed(3)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                            <span>κ: {member.kappa?.toFixed(1)}</span>
                            <span>{member.regime}</span>
                            <span>Explored: {member.explorationCount || 0}x</span>
                            {member.isEscalating && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs px-1">
                                Escalating
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cluster Aging Analytics */}
            <Card data-testid="card-cluster-aging-analytics">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Cluster Aging Analytics
                </CardTitle>
                <CardDescription>
                  Priority scheduling based on cluster age and exploration frequency
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clusterAnalyticsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading analytics...</div>
                ) : !clusterAnalyticsData?.analytics?.length ? (
                  <div className="text-center py-4 text-muted-foreground">No cluster analytics available</div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div className="p-2 rounded bg-muted/50 text-center">
                        <div className="text-lg font-bold">{clusterAnalyticsData.summary.totalClusters}</div>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="p-2 rounded bg-red-500/10 text-center">
                        <div className="text-lg font-bold text-red-500">{clusterAnalyticsData.summary.immediate}</div>
                        <p className="text-xs text-muted-foreground">Immediate</p>
                      </div>
                      <div className="p-2 rounded bg-orange-500/10 text-center">
                        <div className="text-lg font-bold text-orange-500">{clusterAnalyticsData.summary.priority}</div>
                        <p className="text-xs text-muted-foreground">Priority</p>
                      </div>
                      <div className="p-2 rounded bg-blue-500/10 text-center">
                        <div className="text-lg font-bold text-blue-500">{clusterAnalyticsData.summary.standard}</div>
                        <p className="text-xs text-muted-foreground">Standard</p>
                      </div>
                      <div className="p-2 rounded bg-muted/30 text-center">
                        <div className="text-lg font-bold text-muted-foreground">{clusterAnalyticsData.summary.deferred}</div>
                        <p className="text-xs text-muted-foreground">Deferred</p>
                      </div>
                    </div>

                    {/* Cluster Analytics List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clusterAnalyticsData.analytics.slice(0, 10).map((cluster) => (
                        <div
                          key={cluster.id}
                          className="p-3 rounded-lg border bg-card flex items-center gap-3"
                          data-testid={`cluster-analytics-${cluster.id}`}
                        >
                          <Badge 
                            variant="outline" 
                            className={
                              cluster.explorationCadence === 'immediate' 
                                ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                                : cluster.explorationCadence === 'priority' 
                                  ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                  : cluster.explorationCadence === 'standard'
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                    : 'bg-muted text-muted-foreground'
                            }
                          >
                            {cluster.explorationCadence.toUpperCase()}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono">Score: {cluster.priorityScore.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-xs text-muted-foreground">Φ: {cluster.avgPhi.toFixed(3)}</span>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-xs text-muted-foreground">Age: {cluster.ageHours.toFixed(1)}h</span>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-xs text-muted-foreground">Decay: {(cluster.decayRate * 100).toFixed(1)}%</span>
                            </div>
                            {cluster.commonWords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {cluster.commonWords.slice(0, 3).map((word, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cluster.memberCount} members
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Near-Miss Entries */}
            <Card data-testid="card-near-miss-entries">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Near-Miss Entries
                    </CardTitle>
                    <CardDescription>
                      High-Φ candidates prioritized for exploration
                    </CardDescription>
                  </div>
                  <Select value={nearMissTierFilter} onValueChange={setNearMissTierFilter}>
                    <SelectTrigger className="w-32" data-testid="select-near-miss-tier">
                      <SelectValue placeholder="Filter tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="hot">HOT</SelectItem>
                      <SelectItem value="warm">WARM</SelectItem>
                      <SelectItem value="cool">COOL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {nearMissLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading near-misses...</div>
                ) : (nearMissData?.entries || []).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No near-misses discovered yet</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(nearMissData?.entries || []).map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg border bg-card flex items-center gap-3"
                        data-testid={`near-miss-entry-${entry.id}`}
                      >
                        <div className="flex flex-col gap-1 items-center">
                          <Badge 
                            variant="outline" 
                            className={
                              entry.tier === 'hot' 
                                ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                                : entry.tier === 'warm' 
                                  ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                  : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            }
                            data-testid={`badge-tier-${entry.id}`}
                          >
                            {entry.tier.toUpperCase()}
                          </Badge>
                          {entry.isEscalating && (
                            <Badge 
                              variant="outline" 
                              className="bg-green-500/10 text-green-600 border-green-500/30 text-xs px-1"
                              data-testid={`badge-escalating-${entry.id}`}
                            >
                              ↑ ESC
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm truncate" data-testid={`text-phrase-${entry.id}`}>
                            {entry.phrase}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>Φ: {entry.phi.toFixed(3)}</span>
                            <span>κ: {entry.kappa.toFixed(1)}</span>
                            <span>{entry.regime}</span>
                            <span>Explored: {entry.explorationCount}x</span>
                            {entry.queuePriority !== undefined && (
                              <span className="text-primary font-medium">Priority: {entry.queuePriority}</span>
                            )}
                          </div>
                          {/* Mini Φ History Sparkline */}
                          {entry.phiHistory && entry.phiHistory.length > 1 && (
                            <div className="mt-1 h-6 w-24" data-testid={`sparkline-${entry.id}`}>
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart data={entry.phiHistory.map((phi, i) => ({ i, phi }))}>
                                  <Line 
                                    type="monotone" 
                                    dataKey="phi" 
                                    stroke={entry.isEscalating ? '#22c55e' : 'hsl(var(--primary))'} 
                                    strokeWidth={1.5}
                                    dot={false}
                                  />
                                </RechartsLineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {new Date(entry.discoveredAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Selected Address Details */}
        {selectedAddress && selectedPriority && (
          <Card className="mt-8" data-testid="card-selected-address-details">
            <CardHeader>
              <CardTitle>Address Details: {selectedAddress}</CardTitle>
              <CardDescription>Recovery priority and constraint analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Constraints */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Φ_constraints
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entity Linkage:</span>
                      <span className="font-mono">{(selectedPriority.constraints as any)?.entityLinkage ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Artifact Density:</span>
                      <span className="font-mono">{((selectedPriority.constraints as any)?.artifactDensity ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temporal Precision:</span>
                      <span className="font-mono">{((selectedPriority.constraints as any)?.temporalPrecisionHours ?? 0).toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Graph Signature:</span>
                      <span className="font-mono">{(selectedPriority.constraints as any)?.graphSignature ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Φ_constraints (Total):</span>
                      <span className="font-mono font-bold">{((selectedPriority.constraints as any)?.phiConstraints ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Entropy */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    H_creation
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Era Factor:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any)?.eraFactor ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Script Complexity:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any)?.scriptComplexity ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mining Factor:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any)?.miningFactor ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance Factor:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any)?.balanceFactor ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">H_creation (Total):</span>
                      <span className="font-mono font-bold">{((selectedPriority.entropy as any)?.hCreation ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Workflows for this Address */}
              {selectedWorkflows.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Active Recovery Workflows</h3>
                  <div className="space-y-2">
                    {selectedWorkflows.map((workflow) => (
                      <div key={workflow.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <VectorBadge vector={workflow.vector} />
                          <StatusBadge status={workflow.status} />
                        </div>
                        <div className="text-sm font-medium">{workflow.progressPercentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const config = {
    high: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/20" },
    medium: { label: "Medium", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    low: { label: "Low", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    challenging: { label: "Challenging", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  };

  const cfg = config[tier as keyof typeof config] || config.challenging;

  return (
    <Badge variant="outline" className={cfg.className} data-testid={`badge-tier-${tier}`}>
      {cfg.label}
    </Badge>
  );
}

function VectorBadge({ vector }: { vector: string }) {
  const config = {
    estate: { label: "Estate", icon: Mail, className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    constrained_search: { label: "QIG Search", icon: Search, className: "bg-primary/10 text-primary border-primary/20" },
    social: { label: "Social", icon: Users, className: "bg-green-500/10 text-green-600 border-green-500/20" },
    temporal: { label: "Temporal", icon: Clock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  };

  const cfg = config[vector as keyof typeof config] || config.constrained_search;
  const Icon = cfg.icon;

  return (
    <Badge variant="outline" className={cfg.className} data-testid={`badge-vector-${vector}`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: "Pending", className: "bg-muted text-muted-foreground border-muted" },
    active: { label: "Active", className: "bg-primary/10 text-primary border-primary/20" },
    paused: { label: "Paused", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    completed: { label: "Completed", className: "bg-green-500/10 text-green-600 border-green-500/20" },
    failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  const cfg = config[status as keyof typeof config] || config.pending;

  return (
    <Badge variant="outline" className={cfg.className} data-testid={`badge-status-${status}`}>
      {cfg.label}
    </Badge>
  );
}

function ConstrainedSearchProgress({ workflowId }: { workflowId: string }) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.observer.workflowSearchProgress(workflowId),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Loading search progress...
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">No search data available yet</div>
      </div>
    );
  }

  const progress = (progressData as any).progress || {};
  const constraints = (progressData as any).constraints || {};
  const searchJob = (progressData as any).searchJob || {};

  return (
    <div className="space-y-3" data-testid={`search-progress-${workflowId}`}>
      {/* Real-time metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-phrases-tested-${workflowId}`}>
            {(progress.phrasesTested || 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {searchJob.params?.generationMode === "master-key" 
              ? "Keys Tested" 
              : searchJob.params?.generationMode === "arbitrary"
              ? "Passphrases Tested"
              : "Phrases Tested"}
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono text-primary" data-testid={`text-high-phi-${workflowId}`}>
            {progress.highPhiCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">High-Φ Found</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-search-rate-${workflowId}`}>
            {((searchJob.stats?.rate || 0)).toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {searchJob.params?.generationMode === "master-key" 
              ? "Keys/sec" 
              : searchJob.params?.generationMode === "arbitrary"
              ? "Passphrases/sec"
              : "Phrases/sec"}
          </div>
        </div>
      </div>

      {/* QIG Constraints */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">κ_recovery:</span>
          <span className="font-mono font-semibold">{(constraints.kappaRecovery || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Φ_constraints:</span>
          <span className="font-mono">{(constraints.phiConstraints || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">H_creation:</span>
          <span className="font-mono">{(constraints.hCreation || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Search Mode:</span>
          <span className="font-mono capitalize">
            {(searchJob.progress?.searchMode || 'exploration')}
          </span>
        </div>
      </div>

      {/* Match status */}
      {progress.matchFound && (
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <span className="text-sm font-semibold text-green-600">🎉 Match Found!</span>
        </div>
      )}

      {/* Search status */}
      <div className="text-xs text-muted-foreground text-center">
        Status: <span className="font-medium capitalize">{progress.searchStatus || 'running'}</span>
        {searchJob.stats?.startTime && (
          <> • Started {new Date(searchJob.stats.startTime).toLocaleTimeString()}</>
        )}
      </div>
    </div>
  );
}

function EstateProgress({ workflow }: { workflow: RecoveryWorkflow }) {
  const progress = workflow.progress as any;
  const estate = progress?.estateProgress || {};
  
  if (!progress || !estate || Object.keys(estate).length === 0) {
    return (
      <div className="space-y-2" data-testid={`estate-progress-${workflow.id}`}>
        <div className="text-sm text-muted-foreground">Estate workflow initializing...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3" data-testid={`estate-progress-${workflow.id}`}>
      {/* Estate Contact Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-estate-outreach-${workflow.id}`}>
            {estate.outreachAttempts || 0}
          </div>
          <div className="text-xs text-muted-foreground">Outreach Attempts</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-lg font-bold" data-testid={`text-estate-response-${workflow.id}`}>
            {estate.responseReceived ? "✓" : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Response Received</div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estate Contact:</span>
          <span className="font-mono">{estate.estateContactIdentified ? "Found" : "Not Found"}</span>
        </div>
        {estate.estateContactInfo && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contact Info:</span>
            <span className="font-mono text-xs truncate max-w-[200px]">{estate.estateContactInfo}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Legal Docs Requested:</span>
          <span className="font-mono">{estate.legalDocumentsRequested ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Legal Docs Received:</span>
          <span className="font-mono">{estate.legalDocumentsReceived ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Verification:</span>
          <span className="font-mono capitalize">{estate.verificationStatus || 'pending'}</span>
        </div>
        {estate.recoveryExecuted && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <span className="text-sm font-semibold text-green-600">✓ Recovery Executed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SocialProgress({ workflow }: { workflow: RecoveryWorkflow }) {
  const progress = workflow.progress as any;
  const social = progress?.socialProgress || {};
  
  if (!progress || !social || Object.keys(social).length === 0) {
    return (
      <div className="space-y-2" data-testid={`social-progress-${workflow.id}`}>
        <div className="text-sm text-muted-foreground">Social outreach workflow initializing...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3" data-testid={`social-progress-${workflow.id}`}>
      {/* Social Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-social-posts-${workflow.id}`}>
            {social.communityPostsCreated || 0}
          </div>
          <div className="text-xs text-muted-foreground">Posts Created</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-social-messages-${workflow.id}`}>
            {social.directMessagesSet || 0}
          </div>
          <div className="text-xs text-muted-foreground">Messages Sent</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono text-primary" data-testid={`text-social-responses-${workflow.id}`}>
            {social.responsesReceived || 0}
          </div>
          <div className="text-xs text-muted-foreground">Responses</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platforms:</span>
          <span className="font-mono">{(social.platformsIdentified || []).length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Templates Created:</span>
          <span className="font-mono">{social.outreachTemplatesCreated ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Leads Generated:</span>
          <span className="font-mono">{social.leadsGenerated || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Verified Leads:</span>
          <span className="font-mono">{social.verifiedLeads || 0}</span>
        </div>
      </div>

      {/* Platform list */}
      {social.platformsIdentified && social.platformsIdentified.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <strong>Platforms:</strong> {social.platformsIdentified.join(', ')}
        </div>
      )}
    </div>
  );
}

function TemporalProgress({ workflow }: { workflow: RecoveryWorkflow }) {
  const progress = workflow.progress as any;
  const temporal = progress?.temporalProgress || {};
  
  if (!progress || !temporal || Object.keys(temporal).length === 0) {
    return (
      <div className="space-y-2" data-testid={`temporal-progress-${workflow.id}`}>
        <div className="text-sm text-muted-foreground">Temporal archive workflow initializing...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3" data-testid={`temporal-progress-${workflow.id}`}>
      {/* Temporal Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-temporal-archives-${workflow.id}`}>
            {(temporal.archivesIdentified || []).length}
          </div>
          <div className="text-xs text-muted-foreground">Archives</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-temporal-artifacts-${workflow.id}`}>
            {temporal.artifactsAnalyzed || 0}
          </div>
          <div className="text-xs text-muted-foreground">Artifacts Analyzed</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono text-primary" data-testid={`text-temporal-patterns-${workflow.id}`}>
            {(temporal.patternsIdentified || []).length}
          </div>
          <div className="text-xs text-muted-foreground">Patterns Found</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time Period Narrowed:</span>
          <span className="font-mono">{temporal.timePeriodNarrowed ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Temporal Clusters:</span>
          <span className="font-mono">{temporal.temporalClustersFound || 0}</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-muted-foreground">Confidence Score:</span>
          <span className="font-mono font-semibold">{((temporal.confidenceScore || 0) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Time period */}
      {temporal.timePeriodStart && temporal.timePeriodEnd && (
        <div className="text-xs text-muted-foreground">
          <strong>Time Period:</strong> {new Date(temporal.timePeriodStart).toLocaleDateString()} - {new Date(temporal.timePeriodEnd).toLocaleDateString()}
        </div>
      )}

      {/* Archives list */}
      {temporal.archivesIdentified && temporal.archivesIdentified.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <strong>Archives:</strong> {temporal.archivesIdentified.join(', ')}
        </div>
      )}
    </div>
  );
}

interface SweepItemProps {
  sweep: PendingSweep;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onBroadcast: () => void;
  onRefresh: () => void;
  onViewAudit: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isBroadcasting: boolean;
  isRefreshing: boolean;
  showAudit: boolean;
  auditLog?: SweepAuditEntry[];
}

function SweepItem({
  sweep,
  onApprove,
  onReject,
  onBroadcast,
  onRefresh,
  onViewAudit,
  isApproving,
  isRejecting,
  isBroadcasting,
  isRefreshing,
  showAudit,
  auditLog,
}: SweepItemProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', icon: Clock, className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' };
      case 'approved':
        return { label: 'Approved', icon: CheckCircle, className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
      case 'broadcasting':
        return { label: 'Broadcasting', icon: Send, className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' };
      case 'completed':
        return { label: 'Completed', icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/30' };
      case 'failed':
        return { label: 'Failed', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/30' };
      case 'rejected':
        return { label: 'Rejected', icon: XCircle, className: 'bg-muted text-muted-foreground border-muted' };
      case 'expired':
        return { label: 'Expired', icon: Clock, className: 'bg-muted text-muted-foreground border-muted' };
      default:
        return { label: status, icon: Clock, className: 'bg-muted text-muted-foreground border-muted' };
    }
  };

  const statusConfig = getStatusConfig(sweep.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div 
      className="p-4 rounded-lg border bg-card space-y-3"
      data-testid={`sweep-item-${sweep.id}`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-sm font-medium truncate" data-testid={`text-sweep-address-${sweep.id}`}>
              {sweep.address}
            </span>
            <Badge variant="outline" className={statusConfig.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sweep.source}
            </Badge>
            {sweep.isCompressed && (
              <Badge variant="outline" className="text-xs bg-muted">Compressed</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Discovered {new Date(sweep.discoveredAt).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono" data-testid={`text-sweep-balance-${sweep.id}`}>
            {sweep.balanceBtc} BTC
          </div>
          <div className="text-xs text-muted-foreground">
            {sweep.balanceSats.toLocaleString()} sats
          </div>
        </div>
      </div>

      {/* Balance Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="p-2 rounded bg-muted/30">
          <p className="text-xs text-muted-foreground">UTXOs</p>
          <p className="font-mono font-medium">{sweep.utxoCount}</p>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <p className="text-xs text-muted-foreground">Est. Fee</p>
          <p className="font-mono font-medium">{sweep.estimatedFeeSats.toLocaleString()} sats</p>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <p className="text-xs text-muted-foreground">Net Amount</p>
          <p className="font-mono font-medium text-green-600">
            {(sweep.netAmountSats / 100000000).toFixed(8)} BTC
          </p>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <p className="text-xs text-muted-foreground">Passphrase</p>
          <p className="font-mono text-xs truncate">{sweep.passphrase.slice(0, 20)}...</p>
        </div>
      </div>

      {/* TX ID if completed */}
      {sweep.txId && (
        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-600 font-medium">Transaction ID:</p>
          <p className="font-mono text-xs break-all">{sweep.txId}</p>
        </div>
      )}

      {/* Error message if failed */}
      {sweep.errorMessage && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-600 font-medium">Error:</p>
          <p className="text-xs text-red-600">{sweep.errorMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
        {sweep.status === 'pending' && (
          <>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isApproving}
              data-testid={`button-approve-sweep-${sweep.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const reason = window.prompt('Reason for rejection (optional):') || 'Manual rejection';
                onReject(reason);
              }}
              disabled={isRejecting}
              data-testid={`button-reject-sweep-${sweep.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </>
        )}

        {sweep.status === 'approved' && (
          <Button
            size="sm"
            onClick={onBroadcast}
            disabled={isBroadcasting}
            className="bg-green-600 hover:bg-green-700"
            data-testid={`button-broadcast-sweep-${sweep.id}`}
          >
            <Send className="w-4 h-4 mr-1" />
            {isBroadcasting ? 'Broadcasting...' : 'Broadcast Transaction'}
          </Button>
        )}

        {(sweep.status === 'pending' || sweep.status === 'approved') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid={`button-refresh-sweep-${sweep.id}`}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Balance
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onViewAudit}
          data-testid={`button-audit-sweep-${sweep.id}`}
        >
          <History className="w-4 h-4 mr-1" />
          {showAudit ? 'Hide' : 'View'} Audit Log
        </Button>
      </div>

      {/* Audit Log */}
      {showAudit && (
        <div className="pt-3 border-t space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Audit Trail
          </p>
          {auditLog && auditLog.length > 0 ? (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {auditLog.map((entry) => (
                <div 
                  key={entry.id} 
                  className="text-xs p-2 rounded bg-muted/30 flex items-start gap-2"
                  data-testid={`audit-entry-${entry.id}`}
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span className="font-medium capitalize">{entry.action}</span>
                  {entry.previousStatus && entry.newStatus && (
                    <span className="text-muted-foreground">
                      {entry.previousStatus} → {entry.newStatus}
                    </span>
                  )}
                  <span className="text-muted-foreground">by {entry.performedBy}</span>
                  {entry.details && (
                    <span className="text-muted-foreground italic truncate">{entry.details}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading audit log...</p>
          )}
        </div>
      )}
    </div>
  );
}
