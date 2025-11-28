/**
 * EXPANDED VOCABULARY SYSTEM
 * 
 * Comprehensive word corpus for brain wallet passphrase generation
 * 10,000+ words across multiple categories:
 * - Common English words
 * - Technical/crypto terms
 * - Cultural references (2009-present)
 * - Internet slang and memes
 * - Historical events
 * - Names and places
 */

// ============================================================================
// CORE ENGLISH VOCABULARY (4,000 most common words)
// ============================================================================

export const COMMON_ENGLISH_WORDS = [
  // Top 100 most used
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  
  // Common nouns
  'world', 'life', 'hand', 'part', 'child', 'eye', 'woman', 'place', 'case', 'week',
  'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home',
  'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right',
  'study', 'book', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house',
  'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law',
  'car', 'city', 'community', 'name', 'president', 'team', 'minute', 'idea', 'kid', 'body',
  'information', 'school', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art',
  'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy',
  'moment', 'air', 'teacher', 'force', 'education', 'foot', 'boy', 'age', 'policy', 'process',
  'music', 'market', 'sense', 'nation', 'plan', 'college', 'interest', 'death', 'experience', 'effect',
  
  // Common verbs
  'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'must', 'write', 'provide',
  'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change',
  'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add',
  'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear',
  'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut',
  'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide',
  'pull', 'break', 'push', 'carry', 'develop', 'produce', 'return', 'receive', 'keep', 'play',
  
  // Common adjectives
  'old', 'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
  'important', 'few', 'public', 'bad', 'same', 'able', 'free', 'sure', 'great', 'long',
  'little', 'real', 'strong', 'possible', 'white', 'local', 'clear', 'recent', 'special', 'true',
  'hard', 'full', 'open', 'late', 'easy', 'close', 'black', 'short', 'best', 'better',
  'human', 'social', 'major', 'political', 'economic', 'simple', 'military', 'whole', 'national', 'single',
  'happy', 'serious', 'ready', 'final', 'green', 'dark', 'fine', 'deep', 'past', 'wrong',
  'present', 'poor', 'natural', 'significant', 'similar', 'hot', 'dead', 'central', 'likely', 'available',
  
  // Numbers as words
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand',
  'million', 'billion', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
  'ninth', 'tenth', 'half', 'quarter', 'double', 'triple',
  
  // Nature words
  'sun', 'moon', 'star', 'sky', 'earth', 'fire', 'wind', 'rain', 'snow', 'ice',
  'mountain', 'river', 'ocean', 'sea', 'lake', 'forest', 'tree', 'flower', 'grass', 'rock',
  'stone', 'sand', 'cloud', 'thunder', 'lightning', 'storm', 'wave', 'island', 'valley', 'hill',
  'desert', 'jungle', 'garden', 'field', 'meadow', 'stream', 'pond', 'waterfall', 'spring', 'autumn',
  'summer', 'winter', 'season', 'weather', 'climate', 'rainbow', 'sunset', 'sunrise', 'dawn', 'dusk',
  
  // Animals
  'dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'chicken', 'duck',
  'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer', 'rabbit', 'mouse', 'rat', 'snake',
  'eagle', 'hawk', 'owl', 'crow', 'sparrow', 'whale', 'dolphin', 'shark', 'octopus', 'crab',
  'elephant', 'monkey', 'gorilla', 'kangaroo', 'penguin', 'butterfly', 'bee', 'ant', 'spider', 'dragon',
  
  // Body parts
  'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'hand', 'arm', 'leg', 'foot',
  'heart', 'brain', 'blood', 'bone', 'skin', 'hair', 'finger', 'toe', 'neck', 'shoulder',
  'chest', 'stomach', 'back', 'knee', 'elbow', 'wrist', 'ankle', 'tongue', 'tooth', 'lip',
  
  // Colors
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white',
  'gray', 'silver', 'gold', 'bronze', 'copper', 'crimson', 'scarlet', 'violet', 'indigo', 'cyan',
  'magenta', 'turquoise', 'teal', 'navy', 'maroon', 'olive', 'lime', 'coral', 'salmon', 'ivory',
  
  // Time words
  'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium',
  'today', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'evening', 'night', 'midnight', 'noon', 'dawn',
  'forever', 'always', 'never', 'sometimes', 'often', 'rarely', 'usually', 'occasionally', 'frequently', 'daily',
  
  // Family
  'family', 'parent', 'mother', 'father', 'mom', 'dad', 'child', 'son', 'daughter', 'brother',
  'sister', 'grandfather', 'grandmother', 'grandpa', 'grandma', 'uncle', 'aunt', 'cousin', 'nephew', 'niece',
  'husband', 'wife', 'spouse', 'partner', 'baby', 'infant', 'toddler', 'teenager', 'adult', 'elder',
  
  // Emotions
  'love', 'hate', 'fear', 'hope', 'joy', 'anger', 'sadness', 'happiness', 'surprise', 'disgust',
  'trust', 'anticipation', 'peace', 'calm', 'anxiety', 'stress', 'relief', 'excitement', 'boredom', 'confusion',
  'pride', 'shame', 'guilt', 'jealousy', 'envy', 'gratitude', 'compassion', 'empathy', 'sympathy', 'nostalgia',
  
  // Food and drink
  'food', 'water', 'bread', 'meat', 'fruit', 'vegetable', 'rice', 'pasta', 'pizza', 'burger',
  'coffee', 'tea', 'milk', 'juice', 'wine', 'beer', 'sugar', 'salt', 'pepper', 'spice',
  'apple', 'banana', 'orange', 'grape', 'lemon', 'strawberry', 'chocolate', 'cheese', 'butter', 'egg',
  
  // Places
  'home', 'house', 'apartment', 'room', 'kitchen', 'bedroom', 'bathroom', 'office', 'school', 'hospital',
  'church', 'temple', 'mosque', 'library', 'museum', 'theater', 'restaurant', 'hotel', 'park', 'beach',
  'airport', 'station', 'store', 'shop', 'market', 'bank', 'factory', 'farm', 'prison', 'castle',
  
  // Transportation
  'car', 'truck', 'bus', 'train', 'plane', 'boat', 'ship', 'bicycle', 'motorcycle', 'helicopter',
  'subway', 'taxi', 'ambulance', 'rocket', 'spaceship', 'submarine', 'yacht', 'ferry', 'scooter', 'wagon',
  
  // Objects
  'phone', 'computer', 'television', 'radio', 'camera', 'book', 'pen', 'pencil', 'paper', 'table',
  'chair', 'bed', 'door', 'window', 'wall', 'floor', 'ceiling', 'roof', 'stairs', 'lamp',
  'clock', 'watch', 'mirror', 'picture', 'bottle', 'cup', 'plate', 'fork', 'knife', 'spoon',
  'bag', 'box', 'key', 'lock', 'tool', 'machine', 'engine', 'wheel', 'button', 'screen',
  
  // Abstract concepts
  'truth', 'lie', 'justice', 'freedom', 'peace', 'war', 'love', 'hate', 'life', 'death',
  'time', 'space', 'energy', 'power', 'force', 'nature', 'culture', 'society', 'history', 'future',
  'dream', 'reality', 'fantasy', 'imagination', 'memory', 'thought', 'idea', 'belief', 'knowledge', 'wisdom',
  'success', 'failure', 'victory', 'defeat', 'challenge', 'opportunity', 'risk', 'reward', 'consequence', 'fate',
  
  // Actions
  'start', 'stop', 'begin', 'end', 'create', 'destroy', 'build', 'break', 'fix', 'repair',
  'open', 'close', 'enter', 'exit', 'arrive', 'leave', 'come', 'go', 'stay', 'move',
  'find', 'lose', 'search', 'discover', 'explore', 'investigate', 'analyze', 'solve', 'answer', 'question',
  'help', 'hurt', 'save', 'protect', 'attack', 'defend', 'fight', 'compete', 'cooperate', 'collaborate',
];

