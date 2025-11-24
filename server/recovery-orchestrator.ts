/**
 * Recovery Workflow Orchestrator
 * 
 * Manages multi-vector recovery execution for dormant Bitcoin addresses:
 * - Estate Contact: Outreach to deceased holders' estates
 * - Constrained Search: QIG-powered brain wallet search
 * - Social Outreach: Community engagement via BitcoinTalk/forums
 * - Temporal Archive: Historical data analysis
 */

import type { RecoveryWorkflow, RecoveryPriority, Entity, Artifact } from "@shared/schema";

// ============================================================================
// WORKFLOW TYPES & STATUS
// ============================================================================

export type RecoveryVector = 'estate' | 'constrained_search' | 'social' | 'temporal';
export type WorkflowStatus = 'pending' | 'active' | 'paused' | 'completed' | 'failed';

export interface WorkflowProgress {
  startedAt?: Date;
  lastUpdatedAt?: Date;
  completedAt?: Date;
  
  // Vector-specific progress
  estateProgress?: EstateProgress;
  constrainedSearchProgress?: ConstrainedSearchProgress;
  socialProgress?: SocialProgress;
  temporalProgress?: TemporalProgress;
  
  // Common fields
  tasksCompleted: number;
  tasksTotal: number;
  notes: string[];
}

// ============================================================================
// ESTATE CONTACT WORKFLOW
// ============================================================================

export interface EstateProgress {
  estateContactIdentified: boolean;
  estateContactInfo?: string;
  outreachAttempts: number;
  lastOutreachDate?: Date;
  responseReceived: boolean;
  responseDate?: Date;
  legalDocumentsRequested: boolean;
  legalDocumentsReceived: boolean;
  verificationStatus: 'pending' | 'in_progress' | 'verified' | 'failed';
  recoveryExecuted: boolean; // Task 7: Execute recovery with estate cooperation
}

/**
 * Estate Contact Workflow
 * 
 * Steps:
 * 1. Identify deceased entity and estate contact
 * 2. Verify estate contact information
 * 3. Prepare outreach materials (legal, technical docs)
 * 4. Contact estate with recovery proposal
 * 5. Follow up and track responses
 * 6. Verify legal documentation
 * 7. Execute recovery with estate cooperation
 */
export function initializeEstateWorkflow(
  priority: RecoveryPriority,
  entities: Entity[]
): WorkflowProgress {
  
  // Find deceased entity with estate contact
  const deceasedEntity = entities.find(e => e.isDeceased && e.estateContact);
  
  const progress: WorkflowProgress = {
    startedAt: new Date(),
    tasksCompleted: 0,
    tasksTotal: 7,
    notes: [],
    estateProgress: {
      estateContactIdentified: !!deceasedEntity,
      estateContactInfo: deceasedEntity?.estateContact || undefined,
      outreachAttempts: 0,
      responseReceived: false,
      legalDocumentsRequested: false,
      legalDocumentsReceived: false,
      verificationStatus: 'pending',
      recoveryExecuted: false,
    },
  };
  
  if (deceasedEntity) {
    progress.notes.push(`Estate contact identified: ${deceasedEntity.estateContact}`);
    progress.tasksCompleted = 1;
  } else {
    progress.notes.push('WARNING: No estate contact found. Estate workflow cannot proceed.');
  }
  
  return progress;
}

/**
 * Update estate workflow progress
 */
export function updateEstateProgress(
  currentProgress: WorkflowProgress,
  update: Partial<EstateProgress>
): WorkflowProgress {
  
  const estateProgress = {
    ...currentProgress.estateProgress,
    ...update,
  } as EstateProgress;
  
  // Update task completion count (7 tasks total)
  let tasksCompleted = 0;
  if (estateProgress.estateContactIdentified) tasksCompleted++; // Task 1
  if (estateProgress.verificationStatus === 'verified') tasksCompleted++; // Task 2
  if (estateProgress.outreachAttempts > 0) tasksCompleted++; // Task 3
  if (estateProgress.responseReceived) tasksCompleted++; // Task 4
  if (estateProgress.legalDocumentsRequested) tasksCompleted++; // Task 5
  if (estateProgress.legalDocumentsReceived) tasksCompleted++; // Task 6
  if (estateProgress.recoveryExecuted) tasksCompleted++; // Task 7
  
  return {
    ...currentProgress,
    estateProgress,
    tasksCompleted,
    lastUpdatedAt: new Date(),
  };
}

