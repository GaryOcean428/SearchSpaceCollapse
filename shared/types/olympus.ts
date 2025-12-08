/**
 * OLYMPUS PANTHEON TYPES
 * 
 * Shared type definitions for the Olympian Pantheon system.
 * Used by both Python (via JSON) and TypeScript for consistency.
 * 
 * Architecture:
 * - Python hosts pure geometric consciousness (density matrices, Fisher metric)
 * - TypeScript orchestrates (asks Python gods, executes actions)
 */

import { z } from 'zod';

// God domain specializations
export const GodDomainSchema = z.enum([
  'wisdom',      // Athena - strategic wisdom, pattern recognition
  'war',         // Ares - attack decisions, brute force
  'prophecy',    // Apollo - prediction, temporal patterns
  'hunt',        // Artemis - tracking, focused pursuit
  'messages',    // Hermes - communication, network paths
  'forge',       // Hephaestus - cryptographic structure
  'harvest',     // Demeter - resource management, cycles
  'wine',        // Dionysus - chaos, randomness, inspiration
  'sea',         // Poseidon - deep patterns, waves
  'underworld',  // Hades - death/dormancy analysis
  'family',      // Hera - relationship graphs
  'love',        // Aphrodite - attraction patterns
  'sky',         // Zeus - supreme coordination
]);

export type GodDomain = z.infer<typeof GodDomainSchema>;

// Individual god assessment
export const GodAssessmentSchema = z.object({
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  phi: z.number().optional(),
  kappa: z.number().optional(),
  reasoning: z.string().optional(),
  god: z.string(),
  timestamp: z.string().optional(),
  error: z.string().optional(),
});

export type GodAssessment = z.infer<typeof GodAssessmentSchema>;

// Convergence types for divine consensus
export const ConvergenceTypeSchema = z.enum([
  'STRONG_ATTACK',        // High agreement + high probability
  'MODERATE_OPPORTUNITY', // Moderate agreement
  'COUNCIL_CONSENSUS',    // All gods agree
  'ALIGNED',              // General alignment
  'DIVIDED',              // Gods disagree
]);

export type ConvergenceType = z.infer<typeof ConvergenceTypeSchema>;

// Convergence information
export const ConvergenceInfoSchema = z.object({
  type: ConvergenceTypeSchema,
  score: z.number().min(0).max(1),
  athena_ares_agreement: z.number().optional(),
  full_convergence: z.number().optional(),
  high_probability_gods: z.number().optional(),
});

export type ConvergenceInfo = z.infer<typeof ConvergenceInfoSchema>;

// Full pantheon poll result
export const PollResultSchema = z.object({
  assessments: z.record(z.string(), GodAssessmentSchema),
  convergence: z.string(),
  convergence_score: z.number(),
  consensus_probability: z.number(),
  recommended_action: z.string(),
  timestamp: z.string(),
});

export type PollResult = z.infer<typeof PollResultSchema>;

// War modes for focused attacks
export const WarModeSchema = z.enum([
  'BLITZKRIEG', // Fast parallel attacks, maximize throughput
  'SIEGE',      // Systematic coverage, no stone unturned
  'HUNT',       // Focused pursuit, geometric narrowing
]);

export type WarMode = z.infer<typeof WarModeSchema>;

// Zeus's supreme assessment
export const ZeusAssessmentSchema = z.object({
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  phi: z.number(),
  kappa: z.number(),
  convergence: z.string(),
  convergence_score: z.number(),
  war_mode: z.string().nullable(),
  god_assessments: z.record(z.string(), GodAssessmentSchema),
  recommended_action: z.string(),
  reasoning: z.string(),
  god: z.literal('Zeus'),
  timestamp: z.string(),
});

export type ZeusAssessment = z.infer<typeof ZeusAssessmentSchema>;

// War declaration
export const WarDeclarationSchema = z.object({
  mode: WarModeSchema,
  target: z.string(),
  declared_at: z.string(),
  strategy: z.string(),
  gods_engaged: z.array(z.string()),
});

export type WarDeclaration = z.infer<typeof WarDeclarationSchema>;

// War ended notification
export const WarEndedSchema = z.object({
  previous_mode: z.string().nullable(),
  previous_target: z.string().nullable(),
  ended_at: z.string(),
});

export type WarEnded = z.infer<typeof WarEndedSchema>;

// God status
export const GodStatusSchema = z.object({
  name: z.string(),
  domain: z.string(),
  last_assessment: z.string().optional(),
  observations_count: z.number(),
  status: z.string(),
  error: z.string().optional(),
});

export type GodStatus = z.infer<typeof GodStatusSchema>;

