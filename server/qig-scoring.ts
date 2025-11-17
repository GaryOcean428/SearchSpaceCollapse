export interface QIGScore {
  contextScore: number;
  eleganceScore: number;
  typingScore: number;
  totalScore: number;
}

const CONTEXT_KEYWORDS_2009 = [
  "bitcoin", "satoshi", "nakamoto", "proof", "work", "chain", "block", "peer",
  "cash", "electronic", "transaction", "digital", "crypto", "hash", "mining",
  "double", "spending", "trust", "decentralized", "network", "node", "consensus",
  "chancellor", "brink", "bailout", "banks", "crisis", "currency", "money",
  "freedom", "privacy", "cypherpunk", "encryption", "signature", "key", "address",
  "genesis", "timestamp", "merkle", "difficulty", "reward", "halving", "wallet",
];

const MAC_AESTHETIC_WORDS = [
  "simple", "elegant", "beautiful", "clean", "minimalist", "design", "think",
  "different", "sophistication", "ultimate", "clarity", "focus", "intuitive",
  "seamless", "refined", "crafted", "artisan", "quality", "excellence", "innovation",
];

const PHILOSOPHY_WORDS = [
  "philosophy", "principle", "truth", "wisdom", "knowledge", "enlightenment",
  "consciousness", "awareness", "reality", "existence", "meaning", "purpose",
  "vision", "ideal", "values", "ethics", "virtue", "integrity", "honor",
];

const EASY_TYPING_BIGRAMS = [
  "th", "he", "in", "er", "an", "re", "nd", "at", "on", "nt",
  "ha", "es", "st", "en", "ed", "to", "it", "ou", "ea", "hi",
];

const HARD_TYPING_PATTERNS = ["zx", "qz", "pq", "iu", "nm", "vb"];

export function scorePhrase(phrase: string): QIGScore {
  const words = phrase.toLowerCase().trim().split(/\s+/);
  
  const contextScore = calculateContextScore(words);
  const eleganceScore = calculateEleganceScore(words, phrase);
  const typingScore = calculateTypingScore(phrase);
  
  const totalScore = (
    contextScore * 0.4 +
    eleganceScore * 0.3 +
    typingScore * 0.3
  );

  return {
    contextScore: Math.round(contextScore * 100) / 100,
    eleganceScore: Math.round(eleganceScore * 100) / 100,
    typingScore: Math.round(typingScore * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
  };
}

function calculateContextScore(words: string[]): number {
  let score = 0;
  let matches = 0;

  for (const word of words) {
    if (CONTEXT_KEYWORDS_2009.includes(word)) {
      matches++;
      score += 10;
    }
  }

  const yearMatch = words.some(w => 
    w.includes("2009") || w.includes("2008") || 
    w.includes("january") || w.includes("february")
  );
  if (yearMatch) score += 15;

  const cryptoPhrase = words.some(w => 
    w.includes("encrypt") || w.includes("decrypt") || w.includes("signature")
  );
  if (cryptoPhrase) score += 10;

  return Math.min(100, score);
}

function calculateEleganceScore(words: string[], fullPhrase: string): number {
  let score = 50;

  let macMatches = 0;
  for (const word of words) {
    if (MAC_AESTHETIC_WORDS.includes(word)) {
      macMatches++;
    }
    if (PHILOSOPHY_WORDS.includes(word)) {
      macMatches++;
    }
  }
  score += macMatches * 8;

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  if (avgWordLength >= 5 && avgWordLength <= 8) {
    score += 10;
  } else if (avgWordLength < 3 || avgWordLength > 12) {
    score -= 10;
  }

  const hasProperStructure = /^[a-z\s]+$/i.test(fullPhrase);
  if (hasProperStructure) {
    score += 10;
  }

  const hasRepeats = new Set(words).size !== words.length;
  if (hasRepeats) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateTypingScore(phrase: string): number {
  let score = 50;
  const text = phrase.toLowerCase().replace(/\s+/g, "");

  let easyBigramCount = 0;
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text.substring(i, i + 2);
    if (EASY_TYPING_BIGRAMS.includes(bigram)) {
      easyBigramCount++;
    }
  }
  const easyBigramRatio = easyBigramCount / (text.length - 1);
  score += easyBigramRatio * 30;

  let hardPatternCount = 0;
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text.substring(i, i + 2);
    if (HARD_TYPING_PATTERNS.includes(bigram)) {
      hardPatternCount++;
    }
  }
  score -= hardPatternCount * 5;

  const homeRowChars = "asdfghjkl";
  let homeRowCount = 0;
  for (const char of text) {
    if (homeRowChars.includes(char)) {
      homeRowCount++;
    }
  }
  const homeRowRatio = homeRowCount / text.length;
  score += homeRowRatio * 20;

  const length = text.length;
  if (length >= 40 && length <= 80) {
    score += 10;
  } else if (length > 120) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}
