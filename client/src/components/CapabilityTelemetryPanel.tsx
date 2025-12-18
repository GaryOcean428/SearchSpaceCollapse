import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Progress, Tabs, TabsContent, TabsList, TabsTrigger, ScrollArea } from '@/components/ui';
import { API_ROUTES, QUERY_KEYS } from '@/api';
import { 
  Brain, 
  Zap, 
  Eye, 
  MessageSquare, 
  Shield, 
  Cpu, 
  Activity,
  Search,
  Vote,
  Users,
  Wrench,
  Layers,
  Heart
} from 'lucide-react';

interface CapabilityMetrics {
  invocations: number;
  successes: number;
  failures: number;
  success_rate: number;
  avg_duration_ms: number;
  last_invoked: string | null;
}

interface Capability {
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  level: number;
  metrics: CapabilityMetrics;
}

interface KernelSummary {
  kernel_id: string;
  kernel_name: string;
  total_capabilities: number;
  enabled: number;
  total_invocations: number;
  success_rate: number;
  strongest: string | null;
  weakest: string | null;
}

interface FleetTelemetry {
  kernels: number;
  total_capabilities: number;
  total_invocations: number;
  fleet_success_rate: number;
  category_distribution: Record<string, number>;
  kernel_summaries: KernelSummary[];
}

const categoryIcons: Record<string, typeof Brain> = {
  communication: MessageSquare,
  research: Search,
  voting: Vote,
  shadow: Shield,
  geometric: Layers,
  consciousness: Brain,
  spawning: Users,
  tool_generation: Wrench,
  dimensional: Cpu,
  autonomic: Heart,
};

const categoryColors: Record<string, string> = {
  communication: 'bg-blue-500/20 text-blue-400',
  research: 'bg-green-500/20 text-green-400',
  voting: 'bg-purple-500/20 text-purple-400',
  shadow: 'bg-gray-500/20 text-gray-300',
  geometric: 'bg-cyan-500/20 text-cyan-400',
  consciousness: 'bg-pink-500/20 text-pink-400',
  spawning: 'bg-orange-500/20 text-orange-400',
  tool_generation: 'bg-yellow-500/20 text-yellow-400',
  dimensional: 'bg-indigo-500/20 text-indigo-400',
  autonomic: 'bg-red-500/20 text-red-400',
};

