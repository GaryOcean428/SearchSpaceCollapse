import { type Candidate, type TargetAddress } from "@shared/schema";

export interface IStorage {
  getCandidates(): Promise<Candidate[]>;
  addCandidate(candidate: Candidate): Promise<void>;
  clearCandidates(): Promise<void>;
  getTargetAddresses(): Promise<TargetAddress[]>;
  addTargetAddress(address: TargetAddress): Promise<void>;
  removeTargetAddress(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private candidates: Candidate[] = [];
  private targetAddresses: TargetAddress[] = [
    {
      id: "default",
      address: "15BKWJjL5YWXtaP449WAYqVYZQE1szicTn",
      label: "Original $52.6M Address",
      addedAt: new Date().toISOString(),
    }
  ];

  async getCandidates(): Promise<Candidate[]> {
    return [...this.candidates].sort((a, b) => b.score - a.score);
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    this.candidates.push(candidate);
    this.candidates.sort((a, b) => b.score - a.score);
    if (this.candidates.length > 100) {
      this.candidates = this.candidates.slice(0, 100);
    }
  }

  async clearCandidates(): Promise<void> {
    this.candidates = [];
  }

  async getTargetAddresses(): Promise<TargetAddress[]> {
    return [...this.targetAddresses];
  }

  async addTargetAddress(address: TargetAddress): Promise<void> {
    this.targetAddresses.push(address);
  }

  async removeTargetAddress(id: string): Promise<void> {
    this.targetAddresses = this.targetAddresses.filter(a => a.id !== id);
  }
}

export const storage = new MemStorage();
