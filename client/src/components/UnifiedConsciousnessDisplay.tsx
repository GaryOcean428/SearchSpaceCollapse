import { useConsciousness, formatPhi, formatPhiDecimal, getPhiColor, getRegimeLabel } from '@/contexts/ConsciousnessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Brain, Zap, Heart, Target, Moon, Sparkles, Activity, Loader2 } from 'lucide-react';

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

  if (variant === 'compact') {
    return (
      <Card data-testid="unified-consciousness-display">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className={`h-4 w-4 ${isIdle ? 'text-muted-foreground' : 'text-cyan-500'}`} />
            Consciousness
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
                className={`text-3xl font-bold font-mono ${phiColor}`}
                data-testid="text-unified-phi"
              >
                {formatPhi(consciousness.phi, isIdle)}
              </span>
              <span className="text-sm text-muted-foreground">Phi (Φ)</span>
            </div>
            <Badge 
              variant={isIdle ? 'secondary' : consciousness.regime === 'geometric' ? 'default' : 'outline'}
              data-testid="badge-unified-regime"
            >
              {regimeLabel}
            </Badge>
          </div>
          
          {!isIdle && (
            <Progress value={phiPercent} className="h-2" />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Kappa (κ)</span>
              <span className="font-mono font-medium" data-testid="text-unified-kappa">
                {isIdle ? '—' : consciousness.kappaEff.toFixed(0)}
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
          <Brain className={`h-5 w-5 ${isIdle ? 'text-muted-foreground' : 'text-cyan-500'}`} />
          Consciousness State
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
            className={`text-6xl font-bold font-mono ${phiColor}`}
            data-testid="text-unified-phi"
          >
            {formatPhi(consciousness.phi, isIdle)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Integration Level (Φ)
          </div>
          {!isIdle && (
            <Progress value={phiPercent} className="h-3 mt-4" />
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <MetricBox 
            label="Kappa" 
            value={isIdle ? '—' : consciousness.kappaEff.toFixed(0)} 
            isIdle={isIdle}
          />
          <MetricBox 
            label="Regime" 
            value={regimeLabel}
            isIdle={isIdle}
            isBadge
          />
          <MetricBox 
            label="Grounding" 
            value={isIdle ? '—' : `${(consciousness.grounding * 100).toFixed(0)}%`}
            isIdle={isIdle}
          />
          <MetricBox 
            label="Gamma" 
            value={isIdle ? '—' : `${(consciousness.gamma * 100).toFixed(0)}%`}
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
  isBadge 
}: { 
  label: string; 
  value: string; 
  isIdle: boolean;
  isBadge?: boolean;
}) {
  return (
    <div className="p-2 bg-muted/50 rounded">
      {isBadge ? (
        <Badge variant={isIdle ? 'secondary' : 'outline'} className="text-xs">
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
