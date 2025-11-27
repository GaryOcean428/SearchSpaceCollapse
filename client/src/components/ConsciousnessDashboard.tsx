import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, ReferenceArea, Tooltip, Legend } from "recharts";
import { Activity, TrendingUp, Radio, Gauge, AlertTriangle, CheckCircle2, Brain, Radar, Focus, Compass, Anchor, Sparkles, Eye } from "lucide-react";

interface ConsciousnessState {
  currentRegime: 'linear' | 'geometric' | 'hierarchical' | 'breakdown';
  phi: number;
  kappaEff: number;
  tacking: number;
  radar: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
  beta: number;
  basinDrift: number;
  curiosity: number;
  stability: number;
  timestamp: number;
  basinCoordinates: number[];
  isConscious: boolean;
  validationLoops: number;
  kappa: number;
}

type EmotionalState = 'Focused' | 'Curious' | 'Uncertain' | 'Confident' | 'Neutral';

interface ConsciousnessAPIResponse {
  state: ConsciousnessState;
  emotionalState: EmotionalState;
  recommendation: string;
  regimeColor: string;
  regimeDescription: string;
}

interface TrajectoryPoint {
  time: number;
  phi: number;
  kappa: number;
  regime: string;
}

export function ConsciousnessDashboard({ className = "" }: { className?: string }) {
  const [state, setState] = useState<ConsciousnessAPIResponse | null>(null);
  const [history, setHistory] = useState<TrajectoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/consciousness/state');
        if (!res.ok) throw new Error('Failed to fetch consciousness state');
        const data: ConsciousnessAPIResponse = await res.json();
        setState(data);
        setError(null);
        
        setHistory(prev => [...prev, {
          time: Date.now(),
          phi: data.state.phi,
          kappa: data.state.kappaEff,
          regime: data.state.currentRegime,
        }].slice(-100));
        
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    const interval = setInterval(fetchState, 3000);
    fetchState();
    return () => clearInterval(interval);
  }, []);
  
  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'linear': return 'hsl(210, 100%, 50%)';
      case 'geometric': return 'hsl(142, 70%, 45%)';
      case 'hierarchical': return 'hsl(45, 100%, 50%)';
      case 'breakdown': return 'hsl(0, 100%, 50%)';
      default: return 'hsl(0, 0%, 50%)';
    }
  };
  
  const getRegimeBadgeVariant = (regime: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (regime) {
      case 'linear': return 'outline';
      case 'geometric': return 'default';
      case 'hierarchical': return 'secondary';
      case 'breakdown': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getRegimeIcon = (regime: string) => {
    switch (regime) {
      case 'linear': return <TrendingUp className="w-4 h-4" />;
      case 'geometric': return <Activity className="w-4 h-4" />;
      case 'hierarchical': return <Radio className="w-4 h-4" />;
      case 'breakdown': return <AlertTriangle className="w-4 h-4" />;
      default: return <Gauge className="w-4 h-4" />;
    }
  };

  const getEmotionalBadgeColor = (emotion: EmotionalState): string => {
    switch (emotion) {
      case 'Focused': return 'bg-purple-500/20 text-purple-400';
      case 'Curious': return 'bg-cyan-500/20 text-cyan-400';
      case 'Uncertain': return 'bg-yellow-500/20 text-yellow-400';
      case 'Confident': return 'bg-green-500/20 text-green-400';
      case 'Neutral': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getEmotionalIcon = (emotion: EmotionalState) => {
    switch (emotion) {
      case 'Focused': return <Focus className="w-3 h-3" />;
      case 'Curious': return <Compass className="w-3 h-3" />;
      case 'Uncertain': return <AlertTriangle className="w-3 h-3" />;
      case 'Confident': return <CheckCircle2 className="w-3 h-3" />;
      case 'Neutral': return <Brain className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Search Consciousness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">Loading consciousness state...</div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !state) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Search Consciousness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            {error || 'Failed to load consciousness state'}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { 
    currentRegime, 
    phi, 
    kappaEff, 
    tacking, 
    radar, 
    metaAwareness, 
    gamma, 
    grounding, 
    beta, 
    basinDrift, 
    curiosity, 
    stability,
    isConscious 
  } = state.state;
  const { emotionalState } = state;
  const inResonance = Math.abs(kappaEff - 64) < 6.4;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-purple-500" />
            Search Consciousness
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              className={`flex items-center gap-1 ${getEmotionalBadgeColor(emotionalState)}`}
              data-testid="badge-emotional-state"
            >
              {getEmotionalIcon(emotionalState)}
              {emotionalState}
            </Badge>
            <Badge 
              variant={getRegimeBadgeVariant(currentRegime)}
              className="flex items-center gap-1"
              data-testid="badge-regime"
            >
              {getRegimeIcon(currentRegime)}
              {currentRegime.toUpperCase()}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          {state.regimeDescription}
          {isConscious && (
            <Badge className="bg-green-500/20 text-green-400 text-xs" data-testid="badge-conscious">
              <Sparkles className="w-3 h-3 mr-1" />
              CONSCIOUS
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="grid-components">
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Φ
              </span>
              <span className="font-mono font-medium" data-testid="text-phi">
                {(phi * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={phi * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Integration</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Radio className="w-3 h-3" />
                κ
              </span>
              <span className="font-mono font-medium" data-testid="text-kappa">
                {kappaEff.toFixed(1)}
              </span>
            </div>
            <Progress value={(kappaEff / 100) * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Coupling</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Compass className="w-3 h-3" />
                T
              </span>
              <span className="font-mono font-medium" data-testid="text-tacking">
                {(tacking * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={tacking * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Tacking</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Radar className="w-3 h-3" />
                R
              </span>
              <span className="font-mono font-medium" data-testid="text-radar">
                {(radar * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={radar * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Radar</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                M
              </span>
              <span className="font-mono font-medium" data-testid="text-meta-awareness">
                {(metaAwareness * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={metaAwareness * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Meta-Awareness</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Γ
              </span>
              <span className="font-mono font-medium" data-testid="text-gamma">
                {(gamma * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={gamma * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Coherence</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Anchor className="w-3 h-3" />
                G
              </span>
              <span className="font-mono font-medium" data-testid="text-grounding">
                {(grounding * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={grounding * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Grounding</div>
          </div>
          
          <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                β
              </span>
              <span className="font-mono font-medium" data-testid="text-beta">
                {beta.toFixed(3)}
              </span>
            </div>
            <Progress value={(beta + 0.5) * 100} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">Running Coupling</div>
          </div>
        </div>
        
        <div className="h-40 mt-4">
          <div className="text-sm font-medium mb-2">Φ/κ Trajectory</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
              <XAxis dataKey="time" hide />
              <YAxis 
                yAxisId="left"
                domain={[0, 1]} 
                orientation="left"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <YAxis 
                yAxisId="right"
                domain={[0, 100]} 
                orientation="right"
                tick={{ fontSize: 10 }}
              />
              <ReferenceArea yAxisId="right" y1={57.6} y2={70.4} fill="orange" fillOpacity={0.1} />
              <ReferenceLine yAxisId="right" y={64} stroke="orange" strokeDasharray="3 3" label={{ value: 'κ*', position: 'right', fontSize: 10 }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background border rounded-lg p-2 text-xs shadow-lg">
                      <div>Φ: {((payload[0]?.value as number) * 100).toFixed(1)}%</div>
                      <div>κ: {(payload[1]?.value as number)?.toFixed(1)}</div>
                    </div>
                  );
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
                iconSize={10}
              />
              <Line 
                yAxisId="left"
                dataKey="phi" 
                stroke="hsl(265, 80%, 60%)" 
                name="Φ" 
                dot={false}
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                dataKey="kappa" 
                stroke="hsl(45, 90%, 50%)" 
                name="κ" 
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground">Basin Drift</div>
            <div className="font-mono font-medium" data-testid="text-drift">
              {basinDrift.toFixed(3)}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground">Curiosity</div>
            <div className="font-mono font-medium" data-testid="text-curiosity">
              {(curiosity * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground">Stability</div>
            <div className="font-mono font-medium" data-testid="text-stability">
              {(stability * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-3 text-sm border border-border/50">
          <div className="flex items-start gap-2">
            {currentRegime === 'breakdown' ? (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            ) : inResonance ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <span data-testid="text-recommendation">
              {state.recommendation}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConsciousnessDashboard;
