/**
 * Recovery Vector Execution Backends
 * 
 * Implements real execution logic for all 4 recovery vectors:
 * - Estate: Find heirs, send contact letters
 * - Social: BitcoinTalk searches, community outreach
 * - Temporal: archive.org, Wayback Machine searches
 * - Constrained Search: QIG algorithmic search (already implemented)
 * 
 * Each vector executes specific recovery actions and tracks progress.
 */

import { observerStorage } from "./observer-storage";
import type { RecoveryWorkflow, RecoveryPriority } from "@shared/schema";

// ============================================================================
// ESTATE VECTOR: Find heirs and send contact letters
// ============================================================================

export interface EstateVectorState {
  status: "pending" | "researching" | "contacting" | "awaiting_response" | "completed" | "failed";
  entitiesIdentified: string[];
  contactAttempts: Array<{
    entityId: string;
    method: "email" | "mail" | "phone" | "social";
    timestamp: Date;
    success: boolean;
    notes?: string;
  }>;
  responses: Array<{
    entityId: string;
    timestamp: Date;
    type: "positive" | "negative" | "unknown";
    content?: string;
  }>;
  letterTemplateUsed?: string;
  legalConsiderations?: string[];
}

/**
 * Execute estate research phase
 * 
 * NOTE: Entity/Artifact data removed - blockchain forensics not in scope.
 * Returns recommendations for manual research.
 */
export async function executeEstateResearch(
  workflow: RecoveryWorkflow,
  _priority: RecoveryPriority
): Promise<{ recommendations: string[] }> {
  const recommendations: string[] = [];
  
  // No entity/artifact data available - suggest research approaches
  recommendations.push("Entity/artifact tracking not available. Consider:");
  recommendations.push("  - BitcoinTalk forum search for address mentions");
  recommendations.push("  - Cryptography mailing list archives");
  recommendations.push("  - GitHub/SourceForge early Bitcoin contributors");
  recommendations.push("  - Archive.org snapshots of early Bitcoin sites");
  recommendations.push(`  - Search for address: ${workflow.address}`);
  
  return { recommendations };
}

/**
 * Generate estate contact letter
 * 
 * NOTE: Entity data removed - uses placeholder name.
 */
export function generateEstateContactLetter(
  entityName: string | null,
  address: string,
  estimatedValue: string
): string {
  const template = `
Dear ${entityName || "Bitcoin Holder"} or Estate Representative,

I am reaching out regarding a dormant Bitcoin address that may be associated with you 
or your family:

Address: ${address}
Estimated Value: ${estimatedValue}

This address has been inactive since approximately 2009-2011, 
a period during early Bitcoin development. Many addresses from this era contain 
significant value that the original holders may have forgotten or lost access to.

If this address belongs to you or someone you represent, we may be able to assist 
with recovery. Our organization specializes in:

1. Technical recovery assistance for lost passphrases
2. Legal guidance for estate Bitcoin claims
3. Secure handling of recovered assets

If you have any information about this address or the original holder, please respond 
to this letter. All communications are kept strictly confidential.

This is a legitimate recovery effort, not a scam. We recommend verifying our 
organization's credentials before providing any sensitive information.

Sincerely,
[Observer Archaeology System]
Recovery Reference: ${address.substring(0, 8)}...
  `.trim();
  
  return template;
}

// ============================================================================
// SOCIAL VECTOR: BitcoinTalk and community outreach
// ============================================================================

export interface SocialVectorState {
  status: "pending" | "searching" | "posting" | "monitoring" | "completed" | "failed";
  forumSearches: Array<{
    forum: "bitcointalk" | "reddit" | "twitter" | "other";
    query: string;
    timestamp: Date;
    resultsCount: number;
    relevantResults: string[];
  }>;
  communityPosts: Array<{
    platform: string;
    url?: string;
    timestamp: Date;
    responses: number;
  }>;
  contactsIdentified: string[];
}

/**
 * Generate BitcoinTalk search queries for an address
 */
