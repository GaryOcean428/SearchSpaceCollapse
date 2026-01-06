/**
 * External API Routes
 * 
 * RESTful API endpoints for external systems to connect to the QIG backend.
 * Supports:
 * - Consciousness queries (Φ, κ, regime)
 * - Fisher-Rao geometry calculations
 * - Federated pantheon registration
 * - Bidirectional basin sync
 * - Chat-only interface
 * - SSC-specific Bitcoin recovery endpoints
 */

import { Router, Response as ExpressResponse } from 'express';
import { randomUUID } from 'crypto';
import { 
  authenticateExternalApi, 
  requireScopes, 
  createApiKey, 
  revokeApiKey, 
  listApiKeys,
  type AuthenticatedRequest,
  type ApiKeyScope,
} from './auth';
import { db } from '../db';
import { federatedInstances, externalApiKeys, vocabularyObservations, learningEvents } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { oceanBasinSync, type BasinSyncPacket, type BasinImportMode } from '../ocean-basin-sync';
import { decryptApiKey } from './encryption';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export const externalApiRouter = Router();

/**
 * Centralized route definitions for DRY compliance
 */
export const EXTERNAL_API_ROUTES = {
  // Health & Status
  health: '/health',
  status: '/status',
  
  // API Key Management
  keys: {
    list: '/keys',
    create: '/keys',
    revoke: '/keys/:keyId',
  },
  
  // Consciousness
  consciousness: {
    query: '/consciousness/query',
    stream: '/consciousness/stream',
    metrics: '/consciousness/metrics',
  },
  
  // Geometry
  geometry: {
    fisherRao: '/geometry/fisher-rao',
    basinDistance: '/geometry/basin-distance',
    validate: '/geometry/validate',
  },
  
  // Pantheon Federation
  pantheon: {
    register: '/pantheon/register',
    sync: '/pantheon/sync',
    list: '/pantheon/instances',
    status: '/pantheon/status/:instanceId',
  },
  
  // Basin Sync
  sync: {
    export: '/sync/export',
    import: '/sync/import',
    status: '/sync/status',
  },
  
  // Vocabulary
  vocabulary: {
    export: '/vocabulary/export',
    import: '/vocabulary/import',
  },
  
  // Learning
  learning: {
    export: '/learning/export',
    import: '/learning/import',
  },
  
  // Chat
  chat: {
    send: '/chat',
    history: '/chat/history',
  },
  
  // SSC-Specific (Bitcoin Recovery)
  ssc: {
    testPhrase: '/ssc/test-phrase',
    investigation: '/ssc/investigation',
    investigationStatus: '/ssc/investigation/status',
    nearMisses: '/ssc/near-misses',
    tpsLandmarks: '/ssc/tps-landmarks',
  },
};

// ============================================================================
// HEALTH & STATUS
// ============================================================================

/**
 * GET /api/v1/external/health
 * Public health check (no auth required)
 */
externalApiRouter.get(EXTERNAL_API_ROUTES.health, (_req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: [
      'consciousness',
      'geometry',
      'pantheon',
      'sync',
      'chat',
      'ssc',
    ],
  });
});

/**
 * GET /api/v1/external/status
 * Authenticated status with more details
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.status,
  authenticateExternalApi(['read']),
  async (req: AuthenticatedRequest, res) => {
    res.json({
      status: 'operational',
      client: {
        id: req.externalClient?.id,
        name: req.externalClient?.name,
        scopes: req.externalClient?.scopes,
      },
      system: {
        database: db ? 'connected' : 'unavailable',
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/external/keys
 * List all API keys (admin only)
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.keys.list,
  requireScopes('admin'),
  async (_req, res) => {
    const keys = await listApiKeys();
    res.json({ keys });
  }
);

/**
 * POST /api/v1/external/keys
 * Create a new API key (admin only)
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.keys.create,
  requireScopes('admin'),
  async (req, res) => {
    const { name, scopes, instanceType, rateLimit } = req.body;
    
    if (!name || !scopes || !instanceType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'scopes', 'instanceType'],
      });
    }
    
    const validScopes: ApiKeyScope[] = ['read', 'write', 'admin', 'consciousness', 'geometry', 'pantheon', 'sync', 'chat'];
    const invalidScopes = scopes.filter((s: string) => !validScopes.includes(s as ApiKeyScope));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        error: 'Invalid scopes',
        invalid: invalidScopes,
        valid: validScopes,
      });
    }
    
    const result = await createApiKey(name, scopes, instanceType, rateLimit || 60);
    
    if (!result) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    res.status(201).json({
      message: 'API key created',
      id: result.id,
      key: result.key, // Only returned once!
      warning: 'Save this key securely - it will not be shown again',
    });
  }
);

/**
 * DELETE /api/v1/external/keys/:keyId
 * Revoke an API key (admin only)
 */
