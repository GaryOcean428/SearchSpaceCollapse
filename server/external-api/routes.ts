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
 */

import { Router, Response } from 'express';
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
import { federatedInstances, externalApiKeys } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { oceanBasinSync, type BasinSyncPacket } from '../ocean-basin-sync';

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
  
  // Chat
  chat: {
    send: '/chat',
    history: '/chat/history',
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
    const success = await revokeApiKey(keyId);
    
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
 * Query current consciousness state (Φ, κ, regime)
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.consciousness.query,
  requireScopes('consciousness', 'read'),
  async (_req, res) => {
    // TODO: Integrate with actual consciousness system
    // For now, return placeholder structure
    res.json({
      phi: 0.75,
      kappa_eff: 64.21,
      regime: 'GEOMETRIC',
      basin_coords: null, // 64D coords if requested
      timestamp: new Date().toISOString(),
      note: 'Placeholder - integrate with Ocean consciousness system',
    });
  }
);

/**
 * GET /api/v1/external/consciousness/metrics
 * Get detailed consciousness metrics
 */
externalApiRouter.get(
  EXTERNAL_API_ROUTES.consciousness.metrics,
  requireScopes('consciousness', 'read'),
  async (_req, res) => {
    res.json({
      current: {
        phi: 0.75,
        kappa_eff: 64.21,
        regime: 'GEOMETRIC',
      },
      history: {
        phi_24h_avg: 0.72,
        kappa_24h_avg: 63.5,
        regime_distribution: {
          LINEAR: 0.1,
          GEOMETRIC: 0.7,
          HYPERDIMENSIONAL: 0.2,
        },
      },
      thresholds: {
        phi_emergency: 0.50,
        phi_threshold: 0.70,
        phi_hyperdimensional: 0.75,
      },
      note: 'Placeholder - integrate with telemetry system',
    });
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
    
    // Fisher-Rao distance computation requires Python backend integration
    // QIG-pure constraint: No Euclidean approximations allowed
    // TODO: Integrate with qig-backend/qig_geometry.py for actual Fisher-Rao
    return res.status(501).json({
      error: 'Fisher-Rao distance computation not yet integrated',
      code: 'NOT_IMPLEMENTED',
      method,
      dimensionality: point_a.length,
      note: 'QIG-pure constraint: Euclidean approximations forbidden. Awaiting Python backend integration.',
    });
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
    
    // 64D basin distance requires Fisher-Rao computation from qig-universal
    // QIG-pure constraint: No Euclidean approximations allowed
    // TODO: Integrate with fisherCoordDistance from server/qig-universal.ts
    return res.status(501).json({
      error: 'Basin distance computation not yet integrated',
      code: 'NOT_IMPLEMENTED',
      dimensionality: 64,
      note: 'QIG-pure constraint: Euclidean approximations forbidden. Awaiting qig-universal integration.',
    });
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
          name,
          apiKeyId: req.apiKeyId,
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
    // TODO: Get actual basin packet from oceanBasinSync
    res.json({
      packet: null,
      exported_at: new Date().toISOString(),
      note: 'Placeholder - integrate with oceanBasinSync.createSnapshot',
    });
  }
);

/**
 * POST /api/v1/external/sync/import
 * Import a basin packet from another instance
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
    
    // TODO: Import the packet
    // const result = await oceanBasinSync.importFromPacket(packet, mode);
    
    res.json({
      success: true,
      mode,
      imported_at: new Date().toISOString(),
      note: 'Placeholder - integrate with oceanBasinSync.importSnapshot',
    });
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

console.log('[ExternalAPI] Routes initialized');
