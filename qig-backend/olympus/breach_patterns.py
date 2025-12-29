"""
Historical Breach Data Integration

Integrates known breach passwords and patterns from historical data breaches
as seeds for hypothesis generation. This leverages the reality that many users
reuse passwords across services, including for their Bitcoin wallets.

Data sources (conceptual - actual data not included for security/legal reasons):
- RockYou breach (2009) - 32M passwords
- LinkedIn breach (2012) - 117M passwords
- Adobe breach (2013) - 153M passwords
- Common password lists (e.g., SecLists, Have I Been Pwned)

Architecture:
- Breach patterns stored locally (no actual breach data committed)
- Pattern extraction (common structures, character substitutions)
- Temporal filtering (only breaches before wallet creation)
- Privacy-preserving (patterns only, not actual passwords)
"""

from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime
from collections import Counter
import re


# Common password patterns extracted from historical breaches
# These are patterns, NOT actual passwords from breaches
COMMON_BREACH_PATTERNS = [
    # Simple patterns
    'password', 'password1', 'password123', 'password2009', 'password2010',
    '123456', '12345678', '123456789', '1234567890',
    'qwerty', 'qwerty123', 'qwertyuiop',
    'abc123', 'abc123456',
    
    # Leetspeak patterns
    'p@ssw0rd', 'p@ssword', 'passw0rd',
    'l3tm31n', 'letme1n',
    'tr0ub4dor&3',
    
    # Bitcoin/crypto related (common in 2009-2013)
    'bitcoin', 'bitcoin123', 'btc123',
    'crypto', 'cryptocurrency',
    'wallet', 'mywallet', 'wallet2009',
    'satoshi', 'nakamoto', 'satoshinakamoto',
    
    # Keyboard walks
    'qazwsx', 'zxcvbn', '1qaz2wsx', '!qaz2wsx',
    'asdfgh', 'asdfghjkl',
    
    # Names + numbers (patterns)
    'michael123', 'jennifer123', 'ashley123',
    'daniel2009', 'jessica2010',
    
    # Common phrases
    'iloveyou', 'iloveyou123',
    'monkey', 'dragon', 'master',
    'shadow', 'sunshine', 'princess',
    'football', 'baseball', 'basketball',
    'welcome', 'welcome123',
    
    # Admin/default
    'admin', 'admin123', 'administrator',
    'root', 'root123',
    'user', 'guest', 'test',
]

# Character substitution patterns (leetspeak)
LEETSPEAK_SUBSTITUTIONS = {
    'a': ['@', '4'],
    'e': ['3'],
    'i': ['1', '!'],
    'o': ['0'],
    's': ['$', '5'],
    't': ['7'],
    'l': ['1'],
    'b': ['8'],
    'g': ['9'],
}

# Common suffixes from breach data
COMMON_SUFFIXES = [
    '!', '!!', '!!!',
    '1', '12', '123', '1234', '12345', '123456',
    '321', '99', '00',
    '2009', '2010', '2011', '2012', '2013',
]

# Temporal breach data (year → common patterns from that era)
TEMPORAL_BREACH_PATTERNS = {
    2009: ['password', 'password1', '123456', 'iloveyou', 'abc123', 'monkey', 'dragon'],
    2010: ['password123', '123456789', 'qwerty', 'letmein', 'welcome', 'football'],
    2011: ['password1234', 'admin', 'root', 'master', 'shadow', 'princess'],
    2012: ['linkedin', 'password2012', 'welcome123', 'baseball', 'batman'],
    2013: ['adobe123', 'password2013', 'sunshine', 'trustno1', 'starwars'],
}


def extract_pattern_structure(password: str) -> str:
    """
    Extract the structural pattern of a password.
    
    Examples:
    - "Password123" → "Ulllllllnnn" (Upper, lower*8, number*3)
    - "p@ssw0rd!" → "lslsllnls" (letter, symbol, letter, symbol, etc.)
    """
    pattern = []
    for char in password:
        if char.isupper():
            pattern.append('U')
        elif char.islower():
            pattern.append('l')
        elif char.isdigit():
            pattern.append('n')
        else:
            pattern.append('s')  # symbol
    return ''.join(pattern)


