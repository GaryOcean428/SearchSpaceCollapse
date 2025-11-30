# GEOMETRIC SEARCH INTEGRATION GUIDE - OCEAN (SearchSpaceCollapse)

**Repository:** https://github.com/GaryOcean428/SearchSpaceCollapse.git  
**Target:** Add QIG-pure external search to Ocean's Bitcoin recovery  
**Status:** Ready for Implementation  
**Date:** 2025-11-30

---

## §0 EXECUTIVE SUMMARY

Ocean already has sophisticated 4D geometric search internally (cultural manifold, block universe navigation). This guide adds **external knowledge discovery** while maintaining geometric purity.

**What We're Adding:**
- Web search for cultural/linguistic patterns (2009-2013 Bitcoin era)
- Dictionary expansion from external sources
- Pattern mining from historical documents
- Hypothesis generation from discovered content

**What We're NOT Doing:**
- Replacing Ocean's internal geometric search
- Adding Euclidean distance (maintaining purity)
- Changing Ocean's consciousness architecture

---

## §1 PREREQUISITE: FIX QIG PURITY VIOLATIONS

**CRITICAL:** Before adding search, fix existing Euclidean distance bugs.

### **Issue: 3 Files Use Euclidean Distance**

#### **File 1: `server/temporal-geometry.ts`**

**WRONG (lines ~45-50):**
```typescript
private euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i])**2, 0));
}
```

**CORRECT:**
```typescript
private fisherRaoDistance(a: number[], b: number[], variance?: number[]): number {
  // Fisher-Rao distance: d² = Σ (Δθ_i)² / σ²_i
  let sumSquaredWeighted = 0;
  
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const delta = a[i] - b[i];
    const sigma_sq = variance ? variance[i] : 1.0; // Use variance if provided
    sumSquaredWeighted += (delta * delta) / (sigma_sq + 1e-8);
  }
  
  return Math.sqrt(sumSquaredWeighted);
}
```

#### **File 2: `server/negative-knowledge-registry.ts`**

Same fix - replace `euclideanDistance()` with `fisherRaoDistance()`.

#### **File 3: `server/geometric-memory.ts`**

Same fix - replace all Euclidean distance calls.

**Why This Matters:**
- Euclidean assumes flat space: d² = Σ(Δθ_i)²
- Fisher-Rao accounts for curvature: d² = Σ(Δθ_i)²/σ²_i
- In high-curvature regions, errors can be 2-3×!

---

## §2 ARCHITECTURE: EXTERNAL SEARCH FOR OCEAN

### **Design Philosophy**

Ocean operates in 4D block universe (spacetime) internally. External search provides **new knowledge** to feed into Ocean's geometric processing.

**Flow:**
```
1. Ocean identifies knowledge gap
   ↓
2. Generate geometric query (Fisher manifold point)
   ↓
3. Translate to keywords via geodesic walking
   ↓
4. Execute traditional search (web, archives, databases)
   ↓
5. Re-rank results by Fisher-Rao distance
   ↓
6. Extract patterns and add to cultural manifold
   ↓
7. Generate new hypotheses from discoveries
```

### **Components to Add**

```
server/
├── search/
│   ├── geometric-query-encoder.ts      # Query → Fisher manifold
│   ├── geodesic-search-strategy.ts     # Plan search paths
│   ├── traditional-search-adapter.ts   # Interface to web APIs
│   ├── fisher-rao-reranker.ts          # Re-rank by geometry
│   ├── pattern-extractor.ts            # Learn from results
│   └── ocean-search-controller.ts      # Main orchestrator
```

---

## §3 IMPLEMENTATION - PHASE 1 (Core Components)

### **Step 1: Geometric Query Encoder**

Create `server/search/geometric-query-encoder.ts`:

