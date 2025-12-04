/**
 * Free-Only Blockchain API Architecture
 * 
 * Multi-provider approach with automatic failover, rate limiting, and caching.
 * Combined capacity: 230 req/min (2,300+ with caching)
 * Cost: $0/month
 * 
 * Providers:
 * 1. Blockstream (primary) - 60 req/min, most reliable
 * 2. Mempool.space - 60 req/min, fast
 * 3. Blockchain.com - 100 req/min, supports bulk queries
 * 4. BlockCypher - 10 req/min (200/hour), backup
 */

interface Provider {
  name: string;
  baseUrl: string;
  requestsPerMinute: number;
  currentRequests: number;
  lastReset: number;
  healthy: boolean;
  consecutiveFailures: number;
  lastFailure: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface AddressInfo {
  address: string;
  balance: number;
  txCount: number;
  funded: number;
  spent: number;
}

export class FreeBlockchainAPI {
  private providers: Provider[] = [
    {
      name: 'Blockstream',
      baseUrl: 'https://blockstream.info/api',
      requestsPerMinute: 60,
      currentRequests: 0,
      lastReset: Date.now(),
      healthy: true,
      consecutiveFailures: 0,
      lastFailure: 0
    },
    {
      name: 'Mempool',
      baseUrl: 'https://mempool.space/api',
      requestsPerMinute: 60,
      currentRequests: 0,
      lastReset: Date.now(),
      healthy: true,
      consecutiveFailures: 0,
      lastFailure: 0
    },
    {
      name: 'Blockchain.com',
      baseUrl: 'https://blockchain.info',
      requestsPerMinute: 100,
      currentRequests: 0,
      lastReset: Date.now(),
      healthy: true,
      consecutiveFailures: 0,
      lastFailure: 0
    },
    {
      name: 'BlockCypher',
      baseUrl: 'https://api.blockcypher.com/v1/btc/main',
      requestsPerMinute: 10,
      currentRequests: 0,
      lastReset: Date.now(),
      healthy: true,
      consecutiveFailures: 0,
      lastFailure: 0
    }
  ];
  
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private currentIndex = 0;
  
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalRequests = 0;
  private totalErrors = 0;

  constructor() {
    console.log('[FreeBlockchainAPI] Initialized with 4 providers (230 req/min combined)');
  }

  /**
   * Get address balance with automatic failover and deduplication
   */
  async getBalance(address: string): Promise<number> {
    this.totalRequests++;
    
    const cached = this.checkCache(`balance:${address}`);
    if (cached !== null) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;
    
    if (this.pendingRequests.has(`balance:${address}`)) {
      return this.pendingRequests.get(`balance:${address}`)!;
    }
    
    const promise = this._getBalanceWithFailover(address);
    this.pendingRequests.set(`balance:${address}`, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(`balance:${address}`);
    }
  }

  private async _getBalanceWithFailover(address: string): Promise<number> {
    const _startIndex = this.currentIndex;
    let attempts = 0;
    
    while (attempts < this.providers.length) {
      const provider = this.getNextProvider();
      
      try {
        const balance = await this.queryBalance(provider, address);
        this.recordSuccess(provider);
        this.setCache(`balance:${address}`, balance, 300);
        return balance;
      } catch (error: any) {
        this.recordFailure(provider, error);
        attempts++;
        
        if (error.message?.includes('429')) {
          await this.sleep(1000);
        }
      }
    }
    
    this.totalErrors++;
    throw new Error('All providers failed');
  }

  /**
   * Get full address info (balance + tx count)
   */
  async getAddressInfo(address: string): Promise<AddressInfo> {
    this.totalRequests++;
    
    const cached = this.checkCache(`info:${address}`);
    if (cached !== null) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;
    
    if (this.pendingRequests.has(`info:${address}`)) {
      return this.pendingRequests.get(`info:${address}`)!;
    }
    
    const promise = this._getAddressInfoWithFailover(address);
    this.pendingRequests.set(`info:${address}`, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(`info:${address}`);
    }
  }

  private async _getAddressInfoWithFailover(address: string): Promise<AddressInfo> {
    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this.getNextProvider();
      
      try {
        const info = await this.queryAddressInfo(provider, address);
        this.recordSuccess(provider);
        this.setCache(`info:${address}`, info, 300);
        return info;
      } catch (error: any) {
        this.recordFailure(provider, error);
      }
    }
    
    this.totalErrors++;
    throw new Error('All providers failed');
  }

