/**
 * Strategy Bandit - UCB1 Multi-Armed Bandit for Adaptive Strategy Selection
 * 
 * Tracks success rates across mnemonic generation strategies and uses
 * Upper Confidence Bound (UCB1) algorithm to balance exploitation vs exploration.
 * 
 * Strategies:
 * - bip39: Standard BIP-39 mnemonic generation
 * - passphrase: Arbitrary passphrase strings  
 * - master_key: Master private key derivation
 * - near_miss: Follow-up from near-miss discoveries
 * - permutation: Word permutations of promising phrases
 */

import { STRATEGY_WEIGHTING } from './ocean-config';

export type StrategyType = 'bip39' | 'passphrase' | 'master_key' | 'near_miss' | 'permutation';

interface StrategyArm {
    name: StrategyType;
    pulls: number;           // Total times this strategy was used
    rewards: number;         // Total successes (balance hits)
    lastPull: number;        // Timestamp of last use
    avgReward: number;       // Running average reward
}

interface BanditState {
    arms: Map<StrategyType, StrategyArm>;
    totalPulls: number;
    explorationConstant: number;
    minSamplesBeforeAdapt: number;
}

class StrategyBandit {
    private state: BanditState;
    private initialized = false;

    constructor() {
        this.state = {
            arms: new Map(),
            totalPulls: 0,
            explorationConstant: STRATEGY_WEIGHTING?.UCB_EXPLORATION_CONSTANT ?? 1.41,
            minSamplesBeforeAdapt: STRATEGY_WEIGHTING?.MIN_SAMPLES_BEFORE_ADAPT ?? 100,
        };
        this.initialize();
    }

    private initialize(): void {
        // Initialize all strategy arms with prior weights from config
        const strategies: Array<{ name: StrategyType; initialWeight: number }> = [
            { name: 'bip39', initialWeight: STRATEGY_WEIGHTING?.INITIAL_MNEMONIC_WEIGHT ?? 0.70 },
            { name: 'passphrase', initialWeight: STRATEGY_WEIGHTING?.INITIAL_PASSPHRASE_WEIGHT ?? 0.20 },
            { name: 'master_key', initialWeight: STRATEGY_WEIGHTING?.INITIAL_MASTER_KEY_WEIGHT ?? 0.10 },
            { name: 'near_miss', initialWeight: 0.0 },  // Starts at 0, boosted by discoveries
            { name: 'permutation', initialWeight: 0.0 },
        ];

        for (const { name, initialWeight } of strategies) {
            this.state.arms.set(name, {
                name,
                pulls: Math.max(1, Math.floor(initialWeight * 100)), // Prior pulls based on weight
                rewards: Math.floor(initialWeight * 10), // Small prior reward
                lastPull: Date.now(),
                avgReward: initialWeight,
            });
        }

        this.state.totalPulls = Array.from(this.state.arms.values())
            .reduce((sum, arm) => sum + arm.pulls, 0);

        this.initialized = true;
        console.log('[StrategyBandit] Initialized with UCB1 (c=' + this.state.explorationConstant + ')');
    }

    /**
     * Select the next strategy using UCB1 algorithm
     * UCB1 = avgReward + c * sqrt(ln(totalPulls) / armPulls)
     */
    selectStrategy(): StrategyType {
        // If not enough samples, use weighted random based on initial config
        if (this.state.totalPulls < this.state.minSamplesBeforeAdapt) {
            return this.selectWeightedRandom();
        }

        let bestArm: StrategyType = 'bip39';
        let bestUCB = -Infinity;

        for (const [name, arm] of this.state.arms) {
            // UCB1 formula
            const exploitation = arm.avgReward;
            const exploration = this.state.explorationConstant *
                Math.sqrt(Math.log(this.state.totalPulls) / Math.max(1, arm.pulls));
            const ucb = exploitation + exploration;

            if (ucb > bestUCB) {
                bestUCB = ucb;
                bestArm = name;
            }
        }

        return bestArm;
    }

