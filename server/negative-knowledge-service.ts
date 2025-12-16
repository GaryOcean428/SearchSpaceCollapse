/**
 * Negative Knowledge Classification Service
 * 
 * Tracks patterns that yield no balance/transactions (false positives) to avoid
 * wasting resources re-testing known bad patterns. Uses the false_pattern_classes
 * table for persistent storage.
 */

import { db, withDbRetry } from "./db";
import { falsePatternClasses, type FalsePatternClass } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { createHash } from "crypto";

// Pattern classification categories
export type PatternCategory = 
  | "common_phrase"      // "hello world", "test test test"
  | "dictionary_word"    // Single repeated dictionary words
  | "random_string"      // Truly random with no structure
  | "sequential"         // "one two three four..."
  | "keyboard_pattern"   // "qwerty", "asdf"
  | "numeric_pattern"    // Contains numbers or numeric words
  | "celebrity_name"     // Famous person names
  | "song_lyric"         // Known song lyrics
  | "movie_quote"        // Movie/TV quotes
  | "bip39_low_entropy"  // Valid BIP39 but low entropy pattern
  | "unknown";           // Uncategorized

// Statistics for false pattern analysis
export interface FalsePatternStats {
  totalClasses: number;
  totalFailures: number;
  topCategories: Array<{ category: string; count: number; avgPhi: number }>;
  recentPatterns: Array<{ className: string; count: number; lastUpdated: string }>;
}

// Classification result
export interface ClassificationResult {
  category: PatternCategory;
  confidence: number;
  matchedClass: string | null;
  shouldSkip: boolean;
}

// Common dictionary words that often appear in weak passphrases
const COMMON_WORDS = new Set([
  "abandon", "ability", "able", "about", "abstract", "absurd", "abuse", "access",
  "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire",
  "test", "hello", "world", "password", "secret", "bitcoin", "wallet", "crypto",
  "money", "bank", "love", "hate", "peace", "war", "life", "death",
]);

// Keyboard patterns
const KEYBOARD_PATTERNS = [
  "qwerty", "asdf", "zxcv", "qazwsx", "edcrfv", "tgbyhn", "yujmik",
];

// Sequential number words
const SEQUENTIAL_PATTERNS = [
  "one two three", "first second third", "alpha beta gamma",
  "january february march", "monday tuesday wednesday",
];

/**
 * Generate a unique ID for a pattern class
 */
function generateClassId(className: string): string {
  return createHash("sha256").update(className).digest("hex").substring(0, 64);
}

/**
 * Classify a pattern into a category based on its characteristics
 */
export function classifyPattern(phrase: string): PatternCategory {
  const words = phrase.toLowerCase().trim().split(/\s+/);
  const wordSet = new Set(words);
  
  // Check for repeated words (low entropy)
  if (wordSet.size <= 3 && words.length >= 6) {
    return "bip39_low_entropy";
  }
  
  // Check for keyboard patterns
  const joined = words.join("");
  for (const pattern of KEYBOARD_PATTERNS) {
    if (joined.includes(pattern)) {
      return "keyboard_pattern";
    }
  }
  
  // Check for sequential patterns
  const phraseJoined = phrase.toLowerCase();
  for (const pattern of SEQUENTIAL_PATTERNS) {
    if (phraseJoined.includes(pattern)) {
      return "sequential";
    }
  }
  
  // Check for numeric patterns (words that are numbers)
  const numericWords = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "zero"];
  const numericCount = words.filter(w => numericWords.includes(w) || /^\d+$/.test(w)).length;
  if (numericCount >= words.length * 0.5) {
    return "numeric_pattern";
  }
  
  // Check for common dictionary words
  const commonCount = words.filter(w => COMMON_WORDS.has(w)).length;
  if (commonCount >= words.length * 0.7) {
    return "dictionary_word";
  }
  
  // Check for common test phrases
  if (phraseJoined.includes("test") || phraseJoined.includes("hello world") || phraseJoined.includes("example")) {
    return "common_phrase";
  }
  
  return "unknown";
}

