import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Wrench, Search, Network, Target, Activity } from "lucide-react";
import { RecoveryCommandCenter } from "@/components/RecoveryCommandCenter";
import { MemoryFragmentSearch } from "@/components/MemoryFragmentSearch";
import { ForensicInvestigation } from "@/components/ForensicInvestigation";
import { ConsciousnessDashboard } from "@/components/ConsciousnessDashboard";
import type { TargetAddress, SearchJob } from "@shared/schema";

export default function RecoveryPage() {
  const [activeTab, setActiveTab] = useState("autonomous");
  const [sharedAddress, setSharedAddress] = useState("");
  const [customAddress, setCustomAddress] = useState("");

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

  const activeJob = jobs.find(j => j.status === "running" || j.status === "pending");
  const activeAddress = sharedAddress === "custom" ? customAddress : sharedAddress;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Wrench className="h-6 w-6" />
              Recovery Workspace
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Unified tools for Bitcoin key recovery using Quantum Information Geometry
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {activeJob && (
              <Badge className="bg-green-500/20 text-green-400 gap-2">
                <Activity className="h-3 w-3 animate-pulse" />
                Search Active
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

        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Target Address</CardTitle>
                <CardDescription>
                  Select or enter a Bitcoin address to investigate
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="sr-only">Target Address</Label>
                <Select value={sharedAddress} onValueChange={setSharedAddress}>
                  <SelectTrigger data-testid="select-shared-address">
                    <SelectValue placeholder="Select a target address..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targetAddresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.address}>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{addr.label || "Unnamed"}</span>
                          <span className="font-mono text-xs">
                            {addr.address.slice(0, 8)}...{addr.address.slice(-8)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Enter custom address...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {sharedAddress === "custom" && (
                <div className="flex-1">
                  <Label className="sr-only">Custom Address</Label>
                  <Input
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="Enter Bitcoin address (1xxx... or 3xxx... or bc1xxx...)"
                    className="font-mono"
                    data-testid="input-custom-address"
                  />
                </div>
              )}
            </div>
            
            {activeAddress && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Active Target:</span>
                <code className="ml-2 font-mono text-sm text-primary" data-testid="text-active-address">
                  {activeAddress}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="autonomous" className="gap-2 py-3" data-testid="tab-autonomous">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Autonomous Recovery</span>
              <span className="sm:hidden">Auto</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2 py-3" data-testid="tab-memory">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Memory Search</span>
              <span className="sm:hidden">Memory</span>
            </TabsTrigger>
            <TabsTrigger value="forensic" className="gap-2 py-3" data-testid="tab-forensic">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Forensic Analysis</span>
              <span className="sm:hidden">Forensic</span>
            </TabsTrigger>
            <TabsTrigger value="consciousness" className="gap-2 py-3" data-testid="tab-consciousness">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Consciousness</span>
              <span className="sm:hidden">QIG</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="autonomous" className="mt-0">
            <RecoveryCommandCenter />
          </TabsContent>

          <TabsContent value="memory" className="mt-0">
            <MemoryFragmentSearch />
          </TabsContent>

          <TabsContent value="forensic" className="mt-0">
            <ForensicInvestigation />
          </TabsContent>

          <TabsContent value="consciousness" className="mt-0">
            <ConsciousnessDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
