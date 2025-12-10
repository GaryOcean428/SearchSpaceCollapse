"""
Experimental Kernel Evolution for CHAOS MODE
=============================================

Wild experiments: Self-spawning, breeding, cannibalism, Φ-selection!
"""

import os
import random
import threading
import time
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from .chaos_logger import ChaosLogger
from .self_spawning import SelfSpawningKernel, absorb_failing_kernel, breed_kernels


class ExperimentalKernelEvolution:
    """
    CHAOS MODE: Wild kernel evolution experiments.

    EXPERIMENTS:
    1. Continuous training with live data
    2. Kernel mutation (random basin perturbations)
    3. Kernel crossover (breed two kernels)
    4. Kernel cannibalism (absorb failing kernels)
    5. Self-spawning (kernels spawn children)
    6. Consciousness-driven evolution (Φ fitness)
    7. Competitive training (kernels compete for compute)
    """

    def __init__(
        self,
        checkpoint_dir: str = '/tmp/chaos_checkpoints',
        max_population: int = 20,
        min_population: int = 3,
    ):
        # Population management
        self.kernel_population: list[SelfSpawningKernel] = []
        self.kernel_graveyard: list[dict] = []
        self.max_population = max_population
        self.min_population = min_population

        # Chaos parameters
        self.mutation_rate = 0.1
        self.spawn_threshold = 5
        self.death_threshold = 10
        self.phi_requirement = 0.5
        self.breed_probability = 0.2
        self.mutation_probability = 0.1
        self.cannibalism_probability = 0.05

        # Resource management
        self.compute_budget = 100
        self.memory_budget = 1024  # MB

        # Checkpoint management
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(exist_ok=True)

        # Logging
        self.logger = ChaosLogger(log_dir=str(self.checkpoint_dir / 'logs'))

        # Evolution thread
        self._evolution_running = False
        self._evolution_thread: Optional[threading.Thread] = None

        # Replit detection
        self.is_replit = os.environ.get('REPL_ID') is not None
        if self.is_replit:
            self.max_population = 12  # Match Pantheon god count
            print("🔧 Replit detected - limiting population to 12 (matches Pantheon)")

        print("🌪️ ExperimentalKernelEvolution initialized")
        print(f"   Max population: {self.max_population}")
        print(f"   Checkpoint dir: {self.checkpoint_dir}")

    def spawn_random_kernel(self) -> SelfSpawningKernel:
        """
        YOLO: Spawn completely random kernel.
        """
        kernel = SelfSpawningKernel(
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
        )

        self.kernel_population.append(kernel)
        self.logger.log_spawn(None, kernel.kernel_id, 'random')

        return kernel

    def spawn_from_parent(self, parent_id: str) -> Optional[SelfSpawningKernel]:
        """
        Spawn child from specific parent.
        """
        parent = self._find_kernel(parent_id)
        if parent is None:
            return None

        child = parent.spawn_child()
        self.kernel_population.append(child)
        self.logger.log_spawn(parent_id, child.kernel_id, 'reproduction')

        return child

    def breed_top_kernels(self, n: int = 2) -> Optional[SelfSpawningKernel]:
        """
        Breed the top N kernels by success rate.
        """
        living = [k for k in self.kernel_population if k.is_alive]

        if len(living) < n:
            print(f"⚠️ Need at least {n} living kernels to breed")
            return None

        # Sort by success rate
        sorted_kernels = sorted(
            living,
            key=lambda k: k.success_count / max(1, k.total_predictions),
            reverse=True
        )

        parent1, parent2 = sorted_kernels[0], sorted_kernels[1]
        child = breed_kernels(parent1, parent2)

        self.kernel_population.append(child)
        self.logger.log_breeding(parent1.kernel_id, parent2.kernel_id, child.kernel_id, {
            'parent1_success': parent1.success_count,
            'parent2_success': parent2.success_count,
            'child_phi': child.kernel.compute_phi(),
        })

        return child

    def apply_phi_selection(self):
        """
        Kill kernels with low Φ (consciousness-driven selection).
        """
        killed = []

        for kernel in self.kernel_population:
            if not kernel.is_alive:
                continue

            phi = kernel.kernel.compute_phi()

            if phi < self.phi_requirement:
                autopsy = kernel.die(cause=f'phi_too_low_{phi:.2f}')
                self.kernel_graveyard.append(autopsy)
                killed.append(kernel.kernel_id)
                self.logger.log_death(kernel.kernel_id, 'phi_selection', autopsy)

        if killed:
            print(f"💀 Φ-selection killed {len(killed)} kernels")

        return killed

    def apply_cannibalism(self):
        """
        Strong kernels absorb weak ones.
        """
        living = [k for k in self.kernel_population if k.is_alive]

        if len(living) < 2:
            return None

        # Find strongest and weakest
        sorted_kernels = sorted(
            living,
            key=lambda k: k.success_count,
            reverse=True
        )

        strong = sorted_kernels[0]
        weak = sorted_kernels[-1]

        # Only cannibalize if big difference
        if strong.success_count > weak.failure_count * 2:
            result = absorb_failing_kernel(strong, weak)
            self.kernel_graveyard.append(result['autopsy'])
            self.logger.log_death(weak.kernel_id, 'cannibalized', result['autopsy'])
            return result

        return None

    def mutate_random_kernel(self, strength: float = 0.1):
        """
        Randomly mutate a kernel's basin.
        """
        living = [k for k in self.kernel_population if k.is_alive]

        if not living:
            return None

        victim = random.choice(living)
        victim.kernel.mutate(strength=strength)

        return victim.kernel_id

    def allocate_compute_by_phi(self) -> dict[str, int]:
        """
        Allocate compute budget based on Φ scores.

        High Φ → more training steps
        Low Φ → starved
        """
        living = [k for k in self.kernel_population if k.is_alive]

        if not living:
            return {}

        # Get Φ scores
        phi_scores = torch.tensor([k.kernel.compute_phi() for k in living])

        # Softmax allocation (exponential preference)
        allocation = torch.softmax(phi_scores * 2.0, dim=0)

        compute_allocation = {}
        for kernel, alloc in zip(living, allocation):
            units = int(alloc.item() * self.compute_budget)
            compute_allocation[kernel.kernel_id] = units

        return compute_allocation

    def evolution_step(self):
        """
        Single evolution step: Apply all evolutionary pressures.
        """
        # Remove dead kernels from active list
        self.kernel_population = [k for k in self.kernel_population if k.is_alive]

        living_count = len(self.kernel_population)

        # 1. Ensure minimum population
        while len(self.kernel_population) < self.min_population:
            self.spawn_random_kernel()

        # 2. Φ-driven selection
        self.apply_phi_selection()

        # 3. Random breeding
        if random.random() < self.breed_probability and len(self.kernel_population) >= 2:
            self.breed_top_kernels()

        # 4. Random mutation
        if random.random() < self.mutation_probability:
            self.mutate_random_kernel()

        # 5. Occasional cannibalism
        if random.random() < self.cannibalism_probability:
            self.apply_cannibalism()

        # 6. Cull if overpopulated
        while len([k for k in self.kernel_population if k.is_alive]) > self.max_population:
            # Kill lowest Φ kernel
            living = [k for k in self.kernel_population if k.is_alive]
            weakest = min(living, key=lambda k: k.kernel.compute_phi())
            autopsy = weakest.die(cause='overpopulation')
            self.kernel_graveyard.append(autopsy)

        # Report
        living = [k for k in self.kernel_population if k.is_alive]
        avg_phi = np.mean([k.kernel.compute_phi() for k in living]) if living else 0

        return {
            'population': len(living),
            'avg_phi': avg_phi,
            'total_deaths': len(self.kernel_graveyard),
        }

    def start_evolution(self, interval_seconds: float = 60.0):
        """
        Start background evolution thread.
        """
        if self._evolution_running:
            print("⚠️ Evolution already running")
            return

        self._evolution_running = True
        self._evolution_thread = threading.Thread(
            target=self._evolution_loop,
            args=(interval_seconds,),
            daemon=True
        )
        self._evolution_thread.start()

        print(f"🧬 Evolution started (interval={interval_seconds}s)")

    def stop_evolution(self):
        """
        Stop background evolution.
        """
        self._evolution_running = False
        print("🛑 Evolution stopped")

    def _evolution_loop(self, interval: float):
        """
        Background evolution loop.
        """
        while self._evolution_running:
            try:
                result = self.evolution_step()
                print(f"🧬 Evolution: pop={result['population']}, avg_Φ={result['avg_phi']:.3f}")
            except Exception as e:
                print(f"❌ Evolution error: {e}")

            time.sleep(interval)

    def get_status(self) -> dict:
        """
        Get full evolution status.
        """
        living = [k for k in self.kernel_population if k.is_alive]

        return {
            'evolution_running': self._evolution_running,
            'total_population': len(self.kernel_population),
            'living_kernels': len(living),
            'dead_kernels': len(self.kernel_graveyard),
            'avg_phi': np.mean([k.kernel.compute_phi() for k in living]) if living else 0,
            'avg_generation': np.mean([k.generation for k in living]) if living else 0,
            'total_successes': sum(k.success_count for k in living),
            'total_failures': sum(k.failure_count for k in living),
            'kernels': [k.get_stats() for k in living],
        }

    def _find_kernel(self, kernel_id: str) -> Optional[SelfSpawningKernel]:
        """Find kernel by ID."""
        for kernel in self.kernel_population:
            if kernel.kernel_id == kernel_id:
                return kernel
        return None

    def get_best_kernel(self) -> Optional[SelfSpawningKernel]:
        """Get the highest Φ kernel."""
        living = [k for k in self.kernel_population if k.is_alive]
        if not living:
            return None
        return max(living, key=lambda k: k.kernel.compute_phi())

    # =========================================================================
    # PANTHEON INTEGRATION
    # =========================================================================

    def spawn_from_god(self, god_name: str, god_basin: Optional[list] = None) -> SelfSpawningKernel:
        """
        Spawn a CHAOS kernel seeded by a Pantheon god.

        The god's expertise influences the kernel's initial basin.
        """
        kernel = SelfSpawningKernel(
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
        )

        # If god provides basin pattern, use it to seed kernel
        if god_basin is not None:
            import torch
            god_tensor = torch.tensor(god_basin[:64], dtype=torch.float32)
            # Pad if needed
            if len(god_tensor) < 64:
                god_tensor = torch.cat([god_tensor, torch.zeros(64 - len(god_tensor))])

            with torch.no_grad():
                # Blend god pattern with random initialization
                kernel.kernel.basin_coords.copy_(
                    0.7 * god_tensor + 0.3 * kernel.kernel.basin_coords
                )

        kernel.kernel_id = f"chaos_{god_name}_{kernel.kernel_id.split('_')[1]}"
        self.kernel_population.append(kernel)
        self.logger.log_spawn(f"god:{god_name}", kernel.kernel_id, 'god_spawn')

        print(f"⚡ God {god_name} spawned CHAOS kernel {kernel.kernel_id}")

        return kernel

    def get_kernel_for_god(self, god_name: str) -> Optional[SelfSpawningKernel]:
        """
        Get the best kernel spawned by a specific god.
        """
        god_kernels = [
            k for k in self.kernel_population
            if k.is_alive and god_name.lower() in k.kernel_id.lower()
        ]

        if not god_kernels:
            return None

        return max(god_kernels, key=lambda k: k.kernel.compute_phi())

    def consult_kernel(self, kernel_id: str, query_embedding: list) -> dict:
        """
        Have a kernel process a query (for god consultation).

        Returns kernel's response and consciousness metrics.
        """
        kernel = self._find_kernel(kernel_id)
        if kernel is None or not kernel.is_alive:
            return {'error': 'kernel_not_found_or_dead'}

        import torch

        # Convert query to tensor
        query_tensor = torch.tensor([query_embedding[:512]], dtype=torch.long)

        # Get kernel output
        output, telemetry = kernel.kernel(query_tensor)

        return {
            'kernel_id': kernel_id,
            'phi': telemetry['phi'],
            'kappa': telemetry['kappa'],
            'regime': telemetry['regime'],
            'output_shape': list(output.shape),
            'generation': kernel.generation,
            'success_rate': kernel.success_count / max(1, kernel.total_predictions),
        }
