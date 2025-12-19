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
- Words are validated against dictionaryapi.dev before vocabulary inclusion

DRY PRINCIPLE: This is the ONLY place word validation logic is defined.
"""

import re
import logging
from typing import Set, Tuple, Optional

logger = logging.getLogger(__name__)

ENGLISH_WORD_PATTERN = re.compile(r'^[a-z]{2,}$')
CAMELCASE_PATTERN = re.compile(r'[a-z][A-Z]')
CONCAT_PATTERN = re.compile(r'([a-z]{3,})([a-z]{3,})')

MAX_WORD_LENGTH = 20
MIN_WORD_LENGTH = 2

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

COMMON_ENGLISH_WORDS: Set[str] = {
    'bitcoin', 'wallet', 'crypto', 'block', 'chain', 'address', 'private',
    'public', 'key', 'seed', 'phrase', 'mnemonic', 'password', 'secret',
    'recover', 'backup', 'entropy', 'hash', 'transaction', 'balance',
    'money', 'coin', 'token', 'network', 'node', 'mining', 'exchange',
    'trade', 'market', 'price', 'value', 'transfer', 'send', 'receive',
    'account', 'login', 'secure', 'encrypt', 'decrypt', 'sign', 'verify',
    'valid', 'invalid', 'error', 'success', 'fail', 'true', 'false',
    'data', 'file', 'system', 'process', 'memory', 'storage', 'cache',
    'search', 'find', 'query', 'result', 'output', 'input', 'string',
    'number', 'array', 'object', 'function', 'method', 'class', 'module',
    'import', 'export', 'return', 'break', 'continue', 'loop', 'while',
    'create', 'delete', 'update', 'read', 'write', 'open', 'close',
    'start', 'stop', 'run', 'execute', 'call', 'invoke', 'trigger',
    'event', 'handler', 'callback', 'promise', 'async', 'await', 'sync',
    'test', 'debug', 'log', 'print', 'display', 'show', 'hide', 'toggle',
    'enable', 'disable', 'active', 'inactive', 'online', 'offline',
    'connect', 'disconnect', 'link', 'unlink', 'bind', 'unbind',
    'load', 'save', 'restore', 'reset', 'clear', 'clean', 'purge',
    'add', 'remove', 'insert', 'append', 'prepend', 'push', 'pop',
    'shift', 'unshift', 'slice', 'splice', 'split', 'join', 'merge',
    'sort', 'filter', 'map', 'reduce', 'each', 'every', 'some', 'none',
    'first', 'last', 'next', 'previous', 'current', 'index', 'count',
    'length', 'size', 'width', 'height', 'depth', 'level', 'layer',
    'parent', 'child', 'sibling', 'ancestor', 'descendant', 'root',
    'leaf', 'branch', 'tree', 'graph', 'path', 'route', 'node', 'edge',
    'vertex', 'weight', 'distance', 'metric', 'score', 'rank', 'rate',
    'average', 'mean', 'median', 'mode', 'sum', 'total', 'count',
    'minimum', 'maximum', 'range', 'limit', 'offset', 'page', 'batch',
    'chunk', 'block', 'segment', 'section', 'part', 'piece', 'fragment',
    'whole', 'complete', 'partial', 'full', 'empty', 'null', 'void',
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'hundred', 'thousand', 'million', 'billion',
    'cryptographic', 'algorithm', 'encryption', 'decryption', 'signature',
    'certificate', 'authority', 'protocol', 'standard', 'specification',
    'implementation', 'interface', 'abstract', 'concrete', 'virtual',
    'physical', 'logical', 'binary', 'decimal', 'hexadecimal', 'octal',
    'warfare', 'massive', 'license', 'zone', 'wrap', 'swim', 'foil',
    'adult', 'night', 'border', 'ladder', 'hate', 'began', 'feasible',
    'interest', 'capital', 'grace', 'richard', 'frontier', 'withdrawals',
    'broadband', 'technocracy', 'infrastructure', 'authentication',
    'cryptocurrency', 'decentralized', 'distributed', 'blockchain'
}


KNOWN_CONCATENATIONS: Set[str] = {
    'saythis', 'likethat', 'thatrandom', 'wasoriginally', 'doingloading',
    'walletsfrom', 'daymemes', 'pickedhad', 'partyadvertisers', 'blockbtc',
    'conductingunauthorized', 'aboutbtc', 'anyonethat', 'alsolike', 'anythinglike'
}

SUFFIX_INDICATORS = {'from', 'with', 'that', 'this', 'like', 'have', 'been', 
                     'were', 'doing', 'being', 'having', 'saying', 'loading',
                     'originally', 'conducting', 'advertisers', 'wallets',
                     'party', 'picked', 'random', 'memes', 'btc', 'had'}

PREFIX_INDICATORS = {'say', 'like', 'was', 'doing', 'day', 'block', 'wallet',
                     'party', 'picked', 'tech', 'conducting', 'that'}


def is_likely_concatenated(word: str) -> bool:
    """
    Detect likely concatenated words like 'saythis', 'likethat', 'walletsfrom'.
    
    Uses heuristics:
    - Known concatenations blacklist
    - Very long words (>18 chars) without hyphens are suspicious
    - CamelCase patterns
    - Known prefix/suffix indicators when word is long enough
    - Consonant cluster analysis
    """
    if not word:
        return False
    
    word_lower = word.lower()
    
    if word_lower in KNOWN_CONCATENATIONS:
        return True
    
    if len(word_lower) > MAX_WORD_LENGTH and '-' not in word_lower:
        return True
    
    if CAMELCASE_PATTERN.search(word):
        return True
    
    if len(word_lower) >= 8:
        for suffix in SUFFIX_INDICATORS:
            if word_lower.endswith(suffix) and len(word_lower) > len(suffix) + 2:
                prefix = word_lower[:-len(suffix)]
                if len(prefix) >= 3 and prefix.isalpha():
                    return True
        
        for prefix in PREFIX_INDICATORS:
            if word_lower.startswith(prefix) and len(word_lower) > len(prefix) + 2:
                suffix = word_lower[len(prefix):]
                if len(suffix) >= 3 and suffix.isalpha():
                    return True
    
    vowels = set('aeiou')
    consonant_run = 0
    max_consonant_run = 0
    for char in word_lower:
        if char not in vowels:
            consonant_run += 1
            max_consonant_run = max(max_consonant_run, consonant_run)
        else:
            consonant_run = 0
    
    if max_consonant_run >= 5:
        return True
    
    return False


def is_likely_typo(word: str) -> bool:
    """
    Detect likely typos like 'rboadcast', 'lbeak', 'wsing', 'denni'.
    
    Heuristics:
    - Starts with unusual consonant clusters
    - Very rare letter combinations
    """
    if not word or len(word) < 3:
        return False
    
    word_lower = word.lower()
    
    bad_starts = ['rb', 'lb', 'ws', 'dn', 'sr', 'tl', 'dl', 'bn', 'gn', 'kn', 
                  'pn', 'tn', 'wn', 'xn', 'zn', 'bw', 'cw', 'dw', 'fw', 'gw',
                  'hw', 'jw', 'kw', 'lw', 'mw', 'nw', 'pw', 'rw', 'vw', 'xw', 'zw']
    
    if word_lower[:2] in bad_starts:
        return True
    
    if word_lower.endswith('ii') or word_lower.endswith('uu'):
        return True
    
    if len(word_lower) >= 4 and word_lower[-1] == word_lower[-2] == word_lower[-3]:
        return True
    
    return False


def is_valid_english_word(word: str, include_stop_words: bool = False, strict: bool = True) -> bool:
    """
    Check if a token is a valid English word for vocabulary.
    
    ACCEPTS:
    - Single-letter words: "I", "a" (valid English)
    - Pure alphabetic words: "bitcoin", "cryptocurrency"
    - Hyphenated compounds: "co-worker", "self-aware"
    - Contractions: "don't", "it's"
    - Known common English words (dictionary check)
    
    REJECTS:
    - Pure numbers: "0001", "123"
    - Alphanumeric: "bitcoin1", "000btc"
    - Special chars: "test@123", "pass#word"
    - Nonsense patterns: "aa", "aaes", "aaaes"
    - Concatenated words: "saythis", "likethat", "walletsfrom"
    - Likely typos: "rboadcast", "lbeak", "wsing"
    - Too long words (>18 chars without hyphens)
    
    Args:
        word: The word to validate
        include_stop_words: If False (default), rejects common stop words
        strict: If True (default), applies concatenation/typo detection
        
    Returns:
        True if valid English word, False otherwise
    """
    if not word:
        return False
    
    word_lower = word.lower().strip()
    
    if len(word_lower) == 1:
        return word_lower in {'a', 'i'}
    
    if len(word_lower) < MIN_WORD_LENGTH:
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
    
    if word_lower in COMMON_ENGLISH_WORDS:
        return True
    
    if strict:
        if len(word_lower) > MAX_WORD_LENGTH and '-' not in word_lower:
            return False
        
        if is_likely_concatenated(word_lower):
            return False
        
        if is_likely_typo(word_lower):
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


_dictionary_validator = None


def _get_dictionary_validator():
    """Lazy load dictionary validator to avoid circular imports."""
    global _dictionary_validator
    if _dictionary_validator is None:
        try:
            from dictionary_api import get_dictionary_validator
            _dictionary_validator = get_dictionary_validator()
        except ImportError as e:
            logger.warning(f"[WordValidation] Dictionary API not available: {e}")
            _dictionary_validator = False
    return _dictionary_validator if _dictionary_validator else None


def is_dictionary_word(word: str) -> bool:
    """
    Check if word exists in the dictionary API (dictionaryapi.dev).
    
    This is a stricter check than is_valid_english_word - it verifies
    the word actually exists in the dictionary, not just that it looks
    like a valid English word.
    
    Uses caching to avoid repeated API calls.
    
    Returns:
        True if word found in dictionary, False otherwise
    """
    if not word or len(word) < 2:
        return False
    
    word_lower = word.lower().strip()
    
    if word_lower in COMMON_ENGLISH_WORDS:
        return True
    
    validator = _get_dictionary_validator()
    if not validator:
        return is_valid_english_word(word)
    
    is_valid, _ = validator.validate_word(word_lower)
    return is_valid == True


def validate_for_vocabulary(word: str, require_dictionary: bool = True) -> Tuple[bool, str]:
    """
    Complete validation for vocabulary inclusion.
    
    This is the main entry point for validating words before adding
    them to the tokenizer vocabulary table.
    
    Checks:
    1. Basic format validation (alphabetic, length, no numbers)
    2. Concatenation/typo detection
    3. Dictionary API lookup (if require_dictionary=True)
    
    Args:
        word: Word to validate
        require_dictionary: If True, word must be in dictionary API
        
    Returns:
        (is_valid, reason) tuple
    """
    if not word:
        return False, "empty"
    
    word_lower = word.lower().strip()
    
    if len(word_lower) < 2:
        return False, "too_short"
    
    if len(word_lower) > MAX_WORD_LENGTH:
        return False, "too_long"
    
    if any(char.isdigit() for char in word_lower):
        return False, "contains_digits"
    
    if not word_lower[0].isalpha():
        return False, "invalid_start"
    
    allowed_special = {'-', "'"}
    for char in word_lower:
        if not char.isalpha() and char not in allowed_special:
            return False, "invalid_chars"
    
    if is_likely_concatenated(word_lower):
        return False, "concatenated"
    
    if is_likely_typo(word_lower):
        return False, "likely_typo"
    
    if word_lower in STOP_WORDS:
        return False, "stop_word"
    
    if word_lower in COMMON_ENGLISH_WORDS:
        return True, "known_word"
    
    if require_dictionary:
        validator = _get_dictionary_validator()
        if validator:
            is_valid, reason = validator.validate_word(word_lower)
            if is_valid:
                return True, "dictionary_verified"
            elif is_valid == False:
                return False, f"not_in_dictionary:{reason}"
    
    return True, "format_valid"


def record_as_proper_noun(word: str, category: str, context: str = None, 
                          phi: float = 0.5, source: str = None) -> bool:
    """
    Record a word as a proper noun (name, place, brand, etc.).
    
    Use this for words that are valid but not in the dictionary,
    such as names (Satoshi), places (Tokyo), or brands (Bitcoin).
    
    Categories: 'name', 'place', 'brand', 'organization', 'other'
    """
    validator = _get_dictionary_validator()
    if validator:
        try:
            validator.record_proper_noun(word, category, context, phi, source)
            return True
        except Exception as e:
            logger.warning(f"[WordValidation] Failed to record proper noun: {e}")
    return False


def is_known_proper_noun(word: str) -> Optional[str]:
    """
    Check if word is a known proper noun.
    
    Returns:
        Category ('name', 'place', 'brand', etc.) if known, None otherwise
    """
    validator = _get_dictionary_validator()
    if validator:
        return validator.is_proper_noun(word)
    return None
