/**
 * Passphrase Corpus - Research-Based Patterns
 * 
 * Common passphrase patterns identified from:
 * - Academic research on brain wallet security
 * - Historical Bitcoin forum analysis
 * - Common password pattern studies
 * - Early Bitcoin era conventions (2009-2013)
 * 
 * Categories:
 * 1. Bitcoin/Crypto themed
 * 2. Pop culture references
 * 3. Common password patterns
 * 4. Numeric patterns
 * 5. Keyboard patterns
 * 6. Historical events
 * 7. Famous quotes
 * 8. Technical patterns
 */

// Bitcoin/Crypto themed passphrases (2009-2013 era)
export const CRYPTO_THEMED = [
    'satoshi nakamoto',
    'satoshinakamoto',
    'bitcoin',
    'bitcoin2009',
    'bitcoin2010',
    'bitcoin2011',
    'genesis block',
    'genesisblock',
    'the times 03/jan/2009',
    'chancellor on brink of second bailout for banks',
    'hal finney',
    'halfinney',
    'cypherpunk',
    'cypherpunks',
    'crypto currency',
    'cryptocurrency',
    'digital gold',
    'digitalgold',
    'peer to peer',
    'peertopeer',
    'p2p cash',
    'electronic cash',
    'decentralized',
    'trustless',
    'blockchain',
    'hash cash',
    'hashcash',
    'proof of work',
    'proofofwork',
    'double spend',
    'doublespend',
    'nakamoto consensus',
    'silk road',
    'silkroad',
    'mt gox',
    'mtgox',
    'pizza day',
    '10000 bitcoin pizza',
    'laszlo',
    'bitcointalk',
    'bitcoin talk',
];

// Pop culture and famous references
export const POP_CULTURE = [
    'correct horse battery staple',
    'correcthorsebatterystaple',
    'password123',
    'letmein',
    'iloveyou',
    'trustno1',
    'master',
    'dragon',
    'monkey',
    'shadow',
    'sunshine',
    'princess',
    'football',
    'baseball',
    'soccer',
    'hockey',
    'starwars',
    'star wars',
    'lord of the rings',
    'game of thrones',
    'harry potter',
    'matrix',
    'the matrix',
    'neo',
    'morpheus',
    'trinity',
    'alice in wonderland',
    'down the rabbit hole',
    'white rabbit',
    'red pill',
    'blue pill',
];

// Common password patterns
export const COMMON_PASSWORDS = [
    'password',
    'password1',
    'password123',
    'qwerty',
    'qwerty123',
    '123456',
    '12345678',
    '123456789',
    '1234567890',
    'abc123',
    'abcd1234',
    'admin',
    'admin123',
    'root',
    'root123',
    'test',
    'test123',
    'guest',
    'default',
    'changeme',
    'secret',
    'supersecret',
    'mypassword',
    'letmein123',
    'welcome',
    'welcome1',
    'login',
];

// Keyboard patterns
export const KEYBOARD_PATTERNS = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    'qazwsx',
    'qazwsxedc',
    '1qaz2wsx',
    '1qaz2wsx3edc',
    'zaq12wsx',
    '!qaz2wsx',
    'qweasdzxc',
    '1234qwer',
    'qwer1234',
    'asdf1234',
    '1234asdf',
];

// Numeric patterns
export const NUMERIC_PATTERNS = [
    '000000',
    '111111',
    '123123',
    '654321',
    '0000000000',
    '1111111111',
    '0123456789',
    '9876543210',
    '1234567890',
    '0987654321',
    '112233',
    '121212',
    '131313',
    '141414',
    '696969',
    '777777',
    '888888',
    '999999',
];

// Bitcoin-specific numeric patterns
export const BITCOIN_NUMERICS = [
    '21000000',
    '21million',
    '2100000000000000',
    '100000000',
    '1btc',
    '1bitcoin',
    '0.00000001',
    'satoshi',
    '100000000satoshi',
    '210000',
    'block 0',
    'block0',
    'block 1',
    'block1',
    'block 170',
    'block170',
];

// Famous quotes (truncated for passphrases)
export const FAMOUS_QUOTES = [
    'to be or not to be',
    'i think therefore i am',
    'the only thing we have to fear',
    'ask not what your country',
    'i have a dream',
    'one small step for man',
    'the truth is out there',
    'may the force be with you',
    'live long and prosper',
    'winter is coming',
    'valar morghulis',
    'all men must die',
    'not your keys not your coins',
    'dont trust verify',
    'be your own bank',
    'in code we trust',
    'in math we trust',
    'in crypto we trust',
];

// Technical/Hacker patterns
export const TECHNICAL_PATTERNS = [
    'root',
    'admin',
    'administrator',
    'sudo',
    'su root',
    'chmod 777',
    'rm -rf',
    'hack',
    'hacker',
    'h4ck3r',
    'l33t',
    'leet',
    '1337',
    'pwned',
    'owned',
    'shell',
    'exploit',
    'zero day',
    'zeroday',
    '0day',
    'backdoor',
    'trojan',
    'virus',
    'worm',
    'keylogger',
    'rootkit',
];

