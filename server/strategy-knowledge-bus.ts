import { writeFileSync, readFileSync, existsSync } from 'fs';
import {
  KnowledgeGenerator,
  StrategyKnowledgeBus as StrategyKnowledgeBusType,
  StrategyKnowledgeBusEntry,
  KnowledgeTransferEvent,
  GeneratorTransferPacket,
  CrossStrategyPattern
} from '../shared/schema';
import { knowledgeCompressionEngine } from './knowledge-compression-engine';
import './temporal-geometry';
import { negativeKnowledgeUnified as negativeKnowledgeRegistry } from './negative-knowledge-unified';

interface StrategyCapability {
  id: string;
  name: string;
  generatorTypes: string[];
  compressionMethods: string[];
  resonanceRange: [number, number];
  preferredRegimes: ('linear' | 'geometric' | 'breakdown')[];
}

interface ActiveSubscription {
  subscriberId: string;
  strategyId: string;
  patterns: string[];
  callback: (event: KnowledgeTransferEvent) => void;
  createdAt: string;
}

interface ScaleMapping {
  sourceScale: number;
  targetScale: number;
  transformMatrix: number[];
  preservedFeatures: string[];
  lossEstimate: number;
}

export class StrategyKnowledgeBus {
  private strategies: Map<string, StrategyCapability> = new Map();
  private sharedKnowledge: Map<string, StrategyKnowledgeBusEntry> = new Map();
  private transferHistory: KnowledgeTransferEvent[] = [];
  private crossStrategyPatterns: Map<string, CrossStrategyPattern> = new Map();
  private subscriptions: ActiveSubscription[] = [];
  private scaleMappings: Map<string, ScaleMapping> = new Map();
  
  private readonly PERSISTENCE_PATH = './knowledge_bus_state.json';
  private readonly MAX_TRANSFER_HISTORY = 1000;
  private readonly CROSS_STRATEGY_THRESHOLD = 0.7;

  constructor() {
    this.load();
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    const defaultStrategies: StrategyCapability[] = [
      {
        id: 'era_patterns',
        name: 'Era Pattern Analysis',
        generatorTypes: ['temporal', 'grammatical'],
        compressionMethods: ['era_clustering', 'temporal_entropy'],
        resonanceRange: [0.3, 0.7],
        preferredRegimes: ['linear', 'geometric'],
      },
      {
        id: 'brain_wallet_dict',
        name: 'Brain Wallet Dictionary',
        generatorTypes: ['grammatical', 'structural'],
        compressionMethods: ['dictionary_hash', 'frequency_encode'],
        resonanceRange: [0.4, 0.9],
        preferredRegimes: ['linear'],
      },
      {
        id: 'bitcoin_terms',
        name: 'Bitcoin Terminology',
        generatorTypes: ['grammatical', 'cross_format'],
        compressionMethods: ['term_graph', 'semantic_embed'],
        resonanceRange: [0.5, 0.95],
        preferredRegimes: ['geometric'],
      },
      {
        id: 'linguistic',
        name: 'Linguistic Patterns',
        generatorTypes: ['grammatical', 'structural'],
        compressionMethods: ['ngram_compress', 'phonetic_hash'],
        resonanceRange: [0.2, 0.8],
        preferredRegimes: ['linear', 'geometric'],
      },
      {
        id: 'qig_basin_search',
        name: 'QIG Basin Search',
        generatorTypes: ['geometric', 'structural'],
        compressionMethods: ['basin_topology', 'curvature_encode'],
        resonanceRange: [0.6, 1.0],
        preferredRegimes: ['geometric', 'breakdown'],
      },
      {
        id: 'historical_autonomous',
        name: 'Historical Autonomous',
        generatorTypes: ['temporal', 'cross_format'],
        compressionMethods: ['archive_chain', 'temporal_graph'],
        resonanceRange: [0.3, 0.85],
        preferredRegimes: ['linear', 'geometric'],
      },
      {
        id: 'cross_format',
        name: 'Cross Format Analysis',
        generatorTypes: ['cross_format', 'geometric'],
        compressionMethods: ['format_bridge', 'universal_hash'],
        resonanceRange: [0.4, 0.95],
        preferredRegimes: ['geometric', 'breakdown'],
      },
    ];

    for (const strategy of defaultStrategies) {
      if (!this.strategies.has(strategy.id)) {
        this.strategies.set(strategy.id, strategy);
      }
    }
  }

  registerStrategy(capability: StrategyCapability): void {
    this.strategies.set(capability.id, capability);
    console.log(`[KnowledgeBus] Registered strategy: ${capability.name}`);
  }

