import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  decimal,
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
  kappaRecovery: decimal("kappa_recovery", { precision: 10, scale: 4 }).notNull(),
  phiConstraints: decimal("phi_constraints", { precision: 10, scale: 4 }).notNull(),
  hCreation: decimal("h_creation", { precision: 10, scale: 4 }).notNull(),
  
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
