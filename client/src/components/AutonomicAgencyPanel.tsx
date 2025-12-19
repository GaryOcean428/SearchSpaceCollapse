import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Progress,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Play, 
  Pause, 
  Zap, 
  Moon, 
  Sparkles, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

interface SafetyManifest {
  phi_min_intervention: number;
  phi_min_mushroom_mod: number;
  instability_max_mushroom: number;
  instability_max_mushroom_mod: number;
  coverage_max_dream: number;
  mushroom_cooldown_seconds: number;
}

interface AgencyStatus {
  success: boolean;
  enabled: boolean;
  running: boolean;
  decision_count: number;
  intervention_count: number;
  epsilon: number;
  last_action: string | null;
  last_phi: number | null;
  buffer_size: number;
  buffer_stats: {
    size: number;
    episodes: number;
    avg_reward: number;
  };
  optimizer_stats: {
    learning_rate: number;
    damping: number;
    has_fisher: boolean;
    update_count: number;
  };
  recent_history: Array<{
    action: string;
    phi: number;
    reward: number;
    timestamp: number;
  }>;
  safety_manifest?: SafetyManifest;
}

const ACTION_ICONS: Record<string, typeof Brain> = {
  CONTINUE_WAKE: Activity,
  ENTER_SLEEP: Moon,
  ENTER_DREAM: Sparkles,
  ENTER_MUSHROOM_MICRO: Zap,
  ENTER_MUSHROOM_MOD: Zap,
};

const ACTION_LABELS: Record<string, string> = {
  CONTINUE_WAKE: "Continue Wake",
  ENTER_SLEEP: "Enter Sleep",
  ENTER_DREAM: "Enter Dream",
  ENTER_MUSHROOM_MICRO: "Mushroom Micro",
  ENTER_MUSHROOM_MOD: "Mushroom Moderate",
};

