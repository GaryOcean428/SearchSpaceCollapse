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
import { AlertCircle, CheckCircle2, Play, StopCircle, Zap, TrendingUp, Target, Clock, Shield, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Candidate, SearchStats, VerificationResult } from "@shared/schema";

const TARGET_ADDRESS = "15BKWJjL5YWXtaP449WAYqVYZQE1szicTn";
const TARGET_BALANCE = "550.00171133 BTC";
const TARGET_VALUE = "$52.6M";

type SearchStrategy = "custom" | "known" | "batch";

export default function RecoveryPage() {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<SearchStrategy>("custom");
  const [customPhrase, setCustomPhrase] = useState("");
  const [batchPhrases, setBatchPhrases] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState<SearchStats>({
    tested: 0,
    rate: 0,
    highPhiCount: 0,
    runtime: "00:00:00",
    isSearching: false,
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: string }>>([]);
  const [foundPhrase, setFoundPhrase] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTestedCountRef = useRef<number>(0);
  const lastRateUpdateRef = useRef<number>(0);
  const shouldContinueSearchRef = useRef<boolean>(false);
  const currentTestedRef = useRef<number>(0);

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { message, type, timestamp }]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (isSearching && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      lastRateUpdateRef.current = Date.now();
      lastTestedCountRef.current = stats.tested;
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const elapsed = now - startTimeRef.current;
          const hours = Math.floor(elapsed / 3600000);
          const minutes = Math.floor((elapsed % 3600000) / 60000);
          const seconds = Math.floor((elapsed % 60000) / 1000);
          
          const timeSinceLastUpdate = (now - lastRateUpdateRef.current) / 1000;
          let newRate = 0;
          
          if (timeSinceLastUpdate >= 1) {
            const phrasesInInterval = currentTestedRef.current - lastTestedCountRef.current;
            newRate = timeSinceLastUpdate > 0 ? Math.round((phrasesInInterval / timeSinceLastUpdate) * 10) / 10 : 0;
            lastTestedCountRef.current = currentTestedRef.current;
            lastRateUpdateRef.current = now;
          }
          
          setStats((prev) => ({
            ...prev,
            rate: newRate || prev.rate,
            runtime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
            isSearching: true,
          }));
        }
      }, 100);
    } else if (!isSearching && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      startTimeRef.current = null;
      setStats((prev) => ({ ...prev, isSearching: false, rate: 0 }));
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSearching]);

  const { data: storedCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    refetchInterval: isSearching ? 3000 : false,
  });

  useEffect(() => {
    if (storedCandidates && storedCandidates.length > 0) {
      setCandidates((prev) => {
        const combined = [...prev];
        for (const stored of storedCandidates) {
          if (!combined.find(c => c.id === stored.id)) {
            combined.push(stored);
          }
        }
        return combined.sort((a, b) => b.score - a.score).slice(0, 50);
      });
    }
  }, [storedCandidates]);

  const testPhraseMutation = useMutation({
    mutationFn: async (phrase: string) => {
      const res = await apiRequest("POST", "/api/test-phrase", { phrase });
      return await res.json();
    },
    onSuccess: (data) => {
      currentTestedRef.current += 1;
      setStats((prev) => ({ ...prev, tested: prev.tested + 1 }));
      
      if (data.match) {
        setFoundPhrase(data.phrase);
        shouldContinueSearchRef.current = false;
        setIsSearching(false);
        addLog(`🎉 MATCH FOUND! Address matches target!`, "success");
      } else if (data.score >= 75) {
        const candidate: Candidate = {
          id: crypto.randomUUID(),
          phrase: data.phrase,
          address: data.address,
          score: data.score,
          qigScore: data.qigScore,
          testedAt: new Date().toISOString(),
        };
        setCandidates((prev) => {
          const updated = [...prev, candidate].sort((a, b) => b.score - a.score).slice(0, 50);
          return updated;
        });
        setStats((prev) => ({ ...prev, highPhiCount: prev.highPhiCount + 1 }));
        addLog(`High-Φ candidate found: ${data.score.toFixed(1)}% - ${data.phrase.substring(0, 50)}...`, "success");
      } else {
        addLog(`Tested: ${data.phrase.substring(0, 30)}... (${data.score.toFixed(1)}%)`, "info");
      }
    },
    onError: (error: any) => {
      addLog(`Error: ${error.message}`, "error");
    },
  });

  const batchTestMutation = useMutation({
    mutationFn: async (phrases: string[]) => {
      const res = await apiRequest("POST", "/api/batch-test", { phrases });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.found) {
        setFoundPhrase(data.phrase);
        shouldContinueSearchRef.current = false;
        setIsSearching(false);
        addLog(`🎉 MATCH FOUND! Phrase: ${data.phrase}`, "success");
        return;
      }
      
      currentTestedRef.current += data.tested || 0;
      if (data.candidates && data.candidates.length > 0) {
        setCandidates((prev) => {
          const all = [...prev, ...data.candidates];
          return all.sort((a, b) => b.score - a.score).slice(0, 50);
        });
      }
      setStats((prev) => ({
        ...prev,
        tested: prev.tested + (data.tested || 0),
        highPhiCount: prev.highPhiCount + (data.highPhiCandidates || 0),
      }));
      addLog(`Batch: ${data.tested} phrases tested, ${data.highPhiCandidates || 0} high-Φ candidates`, "info");
    },
    onError: (error: any) => {
      addLog(`Batch test error: ${error.message}`, "error");
    },
  });


  const finalizeSearch = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSearching(false);
    shouldContinueSearchRef.current = false;
    startTimeRef.current = null;
    setStats((prev) => ({ ...prev, isSearching: false, rate: 0 }));
  };

  const handleStartSearch = async () => {
    if (isSearching) return;

    if (strategy === "custom") {
      const words = customPhrase.trim().split(/\s+/);
      if (words.length !== 12) {
        addLog(`Error: Phrase must contain exactly 12 words (found ${words.length})`, "error");
        return;
      }
    } else if (strategy === "batch") {
      const phrases = batchPhrases
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      
      if (phrases.length === 0) {
        addLog("Error: No phrases provided", "error");
        return;
      }

      const invalidPhrases = phrases.filter((p) => p.split(/\s+/).length !== 12);
      if (invalidPhrases.length > 0) {
        addLog(`Error: ${invalidPhrases.length} phrases do not have exactly 12 words`, "error");
        return;
      }
    }

    setStats({
      tested: 0,
      rate: 0,
      highPhiCount: 0,
      runtime: "00:00:00",
      isSearching: false,
    });
    
    shouldContinueSearchRef.current = true;
    currentTestedRef.current = 0;
    lastRateUpdateRef.current = Date.now();
    lastTestedCountRef.current = 0;
    addLog(`Starting ${strategy} search...`, "info");
    setIsSearching(true);

    try {
      if (strategy === "custom") {
        await testPhraseMutation.mutateAsync(customPhrase.trim());
      } else if (strategy === "known") {
        const knownRes = await fetch("/api/known-phrases");
        const knownData = await knownRes.json();
        const phrases = knownData.phrases;
        
        const BATCH_SIZE = 10;
        for (let i = 0; i < phrases.length; i += BATCH_SIZE) {
          if (!shouldContinueSearchRef.current) {
            addLog("Search stopped", "info");
            break;
          }
          
          const batch = phrases.slice(i, i + BATCH_SIZE);
          await batchTestMutation.mutateAsync(batch);
          
          if (i + BATCH_SIZE < phrases.length && shouldContinueSearchRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } else if (strategy === "batch") {
        const phrases = batchPhrases
          .split("\n")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        
        const BATCH_SIZE = 10;
        for (let i = 0; i < phrases.length; i += BATCH_SIZE) {
          if (!shouldContinueSearchRef.current) {
            addLog("Search stopped", "info");
            break;
          }
          
          const batch = phrases.slice(i, i + BATCH_SIZE);
          await batchTestMutation.mutateAsync(batch);
          
          if (i + BATCH_SIZE < phrases.length && shouldContinueSearchRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error: any) {
      addLog(`Search error: ${error.message}`, "error");
    } finally {
      finalizeSearch();
    }
  };

  const handleStopSearch = () => {
    addLog("Search stopped by user", "info");
    finalizeSearch();
  };

  const handleTestCrypto = async () => {
    addLog("Testing crypto libraries...", "info");
    try {
      const result = await apiRequest("GET", "/api/verify-crypto", {});
      if (result.success) {
        addLog(`✅ Crypto libraries verified! Test address: ${result.testAddress}`, "success");
      } else {
        addLog(`❌ Crypto verification failed: ${result.error}`, "error");
      }
    } catch (error: any) {
      addLog(`❌ Crypto test error: ${error.message}`, "error");
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
    const csv = [
      "Score,Phrase,Address,Context Score,Elegance Score,Typing Score,Tested At",
      ...candidates.map((c) =>
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
      description: `Exported ${candidates.length} candidates`,
    });
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
            Consciousness Architecture Applied to Cryptography
          </p>
        </div>

        <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-chart-1/5 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Target: {TARGET_VALUE} Recovery
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Address:</span>
                  <div className="font-medium break-all">{TARGET_ADDRESS}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Balance:</span>
                  <div className="font-medium">{TARGET_BALANCE}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Constraint:</span>
                  <div className="font-medium">12 words exactly</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Era:</span>
                  <div className="font-medium">February 2009, Mac OS X Snow Leopard</div>
                </div>
              </div>
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
                This tool uses QIG (Quantum Information Geometry) principles to intelligently search for your 12-word brain wallet passphrase. It scores each phrase based on:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>2009 Bitcoin/crypto context (40%)</li>
                <li>Mac user aesthetic - elegant, meaningful phrases (30%)</li>
                <li>Typing ergonomics - easy to type 27 times (30%)</li>
              </ul>
              <p className="text-sm font-medium mt-3">
                High-Φ candidates ({">"}75% score) are flagged for your intuitive review.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 mb-8 border-border/50">
          <h3 className="text-lg font-semibold mb-6">Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="strategy" className="text-base">Search Strategy:</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as SearchStrategy)}>
                <SelectTrigger id="strategy" className="mt-2" data-testid="select-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Test Your Own Phrase</SelectItem>
                  <SelectItem value="known">Known 12-Word Phrases (Bitcoin/Crypto/Mac Culture)</SelectItem>
                  <SelectItem value="batch">Batch Test Multiple Phrases</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {strategy === "custom" && (
              <div>
                <Label htmlFor="customPhrase" className="text-base">Enter 12-Word Phrase to Test:</Label>
                <Input
                  id="customPhrase"
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value)}
                  placeholder="Enter exactly 12 words separated by spaces..."
                  className="mt-2 font-mono"
                  data-testid="input-custom-phrase"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-muted-foreground">
                    Example: "proof of work chain is the solution to double spending problem solved"
                  </p>
                  <Badge variant={wordCount === 12 ? "default" : "secondary"} className="font-mono">
                    {wordCount}/12 words
                  </Badge>
                </div>
              </div>
            )}

            {strategy === "batch" && (
              <div>
                <Label htmlFor="batchPhrases" className="text-base">Enter Multiple Phrases (one per line):</Label>
                <Textarea
                  id="batchPhrases"
                  value={batchPhrases}
                  onChange={(e) => setBatchPhrases(e.target.value)}
                  placeholder="Enter one 12-word phrase per line..."
                  className="mt-2 font-mono min-h-[200px]"
                  data-testid="textarea-batch-phrases"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {batchPhrases.split("\n").filter((p) => p.trim()).length} phrases entered
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleStartSearch}
                disabled={isSearching || (strategy === "custom" && wordCount !== 12)}
                className="gap-2"
                data-testid="button-start-search"
              >
                <Play className="w-4 h-4" />
                {isSearching ? "Searching..." : "Start Search"}
              </Button>
              <Button
                onClick={handleStopSearch}
                disabled={!isSearching}
                variant="destructive"
                className="gap-2"
                data-testid="button-stop-search"
              >
                <StopCircle className="w-4 h-4" />
                Stop
              </Button>
              <Button
                onClick={handleTestCrypto}
                variant="secondary"
                className="gap-2"
                data-testid="button-test-crypto"
              >
                <Zap className="w-4 h-4" />
                Test Crypto
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-card to-primary/5 border-primary/20">
            <div className="flex flex-col">
              <div className="text-4xl font-bold text-primary mb-2 font-mono" data-testid="stat-tested">
                {stats.tested.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Phrases Tested</div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-card to-chart-1/5 border-chart-1/20">
            <div className="flex flex-col">
              <div className="text-4xl font-bold text-chart-1 mb-2 font-mono" data-testid="stat-rate">
                {stats.rate.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Per Second</div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-card to-chart-2/5 border-chart-2/20">
            <div className="flex flex-col">
              <div className="text-4xl font-bold text-chart-2 mb-2 font-mono" data-testid="stat-high-phi">
                {stats.highPhiCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">High-Φ Candidates</div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-card to-chart-3/5 border-chart-3/20">
            <div className="flex flex-col">
              <div className="text-4xl font-bold text-chart-3 mb-2 font-mono" data-testid="stat-runtime">
                {stats.runtime}
              </div>
              <div className="text-sm text-muted-foreground">Runtime</div>
            </div>
          </Card>
        </div>

        {foundPhrase && (
          <Card className="p-8 mb-8 border-2 border-green-500 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-4">
                Recovery Successful!
              </h2>
              <Card className="p-6 bg-white dark:bg-green-950 border-2 border-green-300 dark:border-green-700 max-w-2xl mx-auto">
                <div className="font-mono text-lg font-semibold text-green-900 dark:text-green-100 break-words">
                  {foundPhrase}
                </div>
              </Card>
              <div className="mt-6 flex gap-3 justify-center">
                <Button onClick={() => handleCopyPhrase(foundPhrase)} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Phrase
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Top Candidates (High-Φ Scores)
            </h3>
            {candidates.length > 0 && (
              <Button onClick={handleExportCandidates} variant="outline" size="sm" className="gap-2" data-testid="button-export">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Click any phrase to test it instantly
          </p>
          
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground italic">
                No candidates yet. Run a search to see results.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {candidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  className={`p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
                    candidate.score >= 85 ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-l-4 border-l-primary"
                  }`}
                  onClick={() => handleCopyPhrase(candidate.phrase)}
                  data-testid={`candidate-${candidate.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm break-words mb-2">{candidate.phrase}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Context: {candidate.qigScore.contextScore.toFixed(1)}%</span>
                        <span>•</span>
                        <span>Elegance: {candidate.qigScore.eleganceScore.toFixed(1)}%</span>
                        <span>•</span>
                        <span>Typing: {candidate.qigScore.typingScore.toFixed(1)}%</span>
                      </div>
                    </div>
                    <Badge
                      variant={candidate.score >= 85 ? "default" : "secondary"}
                      className="shrink-0 font-mono font-semibold"
                    >
                      {candidate.score.toFixed(1)}%
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 bg-zinc-950 dark:bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-green-400">Log Console</h3>
          </div>
          <div
            ref={logContainerRef}
            className="font-mono text-xs space-y-1 max-h-72 overflow-y-auto rounded bg-black/50 p-4"
            data-testid="log-console"
          >
            {logs.length === 0 ? (
              <div className="text-zinc-500 italic">System ready. Start a search to see activity...</div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.type === "success"
                      ? "text-green-400"
                      : log.type === "error"
                      ? "text-red-400"
                      : "text-zinc-300"
                  }`}
                >
                  <span className="text-zinc-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
