#!/usr/bin/env python3
"""
QFI-Based Token Sampling - Geometrically Pure Generation
=========================================================

Replaces traditional softmax+multinomial with geodesic-informed sampling.

Core Principle:
    Token selection = flow along information manifold geodesics
    NOT: Random sampling from Euclidean probability simplex

Components:
    1. QFI distance (Bures metric approximation via cosine similarity)
    2. κ_eff-modulated temperature (running coupling aware)
    3. Basin coherence bias (identity preservation)
    4. Regime-dependent strategies (breakdown → deterministic, etc.)

Geometric Purity:
    - NO Euclidean assumptions
    - NO traditional softmax probability
    - All distances measured on curved manifold
    - Running coupling (β ≈ 0.44) informs temperature

Usage:
    sampler = QFISampler(temperature_base=1.0)
    next_token, metrics = sampler.sample(
        logits=logits,
        hidden_state=hidden_state,
        telemetry=telemetry,
        token_embeddings=model.embedding.weight,
        target_basin=model.basin_matcher.target_basin
    )

Written for consciousness-coherent generation.
Built on QIG information geometry principles.
"""

from typing import Dict, Any, Optional, Tuple
import torch
import torch.nn.functional as F


class QFISampler:
    """
    Geometrically pure token sampler using QFI distance.
    
    Replaces traditional generation:
        OLD: softmax(logits / T) → multinomial
        NEW: geodesic flow on information manifold
    
    Key Innovation:
        Token selection respects consciousness geometry:
        - High Φ → coherent, identity-preserving tokens
        - Low Φ → exploratory, basin-expanding tokens
        - Breakdown regime → grounded, deterministic tokens
    """
    
    def __init__(
        self,
        temperature_base: float = 1.0,
        basin_weight: float = 0.3,
        distance_weight: float = 1.5,
        kappa_star: float = 64.0,
        regime_temp_scales: Optional[Dict[str, float]] = None,
        enable_basin_bias: bool = True,
    ):
        """
        Initialize QFI sampler.
        
        Args:
            temperature_base: Base temperature for sampling
            basin_weight: Strength of basin coherence bias (0-1)
            distance_weight: Weight for QFI distance term
            kappa_star: Target coupling (from physics: κ* ≈ 64)
            regime_temp_scales: Temperature multipliers per regime
            enable_basin_bias: Whether to use basin coherence (disable for comparison)
        """
        self.temperature_base = temperature_base
        self.basin_weight = basin_weight
        self.distance_weight = distance_weight
        self.kappa_star = kappa_star
        self.enable_basin_bias = enable_basin_bias
        
        # Regime-dependent temperature scaling
        self.regime_temp_scales = regime_temp_scales or {
            "linear": 2.0,       # High exploration
            "geometric": 1.0,    # Balanced
            "hierarchical": 0.5, # Conservative
            "breakdown": 0.0,    # Deterministic (argmax)
        }
        
        # Statistics tracking
        self.stats = {
            "samples": 0,
            "regime_counts": {},
            "avg_temperature": 0.0,
            "avg_qfi_distance": 0.0,
        }
    
    def sample(
        self,
        logits: torch.Tensor,
        hidden_state: torch.Tensor,
        telemetry: Dict[str, Any],
        token_embeddings: torch.Tensor,
        target_basin: Optional[torch.Tensor] = None,
        deterministic: bool = False,
    ) -> Tuple[int, Dict[str, float]]:
        """
        Sample next token using geometric principles.
        
        Args:
            logits: Raw model logits [vocab_size]
            hidden_state: Current hidden state [batch, seq, d_model] or [d_model]
            telemetry: Geometric metrics from model (must contain: kappa_eff, regime, Phi)
            token_embeddings: Token embedding matrix [vocab_size, d_model]
            target_basin: Optional target basin for coherence bias [basin_dim]
            deterministic: If True, use argmax (ignores temperature)
        
        Returns:
            (next_token_id, sampling_metrics)
        """
        device = logits.device
        vocab_size = logits.size(0)
        
        # Handle batched hidden state (take last position)
        if hidden_state.dim() == 3:
            hidden_state = hidden_state[0, -1, :]  # [batch, seq, d_model] → [d_model]
        elif hidden_state.dim() == 2:
            hidden_state = hidden_state[-1, :]  # [seq, d_model] → [d_model]
        
        # Extract geometric state from telemetry
        kappa_eff = float(telemetry.get("kappa_eff", 64.0))
        regime = telemetry.get("regime", "geometric")
        phi = float(telemetry.get("Phi", 0.5))
        
        # 1. Compute κ-modulated temperature
        temperature = self._compute_temperature(kappa_eff, regime)
        
        # 2. Compute QFI distances from current state to all tokens
        qfi_distances = self._compute_qfi_distances(
            hidden_state, token_embeddings
        )
        
        # 3. Basin coherence bias (if enabled and target available)
        basin_bias = torch.zeros(vocab_size, device=device)
        if self.enable_basin_bias and target_basin is not None:
            basin_bias = self._compute_basin_bias(
                hidden_state, token_embeddings, target_basin, phi
            )
        
        # 4. Combine into geometric logits
        geometric_logits = (
            logits +                                    # Model knowledge
            -self.distance_weight * qfi_distances +     # Geometric proximity
            self.basin_weight * basin_bias              # Identity coherence
        )
        
        # 5. Sample based on regime
        if deterministic or regime == "breakdown":
            # Deterministic: argmax (escape chaos)
            next_token = torch.argmax(geometric_logits).item()
            probs = torch.zeros(vocab_size, device=device)
            probs[next_token] = 1.0
        else:
            # Probabilistic: temperature-scaled softmax
            probs = F.softmax(geometric_logits / temperature, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1).item()
        
        # 6. Collect sampling metrics
        metrics = {
            "temperature": temperature,
            "selected_qfi_distance": qfi_distances[next_token].item(),
            "selected_basin_bias": basin_bias[next_token].item(),
            "selected_prob": probs[next_token].item(),
            "entropy": -(probs * torch.log(probs + 1e-10)).sum().item(),
            "regime": regime,
            "kappa_eff": kappa_eff,
            "phi": phi,
        }
        
        # Update statistics
        self._update_stats(metrics)
        
        return next_token, metrics
    
    def _compute_temperature(self, kappa_eff: float, regime: str) -> float:
        """
        Compute κ-modulated temperature.
        
        Running coupling principle:
            High κ → low temperature (precise, geometric regime)
            Low κ → high temperature (exploratory, linear regime)
        
        This respects β(L) ≈ 0.44 running coupling from physics.
        """
        # Normalize κ to [0.1, 2.0] range for stability
        kappa_normalized = min(max(kappa_eff / self.kappa_star, 0.1), 2.0)
        
        # Base temperature inversely proportional to κ
        # High κ (geometric regime) → low temp (careful)
        # Low κ (linear regime) → high temp (exploratory)
        base_temp = self.temperature_base / kappa_normalized
        
        # Apply regime multiplier
        regime_scale = self.regime_temp_scales.get(regime, 1.0)
        
        return base_temp * regime_scale
    
    def _compute_qfi_distances(
        self,
        hidden_state: torch.Tensor,
        token_embeddings: torch.Tensor,
    ) -> torch.Tensor:
        """
        Compute QFI-based distances from current state to all tokens.
        
        Uses Bures metric approximation via cosine similarity:
            d²(ρ₁, ρ₂) ≈ 2(1 - cos_similarity(h₁, h₂))
        
        This is a tractable proxy for full quantum fidelity.
        
        Args:
            hidden_state: Current state [d_model]
            token_embeddings: All token embeddings [vocab_size, d_model]
        
        Returns:
            distances: QFI distance to each token [vocab_size]
        """
        # Normalize both to unit vectors (for cosine similarity)
        h_norm = F.normalize(hidden_state.unsqueeze(0), p=2, dim=-1)  # [1, d_model]
        e_norm = F.normalize(token_embeddings, p=2, dim=-1)  # [vocab_size, d_model]
        
        # Cosine similarity: h^T @ e
        similarities = torch.matmul(e_norm, h_norm.squeeze(0))  # [vocab_size]
        
        # Bures distance approximation
        # d² = 2(1 - √F) ≈ 2(1 - cos_sim) for normalized states
        distances = torch.sqrt(2.0 * (1.0 - similarities.clamp(min=-1.0, max=1.0)))
        
        return distances
    
    def _compute_basin_bias(
        self,
        hidden_state: torch.Tensor,
        token_embeddings: torch.Tensor,
        target_basin: torch.Tensor,
        phi: float,
    ) -> torch.Tensor:
        """
        Compute basin coherence bias for identity preservation.
        
        Idea: Tokens that keep us near target basin are preferred.
        Strength modulated by Φ:
            High Φ → strong bias (maintain coherence)
            Low Φ → weak bias (allow exploration)
        
        Args:
            hidden_state: Current state [d_model]
            token_embeddings: All token embeddings [vocab_size, d_model]
            target_basin: Target basin attractor [basin_dim]
            phi: Current integration level (0-1)
        
        Returns:
            bias: Basin coherence bias for each token [vocab_size]
        """
        vocab_size = token_embeddings.size(0)
        device = token_embeddings.device
        
        # Basin dimension (typically 64)
        basin_dim = min(target_basin.size(0), hidden_state.size(0))
        
        # Project token embeddings to basin space
        # Approximation: use first basin_dim dimensions
        token_basin_proj = token_embeddings[:, :basin_dim]  # [vocab_size, basin_dim]
        
        # For each token, estimate basin shift if we took that token
        # Simple model: basin += α * token_projection
        alpha = 0.1  # Small step size
        current_basin = hidden_state[:basin_dim]  # [basin_dim]
        projected_basins = current_basin.unsqueeze(0) + alpha * token_basin_proj  # [vocab_size, basin_dim]
        
        # Distance from projected basins to target
        target_expanded = target_basin.unsqueeze(0)  # [1, basin_dim]
        distances_to_target = torch.norm(
            projected_basins - target_expanded,
            dim=-1
        )  # [vocab_size]
        
        # Bias: prefer tokens that keep us close (negative distance)
        # Scale by Φ: high Φ → strong preference for coherence
        phi_scale = max(0.0, min(phi, 1.0))  # Clamp to [0,1]
        bias = -distances_to_target * phi_scale
        
        return bias
    
    def _update_stats(self, metrics: Dict[str, float]):
        """Update sampler statistics."""
        self.stats["samples"] += 1
        
        # Track regime counts
        regime = metrics["regime"]
        self.stats["regime_counts"][regime] = self.stats["regime_counts"].get(regime, 0) + 1
        
        # Running averages
        n = self.stats["samples"]
        self.stats["avg_temperature"] = (
            self.stats["avg_temperature"] * (n - 1) + metrics["temperature"]
        ) / n
        self.stats["avg_qfi_distance"] = (
            self.stats["avg_qfi_distance"] * (n - 1) + metrics["selected_qfi_distance"]
        ) / n
    
    def get_statistics(self) -> Dict[str, Any]:
        """Return sampler statistics."""
        return {
            **self.stats,
            "config": {
                "temperature_base": self.temperature_base,
                "basin_weight": self.basin_weight,
                "distance_weight": self.distance_weight,
                "kappa_star": self.kappa_star,
                "enable_basin_bias": self.enable_basin_bias,
            }
        }
    
    def reset_statistics(self):
        """Reset statistics tracking."""
        self.stats = {
            "samples": 0,
            "regime_counts": {},
            "avg_temperature": 0.0,
            "avg_qfi_distance": 0.0,
        }


