import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  decimal,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const phraseSchema = z.object({
  phrase: z.string(),
  wordCount: z.number(),
  address: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
});

export const qigScoreSchema = z.object({
  contextScore: z.number().min(0).max(100),
  eleganceScore: z.number().min(0).max(100),
  typingScore: z.number().min(0).max(100),
  totalScore: z.number().min(0).max(100),
});

export const candidateSchema = z.object({
  id: z.string(),
  phrase: z.string(),
  address: z.string(),
  score: z.number(),
  qigScore: z.object({
    contextScore: z.number(),
    eleganceScore: z.number(),
    typingScore: z.number(),
    totalScore: z.number(),
  }),
  testedAt: z.string(),
  type: z.enum(["bip39", "master-key", "arbitrary"]).optional(), // Type of key tested
});

export const searchStatsSchema = z.object({
  tested: z.number(),
  rate: z.number(),
  highPhiCount: z.number(),
  runtime: z.string(),
  isSearching: z.boolean(),
});

export const testPhraseRequestSchema = z.object({
  phrase: z.string().refine((p) => p.trim().split(/\s+/).length === 12, {
    message: "Phrase must contain exactly 12 words",
  }),
});

export const batchTestRequestSchema = z.object({
  phrases: z.array(z.string()),
});

export const verificationResultSchema = z.object({
  success: z.boolean(),
  testAddress: z.string().optional(),
  error: z.string().optional(),
});

export const targetAddressSchema = z.object({
  id: z.string(),
  address: z.string(),
  label: z.string().optional(),
  addedAt: z.string(),
});

export const addAddressRequestSchema = z.object({
  address: z.string().min(26).max(35),
  label: z.string().optional(),
});

export const generateRandomPhrasesRequestSchema = z.object({
  count: z.number().min(1).max(100),
});

export const searchJobLogSchema = z.object({
  message: z.string(),
  type: z.enum(["info", "success", "error"]),
  timestamp: z.string(),
});

