/**
 * WebSocket Mesh Network Streaming
 * 
 * Provides real-time streaming of federation mesh network status:
 * - Connected peers and their status
 * - Knowledge sync events
 * - Capability broadcasts
 * - Network topology changes
 * 
 * Usage:
 *   Client connects to: ws://localhost:5000/ws/mesh-network
 *   Client sends: { "type": "subscribe" }
 *   Server pushes: { "type": "mesh_update", "data": {...} }
 */

import { WebSocket } from "ws";

export interface MeshPeer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'syncing';
  lastSeen: string;
  capabilities: string[];
  sharedKnowledge: {
    basins: number;
    vocabulary: number;
    research: number;
  };
}

export interface MeshNetworkStatus {
  totalPeers: number;
  connectedPeers: number;
  syncingPeers: number;
  totalSharedBasins: number;
  totalSharedVocabulary: number;
  totalSharedResearch: number;
  networkHealth: 'healthy' | 'degraded' | 'critical';
  lastSyncTime: string | null;
}

export interface MeshEvent {
  type: 'peer_connected' | 'peer_disconnected' | 'knowledge_sync' | 'capability_broadcast' | 'topology_change';
  peerId?: string;
  peerName?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface MeshSubscription {
  ws: WebSocket;
  subscribedAt: Date;
}

interface MeshMessage {
  type: "subscribe" | "unsubscribe" | "heartbeat" | "request_status";
}

interface MeshUpdate {
  type: "mesh_update" | "mesh_event" | "status" | "subscribed" | "error";
  data?: {
    peers?: MeshPeer[];
    status?: MeshNetworkStatus;
    events?: MeshEvent[];
  };
  event?: MeshEvent;
  message?: string;
}

export class MeshNetworkStreamer {
  private subscriptions = new Map<string, MeshSubscription>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private eventBuffer: MeshEvent[] = [];
  private readonly MAX_EVENT_BUFFER = 50;
  private cachedPeers: MeshPeer[] = [];
  private cachedStatus: MeshNetworkStatus | null = null;
  
