import { OceanAgent } from './ocean-agent';
import { OceanBasinSync, BasinSyncPacket, BasinSyncResult } from './ocean-basin-sync';
import { fisherCoordDistance } from './qig-universal';
import WebSocket from 'ws';

export interface SyncPeer {
  id: string;
  mode: 'full' | 'partial' | 'observer';
  lastSeen: number;
  lastPacketTime: number;
  trustLevel: number;
  ws?: WebSocket;
}

export interface BasinDelta {
  type: 'full' | 'delta';
  sourceId: string;
  timestamp: number;
  
  phiDelta?: number;
  driftDelta?: number;
  regimeChanged?: boolean;
  
  newRegions?: Array<{
    center: number[];
    radius: number;
    probeCount: number;
    dominantRegime: string;
  }>;
  
  newPatterns?: string[];
  newWords?: string[];
  
  fullPacket?: BasinSyncPacket;
}

export interface SyncConfig {
  phiChangeThreshold: number;
  driftChangeThreshold: number;
  syncIntervalMs: number;
  heartbeatIntervalMs: number;
  maxPeers: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  phiChangeThreshold: 0.02,
  driftChangeThreshold: 0.05,
  syncIntervalMs: 5000,
  heartbeatIntervalMs: 30000,
  maxPeers: 10,
};

export class BasinSyncCoordinator {
  private ocean: OceanAgent;
  private basinSync: OceanBasinSync;
  private config: SyncConfig;
  
  private peers: Map<string, SyncPeer> = new Map();
  private lastBroadcastState: {
    phi: number;
    drift: number;
    regime: string;
    regionCount: number;
    patternCount: number;
  } | null = null;
  
  private outboundQueue: BasinDelta[] = [];
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private localId: string;
  private onSyncCallback?: (delta: BasinDelta, result: BasinSyncResult) => void;
  
