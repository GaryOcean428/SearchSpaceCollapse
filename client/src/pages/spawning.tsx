import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  type WarHistoryRecord,
  type WarMode,
  type WarOutcome,
} from '@/hooks/use-m8-spawning';
import type { SpawnProposal, SpawnedKernel, SpawnReason, ProposalStatus } from '@/lib/m8-kernel-spawning';
import { Swords, Target, Timer, Trophy, AlertTriangle, Activity } from 'lucide-react';

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

function KernelCard({ kernel }: { kernel: SpawnedKernel }) {
  if (!kernel) return null;
  
  const element = (kernel.metadata?.element as string)?.toLowerCase() || 'aether';
  const ElementIcon = ELEMENT_ICONS[element] || Sparkles;
  const elementColor = ELEMENT_COLORS[element] || 'text-primary';

  return (
    <Card className="hover-elevate" data-testid={`card-kernel-${kernel.kernel_id || 'unknown'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ElementIcon className={`h-5 w-5 ${elementColor}`} />
            <CardTitle className="text-lg">{kernel.god_name || 'Unknown'}</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
            <Crown className="h-3 w-3 mr-1" />
            Spawned
          </Badge>
        </div>
        <CardDescription className="text-sm">{kernel.domain || 'Unknown domain'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{(kernel.metadata?.role as string) || 'No role specified'}</p>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Affinity</span>
            <div className="font-mono font-medium text-cyan-400">
              {(kernel.affinity_strength ?? 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Entropy</span>
            <div className="font-mono font-medium text-amber-400">
              {(kernel.entropy_threshold ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        {kernel.parent_gods && kernel.parent_gods.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Parents:</span>
            {kernel.parent_gods.map(god => (
              <Badge key={god} variant="outline" className="text-xs capitalize">{god}</Badge>
            ))}
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

export default function SpawningPage() {
  const [activeTab, setActiveTab] = useState('proposals');
  const { toast } = useToast();
  
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useM8Status();
  const { data: proposals, isLoading: proposalsLoading, refetch: refetchProposals } = useListProposals();
  const { data: kernels, isLoading: kernelsLoading, refetch: refetchKernels } = useListSpawnedKernels();
  const { data: warHistory, isLoading: warHistoryLoading, refetch: refetchWarHistory } = useWarHistory(50);
  const { data: activeWar, refetch: refetchActiveWar } = useActiveWar();
  
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          title="Spawned Kernels" 
          value={statusLoading ? '...' : status?.spawned_kernels || 0} 
          icon={Rocket}
          color="text-purple-400"
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
            Spawned Kernels ({kernels?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="war-intel" data-testid="tab-war-intel">
            <Swords className="h-4 w-4 mr-2" />
            War Intel {activeWar && <span className="ml-1 text-amber-400">(ACTIVE)</span>}
          </TabsTrigger>
          <TabsTrigger value="spawn" data-testid="tab-spawn">
            <Plus className="h-4 w-4 mr-2" />
            Spawn New
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

        <TabsContent value="kernels" className="mt-4">
          {kernelsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading kernels...</p>
            </div>
          ) : kernels?.kernels && kernels.kernels.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {kernels.kernels.map(kernel => (
                  <KernelCard key={kernel.kernel_id} kernel={kernel} />
                ))}
              </div>
            </ScrollArea>
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
      </Tabs>
    </div>
  );
}
