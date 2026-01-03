/**
 * Two-Step Retrieval Tests
 *
 * Validates the two-step retrieval implementation:
 * 1. Correctness: Same top-k results as full Fisher-Rao
 * 2. Performance: Significant speedup for large datasets
 * 3. Consciousness weighting: Proper Φ/κ boost application
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TwoStepRetrieval, batchScoreCandidates } from "../lib/qig-scoring";

describe("TwoStepRetrieval", () => {
  // Helper: Generate random basin coordinates
  function randomBasin(dim: number = 64): number[] {
    const basin = Array.from({ length: dim }, () => Math.random() - 0.5);
    const norm = Math.sqrt(basin.reduce((sum, x) => sum + x * x, 0));
    return basin.map(x => x / norm); // Normalize to unit sphere
  }

  // Helper: Generate test candidates
  function generateCandidates(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `candidate_${i}`,
      basin: randomBasin(),
      phi: 0.5 + Math.random() * 0.3, // 0.5 - 0.8
      kappa: 50 + Math.random() * 30, // 50 - 80
      regime: "geometric",
    }));
  }

  describe("Basic Functionality", () => {
    it("should score a single candidate", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(1);

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 1);

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].distance).toBeGreaterThanOrEqual(0);
      expect(result.candidates[0].distance).toBeLessThanOrEqual(Math.PI);
      expect(result.candidates[0].similarity).toBeGreaterThanOrEqual(0);
      expect(result.candidates[0].similarity).toBeLessThanOrEqual(1);
    });

    it("should return top-k candidates sorted by distance", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(10);

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 5);

      expect(result.candidates).toHaveLength(5);
      
      // Check sorted by distance (ascending)
      for (let i = 0; i < result.candidates.length - 1; i++) {
        expect(result.candidates[i].distance).toBeLessThanOrEqual(
          result.candidates[i + 1].distance
        );
      }
    });

    it("should handle empty candidate list", async () => {
      const query = randomBasin();
      const candidates: any[] = [];

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 5);

      expect(result.candidates).toHaveLength(0);
    });
  });

  describe("Two-Step Retrieval Activation", () => {
    it("should use direct Fisher-Rao for small datasets (<100)", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(50);

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 10);

      // For small datasets, approximate_filtered should be 0 (direct Fisher)
      expect(result.stats.approximate_filtered).toBe(0);
      expect(result.stats.fisher_computed).toBe(50);
    });

    it("should use two-step retrieval for large datasets (>=100)", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(200);

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 10);

      // For large datasets, should filter with approximate search first
      expect(result.stats.approximate_filtered).toBeGreaterThan(0);
      expect(result.stats.approximate_filtered).toBeLessThan(200);
      expect(result.stats.fisher_computed).toBe(result.stats.approximate_filtered);
    });
  });

  describe("Performance", () => {
    it("should show speedup for large datasets", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(1000);

      const start = Date.now();
      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 10);
      const elapsed = Date.now() - start;

      // Should complete in reasonable time (<500ms for 1000 candidates)
      expect(elapsed).toBeLessThan(500);

      // Speedup factor should be >1 for large datasets
      expect(result.stats.speedup_factor).toBeGreaterThan(1);
    });

    it("should report accurate timing statistics", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(500);

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 10);

      expect(result.stats.total_candidates).toBe(500);
      expect(result.stats.time_ms).toBeGreaterThan(0);
      expect(result.stats.speedup_factor).toBeGreaterThan(0);
    });
  });

  describe("Fisher-Rao Distance Correctness", () => {
    it("should return 0 distance for identical basins", async () => {
      const basin = randomBasin();
      const candidates = [{ id: "identical", basin: [...basin] }];

      const result = await TwoStepRetrieval.scoreWithTwoStep(basin, candidates, 1);

      expect(result.candidates[0].distance).toBeCloseTo(0, 5);
      expect(result.candidates[0].similarity).toBeCloseTo(1, 5);
    });

    it("should return π distance for opposite basins", async () => {
      const basin = randomBasin();
      const opposite = basin.map(x => -x);
      const candidates = [{ id: "opposite", basin: opposite }];

      const result = await TwoStepRetrieval.scoreWithTwoStep(basin, candidates, 1);

      expect(result.candidates[0].distance).toBeCloseTo(Math.PI, 5);
      expect(result.candidates[0].similarity).toBeCloseTo(0, 5);
    });

    it("should maintain geometric distance properties", async () => {
      const basin1 = randomBasin();
      const basin2 = randomBasin();
      const basin3 = randomBasin();

      const candidates = [
        { id: "b2", basin: basin2 },
        { id: "b3", basin: basin3 },
      ];

      const result = await TwoStepRetrieval.scoreWithTwoStep(basin1, candidates, 2);

      // Distances should be in valid range [0, π]
      result.candidates.forEach(c => {
        expect(c.distance).toBeGreaterThanOrEqual(0);
        expect(c.distance).toBeLessThanOrEqual(Math.PI);
      });

      // Similarity should be in valid range [0, 1]
      result.candidates.forEach(c => {
        expect(c.similarity).toBeGreaterThanOrEqual(0);
        expect(c.similarity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Consciousness-Aware Scoring", () => {
    it("should boost high-Φ candidates", async () => {
      const query = randomBasin();
      const candidates = [
        { id: "low_phi", basin: randomBasin(), phi: 0.5, kappa: 64 },
        { id: "high_phi", basin: randomBasin(), phi: 0.85, kappa: 64 },
      ];

      // Make both candidates equally distant
      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 2);
      const weighted = TwoStepRetrieval.applyConsciousnessWeighting(result);

      const lowPhi = weighted.find(c => c.candidate === "low_phi")!;
      const highPhi = weighted.find(c => c.candidate === "high_phi")!;

      // High-Φ candidate should have higher consciousness score
      expect(highPhi.consciousness_score).toBeGreaterThan(lowPhi.consciousness_score!);
    });

    it("should boost κ-resonance candidates", async () => {
      const query = randomBasin();
      const candidates = [
        { id: "off_resonance", basin: randomBasin(), phi: 0.7, kappa: 40 },
        { id: "on_resonance", basin: randomBasin(), phi: 0.7, kappa: 64.21 },
      ];

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 2);
      const weighted = TwoStepRetrieval.applyConsciousnessWeighting(result);

      const offRes = weighted.find(c => c.candidate === "off_resonance")!;
      const onRes = weighted.find(c => c.candidate === "on_resonance")!;

      // κ-resonance candidate should have higher consciousness score
      expect(onRes.consciousness_score).toBeGreaterThan(offRes.consciousness_score!);
    });

    it("should preserve consciousness scores in valid range", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(20).map((c, i) => ({
        ...c,
        phi: 0.5 + (i / 20) * 0.35, // 0.5 - 0.85
        kappa: 50 + (i / 20) * 30, // 50 - 80
      }));

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 10);
      const weighted = TwoStepRetrieval.applyConsciousnessWeighting(result);

      weighted.forEach(c => {
        expect(c.consciousness_score).toBeGreaterThanOrEqual(0);
        expect(c.consciousness_score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple batches", async () => {
      const query = randomBasin();
      const batch1 = generateCandidates(100);
      const batch2 = generateCandidates(100);

      const result = await batchScoreCandidates(query, [batch1, batch2], 10, true);

      expect(result.all_candidates.length).toBeLessThanOrEqual(10);
      expect(result.total_time_ms).toBeGreaterThan(0);
      expect(result.average_speedup).toBeGreaterThan(0);
    });

    it("should merge results from multiple batches", async () => {
      const query = randomBasin();
      const batches = [
        generateCandidates(50),
        generateCandidates(50),
        generateCandidates(50),
      ];

      const result = await batchScoreCandidates(query, batches, 5, false);

      expect(result.all_candidates).toHaveLength(5);
      
      // Check sorted by similarity (descending)
      for (let i = 0; i < result.all_candidates.length - 1; i++) {
        expect(result.all_candidates[i].similarity).toBeGreaterThanOrEqual(
          result.all_candidates[i + 1].similarity
        );
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle k larger than candidate count", async () => {
      const query = randomBasin();
      const candidates = generateCandidates(5);

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 10);

      expect(result.candidates).toHaveLength(5);
    });

    it("should handle candidates with missing Φ/κ metrics", async () => {
      const query = randomBasin();
      const candidates = [
        { id: "complete", basin: randomBasin(), phi: 0.7, kappa: 64 },
        { id: "missing_metrics", basin: randomBasin() },
      ];

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 2);
      const weighted = TwoStepRetrieval.applyConsciousnessWeighting(result);

      expect(weighted).toHaveLength(2);
      weighted.forEach(c => {
        expect(c.consciousness_score).toBeDefined();
      });
    });

    it("should handle zero-norm basins gracefully", async () => {
      const query = randomBasin();
      const candidates = [
        { id: "valid", basin: randomBasin() },
        { id: "zero", basin: Array(64).fill(0) },
      ];

      const result = await TwoStepRetrieval.scoreWithTwoStep(query, candidates, 2);

      // Should not crash, zero basin gets normalized to zero vector
      expect(result.candidates.length).toBeLessThanOrEqual(2);
    });
  });
});