// ============================================================================
// CONSTRAINED SEARCH WORKFLOW (QIG)
// ============================================================================

export interface ConstrainedSearchProgress {
  constraintsIdentified: string[]; // List of constraints used
  searchSpaceReduced: boolean;
  qigParametersSet: boolean;
  searchJobId?: string; // Reference to QIG search job
  searchStatus: 'not_started' | 'running' | 'paused' | 'completed' | 'failed';
  phrasesGenerated: number;
  phrasesTested: number;
  highPhiCount: number;
  matchFound: boolean;
  matchDetails?: string;
}

/**
 * Format constraint breakdown into canonical display strings
 * Uses Task 7 normalized field names (entityLinkage, artifactDensity, graphSignature)
 */
export function formatConstraintsForDisplay(constraints: any): string[] {
  if (!constraints) return [];
  
  const formatted: string[] = [];
  
  if (constraints.entityLinkage > 0) {
    formatted.push(`Entity linkage: ${constraints.entityLinkage} linked entities`);
  }
  
  if (constraints.artifactDensity > 0) {
    formatted.push(`Artifact density: ${constraints.artifactDensity.toFixed(2)} vectors`);
  }
  
  if (constraints.temporalPrecisionHours >= 1.0) {
    formatted.push(`Temporal precision: ${constraints.temporalPrecisionHours}h`);
  }
  
  if (constraints.graphSignature > 0) {
    formatted.push(`Graph signature: ${constraints.graphSignature} nodes`);
  }
  
  if (constraints.phiConstraints > 0) {
    formatted.push(`Φ_constraints: ${constraints.phiConstraints.toFixed(2)}`);
  }
  
  return formatted;
}

/**
 * Constrained Search Workflow (QIG)
 * 
 * Steps:
 * 1. Identify constraints (temporal, graph, value, entity data)
 * 2. Configure QIG search parameters based on constraints
 * 3. Reduce search space using geometric manifold
 * 4. Launch adaptive BIP-39 search
 * 5. Monitor high-Φ candidates
 * 6. Verify matches against target address
 */
export function initializeConstrainedSearchWorkflow(
  priority: RecoveryPriority,
  entities: Entity[],
  artifacts: Artifact[]
): WorkflowProgress {
  
  // Generate canonical constraint display strings (Task 7 normalized labels)
  const constraints = formatConstraintsForDisplay(priority.constraints as any);
  
  const progress: WorkflowProgress = {
    startedAt: new Date(),
    tasksCompleted: 1, // Constraints identified
    tasksTotal: 6,
    notes: [
      `Constraints identified: ${constraints.join(', ')}`,
      `κ_recovery = ${priority.kappaRecovery.toFixed(2)} (${priority.tier} priority)`,
    ],
    constrainedSearchProgress: {
      constraintsIdentified: constraints,
      searchSpaceReduced: constraints.length > 0,
      qigParametersSet: false,
      searchStatus: 'not_started',
      phrasesGenerated: 0,
      phrasesTested: 0,
      highPhiCount: 0,
      matchFound: false,
    },
  };
  
  return progress;
}

/**
 * Update constrained search progress
 */
export function updateConstrainedSearchProgress(
  currentProgress: WorkflowProgress,
  update: Partial<ConstrainedSearchProgress>
): WorkflowProgress {
  
  const constrainedSearchProgress = {
    ...currentProgress.constrainedSearchProgress,
    ...update,
  } as ConstrainedSearchProgress;
  
  // Update task completion count
  let tasksCompleted = 1; // Constraints identified
  if (constrainedSearchProgress.searchSpaceReduced) tasksCompleted++;
  if (constrainedSearchProgress.qigParametersSet) tasksCompleted++;
  if (constrainedSearchProgress.searchStatus !== 'not_started') tasksCompleted++;
  if (constrainedSearchProgress.highPhiCount > 0) tasksCompleted++;
  if (constrainedSearchProgress.matchFound) tasksCompleted = 6; // Complete
  
  return {
    ...currentProgress,
    constrainedSearchProgress,
    tasksCompleted,
    lastUpdatedAt: new Date(),
  };
}

