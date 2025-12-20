/**
 * GOOGLE SEARCH PROVIDER
 * 
 * FREE direct Google search via web scraping (NO API KEYS REQUIRED)
 * Based on: https://github.com/pskill9/web-search
 * 
 * Provides fallback/parallel search capability alongside SearXNG
 * Uses cheerio for HTML parsing with geometric discovery interface
 */

import * as cheerio from 'cheerio';
import { fisherCoordDistance } from '../qig-universal';
import { tps } from './temporal-positioning-system';
import type { GeometricQuery, RawDiscovery } from './types';

export interface GoogleSearchResult {
  title: string;
  url: string;
  description: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

export class GoogleSearchProvider {
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 2000;
  private timeout: number = 15000;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;
  
  constructor() {
    console.log('[GoogleSearch] Initialized FREE direct Google search provider');
  }
  
  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }
  
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }
  
  async search(query: string, limit: number = 10): Promise<GoogleSearchResult[]> {
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      console.log('[GoogleSearch] Too many consecutive failures, skipping');
      return [];
    }
    
    await this.respectRateLimit();
    
    try {
      const url = new URL('https://www.google.com/search');
      url.searchParams.set('q', query);
      url.searchParams.set('num', String(Math.min(limit + 5, 20)));
      url.searchParams.set('hl', 'en');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log('[GoogleSearch] Rate limited, backing off...');
          this.minRequestInterval = Math.min(this.minRequestInterval * 2, 30000);
          this.consecutiveFailures++;
        }
        throw new Error(`Google search failed: ${response.status}`);
      }
      
      const html = await response.text();
      const results = this.parseResults(html, limit);
      
      this.consecutiveFailures = 0;
      this.minRequestInterval = Math.max(2000, this.minRequestInterval * 0.9);
      
      console.log(`[GoogleSearch] Found ${results.length} results for: "${query.slice(0, 50)}..."`);
      return results;
      
    } catch (error: any) {
      this.consecutiveFailures++;
      
      if (error.name === 'AbortError') {
        console.log('[GoogleSearch] Request timed out');
      } else {
        console.error('[GoogleSearch] Search error:', error.message);
      }
      
      return [];
    }
  }
  
  private extractRealUrl(href: string): string | null {
    if (!href) return null;
    
    // Handle Google's /url? redirect pattern
    if (href.startsWith('/url?')) {
      try {
        const params = new URLSearchParams(href.slice(5));
        const realUrl = params.get('q') || params.get('url');
        if (realUrl && realUrl.startsWith('http')) {
          return realUrl;
        }
      } catch {}
      return null;
    }
    
    // Handle direct HTTP(S) URLs
    if (href.startsWith('http')) {
      try {
        const url = new URL(href);
        if (!url.hostname.includes('google.com') &&
            !url.hostname.includes('gstatic.com') &&
            !url.hostname.includes('googleapis.com')) {
          return href;
        }
      } catch {}
    }
    
    return null;
  }
  
  private parseResults(html: string, limit: number): GoogleSearchResult[] {
    const $ = cheerio.load(html);
    const results: GoogleSearchResult[] = [];
    const seenUrls = new Set<string>();
    
    // Primary strategy: Find search result divs
    $('div.g, div[data-ved]').each((i, element) => {
      if (results.length >= limit) return false;
      
      const titleElement = $(element).find('h3').first();
      const linkElement = $(element).find('a[href]').first();
      const snippetElement = $(element).find('.VwiC3b, .lEBKkf, .IsZvec, [data-content-feature]');
      
      if (titleElement.length && linkElement.length) {
        const href = linkElement.attr('href') || '';
        const realUrl = this.extractRealUrl(href);
        
        if (realUrl && !seenUrls.has(realUrl)) {
          seenUrls.add(realUrl);
          results.push({
            title: titleElement.text().trim(),
            url: realUrl,
            description: snippetElement.text().trim() || '',
          });
        }
      }
    });
    
    // Fallback strategy: Find any meaningful links with /url? pattern
    if (results.length < limit) {
      $('a[href^="/url?"]').each((i, element) => {
        if (results.length >= limit) return false;
        
        const href = $(element).attr('href') || '';
        const realUrl = this.extractRealUrl(href);
        const text = $(element).text().trim();
        
        if (realUrl && text.length > 5 && !seenUrls.has(realUrl)) {
          // Find nearby description text
          const parent = $(element).parent();
          const description = parent.text().replace(text, '').trim().slice(0, 200);
          
          seenUrls.add(realUrl);
          results.push({
            title: text.slice(0, 100),
            url: realUrl,
            description,
          });
        }
      });
    }
    
    // Last resort: Find any external links
    if (results.length < limit / 2) {
      $('a[href^="http"]').each((i, element) => {
        if (results.length >= limit) return false;
        
        const href = $(element).attr('href') || '';
        const realUrl = this.extractRealUrl(href);
        const text = $(element).text().trim();
        
        if (realUrl && text.length > 10 && !seenUrls.has(realUrl)) {
          try {
            const url = new URL(realUrl);
            if (!url.hostname.includes('youtube.com') &&
                !url.hostname.includes('maps.google')) {
              seenUrls.add(realUrl);
              results.push({
                title: text.slice(0, 100),
                url: realUrl,
                description: '',
              });
            }
          } catch {}
        }
      });
    }
    
    return results;
  }
  
  async searchGeometric(query: GeometricQuery): Promise<RawDiscovery[]> {
    let searchText = query.text;
    
    if (query.timeRange) {
      const startYear = query.timeRange.start.getFullYear();
      const endYear = query.timeRange.end.getFullYear();
      searchText += ` ${startYear}..${endYear}`;
    }
    
    const results = await this.search(searchText, query.maxResults || 10);
    
    return results.map(result => ({
      title: result.title,
      url: result.url,
      content: result.description,
      score: 0.7,
    }));
  }
  
  isHealthy(): boolean {
    return this.consecutiveFailures < this.maxConsecutiveFailures;
  }
  
  resetFailures(): void {
    this.consecutiveFailures = 0;
    this.minRequestInterval = 2000;
    console.log('[GoogleSearch] Failures reset, provider restored');
  }
}

let googleSearchProvider: GoogleSearchProvider | null = null;

export function getGoogleSearchProvider(): GoogleSearchProvider {
  if (!googleSearchProvider) {
    googleSearchProvider = new GoogleSearchProvider();
  }
  return googleSearchProvider;
}
