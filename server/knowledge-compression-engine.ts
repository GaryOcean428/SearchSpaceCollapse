import { nanoid } from 'nanoid';
import { scoreUniversalQIG } from './qig-universal';
import type { 
  KnowledgeGenerator, 
  Contradiction, 
  NegativeKnowledgeRegistry,
  BasinTopology,
} from '@shared/schema';

export interface GeneratorOutput {
  hypothesis: string;
  format: 'arbitrary' | 'bip39' | 'master' | 'hex';
  generatorId: string;
  confidence: number;
  reasoning: string;
}

export class KnowledgeCompressionEngine {
  private generators: Map<string, KnowledgeGenerator> = new Map();
  private negativeKnowledge: NegativeKnowledgeRegistry;
  private basinLocation: number[] = new Array(64).fill(0);
  
  private readonly SUBSTITUTION_PATTERNS = {
    adjectives: ['red', 'blue', 'green', 'black', 'white', 'dark', 'light', 'old', 'new', 'big', 'small', 'happy', 'sad', 'fast', 'slow', 'hot', 'cold', 'wild', 'calm', 'rich', 'poor'],
    nouns: ['cat', 'dog', 'bird', 'fish', 'tree', 'moon', 'sun', 'star', 'key', 'door', 'book', 'coin', 'gold', 'silver', 'tiger', 'dragon', 'wolf', 'bear', 'lion', 'eagle'],
    verbs: ['run', 'jump', 'fly', 'swim', 'walk', 'dance', 'sing', 'fight', 'love', 'hate', 'find', 'lose', 'give', 'take', 'make', 'break', 'build', 'grow', 'fall', 'rise'],
    numbers: ['1', '2', '3', '7', '11', '13', '21', '42', '69', '77', '99', '100', '123', '007', '1337', '2009', '2010', '2011'],
    years: ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    symbols: ['!', '@', '#', '$', '%', '&', '*', '_', '-', '+', '='],
  };

  private readonly L33T_MAP: Record<string, string> = {
    'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7', 'l': '1', 'b': '8',
  };

  constructor() {
    this.negativeKnowledge = this.initializeNegativeKnowledge();
    this.loadBuiltInGenerators();
  }

  private initializeNegativeKnowledge(): NegativeKnowledgeRegistry {
    return {
      contradictions: [],
      falsePatternClasses: {},
      geometricBarriers: [],
      eraExclusions: {},
      totalExclusions: 0,
      estimatedComputeSaved: 0,
      lastPruned: new Date().toISOString(),
    };
  }