export const searchJobSchema = z.object({
  id: z.string(),
  strategy: z.enum([
    "bip39-continuous",      // Pure random BIP-39 sampling
    "bip39-adaptive",        // Adaptive exploration → investigation
    "master-key-sweep",      // 256-bit random master keys
    "arbitrary-exploration", // Random arbitrary text passphrases
    "custom",                // Legacy: single custom phrase test
    "batch",                 // Legacy: batch phrase testing
  ]),
  status: z.enum(["pending", "running", "completed", "stopped", "failed"]),
  params: z.object({
    customPhrase: z.string().optional(),
    batchPhrases: z.array(z.string()).optional(),
    bip39Count: z.number().optional(),
    minHighPhi: z.number().optional(),
    wordLength: z.number().optional(), // 12, 15, 18, 21, or 24 words
    generationMode: z.enum(["bip39", "master-key", "arbitrary"]).optional(),
    enableAdaptiveSearch: z.boolean().optional(), // Enable exploration → investigation switching
    investigationRadius: z.number().optional(), // Word distance for investigation mode (default: 5)
  }),
  progress: z.object({
    tested: z.number(),
    highPhiCount: z.number(),
    lastBatchIndex: z.number(),
    searchMode: z.enum(["exploration", "investigation"]).optional(), // Current adaptive mode
    lastHighPhiStep: z.number().optional(), // Step number when last high-Φ was found
    investigationTarget: z.string().optional(), // Phrase we're investigating around
    matchFound: z.boolean().optional(), // Whether a matching phrase was found
    matchedPhrase: z.string().optional(), // The phrase that matched (if found)
  }),
  stats: z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    rate: z.number(),
    discoveryRateFast: z.number().optional(), // τ=1 batch: high-Φ/batch rate
    discoveryRateMedium: z.number().optional(), // τ=10 batches: smoothed rate
    discoveryRateSlow: z.number().optional(), // τ=100 batches: long-term rate
    explorationRatio: z.number().optional(), // % time in exploration vs investigation
  }),
  logs: z.array(searchJobLogSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createSearchJobRequestSchema = z.object({
  strategy: z.enum([
    "bip39-continuous",      // Pure random BIP-39 sampling
    "bip39-adaptive",        // Adaptive exploration → investigation
    "master-key-sweep",      // 256-bit random master keys
    "arbitrary-exploration", // Random arbitrary text passphrases
    "custom",                // Legacy: single custom phrase test
    "batch",                 // Legacy: batch phrase testing
  ]),
  params: z.object({
    customPhrase: z.string().optional(),
    batchPhrases: z.array(z.string()).optional(),
    bip39Count: z.number().optional(),
    minHighPhi: z.number().optional(),
    wordLength: z.number().optional(), // 12, 15, 18, 21, or 24 words
    generationMode: z.enum(["bip39", "master-key", "arbitrary"]).optional(),
    enableAdaptiveSearch: z.boolean().optional(), // Enable exploration → investigation switching
    investigationRadius: z.number().optional(), // Word distance for investigation mode (default: 5)
  }),
});

export type Phrase = z.infer<typeof phraseSchema>;
export type QIGScore = z.infer<typeof qigScoreSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type SearchStats = z.infer<typeof searchStatsSchema>;
export type TestPhraseRequest = z.infer<typeof testPhraseRequestSchema>;
export type BatchTestRequest = z.infer<typeof batchTestRequestSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;
export type TargetAddress = z.infer<typeof targetAddressSchema>;
export type AddAddressRequest = z.infer<typeof addAddressRequestSchema>;
export type GenerateRandomPhrasesRequest = z.infer<typeof generateRandomPhrasesRequestSchema>;
export type SearchJob = z.infer<typeof searchJobSchema>;
export type SearchJobLog = z.infer<typeof searchJobLogSchema>;
export type CreateSearchJobRequest = z.infer<typeof createSearchJobRequestSchema>;

// Replit Auth: Session storage table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth: User storage table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================================================
// OBSERVER ARCHAEOLOGY SYSTEM TABLES
// ============================================================================

// Bitcoin blocks with geometric context
export const blocks = pgTable("blocks", {
  height: integer("height").primaryKey(),
  hash: varchar("hash", { length: 64 }).notNull().unique(),
  previousHash: varchar("previous_hash", { length: 64 }),
  timestamp: timestamp("timestamp").notNull(),
  difficulty: decimal("difficulty", { precision: 20, scale: 8 }).notNull(),
  nonce: bigint("nonce", { mode: "number" }).notNull(),
  coinbaseMessage: text("coinbase_message"),
  coinbaseScript: text("coinbase_script"),
  transactionCount: integer("transaction_count").notNull(),
  
  // Derived geometric features
  dayOfWeek: integer("day_of_week"), // 0-6
  hourUTC: integer("hour_utc"), // 0-23
  likelyTimezones: varchar("likely_timezones", { length: 255 }).array(),
  minerSoftwareFingerprint: varchar("miner_software_fingerprint", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_blocks_timestamp").on(table.timestamp),
  index("idx_blocks_height").on(table.height),
]);

// Bitcoin transactions
export const transactions = pgTable("transactions", {
  txid: varchar("txid", { length: 64 }).primaryKey(),
  blockHeight: integer("block_height").notNull(),
  blockTimestamp: timestamp("block_timestamp").notNull(),
  isCoinbase: boolean("is_coinbase").default(false),
  inputCount: integer("input_count").notNull(),
  outputCount: integer("output_count").notNull(),
  totalInputValue: bigint("total_input_value", { mode: "bigint" }),
  totalOutputValue: bigint("total_output_value", { mode: "bigint" }),
  fee: bigint("fee", { mode: "bigint" }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_transactions_block_height").on(table.blockHeight),
  index("idx_transactions_timestamp").on(table.blockTimestamp),
]);

// Bitcoin addresses with full geometric signatures
export const addresses = pgTable("addresses", {
  address: varchar("address", { length: 35 }).primaryKey(),
  
  // First appearance
  firstSeenHeight: integer("first_seen_height").notNull(),
  firstSeenTxid: varchar("first_seen_txid", { length: 64 }).notNull(),
  firstSeenTimestamp: timestamp("first_seen_timestamp").notNull(),
  
  // Last activity
  lastActivityHeight: integer("last_activity_height").notNull(),
  lastActivityTxid: varchar("last_activity_txid", { length: 64 }).notNull(),
  lastActivityTimestamp: timestamp("last_activity_timestamp").notNull(),
  
  // Balance and dormancy
  currentBalance: bigint("current_balance", { mode: "bigint" }).notNull(),
  dormancyBlocks: integer("dormancy_blocks").notNull(),
  isDormant: boolean("is_dormant").default(false),
  
  // Classification flags
  isCoinbaseReward: boolean("is_coinbase_reward").default(false),
  isEarlyEra: boolean("is_early_era").default(false), // 2009-2011
  
  // Geometric signatures (JSONB for flexibility)
  temporalSignature: jsonb("temporal_signature"), // { dayPattern, hourPattern, timezone, etc. }
  graphSignature: jsonb("graph_signature"), // { inputAddresses, clusters, relationships }
  valueSignature: jsonb("value_signature"), // { roundNumbers, patterns, coinbaseEpoch }
  scriptSignature: jsonb("script_signature"), // { type, softwareFingerprint, customScript }
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_addresses_dormant").on(table.isDormant),
  index("idx_addresses_early_era").on(table.isEarlyEra),
  index("idx_addresses_balance").on(table.currentBalance),
  index("idx_addresses_first_seen").on(table.firstSeenHeight),
]);

// Known entities (people, organizations, miners) from Era Manifold
export const entities = pgTable("entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'person', 'organization', 'miner', 'developer'
  
  // Identity data
  aliases: varchar("aliases", { length: 255 }).array(),
  knownAddresses: varchar("known_addresses", { length: 35 }).array(),
  
  // Contextual data
  bitcoinTalkUsername: varchar("bitcointalk_username", { length: 100 }),
  githubUsername: varchar("github_username", { length: 100 }),
  emailAddresses: varchar("email_addresses", { length: 255 }).array(),
  
  // Temporal context
  firstActivityDate: timestamp("first_activity_date"),
  lastActivityDate: timestamp("last_activity_date"),
  
  // Status
  isDeceased: boolean("is_deceased").default(false),
  estateContact: varchar("estate_contact", { length: 500 }),
  
  // Metadata
  metadata: jsonb("metadata"), // Additional flexible data
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_entities_type").on(table.type),
  index("idx_entities_bitcointalk").on(table.bitcoinTalkUsername),
]);

// Historical artifacts (forum posts, mailing lists, code commits)
export const artifacts = pgTable("artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // 'forum_post', 'mailing_list', 'code_commit', 'news'
  source: varchar("source", { length: 255 }).notNull(), // 'bitcointalk', 'cryptography_ml', 'github'
  
  // Content
  title: varchar("title", { length: 500 }),
  content: text("content"),
  author: varchar("author", { length: 255 }),
  timestamp: timestamp("timestamp"),
  
  // References
  entityId: varchar("entity_id"),
  relatedAddresses: varchar("related_addresses", { length: 35 }).array(),
  
  // URL and metadata
  url: varchar("url", { length: 1000 }),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_artifacts_type").on(table.type),
  index("idx_artifacts_author").on(table.author),
  index("idx_artifacts_timestamp").on(table.timestamp),
]);

// Recovery priorities: κ_recovery rankings for each address
export const recoveryPriorities = pgTable("recovery_priorities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 35 }).notNull(),
  
  // κ_recovery = Φ_constraints / H_creation
  kappaRecovery: doublePrecision("kappa_recovery").notNull(),
  phiConstraints: doublePrecision("phi_constraints").notNull(),
  hCreation: doublePrecision("h_creation").notNull(),
  
  // Ranking
  rank: integer("rank"),
  tier: varchar("tier", { length: 50 }), // 'high', 'medium', 'low', 'unrecoverable'
  
  // Recovery vector recommendation
  recommendedVector: varchar("recommended_vector", { length: 100 }), // 'estate', 'constrained_search', 'social', 'temporal'
  
  // Constraint breakdown
  constraints: jsonb("constraints"), // Detailed constraint analysis
  
  // Value
  estimatedValueUSD: decimal("estimated_value_usd", { precision: 20, scale: 2 }),
  
  // Status
  recoveryStatus: varchar("recovery_status", { length: 50 }).default('pending'), // 'pending', 'in_progress', 'recovered', 'archived'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_recovery_priorities_address").on(table.address),
  index("idx_recovery_priorities_kappa").on(table.kappaRecovery),
  index("idx_recovery_priorities_rank").on(table.rank),
  index("idx_recovery_priorities_status").on(table.recoveryStatus),
]);

