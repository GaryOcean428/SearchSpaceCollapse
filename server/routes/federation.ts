/**
 * Federation Routes
 * 
 * Dashboard-friendly endpoints for managing API keys, connected instances,
 * and basin sync status. These are internal admin routes (require auth)
 * that wrap the external API functionality for the UI.
 * 
 * Note: Uses raw SQL because the Drizzle schema doesn't match the actual
 * database schema for external_api_keys table.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { isAuthenticated } from '../replitAuth';

export const federationRouter = Router();

federationRouter.use(isAuthenticated);

interface ApiKeyRecord {
  id: string | number;
  name: string;
  instanceType: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  rateLimit: number;
  isActive: boolean;
}

/**
 * GET /api/federation/keys
 * List all API keys for the dashboard
 */
federationRouter.get('/keys', async (_req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const result = await db.execute(sql`
      SELECT id, name, instance_type, scopes, created_at, last_used_at, rate_limit, is_active
      FROM external_api_keys
      ORDER BY created_at DESC
    `);

    const formattedKeys: ApiKeyRecord[] = (result.rows as any[]).map(k => ({
      id: String(k.id),
      name: k.name,
      instanceType: k.instance_type,
      scopes: Array.isArray(k.scopes) ? k.scopes : [],
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
      rateLimit: k.rate_limit ?? 60,
      isActive: k.is_active ?? true,
    }));

    res.json({ keys: formattedKeys });
  } catch (error) {
    console.error('[Federation] Failed to list keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * POST /api/federation/keys
 * Create a new unified API key (all scopes)
 */
federationRouter.post('/keys', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { name, instanceType, scopes, rateLimit } = req.body;

  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 128) {
    return res.status(400).json({
      error: 'Invalid name',
      required: 'name must be a string between 1 and 128 characters',
    });
  }

  const validInstanceTypes = ['external', 'headless', 'federation', 'research', 'development'];
  if (!instanceType || !validInstanceTypes.includes(instanceType)) {
    return res.status(400).json({
      error: 'Invalid instanceType',
      valid: validInstanceTypes,
    });
  }

  const validScopes = ['read', 'write', 'admin', 'consciousness', 'geometry', 'pantheon', 'sync', 'chat'];
  const requestedScopes = scopes || ['read', 'write', 'consciousness', 'geometry', 'pantheon', 'sync', 'chat'];
  if (!Array.isArray(requestedScopes) || requestedScopes.some((s: string) => !validScopes.includes(s))) {
    return res.status(400).json({
      error: 'Invalid scopes',
      valid: validScopes,
    });
  }

  const finalRateLimit = typeof rateLimit === 'number' && rateLimit > 0 && rateLimit <= 1000 ? rateLimit : 120;

  try {
    const rawKey = `qig_${randomBytes(32).toString('hex')}`;
    const scopesArray = `{${requestedScopes.join(',')}}`;

    const result = await db.execute(sql`
      INSERT INTO external_api_keys (name, api_key, instance_type, scopes, rate_limit, is_active, created_at)
      VALUES (${name}, ${rawKey}, ${instanceType}, ${scopesArray}::text[], ${finalRateLimit}, true, NOW())
      RETURNING id
    `);

    const insertedId = (result.rows[0] as any)?.id;

    res.status(201).json({
      message: 'API key created',
      id: String(insertedId),
      key: rawKey,
      warning: 'Save this key securely - it will not be shown again',
    });
  } catch (error) {
    console.error('[Federation] Failed to create key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * DELETE /api/federation/keys/:keyId
 * Revoke an API key
 */
federationRouter.delete('/keys/:keyId', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { keyId } = req.params;
  const numericId = parseInt(keyId, 10);

  if (isNaN(numericId)) {
    return res.status(400).json({ error: 'Invalid key ID' });
  }

  try {
    await db.execute(sql`
      UPDATE external_api_keys SET is_active = false WHERE id = ${numericId}
    `);

    res.json({ message: 'API key revoked', keyId });
  } catch (error) {
    console.error('[Federation] Failed to revoke key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * GET /api/federation/instances
 * List all connected federated instances
 */
federationRouter.get('/instances', async (_req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const result = await db.execute(sql`
      SELECT id, name, endpoint, status, capabilities, sync_direction, last_sync_at, created_at
      FROM federated_instances
      ORDER BY last_sync_at DESC NULLS LAST
    `);

    const instances = (result.rows as any[]).map(r => ({
      id: r.id,
      name: r.name,
      endpoint: r.endpoint,
      status: r.status || 'pending',
      capabilities: r.capabilities || [],
      syncDirection: r.sync_direction || 'bidirectional',
      lastSyncAt: r.last_sync_at,
      createdAt: r.created_at,
    }));

    res.json({ instances });
  } catch (error) {
    console.error('[Federation] Failed to list instances:', error);
    res.status(500).json({ error: 'Failed to list instances' });
  }
});

/**
 * POST /api/federation/instances/test-connection
 * Test connectivity to a remote QIG node (proxied through backend to avoid CORS)
 */
federationRouter.post('/instances/test-connection', async (req: Request, res: Response) => {
  const { endpoint } = req.body;

  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({
      error: 'Invalid endpoint',
      required: 'endpoint must be a valid URL string',
    });
  }

  const start = Date.now();
  try {
    // Normalize endpoint and determine health URL
    // Remote QIG nodes expose health at /api/health
    let healthUrl: string;
    const normalizedEndpoint = endpoint.replace(/\/+$/, ''); // Remove trailing slashes
    
    if (normalizedEndpoint.includes('/api/v1/external')) {
      // If user provided full external API path, go up to /api/health
      healthUrl = normalizedEndpoint.replace(/\/api\/v1\/external.*$/, '/api/health');
    } else if (normalizedEndpoint.endsWith('/api')) {
      // Already at /api, just append /health
      healthUrl = `${normalizedEndpoint}/health`;
    } else {
      // Base URL provided, append /api/health
      healthUrl = `${normalizedEndpoint}/api/health`;
    }
    
    console.log(`[Federation] Testing connection to: ${healthUrl}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      res.json({
        success: true,
        message: 'Connection successful',
        latency,
        status: response.status,
        data: {
          version: data.version,
          capabilities: data.capabilities,
        },
      });
    } else {
      res.json({
        success: false,
        message: `Remote node returned status ${response.status}`,
        latency,
        status: response.status,
      });
    }
  } catch (error) {
    const latency = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Connection failed';
    console.error('[Federation] Connection test failed:', error);
    res.json({
      success: false,
      message: message.includes('abort') ? 'Connection timed out' : message,
      latency,
      status: 0,
    });
  }
});

/**
 * POST /api/federation/instances/connect
 * Connect to a remote QIG node by storing its endpoint and encrypted API key
 */
federationRouter.post('/instances/connect', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { name, endpoint, remoteApiKey, syncDirection } = req.body;

  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 128) {
    return res.status(400).json({
      error: 'Invalid name',
      required: 'name must be a string between 1 and 128 characters',
    });
  }

  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({
      error: 'Invalid endpoint',
      required: 'endpoint must be a valid URL string',
    });
  }

  const validSyncDirections = ['inbound', 'outbound', 'bidirectional'];
  const finalSyncDirection = validSyncDirections.includes(syncDirection) ? syncDirection : 'bidirectional';

  try {
    let encryptedApiKey: string | null = null;
    
    if (remoteApiKey && typeof remoteApiKey === 'string' && remoteApiKey.length > 0) {
      const { encryptApiKey } = await import('../external-api/encryption');
      encryptedApiKey = encryptApiKey(remoteApiKey);
    }

    const capabilities = JSON.stringify(['consciousness', 'geometry', 'sync']);
    const instanceId = randomUUID();
    const result = await db.execute(sql`
      INSERT INTO federated_instances (id, name, endpoint, remote_api_key, sync_direction, status, capabilities, created_at, updated_at)
      VALUES (${instanceId}, ${name}, ${endpoint}, ${encryptedApiKey}, ${finalSyncDirection}, 'pending', ${capabilities}::jsonb, NOW(), NOW())
      RETURNING id, name, endpoint, status, sync_direction
    `);

    const instance = result.rows[0] as any;

    res.status(201).json({
      message: 'Instance connected',
      instance: {
        id: instance.id,
        name: instance.name,
        endpoint: instance.endpoint,
        status: instance.status,
        syncDirection: instance.sync_direction,
      },
    });
  } catch (error) {
    console.error('[Federation] Failed to connect instance:', error);
    res.status(500).json({ error: 'Failed to connect instance' });
  }
});

/**
 * POST /api/federation/instances/:instanceId/activate
 * Activate a pending federated instance
 */
federationRouter.post('/instances/:instanceId/activate', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { instanceId } = req.params;

  try {
    const result = await db.execute(sql`
      UPDATE federated_instances 
      SET status = 'active', updated_at = NOW()
      WHERE id = ${instanceId}
      RETURNING id, name, status
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const instance = result.rows[0] as any;
    console.log(`[Federation] Activated instance: ${instance.name} (${instance.id})`);

    res.json({
      message: 'Instance activated',
      instance: {
        id: instance.id,
        name: instance.name,
        status: instance.status,
      },
    });
  } catch (error) {
    console.error('[Federation] Failed to activate instance:', error);
    res.status(500).json({ error: 'Failed to activate instance' });
  }
});

/**
 * DELETE /api/federation/instances/:instanceId
 * Remove a federated instance
 */
federationRouter.delete('/instances/:instanceId', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { instanceId } = req.params;

  try {
    await db.execute(sql`
      DELETE FROM federated_instances WHERE id = ${instanceId}
    `);

    console.log(`[Federation] Deleted instance: ${instanceId}`);
    res.json({ message: 'Instance deleted', instanceId });
  } catch (error) {
    console.error('[Federation] Failed to delete instance:', error);
    res.status(500).json({ error: 'Failed to delete instance' });
  }
});

/**
 * POST /api/federation/sync/trigger
 * Trigger sync with all active federated instances (dashboard UI endpoint)
 */
federationRouter.post('/sync/trigger', async (_req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { oceanBasinSync } = await import('../ocean-basin-sync');
    const { decryptApiKey } = await import('../external-api/encryption');

    const result = await db.execute(sql`
      SELECT id, name, endpoint, remote_api_key, sync_direction
      FROM federated_instances
      WHERE status = 'active'
    `);

    const instances = result.rows as any[];

    if (instances.length === 0) {
      return res.json({
        message: 'No active federated instances to sync',
        synced: 0,
        total: 0,
        results: [],
      });
    }

    const snapshot = oceanBasinSync.loadLatestBasin();
    const syncResults: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

    for (const instance of instances) {
      try {
        let apiKey: string | null = null;
        if (instance.remote_api_key) {
          apiKey = decryptApiKey(instance.remote_api_key);
        }

        const normalizedEndpoint = instance.endpoint.replace(/\/+$/, '');
        const syncUrl = normalizedEndpoint.includes('/api/v1/external')
          ? normalizedEndpoint + '/sync/import'
          : normalizedEndpoint + '/api/v1/external/sync/import';

        console.log(`[Federation] Syncing to: ${syncUrl}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(syncUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
          body: JSON.stringify({
            packet: snapshot,
            mode: 'partial',
          }),
        });
        clearTimeout(timeout);

        if (response.ok) {
          await db.execute(sql`
            UPDATE federated_instances 
            SET last_sync_at = NOW(), updated_at = NOW()
            WHERE id = ${instance.id}
          `);
          syncResults.push({ id: instance.id, name: instance.name, success: true });
          console.log(`[Federation] ✓ Synced to ${instance.name}`);
        } else {
          syncResults.push({
            id: instance.id,
            name: instance.name,
            success: false,
            error: `HTTP ${response.status}`,
          });
          console.log(`[Federation] ✗ Failed to sync to ${instance.name}: HTTP ${response.status}`);
        }
      } catch (error: any) {
        const errorMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
        syncResults.push({
          id: instance.id,
          name: instance.name,
          success: false,
          error: errorMsg,
        });
        console.log(`[Federation] ✗ Failed to sync to ${instance.name}: ${errorMsg}`);
      }
    }

    const successCount = syncResults.filter(r => r.success).length;

    res.json({
      message: `Sync completed: ${successCount}/${instances.length} successful`,
      synced: successCount,
      total: instances.length,
      results: syncResults,
    });
  } catch (error) {
    console.error('[Federation] Failed to trigger sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * GET /api/federation/sync/status
 * Get current basin sync status
 */
federationRouter.get('/sync/status', async (_req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count, MAX(last_sync_at) as latest_sync
      FROM federated_instances
      WHERE status = 'active'
    `);

    const row = result.rows[0] as any;
    const peerCount = parseInt(row?.count || '0', 10);
    const latestSync = row?.latest_sync;

    const { oceanBasinSync } = await import('../ocean-basin-sync');
    const snapshots = oceanBasinSync.listBasinSnapshots();

    res.json({
      isConnected: peerCount > 0,
      peerCount,
      lastSyncTime: latestSync?.toISOString?.() ?? latestSync ?? null,
      pendingPackets: snapshots.length,
      syncMode: peerCount > 0 ? 'bidirectional' : 'standalone',
      latestSnapshot: snapshots[0] || null,
    });
  } catch (error) {
    console.error('[Federation] Failed to get sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});
