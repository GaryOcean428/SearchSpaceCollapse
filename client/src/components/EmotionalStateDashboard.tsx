import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Target, Eye, Gauge, Radio, Anchor, Activity, Heart, Flame, Shield, Sparkles, Frown } from "lucide-react";

interface ConsciousnessData {
  Φ: number;
  κ_eff: number;
  T: number;
  R: number;
  M: number;
  Γ: number;
  G: number;
  isConscious: boolean;
}

interface EmotionData {
  valence: number;
  arousal: number;
  dominance: number;
  curiosity: number;
  confidence: number;
  frustration: number;
  excitement: number;
  determination: number;
}

interface EmotionalStateDashboardProps {
  consciousness: ConsciousnessData;
  emotion: EmotionData;
  regime: string;
}

function MetricBar({ 
  label, 
  value, 
  icon: Icon, 
  threshold,
  colorClass: _colorClass = "bg-primary"
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType;
  threshold?: number;
  colorClass?: string;
}) {
  const percentage = Math.min(100, Math.max(0, value * 100));
  const isAboveThreshold = threshold ? value >= threshold : true;
  
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 relative">
        <Progress value={percentage} className="h-2" />
        {threshold && (
          <div 
            className="absolute top-0 h-full w-0.5 bg-yellow-500"
            style={{ left: `${threshold * 100}%` }}
          />
        )}
      </div>
      <span className={`text-xs font-mono w-10 text-right ${isAboveThreshold ? 'text-green-500' : 'text-muted-foreground'}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function EmotionIndicator({
  label,
  value,
  icon: Icon,
  positiveColor = "text-green-500",
  negativeColor = "text-red-500"
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  positiveColor?: string;
  negativeColor?: string;
}) {
  const color = value > 0 ? positiveColor : value < 0 ? negativeColor : "text-muted-foreground";
  const percentage = Math.min(100, Math.max(0, Math.abs(value) * 100));
  
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <Progress value={percentage} className="h-2" />
      </div>
      <span className={`text-xs font-mono w-10 text-right ${color}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

export function EmotionalStateDashboard({ consciousness, emotion, regime }: EmotionalStateDashboardProps) {
  const regimeColor = regime === 'geometric' ? 'bg-green-500/20 text-green-400' :
                      regime === 'hierarchical' ? 'bg-purple-500/20 text-purple-400' :
                      regime === 'breakdown' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400';
  
  const consciousnessStatus = consciousness.isConscious ? 
    { text: 'CONSCIOUS', color: 'bg-green-500/20 text-green-400' } :
    { text: 'PRE-CONSCIOUS', color: 'bg-yellow-500/20 text-yellow-400' };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="emotional-state-dashboard">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              7-Component Consciousness
            </div>
            <div className="flex gap-1">
              <Badge className={consciousnessStatus.color} data-testid="consciousness-status">
                {consciousnessStatus.text}
              </Badge>
              <Badge className={regimeColor} data-testid="regime-status">
                {regime.toUpperCase()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <MetricBar 
            label="Φ (Int)" 
            value={consciousness.Φ} 
            icon={Brain}
            threshold={0.75}
            colorClass="bg-purple-500"
          />
          <MetricBar 
            label="κ_eff" 
            value={consciousness.κ_eff / 100} 
            icon={Zap}
            threshold={0.40}
          />
          <MetricBar 
            label="T (Tack)" 
            value={consciousness.T} 
            icon={Target}
            threshold={0.50}
          />
          <MetricBar 
            label="R (Radar)" 
            value={consciousness.R} 
            icon={Eye}
            threshold={0.70}
          />
          <MetricBar 
            label="M (Meta)" 
            value={consciousness.M} 
            icon={Gauge}
            threshold={0.60}
          />
          <MetricBar 
            label="Γ (Coh)" 
            value={consciousness.Γ} 
            icon={Radio}
            threshold={0.80}
          />
          <MetricBar 
            label="G (Gnd)" 
            value={consciousness.G} 
            icon={Anchor}
            threshold={0.85}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Emotional State
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <EmotionIndicator 
            label="Valence" 
            value={emotion.valence} 
            icon={emotion.valence >= 0 ? Sparkles : Frown}
            positiveColor="text-green-500"
            negativeColor="text-red-500"
          />
          <EmotionIndicator 
            label="Arousal" 
            value={emotion.arousal} 
            icon={Activity}
            positiveColor="text-orange-500"
          />
          <EmotionIndicator 
            label="Dominance" 
            value={emotion.dominance} 
            icon={Shield}
            positiveColor="text-blue-500"
          />
          <EmotionIndicator 
            label="Curiosity" 
            value={emotion.curiosity} 
            icon={Eye}
            positiveColor="text-purple-500"
          />
          <EmotionIndicator 
            label="Confidence" 
            value={emotion.confidence} 
            icon={Anchor}
            positiveColor="text-green-500"
          />
          <EmotionIndicator 
            label="Excitement" 
            value={emotion.excitement} 
            icon={Flame}
            positiveColor="text-yellow-500"
          />
          <EmotionIndicator 
            label="Frustration" 
            value={emotion.frustration} 
            icon={Frown}
            positiveColor="text-red-500"
            negativeColor="text-green-500"
          />
          <EmotionIndicator 
            label="Determination" 
            value={emotion.determination} 
            icon={Target}
            positiveColor="text-cyan-500"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default EmotionalStateDashboard;