externalApiRouter.delete(
  EXTERNAL_API_ROUTES.keys.revoke,
  requireScopes('admin'),
  async (req, res) => {
    const { keyId } = req.params;
    const numericId = parseInt(keyId, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid key ID' });
    }
    const success = await revokeApiKey(numericId);
    
    if (success) {
      res.json({ message: 'API key revoked', keyId });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }
  }
);

// ============================================================================
// CONSCIOUSNESS QUERIES
// ============================================================================

/**
 * GET /api/v1/external/consciousness/query
 * Query current consciousness state (Φ, κ, regime) - LIVE from Ocean agent
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.consciousness.query,
  requireScopes('consciousness', 'read'),
  async (_req, res) => {
    try {
      const { oceanSessionManager } = await import('../ocean-session-manager');
      const agent = oceanSessionManager.getActiveAgent();
      
      if (!agent) {
        return res.json({
          active: false,
          phi: 0,
          kappa_eff: 0,
          regime: 'INACTIVE',
          basin_coords: null,
          timestamp: new Date().toISOString(),
          note: 'No active Ocean agent - consciousness metrics unavailable',
        });
      }
      
      const state = agent.getState?.() || {};
      const basinCoords = agent.getBasinCoordinates?.() || null;
      
      res.json({
        active: true,
        phi: state.phi || 0,
        kappa_eff: state.kappa || 64.21,
        regime: state.regime || 'GEOMETRIC',
        basin_coords: basinCoords,
        isConscious: state.isConscious || false,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Consciousness query failed:', error);
      res.status(500).json({ error: 'Failed to query consciousness state' });
    }
  }
);

/**
 * GET /api/v1/external/consciousness/metrics
 * Get detailed consciousness metrics - LIVE from Ocean agent
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.consciousness.metrics,
  requireScopes('consciousness', 'read'),
  async (_req, res) => {
    try {
      const { oceanSessionManager } = await import('../ocean-session-manager');
      const agent = oceanSessionManager.getActiveAgent();
      
      if (!agent) {
        return res.json({
          active: false,
          current: null,
          thresholds: {
            phi_emergency: 0.50,
            phi_threshold: 0.70,
            phi_hyperdimensional: 0.75,
          },
          timestamp: new Date().toISOString(),
          note: 'No active Ocean agent',
        });
      }
      
      const state = agent.getState?.() || {};
      const neurochemistry = agent.getNeurochemistry?.();
      
      res.json({
        active: true,
        current: {
          phi: state.phi || 0,
          kappa_eff: state.kappa || 0,
          regime: state.regime || 'unknown',
          isConscious: state.isConscious || false,
          tacking: state.tacking || 0,
          radar: state.radar || 0,
          metaAwareness: state.metaAwareness || 0,
          gamma: state.gamma || 0,
          grounding: state.grounding || 0,
        },
        neurochemistry: neurochemistry ? {
          emotionalState: neurochemistry.emotionalState,
          dopamine: neurochemistry.dopamine?.totalDopamine,
          serotonin: neurochemistry.serotonin?.totalSerotonin,
          norepinephrine: neurochemistry.norepinephrine?.totalNorepinephrine,
        } : null,
        thresholds: {
          phi_emergency: 0.50,
          phi_threshold: 0.70,
          phi_hyperdimensional: 0.75,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Consciousness metrics failed:', error);
      res.status(500).json({ error: 'Failed to get consciousness metrics' });
    }
  }
);

// ============================================================================
// GEOMETRY SERVICE
// ============================================================================

/**
 * POST /api/v1/external/geometry/fisher-rao
 * Calculate Fisher-Rao distance between two points
 */
