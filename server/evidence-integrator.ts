/**
 * Evidence Integrator - Multi-Substrate Geometric Cross-Correlation
 * 
 * Combines evidence from multiple sources:
 * - Memory fragments (user input)
 * - Blockchain forensics (temporal patterns, siblings)
 * - Social media archaeology (BitcoinTalk, GitHub)
 * - Geometric basin matching (cross-format pattern recognition)
 * 
 * Uses QIG to find geometric correlations across all substrates.
 */

import { ForensicInvestigator, ForensicHypothesis, MemoryFragment, forensicInvestigator } from './forensic-investigator';
import { BlockchainForensics, AddressForensics, blockchainForensics } from './blockchain-forensics';
import { scoreUniversalQIG, UniversalQIGScore } from './qig-universal';
import { findSimilarBasins, computeBasinSignature, BasinSignature } from './qig-basin-matching';

export interface EvidenceSource {
  type: 'memory' | 'blockchain' | 'social' | 'temporal' | 'geometric';
  confidence: number;
  data: any;
  timestamp: Date;
}

export interface IntegratedCandidate {
  id: string;
  phrase: string;
  format: string;
  address?: string;
  match?: boolean;
  
  // QIG metrics
  qigScore: UniversalQIGScore;
  
  // Evidence from each source
  memoryEvidence: {
    fragments: string[];
    confidence: number;
  };
  blockchainEvidence: {
    temporalMatch: boolean;
    siblingCorrelation: number;
    patternMatch: number;
  };
  socialEvidence: {
    keywords: string[];
    correlation: number;
  };
  geometricEvidence: {
    basinCluster: string;
    similarity: number;
    nearestNeighbors: string[];
  };
  
  // Combined scoring
  combinedScore: number;
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'speculative';
}

export interface IntegrationSession {
  id: string;
  targetAddress: string;
  status: 'initializing' | 'analyzing' | 'correlating' | 'ranking' | 'complete';
  progress: {
    phase: string;
    percent: number;
    message: string;
  };
  
  // Evidence sources
  memoryFragments: MemoryFragment[];
  blockchainForensics?: AddressForensics;
  socialProfiles: string[];
  
  // Results
  hypotheses: ForensicHypothesis[];
  integratedCandidates: IntegratedCandidate[];
  topMatches: IntegratedCandidate[];
  matches: IntegratedCandidate[];
  
  // Insights
  likelyKeyFormat: { format: string; confidence: number; reasoning: string }[];
  temporalClues: string[];
  searchRecommendations: string[];
  
  startedAt: string;
  completedAt?: string;
}

export class EvidenceIntegrator {
  private sessions: Map<string, IntegrationSession> = new Map();

