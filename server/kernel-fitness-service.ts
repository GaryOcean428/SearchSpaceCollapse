/**
 * Kernel Fitness Service - Near-Miss Based Evolution Rewards
 * 
 * Bridges the near-miss discovery system to kernel evolution, providing
 * fitness rewards that drive natural selection even without finding actual Bitcoin.
 * 
 * FITNESS REWARD SYSTEM:
 * - HOT tier near-miss: High reward (0.15 fitness boost)
 * - WARM tier near-miss: Medium reward (0.08 fitness boost)
 * - COOL tier near-miss: Small reward (0.03 fitness boost)
 * - Additional modifiers: Φ magnitude, escalation, cluster quality, BIP39 validity
 * 
 * EVOLUTION TRIGGERS:
 * - High fitness (>0.8): Eligible for reproduction (crossover/mutation)
 * - Low fitness (<0.2): Marked for culling
 * - Stagnant fitness: Evolution pressure increases
 * 
 * E8 POPULATION CONTROL:
 * - Maximum 240 live kernels (E8 root system count)
 * - Natural selection culls lowest fitness when cap exceeded
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import { NearMissEntry, NearMissTier } from './near-miss-manager';
import { EventEmitter } from 'events';

// Python backend URL for kernel evolution operations
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';

// Fitness reward constants by tier
const TIER_REWARDS = {
  hot: 0.15,
  warm: 0.08,
  cool: 0.03,
};

// Additional modifiers
const MODIFIERS = {
  PHI_MULTIPLIER: 1.5,        // High Φ gets bonus
  ESCALATION_BONUS: 0.05,     // Escalating entries get extra
  BIP39_VALID_BONUS: 0.1,     // Valid BIP39 phrases are valuable
  CLUSTER_QUALITY_BONUS: 0.03, // Being in a good cluster helps
  DECAY_RATE: 0.001,          // Fitness decays slowly over time
};

// Evolution thresholds
const EVOLUTION = {
  REPRODUCTION_THRESHOLD: 0.75,  // Can reproduce above this
  MUTATION_THRESHOLD: 0.6,       // Can mutate above this
  CULLING_THRESHOLD: 0.15,       // Marked for culling below this
  STAGNATION_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  E8_KERNEL_CAP: 240,            // Maximum live kernels
};

export interface KernelFitness {
  kernelId: string;
  phiCurrent: number;
  phiGradient: number;
  phiVelocity: number;
  kappaCurrent: number;
  kappaStability: number;
  fisherDiversity: number;
  geometricFitness: number;
  dimensionalState: string;
  evolutionPressure: number;
  cannibalizePriority: number;
  mergeAffinity: Record<string, number>;
  lastEvolutionEvent: string | null;
  fitnessComputedAt: Date;
  nearMissContributions: number;
  lastRewardAt: Date | null;
}

export interface EvolutionEvent {
  eventId: string;
  eventType: 'fitness_reward' | 'mutation' | 'crossover' | 'culling' | 'spawn';
  sourceKernelId: string | null;
  targetKernelId: string | null;
  resultKernelId: string | null;
  geometricReasoning: Record<string, any>;
  phiBefore: number;
  phiAfter: number;
  kappaBefore: number;
  kappaAfter: number;
  fisherDistance: number;
  fitnessDelta: number;
  occurredAt: Date;
}

export interface FitnessRewardResult {
  kernelId: string;
  previousFitness: number;
  newFitness: number;
  reward: number;
  tier: NearMissTier;
  modifiers: string[];
  evolutionTriggered: string | null;
}

class KernelFitnessService extends EventEmitter {
  private fitnessCache: Map<string, KernelFitness> = new Map();
  private kernelNearMissCounts: Map<string, number> = new Map();
  private lastEvolutionCheck: number = Date.now();
  private isInitialized = false;

  constructor() {
    super();
    this.initialize();
    this.setupEvolutionEventHandlers();
  }

  /**
   * Setup event handlers for evolution triggers - these call the Python backend
   */
  private setupEvolutionEventHandlers(): void {
    this.on('reproduction_eligible', async ({ kernelId, fitness }: { kernelId: string; fitness: KernelFitness }) => {
      await this.triggerEvolutionOnBackend('reproduction', kernelId, fitness);
    });

    this.on('mutation_eligible', async ({ kernelId, fitness }: { kernelId: string; fitness: KernelFitness }) => {
      await this.triggerEvolutionOnBackend('mutation', kernelId, fitness);
    });

    this.on('culling_candidate', async ({ kernelId, fitness }: { kernelId: string; fitness: KernelFitness }) => {
      await this.triggerEvolutionOnBackend('culling', kernelId, fitness);
    });

    this.on('kernel_culled', async ({ kernelId, reason }: { kernelId: string; reason: string }) => {
      console.log(`[KernelFitness] Kernel ${kernelId} culled: ${reason}`);
    });

    console.log('[KernelFitness] ✓ Evolution event handlers registered');
  }

  /**
   * Call Python backend to trigger evolution operations
   */
  private async triggerEvolutionOnBackend(
    eventType: 'mutation' | 'reproduction' | 'culling',
    kernelId: string,
    fitness: KernelFitness
  ): Promise<void> {
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/chaos/evolution/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          kernel_id: kernelId,
          fitness: fitness.geometricFitness,
          phi: fitness.phiCurrent,
          kappa: fitness.kappaCurrent,
          metadata: {
            evolution_pressure: fitness.evolutionPressure,
            near_miss_contributions: fitness.nearMissContributions,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[KernelFitness] Evolution triggered: ${eventType} for ${kernelId}`, result);
      } else {
        console.warn(`[KernelFitness] Evolution trigger failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`[KernelFitness] Failed to trigger evolution on backend:`, error);
    }
  }

  /**
   * Call Python backend to update kernel fitness
   */
  private async syncFitnessToPythonBackend(kernelId: string, fitness: KernelFitness): Promise<void> {
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/chaos/kernel/${kernelId}/fitness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phi_current: fitness.phiCurrent,
          phi_gradient: fitness.phiGradient,
          phi_velocity: fitness.phiVelocity,
          kappa_current: fitness.kappaCurrent,
          kappa_stability: fitness.kappaStability,
          fisher_diversity: fitness.fisherDiversity,
          geometric_fitness: fitness.geometricFitness,
          dimensional_state: fitness.dimensionalState,
          evolution_pressure: fitness.evolutionPressure,
          cannibalize_priority: fitness.cannibalizePriority,
        }),
      });

      if (!response.ok) {
        console.warn(`[KernelFitness] Python backend sync failed: ${response.status}`);
      }
    } catch (error) {
      // Non-critical - local DB write already succeeded
      console.debug(`[KernelFitness] Python backend sync error (non-critical):`, error);
    }
  }

  private async initialize(): Promise<void> {
    try {
      await this.ensureTables();
      await this.loadFitnessCache();
      this.isInitialized = true;
      console.log('[KernelFitness] ✓ Service initialized');
    } catch (error) {
      console.error('[KernelFitness] Initialization error:', error);
    }
  }

  private async ensureTables(): Promise<void> {
    // Tables are created by the Python backend's M8SpawnerPersistence
    // Just verify they exist
    if (!db) {
      console.log('[KernelFitness] Database not available');
      return;
    }
    try {
      await db.execute(sql`
        SELECT 1 FROM kernel_evolution_fitness LIMIT 1
      `);
    } catch {
      console.log('[KernelFitness] Evolution tables not yet created by Python backend');
    }
  }

  private async loadFitnessCache(): Promise<void> {
    if (!db) return;
    try {
      const results = await db.execute(sql`
        SELECT 
          kernel_id,
          phi_current,
          phi_gradient,
          phi_velocity,
          kappa_current,
          kappa_stability,
          fisher_diversity,
          geometric_fitness,
          dimensional_state,
          evolution_pressure,
          cannibalize_priority,
          merge_affinity,
          last_evolution_event,
          fitness_computed_at
        FROM kernel_evolution_fitness
      `);

      for (const row of results.rows as any[]) {
        this.fitnessCache.set(row.kernel_id, {
          kernelId: row.kernel_id,
          phiCurrent: row.phi_current || 0,
          phiGradient: row.phi_gradient || 0,
          phiVelocity: row.phi_velocity || 0,
          kappaCurrent: row.kappa_current || 0,
          kappaStability: row.kappa_stability || 0,
          fisherDiversity: row.fisher_diversity || 0,
          geometricFitness: row.geometric_fitness || 0.5,
          dimensionalState: row.dimensional_state || 'D3',
          evolutionPressure: row.evolution_pressure || 0,
          cannibalizePriority: row.cannibalize_priority || 0,
          mergeAffinity: row.merge_affinity || {},
          lastEvolutionEvent: row.last_evolution_event,
          fitnessComputedAt: row.fitness_computed_at || new Date(),
          nearMissContributions: 0,
          lastRewardAt: null,
        });
      }
      console.log(`[KernelFitness] Loaded ${this.fitnessCache.size} kernel fitness records`);
    } catch (error) {
      console.log('[KernelFitness] No fitness records to load yet');
    }
  }

  /**
   * Get or create fitness record for a kernel
   */
  async getKernelFitness(kernelId: string): Promise<KernelFitness> {
    if (this.fitnessCache.has(kernelId)) {
      return this.fitnessCache.get(kernelId)!;
    }

    // Create new fitness record with default values
    const newFitness: KernelFitness = {
      kernelId,
      phiCurrent: 0.5,
      phiGradient: 0,
      phiVelocity: 0,
      kappaCurrent: 0.5,
      kappaStability: 0.5,
      fisherDiversity: 0,
      geometricFitness: 0.5, // Start at neutral
      dimensionalState: 'D3',
      evolutionPressure: 0,
      cannibalizePriority: 0,
      mergeAffinity: {},
      lastEvolutionEvent: null,
      fitnessComputedAt: new Date(),
      nearMissContributions: 0,
      lastRewardAt: null,
    };

    this.fitnessCache.set(kernelId, newFitness);
    await this.persistFitness(kernelId, newFitness);
    return newFitness;
  }

  /**
   * Award fitness to a kernel based on a near-miss discovery
   */
  async awardNearMissFitness(
    kernelId: string,
    nearMiss: NearMissEntry
  ): Promise<FitnessRewardResult> {
    const fitness = await this.getKernelFitness(kernelId);
    const previousFitness = fitness.geometricFitness;
    
    // Calculate base reward from tier
    let reward = TIER_REWARDS[nearMiss.tier];
    const modifiers: string[] = [];

    // Apply Φ magnitude modifier (higher Φ = higher reward)
    if (nearMiss.phi > 0.7) {
      reward *= MODIFIERS.PHI_MULTIPLIER;
      modifiers.push('high_phi');
    }

    // Escalation bonus
    if (nearMiss.isEscalating) {
      reward += MODIFIERS.ESCALATION_BONUS;
      modifiers.push('escalating');
    }

    // BIP39 validity bonus
    if (nearMiss.structuralSignature?.isBip39Valid) {
      reward += MODIFIERS.BIP39_VALID_BONUS;
      modifiers.push('bip39_valid');
    }

    // Cluster quality bonus (if in a cluster with high average Φ)
    if (nearMiss.clusterId) {
      reward += MODIFIERS.CLUSTER_QUALITY_BONUS;
      modifiers.push('clustered');
    }

    // Apply reward to fitness (with ceiling at 1.0)
    fitness.geometricFitness = Math.min(1.0, fitness.geometricFitness + reward);
    fitness.phiCurrent = nearMiss.phi;
    fitness.kappaCurrent = nearMiss.kappa;
    fitness.nearMissContributions++;
    fitness.lastRewardAt = new Date();
    fitness.fitnessComputedAt = new Date();

    // Update gradients (moving average)
    const alpha = 0.3;
    fitness.phiGradient = alpha * nearMiss.phi + (1 - alpha) * fitness.phiGradient;

    // Reduce evolution pressure (activity resets stagnation)
    fitness.evolutionPressure = Math.max(0, fitness.evolutionPressure - 0.1);

    // Update cannibalization priority (inverse of fitness)
    fitness.cannibalizePriority = 1.0 - fitness.geometricFitness;

    // Persist changes
    await this.persistFitness(kernelId, fitness);

    // Record evolution event
    await this.recordEvolutionEvent({
      eventType: 'fitness_reward',
      sourceKernelId: kernelId,
      targetKernelId: null,
      resultKernelId: null,
      geometricReasoning: {
        nearMissId: nearMiss.id,
        tier: nearMiss.tier,
        modifiers,
        phrase: nearMiss.phrase.substring(0, 20) + '...',
      },
      phiBefore: previousFitness,
      phiAfter: fitness.geometricFitness,
      kappaBefore: 0,
      kappaAfter: nearMiss.kappa,
      fisherDistance: 0,
      fitnessDelta: reward,
    });

    // Check for evolution triggers
    let evolutionTriggered: string | null = null;
    if (fitness.geometricFitness >= EVOLUTION.REPRODUCTION_THRESHOLD) {
      evolutionTriggered = 'eligible_reproduction';
      this.emit('reproduction_eligible', { kernelId, fitness });
    } else if (fitness.geometricFitness >= EVOLUTION.MUTATION_THRESHOLD) {
      evolutionTriggered = 'eligible_mutation';
      this.emit('mutation_eligible', { kernelId, fitness });
    }

    return {
      kernelId,
      previousFitness,
      newFitness: fitness.geometricFitness,
      reward,
      tier: nearMiss.tier,
      modifiers,
      evolutionTriggered,
    };
  }

  /**
   * Apply fitness decay to inactive kernels
   */
  async applyFitnessDecay(): Promise<{ decayed: number; culled: string[] }> {
    const now = Date.now();
    let decayed = 0;
    const culled: string[] = [];
    const decayedKernels: Array<{ kernel_id: string; new_fitness: number; evolution_pressure: number; cannibalize_priority: number }> = [];

    for (const [kernelId, fitness] of this.fitnessCache) {
      const lastActivity = fitness.lastRewardAt?.getTime() || fitness.fitnessComputedAt.getTime();
      const inactiveMs = now - lastActivity;

      if (inactiveMs > EVOLUTION.STAGNATION_WINDOW_MS) {
        // Apply decay
        const decayAmount = MODIFIERS.DECAY_RATE * (inactiveMs / 1000 / 60); // per minute
        fitness.geometricFitness = Math.max(0, fitness.geometricFitness - decayAmount);
        fitness.evolutionPressure = Math.min(1.0, fitness.evolutionPressure + 0.05);
        fitness.cannibalizePriority = 1.0 - fitness.geometricFitness;
        decayed++;

        decayedKernels.push({
          kernel_id: kernelId,
          new_fitness: fitness.geometricFitness,
          evolution_pressure: fitness.evolutionPressure,
          cannibalize_priority: fitness.cannibalizePriority,
        });

        // Check for culling threshold
        if (fitness.geometricFitness < EVOLUTION.CULLING_THRESHOLD) {
          culled.push(kernelId);
          this.emit('culling_candidate', { kernelId, fitness });
        }

        await this.persistFitness(kernelId, fitness);
      }
    }

    // Batch sync decay to Python backend
    if (decayedKernels.length > 0) {
      try {
        await fetch(`${PYTHON_BACKEND_URL}/chaos/fitness/decay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decayed_kernels: decayedKernels }),
        });
      } catch (error) {
        console.debug('[KernelFitness] Python decay sync error (non-critical):', error);
      }
    }

    return { decayed, culled };
  }

  /**
   * E8 Population Control - Cull weakest kernels when over cap
   */
  async enforceE8Cap(): Promise<{ culledCount: number; culledKernels: string[] }> {
    const liveKernels = await this.getLiveKernelCount();
    
    if (liveKernels <= EVOLUTION.E8_KERNEL_CAP) {
      return { culledCount: 0, culledKernels: [] };
    }

    const excess = liveKernels - EVOLUTION.E8_KERNEL_CAP;
    const candidates = await this.getCannibalizationCandidates(excess);
    const culledKernels: string[] = [];

    for (const candidate of candidates) {
      try {
        await this.cullKernel(candidate.kernelId, 'e8_population_control');
        culledKernels.push(candidate.kernelId);
      } catch (error) {
        console.error(`[KernelFitness] Failed to cull kernel ${candidate.kernelId}:`, error);
      }
    }

    // Sync culled kernels to Python backend
    if (culledKernels.length > 0) {
      try {
        await fetch(`${PYTHON_BACKEND_URL}/chaos/e8/enforce-cap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kernels_to_cull: culledKernels,
            reason: 'e8_population_control',
          }),
        });
      } catch (error) {
        console.debug('[KernelFitness] Python E8 cap sync error (non-critical):', error);
      }
    }

    console.log(`[KernelFitness] E8 cap enforced: culled ${culledKernels.length} kernels`);
    return { culledCount: culledKernels.length, culledKernels };
  }

  private async cullKernel(kernelId: string, reason: string): Promise<void> {
    const fitness = this.fitnessCache.get(kernelId);
    
    // Record culling event
    await this.recordEvolutionEvent({
      eventType: 'culling',
      sourceKernelId: kernelId,
      targetKernelId: null,
      resultKernelId: null,
      geometricReasoning: { reason, fitness: fitness?.geometricFitness || 0 },
      phiBefore: fitness?.phiCurrent || 0,
      phiAfter: 0,
      kappaBefore: fitness?.kappaCurrent || 0,
      kappaAfter: 0,
      fisherDistance: 0,
      fitnessDelta: -(fitness?.geometricFitness || 0),
    });

    // Mark kernel as culled in database
    if (db) {
      await db.execute(sql`
        UPDATE m8_spawned_kernels 
        SET status = 'culled', retired_at = NOW()
        WHERE kernel_id = ${kernelId}
      `);
    }

    // Remove from cache
    this.fitnessCache.delete(kernelId);
    
    this.emit('kernel_culled', { kernelId, reason });
  }

  private async getLiveKernelCount(): Promise<number> {
    if (!db) return 0;
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM m8_spawned_kernels 
        WHERE status IN ('active', 'observing', 'shadow')
      `);
      return Number((result.rows[0] as any)?.count || 0);
    } catch {
      return 0;
    }
  }

  private async getCannibalizationCandidates(limit: number): Promise<KernelFitness[]> {
    // Get kernels sorted by cannibalization priority (highest first = weakest)
    const candidates = Array.from(this.fitnessCache.values())
      .sort((a, b) => b.cannibalizePriority - a.cannibalizePriority)
      .slice(0, limit);
    
    return candidates;
  }

  /**
   * Get kernels eligible for reproduction
   */
  getReproductionCandidates(): KernelFitness[] {
    return Array.from(this.fitnessCache.values())
      .filter(f => f.geometricFitness >= EVOLUTION.REPRODUCTION_THRESHOLD)
      .sort((a, b) => b.geometricFitness - a.geometricFitness);
  }

  /**
   * Get kernels eligible for mutation
   */
  getMutationCandidates(): KernelFitness[] {
    return Array.from(this.fitnessCache.values())
      .filter(f => 
        f.geometricFitness >= EVOLUTION.MUTATION_THRESHOLD &&
        f.geometricFitness < EVOLUTION.REPRODUCTION_THRESHOLD
      )
      .sort((a, b) => b.geometricFitness - a.geometricFitness);
  }

  /**
   * Get evolution statistics
   */
  async getEvolutionStats(): Promise<{
    totalKernels: number;
    liveKernels: number;
    avgFitness: number;
    maxFitness: number;
    minFitness: number;
    reproductionEligible: number;
    mutationEligible: number;
    cullingCandidates: number;
    recentEvents: number;
    e8CapStatus: string;
  }> {
    const fitnesses = Array.from(this.fitnessCache.values());
    const liveCount = await this.getLiveKernelCount();
    
    let totalFitness = 0;
    let maxFitness = 0;
    let minFitness = 1;
    let reproductionCount = 0;
    let mutationCount = 0;
    let cullingCount = 0;

    for (const f of fitnesses) {
      totalFitness += f.geometricFitness;
      if (f.geometricFitness > maxFitness) maxFitness = f.geometricFitness;
      if (f.geometricFitness < minFitness) minFitness = f.geometricFitness;
      if (f.geometricFitness >= EVOLUTION.REPRODUCTION_THRESHOLD) reproductionCount++;
      else if (f.geometricFitness >= EVOLUTION.MUTATION_THRESHOLD) mutationCount++;
      if (f.geometricFitness < EVOLUTION.CULLING_THRESHOLD) cullingCount++;
    }

    // Count recent events
    let recentEvents = 0;
    if (db) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM kernel_evolution_events 
          WHERE occurred_at > NOW() - INTERVAL '24 hours'
        `);
        recentEvents = Number((result.rows[0] as any)?.count || 0);
      } catch { /* ignore */ }
    }

    const e8Ratio = liveCount / EVOLUTION.E8_KERNEL_CAP;
    const e8CapStatus = e8Ratio >= 1.0 ? 'AT_CAP' : 
                        e8Ratio >= 0.9 ? 'NEAR_CAP' : 
                        e8Ratio >= 0.5 ? 'HEALTHY' : 'LOW';

    return {
      totalKernels: fitnesses.length,
      liveKernels: liveCount,
      avgFitness: fitnesses.length > 0 ? totalFitness / fitnesses.length : 0,
      maxFitness,
      minFitness: fitnesses.length > 0 ? minFitness : 0,
      reproductionEligible: reproductionCount,
      mutationEligible: mutationCount,
      cullingCandidates: cullingCount,
      recentEvents,
      e8CapStatus,
    };
  }

  /**
   * Get recent evolution events
   */
  async getRecentEvents(limit: number = 20): Promise<EvolutionEvent[]> {
    if (!db) return [];
    try {
      const result = await db.execute(sql`
        SELECT * FROM kernel_evolution_events
        ORDER BY occurred_at DESC
        LIMIT ${limit}
      `);
      
      return (result.rows as any[]).map(row => ({
        eventId: row.event_id,
        eventType: row.event_type,
        sourceKernelId: row.source_kernel_id,
        targetKernelId: row.target_kernel_id,
        resultKernelId: row.result_kernel_id,
        geometricReasoning: row.geometric_reasoning || {},
        phiBefore: row.phi_before || 0,
        phiAfter: row.phi_after || 0,
        kappaBefore: row.kappa_before || 0,
        kappaAfter: row.kappa_after || 0,
        fisherDistance: row.fisher_distance || 0,
        fitnessDelta: row.fitness_delta || 0,
        occurredAt: row.occurred_at,
      }));
    } catch {
      return [];
    }
  }

  private async persistFitness(kernelId: string, fitness: KernelFitness): Promise<void> {
    // Write to local database first
    if (db) {
      try {
        await db.execute(sql`
          INSERT INTO kernel_evolution_fitness
          (kernel_id, phi_current, phi_gradient, phi_velocity,
           kappa_current, kappa_stability, fisher_diversity,
           geometric_fitness, dimensional_state, evolution_pressure,
           cannibalize_priority, merge_affinity, last_evolution_event,
           fitness_computed_at)
          VALUES (
            ${kernelId}, ${fitness.phiCurrent}, ${fitness.phiGradient}, ${fitness.phiVelocity},
            ${fitness.kappaCurrent}, ${fitness.kappaStability}, ${fitness.fisherDiversity},
            ${fitness.geometricFitness}, ${fitness.dimensionalState}, ${fitness.evolutionPressure},
            ${fitness.cannibalizePriority}, ${JSON.stringify(fitness.mergeAffinity)}, 
            ${fitness.lastEvolutionEvent}, NOW()
          )
          ON CONFLICT (kernel_id) DO UPDATE SET
            phi_current = EXCLUDED.phi_current,
            phi_gradient = EXCLUDED.phi_gradient,
            phi_velocity = EXCLUDED.phi_velocity,
            kappa_current = EXCLUDED.kappa_current,
            kappa_stability = EXCLUDED.kappa_stability,
            fisher_diversity = EXCLUDED.fisher_diversity,
            geometric_fitness = EXCLUDED.geometric_fitness,
            dimensional_state = EXCLUDED.dimensional_state,
            evolution_pressure = EXCLUDED.evolution_pressure,
            cannibalize_priority = EXCLUDED.cannibalize_priority,
            merge_affinity = EXCLUDED.merge_affinity,
            last_evolution_event = EXCLUDED.last_evolution_event,
            fitness_computed_at = NOW()
        `);
      } catch (error) {
        console.error('[KernelFitness] Failed to persist fitness:', error);
      }
    }

    // Also sync to Python backend
    await this.syncFitnessToPythonBackend(kernelId, fitness);
  }

  private async recordEvolutionEvent(event: Omit<EvolutionEvent, 'eventId' | 'occurredAt'>): Promise<void> {
    if (!db) return;
    const eventId = `evo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    try {
      await db.execute(sql`
        INSERT INTO kernel_evolution_events
        (event_id, event_type, source_kernel_id, target_kernel_id,
         result_kernel_id, geometric_reasoning, phi_before, phi_after,
         kappa_before, kappa_after, fisher_distance, fitness_delta, occurred_at)
        VALUES (
          ${eventId}, ${event.eventType}, ${event.sourceKernelId}, ${event.targetKernelId},
          ${event.resultKernelId}, ${JSON.stringify(event.geometricReasoning)},
          ${event.phiBefore}, ${event.phiAfter}, ${event.kappaBefore}, ${event.kappaAfter},
          ${event.fisherDistance}, ${event.fitnessDelta}, NOW()
        )
      `);
    } catch (error) {
      console.error('[KernelFitness] Failed to record evolution event:', error);
    }
  }

  /**
   * Attribute a near-miss to the most appropriate kernel
   */
  async attributeNearMissToKernel(nearMiss: NearMissEntry): Promise<string | null> {
    if (!db) return null;
    // Get all active kernels
    try {
      const result = await db.execute(sql`
        SELECT kernel_id, god_name, domain, affinity_strength
        FROM m8_spawned_kernels
        WHERE status IN ('active', 'observing')
        ORDER BY affinity_strength DESC
        LIMIT 10
      `);

      const kernels = result.rows as any[];
      if (kernels.length === 0) {
        return null;
      }

      // Simple attribution: use round-robin based on near-miss count
      // In a full implementation, this would use geometric similarity
      const counts = Array.from(this.kernelNearMissCounts.entries());
      let minCount = Infinity;
      let selectedKernel: string | null = null;

      for (const kernel of kernels) {
        const count = this.kernelNearMissCounts.get(kernel.kernel_id) || 0;
        if (count < minCount) {
          minCount = count;
          selectedKernel = kernel.kernel_id;
        }
      }

      if (selectedKernel) {
        this.kernelNearMissCounts.set(
          selectedKernel, 
          (this.kernelNearMissCounts.get(selectedKernel) || 0) + 1
        );
      }

      return selectedKernel;
    } catch {
      return null;
    }
  }

  /**
   * Process a near-miss discovery and award fitness to appropriate kernel
   */
  async processNearMissDiscovery(nearMiss: NearMissEntry): Promise<FitnessRewardResult | null> {
    // Attribute to a kernel
    const kernelId = await this.attributeNearMissToKernel(nearMiss);
    if (!kernelId) {
      console.log('[KernelFitness] No kernel to attribute near-miss to');
      return null;
    }

    // Award fitness
    const result = await this.awardNearMissFitness(kernelId, nearMiss);
    
    console.log(
      `[KernelFitness] Awarded ${result.reward.toFixed(4)} fitness to ${kernelId} ` +
      `(${result.tier} tier, Φ=${nearMiss.phi.toFixed(3)}, new fitness=${result.newFitness.toFixed(3)})`
    );

    return result;
  }
}

// Singleton instance
export const kernelFitnessService = new KernelFitnessService();

// Export for use in other modules
export default kernelFitnessService;