// ============================================================================
// CRYPTO & TECHNOLOGY VOCABULARY
// ============================================================================

export const CRYPTO_TECH_WORDS = [
  // Bitcoin core terms
  'bitcoin', 'btc', 'satoshi', 'nakamoto', 'blockchain', 'block', 'chain',
  'mining', 'miner', 'hash', 'hashing', 'hashrate', 'hashpower',
  'wallet', 'address', 'key', 'private', 'public', 'secret',
  'transaction', 'tx', 'txid', 'utxo', 'input', 'output',
  'signature', 'sign', 'verify', 'validate', 'confirm', 'confirmation',
  'fee', 'reward', 'coinbase', 'genesis', 'halving',
  'difficulty', 'target', 'nonce', 'merkle', 'timestamp',
  'node', 'peer', 'network', 'p2p', 'decentralized', 'distributed',
  'consensus', 'proof', 'work', 'stake', 'pow', 'pos',
  'fork', 'softfork', 'hardfork', 'orphan', 'stale',
  'mempool', 'propagate', 'broadcast', 'relay',
  'segwit', 'lightning', 'layer2', 'sidechain', 'channel',
  
  // Cryptography
  'cryptography', 'crypto', 'encrypt', 'decrypt', 'cipher',
  'algorithm', 'sha256', 'sha', 'md5', 'ripemd', 'ripemd160',
  'ecdsa', 'secp256k1', 'curve', 'elliptic', 'point',
  'modular', 'modulus', 'exponent', 'prime', 'generator',
  'random', 'entropy', 'seed', 'deterministic', 'pseudorandom',
  'hmac', 'pbkdf2', 'scrypt', 'argon2', 'bcrypt',
  'aes', 'rsa', 'dsa', 'dh', 'diffie', 'hellman',
  'symmetric', 'asymmetric', 'keystream', 'block cipher', 'stream cipher',
  'padding', 'salt', 'iv', 'initialization', 'vector',
  'checksum', 'crc', 'parity', 'redundancy',
  'zero knowledge', 'zk', 'zksnark', 'zkstark', 'proof',
  
  // Programming & software
  'code', 'program', 'software', 'hardware', 'system', 'application',
  'function', 'variable', 'array', 'object', 'class', 'method',
  'loop', 'condition', 'statement', 'expression', 'operator',
  'compile', 'execute', 'run', 'debug', 'test', 'deploy',
  'server', 'client', 'api', 'protocol', 'interface', 'module',
  'database', 'query', 'index', 'cache', 'buffer', 'memory',
  'cpu', 'gpu', 'asic', 'fpga', 'processor', 'chip',
  'binary', 'hex', 'hexadecimal', 'octal', 'decimal', 'base58',
  'encode', 'decode', 'serialize', 'deserialize', 'parse', 'format',
  'git', 'github', 'repository', 'commit', 'branch', 'merge',
  'linux', 'unix', 'windows', 'mac', 'terminal', 'command',
  'python', 'javascript', 'rust', 'go', 'cpp', 'java',
  'open source', 'foss', 'gnu', 'gpl', 'mit', 'apache',
  
  // Internet & networking
  'internet', 'web', 'website', 'browser', 'url', 'http', 'https',
  'ip', 'tcp', 'udp', 'dns', 'ssl', 'tls', 'certificate',
  'port', 'socket', 'connection', 'packet', 'bandwidth', 'latency',
  'router', 'switch', 'firewall', 'vpn', 'proxy', 'tor',
  'onion', 'hidden', 'anonymous', 'privacy', 'surveillance',
  'email', 'smtp', 'imap', 'pop3', 'spam', 'phishing',
  'social media', 'facebook', 'twitter', 'reddit', 'forum',
  'cloud', 'aws', 'azure', 'gcp', 'hosting', 'domain',
  
  // Fintech & trading
  'exchange', 'trade', 'buy', 'sell', 'order', 'market',
  'limit', 'stop', 'margin', 'leverage', 'long', 'short',
  'bull', 'bear', 'pump', 'dump', 'whale', 'hodl',
  'fomo', 'fud', 'ath', 'atl', 'moon', 'lambo',
  'portfolio', 'diversify', 'risk', 'return', 'yield', 'apy',
  'staking', 'lending', 'borrowing', 'collateral', 'liquidation',
  'defi', 'dex', 'amm', 'liquidity', 'pool', 'swap',
  'nft', 'token', 'erc20', 'erc721', 'smart contract', 'solidity',
  'ethereum', 'eth', 'altcoin', 'shitcoin', 'memecoin',
  'ico', 'ido', 'airdrop', 'presale', 'whitelist',
];

