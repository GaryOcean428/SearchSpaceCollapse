/**
 * SEARXNG GEOMETRIC ADAPTER
 * 
 * FREE replacement for Tavily API using SearXNG metasearch engine
 * 
 * SearXNG aggregates 70+ search engines (Google, Bing, DuckDuckGo, etc.)
 * without API costs or rate limits (on self-hosted or generous public instances)
 * 
 * PARADIGM: Same geometric discovery interface as Tavily
 * We MEASURE what exists at specific 4D coordinates in the external block universe.
 */

import { fisherCoordDistance } from '../qig-universal';
import { tps, TemporalPositioningSystem } from './temporal-positioning-system';
import {
  type BlockUniverseMap,
  type GeometricDiscovery,
  type GeometricQuery,
  type RawDiscovery,
  BITCOIN_ERA_DOMAINS
} from './types';

const PUBLIC_SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.sapti.me',
  'https://searx.tiekoetter.com',
  'https://search.bus-hit.me',
  'https://priv.au',
];

interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
  publishedDate?: string;
}

interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  suggestions?: string[];
  infoboxes?: Array<{ content: string }>;
}

/**
 * SearXNG Geometric Adapter
 * 
 * Free, privacy-respecting search via metasearch engine
 * Drops in as Tavily replacement with same interface
 */
