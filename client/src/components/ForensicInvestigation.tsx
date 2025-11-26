import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Clock,
  Fingerprint,
  Network,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Sparkles,
  Calendar,
  Hash,
  Key,
  Shield,
  TrendingUp,
  Users,
  Copy,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface MemoryFragment {
  text: string;
  confidence: number;
  position: 'start' | 'middle' | 'end' | 'unknown';
  epoch: 'pre-2010' | 'early' | 'likely' | 'possible';
}

interface ForensicAnalysis {
  address: string;
  forensics: {
    address: string;
    creationBlock?: number;
    creationTimestamp?: string;
    totalReceived: number;
    totalSent: number;
    balance: number;
    txCount: number;
    siblingAddresses: string[];
    relatedAddresses: string[];
  };
  likelyKeyFormat: { format: string; confidence: number; reasoning: string }[];
  isPreBIP39Era: boolean;
  recommendations: string[];
}

interface ForensicHypothesis {
  phrase: string;
  method: string;
  confidence: number;
  phi?: number;
  kappa?: number;
  regime?: string;
  combinedScore: number;
  address?: string;
  match?: boolean;
}

interface HypothesesResult {
  targetAddress: string;
  totalHypotheses: number;
  matchFound: boolean;
  matches: ForensicHypothesis[];
  byFormat: Record<string, {
    count: number;
    topCandidates: ForensicHypothesis[];
  }>;
}

const FORMAT_COLORS: Record<string, string> = {
  arbitrary: 'bg-amber-600',
  bip39: 'bg-blue-600',
  master: 'bg-purple-600',
  hex: 'bg-green-600',
  derived: 'bg-pink-600',
};

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  arbitrary: '2009-era brain wallet (SHA256 → privkey)',
  bip39: 'BIP39 mnemonic phrase (less likely for 2009)',
  master: 'BIP32 master key derivative',
  hex: 'Hex fragment (partial private key)',
  derived: 'Derived from other patterns',
};