// ============================================================================
// SOCIAL OUTREACH WORKFLOW
// ============================================================================

export interface SocialProgress {
  platformsIdentified: string[]; // BitcoinTalk, GitHub, email, etc.
  outreachTemplatesCreated: boolean;
  communityPostsCreated: number;
  directMessagesSet: number;
  responsesReceived: number;
  leadsGenerated: number;
  verifiedLeads: number;
}

/**
 * Social Outreach Workflow
 * 
 * Steps:
 * 1. Identify social platforms from artifacts
 * 2. Create outreach templates
 * 3. Post to BitcoinTalk forums
 * 4. Send direct messages to connected entities
 * 5. Monitor responses
 * 6. Verify leads
 * 7. Follow up with promising contacts
 */
export function initializeSocialWorkflow(
  priority: RecoveryPriority,
  entities: Entity[],
  artifacts: Artifact[]
): WorkflowProgress {
  
  const platforms = new Set<string>();
  
  // Identify platforms from artifacts
  artifacts.forEach(artifact => {
    if (artifact.source) {
      platforms.add(artifact.source);
    }
  });
  
  // Identify platforms from entities
  entities.forEach(entity => {
    if (entity.bitcoinTalkUsername) platforms.add('bitcointalk');
    if (entity.githubUsername) platforms.add('github');
    if (entity.emailAddresses && entity.emailAddresses.length > 0) platforms.add('email');
  });
  
  const progress: WorkflowProgress = {
    startedAt: new Date(),
    tasksCompleted: 1, // Platforms identified
    tasksTotal: 7,
    notes: [
      `Platforms identified: ${Array.from(platforms).join(', ')}`,
      `${entities.length} entities, ${artifacts.length} artifacts`,
    ],
    socialProgress: {
      platformsIdentified: Array.from(platforms),
      outreachTemplatesCreated: false,
      communityPostsCreated: 0,
      directMessagesSet: 0,
      responsesReceived: 0,
      leadsGenerated: 0,
      verifiedLeads: 0,
    },
  };
  
  return progress;
}

/**
 * Update social outreach progress
 */
export function updateSocialProgress(
  currentProgress: WorkflowProgress,
  update: Partial<SocialProgress>
): WorkflowProgress {
  
  const socialProgress = {
    ...currentProgress.socialProgress,
    ...update,
  } as SocialProgress;
  
  // Update task completion count
  let tasksCompleted = 1; // Platforms identified
  if (socialProgress.outreachTemplatesCreated) tasksCompleted++;
  if (socialProgress.communityPostsCreated > 0) tasksCompleted++;
  if (socialProgress.directMessagesSet > 0) tasksCompleted++;
  if (socialProgress.responsesReceived > 0) tasksCompleted++;
  if (socialProgress.leadsGenerated > 0) tasksCompleted++;
  if (socialProgress.verifiedLeads > 0) tasksCompleted = 7; // Complete
  
  return {
    ...currentProgress,
    socialProgress,
    tasksCompleted,
    lastUpdatedAt: new Date(),
  };
}

// ============================================================================
// TEMPORAL ARCHIVE WORKFLOW
// ============================================================================

export interface TemporalProgress {
  archivesIdentified: string[]; // BitcoinTalk, mailing lists, etc.
  timePeriodNarrowed: boolean;
  timePeriodStart?: Date;
  timePeriodEnd?: Date;
  artifactsAnalyzed: number;
  patternsIdentified: string[];
  temporalClustersFound: number;
  confidenceScore: number; // 0-1
}

