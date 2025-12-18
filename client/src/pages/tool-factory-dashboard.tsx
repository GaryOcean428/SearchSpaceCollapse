import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Textarea,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { API_ROUTES, QUERY_KEYS } from "@/api";
import { 
  Wrench, 
  Brain, 
  GitBranch, 
  FileCode, 
  Search, 
  Play, 
  Star,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Eye,
  Upload,
  Sparkles,
  TrendingUp,
  Key,
  Trash2,
  Clock,
  AlertCircle,
  Zap,
  RefreshCw,
  Lightbulb,
  CircleDot
} from "lucide-react";

interface GeneratedTool {
  tool_id: string;
  name: string;
  description: string;
  code: string;
  input_schema: Record<string, string>;
  output_type: string;
  complexity: string;
  safety_level: string;
  times_used: number;
  times_succeeded: number;
  times_failed: number;
  user_rating: number;
  success_rate: number;
  generativity_score: number;
  validated: boolean;
  source_patterns: string[];
}

interface LearnedPattern {
  pattern_id: string;
  source_type: string;
  source_url: string | null;
  description: string;
  code_snippet: string;
  input_signature: Record<string, string>;
  output_type: string;
  times_used: number;
  success_rate: number;
}

interface ToolFactoryStats {
  generation_attempts: number;
  successful_generations: number;
  success_rate: number;
  complexity_ceiling: string;
  tools_registered: number;
  patterns_learned: number;
  patterns_by_source: Record<string, number>;
  total_tool_uses: number;
  avg_tool_success_rate: number;
  generativity_score: number;
  pattern_observations: number;
  pending_searches: number;
}

interface GitQueueItem {
  url: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  secret_key_name: string | null;
  queued_at: string;
  error: string | null;
}

interface GitQueueResponse {
  queue: GitQueueItem[];
  total: number;
  pending: number;
  completed: number;
  failed: number;
}

interface PipelineRequest {
  request_id: string;
  description: string;
  requester: string;
  state: string;
  created_at: number;
  updated_at: number;
  iteration: number;
  max_iterations: number;
  research_requests: string[];
  test_failures: Array<{ iteration: number; errors: string[]; timestamp: number }>;
  generated_tool_id: string | null;
  error_count: number;
}

interface PipelineStatus {
  running: boolean;
  total_requests: number;
  by_state: Record<string, number>;
  deployed_count: number;
  active_count: number;
  failed_count: number;
  research_bridge_connected: boolean;
}

interface PipelineRequestsResponse {
  requests: PipelineRequest[];
  count: number;
}

