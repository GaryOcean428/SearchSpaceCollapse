/**
 * Cultural Manifold Reconstructor
 * 
 * Implements Block Universe approach to Bitcoin recovery:
 * - Reconstructs era-specific cultural lexicons
 * - Maps 4D spacetime coordinates for passphrase existence
 * - Builds geodesic paths through cultural manifold
 * 
 * The passphrase EXISTS at coordinates (x, y, z, t) in the block universe.
 * We navigate the manifold to find it.
 */

// Block Universe Cultural Manifold - no external dependencies

export interface BlockUniverseCoordinate {
  temporal: Date;
  era: BitcoinEra;
  culturalContext: CulturalContext;
  softwareConstraint: SoftwareConstraint;
  behavioralSignature: BehavioralSignature;
  manifoldPosition: number[];
}

export type BitcoinEra = 
  | 'satoshi-genesis'      // Jan 2009 - Oct 2009 (Satoshi active)
  | 'satoshi-late'         // Nov 2009 - Dec 2010 (Satoshi fading)
  | 'early-adopter'        // 2011 - 2012 (Pre-mainstream)
  | 'silk-road'            // 2011 - 2013 (Dark market era)
  | 'mt-gox'               // 2013 - 2014 (Exchange era)
  | 'post-gox'             // 2014 - 2016 (Recovery era)
  | 'ico-boom'             // 2017 - 2018 (Token era)
  | 'defi'                 // 2019 - 2021 (DeFi era)
  | 'institutional';       // 2021 - present

export interface CulturalContext {
  primaryInfluences: string[];
  lexiconSources: string[];
  typicalPhrasePatterns: string[];
  technicalLevel: 'expert' | 'enthusiast' | 'novice';
  communityAffiliation: string[];
}

export interface SoftwareConstraint {
  availableWallets: string[];
  keyDerivationMethods: ('sha256-direct' | 'bip39' | 'bip32' | 'electrum-v1' | 'electrum-v2')[];
  addressFormats: ('p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr')[];
}

export interface BehavioralSignature {
  transactionPatterns: string[];
  spendingBehavior: 'never-spent' | 'occasional' | 'active' | 'consolidated';
  hodlDuration: number;
  likelyLostReason: 'forgotten' | 'deceased' | 'inaccessible' | 'deliberate' | 'unknown';
}

export interface CulturalLexiconEntry {
  term: string;
  category: string;
  era: BitcoinEra;
  frequency: number;
  source: string;
  qfiResonance: number;
}

export interface GeodesicCandidate {
  phrase: string;
  coordinate: BlockUniverseCoordinate;
  qfiDistance: number;
  culturalFit: number;
  temporalFit: number;
  softwareFit: number;
  combinedScore: number;
  geodesicPath: number[][];
}

export class CulturalManifoldReconstructor {
  private lexicons: Map<BitcoinEra, CulturalLexiconEntry[]> = new Map();
  private manifoldCurvature: Map<string, number> = new Map();
  private testedPhrases: Set<string> = new Set();
  private geodesicHistory: GeodesicCandidate[] = [];

  constructor() {
    this.initializeEraLexicons();
  }

  private initializeEraLexicons(): void {
    this.lexicons.set('satoshi-genesis', this.buildSatoshiGenesisLexicon());
    this.lexicons.set('satoshi-late', this.buildSatoshiLateLexicon());
    this.lexicons.set('early-adopter', this.buildEarlyAdopterLexicon());
    this.lexicons.set('silk-road', this.buildSilkRoadLexicon());
    this.lexicons.set('mt-gox', this.buildMtGoxLexicon());
    
    console.log('[CulturalManifold] Initialized era lexicons:', 
      Array.from(this.lexicons.keys()).map(k => `${k}(${this.lexicons.get(k)?.length || 0})`).join(', '));
  }