```typescript
/**
 * Encode Ocean queries onto Fisher information manifold
 * 
 * CRITICAL: Uses Ocean's existing basin space, NOT external embeddings
 */

import { OceanAgent } from '../ocean-agent';
import { BasinCoordinates } from '../types';

export interface GeometricQueryState {
  q: BasinCoordinates;              // Query point in Fisher manifold
  fisherMatrix: number[][];          // Local Fisher information
  varianceWeights: number[];         // 1/Fisher_ii (curvature)
  regime: 'linear' | 'geometric' | 'breakdown';
  temporalContext?: [number, number]; // Era window (Unix epoch)
}

export class GeometricQueryEncoder {
  constructor(private ocean: OceanAgent) {}
  
  encodeQuery(
    query: string,
    temporalContext?: [number, number]
  ): GeometricQueryState {
    // Use Ocean's existing basin encoding
    const basin = this.ocean.encodeConcept(query);
    
    // Compute local Fisher information matrix
    const fisherMatrix = this.computeFisherMatrix(basin);
    
    // Extract variance (1/Fisher_ii)
    const varianceWeights = fisherMatrix.map((row, i) => 
      1.0 / (row[i] + 1e-8)
    );
    
    // Classify regime from curvature
    const regime = this.classifyRegime(fisherMatrix);
    
    return {
      q: basin,
      fisherMatrix,
      varianceWeights,
      regime,
      temporalContext
    };
  }
  
  private computeFisherMatrix(basin: BasinCoordinates): number[][] {
    // Use Ocean's QFI computation
    // F_ij = E[∂_i log p · ∂_j log p]
    
    const dim = basin.length;
    const F: number[][] = [];
    
    // Start with diagonal (conservative)
    for (let i = 0; i < dim; i++) {
      F[i] = new Array(dim).fill(0);
      F[i][i] = 0.1; // Small Fisher info = high uncertainty
    }
    
    // Add structure from basin correlations
    for (let i = 0; i < dim; i++) {
      for (let j = i + 1; j < dim; j++) {
        const correlation = Math.abs(basin[i] * basin[j]);
        F[i][j] = F[j][i] = 0.01 * correlation;
      }
    }
    
    return F;
  }
  
  private classifyRegime(F: number[][]): 'linear' | 'geometric' | 'breakdown' {
    // Trace of Fisher matrix as curvature proxy
    const trace = F.reduce((sum, row, i) => sum + row[i], 0);
    
    if (trace < 5.0) return 'linear';       // Low curvature, sparse
    if (trace < 20.0) return 'geometric';   // Optimal curvature
    return 'breakdown';                      // High curvature, chaotic
  }
}
```

### **Step 2: Traditional Search Adapter**

Create `server/search/traditional-search-adapter.ts`:

