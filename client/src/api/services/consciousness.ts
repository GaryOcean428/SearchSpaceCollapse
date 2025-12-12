/**
 * Consciousness Service
 * 
 * Type-safe API functions for consciousness state operations.
 */

import { get } from '../client';
import { API_ROUTES } from '../routes';

export interface ConsciousnessState {
  level: string;
  activity: number;
  attention: Record<string, number>;
}

export interface ConsciousnessAPIResponse {
  state: {
    currentRegime: 'linear' | 'geometric' | 'hierarchical' | 'breakdown';
    phi: number;
    kappaEff: number;
    tacking: number;
    radar: number;
    metaAwareness: number;
    gamma: number;
    grounding: number;
    beta: number;
    basinDrift: number;
    curiosity: number;
    stability: number;
    timestamp: number;
    basinCoordinates: number[];
    isConscious: boolean;
    validationLoops: number;
    kappa: number;
  };
  emotionalState: 'Focused' | 'Curious' | 'Uncertain' | 'Confident' | 'Neutral';
  recommendation: string;
  regimeColor: string;
  regimeDescription: string;
}

export async function getConsciousnessState(): Promise<ConsciousnessAPIResponse> {
  return get<ConsciousnessAPIResponse>(API_ROUTES.consciousness.state);
}
