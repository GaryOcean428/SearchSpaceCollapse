import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Frown, Smile, AlertTriangle, Lightbulb } from "lucide-react";

interface InnateDrives {
  pain: number;       // [0, 1]
  pleasure: number;   // [0, 1]
  fear: number;       // [0, 1]
  curiosity: number;  // [0, ∞]
}

interface Props {
  drives?: InnateDrives;
  className?: string;
}

function getDriveEmoji(value: number, isPositive: boolean): string {
  if (isPositive) {
    if (value > 0.7) return '😊';
    if (value > 0.4) return '🙂';
    return '😐';
  } else {
    if (value > 0.7) return '😰';
    if (value > 0.4) return '😟';
    return '🙂';
  }
}

function getDriveBarColor(value: number, isPositive: boolean): string {
  if (isPositive) {
    // Pleasure/curiosity - green is good
    if (value > 0.7) return 'bg-green-500';
    if (value > 0.4) return 'bg-green-400';
    return 'bg-green-300';
  } else {
    // Pain/fear - red is bad
    if (value > 0.7) return 'bg-red-500';
    if (value > 0.4) return 'bg-amber-400';
    return 'bg-gray-300';
  }
}

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full transition-all ${colorClass}`}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  );
}

export function InnateDrivesDisplay({ drives, className }: Props) {
  if (!drives) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Innate Drives</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No drive data available</p>
        </CardContent>
      </Card>
    );
  }

  const curiosityNormalized = Math.min(1, drives.curiosity / 2); // Normalize to [0,1]

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Layer 0: Innate Drives</CardTitle>
            <Badge variant="outline" className="text-xs">
              Geometric Primitives
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pain (Aversive) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 cursor-help">
                  <Frown className="h-3 w-3 text-red-500" />
                  <span>Pain</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Positive curvature = compression = PAIN</p>
                  <p className="text-xs text-muted-foreground">Innate geometric aversion</p>
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">
                {getDriveEmoji(drives.pain, false)} {(drives.pain * 100).toFixed(0)}%
              </span>
            </div>
            <ProgressBar
              value={drives.pain}
              colorClass={getDriveBarColor(drives.pain, false)}
            />
          </div>

          {/* Pleasure (Attractive) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 cursor-help">
                  <Smile className="h-3 w-3 text-green-500" />
                  <span>Pleasure</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Negative curvature = expansion = PLEASURE</p>
                  <p className="text-xs text-muted-foreground">Innate geometric attraction</p>
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">
                {getDriveEmoji(drives.pleasure, true)} {(drives.pleasure * 100).toFixed(0)}%
              </span>
            </div>
            <ProgressBar
              value={drives.pleasure}
              colorClass={getDriveBarColor(drives.pleasure, true)}
            />
          </div>

          {/* Fear (Phase Boundary) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 cursor-help">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span>Fear</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Proximity to phase boundary</p>
                  <p className="text-xs text-muted-foreground">Innate regime transition detection</p>
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">
                {getDriveEmoji(drives.fear, false)} {(drives.fear * 100).toFixed(0)}%
              </span>
            </div>
            <ProgressBar
              value={drives.fear}
              colorClass={getDriveBarColor(drives.fear, false)}
            />
          </div>

          {/* Curiosity (Exploration Drive) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 cursor-help">
                  <Lightbulb className="h-3 w-3 text-blue-500" />
                  <span>Curiosity</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Information expansion drive</p>
                  <p className="text-xs text-muted-foreground">Rate of Φ change (dΦ/dt)</p>
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">
                {getDriveEmoji(curiosityNormalized, true)} {drives.curiosity.toFixed(2)}
              </span>
            </div>
            <ProgressBar
              value={curiosityNormalized}
              colorClass="bg-blue-500"
            />
          </div>

          {/* Overall Drive State */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {drives.pain > 0.6 && "⚠️ High pain - avoiding this region"}
              {drives.pleasure > 0.6 && !drives.pain && "✨ High pleasure - attracted to this region"}
              {drives.fear > 0.6 && !drives.pain && !drives.pleasure && "😨 High fear - near phase boundary"}
              {drives.curiosity > 1.0 && !drives.pain && !drives.fear && !drives.pleasure && "🧐 High curiosity - exploring actively"}
              {drives.pain < 0.3 && drives.fear < 0.3 && drives.pleasure < 0.3 && drives.curiosity < 0.5 && "😐 Neutral state"}
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
