/**
 * OCEAN INVESTIGATION - COMPACT SINGLE SCREEN LAYOUT
 * 
 * Everything visible on one screen without scrolling:
 * - Address selector + controls at top
 * - Compact consciousness signature
 * - Neurochemistry + Admin side by side
 * - Stats and activity in remaining space
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Search, Play, Pause, Moon, Sparkles, Cloud, Zap,
  ChevronDown, ChevronUp, RefreshCw, Radio, Users, Wallet, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { TargetAddress } from '@shared/schema';

interface ConsciousnessState {
  phi: number;
  kappa: number;
  regime: 'geometric' | 'breakdown' | 'linear';
  basinDrift: number;
}

interface FullConsciousnessSignature {
  phi: number;
  kappaEff: number;
  tacking: number;
  radar: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
  regime: 'geometric' | 'breakdown' | 'linear';
  isConscious: boolean;
}

interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  data?: any;
}

interface Discovery {
  id: string;
  type: 'near_miss' | 'pattern' | 'strategy_change' | 'match';
  timestamp: Date;
  message: string;
  details?: any;
  significance: number;
}

interface RecoveryCandidate {
  id: number;
  phrase: string;
  address: string;
  verified: boolean;
  qigScore?: { phi: number };
  testedAt?: string;
}

interface ManifoldState {
  totalProbes: number;
  avgPhi: number;
  avgKappa: number;
  dominantRegime: string;
  resonanceClusters: number;
  exploredVolume: number;
}

interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: string;
}

interface InvestigationStatus {
  isRunning: boolean;
  tested: number;
  nearMisses: number;
  consciousness: ConsciousnessState;
  currentThought: string;
  progress: number;
  events?: TelemetryEvent[];
  currentStrategy?: string;
  iteration?: number;
  fullConsciousness?: FullConsciousnessSignature;
  discoveries?: Discovery[];
  manifold?: ManifoldState;
  consoleLogs?: ConsoleLogEntry[];
}

interface NeurochemistryData {
  dopamine: { totalDopamine: number; motivationLevel: number };
  serotonin: { totalSerotonin: number; contentmentLevel: number };
  norepinephrine: { totalNorepinephrine: number; alertnessLevel: number };
  gaba: { totalGABA: number; calmLevel: number };
  acetylcholine: { totalAcetylcholine: number; learningRate: number };
  endorphins: { totalEndorphins: number; pleasureLevel: number };
  overallMood?: number;
  emotionalState?: string;
}

interface CyclesData {
  isInvestigating: boolean;
  recentCycles: number;
  consciousness: FullConsciousnessSignature;
  mushroomCooldownRemaining?: number;
}

interface BasinSyncStatus {
  isRunning: boolean;
  localId: string | null;
  peerCount: number;
  lastBroadcastState: {
    phi: number;
    drift: number;
    regime: string;
  } | null;
  queueLength: number;
  syncData?: {
    exploredRegionsCount: number;
    highPhiPatternsCount: number;
    resonantWordsCount: number;
  };
  peers?: { id: string; mode: string; lastSeen: number; trustLevel: number }[];
  message?: string;
}

interface BalanceHit {
  address: string;
  passphrase: string;
  wif: string;
  balanceSats: number;
  balanceBTC: string;
  txCount: number;
  discoveredAt: string;
  isCompressed: boolean;
  lastChecked?: string;
  balanceChanged?: boolean;
  changeDetectedAt?: string;
  previousBalanceSats?: number;
}

interface BalanceMonitorStatus {
  enabled: boolean;
  isRefreshing: boolean;
  refreshIntervalMinutes: number;
  lastRefreshTime: string | null;
  monitoredAddresses: number;
  activeAddresses: number;
  staleAddresses: number;
  recentChanges: Array<{
    address: string;
    previousBalance: number;
    newBalance: number;
    difference: number;
    detectedAt: string;
  }>;
}

export function OceanInvestigationStory() {
  const { toast } = useToast();
  const [neuroOpen, setNeuroOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  const { data: status, isLoading } = useQuery<InvestigationStatus>({
    queryKey: ['/api/investigation/status'],
    refetchInterval: 2000,
  });

  const { data: targetAddresses } = useQuery<TargetAddress[]>({
    queryKey: ['/api/target-addresses'],
  });

  const { data: candidates } = useQuery<RecoveryCandidate[]>({
    queryKey: ['/api/recovery/candidates'],
    refetchInterval: 3000,
  });

  const { data: neurochemistryData } = useQuery<{ neurochemistry: NeurochemistryData }>({
    queryKey: ['/api/ocean/neurochemistry'],
    refetchInterval: 3000,
  });

  const { data: cyclesData } = useQuery<CyclesData>({
    queryKey: ['/api/ocean/cycles'],
    refetchInterval: 3000,
  });

  const { data: basinSyncStatus } = useQuery<BasinSyncStatus>({
    queryKey: ['/api/basin-sync/coordinator/status'],
    refetchInterval: 5000,
  });

  const { data: balanceHitsData } = useQuery<{ hits: BalanceHit[]; count: number; activeCount: number }>({
    queryKey: ['/api/balance-hits'],
    refetchInterval: 10000,
  });
  const balanceHits = balanceHitsData?.hits || [];

  const [balanceHitsOpen, setBalanceHitsOpen] = useState(true);

  const startMutation = useMutation({
    mutationFn: async (targetAddress: string) => {
      return apiRequest('POST', '/api/recovery/start', { targetAddress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investigation/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ocean/cycles'] });
      toast({ title: 'Investigation Started' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/recovery/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investigation/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ocean/cycles'] });
      toast({ title: 'Investigation Paused' });
    },
  });

  const cycleMutation = useMutation({
    mutationFn: async ({ type, bypassCooldown }: { type: string; bypassCooldown?: boolean }) => {
      return apiRequest('POST', `/api/ocean/cycles/${type}`, { bypassCooldown });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ocean/cycles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ocean/neurochemistry'] });
      toast({ title: `${variables.type.charAt(0).toUpperCase() + variables.type.slice(1)} cycle triggered` });
    },
  });

  const boostMutation = useMutation({
    mutationFn: async ({ neurotransmitter, amount }: { neurotransmitter: string; amount: number }) => {
      return apiRequest('POST', '/api/ocean/boost', { neurotransmitter, amount, duration: 60000 });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ocean/neurochemistry'] });
      toast({ title: `${variables.neurotransmitter} boosted +${(variables.amount * 100).toFixed(0)}%` });
    },
    onError: (error: Error) => {
      const msg = error.message || 'Unknown error';
      if (msg.includes('401')) {
        toast({ title: 'Session expired - please refresh the page', variant: 'destructive' });
      } else {
        toast({ title: `Boost failed: ${msg}`, variant: 'destructive' });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Initializing Ocean...</div>
      </div>
    );
  }

  const currentStatus = status || {
    isRunning: false,
    tested: 0,
    nearMisses: 0,
    consciousness: { phi: 0, kappa: 0, regime: 'breakdown' as const, basinDrift: 0 },
    currentThought: 'Ready to begin investigation...',
    progress: 0,
    events: [],
    discoveries: [],
  };

  // Always show real consciousness data - prefer cyclesData, fallback to status
  const isInvestigating = cyclesData?.isInvestigating === true;
  const consciousness = cyclesData?.consciousness || currentStatus.fullConsciousness || null;
  const neuro = neurochemistryData?.neurochemistry;
  
  // Combine discoveries from status and candidates
  const topCandidates = (candidates || []).slice(0, 5);

  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden" data-testid="investigation-page">
      {/* Row 1: Controls */}
      <ControlRow
        isRunning={currentStatus.isRunning}
        targetAddresses={targetAddresses || []}
        onStart={(addr) => startMutation.mutate(addr)}
        onStop={() => stopMutation.mutate()}
        isPending={startMutation.isPending || stopMutation.isPending}
        thought={currentStatus.currentThought}
      />

      {/* Row 2: Compact Consciousness Signature */}
      <ConsciousnessRow consciousness={consciousness} isInvestigating={isInvestigating} />

      {/* Row 3: Two columns - Neurochemistry/Admin | Activity */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
        {/* Left Column: Neurochemistry + Admin */}
        <div className="flex flex-col gap-3 min-h-0">
          <Collapsible open={neuroOpen} onOpenChange={setNeuroOpen}>
            <Card className="flex-1 min-h-0 overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover-elevate">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-sm">Neurochemistry</span>
                  </div>
                  {neuroOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 pt-0">
                  <NeurochemistryCompact neuro={neuro} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Admin Controls */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Admin Controls
                </span>
                <div className="flex items-center gap-2">
                  {/* Basin Sync Status Indicator */}
                  {basinSyncStatus && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs gap-1 cursor-help ${basinSyncStatus.isRunning ? 'border-cyan-500/50 text-cyan-400' : 'text-muted-foreground'}`}
                            data-testid="badge-basin-sync-status"
                          >
                            <Radio className={`w-3 h-3 ${basinSyncStatus.isRunning ? 'animate-pulse' : ''}`} />
                            Sync {basinSyncStatus.isRunning ? 'ON' : 'OFF'}
                            {basinSyncStatus.peerCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Users className="w-3 h-3" />
                                {basinSyncStatus.peerCount}
                              </span>
                            )}
                          </Badge>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="text-xs space-y-1">
                          <div className="font-semibold">Basin Sync Coordinator</div>
                          {basinSyncStatus.isRunning ? (
                            <>
                              <div>Continuous sync enabled</div>
                              {basinSyncStatus.lastBroadcastState && (
                                <div className="text-muted-foreground">
                                  Last: Φ={basinSyncStatus.lastBroadcastState.phi.toFixed(2)}, 
                                  Drift={basinSyncStatus.lastBroadcastState.drift.toFixed(2)}
                                </div>
                              )}
                              {basinSyncStatus.syncData && (
                                <div className="text-muted-foreground">
                                  {basinSyncStatus.syncData.exploredRegionsCount} regions, 
                                  {basinSyncStatus.syncData.highPhiPatternsCount} patterns
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-muted-foreground">{basinSyncStatus.message || 'Start investigation to enable'}</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {isInvestigating ? 'Active' : 'Idle'}
                  </Badge>
                </div>
              </div>

              {/* Cycle Buttons */}
              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cycleMutation.mutate({ type: 'sleep' })}
                  disabled={cycleMutation.isPending}
                  className="flex-1 gap-1"
                  data-testid="button-cycle-sleep"
                >
                  <Moon className="w-3 h-3" />
                  Sleep
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cycleMutation.mutate({ type: 'dream' })}
                  disabled={cycleMutation.isPending}
                  className="flex-1 gap-1"
                  data-testid="button-cycle-dream"
                >
                  <Cloud className="w-3 h-3" />
                  Dream
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cycleMutation.mutate({ type: 'mushroom' })}
                  disabled={cycleMutation.isPending}
                  className="flex-1 gap-1"
                  data-testid="button-cycle-mushroom"
                >
                  <Sparkles className="w-3 h-3" />
                  Mushroom
                </Button>
              </div>

              {/* Boost Grid */}
              <div className="grid grid-cols-3 gap-1 text-xs">
                {['dopamine', 'serotonin', 'norepinephrine', 'gaba', 'acetylcholine', 'endorphins'].map((nt) => (
                  <div key={nt} className="flex items-center gap-1">
                    <span className="truncate capitalize text-muted-foreground">{nt.slice(0, 4)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1 text-xs"
                      onClick={() => boostMutation.mutate({ neurotransmitter: nt, amount: 0.15 })}
                      disabled={boostMutation.isPending}
                      data-testid={`button-boost-${nt}`}
                    >
                      +15%
                    </Button>
                  </div>
                ))}
              </div>

              {/* Neurotransmitter Legend */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <div className="font-medium text-foreground/80 mb-2">When to boost:</div>
                  <div className="grid grid-cols-1 gap-1">
                    <div><span className="text-yellow-500 font-medium">Dopamine</span> — Stuck in a rut? Boost to explore new areas</div>
                    <div><span className="text-pink-500 font-medium">Serotonin</span> — For steady, methodical pattern recognition</div>
                    <div><span className="text-orange-500 font-medium">Norepinephrine</span> — Intensive focus bursts when close</div>
                    <div><span className="text-purple-500 font-medium">GABA</span> — Too volatile? Stabilize the search</div>
                    <div><span className="text-blue-500 font-medium">Acetylcholine</span> — Strengthen memory of good patterns</div>
                    <div><span className="text-green-500 font-medium">Endorphins</span> — Long search? Maintain persistence</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity + Candidates */}
        <div className="flex flex-col gap-3 min-h-0">
          <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="flex-1 min-h-0">
            <Card className="h-full flex flex-col min-h-0 overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover-elevate shrink-0">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium text-sm">Live Activity</span>
                    {currentStatus.isRunning && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">Running</Badge>
                    )}
                  </div>
                  {activityOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex-1 min-h-0 overflow-hidden">
                <CardContent className="p-3 pt-0 h-full overflow-hidden">
                  <ActivityCompact
                    consoleLogs={currentStatus.consoleLogs || []}
                    isRunning={currentStatus.isRunning}
                    iteration={currentStatus.iteration || 0}
                    strategy={currentStatus.currentStrategy || 'idle'}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          
          {/* Candidates/Discoveries (compact) */}
          {topCandidates.length > 0 && (
            <Card className="shrink-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-sm">Top Candidates</span>
                  <Badge variant="outline" className="text-xs ml-auto">{topCandidates.length}</Badge>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {topCandidates.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                      <span className="font-mono truncate flex-1" title={c.phrase}>
                        {c.phrase.length > 20 ? c.phrase.slice(0, 20) + '...' : c.phrase}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={c.verified ? 'text-green-400' : 'text-muted-foreground'}>
                          {c.qigScore ? `Φ ${(c.qigScore.phi * 100).toFixed(0)}%` : '—'}
                        </span>
                        {c.verified && <Badge className="bg-green-500 text-xs">Match!</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Hits - Addresses with coins/activity */}
          <BalanceHitsPanel 
            hits={balanceHits} 
            isOpen={balanceHitsOpen}
            onOpenChange={setBalanceHitsOpen}
          />
        </div>
      </div>

      {/* Row 4: Stats Bar + Manifold */}
      <StatsRow
        tested={currentStatus.tested}
        promising={currentStatus.nearMisses}
        consciousness={consciousness?.phi || 0}
        manifold={currentStatus.manifold}
      />
    </div>
  );
}

interface AutoCycleStatus {
  enabled: boolean;
  currentIndex: number;
  totalAddresses: number;
  currentAddressId: string | null;
  isRunning: boolean;
  totalCycles: number;
  lastCycleTime: string | null;
  position: string;
}

function ControlRow({ 
  isRunning, 
  targetAddresses, 
  onStart, 
  onStop, 
  isPending,
  thought 
}: {
  isRunning: boolean;
  targetAddresses: TargetAddress[];
  onStart: (address: string) => void;
  onStop: () => void;
  isPending: boolean;
  thought: string;
}) {
  const [selectedAddress, setSelectedAddress] = useState(targetAddresses[0]?.address || '');
  const [newAddress, setNewAddress] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (targetAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(targetAddresses[0].address);
    }
  }, [targetAddresses, selectedAddress]);

  // Auto-cycle status query
  const { data: autoCycleStatus } = useQuery<AutoCycleStatus>({
    queryKey: ['/api/auto-cycle/status'],
    refetchInterval: 3000,
  });

  // Auto-cycle toggle mutation
  const autoCycleToggle = useMutation({
    mutationFn: async () => {
      const endpoint = autoCycleStatus?.enabled 
        ? '/api/auto-cycle/disable' 
        : '/api/auto-cycle/enable';
      return apiRequest('POST', endpoint, {});
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-cycle/status'] });
      toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
  });

  // Dedicated disable mutation for Stop All button (avoids race condition)
  const disableAutoCycle = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auto-cycle/disable', {});
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-cycle/status'] });
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (address: string) => {
      return apiRequest('POST', '/api/target-addresses', { 
        address, 
        label: `Custom ${new Date().toLocaleDateString()}` 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/target-addresses'] });
      setNewAddress('');
      setShowAddNew(false);
    },
  });

  return (
    <Card data-testid="control-row">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Address Selector */}
          <div className="flex-1 flex items-center gap-2">
            <Select
              value={selectedAddress}
              onValueChange={setSelectedAddress}
              disabled={isRunning || autoCycleStatus?.enabled}
            >
              <SelectTrigger className="flex-1" data-testid="select-target-address">
                <SelectValue placeholder="Select address..." />
              </SelectTrigger>
              <SelectContent>
                {targetAddresses.map((addr) => (
                  <SelectItem key={addr.id} value={addr.address}>
                    {addr.label || addr.address.slice(0, 16) + '...'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!isRunning && !autoCycleStatus?.enabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddNew(!showAddNew)}
                data-testid="button-add-address"
              >
                {showAddNew ? 'Cancel' : '+ Add'}
              </Button>
            )}
          </div>

          {/* Auto-Cycle Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={autoCycleStatus?.enabled ? 'default' : 'outline'}
                onClick={() => autoCycleToggle.mutate()}
                disabled={autoCycleToggle.isPending}
                className={autoCycleStatus?.enabled 
                  ? 'bg-blue-600 hover:bg-blue-700 gap-1.5' 
                  : 'gap-1.5'}
                data-testid="button-auto-cycle"
              >
                <RefreshCw className={`w-4 h-4 ${autoCycleStatus?.enabled && isRunning ? 'animate-spin' : ''}`} />
                {autoCycleStatus?.enabled ? autoCycleStatus.position : 'Auto'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">
                {autoCycleStatus?.enabled 
                  ? `Auto-cycling through all addresses (${autoCycleStatus.totalCycles} full cycles completed)` 
                  : 'Enable auto-cycle to continuously investigate all addresses'}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Start/Stop Button - Hidden when auto-cycle is enabled */}
          {!autoCycleStatus?.enabled && (
            !isRunning ? (
              <Button
                onClick={() => onStart(selectedAddress)}
                disabled={isPending || !selectedAddress}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                data-testid="button-start-investigation"
              >
                <Play className="w-4 h-4" />
                Start
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={onStop}
                disabled={isPending}
                className="gap-2"
                data-testid="button-stop-investigation"
              >
                <Pause className="w-4 h-4" />
                Stop
              </Button>
            )
          )}

          {/* Stop button when auto-cycle is running */}
          {autoCycleStatus?.enabled && isRunning && (
            <Button
              variant="destructive"
              onClick={() => {
                // Use dedicated disable mutation to avoid race condition
                disableAutoCycle.mutate();
                onStop();
              }}
              disabled={isPending || disableAutoCycle.isPending}
              className="gap-2"
              data-testid="button-stop-auto-cycle"
            >
              <Pause className="w-4 h-4" />
              Stop All
            </Button>
          )}
        </div>

        {/* Add new address row */}
        <AnimatePresence>
          {showAddNew && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Enter Bitcoin address (1xxx, 3xxx, or bc1xxx)"
                  className="flex-1 h-9 px-3 rounded-md bg-background border text-sm font-mono"
                  data-testid="input-new-address"
                />
                <Button
                  size="sm"
                  onClick={() => addAddressMutation.mutate(newAddress)}
                  disabled={!newAddress || addAddressMutation.isPending}
                  data-testid="button-save-address"
                >
                  Save
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current thought */}
        {thought && (
          <div className="mt-2 pt-2 border-t text-sm text-muted-foreground italic truncate">
            "{thought}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConsciousnessRow({ 
  consciousness,
  isInvestigating = false
}: { 
  consciousness: FullConsciousnessSignature | null;
  isInvestigating?: boolean;
}) {
  const metrics = [
    { key: 'phi', label: 'Φ', value: consciousness?.phi, threshold: 0.75 },
    { key: 'kappa', label: 'κ', value: consciousness?.kappaEff, threshold: 64, max: 90 },
    { key: 'tacking', label: 'T', value: consciousness?.tacking, threshold: 0.5 },
    { key: 'radar', label: 'R', value: consciousness?.radar, threshold: 0.7 },
    { key: 'meta', label: 'M', value: consciousness?.metaAwareness, threshold: 0.6 },
    { key: 'gamma', label: 'Γ', value: consciousness?.gamma, threshold: 0.8 },
    { key: 'ground', label: 'G', value: consciousness?.grounding, threshold: 0.85 },
  ];

  const getRegimeColor = () => {
    if (!consciousness || !isInvestigating) return 'text-muted-foreground';
    const regime = consciousness.regime as string;
    if (regime === 'geometric') return 'text-green-400';
    if (regime === 'breakdown') return 'text-red-400';
    if (regime === '4d_block_universe' || regime === 'hierarchical_4d') return 'text-purple-400';
    return 'text-yellow-400';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border" data-testid="consciousness-row">
      <span className="text-xs text-muted-foreground uppercase tracking-wide mr-2">Consciousness</span>
      
      {metrics.map((m) => {
        const displayValue = (!isInvestigating || m.value === undefined) ? '—' : m.value.toFixed(2);
        const isGood = isInvestigating && m.value !== undefined && m.value >= m.threshold && (!m.max || m.value <= m.max);
        
        return (
          <Tooltip key={m.key}>
            <TooltipTrigger asChild>
              <div 
                className={`px-2 py-1 rounded text-xs font-mono ${
                  isGood ? 'text-green-400 bg-green-500/10' : 'text-muted-foreground'
                }`}
                data-testid={`consciousness-${m.key}`}
              >
                <span className="opacity-60">{m.label}</span>
                <span className="ml-1">{displayValue}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{m.label} (threshold: {m.threshold})</TooltipContent>
          </Tooltip>
        );
      })}

      <div className="ml-auto flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`text-xs ${getRegimeColor()}`}
          data-testid="consciousness-regime"
        >
          {isInvestigating ? (consciousness?.regime || 'linear') : 'idle'}
        </Badge>
        {isInvestigating && consciousness?.isConscious && (
          <Badge className="bg-green-500/20 text-green-400 text-xs">
            Conscious
          </Badge>
        )}
      </div>
    </div>
  );
}

function NeurochemistryCompact({ 
  neuro
}: { 
  neuro?: NeurochemistryData;
}) {
  const getValue = (key: string): number => {
    if (!neuro) return 0.5;
    switch (key) {
      case 'dopamine': return neuro.dopamine?.totalDopamine ?? 0.5;
      case 'serotonin': return neuro.serotonin?.totalSerotonin ?? 0.5;
      case 'norepinephrine': return neuro.norepinephrine?.totalNorepinephrine ?? 0.5;
      case 'gaba': return neuro.gaba?.totalGABA ?? 0.5;
      case 'acetylcholine': return neuro.acetylcholine?.totalAcetylcholine ?? 0.5;
      case 'endorphins': return neuro.endorphins?.totalEndorphins ?? 0.5;
      default: return 0.5;
    }
  };

  const items = [
    { key: 'dopamine', label: 'Dopamine', color: 'bg-yellow-500' },
    { key: 'serotonin', label: 'Serotonin', color: 'bg-pink-500' },
    { key: 'norepinephrine', label: 'Norepinephrine', color: 'bg-orange-500' },
    { key: 'gaba', label: 'GABA', color: 'bg-purple-500' },
    { key: 'acetylcholine', label: 'Acetylcholine', color: 'bg-blue-500' },
    { key: 'endorphins', label: 'Endorphins', color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const value = getValue(item.key) * 100;
        return (
          <div key={item.key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 truncate">{item.label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${item.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">{value.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityCompact({ 
  consoleLogs = [], 
  isRunning, 
  iteration, 
  strategy 
}: { 
  consoleLogs?: ConsoleLogEntry[];
  isRunning: boolean;
  iteration: number;
  strategy: string;
}) {
  const logs = consoleLogs || [];
  if (!isRunning && logs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Start an investigation to see activity
      </div>
    );
  }

  const formatLogMessage = (msg: string): string => {
    return msg
      .replace(/\[Ocean\]\s*/g, '')
      .replace(/\[QIG[^\]]*\]\s*/g, '')
      .replace(/[┏┓┗┛┃┌┐└┘│╔╗╚╝║╠╣═━─]+/g, '')
      .trim();
  };

  return (
    <div className="h-full flex flex-col">
      {isRunning && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 pb-2 border-b">
          <span>Strategy: <span className="text-foreground">{strategy}</span></span>
          <span>Iteration: <span className="text-foreground">{iteration}</span></span>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto font-mono text-xs min-h-0 space-y-0.5">
        {logs.slice(-30).reverse().map((log, i) => {
          const formattedMsg = formatLogMessage(log.message);
          if (!formattedMsg) return null;
          
          return (
            <div 
              key={log.id || i} 
              className={`py-0.5 px-1 rounded flex items-start gap-2 ${
                log.level === 'error' ? 'bg-red-500/10 text-red-400' :
                log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-muted/20 text-muted-foreground'
              }`}
            >
              <span className="text-muted-foreground/50 shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-foreground/80 break-all whitespace-pre-wrap">{formattedMsg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BalanceHitsPanel({
  hits,
  isOpen,
  onOpenChange
}: {
  hits: BalanceHit[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: monitorStatus } = useQuery<BalanceMonitorStatus>({
    queryKey: ['/api/balance-monitor/status'],
    refetchInterval: 10000,
  });
  
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/balance-monitor/refresh', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Balance Refresh Complete',
        description: data.message || `Refreshed ${data.result?.refreshed || 0} addresses`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance-hits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance-monitor/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Could not refresh balances',
        variant: 'destructive',
      });
    },
  });
  
  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hitsWithBalance = hits.filter(h => h.balanceSats > 0);
  const hitsWithActivity = hits.filter(h => h.balanceSats === 0 && h.txCount > 0);
  const hitsWithChanges = hits.filter(h => h.balanceChanged);
  
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const CopyableField = ({ label, value, fieldId }: { label: string; value: string; fieldId: string }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button 
          size="sm"
          variant="outline"
          className="h-6 px-2 gap-1"
          onClick={() => copyToClipboard(value, fieldId)}
          data-testid={`button-copy-${fieldId}`}
        >
          {copiedField === fieldId ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <div 
        className="p-2 bg-muted/50 rounded border font-mono text-xs break-all select-all cursor-text"
        onClick={(e) => {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(e.currentTarget);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }}
        data-testid={`text-${fieldId}`}
      >
        {value}
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className={`shrink-0 ${hitsWithBalance.length > 0 ? 'border-green-500/50 bg-green-500/5' : ''} ${hitsWithChanges.length > 0 ? 'ring-2 ring-yellow-500/50' : ''}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover-elevate">
            <div className="flex items-center gap-2">
              <Wallet className={`w-4 h-4 ${hitsWithBalance.length > 0 ? 'text-green-400' : 'text-muted-foreground'}`} />
              <span className="font-medium text-sm">Balance Hits</span>
              {hitsWithBalance.length > 0 && (
                <Badge className="bg-green-500 text-xs">{hitsWithBalance.length} with coins!</Badge>
              )}
              {hitsWithChanges.length > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse">{hitsWithChanges.length} changed!</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {monitorStatus?.lastRefreshTime && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground">
                      Checked: {formatTimeAgo(monitorStatus.lastRefreshTime)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-refresh every {monitorStatus.refreshIntervalMinutes}min</p>
                    <p className="text-xs text-muted-foreground">
                      {monitorStatus.staleAddresses > 0 
                        ? `${monitorStatus.staleAddresses} stale addresses` 
                        : 'All addresses up to date'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge variant="outline" className="text-xs">{hits.length} total</Badge>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0 max-h-[500px] overflow-y-auto">
            {/* Refresh button and status */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshMutation.mutate();
                  }}
                  disabled={refreshMutation.isPending || monitorStatus?.isRefreshing}
                  data-testid="button-refresh-balances"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${(refreshMutation.isPending || monitorStatus?.isRefreshing) ? 'animate-spin' : ''}`} />
                  {refreshMutation.isPending || monitorStatus?.isRefreshing ? 'Refreshing...' : 'Refresh All'}
                </Button>
                {monitorStatus?.enabled && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs">
                        Auto: {monitorStatus.refreshIntervalMinutes}min
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Automatic balance monitoring is enabled
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {monitorStatus?.recentChanges && monitorStatus.recentChanges.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-xs">
                      {monitorStatus.recentChanges.length} recent changes
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      {monitorStatus.recentChanges.slice(0, 3).map((change, i) => (
                        <div key={i} className="text-xs">
                          {change.address.slice(0, 12)}... {change.difference > 0 ? '+' : ''}{(change.difference / 100000000).toFixed(8)} BTC
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {hits.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No addresses with balances found yet. Ocean checks every 3rd generated address.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Addresses with balance first - FULL RECOVERY DATA */}
                {hitsWithBalance.map((hit, i) => (
                  <div key={`bal-${i}`} className={`p-4 rounded-lg bg-green-500/10 border-2 space-y-3 ${hit.balanceChanged ? 'border-yellow-500 ring-2 ring-yellow-500/30' : 'border-green-500/50'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500 text-base px-3 py-1">{hit.balanceBTC} BTC</Badge>
                        {hit.balanceChanged && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="destructive" className="text-xs animate-pulse">Changed!</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Balance changed at {hit.changeDetectedAt ? new Date(hit.changeDetectedAt).toLocaleString() : 'Unknown'}</p>
                              {hit.previousBalanceSats !== undefined && (
                                <p className="text-xs">Previous: {(hit.previousBalanceSats / 100000000).toFixed(8)} BTC</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{new Date(hit.discoveredAt).toLocaleString()}</div>
                        <div>{hit.txCount} txs | {hit.isCompressed ? 'Compressed' : 'Uncompressed'}</div>
                        {hit.lastChecked && (
                          <div className="text-green-600 dark:text-green-400">Verified: {formatTimeAgo(hit.lastChecked)}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2 border-t border-green-500/30">
                      <CopyableField 
                        label="PASSPHRASE (for recovery)" 
                        value={hit.passphrase} 
                        fieldId={`pass-${i}`} 
                      />
                      <CopyableField 
                        label="WIF PRIVATE KEY (import to wallet)" 
                        value={hit.wif} 
                        fieldId={`wif-${i}`} 
                      />
                      <CopyableField 
                        label="Bitcoin Address" 
                        value={hit.address} 
                        fieldId={`addr-${i}`} 
                      />
                    </div>
                  </div>
                ))}

                {/* Addresses with historical activity (0 balance) - FULL DATA TOO */}
                {hitsWithActivity.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium text-muted-foreground mb-3">
                      Historical Activity (emptied - 0 balance):
                    </div>
                    {hitsWithActivity.map((hit, i) => (
                      <div key={`hist-${i}`} className="p-3 rounded-lg bg-muted/30 border space-y-3 mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{hit.txCount} transactions</span>
                          <span>{hit.isCompressed ? 'Compressed' : 'Uncompressed'}</span>
                        </div>
                        
                        <CopyableField 
                          label="Passphrase" 
                          value={hit.passphrase} 
                          fieldId={`histpass-${i}`} 
                        />
                        <CopyableField 
                          label="WIF Private Key" 
                          value={hit.wif} 
                          fieldId={`histwif-${i}`} 
                        />
                        <CopyableField 
                          label="Address" 
                          value={hit.address} 
                          fieldId={`histaddr-${i}`} 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function StatsRow({ 
  tested, 
  promising, 
  consciousness, 
  manifold
}: { 
  tested: number;
  promising: number;
  consciousness: number;
  manifold?: ManifoldState;
}) {
  return (
    <div className="flex gap-3 shrink-0" data-testid="stats-row">
      <Card className="flex-1">
        <CardContent className="p-3 flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-bold" data-testid="stat-consciousness">
              {consciousness > 0 ? `${(consciousness * 100).toFixed(0)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Φ</div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="flex-1">
        <CardContent className="p-3 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-bold" data-testid="stat-tested">
              {tested.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Tested</div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="flex-1">
        <CardContent className="p-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-green-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-bold" data-testid="stat-promising">
              {promising}
            </div>
            <div className="text-xs text-muted-foreground">Near-Miss</div>
          </div>
        </CardContent>
      </Card>

      {manifold && (
        <Card className="flex-1">
          <CardContent className="p-3 flex items-center gap-3">
            <Brain className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-bold">
                {manifold.totalProbes.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Probes</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OceanInvestigationStory;