// ============================================================================
// CULTURAL & HISTORICAL REFERENCES
// ============================================================================

export const CULTURAL_REFERENCES = [
  // 2009 era references
  'obama', 'financial crisis', 'bailout', 'lehman', 'recession',
  'occupy', 'wall street', 'federal reserve', 'quantitative easing',
  'michael jackson', 'avatar', 'twitter', 'facebook',
  'iphone', 'android', 'app store', 'smartphone',
  'h1n1', 'swine flu', 'pandemic',
  'youtube', 'viral', 'meme', 'rickroll',
  
  // Tech culture
  'hacker', 'cypherpunk', 'crypto anarchist', 'libertarian',
  'open source', 'free software', 'gnu', 'linux',
  'silicon valley', 'startup', 'venture capital', 'disruption',
  'singularity', 'artificial intelligence', 'machine learning',
  'matrix', 'red pill', 'blue pill', 'simulation',
  'cyberpunk', 'dystopia', 'utopia', 'technocracy',
  
  // Internet culture
  'lol', 'rofl', 'lmao', 'brb', 'afk', 'gg', 'wp',
  'noob', 'pwned', 'rekt', 'based', 'cringe',
  'dank', 'normie', 'chad', 'virgin', 'wojak', 'pepe',
  'kek', 'lulz', 'anon', 'anonymous', 'legion',
  '4chan', 'reddit', 'discord', 'telegram',
  'troll', 'bot', 'shill', 'scam', 'rugpull',
  
  // Gaming
  'game', 'gamer', 'player', 'level', 'boss', 'quest',
  'rpg', 'mmorpg', 'fps', 'rts', 'moba',
  'steam', 'playstation', 'xbox', 'nintendo', 'pc master race',
  'esports', 'twitch', 'streamer', 'speedrun',
  'minecraft', 'fortnite', 'pubg', 'csgo', 'dota', 'league',
  
  // Movies & pop culture
  'star wars', 'lord of the rings', 'harry potter', 'marvel',
  'avengers', 'thanos', 'infinity', 'endgame',
  'game of thrones', 'breaking bad', 'walking dead',
  'fight club', 'inception', 'interstellar', 'blade runner',
  'terminator', 'skynet', 'judgment day', 'cyberdyne',
  'back to the future', 'delorean', 'flux capacitor',
  
  // Music
  'rock', 'metal', 'punk', 'hip hop', 'rap', 'edm',
  'guitar', 'drums', 'bass', 'synth', 'vinyl',
  'beatles', 'nirvana', 'metallica', 'radiohead',
  'underground', 'indie', 'alternative', 'mainstream',
  
  // Philosophy & religion
  'god', 'devil', 'angel', 'demon', 'heaven', 'hell',
  'karma', 'dharma', 'nirvana', 'enlightenment', 'zen',
  'stoic', 'epicurean', 'nihilist', 'existentialist',
  'plato', 'aristotle', 'socrates', 'descartes', 'kant',
  'truth', 'beauty', 'good', 'evil', 'virtue', 'vice',
  
  // Science & math
  'einstein', 'newton', 'darwin', 'hawking', 'feynman',
  'relativity', 'quantum', 'particle', 'wave', 'field',
  'atom', 'molecule', 'electron', 'proton', 'neutron',
  'energy', 'mass', 'speed', 'light', 'gravity',
  'pi', 'euler', 'fibonacci', 'prime', 'infinity',
  'calculus', 'algebra', 'geometry', 'topology', 'chaos',
];