// Full Olympus status
export const OlympusStatusSchema = z.object({
  name: z.string(),
  domain: z.string(),
  war_mode: z.string().nullable(),
  war_target: z.string().nullable(),
  gods: z.record(z.string(), GodStatusSchema),
  convergence_history_size: z.number(),
  divine_decisions: z.number(),
  last_assessment: z.string().nullable(),
  status: z.string(),
});

export type OlympusStatus = z.infer<typeof OlympusStatusSchema>;

// Observation context for feeding gods
export const ObservationContextSchema = z.object({
  target: z.string().optional(),
  phi: z.number().optional(),
  kappa: z.number().optional(),
  regime: z.string().optional(),
  source: z.string().optional(),
  timestamp: z.number().optional(),
}).passthrough();

export type ObservationContext = z.infer<typeof ObservationContextSchema>;

// Zeus Chat message types
export const ZeusMessageMetadataSchema = z.object({
  type: z.enum(['observation', 'suggestion', 'question', 'command', 'search', 'error', 'general']).optional(),
  pantheon_consulted: z.array(z.string()).optional(),
  geometric_encoding: z.array(z.number()).optional(),
  actions_taken: z.array(z.string()).optional(),
  relevance_score: z.number().optional(),
  consensus: z.number().optional(),
  implemented: z.boolean().optional(),
  address: z.string().optional(),
  priority: z.number().optional(),
  results_count: z.number().optional(),
  sources: z.number().optional(),
  files_processed: z.number().optional(),
  error: z.string().optional(),
});

export type ZeusMessageMetadata = z.infer<typeof ZeusMessageMetadataSchema>;

export const ZeusMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['human', 'zeus']),
  content: z.string(),
  timestamp: z.string(),
  metadata: ZeusMessageMetadataSchema.optional(),
});

export type ZeusMessage = z.infer<typeof ZeusMessageSchema>;

export const ZeusChatRequestSchema = z.object({
  message: z.string(),
  conversation_history: z.array(ZeusMessageSchema).optional(),
});

export type ZeusChatRequest = z.infer<typeof ZeusChatRequestSchema>;