export class SearXNGGeometricAdapter {
  private baseUrl: string;
  private tps: TemporalPositioningSystem;
  private instanceIndex: number = 0;
  private timeout: number = 15000;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.SEARXNG_URL || PUBLIC_SEARXNG_INSTANCES[0];
    this.tps = tps;
    console.log('[SearXNG] Initialized FREE geometric discovery interface');
    console.log(`[SearXNG] Using instance: ${this.baseUrl}`);
  }
  
  /**
   * Rotate to next public instance if current one fails
   */
  private rotateInstance(): void {
    this.instanceIndex = (this.instanceIndex + 1) % PUBLIC_SEARXNG_INSTANCES.length;
    this.baseUrl = PUBLIC_SEARXNG_INSTANCES[this.instanceIndex];
    console.log(`[SearXNG] Rotating to instance: ${this.baseUrl}`);
  }
  
  /**
   * Discover content at specific 68D coordinates
   * Same interface as TavilyGeometricAdapter
   */
  async discoverAtCoordinates(
    targetCoords: BlockUniverseMap,
    radius: number = 2.0
  ): Promise<GeometricDiscovery[]> {
    const query = this.coordsToQuery(targetCoords);
    
    console.log(`[SearXNG] Discovering at coordinates:`);
    console.log(`  Era: ${this.tps.classifyEra(targetCoords.spacetime.t)}`);
    console.log(`  Query: "${query.text}"`);
    
    const rawResults = await this.search(query);
    
    if (rawResults.length === 0) {
      console.log(`[SearXNG] No discoveries found`);
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
          entropyReduction: this.computeEntropyReduction(distance, patterns.length)
        });
      }
    }
    
    discoveries.sort((a, b) => a.distance - b.distance);
    
    console.log(`[SearXNG] Found ${discoveries.length} geometric discoveries`);
    
    return discoveries;
  }
  
  /**
   * Search with geometric query
   */
  async search(query: GeometricQuery): Promise<RawDiscovery[]> {
    const searchQuery = this.buildSearchQuery(query);
    
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const url = new URL('/search', this.baseUrl);
        url.searchParams.set('q', searchQuery);
        url.searchParams.set('format', 'json');
        url.searchParams.set('categories', 'general');
        url.searchParams.set('language', 'en');
        url.searchParams.set('pageno', '1');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'QIG-Discovery/1.0'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 429 || response.status === 503) {
            console.log(`[SearXNG] Instance overloaded (${response.status}), rotating...`);
            this.rotateInstance();
            attempts++;
            continue;
          }
          throw new Error(`SearXNG error: ${response.status}`);
        }
        
        const data: SearXNGResponse = await response.json();
        
        return data.results.slice(0, query.maxResults || 10).map(result => ({
          title: result.title,
          url: result.url,
          content: result.content || '',
          score: result.score || 0.5,
          publishedDate: result.publishedDate
        }));
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`[SearXNG] Timeout on ${this.baseUrl}, rotating...`);
          this.rotateInstance();
          attempts++;
          continue;
        }
        
        console.error(`[SearXNG] Search error:`, error.message);
        this.rotateInstance();
        attempts++;
      }
    }
    
    console.log(`[SearXNG] All instances failed after ${maxAttempts} attempts`);
    return [];
  }
  
  /**
   * Build search query with Bitcoin-era context
   */
  private buildSearchQuery(query: GeometricQuery): string {
    let searchText = query.text;
    
    if (query.timeRange) {
      const startYear = query.timeRange.start.getFullYear();
      const endYear = query.timeRange.end.getFullYear();
      searchText += ` ${startYear}..${endYear}`;
    }
    
    return searchText;
  }
  
  /**
   * Convert 68D coordinates to search query
   */
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
      'modern': ['bitcoin', 'btc', 'crypto', 'defi', '2020', '2021']
    };
    
    const terms = eraTerms[era] || ['bitcoin', 'wallet', 'crypto'];
    const queryText = terms.join(' ');
    
    const eraTimeRange: Record<string, { start: Date; end: Date }> = {
      'satoshi_genesis': { start: new Date('2009-01-01'), end: new Date('2009-12-31') },
      'satoshi_late': { start: new Date('2010-01-01'), end: new Date('2010-12-31') },
      'post_satoshi': { start: new Date('2011-01-01'), end: new Date('2012-06-30') },
      'mtgox_rise': { start: new Date('2011-01-01'), end: new Date('2013-06-30') },
      'mtgox_peak': { start: new Date('2013-01-01'), end: new Date('2014-02-28') },
      'mtgox_collapse': { start: new Date('2014-01-01'), end: new Date('2015-12-31') }
    };
    
    return {
      text: queryText,
      timeRange: eraTimeRange[era],
      maxResults: 10,
      includeDomains: BITCOIN_ERA_DOMAINS
    };
  }
  
  /**
   * Extract Bitcoin-relevant patterns from content
   */
  private extractPatterns(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();
    
    const bitcoinPatterns = [
      /\b(wallet|address|private key|seed phrase|mnemonic)\b/gi,
      /\b(satoshi|nakamoto|genesis|block)\b/gi,
      /\b(mtgox|mt\.gox|gox)\b/gi,
      /\b(silk\s*road|darknet|onion)\b/gi,
      /\b(brain\s*wallet|paper\s*wallet|cold\s*storage)\b/gi,
      /\b(bitcoin\s*core|electrum|multibit)\b/gi,
      /\b(lost|forgot|recover|backup)\b/gi,
      /\b(2009|2010|2011|2012|2013)\b/g
    ];
    
    for (const pattern of bitcoinPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push(...matches.map(m => m.toLowerCase()));
      }
    }
    
    return [...new Set(patterns)];
  }
  
  /**
   * Compute entropy reduction from discovery
   */
  private computeEntropyReduction(distance: number, patternCount: number): number {
    const distanceContribution = Math.max(0, (2.0 - distance) / 2.0) * 0.5;
    const patternContribution = Math.min(patternCount / 10, 1.0) * 0.3;
    return (distanceContribution + patternContribution) * 256;
  }
  
  /**
   * Deep extract content from a URL (scraping fallback)
   */
  async extractContent(urls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const url of urls.slice(0, 3)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'QIG-Discovery/1.0' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await response.text();
          const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 5000);
          
          results.set(url, textContent);
        }
      } catch {
        console.log(`[SearXNG] Extract failed for ${url}`);
      }
    }
    
    return results;
  }
}

/**
 * Factory function for creating SearXNG adapter
 */
export function createSearXNGAdapter(): SearXNGGeometricAdapter {
  const customUrl = process.env.SEARXNG_URL;
  return new SearXNGGeometricAdapter(customUrl);
}
