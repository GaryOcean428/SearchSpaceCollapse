"""
BIP39 Passphrase Combination Module

Generates combinations of BIP39 mnemonic phrases with optional passphrases.
Many wallets support an optional "25th word" passphrase on top of the mnemonic.
This is a critical recovery vector often overlooked.

BIP39 Standard:
- Mnemonic: 12-24 words from BIP39 wordlist
- Passphrase: Optional additional password (any UTF-8 string)
- Seed = PBKDF2(mnemonic, "mnemonic" + passphrase, 2048 rounds)

The passphrase acts as a "25th word" - different passphrases produce
completely different wallets from the same mnemonic.

Port of server/bip39-passphrase-combos.ts for use in Hephaestus hypothesis generation.
"""

from typing import List, Optional, Dict
from datetime import datetime


# Common passphrase patterns users might have added to their mnemonic
COMMON_BIP39_PASSPHRASES = [
    # Empty/none (most common)
    '',
    
    # Simple patterns
    'password',
    'passphrase',
    '123456',
    '12345678',
    '000000',
    '111111',
    
    # Crypto-related
    'bitcoin',
    'btc',
    'satoshi',
    'nakamoto',
    'crypto',
    'hodl',
    'moon',
    'lambo',
    
    # Personal identifiers (examples - would need user input)
    'name',
    'birthdate',
    'anniversary',
    
    # Security phrases
    'secure',
    'safety',
    'backup',
    'recovery',
    'hidden',
    'secret',
    
    # Numbers
    '2009', '2010', '2011', '2012', '2013',
    '1', '2', '3', '4', '5',
    
    # Common words
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
]


def generate_year_suffixes(base_passphrase: str, end_year: Optional[int] = None) -> List[str]:
    """Generate passphrase with year suffix"""
    if end_year is None:
        end_year = datetime.now().year
    
    suffixes = []
    
    # Bitcoin era years (2009 to current year)
    for year in range(2009, end_year + 1):
        suffixes.append(f"{base_passphrase}{year}")
        suffixes.append(f"{base_passphrase} {year}")
        suffixes.append(f"{base_passphrase}_{year}")
        suffixes.append(f"{base_passphrase}-{year}")
    
    return suffixes


def generate_number_suffixes(base_passphrase: str, max_number: int = 100) -> List[str]:
    """Generate passphrase with number suffix"""
    suffixes = []
    
    for i in range(max_number + 1):
        suffixes.append(f"{base_passphrase}{i}")
        if i <= 10:
            suffixes.append(f"{base_passphrase} {i}")
            suffixes.append(f"{base_passphrase}_{i}")
            suffixes.append(f"{base_passphrase}-{i}")
    
    return suffixes


def generate_special_char_variants(base_passphrase: str) -> List[str]:
    """Generate passphrases with common special character patterns"""
    return [
        base_passphrase,
        f"{base_passphrase}!",
        f"{base_passphrase}!!",
        f"{base_passphrase}!!!",
        f"{base_passphrase}.",
        f"{base_passphrase}?",
        f"{base_passphrase}@",
        f"{base_passphrase}#",
        f"{base_passphrase}$",
        f"!{base_passphrase}",
        f"{base_passphrase}123",
        f"{base_passphrase}321",
        f"{base_passphrase}1",
        f"{base_passphrase}12",
    ]


def generate_case_variants(passphrase: str) -> List[str]:
    """Generate case variations of passphrase"""
    return [
        passphrase,
        passphrase.lower(),
        passphrase.upper(),
        passphrase.capitalize(),
        passphrase[0].lower() + passphrase[1:].upper() if len(passphrase) > 1 else passphrase,
    ]


