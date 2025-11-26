import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Database,
  Info
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedRecoverySession, RecoveryCandidate, StrategyRun, TargetAddress } from '@shared/schema';

const STRATEGY_LABELS: Record<string, { label: string; icon: typeof Brain; description: string }> = {
  era_patterns: { label: 'Era Patterns', icon: Clock, description: '2009 cypherpunk phrases' },
  brain_wallet_dict: { label: 'Brain Wallet Dict', icon: Brain, description: 'Known brain wallets' },
  bitcoin_terms: { label: 'Bitcoin Terms', icon: Hash, description: 'Crypto terminology' },
  linguistic: { label: 'Linguistic', icon: Search, description: 'Human-like phrases' },
  qig_basin_search: { label: 'QIG Basin', icon: Zap, description: 'Geometric search' },
  historical_autonomous: { label: 'Historical Mining', icon: Database, description: 'Auto-mined patterns' },
  cross_format: { label: 'Cross-Format', icon: Target, description: 'Multi-format testing' },
};

const ACTIVE_STRATEGIES = [
  'era_patterns', 
  'brain_wallet_dict', 
  'bitcoin_terms', 
  'linguistic', 
  'qig_basin_search',
  'historical_autonomous',
  'cross_format',
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
  const [showEvidence, setShowEvidence] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const hasEvidence = candidate.evidenceChain && candidate.evidenceChain.length > 0;

  return (
    <Card className={candidate.match ? 'border-green-500 bg-green-500/10' : ''}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">#{rank}</Badge>
              <Badge variant={candidate.match ? 'default' : 'secondary'} className="text-xs">
                {candidate.format}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {STRATEGY_LABELS[candidate.source]?.label || candidate.source}
              </Badge>
              {candidate.match && (
                <Badge className="bg-green-500 text-xs">MATCH!</Badge>
              )}
              {hasEvidence && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={() => setShowEvidence(!showEvidence)}
                  data-testid={`button-show-evidence-${rank}`}
                >
                  <Info className="w-3 h-3 mr-1" />
                  Why?
                </Button>
              )}
            </div>
            <div 
              className="font-mono text-sm mt-1 truncate cursor-pointer hover:text-primary"
              onClick={() => copyToClipboard(candidate.phrase)}
              data-testid={`text-candidate-phrase-${rank}`}
            >
              "{candidate.phrase}"
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
              {candidate.address}
            </div>
            {candidate.derivationPath && (
              <div className="text-xs text-muted-foreground">
                Path: {candidate.derivationPath}
              </div>
            )}
            
            {showEvidence && hasEvidence && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                <div className="font-medium text-muted-foreground">Evidence Chain:</div>
                {candidate.evidenceChain!.map((ev, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-primary">→</span>
                    <div>
                      <span className="font-medium">{ev.source}</span>
                      <span className="text-muted-foreground"> ({ev.type})</span>
                      <div className="text-muted-foreground">{ev.reasoning}</div>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {(ev.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs">
              <span className="text-muted-foreground">Score: </span>
              <span className="font-medium">{candidate.combinedScore.toFixed(2)}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Φ: </span>
              <span>{candidate.qigScore.phi.toFixed(2)}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">κ: </span>
              <span>{candidate.qigScore.kappa.toFixed(1)}</span>
            </div>
            <Badge variant="outline" className="text-xs mt-1">
              {candidate.qigScore.regime}
            </Badge>
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

  const { data: targetAddresses = [] } = useQuery<TargetAddress[]>({
    queryKey: ['/api/target-addresses'],
  });

  const { data: session, refetch: refetchSession } = useQuery<UnifiedRecoverySession>({
    queryKey: ['/api/unified-recovery/sessions', activeSessionId],
    enabled: !!activeSessionId,
    refetchInterval: activeSessionId ? 1000 : false,
  });

  const startMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await apiRequest('POST', '/api/unified-recovery/sessions', { 
        targetAddress: address 
      });
      return response.json();
    },
    onSuccess: (data: UnifiedRecoverySession) => {
      setActiveSessionId(data.id);
      toast({ title: 'Recovery started', description: `Session ${data.id} created` });
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

  const handleStart = () => {
    const address = selectedAddress === 'custom' ? customAddress : selectedAddress;
    if (!address) {
      toast({ title: 'Please select or enter an address', variant: 'destructive' });
      return;
    }
    startMutation.mutate(address);
  };

  const handleStop = () => {
    if (activeSessionId) {
      stopMutation.mutate(activeSessionId);
    }
  };

  const isRunning = session?.status === 'running' || session?.status === 'analyzing';
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
                  <div className="text-2xl font-bold">
                    {session.blockchainAnalysis?.era || 'unknown'}
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
