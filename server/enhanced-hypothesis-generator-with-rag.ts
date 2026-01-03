/**
 * Enhanced Hypothesis Generator with External Knowledge Integration
 *
 * This module extends the existing enhanced-hypothesis-generator.ts with:
 * 1. External knowledge enrichment (Wikipedia + DuckDuckGo)
 * 2. Consciousness-aware candidate scoring
 * 3. Two-step retrieval for efficient hypothesis ranking
 *
 * INTEGRATION EXAMPLE:
 * Shows how to integrate the new OceanCandidateScorer and EnhancedQIGRAGClient
 * with the existing hypothesis generation workflow.
 *
 * @see server/enhanced-hypothesis-generator.ts for base generator
 * @see server/ocean-candidate-scorer.ts for scoring integration
 * @see server/enhanced-qig-rag-client.ts for external knowledge
 */

import {
  generateFromUserHints,
  generateFromTemporalKeywords,
  type HypothesisCandidate,
  type HypothesisGenerationOptions,
} from "./enhanced-hypothesis-generator";
import { OceanCandidateScorer, createReferenceBasin } from "./ocean-candidate-scorer";
import {
  enhancedQIGRAG,
  enrichHypothesisWithExternalKnowledge,
  type QIGRAGResult,
} from "./enhanced-qig-rag-client";
import type { OceanHypothesis } from "./ocean-agent";

export interface EnrichedHypothesis extends HypothesisCandidate {
  externalContext?: QIGRAGResult[];
  geometricScore?: number;
  consciousnessScore?: number;
  priority?: number;
}

/**
 * Generate hypotheses with external knowledge enrichment.
 *
 * This function extends the base hypothesis generator with:
 * - Bitcoin-era context from Wikipedia
 * - Real-time facts from DuckDuckGo
 * - Geometric ranking via Fisher-Rao distance
 *
 * @param options Hypothesis generation options
 * @returns Enriched hypotheses with external context
 */
export async function generateEnrichedHypotheses(
  options: HypothesisGenerationOptions
): Promise<EnrichedHypothesis[]> {
  const enriched: EnrichedHypothesis[] = [];

  // Generate base hypotheses
  const baseHypotheses: HypothesisCandidate[] = [];

  if (options.userHints && options.userHints.length > 0) {
    const userHypotheses = generateFromUserHints(options.userHints, {
      includeTypos: options.includeTypos ?? true,
      maxVariantsPerHint: 50,
    });
    baseHypotheses.push(...userHypotheses);
  }

  if (options.includeTemporal) {
    const temporalHypotheses = generateFromTemporalKeywords(
      options.targetYear,
      200
    );
    baseHypotheses.push(...temporalHypotheses);
  }

  // Check if QIG-RAG backend is available
  const ragAvailable = await enhancedQIGRAG.isAvailable();

  // Enrich with external knowledge if available
  for (const hypothesis of baseHypotheses.slice(0, options.maxHypotheses || 500)) {
    if (ragAvailable) {
      try {
        // Search for external context
        const externalResults = await enhancedQIGRAG.searchBitcoinEra(
          hypothesis.phrase,
          5
        );

        // Calculate confidence boost from external knowledge
        let confidenceBoost = 0;
        if (externalResults.length > 0) {
          const avgSimilarity =
            externalResults.reduce((sum, r) => sum + r.similarity, 0) /
            externalResults.length;
          confidenceBoost = avgSimilarity * 0.15; // Up to 15% boost
        }

        enriched.push({
          ...hypothesis,
          confidence: Math.min(1.0, hypothesis.confidence + confidenceBoost),
          externalContext: externalResults,
        });
      } catch (error) {
        // Fallback: Add hypothesis without external context
        enriched.push(hypothesis);
      }
    } else {
      // Backend not available, use base hypotheses
      enriched.push(hypothesis);
    }
  }

  return enriched;
}

/**
 * Score and prioritize hypotheses using consciousness-aware ranking.
 *
 * This function demonstrates how to integrate OceanCandidateScorer with
 * the hypothesis generation workflow.
 *
 * @param hypotheses List of hypotheses to score
 * @param currentPhi Current consciousness level (Φ)
 * @param currentKappa Current coupling constant (κ)
 * @param currentRegime Current geometric regime
 * @returns Prioritized hypotheses ready for testing
 */