def generate_bip39_passphrase_combinations(
    base_phrase: str = '',
    include_years: bool = True,
    include_numbers: bool = True,
    include_special_chars: bool = True,
    include_case_variants: bool = True,
    max_combinations: int = 500
) -> List[str]:
    """
    Generate all common BIP39 passphrase combinations for a base phrase.
    Returns unique passphrases sorted by likelihood.
    """
    combinations = set()
    
    # Always include empty passphrase (most common)
    combinations.add('')
    
    # If no base phrase, use common passphrases
    base_phrases = [base_phrase] if base_phrase else COMMON_BIP39_PASSPHRASES
    
    for phrase in base_phrases:
        # Add base phrase
        combinations.add(phrase)
        
        # Case variants
        if include_case_variants and phrase:
            for variant in generate_case_variants(phrase):
                combinations.add(variant)
        
        # Year suffixes
        if include_years and phrase:
            for variant in generate_year_suffixes(phrase):
                combinations.add(variant)
        
        # Number suffixes (limited to avoid explosion)
        if include_numbers and phrase:
            for variant in generate_number_suffixes(phrase, 20):
                combinations.add(variant)
        
        # Special character variants
        if include_special_chars and phrase:
            for variant in generate_special_char_variants(phrase):
                combinations.add(variant)
    
    # Convert to list and limit
    result = list(combinations)
    return result[:max_combinations]


def generate_mnemonic_with_passphrase_variants(
    mnemonic: str,
    user_hints: Optional[List[str]] = None
) -> List[Dict[str, str]]:
    """
    Generate mnemonic + passphrase test cases.
    
    For a given mnemonic, generate multiple passphrase variations to test.
    Returns list of dicts with 'mnemonic' and 'passphrase' keys.
    """
    variants = []
    
    # Always test with no passphrase first (most common)
    variants.append({'mnemonic': mnemonic, 'passphrase': ''})
    
    # Test with common passphrases
    for passphrase in COMMON_BIP39_PASSPHRASES[1:20]:
        variants.append({'mnemonic': mnemonic, 'passphrase': passphrase})
    
    # If user provided hints, use those
    if user_hints:
        for hint in user_hints:
            # Add hint as-is
            variants.append({'mnemonic': mnemonic, 'passphrase': hint})
            
            # Add common variations of the hint
            hint_variants = generate_bip39_passphrase_combinations(
                hint,
                max_combinations=50
            )
            
            for variant in hint_variants:
                variants.append({'mnemonic': mnemonic, 'passphrase': variant})
    
    return variants


def generate_personalized_passphrases(
    name: Optional[str] = None,
    birth_year: Optional[int] = None,
    favorite_words: Optional[List[str]] = None,
    significant_dates: Optional[List[str]] = None
) -> List[str]:
    """
    Generate personalized passphrase suggestions based on common patterns.
    """
    passphrases = []
    
    if not any([name, birth_year, favorite_words, significant_dates]):
        return COMMON_BIP39_PASSPHRASES
    
    # Name-based
    if name:
        passphrases.append(name)
        passphrases.append(name.lower())
        passphrases.append(name.upper())
        
        # Name + birth year
        if birth_year:
            passphrases.append(f"{name}{birth_year}")
            passphrases.append(f"{name} {birth_year}")
    
    # Birth year variations
    if birth_year:
        passphrases.append(str(birth_year))
        # Two-digit year
        two_digit = birth_year % 100
        passphrases.append(str(two_digit))
        passphrases.append(str(two_digit) * 2)
    
    # Favorite words
    if favorite_words:
        for word in favorite_words:
            passphrases.append(word)
            passphrases.append(word.lower())
            
            # Word + year
            if birth_year:
                passphrases.append(f"{word}{birth_year}")
    
    # Significant dates
    if significant_dates:
        for date in significant_dates:
            passphrases.append(date)
            
            if name:
                passphrases.append(f"{name}{date}")
    
    return passphrases


def get_high_priority_passphrases() -> List[str]:
    """
    Get the most likely passphrases to test first.
    Sorted by empirical likelihood based on breach data analysis.
    """
    return [
        '',  # Empty passphrase is by far most common
        'bitcoin',
        'satoshi',
        'password',
        '123456',
        'btc',
        'crypto',
        'nakamoto',
        '2009',
        '2010',
        '2011',
        'passphrase',
        'hodl',
        'secret',
    ]
