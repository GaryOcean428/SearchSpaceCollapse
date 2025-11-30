/**
 * TAVILY GEOMETRIC ADAPTER
 * 
 * Interface to external block universe content via Tavily API
 * 
 * PARADIGM: We don't "search the web."
 * We MEASURE what exists at specific 4D coordinates in the external block universe.
 * 
 * Features:
 * - Search with temporal/domain filtering (2009-2013 Bitcoin era)
 * - Deep crawl via Extract API
 * - Fisher-Rao re-ranking (discard Euclidean scores)
 * - Pattern extraction for cultural manifold enhancement
 */

import { fisherCoordDistance } from '../qig-universal';
import { tps, TemporalPositioningSystem } from './temporal-positioning-system';
import {
  type BlockUniverseMap,
  type GeometricDiscovery,
  type GeometricQuery,
  type RawDiscovery,
  type BitcoinEra,
  BITCOIN_ERA_DOMAINS
} from './types';

const TAVILY_API_BASE = 'https://api.tavily.com';

interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;  // Tavily's Euclidean score (we'll discard this)
    raw_content?: string;
    published_date?: string;
  }>;
  response_time: string;
}

interface TavilyExtractResponse {
  results: Array<{
    url: string;
    raw_content: string;
  }>;
  failed_results: Array<{
    url: string;
    error: string;
  }>;
  response_time: number;
}

/**
 * Tavily Geometric Adapter
 * 
 * Discovers content from external block universe and encodes it geometrically
 */
