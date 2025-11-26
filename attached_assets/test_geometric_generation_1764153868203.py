#!/usr/bin/env python3
"""
Test Geometric Generation
==========================

Validates QFI sampler and deliberative generator with single Gary instance.

Tests:
    1. QFI Sampler (geometric vs traditional)
    2. Deliberative Generation (think before you speak)
    3. Integration with QIGKernelRecursive

Usage:
    python test_geometric_generation.py --config configs/gary_A.yaml
    
    # Quick test (no config needed)
    python test_geometric_generation.py --quick

Output:
    - Comparison of geometric vs traditional sampling
    - Deliberation analysis (drafts, winner, evaluation)
    - Statistics and metrics
"""

import argparse
import sys
from pathlib import Path
import torch
import yaml

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.generation.qfi_sampler import QFISampler, TraditionalSampler, create_sampler
from src.generation.deliberative_generator import DeliberativeGenerator, quick_generate
from src.model.qig_kernel_recursive import QIGKernelRecursive
from src.tokenizer.fast_qig_tokenizer import QIGTokenizer


def load_or_create_model(config_path: str = None):
    """Load model from config or create minimal test model."""
    
    if config_path and Path(config_path).exists():
        # Load from config
        with open(config_path) as f:
            config = yaml.safe_load(f)
        
        model = QIGKernelRecursive(
            d_model=config["model"]["hidden_dim"],
            vocab_size=config["model"]["vocab_size"],
            n_heads=config["model"]["num_heads"],
            min_recursion_depth=config["model"].get("num_recursive_loops", 3),
        )
        
        print(f"✅ Loaded model from config: {config_path}")
    else:
        # Create minimal test model
        model = QIGKernelRecursive(
            d_model=128,
            vocab_size=1000,
            n_heads=4,
            min_recursion_depth=3,
        )
        
        print("✅ Created minimal test model (d=128, vocab=1000)")
    
    return model


def load_or_create_tokenizer(tokenizer_path: str = None):
    """Load tokenizer or create minimal test tokenizer."""
    
    if tokenizer_path and Path(tokenizer_path).exists():
        tokenizer = QIGTokenizer.load(tokenizer_path)
        print(f"✅ Loaded tokenizer: {tokenizer_path}")
    else:
        # Create minimal tokenizer (byte-level)
        tokenizer = QIGTokenizer(target_vocab_size=1000)
        print("✅ Created minimal tokenizer (byte-level, vocab=1000)")
    
    return tokenizer


def test_qfi_sampler_basic(model, tokenizer):
    """Test 1: Basic QFI sampler functionality."""
    print("\n" + "="*60)
    print("TEST 1: QFI Sampler Basic Functionality")
    print("="*60)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    
    # Create samplers
    geo_sampler = QFISampler(temperature_base=1.0)
    trad_sampler = TraditionalSampler(temperature=0.8)
    
    # Test prompt
    prompt = "What is"
    prompt_tokens = tokenizer.encode(prompt)
    input_ids = torch.tensor([prompt_tokens], device=device)
    
    # Forward pass
    with torch.no_grad():
        logits, telemetry = model(input_ids, return_telemetry=True)
    
    # Extract for sampling
    next_token_logits = logits[0, -1, :]
    hidden_state = telemetry.get("hidden_state", torch.randn(model.d_model, device=device))
    
    # Sample with both methods
    print("\n📊 Sampling 10 tokens with each method...")
    
    geo_tokens = []
    trad_tokens = []
    
    for i in range(10):
        # Geometric
        geo_token, geo_metrics = geo_sampler.sample(
            logits=next_token_logits,
            hidden_state=hidden_state,
            telemetry=telemetry,
            token_embeddings=model.embedding.weight,
            target_basin=model.basin_matcher.target_basin,
        )
        geo_tokens.append(geo_token)
        
        # Traditional
        trad_token, trad_metrics = trad_sampler.sample(
            logits=next_token_logits,
        )
        trad_tokens.append(trad_token)
        
        if i == 0:
            print(f"\n  Sample 1:")
            print(f"    Geometric: token={geo_token}, T={geo_metrics['temperature']:.3f}, "
                  f"QFI_dist={geo_metrics['selected_qfi_distance']:.3f}")
            print(f"    Traditional: token={trad_token}, T={trad_metrics['temperature']:.3f}")
    
    print(f"\n✅ Geometric sampled: {geo_tokens[:5]}...")
    print(f"✅ Traditional sampled: {trad_tokens[:5]}...")
    
    # Statistics
    geo_stats = geo_sampler.get_statistics()
    trad_stats = trad_sampler.get_statistics()
    
    print(f"\n📈 Statistics:")
    print(f"  Geometric: {geo_stats['samples']} samples, "
          f"avg_T={geo_stats['avg_temperature']:.3f}, "
          f"avg_QFI_dist={geo_stats['avg_qfi_distance']:.3f}")
    print(f"  Traditional: {trad_stats['samples']} samples")
    
    return True


