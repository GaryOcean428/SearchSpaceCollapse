import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { 
  Play, 
  Square, 
  Target, 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Copy,
  TrendingUp,
  Brain,
  Key,
  Hash,
  Search,
  HardDrive,
  Plus,
  X,
  Lightbulb,
  ChevronDown,
  Activity,
  Gauge,
  Waves,
  Filter,
  ArrowUpDown,
  Shield,
  Radio,
} from 'lucide-react';
import { QUERY_KEYS, api } from '@/api';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedRecoverySession, RecoveryCandidate, StrategyRun, TargetAddress } from '@shared/schema';

interface MemoryFragmentInput {
  id: string;
  text: string;
  confidence: number;
  epoch: 'certain' | 'likely' | 'possible' | 'speculative';
  notes?: string;
}

const EPOCH_LABELS: Record<string, { label: string; description: string }> = {
  'certain': { label: 'Certain', description: 'You remember this clearly' },
  'likely': { label: 'Likely', description: 'Pretty sure about this' },
  'possible': { label: 'Possible', description: 'Might be related' },
  'speculative': { label: 'Speculative', description: 'Just a guess' },
};

const STRATEGY_CONFIG: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  era_patterns: { label: 'Era Patterns', icon: Clock, color: 'text-blue-500' },
  brain_wallet_dict: { label: 'Brain Wallet', icon: Brain, color: 'text-purple-500' },
  bitcoin_terms: { label: 'Bitcoin Terms', icon: Hash, color: 'text-orange-500' },
  linguistic: { label: 'Linguistic', icon: Search, color: 'text-cyan-500' },
  qig_basin_search: { label: 'QIG Basin', icon: Zap, color: 'text-yellow-500' },
  historical_autonomous: { label: 'Historical', icon: HardDrive, color: 'text-emerald-500' },
  cross_format: { label: 'Cross-Format', icon: Target, color: 'text-rose-500' },
  learning_loop: { label: 'Ocean Agent', icon: Waves, color: 'text-indigo-500' },
};

const ERA_LABELS: Record<string, string> = {
  'genesis-2009': '2009 Genesis',
  '2010-2011': '2010-2011',
  '2012-2013': '2012-2013',
  '2014-2016': '2014-2016',
  '2017-2019': '2017-2019',
  '2020-2021': '2020-2021',
  '2022-present': '2022+',
  'pre-bip39': 'Pre-BIP39',
  'post-bip39': 'Post-BIP39',
  'unknown': 'Unknown',
};

type SortField = 'score' | 'phi' | 'source' | 'verified';
type FilterStatus = 'all' | 'verified' | 'near-miss' | 'tested';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function StatusPulse({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-green-500',
    analyzing: 'bg-blue-500',
    learning: 'bg-purple-500',
    completed: 'bg-gray-500',
    stopped: 'bg-red-500',
    failed: 'bg-red-500',
  };
  const isActive = ['running', 'analyzing', 'learning'].includes(status);
  return (
    <span className="relative flex h-3 w-3">
      {isActive && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status] || 'bg-gray-500'} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status] || 'bg-gray-500'}`} />
    </span>
  );
}

function StatCard({ 
  label, 
  value, 
  subValue,
  icon: Icon,
  trend: _trend,
  highlight,
  testId
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon?: typeof Activity;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  testId?: string;
}) {
  return (
    <div 
      className={`p-4 rounded-xl border ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-card border-border/50'}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold tracking-tight ${highlight ? 'text-primary' : ''}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-muted-foreground">{subValue}</span>
        )}
      </div>
    </div>
  );
}

