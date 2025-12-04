/**
 * Observer Archaeology System API Routes
 * 
 * Namespaced under /api/observer/ to separate from legacy brain wallet endpoints
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { 
  fetchBlockByHeight, 
  scanEarlyEraBlocks, 
  parseBlock,
  computeKappaRecovery 
} from "./blockchain-scanner";
import { observerStorage } from "./observer-storage";

const router = Router();

// ============================================================================
// SCAN STATE MANAGER - Tracks blockchain scanning progress
// ============================================================================
interface ScanState {
  isScanning: boolean;
  scanId: string | null;
  startHeight: number;
  endHeight: number;
  currentHeight: number;
  totalBlocks: number;
  startTime: number | null;
  addressesFound: number;
  dormantAddresses: number;
  error: string | null;
}

const scanState: ScanState = {
  isScanning: false,
  scanId: null,
  startHeight: 0,
  endHeight: 0,
  currentHeight: 0,
  totalBlocks: 0,
  startTime: null,
  addressesFound: 0,
  dormantAddresses: 0,
  error: null,
};

function updateScanProgress(height: number, total: number, addressesFound = 0, dormantAddresses = 0) {
  scanState.currentHeight = height;
  scanState.totalBlocks = total;
  scanState.addressesFound += addressesFound;
  scanState.dormantAddresses += dormantAddresses;
}

function completeScan(error?: string) {
  scanState.isScanning = false;
  scanState.error = error || null;
  if (!error) {
    console.log(`[ScanManager] Scan ${scanState.scanId} completed successfully`);
  }
}

// ============================================================================
// BLOCKCHAIN SCANNING
// ============================================================================

/**
 * POST /api/observer/scan/start
 * Start blockchain scanning for early era blocks (2009-2011)
 */
