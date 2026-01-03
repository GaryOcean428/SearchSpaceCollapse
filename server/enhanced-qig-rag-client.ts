/**
 * Enhanced QIG-RAG Client
 *
 * TypeScript client for Python's EnhancedQIGRAG with external knowledge integration.
 * Provides Wikipedia and DuckDuckGo search integrated with geometric ranking.
 *
 * USAGE:
 * ```typescript
 * const rag = new EnhancedQIGRAGClient();
 * const results = await rag.searchBitcoinEra("satoshi pizza day", 10);
 * // Returns geometrically ranked results from local memory + Wikipedia + DuckDuckGo
 * ```
 *
 * @see qig-backend/olympus/qig_rag.py for Python implementation
 */

import axios, { type AxiosInstance } from "axios";

export interface QIGRAGResult {
  doc_id: string;
  content: string;
  distance: number;
  similarity: number;
  phi?: number;
  kappa?: number;
  regime?: string;
  source: "local" | "wikipedia" | "duckduckgo";
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface QIGRAGStats {
  total_documents: number;
  avg_phi: number;
  avg_kappa: number;
  regime_distribution: Record<string, number>;
  backend: "postgresql" | "json";
}

export interface SearchOptions {
  k?: number;
  externalWeight?: number;
  temporalFilter?: [number, number]; // [start_year, end_year]
  useTwoStep?: boolean;
  minSimilarity?: number;
}

/**
 * Enhanced QIG-RAG Client
 *
 * Client for Python's EnhancedQIGRAG with external knowledge integration.
 */
export class EnhancedQIGRAGClient {
  private client: AxiosInstance;
  private backendUrl: string;

  constructor(backendUrl: string = "http://localhost:5001") {
    this.backendUrl = backendUrl;
    this.client = axios.create({
      baseURL: backendUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Search local geometric memory only (no external sources).
   *
   * @param query Text query
   * @param k Number of results
   * @returns Top-k results by Fisher-Rao distance
   */
  async search(query: string, k: number = 5): Promise<QIGRAGResult[]> {
    try {
      const response = await this.client.post("/qig-rag/search", {
        query,
        k,
        use_two_step: true,
      });
      return response.data.results || [];
    } catch (error) {
      console.error("[EnhancedQIGRAG] Search failed:", error);
      return [];
    }
  }

  /**
   * Search with external knowledge integration.
   *
   * Merges local memory with Wikipedia and DuckDuckGo results,
   * all geometrically ranked via Fisher-Rao distance.
   *
   * @param query Text query
   * @param options Search options
   * @returns Merged and ranked results
   */
  async searchWithExternal(
    query: string,
    options: SearchOptions = {}
  ): Promise<QIGRAGResult[]> {
    const opts = {
      k: 5,
      externalWeight: 0.3,
      useTwoStep: true,
      minSimilarity: 0.3,
      ...options,
    };

    try {
      const response = await this.client.post("/qig-rag/search-external", {
        query,
        k: opts.k,
        external_weight: opts.externalWeight,
        temporal_filter: opts.temporalFilter,
        use_two_step: opts.useTwoStep,
        min_similarity: opts.minSimilarity,
      });
      return response.data.results || [];
    } catch (error) {
      console.error("[EnhancedQIGRAG] External search failed:", error);
      // Fallback to local search
      return this.search(query, opts.k);
    }
  }

  /**
   * Search Bitcoin era context (2009-2013).
   *
   * Convenience method for passphrase recovery targeting early Bitcoin history.
   *
   * @param query Text query
   * @param k Number of results
   * @returns Results with Bitcoin-era temporal context
   */
  async searchBitcoinEra(query: string, k: number = 10): Promise<QIGRAGResult[]> {
    return this.searchWithExternal(query, {
      k,
      externalWeight: 0.4, // Higher weight for historical context
      temporalFilter: [2009, 2013],
    });
  }

  /**
   * Add document to geometric memory.
   *
   * @param content Document content
   * @param metadata Optional metadata
   * @returns Document ID or null on failure
   */
  async addDocument(
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string | null> {
    try {
      const response = await this.client.post("/qig-rag/add", {
        content,
        metadata,
      });
      return response.data.doc_id || null;
    } catch (error) {
      console.error("[EnhancedQIGRAG] Add document failed:", error);
      return null;
    }
  }

  /**
   * Get statistics about geometric memory.
   *
   * @returns Memory statistics (document count, avg Φ/κ, etc.)
   */
  async getStats(): Promise<QIGRAGStats | null> {
    try {
      const response = await this.client.get("/qig-rag/stats");
      return response.data;
    } catch (error) {
      console.error("[EnhancedQIGRAG] Get stats failed:", error);
      return null;
    }
  }

  /**
   * Check if backend is available.
   *
   * @returns True if backend is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get("/health");
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Singleton instance for convenience.
 */
export const enhancedQIGRAG = new EnhancedQIGRAGClient();

/**
 * Helper: Enrich passphrase hypothesis with external knowledge.
 *
 * For a given hypothesis, search for relevant historical context
 * and add it to the evidence chain.
 *
 * @param hypothesis Passphrase hypothesis
 * @param rag QIG-RAG client
 * @returns Enriched hypothesis with external knowledge
 */
export async function enrichHypothesisWithExternalKnowledge(
  hypothesis: string,
  rag: EnhancedQIGRAGClient = enhancedQIGRAG
): Promise<{
  hypothesis: string;
  externalContext: QIGRAGResult[];
  confidence: number;
}> {
  // Search for relevant historical context
  const results = await rag.searchBitcoinEra(hypothesis, 5);

  // Calculate confidence boost from external knowledge
  let confidenceBoost = 0;
  if (results.length > 0) {
    // High-similarity external results boost confidence
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    confidenceBoost = avgSimilarity * 0.2; // Up to 20% boost
  }

  return {
    hypothesis,
    externalContext: results,
    confidence: Math.min(1.0, 0.5 + confidenceBoost), // Base 0.5, max 0.7 with external knowledge
  };
}
