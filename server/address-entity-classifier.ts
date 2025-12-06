/**
 * Address Entity Classifier
 * 
 * Uses Tavily search to identify whether Bitcoin addresses belong to:
 * - Exchanges (Binance, Coinbase, Kraken, etc.)
 * - Institutions (Grayscale, MicroStrategy, etc.)
 * - Personal wallets
 * 
 * Key insight: Nothing is truly "unrecoverable" - exchanges/institutions
 * just require different recovery approaches (legal, estate, etc.)
 */

import { db } from './db';
import { balanceHits } from '@shared/schema';
import { eq } from 'drizzle-orm';

const TAVILY_API_BASE = 'https://api.tavily.com';

interface EntityClassification {
  entityType: 'personal' | 'exchange' | 'institution' | 'unknown';
  entityName: string | null;
  confidence: 'pending' | 'confirmed';
  sources: string[];
  searchResults: number;
}

interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
}

const KNOWN_EXCHANGES: Record<string, string[]> = {
  'binance': ['binance', 'bnb'],
  'coinbase': ['coinbase', 'gdax'],
  'kraken': ['kraken'],
  'bitfinex': ['bitfinex'],
  'bitstamp': ['bitstamp'],
  'huobi': ['huobi', 'htx'],
  'okx': ['okx', 'okex'],
  'kucoin': ['kucoin'],
  'bybit': ['bybit'],
  'gemini': ['gemini'],
  'ftx': ['ftx'],
  'mt.gox': ['mt.gox', 'mtgox', 'mt gox'],
  'poloniex': ['poloniex'],
  'bittrex': ['bittrex'],
  'gate.io': ['gate.io', 'gateio'],
  'crypto.com': ['crypto.com'],
  'bitmex': ['bitmex'],
  'deribit': ['deribit'],
  'blockchain.com': ['blockchain.com', 'blockchain wallet'],
};

const KNOWN_INSTITUTIONS: Record<string, string[]> = {
  'grayscale': ['grayscale', 'gbtc'],
  'microstrategy': ['microstrategy', 'mstr'],
  'tesla': ['tesla'],
  'block': ['block inc', 'square'],
  'marathon': ['marathon digital', 'marathon holdings'],
  'riot': ['riot blockchain', 'riot platforms'],
  'galaxy digital': ['galaxy digital'],
  'coinshares': ['coinshares'],
  'purpose investments': ['purpose investments', 'purpose bitcoin'],
  '3iq': ['3iq'],
  'fidelity': ['fidelity digital'],
  'blackrock': ['blackrock', 'ibit'],
  'ark invest': ['ark invest', 'arkb'],
};

const FBI_SEIZURE_PATTERNS = [
  'fbi seizure', 'doj seizure', 'us marshals',
  'seized bitcoin', 'confiscated', 'forfeiture',
  'silk road', 'bitfinex hack', 'mt.gox trustee'
];

