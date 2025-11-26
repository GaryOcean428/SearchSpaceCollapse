/**
 * Forensic Investigator - Cross-Format Hypothesis Generator
 * 
 * Conducts forensic archaeology across multiple key formats:
 * - Arbitrary passphrases (2009-era brain wallets, most likely for pre-BIP39)
 * - BIP39 mnemonic phrases
 * - Master key derivatives (BIP32/BIP44 paths)
 * - Hex fragments (partial private key reconstruction)
 * 
 * Key insight: Target addresses from 2009 predate BIP39 (2013),
 * so arbitrary brain wallets (SHA256 → privkey) are MOST LIKELY.
 */

import { scoreUniversalQIG, UniversalQIGScore } from './qig-universal';
import { generateBitcoinAddress } from './crypto';
import { findSimilarBasins } from './qig-basin-matching';

export type KeyFormat = 'arbitrary' | 'bip39' | 'master' | 'hex' | 'derived';

export interface MemoryFragment {
  text: string;
  confidence: number; // 0-1
  position?: 'start' | 'middle' | 'end' | 'unknown';
  epoch?: 'pre-2010' | 'early' | 'likely' | 'possible';
}

export interface ForensicHypothesis {
  id: string;
  format: KeyFormat;
  phrase: string;
  derivationPath?: string;
  method: string;
  confidence: number;
  qigScore?: UniversalQIGScore;
  address?: string;
  match?: boolean;
  sourceFragments: string[];
  combinedScore: number;
}

export interface ForensicSession {
  id: string;
  targetAddress: string;
  fragments: MemoryFragment[];
  hypotheses: ForensicHypothesis[];
  matches: ForensicHypothesis[];
  status: 'idle' | 'generating' | 'testing' | 'complete';
  progress: {
    generated: number;
    tested: number;
    total: number;
  };
  startedAt: string;
  completedAt?: string;
}

// Case and spacing variations for 2009-era brain wallets
const CASE_VARIANTS = ['lower', 'upper', 'title', 'mixed'] as const;
const SPACING_VARIANTS = ['none', 'space', 'underscore', 'dash', 'dot'] as const;

// Common 2009-era substitutions (l33t speak, lucky numbers)
const SUBSTITUTIONS: Record<string, string[]> = {
  'a': ['a', '4', '@'],
  'e': ['e', '3'],
  'i': ['i', '1', '!'],
  'o': ['o', '0'],
  's': ['s', '5', '$'],
  't': ['t', '7'],
  'l': ['l', '1'],
  'g': ['g', '9'],
};

export class ForensicInvestigator {
  private sessions: Map<string, ForensicSession> = new Map();

