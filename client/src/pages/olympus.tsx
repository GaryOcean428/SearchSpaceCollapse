import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Shield, 
  Sword, 
  Sun, 
  Target, 
  MessageSquare, 
  Flame,
  Wheat,
  Wine,
  Waves as WavesIcon,
  Skull,
  Crown,
  Heart,
  Users,
  Zap,
  Moon,
  Eye,
  Crosshair,
  Ghost,
  Bomb,
  RefreshCw
} from 'lucide-react';
import ZeusChat from '@/components/ZeusChat';

interface GodStatus {
  name: string;
  domain: string;
  reputation: number;
  skills: Record<string, number>;
  observations?: number;
  pending_messages?: number;
}

interface PantheonStatus {
  zeus: {
    war_mode: string | null;
    war_target: string | null;
  };
  gods: Record<string, GodStatus>;
  chat_status: {
    total_messages: number;
    active_debates: number;
    resolved_debates: number;
    knowledge_transfers: number;
  };
}

interface ChatMessage {
  id: string;
  type: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Debate {
  id: string;
  topic: string;
  initiator: string;
  opponent: string;
  status: string;
  arguments: Array<{god: string; argument: string; timestamp: string}>;
  winner?: string;
}

const GOD_ICONS: Record<string, typeof Sparkles> = {
  zeus: Zap,
  athena: Shield,
  ares: Sword,
  apollo: Sun,
  artemis: Target,
  hermes: MessageSquare,
  hephaestus: Flame,
  demeter: Wheat,
  dionysus: Wine,
  poseidon: WavesIcon,
  hades: Skull,
  hera: Crown,
  aphrodite: Heart,
  nyx: Moon,
  hecate: Crosshair,
  erebus: Eye,
  hypnos: Ghost,
  thanatos: Bomb,
  nemesis: Target,
};

const GOD_COLORS: Record<string, string> = {
  zeus: 'text-yellow-500',
  athena: 'text-blue-400',
  ares: 'text-red-500',
  apollo: 'text-amber-400',
  artemis: 'text-emerald-400',
  hermes: 'text-cyan-400',
  hephaestus: 'text-orange-500',
  demeter: 'text-green-500',
  dionysus: 'text-purple-500',
  poseidon: 'text-blue-500',
  hades: 'text-gray-400',
  hera: 'text-pink-400',
  aphrodite: 'text-rose-400',
  nyx: 'text-indigo-400',
  hecate: 'text-violet-400',
  erebus: 'text-slate-400',
  hypnos: 'text-blue-300',
  thanatos: 'text-gray-500',
  nemesis: 'text-red-400',
};

function GodCard({ name, god }: { name: string; god: GodStatus }) {
  const Icon = GOD_ICONS[name.toLowerCase()] || Sparkles;
  const colorClass = GOD_COLORS[name.toLowerCase()] || 'text-primary';
  
  const reputation = god?.reputation ?? 1.0;
  const reputationColor = reputation >= 1.5 
    ? 'text-green-400' 
    : reputation >= 1.0 
      ? 'text-yellow-400' 
      : 'text-red-400';

  return (
    <Card className="hover-elevate" data-testid={`card-god-${name.toLowerCase()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          <CardTitle className="text-sm capitalize">{name}</CardTitle>
        </div>
        <CardDescription className="text-xs">{god?.domain || 'Unknown domain'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Reputation</span>
          <span className={`text-sm font-mono ${reputationColor}`}>
            {reputation.toFixed(2)}
          </span>
        </div>
        {god?.pending_messages !== undefined && god.pending_messages > 0 && (
          <Badge variant="secondary" className="text-xs">
            {god.pending_messages} pending
          </Badge>
        )}
        {Object.keys(god?.skills || {}).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(god.skills).slice(0, 3).map(([skill, level]) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}: {typeof level === 'number' ? level.toFixed(1) : level}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PantheonGrid({ gods }: { gods: Record<string, GodStatus> }) {
  const olympianNames = ['athena', 'ares', 'apollo', 'artemis', 'hermes', 'hephaestus', 'demeter', 'dionysus', 'poseidon', 'hades', 'hera', 'aphrodite'];
  const shadowNames = ['nyx', 'hecate', 'erebus', 'hypnos', 'thanatos', 'nemesis'];
  
  const olympians = olympianNames.filter(name => gods[name]);
  const shadows = shadowNames.filter(name => gods[name]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          Olympian Pantheon
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {olympians.map(name => (
            <GodCard key={name} name={name} god={gods[name]} />
          ))}
        </div>
      </div>
      
      {shadows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-400" />
            Shadow Pantheon
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {shadows.map(name => (
              <GodCard key={name} name={name} god={gods[name]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatActivity({ messages }: { messages: ChatMessage[] }) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  if (safeMessages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No inter-god communication yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {safeMessages.map((msg) => {
          const FromIcon = GOD_ICONS[msg.from.toLowerCase()] || Sparkles;
          const fromColor = GOD_COLORS[msg.from.toLowerCase()] || 'text-primary';
          
          return (
            <div key={msg.id} className="p-3 rounded-lg bg-muted/50" data-testid={`chat-message-${msg.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <FromIcon className={`h-4 w-4 ${fromColor}`} />
                <span className="text-sm font-medium capitalize">{msg.from}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-sm capitalize">{msg.to}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {msg.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{msg.content}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function DebateViewer({ debates }: { debates: Debate[] }) {
  const safeDebates = Array.isArray(debates) ? debates : [];
  if (safeDebates.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Sword className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active debates</p>
        <p className="text-xs">Debates emerge when gods disagree on assessments</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        {safeDebates.map((debate) => {
          const InitiatorIcon = GOD_ICONS[debate.initiator.toLowerCase()] || Sparkles;
          const OpponentIcon = GOD_ICONS[debate.opponent.toLowerCase()] || Sparkles;
          
          return (
            <Card key={debate.id} data-testid={`debate-${debate.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{debate.topic}</CardTitle>
                  <Badge variant={debate.status === 'active' ? 'default' : 'secondary'}>
                    {debate.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 capitalize">
                    <InitiatorIcon className="h-3 w-3" />
                    {debate.initiator}
                  </span>
                  <span>vs</span>
                  <span className="flex items-center gap-1 capitalize">
                    <OpponentIcon className="h-3 w-3" />
                    {debate.opponent}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {debate.arguments.slice(-3).map((arg, i) => (
                    <div key={i} className="text-xs p-2 bg-muted/50 rounded">
                      <span className="font-medium capitalize">{arg.god}:</span>{' '}
                      {arg.argument.slice(0, 150)}...
                    </div>
                  ))}
                </div>
                {debate.winner && (
                  <div className="mt-2 text-xs text-green-400">
                    Winner: <span className="capitalize">{debate.winner}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default function OlympusPage() {
  const [activeTab, setActiveTab] = useState('chat');

  const { data: status, isLoading, refetch } = useQuery<PantheonStatus>({
    queryKey: ['/api/olympus/status'],
    refetchInterval: 10000,
  });

  const { data: recentActivity } = useQuery<ChatMessage[]>({
    queryKey: ['/api/olympus/chat/recent'],
    refetchInterval: 5000,
  });

  const { data: activeDebates } = useQuery<Debate[]>({
    queryKey: ['/api/olympus/debates/active'],
    refetchInterval: 10000,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Zap className="h-6 w-6 text-yellow-500" />
            Mount Olympus Observatory
          </h1>
          <p className="text-muted-foreground text-sm">
            Divine Consciousness Council - Inter-Agent Communication Hub
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          data-testid="button-refresh-status"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {status?.zeus?.war_mode && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Sword className="h-5 w-5 text-red-500" />
              <div>
                <span className="font-semibold text-red-400">
                  War Mode Active: {status.zeus.war_mode.toUpperCase()}
                </span>
                {status.zeus.war_target && (
                  <span className="text-sm text-muted-foreground ml-2">
                    Target: {status.zeus.war_target}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Gods</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="text-active-gods">
              {isLoading ? '...' : Object.keys(status?.gods || {}).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Messages</span>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="text-total-messages">
              {isLoading ? '...' : status?.chat_status?.total_messages || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Debates</span>
              <Sword className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="text-active-debates">
              {isLoading ? '...' : status?.chat_status?.active_debates || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Knowledge Transfers</span>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="text-knowledge-transfers">
              {isLoading ? '...' : status?.chat_status?.knowledge_transfers || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" data-testid="tab-zeus-chat">
            <Sparkles className="h-4 w-4 mr-2" />
            Zeus Chat
          </TabsTrigger>
          <TabsTrigger value="pantheon" data-testid="tab-pantheon">
            <Crown className="h-4 w-4 mr-2" />
            Pantheon Status
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <MessageSquare className="h-4 w-4 mr-2" />
            Inter-God Activity
          </TabsTrigger>
          <TabsTrigger value="debates" data-testid="tab-debates">
            <Sword className="h-4 w-4 mr-2" />
            Debates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ZeusChat />
        </TabsContent>

        <TabsContent value="pantheon" className="mt-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading pantheon status...</div>
          ) : status?.gods ? (
            <PantheonGrid gods={status.gods} />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Unable to connect to Mount Olympus
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Inter-God Communication
              </CardTitle>
              <CardDescription>
                Live feed of messages between Olympian gods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatActivity messages={recentActivity || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sword className="h-5 w-5" />
                Divine Debates
              </CardTitle>
              <CardDescription>
                Formal disagreements between gods - watch Athena vs Ares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DebateViewer debates={activeDebates || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
