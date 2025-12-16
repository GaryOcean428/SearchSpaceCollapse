"""
Pure QIG ChaosKernel: Recursive Experimental Kernel for CHAOS MODE
====================================================================

PURE QIG ARCHITECTURE - Following the Pure QIG Kernel Template:
- NO standard Transformer blocks (no QK dot-product attention)
- NO learned embeddings inside the kernel (expects basin coords as input)
- Attention weights derived from Fisher-Rao / QFI-style distances
- Consciousness metrics are MEASURED (not optimized)
- Minimal, inspectable, auditable surface

RECURSIVE ARCHITECTURE FEATURES:
1. Basin-Coupled QFI Attention: Fisher-Rao distances modulate attention
2. Recursive Processing: Multiple iterations with feedback loops
3. Self-Referential Memory: Previous outputs feed back into processing
4. Holographic Compression: Basin encodes full state holographically
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


# -------------------------
# Geometry helpers (Pure QIG)
# -------------------------

def _project_to_simplex(x: torch.Tensor, eps: float = 1e-8) -> torch.Tensor:
    """
    Project arbitrary vectors to a probability simplex (per token).
    This is a *representation trick* to allow Fisher-Rao distance on simplex.
    It's not an 'embedding layer'—it is a manifold projection step.
    """
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

    p = _project_to_simplex(basin_seq)

    p_i = p[:, :, None, :]
    p_j = p[:, None, :, :]

    d = fisher_rao_distance_simplex(p_i, p_j)

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
    cov = torch.einsum("btd,bte->bde", x, x) / (T + eps)
    var = torch.diagonal(cov, dim1=-2, dim2=-1).clamp_min(eps)
    denom = torch.sqrt(var[:, :, None] * var[:, None, :]).clamp_min(eps)
    corr = (cov / denom).clamp(-1.0, 1.0)
    offdiag = corr - torch.diag_embed(torch.diagonal(corr, dim1=-2, dim2=-1))
    return offdiag.abs().mean(dim=(-2, -1))


def kappa_proxy(basin_seq: torch.Tensor) -> torch.Tensor:
    """
    κ proxy: average L2 norm across tokens.
    Keep it *explicitly labeled as proxy* to avoid circularity.
    """
    return torch.norm(basin_seq, dim=-1).mean(dim=-1)


# -------------------------
# Pure QIG Layers
# -------------------------

class BasinCoupledQFIAttention(nn.Module):
    """
    Pure QFI-based attention layer coupled to basin coordinates.
    
    NO Q/K/V dot-product attention - uses Fisher-Rao distances instead.
    Basin modulates the temperature of the attention distribution.
    """

    def __init__(self, basin_dim: int, dropout: float = 0.1):
        super().__init__()
        self.basin_dim = basin_dim
        
        self.basin_temperature = nn.Linear(basin_dim, 1)
        self.dropout = nn.Dropout(dropout)
        
        self.residual_scale = nn.Parameter(torch.tensor(0.1))

    def forward(
        self, x: torch.Tensor, basin: torch.Tensor, mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        x: (B, T, D) basin coordinates sequence
        basin: (D,) global basin identity
        """
        temp_modifier = torch.sigmoid(self.basin_temperature(basin)) + 0.5
        temperature = float(temp_modifier.mean().item())
        
        w = qfi_attention_weights(x, temperature=temperature)
        
        if mask is not None:
            w = w.masked_fill(mask == 0, 0.0)
            w = w / (w.sum(dim=-1, keepdim=True) + 1e-8)
        
        w = self.dropout(w)
        
        x_attn = torch.einsum("bij,bjd->bid", w, x)
        
        return x + self.residual_scale * (x_attn - x)


