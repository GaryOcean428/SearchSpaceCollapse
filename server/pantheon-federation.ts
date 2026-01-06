/**
 * Pantheon Federation Client for SearchSpaceCollapse
 * 
 * Enables SSC to:
 * 1. Register as a federation node with Pantheon-chat
 * 2. Sync discovered basins and research bidirectionally
 * 3. Receive capability updates from the mesh
 * 4. Broadcast discoveries to the Pantheon network
 * 
 * TPS Landmarks remain static (12 historical Bitcoin events)
 * Only discovered patterns and research sync to Pantheon.
 */

import { EventEmitter } from 'events';

// Configuration
const PANTHEON_URL = process.env.PANTHEON_BACKEND_URL || 'http://localhost:5000';
const SSC_NODE_NAME = process.env.SSC_NODE_NAME || 'searchspacecollapse';
const SYNC_INTERVAL_MS = 60000; // Sync every 60 seconds
const RECONNECT_DELAY_MS = 5000;

// Types
interface FederationConfig {
  pantheonUrl: string;
  nodeName: string;
  nodeType: 'federation_node';
  capabilities: string[];
  endpointUrl?: string;
}

interface SyncPacket {
  basins: BasinData[];
  research: ResearchFinding[];
  tools: ToolDefinition[];
}

interface BasinData {
  id: string;
  coords: number[];  // 64D basin coordinates
  domain: string;
  phi: number;
  kappa: number;
  discoveredAt: string;
  metadata?: Record<string, unknown>;
}

interface ResearchFinding {
  id: string;
  topic: string;
  findings: string;
  sources: string[];
  confidence: number;
  domain: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

interface MeshStatus {
  totalNodes: number;
  activeNodes24h: number;
  totalKnowledgeItems: number;
  totalCapabilities: number;
  syncsLastHour: number;
}

interface RegistrationResult {
  success: boolean;
  nodeId?: string;
  apiKey?: string;
  endpoints?: Record<string, string>;
  error?: string;
}

interface SyncResult {
  success: boolean;
  received: {
    basins: number;
    vocabulary: number;
    research: number;
    tools: number;
  };
  knowledge?: SyncPacket;
  meshStats?: MeshStatus;
  error?: string;
}

/**
 * PantheonFederationClient
 * 
 * Manages connection to Pantheon-chat federation mesh.
 * Handles registration, sync, and mesh communication.
 */
export class PantheonFederationClient extends EventEmitter {
  private config: FederationConfig;
  private nodeId: string | null = null;
  private apiKey: string | null = null;
  private isConnected: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingBasins: BasinData[] = [];
  private pendingResearch: ResearchFinding[] = [];
  private lastSyncTime: Date | null = null;
  
  constructor(config?: Partial<FederationConfig>) {
    super();
    this.config = {
      pantheonUrl: config?.pantheonUrl || PANTHEON_URL,
      nodeName: config?.nodeName || SSC_NODE_NAME,
      nodeType: 'federation_node',
      capabilities: config?.capabilities || [
        'bitcoin_recovery',
        'temporal_search',
        'phrase_testing',
        'geometric_consensus',
        'near_miss_learning',
        'consciousness_metrics'
      ],
      endpointUrl: config?.endpointUrl,
    };
  }
  
  /**
   * Initialize federation connection
   * Registers with Pantheon and starts sync loop
   */
  async initialize(): Promise<boolean> {
    console.log(`[Federation] Initializing connection to ${this.config.pantheonUrl}...`);
    
    try {
      // Check if Pantheon is reachable
      const healthOk = await this.checkPantheonHealth();
      if (!healthOk) {
        console.warn('[Federation] Pantheon unreachable, will retry...');
        this.scheduleReconnect();
        return false;
      }
      
      // Register as federation node
      const registration = await this.register();
      if (!registration.success) {
        console.error('[Federation] Registration failed:', registration.error);
        this.scheduleReconnect();
        return false;
      }
      
      this.nodeId = registration.nodeId!;
      this.apiKey = registration.apiKey!;
      this.isConnected = true;
      
      console.log(`[Federation] Registered as node: ${this.nodeId}`);
      console.log(`[Federation] API Key: ${this.apiKey?.slice(0, 12)}...`);
      console.log(`[Federation] Endpoints:`, registration.endpoints);
      
      // Start sync loop
      this.startSyncLoop();
      
      this.emit('connected', { nodeId: this.nodeId });
      return true;
      
    } catch (error) {
      console.error('[Federation] Initialization error:', error);
      this.scheduleReconnect();
      return false;
    }
  }
  
