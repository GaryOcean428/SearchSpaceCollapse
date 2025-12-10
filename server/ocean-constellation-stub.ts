import { geometricMemory } from "./geometric-memory";
import { oceanQIGBackend } from "./ocean-qig-backend-adapter";

interface ConstellationHypothesis {
  phrase: string;
  score: number;
  god?: string;
  domain?: string;
  confidence?: number;
}

interface ManifoldContext {
  phi: number;
  kappa: number;
  regime: string;
  highPhiPatterns: string[];
  resonancePatterns: string[];
  avgPhi: number;
  testedPhrases: string[];
}

interface GenerationOptions {
  agentRole?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  allowSilence?: boolean;
}

interface GenerationResult {
  text: string;
  tokens: string[];
  phi: number;
  entropy: number;
}

interface ConstellationStatus {
  available: boolean;
  tokensLoaded: number;
  lastRefresh: number;
  backendConnected: boolean;
}

class OceanConstellationStub {
  private tokensLoaded = 0;
  private lastRefresh = 0;

  async generateHypothesesForRole(
    role: string,
    context: ManifoldContext
  ): Promise<ConstellationHypothesis[]> {
    try {
      if (!oceanQIGBackend.available()) {
        return [];
      }

      const result = await oceanQIGBackend.orchestratePantheon({
        role,
        phi: context.phi,
        kappa: context.kappa,
        regime: context.regime,
        highPhiPatterns: context.highPhiPatterns.slice(0, 20),
        testedPhrases: context.testedPhrases.slice(-100),
      });

      if (result.hypotheses && Array.isArray(result.hypotheses)) {
        return result.hypotheses.map((h: any) => ({
          phrase: h.phrase || h.pattern || "",
          score: h.score || h.phi || 0.5,
          god: h.god,
          domain: h.domain,
        }));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  refreshTokenWeightsFromGeometricMemory(): void {
    try {
      const probes = geometricMemory.getAllProbes();
      const highPhiProbes = probes.filter((p) => p.phi >= 0.7);

      const tokenWeights = new Map<string, number>();
      for (const probe of highPhiProbes) {
        const words = probe.input.toLowerCase().split(/\s+/);
        for (const word of words) {
          if (word.length >= 2) {
            const current = tokenWeights.get(word) || 0;
            tokenWeights.set(word, current + probe.phi);
          }
        }
      }

      this.tokensLoaded = tokenWeights.size;
      this.lastRefresh = Date.now();

      if (this.tokensLoaded > 0) {
        console.log(
          `[Constellation] Refreshed ${this.tokensLoaded} token weights from ${highPhiProbes.length} high-Φ probes`
        );
      }
    } catch (error) {
      console.warn("[Constellation] Error refreshing token weights:", error);
    }
  }

  async generateResponse(
    context: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      if (oceanQIGBackend.available()) {
        const result = await oceanQIGBackend.processInput(context, {
          maxTokens: options.maxTokens || 30,
          temperature: options.temperature || 0.8,
        });

        return {
          text: result.generatedText || context,
          tokens: (result.generatedText || context).split(/\s+/),
          phi: result.phi || 0.5,
          entropy: result.entropy || 1.0,
        };
      }
    } catch (error) {
      console.warn("[Constellation] Generate response error:", error);
    }

    return {
      text: "",
      tokens: [],
      phi: 0.5,
      entropy: 1.0,
    };
  }

  async generateText(
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    return this.generateResponse(prompt, options);
  }

  getStatus(): ConstellationStatus {
    return {
      available: true,
      tokensLoaded: this.tokensLoaded,
      lastRefresh: this.lastRefresh,
      backendConnected: oceanQIGBackend.available(),
    };
  }
}

export const oceanConstellation = new OceanConstellationStub();
