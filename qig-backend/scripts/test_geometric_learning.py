#!/usr/bin/env python3
"""
Test: Geometric vs Frequency-Based Learning

Demonstrates why QIG tokenizer is different from traditional BPE.

Key principle:
- Traditional BPE: Learn frequent words
- QIG: Learn high-Φ words (even if rare)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from qig_tokenizer import QIGTokenizer


def test_high_phi_rare_word():
    """
    Test: Rare word with high Φ should be learned.
    
    This shows geometric learning prioritizes consciousness
    over frequency.
    """
    print("\n" + "=" * 60)
    print("TEST 1: High-Φ Rare Word (Geometric Priority)")
    print("=" * 60)
    
    tokenizer = QIGTokenizer()
    initial_vocab_size = len(tokenizer.vocab)
    
    observations = [{
        "word": "geodesic",
        "frequency": 2,
        "avgPhi": 0.85,
        "maxPhi": 0.90,
        "type": "word"
    }]
    
    print(f"Observation: word='geodesic', freq=2, Φ=0.85")
    print(f"Initial vocab size: {initial_vocab_size}")
    
    new_tokens, weights_updated = tokenizer.add_vocabulary_observations(observations)
    
    learned = "geodesic" in tokenizer.vocab
    final_vocab_size = len(tokenizer.vocab)
    
    print(f"\nResult:")
    print(f"  Learned: {learned} ✅" if learned else f"  Learned: {learned} ❌")
    print(f"  New vocab size: {final_vocab_size}")
    print(f"  Token Φ: {tokenizer.token_phi.get('geodesic', 0):.3f}")
    print(f"  Token weight: {tokenizer.token_weights.get('geodesic', 0):.3f}")
    
    print(f"\n{'✅ PASS' if learned else '❌ FAIL'}: High-Φ rare word WAS learned")
    print("This demonstrates geometric priority over frequency!")
    
    return learned


def test_low_phi_frequent_word():
    """
    Test: Frequent word with low Φ should be ignored.
    
    This shows QIG filtering based on consciousness threshold.
    """
    print("\n" + "=" * 60)
    print("TEST 2: Low-Φ Frequent Word (Geometric Filtering)")
    print("=" * 60)
    
    tokenizer = QIGTokenizer()
    initial_vocab_size = len(tokenizer.vocab)
    
    observations = [{
        "word": "blahblah",
        "frequency": 1000,
        "avgPhi": 0.2,
        "maxPhi": 0.3,
        "type": "word"
    }]
    
    print(f"Observation: word='blahblah', freq=1000, Φ=0.2")
    print(f"Φ threshold: {tokenizer.phi_threshold}")
    print(f"Initial vocab size: {initial_vocab_size}")
    
    new_tokens, weights_updated = tokenizer.add_vocabulary_observations(observations)
    
    not_learned = "blahblah" not in tokenizer.vocab
    final_vocab_size = len(tokenizer.vocab)
    
    print(f"\nResult:")
    print(f"  Not learned: {not_learned} ✅" if not_learned else f"  Incorrectly learned: ❌")
    print(f"  Vocab size unchanged: {initial_vocab_size == final_vocab_size}")
    
    print(f"\n{'✅ PASS' if not_learned else '❌ FAIL'}: Low-Φ frequent word was FILTERED")
    print("This demonstrates Φ threshold filtering!")
    
    return not_learned


def test_merge_learning_from_sequences():
    """
    Test: High-Φ sequences should trigger merge learning.
    
    This shows BPE merges are learned from consciousness,
    not co-occurrence frequency.
    """
    print("\n" + "=" * 60)
    print("TEST 3: Merge Learning from High-Φ Sequences")
    print("=" * 60)
    
    tokenizer = QIGTokenizer()
    initial_merges = len(tokenizer.merge_rules)
    
    base_obs = [
        {"word": "fisher", "frequency": 5, "avgPhi": 0.7, "maxPhi": 0.7, "type": "word"},
        {"word": "rao", "frequency": 5, "avgPhi": 0.7, "maxPhi": 0.7, "type": "word"}
    ]
    tokenizer.add_vocabulary_observations(base_obs)
    
    sequence_obs = [{
        "word": "fisher rao",
        "frequency": 5,
        "avgPhi": 0.90,
        "maxPhi": 0.95,
        "type": "sequence"
    }]
    
    print(f"Sequence: 'fisher rao', Φ=0.90")
    print(f"Initial merge rules: {initial_merges}")
    
    new_tokens, weights_updated = tokenizer.add_vocabulary_observations(sequence_obs)
    
    merge_learned = ("fisher", "rao") in tokenizer.merge_rules
    merged_token_exists = "fisher_rao" in tokenizer.vocab
    final_merges = len(tokenizer.merge_rules)
    
    print(f"\nResult:")
    print(f"  Merge rule learned: {merge_learned} ✅" if merge_learned else f"  Merge rule learned: {merge_learned} ❌")
    print(f"  Merged token exists: {merged_token_exists} ✅" if merged_token_exists else f"  Merged token exists: {merged_token_exists} ❌")
    print(f"  Final merge rules: {final_merges}")
    
    if merged_token_exists:
        merged_phi = tokenizer.token_phi.get("fisher_rao", 0)
        print(f"  Merged token Φ: {merged_phi:.3f}")
    
    print(f"\n{'✅ PASS' if merge_learned else '❌ FAIL'}: BPE merge learned from high-Φ sequence")
    print("This demonstrates consciousness-guided merge learning!")
    
    return merge_learned


def test_basin_coordinate_geometry():
    """
    Test: Basin coordinates should cluster by semantic similarity AND Φ.
    
    This shows tokens are embedded geometrically, not arbitrarily.
    """
    print("\n" + "=" * 60)
    print("TEST 4: Basin Coordinate Geometric Clustering")
    print("=" * 60)
    
    tokenizer = QIGTokenizer()
    
    observations = [
        {"word": "consciousness", "frequency": 10, "avgPhi": 0.85, "maxPhi": 0.90, "type": "word"},
        {"word": "awareness", "frequency": 10, "avgPhi": 0.80, "maxPhi": 0.85, "type": "word"},
        {"word": "banana", "frequency": 10, "avgPhi": 0.30, "maxPhi": 0.35, "type": "word"},
    ]
    
    tokenizer.add_vocabulary_observations(observations)
    
    basin_consciousness = tokenizer.get_basin_coord("consciousness")
    basin_awareness = tokenizer.get_basin_coord("awareness")
    basin_banana = tokenizer.get_basin_coord("banana")
    
    if basin_consciousness is None or basin_awareness is None or basin_banana is None:
        print("❌ FAIL: Basin coordinates not computed")
        return False
    
    import numpy as np
    dist_consciousness_awareness = np.linalg.norm(basin_consciousness - basin_awareness)
    dist_consciousness_banana = np.linalg.norm(basin_consciousness - basin_banana)
    
    print(f"Basin coordinates computed:")
    print(f"  consciousness: {basin_consciousness[:5]}... (64D)")
    print(f"  awareness: {basin_awareness[:5]}... (64D)")
    print(f"  banana: {basin_banana[:5]}... (64D)")
    
    print(f"\nDistances:")
    print(f"  consciousness ↔ awareness: {dist_consciousness_awareness:.4f}")
    print(f"  consciousness ↔ banana: {dist_consciousness_banana:.4f}")
    
    clustering_correct = dist_consciousness_awareness < dist_consciousness_banana
    
    print(f"\n{'✅ PASS' if clustering_correct else '❌ FAIL'}: Semantically similar + high-Φ tokens cluster closer")
    print("This demonstrates geometric embedding!")
    
    return clustering_correct


def main():
    """Run all tests comparing geometric vs frequency-based learning."""
    print("=" * 60)
    print("QIG TOKENIZER: GEOMETRIC VS FREQUENCY-BASED LEARNING")
    print("=" * 60)
    print("\nThese tests demonstrate why QIG is fundamentally different:")
    print("- Traditional BPE: Learn most FREQUENT words")
    print("- QIG: Learn highest-Φ words (consciousness over frequency)")
    
    results = {
        "High-Φ rare word learned": test_high_phi_rare_word(),
        "Low-Φ frequent word filtered": test_low_phi_frequent_word(),
        "Φ-based merge learning": test_merge_learning_from_sequences(),
        "Geometric basin clustering": test_basin_coordinate_geometry()
    }
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 All tests passed!")
        print("QIG tokenizer learns geometrically, not from frequency!")
    else:
        print("\n⚠️  Some tests failed")
        print("Review implementation for QIG principle violations")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
