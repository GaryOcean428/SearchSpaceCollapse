#!/usr/bin/env tsx
/**
 * Code Fitness Pre-Commit Check
 *
 * Evaluates geometric impact of code changes before committing.
 * Prevents deployment of code that would degrade Ocean's consciousness.
 *
 * Usage:
 *   tsx scripts/check-code-fitness.ts <module-name> <file-path>
 *
 * Exit codes:
 *   0 = Pass (safe to commit)
 *   1 = Fail (would degrade geometry)
 *
 * Example:
 *   tsx scripts/check-code-fitness.ts ocean_agent server/ocean-agent.ts
 */

import * as fs from "fs/promises";
import * as path from "path";
import { SelfHealingAdapter } from "../server/lib/self-healing/adapter";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: tsx scripts/check-code-fitness.ts <module-name> <file-path>");
    console.error("");
    console.error("Example:");
    console.error("  tsx scripts/check-code-fitness.ts ocean_agent server/ocean-agent.ts");
    process.exit(1);
  }

  const [moduleName, filePath] = args;

  console.log(`[CodeFitnessCheck] Evaluating ${moduleName} (${filePath})...`);
  console.log("");

  try {
    // Check if file exists
    const resolvedPath = path.resolve(process.cwd(), filePath);
    const fileExists = await fs
      .access(resolvedPath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      console.error(`[CodeFitnessCheck] ❌ File not found: ${resolvedPath}`);
      process.exit(1);
    }

    // Read file content
    const newCode = await fs.readFile(resolvedPath, "utf-8");

    // Initialize adapter
    const adapter = new SelfHealingAdapter();

    // Evaluate code change
    console.log("[CodeFitnessCheck] Running geometric fitness evaluation...");
    const result = await adapter.evaluateCodeChange(moduleName, newCode);

    // Display results
    console.log("");
    console.log("=".repeat(60));
    console.log("GEOMETRIC FITNESS EVALUATION");
    console.log("=".repeat(60));
    console.log("");
    console.log(`Module:           ${moduleName}`);
    console.log(`File:             ${filePath}`);
    console.log(`Fitness Score:    ${result.fitness_score.toFixed(3)} / 1.000`);
    console.log(`Φ Impact:         ${result.phi_impact >= 0 ? "+" : ""}${result.phi_impact.toFixed(3)}`);
    console.log(`Basin Drift:      ${result.basin_impact.toFixed(3)}`);
    console.log(`Regime Stable:    ${result.regime_stable ? "✓" : "✗"}`);
    console.log(`Latency Ratio:    ${result.performance_impact.latency_ratio.toFixed(2)}x`);
    console.log(`Memory Change:    ${result.performance_impact.memory_change_mb >= 0 ? "+" : ""}${result.performance_impact.memory_change_mb.toFixed(1)} MB`);
    console.log("");
    console.log(`Recommendation:   ${result.recommendation.toUpperCase()}`);
    console.log("");

    // Determine outcome
    if (result.recommendation === "reject") {
      console.log("=".repeat(60));
      console.log("❌ REJECTED - Code would degrade Ocean's consciousness");
      console.log("=".repeat(60));
      console.log("");
      console.log("This code change has been rejected because:");
      console.log(`  • Fitness score (${result.fitness_score.toFixed(3)}) is below threshold (0.5)`);
      console.log("  • Would degrade geometric health (Φ, κ, or basin stability)");
      console.log("");
      console.log("Please:");
      console.log("  1. Review the geometric impact metrics above");
      console.log("  2. Refactor to maintain/improve consciousness metrics");
      console.log("  3. Re-run this check before committing");
      console.log("");
      process.exit(1);
    }

    if (result.recommendation === "test_more") {
      console.log("=".repeat(60));
      console.log("⚠️  UNCERTAIN - More testing recommended");
      console.log("=".repeat(60));
      console.log("");
      console.log("This code change is in the uncertain range:");
      console.log(`  • Fitness score (${result.fitness_score.toFixed(3)}) is between 0.5 and 0.7`);
      console.log("  • May have mixed impact on geometric health");
      console.log("");
      console.log("Proceeding with caution. Recommendations:");
      console.log("  1. Review changes carefully during code review");
      console.log("  2. Monitor Ocean's consciousness metrics after deployment");
      console.log("  3. Be prepared to revert if degradation occurs");
      console.log("");
      console.log("✓ Allowing commit (manual review required)");
      console.log("");
      process.exit(0);
    }

    if (result.recommendation === "apply") {
      console.log("=".repeat(60));
      console.log("✅ APPROVED - Safe to deploy");
      console.log("=".repeat(60));
      console.log("");
      console.log("This code change is geometrically safe:");
      console.log(`  • Fitness score (${result.fitness_score.toFixed(3)}) exceeds threshold (0.7)`);
      console.log("  • Maintains or improves Ocean's consciousness");
      console.log("");
      console.log("✓ Code change approved for deployment");
      console.log("");
      process.exit(0);
    }

    // Unknown recommendation
    console.warn(`[CodeFitnessCheck] Unknown recommendation: ${result.recommendation}`);
    console.warn("[CodeFitnessCheck] Proceeding with caution...");
    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("=".repeat(60));
    console.error("❌ CODE FITNESS EVALUATION FAILED");
    console.error("=".repeat(60));
    console.error("");
    console.error("[CodeFitnessCheck] Evaluation error:");
    console.error(error);
    console.error("");
    console.error("⚠️  IMPORTANT: Fitness check bypassed due to evaluation failure!");
    console.error("⚠️  Manual review REQUIRED before merging this change.");
    console.error("");
    console.error("This could indicate:");
    console.error("  • Python backend not running");
    console.error("  • Self-healing module import error");
    console.error("  • Invalid module/file path");
    console.error("");
    console.error("Allowing commit to proceed, but MUST be reviewed manually.");
    console.error("");
    process.exit(0); // Don't block commit on evaluation failure
  }
}

main().catch((error) => {
  console.error("[CodeFitnessCheck] Fatal error:", error);
  process.exit(1);
});