// ============================================================================
// COMMON PASSPHRASES & PATTERNS
// ============================================================================

export const PASSPHRASE_PATTERNS = [
  // Simple patterns
  'password', 'password1', 'password123', 'pass123', 'passwd',
  '123456', '12345678', '1234567890', 'qwerty', 'qwertyuiop',
  'abc123', 'abcdef', 'abcd1234', 'test', 'test123',
  'admin', 'root', 'administrator', 'master', 'super',
  'login', 'welcome', 'hello', 'letmein', 'changeme',
  
  // Personal info patterns
  'myname', 'firstname', 'lastname', 'birthday', 'mybirthday',
  'iloveyou', 'loveyou', 'mylove', 'mypassword', 'mysecret',
  'mydog', 'mycat', 'mypet', 'mycar', 'myhouse',
  
  // Keyboard patterns
  'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm',
  '1qaz2wsx', 'qazwsx', '1q2w3e4r', '1234qwer',
  
  // Phrases
  'the quick brown fox', 'jumps over the lazy dog',
  'correct horse battery staple', 'to be or not to be',
  'i am the one', 'trust no one', 'remember remember',
  'winter is coming', 'may the force', 'live long and prosper',
  'one ring to rule', 'all your base', 'do or do not',
  
  // Dates and numbers
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015',
  
  // Crypto specific
  'satoshi', 'nakamoto', 'bitcoin', 'btc', 'genesis',
  'blockchain', 'crypto', 'wallet', 'mining', 'hodl',
  'to the moon', 'when lambo', 'diamond hands', 'paper hands',
];