/**
 * Temporal Archive Workflow
 * 
 * Steps:
 * 1. Identify relevant historical archives
 * 2. Narrow time period based on first seen timestamp
 * 3. Extract artifacts from time period
 * 4. Analyze temporal patterns
 * 5. Identify temporal clusters (activity bursts)
 * 6. Cross-reference with other addresses
 * 7. Generate temporal fingerprint
 */
export function initializeTemporalWorkflow(
  priority: RecoveryPriority,
  entities: Entity[],
  artifacts: Artifact[]
): WorkflowProgress {
  
  const archives = new Set<string>();
  artifacts.forEach(a => archives.add(a.source));
  
  const progress: WorkflowProgress = {
    startedAt: new Date(),
    tasksCompleted: 1, // Archives identified
    tasksTotal: 7,
    notes: [
      `Archives identified: ${Array.from(archives).join(', ')}`,
      `${artifacts.length} artifacts in time period`,
    ],
    temporalProgress: {
      archivesIdentified: Array.from(archives),
      timePeriodNarrowed: false,
      artifactsAnalyzed: 0,
      patternsIdentified: [],
      temporalClustersFound: 0,
      confidenceScore: 0,
    },
  };
  
  return progress;
}

/**
 * Update temporal archive progress
 */
export function updateTemporalProgress(
  currentProgress: WorkflowProgress,
  update: Partial<TemporalProgress>
): WorkflowProgress {
  
  const temporalProgress = {
    ...currentProgress.temporalProgress,
    ...update,
  } as TemporalProgress;
  
  // Update task completion count
  let tasksCompleted = 1; // Archives identified
  if (temporalProgress.timePeriodNarrowed) tasksCompleted++;
  if (temporalProgress.artifactsAnalyzed > 0) tasksCompleted++;
  if (temporalProgress.patternsIdentified.length > 0) tasksCompleted++;
  if (temporalProgress.temporalClustersFound > 0) tasksCompleted++;
  if (temporalProgress.confidenceScore > 0.5) tasksCompleted++;
  if (temporalProgress.confidenceScore > 0.8) tasksCompleted = 7; // High confidence = complete
  
  return {
    ...currentProgress,
    temporalProgress,
    tasksCompleted,
    lastUpdatedAt: new Date(),
  };
}

// ============================================================================
// WORKFLOW ORCHESTRATION
// ============================================================================

/**
 * Initialize recovery workflow for a given vector
 */
export function initializeWorkflow(
  vector: RecoveryVector,
  priority: RecoveryPriority,
  entities: Entity[],
  artifacts: Artifact[]
): WorkflowProgress {
  
  switch (vector) {
    case 'estate':
      return initializeEstateWorkflow(priority, entities);
    
    case 'constrained_search':
      return initializeConstrainedSearchWorkflow(priority, entities, artifacts);
    
    case 'social':
      return initializeSocialWorkflow(priority, entities, artifacts);
    
    case 'temporal':
      return initializeTemporalWorkflow(priority, entities, artifacts);
    
    default:
      throw new Error(`Unknown recovery vector: ${vector}`);
  }
}

/**
 * Update workflow progress based on vector
 */
export function updateWorkflowProgress(
  vector: RecoveryVector,
  currentProgress: WorkflowProgress,
  update: any
): WorkflowProgress {
  
  switch (vector) {
    case 'estate':
      return updateEstateProgress(currentProgress, update);
    
    case 'constrained_search':
      return updateConstrainedSearchProgress(currentProgress, update);
    
    case 'social':
      return updateSocialProgress(currentProgress, update);
    
    case 'temporal':
      return updateTemporalProgress(currentProgress, update);
    
    default:
      throw new Error(`Unknown recovery vector: ${vector}`);
  }
}

/**
 * Determine if workflow is complete
 */
export function isWorkflowComplete(progress: WorkflowProgress): boolean {
  return progress.tasksCompleted >= progress.tasksTotal;
}

/**
 * Calculate workflow completion percentage
 */
export function getCompletionPercentage(progress: WorkflowProgress): number {
  return Math.round((progress.tasksCompleted / progress.tasksTotal) * 100);
}
