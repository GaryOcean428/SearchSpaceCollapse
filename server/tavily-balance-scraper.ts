/**
 * Tavily BitInfoCharts Balance Scraper
 * 
 * Uses Tavily web scraping API to batch check Bitcoin address balances
 * via BitInfoCharts pages. This provides a fallback method for balance
 * checking that doesn't rely on Blockstream API rate limits.
 * 
 * Features:
 * - Batch queries (10-15 addresses per request)
 * - Parses balance data from HTML response
 * - Falls back gracefully on parsing errors
 */

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

interface AddressBalance {
  address: string;
  balanceBTC: number;
  balanceSats: number;
  found: boolean;
  source: string;
}

const TAVILY_API_URL = 'https://api.tavily.com/search';
const BITINFOCHARTS_BASE = 'https://bitinfocharts.com/bitcoin/address/';

export class TavilyBalanceScraper {
  private apiKey: string | null = null;
  private requestCount = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 2000;

  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY || null;
    if (!this.apiKey) {
      console.warn('[TavilyBalanceScraper] TAVILY_API_KEY not set - batch scraping disabled');
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Parse balance from BitInfoCharts page content
   * Looks for patterns like "Balance: 0.12345678 BTC" or "Final Balance: 0 BTC"
   */
  private parseBalanceFromContent(content: string, address: string): AddressBalance | null {
    try {
      const balancePatterns = [
        /Balance:\s*([\d,.]+)\s*BTC/i,
        /Final Balance:\s*([\d,.]+)\s*BTC/i,
        /Current Balance:\s*([\d,.]+)\s*BTC/i,
        /([\d,.]+)\s*BTC\s*(?:balance|final)/i,
      ];

      for (const pattern of balancePatterns) {
        const match = content.match(pattern);
        if (match) {
          const btcString = match[1].replace(/,/g, '');
          const btcValue = parseFloat(btcString);
          
          if (!isNaN(btcValue)) {
            return {
              address,
              balanceBTC: btcValue,
              balanceSats: Math.round(btcValue * 100000000),
              found: true,
              source: 'bitinfocharts',
            };
          }
        }
      }

      if (content.toLowerCase().includes('0 btc') || 
          content.toLowerCase().includes('balance: 0') ||
          content.toLowerCase().includes('final balance: 0')) {
        return {
          address,
          balanceBTC: 0,
          balanceSats: 0,
          found: true,
          source: 'bitinfocharts',
        };
      }

      return null;
    } catch (error) {
      console.error(`[TavilyBalanceScraper] Parse error for ${address}:`, error);
      return null;
    }
  }

  /**
   * Query Tavily for a single address
   */
  private async queryAddress(address: string): Promise<AddressBalance | null> {
    if (!this.apiKey) return null;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }

    try {
      const response = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: `bitcoin address ${address} balance site:bitinfocharts.com`,
          search_depth: 'basic',
          include_answer: true,
          max_results: 3,
        }),
      });

      this.lastRequestTime = Date.now();
      this.requestCount++;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TavilyBalanceScraper] API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data: TavilyResponse = await response.json();

      if (data.answer) {
        const parsed = this.parseBalanceFromContent(data.answer, address);
        if (parsed) return parsed;
      }

      for (const result of data.results || []) {
        if (result.url.includes(address) || result.content.includes(address)) {
          const parsed = this.parseBalanceFromContent(result.content, address);
          if (parsed) return parsed;
        }
      }

      return null;
    } catch (error) {
      console.error(`[TavilyBalanceScraper] Query error for ${address}:`, error);
      return null;
    }
  }

  /**
   * Batch query multiple addresses
   * Due to Tavily rate limits, we query one at a time with delays
   */
  async batchQueryAddresses(addresses: string[]): Promise<Map<string, AddressBalance>> {
    const results = new Map<string, AddressBalance>();
    
    if (!this.apiKey) {
      console.warn('[TavilyBalanceScraper] API key not set, returning empty results');
      return results;
    }

    console.log(`[TavilyBalanceScraper] Starting batch query for ${addresses.length} addresses`);

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      
      try {
        const balance = await this.queryAddress(address);
        if (balance) {
          results.set(address, balance);
          if (balance.balanceSats > 0) {
            console.log(`[TavilyBalanceScraper] 💰 Found balance for ${address}: ${balance.balanceBTC} BTC`);
          }
        }
      } catch (error) {
        console.error(`[TavilyBalanceScraper] Error querying ${address}:`, error);
      }

      if (i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval));
      }
    }

    console.log(`[TavilyBalanceScraper] Batch complete: ${results.size}/${addresses.length} addresses resolved`);
    
    return results;
  }

  /**
   * Get a direct URL for a BitInfoCharts address page
   */
  getAddressUrl(address: string): string {
    return `${BITINFOCHARTS_BASE}${address}`;
  }

  /**
   * Get request statistics
   */
  getStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

export const tavilyBalanceScraper = new TavilyBalanceScraper();
