import type { Candidate, TargetAddress, SearchJob, User, UpsertUser } from "@shared/schema";
import { storageFacade } from "./persistence";

export interface IStorage {
  getCandidates(): Promise<Candidate[]>;
  addCandidate(candidate: Candidate): Promise<void>;
  clearCandidates(): Promise<void>;
  getTargetAddresses(): Promise<TargetAddress[]>;
  addTargetAddress(address: TargetAddress): Promise<void>;
  removeTargetAddress(id: string): Promise<void>;
  getSearchJobs(): Promise<SearchJob[]>;
  getSearchJob(id: string): Promise<SearchJob | null>;
  addSearchJob(job: SearchJob): Promise<void>;
  updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void>;
  appendJobLog(id: string, log: { message: string; type: "info" | "success" | "error" }): Promise<void>;
  deleteSearchJob(id: string): Promise<void>;
  // Replit Auth: User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class PostgresStorage implements IStorage {
  async getCandidates(): Promise<Candidate[]> {
    return storageFacade.candidates.getCandidates();
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    return storageFacade.candidates.addCandidate(candidate);
  }

  async clearCandidates(): Promise<void> {
    return storageFacade.candidates.clearCandidates();
  }

  async getTargetAddresses(): Promise<TargetAddress[]> {
    return storageFacade.targetAddresses.getTargetAddresses();
  }

  async addTargetAddress(address: TargetAddress): Promise<void> {
    return storageFacade.targetAddresses.addTargetAddress(address);
  }

  async removeTargetAddress(id: string): Promise<void> {
    return storageFacade.targetAddresses.removeTargetAddress(id);
  }

  async getSearchJobs(): Promise<SearchJob[]> {
    return storageFacade.searchJobs.getSearchJobs();
  }

  async getSearchJob(id: string): Promise<SearchJob | null> {
    return storageFacade.searchJobs.getSearchJob(id);
  }

  async addSearchJob(job: SearchJob): Promise<void> {
    return storageFacade.searchJobs.addSearchJob(job);
  }

  async updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void> {
    return storageFacade.searchJobs.updateSearchJob(id, updates);
  }

  async appendJobLog(id: string, log: { message: string; type: "info" | "success" | "error" }): Promise<void> {
    return storageFacade.searchJobs.appendJobLog(id, log);
  }

  async deleteSearchJob(id: string): Promise<void> {
    return storageFacade.searchJobs.deleteSearchJob(id);
  }

  async getUser(id: string): Promise<User | undefined> {
    return storageFacade.users.getUser(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return storageFacade.users.upsertUser(user);
  }
}

export const storage = new PostgresStorage();