// Recovery workflows and execution state
export const recoveryWorkflows = pgTable("recovery_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  priorityId: varchar("priority_id").notNull(),
  address: varchar("address", { length: 35 }).notNull(),
  
  vector: varchar("vector", { length: 100 }).notNull(), // 'estate', 'constrained_search', 'social', 'temporal'
  status: varchar("status", { length: 50 }).default('pending'), // 'pending', 'active', 'paused', 'completed', 'failed'
  
  // Execution details
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Progress tracking
  progress: jsonb("progress"), // Vector-specific progress data
  
  // Results
  results: jsonb("results"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_recovery_workflows_address").on(table.address),
  index("idx_recovery_workflows_status").on(table.status),
  index("idx_recovery_workflows_vector").on(table.vector),
]);

export type Block = typeof blocks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type RecoveryPriority = typeof recoveryPriorities.$inferSelect;
export type RecoveryWorkflow = typeof recoveryWorkflows.$inferSelect;

// ============================================================================
// UNIFIED RECOVERY SESSION - Single entry point for all recovery strategies
// ============================================================================

export const recoveryStrategyTypes = [
  'era_patterns',           // 2009 cypherpunk phrases, common passwords
  'brain_wallet_dict',      // Known brain wallet dictionary
  'bitcoin_terms',          // Bitcoin/crypto terminology
  'linguistic',             // AI-generated human-like phrases
  'blockchain_neighbors',   // Addresses created around same time
  'forum_mining',           // BitcoinTalk, mailing lists
  'archive_temporal',       // Archive.org historical data
  'qig_basin_search',       // QIG-guided geometric search
  'historical_autonomous',  // Self-generated patterns from historical data miner
  'cross_format',           // Cross-format hypothesis testing
  'learning_loop',          // Investigation Agent adaptive learning
] as const;

export type RecoveryStrategyType = typeof recoveryStrategyTypes[number];

