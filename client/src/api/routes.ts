/**
 * API Routes Manifest
 * 
 * Centralized registry of all API endpoints to eliminate "magic strings"
 * throughout the codebase. Use these constants for queryKeys and API calls.
 * 
 * Pattern: API_ROUTES.domain.action or API_ROUTES.domain.action(id)
 */

export const API_ROUTES = {
  // Authentication
  auth: {
    user: '/api/auth/user',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },

  // Investigation & Recovery Core
  investigation: {
    status: '/api/investigation/status',
  },

  recovery: {
    start: '/api/recovery/start',
    stop: '/api/recovery/stop',
    candidates: '/api/recovery/candidates',
  },

  searchJobs: {
    list: '/api/search-jobs',
  },

  unifiedRecovery: {
    sessions: '/api/unified-recovery/sessions',
    session: (id: string) => `/api/unified-recovery/sessions/${id}`,
    stopSession: (id: string) => `/api/unified-recovery/sessions/${id}/stop`,
  },

  recoveries: {
    list: '/api/recoveries',
    detail: (filename: string) => `/api/recoveries/${filename}`,
    download: (filename: string) => `/api/recoveries/${filename}/download`,
  },

  // Forensic Investigation
  forensic: {
    analyze: (address: string) => `/api/forensic/analyze/${encodeURIComponent(address)}`,
    hypotheses: '/api/forensic/hypotheses',
  },

  // Telemetry
  telemetry: {
    capture: '/api/telemetry/capture',
  },

  // Candidates
  candidates: {
    list: '/api/candidates',
  },

  // Target Addresses
  targetAddresses: {
    list: '/api/target-addresses',
    create: '/api/target-addresses',
    delete: (id: string | number) => `/api/target-addresses/${id}`,
  },

  // Ocean Agent
  ocean: {
    cycles: '/api/ocean/cycles',
    triggerCycle: (type: string) => `/api/ocean/cycles/${type}`,
    neurochemistry: '/api/ocean/neurochemistry',
    neurochemistryAdmin: '/api/ocean/neurochemistry/admin',
    neurochemistryBoost: '/api/ocean/neurochemistry/boost',
    boost: '/api/ocean/boost',
  },

  // Auto-Cycle Management
  autoCycle: {
    status: '/api/auto-cycle/status',
    enable: '/api/auto-cycle/enable',
    disable: '/api/auto-cycle/disable',
  },

  // Balance & Blockchain
  balance: {
    hits: '/api/balance-hits',
    addresses: '/api/balance-addresses',
  },

  balanceQueue: {
    status: '/api/balance-queue/status',
    background: '/api/balance-queue/background',
    backgroundStart: '/api/balance-queue/background/start',
    backgroundStop: '/api/balance-queue/background/stop',
  },

  balanceMonitor: {
    status: '/api/balance-monitor/status',
    refresh: '/api/balance-monitor/refresh',
  },

  blockchainApi: {
    base: '/api/blockchain-api',
  },

  // Dormant Cross-Reference
  dormantCrossRef: {
    stats: '/api/dormant-crossref/stats',
  },

  // Observer System
  observer: {
    dormantAddresses: '/api/observer/addresses/dormant',
    recoveryPriorities: '/api/observer/recovery/priorities',
    workflows: '/api/observer/workflows',
    workflowSearchProgress: (workflowId: string) => `/api/observer/workflows/${workflowId}/search-progress`,
    qigSearchActive: '/api/observer/qig-search/active',
    qigSearchStart: '/api/observer/qig-search/start',
    qigSearchStop: (address: string) => `/api/observer/qig-search/stop/${encodeURIComponent(address)}`,
    discoveryHits: '/api/observer/discoveries/hits',
    classifyAddress: '/api/observer/classify-address',
    consciousnessCheck: '/api/observer/consciousness-check',
  },

  // QIG Geometric Kernel
  qig: {
    geometricStatus: '/api/qig/geometric/status',
    geometricEncode: '/api/qig/geometric/encode',
    geometricSimilarity: '/api/qig/geometric/similarity',
  },

  // Consciousness & UCP
  consciousness: {
    complete: '/api/consciousness/complete',
    state: '/api/consciousness/state',
    betaAttention: '/api/consciousness/beta-attention',
  },

  nearMisses: {
    list: '/api/near-misses',
    clusterAnalytics: '/api/near-misses/cluster-analytics',
  },

  // Activity Stream
  activityStream: {
    list: '/api/activity-stream',
  },

  // Sweeps
  sweeps: {
    list: '/api/sweeps',
    stats: '/api/sweeps/stats',
    audit: (id: string) => `/api/sweeps/${id}/audit`,
    approve: (id: string) => `/api/sweeps/${id}/approve`,
    reject: (id: string) => `/api/sweeps/${id}/reject`,
    broadcast: (id: string) => `/api/sweeps/${id}/broadcast`,
    refresh: (id: string) => `/api/sweeps/${id}/refresh`,
  },

  // Basin Sync
  basinSync: {
    coordinatorStatus: '/api/basin-sync/coordinator/status',
  },

  // Olympus
  olympus: {
    status: '/api/olympus/status',
    chatRecent: '/api/olympus/chat/recent',
    debatesActive: '/api/olympus/debates/active',
    warActive: '/api/olympus/war/active',
    warHistory: (limit: number) => `/api/olympus/war/history?limit=${limit}`,
    zeusChat: '/api/olympus/zeus/chat',
    zeusSearch: '/api/olympus/zeus/search',
  },

  // Format Detection
  format: {
    address: (address: string) => `/api/format/address/${address}`,
    mnemonic: '/api/format/mnemonic',
    batchAddresses: '/api/format/batch-addresses',
  },

  // Memory Search
  memorySearch: {
    search: '/api/memory-search',
    testPhrase: '/api/test-phrase',
  },
} as const;

