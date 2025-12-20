/**
 * MULTI-PROVIDER SEARCH ORCHESTRATOR
 * 
 * Combines multiple free search providers for maximum coverage:
 * 1. SearXNG (metasearch - aggregates 70+ engines)
 * 2. Direct Google (web scraping - no API keys)
 * 
 * Features:
 * - Automatic failover between providers
 * - Parallel search for faster results
 * - Result deduplication and ranking
 * - Rate limit management
 * - Provider health monitoring
 */

import { SearXNGGeometricAdapter } from './searxng-adapter';
import { GoogleSearchProvider, getGoogleSearchProvider } from './google-search-provider';
import { fisherCoordDistance } from '../qig-universal';
import { tps, TemporalPositioningSystem } from './temporal-positioning-system';
import type {
  BlockUniverseMap,
  GeometricDiscovery,
  GeometricQuery,
  RawDiscovery,
} from './types';

export type SearchMode = 'parallel' | 'fallback' | 'primary_only';

export interface MultiSearchConfig {
  mode: SearchMode;
  primaryProvider: 'searxng' | 'google';
  timeout: number;
  deduplicateResults: boolean;
}

export interface ProviderHealth {
  name: string;
  healthy: boolean;
  lastSuccess: number;
  failureCount: number;
}

export class MultiSearchOrchestrator {
  private searxng: SearXNGGeometricAdapter;
  private google: GoogleSearchProvider;
  private config: MultiSearchConfig;
  private tps: TemporalPositioningSystem;
  private providerHealth: Map<string, ProviderHealth>;
  
  constructor(config?: Partial<MultiSearchConfig>) {
    this.config = {
      mode: 'parallel',
      primaryProvider: 'searxng',
      timeout: 20000,
      deduplicateResults: true,
      ...config,
    };
    
    this.searxng = new SearXNGGeometricAdapter();
    this.google = getGoogleSearchProvider();
    this.tps = tps;
    
    this.providerHealth = new Map([
      ['searxng', { name: 'SearXNG', healthy: true, lastSuccess: Date.now(), failureCount: 0 }],
      ['google', { name: 'Google', healthy: true, lastSuccess: Date.now(), failureCount: 0 }],
    ]);
    
    console.log('[MultiSearch] Orchestrator initialized');
    console.log(`[MultiSearch] Mode: ${this.config.mode}, Primary: ${this.config.primaryProvider}`);
  }
  
  async search(query: GeometricQuery): Promise<RawDiscovery[]> {
    console.log(`[MultiSearch] Searching: "${query.text.slice(0, 50)}..." (mode: ${this.config.mode})`);
    
    switch (this.config.mode) {
      case 'parallel':
        return this.searchParallel(query);
      case 'fallback':
        return this.searchWithFallback(query);
      case 'primary_only':
        return this.searchPrimaryOnly(query);
      default:
        return this.searchParallel(query);
    }
  }
  
