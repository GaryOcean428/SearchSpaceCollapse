import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, TrendingDown, Activity, Archive, Mail, Search, Users, Clock, Target, Sparkles, LineChart, Plus, X, Terminal, RefreshCw } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface DormantAddress {
  address: string;
  balance: string;
  firstSeenAt: string;
  lastSeenAt: string;
  isDormant: boolean;
  dormancyYears: number;
}

interface RecoveryPriority {
  address: string;
  kappaRecovery: number;
  tier: 'high' | 'medium' | 'low' | 'unrecoverable';
  recommendedVector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  constraints: any;
  entropy: any;
}

interface RecoveryWorkflow {
  id: string;
  address: string;
  vector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  progress: any;
  progressPercentage: number;
  startedAt: string;
}

interface TargetAddress {
  id: string;
  address: string;
  label?: string;
  addedAt: string;
}

interface ActivityLog {
  jobId: string;
  jobStrategy: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

export default function ObserverPage() {
  const { toast } = useToast();
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [vectorFilter, setVectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [newTargetAddress, setNewTargetAddress] = useState("");
  const [newTargetLabel, setNewTargetLabel] = useState("");

  // Build URLs with query parameters for filtered queries
  const prioritiesUrl = tierFilter === 'all' 
    ? '/api/observer/recovery/priorities' 
    : `/api/observer/recovery/priorities?tier=${tierFilter}`;
  
  const workflowsUrl = vectorFilter === 'all'
    ? '/api/observer/workflows'
    : `/api/observer/workflows?vector=${vectorFilter}`;

  // Query dormant addresses
  const { data: addressesData, isLoading: addressesLoading } = useQuery<{ addresses: DormantAddress[]; total: number }>({
    queryKey: ['/api/observer/addresses/dormant'],
  });

  // Query recovery priorities
  const { data: prioritiesData, isLoading: prioritiesLoading } = useQuery<{ priorities: RecoveryPriority[]; total: number }>({
    queryKey: [prioritiesUrl],
  });

  // Query workflows with real-time polling
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery<{ workflows: RecoveryWorkflow[]; total: number }>({
    queryKey: [workflowsUrl],
    refetchInterval: 3000, // Poll every 3 seconds for real-time progress
  });

  // Query target addresses
  const { data: targetAddresses, isLoading: targetAddressesLoading } = useQuery<TargetAddress[]>({
    queryKey: ['/api/target-addresses'],
  });

  // Query activity stream with fast polling for live updates
  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useQuery<{ 
    logs: ActivityLog[]; 
    activeJobs: number; 
    totalJobs: number;
  }>({
    queryKey: ['/api/activity-stream'],
    refetchInterval: 1000, // Poll every second for real-time feel
  });

  // Add target address mutation
  const addTargetMutation = useMutation({
    mutationFn: async (data: { address: string; label?: string }) => {
      return await apiRequest("POST", "/api/target-addresses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/target-addresses'] });
      setNewTargetAddress("");
      setNewTargetLabel("");
      toast({
        title: "Address added",
        description: "Target address added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add address",
        variant: "destructive",
      });
    },
  });

  // Remove target address mutation
  const removeTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/target-addresses/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/target-addresses'] });
      toast({
        title: "Address removed",
        description: "Target address removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove address",
        variant: "destructive",
      });
    },
  });

