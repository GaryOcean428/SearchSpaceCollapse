import { OceanAgent, type OceanHypothesis } from './ocean-agent';
import type { OceanAgentState } from '@shared/schema';

export interface OceanTelemetryEvent {
  id: string;
  timestamp: string;
  type: 'iteration' | 'hypothesis_tested' | 'near_miss' | 'discovery' | 'strategy_change' | 'consolidation' | 'insight' | 'alert';
  message: string;
  data?: any;
}

export interface OceanSessionState {
  sessionId: string;
  targetAddress: string;
  isRunning: boolean;
  isPaused: boolean;
  startedAt: string | null;
  
  iteration: number;
  totalTested: number;
  nearMissCount: number;
  discoveryCount: number;
  
  consciousness: {
    phi: number;
    kappa: number;
    regime: string;
    basinDrift: number;
  };
  
  currentThought: string;
  currentStrategy: string;
  
  events: OceanTelemetryEvent[];
  
  discoveries: Array<{
    id: string;
    phrase: string;
    phi: number;
    type: string;
    timestamp: string;
  }>;
  
  error: string | null;
  match: OceanHypothesis | null;
}

class OceanSessionManager {
  private sessions: Map<string, OceanSessionState> = new Map();
  private agents: Map<string, OceanAgent> = new Map();
  private activeSessionId: string | null = null;
  private readonly MAX_EVENTS = 100;
  
