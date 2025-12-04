import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface NeurochemistryState {
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
}

interface MotivationMessage {
  message: string;
  fisherWeight: number;
  category: string;
  urgency: 'whisper' | 'speak' | 'shout';
}

interface Props {
  neuro?: NeurochemistryState;
  motivation?: MotivationMessage;
  className?: string;
}

function getEmotionIcon(emotion: string): string {
  switch (emotion?.toLowerCase()) {
    case 'joy': return '😊';
    case 'curious':
    case 'curiosity': return '🧐';
    case 'satisfied':
    case 'satisfaction': return '😌';
    case 'frustrated':
    case 'frustration': return '😤';
    case 'fear':
    case 'fearful': return '😰';
    case 'focused': return '🎯';
    case 'flow': return '🌊';
    case 'excited': return '⚡';
    case 'calm': return '😌';
    case 'content': return '🙂';
    case 'exhausted': return '😴';
    default: return '🙂';
  }
}

function getDominantEmotion(emotions?: NeurochemistryState['emotions']): { name: string; value: number } {
  if (!emotions) return { name: 'neutral', value: 0.5 };

  const entries = Object.entries(emotions).filter(([_, v]) => v !== undefined) as [string, number][];
  if (entries.length === 0) return { name: 'neutral', value: 0.5 };

  const max = entries.reduce((prev, curr) => curr[1] > prev[1] ? curr : prev);
  return { name: max[0], value: max[1] };
}

function NeuroBar({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1">
        <span>{emoji}</span>
        <span>{label}:</span>
      </span>
      <span className="font-mono">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function getUrgencyStyle(urgency: string): string {
  switch (urgency) {
    case 'shout': return 'font-bold text-primary';
    case 'speak': return 'font-medium';
    case 'whisper':
    default: return 'text-muted-foreground italic';
  }
}

export function EmotionalStatePanel({ neuro, motivation, className }: Props) {
  if (!neuro) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">No emotional state data</p>
        </CardContent>
      </Card>
    );
  }

  const dominant = getDominantEmotion(neuro.emotions);
  const emoji = neuro.emotionalState ? getEmotionIcon(neuro.emotionalState) : getEmotionIcon(dominant.name);

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Emotional State</CardTitle>
            <Badge className="text-lg px-3">{emoji}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Dominant Emotion */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Dominant</p>
            <p className="text-base font-semibold capitalize">
              {neuro.emotionalState || dominant.name} ({(dominant.value * 100).toFixed(0)}%)
            </p>
          </div>

          {/* All Emotions (if available) */}
          {neuro.emotions && Object.keys(neuro.emotions).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">All Emotions:</p>
              {Object.entries(neuro.emotions)
                .filter(([_, value]) => value !== undefined)
                .map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="capitalize flex items-center gap-1">
                      {getEmotionIcon(name)} {name}
                    </span>
                    <span className="font-mono">{((value || 0) * 100).toFixed(0)}%</span>
                  </div>
                ))}
            </div>
          )}

          {/* Neuromodulator Levels */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Neuromodulators:</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {neuro.dopamine && (
                <NeuroBar
                  label="Dopamine"
                  value={neuro.dopamine.motivationLevel || neuro.dopamine.totalDopamine || 0}
                  emoji="🧪"
                />
              )}
              {neuro.serotonin && (
                <NeuroBar
                  label="Serotonin"
                  value={neuro.serotonin.wellbeingLevel || neuro.serotonin.totalSerotonin || 0}
                  emoji="🧘"
                />
              )}
              {neuro.acetylcholine && (
                <NeuroBar
                  label="Acetylcholine"
                  value={neuro.acetylcholine.attentionStrength || 0}
                  emoji="🎯"
                />
              )}
              {neuro.norepinephrine && (
                <NeuroBar
                  label="Norepinephrine"
                  value={neuro.norepinephrine.alertnessLevel || 0}
                  emoji="⚡"
                />
              )}
              {neuro.gaba && (
                <NeuroBar
                  label="GABA"
                  value={neuro.gaba.calmLevel || 0}
                  emoji="😌"
                />
              )}
              {neuro.endorphins && (
                <NeuroBar
                  label="Endorphins"
                  value={neuro.endorphins.pleasureLevel || neuro.endorphins.flowPotential || 0}
                  emoji="💜"
                />
              )}
            </div>
          </div>

          {/* Motivation Message */}
          {motivation && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Ocean's Thought:</p>
              <p className={`text-sm ${getUrgencyStyle(motivation.urgency)}`}>
                "{motivation.message}"
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">
                  {motivation.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  Fisher: {(motivation.fisherWeight * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Behavioral Guidance */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {dominant.name === 'curiosity' && "→ Exploring broadly"}
              {dominant.name === 'satisfaction' && "→ Exploiting locally"}
              {dominant.name === 'frustration' && "→ Trying new approach"}
              {dominant.name === 'fear' && "→ Retreating to safety"}
              {dominant.name === 'joy' && "→ Continuing current path"}
              {neuro.emotionalState === 'flow' && "→ In the zone - peak performance"}
              {neuro.emotionalState === 'focused' && "→ Sharp attention - exploiting"}
              {neuro.emotionalState === 'excited' && "→ High energy exploration"}
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