// Date patterns (Bitcoin era)
export const DATE_PATTERNS = [
    '03jan2009',
    'jan032009',
    '2009-01-03',
    '20090103',
    '01/03/2009',
    '03/01/2009',
    '2009',
    '2010',
    '2011',
    '2012',
    '2013',
    'january 2009',
    'january2009',
    'genesis 2009',
];

// Combine all into weighted corpus
export interface CorpusEntry {
    phrase: string;
    category: string;
    weight: number;  // Higher = more likely to be used
    era?: string;    // Bitcoin era relevance
}

/**
 * Get weighted passphrase corpus
 * Higher weights for crypto-themed and early Bitcoin era patterns
 */
export function getWeightedPassphraseCorpus(): CorpusEntry[] {
    const corpus: CorpusEntry[] = [];

    // Crypto themed - highest weight
    for (const phrase of CRYPTO_THEMED) {
        corpus.push({ phrase, category: 'crypto', weight: 10, era: '2009-2013' });
    }

    // Bitcoin numerics - high weight
    for (const phrase of BITCOIN_NUMERICS) {
        corpus.push({ phrase, category: 'bitcoin_numeric', weight: 8, era: '2009-2013' });
    }

    // Famous quotes - medium-high weight
    for (const phrase of FAMOUS_QUOTES) {
        corpus.push({ phrase, category: 'quotes', weight: 6 });
    }

    // Date patterns - medium weight
    for (const phrase of DATE_PATTERNS) {
        corpus.push({ phrase, category: 'dates', weight: 5, era: '2009-2013' });
    }

    // Common passwords - medium weight
    for (const phrase of COMMON_PASSWORDS) {
        corpus.push({ phrase, category: 'common', weight: 4 });
    }

    // Pop culture - lower weight
    for (const phrase of POP_CULTURE) {
        corpus.push({ phrase, category: 'culture', weight: 3 });
    }

    // Keyboard patterns - lower weight
    for (const phrase of KEYBOARD_PATTERNS) {
        corpus.push({ phrase, category: 'keyboard', weight: 2 });
    }

    // Numeric patterns - lowest weight
    for (const phrase of NUMERIC_PATTERNS) {
        corpus.push({ phrase, category: 'numeric', weight: 1 });
    }

    // Technical patterns - low weight
    for (const phrase of TECHNICAL_PATTERNS) {
        corpus.push({ phrase, category: 'technical', weight: 2 });
    }

    return corpus;
}

/**
 * Select a random passphrase using weighted sampling
 */
export function selectWeightedPassphrase(): string {
    const corpus = getWeightedPassphraseCorpus();
    const totalWeight = corpus.reduce((sum, entry) => sum + entry.weight, 0);

    let rand = Math.random() * totalWeight;
    for (const entry of corpus) {
        rand -= entry.weight;
        if (rand <= 0) {
            return entry.phrase;
        }
    }

    return corpus[0].phrase;
}

/**
 * Generate variations of a base passphrase
 */
export function generatePassphraseVariations(base: string, count: number = 10): string[] {
    const variations: Set<string> = new Set();
    variations.add(base);

    // Case variations
    variations.add(base.toLowerCase());
    variations.add(base.toUpperCase());
    variations.add(base.charAt(0).toUpperCase() + base.slice(1).toLowerCase());

    // Space variations
    variations.add(base.replace(/\s+/g, ''));
    variations.add(base.replace(/\s+/g, '_'));
    variations.add(base.replace(/\s+/g, '-'));
    variations.add(base.replace(/\s+/g, '.'));

    // Number suffix variations
    for (let i = 0; i <= 9 && variations.size < count; i++) {
        variations.add(base + i);
        variations.add(base + i + i);
    }

    // Year suffix variations
    for (const year of ['2009', '2010', '2011', '2012', '2013', '2024', '2025']) {
        if (variations.size >= count) break;
        variations.add(base + year);
    }

    // Common suffix variations
    const suffixes = ['!', '1!', '123', '@', '#', '$', '!@#'];
    for (const suffix of suffixes) {
        if (variations.size >= count) break;
        variations.add(base + suffix);
    }

    return Array.from(variations).slice(0, count);
}

/**
 * Get corpus statistics
 */
export function getCorpusStats(): {
    totalPhrases: number;
    byCategory: Record<string, number>;
    totalWeight: number;
} {
    const corpus = getWeightedPassphraseCorpus();
    const byCategory: Record<string, number> = {};

    for (const entry of corpus) {
        byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    }

    return {
        totalPhrases: corpus.length,
        byCategory,
        totalWeight: corpus.reduce((sum, e) => sum + e.weight, 0),
    };
}

/**
 * Get Bitcoin-era specific passphrases (highest priority)
 */
export function getBitcoinEraPassphrases(): string[] {
    return getWeightedPassphraseCorpus()
        .filter(e => e.era === '2009-2013')
        .map(e => e.phrase);
}