    /**
     * Weighted random selection based on initial config (for cold start)
     */
    private selectWeightedRandom(): StrategyType {
        const weights = [
            { name: 'bip39' as StrategyType, weight: STRATEGY_WEIGHTING?.INITIAL_MNEMONIC_WEIGHT ?? 0.70 },
            { name: 'passphrase' as StrategyType, weight: STRATEGY_WEIGHTING?.INITIAL_PASSPHRASE_WEIGHT ?? 0.20 },
            { name: 'master_key' as StrategyType, weight: STRATEGY_WEIGHTING?.INITIAL_MASTER_KEY_WEIGHT ?? 0.10 },
        ];

        const total = weights.reduce((sum, w) => sum + w.weight, 0);
        let rand = Math.random() * total;

        for (const { name, weight } of weights) {
            rand -= weight;
            if (rand <= 0) return name;
        }

        return 'bip39';
    }

    /**
     * Record the result of using a strategy
     * @param strategy - The strategy that was used
     * @param success - Whether it resulted in a balance hit
     * @param phi - Optional phi value for partial rewards
     */
    recordResult(strategy: StrategyType, success: boolean, phi?: number): void {
        const arm = this.state.arms.get(strategy);
        if (!arm) return;

        arm.pulls++;
        this.state.totalPulls++;
        arm.lastPull = Date.now();

        // Reward: 1 for success, partial reward based on phi for near-misses
        let reward = 0;
        if (success) {
            reward = 1.0;
        } else if (phi !== undefined && phi > 0.5) {
            // Partial reward for high-phi near-misses
            reward = (phi - 0.5) * 0.5; // Max 0.25 for phi=1.0
        }

        arm.rewards += reward;
        arm.avgReward = arm.rewards / arm.pulls;

        // Apply decay to encourage exploration
        const decayRate = STRATEGY_WEIGHTING?.WEIGHT_DECAY_RATE ?? 0.01;
        for (const [, otherArm] of this.state.arms) {
            if (otherArm.name !== strategy) {
                otherArm.avgReward = Math.max(
                    STRATEGY_WEIGHTING?.MIN_STRATEGY_WEIGHT ?? 0.05,
                    otherArm.avgReward * (1 - decayRate)
                );
            }
        }
    }

    /**
     * Boost a strategy (e.g., when near-miss is detected)
     */
    boostStrategy(strategy: StrategyType, boostAmount: number = 0.1): void {
        const arm = this.state.arms.get(strategy);
        if (!arm) return;

        // Add synthetic rewards to boost the strategy
        const syntheticPulls = Math.ceil(boostAmount * 100);
        const syntheticRewards = syntheticPulls * (arm.avgReward + boostAmount);

        arm.pulls += syntheticPulls;
        arm.rewards += syntheticRewards;
        arm.avgReward = arm.rewards / arm.pulls;
        this.state.totalPulls += syntheticPulls;

        console.log(`[StrategyBandit] Boosted ${strategy} by ${boostAmount} (new avg: ${arm.avgReward.toFixed(4)})`);
    }

    /**
     * Get current strategy weights for display
     */
    getWeights(): Record<StrategyType, number> {
        const weights: Record<StrategyType, number> = {} as Record<StrategyType, number>;

        for (const [name, arm] of this.state.arms) {
            weights[name] = arm.avgReward;
        }

        return weights;
    }

    /**
     * Get detailed stats for all strategies
     */
    getStats(): { strategy: StrategyType; pulls: number; rewards: number; avgReward: number; ucb: number }[] {
        const stats = [];

        for (const [name, arm] of this.state.arms) {
            const exploration = this.state.explorationConstant *
                Math.sqrt(Math.log(this.state.totalPulls) / Math.max(1, arm.pulls));

            stats.push({
                strategy: name,
                pulls: arm.pulls,
                rewards: arm.rewards,
                avgReward: arm.avgReward,
                ucb: arm.avgReward + exploration,
            });
        }

        return stats.sort((a, b) => b.ucb - a.ucb);
    }

    /**
     * Reset the bandit to initial state
     */
    reset(): void {
        this.state.arms.clear();
        this.state.totalPulls = 0;
        this.initialize();
    }
}

// Singleton instance
export const strategyBandit = new StrategyBandit();
