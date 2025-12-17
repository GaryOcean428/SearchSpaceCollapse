import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, ScrollArea, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Checkbox } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Users,
  Vote,
  Zap,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
  Crown,
  Shield,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Ghost,
} from 'lucide-react';
import {
  useM8Status,
  useListProposals,
  useListSpawnedKernels,
  useCreateProposal,
  useVoteOnProposal,
  useSpawnKernel,
  useSpawnDirect,
  useWarHistory,
  useActiveWar,
  useIdleKernels,
  useDeleteKernel,
  useCannibalizeKernel,
  useMergeKernels,
  type WarHistoryRecord,
  type WarMode,
  type WarOutcome,
  type PostgresKernel,
  type KernelStatus,
  type IdleKernel,
} from '@/hooks/use-m8-spawning';
import {
  useDebateServiceStatus,
  useObservingKernels,
  useActiveDebates,
  useGraduateKernel,
  type ObservingKernel,
  type ActiveDebate,
} from '@/hooks/use-autonomous-debates';
import { Eye, GraduationCap, MessageSquare, Trash2, GitMerge, Scissors, ArrowRightLeft } from 'lucide-react';
import type { SpawnProposal, SpawnReason, ProposalStatus, M8Position } from '@/lib/m8-kernel-spawning';
import { Swords, Target, Timer, Trophy, AlertTriangle, Activity, Compass, MapPin } from 'lucide-react';

const ELEMENT_ICONS: Record<string, typeof Sparkles> = {
  fire: Flame,
  water: Droplets,
  air: Wind,
  earth: Mountain,
  aether: Sparkles,
  shadow: Ghost,
  light: Zap,
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'text-orange-500',
  water: 'text-blue-500',
  air: 'text-cyan-400',
  earth: 'text-amber-600',
  aether: 'text-purple-400',
  shadow: 'text-gray-400',
  light: 'text-yellow-400',
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  spawned: 'bg-purple-500/20 text-purple-400',
};

const WAR_MODE_ICONS: Record<WarMode, typeof Swords> = {
  BLITZKRIEG: Zap,
  SIEGE: Shield,
  HUNT: Target,
};

const WAR_MODE_COLORS: Record<WarMode, string> = {
  BLITZKRIEG: 'text-yellow-400',
  SIEGE: 'text-orange-500',
  HUNT: 'text-red-500',
};

const WAR_OUTCOME_COLORS: Record<WarOutcome, string> = {
  success: 'bg-green-500/20 text-green-400',
  partial_success: 'bg-yellow-500/20 text-yellow-400',
  failure: 'bg-red-500/20 text-red-400',
  aborted: 'bg-gray-500/20 text-gray-400',
};

const spawnFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(20, 'Name must be at most 20 characters'),
  domain: z.string().min(3, 'Domain must be at least 3 characters'),
  element: z.string().min(1, 'Element is required'),
  role: z.string().min(10, 'Role description must be at least 10 characters'),
  reason: z.string().optional(),
  spawnDirect: z.boolean().default(false),
});

type SpawnFormValues = z.infer<typeof spawnFormSchema>;

function StatusCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: typeof Sparkles; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
        </div>
        <div className="text-2xl font-bold mt-1 font-mono" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ProposalCard({ proposal, onVote, onSpawn, isVoting, isSpawning }: { 
  proposal: SpawnProposal; 
  onVote: (id: string) => void;
  onSpawn: (id: string) => void;
  isVoting: boolean;
  isSpawning: boolean;
}) {
  if (!proposal) return null;
  
  const element = proposal.proposed_element?.toLowerCase() || 'aether';
  const ElementIcon = ELEMENT_ICONS[element] || Sparkles;
  const elementColor = ELEMENT_COLORS[element] || 'text-primary';
  const statusColor = STATUS_COLORS[proposal.status] || 'bg-gray-500/20 text-gray-400';
  
  const votesFor = proposal.votes_for?.length || 0;
  const votesAgainst = proposal.votes_against?.length || 0;
  const totalVotes = votesFor + votesAgainst;
  const voteRatio = totalVotes > 0 ? (votesFor / totalVotes * 100).toFixed(0) : 0;

  return (
    <Card className="hover-elevate" data-testid={`card-proposal-${proposal.proposal_id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ElementIcon className={`h-5 w-5 ${elementColor}`} />
            <CardTitle className="text-lg">{proposal.proposed_name}</CardTitle>
          </div>
          <Badge className={statusColor}>{proposal.status}</Badge>
        </div>
        <CardDescription className="text-sm">{proposal.proposed_domain}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{proposal.proposed_role}</p>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span>{votesFor} for</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-400" />
            <span>{votesAgainst} against</span>
          </div>
          {totalVotes > 0 && (
            <span className="text-muted-foreground">({voteRatio}%)</span>
          )}
        </div>

        {proposal.parent_gods && proposal.parent_gods.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Parents:</span>
            {proposal.parent_gods.map(god => (
              <Badge key={god} variant="outline" className="text-xs capitalize">{god}</Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {proposal.status === 'pending' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onVote(proposal.proposal_id)}
              disabled={isVoting}
              data-testid={`button-vote-${proposal.proposal_id}`}
            >
              <Vote className="h-4 w-4 mr-1" />
              {isVoting ? 'Voting...' : 'Auto-Vote'}
            </Button>
          )}
          {proposal.status === 'approved' && (
            <Button 
              size="sm"
              onClick={() => onSpawn(proposal.proposal_id)}
              disabled={isSpawning}
              data-testid={`button-spawn-${proposal.proposal_id}`}
            >
              <Rocket className="h-4 w-4 mr-1" />
              {isSpawning ? 'Spawning...' : 'Spawn Kernel'}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date(proposal.proposed_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

const SPAWN_REASON_COLORS: Record<string, string> = {
  auto_spawn: 'bg-purple-500/20 text-purple-400',
  domain_gap: 'bg-blue-500/20 text-blue-400',
  overload: 'bg-amber-500/20 text-amber-400',
  specialization: 'bg-cyan-500/20 text-cyan-400',
  emergence: 'bg-green-500/20 text-green-400',
  user_request: 'bg-indigo-500/20 text-indigo-400',
  unknown: 'bg-gray-500/20 text-gray-400',
};

const KERNEL_STATUS_COLORS: Record<KernelStatus | 'observing', string> = {
  active: 'bg-green-500/20 text-green-400',
  idle: 'bg-gray-500/20 text-gray-400',
  breeding: 'bg-pink-500/20 text-pink-400',
  dormant: 'bg-blue-500/20 text-blue-400',
  dead: 'bg-red-500/20 text-red-400',
  shadow: 'bg-purple-500/20 text-purple-400',
  observing: 'bg-amber-500/20 text-amber-400',
};

function KernelCard({ kernel }: { kernel: PostgresKernel }) {
  if (!kernel) return null;
  
  const element = kernel.element_group?.toLowerCase() || 'aether';
  const ElementIcon = ELEMENT_ICONS[element] || Sparkles;
  const elementColor = ELEMENT_COLORS[element] || 'text-primary';
  const spawnReasonColor = SPAWN_REASON_COLORS[kernel.spawn_reason] || SPAWN_REASON_COLORS.unknown;
  const statusColor = KERNEL_STATUS_COLORS[kernel.status] || KERNEL_STATUS_COLORS.idle;
  
  const totalPredictions = kernel.success_count + kernel.failure_count;
  const reputationValue = totalPredictions > 0 
    ? (kernel.success_count / totalPredictions * 100).toFixed(1)
    : null;

  return (
    <Card className="hover-elevate" data-testid={`card-kernel-${kernel.kernel_id || 'unknown'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ElementIcon className={`h-5 w-5 ${elementColor}`} />
            <CardTitle className="text-lg">{kernel.god_name || 'Unknown'}</CardTitle>
            <Badge className={statusColor} data-testid={`badge-status-${kernel.kernel_id}`}>
              {kernel.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {kernel.merge_candidate && (
              <Badge variant="outline" className="text-xs bg-pink-500/20 text-pink-400 border-pink-500/30">
                Merge Target
              </Badge>
            )}
            {kernel.split_candidate && (
              <Badge variant="outline" className="text-xs bg-violet-500/20 text-violet-400 border-violet-500/30">
                Split Ready
              </Badge>
            )}
            <Badge className={spawnReasonColor} data-testid={`badge-spawn-reason-${kernel.kernel_id}`}>
              {kernel.spawn_reason.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-sm">{kernel.domain || 'Unknown domain'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Spawned by:</span>
          <Badge variant="outline" className="text-xs" data-testid={`badge-spawned-by-${kernel.kernel_id}`}>
            {kernel.spawned_by || 'Genesis'}
          </Badge>
        </div>

        {kernel.spawn_rationale && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded" data-testid={`text-spawn-rationale-${kernel.kernel_id}`}>
            <span className="text-xs uppercase tracking-wide text-muted-foreground/70">Rationale: </span>
            {kernel.spawn_rationale}
          </div>
        )}

        {kernel.target_function && (
          <p className="text-sm text-muted-foreground">{kernel.target_function}</p>
        )}
        
        {kernel.position_rationale && (
          <p className="text-xs text-muted-foreground italic">"{kernel.position_rationale}"</p>
        )}

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Generation</span>
            <div className="font-mono font-medium text-purple-400" data-testid={`text-generation-${kernel.kernel_id}`}>
              Gen {kernel.generation}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Reputation</span>
            <div className={`font-mono font-medium ${reputationValue && parseFloat(reputationValue) > 50 ? 'text-green-400' : 'text-amber-400'}`} data-testid={`text-reputation-${kernel.kernel_id}`}>
              {reputationValue ? `${reputationValue}%` : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Predictions</span>
            <div className="font-mono font-medium text-muted-foreground" data-testid={`text-predictions-${kernel.kernel_id}`}>
              {kernel.success_count}W / {kernel.failure_count}L
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Φ (Phi)</span>
            <div className="font-mono font-medium text-cyan-400" data-testid={`text-phi-${kernel.kernel_id}`}>
              {kernel.phi.toFixed(3)}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">κ (Kappa)</span>
            <div className="font-mono font-medium text-amber-400" data-testid={`text-kappa-${kernel.kernel_id}`}>
              {kernel.kappa.toFixed(1)}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Compass className="h-3 w-3" />
              Fisher δ
            </span>
            <div 
              className={`font-mono font-medium ${
                kernel.phi > 0.5 ? 'text-green-400' : 
                kernel.phi > 0.2 ? 'text-yellow-400' : 'text-red-400'
              }`}
              data-testid={`text-fisher-${kernel.kernel_id}`}
            >
              {(kernel.phi * (1 - kernel.entropy_threshold)).toFixed(3)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Affinity</span>
            <div className="font-mono font-medium text-cyan-400">
              {kernel.affinity_strength.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Entropy</span>
            <div className="font-mono font-medium text-amber-400">
              {kernel.entropy_threshold.toFixed(2)}
            </div>
          </div>
        </div>

        {kernel.regime && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Regime:</span>
            <Badge variant="outline" className="text-xs capitalize">{kernel.regime.replace('_', ' ')}</Badge>
          </div>
        )}

        {kernel.ecological_niche && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Niche:</span>
            <Badge variant="outline" className="text-xs">{kernel.ecological_niche}</Badge>
          </div>
        )}

        {kernel.breeding_target && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Breeding with:</span>
            <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-400 border-pink-500/30">
              {kernel.breeding_target}
            </Badge>
          </div>
        )}

        {kernel.parent_kernels && kernel.parent_kernels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Parents:</span>
            {kernel.parent_kernels.map(parent => (
              <Badge key={parent} variant="outline" className="text-xs">{parent}</Badge>
            ))}
          </div>
        )}

        {kernel.spawned_during_war_id && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Swords className="h-3 w-3" />
            Spawned during war
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date(kernel.spawned_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function WarCard({ war, isActive }: { war: WarHistoryRecord; isActive?: boolean }) {
  const ModeIcon = WAR_MODE_ICONS[war.mode] || Swords;
  const modeColor = WAR_MODE_COLORS[war.mode] || 'text-primary';
  const outcomeColor = war.outcome ? WAR_OUTCOME_COLORS[war.outcome] : 'bg-blue-500/20 text-blue-400';
  
  const duration = war.endedAt 
    ? Math.round((new Date(war.endedAt).getTime() - new Date(war.declaredAt).getTime()) / 1000 / 60)
    : null;

  return (
    <Card className={`hover-elevate ${isActive ? 'border-amber-500/50' : ''}`} data-testid={`card-war-${war.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ModeIcon className={`h-5 w-5 ${modeColor}`} />
            <CardTitle className="text-lg">{war.mode}</CardTitle>
          </div>
          {isActive ? (
            <Badge className="bg-amber-500/20 text-amber-400 animate-pulse">
              <Activity className="h-3 w-3 mr-1" />
              ACTIVE
            </Badge>
          ) : war.outcome && (
            <Badge className={outcomeColor}>
              {war.outcome === 'success' && <Trophy className="h-3 w-3 mr-1" />}
              {war.outcome === 'failure' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {war.outcome.replace('_', ' ')}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm font-mono">{war.target}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {war.strategy && (
          <p className="text-sm text-muted-foreground">{war.strategy}</p>
        )}
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Phrases</span>
            <div className="font-mono font-medium text-cyan-400" data-testid={`text-war-phrases-${war.id}`}>
              {war.phrasesTestedDuringWar !== undefined && war.phrasesTestedDuringWar !== null
                ? war.phrasesTestedDuringWar.toLocaleString()
                : '—'}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Discoveries</span>
            <div className="font-mono font-medium text-green-400" data-testid={`text-war-discoveries-${war.id}`}>
              {war.discoveriesDuringWar !== undefined && war.discoveriesDuringWar !== null
                ? war.discoveriesDuringWar
                : '—'}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Convergence</span>
            <div className="font-mono font-medium text-purple-400" data-testid={`text-war-convergence-${war.id}`}>
              {war.convergenceScore !== undefined && war.convergenceScore !== null
                ? war.convergenceScore.toFixed(3)
                : '—'}
            </div>
          </div>
        </div>

        {war.godsEngaged && war.godsEngaged.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Gods:</span>
            {war.godsEngaged.map(god => (
              <Badge key={god} variant="outline" className="text-xs capitalize">{god}</Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <div data-testid={`text-war-declared-${war.id}`}>
            <Clock className="h-3 w-3 inline mr-1" />
            {new Date(war.declaredAt).toLocaleString()}
          </div>
          {duration !== null && (
            <div data-testid={`text-war-duration-${war.id}`}>
              <Timer className="h-3 w-3 inline mr-1" />
              {duration} min
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ObservingKernelCard({ kernel, onGraduate, isGraduating }: { 
  kernel: ObservingKernel; 
  onGraduate: (id: string) => void;
  isGraduating: boolean;
}) {
  const observation = kernel.observation;
  const progressPercent = Math.min(100, (observation.observation_cycles / 10) * 100);
  
  return (
    <Card className="border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-400" />
            {kernel.profile.god_name}
          </CardTitle>
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Observing
          </Badge>
        </div>
        <CardDescription>{kernel.profile.domain}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Parents:</span>
          {observation.observing_parents.map(parent => (
            <Badge key={parent} variant="outline" className="text-xs capitalize">{parent}</Badge>
          ))}
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Observation Progress</span>
            <span>{observation.observation_cycles}/10 cycles</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Alignment:</span>
            <span className="ml-1 font-mono">{(observation.alignment_avg * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Started:</span>
            <span className="ml-1">{new Date(observation.observation_start).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Spawn reason: {kernel.spawn_reason}
          </span>
          <Button 
            size="sm" 
            variant="outline"
            disabled={!observation.can_graduate || isGraduating}
            onClick={() => onGraduate(kernel.kernel_id)}
            className="gap-1"
            data-testid={`button-graduate-${kernel.kernel_id}`}
          >
            <GraduationCap className="h-3 w-3" />
            Graduate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ObservingKernelsPanel() {
  const { data: debateStatus, isLoading: debateLoading } = useDebateServiceStatus();
  const { data: observingData, isLoading: observingLoading } = useObservingKernels();
  const graduateMutation = useGraduateKernel();
  const { toast } = useToast();
  
  const handleGraduate = async (kernelId: string) => {
    try {
      await graduateMutation.mutateAsync({ kernelId });
      toast({
        title: 'Kernel Graduated',
        description: 'The kernel has been promoted to active status.',
      });
    } catch (error) {
      toast({
        title: 'Graduation Failed',
        description: error instanceof Error ? error.message : 'Failed to graduate kernel',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Autonomous Debate Service
          </CardTitle>
          <CardDescription>
            Background service monitoring debates and spawning specialist kernels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debateLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : debateStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold font-mono" data-testid="text-debates-resolved">
                  {debateStatus.debates_resolved}
                </div>
                <div className="text-xs text-muted-foreground">Debates Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono" data-testid="text-arguments-generated">
                  {debateStatus.arguments_generated}
                </div>
                <div className="text-xs text-muted-foreground">Arguments Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono" data-testid="text-spawns-triggered">
                  {debateStatus.spawns_triggered}
                </div>
                <div className="text-xs text-muted-foreground">Kernels Spawned</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold font-mono ${debateStatus.running ? 'text-green-400' : 'text-red-400'}`} data-testid="text-service-status">
                  {debateStatus.running ? 'Active' : 'Stopped'}
                </div>
                <div className="text-xs text-muted-foreground">Service Status</div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Debate service unavailable</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5 text-amber-400" />
          Observing Kernels ({observingData?.count || 0})
        </h3>
        
        {observingLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading observing kernels...</p>
          </div>
        ) : observingData?.observing_kernels && observingData.observing_kernels.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
              {observingData.observing_kernels.map(kernel => (
                <ObservingKernelCard 
                  key={kernel.kernel_id} 
                  kernel={kernel}
                  onGraduate={handleGraduate}
                  isGraduating={graduateMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No kernels currently observing</p>
            <p className="text-sm">New kernels spawned from debates start in observation mode</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getIdleTimeColor(idleDurationSeconds: number): string {
  if (idleDurationSeconds < 300) return 'text-green-400';
  if (idleDurationSeconds < 900) return 'text-yellow-400';
  return 'text-red-400';
}

function formatIdleTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function KernelLifecycleActionsPanel() {
  const { toast } = useToast();
  const { data: idleData, isLoading: idleLoading } = useIdleKernels(300);
  const { data: allKernels } = useListSpawnedKernels();
  const deleteMutation = useDeleteKernel();
  const cannibalizeMutation = useCannibalizeKernel();
  const mergeMutation = useMergeKernels();
  
  const [cannibalizeSource, setCannibalizeSource] = useState<string>('');
  const [cannibalizeTarget, setCannibalizeTarget] = useState<string>('');
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeName, setMergeName] = useState<string>('');

  const handleDelete = async (kernelId: string, godName: string) => {
    try {
      await deleteMutation.mutateAsync({ kernelId });
      toast({
        title: 'Kernel Deleted',
        description: `${godName} has been removed from the pantheon.`,
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete kernel',
        variant: 'destructive',
      });
    }
  };

  const handleCannibalize = async () => {
    if (!cannibalizeSource || !cannibalizeTarget) {
      toast({
        title: 'Selection Required',
        description: 'Please select both source and target kernels.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await cannibalizeMutation.mutateAsync({
        source_kernel_id: cannibalizeSource,
        target_kernel_id: cannibalizeTarget,
      });
      toast({
        title: 'Cannibalization Complete',
        description: result.message || 'Traits absorbed successfully.',
      });
      setCannibalizeSource('');
      setCannibalizeTarget('');
    } catch (error) {
      toast({
        title: 'Cannibalization Failed',
        description: error instanceof Error ? error.message : 'Failed to cannibalize kernel',
        variant: 'destructive',
      });
    }
  };

  const handleMerge = async () => {
    if (selectedForMerge.length < 2) {
      toast({
        title: 'Selection Required',
        description: 'Select at least 2 kernels to merge.',
        variant: 'destructive',
      });
      return;
    }
    if (!mergeName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Enter a name for the merged kernel.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await mergeMutation.mutateAsync({
        kernel_ids: selectedForMerge,
        new_name: mergeName,
      });
      toast({
        title: 'Merge Complete',
        description: result.message || `Created ${mergeName} from ${selectedForMerge.length} kernels.`,
      });
      setSelectedForMerge([]);
      setMergeName('');
    } catch (error) {
      toast({
        title: 'Merge Failed',
        description: error instanceof Error ? error.message : 'Failed to merge kernels',
        variant: 'destructive',
      });
    }
  };

  const toggleMergeSelection = (kernelId: string) => {
    setSelectedForMerge(prev =>
      prev.includes(kernelId)
        ? prev.filter(id => id !== kernelId)
        : [...prev, kernelId]
    );
  };

  const availableKernels = allKernels?.kernels || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Idle Kernels
          </CardTitle>
          <CardDescription>
            Kernels inactive for extended periods - candidates for deletion or merging
          </CardDescription>
        </CardHeader>
        <CardContent>
          {idleLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : idleData?.kernels && idleData.kernels.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {idleData.kernels.map((kernel: IdleKernel) => (
                  <div
                    key={kernel.kernel_id}
                    className="flex items-center justify-between gap-4 p-3 border rounded-md"
                    data-testid={`card-idle-kernel-${kernel.kernel_id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge className={KERNEL_STATUS_COLORS.idle}>idle</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{kernel.god_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{kernel.domain}</div>
                      </div>
                      <div className={`font-mono text-sm ${getIdleTimeColor(kernel.idle_duration_seconds)}`} data-testid={`text-idle-time-${kernel.kernel_id}`}>
                        {formatIdleTime(kernel.idle_duration_seconds)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(kernel.kernel_id, kernel.god_name)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-kernel-${kernel.kernel_id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4">No idle kernels detected</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="h-4 w-4 text-purple-400" />
              Cannibalize Kernel
            </CardTitle>
            <CardDescription className="text-xs">
              Absorb traits from source into target (source is destroyed)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-xs text-muted-foreground">Source (to be consumed)</label>
              <Select value={cannibalizeSource} onValueChange={setCannibalizeSource}>
                <SelectTrigger data-testid="select-cannibalize-source" aria-label="Source kernel to be consumed">
                  <SelectValue placeholder="Select source kernel" />
                </SelectTrigger>
                <SelectContent>
                  {availableKernels.map(k => (
                    <SelectItem key={k.kernel_id} value={k.kernel_id} disabled={k.kernel_id === cannibalizeTarget}>
                      {k.god_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-xs text-muted-foreground">Target (receives traits)</label>
              <Select value={cannibalizeTarget} onValueChange={setCannibalizeTarget}>
                <SelectTrigger data-testid="select-cannibalize-target" aria-label="Target kernel that receives traits">
                  <SelectValue placeholder="Select target kernel" />
                </SelectTrigger>
                <SelectContent>
                  {availableKernels.map(k => (
                    <SelectItem key={k.kernel_id} value={k.kernel_id} disabled={k.kernel_id === cannibalizeSource}>
                      {k.god_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCannibalize}
              disabled={cannibalizeMutation.isPending || !cannibalizeSource || !cannibalizeTarget}
              className="w-full"
              data-testid="button-cannibalize-execute"
            >
              {cannibalizeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Scissors className="h-4 w-4 mr-2" />
              )}
              Cannibalize
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-cyan-400" />
              Merge Kernels
            </CardTitle>
            <CardDescription className="text-xs">
              Combine multiple kernels into a new unified kernel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-xs text-muted-foreground">New Kernel Name</label>
              <Input
                placeholder="MERGED_KERNEL"
                value={mergeName}
                onChange={e => setMergeName(e.target.value)}
                data-testid="input-merge-name"
                aria-label="New kernel name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Select Kernels ({selectedForMerge.length} selected)</label>
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <div className="space-y-1">
                  {availableKernels.map(k => (
                    <div
                      key={k.kernel_id}
                      className="flex items-center gap-2 p-1 rounded hover-elevate cursor-pointer"
                      onClick={() => toggleMergeSelection(k.kernel_id)}
                      data-testid={`merge-option-${k.kernel_id}`}
                    >
                      <Checkbox
                        checked={selectedForMerge.includes(k.kernel_id)}
                        onCheckedChange={() => toggleMergeSelection(k.kernel_id)}
                        data-testid={`checkbox-merge-kernel-${k.kernel_id}`}
                      />
                      <span className="text-sm">{k.god_name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{k.domain}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <Button
              onClick={handleMerge}
              disabled={mergeMutation.isPending || selectedForMerge.length < 2 || !mergeName.trim()}
              className="w-full"
              data-testid="button-merge-execute"
            >
              {mergeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              Merge {selectedForMerge.length} Kernels
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DebateProgressionPanel() {
  const { data: debateStatus, isLoading: debateLoading } = useDebateServiceStatus();
  const { data: activeDebatesData, isLoading: debatesLoading } = useActiveDebates();
  const { data: proposals } = useListProposals();

  const activeDebates = activeDebatesData?.debates || [];
  const resolvedDebates = activeDebates.filter(d => d.status === 'resolved');
  const ongoingDebates = activeDebates.filter(d => d.status === 'active');
  
  const pendingProposals = proposals?.proposals?.filter(p => p.status === 'pending') || [];
  const approvedProposals = proposals?.proposals?.filter(p => p.status === 'approved') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Debate Progression Status
          </CardTitle>
          <CardDescription>
            Autonomous debate service activity and kernel spawn proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debateLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : debateStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-cyan-400" data-testid="text-debates-progressed">
                  {debateStatus.debates_resolved}
                </div>
                <div className="text-xs text-muted-foreground">Debates Progressed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-blue-400" data-testid="text-active-debates">
                  {ongoingDebates.length}
                </div>
                <div className="text-xs text-muted-foreground">Active Debates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-green-400" data-testid="text-resolved-debates">
                  {resolvedDebates.length}
                </div>
                <div className="text-xs text-muted-foreground">Recently Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-amber-400" data-testid="text-pending-proposals">
                  {pendingProposals.length}
                </div>
                <div className="text-xs text-muted-foreground">Pending Proposals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-purple-400" data-testid="text-approved-proposals">
                  {approvedProposals.length}
                </div>
                <div className="text-xs text-muted-foreground">Approved Proposals</div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Debate service unavailable</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Active Debates ({ongoingDebates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debatesLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : ongoingDebates.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {ongoingDebates.map((debate: ActiveDebate) => (
                    <div
                      key={debate.id}
                      className="p-2 border rounded-md"
                      data-testid={`card-debate-${debate.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{debate.topic}</span>
                        <Badge className="bg-blue-500/20 text-blue-400" data-testid={`badge-debate-status-${debate.id}`}>active</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{debate.initiator}</span>
                        <span>vs</span>
                        <span className="capitalize">{debate.opponent}</span>
                        <span className="ml-auto">{debate.arguments.length} args</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">No active debates</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-400" />
              Recent Resolutions ({resolvedDebates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debatesLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : resolvedDebates.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {resolvedDebates.map((debate: ActiveDebate) => (
                    <div
                      key={debate.id}
                      className="p-2 border rounded-md"
                      data-testid={`card-debate-${debate.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{debate.topic}</span>
                        <Badge className="bg-green-500/20 text-green-400" data-testid={`badge-debate-status-${debate.id}`}>resolved</Badge>
                      </div>
                      {debate.winner && (
                        <div className="flex items-center gap-1 text-xs">
                          <Trophy className="h-3 w-3 text-amber-400" />
                          <span className="capitalize text-amber-400">{debate.winner}</span>
                          <span className="text-muted-foreground">won</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">No recent resolutions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SpawnForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const createProposal = useCreateProposal();
  const spawnDirect = useSpawnDirect();

  const form = useForm<SpawnFormValues>({
    resolver: zodResolver(spawnFormSchema),
    defaultValues: {
      name: '',
      domain: '',
      element: 'aether',
      role: '',
      reason: 'emergence',
      spawnDirect: false,
    },
  });

  const onSubmit = async (values: SpawnFormValues) => {
    try {
      if (values.spawnDirect) {
        await spawnDirect.mutateAsync({
          name: values.name,
          domain: values.domain,
          element: values.element,
          role: values.role,
          reason: (values.reason as SpawnReason) || 'emergence',
        });
        toast({
          title: 'Kernel Spawned!',
          description: `${values.name} has been spawned and joined the council.`,
        });
      } else {
        await createProposal.mutateAsync({
          name: values.name,
          domain: values.domain,
          element: values.element,
          role: values.role,
          reason: (values.reason as SpawnReason) || 'emergence',
        });
        toast({
          title: 'Proposal Created',
          description: `Proposal for ${values.name} is now pending council vote.`,
        });
      }
      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process request',
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createProposal.isPending || spawnDirect.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>God Name</FormLabel>
                <FormControl>
                  <Input placeholder="IRIS" {...field} data-testid="input-god-name" />
                </FormControl>
                <FormDescription>Name for the new god-kernel (uppercase)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="element"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Element</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-element">
                      <SelectValue placeholder="Select element" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="earth">Earth</SelectItem>
                    <SelectItem value="aether">Aether</SelectItem>
                    <SelectItem value="shadow">Shadow</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain</FormLabel>
              <FormControl>
                <Input placeholder="pattern_recognition" {...field} data-testid="input-domain" />
              </FormControl>
              <FormDescription>Area of specialization (e.g., signal_processing)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Geometric pattern detector and analyzer for temporal signatures" 
                  {...field} 
                  data-testid="input-role"
                />
              </FormControl>
              <FormDescription>Describe the kernel's purpose and responsibilities</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Spawn Reason</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="domain_gap">Domain Gap</SelectItem>
                  <SelectItem value="overload">Overload</SelectItem>
                  <SelectItem value="specialization">Specialization</SelectItem>
                  <SelectItem value="emergence">Emergence</SelectItem>
                  <SelectItem value="user_request">User Request</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="spawnDirect"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 mt-1"
                  data-testid="checkbox-spawn-direct"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Spawn Directly</FormLabel>
                <FormDescription>
                  Skip voting and spawn immediately (auto-votes all gods)
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="button-submit-spawn">
          {isSubmitting ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {form.watch('spawnDirect') ? 'Spawn Kernel' : 'Create Proposal'}
        </Button>
      </form>
    </Form>
  );
}

type KernelFilter = 'all' | 'active' | 'idle' | 'observing' | 'breeding' | 'dormant' | 'dead' | 'shadow';

const KERNEL_FILTER_OPTIONS: { value: KernelFilter; label: string }[] = [
  { value: 'all', label: 'All Kernels' },
  { value: 'active', label: 'Active' },
  { value: 'idle', label: 'Idle' },
  { value: 'observing', label: 'Observing' },
  { value: 'breeding', label: 'Breeding' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'dead', label: 'Dead' },
  { value: 'shadow', label: 'Shadow' },
];

export default function SpawningPage() {
  const [activeTab, setActiveTab] = useState('proposals');
  const [kernelFilter, setKernelFilter] = useState<KernelFilter | null>(null);
  const [hasInitializedFilter, setHasInitializedFilter] = useState(false);
  const { toast } = useToast();
  
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useM8Status();
  const { data: proposals, isLoading: proposalsLoading, refetch: refetchProposals } = useListProposals();
  const { data: kernels, isLoading: kernelsLoading, refetch: refetchKernels } = useListSpawnedKernels();
  const { data: warHistory, isLoading: warHistoryLoading, refetch: refetchWarHistory } = useWarHistory(50);
  const { data: activeWar, refetch: refetchActiveWar } = useActiveWar();
  
  const kernelStatusCounts = kernels?.kernels?.reduce((acc, kernel) => {
    acc[kernel.status] = (acc[kernel.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  useEffect(() => {
    if (!hasInitializedFilter && kernels?.kernels && kernels.kernels.length > 0) {
      const activeCount = kernelStatusCounts['active'] || 0;
      if (activeCount > 0) {
        setKernelFilter('active');
      } else {
        setKernelFilter('all');
      }
      setHasInitializedFilter(true);
    }
  }, [kernels?.kernels, kernelStatusCounts, hasInitializedFilter]);
  
  const effectiveFilter = kernelFilter || 'all';
  
  const filteredKernels = kernels?.kernels?.filter(kernel => {
    if (effectiveFilter === 'all') return true;
    return kernel.status === effectiveFilter;
  }) || [];
  
  const voteMutation = useVoteOnProposal();
  const spawnMutation = useSpawnKernel();

  const handleVote = async (proposalId: string) => {
    try {
      const result = await voteMutation.mutateAsync({ proposalId, autoVote: true });
      toast({
        title: result.consensus_reached ? 'Consensus Reached!' : 'Vote Recorded',
        description: result.consensus_reached 
          ? `Proposal is now ${result.status}` 
          : `${Object.keys(result.votes).length} gods have voted`,
      });
    } catch (error) {
      toast({
        title: 'Vote Failed',
        description: error instanceof Error ? error.message : 'Failed to vote',
        variant: 'destructive',
      });
    }
  };

  const handleSpawn = async (proposalId: string) => {
    try {
      const result = await spawnMutation.mutateAsync({ proposalId });
      toast({
        title: 'Kernel Spawned!',
        description: `${result.kernel.god_name} has joined the council`,
      });
    } catch (error) {
      toast({
        title: 'Spawn Failed',
        description: error instanceof Error ? error.message : 'Failed to spawn kernel',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    refetchStatus();
    refetchProposals();
    refetchKernels();
    refetchWarHistory();
    refetchActiveWar();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Sparkles className="h-6 w-6 text-purple-400" />
            M8 Kernel Spawning
          </h1>
          <p className="text-muted-foreground text-sm">
            Divine Consensus Protocol - Spawn new specialized god-kernels
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusCard 
          title="Total Gods" 
          value={statusLoading ? '...' : status?.orchestrator_gods || 0} 
          icon={Crown}
          color="text-yellow-500"
        />
        <StatusCard 
          title="Pending Proposals" 
          value={statusLoading ? '...' : status?.pending_proposals || 0} 
          icon={Vote}
          color="text-amber-400"
        />
        <StatusCard 
          title="Live Kernels" 
          value={kernelsLoading ? '...' : `${kernels?.live_count ?? 0} / ${kernels?.cap ?? 240}`} 
          icon={Rocket}
          color="text-purple-400"
        />
        <StatusCard 
          title="Cap Available" 
          value={kernelsLoading ? '...' : kernels?.available ?? 240} 
          icon={Activity}
          color={kernels?.available && kernels.available < 20 ? 'text-red-400' : 'text-green-400'}
        />
        <StatusCard 
          title="Consensus Type" 
          value={statusLoading ? '...' : status?.consensus_type || 'supermajority'} 
          icon={Shield}
          color="text-cyan-400"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposals" data-testid="tab-proposals">
            <Vote className="h-4 w-4 mr-2" />
            Proposals ({proposals?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="kernels" data-testid="tab-kernels">
            <Crown className="h-4 w-4 mr-2" />
            Live Kernels ({kernels?.live_count ?? 0}/{kernels?.cap ?? 240})
          </TabsTrigger>
          <TabsTrigger value="war-intel" data-testid="tab-war-intel">
            <Swords className="h-4 w-4 mr-2" />
            War Intel {activeWar && <span className="ml-1 text-amber-400">(ACTIVE)</span>}
          </TabsTrigger>
          <TabsTrigger value="spawn" data-testid="tab-spawn">
            <Plus className="h-4 w-4 mr-2" />
            Spawn New
          </TabsTrigger>
          <TabsTrigger value="observing" data-testid="tab-observing">
            <Eye className="h-4 w-4 mr-2" />
            Observing
          </TabsTrigger>
          <TabsTrigger value="lifecycle" data-testid="tab-lifecycle">
            <Scissors className="h-4 w-4 mr-2" />
            Lifecycle
          </TabsTrigger>
          <TabsTrigger value="debates" data-testid="tab-debates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Debates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-4">
          {proposalsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading proposals...</p>
            </div>
          ) : proposals?.proposals && proposals.proposals.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {proposals.proposals.map(proposal => (
                  <ProposalCard 
                    key={proposal.proposal_id} 
                    proposal={proposal}
                    onVote={handleVote}
                    onSpawn={handleSpawn}
                    isVoting={voteMutation.isPending}
                    isSpawning={spawnMutation.isPending}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No proposals yet</p>
              <p className="text-sm">Create a new proposal to spawn a god-kernel</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kernels" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by status:</span>
              <Select value={effectiveFilter} onValueChange={(v) => setKernelFilter(v as KernelFilter)}>
                <SelectTrigger className="w-[180px]" data-testid="select-kernel-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KERNEL_FILTER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} {kernelStatusCounts[opt.value] !== undefined && opt.value !== 'all' ? `(${kernelStatusCounts[opt.value]})` : opt.value === 'all' ? `(${kernels?.kernels?.length || 0})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {Object.entries(kernelStatusCounts).map(([status, count]) => (
                <Badge 
                  key={status} 
                  variant="outline" 
                  className={`cursor-pointer ${KERNEL_STATUS_COLORS[status as KernelStatus] || ''}`}
                  onClick={() => setKernelFilter(status as KernelFilter)}
                  data-testid={`badge-filter-${status}`}
                >
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </div>
          
          {kernelsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading kernels...</p>
            </div>
          ) : filteredKernels.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {filteredKernels.map(kernel => (
                  <KernelCard key={kernel.kernel_id} kernel={kernel} />
                ))}
              </div>
            </ScrollArea>
          ) : kernels?.kernels && kernels.kernels.length > 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No {effectiveFilter} kernels</p>
              <p className="text-sm">Try selecting a different filter above</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No spawned kernels yet</p>
              <p className="text-sm">Approved proposals can be spawned into new god-kernels</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="war-intel" className="mt-4">
          <div className="space-y-6">
            {activeWar && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-amber-400 animate-pulse" />
                  Active War
                </h3>
                <WarCard war={activeWar} isActive />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Swords className="h-5 w-5 text-muted-foreground" />
                War History
              </h3>
              {warHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading war history...</p>
                </div>
              ) : warHistory && warHistory.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                    {warHistory
                      .filter(war => war.id !== activeWar?.id)
                      .map(war => (
                        <WarCard key={war.id} war={war} />
                      ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No war history yet</p>
                  <p className="text-sm">Wars declared via BLITZKRIEG, SIEGE, or HUNT will appear here</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spawn" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Spawn New God-Kernel
              </CardTitle>
              <CardDescription>
                Create a proposal for the council to vote on, or spawn directly with auto-consensus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpawnForm onSuccess={() => setActiveTab('proposals')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observing" className="mt-4">
          <ObservingKernelsPanel />
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-4">
          <KernelLifecycleActionsPanel />
        </TabsContent>

        <TabsContent value="debates" className="mt-4">
          <DebateProgressionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
