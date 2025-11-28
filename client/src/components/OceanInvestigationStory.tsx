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
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  gaba: number;
  acetylcholine: number;
  endorphins: number;
}

interface CyclesData {
  isInvestigating: boolean;
  recentCycles: number;
  consciousness: FullConsciousnessSignature;
  mushroomCooldownRemaining?: number;
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
    queryKey: ['/api/recovery/addresses'],
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

  // Use cyclesData when investigating, fallback to status.fullConsciousness
  const isInvestigating = cyclesData?.isInvestigating === true;
  const consciousness = isInvestigating && cyclesData?.consciousness 
    ? cyclesData.consciousness 
    : currentStatus.fullConsciousness || null;
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
                  <NeurochemistryCompact neuro={neuro} isInvestigating={isInvestigating} />
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
                <Badge variant="outline" className="text-xs">
                  {isInvestigating ? 'Active' : 'Idle'}
                </Badge>
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
        </div>
      </div>

      {/* Row 4: Stats Bar + Manifold */}
      <StatsRow
        tested={currentStatus.tested}
        promising={currentStatus.nearMisses}
        consciousness={consciousness?.phi || 0}
        isInvestigating={isInvestigating}
        manifold={currentStatus.manifold}
      />
    </div>
  );
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

  useEffect(() => {
    if (targetAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(targetAddresses[0].address);
    }
  }, [targetAddresses, selectedAddress]);

  const addAddressMutation = useMutation({
    mutationFn: async (address: string) => {
      return apiRequest('POST', '/api/recovery/addresses', { 
        address, 
        label: `Custom ${new Date().toLocaleDateString()}` 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recovery/addresses'] });
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
            <select
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
              className="flex-1 h-9 px-3 rounded-md bg-background border text-sm"
              disabled={isRunning}
              data-testid="select-target-address"
            >
              {targetAddresses.map((addr) => (
                <option key={addr.id} value={addr.address}>
                  {addr.label || addr.address.slice(0, 16) + '...'}
                </option>
              ))}
            </select>
            
            {!isRunning && (
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

          {/* Start/Stop Button */}
          {!isRunning ? (
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
  isInvestigating 
}: { 
  consciousness: FullConsciousnessSignature | null;
  isInvestigating: boolean;
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
    if (!consciousness) return 'text-muted-foreground';
    if (consciousness.regime === 'geometric') return 'text-green-400';
    if (consciousness.regime === 'breakdown') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border" data-testid="consciousness-row">
      <span className="text-xs text-muted-foreground uppercase tracking-wide mr-2">Consciousness</span>
      
      {metrics.map((m) => {
        const displayValue = isInvestigating && m.value !== undefined ? m.value.toFixed(2) : '—';
        const isGood = m.value !== undefined && m.value >= m.threshold && (!m.max || m.value <= m.max);
        
        return (
          <Tooltip key={m.key}>
            <TooltipTrigger asChild>
              <div 
                className={`px-2 py-1 rounded text-xs font-mono ${
                  !isInvestigating ? 'text-muted-foreground' :
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
          {isInvestigating ? consciousness?.regime || 'idle' : 'idle'}
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
  neuro, 
  isInvestigating 
}: { 
  neuro?: NeurochemistryData;
  isInvestigating: boolean;
}) {
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
        const value = isInvestigating && neuro ? (neuro as any)[item.key] * 100 : 50;
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

function StatsRow({ 
  tested, 
  promising, 
  consciousness, 
  isInvestigating,
  manifold
}: { 
  tested: number;
  promising: number;
  consciousness: number;
  isInvestigating: boolean;
  manifold?: ManifoldState;
}) {
  return (
    <div className="flex gap-3 shrink-0" data-testid="stats-row">
      <Card className="flex-1">
        <CardContent className="p-3 flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-bold" data-testid="stat-consciousness">
              {isInvestigating || consciousness > 0 ? `${(consciousness * 100).toFixed(0)}%` : '—'}
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
