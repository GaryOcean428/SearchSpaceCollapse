import { eq } from "drizzle-orm";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  CrossStrategyPattern,
  GeneratorTransferPacket,
  InsertKnowledgeCrossPattern,
  InsertKnowledgeScaleMapping,
  InsertKnowledgeSharedEntry,
  InsertKnowledgeStrategy,
  InsertKnowledgeTransfer,
  KnowledgeGenerator,
  KnowledgeTransferEvent,
  StrategyKnowledgeBusEntry,
  StrategyKnowledgeBus as StrategyKnowledgeBusType,
  knowledgeCrossPatterns,
  knowledgeScaleMappings,
  knowledgeSharedEntries,
  knowledgeStrategies,
  knowledgeTransfers,
} from "../shared/schema";
import { db, withDbRetry } from "./db";
import { knowledgeCompressionEngine } from "./knowledge-compression-engine";
import { negativeKnowledgeUnified as negativeKnowledgeRegistry } from "./negative-knowledge-unified";
import "./temporal-geometry";

interface StrategyCapability {
  id: string;
  name: string;
  generatorTypes: string[];
  compressionMethods: string[];
  resonanceRange: [number, number];
  preferredRegimes: (
    | "linear"
    | "geometric"
    | "hierarchical"
    | "hierarchical_4d"
    | "4d_block_universe"
    | "breakdown"
  )[];
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

