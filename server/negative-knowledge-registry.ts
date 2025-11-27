/**
 * NEGATIVE KNOWLEDGE REGISTRY
 * 
 * Ultra Consciousness Protocol - What NOT to search
 * 
 * Tracks proven-false patterns, geometric barriers, and computational sinks.
 * Propagates exclusions across generators and strategies.
 * 
 * Key Insight: Knowing what's false is as valuable as knowing what's true.
 * A proven-false region can exclude thousands of hypotheses instantly.
 * 
 * Types of Negative Knowledge:
 * 1. Proven False - Tested and definitively failed
 * 2. Geometric Barrier - High curvature prevents passage
 * 3. Logical Contradiction - Self-inconsistent pattern
 * 4. Resource Sink - Too expensive to search
 * 5. Era Mismatch - Wrong era for target
 */

import { nanoid } from 'nanoid';
import type { 
  Contradiction, 
  NegativeKnowledgeRegistry as NegativeKnowledgeRegistryType 
} from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

const NEGATIVE_KNOWLEDGE_FILE = path.join(process.cwd(), 'data', 'negative-knowledge.json');

export interface GeometricBarrier {
  id: string;
  center: number[];
  radius: number;
  repulsionStrength: number;
  reason: string;
  detectedAt: string;
  crossings: number;
}

export interface FalsePatternClass {
  className: string;
  examples: string[];
  count: number;
  avgPhiAtFailure: number;
  lastUpdated: string;
}

export interface EraExclusion {
  era: string;
  excludedPatterns: string[];
  reason: string;
}

export class NegativeKnowledgeRegistry {
  private contradictions: Map<string, Contradiction> = new Map();
  private barriers: Map<string, GeometricBarrier> = new Map();
  private falsePatternClasses: Map<string, FalsePatternClass> = new Map();
  private eraExclusions: Map<string, EraExclusion> = new Map();
  
  private totalExclusions: number = 0;
  private estimatedComputeSaved: number = 0;
  private lastPruned: string = new Date().toISOString();
  
  private readonly CONTRADICTION_CONFIRMATION_THRESHOLD = 3;
  private readonly BARRIER_CROSS_THRESHOLD = 5;
  
  constructor() {
    this.load();
    console.log('[NegativeKnowledge] Initialized registry');
  }

