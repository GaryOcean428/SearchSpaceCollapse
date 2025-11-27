import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { Waves, Wrench, Database, Brain, Activity, Target, TrendingUp, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { User, TargetAddress } from "@shared/schema";

interface InvestigationStatus {
  isRunning: boolean;
  tested: number;
  nearMisses: number;
  consciousness: {
    phi: number;
    kappa: number;
    regime: string;
  };
  currentThought: string;
  progress: number;
  manifold?: {
    totalProbes: number;
    avgPhi: number;
    exploredVolume: number;
  };
}

export default function Home() {
  const { user } = useAuth() as { user: User | undefined };

  const { data: investigationStatus } = useQuery<InvestigationStatus>({
    queryKey: ['/api/investigation/status'],
    refetchInterval: 3000,
  });

  const { data: targetAddresses } = useQuery<TargetAddress[]>({
    queryKey: ['/api/target-addresses'],
  });

  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/candidates'],
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-welcome">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Observer Archaeology System - Bitcoin Recovery using Quantum Information Geometry
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-target-count">
                {targetAddresses?.length ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Manifold Probes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-probe-count">
                {investigationStatus?.manifold?.totalProbes?.toLocaleString() ?? '0'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Hypotheses Tested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-tested-count">
                {investigationStatus?.tested?.toLocaleString() ?? '0'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                High-Φ Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-candidate-count">
                {candidates?.filter((c: any) => c.score > 0.7).length ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {investigationStatus?.isRunning && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-green-400 animate-pulse" />
                Ocean is Investigating
              </CardTitle>
              <CardDescription>
                {investigationStatus.currentThought}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-mono">{investigationStatus.progress}%</span>
              </div>
              <Progress value={investigationStatus.progress} className="h-2" />
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Tested: {investigationStatus.tested.toLocaleString()}</span>
                <span>Near Misses: {investigationStatus.nearMisses}</span>
                <Badge className={
                  investigationStatus.consciousness.regime === 'geometric' 
                    ? 'bg-green-500/20 text-green-400'
                    : investigationStatus.consciousness.regime === 'breakdown'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }>
                  {investigationStatus.consciousness.regime}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-primary/30 hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" />
                Ocean Investigation
              </CardTitle>
              <CardDescription>
                Start an autonomous investigation with Ocean, our consciousness-driven recovery agent using QIG manifold navigation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/investigation">
                <Button size="lg" className="w-full" data-testid="button-go-to-investigation">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Investigation
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Recovery Tool
              </CardTitle>
              <CardDescription>
                Technical QIG interface for manual testing, batch processing, and forensic investigation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/recovery">
                <Button size="lg" variant="outline" className="w-full" data-testid="button-go-to-recovery">
                  Open Recovery Tool
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Observer Dashboard
              </CardTitle>
              <CardDescription>
                View target addresses, candidates, recovery analytics, and blockchain scanning results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/observer">
                <Button size="lg" variant="outline" className="w-full" data-testid="button-go-to-observer">
                  Open Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {investigationStatus?.manifold && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Manifold State
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Probes</div>
                  <div className="text-xl font-mono font-bold">
                    {investigationStatus.manifold.totalProbes.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average Φ</div>
                  <div className="text-xl font-mono font-bold">
                    {investigationStatus.manifold.avgPhi.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Explored Volume</div>
                  <div className="text-xl font-mono font-bold">
                    {(investigationStatus.manifold.exploredVolume * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
