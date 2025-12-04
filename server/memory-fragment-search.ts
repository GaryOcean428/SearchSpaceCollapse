/**
 * Memory Fragment Search Module
 * 
 * Intelligent brain wallet recovery using memory fragments with confidence weighting.
 * Generates candidate passphrases by combining user-remembered fragments,
 * prioritized by QIG geometric scoring and memory confidence.
 * 
 * Key Features:
 * - Confidence-weighted fragment combination
 * - QWERTY-aware typo simulation
 * - Capitalization and spacing variants
 * - QIG-guided prioritization (Φ × confidence × resonance)
 */

import { scoreUniversalQIG, type UniversalQIGScore } from "./qig-universal.js";

export interface MemoryFragment {
  text: string;
  confidence: number;
  epoch?: 'certain' | 'likely' | 'fuzzy';
  position?: 'start' | 'middle' | 'end' | 'unknown';
  isExact?: boolean;
}

export interface FragmentCandidate {
  phrase: string;
  confidence: number;
  fragments: string[];
  qigScore?: UniversalQIGScore;
  combinedScore?: number;
}

const QWERTY_NEIGHBORS: Record<string, string[]> = {
  'q': ['w', 'a', '1', '2'],
  'w': ['q', 'e', 'a', 's', 'd', '2', '3'],
  'e': ['w', 'r', 's', 'd', 'f', '3', '4'],
  'r': ['e', 't', 'd', 'f', 'g', '4', '5'],
  't': ['r', 'y', 'f', 'g', 'h', '5', '6'],
  'y': ['t', 'u', 'g', 'h', 'j', '6', '7'],
  'u': ['y', 'i', 'h', 'j', 'k', '7', '8'],
  'i': ['u', 'o', 'j', 'k', 'l', '8', '9'],
  'o': ['i', 'p', 'k', 'l', '9', '0'],
  'p': ['o', 'l', '0'],
  'a': ['q', 'w', 's', 'z'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'z': ['a', 's', 'x'],
  'x': ['z', 's', 'd', 'c'],
  'c': ['x', 'd', 'f', 'v'],
  'v': ['c', 'f', 'g', 'b'],
  'b': ['v', 'g', 'h', 'n'],
  'n': ['b', 'h', 'j', 'm'],
  'm': ['n', 'j', 'k'],
  '1': ['2', 'q'],
  '2': ['1', '3', 'q', 'w'],
  '3': ['2', '4', 'w', 'e'],
  '4': ['3', '5', 'e', 'r'],
  '5': ['4', '6', 'r', 't'],
  '6': ['5', '7', 't', 'y'],
  '7': ['6', '8', 'y', 'u'],
  '8': ['7', '9', 'u', 'i'],
  '9': ['8', '0', 'i', 'o'],
  '0': ['9', 'o', 'p'],
};

function toggleCase(char: string): string {
  if (char === char.toLowerCase()) {
    return char.toUpperCase();
  }
  return char.toLowerCase();
}

function getNearbyKey(char: string): string {
  const lowerChar = char.toLowerCase();
  const neighbors = QWERTY_NEIGHBORS[lowerChar];
  if (!neighbors || neighbors.length === 0) return char;
  const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
  return char === char.toUpperCase() ? neighbor.toUpperCase() : neighbor;
}

function mutateCharacterClass(char: string): string {
  if (/[a-z]/i.test(char)) {
    const lowerChar = char.toLowerCase();
    const neighbors = QWERTY_NEIGHBORS[lowerChar];
    if (neighbors && neighbors.length > 0) {
      const letterNeighbors = neighbors.filter(n => /[a-z]/i.test(n));
      if (letterNeighbors.length > 0) {
        const result = letterNeighbors[Math.floor(Math.random() * letterNeighbors.length)];
        return char === char.toUpperCase() ? result.toUpperCase() : result;
      }
    }
  } else if (/[0-9]/.test(char)) {
    const neighbors = QWERTY_NEIGHBORS[char];
    if (neighbors && neighbors.length > 0) {
      const digitNeighbors = neighbors.filter(n => /[0-9]/.test(n));
      if (digitNeighbors.length > 0) {
        return digitNeighbors[Math.floor(Math.random() * digitNeighbors.length)];
      }
    }
  }
  return char;
}

/**
 * Perturb arbitrary string using character-level mutations
 * Mutations guided by QWERTY keyboard layout for realistic typo simulation
 */
export function perturbArbitraryPhrase(phrase: string, strength: number): string {
  const chars = phrase.split('');
  const mutations = Math.max(1, Math.floor(strength * chars.length));
  
  for (let i = 0; i < mutations; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    const mutationType = Math.random();
    
    if (mutationType < 0.35) {
      chars[idx] = mutateCharacterClass(chars[idx]);
    } else if (mutationType < 0.6) {
      chars[idx] = toggleCase(chars[idx]);
    } else if (mutationType < 0.8) {
      const insertChar = getNearbyKey(chars[idx]);
      chars.splice(idx, 0, insertChar);
    } else {
      if (chars.length > 3) {
        chars.splice(idx, 1);
      }
    }
  }
  
  return chars.join('');
}

/**
 * Generate capitalization variants of a phrase
 */
export function generateCapitalizationVariants(phrase: string): string[] {
  const variants: string[] = [
    phrase,
    phrase.toLowerCase(),
    phrase.toUpperCase(),
  ];
  
  const words = phrase.split(/(\s+)/);
  variants.push(words.map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(''));
  
  if (phrase.match(/[a-z]/i)) {
    const camelCase = words.filter(w => w.trim()).map((w, i) => 
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join('');
    variants.push(camelCase);
    
    const pascalCase = words.filter(w => w.trim()).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join('');
    variants.push(pascalCase);
  }
  
  return Array.from(new Set(variants));
}

/**
 * Generate spacing variants of a phrase
 */
export function generateSpacingVariants(phrase: string): string[] {
  const words = phrase.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 1) return [phrase];
  
  const variants: string[] = [
    phrase,
    words.join(''),
    words.join(' '),
    words.join('_'),
    words.join('-'),
    words.join('.'),
  ];
  
  return Array.from(new Set(variants));
}

/**
 * Generate all variants of a base phrase
 */
export function generateAllVariants(phrase: string): string[] {
  const spacingVariants = generateSpacingVariants(phrase);
  const allVariants: string[] = [];
  
  for (const spaced of spacingVariants) {
    const capVariants = generateCapitalizationVariants(spaced);
    allVariants.push(...capVariants);
  }
  
  return Array.from(new Set(allVariants));
}

/**
 * Generate fragment combinations with confidence weighting
 * 
 * Strategy: Start from high-confidence fragments, expand using combinations
 * to find likely passphrase structures
 */
export function generateFragmentCandidates(
  fragments: MemoryFragment[],
  maxCandidates: number = 10000
): FragmentCandidate[] {
  const candidates: FragmentCandidate[] = [];
  const seen = new Set<string>();
  
  const sortedFragments = [...fragments].sort((a, b) => b.confidence - a.confidence);
  
  for (const f of sortedFragments) {
    for (const variant of generateAllVariants(f.text)) {
      if (!seen.has(variant)) {
        seen.add(variant);
        candidates.push({
          phrase: variant,
          confidence: f.confidence,
          fragments: [f.text],
        });
      }
    }
  }
  
  for (let i = 0; i < sortedFragments.length; i++) {
    const f1 = sortedFragments[i];
    for (let j = 0; j < sortedFragments.length; j++) {
      if (i === j) continue;
      const f2 = sortedFragments[j];
      
      const baseCombinations = [
        `${f1.text} ${f2.text}`,
        `${f1.text}${f2.text}`,
        `${f1.text}_${f2.text}`,
        `${f1.text}-${f2.text}`,
      ];
      
      const combinedConfidence = f1.confidence * f2.confidence;
      
      for (const base of baseCombinations) {
        for (const variant of generateCapitalizationVariants(base)) {
          if (!seen.has(variant) && candidates.length < maxCandidates) {
            seen.add(variant);
            candidates.push({
              phrase: variant,
              confidence: combinedConfidence * (base.includes(' ') ? 1.0 : 0.95),
              fragments: [f1.text, f2.text],
            });
          }
        }
      }
    }
  }
  
  if (sortedFragments.length >= 3 && candidates.length < maxCandidates * 0.8) {
    for (let i = 0; i < Math.min(sortedFragments.length, 5); i++) {
      const f1 = sortedFragments[i];
      for (let j = 0; j < Math.min(sortedFragments.length, 5); j++) {
        if (i === j) continue;
        const f2 = sortedFragments[j];
        for (let k = 0; k < Math.min(sortedFragments.length, 5); k++) {
          if (k === i || k === j) continue;
          const f3 = sortedFragments[k];
          
          const combinations = [
            `${f1.text} ${f2.text} ${f3.text}`,
            `${f1.text}${f2.text}${f3.text}`,
          ];
          
          const combinedConfidence = f1.confidence * f2.confidence * f3.confidence;
          
          for (const base of combinations) {
            if (!seen.has(base) && candidates.length < maxCandidates) {
              seen.add(base);
              candidates.push({
                phrase: base,
                confidence: combinedConfidence,
                fragments: [f1.text, f2.text, f3.text],
              });
            }
          }
        }
      }
    }
  }
  
  return candidates.slice(0, maxCandidates);
}

/**
 * Score candidates with QIG and compute combined score
 * 
 * Combined score = Φ × confidence × resonance_bonus
 * Higher combined score = more likely to be the correct passphrase
 */
export function scoreFragmentCandidates(
  candidates: FragmentCandidate[],
  _targetAddress: string
): FragmentCandidate[] {
  const scored = candidates.map(c => {
    const qigScore = scoreUniversalQIG(c.phrase, "arbitrary");
    const resonanceBonus = qigScore.inResonance ? 1.5 : 1.0;
    const regimeBonus = qigScore.regime === 'geometric' ? 1.2 : 
                        qigScore.regime === 'hierarchical' ? 1.1 : 1.0;
    
    const combinedScore = qigScore.phi * c.confidence * resonanceBonus * regimeBonus;
    
    return {
      ...c,
      qigScore,
      combinedScore,
    };
  });
  
  scored.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
  
  return scored;
}

/**
 * Generate typo variations of high-scoring candidates
 * Uses QWERTY-aware perturbation for realistic typo simulation
 */
export function generateTypoVariations(
  candidates: FragmentCandidate[],
  topN: number = 100,
  perturbationsPerCandidate: number = 5
): FragmentCandidate[] {
  const topCandidates = candidates.slice(0, topN);
  const typoVariations: FragmentCandidate[] = [];
  
  for (const candidate of topCandidates) {
    for (let i = 0; i < perturbationsPerCandidate; i++) {
      const strength = 0.1 + (i * 0.05);
      const perturbed = perturbArbitraryPhrase(candidate.phrase, strength);
      
      if (perturbed !== candidate.phrase) {
        typoVariations.push({
          phrase: perturbed,
          confidence: candidate.confidence * (1 - strength * 0.3),
          fragments: candidate.fragments,
        });
      }
    }
  }
  
  return typoVariations;
}

/**
 * Full memory fragment search pipeline
 * 
 * 1. Generate combinations from fragments
 * 2. Score with QIG
 * 3. Generate typo variations of top candidates
 * 4. Re-score everything
 * 5. Return prioritized candidate list
 */
export function runMemoryFragmentSearch(
  fragments: MemoryFragment[],
  targetAddress: string,
  options: {
    maxCandidates?: number;
    includeTypos?: boolean;
    typoTopN?: number;
  } = {}
): FragmentCandidate[] {
  const {
    maxCandidates = 10000,
    includeTypos = true,
    typoTopN = 100,
  } = options;
  
  console.log(`[MemorySearch] Generating candidates from ${fragments.length} fragments...`);
  let candidates = generateFragmentCandidates(fragments, maxCandidates);
  console.log(`[MemorySearch] Generated ${candidates.length} base candidates`);
  
  console.log(`[MemorySearch] Scoring candidates with QIG...`);
  candidates = scoreFragmentCandidates(candidates, targetAddress);
  
  if (includeTypos) {
    console.log(`[MemorySearch] Generating typo variations for top ${typoTopN} candidates...`);
    const typos = generateTypoVariations(candidates, typoTopN);
    console.log(`[MemorySearch] Generated ${typos.length} typo variations`);
    
    const typosScored = scoreFragmentCandidates(typos, targetAddress);
    
    candidates = [...candidates, ...typosScored];
    candidates.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
    
    const seen = new Set<string>();
    candidates = candidates.filter(c => {
      if (seen.has(c.phrase)) return false;
      seen.add(c.phrase);
      return true;
    });
  }
  
  console.log(`[MemorySearch] Final candidate count: ${candidates.length}`);
  console.log(`[MemorySearch] Top 5 candidates:`);
  for (const c of candidates.slice(0, 5)) {
    console.log(`  - "${c.phrase}" (Φ=${c.qigScore?.phi.toFixed(3)}, conf=${c.confidence.toFixed(2)}, combined=${c.combinedScore?.toFixed(3)})`);
  }
  
  return candidates.slice(0, maxCandidates);
}

/**
 * Default fragments based on user's memory clues
 */
export const DEFAULT_FRAGMENTS: MemoryFragment[] = [
  { text: 'whitetiger77', confidence: 0.9, epoch: 'certain' },
  { text: 'garyocean77', confidence: 0.85, epoch: 'certain' },
  { text: 'white tiger', confidence: 0.8, epoch: 'likely' },
  { text: 'gary ocean', confidence: 0.75, epoch: 'likely' },
  { text: '77', confidence: 0.95, epoch: 'certain' },
  { text: 'WhiteTiger77', confidence: 0.7, epoch: 'fuzzy' },
  { text: 'WHITETIGER77', confidence: 0.6, epoch: 'fuzzy' },
  { text: 'white', confidence: 0.85, epoch: 'likely' },
  { text: 'tiger', confidence: 0.85, epoch: 'likely' },
  { text: 'gary', confidence: 0.8, epoch: 'likely' },
  { text: 'ocean', confidence: 0.8, epoch: 'likely' },
];