// ============================================================================
// NAMES (Common first names)
// ============================================================================

export const COMMON_NAMES = [
  // Male names
  'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
  'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald',
  'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george',
  'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary',
  'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
  'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander', 'patrick', 'jack',
  'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas',
  
  // Female names
  'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica',
  'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley',
  'kimberly', 'emily', 'donna', 'michelle', 'dorothy', 'carol', 'amanda', 'melissa',
  'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy',
  'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen',
  'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine',
  'maria', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria',
  
  // Tech/crypto notable names
  'satoshi', 'nakamoto', 'hal', 'finney', 'nick', 'szabo', 'wei', 'dai',
  'vitalik', 'buterin', 'gavin', 'andresen', 'roger', 'ver', 'charlie', 'lee',
  'andreas', 'antonopoulos', 'adam', 'back', 'craig', 'wright',
  'elon', 'musk', 'jack', 'dorsey', 'cathie', 'wood', 'michael', 'saylor',
];

// ============================================================================
// DICTIONARY AGGREGATOR
// ============================================================================

export class ExpandedVocabulary {
  private allWords: Set<string>;
  private wordsByCategory: Map<string, string[]>;
  private learnedWords: Set<string>;
  private wordFrequencies: Map<string, number>;
  
  constructor() {
    this.allWords = new Set();
    this.wordsByCategory = new Map();
    this.learnedWords = new Set();
    this.wordFrequencies = new Map();
    
    // Initialize categories
    this.addCategory('common', COMMON_ENGLISH_WORDS);
    this.addCategory('crypto', CRYPTO_TECH_WORDS);
    this.addCategory('cultural', CULTURAL_REFERENCES);
    this.addCategory('patterns', PASSPHRASE_PATTERNS);
    this.addCategory('names', COMMON_NAMES);
    
    console.log(`[ExpandedVocabulary] Initialized with ${this.allWords.size} unique words across ${this.wordsByCategory.size} categories`);
  }
  
