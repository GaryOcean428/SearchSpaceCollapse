"""
Test script for enhanced hypothesis generation modules
"""

import sys
import os

# Add qig-backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from olympus.typo_generator import generate_all_typo_variations, generate_multi_word_typos
from olympus.temporal_keywords import get_high_relevance_keywords, get_crypto_specific_keywords
from olympus.bip39_passphrase_combos import generate_bip39_passphrase_combinations, get_high_priority_passphrases

print("=" * 60)
print("Enhanced Hypothesis Generation Modules Test")
print("=" * 60)

# Test 1: Typo Generation
print("\n1. Testing Typo Generation")
print("-" * 60)
typos = generate_all_typo_variations('satoshi', max_variants=10)
print(f"Generated {len(typos)} typo variants for 'satoshi':")
for i, typo in enumerate(typos[:5], 1):
    print(f"  {i}. {typo.variant} ({typo.typo_type}, likelihood: {typo.likelihood:.2f})")

# Test 2: Multi-word typos
print("\n2. Testing Multi-Word Typo Generation")
print("-" * 60)
multi_typos = generate_multi_word_typos('satoshi nakamoto', max_variants=5)
print(f"Generated {len(multi_typos)} typo variants for 'satoshi nakamoto':")
for i, typo in enumerate(multi_typos, 1):
    print(f"  {i}. {typo.variant} ({typo.typo_type}, likelihood: {typo.likelihood:.2f})")

# Test 3: Temporal Keywords
print("\n3. Testing Temporal Keywords")
print("-" * 60)
keywords = get_high_relevance_keywords(0.7)
print(f"Found {len(keywords)} high-relevance keywords (threshold 0.7):")
for i, kw in enumerate(keywords[:5], 1):
    print(f"  {i}. {kw.keyword} ({kw.year}, {kw.category}, relevance: {kw.relevance:.2f})")

# Test 4: Crypto-specific keywords
print("\n4. Testing Crypto-Specific Keywords")
print("-" * 60)
crypto_kw = get_crypto_specific_keywords()
print(f"Found {len(crypto_kw)} crypto-specific keywords:")
for i, kw in enumerate(crypto_kw[:5], 1):
    print(f"  {i}. {kw.keyword} ({kw.year}, relevance: {kw.relevance:.2f})")

# Test 5: BIP39 Passphrase Combinations
print("\n5. Testing BIP39 Passphrase Combinations")
print("-" * 60)
passphrases = generate_bip39_passphrase_combinations('bitcoin', max_combinations=10, include_years=True, include_numbers=False)
print(f"Generated {len(passphrases)} passphrase variants:")
for i, pp in enumerate(passphrases[:5], 1):
    print(f'  {i}. "{pp}"')

# Test 6: High Priority Passphrases
print("\n6. Testing High Priority Passphrases")
print("-" * 60)
high_priority = get_high_priority_passphrases()
print(f"Found {len(high_priority)} high priority passphrases:")
for i, pp in enumerate(high_priority[:10], 1):
    print(f'  {i}. "{pp}"')

print("\n" + "=" * 60)
print("All tests completed successfully!")
print("=" * 60)
