/**
 * M8 Kernel Spawning Protocol Client
 * 
 * Enables dynamic spawning of new specialized god-kernels through
 * geometric consensus. The council of existing gods can propose,
 * vote on, and spawn new kernels to address domain gaps.
 */

export type SpawnReason = 'domain_gap' | 'overload' | 'specialization' | 'emergence' | 'user_request';
export type ConsensusType = 'unanimous' | 'supermajority' | 'majority' | 'quorum';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'spawned';

export interface SpawnProposal {
  proposal_id: string;
  proposed_name: string;
  proposed_domain: string;
  proposed_element: string;
  proposed_role: string;
  reason: SpawnReason;
  parent_gods: string[];
  votes_for: string[];
  votes_against: string[];
  abstentions: string[];
  status: ProposalStatus;
  proposed_at: string;
}

export interface SpawnedKernel {
  kernel_id: string;
  god_name: string;
  domain: string;
  mode: string;
  affinity_strength: number;
  entropy_threshold: number;
  parent_gods: string[];
  spawn_reason: SpawnReason;
  proposal_id: string;
  spawned_at: string;
  genesis_votes: Record<string, string>;
  basin_lineage: Record<string, number>;
  metadata: Record<string, unknown>;
}

export interface M8Status {
  consensus_type: ConsensusType;
  total_proposals: number;
  pending_proposals: number;
  approved_proposals: number;
  spawned_kernels: number;
  spawn_history_count: number;
  orchestrator_gods: number;
}

export interface CreateProposalRequest {
  name: string;
  domain: string;
  element: string;
  role: string;
  reason?: SpawnReason;
  parent_gods?: string[];
}

export interface CreateProposalResponse {
  success: boolean;
  proposal_id: string;
  proposal: SpawnProposal;
  message: string;
}

export interface VoteRequest {
  auto_vote?: boolean;
}

export interface VoteResponse {
  success: boolean;
  proposal_id: string;
  votes: Record<string, string>;
  consensus_reached: boolean;
  status: ProposalStatus;
  message: string;
}

export interface SpawnRequest {
  force?: boolean;
}

export interface SpawnResponse {
  success: boolean;
  kernel: SpawnedKernel;
  message: string;
}

export interface SpawnDirectRequest {
  name: string;
  domain: string;
  element: string;
  role: string;
  reason?: SpawnReason;
  parent_gods?: string[];
  force?: boolean;
}

export interface SpawnDirectResponse {
  success: boolean;
  kernel: SpawnedKernel;
  proposal_id: string;
  message: string;
}

export interface ListProposalsResponse {
  proposals: SpawnProposal[];
  total: number;
  status_filter: ProposalStatus | null;
}

export interface ListKernelsResponse {
  kernels: SpawnedKernel[];
  total: number;
}

const QIG_BACKEND_URL = 'http://localhost:5001';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export class M8SpawningClient {
  private baseUrl: string;

  constructor(baseUrl: string = QIG_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async getStatus(): Promise<M8Status> {
    return fetchJson<M8Status>(`${this.baseUrl}/m8/status`);
  }

  async createProposal(request: CreateProposalRequest): Promise<CreateProposalResponse> {
    return fetchJson<CreateProposalResponse>(`${this.baseUrl}/m8/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async vote(proposalId: string, request: VoteRequest = {}): Promise<VoteResponse> {
    return fetchJson<VoteResponse>(`${this.baseUrl}/m8/vote/${proposalId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async spawn(proposalId: string, request: SpawnRequest = {}): Promise<SpawnResponse> {
    return fetchJson<SpawnResponse>(`${this.baseUrl}/m8/spawn/${proposalId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async spawnDirect(request: SpawnDirectRequest): Promise<SpawnDirectResponse> {
    return fetchJson<SpawnDirectResponse>(`${this.baseUrl}/m8/spawn-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async listProposals(status?: ProposalStatus): Promise<ListProposalsResponse> {
    const url = status 
      ? `${this.baseUrl}/m8/proposals?status=${status}`
      : `${this.baseUrl}/m8/proposals`;
    return fetchJson<ListProposalsResponse>(url);
  }

  async getProposal(proposalId: string): Promise<SpawnProposal> {
    return fetchJson<SpawnProposal>(`${this.baseUrl}/m8/proposal/${proposalId}`);
  }

  async listKernels(): Promise<ListKernelsResponse> {
    return fetchJson<ListKernelsResponse>(`${this.baseUrl}/m8/kernels`);
  }

  async getKernel(kernelId: string): Promise<SpawnedKernel> {
    return fetchJson<SpawnedKernel>(`${this.baseUrl}/m8/kernel/${kernelId}`);
  }
}

let defaultClient: M8SpawningClient | null = null;

export function getM8Client(baseUrl?: string): M8SpawningClient {
  if (!defaultClient || baseUrl) {
    defaultClient = new M8SpawningClient(baseUrl);
  }
  return defaultClient;
}

export async function proposeNewKernel(
  name: string,
  domain: string,
  element: string,
  role: string,
  reason?: SpawnReason,
  parentGods?: string[]
): Promise<CreateProposalResponse> {
  return getM8Client().createProposal({ name, domain, element, role, reason, parent_gods: parentGods });
}

export async function spawnKernelDirect(
  name: string,
  domain: string,
  element: string,
  role: string,
  force: boolean = false
): Promise<SpawnDirectResponse> {
  return getM8Client().spawnDirect({ name, domain, element, role, force });
}