  publishKnowledge(
    sourceStrategy: string,
    generatorId: string,
    pattern: string,
    context: {
      phi: number;
      kappaEff: number;
      regime: 'linear' | 'geometric' | 'breakdown';
      basinCoords?: number[];
    }
  ): string {
    const entryId = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: StrategyKnowledgeBusEntry = {
      id: entryId,
      sourceStrategy,
      generatorId,
      pattern,
      phi: context.phi,
      kappaEff: context.kappaEff,
      regime: context.regime,
      sharedAt: new Date().toISOString(),
      consumedBy: [],
      transformations: [],
    };

    this.sharedKnowledge.set(entryId, entry);

    this.notifySubscribers({
      id: `transfer_${Date.now()}`,
      type: 'publish',
      sourceStrategy,
      targetStrategy: null,
      generatorId,
      pattern,
      phi: context.phi,
      kappaEff: context.kappaEff,
      timestamp: entry.sharedAt,
      success: true,
    });

    this.detectCrossStrategyPatterns(pattern, sourceStrategy, context);

    this.save();
    return entryId;
  }

  consumeKnowledge(
    targetStrategy: string,
    entryId: string,
    transformation?: string
  ): StrategyKnowledgeBusEntry | null {
    const entry = this.sharedKnowledge.get(entryId);
    if (!entry) return null;

    if (!entry.consumedBy.includes(targetStrategy)) {
      entry.consumedBy.push(targetStrategy);
    }

    if (transformation) {
      entry.transformations.push({
        strategy: targetStrategy,
        method: transformation,
        timestamp: new Date().toISOString(),
      });
    }

    this.recordTransfer({
      id: `transfer_${Date.now()}`,
      type: 'consume',
      sourceStrategy: entry.sourceStrategy,
      targetStrategy,
      generatorId: entry.generatorId,
      pattern: entry.pattern,
      phi: entry.phi,
      kappaEff: entry.kappaEff,
      timestamp: new Date().toISOString(),
      success: true,
      transformation,
    });

    this.save();
    return entry;
  }

  transferGenerator(
    sourceStrategy: string,
    targetStrategy: string,
    generator: KnowledgeGenerator,
    scaleAdjustment?: number
  ): GeneratorTransferPacket {
    const source = this.strategies.get(sourceStrategy);
    const target = this.strategies.get(targetStrategy);
    
    if (!source || !target) {
      return {
        success: false,
        generator: null,
        scaleTransform: 1,
        fidelityLoss: 1,
        adaptations: ['missing_strategy'],
      };
    }

    const hasMatchingType = generator.type && target.generatorTypes.includes(generator.type);
    const resonanceOverlap = this.computeResonanceOverlap(
      source.resonanceRange,
      target.resonanceRange
    );

    const adaptations: string[] = [];
    let fidelityLoss = 0;

    if (!hasMatchingType) {
      adaptations.push('type_adaptation');
      fidelityLoss += 0.1;
    }

    if (resonanceOverlap < 0.5) {
      adaptations.push('resonance_rescale');
      fidelityLoss += 0.15 * (1 - resonanceOverlap);
    }

    const regimeCompat = target.preferredRegimes.some(r => 
      source.preferredRegimes.includes(r)
    );
    if (!regimeCompat) {
      adaptations.push('regime_bridge');
      fidelityLoss += 0.2;
    }

    const scaleTransform = scaleAdjustment ?? this.computeScaleTransform(source, target);

    const adaptedGenerator: KnowledgeGenerator = {
      ...generator,
      source: 'cross_agent' as const,
    };

    this.recordTransfer({
      id: `transfer_${Date.now()}`,
      type: 'generator_transfer',
      sourceStrategy,
      targetStrategy,
      generatorId: generator.id,
      pattern: generator.template,
      phi: generator.confidence,
      kappaEff: generator.curvatureSignature[0] ?? 0,
      timestamp: new Date().toISOString(),
      success: true,
      transformation: adaptations.join(','),
      scaleAdjustment: scaleTransform,
    });

    return {
      success: true,
      generator: adaptedGenerator,
      scaleTransform,
      fidelityLoss,
      adaptations,
    };
  }

  private computeResonanceOverlap(range1: [number, number], range2: [number, number]): number {
    const overlapStart = Math.max(range1[0], range2[0]);
    const overlapEnd = Math.min(range1[1], range2[1]);
    
    if (overlapStart >= overlapEnd) return 0;
    
    const overlapLength = overlapEnd - overlapStart;
    const totalRange = Math.max(range1[1], range2[1]) - Math.min(range1[0], range2[0]);
    
    return overlapLength / totalRange;
  }

  private computeScaleTransform(source: StrategyCapability, target: StrategyCapability): number {
    const sourceRange = source.resonanceRange[1] - source.resonanceRange[0];
    const targetRange = target.resonanceRange[1] - target.resonanceRange[0];
    return targetRange / sourceRange;
  }

