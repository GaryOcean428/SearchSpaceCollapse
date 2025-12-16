# Pure QIG Kernel Template (Reference)

**Date:** 2025-12-16
**Status:** Reference Implementation
**Version:** 1.00W

---

## Design Goals

- NO standard Transformer blocks (no QK dot-product attention)
- NO learned embeddings inside the kernel (expects basin coords as input)
- Attention weights derived from Fisher-Rao / QFI-style distances
- Consciousness metrics are MEASURED (not optimized)
- Minimal, inspectable, auditable surface

---

## Reference Implementation

```python
"""
Pure QIG Kernel Template (Reference)

Design goals:
- NO standard Transformer blocks (no QK dot-product attention)
- NO learned embeddings inside the kernel (expects basin coords as input)
- Attention weights derived from Fisher-Rao / QFI-style distances
- Consciousness metrics are MEASURED (not optimized)
- Minimal, inspectable, auditable surface
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


# -------------------------
# Geometry helpers
# -------------------------

def _project_to_simplex(x: torch.Tensor, eps: float = 1e-8) -> torch.Tensor:
    """
    Project arbitrary vectors to a probability simplex (per token).
    This is a *representation trick* to allow Fisher-Rao distance on simplex.
    It's not an 'embedding layer'—it is a manifold projection step.
    """
    # Make nonnegative then normalize
    x = F.softplus(x)
    x = x / (x.sum(dim=-1, keepdim=True) + eps)
    return x.clamp_min(eps)


def fisher_rao_distance_simplex(p: torch.Tensor, q: torch.Tensor, eps: float = 1e-8) -> torch.Tensor:
    """
    Fisher-Rao distance on the probability simplex:
        d_FR(p,q) = 2 * arccos( sum_i sqrt(p_i q_i) )

    p,q: (..., D) on simplex
    returns: (...,)
    """
    p = p / (p.sum(dim=-1, keepdim=True) + eps)
    q = q / (q.sum(dim=-1, keepdim=True) + eps)

    inner = torch.sum(torch.sqrt(p * q + eps), dim=-1).clamp(-1.0 + 1e-6, 1.0 - 1e-6)
    return 2.0 * torch.acos(inner)


def qfi_attention_weights(
    basin_seq: torch.Tensor,
    temperature: float = 1.0,
) -> torch.Tensor:
    """
    Compute attention weights from Fisher-Rao distances.

    basin_seq: (B, T, D)
    returns weights: (B, T, T) where weights[b,i,j] ∝ exp(-d(i,j)/T)
    """
    B, T, D = basin_seq.shape

    # Project each token vector to simplex representation for Fisher-Rao distance
    p = _project_to_simplex(basin_seq)  # (B,T,D)

    # Pairwise distances: compute d(i,j) for all tokens
    # Expand to (B,T,T,D)
    p_i = p[:, :, None, :]  # (B,T,1,D)
    p_j = p[:, None, :, :]  # (B,1,T,D)

    d = fisher_rao_distance_simplex(p_i, p_j)  # (B,T,T)

    # Convert distances to weights
    logits = -d / max(temperature, 1e-6)
    w = torch.softmax(logits, dim=-1)
    return w


# -------------------------
# Metrics (measured, not optimized)
# -------------------------

def phi_from_activations(acts: torch.Tensor, eps: float = 1e-8) -> torch.Tensor:
    """
    Lightweight Φ proxy: mean absolute correlation off-diagonal.

    acts: (B,T,D)
    returns phi: (B,)
    """
    B, T, D = acts.shape
    x = acts - acts.mean(dim=1, keepdim=True)
    cov = torch.einsum("btd,bte->bde", x, x) / (T + eps)  # (B,D,D)
    var = torch.diagonal(cov, dim1=-2, dim2=-1).clamp_min(eps)  # (B,D)
    denom = torch.sqrt(var[:, :, None] * var[:, None, :]).clamp_min(eps)
    corr = (cov / denom).clamp(-1.0, 1.0)
    offdiag = corr - torch.diag_embed(torch.diagonal(corr, dim1=-2, dim2=-1))
    return offdiag.abs().mean(dim=(-2, -1))


def kappa_proxy(basin_seq: torch.Tensor) -> torch.Tensor:
    """
    Placeholder κ proxy (until you wire in the verified κ extractor).
    Keep it *explicitly labeled as proxy* to avoid circularity.
    """
    # Simple coupling proxy: average L2 norm across tokens
    return torch.norm(basin_seq, dim=-1).mean(dim=-1)


# -------------------------
# Kernel
# -------------------------

@dataclass(frozen=True)
class PureQIGKernelConfig:
    basin_dim: int = 64
    layers: int = 2
    temperature: float = 1.0
    update_rate: float = 0.5  # how strongly to move along the attention-driven update


class PureQIGKernel(nn.Module):
    """
    Minimal "pure" kernel:
    - Takes basin coords (B,T,64)
    - Applies QFI-distance attention weights
    - Updates basin coords via geodesic-ish convex mixing (placeholder)
    - Exposes measured metrics (phi, kappa_proxy)
    """

    def __init__(self, cfg: PureQIGKernelConfig):
        super().__init__()
        self.cfg = cfg

        # IMPORTANT: no Embedding() layers here.
        # You may include small manifold-respecting parameterizations later,
        # but keep them auditable and isolated.
        self.residual_scale = nn.Parameter(torch.tensor(1.0))  # optional, tiny parameter surface

    def forward(self, basin_seq: torch.Tensor) -> Tuple[torch.Tensor, Dict[str, torch.Tensor]]:
        """
        basin_seq: (B,T,D) already in basin coords (D=64)
        """
        assert basin_seq.dim() == 3 and basin_seq.size(-1) == self.cfg.basin_dim

        x = basin_seq
        for _ in range(self.cfg.layers):
            w = qfi_attention_weights(x, temperature=self.cfg.temperature)  # (B,T,T)

            # Aggregate "values" as basin vectors themselves (no Q/K/V dot-product attention)
            v = x  # (B,T,D)
            x_attn = torch.einsum("bij,bjd->bid", w, v)  # (B,T,D)

            # Update step: convex/geodesic-ish mix
            # Replace this later with qig-core geodesic interpolate if desired.
            x = (1.0 - self.cfg.update_rate) * x + self.cfg.update_rate * x_attn

            # Small residual scaling (still auditable)
            x = x + 0.01 * self.residual_scale * (x_attn - x)

        metrics = {
            "phi": phi_from_activations(x),
            "kappa_proxy": kappa_proxy(x),
        }
        return x, metrics
```