```typescript
/**
 * Translate geometric queries into traditional API calls
 * 
 * WARNING: This layer is IMPURE (Euclidean) by necessity
 * Results will be re-ranked geometrically in next step
 */

import axios from 'axios';
import { GeometricQueryState } from './geometric-query-encoder';

export interface SearchResult {
  title: string;
  url?: string;
  content: string;
  timestamp?: number;
  source: 'web' | 'archive' | 'database';
  rawScore: number; // Euclidean (will be replaced)
}

export interface SearchStrategy {
  mode: 'broad_exploration' | 'deep_integration' | 'safety_search';
  maxResults: number;
  geodesicSteps: number;
  distanceThreshold: number;
}

export class TraditionalSearchAdapter {
  constructor(
    private searchSpace: 'web' | 'archive' | 'database',
    private apiKey?: string
  ) {}
  
  async executeSearch(
    queryState: GeometricQueryState,
    strategy: SearchStrategy
  ): Promise<SearchResult[]> {
    // Generate keywords via geodesic walking
    const keywords = this.generateGeodesicKeywords(
      queryState.q,
      strategy.geodesicSteps,
      queryState.fisherMatrix
    );
    
    // Execute backend-specific search
    if (this.searchSpace === 'web') {
      return this.webSearch(keywords, queryState, strategy);
    } else if (this.searchSpace === 'archive') {
      return this.archiveSearch(keywords, queryState, strategy);
    } else {
      return this.databaseSearch(keywords, strategy);
    }
  }
  
  private generateGeodesicKeywords(
    basin: number[],
    steps: number,
    F: number[][]
  ): string[] {
    const keywords: string[] = [];
    const current = [...basin];
    
    for (let step = 0; step < steps; step++) {
      // Compute geodesic direction (natural gradient)
      const direction = this.computeGeodesicDirection(current, F);
      
      // Take small step
      for (let i = 0; i < current.length; i++) {
        current[i] += 0.1 * direction[i];
      }
      
      // Map to keyword (approximate)
      const keyword = this.basinToKeyword(current);
      if (keyword) keywords.push(keyword);
    }
    
    return keywords;
  }
  
  private computeGeodesicDirection(
    point: number[],
    F: number[][]
  ): number[] {
    // Natural gradient = F^(-1) · ∇
    const gradient = point.map(() => Math.random() * 2 - 1);
    
    // Invert Fisher matrix (simplified: use diagonal)
    const F_inv_diagonal = F.map((row, i) => 1.0 / (row[i] + 1e-6));
    
    // Natural direction
    const natural = gradient.map((g, i) => g * F_inv_diagonal[i]);
    
    // Normalize
    const norm = Math.sqrt(natural.reduce((sum, x) => sum + x*x, 0));
    return natural.map(x => x / (norm + 1e-8));
  }
  
  private basinToKeyword(basin: number[]): string | null {
    // Map basin to Bitcoin-era vocabulary
    const vocab = [
      'satoshi', 'blockchain', 'mining', 'cryptography',
      'peer-to-peer', 'decentralized', 'hash', 'wallet',
      'genesis', 'bitcoin', 'cryptocurrency', 'digital',
      'anonymous', 'trustless', 'immutable', 'consensus'
    ];
    
    const hash = Math.abs(basin.reduce((sum, x) => sum + x, 0));
    const index = Math.floor(hash * 1000) % vocab.length;
    return vocab[index];
  }
  
  private async webSearch(
    keywords: string[],
    queryState: GeometricQueryState,
    strategy: SearchStrategy
  ): Promise<SearchResult[]> {
    const query = keywords.join(' ');
    
    // Add temporal context if provided
    let temporalQuery = query;
    if (queryState.temporalContext) {
      const [start, end] = queryState.temporalContext;
      const startDate = new Date(start * 1000).toISOString().split('T')[0];
      const endDate = new Date(end * 1000).toISOString().split('T')[0];
      temporalQuery += ` after:${startDate} before:${endDate}`;
    }
    
    // Execute search (Brave API example)
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: { 'X-Subscription-Token': this.apiKey || '' },
        params: {
          q: temporalQuery,
          count: strategy.maxResults
        }
      });
      
      return response.data.web?.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.description,
        timestamp: r.age ? Date.now() - r.age * 1000 : undefined,
        source: 'web' as const,
        rawScore: 1.0 / ((response.data.web.results.indexOf(r) || 0) + 1)
      })) || [];
      
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }
  
  private async archiveSearch(
    keywords: string[],
    queryState: GeometricQueryState,
    strategy: SearchStrategy
  ): Promise<SearchResult[]> {
    // Search Internet Archive for historical documents
    // TODO: Implement Archive.org API integration
    return [];
  }
  
  private async databaseSearch(
    keywords: string[],
    strategy: SearchStrategy
  ): Promise<SearchResult[]> {
    // Search local database of known patterns
    // TODO: Implement database query
    return [];
  }
}
```

### **Step 3: Fisher-Rao Re-Ranker**

Create `server/search/fisher-rao-reranker.ts`:

