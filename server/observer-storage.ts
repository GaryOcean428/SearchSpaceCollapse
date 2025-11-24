import { db } from "./db";
import {
  blocks,
  transactions,
  addresses,
  entities,
  artifacts,
  recoveryPriorities,
  recoveryWorkflows,
  type Block,
  type Transaction,
  type Address,
  type Entity,
  type Artifact,
  type RecoveryPriority,
  type RecoveryWorkflow
} from "@shared/schema";
import { eq, and, or, gte, lte, desc, asc, sql } from "drizzle-orm";

export interface IObserverStorage {
  // Block operations
  saveBlock(block: Omit<Block, "createdAt">): Promise<Block>;
  getBlock(height: number): Promise<Block | null>;
  getBlocks(startHeight: number, endHeight: number): Promise<Block[]>;
  getLatestBlockHeight(): Promise<number | null>;
  
  // Transaction operations
  saveTransaction(tx: Omit<Transaction, "createdAt">): Promise<Transaction>;
  getTransaction(txid: string): Promise<Transaction | null>;
  getTransactionsForBlock(blockHeight: number): Promise<Transaction[]>;
  
  // Address operations
  saveAddress(address: Omit<Address, "createdAt" | "updatedAt">): Promise<Address>;
  updateAddress(addressStr: string, updates: Partial<Address>): Promise<void>;
  getAddress(addressStr: string): Promise<Address | null>;
  getDormantAddresses(filters?: {
    minBalance?: number;
    minInactivityDays?: number;
    limit?: number;
    offset?: number;
  }): Promise<Address[]>;
  getAllAddresses(limit?: number, offset?: number): Promise<Address[]>;
  
