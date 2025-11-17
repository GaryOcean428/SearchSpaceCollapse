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
import { AlertCircle, CheckCircle2, Play, StopCircle, Zap, TrendingUp, Target, Clock, Shield, Copy, Download, Plus, X, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Candidate, TargetAddress, SearchJob } from "@shared/schema";

type SearchStrategy = "custom" | "known" | "batch" | "bip39-random";

export default function RecoveryPage() {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<SearchStrategy>("known");
  const [customPhrase, setCustomPhrase] = useState("");
  const [batchPhrases, setBatchPhrases] = useState("");
  const [bip39Count, setBip39Count] = useState(100);
  const [newAddress, setNewAddress] = useState("");
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [selectedJobId]);

  const { data: storedCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    refetchInterval: 3000,
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
                This tool uses QIG (Quantum Information Geometry) principles to intelligently search for your 12-word brain wallet passphrase. Search jobs run in the background on the server, continuing even when you close your browser.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>2009 Bitcoin/crypto context scoring (40%)</li>
                <li>Mac user aesthetic - elegant, meaningful phrases (30%)</li>
                <li>Typing ergonomics - easy to type 27 times (30%)</li>
                <li>Background processing - searches continue when you're away</li>
              </ul>
              <p className="text-sm font-medium mt-3">
                High-Φ candidates ({">"}75% score) are automatically saved for your review.
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
                  <SelectItem value="custom">Test Your Own Phrase</SelectItem>
                  <SelectItem value="known">Known 12-Word Phrases (Bitcoin/Crypto/Mac Culture)</SelectItem>
                  <SelectItem value="bip39-random">BIP-39 Random Generation</SelectItem>
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

            {strategy === "bip39-random" && (
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
                  Generate 1-100 random BIP-39 compliant phrases
                </p>
              </div>
            )}

            {strategy === "known" && (
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  This will test {">"}40 contextually relevant phrases including Bitcoin whitepaper quotes, 2009 financial crisis references, cypherpunk philosophy, and Mac aesthetic principles.
                </p>
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