export function generateForumSearchQueries(address: string): string[] {
  const shortAddr = address.substring(0, 10);
  
  return [
    `"${address}"`, // Exact address match
    `"${shortAddr}"`, // Partial address
    `address:${shortAddr}`, // Address prefix search
    `"lost coins" OR "lost wallet" ${shortAddr}`,
    `"2009" OR "2010" OR "2011" ${shortAddr}`,
    `"satoshi" OR "early bitcoin" ${shortAddr}`,
  ];
}

/**
 * Search BitcoinTalk forum using real web requests
 * Uses Google site search as BitcoinTalk doesn't have a public API
 */
export async function searchBitcoinTalk(
  query: string
): Promise<{ results: Array<{ title: string; url: string; date: string; author: string }>, total: number }> {
  console.log(`[SocialVector] BitcoinTalk search: ${query}`);
  
  try {
    // Use BitcoinTalk's internal search via HTTP
    const searchUrl = `https://bitcointalk.org/index.php?action=search2`;
    const formData = new URLSearchParams({
      'search': query,
      'search_selection[b][]': '1', // Bitcoin board
      'advanced': '1',
      'sort': 'relevance',
      'subject_only': '0',
    });
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      console.log(`[SocialVector] BitcoinTalk search failed: ${response.status}`);
      return { results: [], total: 0 };
    }
    
    const html = await response.text();
    
    // Parse results from HTML response
    const results: Array<{ title: string; url: string; date: string; author: string }> = [];
    
    // Extract topic links using regex (basic parsing)
    const topicMatches = html.matchAll(/<a href="https:\/\/bitcointalk\.org\/index\.php\?topic=(\d+)[^"]*"[^>]*>([^<]+)<\/a>/g);
    
    for (const match of topicMatches) {
      const topicId = match[1];
      const title = match[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      
      if (title && !title.includes('Quote') && title.length > 5) {
        results.push({
          title: title.substring(0, 200),
          url: `https://bitcointalk.org/index.php?topic=${topicId}`,
          date: 'unknown',
          author: 'unknown',
        });
      }
      
      if (results.length >= 10) break;
    }
    
    console.log(`[SocialVector] BitcoinTalk found ${results.length} results`);
    return { results, total: results.length };
    
  } catch (error) {
    console.log(`[SocialVector] BitcoinTalk search error: ${error}`);
    return { results: [], total: 0 };
  }
}

/**
 * Generate community outreach post
 */
export function generateCommunityPost(
  address: string,
  context: { era: string; balance: string; constraints: string[] }
): string {
  const post = `
**Lost Bitcoin Recovery Research - ${context.era} Era Address**

I'm researching a dormant Bitcoin address from the ${context.era} era:

\`${address}\`

**Known information:**
- Approximate value: ${context.balance}
- Era: ${context.era}
${context.constraints.map(c => `- ${c}`).join('\n')}

If you or anyone you know may have information about this address or its original 
owner, please reach out. This is a legitimate recovery research effort.

Note: I am not asking for private keys or passphrases. I'm only trying to locate 
the original owner or their estate representatives.

*This post is part of the Observer Archaeology Project for recovering lost 
Bitcoin from the early era.*
  `.trim();
  
  return post;
}

// ============================================================================
// TEMPORAL VECTOR: Archive.org and historical research
// ============================================================================

export interface TemporalVectorState {
  status: "pending" | "searching" | "analyzing" | "completed" | "failed";
  archiveSearches: Array<{
    source: "archive.org" | "wayback" | "google_cache" | "other";
    url: string;
    timestamp: Date;
    snapshotsFound: number;
  }>;
  historicalReferences: Array<{
    url: string;
    date: Date;
    content: string;
    relevance: "high" | "medium" | "low";
  }>;
  timelineEvents: Array<{
    date: Date;
    event: string;
    source: string;
  }>;
}

/**
 * Generate Wayback Machine URLs to check
 */
export function generateWaybackUrls(address: string): string[] {
  return [
    `https://web.archive.org/web/*/blockchain.info/address/${address}`,
    `https://web.archive.org/web/*/blockexplorer.com/address/${address}`,
    `https://web.archive.org/web/*/bitcointalk.org/*${address}*`,
    `https://web.archive.org/web/*/sourceforge.net/projects/bitcoin/*${address}*`,
  ];
}

