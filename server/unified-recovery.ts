/**
 * UNIFIED RECOVERY SYSTEM
 * 
 * Single entry point: Enter one address → System tries EVERYTHING automatically
 * No user input required beyond the target address
 */

import { 
  UnifiedRecoverySession, 
  RecoveryCandidate, 
  StrategyRun, 
  EvidenceArtifact,
  RecoveryStrategyType,
  recoveryStrategyTypes 
} from '@shared/schema';
import { generateBitcoinAddress, deriveBIP32Address } from './crypto';
import { scoreUniversalQIG } from './qig-universal';
import { blockchainForensics, type AddressForensics } from './blockchain-forensics';
import { historicalDataMiner, type MinedPattern, type Era } from './historical-data-miner';

// Evidence chain type for tracking WHY candidates are ranked
interface EvidenceLink {
  source: string;
  type: string;
  reasoning: string;
  confidence: number;
}

// ============================================================================
// ERA-SPECIFIC PATTERN DICTIONARIES (2009-2011)
// ============================================================================

const ERA_PATTERNS_2009 = [
  // Satoshi & Bitcoin core
  'satoshi', 'bitcoin', 'nakamoto', 'satoshi nakamoto',
  'crypto', 'digital cash', 'p2p', 'peer to peer',
  'cypherpunk', 'cypherpunks', 'hashcash', 'proof of work',
  'double spend', 'genesis block', 'block chain', 'blockchain',
  'cryptocurrency', 'decentralized', 'trustless',
  'private key', 'public key', 'wallet', 'mining', 'miner',
  'hash', 'sha256', 'sha-256', 'ecdsa', 'secp256k1',
  'merkle', 'merkle tree', 'nonce', 'difficulty',
  // Early pioneers
  'hal finney', 'hal', 'finney', 'wei dai', 'nick szabo',
  'b-money', 'bit gold', 'adam back', 'hashcash',
  // Mailing lists & forums
  'cryptography mailing list', 'metzdowd', 'sourceforge',
  'bitcointalk', 'bitcoin forum',
  // Technical terms
  'block reward', 'coinbase', '50 btc', 'target',
  'timestamp', 'version', 'previous hash',
];

const COMMON_PASSWORDS_2009 = [
  'password', '123456', '12345678', '1234567890', 'qwerty',
  'abc123', 'monkey', 'master', 'dragon', 'letmein',
  'login', 'princess', 'solo', 'passw0rd', 'starwars',
  'trustno1', 'whatever', 'shadow', 'sunshine', 'iloveyou',
  'ninja', 'mustang', 'password1', 'password123', 'admin',
  'welcome', 'hello', 'charlie', 'donald', 'baseball',
  'football', 'hockey', 'superman', 'batman', 'access',
];

const BRAIN_WALLET_CLASSICS = [
  // Famous leaked brain wallets
  'correct horse battery staple',
  'satoshi nakamoto',
  'bitcoin',
  'the quick brown fox jumps over the lazy dog',
  'hello world',
  'test', 'testing', 'test123',
  'password', 'passphrase',
  // Genesis block references
  'genesis', 'genesis block', 'block 0', 'block zero',
  'the times 03 jan 2009',
  'chancellor on brink of second bailout for banks',
  // Early Bitcoin culture
  'i am satoshi', 'we are all satoshi',
  'first bitcoin', 'my first bitcoin',
  'freedom', 'liberty', 'revolution',
  'the future of money', 'digital gold',
  'in cryptography we trust', 'in code we trust',
  'bank the unbanked', 'be your own bank',
  'hodl', 'hold on for dear life',
  'to the moon', 'wen moon',
  // Simple phrases
  'secret', 'my secret', 'private',
  'bitcoin wallet', 'my wallet', 'my bitcoin',
  'satoshi vision', 'whitepaper',
];

const BITCOIN_TERMS = [
  'satoshi', 'bitcoin', 'btc', 'xbt', 'blockchain',
  'mining', 'miner', 'hash', 'hashing', 'hashrate',
  'wallet', 'address', 'transaction', 'tx', 'txid',
  'block', 'blockheight', 'confirmation', 'confirmations',
  'difficulty', 'halving', 'reward', 'coinbase',
  'genesis', 'node', 'peer', 'network', 'p2p',
  'decentralized', 'trustless', 'permissionless',
  'immutable', 'double spend', 'proof of work', 'pow',
  'consensus', 'merkle', 'nonce', 'target', 'timestamp',
];

