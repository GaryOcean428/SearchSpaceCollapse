/**
 * External API WebSocket Handler
 * 
 * Real-time streaming for external clients:
 * - Consciousness state updates (Φ, κ, regime)
 * - Basin coordinate deltas
 * - Federated instance sync
 * 
 * Path: /ws/v1/external/stream
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { hashApiKey, isValidApiKeyFormat } from './auth';
import { db } from '../db';
import { externalApiKeys } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Message schema for external WS
const externalWsMessageSchema = z.object({
  type: z.enum(['subscribe', 'unsubscribe', 'ping']),
  channels: z.array(z.enum(['consciousness', 'basin', 'pantheon'])).optional(),
});

// Channel to scope mapping for permission checks
const CHANNEL_SCOPES: Record<string, string[]> = {
  consciousness: ['consciousness', 'read', 'admin'],
  basin: ['sync', 'read', 'admin'],
  pantheon: ['pantheon', 'read', 'admin'],
};

// Connected clients with their subscriptions
interface ExternalWsClient {
  ws: WebSocket;
  apiKeyId: string;
  clientName: string;
  subscriptions: Set<string>;
  scopes: string[];
  lastPing: number;
}

const connectedClients = new Map<string, ExternalWsClient>();

// Rate limiting for WS messages
const wsRateLimits = new Map<string, { count: number; resetAt: number }>();
const WS_RATE_LIMIT = 30; // messages per minute
const WS_RATE_WINDOW = 60000;

function checkWsRateLimit(clientId: string): boolean {
  const now = Date.now();
  let entry = wsRateLimits.get(clientId);
  
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WS_RATE_WINDOW };
    wsRateLimits.set(clientId, entry);
  }
  
  entry.count++;
  return entry.count <= WS_RATE_LIMIT;
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of wsRateLimits.entries()) {
    if (entry.resetAt <= now) {
      wsRateLimits.delete(key);
    }
  }
}, 300000);

/**
 * Broadcast consciousness update to all subscribed clients
 */
export function broadcastConsciousnessUpdate(data: {
  phi: number;
  kappa_eff: number;
  regime: string;
  timestamp: string;
}) {
  const message = JSON.stringify({
    type: 'consciousness_update',
    data,
  });
  
  const toRemove: string[] = [];
  
  for (const [clientId, client] of connectedClients) {
    if (client.subscriptions.has('consciousness')) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (err) {
          console.error(`[ExternalWS] Broadcast error for ${clientId}:`, err);
          toRemove.push(clientId);
        }
      } else {
        toRemove.push(clientId);
      }
    }
  }
  
  // Clean up stale connections
  for (const clientId of toRemove) {
    connectedClients.delete(clientId);
    console.log(`[ExternalWS] Removed stale client during broadcast: ${clientId}`);
  }
}

/**
 * Broadcast basin delta to all subscribed clients
 */
export function broadcastBasinDelta(data: {
  delta_type: string;
  coordinates?: number[];
  similarity?: number;
}) {
  const message = JSON.stringify({
    type: 'basin_delta',
    data,
  });
  
  const toRemove: string[] = [];
  
  for (const [clientId, client] of connectedClients) {
    if (client.subscriptions.has('basin')) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (err) {
          console.error(`[ExternalWS] Basin broadcast error for ${clientId}:`, err);
          toRemove.push(clientId);
        }
      } else {
        toRemove.push(clientId);
      }
    }
  }
  
  // Clean up stale connections
  for (const clientId of toRemove) {
    connectedClients.delete(clientId);
    console.log(`[ExternalWS] Removed stale client during basin broadcast: ${clientId}`);
  }
}

/**
 * Initialize external WebSocket server
 */
