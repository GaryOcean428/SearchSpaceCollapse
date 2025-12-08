/**
 * PERSISTENCE INTERFACES
 * 
 * Domain-specific storage interfaces for the persistence layer.
 * Each interface represents a bounded context with its own storage needs.
 */

import type { Candidate, TargetAddress, SearchJob, User, UpsertUser } from '@shared/schema';

export interface ICandidateStorage {
  getCandidates(): Promise<Candidate[]>;
  addCandidate(candidate: Candidate): Promise<void>;
  clearCandidates(): Promise<void>;
}

export interface ITargetAddressStorage {
  getTargetAddresses(): Promise<TargetAddress[]>;
  addTargetAddress(address: TargetAddress): Promise<void>;
  removeTargetAddress(id: string): Promise<void>;
}

export interface ISearchJobStorage {
  getSearchJobs(): Promise<SearchJob[]>;
  getSearchJob(id: string): Promise<SearchJob | null>;
  addSearchJob(job: SearchJob): Promise<void>;
  updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void>;
  appendJobLog(id: string, log: { message: string; type: 'info' | 'success' | 'error' }): Promise<void>;
  deleteSearchJob(id: string): Promise<void>;
}

export interface IUserStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export interface IOceanProbeStorage {
  insertProbes(probes: ProbeInsertData[]): Promise<number>;
  queryProbesByPhiKappa(range: PhiKappaRange, limit?: number): Promise<ManifoldProbeData[]>;
  queryProbesByRegime(regime: string, limit?: number): Promise<ManifoldProbeData[]>;
  getHighPhiProbes(minPhi?: number, limit?: number): Promise<ManifoldProbeData[]>;
  getProbeCount(): Promise<number>;
}

export interface ITestedPhraseStorage {
  markTested(phrase: string): Promise<boolean>;
  batchMarkTested(phrases: string[]): Promise<number>;
  hasBeenTested(phrase: string): Promise<boolean>;
  flushTestedPhrases(): Promise<number>;
}

export interface PhiKappaRange {
  phiMin?: number;
  phiMax?: number;
  kappaMin?: number;
  kappaMax?: number;
}

export interface ProbeInsertData {
  id: string;
  input: string;
  coordinates: number[];
  phi: number;
  kappa: number;
  regime: string;
  ricciScalar?: number;
  fisherTrace?: number;
  source?: string;
}

export interface ManifoldProbeData {
  id: string;
  input: string;
  coordinates: number[] | null;
  phi: number;
  kappa: number;
  regime: string;
  ricciScalar: number | null;
  fisherTrace: number | null;
  source: string | null;
  createdAt: Date | null;
}

export type StorageBackend = 'postgres';

export interface StorageConfig {
  backend: StorageBackend;
  dataDir?: string;
}
