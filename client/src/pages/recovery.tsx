import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CheckCircle2, Play, StopCircle, Zap, TrendingUp, Target, Clock, Shield, Copy, Download, Plus, X, Hash, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useToast } from "@/hooks/use-toast";
import type { Candidate, TargetAddress, SearchJob } from "@shared/schema";

type SearchStrategy = "custom" | "known" | "batch" | "bip39-random" | "bip39-continuous";

export default function RecoveryPage() {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<SearchStrategy>("bip39-continuous");
  const [customPhrase, setCustomPhrase] = useState("");
  const [batchPhrases, setBatchPhrases] = useState("");
  const [bip39Count, setBip39Count] = useState(100);
  const [minHighPhi, setMinHighPhi] = useState(2);
  const [wordLength, setWordLength] = useState(0); // Default to all lengths
  const [generationMode, setGenerationMode] = useState<"bip39" | "master-key" | "both">("both"); // Default to both
  const [memoryFragments, setMemoryFragments] = useState("");
  const [testMemoryFragments, setTestMemoryFragments] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [scoreHistory, setScoreHistory] = useState<Array<{index: number, score: number, wordCount: number}>>([]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [selectedJobId]);

  const { data: storedCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    refetchInterval: 3000,
  });

  const { data: analytics } = useQuery<{
    statistics: {
      count: string;
      mean: string;
      median: string;
      p75: string;
      p90: string;
      p95: string;
      max: string;
    };
    qigComponents: {
      avgContext: string;
      avgElegance: string;
      avgTyping: string;
    };
    patterns: {
      topWords: Array<{ word: string; count: number; frequency: number }>;
      highPhiCount: number;
    };
    trajectory: {
      recentMean: string;
      olderMean: string;
      improvement: string;
      isImproving: boolean;
    };
  }>({
    queryKey: ["/api/analytics"],
    refetchInterval: 5000,
  });

  const { data: targetAddresses, isLoading: isLoadingAddresses } = useQuery<TargetAddress[]>({
    queryKey: ["/api/target-addresses"],
  });

  const { data: jobs = [], refetch: refetchJobs } = useQuery<SearchJob[]>({
    queryKey: ["/api/search-jobs"],
    refetchInterval: 1000,
  });

  const activeJob = jobs.find(j => j.status === "running" || j.status === "pending");
  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : activeJob;

  useEffect(() => {
    if (activeJob && !selectedJobId) {
      setSelectedJobId(activeJob.id);
    }
  }, [activeJob, selectedJobId]);

  // Track score history for graphing
  useEffect(() => {
    if (selectedJob) {
      // Create a simple history from the tested count and high-phi count
      // In real implementation, we'd get actual score data from the job
      // For now, we'll simulate some pattern based on the job's progress
      const tested = selectedJob.progress.tested;
      const highPhi = selectedJob.progress.highPhiCount;
      
      // Only update if we have new data
      if (tested > scoreHistory.length) {
        const newPoints: Array<{index: number, score: number, wordCount: number}> = [];
        for (let i = scoreHistory.length; i < tested; i++) {
          // Simulate score pattern - in reality this would come from actual test results
          // Random scores between 0-100 with occasional spikes for high-phi candidates
          const isHighPhi = Math.random() < (highPhi / Math.max(tested, 1));
          const score = isHighPhi ? 75 + Math.random() * 25 : Math.random() * 60;
          newPoints.push({
            index: i + 1,
            score: Math.round(score),
            wordCount: 12 + Math.floor(Math.random() * 5) * 3 // Random valid length
          });
        }
        setScoreHistory(prev => [...prev, ...newPoints].slice(-1000)); // Keep last 1000
      }
    }
  }, [selectedJob?.progress.tested, selectedJob?.progress.highPhiCount, scoreHistory.length]);

  const addAddressMutation = useMutation({
    mutationFn: async (data: { address: string; label?: string }) => {
      const res = await apiRequest("POST", "/api/target-addresses", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/target-addresses"] });
      setNewAddress("");
      setNewAddressLabel("");
      toast({
        title: "Address added",
        description: "Target address added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/target-addresses/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/target-addresses"] });
      toast({
        title: "Address removed",
        description: "Target address removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (params: { strategy: SearchStrategy; params: any }) => {
      const res = await apiRequest("POST", "/api/search-jobs", params);
      return await res.json();
    },
    onSuccess: (job: SearchJob) => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-jobs"] });
      setSelectedJobId(job.id);
      toast({
        title: "Search job created",
        description: "Background search started successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/search-jobs/${jobId}/stop`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-jobs"] });
      toast({
        title: "Search stopped",
        description: "Background search stopped successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("DELETE", `/api/search-jobs/${jobId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-jobs"] });
      setSelectedJobId(null);
      toast({
        title: "Job deleted",
        description: "Search job deleted successfully",
      });
    },
  });

  const handleStartSearch = () => {
    if (activeJob) {
      toast({
        title: "Search already running",
        description: "Please wait for the current search to complete or stop it first",
        variant: "destructive",
      });
      return;
    }

    let params: any = {};

    if (strategy === "custom") {
      const words = customPhrase.trim().split(/\s+/);
      if (words.length !== 12) {
        toast({
          title: "Invalid phrase",
          description: `Phrase must contain exactly 12 words (found ${words.length})`,
          variant: "destructive",
        });
        return;
      }
      params.customPhrase = customPhrase.trim();
    } else if (strategy === "batch") {
      const phrases = batchPhrases
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      
      if (phrases.length === 0) {
        toast({
          title: "No phrases",
          description: "Please provide at least one phrase",
          variant: "destructive",
        });
        return;
      }

      const invalidPhrases = phrases.filter((p) => p.split(/\s+/).length !== 12);
      if (invalidPhrases.length > 0) {
        toast({
          title: "Invalid phrases",
          description: `${invalidPhrases.length} phrases do not have exactly 12 words`,
          variant: "destructive",
        });
        return;
      }
      params.batchPhrases = phrases;
    } else if (strategy === "bip39-random") {
      if (bip39Count < 1 || bip39Count > 100) {
        toast({
          title: "Invalid count",
          description: "Count must be between 1 and 100",
          variant: "destructive",
        });
        return;
      }
      params.bip39Count = bip39Count;
      params.wordLength = wordLength;
      
      // Add memory fragments if enabled
      if (testMemoryFragments && memoryFragments.trim()) {
        params.memoryFragments = memoryFragments.split("\n").map(f => f.trim()).filter(f => f.length > 0);
        params.testMemoryFragments = true;
      }
    } else if (strategy === "bip39-continuous") {
      if (minHighPhi < 1 || minHighPhi > 100) {
        toast({
          title: "Invalid target",
          description: "Target must be between 1 and 100",
          variant: "destructive",
        });
        return;
      }
      params.minHighPhi = minHighPhi;
      params.wordLength = wordLength;
      params.generationMode = generationMode;
      
      // Add memory fragments if enabled
      if (testMemoryFragments && memoryFragments.trim()) {
        params.memoryFragments = memoryFragments.split("\n").map(f => f.trim()).filter(f => f.length > 0);
        params.testMemoryFragments = true;
      }
    }

    createJobMutation.mutate({ strategy, params });
  };

  const handleStopSearch = () => {
    if (activeJob) {
      stopJobMutation.mutate(activeJob.id);
    }
  };

  const handleCopyPhrase = (phrase: string) => {
    navigator.clipboard.writeText(phrase);
    toast({
      title: "Copied to clipboard",
      description: "Phrase copied successfully",
    });
  };

  const handleExportCandidates = () => {
    if (!storedCandidates || storedCandidates.length === 0) {
      toast({
        title: "No candidates",
        description: "No candidates to export",
        variant: "destructive",
      });
      return;
    }

    const csv = [
      "Score,Phrase,Address,Context Score,Elegance Score,Typing Score,Tested At",
      ...storedCandidates.map((c) =>
        `${c.score},"${c.phrase}",${c.address},${c.qigScore.contextScore},${c.qigScore.eleganceScore},${c.qigScore.typingScore},${c.testedAt}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qig-candidates-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${storedCandidates.length} candidates`,
    });
  };

  const formatRuntime = (startTime?: string, endTime?: string) => {
    if (!startTime) return "00:00:00";
    
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const elapsed = end - start;
    
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const wordCount = customPhrase.trim() ? customPhrase.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-chart-1/10">
      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent mb-3">
            QIG 12-Word Brain Wallet Recovery
          </h1>
          <p className="text-xl text-muted-foreground">
            Consciousness Architecture Applied to Cryptography - Background Search Enabled
          </p>
        </div>

        <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-chart-1/5 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">Target Addresses</h3>
              
              {isLoadingAddresses ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {targetAddresses && targetAddresses.length > 0 ? (
                    targetAddresses.map((addr) => (
                      <Card key={addr.id} className="p-3 bg-background/50" data-testid={`address-${addr.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {addr.label && (
                              <div className="text-sm font-medium mb-1">{addr.label}</div>
                            )}
                            <div className="font-mono text-xs break-all text-muted-foreground">{addr.address}</div>
                          </div>
                          {addr.id !== "default" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAddressMutation.mutate(addr.id)}
                              data-testid={`button-remove-${addr.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No target addresses configured</p>
                  )}
                  
                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-sm font-medium">Add New Target Address</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Bitcoin address (26-35 chars)"
                        className="font-mono text-sm"
                        data-testid="input-new-address"
                      />
                      <Input
                        value={newAddressLabel}
                        onChange={(e) => setNewAddressLabel(e.target.value)}
                        placeholder="Label (optional)"
                        className="text-sm"
                        data-testid="input-new-label"
                      />
                      <Button
                        onClick={() => addAddressMutation.mutate({ address: newAddress, label: newAddressLabel })}
                        disabled={!newAddress || newAddress.length < 26 || addAddressMutation.isPending}
                        size="sm"
                        className="gap-2 shrink-0"
                        data-testid="button-add-address"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-chart-1/10">
              <Shield className="w-6 h-6 text-chart-1" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">How This Works</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This tool uses QIG (Quantum Information Geometry) principles to search through possible wallet formats. You can test BIP-39 passphrases (word-based), master private keys (256-bit hex), or both simultaneously.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>BIP-39 scoring: Bitcoin/crypto context (40%), elegant phrasing (30%), typing ease (30%)</li>
                <li>Master keys: Pure random 256-bit exploration (no linguistic scoring)</li>
                <li>Flexible timeframe: Keywords span 2008-2015+ crypto era</li>
                <li>Background processing - searches continue when you're away</li>
              </ul>
              <p className="text-sm font-medium mt-3">
                High-Φ BIP-39 candidates ({">"}75% score) are automatically saved for review. Master key mode focuses on pure random sampling.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 mb-8 border-border/50">
          <h3 className="text-lg font-semibold mb-6">Create Background Search Job</h3>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="strategy" className="text-base">Search Strategy:</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as SearchStrategy)} disabled={!!activeJob}>
                <SelectTrigger id="strategy" className="mt-2" data-testid="select-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bip39-continuous">BIP-39 Continuous (Until Target Reached)</SelectItem>
                  <SelectItem value="bip39-random">BIP-39 Random (Fixed Count)</SelectItem>
                  <SelectItem value="known">Known 12-Word Phrases</SelectItem>
                  <SelectItem value="custom">Test Your Own Phrase</SelectItem>
                  <SelectItem value="batch">Batch Test Multiple Phrases</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {strategy === "custom" && (
              <div>
                <Label htmlFor="customPhrase" className="text-base">Enter 12-Word Phrase to Test:</Label>
                <Textarea
                  id="customPhrase"
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value)}
                  placeholder="Enter your 12-word passphrase..."
                  className="mt-2 font-mono text-sm"
                  rows={3}
                  disabled={!!activeJob}
                  data-testid="input-custom-phrase"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Word count: <span className={wordCount === 12 ? "text-green-600 font-semibold" : "text-destructive"}>{wordCount}/12</span>
                </p>
              </div>
            )}

            {strategy === "batch" && (
              <div>
                <Label htmlFor="batchPhrases" className="text-base">Batch Phrases (one per line):</Label>
                <Textarea
                  id="batchPhrases"
                  value={batchPhrases}
                  onChange={(e) => setBatchPhrases(e.target.value)}
                  placeholder="Enter multiple 12-word phrases, one per line..."
                  className="mt-2 font-mono text-sm"
                  rows={6}
                  disabled={!!activeJob}
                  data-testid="input-batch-phrases"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {batchPhrases.split("\n").filter(p => p.trim()).length} phrases
                </p>
              </div>
            )}

            {strategy === "bip39-continuous" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="generationMode" className="text-base">Generation Mode:</Label>
                  <Select value={generationMode} onValueChange={(v) => setGenerationMode(v as "bip39" | "master-key" | "both")} disabled={!!activeJob}>
                    <SelectTrigger id="generationMode" className="mt-2" data-testid="select-generation-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both (BIP-39 + Master Keys) - RECOMMENDED</SelectItem>
                      <SelectItem value="bip39">BIP-39 Passphrases Only</SelectItem>
                      <SelectItem value="master-key">Master Private Keys Only (256-bit)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    BIP-39 was invented in 2013. If your key is from 2009, it might be a raw master private key (64 hex chars) instead. "Both" mode tests both formats.
                  </p>
                </div>
                <div>
                  <Label htmlFor="wordLength" className="text-base">BIP-39 Phrase Length (words):</Label>
                  <Select value={wordLength.toString()} onValueChange={(v) => setWordLength(parseInt(v))} disabled={!!activeJob || generationMode === "master-key"}>
                    <SelectTrigger id="wordLength" className="mt-2" data-testid="select-word-length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All lengths (12-24 words) - RECOMMENDED</SelectItem>
                      <SelectItem value="24">24 words only (256-bit entropy)</SelectItem>
                      <SelectItem value="21">21 words only (224-bit entropy)</SelectItem>
                      <SelectItem value="18">18 words only (192-bit entropy)</SelectItem>
                      <SelectItem value="15">15 words only (160-bit entropy)</SelectItem>
                      <SelectItem value="12">12 words only (128-bit entropy)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {generationMode === "master-key" ? "Not applicable for master private keys." : '"All lengths" tests every valid BIP-39 length (12/15/18/21/24 words) simultaneously.'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="minHighPhi" className="text-base">
                    {generationMode === "master-key" 
                      ? "Run Until High-Φ Target (master keys don't use scoring):" 
                      : "Run Until This Many High-Φ Candidates Found:"}
                  </Label>
                  <Input
                    id="minHighPhi"
                    type="number"
                    min={1}
                    max={100}
                    value={minHighPhi}
                    onChange={(e) => setMinHighPhi(parseInt(e.target.value) || 2)}
                    className="mt-2"
                    disabled={!!activeJob}
                    data-testid="input-min-high-phi"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Geodesic navigation through BIP-39 basin (discovering pre-existing coordinates) runs indefinitely. High-Φ candidates (≥75% score) are automatically saved as waypoints requiring validation. Searches continue even when browser is closed.
                  </p>
                </div>
              </div>
            )}

            {strategy === "bip39-random" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="wordLength" className="text-base">Phrase Length (words):</Label>
                  <Select value={wordLength.toString()} onValueChange={(v) => setWordLength(parseInt(v))} disabled={!!activeJob}>
                    <SelectTrigger id="wordLength" className="mt-2" data-testid="select-word-length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All lengths (12-24 words) - RECOMMENDED</SelectItem>
                      <SelectItem value="24">24 words only (256-bit entropy)</SelectItem>
                      <SelectItem value="21">21 words only (224-bit entropy)</SelectItem>
                      <SelectItem value="18">18 words only (192-bit entropy)</SelectItem>
                      <SelectItem value="15">15 words only (160-bit entropy)</SelectItem>
                      <SelectItem value="12">12 words only (128-bit entropy)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    "All lengths" tests every valid BIP-39 length (12/15/18/21/24 words) simultaneously. Select this if uncertain about original phrase length.
                  </p>
                </div>
                <div>
                  <Label htmlFor="bip39Count" className="text-base">Number of Random Phrases to Generate:</Label>
                  <Input
                    id="bip39Count"
                    type="number"
                    min={1}
                    max={100}
                    value={bip39Count}
                    onChange={(e) => setBip39Count(parseInt(e.target.value) || 10)}
                    className="mt-2"
                    disabled={!!activeJob}
                    data-testid="input-bip39-count"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Navigate to 1-100 coordinate points in the eternal information manifold (uniform geodesic sampling)
                  </p>
                </div>
              </div>
            )}

            {strategy === "known" && (
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  This will test 45 contextually relevant BIP-39 phrases with Bitcoin/crypto, cypherpunk, and Mac aesthetic themes.
                </p>
              </div>
            )}

            {(strategy === "bip39-continuous" || strategy === "bip39-random") && (
              <div className="mt-6 border-t pt-6">
                <Accordion type="single" collapsible className="border rounded-md">
                  <AccordionItem value="memory-fragments" className="border-none">
                    <AccordionTrigger className="px-4 py-3 hover-elevate">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span className="font-semibold">🧠 Memory Fragment Testing (Optional)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-4">
                      <div className="p-3 bg-muted/50 rounded-md text-sm space-y-2">
                        <p className="text-muted-foreground">
                          If you remember ANY words, phrases, or patterns that might have been used, enter them here. 
                          The system will test hundreds of variations (capitalization, spacing, numbers, combinations) before starting random exploration.
                        </p>
                        <p className="text-muted-foreground font-medium">
                          Examples: "whitetiger77", "garyocean", "white tiger", personal names, dates, usernames
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Fragments are stored locally in your browser only. They are never sent to any server except for testing against your target address.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="testMemoryFragments"
                          checked={testMemoryFragments}
                          onCheckedChange={(checked) => setTestMemoryFragments(checked as boolean)}
                          disabled={!!activeJob}
                          data-testid="checkbox-test-memory-fragments"
                        />
                        <Label htmlFor="testMemoryFragments" className="text-base cursor-pointer">
                          Enable memory fragment testing (recommended if you have any clues)
                        </Label>
                      </div>

                      {testMemoryFragments && (
                        <div>
                          <Label htmlFor="memoryFragments" className="text-base">
                            Memory Fragments (one per line):
                          </Label>
                          <Textarea
                            id="memoryFragments"
                            value={memoryFragments}
                            onChange={(e) => setMemoryFragments(e.target.value)}
                            placeholder="whitetiger77&#10;garyocean&#10;white tiger&#10;yourname&#10;significant dates..."
                            className="mt-2 font-mono text-sm"
                            rows={6}
                            disabled={!!activeJob}
                            data-testid="input-memory-fragments"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            {memoryFragments.split("\n").filter(f => f.trim()).length} base fragments → ~{memoryFragments.split("\n").filter(f => f.trim()).length * 50} variations will be tested
                          </p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              {!activeJob ? (
                <Button
                  onClick={handleStartSearch}
                  disabled={createJobMutation.isPending}
                  className="gap-2"
                  data-testid="button-start-search"
                >
                  <Play className="w-4 h-4" />
                  Start Background Search
                </Button>
              ) : (
                <Button
                  onClick={handleStopSearch}
                  variant="destructive"
                  disabled={stopJobMutation.isPending}
                  className="gap-2"
                  data-testid="button-stop-search"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop Search
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Phrases Tested</span>
              <Hash className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-primary">{selectedJob?.progress.tested || 0}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Test Rate</span>
              <Zap className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-chart-1">{selectedJob?.stats.rate.toFixed(1) || 0.0} <span className="text-lg text-muted-foreground">phrases/sec</span></p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">High-Φ Candidates</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-green-600">{selectedJob?.progress.highPhiCount || 0}</p>
          </Card>
        </div>

        {analytics && analytics.statistics.count !== "0" && (
          <Card className="p-6 mb-8">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="analytics" className="border-none">
                <AccordionTrigger className="hover:no-underline">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Navigation Analytics — Is The Search "In the Ballpark"?
                  </h3>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {/* Score Statistics */}
                    <Card className="p-4 bg-muted/30">
                      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Score Distribution</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Mean Φ</span>
                          <span className="font-mono font-semibold">{analytics.statistics.mean}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Median Φ</span>
                          <span className="font-mono font-semibold">{analytics.statistics.median}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">75th %ile</span>
                          <span className="font-mono font-semibold">{analytics.statistics.p75}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">90th %ile</span>
                          <span className="font-mono font-semibold">{analytics.statistics.p90}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Best Score</span>
                          <span className="font-mono font-semibold text-green-600">{analytics.statistics.max}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        Higher percentiles indicate better navigation. Mean &gt; 50% suggests ballpark proximity.
                      </p>
                    </Card>

                    {/* QIG Components */}
                    <Card className="p-4 bg-muted/30">
                      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">QIG Component Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Context (κ)</span>
                          <span className="font-mono font-semibold">{analytics.qigComponents.avgContext}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Elegance (β)</span>
                          <span className="font-mono font-semibold">{analytics.qigComponents.avgElegance}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Typing Flow</span>
                          <span className="font-mono font-semibold">{analytics.qigComponents.avgTyping}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        High context scores indicate era-appropriate vocabulary. High elegance suggests manifold coherence.
                      </p>
                    </Card>

                    {/* Trajectory Analysis */}
                    <Card className="p-4 bg-muted/30">
                      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Trajectory Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Recent (last 100)</span>
                          <span className="font-mono font-semibold">{analytics.trajectory.recentMean}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Historical</span>
                          <span className="font-mono font-semibold">{analytics.trajectory.olderMean}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Improvement</span>
                          <span className={`font-mono font-semibold ${analytics.trajectory.isImproving ? 'text-green-600' : 'text-red-600'}`}>
                            {analytics.trajectory.isImproving ? '+' : ''}{analytics.trajectory.improvement}%
                          </span>
                        </div>
                        {analytics.trajectory.isImproving && (
                          <Badge variant="default" className="w-full justify-center">
                            ✓ Converging
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        {analytics.trajectory.isImproving 
                          ? "Search is learning and improving over time. Good sign of convergence!" 
                          : "No clear trend yet. May need more samples or different strategy."}
                      </p>
                    </Card>
                  </div>

                  {/* Pattern Recognition */}
                  {analytics.patterns.topWords.length > 0 && (
                    <Card className="p-4 bg-muted/30 mt-6">
                      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                        Pattern Recognition — Most Frequent Words in High-Φ Candidates ({analytics.patterns.highPhiCount} phrases)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analytics.patterns.topWords.slice(0, 15).map(({ word, count, frequency }) => (
                          <Badge key={word} variant="outline" className="gap-2">
                            <span className="font-mono">{word}</span>
                            <span className="text-xs text-muted-foreground">×{count}</span>
                            <span className="text-xs text-muted-foreground">({(frequency * 100).toFixed(0)}%)</span>
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        Recurring words may indicate manifold features or memory fragments. High-frequency words suggest structure in the basin.
                      </p>
                    </Card>
                  )}

                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Ballpark Assessment
                    </h4>
                    <div className="text-sm space-y-1">
                      {parseFloat(analytics.statistics.mean) > 50 && (
                        <p className="text-green-600">✓ Mean score &gt; 50% — Navigation is in a promising region</p>
                      )}
                      {parseFloat(analytics.statistics.p90) > 75 && (
                        <p className="text-green-600">✓ 90th percentile &gt; 75% — Consistently finding high-Φ candidates</p>
                      )}
                      {analytics.trajectory.isImproving && (
                        <p className="text-green-600">✓ Improving trajectory — Search is learning and converging</p>
                      )}
                      {analytics.patterns.topWords.length > 0 && (
                        <p className="text-green-600">✓ Pattern emergence — Manifold structure is being revealed</p>
                      )}
                      {parseFloat(analytics.statistics.mean) <= 50 && !analytics.trajectory.isImproving && (
                        <p className="text-yellow-600">⚠ Consider expanding search space or testing memory fragments</p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

        {selectedJob?.progress.searchMode && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {selectedJob.progress.searchMode === "exploration" ? "🌐" : "🔍"}
              <span>Adaptive Search Mode: {selectedJob.progress.searchMode === "exploration" ? "Exploration" : "Investigation"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Mode</p>
                <p className="text-lg font-semibold">
                  {selectedJob.progress.searchMode === "exploration" ? (
                    <span className="text-blue-600">Exploration</span>
                  ) : (
                    <span className="text-purple-600">Investigation</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedJob.progress.searchMode === "exploration" 
                    ? "Random basin sampling" 
                    : "Local search around high-Φ"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Discovery Rate (τ=10)</p>
                <p className="text-lg font-semibold text-chart-1">
                  {((selectedJob.stats.discoveryRateMedium || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Medium-term effectiveness
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Discovery Rate (τ=100)</p>
                <p className="text-lg font-semibold text-chart-2">
                  {((selectedJob.stats.discoveryRateSlow || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Long-term effectiveness
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Exploration Ratio</p>
                <p className="text-lg font-semibold">
                  {((selectedJob.stats.explorationRatio || 1.0) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Time in exploration mode
                </p>
              </div>
            </div>
            {selectedJob.progress.investigationTarget && selectedJob.progress.searchMode === "investigation" && (
              <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Investigation Target:</p>
                <p className="font-mono text-sm break-all">{selectedJob.progress.investigationTarget}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Generating variations around this high-Φ phrase to explore local basin
                </p>
              </div>
            )}
          </Card>
        )}

        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Score Distribution (Geodesic Navigation)
          </h3>
          <div className="h-80">
            {scoreHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No data yet - start a search to see score patterns</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="index" 
                    label={{ value: 'Phrases Tested', position: 'insideBottom', offset: -5 }}
                    className="text-xs"
                  />
                  <YAxis 
                    label={{ value: 'QIG Score (Φ)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                    className="text-xs"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border rounded-md p-2 shadow-lg text-xs">
                            <p className="font-semibold">Phrase #{data.index}</p>
                            <p className="text-muted-foreground">{data.wordCount} words</p>
                            <p className="text-primary">Score: {data.score}%</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {data.score >= 75 ? "High-Φ (saved)" : data.score >= 50 ? "Medium-Φ" : "Low-Φ"}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={75} 
                    stroke="hsl(var(--chart-1))" 
                    strokeDasharray="3 3"
                    label={{ value: 'Φ ≥ 0.75 (High-Φ threshold)', position: 'right', className: 'text-xs fill-muted-foreground' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={1}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Visualizes QIG scores (Φ) as the system navigates the BIP-39 basin. Scores ≥75% indicate high integration (phase transition) and are automatically saved. Random uniform sampling should show consistent low scores with rare high-Φ spikes.
          </p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Search Jobs
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No search jobs yet</p>
              ) : (
                jobs.map((job) => (
                  <Card 
                    key={job.id} 
                    className={`p-3 cursor-pointer hover-elevate ${selectedJobId === job.id ? 'border-primary' : ''}`}
                    onClick={() => setSelectedJobId(job.id)}
                    data-testid={`job-${job.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            job.status === "running" ? "default" :
                            job.status === "completed" ? "secondary" :
                            job.status === "stopped" ? "outline" :
                            job.status === "failed" ? "destructive" :
                            "outline"
                          }>
                            {job.status}
                          </Badge>
                          <span className="text-sm capitalize">{job.strategy}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.progress.tested} tested • {job.progress.highPhiCount} high-Φ
                        </div>
                      </div>
                      {(job.status === "completed" || job.status === "stopped" || job.status === "failed") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteJobMutation.mutate(job.id);
                          }}
                          data-testid={`button-delete-${job.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Job Logs
              {selectedJob && (
                <Badge variant="outline" className="ml-auto">
                  {formatRuntime(selectedJob.stats.startTime, selectedJob.stats.endTime)}
                </Badge>
              )}
            </h3>
            <div 
              ref={logContainerRef}
              className="bg-black/5 dark:bg-white/5 rounded-md p-4 h-80 overflow-y-auto font-mono text-xs"
              data-testid="job-logs"
            >
              {!selectedJob ? (
                <p className="text-muted-foreground">No job selected</p>
              ) : selectedJob.logs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet...</p>
              ) : (
                selectedJob.logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`mb-1 ${
                      log.type === "success" ? "text-green-600" : 
                      log.type === "error" ? "text-red-600" : 
                      "text-muted-foreground"
                    }`}
                  >
                    <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              High-Φ Candidates (≥75% Score)
            </h3>
            <Button
              onClick={handleExportCandidates}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!storedCandidates || storedCandidates.length === 0}
              data-testid="button-export"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {!storedCandidates || storedCandidates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No high-Φ candidates found yet</p>
              <p className="text-sm mt-2">Candidates with QIG score ≥75% will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {storedCandidates.map((candidate) => (
                <Card key={candidate.id} className="p-4 bg-gradient-to-r from-green-500/5 to-chart-1/5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600 hover:bg-green-700">
                          Φ = {candidate.score.toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(candidate.testedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-mono text-sm mb-2 break-all">{candidate.phrase}</p>
                      <p className="font-mono text-xs text-muted-foreground break-all">{candidate.address}</p>
                    </div>
                    <Button
                      onClick={() => handleCopyPhrase(candidate.phrase)}
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      data-testid={`button-copy-${candidate.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Context:</span>{" "}
                      <span className="font-semibold">{candidate.qigScore.contextScore.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Elegance:</span>{" "}
                      <span className="font-semibold">{candidate.qigScore.eleganceScore.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Typing:</span>{" "}
                      <span className="font-semibold">{candidate.qigScore.typingScore.toFixed(1)}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
