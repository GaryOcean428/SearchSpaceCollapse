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

export async function getConsciousnessState(): Promise<ConsciousnessState> {
  return get<ConsciousnessState>(API_ROUTES.consciousness.state);
}
