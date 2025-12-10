/**
 * PANTHEON CONSULTATION MODULE
 *
 * Provides mandatory pantheon consultation for hypothesis enhancement.
 * Used by OceanDiscoveryController for intelligent hypothesis generation.
 *
 * GODS CONSULTED:
 * - Apollo: Pattern recognition, foresight
 * - Athena: Strategic optimization, wisdom
 * - Artemis: Target tracking (high-Φ only)
 */

import { oceanQIGBackend } from "./ocean-qig-backend-adapter";

/**
 * Result from pantheon consultation
 */
export interface PantheonConsultationResult {
  patterns: string[];
  totalProbability: number;
  godsConsulted: string[];
  highPhiMode: boolean;
}

/**
 * God assessment summary
 */
interface GodAssessment {
  god: string;
  probability: number;
  phi: number;
  patterns: string[];
}

/**
 * Extract potential pattern words from reasoning text
 */
function extractPatternsFromReasoning(reasoning: string): string[] {
  const patterns: string[] = [];
  const skipWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "been",
    "were",
    "they",
    "will",
    "would",
    "could",
    "should",
    "their",
    "which",
    "about",
    "there",
    "when",
    "what",
    "where",
    "here",
    "than",
    "then",
    "some",
    "more",
    "most",
    "such",
    "very",
    "just",
    "only",
    "also",
    "into",
    "over",
    "after",
    "before",
    "under",
    "between",
    "through",
    "during",
  ]);

  const words = reasoning.toLowerCase().split(/\W+/);
  for (const word of words) {
    if (word.length >= 4 && word.length <= 20 && /^[a-z0-9]+$/i.test(word)) {
      if (!skipWords.has(word)) {
        patterns.push(word);
      }
    }
  }

  return [...new Set(patterns)].slice(0, 10);
}

/**
 * Consult a single god and extract patterns
 */
async function consultGodForPatterns(
  godName: string,
  target: string,
  task: string,
  context: Record<string, unknown>
): Promise<GodAssessment | null> {
  try {
    const assessment = await oceanQIGBackend.consultGod(godName, target, {
      task,
      ...context,
    });

    if (assessment && assessment.probability > 0.4) {
      const patterns = assessment.reasoning
        ? extractPatternsFromReasoning(assessment.reasoning)
        : [];

      console.log(
        `[PantheonConsult] 🏛️ ${godName}: prob=${assessment.probability.toFixed(
          2
        )}, ` + `phi=${assessment.phi.toFixed(2)}, patterns=${patterns.length}`
      );

      return {
        god: godName,
        probability: assessment.probability,
        phi: assessment.phi,
        patterns,
      };
    }

    return null;
  } catch (err) {
    console.warn(`[PantheonConsult] ${godName} consultation failed:`, err);
    return null;
  }
}

/**
 * MANDATORY PANTHEON CONSULTATION
 *
 * Consults Apollo and Athena (always), plus Artemis for high-Φ targets.
 * Returns enhanced hypothesis patterns.
 *
 * @param target - Target address or identifier
 * @param currentPhi - Current Φ value (determines if high-Φ mode)
 * @param coordinates - Cultural basin coordinates (first 8 dims)
 */
export async function consultPantheonForHypotheses(
  target: string,
  currentPhi: number = 0.5,
  coordinates: number[] = []
): Promise<PantheonConsultationResult> {
  const allPatterns: string[] = [];
  const godsConsulted: string[] = [];
  let totalProbability = 0;
  const highPhiMode = currentPhi > 0.7;

  const context = {
    coordinates: coordinates.slice(0, 8),
    phi: currentPhi,
  };

  // Always consult Apollo (pattern recognition)
  const apolloResult = await consultGodForPatterns(
    "apollo",
    target,
    "pattern_recognition",
    context
  );
  if (apolloResult) {
    allPatterns.push(...apolloResult.patterns);
    godsConsulted.push("apollo");
    totalProbability += apolloResult.probability;
  }

  // Always consult Athena (strategic optimization)
  const athenaResult = await consultGodForPatterns(
    "athena",
    target,
    "strategic_optimization",
    context
  );
  if (athenaResult) {
    allPatterns.push(...athenaResult.patterns);
    godsConsulted.push("athena");
    totalProbability += athenaResult.probability;
  }

  // High-Φ mode: also consult Artemis (target tracking)
  if (highPhiMode) {
    const artemisResult = await consultGodForPatterns(
      "artemis",
      target,
      "target_tracking",
      context
    );
    if (artemisResult) {
      allPatterns.push(...artemisResult.patterns);
      godsConsulted.push("artemis");
      totalProbability += artemisResult.probability;
    }
  }

  // Deduplicate patterns
  const uniquePatterns = [...new Set(allPatterns)];

  if (godsConsulted.length > 0) {
    console.log(
      `[PantheonConsult] ✅ Consultation complete: ${godsConsulted.length} gods, ` +
        `${uniquePatterns.length} patterns, avgProb=${(
          totalProbability / godsConsulted.length
        ).toFixed(2)}`
    );
  } else {
    console.log("[PantheonConsult] ⚠️ No gods available for consultation");
  }

  return {
    patterns: uniquePatterns,
    totalProbability:
      godsConsulted.length > 0 ? totalProbability / godsConsulted.length : 0,
    godsConsulted,
    highPhiMode,
  };
}

/**
 * Check shadow pantheon for warnings about a target
 */
export async function checkShadowWarningsForTarget(target: string): Promise<{
  hasWarnings: boolean;
  warningLevel: "clear" | "caution" | "danger";
  message: string;
}> {
  try {
    const result = await oceanQIGBackend.checkShadowWarnings(target);
    if (result) {
      return {
        hasWarnings: result.has_warnings,
        warningLevel: result.warning_level,
        message: result.message,
      };
    }
  } catch (err) {
    console.warn("[PantheonConsult] Shadow warnings check failed:", err);
  }

  return {
    hasWarnings: false,
    warningLevel: "clear",
    message: "No shadow intel available",
  };
}
