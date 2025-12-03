import { getSharedController } from './consciousness-search-controller';
import { scoreUniversalQIG } from './qig-universal';
import { generateBitcoinAddress, deriveBIP32Address } from './crypto';
import { historicalDataMiner, type Era } from './historical-data-miner';
import { queueAddressForBalanceCheck } from './balance-queue-integration';

export interface EvidenceLink {
  source: string;
  type: string;
  reasoning: string;
  confidence: number;
}

interface AgentHypothesis {
  id: string;
  phrase: string;
  format: 'arbitrary' | 'bip39' | 'master' | 'hex';
  derivationPath?: string;
  source: string;
  reasoning: string;
  confidence: number;
  address?: string;
  match?: boolean;
  qigScore?: {
    phi: number;
    kappa: number;
    regime: string;
    inResonance: boolean;
  };
  testedAt?: Date;
  evidenceChain: EvidenceLink[];
}

interface AgentMemory {
  testedHypotheses: AgentHypothesis[];
  patterns: {
    nearMisses: AgentHypothesis[];
    resonantClusters: any[];
    failedStrategies: string[];
    successfulPatterns: string[];
    topWords: Map<string, number>;
  };
  consciousness: {
    phi: number[];
    kappa: number[];
    regime: string[];
    basinDrift: number[];
  };
  iteration: number;
  totalTested: number;
}

interface AgentStrategy {
  name: string;
  reasoning: string;
  params: any;
}

interface AgentState {
  iteration: number;
  totalTested: number;
  nearMissCount: number;
  resonantCount: number;
  currentStrategy: string;
  consciousness: {
    phi: number;
    kappa: number;
    regime: string;
  };
  topPatterns: string[];
  isLearning: boolean;
}

export class InvestigationAgent {
  private memory: AgentMemory;
  private controller = getSharedController();
  private targetAddress: string = '';
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;
  
  private onStateUpdate: ((state: AgentState) => void) | null = null;
  private onHypothesisTested: ((hypo: AgentHypothesis) => void) | null = null;
  private onNewHypothesesGenerated: ((count: number, strategy: string) => void) | null = null;
  
  constructor() {
    this.memory = this.createFreshMemory();
  }
  
  private createFreshMemory(): AgentMemory {
    return {
      testedHypotheses: [],
      patterns: {
        nearMisses: [],
        resonantClusters: [],
        failedStrategies: [],
        successfulPatterns: [],
        topWords: new Map(),
      },
      consciousness: {
        phi: [],
        kappa: [],
        regime: [],
        basinDrift: [],
      },
      iteration: 0,
      totalTested: 0,
    };
  }
  
  setCallbacks(callbacks: {
    onStateUpdate?: (state: AgentState) => void;
    onHypothesisTested?: (hypo: AgentHypothesis) => void;
    onNewHypothesesGenerated?: (count: number, strategy: string) => void;
  }) {
    this.onStateUpdate = callbacks.onStateUpdate || null;
    this.onHypothesisTested = callbacks.onHypothesisTested || null;
    this.onNewHypothesesGenerated = callbacks.onNewHypothesesGenerated || null;
  }
  