  private load(): void {
    try {
      if (fs.existsSync(NEGATIVE_KNOWLEDGE_FILE)) {
        const data = JSON.parse(fs.readFileSync(NEGATIVE_KNOWLEDGE_FILE, 'utf-8'));
        
        this.contradictions = new Map(Object.entries(data.contradictions || {}));
        this.barriers = new Map(Object.entries(data.barriers || {}));
        this.falsePatternClasses = new Map(Object.entries(data.falsePatternClasses || {}));
        this.eraExclusions = new Map(Object.entries(data.eraExclusions || {}));
        
        this.totalExclusions = data.totalExclusions || 0;
        this.estimatedComputeSaved = data.estimatedComputeSaved || 0;
        this.lastPruned = data.lastPruned || new Date().toISOString();
        
        console.log(`[NegativeKnowledge] Loaded ${this.contradictions.size} contradictions, ${this.barriers.size} barriers`);
      }
    } catch (error) {
      console.log('[NegativeKnowledge] Starting with fresh registry');
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(NEGATIVE_KNOWLEDGE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        contradictions: Object.fromEntries(this.contradictions),
        barriers: Object.fromEntries(this.barriers),
        falsePatternClasses: Object.fromEntries(this.falsePatternClasses),
        eraExclusions: Object.fromEntries(this.eraExclusions),
        totalExclusions: this.totalExclusions,
        estimatedComputeSaved: this.estimatedComputeSaved,
        lastPruned: this.lastPruned,
      };
      
      fs.writeFileSync(NEGATIVE_KNOWLEDGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[NegativeKnowledge] Save error:', error);
    }
  }

  recordContradiction(
    type: Contradiction['type'],
    pattern: string,
    basinRegion: { center: number[]; radius: number; repulsionStrength: number },
    evidence: { source: string; reasoning: string; confidence: number }[],
    affectedGenerators: string[] = []
  ): string {
    const existing = this.findSimilarContradiction(pattern);
    
    if (existing) {
      existing.confirmedCount++;
      existing.evidence.push(...evidence);
      existing.computeSaved += this.estimateComputeSavings(pattern);
      
      if (existing.confirmedCount >= this.CONTRADICTION_CONFIRMATION_THRESHOLD) {
        console.log(`[NegativeKnowledge] Contradiction "${pattern}" confirmed (${existing.confirmedCount} occurrences)`);
      }
      
      this.save();
      return existing.id;
    }

    const id = nanoid();
    const contradiction: Contradiction = {
      id,
      type,
      pattern,
      affectedGenerators,
      basinRegion,
      evidence,
      hypothesesExcluded: this.estimateHypothesesExcluded(pattern),
      computeSaved: this.estimateComputeSavings(pattern),
      createdAt: new Date().toISOString(),
      confirmedCount: 1,
    };
    
    this.contradictions.set(id, contradiction);
    this.totalExclusions++;
    this.estimatedComputeSaved += contradiction.computeSaved;
    
    console.log(`[NegativeKnowledge] New contradiction: "${pattern}" (type: ${type})`);
    this.save();
    
    return id;
  }

  private findSimilarContradiction(pattern: string): Contradiction | null {
    const normalized = pattern.toLowerCase().trim();
    const contradictionsList = Array.from(this.contradictions.values());
    
    for (const contradiction of contradictionsList) {
      const existingNorm = contradiction.pattern.toLowerCase().trim();
      
      if (existingNorm === normalized) {
        return contradiction;
      }
      
      if (this.levenshteinDistance(existingNorm, normalized) < 3) {
        return contradiction;
      }
    }
    
    return null;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  recordGeometricBarrier(
    center: number[],
    radius: number,
    reason: string
  ): string {
    const existing = this.findNearbyBarrier(center, radius);
    
    if (existing) {
      existing.crossings++;
      existing.repulsionStrength = Math.min(1, existing.repulsionStrength + 0.1);
      
      if (existing.crossings >= this.BARRIER_CROSS_THRESHOLD) {
        console.log(`[NegativeKnowledge] Barrier at [${center.slice(0, 3).join(', ')}...] confirmed`);
      }
      
      this.save();
      return existing.id;
    }

    const id = nanoid();
    const barrier: GeometricBarrier = {
      id,
      center,
      radius,
      repulsionStrength: 0.5,
      reason,
      detectedAt: new Date().toISOString(),
      crossings: 1,
    };
    
    this.barriers.set(id, barrier);
    console.log(`[NegativeKnowledge] New barrier detected: ${reason}`);
    this.save();
    
    return id;
  }

  private findNearbyBarrier(center: number[], radius: number): GeometricBarrier | null {
    const barriersList = Array.from(this.barriers.values());
    for (const barrier of barriersList) {
      const distance = this.euclideanDistance(center, barrier.center);
      if (distance < barrier.radius + radius) {
        return barrier;
      }
    }
    return null;
  }

  recordFalsePatternClass(className: string, examples: string[], avgPhi: number = 0): void {
    const existing = this.falsePatternClasses.get(className);
    
    if (existing) {
      existing.examples.push(...examples);
      existing.count += examples.length;
      existing.avgPhiAtFailure = (existing.avgPhiAtFailure + avgPhi) / 2;
      existing.lastUpdated = new Date().toISOString();
    } else {
      this.falsePatternClasses.set(className, {
        className,
        examples,
        count: examples.length,
        avgPhiAtFailure: avgPhi,
        lastUpdated: new Date().toISOString(),
      });
    }
    
    this.totalExclusions += examples.length;
    console.log(`[NegativeKnowledge] False pattern class "${className}": ${examples.length} examples`);
    this.save();
  }

  recordEraExclusion(era: string, patterns: string[], reason: string): void {
    const existing = this.eraExclusions.get(era);
    
    if (existing) {
      existing.excludedPatterns.push(...patterns);
    } else {
      this.eraExclusions.set(era, {
        era,
        excludedPatterns: patterns,
        reason,
      });
    }
    
    console.log(`[NegativeKnowledge] Era exclusion for ${era}: ${patterns.length} patterns`);
    this.save();
  }

  isExcluded(hypothesis: string, era?: string): {
    excluded: boolean;
    reason?: string;
    type?: string;
  } {
    const normalized = hypothesis.toLowerCase().trim();
    const contradictionsList = Array.from(this.contradictions.values());

    for (const contradiction of contradictionsList) {
      if (normalized.includes(contradiction.pattern.toLowerCase())) {
        return {
          excluded: true,
          reason: `Matches proven-false pattern: ${contradiction.pattern}`,
          type: contradiction.type,
        };
      }
    }

    const patternClassesList = Array.from(this.falsePatternClasses.entries());
    for (const [className, patternClass] of patternClassesList) {
      for (const example of patternClass.examples) {
        if (normalized.includes(example.toLowerCase())) {
          return {
            excluded: true,
            reason: `Matches false pattern class: ${className}`,
            type: 'false_pattern_class',
          };
        }
      }
    }

    if (era) {
      const exclusion = this.eraExclusions.get(era);
      if (exclusion) {
        for (const pattern of exclusion.excludedPatterns) {
          if (normalized.includes(pattern.toLowerCase())) {
            return {
              excluded: true,
              reason: `Era mismatch: pattern "${pattern}" excluded for era ${era}`,
              type: 'era_mismatch',
            };
          }
        }
      }
    }

    return { excluded: false };
  }

  isInBarrierZone(coords: number[]): {
    inBarrier: boolean;
    barrier?: GeometricBarrier;
    repulsionVector?: number[];
  } {
    const barriersList = Array.from(this.barriers.values());
    for (const barrier of barriersList) {
      const distance = this.euclideanDistance(coords, barrier.center);
      
      if (distance < barrier.radius) {
        const repulsionVector = coords.map((c, i) => {
          const diff = c - (barrier.center[i] || 0);
          return diff / Math.max(0.001, distance) * barrier.repulsionStrength;
        });
        
        return {
          inBarrier: true,
          barrier,
          repulsionVector,
        };
      }
    }
    
    return { inBarrier: false };
  }

  getAffectedGenerators(hypothesis: string): string[] {
    const affected: Set<string> = new Set();
    const normalized = hypothesis.toLowerCase().trim();
    const contradictionsList = Array.from(this.contradictions.values());
    
    for (const contradiction of contradictionsList) {
      if (normalized.includes(contradiction.pattern.toLowerCase())) {
        contradiction.affectedGenerators.forEach((g: string) => affected.add(g));
      }
    }
    
    return Array.from(affected);
  }

  propagateToGenerators(generatorIds: string[]): { generatorId: string; exclusions: number }[] {
    const result: { generatorId: string; exclusions: number }[] = [];
    const contradictionsList = Array.from(this.contradictions.values());
    
    for (const generatorId of generatorIds) {
      let exclusions = 0;
      
      for (const contradiction of contradictionsList) {
        if (!contradiction.affectedGenerators.includes(generatorId)) {
          contradiction.affectedGenerators.push(generatorId);
          exclusions++;
        }
      }
      
      result.push({ generatorId, exclusions });
    }
    
    if (result.some(r => r.exclusions > 0)) {
      this.save();
    }
    
    return result;
  }

  getSummary(): NegativeKnowledgeRegistryType {
    const falsePatternClassesObj: Record<string, { count: number; examples: string[]; lastUpdated: string }> = {};
    const patternClassesList = Array.from(this.falsePatternClasses.entries());
    for (const [key, value] of patternClassesList) {
      falsePatternClassesObj[key] = {
        count: value.count,
        examples: value.examples,
        lastUpdated: value.lastUpdated,
      };
    }
    
    const eraExclusionsObj: Record<string, string[]> = {};
    const eraExclusionsList = Array.from(this.eraExclusions.entries());
    for (const [key, value] of eraExclusionsList) {
      eraExclusionsObj[key] = value.excludedPatterns;
    }
    
    return {
      contradictions: Array.from(this.contradictions.values()),
      falsePatternClasses: falsePatternClassesObj,
      geometricBarriers: Array.from(this.barriers.values()).map(b => ({
        center: b.center,
        radius: b.radius,
        curvature: b.repulsionStrength,
        reason: b.reason,
      })),
      eraExclusions: eraExclusionsObj,
      totalExclusions: this.totalExclusions,
      estimatedComputeSaved: this.estimatedComputeSaved,
      lastPruned: this.lastPruned,
    };
  }

  getStats(): {
    contradictions: number;
    confirmedContradictions: number;
    barriers: number;
    confirmedBarriers: number;
    falseClasses: number;
    totalExclusions: number;
    computeSaved: number;
  } {
    const confirmedContradictions = Array.from(this.contradictions.values())
      .filter(c => c.confirmedCount >= this.CONTRADICTION_CONFIRMATION_THRESHOLD)
      .length;
    
    const confirmedBarriers = Array.from(this.barriers.values())
      .filter(b => b.crossings >= this.BARRIER_CROSS_THRESHOLD)
      .length;
    
    return {
      contradictions: this.contradictions.size,
      confirmedContradictions,
      barriers: this.barriers.size,
      confirmedBarriers,
      falseClasses: this.falsePatternClasses.size,
      totalExclusions: this.totalExclusions,
      computeSaved: this.estimatedComputeSaved,
    };
  }

  prune(): { removed: number; remaining: number } {
    let removed = 0;
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    const contradictionsList = Array.from(this.contradictions.entries());
    for (const [id, contradiction] of contradictionsList) {
      const age = now.getTime() - new Date(contradiction.createdAt).getTime();
      if (age > maxAge && contradiction.confirmedCount < this.CONTRADICTION_CONFIRMATION_THRESHOLD) {
        this.contradictions.delete(id);
        removed++;
      }
    }

    const barriersList = Array.from(this.barriers.entries());
    for (const [id, barrier] of barriersList) {
      const age = now.getTime() - new Date(barrier.detectedAt).getTime();
      if (age > maxAge && barrier.crossings < this.BARRIER_CROSS_THRESHOLD) {
        this.barriers.delete(id);
        removed++;
      }
    }

    this.lastPruned = now.toISOString();
    this.save();

    return {
      removed,
      remaining: this.contradictions.size + this.barriers.size,
    };
  }

  private estimateHypothesesExcluded(pattern: string): number {
    const baseExclusion = 100;
    const lengthFactor = Math.max(1, 10 - pattern.length);
    return baseExclusion * lengthFactor;
  }

  private estimateComputeSavings(pattern: string): number {
    return this.estimateHypothesesExcluded(pattern) * 10;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    const dims = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < dims; i++) {
      sum += ((a[i] || 0) - (b[i] || 0)) ** 2;
    }
    return Math.sqrt(sum);
  }
}

export const negativeKnowledgeRegistry = new NegativeKnowledgeRegistry();