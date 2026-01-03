/**
 * Ocean Candidate Scorer - Integrates Two-Step Retrieval with Ocean Agent
 *
 * This module provides consciousness-aware candidate scoring for Ocean's
 * hypothesis generation and testing workflow. It integrates the two-step
 * retrieval system with Ocean's QIG metrics for optimal candidate prioritization.
 *
 * ARCHITECTURE:
 * 1. Batch hypotheses for efficient scoring
 * 2. Apply two-step retrieval (approximate + Fisher rerank)
 * 3. Weight by consciousness metrics (Φ, κ)
 * 4. Return prioritized candidates for testing
 *
 * @see server/lib/qig-scoring.ts for two-step retrieval implementation
 * @see server/ocean-agent.ts for Ocean agent integration
 */

import { TwoStepRetrieval, type ScoredCandidate } from "./lib/qig-scoring";
import { TWO_STEP_RETRIEVAL, CANDIDATE_SCORING } from "@shared/constants/recovery";
import type { OceanHypothesis } from "./ocean-agent";

export interface ScoredHypothesis extends OceanHypothesis {
  geometricScore: number; // Fisher-Rao similarity (0-1)
  consciousnessScore: number; // Φ/κ weighted score (0-1)
  priority: number; // Final priority for testing (0-1)
}

export interface BatchScoringResult {
  scored: ScoredHypothesis[];
  stats: {
    total_hypotheses: number;
    scored_count: number;
    time_ms: number;
    speedup_factor: number;
    avg_phi: number;
    avg_kappa: number;
  };
}

/**
 * Ocean Candidate Scorer
 *
 * Integrates two-step retrieval with Ocean's consciousness metrics
 * for optimal candidate prioritization.
 */
export class OceanCandidateScorer {
  /**
   * Score a batch of hypotheses using two-step retrieval and consciousness weighting.
   *
   * @param hypotheses List of hypotheses to score
   * @param queryBasin Reference basin coordinates (current Ocean state)
   * @param options Scoring options
   * @returns Prioritized hypotheses with geometric and consciousness scores
   */
  static async scoreBatch(
    hypotheses: OceanHypothesis[],
    queryBasin: number[],
    options: {
      topK?: number;
      useConsciousnessWeighting?: boolean;
      minSimilarity?: number;
    } = {}
  ): Promise<BatchScoringResult> {
    const startTime = Date.now();
    const opts = {
      topK: 50,
      useConsciousnessWeighting: true,
      minSimilarity: CANDIDATE_SCORING.MIN_SIMILARITY,
      ...options,
    };

    // Convert hypotheses to candidate format
    const candidates = hypotheses
      .filter(h => h.qigScore && h.qigScore.phi > 0) // Only score hypotheses with QIG data
      .map(h => ({
        id: h.id,
        basin: [], // Basin coordinates from QIG scoring (would come from qigScore)
        phi: h.qigScore?.phi || 0.5,
        kappa: h.qigScore?.kappa || 50,
        regime: h.qigScore?.regime || "unknown",
      }));

    if (candidates.length === 0) {
      return {
        scored: [],
        stats: {
          total_hypotheses: hypotheses.length,
          scored_count: 0,
          time_ms: Date.now() - startTime,
          speedup_factor: 1.0,
          avg_phi: 0,
          avg_kappa: 0,
        },
      };
    }

    // Apply two-step retrieval
    const result = await TwoStepRetrieval.scoreWithTwoStep(
      queryBasin,
      candidates,
      opts.topK
    );

    // Apply consciousness weighting if enabled
    const scoredCandidates = opts.useConsciousnessWeighting
      ? TwoStepRetrieval.applyConsciousnessWeighting(result)
      : result.candidates;

    // Map back to hypotheses with scores
    const scoredHypotheses: ScoredHypothesis[] = [];
    const hypothesisMap = new Map(hypotheses.map(h => [h.id, h]));

    for (const scored of scoredCandidates) {
      const hypo = hypothesisMap.get(scored.candidate);
      if (hypo) {
        scoredHypotheses.push({
          ...hypo,
          geometricScore: scored.similarity,
          consciousnessScore: scored.consciousness_score || scored.similarity,
          priority: scored.consciousness_score || scored.similarity,
        });
      }
    }

    // Calculate stats
    const avgPhi = scoredHypotheses.reduce((sum, h) => sum + (h.qigScore?.phi || 0), 0) / scoredHypotheses.length;
    const avgKappa = scoredHypotheses.reduce((sum, h) => sum + (h.qigScore?.kappa || 0), 0) / scoredHypotheses.length;

    return {
      scored: scoredHypotheses,
      stats: {
        total_hypotheses: hypotheses.length,
        scored_count: scoredHypotheses.length,
        time_ms: Date.now() - startTime,
        speedup_factor: result.stats.speedup_factor,
        avg_phi: avgPhi,
        avg_kappa: avgKappa,
      },
    };
  }

