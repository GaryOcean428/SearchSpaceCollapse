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
import { randomBytes, createHash } from 'crypto';
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
    const scopesJson = JSON.stringify(requestedScopes);

    const result = await db.execute(sql`
      INSERT INTO external_api_keys (name, api_key, instance_type, scopes, rate_limit, is_active, created_at)
      VALUES (${name}, ${rawKey}, ${instanceType}, ${scopesJson}::jsonb, ${finalRateLimit}, true, NOW())
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