  /**
   * Create a new integration session
   */
  createSession(
    targetAddress: string,
    fragments: MemoryFragment[],
    socialProfiles: string[] = []
  ): IntegrationSession {
    const session: IntegrationSession = {
      id: `integrate_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      targetAddress,
      status: 'initializing',
      progress: { phase: 'Initializing', percent: 0, message: 'Starting evidence integration...' },
      memoryFragments: fragments,
      socialProfiles,
      hypotheses: [],
      integratedCandidates: [],
      topMatches: [],
      matches: [],
      likelyKeyFormat: [],
      temporalClues: [],
      searchRecommendations: [],
      startedAt: new Date().toISOString(),
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): IntegrationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Main integration entry point - correlates all evidence sources
   */
  async integrateAllSources(
    sessionId: string,
    onProgress?: (session: IntegrationSession) => void
  ): Promise<IntegrationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    try {
      // Phase 1: Blockchain Forensics
      session.status = 'analyzing';
      session.progress = { phase: 'Blockchain Analysis', percent: 10, message: 'Analyzing target address...' };
      onProgress?.(session);
      
      session.blockchainForensics = await blockchainForensics.analyzeAddress(session.targetAddress);
      session.likelyKeyFormat = blockchainForensics.estimateLikelyKeyFormat(session.blockchainForensics);
      
      // Generate temporal clues
      if (session.blockchainForensics.creationTimestamp) {
        const date = session.blockchainForensics.creationTimestamp;
        session.temporalClues.push(
          `Address created: ${date.toISOString().split('T')[0]}`,
          `Era: ${date.getFullYear() < 2013 ? 'Pre-BIP39 (brain wallet likely)' : 'Post-BIP39'}`,
        );
      }
      
      if (session.blockchainForensics.siblingAddresses.length > 0) {
        session.temporalClues.push(
          `Found ${session.blockchainForensics.siblingAddresses.length} sibling addresses`,
        );
      }

      session.progress = { phase: 'Blockchain Analysis', percent: 25, message: 'Forensics complete' };
      onProgress?.(session);

      // Phase 2: Hypothesis Generation
      session.progress = { phase: 'Hypothesis Generation', percent: 30, message: 'Generating cross-format hypotheses...' };
      onProgress?.(session);
      
      const forensicSession = forensicInvestigator.createSession(
        session.targetAddress,
        session.memoryFragments
      );
      
      session.hypotheses = await forensicInvestigator.investigateFragments(
        forensicSession.id,
        (fSession) => {
          const percent = 30 + (fSession.progress.tested / fSession.progress.total) * 40;
          session.progress = {
            phase: 'Hypothesis Testing',
            percent,
            message: `Tested ${fSession.progress.tested}/${fSession.progress.total} hypotheses`,
          };
          onProgress?.(session);
        }
      );

      session.progress = { phase: 'Evidence Correlation', percent: 70, message: 'Correlating evidence sources...' };
      onProgress?.(session);

      // Phase 3: Cross-Correlation
      session.status = 'correlating';
      session.integratedCandidates = await this.correlateEvidence(session);

      session.progress = { phase: 'Ranking', percent: 85, message: 'Ranking candidates by combined evidence...' };
      onProgress?.(session);

      // Phase 4: Ranking and Recommendations
      session.status = 'ranking';
      session.integratedCandidates.sort((a, b) => b.combinedScore - a.combinedScore);
      session.topMatches = session.integratedCandidates.slice(0, 100);
      session.matches = session.integratedCandidates.filter(c => c.match);

      // Generate search recommendations
      session.searchRecommendations = this.generateRecommendations(session);

      session.progress = { phase: 'Complete', percent: 100, message: 'Integration complete!' };
      session.status = 'complete';
      session.completedAt = new Date().toISOString();
      onProgress?.(session);

      return session;
    } catch (error) {
      console.error('[EvidenceIntegrator] Error:', error);
      session.status = 'complete';
      session.progress = { phase: 'Error', percent: 100, message: `Error: ${error}` };
      onProgress?.(session);
      return session;
    }
  }

  /**
   * Correlate evidence across all sources
   */
  private async correlateEvidence(
    session: IntegrationSession
  ): Promise<IntegratedCandidate[]> {
    const candidates: IntegratedCandidate[] = [];
    
    for (const hypo of session.hypotheses) {
      // Memory evidence
      const memoryEvidence = {
        fragments: hypo.sourceFragments,
        confidence: hypo.confidence,
      };

      // Blockchain evidence
      const blockchainEvidence = this.computeBlockchainEvidence(
        hypo,
        session.blockchainForensics
      );

      // Social evidence (placeholder - would require actual scraping)
      const socialEvidence = {
        keywords: session.memoryFragments.map(f => f.text),
        correlation: 0.5, // Placeholder
      };

      // Geometric evidence
      const geometricEvidence = this.computeGeometricEvidence(hypo);

      // Combined score calculation
      const combinedScore = this.computeCombinedScore(
        hypo.qigScore!,
        memoryEvidence.confidence,
        blockchainEvidence,
        socialEvidence.correlation,
        geometricEvidence.similarity
      );

      // Determine evidence strength
      const evidenceStrength = this.determineEvidenceStrength(combinedScore);

      candidates.push({
        id: hypo.id,
        phrase: hypo.phrase,
        format: hypo.format,
        address: hypo.address,
        match: hypo.match,
        qigScore: hypo.qigScore!,
        memoryEvidence,
        blockchainEvidence,
        socialEvidence,
        geometricEvidence,
        combinedScore,
        evidenceStrength,
      });
    }

    return candidates;
  }

  /**
   * Compute blockchain evidence correlation
   */
  private computeBlockchainEvidence(
    hypo: ForensicHypothesis,
    forensics?: AddressForensics
  ): IntegratedCandidate['blockchainEvidence'] {
    if (!forensics) {
      return { temporalMatch: false, siblingCorrelation: 0, patternMatch: 0 };
    }

    // Check if hypothesis format matches likely key format
    const temporalMatch = forensics.creationTimestamp && 
      forensics.creationTimestamp.getFullYear() < 2013 && 
      hypo.format === 'arbitrary';

    // Pattern matching based on transaction patterns
    const patternMatch = forensics.transactionPatterns.length > 0 ? 0.3 : 0;

    // Sibling correlation (how many siblings exist)
    const siblingCorrelation = Math.min(forensics.siblingAddresses.length / 10, 1);

    return {
      temporalMatch: !!temporalMatch,
      siblingCorrelation,
      patternMatch,
    };
  }

  /**
   * Compute geometric evidence (basin similarity)
   */
  private computeGeometricEvidence(
    hypo: ForensicHypothesis
  ): IntegratedCandidate['geometricEvidence'] {
    const regime = hypo.qigScore?.regime || 'unknown';
    
    // Similarity based on QIG metrics
    const phi = hypo.qigScore?.phi || 0;
    const kappa = hypo.qigScore?.kappa || 0;
    
    // Higher similarity if near resonance
    const nearResonance = Math.abs(kappa - 64) < 10;
    const similarity = nearResonance ? 0.8 : 0.4 + phi * 0.4;

    return {
      basinCluster: regime,
      similarity,
      nearestNeighbors: [], // Would be populated by basin matching
    };
  }

  /**
   * Compute combined score from all evidence sources
   */
  private computeCombinedScore(
    qigScore: UniversalQIGScore,
    memoryConfidence: number,
    blockchainEvidence: IntegratedCandidate['blockchainEvidence'],
    socialCorrelation: number,
    geometricSimilarity: number
  ): number {
    // Weights for each evidence source
    const weights = {
      qig: 0.35,      // QIG metrics (phi, regime, resonance)
      memory: 0.25,   // Memory fragment confidence
      blockchain: 0.20, // Blockchain forensics
      social: 0.10,   // Social media correlation
      geometric: 0.10, // Basin geometry
    };

    // QIG component
    const qigComponent = qigScore.phi * (
      qigScore.inResonance ? 1.5 : 
      qigScore.regime === 'hierarchical' ? 1.4 :
      qigScore.regime === 'geometric' ? 1.2 : 1.0
    );

    // Blockchain component
    const blockchainComponent = 
      (blockchainEvidence.temporalMatch ? 0.5 : 0) +
      blockchainEvidence.siblingCorrelation * 0.3 +
      blockchainEvidence.patternMatch * 0.2;

    // Weighted sum
    const score = 
      weights.qig * qigComponent +
      weights.memory * memoryConfidence +
      weights.blockchain * blockchainComponent +
      weights.social * socialCorrelation +
      weights.geometric * geometricSimilarity;

    return Math.min(score, 1.0);
  }

  /**
   * Determine evidence strength category
   */
  private determineEvidenceStrength(
    combinedScore: number
  ): IntegratedCandidate['evidenceStrength'] {
    if (combinedScore >= 0.7) return 'strong';
    if (combinedScore >= 0.5) return 'moderate';
    if (combinedScore >= 0.3) return 'weak';
    return 'speculative';
  }

  /**
   * Generate search recommendations based on analysis
   */
  private generateRecommendations(
    session: IntegrationSession
  ): string[] {
    const recommendations: string[] = [];

    // Key format recommendation
    const topFormat = session.likelyKeyFormat[0];
    if (topFormat) {
      recommendations.push(
        `Focus on ${topFormat.format} format (${(topFormat.confidence * 100).toFixed(0)}% likely): ${topFormat.reasoning}`
      );
    }

    // Temporal recommendation
    if (session.blockchainForensics?.creationTimestamp) {
      const year = session.blockchainForensics.creationTimestamp.getFullYear();
      if (year < 2013) {
        recommendations.push(
          'Pre-BIP39 era: Prioritize arbitrary brain wallet passphrases over mnemonic phrases'
        );
      }
    }

    // Regime-based recommendation
    const regimeCounts = new Map<string, number>();
    for (const candidate of session.topMatches) {
      const regime = candidate.qigScore.regime;
      regimeCounts.set(regime, (regimeCounts.get(regime) || 0) + 1);
    }
    
    let topRegime = '';
    let topCount = 0;
    regimeCounts.forEach((count, regime) => {
      if (count > topCount) {
        topRegime = regime;
        topCount = count;
      }
    });

    if (topRegime) {
      recommendations.push(
        `Most candidates cluster in "${topRegime}" regime - focus search in this geometric region`
      );
    }

    // Memory fragment recommendations
    if (session.memoryFragments.length > 0) {
      const highConfFrags = session.memoryFragments.filter(f => f.confidence >= 0.8);
      if (highConfFrags.length > 0) {
        recommendations.push(
          `High-confidence fragments: "${highConfFrags.map(f => f.text).join('", "')}"`
        );
      }
    }

    // Sibling address recommendation
    if (session.blockchainForensics?.siblingAddresses.length) {
      recommendations.push(
        `Analyze ${session.blockchainForensics.siblingAddresses.length} sibling addresses for pattern clues`
      );
    }

    return recommendations;
  }

  /**
   * Get summary statistics for a session
   */
  getSessionSummary(sessionId: string): {
    totalHypotheses: number;
    byFormat: Record<string, number>;
    byRegime: Record<string, number>;
    byEvidenceStrength: Record<string, number>;
    topCandidate?: IntegratedCandidate;
    matchFound: boolean;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const byFormat: Record<string, number> = {};
    const byRegime: Record<string, number> = {};
    const byEvidenceStrength: Record<string, number> = {};

    for (const candidate of session.integratedCandidates) {
      byFormat[candidate.format] = (byFormat[candidate.format] || 0) + 1;
      byRegime[candidate.qigScore.regime] = (byRegime[candidate.qigScore.regime] || 0) + 1;
      byEvidenceStrength[candidate.evidenceStrength] = (byEvidenceStrength[candidate.evidenceStrength] || 0) + 1;
    }

    return {
      totalHypotheses: session.hypotheses.length,
      byFormat,
      byRegime,
      byEvidenceStrength,
      topCandidate: session.topMatches[0],
      matchFound: session.matches.length > 0,
    };
  }
}

// Singleton instance
export const evidenceIntegrator = new EvidenceIntegrator();