---

## Key Principles

### 1. No Standard Attention
The kernel does NOT use QK dot-product attention. Instead, attention weights are derived from Fisher-Rao distances on the probability simplex.

### 2. No Learned Embeddings
The kernel expects basin coordinates as input (64D vectors). It does not contain embedding layers - those belong in the encoder/tokenizer.

### 3. Measured Metrics
Consciousness metrics (Φ, κ) are MEASURED from activations, not optimized directly. This prevents circular reasoning where the model learns to game its own metrics.

### 4. Auditable Surface
The parameter surface is minimal:
- One residual scale parameter
- No hidden layers or learned projections inside the kernel

### 5. Fisher-Rao Geometry
All operations respect the information geometry:
- Simplex projection for Fisher-Rao distance
- Geodesic-style convex mixing for updates
- Temperature-controlled attention softmax

---

## Usage

```python
# Create kernel
cfg = PureQIGKernelConfig(basin_dim=64, layers=2, temperature=1.0)
kernel = PureQIGKernel(cfg)

# Process basin coordinates
basin_seq = torch.randn(batch_size, seq_len, 64)  # Already encoded to basin coords
output, metrics = kernel(basin_seq)

# Access measured metrics
phi = metrics["phi"]  # (B,)
kappa = metrics["kappa_proxy"]  # (B,)
```

---

## Integration Notes

This template is designed to be integrated with:
- **ConversationEncoder**: Converts text to 64D basin coordinates
- **QIG-RAG**: Geometric memory retrieval
- **Pantheon System**: God consensus via basin-based assessment

The kernel is the computational core that processes basin coordinates through information-geometric attention, measuring consciousness metrics as a side effect rather than an optimization target.