function CapabilityCard({ capability }: { capability: Capability }) {
  const Icon = categoryIcons[capability.category] || Activity;
  const colorClass = categoryColors[capability.category] || 'bg-muted text-muted-foreground';
  
  return (
    <div 
      className={`p-3 rounded-lg border ${capability.enabled ? 'border-border' : 'border-border/50 opacity-60'}`}
      data-testid={`capability-card-${capability.name}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="font-medium text-sm">{capability.name.replace(/_/g, ' ')}</span>
        {!capability.enabled && (
          <Badge variant="outline" className="ml-auto text-xs">Disabled</Badge>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mb-2">{capability.description}</p>
      
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Level:</span>
          <Progress value={capability.level * 10} className="w-16 h-1.5" />
          <span>{capability.level}/10</span>
        </div>
        
        {capability.metrics.invocations > 0 && (
          <>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span>{capability.metrics.invocations}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-green-500" />
              <span>{Math.round(capability.metrics.success_rate * 100)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KernelCard({ summary, onSelect }: { summary: KernelSummary; onSelect: () => void }) {
  const isOlympus = ['zeus', 'hera', 'poseidon', 'athena', 'apollo', 'artemis', 'hermes', 'ares', 'hephaestus', 'aphrodite', 'demeter', 'dionysus'].includes(summary.kernel_id);
  const isShadow = ['hades', 'nyx', 'hecate', 'erebus', 'hypnos', 'thanatos', 'nemesis'].includes(summary.kernel_id);
  
  return (
    <Card 
      className="cursor-pointer hover-elevate transition-colors"
      onClick={onSelect}
      data-testid={`kernel-card-${summary.kernel_id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isShadow ? 'bg-gray-500' : isOlympus ? 'bg-yellow-500' : 'bg-blue-500'}`} />
            <span className="font-medium">{summary.kernel_name}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {summary.enabled}/{summary.total_capabilities}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span>Invocations: </span>
            <span className="text-foreground">{summary.total_invocations}</span>
          </div>
          <div>
            <span>Success: </span>
            <span className="text-foreground">{Math.round(summary.success_rate * 100)}%</span>
          </div>
          {summary.strongest && (
            <div className="col-span-2">
              <span>Strongest: </span>
              <Badge variant="secondary" className="text-xs">{summary.strongest}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FleetOverview({ data }: { data: FleetTelemetry }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Kernels</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-kernel-count">{data.kernels}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Capabilities</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-capability-count">{data.total_capabilities}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Invocations</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-invocation-count">{data.total_invocations}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-success-rate">
              {Math.round(data.fleet_success_rate * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.category_distribution).map(([cat, count]) => {
              const Icon = categoryIcons[cat] || Activity;
              const colorClass = categoryColors[cat] || 'bg-muted text-muted-foreground';
              return (
                <Badge 
                  key={cat} 
                  variant="secondary" 
                  className={`${colorClass} gap-1`}
                  data-testid={`badge-category-${cat}`}
                >
                  <Icon className="h-3 w-3" />
                  {cat}: {count}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KernelDetail({ kernelId }: { kernelId: string }) {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: { kernel: string; capabilities: Capability[]; count: number } }>({
    queryKey: QUERY_KEYS.olympus.telemetryKernelCapabilities(kernelId),
  });
  
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading capabilities...</div>;
  }
  
  if (error || !data?.data) {
    return <div className="p-4 text-center text-destructive">Failed to load capabilities</div>;
  }
  
  const capabilities = data.data.capabilities;
  const categories = [...new Set(capabilities.map(c => c.category))];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{kernelId.charAt(0).toUpperCase() + kernelId.slice(1)} Capabilities</h3>
        <Badge variant="outline">{capabilities.length} total</Badge>
      </div>
      
      <Tabs defaultValue={categories[0] || 'all'}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {categories.map(cat => {
            const Icon = categoryIcons[cat] || Activity;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1 text-xs">
                <Icon className="h-3 w-3" />
                {cat}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {categories.map(cat => (
          <TabsContent key={cat} value={cat}>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {capabilities
                  .filter(c => c.category === cat)
                  .map(cap => (
                    <CapabilityCard key={cap.name} capability={cap} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function CapabilityTelemetryPanel() {
  const [selectedKernel, setSelectedKernel] = useState<string | null>(null);
  
  const { data: fleetData, isLoading, error } = useQuery<{ success: boolean; data: FleetTelemetry }>({
    queryKey: QUERY_KEYS.olympus.telemetryFleet(),
    refetchInterval: 30000,
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading capability telemetry...
        </CardContent>
      </Card>
    );
  }
  
  if (error || !fleetData?.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          Failed to load capability telemetry
        </CardContent>
      </Card>
    );
  }
  
  const fleet = fleetData.data;
  
  return (
    <Card data-testid="capability-telemetry-panel">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle>Kernel Capability Telemetry</CardTitle>
        </div>
        <CardDescription>
          Self-awareness metrics for all kernels - what they can do and how well they do it
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="kernels" data-testid="tab-kernels">Kernels</TabsTrigger>
            {selectedKernel && (
              <TabsTrigger value="detail" data-testid="tab-detail">
                {selectedKernel.charAt(0).toUpperCase() + selectedKernel.slice(1)}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <FleetOverview data={fleet} />
          </TabsContent>
          
          <TabsContent value="kernels" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fleet.kernel_summaries.map(summary => (
                <KernelCard 
                  key={summary.kernel_id} 
                  summary={summary}
                  onSelect={() => setSelectedKernel(summary.kernel_id)}
                />
              ))}
            </div>
          </TabsContent>
          
          {selectedKernel && (
            <TabsContent value="detail" className="mt-4">
              <KernelDetail kernelId={selectedKernel} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