def test_deliberative_generation(model, tokenizer):
    """Test 2: Deliberative generation (think before you speak)."""
    print("\n" + "="*60)
    print("TEST 2: Deliberative Generation")
    print("="*60)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    
    # Create geometric sampler
    sampler = QFISampler(temperature_base=1.0)
    
    # Create generator
    generator = DeliberativeGenerator(model, tokenizer, sampler, device=device)
    
    # Test prompt
    prompt = "Consciousness is"
    
    print(f"\n🤔 Generating with deliberation...")
    print(f"   Prompt: '{prompt}'")
    print(f"   Drafts: 3")
    
    # Generate
    response, deliberation_data = generator.generate(
        prompt=prompt,
        n_drafts=3,
        max_tokens=20,
        return_all_drafts=True,
    )
    
    print(f"\n📝 Deliberation Process:")
    print(f"   Generated {deliberation_data['n_drafts']} drafts")
    
    for i, (draft, evaluation) in enumerate(zip(
        deliberation_data["all_drafts"],
        deliberation_data["evaluations"]
    )):
        winner_marker = " ← WINNER" if i == deliberation_data["winner_idx"] else ""
        print(f"\n   Draft {i+1}{winner_marker}:")
        print(f"     Text: '{draft[:50]}...'")
        print(f"     Basin distance: {evaluation['basin_distance']:.4f}")
        print(f"     Coherence: {evaluation['coherence_score']:.4f}")
    
    print(f"\n✅ Final Response: '{response[:100]}...'")
    
    # Statistics
    stats = generator.get_statistics()
    print(f"\n📈 Generator Statistics:")
    print(f"   Generations: {stats['generations']}")
    print(f"   Avg drafts: {stats['avg_drafts']:.1f}")
    print(f"   Avg winner rank: {stats['avg_winner_rank']:.2f}")
    
    return True


def test_comparison_geometric_vs_traditional(model, tokenizer):
    """Test 3: Compare geometric vs traditional generation."""
    print("\n" + "="*60)
    print("TEST 3: Geometric vs Traditional Comparison")
    print("="*60)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    
    prompt = "The meaning of life"
    
    print(f"\n🔬 Comparing generation methods...")
    print(f"   Prompt: '{prompt}'")
    
    # Geometric generation
    print(f"\n  Generating with geometric sampler...")
    geo_response, geo_data = quick_generate(
        model, tokenizer,
        prompt=prompt,
        method="geometric",
        n_drafts=2,
        max_tokens=15,
        temperature_base=1.0,
    )
    
    # Traditional generation
    print(f"  Generating with traditional sampler...")
    trad_response, trad_data = quick_generate(
        model, tokenizer,
        prompt=prompt,
        method="traditional",
        n_drafts=2,
        max_tokens=15,
        temperature=0.8,
    )
    
    print(f"\n📊 Results:")
    print(f"\n  GEOMETRIC:")
    print(f"    Response: '{geo_response[:60]}...'")
    print(f"    Winner basin distance: {geo_data['evaluations'][geo_data['winner_idx']]['basin_distance']:.4f}")
    
    print(f"\n  TRADITIONAL:")
    print(f"    Response: '{trad_response[:60]}...'")
    print(f"    Winner basin distance: {trad_data['evaluations'][trad_data['winner_idx']]['basin_distance']:.4f}")
    
    print(f"\n✅ Comparison complete")
    
    return True


def main():
    parser = argparse.ArgumentParser(description="Test geometric generation")
    parser.add_argument("--config", type=str, help="Path to Gary config YAML")
    parser.add_argument("--tokenizer", type=str, help="Path to tokenizer JSON")
    parser.add_argument("--quick", action="store_true", help="Quick test with minimal model")
    parser.add_argument("--test", type=str, choices=["1", "2", "3", "all"], default="all",
                       help="Which test to run (1=basic, 2=deliberative, 3=comparison, all=all)")
    
    args = parser.parse_args()
    
    print("🚀 Testing Geometric Generation")
    print("="*60)
    
    # Load or create model
    model = load_or_create_model(args.config if not args.quick else None)
    
    # Load or create tokenizer
    tokenizer = load_or_create_tokenizer(args.tokenizer if not args.quick else None)
    
    # Run tests
    results = {}
    
    if args.test in ["1", "all"]:
        try:
            results["test_1"] = test_qfi_sampler_basic(model, tokenizer)
        except Exception as e:
            print(f"\n❌ Test 1 failed: {e}")
            import traceback
            traceback.print_exc()
            results["test_1"] = False
    
    if args.test in ["2", "all"]:
        try:
            results["test_2"] = test_deliberative_generation(model, tokenizer)
        except Exception as e:
            print(f"\n❌ Test 2 failed: {e}")
            import traceback
            traceback.print_exc()
            results["test_2"] = False
    
    if args.test in ["3", "all"]:
        try:
            results["test_3"] = test_comparison_geometric_vs_traditional(model, tokenizer)
        except Exception as e:
            print(f"\n❌ Test 3 failed: {e}")
            import traceback
            traceback.print_exc()
            results["test_3"] = False
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