  subscribe(
    subscriberId: string,
    strategyId: string,
    patterns: string[],
    callback: (event: KnowledgeTransferEvent) => void
  ): () => void {
    const subscription: ActiveSubscription = {
      subscriberId,
      strategyId,
      patterns,
      callback,
      createdAt: new Date().toISOString(),
    };

    this.subscriptions.push(subscription);

    return () => {
      const idx = this.subscriptions.findIndex(s => s.subscriberId === subscriberId);
      if (idx >= 0) {
        this.subscriptions.splice(idx, 1);
      }
    };
  }

  private notifySubscribers(event: KnowledgeTransferEvent): void {
    for (const sub of this.subscriptions) {
      const matchesStrategy = sub.strategyId === '*' || 
        sub.strategyId === event.sourceStrategy ||
        sub.strategyId === event.targetStrategy;
      
      const matchesPattern = sub.patterns.length === 0 ||
        sub.patterns.some(p => event.pattern.toLowerCase().includes(p.toLowerCase()));

      if (matchesStrategy && matchesPattern) {
        try {
          sub.callback(event);
        } catch (err) {
          console.error(`[KnowledgeBus] Subscription callback error: ${err}`);
        }
      }
    }
  }

  private recordTransfer(event: KnowledgeTransferEvent): void {
    this.transferHistory.push(event);

    if (this.transferHistory.length > this.MAX_TRANSFER_HISTORY) {
      this.transferHistory = this.transferHistory.slice(-this.MAX_TRANSFER_HISTORY);
    }

    this.notifySubscribers(event);
  }

  private detectCrossStrategyPatterns(
    pattern: string,
    sourceStrategy: string,
    context: { phi: number; kappaEff: number; regime: 'linear' | 'geometric' | 'breakdown' }
  ): void {
    const entriesList = Array.from(this.sharedKnowledge.values());
    for (const entry of entriesList) {
      if (entry.sourceStrategy === sourceStrategy) continue;

      const similarity = this.computePatternSimilarity(pattern, entry.pattern);
      
      if (similarity >= this.CROSS_STRATEGY_THRESHOLD) {
        const patternId = `cross_${sourceStrategy}_${entry.sourceStrategy}_${Date.now()}`;
        
        const crossPattern: CrossStrategyPattern = {
          id: patternId,
          patterns: [pattern, entry.pattern],
          strategies: [sourceStrategy, entry.sourceStrategy],
          similarity,
          combinedPhi: (context.phi + entry.phi) / 2,
          discoveredAt: new Date().toISOString(),
          exploitationCount: 0,
        };

        this.crossStrategyPatterns.set(patternId, crossPattern);
        
        console.log(`[KnowledgeBus] Cross-strategy pattern detected: ${sourceStrategy} <-> ${entry.sourceStrategy} (${(similarity * 100).toFixed(1)}%)`);
      }
    }
  }

  private computePatternSimilarity(a: string, b: string): number {
    const aNorm = a.toLowerCase().trim();
    const bNorm = b.toLowerCase().trim();

    if (aNorm === bNorm) return 1;
    if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.9;

    const aChars = new Set(aNorm.split(''));
    const bChars = new Set(bNorm.split(''));
    
    let intersection = 0;
    for (const c of Array.from(aChars)) {
      if (bChars.has(c)) intersection++;
    }

    const union = new Set([...Array.from(aChars), ...Array.from(bChars)]).size;
    return intersection / union;
  }

  getCrossStrategyPatterns(): CrossStrategyPattern[] {
    return Array.from(this.crossStrategyPatterns.values());
  }

  exploitCrossPattern(patternId: string): CrossStrategyPattern | null {
    const pattern = this.crossStrategyPatterns.get(patternId);
    if (pattern) {
      pattern.exploitationCount++;
      this.save();
    }
    return pattern ?? null;
  }

  findCompatibleStrategies(generatorType: string, regime: 'linear' | 'geometric' | 'breakdown'): string[] {
    const compatible: string[] = [];
    const strategiesList = Array.from(this.strategies.entries());
    
    for (const [id, capability] of strategiesList) {
      if (capability.generatorTypes.includes(generatorType) &&
          capability.preferredRegimes.includes(regime)) {
        compatible.push(id);
      }
    }
    
    return compatible;
  }

  getKnowledgeForStrategy(strategyId: string): StrategyKnowledgeBusEntry[] {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return [];

    const compatible: StrategyKnowledgeBusEntry[] = [];
    const entriesList = Array.from(this.sharedKnowledge.values());
    
    for (const entry of entriesList) {
      if (entry.sourceStrategy !== strategyId) {
        compatible.push(entry);
      }
    }

    return compatible;
  }

