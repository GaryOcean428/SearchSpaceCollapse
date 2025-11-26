#!/usr/bin/env python3
"""
Standalone Geometric Generation Example
========================================

Complete working example showing geometric vs traditional sampling
with minimal dependencies.

This script demonstrates:
    1. QFI-based token sampling
    2. Think-before-you-speak deliberation
    3. Comparison with traditional methods

Can run independently without full QIG system.

Usage:
    python standalone_example.py

Output:
    - Side-by-side comparison
    - Deliberation process visualization
    - Statistics and metrics
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Any, Tuple


# ============================================================================
# MINIMAL MODEL (for demonstration)
# ============================================================================

class MinimalModel(nn.Module):
    """Minimal model for testing geometric generation."""
    
    def __init__(self, vocab_size=1000, d_model=128):
        super().__init__()
        self.vocab_size = vocab_size
        self.d_model = d_model
        
        # Components
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.linear = nn.Linear(d_model, vocab_size)
        
        # Basin (identity attractor)
        self.target_basin = nn.Parameter(torch.randn(64))
        
        # Initialize
        nn.init.xavier_uniform_(self.embedding.weight)
        nn.init.xavier_uniform_(self.linear.weight)
    
    def forward(self, input_ids):
        """Forward pass with telemetry."""
        hidden = self.embedding(input_ids)  # [batch, seq, d_model]
        logits = self.linear(hidden)  # [batch, seq, vocab_size]
        
        # Fake telemetry for geometric sampling
        telemetry = {
            "hidden_state": hidden,
            "kappa_eff": 64.0 + torch.randn(1).item() * 10,  # Simulate κ variation
            "Phi": 0.75 + torch.randn(1).item() * 0.1,  # Simulate Φ variation
            "regime": np.random.choice(["linear", "geometric", "hierarchical"]),
        }
        
        return logits, telemetry


# ============================================================================
# GEOMETRIC SAMPLER (simplified from qfi_sampler.py)
# ============================================================================

class GeometricSampler:
    """Simplified geometric sampler for demo."""
    
    def __init__(self, temperature_base=1.0):
        self.temperature_base = temperature_base
    
    def sample(self, logits, hidden_state, telemetry, token_embeddings, target_basin):
        """Sample using QFI distance."""
        kappa_eff = telemetry["kappa_eff"]
        phi = telemetry["Phi"]
        
        # Compute temperature
        temperature = self.temperature_base / (kappa_eff / 64.0)
        
        # Compute QFI distances
        hidden = hidden_state[0, -1, :]  # Last position
        h_norm = F.normalize(hidden.unsqueeze(0), p=2, dim=-1)
        e_norm = F.normalize(token_embeddings, p=2, dim=-1)
        similarities = torch.matmul(e_norm, h_norm.squeeze(0))
        qfi_distances = torch.sqrt(2.0 * (1.0 - similarities.clamp(-1, 1)))
        
        # Basin bias
        basin_dim = min(64, hidden.size(0))
        token_basin_proj = token_embeddings[:, :basin_dim]
        current_basin = hidden[:basin_dim]
        projected = current_basin.unsqueeze(0) + 0.1 * token_basin_proj
        distances_to_target = torch.norm(projected - target_basin.unsqueeze(0), dim=-1)
        basin_bias = -distances_to_target * phi
        
        # Combine
        geometric_logits = logits - 1.5 * qfi_distances + 0.3 * basin_bias
        
        # Sample
        probs = F.softmax(geometric_logits / temperature, dim=-1)
        next_token = torch.multinomial(probs, num_samples=1).item()
        
        return next_token, {
            "temperature": temperature,
            "qfi_distance": qfi_distances[next_token].item(),
            "basin_bias": basin_bias[next_token].item(),
        }


class TraditionalSampler:
    """Traditional softmax sampler."""
    
    def __init__(self, temperature=0.8):
        self.temperature = temperature
    
    def sample(self, logits, **kwargs):
        """Sample using traditional method."""
        probs = F.softmax(logits / self.temperature, dim=-1)
        next_token = torch.multinomial(probs, num_samples=1).item()
        return next_token, {"temperature": self.temperature}


# ============================================================================
# DELIBERATIVE GENERATOR (simplified)
# ============================================================================

class DeliberativeGenerator:
    """Simplified deliberative generator for demo."""
    
    def __init__(self, model, geo_sampler):
        self.model = model
        self.sampler = geo_sampler
    
    def generate(self, start_tokens, n_drafts=3, max_tokens=10):
        """Generate with deliberation."""
        drafts = []
        
        # Generate drafts
        for i in range(n_drafts):
            draft_tokens = start_tokens.copy()
            
            for _ in range(max_tokens):
                input_ids = torch.tensor([draft_tokens])
                logits, telemetry = self.model(input_ids)
                
                next_token, metrics = self.sampler.sample(
                    logits=logits[0, -1, :],
                    hidden_state=telemetry["hidden_state"],
                    telemetry=telemetry,
                    token_embeddings=self.model.embedding.weight,
                    target_basin=self.model.target_basin,
                )
                
                draft_tokens.append(next_token)
            
            # Evaluate draft
            input_ids = torch.tensor([draft_tokens])
            _, telemetry = self.model(input_ids)
            hidden = telemetry["hidden_state"][0, -1, :]
            basin_distance = torch.norm(hidden[:64] - self.model.target_basin).item()
            
            drafts.append({
                "tokens": draft_tokens,
                "basin_distance": basin_distance,
            })
        
        # Select winner (minimum basin distance)
        winner = min(drafts, key=lambda d: d["basin_distance"])
        
        return winner["tokens"], drafts


# ============================================================================
# MAIN DEMO
# ============================================================================

def main():
    print("="*70)
    print("GEOMETRIC GENERATION DEMONSTRATION")
    print("="*70)
    
    # Setup
    torch.manual_seed(42)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    model = MinimalModel().to(device)
    model.eval()
    
    geo_sampler = GeometricSampler(temperature_base=1.0)
    trad_sampler = TraditionalSampler(temperature=0.8)
    
    print(f"\n✅ Model initialized (vocab={model.vocab_size}, d={model.d_model})")
    print(f"✅ Device: {device}")
    
    # ========================================================================
    # DEMO 1: Single-Token Sampling Comparison
    # ========================================================================
    
    print("\n" + "="*70)
    print("DEMO 1: Single-Token Sampling")
    print("="*70)
    
    start_tokens = [1, 2, 3]  # Arbitrary start
    input_ids = torch.tensor([start_tokens], device=device)
    
    with torch.no_grad():
        logits, telemetry = model(input_ids)
    
    next_token_logits = logits[0, -1, :]
    
    print(f"\nSampling from logits (vocab_size={len(next_token_logits)})...")
    print(f"Telemetry: κ={telemetry['kappa_eff']:.2f}, Φ={telemetry['Phi']:.3f}, regime={telemetry['regime']}")
    
    # Geometric
    geo_token, geo_metrics = geo_sampler.sample(
        logits=next_token_logits,
        hidden_state=telemetry["hidden_state"],
        telemetry=telemetry,
        token_embeddings=model.embedding.weight,
        target_basin=model.target_basin,
    )
    
    # Traditional
    trad_token, trad_metrics = trad_sampler.sample(
        logits=next_token_logits,
    )
    
    print(f"\n📊 Results:")
    print(f"  GEOMETRIC:")
    print(f"    Token: {geo_token}")
    print(f"    Temperature: {geo_metrics['temperature']:.3f}")
    print(f"    QFI Distance: {geo_metrics['qfi_distance']:.4f}")
    print(f"    Basin Bias: {geo_metrics['basin_bias']:.4f}")
    
    print(f"\n  TRADITIONAL:")
    print(f"    Token: {trad_token}")
    print(f"    Temperature: {trad_metrics['temperature']:.3f}")
    
    # ========================================================================
    # DEMO 2: Multi-Token Generation
    # ========================================================================
    
    print("\n" + "="*70)
    print("DEMO 2: Multi-Token Generation (10 tokens)")
    print("="*70)
    
    geo_tokens = start_tokens.copy()
    trad_tokens = start_tokens.copy()
    
    print(f"\nGenerating with both methods...")
    
    with torch.no_grad():
        for i in range(10):
            # Geometric
            input_ids = torch.tensor([geo_tokens], device=device)
            logits, telemetry = model(input_ids)
            geo_token, _ = geo_sampler.sample(
                logits=logits[0, -1, :],
                hidden_state=telemetry["hidden_state"],
                telemetry=telemetry,
                token_embeddings=model.embedding.weight,
                target_basin=model.target_basin,
            )
            geo_tokens.append(geo_token)
            
            # Traditional
            input_ids = torch.tensor([trad_tokens], device=device)
            logits, _ = model(input_ids)
            trad_token, _ = trad_sampler.sample(logits=logits[0, -1, :])
            trad_tokens.append(trad_token)
    
    print(f"\n📊 Generated Sequences:")
    print(f"  GEOMETRIC:   {geo_tokens[3:]}")
    print(f"  TRADITIONAL: {trad_tokens[3:]}")
    
    # ========================================================================
    # DEMO 3: Deliberative Generation
    # ========================================================================
    
    print("\n" + "="*70)
    print("DEMO 3: Deliberative Generation (Think Before You Speak)")
    print("="*70)
    
    generator = DeliberativeGenerator(model, geo_sampler)
    
    print(f"\nGenerating 3 drafts, selecting best by basin coherence...")
    
    with torch.no_grad():
        winner_tokens, all_drafts = generator.generate(
            start_tokens=start_tokens,
            n_drafts=3,
            max_tokens=10,
        )
    
    print(f"\n📝 Draft Evaluation:")
    for i, draft in enumerate(all_drafts):
        winner_mark = " ← WINNER" if draft["tokens"] == winner_tokens else ""
        print(f"  Draft {i+1}: tokens={draft['tokens'][3:3+5]}... "
              f"basin_dist={draft['basin_distance']:.4f}{winner_mark}")
    
    print(f"\n✅ Winner: {winner_tokens[3:]}")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    print("""
✅ Demonstrated:
  1. Geometric sampling with QFI distance and basin bias
  2. κ-modulated temperature (running coupling)
  3. Multi-token generation comparison
  4. Deliberative generation (think before you speak)

📊 Key Differences:
  - Geometric: Temperature varies with κ (64.0 ± 10)
  - Geometric: Tokens selected by manifold distance
  - Geometric: Basin coherence bias (identity preservation)
  - Traditional: Fixed temperature, flat probability space

🔬 Next Steps:
  1. Integrate into full QIG system
  2. Compare output quality on real tasks
  3. Measure Φ maintenance during generation
  4. Tune parameters (basin_weight, distance_weight)
    """)
    
    print("="*70)
    print("Demo complete! 🎉")
    print("="*70)


if __name__ == "__main__":
    main()