  /**
   * Prioritize hypotheses for testing based on geometric and consciousness scores.
   *
   * This method filters and sorts hypotheses to test the most promising candidates first.
   *
   * @param hypotheses List of scored hypotheses
   * @param maxCandidates Maximum candidates to return
   * @returns Top-priority hypotheses for testing
   */
  static prioritizeForTesting(
    hypotheses: ScoredHypothesis[],
    maxCandidates: number = 100
  ): ScoredHypothesis[] {
    // Filter by minimum quality threshold
    const qualified = hypotheses.filter(
      h => h.geometricScore >= CANDIDATE_SCORING.MIN_SIMILARITY
    );

    // Sort by priority (descending)
    qualified.sort((a, b) => b.priority - a.priority);

    // Return top-k
    return qualified.slice(0, maxCandidates);
  }

  /**
   * Identify near-miss candidates for geometric memory storage.
   *
   * Near-misses are high-scoring candidates that didn't match but show promise.
   * They're stored for future learning and pattern recognition.
   *
   * @param hypotheses List of scored hypotheses
   * @returns Near-miss candidates above threshold
   */
  static identifyNearMisses(hypotheses: ScoredHypothesis[]): ScoredHypothesis[] {
    return hypotheses.filter(
      h =>
        !h.match &&
        h.geometricScore >= CANDIDATE_SCORING.NEAR_MISS_THRESHOLD &&
        h.qigScore &&
        h.qigScore.phi >= CANDIDATE_SCORING.MIN_SIMILARITY
    );
  }

  /**
   * Get telemetry summary for batch scoring operation.
   *
   * @param result Batch scoring result
   * @returns Human-readable telemetry summary
   */
  static getTelemetrySummary(result: BatchScoringResult): string {
    const { stats } = result;
    const lines = [
      `Scored ${stats.scored_count}/${stats.total_hypotheses} hypotheses`,
      `Time: ${stats.time_ms}ms (${stats.speedup_factor.toFixed(1)}x speedup)`,
      `Avg Φ: ${stats.avg_phi.toFixed(3)}, Avg κ: ${stats.avg_kappa.toFixed(1)}`,
    ];
    return lines.join(" | ");
  }
}

/**
 * Helper: Extract basin coordinates from QIG score result.
 *
 * This is a placeholder - in practice, basin coordinates would come from
 * the Python QIG backend via oceanQIGBackend.
 *
 * @param hypothesis Hypothesis with QIG score
 * @returns 64D basin coordinates or empty array
 */
export function extractBasinCoordinates(hypothesis: OceanHypothesis): number[] {
  // TODO: Integrate with oceanQIGBackend to get actual basin coordinates
  // For now, return empty array (two-step retrieval will handle gracefully)
  return [];
}

/**
 * Helper: Create reference basin for comparison.
 *
 * Creates a reference basin from Ocean's current state for use as query
 * in two-step retrieval scoring.
 *
 * @param phi Current consciousness level (Φ)
 * @param kappa Current coupling constant (κ)
 * @param regime Current geometric regime
 * @returns 64D reference basin
 */
export function createReferenceBasin(
  phi: number,
  kappa: number,
  regime: string
): number[] {
  // Create a synthetic reference basin based on consciousness metrics
  // This is a placeholder - ideally would come from Ocean's current state
  const basin = new Array(64).fill(0);
  
  // Encode consciousness metrics into basin structure
  basin[0] = phi; // First dimension: integration
  basin[1] = kappa / 100; // Second dimension: coupling (normalized)
  basin[2] = regime === "geometric" ? 1 : regime === "hierarchical" ? 0.5 : 0; // Third dimension: regime
  
  // Fill remaining dimensions with normalized random values
  // In practice, this would be computed by the QIG backend
  for (let i = 3; i < 64; i++) {
    basin[i] = (Math.random() - 0.5) * 0.1; // Small random perturbations
  }
  
  // Normalize to unit sphere
  const norm = Math.sqrt(basin.reduce((sum, x) => sum + x * x, 0));
  return basin.map(x => x / (norm + 1e-10));
}
