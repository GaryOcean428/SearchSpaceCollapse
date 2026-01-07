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

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { sql } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import { db } from '../db';
import { logger } from '../lib/logger';
import { isLocalAuthenticated } from './auth';

const ENCRYPTION_KEY = process.env.FEDERATION_ENCRYPTION_KEY || randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string | null {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Federation] Failed to decrypt API key:', error);
    return null;
  }
}

export const federationRouter = Router();

// Public endpoints (no auth required) - for dashboard status polling and mesh network WebSocket
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

    const row = result.rows[0] as Record<string, unknown> | undefined;
    const peerCount = parseInt(String(row?.count || '0'), 10);
    const latestSync = row?.latest_sync as Date | null | undefined;

    res.json({
      isConnected: peerCount > 0,
      peerCount,
      lastSyncTime: latestSync?.toISOString?.() ?? latestSync ?? null,
      pendingPackets: 0,
      syncMode: peerCount > 0 ? 'bidirectional' : 'standalone',
    });
  } catch (error) {
    console.error('[Federation] Failed to get sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Public: List connected federated instances (read-only, no sensitive data)
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

    const instances = result.rows.map(r => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id,
        name: row.name as string,
        endpoint: row.endpoint as string,
        status: (row.status as string | null) || 'pending',
        capabilities: (row.capabilities as string[] | null) || [],
        syncDirection: (row.sync_direction as string | null) || 'bidirectional',
        lastSyncAt: row.last_sync_at as Date | null,
        createdAt: row.created_at as Date,
      };
    });

    res.json({ instances });
  } catch (error) {
    console.error('[Federation] Failed to list instances:', error);
    res.status(500).json({ error: 'Failed to list instances' });
  }
});