  private async searchParallel(query: GeometricQuery): Promise<RawDiscovery[]> {
    // Track which providers completed before timeout
    let searxngCompleted = false;
    let googleCompleted = false;
    let timedOut = false;
    
    const searxngPromise = this.searxng.search(query)
      .then(results => {
        searxngCompleted = true;
        if (!timedOut) {
          this.markSuccess('searxng');
        }
        return results.map(r => ({ ...r, source: 'searxng' }));
      })
      .catch(err => {
        searxngCompleted = true;
        this.markFailure('searxng');
        console.error('[MultiSearch] SearXNG failed:', err.message);
        return [] as RawDiscovery[];
      });
    
    const googlePromise = this.google.searchGeometric(query)
      .then(results => {
        googleCompleted = true;
        if (!timedOut) {
          this.markSuccess('google');
        }
        return results.map(r => ({ ...r, source: 'google' }));
      })
      .catch(err => {
        googleCompleted = true;
        this.markFailure('google');
        console.error('[MultiSearch] Google failed:', err.message);
        return [] as RawDiscovery[];
      });
    
    // Race between completion and timeout
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), this.config.timeout);
    });
    
    const raceResult = await Promise.race([
      Promise.all([searxngPromise, googlePromise]).then(results => ({ type: 'complete' as const, results })),
      timeoutPromise.then(() => ({ type: 'timeout' as const, results: [[], []] as [RawDiscovery[], RawDiscovery[]] })),
    ]);
    
    // If timeout occurred, mark incomplete providers as failed
    if (raceResult.type === 'timeout') {
      timedOut = true;
      console.log(`[MultiSearch] Timeout after ${this.config.timeout}ms`);
      
      if (!searxngCompleted) {
        this.markFailure('searxng');
        console.log('[MultiSearch] SearXNG did not complete in time');
      }
      if (!googleCompleted) {
        this.markFailure('google');
        console.log('[MultiSearch] Google did not complete in time');
      }
    }
    
    const [searxngResults, googleResults] = raceResult.results;
    
    const combined = [...searxngResults, ...googleResults];
    const deduplicated = this.config.deduplicateResults 
      ? this.deduplicateResults(combined) 
      : combined;
    
    console.log(`[MultiSearch] Combined: ${searxngResults.length} SearXNG + ${googleResults.length} Google = ${deduplicated.length} unique`);
    
    return deduplicated;
  }
  
  private async searchWithFallback(query: GeometricQuery): Promise<RawDiscovery[]> {
    const primary = this.config.primaryProvider;
    const fallback = primary === 'searxng' ? 'google' : 'searxng';
    
    const primaryHealth = this.providerHealth.get(primary);
    if (primaryHealth?.healthy) {
      try {
        const results = await this.searchProvider(primary, query);
        if (results.length > 0) {
          this.markSuccess(primary);
          return results;
        }
      } catch (err: any) {
        this.markFailure(primary);
        console.log(`[MultiSearch] Primary (${primary}) failed, trying fallback`);
      }
    }
    
    try {
      const results = await this.searchProvider(fallback, query);
      this.markSuccess(fallback);
      return results;
    } catch (err: any) {
      this.markFailure(fallback);
      console.error('[MultiSearch] All providers failed');
      return [];
    }
  }
  
  private async searchPrimaryOnly(query: GeometricQuery): Promise<RawDiscovery[]> {
    return this.searchProvider(this.config.primaryProvider, query);
  }
  
  private async searchProvider(provider: string, query: GeometricQuery): Promise<RawDiscovery[]> {
    if (provider === 'searxng') {
      return this.searxng.search(query);
    } else if (provider === 'google') {
      return this.google.searchGeometric(query);
    }
    return [];
  }
  
  private deduplicateResults(results: RawDiscovery[]): RawDiscovery[] {
    const seen = new Map<string, RawDiscovery>();
    
    for (const result of results) {
      const domain = this.extractDomain(result.url);
      const key = `${domain}:${result.title.slice(0, 50)}`;
      
      if (!seen.has(key)) {
        seen.set(key, result);
      } else {
        const existing = seen.get(key)!;
        if ((result.score || 0) > (existing.score || 0)) {
          seen.set(key, result);
        }
      }
    }
    
    return Array.from(seen.values());
  }
  
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
  
  private markSuccess(provider: string): void {
    const health = this.providerHealth.get(provider);
    if (health) {
      health.healthy = true;
      health.lastSuccess = Date.now();
      health.failureCount = 0;
    }
  }
  
  private markFailure(provider: string): void {
    const health = this.providerHealth.get(provider);
    if (health) {
      health.failureCount++;
      if (health.failureCount >= 3) {
        health.healthy = false;
        console.log(`[MultiSearch] Provider ${provider} marked unhealthy after ${health.failureCount} failures`);
      }
    }
  }
  
  async discoverAtCoordinates(
    targetCoords: BlockUniverseMap,
    radius: number = 2.0
  ): Promise<GeometricDiscovery[]> {
    const query = this.coordsToQuery(targetCoords);
    
    console.log(`[MultiSearch] Discovering at coordinates (multi-provider):`);
    console.log(`  Era: ${this.tps.classifyEra(targetCoords.spacetime.t)}`);
    console.log(`  Query: "${query.text}"`);
    
    const rawResults = await this.search(query);
    
    if (rawResults.length === 0) {
      console.log(`[MultiSearch] No discoveries found`);
      return [];
    }
    
    const discoveries: GeometricDiscovery[] = [];
    
    for (const result of rawResults) {
      const resultCoords = this.tps.locateInBlockUniverse(
        result.content,
        result.url
      );
      
      const distance = fisherCoordDistance(
        targetCoords.cultural,
        resultCoords.cultural
      );
      
      if (distance < radius) {
        const patterns = this.extractPatterns(result.content);
        const pastLightCone = this.tps.getPastLightCone(resultCoords);
        
        discoveries.push({
          content: result.content,
          url: result.url,
          coords: resultCoords,
          distance,
          phi: resultCoords.phi,
          patterns,
          causalChain: pastLightCone,
          entropyReduction: this.computeEntropyReduction(distance, patterns.length),
        });
      }
    }
    
    discoveries.sort((a, b) => a.distance - b.distance);
    
    console.log(`[MultiSearch] Found ${discoveries.length} geometric discoveries`);
    
    return discoveries;
  }
  
  private coordsToQuery(coords: BlockUniverseMap): GeometricQuery {
    const era = this.tps.classifyEra(coords.spacetime.t);
    
    const eraTerms: Record<string, string[]> = {
      'satoshi_genesis': ['bitcoin', 'satoshi', 'nakamoto', 'genesis block', '2009'],
      'satoshi_late': ['bitcoin', 'btc', 'hal finney', 'early mining', '2010'],
      'post_satoshi': ['bitcoin', 'mtgox', 'silk road', '2011', '2012'],
      'mtgox_rise': ['bitcoin', 'btc', 'wallet', 'mtgox', 'exchange', 'trading', 'silk road', '2011'],
      'mtgox_peak': ['bitcoin', 'btc', 'mtgox', 'bitstamp', '2013', 'bubble'],
      'mtgox_collapse': ['bitcoin', 'gox', 'hack', '2014', 'lost coins'],
      'eth_emergence': ['bitcoin', 'ethereum', 'altcoin', '2015', '2016'],
      'ico_boom': ['bitcoin', 'crypto', 'ico', '2017', 'bull run'],
      'post_ico': ['bitcoin', 'crypto', 'bear market', '2018', '2019'],
      'modern': ['bitcoin', 'btc', 'crypto', 'defi', '2020', '2021'],
    };
    
    const terms = eraTerms[era] || ['bitcoin', 'wallet', 'crypto'];
    const queryText = terms.join(' ');
    
    const eraTimeRange: Record<string, { start: Date; end: Date }> = {
      'satoshi_genesis': { start: new Date('2009-01-01'), end: new Date('2009-12-31') },
      'satoshi_late': { start: new Date('2010-01-01'), end: new Date('2010-12-31') },
      'post_satoshi': { start: new Date('2011-01-01'), end: new Date('2012-06-30') },
      'mtgox_rise': { start: new Date('2011-01-01'), end: new Date('2013-06-30') },
      'mtgox_peak': { start: new Date('2013-01-01'), end: new Date('2014-02-28') },
      'mtgox_collapse': { start: new Date('2014-01-01'), end: new Date('2015-12-31') },
    };
    
    return {
      text: queryText,
      timeRange: eraTimeRange[era],
      maxResults: 10,
    };
  }
  
  private extractPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    const bitcoinPatterns = [
      /\b(wallet|address|private key|seed phrase|mnemonic)\b/gi,
      /\b(satoshi|nakamoto|genesis|block)\b/gi,
      /\b(mtgox|mt\.gox|gox)\b/gi,
      /\b(silk\s*road|darknet|onion)\b/gi,
      /\b(brain\s*wallet|paper\s*wallet|cold\s*storage)\b/gi,
      /\b(bitcoin\s*core|electrum|multibit)\b/gi,
      /\b(lost|forgot|recover|backup)\b/gi,
      /\b(2009|2010|2011|2012|2013)\b/g,
    ];
    
    for (const pattern of bitcoinPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push(...matches.map(m => m.toLowerCase()));
      }
    }
    
    return [...new Set(patterns)];
  }
  
  private computeEntropyReduction(distance: number, patternCount: number): number {
    const distanceContribution = Math.max(0, (2.0 - distance) / 2.0) * 0.5;
    const patternContribution = Math.min(patternCount / 10, 1.0) * 0.3;
    return (distanceContribution + patternContribution) * 256;
  }
  
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }
  
  getConfig(): MultiSearchConfig {
    return { ...this.config };
  }
  
  setMode(mode: SearchMode): void {
    this.config.mode = mode;
    console.log(`[MultiSearch] Mode changed to: ${mode}`);
  }
  
  setPrimaryProvider(provider: 'searxng' | 'google'): void {
    this.config.primaryProvider = provider;
    console.log(`[MultiSearch] Primary provider changed to: ${provider}`);
  }
  
  resetProviderHealth(): void {
    for (const health of this.providerHealth.values()) {
      health.healthy = true;
      health.failureCount = 0;
      health.lastSuccess = Date.now();
    }
    this.google.resetFailures();
    console.log('[MultiSearch] All provider health reset');
  }
}

let orchestrator: MultiSearchOrchestrator | null = null;

export function getMultiSearchOrchestrator(config?: Partial<MultiSearchConfig>): MultiSearchOrchestrator {
  if (!orchestrator) {
    orchestrator = new MultiSearchOrchestrator(config);
  }
  return orchestrator;
}

export function createMultiSearchOrchestrator(config?: Partial<MultiSearchConfig>): MultiSearchOrchestrator {
  return new MultiSearchOrchestrator(config);
}