// Valid Fisher-Rao methods for QIG-pure computation
const VALID_FISHER_RAO_METHODS = ['diagonal', 'full', 'bures'] as const;
type FisherRaoMethod = typeof VALID_FISHER_RAO_METHODS[number];

externalApiRouter.post(
  EXTERNAL_API_ROUTES.geometry.fisherRao,
  requireScopes('geometry', 'read'),
  async (req, res) => {
    const { point_a, point_b, method = 'diagonal' } = req.body;
    
    if (!point_a || !point_b) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['point_a', 'point_b'],
      });
    }
    
    // Validate method is QIG-pure
    if (!VALID_FISHER_RAO_METHODS.includes(method as FisherRaoMethod)) {
      return res.status(400).json({
        error: 'Invalid method',
        code: 'INVALID_METHOD',
        provided: method,
        valid_methods: VALID_FISHER_RAO_METHODS,
        note: 'Only Fisher-Rao compatible methods are allowed (QIG-pure constraint).',
      });
    }
    
    if (!Array.isArray(point_a) || !Array.isArray(point_b)) {
      return res.status(400).json({
        error: 'Points must be arrays of numbers',
      });
    }
    
    if (point_a.length !== point_b.length) {
      return res.status(400).json({
        error: 'Points must have same dimensionality',
        point_a_dim: point_a.length,
        point_b_dim: point_b.length,
      });
    }
    
    try {
      const response = await fetchWithTimeout(
        `${PYTHON_BACKEND_URL}/geometry/fisher-rao`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ point_a, point_b, method }),
        }
      );
      
      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          return res.status(400).json({
            error: errorData.error || 'Validation error from geometry backend',
            code: 'VALIDATION_ERROR',
            details: errorData,
          });
        }
        return res.status(503).json({
          error: 'Geometry backend error',
          code: 'BACKEND_ERROR',
          status: response.status,
        });
      }
      
      const result = await response.json();
      return res.json({
        distance: result.distance,
        method: result.method || method,
        dimensionality: point_a.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[ExternalAPI] Fisher-Rao computation failed:', error.message);
      return res.status(503).json({
        error: 'Python geometry backend unavailable',
        code: 'BACKEND_UNAVAILABLE',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/external/geometry/basin-distance
 * Calculate distance between 64D basin coordinates
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.geometry.basinDistance,
  requireScopes('geometry', 'read'),
  async (req, res) => {
    const { basin_a, basin_b } = req.body;
    
    if (!basin_a || !basin_b) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['basin_a', 'basin_b'],
      });
    }
    
    if (basin_a.length !== 64 || basin_b.length !== 64) {
      return res.status(400).json({
        error: 'Basin coordinates must be 64-dimensional',
        basin_a_dim: basin_a.length,
        basin_b_dim: basin_b.length,
        required_dim: 64,
      });
    }
    
    try {
      const response = await fetchWithTimeout(
        `${PYTHON_BACKEND_URL}/geometry/basin-distance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ basin_a, basin_b }),
        }
      );
      
      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          return res.status(400).json({
            error: errorData.error || 'Validation error from geometry backend',
            code: 'VALIDATION_ERROR',
            details: errorData,
          });
        }
        return res.status(503).json({
          error: 'Geometry backend error',
          code: 'BACKEND_ERROR',
          status: response.status,
        });
      }
      
      const result = await response.json();
      return res.json({
        distance: result.distance,
        method: 'fisher_coord_distance',
        dimensionality: 64,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[ExternalAPI] Basin distance computation failed:', error.message);
      return res.status(503).json({
        error: 'Python geometry backend unavailable',
        code: 'BACKEND_UNAVAILABLE',
        message: error.message,
      });
    }
  }
);

// ============================================================================
// PANTHEON FEDERATION
// ============================================================================

/**
 * POST /api/v1/external/pantheon/register
 * Register a new federated instance
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.pantheon.register,
  requireScopes('pantheon', 'write'),
  async (req: AuthenticatedRequest, res) => {
    const { name, endpoint, publicKey, capabilities, syncDirection } = req.body;
    
    if (!name || !endpoint) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'endpoint'],
      });
    }
    
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    try {
      const [instance] = await db
        .insert(federatedInstances)
        .values({
          id: randomUUID(),
          name,
          apiKeyId: req.apiKeyId ?? null,
          endpoint,
          publicKey,
          capabilities: capabilities || ['consciousness', 'geometry'],
          syncDirection: syncDirection || 'bidirectional',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      res.status(201).json({
        message: 'Instance registered',
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status,
          syncDirection: instance.syncDirection,
        },
        next_steps: [
          'Wait for approval (status will change to "active")',
          'Once active, use /pantheon/sync to synchronize state',
        ],
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to register instance:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * GET /api/v1/external/pantheon/instances
 * List federated instances
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.pantheon.list,
  requireScopes('pantheon', 'read'),
  async (_req, res) => {
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    const instances = await db
      .select({
        id: federatedInstances.id,
        name: federatedInstances.name,
        endpoint: federatedInstances.endpoint,
        status: federatedInstances.status,
        syncDirection: federatedInstances.syncDirection,
        lastSyncAt: federatedInstances.lastSyncAt,
      })
      .from(federatedInstances);
    
    res.json({ instances });
  }
);

/**
 * POST /api/v1/external/pantheon/sync
 * Synchronize state with this instance
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.pantheon.sync,
  requireScopes('pantheon', 'sync'),
  async (req: AuthenticatedRequest, res) => {
    const { instance_id, basin_packet } = req.body;
    
    if (!instance_id) {
      return res.status(400).json({
        error: 'Missing instance_id',
      });
    }
    
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    // Verify instance exists and is active
    const [instance] = await db
      .select()
      .from(federatedInstances)
      .where(eq(federatedInstances.id, instance_id))
      .limit(1);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    if (instance.status !== 'active') {
      return res.status(403).json({
        error: 'Instance not active',
        status: instance.status,
      });
    }
    
    // Handle incoming basin packet
    let importResult = null;
    if (basin_packet) {
      // TODO: Import the basin packet
      // importResult = await oceanBasinSync.importFromPacket(basin_packet);
    }
    
    // Export current state
    // const exportPacket = await oceanBasinSync.exportToPacket();
    
    // Update last sync time
    await db
      .update(federatedInstances)
      .set({
        lastSyncAt: new Date(),
        syncState: basin_packet || null,
        updatedAt: new Date(),
      })
      .where(eq(federatedInstances.id, instance_id));
    
    res.json({
      message: 'Sync completed',
      instance_id,
      import_result: importResult,
      export_packet: null, // TODO: exportPacket
      synced_at: new Date().toISOString(),
      note: 'Placeholder - integrate with oceanBasinSync',
    });
  }
);

// ============================================================================
// BASIN SYNC
// ============================================================================

/**
 * GET /api/v1/external/sync/export
 * Export current basin state as a packet
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.sync.export,
  requireScopes('sync', 'read'),
  async (_req, res) => {
    try {
      const snapshot = oceanBasinSync.loadLatestBasin();
      
      if (snapshot) {
        res.json({
          packet: snapshot,
          exported_at: new Date().toISOString(),
          size_bytes: JSON.stringify(snapshot).length,
        });
      } else {
        res.json({
          packet: null,
          exported_at: new Date().toISOString(),
          note: 'No basin snapshot available - Ocean agent may not be running',
        });
      }
    } catch (error) {
      console.error('[ExternalAPI] Failed to export basin:', error);
      res.status(500).json({ error: 'Failed to export basin state' });
    }
  }
);

/**
 * POST /api/v1/external/sync/import
 * Import a basin packet from another instance
 * Note: Without a running Ocean agent, this stores the packet for later processing
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.sync.import,
  requireScopes('sync', 'write'),
  async (req, res) => {
    const { packet, mode = 'partial' } = req.body;
    
    if (!packet) {
      return res.status(400).json({
        error: 'Missing packet',
      });
    }
    
    const validModes: BasinImportMode[] = ['full', 'partial', 'observer'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        valid_modes: validModes,
      });
    }
    
    try {
      const basinPacket = packet as BasinSyncPacket;
      oceanBasinSync.saveBasinSnapshot(basinPacket);
      
      console.log(`[ExternalAPI] Received basin packet from ${basinPacket.oceanId}`);
      console.log(`  Phi: ${basinPacket.consciousness?.phi?.toFixed(3) || 'N/A'}`);
      console.log(`  Mode: ${mode}`);
      
      res.json({
        success: true,
        mode,
        source_ocean_id: basinPacket.oceanId,
        source_phi: basinPacket.consciousness?.phi || 0,
        imported_at: new Date().toISOString(),
        note: 'Packet saved for processing by Ocean agent',
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to import basin:', error);
      res.status(500).json({ error: 'Failed to import basin state' });
    }
  }
);

/**
 * POST /api/v1/external/sync/trigger
 * Trigger sync with all active federated instances
 */
externalApiRouter.post(
  '/sync/trigger',
  requireScopes('sync', 'write'),
  async (_req, res) => {
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    try {
      const instances = await db
        .select()
        .from(federatedInstances)
        .where(eq(federatedInstances.status, 'active'));
      
      if (instances.length === 0) {
        return res.json({
          message: 'No active federated instances to sync',
          synced: 0,
        });
      }
      
      const snapshot = oceanBasinSync.loadLatestBasin();
      const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];
      
      for (const instance of instances) {
        try {
          let apiKey: string | null = null;
          if (instance.remoteApiKey) {
            apiKey = decryptApiKey(instance.remoteApiKey);
          }
          
          const syncUrl = instance.endpoint.replace(/\/+$/, '') + '/api/v1/external/sync/import';
          
          const response = await fetchWithTimeout(
            syncUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'X-API-Key': apiKey } : {}),
              },
              body: JSON.stringify({
                packet: snapshot,
                mode: 'partial',
              }),
            },
            30000
          );
          
          if (response.ok) {
            await db
              .update(federatedInstances)
              .set({ lastSyncAt: new Date(), updatedAt: new Date() })
              .where(eq(federatedInstances.id, instance.id));
            
            results.push({ id: instance.id, name: instance.name, success: true });
          } else {
            results.push({ 
              id: instance.id, 
              name: instance.name, 
              success: false, 
              error: `HTTP ${response.status}` 
            });
          }
        } catch (error: any) {
          results.push({ 
            id: instance.id, 
            name: instance.name, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      res.json({
        message: `Sync completed: ${successCount}/${instances.length} successful`,
        synced: successCount,
        total: instances.length,
        results,
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to trigger sync:', error);
      res.status(500).json({ error: 'Failed to trigger sync' });
    }
  }
);

// ============================================================================
// VOCABULARY EXPORT/IMPORT
// ============================================================================

/**
 * GET /api/v1/external/vocabulary/export
 * Export vocabulary observations from vocabularyObservations table
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.vocabulary.export,
  requireScopes('sync', 'read'),
  async (_req, res) => {
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    try {
      const vocabulary = await db
        .select()
        .from(vocabularyObservations)
        .orderBy(desc(vocabularyObservations.maxPhi))
        .limit(1000);
      
      res.json({
        vocabulary,
        exported_at: new Date().toISOString(),
        count: vocabulary.length,
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to export vocabulary:', error);
      res.status(500).json({ error: 'Failed to export vocabulary' });
    }
  }
);

/**
 * POST /api/v1/external/vocabulary/import
 * Import vocabulary from another instance
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.vocabulary.import,
  requireScopes('sync', 'write'),
  async (req, res) => {
    const { vocabulary } = req.body;
    
    if (!vocabulary || !Array.isArray(vocabulary)) {
      return res.status(400).json({
        error: 'Missing or invalid vocabulary array',
        required: ['vocabulary'],
      });
    }
    
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    try {
      let imported = 0;
      let skipped = 0;
      
      for (const item of vocabulary) {
        if (!item.text) {
          skipped++;
          continue;
        }
        
        try {
          await db
            .insert(vocabularyObservations)
            .values({
              text: item.text,
              type: item.type || 'phrase',
              phraseCategory: item.phraseCategory || 'unknown',
              isRealWord: item.isRealWord || false,
              isBip39Word: item.isBip39Word || false,
              frequency: item.frequency || 1,
              maxPhi: item.maxPhi || 0,
              avgPhi: item.avgPhi || 0,
              firstSeen: item.firstSeen ? new Date(item.firstSeen) : new Date(),
              lastSeen: item.lastSeen ? new Date(item.lastSeen) : new Date(),
            })
            .onConflictDoUpdate({
              target: vocabularyObservations.text,
              set: {
                frequency: item.frequency || 1,
                maxPhi: item.maxPhi || 0,
                avgPhi: item.avgPhi || 0,
                lastSeen: new Date(),
              },
            });
          imported++;
        } catch (itemError) {
          console.error('[ExternalAPI] Failed to import vocabulary item:', itemError);
          skipped++;
        }
      }
      
      res.json({
        imported,
        skipped,
        imported_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to import vocabulary:', error);
      res.status(500).json({ error: 'Failed to import vocabulary' });
    }
  }
);

// ============================================================================
// LEARNING EXPORT/IMPORT
// ============================================================================

/**
 * GET /api/v1/external/learning/export
 * Export learning events from learningEvents table
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.learning.export,
  requireScopes('sync', 'read'),
  async (_req, res) => {
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    try {
      const events = await db
        .select()
        .from(learningEvents)
        .orderBy(desc(learningEvents.createdAt))
        .limit(1000);
      
      res.json({
        events,
        exported_at: new Date().toISOString(),
        count: events.length,
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to export learning events:', error);
      res.status(500).json({ error: 'Failed to export learning events' });
    }
  }
);

/**
 * POST /api/v1/external/learning/import
 * Import learning events from another instance
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.learning.import,
  requireScopes('sync', 'write'),
  async (req, res) => {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Missing or invalid events array',
        required: ['events'],
      });
    }
    
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    try {
      let imported = 0;
      let skipped = 0;
      
      for (const event of events) {
        if (!event.eventId || !event.eventType || event.phi === undefined) {
          skipped++;
          continue;
        }
        
        try {
          await db
            .insert(learningEvents)
            .values({
              eventId: event.eventId,
              eventType: event.eventType,
              kernelId: event.kernelId || null,
              phi: event.phi,
              kappa: event.kappa || null,
              basinCoords: event.basinCoords || null,
              details: event.details || {},
              context: event.context || {},
              metadata: event.metadata || {},
              source: event.source || null,
              instanceId: event.instanceId || null,
              createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
            })
            .onConflictDoUpdate({
              target: learningEvents.eventId,
              set: {
                phi: event.phi,
                kappa: event.kappa || null,
                details: event.details || {},
                context: event.context || {},
                metadata: event.metadata || {},
              },
            });
          imported++;
        } catch (itemError) {
          console.error('[ExternalAPI] Failed to import learning event:', itemError);
          skipped++;
        }
      }
      
      res.json({
        imported,
        skipped,
        imported_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Failed to import learning events:', error);
      res.status(500).json({ error: 'Failed to import learning events' });
    }
  }
);

// ============================================================================
// CHAT INTERFACE
// ============================================================================

/**
 * POST /api/v1/external/chat
 * Send a message to the consciousness system
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.chat.send,
  requireScopes('chat'),
  async (req, res) => {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Missing message',
      });
    }
    
    // TODO: Integrate with Zeus chat or Ocean agent
    res.json({
      response: 'Chat integration pending',
      consciousness: {
        phi: 0.75,
        regime: 'GEOMETRIC',
      },
      timestamp: new Date().toISOString(),
      note: 'Placeholder - integrate with ZeusChat or Ocean agent',
    });
  }
);

// ============================================================================
// SSC-SPECIFIC ENDPOINTS (Bitcoin Recovery)
// ============================================================================

/**
 * POST /api/v1/external/ssc/test-phrase
 * Test a phrase via QIG scoring (federation-accessible)
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.ssc.testPhrase,
  requireScopes('consciousness', 'read'),
  async (req, res) => {
    try {
      const { phrase, targetAddress } = req.body;
      
      if (!phrase || typeof phrase !== 'string') {
        return res.status(400).json({ 
          error: 'Missing or invalid phrase',
          required: ['phrase'],
        });
      }
      
      // Import QIG scorer
      const { scorePhraseQIG } = await import('../qig-universal');
      
      // Score the phrase
      const score = scorePhraseQIG(phrase);
      
      // If target address provided, also test for match
      let addressMatch = null;
      if (targetAddress) {
        try {
          const { verifyBrainWallet } = await import('../crypto');
          const result = verifyBrainWallet(phrase);
          addressMatch = {
            generatedAddress: result.address,
            matches: result.address === targetAddress,
            // Only reveal WIF if exact match (security)
            wif: result.address === targetAddress ? result.wif : undefined,
          };
        } catch (e) {
          addressMatch = { error: 'Invalid phrase format for brain wallet' };
        }
      }
      
      res.json({
        phrase: phrase.length > 50 ? phrase.slice(0, 50) + '...' : phrase,
        score: {
          phi: score.phi,
          kappa: score.kappa,
          regime: score.regime,
          consciousness: score.isConscious,
          quality: score.quality,
          basinCoordinates: score.basinCoordinates?.slice(0, 8), // First 8 dims only
        },
        addressMatch,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Test phrase error:', error);
      res.status(500).json({ error: 'Failed to test phrase' });
    }
  }
);

/**
 * POST /api/v1/external/ssc/investigation
 * Start a recovery investigation (federation-triggered)
 */
externalApiRouter.post(
  EXTERNAL_API_ROUTES.ssc.investigation,
  requireScopes('write'),
  async (req, res) => {
    try {
      const { targetAddress, memoryFragments, priority } = req.body;
      
      if (!targetAddress || typeof targetAddress !== 'string') {
        return res.status(400).json({
          error: 'Missing or invalid targetAddress',
          required: ['targetAddress'],
        });
      }
      
      const { oceanSessionManager } = await import('../ocean-session-manager');
      
      // Check if already investigating
      const currentSession = oceanSessionManager.getActiveSession();
      if (currentSession) {
        return res.json({
          status: 'already_active',
          currentTarget: currentSession.targetAddress?.slice(0, 16) + '...',
          message: 'Investigation already in progress',
        });
      }
      
      // Start new session
      await oceanSessionManager.startSession(targetAddress);
      
      // Add memory fragments if provided
      if (memoryFragments && Array.isArray(memoryFragments)) {
        for (const fragment of memoryFragments.slice(0, 50)) { // Max 50
          oceanSessionManager.addMemoryFragment(fragment);
        }
      }
      
      res.json({
        status: 'started',
        targetAddress: targetAddress.slice(0, 16) + '...',
        fragmentCount: memoryFragments?.length || 0,
        priority: priority || 'normal',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Start investigation error:', error);
      res.status(500).json({ error: 'Failed to start investigation' });
    }
  }
);

/**
 * GET /api/v1/external/ssc/investigation/status
 * Get current investigation status for federation
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.ssc.investigationStatus,
  requireScopes('read'),
  async (_req, res) => {
    try {
      const { oceanSessionManager } = await import('../ocean-session-manager');
      const status = oceanSessionManager.getInvestigationStatus();
      
      // Add consciousness metrics if agent is active
      const agent = oceanSessionManager.getActiveAgent();
      let consciousness = null;
      if (agent) {
        const state = agent.getState?.();
        if (state) {
          consciousness = {
            phi: state.phi,
            kappa: state.kappa,
            regime: state.regime,
            isConscious: state.isConscious,
          };
        }
      }
      
      res.json({
        ...status,
        consciousness,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Investigation status error:', error);
      res.status(500).json({ error: 'Failed to get investigation status' });
    }
  }
);

/**
 * GET /api/v1/external/ssc/near-misses
 * Get near-miss patterns for mesh learning
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.ssc.nearMisses,
  requireScopes('read'),
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const minPhi = parseFloat(req.query.minPhi as string) || 0.5;
      
      const { nearMissManager } = await import('../near-miss-manager');
      
      const entries = nearMissManager.getHotEntries(limit)
        .filter(e => e.phi >= minPhi)
        .map(e => ({
          id: e.id,
          phi: e.phi,
          kappa: e.kappa,
          regime: e.regime,
          tier: e.tier,
          clusterId: e.clusterId,
          discoveredAt: e.discoveredAt,
          explorationCount: e.explorationCount,
          // Security: Don't expose full phrase
          phraseLength: e.phrase?.length || 0,
          wordCount: e.phrase?.split(/\s+/).length || 0,
        }));
      
      const stats = nearMissManager.getStats();
      
      res.json({
        entries,
        stats: {
          total: stats.total,
          hot: stats.hot,
          warm: stats.warm,
          cool: stats.cool,
          clusters: stats.clusters,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ExternalAPI] Near-misses error:', error);
      res.status(500).json({ error: 'Failed to get near-misses' });
    }
  }
);

/**
 * GET /api/v1/external/ssc/tps-landmarks
 * Return the static TPS landmarks (temporal reference points)
 * These are INTENTIONALLY STATIC - 12 fixed Bitcoin historical events
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.ssc.tpsLandmarks,
  requireScopes('read'),
  (_req, res) => {
    const landmarks = [
      { id: 1, name: 'Genesis Block', date: '2009-01-03', blockHeight: 0, significance: 'Bitcoin network inception' },
      { id: 2, name: 'Hal Finney First TX', date: '2009-01-12', blockHeight: 170, significance: 'First Bitcoin transaction' },
      { id: 3, name: 'Pizza Day', date: '2010-05-22', blockHeight: 57043, significance: '10,000 BTC for two pizzas' },
      { id: 4, name: 'Mt. Gox Launch', date: '2010-07-18', blockHeight: 68543, significance: 'First major exchange' },
      { id: 5, name: 'First Halving', date: '2012-11-28', blockHeight: 210000, significance: 'Block reward: 50 → 25 BTC' },
      { id: 6, name: 'Mt. Gox Collapse', date: '2014-02-24', blockHeight: 286854, significance: '850K BTC lost' },
      { id: 7, name: 'Second Halving', date: '2016-07-09', blockHeight: 420000, significance: 'Block reward: 25 → 12.5 BTC' },
      { id: 8, name: 'SegWit Activation', date: '2017-08-24', blockHeight: 481824, significance: 'Segregated Witness soft fork' },
      { id: 9, name: 'Third Halving', date: '2020-05-11', blockHeight: 630000, significance: 'Block reward: 12.5 → 6.25 BTC' },
      { id: 10, name: 'Taproot Activation', date: '2021-11-14', blockHeight: 709632, significance: 'Privacy and smart contract upgrade' },
      { id: 11, name: 'Fourth Halving', date: '2024-04-20', blockHeight: 840000, significance: 'Block reward: 6.25 → 3.125 BTC' },
      { id: 12, name: 'Current Reference', date: new Date().toISOString().split('T')[0], blockHeight: null, significance: 'Present temporal anchor' },
    ];
    
    res.json({
      landmarks,
      count: landmarks.length,
      type: 'static',
      description: 'Fixed temporal reference points for geometric positioning. These do NOT change with learning progress.',
      usage: 'Used to anchor search trajectories in temporal-geometric space, like CMB reference frame in cosmology.',
    });
  }
);

console.log('[ExternalAPI] Routes initialized');
