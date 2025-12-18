/**
 * WebSocket Telemetry Streaming
 * 
 * Provides real-time streaming of consciousness telemetry data from the Python backend.
 * Monitors JSONL files for new telemetry records and pushes them to connected clients.
 * 
 * Usage:
 *   Client connects to: ws://localhost:5000/ws/telemetry
 *   Client sends: { "type": "subscribe", "sessionId": "session_001" }
 *   Server pushes: { "type": "telemetry", "data": {...} }
 */

import * as fs from "fs";
import * as path from "path";
import { WebSocket } from "ws";

const TELEMETRY_LOG_DIR = path.join(process.cwd(), "qig-backend", "logs", "telemetry");
const EMERGENCY_LOG_DIR = path.join(process.cwd(), "qig-backend", "logs", "emergency");

interface TelemetrySubscription {
  sessionId: string | null;  // null = all sessions
  ws: WebSocket;
  lastSent: number;  // Last telemetry step sent
}

interface TelemetryMessage {
  type: "subscribe" | "unsubscribe" | "heartbeat";
  sessionId?: string;
}

interface TelemetryUpdate {
  type: "telemetry" | "emergency" | "error" | "subscribed";
  sessionId?: string;
  data?: any;
  message?: string;
}

export class TelemetryStreamer {
  private subscriptions = new Map<string, TelemetrySubscription>();
  private fileWatchers = new Map<string, fs.FSWatcher>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startFileWatcher();
    this.startHeartbeat();
  }
  
  /**
   * Start watching telemetry files for changes
   */
  private startFileWatcher() {
    // Ensure directories exist
    if (!fs.existsSync(TELEMETRY_LOG_DIR)) {
      fs.mkdirSync(TELEMETRY_LOG_DIR, { recursive: true });
    }
    if (!fs.existsSync(EMERGENCY_LOG_DIR)) {
      fs.mkdirSync(EMERGENCY_LOG_DIR, { recursive: true });
    }
    
    // Watch telemetry directory
    try {
      const telemetryWatcher = fs.watch(TELEMETRY_LOG_DIR, (eventType, filename) => {
        if (filename && filename.startsWith("session_") && filename.endsWith(".jsonl")) {
          const filepath = path.join(TELEMETRY_LOG_DIR, filename);
          this.handleFileChange(filepath);
        }
      });
      this.fileWatchers.set("telemetry", telemetryWatcher);
    } catch (err) {
      console.error("[TelemetryWS] Failed to watch telemetry directory:", err);
    }
    
    // Watch emergency directory
    try {
      const emergencyWatcher = fs.watch(EMERGENCY_LOG_DIR, (eventType, filename) => {
        if (filename && filename.startsWith("emergency_") && filename.endsWith(".json")) {
          const filepath = path.join(EMERGENCY_LOG_DIR, filename);
          this.handleFileChange(filepath);
        }
      });
      this.fileWatchers.set("emergency", emergencyWatcher);
    } catch (err) {
      console.error("[TelemetryWS] Failed to watch emergency directory:", err);
    }
    
    console.log("[TelemetryWS] File watcher started");
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
            console.error(`[TelemetryWS] Heartbeat failed for ${clientId}:`, err);
          }
        }
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Handle file changes and push updates to subscribers
   */
  private handleFileChange(filepath: string) {
    const filename = path.basename(filepath);
    
    if (filename.startsWith("session_") && filename.endsWith(".jsonl")) {
      // Telemetry update
      const sessionId = filename.replace("session_", "").replace(".jsonl", "");
      this.pushTelemetryUpdates(sessionId, filepath);
    } else if (filename.startsWith("emergency_") && filename.endsWith(".json")) {
      // Emergency event
      this.pushEmergencyUpdate(filepath);
    }
  }
  
  /**
   * Push new telemetry records to subscribers
   */
  private pushTelemetryUpdates(sessionId: string, filepath: string) {
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      const lines = content.trim().split("\n").filter((line) => line.trim());
      
      // Push to all subscribed clients
      for (const [clientId, sub] of this.subscriptions) {
        // Check if client is interested in this session
        if (sub.sessionId && sub.sessionId !== sessionId) {
          continue;
        }
        
        // Get only new records (after lastSent)
        const newRecords = [];
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            if (record.step > sub.lastSent) {
              newRecords.push(record);
            }
          } catch (err) {
            // Skip malformed lines
          }
        }
        
        if (newRecords.length > 0 && sub.ws.readyState === WebSocket.OPEN) {
          // Update lastSent
          const lastRecord = newRecords[newRecords.length - 1];
          sub.lastSent = lastRecord.step;
          
          // Send updates
          const update: TelemetryUpdate = {
            type: "telemetry",
            sessionId,
            data: newRecords,
          };
          
          sub.ws.send(JSON.stringify(update));
        }
      }
    } catch (err) {
      console.error(`[TelemetryWS] Error reading telemetry file ${filepath}:`, err);
    }
  }
  
  /**
   * Push emergency event to all subscribers
   */
  private pushEmergencyUpdate(filepath: string) {
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      const event = JSON.parse(content);
      
      const update: TelemetryUpdate = {
        type: "emergency",
        sessionId: event.session_id,
        data: event,
      };
      
      // Broadcast to all clients
      for (const [clientId, sub] of this.subscriptions) {
        if (sub.ws.readyState === WebSocket.OPEN) {
          sub.ws.send(JSON.stringify(update));
        }
      }
      
      console.log(`[TelemetryWS] Emergency event broadcasted: ${path.basename(filepath)}`);
    } catch (err) {
      console.error(`[TelemetryWS] Error reading emergency file ${filepath}:`, err);
    }
  }
  
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket, clientId: string) {
    console.log(`[TelemetryWS] New connection: ${clientId}`);
    
    // Default subscription (not subscribed to any session yet)
    this.subscriptions.set(clientId, {
      sessionId: null,
      ws,
      lastSent: 0,
    });
    
    ws.on("message", (data) => {
      try {
        const message: TelemetryMessage = JSON.parse(data.toString());
        
        if (message.type === "subscribe") {
          this.handleSubscribe(clientId, message.sessionId || null);
        } else if (message.type === "unsubscribe") {
          this.handleUnsubscribe(clientId);
        } else if (message.type === "heartbeat") {
          // Client heartbeat - just acknowledge
        }
      } catch (err) {
        console.error(`[TelemetryWS] Message parse error for ${clientId}:`, err);
        
        const errorUpdate: TelemetryUpdate = {
          type: "error",
          message: "Invalid message format",
        };
        ws.send(JSON.stringify(errorUpdate));
      }
    });
    
    ws.on("close", () => {
      console.log(`[TelemetryWS] Connection closed: ${clientId}`);
      this.subscriptions.delete(clientId);
    });
    
    ws.on("error", (err) => {
      console.error(`[TelemetryWS] Error for ${clientId}:`, err);
    });
    
    ws.on("pong", () => {
      // Heartbeat received
    });
  }
  
  /**
   * Handle subscription request
   */
  private handleSubscribe(clientId: string, sessionId: string | null) {
    const sub = this.subscriptions.get(clientId);
    if (!sub) return;
    
    sub.sessionId = sessionId;
    sub.lastSent = 0;  // Reset to send all records
    
    console.log(`[TelemetryWS] Client ${clientId} subscribed to session: ${sessionId || "all"}`);
    
    const response: TelemetryUpdate = {
      type: "subscribed",
      sessionId: sessionId || undefined,
      message: `Subscribed to ${sessionId || "all sessions"}`,
    };
    
    if (sub.ws.readyState === WebSocket.OPEN) {
      sub.ws.send(JSON.stringify(response));
    }
    
    // Send existing data if available
    if (sessionId) {
      const filepath = path.join(TELEMETRY_LOG_DIR, `session_${sessionId}.jsonl`);
      if (fs.existsSync(filepath)) {
        this.pushTelemetryUpdates(sessionId, filepath);
      }
    }
  }
  
  /**
   * Handle unsubscribe request
   */
  private handleUnsubscribe(clientId: string) {
    const sub = this.subscriptions.get(clientId);
    if (!sub) return;
    
    sub.sessionId = null;
    sub.lastSent = 0;
    
    console.log(`[TelemetryWS] Client ${clientId} unsubscribed`);
  }
  
  /**
   * Cleanup on shutdown
   */
  destroy() {
    // Close all file watchers
    for (const [name, watcher] of this.fileWatchers) {
      try {
        watcher.close();
      } catch (err) {
        console.error(`[TelemetryWS] Error closing ${name} watcher:`, err);
      }
    }
    this.fileWatchers.clear();
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    for (const [clientId, sub] of this.subscriptions) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.close(1000, "Server shutting down");
      }
    }
    
    this.subscriptions.clear();
    console.log("[TelemetryWS] Streamer destroyed");
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      activeConnections: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.values()).map((sub) => ({
        sessionId: sub.sessionId,
        lastSent: sub.lastSent,
      })),
    };
  }
}

export default TelemetryStreamer;