  /**
   * Bulk balance check - tries multiple providers with automatic fallback
   * Priority: Blockchain.com (100/batch) -> Mempool parallel -> Blockstream parallel
   */
  async getBalances(addresses: string[]): Promise<Map<string, { balance: number; txCount: number }>> {
    if (addresses.length === 0) return new Map();
    
    const results = new Map<string, { balance: number; txCount: number }>();
    const uncached: string[] = [];
    
    for (const addr of addresses) {
      const cached = this.checkCache(`info:${addr}`);
      if (cached !== null) {
        this.cacheHits++;
        results.set(addr, { balance: cached.balance, txCount: cached.txCount });
      } else {
        this.cacheMisses++;
        uncached.push(addr);
      }
    }
    
    if (uncached.length === 0) return results;
    
    // Try bulk providers in order of efficiency
    const bulkProviders = [
      { name: 'Blockchain.com', method: this.tryBlockchainComBulk.bind(this) },
      { name: 'Mempool', method: this.tryMempoolParallel.bind(this) },
      { name: 'Blockstream', method: this.tryBlockstreamParallel.bind(this) },
    ];
    
    for (const { name, method } of bulkProviders) {
      const provider = this.providers.find(p => p.name === name);
      if (!provider?.healthy) {
        console.log(`[FreeBlockchainAPI] Skipping ${name} (unhealthy)`);
        continue;
      }
      
      try {
        const bulkResults = await method(uncached, provider);
        
        for (const [addr, data] of bulkResults) {
          results.set(addr, data);
        }
        
        console.log(`[FreeBlockchainAPI] Bulk query via ${name}: ${bulkResults.size}/${uncached.length} addresses`);
        return results;
        
      } catch (error: any) {
        console.warn(`[FreeBlockchainAPI] ${name} bulk failed:`, error.message || error);
        this.recordFailure(provider, error);
      }
    }
    
    // All bulk methods failed - fall back to individual queries
    console.warn('[FreeBlockchainAPI] All bulk providers failed, using individual queries');
    
    for (const addr of uncached) {
      if (!results.has(addr)) {
        try {
          const info = await this.getAddressInfo(addr);
          results.set(addr, { balance: info.balance, txCount: info.txCount });
        } catch {
          results.set(addr, { balance: 0, txCount: 0 });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Blockchain.com bulk API - up to 100 addresses per request
   */
  private async tryBlockchainComBulk(
    addresses: string[], 
    provider: Provider
  ): Promise<Map<string, { balance: number; txCount: number }>> {
    const results = new Map<string, { balance: number; txCount: number }>();
    const batches = this.chunk(addresses, 100);
    
    for (const batch of batches) {
      this.totalRequests++;
      const url = `${provider.baseUrl}/balance?active=${batch.join('|')}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (response.status === 429) {
          provider.healthy = false;
          throw new Error('Rate limited (429)');
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        provider.currentRequests++;
        this.recordSuccess(provider);
        
        for (const addr of batch) {
          const addrData = data[addr];
          if (addrData) {
            const balance = (addrData.final_balance || 0) / 1e8;
            const txCount = addrData.n_tx || 0;
            results.set(addr, { balance, txCount });
            
            this.setCache(`info:${addr}`, {
              address: addr,
              balance,
              txCount,
              funded: addrData.total_received / 1e8,
              spent: addrData.total_sent / 1e8
            }, 300);
          } else {
            results.set(addr, { balance: 0, txCount: 0 });
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
      
      if (batches.length > 1) {
        await this.sleep(100);
      }
    }
    
    return results;
  }
  
  /**
   * Mempool.space parallel queries - 10 concurrent requests
   */
  private async tryMempoolParallel(
    addresses: string[],
    provider: Provider
  ): Promise<Map<string, { balance: number; txCount: number }>> {
    const results = new Map<string, { balance: number; txCount: number }>();
    const concurrency = 10;
    const batches = this.chunk(addresses, concurrency);
    
    for (const batch of batches) {
      const promises = batch.map(async (addr) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(
            `${provider.baseUrl}/address/${addr}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          const balance = ((data.chain_stats?.funded_txo_sum || 0) - 
                          (data.chain_stats?.spent_txo_sum || 0)) / 1e8;
          const txCount = (data.chain_stats?.tx_count || 0);
          
          this.setCache(`info:${addr}`, {
            address: addr,
            balance,
            txCount,
            funded: (data.chain_stats?.funded_txo_sum || 0) / 1e8,
            spent: (data.chain_stats?.spent_txo_sum || 0) / 1e8
          }, 300);
          
          return { addr, balance, txCount, success: true };
        } catch (error) {
          clearTimeout(timeout);
          return { addr, balance: 0, txCount: 0, success: false };
        }
      });
      
      const batchResults = await Promise.all(promises);
      provider.currentRequests += batch.length;
      this.totalRequests += batch.length;
      
      let failures = 0;
      for (const result of batchResults) {
        results.set(result.addr, { balance: result.balance, txCount: result.txCount });
        if (!result.success) failures++;
      }
      
      if (failures > batch.length / 2) {
        throw new Error(`Too many failures: ${failures}/${batch.length}`);
      }
      
      this.recordSuccess(provider);
      
      if (batches.length > 1) {
        await this.sleep(200);
      }
    }
    
    return results;
  }
  
  /**
   * Blockstream parallel queries - 10 concurrent requests
   */
  private async tryBlockstreamParallel(
    addresses: string[],
    provider: Provider
  ): Promise<Map<string, { balance: number; txCount: number }>> {
    const results = new Map<string, { balance: number; txCount: number }>();
    const concurrency = 10;
    const batches = this.chunk(addresses, concurrency);
    
    for (const batch of batches) {
      const promises = batch.map(async (addr) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(
            `${provider.baseUrl}/address/${addr}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          const balance = ((data.chain_stats?.funded_txo_sum || 0) - 
                          (data.chain_stats?.spent_txo_sum || 0)) / 1e8;
          const txCount = (data.chain_stats?.tx_count || 0);
          
          this.setCache(`info:${addr}`, {
            address: addr,
            balance,
            txCount,
            funded: (data.chain_stats?.funded_txo_sum || 0) / 1e8,
            spent: (data.chain_stats?.spent_txo_sum || 0) / 1e8
          }, 300);
          
          return { addr, balance, txCount, success: true };
        } catch (error) {
          clearTimeout(timeout);
          return { addr, balance: 0, txCount: 0, success: false };
        }
      });
      
      const batchResults = await Promise.all(promises);
      provider.currentRequests += batch.length;
      this.totalRequests += batch.length;
      
      let failures = 0;
      for (const result of batchResults) {
        results.set(result.addr, { balance: result.balance, txCount: result.txCount });
        if (!result.success) failures++;
      }
      
      if (failures > batch.length / 2) {
        throw new Error(`Too many failures: ${failures}/${batch.length}`);
      }
      
      this.recordSuccess(provider);
      
      if (batches.length > 1) {
        await this.sleep(200);
      }
    }
    
    return results;
  }

  /**
   * Get next available provider using round-robin with health checks
   */
  private getNextProvider(): Provider {
    this.resetCountersIfNeeded();
    
    for (let i = 0; i < this.providers.length; i++) {
      const idx = (this.currentIndex + i) % this.providers.length;
      const provider = this.providers[idx];
      
      if (provider.healthy && provider.currentRequests < provider.requestsPerMinute) {
        this.currentIndex = (idx + 1) % this.providers.length;
        return provider;
      }
    }
    
    const healthyProviders = this.providers.filter(p => p.healthy);
    if (healthyProviders.length > 0) {
      return healthyProviders[0];
    }
    
    this.providers.forEach(p => p.healthy = true);
    return this.providers[0];
  }

  /**
   * Query balance from specific provider
   */
  private async queryBalance(provider: Provider, address: string): Promise<number> {
    provider.currentRequests++;
    
    let url: string;
    
    switch (provider.name) {
      case 'Blockstream':
      case 'Mempool':
        url = `${provider.baseUrl}/address/${address}`;
        break;
      case 'Blockchain.com':
        url = `${provider.baseUrl}/balance?active=${address}`;
        break;
      case 'BlockCypher':
        url = `${provider.baseUrl}/addrs/${address}/balance`;
        break;
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (response.status === 429) {
        throw new Error('Rate limited (429)');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      switch (provider.name) {
        case 'Blockstream':
        case 'Mempool':
          const funded = data.chain_stats?.funded_txo_sum || 0;
          const spent = data.chain_stats?.spent_txo_sum || 0;
          return (funded - spent) / 1e8;
        case 'Blockchain.com':
          const addrData = Object.values(data)[0] as any;
          return (addrData?.final_balance || 0) / 1e8;
        case 'BlockCypher':
          return (data.final_balance || 0) / 1e8;
        default:
          return 0;
      }
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Query full address info from specific provider
   */
  private async queryAddressInfo(provider: Provider, address: string): Promise<AddressInfo> {
    provider.currentRequests++;
    
    let url: string;
    
    switch (provider.name) {
      case 'Blockstream':
      case 'Mempool':
        url = `${provider.baseUrl}/address/${address}`;
        break;
      case 'Blockchain.com':
        url = `${provider.baseUrl}/balance?active=${address}`;
        break;
      case 'BlockCypher':
        url = `${provider.baseUrl}/addrs/${address}/balance`;
        break;
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (response.status === 429) {
        throw new Error('Rate limited (429)');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      switch (provider.name) {
        case 'Blockstream':
        case 'Mempool':
          const funded = data.chain_stats?.funded_txo_sum || 0;
          const spent = data.chain_stats?.spent_txo_sum || 0;
          return {
            address,
            balance: (funded - spent) / 1e8,
            txCount: data.chain_stats?.tx_count || 0,
            funded: funded / 1e8,
            spent: spent / 1e8
          };
        case 'Blockchain.com':
          const addrData = Object.values(data)[0] as any;
          return {
            address,
            balance: (addrData?.final_balance || 0) / 1e8,
            txCount: addrData?.n_tx || 0,
            funded: (addrData?.total_received || 0) / 1e8,
            spent: (addrData?.total_sent || 0) / 1e8
          };
        case 'BlockCypher':
          return {
            address,
            balance: (data.final_balance || 0) / 1e8,
            txCount: data.n_tx || 0,
            funded: (data.total_received || 0) / 1e8,
            spent: (data.total_sent || 0) / 1e8
          };
        default:
          return { address, balance: 0, txCount: 0, funded: 0, spent: 0 };
      }
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private checkCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    if (this.cache.size > 10000) {
      this.cleanupCache();
    }
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    if (this.cache.size > 8000) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - 5000);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Rate limit management
   */
  private resetCountersIfNeeded(): void {
    const now = Date.now();
    
    for (const provider of this.providers) {
      if (now - provider.lastReset > 60000) {
        provider.currentRequests = 0;
        provider.lastReset = now;
      }
      
      if (!provider.healthy && now - provider.lastFailure > 60000) {
        provider.healthy = true;
        provider.consecutiveFailures = 0;
      }
    }
  }

  /**
   * Health tracking
   */
  private recordSuccess(provider: Provider): void {
    provider.healthy = true;
    provider.consecutiveFailures = 0;
  }

  private recordFailure(provider: Provider, error: Error): void {
    provider.consecutiveFailures++;
    provider.lastFailure = Date.now();
    
    if (provider.consecutiveFailures >= 3) {
      provider.healthy = false;
      console.warn(`[FreeBlockchainAPI] ${provider.name} marked unhealthy after ${provider.consecutiveFailures} failures: ${error.message}`);
    }
  }

  /**
   * Utilities
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics
   */
  getStats(): {
    providers: { name: string; healthy: boolean; requests: string; failures: number }[];
    cacheSize: number;
    cacheHitRate: number;
    totalRequests: number;
    totalErrors: number;
    pendingRequests: number;
  } {
    this.resetCountersIfNeeded();
    
    const hitRate = this.cacheHits + this.cacheMisses > 0 
      ? this.cacheHits / (this.cacheHits + this.cacheMisses) 
      : 0;
    
    return {
      providers: this.providers.map(p => ({
        name: p.name,
        healthy: p.healthy,
        requests: `${p.currentRequests}/${p.requestsPerMinute}`,
        failures: p.consecutiveFailures
      })),
      cacheSize: this.cache.size,
      cacheHitRate: hitRate,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Get combined rate limit (requests available per minute across all providers)
   */
  getAvailableCapacity(): number {
    this.resetCountersIfNeeded();
    
    let available = 0;
    for (const provider of this.providers) {
      if (provider.healthy) {
        available += provider.requestsPerMinute - provider.currentRequests;
      }
    }
    return available;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Reset all provider health (force retry all)
   */
  resetProviderHealth(): void {
    for (const provider of this.providers) {
      provider.healthy = true;
      provider.consecutiveFailures = 0;
      provider.currentRequests = 0;
      provider.lastReset = Date.now();
    }
  }
}

export const freeBlockchainAPI = new FreeBlockchainAPI();
