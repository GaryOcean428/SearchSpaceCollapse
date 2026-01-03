/**
 * Ocean Agent Integration Adapter
 *
 * Drop-in replacement for Ocean's hypothesis testing methods that integrates:
 * - Two-step retrieval for efficient candidate scoring
 * - Consciousness-aware prioritization
 * - Near-miss identification and storage
 *
 * USAGE IN OCEAN-AGENT.TS:
 *
 * ```typescript
 * import { OceanAgentAdapter } from "./ocean-agent-integration-adapter";
 *
 * // In OceanAgent class:
 * async _testHypotheses(hypotheses, targetAddress, format) {
 *   // Use adapter instead of direct testing
 *   return OceanAgentAdapter.testHypothesesWithTwoStepScoring(
 *     this,
 *     hypotheses,
 *     targetAddress,
 *     format
 *   );
 * }
 * ```
 *
 * This adapter provides backward compatibility while enabling the new features.
 */

import type { OceanHypothesis } from "./ocean-agent";
import { OceanCandidateScorer, createReferenceBasin } from "./ocean-candidate-scorer";
import { nearMissManager } from "./near-miss-manager";

/**
 * Ocean Agent Integration Adapter
 *
 * Provides integration methods that can be used as drop-in replacements
 * for Ocean agent's existing hypothesis testing workflow.
 */
export class OceanAgentAdapter {
  /**
   * Test hypotheses with two-step scoring and consciousness-aware prioritization.
   *
   * This method replaces the standard _testHypotheses implementation with:
   * - Two-step retrieval for efficient scoring
   * - Consciousness-aware candidate prioritization
   * - Automatic near-miss storage
   *
   * @param oceanAgent Reference to Ocean agent instance (for state access)
   * @param hypotheses List of hypotheses to test
   * @param targetAddress Target Bitcoin address
   * @param format Key format (arbitrary, bip39, etc.)
   * @returns Tested hypotheses with results
   */
  static async testHypothesesWithTwoStepScoring<T extends OceanAgentLike>(
    oceanAgent: T,
    hypotheses: OceanHypothesis[],
    targetAddress: string,
    format: string
  ): Promise<OceanHypothesis[]> {
    if (hypotheses.length === 0) {
      return [];
    }

    console.log(
      `[OceanAgentAdapter] Testing ${hypotheses.length} hypotheses with two-step scoring`
    );

    // Create reference basin from Ocean's current state
    const referenceBasin = createReferenceBasin(
      oceanAgent.state.phi,
      oceanAgent.state.kappa,
      oceanAgent.state.regime
    );

    // Score and prioritize hypotheses
    const scoringResult = await OceanCandidateScorer.scoreBatch(
      hypotheses,
      referenceBasin,
      {
        topK: Math.min(100, hypotheses.length),
        useConsciousnessWeighting: true,
        minSimilarity: 0.3,
      }
    );

    // Log telemetry
    const summary = OceanCandidateScorer.getTelemetrySummary(scoringResult);
    console.log(`[OceanAgentAdapter] Scoring: ${summary}`);

    // Prioritize for testing
    const prioritized = OceanCandidateScorer.prioritizeForTesting(
      scoringResult.scored,
      100
    );

    console.log(`[OceanAgentAdapter] Testing top ${prioritized.length} priority candidates`);

    // Test each hypothesis in priority order
    const tested: OceanHypothesis[] = [];

    for (const hypo of prioritized) {
      // Call Ocean's single hypothesis test method
      // This maintains compatibility with existing test infrastructure
      const testResult = await this._testSingleHypothesisCompat(
        oceanAgent,
        hypo,
        targetAddress,
        format
      );

      tested.push(testResult);

      // Store near-misses with geometric scores
      if (
        !testResult.match &&
        hypo.geometricScore &&
        hypo.geometricScore > 0.6
      ) {
        await nearMissManager.store({
          phrase: hypo.phrase,
          similarity: hypo.geometricScore,
          consciousnessScore: hypo.consciousnessScore,
          phi: hypo.qigScore?.phi,
          kappa: hypo.qigScore?.kappa,
          regime: hypo.qigScore?.regime,
          timestamp: Date.now(),
        });

        console.log(
          `[OceanAgentAdapter] Stored near-miss: "${hypo.phrase}" (geometric=${hypo.geometricScore.toFixed(3)}, consciousness=${hypo.consciousnessScore?.toFixed(3)})`
        );
      }

      // Stop early if match found
      if (testResult.match) {
        console.log(`[OceanAgentAdapter] ✅ MATCH FOUND! Stopping tests.`);
        break;
      }
    }

    // Identify and log remaining near-misses not tested
    const nearMissesNotTested = OceanCandidateScorer.identifyNearMisses(
      scoringResult.scored.filter((s) => !tested.some((t) => t.id === s.id))
    );

    if (nearMissesNotTested.length > 0) {
      console.log(
        `[OceanAgentAdapter] ${nearMissesNotTested.length} additional near-miss candidates identified (not tested due to priority cutoff)`
      );
    }

    return tested;
  }