export function ForensicInvestigation() {
  const { toast } = useToast();
  const [targetAddress, setTargetAddress] = useState("");
  const [fragments, setFragments] = useState<MemoryFragment[]>([
    { text: "", confidence: 0.8, position: "unknown", epoch: "likely" },
  ]);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  // Fetch target addresses
  const { data: targetAddresses } = useQuery<{ address: string; label?: string }[]>({
    queryKey: ["/api/target-addresses"],
  });

  // Quick forensic analysis of an address
  const analyzeMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await apiRequest("GET", `/api/forensic/analyze/${encodeURIComponent(address)}`);
      return response.json() as Promise<ForensicAnalysis>;
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate cross-format hypotheses
  const hypothesesMutation = useMutation({
    mutationFn: async ({ targetAddr, frags }: { targetAddr: string; frags: MemoryFragment[] }) => {
      const response = await apiRequest("POST", "/api/forensic/hypotheses", {
        targetAddress: targetAddr,
        fragments: frags.filter(f => f.text.trim().length > 0),
      });
      return response.json() as Promise<HypothesesResult>;
    },
    onSuccess: (data) => {
      if (data.matchFound) {
        toast({
          title: "🎯 MATCH FOUND!",
          description: `Found ${data.matches.length} matching hypothesis(es)!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Hypothesis Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update fragment at index
  const updateFragment = (index: number, field: keyof MemoryFragment, value: any) => {
    setFragments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add new fragment
  const addFragment = () => {
    setFragments(prev => [
      ...prev,
      { text: "", confidence: 0.8, position: "unknown", epoch: "likely" },
    ]);
  };

  // Remove fragment
  const removeFragment = (index: number) => {
    if (fragments.length > 1) {
      setFragments(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Copy phrase to clipboard
  const copyPhrase = async (phrase: string) => {
    await navigator.clipboard.writeText(phrase);
    setCopiedPhrase(phrase);
    setTimeout(() => setCopiedPhrase(null), 2000);
    toast({ title: "Copied!", description: "Phrase copied to clipboard" });
  };

  // Run analysis when address is selected
  const handleAddressSelect = (address: string) => {
    setTargetAddress(address);
    if (address) {
      analyzeMutation.mutate(address);
    }
  };

  // Run hypothesis generation
  const runInvestigation = () => {
    const validFragments = fragments.filter(f => f.text.trim().length > 0);
    if (validFragments.length === 0) {
      toast({
        title: "No Fragments",
        description: "Please enter at least one memory fragment",
        variant: "destructive",
      });
      return;
    }

    const addr = targetAddress || (targetAddresses?.[0]?.address ?? "");
    if (!addr) {
      toast({
        title: "No Target Address",
        description: "Please select or enter a target address",
        variant: "destructive",
      });
      return;
    }

    hypothesesMutation.mutate({ targetAddr: addr, frags: validFragments });
  };

  const analysis = analyzeMutation.data;
  const hypotheses = hypothesesMutation.data;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-950/40 to-indigo-950/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <Fingerprint className="w-6 h-6 text-purple-400" />
            <span>Forensic Investigation</span>
            <Badge variant="outline" className="ml-2 border-purple-500/50 text-purple-400">
              Cross-Format Hypothesis Engine
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Conducts forensic archaeology across multiple key formats. Pre-2009 addresses use
            brain wallets (arbitrary passphrases), not BIP39.
          </p>
        </CardHeader>
      </Card>

      {/* Target Address Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Target Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={targetAddress} onValueChange={handleAddressSelect}>
              <SelectTrigger className="flex-1" data-testid="select-target-address">
                <SelectValue placeholder="Select target address..." />
              </SelectTrigger>
              <SelectContent>
                {targetAddresses?.map((addr) => (
                  <SelectItem key={addr.address} value={addr.address}>
                    {addr.label ? `${addr.label} - ` : ""}{addr.address.slice(0, 20)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Or paste address..."
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className="flex-1 font-mono text-sm"
              data-testid="input-target-address"
            />
            <Button
              variant="outline"
              onClick={() => analyzeMutation.mutate(targetAddress)}
              disabled={!targetAddress || analyzeMutation.isPending}
              data-testid="button-analyze-address"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Address Forensics Analysis */}
      {analysis && (
        <Card className="border-cyan-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              Blockchain Forensics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Era Badge */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge
                className={`text-sm px-3 py-1 ${
                  analysis.isPreBIP39Era ? "bg-amber-600" : "bg-blue-600"
                }`}
              >
                {analysis.isPreBIP39Era ? "Pre-BIP39 Era (before 2013)" : "Post-BIP39 Era"}
              </Badge>
              
              {analysis.forensics.creationTimestamp && (
                <Badge variant="outline" className="text-sm gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(analysis.forensics.creationTimestamp).toLocaleDateString()}
                </Badge>
              )}
              
              <Badge variant="outline" className="text-sm gap-1">
                <Hash className="w-3 h-3" />
                Block {analysis.forensics.creationBlock?.toLocaleString() || "Unknown"}
              </Badge>
            </div>

            {/* Likely Key Format */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Likely Key Format</h4>
              <div className="grid gap-2">
                {analysis.likelyKeyFormat.map((format, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <Badge className={`${FORMAT_COLORS[format.format] || 'bg-gray-600'}`}>
                      {format.format}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Progress value={format.confidence * 100} className="flex-1 h-2" />
                        <span className="text-sm font-medium">
                          {(format.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
              <div className="space-y-1">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address Stats */}
            {analysis.forensics.txCount > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                <div className="text-center p-2 rounded bg-muted/30">
                  <div className="text-lg font-semibold">
                    {analysis.forensics.txCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Transactions</div>
                </div>
                <div className="text-center p-2 rounded bg-muted/30">
                  <div className="text-lg font-semibold">
                    {(analysis.forensics.balance / 100000000).toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">Balance (BTC)</div>
                </div>
                <div className="text-center p-2 rounded bg-muted/30">
                  <div className="text-lg font-semibold">
                    {analysis.forensics.siblingAddresses.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Sibling Addresses</div>
                </div>
                <div className="text-center p-2 rounded bg-muted/30">
                  <div className="text-lg font-semibold">
                    {analysis.forensics.relatedAddresses.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Related Addresses</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Memory Fragments Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="w-4 h-4" />
            Memory Fragments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fragments.map((fragment, index) => (
            <div key={index} className="space-y-2 p-3 rounded-lg bg-muted/30">
              <div className="flex gap-2">
                <Input
                  placeholder={`Fragment ${index + 1} (e.g., "whitetiger77")`}
                  value={fragment.text}
                  onChange={(e) => updateFragment(index, "text", e.target.value)}
                  className="flex-1 font-mono"
                  data-testid={`input-fragment-${index}`}
                />
                {fragments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFragment(index)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-remove-fragment-${index}`}
                  >
                    ×
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <Slider
                    value={[fragment.confidence * 100]}
                    onValueChange={([val]) => updateFragment(index, "confidence", val / 100)}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs font-medium w-10">
                    {(fragment.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                
                <Select
                  value={fragment.epoch}
                  onValueChange={(val) => updateFragment(index, "epoch", val)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-2010">Pre-2010</SelectItem>
                    <SelectItem value="early">2010-2012</SelectItem>
                    <SelectItem value="likely">Likely</SelectItem>
                    <SelectItem value="possible">Possible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addFragment}
              data-testid="button-add-fragment"
            >
              + Add Fragment
            </Button>
            <Button
              onClick={runInvestigation}
              disabled={hypothesesMutation.isPending}
              className="ml-auto bg-purple-600 hover:bg-purple-700"
              data-testid="button-run-investigation"
            >
              {hypothesesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Investigating...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Run Forensic Investigation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hypothesis Results */}
      {hypotheses && (
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-500" />
              Cross-Format Hypothesis Results
              <Badge variant="outline" className="ml-2">
                {hypotheses.totalHypotheses.toLocaleString()} hypotheses
              </Badge>
              {hypotheses.matchFound && (
                <Badge className="bg-green-600 ml-2">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  MATCH FOUND!
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="arbitrary" className="w-full">
              <TabsList className="flex-wrap h-auto gap-1 mb-4">
                {Object.entries(hypotheses.byFormat).map(([format, data]) => (
                  <TabsTrigger key={format} value={format} className="gap-2">
                    <Badge className={`${FORMAT_COLORS[format] || 'bg-gray-600'} text-[10px] px-1.5`}>
                      {data.count}
                    </Badge>
                    {format}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(hypotheses.byFormat).map(([format, data]) => (
                <TabsContent key={format} value={format} className="mt-0">
                  <div className="space-y-1 mb-2">
                    <p className="text-sm text-muted-foreground">
                      {FORMAT_DESCRIPTIONS[format] || format}
                    </p>
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {data.topCandidates.map((hypo, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          hypo.match
                            ? "border-green-500 bg-green-500/10"
                            : "border-border bg-muted/30"
                        }`}
                        data-testid={`hypothesis-${format}-${i}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono break-all">
                                {hypo.phrase}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyPhrase(hypo.phrase)}
                                data-testid={`button-copy-${format}-${i}`}
                              >
                                {copiedPhrase === hypo.phrase ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                              {hypo.match && (
                                <Badge className="bg-green-600 text-xs">MATCH</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span>{hypo.method}</span>
                              <span>•</span>
                              <span>Conf: {(hypo.confidence * 100).toFixed(0)}%</span>
                              {hypo.phi !== undefined && (
                                <>
                                  <span>•</span>
                                  <span>Φ={hypo.phi.toFixed(3)}</span>
                                </>
                              )}
                              {hypo.kappa !== undefined && (
                                <>
                                  <span>κ={hypo.kappa.toFixed(1)}</span>
                                </>
                              )}
                              {hypo.regime && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {hypo.regime}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold">
                              {(hypo.combinedScore * 100).toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">score</div>
                          </div>
                        </div>
                        
                        {hypo.address && (
                          <div className="mt-2 pt-2 border-t border-dashed">
                            <div className="flex items-center gap-2">
                              <Key className="w-3 h-3 text-muted-foreground" />
                              <code className="text-xs font-mono text-muted-foreground truncate">
                                {hypo.address}
                              </code>
                              {hypo.match ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground/50" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
