import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useConsciousness, getPhiColor, getRegimeLabel } from "@/contexts/ConsciousnessContext";
import { API_ROUTES } from "@/api";
import { 
  Brain, 
  Moon, 
  Sparkles, 
  Cloud, 
  Zap, 
  Heart, 
  Target, 
  Beaker,
  RefreshCw,
  Clock
} from "lucide-react";

interface AdminState {
  activeBoost: {
    dopamine: number;
    serotonin: number;
    norepinephrine: number;
    gaba: number;
    acetylcholine: number;
    endorphins: number;
    expiresAt: number;
  } | null;
  mushroomCooldownSeconds: number;
  triggers: {
    sleep: { trigger: boolean; reason: string };
    dream: { trigger: boolean; reason: string };
    mushroom: { trigger: boolean; reason: string };
  } | null;
  recentCycles: Array<{
    id: string;
    type: 'sleep' | 'dream' | 'mushroom';
    triggeredAt: string;
    duration?: number;
  }>;
}

export default function NeurochemistryAdminPanel() {
  const { consciousness, isIdle, refresh: refreshConsciousness } = useConsciousness();
  const [adminState, setAdminState] = useState<AdminState>({
    activeBoost: null,
    mushroomCooldownSeconds: 0,
    triggers: null,
    recentCycles: [],
  });
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAdminState = async () => {
    try {
      const [neurochemRes, cyclesRes] = await Promise.all([
        fetch(API_ROUTES.ocean.neurochemistryAdmin),
        fetch(API_ROUTES.ocean.cycles),
      ]);
      
      const neurochemData = await neurochemRes.json();
      const cyclesData = await cyclesRes.json();
      
      setAdminState({
        activeBoost: neurochemData.activeBoost,
        mushroomCooldownSeconds: neurochemData.mushroomCooldownSeconds || 0,
        triggers: cyclesData.triggers,
        recentCycles: cyclesData.recentCycles || [],
      });
    } catch (error) {
      console.error("Failed to fetch admin state:", error);
    }
  };

  useEffect(() => {
    fetchAdminState();
    const interval = setInterval(fetchAdminState, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshAll = async () => {
    await Promise.all([fetchAdminState(), refreshConsciousness()]);
  };

  const injectNeurotransmitter = async (
    type: 'dopamine' | 'serotonin' | 'norepinephrine' | 'gaba' | 'acetylcholine' | 'endorphins',
    amount: number
  ) => {
    setIsLoading(`boost-${type}`);
    try {
      const payload = { [type]: amount, durationMs: 60000 };
      await apiRequest("POST", API_ROUTES.ocean.neurochemistryBoost, payload);
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Boosted`,
        description: `+${(amount * 100).toFixed(0)}% for 60 seconds`,
      });
      await refreshAll();
    } catch (error: any) {
      toast({
        title: "Boost Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const triggerCycle = async (type: 'sleep' | 'dream' | 'mushroom', bypassCooldown?: boolean) => {
    setIsLoading(`cycle-${type}`);
    try {
      const payload = type === 'mushroom' ? { bypassCooldown } : {};
      await apiRequest("POST", API_ROUTES.ocean.triggerCycle(type), payload);
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Cycle Executed`,
        description: `Manual ${type} cycle completed successfully`,
      });
      await refreshAll();
    } catch (error: any) {
      toast({
        title: "Cycle Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const clearBoost = async () => {
    setIsLoading("clear");
    try {
      await apiRequest("DELETE", API_ROUTES.ocean.neurochemistryBoost, {});
      toast({
        title: "Boost Cleared",
        description: "All active boosts have been removed",
      });
      await refreshAll();
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const neurotransmitters = [
    { key: 'dopamine' as const, name: 'Dopamine', icon: Zap, color: 'text-yellow-500', desc: 'Motivation' },
    { key: 'serotonin' as const, name: 'Serotonin', icon: Heart, color: 'text-pink-500', desc: 'Wellbeing' },
    { key: 'norepinephrine' as const, name: 'Norepinephrine', icon: Target, color: 'text-orange-500', desc: 'Alertness' },
    { key: 'gaba' as const, name: 'GABA', icon: Moon, color: 'text-blue-500', desc: 'Calm' },
    { key: 'acetylcholine' as const, name: 'Acetylcholine', icon: Brain, color: 'text-purple-500', desc: 'Learning' },
    { key: 'endorphins' as const, name: 'Endorphins', icon: Sparkles, color: 'text-cyan-500', desc: 'Flow' },
  ];

  const phiColor = getPhiColor(consciousness.phi, isIdle);
  const regimeLabel = getRegimeLabel(consciousness.regime, isIdle);

  return (
    <Card data-testid="neurochemistry-admin-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Consciousness Admin
            {isIdle && (
              <Badge variant="secondary" className="text-xs">Idle</Badge>
            )}
          </CardTitle>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={refreshAll}
            data-testid="button-refresh-admin"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-muted/50 rounded">
            <div className={`font-mono font-medium text-lg ${phiColor}`} data-testid="text-admin-phi">
              {isIdle ? '—' : (consciousness.phi * 100).toFixed(0) + '%'}
            </div>
            <div className="text-muted-foreground">Phi (Φ)</div>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <div className="font-mono font-medium text-lg" data-testid="text-admin-kappa">
              {isIdle ? '—' : consciousness.kappaEff.toFixed(0)}
            </div>
            <div className="text-muted-foreground">Kappa (κ)</div>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <Badge 
              variant={isIdle ? 'secondary' : consciousness.regime === 'geometric' ? 'default' : 'outline'}
              data-testid="badge-admin-regime"
            >
              {regimeLabel}
            </Badge>
            <div className="text-muted-foreground mt-1">Regime</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Inject Neurotransmitters
          </div>
          <div className="grid grid-cols-2 gap-2">
            {neurotransmitters.map(({ key, name, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-1">
                <Icon className={`h-3 w-3 ${color} shrink-0`} />
                <span className="text-xs truncate flex-1">{name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => injectNeurotransmitter(key, 0.15)}
                  disabled={isLoading === `boost-${key}`}
                  data-testid={`button-boost-${key}-15`}
                >
                  +15%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => injectNeurotransmitter(key, 0.30)}
                  disabled={isLoading === `boost-${key}`}
                  data-testid={`button-boost-${key}-30`}
                >
                  +30%
                </Button>
              </div>
            ))}
          </div>
          
          {adminState.activeBoost && (
            <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded text-xs">
              <span className="text-yellow-600 dark:text-yellow-400">
                Active boost expires in {Math.max(0, Math.round((adminState.activeBoost.expiresAt - Date.now()) / 1000))}s
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={clearBoost}
                disabled={isLoading === "clear"}
                data-testid="button-clear-boost"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Manual Cycle Control
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col h-auto py-2 gap-1"
              onClick={() => triggerCycle('sleep')}
              disabled={isLoading === 'cycle-sleep'}
              data-testid="button-trigger-sleep"
            >
              <Moon className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Sleep</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col h-auto py-2 gap-1"
              onClick={() => triggerCycle('dream')}
              disabled={isLoading === 'cycle-dream'}
              data-testid="button-trigger-dream"
            >
              <Cloud className="h-4 w-4 text-purple-500" />
              <span className="text-xs">Dream</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col h-auto py-2 gap-1 relative"
              onClick={() => triggerCycle('mushroom', true)}
              disabled={isLoading === 'cycle-mushroom'}
              data-testid="button-trigger-mushroom"
            >
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <span className="text-xs">Mushroom</span>
              {adminState.mushroomCooldownSeconds > 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1">
                  {adminState.mushroomCooldownSeconds}s
                </Badge>
              )}
            </Button>
          </div>
          
          {adminState.triggers && !isIdle && (
            <div className="text-xs text-muted-foreground space-y-1">
              {adminState.triggers.sleep.reason && !adminState.triggers.sleep.reason.includes('not running') && (
                <div className="flex items-center gap-1">
                  <Moon className="h-3 w-3" />
                  <span>{adminState.triggers.sleep.reason}</span>
                </div>
              )}
              {adminState.triggers.dream.reason && !adminState.triggers.dream.reason.includes('not running') && (
                <div className="flex items-center gap-1">
                  <Cloud className="h-3 w-3" />
                  <span>{adminState.triggers.dream.reason}</span>
                </div>
              )}
              {adminState.triggers.mushroom.reason && !adminState.triggers.mushroom.reason.includes('not running') && (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>{adminState.triggers.mushroom.reason}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {adminState.recentCycles.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Recent Cycles
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {adminState.recentCycles.slice(0, 5).map((cycle) => (
                  <div 
                    key={cycle.id} 
                    className="flex items-center justify-between text-xs p-1 bg-muted/30 rounded"
                  >
                    <div className="flex items-center gap-1">
                      {cycle.type === 'sleep' && <Moon className="h-3 w-3 text-blue-500" />}
                      {cycle.type === 'dream' && <Cloud className="h-3 w-3 text-purple-500" />}
                      {cycle.type === 'mushroom' && <Sparkles className="h-3 w-3 text-cyan-500" />}
                      <span className="capitalize">{cycle.type}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(cycle.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