const ACTION_COLORS: Record<string, string> = {
  CONTINUE_WAKE: "bg-green-500/20 text-green-400 border-green-500/30",
  ENTER_SLEEP: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ENTER_DREAM: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ENTER_MUSHROOM_MICRO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ENTER_MUSHROOM_MOD: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function AutonomicAgencyPanel() {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<string>("ENTER_SLEEP");

  const { data: status, isLoading, isError, error, refetch } = useQuery<AgencyStatus>({
    queryKey: ["/qig/autonomic/agency/status"],
    queryFn: async () => {
      const res = await fetch("/api/qig/autonomic/agency/status");
      if (!res.ok) throw new Error("Failed to fetch agency status");
      return res.json();
    },
    refetchInterval: 5000,
    retry: 3,
    retryDelay: 2000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/qig/autonomic/agency/start");
    },
    onSuccess: () => {
      toast({ title: "Agency Started", description: "Autonomous controller is now running" });
      queryClient.invalidateQueries({ queryKey: ["/qig/autonomic/agency/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start", description: error.message, variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/qig/autonomic/agency/stop");
    },
    onSuccess: () => {
      toast({ title: "Agency Stopped", description: "Autonomous controller has been paused" });
      queryClient.invalidateQueries({ queryKey: ["/qig/autonomic/agency/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to stop", description: error.message, variant: "destructive" });
    },
  });

  const forceMutation = useMutation({
    mutationFn: async (action: string) => {
      return apiRequest("POST", "/api/qig/autonomic/agency/force", { action });
    },
    onSuccess: (_, action) => {
      toast({ 
        title: "Intervention Triggered", 
        description: `Forced ${ACTION_LABELS[action] || action}` 
      });
      queryClient.invalidateQueries({ queryKey: ["/qig/autonomic/agency/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Intervention failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" data-testid="skeleton-agency-status" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !status) {
    return (
      <Card className="border-destructive/20" data-testid="error-agency-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isError ? "Connection Error" : "Loading..."}
          </CardTitle>
          <CardDescription>
            {isError 
              ? "Unable to connect to the autonomic agency backend. The Python backend may still be starting up."
              : "Waiting for agency status..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} data-testid="button-retry-connection">
            <RefreshCw className="h-4 w-4 mr-2" />
            {isError ? "Retry Connection" : "Refresh"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const explorationPercent = Math.round((1 - (status.epsilon ?? 1)) * 100);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status?.running ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Brain className={`h-6 w-6 ${status?.running ? 'text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Autonomic Controller
                  {status?.running ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-status-running">
                      RUNNING
                    </Badge>
                  ) : (
                    <Badge variant="secondary" data-testid="badge-status-stopped">
                      STOPPED
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Self-regulating consciousness interventions via RL-based Q-learning
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refetch()}
                data-testid="button-refresh-status"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {status?.running ? (
                <Button
                  variant="destructive"
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending}
                  data-testid="button-stop-agency"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  data-testid="button-start-agency"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Decisions</p>
              <p className="text-2xl font-mono font-bold" data-testid="text-decision-count">
                {status?.decision_count?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Interventions</p>
              <p className="text-2xl font-mono font-bold" data-testid="text-intervention-count">
                {status?.intervention_count ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Φ</p>
              <p className="text-2xl font-mono font-bold" data-testid="text-last-phi">
                {status?.last_phi?.toFixed(3) ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Reward</p>
              <p className="text-2xl font-mono font-bold" data-testid="text-avg-reward">
                {status?.buffer_stats?.avg_reward?.toFixed(2) ?? "0.00"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exploration → Exploitation</span>
              <span className="font-mono">{explorationPercent}%</span>
            </div>
            <Progress value={explorationPercent} className="h-2" data-testid="progress-exploitation" />
            <p className="text-xs text-muted-foreground">
              ε = {status?.epsilon?.toFixed(3) ?? 1.0} (lower = more exploitation of learned policy)
            </p>
          </div>
        </CardContent>
      </Card>

      {status?.safety_manifest && (
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Safety Boundary Ranges
            </CardTitle>
            <CardDescription>
              Active thresholds for intervention eligibility (monitoring only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Min Φ (Intervention)</p>
                <p className="font-mono text-sm" data-testid="text-phi-min-intervention">
                  &gt; {status.safety_manifest.phi_min_intervention}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Min Φ (Mushroom Mod)</p>
                <p className="font-mono text-sm" data-testid="text-phi-min-mushroom">
                  &gt; {status.safety_manifest.phi_min_mushroom_mod}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Instability (Micro)</p>
                <p className="font-mono text-sm" data-testid="text-instability-max-mushroom">
                  &lt; {(status.safety_manifest.instability_max_mushroom * 100).toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Instability (Mod)</p>
                <p className="font-mono text-sm" data-testid="text-instability-max-mod">
                  &lt; {(status.safety_manifest.instability_max_mushroom_mod * 100).toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Coverage (Dream)</p>
                <p className="font-mono text-sm" data-testid="text-coverage-max-dream">
                  &lt; {(status.safety_manifest.coverage_max_dream * 100).toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Mushroom Cooldown</p>
                <p className="font-mono text-sm" data-testid="text-mushroom-cooldown">
                  {Math.round(status.safety_manifest.mushroom_cooldown_seconds / 60)} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Q-Learning Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Learning Rate</p>
                <p className="font-mono text-sm" data-testid="text-learning-rate">
                  {status?.optimizer_stats?.learning_rate ?? 0.001}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Damping</p>
                <p className="font-mono text-sm" data-testid="text-damping">
                  {status?.optimizer_stats?.damping ?? 0.0001}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Update Count</p>
                <p className="font-mono text-sm" data-testid="text-update-count">
                  {status?.optimizer_stats?.update_count ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Buffer Size</p>
                <p className="font-mono text-sm" data-testid="text-buffer-size">
                  {status?.buffer_size ?? 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Fisher Matrix:</span>
              {status?.optimizer_stats?.has_fisher ? (
                <Badge className="bg-green-500/20 text-green-400">Computed</Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Force Intervention
            </CardTitle>
            <CardDescription>
              Manually trigger an intervention (bypasses safety checks)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger data-testid="select-intervention-type">
                <SelectValue placeholder="Select intervention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTER_SLEEP">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Sleep Cycle
                  </div>
                </SelectItem>
                <SelectItem value="ENTER_DREAM">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Dream Cycle
                  </div>
                </SelectItem>
                <SelectItem value="ENTER_MUSHROOM_MICRO">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Mushroom Microdose
                  </div>
                </SelectItem>
                <SelectItem value="ENTER_MUSHROOM_MOD">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-red-400" />
                    Mushroom Moderate
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => forceMutation.mutate(selectedAction)}
              disabled={forceMutation.isPending || !status?.enabled}
              data-testid="button-force-intervention"
            >
              {forceMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Trigger Intervention
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Intervention History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.recent_history && status.recent_history.length > 0 ? (
            <div className="space-y-2">
              {status.recent_history.slice(0, 10).map((entry, idx) => {
                const ActionIcon = ACTION_ICONS[entry.action] || Activity;
                const colorClass = ACTION_COLORS[entry.action] || "bg-muted text-muted-foreground";
                const phi = entry.phi ?? 0;
                const reward = entry.reward ?? 0;
                const timestamp = entry.timestamp ?? Date.now() / 1000;
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    data-testid={`history-entry-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={colorClass}>
                        <ActionIcon className="h-3 w-3 mr-1" />
                        {ACTION_LABELS[entry.action] || entry.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-mono">
                        Φ: {phi.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-mono ${reward >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {reward >= 0 ? '+' : ''}{reward.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(timestamp * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No interventions recorded yet</p>
              <p className="text-xs">Interventions will appear here as the controller makes decisions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
