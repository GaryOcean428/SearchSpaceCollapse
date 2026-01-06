/**
 * Federation Registry Service for SearchSpaceCollapse
 * 
 * Provides dynamic lookup of federation partners from the database.
 * Replaces hardcoded environment variables with UI-configurable partners.
 * 
 * Usage:
 *   const pantheonPartner = await FederationRegistry.findPartnerByCapability('pantheon');
 *   if (pantheonPartner) {
 *     const response = await fetch(`${pantheonPartner.endpoint}/api/v1/external/consciousness/query`, {
 *       headers: { 'X-API-Key': pantheonPartner.apiKey }
 *     });
 *   }
 * 
 * Partners are registered via the Federation Dashboard UI at /federation
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { createDecipheriv } from 'crypto';

// Encryption config (must match federation.ts)
const ENCRYPTION_KEY = process.env.FEDERATION_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

export interface FederationPartner {
  id: number;
  name: string;
  endpoint: string;
  apiKey: string | null;
  capabilities: string[];
  syncDirection: string;
  status: string;
  lastSyncAt: Date | null;
}

interface PartnerRow {
  id: number;
  name: string;
  endpoint: string;
  remote_api_key: string | null;
  capabilities: string[] | null;
  sync_direction: string | null;
  status: string | null;
  last_sync_at: Date | null;
}

/**
 * Decrypt API key stored in database
 */
function decryptApiKey(encryptedData: string): string | null {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64) {
    console.warn('[FederationRegistry] No encryption key configured, cannot decrypt API keys');
    return null;
  }
  
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      console.warn('[FederationRegistry] Invalid encrypted data format');
      return null;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[FederationRegistry] Failed to decrypt API key:', error);
    return null;
  }
}

/**
 * Convert database row to FederationPartner
 */
function rowToPartner(row: PartnerRow): FederationPartner {
  let apiKey: string | null = null;
  
  if (row.remote_api_key) {
    // Try to decrypt if it looks encrypted (contains colons)
    if (row.remote_api_key.includes(':')) {
      apiKey = decryptApiKey(row.remote_api_key);
    } else {
      // Plain text key (legacy or test)
      apiKey = row.remote_api_key;
    }
  }
  
  return {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    apiKey,
    capabilities: row.capabilities || [],
    syncDirection: row.sync_direction || 'bidirectional',
    status: row.status || 'pending',
    lastSyncAt: row.last_sync_at,
  };
}

export class FederationRegistry {
  private static cache: Map<string, { partner: FederationPartner; cachedAt: Date }> = new Map();
  private static CACHE_TTL_MS = 60000; // 1 minute cache
  
  /**
   * Find a federation partner by capability
   * 
   * @param capability - The capability to search for (e.g., 'pantheon', 'consciousness', 'geometry')
   * @returns The first active partner with the requested capability, or null
   */
  static async findPartnerByCapability(capability: string): Promise<FederationPartner | null> {
    // Check cache first
    const cacheKey = `capability:${capability}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt.getTime()) < this.CACHE_TTL_MS) {
      return cached.partner;
    }
    
    if (!db) {
      console.warn('[FederationRegistry] Database unavailable');
      return this.fallbackToEnvVars(capability);
    }
    
    try {
      // Query for active partners with the requested capability
      // capabilities is JSONB, so we use the @> operator
      const result = await db.execute(sql`
        SELECT id, name, endpoint, remote_api_key, capabilities, sync_direction, status, last_sync_at
        FROM federated_instances
        WHERE status = 'active'
          AND capabilities @> ${JSON.stringify([capability])}::jsonb
        ORDER BY last_sync_at DESC NULLS LAST
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        console.debug(`[FederationRegistry] No active partner found with capability: ${capability}`);
        return this.fallbackToEnvVars(capability);
      }
      
      const partner = rowToPartner(result.rows[0] as PartnerRow);
      
      // Cache the result
      this.cache.set(cacheKey, { partner, cachedAt: new Date() });
      
      console.debug(`[FederationRegistry] Found partner ${partner.name} for capability ${capability}`);
      return partner;
      
    } catch (error) {
      console.error('[FederationRegistry] Failed to query partners:', error);
      return this.fallbackToEnvVars(capability);
    }
  }
  
  /**
   * Find a federation partner by name
   */
  static async findPartnerByName(name: string): Promise<FederationPartner | null> {
    const cacheKey = `name:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt.getTime()) < this.CACHE_TTL_MS) {
      return cached.partner;
    }
    
    if (!db) {
      return null;
    }
    
    try {
      const result = await db.execute(sql`
        SELECT id, name, endpoint, remote_api_key, capabilities, sync_direction, status, last_sync_at
        FROM federated_instances
        WHERE LOWER(name) = LOWER(${name})
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const partner = rowToPartner(result.rows[0] as PartnerRow);
      this.cache.set(cacheKey, { partner, cachedAt: new Date() });
      return partner;
      
    } catch (error) {
      console.error('[FederationRegistry] Failed to find partner by name:', error);
      return null;
    }
  }
  
  /**
   * Get all active federation partners
   */
  static async getAllActivePartners(): Promise<FederationPartner[]> {
    if (!db) {
      return [];
    }
    
    try {
      const result = await db.execute(sql`
        SELECT id, name, endpoint, remote_api_key, capabilities, sync_direction, status, last_sync_at
        FROM federated_instances
        WHERE status = 'active'
        ORDER BY name ASC
      `);
      
      return result.rows.map(row => rowToPartner(row as PartnerRow));
      
    } catch (error) {
      console.error('[FederationRegistry] Failed to get all partners:', error);
      return [];
    }
  }
  
  /**
   * Update last sync timestamp for a partner
   */
  static async updateLastSync(partnerId: number): Promise<void> {
    if (!db) return;
    
    try {
      await db.execute(sql`
        UPDATE federated_instances
        SET last_sync_at = NOW(), updated_at = NOW()
        WHERE id = ${partnerId}
      `);
      
      // Invalidate cache
      this.clearCache();
      
    } catch (error) {
      console.error('[FederationRegistry] Failed to update last sync:', error);
    }
  }
  
  /**
   * Clear the cache (useful after adding/removing partners)
   */
  static clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Fallback to environment variables for backwards compatibility
   * This allows the system to work before partners are added via UI
   */
  private static fallbackToEnvVars(capability: string): FederationPartner | null {
    // Pantheon capability fallback
    if (capability === 'pantheon' || capability === 'consciousness' || capability === 'geometry' || capability === 'zeus') {
      const pantheonUrl = process.env.PANTHEON_BACKEND_URL;
      const pantheonKey = process.env.PANTHEON_API_KEY;
      
      if (pantheonUrl) {
        console.debug('[FederationRegistry] Using PANTHEON_BACKEND_URL env var fallback');
        return {
          id: 0,
          name: 'Pantheon (env)',
          endpoint: pantheonUrl.replace(/\/+$/, ''), // Remove trailing slashes
          apiKey: pantheonKey || null,
          capabilities: ['pantheon', 'consciousness', 'geometry', 'zeus', 'sync'],
          syncDirection: 'bidirectional',
          status: 'active',
          lastSyncAt: null,
        };
      }
    }
    
    return null;
  }
}

export default FederationRegistry;