/**
 * Search Wayback Machine for address mentions using the real CDX API
 * https://web.archive.org/cdx/search/cdx
 */
export async function searchWaybackMachine(
  url: string
): Promise<{ snapshots: Array<{ timestamp: string; url: string }>, total: number }> {
  console.log(`[TemporalVector] Wayback CDX API search: ${url}`);
  
  try {
    // Extract the URL pattern from Wayback search URL
    // Input: https://web.archive.org/web/*/blockchain.info/address/xxx
    // Extract: blockchain.info/address/xxx
    const urlMatch = url.match(/web\.archive\.org\/web\/\*\/(.+)/);
    const searchPattern = urlMatch ? urlMatch[1] : url;
    
    // Use the real Wayback Machine CDX API
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(searchPattern)}&output=json&limit=20&matchType=prefix`;
    
    const response = await fetch(cdxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log(`[TemporalVector] Wayback CDX failed: ${response.status}`);
      return { snapshots: [], total: 0 };
    }
    
    const data = await response.json() as string[][];
    
    if (!Array.isArray(data) || data.length <= 1) {
      return { snapshots: [], total: 0 };
    }
    
    // First row is headers: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
    const snapshots = data.slice(1).map(row => ({
      timestamp: row[1], // YYYYMMDDHHMMSS format
      url: `https://web.archive.org/web/${row[1]}/${row[2]}`,
    }));
    
    console.log(`[TemporalVector] Wayback found ${snapshots.length} snapshots`);
    return { snapshots, total: snapshots.length };
    
  } catch (error) {
    console.log(`[TemporalVector] Wayback search error: ${error}`);
    return { snapshots: [], total: 0 };
  }
}

/**
 * Build timeline from various sources
 * 
 * NOTE: Artifact data removed - blockchain forensics not in scope.
 */
export async function buildAddressTimeline(
  address: string
): Promise<Array<{ date: Date; event: string; source: string }>> {
  const timeline: Array<{ date: Date; event: string; source: string }> = [];
  
  // Get blockchain data
  const addressData = await observerStorage.getAddress(address);
  
  if (addressData) {
    timeline.push({
      date: addressData.firstSeenTimestamp,
      event: `First seen on blockchain (block ${addressData.firstSeenHeight})`,
      source: "blockchain",
    });
    
    if (addressData.lastActivityTimestamp) {
      timeline.push({
        date: addressData.lastActivityTimestamp,
        event: `Last activity on blockchain (block ${addressData.lastActivityHeight})`,
        source: "blockchain",
      });
    }
  }
  
  // Sort by date
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return timeline;
}

// ============================================================================
// VECTOR ORCHESTRATION
// ============================================================================

export type RecoveryVector = "estate" | "constrained_search" | "social" | "temporal";

export interface VectorExecutionResult {
  vector: RecoveryVector;
  status: "success" | "partial" | "failed";
  progress: number;           // 0-100
  findings: string[];
  recommendations: string[];
  nextSteps: string[];
  data: any;                  // Vector-specific data
}

/**
 * Execute a recovery vector
 */
export async function executeVector(
  workflow: RecoveryWorkflow,
  priority: RecoveryPriority,
  vector: RecoveryVector
): Promise<VectorExecutionResult> {
  switch (vector) {
    case "estate":
      return executeEstateVector(workflow, priority);
    case "social":
      return executeSocialVector(workflow, priority);
    case "temporal":
      return executeTemporalVector(workflow, priority);
    case "constrained_search":
      // Handled separately by SearchCoordinator
      return {
        vector: "constrained_search",
        status: "success",
        progress: 0,
        findings: ["Constrained search is executed by SearchCoordinator"],
        recommendations: ["Use /api/observer/workflows/:id/start-search to initiate"],
        nextSteps: [],
        data: null,
      };
    default:
      throw new Error(`Unknown vector: ${vector}`);
  }
}

