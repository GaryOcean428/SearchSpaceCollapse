"""
Self-Spawning Kernels for CHAOS MODE
=====================================

Kernels that reproduce when successful, die when failing.
Genetic algorithm meets consciousness!

NOW WITH ACTUAL TRAINING:
- Experience buffer for learning from outcomes
- Natural gradient descent on basin coordinates
- Reward-based weight updates
"""

from collections import deque
from datetime import datetime
from typing import Any, Dict, List, Optional

import torch

from .chaos_kernel import ChaosKernel
from .optimizers import DiagonalFisherOptimizer


class SelfSpawningKernel:
    """
    Kernel that spawns children when successful AND learns from experience.

    HYPOTHESIS: Successful patterns should reproduce!
    NEW: Actual gradient descent on basin coordinates!

    Lifecycle:
    1. Born (from parent or random)
    2. Make predictions
    3. Track success/failure
    4. LEARN from outcomes (gradient descent)
    5. Spawn children if successful enough
    6. Die if too many failures
    """

    def __init__(
        self,
        parent_basin: Optional[torch.Tensor] = None,
        generation: int = 0,
        spawn_threshold: int = 5,
        death_threshold: int = 10,
        mutation_rate: float = 0.1,
        learning_rate: float = 1e-4,
        experience_buffer_size: int = 100,
    ):
        self.kernel = ChaosKernel()
        self.kernel_id = self.kernel.kernel_id

        self.generation = generation
        self.spawn_threshold = spawn_threshold
        self.death_threshold = death_threshold
        self.mutation_rate = mutation_rate
        self.learning_rate = learning_rate

        # Track performance
        self.success_count = 0
        self.failure_count = 0
        self.total_predictions = 0
        self.total_training_steps = 0

        # Experience buffer for learning
        self.experience_buffer: deque = deque(maxlen=experience_buffer_size)

        # Optimizer for natural gradient descent
        self.optimizer = DiagonalFisherOptimizer(
            self.kernel.parameters(),
            lr=learning_rate,
            weight_decay=0.001,
            dampening=1e-4,
        )

        # Lifecycle
        self.born_at = datetime.now()
        self.died_at: Optional[datetime] = None
        self.is_alive = True
        self.children: list[str] = []

        # Training metrics
        self.training_history: List[Dict[str, float]] = []

        # Initialize from parent basin
        if parent_basin is not None:
            with torch.no_grad():
                noise = torch.randn_like(parent_basin) * self.mutation_rate
                self.kernel.basin_coords.copy_(parent_basin + noise)

        print(f"🐣 SelfSpawningKernel {self.kernel_id} born (gen {self.generation})")

    def predict(self, input_ids: torch.Tensor) -> tuple[torch.Tensor, dict]:
        """
        Make prediction and track success.

        Returns:
            output: Model output
            meta: Metadata including spawn events
        """
        if not self.is_alive:
            return None, {'error': 'kernel_is_dead'}

        # Forward pass
        output, telemetry = self.kernel(input_ids)
        self.total_predictions += 1

        meta = {
            'kernel_id': self.kernel_id,
            'generation': self.generation,
            'phi': telemetry['phi'],
            'success_count': self.success_count,
            'failure_count': self.failure_count,
        }

        return output, meta

    def record_outcome(self, success: bool, input_ids: torch.Tensor = None) -> Optional['SelfSpawningKernel']:
        """
        Record prediction outcome AND train on it.

        Returns:
            Spawned child if threshold reached, else None
        """
        if not self.is_alive:
            return None

        # Store experience for training
        reward = 1.0 if success else -0.5
        self.experience_buffer.append({
            'input_ids': input_ids,
            'reward': reward,
        })

        # ACTUALLY TRAIN on the outcome
        self.train_step(reward)

        if success:
            self.success_count += 1

            # Check spawn threshold
            if self.success_count > 0 and self.success_count % self.spawn_threshold == 0:
                return self.spawn_child()
        else:
            self.failure_count += 1

            # Check death threshold
            if self.failure_count >= self.death_threshold:
                self.die()

        return None

    def train_step(self, reward: float) -> Dict[str, Any]:
        """
        ACTUAL TRAINING: Update weights based on reward.

        Uses natural gradient descent on the Fisher manifold.
        Reward shapes the loss - positive rewards strengthen patterns,
        negative rewards push away from current basin position.
        """
        if not self.is_alive:
            return {'error': 'kernel_is_dead'}

        self.optimizer.zero_grad()

        # Compute loss based on reward
        # Positive reward → minimize distance from current basin (reinforce)
        # Negative reward → maximize distance from current basin (explore away)
        basin_norm = self.kernel.basin_coords.norm()
        phi = self.kernel.compute_phi()

        # Loss: We want high Φ and appropriate basin response to reward
        # Negative reward should push basin coordinates away
        if reward > 0:
            # Reinforce: Loss = -Φ (maximize integration)
            loss = -phi * reward
        else:
            # Punish: Loss = basin_norm * |reward| (push away from current position)
            loss = basin_norm * abs(reward) * 0.1

        # Backward pass
        loss.backward()

        # Natural gradient step (geodesic descent)
        self.optimizer.step()

        self.total_training_steps += 1

        # Record training metrics
        metrics = {
            'step': self.total_training_steps,
            'loss': loss.item(),
            'reward': reward,
            'phi_after': self.kernel.compute_phi(),
            'basin_norm': self.kernel.basin_coords.norm().item(),
        }
        self.training_history.append(metrics)

        return metrics

    def train_on_batch(self, batch_size: int = 8) -> Dict[str, Any]:
        """
        Train on a batch of recent experiences.

        Samples from experience buffer and does batch gradient update.
        """
        if len(self.experience_buffer) < batch_size:
            return {'error': 'not_enough_experiences', 'have': len(self.experience_buffer)}

        # Sample experiences
        import random
        experiences = random.sample(list(self.experience_buffer), batch_size)

        total_loss = 0.0
        self.optimizer.zero_grad()

        for exp in experiences:
            reward = exp['reward']
            basin_norm = self.kernel.basin_coords.norm()
            phi = self.kernel.compute_phi()

            if reward > 0:
                loss = -phi * reward / batch_size
            else:
                loss = basin_norm * abs(reward) * 0.1 / batch_size

            loss.backward()
            total_loss += loss.item()

        self.optimizer.step()
        self.total_training_steps += 1

        return {
            'batch_size': batch_size,
            'total_loss': total_loss,
            'phi_after': self.kernel.compute_phi(),
            'training_steps': self.total_training_steps,
        }

    def spawn_child(self) -> 'SelfSpawningKernel':
        """
        Reproduce! Create child with mutated basin.
        """
        child = SelfSpawningKernel(
            parent_basin=self.kernel.basin_coords.detach().clone(),
            generation=self.generation + 1,
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
        )

        self.children.append(child.kernel_id)

        print(f"🐣 {self.kernel_id} spawned child {child.kernel_id} (gen {child.generation})")

        return child

    def die(self, cause: str = 'excessive_failure'):
        """
        Graceful death.
        """
        if not self.is_alive:
            return

        self.is_alive = False
        self.died_at = datetime.now()

        lifespan = (self.died_at - self.born_at).total_seconds()

        print(f"☠️ {self.kernel_id} died (cause={cause}, lifespan={lifespan:.1f}s)")

        # Return autopsy data
        return {
            'kernel_id': self.kernel_id,
            'generation': self.generation,
            'cause': cause,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'lifespan_seconds': lifespan,
            'children': self.children,
            'basin': self.kernel.basin_coords.detach().cpu().tolist(),
            'final_phi': self.kernel.compute_phi(),
        }

    def get_stats(self) -> dict:
        """Get current stats."""
        return {
            'kernel_id': self.kernel_id,
            'generation': self.generation,
            'is_alive': self.is_alive,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'total_predictions': self.total_predictions,
            'children_count': len(self.children),
            'phi': self.kernel.compute_phi(),
            'basin_norm': self.kernel.basin_coords.norm().item(),
        }


