import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  TrendingUp
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

export default function ToolFactoryDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tools");
  
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [gitDesc, setGitDesc] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileDesc, setFileDesc] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  
  const [generateDesc, setGenerateDesc] = useState("");
  const [generateExamples, setGenerateExamples] = useState("");
  
  const [testToolId, setTestToolId] = useState("");
  const [testArgs, setTestArgs] = useState("{}");

  const { data: stats, isLoading: statsLoading } = useQuery<ToolFactoryStats>({
    queryKey: ["/api/olympus/zeus/tools/stats"],
    refetchInterval: 10000,
  });

  const { data: toolsData, isLoading: toolsLoading } = useQuery<{ tools: GeneratedTool[] }>({
    queryKey: ["/api/olympus/zeus/tools"],
    refetchInterval: 15000,
  });

  const { data: patternsData, isLoading: patternsLoading } = useQuery<{ patterns: LearnedPattern[] }>({
    queryKey: ["/api/olympus/zeus/tools/patterns"],
    refetchInterval: 15000,
  });

  const learnTemplateMutation = useMutation({
    mutationFn: async (data: { description: string; code: string }) => {
      const response = await apiRequest("POST", "/api/olympus/zeus/tools/learn/template", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Pattern learned from template" });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/patterns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/stats"] });
      setTemplateDesc("");
      setTemplateCode("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to learn template", description: error.message, variant: "destructive" });
    }
  });

  const learnGitMutation = useMutation({
    mutationFn: async (data: { url: string; description: string }) => {
      const response = await apiRequest("POST", "/api/olympus/zeus/tools/learn/git", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Git link queued for learning" });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/stats"] });
      setGitUrl("");
      setGitDesc("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to queue git link", description: error.message, variant: "destructive" });
    }
  });

  const learnFileMutation = useMutation({
    mutationFn: async (data: { content: string; description: string }) => {
      const response = await apiRequest("POST", "/api/olympus/zeus/tools/learn/file", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Patterns extracted from file" });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/patterns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/stats"] });
      setFileContent("");
      setFileDesc("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to learn from file", description: error.message, variant: "destructive" });
    }
  });

  const proactiveSearchMutation = useMutation({
    mutationFn: async (topic: string) => {
      const response = await apiRequest("POST", "/api/olympus/zeus/tools/learn/search", { topic });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: `Proactive learning initiated`, description: `${data.searches_queued} searches queued` });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/stats"] });
      setSearchTopic("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to initiate search", description: error.message, variant: "destructive" });
    }
  });

  const generateToolMutation = useMutation({
    mutationFn: async (data: { description: string; examples: Array<{ input: string; expected_output: string }> }) => {
      const response = await apiRequest("POST", "/api/olympus/zeus/tools/generate", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Tool generated successfully", description: data.tool?.name });
      } else {
        toast({ title: "Tool generation failed", description: data.message, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools/stats"] });
      setGenerateDesc("");
      setGenerateExamples("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate tool", description: error.message, variant: "destructive" });
    }
  });

  const executeToolMutation = useMutation({
    mutationFn: async (data: { toolId: string; args: Record<string, unknown> }) => {
      const response = await apiRequest("POST", `/api/olympus/zeus/tools/${data.toolId}/execute`, { args: data.args });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Tool executed", description: JSON.stringify(data.result) });
      } else {
        toast({ title: "Execution failed", description: data.error, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/olympus/zeus/tools"] });
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
                      <label className="text-sm font-medium">Tool ID</label>
                      <Input
                        value={testToolId}
                        onChange={(e) => setTestToolId(e.target.value)}
                        placeholder="e.g., tool_abc123"
                        data-testid="input-test-tool-id"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Arguments (JSON)</label>
                      <Input
                        value={testArgs}
                        onChange={(e) => setTestArgs(e.target.value)}
                        placeholder='{"text": "hello world"}'
                        data-testid="input-test-args"
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
                Provide a git link to learn patterns from
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
              <Button
                onClick={() => learnGitMutation.mutate({ url: gitUrl, description: gitDesc })}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate New Tool
              </CardTitle>
              <CardDescription>
                Describe what you want and provide examples. The kernel will synthesize from learned patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={generateDesc}
                  onChange={(e) => setGenerateDesc(e.target.value)}
                  placeholder="What should this tool do? e.g., 'Convert text to uppercase'"
                  data-testid="input-generate-desc"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Examples (JSON array)</label>
                <Textarea
                  value={generateExamples}
                  onChange={(e) => setGenerateExamples(e.target.value)}
                  placeholder='[{"input": "hello", "expected_output": "HELLO"}]'
                  className="font-mono min-h-[100px]"
                  data-testid="input-generate-examples"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!generateDesc || generateToolMutation.isPending}
                className="w-full"
                data-testid="button-generate-tool"
              >
                {generateToolMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Tool
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