const CYPHERPUNK_PHRASES = [
  'privacy is necessary',
  'cypherpunks write code',
  'cryptography is defense',
  'anonymity is a shield',
  'we the cypherpunks',
  'digital revolution',
  'code is speech',
  'information wants to be free',
  'crypto anarchy',
  'electronic frontier',
];

// ============================================================================
// UNIFIED RECOVERY ORCHESTRATOR
// ============================================================================

class UnifiedRecoveryOrchestrator {
  private sessions = new Map<string, UnifiedRecoverySession>();
  private runningStrategies = new Map<string, AbortController>();

  async createSession(targetAddress: string): Promise<UnifiedRecoverySession> {
    const id = `unified-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const strategies: StrategyRun[] = recoveryStrategyTypes.map(type => ({
      id: `${id}-${type}`,
      type,
      status: 'pending' as const,
      progress: { current: 0, total: 0, rate: 0 },
      candidatesFound: 0,
    }));

    const session: UnifiedRecoverySession = {
      id,
      targetAddress,
      status: 'initializing',
      strategies,
      candidates: [],
      evidence: [],
      matchFound: false,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTested: 0,
      testRate: 0,
    };

    this.sessions.set(id, session);
    console.log(`[UnifiedRecovery] Created session ${id} for ${targetAddress}`);
    return session;
  }

  getSession(id: string): UnifiedRecoverySession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): UnifiedRecoverySession[] {
    return Array.from(this.sessions.values());
  }

  async startRecovery(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const abortController = new AbortController();
    this.runningStrategies.set(sessionId, abortController);

    try {
      // Phase 1: Blockchain Analysis
      session.status = 'analyzing';
      this.updateSession(session);
      
      console.log(`[UnifiedRecovery] Analyzing blockchain for ${session.targetAddress}`);
      
      try {
        const forensics = await blockchainForensics.analyzeAddress(session.targetAddress);
        const isPreBIP39 = blockchainForensics.isPreBIP39Era(forensics);
        const likelyFormats = blockchainForensics.estimateLikelyKeyFormat(forensics);
        
        // Convert likely formats to probability map
        const likelyFormat = { arbitrary: 0, bip39: 0, master: 0 };
        for (const fmt of likelyFormats) {
          if (fmt.format === 'arbitrary') likelyFormat.arbitrary = fmt.confidence;
          else if (fmt.format === 'bip39') likelyFormat.bip39 = fmt.confidence;
          else if (fmt.format === 'hd_wallet') likelyFormat.master = fmt.confidence;
        }
        
        session.blockchainAnalysis = {
          era: isPreBIP39 ? 'pre-bip39' : 'post-bip39',
          firstSeen: forensics.creationTimestamp?.toISOString(),
          totalReceived: forensics.totalReceived,
          balance: forensics.balance,
          txCount: forensics.txCount,
          likelyFormat,
          neighborAddresses: forensics.siblingAddresses || [],
        };
        
        // Add evidence from blockchain analysis
        session.evidence.push({
          id: `ev-blockchain-${Date.now()}`,
          type: 'blockchain',
          source: 'Blockstream API',
          content: `Era: ${isPreBIP39 ? 'pre-bip39' : 'post-bip39'}, First seen: ${forensics.creationTimestamp?.toISOString() || 'unknown'}`,
          relevance: 0.9,
          extractedFragments: [],
          discoveredAt: new Date().toISOString(),
        });
      } catch (error) {
        console.log(`[UnifiedRecovery] Blockchain analysis failed, continuing with defaults`);
        session.blockchainAnalysis = {
          era: 'pre-bip39',
          totalReceived: 0,
          balance: 0,
          txCount: 0,
          likelyFormat: { arbitrary: 0.8, bip39: 0.1, master: 0.1 },
          neighborAddresses: [],
        };
      }
      
      this.updateSession(session);

      // Phase 2: Run all strategies in parallel
      session.status = 'running';
      this.updateSession(session);

      console.log(`[UnifiedRecovery] Starting all recovery strategies...`);
      
      // Run strategies in parallel - core + autonomous modes
      await Promise.allSettled([
        this.runStrategy(session, 'era_patterns', abortController.signal),
        this.runStrategy(session, 'brain_wallet_dict', abortController.signal),
        this.runStrategy(session, 'bitcoin_terms', abortController.signal),
        this.runStrategy(session, 'linguistic', abortController.signal),
        this.runStrategy(session, 'qig_basin_search', abortController.signal),
        this.runHistoricalAutonomous(session, abortController.signal),
        this.runCrossFormatHypotheses(session, abortController.signal),
      ]);

      // Check if match was found
      if (session.matchFound) {
        session.status = 'completed';
        console.log(`[UnifiedRecovery] 🎯 RECOVERY SUCCESSFUL: ${session.matchedPhrase}`);
      } else {
        session.status = 'completed';
        console.log(`[UnifiedRecovery] All strategies completed. ${session.candidates.length} candidates found.`);
      }
      
      session.completedAt = new Date().toISOString();
      this.updateSession(session);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[UnifiedRecovery] Session ${sessionId} was stopped`);
        session.status = 'completed';
      } else {
        console.error(`[UnifiedRecovery] Session ${sessionId} failed:`, error);
        session.status = 'failed';
      }
      this.updateSession(session);
    } finally {
      this.runningStrategies.delete(sessionId);
    }
  }

  stopRecovery(sessionId: string): void {
    const controller = this.runningStrategies.get(sessionId);
    if (controller) {
      controller.abort();
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'completed';
        session.completedAt = new Date().toISOString();
        this.updateSession(session);
      }
    }
  }

  private async runStrategy(
    session: UnifiedRecoverySession, 
    strategyType: RecoveryStrategyType,
    signal: AbortSignal
  ): Promise<void> {
    const strategy = session.strategies.find(s => s.type === strategyType);
    if (!strategy) return;

    strategy.status = 'running';
    strategy.startedAt = new Date().toISOString();
    this.updateSession(session);

    try {
      const phrases = this.generatePhrasesForStrategy(strategyType, session.blockchainAnalysis?.era);
      strategy.progress.total = phrases.length;

      console.log(`[UnifiedRecovery] Strategy ${strategyType}: Testing ${phrases.length} phrases`);

      const startTime = Date.now();
      let tested = 0;

      for (const phraseData of phrases) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (session.matchFound) break;

        const candidate = await this.testPhrase(
          session.targetAddress,
          phraseData.phrase,
          phraseData.format,
          strategyType,
          phraseData.derivationPath
        );

        tested++;
        strategy.progress.current = tested;
        const elapsed = (Date.now() - startTime) / 1000;
        strategy.progress.rate = elapsed > 0 ? tested / elapsed : 0;
        session.totalTested++;
        
        const totalElapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
        session.testRate = totalElapsed > 0 ? session.totalTested / totalElapsed : 0;

        if (candidate) {
          session.candidates.push(candidate);
          strategy.candidatesFound++;

          // Sort by combined score
          session.candidates.sort((a, b) => b.combinedScore - a.combinedScore);
          
          // Keep top 100
          if (session.candidates.length > 100) {
            session.candidates = session.candidates.slice(0, 100);
          }

          if (candidate.match) {
            session.matchFound = true;
            session.matchedPhrase = candidate.phrase;
            console.log(`[UnifiedRecovery] 🎯 MATCH FOUND: "${candidate.phrase}" (${strategyType})`);
          }
        }

        // Update every 100 phrases
        if (tested % 100 === 0) {
          this.updateSession(session);
        }
      }

      strategy.status = 'completed';
      strategy.completedAt = new Date().toISOString();
      console.log(`[UnifiedRecovery] Strategy ${strategyType}: Completed. ${strategy.candidatesFound} candidates found.`);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        strategy.status = 'completed';
      } else {
        strategy.status = 'failed';
        strategy.error = error.message;
        console.error(`[UnifiedRecovery] Strategy ${strategyType} failed:`, error);
      }
    }

    this.updateSession(session);
  }

  private generatePhrasesForStrategy(
    type: RecoveryStrategyType,
    era?: 'pre-bip39' | 'post-bip39' | 'unknown'
  ): Array<{
    phrase: string;
    format: 'arbitrary' | 'bip39' | 'master' | 'hex';
    derivationPath?: string;
  }> {
    const results: Array<{phrase: string; format: 'arbitrary' | 'bip39' | 'master' | 'hex'; derivationPath?: string}> = [];

    switch (type) {
      case 'era_patterns':
        // Single words and phrases
        for (const pattern of ERA_PATTERNS_2009) {
          results.push({ phrase: pattern, format: 'arbitrary' });
          results.push({ phrase: pattern.toUpperCase(), format: 'arbitrary' });
          results.push({ phrase: this.capitalize(pattern), format: 'arbitrary' });
          // With common suffixes
          results.push({ phrase: `${pattern}123`, format: 'arbitrary' });
          results.push({ phrase: `${pattern}!`, format: 'arbitrary' });
        }
        // Add cypherpunk phrases
        for (const phrase of CYPHERPUNK_PHRASES) {
          results.push({ phrase, format: 'arbitrary' });
          results.push({ phrase: phrase.toLowerCase(), format: 'arbitrary' });
        }
        // Year combinations
        for (const pattern of ['satoshi', 'bitcoin', 'genesis', 'crypto']) {
          for (const year of [2009, 2010, 2011]) {
            results.push({ phrase: `${pattern}${year}`, format: 'arbitrary' });
            results.push({ phrase: `${pattern}_${year}`, format: 'arbitrary' });
          }
        }
        break;

      case 'brain_wallet_dict':
        for (const phrase of BRAIN_WALLET_CLASSICS) {
          results.push({ phrase, format: 'arbitrary' });
          results.push({ phrase: phrase.toLowerCase(), format: 'arbitrary' });
          results.push({ phrase: phrase.toUpperCase(), format: 'arbitrary' });
          // Common variations
          results.push({ phrase: phrase.replace(/\s/g, ''), format: 'arbitrary' });
          results.push({ phrase: phrase.replace(/\s/g, '_'), format: 'arbitrary' });
          results.push({ phrase: phrase.replace(/\s/g, '-'), format: 'arbitrary' });
          // With numbers
          for (const num of ['1', '123', '!', '!!']) {
            results.push({ phrase: `${phrase}${num}`, format: 'arbitrary' });
          }
        }
        // Common passwords
        for (const pwd of COMMON_PASSWORDS_2009) {
          results.push({ phrase: pwd, format: 'arbitrary' });
          results.push({ phrase: `${pwd}bitcoin`, format: 'arbitrary' });
          results.push({ phrase: `bitcoin${pwd}`, format: 'arbitrary' });
        }
        break;

      case 'bitcoin_terms':
        for (const term of BITCOIN_TERMS) {
          results.push({ phrase: term, format: 'arbitrary' });
          results.push({ phrase: `my ${term}`, format: 'arbitrary' });
          results.push({ phrase: `${term} wallet`, format: 'arbitrary' });
          results.push({ phrase: `my ${term} wallet`, format: 'arbitrary' });
          results.push({ phrase: `${term} password`, format: 'arbitrary' });
          results.push({ phrase: `${term} secret`, format: 'arbitrary' });
          // With years
          for (const year of [2009, 2010, 2011]) {
            results.push({ phrase: `${term}${year}`, format: 'arbitrary' });
          }
          // With common suffixes
          for (const suffix of ['123', '1', '!', '01']) {
            results.push({ phrase: `${term}${suffix}`, format: 'arbitrary' });
          }
        }
        break;

      case 'linguistic':
        // Generate human-like memorable phrases
        const subjects = ['i', 'my', 'the', 'this is', 'remember', 'dont forget'];
        const verbs = ['love', 'want', 'need', 'have', 'like', 'own'];
        const objects = ['bitcoin', 'money', 'freedom', 'crypto', 'coins', 'satoshi'];
        
        for (const subj of subjects) {
          for (const verb of verbs) {
            for (const obj of objects) {
              results.push({ phrase: `${subj} ${verb} ${obj}`, format: 'arbitrary' });
              results.push({ phrase: `${subj}${verb}${obj}`, format: 'arbitrary' });
            }
          }
        }

        // Date patterns (2009-era)
        for (let month = 1; month <= 12; month++) {
          for (let day = 1; day <= 28; day++) {
            results.push({ phrase: `${month}/${day}/2009`, format: 'arbitrary' });
            results.push({ phrase: `2009${month.toString().padStart(2,'0')}${day.toString().padStart(2,'0')}`, format: 'arbitrary' });
          }
        }

        // Simple memorable phrases
        const simplePatterns = [
          'my secret', 'secret key', 'my key', 'bitcoin key',
          'wallet password', 'my password', 'remember this',
          'do not forget', 'important', 'backup', 'recovery',
        ];
        for (const pattern of simplePatterns) {
          results.push({ phrase: pattern, format: 'arbitrary' });
          results.push({ phrase: pattern.replace(/\s/g, ''), format: 'arbitrary' });
        }
        break;

      case 'qig_basin_search':
        // QIG-inspired geometric patterns for basin exploration
        const seeds = ['genesis', 'origin', 'first', 'zero', 'alpha', 'omega', 'one', 'start'];
        for (const seed of seeds) {
          for (let i = 0; i <= 99; i++) {
            results.push({ phrase: `${seed}${i}`, format: 'arbitrary' });
            if (i < 10) {
              results.push({ phrase: `${seed}_${i}`, format: 'arbitrary' });
              results.push({ phrase: `${seed}0${i}`, format: 'arbitrary' });
            }
          }
          // Also test as potential master keys with common derivation paths
          results.push({ phrase: seed, format: 'master', derivationPath: "m/44'/0'/0'/0/0" });
          results.push({ phrase: seed, format: 'master', derivationPath: "m/0'/0'/0'" });
          results.push({ phrase: seed, format: 'master', derivationPath: "m/0" });
        }
        
        // Numeric patterns
        for (let i = 0; i <= 999; i++) {
          results.push({ phrase: i.toString(), format: 'arbitrary' });
        }
        break;

      case 'blockchain_neighbors':
      case 'forum_mining':
      case 'archive_temporal':
        // These require external data sources - placeholder with common patterns
        results.push({ phrase: 'bitcointalk', format: 'arbitrary' });
        results.push({ phrase: 'sourceforge', format: 'arbitrary' });
        results.push({ phrase: 'github', format: 'arbitrary' });
        break;
    }

    return results;
  }

  private capitalize(s: string): string {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private async testPhrase(
    targetAddress: string,
    phrase: string,
    format: 'arbitrary' | 'bip39' | 'master' | 'hex',
    source: RecoveryStrategyType,
    derivationPath?: string
  ): Promise<RecoveryCandidate | null> {
    try {
      let address: string;
      
      if (format === 'master' && derivationPath) {
        address = deriveBIP32Address(phrase, derivationPath);
      } else {
        address = generateBitcoinAddress(phrase);
      }

      const match = address === targetAddress;
      const qigResult = scoreUniversalQIG(
        phrase, 
        format === 'bip39' ? 'bip39' : format === 'master' ? 'master-key' : 'arbitrary'
      );

      // Calculate combined score
      const kappaProximity = 1 - Math.abs(qigResult.kappa - 64) / 64;
      const combinedScore = (qigResult.phi * 0.4) + 
                           (qigResult.quality * 0.3) + 
                           (kappaProximity * 0.3) +
                           (match ? 100 : 0);

      // Only keep matching or high-scoring candidates
      if (match || combinedScore > 0.6) {
        return {
          id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          phrase,
          format,
          derivationPath,
          address,
          match,
          source,
          confidence: qigResult.quality,
          qigScore: {
            phi: qigResult.phi,
            kappa: qigResult.kappa,
            regime: qigResult.regime,
          },
          combinedScore,
          testedAt: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private updateSession(session: UnifiedRecoverySession): void {
    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.id, session);
  }

  /**
   * AUTONOMOUS MODE: Historical Data Mining
   * Generates its own fragments from 2009-era patterns without user input
   */
  private async runHistoricalAutonomous(
    session: UnifiedRecoverySession,
    signal: AbortSignal
  ): Promise<void> {
    const strategy = session.strategies.find(s => s.type === 'historical_autonomous');
    if (!strategy) return;

    strategy.status = 'running';
    strategy.startedAt = new Date().toISOString();
    this.updateSession(session);

    try {
      // Determine era based on blockchain analysis
      const era: Era = session.blockchainAnalysis?.era === 'pre-bip39' 
        ? 'early-2009' 
        : '2009-2010';

      console.log(`[UnifiedRecovery] Mining historical patterns for era: ${era}`);

      // Mine patterns autonomously
      const minedData = await historicalDataMiner.mineEra(era);
      
      // Score patterns with QIG
      const scoredPatterns = await historicalDataMiner.scorePatterns(minedData.patterns);

      strategy.progress.total = scoredPatterns.length;
      console.log(`[UnifiedRecovery] Historical Autonomous: Testing ${scoredPatterns.length} mined patterns`);

      // Add evidence about the mining
      session.evidence.push({
        id: `ev-mining-${Date.now()}`,
        type: 'pattern',
        source: 'Historical Data Miner',
        content: `Mined ${scoredPatterns.length} patterns from ${minedData.sources.length} sources for era ${era}`,
        relevance: 0.8,
        extractedFragments: minedData.sources.map(s => s.name),
        discoveredAt: new Date().toISOString(),
      });

      const startTime = Date.now();
      let tested = 0;

      for (const pattern of scoredPatterns) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (session.matchFound) break;

        // Test with evidence chain showing WHY this pattern was tested
        const evidenceChain: EvidenceLink[] = [{
          source: pattern.source.name,
          type: pattern.source.type,
          reasoning: pattern.reasoning,
          confidence: pattern.likelihood,
        }];

        const candidate = await this.testPhraseWithEvidence(
          session.targetAddress,
          pattern.phrase,
          pattern.format as any,
          'historical_autonomous',
          evidenceChain,
          undefined
        );

        tested++;
        strategy.progress.current = tested;
        const elapsed = (Date.now() - startTime) / 1000;
        strategy.progress.rate = elapsed > 0 ? tested / elapsed : 0;
        session.totalTested++;

        const totalElapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
        session.testRate = totalElapsed > 0 ? session.totalTested / totalElapsed : 0;

        if (candidate) {
          session.candidates.push(candidate);
          strategy.candidatesFound++;
          session.candidates.sort((a, b) => b.combinedScore - a.combinedScore);
          if (session.candidates.length > 100) {
            session.candidates = session.candidates.slice(0, 100);
          }

          if (candidate.match) {
            session.matchFound = true;
            session.matchedPhrase = candidate.phrase;
            console.log(`[UnifiedRecovery] 🎯 MATCH FOUND via Historical Mining: "${candidate.phrase}"`);
          }
        }

        if (tested % 500 === 0) {
          this.updateSession(session);
        }
      }

      strategy.status = 'completed';
      strategy.completedAt = new Date().toISOString();
      console.log(`[UnifiedRecovery] Historical Autonomous: Completed. ${strategy.candidatesFound} candidates found.`);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        strategy.status = 'completed';
      } else {
        strategy.status = 'failed';
        strategy.error = error.message;
        console.error(`[UnifiedRecovery] Historical Autonomous failed:`, error);
      }
    }

    this.updateSession(session);
  }

  /**
   * CROSS-FORMAT TESTING
   * Takes top candidates from other strategies and tests them in different formats
   */
  private async runCrossFormatHypotheses(
    session: UnifiedRecoverySession,
    signal: AbortSignal
  ): Promise<void> {
    const strategy = session.strategies.find(s => s.type === 'cross_format');
    if (!strategy) return;

    strategy.status = 'running';
    strategy.startedAt = new Date().toISOString();
    this.updateSession(session);

    try {
      // Wait a bit for other strategies to produce candidates
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Collect top candidates from all strategies
      const topCandidates = session.candidates
        .filter(c => !c.match)
        .slice(0, 50);

      if (topCandidates.length === 0) {
        strategy.status = 'completed';
        strategy.completedAt = new Date().toISOString();
        return;
      }

      // Generate cross-format hypotheses
      const hypotheses: Array<{
        phrase: string;
        format: 'arbitrary' | 'bip39' | 'master' | 'hex';
        original: RecoveryCandidate;
        derivationPath?: string;
      }> = [];

      for (const cand of topCandidates) {
        // If tested as arbitrary, try as master key with different paths
        if (cand.format === 'arbitrary') {
          const paths = ["m/44'/0'/0'/0/0", "m/0'/0'/0'", "m/0", "m/44'/0'/0'"];
          for (const path of paths) {
            hypotheses.push({
              phrase: cand.phrase,
              format: 'master',
              original: cand,
              derivationPath: path,
            });
          }
        }

        // If BIP39, also try as arbitrary brain wallet
        if (cand.format === 'bip39') {
          hypotheses.push({
            phrase: cand.phrase.replace(/\s+/g, ''),
            format: 'arbitrary',
            original: cand,
          });
        }

        // Try variants
        const variants = [
          cand.phrase.toLowerCase(),
          cand.phrase.toUpperCase(),
          cand.phrase.replace(/\s+/g, '_'),
        ];
        for (const v of variants) {
          if (v !== cand.phrase) {
            hypotheses.push({
              phrase: v,
              format: 'arbitrary',
              original: cand,
            });
          }
        }
      }

      strategy.progress.total = hypotheses.length;
      console.log(`[UnifiedRecovery] Cross-Format: Testing ${hypotheses.length} hypotheses from ${topCandidates.length} candidates`);

      session.evidence.push({
        id: `ev-crossfmt-${Date.now()}`,
        type: 'pattern',
        source: 'Cross-Format Hypothesis Generator',
        content: `Generated ${hypotheses.length} cross-format hypotheses from top ${topCandidates.length} candidates`,
        relevance: 0.7,
        extractedFragments: [],
        discoveredAt: new Date().toISOString(),
      });

      const startTime = Date.now();
      let tested = 0;

      for (const hypo of hypotheses) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (session.matchFound) break;

        const evidenceChain: EvidenceLink[] = [
          {
            source: 'Cross-Format Inference',
            type: 'hypothesis',
            reasoning: `Derived from ${hypo.original.format} candidate: "${hypo.original.phrase}" → testing as ${hypo.format}`,
            confidence: hypo.original.confidence * 0.8,
          },
          ...(hypo.original.evidenceChain || []),
        ];

        const candidate = await this.testPhraseWithEvidence(
          session.targetAddress,
          hypo.phrase,
          hypo.format,
          'cross_format',
          evidenceChain,
          hypo.derivationPath
        );

        tested++;
        strategy.progress.current = tested;
        const elapsed = (Date.now() - startTime) / 1000;
        strategy.progress.rate = elapsed > 0 ? tested / elapsed : 0;
        session.totalTested++;

        const totalElapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
        session.testRate = totalElapsed > 0 ? session.totalTested / totalElapsed : 0;

        if (candidate) {
          session.candidates.push(candidate);
          strategy.candidatesFound++;
          session.candidates.sort((a, b) => b.combinedScore - a.combinedScore);
          if (session.candidates.length > 100) {
            session.candidates = session.candidates.slice(0, 100);
          }

          if (candidate.match) {
            session.matchFound = true;
            session.matchedPhrase = candidate.phrase;
            console.log(`[UnifiedRecovery] 🎯 MATCH FOUND via Cross-Format: "${candidate.phrase}"`);
          }
        }

        if (tested % 100 === 0) {
          this.updateSession(session);
        }
      }

      strategy.status = 'completed';
      strategy.completedAt = new Date().toISOString();
      console.log(`[UnifiedRecovery] Cross-Format: Completed. ${strategy.candidatesFound} candidates found.`);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        strategy.status = 'completed';
      } else {
        strategy.status = 'failed';
        strategy.error = error.message;
        console.error(`[UnifiedRecovery] Cross-Format failed:`, error);
      }
    }

    this.updateSession(session);
  }

  /**
   * Test a phrase with full evidence chain
   */
  private async testPhraseWithEvidence(
    targetAddress: string,
    phrase: string,
    format: 'arbitrary' | 'bip39' | 'master' | 'hex',
    source: RecoveryStrategyType,
    evidenceChain: EvidenceLink[],
    derivationPath?: string
  ): Promise<RecoveryCandidate | null> {
    try {
      let address: string;
      
      if (format === 'master' && derivationPath) {
        address = deriveBIP32Address(phrase, derivationPath);
      } else {
        address = generateBitcoinAddress(phrase);
      }

      const match = address === targetAddress;
      const qigResult = scoreUniversalQIG(
        phrase, 
        format === 'bip39' ? 'bip39' : format === 'master' ? 'master-key' : 'arbitrary'
      );

      // Calculate combined score with evidence boost
      const kappaProximity = 1 - Math.abs(qigResult.kappa - 64) / 64;
      const evidenceBoost = evidenceChain.reduce((sum, e) => sum + e.confidence * 0.1, 0);
      const combinedScore = (qigResult.phi * 0.35) + 
                           (qigResult.quality * 0.25) + 
                           (kappaProximity * 0.25) +
                           (evidenceBoost * 0.15) +
                           (match ? 100 : 0);

      // Only keep matching or high-scoring candidates
      if (match || combinedScore > 0.6) {
        return {
          id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          phrase,
          format,
          derivationPath,
          address,
          match,
          source,
          confidence: qigResult.quality,
          qigScore: {
            phi: qigResult.phi,
            kappa: qigResult.kappa,
            regime: qigResult.regime,
          },
          combinedScore,
          testedAt: new Date().toISOString(),
          evidenceChain,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

export const unifiedRecovery = new UnifiedRecoveryOrchestrator();
