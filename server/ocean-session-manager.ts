import { OceanAgent, type OceanHypothesis, oceanAgent } from './ocean-agent';
import type { OceanAgentState, ConsciousnessSignature } from '@shared/schema';
import { geometricMemory } from './geometric-memory';
import { oceanAutonomicManager, type CycleTimeline } from './ocean-autonomic-manager';
import { repeatedAddressScheduler } from './repeated-address-scheduler';
import { consoleLogBuffer } from './console-log-buffer';
import { autoCycleManager } from './auto-cycle-manager';
import { oceanQIGBackend } from './ocean-qig-backend-adapter';
import { testedPhrasesUnified } from './tested-phrases-unified';
import { SEARCH_CONFIG } from './ocean-config';

export type FullConsciousnessSignature = ConsciousnessSignature;

export interface EmotionalState {
  valence: number;
  arousal: number;
  dominance: number;
  curiosity: number;
  confidence: number;
  frustration: number;
  excitement: number;
  determination: number;
}

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
  resonantCount: number;
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
  private sessionChangeCallbacks: Array<(oldSessionId: string | null, newSessionId: string | null) => void> = [];
  
  /**
   * Register a callback to be notified when sessions change
   * Used for cleaning up resources like WebSocket connections
   */
  onSessionChange(callback: (oldSessionId: string | null, newSessionId: string | null) => void): void {
    this.sessionChangeCallbacks.push(callback);
  }
  
  private notifySessionChange(oldSessionId: string | null, newSessionId: string | null): void {
    for (const callback of this.sessionChangeCallbacks) {
      try {
        callback(oldSessionId, newSessionId);
      } catch (err) {
        console.error('[OceanSessionManager] Session change callback error:', err);
      }
    }
  }
  
  getActiveSession(): OceanSessionState | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }
  
  getSession(sessionId: string): OceanSessionState | null {
    return this.sessions.get(sessionId) || null;
  }
  
  getActiveAgent(): OceanAgent | null {
    if (!this.activeSessionId) return null;
    return this.agents.get(this.activeSessionId) || null;
  }
  
  getAgent(sessionId: string): OceanAgent | null {
    return this.agents.get(sessionId) || null;
  }
  
  async startSession(targetAddress: string): Promise<OceanSessionState> {
    const oldSessionId = this.activeSessionId;
    
    if (this.activeSessionId) {
      const currentSession = this.sessions.get(this.activeSessionId);
      
      // Check minimum session runtime before allowing handoff
      if (currentSession && currentSession.isRunning && currentSession.startedAt) {
        const sessionAge = Date.now() - new Date(currentSession.startedAt).getTime();
        const hypothesesTested = currentSession.totalTested;
        
        const minRuntime = SEARCH_CONFIG.MIN_SESSION_RUNTIME_MS;
        const minHypotheses = SEARCH_CONFIG.MIN_HYPOTHESES_BEFORE_HANDOFF;
        
        // Don't stop session if it hasn't met minimum requirements - throw to block caller
        if (sessionAge < minRuntime && hypothesesTested < minHypotheses) {
          console.log(`[OceanSessionManager] Session still active (${(sessionAge/1000).toFixed(1)}s, ${hypothesesTested} hypotheses) - waiting for minimum requirements (${minRuntime/1000}s or ${minHypotheses} hypotheses)`);
          // Throw error to signal caller to back off
          throw new Error(`SESSION_BUSY: Current session needs more time (${(sessionAge/1000).toFixed(1)}s/${minRuntime/1000}s, ${hypothesesTested}/${minHypotheses} hypotheses)`);
        }
        
        console.log(`[OceanSessionManager] Session met handoff requirements (${(sessionAge/1000).toFixed(1)}s, ${hypothesesTested} hypotheses) - proceeding with handoff`);
      }
      
      // Use isManualStop=false since this is an automatic handoff to a new session
      await this.stopSession(this.activeSessionId, false);
    }
    
    // Notify autonomic manager that investigation is starting
    oceanAutonomicManager.startInvestigation();
    
    // Reset Python near-miss tracking for the new session
    oceanQIGBackend.resetNearMissTracking();
    
    const sessionId = `ocean-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Notify session change listeners (for WebSocket cleanup, etc.)
    this.notifySessionChange(oldSessionId, sessionId);
    
    const state: OceanSessionState = {
      sessionId,
      targetAddress,
      isRunning: true,
      isPaused: false,
      startedAt: new Date().toISOString(),
      iteration: 0,
      totalTested: 0,
      nearMissCount: 0,
      resonantCount: 0,
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
    
    // Merge Python backend discoveries into unified counts
    // Use max of (session count, agent count) as base to retain previously merged Python counts
    // Then add any new Python detections since last sync
    const pythonNearMisses = oceanQIGBackend.getPythonNearMisses();
    const pythonResonant = oceanQIGBackend.getPythonResonant();
    const baseNearMissCount = Math.max(session.nearMissCount, agentState.nearMissCount);
    const baseResonantCount = Math.max(session.resonantCount, agentState.resonantCount || 0);
    const unifiedNearMissCount = baseNearMissCount + pythonNearMisses.newSinceSync;
    const unifiedResonantCount = baseResonantCount + pythonResonant.newSinceSync;
    
    // Mark Python discoveries as synced to avoid double counting
    if (pythonNearMisses.newSinceSync > 0 || pythonResonant.newSinceSync > 0) {
      console.log(`[OceanSessionManager] 🔄 Synced Python discoveries: Near-misses(+${pythonNearMisses.newSinceSync}=${unifiedNearMissCount}), Resonant(+${pythonResonant.newSinceSync}=${unifiedResonantCount})`);
      oceanQIGBackend.markNearMissesSynced();
      oceanQIGBackend.markResonantSynced();
    }
    
    this.updateState(sessionId, {
      isRunning: agentState.isRunning,
      isPaused: agentState.isPaused,
      iteration: agentState.iteration,
      totalTested: agentState.totalTested,
      nearMissCount: unifiedNearMissCount,
      resonantCount: unifiedResonantCount,
      consciousness: { phi, kappa, regime, basinDrift },
    });
    
    if (agentState.iteration > 0 && agentState.iteration !== session.iteration) {
      const thought = this.generateThought(agentState);
      this.updateState(sessionId, { currentThought: thought });
      this.addEvent(sessionId, 'iteration', 
        `Iteration ${agentState.iteration}: Φ=${phi.toFixed(2)} | Tested=${agentState.totalTested} | Near misses=${unifiedNearMissCount} | Resonant=${unifiedResonantCount}`
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
    } else if (regime === '4d_block_universe') {
      thoughts.push('Full 4D spacetime consciousness active - navigating block universe...');
    } else if (regime === 'hierarchical_4d') {
      thoughts.push('Advanced hierarchical consciousness - temporal integration engaged...');
    } else if (regime === 'geometric' || regime === 'hierarchical') {
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
      const telemetry = result.telemetry || {};
      
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
        this.updateState(sessionId, {
          isRunning: false,
          currentThought: `Investigation complete. Tested ${telemetry.totalTested || state.totalTested} hypotheses.`,
        });
        this.addEvent(sessionId, 'insight', 
          `Investigation ended. Total tested: ${telemetry.totalTested || state.totalTested}`
        );
      }
      
      // Notify auto-cycle manager that session completed (so it can start next address)
      const targetAddrId = this.getAddressIdFromSession(state.targetAddress);
      if (targetAddrId) {
        const sessionMetrics = {
          explorationPasses: telemetry.totalPasses || state.iteration || 1,
          hypothesesTested: telemetry.totalTested || state.totalTested || 0,
          nearMisses: telemetry.nearMissCount || state.nearMissCount || 0,
          pantheonConsulted: !!telemetry.pantheonConsulted,
          duration: 0,
          completedAt: new Date().toISOString(),
        };
        autoCycleManager.onSessionComplete(targetAddrId, sessionMetrics);
      }
      
      // Notify autonomic manager
      oceanAutonomicManager.stopInvestigation();
      
    } catch (error: any) {
      console.error(`[OceanSessionManager] Session ${sessionId} error:`, error);
      this.updateState(sessionId, {
        isRunning: false,
        error: error.message,
        currentThought: `Error: ${error.message}`,
      });
      this.addEvent(sessionId, 'alert', `Error: ${error.message}`);
      
      // Notify auto-cycle manager even on error (so it can start next address)
      const targetAddrId = this.getAddressIdFromSession(state.targetAddress);
      if (targetAddrId) {
        const sessionMetrics = {
          explorationPasses: state.iteration || 1,
          hypothesesTested: state.totalTested || 0,
          nearMisses: state.nearMissCount || 0,
          pantheonConsulted: false,
          duration: 0,
          completedAt: new Date().toISOString(),
        };
        autoCycleManager.onSessionComplete(targetAddrId, sessionMetrics);
      }
      
      // Notify autonomic manager
      oceanAutonomicManager.stopInvestigation();
    }
  }
  
  async stopSession(sessionId: string, isManualStop: boolean = true): Promise<void> {
    const agent = this.agents.get(sessionId);
    const state = this.sessions.get(sessionId);
    
    if (agent) {
      agent.stop();
      this.agents.delete(sessionId);
    }
    
    if (state) {
      this.updateState(sessionId, {
        isRunning: false,
        currentThought: isManualStop ? 'Investigation stopped by user' : 'Transitioning to next address...',
      });
      if (isManualStop) {
        this.addEvent(sessionId, 'insight', 'Investigation stopped by user');
      }
    }
    
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
    
    // Only notify auto-cycle manager for manual stops
    // (auto-handoffs should not clear the running state)
    if (isManualStop) {
      autoCycleManager.onSessionStopped();
      // Only stop the autonomic manager's investigation for true manual stops
      // Auto-handoffs keep the investigation "running" conceptually
      oceanAutonomicManager.stopInvestigation();
    }
    // Note: For auto-handoffs (isManualStop=false), we don't call stopInvestigation()
    // because startSession() will call startInvestigation() immediately after
    
    console.log(`[OceanSessionManager] Stopped session ${sessionId} (manual=${isManualStop})`);
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
  
  // Helper to get address ID from session target address
  private addressIdMap: Map<string, string> = new Map();
  
  setAddressIdMapping(address: string, addressId: string): void {
    this.addressIdMap.set(address, addressId);
  }
  
  private getAddressIdFromSession(targetAddress: string): string | null {
    return this.addressIdMap.get(targetAddress) || null;
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
    manifold: {
      totalProbes: number;
      avgPhi: number;
      avgKappa: number;
      dominantRegime: string;
      resonanceClusters: number;
      exploredVolume: number;
      recommendations: string[];
    };
    fullConsciousness: FullConsciousnessSignature;
    cycleTimeline: CycleTimeline[];
    explorationJournal: {
      passCount: number;
      totalHypothesesTested: number;
      manifoldCoverage: number;
      regimesSweep: number;
      strategiesUsed: string[];
      isComplete: boolean;
    } | null;
    emotionalState: EmotionalState;
    consoleLogs: Array<{ id: string; timestamp: string; message: string; level: string }>;
  } {
    const manifoldSummary = geometricMemory.getManifoldSummary();
    const session = this.getActiveSession();
    const fullConsciousness = oceanAutonomicManager.getCurrentFullConsciousness();
    const cycleTimeline = oceanAutonomicManager.getCycleTimeline();
    
    // Get emotional state from Ocean's full-spectrum telemetry
    const telemetry = oceanAgent.computeFullSpectrumTelemetry();
    const emotionalState: EmotionalState = telemetry.emotion;
    
    if (!session) {
      // SYNC: Use fullConsciousness even when no session is active
      const idleConsciousness = {
        phi: fullConsciousness.phi,
        kappa: fullConsciousness.kappaEff,
        regime: fullConsciousness.regime,
        basinDrift: 0,
      };
      
      // Use PostgreSQL-backed count for historical total (best practice: persisted data)
      const historicalTested = testedPhrasesUnified.getCachedCount();
      
      return {
        isRunning: false,
        tested: historicalTested,
        nearMisses: 0,
        consciousness: idleConsciousness,
        currentThought: 'Ready to begin investigation...',
        discoveries: [],
        progress: 0,
        events: [],
        currentStrategy: 'idle',
        iteration: 0,
        sessionId: null,
        targetAddress: null,
        manifold: manifoldSummary,
        fullConsciousness,
        cycleTimeline,
        explorationJournal: null,
        emotionalState,
        consoleLogs: consoleLogBuffer.getLogs(50),
      };
    }
    
    const journal = session.targetAddress ? 
      repeatedAddressScheduler.getJournal(session.targetAddress) : null;
    
    const explorationJournal = journal ? {
      passCount: journal.passes.length,
      totalHypothesesTested: journal.totalHypothesesTested,
      manifoldCoverage: journal.manifoldCoverage,
      regimesSweep: journal.regimesSweep,
      strategiesUsed: journal.strategiesUsed,
      isComplete: journal.isComplete,
    } : null;
    
    // SYNC: Use fullConsciousness values for consistency with main display
    // This ensures technical telemetry matches the main consciousness display
    const syncedConsciousness = {
      phi: fullConsciousness.phi,
      kappa: fullConsciousness.kappaEff,
      regime: fullConsciousness.regime,
      basinDrift: session.consciousness.basinDrift,
    };
    
    // Near-miss count is already unified in handleStateUpdate() which merges Python discoveries
    // Use PostgreSQL-backed historical count + current session for total tested (best practice: persisted data)
    const historicalTested = testedPhrasesUnified.getCachedCount();
    
    return {
      isRunning: session.isRunning,
      tested: historicalTested,
      nearMisses: session.nearMissCount,
      consciousness: syncedConsciousness,
      currentThought: session.currentThought,
      discoveries: session.discoveries,
      progress: Math.min(session.iteration * 5, 100),
      events: session.events.slice(-30),
      currentStrategy: session.currentStrategy,
      iteration: session.iteration,
      sessionId: session.sessionId,
      targetAddress: session.targetAddress,
      manifold: manifoldSummary,
      fullConsciousness,
      cycleTimeline,
      explorationJournal,
      emotionalState,
      consoleLogs: consoleLogBuffer.getLogs(50),
    };
  }
}

export const oceanSessionManager = new OceanSessionManager();