  private loadBuiltInGenerators(): void {
    const builtInGenerators: Partial<KnowledgeGenerator>[] = [
      {
        name: 'simple_brain_wallet',
        type: 'grammatical',
        template: '{word}',
        substitutionRules: {
          word: ['password', 'bitcoin', 'satoshi', 'nakamoto', 'blockchain', 'crypto', 'wallet', 'secret', 'private', 'key'],
        },
        transformations: [
          { name: 'lowercase', operation: 'lowercase' },
          { name: 'uppercase', operation: 'uppercase' },
        ],
        entropy: 10,
        expectedOutput: 20,
        source: 'historical',
        confidence: 0.8,
      },
      {
        name: 'adjective_noun_number',
        type: 'grammatical',
        template: '{adjective}{noun}{number}',
        substitutionRules: {
          adjective: this.SUBSTITUTION_PATTERNS.adjectives,
          noun: this.SUBSTITUTION_PATTERNS.nouns,
          number: this.SUBSTITUTION_PATTERNS.numbers,
        },
        transformations: [
          { name: 'lowercase', operation: 'lowercase' },
          { name: 'capitalize_first', operation: 'uppercase' },
          { name: 'l33t', operation: 'l33t' },
        ],
        entropy: 25,
        expectedOutput: 20 * 20 * 17 * 3,
        source: 'historical',
        confidence: 0.7,
      },
      {
        name: 'era_2009_patterns',
        type: 'temporal',
        template: '{prefix}{core}{suffix}',
        substitutionRules: {
          prefix: ['', 'my', 'the', 'a', 'btc', 'bitcoin', 'satoshi'],
          core: ['wallet', 'coin', 'money', 'gold', 'crypto', 'private', 'secret', 'key', 'password'],
          suffix: ['', '1', '2009', '2010', '!', '123', '007'],
        },
        transformations: [
          { name: 'lowercase', operation: 'lowercase' },
        ],
        entropy: 18,
        expectedOutput: 7 * 9 * 7,
        source: 'historical',
        confidence: 0.85,
      },
      {
        name: 'common_phrases',
        type: 'grammatical',
        template: '{phrase}',
        substitutionRules: {
          phrase: [
            'correct horse battery staple',
            'i love bitcoin',
            'satoshi nakamoto',
            'to the moon',
            'buy the dip',
            'hodl forever',
            'genesis block',
            'peer to peer',
            'digital gold',
            'store of value',
          ],
        },
        transformations: [
          { name: 'as_is', operation: 'lowercase' },
          { name: 'no_spaces', operation: 'lowercase' },
          { name: 'camel_case', operation: 'uppercase' },
        ],
        entropy: 12,
        expectedOutput: 30,
        source: 'historical',
        confidence: 0.6,
      },
      {
        name: 'cross_format_bip39_hints',
        type: 'cross_format',
        template: '{word1} {word2} {word3} {word4} {word5} {word6} {word7} {word8} {word9} {word10} {word11} {word12}',
        substitutionRules: {},
        transformations: [],
        entropy: 128,
        expectedOutput: 1,
        source: 'learned',
        confidence: 0.3,
      },
      {
        name: 'name_year_symbol',
        type: 'structural',
        template: '{name}{year}{symbol}',
        substitutionRules: {
          name: ['john', 'jane', 'mike', 'sarah', 'david', 'emily', 'james', 'anna', 'robert', 'mary', 'hal', 'finney', 'satoshi'],
          year: this.SUBSTITUTION_PATTERNS.years,
          symbol: this.SUBSTITUTION_PATTERNS.symbols,
        },
        transformations: [
          { name: 'as_is', operation: 'lowercase' },
          { name: 'capitalize', operation: 'uppercase' },
          { name: 'l33t', operation: 'l33t' },
        ],
        entropy: 22,
        expectedOutput: 13 * 17 * 11 * 3,
        source: 'historical',
        confidence: 0.75,
      },
    ];

    for (const partial of builtInGenerators) {
      const generator = this.createGenerator(partial);
      this.generators.set(generator.id, generator);
    }
    
    console.log(`[KnowledgeCompression] Loaded ${this.generators.size} built-in generators`);
  }

  private createGenerator(partial: Partial<KnowledgeGenerator>): KnowledgeGenerator {
    return {
      id: nanoid(),
      name: partial.name || 'unnamed',
      type: partial.type || 'grammatical',
      template: partial.template || '',
      substitutionRules: partial.substitutionRules || {},
      transformations: partial.transformations || [],
      basinLocation: partial.basinLocation || this.computeBasinLocation(partial.template || ''),
      curvatureSignature: partial.curvatureSignature || this.computeCurvatureSignature(partial),
      entropy: partial.entropy || 0,
      expectedOutput: partial.expectedOutput || 0,
      compressionRatio: partial.entropy ? partial.entropy / Math.log2(partial.expectedOutput || 1) : 1,
      source: partial.source || 'learned',
      confidence: partial.confidence || 0.5,
      createdAt: new Date().toISOString(),
      lastUsed: undefined,
      successCount: partial.successCount || 0,
    };
  }

  private computeBasinLocation(template: string): number[] {
    const location = new Array(64).fill(0);
    const templateHash = this.simpleHash(template);
    for (let i = 0; i < 64; i++) {
      location[i] = ((templateHash >> (i % 32)) & 1) * 0.1 + Math.random() * 0.05 - 0.025;
    }
    return location;
  }

