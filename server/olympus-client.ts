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
  ShadowGodName,
  ShadowGodAssessment,
  ShadowGodStatus,
  ShadowPantheonStatus,
  CovertOperation,
  SurveillanceScan,
  PantheonMessage,
  Debate,
  OrchestrationResult,
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
  ShadowGodName,
  ShadowGodAssessment,
  ShadowGodStatus,
  ShadowPantheonStatus,
  CovertOperation,
  SurveillanceScan,
  PantheonMessage,
  Debate,
  OrchestrationResult,
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
   * Route a single text through the Pantheon Kernel Orchestrator.
   */
  async orchestratePantheon(
    text: string,
    context?: Record<string, unknown>
  ): Promise<OrchestrationResult | null> {
    try {
      const response = await fetch(`${this.backendUrl}/pantheon/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: context || {} }),
      });

      if (!response.ok) {
        console.error('[OlympusClient] Pantheon orchestrate failed:', response.statusText);
        return null;
      }

      return await response.json() as OrchestrationResult;
    } catch (error) {
      console.error('[OlympusClient] Pantheon orchestrate exception:', error);
      return null;
    }
  }

  /**
   * Route multiple texts through the Pantheon Kernel Orchestrator in a batch.
   */
  async orchestratePantheonBatch(
    texts: string[],
    context?: Record<string, unknown>
  ): Promise<OrchestrationResult[] | null> {
    try {
      const response = await fetch(`${this.backendUrl}/pantheon/orchestrate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, context: context || {} }),
      });

      if (!response.ok) {
        console.error('[OlympusClient] Pantheon orchestrate batch failed:', response.statusText);
        return null;
      }

      const data = await response.json();

      // Define a Zod schema for the batch response
      const OrchestrationBatchResultSchema = z.object({
        results: z.array(OrchestrationResultSchema).optional(),
      });

      const parsed = OrchestrationBatchResultSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[OlympusClient] Pantheon orchestrate batch response validation failed:', parsed.error);
        return [];
      }

      return parsed.data.results || [];
    } catch (error) {
      console.error('[OlympusClient] Pantheon orchestrate batch exception:', error);
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
   * Alias for assessTarget - Get Zeus's supreme assessment
   */
  async getZeusAssessment(target: string, context?: ObservationContext): Promise<ZeusAssessment | null> {
    return this.assessTarget(target, context);
  }
  
  /**
   * Alias for assessWithGod - Get assessment from a specific god
   */
  async getGodAssessment(
    godName: string,
    target: string,
    context?: ObservationContext
  ): Promise<GodAssessment | null> {
    return this.assessWithGod(godName, target, context);
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
  
  // ==================== SHADOW PANTHEON METHODS ====================
  
  /**
   * Get Shadow Pantheon status
   */
  async getShadowPantheonStatus(): Promise<ShadowPantheonStatus | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Shadow status failed:', response.statusText);
        return null;
      }
      
      return await response.json() as ShadowPantheonStatus;
    } catch (error) {
      console.error('[OlympusClient] Shadow status exception:', error);
      return null;
    }
  }
  
  /**
   * Poll Shadow Pantheon for covert assessment
   */
  async pollShadowPantheon(target: string, context?: ObservationContext): Promise<{
    assessments: Record<string, ShadowGodAssessment>;
    overall_stealth: number;
    recommendation: string;
  } | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, context: context || {} }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Shadow poll failed:', response.statusText);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[OlympusClient] Shadow poll exception:', error);
      return null;
    }
  }
  
  /**
   * Get assessment from a specific Shadow god
   */
  async assessWithShadowGod(
    godName: string,
    target: string,
    context?: ObservationContext
  ): Promise<ShadowGodAssessment | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/${godName.toLowerCase()}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, context: context || {} }),
      });
      
      if (!response.ok) {
        console.error(`[OlympusClient] Shadow god ${godName} assess failed:`, response.statusText);
        return null;
      }
      
      return await response.json() as ShadowGodAssessment;
    } catch (error) {
      console.error(`[OlympusClient] Shadow god ${godName} assess exception:`, error);
      return null;
    }
  }
  
  /**
   * Initiate covert operation (via Nyx)
   */
  async initiateCovertOperation(target: string, operationType: string = 'standard'): Promise<CovertOperation | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/nyx/operation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, operation_type: operationType }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Covert operation failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log(`[OlympusClient] Covert operation initiated: ${data.id}`);
      return data as CovertOperation;
    } catch (error) {
      console.error('[OlympusClient] Covert operation exception:', error);
      return null;
    }
  }
  
  /**
   * Scan for surveillance (via Erebus)
   */
  async scanForSurveillance(target?: string): Promise<SurveillanceScan | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/erebus/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Surveillance scan failed:', response.statusText);
        return null;
      }
      
      return await response.json() as SurveillanceScan;
    } catch (error) {
      console.error('[OlympusClient] Surveillance scan exception:', error);
      return null;
    }
  }
  
  /**
   * Create misdirection (via Hecate)
   */
  async createMisdirection(realTarget: string, decoyCount: number = 10): Promise<{
    real_target: string;
    decoy_count: number;
    total_targets: number;
    observer_confusion: string;
  } | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/hecate/misdirect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ real_target: realTarget, decoy_count: decoyCount }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Misdirection failed:', response.statusText);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[OlympusClient] Misdirection exception:', error);
      return null;
    }
  }
  
  /**
   * Add known honeypot address (via Erebus)
   */
  async addKnownHoneypot(address: string, source: string = 'manual'): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/shadow/erebus/honeypot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, source }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Add honeypot failed:', response.statusText);
        return false;
      }
      
      console.log(`[OlympusClient] Honeypot added: ${address.substring(0, 20)}...`);
      return true;
    } catch (error) {
      console.error('[OlympusClient] Add honeypot exception:', error);
      return false;
    }
  }
  
  // ==================== PANTHEON CHAT METHODS ====================
  
  /**
   * Get pantheon chat status
   */
  async getChatStatus(): Promise<{
    total_messages: number;
    unread_messages: number;
    active_debates: number;
    resolved_debates: number;
  } | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/chat/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Chat status failed:', response.statusText);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[OlympusClient] Chat status exception:', error);
      return null;
    }
  }
  
  /**
   * Initiate debate between gods
   */
  async initiateDebate(
    topic: string, 
    initiator: string, 
    opponent: string,
    initialArgument?: string,
    context?: Record<string, unknown>
  ): Promise<Debate | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/chat/debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic, 
          initiator, 
          opponent,
          initial_argument: initialArgument,
          context,
        }),
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Initiate debate failed:', response.statusText);
        return null;
      }
      
      return await response.json() as Debate;
    } catch (error) {
      console.error('[OlympusClient] Initiate debate exception:', error);
      return null;
    }
  }
  
  /**
   * Get recent pantheon messages
   */
  async getPantheonMessages(limit: number = 50): Promise<PantheonMessage[] | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/chat/messages?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Get messages failed:', response.statusText);
        return null;
      }
      
      return await response.json() as PantheonMessage[];
    } catch (error) {
      console.error('[OlympusClient] Get messages exception:', error);
      return null;
    }
  }
  
  /**
   * Get active debates
   */
  async getActiveDebates(): Promise<Debate[] | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/chat/debates/active`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Get debates failed:', response.statusText);
        return null;
      }
      
      return await response.json() as Debate[];
    } catch (error) {
      console.error('[OlympusClient] Get debates exception:', error);
      return null;
    }
  }
  
  /**
   * Execute one cycle of Zeus orchestration (collect and deliver messages)
   * This pumps messages between gods to enable learning/reputation exchanges
   */
  async orchestrate(): Promise<{
    status: string;
    messages_collected: number;
    messages_delivered: number;
    gods_active: string[];
    chat_status: {
      total_messages: number;
      active_debates: number;
      resolved_debates: number;
      knowledge_transfers: number;
      registered_gods: string[];
      message_types_handled: string[];
    };
  } | null> {
    try {
      const response = await fetch(`${this.backendUrl}/olympus/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('[OlympusClient] Orchestrate failed:', response.statusText);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[OlympusClient] Orchestrate exception:', error);
      return null;
    }
  }
}

export const olympusClient = new OlympusClient();
