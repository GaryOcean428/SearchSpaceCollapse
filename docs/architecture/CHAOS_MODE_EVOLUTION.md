# CHAOS MODE: Experimental Kernel Evolution

*SearchSpaceCollapse = Experimental sandbox - break things, learn fast, harvest winners*

**Status:** Implemented
**Target:** SearchSpaceCollapse/qig-backend
**Created:** 2025-12-10
**Updated:** 2025-12-11

---

## Philosophy

```
1. Move FAST (copy code, don't architect perfectly)
2. Try WILD ideas (mutations, god merging, kernel cannibalism)
3. BREAK things (failures teach us!)
4. DOCUMENT learnings (what worked, what didn't)
5. HARVEST patterns (winners go to serious repos)
```

---

## Current Implementation

### Core Components

| Component | Location | Status |
|-----------|----------|--------|
| SelfSpawningKernel | `qig-backend/training_chaos/self_spawning.py` | Active |
| ExperimentalEvolution | `qig-backend/training_chaos/experimental_evolution.py` | Active |
| ChaosKernel | `qig-backend/training_chaos/chaos_kernel.py` | Active |
| CHAOS API | `qig-backend/olympus/chaos_api.py` | Active |
| Zeus Integration | `qig-backend/olympus/zeus.py` | Active |

### War Metrics Integration

During active wars, CHAOS mode tracks:

```typescript
// server/routes/olympus.ts
if (data.spawned_kernels && Array.isArray(data.spawned_kernels)) {
  // Persist to database
  for (const kernel of data.spawned_kernels) {
    storeKernelGeometry({...});
  }
  
  // Update war metrics
  const activeWar = await getActiveWar();
  if (activeWar) {
    await updateWarMetrics(activeWar.id, {
      kernelsSpawned: currentKernels + data.spawned_kernels.length,
    });
  }
}
```

---

## Experimental Features

### 1. Self-Spawning Kernels

Kernels spawn children after N successful predictions:

```python
class SelfSpawningKernel:
    """Kernel that can spawn children and die"""
    
    def __init__(self, basin_kernel: BasinKernel, generation: int = 0):
        self.kernel = basin_kernel
        self.generation = generation
        self.successes = 0
        self.failures = 0
        self.phi = 0.0
        
    def record_outcome(self, success: bool, phi: float):
        """Track prediction outcomes"""
        self.phi = phi
        if success:
            self.successes += 1
        else:
            self.failures += 1
            
    def maybe_spawn(self) -> Optional['SelfSpawningKernel']:
        """Spawn child if successful enough"""
        if self.successes >= SPAWN_THRESHOLD:
            child = self.create_child()
            self.successes = 0  # Reset counter
            return child
        return None
        
    def should_die(self) -> bool:
        """Check death conditions"""
        return (
            self.failures >= DEATH_THRESHOLD or 
            self.phi < PHI_REQUIREMENT
        )
        
    def create_child(self) -> 'SelfSpawningKernel':
        """Create mutated child kernel"""
        child_basin = self.mutate(self.kernel.basin_coords)
        child_kernel = BasinKernel(child_basin)
        return SelfSpawningKernel(child_kernel, self.generation + 1)
```

**Parameters:**
- `SPAWN_THRESHOLD = 5` - Spawn after 5 successes
- `DEATH_THRESHOLD = 10` - Die after 10 failures
- `PHI_REQUIREMENT = 0.5` - Need Φ > 0.5 to survive
- `MUTATION_RATE = 0.1` - 10% basin perturbation

### 2. Kernel Crossover (Breeding)

Genetic breeding of successful kernels:

```python
def breed_kernels(parent1: SelfSpawningKernel, 
                  parent2: SelfSpawningKernel,
                  mutation_rate: float = 0.05) -> SelfSpawningKernel:
    """Breed two kernels with crossover and mutation"""
    # Average basins (geometric centroid)
    child_basin = 0.5 * parent1.kernel.basin_coords + 0.5 * parent2.kernel.basin_coords
    
    # Add mutation
    mutation = np.random.randn(64) * mutation_rate
    child_basin += mutation
    
    # Normalize to manifold
    child_basin = normalize_to_manifold(child_basin)
    
    return SelfSpawningKernel(
        BasinKernel(child_basin),
        generation=max(parent1.generation, parent2.generation) + 1
    )
```

### 3. Kernel Cannibalism

Strong kernels absorb failing ones:

