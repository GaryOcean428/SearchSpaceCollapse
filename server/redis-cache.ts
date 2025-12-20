/**
 * Redis Cache Layer for TypeScript
 * 
 * Provides fast caching for high-volume operations like tested phrases.
 * Works as a write-through cache: Redis → PostgreSQL
 * 
 * QIG Purity: Redis is geometry-agnostic storage.
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;
let isConnected = false;

// TTLs in seconds
export const CACHE_TTL = {
  SHORT: 300,      // 5 min for hot data
  MEDIUM: 3600,    // 1 hour for session data
  LONG: 86400,     // 24 hours for learned patterns
  PERMANENT: 86400 * 7,  // 7 days for critical data
};

// Key prefixes for namespacing
export const CACHE_KEYS = {
  TESTED_PHRASE: 'tested:',
  BALANCE_HIT: 'hit:',
  VOCABULARY: 'vocab:',
  KERNEL_STATE: 'kernel:',
  SESSION: 'session:',
  AUTO_CYCLE: 'autocycle:state',
  NEAR_MISS: 'nearmiss:state',
  OCEAN_MEMORY: 'ocean:memory',
};

/**
 * Initialize Redis connection
 */
export function initRedis(): Redis | null {
  if (!REDIS_URL) {
    console.log('[Redis] No REDIS_URL found - using in-memory cache only');
    return null;
  }

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      isConnected = true;
      console.log('[Redis] Connected to Redis cache');
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isConnected = false;
    });

    redis.on('close', () => {
      isConnected = false;
      console.log('[Redis] Connection closed');
    });

    // Attempt connection
    redis.connect().catch((err) => {
      console.error('[Redis] Initial connection failed:', err.message);
    });

    return redis;
  } catch (error) {
    console.error('[Redis] Initialization error:', error);
    return null;
  }
}

/**
 * Get Redis client (lazy init)
 */
export function getRedis(): Redis | null {
  if (!redis && REDIS_URL) {
    return initRedis();
  }
  return redis;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isConnected && redis !== null;
}

/**
 * Set a value with optional TTL
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  const client = getRedis();
  if (!client || !isConnected) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    console.error('[Redis] Set error:', error);
    return false;
  }
}

/**
 * Get a value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client || !isConnected) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

/**
 * Check if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client || !isConnected) return false;

  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a key
 */
export async function cacheDel(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client || !isConnected) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Set multiple values in a hash
 */
export async function cacheHSet(
  hashKey: string,
  field: string,
  value: unknown
): Promise<boolean> {
  const client = getRedis();
  if (!client || !isConnected) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.hset(hashKey, field, serialized);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get a field from a hash
 */
export async function cacheHGet<T>(hashKey: string, field: string): Promise<T | null> {
  const client = getRedis();
  if (!client || !isConnected) return null;

  try {
    const value = await client.hget(hashKey, field);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    return null;
  }
}

/**
 * Check if field exists in hash
 */
export async function cacheHExists(hashKey: string, field: string): Promise<boolean> {
  const client = getRedis();
  if (!client || !isConnected) return false;

  try {
    const exists = await client.hexists(hashKey, field);
    return exists === 1;
  } catch (error) {
    return false;
  }
}

/**
 * Increment a counter
 */
export async function cacheIncr(key: string): Promise<number> {
  const client = getRedis();
  if (!client || !isConnected) return 0;

  try {
    return await client.incr(key);
  } catch (error) {
    return 0;
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keys?: number;
  memory?: string;
}> {
  const client = getRedis();
  if (!client || !isConnected) {
    return { connected: false };
  }

  try {
    const info = await client.info('memory');
    const dbSize = await client.dbsize();
    
    const memMatch = info.match(/used_memory_human:(.+)/);
    const memory = memMatch ? memMatch[1].trim() : 'unknown';

    return {
      connected: true,
      keys: dbSize,
      memory,
    };
  } catch (error) {
    return { connected: false };
  }
}

/**
 * Pipeline multiple operations
 */
export function getPipeline() {
  const client = getRedis();
  if (!client || !isConnected) return null;
  return client.pipeline();
}

// Initialize on module load
initRedis();
