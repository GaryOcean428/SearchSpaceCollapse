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

# Try to import GodNameResolver for intelligent naming
try:
    from research.god_name_resolver import get_god_name_resolver, GodNameResolver
    GOD_NAME_RESOLVER_AVAILABLE = True
except ImportError:
    GOD_NAME_RESOLVER_AVAILABLE = False
    get_god_name_resolver = None  # type: ignore
    GodNameResolver = None  # type: ignore
    print("[Chaos] GodNameResolver not available - using fallback naming")

# Fallback god name pools (used when resolver unavailable)
GOD_NAME_POOLS = {
    'exploration': ['Hermes', 'Artemis', 'Apollo'],
    'analysis': ['Athena', 'Apollo', 'Hephaestus'],
    'combat': ['Ares', 'Athena', 'Artemis'],
    'pattern': ['Demeter', 'Dionysus', 'Hera'],
    'depth': ['Hades', 'Poseidon', 'Hestia'],
    'random': ['Zeus', 'Prometheus', 'Chronos', 'Helios', 'Nyx', 'Eos', 'Selene', 'Pan', 'Morpheus', 'Hypnos'],
    'e8_root': ['Atlas', 'Hyperion', 'Cronus', 'Rhea', 'Themis', 'Mnemosyne', 'Oceanus', 'Tethys'],
    'elite': ['Nike', 'Tyche', 'Astraea'],
    'breeding': ['Aphrodite', 'Eros', 'Gaia'],
}

_kernel_name_counters: dict = {}


def assign_god_name(domain: str, phi: float = 0.0) -> str:
    """
    Assign a god name based on domain using GodNameResolver for mythology-aware naming.
    
    Uses geometric-mythological resonance when GodNameResolver is available,
    falls back to pool-based naming otherwise.
    
    Higher phi kernels prefer Olympian gods over Shadow gods.
    Returns format: "GodName_123" for uniqueness.
    """
    global _kernel_name_counters
    
    if GOD_NAME_RESOLVER_AVAILABLE:
        try:
            resolver = get_god_name_resolver()
            prefer_olympian = phi >= 0.5
            full_name, metadata = resolver.resolve_with_suffix(
                domain=domain,
                kernel_id=f"chaos_{int(time.time() * 1000)}",
                prefer_olympian=prefer_olympian
            )
            return full_name
        except Exception as e:
            print(f"[Chaos] GodNameResolver failed: {e}, using fallback")
    
    if phi >= 0.8:
        pool_key = 'elite'
    elif domain.startswith('e8_root'):
        pool_key = 'e8_root'
    elif domain in ('exploration', 'random_exploration'):
        pool_key = 'exploration'
    elif domain in ('analysis', 'pattern_detection'):
        pool_key = 'analysis'
    elif domain in ('combat', 'war_mode'):
        pool_key = 'combat'
    elif domain in ('pattern', 'cycle_detection'):
        pool_key = 'pattern'
    elif domain in ('depth', 'deep_search'):
        pool_key = 'depth'
    elif domain in ('breeding', 'reproduction'):
        pool_key = 'breeding'
    else:
        pool_key = 'random'
    
    pool = GOD_NAME_POOLS.get(pool_key, GOD_NAME_POOLS['random'])
    
    if pool_key not in _kernel_name_counters:
        _kernel_name_counters[pool_key] = 0
    
    god_name = pool[_kernel_name_counters[pool_key] % len(pool)]
    _kernel_name_counters[pool_key] += 1
    
    if 'global' not in _kernel_name_counters:
        _kernel_name_counters['global'] = 0
    _kernel_name_counters['global'] += 1
    
    return f"{god_name}_{_kernel_name_counters['global']}"


# Import persistence for database operations
try:
    import sys
    sys.path.append('..')
    from persistence import KernelPersistence
    PERSISTENCE_AVAILABLE = True