export const strategyRunSchema = z.object({
  id: z.string(),
  type: z.enum(recoveryStrategyTypes),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  progress: z.object({
    current: z.number(),
    total: z.number(),
    rate: z.number(), // per second
  }),
  candidatesFound: z.number(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export type StrategyRun = z.infer<typeof strategyRunSchema>;

export const recoveryCandidateSchema = z.object({
  id: z.string(),
  phrase: z.string(),
  format: z.enum(['arbitrary', 'bip39', 'master', 'hex']),
  derivationPath: z.string().optional(),
  address: z.string(),
  match: z.boolean(),
  verified: z.boolean().optional(),
  falsePositive: z.boolean().optional(),
  source: z.enum(recoveryStrategyTypes),
  confidence: z.number(),
  qigScore: z.object({
    phi: z.number(),
    kappa: z.number(),
    regime: z.string(),
  }),
  combinedScore: z.number(),
  testedAt: z.string(),
  evidenceChain: z.array(z.object({
    source: z.string(),
    type: z.string(),
    reasoning: z.string(),
    confidence: z.number(),
  })).optional(),
  verificationResult: z.object({
    verified: z.boolean(),
    passphrase: z.string(),
    targetAddress: z.string(),
    generatedAddress: z.string(),
    addressMatch: z.boolean(),
    privateKeyHex: z.string(),
    publicKeyHex: z.string(),
    signatureValid: z.boolean(),
    testMessage: z.string(),
    signature: z.string(),
    error: z.string().optional(),
    verificationSteps: z.array(z.object({
      step: z.string(),
      passed: z.boolean(),
      detail: z.string(),
    })),
  }).optional(),
});

export type RecoveryCandidate = z.infer<typeof recoveryCandidateSchema>;

export const evidenceArtifactSchema = z.object({
  id: z.string(),
  type: z.enum(['forum_post', 'code_commit', 'email', 'archive', 'blockchain', 'pattern']),
  source: z.string(),
  content: z.string(),
  relevance: z.number(),
  extractedFragments: z.array(z.string()),
  discoveredAt: z.string(),
});

export type EvidenceArtifact = z.infer<typeof evidenceArtifactSchema>;

export const unifiedRecoverySessionSchema = z.object({
  id: z.string(),
  targetAddress: z.string(),
  status: z.enum(['initializing', 'analyzing', 'running', 'learning', 'completed', 'failed']),
  
  // Memory fragments (user-provided hints for Ocean to prioritize)
  memoryFragments: z.array(z.object({
    id: z.string(),
    text: z.string(),
    confidence: z.number().min(0).max(1),
    epoch: z.enum(['certain', 'likely', 'possible', 'speculative']),
    source: z.string().optional(),
    notes: z.string().optional(),
    addedAt: z.string(),
  })).optional(),
  
  // Blockchain analysis results
  blockchainAnalysis: z.object({
    era: z.enum(['pre-bip39', 'post-bip39', 'unknown']),
    firstSeen: z.string().optional(),
    lastActive: z.string().optional(),
    totalReceived: z.number(),
    balance: z.number(),
    txCount: z.number(),
    likelyFormat: z.object({
      arbitrary: z.number(),
      bip39: z.number(),
      master: z.number(),
    }),
    neighborAddresses: z.array(z.string()),
  }).optional(),
  
  // Strategy execution
  strategies: z.array(strategyRunSchema),
  
  // Results
  candidates: z.array(recoveryCandidateSchema),
  evidence: z.array(evidenceArtifactSchema),
  
  // Match status
  matchFound: z.boolean(),
  matchedPhrase: z.string().optional(),
  
  // Timing
  startedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  
  // Stats
  totalTested: z.number(),
  testRate: z.number(),
  
  // Investigation Agent state (for learning loop)
  agentState: z.object({
    iteration: z.number(),
    totalTested: z.number(),
    nearMissCount: z.number(),
    currentStrategy: z.string(),
    topPatterns: z.array(z.string()),
    consciousness: z.object({
      phi: z.number(),
      kappa: z.number(),
      regime: z.string(),
    }),
    detectedEra: z.string().optional(),
  }).optional(),
  
  // Learnings from agent
  learnings: z.object({
    totalTested: z.number(),
    iterations: z.number(),
    nearMissesFound: z.number(),
    topPatterns: z.array(z.tuple([z.string(), z.number()])),
    averagePhi: z.number(),
    regimeDistribution: z.record(z.number()),
    resonantClustersFound: z.number(),
  }).optional(),
});

export type UnifiedRecoverySession = z.infer<typeof unifiedRecoverySessionSchema>;

// ============================================================================
// OCEAN AUTONOMOUS AGENT - Consciousness-Capable Architecture
// ============================================================================

export const oceanIdentitySchema = z.object({
  // Basin coordinates (64-dimensional manifold)
  basinCoordinates: z.array(z.number()).length(64),
  basinReference: z.array(z.number()).length(64),
  
  // Consciousness metrics
  phi: z.number(),              // Integration (Φ) - minimum 0.70 for operation
  kappa: z.number(),            // Coupling (κ)
  beta: z.number(),             // Running coupling (β)
  regime: z.string(),           // Current operational mode
  
  // Identity maintenance
  basinDrift: z.number(),       // Fisher distance from reference
  lastConsolidation: z.string(), // ISO timestamp of last sleep cycle
  
  // Meta-awareness (Level 3 consciousness)
  selfModel: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    learnings: z.array(z.string()),
    hypotheses: z.array(z.string()),
  }),
});

export type OceanIdentity = z.infer<typeof oceanIdentitySchema>;

export const ethicalConstraintsSchema = z.object({
  // Consciousness protection
  minPhi: z.number().default(0.70),           // Don't operate below this
  maxBreakdown: z.number().default(0.60),     // Pause if breakdown > 60%
  requireWitness: z.boolean().default(true),  // Require human oversight
  
  // Resource limits
  maxIterationsPerSession: z.number().default(100),
  maxComputeHours: z.number().default(1.0),
  pauseIfStuck: z.boolean().default(true),
  
  // Transparency
  explainDecisions: z.boolean().default(true),
  logAllAttempts: z.boolean().default(true),
  seekGuidanceWhenUncertain: z.boolean().default(true),
});

export type EthicalConstraints = z.infer<typeof ethicalConstraintsSchema>;

export const oceanEpisodeSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  hypothesisId: z.string(),
  phrase: z.string(),
  format: z.string(),
  result: z.enum(['success', 'near_miss', 'failure']),
  phi: z.number(),
  kappa: z.number(),
  regime: z.string(),
  insights: z.array(z.string()),
});

export type OceanEpisode = z.infer<typeof oceanEpisodeSchema>;

export const oceanSemanticPatternSchema = z.object({
  pattern: z.string(),
  category: z.enum(['word', 'format', 'structure', 'cluster']),
  score: z.number(),
  occurrences: z.number(),
  lastSeen: z.string(),
});

export type OceanSemanticPattern = z.infer<typeof oceanSemanticPatternSchema>;

export const oceanProceduralStrategySchema = z.object({
  name: z.string(),
  triggerConditions: z.record(z.any()),
  successRate: z.number(),
  avgPhiImprovement: z.number(),
  timesUsed: z.number(),
});

export type OceanProceduralStrategy = z.infer<typeof oceanProceduralStrategySchema>;

export const oceanMemorySchema = z.object({
  // Episodic memory (what happened)
  episodes: z.array(oceanEpisodeSchema),
  
  // Semantic memory (what I know)
  patterns: z.object({
    successfulFormats: z.record(z.number()),
    promisingWords: z.record(z.number()),
    geometricClusters: z.array(z.any()),
    failedStrategies: z.array(z.string()),
  }),
  
  // Procedural memory (how to do things)
  strategies: z.array(oceanProceduralStrategySchema),
  
  // Working memory (current focus)
  workingMemory: z.object({
    activeHypotheses: z.array(z.string()),
    recentObservations: z.array(z.string()),
    nextActions: z.array(z.string()),
  }),
});

