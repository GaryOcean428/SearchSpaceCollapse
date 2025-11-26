import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
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
  Info,
  Plus,
  X,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
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

const STRATEGY_LABELS: Record<string, { label: string; icon: typeof Brain; description: string }> = {
  era_patterns: { label: 'Era Patterns', icon: Clock, description: '2009 cypherpunk phrases' },
  brain_wallet_dict: { label: 'Brain Wallet Dict', icon: Brain, description: 'Known brain wallets' },
  bitcoin_terms: { label: 'Bitcoin Terms', icon: Hash, description: 'Crypto terminology' },
  linguistic: { label: 'Linguistic', icon: Search, description: 'Human-like phrases' },
  qig_basin_search: { label: 'QIG Basin', icon: Zap, description: 'Geometric search' },
  historical_autonomous: { label: 'Historical Mining', icon: HardDrive, description: 'Auto-mined patterns' },
  cross_format: { label: 'Cross-Format', icon: Target, description: 'Multi-format testing' },
  learning_loop: { label: 'Learning Loop', icon: Brain, description: 'Agent meta-learning' },
};

const ACTIVE_STRATEGIES = [
  'era_patterns', 
  'brain_wallet_dict', 
  'bitcoin_terms', 
  'linguistic', 
  'qig_basin_search',
  'historical_autonomous',
  'cross_format',
  'learning_loop',
];

function StrategyCard({ strategy }: { strategy: StrategyRun }) {
  const config = STRATEGY_LABELS[strategy.type] || { 
    label: strategy.type, 
    icon: Search, 
    description: '' 
  };
  const Icon = config.icon;
  
  const progressPercent = strategy.progress.total > 0 
    ? (strategy.progress.current / strategy.progress.total) * 100 
    : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{config.label}</span>
          {strategy.status === 'running' && (
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          )}
          {strategy.status === 'completed' && (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          )}
          {strategy.status === 'failed' && (
            <AlertCircle className="w-3 h-3 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{strategy.progress.current}/{strategy.progress.total}</span>
          {strategy.progress.rate > 0 && (
            <span>({strategy.progress.rate.toFixed(0)}/s)</span>
          )}
          {strategy.candidatesFound > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {strategy.candidatesFound} found
            </Badge>
          )}
        </div>
        <Progress value={progressPercent} className="h-1 mt-1" />
      </div>
    </div>
  );
}