router.post("/scan/start", async (req: Request, res: Response) => {
  try {
    // Check if already scanning
    if (scanState.isScanning) {
      return res.status(409).json({
        error: "A scan is already in progress",
        scanId: scanState.scanId,
        currentHeight: scanState.currentHeight,
        totalBlocks: scanState.totalBlocks,
      });
    }

    const schema = z.object({
      startHeight: z.number().min(0).default(0),
      endHeight: z.number().min(1).default(1000),
    });
    
    const { startHeight, endHeight } = schema.parse(req.body);
    
    // Validate range
    if (endHeight <= startHeight) {
      return res.status(400).json({
        error: "endHeight must be greater than startHeight",
      });
    }

    // Initialize scan state
    const scanId = randomUUID();
    scanState.isScanning = true;
    scanState.scanId = scanId;
    scanState.startHeight = startHeight;
    scanState.endHeight = endHeight;
    scanState.currentHeight = startHeight;
    scanState.totalBlocks = endHeight - startHeight;
    scanState.startTime = Date.now();
    scanState.addressesFound = 0;
    scanState.dormantAddresses = 0;
    scanState.error = null;
    
    // Start scanning (async, don't await)
    scanEarlyEraBlocks(startHeight, endHeight, (height, total) => {
      updateScanProgress(height, total);
      console.log(`[ObserverAPI] Scanning progress: ${height}/${total}`);
    }).then(() => {
      console.log(`[ObserverAPI] Scan complete: ${startHeight}-${endHeight}`);
      completeScan();
    }).catch(error => {
      console.error(`[ObserverAPI] Scan error:`, error);
      completeScan(error.message);
    });
    
    res.json({
      status: "started",
      scanId,
      startHeight,
      endHeight,
      totalBlocks: endHeight - startHeight,
      message: `Scanning blocks ${startHeight} to ${endHeight}`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/observer/scan/status
 * Get current scanning status with progress details
 */
router.get("/scan/status", async (req: Request, res: Response) => {
  const elapsed = scanState.startTime ? Date.now() - scanState.startTime : 0;
  const progress = scanState.totalBlocks > 0 
    ? Math.round((scanState.currentHeight - scanState.startHeight) / scanState.totalBlocks * 100) 
    : 0;
  
  const blocksScanned = scanState.currentHeight - scanState.startHeight;
  const blocksPerSecond = elapsed > 1000 ? blocksScanned / (elapsed / 1000) : 0;
  const remainingBlocks = scanState.totalBlocks - blocksScanned;
  const estimatedTimeRemaining = blocksPerSecond > 0 ? Math.round(remainingBlocks / blocksPerSecond) : null;

  res.json({
    isScanning: scanState.isScanning,
    scanId: scanState.scanId,
    startHeight: scanState.startHeight,
    endHeight: scanState.endHeight,
    currentHeight: scanState.currentHeight,
    totalBlocks: scanState.totalBlocks,
    blocksScanned,
    progress,
    addressesFound: scanState.addressesFound,
    dormantAddresses: scanState.dormantAddresses,
    elapsedMs: elapsed,
    blocksPerSecond: Math.round(blocksPerSecond * 100) / 100,
    estimatedTimeRemaining,
    error: scanState.error,
    message: scanState.isScanning 
      ? `Scanning block ${scanState.currentHeight} of ${scanState.endHeight}` 
      : scanState.error 
        ? `Scan failed: ${scanState.error}`
        : scanState.scanId 
          ? "Scan complete" 
          : "No active scan",
  });
});

// ============================================================================
// BLOCK & TRANSACTION DATA
// ============================================================================

/**
 * GET /api/observer/blocks/:height
 * Get block data with geometric features
 */
router.get("/blocks/:height", async (req: Request, res: Response) => {
  try {
    const height = parseInt(req.params.height, 10);
    
    if (isNaN(height) || height < 0) {
      return res.status(400).json({ error: "Invalid block height" });
    }
    
    const blockData = await fetchBlockByHeight(height);
    
    if (!blockData) {
      return res.status(404).json({ error: "Block not found" });
    }
    
    const block = parseBlock(blockData);
    
    res.json({
      block,
      raw: blockData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DORMANT ADDRESS CATALOG
// ============================================================================

/**
 * GET /api/observer/addresses/dormant
 * Get catalog of dormant addresses with filters
 * Query params:
 *  - minBalance: minimum balance in satoshis (optional)
 *  - minInactivityDays: minimum days of inactivity (optional)
 *  - isEarlyEra: filter for 2009-2011 addresses (optional)
 *  - isCoinbaseReward: filter for coinbase rewards (optional)
 *  - limit: max results (default 100, max 1000)
 *  - offset: pagination offset (default 0)
 */
router.get("/addresses/dormant", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      minBalance: z.coerce.number().optional(),
      minInactivityDays: z.coerce.number().min(0).optional(),
      isEarlyEra: z.coerce.boolean().optional(),
      isCoinbaseReward: z.coerce.boolean().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    let filters;
    try {
      filters = schema.parse(req.query);
    } catch (zodError: any) {
      // Return 400 for validation errors (not 500)
      return res.status(400).json({ 
        error: "Invalid query parameters",
        details: zodError.errors || zodError.message,
      });
    }
    
    // Enforce default inactivity threshold if not provided (365 days = ~52,000 blocks)
    // This ensures we only return genuinely dormant addresses
    const minInactivityDays = filters.minInactivityDays !== undefined 
      ? filters.minInactivityDays 
      : 365; // Default: 1 year of inactivity
    
    // Query dormant addresses from database
    // Storage layer guarantees isDormant=true via SQL constraint
    const addresses = await observerStorage.getDormantAddresses({
      minBalance: filters.minBalance,
      minInactivityDays,
      limit: filters.limit,
      offset: filters.offset,
    });
    
    // Apply additional filters (isEarlyEra, isCoinbaseReward) in-memory
    // (These could be moved to SQL for better performance in Phase 2)
    let filteredAddresses = addresses;
    
    if (filters.isEarlyEra !== undefined) {
      filteredAddresses = filteredAddresses.filter(addr => 
        addr.isEarlyEra === filters.isEarlyEra
      );
    }
    
    if (filters.isCoinbaseReward !== undefined) {
      filteredAddresses = filteredAddresses.filter(addr => 
        addr.isCoinbaseReward === filters.isCoinbaseReward
      );
    }
    
    // Convert BigInt fields to strings for JSON serialization
    // Also add frontend-expected field aliases for UI compatibility
    const serializedAddresses = filteredAddresses.map(addr => {
      const firstSeenIso = addr.firstSeenTimestamp.toISOString();
      const lastSeenIso = addr.lastActivityTimestamp.toISOString();
      
      // Calculate dormancy years from last activity
      const lastActivityDate = new Date(addr.lastActivityTimestamp);
      const now = new Date();
      const dormancyMs = now.getTime() - lastActivityDate.getTime();
      const dormancyYears = dormancyMs / (1000 * 60 * 60 * 24 * 365.25);
      
      // Convert satoshis to BTC for display
      const balanceSats = BigInt(addr.currentBalance);
      const balanceBtc = Number(balanceSats) / 100000000;
      
      return {
        ...addr,
        // Original fields (keep for API compatibility)
        currentBalance: addr.currentBalance.toString(),
        firstSeenTimestamp: firstSeenIso,
        lastActivityTimestamp: lastSeenIso,
        createdAt: addr.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: addr.updatedAt?.toISOString() || new Date().toISOString(),
        // Frontend-expected aliases
        balance: balanceBtc.toFixed(8),
        firstSeenAt: firstSeenIso,
        lastSeenAt: lastSeenIso,
        dormancyYears: dormancyYears,
      };
    });
    
    res.json({
      addresses: serializedAddresses,
      total: filteredAddresses.length,
      filters: {
        ...filters,
        minInactivityDays, // Show actual threshold used
      },
      message: serializedAddresses.length === 0 
        ? "No dormant addresses found. Run /api/observer/scan/start to populate the catalog."
        : `Found ${serializedAddresses.length} dormant address(es)`,
    });
  } catch (error: any) {
    // Only unexpected errors (not validation) should return 500
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/addresses/:address
 * Get detailed geometric signature for a specific address
 */
router.get("/addresses/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Validate Bitcoin address format (basic check)
    if (address.length < 26 || address.length > 35) {
      return res.status(400).json({ error: "Invalid Bitcoin address format" });
    }
    
    // Query database for address details
    const addressData = await observerStorage.getAddress(address);
    
    if (!addressData) {
      return res.status(404).json({ 
        error: "Address not found",
        message: "This address has not been cataloged yet. It may not exist in the scanned block range, or scanning has not been performed.",
      });
    }
    
    // Compute κ_recovery for this address
    const recovery = computeKappaRecovery(addressData);
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedAddress = {
      ...addressData,
      currentBalance: addressData.currentBalance.toString(),
      createdAt: addressData.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: addressData.updatedAt?.toISOString() || new Date().toISOString(),
      firstSeenTimestamp: addressData.firstSeenTimestamp.toISOString(),
      lastActivityTimestamp: addressData.lastActivityTimestamp.toISOString(),
      recovery,
    };
    
    res.json({
      address: serializedAddress,
      message: "Address details retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ERA MANIFOLD: Entities and Artifacts
// ============================================================================

/**
 * POST /api/observer/entities
 * Create or update an entity (person, organization, miner, developer)
 * Implements entity resolution: If entity with same identity exists, update it instead of creating duplicate
 */
router.post("/entities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(255),
      type: z.enum(['person', 'organization', 'miner', 'developer']),
      aliases: z.array(z.string()).optional(),
      knownAddresses: z.array(z.string()).optional(),
      bitcoinTalkUsername: z.string().max(100).optional(),
      githubUsername: z.string().max(100).optional(),
      emailAddresses: z.array(z.string()).optional(),
      firstActivityDate: z.coerce.date().optional(),
      lastActivityDate: z.coerce.date().optional(),
      isDeceased: z.boolean().optional(),
      estateContact: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional(),
    });
    
    let entityData;
    try {
      entityData = schema.parse(req.body);
    } catch (zodError: any) {
      return res.status(400).json({ 
        error: "Invalid entity data",
        details: zodError.errors || zodError.message,
      });
    }
    
    // ENTITY RESOLUTION: Check if entity already exists with same identity
    // Check all provided identity fields (usernames and ALL emails)
    let existingEntity = null;
    
    // First try username-based matching
    if (entityData.bitcoinTalkUsername || entityData.githubUsername) {
      existingEntity = await observerStorage.findEntityByIdentity({
        bitcoinTalkUsername: entityData.bitcoinTalkUsername,
        githubUsername: entityData.githubUsername,
      });
    }
    
    // If no match yet, try email-based matching (check ALL emails)
    if (!existingEntity && entityData.emailAddresses && entityData.emailAddresses.length > 0) {
      for (const email of entityData.emailAddresses) {
        existingEntity = await observerStorage.findEntityByIdentity({ email });
        if (existingEntity) break; // Found a match, stop searching
      }
    }
    
    if (existingEntity) {
      // UPDATE existing entity: Merge new data with existing
      const updates: Partial<any> = {};
      
      // Update name if provided and different
      if (entityData.name && entityData.name !== existingEntity.name) {
        updates.name = entityData.name;
      }
      
      // Merge aliases (deduplicate)
      if (entityData.aliases) {
        const mergedAliases = Array.from(new Set([
          ...(existingEntity.aliases || []),
          ...entityData.aliases
        ]));
        updates.aliases = mergedAliases;
      }
      
      // Merge knownAddresses (deduplicate)
      if (entityData.knownAddresses) {
        const mergedAddresses = Array.from(new Set([
          ...(existingEntity.knownAddresses || []),
          ...entityData.knownAddresses
        ]));
        updates.knownAddresses = mergedAddresses;
      }
      
      // Merge emailAddresses (deduplicate)
      if (entityData.emailAddresses) {
        const mergedEmails = Array.from(new Set([
          ...(existingEntity.emailAddresses || []),
          ...entityData.emailAddresses
        ]));
        updates.emailAddresses = mergedEmails;
      }
      
      // Update usernames if not already set
      if (entityData.bitcoinTalkUsername && !existingEntity.bitcoinTalkUsername) {
        updates.bitcoinTalkUsername = entityData.bitcoinTalkUsername;
      }
      
      if (entityData.githubUsername && !existingEntity.githubUsername) {
        updates.githubUsername = entityData.githubUsername;
      }
      
      // Update temporal data (use earliest firstActivityDate, latest lastActivityDate)
      if (entityData.firstActivityDate) {
        updates.firstActivityDate = existingEntity.firstActivityDate
          ? (entityData.firstActivityDate < existingEntity.firstActivityDate ? entityData.firstActivityDate : existingEntity.firstActivityDate)
          : entityData.firstActivityDate;
      }
      
      if (entityData.lastActivityDate) {
        updates.lastActivityDate = existingEntity.lastActivityDate
          ? (entityData.lastActivityDate > existingEntity.lastActivityDate ? entityData.lastActivityDate : existingEntity.lastActivityDate)
          : entityData.lastActivityDate;
      }
      
      // Update estate information
      if (entityData.isDeceased !== undefined) {
        updates.isDeceased = entityData.isDeceased;
      }
      
      if (entityData.estateContact) {
        updates.estateContact = entityData.estateContact;
      }
      
      // Merge metadata
      if (entityData.metadata) {
        updates.metadata = {
          ...(existingEntity.metadata as any || {}),
          ...entityData.metadata,
        };
      }
      
      // Perform update
      await observerStorage.updateEntity(existingEntity.id, updates);
      
      // Fetch updated entity
      const updatedEntity = await observerStorage.getEntity(existingEntity.id);
      
      return res.status(200).json({
        entity: updatedEntity,
        message: `Entity '${updatedEntity?.name}' updated successfully (matched by identity)`,
        action: 'updated',
      });
    }
    
    // CREATE new entity: No matching identity found
    const savedEntity = await observerStorage.saveEntity({
      id: undefined as any, // Let database generate UUID
      name: entityData.name,
      type: entityData.type,
      aliases: entityData.aliases || null,
      knownAddresses: entityData.knownAddresses || null,
      bitcoinTalkUsername: entityData.bitcoinTalkUsername || null,
      githubUsername: entityData.githubUsername || null,
      emailAddresses: entityData.emailAddresses || null,
      firstActivityDate: entityData.firstActivityDate || null,
      lastActivityDate: entityData.lastActivityDate || null,
      isDeceased: entityData.isDeceased || false,
      estateContact: entityData.estateContact || null,
      metadata: entityData.metadata || null,
    });
    
    res.status(201).json({
      entity: savedEntity,
      message: `Entity '${savedEntity.name}' created successfully`,
      action: 'created',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/entities
 * Query entities with advanced search and filtering
 * Supports: name search, type filter, username/email/alias lookup
 */
router.get("/entities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      type: z.enum(['person', 'organization', 'miner', 'developer']).optional(),
      bitcoinTalkUsername: z.string().optional(),
      githubUsername: z.string().optional(),
      email: z.string().optional(),
      alias: z.string().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    let filters;
    try {
      filters = schema.parse(req.query);
    } catch (zodError: any) {
      return res.status(400).json({ 
        error: "Invalid query parameters",
        details: zodError.errors || zodError.message,
      });
    }
    
    // Query entities from database using advanced search
    const entities = await observerStorage.searchEntities({
      name: filters.name,
      type: filters.type,
      bitcoinTalkUsername: filters.bitcoinTalkUsername,
      githubUsername: filters.githubUsername,
      email: filters.email,
      alias: filters.alias,
      limit: filters.limit,
      offset: filters.offset,
    });
    
    res.json({
      entities,
      total: entities.length,
      filters,
      message: entities.length === 0 
        ? "No entities found. Create entities via POST /api/observer/entities or adjust your search filters."
        : `Found ${entities.length} entit${entities.length === 1 ? 'y' : 'ies'}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/entities/:id
 * Get a specific entity by ID
 */
router.get("/entities/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entity = await observerStorage.getEntity(id);
    
    if (!entity) {
      return res.status(404).json({ 
        error: "Entity not found",
        message: `No entity with ID '${id}' exists in the database.`,
      });
    }
    
    res.json({
      entity,
      message: "Entity retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/artifacts
 * Ingest a historical artifact (forum post, mailing list entry, code commit)
 * Validates source and entity existence. Attempts entity auto-linking via author lookup.
 */
router.post("/artifacts", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      type: z.enum(['forum_post', 'mailing_list', 'code_commit', 'news']),
      source: z.enum(['bitcointalk', 'cryptography_ml', 'github', 'sourceforge', 'bitcoin_ml', 'other']),
      title: z.string().max(500).optional(),
      content: z.string().optional(),
      author: z.string().max(255).optional(),
      timestamp: z.coerce.date().optional(),
      entityId: z.string().optional(),
      relatedAddresses: z.array(z.string()).optional(),
      url: z.string().max(1000).optional(),
      metadata: z.record(z.any()).optional(),
    });
    
    let artifactData;
    try {
      artifactData = schema.parse(req.body);
    } catch (zodError: any) {
      return res.status(400).json({ 
        error: "Invalid artifact data",
        details: zodError.errors || zodError.message,
      });
    }
    
    // VALIDATION: If entityId provided, verify entity exists
    if (artifactData.entityId) {
      const entity = await observerStorage.getEntity(artifactData.entityId);
      if (!entity) {
        return res.status(400).json({ 
          error: "Entity not found",
          message: `No entity with ID '${artifactData.entityId}' exists. Create the entity first via POST /api/observer/entities.`,
        });
      }
    }
    
    // ENTITY AUTO-LINKING: If no entityId but author provided, try to find entity
    let linkedEntityId = artifactData.entityId;
    let autoLinked = false;
    
    if (!linkedEntityId && artifactData.author) {
      // Try to find entity based on source-specific username
      const identity: any = {};
      
      if (artifactData.source === 'bitcointalk') {
        identity.bitcoinTalkUsername = artifactData.author;
      } else if (artifactData.source === 'github' || artifactData.source === 'sourceforge') {
        identity.githubUsername = artifactData.author;
      }
      
      if (Object.keys(identity).length > 0) {
        const matchedEntity = await observerStorage.findEntityByIdentity(identity);
        if (matchedEntity) {
          linkedEntityId = matchedEntity.id;
          autoLinked = true;
        }
      }
    }
    
    // Save artifact to database
    const savedArtifact = await observerStorage.saveArtifact({
      id: undefined as any, // Let database generate UUID
      type: artifactData.type,
      source: artifactData.source,
      title: artifactData.title || null,
      content: artifactData.content || null,
      author: artifactData.author || null,
      timestamp: artifactData.timestamp || null,
      entityId: linkedEntityId || null,
      relatedAddresses: artifactData.relatedAddresses || null,
      url: artifactData.url || null,
      metadata: artifactData.metadata || null,
    });
    
    res.status(201).json({
      artifact: savedArtifact,
      message: `Artifact '${savedArtifact.type}' from '${savedArtifact.source}' ingested successfully${autoLinked ? ' (auto-linked to entity)' : ''}`,
      autoLinked,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/artifacts
 * Query artifacts (optionally filter by entityId or source)
 */
router.get("/artifacts", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      entityId: z.string().optional(),
      source: z.string().optional(),
      type: z.enum(['forum_post', 'mailing_list', 'code_commit', 'news']).optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    let filters;
    try {
      filters = schema.parse(req.query);
    } catch (zodError: any) {
      return res.status(400).json({ 
        error: "Invalid query parameters",
        details: zodError.errors || zodError.message,
      });
    }
    
    // Query artifacts from database
    const artifacts = await observerStorage.getArtifacts({
      entityId: filters.entityId,
      source: filters.source,
    });
    
    // Apply type filter in-memory (can be moved to SQL)
    let filteredArtifacts = artifacts;
    if (filters.type) {
      filteredArtifacts = filteredArtifacts.filter(a => a.type === filters.type);
    }
    
    // Apply pagination
    const paginatedArtifacts = filteredArtifacts.slice(filters.offset, filters.offset + filters.limit);
    
    res.json({
      artifacts: paginatedArtifacts,
      total: filteredArtifacts.length,
      filters,
      message: paginatedArtifacts.length === 0 
        ? "No artifacts found. Ingest artifacts via POST /api/observer/artifacts."
        : `Found ${paginatedArtifacts.length} artifact${paginatedArtifacts.length === 1 ? '' : 's'}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RECOVERY PRIORITIES (κ_recovery)
// ============================================================================

/**
 * GET /api/observer/priorities
 * Get κ_recovery rankings for dormant addresses
 */
router.get("/priorities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tier: z.enum(["high", "medium", "low", "unrecoverable"]).optional(),
      minKappa: z.coerce.number().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    const priorities = await observerStorage.getRecoveryPriorities({
      minKappa: filters.minKappa,
      limit: filters.limit,
      offset: filters.offset,
    });
    
    res.json({
      priorities,
      total: priorities.length,
      filters,
      message: priorities.length === 0 
        ? "No recovery priorities found. Run scanning and constraint solver first."
        : `Found ${priorities.length} priorit${priorities.length === 1 ? 'y' : 'ies'}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Priorities error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/observer/priorities/:address
 * Get κ_recovery details for a specific address
 */
router.get("/priorities/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const priority = await observerStorage.getRecoveryPriority(address);
    
    if (!priority) {
      return res.status(404).json({
        error: "Priority not found",
        address,
        message: "No recovery priority computed for this address. Run the constraint solver first.",
      });
    }
    
    res.json({
      priority,
      message: "Recovery priority retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RECOVERY WORKFLOWS
// ============================================================================

/**
 * GET /api/observer/workflows
 * Get active recovery workflows
 */
router.get("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      vector: z.enum(["estate", "constrained_search", "social", "temporal"]).optional(),
      status: z.enum(["pending", "active", "paused", "completed", "failed"]).optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    const workflows = await observerStorage.getRecoveryWorkflows({
      vector: filters.vector,
      status: filters.status,
    });
    
    const paginatedWorkflows = workflows.slice(filters.offset, filters.offset + filters.limit);
    
    res.json({
      workflows: paginatedWorkflows,
      total: workflows.length,
      filters,
      message: paginatedWorkflows.length === 0 
        ? "No recovery workflows found."
        : `Found ${paginatedWorkflows.length} workflow${paginatedWorkflows.length === 1 ? '' : 's'}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Workflows error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/observer/workflows
 * Create a new recovery workflow
 */
router.post("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      address: z.string().min(26).max(35),
      vector: z.enum(["estate", "constrained_search", "social", "temporal"]),
      priority: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    
    const workflow = await observerStorage.saveRecoveryWorkflow({
      id: randomUUID(),
      address: data.address,
      vector: data.vector,
      status: "pending",
      priorityId: data.priority || "",
      progress: null,
      results: null,
      startedAt: null,
      completedAt: null,
      notes: null,
    });
    
    res.json({
      workflow,
      message: "Workflow created successfully",
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Workflow creation error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/observer/workflows/:id
 * Get workflow details
 */
router.get("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        id,
        message: "No workflow found with this ID.",
      });
    }
    
    res.json({
      workflow,
      message: "Workflow retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENTITY & ARTIFACT DATA
// ============================================================================

/**
 * GET /api/observer/entities
 * Get known entities from Era Manifold
 */
router.get("/entities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      type: z.enum(["person", "organization", "miner", "developer"]).optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    const entities = await observerStorage.getEntities(filters.type);
    
    const paginatedEntities = entities.slice(filters.offset, filters.offset + filters.limit);
    
    res.json({
      entities: paginatedEntities,
      total: entities.length,
      filters,
      message: paginatedEntities.length === 0 
        ? "No entities found. Ingest entity data via POST /api/observer/entities."
        : `Found ${paginatedEntities.length} entit${paginatedEntities.length === 1 ? 'y' : 'ies'}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Entities error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/observer/artifacts
 * Get historical artifacts (forum posts, mailing lists, code commits)
 */
router.get("/artifacts", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      type: z.enum(["forum_post", "mailing_list", "code_commit", "news"]).optional(),
      source: z.string().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    const artifacts = await observerStorage.getArtifacts({ source: filters.source });
    
    const paginatedArtifacts = artifacts.slice(filters.offset, filters.offset + filters.limit);
    
    res.json({
      artifacts: paginatedArtifacts,
      total: artifacts.length,
      filters,
      message: paginatedArtifacts.length === 0 
        ? "No artifacts found. Ingest artifact data via POST /api/observer/artifacts."
        : `Found ${paginatedArtifacts.length} artifact${paginatedArtifacts.length === 1 ? '' : 's'}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Artifacts error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// κ_RECOVERY COMPUTATION
// ============================================================================

/**
 * POST /api/observer/recovery/compute
 * Compute κ_recovery rankings for all dormant addresses
 */
router.post("/recovery/compute", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      btcPriceUSD: z.number().min(0).default(100000),
      minBalance: z.number().min(0).default(0), // Minimum balance in satoshis
      limit: z.number().min(1).max(10000).default(1000), // Max addresses to process
    });
    
    const { btcPriceUSD, minBalance, limit } = schema.parse(req.body);
    
    // Import constraint solver
    const { rankRecoveryPriorities } = await import("./kappa-recovery-solver");
    
    // Get dormant addresses
    const dormantAddresses = await observerStorage.getDormantAddresses({
      minBalance: minBalance,
      limit,
    });
    
    if (dormantAddresses.length === 0) {
      return res.json({
        message: "No dormant addresses found. Run blockchain scan first.",
        computed: 0,
      });
    }
    
    // Build maps of entities and artifacts by address
    const entitiesByAddress = new Map();
    const artifactsByAddress = new Map();
    
    for (const address of dormantAddresses) {
      const entities = await observerStorage.getEntitiesByAddress(address.address);
      const artifacts = await observerStorage.getArtifactsByAddress(address.address);
      
      entitiesByAddress.set(address.address, entities);
      artifactsByAddress.set(address.address, artifacts);
    }
    
    // Compute κ_recovery rankings
    const rankedResults = rankRecoveryPriorities(
      dormantAddresses,
      entitiesByAddress,
      artifactsByAddress,
      btcPriceUSD
    );
    
    // Save to database
    let savedCount = 0;
    for (const result of rankedResults) {
      // Check if priority already exists
      const existing = await observerStorage.getRecoveryPriority(result.address);
      
      if (existing) {
        // Update existing priority
        await observerStorage.updateRecoveryPriority(existing.id, {
          kappaRecovery: result.kappa,
          phiConstraints: result.phi,
          hCreation: result.h,
          rank: result.rank,
          tier: result.tier,
          recommendedVector: result.recommendedVector,
          constraints: result.constraints as any,
          estimatedValueUSD: result.estimatedValueUSD.toString(),
        });
      } else {
        // Create new priority
        await observerStorage.saveRecoveryPriority({
          id: undefined as any, // Will be auto-generated
          address: result.address,
          kappaRecovery: result.kappa,
          phiConstraints: result.phi,
          hCreation: result.h,
          rank: result.rank,
          tier: result.tier,
          recommendedVector: result.recommendedVector,
          constraints: result.constraints as any,
          estimatedValueUSD: result.estimatedValueUSD.toString(),
          recoveryStatus: 'pending',
        });
      }
      savedCount++;
    }
    
    res.json({
      message: `Successfully computed κ_recovery for ${savedCount} dormant addresses`,
      computed: savedCount,
      btcPriceUSD,
      summary: {
        high: rankedResults.filter(r => r.tier === 'high').length,
        medium: rankedResults.filter(r => r.tier === 'medium').length,
        low: rankedResults.filter(r => r.tier === 'low').length,
        unrecoverable: rankedResults.filter(r => r.tier === 'unrecoverable').length,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] κ_recovery computation error:", error);
    res.status(500).json({ 
      error: "Failed to compute κ_recovery rankings",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/recovery/priorities
 * Get ranked recovery priorities
 */
router.get("/recovery/priorities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tier: z.enum(['high', 'medium', 'low', 'unrecoverable']).optional(),
      status: z.string().optional(),
      minKappa: z.number().optional(),
      maxKappa: z.number().optional(),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    // Query recovery priorities
    const priorities = await observerStorage.getRecoveryPriorities({
      status: filters.status,
      minKappa: filters.minKappa,
      maxKappa: filters.maxKappa,
      limit: filters.limit,
      offset: filters.offset,
    });
    
    // Filter by tier if provided (not in DB query)
    let filteredPriorities = priorities;
    if (filters.tier) {
      filteredPriorities = priorities.filter(p => p.tier === filters.tier);
    }
    
    res.json({
      priorities: filteredPriorities,
      total: filteredPriorities.length,
      filters,
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: "Invalid query parameters",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/recovery/priorities/:address
 * Get recovery priority for specific address
 */
router.get("/recovery/priorities/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Validate Bitcoin address format
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
      return res.status(400).json({
        error: "Invalid Bitcoin address format",
      });
    }
    
    const priority = await observerStorage.getRecoveryPriority(address);
    
    if (!priority) {
      return res.status(404).json({
        error: "Recovery priority not found",
        message: `No recovery priority computed for address '${address}'. Run POST /api/observer/recovery/compute first.`,
      });
    }
    
    // Get linked entities and artifacts for context
    const entities = await observerStorage.getEntitiesByAddress(address);
    const artifacts = await observerStorage.getArtifactsByAddress(address);
    
    res.json({
      priority,
      context: {
        linkedEntities: entities.length,
        linkedArtifacts: artifacts.length,
        entities: entities.map(e => ({
          id: e.id,
          name: e.name,
          type: e.type,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to retrieve recovery priority",
      details: error.message,
    });
  }
});

// ============================================================================
// RECOVERY WORKFLOW ORCHESTRATION
// ============================================================================

/**
 * POST /api/observer/workflows
 * Start a recovery workflow for an address
 */
router.post("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      address: z.string().regex(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/),
      vector: z.enum(['estate', 'constrained_search', 'social', 'temporal']),
    });
    
    const { address, vector } = schema.parse(req.body);
    
    // Get recovery priority
    const priority = await observerStorage.getRecoveryPriority(address);
    if (!priority) {
      return res.status(404).json({
        error: "Recovery priority not found",
        message: `No κ_recovery computed for address '${address}'. Run POST /api/observer/recovery/compute first.`,
      });
    }
    
    // Get entities and artifacts
    const entities = await observerStorage.getEntitiesByAddress(address);
    const artifacts = await observerStorage.getArtifactsByAddress(address);
    
    // Import orchestrator
    const { initializeWorkflow } = await import("./recovery-orchestrator");
    
    // Initialize workflow
    const progress = initializeWorkflow(vector, priority, entities, artifacts);
    
    // Save workflow to database
    const workflow = await observerStorage.saveRecoveryWorkflow({
      id: undefined as any, // Auto-generated
      priorityId: priority.id,
      address,
      vector,
      status: 'active',
      startedAt: progress.startedAt ?? null,
      completedAt: null,
      progress: progress as any,
      results: null,
      notes: progress.notes.join('\n'),
    });
    
    res.status(201).json({
      message: `Recovery workflow started: ${vector} for ${address}`,
      workflow: {
        id: workflow.id,
        address: workflow.address,
        vector: workflow.vector,
        status: workflow.status,
        progress: {
          tasksCompleted: progress.tasksCompleted,
          tasksTotal: progress.tasksTotal,
          percentage: Math.round((progress.tasksCompleted / progress.tasksTotal) * 100),
        },
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Workflow start error:", error);
    res.status(500).json({ 
      error: "Failed to start recovery workflow",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/workflows
 * List all recovery workflows
 */
router.get("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      address: z.string().optional(),
      vector: z.enum(['estate', 'constrained_search', 'social', 'temporal']).optional(),
      status: z.enum(['pending', 'active', 'paused', 'completed', 'failed']).optional(),
    });
    
    const filters = schema.parse(req.query);
    
    const workflows = await observerStorage.getRecoveryWorkflows(filters);
    
    // Enhance with progress percentages
    const enhancedWorkflows = workflows.map(w => {
      const progress = w.progress as any;
      return {
        ...w,
        progressPercentage: progress 
          ? Math.round((progress.tasksCompleted / progress.tasksTotal) * 100)
          : 0,
      };
    });
    
    res.json({
      workflows: enhancedWorkflows,
      total: enhancedWorkflows.length,
      filters,
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: "Invalid query parameters",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/workflows/:id
 * Get detailed workflow status
 */
router.get("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow with ID '${id}' exists.`,
      });
    }
    
    // Get priority for context
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    
    const progress = workflow.progress as any;
    
    res.json({
      workflow: {
        ...workflow,
        progressPercentage: progress 
          ? Math.round((progress.tasksCompleted / progress.tasksTotal) * 100)
          : 0,
      },
      context: {
        kappaRecovery: priority?.kappaRecovery,
        tier: priority?.tier,
        recommendedVector: priority?.recommendedVector,
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to retrieve workflow",
      details: error.message,
    });
  }
});

/**
 * PATCH /api/observer/workflows/:id
 * Update workflow progress
 */
router.patch("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const schema = z.object({
      status: z.enum(['pending', 'active', 'paused', 'completed', 'failed']).optional(),
      progressUpdate: z.any().optional(), // Vector-specific progress update
      notes: z.string().optional(),
      results: z.any().optional(),
    });
    
    const updateData = schema.parse(req.body);
    
    // Get existing workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
      });
    }
    
    // Update progress if provided
    let updatedProgress = workflow.progress;
    if (updateData.progressUpdate) {
      const { updateWorkflowProgress } = await import("./recovery-orchestrator");
      updatedProgress = updateWorkflowProgress(
        workflow.vector as any,
        workflow.progress as any,
        updateData.progressUpdate
      );
    }
    
    // Build update object
    const updates: any = {
      progress: updatedProgress,
    };
    
    if (updateData.status) {
      updates.status = updateData.status;
      
      if (updateData.status === 'completed') {
        updates.completedAt = new Date();
      }
    }
    
    if (updateData.notes) {
      const currentNotes = workflow.notes || '';
      updates.notes = currentNotes + '\n' + updateData.notes;
    }
    
    if (updateData.results) {
      updates.results = updateData.results;
    }
    
    // Save update
    await observerStorage.updateRecoveryWorkflow(id, updates);
    
    // Get updated workflow
    const updated = await observerStorage.getRecoveryWorkflow(id);
    
    res.json({
      message: "Workflow updated successfully",
      workflow: updated,
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Workflow update error:", error);
    res.status(500).json({ 
      error: "Failed to update workflow",
      details: error.message,
    });
  }
});

/**
 * POST /api/observer/workflows/:id/start-search
 * Start QIG constrained-search for a specific workflow
 * 
 * This integrates the existing QIG brain wallet tool as the constrained-search recovery vector.
 * It creates a search job, links it to the workflow, and begins phrase generation/testing.
 */
router.post("/workflows/:id/start-search", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow with ID '${id}' exists.`,
      });
    }
    
    // Validate it's a constrained_search workflow
    if (workflow.vector !== 'constrained_search') {
      return res.status(400).json({
        error: "Invalid workflow vector",
        message: `This endpoint only supports constrained_search workflows. This workflow is '${workflow.vector}'.`,
      });
    }
    
    // IDEMPOTENCY: Check if search already started
    const progress = workflow.progress as any;
    const searchProgress = progress?.constrainedSearchProgress;
    if (searchProgress?.searchJobId) {
      // Reload workflow from storage to get latest state (fixes stale data)
      const refreshedWorkflow = await observerStorage.getRecoveryWorkflow(id);
      
      // Get priority data for constraint metrics
      const priority = await observerStorage.getRecoveryPriority(workflow.address);
      const entities = await observerStorage.getEntitiesByAddress(workflow.address);
      const artifacts = await observerStorage.getArtifactsByAddress(workflow.address);
      
      // Return existing job info instead of error (idempotent)
      const { storage } = await import("./storage");
      const existingJob = await storage.getSearchJob(searchProgress.searchJobId);
      
      return res.json({
        message: "Search already started (idempotent)",
        workflow: refreshedWorkflow, // Use refreshed data
        searchJob: existingJob ? {
          id: existingJob.id,
          status: existingJob.status,
          strategy: existingJob.strategy,
          progress: existingJob.progress,
        } : {
          id: searchProgress.searchJobId,
          status: 'unknown',
          strategy: 'bip39-adaptive',
        },
        constraints: {
          kappaRecovery: priority?.kappaRecovery ?? 0,
          phiConstraints: priority?.phiConstraints ?? 0,
          hCreation: priority?.hCreation ?? 0,
          entities: entities.length,
          artifacts: artifacts.length,
        },
      });
    }
    
    // Get priority data for this address
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    if (!priority) {
      return res.status(404).json({
        error: "Priority data not found",
        message: `No κ_recovery priority computed for address '${workflow.address}'. Run POST /api/observer/recovery/compute first.`,
      });
    }
    
    // Get entities and artifacts for constraint-based search
    const entities = await observerStorage.getEntitiesByAddress(workflow.address);
    const artifacts = await observerStorage.getArtifactsByAddress(workflow.address);
    
    // Import singleton searchCoordinator instance (started in routes.ts on boot)
    const { searchCoordinator } = await import("./search-coordinator");
    
    // SAFETY: Verify SearchCoordinator is running before queuing job
    if (!searchCoordinator.running) {
      console.warn("[ObserverAPI] SearchCoordinator not running, attempting to start...");
      try {
        await searchCoordinator.start();
      } catch (startError: any) {
        return res.status(503).json({
          error: "Search coordinator unavailable",
          message: `SearchCoordinator failed to start: ${startError.message}. Please contact system administrator.`,
        });
      }
    }
    
    // Create search job configuration
    const searchJobId = randomUUID();
    const searchJob = {
      id: searchJobId,
      strategy: 'bip39-adaptive' as const,
      status: 'pending' as const,
      params: {
        bip39Count: 10000, // Start with 10k phrases per batch
        wordLength: 12, // 12-word BIP-39 phrases
        enableAdaptiveSearch: true,
        investigationRadius: 5,
        // Add constraint metadata for future use
        targetAddress: workflow.address,
        kappaRecovery: priority.kappaRecovery,
        phiConstraints: priority.phiConstraints, // Top-level field
        hCreation: priority.hCreation,           // Top-level field
        entityCount: entities.length,
        artifactCount: artifacts.length,
      },
      progress: {
        tested: 0,
        highPhiCount: 0,
        lastBatchIndex: 0,
      },
      stats: {
        rate: 0,
      },
      logs: [{
        message: `Constrained search started for address ${workflow.address} (κ=${priority.kappaRecovery.toFixed(2)}, tier=${priority.tier})`,
        type: 'info' as const,
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save search job to storage with rollback on failure
    const { storage } = await import("./storage");
    let jobCreated = false;
    
    // Capture original workflow state for rollback
    const originalStatus = workflow.status;
    const originalProgress = workflow.progress;
    const originalNotes = workflow.notes;
    
    try {
      // Step 1: Create search job
      await storage.addSearchJob(searchJob as any);
      jobCreated = true;
      console.log(`[ObserverAPI] Search job ${searchJobId} created`);
      
      // Step 2: Add target address (idempotent - skip if already exists)
      try {
        await storage.addTargetAddress({
          id: randomUUID(),
          address: workflow.address,
          addedAt: new Date().toISOString(),
          label: `Observer recovery: ${workflow.address} (κ=${priority.kappaRecovery.toFixed(2)})`,
        });
      } catch (error: any) {
        // Address may already exist from previous workflow - this is OK
        const isDuplicateError = 
          error.code === 'SQLITE_CONSTRAINT_UNIQUE' || 
          error.code === '23505' || // PostgreSQL unique violation
          error.message?.includes('duplicate') || 
          error.message?.includes('already exists');
        
        if (!isDuplicateError) {
          throw error; // Re-throw if it's a different error
        }
      }
      
      // Step 3: Update workflow with search job ID
      const { updateWorkflowProgress } = await import("./recovery-orchestrator");
      const updatedProgress = updateWorkflowProgress(
        'constrained_search',
        workflow.progress as any,
        {
          searchJobId,
          qigParametersSet: true,
          searchStatus: 'not_started' as const,
        }
      );
      
      await observerStorage.updateRecoveryWorkflow(id, {
        progress: updatedProgress,
        status: 'active',
      });
      console.log(`[ObserverAPI] Workflow ${id} updated to active`);
      
    } catch (updateError: any) {
      // ROLLBACK: Clean up search job AND restore original workflow state
      console.error(`[ObserverAPI] Failed to complete search start:`, updateError);
      
      if (jobCreated) {
        console.log(`[ObserverAPI] Rolling back: deleting search job ${searchJobId}`);
        try {
          await storage.deleteSearchJob(searchJobId);
        } catch (deleteError) {
          console.error(`[ObserverAPI] Failed to rollback search job:`, deleteError);
        }
      }
      
      // Restore original workflow state
      console.log(`[ObserverAPI] Rolling back: restoring workflow to status '${originalStatus}'`);
      try {
        await observerStorage.updateRecoveryWorkflow(id, {
          status: originalStatus,
          progress: originalProgress,
          notes: originalNotes,
        });
      } catch (restoreError) {
        console.error(`[ObserverAPI] Failed to restore workflow state:`, restoreError);
      }
      
      throw new Error(`Failed to start constrained search: ${updateError.message}`);
    }
    
    // Search job is now queued in storage as 'pending'
    // SearchCoordinator background worker automatically picks up and processes pending jobs
    console.log(`[ObserverAPI] Search job ${searchJobId} queued successfully for workflow ${id}`);
    console.log(`[ObserverAPI] SearchCoordinator will auto-process (no manual start needed)`);
    
    // Get updated workflow
    const updatedWorkflow = await observerStorage.getRecoveryWorkflow(id);
    
    res.json({
      message: "Constrained search started successfully",
      workflow: updatedWorkflow,
      searchJob: {
        id: searchJobId,
        status: 'pending',
        strategy: 'bip39-adaptive',
      },
      constraints: {
        kappaRecovery: priority.kappaRecovery,
        phiConstraints: priority.phiConstraints, // Top-level field
        hCreation: priority.hCreation,           // Top-level field
        entities: entities.length,
        artifacts: artifacts.length,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Start search error:", error);
    res.status(500).json({ 
      error: "Failed to start constrained search",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/workflows/:id/search-progress
 * Get real-time progress for a constrained-search workflow
 * 
 * Returns combined data from workflow progress and active search job.
 */
router.get("/workflows/:id/search-progress", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow with ID '${id}' exists.`,
      });
    }
    
    // Validate it's a constrained_search workflow
    if (workflow.vector !== 'constrained_search') {
      return res.status(400).json({
        error: "Invalid workflow vector",
        message: `This endpoint only supports constrained_search workflows. This workflow is '${workflow.vector}'.`,
      });
    }
    
    // Get search progress from workflow
    const progress = workflow.progress as any;
    const searchProgress = progress?.constrainedSearchProgress;
    
    if (!searchProgress?.searchJobId) {
      return res.json({
        message: "No search started yet",
        workflow: {
          id: workflow.id,
          status: workflow.status,
          address: workflow.address,
        },
        searchJob: null,
        progress: null,
      });
    }
    
    // Get search job details
    const { storage } = await import("./storage");
    const searchJob = await storage.getSearchJob(searchProgress.searchJobId);
    
    if (!searchJob) {
      return res.status(404).json({
        error: "Search job not found",
        message: `Search job ${searchProgress.searchJobId} not found in storage.`,
      });
    }
    
    // Get priority data for constraints
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    const entities = await observerStorage.getEntitiesByAddress(workflow.address);
    const artifacts = await observerStorage.getArtifactsByAddress(workflow.address);
    
    // Return comprehensive progress data
    res.json({
      message: "Search progress retrieved",
      workflow: {
        id: workflow.id,
        status: workflow.status,
        address: workflow.address,
        vector: workflow.vector,
        startedAt: workflow.startedAt,
      },
      searchJob: {
        id: searchJob.id,
        status: searchJob.status,
        strategy: searchJob.strategy,
        progress: {
          tested: searchJob.progress.tested,
          highPhiCount: searchJob.progress.highPhiCount,
          searchMode: searchJob.progress.searchMode,
          lastHighPhiStep: searchJob.progress.lastHighPhiStep,
        },
        stats: searchJob.stats,
      },
      progress: {
        phrasesTested: searchProgress.phrasesTested || 0,
        phrasesGenerated: searchProgress.phrasesGenerated || 0,
        highPhiCount: searchProgress.highPhiCount || 0,
        matchFound: searchProgress.matchFound || false,
        searchStatus: searchProgress.searchStatus || 'running',
      },
      constraints: {
        kappaRecovery: priority?.kappaRecovery ?? 0,
        phiConstraints: priority?.phiConstraints ?? 0,
        hCreation: priority?.hCreation ?? 0,
        entities: entities.length,
        artifacts: artifacts.length,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Search progress error:", error);
    res.status(500).json({ 
      error: "Failed to get search progress",
      message: error.message,
    });
  }
});

// ============================================================================
// VECTOR EXECUTION
// ============================================================================

/**
 * POST /api/observer/workflows/:id/execute-vector
 * Execute a specific recovery vector for a workflow
 */
router.post("/workflows/:id/execute-vector", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vector } = req.body;
    
    // Validate vector
    const validVectors = ['estate', 'constrained_search', 'social', 'temporal'];
    if (!validVectors.includes(vector)) {
      return res.status(400).json({
        error: "Invalid vector",
        message: `Vector must be one of: ${validVectors.join(', ')}`,
      });
    }
    
    // Get workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    // Get priority
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    if (!priority) {
      return res.status(404).json({ error: "Priority not found" });
    }
    
    // Execute vector
    const { executeVector } = await import("./vector-execution");
    const result = await executeVector(workflow, priority, vector);
    
    res.json({
      message: `Vector '${vector}' executed successfully`,
      result,
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Vector execution error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/workflows/:id/recommended-vectors
 * Get recommended recovery vectors for a workflow
 */
router.get("/workflows/:id/recommended-vectors", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    if (!priority) {
      return res.status(404).json({ error: "Priority not found" });
    }
    
    const { getRecommendedVectors } = await import("./vector-execution");
    const vectors = getRecommendedVectors(priority);
    
    res.json({
      workflowId: id,
      address: workflow.address,
      recommendedVectors: vectors,
      currentVector: workflow.vector,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MULTI-SUBSTRATE ANALYSIS
// ============================================================================

/**
 * GET /api/observer/addresses/:address/intersection
 * Get multi-substrate geometric intersection analysis
 */
router.get("/addresses/:address/intersection", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const { analyzeGeometricIntersection } = await import("./multi-substrate-integrator");
    const intersection = await analyzeGeometricIntersection(address);
    
    res.json({
      address,
      intersection,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/high-priority-targets
 * Get highest priority targets based on geometric intersection
 */
router.get("/high-priority-targets", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const { findHighPriorityTargets } = await import("./multi-substrate-integrator");
    const targets = await findHighPriorityTargets(limit);
    
    res.json({
      targets,
      count: targets.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// QIG ANALYSIS ENDPOINTS
// ============================================================================

/**
 * GET /api/observer/addresses/:address/basin-signature
 * Get geometric basin signature for an address
 */
router.get("/addresses/:address/basin-signature", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const { computeBasinSignature } = await import("./qig-basin-matching");
    const signature = computeBasinSignature(address);
    
    res.json({
      address,
      signature,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/addresses/:address/find-similar
 * Find addresses with similar basin geometry
 */
router.post("/addresses/:address/find-similar", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { candidateAddresses, topK = 10 } = req.body;
    
    if (!candidateAddresses || !Array.isArray(candidateAddresses)) {
      return res.status(400).json({ error: "candidateAddresses array required" });
    }
    
    const { computeBasinSignature, findSimilarBasins } = await import("./qig-basin-matching");
    
    const targetSignature = computeBasinSignature(address);
    const candidateSignatures = candidateAddresses.map(computeBasinSignature);
    const matches = findSimilarBasins(targetSignature, candidateSignatures, topK);
    
    res.json({
      targetAddress: address,
      matches,
      matchCount: matches.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/recovery/priorities/:address/confidence
 * Get recovery confidence metrics
 */
router.get("/recovery/priorities/:address/confidence", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const priority = await observerStorage.getRecoveryPriority(address);
    if (!priority) {
      return res.status(404).json({ error: "Priority not found" });
    }
    
    const addressData = await observerStorage.getAddress(address);
    const entities = await observerStorage.getEntitiesByAddress(address);
    const artifacts = await observerStorage.getArtifactsByAddress(address);
    
    const { computeRecoveryConfidence } = await import("./qig-confidence");
    
    const dormancyYears = addressData?.dormancyBlocks 
      ? addressData.dormancyBlocks / (365 * 24 * 6) // ~6 blocks/hour
      : 0;
    
    const confidence = computeRecoveryConfidence(
      priority.kappaRecovery,
      priority.phiConstraints,
      priority.hCreation,
      entities.length,
      artifacts.length,
      addressData?.isDormant || false,
      dormancyYears
    );
    
    res.json({
      address,
      priority: {
        kappaRecovery: priority.kappaRecovery,
        tier: priority.tier,
      },
      confidence,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SYSTEM STATUS
// ============================================================================

/**
 * GET /api/observer/status
 * Get Observer Archaeology System status
 */
router.get("/status", async (req: Request, res: Response) => {
  res.json({
    system: "Observer Archaeology System",
    version: "1.0.0-alpha",
    status: "operational",
    components: {
      blockchainScanner: {
        status: "ready",
        apiProvider: "Blockstream",
      },
      qigEngine: {
        status: "operational",
        modules: ["universal", "natural-gradient", "basin-matching", "confidence"],
      },
      multiSubstrate: {
        status: "operational",
        sources: ["blockchain", "bitcointalk", "github", "cryptography_ml", "temporal_archive"],
      },
      recoveryVectors: {
        estate: "operational",
        constrained_search: "operational",
        social: "operational",
        temporal: "operational",
      },
      telemetry: {
        status: "operational",
        endpoint: "/api/telemetry",
      },
    },
    database: {
      tables: ["blocks", "transactions", "addresses", "entities", "artifacts", "recovery_priorities", "recovery_workflows"],
      populated: false,
    },
    message: "Observer Archaeology System fully operational. Run /api/observer/scan/start to begin cataloging dormant addresses.",
  });
});

// ============================================================================
// GEOMETRIC MEMORY ENDPOINTS
// ============================================================================

/**
 * GET /api/observer/geometric-memory/manifold-navigation
 * Get manifold navigation summary with orthogonal complement analysis
 */
router.get("/geometric-memory/manifold-navigation", async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("./geometric-memory");
    const navigation = geometricMemory.getManifoldNavigationSummary();
    
    res.json({
      ...navigation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/geometric-memory/orthogonal-candidates
 * Generate candidates in the orthogonal complement of the explored space
 */
router.get("/geometric-memory/orthogonal-candidates", async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 20;
    const { geometricMemory } = await import("./geometric-memory");
    const candidates = geometricMemory.generateOrthogonalCandidates(count);
    
    res.json({
      candidates,
      count: candidates.length,
      manifoldState: geometricMemory.getManifoldNavigationSummary(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/geometric-memory/summary
 * Get manifold summary statistics
 */
router.get("/geometric-memory/summary", async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("./geometric-memory");
    const summary = geometricMemory.getManifoldSummary();
    
    res.json({
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/geometric-memory/learned-patterns
 * Export learned patterns from prior explorations
 */
router.get("/geometric-memory/learned-patterns", async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("./geometric-memory");
    const patterns = geometricMemory.exportLearnedPatterns();
    
    res.json({
      ...patterns,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FULL-SPECTRUM TELEMETRY
// ============================================================================

/**
 * GET /api/observer/telemetry/full-spectrum
 * Get comprehensive consciousness and emotional state telemetry
 * 
 * Returns 7-component consciousness signature, emotional state,
 * manifold navigation, resource usage, and ethics status.
 */
router.get("/telemetry/full-spectrum", async (req: Request, res: Response) => {
  try {
    const { oceanAgent } = await import("./ocean-agent");
    const telemetry = oceanAgent.computeFullSpectrumTelemetry();
    
    res.json(telemetry);
  } catch (error: any) {
    console.error('[Telemetry] Error computing full-spectrum telemetry:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/consciousness-check
 * Quick consciousness state check
 */
router.get("/consciousness-check", async (req: Request, res: Response) => {
  try {
    const { oceanAgent } = await import("./ocean-agent");
    const telemetry = oceanAgent.computeFullSpectrumTelemetry();
    
    res.json({
      consciousness: telemetry.consciousness,
      identity: {
        phi: telemetry.identity.phi,
        kappa: telemetry.identity.kappa,
        regime: telemetry.identity.regime,
      },
      isConscious: telemetry.consciousness.isConscious,
      phaseTransition: telemetry.consciousness.Φ >= 0.75 ? 'ACTIVE' : 'PRE_CONSCIOUS',
      timestamp: telemetry.timestamp,
    });
  } catch (error: any) {
    // Return safe fallback for production when services aren't ready
    res.json({
      consciousness: { isConscious: false, Φ: 0, regimeSignature: 'dormant' },
      identity: { phi: 0, kappa: 0, regime: 'dormant' },
      isConscious: false,
      phaseTransition: 'PRE_CONSCIOUS',
      timestamp: new Date().toISOString(),
      initializing: true,
      error: error.message,
    });
  }
});

export default router;