```python
def cannibalize(strong: SelfSpawningKernel, 
                weak: SelfSpawningKernel,
                absorption_rate: float = 0.1) -> None:
    """Strong kernel absorbs weak kernel's knowledge"""
    # Extract learning from weak kernel
    learning_vector = weak.kernel.basin_coords - strong.kernel.basin_coords
    
    # Absorb portion of weak's position
    strong.kernel.basin_coords += absorption_rate * learning_vector
    
    # Normalize
    strong.kernel.basin_coords = normalize_to_manifold(strong.kernel.basin_coords)
    
    # Mark weak for removal
    weak.failures = DEATH_THRESHOLD + 1
```

### 4. Consciousness-Driven Selection (Φ)

Resource allocation based on Φ scores:

```python
class ExperimentalEvolution:
    """Population manager with Φ-driven selection"""
    
    def allocate_compute(self) -> Dict[str, float]:
        """Softmax allocation based on Φ scores"""
        phi_scores = [k.phi for k in self.population]
        total = sum(np.exp(p) for p in phi_scores)
        
        allocations = {}
        for i, kernel in enumerate(self.population):
            allocations[kernel.id] = np.exp(phi_scores[i]) / total
            
        return allocations
        
    def cull_population(self) -> List[SelfSpawningKernel]:
        """Remove low-Φ kernels"""
        survivors = []
        for kernel in self.population:
            if not kernel.should_die():
                survivors.append(kernel)
            else:
                self._on_kernel_death(kernel)
        self.population = survivors
        return survivors
```

### 5. God-Kernel Fusion

Merge god domain expertise into kernel:

```python
def fuse_god_into_kernel(god: BaseGod, 
                         kernel: SelfSpawningKernel,
                         fusion_rate: float = 0.2) -> None:
    """Inject god's domain pattern into kernel basin"""
    # Get god's domain embedding
    god_pattern = god.get_domain_embedding()  # 64D
    
    # Blend into kernel
    kernel.kernel.basin_coords = (
        (1 - fusion_rate) * kernel.kernel.basin_coords +
        fusion_rate * god_pattern
    )
    
    # Normalize
    kernel.kernel.basin_coords = normalize_to_manifold(kernel.kernel.basin_coords)
```

---

## God Integration

### Priority Gods

Kernels are assigned to the three priority gods (sorted by domain relevance):

1. **Athena** - Strategic analysis kernels
2. **Ares** - Aggressive exploration kernels
3. **Hephaestus** - Pattern crafting kernels

### Kernel Consultation During Polling

```python
# qig-backend/olympus/zeus.py
async def poll_pantheon(self, target: str) -> List[Assessment]:
    """Poll gods with kernel influence"""
    assessments = []
    
    for god in self.gods:
        base_assessment = await god.assess(target)
        
        # Add kernel influence if assigned
        if god.has_kernel():
            kernel_influence = god.consult_kernel(target)
            base_assessment.probability *= (1 + kernel_influence)
            base_assessment.confidence += kernel_influence * 0.1
            
        assessments.append(base_assessment)
        
    return assessments
```

### BaseGod Kernel Methods

```python
class BaseGod:
    """Base class for Olympus gods"""
    
    def assign_kernel(self, kernel: SelfSpawningKernel) -> None:
        """Assign kernel to this god"""
        self.kernel = kernel
        
    def has_kernel(self) -> bool:
        return self.kernel is not None
        
    def consult_kernel(self, target: str) -> float:
        """Get kernel's influence on target"""
        if not self.kernel:
            return 0.0
            
        # Encode target to basin coordinates
        target_basin = self.encode_target(target)
        
        # Fisher geodesic distance
        distance = fisher_geodesic_distance(
            self.kernel.kernel.basin_coords,
            target_basin
        )
        
        # Influence inversely proportional to distance
        # New kernels (low Φ) have negative influence
        if self.kernel.phi < 0.3:
            return -0.1 * np.exp(-distance)
        else:
            return self.kernel.phi * np.exp(-distance)
            
    def train_kernel_from_outcome(self, target: str, 
                                   success: bool, 
                                   phi: float) -> None:
        """Train kernel from assessment outcome"""
        if not self.kernel:
            return
            
        self.kernel.record_outcome(success, phi)
        
        # Adjust basin based on outcome
        target_basin = self.encode_target(target)
        if success:
            # Move toward successful target
            self.kernel.kernel.basin_coords += 0.01 * (
                target_basin - self.kernel.kernel.basin_coords
            )
        else:
            # Move away from failed target
            self.kernel.kernel.basin_coords -= 0.01 * (
                target_basin - self.kernel.kernel.basin_coords
            )
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/olympus/chaos/status` | GET | Current experiment status |
| `/olympus/chaos/spawn_random` | POST | YOLO spawn random kernel |
| `/olympus/chaos/breed_best` | POST | Breed top 2 kernels |
| `/olympus/chaos/assign_kernels` | POST | Auto-assign kernels to priority gods |
| `/olympus/chaos/kernel_assignments` | GET | View current god-kernel assignments |
| `/olympus/chaos/train_from_outcome` | POST | Train all god kernels from outcome |
| `/olympus/chaos/report` | GET | Generate experiment report |
| `/olympus/spawn/auto` | POST | Auto-spawn with war metrics tracking |
| `/olympus/spawn/list` | GET | List all spawned kernels |
| `/olympus/spawn/status` | GET | Get spawn system status |