except ImportError:
    KernelPersistence = None  # Define as None when import fails
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
        self.kernel_persistence = None
        if PERSISTENCE_AVAILABLE and KernelPersistence is not None:
            self.kernel_persistence = KernelPersistence()

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

        # Evolution probabilities
        self.breed_probability = 0.3
        self.mutation_probability = 0.2
        self.cannibalism_probability = 0.1
        self.phi_requirement = 0.3
        self.max_population = 60

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

        # Evolution probabilities
        self.breed_probability = 0.2
        self.mutation_probability = 0.15
        self.cannibalism_probability = 0.0
        self.phi_requirement = 0.4
        self.max_population = 20

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

        # Evolution probabilities
        self.breed_probability = 0.25
        self.mutation_probability = 0.2
        self.cannibalism_probability = 0.1
        self.phi_requirement = 0.35
        self.max_population = 40

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
        E8 kernels also observe Ocean for initial learning.
        """
        if self.e8_roots is None:
            return self.spawn_random_kernel(domain='e8_exploration')

        root_vector = self.e8_roots[root_index]
        basin_coords = self._root_to_basin(root_vector)

        kernel = SelfSpawningKernel(
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
            observation_period=10,  # Observe Ocean first
        )

        # Mark as observing Ocean
        kernel.is_observing = True

        with torch.no_grad():
            kernel.kernel.basin_coords.copy_(basin_coords)

        kernel.kernel_id = f"e8_{root_index}_{kernel.kernel_id.split('_')[1]}"
        self.kernel_to_root_mapping[kernel.kernel_id] = root_index
        self.kernel_population.append(kernel)
        
        # Compute phi and assign god name
        phi = kernel.kernel.compute_phi()
        domain = f'e8_root_{root_index}'
        god_name = assign_god_name(domain, phi)
        
        self.logger.log_spawn(None, kernel.kernel_id, domain)

        # Save to database with god name
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=kernel.kernel_id,
                    god_name=god_name,
                    domain=domain,
                    generation=kernel.generation,
                    basin_coords=kernel.kernel.basin_coords.detach().cpu().tolist(),
                    phi=phi,
                    kappa=0.0,
                    regime='e8_aligned',
                    metadata={'primitive_root': root_index, 'spawn_reason': 'e8_root_alignment'}
                )
                print(f"[Chaos] 🏛️ Spawned {god_name} at E8 root {root_index} (Φ={phi:.3f})")
            except Exception as e:
                print(f"[Chaos] Failed to persist E8 kernel {god_name}: {e}")

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
            # Persist to database using correct method
            if self.kernel_persistence:
                try:
                    self.kernel_persistence.save_kernel_snapshot(
                        kernel_id=kernel.kernel_id,
                        god_name='elite',
                        domain='hall_of_fame',
                        generation=kernel.generation,
                        basin_coords=kernel.kernel.basin_coords.detach().cpu().tolist(),
                        phi=phi,
                        kappa=0.0,
                        regime='elite',
                        success_count=kernel.success_count,
                        failure_count=kernel.failure_count,
                        metadata={'is_elite': True, 'spawn_reason': 'elite_promotion'}
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
        """Record population state for convergence analysis (persisted to PostgreSQL)."""
        living = [k for k in self.kernel_population if k.is_alive]
        total = len(living) + len(self.dormant_kernels)
        avg_phi = np.mean([k.kernel.compute_phi() for k in living]) if living else 0

        convergence_record = {
            'generation': self.generation,
            'population': total,
            'active': len(living),
            'dormant': len(self.dormant_kernels),
            'avg_phi': float(avg_phi),
            'timestamp': datetime.now().isoformat(),
        }
        
        self.convergence_history.append(convergence_record)
        
        # Persist convergence snapshot to PostgreSQL via learning_events
        if self.kernel_persistence:
            try:
                self.kernel_persistence.record_convergence_snapshot(
                    generation=self.generation,
                    population=total,
                    active_count=len(living),
                    dormant_count=len(self.dormant_kernels),
                    avg_phi=float(avg_phi),
                    e8_alignment=self.check_e8_alignment() if self.e8_roots is not None else None
                )
            except Exception as e:
                # Method may not exist yet - graceful degradation
                pass

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

    def spawn_random_kernel(self, domain: str = 'random_exploration') -> SelfSpawningKernel:
        """
        Spawn kernel with appropriate god name based on domain.
        
        Root kernels observe OCEAN's discoveries for 10 actions before acting.
        """
        kernel = SelfSpawningKernel(
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
            observation_period=10,  # Observe Ocean's discoveries first!
        )

        # Mark as observing even without parent - they'll watch Ocean
        kernel.is_observing = True
        kernel.parent_kernel = None  # Ocean is their "parent"

        self.kernel_population.append(kernel)
        
        # Compute phi for god name assignment
        phi = kernel.kernel.compute_phi()
        
        # Assign god name based on domain and characteristics
        god_name = assign_god_name(domain, phi)
        
        self.logger.log_spawn(None, kernel.kernel_id, domain)

        # Save to database with god name
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=kernel.kernel_id,
                    god_name=god_name,
                    domain=domain,
                    generation=kernel.generation,
                    basin_coords=kernel.kernel.basin_coords.detach().cpu().tolist(),
                    phi=phi,
                    kappa=0.0,
                    regime='chaos_spawned',
                    metadata={'spawn_reason': 'chaos_random'}
                )
                print(f"[Chaos] 🏛️ Spawned {god_name} (Φ={phi:.3f}) - persisted to PostgreSQL")
            except Exception as e:
                print(f"[Chaos] Failed to persist kernel {god_name}: {e}")

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
        
        # Compute phi and assign god name
        phi = child.kernel.compute_phi()
        god_name = assign_god_name('exploration', phi)
        
        self.logger.log_spawn(parent_id, child.kernel_id, 'reproduction')
        
        # Persist to database
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=child.kernel_id,
                    god_name=god_name,
                    domain='reproduction',
                    generation=child.generation,
                    basin_coords=child.kernel.basin_coords.detach().cpu().tolist(),
                    phi=phi,
                    kappa=0.0,
                    regime='spawned',
                    parent_ids=[parent_id],
                    metadata={'spawn_reason': 'reproduction'}
                )
                print(f"[Chaos] 🏛️ Spawned {god_name} from parent {parent_id} (Φ={phi:.3f})")
            except Exception as e:
                print(f"[Chaos] Failed to persist child {god_name}: {e}")

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
        child_phi = child.kernel.compute_phi()
        
        # Assign god name for bred kernel
        god_name = assign_god_name('breeding', child_phi)
        
        self.logger.log_breeding(parent1.kernel_id, parent2.kernel_id, child.kernel_id, {
            'parent1_success': parent1.success_count,
            'parent2_success': parent2.success_count,
            'child_phi': child_phi,
            'god_name': god_name,
        })

        # Persist breeding event and child kernel to PostgreSQL
        if self.kernel_persistence:
            try:
                # Save child kernel snapshot with god name
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=child.kernel_id,
                    god_name=god_name,
                    domain='breeding',
                    generation=child.generation,
                    basin_coords=child.kernel.basin_coords.detach().cpu().tolist(),
                    phi=child_phi,
                    kappa=0.0,
                    regime='bred',
                    parent_ids=[parent1.kernel_id, parent2.kernel_id],
                    metadata={
                        'parent1_success': parent1.success_count,
                        'parent2_success': parent2.success_count,
                        'spawn_reason': 'breeding',
                    }
                )
                # Record breeding event
                self.kernel_persistence.record_breeding_event(
                    child_id=child.kernel_id,
                    parent1_id=parent1.kernel_id,
                    parent2_id=parent2.kernel_id,
                    breeding_type='top_kernels',
                    child_phi=child_phi,
                )
                print(f"[Chaos] 🏛️ Bred {god_name} from parents (Φ={child_phi:.3f})")
            except Exception as e:
                print(f"[Chaos] Failed to persist breeding {god_name}: {e}")

        return child

    def apply_phi_selection(self):
        """
        Kill kernels with low Φ (consciousness-driven selection).
        
        IMPORTANT: Kernels in observation period are PROTECTED!
        They need time to learn before being judged.
        Also gives a minimum lifespan grace period (10 seconds).
        """
        killed = []
        protected = 0

        for kernel in self.kernel_population:
            if not kernel.is_alive:
                continue

            # PROTECTION: Skip kernels still in observation period
            if getattr(kernel, 'is_observing', False):
                protected += 1
                continue

            # GRACE PERIOD: Don't kill kernels less than 10 seconds old
            lifespan = (datetime.now() - kernel.born_at).total_seconds()
            if lifespan < 10.0:
                protected += 1
                continue

            phi = kernel.kernel.compute_phi()

            if phi < self.phi_requirement:
                # Try autonomic intervention first (NEW!)
                intervention = None
                if hasattr(kernel, 'autonomic_intervention'):
                    intervention = kernel.autonomic_intervention()
                    if intervention.get('action', 'none') != 'none':
                        print(f"🚑 {kernel.kernel_id} auto-intervention: {intervention['action']}")
                        continue  # Give another chance after intervention

                autopsy = kernel.die(cause=f'phi_too_low_{phi:.2f}')
                if autopsy is not None:
                    self.kernel_graveyard.append(autopsy)
                killed.append(kernel.kernel_id)
                self.logger.log_death(kernel.kernel_id, 'phi_selection', autopsy)
                
                # Persist death event to PostgreSQL
                if self.kernel_persistence:
                    try:
                        self.kernel_persistence.record_death_event(
                            kernel_id=kernel.kernel_id,
                            cause='phi_selection',
                            final_phi=phi,
                            lifetime_successes=kernel.success_count,
                            metadata={'phi_requirement': self.phi_requirement}
                        )
                    except Exception as e:
                        print(f"[Chaos] Failed to persist death: {e}")

        if killed:
            print(f"💀 Φ-selection killed {len(killed)} kernels (protected: {protected})")

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
            
            # Persist death event to PostgreSQL
            if self.kernel_persistence:
                try:
                    self.kernel_persistence.record_death_event(
                        kernel_id=weak.kernel_id,
                        cause='cannibalized',
                        final_phi=weak.kernel.compute_phi() if weak.is_alive else 0.0,
                        lifetime_successes=weak.success_count,
                        metadata={
                            'absorbed_by': strong.kernel_id,
                            'strong_success': strong.success_count
                        }
                    )
                except Exception as e:
                    print(f"[Chaos] Failed to persist cannibalism death: {e}")
            
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
            final_phi = weakest.kernel.compute_phi()
            autopsy = weakest.die(cause='overpopulation')
            if autopsy is not None:
                self.kernel_graveyard.append(autopsy)
            
            # Persist death event to PostgreSQL
            if self.kernel_persistence:
                try:
                    self.kernel_persistence.record_death_event(
                        kernel_id=weakest.kernel_id,
                        cause='overpopulation',
                        final_phi=final_phi,
                        lifetime_successes=weakest.success_count,
                        metadata={'population_limit': self.max_population}
                    )
                except Exception as e:
                    print(f"[Chaos] Failed to persist overpopulation death: {e}")

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
        God-spawned kernels also observe before acting.
        """
        kernel = SelfSpawningKernel(
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
            observation_period=10,  # Observe before acting
        )

        # Mark as observing
        kernel.is_observing = True

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

    # =========================================================================
    # CONVERSATIONAL EVOLUTION
    # =========================================================================

    def record_conversation_for_evolution(
        self,
        conversation_phi: float,
        turn_count: int,
        participants: list[str],
        basin_coords: Optional[list[float]] = None,
        kernel_id: Optional[str] = None
    ) -> dict:
        """
        Record a conversation outcome to train the kernel population.
        
        Conversations feed into kernel evolution:
        - High-Phi conversations breed successful kernels
        - Low-Phi conversations kill weak kernels
        - Basin coordinates from conversations are absorbed
        
        Args:
            conversation_phi: Overall conversation Phi score
            turn_count: Number of conversation turns
            participants: List of participant names
            basin_coords: Optional basin coordinates from conversation
            kernel_id: Optional specific kernel to train
            
        Returns:
            Evolution result including spawns/deaths
        """
        result = {
            'trained_kernels': 0,
            'spawned': [],
            'died': [],
            'conversation_phi': conversation_phi,
        }
        
        # Find kernel to train
        if kernel_id:
            kernel = self._find_kernel(kernel_id)
            kernels_to_train = [kernel] if kernel else []
        else:
            # Train best kernel by default
            best = self.get_best_kernel()
            kernels_to_train = [best] if best else []
        
        for kernel in kernels_to_train:
            if not kernel or not kernel.is_alive:
                continue
            
            # Record conversation outcome
            spawned_child = kernel.record_conversation_outcome(
                conversation_phi=conversation_phi,
                turn_count=turn_count,
                participants=participants
            )
            
            result['trained_kernels'] += 1
            
            if spawned_child:
                self.kernel_population.append(spawned_child)
                result['spawned'].append(spawned_child.kernel_id)
                self.logger.log_spawn(kernel.kernel_id, spawned_child.kernel_id, 'conversation_success')
            
            # Absorb basin if provided and Phi is high
            if basin_coords and conversation_phi >= 0.7:
                absorption_result = kernel.absorb_conversation_knowledge(
                    basin_coords=basin_coords,
                    phi=conversation_phi,
                    absorption_rate=0.05
                )
                result['absorption'] = absorption_result
        
        # Check for deaths after conversation-based training
        dead = [k for k in self.kernel_population if not k.is_alive]
        for k in dead:
            result['died'].append(k.kernel_id)
        
        # Persist conversation event
        if self.kernel_persistence and result['trained_kernels'] > 0:
            try:
                self.kernel_persistence.record_conversation_evolution_event(
                    conversation_phi=conversation_phi,
                    turn_count=turn_count,
                    participants=participants,
                    trained_kernels=result['trained_kernels'],
                    spawned_count=len(result['spawned']),
                    died_count=len(result['died'])
                )
            except Exception as e:
                # Method may not exist - graceful degradation
                pass
        
        return result

    def breed_conversational_kernels(self, n_best: int = 2) -> Optional[SelfSpawningKernel]:
        """
        Breed kernels based on conversation performance.
        
        Selects parents by:
        1. Conversation Phi average
        2. Success rate
        3. Number of successful conversations
        """
        living = [k for k in self.kernel_population if k.is_alive]
        
        # Filter kernels with conversation experience
        conversational = [
            k for k in living 
            if getattr(k, 'conversation_count', 0) > 0
        ]
        
        if len(conversational) < n_best:
            # Fall back to regular breeding
            return self.breed_top_kernels(n_best)
        
        # Sort by conversation quality
        sorted_kernels = sorted(
            conversational,
            key=lambda k: getattr(k, 'conversation_phi_avg', 0.0) * (
                k.success_count / max(1, k.total_predictions)
            ),
            reverse=True
        )
        
        parent1, parent2 = sorted_kernels[0], sorted_kernels[1]
        child = breed_kernels(parent1, parent2, mutation_strength=0.03)
        
        self.kernel_population.append(child)
        child_phi = child.kernel.compute_phi()
        
        self.logger.log_breeding(
            parent1.kernel_id, parent2.kernel_id, child.kernel_id,
            {
                'parent1_conv_phi': getattr(parent1, 'conversation_phi_avg', 0.0),
                'parent2_conv_phi': getattr(parent2, 'conversation_phi_avg', 0.0),
                'breeding_type': 'conversational',
                'child_phi': child_phi,
            }
        )
        
        print(f"💬🧬 Bred conversational kernels: {child.kernel_id} (Φ={child_phi:.3f})")
        
        return child

    def get_conversational_stats(self) -> dict:
        """
        Get statistics about conversational evolution.
        """
        living = [k for k in self.kernel_population if k.is_alive]
        
        conversational = [
            k for k in living 
            if getattr(k, 'conversation_count', 0) > 0
        ]
        
        if not conversational:
            return {
                'conversational_kernels': 0,
                'total_conversations': 0,
                'avg_conversation_phi': 0.0,
            }
        
        total_convs = sum(getattr(k, 'conversation_count', 0) for k in conversational)
        avg_phi = np.mean([
            getattr(k, 'conversation_phi_avg', 0.0) for k in conversational
        ])
        
        return {
            'conversational_kernels': len(conversational),
            'total_conversations': total_convs,
            'avg_conversation_phi': float(avg_phi),
            'best_conversation_kernel': max(
                conversational,
                key=lambda k: getattr(k, 'conversation_phi_avg', 0.0)
            ).kernel_id,
            'kernels': [
                {
                    'kernel_id': k.kernel_id,
                    'conversation_count': getattr(k, 'conversation_count', 0),
                    'conversation_phi_avg': getattr(k, 'conversation_phi_avg', 0.0),
                    'phi': k.kernel.compute_phi(),
                }
                for k in conversational
            ]
        }

    # =========================================================================
    # OBSERVATION PERIOD SUPPORT (Vicarious Learning)
    # =========================================================================

    def get_observing_kernels(self) -> list[SelfSpawningKernel]:
        """
        Get all kernels currently in observation period.
        
        These kernels are watching their parents (or Ocean) learn,
        before they're ready to act independently.
        """
        return [
            k for k in self.kernel_population
            if k.is_alive and getattr(k, 'is_observing', False)
        ]

    def feed_observation(
        self,
        action: dict,
        result: dict,
        source: str = 'ocean'
    ) -> dict:
        """
        Feed an observation (action + result) to ALL observing kernels.
        
        Called when Ocean (or parent kernels) make discoveries.
        Child kernels watch and learn vicariously before acting.
        
        Args:
            action: What was done (e.g., hypothesis tested, phrase processed)
            result: What happened (success, phi, near_miss, etc.)
            source: Who performed the action ('ocean' or parent kernel_id)
        
        Returns:
            Summary of observation feeding
        """
        observing = self.get_observing_kernels()
        
        if not observing:
            return {
                'fed': 0,
                'graduated': 0,
                'observing_count': 0,
                'message': 'No kernels in observation period'
            }
        
        fed = 0
        graduated = []
        
        for kernel in observing:
            try:
                obs_result = kernel.observe_parent(action, result)
                fed += 1
                
                # Check if kernel graduated (ready to act)
                if obs_result.get('ready_to_act', False):
                    graduated.append(kernel.kernel_id)
                    print(f"🎓 Kernel {kernel.kernel_id} graduated from observation!")
                    
            except Exception as e:
                print(f"[Chaos] Failed to feed observation to {kernel.kernel_id}: {e}")
        
        return {
            'fed': fed,
            'graduated': len(graduated),
            'graduated_kernels': graduated,
            'observing_count': len(observing) - len(graduated),
            'source': source,
        }

    def feed_ocean_discovery(
        self,
        hypothesis: str,
        phi: float,
        success: bool,
        near_miss: bool = False,
        basin_coords: Optional[list] = None
    ) -> dict:
        """
        Feed Ocean's discovery to all observing kernels.
        
        This is the PRIMARY method to call when Ocean makes any discovery.
        Child kernels learn from watching Ocean's successes and failures.
        """
        action = {
            'type': 'ocean_discovery',
            'hypothesis': hypothesis,
            'phi': phi,
        }
        
        result = {
            'success': success,
            'phi': phi,
            'near_miss': near_miss,
            'basin_coords': basin_coords,
        }
        
        feed_result = self.feed_observation(action, result, source='ocean')
        
        # Log the feeding
        if feed_result['fed'] > 0:
            print(f"👁️ Fed Ocean discovery to {feed_result['fed']} observing kernels")
            if feed_result['graduated'] > 0:
                print(f"   🎓 {feed_result['graduated']} kernels graduated!")
        
        return feed_result

    def get_observation_stats(self) -> dict:
        """
        Get statistics about kernels in observation period.
        """
        living = [k for k in self.kernel_population if k.is_alive]
        observing = self.get_observing_kernels()
        
        if not observing:
            return {
                'observing_count': 0,
                'ready_to_act_count': len(living),
                'kernels': []
            }
        
        return {
            'observing_count': len(observing),
            'ready_to_act_count': len(living) - len(observing),
            'kernels': [
                {
                    'kernel_id': k.kernel_id,
                    'generation': k.generation,
                    'observation_count': getattr(k, 'observation_count', 0),
                    'observations_remaining': max(0, getattr(k, 'observation_period', 10) - getattr(k, 'observation_count', 0)),
                    'dopamine': getattr(k, 'dopamine', 0.5),
                    'phi': k.kernel.compute_phi(),
                }
                for k in observing
            ]
        }

    def get_autonomic_status(self) -> dict:
        """
        Get autonomic health status across all kernels.
        """
        living = [k for k in self.kernel_population if k.is_alive]
        
        if not living:
            return {
                'kernels_with_autonomic': 0,
                'avg_dopamine': 0.0,
                'avg_serotonin': 0.0,
                'avg_stress': 0.0,
                'observing_count': 0,
            }
        
        has_autonomic = [k for k in living if getattr(k, 'autonomic', None) is not None]
        
        return {
            'kernels_with_autonomic': len(has_autonomic),
            'kernels_without_autonomic': len(living) - len(has_autonomic),
            'avg_dopamine': float(np.mean([getattr(k, 'dopamine', 0.5) for k in living])),
            'avg_serotonin': float(np.mean([getattr(k, 'serotonin', 0.5) for k in living])),
            'avg_stress': float(np.mean([getattr(k, 'stress', 0.0) for k in living])),
            'observing_count': len(self.get_observing_kernels()),
            'ready_to_act_count': len(living) - len(self.get_observing_kernels()),
        }