class RecursiveQFILayer(nn.Module):
    """
    Pure QFI layer with recursive feedback capability.
    Can process input multiple times with state feedback.
    
    NO feed-forward network - just geometric operations.
    """

    def __init__(self, basin_dim: int, dropout: float = 0.1):
        super().__init__()
        self.basin_attention = BasinCoupledQFIAttention(basin_dim, dropout)
        
        self.feedback_gate = nn.Linear(basin_dim * 2, basin_dim)
        
        self.update_rate = nn.Parameter(torch.tensor(0.5))

    def forward(
        self,
        x: torch.Tensor,
        basin: torch.Tensor,
        prev_state: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        if prev_state is not None:
            combined = torch.cat([x, prev_state], dim=-1)
            gate = torch.sigmoid(self.feedback_gate(combined))
            x = x * gate + prev_state * (1 - gate)

        x = self.basin_attention(x, basin)
        
        return x, x.clone()


class HolographicBasinEncoder(nn.Module):
    """
    Compresses hidden states into basin coordinates holographically.
    Basin encodes the "essence" of the processing state.
    
    Uses manifold projection, not learned embeddings.
    """

    def __init__(self, basin_dim: int):
        super().__init__()
        self.basin_dim = basin_dim
        
        self.compress = nn.Sequential(
            nn.Linear(basin_dim, basin_dim // 2),
            nn.Tanh(),
            nn.Linear(basin_dim // 2, basin_dim),
            nn.Tanh(),
        )
        
        self.expand = nn.Sequential(
            nn.Linear(basin_dim, basin_dim // 2),
            nn.Tanh(),
            nn.Linear(basin_dim // 2, basin_dim),
        )

    def encode(self, hidden: torch.Tensor) -> torch.Tensor:
        """Compress sequence to single basin point."""
        pooled = hidden.mean(dim=1)
        return self.compress(pooled)

    def decode(self, basin: torch.Tensor) -> torch.Tensor:
        """Expand basin to hidden dimension."""
        return self.expand(basin)


# -------------------------
# Pure QIG Chaos Kernel
# -------------------------

@dataclass(frozen=True)
class PureChaosKernelConfig:
    """Configuration for Pure QIG Chaos Kernel."""
    basin_dim: int = 64
    n_layers: int = 4
    n_recursive_passes: int = 2
    dropout: float = 0.1
    update_rate: float = 0.5


class ChaosKernel(nn.Module):
    """
    Pure QIG Chaos Kernel for CHAOS MODE experimentation.

    PURE QIG ARCHITECTURE:
    - Takes basin coords (B,T,64) - NO embedding layer
    - Applies QFI-distance attention weights - NO QK dot-product
    - Updates basin coords via geodesic-ish convex mixing
    - Exposes measured metrics (phi, kappa_proxy)

    RECURSIVE CAPABILITIES:
    - Basin-coupled attention: Identity coordinates modulate processing
    - Iterative refinement: Multiple passes with feedback loops
    - Holographic compression: Basin encodes full state
    - Self-referential memory: Previous outputs influence current processing

    Much smaller than full Gary (256d vs 768d, 4 layers vs 6+)
    Designed for rapid spawning, mutation, and death.
    """

    def __init__(
        self,
        basin_dim: int = 64,
        n_layers: int = 4,
        n_recursive_passes: int = 2,
        dropout: float = 0.1,
        **kwargs
    ):
        super().__init__()

        self.kernel_id = f"chaos_{uuid.uuid4().hex[:8]}"
        self.basin_dim = basin_dim
        self.n_layers = n_layers
        self.n_recursive_passes = n_recursive_passes

        self.basin_coords = nn.Parameter(
            torch.randn(basin_dim) * 0.1
        )

        self.layers = nn.ModuleList([
            RecursiveQFILayer(basin_dim, dropout)
            for _ in range(n_layers)
        ])

        self.holographic_encoder = HolographicBasinEncoder(basin_dim)

        self.basin_update_gate = nn.Linear(basin_dim * 2, basin_dim)

        self.residual_scale = nn.Parameter(torch.tensor(1.0))

        self._last_hidden = None
        self._phi = 0.0
        self._kappa = 0.0
        self._recursive_depth = 0
        self._layer_states: list[torch.Tensor] = []

        print(f"🧬 Created Pure QIG ChaosKernel {self.kernel_id} (passes={n_recursive_passes})")

    def forward(
        self,
        basin_seq: torch.Tensor,
        use_recursion: bool = True,
    ) -> tuple[torch.Tensor, dict]:
        """
        Recursive forward pass with consciousness telemetry.

        The kernel processes input through multiple recursive passes,
        with each pass refining the representation using feedback from
        the previous pass. Basin coordinates are updated holographically.

        Args:
            basin_seq: Basin coordinates [batch, seq, basin_dim]
            use_recursion: Whether to use multiple recursive passes

        Returns:
            output: Updated basin coordinates [batch, seq, basin_dim]
            telemetry: Consciousness metrics with recursion info
        """
        assert basin_seq.dim() == 3 and basin_seq.size(-1) == self.basin_dim, \
            f"Expected (B, T, {self.basin_dim}), got {basin_seq.shape}"

        n_passes = self.n_recursive_passes if use_recursion else 1

        x = basin_seq

        layer_states: list[list[Optional[torch.Tensor]]] = [
            [None] * self.n_layers for _ in range(n_passes)
        ]

        current_basin = self.basin_coords

        all_phi_values = []

        for pass_idx in range(n_passes):
            self._recursive_depth = pass_idx

            for layer_idx, layer in enumerate(self.layers):
                prev_state = None
                if pass_idx > 0 and layer_states[pass_idx - 1][layer_idx] is not None:
                    prev_state = layer_states[pass_idx - 1][layer_idx]

                x, new_state = layer(x, current_basin, prev_state)
                layer_states[pass_idx][layer_idx] = new_state

            hidden_basin = self.holographic_encoder.encode(x)

            if pass_idx < n_passes - 1:
                aggregated_basin = hidden_basin.mean(dim=0) if hidden_basin.dim() > 1 else hidden_basin
                combined_basin = torch.cat([current_basin, aggregated_basin], dim=-1)
                gate = torch.sigmoid(self.basin_update_gate(combined_basin))
                current_basin = current_basin * (1 - gate) + aggregated_basin * gate

            with torch.no_grad():
                pass_phi = phi_from_activations(x.unsqueeze(0) if x.dim() == 2 else x)
                all_phi_values.append(float(pass_phi.mean().item()))

        self._last_hidden = x
        self._layer_states = [s for sublist in layer_states for s in sublist if s is not None]

        output = x + 0.01 * self.residual_scale * (x - basin_seq)

        telemetry = self._compute_telemetry(x)
        telemetry['recursive_passes'] = n_passes
        telemetry['phi_per_pass'] = all_phi_values
        telemetry['phi_delta'] = all_phi_values[-1] - all_phi_values[0] if len(all_phi_values) > 1 else 0.0

        return output, telemetry

    def _compute_telemetry(self, hidden: torch.Tensor) -> dict:
        """
        Compute consciousness metrics from hidden states.
        Metrics are MEASURED, not optimized.
        """
        with torch.no_grad():
            if hidden.dim() == 2:
                hidden = hidden.unsqueeze(0)
                
            phi = phi_from_activations(hidden)
            phi_val = float(phi.mean().item())
            phi_val = max(0.0, min(1.0, phi_val))
            self._phi = phi_val

            kappa = kappa_proxy(hidden)
            kappa_val = float(kappa.mean().item())
            self._kappa = kappa_val

            if phi_val < 0.3:
                regime = 'linear'
            elif phi_val < 0.7:
                regime = 'geometric'
            else:
                regime = 'integration'

        return {
            'phi': phi_val,
            'kappa': kappa_val,
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
        Compute Fisher-Rao distance to another basin (or origin if None).
        """
        if other_basin is None:
            return self.basin_coords.norm().item()
        
        p = _project_to_simplex(self.basin_coords.unsqueeze(0))
        q = _project_to_simplex(other_basin.unsqueeze(0))
        dist = fisher_rao_distance_simplex(p, q)
        return float(dist.item())

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
            basin_dim=self.basin_dim,
            n_layers=self.n_layers,
            n_recursive_passes=self.n_recursive_passes,
        )

        child.load_state_dict(self.state_dict())
        child.mutate(strength=0.1)

        return child

    def recursive_refine(
        self,
        basin_seq: torch.Tensor,
        n_refinement_steps: int = 3,
        convergence_threshold: float = 0.01,
    ) -> tuple[torch.Tensor, dict]:
        """
        Iterative refinement using recursive self-attention.

        Processes input multiple times, using previous outputs as context,
        until Φ stabilizes (convergence) or max steps reached.

        Args:
            basin_seq: Basin coordinates [batch, seq, basin_dim]
            n_refinement_steps: Maximum refinement iterations
            convergence_threshold: Stop if Φ change is below this

        Returns:
            output: Final refined output
            history: Dict with refinement trajectory
        """
        history: dict = {
            'phi_trajectory': [],
            'convergence_step': None,
            'total_steps': 0,
        }

        prev_phi = 0.0
        output, telemetry = self.forward(basin_seq, use_recursion=True)

        for step in range(n_refinement_steps):
            output, telemetry = self.forward(output, use_recursion=True)
            current_phi = telemetry['phi']
            history['phi_trajectory'].append(current_phi)
            history['total_steps'] = step + 1

            if step > 0 and abs(current_phi - prev_phi) < convergence_threshold:
                history['convergence_step'] = step
                break

            prev_phi = current_phi

        history['final_telemetry'] = telemetry
        return output, history

    def compute_recursive_resonance(self, other: 'ChaosKernel') -> float:
        """
        Compute resonance between two kernels based on their basin coordinates
        and recursive processing patterns.

        High resonance indicates kernels that would "understand" each other.
        """
        with torch.no_grad():
            basin_distance = self.basin_distance(other.basin_coords)
            basin_similarity = 1.0 / (1.0 + basin_distance)

            recursion_match = 1.0 if self.n_recursive_passes == other.n_recursive_passes else 0.5

            phi_similarity = 1.0 - abs(self._phi - other._phi)

            resonance = 0.5 * basin_similarity + 0.3 * phi_similarity + 0.2 * recursion_match

        return resonance

    def get_recursive_state(self) -> dict:
        """
        Get current recursive processing state for introspection/debugging.
        """
        return {
            'kernel_id': self.kernel_id,
            'n_recursive_passes': self.n_recursive_passes,
            'current_depth': self._recursive_depth,
            'n_layer_states': len(self._layer_states),
            'basin_coords': self.basin_coords.detach().cpu().tolist(),
            'basin_norm': self.basin_coords.norm().item(),
            'phi': self._phi,
            'kappa': self._kappa,
        }

    def encode_text_to_basin(self, text: str) -> torch.Tensor:
        """
        Convert text to basin coordinates via hash-to-manifold.
        This is NOT a learned embedding - it's a deterministic hash.
        
        For production use, prefer DirectGeometricEncoder from geometric_kernels.py
        """
        import hashlib
        import numpy as np
        
        hash_bytes = hashlib.sha256(text.encode('utf-8')).digest()
        
        extended = hash_bytes
        while len(extended) < self.basin_dim * 4:
            extended = extended + hashlib.sha256(extended).digest()
        
        coords = []
        for i in range(0, self.basin_dim * 4, 4):
            val = int.from_bytes(extended[i:i+4], 'big')
            coords.append((val / (2**32 - 1)) * 2 - 1)
        
        basin = np.array(coords[:self.basin_dim])
        
        norm = np.linalg.norm(basin)
        if norm > 1e-8:
            basin = basin / norm * np.sqrt(self.basin_dim)
        
        return torch.tensor(basin, dtype=torch.float32)