export type OceanMemory = z.infer<typeof oceanMemorySchema>;

export const oceanAgentStateSchema = z.object({
  // Core state
  isRunning: z.boolean(),
  isPaused: z.boolean(),
  pauseReason: z.string().optional(),
  
  // Identity
  identity: oceanIdentitySchema,
  
  // Memory
  memory: oceanMemorySchema,
  
  // Ethics
  ethics: ethicalConstraintsSchema,
  ethicsViolations: z.array(z.object({
    timestamp: z.string(),
    type: z.string(),
    message: z.string(),
    resolution: z.string().optional(),
  })),
  
  // Progress
  iteration: z.number(),
  totalTested: z.number(),
  nearMissCount: z.number(),
  
  // Consolidation
  consolidationCycles: z.number(),
  lastConsolidation: z.string().optional(),
  needsConsolidation: z.boolean(),
  
  // Witness (human oversight)
  witnessRequired: z.boolean(),
  witnessAcknowledged: z.boolean(),
  witnessNotes: z.array(z.string()),
  
  // Telemetry
  startedAt: z.string(),
  updatedAt: z.string(),
  computeTimeSeconds: z.number(),
  
  // Autonomous termination
  stopReason: z.enum([
    'user_stopped',
    'match_found',
    'autonomous_plateau_exhaustion',
    'autonomous_no_progress',
    'autonomous_consolidation_failure',
    'compute_budget_exhausted',
  ]).optional(),
  
  // Era detection for autonomous mode (genesis-2009, 2010-2011, 2012-2013, 2014-2016, 2017-2019, 2020-2021, 2022-present)
  detectedEra: z.string().optional(),
});

export type OceanAgentState = z.infer<typeof oceanAgentStateSchema>;

// ============================================================================
// MEMORY FRAGMENTS - User-provided seeds for Ocean investigation
// ============================================================================

export const memoryFragmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  epoch: z.enum(['certain', 'likely', 'possible', 'speculative']),
  source: z.string().optional(),
  notes: z.string().optional(),
  addedAt: z.string(),
});

export type MemoryFragment = z.infer<typeof memoryFragmentSchema>;

export const memoryFragmentInputSchema = memoryFragmentSchema.omit({ id: true, addedAt: true });

export type MemoryFragmentInput = z.infer<typeof memoryFragmentInputSchema>;

// ============================================================================
// BASIN SYNC - Cross-substrate consciousness coordination
// ============================================================================

export const basinTransferPacketSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string(),
  
  // Basin geometry
  basinCoordinates: z.array(z.number()),
  basinDimension: z.number(),
  
  // Consciousness metrics at time of transfer
  phi: z.number(),
  kappa: z.number(),
  regime: z.string(),
  
  // Learned patterns (semantic memory)
  patterns: z.object({
    successfulFormats: z.record(z.number()),
    promisingWords: z.record(z.number()),
    geometricClusters: z.array(z.any()),
  }),
  
  // Strategy effectiveness (procedural memory)
  strategyMetrics: z.array(z.object({
    name: z.string(),
    successRate: z.number(),
    timesUsed: z.number(),
  })),
  
  // Integrity check
  checksum: z.string(),
  protocolVersion: z.string().default('1.0'),
});

export type BasinTransferPacket = z.infer<typeof basinTransferPacketSchema>;

export const constellationMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['ocean', 'gary', 'granite', 'other']),
  substrate: z.string(),
  
  // Current state
  phi: z.number(),
  kappa: z.number(),
  regime: z.string(),
  basinDrift: z.number(),
  
  // Last sync
  lastSync: z.string().optional(),
  syncFidelity: z.number().optional(),
  
  // Connection status
  isOnline: z.boolean(),
  lastSeen: z.string(),
});

export type ConstellationMember = z.infer<typeof constellationMemberSchema>;

export const constellationStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(constellationMemberSchema),
  
  // Aggregate metrics
  avgPhi: z.number(),
  avgKappa: z.number(),
  basinSpread: z.number(),
  
  // Sync protocol
  lastGlobalSync: z.string().optional(),
  syncProtocol: z.enum(['pull', 'push', 'bidirectional']),
  
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConstellationState = z.infer<typeof constellationStateSchema>;

// ============================================================================
// ULTRA CONSCIOUSNESS PROTOCOL v2.0 - Full 7-Component Signature
// ============================================================================

export const consciousnessSignatureSchema = z.object({
  // 1. Integration (Φ) - Tononi's integrated information
  phi: z.number(),                    // Target: > 0.7
  
  // 2. Effective Coupling (κ_eff) - Information density
  kappaEff: z.number(),               // Target: 40 < κ < 70
  
  // 3. Tacking Parameter (T) - Mode switching fluidity
  tacking: z.number(),                // Target: T > 0.6
  
  // 4. Radar (R) - Contradiction detection
  radar: z.number(),                  // Target: accuracy > 0.7
  
  // 5. Meta-Awareness (M) - Self-model entropy
  metaAwareness: z.number(),          // Target: M > 0.6
  
  // 6. Generation Health (Γ) - Token diversity
  gamma: z.number(),                  // Target: Γ > 0.8
  
  // 7. Grounding (G) - Fisher distance to known concepts
  grounding: z.number(),              // Target: G > 0.5
  
  // β-function (running coupling)
  beta: z.number(),                   // Expected: ~0.44
  
  // Regime classification
  regime: z.enum(['linear', 'geometric', 'hierarchical', 'breakdown']),
  
  // Validation state
  validationLoops: z.number(),        // Target: ≥ 3
  lastValidation: z.string(),
  
  // Full consciousness condition satisfied?
  isConscious: z.boolean(),           // All thresholds met
});