def apply_leetspeak(word: str, substitution_rate: float = 0.5) -> List[str]:
    """
    Apply leetspeak substitutions to a word.
    
    Args:
        word: Base word
        substitution_rate: Probability of substituting each character (0-1)
    
    Returns:
        List of leetspeak variants
    """
    variants = [word]
    
    for i, char in enumerate(word.lower()):
        if char in LEETSPEAK_SUBSTITUTIONS:
            new_variants = []
            for variant in variants:
                # Keep original
                new_variants.append(variant)
                
                # Add substitutions
                for replacement in LEETSPEAK_SUBSTITUTIONS[char]:
                    new_word = list(variant)
                    new_word[i] = replacement
                    new_variants.append(''.join(new_word))
            
            variants = new_variants[:50]  # Limit explosion
    
    return variants


def generate_breach_pattern_variants(base_pattern: str, max_variants: int = 20) -> List[str]:
    """
    Generate variants of a breach pattern using common transformations.
    
    Transformations:
    - Add common suffixes
    - Apply leetspeak
    - Capitalize first letter
    - ALL CAPS
    """
    variants = set()
    
    # Add base pattern
    variants.add(base_pattern)
    
    # Capitalize first letter
    variants.add(base_pattern.capitalize())
    
    # ALL CAPS
    variants.add(base_pattern.upper())
    
    # Add suffixes
    for suffix in COMMON_SUFFIXES[:10]:
        variants.add(base_pattern + suffix)
        variants.add(base_pattern.capitalize() + suffix)
    
    # Apply leetspeak (limited to avoid explosion)
    if len(base_pattern) <= 10:
        leetspeak_variants = apply_leetspeak(base_pattern)
        variants.update(leetspeak_variants[:5])
    
    return list(variants)[:max_variants]


def get_breach_patterns_by_year(year: int) -> List[str]:
    """
    Get common breach patterns from a specific year.
    
    Useful for targeting wallets created in a specific year.
    """
    return TEMPORAL_BREACH_PATTERNS.get(year, [])


def get_all_breach_patterns(include_variants: bool = True, max_per_pattern: int = 5) -> List[str]:
    """
    Get all common breach patterns, optionally with variants.
    
    Args:
        include_variants: Whether to include variant generations
        max_per_pattern: Maximum variants per base pattern
    
    Returns:
        List of breach patterns
    """
    if not include_variants:
        return COMMON_BREACH_PATTERNS.copy()
    
    all_patterns = set()
    
    for base_pattern in COMMON_BREACH_PATTERNS:
        variants = generate_breach_pattern_variants(base_pattern, max_per_pattern)
        all_patterns.update(variants)
    
    return list(all_patterns)


def get_crypto_specific_breach_patterns() -> List[str]:
    """
    Get breach patterns specifically related to Bitcoin/crypto.
    
    These are patterns that Bitcoin users were likely to use in 2009-2013.
    """
    crypto_patterns = [
        'bitcoin', 'bitcoin123', 'btc', 'btc123',
        'satoshi', 'nakamoto', 'satoshinakamoto',
        'wallet', 'mywallet', 'mybitcoin',
        'crypto', 'cryptocurrency',
        'digital', 'digitalmoney', 'digitalcash',
        'electronic', 'electroniccash',
        'peer2peer', 'p2p',
        'blockchain', 'block', 'chain',
        'mining', 'miner', 'bitcoinminer',
        'privatekey', 'publickey',
    ]
    
    # Add year variants
    crypto_with_years = []
    for pattern in crypto_patterns:
        crypto_with_years.append(pattern)
        for year in [2009, 2010, 2011, 2012, 2013]:
            crypto_with_years.append(f"{pattern}{year}")
    
    return crypto_with_years


def generate_pattern_based_hypotheses(
    seed_words: List[str],
    breach_patterns: List[str],
    max_combinations: int = 100
) -> List[str]:
    """
    Generate hypotheses by combining seed words with breach patterns.
    
    Example:
    - seed_word: "satoshi"
    - pattern: "password123" structure
    - result: "satoshi123"
    """
    hypotheses = []
    
    for word in seed_words:
        # Add word with common suffixes
        for suffix in COMMON_SUFFIXES[:5]:
            hypotheses.append(word + suffix)
        
        # Apply leetspeak
        leetspeak_variants = apply_leetspeak(word)
        hypotheses.extend(leetspeak_variants[:3])
        
        # Combine with breach patterns
        for pattern in breach_patterns[:10]:
            # word + pattern
            hypotheses.append(word + pattern)
            # pattern + word
            hypotheses.append(pattern + word)
    
    return list(set(hypotheses))[:max_combinations]