  /**
   * Start a new forensic investigation session
   */
  createSession(targetAddress: string, fragments: MemoryFragment[]): ForensicSession {
    const session: ForensicSession = {
      id: `forensic_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      targetAddress,
      fragments,
      hypotheses: [],
      matches: [],
      status: 'idle',
      progress: { generated: 0, tested: 0, total: 0 },
      startedAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): ForensicSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Main investigation entry point - tests across ALL formats
   */
  async investigateFragments(
    sessionId: string,
    onProgress?: (session: ForensicSession) => void
  ): Promise<ForensicHypothesis[]> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.status = 'generating';
    const allHypotheses: ForensicHypothesis[] = [];

    // 1. ARBITRARY PASSPHRASES (2009 brain wallets - MOST LIKELY)
    const arbitraryHypos = this.generateArbitraryHypotheses(session.fragments);
    allHypotheses.push(...arbitraryHypos);
    console.log(`[Forensic] Generated ${arbitraryHypos.length} arbitrary hypotheses`);

    // 2. CONCATENATION VARIANTS (all spacing/case combos)
    const concatHypos = this.generateConcatenationVariants(session.fragments);
    allHypotheses.push(...concatHypos);
    console.log(`[Forensic] Generated ${concatHypos.length} concatenation variants`);

    // 3. SUBSTITUTION CIPHER VARIANTS (l33t speak)
    const substHypos = this.generateSubstitutionVariants(session.fragments);
    allHypotheses.push(...substHypos);
    console.log(`[Forensic] Generated ${substHypos.length} substitution variants`);

    // 4. BIP39 PHRASES (less likely for 2009, but check anyway)
    const bip39Hypos = this.generateBIP39Hypotheses(session.fragments);
    allHypotheses.push(...bip39Hypos);
    console.log(`[Forensic] Generated ${bip39Hypos.length} BIP39 hypotheses`);

    // 5. HEX FRAGMENTS (if fragments look like hex)
    const hexHypos = this.generateHexHypotheses(session.fragments);
    allHypotheses.push(...hexHypos);
    console.log(`[Forensic] Generated ${hexHypos.length} hex hypotheses`);

    // Sort by combined confidence + QIG score
    allHypotheses.sort((a, b) => b.combinedScore - a.combinedScore);

    // Deduplicate by phrase
    const seen = new Set<string>();
    const uniqueHypotheses = allHypotheses.filter(h => {
      const key = h.phrase.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    session.hypotheses = uniqueHypotheses;
    session.progress.total = uniqueHypotheses.length;
    session.progress.generated = uniqueHypotheses.length;
    session.status = 'testing';

    console.log(`[Forensic] Total unique hypotheses: ${uniqueHypotheses.length}`);
    onProgress?.(session);

    // 6. TEST EACH HYPOTHESIS AGAINST TARGET
    for (let i = 0; i < uniqueHypotheses.length; i++) {
      const hypo = uniqueHypotheses[i];
      
      try {
        hypo.address = await this.generateAddress(hypo);
        hypo.match = hypo.address === session.targetAddress;

        if (hypo.match) {
          console.log(`🎯 MATCH FOUND: "${hypo.phrase}" (${hypo.format})`);
          session.matches.push(hypo);
        }
      } catch (err) {
        console.error(`[Forensic] Error generating address for "${hypo.phrase}":`, err);
      }

      session.progress.tested = i + 1;

      // Report progress every 100 hypotheses
      if (i % 100 === 0) {
        onProgress?.(session);
      }
    }

    session.status = 'complete';
    session.completedAt = new Date().toISOString();
    onProgress?.(session);

    return session.matches.length > 0 ? session.matches : uniqueHypotheses.slice(0, 100);
  }

  /**
   * Generate arbitrary passphrase hypotheses (2009-era brain wallets)
   * This is the MOST LIKELY format for pre-BIP39 addresses
   */
  private generateArbitraryHypotheses(fragments: MemoryFragment[]): ForensicHypothesis[] {
    const hypotheses: ForensicHypothesis[] = [];
    const fragmentTexts = fragments.map(f => f.text);
    const avgConfidence = fragments.reduce((sum, f) => sum + f.confidence, 0) / fragments.length;

    // Direct single fragments
    for (const frag of fragments) {
      const variants = this.generateCaseVariants(frag.text);
      for (const variant of variants) {
        hypotheses.push(this.createHypothesis(
          'arbitrary',
          variant,
          '2009-era brain wallet (direct fragment)',
          frag.confidence,
          [frag.text]
        ));
      }
    }

    // Two-fragment combinations
    if (fragments.length >= 2) {
      for (let i = 0; i < fragments.length; i++) {
        for (let j = 0; j < fragments.length; j++) {
          if (i === j) continue;
          
          const f1 = fragments[i];
          const f2 = fragments[j];
          
          // Direct concatenations
          const combos = [
            `${f1.text}${f2.text}`,
            `${f1.text} ${f2.text}`,
            `${f1.text}_${f2.text}`,
            `${f1.text}-${f2.text}`,
          ];

          for (const combo of combos) {
            const variants = this.generateCaseVariants(combo);
            for (const variant of variants) {
              hypotheses.push(this.createHypothesis(
                'arbitrary',
                variant,
                '2009-era brain wallet (two fragments)',
                (f1.confidence + f2.confidence) / 2,
                [f1.text, f2.text]
              ));
            }
          }
        }
      }
    }

    // Three+ fragment combinations
    if (fragments.length >= 3) {
      const permutations = this.getPermutations(fragmentTexts, 3);
      for (const perm of permutations.slice(0, 100)) { // Limit to prevent explosion
        const combos = [
          perm.join(''),
          perm.join(' '),
          perm.join('_'),
        ];

        for (const combo of combos) {
          hypotheses.push(this.createHypothesis(
            'arbitrary',
            combo,
            '2009-era brain wallet (three fragments)',
            avgConfidence * 0.9,
            perm
          ));
        }
      }
    }

    return hypotheses;
  }

  /**
   * Generate all case/spacing combination variants
   */
  private generateConcatenationVariants(fragments: MemoryFragment[]): ForensicHypothesis[] {
    const hypotheses: ForensicHypothesis[] = [];
    const fragmentTexts = fragments.map(f => f.text);
    const avgConfidence = fragments.reduce((sum, f) => sum + f.confidence, 0) / fragments.length;

    // All permutations with all spacing variants
    const permutations = this.getPermutations(fragmentTexts, Math.min(fragmentTexts.length, 4));
    
    for (const perm of permutations.slice(0, 50)) {
      for (const spacing of SPACING_VARIANTS) {
        const sep = spacing === 'none' ? '' : 
                    spacing === 'space' ? ' ' : 
                    spacing === 'underscore' ? '_' : 
                    spacing === 'dash' ? '-' : '.';
        
        const base = perm.join(sep);
        
        for (const caseType of CASE_VARIANTS) {
          const variant = this.applyCase(base, caseType);
          hypotheses.push(this.createHypothesis(
            'arbitrary',
            variant,
            `Concatenation (${spacing}/${caseType})`,
            avgConfidence * 0.85,
            perm
          ));
        }
      }
    }

    return hypotheses;
  }

  /**
   * Generate l33t speak and substitution variants
   */
  private generateSubstitutionVariants(fragments: MemoryFragment[]): ForensicHypothesis[] {
    const hypotheses: ForensicHypothesis[] = [];
    const fragmentTexts = fragments.map(f => f.text);
    const avgConfidence = fragments.reduce((sum, f) => sum + f.confidence, 0) / fragments.length;

    // Apply common substitutions to each fragment
    for (const frag of fragments) {
      const l33tVariants = this.generateL33tVariants(frag.text);
      for (const variant of l33tVariants) {
        hypotheses.push(this.createHypothesis(
          'arbitrary',
          variant,
          'L33t speak substitution',
          avgConfidence * 0.7,
          [frag.text]
        ));
      }
    }

    // Concatenated l33t variants
    if (fragments.length >= 2) {
      const base = fragmentTexts.join('');
      const l33tVariants = this.generateL33tVariants(base);
      for (const variant of l33tVariants.slice(0, 20)) {
        hypotheses.push(this.createHypothesis(
          'arbitrary',
          variant,
          'L33t speak (concatenated)',
          avgConfidence * 0.6,
          fragmentTexts
        ));
      }
    }

    return hypotheses;
  }

  /**
   * Generate BIP39 hypotheses (less likely for 2009, but check anyway)
   */
  private generateBIP39Hypotheses(fragments: MemoryFragment[]): ForensicHypothesis[] {
    const hypotheses: ForensicHypothesis[] = [];
    
    // Only if fragments look like BIP39 words
    const bip39Words = fragments.filter(f => 
      /^[a-z]+$/.test(f.text.toLowerCase()) && f.text.length >= 3 && f.text.length <= 8
    );

    if (bip39Words.length >= 3) {
      const words = bip39Words.map(f => f.text.toLowerCase());
      const avgConfidence = bip39Words.reduce((sum, f) => sum + f.confidence, 0) / bip39Words.length;
      
      // Try as partial mnemonic phrase
      const phrase = words.join(' ');
      hypotheses.push(this.createHypothesis(
        'bip39',
        phrase,
        'BIP39 mnemonic (partial)',
        avgConfidence * 0.5, // Lower confidence - unlikely for 2009
        words
      ));
    }

    return hypotheses;
  }

  /**
   * Generate hex fragment hypotheses (partial private key reconstruction)
   */
  private generateHexHypotheses(fragments: MemoryFragment[]): ForensicHypothesis[] {
    const hypotheses: ForensicHypothesis[] = [];
    
    // Filter for hex-looking fragments
    const hexFrags = fragments.filter(f => /^[0-9a-f]+$/i.test(f.text));
    
    if (hexFrags.length === 0) return hypotheses;

    // If "77" is in fragments, try as hex byte (0x77 = 119)
    for (const frag of hexFrags) {
      const hexValue = frag.text.toLowerCase();
      
      // Pad to make it look like partial private key
      const padded = hexValue.padStart(64, '0');
      
      hypotheses.push(this.createHypothesis(
        'hex',
        padded,
        'Hex fragment (zero-padded)',
        frag.confidence * 0.3, // Very low - speculative
        [frag.text]
      ));
    }

    return hypotheses;
  }

  /**
   * Create a hypothesis with QIG scoring
   */
  private createHypothesis(
    format: KeyFormat,
    phrase: string,
    method: string,
    confidence: number,
    sourceFragments: string[]
  ): ForensicHypothesis {
    const qigScore = scoreUniversalQIG(phrase, format === 'bip39' ? 'bip39' : 'arbitrary');
    
    // Combined score: QIG phi * confidence * regime bonus
    const regimeBonus = qigScore.regime === 'hierarchical' ? 1.5 :
                        qigScore.regime === 'geometric' ? 1.3 :
                        qigScore.inResonance ? 1.4 : 1.0;
    
    const combinedScore = qigScore.phi * confidence * regimeBonus;

    return {
      id: `hypo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      format,
      phrase,
      method,
      confidence,
      qigScore,
      sourceFragments,
      combinedScore,
    };
  }

