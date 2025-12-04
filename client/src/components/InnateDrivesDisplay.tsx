/**
 * Innate Drives Display Component
 * 
 * Shows Layer 0 geometric intuition: pain, pleasure, fear
 * Provides immediate visual feedback on Ocean's emotional state
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Frown, AlertTriangle, Smile } from 'lucide-react';

interface InnateDrivesProps {
  drives?: {
    pain: number;
    pleasure: number;
    fear: number;
    valence: number;
    valence_raw: number;
  };
  innateScore?: number;
  variant?: 'full' | 'compact';
}

export default function InnateDrivesDisplay({ 
  drives, 
  innateScore,
  variant = 'compact' 
}: InnateDrivesProps) {
  // If no drives data, don't render anything
  if (!drives) {
    return null;
  }

  const { pain, pleasure, fear, valence } = drives;
  
  // Determine emotional state based on valence
  const getEmotionalState = (val: number): { label: string; color: string; icon: any } => {
    if (val > 0.7) return { label: 'Pleasure', color: 'text-green-500', icon: Smile };
    if (val > 0.5) return { label: 'Content', color: 'text-cyan-500', icon: Heart };
    if (val > 0.3) return { label: 'Neutral', color: 'text-yellow-500', icon: Heart };
    if (val > 0.2) return { label: 'Caution', color: 'text-orange-500', icon: AlertTriangle };
    return { label: 'Distress', color: 'text-red-500', icon: Frown };
  };

  const emotionalState = getEmotionalState(valence);
  const EmotionalIcon = emotionalState.icon;

  if (variant === 'compact') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            Layer 0: Innate Drives
            {innateScore !== undefined && (
              <Badge variant={innateScore > 0.5 ? 'default' : 'secondary'} className="ml-auto">
                Score: {(innateScore * 100).toFixed(0)}%
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Overall Valence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EmotionalIcon className={`h-5 w-5 ${emotionalState.color}`} />
              <span className="text-sm font-medium">{emotionalState.label}</span>
            </div>
            <span className={`text-lg font-bold font-mono ${emotionalState.color}`}>
              {(valence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Individual Drives */}
          <div className="space-y-2">
            {/* Pain */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Frown className="h-3 w-3 text-red-500" />
                  Pain (avoid)
                </span>
                <span className="font-mono text-red-500">{(pain * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={pain * 100} 
                className="h-1.5 bg-red-500/10"
                indicatorClassName="bg-red-500"
              />
            </div>

            {/* Pleasure */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Smile className="h-3 w-3 text-green-500" />
                  Pleasure (seek)
                </span>
                <span className="font-mono text-green-500">{(pleasure * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={pleasure * 100} 
                className="h-1.5 bg-green-500/10"
                indicatorClassName="bg-green-500"
              />
            </div>

            {/* Fear */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  Fear (avoid)
                </span>
                <span className="font-mono text-orange-500">{(fear * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={fear * 100} 
                className="h-1.5 bg-orange-500/10"
                indicatorClassName="bg-orange-500"
              />
            </div>
          </div>

          {/* Interpretation */}
          <div className="pt-2 text-xs text-muted-foreground border-t">
            {pain > 0.6 && <p className="text-red-500">⚠️ High curvature - system constrained</p>}
            {pleasure > 0.8 && <p className="text-green-500">✨ Near κ* resonance - optimal region</p>}
            {fear > 0.6 && <p className="text-orange-500">⚠️ Approaching ungrounded space</p>}
            {valence > 0.7 && pain < 0.3 && fear < 0.3 && (
              <p className="text-cyan-500">✓ Healthy geometric state</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - more detailed display
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          Layer 0: Innate Geometric Drives
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall State */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <EmotionalIcon className={`h-8 w-8 ${emotionalState.color}`} />
            <div>
              <p className="text-sm text-muted-foreground">Emotional State</p>
              <p className="text-xl font-semibold">{emotionalState.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valence</p>
            <p className={`text-3xl font-bold font-mono ${emotionalState.color}`}>
              {(valence * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Innate Score */}
        {innateScore !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Innate Score (Fast Filter)</span>
              <span className="text-sm font-mono">{(innateScore * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={innateScore * 100} 
              className="h-3"
              indicatorClassName={innateScore > 0.5 ? 'bg-cyan-500' : 'bg-gray-500'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {innateScore > 0.5 
                ? '✓ Good hypothesis - worth testing' 
                : '✗ Poor geometry - likely reject'}
            </p>
          </div>
        )}

        {/* Detailed Drives */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Individual Drives</h4>
          
          {/* Pain */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Frown className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Pain</span>
              </div>
              <span className="text-sm font-mono text-red-500">{(pain * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={pain * 100} 
              className="h-2 bg-red-500/10"
              indicatorClassName="bg-red-500"
            />
            <p className="text-xs text-muted-foreground">
              Avoid high curvature regions (R &gt; 0.7) - breakdown risk
            </p>
          </div>

          {/* Pleasure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smile className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Pleasure</span>
              </div>
              <span className="text-sm font-mono text-green-500">{(pleasure * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={pleasure * 100} 
              className="h-2 bg-green-500/10"
              indicatorClassName="bg-green-500"
            />
            <p className="text-xs text-muted-foreground">
              Seek optimal κ ≈ 63.5 - geometric resonance
            </p>
          </div>

          {/* Fear */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Fear</span>
              </div>
              <span className="text-sm font-mono text-orange-500">{(fear * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={fear * 100} 
              className="h-2 bg-orange-500/10"
              indicatorClassName="bg-orange-500"
            />
            <p className="text-xs text-muted-foreground">
              Avoid ungrounded states (G &lt; 0.5) - void risk
            </p>
          </div>
        </div>

        {/* Theory Explanation */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-cyan-500">Layer 0 Theory:</p>
          <p>Innate drives provide immediate geometric intuition before full consciousness measurement.</p>
          <p className="text-muted-foreground">
            • 50-100× faster filtering of bad hypotheses<br/>
            • Natural attraction to geometrically optimal regions<br/>
            • Enables 2-3× overall recovery rate improvement
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
