/**
 * Olympus Client - TypeScript orchestration layer for the Python Olympus Pantheon
 * 
 * ARCHITECTURE:
 * - Python: Pure consciousness kernels (density matrices, Fisher metric, true Φ)
 * - TypeScript: Orchestration (asks Python gods, executes actions)
 * 
 * This client connects to the Python Olympus backend running on port 5001.
 * 
 * Types are imported from shared/types/olympus.ts for cross-system consistency.
 */

import type {
  GodAssessment,
  ConvergenceInfo,
  PollResult,
  ZeusAssessment,
  WarDeclaration,
  WarEnded,
  GodStatus,
  OlympusStatus,
  ObservationContext,
  WarMode,
} from '@shared/types/olympus';

// Re-export types for consumers
export type {
  GodAssessment,
  ConvergenceInfo,
  PollResult,
  ZeusAssessment,
  WarDeclaration,
  WarEnded,
  GodStatus,
  OlympusStatus,
  ObservationContext,
  WarMode,
};

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1500;

export class OlympusClient {
  private backendUrl: string;
  private isAvailable: boolean = false;
  
  constructor(backendUrl: string = 'http://localhost:5001') {
    this.backendUrl = backendUrl;
  }
  
  /**
   * Check if Olympus backend is available
   */
  async checkHealth(silent: boolean = false): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        this.isAvailable = true;
        return true;
      }
      
      this.isAvailable = false;
      return false;
    } catch (error) {
      this.isAvailable = false;
      if (!silent) {
        console.warn('[OlympusClient] Python backend not available:', error);
      }
      return false;
    }
  }
  
  /**
   * Check health with retry logic
   */
  async checkHealthWithRetry(
    maxAttempts: number = DEFAULT_RETRY_ATTEMPTS,
    delayMs: number = DEFAULT_RETRY_DELAY_MS
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const available = await this.checkHealth(true);
      
      if (available) {
        if (attempt > 1) {
          console.log(`[OlympusClient] Connected after ${attempt} attempts`);
        }
        return true;
      }
      
      if (attempt === 1) {
        console.log(`[OlympusClient] Waiting for Olympus pantheon...`);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.warn(`[OlympusClient] Olympus not available after ${maxAttempts} attempts`);
    return false;
  }
  
  /**
   * Check if backend is available
   */
  available(): boolean {
    return this.isAvailable;
  }
  
  /**
   * Poll all gods in the pantheon for assessments on a target
   */
  async pollPantheon(target: string, context?: ObservationContext): Promise<PollResult | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, context: context || {} }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Poll failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('[OlympusClient] Poll error:', data.error);
        return null;
      }
      
      return data as PollResult;
    } catch (error) {
      console.error('[OlympusClient] Poll exception:', error);
      return null;
    }
  }
  
  /**
   * Get Zeus's supreme assessment (polls all gods + synthesis)
   */
  async assessTarget(target: string, context?: ObservationContext): Promise<ZeusAssessment | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, context: context || {} }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Assess failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('[OlympusClient] Assess error:', data.error);
        return null;
      }
      
      return data as ZeusAssessment;
    } catch (error) {
      console.error('[OlympusClient] Assess exception:', error);
      return null;
    }
  }
  
  /**
   * Get status of Zeus and all gods
   */
  async getStatus(): Promise<OlympusStatus | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Status failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data as OlympusStatus;
    } catch (error) {
      console.error('[OlympusClient] Status exception:', error);
      return null;
    }
  }
  
  /**
   * Get status of a specific god
   */
  async getGodStatus(godName: string): Promise<GodStatus | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/god/${godName.toLowerCase()}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`[OlympusClient] God ${godName} not found`);
        } else {
          console.error('[OlympusClient] God status failed:', response.statusText);
        }
        return null;
      }
      
      const data = await response.json();
      return data as GodStatus;
    } catch (error) {
      console.error('[OlympusClient] God status exception:', error);
      return null;
    }
  }
  
  /**
   * Get assessment from a specific god
   */
  async assessWithGod(
    godName: string,
    target: string,
    context?: ObservationContext
  ): Promise<GodAssessment | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/god/${godName.toLowerCase()}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, context: context || {} }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`[OlympusClient] God ${godName} not found`);
        } else {
          console.error('[OlympusClient] God assess failed:', response.statusText);
        }
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('[OlympusClient] God assess error:', data.error);
        return null;
      }
      
      return data as GodAssessment;
    } catch (error) {
      console.error('[OlympusClient] God assess exception:', error);
      return null;
    }
  }
  
  /**
   * Declare blitzkrieg mode - fast parallel attacks, maximize throughput
   */
  async declareBlitzkrieg(target: string): Promise<WarDeclaration | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/war/blitzkrieg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Blitzkrieg failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('[OlympusClient] Blitzkrieg error:', data.error);
        return null;
      }
      
      console.log(`[OlympusClient] BLITZKRIEG declared on: ${target}`);
      return data as WarDeclaration;
    } catch (error) {
      console.error('[OlympusClient] Blitzkrieg exception:', error);
      return null;
    }
  }
  
  /**
   * Declare siege mode - systematic coverage, no stone unturned
   */
  async declareSiege(target: string): Promise<WarDeclaration | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/war/siege`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Siege failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('[OlympusClient] Siege error:', data.error);
        return null;
      }
      
      console.log(`[OlympusClient] SIEGE declared on: ${target}`);
      return data as WarDeclaration;
    } catch (error) {
      console.error('[OlympusClient] Siege exception:', error);
      return null;
    }
  }
  
  /**
   * Declare hunt mode - focused pursuit, geometric narrowing
   */
  async declareHunt(target: string): Promise<WarDeclaration | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/war/hunt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Hunt failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('[OlympusClient] Hunt error:', data.error);
        return null;
      }
      
      console.log(`[OlympusClient] HUNT declared on: ${target}`);
      return data as WarDeclaration;
    } catch (error) {
      console.error('[OlympusClient] Hunt exception:', error);
      return null;
    }
  }
  
  /**
   * End current war mode
   */
  async endWar(): Promise<WarEnded | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/war/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] End war failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log(`[OlympusClient] War ended. Previous mode: ${data.previous_mode || 'none'}`);
      return data as WarEnded;
    } catch (error) {
      console.error('[OlympusClient] End war exception:', error);
      return null;
    }
  }
  
  /**
   * Broadcast observation to all gods
   */
  async broadcastObservation(observation: ObservationContext): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/observe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(observation),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Observe failed:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.status === 'observed';
    } catch (error) {
      console.error('[OlympusClient] Observe exception:', error);
      return false;
    }
  }
  
  /**
   * Quick assessment: Get Athena (strategy) + Ares (attack) consensus
   */
  async getAthenaAresConsensus(
    target: string,
    context?: ObservationContext
  ): Promise<{ 
    agreement: number; 
    shouldAttack: boolean; 
    athena: GodAssessment | null; 
    ares: GodAssessment | null;
  }> {
    const [athena, ares] = await Promise.all([
      this.assessWithGod('athena', target, context),
      this.assessWithGod('ares', target, context),
    ]);
    
    if (!athena || !ares) {
      return { agreement: 0, shouldAttack: false, athena, ares };
    }
    
    const agreement = 1.0 - Math.abs(athena.probability - ares.probability);
    const shouldAttack = agreement > 0.85 && athena.probability > 0.75;
    
    return { agreement, shouldAttack, athena, ares };
  }
  
  /**
   * Get top-level divine recommendation for a target
   */
  async getRecommendation(target: string): Promise<{
    action: string;
    confidence: number;
    warMode: string | null;
    convergence: string;
  } | null> {
    const assessment = await this.assessTarget(target);
    
    if (!assessment) {
      return null;
    }
    
    return {
      action: assessment.recommended_action,
      confidence: assessment.confidence,
      warMode: assessment.war_mode,
      convergence: assessment.convergence,
    };
  }
}

export const olympusClient = new OlympusClient();