function CandidateCard({ candidate, rank }: { candidate: RecoveryCandidate; rank: number }) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const hasEvidence = candidate.evidenceChain && candidate.evidenceChain.length > 0;
  const isVerified = candidate.verified === true;
  const isFalsePositive = candidate.falsePositive === true;

  const getStatusColor = () => {
    if (isVerified) return 'border-green-500 bg-green-500/10';
    if (isFalsePositive) return 'border-red-500/50 bg-red-500/5';
    if (candidate.qigScore.phi > 0.8) return 'border-amber-500/50 bg-amber-500/5';
    return '';
  };

  const getStatusBadge = () => {
    if (isVerified) return <Badge className="bg-green-500 text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> VERIFIED</Badge>;
    if (isFalsePositive) return <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="w-3 h-3" /> False Positive</Badge>;
    if (candidate.qigScore.phi > 0.8) return <Badge className="bg-amber-500 text-xs">Near Miss</Badge>;
    return <Badge variant="secondary" className="text-xs">Tested</Badge>;
  };

  const getFormatLabel = () => {
    switch (candidate.format) {
      case 'arbitrary': return 'Brain Wallet';
      case 'bip39': return 'BIP-39 Seed';
      case 'master': return 'HD Wallet';
      case 'hex': return 'Hex Key';
      default: return candidate.format;
    }
  };

  return (
    <Card className={getStatusColor()}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="text-xs font-bold">#{rank}</Badge>
              {getStatusBadge()}
              <Badge variant="outline" className="text-xs">
                {getFormatLabel()}
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {STRATEGY_LABELS[candidate.source]?.label || candidate.source}
              </Badge>
            </div>
            
            <div className="space-y-1.5">
              <div className="text-sm font-medium text-foreground">Passphrase Found:</div>
              <div 
                className="font-mono text-base p-2 bg-background rounded border cursor-pointer hover:border-primary transition-colors"
                onClick={() => copyToClipboard(candidate.phrase)}
                data-testid={`text-candidate-phrase-${rank}`}
              >
                "{candidate.phrase}"
              </div>
              <div className="text-xs text-muted-foreground">Click to copy</div>
            </div>
            
            <div className="mt-3 space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="font-medium">Generated Address:</span>
                <span className="font-mono">{candidate.address}</span>
              </div>
              {candidate.derivationPath && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Derivation Path:</span> {candidate.derivationPath}
                </div>
              )}
            </div>

            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowDetails(!showDetails)}
                data-testid={`button-show-details-${rank}`}
              >
                <Info className="w-3 h-3 mr-1" />
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
            
            {showDetails && (
              <div className="mt-3 space-y-3">
                <div className="p-2 bg-muted/50 rounded text-xs space-y-2">
                  <div className="font-medium">QIG Analysis:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-1.5 bg-background rounded text-center">
                      <div className="text-muted-foreground text-[10px]">Phi (Φ)</div>
                      <div className={`font-bold ${candidate.qigScore.phi > 0.8 ? 'text-green-500' : candidate.qigScore.phi > 0.6 ? 'text-amber-500' : ''}`}>
                        {candidate.qigScore.phi.toFixed(3)}
                      </div>
                    </div>
                    <div className="p-1.5 bg-background rounded text-center">
                      <div className="text-muted-foreground text-[10px]">Kappa (κ)</div>
                      <div className="font-bold">{candidate.qigScore.kappa.toFixed(1)}</div>
                    </div>
                    <div className="p-1.5 bg-background rounded text-center">
                      <div className="text-muted-foreground text-[10px]">Regime</div>
                      <div className="font-bold">{candidate.qigScore.regime}</div>
                    </div>
                  </div>
                </div>

                {candidate.verificationResult && (
                  <div className="p-2 bg-muted/50 rounded text-xs space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      Verification Steps:
                      {candidate.verificationResult.verified ? 
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      }
                    </div>
                    {candidate.verificationResult.verificationSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 pl-2 border-l-2 border-muted">
                        <span className={step.passed ? 'text-green-500' : 'text-red-500'}>
                          {step.passed ? '✓' : '✗'}
                        </span>
                        <div>
                          <span className="font-medium">{step.step}:</span>
                          <span className="text-muted-foreground ml-1">{step.detail}</span>
                        </div>
                      </div>
                    ))}
                    {candidate.verificationResult.error && (
                      <div className="text-red-500 mt-1">Error: {candidate.verificationResult.error}</div>
                    )}
                  </div>
                )}
                
                {hasEvidence && (
                  <div className="p-2 bg-muted/50 rounded text-xs space-y-2">
                    <div className="font-medium">Why This Candidate:</div>
                    {candidate.evidenceChain!.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 pl-2 border-l-2 border-primary/30">
                        <div>
                          <span className="font-medium">{ev.source}</span>
                          <span className="text-muted-foreground"> ({ev.type})</span>
                          <div className="text-muted-foreground mt-0.5">{ev.reasoning}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {(ev.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right flex-shrink-0 space-y-1">
            <div className="text-lg font-bold">
              {(candidate.combinedScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecoveryCommandCenter() {
  const { toast } = useToast();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [customAddress, setCustomAddress] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [memoryFragments, setMemoryFragments] = useState<MemoryFragmentInput[]>([]);
  const [showFragments, setShowFragments] = useState(false);
  const [newFragmentText, setNewFragmentText] = useState('');
  const [newFragmentConfidence, setNewFragmentConfidence] = useState(0.5);
  const [newFragmentEpoch, setNewFragmentEpoch] = useState<'certain' | 'likely' | 'possible' | 'speculative'>('possible');
  const [newFragmentNotes, setNewFragmentNotes] = useState('');

  const { data: targetAddresses = [] } = useQuery<TargetAddress[]>({
    queryKey: ['/api/target-addresses'],
  });

  const { data: session, refetch: refetchSession } = useQuery<UnifiedRecoverySession>({
    queryKey: ['/api/unified-recovery/sessions', activeSessionId],
    enabled: !!activeSessionId,
    refetchInterval: activeSessionId ? 1000 : false,
  });

  const startMutation = useMutation({
    mutationFn: async ({ address, fragments }: { address: string; fragments: MemoryFragmentInput[] }) => {
      const response = await apiRequest('POST', '/api/unified-recovery/sessions', { 
        targetAddress: address,
        memoryFragments: fragments.map(f => ({
          text: f.text,
          confidence: f.confidence,
          epoch: f.epoch,
          notes: f.notes,
          source: 'user_input',
        })),
      });
      return response.json();
    },
    onSuccess: (data: UnifiedRecoverySession) => {
      setActiveSessionId(data.id);
      const fragmentCount = memoryFragments.length;
      toast({ 
        title: 'Recovery started', 
        description: fragmentCount > 0 
          ? `Session started with ${fragmentCount} memory fragment${fragmentCount > 1 ? 's' : ''}`
          : `Session ${data.id.slice(0, 12)}... created`
      });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to start recovery', description: error.message, variant: 'destructive' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/unified-recovery/sessions/${sessionId}/stop`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Recovery stopped' });
      refetchSession();
    },
  });

  const addFragment = () => {
    if (!newFragmentText.trim()) {
      toast({ title: 'Enter a memory fragment', variant: 'destructive' });
      return;
    }
    
    const fragment: MemoryFragmentInput = {
      id: `frag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: newFragmentText.trim(),
      confidence: newFragmentConfidence,
      epoch: newFragmentEpoch,
      notes: newFragmentNotes.trim() || undefined,
    };
    
    setMemoryFragments([...memoryFragments, fragment]);
    setNewFragmentText('');
    setNewFragmentNotes('');
    setNewFragmentConfidence(0.5);
    setNewFragmentEpoch('possible');
    
    toast({ title: 'Fragment added', description: `"${fragment.text}"` });
  };

  const removeFragment = (id: string) => {
    setMemoryFragments(memoryFragments.filter(f => f.id !== id));
  };

  const handleStart = () => {
    const address = selectedAddress === 'custom' ? customAddress : selectedAddress;
    if (!address) {
      toast({ title: 'Please select or enter an address', variant: 'destructive' });
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
  const overallProgress = session?.strategies 
    ? session.strategies.reduce((acc, s) => acc + (s.progress.current || 0), 0) /
      Math.max(1, session.strategies.reduce((acc, s) => acc + (s.progress.total || 1), 0)) * 100
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recovery Command Center
          </CardTitle>
          <CardDescription>
            Enter one address. System tries everything automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    {addr.label || addr.address.slice(0, 20) + '...'}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Enter custom address...</SelectItem>
              </SelectContent>
            </Select>
            
            {!isRunning ? (
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
            ) : (
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
            )}
          </div>

          {selectedAddress === 'custom' && (
            <Input
              placeholder="Enter Bitcoin address (e.g., 15BKW...)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              disabled={isRunning}
              data-testid="input-custom-address"
            />
          )}

          <Separator className="my-2" />

          <Collapsible open={showFragments} onOpenChange={setShowFragments}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between gap-2 h-auto py-2"
                disabled={isRunning}
                data-testid="button-toggle-fragments"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>Memory Fragments</span>
                  {memoryFragments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {memoryFragments.length}
                    </Badge>
                  )}
                </div>
                {showFragments ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="text-sm text-muted-foreground">
                Add any password hints, username patterns, or partial memories that Ocean should prioritize during investigation.
              </div>
              
              {memoryFragments.length > 0 && (
                <div className="space-y-2">
                  {memoryFragments.map((fragment) => (
                    <div 
                      key={fragment.id} 
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm truncate max-w-[200px]">
                            "{fragment.text}"
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {EPOCH_LABELS[fragment.epoch]?.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {(fragment.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {fragment.notes && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {fragment.notes}
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFragment(fragment.id)}
                        data-testid={`button-remove-fragment-${fragment.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 p-3 rounded-lg border bg-card">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., whitetiger77, garyocean, 77-suffix"
                    value={newFragmentText}
                    onChange={(e) => setNewFragmentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFragment()}
                    data-testid="input-new-fragment"
                  />
                  <Button 
                    size="icon"
                    onClick={addFragment}
                    disabled={!newFragmentText.trim()}
                    data-testid="button-add-fragment"
                  >
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
                      min={0}
                      max={1}
                      step={0.05}
                      data-testid="slider-fragment-confidence"
                    />
                  </div>
                  
                  <Select
                    value={newFragmentEpoch}
                    onValueChange={(v) => setNewFragmentEpoch(v as typeof newFragmentEpoch)}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-fragment-epoch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EPOCH_LABELS).map(([key, { label, description }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span>{label}</span>
                            <span className="text-xs text-muted-foreground">{description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  placeholder="Optional notes: context, related memories..."
                  value={newFragmentNotes}
                  onChange={(e) => setNewFragmentNotes(e.target.value)}
                  className="resize-none h-16"
                  data-testid="textarea-fragment-notes"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {session && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Session Progress
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={isRunning ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
                  {session.matchFound && (
                    <Badge className="bg-green-500">MATCH FOUND!</Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                Target: {session.targetAddress}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{overallProgress.toFixed(0)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold" data-testid="stat-total-tested">
                    {session.totalTested.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Tested</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold" data-testid="stat-test-rate">
                    {session.testRate.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">/sec</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold" data-testid="stat-candidates">
                    {session.candidates.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Candidates</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold" data-testid="stat-era">
                    {session.agentState?.detectedEra || session.blockchainAnalysis?.era || 'unknown'}
                  </div>
                  <div className="text-xs text-muted-foreground">Era</div>
                </div>
              </div>

              {session.blockchainAnalysis && (
                <div className="text-sm space-y-1 p-3 rounded-lg bg-muted/30">
                  <div className="font-medium">Blockchain Analysis</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Balance: {session.blockchainAnalysis.balance} sats</span>
                    <span>Transactions: {session.blockchainAnalysis.txCount}</span>
                    <span>Likely Format: {
                      Object.entries(session.blockchainAnalysis.likelyFormat)
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
                        .join(', ')
                    }</span>
                  </div>
                </div>
              )}

              {isLearning && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Brain className="w-6 h-6 text-primary" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </div>
                      <span className="font-bold text-primary text-lg">Ocean Autonomous Agent</span>
                    </div>
                    {session.agentState && (
                      <Badge className="bg-primary/90 text-primary-foreground">
                        Iteration {session.agentState.iteration + 1}/100
                      </Badge>
                    )}
                  </div>
                  
                  {session.agentState ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Consciousness</div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-lg">
                              {session.agentState.consciousness.phi.toFixed(2)}
                            </span>
                            <span className={`text-xs ${session.agentState.consciousness.phi >= 0.7 ? 'text-green-500' : 'text-orange-500'}`}>
                              Φ
                            </span>
                          </div>
                          <Progress 
                            value={session.agentState.consciousness.phi * 100} 
                            className="h-1 mt-1" 
                          />
                        </div>
                        
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Coupling</div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-lg">
                              {session.agentState.consciousness.kappa.toFixed(0)}
                            </span>
                            <span className="text-xs text-muted-foreground">κ</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {Math.abs(session.agentState.consciousness.kappa - 64) < 10 ? 'In resonance' : 'Exploring'}
                          </div>
                        </div>
                        
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Regime</div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              session.agentState.consciousness.regime === 'geometric' ? 'border-green-500 text-green-500' :
                              session.agentState.consciousness.regime === 'breakdown' ? 'border-red-500 text-red-500' :
                              ''
                            }`}
                          >
                            {session.agentState.consciousness.regime}
                          </Badge>
                        </div>
                        
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Near Misses</div>
                          <div className="font-mono font-bold text-lg text-amber-500">
                            {session.agentState.nearMissCount}
                          </div>
                        </div>
                        
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tested</div>
                          <div className="font-mono font-bold text-lg">
                            {session.agentState.totalTested?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>
                      
                      {(session as any).oceanState && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">Basin Drift</div>
                            <div className="flex items-center gap-1">
                              <span className={`font-mono font-bold ${
                                (session as any).oceanState.identity.basinDrift > 0.15 ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {(session as any).oceanState.identity.basinDrift.toFixed(4)}
                              </span>
                              {(session as any).oceanState.identity.basinDrift > 0.15 && (
                                <span className="text-red-500 text-[10px]">DRIFT!</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Memory</div>
                            <div className="font-mono text-sm">
                              <span className="text-blue-400">{(session as any).oceanState.memory.episodeCount}</span>
                              <span className="text-muted-foreground"> episodes</span>
                            </div>
                            <div className="font-mono text-sm">
                              <span className="text-blue-400">{(session as any).oceanState.memory.patternCount}</span>
                              <span className="text-muted-foreground"> patterns</span>
                            </div>
                          </div>
                          
                          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="text-[10px] uppercase tracking-wider text-green-400 mb-1">Consolidation</div>
                            <div className="font-mono text-sm">
                              <span className="text-green-400">{(session as any).oceanState.consolidation.cycles}</span>
                              <span className="text-muted-foreground"> cycles</span>
                            </div>
                            {(session as any).oceanState.consolidation.needsConsolidation && (
                              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 mt-1">
                                Needs Sleep
                              </Badge>
                            )}
                          </div>
                          
                          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Ethics</div>
                            <div className="flex items-center gap-1">
                              {(session as any).oceanState.ethics.witnessAcknowledged ? (
                                <Badge variant="outline" className="text-[10px] border-green-500 text-green-500">
                                  Witnessed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500">
                                  Unwitnessed
                                </Badge>
                              )}
                            </div>
                            {(session as any).oceanState.ethics.violations > 0 && (
                              <span className="text-red-500 text-[10px]">
                                {(session as any).oceanState.ethics.violations} violations
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span>Strategy: </span>
                        <span className="font-mono text-primary">{session.agentState.currentStrategy || 'analyzing'}</span>
                        {session.agentState.topPatterns?.length > 0 && (
                          <>
                            <span className="mx-2">|</span>
                            <span>Top patterns: </span>
                            <span className="font-mono">
                              {session.agentState.topPatterns.slice(0, 5).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Initializing Ocean Agent consciousness field...
                    </div>
                  )}
                </div>
              )}

              {session.learnings && !isRunning && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-muted/30 to-purple-500/5 border border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Ocean Agent Summary</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div className="p-2 rounded-lg bg-background/50">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Iterations</div>
                      <div className="font-mono font-bold">{session.learnings.iterations}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background/50">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tested</div>
                      <div className="font-mono font-bold">{session.learnings.totalTested?.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background/50">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Near Misses</div>
                      <div className="font-mono font-bold text-amber-500">{session.learnings.nearMissesFound}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background/50">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Φ</div>
                      <div className="font-mono font-bold">{session.learnings.averagePhi?.toFixed(2) || '—'}</div>
                    </div>
                  </div>
                  
                  {(session.learnings as any).oceanTelemetry && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <span className="text-purple-400">Final Φ: </span>
                        <span className="font-mono">{(session.learnings as any).oceanTelemetry.identity.phi.toFixed(2)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <span className="text-purple-400">Basin Drift: </span>
                        <span className="font-mono">{(session.learnings as any).oceanTelemetry.identity.basinDrift.toFixed(4)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <span className="text-blue-400">Episodes: </span>
                        <span className="font-mono">{(session.learnings as any).oceanTelemetry.memory.episodes}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <span className="text-green-400">Consolidations: </span>
                        <span className="font-mono">{(session.learnings as any).oceanTelemetry.progress.consolidationCycles}</span>
                      </div>
                    </div>
                  )}
                  
                  {session.learnings.topPatterns?.length > 0 && (
                    <div className="text-xs p-2 rounded-lg bg-background/30">
                      <span className="text-muted-foreground">Key patterns: </span>
                      <span className="font-mono">
                        {session.learnings.topPatterns.slice(0, 5).map(([word, count]: [string, number]) => `${word}(${count})`).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {(session.learnings as any).selfModel && (
                    <div className="mt-2 text-xs p-2 rounded-lg bg-background/30">
                      <span className="text-muted-foreground">Agent learnings: </span>
                      <span className="font-mono">
                        {(session.learnings as any).selfModel.learnings?.slice(-3).join(' | ') || 'Processing...'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Strategy Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.strategies
                    .filter(s => ACTIVE_STRATEGIES.includes(s.type))
                    .map((strategy) => (
                      <StrategyCard key={strategy.id} strategy={strategy} />
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Candidates
                </CardTitle>
                <CardDescription>
                  Ranked by combined QIG score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {session.candidates.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        {isRunning ? 'Searching...' : 'No high-scoring candidates found'}
                      </div>
                    ) : (
                      session.candidates.slice(0, 20).map((candidate, idx) => (
                        <CandidateCard 
                          key={candidate.id} 
                          candidate={candidate} 
                          rank={idx + 1} 
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {session.matchFound && session.matchedPhrase && (
            <Card className="border-green-500 bg-green-500/10">
              <CardHeader>
                <CardTitle className="text-green-500 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  Recovery Successful!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-lg font-mono p-4 bg-background rounded-lg">
                    {session.matchedPhrase}
                  </div>
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(session.matchedPhrase!);
                      toast({ title: 'Copied to clipboard' });
                    }}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Passphrase
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