// All other routes require authentication
federationRouter.use(isLocalAuthenticated);

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
    // Check if table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'external_api_keys'
      ) as exists
    `);

    const tableExists = (tableCheck.rows[0] as { exists: boolean })?.exists;

    if (!tableExists) {
      logger.warn('[Federation] external_api_keys table does not exist');
      return res.json({ keys: [], warning: 'Table not initialized' });
    }

    const result = await db.execute(sql`
      SELECT id, name, instance_type, scopes, created_at, last_used_at, rate_limit, is_active
      FROM external_api_keys
      ORDER BY created_at DESC
    `);

    const formattedKeys: ApiKeyRecord[] = result.rows.map(k => {
      const row = k as Record<string, unknown>;
      return {
        id: String(row.id),
        name: row.name as string,
        instanceType: row.instance_type as string,
        scopes: Array.isArray(row.scopes) ? row.scopes as string[] : [],
        createdAt: row.created_at as Date,
        lastUsedAt: row.last_used_at as Date | null,
        rateLimit: (row.rate_limit as number | null) ?? 60,
        isActive: (row.is_active as boolean | null) ?? true,
      };
    });

    res.json({ keys: formattedKeys });
  } catch (error) {
    logger.error({ err: error, context: 'FederationListKeys' }, 'Failed to list keys');
    res.status(500).json({
      error: 'Failed to list API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
    // Convert array to PostgreSQL array literal format
    const scopesArrayLiteral = `{${requestedScopes.join(',')}}`;

    const result = await db.execute(sql`
      INSERT INTO external_api_keys (name, api_key, instance_type, scopes, rate_limit, is_active, created_at)
      VALUES (${name}, ${rawKey}, ${instanceType}, ${scopesArrayLiteral}::text[], ${finalRateLimit}, true, NOW())
      RETURNING id
    `);

    const insertedRow = result.rows[0] as { id: string | number } | undefined;
    const insertedId = insertedRow?.id;

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
 * POST /api/federation/test-connection
 * Test connection to a remote node before adding
 */
federationRouter.post('/test-connection', async (req: Request, res: Response) => {
  const { endpoint, apiKey } = req.body;

  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'endpoint is required' });
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'apiKey is required' });
  }

  try {
    const cleanEndpoint = endpoint.replace(/\/+$/, '');
    const healthUrl = `${cleanEndpoint}/health`;

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(healthUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;

    if (!response.ok) {
      return res.json({
        success: false,
        status: response.status,
        error: `Remote returned ${response.status}`,
        latency,
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      status: response.status,
      latency,
      remoteVersion: data.version || 'unknown',
      capabilities: data.capabilities || [],
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    logger.error({ err: error, context: 'Federation' }, 'Connection test failed');
    res.json({
      success: false,
      error: err.name === 'AbortError' ? 'Connection timeout' : err.message,
      latency: 0,
    });
  }
});

/**
 * POST /api/federation/connect
 * Connect to a remote federated node
 */
federationRouter.post('/connect', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { name, endpoint, apiKey, syncDirection } = req.body;

  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 128) {
    return res.status(400).json({ error: 'name is required (1-128 chars)' });
  }

  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'endpoint is required' });
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'apiKey is required' });
  }

  const validSyncDirections = ['inbound', 'outbound', 'bidirectional'];
  const direction = syncDirection || 'bidirectional';
  if (!validSyncDirections.includes(direction)) {
    return res.status(400).json({ error: 'Invalid syncDirection', valid: validSyncDirections });
  }

  try {
    const cleanEndpoint = endpoint.replace(/\/+$/, '');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const healthResponse = await fetch(`${cleanEndpoint}/health`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!healthResponse.ok) {
      return res.status(400).json({
        error: 'Failed to connect to remote node',
        details: `Remote returned status ${healthResponse.status}`,
      });
    }

    const healthData = await healthResponse.json();
    const capabilities = healthData.capabilities || ['consciousness', 'geometry'];

    const encryptedApiKey = encryptApiKey(apiKey);

    const result = await db.execute(sql`
      INSERT INTO federated_instances (name, endpoint, status, capabilities, sync_direction, remote_api_key, created_at)
      VALUES (${name}, ${cleanEndpoint}, 'active', ${JSON.stringify(capabilities)}::jsonb, ${direction}, ${encryptedApiKey}, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        name = EXCLUDED.name,
        status = 'active',
        capabilities = EXCLUDED.capabilities,
        sync_direction = EXCLUDED.sync_direction,
        remote_api_key = EXCLUDED.remote_api_key
      RETURNING id
    `);

    const insertedRow = result.rows[0] as { id: string | number } | undefined;
    const insertedId = insertedRow?.id;

    logger.info(`[Federation] Connected to node: ${name} (${cleanEndpoint})`);

    res.status(201).json({
      success: true,
      message: 'Connected to remote node',
      instanceId: insertedId,
      name,
      endpoint: cleanEndpoint,
      capabilities,
      syncDirection: direction,
    });
  } catch (error: unknown) {
    logger.error({ err: error, context: 'Federation' }, 'Failed to connect');
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError') {
      return res.status(400).json({ error: 'Connection timeout - remote node not responding' });
    }

    res.status(500).json({ error: 'Failed to connect to remote node', details: err.message });
  }
});

/**
 * DELETE /api/federation/instances/:instanceId
 * Disconnect from a federated instance
 */
federationRouter.delete('/instances/:instanceId', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { instanceId } = req.params;
  const numericId = parseInt(instanceId, 10);

  if (isNaN(numericId)) {
    return res.status(400).json({ error: 'Invalid instance ID' });
  }

  try {
    await db.execute(sql`
      DELETE FROM federated_instances WHERE id = ${numericId}
    `);

    res.json({ message: 'Instance disconnected', instanceId });
  } catch (error) {
    console.error('[Federation] Failed to disconnect instance:', error);
    res.status(500).json({ error: 'Failed to disconnect instance' });
  }
});

// Note: /instances and /sync/status are defined above the auth middleware to allow public read access