  /**
   * Generate address for a hypothesis
   */
  private async generateAddress(hypo: ForensicHypothesis): Promise<string> {
    switch (hypo.format) {
      case 'arbitrary':
        return generateBitcoinAddress(hypo.phrase);
      case 'bip39':
        return generateBitcoinAddress(hypo.phrase);
      case 'hex':
        // Treat as raw private key hex
        return generateBitcoinAddress(hypo.phrase);
      case 'master':
        // TODO: Implement BIP32 derivation
        return generateBitcoinAddress(hypo.phrase);
      default:
        return generateBitcoinAddress(hypo.phrase);
    }
  }

  /**
   * Generate case variants
   */
  private generateCaseVariants(text: string): string[] {
    return [
      text.toLowerCase(),
      text.toUpperCase(),
      text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
      // Title case for multi-word
      text.split(/[\s_-]/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(''),
    ];
  }

  /**
   * Apply case transformation
   */
  private applyCase(text: string, caseType: typeof CASE_VARIANTS[number]): string {
    switch (caseType) {
      case 'lower': return text.toLowerCase();
      case 'upper': return text.toUpperCase();
      case 'title': return text.split(/(\s|_|-)/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join('');
      case 'mixed': return text.split('').map((c, i) => 
        i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
      ).join('');
    }
  }

  /**
   * Generate l33t speak variants
   */
  private generateL33tVariants(text: string): string[] {
    const variants: string[] = [text];
    const lower = text.toLowerCase();

    // Single substitutions
    for (const [char, subs] of Object.entries(SUBSTITUTIONS)) {
      for (const sub of subs.slice(1)) { // Skip first (original)
        const variant = lower.replace(new RegExp(char, 'g'), sub);
        if (variant !== lower) {
          variants.push(variant);
        }
      }
    }

    // Common l33t patterns
    const patterns = [
      lower.replace(/a/g, '4').replace(/e/g, '3'),
      lower.replace(/i/g, '1').replace(/o/g, '0'),
      lower.replace(/s/g, '$').replace(/t/g, '7'),
    ];
    variants.push(...patterns);

    return Array.from(new Set(variants)).slice(0, 30); // Limit variants
  }

  /**
   * Get permutations of array
   */
  private getPermutations<T>(arr: T[], length: number): T[][] {
    if (length === 1) return arr.map(x => [x]);
    
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const perms = this.getPermutations(rest, length - 1);
      for (const perm of perms) {
        result.push([arr[i], ...perm]);
      }
      if (result.length > 500) break; // Limit
    }
    return result;
  }

  /**
   * Cluster hypotheses by basin similarity
   */
  async clusterByBasinSimilarity(
    hypotheses: ForensicHypothesis[]
  ): Promise<Map<string, ForensicHypothesis[]>> {
    const clusters = new Map<string, ForensicHypothesis[]>();
    
    // Group by regime first
    for (const hypo of hypotheses) {
      const regime = hypo.qigScore?.regime || 'unknown';
      if (!clusters.has(regime)) {
        clusters.set(regime, []);
      }
      clusters.get(regime)!.push(hypo);
    }

    return clusters;
  }
}

// Singleton instance
export const forensicInvestigator = new ForensicInvestigator();