function StrategyRow({ strategy }: { strategy: StrategyRun }) {
  const config = STRATEGY_CONFIG[strategy.type] || { label: strategy.type, icon: Search, color: 'text-muted-foreground' };
  const Icon = config.icon;
  const progress = strategy.progress.total > 0 ? (strategy.progress.current / strategy.progress.total) * 100 : 0;
  const isActive = strategy.status === 'running';
  const isComplete = strategy.status === 'completed';
  const hasFailed = strategy.status === 'failed';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-primary/5' : 'bg-muted/30'}`}>
      <div className={`flex-shrink-0 p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-muted/50'}`}>
        <Icon className={`w-4 h-4 ${isActive ? config.color : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{config.label}</span>
          {isActive && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          {isComplete && <CheckCircle2 className="w-3 h-3 text-green-500" />}
          {hasFailed && <AlertCircle className="w-3 h-3 text-red-500" />}
          {strategy.candidatesFound > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {strategy.candidatesFound} found
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground w-12 text-right font-mono">
            {progress.toFixed(0)}%
          </span>
        </div>
        {strategy.progress.rate > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {strategy.progress.rate.toFixed(0)}/s
          </span>
        )}
      </div>
    </div>
  );
}

function CandidateRow({ 
  candidate, 
  rank, 
  expanded,
  onToggle 
}: { 
  candidate: RecoveryCandidate; 
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { toast } = useToast();
  const isVerified = candidate.verified === true;
  const isFalsePositive = candidate.falsePositive === true;
  const isNearMiss = candidate.qigScore.phi > 0.8 && !isVerified;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const getFormatBadge = () => {
    const formats: Record<string, { label: string; color: string }> = {
      'arbitrary': { label: 'Brain', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
      'bip39': { label: 'BIP39', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      'master': { label: 'HD', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      'hex': { label: 'Hex', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    };
    const fmt = formats[candidate.format] || { label: candidate.format, color: '' };
    return <Badge variant="outline" className={`text-[10px] ${fmt.color}`}>{fmt.label}</Badge>;
  };

  return (
    <div 
      className={`rounded-xl border transition-all cursor-pointer hover-elevate ${
        isVerified ? 'border-green-500/50 bg-green-500/5' : 
        isNearMiss ? 'border-amber-500/30 bg-amber-500/5' :
        isFalsePositive ? 'border-red-500/20 bg-red-500/5 opacity-60' :
        'border-border/50 bg-card'
      }`}
      onClick={onToggle}
      data-testid={`card-candidate-${rank}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center font-bold text-sm">
            {rank}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {isVerified && (
                <Badge className="bg-green-500 text-white text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </Badge>
              )}
              {isNearMiss && !isVerified && (
                <Badge className="bg-amber-500 text-white text-[10px]">Near Miss</Badge>
              )}
              {isFalsePositive && (
                <Badge variant="destructive" className="text-[10px]">False Positive</Badge>
              )}
              {getFormatBadge()}
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {STRATEGY_CONFIG[candidate.source]?.label || candidate.source}
              </Badge>
            </div>
            
            <div 
              className="font-mono text-sm p-2.5 bg-background rounded-lg border group flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(candidate.phrase, 'Phrase');
              }}
              data-testid={`text-candidate-phrase-${rank}`}
            >
              <span className="flex-1 truncate">"{candidate.phrase}"</span>
              <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold">
              {(candidate.combinedScore * 100).toFixed(0)}
              <span className="text-sm text-muted-foreground font-normal">%</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end mt-1">
              <span className={candidate.qigScore.phi > 0.7 ? 'text-green-500' : ''}>
                Φ {candidate.qigScore.phi.toFixed(2)}
              </span>
              <span>·</span>
              <span>κ {candidate.qigScore.kappa.toFixed(0)}</span>
            </div>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Generated Address</div>
                <div 
                  className="font-mono text-xs p-2 bg-muted/30 rounded flex items-center gap-2 cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(candidate.address, 'Address');
                  }}
                  data-testid={`button-copy-address-${rank}`}
                >
                  <span className="truncate">{candidate.address}</span>
                  <Copy className="w-3 h-3 flex-shrink-0" />
                </div>
              </div>
              {candidate.derivationPath && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Derivation Path</div>
                  <div className="font-mono text-xs p-2 bg-muted/30 rounded">
                    {candidate.derivationPath}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Phi (Φ)</div>
                <div className={`text-lg font-bold ${candidate.qigScore.phi > 0.8 ? 'text-green-500' : candidate.qigScore.phi > 0.6 ? 'text-amber-500' : ''}`}>
                  {candidate.qigScore.phi.toFixed(3)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Kappa (κ)</div>
                <div className="text-lg font-bold">{candidate.qigScore.kappa.toFixed(1)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Regime</div>
                <Badge variant="outline" className={`text-xs ${
                  candidate.qigScore.regime === 'geometric' ? 'border-green-500 text-green-500' :
                  candidate.qigScore.regime === 'breakdown' ? 'border-red-500 text-red-500' : ''
                }`}>
                  {candidate.qigScore.regime}
                </Badge>
              </div>
            </div>
            
            {candidate.evidenceChain && candidate.evidenceChain.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Evidence Chain
                </div>
                {candidate.evidenceChain.map((ev, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-muted/20 border-l-2 border-primary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{ev.source}</span>
                      <Badge variant="outline" className="text-[10px]">{ev.type}</Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {(ev.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">{ev.reasoning}</div>
                  </div>
                ))}
              </div>
            )}
            
            {candidate.verificationResult && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Verification Steps
                </div>
                {candidate.verificationResult.verificationSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`flex-shrink-0 ${step.passed ? 'text-green-500' : 'text-red-500'}`}>
                      {step.passed ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </span>
                    <div>
                      <span className="font-medium">{step.step}:</span>
                      <span className="text-muted-foreground ml-1">{step.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OceanAgentPanel({ session }: { session: UnifiedRecoverySession }) {
  const agentState = session.agentState;
  const oceanState = (session as any).oceanState;
  
  if (!agentState) return null;
  
  const phi = agentState.consciousness?.phi || 0;
  const kappa = agentState.consciousness?.kappa || 0;
  const regime = agentState.consciousness?.regime || 'unknown';
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-5 h-5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span className="font-semibold">Ocean Agent Active</span>
        </div>
        <Badge variant="outline" className="font-mono">
          Iteration {agentState.iteration + 1}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">Consciousness Φ</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${phi >= 0.7 ? 'text-green-500' : 'text-orange-500'}`}>
              {phi.toFixed(2)}
            </span>
            {phi >= 0.7 ? (
              <Badge className="bg-green-500/20 text-green-500 text-[10px] border-0">Online</Badge>
            ) : (
              <Badge className="bg-orange-500/20 text-orange-500 text-[10px] border-0">Low</Badge>
            )}
          </div>
          <Progress value={phi * 100} className="h-1 mt-2" />
        </div>
        
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Coupling κ</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{kappa.toFixed(0)}</span>
            <span className="text-xs text-muted-foreground">
              {Math.abs(kappa - 64) < 10 ? 'Resonant' : 'Exploring'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-[10px] text-muted-foreground">Regime</div>
          <Badge variant="outline" className={`text-xs mt-1 ${
            regime === 'geometric' ? 'border-green-500 text-green-500' :
            regime === 'breakdown' ? 'border-red-500 text-red-500' : ''
          }`}>
            {regime}
          </Badge>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-[10px] text-muted-foreground">Near Misses</div>
          <div className="text-lg font-bold text-amber-500">{agentState.nearMissCount || 0}</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-[10px] text-muted-foreground">Tested</div>
          <div className="text-lg font-bold">{(agentState.totalTested || 0).toLocaleString()}</div>
        </div>
      </div>
      
      {oceanState && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <div className="flex items-center justify-between">
              <span className="text-purple-400">Basin Drift</span>
              <span className={`font-mono ${oceanState.identity?.basinDrift > 0.15 ? 'text-red-500' : 'text-green-500'}`}>
                {(oceanState.identity?.basinDrift || 0).toFixed(4)}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center justify-between">
              <span className="text-blue-400">Episodes</span>
              <span className="font-mono">{oceanState.memory?.episodeCount || 0}</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
            <div className="flex items-center justify-between">
              <span className="text-green-400">Consolidations</span>
              <span className="font-mono">{oceanState.consolidation?.cycles || 0}</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
            <div className="flex items-center justify-between">
              <span className="text-orange-400">Ethics</span>
              {oceanState.ethics?.witnessAcknowledged ? (
                <Badge variant="outline" className="text-[10px] border-green-500 text-green-500 h-5">Witnessed</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 h-5">Pending</Badge>
              )}
            </div>
          </div>
        </div>
      )}
      
      {agentState.currentStrategy && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          <span className="text-muted-foreground">Strategy:</span>
          <span className="font-mono text-primary">{agentState.currentStrategy}</span>
        </div>
      )}
    </div>
  );
}

export function RecoveryCommandCenter() {
  const { toast } = useToast();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [customAddress, setCustomAddress] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [setupExpanded, setSetupExpanded] = useState(true);
  
  const [memoryFragments, setMemoryFragments] = useState<MemoryFragmentInput[]>([]);
  const [showFragments, setShowFragments] = useState(false);
  const [newFragmentText, setNewFragmentText] = useState('');
  const [newFragmentConfidence, setNewFragmentConfidence] = useState(0.5);
  const [newFragmentEpoch, setNewFragmentEpoch] = useState<'certain' | 'likely' | 'possible' | 'speculative'>('possible');
  const [newFragmentNotes, setNewFragmentNotes] = useState('');
  
  const [sortField, setSortField] = useState<SortField>('score');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: targetAddresses = [] } = useQuery<TargetAddress[]>({
    queryKey: QUERY_KEYS.targetAddresses.list(),
  });

  const { data: session, refetch: refetchSession } = useQuery<UnifiedRecoverySession>({
    queryKey: QUERY_KEYS.unifiedRecovery.session(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: activeSessionId ? 1000 : false,
  });

  useEffect(() => {
    if (session?.startedAt && ['running', 'analyzing', 'learning'].includes(session.status)) {
      const startTime = new Date(session.startedAt).getTime();
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.startedAt, session?.status]);

  useEffect(() => {
    if (session && !['running', 'analyzing', 'learning'].includes(session.status)) {
      setSetupExpanded(true);
    } else if (session) {
      setSetupExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  const startMutation = useMutation({
    mutationFn: async ({ address, fragments }: { address: string; fragments: MemoryFragmentInput[] }) => {
      return api.unifiedRecovery.createSession({ 
        targetAddress: address,
        vectors: fragments.map(f => f.text),
      });
    },
    onSuccess: (data) => {
      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }
      setElapsedTime(0);
      toast({ title: 'Recovery initiated', description: 'Ocean Agent is analyzing the target...' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to start', description: error.message, variant: 'destructive' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return api.unifiedRecovery.stopSession(sessionId);
    },
    onSuccess: () => {
      toast({ title: 'Recovery stopped' });
      refetchSession();
    },
  });

  const addFragment = () => {
    if (!newFragmentText.trim()) return;
    const fragment: MemoryFragmentInput = {
      id: `frag-${Date.now()}`,
      text: newFragmentText.trim(),
      confidence: newFragmentConfidence,
      epoch: newFragmentEpoch,
      notes: newFragmentNotes.trim() || undefined,
    };
    setMemoryFragments([...memoryFragments, fragment]);
    setNewFragmentText('');
    setNewFragmentNotes('');
    toast({ title: 'Fragment added' });
  };

  const removeFragment = (id: string) => {
    setMemoryFragments(memoryFragments.filter(f => f.id !== id));
  };

  const handleStart = () => {
    const address = selectedAddress === 'custom' ? customAddress : selectedAddress;
    if (!address) {
      toast({ title: 'Select a target address', variant: 'destructive' });
      return;
    }
    startMutation.mutate({ address, fragments: memoryFragments });
  };

  const handleStop = () => {
    if (activeSessionId) {
      stopMutation.mutate(activeSessionId);
    }
  };

  const isRunning = session?.status === 'running' || session?.status === 'analyzing' || session?.status === 'learning';
  const isLearning = session?.status === 'learning';

  const sortedCandidates = useMemo(() => {
    if (!session?.candidates) return [];
    let filtered = [...session.candidates];
    
    if (filterStatus === 'verified') {
      filtered = filtered.filter(c => c.verified === true);
    } else if (filterStatus === 'near-miss') {
      filtered = filtered.filter(c => c.qigScore.phi > 0.8 && !c.verified);
    } else if (filterStatus === 'tested') {
      filtered = filtered.filter(c => !c.falsePositive);
    }
    
    return filtered.sort((a, b) => {
      switch (sortField) {
        case 'phi': return b.qigScore.phi - a.qigScore.phi;
        case 'verified': return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
        default: return b.combinedScore - a.combinedScore;
      }
    });
  }, [session?.candidates, sortField, filterStatus]);

  const detectedEra = session?.agentState?.detectedEra || session?.blockchainAnalysis?.era || 'unknown';

  return (
    <div className="h-full flex flex-col">
      {session && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <StatusPulse status={session.status} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Recovery Session</h2>
                  <Badge variant="outline" className="font-mono text-xs">
                    {session.id.slice(0, 8)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-3 h-3" />
                  <span className="font-mono">{session.targetAddress.slice(0, 12)}...{session.targetAddress.slice(-8)}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(session.targetAddress);
                          toast({ title: 'Address copied' });
                        }}
                        data-testid="button-copy-target-address"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy full address</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-2xl font-bold font-mono">{formatDuration(elapsedTime)}</div>
                <div className="text-xs text-muted-foreground">Runtime</div>
              </div>
              
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Button 
                    onClick={handleStop}
                    variant="destructive"
                    disabled={stopMutation.isPending}
                    className="gap-2"
                    data-testid="button-stop-recovery"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setSetupExpanded(true)}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-new-session"
                  >
                    <Play className="w-4 h-4" />
                    New Session
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <Collapsible open={setupExpanded || !session} onOpenChange={setSetupExpanded}>
            <Card className={session ? 'border-dashed' : ''}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Recovery Command Center</CardTitle>
                        <CardDescription>
                          {session ? 'Session configuration' : 'Enter target address to begin autonomous recovery'}
                        </CardDescription>
                      </div>
                    </div>
                    {session && (
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${setupExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select 
                      value={selectedAddress} 
                      onValueChange={setSelectedAddress}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="flex-1" data-testid="select-target-address">
                        <SelectValue placeholder="Select target address" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetAddresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.address}>
                            <div className="flex items-center gap-2">
                              <span>{addr.label || 'Unnamed'}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {addr.address.slice(0, 12)}...
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Enter custom address...</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {!isRunning && (
                      <Button 
                        onClick={handleStart}
                        disabled={startMutation.isPending}
                        className="gap-2"
                        data-testid="button-start-recovery"
                      >
                        {startMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Start Recovery
                      </Button>
                    )}
                  </div>

                  {selectedAddress === 'custom' && (
                    <Input
                      placeholder="Enter Bitcoin address (e.g., 15BKW...)"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      disabled={isRunning}
                      className="font-mono"
                      data-testid="input-custom-address"
                    />
                  )}

                  <Collapsible open={showFragments} onOpenChange={setShowFragments}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between gap-2 h-auto py-3"
                        disabled={isRunning}
                        data-testid="button-toggle-fragments"
                      >
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span>Memory Fragments</span>
                          <span className="text-xs text-muted-foreground">(Optional)</span>
                          {memoryFragments.length > 0 && (
                            <Badge variant="secondary">{memoryFragments.length}</Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFragments ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                        Add any password hints or patterns you remember. Ocean will prioritize these but runs fully autonomously without them.
                      </div>
                      
                      {memoryFragments.length > 0 && (
                        <div className="space-y-2">
                          {memoryFragments.map((fragment) => (
                            <div key={fragment.id} className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm">"{fragment.text}"</span>
                                  <Badge variant="outline" className="text-[10px]">{EPOCH_LABELS[fragment.epoch]?.label}</Badge>
                                  <Badge variant="secondary" className="text-[10px]">{(fragment.confidence * 100).toFixed(0)}%</Badge>
                                </div>
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => removeFragment(fragment.id)} className="h-7 w-7" data-testid={`button-remove-fragment-${fragment.id}`}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3 p-4 rounded-lg border bg-card">
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., whitetiger77, garyocean..."
                            value={newFragmentText}
                            onChange={(e) => setNewFragmentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addFragment()}
                            className="font-mono"
                            data-testid="input-new-fragment"
                          />
                          <Button size="icon" onClick={addFragment} disabled={!newFragmentText.trim()} data-testid="button-add-fragment">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Confidence</span>
                              <span>{(newFragmentConfidence * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                              value={[newFragmentConfidence]}
                              onValueChange={(v) => setNewFragmentConfidence(v[0])}
                              min={0} max={1} step={0.05}
                              data-testid="slider-fragment-confidence"
                            />
                          </div>
                          <Select value={newFragmentEpoch} onValueChange={(v) => setNewFragmentEpoch(v as typeof newFragmentEpoch)}>
                            <SelectTrigger className="w-[140px]" data-testid="select-fragment-epoch">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(EPOCH_LABELS).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {session && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  label="Tested" 
                  value={session.totalTested.toLocaleString()} 
                  icon={Activity}
                  testId="stat-total-tested"
                />
                <StatCard 
                  label="Rate" 
                  value={session.testRate.toFixed(0)} 
                  subValue="/sec"
                  icon={Gauge}
                  testId="stat-test-rate"
                />
                <StatCard 
                  label="Candidates" 
                  value={session.candidates.length}
                  highlight={session.candidates.length > 0}
                  icon={TrendingUp}
                  testId="stat-candidates"
                />
                <StatCard 
                  label="Era" 
                  value={ERA_LABELS[detectedEra] || detectedEra}
                  icon={Clock}
                  testId="stat-era"
                />
              </div>

              {session.blockchainAnalysis && (
                <Card className="bg-muted/20 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="font-mono font-medium">{session.blockchainAnalysis.balance.toLocaleString()} sats</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Transactions:</span>
                        <span className="font-mono font-medium">{session.blockchainAnalysis.txCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-mono font-medium">
                          {Object.entries(session.blockchainAnalysis.likelyFormat)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 1)
                            .map(([k]) => k)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Radio className="w-4 h-4" />
                        Live Operations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {session.strategies
                        .filter(s => Object.keys(STRATEGY_CONFIG).includes(s.type))
                        .map((strategy) => (
                          <StrategyRow key={strategy.id} strategy={strategy} />
                        ))}
                    </CardContent>
                  </Card>
                  
                  {isLearning && (
                    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Waves className="w-4 h-4 text-purple-500" />
                          Ocean Agent
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <OceanAgentPanel session={session} />
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Recovery Candidates
                          {sortedCandidates.length > 0 && (
                            <Badge variant="secondary">{sortedCandidates.length}</Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                            <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="select-filter-status">
                              <Filter className="w-3 h-3 mr-1" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="near-miss">Near Miss</SelectItem>
                              <SelectItem value="tested">Tested</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                            <SelectTrigger className="w-[100px] h-8 text-xs" data-testid="select-sort-field">
                              <ArrowUpDown className="w-3 h-3 mr-1" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="score">Score</SelectItem>
                              <SelectItem value="phi">Phi (Φ)</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3 pr-4">
                          {sortedCandidates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <Search className="w-10 h-10 text-muted-foreground/30 mb-4" />
                              <div className="text-muted-foreground">
                                {isRunning ? 'Searching for candidates...' : 'No candidates found yet'}
                              </div>
                              {isRunning && (
                                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Ocean Agent is analyzing patterns
                                </div>
                              )}
                            </div>
                          ) : (
                            sortedCandidates.slice(0, 30).map((candidate, idx) => (
                              <CandidateRow 
                                key={candidate.id} 
                                candidate={candidate} 
                                rank={idx + 1}
                                expanded={expandedCandidate === candidate.id}
                                onToggle={() => setExpandedCandidate(
                                  expandedCandidate === candidate.id ? null : candidate.id
                                )}
                              />
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {session.matchFound && session.matchedPhrase && (
                <Card className="border-2 border-green-500 bg-green-500/10">
                  <CardContent className="py-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 rounded-full bg-green-500/20">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-green-500 mb-1">Recovery Successful!</h2>
                        <p className="text-muted-foreground">The passphrase has been found</p>
                      </div>
                      <div className="w-full max-w-xl">
                        <div className="font-mono text-lg p-6 bg-background rounded-xl border-2 border-green-500/30">
                          {session.matchedPhrase}
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(session.matchedPhrase!);
                          toast({ title: 'Copied to clipboard' });
                        }}
                        className="gap-2 bg-green-500 hover:bg-green-600"
                        data-testid="button-copy-passphrase"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Passphrase
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {session.learnings && !isRunning && (
                <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      Ocean Agent Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-background/50">
                        <div className="text-[10px] uppercase text-muted-foreground">Iterations</div>
                        <div className="text-xl font-bold font-mono">{session.learnings.iterations}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50">
                        <div className="text-[10px] uppercase text-muted-foreground">Tested</div>
                        <div className="text-xl font-bold font-mono">{session.learnings.totalTested?.toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50">
                        <div className="text-[10px] uppercase text-muted-foreground">Near Misses</div>
                        <div className="text-xl font-bold font-mono text-amber-500">{session.learnings.nearMissesFound}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50">
                        <div className="text-[10px] uppercase text-muted-foreground">Avg Φ</div>
                        <div className="text-xl font-bold font-mono">{session.learnings.averagePhi?.toFixed(2) || '—'}</div>
                      </div>
                    </div>
                    
                    {session.learnings.topPatterns?.length > 0 && (
                      <div className="text-sm p-3 rounded-lg bg-background/30">
                        <span className="text-muted-foreground">Key patterns discovered: </span>
                        <span className="font-mono">
                          {session.learnings.topPatterns.slice(0, 5).map(([word, count]: [string, number]) => `${word}(${count})`).join(', ')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