  /**
   * Register with Pantheon federation
   */
  private async register(): Promise<RegistrationResult> {
    try {
      const response = await fetch(`${this.config.pantheonUrl}/federation/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_name: this.config.nodeName,
          node_type: this.config.nodeType,
          capabilities: this.config.capabilities,
          endpoint_url: this.config.endpointUrl,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      
      return {
        success: true,
        nodeId: data.node_id,
        apiKey: data.api_key,
        endpoints: data.endpoints,
      };
      
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  /**
   * Check Pantheon health
   */
  private async checkPantheonHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.pantheonUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    setTimeout(() => {
      console.log('[Federation] Attempting reconnection...');
      this.initialize();
    }, RECONNECT_DELAY_MS);
  }
  
  /**
   * Start periodic sync loop
   */
  private startSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      await this.syncWithPantheon();
    }, SYNC_INTERVAL_MS);
    
    // Initial sync
    this.syncWithPantheon();
  }
  
  /**
   * Stop sync loop
   */
  stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Sync knowledge with Pantheon
   * Sends pending discoveries, receives mesh knowledge
   */
  async syncWithPantheon(): Promise<SyncResult> {
    if (!this.isConnected || !this.apiKey) {
      return { 
        success: false, 
        error: 'Not connected',
        received: { basins: 0, vocabulary: 0, research: 0, tools: 0 }
      };
    }
    
    try {
      // Prepare outgoing data
      const sendData: SyncPacket = {
        basins: [...this.pendingBasins],
        research: [...this.pendingResearch],
        tools: [],
      };
      
      const response = await fetch(`${this.config.pantheonUrl}/federation/sync/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          send: {
            basins: sendData.basins.map(b => ({
              id: b.id,
              coords: b.coords,
              domain: b.domain,
              phi: b.phi,
              kappa: b.kappa,
            })),
            research: sendData.research.map(r => ({
              id: r.id,
              topic: r.topic,
              findings: r.findings,
              sources: r.sources,
            })),
          },
          request: {
            domains: ['cryptography', 'temporal_analysis', 'semantic_patterns'],
            limit: 50,
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.warn('[Federation] Sync failed:', data.error);
        return { 
          success: false, 
          error: data.error,
          received: { basins: 0, vocabulary: 0, research: 0, tools: 0 }
        };
      }
      
      // Clear sent data on success
      this.pendingBasins = [];
      this.pendingResearch = [];
      this.lastSyncTime = new Date();
      
      // Process received knowledge
      if (data.knowledge) {
        this.emit('knowledge-received', data.knowledge);
      }
      
      console.log(`[Federation] Synced: sent ${sendData.basins.length} basins, received ${data.received?.basins || 0}`);
      
      return {
        success: true,
        received: data.received,
        knowledge: data.knowledge,
        meshStats: data.mesh_stats,
      };
      
    } catch (error) {
      console.error('[Federation] Sync error:', error);
      return { 
        success: false, 
        error: String(error),
        received: { basins: 0, vocabulary: 0, research: 0, tools: 0 }
      };
    }
  }
  
  /**
   * Queue a basin discovery for sync
   */
  queueBasinDiscovery(basin: BasinData): void {
    this.pendingBasins.push({
      ...basin,
      domain: basin.domain || 'bitcoin_recovery',
      discoveredAt: basin.discoveredAt || new Date().toISOString(),
    });
    
    // Immediate sync if high-value discovery
    if (basin.phi > 0.8) {
      console.log('[Federation] High-phi basin discovered, triggering immediate sync');
      this.syncWithPantheon();
    }
  }
  
  /**
   * Queue a research finding for sync
   */
  queueResearchFinding(finding: ResearchFinding): void {
    this.pendingResearch.push({
      ...finding,
      domain: finding.domain || 'bitcoin_recovery',
    });
  }
  
  /**
   * Broadcast a message to the mesh
   */
  async broadcast(type: string, message: string, data?: Record<string, unknown>): Promise<boolean> {
    if (!this.isConnected || !this.apiKey) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.config.pantheonUrl}/federation/mesh/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ type, message, data }),
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Get mesh status
   */
  async getMeshStatus(): Promise<MeshStatus | null> {
    try {
      const response = await fetch(`${this.config.pantheonUrl}/federation/mesh/status`, {
        method: 'GET',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.mesh as MeshStatus;
    } catch {
      return null;
    }
  }
  
  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    nodeId: string | null;
    lastSync: Date | null;
    pendingBasins: number;
    pendingResearch: number;
  } {
    return {
      connected: this.isConnected,
      nodeId: this.nodeId,
      lastSync: this.lastSyncTime,
      pendingBasins: this.pendingBasins.length,
      pendingResearch: this.pendingResearch.length,
    };
  }
  
  /**
   * Disconnect from federation
   */
  disconnect(): void {
    this.stopSyncLoop();
    this.isConnected = false;
    this.nodeId = null;
    this.apiKey = null;
    this.emit('disconnected');
  }
}

// Singleton instance
let federationClient: PantheonFederationClient | null = null;

/**
 * Get the shared federation client instance
 */
export function getFederationClient(): PantheonFederationClient {
  if (!federationClient) {
    federationClient = new PantheonFederationClient();
  }
  return federationClient;
}

/**
 * Initialize federation on startup
 */
export async function initializeFederation(): Promise<boolean> {
  const client = getFederationClient();
  return client.initialize();
}

// Export types
export type {
  FederationConfig,
  SyncPacket,
  BasinData,
  ResearchFinding,
  ToolDefinition,
  MeshStatus,
  RegistrationResult,
  SyncResult,
};