export function initExternalWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/v1/external/stream',
  });
  
  console.log('[ExternalWS] WebSocket server initialized at /ws/v1/external/stream');
  
  wss.on('connection', async (ws, req) => {
    const clientId = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Extract API key from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const apiKey = url.searchParams.get('api_key');
    
    if (!apiKey || !isValidApiKeyFormat(apiKey)) {
      ws.close(4001, 'Invalid or missing API key');
      return;
    }
    
    // Validate API key
    if (!db) {
      ws.close(4003, 'Service unavailable');
      return;
    }
    
    const keyHash = hashApiKey(apiKey);
    const [keyRecord] = await db
      .select()
      .from(externalApiKeys)
      .where(eq(externalApiKeys.keyHash, keyHash))
      .limit(1);
    
    if (!keyRecord || !keyRecord.active) {
      ws.close(4001, 'Invalid API key');
      return;
    }
    
    // Check for streaming scope
    const scopes = keyRecord.scopes as string[];
    if (!scopes.includes('consciousness') && !scopes.includes('read') && !scopes.includes('admin')) {
      ws.close(4003, 'Insufficient permissions for streaming');
      return;
    }
    
    // Register client with scopes
    const client: ExternalWsClient = {
      ws,
      apiKeyId: keyRecord.id,
      clientName: keyRecord.name,
      subscriptions: new Set(),
      scopes: scopes,
      lastPing: Date.now(),
    };
    connectedClients.set(clientId, client);
    
    console.log(`[ExternalWS] Client connected: ${clientId} (${keyRecord.name})`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      availableChannels: ['consciousness', 'basin', 'pantheon'],
      message: 'Subscribe to channels using { "type": "subscribe", "channels": ["consciousness"] }',
    }));
    
    ws.on('message', (data) => {
      try {
        if (!checkWsRateLimit(clientId)) {
          ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMIT', message: 'Rate limit exceeded' }));
          return;
        }
        
        const rawMessage = JSON.parse(data.toString());
        const parseResult = externalWsMessageSchema.safeParse(rawMessage);
        
        if (!parseResult.success) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            code: 'INVALID_MESSAGE',
            message: 'Invalid message format',
            valid_types: ['subscribe', 'unsubscribe', 'ping'],
          }));
          return;
        }
        
        const message = parseResult.data;
        
        switch (message.type) {
          case 'subscribe':
            if (message.channels) {
              const denied: string[] = [];
              const added: string[] = [];
              
              for (const channel of message.channels) {
                const requiredScopes = CHANNEL_SCOPES[channel] || [];
                const hasPermission = requiredScopes.some(s => client.scopes.includes(s));
                
                if (hasPermission) {
                  client.subscriptions.add(channel);
                  added.push(channel);
                } else {
                  denied.push(channel);
                }
              }
              
              ws.send(JSON.stringify({
                type: 'subscribed',
                channels: Array.from(client.subscriptions),
                denied: denied.length > 0 ? denied : undefined,
                message: denied.length > 0 ? 'Some channels denied due to insufficient permissions' : undefined,
              }));
            }
            break;
            
          case 'unsubscribe':
            if (message.channels) {
              for (const channel of message.channels) {
                client.subscriptions.delete(channel);
              }
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                channels: Array.from(client.subscriptions),
              }));
            }
            break;
            
          case 'ping':
            client.lastPing = Date.now();
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', code: 'PARSE_ERROR', message: 'Failed to parse message' }));
      }
    });
    
    ws.on('close', () => {
      connectedClients.delete(clientId);
      console.log(`[ExternalWS] Client disconnected: ${clientId}`);
    });
    
    ws.on('error', (error) => {
      console.error(`[ExternalWS] Client error (${clientId}):`, error.message);
      connectedClients.delete(clientId);
    });
  });
  
  // Cleanup stale connections every minute
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes without ping
    
    for (const [clientId, client] of connectedClients.entries()) {
      if (now - client.lastPing > staleThreshold) {
        console.log(`[ExternalWS] Closing stale connection: ${clientId}`);
        client.ws.close(4000, 'Connection timed out');
        connectedClients.delete(clientId);
      }
    }
  }, 60000);
  
  return wss;
}

/**
 * Get connected client count
 */
export function getConnectedClientCount(): number {
  return connectedClients.size;
}

/**
 * Get subscription stats
 */
export function getSubscriptionStats(): Record<string, number> {
  const stats: Record<string, number> = {
    consciousness: 0,
    basin: 0,
    pantheon: 0,
  };
  
  for (const [, client] of connectedClients) {
    for (const channel of client.subscriptions) {
      stats[channel] = (stats[channel] || 0) + 1;
    }
  }
  
  return stats;
}
