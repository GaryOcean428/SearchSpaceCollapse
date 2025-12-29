"""
Typo Generation Module for Python

Generates variations of input phrases to capture common typos:
- Keyboard adjacency mistakes (QWERTY layout)
- Character transpositions (teh → the)
- Phonetic substitutions (f→ph, k→c, etc.)
- Missing/extra characters
- Case variations

Port of server/typo-generator.ts for use in Hephaestus hypothesis generation.
"""

from typing import List, Dict, Tuple
from dataclasses import dataclass


# QWERTY keyboard adjacency map
KEYBOARD_ADJACENCY: Dict[str, List[str]] = {
    'q': ['w', 'a', 's'],
    'w': ['q', 'e', 'a', 's', 'd'],
    'e': ['w', 'r', 's', 'd', 'f'],
    'r': ['e', 't', 'd', 'f', 'g'],
    't': ['r', 'y', 'f', 'g', 'h'],
    'y': ['t', 'u', 'g', 'h', 'j'],
    'u': ['y', 'i', 'h', 'j', 'k'],
    'i': ['u', 'o', 'j', 'k', 'l'],
    'o': ['i', 'p', 'k', 'l'],
    'p': ['o', 'l'],
    'a': ['q', 'w', 's', 'z'],
    's': ['a', 'w', 'e', 'd', 'z', 'x'],
    'd': ['s', 'e', 'r', 'f', 'x', 'c'],
    'f': ['d', 'r', 't', 'g', 'c', 'v'],
    'g': ['f', 't', 'y', 'h', 'v', 'b'],
    'h': ['g', 'y', 'u', 'j', 'b', 'n'],
    'j': ['h', 'u', 'i', 'k', 'n', 'm'],
    'k': ['j', 'i', 'o', 'l', 'm'],
    'l': ['k', 'o', 'p'],
    'z': ['a', 's', 'x'],
    'x': ['z', 's', 'd', 'c'],
    'c': ['x', 'd', 'f', 'v'],
    'v': ['c', 'f', 'g', 'b'],
    'b': ['v', 'g', 'h', 'n'],
    'n': ['b', 'h', 'j', 'm'],
    'm': ['n', 'j', 'k'],
    '1': ['2', 'q'],
    '2': ['1', '3', 'q', 'w'],
    '3': ['2', '4', 'w', 'e'],
    '4': ['3', '5', 'e', 'r'],
    '5': ['4', '6', 'r', 't'],
    '6': ['5', '7', 't', 'y'],
    '7': ['6', '8', 'y', 'u'],
    '8': ['7', '9', 'u', 'i'],
    '9': ['8', '0', 'i', 'o'],
    '0': ['9', 'o', 'p'],
}

# Phonetic substitutions
PHONETIC_SUBSTITUTIONS: Dict[str, List[str]] = {
    'ph': ['f'],
    'f': ['ph'],
    'k': ['c', 'ck'],
    'c': ['k', 's'],
    's': ['c', 'z'],
    'z': ['s'],
    'ck': ['k', 'c'],
    'th': ['t'],
    't': ['th'],
    'sh': ['ch'],
    'ch': ['sh'],
    'ee': ['ea', 'ie'],
    'ea': ['ee', 'ia'],
    'ie': ['ee', 'ei'],
    'ei': ['ie'],
    'oo': ['ou', 'u'],
    'ou': ['oo', 'ow'],
    'ow': ['ou'],
    'ai': ['ay', 'a'],
    'ay': ['ai'],
    'tion': ['sion', 'shun'],
    'sion': ['tion', 'shun'],
}


@dataclass
class TypoVariation:
    """Represents a single typo variation"""
    variant: str
    typo_type: str  # 'keyboard', 'transposition', 'phonetic', 'omission', 'insertion', 'case'
    distance: int  # Edit distance from original
    likelihood: float  # 0-1 probability this is the intended phrase


def generate_keyboard_typos(phrase: str) -> List[TypoVariation]:
    """Generate keyboard adjacency typos"""
    variants = []
    lower_phrase = phrase.lower()
    
    for i, char in enumerate(lower_phrase):
        if not char.isalnum():
            continue
        
        neighbors = KEYBOARD_ADJACENCY.get(char, [])
        for neighbor in neighbors:
            variant = lower_phrase[:i] + neighbor + lower_phrase[i+1:]
            variants.append(TypoVariation(
                variant=variant,
                typo_type='keyboard',
                distance=1,
                likelihood=0.3
            ))
    
    return variants


def generate_transpositions(phrase: str) -> List[TypoVariation]:
    """Generate transposition typos (swapped adjacent characters)"""
    variants = []
    lower_phrase = phrase.lower()
    
    for i in range(len(lower_phrase) - 1):
        variant = (
            lower_phrase[:i] +
            lower_phrase[i+1] +
            lower_phrase[i] +
            lower_phrase[i+2:]
        )
        variants.append(TypoVariation(
            variant=variant,
            typo_type='transposition',
            distance=1,
            likelihood=0.4
        ))
    
    return variants