/**
 * Build a class name from a phrase pattern for grouping similar failures
 */
function buildClassName(phrase: string, category: PatternCategory): string {
  const words = phrase.toLowerCase().trim().split(/\s+/);
  
  // For repeated word patterns, use the pattern structure
  if (category === "bip39_low_entropy") {
    const uniqueWords = [...new Set(words)].sort().join("-");
    return `low_entropy:${uniqueWords}`;
  }
  
  // For known categories, use category + first/last word
  if (category !== "unknown") {
    const first = words[0] || "unknown";
    const last = words[words.length - 1] || "unknown";
    return `${category}:${first}_${last}`;
  }
  
  // For unknown, use hash-based grouping
  const hash = createHash("md5").update(phrase).digest("hex").substring(0, 8);
  return `unknown:${hash}`;
}

class NegativeKnowledgeService {
  private cache: Map<string, FalsePatternClass> = new Map();
  private cacheLoaded = false;
  
  /**
   * Load the cache from database
   */
  private async ensureCacheLoaded(): Promise<void> {
    if (this.cacheLoaded || !db) return;
    
    const result = await withDbRetry(
      async () => db!.select().from(falsePatternClasses),
      "NegativeKnowledge:loadCache"
    );
    
    if (result) {
      for (const row of result) {
        this.cache.set(row.className, row);
      }
      this.cacheLoaded = true;
      console.log(`[NegativeKnowledge] Loaded ${this.cache.size} pattern classes from database`);
    }
  }
  
  /**
   * Record a false positive pattern after testing fails
   * @param phrase - The phrase that was tested and yielded no balance
   * @param phiAtFailure - The Φ score when the failure was detected
   */
  async recordFalsePositive(phrase: string, phiAtFailure: number = 0): Promise<void> {
    if (!db) return;
    
    await this.ensureCacheLoaded();
    
    const category = classifyPattern(phrase);
    const className = buildClassName(phrase, category);
    const classId = generateClassId(className);
    
    // Check if class already exists
    const existing = this.cache.get(className);
    
    if (existing) {
      // Update existing class
      const newCount = (existing.count || 0) + 1;
      const newAvgPhi = ((existing.avgPhiAtFailure || 0) * (existing.count || 0) + phiAtFailure) / newCount;
      
      await withDbRetry(
        async () => {
          await db!.update(falsePatternClasses)
            .set({
              count: newCount,
              avgPhiAtFailure: newAvgPhi,
              lastUpdated: new Date(),
              examples: sql`array_append(
                CASE 
                  WHEN array_length(${falsePatternClasses.examples}, 1) >= 10 
                  THEN ${falsePatternClasses.examples}[2:10]
                  ELSE ${falsePatternClasses.examples}
                END, 
                ${phrase}
              )`,
            })
            .where(eq(falsePatternClasses.id, existing.id));
        },
        `NegativeKnowledge:updateClass:${className}`
      );
      
      // Update cache
      this.cache.set(className, {
        ...existing,
        count: newCount,
        avgPhiAtFailure: newAvgPhi,
        lastUpdated: new Date(),
      });
    } else {
      // Insert new class
      const newClass: typeof falsePatternClasses.$inferInsert = {
        id: classId,
        className,
        examples: [phrase],
        count: 1,
        avgPhiAtFailure: phiAtFailure,
        lastUpdated: new Date(),
      };
      
      await withDbRetry(
        async () => {
          await db!.insert(falsePatternClasses)
            .values(newClass)
            .onConflictDoUpdate({
              target: falsePatternClasses.id,
              set: {
                count: sql`${falsePatternClasses.count} + 1`,
                avgPhiAtFailure: sql`(${falsePatternClasses.avgPhiAtFailure} * ${falsePatternClasses.count} + ${phiAtFailure}) / (${falsePatternClasses.count} + 1)`,
                lastUpdated: new Date(),
              },
            });
        },
        `NegativeKnowledge:insertClass:${className}`
      );
      
      // Update cache
      this.cache.set(className, {
        id: classId,
        className,
        examples: [phrase],
        count: 1,
        avgPhiAtFailure: phiAtFailure,
        lastUpdated: new Date(),
      });
    }
  }
  
