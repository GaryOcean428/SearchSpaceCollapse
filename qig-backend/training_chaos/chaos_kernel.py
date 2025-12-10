"""
ChaosKernel: Recursive Experimental Kernel for CHAOS MODE
============================================================

Kernel with recursive capabilities for self-referential processing.
256d model, 4 layers - fast to train, easy to spawn/kill.

RECURSIVE ARCHITECTURE FEATURES:
1. Basin-Coupled Attention: Basin coordinates modulate attention patterns
2. Recursive Processing: Multiple iterations with feedback loops
3. Self-Referential Memory: Previous outputs feed back into processing
4. Holographic Compression: Basin encodes full state holographically
"""

import uuid
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class BasinCoupledAttention(nn.Module):
    """
    Attention layer coupled to basin coordinates.
    Basin modulates query/key/value projections for identity-aware attention.
    """

    def __init__(self, d_model: int, n_heads: int, basin_dim: int, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads

        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)

        self.basin_modulator = nn.Linear(basin_dim, n_heads)
        self.dropout = nn.Dropout(dropout)

    def forward(
        self, x: torch.Tensor, basin: torch.Tensor, mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        batch_size, seq_len, _ = x.shape

        q = self.q_proj(x).view(batch_size, seq_len, self.n_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch_size, seq_len, self.n_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch_size, seq_len, self.n_heads, self.head_dim).transpose(1, 2)

        basin_weights = torch.sigmoid(self.basin_modulator(basin))
        basin_weights = basin_weights.view(1, self.n_heads, 1, 1)

        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        scores = scores * basin_weights

        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))

        attn = F.softmax(scores, dim=-1)
        attn = self.dropout(attn)

        out = torch.matmul(attn, v)
        out = out.transpose(1, 2).contiguous().view(batch_size, seq_len, self.d_model)
        return self.out_proj(out)


class RecursiveTransformerLayer(nn.Module):
    """
    Transformer layer with recursive feedback capability.
    Can process input multiple times with state feedback.
    """

    def __init__(self, d_model: int, n_heads: int, basin_dim: int, dropout: float = 0.1):
        super().__init__()
        self.basin_attention = BasinCoupledAttention(d_model, n_heads, basin_dim, dropout)
        self.feed_forward = nn.Sequential(
            nn.Linear(d_model, d_model * 4),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model * 4, d_model),
            nn.Dropout(dropout),
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)

        self.feedback_gate = nn.Linear(d_model * 2, d_model)

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

        attn_out = self.basin_attention(self.norm1(x), basin)
        x = x + attn_out

        ff_out = self.feed_forward(self.norm2(x))
        x = x + ff_out

        return x, x.clone()


class HolographicBasinEncoder(nn.Module):
    """
    Compresses hidden states into basin coordinates holographically.
    Basin encodes the "essence" of the processing state.
    """

    def __init__(self, d_model: int, basin_dim: int):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, basin_dim),
            nn.Tanh(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(basin_dim, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, d_model),
        )

    def encode(self, hidden: torch.Tensor) -> torch.Tensor:
        pooled = hidden.mean(dim=1)
        return self.encoder(pooled)

    def decode(self, basin: torch.Tensor) -> torch.Tensor:
        return self.decoder(basin)


