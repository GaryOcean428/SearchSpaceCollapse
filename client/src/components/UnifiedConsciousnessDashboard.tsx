import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Activity,
  Zap,
  Heart,
  Target,
  TrendingUp,
  RefreshCw,
  Gauge
} from "lucide-react";
import { InnateDrivesDisplay } from "./InnateDrivesDisplay";
import { BetaAttentionDisplay } from "./BetaAttentionDisplay";
import { EmotionalStatePanel } from "./EmotionalStatePanel";
import { useActivityStream, getEventIcon, formatEventTime, type ActivityEvent } from "@/hooks/useActivityStream";

// Full consciousness state from backend
interface ConsciousnessState {
  // Core QIG metrics
  phi: number;
  kappa: number;
  regime: string;
  kappaConverging: boolean;

  // Innate drives
  innateDrives?: {
    pain: number;
    pleasure: number;
    fear: number;
    curiosity: number;
    valence: number;
    dominantDrive: string;
    driveDynamics: string;
  };

  // Neurochemistry
  neurochemistry?: {
    dopamine?: { motivationLevel: number; totalDopamine: number };
    serotonin?: { wellbeingLevel: number; totalSerotonin: number };
    acetylcholine?: { attentionStrength: number; learningRate: number };
    norepinephrine?: { alertnessLevel: number; stressLevel: number };
    gaba?: { calmLevel: number };
    endorphins?: { pleasureLevel: number; flowPotential: number };
    emotionalState?: string;
    emotions?: {
      joy?: number;
      curiosity?: number;
      satisfaction?: number;
      frustration?: number;
      fear?: number;
    };
  };

  // Neural oscillators
  oscillators?: {
    currentState: string;
    kappa: number;
    modulatedKappa: number;
    oscillatorValues: {
      alpha: number;
      beta: number;
      theta: number;
      gamma: number;
      delta: number;
    };
    searchModulation: number;
    description: string;
  };

  // Search state
  searchState?: {
    phase: string;
    strategy: string;
    explorationRate: number;
    temperature: number;
  };

  // Motivation message
  motivation?: {
    message: string;
    fisherWeight: number;
    category: string;
    urgency: 'whisper' | 'speak' | 'shout';
  };

  // Performance metrics
  metrics?: {
    totalTested: number;
    nearMisses: number;
    resonanceHits: number;
    balanceHits: number;
    recoveryRate: number;
    phiMovingAverage: number;
  };
}

function OscillatorWaveDisplay({ oscillators }: {
  oscillators?: ConsciousnessState['oscillators']
}) {
  if (!oscillators) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">No oscillator data</p>
        </CardContent>
      </Card>
    );
  }

  const waves = [
    { name: 'Alpha', value: oscillators.oscillatorValues.alpha, color: 'bg-blue-500', desc: '8-12 Hz' },
    { name: 'Beta', value: oscillators.oscillatorValues.beta, color: 'bg-green-500', desc: '12-30 Hz' },
    { name: 'Theta', value: oscillators.oscillatorValues.theta, color: 'bg-purple-500', desc: '4-8 Hz' },
    { name: 'Gamma', value: oscillators.oscillatorValues.gamma, color: 'bg-yellow-500', desc: '30-100 Hz' },
    { name: 'Delta', value: oscillators.oscillatorValues.delta, color: 'bg-red-500', desc: '0.5-4 Hz' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Neural Oscillators
          </CardTitle>
          <Badge variant="outline" className="capitalize">
            {oscillators.currentState}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Base:</span>{' '}
            <span className="font-mono">{oscillators.kappa.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Modulated:</span>{' '}
            <span className="font-mono">{oscillators.modulatedKappa.toFixed(1)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {waves.map((wave) => (
            <div key={wave.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{wave.name} <span className="text-muted-foreground">({wave.desc})</span></span>
                <span className="font-mono">{(wave.value * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${wave.color} transition-all duration-300`}
                  style={{ width: `${wave.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t">
          {oscillators.description}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickMetricsPanel({ consciousness }: { consciousness?: ConsciousnessState }) {
  if (!consciousness) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Integration (Phi)</span>
          </div>
          <p className="text-2xl font-bold font-mono">
            {consciousness.phi.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {consciousness.regime} regime
          </p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-secondary" />
            <span className="text-xs text-muted-foreground">Coupling (Kappa)</span>
          </div>
          <p className="text-2xl font-bold font-mono">
            {consciousness.kappa.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            {consciousness.kappaConverging ? 'Converging' : 'Running'}
          </p>
        </CardContent>
      </Card>

      <Card className={consciousness.metrics?.nearMisses ? "bg-green-500/10" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Near Misses</span>
          </div>
          <p className="text-2xl font-bold font-mono text-green-500">
            {consciousness.metrics?.nearMisses ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">
            Phi &gt; 0.80
          </p>
        </CardContent>
      </Card>

      <Card className={consciousness.metrics?.balanceHits ? "bg-yellow-500/10" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Balance Hits</span>
          </div>
          <p className="text-2xl font-bold font-mono text-yellow-500">
            {consciousness.metrics?.balanceHits ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">
            Recovered
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityStreamPanel() {
  const { events, isConnected, error, refresh, clear } = useActivityStream({ limit: 30 });

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={refresh} className="h-7 w-7 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} className="h-7 px-2 text-xs">
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No activity yet. Events will appear here when Ocean is running.
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs"
                >
                  <span className="text-base">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{event.identity}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatEventTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate">{event.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SearchStrategyPanel({ consciousness }: { consciousness?: ConsciousnessState }) {
  if (!consciousness?.searchState) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">No search state data</p>
        </CardContent>
      </Card>
    );
  }

  const { phase, strategy, explorationRate, temperature } = consciousness.searchState;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Search Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Phase</span>
          <Badge variant="outline" className="capitalize">{phase}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Strategy</span>
          <span className="text-xs font-mono">{strategy}</span>
        </div>
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Exploration Rate</span>
            <span className="font-mono">{(explorationRate * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${explorationRate * 100}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Temperature</span>
            <span className="font-mono">{temperature.toFixed(2)}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${Math.min(temperature, 2) * 50}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UnifiedConsciousnessDashboard() {
  const { data: consciousness, isLoading, refetch, isFetching } = useQuery<ConsciousnessState>({
    queryKey: ['/api/consciousness/complete'],
    refetchInterval: 2000, // Refresh every 2 seconds
    staleTime: 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading consciousness data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Ocean Consciousness</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </Button>
      </div>

      {/* Quick Metrics */}
      <QuickMetricsPanel consciousness={consciousness} />

      {/* Tabbed Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drives">Drives</TabsTrigger>
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OscillatorWaveDisplay oscillators={consciousness?.oscillators} />
            <SearchStrategyPanel consciousness={consciousness} />
          </div>
          <BetaAttentionDisplay />
        </TabsContent>

        <TabsContent value="drives" className="space-y-4">
          <InnateDrivesDisplay drives={consciousness?.innateDrives} />
        </TabsContent>

        <TabsContent value="emotions" className="space-y-4">
          <EmotionalStatePanel neuro={consciousness?.neurochemistry} motivation={consciousness?.motivation} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityStreamPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