  // Get selected priority details
  const selectedPriority = prioritiesData?.priorities.find(p => p.address === selectedAddress);
  const selectedWorkflows = (workflowsData?.workflows || []).filter(w => w.address === selectedAddress);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" data-testid="text-page-title">
            <Database className="w-10 h-10 text-primary" />
            Observer Archaeology System
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-page-description">
            Bitcoin Lost Coin Recovery via Quantum Information Geometry
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-stat-dormant-addresses">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dormant Addresses</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-stat-dormant-count">
                {addressesLoading ? "..." : addressesData?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">2009-2011 era</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-high-priority">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Target className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-stat-high-priority-count">
                {prioritiesLoading ? "..." : (prioritiesData?.priorities || []).filter(p => p.tier === 'high').length}
              </div>
              <p className="text-xs text-muted-foreground">κ &lt; 10</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-active-workflows">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-stat-active-workflows-count">
                {workflowsLoading ? "..." : (workflowsData?.workflows || []).filter(w => w.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed-recoveries">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Sparkles className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-stat-completed-count">
                {workflowsLoading ? "..." : (workflowsData?.workflows || []).filter(w => w.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">Recoveries</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList data-testid="tabs-main-navigation">
            <TabsTrigger value="catalog" data-testid="tab-catalog">
              <Database className="w-4 h-4 mr-2" />
              Address Catalog
            </TabsTrigger>
            <TabsTrigger value="rankings" data-testid="tab-rankings">
              <TrendingDown className="w-4 h-4 mr-2" />
              κ_recovery Rankings
            </TabsTrigger>
            <TabsTrigger value="workflows" data-testid="tab-workflows">
              <Activity className="w-4 h-4 mr-2" />
              Recovery Workflows
            </TabsTrigger>
            <TabsTrigger value="geometry" data-testid="tab-geometry">
              <LineChart className="w-4 h-4 mr-2" />
              Geometric Visualization
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Terminal className="w-4 h-4 mr-2" />
              Live Activity
            </TabsTrigger>
          </TabsList>

          {/* Address Catalog Tab */}
          <TabsContent value="catalog" className="space-y-4">
            {/* Target Address Management */}
            <Card data-testid="card-target-addresses">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Target Addresses
                </CardTitle>
                <CardDescription>
                  Bitcoin addresses to recover - all searches will check against these targets simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Address Form */}
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <Label className="text-sm font-medium">Add New Target Address</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Bitcoin address (e.g., 1A1zP1eP...)"
                        value={newTargetAddress}
                        onChange={(e) => setNewTargetAddress(e.target.value)}
                        data-testid="input-new-target-address"
                      />
                    </div>
                    <div className="w-48">
                      <Input
                        placeholder="Label (optional)"
                        value={newTargetLabel}
                        onChange={(e) => setNewTargetLabel(e.target.value)}
                        data-testid="input-new-target-label"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const address = newTargetAddress.trim();
                        
                        if (!address) {
                          toast({
                            title: "Error",
                            description: "Please enter a Bitcoin address",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        // Basic Bitcoin address format validation
                        if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address)) {
                          toast({
                            title: "Invalid Address",
                            description: "Please enter a valid Bitcoin address format",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        // Check for duplicates
                        if (targetAddresses?.some(t => t.address === address)) {
                          toast({
                            title: "Duplicate Address",
                            description: "This address is already in your target list",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        addTargetMutation.mutate({
                          address,
                          label: newTargetLabel.trim() || undefined,
                        });
                      }}
                      disabled={addTargetMutation.isPending || !newTargetAddress.trim()}
                      data-testid="button-add-target-address"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid="text-help-multiple-addresses">
                    💡 Tip: All constrained searches will check passphrases against all target addresses
                  </p>
                </div>

                {/* Target Address List */}
                {targetAddressesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading target addresses...</div>
                ) : (
                  <div className="space-y-2">
                    {(targetAddresses || []).map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        data-testid={`target-address-item-${target.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium truncate" data-testid={`text-target-address-${target.id}`}>
                              {target.address}
                            </span>
                            {target.label && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-target-label-${target.id}`}>
                                {target.label}
                              </Badge>
                            )}
                            {targetAddresses && targetAddresses[0]?.id === target.id && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary" data-testid={`badge-target-primary-${target.id}`}>
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1" data-testid={`text-target-date-${target.id}`}>
                            Added {new Date(target.addedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {targetAddresses && targetAddresses[0]?.id !== target.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Remove ${target.address}?`)) {
                                removeTargetMutation.mutate(target.id);
                              }
                            }}
                            disabled={removeTargetMutation.isPending}
                            data-testid={`button-remove-target-${target.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dormant Address Catalog */}
            <Card data-testid="card-address-catalog">
              <CardHeader>
                <CardTitle>Dormant Address Catalog</CardTitle>
                <CardDescription>
                  {addressesData?.total || 0} dormant addresses from 2009-2011 era blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <Input
                    placeholder="Search by address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-address-search"
                    className="max-w-md"
                  />
                </div>

                {/* Address List */}
                {addressesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading addresses...</div>
                ) : (
                  <div className="space-y-2">
                    {addressesData?.addresses
                      .filter(addr => 
                        searchQuery === "" || 
                        addr.address.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 50)
                      .map((addr) => (
                        <div
                          key={addr.address}
                          className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => setSelectedAddress(addr.address)}
                          data-testid={`address-item-${addr.address}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm font-medium truncate" data-testid={`text-address-${addr.address}`}>
                              {addr.address}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>First: {new Date(addr.firstSeenAt).toLocaleDateString()}</span>
                              <span>Last: {new Date(addr.lastSeenAt).toLocaleDateString()}</span>
                              <span>{addr.dormancyYears?.toFixed(1) || 'N/A'} years dormant</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold">{addr.balance} BTC</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* κ_recovery Rankings Tab */}
          <TabsContent value="rankings" className="space-y-4">
            <Card data-testid="card-kappa-rankings">
              <CardHeader>
                <CardTitle>κ_recovery Priority Rankings</CardTitle>
                <CardDescription>
                  Addresses ranked by recovery difficulty (Φ_constraints / H_creation)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tier Filter */}
                <div className="mb-4 flex gap-2">
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-48" data-testid="select-tier-filter">
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="unrecoverable">Unrecoverable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority List */}
                {prioritiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading priorities...</div>
                ) : (
                  <div className="space-y-2">
                    {prioritiesData?.priorities.slice(0, 50).map((priority) => (
                      <div
                        key={priority.address}
                        className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => setSelectedAddress(priority.address)}
                        data-testid={`priority-item-${priority.address}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium truncate">
                              {priority.address}
                            </span>
                            <TierBadge tier={priority.tier} />
                            <VectorBadge vector={priority.recommendedVector} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            κ_recovery = {priority.kappaRecovery.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold font-mono">
                            {priority.kappaRecovery.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recovery Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            {/* Recovery Vector Explanations */}
            <Card data-testid="card-vector-explanations" className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Understanding Recovery Vectors</CardTitle>
                <CardDescription>
                  The system uses four distinct approaches to recover lost Bitcoin
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-chart-1" />
                    <span className="font-semibold text-sm">Estate Contact</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reaches out to estates of deceased Bitcoin holders. Includes legal documentation and cooperation to execute recovery.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Estate contact found, outreach attempts, legal documents, verification
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Constrained Search (QIG)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Algorithmic passphrase search using Quantum Information Geometry. Tests BIP-39 and arbitrary brain wallet phrases against your target addresses.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Phrases tested, high-Φ candidates, search rate, κ/Φ/H metrics
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-chart-2" />
                    <span className="font-semibold text-sm">Social Outreach</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Community engagement on BitcoinTalk forums, GitHub, and email. Posts recovery requests and monitors responses.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Platforms identified, posts created, messages sent, responses received
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-chart-3" />
                    <span className="font-semibold text-sm">Temporal Archive</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analyzes historical archives (mailing lists, forums) to identify patterns and narrow down the time period of wallet creation.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Tracks:</strong> Archives identified, time period narrowed, artifacts analyzed, patterns found
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Workflows */}
            <Card data-testid="card-workflows">
              <CardHeader>
                <CardTitle>Active Recovery Workflows</CardTitle>
                <CardDescription>
                  Real-time status of ongoing recovery operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Vector Filter */}
                <div className="mb-4 flex gap-2">
                  <Select value={vectorFilter} onValueChange={setVectorFilter}>
                    <SelectTrigger className="w-48" data-testid="select-vector-filter">
                      <SelectValue placeholder="Filter by vector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vectors</SelectItem>
                      <SelectItem value="estate">Estate Contact</SelectItem>
                      <SelectItem value="constrained_search">Constrained Search</SelectItem>
                      <SelectItem value="social">Social Outreach</SelectItem>
                      <SelectItem value="temporal">Temporal Archive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Workflow List */}
                {workflowsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
                ) : !workflowsData?.workflows || workflowsData.workflows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No workflows started yet. Select an address from Rankings to start recovery.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflowsData.workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="p-4 rounded-lg border"
                        data-testid={`workflow-item-${workflow.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {workflow.address}
                            </span>
                            <VectorBadge vector={workflow.vector} />
                            <StatusBadge status={workflow.status} />
                          </div>
                        </div>
                        
                        {/* Vector-Specific Progress Details */}
                        {workflow.status === 'active' ? (
                          <>
                            {workflow.vector === 'constrained_search' && <ConstrainedSearchProgress workflowId={workflow.id} />}
                            {workflow.vector === 'estate' && <EstateProgress workflow={workflow} />}
                            {workflow.vector === 'social' && <SocialProgress workflow={workflow} />}
                            {workflow.vector === 'temporal' && <TemporalProgress workflow={workflow} />}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{workflow.progressPercentage}%</span>
                            </div>
                            <Progress value={workflow.progressPercentage} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              Started: {new Date(workflow.startedAt).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geometric Visualization Tab */}
          <TabsContent value="geometry" className="space-y-4">
            <Card data-testid="card-geometric-visualization">
              <CardHeader>
                <CardTitle>Quantum Information Geometry Manifold</CardTitle>
                <CardDescription>
                  Φ_constraints vs H_creation scatter plot - lower κ_recovery (Φ/H) indicates easier recovery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prioritiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading geometric data...</div>
                ) : !prioritiesData || prioritiesData.priorities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No priority data available. Run κ_recovery computation first.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Scatter Plot */}
                    <div className="w-full h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            type="number" 
                            dataKey="phi" 
                            name="Φ_constraints"
                            label={{ value: 'Φ_constraints (Integrated Information)', position: 'insideBottom', offset: -10 }}
                            domain={[0, 'auto']}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="h" 
                            name="H_creation"
                            label={{ value: 'H_creation (Creation Entropy)', angle: -90, position: 'insideLeft' }}
                            domain={[0, 'auto']}
                          />
                          <ZAxis type="number" dataKey="kappa" name="κ_recovery" range={[50, 400]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-card border rounded-lg p-3 shadow-lg">
                                    <p className="font-mono text-xs mb-2">{data.address}</p>
                                    <div className="space-y-1 text-xs">
                                      <p>Φ_constraints: <span className="font-mono">{data.phi.toFixed(2)}</span></p>
                                      <p>H_creation: <span className="font-mono">{data.h.toFixed(2)}</span></p>
                                      <p>κ_recovery: <span className="font-mono font-bold">{data.kappa.toFixed(2)}</span></p>
                                      <p className="mt-2">
                                        <TierBadge tier={data.tier} />
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter 
                            name="Addresses" 
                            data={(prioritiesData?.priorities || []).map(p => ({
                              address: p.address,
                              phi: (p.constraints as any)?.phiConstraints || 0,
                              h: (p.entropy as any)?.hCreation || 0,
                              kappa: p.kappaRecovery || 0,
                              tier: p.tier,
                              isSelected: p.address === selectedAddress,
                            }))}
                            fill="hsl(var(--primary))"
                          >
                            {(prioritiesData?.priorities || []).map((p, index) => (
                              <Cell 
                                key={`cell-${index}`}
                                fill={
                                  p.address === selectedAddress 
                                    ? "hsl(var(--destructive))" 
                                    : p.tier === 'high'
                                    ? "hsl(var(--destructive) / 0.6)"
                                    : p.tier === 'medium'
                                    ? "hsl(25 95% 53% / 0.6)"
                                    : p.tier === 'low'
                                    ? "hsl(217 91% 60% / 0.6)"
                                    : "hsl(var(--muted-foreground) / 0.3)"
                                }
                                stroke={p.address === selectedAddress ? "hsl(var(--destructive))" : undefined}
                                strokeWidth={p.address === selectedAddress ? 3 : undefined}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 justify-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-destructive/60"></div>
                        <span>High Priority (κ &lt; 10)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(25 95% 53% / 0.6)" }}></div>
                        <span>Medium Priority (10 ≤ κ &lt; 50)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(217 91% 60% / 0.6)" }}></div>
                        <span>Low Priority (50 ≤ κ &lt; 100)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-muted-foreground/30"></div>
                        <span>Unrecoverable (κ ≥ 100)</span>
                      </div>
                      {selectedAddress && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-destructive border-2 border-destructive"></div>
                          <span className="font-semibold">Selected Address</span>
                        </div>
                      )}
                    </div>

                    {/* Geometric Interpretation */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">Lower Left Quadrant</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            Low Φ, Low H - Minimal constraints and entropy. Unrecoverable without external data.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">Upper Left Quadrant</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            Low Φ, High H - High entropy but few constraints. Difficult recovery requiring broad search.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-destructive">Upper Right Quadrant</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            High Φ, High H - <span className="font-semibold">Optimal recovery zone</span>. Rich constraints reduce effective entropy via geometric intersection.
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Click instruction */}
                    <p className="text-center text-sm text-muted-foreground">
                      Click an address in the Rankings tab to highlight it on the manifold
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card data-testid="card-live-activity">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Live Activity Stream
                  </CardTitle>
                  <CardDescription>
                    Real-time view of passphrase testing, QIG scoring, and recovery progress
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={activityData?.activeJobs ? "default" : "secondary"} data-testid="badge-active-jobs">
                      {activityData?.activeJobs || 0} Active Jobs
                    </Badge>
                    <Badge variant="outline" data-testid="badge-total-jobs">
                      {activityData?.totalJobs || 0} Total
                    </Badge>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => refetchActivity()}
                    data-testid="button-refresh-activity"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading activity stream...</div>
                ) : !activityData?.logs || activityData.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity yet. Start a search job to see live updates.</p>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-xs bg-black/90 text-green-400 p-4 rounded-lg max-h-[600px] overflow-y-auto" data-testid="container-activity-log">
                    {activityData.logs.map((log, index) => (
                      <div 
                        key={`${log.timestamp}-${index}`}
                        className={`flex gap-2 py-0.5 border-b border-green-900/30 last:border-b-0 ${
                          log.type === 'success' ? 'text-yellow-400 font-bold' : 
                          log.type === 'error' ? 'text-red-400' : 
                          'text-green-400'
                        }`}
                        data-testid={`log-entry-${index}`}
                      >
                        <span className="text-gray-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-cyan-400 shrink-0">
                          [{log.jobStrategy}]
                        </span>
                        <span className="break-all">
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Info (batch progress, mode switches)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Success (matches found, targets reached)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Error (job failures)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Selected Address Details */}
        {selectedAddress && selectedPriority && (
          <Card className="mt-8" data-testid="card-selected-address-details">
            <CardHeader>
              <CardTitle>Address Details: {selectedAddress}</CardTitle>
              <CardDescription>Recovery priority and constraint analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Constraints */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Φ_constraints
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entity Linkage:</span>
                      <span className="font-mono">{(selectedPriority.constraints as any).entityLinkage || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Artifact Density:</span>
                      <span className="font-mono">{((selectedPriority.constraints as any).artifactDensity || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temporal Precision:</span>
                      <span className="font-mono">{((selectedPriority.constraints as any).temporalPrecisionHours || 0).toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Graph Signature:</span>
                      <span className="font-mono">{(selectedPriority.constraints as any).graphSignature || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Φ_constraints (Total):</span>
                      <span className="font-mono font-bold">{((selectedPriority.constraints as any).phiConstraints || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Entropy */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    H_creation
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Era Factor:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any).eraFactor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Script Complexity:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any).scriptComplexity || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mining Factor:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any).miningFactor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance Factor:</span>
                      <span className="font-mono">{((selectedPriority.entropy as any).balanceFactor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">H_creation (Total):</span>
                      <span className="font-mono font-bold">{((selectedPriority.entropy as any).hCreation || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Workflows for this Address */}
              {selectedWorkflows.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Active Recovery Workflows</h3>
                  <div className="space-y-2">
                    {selectedWorkflows.map((workflow) => (
                      <div key={workflow.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <VectorBadge vector={workflow.vector} />
                          <StatusBadge status={workflow.status} />
                        </div>
                        <div className="text-sm font-medium">{workflow.progressPercentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const config = {
    high: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/20" },
    medium: { label: "Medium", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    low: { label: "Low", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    unrecoverable: { label: "Unrecoverable", className: "bg-muted text-muted-foreground border-muted" },
  };

  const cfg = config[tier as keyof typeof config] || config.unrecoverable;

  return (
    <Badge variant="outline" className={cfg.className} data-testid={`badge-tier-${tier}`}>
      {cfg.label}
    </Badge>
  );
}

function VectorBadge({ vector }: { vector: string }) {
  const config = {
    estate: { label: "Estate", icon: Mail, className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    constrained_search: { label: "QIG Search", icon: Search, className: "bg-primary/10 text-primary border-primary/20" },
    social: { label: "Social", icon: Users, className: "bg-green-500/10 text-green-600 border-green-500/20" },
    temporal: { label: "Temporal", icon: Clock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  };

  const cfg = config[vector as keyof typeof config] || config.constrained_search;
  const Icon = cfg.icon;

  return (
    <Badge variant="outline" className={cfg.className} data-testid={`badge-vector-${vector}`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: "Pending", className: "bg-muted text-muted-foreground border-muted" },
    active: { label: "Active", className: "bg-primary/10 text-primary border-primary/20" },
    paused: { label: "Paused", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    completed: { label: "Completed", className: "bg-green-500/10 text-green-600 border-green-500/20" },
    failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  const cfg = config[status as keyof typeof config] || config.pending;

  return (
    <Badge variant="outline" className={cfg.className} data-testid={`badge-status-${status}`}>
      {cfg.label}
    </Badge>
  );
}

function ConstrainedSearchProgress({ workflowId }: { workflowId: string }) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: [`/api/observer/workflows/${workflowId}/search-progress`],
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Loading search progress...
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">No search data available yet</div>
      </div>
    );
  }

  const progress = (progressData as any).progress || {};
  const constraints = (progressData as any).constraints || {};
  const searchJob = (progressData as any).searchJob || {};

  return (
    <div className="space-y-3" data-testid={`search-progress-${workflowId}`}>
      {/* Real-time metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-phrases-tested-${workflowId}`}>
            {(progress.phrasesTested || 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {searchJob.params?.generationMode === "master-key" 
              ? "Keys Tested" 
              : searchJob.params?.generationMode === "arbitrary"
              ? "Passphrases Tested"
              : "Phrases Tested"}
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono text-primary" data-testid={`text-high-phi-${workflowId}`}>
            {progress.highPhiCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">High-Φ Found</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-search-rate-${workflowId}`}>
            {((searchJob.stats?.rate || 0)).toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {searchJob.params?.generationMode === "master-key" 
              ? "Keys/sec" 
              : searchJob.params?.generationMode === "arbitrary"
              ? "Passphrases/sec"
              : "Phrases/sec"}
          </div>
        </div>
      </div>

      {/* QIG Constraints */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">κ_recovery:</span>
          <span className="font-mono font-semibold">{(constraints.kappaRecovery || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Φ_constraints:</span>
          <span className="font-mono">{(constraints.phiConstraints || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">H_creation:</span>
          <span className="font-mono">{(constraints.hCreation || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Search Mode:</span>
          <span className="font-mono capitalize">
            {(searchJob.progress?.searchMode || 'exploration')}
          </span>
        </div>
      </div>

      {/* Match status */}
      {progress.matchFound && (
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <span className="text-sm font-semibold text-green-600">🎉 Match Found!</span>
        </div>
      )}

      {/* Search status */}
      <div className="text-xs text-muted-foreground text-center">
        Status: <span className="font-medium capitalize">{progress.searchStatus || 'running'}</span>
        {searchJob.stats?.startTime && (
          <> • Started {new Date(searchJob.stats.startTime).toLocaleTimeString()}</>
        )}
      </div>
    </div>
  );
}

function EstateProgress({ workflow }: { workflow: RecoveryWorkflow }) {
  const progress = workflow.progress as any;
  const estate = progress?.estateProgress || {};
  
  if (!progress || !estate || Object.keys(estate).length === 0) {
    return (
      <div className="space-y-2" data-testid={`estate-progress-${workflow.id}`}>
        <div className="text-sm text-muted-foreground">Estate workflow initializing...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3" data-testid={`estate-progress-${workflow.id}`}>
      {/* Estate Contact Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-estate-outreach-${workflow.id}`}>
            {estate.outreachAttempts || 0}
          </div>
          <div className="text-xs text-muted-foreground">Outreach Attempts</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-lg font-bold" data-testid={`text-estate-response-${workflow.id}`}>
            {estate.responseReceived ? "✓" : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Response Received</div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estate Contact:</span>
          <span className="font-mono">{estate.estateContactIdentified ? "Found" : "Not Found"}</span>
        </div>
        {estate.estateContactInfo && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contact Info:</span>
            <span className="font-mono text-xs truncate max-w-[200px]">{estate.estateContactInfo}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Legal Docs Requested:</span>
          <span className="font-mono">{estate.legalDocumentsRequested ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Legal Docs Received:</span>
          <span className="font-mono">{estate.legalDocumentsReceived ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Verification:</span>
          <span className="font-mono capitalize">{estate.verificationStatus || 'pending'}</span>
        </div>
        {estate.recoveryExecuted && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <span className="text-sm font-semibold text-green-600">✓ Recovery Executed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SocialProgress({ workflow }: { workflow: RecoveryWorkflow }) {
  const progress = workflow.progress as any;
  const social = progress?.socialProgress || {};
  
  if (!progress || !social || Object.keys(social).length === 0) {
    return (
      <div className="space-y-2" data-testid={`social-progress-${workflow.id}`}>
        <div className="text-sm text-muted-foreground">Social outreach workflow initializing...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3" data-testid={`social-progress-${workflow.id}`}>
      {/* Social Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-social-posts-${workflow.id}`}>
            {social.communityPostsCreated || 0}
          </div>
          <div className="text-xs text-muted-foreground">Posts Created</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-social-messages-${workflow.id}`}>
            {social.directMessagesSet || 0}
          </div>
          <div className="text-xs text-muted-foreground">Messages Sent</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono text-primary" data-testid={`text-social-responses-${workflow.id}`}>
            {social.responsesReceived || 0}
          </div>
          <div className="text-xs text-muted-foreground">Responses</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platforms:</span>
          <span className="font-mono">{(social.platformsIdentified || []).length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Templates Created:</span>
          <span className="font-mono">{social.outreachTemplatesCreated ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Leads Generated:</span>
          <span className="font-mono">{social.leadsGenerated || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Verified Leads:</span>
          <span className="font-mono">{social.verifiedLeads || 0}</span>
        </div>
      </div>

      {/* Platform list */}
      {social.platformsIdentified && social.platformsIdentified.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <strong>Platforms:</strong> {social.platformsIdentified.join(', ')}
        </div>
      )}
    </div>
  );
}

function TemporalProgress({ workflow }: { workflow: RecoveryWorkflow }) {
  const progress = workflow.progress as any;
  const temporal = progress?.temporalProgress || {};
  
  if (!progress || !temporal || Object.keys(temporal).length === 0) {
    return (
      <div className="space-y-2" data-testid={`temporal-progress-${workflow.id}`}>
        <div className="text-sm text-muted-foreground">Temporal archive workflow initializing...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3" data-testid={`temporal-progress-${workflow.id}`}>
      {/* Temporal Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-temporal-archives-${workflow.id}`}>
            {(temporal.archivesIdentified || []).length}
          </div>
          <div className="text-xs text-muted-foreground">Archives</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono" data-testid={`text-temporal-artifacts-${workflow.id}`}>
            {temporal.artifactsAnalyzed || 0}
          </div>
          <div className="text-xs text-muted-foreground">Artifacts Analyzed</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold font-mono text-primary" data-testid={`text-temporal-patterns-${workflow.id}`}>
            {(temporal.patternsIdentified || []).length}
          </div>
          <div className="text-xs text-muted-foreground">Patterns Found</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time Period Narrowed:</span>
          <span className="font-mono">{temporal.timePeriodNarrowed ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Temporal Clusters:</span>
          <span className="font-mono">{temporal.temporalClustersFound || 0}</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-muted-foreground">Confidence Score:</span>
          <span className="font-mono font-semibold">{((temporal.confidenceScore || 0) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Time period */}
      {temporal.timePeriodStart && temporal.timePeriodEnd && (
        <div className="text-xs text-muted-foreground">
          <strong>Time Period:</strong> {new Date(temporal.timePeriodStart).toLocaleDateString()} - {new Date(temporal.timePeriodEnd).toLocaleDateString()}
        </div>
      )}

      {/* Archives list */}
      {temporal.archivesIdentified && temporal.archivesIdentified.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <strong>Archives:</strong> {temporal.archivesIdentified.join(', ')}
        </div>
      )}
    </div>
  );
}