  constructor() {
    this.startHeartbeat();
    this.startStatusPolling();
  }
  
  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, sub] of this.subscriptions) {
        if (sub.ws.readyState === WebSocket.OPEN) {
          try {
            sub.ws.ping();
          } catch (err) {
            console.error(`[MeshNetworkWS] Heartbeat failed for ${clientId}:`, err);
          }
        }
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Start polling Python backend for mesh network status
   */
  private startStatusPolling() {
    // Poll backend every 5 seconds for mesh status
    this.pollInterval = setInterval(async () => {
      await this.fetchAndBroadcastStatus();
    }, 5000);
    
    // Initial fetch
    this.fetchAndBroadcastStatus();
  }
  
  /**
   * Fetch mesh network status from federation tables and broadcast to subscribers
   */
  private async fetchAndBroadcastStatus() {
    if (this.subscriptions.size === 0) return;

    try {
      // Use Node.js server's own federation endpoint instead of Python backend
      // This avoids issues with non-existent Python endpoints
      const nodePort = process.env.PORT || 5000;
      const nodeUrl = `http://localhost:${nodePort}`;

      // Fetch sync status from our own TypeScript server
      const statusResponse = await fetch(`${nodeUrl}/api/federation/sync/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      let statusData: MeshNetworkStatus = {
        totalPeers: 0,
        connectedPeers: 0,
        syncingPeers: 0,
        totalSharedBasins: 0,
        totalSharedVocabulary: 0,
        totalSharedResearch: 0,
        networkHealth: 'healthy',
        lastSyncTime: null,
      };

      if (statusResponse.ok) {
        const data = await statusResponse.json();
        statusData = {
          totalPeers: data.peerCount || 0,
          connectedPeers: data.isConnected ? data.peerCount : 0,
          syncingPeers: 0,
          totalSharedBasins: 0,
          totalSharedVocabulary: 0,
          totalSharedResearch: 0,
          networkHealth: data.isConnected ? 'healthy' : 'degraded',
          lastSyncTime: data.lastSyncTime,
        };
      }

      // Fetch instances from our own server
      const instancesResponse = await fetch(`${nodeUrl}/api/federation/instances`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      let peers: MeshPeer[] = [];
      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json();
        peers = (instancesData.instances || []).map((inst: any) => ({
          id: String(inst.id),
          name: inst.name,
          url: inst.endpoint,
          status: inst.status === 'active' ? 'connected' : 'disconnected',
          lastSeen: inst.lastSyncAt || new Date().toISOString(),
          capabilities: inst.capabilities || [],
          sharedKnowledge: {
            basins: 0,
            vocabulary: 0,
            research: 0,
          },
        }));
      }

      // Check for changes
      const statusChanged = JSON.stringify(this.cachedStatus) !== JSON.stringify(statusData);
      const peersChanged = JSON.stringify(this.cachedPeers) !== JSON.stringify(peers);

      if (statusChanged || peersChanged) {
        // Detect events based on changes BEFORE updating cache
        this.detectAndEmitEvents(peers);

        this.cachedStatus = statusData;
        this.cachedPeers = peers;

        // Broadcast update
        this.broadcastUpdate({
          peers,
          status: statusData,
          events: this.eventBuffer.slice(0, 10), // Last 10 events
        });
      }
    } catch (err) {
      // Silently ignore fetch errors - server may still be starting
    }
  }
  
  /**
   * Detect events based on peer changes
   */
  private detectAndEmitEvents(newPeers: MeshPeer[]) {
    const oldPeerIds = new Set(this.cachedPeers.map(p => p.id));
    const newPeerIds = new Set(newPeers.map(p => p.id));
    
    // Detect new connections
    for (const peer of newPeers) {
      if (!oldPeerIds.has(peer.id)) {
        this.pushEvent({
          type: 'peer_connected',
          peerId: peer.id,
          peerName: peer.name,
          timestamp: new Date().toISOString(),
          details: { url: peer.url, capabilities: peer.capabilities },
        });
      }
    }
    
    // Detect disconnections
    for (const peer of this.cachedPeers) {
      if (!newPeerIds.has(peer.id)) {
        this.pushEvent({
          type: 'peer_disconnected',
          peerId: peer.id,
          peerName: peer.name,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
  
  /**
   * Broadcast update to all subscribers
   */
  private broadcastUpdate(data: MeshUpdate['data']) {
    const update: MeshUpdate = {
      type: 'mesh_update',
      data,
    };
    
    const message = JSON.stringify(update);
    
    for (const [clientId, sub] of this.subscriptions) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        try {
          sub.ws.send(message);
        } catch (err) {
          console.error(`[MeshNetworkWS] Broadcast failed for ${clientId}:`, err);
        }
      }
    }
  }
  
  /**
   * Push a mesh event and broadcast it
   */
  pushEvent(event: MeshEvent) {
    this.eventBuffer = [event, ...this.eventBuffer].slice(0, this.MAX_EVENT_BUFFER);
    
    const update: MeshUpdate = {
      type: 'mesh_event',
      event,
    };
    
    const message = JSON.stringify(update);
    
    for (const [clientId, sub] of this.subscriptions) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        try {
          sub.ws.send(message);
        } catch (err) {
          console.error(`[MeshNetworkWS] Event broadcast failed for ${clientId}:`, err);
        }
      }
    }
  }
  
  /**
   * Notify all subscribers of a knowledge sync event
   */
  notifyKnowledgeSync(peerId: string, peerName: string, details: Record<string, unknown>) {
    this.pushEvent({
      type: 'knowledge_sync',
      peerId,
      peerName,
      timestamp: new Date().toISOString(),
      details,
    });
  }
  
  /**
   * Notify all subscribers of a capability broadcast
   */
  notifyCapabilityBroadcast(peerId: string, peerName: string, capabilities: string[]) {
    this.pushEvent({
      type: 'capability_broadcast',
      peerId,
      peerName,
      timestamp: new Date().toISOString(),
      details: { capabilities },
    });
  }
  
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket, clientId: string) {
    console.log(`[MeshNetworkWS] New connection: ${clientId}`);
    
    this.subscriptions.set(clientId, {
      ws,
      subscribedAt: new Date(),
    });
    
    ws.on("message", (data) => {
      try {
        const message: MeshMessage = JSON.parse(data.toString());
        
        if (message.type === "subscribe") {
          this.handleSubscribe(clientId);
        } else if (message.type === "unsubscribe") {
          this.handleUnsubscribe(clientId);
        } else if (message.type === "request_status") {
          this.sendCurrentStatus(clientId);
        } else if (message.type === "heartbeat") {
          // Client heartbeat - acknowledge
          ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error(`[MeshNetworkWS] Message parse error for ${clientId}:`, err);
        
        const errorUpdate: MeshUpdate = {
          type: "error",
          message: "Invalid message format",
        };
        ws.send(JSON.stringify(errorUpdate));
      }
    });
    
    ws.on("close", () => {
      console.log(`[MeshNetworkWS] Connection closed: ${clientId}`);
      this.subscriptions.delete(clientId);
    });
    
    ws.on("error", (err) => {
      console.error(`[MeshNetworkWS] Error for ${clientId}:`, err);
    });
    
    ws.on("pong", () => {
      // Heartbeat received
    });
  }
  
  /**
   * Handle subscription request
   */
  private handleSubscribe(clientId: string) {
    const sub = this.subscriptions.get(clientId);
    if (!sub) return;
    
    console.log(`[MeshNetworkWS] Client ${clientId} subscribed to mesh network updates`);
    
    const response: MeshUpdate = {
      type: "subscribed",
      message: "Subscribed to mesh network updates",
    };
    
    if (sub.ws.readyState === WebSocket.OPEN) {
      sub.ws.send(JSON.stringify(response));
      
      // Send current status immediately
      this.sendCurrentStatus(clientId);
    }
  }
  
  /**
   * Send current cached status to a specific client
   */
  private sendCurrentStatus(clientId: string) {
    const sub = this.subscriptions.get(clientId);
    if (!sub || sub.ws.readyState !== WebSocket.OPEN) return;
    
    const update: MeshUpdate = {
      type: "mesh_update",
      data: {
        peers: this.cachedPeers,
        status: this.cachedStatus || {
          totalPeers: 0,
          connectedPeers: 0,
          syncingPeers: 0,
          totalSharedBasins: 0,
          totalSharedVocabulary: 0,
          totalSharedResearch: 0,
          networkHealth: 'healthy',
          lastSyncTime: null,
        },
        events: this.eventBuffer.slice(0, 10),
      },
    };
    
    sub.ws.send(JSON.stringify(update));
  }
  
  /**
   * Handle unsubscribe request
   */
  private handleUnsubscribe(clientId: string) {
    console.log(`[MeshNetworkWS] Client ${clientId} unsubscribed`);
    this.subscriptions.delete(clientId);
  }
  
  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    // Close all connections
    for (const [clientId, sub] of this.subscriptions) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.close(1000, "Server shutting down");
      }
    }
    
    this.subscriptions.clear();
    console.log("[MeshNetworkWS] Streamer destroyed");
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      activeConnections: this.subscriptions.size,
      bufferedEvents: this.eventBuffer.length,
      cachedPeers: this.cachedPeers.length,
      lastStatus: this.cachedStatus,
    };
  }
}

export default MeshNetworkStreamer;