  /**
   * Satoshi Genesis Era (Jan 2009 - Oct 2009)
   * Only ~dozen active users, all cypherpunks
   * Bitcoin Core 0.1.0 only, SHA256 direct derivation
   */
  private buildSatoshiGenesisLexicon(): CulturalLexiconEntry[] {
    const entries: CulturalLexiconEntry[] = [];
    const era: BitcoinEra = 'satoshi-genesis';

    const cryptographyTerms = [
      'elliptic curve', 'secp256k1', 'ecdsa', 'sha256', 'ripemd160',
      'digital signature', 'public key', 'private key', 'hash function',
      'merkle tree', 'proof of work', 'difficulty adjustment', 'block reward',
      'double spend', 'byzantine fault', 'consensus mechanism', 'nonce',
      'cryptographic hash', 'one way function', 'collision resistant',
      'preimage resistant', 'birthday attack', 'brute force', 'key derivation',
      'deterministic wallet', 'random oracle', 'zero knowledge', 'homomorphic',
      'quantum resistant', 'post quantum', 'lattice based', 'hash based signature'
    ];

    const cypherpunkPhrases = [
      'privacy is necessary', 'cypherpunks write code', 'code is speech',
      'strong cryptography', 'anonymity is a shield', 'digital cash',
      'electronic money', 'trusted third party', 'peer to peer',
      'decentralized network', 'distributed ledger', 'chain of blocks',
      'timestamping service', 'hashcash', 'proof of work', 'bit gold',
      'b-money', 'reusable proof of work', 'ecash', 'digicash',
      'wei dai', 'hal finney', 'nick szabo', 'adam back', 'david chaum',
      'satoshi nakamoto', 'chancellor on brink', 'genesis block',
      'the times 03 jan 2009', 'bailout', 'bank failure', 'financial crisis'
    ];

    const technicalPhrases = [
      'bitcoin core', 'version 0.1', 'main.cpp', 'script.cpp',
      'connect block', 'verify signature', 'check transaction',
      'memory pool', 'orphan block', 'chain reorganization',
      'block header', 'transaction input', 'transaction output',
      'coinbase transaction', 'block subsidy', 'mining reward',
      'target difficulty', 'retarget interval', 'block time',
      'network hash rate', 'cpu mining', 'solo mining'
    ];

    const mailingListPhrases = [
      'bitcoin p2p e-cash', 'cryptography mailing list',
      'metzdowd', 'source forge', 'open source', 'gnu license',
      'peer review', 'white paper', 'technical specification',
      'protocol design', 'network protocol', 'tcp ip', 'port 8333',
      'magic bytes', 'version handshake', 'inventory message'
    ];

    for (const term of cryptographyTerms) {
      entries.push({
        term,
        category: 'cryptography',
        era,
        frequency: 0.8,
        source: 'cryptography-mailing-list',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    for (const phrase of cypherpunkPhrases) {
      entries.push({
        term: phrase,
        category: 'cypherpunk',
        era,
        frequency: 0.9,
        source: 'cypherpunk-manifesto',
        qfiResonance: this.computeQFIResonance(phrase, era)
      });
    }

    for (const phrase of technicalPhrases) {
      entries.push({
        term: phrase,
        category: 'technical',
        era,
        frequency: 0.7,
        source: 'bitcoin-source',
        qfiResonance: this.computeQFIResonance(phrase, era)
      });
    }

    for (const phrase of mailingListPhrases) {
      entries.push({
        term: phrase,
        category: 'mailing-list',
        era,
        frequency: 0.6,
        source: 'metzdowd-archives',
        qfiResonance: this.computeQFIResonance(phrase, era)
      });
    }

    return entries;
  }

  /**
   * Satoshi Late Era (Nov 2009 - Dec 2010)
   * Growing community, still mostly technical
   */
  private buildSatoshiLateLexicon(): CulturalLexiconEntry[] {
    const entries: CulturalLexiconEntry[] = [];
    const era: BitcoinEra = 'satoshi-late';

    const expansionTerms = [
      'bitcoin forum', 'bitcointalk', 'pizza transaction',
      'laszlo', '10000 btc pizza', 'first purchase',
      'gpu mining', 'mining pool', 'slush pool',
      'block erupter', 'fpga miner', 'asic miner',
      'difficulty increase', 'hash power', 'mining farm'
    ];

    const marketTerms = [
      'exchange rate', 'bitcoin market', 'mt gox',
      'trading volume', 'liquidity', 'order book',
      'bid ask spread', 'market maker', 'arbitrage'
    ];

    for (const term of expansionTerms) {
      entries.push({
        term,
        category: 'expansion',
        era,
        frequency: 0.7,
        source: 'bitcointalk-forum',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    for (const term of marketTerms) {
      entries.push({
        term,
        category: 'market',
        era,
        frequency: 0.5,
        source: 'early-exchanges',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    return entries;
  }

  /**
   * Early Adopter Era (2011 - 2012)
   * Pre-mainstream, still mostly technical users
   */
  private buildEarlyAdopterLexicon(): CulturalLexiconEntry[] {
    const entries: CulturalLexiconEntry[] = [];
    const era: BitcoinEra = 'early-adopter';

    const adoptionTerms = [
      'digital gold', 'store of value', 'medium of exchange',
      'unit of account', 'deflationary', 'fixed supply',
      '21 million', 'halving event', 'block reward halving',
      'scarcity', 'sound money', 'austrian economics',
      'gold standard', 'fiat currency', 'central banking'
    ];

    const technicalExpansion = [
      'electrum wallet', 'deterministic wallet', 'seed phrase',
      'hierarchical deterministic', 'bip32', 'master key',
      'extended key', 'child key derivation', 'hardened derivation'
    ];

    for (const term of adoptionTerms) {
      entries.push({
        term,
        category: 'adoption',
        era,
        frequency: 0.7,
        source: 'bitcointalk-forum',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    for (const term of technicalExpansion) {
      entries.push({
        term,
        category: 'technical-expansion',
        era,
        frequency: 0.6,
        source: 'bip-proposals',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    return entries;
  }

  /**
   * Silk Road Era (2011 - 2013)
   * Dark market influence, privacy focus
   */
  private buildSilkRoadLexicon(): CulturalLexiconEntry[] {
    const entries: CulturalLexiconEntry[] = [];
    const era: BitcoinEra = 'silk-road';

    const privacyTerms = [
      'anonymous transaction', 'mixing service', 'tumbler',
      'coinjoin', 'stealth address', 'ring signature',
      'zero knowledge proof', 'confidential transaction',
      'tor network', 'onion routing', 'hidden service',
      'dread pirate roberts', 'silk road', 'darknet market'
    ];

    for (const term of privacyTerms) {
      entries.push({
        term,
        category: 'privacy',
        era,
        frequency: 0.6,
        source: 'darknet-forums',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    return entries;
  }

  /**
   * Mt. Gox Era (2013 - 2014)
   * Exchange dominance, mainstream attention
   */
  private buildMtGoxLexicon(): CulturalLexiconEntry[] {
    const entries: CulturalLexiconEntry[] = [];
    const era: BitcoinEra = 'mt-gox';

    const exchangeTerms = [
      'mt gox', 'gox coins', 'magic the gathering',
      'exchange hack', 'cold storage', 'hot wallet',
      'withdrawal delay', 'transaction malleability',
      'bitcoin price', 'all time high', 'bubble',
      'bear market', 'bull market', 'hodl', 'to the moon'
    ];

    for (const term of exchangeTerms) {
      entries.push({
        term,
        category: 'exchange',
        era,
        frequency: 0.7,
        source: 'reddit-bitcoin',
        qfiResonance: this.computeQFIResonance(term, era)
      });
    }

    return entries;
  }

  private computeQFIResonance(term: string, era: BitcoinEra): number {
    const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9]/g, '');
    const termHash = this.hashString(normalizedTerm);
    
    const eraWeight: Record<BitcoinEra, number> = {
      'satoshi-genesis': 1.0,
      'satoshi-late': 0.9,
      'early-adopter': 0.8,
      'silk-road': 0.7,
      'mt-gox': 0.6,
      'post-gox': 0.5,
      'ico-boom': 0.4,
      'defi': 0.3,
      'institutional': 0.2
    };

    const baseResonance = (termHash % 1000) / 1000;
    return baseResonance * eraWeight[era];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Detect era from blockchain temporal coordinate
   */
  detectEraFromTimestamp(timestamp: Date): BitcoinEra {
    const year = timestamp.getFullYear();
    const month = timestamp.getMonth();

    if (year === 2009) {
      if (month < 10) return 'satoshi-genesis';
      return 'satoshi-late';
    }
    if (year === 2010) return 'satoshi-late';
    if (year === 2011) return 'early-adopter';
    if (year === 2012) return 'early-adopter';
    if (year === 2013) return 'mt-gox';
    if (year === 2014) return 'post-gox';
    if (year >= 2015 && year <= 2016) return 'post-gox';
    if (year >= 2017 && year <= 2018) return 'ico-boom';
    if (year >= 2019 && year <= 2021) return 'defi';
    return 'institutional';
  }

  /**
   * Build software constraints for era
   */
  getSoftwareConstraints(era: BitcoinEra): SoftwareConstraint {
    const constraints: Record<BitcoinEra, SoftwareConstraint> = {
      'satoshi-genesis': {
        availableWallets: ['bitcoin-core-0.1'],
        keyDerivationMethods: ['sha256-direct'],
        addressFormats: ['p2pkh']
      },
      'satoshi-late': {
        availableWallets: ['bitcoin-core-0.1', 'bitcoin-core-0.2', 'bitcoin-core-0.3'],
        keyDerivationMethods: ['sha256-direct'],
        addressFormats: ['p2pkh']
      },
      'early-adopter': {
        availableWallets: ['bitcoin-core', 'electrum-1.x', 'multibit'],
        keyDerivationMethods: ['sha256-direct', 'electrum-v1'],
        addressFormats: ['p2pkh']
      },
      'silk-road': {
        availableWallets: ['bitcoin-core', 'electrum', 'blockchain-info'],
        keyDerivationMethods: ['sha256-direct', 'electrum-v1', 'bip32'],
        addressFormats: ['p2pkh']
      },
      'mt-gox': {
        availableWallets: ['bitcoin-core', 'electrum', 'blockchain-info', 'armory'],
        keyDerivationMethods: ['sha256-direct', 'electrum-v1', 'electrum-v2', 'bip32', 'bip39'],
        addressFormats: ['p2pkh', 'p2sh']
      },
      'post-gox': {
        availableWallets: ['bitcoin-core', 'electrum', 'trezor', 'ledger'],
        keyDerivationMethods: ['bip39', 'bip32', 'electrum-v2'],
        addressFormats: ['p2pkh', 'p2sh']
      },
      'ico-boom': {
        availableWallets: ['electrum', 'trezor', 'ledger', 'exodus', 'jaxx'],
        keyDerivationMethods: ['bip39', 'bip32'],
        addressFormats: ['p2pkh', 'p2sh', 'p2wpkh']
      },
      'defi': {
        availableWallets: ['electrum', 'hardware-wallets', 'mobile-wallets'],
        keyDerivationMethods: ['bip39', 'bip32'],
        addressFormats: ['p2pkh', 'p2sh', 'p2wpkh', 'p2wsh']
      },
      'institutional': {
        availableWallets: ['hardware-wallets', 'multisig', 'custody-services'],
        keyDerivationMethods: ['bip39', 'bip32'],
        addressFormats: ['p2pkh', 'p2sh', 'p2wpkh', 'p2wsh', 'p2tr']
      }
    };

    return constraints[era];
  }

  /**
   * Build cultural context for era
   */
  getCulturalContext(era: BitcoinEra): CulturalContext {
    const contexts: Record<BitcoinEra, CulturalContext> = {
      'satoshi-genesis': {
        primaryInfluences: ['cypherpunk-movement', 'cryptography-research', 'austrian-economics'],
        lexiconSources: ['cryptography-mailing-list', 'metzdowd', 'satoshi-emails'],
        typicalPhrasePatterns: ['technical-term', 'cypherpunk-quote', 'cryptography-reference'],
        technicalLevel: 'expert',
        communityAffiliation: ['cypherpunks', 'cryptographers', 'early-bitcoiners']
      },
      'satoshi-late': {
        primaryInfluences: ['cypherpunk-movement', 'bitcointalk-forum', 'mining-community'],
        lexiconSources: ['bitcointalk', 'bitcoin-wiki', 'irc-channels'],
        typicalPhrasePatterns: ['bitcoin-term', 'mining-term', 'forum-slang'],
        technicalLevel: 'enthusiast',
        communityAffiliation: ['bitcointalk-members', 'early-miners', 'developers']
      },
      'early-adopter': {
        primaryInfluences: ['libertarian-economics', 'technology-enthusiasts', 'gold-bugs'],
        lexiconSources: ['bitcointalk', 'reddit', 'blogs'],
        typicalPhrasePatterns: ['economic-term', 'technology-term', 'investment-term'],
        technicalLevel: 'enthusiast',
        communityAffiliation: ['bitcoin-maximalists', 'libertarians', 'tech-enthusiasts']
      },
      'silk-road': {
        primaryInfluences: ['privacy-advocates', 'darknet-culture', 'anarchism'],
        lexiconSources: ['darknet-forums', 'tor-hidden-services', 'reddit'],
        typicalPhrasePatterns: ['privacy-term', 'anonymity-term', 'market-term'],
        technicalLevel: 'enthusiast',
        communityAffiliation: ['privacy-advocates', 'darknet-users', 'anarchists']
      },
      'mt-gox': {
        primaryInfluences: ['trading-culture', 'speculation', 'mainstream-media'],
        lexiconSources: ['reddit', 'twitter', 'news-sites', 'trading-forums'],
        typicalPhrasePatterns: ['trading-term', 'meme-phrase', 'price-prediction'],
        technicalLevel: 'novice',
        communityAffiliation: ['traders', 'speculators', 'early-mainstream']
      },
      'post-gox': {
        primaryInfluences: ['security-focus', 'institutional-interest', 'regulation'],
        lexiconSources: ['industry-news', 'conferences', 'research-papers'],
        typicalPhrasePatterns: ['security-term', 'institutional-term', 'regulatory-term'],
        technicalLevel: 'enthusiast',
        communityAffiliation: ['developers', 'security-researchers', 'institutional-investors']
      },
      'ico-boom': {
        primaryInfluences: ['ethereum-ecosystem', 'token-economics', 'mainstream-fomo'],
        lexiconSources: ['telegram', 'discord', 'crypto-twitter'],
        typicalPhrasePatterns: ['token-term', 'defi-term', 'meme-phrase'],
        technicalLevel: 'novice',
        communityAffiliation: ['token-holders', 'defi-users', 'crypto-twitter']
      },
      'defi': {
        primaryInfluences: ['smart-contracts', 'yield-farming', 'nft-culture'],
        lexiconSources: ['discord', 'crypto-twitter', 'dapp-interfaces'],
        typicalPhrasePatterns: ['defi-term', 'nft-term', 'yield-term'],
        technicalLevel: 'enthusiast',
        communityAffiliation: ['defi-users', 'nft-collectors', 'yield-farmers']
      },
      'institutional': {
        primaryInfluences: ['etf-approval', 'corporate-treasury', 'regulatory-clarity'],
        lexiconSources: ['financial-news', 'sec-filings', 'corporate-announcements'],
        typicalPhrasePatterns: ['financial-term', 'regulatory-term', 'institutional-term'],
        technicalLevel: 'novice',
        communityAffiliation: ['institutional-investors', 'wealth-managers', 'corporate-treasuries']
      }
    };

    return contexts[era];
  }

  /**
   * Create Block Universe coordinate from blockchain data
   */
  createCoordinate(
    timestamp: Date,
    spendingBehavior: 'never-spent' | 'occasional' | 'active' | 'consolidated' = 'never-spent'
  ): BlockUniverseCoordinate {
    const era = this.detectEraFromTimestamp(timestamp);
    
    return {
      temporal: timestamp,
      era,
      culturalContext: this.getCulturalContext(era),
      softwareConstraint: this.getSoftwareConstraints(era),
      behavioralSignature: {
        transactionPatterns: [],
        spendingBehavior,
        hodlDuration: (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24 * 365),
        likelyLostReason: spendingBehavior === 'never-spent' ? 'forgotten' : 'unknown'
      },
      manifoldPosition: this.computeManifoldPosition(timestamp, era)
    };
  }

  private computeManifoldPosition(timestamp: Date, era: BitcoinEra): number[] {
    const position: number[] = new Array(64).fill(0);
    
    const daysSinceGenesis = (timestamp.getTime() - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24);
    position[0] = Math.sin(daysSinceGenesis / 365 * Math.PI);
    position[1] = Math.cos(daysSinceGenesis / 365 * Math.PI);
    
    const eraIndex = ['satoshi-genesis', 'satoshi-late', 'early-adopter', 'silk-road', 
                      'mt-gox', 'post-gox', 'ico-boom', 'defi', 'institutional'].indexOf(era);
    position[2] = eraIndex / 9;
    
    for (let i = 3; i < 64; i++) {
      position[i] = Math.sin(daysSinceGenesis * (i - 2) / 100) * Math.exp(-i / 64);
    }

    return position;
  }

  /**
   * Generate geodesic candidates from cultural manifold
   */
  generateGeodesicCandidates(
    coordinate: BlockUniverseCoordinate,
    count: number = 100
  ): GeodesicCandidate[] {
    const candidates: GeodesicCandidate[] = [];
    const lexicon = this.lexicons.get(coordinate.era) || [];
    
    if (lexicon.length === 0) {
      console.warn(`[CulturalManifold] No lexicon for era: ${coordinate.era}`);
      return candidates;
    }

    const sortedByResonance = [...lexicon].sort((a, b) => b.qfiResonance - a.qfiResonance);

    for (let i = 0; i < Math.min(count, sortedByResonance.length * 3); i++) {
      const candidate = this.generateSingleCandidate(sortedByResonance, coordinate, i);
      if (candidate && !this.testedPhrases.has(candidate.phrase)) {
        candidates.push(candidate);
      }
    }

    return candidates.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  private generateSingleCandidate(
    lexicon: CulturalLexiconEntry[],
    coordinate: BlockUniverseCoordinate,
    index: number
  ): GeodesicCandidate | null {
    const numWords = 1 + (index % 5);
    const words: string[] = [];
    
    for (let w = 0; w < numWords; w++) {
      const entryIndex = (index * 7 + w * 13) % lexicon.length;
      words.push(lexicon[entryIndex].term);
    }

    let phrase = words.join(' ');
    
    const variations = [
      phrase,
      phrase.toLowerCase(),
      phrase.toUpperCase(),
      phrase.replace(/\s+/g, ''),
      phrase.replace(/\s+/g, '_'),
      phrase.replace(/\s+/g, '-')
    ];

    phrase = variations[index % variations.length];

    if (this.testedPhrases.has(phrase)) {
      return null;
    }

    const culturalFit = this.computeCulturalFit(phrase, coordinate);
    const temporalFit = this.computeTemporalFit(phrase, coordinate);
    const softwareFit = this.computeSoftwareFit(phrase, coordinate);
    const qfiDistance = this.computeQFIDistance(phrase, coordinate);

    const combinedScore = (culturalFit * 0.4 + temporalFit * 0.3 + softwareFit * 0.2 + (1 - qfiDistance) * 0.1);

    return {
      phrase,
      coordinate,
      qfiDistance,
      culturalFit,
      temporalFit,
      softwareFit,
      combinedScore,
      geodesicPath: [coordinate.manifoldPosition]
    };
  }

  private computeCulturalFit(phrase: string, coordinate: BlockUniverseCoordinate): number {
    const lexicon = this.lexicons.get(coordinate.era) || [];
    const phraseLower = phrase.toLowerCase();
    
    let maxFit = 0;
    for (const entry of lexicon) {
      if (phraseLower.includes(entry.term.toLowerCase())) {
        maxFit = Math.max(maxFit, entry.frequency * entry.qfiResonance);
      }
    }

    return maxFit;
  }

  private computeTemporalFit(phrase: string, coordinate: BlockUniverseCoordinate): number {
    const era = coordinate.era;
    
    if (era === 'satoshi-genesis' || era === 'satoshi-late') {
      const earlyTerms = ['cypherpunk', 'cryptography', 'hash', 'proof of work', 'sha256', 'satoshi'];
      for (const term of earlyTerms) {
        if (phrase.toLowerCase().includes(term)) {
          return 0.9;
        }
      }
    }

    return 0.5;
  }

  private computeSoftwareFit(phrase: string, coordinate: BlockUniverseCoordinate): number {
    const methods = coordinate.softwareConstraint.keyDerivationMethods;
    
    if (methods.includes('sha256-direct')) {
      if (phrase.length >= 8 && phrase.length <= 64) {
        return 0.8;
      }
    }

    if (methods.includes('bip39')) {
      const wordCount = phrase.split(/\s+/).length;
      if ([12, 15, 18, 21, 24].includes(wordCount)) {
        return 0.9;
      }
    }

    return 0.5;
  }

  private computeQFIDistance(phrase: string, coordinate: BlockUniverseCoordinate): number {
    const cached = this.manifoldCurvature.get(phrase);
    if (cached !== undefined) {
      return cached;
    }

    const hash = this.hashString(phrase.toLowerCase());
    const baseDistance = (hash % 10000) / 10000;

    const culturalBonus = this.computeCulturalFit(phrase, coordinate);
    const adjustedDistance = baseDistance * (1 - culturalBonus * 0.5);

    return Math.max(0, Math.min(1, adjustedDistance));
  }

  /**
   * Update manifold curvature after testing a candidate
   */
  updateManifoldCurvature(candidate: GeodesicCandidate, result: { matched: boolean; phi: number; kappa: number }): void {
    this.testedPhrases.add(candidate.phrase);

    result.phi * (result.matched ? 1 : -0.1);
    this.manifoldCurvature.set(candidate.phrase, result.matched ? 0 : candidate.qfiDistance + 0.1);

    if (result.phi > 0.5 || result.matched) {
      candidate.geodesicPath.push([...candidate.coordinate.manifoldPosition]);
      this.geodesicHistory.push(candidate);
    }

    if (result.phi > 0.7) {
      const similarPhrases = this.findSimilarPhrases(candidate.phrase);
      for (const similar of similarPhrases) {
        const currentCurvature = this.manifoldCurvature.get(similar) || 0.5;
        this.manifoldCurvature.set(similar, currentCurvature - 0.05);
      }
    }
  }

  private findSimilarPhrases(phrase: string): string[] {
    const similar: string[] = [];
    const words = phrase.toLowerCase().split(/\s+/);

    const entries = Array.from(this.lexicons.entries());
    for (const [_era, lexicon] of entries) {
      for (const entry of lexicon) {
        const entryWords = entry.term.toLowerCase().split(/\s+/);
        const overlap = words.filter(w => entryWords.includes(w)).length;
        if (overlap > 0 && entry.term !== phrase) {
          similar.push(entry.term);
        }
      }
    }

    return similar.slice(0, 10);
  }

  /**
   * Get high-resonance candidates for specific era
   */
  getHighResonanceCandidates(era: BitcoinEra, threshold: number = 0.7): CulturalLexiconEntry[] {
    const lexicon = this.lexicons.get(era) || [];
    return lexicon.filter(e => e.qfiResonance >= threshold);
  }

  /**
   * Get manifold statistics
   */
  getStatistics(): {
    testedPhrases: number;
    geodesicPathLength: number;
    eraLexiconSizes: Record<string, number>;
    averageCurvature: number;
  } {
    let totalCurvature = 0;
    const curvatureValues = Array.from(this.manifoldCurvature.values());
    for (const curvature of curvatureValues) {
      totalCurvature += curvature;
    }

    const eraLexiconSizes: Record<string, number> = {};
    const entries = Array.from(this.lexicons.entries());
    for (const [era, lexicon] of entries) {
      eraLexiconSizes[era] = lexicon.length;
    }

    return {
      testedPhrases: this.testedPhrases.size,
      geodesicPathLength: this.geodesicHistory.length,
      eraLexiconSizes,
      averageCurvature: this.manifoldCurvature.size > 0 ? totalCurvature / this.manifoldCurvature.size : 0.5
    };
  }
}

export const culturalManifold = new CulturalManifoldReconstructor();