def generate_phonetic_variants(phrase: str) -> List[TypoVariation]:
    """Generate phonetic substitutions"""
    variants = []
    lower_phrase = phrase.lower()
    
    for pattern, replacements in PHONETIC_SUBSTITUTIONS.items():
        pos = 0
        while True:
            pos = lower_phrase.find(pattern, pos)
            if pos == -1:
                break
            
            for replacement in replacements:
                variant = (
                    lower_phrase[:pos] +
                    replacement +
                    lower_phrase[pos + len(pattern):]
                )
                variants.append(TypoVariation(
                    variant=variant,
                    typo_type='phonetic',
                    distance=abs(len(pattern) - len(replacement)) + 1,
                    likelihood=0.25
                ))
            
            pos += 1
    
    return variants


def generate_omissions(phrase: str) -> List[TypoVariation]:
    """Generate character omission variants (missing one character)"""
    variants = []
    lower_phrase = phrase.lower()
    
    if len(lower_phrase) < 3:
        return variants
    
    for i in range(len(lower_phrase)):
        variant = lower_phrase[:i] + lower_phrase[i+1:]
        variants.append(TypoVariation(
            variant=variant,
            typo_type='omission',
            distance=1,
            likelihood=0.2
        ))
    
    return variants


def generate_insertions(phrase: str) -> List[TypoVariation]:
    """Generate character insertion variants (extra character)"""
    variants = []
    lower_phrase = phrase.lower()
    
    # Insert doubled characters (most common type)
    for i in range(len(lower_phrase)):
        if lower_phrase[i].isalpha():
            variant = lower_phrase[:i+1] + lower_phrase[i] + lower_phrase[i+1:]
            variants.append(TypoVariation(
                variant=variant,
                typo_type='insertion',
                distance=1,
                likelihood=0.15
            ))
    
    return variants


def generate_case_variations(phrase: str) -> List[TypoVariation]:
    """Generate case variations"""
    variants = [
        TypoVariation(variant=phrase.lower(), typo_type='case', distance=0, likelihood=0.9),
        TypoVariation(variant=phrase.upper(), typo_type='case', distance=0, likelihood=0.5),
        TypoVariation(variant=phrase.title(), typo_type='case', distance=0, likelihood=0.6),
    ]
    
    if len(phrase) > 0:
        variants.append(TypoVariation(
            variant=phrase[0].upper() + phrase[1:].lower(),
            typo_type='case',
            distance=0,
            likelihood=0.7
        ))
    
    return variants


def generate_all_typo_variations(
    phrase: str,
    include_keyboard: bool = True,
    include_transposition: bool = True,
    include_phonetic: bool = True,
    include_omission: bool = True,
    include_insertion: bool = True,
    include_case: bool = True,
    max_variants: int = 100
) -> List[TypoVariation]:
    """
    Generate all typo variations for a phrase.
    Returns sorted by likelihood descending.
    """
    all_variants = []
    
    if include_case:
        all_variants.extend(generate_case_variations(phrase))
    
    if include_transposition:
        all_variants.extend(generate_transpositions(phrase))
    
    if include_keyboard:
        all_variants.extend(generate_keyboard_typos(phrase))
    
    if include_phonetic:
        all_variants.extend(generate_phonetic_variants(phrase))
    
    if include_omission:
        all_variants.extend(generate_omissions(phrase))
    
    if include_insertion:
        all_variants.extend(generate_insertions(phrase))
    
    # Deduplicate
    seen = set()
    unique_variants = []
    for variant in all_variants:
        if variant.variant not in seen:
            seen.add(variant.variant)
            unique_variants.append(variant)
    
    # Sort by likelihood descending, then by edit distance ascending
    unique_variants.sort(key=lambda v: (-v.likelihood, v.distance))
    
    # Limit to max variants
    return unique_variants[:max_variants]


def generate_multi_word_typos(phrase: str, max_variants: int = 50) -> List[TypoVariation]:
    """
    Generate multi-word phrase variations with typos in each word.
    Example: "satoshi nakamoto" → "satoshi nakamato", "satoshi nakamotto", etc.
    """
    words = phrase.lower().split()
    if len(words) == 1:
        return generate_all_typo_variations(phrase, max_variants=max_variants)
    
    variants = []
    
    # Generate typos for each word independently
    for i, word in enumerate(words):
        word_variants = generate_all_typo_variations(word, max_variants=20)
        
        for variant in word_variants:
            new_words = words.copy()
            new_words[i] = variant.variant
            
            variants.append(TypoVariation(
                variant=' '.join(new_words),
                typo_type=variant.typo_type,
                distance=variant.distance,
                likelihood=variant.likelihood * 0.8  # Reduce likelihood for multi-word
            ))
    
    # Sort and limit
    variants.sort(key=lambda v: -v.likelihood)
    return variants[:max_variants]


def levenshtein_distance(str1: str, str2: str) -> int:
    """Calculate Levenshtein distance for fuzzy matching"""
    len1, len2 = len(str1), len(str2)
    
    # Create matrix
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    
    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j
    
    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if str1[i-1] == str2[j-1] else 1
            matrix[i][j] = min(
                matrix[i-1][j] + 1,      # deletion
                matrix[i][j-1] + 1,      # insertion
                matrix[i-1][j-1] + cost  # substitution
            )
    
    return matrix[len1][len2]