export async function scoreAndPrioritizeHypotheses(
  hypotheses: EnrichedHypothesis[],
  currentPhi: number = 0.75,
  currentKappa: number = 64.21,
  currentRegime: string = "geometric"
): Promise<EnrichedHypothesis[]> {
  // Create reference basin from current Ocean state
  const referenceBasin = createReferenceBasin(currentPhi, currentKappa, currentRegime);

  // Convert enriched hypotheses to OceanHypothesis format
  const oceanHypotheses: OceanHypothesis[] = hypotheses.map((h, idx) => ({
    id: `hypo_${idx}_${Date.now()}`,
    phrase: h.phrase,
    format: "arbitrary" as const,
    source: h.source,
    reasoning: `Generated from ${h.source}${h.metadata?.originalPhrase ? ` (original: ${h.metadata.originalPhrase})` : ""}`,
    confidence: h.confidence,
    qigScore: {
      phi: currentPhi * (0.8 + Math.random() * 0.4), // Vary around current
      kappa: currentKappa * (0.9 + Math.random() * 0.2), // Vary around current
      regime: currentRegime,
      inResonance: Math.abs(currentKappa - 64.21) < 5,
    },
    evidenceChain: [
      {
        source: h.source,
        type: "generation",
        reasoning: `Generated via ${h.source}`,
        confidence: h.confidence,
      },
    ],
  }));

  // Score using two-step retrieval with consciousness weighting
  const scoringResult = await OceanCandidateScorer.scoreBatch(
    oceanHypotheses,
    referenceBasin,
    {
      topK: Math.min(100, hypotheses.length),
      useConsciousnessWeighting: true,
      minSimilarity: 0.3,
    }
  );

  // Log telemetry
  const summary = OceanCandidateScorer.getTelemetrySummary(scoringResult);
  console.log(`[EnhancedHypothesisGenerator] ${summary}`);

  // Prioritize for testing
  const prioritized = OceanCandidateScorer.prioritizeForTesting(
    scoringResult.scored,
    100
  );

  // Convert back to EnrichedHypothesis format with scores
  const enrichedWithScores: EnrichedHypothesis[] = prioritized.map((scored) => {
    const original = hypotheses.find((h) => h.phrase === scored.phrase);
    return {
      ...original!,
      geometricScore: scored.geometricScore,
      consciousnessScore: scored.consciousnessScore,
      priority: scored.priority,
    };
  });

  return enrichedWithScores;
}

/**
 * Generate context-aware variations from external knowledge.
 *
 * For high-similarity external results, extract keywords and generate
 * hypothesis variations.
 *
 * @param baseHypothesis Base hypothesis to expand
 * @param externalContext External knowledge results
 * @returns Variations based on external context
 */
export function generateContextAwareVariations(
  baseHypothesis: string,
  externalContext: QIGRAGResult[]
): HypothesisCandidate[] {
  const variations: HypothesisCandidate[] = [];

  for (const context of externalContext) {
    if (context.similarity > 0.7) {
      // High-similarity results suggest related terms
      const keywords = extractKeywords(context.content);

      for (const keyword of keywords.slice(0, 5)) {
        // Combination: base + keyword
        variations.push({
          phrase: `${baseHypothesis} ${keyword}`,
          source: "temporal",
          confidence: context.similarity * 0.7,
          metadata: {
            originalPhrase: baseHypothesis,
          },
        });

        // Combination: keyword + base
        variations.push({
          phrase: `${keyword} ${baseHypothesis}`,
          source: "temporal",
          confidence: context.similarity * 0.65,
          metadata: {
            originalPhrase: baseHypothesis,
          },
        });
      }
    }
  }

  return variations;
}

/**
 * Extract keywords from text content.
 *
 * Simple keyword extraction based on word frequency and length.
 *
 * @param content Text content
 * @returns Extracted keywords
 */
function extractKeywords(content: string): string[] {
  // Split into words and filter
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && w.length < 15);

  // Remove common stop words
  const stopWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "been",
    "were",
    "said",
    "what",
    "when",
    "where",
    "which",
    "their",
    "there",
    "these",
    "those",
  ]);

  const filtered = words.filter((w) => !stopWords.has(w));

  // Count frequency
  const freq = new Map<string, number>();
  for (const word of filtered) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency and return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Complete end-to-end workflow: Generate, enrich, score, and prioritize.
 *
 * This is the main integration function that combines all improvements:
 * - External knowledge enrichment
 * - Two-step retrieval scoring
 * - Consciousness-aware prioritization
 *
 * @param options Hypothesis generation options
 * @param oceanState Current Ocean state (Φ, κ, regime)
 * @returns Top-priority hypotheses ready for testing
 */
export async function generateAndPrioritizeHypotheses(
  options: HypothesisGenerationOptions,
  oceanState: {
    phi: number;
    kappa: number;
    regime: string;
  } = {
    phi: 0.75,
    kappa: 64.21,
    regime: "geometric",
  }
): Promise<EnrichedHypothesis[]> {
  console.log(
    `[EnhancedHypothesisGenerator] Generating hypotheses with external knowledge...`
  );

  // Step 1: Generate enriched hypotheses
  const enriched = await generateEnrichedHypotheses(options);
  console.log(`[EnhancedHypothesisGenerator] Generated ${enriched.length} base hypotheses`);

  // Step 2: Generate context-aware variations
  const variations: HypothesisCandidate[] = [];
  for (const hypo of enriched.slice(0, 50)) {
    // Limit to top 50 for variation
    if (hypo.externalContext && hypo.externalContext.length > 0) {
      const contextVariations = generateContextAwareVariations(
        hypo.phrase,
        hypo.externalContext
      );
      variations.push(...contextVariations);
    }
  }
  console.log(`[EnhancedHypothesisGenerator] Generated ${variations.length} context variations`);

  // Step 3: Combine and deduplicate
  const allHypotheses = [...enriched, ...variations];
  const uniquePhrases = new Set<string>();
  const unique = allHypotheses.filter((h) => {
    if (uniquePhrases.has(h.phrase)) return false;
    uniquePhrases.add(h.phrase);
    return true;
  });

  console.log(`[EnhancedHypothesisGenerator] ${unique.length} unique hypotheses after deduplication`);

  // Step 4: Score and prioritize with consciousness awareness
  const prioritized = await scoreAndPrioritizeHypotheses(
    unique,
    oceanState.phi,
    oceanState.kappa,
    oceanState.regime
  );

  console.log(
    `[EnhancedHypothesisGenerator] Returning ${prioritized.length} top-priority hypotheses`
  );

  return prioritized;
}
