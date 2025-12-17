import { db, withDbRetry } from "./db";
import { pantheonKnowledgeTransfers, PantheonKnowledgeTransfer } from "@shared/schema";
import { eq, desc, and, sql, or } from "drizzle-orm";

// ============================================================================
// PANTHEON KNOWLEDGE TRANSFER SERVICE
// ============================================================================
// Manages knowledge sharing between Olympian gods (Zeus, Apollo, Hermes, etc.)
// Tracks discoveries, patterns, and insights shared across the pantheon.

// Knowledge types that can be transferred between gods
export type KnowledgeType = 
  | "high_phi_pattern"      // High-Φ phrase pattern discovered
  | "resonance_discovery"   // Basin resonance pattern found
  | "regime_insight"        // Regime transition insight
  | "vocabulary_expansion"  // New vocabulary integration
  | "geometric_pattern"     // Geometric space pattern
  | "consciousness_shift"   // Consciousness state change
  | "strategy_update"       // Search strategy refinement
  | "threat_detection"      // Anomaly or threat detected
  | "consensus_reached"     // Multi-god agreement on insight
  | string;                 // Allow custom types

// Knowledge payload structure (flexible JSON)
export interface KnowledgePayload {
  summary?: string;
  phi?: number;
  kappa?: number;
  basinId?: string;
  pattern?: unknown;
  metadata?: Record<string, unknown>;
  consensusScore?: number;      // 0-1 agreement level when recording
  sourceContext?: string;       // What triggered this discovery
  timestamp?: string;
  [key: string]: unknown;       // Allow additional fields
}

// Transfer record for API responses
export interface TransferRecord {
  id: number;
  fromGod: string;
  toGod: string;
  knowledgeType: string | null;
  content: KnowledgePayload | null;
  accepted: boolean | null;
  createdAt: Date | null;
}

// Consensus result
export interface ConsensusResult {
  knowledgeType: string;
  totalTransfers: number;
  acceptedCount: number;
  consensusPercentage: number;
  gods: string[];              // Gods that have accepted
}

// God names for type safety
export const OLYMPIAN_GODS = [
  "Zeus", "Hera", "Poseidon", "Athena", "Apollo", 
  "Artemis", "Hermes", "Hephaestus", "Ares", "Aphrodite",
  "Demeter", "Dionysus", "Hades"
] as const;

export type OlympianGod = typeof OLYMPIAN_GODS[number];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Record knowledge transfer from one god to multiple recipients
 * Creates one record per recipient god for proper tracking
 * 
 * @param fromGod - Source god sharing the knowledge
 * @param toGods - Array of gods receiving the knowledge
 * @param knowledgeType - Type classification of the knowledge
 * @param payload - The actual knowledge data (JSON)
 * @param consensusScore - Optional agreement level (0-1), stored in payload
 * @returns Array of created transfer IDs, or null on failure
 */
