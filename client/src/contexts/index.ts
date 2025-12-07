/**
 * CONTEXTS - Centralized Exports
 * 
 * React context providers for global state management.
 * Import from '@/contexts' for all context functionality.
 */

export { 
  ConsciousnessProvider, 
  useConsciousness,
  formatPhi,
  formatPhiDecimal,
  getPhiColor,
  getRegimeLabel,
  type ConsciousnessState,
  type NeurochemistryState,
} from './ConsciousnessContext';
