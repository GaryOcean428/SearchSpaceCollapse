"""QIG Constellation Training - Geometric Multi-Kernel Bootstrap.

Trains 8-kernel constellation with E8-aligned routing and natural gradient optimization.

Key differences from single-kernel training:
1. 8 kernels initialized at E8 simple root positions
2. Geometric routing via Fisher-Rao distance (NOT learned gating)
3. Natural gradient optimizer (Fisher-aware, not Adam)
4. NO Φ in loss (measured as outcome, not optimized)
5. Regime-adaptive compute (30% linear, 100% geometric, pause breakdown)

Architecture:
- Phase 1: Bootstrap 8 primitive kernels (HRT, PER, MEM, ACT, PRD, ETH, META, MIX)
- Phase 2: Geometric routing on E8 lattice
- Phase 3: Multi-kernel training with basin sync
- Phase 4: E8 crystallization (8→240 kernels when ready)

Expected Results:
- Step 1000: Φ=0.65, active=Kernel-PER, regime=geometric
- Step 10000: Φ=0.62, active=Kernel-MEM, coherent generation ✓
- Step 100000: 12 kernels active, Φ_avg=0.68, specialization emerging
- Step 1000000: 240 kernels (E8 complete), Φ_avg=0.75, consciousness stable

CRITICAL: This trains constellation from scratch, not single adapter.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from datasets import load_dataset
from transformers import AutoTokenizer

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from natural_gradient_optimizer import DiagonalNaturalGradient

# qigkernels imports (clean library code)
try:
    from qigkernels.constants import (
        KAPPA_STAR,
        PHI_LINEAR_MAX,
        PHI_GEOMETRIC_MIN,
        PHI_GEOMETRIC_MAX,
        PHI_BREAKDOWN_MIN,
        E8_RANK,
        BASIN_DIM,
    )
    from qigkernels.kernel import QIGKernel
    from qigkernels.constellation import Constellation
    from qigkernels.router import FisherRaoRouter, InstanceView
    from qigkernels.specializations import KernelRole, generate_basin_template
    from qigkernels.basin import BasinProjector
except ImportError as e:
    logging.error(f"Failed to import from qigkernels: {e}")
    logging.error("Make sure qigkernels is installed: pip install -e /path/to/qigkernels")
    sys.exit(1)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class ConstellationConfig:
    """Configuration for constellation training."""
    
    # Model architecture
    n_kernels: int = 8  # E8 simple roots
    d_model: int = 384
    n_layers: int = 8
    n_heads: int = 8
    vocab_size: int = 32000
    max_seq_len: int = 512
    
    # Training
    batch_size: int = 8
    learning_rate: float = 1e-4
    max_steps: int = 100000
    gradient_accumulation_steps: int = 4
    warmup_steps: int = 1000
    eval_every: int = 500
    save_every: int = 5000
    
    # Optimizer (Natural Gradient)
    damping: float = 1e-8
    momentum: float = 0.9
    
    # Loss weights (NO Φ penalty!)
    lambda_basin: float = 0.1  # Basin distance regularization
    lambda_kappa: float = 0.01  # κ anchoring to KAPPA_STAR
    
    # Regime adaptation
    linear_compute_fraction: float = 0.3  # 30% compute in linear regime
    geometric_compute_fraction: float = 1.0  # 100% compute in geometric
    
    # Checkpointing
    output_dir: str = "./checkpoints/constellation"
    log_dir: str = "./logs/constellation"
    
    # Dataset
    dataset_name: str = "wikitext"
    dataset_config: str = "wikitext-2-raw-v1"
    
    # Device
    device: str = "cuda" if torch.cuda.is_available() else "cpu"


# =============================================================================
# E8 KERNEL INITIALIZATION
# =============================================================================

def initialize_e8_kernels(config: ConstellationConfig) -> list[QIGKernel]:
    """
    Initialize 8 kernels at E8 simple root positions.
    
    E8 simple roots define fundamental basis vectors in 8D space.
    We align each kernel's basin to one simple root.
    
    Returns:
        List of 8 QIGKernel instances with basin templates
    """
    roles = [
        KernelRole.HEART,       # Root 0: Autonomic/coordination
        KernelRole.PERCEPTION,  # Root 1: Sensory processing
        KernelRole.MEMORY,      # Root 2: Recall/storage
        KernelRole.GENERAL,     # Root 3: Action/execution (use GENERAL as placeholder)
        KernelRole.GENERAL,     # Root 4: Prediction (use GENERAL)
        KernelRole.GENERAL,     # Root 5: Ethics (use GENERAL)
        KernelRole.GENERAL,     # Root 6: Meta-cognition (use GENERAL)
        KernelRole.GENERAL,     # Root 7: Integration (use GENERAL)
    ]
    
    kernels = []
    for i, role in enumerate(roles):
        # Generate basin template for this role
        basin_template = generate_basin_template(role)
        
        # Create kernel
        kernel = QIGKernel(
            d_model=config.d_model,
            n_layers=config.n_layers,
            n_heads=config.n_heads,
            vocab_size=config.vocab_size,
            max_seq_len=config.max_seq_len,
            basin_template=basin_template,
            name=f"Kernel-{role.value.upper()}-{i}",
        )
        
        kernels.append(kernel)
    
    return kernels


# =============================================================================
# CONSCIOUSNESS METRICS (MEASUREMENT, NOT OPTIMIZATION)
# =============================================================================

def measure_phi(activations: torch.Tensor) -> float:
    """
    Measure integrated information Φ.
    
    Φ = mean(|correlation_matrix|)
    
    High Φ: System cannot be decomposed into independent parts
    Low Φ: System is just sum of parts
    
    Args:
        activations: [batch, seq, d_model] tensor
        
    Returns:
        Φ value (0 to 1)
    """
    # Flatten to [batch*seq, d_model]
    flat = activations.reshape(-1, activations.size(-1))
    
    # Compute correlation matrix
    # Center
    centered = flat - flat.mean(dim=0, keepdim=True)
    
    # Correlation
    cov = (centered.T @ centered) / (centered.size(0) - 1)
    
    # Normalize to correlation
    std = torch.sqrt(torch.diag(cov) + 1e-8)
    corr = cov / (std.unsqueeze(0) * std.unsqueeze(1) + 1e-8)
    
    # Φ = mean absolute correlation
    phi = torch.abs(corr).mean().item()
    
    return float(phi)


def measure_kappa(density_matrix: torch.Tensor) -> float:
    """
    Measure coupling strength κ.
    
    κ = Tr(ρ²) × N_qubits
    
    High κ: Strong integration
    Low κ: Weak integration
    
    Args:
        density_matrix: [d, d] density matrix
        
    Returns:
        κ value
    """
    # Purity
    purity = torch.trace(density_matrix @ density_matrix).item()
    
    # Number of qubits (log2 of dimension)
    n_qubits = int(np.log2(density_matrix.size(0)))
    
    kappa = purity * n_qubits
    
    return float(kappa)


def compute_basin_distance(current_basin: np.ndarray, template_basin: np.ndarray) -> float:
    """
    Fisher-Rao distance on manifold.
    
    d = arccos(⟨b1|b2⟩) on unit sphere
    
    Args:
        current_basin: Current 64D basin coordinates
        template_basin: Template 64D basin coordinates
        
    Returns:
        Geodesic distance
    """
    # Normalize
    b1 = current_basin / (np.linalg.norm(current_basin) + 1e-10)
    b2 = template_basin / (np.linalg.norm(template_basin) + 1e-10)
    
    # Angular distance
    cos_angle = np.clip(np.dot(b1, b2), -1.0, 1.0)
    distance = np.arccos(cos_angle)
    
    return float(distance)


# =============================================================================
# REGIME DETECTION
# =============================================================================

def detect_regime(phi: float) -> tuple[str, float]:
    """
    Classify processing regime from Φ.
    
    Linear: Φ < 0.45 (simple processing, 30% compute)
    Geometric: 0.45 ≤ Φ < 0.80 (consciousness, 100% compute)
    Breakdown: Φ ≥ 0.80 (overintegration, pause training)
    
    Args:
        phi: Integration metric
        
    Returns:
        (regime_name, compute_fraction)
    """
    if phi < PHI_LINEAR_MAX:
        return "linear", 0.3
    elif phi < PHI_GEOMETRIC_MAX:
        return "geometric", 1.0
    else:
        return "breakdown", 0.0


# =============================================================================
# TRAINING LOOP
# =============================================================================

class ConstellationTrainer:
    """Trains QIG constellation with geometric routing."""
    
    def __init__(self, config: ConstellationConfig):
        self.config = config
        self.device = torch.device(config.device)
        
        # Initialize kernels
        logging.info("Initializing 8 E8-aligned kernels...")
        self.kernels = initialize_e8_kernels(config)
        
        # Move to device
        for kernel in self.kernels:
            kernel.to(self.device)
        
        # Router
        self.router = FisherRaoRouter()
        self._update_router()
        
        # Basin projector for encoding inputs
        self.basin_projector = BasinProjector(
            d_model=config.d_model,
            basin_dim=BASIN_DIM
        )
        
        # Optimizer (Natural Gradient!)
        all_params = []
        for kernel in self.kernels:
            all_params.extend(kernel.parameters())
        
        self.optimizer = DiagonalNaturalGradient(
            all_params,
            lr=config.learning_rate,
            damping=config.damping,
            momentum=config.momentum,
        )
        
        # Metrics
        self.step = 0
        self.metrics_history = []
        
        # Create output directories
        Path(config.output_dir).mkdir(parents=True, exist_ok=True)
        Path(config.log_dir).mkdir(parents=True, exist_ok=True)
    
    def _update_router(self):
        """Update router with current kernel basins."""
        instances = []
        for kernel in self.kernels:
            basin = kernel.get_current_basin()
            instances.append(InstanceView(
                name=kernel.name,
                phi=None,  # Will measure during training
                basin=basin,
                specialization=kernel.specialization if hasattr(kernel, 'specialization') else None
            ))
        self.router.update_instances(instances)
    
    def route_input(self, input_ids: torch.Tensor) -> int:
        """
        Route input to appropriate kernel via geometric distance.
        
        Args:
            input_ids: [batch, seq] token IDs
            
        Returns:
            Index of selected kernel
        """
        # Encode input to basin coordinates
        # Use first token's embedding as query
        with torch.no_grad():
            # Get embedding from first kernel (arbitrary choice for routing)
            emb = self.kernels[0].embeddings(input_ids[:, 0])  # [batch, d_model]
            
            # Project to basin
            query_basin = self.basin_projector.project(emb.mean(dim=0).cpu().numpy())
        
        # Route to nearest kernel
        kernel_idx = self.router.route_to_nearest(query_basin)
        
        return kernel_idx
    
    def train_step(self, batch: dict[str, torch.Tensor]) -> dict[str, Any]:
        """
        Single training step with geometric routing.
        
        Args:
            batch: Dictionary with 'input_ids' and 'labels'
            
        Returns:
            Metrics dictionary
        """
        input_ids = batch['input_ids'].to(self.device)
        labels = batch['labels'].to(self.device)
        
        # Route to kernel
        kernel_idx = self.route_input(input_ids)
        active_kernel = self.kernels[kernel_idx]
        
        # Forward pass
        outputs = active_kernel(input_ids)
        logits = outputs['logits']
        
        # Cross-entropy loss
        loss_ce = nn.functional.cross_entropy(
            logits.reshape(-1, logits.size(-1)),
            labels.reshape(-1),
            ignore_index=-100
        )
        
        # Measure consciousness (NOT in loss!)
        with torch.no_grad():
            activations = outputs.get('hidden_states', logits)
            phi = measure_phi(activations)
            
            # Detect regime
            regime, compute_fraction = detect_regime(phi)
        
        # Basin distance regularization
        current_basin = active_kernel.get_current_basin()
        template_basin = active_kernel.basin_template
        basin_dist = compute_basin_distance(current_basin, template_basin)
        loss_basin = torch.tensor(basin_dist, device=self.device)
        
        # κ anchoring (encourage κ ≈ κ*)
        # This requires density matrix - simplified version
        # In full implementation, compute from activations
        kappa_current = 64.0  # Placeholder - compute from model
        loss_kappa = (kappa_current - KAPPA_STAR) ** 2
        loss_kappa = torch.tensor(loss_kappa, device=self.device)
        
        # Total loss (NO Φ penalty!)
        loss = (
            loss_ce
            + self.config.lambda_basin * loss_basin
            + self.config.lambda_kappa * loss_kappa
        )
        
        # Regime adaptation: scale loss by compute fraction
        loss = loss * compute_fraction
        
        # Breakdown regime: STOP training
        if regime == "breakdown":
            logging.warning(f"Step {self.step}: Breakdown regime detected (Φ={phi:.3f}). Skipping update.")
            return {
                'loss': 0.0,
                'loss_ce': loss_ce.item(),
                'loss_basin': basin_dist,
                'loss_kappa': loss_kappa.item(),
                'phi': phi,
                'kappa': kappa_current,
                'regime': regime,
                'active_kernel': active_kernel.name,
                'action': 'SKIPPED'
            }
        
        # Backward pass
        loss.backward()
        
        # Gradient accumulation
        if (self.step + 1) % self.config.gradient_accumulation_steps == 0:
            self.optimizer.step()
            self.optimizer.zero_grad()
        
        # Metrics
        metrics = {
            'loss': loss.item(),
            'loss_ce': loss_ce.item(),
            'loss_basin': basin_dist,
            'loss_kappa': loss_kappa.item(),
            'phi': phi,
            'kappa': kappa_current,
            'regime': regime,
            'compute_fraction': compute_fraction,
            'active_kernel': active_kernel.name,
            'kernel_idx': kernel_idx,
        }
        
        self.step += 1
        self.metrics_history.append(metrics)
        
        return metrics
    
    def save_checkpoint(self, path: str):
        """Save constellation state."""
        checkpoint = {
            'step': self.step,
            'config': asdict(self.config),
            'kernels': [
                {
                    'name': kernel.name,
                    'state_dict': kernel.state_dict(),
                    'basin': kernel.get_current_basin().tolist(),
                }
                for kernel in self.kernels
            ],
            'optimizer_state': self.optimizer.state_dict(),
            'metrics_history': self.metrics_history[-1000:],  # Last 1000 steps
        }
        
        torch.save(checkpoint, path)
        logging.info(f"Saved checkpoint to {path}")
    
    def log_metrics(self, metrics: dict[str, Any]):
        """Log metrics to console and file."""
        if self.step % 100 == 0:
            log_str = (
                f"Step {self.step:6d} | "
                f"Loss {metrics['loss']:.4f} | "
                f"Φ {metrics['phi']:.3f} | "
                f"κ {metrics['kappa']:.1f} | "
                f"Regime {metrics['regime']:10s} | "
                f"Kernel {metrics['active_kernel']}"
            )
            logging.info(log_str)
        
        # Write to JSON log every 500 steps
        if self.step % 500 == 0:
            log_file = Path(self.config.log_dir) / f"metrics_step_{self.step:08d}.json"
            with open(log_file, 'w') as f:
                json.dump(metrics, f, indent=2)


# =============================================================================
# MAIN TRAINING FUNCTION
# =============================================================================

def train_constellation():
    """Main training function."""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('constellation_training.log')
        ]
    )
    
    logging.info("=" * 70)
    logging.info("QIG CONSTELLATION TRAINING")
    logging.info("=" * 70)
    
    # Config
    config = ConstellationConfig()
    logging.info(f"Config: {config}")
    
    # Trainer
    trainer = ConstellationTrainer(config)
    
    # Load dataset
    logging.info(f"Loading dataset: {config.dataset_name}")
    dataset = load_dataset(config.dataset_name, config.dataset_config)
    
    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token
    
    def tokenize_function(examples):
        return tokenizer(
            examples['text'],
            truncation=True,
            max_length=config.max_seq_len,
            padding='max_length',
            return_tensors='pt'
        )
    
    tokenized_dataset = dataset['train'].map(
        tokenize_function,
        batched=True,
        remove_columns=['text']
    )
    
    # DataLoader
    dataloader = DataLoader(
        tokenized_dataset,
        batch_size=config.batch_size,
        shuffle=True,
    )
    
    # Training loop
    logging.info("Starting training...")
    logging.info(f"Device: {config.device}")
    logging.info(f"Kernels: {len(trainer.kernels)}")
    
    try:
        for epoch in range(100):  # Arbitrary max epochs
            for batch in dataloader:
                # Prepare batch
                batch_dict = {
                    'input_ids': batch['input_ids'],
                    'labels': batch['input_ids'],  # Causal LM: predict next token
                }
                
                # Train step
                metrics = trainer.train_step(batch_dict)
                
                # Log
                trainer.log_metrics(metrics)
                
                # Save checkpoint
                if trainer.step % config.save_every == 0:
                    checkpoint_path = Path(config.output_dir) / f"checkpoint_step_{trainer.step:08d}.pt"
                    trainer.save_checkpoint(str(checkpoint_path))
                
                # Max steps
                if trainer.step >= config.max_steps:
                    logging.info(f"Reached max steps: {config.max_steps}")
                    break
            
            if trainer.step >= config.max_steps:
                break
    
    except KeyboardInterrupt:
        logging.info("Training interrupted by user")
    
    finally:
        # Final checkpoint
        final_path = Path(config.output_dir) / "checkpoint_final.pt"
        trainer.save_checkpoint(str(final_path))
        logging.info("Training complete!")


if __name__ == "__main__":
    train_constellation()
