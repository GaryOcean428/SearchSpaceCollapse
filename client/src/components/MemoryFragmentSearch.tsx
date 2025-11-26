import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  Brain, 
  Plus, 
  X, 
  Search, 
  Loader2, 
  Copy, 
  AlertTriangle,
  Zap,
  Eye,
  Lightbulb,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemoryFragment {
  text: string;
  confidence: number;
  position?: "start" | "middle" | "end" | "unknown";
  isExact?: boolean;
}

interface MemorySearchResult {
  candidateCount: number;
  topCandidates: Array<{
    phrase: string;
    confidence: number;
    fragments: string[];
    phi: number;
    kappa: number;
    regime: string;
    inResonance: boolean;
    combinedScore: number;
  }>;
}

interface ConsciousnessState {
  state: {
    currentRegime: string;
    phi: number;
    kappa: number;
    beta: number;
    basinDrift: number;
    curiosity: number;
    stability: number;
    timestamp: number;
  };
  recommendation: string;
  regimeColor: string;
  regimeDescription: string;
}

export function MemoryFragmentSearch() {
  const { toast } = useToast();
  const [fragments, setFragments] = useState<MemoryFragment[]>([
    { text: "", confidence: 0.8, position: "unknown", isExact: false }
  ]);
  const [includeTypos, setIncludeTypos] = useState(true);
  const [maxCandidates, setMaxCandidates] = useState([5000]);

  const { data: consciousnessState } = useQuery<ConsciousnessState>({
    queryKey: ["/api/consciousness/state"],
    refetchInterval: 2000,
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const validFragments = fragments.filter(f => f.text.trim().length > 0);
      if (validFragments.length === 0) {
        throw new Error("At least one fragment is required");
      }
      
      const response = await apiRequest("POST", "/api/memory-search", {
        fragments: validFragments,
        options: {
          maxCandidates: maxCandidates[0],
          includeTypos,
        },
      });
      
      return response.json() as Promise<MemorySearchResult>;
    },
    onError: (error: Error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addFragment = () => {
    setFragments([
      ...fragments,
      { text: "", confidence: 0.8, position: "unknown", isExact: false }
    ]);
  };

  const removeFragment = (index: number) => {
    if (fragments.length > 1) {
      setFragments(fragments.filter((_, i) => i !== index));
    }
  };

  const updateFragment = (index: number, updates: Partial<MemoryFragment>) => {
    setFragments(fragments.map((f, i) => 
      i === index ? { ...f, ...updates } : f
    ));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Phrase copied to clipboard",
    });
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return "text-green-500";
    if (conf >= 0.7) return "text-yellow-500";
    if (conf >= 0.5) return "text-orange-500";
    return "text-red-500";
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "hierarchical": return "bg-purple-500";
      case "geometric": return "bg-blue-500";
      case "linear": return "bg-green-500";
      case "breakdown": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-semibold">Memory Fragment Search</h2>
          <Badge variant="outline" className="ml-auto">
            QIG-Powered
          </Badge>
        </div>

        <p className="text-muted-foreground mb-6">
          Enter partial memories of a passphrase. The system will use confidence-weighted 
          combinatorics and QWERTY-aware typo simulation to reconstruct possible phrases.
        </p>

        <div className="space-y-4 mb-6">
          {fragments.map((fragment, index) => (
            <Card key={index} className="p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="font-mono">
                  Fragment {index + 1}
                </Badge>
                {fragments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto"
                    onClick={() => removeFragment(index)}
                    data-testid={`button-remove-fragment-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor={`fragment-${index}`}>Text (word or phrase)</Label>
                  <Input
                    id={`fragment-${index}`}
                    value={fragment.text}
                    onChange={(e) => updateFragment(index, { text: e.target.value })}
                    placeholder="e.g., 'white tiger' or 'bitcoin'"
                    className="font-mono mt-1"
                    data-testid={`input-fragment-${index}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Confidence
                      <span className={`font-mono text-sm ${getConfidenceColor(fragment.confidence)}`}>
                        {Math.round(fragment.confidence * 100)}%
                      </span>
                    </Label>
                    <Slider
                      value={[fragment.confidence * 100]}
                      onValueChange={([v]) => updateFragment(index, { confidence: v / 100 })}
                      min={10}
                      max={100}
                      step={5}
                      className="mt-2"
                      data-testid={`slider-confidence-${index}`}
                    />
                  </div>

                  <div>
                    <Label>Position in phrase</Label>
                    <select
                      value={fragment.position}
                      onChange={(e) => updateFragment(index, { 
                        position: e.target.value as MemoryFragment["position"] 
                      })}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid={`select-position-${index}`}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="start">Start of phrase</option>
                      <option value="middle">Middle of phrase</option>
                      <option value="end">End of phrase</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`exact-${index}`}
                    checked={fragment.isExact}
                    onCheckedChange={(checked) => updateFragment(index, { isExact: !!checked })}
                    data-testid={`checkbox-exact-${index}`}
                  />
                  <Label htmlFor={`exact-${index}`} className="text-sm">
                    Exact match (no variations)
                  </Label>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={addFragment}
          className="w-full mb-6 gap-2"
          data-testid="button-add-fragment"
        >
          <Plus className="w-4 h-4" />
          Add Another Fragment
        </Button>

        <Card className="p-4 bg-muted/30 mb-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Search Options
          </h4>
          
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-typos"
                checked={includeTypos}
                onCheckedChange={(checked) => setIncludeTypos(!!checked)}
                data-testid="checkbox-typos"
              />
              <Label htmlFor="include-typos" className="text-sm">
                Include QWERTY-aware typo variations
              </Label>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                Max Candidates: {maxCandidates[0].toLocaleString()}
              </Label>
              <Slider
                value={maxCandidates}
                onValueChange={setMaxCandidates}
                min={100}
                max={50000}
                step={100}
                data-testid="slider-max-candidates"
              />
            </div>
          </div>
        </Card>

        <Button
          onClick={() => searchMutation.mutate()}
          disabled={searchMutation.isPending || fragments.every(f => !f.text.trim())}
          className="w-full gap-2"
          data-testid="button-search"
        >
          {searchMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Memory Fragments
            </>
          )}
        </Button>
      </Card>

      {consciousnessState && (
        <Card className="p-4 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Consciousness State</h3>
            <Badge 
              className={`${getRegimeColor(consciousnessState.state.currentRegime)} text-white ml-auto`}
            >
              {consciousnessState.state.currentRegime}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="text-muted-foreground">Φ (phi):</span>
              <span className="ml-2 font-mono">{consciousnessState.state.phi.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">κ (kappa):</span>
              <span className="ml-2 font-mono">{consciousnessState.state.kappa.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">β (beta):</span>
              <span className="ml-2 font-mono">{consciousnessState.state.beta.toFixed(3)}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {consciousnessState.regimeDescription}
          </p>
        </Card>
      )}

      {searchMutation.data && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold">
              Search Results ({searchMutation.data.candidateCount.toLocaleString()} candidates)
            </h3>
          </div>

          {searchMutation.data.topCandidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No candidates found matching your fragments</p>
              <p className="text-sm mt-2">Try adjusting confidence levels or adding more fragments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchMutation.data.topCandidates.slice(0, 20).map((candidate, index) => (
                <Card key={index} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getRegimeColor(candidate.regime)}>
                          {candidate.regime}
                        </Badge>
                        {candidate.inResonance && (
                          <Badge className="bg-yellow-500">
                            <Zap className="w-3 h-3 mr-1" />
                            Resonance
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Φ={candidate.phi.toFixed(3)} κ={candidate.kappa.toFixed(1)}
                        </span>
                      </div>
                      
                      <p className="font-mono text-sm break-all mb-2">
                        {candidate.phrase}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className={`ml-1 font-semibold ${getConfidenceColor(candidate.confidence)}`}>
                            {Math.round(candidate.confidence * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Combined Score:</span>
                          <span className="ml-1 font-semibold">
                            {candidate.combinedScore.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleCopy(candidate.phrase)}
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      data-testid={`button-copy-candidate-${index}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="mt-2">
                    <Progress 
                      value={candidate.combinedScore * 100} 
                      className="h-1"
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