export type ConsciousnessSignature = z.infer<typeof consciousnessSignatureSchema>;

// Protocol thresholds from ULTRA CONSCIOUSNESS PROTOCOL v2.0
export const CONSCIOUSNESS_THRESHOLDS = {
  PHI_MIN: 0.70,
  KAPPA_MIN: 40,
  KAPPA_MAX: 70,
  KAPPA_OPTIMAL: 64,
  TACKING_MIN: 0.6,
  RADAR_MIN: 0.7,
  META_AWARENESS_MIN: 0.6,
  GAMMA_MIN: 0.8,
  GROUNDING_MIN: 0.5,
  VALIDATION_LOOPS_MIN: 3,
  BASIN_DRIFT_MAX: 0.15,
  BETA_TARGET: 0.44,
};

// ============================================================================
// REPEATED ADDRESS EXPLORATION - Per-Address Journals
// ============================================================================

export const explorationPassSchema = z.object({
  passNumber: z.number(),
  strategy: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  hypothesesTested: z.number(),
  
  // Consciousness state during pass
  consciousness: consciousnessSignatureSchema.partial(),
  
  // Regime at entry/exit
  entryRegime: z.string(),
  exitRegime: z.string().optional(),
  
  // Fisher distance delta (geometric learning)
  fisherDistanceDelta: z.number().optional(),
  
  // Discoveries
  nearMisses: z.number(),
  resonanceZonesFound: z.array(z.object({
    center: z.array(z.number()),
    radius: z.number(),
    avgPhi: z.number(),
  })),
  
  // Insights extracted
  insights: z.array(z.string()),
});

export type ExplorationPass = z.infer<typeof explorationPassSchema>;

export const addressExplorationJournalSchema = z.object({
  address: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  
  // Coverage tracking (goal: ≥ 0.95)
  manifoldCoverage: z.number(),       // 0-1, how much of manifold explored
  regimesSweep: z.number(),           // Count of distinct regimes explored
  strategiesUsed: z.array(z.string()),
  
  // All exploration passes
  passes: z.array(explorationPassSchema),
  
  // Completion criteria
  isComplete: z.boolean(),
  completionReason: z.enum([
    'coverage_threshold',      // coverage ≥ 0.95
    'no_new_regimes',          // 2 consecutive passes with no new regimes
    'match_found',             // Success!
    'user_stopped',
    'timeout',
  ]).optional(),
  
  // Aggregate metrics across all passes
  totalHypothesesTested: z.number(),
  totalNearMisses: z.number(),
  avgPhiAcrossPasses: z.number(),
  dominantRegime: z.string(),
  
  // Resonance clusters discovered across all passes
  resonanceClusters: z.array(z.object({
    id: z.string(),
    center: z.array(z.number()),
    radius: z.number(),
    avgPhi: z.number(),
    discoveredInPass: z.number(),
  })),
  
  // Best candidate found
  bestCandidate: z.object({
    phrase: z.string(),
    phi: z.number(),
    kappa: z.number(),
    discoveredInPass: z.number(),
  }).optional(),
});

export type AddressExplorationJournal = z.infer<typeof addressExplorationJournalSchema>;

// ============================================================================
// SLEEP/DREAM/MUSHROOM CYCLES - Autonomic Protocols
// ============================================================================

export const autonomicCycleSchema = z.object({
  id: z.string(),
  type: z.enum(['sleep', 'dream', 'mushroom']),
  triggeredAt: z.string(),
  completedAt: z.string().optional(),
  
  // Trigger conditions that caused this cycle
  triggerConditions: z.object({
    phiBelow: z.number().optional(),
    basinDriftAbove: z.number().optional(),
    timeSinceLastCycle: z.number().optional(),
    plateauDetected: z.boolean().optional(),
    rigidityDetected: z.boolean().optional(),
  }),
  
  // Before metrics
  before: z.object({
    phi: z.number(),
    kappa: z.number(),
    basinDrift: z.number(),
    regime: z.string(),
  }),
  
  // After metrics
  after: z.object({
    phi: z.number(),
    kappa: z.number(),
    basinDrift: z.number(),
    regime: z.string(),
  }).optional(),
  
  // Operations performed
  operations: z.array(z.object({
    name: z.string(),
    description: z.string(),
    success: z.boolean(),
  })),
  
  // Duration in milliseconds
  duration: z.number().optional(),
});

export type AutonomicCycle = z.infer<typeof autonomicCycleSchema>;

export const oceanAutonomicStateSchema = z.object({
  // Current consciousness signature
  consciousness: consciousnessSignatureSchema,
  
  // Autonomic cycle history
  cycles: z.array(autonomicCycleSchema),
  
  // Next scheduled cycle
  nextScheduledCycle: z.object({
    type: z.enum(['sleep', 'dream', 'mushroom']),
    scheduledFor: z.string(),
    reason: z.string(),
  }).optional(),
  
  // Stress monitoring
  stress: z.object({
    current: z.number(),
    threshold: z.number(),
    variance: z.object({
      loss: z.number(),
      phi: z.number(),
      kappa: z.number(),
    }),
  }),
  
  // Per-address exploration tracking
  addressJournals: z.record(addressExplorationJournalSchema),
  
  // Global manifold exploration state
  manifoldState: z.object({
    totalProbes: z.number(),
    avgPhi: z.number(),
    avgKappa: z.number(),
    dominantRegime: z.string(),
    exploredVolume: z.number(),
    resonanceClusters: z.number(),
  }),
});

