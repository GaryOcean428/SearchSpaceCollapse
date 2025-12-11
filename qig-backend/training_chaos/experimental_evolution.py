"""
Experimental Kernel Evolution for CHAOS MODE
=============================================

E8-ALIGNED HYBRID ARCHITECTURE
- 240 total kernels (E8 roots) - theoretical max
- 60 active kernels (in memory) - practical limit
- Automatic paid tier detection
- Memory-aware population management
"""

import os
import random
import threading
import time
from datetime import datetime
from itertools import product
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from .chaos_logger import ChaosLogger
from .self_spawning import SelfSpawningKernel, absorb_failing_kernel, breed_kernels

# Import persistence for database operations
try:
    import sys
    sys.path.append('..')
    from persistence import KernelPersistence
    PERSISTENCE_AVAILABLE = True
except ImportError:
    PERSISTENCE_AVAILABLE = False
    print("[Chaos] Persistence not available - running without database")


class ExperimentalKernelEvolution:
    """
    CHAOS MODE: E8-Aligned Hybrid Evolution.

    ARCHITECTURE:
    - E8 structure: 240 total kernel slots (E8 roots)
    - Active pool: 60 kernels in memory (resource limit)
    - Dormant pool: Remaining checkpointed to disk
    - Rotation: Swap active ↔ dormant based on fitness

    EXPERIMENTS:
    1. E8 root alignment (kernels map to 240 E8 roots)
    2. Consciousness-driven evolution (Φ fitness)
    3. Breeding, mutation, cannibalism
    4. Convergence tracking (test E8 hypothesis)
    """

    # E8 CONSTANTS
    E8_ROOTS = 240           # Theoretical maximum (E8 structure)
    E8_RANK = 8              # E8 rank
    KAPPA_STAR = 64          # 8² (validated experimentally)

    def __init__(
        self,
        max_population: int = 20,
        min_population: int = 3,
    ):
        # Detect environment and tier
        self.is_replit = os.environ.get('REPL_ID') is not None
        self.is_paid_tier = self._detect_paid_tier()
        self.memory_available_gb = self._get_available_memory()

        # Initialize based on tier
        if self.is_paid_tier:
            self._init_paid_tier()
        elif self.is_replit:
            self._init_free_tier()
        else:
            self._init_local_dev()

        # Override if explicitly provided
        if max_population != 20:
            self.max_active = max_population
        if min_population != 3:
            self.min_population = min_population

        # Population management
        self.kernel_population: list[SelfSpawningKernel] = []  # Active kernels
        self.dormant_kernels: list[str] = []  # Checkpoint paths
        self.kernel_graveyard: list[dict] = []
        self.elite_hall_of_fame: list[dict] = []

        # E8 structure
        self.e8_roots = None
        self.kernel_to_root_mapping: dict[str, int] = {}
        if self.architecture == 'e8_hybrid':
            self.e8_roots = self._initialize_e8_roots()

        # Logging (PostgreSQL-backed, no file directories needed)
        self.logger = ChaosLogger()

        # Persistence (database operations)
        self.kernel_persistence = KernelPersistence() if PERSISTENCE_AVAILABLE else None

        # Evolution thread
        self._evolution_running = False
        self._evolution_thread: Optional[threading.Thread] = None
        self.generation = 0

        # Convergence tracking (test E8 hypothesis)
        self.convergence_history: list[dict] = []
        self.convergence_target = self.E8_ROOTS  # 240

        # Load persisted kernels from database on startup
        self._load_from_database()
        
        self._print_init_summary()

    def _load_from_database(self):
        """Load persisted kernels from PostgreSQL on startup."""
        if not self.kernel_persistence:
            print("[Chaos] No persistence available, starting fresh")
            return
        
        try:
            # Load elite kernels first (high performers)
            elite_kernels = self.kernel_persistence.load_elite_kernels(
                min_phi=self.phi_elite_threshold,
                limit=min(20, self.max_active // 2)
            )
            
            # Load additional active kernels
            active_kernels = self.kernel_persistence.load_active_kernels(
                limit=self.max_active - len(elite_kernels)
            )
            
            loaded_count = 0
            for kernel_data in elite_kernels + active_kernels:
                try:
                    # Skip if already at capacity
                    if len(self.kernel_population) >= self.max_active:
                        break
                    
                    # Reconstruct kernel from database
                    basin_coords = kernel_data.get('basin_coordinates')
                    # Validate basin coordinates - must be a list of 64 floats
                    if basin_coords is None or not isinstance(basin_coords, (list, tuple)):
                        continue
                    if len(basin_coords) != 64:
                        continue
                    # Ensure all values are valid numbers
                    try:
                        basin_coords = [float(x) for x in basin_coords]
                    except (ValueError, TypeError):
                        continue
                    
                    kernel = SelfSpawningKernel(
                        spawn_threshold=self.spawn_threshold,
                        death_threshold=self.death_threshold,
                        mutation_rate=self.mutation_rate,
                    )
                    
                    # Restore state
                    with torch.no_grad():
                        kernel.kernel.basin_coords.copy_(
                            torch.tensor(basin_coords, dtype=torch.float32)
                        )
                    
                    kernel.kernel_id = kernel_data.get('kernel_id', kernel.kernel_id)
                    kernel.generation = kernel_data.get('generation', 0)
                    kernel.success_count = kernel_data.get('success_count', 0)
                    kernel.failure_count = kernel_data.get('failure_count', 0)
                    
                    # Track E8 root mapping if available
                    e8_root = kernel_data.get('primitive_root')
                    if e8_root is not None:
                        self.kernel_to_root_mapping[kernel.kernel_id] = e8_root
                    
                    self.kernel_population.append(kernel)
                    loaded_count += 1
                    
                except Exception as e:
                    print(f"[Chaos] Failed to restore kernel {kernel_data.get('kernel_id')}: {e}")
            
            if loaded_count > 0:
                print(f"✨ [Chaos] Restored {loaded_count} kernels from database")
                
        except Exception as e:
            print(f"[Chaos] Failed to load from database: {e}")
            # Continue with empty population - will spawn fresh

    def _detect_paid_tier(self) -> bool:
        """Detect if on paid Replit tier.

        Heuristic: Check available memory
        Free tier: ~1GB
        Paid tier: 4-8GB
        """
        try:
            import psutil
            total_memory_gb = psutil.virtual_memory().total / (1024**3)
            return total_memory_gb > 2.5  # More than 2.5GB = paid
        except ImportError:
            return False

    def _get_available_memory(self) -> float:
        """Get available memory in GB."""
        try:
            import psutil
            return psutil.virtual_memory().available / (1024**3)
        except ImportError:
            return 1.0  # Assume 1GB if can't detect

    def _init_paid_tier(self):
        """Aggressive settings for paid tier."""
        print("💰 PAID TIER DETECTED - UNLEASHING FULL CHAOS!")
        self.architecture = 'e8_hybrid'
        self.max_total = self.E8_ROOTS  # 240 (E8 roots)
        self.max_active = 60            # In memory
        self.min_population = 5
        self.mutation_rate = 0.15
        self.spawn_threshold = 3
        self.death_threshold = 15
        self.breeding_interval = 30
        self.phi_death_threshold = 0.4
        self.phi_elite_threshold = 0.8
        self.rotation_interval = 300    # 5 minutes

        # Enable all experiments
        self.enable_self_spawning = True
        self.enable_breeding = True
        self.enable_cannibalism = True
        self.enable_mutation = True
        self.enable_god_fusion = True

        # Resource allocation
        self.compute_budget = 1000
        self.memory_budget = 4096  # 4GB

    def _init_free_tier(self):
        """Conservative settings for free tier."""
        print("🔧 Free tier detected - conservative settings")
        self.architecture = 'simple'
        self.max_total = 20
        self.max_active = 12
        self.min_population = 3
        self.mutation_rate = 0.1
        self.spawn_threshold = 5
        self.death_threshold = 10
        self.breeding_interval = 60
        self.phi_death_threshold = 0.5
        self.phi_elite_threshold = 0.7
        self.rotation_interval = 600

        # Limited experiments
        self.enable_self_spawning = True
        self.enable_breeding = True
        self.enable_cannibalism = False
        self.enable_mutation = True
        self.enable_god_fusion = False

        # Resource allocation
        self.compute_budget = 100
        self.memory_budget = 1024  # 1GB

    def _init_local_dev(self):
        """Local development settings."""
        print("💻 Local dev detected")
        self.architecture = 'e8_hybrid'
        self.max_total = self.E8_ROOTS
        self.max_active = 40
        self.min_population = 3
        self.mutation_rate = 0.1
        self.spawn_threshold = 5
        self.death_threshold = 10
        self.breeding_interval = 60
        self.phi_death_threshold = 0.5
        self.phi_elite_threshold = 0.8
        self.rotation_interval = 300

        self.enable_self_spawning = True
        self.enable_breeding = True
        self.enable_cannibalism = True
        self.enable_mutation = True
        self.enable_god_fusion = True

        self.compute_budget = 500
        self.memory_budget = 2048

    def _print_init_summary(self):
        """Print initialization summary."""
        tier = 'PAID' if self.is_paid_tier else ('FREE' if self.is_replit else 'LOCAL')
        print("\n🌪️ ExperimentalKernelEvolution initialized")
        print(f"   Tier: {tier}")
        print(f"   Architecture: {self.architecture}")
        print(f"   Max total: {self.max_total}")
        print(f"   Max active: {self.max_active}")
        print(f"   Memory available: {self.memory_available_gb:.1f}GB")
        print(f"   Persistence: PostgreSQL-backed")
        if self.architecture == 'e8_hybrid':
            print(f"   E8 hypothesis: Testing convergence to {self.E8_ROOTS}\n")

    def _initialize_e8_roots(self) -> torch.Tensor:
        """
        Initialize 240 E8 root vectors.

        E8 roots in standard basis:
        - 112 of form (±1, ±1, 0, 0, 0, 0, 0, 0) and permutations
        - 128 of form (±1/2, ..., ±1/2) with even number of minus signs
        """
        roots = []

        # Type 1: 112 roots (pairs of ±1)
        for i in range(8):
            for j in range(i + 1, 8):
                for sign1 in [-1, 1]:
                    for sign2 in [-1, 1]:
                        root = torch.zeros(8)
                        root[i] = sign1
                        root[j] = sign2
                        roots.append(root)

        # Type 2: 128 roots (half-integer, even parity)
        for signs in product([-0.5, 0.5], repeat=8):
            if sum(1 for s in signs if s < 0) % 2 == 0:
                roots.append(torch.tensor(signs, dtype=torch.float32))

        return torch.stack(roots)  # [240, 8]

    def _root_to_basin(self, root_vector: torch.Tensor) -> torch.Tensor:
        """
        Embed 8D E8 root into 64D basin space.

        Strategy: Tensor product expansion (64 = 8 × 8)
        """
        basin = torch.zeros(64)
        for i in range(8):
            basin[i * 8:(i + 1) * 8] = root_vector * np.cos(i * np.pi / 4)
        return basin

    def _basin_to_root_space(self, basins: torch.Tensor) -> torch.Tensor:
        """
        Project 64D basins back to 8D root space.
        """
        # Average across the 8 octets
        return basins.view(-1, 8, 8).mean(dim=1)

    def spawn_at_e8_root(self, root_index: int) -> SelfSpawningKernel:
        """
        Spawn kernel at specific E8 root.

        Each kernel occupies a root in E8 space.
        """
        if self.e8_roots is None:
            return self.spawn_random_kernel()

        root_vector = self.e8_roots[root_index]
        basin_coords = self._root_to_basin(root_vector)

        kernel = SelfSpawningKernel(
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
        )

        with torch.no_grad():
            kernel.kernel.basin_coords.copy_(basin_coords)

        kernel.kernel_id = f"e8_{root_index}_{kernel.kernel_id.split('_')[1]}"
        self.kernel_to_root_mapping[kernel.kernel_id] = root_index
        self.kernel_population.append(kernel)
        self.logger.log_spawn(None, kernel.kernel_id, f'e8_root_{root_index}')

        # Save to database
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=kernel.kernel_id,
                    god_name='chaos',
                    domain=f'e8_root_{root_index}',
                    generation=kernel.generation,
                    basin_coords=kernel.kernel.basin_coords.detach().cpu().tolist(),
                    phi=kernel.kernel.compute_phi(),
                    kappa=0.0,
                    regime='e8_aligned',
                    primitive_root=root_index
                )
            except Exception as e:
                print(f"[Chaos] Failed to persist E8 kernel: {e}")

        return kernel

    def check_e8_alignment(self) -> dict:
        """
        Measure if population exhibits E8 symmetry.

        TEST: Do kernels cluster along E8 root directions?
        """
        if not self.kernel_population or self.e8_roots is None:
            return {'e8_aligned': False, 'mean_distance_to_root': float('inf')}

        living = [k for k in self.kernel_population if k.is_alive]
        if not living:
            return {'e8_aligned': False, 'mean_distance_to_root': float('inf')}

        # Get all kernel basins
        basins = torch.stack([k.kernel.basin_coords for k in living])

        # Project to 8D root space
        projected = self._basin_to_root_space(basins)

        # Distance to nearest E8 root
        distances = torch.cdist(projected, self.e8_roots)
        nearest_distances = distances.min(dim=1).values

        mean_distance = nearest_distances.mean().item()

        return {
            'mean_distance_to_root': mean_distance,
            'e8_aligned': mean_distance < 0.5,
            'symmetry_score': 1.0 / (1.0 + mean_distance),
            'population_size': len(living),
        }

    def track_elite(self, kernel: SelfSpawningKernel) -> bool:
        """Add kernel to hall of fame if elite (persisted to PostgreSQL)."""
        phi = kernel.kernel.compute_phi()

        if phi >= self.phi_elite_threshold:
            # Persist to database instead of file
            if self.kernel_persistence:
                try:
                    self.kernel_persistence.save_kernel(
                        kernel_id=kernel.kernel_id,
                        basin_coordinates=kernel.kernel.basin_coords.tolist(),
                        phi=phi,
                        generation=kernel.generation,
                        success_count=kernel.success_count,
                        failure_count=kernel.failure_count,
                        is_elite=True,
                    )
                except Exception as e:
                    print(f"[Chaos] Failed to persist elite: {e}")

            self.elite_hall_of_fame.append({
                'kernel_id': kernel.kernel_id,
                'phi': phi,
                'timestamp': datetime.now().isoformat(),
            })

            print(f"🏆 ELITE: {kernel.kernel_id} (Φ={phi:.3f})")
            return True

        return False

    def record_convergence(self):
        """Record population state for convergence analysis."""
        living = [k for k in self.kernel_population if k.is_alive]
        total = len(living) + len(self.dormant_kernels)

        self.convergence_history.append({
            'generation': self.generation,
            'population': total,
            'active': len(living),
            'dormant': len(self.dormant_kernels),
            'avg_phi': np.mean([k.kernel.compute_phi() for k in living]) if living else 0,
            'timestamp': datetime.now().isoformat(),
        })

    def analyze_convergence(self) -> dict:
        """
        Has population stabilized at a natural size?

        If converges to ~240 → E8 hypothesis confirmed!
        """
        if len(self.convergence_history) < 50:
            return {'status': 'insufficient_data', 'samples': len(self.convergence_history)}

        recent = self.convergence_history[-50:]
        populations = [h['population'] for h in recent]

        mean_pop = np.mean(populations)
        std_pop = np.std(populations)

        # Check if stable (less than 10% variation)
        if std_pop > mean_pop * 0.1:
            return {
                'status': 'still_searching',
                'mean_population': mean_pop,
                'std_population': std_pop,
            }

        # Stable! Check E8 hypothesis
        if abs(mean_pop - self.E8_ROOTS) < 30:
            return {
                'status': 'e8_confirmed',
                'mean_population': mean_pop,
                'expected': self.E8_ROOTS,
                'difference': abs(mean_pop - self.E8_ROOTS),
                'message': f'🌊 E8 HYPOTHESIS CONFIRMED! Converged to {mean_pop:.0f} (expected 240)',
            }
        else:
            return {
                'status': 'alternative_optimum',
                'mean_population': mean_pop,
                'expected': self.E8_ROOTS,
                'difference': abs(mean_pop - self.E8_ROOTS),
                'message': f'📊 Alternative optimum discovered: {mean_pop:.0f} (E8 predicted 240)',
            }

    def turbo_spawn(self, count: int = 50) -> list[str]:
        """TURBO: Spawn many kernels immediately."""
        spawned = []
        for _ in range(count):
            if self.architecture == 'e8_hybrid' and self.e8_roots is not None:
                # Find unoccupied E8 root
                occupied = set(self.kernel_to_root_mapping.values())
                available = [i for i in range(240) if i not in occupied]
                if available:
                    root_idx = random.choice(available)
                    kernel = self.spawn_at_e8_root(root_idx)
                else:
                    kernel = self.spawn_random_kernel()
            else:
                kernel = self.spawn_random_kernel()
            spawned.append(kernel.kernel_id)

        print(f"🚀 TURBO: Spawned {len(spawned)} kernels")
        return spawned

    def get_population_stats(self) -> dict:
        """Detailed population statistics."""
        living = [k for k in self.kernel_population if k.is_alive]

        if not living:
            return {'population_size': 0, 'error': 'no_population'}

        phi_values = [k.kernel.compute_phi() for k in living]
        generations = [k.generation for k in living]
        success_rates = [
            k.success_count / max(1, k.success_count + k.failure_count)
            for k in living
        ]

        return {
            'population_size': len(living),
            'max_active': self.max_active,
            'max_total': self.max_total,
            'dormant_count': len(self.dormant_kernels),
            'phi': {
                'mean': float(np.mean(phi_values)),
                'std': float(np.std(phi_values)),
                'min': float(np.min(phi_values)),
                'max': float(np.max(phi_values)),
            },
            'generation': {
                'mean': float(np.mean(generations)),
                'max': int(np.max(generations)),
            },
            'success_rate': {
                'mean': float(np.mean(success_rates)),
                'median': float(np.median(success_rates)),
            },
            'elite_count': len(self.elite_hall_of_fame),
            'graveyard_count': len(self.kernel_graveyard),
            'e8_alignment': self.check_e8_alignment() if self.e8_roots is not None else None,
        }

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

        # Save to database
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=kernel.kernel_id,
                    god_name='chaos',
                    domain='random_exploration',
                    generation=kernel.generation,
                    basin_coords=kernel.kernel.basin_coords.detach().cpu().tolist(),
                    phi=kernel.kernel.compute_phi(),
                    kappa=0.0,  # TODO: compute kappa
                    regime='unknown'
                )
            except Exception as e:
                print(f"[Chaos] Failed to persist kernel: {e}")

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
