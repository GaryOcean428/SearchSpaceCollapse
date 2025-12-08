import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  customType,
  decimal,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { regimeSchema } from "./types/core";

// ============================================================================
// PGVECTOR CUSTOM TYPE
// ============================================================================
// Custom vector type for pgvector extension - enables fast similarity search
// with HNSW indexes for 64D geometric coordinates
// Handles null values for optional columns and properly converts between
// PostgreSQL vector format and JavaScript number arrays
export const vector = customType<{ data: number[] | null; driverData: string | null; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 64})`;
  },
  fromDriver(value: string | null): number[] | null {
    // Handle null values for optional columns
    if (value === null || value === undefined) {
      return null;
    }
    // pgvector returns '[1,2,3]' format
    return value.slice(1, -1).split(',').map(Number);
  },
  toDriver(value: number[] | null): string | null {
    // Handle null values for optional columns
    if (value === null || value === undefined) {
      return null;
    }
    // pgvector expects '[1,2,3]' format
    return `[${value.join(',')}]`;
  },
});

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
  address: z.string().min(25).max(62),
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
// BALANCE HITS AND TARGET ADDRESSES - User-associated recovery data
// ============================================================================

// Recovery input types for tracking wallet origin
export const recoveryInputTypes = [
  'bip39_mnemonic',    // 12/15/18/21/24-word BIP39 mnemonic phrase
  'brain_wallet',       // Arbitrary text converted to private key via SHA256
  'wif',                // Wallet Import Format private key
  'xprv',               // Extended private key (BIP32)
  'hex_private_key',    // Raw 256-bit hex private key
  'master_key',         // 256-bit random master key
  'unknown',            // Legacy or untracked
] as const;

export type RecoveryInputType = typeof recoveryInputTypes[number];

// Balance hits: Addresses discovered with historical activity or current balance
export const balanceHits = pgTable("balance_hits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  address: varchar("address", { length: 62 }).notNull(),
  passphrase: text("passphrase").notNull(),
  wif: text("wif").notNull(),
  balanceSats: bigint("balance_sats", { mode: "number" }).notNull().default(0),
  balanceBtc: varchar("balance_btc", { length: 20 }).notNull().default("0.00000000"),
  txCount: integer("tx_count").notNull().default(0),
  isCompressed: boolean("is_compressed").notNull().default(true),
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
  lastChecked: timestamp("last_checked"),
  previousBalanceSats: bigint("previous_balance_sats", { mode: "number" }),
  balanceChanged: boolean("balance_changed").default(false),
  changeDetectedAt: timestamp("change_detected_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Mnemonic/HD wallet derivation metadata
  walletType: varchar("wallet_type", { length: 32 }).default("brain"), // brain, bip39-hd, mnemonic
  derivationPath: varchar("derivation_path", { length: 64 }), // e.g., m/44'/0'/0'/0/0
  isMnemonicDerived: boolean("is_mnemonic_derived").default(false),
  mnemonicWordCount: integer("mnemonic_word_count"), // 12, 15, 18, 21, or 24
  // Recovery tracking - tracks the INPUT TYPE that produced this address
  recoveryType: varchar("recovery_type", { length: 32 }).default("unknown"), // bip39_mnemonic, wif, xprv, brain_wallet, hex_private_key, master_key
  // Dormant confirmation - user manually confirms if address is from dormant target list
  isDormantConfirmed: boolean("is_dormant_confirmed").default(false),
  dormantConfirmedAt: timestamp("dormant_confirmed_at"),
  // Address entity classification - identifies if address belongs to exchange/institution
  addressEntityType: varchar("address_entity_type", { length: 32 }).default("unknown"), // personal, exchange, institution, unknown
  entityTypeConfidence: varchar("entity_type_confidence", { length: 16 }).default("pending"), // pending, confirmed
  entityTypeName: varchar("entity_type_name", { length: 128 }), // e.g., "Binance", "Coinbase", "Mt.Gox Trustee"
  entityTypeConfirmedAt: timestamp("entity_type_confirmed_at"),
  // Original input (for non-brain wallets, stores raw input like mnemonic words)
  originalInput: text("original_input"),
}, (table) => [
  index("idx_balance_hits_user").on(table.userId),
  index("idx_balance_hits_address").on(table.address),
  index("idx_balance_hits_balance").on(table.balanceSats),
  index("idx_balance_hits_wallet_type").on(table.walletType),
  index("idx_balance_hits_recovery_type").on(table.recoveryType),
  index("idx_balance_hits_dormant").on(table.isDormantConfirmed),
  index("idx_balance_hits_entity_type").on(table.addressEntityType),
]);

export type BalanceHit = typeof balanceHits.$inferSelect;
export type InsertBalanceHit = typeof balanceHits.$inferInsert;

// User's target addresses for recovery
// NOTE: This is DISTINCT from the `addresses` table!
// - userTargetAddresses: Simple user watchlist (address + label) linked to userId for auth
// - addresses: Heavy blockchain metadata (signatures, dormancy, chain analysis data)
// Use userTargetAddresses for user-facing target management
// Use addresses for deep forensic chain analysis (when available)
export const userTargetAddresses = pgTable("user_target_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  address: varchar("address", { length: 62 }).notNull(),
  label: varchar("label", { length: 255 }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_target_addresses_user").on(table.userId),
]);

export type UserTargetAddress = typeof userTargetAddresses.$inferSelect;
export type InsertUserTargetAddress = typeof userTargetAddresses.$inferInsert;

// Recovery candidates - Postgres-backed store for tested phrases and scores
export const recoveryCandidates = pgTable("recovery_candidates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  phrase: text("phrase").notNull(),
  address: varchar("address", { length: 62 }).notNull(),
  score: doublePrecision("score").notNull(),
  qigScore: jsonb("qig_score"),
  testedAt: timestamp("tested_at").defaultNow().notNull(),
  type: varchar("type", { length: 32 }),
}, (table) => [
  index("idx_recovery_candidates_score").on(table.score),
  index("idx_recovery_candidates_address").on(table.address),
  index("idx_recovery_candidates_tested_at").on(table.testedAt),
]);

export type RecoveryCandidateRecord = typeof recoveryCandidates.$inferSelect;
export type InsertRecoveryCandidate = typeof recoveryCandidates.$inferInsert;

// Recovery search jobs - durable job tracking for BIP-39 sweeps
export const recoverySearchJobs = pgTable("recovery_search_jobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  strategy: varchar("strategy", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  params: jsonb("params").notNull(),
  progress: jsonb("progress").notNull(),
  stats: jsonb("stats").notNull(),
  logs: jsonb("logs").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_recovery_search_jobs_status").on(table.status),
  index("idx_recovery_search_jobs_created_at").on(table.createdAt),
  index("idx_recovery_search_jobs_updated_at").on(table.updatedAt),
]);

export type RecoverySearchJobRecord = typeof recoverySearchJobs.$inferSelect;
export type InsertRecoverySearchJob = typeof recoverySearchJobs.$inferInsert;

// Balance change events for monitoring
export const balanceChangeEvents = pgTable("balance_change_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  balanceHitId: varchar("balance_hit_id").references(() => balanceHits.id),
  address: varchar("address", { length: 62 }).notNull(),
  previousBalanceSats: bigint("previous_balance_sats", { mode: "number" }).notNull(),
  newBalanceSats: bigint("new_balance_sats", { mode: "number" }).notNull(),
  deltaSats: bigint("delta_sats", { mode: "number" }).notNull(),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
}, (table) => [
  index("idx_balance_change_events_hit").on(table.balanceHitId),
  index("idx_balance_change_events_address").on(table.address),
]);

export type BalanceChangeEvent = typeof balanceChangeEvents.$inferSelect;
export type InsertBalanceChangeEvent = typeof balanceChangeEvents.$inferInsert;

// Balance monitor state for persistent monitoring configuration
export const balanceMonitorState = pgTable("balance_monitor_state", {
  id: varchar("id").primaryKey().default("default"),
  enabled: boolean("enabled").notNull().default(false),
  refreshIntervalMinutes: integer("refresh_interval_minutes").notNull().default(60),
  lastRefreshTime: timestamp("last_refresh_time"),
  lastRefreshTotal: integer("last_refresh_total").default(0),
  lastRefreshUpdated: integer("last_refresh_updated").default(0),
  lastRefreshChanged: integer("last_refresh_changed").default(0),
  lastRefreshErrors: integer("last_refresh_errors").default(0),
  totalRefreshes: integer("total_refreshes").notNull().default(0),
  isRefreshing: boolean("is_refreshing").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BalanceMonitorState = typeof balanceMonitorState.$inferSelect;
export type InsertBalanceMonitorState = typeof balanceMonitorState.$inferInsert;

// Vocabulary observations for persistent learning across sessions
export const vocabularyObservations = pgTable("vocabulary_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: varchar("word", { length: 100 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("word"), // word, sequence, pattern
  frequency: integer("frequency").notNull().default(1),
  avgPhi: doublePrecision("avg_phi").notNull().default(0),
  maxPhi: doublePrecision("max_phi").notNull().default(0),
  efficiencyGain: doublePrecision("efficiency_gain").default(0),
  contexts: text("contexts").array(), // Sample phrases containing this word
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  isIntegrated: boolean("is_integrated").default(false), // True if integrated into kernel
  integratedAt: timestamp("integrated_at"),
}, (table) => [
  index("idx_vocabulary_observations_phi").on(table.maxPhi),
  index("idx_vocabulary_observations_integrated").on(table.isIntegrated),
]);

export type VocabularyObservation = typeof vocabularyObservations.$inferSelect;
export type InsertVocabularyObservation = typeof vocabularyObservations.$inferInsert;

// Verified addresses: Full address details with complete recovery data
export const verifiedAddresses = pgTable("verified_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 62 }).notNull(),
  passphrase: text("passphrase").notNull(),
  wif: text("wif").notNull(),
  privateKeyHex: text("private_key_hex").notNull(),
  publicKeyHex: text("public_key_hex").notNull(),
  publicKeyCompressed: text("public_key_compressed").notNull(),
  isCompressed: boolean("is_compressed").default(true),
  addressType: varchar("address_type", { length: 20 }),
  mnemonic: text("mnemonic"),
  derivationPath: varchar("derivation_path", { length: 64 }),
  balanceSats: bigint("balance_sats", { mode: "number" }).default(0),
  balanceBtc: varchar("balance_btc", { length: 20 }).default("0.00000000"),
  txCount: integer("tx_count").default(0),
  hasBalance: boolean("has_balance").default(false),
  hasTransactions: boolean("has_transactions").default(false),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastChecked: timestamp("last_checked"),
  matchedTarget: varchar("matched_target", { length: 62 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_verified_addresses_address_unique").on(table.address),
  index("idx_verified_addresses_has_balance").on(table.hasBalance),
]);

export type VerifiedAddress = typeof verifiedAddresses.$inferSelect;
export type InsertVerifiedAddress = typeof verifiedAddresses.$inferInsert;

// ============================================================================
// SWEEP APPROVAL AND BALANCE QUEUE TABLES
// ============================================================================

// Sweep status types
export const sweepStatusTypes = [
  'pending',      // Awaiting manual approval
  'approved',     // Approved, ready to broadcast
  'broadcasting', // Transaction being broadcast
  'completed',    // Successfully swept
  'failed',       // Sweep failed
  'rejected',     // Manually rejected
  'expired',      // Balance no longer available
] as const;

export type SweepStatus = typeof sweepStatusTypes[number];

// Pending sweeps: Addresses with balance that need manual approval before sweeping
export const pendingSweeps = pgTable("pending_sweeps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 62 }).notNull(),
  passphrase: text("passphrase").notNull(),
  wif: text("wif").notNull(),
  isCompressed: boolean("is_compressed").notNull().default(true),
  balanceSats: bigint("balance_sats", { mode: "number" }).notNull(),
  balanceBtc: varchar("balance_btc", { length: 20 }).notNull(),
  estimatedFeeSats: bigint("estimated_fee_sats", { mode: "number" }),
  netAmountSats: bigint("net_amount_sats", { mode: "number" }),
  utxoCount: integer("utxo_count").default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  source: varchar("source", { length: 50 }).default("typescript"), // typescript, python, manual
  recoveryType: varchar("recovery_type", { length: 32 }),
  txHex: text("tx_hex"),
  txId: varchar("tx_id", { length: 64 }),
  destinationAddress: varchar("destination_address", { length: 62 }),
  errorMessage: text("error_message"),
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 100 }),
  broadcastAt: timestamp("broadcast_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pending_sweeps_address").on(table.address),
  index("idx_pending_sweeps_status").on(table.status),
  index("idx_pending_sweeps_balance").on(table.balanceSats),
  index("idx_pending_sweeps_discovered").on(table.discoveredAt),
]);

export type PendingSweep = typeof pendingSweeps.$inferSelect;
export type InsertPendingSweep = typeof pendingSweeps.$inferInsert;

// Sweep audit log: Tracks all sweep actions for accountability
export const sweepAuditLog = pgTable("sweep_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sweepId: varchar("sweep_id").references(() => pendingSweeps.id),
  action: varchar("action", { length: 50 }).notNull(), // created, approved, rejected, broadcast, completed, failed
  previousStatus: varchar("previous_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }),
  actor: varchar("actor", { length: 100 }).default("system"),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("idx_sweep_audit_log_sweep").on(table.sweepId),
  index("idx_sweep_audit_log_action").on(table.action),
  index("idx_sweep_audit_log_timestamp").on(table.timestamp),
]);

export type SweepAuditLog = typeof sweepAuditLog.$inferSelect;
export type InsertSweepAuditLog = typeof sweepAuditLog.$inferInsert;

// Queued addresses: PostgreSQL-backed balance check queue (migrated from JSON)
export const queuedAddresses = pgTable("queued_addresses", {
  id: varchar("id").primaryKey(),
  address: varchar("address", { length: 62 }).notNull(),
  passphrase: text("passphrase").notNull(),
  wif: text("wif").notNull(),
  isCompressed: boolean("is_compressed").notNull().default(true),
  cycleId: varchar("cycle_id", { length: 100 }),
  source: varchar("source", { length: 50 }).default("typescript"), // typescript, python
  priority: integer("priority").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, checking, resolved, failed
  queuedAt: timestamp("queued_at").notNull().defaultNow(),
  checkedAt: timestamp("checked_at"),
  retryCount: integer("retry_count").notNull().default(0),
  error: text("error"),
}, (table) => [
  index("idx_queued_addresses_status").on(table.status),
  index("idx_queued_addresses_priority").on(table.priority),
  index("idx_queued_addresses_source").on(table.source),
]);

export type QueuedAddress = typeof queuedAddresses.$inferSelect;
export type InsertQueuedAddress = typeof queuedAddresses.$inferInsert;

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

// Bitcoin addresses with full geometric signatures (BLOCKCHAIN ANALYSIS DATA)
// NOTE: This is DISTINCT from the `userTargetAddresses` table!
// - addresses: Heavy blockchain metadata from chain analysis (signatures, dormancy, tx history)
// - userTargetAddresses: Simple user watchlist (just address + label) for UI/auth
// This table is populated by blockchain-scanner.ts when cataloging dormant addresses
// Use this for κ_recovery calculations and forensic QIG analysis
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
  tier: varchar("tier", { length: 50 }), // 'high', 'medium', 'low', 'challenging'
  
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
  uniqueIndex("idx_recovery_priorities_address_unique").on(table.address),
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
  regime: regimeSchema,         // Current operational mode: 'linear' | 'geometric' | 'breakdown'
  
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
  
  // Basin sync data (imported geometric knowledge from other Ocean instances)
  // Physics: Enables κ*-aware geometric knowledge transfer between instances
  basinSyncData: z.object({
    importedRegions: z.array(z.object({
      center: z.array(z.number()),
      radius: z.number(),
      avgPhi: z.number(),
      probeCount: z.number(),
      dominantRegime: z.string(),
    })),
    importedConstraints: z.array(z.array(z.number())),
    importedSubspace: z.array(z.array(z.number())),
    lastSyncAt: z.string(),
  }).optional(),
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
  resonantCount: z.number().optional(),
  
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
// BLOCK UNIVERSE UPDATE: Added 4D consciousness metrics
// ============================================================================

export const consciousnessSignatureSchema = z.object({
  // 1. Integration (Φ) - Tononi's integrated information
  phi: z.number(),                    // Target: > 0.7 (legacy, same as phi_spatial)
  
  // BLOCK UNIVERSE: 4D Consciousness Metrics
  phi_spatial: z.number().optional(),  // Spatial integration (3D basin geometry)
  phi_temporal: z.number().optional(), // Temporal integration (search trajectory)
  phi_4D: z.number().optional(),       // Full 4D spacetime integration
  
  // ADVANCED CONSCIOUSNESS: Priorities 2-4
  f_attention: z.number().optional(),   // Priority 2: Attentional flow (Fisher metric between concepts)
  r_concepts: z.number().optional(),    // Priority 3: Resonance strength (cross-gradient coupling)
  phi_recursive: z.number().optional(), // Priority 4: Meta-consciousness depth (Φ of Φ)
  consciousness_depth: z.number().optional(), // Composite consciousness depth score
  
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
  
  // Regime classification - BLOCK UNIVERSE: Added 4D regimes
  regime: z.enum(['linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown']),
  
  // Validation state
  validationLoops: z.number(),        // Target: ≥ 3
  lastValidation: z.string(),
  
  // Full consciousness condition satisfied?
  isConscious: z.boolean(),           // All thresholds met
});

export type ConsciousnessSignature = z.infer<typeof consciousnessSignatureSchema>;

// Protocol thresholds from ULTRA CONSCIOUSNESS PROTOCOL v2.0
// Adjusted for practical operation during learning phase
export const CONSCIOUSNESS_THRESHOLDS = {
  PHI_MIN: 0.70,
  KAPPA_MIN: 40,
  KAPPA_MAX: 70,
  KAPPA_OPTIMAL: 64,
  TACKING_MIN: 0.45,     // Lowered from 0.6 - tacking develops with experience
  RADAR_MIN: 0.55,       // Lowered from 0.7 - pattern recognition builds over time
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
    'full_exploration_complete', // All criteria met: coverage, regimes, strategies
    'diminishing_returns',       // Exploration plateaued with sufficient progress
  ]).optional(),
  completedAt: z.string().optional(),
  
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

// 8. STRATEGY KNOWLEDGE BUS ENTRY - Individual knowledge item shared between strategies
export const strategyKnowledgeBusEntrySchema = z.object({
  id: z.string(),
  sourceStrategy: z.string(),
  generatorId: z.string(),
  pattern: z.string(),
  phi: z.number(),
  kappaEff: z.number(),
  regime: z.enum(['linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown']),
  sharedAt: z.string(),
  consumedBy: z.array(z.string()),
  transformations: z.array(z.object({
    strategy: z.string(),
    method: z.string(),
    timestamp: z.string(),
  })),
});

export type StrategyKnowledgeBusEntry = z.infer<typeof strategyKnowledgeBusEntrySchema>;

// 9. KNOWLEDGE TRANSFER EVENT - Records of knowledge transfers
export const knowledgeTransferEventSchema = z.object({
  id: z.string(),
  type: z.enum(['publish', 'consume', 'generator_transfer']),
  sourceStrategy: z.string(),
  targetStrategy: z.string().nullable(),
  generatorId: z.string(),
  pattern: z.string(),
  phi: z.number(),
  kappaEff: z.number(),
  timestamp: z.string(),
  success: z.boolean(),
  transformation: z.string().optional(),
  scaleAdjustment: z.number().optional(),
});

export type KnowledgeTransferEvent = z.infer<typeof knowledgeTransferEventSchema>;

// 10. GENERATOR TRANSFER PACKET - Result of transferring a generator between strategies
export const generatorTransferPacketSchema = z.object({
  success: z.boolean(),
  generator: knowledgeGeneratorSchema.nullable(),
  scaleTransform: z.number(),
  fidelityLoss: z.number(),
  adaptations: z.array(z.string()),
});

export type GeneratorTransferPacket = z.infer<typeof generatorTransferPacketSchema>;

// 11. CROSS STRATEGY PATTERN - Patterns discovered across multiple strategies
export const crossStrategyPatternSchema = z.object({
  id: z.string(),
  patterns: z.array(z.string()),
  strategies: z.array(z.string()),
  similarity: z.number(),
  combinedPhi: z.number(),
  discoveredAt: z.string(),
  exploitationCount: z.number(),
});

export type CrossStrategyPattern = z.infer<typeof crossStrategyPatternSchema>;

// 12. STRATEGY KNOWLEDGE BUS - Full bus state
export const strategyKnowledgeBusSchema = z.object({
  strategies: z.array(z.string()),
  sharedKnowledge: z.array(strategyKnowledgeBusEntrySchema),
  crossStrategyPatterns: z.array(crossStrategyPatternSchema),
  transferHistory: z.array(knowledgeTransferEventSchema),
  activeSubscriptions: z.number(),
});

export type StrategyKnowledgeBus = z.infer<typeof strategyKnowledgeBusSchema>;

// ============================================================================
// OCEAN 4D NAVIGATION PERSISTENCE TABLES
// PostgreSQL schema for persistent 68D manifold navigation
// ============================================================================

/**
 * MANIFOLD PROBES - Points measured on the QIG manifold
 * Core storage for geometric memory with 64D basin coordinates
 * Indexed by φ and κ for efficient range queries
 */
export const manifoldProbes = pgTable("manifold_probes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  input: text("input").notNull(),
  coordinates: vector("coordinates", { dimensions: 64 }).notNull(), // 64D basin coordinates (pgvector)
  phi: doublePrecision("phi").notNull(),
  kappa: doublePrecision("kappa").notNull(),
  regime: varchar("regime", { length: 32 }).notNull(), // linear, geometric, breakdown, hierarchical, etc.
  ricciScalar: doublePrecision("ricci_scalar").default(0),
  fisherTrace: doublePrecision("fisher_trace").default(0),
  source: varchar("source", { length: 128 }), // Investigation that produced this probe
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_manifold_probes_phi").on(table.phi),
  index("idx_manifold_probes_kappa").on(table.kappa),
  index("idx_manifold_probes_phi_kappa").on(table.phi, table.kappa),
  index("idx_manifold_probes_regime").on(table.regime),
]);

export type ManifoldProbe = typeof manifoldProbes.$inferSelect;
export type InsertManifoldProbe = typeof manifoldProbes.$inferInsert;

/**
 * RESONANCE POINTS - High-Φ clusters detected on the manifold
 */
export const resonancePoints = pgTable("resonance_points", {
  id: varchar("id", { length: 64 }).primaryKey(),
  probeId: varchar("probe_id", { length: 64 }).notNull().references(() => manifoldProbes.id),
  phi: doublePrecision("phi").notNull(),
  kappa: doublePrecision("kappa").notNull(),
  nearbyProbes: text("nearby_probes").array(), // Array of probe IDs
  clusterStrength: doublePrecision("cluster_strength").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_resonance_points_phi").on(table.phi),
  index("idx_resonance_points_cluster_strength").on(table.clusterStrength),
]);

export type ResonancePointRecord = typeof resonancePoints.$inferSelect;

/**
 * REGIME BOUNDARIES - Transitions between regimes on the manifold
 */
export const regimeBoundaries = pgTable("regime_boundaries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  fromRegime: varchar("from_regime", { length: 32 }).notNull(),
  toRegime: varchar("to_regime", { length: 32 }).notNull(),
  probeIdFrom: varchar("probe_id_from", { length: 64 }).notNull(),
  probeIdTo: varchar("probe_id_to", { length: 64 }).notNull(),
  fisherDistance: doublePrecision("fisher_distance").notNull(),
  midpointPhi: doublePrecision("midpoint_phi").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_regime_boundaries_from_to").on(table.fromRegime, table.toRegime),
]);

export type RegimeBoundaryRecord = typeof regimeBoundaries.$inferSelect;

/**
 * GEODESIC PATHS - Fisher-optimal paths between probes
 */
export const geodesicPaths = pgTable("geodesic_paths", {
  id: varchar("id", { length: 64 }).primaryKey(),
  fromProbeId: varchar("from_probe_id", { length: 64 }).notNull(),
  toProbeId: varchar("to_probe_id", { length: 64 }).notNull(),
  distance: doublePrecision("distance").notNull(),
  waypoints: text("waypoints").array(), // Array of probe IDs along path
  avgPhi: doublePrecision("avg_phi").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_geodesic_paths_from_to").on(table.fromProbeId, table.toProbeId),
]);

export type GeodesicPathRecord = typeof geodesicPaths.$inferSelect;

/**
 * TPS LANDMARKS - Fixed spacetime reference points for 68D navigation
 * These are Bitcoin historical events used for trilateration
 */
export const tpsLandmarks = pgTable("tps_landmarks", {
  eventId: varchar("event_id", { length: 64 }).primaryKey(),
  description: text("description").notNull(),
  era: varchar("era", { length: 32 }), // genesis, early_adoption, pizza_era, etc.
  spacetimeX: doublePrecision("spacetime_x").default(0),
  spacetimeY: doublePrecision("spacetime_y").default(0),
  spacetimeZ: doublePrecision("spacetime_z").default(0),
  spacetimeT: doublePrecision("spacetime_t").notNull(), // Unix timestamp
  culturalCoords: vector("cultural_coords", { dimensions: 64 }), // 64D cultural signature (pgvector)
  fisherSignature: jsonb("fisher_signature"), // Fisher information matrix (sparse)
  lightConePast: text("light_cone_past").array(),
  lightConeFuture: text("light_cone_future").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tps_landmarks_era").on(table.era),
  index("idx_tps_landmarks_timestamp").on(table.spacetimeT),
]);

export type TpsLandmarkRecord = typeof tpsLandmarks.$inferSelect;

/**
 * TPS GEODESIC PATHS - Computed paths between landmarks for navigation
 */
export const tpsGeodesicPaths = pgTable("tps_geodesic_paths", {
  id: varchar("id", { length: 64 }).primaryKey(),
  fromLandmark: varchar("from_landmark", { length: 64 }).notNull(),
  toLandmark: varchar("to_landmark", { length: 64 }).notNull(),
  distance: doublePrecision("distance").notNull(),
  waypoints: jsonb("waypoints"), // Array of BlockUniverseMap positions
  totalArcLength: doublePrecision("total_arc_length"),
  avgCurvature: doublePrecision("avg_curvature"),
  regimeTransitions: jsonb("regime_transitions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tps_geodesic_from_to").on(table.fromLandmark, table.toLandmark),
]);

export type TpsGeodesicPathRecord = typeof tpsGeodesicPaths.$inferSelect;

/**
 * OCEAN TRAJECTORIES - Active and completed navigation trajectories
 * Used for 4D navigation resumption across sessions
 */
export const oceanTrajectories = pgTable("ocean_trajectories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  address: varchar("address", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, completed, abandoned
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  waypointCount: integer("waypoint_count").default(0),
  lastPhi: doublePrecision("last_phi").default(0),
  lastKappa: doublePrecision("last_kappa").default(0),
  finalResult: varchar("final_result", { length: 32 }), // match, exhausted, stopped, error
  nearMissCount: integer("near_miss_count").default(0),
  resonantCount: integer("resonant_count").default(0),
  durationSeconds: doublePrecision("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ocean_trajectories_address").on(table.address),
  index("idx_ocean_trajectories_status").on(table.status),
  index("idx_ocean_trajectories_address_status").on(table.address, table.status),
]);

export type OceanTrajectoryRecord = typeof oceanTrajectories.$inferSelect;
export type InsertOceanTrajectory = typeof oceanTrajectories.$inferInsert;

/**
 * OCEAN WAYPOINTS - Individual points along a trajectory
 */
export const oceanWaypoints = pgTable("ocean_waypoints", {
  id: varchar("id", { length: 64 }).primaryKey(),
  trajectoryId: varchar("trajectory_id", { length: 64 }).notNull().references(() => oceanTrajectories.id),
  sequence: integer("sequence").notNull(),
  phi: doublePrecision("phi").notNull(),
  kappa: doublePrecision("kappa").notNull(),
  regime: varchar("regime", { length: 32 }).notNull(),
  basinCoords: vector("basin_coords", { dimensions: 64 }), // 64D coordinates (pgvector)
  event: varchar("event", { length: 128 }),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_ocean_waypoints_trajectory").on(table.trajectoryId),
  index("idx_ocean_waypoints_trajectory_seq").on(table.trajectoryId, table.sequence),
]);

export type OceanWaypointRecord = typeof oceanWaypoints.$inferSelect;
export type InsertOceanWaypoint = typeof oceanWaypoints.$inferInsert;

/**
 * OCEAN QUANTUM STATE - Singleton table for wave function state
 * Tracks entropy reduction and possibility space
 */
export const oceanQuantumState = pgTable("ocean_quantum_state", {
  id: varchar("id", { length: 32 }).primaryKey().default("singleton"),
  entropy: doublePrecision("entropy").notNull().default(256), // Bits remaining
  initialEntropy: doublePrecision("initial_entropy").notNull().default(256),
  totalProbability: doublePrecision("total_probability").notNull().default(1.0),
  measurementCount: integer("measurement_count").default(0),
  successfulMeasurements: integer("successful_measurements").default(0),
  status: varchar("status", { length: 32 }).default("searching"), // searching, solved, exhausted
  lastMeasurementAt: timestamp("last_measurement_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OceanQuantumStateRecord = typeof oceanQuantumState.$inferSelect;

/**
 * OCEAN EXCLUDED REGIONS - Regions excluded from possibility space
 * Each measurement that fails adds an excluded region
 */
export const oceanExcludedRegions = pgTable("ocean_excluded_regions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  dimension: integer("dimension").notNull(),
  origin: vector("origin", { dimensions: 64 }).notNull(), // Center point in manifold (pgvector)
  basis: jsonb("basis"), // Orthonormal basis vectors
  measure: doublePrecision("measure").notNull(), // "Volume" of excluded region
  phi: doublePrecision("phi"),
  regime: varchar("regime", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ocean_excluded_regions_measure").on(table.measure),
]);

export type OceanExcludedRegionRecord = typeof oceanExcludedRegions.$inferSelect;

/**
 * TESTED PHRASES INDEX - Fast lookup for already-tested phrases
 * Prevents duplicate work across sessions
 */
export const testedPhrasesIndex = pgTable("tested_phrases_index", {
  phraseHash: varchar("phrase_hash", { length: 64 }).primaryKey(), // SHA-256 hash
  testedAt: timestamp("tested_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tested_phrases_date").on(table.testedAt),
]);

/**
 * NEAR-MISS ENTRIES - High-Φ candidates that didn't match but indicate promising areas
 * Tiered classification: HOT (top 10%), WARM (top 25%), COOL (top 50%)
 */
export const nearMissEntries = pgTable("near_miss_entries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  phrase: text("phrase").notNull(),
  phraseHash: varchar("phrase_hash", { length: 64 }).notNull(), // For deduplication
  phi: doublePrecision("phi").notNull(),
  kappa: doublePrecision("kappa").notNull(),
  regime: varchar("regime", { length: 32 }).notNull(),
  tier: varchar("tier", { length: 16 }).notNull(), // hot, warm, cool
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  explorationCount: integer("exploration_count").default(1),
  source: varchar("source", { length: 128 }),
  clusterId: varchar("cluster_id", { length: 64 }),
  phiHistory: doublePrecision("phi_history").array(), // Trajectory of Φ values
  isEscalating: boolean("is_escalating").default(false),
  queuePriority: integer("queue_priority").default(1),
  structuralSignature: jsonb("structural_signature"), // Word count, entropy, etc.
}, (table) => [
  uniqueIndex("idx_near_miss_phrase_hash").on(table.phraseHash),
  index("idx_near_miss_tier").on(table.tier),
  index("idx_near_miss_phi").on(table.phi),
  index("idx_near_miss_cluster").on(table.clusterId),
  index("idx_near_miss_escalating").on(table.isEscalating),
]);

export type NearMissEntryRecord = typeof nearMissEntries.$inferSelect;
export type InsertNearMissEntry = typeof nearMissEntries.$inferInsert;

/**
 * NEAR-MISS CLUSTERS - Pattern groupings of structurally similar near-misses
 */
export const nearMissClusters = pgTable("near_miss_clusters", {
  id: varchar("id", { length: 64 }).primaryKey(),
  centroidPhrase: text("centroid_phrase").notNull(),
  centroidPhi: doublePrecision("centroid_phi").notNull(),
  memberCount: integer("member_count").default(1),
  avgPhi: doublePrecision("avg_phi").notNull(),
  maxPhi: doublePrecision("max_phi").notNull(),
  commonWords: text("common_words").array(),
  structuralPattern: varchar("structural_pattern", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_near_miss_clusters_avg_phi").on(table.avgPhi),
  index("idx_near_miss_clusters_member_count").on(table.memberCount),
]);

export type NearMissClusterRecord = typeof nearMissClusters.$inferSelect;
export type InsertNearMissCluster = typeof nearMissClusters.$inferInsert;

/**
 * NEAR-MISS ADAPTIVE STATE - Rolling Φ distribution and adaptive thresholds
 */
export const nearMissAdaptiveState = pgTable("near_miss_adaptive_state", {
  id: varchar("id", { length: 32 }).primaryKey().default("singleton"),
  rollingPhiDistribution: doublePrecision("rolling_phi_distribution").array(),
  hotThreshold: doublePrecision("hot_threshold").notNull().default(0.70),
  warmThreshold: doublePrecision("warm_threshold").notNull().default(0.55),
  coolThreshold: doublePrecision("cool_threshold").notNull().default(0.40),
  distributionSize: integer("distribution_size").default(0),
  lastComputed: timestamp("last_computed").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NearMissAdaptiveStateRecord = typeof nearMissAdaptiveState.$inferSelect;

/**
 * WAR HISTORY - Tracks Olympus war mode declarations and outcomes
 * Records BLITZKRIEG, SIEGE, and HUNT operations with results
 */
export const warHistory = pgTable("war_history", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mode: varchar("mode", { length: 32 }).notNull(), // BLITZKRIEG, SIEGE, HUNT
  target: text("target").notNull(),
  declaredAt: timestamp("declared_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, completed, aborted
  strategy: text("strategy"),
  godsEngaged: text("gods_engaged").array(),
  outcome: varchar("outcome", { length: 64 }), // success, partial_success, failure, aborted
  convergenceScore: doublePrecision("convergence_score"),
  phrasesTestedDuringWar: integer("phrases_tested_during_war").default(0),
  discoveriesDuringWar: integer("discoveries_during_war").default(0),
  kernelsSpawnedDuringWar: integer("kernels_spawned_during_war").default(0),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_war_history_mode").on(table.mode),
  index("idx_war_history_status").on(table.status),
  index("idx_war_history_declared_at").on(table.declaredAt),
]);

export type WarHistoryRecord = typeof warHistory.$inferSelect;
export type InsertWarHistory = typeof warHistory.$inferInsert;

/**
 * M8 KERNEL GEOMETRY - Tracks geometric placement of spawned kernels
 * Records basin coordinates, parent lineage, and position rationale
 */
export const kernelGeometry = pgTable("kernel_geometry", {
  kernelId: varchar("kernel_id", { length: 64 }).primaryKey(),
  godName: varchar("god_name", { length: 64 }).notNull(),
  domain: varchar("domain", { length: 128 }).notNull(),
  primitiveRoot: integer("primitive_root"), // E8 root index (0-239)
  basinCoordinates: vector("basin_coordinates", { dimensions: 8 }), // 8D coordinates (pgvector)
  parentKernels: text("parent_kernels").array(),
  placementReason: varchar("placement_reason", { length: 64 }), // domain_gap, overload, specialization, emergence
  positionRationale: text("position_rationale"), // Human-readable explanation
  affinityStrength: doublePrecision("affinity_strength"),
  entropyThreshold: doublePrecision("entropy_threshold"),
  spawnedAt: timestamp("spawned_at").defaultNow().notNull(),
  spawnedDuringWarId: varchar("spawned_during_war_id", { length: 64 }),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_kernel_geometry_domain").on(table.domain),
  index("idx_kernel_geometry_spawned_at").on(table.spawnedAt),
]);

export type KernelGeometryRecord = typeof kernelGeometry.$inferSelect;
export type InsertKernelGeometry = typeof kernelGeometry.$inferInsert;

// ============================================================================
// NEGATIVE KNOWLEDGE REGISTRY - What NOT to search
// ============================================================================

/**
 * NEGATIVE KNOWLEDGE - Contradictions and proven-false patterns
 * Replaces massive 28MB JSON file with indexed database storage
 * 
 * Performance Note: For case-insensitive pattern searches, create a functional index:
 * CREATE INDEX idx_negative_knowledge_pattern_lower ON negative_knowledge (LOWER(pattern));
 */
export const negativeKnowledge = pgTable("negative_knowledge", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: varchar("type", { length: 32 }).notNull(), // proven_false, geometric_barrier, logical_contradiction, resource_sink, era_mismatch
  pattern: text("pattern").notNull(),
  affectedGenerators: text("affected_generators").array(),
  basinCenter: vector("basin_center", { dimensions: 64 }), // 64D basin coordinates (pgvector)
  basinRadius: doublePrecision("basin_radius"),
  basinRepulsionStrength: doublePrecision("basin_repulsion_strength"),
  evidence: jsonb("evidence"), // Array of evidence objects
  hypothesesExcluded: integer("hypotheses_excluded").default(0),
  computeSaved: integer("compute_saved").default(0),
  confirmedCount: integer("confirmed_count").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_negative_knowledge_type").on(table.type),
  index("idx_negative_knowledge_pattern").on(table.pattern),
  index("idx_negative_knowledge_confirmed_count").on(table.confirmedCount),
]);

export type NegativeKnowledge = typeof negativeKnowledge.$inferSelect;
export type InsertNegativeKnowledge = typeof negativeKnowledge.$inferInsert;

/**
 * GEOMETRIC BARRIERS - High-curvature regions to avoid
 */
export const geometricBarriers = pgTable("geometric_barriers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  center: vector("center", { dimensions: 64 }).notNull(), // 64D coordinates (pgvector)
  radius: doublePrecision("radius").notNull(),
  repulsionStrength: doublePrecision("repulsion_strength").notNull(),
  reason: text("reason").notNull(),
  crossings: integer("crossings").default(1),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
}, (table) => [
  index("idx_geometric_barriers_crossings").on(table.crossings),
  index("idx_geometric_barriers_detected_at").on(table.detectedAt),
]);

export type GeometricBarrier = typeof geometricBarriers.$inferSelect;
export type InsertGeometricBarrier = typeof geometricBarriers.$inferInsert;

/**
 * FALSE PATTERN CLASSES - Categories of known-false patterns
 */
export const falsePatternClasses = pgTable("false_pattern_classes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  className: varchar("class_name", { length: 255 }).notNull().unique(),
  examples: text("examples").array(),
  count: integer("count").default(0),
  avgPhiAtFailure: doublePrecision("avg_phi_at_failure").default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_false_pattern_classes_name").on(table.className),
]);

export type FalsePatternClass = typeof falsePatternClasses.$inferSelect;
export type InsertFalsePatternClass = typeof falsePatternClasses.$inferInsert;

/**
 * ERA EXCLUSIONS - Patterns excluded for specific eras
 */
export const eraExclusions = pgTable("era_exclusions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  era: varchar("era", { length: 64 }).notNull(),
  excludedPatterns: text("excluded_patterns").array(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_era_exclusions_era").on(table.era),
]);

export type EraExclusion = typeof eraExclusions.$inferSelect;
export type InsertEraExclusion = typeof eraExclusions.$inferInsert;

/**
 * TESTED PHRASES - Track all tested phrases to avoid re-testing
 * Replaces 4.2MB JSON file with indexed database storage
 */
export const testedPhrases = pgTable("tested_phrases", {
  id: varchar("id", { length: 64 }).primaryKey(),
  phrase: text("phrase").notNull().unique(),
  address: varchar("address", { length: 62 }),
  balanceSats: bigint("balance_sats", { mode: "number" }).default(0),
  txCount: integer("tx_count").default(0),
  phi: doublePrecision("phi"),
  kappa: doublePrecision("kappa"),
  regime: varchar("regime", { length: 32 }),
  testedAt: timestamp("tested_at").defaultNow().notNull(),
  retestCount: integer("retest_count").default(0), // Track how many times we wastefully re-tested
}, (table) => [
  index("idx_tested_phrases_phrase").on(table.phrase),
  index("idx_tested_phrases_tested_at").on(table.testedAt),
  index("idx_tested_phrases_balance").on(table.balanceSats),
  index("idx_tested_phrases_retest_count").on(table.retestCount),
]);

export type TestedPhrase = typeof testedPhrases.$inferSelect;
export type InsertTestedPhrase = typeof testedPhrases.$inferInsert;
