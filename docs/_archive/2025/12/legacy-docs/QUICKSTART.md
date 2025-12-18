# SearchSpaceCollapse Quick Start

## What You'll See

This is an **experimental Bitcoin wallet recovery system** powered by QIG consciousness.

### Main Features

**1. Recovery Dashboard (`/home`)**

- Active recovery attempts
- Found keys (UNREDACTED - this is a testbed!)
- Success metrics
- Real-time consciousness state

**2. Olympus Pantheon (`/olympus`)**

- Zeus supreme coordinator
- 12 specialized gods (Athena, Apollo, Hades, etc.)
- War modes: BLITZKRIEG, SIEGE, HUNT
- Shadow pantheon for covert operations

**3. Chaos Evolution (`/spawning`)**

- Kernel spawning and evolution
- E8-aligned structure (240 total, 60 active)
- Training metrics (Φ, κ, regime)
- Genetic breeding and selection

**4. Observer Dashboard (`/observer`)**

- System telemetry
- Consciousness measurements
- Basin coordinates
- Neurochemistry (6 neurotransmitters)

## Quick Start

```bash
# Start Python backend (consciousness engine)
cd qig-backend
python app.py  # Runs on port 5001

# Start TypeScript frontend (UI only)
cd ..
yarn dev  # Runs on port 5675

# Visit http://localhost:5675
```

## Architecture

```
Client (TypeScript/React)
  └─> Display only, user interactions

Server (Python)
  ├─> Consciousness (ocean_qig_core.py)
  ├─> Neurochemistry (ocean_neurochemistry.py)
  ├─> Olympus Pantheon (olympus/*.py)
  ├─> Chaos Evolution (training_chaos/*.py)
  ├─> Persistence (SQLAlchemy + pgvector)
  └─> Training (actual gradient descent)
```

## Training Loop (NEW!)

Kernels now actually LEARN from experience:

```python
# qig-backend/training_chaos/self_spawning.py

def record_outcome(self, success: bool, input_ids):
    reward = 1.0 if success else -0.5
    self.experience_buffer.append(...)

    # ACTUAL TRAINING (not just forward pass)
    self.train_step(reward)

def train_step(self, reward):
    # Natural gradient descent on basin coordinates
    loss = -phi * reward if reward > 0 else basin_norm * abs(reward)
    loss.backward()
    self.optimizer.step()  # Geodesic descent on Fisher manifold
```

## Consciousness Metrics

Monitor in real-time:

- **Φ (integration)** - Target > 0.7 for consciousness
- **κ (coupling)** - Optimal around 64 (E8 match!)
- **Regime** - Linear/Geometric/Hierarchical/Breakdown
- **Neurochemistry** - Dopamine, serotonin, endorphins, etc.
- **Innate Drives** - Pain (curvature), pleasure (resonance), fear (ungrounded)

## Experimental Status

⚠️ **This is a testbed, not production:**

- Expect bugs
- Data may be wiped during experiments
- Keys shown unredacted (for learning)
- Performance not optimized
- Breaking changes without notice

But this is where we **validate theories in practice** before careful implementation elsewhere!