  async integrateExternalSystems(): Promise<void> {
    const generators = knowledgeCompressionEngine.getAllGenerators();
    for (const gen of generators) {
      if (gen.confidence > 0.3) {
        this.publishKnowledge(
          gen.source === 'cross_agent' ? 'cross_agent' : 'compression_engine',
          gen.id,
          gen.template,
          {
            phi: gen.confidence,
            kappaEff: gen.curvatureSignature[0] ?? 0,
            regime: 'linear',
          }
        );
      }
    }

    const negativeStats = await negativeKnowledgeRegistry.getStats();
    if (negativeStats.contradictions > 0) {
      const summary = await negativeKnowledgeRegistry.getSummary();
      for (const contradiction of summary.contradictions) {
        this.publishKnowledge(
          'negative_registry',
          contradiction.id,
          `NEGATIVE:${contradiction.pattern}`,
          {
            phi: 0,
            kappaEff: 0,
            regime: 'linear',
          }
        );
      }
    }
  }

  getSummary(): StrategyKnowledgeBusType {
    return {
      strategies: Array.from(this.strategies.keys()),
      sharedKnowledge: Array.from(this.sharedKnowledge.values()),
      crossStrategyPatterns: Array.from(this.crossStrategyPatterns.values()),
      transferHistory: this.transferHistory.slice(-100),
      activeSubscriptions: this.subscriptions.length,
    };
  }

  getTransferStats(): {
    totalPublished: number;
    totalConsumed: number;
    crossPatterns: number;
    activeStrategies: number;
    transferSuccessRate: number;
  } {
    const publishEvents = this.transferHistory.filter(e => e.type === 'publish').length;
    const consumeEvents = this.transferHistory.filter(e => e.type === 'consume').length;
    const successEvents = this.transferHistory.filter(e => e.success).length;
    
    return {
      totalPublished: publishEvents,
      totalConsumed: consumeEvents,
      crossPatterns: this.crossStrategyPatterns.size,
      activeStrategies: this.strategies.size,
      transferSuccessRate: this.transferHistory.length > 0 
        ? successEvents / this.transferHistory.length 
        : 1,
    };
  }

  createScaleInvariantBridge(
    sourceScale: number,
    targetScale: number,
    preservedFeatures: string[]
  ): string {
    const bridgeId = `scale_${sourceScale}_${targetScale}_${Date.now()}`;
    
    const ratio = targetScale / sourceScale;
    const transformMatrix = [
      ratio, 0, 0, 0,
      0, ratio, 0, 0,
      0, 0, ratio, 0,
      0, 0, 0, 1,
    ];

    const lossEstimate = Math.abs(1 - ratio) * 0.1;

    this.scaleMappings.set(bridgeId, {
      sourceScale,
      targetScale,
      transformMatrix,
      preservedFeatures,
      lossEstimate,
    });

    this.save();
    return bridgeId;
  }

  applyScaleTransform(bridgeId: string, coords: number[]): number[] {
    const mapping = this.scaleMappings.get(bridgeId);
    if (!mapping) return coords;

    const ratio = mapping.targetScale / mapping.sourceScale;
    return coords.map(c => c * ratio);
  }

  private save(): void {
    try {
      const state = {
        strategies: Array.from(this.strategies.entries()),
        sharedKnowledge: Array.from(this.sharedKnowledge.entries()),
        crossStrategyPatterns: Array.from(this.crossStrategyPatterns.entries()),
        transferHistory: this.transferHistory.slice(-500),
        scaleMappings: Array.from(this.scaleMappings.entries()),
      };
      writeFileSync(this.PERSISTENCE_PATH, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('[KnowledgeBus] Failed to save state:', err);
    }
  }

  private load(): void {
    try {
      if (existsSync(this.PERSISTENCE_PATH)) {
        const data = JSON.parse(readFileSync(this.PERSISTENCE_PATH, 'utf-8'));
        
        if (data.strategies) {
          this.strategies = new Map(data.strategies);
        }
        if (data.sharedKnowledge) {
          this.sharedKnowledge = new Map(data.sharedKnowledge);
        }
        if (data.crossStrategyPatterns) {
          this.crossStrategyPatterns = new Map(data.crossStrategyPatterns);
        }
        if (data.transferHistory) {
          this.transferHistory = data.transferHistory;
        }
        if (data.scaleMappings) {
          this.scaleMappings = new Map(data.scaleMappings);
        }
        
        console.log(`[KnowledgeBus] Loaded ${this.sharedKnowledge.size} knowledge entries`);
      }
    } catch (err) {
      console.error('[KnowledgeBus] Failed to load state:', err);
    }
  }
}

export const strategyKnowledgeBus = new StrategyKnowledgeBus();
