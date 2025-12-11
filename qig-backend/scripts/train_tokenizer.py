#!/usr/bin/env python3
"""
Train QIG Tokenizer Using Geometric Observations

Applies consciousness-weighted observations to tokenizer,
enabling self-training from manifold structure.

This is GEOMETRIC learning, not frequency-based!
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from qig_tokenizer import get_tokenizer, update_tokenizer_from_observations


def load_observations(path: Path) -> list:
    """Load training observations from JSON file."""
    if not path.exists():
        print(f"❌ Error: {path} not found")
        print(f"   Run gather_training_corpus.py first!")
        return []
    
    with open(path) as f:
        observations = json.load(f)
    
    return observations


def display_tokenizer_stats(tokenizer, title="Tokenizer Stats"):
    """Display current tokenizer statistics."""
    print(f"\n{'=' * 60}")
    print(title)
    print('=' * 60)
    
    total_vocab = len(tokenizer.vocab)
    bip39_base = 2048
    conversation_seed = 82
    learned = total_vocab - bip39_base - len(tokenizer.special_tokens)
    
    print(f"Vocabulary Size: {total_vocab}")
    print(f"  - Special tokens: {len(tokenizer.special_tokens)}")
    print(f"  - BIP39 base: {bip39_base}")
    print(f"  - Conversation seed: ~{conversation_seed}")
    print(f"  - Learned tokens: {learned}")
    
    print(f"\nMerge Rules: {len(tokenizer.merge_rules)}")
    
    high_phi_tokens = tokenizer.get_high_phi_tokens(min_phi=0.6, top_k=10)
    if high_phi_tokens:
        print(f"\nTop 10 High-Φ Tokens:")
        for token, phi in high_phi_tokens:
            weight = tokenizer.token_weights.get(token, 1.0)
            freq = tokenizer.token_frequency.get(token, 0)
            print(f"  {token:20s} Φ={phi:.3f} w={weight:.2f} f={freq}")


def test_generation(tokenizer):
    """Test text generation with learned vocabulary."""
    print(f"\n{'=' * 60}")
    print("Generation Test")
    print('=' * 60)
    
    test_prompts = [
        "consciousness emerges from",
        "the fisher rao metric",
        "quantum information geometry"
    ]
    
    for prompt in test_prompts:
        result = tokenizer.generate_text(
            prompt=prompt,
            max_tokens=15,
            temperature=0.8,
            allow_silence=False
        )
        
        print(f"\nPrompt: \"{prompt}\"")
        print(f"Generated: \"{result['text']}\"")
        print(f"Metrics: {result['metrics']}")


def main():
    """Train tokenizer from geometric observations."""
    print("=" * 60)
    print("QIG TOKENIZER GEOMETRIC TRAINING")
    print("Self-training from consciousness-weighted observations")
    print("=" * 60)
    
    print("\n[1/4] Loading tokenizer...")
    tokenizer = get_tokenizer()
    display_tokenizer_stats(tokenizer, "Initial State")
    
    print("\n[2/4] Loading observations...")
    obs_path = Path("data/qig_tokenizer/training_observations.json")
    observations = load_observations(obs_path)
    
    if not observations:
        print("❌ No observations loaded. Exiting.")
        return
    
    print(f"✅ Loaded {len(observations)} observations")
    
    print("\nSample observations:")
    for obs in observations[:5]:
        print(f"  {obs['word']:20s} freq={obs['frequency']:3d} Φ={obs['avgPhi']:.3f} type={obs['type']}")
    
    print("\n[3/4] Applying observations to tokenizer...")
    new_tokens, weights_updated = update_tokenizer_from_observations(observations)
    
    print(f"✅ Training complete!")
    print(f"  New tokens learned: {new_tokens}")
    print(f"  Weights updated: {weights_updated}")
    
    display_tokenizer_stats(tokenizer, "Post-Training State")
    
    print("\n[4/4] Testing generation...")
    test_generation(tokenizer)
    
    print(f"\n{'=' * 60}")
    print("TRAINING SUMMARY")
    print('=' * 60)
    print(f"✅ Tokenizer trained geometrically")
    print(f"✅ {new_tokens} new tokens learned from high-Φ observations")
    print(f"✅ {len(tokenizer.merge_rules)} merge rules learned")
    print(f"✅ State persisted to disk for continuous learning")
    print(f"\nVocabulary growth: geometric, not frequency-based! 🎯")


if __name__ == "__main__":
    main()