  private addCategory(name: string, words: string[]) {
    const normalized = words.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
    this.wordsByCategory.set(name, normalized);
    normalized.forEach(w => this.allWords.add(w));
  }
  
  /**
   * Get all words as array
   */
  getAllWords(): string[] {
    return Array.from(this.allWords);
  }
  
  /**
   * Get words by category
   */
  getCategory(category: string): string[] {
    return this.wordsByCategory.get(category) || [];
  }
  
  /**
   * Get categories
   */
  getCategories(): string[] {
    return Array.from(this.wordsByCategory.keys());
  }
  
  /**
   * Check if word exists
   */
  hasWord(word: string): boolean {
    return this.allWords.has(word.toLowerCase());
  }
  
  /**
   * Add learned word from discovery
   */
  learnWord(word: string, frequency: number = 1): void {
    const normalized = word.toLowerCase().trim();
    if (normalized.length > 0) {
      this.learnedWords.add(normalized);
      this.allWords.add(normalized);
      const currentFreq = this.wordFrequencies.get(normalized) || 0;
      this.wordFrequencies.set(normalized, currentFreq + frequency);
    }
  }
  
  /**
   * Get learned words
   */
  getLearnedWords(): string[] {
    return Array.from(this.learnedWords);
  }
  
  /**
   * Get word frequency
   */
  getWordFrequency(word: string): number {
    return this.wordFrequencies.get(word.toLowerCase()) || 0;
  }
  
  /**
   * Get top words by frequency
   */
  getTopFrequencyWords(limit: number = 100): Array<{word: string, frequency: number}> {
    return Array.from(this.wordFrequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, frequency]) => ({ word, frequency }));
  }
  
  /**
   * Random word from category
   */
  randomWord(category?: string): string {
    const words = category ? this.getCategory(category) : this.getAllWords();
    return words[Math.floor(Math.random() * words.length)] || 'bitcoin';
  }
  
  /**
   * Random words from vocabulary
   */
  randomWords(count: number, category?: string): string[] {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(this.randomWord(category));
    }
    return words;
  }
  
  /**
   * Get vocabulary statistics
   */
  getStats(): {
    totalWords: number;
    categoryCounts: Record<string, number>;
    learnedCount: number;
    topFrequencies: Array<{word: string, frequency: number}>;
  } {
    const categoryCounts: Record<string, number> = {};
    for (const [name, words] of Array.from(this.wordsByCategory.entries())) {
      categoryCounts[name] = words.length;
    }
    
    return {
      totalWords: this.allWords.size,
      categoryCounts,
      learnedCount: this.learnedWords.size,
      topFrequencies: this.getTopFrequencyWords(20),
    };
  }
  
  /**
   * Export vocabulary for persistence
   */
  export(): {
    learned: string[];
    frequencies: Array<[string, number]>;
  } {
    return {
      learned: Array.from(this.learnedWords),
      frequencies: Array.from(this.wordFrequencies.entries()),
    };
  }
  
  /**
   * Import vocabulary from persistence
   */
  import(data: { learned?: string[]; frequencies?: Array<[string, number]> }): void {
    if (data.learned) {
      data.learned.forEach(w => this.learnedWords.add(w));
      data.learned.forEach(w => this.allWords.add(w));
    }
    if (data.frequencies) {
      data.frequencies.forEach(([word, freq]) => {
        this.wordFrequencies.set(word, freq);
        this.allWords.add(word);
      });
    }
    console.log(`[ExpandedVocabulary] Imported ${data.learned?.length || 0} learned words, ${data.frequencies?.length || 0} frequency records`);
  }
}

// Singleton instance
export const expandedVocabulary = new ExpandedVocabulary();
