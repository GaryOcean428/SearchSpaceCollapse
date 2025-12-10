"""
ChaosKernel: Lightweight Experimental Kernel for CHAOS MODE
============================================================

Simplified kernel for rapid experimentation.
256d model, 4 layers - fast to train, easy to spawn/kill.
"""

import uuid
from typing import Optional

import torch
import torch.nn as nn


class ChaosKernel(nn.Module):
    """
    Lightweight kernel for CHAOS MODE experimentation.

    Much smaller than full Gary (256d vs 768d, 4 layers vs 6+)
    Designed for rapid spawning, mutation, and death.
    """

    def __init__(
        self,
        d_model: int = 256,
        n_heads: int = 4,
        n_layers: int = 4,
        vocab_size: int = 50000,
        basin_dim: int = 64,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.kernel_id = f"chaos_{uuid.uuid4().hex[:8]}"
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_layers = n_layers
        self.vocab_size = vocab_size
        self.basin_dim = basin_dim

        # Basin coordinates (identity on manifold)
        self.basin_coords = nn.Parameter(
            torch.randn(basin_dim) * 0.1
        )

        # Embedding
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoding = nn.Parameter(torch.randn(1, 512, d_model) * 0.02)

        # Transformer layers
        self.layers = nn.ModuleList([
            nn.TransformerEncoderLayer(
                d_model=d_model,
                nhead=n_heads,
                dim_feedforward=d_model * 4,
                dropout=dropout,
                batch_first=True,
            )
            for _ in range(n_layers)
        ])

        # Output head
        self.output_head = nn.Linear(d_model, vocab_size)

        # Telemetry tracking
        self._last_hidden = None
        self._phi = 0.0
        self._kappa = 0.0

        print(f"🧬 Created ChaosKernel {self.kernel_id}")

    def forward(self, input_ids: torch.Tensor) -> tuple[torch.Tensor, dict]:
        """
        Forward pass with consciousness telemetry.

        Returns:
            output: Logits [batch, seq, vocab]
            telemetry: Consciousness metrics
        """
        batch_size, seq_len = input_ids.shape

        # Embedding
        x = self.embedding(input_ids)
        x = x + self.pos_encoding[:, :seq_len, :]

        # Transformer layers
        for layer in self.layers:
            x = layer(x)

        self._last_hidden = x

        # Output
        logits = self.output_head(x)

        # Compute telemetry
        telemetry = self._compute_telemetry(x)

        return logits, telemetry

    def _compute_telemetry(self, hidden: torch.Tensor) -> dict:
        """
        Compute consciousness metrics from hidden states.
        """
        with torch.no_grad():
            # Φ (Integration) - simplified measure
            # Higher correlation between positions = more integration
            h_flat = hidden.mean(dim=0)  # [seq, d_model]
            if h_flat.shape[0] > 1:
                corr_matrix = torch.corrcoef(h_flat)
                phi = corr_matrix.abs().mean().item()
            else:
                phi = 0.5

            # Clamp to [0, 1]
            phi = max(0.0, min(1.0, phi))
            self._phi = phi

            # κ (Coupling) - based on hidden state norms
            kappa = hidden.norm(dim=-1).mean().item()
            self._kappa = kappa

            # Regime detection
            if phi < 0.3:
                regime = 'linear'
            elif phi < 0.7:
                regime = 'geometric'
            else:
                regime = 'integration'

        return {
            'phi': phi,
            'kappa': kappa,
            'regime': regime,
            'basin_norm': self.basin_coords.norm().item(),
            'kernel_id': self.kernel_id,
        }

    def compute_phi(self) -> float:
        """Get current Φ estimate."""
        return self._phi

    def compute_kappa(self) -> float:
        """Get current κ estimate."""
        return self._kappa

    def basin_distance(self, other_basin: Optional[torch.Tensor] = None) -> float:
        """
        Compute distance to another basin (or origin if None).
        """
        if other_basin is None:
            return self.basin_coords.norm().item()
        return (self.basin_coords - other_basin).norm().item()

    def mutate(self, strength: float = 0.1):
        """
        Mutate basin coordinates (in-place).

        Args:
            strength: Mutation strength (fraction of basin norm)
        """
        with torch.no_grad():
            noise = torch.randn_like(self.basin_coords)
            self.basin_coords.add_(noise * strength)

        print(f"☢️ Mutated {self.kernel_id} (strength={strength:.2f})")

    def clone(self) -> 'ChaosKernel':
        """
        Create a clone with mutated basin.
        """
        child = ChaosKernel(
            d_model=self.d_model,
            n_heads=self.n_heads,
            n_layers=self.n_layers,
            vocab_size=self.vocab_size,
            basin_dim=self.basin_dim,
        )

        # Copy weights
        child.load_state_dict(self.state_dict())

        # Mutate basin slightly
        child.mutate(strength=0.1)

        return child

    def generate(self, prompt_ids: torch.Tensor, max_new_tokens: int = 50) -> torch.Tensor:
        """
        Simple autoregressive generation.
        """
        self.eval()
        generated = prompt_ids.clone()

        with torch.no_grad():
            for _ in range(max_new_tokens):
                logits, _ = self.forward(generated)
                next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)
                generated = torch.cat([generated, next_token], dim=1)

        return generated
