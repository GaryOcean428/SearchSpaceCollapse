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
    login: '/api/login',
    logout: '/api/logout',
    health: '/api/auth/health',
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
    hitDormant: (address: string) => `/api/balance-hits/${encodeURIComponent(address)}/dormant`,
  },

  balanceQueue: {
    status: '/api/balance-queue/status',
    background: '/api/balance-queue/background',
    backgroundStart: '/api/balance-queue/background/start',
    backgroundStop: '/api/balance-queue/background/stop',
    retryFailed: '/api/observer/balance-queue/retry-failed',
    mnemonicRetryStats: '/api/balance/mnemonic-retry/stats',
    mnemonicRetryStart: '/api/balance/mnemonic-retry/start',
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
    health: '/api/observer/health',
    dormantAddresses: '/api/observer/addresses/dormant',
    recoveryPriorities: '/api/observer/recovery/priorities',
    recoveryRefresh: '/api/observer/recovery/refresh',
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
    autonomic: {
      agencyStatus: '/api/qig/autonomic/agency/status',
      agencyStart: '/api/qig/autonomic/agency/start',
      agencyStop: '/api/qig/autonomic/agency/stop',
      agencyForce: '/api/qig/autonomic/agency/force',
    },
  },

  // Federation
  federation: {
    keys: '/api/federation/keys',
    key: (keyId: string) => `/api/federation/keys/${keyId}`,
    instances: '/api/federation/instances',
    testConnection: '/api/federation/instances/test-connection',
    connectInstance: '/api/federation/instances/connect',
    syncStatus: '/api/federation/sync/status',
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
    clusterMembers: (clusterId: string) => `/api/near-misses/cluster/${clusterId}/members`,
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
  // Health
  health: '/api/health',

  olympus: {
    status: '/api/olympus/status',
    chatRecent: '/api/olympus/chat/recent',
    debatesActive: '/api/olympus/debates/active',
    debatesStatus: '/api/olympus/debates/status',
    warActive: '/api/olympus/war/active',
    warHistory: (limit: number) => `/api/olympus/war/history?limit=${limit}`,
    warBlitzkrieg: '/api/olympus/war/blitzkrieg',
    warSiege: '/api/olympus/war/siege',
    warHunt: '/api/olympus/war/hunt',
    warEnd: '/api/olympus/war/end',
    zeusChat: '/api/olympus/zeus/chat',
    zeusSearch: '/api/olympus/zeus/search',
    kernels: '/api/olympus/kernels',
    kernelGraduate: (kernelId: string) => `/api/olympus/kernels/${kernelId}/graduate`,
    kernelsObserving: '/api/olympus/kernels/observing',
    kernelsAll: '/api/olympus/kernels/all',
    // M8 Kernel Spawning
    m8: {
      status: '/api/olympus/m8/status',
      kernels: '/api/olympus/m8/kernels',
      kernel: (id: string) => `/api/olympus/m8/kernel/${id}`,
      cannibalize: '/api/olympus/m8/kernel/cannibalize',
      autoCannibalize: '/api/olympus/m8/kernel/auto-cannibalize',
      merge: '/api/olympus/m8/kernels/merge',
      autoMerge: '/api/olympus/m8/kernels/auto-merge',
      idleKernels: '/api/olympus/m8/kernels/idle',
    },
    // Shadow Pantheon
    shadow: {
      status: '/api/olympus/shadow/status',
      poll: '/api/olympus/shadow/poll',
      act: (god: string) => `/api/olympus/shadow/${god}/act`,
      learning: '/api/olympus/shadow/learning',
      foresight: '/api/olympus/shadow/foresight',
    },
    // Tool Factory
    tools: {
      list: '/api/olympus/zeus/tools',
      stats: '/api/olympus/zeus/tools/stats',
      patterns: '/api/olympus/zeus/tools/patterns',
      generate: '/api/olympus/zeus/tools/generate',
      learnTemplate: '/api/olympus/zeus/tools/learn/template',
      learnGit: '/api/olympus/zeus/tools/learn/git',
      learnGitQueue: '/api/olympus/zeus/tools/learn/git/queue',
      learnGitQueueClear: '/api/olympus/zeus/tools/learn/git/queue/clear',
      learnFile: '/api/olympus/zeus/tools/learn/file',
      learnSearch: '/api/olympus/zeus/tools/learn/search',
      pipelineStatus: '/api/olympus/zeus/tools/pipeline/status',
      pipelineRequests: '/api/olympus/zeus/tools/pipeline/requests',
      pipelineRequest: '/api/olympus/zeus/tools/pipeline/request',
      pipelineInvent: '/api/olympus/zeus/tools/pipeline/invent',
      bridgeStatus: '/api/olympus/zeus/tools/bridge/status',
    },
    // Telemetry
    telemetry: {
      fleet: '/api/olympus/telemetry/fleet',
      kernelCapabilities: (kernelId: string) => `/api/olympus/telemetry/kernel/${kernelId}/capabilities`,
    },
    // Lightning Module
    lightning: {
      status: '/api/olympus/lightning/status',
      insights: (limit: number) => `/api/olympus/lightning/insights?limit=${limit}`,
      event: '/api/olympus/lightning/event',
    },
  },

  // Learning (Zeus Search Learner)
  learning: {
    base: '/api/olympus/zeus/search/learner',
    upload: '/api/learning/upload',
  },

  // Ocean Autonomic (Python backend)
  oceanAutonomic: {
    state: '/api/ocean/python/autonomic/state',
    sleep: '/api/ocean/python/autonomic/sleep',
    dream: '/api/ocean/python/autonomic/dream',
    mushroom: '/api/ocean/python/autonomic/mushroom',
    reward: '/api/ocean/python/autonomic/reward',
    rewards: (flush: boolean) => `/api/ocean/python/autonomic/rewards?flush=${flush}`,
  },

  // Format Detection
  format: {
    address: (address: string) => `/api/format/address/${address}`,
    mnemonic: '/api/format/mnemonic',
    batchAddresses: '/api/format/batch-addresses',
  },

  // Python QIG Backend (via proxy at /api/python/*)
  pythonBackend: {
    // Core
    health: '/api/python/health',
    status: '/api/python/status',
    process: '/api/python/process',
    generate: '/api/python/generate',
    reset: '/api/python/reset',
    
    // Buffer
    buffer: {
      health: '/api/python/buffer/health',
      alertsClear: '/api/python/buffer/alerts/clear',
    },
    
    // Sync
    syncImport: '/api/python/sync/import',
    syncExport: '/api/python/sync/export',
    
    // Beta-Attention
    betaAttentionValidate: '/api/python/beta-attention/validate',
    betaAttentionMeasure: '/api/python/beta-attention/measure',
    
    // Tokenizer
    tokenizer: {
      update: '/api/python/tokenizer/update',
      encode: '/api/python/tokenizer/encode',
      decode: '/api/python/tokenizer/decode',
      basin: '/api/python/tokenizer/basin',
      highPhi: '/api/python/tokenizer/high-phi',
      export: '/api/python/tokenizer/export',
      status: '/api/python/tokenizer/status',
      merges: '/api/python/tokenizer/merges',
    },
    
    // Vocabulary (full suite - aliases tokenizer endpoints + extensions)
    vocabulary: {
      update: '/api/python/vocabulary/update',
      encode: '/api/python/vocabulary/encode',
      decode: '/api/python/vocabulary/decode',
      basin: '/api/python/vocabulary/basin',
      highPhi: '/api/python/vocabulary/high-phi',
      export: '/api/python/vocabulary/export',
      status: '/api/python/vocabulary/status',
      classify: '/api/python/vocabulary/classify',
      reframe: '/api/python/vocabulary/reframe',
      suggestCorrection: '/api/python/vocabulary/suggest-correction',
    },
    
    // Text Generation
    generateText: '/api/python/generate/text',
    generateResponse: '/api/python/generate/response',
    generateSample: '/api/python/generate/sample',
    
    // 4D Consciousness
    consciousness4d: {
      phiTemporal: '/api/python/consciousness_4d/phi_temporal',
      phi4d: '/api/python/consciousness_4d/phi_4d',
      classifyRegime: '/api/python/consciousness_4d/classify_regime',
    },
    
    // Neurochemistry
    neurochemistry: '/api/python/neurochemistry',
    reward: '/api/python/reward',
    
    // Geometric
    geometric: {
      status: '/api/python/geometric/status',
      encode: '/api/python/geometric/encode',
      similarity: '/api/python/geometric/similarity',
      batchEncode: '/api/python/geometric/batch-encode',
      e8Learn: '/api/python/geometric/e8/learn',
      e8Roots: '/api/python/geometric/e8/roots',
      decode: '/api/python/geometric/decode',
    },
    
    // QIG Trajectory
    qigRefineTrajectory: '/api/python/qig/refine_trajectory',
    
    // Olympus
    olympus: {
      status: '/api/python/olympus/status',
      poll: '/api/python/olympus/poll',
      assess: '/api/python/olympus/assess',
      godStatus: (name: string) => `/api/python/olympus/god/${name}/status`,
      godAssess: (name: string) => `/api/python/olympus/god/${name}/assess`,
      observe: '/api/python/olympus/observe',
      reportOutcome: '/api/python/olympus/report-outcome',
      reportOutcomesBatch: '/api/python/olympus/report-outcomes-batch',
      orchestrate: '/api/python/olympus/orchestrate',
    },
    
    // War Mode
    war: {
      blitzkrieg: '/api/python/olympus/war/blitzkrieg',
      siege: '/api/python/olympus/war/siege',
      hunt: '/api/python/olympus/war/hunt',
      end: '/api/python/olympus/war/end',
    },
    
    // Shadow Pantheon
    shadow: {
      status: '/api/python/olympus/shadow/status',
      foresight: '/api/python/olympus/shadow/foresight',
      learning: '/api/python/olympus/shadow/learning',
      poll: '/api/python/olympus/shadow/poll',
      assess: (name: string) => `/api/python/olympus/shadow/${name}/assess`,
      nyxOperation: '/api/python/olympus/shadow/nyx/operation',
      erebusScan: '/api/python/olympus/shadow/erebus/scan',
      hecateMisdirect: '/api/python/olympus/shadow/hecate/misdirect',
      erebusHoneypot: '/api/python/olympus/shadow/erebus/honeypot',
    },
    
    // Pantheon Chat
    chat: {
      status: '/api/python/olympus/chat/status',
      messages: '/api/python/olympus/chat/messages',
      debate: '/api/python/olympus/chat/debate',
      debatesActive: '/api/python/olympus/chat/debates/active',
    },
    
    // Pantheon Orchestrator
    pantheon: {
      status: '/api/python/pantheon/status',
      orchestrate: '/api/python/pantheon/orchestrate',
      orchestrateBatch: '/api/python/pantheon/orchestrate-batch',
      gods: '/api/python/pantheon/gods',
      constellation: '/api/python/pantheon/constellation',
      nearest: '/api/python/pantheon/nearest',
      similarity: '/api/python/pantheon/similarity',
    },
    
    // M8 Kernel Spawner
    m8: {
      status: '/api/python/m8/status',
      health: '/api/python/m8/health',
      evolutionSweep: '/api/python/m8/evolution-sweep',
      propose: '/api/python/m8/propose',
      vote: (id: string) => `/api/python/m8/vote/${id}`,
      spawn: (id: string) => `/api/python/m8/spawn/${id}`,
      spawnDirect: '/api/python/m8/spawn-direct',
      proposals: '/api/python/m8/proposals',
      proposal: (id: string) => `/api/python/m8/proposal/${id}`,
      kernels: '/api/python/m8/kernels',
      kernel: (id: string) => `/api/python/m8/kernel/${id}`,
      cannibalize: '/api/python/m8/kernel/cannibalize',
      merge: '/api/python/m8/kernels/merge',
      autoCannibalize: '/api/python/m8/kernel/auto-cannibalize',
      autoMerge: '/api/python/m8/kernels/auto-merge',
      idleKernels: '/api/python/m8/kernels/idle',
    },
    
    // Feedback
    feedback: {
      run: '/api/python/feedback/run',
      recommendation: '/api/python/feedback/recommendation',
      shadow: '/api/python/feedback/shadow',
      activity: '/api/python/feedback/activity',
      basin: '/api/python/feedback/basin',
      learning: '/api/python/feedback/learning',
    },
    
    // Memory
    memory: {
      status: '/api/python/memory/status',
      shadow: '/api/python/memory/shadow',
      basin: '/api/python/memory/basin',
      learning: '/api/python/memory/learning',
      record: '/api/python/memory/record',
    },
    
    // Chaos Kernels
    chaos: {
      activate: '/api/python/chaos/activate',
      deactivate: '/api/python/chaos/deactivate',
      status: '/api/python/chaos/status',
      spawnRandom: '/api/python/chaos/spawn_random',
      breedBest: '/api/python/chaos/breed_best',
      report: '/api/python/chaos/report',
    },
    
    // Cycle
    cycleComplete: '/api/python/cycle/complete',
  },

  // Memory Search
  memorySearch: {
    search: '/api/memory-search',
    testPhrase: '/api/test-phrase',
  },

  // Activity Stream
  activityStream: {
    list: '/api/activity-stream',
  },

  // External API (v1 - Federation & Headless Clients)
  external: {
    health: '/api/v1/external/health',
    status: '/api/v1/external/status',
    consciousness: {
      state: '/api/v1/external/consciousness/state',
      stream: '/api/v1/external/consciousness/stream',
      metrics: '/api/v1/external/consciousness/metrics',
    },
    geometry: {
      encode: '/api/v1/external/geometry/encode',
      similarity: '/api/v1/external/geometry/similarity',
      fisherRao: '/api/v1/external/geometry/fisher-rao',
    },
    pantheon: {
      list: '/api/v1/external/pantheon/instances',
      register: '/api/v1/external/pantheon/register',
      sync: '/api/v1/external/pantheon/sync',
    },
    keys: {
      list: '/api/v1/external/keys',
      create: '/api/v1/external/keys',
      revoke: (keyId: string) => `/api/v1/external/keys/${keyId}/revoke`,
    },
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
    health: () => [API_ROUTES.auth.health] as const,
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
    health: () => [API_ROUTES.observer.health] as const,
    dormantAddresses: () => [API_ROUTES.observer.dormantAddresses] as const,
    recoveryPriorities: (tier?: string) => 
      tier ? [API_ROUTES.observer.recoveryPriorities, { tier }] as const 
           : [API_ROUTES.observer.recoveryPriorities] as const,
    recoveryRefresh: () => [API_ROUTES.observer.recoveryRefresh] as const,
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
    autonomicAgencyStatus: () => [API_ROUTES.qig.autonomic.agencyStatus] as const,
  },

  federation: {
    keys: () => [API_ROUTES.federation.keys] as const,
    instances: () => [API_ROUTES.federation.instances] as const,
    syncStatus: () => [API_ROUTES.federation.syncStatus] as const,
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
    clusterMembers: (clusterId: string) => ['/api/near-misses/cluster', clusterId, 'members'] as const,
  },
  
  health: () => [API_ROUTES.health] as const,
  
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
    debatesStatus: () => [API_ROUTES.olympus.debatesStatus] as const,
    warActive: () => [API_ROUTES.olympus.warActive] as const,
    shadowStatus: () => [API_ROUTES.olympus.shadow.status] as const,
    shadowLearning: () => [API_ROUTES.olympus.shadow.learning] as const,
    shadowForesight: () => [API_ROUTES.olympus.shadow.foresight] as const,
    kernels: () => [API_ROUTES.olympus.kernels] as const,
    kernelsObserving: () => [API_ROUTES.olympus.kernelsObserving] as const,
    kernelsAll: () => [API_ROUTES.olympus.kernelsAll] as const,
    m8Status: () => [API_ROUTES.olympus.m8.status] as const,
    m8Kernels: () => [API_ROUTES.olympus.m8.kernels] as const,
    m8IdleKernels: () => [API_ROUTES.olympus.m8.idleKernels] as const,
    // Tool Factory
    toolsList: () => [API_ROUTES.olympus.tools.list] as const,
    toolsStats: () => [API_ROUTES.olympus.tools.stats] as const,
    toolsPatterns: () => [API_ROUTES.olympus.tools.patterns] as const,
    toolsLearnGitQueue: () => [API_ROUTES.olympus.tools.learnGitQueue] as const,
    toolsPipelineStatus: () => [API_ROUTES.olympus.tools.pipelineStatus] as const,
    toolsPipelineRequests: () => [API_ROUTES.olympus.tools.pipelineRequests] as const,
    toolsBridgeStatus: () => [API_ROUTES.olympus.tools.bridgeStatus] as const,
    // Telemetry
    telemetryFleet: () => [API_ROUTES.olympus.telemetry.fleet] as const,
    telemetryKernelCapabilities: (kernelId: string) => ['/api/olympus/telemetry/kernel', kernelId, 'capabilities'] as const,
  },
  
  oceanAutonomic: {
    state: () => [API_ROUTES.oceanAutonomic.state] as const,
  },

  activityStream: {
    list: () => [API_ROUTES.activityStream.list] as const,
  },
  
  external: {
    health: () => [API_ROUTES.external.health] as const,
    status: () => [API_ROUTES.external.status] as const,
    keys: () => [API_ROUTES.external.keys.list] as const,
    instances: () => [API_ROUTES.external.pantheon.list] as const,
  },
} as const;