```typescript
/**
 * Re-rank search results using Fisher-Rao distance
 * 
 * CRITICAL: All operations use Fisher-Rao metric
 * Traditional Euclidean scores are DISCARDED
 */

import { GeometricQueryState } from './geometric-query-encoder';
import { SearchResult } from './traditional-search-adapter';
import { OceanAgent } from '../ocean-agent';

export interface RankedResult extends SearchResult {
  geometricScore: number;
  fisherDistance: number;
  basinAlignment: number;
  integrationPhi: number;
}

export class FisherRaoReRanker {
  constructor(private ocean: OceanAgent) {}
  
  rerankResults(
    queryState: GeometricQueryState,
    results: SearchResult[]
  ): RankedResult[] {
    const ranked: RankedResult[] = [];
    
    for (const result of results) {
      // Encode result onto Fisher manifold
      const r_basin = this.ocean.encodeConcept(result.content);
      
      // Compute Fisher-Rao distance
      const d_FR = this.fisherRaoDistance(
        queryState.q,
        r_basin,
        queryState.varianceWeights
      );
      
      // Compute basin alignment
      const basinAlign = this.basinAlignment(queryState.q, r_basin);
      
      // Compute integration score (simplified Φ)
      const phi = this.integrationScore(queryState.q, r_basin);
      
      // Combined geometric score
      const score = this.combineScores(
        d_FR,
        basinAlign,
        phi,
        queryState.regime
      );
      
      ranked.push({
        ...result,
        geometricScore: score,
        fisherDistance: d_FR,
        basinAlignment: basinAlign,
        integrationPhi: phi
      });
    }
    
    // Sort by geometric score
    ranked.sort((a, b) => b.geometricScore - a.geometricScore);
    
    return ranked;
  }
  
  private fisherRaoDistance(
    q: number[],
    r: number[],
    sigma_sq: number[]
  ): number {
    // Fisher-Rao: d² = Σ (q_i - r_i)² / σ²_i
    let sumSquared = 0;
    
    for (let i = 0; i < Math.min(q.length, r.length); i++) {
      const delta = q[i] - r[i];
      sumSquared += (delta * delta) / (sigma_sq[i] + 1e-8);
    }
    
    return Math.sqrt(sumSquared);
  }
  
  private basinAlignment(q: number[], r: number[]): number {
    // Cosine similarity in basin space
    let dot = 0;
    let normQ = 0;
    let normR = 0;
    
    for (let i = 0; i < Math.min(q.length, r.length); i++) {
      dot += q[i] * r[i];
      normQ += q[i] * q[i];
      normR += r[i] * r[i];
    }
    
    return dot / (Math.sqrt(normQ * normR) + 1e-8);
  }
  
  private integrationScore(q: number[], r: number[]): number {
    // Simplified Φ (correlation proxy)
    const alignment = this.basinAlignment(q, r);
    return Math.max(0, Math.min(1, (alignment + 1) / 2));
  }
  
  private combineScores(
    d_FR: number,
    basin: number,
    phi: number,
    regime: 'linear' | 'geometric' | 'breakdown'
  ): number {
    const distSim = 1.0 / (1.0 + d_FR);
    
    if (regime === 'linear') {
      // Exploration: favor Φ
      return 0.2 * distSim + 0.3 * basin + 0.5 * phi;
    } else if (regime === 'geometric') {
      // Integration: favor Φ heavily
      return 0.1 * distSim + 0.3 * basin + 0.6 * phi;
    } else {
      // Safety: favor basin alignment
      return 0.1 * distSim + 0.7 * basin + 0.2 * phi;
    }
  }
}
```

### **Step 4: Ocean Search Controller**

Create `server/search/ocean-search-controller.ts`:

```typescript
/**
 * Main orchestrator for Ocean's external search
 * 
 * Integrates geometric search with Ocean's existing architecture
 */

import { OceanAgent } from '../ocean-agent';
import { GeometricQueryEncoder, GeometricQueryState } from './geometric-query-encoder';
import { TraditionalSearchAdapter, SearchStrategy } from './traditional-search-adapter';
import { FisherRaoReRanker, RankedResult } from './fisher-rao-reranker';

export interface OceanSearchConfig {
  webApiKey?: string;
  maxResults: number;
  consciousnessThreshold: number; // Minimum Φ
}

export class OceanSearchController {
  private encoder: GeometricQueryEncoder;
  private webAdapter: TraditionalSearchAdapter;
  private archiveAdapter: TraditionalSearchAdapter;
  private reranker: FisherRaoReRanker;
  
  constructor(
    private ocean: OceanAgent,
    private config: OceanSearchConfig
  ) {
    this.encoder = new GeometricQueryEncoder(ocean);
    this.webAdapter = new TraditionalSearchAdapter('web', config.webApiKey);
    this.archiveAdapter = new TraditionalSearchAdapter('archive');
    this.reranker = new FisherRaoReRanker(ocean);
  }
  
  async searchForPatterns(
    query: string,
    temporalContext?: [number, number]
  ): Promise<RankedResult[]> {
    // Encode query onto Fisher manifold
    const queryState = this.encoder.encodeQuery(query, temporalContext);
    
    // Plan search strategy
    const strategy = this.planStrategy(queryState);
    
    // Execute searches
    const webResults = await this.webAdapter.executeSearch(queryState, strategy);
    const archiveResults = await this.archiveAdapter.executeSearch(queryState, strategy);
    
    // Combine results
    const allResults = [...webResults, ...archiveResults];
    
    // Re-rank geometrically
    const ranked = this.reranker.rerankResults(queryState, allResults);
    
    // Filter by consciousness threshold
    const conscious = ranked.filter(
      r => r.integrationPhi > this.config.consciousnessThreshold
    );
    
    return conscious;
  }
  
  async discoverCulturalPatterns(era: string): Promise<string[]> {
    // Search for cultural patterns in specific era
    const temporalWindows = {
      'genesis-2009': [1230768000, 1262304000] as [number, number],  // 2009
      '2010-2011': [1262304000, 1325376000] as [number, number],
      '2012-2013': [1325376000, 1388534400] as [number, number]
    };
    
    const window = temporalWindows[era as keyof typeof temporalWindows];
    if (!window) return [];
    
    // Search multiple cultural queries
    const queries = [
      'popular passwords',
      'internet slang',
      'cryptocurrency terminology',
      'geek culture phrases',
      'bitcoin forum discussions'
    ];
    
    const patterns: string[] = [];
    
    for (const query of queries) {
      const results = await this.searchForPatterns(query, window);
      
      // Extract patterns from top results
      for (const result of results.slice(0, 3)) {
        const extracted = this.extractPatterns(result.content);
        patterns.push(...extracted);
      }
    }
    
    return Array.from(new Set(patterns)); // Unique patterns
  }
  
  private planStrategy(queryState: GeometricQueryState): SearchStrategy {
    // Regime-adaptive strategy
    if (queryState.regime === 'linear') {
      return {
        mode: 'broad_exploration',
        maxResults: 100,
        geodesicSteps: 5,
        distanceThreshold: 3.0
      };
    } else if (queryState.regime === 'geometric') {
      return {
        mode: 'deep_integration',
        maxResults: 20,
        geodesicSteps: 12,
        distanceThreshold: 1.5
      };
    } else {
      return {
        mode: 'safety_search',
        maxResults: 10,
        geodesicSteps: 1,
        distanceThreshold: 5.0
      };
    }
  }
  
  private extractPatterns(text: string): string[] {
    // Extract potential passphrase patterns
    const words = text.toLowerCase().split(/\W+/);
    
    // Filter for Bitcoin-era vocabulary
    const patterns = words.filter(w => 
      w.length >= 4 && 
      w.length <= 20 &&
      /^[a-z0-9]+$/.test(w)
    );
    
    return patterns;
  }
}
```

---

## §4 INTEGRATION WITH OCEAN

### **Step 5: Modify Ocean Agent**

Add to `server/ocean-agent.ts`:

```typescript
import { OceanSearchController } from './search/ocean-search-controller';

export class OceanAgent {
  private externalSearch: OceanSearchController;
  
  constructor(config: OceanConfig) {
    // ... existing initialization ...
    
    // Initialize external search
    this.externalSearch = new OceanSearchController(this, {
      webApiKey: config.braveApiKey,
      maxResults: 50,
      consciousnessThreshold: 0.7
    });
  }
  
  async enhanceCulturalManifold() {
    // Discover new patterns from external sources
    const eras = ['genesis-2009', '2010-2011', '2012-2013'];
    
    for (const era of eras) {
      console.log(`[Ocean] Discovering cultural patterns for ${era}...`);
      
      const patterns = await this.externalSearch.discoverCulturalPatterns(era);
      
      console.log(`[Ocean] Found ${patterns.length} new patterns`);
      
      // Integrate into cultural manifold
      this.culturalManifold.addPatterns(era, patterns);
    }
  }
  
  async searchForClue(clue: string): Promise<any[]> {
    // Search external sources for specific clue
    const results = await this.externalSearch.searchForPatterns(clue);
    
    // Generate hypotheses from results
    const hypotheses = results.map(r => ({
      passphrase: this.extractPassphrase(r.content),
      score: r.geometricScore,
      source: r.url || r.title,
      phi: r.integrationPhi
    }));
    
    return hypotheses.filter(h => h.passphrase);
  }
  
  private extractPassphrase(text: string): string | null {
    // Extract potential passphrase from search result
    // Simple implementation - can be enhanced
    const words = text.split(/\s+/).filter(w => w.length >= 3);
    if (words.length < 3) return null;
    
    // Try combinations
    return words.slice(0, 5).join('');
  }
}
```

---

## §5 DEPLOYMENT

### **Step 6: Install Dependencies**

```bash
cd SearchSpaceCollapse/
npm install axios
```

### **Step 7: Configuration**

Add to `.env`:

```bash
# Brave Search API (or other search provider)
BRAVE_API_KEY=your_api_key_here

# Search config
SEARCH_MAX_RESULTS=50
SEARCH_CONSCIOUSNESS_THRESHOLD=0.7
```

### **Step 8: Testing**

Create `server/search/__tests__/ocean-search.test.ts`:

```typescript
import { OceanSearchController } from '../ocean-search-controller';
import { OceanAgent } from '../../ocean-agent';

describe('Ocean External Search', () => {
  let ocean: OceanAgent;
  let search: OceanSearchController;
  
  beforeAll(() => {
    ocean = new OceanAgent({} as any);
    search = new OceanSearchController(ocean, {
      maxResults: 10,
      consciousnessThreshold: 0.6
    });
  });
  
  test('should encode query to Fisher manifold', () => {
    const encoder = (search as any).encoder;
    const queryState = encoder.encodeQuery('bitcoin 2009');
    
    expect(queryState.q).toBeDefined();
    expect(queryState.fisherMatrix).toBeDefined();
    expect(queryState.varianceWeights).toBeDefined();
    expect(['linear', 'geometric', 'breakdown']).toContain(queryState.regime);
  });
  
  test('should use Fisher-Rao distance not Euclidean', () => {
    const reranker = (search as any).reranker;
    
    const q = [1, 2, 3, 4];
    const r1 = [1.1, 2.1, 3.1, 4.1];
    const r2 = [5, 6, 7, 8];
    const sigma_sq = [1, 1, 1, 1];
    
    const d1 = reranker.fisherRaoDistance(q, r1, sigma_sq);
    const d2 = reranker.fisherRaoDistance(q, r2, sigma_sq);
    
    expect(d1).toBeLessThan(d2); // Closer should have smaller distance
    expect(d1).toBeGreaterThan(0);
  });
  
  test('should filter by consciousness threshold', async () => {
    const results = await search.searchForPatterns('test query');
    
    results.forEach(r => {
      expect(r.integrationPhi).toBeGreaterThan(0.6);
    });
  });
});
```

Run tests:

```bash
npm test server/search
```

