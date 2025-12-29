"""
Electrum Legacy Seed Support

Electrum wallets (pre-BIP39) used a different seed format:
- 12 words from Electrum wordlist (NOT BIP39)
- Different derivation path
- Different checksum validation

This module provides support for generating and validating Electrum legacy seeds
for recovery of old wallets created before BIP39 became standard (pre-2013).
"""

from typing import List, Optional
import hashlib
import hmac


# Electrum old wordlist (pre-BIP39, used until 2013)
# This is a simplified version - full wordlist would need to be loaded from file
ELECTRUM_OLD_WORDLIST = [
    'like', 'just', 'love', 'know', 'never', 'want', 'time', 'out', 'there',
    'make', 'look', 'eye', 'down', 'only', 'think', 'heart', 'back', 'then',
    'into', 'about', 'more', 'away', 'still', 'them', 'take', 'thing', 'even',
    'through', 'long', 'always', 'world', 'too', 'friend', 'tell', 'try', 'hand',
    'thought', 'over', 'here', 'other', 'need', 'smile', 'again', 'much', 'cry',
    'been', 'night', 'ever', 'little', 'said', 'end', 'some', 'those', 'around',
    # Note: Real Electrum wordlist has ~1626 words
]


def is_electrum_seed(seed: str) -> bool:
    """
    Check if a seed phrase is an Electrum seed (vs BIP39).
    Electrum seeds have a version number encoded in their checksum.
    """
    words = seed.strip().lower().split()
    
    # Electrum seeds are typically 12 or 13 words
    if len(words) not in [12, 13]:
        return False
    
    # Check if words are from Electrum wordlist (simplified check)
    # In reality, would need full wordlist comparison
    return True


def generate_electrum_seed(word_count: int = 12) -> str:
    """
    Generate an Electrum legacy seed phrase.
    
    Note: This is a simplified implementation for hypothesis generation.
    Real Electrum seed generation requires proper entropy and checksum validation.
    """
    import random
    
    if len(ELECTRUM_OLD_WORDLIST) < word_count:
        # If we don't have enough words, just use what we have
        words = random.choices(ELECTRUM_OLD_WORDLIST, k=word_count)
    else:
        words = random.sample(ELECTRUM_OLD_WORDLIST, word_count)
    
    return ' '.join(words)


def generate_electrum_seed_variants(
    base_seed: Optional[str] = None,
    n: int = 50
) -> List[str]:
    """
    Generate Electrum seed variants for hypothesis testing.
    
    If base_seed is provided, generates variations of it.
    Otherwise, generates random Electrum seeds.
    """
    variants = []
    
    if base_seed:
        words = base_seed.strip().lower().split()
        
        # Generate permutations
        import random
        for _ in range(n):
            shuffled = words.copy()
            random.shuffle(shuffled)
            variants.append(' '.join(shuffled))
    else:
        # Generate random Electrum seeds
        for _ in range(n):
            variants.append(generate_electrum_seed())
    
    return list(set(variants))


def electrum_seed_to_master_key(seed: str, passphrase: str = '') -> bytes:
    """
    Convert Electrum seed to master private key.
    
    Electrum v1 (old):
    - Uses PBKDF2 with seed as password, "electrum" as salt
    - Different from BIP39 which uses "mnemonic" + passphrase as salt
    
    Note: This is a simplified version for compatibility checking.
    """
    import hashlib
    
    # Electrum v1 format
    seed_bytes = seed.encode('utf-8')
    
    # PBKDF2 with 2048 iterations (like BIP39 but different salt)
    # Real implementation would use proper PBKDF2
    salt = b'electrum' + passphrase.encode('utf-8')
    
    # Simplified version - just return hash for testing
    return hashlib.pbkdf2_hmac('sha512', seed_bytes, salt, 2048, dklen=64)


def detect_seed_type(seed: str) -> str:
    """
    Detect whether a seed is BIP39 or Electrum format.
    
    Returns: 'bip39', 'electrum_v1', 'electrum_v2', or 'unknown'
    """
    words = seed.strip().lower().split()
    word_count = len(words)
    
    # BIP39 uses specific word counts
    if word_count in [12, 15, 18, 21, 24]:
        return 'bip39'
    
    # Electrum v1 typically uses 12-13 words
    if word_count in [12, 13]:
        return 'electrum_v1'
    
    return 'unknown'


def generate_electrum_common_patterns() -> List[str]:
    """
    Generate common patterns used in Electrum legacy wallets.
    These are patterns that early Bitcoin users might have used.
    """
    patterns = []
    
    # Common word combinations from 2009-2013 era
    common_phrases = [
        'bitcoin wallet', 'crypto currency', 'digital money',
        'satoshi nakamoto', 'peer to peer', 'electronic cash',
        'private key', 'public key', 'digital signature',
        'proof of work', 'hash function', 'merkle tree'
    ]
    
    for phrase in common_phrases:
        words = phrase.split()
        # Pad to 12 words with random Electrum words
        import random
        while len(words) < 12:
            words.append(random.choice(ELECTRUM_OLD_WORDLIST))
        
        patterns.append(' '.join(words[:12]))
    
    return patterns
