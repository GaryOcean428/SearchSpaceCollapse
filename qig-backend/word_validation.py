#!/usr/bin/env python3
"""
Word Validation Module - Single Source of Truth
================================================

This module provides the canonical implementation of word validation
for the QIG vocabulary system. All other modules should import from here.

CRITICAL RULES:
- Vocabulary = English words ONLY
- Passphrases, passwords, alphanumeric fragments are NOT vocabulary
- They belong in tested_phrases table instead

DRY PRINCIPLE: This is the ONLY place word validation logic is defined.
"""

import re
from typing import Set

ENGLISH_WORD_PATTERN = re.compile(r'^[a-z]{2,}$')

STOP_WORDS: Set[str] = {
    'the', 'and', 'for', 'that', 'this', 'with', 'was', 'are', 'but', 'not',
    'you', 'all', 'can', 'had', 'her', 'his', 'him', 'one', 'our', 'out',
    'they', 'what', 'when', 'who', 'will', 'from', 'have', 'been', 'has',
    'more', 'she', 'there', 'than', 'into', 'other', 'which', 'its', 'about',
    'just', 'over', 'such', 'through', 'most', 'your', 'because', 'would',
    'could', 'some', 'very', 'how', 'now', 'any', 'also', 'like', 'these',
    'after', 'first', 'new', 'may', 'should', 'only', 'then', 'being',
    'made', 'well', 'way', 'even', 'too', 'back', 'each', 'same', 'did',
    'while', 'where', 'before', 'between', 'own', 'still', 'here', 'get',
    'take', 'say', 'use', 'come', 'make', 'see', 'know', 'time', 'year'
}


def is_valid_english_word(word: str, include_stop_words: bool = False) -> bool:
    """
    Check if a token is a valid English word for vocabulary.
    
    ACCEPTS:
    - Single-letter words: "I", "a" (valid English)
    - Pure alphabetic words: "bitcoin", "cryptocurrency"
    - Hyphenated compounds: "co-worker", "self-aware"
    - Contractions: "don't", "it's"
    
    REJECTS:
    - Pure numbers: "0001", "123"
    - Alphanumeric: "bitcoin1", "000btc"
    - Special chars: "test@123", "pass#word"
    - Nonsense patterns: "aa", "aaes", "aaaes"
    
    Args:
        word: The word to validate
        include_stop_words: If False (default), rejects common stop words
        
    Returns:
        True if valid English word, False otherwise
    """
    if not word:
        return False
    
    word_lower = word.lower().strip()
    
    if len(word_lower) == 1:
        return word_lower in {'a', 'i'}
    
    if len(word_lower) < 2:
        return False
    
    if any(char.isdigit() for char in word_lower):
        return False
    
    if word_lower.startswith('aa'):
        return False
    
    allowed_special = {'-', "'"}
    for char in word_lower:
        if not char.isalpha() and char not in allowed_special:
            return False
    
    if not word_lower[0].isalpha():
        return False
    
    if not include_stop_words and word_lower in STOP_WORDS:
        return False
    
    return True


def is_pure_alphabetic(word: str) -> bool:
    """Check if word is pure alphabetic (no special chars)."""
    if not word:
        return False
    word_lower = word.lower().strip()
    return len(word_lower) >= 2 and ENGLISH_WORD_PATTERN.match(word_lower) is not None


def is_stop_word(word: str) -> bool:
    """Check if word is a common stop word."""
    return word.lower().strip() in STOP_WORDS