export default function ToolFactoryDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tools");
  
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [gitDesc, setGitDesc] = useState("");
  const [gitSecretKeyName, setGitSecretKeyName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileDesc, setFileDesc] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  
  const [generateDesc, setGenerateDesc] = useState("");
  const [generateExamples, setGenerateExamples] = useState("");
  const [inventConcept, setInventConcept] = useState("");
  
  const [testToolId, setTestToolId] = useState("");
  const [testArgs, setTestArgs] = useState("{}");

  const { data: stats, isLoading: statsLoading } = useQuery<ToolFactoryStats>({
    queryKey: QUERY_KEYS.olympus.toolsStats(),
    refetchInterval: 10000,
  });

  const { data: toolsData, isLoading: toolsLoading } = useQuery<{ tools: GeneratedTool[] }>({
    queryKey: QUERY_KEYS.olympus.toolsList(),
    refetchInterval: 15000,
  });

  const { data: patternsData, isLoading: patternsLoading } = useQuery<{ patterns: LearnedPattern[] }>({
    queryKey: QUERY_KEYS.olympus.toolsPatterns(),
    refetchInterval: 15000,
  });

  const { data: gitQueueData, isLoading: gitQueueLoading } = useQuery<GitQueueResponse>({
    queryKey: QUERY_KEYS.olympus.toolsLearnGitQueue(),
    refetchInterval: 5000,
  });

  const { data: pipelineStatusData } = useQuery<PipelineStatus>({
    queryKey: QUERY_KEYS.olympus.toolsPipelineStatus(),
    refetchInterval: 5000,
  });

  const { data: pipelineRequestsData } = useQuery<PipelineRequestsResponse>({
    queryKey: QUERY_KEYS.olympus.toolsPipelineRequests(),
    refetchInterval: 5000,
  });

  const clearGitQueueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.learnGitQueueClear, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Cleared completed items from queue" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsLearnGitQueue() });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clear queue", description: error.message, variant: "destructive" });
    }
  });

  const learnTemplateMutation = useMutation({
    mutationFn: async (data: { description: string; code: string }) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.learnTemplate, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Pattern learned from template" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsPatterns() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsStats() });
      setTemplateDesc("");
      setTemplateCode("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to learn template", description: error.message, variant: "destructive" });
    }
  });

  const learnGitMutation = useMutation({
    mutationFn: async (data: { url: string; description: string; secret_key_name?: string }) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.learnGit, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Git link queued for learning" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsStats() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsLearnGitQueue() });
      setGitUrl("");
      setGitDesc("");
      setGitSecretKeyName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to queue git link", description: error.message, variant: "destructive" });
    }
  });

  const learnFileMutation = useMutation({
    mutationFn: async (data: { content: string; description: string }) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.learnFile, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Patterns extracted from file" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsPatterns() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsStats() });
      setFileContent("");
      setFileDesc("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to learn from file", description: error.message, variant: "destructive" });
    }
  });

  const proactiveSearchMutation = useMutation({
    mutationFn: async (topic: string) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.learnSearch, { topic });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: `Proactive learning initiated`, description: `${data.searches_queued} searches queued` });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsStats() });
      setSearchTopic("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to initiate search", description: error.message, variant: "destructive" });
    }
  });

  const generateToolMutation = useMutation({
    mutationFn: async (data: { description: string; examples: Array<{ input: string; expected_output: string }> }) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.generate, data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Tool generated successfully", description: data.tool?.name });
      } else {
        toast({ title: "Tool generation failed", description: data.message, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsList() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsStats() });
      setGenerateDesc("");
      setGenerateExamples("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate tool", description: error.message, variant: "destructive" });
    }
  });

  const pipelineRequestMutation = useMutation({
    mutationFn: async (data: { description: string; examples: Array<{ input: string; expected_output: string }> }) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.pipelineRequest, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Autonomous tool request submitted", description: `Request ID: ${data.request_id}` });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsPipelineRequests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsPipelineStatus() });
      setGenerateDesc("");
      setGenerateExamples("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit request", description: error.message, variant: "destructive" });
    }
  });

  const inventToolMutation = useMutation({
    mutationFn: async (concept: string) => {
      const response = await apiRequest("POST", API_ROUTES.olympus.tools.pipelineInvent, { concept });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Tool invention requested", description: `Request ID: ${data.request_id}` });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsPipelineRequests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsPipelineStatus() });
      setInventConcept("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to request invention", description: error.message, variant: "destructive" });
    }
  });

  const executeToolMutation = useMutation({
    mutationFn: async (data: { toolId: string; args: Record<string, unknown> }) => {
      const response = await apiRequest("POST", `${API_ROUTES.olympus.tools.list}/${data.toolId}/execute`, { args: data.args });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Tool executed", description: JSON.stringify(data.result) });
      } else {
        toast({ title: "Execution failed", description: data.error, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.toolsList() });
    },
    onError: (error: Error) => {
      toast({ title: "Execution error", description: error.message, variant: "destructive" });
    }
  });

  const tools = toolsData?.tools || [];
  const patterns = patternsData?.patterns || [];

  const handleGenerate = () => {
    let examples: Array<{ input: string; expected_output: string }> = [];
    try {
      if (generateExamples.trim()) {
        examples = JSON.parse(generateExamples);
      }
    } catch {
      toast({ title: "Invalid examples JSON", variant: "destructive" });
      return;
    }
    generateToolMutation.mutate({ description: generateDesc, examples });
  };

  const handleExecute = () => {
    try {
      const args = JSON.parse(testArgs);
      executeToolMutation.mutate({ toolId: testToolId, args });
    } catch {
      toast({ title: "Invalid JSON args", variant: "destructive" });
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "user_provided": return <FileCode className="h-4 w-4" />;
      case "git_repository": return <GitBranch className="h-4 w-4" />;
      case "file_upload": return <Upload className="h-4 w-4" />;
      case "search_result": return <Search className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "TRIVIAL": return "bg-gray-500";
      case "SIMPLE": return "bg-green-500";
      case "MODERATE": return "bg-yellow-500";
      case "COMPLEX": return "bg-orange-500";
      case "ADVANCED": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPipelineStateColor = (state: string) => {
    switch (state) {
      case "requested": return "bg-gray-500";
      case "researching": return "bg-blue-500";
      case "prototyping": return "bg-yellow-500";
      case "testing": return "bg-purple-500";
      case "improving": return "bg-orange-500";
      case "deployed": return "bg-green-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handlePipelineRequest = () => {
    let examples: Array<{ input: string; expected_output: string }> = [];
    try {
      if (generateExamples.trim()) {
        examples = JSON.parse(generateExamples);
      }
    } catch {
      toast({ title: "Invalid examples JSON", variant: "destructive" });
      return;
    }
    pipelineRequestMutation.mutate({ description: generateDesc, examples });
  };

  const pipelineRequests = pipelineRequestsData?.requests || [];

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="tool-factory-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
            <Wrench className="h-8 w-8" />
            Tool Factory
          </h1>
          <p className="text-muted-foreground">
            QIG Kernel Self-Learning Tool Generation
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2" data-testid="badge-generativity">
          <Sparkles className="h-4 w-4 mr-2" />
          Generativity: {stats?.generativity_score?.toFixed(2) || "0.00"}
        </Badge>
      </div>

      {/* How It Works */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div>
                <p className="font-medium">Teach Patterns</p>
                <p className="text-muted-foreground">Give the kernel code examples via templates, git links, or file uploads</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div>
                <p className="font-medium">Kernel Learns</p>
                <p className="text-muted-foreground">Patterns are stored with 64D basin coordinates for geometric matching</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <div>
                <p className="font-medium">Generate Tools</p>
                <p className="text-muted-foreground">Describe what you need and the kernel creates tools from learned patterns</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</div>
              <div>
                <p className="font-medium">Execute & Rate</p>
                <p className="text-muted-foreground">Test tools, rate them, and watch the kernel improve over time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-tools-count">{stats?.tools_registered || 0}</div>
            <div className="text-sm text-muted-foreground">Tools Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-patterns-count">{stats?.patterns_learned || 0}</div>
            <div className="text-sm text-muted-foreground">Patterns Learned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-success-rate">
              {((stats?.success_rate || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-complexity-ceiling">
              {stats?.complexity_ceiling || "SIMPLE"}
            </div>
            <div className="text-sm text-muted-foreground">Complexity Ceiling</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-total-uses">{stats?.total_tool_uses || 0}</div>
            <div className="text-sm text-muted-foreground">Total Tool Uses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-pending-searches">{stats?.pending_searches || 0}</div>
            <div className="text-sm text-muted-foreground">Pending Searches</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tools" data-testid="tab-tools">
            <Wrench className="h-4 w-4 mr-2" />
            Tools ({tools.length})
          </TabsTrigger>
          <TabsTrigger value="patterns" data-testid="tab-patterns">
            <Brain className="h-4 w-4 mr-2" />
            Patterns ({patterns.length})
          </TabsTrigger>
          <TabsTrigger value="learn" data-testid="tab-learn">
            <Plus className="h-4 w-4 mr-2" />
            Teach
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          {toolsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : tools.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tools generated yet. Teach the kernel some patterns first!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tools.map((tool) => (
                <Card key={tool.tool_id} data-testid={`card-tool-${tool.tool_id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {tool.validated ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          {tool.name}
                        </CardTitle>
                        <CardDescription>{tool.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getComplexityColor(tool.complexity)}>
                          {tool.complexity}
                        </Badge>
                        <Badge variant="outline">{tool.safety_level}</Badge>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span>{(tool.user_rating * 5).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{tool.code}</code>
                    </pre>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Uses: {tool.times_used}</span>
                      <span>Success: {(tool.success_rate * 100).toFixed(0)}%</span>
                      <span>Generativity: {tool.generativity_score.toFixed(3)}</span>
                      {tool.source_patterns.length > 0 && (
                        <span>From: {tool.source_patterns.length} patterns</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Test Tool Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Execute Tool
              </CardTitle>
              <CardDescription>
                Test a generated tool by running it with arguments. Copy the Tool ID from the list above and provide JSON arguments matching the tool's input schema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tools.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium mb-2">No tools available to execute yet.</p>
                  <p>First, teach the kernel some patterns in the "Teach" tab, then generate tools in the "Generate" tab. Once tools are created, you can test them here.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                      <label className="text-sm font-medium">Tool ID</label>
                      <Input
                        value={testToolId}
                        onChange={(e) => setTestToolId(e.target.value)}
                        placeholder="e.g., tool_abc123"
                        data-testid="input-test-tool-id"
                        aria-label="Tool ID"
                      />
                    </div>
                    <div>
                      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                      <label className="text-sm font-medium">Arguments (JSON)</label>
                      <Input
                        value={testArgs}
                        onChange={(e) => setTestArgs(e.target.value)}
                        placeholder='{"text": "hello world"}'
                        data-testid="input-test-args"
                        aria-label="Arguments in JSON format"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Example: If tool expects text input, use: {"{"}"text": "your input here"{"}"}
                  </div>
                  <Button 
                    onClick={handleExecute}
                    disabled={!testToolId || executeToolMutation.isPending}
                    data-testid="button-execute-tool"
                  >
                    {executeToolMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {patternsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : patterns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No patterns learned yet. Teach the kernel by providing templates, git links, or files!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {patterns.map((pattern) => (
                <Card key={pattern.pattern_id} data-testid={`card-pattern-${pattern.pattern_id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {getSourceIcon(pattern.source_type)}
                        {pattern.description}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.source_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Used {pattern.times_used}x
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{pattern.code_snippet}</code>
                    </pre>
                    {pattern.source_url && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Source: {pattern.source_url}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pattern Sources Breakdown */}
          {stats?.patterns_by_source && Object.keys(stats.patterns_by_source).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Patterns by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.patterns_by_source).map(([source, count]) => (
                    <div key={source} className="flex items-center gap-2">
                      {getSourceIcon(source)}
                      <span className="capitalize">{source.replace(/_/g, " ")}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Learn/Teach Tab */}
        <TabsContent value="learn" className="space-y-6">
          {/* User Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Teach from Template
              </CardTitle>
              <CardDescription>
                Provide a code template for the kernel to learn from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Description: e.g., 'Reverse a string'"
                data-testid="input-template-desc"
              />
              <Textarea
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                placeholder="def reverse_string(text: str) -> str:&#10;    return text[::-1]"
                className="font-mono min-h-[150px]"
                data-testid="input-template-code"
              />
              <Button
                onClick={() => learnTemplateMutation.mutate({ description: templateDesc, code: templateCode })}
                disabled={!templateDesc || !templateCode || learnTemplateMutation.isPending}
                data-testid="button-learn-template"
              >
                {learnTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Teach Pattern
              </Button>
            </CardContent>
          </Card>

          {/* Git Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Learn from Git Repository
              </CardTitle>
              <CardDescription>
                Provide a git link to learn patterns from. For private repos, add your API key to Replit Secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                data-testid="input-git-url"
              />
              <Input
                value={gitDesc}
                onChange={(e) => setGitDesc(e.target.value)}
                placeholder="Description: e.g., 'Bitcoin address validation utilities'"
                data-testid="input-git-desc"
              />
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={gitSecretKeyName}
                  onChange={(e) => setGitSecretKeyName(e.target.value)}
                  placeholder="Secret name (e.g., GITHUB_TOKEN) - optional for private repos"
                  data-testid="input-git-secret-key"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For private repos: Add your API key to Replit Secrets, then enter the secret name above.
              </p>
              <Button
                onClick={() => learnGitMutation.mutate({ 
                  url: gitUrl, 
                  description: gitDesc,
                  secret_key_name: gitSecretKeyName || undefined
                })}
                disabled={!gitUrl || learnGitMutation.isPending}
                data-testid="button-learn-git"
              >
                {learnGitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4 mr-2" />
                )}
                Queue Git Learning
              </Button>

              {/* Git Queue Status */}
              {gitQueueData && gitQueueData.queue.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Queue ({gitQueueData.pending} pending)
                    </h4>
                    {(gitQueueData.completed > 0 || gitQueueData.failed > 0) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => clearGitQueueMutation.mutate()}
                        disabled={clearGitQueueMutation.isPending}
                        data-testid="button-clear-queue"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear Done
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gitQueueData.queue.map((item, idx) => (
                      <div 
                        key={`${item.url}-${idx}`}
                        className="text-xs p-2 rounded border bg-muted/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {item.status === 'pending' && <Clock className="h-3 w-3 text-yellow-500" />}
                          {item.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                          {item.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {item.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                          <Badge variant={
                            item.status === 'completed' ? 'default' :
                            item.status === 'failed' ? 'destructive' :
                            item.status === 'processing' ? 'secondary' : 'outline'
                          }>
                            {item.status}
                          </Badge>
                          {item.secret_key_name && (
                            <Badge variant="outline">
                              <Key className="h-2 w-2 mr-1" />
                              {item.secret_key_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground truncate" title={item.url}>
                          {item.url}
                        </p>
                        {item.error && (
                          <p className="text-destructive mt-1">{item.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Learn from File
              </CardTitle>
              <CardDescription>
                Paste Python code to extract function patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={fileDesc}
                onChange={(e) => setFileDesc(e.target.value)}
                placeholder="Description: e.g., 'String manipulation utilities'"
                data-testid="input-file-desc"
              />
              <Textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="Paste Python code here..."
                className="font-mono min-h-[200px]"
                data-testid="input-file-content"
              />
              <Button
                onClick={() => learnFileMutation.mutate({ content: fileContent, description: fileDesc })}
                disabled={!fileContent || learnFileMutation.isPending}
                data-testid="button-learn-file"
              >
                {learnFileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Extract Patterns
              </Button>
            </CardContent>
          </Card>

          {/* Proactive Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Proactive Learning Search
              </CardTitle>
              <CardDescription>
                Search git repos and tutorials to learn new patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                placeholder="Topic: e.g., 'Bitcoin address validation'"
                data-testid="input-search-topic"
              />
              <Button
                onClick={() => proactiveSearchMutation.mutate(searchTopic)}
                disabled={!searchTopic || proactiveSearchMutation.isPending}
                data-testid="button-proactive-search"
              >
                {proactiveSearchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search & Learn
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          {/* Pipeline Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Autonomous Pipeline Status
              </CardTitle>
              <CardDescription>
                Self-improving tool generation with research integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <CircleDot className={`h-4 w-4 ${pipelineStatusData?.running ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-sm">
                    {pipelineStatusData?.running ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Deployed: {pipelineStatusData?.deployed_count || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Active: {pipelineStatusData?.active_count || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Failed: {pipelineStatusData?.failed_count || 0}</span>
                </div>
              </div>
              {pipelineStatusData?.research_bridge_connected && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Shadow Research bridge connected
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Pipeline Requests */}
          {pipelineRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Requests ({pipelineRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipelineRequests.map((req) => (
                    <div
                      key={req.request_id}
                      className="p-3 border rounded-lg space-y-2"
                      data-testid={`pipeline-request-${req.request_id}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className={getPipelineStateColor(req.state)}>
                          {req.state}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Iteration {req.iteration}/{req.max_iterations}
                        </span>
                      </div>
                      <p className="text-sm">{req.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>From: {req.requester}</span>
                        {req.error_count > 0 && (
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {req.error_count} errors
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit New Autonomous Request */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Request Autonomous Tool
              </CardTitle>
              <CardDescription>
                Submit a tool request. The pipeline will research, prototype, test, and improve automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="generate-desc-input">Description</label>
                <Input
                  id="generate-desc-input"
                  value={generateDesc}
                  onChange={(e) => setGenerateDesc(e.target.value)}
                  placeholder="What should this tool do? e.g., 'Convert text to uppercase'"
                  data-testid="input-generate-desc"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="generate-examples-input">Examples (JSON array, optional)</label>
                <Textarea
                  id="generate-examples-input"
                  value={generateExamples}
                  onChange={(e) => setGenerateExamples(e.target.value)}
                  placeholder='[{"input": "hello", "expected_output": "HELLO"}]'
                  className="font-mono min-h-[100px]"
                  data-testid="input-generate-examples"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePipelineRequest}
                  disabled={!generateDesc || pipelineRequestMutation.isPending}
                  className="flex-1"
                  data-testid="button-pipeline-request"
                >
                  {pipelineRequestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Submit Autonomous Request
                </Button>
                <Button
                  onClick={handleGenerate}
                  variant="outline"
                  disabled={!generateDesc || generateToolMutation.isPending}
                  data-testid="button-generate-tool"
                >
                  {generateToolMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invent New Tool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Invent New Tool
              </CardTitle>
              <CardDescription>
                Describe a concept and let the kernel research and invent a tool for it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="invent-concept-input">Concept</label>
                <Input
                  id="invent-concept-input"
                  value={inventConcept}
                  onChange={(e) => setInventConcept(e.target.value)}
                  placeholder="e.g., 'Bitcoin address checksum validator'"
                  data-testid="input-invent-concept"
                />
              </div>
              <Button
                onClick={() => inventToolMutation.mutate(inventConcept)}
                disabled={!inventConcept || inventToolMutation.isPending}
                className="w-full"
                data-testid="button-invent-tool"
              >
                {inventToolMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Invent Tool
              </Button>
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Generation Attempts</span>
                  <span className="font-bold">{stats?.generation_attempts || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Successful Generations</span>
                  <span className="font-bold text-green-500">{stats?.successful_generations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pattern Observations</span>
                  <span className="font-bold">{stats?.pattern_observations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Tool Success Rate</span>
                  <span className="font-bold">{((stats?.avg_tool_success_rate || 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