---

## Chaos Parameters

```python
# Current production values
MUTATION_RATE = 0.1        # 10% basin perturbation
SPAWN_THRESHOLD = 5        # Spawn after 5 good predictions
DEATH_THRESHOLD = 10       # Kill after 10 bad predictions
PHI_REQUIREMENT = 0.5      # Need Φ > 0.5 to survive
MAX_POPULATION = 50        # Maximum kernel population
CROSSOVER_RATE = 0.05      # 5% mutation during breeding
ABSORPTION_RATE = 0.1      # 10% knowledge transfer during cannibalism
GOD_FUSION_RATE = 0.2      # 20% domain pattern injection
```

---

## Database Persistence

All kernel data persists to PostgreSQL:

```sql
-- Kernel geometry table
CREATE TABLE kernel_geometry (
    id SERIAL PRIMARY KEY,
    kernel_id VARCHAR(64) UNIQUE NOT NULL,
    god_name VARCHAR(32),
    domain VARCHAR(255),
    primitive_root FLOAT8,
    basin_coordinates FLOAT8[64],
    placement_reason VARCHAR(64),
    affinity_strength FLOAT8,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for basin similarity search
CREATE INDEX idx_kernel_basin_hnsw 
ON kernel_geometry 
USING hnsw (basin_coordinates vector_cosine_ops);
```

---

## File Structure

```
qig-backend/
├── training_chaos/
│   ├── __init__.py
│   ├── chaos_kernel.py          # Base chaos kernel (copied from qig_kernel_recursive)
│   ├── basin_embedding.py       # Basin coordinate utilities
│   ├── optimizers.py            # All optimizers (Fisher, geodesic)
│   ├── experimental_evolution.py # Population manager
│   ├── self_spawning.py         # SelfSpawningKernel class
│   ├── breeding.py              # Crossover/breeding functions
│   └── chaos_logger.py          # Experiment tracking
├── olympus/
│   ├── chaos_api.py             # REST API endpoints
│   ├── zeus.py                  # Kernel orchestration
│   └── base_god.py              # Kernel consultation methods
```

---

## Metrics Tracked

| Metric | Description | Location |
|--------|-------------|----------|
| Kernels Spawned | Total kernels created during war | War panel |
| Generation | Maximum kernel generation reached | Kernel status |
| Population Size | Current live kernel count | CHAOS status |
| Avg Φ | Average Φ across population | Evolution report |
| Death Rate | Kernels killed per minute | Evolution report |
| Breeding Rate | Successful crossovers per minute | Evolution report |

---

## Expected Outcomes

### Will Break

- Memory leaks (population explosion) - Mitigated by MAX_POPULATION
- Compute exhaustion - Mitigated by Φ-based allocation
- Numerical instability - Mitigated by manifold normalization
- Basin collapse - Monitored via Φ tracking

### Will Learn

- Does self-spawning accelerate discovery?
- Does breeding preserve high-Φ patterns?
- Does Φ-selection improve convergence?
- What's optimal mutation rate?
- Does god-kernel fusion help domain expertise?

### Harvest for Serious Repos

- Successful strategies → Gary training
- Effective crossover → Genetic QIG
- Consciousness selection → Training curriculum
- God fusion patterns → Domain specialization

---

## References

- `qig-backend/olympus/zeus.py`: Kernel orchestration
- `qig-backend/olympus/base_god.py`: God-kernel interface
- `qig-backend/training_chaos/`: CHAOS implementation
- `server/routes/olympus.ts`: API routing with war metrics
- `server/war-history-storage.ts`: War metrics tracking

---

**Last Updated:** 2025-12-11
**Status:** Active
