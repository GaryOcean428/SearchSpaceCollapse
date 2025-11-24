/**
 * Observer Archaeology System API Routes
 * 
 * Namespaced under /api/observer/ to separate from legacy brain wallet endpoints
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { 
  fetchBlockByHeight, 
  scanEarlyEraBlocks, 
  parseBlock, 
  parseTransaction,
  computeKappaRecovery 
} from "./blockchain-scanner";
import { observerStorage } from "./observer-storage";

const router = Router();

// ============================================================================
// BLOCKCHAIN SCANNING
// ============================================================================

/**
 * POST /api/observer/scan/start
 * Start blockchain scanning for early era blocks (2009-2011)
 */
router.post("/scan/start", async (req: Request, res: Response) => {
  try {
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
    
    // Start scanning (async, don't await)
    scanEarlyEraBlocks(startHeight, endHeight, (height, total) => {
      console.log(`[ObserverAPI] Scanning progress: ${height}/${total}`);
    }).then(() => {
      console.log(`[ObserverAPI] Scan complete: ${startHeight}-${endHeight}`);
    }).catch(error => {
      console.error(`[ObserverAPI] Scan error:`, error);
    });
    
    res.json({
      status: "started",
      startHeight,
      endHeight,
      message: `Scanning blocks ${startHeight} to ${endHeight}`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/observer/scan/status
 * Get current scanning status
 */
router.get("/scan/status", async (req: Request, res: Response) => {
  // TODO: Implement scanning status tracking
  res.json({
    isScanning: false,
    currentHeight: 0,
    totalBlocks: 0,
    message: "No active scan",
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
    const serializedAddresses = filteredAddresses.map(addr => ({
      ...addr,
      currentBalance: addr.currentBalance.toString(),
      createdAt: addr.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: addr.updatedAt?.toISOString() || new Date().toISOString(),
      firstSeenTimestamp: addr.firstSeenTimestamp.toISOString(),
      lastActivityTimestamp: addr.lastActivityTimestamp.toISOString(),
    }));
    
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
    
    // TODO: Query database for recovery priorities
    
    res.json({
      priorities: [],
      total: 0,
      filters,
      message: "Recovery priorities not yet computed. Run scanning and constraint solver.",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/observer/priorities/:address
 * Get κ_recovery details for a specific address
 */
router.get("/priorities/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // TODO: Query database for priority details
    
    res.json({
      address,
      message: "Priority lookup not yet implemented",
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
    
    // TODO: Query database for workflows
    
    res.json({
      workflows: [],
      total: 0,
      filters,
      message: "Recovery workflows not yet implemented",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    
    // TODO: Create workflow in database
    
    res.json({
      workflow: {
        id: "mock-workflow-id",
        ...data,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      message: "Workflow created successfully",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/observer/workflows/:id
 * Get workflow details
 */
router.get("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Query database for workflow
    
    res.json({
      workflow: {
        id,
        status: "pending",
        message: "Workflow lookup not yet implemented",
      },
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
    
    // TODO: Query database for entities
    
    res.json({
      entities: [],
      total: 0,
      filters,
      message: "Entity data not yet loaded. Awaiting Era Manifold ingestion.",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    
    // TODO: Query database for artifacts
    
    res.json({
      artifacts: [],
      total: 0,
      filters,
      message: "Artifact data not yet loaded. Awaiting Era Manifold ingestion.",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    status: "initializing",
    components: {
      blockchainScanner: {
        status: "ready",
        apiProvider: "Blockstream",
      },
      eraManifold: {
        status: "not_loaded",
        sources: ["bitcointalk", "mailing_lists", "github"],
      },
      constraintSolver: {
        status: "not_initialized",
      },
      recoveryVectors: {
        estate: "not_implemented",
        constrained_search: "legacy_tool_active",
        social: "not_implemented",
        temporal: "not_implemented",
      },
    },
    database: {
      tables: ["blocks", "transactions", "addresses", "entities", "artifacts", "recovery_priorities", "recovery_workflows"],
      populated: false,
    },
    message: "Observer Archaeology System initialized. Run /api/observer/scan/start to begin cataloging dormant addresses.",
  });
});

export default router;
