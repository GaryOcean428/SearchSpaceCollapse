"""
BIP-39 English Wordlist for Kernel Learning

This module provides the official BIP-39 English wordlist (2048 words).
Used by kernels to classify phrases and learn the difference between:
- Valid BIP-39 seed phrases (12/15/18/21/24 words from this list)
- Passphrases (arbitrary text, not from this list)
- Mutations (seed-length but contains non-BIP-39 words)

The wordlist is loaded from server/bip39-wordlist.txt for consistency
with the TypeScript implementation.
"""

import os
from pathlib import Path

def _load_wordlist() -> set:
    """Load BIP-39 wordlist from file."""
    possible_paths = [
        Path(__file__).parent.parent / "server" / "bip39-wordlist.txt",
        Path.cwd() / "server" / "bip39-wordlist.txt",
        Path(__file__).parent / "bip39-wordlist.txt",
    ]
    
    for path in possible_paths:
        if path.exists():
            with open(path, 'r') as f:
                words = {line.strip().lower() for line in f if line.strip()}
            if len(words) == 2048:
                print(f"[BIP39-Python] Loaded {len(words)} words from {path}")
                return words
            else:
                print(f"[BIP39-Python] Warning: {path} has {len(words)} words (expected 2048)")
    
    print("[BIP39-Python] WARNING: Could not load wordlist, using fallback minimal set")
    return set()

BIP39_WORDS = _load_wordlist()

def is_bip39_word(word: str) -> bool:
    """Check if a single word is in the BIP-39 wordlist."""
    return word.lower() in BIP39_WORDS

def is_valid_bip39_seed(phrase: str) -> bool:
    """
    Check if a phrase is a valid BIP-39 seed phrase.
    Valid if:
    - Has 12, 15, 18, 21, or 24 words
    - ALL words are in the BIP-39 wordlist
    """
    words = phrase.strip().split()
    valid_lengths = [12, 15, 18, 21, 24]
    
    if len(words) not in valid_lengths:
        return False
    
    return all(is_bip39_word(w) for w in words)

def classify_phrase(phrase: str) -> str:
    """
    Classify a phrase for kernel learning.
    
    Returns:
        bip39_seed: Valid 12/15/18/21/24 word phrase with ALL BIP-39 words
        passphrase: Arbitrary text (not a seed format)
        mutation: Seed-length but contains non-BIP-39 words
        bip39_word: Single word from BIP-39 wordlist
        unknown: Cannot classify
    """
    words = phrase.strip().split()
    word_count = len(words)
    valid_seed_lengths = [12, 15, 18, 21, 24]
    
    if word_count == 1:
        word = words[0].lower()
        if word in BIP39_WORDS:
            return 'bip39_word'
        if not word.isalpha():
            return 'passphrase'
        return 'unknown'
    
    if word_count in valid_seed_lengths:
        all_bip39 = all(w.lower() in BIP39_WORDS for w in words)
        if all_bip39:
            return 'bip39_seed'
        else:
            return 'mutation'
    
    return 'passphrase'

def get_invalid_words(phrase: str) -> list:
    """
    Get list of words in a phrase that are NOT in BIP-39 wordlist.
    Useful for understanding why a mutation is invalid.
    """
    words = phrase.strip().split()
    return [w for w in words if w.lower() not in BIP39_WORDS]

def get_learning_context(phrase: str, phi: float = 0.0) -> dict:
    """
    Generate learning context for kernels.
    Helps kernels understand what they're looking at.
    """
    category = classify_phrase(phrase)
    words = phrase.strip().split()
    invalid = get_invalid_words(phrase)
    
    return {
        "phrase_preview": phrase[:50] + "..." if len(phrase) > 50 else phrase,
        "word_count": len(words),
        "category": category,
        "phi": phi,
        "is_valid_seed": category == 'bip39_seed',
        "invalid_word_count": len(invalid),
        "invalid_words_sample": invalid[:3] if invalid else [],
        "learning_guidance": {
            "bip39_seed": "VALID SEED - High priority for recovery attempts",
            "mutation": f"INVALID SEED - Has {len(invalid)} non-BIP39 words: {invalid[:2]}",
            "passphrase": "PASSPHRASE - Not a seed, different recovery approach needed",
            "bip39_word": "SINGLE WORD - Building block, not recoverable alone",
            "unknown": "UNKNOWN - Needs more context to classify"
        }.get(category, "Unknown")
    }
