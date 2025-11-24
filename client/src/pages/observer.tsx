import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, TrendingDown, Activity, Archive, Mail, Search, Users, Clock, Target, Sparkles, LineChart } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';

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

export default function ObserverPage() {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [vectorFilter, setVectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  // Query dormant addresses
  const { data: addressesData, isLoading: addressesLoading } = useQuery<{ addresses: DormantAddress[]; total: number }>({
    queryKey: ['/api/observer/addresses/dormant'],
  });

  // Query recovery priorities
  const { data: prioritiesData, isLoading: prioritiesLoading } = useQuery<{ priorities: RecoveryPriority[]; total: number }>({
    queryKey: ['/api/observer/recovery/priorities', { tier: tierFilter === 'all' ? undefined : tierFilter }],
  });

  // Query workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery<{ workflows: RecoveryWorkflow[]; total: number }>({
    queryKey: ['/api/observer/workflows', { vector: vectorFilter === 'all' ? undefined : vectorFilter }],
  });

  // Get selected priority details
  const selectedPriority = prioritiesData?.priorities.find(p => p.address === selectedAddress);
  const selectedWorkflows = workflowsData?.workflows.filter(w => w.address === selectedAddress) || [];

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
                {prioritiesLoading ? "..." : prioritiesData?.priorities.filter(p => p.tier === 'high').length || 0}
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
                {workflowsLoading ? "..." : workflowsData?.workflows.filter(w => w.status === 'active').length || 0}
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
                {workflowsLoading ? "..." : workflowsData?.workflows.filter(w => w.status === 'completed').length || 0}
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
          </TabsList>

          {/* Address Catalog Tab */}
          <TabsContent value="catalog" className="space-y-4">
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
                              <span>{addr.dormancyYears.toFixed(1)} years dormant</span>
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
            <Card data-testid="card-workflows">
              <CardHeader>
                <CardTitle>Recovery Workflows</CardTitle>
                <CardDescription>
                  Multi-vector recovery execution status
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
                ) : workflowsData?.workflows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No workflows started yet. Select an address from Rankings to start recovery.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflowsData?.workflows.map((workflow) => (
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
                            data={prioritiesData.priorities.map(p => ({
                              address: p.address,
                              phi: (p.constraints as any).phiConstraints || 0,
                              h: (p.entropy as any).hCreation || 0,
                              kappa: p.kappaRecovery,
                              tier: p.tier,
                              isSelected: p.address === selectedAddress,
                            }))}
                            fill="hsl(var(--primary))"
                          >
                            {prioritiesData.priorities.map((p, index) => (
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