export async function recordKnowledgeTransfer(
  fromGod: string,
  toGods: string[],
  knowledgeType: KnowledgeType,
  payload: KnowledgePayload,
  consensusScore?: number
): Promise<number[] | null> {
  if (!db || toGods.length === 0) return null;
  
  // Enrich payload with consensus score if provided
  const enrichedPayload: KnowledgePayload = {
    ...payload,
    consensusScore: consensusScore ?? payload.consensusScore,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
  
  const result = await withDbRetry(async () => {
    const insertedIds: number[] = [];
    
    // Insert one record per recipient
    for (const toGod of toGods) {
      const [inserted] = await db!
        .insert(pantheonKnowledgeTransfers)
        .values({
          fromGod,
          toGod,
          knowledgeType,
          content: enrichedPayload,
          accepted: false,
        })
        .returning();
      
      if (inserted) {
        insertedIds.push(inserted.id);
      }
    }
    
    return insertedIds;
  }, `recordKnowledgeTransfer(${fromGod}→${toGods.length} gods)`);
  
  if (result && result.length > 0) {
    console.log(`[Pantheon] Knowledge transfer: ${fromGod} → ${toGods.join(", ")} (${knowledgeType})`);
  }
  
  return result;
}

/**
 * Get recent knowledge transfers for a specific god
 * Can filter by god name (sender or receiver) and/or knowledge type
 * 
 * @param godName - Filter transfers involving this god (as sender or receiver)
 * @param knowledgeType - Optional filter by knowledge type
 * @param limit - Max records to return (default 50)
 * @returns Array of transfer records, ordered by most recent first
 */
export async function getRecentTransfers(
  godName?: string,
  knowledgeType?: string,
  limit: number = 50
): Promise<TransferRecord[]> {
  if (!db) return [];
  
  const result = await withDbRetry(async () => {
    let query = db!.select().from(pantheonKnowledgeTransfers);
    
    // Build conditions
    const conditions = [];
    
    if (godName) {
      // Match if god is sender OR receiver
      conditions.push(
        or(
          eq(pantheonKnowledgeTransfers.fromGod, godName),
          eq(pantheonKnowledgeTransfers.toGod, godName)
        )
      );
    }
    
    if (knowledgeType) {
      conditions.push(eq(pantheonKnowledgeTransfers.knowledgeType, knowledgeType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return query
      .orderBy(desc(pantheonKnowledgeTransfers.createdAt))
      .limit(limit);
  }, `getRecentTransfers(${godName ?? "all"}, ${knowledgeType ?? "all"})`);
  
  return (result ?? []) as TransferRecord[];
}

/**
 * Mark a knowledge transfer as accepted by the receiving god
 * Used for consensus tracking
 * 
 * @param transferId - The transfer record ID
 * @param accepted - Whether the knowledge was accepted
 */
export async function markTransferAccepted(
  transferId: number,
  accepted: boolean = true
): Promise<boolean> {
  if (!db) return false;
  
  const result = await withDbRetry(async () => {
    const [updated] = await db!
      .update(pantheonKnowledgeTransfers)
      .set({ accepted })
      .where(eq(pantheonKnowledgeTransfers.id, transferId))
      .returning();
    
    return !!updated;
  }, `markTransferAccepted(${transferId})`);
  
  return result ?? false;
}

/**
 * Compute consensus across gods for a given knowledge type
 * Calculates how many gods have accepted vs total transfers
 * 
 * @param knowledgeType - The type of knowledge to check consensus for
 * @param sourceGod - Optional: only count transfers from this source
 * @returns Consensus statistics including percentage and accepting gods
 */
export async function computeConsensus(
  knowledgeType: string,
  sourceGod?: string
): Promise<ConsensusResult | null> {
  if (!db) return null;
  
  const result = await withDbRetry(async () => {
    // Build conditions
    const conditions = [eq(pantheonKnowledgeTransfers.knowledgeType, knowledgeType)];
    
    if (sourceGod) {
      conditions.push(eq(pantheonKnowledgeTransfers.fromGod, sourceGod));
    }
    
    // Get all transfers of this type
    const transfers = await db!
      .select()
      .from(pantheonKnowledgeTransfers)
      .where(and(...conditions));
    
    if (transfers.length === 0) {
      return {
        knowledgeType,
        totalTransfers: 0,
        acceptedCount: 0,
        consensusPercentage: 0,
        gods: [],
      };
    }
    
    // Count accepted transfers and unique accepting gods
    const acceptedTransfers = transfers.filter(t => t.accepted);
    const acceptingGods = [...new Set(acceptedTransfers.map(t => t.toGod))];
    
    return {
      knowledgeType,
      totalTransfers: transfers.length,
      acceptedCount: acceptedTransfers.length,
      consensusPercentage: transfers.length > 0 
        ? (acceptedTransfers.length / transfers.length) * 100 
        : 0,
      gods: acceptingGods,
    };
  }, `computeConsensus(${knowledgeType})`);
  
  return result;
}

/**
 * Get transfers that a specific god needs to review (pending acceptance)
 * 
 * @param godName - The god who needs to review
 * @param limit - Max records to return
 */
export async function getPendingReviews(
  godName: string,
  limit: number = 20
): Promise<TransferRecord[]> {
  if (!db) return [];
  
  const result = await withDbRetry(async () => {
    return db!
      .select()
      .from(pantheonKnowledgeTransfers)
      .where(
        and(
          eq(pantheonKnowledgeTransfers.toGod, godName),
          eq(pantheonKnowledgeTransfers.accepted, false)
        )
      )
      .orderBy(desc(pantheonKnowledgeTransfers.createdAt))
      .limit(limit);
  }, `getPendingReviews(${godName})`);
  
  return (result ?? []) as TransferRecord[];
}

// ============================================================================
// INTEGRATION HELPERS - For use by ocean-agent and other services
// ============================================================================

/**
 * Share Zeus's discovery with the entire pantheon
 * Called when Zeus discovers a high-Φ pattern or regime insight
 * 
 * @param discovery - The discovery payload
 * @param knowledgeType - Type of discovery
 */
export async function shareZeusDiscovery(
  discovery: KnowledgePayload,
  knowledgeType: KnowledgeType = "high_phi_pattern"
): Promise<number[] | null> {
  // Share with all Olympians except Zeus himself
  const recipients = OLYMPIAN_GODS.filter(g => g !== "Zeus") as string[];
  
  return recordKnowledgeTransfer(
    "Zeus",
    recipients,
    knowledgeType,
    discovery,
    discovery.consensusScore
  );
}

/**
 * Broadcast knowledge to all gods (for system-wide announcements)
 * 
 * @param fromGod - Source god
 * @param payload - Knowledge payload
 * @param knowledgeType - Type of knowledge
 */
export async function broadcastToAllGods(
  fromGod: string,
  payload: KnowledgePayload,
  knowledgeType: KnowledgeType
): Promise<number[] | null> {
  const recipients = OLYMPIAN_GODS.filter(g => g !== fromGod) as string[];
  
  return recordKnowledgeTransfer(fromGod, recipients, knowledgeType, payload);
}

/**
 * Get knowledge statistics for a god
 * 
 * @param godName - The god to get stats for
 */
export async function getGodKnowledgeStats(godName: string): Promise<{
  sent: number;
  received: number;
  accepted: number;
  pendingReview: number;
} | null> {
  if (!db) return null;
  
  const result = await withDbRetry(async () => {
    const [sentCount] = await db!
      .select({ count: sql<number>`count(*)` })
      .from(pantheonKnowledgeTransfers)
      .where(eq(pantheonKnowledgeTransfers.fromGod, godName));
    
    const [receivedCount] = await db!
      .select({ count: sql<number>`count(*)` })
      .from(pantheonKnowledgeTransfers)
      .where(eq(pantheonKnowledgeTransfers.toGod, godName));
    
    const [acceptedCount] = await db!
      .select({ count: sql<number>`count(*)` })
      .from(pantheonKnowledgeTransfers)
      .where(
        and(
          eq(pantheonKnowledgeTransfers.toGod, godName),
          eq(pantheonKnowledgeTransfers.accepted, true)
        )
      );
    
    const [pendingCount] = await db!
      .select({ count: sql<number>`count(*)` })
      .from(pantheonKnowledgeTransfers)
      .where(
        and(
          eq(pantheonKnowledgeTransfers.toGod, godName),
          eq(pantheonKnowledgeTransfers.accepted, false)
        )
      );
    
    return {
      sent: Number(sentCount?.count ?? 0),
      received: Number(receivedCount?.count ?? 0),
      accepted: Number(acceptedCount?.count ?? 0),
      pendingReview: Number(pendingCount?.count ?? 0),
    };
  }, `getGodKnowledgeStats(${godName})`);
  
  return result;
}

// Export types for use by other modules
export type { PantheonKnowledgeTransfer };