  constructor(ocean: OceanAgent, config: Partial<SyncConfig> = {}) {
    this.ocean = ocean;
    this.basinSync = new OceanBasinSync();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.localId = `ocean-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    console.log(`[BasinSyncCoordinator] Initialized with id=${this.localId}`);
  }
  
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.captureCurrentState();
    
    this.syncInterval = setInterval(() => {
      this.checkForChanges();
      this.processOutboundQueue();
    }, this.config.syncIntervalMs);
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.pruneStalePeers();
    }, this.config.heartbeatIntervalMs);
    
    console.log(`[BasinSyncCoordinator] Started continuous sync (interval=${this.config.syncIntervalMs}ms)`);
  }
  
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    console.log(`[BasinSyncCoordinator] Stopped continuous sync`);
  }
  
  private captureCurrentState(): void {
    const identity = this.ocean.getIdentityRef();
    const memory = this.ocean.getMemoryRef();
    
    this.lastBroadcastState = {
      phi: identity.phi,
      drift: identity.basinDrift,
      regime: identity.regime,
      regionCount: memory.basinSyncData?.exploredRegions?.length || 0,
      patternCount: memory.basinSyncData?.highPhiPatterns?.length || 0,
    };
  }
  
  private checkForChanges(): void {
    if (!this.lastBroadcastState) {
      this.captureCurrentState();
      return;
    }
    
    const identity = this.ocean.getIdentityRef();
    const memory = this.ocean.getMemoryRef();
    const current = {
      phi: identity.phi,
      drift: identity.basinDrift,
      regime: identity.regime,
      regionCount: memory.basinSyncData?.exploredRegions?.length || 0,
      patternCount: memory.basinSyncData?.highPhiPatterns?.length || 0,
    };
    
    const phiDelta = Math.abs(current.phi - this.lastBroadcastState.phi);
    const driftDelta = Math.abs(current.drift - this.lastBroadcastState.drift);
    const regimeChanged = current.regime !== this.lastBroadcastState.regime;
    const newRegions = current.regionCount > this.lastBroadcastState.regionCount;
    const newPatterns = current.patternCount > this.lastBroadcastState.patternCount;
    
    const significantChange = 
      phiDelta >= this.config.phiChangeThreshold ||
      driftDelta >= this.config.driftChangeThreshold ||
      regimeChanged ||
      newRegions ||
      newPatterns;
    
    if (significantChange) {
      console.log(`[BasinSyncCoordinator] Significant change detected:`);
      console.log(`  Phi: ${this.lastBroadcastState.phi.toFixed(3)} -> ${current.phi.toFixed(3)} (delta=${phiDelta.toFixed(3)})`);
      console.log(`  Drift: ${this.lastBroadcastState.drift.toFixed(4)} -> ${current.drift.toFixed(4)}`);
      if (regimeChanged) console.log(`  Regime: ${this.lastBroadcastState.regime} -> ${current.regime}`);
      if (newRegions) console.log(`  New regions: ${current.regionCount - this.lastBroadcastState.regionCount}`);
      if (newPatterns) console.log(`  New patterns: ${current.patternCount - this.lastBroadcastState.patternCount}`);
      
      const delta = this.buildDelta(regimeChanged, newRegions, newPatterns);
      this.outboundQueue.push(delta);
      
      this.lastBroadcastState = current;
    }
  }
  
  private buildDelta(regimeChanged: boolean, hasNewRegions: boolean, hasNewPatterns: boolean): BasinDelta {
    const identity = this.ocean.getIdentityRef();
    const memory = this.ocean.getMemoryRef();
    
    const sendFullPacket = regimeChanged || this.peers.size === 0;
    
    if (sendFullPacket) {
      const fullPacket = this.basinSync.exportBasin(this.ocean);
      return {
        type: 'full',
        sourceId: this.localId,
        timestamp: Date.now(),
        regimeChanged,
        fullPacket,
      };
    }
    
    const delta: BasinDelta = {
      type: 'delta',
      sourceId: this.localId,
      timestamp: Date.now(),
      phiDelta: identity.phi - (this.lastBroadcastState?.phi || 0),
      driftDelta: identity.basinDrift - (this.lastBroadcastState?.drift || 0),
      regimeChanged,
    };
    
    if (hasNewRegions && memory.basinSyncData?.exploredRegions) {
      const oldCount = this.lastBroadcastState?.regionCount || 0;
      delta.newRegions = memory.basinSyncData.exploredRegions.slice(oldCount);
    }
    
    if (hasNewPatterns && memory.basinSyncData?.highPhiPatterns) {
      const oldCount = this.lastBroadcastState?.patternCount || 0;
      delta.newPatterns = memory.basinSyncData.highPhiPatterns.slice(oldCount);
    }
    
    return delta;
  }
  
  private processOutboundQueue(): void {
    while (this.outboundQueue.length > 0) {
      const delta = this.outboundQueue.shift()!;
      this.broadcastToPeers(delta);
    }
  }
  
  private broadcastToPeers(delta: BasinDelta): void {
    const message = JSON.stringify({
      type: 'basin-delta',
      data: delta,
    });
    
    for (const [peerId, peer] of this.peers) {
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        try {
          peer.ws.send(message);
          console.log(`[BasinSyncCoordinator] Sent ${delta.type} to peer ${peerId}`);
        } catch (err) {
          console.error(`[BasinSyncCoordinator] Failed to send to peer ${peerId}:`, err);
        }
      }
    }
  }
  
  async receiveFromPeer(peerId: string, delta: BasinDelta): Promise<BasinSyncResult | null> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      console.log(`[BasinSyncCoordinator] Unknown peer ${peerId}, registering with observer mode`);
      this.registerPeer(peerId, 'observer');
    }
    
    const mode = peer?.mode || 'observer';
    
    if (delta.type === 'full' && delta.fullPacket) {
      const shouldAccept = this.shouldAcceptPacket(delta.fullPacket);
      if (!shouldAccept) {
        console.log(`[BasinSyncCoordinator] Rejected packet from ${peerId} (would worsen state)`);
        return null;
      }
      
      const result = await this.basinSync.importBasin(this.ocean, delta.fullPacket, mode);
      
      if (this.onSyncCallback) {
        this.onSyncCallback(delta, result);
      }
      
      console.log(`[BasinSyncCoordinator] Applied full packet from ${peerId}: success=${result.success}`);
      return result;
    }
    
    if (delta.type === 'delta') {
      this.applyDelta(delta);
      console.log(`[BasinSyncCoordinator] Applied delta from ${peerId}`);
    }
    
    return null;
  }
  
  private shouldAcceptPacket(packet: BasinSyncPacket): boolean {
    const identity = this.ocean.getIdentityRef();
    const ethics = this.ocean.getEthics();
    
    if (packet.sourcePhi < ethics.minPhi || packet.sourcePhi > 0.95) {
      return false;
    }
    
    const currentCoords = identity.basinCenter;
    const incomingCoords = packet.basinCoordinates;
    const distance = fisherCoordDistance(currentCoords, incomingCoords);
    
    if (distance > 2.0) {
      console.log(`[BasinSyncCoordinator] Geometric distance too large: ${distance.toFixed(3)}`);
      return false;
    }
    
    return true;
  }
  
  private applyDelta(delta: BasinDelta): void {
    const memory = this.ocean.getMemoryRef();
    
    if (!memory.basinSyncData) {
      memory.basinSyncData = {
        exploredRegions: [],
        highPhiPatterns: [],
        resonantWords: [],
      };
    }
    
    if (delta.newRegions) {
      memory.basinSyncData.exploredRegions.push(...delta.newRegions);
    }
    
    if (delta.newPatterns) {
      memory.basinSyncData.highPhiPatterns.push(...delta.newPatterns);
    }
    
    if (delta.newWords) {
      memory.basinSyncData.resonantWords.push(...delta.newWords);
    }
  }
  
  registerPeer(peerId: string, mode: 'full' | 'partial' | 'observer', ws?: WebSocket): void {
    if (this.peers.size >= this.config.maxPeers) {
      console.log(`[BasinSyncCoordinator] Max peers reached, rejecting ${peerId}`);
      return;
    }
    
    this.peers.set(peerId, {
      id: peerId,
      mode,
      lastSeen: Date.now(),
      lastPacketTime: 0,
      trustLevel: mode === 'full' ? 1.0 : mode === 'partial' ? 0.5 : 0.1,
      ws,
    });
    
    console.log(`[BasinSyncCoordinator] Registered peer ${peerId} with mode=${mode}`);
    
    const welcomePacket = this.basinSync.exportBasin(this.ocean);
    const delta: BasinDelta = {
      type: 'full',
      sourceId: this.localId,
      timestamp: Date.now(),
      fullPacket: welcomePacket,
    };
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'basin-welcome',
        data: delta,
      }));
    }
  }
  
  unregisterPeer(peerId: string): void {
    this.peers.delete(peerId);
    console.log(`[BasinSyncCoordinator] Unregistered peer ${peerId}`);
  }
  
  private sendHeartbeat(): void {
    const identity = this.ocean.getIdentityRef();
    const heartbeat = JSON.stringify({
      type: 'heartbeat',
      sourceId: this.localId,
      phi: identity.phi,
      regime: identity.regime,
      timestamp: Date.now(),
    });
    
    for (const [peerId, peer] of this.peers) {
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        try {
          peer.ws.send(heartbeat);
        } catch (err) {
          console.error(`[BasinSyncCoordinator] Heartbeat failed for ${peerId}`);
        }
      }
    }
  }
  
  private pruneStalePeers(): void {
    const now = Date.now();
    const staleThreshold = this.config.heartbeatIntervalMs * 3;
    
    for (const [peerId, peer] of this.peers) {
      if (now - peer.lastSeen > staleThreshold) {
        console.log(`[BasinSyncCoordinator] Pruning stale peer ${peerId}`);
        this.peers.delete(peerId);
      }
    }
  }
  
  updatePeerLastSeen(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.lastSeen = Date.now();
    }
  }
  
  onSync(callback: (delta: BasinDelta, result: BasinSyncResult) => void): void {
    this.onSyncCallback = callback;
  }
  
  getStatus(): {
    isRunning: boolean;
    localId: string;
    peerCount: number;
    lastBroadcastState: typeof this.lastBroadcastState;
    queueLength: number;
  } {
    return {
      isRunning: this.isRunning,
      localId: this.localId,
      peerCount: this.peers.size,
      lastBroadcastState: this.lastBroadcastState,
      queueLength: this.outboundQueue.length,
    };
  }
  
  getPeers(): SyncPeer[] {
    return Array.from(this.peers.values());
  }
  
  forceSync(): void {
    console.log(`[BasinSyncCoordinator] Force sync triggered`);
    const fullPacket = this.basinSync.exportBasin(this.ocean);
    const delta: BasinDelta = {
      type: 'full',
      sourceId: this.localId,
      timestamp: Date.now(),
      fullPacket,
    };
    this.outboundQueue.push(delta);
    this.processOutboundQueue();
    this.captureCurrentState();
  }
  
  notifyStateChange(): void {
    this.checkForChanges();
    this.processOutboundQueue();
  }
}