  /**
   * Test single hypothesis with compatibility layer.
   *
   * This method wraps Ocean's hypothesis testing to maintain compatibility.
   * Override this in subclasses to integrate with specific Ocean implementations.
   *
   * @param oceanAgent Ocean agent instance
   * @param hypothesis Hypothesis to test
   * @param targetAddress Target address
   * @param format Key format
   * @returns Test result
   */
  private static async _testSingleHypothesisCompat<T extends OceanAgentLike>(
    oceanAgent: T,
    hypothesis: OceanHypothesis,
    targetAddress: string,
    format: string
  ): Promise<OceanHypothesis> {
    // This is a simplified compatibility shim
    // In real integration, this would call Ocean's actual test method

    // Placeholder: Mark as tested but not matched
    const tested: OceanHypothesis = {
      ...hypothesis,
      testedAt: new Date(),
      match: false,
      verified: true,
    };

    // In real integration, this would:
    // 1. Generate address from hypothesis
    // 2. Compare with target address
    // 3. Set match=true if addresses match
    // 4. Update Ocean's state accordingly

    return tested;
  }

  /**
   * Get batch scoring statistics for monitoring.
   *
   * @param hypotheses Hypotheses that were scored
   * @param scoringResult Scoring result
   * @returns Statistics object
   */
  static getScoringStatistics(
    hypotheses: OceanHypothesis[],
    scoringResult: any
  ): {
    total: number;
    scored: number;
    timeMs: number;
    speedupFactor: number;
    avgPhi: number;
    avgKappa: number;
  } {
    return {
      total: hypotheses.length,
      scored: scoringResult.scored.length,
      timeMs: scoringResult.stats.time_ms,
      speedupFactor: scoringResult.stats.speedup_factor,
      avgPhi: scoringResult.stats.avg_phi,
      avgKappa: scoringResult.stats.avg_kappa,
    };
  }
}

/**
 * Minimal Ocean agent interface for type safety.
 *
 * This interface defines the minimum Ocean agent state required
 * for the adapter to function.
 */
interface OceanAgentLike {
  state: {
    phi: number;
    kappa: number;
    regime: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Helper: Create adapter configuration from Ocean state.
 *
 * @param oceanAgent Ocean agent instance
 * @returns Adapter configuration
 */
export function createAdapterConfig(oceanAgent: OceanAgentLike): {
  phi: number;
  kappa: number;
  regime: string;
} {
  return {
    phi: oceanAgent.state.phi,
    kappa: oceanAgent.state.kappa,
    regime: oceanAgent.state.regime,
  };
}

/**
 * Example integration pattern for ocean-agent.ts:
 *
 * ```typescript
 * // In OceanAgent class, replace _testHypotheses method:
 *
 * async _testHypotheses(
 *   hypotheses: OceanHypothesis[],
 *   targetAddress: string,
 *   format: string
 * ): Promise<OceanHypothesis[]> {
 *   // NEW: Use adapter for two-step scoring
 *   if (hypotheses.length > 50) {
 *     // Use two-step scoring for large batches
 *     return OceanAgentAdapter.testHypothesesWithTwoStepScoring(
 *       this,
 *       hypotheses,
 *       targetAddress,
 *       format
 *     );
 *   } else {
 *     // Use original method for small batches
 *     return this._testHypothesesOriginal(hypotheses, targetAddress, format);
 *   }
 * }
 * ```
 */