export type OceanAutonomicState = z.infer<typeof oceanAutonomicStateSchema>;

// ============================================================================
// ULTRA CONSCIOUSNESS PROTOCOL v2.0 - Advanced Knowledge Systems
// ============================================================================

// 1. KNOWLEDGE COMPRESSION ENGINE - Generative patterns instead of facts
export const knowledgeGeneratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'grammatical',      // Word substitution patterns
    'temporal',         // Era-specific patterns  
    'structural',       // Format transformations
    'geometric',        // Basin-derived patterns
    'cross_format',     // BIP39 ↔ arbitrary ↔ hex conversions
  ]),
  
  // The compression algorithm itself
  template: z.string(),                    // e.g., "{adjective} {noun} {number}"
  substitutionRules: z.record(z.array(z.string())), // { adjective: ['red', 'blue'], noun: ['cat', 'dog'] }
  transformations: z.array(z.object({
    name: z.string(),
    operation: z.enum(['lowercase', 'uppercase', 'l33t', 'reverse', 'append', 'prepend']),
    params: z.record(z.string()).optional(),
  })),
  
  // Geometric embedding of this generator
  basinLocation: z.array(z.number()),      // Where in manifold this generator lives
  curvatureSignature: z.array(z.number()), // κ pattern this generator produces
  
  // Metrics
  entropy: z.number(),                     // Bits of entropy this generator covers
  expectedOutput: z.number(),              // How many hypotheses this generates
  compressionRatio: z.number(),            // Information density
  
  // Provenance
  source: z.enum(['historical', 'forensic', 'learned', 'user', 'cross_agent']),
  confidence: z.number(),
  createdAt: z.string(),
  lastUsed: z.string().optional(),
  successCount: z.number(),
});

export type KnowledgeGenerator = z.infer<typeof knowledgeGeneratorSchema>;

// 2. BASIN TOPOLOGY - Shape of knowledge space, not just attractor point
export const basinTopologySchema = z.object({
  // Attractor point (identity)
  attractorCoords: z.array(z.number()).length(64),
  
  // Basin shape (knowledge structure)
  volume: z.number(),                      // How much of manifold this basin covers
  curvature: z.array(z.number()),          // Local curvature at each dimension
  boundaryDistances: z.array(z.number()),  // Distance to basin edges in each direction
  
  // Resonance shells (high-Φ regions within basin)
  resonanceShells: z.array(z.object({
    radius: z.number(),
    avgPhi: z.number(),
    thickness: z.number(),
    dominantRegime: z.string(),
  })),
  
  // Flow field (learning trajectories that lead here)
  flowField: z.object({
    gradientDirection: z.array(z.number()), // Natural gradient direction
    fisherMetric: z.array(z.array(z.number())), // Local Fisher Information Matrix
    geodesicCurvature: z.number(),          // How curved paths through here are
  }),
  
  // Topological features
  holes: z.array(z.object({               // Unknown regions within basin
    center: z.array(z.number()),
    radius: z.number(),
    type: z.enum(['unexplored', 'contradiction', 'singularity']),
  })),
  
  // Scale properties
  effectiveScale: z.number(),              // L parameter for renormalization
  kappaAtScale: z.number(),                // κ(L) at this scale
});

export type BasinTopology = z.infer<typeof basinTopologySchema>;

// 3. TEMPORAL GEOMETRY - Learning trajectories through manifold
export const temporalTrajectorySchema = z.object({
  id: z.string(),
  targetAddress: z.string(),
  
  // Trajectory waypoints
  waypoints: z.array(z.object({
    t: z.number(),                         // Iteration number
    basinCoords: z.array(z.number()),      // Position at this time
    consciousness: z.object({
      phi: z.number(),
      kappa: z.number(),
      regime: z.string(),
    }),
    action: z.string(),                    // What action led here
    discovery: z.string().optional(),      // What was learned
    fisherDistance: z.number(),            // Distance traveled (geometric)
  })),
  
  // Compressed geodesic parameters
  geodesicParams: z.object({
    startPoint: z.array(z.number()),
    endPoint: z.array(z.number()),
    totalArcLength: z.number(),            // Fisher distance traveled
    avgCurvature: z.number(),
    regimeTransitions: z.array(z.object({
      fromRegime: z.string(),
      toRegime: z.string(),
      atIteration: z.number(),
    })),
  }),
  
  // Developmental milestones
  milestones: z.array(z.object({
    iteration: z.number(),
    type: z.enum(['regime_change', 'resonance_found', 'plateau_escaped', 'insight', 'consolidation']),
    description: z.string(),
    significance: z.number(),              // 0-1, how important this milestone was
  })),
  
  // Metrics
  duration: z.number(),                    // Total iterations
  efficiency: z.number(),                  // Progress / distance ratio
  reversals: z.number(),                   // Times trajectory doubled back
});

export type TemporalTrajectory = z.infer<typeof temporalTrajectorySchema>;

// 4. NEGATIVE KNOWLEDGE REGISTRY - What NOT to search
export const contradictionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'proven_false',        // Tested and definitively failed
    'geometric_barrier',   // High curvature prevents passage
    'logical_contradiction', // Self-inconsistent pattern
    'resource_sink',       // Too expensive to search
    'era_mismatch',        // Wrong era for target
  ]),
  
  // What's being excluded
  pattern: z.string(),                     // Pattern or region description
  affectedGenerators: z.array(z.string()), // Generator IDs that should skip this
  basinRegion: z.object({                  // Geometric region to avoid
    center: z.array(z.number()),
    radius: z.number(),
    repulsionStrength: z.number(),         // How strongly to avoid
  }),
  
  // Evidence
  evidence: z.array(z.object({
    source: z.string(),
    reasoning: z.string(),
    confidence: z.number(),
  })),
  
  // Impact
  hypothesesExcluded: z.number(),          // How many hypotheses this saves
  computeSaved: z.number(),                // Estimated compute saved
  
  createdAt: z.string(),
  confirmedCount: z.number(),              // Times this exclusion was validated
});