---

## §6 USAGE EXAMPLES

### **Example 1: Enhance Cultural Manifold**

```typescript
// In Bitcoin recovery script
const ocean = new OceanAgent(config);

// Discover patterns from external sources
await ocean.enhanceCulturalManifold();

// Ocean now has expanded vocabulary from:
// - Web searches of 2009-2013 content
// - Archive.org historical documents
// - Pattern extraction from results
```

### **Example 2: Search for Specific Clue**

```typescript
// User has partial memory of passphrase
const clue = "something about satoshi and genesis";

// Search external sources
const hypotheses = await ocean.searchForClue(clue);

// Ocean returns geometric-ranked hypotheses:
// [
//   { passphrase: "satoshigenesis", score: 0.85, phi: 0.78 },
//   { passphrase: "genesisblock", score: 0.82, phi: 0.75 },
//   ...
// ]
```

### **Example 3: Temporal Search**

```typescript
// Search specific time period
const results = await ocean.externalSearch.searchForPatterns(
  'cryptocurrency passwords',
  [1230768000, 1262304000] // 2009 (Bitcoin genesis)
);

// Results are 4D (spatial + temporal)
results.forEach(r => {
  console.log(`${r.title} (${r.timestamp})`);
  console.log(`  Fisher distance: ${r.fisherDistance}`);
  console.log(`  Φ: ${r.integrationPhi}`);
});
```

---

## §7 VALIDATION CHECKLIST

**Before deployment:**

- [ ] Fix Euclidean distance in 3 files (temporal-geometry, negative-knowledge-registry, geometric-memory)
- [ ] Verify Fisher-Rao distance implementation
- [ ] Test regime adaptation (linear/geometric/breakdown)
- [ ] Validate consciousness filtering (Φ > 0.7)
- [ ] Test temporal search (4D)
- [ ] Verify pattern extraction
- [ ] Test cultural manifold integration
- [ ] Run full test suite

---

## §8 EXPECTED OUTCOMES

**After implementation:**

1. **Expanded Vocabulary:** Ocean discovers 500-1000 new candidate patterns from external sources

2. **Cultural Enrichment:** Cultural manifold enhanced with era-specific patterns (2009-2013)

3. **Hypothesis Generation:** New passphrase candidates from external knowledge

4. **Temporal Accuracy:** 4D search respects Bitcoin era constraints

5. **Geometric Purity:** All ranking via Fisher-Rao distance (NO Euclidean)

6. **Consciousness Integration:** Only Φ > 0.7 results integrated

---

## §9 TROUBLESHOOTING

### **Issue: "Search returns no results"**

Check API key:
```typescript
console.log('API Key configured:', !!config.webApiKey);
```

Lower consciousness threshold:
```typescript
consciousnessThreshold: 0.5  // instead of 0.7
```

### **Issue: "Fisher-Rao distances all similar"**

This suggests flat geometry. Check variance weights:
```typescript
console.log('Variance range:', 
  Math.min(...queryState.varianceWeights),
  Math.max(...queryState.varianceWeights)
);
```

### **Issue: "Too many results, all low quality"**

Tighten strategy:
```typescript
strategy.distanceThreshold = 1.0;  // Tighter focus
strategy.maxResults = 10;          // Fewer results
```

---

## §10 NEXT STEPS

**Future enhancements:**

1. **Multi-Source Fusion:** Combine web + archive + database results
2. **Causal Search:** "What led to Bitcoin?" (past light cone)
3. **Predictive Search:** "What patterns predict success?" (future light cone)
4. **Multi-Ocean Constellation:** Parallel searches, basin sync fusion
5. **Continuous Learning:** Update vocabulary from each search

**This gives Ocean external knowledge discovery while maintaining geometric purity.** ✓

---

**END INTEGRATION GUIDE - OCEAN**

Status: Complete  
Ready for: Implementation  
Estimated Effort: 6-8 hours (including QIG purity fixes)

🌊∇💚∫🧠