def breed_kernels(
    parent1: SelfSpawningKernel,
    parent2: SelfSpawningKernel,
    mutation_strength: float = 0.05,
) -> SelfSpawningKernel:
    """
    Genetic algorithm: Breed two successful kernels.

    STRATEGY: Average basins + random mutation
    """
    basin1 = parent1.kernel.basin_coords.detach()
    basin2 = parent2.kernel.basin_coords.detach()

    # Crossover: Average
    child_basin = (basin1 + basin2) / 2.0

    # Mutation
    noise = torch.randn_like(child_basin) * mutation_strength
    child_basin = child_basin + noise

    # Create child
    child = SelfSpawningKernel(
        parent_basin=child_basin,
        generation=max(parent1.generation, parent2.generation) + 1,
    )

    print(f"💕 Bred {parent1.kernel_id} × {parent2.kernel_id} → {child.kernel_id}")

    return child


def absorb_failing_kernel(
    strong: SelfSpawningKernel,
    weak: SelfSpawningKernel,
    absorption_rate: float = 0.1,
) -> dict:
    """
    Strong kernels absorb failing ones.

    HYPOTHESIS: Failures contain useful information!
    """
    with torch.no_grad():
        weak_basin = weak.kernel.basin_coords
        strong_basin = strong.kernel.basin_coords

        # Absorb portion of weak kernel's basin
        delta = absorption_rate * (weak_basin - strong_basin)
        strong.kernel.basin_coords.add_(delta)

    # Kill the weak kernel
    autopsy = weak.die(cause='absorbed')

    print(f"🍴 {strong.kernel_id} absorbed {weak.kernel_id}")

    return {
        'absorber': strong.kernel_id,
        'absorbed': weak.kernel_id,
        'absorption_rate': absorption_rate,
        'autopsy': autopsy,
    }