  /**
   * Check if a pattern matches known false classes before testing
   * @param phrase - The phrase to check
   * @param threshold - Minimum fail count to consider skipping (default: 5)
   * @returns Classification result with recommendation
   */
  async checkPattern(phrase: string, threshold: number = 5): Promise<ClassificationResult> {
    await this.ensureCacheLoaded();
    
    const category = classifyPattern(phrase);
    const className = buildClassName(phrase, category);
    
    const cached = this.cache.get(className);
    
    if (cached && (cached.count || 0) >= threshold) {
      return {
        category,
        confidence: Math.min(0.95, 0.5 + ((cached.count || 0) / 100)),
        matchedClass: className,
        shouldSkip: true,
      };
    }
    
    // Even without a match, some categories are inherently low-value
    const inherentlyLowValue: PatternCategory[] = [
      "keyboard_pattern",
      "sequential",
      "common_phrase",
    ];
    
    if (inherentlyLowValue.includes(category)) {
      return {
        category,
        confidence: 0.7,
        matchedClass: null,
        shouldSkip: false, // Still test but flag as low value
      };
    }
    
    return {
      category,
      confidence: 0.5,
      matchedClass: cached?.className || null,
      shouldSkip: false,
    };
  }
  
  /**
   * Get statistics on false patterns
   */
  async getStatistics(): Promise<FalsePatternStats> {
    await this.ensureCacheLoaded();
    
    if (!db) {
      return {
        totalClasses: 0,
        totalFailures: 0,
        topCategories: [],
        recentPatterns: [],
      };
    }
    
    // Calculate from cache for fast access
    const classes = Array.from(this.cache.values());
    const totalClasses = classes.length;
    const totalFailures = classes.reduce((sum, c) => sum + (c.count || 0), 0);
    
    // Group by category prefix
    const categoryMap = new Map<string, { count: number; totalPhi: number }>();
    for (const cls of classes) {
      const category = cls.className.split(":")[0] || "unknown";
      const existing = categoryMap.get(category) || { count: 0, totalPhi: 0 };
      categoryMap.set(category, {
        count: existing.count + (cls.count || 0),
        totalPhi: existing.totalPhi + ((cls.avgPhiAtFailure || 0) * (cls.count || 0)),
      });
    }
    
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgPhi: data.count > 0 ? data.totalPhi / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Get recent patterns from database for accurate lastUpdated
    const recentResult = await withDbRetry(
      async () => db!.select()
        .from(falsePatternClasses)
        .orderBy(desc(falsePatternClasses.lastUpdated))
        .limit(10),
      "NegativeKnowledge:getRecentPatterns"
    );
    
    const recentPatterns = (recentResult || []).map(p => ({
      className: p.className,
      count: p.count || 0,
      lastUpdated: p.lastUpdated.toISOString(),
    }));
    
    return {
      totalClasses,
      totalFailures,
      topCategories,
      recentPatterns,
    };
  }
  
  /**
   * Get all false pattern classes (for admin/debugging)
   */
  async getAllClasses(): Promise<FalsePatternClass[]> {
    await this.ensureCacheLoaded();
    return Array.from(this.cache.values());
  }
  
  /**
   * Clear the cache (useful for testing or after bulk updates)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheLoaded = false;
  }
}

// Export singleton instance
export const negativeKnowledgeService = new NegativeKnowledgeService();

// Export functions for direct use
export async function recordFalsePositive(phrase: string, phiAtFailure?: number): Promise<void> {
  return negativeKnowledgeService.recordFalsePositive(phrase, phiAtFailure);
}

export async function checkPattern(phrase: string, threshold?: number): Promise<ClassificationResult> {
  return negativeKnowledgeService.checkPattern(phrase, threshold);
}

export async function getFalsePatternStats(): Promise<FalsePatternStats> {
  return negativeKnowledgeService.getStatistics();
}

export { type FalsePatternClass };