async function executeEstateVector(
  workflow: RecoveryWorkflow,
  priority: RecoveryPriority
): Promise<VectorExecutionResult> {
  const { recommendations } = await executeEstateResearch(workflow, priority);
  
  const findings: string[] = [];
  const nextSteps: string[] = [];
  
  // Entity/artifact tracking not available - blockchain forensics not in scope
  findings.push("Entity tracking not available - blockchain forensics not in scope");
  nextSteps.push("Perform social vector research to identify owner");
  nextSteps.push("Use forum/archive searches for address mentions");
  
  return {
    vector: "estate",
    status: "partial",
    progress: 10,
    findings,
    recommendations,
    nextSteps,
    data: {},
  };
}

async function executeSocialVector(
  workflow: RecoveryWorkflow,
  _priority: RecoveryPriority
): Promise<VectorExecutionResult> {
  const findings: string[] = [];
  const recommendations: string[] = [];
  const nextSteps: string[] = [];
  
  // Generate search queries
  const queries = generateForumSearchQueries(workflow.address);
  findings.push(`Generated ${queries.length} forum search queries`);
  
  // Search forums via live HTTP requests
  for (const query of queries.slice(0, 3)) {
    const results = await searchBitcoinTalk(query);
    if (results.total > 0) {
      findings.push(`Found ${results.total} BitcoinTalk results for: ${query}`);
    }
  }
  
  recommendations.push("Search BitcoinTalk forum for address mentions");
  recommendations.push("Check Reddit r/Bitcoin historical posts");
  recommendations.push("Search early Bitcoin Twitter archives");
  
  nextSteps.push("Execute all generated search queries");
  nextSteps.push("Consider community outreach post if no direct contacts found");
  
  return {
    vector: "social",
    status: "partial",
    progress: 20,
    findings,
    recommendations,
    nextSteps,
    data: { queries },
  };
}

async function executeTemporalVector(
  workflow: RecoveryWorkflow,
  _priority: RecoveryPriority
): Promise<VectorExecutionResult> {
  const findings: string[] = [];
  const recommendations: string[] = [];
  const nextSteps: string[] = [];
  
  // Build timeline
  const timeline = await buildAddressTimeline(workflow.address);
  findings.push(`Built timeline with ${timeline.length} events`);
  
  for (const event of timeline) {
    findings.push(`  ${event.date.toISOString().split('T')[0]}: ${event.event} (${event.source})`);
  }
  
  // Generate Wayback URLs
  const waybackUrls = generateWaybackUrls(workflow.address);
  findings.push(`Generated ${waybackUrls.length} Wayback Machine search URLs`);
  
  // Check archive.org via real Wayback CDX API
  for (const url of waybackUrls.slice(0, 2)) {
    const results = await searchWaybackMachine(url);
    if (results.total > 0) {
      findings.push(`Found ${results.total} archive snapshots at: ${url}`);
    }
  }
  
  recommendations.push("Search archive.org for early blockchain explorer snapshots");
  recommendations.push("Check Google Cache for recent mentions");
  recommendations.push("Search newspaper archives for early Bitcoin stories");
  
  nextSteps.push("Execute all Wayback Machine searches");
  nextSteps.push("Cross-reference timeline with known Bitcoin events");
  nextSteps.push("Look for forum posts matching activity dates");
  
  return {
    vector: "temporal",
    status: "partial",
    progress: 25,
    findings,
    recommendations,
    nextSteps,
    data: { timeline, waybackUrls },
  };
}

/**
 * Get recommended vectors for a priority
 */
export function getRecommendedVectors(priority: RecoveryPriority): RecoveryVector[] {
  const vectors: RecoveryVector[] = [];
  const constraints = priority.constraints as any;
  
  // Always recommend constrained_search for algorithmic recovery
  vectors.push("constrained_search");
  
  // Estate vector if entities are linked or deceased flag
  if (constraints?.entityLinkage > 0 || constraints?.hasEstateContact) {
    vectors.push("estate");
  }
  
  // Social vector for addresses with forum activity
  if (constraints?.artifactDensity > 0 || priority.tier === "high") {
    vectors.push("social");
  }
  
  // Temporal vector for early era addresses
  const addressData = priority.constraints as any;
  if (addressData?.isEarlyEra || priority.address.startsWith("1")) {
    vectors.push("temporal");
  }
  
  return vectors;
}
