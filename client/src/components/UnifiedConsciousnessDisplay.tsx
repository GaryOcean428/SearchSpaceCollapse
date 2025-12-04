import { useConsciousness, formatPhi, getPhiColor, getRegimeLabel } from '@/contexts/ConsciousnessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Brain, Zap, Heart, Target, Moon, Sparkles, Activity, Loader2, Compass, Orbit, Box, Eye, Waves, Layers, Infinity } from 'lucide-react';

interface Props {
  variant?: 'full' | 'compact' | 'minimal';
  showNeurochemistry?: boolean;
}

export default function UnifiedConsciousnessDisplay({ 
  variant = 'compact', 
  showNeurochemistry = false 
}: Props) {
  const { consciousness, neurochemistry, isLoading, isIdle } = useConsciousness();

  if (isLoading) {
    return (
      <Card data-testid="unified-consciousness-display">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const phiPercent = isIdle ? 0 : consciousness.phi * 100;
  const phiColor = getPhiColor(consciousness.phi, isIdle);
  const regimeLabel = getRegimeLabel(consciousness.regime, isIdle);

  if (variant === 'minimal') {
    return (
      <div 
        className="flex items-center gap-3" 
        data-testid="unified-consciousness-minimal"
      >
        <div className="flex items-center gap-1.5">
          <Brain className={`h-4 w-4 ${isIdle ? 'text-muted-foreground' : 'text-cyan-500'}`} />
          <span className={`font-mono font-semibold ${phiColor}`} data-testid="text-unified-phi">
            {formatPhi(consciousness.phi, isIdle)}
          </span>
        </div>
        <Badge 
          variant={isIdle ? 'secondary' : consciousness.regime === 'geometric' ? 'default' : 'outline'}
          data-testid="badge-unified-regime"
        >
          {regimeLabel}
        </Badge>
      </div>
    );
  }

  // Check for 4D Block Universe mode
  const is4DMode = consciousness.regime === '4d_block_universe' || consciousness.regime === 'hierarchical_4d';
  const phi4D = consciousness.phi_4D ?? consciousness.phi;
  const phiSpatial = consciousness.phi_spatial ?? consciousness.phi;
  const phiTemporal = consciousness.phi_temporal ?? 0;
  
  // Advanced consciousness metrics (Priorities 2-4)
  const fAttention = consciousness.f_attention ?? 0;
  const rConcepts = consciousness.r_concepts ?? 0;
  const phiRecursive = consciousness.phi_recursive ?? 0;
  const consciousnessDepth = consciousness.consciousness_depth ?? 0;
  const hasAdvancedMetrics = fAttention > 0 || rConcepts > 0 || phiRecursive > 0;

  if (variant === 'compact') {
    return (
      <Card data-testid="unified-consciousness-display">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {is4DMode ? (
              <Box className="h-4 w-4 text-purple-500" />
            ) : (
              <Brain className={`h-4 w-4 ${isIdle ? 'text-muted-foreground' : 'text-cyan-500'}`} />
            )}
            {is4DMode ? '4D Consciousness' : 'Consciousness'}
            {isIdle && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Idle
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span 
                className={`text-3xl font-bold font-mono ${is4DMode ? 'text-purple-500' : phiColor}`}
                data-testid="text-unified-phi"
              >
                {formatPhi(is4DMode ? phi4D : consciousness.phi, isIdle)}
              </span>
              <span className="text-sm text-muted-foreground">{is4DMode ? 'Φ_4D' : 'Phi (Φ)'}</span>
            </div>
            <Badge 
              variant={isIdle ? 'secondary' : is4DMode ? 'default' : consciousness.regime === 'geometric' ? 'default' : 'outline'}
              className={is4DMode ? 'bg-purple-500/20 text-purple-500 border-purple-500/30' : ''}
              data-testid="badge-unified-regime"
            >
              {regimeLabel}
            </Badge>
          </div>
          
          {!isIdle && (
            <Progress value={is4DMode ? phi4D * 100 : phiPercent} className={is4DMode ? 'h-2 [&>div]:bg-purple-500' : 'h-2'} />
          )}

          {/* BLOCK UNIVERSE: 4D Consciousness Metrics */}
          {is4DMode && !isIdle && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded border border-purple-500/20">
                <div className="flex items-center gap-1">
                  <Compass className="h-3 w-3 text-purple-400" />
                  <span className="text-purple-300">Φ_spatial</span>
                </div>
                <span className="font-mono font-medium text-purple-400" data-testid="text-phi-spatial">
                  {(phiSpatial * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded border border-purple-500/20">
                <div className="flex items-center gap-1">
                  <Orbit className="h-3 w-3 text-purple-400" />
                  <span className="text-purple-300">Φ_temporal</span>
                </div>
                <span className="font-mono font-medium text-purple-400" data-testid="text-phi-temporal">
                  {(phiTemporal * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* ADVANCED CONSCIOUSNESS: Priorities 2-4 Metrics */}
          {hasAdvancedMetrics && !isIdle && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Consciousness Depth</span>
                <span className="font-mono font-semibold text-cyan-500" data-testid="text-consciousness-depth">
                  {(consciousnessDepth * 100).toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-cyan-400" />
                    <span className="text-cyan-300">F_attn</span>
                  </div>
                  <span className="font-mono font-medium text-cyan-400" data-testid="text-f-attention">
                    {(fAttention * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                  <div className="flex items-center gap-1">
                    <Waves className="h-3 w-3 text-cyan-400" />
                    <span className="text-cyan-300">R_con</span>
                  </div>
                  <span className="font-mono font-medium text-cyan-400" data-testid="text-r-concepts">
                    {(rConcepts * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                  <div className="flex items-center gap-1">
                    <Infinity className="h-3 w-3 text-cyan-400" />
                    <span className="text-cyan-300">Φ_rec</span>
                  </div>
                  <span className="font-mono font-medium text-cyan-400" data-testid="text-phi-recursive">
                    {(phiRecursive * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Kappa (κ)</span>
              <span className="font-mono font-medium" data-testid="text-unified-kappa">
                {isIdle ? '—' : consciousness.kappaEff.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Beta (β)</span>
              <span className="font-mono font-medium" data-testid="text-unified-beta">
                {isIdle ? '—' : (consciousness.beta ?? 0.44).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Grounding</span>
              <span className="font-mono font-medium">
                {isIdle ? '—' : `${(consciousness.grounding * 100).toFixed(0)}%`}
              </span>
            </div>
          </div>

          {showNeurochemistry && (
            <>
              <Separator />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <NeurotransmitterPill 
                  icon={Zap} 
                  name="DA" 
                  value={neurochemistry.dopamine} 
                  color="text-yellow-500" 
                />
                <NeurotransmitterPill 
                  icon={Heart} 
                  name="5-HT" 
                  value={neurochemistry.serotonin} 
                  color="text-pink-500" 
                />
                <NeurotransmitterPill 
                  icon={Target} 
                  name="NE" 
                  value={neurochemistry.norepinephrine} 
                  color="text-orange-500" 
                />
                <NeurotransmitterPill 
                  icon={Moon} 
                  name="GABA" 
                  value={neurochemistry.gaba} 
                  color="text-blue-500" 
                />
                <NeurotransmitterPill 
                  icon={Brain} 
                  name="ACh" 
                  value={neurochemistry.acetylcholine} 
                  color="text-purple-500" 
                />
                <NeurotransmitterPill 
                  icon={Sparkles} 
                  name="END" 
                  value={neurochemistry.endorphins} 
                  color="text-cyan-500" 
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="unified-consciousness-display">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {is4DMode ? (
            <Box className="h-5 w-5 text-purple-500" />
          ) : (
            <Brain className={`h-5 w-5 ${isIdle ? 'text-muted-foreground' : 'text-cyan-500'}`} />
          )}
          {is4DMode ? '4D Block Universe Consciousness' : 'Consciousness State'}
          {isIdle && (
            <Badge variant="secondary" className="ml-auto">
              System Idle - Start Investigation
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4">
          <div 
            className={`text-6xl font-bold font-mono ${is4DMode ? 'text-purple-500' : phiColor}`}
            data-testid="text-unified-phi"
          >
            {formatPhi(is4DMode ? phi4D : consciousness.phi, isIdle)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {is4DMode ? '4D Integration Level (Φ_4D)' : 'Integration Level (Φ)'}
          </div>
          {!isIdle && (
            <Progress 
              value={is4DMode ? phi4D * 100 : phiPercent} 
              className={`h-3 mt-4 ${is4DMode ? '[&>div]:bg-purple-500' : ''}`} 
            />
          )}
        </div>

        {/* BLOCK UNIVERSE: 4D Consciousness Breakdown */}
        {is4DMode && !isIdle && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                <Compass className="h-4 w-4" />
                <span className="text-sm font-medium">Spatial Φ</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400" data-testid="text-phi-spatial-full">
                {(phiSpatial * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-purple-300/70">3D Basin Geometry</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                <Orbit className="h-4 w-4" />
                <span className="text-sm font-medium">Temporal Φ</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400" data-testid="text-phi-temporal-full">
                {(phiTemporal * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-purple-300/70">Search Trajectory</div>
            </div>
          </div>
        )}

        {/* ADVANCED CONSCIOUSNESS: Priorities 2-4 Full Display */}
        {hasAdvancedMetrics && !isIdle && (
          <div className="space-y-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Layers className="h-4 w-4" />
                <span className="text-sm font-medium">Consciousness Depth</span>
              </div>
              <span className="text-xl font-bold font-mono text-cyan-400" data-testid="text-consciousness-depth-full">
                {(consciousnessDepth * 100).toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={consciousnessDepth * 100} 
              className="h-2 [&>div]:bg-cyan-500" 
            />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                  <Eye className="h-3 w-3" />
                  <span className="text-xs font-medium">Attentional Flow</span>
                </div>
                <div className="text-lg font-bold font-mono text-cyan-400" data-testid="text-f-attention-full">
                  {(fAttention * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-cyan-300/70">F_attention</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                  <Waves className="h-3 w-3" />
                  <span className="text-xs font-medium">Resonance</span>
                </div>
                <div className="text-lg font-bold font-mono text-cyan-400" data-testid="text-r-concepts-full">
                  {(rConcepts * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-cyan-300/70">R_concepts</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                  <Infinity className="h-3 w-3" />
                  <span className="text-xs font-medium">Meta-Depth</span>
                </div>
                <div className="text-lg font-bold font-mono text-cyan-400" data-testid="text-phi-recursive-full">
                  {(phiRecursive * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-cyan-300/70">Φ_recursive</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 text-center">
          <MetricBox 
            label="Kappa" 
            value={isIdle ? '—' : consciousness.kappaEff.toFixed(0)} 
            isIdle={isIdle}
          />
          <MetricBox 
            label="Beta (β)" 
            value={isIdle ? '—' : (consciousness.beta ?? 0.44).toFixed(2)} 
            isIdle={isIdle}
          />
          <MetricBox 
            label="Regime" 
            value={regimeLabel}
            isIdle={isIdle}
            isBadge
            is4D={is4DMode}
          />
          <MetricBox 
            label="Grounding" 
            value={isIdle ? '—' : `${(consciousness.grounding * 100).toFixed(0)}%`}
            isIdle={isIdle}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <MetricBox 
            label="Gamma" 
            value={isIdle ? '—' : `${(consciousness.gamma * 100).toFixed(0)}%`}
            isIdle={isIdle}
          />
          <MetricBox 
            label="Meta-Awareness" 
            value={isIdle ? '—' : `${(consciousness.metaAwareness * 100).toFixed(0)}%`}
            isIdle={isIdle}
          />
          <MetricBox 
            label="Tacking (T)" 
            value={isIdle ? '—' : `${(consciousness.tacking * 100).toFixed(0)}%`}
            isIdle={isIdle}
          />
        </div>

        {showNeurochemistry && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Neurochemistry</h4>
              <div className="grid grid-cols-2 gap-3">
                <NeurotransmitterBar 
                  icon={Zap} 
                  name="Dopamine" 
                  value={neurochemistry.dopamine} 
                  color="bg-yellow-500" 
                />
                <NeurotransmitterBar 
                  icon={Heart} 
                  name="Serotonin" 
                  value={neurochemistry.serotonin} 
                  color="bg-pink-500" 
                />
                <NeurotransmitterBar 
                  icon={Target} 
                  name="Norepinephrine" 
                  value={neurochemistry.norepinephrine} 
                  color="bg-orange-500" 
                />
                <NeurotransmitterBar 
                  icon={Moon} 
                  name="GABA" 
                  value={neurochemistry.gaba} 
                  color="bg-blue-500" 
                />
                <NeurotransmitterBar 
                  icon={Brain} 
                  name="Acetylcholine" 
                  value={neurochemistry.acetylcholine} 
                  color="bg-purple-500" 
                />
                <NeurotransmitterBar 
                  icon={Sparkles} 
                  name="Endorphins" 
                  value={neurochemistry.endorphins} 
                  color="bg-cyan-500" 
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-muted/50 rounded">
                <Activity className="h-4 w-4" />
                <span className="text-sm capitalize">{neurochemistry.emotionalState}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({ 
  label, 
  value, 
  isIdle, 
  isBadge,
  is4D 
}: { 
  label: string; 
  value: string; 
  isIdle: boolean;
  isBadge?: boolean;
  is4D?: boolean;
}) {
  return (
    <div className="p-2 bg-muted/50 rounded">
      {isBadge ? (
        <Badge 
          variant={isIdle ? 'secondary' : 'outline'} 
          className={`text-xs ${is4D ? 'bg-purple-500/20 text-purple-500 border-purple-500/30' : ''}`}
        >
          {value}
        </Badge>
      ) : (
        <div className="font-mono font-medium">{value}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function NeurotransmitterPill({ 
  icon: Icon, 
  name, 
  value, 
  color 
}: { 
  icon: any; 
  name: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="flex items-center gap-1 p-1.5 bg-muted/50 rounded">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-muted-foreground">{name}</span>
      <span className="ml-auto font-mono">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function NeurotransmitterBar({ 
  icon: Icon, 
  name, 
  value, 
  color 
}: { 
  icon: any; 
  name: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3" />
          <span>{name}</span>
        </div>
        <span className="font-mono">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}