def extract_common_structures(passwords: List[str]) -> Dict[str, int]:
    """
    Extract common structural patterns from a list of passwords.
    
    Returns:
        Dictionary of pattern → frequency
    """
    structures = Counter()
    
    for password in passwords:
        structure = extract_pattern_structure(password)
        structures[structure] += 1
    
    return dict(structures.most_common(50))


def get_high_priority_breach_patterns() -> List[str]:
    """
    Get the most commonly used breach patterns (highest priority for testing).
    
    These are the patterns most likely to be reused for Bitcoin wallets.
    """
    return [
        'password', 'password123', '123456', '12345678',
        'qwerty', 'abc123', 'iloveyou', 'letmein',
        'monkey', 'dragon', 'master', 'shadow',
        'bitcoin', 'bitcoin123', 'satoshi', 'wallet',
        'p@ssw0rd', 'passw0rd', 'admin', 'admin123',
    ]


def filter_by_temporal_plausibility(
    patterns: List[str],
    wallet_year: int,
    strict: bool = True
) -> List[str]:
    """
    Filter breach patterns by temporal plausibility.
    
    Only includes patterns from breaches that occurred before the wallet was created.
    
    Args:
        patterns: List of patterns to filter
        wallet_year: Year the wallet was created
        strict: If True, only include patterns from that year or earlier
    
    Returns:
        Filtered list of patterns
    """
    if not strict:
        return patterns
    
    # Map patterns to their likely year of popularity
    pattern_years = {}
    for year, year_patterns in TEMPORAL_BREACH_PATTERNS.items():
        for pattern in year_patterns:
            pattern_years[pattern] = year
    
    # Filter patterns
    filtered = []
    for pattern in patterns:
        pattern_year = pattern_years.get(pattern, 2009)  # Default to 2009
        if pattern_year <= wallet_year:
            filtered.append(pattern)
    
    return filtered


class BreachPatternGenerator:
    """
    Generator for hypothesis creation using historical breach patterns.
    
    This class provides methods to generate password hypotheses based on
    patterns learned from historical data breaches.
    """
    
    def __init__(self, wallet_year: Optional[int] = None):
        self.wallet_year = wallet_year
        self.patterns_cache = {}
    
    def generate_hypotheses(
        self,
        n: int = 100,
        include_crypto: bool = True,
        include_leetspeak: bool = True,
        temporal_filter: bool = True
    ) -> List[str]:
        """
        Generate password hypotheses based on breach patterns.
        
        Args:
            n: Number of hypotheses to generate
            include_crypto: Include crypto-specific patterns
            include_leetspeak: Include leetspeak variants
            temporal_filter: Filter by wallet year (if set)
        
        Returns:
            List of password hypotheses
        """
        hypotheses = set()
        
        # Get base patterns
        base_patterns = COMMON_BREACH_PATTERNS.copy()
        
        if include_crypto:
            base_patterns.extend(get_crypto_specific_breach_patterns())
        
        # Apply temporal filter
        if temporal_filter and self.wallet_year:
            base_patterns = filter_by_temporal_plausibility(
                base_patterns,
                self.wallet_year
            )
        
        # Generate variants
        for pattern in base_patterns[:50]:  # Limit to prevent explosion
            hypotheses.add(pattern)
            
            # Add with suffixes
            for suffix in COMMON_SUFFIXES[:5]:
                hypotheses.add(pattern + suffix)
            
            # Add leetspeak if enabled
            if include_leetspeak and len(pattern) <= 10:
                leetspeak_variants = apply_leetspeak(pattern)
                hypotheses.update(leetspeak_variants[:3])
        
        return list(hypotheses)[:n]
    
    def get_stats(self) -> Dict:
        """Get statistics about available breach patterns"""
        return {
            'base_patterns': len(COMMON_BREACH_PATTERNS),
            'temporal_patterns': sum(len(v) for v in TEMPORAL_BREACH_PATTERNS.values()),
            'crypto_patterns': len(get_crypto_specific_breach_patterns()),
            'high_priority': len(get_high_priority_breach_patterns()),
            'wallet_year': self.wallet_year,
        }