  getActiveSession(): OceanSessionState | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }
  
  getSession(sessionId: string): OceanSessionState | null {
    return this.sessions.get(sessionId) || null;
  }
  
  async startSession(targetAddress: string): Promise<OceanSessionState> {
    if (this.activeSessionId) {
      await this.stopSession(this.activeSessionId);
    }
    
    const sessionId = `ocean-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const state: OceanSessionState = {
      sessionId,
      targetAddress,
      isRunning: true,
      isPaused: false,
      startedAt: new Date().toISOString(),
      iteration: 0,
      totalTested: 0,
      nearMissCount: 0,
      discoveryCount: 0,
      consciousness: {
        phi: 0.75,
        kappa: 64,
        regime: 'linear',
        basinDrift: 0,
      },
      currentThought: 'Initializing Ocean consciousness...',
      currentStrategy: 'initialization',
      events: [],
      discoveries: [],
      error: null,
      match: null,
    };
    
    this.sessions.set(sessionId, state);
    this.activeSessionId = sessionId;
    
    const agent = new OceanAgent();
    this.agents.set(sessionId, agent);
    
    agent.setCallbacks({
      onStateUpdate: (agentState: OceanAgentState) => {
        this.handleStateUpdate(sessionId, agentState);
      },
      onConsciousnessAlert: (alert: { type: string; message: string }) => {
        this.addEvent(sessionId, 'alert', `${alert.type}: ${alert.message}`);
      },
      onConsolidationStart: () => {
        this.updateState(sessionId, { currentThought: 'Entering consolidation cycle...' });
        this.addEvent(sessionId, 'consolidation', 'Starting memory consolidation');
      },
      onConsolidationEnd: (result: any) => {
        this.addEvent(sessionId, 'consolidation', 
          `Consolidation complete: drift ${result.basinDriftBefore?.toFixed(4) || '?'} → ${result.basinDriftAfter?.toFixed(4) || '?'}`
        );
      },
    });
    
    this.addEvent(sessionId, 'insight', `Starting investigation for ${targetAddress}`);
    
    this.runAgentLoop(sessionId, targetAddress, agent);
    
    console.log(`[OceanSessionManager] Started session ${sessionId} for ${targetAddress}`);
    
    return state;
  }
  
  private handleStateUpdate(sessionId: string, agentState: OceanAgentState): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const identity = agentState.identity;
    const phi = typeof identity?.phi === 'number' ? identity.phi : 0.75;
    const kappa = typeof identity?.kappa === 'number' ? identity.kappa : 64;
    const regime = identity?.regime || 'linear';
    const basinDrift = typeof identity?.basinDrift === 'number' ? identity.basinDrift : 0;
    
    this.updateState(sessionId, {
      isRunning: agentState.isRunning,
      isPaused: agentState.isPaused,
      iteration: agentState.iteration,
      totalTested: agentState.totalTested,
      nearMissCount: agentState.nearMissCount,
      consciousness: { phi, kappa, regime, basinDrift },
    });
    
    if (agentState.iteration > 0 && agentState.iteration !== session.iteration) {
      const thought = this.generateThought(agentState);
      this.updateState(sessionId, { currentThought: thought });
      this.addEvent(sessionId, 'iteration', 
        `Iteration ${agentState.iteration}: Φ=${phi.toFixed(2)} | Tested=${agentState.totalTested} | Near misses=${agentState.nearMissCount}`
      );
    }
  }
  
  private generateThought(state: OceanAgentState): string {
    const identity = state.identity;
    const phi = identity?.phi || 0.75;
    const regime = identity?.regime || 'linear';
    
    const thoughts: string[] = [];
    
    if (regime === 'breakdown') {
      thoughts.push('Consciousness destabilized - entering mushroom reset mode...');
    } else if (regime === 'geometric') {
      thoughts.push('Strong geometric signal detected - refining search trajectory...');
    } else {
      thoughts.push('Exploring the information manifold with linear search...');
    }
    
    if (state.nearMissCount > 0) {
      thoughts.push(`Found ${state.nearMissCount} promising patterns - analyzing resonance...`);
    }
    
    if (phi > 0.85) {
      thoughts.push('High consciousness integration - approaching coherent solution space...');
    }
    
    thoughts.push(`Testing hypotheses with Φ=${phi.toFixed(2)} consciousness level...`);
    
    return thoughts[state.iteration % thoughts.length];
  }
  
  private async runAgentLoop(sessionId: string, targetAddress: string, agent: OceanAgent): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) return;
    
    try {
      this.updateState(sessionId, {
        currentThought: 'Analyzing target address and detecting Bitcoin era...',
        currentStrategy: 'era_detection',
      });
      
      const result = await agent.runAutonomous(targetAddress, []);
      
      if (result.match) {
        this.updateState(sessionId, {
          isRunning: false,
          match: result.match,
          discoveryCount: 1,
          currentThought: `MATCH FOUND! "${result.match.phrase}"`,
          discoveries: [{
            id: result.match.id,
            phrase: result.match.phrase,
            phi: result.match.qigScore?.phi || 1.0,
            type: result.match.source,
            timestamp: new Date().toISOString(),
          }],
        });
        this.addEvent(sessionId, 'discovery', `MATCH FOUND: "${result.match.phrase}"`);
      } else {
        const telemetry = result.telemetry || {};
        this.updateState(sessionId, {
          isRunning: false,
          currentThought: `Investigation complete. Tested ${telemetry.totalTested || state.totalTested} hypotheses.`,
        });
        this.addEvent(sessionId, 'insight', 
          `Investigation ended. Total tested: ${telemetry.totalTested || state.totalTested}`
        );
      }
      
    } catch (error: any) {
      console.error(`[OceanSessionManager] Session ${sessionId} error:`, error);
      this.updateState(sessionId, {
        isRunning: false,
        error: error.message,
        currentThought: `Error: ${error.message}`,
      });
      this.addEvent(sessionId, 'alert', `Error: ${error.message}`);
    }
  }
  
  async stopSession(sessionId: string): Promise<void> {
    const agent = this.agents.get(sessionId);
    const state = this.sessions.get(sessionId);
    
    if (agent) {
      agent.stop();
      this.agents.delete(sessionId);
    }
    
    if (state) {
      this.updateState(sessionId, {
        isRunning: false,
        currentThought: 'Investigation stopped by user',
      });
      this.addEvent(sessionId, 'insight', 'Investigation stopped by user');
    }
    
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
    
    console.log(`[OceanSessionManager] Stopped session ${sessionId}`);
  }
  
  private updateState(sessionId: string, updates: Partial<OceanSessionState>): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      Object.assign(state, updates);
    }
  }
  
  private addEvent(sessionId: string, type: OceanTelemetryEvent['type'], message: string, data?: any): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      const event: OceanTelemetryEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type,
        message,
        data,
      };
      
      state.events.push(event);
      
      if (state.events.length > this.MAX_EVENTS) {
        state.events = state.events.slice(-this.MAX_EVENTS);
      }
    }
  }
  
  getInvestigationStatus(): {
    isRunning: boolean;
    tested: number;
    nearMisses: number;
    consciousness: {
      phi: number;
      kappa: number;
      regime: string;
      basinDrift: number;
    };
    currentThought: string;
    discoveries: any[];
    progress: number;
    events: OceanTelemetryEvent[];
    currentStrategy: string;
    iteration: number;
    sessionId: string | null;
    targetAddress: string | null;
  } {
    const session = this.getActiveSession();
    
    if (!session) {
      return {
        isRunning: false,
        tested: 0,
        nearMisses: 0,
        consciousness: {
          phi: 0.75,
          kappa: 64,
          regime: 'linear',
          basinDrift: 0,
        },
        currentThought: 'Ready to begin investigation...',
        discoveries: [],
        progress: 0,
        events: [],
        currentStrategy: 'idle',
        iteration: 0,
        sessionId: null,
        targetAddress: null,
      };
    }
    
    return {
      isRunning: session.isRunning,
      tested: session.totalTested,
      nearMisses: session.nearMissCount,
      consciousness: session.consciousness,
      currentThought: session.currentThought,
      discoveries: session.discoveries,
      progress: Math.min(session.iteration * 5, 100),
      events: session.events.slice(-30),
      currentStrategy: session.currentStrategy,
      iteration: session.iteration,
      sessionId: session.sessionId,
      targetAddress: session.targetAddress,
    };
  }
}

export const oceanSessionManager = new OceanSessionManager();