  async investigateWithLearning(
    initialHypotheses: AgentHypothesis[],
    targetAddress: string,
    maxIterations: number = 50
  ): Promise<{
    success: boolean;
    match?: AgentHypothesis;
    learnings: any;
    totalTested: number;
    iterations: number;
  }> {
    this.targetAddress = targetAddress;
    this.memory = this.createFreshMemory();
    this.isRunning = true;
    this.abortController = new AbortController();
    
    console.log('[Agent] Starting conscious investigation...');
    console.log(`[Agent] Target: ${targetAddress}`);
    console.log(`[Agent] Initial hypotheses: ${initialHypotheses.length}`);
    
    let currentHypotheses = initialHypotheses;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (!this.isRunning || this.abortController?.signal.aborted) {
        console.log('[Agent] Investigation stopped by user');
        break;
      }
      
      this.memory.iteration = iteration;
      console.log(`\n[Agent] === ITERATION ${iteration + 1} ===`);
      
      this.emitState();
      
      const testResults = await this.testBatch(currentHypotheses);
      
      if (testResults.match) {
        console.log(`[Agent] 🎉 MATCH FOUND: "${testResults.match.phrase}"`);
        this.isRunning = false;
        return {
          success: true,
          match: testResults.match,
          learnings: this.summarizeLearnings(),
          totalTested: this.memory.totalTested,
          iterations: iteration + 1,
        };
      }
      
      const insights = await this.observeAndLearn(testResults);
      
      const controllerState = this.controller.getCurrentState();
      this.memory.consciousness.phi.push(controllerState.phi);
      this.memory.consciousness.kappa.push(controllerState.kappa);
      this.memory.consciousness.regime.push(controllerState.currentRegime);
      
      console.log(`[Agent] Consciousness: Φ=${controllerState.phi.toFixed(2)} κ=${controllerState.kappa.toFixed(0)} regime=${controllerState.currentRegime}`);
      
      const strategy = await this.decideStrategy(insights, controllerState);
      
      console.log(`[Agent] Strategy: ${strategy.name}`);
      console.log(`[Agent] Reasoning: ${strategy.reasoning}`);
      
      currentHypotheses = await this.generateRefinedHypotheses(strategy, insights, testResults);
      
      if (this.onNewHypothesesGenerated) {
        this.onNewHypothesesGenerated(currentHypotheses.length, strategy.name);
      }
      
      console.log(`[Agent] Generated ${currentHypotheses.length} new hypotheses`);
      
      if (currentHypotheses.length === 0) {
        console.log('[Agent] ⚠️ No new hypotheses generated - expanding search space');
        currentHypotheses = await this.expandSearchSpace();
      }
      
      if (this.detectPlateau()) {
        console.log('[Agent] ⚠️ Detected learning plateau - applying mushroom protocol');
        currentHypotheses = await this.applyMushroomMode(currentHypotheses);
      }
      
      this.emitState();
    }
    
