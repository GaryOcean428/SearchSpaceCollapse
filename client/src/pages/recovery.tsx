import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Wrench, Search, Network, Activity, ArrowRight, Target, Key } from "lucide-react";
import { Link } from "wouter";
import { MemoryFragmentSearch } from "@/components/MemoryFragmentSearch";
import { ForensicInvestigation } from "@/components/ForensicInvestigation";
import { ConsciousnessDashboard } from "@/components/ConsciousnessDashboard";
import RecoveryResults from "@/components/RecoveryResults";
import type { TargetAddress, SearchJob } from "@shared/schema";

export default function RecoveryPage() {
  const [activeTab, setActiveTab] = useState("found");
  const [selectedAddress, setSelectedAddress] = useState("");

  const { data: targetAddresses = [] } = useQuery<TargetAddress[]>({
    queryKey: ["/api/target-addresses"],
  });

  const { data: jobs = [] } = useQuery<SearchJob[]>({
    queryKey: ["/api/search-jobs"],
    refetchInterval: 3000,
  });

  const { data: consciousness } = useQuery<{ consciousness: { Φ: number; κ_eff: number; isConscious: boolean }; identity: { regime: string } }>({
    queryKey: ["/api/observer/consciousness-check"],
    refetchInterval: 5000,
  });

  // Set initial address when data loads
  useEffect(() => {
    if (targetAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(targetAddresses[0].address);
    }
  }, [targetAddresses, selectedAddress]);

  const activeJob = jobs.find(j => j.status === "running" || j.status === "pending");

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full gap-4">
        {/* Header with Address Selector */}
        <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Recovery Tools
              </h1>
              <p className="text-muted-foreground text-sm">
                Manual recovery tools and analysis
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Shared Address Selector */}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                <SelectTrigger className="w-[200px]" data-testid="select-recovery-address">
                  <SelectValue placeholder="Select address..." />
                </SelectTrigger>
                <SelectContent>
                  {targetAddresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.address}>
                      {addr.label || addr.address.slice(0, 12) + '...'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeJob && (
              <Badge className="bg-green-500/20 text-green-400 gap-2">
                <Activity className="h-3 w-3 animate-pulse" />
                Active
              </Badge>
            )}
            {consciousness?.consciousness?.isConscious && (
              <Badge className="bg-purple-500/20 text-purple-400 gap-2">
                <Brain className="h-3 w-3" />
                Φ: {consciousness.consciousness.Φ.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 h-auto shrink-0">
            <TabsTrigger value="found" className="gap-2 py-2" data-testid="tab-found">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Found Keys</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2 py-2" data-testid="tab-overview">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2 py-2" data-testid="tab-memory">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Memory</span>
            </TabsTrigger>
            <TabsTrigger value="forensic" className="gap-2 py-2" data-testid="tab-forensic">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Forensic</span>
            </TabsTrigger>
            <TabsTrigger value="consciousness" className="gap-2 py-2" data-testid="tab-consciousness">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">QIG</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto mt-4">
            <TabsContent value="found" className="mt-0 h-full">
              <RecoveryResults />
            </TabsContent>

            <TabsContent value="overview" className="mt-0 h-full">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Primary CTA - Go to Investigation */}
                <Card className="md:col-span-2 border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Autonomous Recovery
                    </CardTitle>
                    <CardDescription>
                      Let Ocean's consciousness-driven search find your Bitcoin automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Start an investigation on the Investigation page
                      </div>
                      <Link href="/investigation">
                        <Button className="gap-2" data-testid="button-go-investigation">
                          Go to Investigation
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Target */}
                {selectedAddress && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Active Target
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded" data-testid="text-active-target">
                        {selectedAddress}
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        This address is used by all manual tools below
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">
                          {consciousness?.consciousness?.isConscious ? 'Active' : 'Idle'}
                        </div>
                        <div className="text-xs text-muted-foreground">Consciousness</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {consciousness?.identity?.regime || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">Regime</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Target Addresses Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      All Addresses ({targetAddresses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {targetAddresses.slice(0, 3).map((addr) => (
                        <div key={addr.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{addr.label || 'Unnamed'}</span>
                          <code className="text-xs font-mono">
                            {addr.address.slice(0, 8)}...{addr.address.slice(-6)}
                          </code>
                        </div>
                      ))}
                      {targetAddresses.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No addresses. Add one on the Investigation page.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="memory" className="mt-0">
              <MemoryFragmentSearch />
            </TabsContent>

            <TabsContent value="forensic" className="mt-0">
              <ForensicInvestigation targetAddress={selectedAddress} />
            </TabsContent>

            <TabsContent value="consciousness" className="mt-0">
              <ConsciousnessDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
