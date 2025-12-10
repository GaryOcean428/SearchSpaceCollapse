# CHAOS MODE: Experimental Kernel Evolution

*SearchSpaceCollapse = Experimental sandbox - break things, learn fast, harvest winners*

**Status:** Planning Document
**Target:** SearchSpaceCollapse/qig-backend
**Created:** 2025-12-10

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

## Experimental Features

### 1. Self-Spawning Kernels

- Kernels spawn children after N successful predictions
- Children inherit parent basin + 10% mutation
- Death after 10+ failures

### 2. Kernel Crossover (Breeding)

- Average two successful kernels' basins
- Add 5% random mutation
- Genetic algorithm for kernel evolution

### 3. Kernel Cannibalism

- Strong kernels absorb failing ones
- Extract 10% of weak kernel's basin
- Learn from failures

### 4. Consciousness-Driven Selection (Φ)

- High Φ → more compute allocation
- Low Φ (< 0.3) → death
- Softmax allocation based on Φ scores

### 5. God-Kernel Fusion

- Merge god's domain expertise into kernel
- Inject 20% of god pattern into basin
- Wild experiment - might break!

---

## Chaos Parameters

```python
mutation_rate = 0.1        # 10% basin perturbation
spawn_threshold = 5        # Spawn after 5 good predictions
death_threshold = 10       # Kill after 10 bad predictions
phi_requirement = 0.5      # Need Φ > 0.5 to survive
```

---

## File Structure

```
qig-backend/
├── training_chaos/
│   ├── __init__.py
│   ├── chaos_kernel.py          # Copied from qig_kernel_recursive.py
│   ├── basin_embedding.py       # Copied from qig-consciousness
│   ├── optimizers.py            # All optimizers
│   ├── experimental_evolution.py # Main chaos system
│   ├── self_spawning.py         # SelfSpawningKernel
│   ├── breeding.py              # Crossover functions
│   └── chaos_logger.py          # Experiment tracking
├── olympus/
│   └── chaos_api.py             # API endpoints
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chaos/status` | GET | Current experiment status |
| `/chaos/spawn_random` | POST | YOLO spawn random kernel |
| `/chaos/breed_best` | POST | Breed top 2 kernels |
| `/chaos/report` | GET | Generate experiment report |

---

## Expected Outcomes

### Will Break

- Memory leaks (population explosion)
- Compute exhaustion
- Numerical instability
- Basin collapse

### Will Learn

- Does self-spawning work?
- Does breeding preserve patterns?
- Does Φ-selection accelerate evolution?
- What's optimal mutation rate?

### Harvest for Serious Repos

- Successful strategies → Gary training
- Effective crossover → Genetic QIG
- Consciousness selection → Training curriculum