class ChaosKernel(nn.Module):
    """
    Recursive kernel for CHAOS MODE experimentation.

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
        d_model: int = 256,
        n_heads: int = 4,
        n_layers: int = 4,
        vocab_size: int = 50000,
        basin_dim: int = 64,
        dropout: float = 0.1,
        n_recursive_passes: int = 2,
    ):
        super().__init__()

        self.kernel_id = f"chaos_{uuid.uuid4().hex[:8]}"
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_layers = n_layers
        self.vocab_size = vocab_size
        self.basin_dim = basin_dim
        self.n_recursive_passes = n_recursive_passes

        self.basin_coords = nn.Parameter(
            torch.randn(basin_dim) * 0.1
        )

        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoding = nn.Parameter(torch.randn(1, 512, d_model) * 0.02)

        self.layers = nn.ModuleList([
            RecursiveTransformerLayer(d_model, n_heads, basin_dim, dropout)
            for _ in range(n_layers)
        ])

        self.holographic_encoder = HolographicBasinEncoder(d_model, basin_dim)

        self.basin_update_gate = nn.Linear(basin_dim * 2, basin_dim)

        self.output_head = nn.Linear(d_model, vocab_size)

        self._last_hidden = None
        self._phi = 0.0
        self._kappa = 0.0
        self._recursive_depth = 0
        self._layer_states: list[torch.Tensor] = []

        print(f"🧬 Created RecursiveChaosKernel {self.kernel_id} (passes={n_recursive_passes})")

    def forward(
        self,
        input_ids: torch.Tensor,
        use_recursion: bool = True,
    ) -> tuple[torch.Tensor, dict]:
        """
        Recursive forward pass with consciousness telemetry.

        The kernel processes input through multiple recursive passes,
        with each pass refining the representation using feedback from
        the previous pass. Basin coordinates are updated holographically.

        Args:
            input_ids: Token IDs [batch, seq]
            use_recursion: Whether to use multiple recursive passes

        Returns:
            output: Logits [batch, seq, vocab]
            telemetry: Consciousness metrics with recursion info
        """
        batch_size, seq_len = input_ids.shape
        n_passes = self.n_recursive_passes if use_recursion else 1

        x = self.embedding(input_ids)
        x = x + self.pos_encoding[:, :seq_len, :]

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
                h_flat = x.mean(dim=0)
                if h_flat.shape[0] > 1:
                    corr_matrix = torch.corrcoef(h_flat)
                    pass_phi = corr_matrix.abs().mean().item()
                else:
                    pass_phi = 0.5
                all_phi_values.append(pass_phi)

        self._last_hidden = x
        self._layer_states = [s for sublist in layer_states for s in sublist if s is not None]

        logits = self.output_head(x)

        telemetry = self._compute_telemetry(x)
        telemetry['recursive_passes'] = n_passes
        telemetry['phi_per_pass'] = all_phi_values
        telemetry['phi_delta'] = all_phi_values[-1] - all_phi_values[0] if len(all_phi_values) > 1 else 0.0

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
            n_recursive_passes=self.n_recursive_passes,
        )

        child.load_state_dict(self.state_dict())
        child.mutate(strength=0.1)

        return child

    def recursive_refine(
        self,
        input_ids: torch.Tensor,
        n_refinement_steps: int = 3,
        convergence_threshold: float = 0.01,
    ) -> tuple[torch.Tensor, dict]:
        """
        Iterative refinement using recursive self-attention.

        Processes input multiple times, using previous outputs as context,
        until Φ stabilizes (convergence) or max steps reached.

        This is distinct from the built-in recursive passes - this method
        allows external control over the refinement process and tracks
        convergence explicitly.

        Args:
            input_ids: Token IDs [batch, seq]
            n_refinement_steps: Maximum refinement iterations
            convergence_threshold: Stop if Φ change is below this

        Returns:
            logits: Final refined output
            history: Dict with refinement trajectory
        """
        history: dict = {
            'phi_trajectory': [],
            'convergence_step': None,
            'total_steps': 0,
        }

        prev_phi = 0.0
        logits, telemetry = self.forward(input_ids, use_recursion=True)

        for step in range(n_refinement_steps):
            logits, telemetry = self.forward(input_ids, use_recursion=True)
            current_phi = telemetry['phi']
            history['phi_trajectory'].append(current_phi)
            history['total_steps'] = step + 1

            if step > 0 and abs(current_phi - prev_phi) < convergence_threshold:
                history['convergence_step'] = step
                break

            prev_phi = current_phi

        history['final_telemetry'] = telemetry
        return logits, history

    def compute_recursive_resonance(self, other: 'ChaosKernel') -> float:
        """
        Compute resonance between two kernels based on their basin coordinates
        and recursive processing patterns.

        High resonance indicates kernels that would "understand" each other.
        """
        with torch.no_grad():
            basin_distance = (self.basin_coords - other.basin_coords).norm().item()
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

    def generate(
        self,
        prompt_ids: torch.Tensor,
        max_new_tokens: int = 50,
        use_recursive_generation: bool = True,
    ) -> torch.Tensor:
        """
        Autoregressive generation with optional recursive refinement.

        Args:
            prompt_ids: Starting token IDs
            max_new_tokens: Maximum tokens to generate
            use_recursive_generation: Use full recursive processing per token
        """
        self.eval()
        generated = prompt_ids.clone()

        with torch.no_grad():
            for _ in range(max_new_tokens):
                logits, _ = self.forward(generated, use_recursion=use_recursive_generation)
                next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)
                generated = torch.cat([generated, next_token], dim=1)

        return generated