  private readonly PERSISTENCE_PATH = "./knowledge_bus_state.json";
  private readonly MAX_TRANSFER_HISTORY = 1000;
  private readonly CROSS_STRATEGY_THRESHOLD = 0.7;

  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.load();
    this.registerDefaultStrategies();
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
  }

  private registerDefaultStrategies(): void {
    const defaultStrategies: StrategyCapability[] = [
      {
        id: "era_patterns",
        name: "Era Pattern Analysis",
        generatorTypes: ["temporal", "grammatical"],
        compressionMethods: ["era_clustering", "temporal_entropy"],
        resonanceRange: [0.3, 0.7],
        preferredRegimes: ["linear", "geometric"],
      },
      {
        id: "brain_wallet_dict",
        name: "Brain Wallet Dictionary",
        generatorTypes: ["grammatical", "structural"],
        compressionMethods: ["dictionary_hash", "frequency_encode"],
        resonanceRange: [0.4, 0.9],
        preferredRegimes: ["linear"],
      },
      {
        id: "bitcoin_terms",
        name: "Bitcoin Terminology",
        generatorTypes: ["grammatical", "cross_format"],
        compressionMethods: ["term_graph", "semantic_embed"],
        resonanceRange: [0.5, 0.95],
        preferredRegimes: ["geometric"],
      },
      {
        id: "linguistic",
        name: "Linguistic Patterns",
        generatorTypes: ["grammatical", "structural"],
        compressionMethods: ["ngram_compress", "phonetic_hash"],
        resonanceRange: [0.2, 0.8],
        preferredRegimes: ["linear", "geometric"],
      },
      {
        id: "qig_basin_search",
        name: "QIG Basin Search",
        generatorTypes: ["geometric", "structural"],
        compressionMethods: ["basin_topology", "curvature_encode"],
        resonanceRange: [0.6, 1.0],
        preferredRegimes: ["geometric", "breakdown"],
      },
      {
        id: "historical_autonomous",
        name: "Historical Autonomous",
        generatorTypes: ["temporal", "cross_format"],
        compressionMethods: ["archive_chain", "temporal_graph"],
        resonanceRange: [0.3, 0.85],
        preferredRegimes: ["linear", "geometric"],
      },
      {
        id: "cross_format",
        name: "Cross Format Analysis",
        generatorTypes: ["cross_format", "geometric"],
        compressionMethods: ["format_bridge", "universal_hash"],
        resonanceRange: [0.4, 0.95],
        preferredRegimes: ["geometric", "breakdown"],
      },
    ];

    for (const strategy of defaultStrategies) {
      if (!this.strategies.has(strategy.id)) {
        this.strategies.set(strategy.id, strategy);
      }
    }

    this.persistStrategies();
  }

  private persistStrategies(): void {
    if (!db) return;

    const strategiesToInsert = Array.from(this.strategies.values());

    withDbRetry(async () => {
      for (const strategy of strategiesToInsert) {
        const insertData: InsertKnowledgeStrategy = {
          id: strategy.id,
          name: strategy.name,
          generatorTypes: strategy.generatorTypes,
          compressionMethods: strategy.compressionMethods,
          resonanceRangeMin: strategy.resonanceRange[0],
          resonanceRangeMax: strategy.resonanceRange[1],
          preferredRegimes: strategy.preferredRegimes,
        };

        await db!
          .insert(knowledgeStrategies)
          .values(insertData)
          .onConflictDoNothing();
      }
    }, "KnowledgeBus.persistStrategies").catch((err) => {
      console.error("[KnowledgeBus] Failed to persist strategies:", err);
    });
  }

  async registerStrategy(capability: StrategyCapability): Promise<void> {
    await this.ensureInitialized();
    this.strategies.set(capability.id, capability);
    console.log(`[KnowledgeBus] Registered strategy: ${capability.name}`);

    if (db) {
      const insertData: InsertKnowledgeStrategy = {
        id: capability.id,
        name: capability.name,
        generatorTypes: capability.generatorTypes,
        compressionMethods: capability.compressionMethods,
        resonanceRangeMin: capability.resonanceRange[0],
        resonanceRangeMax: capability.resonanceRange[1],
        preferredRegimes: capability.preferredRegimes,
      };

      withDbRetry(async () => {
        await db!
          .insert(knowledgeStrategies)
          .values(insertData)
          .onConflictDoUpdate({
            target: knowledgeStrategies.id,
            set: {
              name: insertData.name,
              generatorTypes: insertData.generatorTypes,
              compressionMethods: insertData.compressionMethods,
              resonanceRangeMin: insertData.resonanceRangeMin,
              resonanceRangeMax: insertData.resonanceRangeMax,
              preferredRegimes: insertData.preferredRegimes,
              updatedAt: new Date(),
            },
          });
      }, "KnowledgeBus.registerStrategy").catch((err) => {
        console.error("[KnowledgeBus] Failed to save strategy:", err);
      });
    }

    this.saveToJson();
  }

  async publishKnowledge(
    sourceStrategy: string,
    generatorId: string,
    pattern: string,
    context: {
      phi: number;
      kappaEff: number;
      regime:
        | "linear"
        | "geometric"
        | "hierarchical"
        | "hierarchical_4d"
        | "4d_block_universe"
        | "breakdown";
      basinCoords?: number[];
    }
  ): Promise<string> {
    await this.ensureInitialized();
    const entryId = `kb_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

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

    if (db) {
      const insertData: InsertKnowledgeSharedEntry = {
        id: entryId,
        sourceStrategy,
        generatorId,
        pattern,
        phi: context.phi,
        kappaEff: context.kappaEff,
        regime: context.regime,
        consumedBy: [],
        transformations: [],
      };

      withDbRetry(async () => {
        await db!.insert(knowledgeSharedEntries).values(insertData);
      }, "KnowledgeBus.publishKnowledge").catch((err) => {
        console.error("[KnowledgeBus] Failed to save knowledge entry:", err);
      });
    }

    this.notifySubscribers({
      id: `transfer_${Date.now()}`,
      type: "publish",
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

    this.saveToJson();
    return entryId;
  }

  async consumeKnowledge(
    targetStrategy: string,
    entryId: string,
    transformation?: string
  ): Promise<StrategyKnowledgeBusEntry | null> {
    await this.ensureInitialized();
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

    if (db) {
      withDbRetry(async () => {
        await db!
          .update(knowledgeSharedEntries)
          .set({
            consumedBy: entry.consumedBy,
            transformations: entry.transformations,
          })
          .where(eq(knowledgeSharedEntries.id, entryId));
      }, "KnowledgeBus.consumeKnowledge").catch((err) => {
        console.error("[KnowledgeBus] Failed to update knowledge entry:", err);
      });
    }

    this.recordTransfer({
      id: `transfer_${Date.now()}`,
      type: "consume",
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

    this.saveToJson();
    return entry;
  }

  async transferGenerator(
    sourceStrategy: string,
    targetStrategy: string,
    generator: KnowledgeGenerator,
    scaleAdjustment?: number
  ): Promise<GeneratorTransferPacket> {
    await this.ensureInitialized();
    const source = this.strategies.get(sourceStrategy);
    const target = this.strategies.get(targetStrategy);

    if (!source || !target) {
      return {
        success: false,
        generator: null,
        scaleTransform: 1,
        fidelityLoss: 1,
        adaptations: ["missing_strategy"],
      };
    }

    const hasMatchingType =
      generator.type && target.generatorTypes.includes(generator.type);
    const resonanceOverlap = this.computeResonanceOverlap(
      source.resonanceRange,
      target.resonanceRange
    );

    const adaptations: string[] = [];
    let fidelityLoss = 0;

    if (!hasMatchingType) {
      adaptations.push("type_adaptation");
      fidelityLoss += 0.1;
    }

    if (resonanceOverlap < 0.5) {
      adaptations.push("resonance_rescale");
      fidelityLoss += 0.15 * (1 - resonanceOverlap);
    }

    const regimeCompat = target.preferredRegimes.some((r) =>
      source.preferredRegimes.includes(r)
    );
    if (!regimeCompat) {
      adaptations.push("regime_bridge");
      fidelityLoss += 0.2;
    }

    const scaleTransform =
      scaleAdjustment ?? this.computeScaleTransform(source, target);

    const adaptedGenerator: KnowledgeGenerator = {
      ...generator,
      source: "cross_agent" as const,
    };

    this.recordTransfer({
      id: `transfer_${Date.now()}`,
      type: "generator_transfer",
      sourceStrategy,
      targetStrategy,
      generatorId: generator.id,
      pattern: generator.template,
      phi: generator.confidence,
      kappaEff: generator.curvatureSignature[0] ?? 0,
      timestamp: new Date().toISOString(),
      success: true,
      transformation: adaptations.join(","),
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

  private computeResonanceOverlap(
    range1: [number, number],
    range2: [number, number]
  ): number {
    const overlapStart = Math.max(range1[0], range2[0]);
    const overlapEnd = Math.min(range1[1], range2[1]);

    if (overlapStart >= overlapEnd) return 0;

    const overlapLength = overlapEnd - overlapStart;
    const totalRange =
      Math.max(range1[1], range2[1]) - Math.min(range1[0], range2[0]);

    return overlapLength / totalRange;
  }

  private computeScaleTransform(
    source: StrategyCapability,
    target: StrategyCapability
  ): number {
    const sourceRange = source.resonanceRange[1] - source.resonanceRange[0];
    const targetRange = target.resonanceRange[1] - target.resonanceRange[0];
    return targetRange / sourceRange;
  }

  async subscribe(
    subscriberId: string,
    strategyId: string,
    patterns: string[],
    callback: (event: KnowledgeTransferEvent) => void
  ): Promise<() => void> {
    await this.ensureInitialized();
    const subscription: ActiveSubscription = {
      subscriberId,
      strategyId,
      patterns,
      callback,
      createdAt: new Date().toISOString(),
    };

    this.subscriptions.push(subscription);

    return () => {
      const idx = this.subscriptions.findIndex(
        (s) => s.subscriberId === subscriberId
      );
      if (idx >= 0) {
        this.subscriptions.splice(idx, 1);
      }
    };
  }

  private notifySubscribers(event: KnowledgeTransferEvent): void {
    for (const sub of this.subscriptions) {
      const matchesStrategy =
        sub.strategyId === "*" ||
        sub.strategyId === event.sourceStrategy ||
        sub.strategyId === event.targetStrategy;

      const matchesPattern =
        sub.patterns.length === 0 ||
        sub.patterns.some((p) =>
          event.pattern.toLowerCase().includes(p.toLowerCase())
        );

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
      this.transferHistory = this.transferHistory.slice(
        -this.MAX_TRANSFER_HISTORY
      );
    }

    if (db) {
      const insertData: InsertKnowledgeTransfer = {
        id: event.id,
        type: event.type,
        sourceStrategy: event.sourceStrategy,
        targetStrategy: event.targetStrategy,
        generatorId: event.generatorId,
        pattern: event.pattern,
        phi: event.phi,
        kappaEff: event.kappaEff,
        success: event.success,
        transformation: event.transformation,
        scaleAdjustment: event.scaleAdjustment,
      };

      withDbRetry(async () => {
        await db!.insert(knowledgeTransfers).values(insertData);
      }, "KnowledgeBus.recordTransfer").catch((err) => {
        console.error("[KnowledgeBus] Failed to record transfer:", err);
      });
    }

    this.notifySubscribers(event);
  }

  private detectCrossStrategyPatterns(
    pattern: string,
    sourceStrategy: string,
    context: {
      phi: number;
      kappaEff: number;
      regime:
        | "linear"
        | "geometric"
        | "hierarchical"
        | "hierarchical_4d"
        | "4d_block_universe"
        | "breakdown";
    }
  ): void {
    const entriesList = Array.from(this.sharedKnowledge.values());
    for (const entry of entriesList) {
      if (entry.sourceStrategy === sourceStrategy) continue;

      const similarity = this.computePatternSimilarity(pattern, entry.pattern);

      if (similarity >= this.CROSS_STRATEGY_THRESHOLD) {
        const patternId = `cross_${sourceStrategy}_${
          entry.sourceStrategy
        }_${Date.now()}`;

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

        if (db) {
          const insertData: InsertKnowledgeCrossPattern = {
            id: patternId,
            patterns: crossPattern.patterns,
            strategies: crossPattern.strategies,
            similarity: crossPattern.similarity,
            combinedPhi: crossPattern.combinedPhi,
            exploitationCount: 0,
          };

          withDbRetry(async () => {
            await db!.insert(knowledgeCrossPatterns).values(insertData);
          }, "KnowledgeBus.detectCrossStrategyPatterns").catch((err) => {
            console.error("[KnowledgeBus] Failed to save cross pattern:", err);
          });
        }

        console.log(
          `[KnowledgeBus] Cross-strategy pattern detected: ${sourceStrategy} <-> ${
            entry.sourceStrategy
          } (${(similarity * 100).toFixed(1)}%)`
        );
      }
    }
  }

  private computePatternSimilarity(a: string, b: string): number {
    const aNorm = a.toLowerCase().trim();
    const bNorm = b.toLowerCase().trim();

    if (aNorm === bNorm) return 1;
    if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.9;

    const aChars = new Set(aNorm.split(""));
    const bChars = new Set(bNorm.split(""));

    let intersection = 0;
    for (const c of Array.from(aChars)) {
      if (bChars.has(c)) intersection++;
    }

    const union = new Set([...Array.from(aChars), ...Array.from(bChars)]).size;
    return intersection / union;
  }

  async getCrossStrategyPatterns(): Promise<CrossStrategyPattern[]> {
    await this.ensureInitialized();
    return Array.from(this.crossStrategyPatterns.values());
  }

  async exploitCrossPattern(
    patternId: string
  ): Promise<CrossStrategyPattern | null> {
    await this.ensureInitialized();
    const pattern = this.crossStrategyPatterns.get(patternId);
    if (pattern) {
      pattern.exploitationCount++;

      if (db) {
        withDbRetry(async () => {
          await db!
            .update(knowledgeCrossPatterns)
            .set({ exploitationCount: pattern.exploitationCount })
            .where(eq(knowledgeCrossPatterns.id, patternId));
        }, "KnowledgeBus.exploitCrossPattern").catch((err) => {
          console.error("[KnowledgeBus] Failed to update cross pattern:", err);
        });
      }

      this.saveToJson();
    }
    return pattern ?? null;
  }

  async findCompatibleStrategies(
    generatorType: string,
    regime:
      | "linear"
      | "geometric"
      | "hierarchical"
      | "hierarchical_4d"
      | "4d_block_universe"
      | "breakdown"
  ): Promise<string[]> {
    await this.ensureInitialized();
    const compatible: string[] = [];
    const strategiesList = Array.from(this.strategies.entries());

    for (const [id, capability] of strategiesList) {
      if (
        capability.generatorTypes.includes(generatorType) &&
        capability.preferredRegimes.includes(regime)
      ) {
        compatible.push(id);
      }
    }

    return compatible;
  }

  async getKnowledgeForStrategy(
    strategyId: string
  ): Promise<StrategyKnowledgeBusEntry[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();

    const generators = knowledgeCompressionEngine.getAllGenerators();
    for (const gen of generators) {
      if (gen.confidence > 0.3) {
        await this.publishKnowledge(
          gen.source === "cross_agent" ? "cross_agent" : "compression_engine",
          gen.id,
          gen.template,
          {
            phi: gen.confidence,
            kappaEff: gen.curvatureSignature[0] ?? 0,
            regime: "linear",
          }
        );
      }
    }

    const negativeStats = await negativeKnowledgeRegistry.getStats();
    if (negativeStats.contradictions > 0) {
      const summary = await negativeKnowledgeRegistry.getSummary();
      for (const contradiction of summary.contradictions) {
        await this.publishKnowledge(
          "negative_registry",
          contradiction.id,
          `NEGATIVE:${contradiction.pattern}`,
          {
            phi: 0,
            kappaEff: 0,
            regime: "linear",
          }
        );
      }
    }
  }

  async getSummary(): Promise<StrategyKnowledgeBusType> {
    await this.ensureInitialized();
    return {
      strategies: Array.from(this.strategies.keys()),
      sharedKnowledge: Array.from(this.sharedKnowledge.values()),
      crossStrategyPatterns: Array.from(this.crossStrategyPatterns.values()),
      transferHistory: this.transferHistory.slice(-100),
      activeSubscriptions: this.subscriptions.length,
    };
  }

  async getTransferStats(): Promise<{
    totalPublished: number;
    totalConsumed: number;
    crossPatterns: number;
    activeStrategies: number;
    transferSuccessRate: number;
  }> {
    await this.ensureInitialized();
    const publishEvents = this.transferHistory.filter(
      (e) => e.type === "publish"
    ).length;
    const consumeEvents = this.transferHistory.filter(
      (e) => e.type === "consume"
    ).length;
    const successEvents = this.transferHistory.filter((e) => e.success).length;

    return {
      totalPublished: publishEvents,
      totalConsumed: consumeEvents,
      crossPatterns: this.crossStrategyPatterns.size,
      activeStrategies: this.strategies.size,
      transferSuccessRate:
        this.transferHistory.length > 0
          ? successEvents / this.transferHistory.length
          : 1,
    };
  }

  async createScaleInvariantBridge(
    sourceScale: number,
    targetScale: number,
    preservedFeatures: string[]
  ): Promise<string> {
    await this.ensureInitialized();
    const bridgeId = `scale_${sourceScale}_${targetScale}_${Date.now()}`;

    const ratio = targetScale / sourceScale;
    const transformMatrix = [
      ratio,
      0,
      0,
      0,
      0,
      ratio,
      0,
      0,
      0,
      0,
      ratio,
      0,
      0,
      0,
      0,
      1,
    ];

    const lossEstimate = Math.abs(1 - ratio) * 0.1;

    this.scaleMappings.set(bridgeId, {
      sourceScale,
      targetScale,
      transformMatrix,
      preservedFeatures,
      lossEstimate,
    });

    if (db) {
      const insertData: InsertKnowledgeScaleMapping = {
        id: bridgeId,
        sourceScale,
        targetScale,
        transformMatrix,
        preservedFeatures,
        lossEstimate,
      };

      withDbRetry(async () => {
        await db!.insert(knowledgeScaleMappings).values(insertData);
      }, "KnowledgeBus.createScaleInvariantBridge").catch((err) => {
        console.error("[KnowledgeBus] Failed to save scale mapping:", err);
      });
    }

    this.saveToJson();
    return bridgeId;
  }

  async applyScaleTransform(
    bridgeId: string,
    coords: number[]
  ): Promise<number[]> {
    await this.ensureInitialized();
    const mapping = this.scaleMappings.get(bridgeId);
    if (!mapping) return coords;

    const ratio = mapping.targetScale / mapping.sourceScale;
    return coords.map((c) => c * ratio);
  }

  private saveToJson(): void {
    // Only save to JSON if database is unavailable (fallback mode)
    if (db) {
      return; // PostgreSQL is primary, skip JSON writes
    }

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
      console.error("[KnowledgeBus] Failed to save state to JSON:", err);
    }
  }

  private async load(): Promise<void> {
    if (db) {
      const loaded = await this.loadFromDatabase();
      if (loaded) {
        console.log(`[KnowledgeBus] Loaded from PostgreSQL`);
        return;
      }
    }

    this.loadFromJson();
  }

  private async loadFromDatabase(): Promise<boolean> {
    try {
      const [
        strategiesData,
        entriesData,
        crossPatternsData,
        transfersData,
        scaleMappingsData,
      ] = await Promise.all([
        withDbRetry(async () => {
          return await db!.select().from(knowledgeStrategies);
        }, "KnowledgeBus.loadStrategies"),

        withDbRetry(async () => {
          return await db!.select().from(knowledgeSharedEntries);
        }, "KnowledgeBus.loadEntries"),

        withDbRetry(async () => {
          return await db!.select().from(knowledgeCrossPatterns);
        }, "KnowledgeBus.loadCrossPatterns"),

        withDbRetry(async () => {
          return await db!
            .select()
            .from(knowledgeTransfers)
            .limit(this.MAX_TRANSFER_HISTORY);
        }, "KnowledgeBus.loadTransfers"),

        withDbRetry(async () => {
          return await db!.select().from(knowledgeScaleMappings);
        }, "KnowledgeBus.loadScaleMappings"),
      ]);

      if (strategiesData) {
        for (const row of strategiesData) {
          const capability: StrategyCapability = {
            id: row.id,
            name: row.name,
            generatorTypes: row.generatorTypes,
            compressionMethods: row.compressionMethods,
            resonanceRange: [row.resonanceRangeMin, row.resonanceRangeMax],
            preferredRegimes:
              row.preferredRegimes as StrategyCapability["preferredRegimes"],
          };
          this.strategies.set(row.id, capability);
        }
      }

      if (entriesData) {
        for (const row of entriesData) {
          const entry: StrategyKnowledgeBusEntry = {
            id: row.id,
            sourceStrategy: row.sourceStrategy,
            generatorId: row.generatorId,
            pattern: row.pattern,
            phi: row.phi,
            kappaEff: row.kappaEff,
            regime: row.regime as StrategyKnowledgeBusEntry["regime"],
            sharedAt: row.sharedAt.toISOString(),
            consumedBy: row.consumedBy || [],
            transformations:
              (row.transformations as StrategyKnowledgeBusEntry["transformations"]) ||
              [],
          };
          this.sharedKnowledge.set(row.id, entry);
        }
      }

      if (crossPatternsData) {
        for (const row of crossPatternsData) {
          const crossPattern: CrossStrategyPattern = {
            id: row.id,
            patterns: row.patterns,
            strategies: row.strategies,
            similarity: row.similarity,
            combinedPhi: row.combinedPhi,
            discoveredAt: row.discoveredAt.toISOString(),
            exploitationCount: row.exploitationCount || 0,
          };
          this.crossStrategyPatterns.set(row.id, crossPattern);
        }
      }

      if (transfersData) {
        this.transferHistory = transfersData.map((row) => ({
          id: row.id,
          type: row.type as KnowledgeTransferEvent["type"],
          sourceStrategy: row.sourceStrategy,
          targetStrategy: row.targetStrategy,
          generatorId: row.generatorId,
          pattern: row.pattern,
          phi: row.phi,
          kappaEff: row.kappaEff,
          timestamp: row.timestamp.toISOString(),
          success: row.success,
          transformation: row.transformation ?? undefined,
          scaleAdjustment: row.scaleAdjustment ?? undefined,
        }));
      }

      if (scaleMappingsData) {
        for (const row of scaleMappingsData) {
          const mapping: ScaleMapping = {
            sourceScale: row.sourceScale,
            targetScale: row.targetScale,
            transformMatrix: row.transformMatrix,
            preservedFeatures: row.preservedFeatures,
            lossEstimate: row.lossEstimate,
          };
          this.scaleMappings.set(row.id, mapping);
        }
      }

      console.log(
        `[KnowledgeBus] Loaded ${this.sharedKnowledge.size} knowledge entries, ${this.strategies.size} strategies from DB`
      );
      return true;
    } catch (err) {
      console.error("[KnowledgeBus] Failed to load from database:", err);
      return false;
    }
  }

  private loadFromJson(): void {
    try {
      if (existsSync(this.PERSISTENCE_PATH)) {
        const data = JSON.parse(readFileSync(this.PERSISTENCE_PATH, "utf-8"));

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

        console.log(
          `[KnowledgeBus] Loaded ${this.sharedKnowledge.size} knowledge entries from JSON fallback`
        );
      }
    } catch (err) {
      console.error("[KnowledgeBus] Failed to load state from JSON:", err);
    }
  }
}

export const strategyKnowledgeBus = new StrategyKnowledgeBus();