  // Entity operations
  saveEntity(entity: Omit<Entity, "createdAt" | "updatedAt">): Promise<Entity>;
  updateEntity(id: string, updates: Partial<Entity>): Promise<void>;
  getEntity(id: string): Promise<Entity | null>;
  getEntities(type?: string): Promise<Entity[]>;
  searchEntities(filters?: {
    name?: string;
    bitcoinTalkUsername?: string;
    githubUsername?: string;
    email?: string;
    alias?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Entity[]>;
  findEntityByIdentity(identity: {
    bitcoinTalkUsername?: string;
    githubUsername?: string;
    email?: string;
  }): Promise<Entity | null>;
  
  // Artifact operations
  saveArtifact(artifact: Omit<Artifact, "createdAt">): Promise<Artifact>;
  getArtifacts(filters?: { entityId?: string; source?: string }): Promise<Artifact[]>;
  
  // Recovery priority operations
  saveRecoveryPriority(priority: Omit<RecoveryPriority, "createdAt" | "updatedAt">): Promise<RecoveryPriority>;
  updateRecoveryPriority(id: string, updates: Partial<RecoveryPriority>): Promise<void>;
  getRecoveryPriorities(filters?: {
    minKappa?: number;
    maxKappa?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RecoveryPriority[]>;
  getRecoveryPriority(address: string): Promise<RecoveryPriority | null>;
  
  // Recovery workflow operations
  saveRecoveryWorkflow(workflow: Omit<RecoveryWorkflow, "createdAt" | "updatedAt">): Promise<RecoveryWorkflow>;
  updateRecoveryWorkflow(id: string, updates: Partial<RecoveryWorkflow>): Promise<void>;
  getRecoveryWorkflows(filters?: {
    address?: string;
    vector?: string;
    status?: string;
  }): Promise<RecoveryWorkflow[]>;
  getRecoveryWorkflow(id: string): Promise<RecoveryWorkflow | null>;
}

export class ObserverStorage implements IObserverStorage {
  async saveBlock(block: Omit<Block, "createdAt">): Promise<Block> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db.insert(blocks)
      .values(block)
      .onConflictDoNothing({ target: blocks.height })
      .returning();
    // If conflict (block already exists), fetch and return it
    if (!saved) {
      const existing = await this.getBlock(block.height);
      if (!existing) throw new Error(`Failed to save or retrieve block ${block.height}`);
      return existing;
    }
    return saved;
  }

  async getBlock(height: number): Promise<Block | null> {
    if (!db) throw new Error("Database not initialized");
    const [block] = await db.select().from(blocks).where(eq(blocks.height, height)).limit(1);
    return block || null;
  }

  async getBlocks(startHeight: number, endHeight: number): Promise<Block[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(blocks)
      .where(and(
        gte(blocks.height, startHeight),
        lte(blocks.height, endHeight)
      ))
      .orderBy(asc(blocks.height));
  }

  async getLatestBlockHeight(): Promise<number | null> {
    if (!db) throw new Error("Database not initialized");
    const [result] = await db.select({ maxHeight: sql<number>`MAX(${blocks.height})` })
      .from(blocks)
      .limit(1);
    return result?.maxHeight ?? null;
  }

  async saveTransaction(tx: Omit<Transaction, "createdAt">): Promise<Transaction> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db.insert(transactions)
      .values(tx)
      .onConflictDoNothing({ target: transactions.txid })
      .returning();
    // If conflict (transaction already exists), fetch and return it
    if (!saved) {
      const existing = await this.getTransaction(tx.txid);
      if (!existing) throw new Error(`Failed to save or retrieve transaction ${tx.txid}`);
      return existing;
    }
    return saved;
  }

  async getTransaction(txid: string): Promise<Transaction | null> {
    if (!db) throw new Error("Database not initialized");
    const [tx] = await db.select().from(transactions).where(eq(transactions.txid, txid)).limit(1);
    return tx || null;
  }

  async getTransactionsForBlock(blockHeight: number): Promise<Transaction[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(transactions)
      .where(eq(transactions.blockHeight, blockHeight));
  }

  async saveAddress(address: Omit<Address, "createdAt" | "updatedAt">): Promise<Address> {
    if (!db) throw new Error("Database not initialized");
    
    // Use SQL to preserve first-seen data and intelligently merge signatures
    const [saved] = await db.insert(addresses)
      .values(address)
      .onConflictDoUpdate({
        target: addresses.address,
        set: {
          // Only update if new activity is MORE RECENT
          lastActivityHeight: sql`GREATEST(${addresses.lastActivityHeight}, ${address.lastActivityHeight})`,
          lastActivityTxid: sql`CASE WHEN ${address.lastActivityHeight} > ${addresses.lastActivityHeight} THEN ${address.lastActivityTxid} ELSE ${addresses.lastActivityTxid} END`,
          lastActivityTimestamp: sql`CASE WHEN ${address.lastActivityHeight} > ${addresses.lastActivityHeight} THEN ${address.lastActivityTimestamp} ELSE ${addresses.lastActivityTimestamp} END`,
          
          // Update balance ONLY if observation is more recent (or equal - to handle same-block updates)
          // Note: Proper UTXO tracking in Phase 2 will compute balance from full UTXO set
          currentBalance: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.currentBalance} ELSE ${addresses.currentBalance} END`,
          
          // Dormancy is calculated by dormancy-updater, preserve existing value
          dormancyBlocks: addresses.dormancyBlocks,
          isDormant: addresses.isDormant,
          
          // Update geometric signatures ONLY if observation is more recent
          // This prevents rescanning old blocks from corrupting modern signatures
          temporalSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.temporalSignature} ELSE ${addresses.temporalSignature} END`,
          
          valueSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.valueSignature} ELSE ${addresses.valueSignature} END`,
          
          graphSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.graphSignature} ELSE ${addresses.graphSignature} END`,
          
          scriptSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.scriptSignature} ELSE ${addresses.scriptSignature} END`,
          
          updatedAt: new Date(),
        }
      })
      .returning();
    return saved;
  }

  async updateAddress(addressStr: string, updates: Partial<Address>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db.update(addresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(addresses.address, addressStr));
  }

  async getAddress(addressStr: string): Promise<Address | null> {
    if (!db) throw new Error("Database not initialized");
    const [address] = await db.select().from(addresses).where(eq(addresses.address, addressStr)).limit(1);
    return address || null;
  }

  async getDormantAddresses(filters?: {
    minBalance?: number;
    minInactivityDays?: number;
    limit?: number;
    offset?: number;
  }): Promise<Address[]> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    // CRITICAL: Always filter for dormant addresses only
    conditions.push(eq(addresses.isDormant, true));
    
    if (filters?.minBalance !== undefined) {
      conditions.push(gte(addresses.currentBalance, BigInt(filters.minBalance)));
    }
    
    if (filters?.minInactivityDays !== undefined) {
      const inactivityThreshold = new Date();
      inactivityThreshold.setDate(inactivityThreshold.getDate() - filters.minInactivityDays);
      conditions.push(lte(addresses.lastActivityTimestamp, inactivityThreshold));
    }
    
    let query = db.select().from(addresses).where(and(...conditions));
    
    query = query.orderBy(desc(addresses.currentBalance)) as any;
    
    if (filters?.limit !== undefined) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset !== undefined) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }

  async getAllAddresses(limit?: number, offset?: number): Promise<Address[]> {
    if (!db) throw new Error("Database not initialized");
    
    let query = db.select().from(addresses).orderBy(asc(addresses.firstSeenHeight));
    
    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }
    
    return await query;
  }

  async saveEntity(entity: Omit<Entity, "createdAt" | "updatedAt">): Promise<Entity> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db.insert(entities).values(entity).returning();
    return saved;
  }

  async getEntity(id: string): Promise<Entity | null> {
    if (!db) throw new Error("Database not initialized");
    const [entity] = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    return entity || null;
  }

  async getEntities(type?: string): Promise<Entity[]> {
    if (!db) throw new Error("Database not initialized");
    if (type) {
      return await db.select().from(entities).where(eq(entities.type, type));
    }
    return await db.select().from(entities);
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db.update(entities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(entities.id, id));
  }

  async searchEntities(filters?: {
    name?: string;
    bitcoinTalkUsername?: string;
    githubUsername?: string;
    email?: string;
    alias?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Entity[]> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    if (filters?.name) {
      // Case-insensitive name search
      conditions.push(sql`LOWER(${entities.name}) LIKE LOWER(${'%' + filters.name + '%'})`);
    }
    
    if (filters?.bitcoinTalkUsername) {
      conditions.push(eq(entities.bitcoinTalkUsername, filters.bitcoinTalkUsername));
    }
    
    if (filters?.githubUsername) {
      conditions.push(eq(entities.githubUsername, filters.githubUsername));
    }
    
    if (filters?.email) {
      // Search in emailAddresses array
      conditions.push(sql`${filters.email} = ANY(${entities.emailAddresses})`);
    }
    
    if (filters?.alias) {
      // Search in aliases array
      conditions.push(sql`${filters.alias} = ANY(${entities.aliases})`);
    }
    
    if (filters?.type) {
      conditions.push(eq(entities.type, filters.type));
    }
    
    let query = db.select().from(entities);
    
    if (conditions.length > 0) {
      // CRITICAL: and() requires at least 2 conditions, so handle single condition case
      const whereClause = conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);
      query = query.where(whereClause) as any;
    }
    
    if (filters?.limit !== undefined) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset !== undefined) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }

  async findEntityByIdentity(identity: {
    bitcoinTalkUsername?: string;
    githubUsername?: string;
    email?: string;
  }): Promise<Entity | null> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    if (identity.bitcoinTalkUsername) {
      conditions.push(eq(entities.bitcoinTalkUsername, identity.bitcoinTalkUsername));
    }
    
    if (identity.githubUsername) {
      conditions.push(eq(entities.githubUsername, identity.githubUsername));
    }
    
    if (identity.email) {
      // Search in emailAddresses array
      conditions.push(sql`${identity.email} = ANY(${entities.emailAddresses})`);
    }
    
    if (conditions.length === 0) {
      return null;
    }
    
    // Use OR logic to find entity matching any identity
    // CRITICAL: or() requires at least 2 conditions, so handle single condition case
    const whereClause = conditions.length === 1 
      ? conditions[0] 
      : or(...conditions);
    
    const [entity] = await db.select().from(entities)
      .where(whereClause)
      .limit(1);
    
    return entity || null;
  }

  async saveArtifact(artifact: Omit<Artifact, "createdAt">): Promise<Artifact> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db.insert(artifacts).values(artifact).returning();
    return saved;
  }

  async getArtifacts(filters?: { entityId?: string; source?: string }): Promise<Artifact[]> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    if (filters?.entityId) {
      conditions.push(eq(artifacts.entityId, filters.entityId));
    }
    
    if (filters?.source) {
      conditions.push(eq(artifacts.source, filters.source));
    }
    
    if (conditions.length > 0) {
      // CRITICAL: and() requires at least 2 conditions, so handle single condition case
      const whereClause = conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);
      return await db.select().from(artifacts).where(whereClause);
    }
    
    return await db.select().from(artifacts);
  }
  
  async getEntitiesByAddress(address: string): Promise<Entity[]> {
    if (!db) throw new Error("Database not initialized");
    // Find entities that have this address in their knownAddresses array
    return await db.select().from(entities)
      .where(sql`${address} = ANY(${entities.knownAddresses})`);
  }
  
  async getArtifactsByAddress(address: string): Promise<Artifact[]> {
    if (!db) throw new Error("Database not initialized");
    // Find artifacts that have this address in their relatedAddresses array
    return await db.select().from(artifacts)
      .where(sql`${address} = ANY(${artifacts.relatedAddresses})`);
  }

  async saveRecoveryPriority(priority: Omit<RecoveryPriority, "createdAt" | "updatedAt">): Promise<RecoveryPriority> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db.insert(recoveryPriorities).values(priority).returning();
    return saved;
  }

  async updateRecoveryPriority(id: string, updates: Partial<RecoveryPriority>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db.update(recoveryPriorities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recoveryPriorities.id, id));
  }

  async getRecoveryPriorities(filters?: {
    minKappa?: number;
    maxKappa?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RecoveryPriority[]> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    if (filters?.minKappa !== undefined) {
      conditions.push(gte(recoveryPriorities.kappaRecovery, filters.minKappa));
    }
    
    if (filters?.maxKappa !== undefined) {
      conditions.push(lte(recoveryPriorities.kappaRecovery, filters.maxKappa));
    }
    
    if (filters?.status) {
      conditions.push(eq(recoveryPriorities.recoveryStatus, filters.status));
    }
    
    let query = db.select().from(recoveryPriorities);
    
    if (conditions.length > 0) {
      // CRITICAL: and() requires at least 2 conditions, so handle single condition case
      const whereClause = conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);
      query = query.where(whereClause) as any;
    }
    
    query = query.orderBy(desc(recoveryPriorities.kappaRecovery)) as any;
    
    if (filters?.limit !== undefined) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset !== undefined) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }

  async getRecoveryPriority(address: string): Promise<RecoveryPriority | null> {
    if (!db) throw new Error("Database not initialized");
    const [priority] = await db.select().from(recoveryPriorities).where(eq(recoveryPriorities.address, address)).limit(1);
    return priority || null;
  }

  async saveRecoveryWorkflow(workflow: Omit<RecoveryWorkflow, "createdAt" | "updatedAt">): Promise<RecoveryWorkflow> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db.insert(recoveryWorkflows).values(workflow).returning();
    return saved;
  }

  async updateRecoveryWorkflow(id: string, updates: Partial<RecoveryWorkflow>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db.update(recoveryWorkflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recoveryWorkflows.id, id));
  }

  async getRecoveryWorkflows(filters?: {
    address?: string;
    vector?: string;
    status?: string;
  }): Promise<RecoveryWorkflow[]> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    if (filters?.address) {
      conditions.push(eq(recoveryWorkflows.address, filters.address));
    }
    
    if (filters?.vector) {
      conditions.push(eq(recoveryWorkflows.vector, filters.vector));
    }
    
    if (filters?.status) {
      conditions.push(eq(recoveryWorkflows.status, filters.status));
    }
    
    if (conditions.length > 0) {
      // CRITICAL: and() requires at least 2 conditions, so handle single condition case
      const whereClause = conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);
      return await db.select().from(recoveryWorkflows).where(whereClause);
    }
    
    return await db.select().from(recoveryWorkflows);
  }

  async getRecoveryWorkflow(id: string): Promise<RecoveryWorkflow | null> {
    if (!db) throw new Error("Database not initialized");
    const [workflow] = await db.select().from(recoveryWorkflows).where(eq(recoveryWorkflows.id, id)).limit(1);
    return workflow || null;
  }
}

export const observerStorage = new ObserverStorage();