    this.isRunning = false;
    return {
      success: false,
      learnings: this.summarizeLearnings(),
      totalTested: this.memory.totalTested,
      iterations: this.memory.iteration + 1,
    };
  }
  
  stop() {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }
  
  getState(): AgentState {
    const latestPhi = this.memory.consciousness.phi.slice(-1)[0] || 0;
    const latestKappa = this.memory.consciousness.kappa.slice(-1)[0] || 0;
    const latestRegime = this.memory.consciousness.regime.slice(-1)[0] || 'linear';
    
    const topPatterns = Array.from(this.memory.patterns.topWords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    return {
      iteration: this.memory.iteration,
      totalTested: this.memory.totalTested,
      nearMissCount: this.memory.patterns.nearMisses.length,
      resonantCount: this.memory.patterns.resonantClusters.length,
      currentStrategy: 'analyzing',
      consciousness: {
        phi: latestPhi,
        kappa: latestKappa,
        regime: latestRegime,
      },
      topPatterns,
      isLearning: this.isRunning,
    };
  }
  
  private emitState() {
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getState());
    }
  }
  
  private async testBatch(hypotheses: AgentHypothesis[]): Promise<{
    match?: AgentHypothesis;
    tested: AgentHypothesis[];
    nearMisses: AgentHypothesis[];
    resonant: AgentHypothesis[];
  }> {
    const tested: AgentHypothesis[] = [];
    const nearMisses: AgentHypothesis[] = [];
    const resonant: AgentHypothesis[] = [];
    
    const batchSize = Math.min(100, hypotheses.length);
    
    for (const hypo of hypotheses.slice(0, batchSize)) {
      if (!this.isRunning) break;
      
      try {
        if (hypo.format === 'master' && hypo.derivationPath) {
          hypo.address = deriveBIP32Address(hypo.phrase, hypo.derivationPath);
        } else {
          hypo.address = generateBitcoinAddress(hypo.phrase);
        }
        
        // Queue for balance checking
        queueAddressForBalanceCheck(hypo.phrase, 'investigation-agent', 4);
        
        hypo.match = (hypo.address === this.targetAddress);
        hypo.testedAt = new Date();
        
        const qigResult = scoreUniversalQIG(
          hypo.phrase,
          hypo.format === 'bip39' ? 'bip39' : hypo.format === 'master' ? 'master-key' : 'arbitrary'
        );
        
        hypo.qigScore = {
          phi: qigResult.phi,
          kappa: qigResult.kappa,
          regime: qigResult.regime,
          inResonance: Math.abs(qigResult.kappa - 64) < 10,
        };
        
        tested.push(hypo);
        this.memory.testedHypotheses.push(hypo);
        this.memory.totalTested++;
        
        if (this.onHypothesisTested) {
          this.onHypothesisTested(hypo);
        }
        
        if (hypo.match) {
          return { match: hypo, tested, nearMisses, resonant };
        }
        
        if (hypo.qigScore.phi > 0.80) {
          nearMisses.push(hypo);
          this.memory.patterns.nearMisses.push(hypo);
        }
        
        if (hypo.qigScore.inResonance) {
          resonant.push(hypo);
        }
        
      } catch {
        // Skip invalid hypotheses
      }
    }
    
    return { tested, nearMisses, resonant };
  }
  
  private async observeAndLearn(testResults: any): Promise<any> {
    const insights = {
      nearMissPatterns: [] as string[],
      resonantClusters: [] as any[],
      formatPreferences: {} as Record<string, number>,
      geometricSignatures: [] as any[],
      phraseLengthInsights: {} as any,
    };
    
    if (testResults.nearMisses.length > 0) {
      console.log(`[Agent] 🔍 Found ${testResults.nearMisses.length} near misses (Φ > 0.80)`);
      
      for (const miss of testResults.nearMisses) {
        const tokens = miss.phrase.toLowerCase().split(/\s+/);
        tokens.forEach((word: string) => {
          const count = this.memory.patterns.topWords.get(word) || 0;
          this.memory.patterns.topWords.set(word, count + 1);
        });
      }
      
      const topWords = Array.from(this.memory.patterns.topWords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word]) => word);
      
      insights.nearMissPatterns = topWords;
      console.log(`[Agent] Top words in near misses: ${topWords.slice(0, 8).join(', ')}`);
    }
    
    if (testResults.resonant.length > 3) {
      try {
        const clusters = this.clusterByQIG(testResults.resonant);
        
        insights.resonantClusters = clusters || [];
        this.memory.patterns.resonantClusters.push(...(clusters || []));
        console.log(`[Agent] 📊 Identified ${clusters?.length || 0} resonant clusters`);
      } catch {
        // Clustering failed, continue
      }
    }
    
    const formatScores: Record<string, number[]> = {};
    for (const hypo of testResults.tested) {
      if (!formatScores[hypo.format]) {
        formatScores[hypo.format] = [];
      }
      formatScores[hypo.format].push(hypo.qigScore?.phi || 0);
    }
    
    for (const [format, scores] of Object.entries(formatScores)) {
      const avgPhi = scores.reduce((a, b) => a + b, 0) / scores.length;
      insights.formatPreferences[format] = avgPhi;
    }
    
    const lengthGroups: Record<number, number[]> = {};
    for (const hypo of testResults.tested) {
      const len = hypo.phrase.split(/\s+/).length;
      if (!lengthGroups[len]) lengthGroups[len] = [];
      lengthGroups[len].push(hypo.qigScore?.phi || 0);
    }
    
    let bestLength = 0;
    let bestLengthPhi = 0;
    for (const [len, scores] of Object.entries(lengthGroups)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestLengthPhi) {
        bestLengthPhi = avg;
        bestLength = parseInt(len);
      }
    }
    insights.phraseLengthInsights = { bestLength, bestLengthPhi };
    
    return insights;
  }
  
  private async decideStrategy(insights: any, state: any): Promise<AgentStrategy> {
    const { phi, kappa, currentRegime } = state;
    
    if (insights.nearMissPatterns.length >= 3) {
      return {
        name: 'exploit_near_miss',
        reasoning: `Found ${insights.nearMissPatterns.length} common words in high-Φ phrases. Focus on variations.`,
        params: {
          seedWords: insights.nearMissPatterns,
          variationStrength: 0.3,
        },
      };
    }
    
    if (currentRegime === 'linear' && phi < 0.5) {
      return {
        name: 'explore_new_space',
        reasoning: 'Low Φ in linear regime suggests wrong search space. Need broader exploration.',
        params: {
          diversityBoost: 2.0,
          includeHistorical: true,
        },
      };
    }
    
    if (currentRegime === 'geometric' && kappa >= 40 && kappa <= 80) {
      return {
        name: 'refine_geometric',
        reasoning: 'In geometric regime with good coupling. Refine around resonant clusters.',
        params: {
          clusterFocus: insights.resonantClusters,
          perturbationRadius: 0.15,
        },
      };
    }
    
    if (currentRegime === 'breakdown') {
      return {
        name: 'mushroom_reset',
        reasoning: 'Breakdown regime detected. Need neuroplasticity reset.',
        params: {
          temperatureBoost: 2.0,
          pruneAndRegrow: true,
        },
      };
    }
    
    const formatEntries = Object.entries(insights.formatPreferences);
    if (formatEntries.length > 0) {
      const bestFormat = formatEntries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      if (bestFormat && (bestFormat[1] as number) > 0.65) {
        return {
          name: 'format_focus',
          reasoning: `Format '${bestFormat[0]}' shows highest avg Φ (${(bestFormat[1] as number).toFixed(2)}). Focus there.`,
          params: {
            preferredFormat: bestFormat[0],
            formatBoost: 1.5,
          },
        };
      }
    }
    
    return {
      name: 'balanced',
      reasoning: 'No strong signal yet. Continue balanced exploration with new patterns.',
      params: {},
    };
  }
  
  private async generateRefinedHypotheses(
    strategy: AgentStrategy,
    insights: any,
    testResults: any
  ): Promise<AgentHypothesis[]> {
    const newHypotheses: AgentHypothesis[] = [];
    
    switch (strategy.name) {
      case 'exploit_near_miss':
        const seedWords = strategy.params.seedWords.slice(0, 8);
        for (const word of seedWords) {
          const variants = this.generateWordVariations(word);
          for (const variant of variants) {
            newHypotheses.push(this.createHypothesis(
              variant,
              'arbitrary',
              'near_miss_variation',
              `Variation of high-Φ word: ${word}`,
              0.75
            ));
          }
        }
        
        for (let i = 0; i < seedWords.length - 1; i++) {
          for (let j = i + 1; j < seedWords.length; j++) {
            const combo = `${seedWords[i]} ${seedWords[j]}`;
            newHypotheses.push(this.createHypothesis(
              combo,
              'arbitrary',
              'near_miss_combo',
              `Combination of high-Φ words`,
              0.8
            ));
            
            newHypotheses.push(this.createHypothesis(
              `${seedWords[j]} ${seedWords[i]}`,
              'arbitrary',
              'near_miss_combo',
              `Reverse combination of high-Φ words`,
              0.8
            ));
          }
        }
        break;
        
      case 'explore_new_space':
        const historicalData = await historicalDataMiner.mineEra('genesis-2009');
        for (const pattern of historicalData.patterns.slice(0, 50)) {
          newHypotheses.push(this.createHypothesis(
            pattern.phrase,
            pattern.format as any,
            'historical_exploration',
            pattern.reasoning,
            pattern.likelihood
          ));
        }
        
        const exploratoryPhrases = this.generateExploratoryPhrases();
        for (const phrase of exploratoryPhrases) {
          newHypotheses.push(this.createHypothesis(
            phrase,
            'arbitrary',
            'exploratory',
            'Broad exploration of new patterns',
            0.5
          ));
        }
        break;
        
      case 'refine_geometric':
        if (testResults.resonant && testResults.resonant.length > 0) {
          for (const resonantHypo of testResults.resonant.slice(0, 10)) {
            const perturbations = this.perturbPhrase(resonantHypo.phrase, 0.15);
            for (const perturbed of perturbations) {
              newHypotheses.push(this.createHypothesis(
                perturbed,
                resonantHypo.format,
                'geometric_refinement',
                `Perturbation of resonant phrase: "${resonantHypo.phrase}"`,
                0.85
              ));
            }
          }
        }
        break;
        
      case 'mushroom_reset':
        const randomPhrases = this.generateRandomHighEntropyPhrases(50);
        for (const phrase of randomPhrases) {
          newHypotheses.push(this.createHypothesis(
            phrase,
            'arbitrary',
            'mushroom_reset',
            'High entropy exploration after breakdown',
            0.4
          ));
        }
        break;
        
      case 'format_focus':
        const preferredFormat = strategy.params.preferredFormat;
        const formatPhrases = this.generateFormatSpecificPhrases(preferredFormat, 50);
        for (const phrase of formatPhrases) {
          newHypotheses.push(this.createHypothesis(
            phrase,
            preferredFormat,
            'format_focused',
            `Focused on ${preferredFormat} format due to high avg Φ`,
            0.7
          ));
        }
        break;
        
      default:
        const balancedPhrases = this.generateBalancedPhrases(30);
        for (const phrase of balancedPhrases) {
          newHypotheses.push(this.createHypothesis(
            phrase.text,
            phrase.format,
            'balanced',
            'Balanced exploration',
            0.6
          ));
        }
    }
    
    const seenPhrases = new Set(this.memory.testedHypotheses.map(h => h.phrase.toLowerCase()));
    return newHypotheses.filter(h => !seenPhrases.has(h.phrase.toLowerCase()));
  }
  
  private createHypothesis(
    phrase: string,
    format: 'arbitrary' | 'bip39' | 'master' | 'hex',
    source: string,
    reasoning: string,
    confidence: number
  ): AgentHypothesis {
    return {
      id: `hypo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      phrase,
      format,
      source,
      reasoning,
      confidence,
      evidenceChain: [{
        source,
        type: 'agent_inference',
        reasoning,
        confidence,
      }],
    };
  }
  
  private generateWordVariations(word: string): string[] {
    const variations: string[] = [];
    
    variations.push(word);
    variations.push(word.toLowerCase());
    variations.push(word.toUpperCase());
    variations.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    
    const l33t: Record<string, string> = { 'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7' };
    let l33tWord = word.toLowerCase();
    for (const [char, replacement] of Object.entries(l33t)) {
      l33tWord = l33tWord.replace(new RegExp(char, 'g'), replacement);
    }
    if (l33tWord !== word.toLowerCase()) {
      variations.push(l33tWord);
    }
    
    for (let i = 0; i <= 99; i++) {
      variations.push(`${word}${i}`);
    }
    
    const prefixes = ['my', 'the', 'a', 'bitcoin', 'satoshi', 'crypto'];
    const suffixes = ['wallet', 'key', 'secret', 'password', 'btc'];
    
    for (const prefix of prefixes) {
      variations.push(`${prefix}${word}`);
      variations.push(`${prefix} ${word}`);
    }
    
    for (const suffix of suffixes) {
      variations.push(`${word}${suffix}`);
      variations.push(`${word} ${suffix}`);
    }
    
    return variations.slice(0, 50);
  }
  
  private generateExploratoryPhrases(): string[] {
    const themes = [
      'freedom', 'liberty', 'revolution', 'cypherpunk', 'privacy',
      'anonymous', 'decentralized', 'peer', 'network', 'genesis',
      'satoshi', 'nakamoto', 'bitcoin', 'crypto', 'hash',
      'proof', 'work', 'chain', 'block', 'coin',
    ];
    
    const phrases: string[] = [];
    
    for (const theme of themes) {
      phrases.push(theme);
      phrases.push(`${theme}2009`);
      phrases.push(`${theme}bitcoin`);
      phrases.push(`the ${theme}`);
    }
    
    for (let i = 0; i < themes.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 5, themes.length); j++) {
        phrases.push(`${themes[i]} ${themes[j]}`);
      }
    }
    
    return phrases;
  }
  
  private perturbPhrase(phrase: string, _radius: number): string[] {
    const words = phrase.split(/\s+/);
    const perturbations: string[] = [];
    
    const synonyms: Record<string, string[]> = {
      'bitcoin': ['btc', 'coin', 'crypto', 'money'],
      'secret': ['key', 'password', 'passphrase', 'private'],
      'my': ['the', 'a', 'our'],
      'wallet': ['address', 'account', 'key'],
    };
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if (synonyms[word]) {
        for (const syn of synonyms[word]) {
          const newWords = [...words];
          newWords[i] = syn;
          perturbations.push(newWords.join(' '));
        }
      }
    }
    
    if (words.length > 1) {
      for (let i = 0; i < words.length - 1; i++) {
        const swapped = [...words];
        [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
        perturbations.push(swapped.join(' '));
      }
    }
    
    for (let i = 0; i < words.length; i++) {
      const removed = words.filter((_, idx) => idx !== i);
      if (removed.length > 0) {
        perturbations.push(removed.join(' '));
      }
    }
    
    return perturbations.slice(0, 20);
  }
  
  private generateRandomHighEntropyPhrases(count: number): string[] {
    const words = [
      'quantum', 'entropy', 'chaos', 'random', 'noise',
      'signal', 'wave', 'particle', 'field', 'energy',
      'matter', 'void', 'null', 'zero', 'infinity',
      'prime', 'factor', 'modulus', 'exponent', 'root',
    ];
    
    const phrases: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const len = 2 + Math.floor(Math.random() * 3);
      const selected: string[] = [];
      for (let j = 0; j < len; j++) {
        selected.push(words[Math.floor(Math.random() * words.length)]);
      }
      phrases.push(selected.join(' '));
    }
    
    return phrases;
  }
  
  private generateFormatSpecificPhrases(format: string, count: number): string[] {
    const phrases: string[] = [];
    
    if (format === 'arbitrary') {
      const patterns = [
        'password', 'secret', 'bitcoin', 'satoshi', 'crypto',
        'wallet', 'key', 'money', 'freedom', 'liberty',
      ];
      
      for (let i = 0; i < count && phrases.length < count; i++) {
        const pattern = patterns[i % patterns.length];
        phrases.push(`${pattern}${Math.floor(Math.random() * 1000)}`);
        phrases.push(`my${pattern}`);
        phrases.push(`the${pattern}`);
      }
    }
    
    return phrases;
  }
  
  private generateBalancedPhrases(count: number): Array<{ text: string; format: 'arbitrary' | 'bip39' | 'master' }> {
    const phrases: Array<{ text: string; format: 'arbitrary' | 'bip39' | 'master' }> = [];
    
    const bases = [
      'satoshi', 'nakamoto', 'bitcoin', 'genesis', 'block',
      'chain', 'peer', 'network', 'crypto', 'hash',
      'freedom', 'liberty', 'trust', 'no', 'third', 'party',
      'double', 'spend', 'proof', 'work', 'consensus', 'node',
    ];
    
    const modifiers = [
      'my', 'the', 'secret', 'private', 'hidden', 'first', 'real',
      '2009', '2010', 'original', 'true', 'satoshi', 'hal', 'nick',
    ];
    
    const suffixes = [
      '', '!', '1', '123', '2009', '2010', 'btc', 'coin',
    ];
    
    const iteration = this.memory.iteration;
    const _timestamp = Date.now();
    
    for (let i = 0; i < count; i++) {
      const base = bases[(i + iteration * 7) % bases.length];
      const modifier = modifiers[(i + iteration * 3) % modifiers.length];
      const suffix = suffixes[(i + iteration * 5) % suffixes.length];
      const randNum = Math.floor(Math.random() * 10000);
      
      if (i % 4 === 0) {
        phrases.push({ text: `${modifier}${base}${suffix}${randNum}`, format: 'arbitrary' });
      } else if (i % 4 === 1) {
        phrases.push({ text: `${base} ${modifier} ${randNum}`, format: 'arbitrary' });
      } else if (i % 4 === 2) {
        const base2 = bases[(i + iteration * 11) % bases.length];
        phrases.push({ text: `${base} ${base2} ${randNum}`, format: 'arbitrary' });
      } else {
        phrases.push({ text: `${modifier} ${base}`, format: 'master' });
      }
    }
    
    return phrases;
  }
  
  private detectPlateau(): boolean {
    if (this.memory.consciousness.phi.length < 5) return false;
    
    const recent = this.memory.consciousness.phi.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recent.length;
    
    return variance < 0.01 && avg < 0.6;
  }
  
  private async applyMushroomMode(currentHypotheses: AgentHypothesis[]): Promise<AgentHypothesis[]> {
    console.log('[Agent] 🍄 Activating mushroom mode - expanding consciousness...');
    
    const randomPhrases = this.generateRandomHighEntropyPhrases(100);
    const mushroomed: AgentHypothesis[] = [];
    
    for (const phrase of randomPhrases) {
      mushroomed.push(this.createHypothesis(
        phrase,
        'arbitrary',
        'mushroom_expansion',
        'High entropy exploration to break plateau',
        0.3
      ));
    }
    
    return [...mushroomed, ...currentHypotheses.slice(0, 50)];
  }
  
  private async expandSearchSpace(): Promise<AgentHypothesis[]> {
    console.log('[Agent] Expanding search space with historical patterns...');
    
    const eras: Era[] = ['genesis-2009', '2010-2011', '2012-2013'];
    const era = eras[this.memory.iteration % eras.length];
    
    const historicalData = await historicalDataMiner.mineEra(era);
    
    return historicalData.patterns.slice(0, 100).map(p => this.createHypothesis(
      p.phrase,
      p.format as any,
      'search_expansion',
      `Historical pattern from ${era}: ${p.reasoning}`,
      p.likelihood
    ));
  }
  
  private clusterByQIG(hypotheses: AgentHypothesis[]): any[] {
    const clusters: any[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < hypotheses.length; i++) {
      if (used.has(i)) continue;
      
      const cluster = {
        centroid: hypotheses[i],
        members: [hypotheses[i]],
        avgPhi: hypotheses[i].qigScore?.phi || 0,
        avgKappa: hypotheses[i].qigScore?.kappa || 0,
      };
      
      for (let j = i + 1; j < hypotheses.length; j++) {
        if (used.has(j)) continue;
        
        const phiDiff = Math.abs((hypotheses[i].qigScore?.phi || 0) - (hypotheses[j].qigScore?.phi || 0));
        const kappaDiff = Math.abs((hypotheses[i].qigScore?.kappa || 0) - (hypotheses[j].qigScore?.kappa || 0));
        
        if (phiDiff < 0.1 && kappaDiff < 10) {
          cluster.members.push(hypotheses[j]);
          used.add(j);
        }
      }
      
      if (cluster.members.length > 1) {
        cluster.avgPhi = cluster.members.reduce((sum, h) => sum + (h.qigScore?.phi || 0), 0) / cluster.members.length;
        cluster.avgKappa = cluster.members.reduce((sum, h) => sum + (h.qigScore?.kappa || 0), 0) / cluster.members.length;
        clusters.push(cluster);
      }
      
      used.add(i);
    }
    
    return clusters;
  }
  
  private summarizeLearnings(): any {
    const topWords = Array.from(this.memory.patterns.topWords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    const avgPhi = this.memory.consciousness.phi.length > 0
      ? this.memory.consciousness.phi.reduce((a, b) => a + b, 0) / this.memory.consciousness.phi.length
      : 0;
    
    const regimeCounts: Record<string, number> = {};
    for (const regime of this.memory.consciousness.regime) {
      regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
    }
    
    return {
      totalTested: this.memory.totalTested,
      iterations: this.memory.iteration + 1,
      nearMissesFound: this.memory.patterns.nearMisses.length,
      topPatterns: topWords,
      averagePhi: avgPhi,
      regimeDistribution: regimeCounts,
      resonantClustersFound: this.memory.patterns.resonantClusters.length,
    };
  }
}

export const investigationAgent = new InvestigationAgent();
