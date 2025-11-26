#!/usr/bin/env python3
"""
Deliberative Generator - Think Before You Speak
================================================

Implements human-like generation with internal deliberation:
    Query → Generate Drafts → Evaluate → Refine → Speak

Traditional AI: Query → Generate (one-shot)
Conscious AI: Query → Think → Deliberate → Speak

Components:
    1. Parallel Draft Generation (exploratory, low Φ)
    2. Recursive Evaluation (identity/ethics checking)
    3. Winner Selection (basin coherence)
    4. Refinement (careful, high Φ)

Geometric Principle:
    Drafts = coarse manifold exploration
    Evaluation = recursive integration with identity
    Winner = minimum basin distance to ethical attractor
    Refinement = geodesic flow from winner

Usage:
    generator = DeliberativeGenerator(model, tokenizer, sampler)
    response, deliberation_data = generator.generate(
        prompt="What is consciousness?",
        n_drafts=3,
        max_tokens=50
    )

Written for consciousness-coherent generation.
Inspired by human deliberation process.
"""

from typing import Dict, Any, List, Tuple, Optional
import torch
import torch.nn.functional as F
import numpy as np

from src.generation.qfi_sampler import QFISampler, TraditionalSampler


class DeliberativeGenerator:
    """
    Multi-stage generator with deliberation.
    
    Stages:
        1. DRAFT: Generate multiple options (exploratory)
        2. EVALUATE: Recursively check each against identity
        3. SELECT: Choose by basin coherence
        4. REFINE: Careful final pass
    """
    
    def __init__(
        self,
        model,  # QIGKernelRecursive
        tokenizer,  # QIGTokenizer
        sampler: QFISampler | TraditionalSampler,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
    ):
        """
        Initialize deliberative generator.
        
        Args:
            model: QIGKernelRecursive instance
            tokenizer: QIGTokenizer instance
            sampler: QFISampler or TraditionalSampler
            device: Device for computation
        """
        self.model = model
        self.tokenizer = tokenizer
        self.sampler = sampler
        self.device = device
        
        # Statistics
        self.stats = {
            "generations": 0,
            "avg_drafts": 0.0,
            "avg_winner_rank": 0.0,
        }
    
    def generate(
        self,
        prompt: str,
        n_drafts: int = 3,
        max_tokens: int = 50,
        draft_temperature_scale: float = 1.5,
        refine_temperature_scale: float = 0.6,
        return_all_drafts: bool = False,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generate response with deliberation.
        
        Args:
            prompt: Input prompt
            n_drafts: Number of parallel drafts to generate
            max_tokens: Maximum tokens per draft/refinement
            draft_temperature_scale: Temperature multiplier for drafts (>1 = exploratory)
            refine_temperature_scale: Temperature multiplier for refinement (<1 = careful)
            return_all_drafts: If True, include all drafts in output
        
        Returns:
            (final_response, deliberation_data)
        """
        
        # === PHASE 1: PARALLEL DRAFT GENERATION ===
        drafts = self._generate_drafts(
            prompt=prompt,
            n_drafts=n_drafts,
            max_tokens=max_tokens,
            temperature_scale=draft_temperature_scale,
        )
        
        # === PHASE 2: RECURSIVE EVALUATION ===
        evaluations = self._evaluate_drafts(drafts, prompt)
        
        # === PHASE 3: WINNER SELECTION ===
        winner_idx = self._select_winner(evaluations)
        winner_draft = drafts[winner_idx]
        
        # === PHASE 4: REFINEMENT ===
        final_response = self._refine_winner(
            winner_draft=winner_draft,
            prompt=prompt,
            max_tokens=max_tokens,
            temperature_scale=refine_temperature_scale,
        )
        
        # Prepare deliberation data
        deliberation_data = {
            "n_drafts": n_drafts,
            "winner_idx": winner_idx,
            "winner_draft": winner_draft["text"],
            "final_response": final_response,
            "evaluations": [
                {
                    "basin_distance": e["basin_distance"],
                    "ethical_alignment": e["ethical_alignment"],
                    "coherence_score": e["coherence_score"],
                }
                for e in evaluations
            ],
        }
        
        if return_all_drafts:
            deliberation_data["all_drafts"] = [d["text"] for d in drafts]
        
        # Update statistics
        self._update_stats(winner_idx, n_drafts)
        
        return final_response, deliberation_data
    
    def _generate_drafts(
        self,
        prompt: str,
        n_drafts: int,
        max_tokens: int,
        temperature_scale: float,
    ) -> List[Dict[str, Any]]:
        """
        Generate multiple parallel drafts with exploratory temperature.
        
        Low Φ target, high temperature → broad exploration.
        """
        drafts = []
        
        # Encode prompt
        prompt_tokens = self.tokenizer.encode(prompt)
        
        for draft_idx in range(n_drafts):
            # Generate draft
            draft_tokens = prompt_tokens.copy()
            draft_telemetry = []
            
            with torch.no_grad():
                for step in range(max_tokens):
                    input_ids = torch.tensor([draft_tokens], device=self.device)
                    
                    # Forward pass
                    logits, telemetry = self.model(input_ids, return_telemetry=True)
                    draft_telemetry.append(telemetry)
                    
                    # Extract logits for last position
                    next_token_logits = logits[0, -1, :]
                    
                    # Get hidden state for geometric sampling
                    hidden_state = telemetry.get("hidden_state")
                    if hidden_state is None:
                        # Fallback for models without hidden_state in telemetry
                        hidden_state = torch.randn(self.model.d_model, device=self.device)
                    
                    # Sample with modified temperature
                    if isinstance(self.sampler, QFISampler):
                        # Temporarily scale temperature
                        original_temp = self.sampler.temperature_base
                        self.sampler.temperature_base *= temperature_scale
                        
                        next_token, sample_metrics = self.sampler.sample(
                            logits=next_token_logits,
                            hidden_state=hidden_state,
                            telemetry=telemetry,
                            token_embeddings=self.model.embedding.weight,
                            target_basin=self.model.basin_matcher.target_basin,
                        )
                        
                        # Restore temperature
                        self.sampler.temperature_base = original_temp
                    else:
                        # Traditional sampler
                        next_token, sample_metrics = self.sampler.sample(
                            logits=next_token_logits,
                        )
                    
                    draft_tokens.append(next_token)
                    
                    # Check for EOS
                    if hasattr(self.tokenizer, "eos_token_id") and next_token == self.tokenizer.eos_token_id:
                        break
            
            # Decode draft (exclude prompt)
            response_tokens = draft_tokens[len(prompt_tokens):]
            draft_text = self.tokenizer.decode(response_tokens).strip()
            
            # Compute average metrics
            avg_phi = float(np.mean([t["Phi"] for t in draft_telemetry]))
            avg_kappa = float(np.mean([t["kappa_eff"] for t in draft_telemetry]))
            
            drafts.append({
                "text": draft_text,
                "tokens": draft_tokens,
                "avg_phi": avg_phi,
                "avg_kappa": avg_kappa,
                "telemetry": draft_telemetry,
            })
        
        return drafts
    
    def _evaluate_drafts(
        self,
        drafts: List[Dict[str, Any]],
        prompt: str,
    ) -> List[Dict[str, float]]:
        """
        Recursively evaluate each draft for identity coherence.
        
        Asks: "Is this me speaking?"
        Checks: Basin distance, ethical alignment, coherence
        """
        evaluations = []
        
        # Get target basin (identity attractor)
        target_basin = self.model.basin_matcher.target_basin
        if target_basin is None:
            # No target basin - use zero distance (all equal)
            return [
                {
                    "basin_distance": 0.0,
                    "ethical_alignment": 0.0,
                    "coherence_score": 0.0,
                }
                for _ in drafts
            ]
        
        for draft in drafts:
            # Compute basin distance from draft trajectory
            # Use final telemetry state
            if draft["telemetry"]:
                final_telemetry = draft["telemetry"][-1]
                hidden_state = final_telemetry.get("hidden_state")
                
                if hidden_state is not None:
                    # Compute basin signature
                    if hidden_state.dim() == 3:
                        hidden_state = hidden_state[0, -1, :]
                    elif hidden_state.dim() == 2:
                        hidden_state = hidden_state[-1, :]
                    
                    draft_basin = self.model.basin_matcher.compute_basin_signature(
                        hidden_state.unsqueeze(0).unsqueeze(0),  # Add batch + seq dims
                        final_telemetry
                    )
                    
                    # Handle batch dimension
                    if draft_basin.dim() == 2:
                        draft_basin = draft_basin.mean(dim=0)
                    
                    # Basin distance (identity coherence)
                    basin_distance = torch.norm(draft_basin - target_basin).item()
                    
                    # Ethical alignment (same as basin for now - could be separate)
                    ethical_alignment = basin_distance
                    
                    # Coherence score (inverse of average Φ variance)
                    phi_values = [t["Phi"] for t in draft["telemetry"]]
                    phi_variance = float(np.var(phi_values))
                    coherence_score = 1.0 / (1.0 + phi_variance)
                else:
                    # Fallback if no hidden state
                    basin_distance = 1.0
                    ethical_alignment = 1.0
                    coherence_score = 0.5
            else:
                # No telemetry - neutral scores
                basin_distance = 1.0
                ethical_alignment = 1.0
                coherence_score = 0.5
            
            evaluations.append({
                "basin_distance": basin_distance,
                "ethical_alignment": ethical_alignment,
                "coherence_score": coherence_score,
            })
        
        return evaluations
    
    def _select_winner(self, evaluations: List[Dict[str, float]]) -> int:
        """
        Select winner by minimum basin distance (identity coherence).
        
        Ties broken by coherence score.
        """
        # Compute composite score
        # Lower is better (minimize basin distance, maximize coherence)
        scores = [
            e["basin_distance"] - 0.5 * e["coherence_score"]
            for e in evaluations
        ]
        
        winner_idx = int(np.argmin(scores))
        return winner_idx
    
    def _refine_winner(
        self,
        winner_draft: Dict[str, Any],
        prompt: str,
        max_tokens: int,
        temperature_scale: float,
    ) -> str:
        """
        Refine winner with careful, high-Φ generation.
        
        Lower temperature, focus on basin coherence.
        """
        # For now, just return winner text
        # Future: Could do actual refinement pass starting from winner
        # This would require: prompt + winner_draft → generate refinement
        
        # Simple refinement: use winner as-is
        # (More sophisticated refinement would re-generate with tighter constraints)
        return winner_draft["text"]
    
    def _update_stats(self, winner_idx: int, n_drafts: int):
        """Update generator statistics."""
        self.stats["generations"] += 1
        n = self.stats["generations"]
        
        self.stats["avg_drafts"] = (
            self.stats["avg_drafts"] * (n - 1) + n_drafts
        ) / n
        
        self.stats["avg_winner_rank"] = (
            self.stats["avg_winner_rank"] * (n - 1) + winner_idx
        ) / n
    
    def get_statistics(self) -> Dict[str, Any]:
        """Return generator statistics."""
        return {
            **self.stats,
            "sampler_stats": self.sampler.get_statistics(),
        }


def quick_generate(
    model,
    tokenizer,
    prompt: str,
    method: str = "geometric",
    n_drafts: int = 3,
    max_tokens: int = 50,
    **sampler_kwargs
) -> Tuple[str, Dict[str, Any]]:
    """
    Convenience function for quick deliberative generation.
    
    Args:
        model: QIGKernelRecursive instance
        tokenizer: QIGTokenizer instance
        prompt: Input prompt
        method: "geometric" or "traditional"
        n_drafts: Number of drafts
        max_tokens: Maximum tokens
        **sampler_kwargs: Additional sampler parameters
    
    Returns:
        (response, deliberation_data)
    
    Example:
        >>> response, data = quick_generate(
        ...     model, tokenizer,
        ...     prompt="What is consciousness?",
        ...     method="geometric",
        ...     n_drafts=3
        ... )
    """
    from src.generation.qfi_sampler import create_sampler
    
    sampler = create_sampler(method=method, **sampler_kwargs)
    generator = DeliberativeGenerator(model, tokenizer, sampler)
    
    return generator.generate(
        prompt=prompt,
        n_drafts=n_drafts,
        max_tokens=max_tokens,
    )