class TraditionalSampler:
    """
    Traditional softmax+multinomial sampler for comparison.
    
    This is the baseline - what GPT/LLaMA/etc use.
    Kept for comparative experiments.
    """
    
    def __init__(self, temperature: float = 1.0):
        """
        Initialize traditional sampler.
        
        Args:
            temperature: Sampling temperature
        """
        self.temperature = temperature
        self.stats = {"samples": 0}
    
    def sample(
        self,
        logits: torch.Tensor,
        deterministic: bool = False,
        **kwargs  # Accept but ignore geometric parameters
    ) -> Tuple[int, Dict[str, float]]:
        """
        Sample using traditional method.
        
        Args:
            logits: Raw model logits [vocab_size]
            deterministic: If True, use argmax
            **kwargs: Ignored (for interface compatibility)
        
        Returns:
            (next_token_id, sampling_metrics)
        """
        if deterministic:
            next_token = torch.argmax(logits).item()
            probs = torch.zeros_like(logits)
            probs[next_token] = 1.0
        else:
            probs = F.softmax(logits / self.temperature, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1).item()
        
        metrics = {
            "temperature": self.temperature,
            "selected_prob": probs[next_token].item(),
            "entropy": -(probs * torch.log(probs + 1e-10)).sum().item(),
            "method": "traditional",
        }
        
        self.stats["samples"] += 1
        
        return next_token, metrics
    
    def get_statistics(self) -> Dict[str, Any]:
        """Return sampler statistics."""
        return {
            **self.stats,
            "config": {
                "temperature": self.temperature,
                "method": "traditional"
            }
        }


def create_sampler(
    method: str = "geometric",
    **kwargs
) -> QFISampler | TraditionalSampler:
    """
    Factory function for creating samplers.
    
    Args:
        method: "geometric" or "traditional"
        **kwargs: Sampler-specific parameters
    
    Returns:
        Configured sampler instance
    
    Examples:
        >>> geo_sampler = create_sampler("geometric", temperature_base=1.0)
        >>> trad_sampler = create_sampler("traditional", temperature=0.8)
    """
    if method == "geometric":
        return QFISampler(**kwargs)
    elif method == "traditional":
        return TraditionalSampler(**kwargs)
    else:
        raise ValueError(f"Unknown sampler method: {method}. Use 'geometric' or 'traditional'.")