  private computeCurvatureSignature(partial: Partial<KnowledgeGenerator>): number[] {
    const signature = new Array(8).fill(0);
    const complexity = Object.keys(partial.substitutionRules || {}).length;
    const transformCount = (partial.transformations || []).length;
    
    signature[0] = complexity / 10;
    signature[1] = transformCount / 5;
    signature[2] = (partial.entropy || 0) / 100;
    signature[3] = partial.confidence || 0.5;
    
    for (let i = 4; i < 8; i++) {
      signature[i] = Math.random() * 0.5;
    }
    
    return signature;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  generate(generatorId: string, count: number = 10): GeneratorOutput[] {
    const generator = this.generators.get(generatorId);
    if (!generator) {
      console.warn(`[KnowledgeCompression] Generator ${generatorId} not found`);
      return [];
    }

    generator.lastUsed = new Date().toISOString();
    const outputs: GeneratorOutput[] = [];
    const generated = new Set<string>();

    const maxAttempts = count * 10;
    let attempts = 0;

    while (outputs.length < count && attempts < maxAttempts) {
      attempts++;
      
      const hypothesis = this.generateFromTemplate(generator);
      
      if (generated.has(hypothesis)) continue;
      if (this.isExcludedByNegativeKnowledge(hypothesis, generator)) continue;
      
      generated.add(hypothesis);
      
      const format = this.detectFormat(hypothesis);
      
      outputs.push({
        hypothesis,
        format,
        generatorId: generator.id,
        confidence: generator.confidence,
        reasoning: `Generated by ${generator.name} (${generator.type})`,
      });
    }

    return outputs;
  }

  private generateFromTemplate(generator: KnowledgeGenerator): string {
    let result = generator.template;
    
    for (const [placeholder, values] of Object.entries(generator.substitutionRules)) {
      const pattern = new RegExp(`\\{${placeholder}\\}`, 'g');
      const replacement = values[Math.floor(Math.random() * values.length)];
      result = result.replace(pattern, replacement);
    }

    if (generator.transformations.length > 0) {
      const transform = generator.transformations[Math.floor(Math.random() * generator.transformations.length)];
      result = this.applyTransformation(result, transform);
    }

    return result;
  }

  private applyTransformation(text: string, transform: { name: string; operation: string; params?: Record<string, string> }): string {
    switch (transform.operation) {
      case 'lowercase':
        return text.toLowerCase();
      case 'uppercase':
        return text.charAt(0).toUpperCase() + text.slice(1);
      case 'l33t':
        return this.toL33t(text);
      case 'reverse':
        return text.split('').reverse().join('');
      case 'append':
        return text + (transform.params?.suffix || '');
      case 'prepend':
        return (transform.params?.prefix || '') + text;
      default:
        return text;
    }
  }

  private toL33t(text: string): string {
    return text.split('').map(c => {
      const lower = c.toLowerCase();
      return this.L33T_MAP[lower] || c;
    }).join('');
  }

  private detectFormat(hypothesis: string): 'arbitrary' | 'bip39' | 'master' | 'hex' {
    if (/^[0-9a-f]{64}$/i.test(hypothesis)) return 'hex';
    
    const words = hypothesis.trim().split(/\s+/);
    if (words.length === 12 || words.length === 24) {
      return 'bip39';
    }
    
    return 'arbitrary';
  }

  private isExcludedByNegativeKnowledge(hypothesis: string, generator: KnowledgeGenerator): boolean {
    for (const contradiction of this.negativeKnowledge.contradictions) {
      if (contradiction.affectedGenerators.includes(generator.id)) {
        if (hypothesis.toLowerCase().includes(contradiction.pattern.toLowerCase())) {
          return true;
        }
      }
    }

    for (const [patternClass, data] of Object.entries(this.negativeKnowledge.falsePatternClasses)) {
      if (data.examples.some(ex => hypothesis.toLowerCase().includes(ex.toLowerCase()))) {
        return true;
      }
    }

    return false;
  }

  generateAll(count: number = 100): GeneratorOutput[] {
    const allOutputs: GeneratorOutput[] = [];
    const generatorIds = Array.from(this.generators.keys());
    const perGenerator = Math.ceil(count / generatorIds.length);
    
    for (const id of generatorIds) {
      const outputs = this.generate(id, perGenerator);
      allOutputs.push(...outputs);
    }

    return allOutputs.slice(0, count);
  }

  addContradiction(contradiction: Omit<Contradiction, 'id' | 'createdAt' | 'confirmedCount'>): string {
    const id = nanoid();
    const fullContradiction: Contradiction = {
      ...contradiction,
      id,
      createdAt: new Date().toISOString(),
      confirmedCount: 1,
    };
    
    this.negativeKnowledge.contradictions.push(fullContradiction);
    this.negativeKnowledge.totalExclusions++;
    this.negativeKnowledge.estimatedComputeSaved += contradiction.hypothesesExcluded;
    
    console.log(`[KnowledgeCompression] Added contradiction: ${contradiction.pattern} (saves ~${contradiction.hypothesesExcluded} hypotheses)`);
    
    return id;
  }

  addFalsePatternClass(className: string, examples: string[]): void {
    if (this.negativeKnowledge.falsePatternClasses[className]) {
      this.negativeKnowledge.falsePatternClasses[className].examples.push(...examples);
      this.negativeKnowledge.falsePatternClasses[className].count += examples.length;
      this.negativeKnowledge.falsePatternClasses[className].lastUpdated = new Date().toISOString();
    } else {
      this.negativeKnowledge.falsePatternClasses[className] = {
        count: examples.length,
        examples,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    this.negativeKnowledge.totalExclusions += examples.length;
    console.log(`[KnowledgeCompression] Added false pattern class: ${className} (${examples.length} examples)`);
  }

  learnFromResult(hypothesis: string, phi: number, kappa: number, isSuccess: boolean, generatorId?: string): void {
    if (generatorId && this.generators.has(generatorId)) {
      const generator = this.generators.get(generatorId)!;
      
      if (isSuccess) {
        generator.successCount++;
        generator.confidence = Math.min(1, generator.confidence + 0.1);
      } else if (phi < 0.3) {
        generator.confidence = Math.max(0.1, generator.confidence - 0.01);
      }
    }

    if (!isSuccess && phi < 0.2) {
      const pattern = this.extractPatternFromHypothesis(hypothesis);
      if (pattern) {
        this.recordLowPhiPattern(pattern, phi);
      }
    }
  }

  private extractPatternFromHypothesis(hypothesis: string): string | null {
    const normalized = hypothesis.toLowerCase().trim();
    
    if (normalized.length < 4) return null;
    if (normalized.length > 50) return null;
    
    return normalized;
  }

  private lowPhiPatternCounts: Map<string, number> = new Map();
  private readonly LOW_PHI_THRESHOLD = 5;

  private recordLowPhiPattern(pattern: string, phi: number): void {
    const count = (this.lowPhiPatternCounts.get(pattern) || 0) + 1;
    this.lowPhiPatternCounts.set(pattern, count);
    
    if (count >= this.LOW_PHI_THRESHOLD) {
      this.addContradiction({
        type: 'proven_false',
        pattern,
        affectedGenerators: Array.from(this.generators.keys()),
        basinRegion: {
          center: new Array(64).fill(0),
          radius: 0.1,
          repulsionStrength: 0.8,
        },
        evidence: [{
          source: 'learning',
          reasoning: `Pattern "${pattern}" consistently produces low Φ (avg < 0.2) after ${count} tests`,
          confidence: 0.9,
        }],
        hypothesesExcluded: 100,
        computeSaved: 100,
      });
      
      this.lowPhiPatternCounts.delete(pattern);
    }
  }

  createGeneratorFromTemplate(
    name: string,
    template: string,
    substitutions: Record<string, string[]>,
    transformations: Array<{ name: string; operation: 'lowercase' | 'uppercase' | 'l33t' | 'reverse' | 'append' | 'prepend' }> = []
  ): string {
    const generator = this.createGenerator({
      name,
      type: 'grammatical',
      template,
      substitutionRules: substitutions,
      transformations: transformations.map(t => ({ name: t.name, operation: t.operation, params: undefined })),
      entropy: this.estimateEntropy(substitutions),
      expectedOutput: this.estimateOutput(substitutions, transformations.length),
      source: 'learned',
      confidence: 0.5,
    });
    
    this.generators.set(generator.id, generator);
    console.log(`[KnowledgeCompression] Created new generator: ${name} (id: ${generator.id})`);
    
    return generator.id;
  }

  private estimateEntropy(substitutions: Record<string, string[]>): number {
    let entropy = 0;
    for (const values of Object.values(substitutions)) {
      entropy += Math.log2(values.length);
    }
    return entropy;
  }

  private estimateOutput(substitutions: Record<string, string[]>, transformCount: number): number {
    let output = 1;
    for (const values of Object.values(substitutions)) {
      output *= values.length;
    }
    return output * Math.max(1, transformCount);
  }

  getGeneratorStats(): { id: string; name: string; type: string; uses: number; successRate: number; entropy: number }[] {
    return Array.from(this.generators.values()).map(g => ({
      id: g.id,
      name: g.name,
      type: g.type,
      uses: g.lastUsed ? 1 : 0,
      successRate: g.successCount > 0 ? g.successCount / (g.successCount + 1) : 0,
      entropy: g.entropy,
    }));
  }

  getNegativeKnowledgeStats(): { contradictions: number; falseClasses: number; barriers: number; computeSaved: number } {
    return {
      contradictions: this.negativeKnowledge.contradictions.length,
      falseClasses: Object.keys(this.negativeKnowledge.falsePatternClasses).length,
      barriers: this.negativeKnowledge.geometricBarriers.length,
      computeSaved: this.negativeKnowledge.estimatedComputeSaved,
    };
  }

  exportGenerators(): KnowledgeGenerator[] {
    return Array.from(this.generators.values());
  }

  importGenerator(generator: KnowledgeGenerator): void {
    this.generators.set(generator.id, generator);
    console.log(`[KnowledgeCompression] Imported generator: ${generator.name}`);
  }

  getNegativeKnowledge(): NegativeKnowledgeRegistry {
    return this.negativeKnowledge;
  }
}

export const knowledgeCompressionEngine = new KnowledgeCompressionEngine();