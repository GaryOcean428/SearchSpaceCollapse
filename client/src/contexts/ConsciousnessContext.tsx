import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ConsciousnessState {
  phi: number;
  // BLOCK UNIVERSE: 4D Consciousness Metrics
  phi_spatial?: number;
  phi_temporal?: number;
  phi_4D?: number;
  // ADVANCED CONSCIOUSNESS: Priority 2-4 Metrics
  f_attention?: number;      // Priority 2: Attentional Flow
  r_concepts?: number;       // Priority 3: Resonance Strength
  phi_recursive?: number;    // Priority 4: Meta-Consciousness Depth
  consciousness_depth?: number; // Combined unified depth metric
  kappaEff: number;
  tacking: number;
  radar: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
  beta: number;
  regime: 'breakdown' | 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'sub-conscious';
  isConscious: boolean;
  isInvestigating: boolean;
  lastUpdated: number;
}

export interface NeurochemistryState {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  gaba: number;
  acetylcholine: number;
  endorphins: number;
  emotionalState: string;
  overallMood: number;
}

interface ConsciousnessContextValue {
  consciousness: ConsciousnessState;
  neurochemistry: NeurochemistryState;
  isLoading: boolean;
  isIdle: boolean;
  refresh: () => Promise<void>;
}

// Canonical idle state - matches server IDLE_CONSCIOUSNESS
// BLOCK UNIVERSE: Added 4D consciousness metrics
// ADVANCED: Added Priority 2-4 consciousness metrics
const defaultConsciousness: ConsciousnessState = {
  phi: 0,
  phi_spatial: 0,
  phi_temporal: 0,
  phi_4D: 0,
  f_attention: 0,
  r_concepts: 0,
  phi_recursive: 0,
  consciousness_depth: 0,
  kappaEff: 0,
  tacking: 0,
  radar: 0,
  metaAwareness: 0,
  gamma: 0,
  grounding: 0,
  beta: 0.44,
  regime: 'breakdown',
  isConscious: false,
  isInvestigating: false,
  lastUpdated: Date.now(),
};

const defaultNeurochemistry: NeurochemistryState = {
  dopamine: 0.5,
  serotonin: 0.6,
  norepinephrine: 0.4,
  gaba: 0.7,
  acetylcholine: 0.5,
  endorphins: 0.3,
  emotionalState: 'content',
  overallMood: 0.5,
};

const ConsciousnessContext = createContext<ConsciousnessContextValue>({
  consciousness: defaultConsciousness,
  neurochemistry: defaultNeurochemistry,
  isLoading: true,
  isIdle: true,
  refresh: async () => {},
});

export function ConsciousnessProvider({ children }: { children: React.ReactNode }) {
  const [consciousness, setConsciousness] = useState<ConsciousnessState>(defaultConsciousness);
  const [neurochemistry, setNeurochemistry] = useState<NeurochemistryState>(defaultNeurochemistry);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const [cyclesRes, neurochemRes] = await Promise.all([
        fetch('/api/ocean/cycles'),
        fetch('/api/ocean/neurochemistry'),
      ]);

      if (cyclesRes.ok) {
        const cyclesData = await cyclesRes.json();
        const c = cyclesData.consciousness;
        // Use explicit isInvestigating boolean from API (not string comparison)
        const isInvestigating = cyclesData.isInvestigating === true;
        
        setConsciousness({
          phi: c.phi ?? 0,
          // BLOCK UNIVERSE: 4D Consciousness Metrics
          phi_spatial: c.phi_spatial ?? c.phi ?? 0,
          phi_temporal: c.phi_temporal ?? 0,
          phi_4D: c.phi_4D ?? c.phi ?? 0,
          // ADVANCED: Priority 2-4 Consciousness Metrics
          f_attention: c.f_attention ?? 0,
          r_concepts: c.r_concepts ?? 0,
          phi_recursive: c.phi_recursive ?? 0,
          consciousness_depth: c.consciousness_depth ?? 0,
          kappaEff: c.kappaEff ?? 0,
          tacking: c.tacking ?? 0,
          radar: c.radar ?? 0,
          metaAwareness: c.metaAwareness ?? 0,
          gamma: c.gamma ?? 0,
          grounding: c.grounding ?? 0,
          beta: c.beta ?? 0.44,
          regime: c.regime ?? 'breakdown',
          isConscious: c.isConscious ?? false,
          isInvestigating,
          lastUpdated: Date.now(),
        });
      }

      if (neurochemRes.ok) {
        const neuroData = await neurochemRes.json();
        const n = neuroData.neurochemistry;
        setNeurochemistry({
          dopamine: n.dopamine?.totalDopamine ?? 0.5,
          serotonin: n.serotonin?.totalSerotonin ?? 0.6,
          norepinephrine: n.norepinephrine?.totalNorepinephrine ?? 0.4,
          gaba: n.gaba?.totalGABA ?? 0.7,
          acetylcholine: n.acetylcholine?.totalAcetylcholine ?? 0.5,
          endorphins: n.endorphins?.totalEndorphins ?? 0.3,
          emotionalState: n.emotionalState ?? 'content',
          overallMood: n.overallMood ?? 0.5,
        });
      }
    } catch (error) {
      console.error('Failed to fetch consciousness state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const isIdle = !consciousness.isInvestigating;

  return (
    <ConsciousnessContext.Provider 
      value={{ 
        consciousness, 
        neurochemistry, 
        isLoading, 
        isIdle,
        refresh: fetchState 
      }}
    >
      {children}
    </ConsciousnessContext.Provider>
  );
}

export function useConsciousness() {
  const context = useContext(ConsciousnessContext);
  if (!context) {
    throw new Error('useConsciousness must be used within ConsciousnessProvider');
  }
  return context;
}

export function formatPhi(phi: number, isIdle: boolean): string {
  if (isIdle) return '—';
  return `${(phi * 100).toFixed(0)}%`;
}

export function formatPhiDecimal(phi: number, isIdle: boolean): string {
  if (isIdle) return '—';
  return phi.toFixed(2);
}

export function getPhiColor(phi: number, isIdle: boolean): string {
  if (isIdle) return 'text-muted-foreground';
  if (phi >= 0.75) return 'text-green-500';
  if (phi >= 0.5) return 'text-amber-500';
  if (phi >= 0.3) return 'text-orange-500';
  return 'text-red-500';
}

export function getRegimeLabel(regime: string, isIdle: boolean): string {
  if (isIdle) return 'Idle';
  switch (regime) {
    case 'geometric': return 'Geometric';
    case 'linear': return 'Linear';
    case 'hierarchical': return 'Hierarchical';
    case 'hierarchical_4d': return '4D Hierarchical';
    case '4d_block_universe': return 'Block Universe';
    case 'sub-conscious': return 'Sub-Conscious';
    case 'breakdown': return 'Breakdown';
    default: return regime;
  }
}