// Pantheon orchestration result
export const OrchestrationResultSchema = z.object({
  text: z.string(),
  god: z.string(),
  domain: z.string(),
  mode: z.string(),
  affinity: z.number(),
  basin: z.array(z.number()),
  basin_norm: z.number(),
  routing: z
    .object({
      ranking: z.array(z.tuple([z.string(), z.number()])),
      token_basin_norm: z.number(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;

// Pantheon hypothesis shared with constellation consumers
export const PantheonHypothesisSchema = z.object({
  phrase: z.string(),
  score: z.number(),
  god: z.string().optional(),
  domain: z.string().optional(),
  source: z.string().optional(),
  confidence: z.number().optional(),
});

export type PantheonHypothesis = z.infer<typeof PantheonHypothesisSchema>;

export const ZeusChatResponseSchema = z.object({
  response: z.string(),
  metadata: ZeusMessageMetadataSchema.optional(),
});

export type ZeusChatResponse = z.infer<typeof ZeusChatResponseSchema>;

// God names enumeration (Olympians)
export const GodNameSchema = z.enum([
  'Zeus',
  'Athena',
  'Ares',
  'Apollo',
  'Artemis',
  'Hermes',
  'Hephaestus',
  'Demeter',
  'Dionysus',
  'Poseidon',
  'Hades',
  'Hera',
  'Aphrodite',
]);

// Shadow Pantheon god names
export const ShadowGodNameSchema = z.enum([
  'Nyx',      // OPSEC Commander - darkness, VPN chains, traffic obfuscation
  'Hecate',   // Misdirection Specialist - crossroads, false trails, decoys
  'Erebus',   // Counter-Surveillance - detect watchers, honeypots
  'Hypnos',   // Silent Operations - stealth execution, passive recon
  'Thanatos', // Evidence Destruction - cleanup, erasure
  'Nemesis',  // Relentless Pursuit - never gives up, tracks targets
]);

export type ShadowGodName = z.infer<typeof ShadowGodNameSchema>;

// Shadow god domains
export const ShadowDomainSchema = z.enum([
  'opsec',              // Nyx - operational security
  'misdirection',       // Hecate - false trails, decoys
  'counter_surveillance', // Erebus - detect watchers
  'silent_ops',         // Hypnos - stealth execution
  'evidence_destruction', // Thanatos - cleanup, erasure
  'pursuit',            // Nemesis - relentless tracking
]);

export type ShadowDomain = z.infer<typeof ShadowDomainSchema>;

// Shadow god assessment (extends base assessment)
export const ShadowGodAssessmentSchema = GodAssessmentSchema.extend({
  stealth_level: z.number().min(0).max(1).optional(),
  opsec_risk: z.string().optional(),
  surveillance_risk: z.string().optional(),
  is_honeypot: z.boolean().optional(),
  attack_vectors: z.array(z.object({
    name: z.string(),
    approach: z.string(),
  })).optional(),
  recommended_precautions: z.array(z.string()).optional(),
});

export type ShadowGodAssessment = z.infer<typeof ShadowGodAssessmentSchema>;

// Shadow god status
export const ShadowGodStatusSchema = GodStatusSchema.extend({
  stealth_level: z.number().optional(),
  operations_completed: z.number().optional(),
  evidence_destroyed: z.number().optional(),
  active_operations: z.number().optional(),
  opsec_violations: z.number().optional(),
  active_decoys: z.number().optional(),
  detected_threats: z.number().optional(),
  known_honeypots: z.number().optional(),
  silent_queries: z.number().optional(),
  targets_found: z.number().optional(),
  pursuit_chains: z.number().optional(),
});

export type ShadowGodStatus = z.infer<typeof ShadowGodStatusSchema>;

// Shadow Pantheon status
export const ShadowPantheonStatusSchema = z.object({
  name: z.literal('ShadowPantheon'),
  active: z.boolean(),
  stealth_level: z.number(),
  gods: z.record(z.string(), ShadowGodStatusSchema),
  active_operations: z.number(),
  threats_detected: z.number(),
});

export type ShadowPantheonStatus = z.infer<typeof ShadowPantheonStatusSchema>;

// Covert operation result
export const CovertOperationSchema = z.object({
  id: z.string(),
  target: z.string(),
  type: z.string(),
  status: z.enum(['READY', 'ACTIVE', 'COMPLETED', 'ABORT']),
  network: z.string().optional(),
  visibility: z.string().optional(),
  attack_window: z.object({
    start: z.string(),
    end: z.string(),
    duration_hours: z.number(),
    rationale: z.string(),
  }).optional(),
  initiated_at: z.string(),
});

export type CovertOperation = z.infer<typeof CovertOperationSchema>;

// Surveillance scan result
export const SurveillanceScanSchema = z.object({
  threats: z.array(z.object({
    type: z.string(),
    risk: z.enum(['low', 'medium', 'high', 'critical']),
    action: z.string(),
    addresses: z.array(z.string()).optional(),
    indicators: z.array(z.string()).optional(),
  })),
  safe: z.boolean(),
  threat_count: z.number(),
  recommendation: z.enum(['PROCEED', 'PROCEED_WITH_CAUTION', 'ABORT']),
  scanned_at: z.string(),
});

export type SurveillanceScan = z.infer<typeof SurveillanceScanSchema>;

// Pantheon chat message (matches Python PantheonMessage class)
export const PantheonMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['insight', 'praise', 'challenge', 'question', 'warning', 'discovery', 'challenge_response']),
  from: z.string(),
  to: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string(),
  read: z.boolean(),
  responded: z.boolean(),
});

export type PantheonMessage = z.infer<typeof PantheonMessageSchema>;

// Debate between gods (matches Python Debate class)
export const DebateSchema = z.object({
  id: z.string(),
  topic: z.string(),
  initiator: z.string(),
  opponent: z.string(),
  context: z.record(z.unknown()).optional(),
  started_at: z.string(),
  arguments: z.array(z.object({
    god: z.string(),
    argument: z.string(),
    evidence: z.record(z.unknown()).optional().nullable(),
    timestamp: z.string(),
  })),
  status: z.enum(['active', 'resolved']),
  resolution: z.object({
    arbiter: z.string(),
    winner: z.string(),
    reasoning: z.string(),
    resolved_at: z.string(),
    argument_count: z.number(),
  }).optional().nullable(),
  winner: z.string().optional().nullable(),
  arbiter: z.string().optional().nullable(),
});

export type Debate = z.infer<typeof DebateSchema>;

export type GodName = z.infer<typeof GodNameSchema>;

// All Olympus type exports for validation
export const olympusSchemas = {
  GodDomainSchema,
  GodAssessmentSchema,
  ConvergenceTypeSchema,
  ConvergenceInfoSchema,
  PollResultSchema,
  WarModeSchema,
  ZeusAssessmentSchema,
  WarDeclarationSchema,
  WarEndedSchema,
  GodStatusSchema,
  OlympusStatusSchema,
  ObservationContextSchema,
  GodNameSchema,
  ZeusMessageMetadataSchema,
  ZeusMessageSchema,
  ZeusChatRequestSchema,
  ZeusChatResponseSchema,
  // Shadow Pantheon schemas
  ShadowGodNameSchema,
  ShadowDomainSchema,
  ShadowGodAssessmentSchema,
  ShadowGodStatusSchema,
  ShadowPantheonStatusSchema,
  CovertOperationSchema,
  SurveillanceScanSchema,
  PantheonMessageSchema,
  DebateSchema,
  OrchestrationResultSchema,
  PantheonHypothesisSchema,
};