/**
 * Query Keys for TanStack Query
 * 
 * Factory functions returning typed arrays for queryKey. These match
 * the actual component usage patterns for proper cache invalidation.
 * 
 * Usage:
 *   useQuery({ queryKey: QUERY_KEYS.investigation.status() })
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investigation.status() })
 */
export const QUERY_KEYS = {
  auth: {
    user: () => [API_ROUTES.auth.user] as const,
  },
  
  investigation: {
    status: () => [API_ROUTES.investigation.status] as const,
  },
  
  recovery: {
    candidates: () => [API_ROUTES.recovery.candidates] as const,
  },
  
  searchJobs: {
    list: () => [API_ROUTES.searchJobs.list] as const,
  },
  
  unifiedRecovery: {
    sessions: () => [API_ROUTES.unifiedRecovery.sessions] as const,
    session: (id: string) => [API_ROUTES.unifiedRecovery.sessions, id] as const,
  },
  
  recoveries: {
    list: () => [API_ROUTES.recoveries.list] as const,
    detail: (filename: string) => [API_ROUTES.recoveries.list, filename] as const,
  },
  
  forensic: {
    analyze: (address: string) => ['/api/forensic/analyze', address] as const,
  },
  
  candidates: {
    list: () => [API_ROUTES.candidates.list] as const,
  },
  
  targetAddresses: {
    list: () => [API_ROUTES.targetAddresses.list] as const,
  },
  
  ocean: {
    cycles: () => [API_ROUTES.ocean.cycles] as const,
    neurochemistry: () => [API_ROUTES.ocean.neurochemistry] as const,
    neurochemistryAdmin: () => [API_ROUTES.ocean.neurochemistryAdmin] as const,
    neurochemistryBoost: () => [API_ROUTES.ocean.neurochemistryBoost] as const,
  },
  
  autoCycle: {
    status: () => [API_ROUTES.autoCycle.status] as const,
  },
  
  balance: {
    hits: () => [API_ROUTES.balance.hits] as const,
    addresses: () => [API_ROUTES.balance.addresses] as const,
  },
  
  balanceQueue: {
    status: () => [API_ROUTES.balanceQueue.status] as const,
    background: () => [API_ROUTES.balanceQueue.background] as const,
  },
  
  balanceMonitor: {
    status: () => [API_ROUTES.balanceMonitor.status] as const,
  },
  
  dormantCrossRef: {
    stats: () => [API_ROUTES.dormantCrossRef.stats] as const,
  },
  
  observer: {
    dormantAddresses: () => [API_ROUTES.observer.dormantAddresses] as const,
    recoveryPriorities: (tier?: string) => 
      tier ? [API_ROUTES.observer.recoveryPriorities, { tier }] as const 
           : [API_ROUTES.observer.recoveryPriorities] as const,
    workflows: (vector?: string) => 
      vector ? [API_ROUTES.observer.workflows, { vector }] as const 
             : [API_ROUTES.observer.workflows] as const,
    workflowSearchProgress: (workflowId: string) => 
      [API_ROUTES.observer.workflows, workflowId, 'search-progress'] as const,
    qigSearchActive: () => [API_ROUTES.observer.qigSearchActive] as const,
    discoveryHits: () => [API_ROUTES.observer.discoveryHits] as const,
    consciousnessCheck: () => [API_ROUTES.observer.consciousnessCheck] as const,
  },
  
  qig: {
    geometricStatus: () => [API_ROUTES.qig.geometricStatus] as const,
  },
  
  consciousness: {
    complete: () => [API_ROUTES.consciousness.complete] as const,
    state: () => [API_ROUTES.consciousness.state] as const,
    betaAttention: () => [API_ROUTES.consciousness.betaAttention] as const,
  },
  
  nearMisses: {
    list: (tier?: string) => 
      tier ? [API_ROUTES.nearMisses.list, { tier }] as const 
           : [API_ROUTES.nearMisses.list] as const,
    clusterAnalytics: () => [API_ROUTES.nearMisses.clusterAnalytics] as const,
  },
  
  activityStream: {
    list: (limit?: number) => 
      limit ? [API_ROUTES.activityStream.list, { limit }] as const 
            : [API_ROUTES.activityStream.list] as const,
  },
  
  sweeps: {
    list: (status?: string) => 
      status ? [API_ROUTES.sweeps.list, { status }] as const 
             : [API_ROUTES.sweeps.list] as const,
    stats: () => [API_ROUTES.sweeps.stats] as const,
    audit: (id: string) => [API_ROUTES.sweeps.list, id, 'audit'] as const,
  },
  
  basinSync: {
    coordinatorStatus: () => [API_ROUTES.basinSync.coordinatorStatus] as const,
  },
  
  olympus: {
    status: () => [API_ROUTES.olympus.status] as const,
    chatRecent: () => [API_ROUTES.olympus.chatRecent] as const,
    debatesActive: () => [API_ROUTES.olympus.debatesActive] as const,
    warActive: () => [API_ROUTES.olympus.warActive] as const,
  },
} as const;