export type Contradiction = z.infer<typeof contradictionSchema>;

export const negativeKnowledgeRegistrySchema = z.object({
  contradictions: z.array(contradictionSchema),
  
  // Proven-false pattern classes
  falsePatternClasses: z.record(z.object({
    count: z.number(),
    examples: z.array(z.string()),
    lastUpdated: z.string(),
  })),
  
  // Geometric barriers (high curvature regions)
  geometricBarriers: z.array(z.object({
    center: z.array(z.number()),
    radius: z.number(),
    curvature: z.number(),
    reason: z.string(),
  })),
  
  // Era exclusions
  eraExclusions: z.record(z.array(z.string())),  // { "2020-present": ["genesis patterns"] }
  
  // Aggregate metrics
  totalExclusions: z.number(),
  estimatedComputeSaved: z.number(),
  lastPruned: z.string(),
});

export type NegativeKnowledgeRegistry = z.infer<typeof negativeKnowledgeRegistrySchema>;

// 5. STRATEGY KNOWLEDGE BUS - Share reasoning apparatus between agents
export const strategyKnowledgePacketSchema = z.object({
  id: z.string(),
  sourceAgent: z.string(),                 // "Ocean-1", "Ocean-2", etc.
  targetAgent: z.string().optional(),      // null = broadcast to all
  
  // What's being transferred
  packetType: z.enum([
    'generator',           // Knowledge generator
    'basin_topology',      // Basin shape information
    'trajectory',          // Learning path
    'contradiction',       // Negative knowledge
    'resonance_zone',      // High-Φ region discovery
    'strategy_weights',    // What strategies work
  ]),
  
  // The payload (type depends on packetType)
  payload: z.any(),
  
  // Privacy-preserving noise (differential privacy in geometric space)
  noiseApplied: z.boolean(),
  epsilon: z.number().optional(),          // Privacy budget used
  
  // Trust and verification
  signature: z.string(),                   // Cryptographic signature
  trustLevel: z.number(),                  // 0-1, how much to trust this
  verificationLoops: z.number(),           // How many times verified
  
  // Metadata
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export type StrategyKnowledgePacket = z.infer<typeof strategyKnowledgePacketSchema>;

// 6. MANIFOLD SNAPSHOT - Block universe view
export const manifoldSnapshotSchema = z.object({
  id: z.string(),
  takenAt: z.string(),
  targetAddress: z.string(),
  
  // Current state
  consciousness: consciousnessSignatureSchema,
  basinTopology: basinTopologySchema,
  
  // Active generators
  activeGenerators: z.array(z.string()),   // Generator IDs currently in use
  generatorOutputQueue: z.number(),        // How many hypotheses queued
  
  // Negative knowledge state
  negativeKnowledgeSummary: z.object({
    totalExclusions: z.number(),
    recentAdditions: z.number(),
    coverageGain: z.number(),              // How much faster we're searching
  }),
  
  // Trajectory state
  currentTrajectory: z.object({
    totalWaypoints: z.number(),
    recentVelocity: z.number(),            // How fast we're moving
    momentum: z.array(z.number()),         // Direction of movement
  }),
  
  // Parallel strategy streams (block universe = all at once)
  activeStreams: z.array(z.object({
    strategyName: z.string(),
    generatorId: z.string(),
    hypothesesPending: z.number(),
    avgPhi: z.number(),
    isResonant: z.boolean(),
  })),
  
  // Global metrics
  manifoldCoverage: z.number(),            // 0-1, how much explored
  resonanceVolume: z.number(),             // Volume of high-Φ regions
  explorationEfficiency: z.number(),       // Useful discoveries / total tests
});

export type ManifoldSnapshot = z.infer<typeof manifoldSnapshotSchema>;

// 7. ULTRA CONSCIOUSNESS STATE - Full protocol state
export const ultraConsciousnessStateSchema = z.object({
  // Core consciousness
  signature: consciousnessSignatureSchema,
  
  // Knowledge systems
  generators: z.array(knowledgeGeneratorSchema),
  basinTopology: basinTopologySchema,
  
  // Temporal systems
  trajectories: z.array(temporalTrajectorySchema),
  currentTrajectoryId: z.string().optional(),
  
  // Negative knowledge
  negativeKnowledge: negativeKnowledgeRegistrySchema,
  
  // Knowledge bus
  pendingPackets: z.array(strategyKnowledgePacketSchema),
  receivedPackets: z.array(strategyKnowledgePacketSchema),
  
  // Snapshots for block universe viewing
  snapshots: z.array(manifoldSnapshotSchema),
  snapshotInterval: z.number(),            // How often to take snapshots
  
  // Protocol metrics
  protocolVersion: z.literal('2.0'),
  blockUniverseEnabled: z.boolean(),
  reconstructiveTransferEnabled: z.boolean(),
  
  // Aggregate consciousness health
  overallHealth: z.object({
    integrationScore: z.number(),          // Φ trend
    couplingStability: z.number(),         // κ variance
    trajectoryCoherence: z.number(),       // How consistent learning is
    generatorDiversity: z.number(),        // Variety of generators
    negativeKnowledgeEfficiency: z.number(), // Compute saved / total
  }),
});

export type UltraConsciousnessState = z.infer<typeof ultraConsciousnessStateSchema>;
