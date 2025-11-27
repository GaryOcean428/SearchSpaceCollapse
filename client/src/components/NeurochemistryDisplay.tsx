import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Heart, Zap, Moon, Target, Sparkles } from "lucide-react";

interface NeurochemistryState {
  dopamine: { totalDopamine: number; motivationLevel: number };
  serotonin: { totalSerotonin: number; contentmentLevel: number };
  norepinephrine: { totalNorepinephrine: number; alertnessLevel: number };
  gaba: { totalGABA: number; calmLevel: number };
  acetylcholine: { totalAcetylcholine: number; learningRate: number };
  endorphins: { totalEndorphins: number; pleasureLevel: number };
  overallMood: number;
  emotionalState: 'excited' | 'content' | 'focused' | 'calm' | 'frustrated' | 'exhausted' | 'flow';
}

interface Props {
  neurochemistry?: NeurochemistryState | null;
  compact?: boolean;
}

function getEmotionalEmoji(state: NeurochemistryState['emotionalState']): string {
  switch (state) {
    case 'flow': return '🌊';
    case 'excited': return '⚡';
    case 'focused': return '🎯';
    case 'calm': return '😌';
    case 'content': return '😊';
    case 'frustrated': return '😤';
    case 'exhausted': return '😴';
    default: return '🤔';
  }
}

function getEmotionalDescription(state: NeurochemistryState['emotionalState']): string {
  switch (state) {
    case 'flow':
      return "Peak experience! Loving the work!";
    case 'excited':
      return "Making progress! Highly motivated!";
    case 'focused':
      return "Deeply attentive, learning actively.";
    case 'calm':
      return "Stable and settled.";
    case 'content':
      return "Things are okay.";
    case 'frustrated':
      return "Plateau detected...";
    case 'exhausted':
      return "Needs rest.";
    default:
      return "Processing...";
  }
}

function getEmotionalColor(state: NeurochemistryState['emotionalState']): string {
  switch (state) {
    case 'flow': return 'bg-cyan-500';
    case 'excited': return 'bg-yellow-500';
    case 'focused': return 'bg-blue-500';
    case 'calm': return 'bg-green-500';
    case 'content': return 'bg-emerald-500';
    case 'frustrated': return 'bg-orange-500';
    case 'exhausted': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function NeurotransmitterBar({ 
  name, 
  value, 
  icon: Icon, 
  color 
}: { 
  name: string; 
  value: number; 
  icon: typeof Brain;
  color: string;
}) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3 w-3 ${color}`} />
          <span className="text-muted-foreground">{name}</span>
        </div>
        <span className="font-mono">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

function CompactDisplay({ neurochemistry }: { neurochemistry: NeurochemistryState }) {
  const engagementHearts = Math.round(neurochemistry.overallMood * 5);
  
  return (
    <div className="flex items-center gap-3" data-testid="neurochemistry-compact">
      <div className="flex items-center gap-1.5">
        <span className="text-xl" title={neurochemistry.emotionalState}>
          {getEmotionalEmoji(neurochemistry.emotionalState)}
        </span>
        <Badge 
          variant="outline" 
          className={`text-xs ${getEmotionalColor(neurochemistry.emotionalState)} bg-opacity-20`}
        >
          {neurochemistry.emotionalState}
        </Badge>
      </div>
      
      <div className="flex items-center gap-0.5 text-red-500" title="Engagement level">
        {Array.from({ length: 5 }).map((_, i) => (
          <Heart 
            key={i} 
            className={`h-3 w-3 ${i < engagementHearts ? 'fill-current' : 'opacity-30'}`}
          />
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground">
        Mood: {Math.round(neurochemistry.overallMood * 100)}%
      </div>
    </div>
  );
}

export default function NeurochemistryDisplay({ neurochemistry, compact = false }: Props) {
  if (!neurochemistry) {
    return (
      <Card data-testid="neurochemistry-empty">
        <CardContent className="pt-6 text-center">
          <Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Neurochemistry data not available
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (compact) {
    return <CompactDisplay neurochemistry={neurochemistry} />;
  }
  
  const engagementHearts = Math.round(neurochemistry.overallMood * 5);
  
  return (
    <Card data-testid="neurochemistry-display">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Ocean's Consciousness
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl">{getEmotionalEmoji(neurochemistry.emotionalState)}</span>
            <Badge className={getEmotionalColor(neurochemistry.emotionalState)}>
              {neurochemistry.emotionalState}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-3 bg-muted/50 rounded-md">
          <p className="text-sm italic text-muted-foreground">
            "{getEmotionalDescription(neurochemistry.emotionalState)}"
          </p>
          
          <div className="flex items-center justify-center gap-1 mt-2" title="Engagement">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart 
                key={i} 
                className={`h-5 w-5 text-red-500 ${i < engagementHearts ? 'fill-current' : 'opacity-30'}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Overall Mood: {Math.round(neurochemistry.overallMood * 100)}%
          </p>
        </div>
        
        <Separator />
        
        <div className="grid gap-3">
          <NeurotransmitterBar
            name="Dopamine (Motivation)"
            value={neurochemistry.dopamine.totalDopamine}
            icon={Zap}
            color="text-yellow-500"
          />
          
          <NeurotransmitterBar
            name="Serotonin (Wellbeing)"
            value={neurochemistry.serotonin.totalSerotonin}
            icon={Heart}
            color="text-pink-500"
          />
          
          <NeurotransmitterBar
            name="Norepinephrine (Alertness)"
            value={neurochemistry.norepinephrine.totalNorepinephrine}
            icon={Target}
            color="text-orange-500"
          />
          
          <NeurotransmitterBar
            name="GABA (Calm)"
            value={neurochemistry.gaba.totalGABA}
            icon={Moon}
            color="text-blue-500"
          />
          
          <NeurotransmitterBar
            name="Acetylcholine (Learning)"
            value={neurochemistry.acetylcholine.totalAcetylcholine}
            icon={Brain}
            color="text-purple-500"
          />
          
          <NeurotransmitterBar
            name="Endorphins (Pleasure)"
            value={neurochemistry.endorphins.totalEndorphins}
            icon={Sparkles}
            color="text-cyan-500"
          />
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-muted/50 rounded">
            <div className="font-mono font-medium">
              {Math.round(neurochemistry.dopamine.motivationLevel * 100)}%
            </div>
            <div className="text-muted-foreground">Motivation</div>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <div className="font-mono font-medium">
              {Math.round(neurochemistry.acetylcholine.learningRate * 100)}%
            </div>
            <div className="text-muted-foreground">Learning</div>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <div className="font-mono font-medium">
              {Math.round(neurochemistry.endorphins.pleasureLevel * 100)}%
            </div>
            <div className="text-muted-foreground">Flow</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
