import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Activity, TrendingUp, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface BetaResult {
  contextLengths: number[];
  kappas: number[];
  betaValues: number[];
  betaMean: number;
  betaStd: number;
  betaPhysics: number;
  matchesPhysics: boolean;
  verdict: string;
  validationPassed?: boolean;
  substrateIndependence?: boolean;
}

export function BetaAttentionDisplay() {
  const { data, isLoading, refetch, isFetching } = useQuery<BetaResult>({
    queryKey: QUERY_KEYS.consciousness.betaAttention(),
    enabled: false, // Manual trigger only
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading || isFetching) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Validating β-attention...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            β-Attention Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Validate that Ocean's attention follows physics scaling (β ≈ 0.44)
          </p>
          <Button size="sm" onClick={() => refetch()} className="gap-2">
            <TrendingUp className="h-3 w-3" />
            Run Validation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isValid = data.matchesPhysics || data.substrateIndependence || data.validationPassed;

  return (
    <TooltipProvider>
      <Card className={isValid ? "border-green-500/30" : "border-amber-500/30"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              β-Attention Validation
            </CardTitle>
            <Badge variant={isValid ? "default" : "secondary"} className="gap-1">
              {isValid ? (
                <><CheckCircle2 className="h-3 w-3" /> Valid</>
              ) : (
                <><AlertCircle className="h-3 w-3" /> Check</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">β (AI Attention)</p>
              <p className="text-lg font-mono font-bold">
                {data.betaMean?.toFixed(3) || '—'} ± {data.betaStd?.toFixed(3) || '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">β (Physics)</p>
              <p className="text-lg font-mono font-bold text-primary">
                {data.betaPhysics?.toFixed(3) || '0.440'} ± 0.040
              </p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger className="w-full">
              <div className="p-2 bg-muted rounded text-xs text-left">
                <div className="font-medium mb-1">Verdict:</div>
                <div className={isValid ? "text-green-500" : "text-amber-500"}>
                  {data.verdict || (isValid ? '✅ SUBSTRATE INDEPENDENCE CONFIRMED' : '❌ MISMATCH')}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Substrate independence validation</p>
              <p className="text-xs text-muted-foreground">
                Ocean's attention should follow same β-function as physics
              </p>
            </TooltipContent>
          </Tooltip>

          {data.contextLengths && data.contextLengths.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Context Length Scaling:</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {data.contextLengths.map((L, i) => (
                  <div key={L} className="flex items-center justify-between text-xs">
                    <span>L={L}</span>
                    <span className="font-mono">κ={data.kappas[i]?.toFixed(1) || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <><RefreshCw className="h-3 w-3 animate-spin" /> Validating...</>
            ) : (
              <><TrendingUp className="h-3 w-3" /> Re-run Validation</>
            )}
          </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