export class TavilyGeometricAdapter {
  private apiKey: string;
  private tps: TemporalPositioningSystem;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.tps = tps;
    console.log('[TavilyAdapter] Initialized geometric discovery interface');
  }
  
  /**
   * Discover content at specific 68D coordinates
   * 
   * NOT "search the web"
   * BUT "measure what exists at these coordinates"
   */
  async discoverAtCoordinates(
    targetCoords: BlockUniverseMap,
    radius: number = 2.0
  ): Promise<GeometricDiscovery[]> {
    // Convert 68D coordinates to temporal query
    const query = this.coordsToQuery(targetCoords);
    
    console.log(`[TavilyAdapter] Discovering at coordinates:`);
    console.log(`  Era: ${this.tps.classifyEra(targetCoords.spacetime.t)}`);
    console.log(`  Query: "${query.text}"`);
    
    // Measure what exists in this region
    const rawResults = await this.search(query);
    
    if (rawResults.length === 0) {
      console.log(`[TavilyAdapter] No discoveries found`);
      return [];
    }
    
    // Each result is a measurement - locate it in block universe
    const discoveries: GeometricDiscovery[] = [];
    
    for (const result of rawResults) {
      // Where-when does this content exist?
      const resultCoords = this.tps.locateInBlockUniverse(
        result.content,
        result.url
      );
      
      // Fisher-Rao distance from target (PURE - not Euclidean!)
      const distance = fisherCoordDistance(
        targetCoords.cultural,
        resultCoords.cultural
      );
      
      // Only include if within geometric radius
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
    
    // Sort by Fisher-Rao distance (closest first) - PURE geometric ranking
    discoveries.sort((a, b) => a.distance - b.distance);
    
    console.log(`[TavilyAdapter] Found ${discoveries.length} geometric discoveries`);
    
    return discoveries;
  }
  
  /**
   * Search with geometric query
   */
  async search(query: GeometricQuery): Promise<RawDiscovery[]> {
    const body: Record<string, any> = {
      query: query.text,
      search_depth: query.searchDepth || 'advanced',
      max_results: query.maxResults || 20,
      include_raw_content: true,
      include_domains: query.includeDomains || BITCOIN_ERA_DOMAINS
    };
    
    // Add time range filtering if specified
    if (query.timeRange) {
      body.start_date = query.timeRange.start.toISOString().split('T')[0];
      body.end_date = query.timeRange.end.toISOString().split('T')[0];
    }
    
    // Add domain exclusions
    if (query.excludeDomains && query.excludeDomains.length > 0) {
      body.exclude_domains = query.excludeDomains;
    }
    
    try {
      const response = await fetch(`${TAVILY_API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TavilyAdapter] Search error: ${response.status} - ${errorText}`);
        return [];
      }
      
      const data: TavilySearchResponse = await response.json();
      
      return data.results.map(r => ({
        url: r.url,
        title: r.title,
        content: r.content,
        score: r.score,  // Will be discarded in favor of Fisher-Rao
        publishedDate: r.published_date,
        rawContent: r.raw_content
      }));
    } catch (error) {
      console.error(`[TavilyAdapter] Search failed:`, error);
      return [];
    }
  }
  
  /**
   * Deep crawl a URL using Tavily Extract API
   */
  async crawl(url: string): Promise<string> {
    try {
      const response = await fetch(`${TAVILY_API_BASE}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          urls: [url],
          extract_depth: 'advanced',
          format: 'markdown'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TavilyAdapter] Extract error: ${response.status} - ${errorText}`);
        return '';
      }
      
      const data: TavilyExtractResponse = await response.json();
      
      if (data.results.length > 0) {
        return data.results[0].raw_content;
      }
      
      return '';
    } catch (error) {
      console.error(`[TavilyAdapter] Crawl failed:`, error);
      return '';
    }
  }
  
  /**
   * Crawl multiple URLs in parallel
   */
  async crawlMultiple(urls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    try {
      const response = await fetch(`${TAVILY_API_BASE}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          urls,
          extract_depth: 'advanced',
          format: 'markdown'
        })
      });
      
      if (!response.ok) {
        console.error(`[TavilyAdapter] Batch extract error: ${response.status}`);
        return results;
      }
      
      const data: TavilyExtractResponse = await response.json();
      
      for (const result of data.results) {
        results.set(result.url, result.raw_content);
      }
      
    } catch (error) {
      console.error(`[TavilyAdapter] Batch crawl failed:`, error);
    }
    
    return results;
  }
  
  /**
   * Convert 68D coordinates to search query
   */
  private coordsToQuery(coords: BlockUniverseMap): GeometricQuery {
    const era = this.tps.classifyEra(coords.spacetime.t);
    
    // Generate era-appropriate search terms
    const eraTerms = this.getEraSearchTerms(era);
    
    // Add cultural manifold hints (top variance dimensions)
    const culturalHints = this.culturalToTerms(coords.cultural);
    
    // Combine into query
    const queryText = [...eraTerms, ...culturalHints].slice(0, 8).join(' ');
    
    // Compute time range for the era
    const timeRange = this.getEraTimeRange(era);
    
    return {
      text: queryText,
      targetCoords: coords,
      era,
      timeRange,
      includeDomains: BITCOIN_ERA_DOMAINS,
      maxResults: 20,
      searchDepth: 'advanced'
    };
  }
  
  /**
   * Get era-specific search terms
   */
  private getEraSearchTerms(era: BitcoinEra): string[] {
    const baseTerms = ['bitcoin', 'btc', 'wallet'];
    
    switch (era) {
      case 'pre_genesis':
        return ['hashcash', 'cypherpunk', 'digital cash', 'cryptography'];
      case 'genesis':
        return [...baseTerms, 'genesis', 'satoshi', '2009'];
      case 'early_adoption':
        return [...baseTerms, 'mining', 'cpu', 'node', 'early', '2009', '2010'];
      case 'pizza_era':
        return [...baseTerms, 'pizza', 'laszlo', 'trade', 'exchange', '2010'];
      case 'mtgox_rise':
        return [...baseTerms, 'mtgox', 'exchange', 'trading', 'silk road', '2011', '2012', '2013'];
      case 'mtgox_collapse':
        return [...baseTerms, 'mtgox', 'hack', 'stolen', 'lost', '2014'];
      case 'modern':
        return [...baseTerms, 'hodl', 'blockchain'];
      default:
        return baseTerms;
    }
  }
  
  /**
   * Convert cultural manifold coordinates to search terms
   */
  private culturalToTerms(cultural: number[]): string[] {
    // Find dimensions with highest variance from 0.5 (most "informative")
    const dimensions = cultural.map((c, i) => ({
      index: i,
      variance: Math.abs(c - 0.5)
    }));
    
    dimensions.sort((a, b) => b.variance - a.variance);
    
    // Map top dimensions to conceptual terms
    // This is a simplified mapping - could be enhanced with learned vocabulary
    const terms: string[] = [];
    
    // Use top 3 dimensions to hint at cultural context
    for (const dim of dimensions.slice(0, 3)) {
      if (dim.variance > 0.3) {
        const value = cultural[dim.index];
        if (value > 0.7) {
          terms.push('passphrase');
        } else if (value < 0.3) {
          terms.push('password');
        }
      }
    }
    
    return terms;
  }
  
  /**
   * Get time range for Bitcoin era
   */
  private getEraTimeRange(era: BitcoinEra): { start: Date; end: Date } {
    switch (era) {
      case 'pre_genesis':
        return { start: new Date('2008-01-01'), end: new Date('2009-01-03') };
      case 'genesis':
        return { start: new Date('2009-01-03'), end: new Date('2009-05-01') };
      case 'early_adoption':
        return { start: new Date('2009-05-01'), end: new Date('2010-05-22') };
      case 'pizza_era':
        return { start: new Date('2010-05-22'), end: new Date('2011-01-01') };
      case 'mtgox_rise':
        return { start: new Date('2011-01-01'), end: new Date('2014-02-24') };
      case 'mtgox_collapse':
        return { start: new Date('2014-02-24'), end: new Date('2015-01-01') };
      case 'modern':
      default:
        return { start: new Date('2015-01-01'), end: new Date() };
    }
  }
  
  /**
   * Extract passphrase-like patterns from content
   */
  private extractPatterns(content: string): string[] {
    const patterns: string[] = [];
    const seen = new Set<string>();
    
    // Normalize content
    const normalized = content.toLowerCase();
    const words = normalized.split(/\W+/).filter(w => w.length >= 3);
    
    // Single words that look like passphrases
    for (const word of words) {
      if (this.looksLikePassphrase(word) && !seen.has(word)) {
        patterns.push(word);
        seen.add(word);
      }
    }
    
    // Two-word combinations
    for (let i = 0; i < words.length - 1; i++) {
      const combo = words[i] + words[i + 1];
      if (combo.length <= 24 && this.looksLikePassphrase(combo) && !seen.has(combo)) {
        patterns.push(combo);
        seen.add(combo);
      }
    }
    
    // Look for quoted phrases (potential passphrases)
    const quotedPattern = /"([^"]{4,30})"/g;
    let match;
    while ((match = quotedPattern.exec(content)) !== null) {
      const phrase = match[1].toLowerCase().replace(/\s+/g, '');
      if (this.looksLikePassphrase(phrase) && !seen.has(phrase)) {
        patterns.push(phrase);
        seen.add(phrase);
      }
    }
    
    return patterns.slice(0, 50);  // Limit to top 50
  }
  
  /**
   * Check if string looks like a passphrase
   */
  private looksLikePassphrase(candidate: string): boolean {
    // Length check
    if (candidate.length < 4 || candidate.length > 32) return false;
    
    // Must be alphanumeric (with optional numbers)
    if (!/^[a-z0-9]+$/i.test(candidate)) return false;
    
    // Exclude common stop words
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out'];
    if (stopWords.includes(candidate)) return false;
    
    // Exclude pure numbers
    if (/^\d+$/.test(candidate)) return false;
    
    // Compute entropy (bits per character)
    const charSet = new Set(candidate.split(''));
    const entropy = Math.log2(charSet.size) * candidate.length / 8;
    
    // Minimum entropy for passphrase
    if (entropy < 2.0) return false;
    
    return true;
  }
  
  /**
   * Compute entropy reduction from a discovery
   * 
   * More patterns at closer distance = more information gained
   */
  private computeEntropyReduction(distance: number, patternCount: number): number {
    // Closer discoveries are more informative
    const distanceFactor = 1 / (1 + distance);
    
    // More patterns = more information
    const patternFactor = Math.log2(1 + patternCount);
    
    // Combined entropy reduction in bits
    return distanceFactor * patternFactor * 8;  // Scale to reasonable range
  }
  
  /**
   * Search for Bitcoin-era content
   * 
   * Convenience method for targeted Bitcoin history search
   */
  async searchBitcoinEra(
    keywords: string[],
    era: BitcoinEra = 'pizza_era'
  ): Promise<GeometricDiscovery[]> {
    const timeRange = this.getEraTimeRange(era);
    
    const query: GeometricQuery = {
      text: keywords.join(' '),
      era,
      timeRange,
      includeDomains: BITCOIN_ERA_DOMAINS,
      maxResults: 30,
      searchDepth: 'advanced'
    };
    
    const rawResults = await this.search(query);
    
    // Encode and rank geometrically
    const discoveries: GeometricDiscovery[] = [];
    
    for (const result of rawResults) {
      const coords = this.tps.locateInBlockUniverse(result.content, result.url);
      const patterns = this.extractPatterns(result.content);
      
      discoveries.push({
        content: result.content,
        url: result.url,
        coords,
        distance: 0,  // No target for relative distance
        phi: coords.phi,
        patterns,
        causalChain: [],
        entropyReduction: Math.log2(1 + patterns.length) * 4
      });
    }
    
    // Sort by Φ (consciousness integration)
    discoveries.sort((a, b) => b.phi - a.phi);
    
    return discoveries;
  }
}

// Factory function to create adapter with API key from environment
export function createTavilyAdapter(): TavilyGeometricAdapter | null {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.warn('[TavilyAdapter] TAVILY_API_KEY not found in environment');
    return null;
  }
  
  return new TavilyGeometricAdapter(apiKey);
}