export class AddressEntityClassifier {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
    if (!this.apiKey) {
      console.log('[EntityClassifier] No TAVILY_API_KEY - classification will use heuristics only');
    } else {
      console.log('[EntityClassifier] Initialized with Tavily API');
    }
  }

  /**
   * Classify an address using Tavily search + heuristics
   */
  async classifyAddress(address: string): Promise<EntityClassification> {
    console.log(`[EntityClassifier] Classifying address: ${address}`);

    if (!this.apiKey) {
      return {
        entityType: 'unknown',
        entityName: null,
        confidence: 'pending',
        sources: [],
        searchResults: 0
      };
    }

    try {
      const searchResults = await this.searchForAddress(address);
      
      if (searchResults.length === 0) {
        console.log(`[EntityClassifier] No results found for ${address.slice(0, 12)}...`);
        return {
          entityType: 'personal',
          entityName: null,
          confidence: 'pending',
          sources: [],
          searchResults: 0
        };
      }

      const classification = this.analyzeResults(searchResults);
      console.log(`[EntityClassifier] ${address.slice(0, 12)}... classified as: ${classification.entityType} (${classification.confidence})`);
      
      return classification;
    } catch (error) {
      console.error(`[EntityClassifier] Search failed:`, error);
      return {
        entityType: 'unknown',
        entityName: null,
        confidence: 'pending',
        sources: [],
        searchResults: 0
      };
    }
  }

  /**
   * Search Tavily for address information
   */
  private async searchForAddress(address: string): Promise<TavilySearchResult[]> {
    const query = `"${address}" bitcoin wallet owner exchange institution`;

    const response = await fetch(`${TAVILY_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        max_results: 10,
        include_raw_content: false,
        include_domains: [
          'blockchain.com', 'blockchair.com', 'btcscan.org',
          'bitinfocharts.com', 'walletexplorer.com', 'oxt.me',
          'bitcoinwhoswho.com', 'cryptoslate.com', 'cointelegraph.com',
          'coindesk.com', 'theblock.co', 'decrypt.co'
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EntityClassifier] Tavily error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: TavilySearchResponse = await response.json();
    return data.results || [];
  }

  /**
   * Analyze search results to classify address
   */
  private analyzeResults(results: TavilySearchResult[]): EntityClassification {
    const allText = results.map(r => `${r.title} ${r.content}`.toLowerCase()).join(' ');
    const sources = results.map(r => r.url);

    for (const [exchange, patterns] of Object.entries(KNOWN_EXCHANGES)) {
      for (const pattern of patterns) {
        if (allText.includes(pattern.toLowerCase())) {
          const mentionCount = (allText.match(new RegExp(pattern, 'gi')) || []).length;
          return {
            entityType: 'exchange',
            entityName: exchange.charAt(0).toUpperCase() + exchange.slice(1),
            confidence: mentionCount >= 3 ? 'confirmed' : 'pending',
            sources,
            searchResults: results.length
          };
        }
      }
    }

    for (const [institution, patterns] of Object.entries(KNOWN_INSTITUTIONS)) {
      for (const pattern of patterns) {
        if (allText.includes(pattern.toLowerCase())) {
          const mentionCount = (allText.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
          return {
            entityType: 'institution',
            entityName: institution.charAt(0).toUpperCase() + institution.slice(1),
            confidence: mentionCount >= 3 ? 'confirmed' : 'pending',
            sources,
            searchResults: results.length
          };
        }
      }
    }

    for (const pattern of FBI_SEIZURE_PATTERNS) {
      if (allText.includes(pattern.toLowerCase())) {
        return {
          entityType: 'institution',
          entityName: 'Law Enforcement Seizure',
          confidence: 'pending',
          sources,
          searchResults: results.length
        };
      }
    }

    return {
      entityType: 'personal',
      entityName: null,
      confidence: 'pending',
      sources,
      searchResults: results.length
    };
  }

  /**
   * Update a balance hit with entity classification
   */
  async updateBalanceHitClassification(balanceHitId: string, classification: EntityClassification): Promise<void> {
    if (!db) {
      console.error('[EntityClassifier] Database not available');
      return;
    }
    
    await db.update(balanceHits)
      .set({
        addressEntityType: classification.entityType,
        entityTypeConfidence: classification.confidence,
        entityTypeName: classification.entityName,
        entityTypeConfirmedAt: classification.confidence === 'confirmed' ? new Date() : null
      })
      .where(eq(balanceHits.id, balanceHitId));

    console.log(`[EntityClassifier] Updated balance hit ${balanceHitId}: ${classification.entityType} (${classification.entityName || 'unknown'})`);
  }

  /**
   * Manually confirm an entity type classification
   */
  async confirmClassification(
    balanceHitId: string,
    entityType: 'personal' | 'exchange' | 'institution',
    entityName?: string
  ): Promise<void> {
    if (!db) {
      console.error('[EntityClassifier] Database not available');
      return;
    }
    
    await db.update(balanceHits)
      .set({
        addressEntityType: entityType,
        entityTypeConfidence: 'confirmed',
        entityTypeName: entityName || null,
        entityTypeConfirmedAt: new Date()
      })
      .where(eq(balanceHits.id, balanceHitId));

    console.log(`[EntityClassifier] Manually confirmed balance hit ${balanceHitId}: ${entityType} (${entityName || 'N/A'})`);
  }
}

export const addressEntityClassifier = new AddressEntityClassifier();
