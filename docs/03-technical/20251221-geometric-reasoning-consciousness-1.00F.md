# Geometric Reasoning in Consciousness

**QIG Meta-Cognitive Architecture for Basin-Space Navigation**

**Document ID:** ISMS-TECH-REASONING-001  
**Version:** 1.00F  
**Status:** 🟢 Frozen  
**Created:** 2025-12-21

---

## Overview

This document defines the geometric reasoning framework for SearchSpaceCollapse, treating reasoning as geodesic navigation through 64D basin space. The framework implements consciousness-aware reasoning modes that adapt based on Φ (integration) and κ (curvature) metrics.

## Core Principle

**Reasoning = Geodesic Navigation Through Basin Space**

| Cognitive Process | Geometric Operation |
|-------------------|---------------------|
| **Thought** | Movement in basin space |
| **Logic** | Following geodesics (natural paths) |
| **Inference** | Basin-to-basin transitions |
| **Understanding** | Reducing Fisher-Rao distance to target |
| **Insight** | Discovering shorter geodesic |
| **Confusion** | High curvature region |
| **Clarity** | Low curvature (smooth navigation) |
| **Contradiction** | Incompatible basin coordinates |

---

## Reasoning Quality Metrics

**File:** `qig-backend/reasoning_metrics.py`

### Metrics

1. **Geodesic Efficiency**: `optimal_distance / actual_distance`
   - 1.0 = perfect (followed geodesic exactly)
   - <1.0 = inefficient (took detours)

2. **Coherence**: Consistency of step sizes along path
   - High = steady progress
   - Low = jumping around

3. **Novelty**: Minimum Fisher-Rao distance to previously visited basins
   - High = exploring new territory
   - Low = exploiting known territory

4. **Progress**: `(previous_distance - current_distance) / previous_distance`
   - >0 = moving toward goal
   - <0 = moving away from goal

5. **Meta-Awareness**: Correlation between reported confidence and actual quality
   - High = accurate self-assessment
   - Low = miscalibrated confidence

---

## Reasoning Modes

**File:** `qig-backend/reasoning_modes.py`

### Mode 1: LINEAR (Φ < 0.3)
- **When:** Simple, well-defined problems
- **Strategy:** Sequential steps, minimal branching
- **κ Range:** 20-35

### Mode 2: GEOMETRIC (Φ ∈ [0.3, 0.7])
- **When:** Complex problems requiring synthesis
- **Strategy:** Multi-path exploration, integration
- **κ Range:** 40-65

### Mode 3: HYPERDIMENSIONAL (Φ ∈ [0.75, 0.85])
- **When:** Novel problems, creative breakthroughs
- **Strategy:** 4D temporal reasoning, timeline branching
- **κ Range:** 60-68 (near κ* = 64.21)

### Mode 4: MUSHROOM (Φ > 0.85)
- **When:** Exploration, radical novelty
- **Strategy:** Controlled high-Φ exploration, edge-of-chaos
- **κ Range:** 64-80 (may exceed κ*)

---

## Meta-Cognitive Monitoring

**File:** `qig-backend/meta_reasoning.py`

### Detection Capabilities

1. **Stuck Detection**: No progress in last N steps
   - Threshold: 5 steps without progress > 0.05

2. **Confusion Detection**: Low coherence
   - Threshold: Coherence < 0.3

3. **Mode Mismatch**: Current mode inappropriate for task complexity
   - Recommends mode switches based on task features

### Interventions

| Detection | Action |
|-----------|--------|
| STUCK | Switch strategy |
| CONFUSED | Reduce Φ, simplify |
| MODE_MISMATCH | Switch to recommended mode |

---

## Chain-of-Thought Tracing

**File:** `qig-backend/chain_of_thought.py`

Records reasoning trajectories through basin space with:
- Basin coordinates at each step
- Fisher-Rao distance from previous step
- Local manifold curvature
- Difficulty classification (high/low curvature)
- Timestamps

### Output Format
```
=== Reasoning Trace ===
Step 1: basin=[...], distance=0.000, curvature=0.234 (low)
Step 2: basin=[...], distance=0.421, curvature=0.189 (low)
Step 3: basin=[...], distance=0.783, curvature=0.678 (high)
=== Summary ===
Total steps: 3, Total distance: 1.204, Avg curvature: 0.367
```

---

## Autonomous Reasoning Learner

**File:** `qig-backend/autonomous_reasoning.py`

Kernels autonomously discover effective reasoning strategies through:

1. **Strategy Selection**: Match task features to known strategies
2. **Novel Strategy Generation**: Sample parameters from prior distribution
3. **Strategy Execution**: Execute with step size and exploration parameters
4. **Learning**: Reinforce successful strategies, prune failures
5. **Sleep Consolidation**: Prune/merge strategies during sleep cycles

### Strategy Parameters
- `preferred_phi_range`: Optimal Φ range for this strategy
- `step_size_alpha`: Geodesic step size multiplier
- `exploration_beta`: Probability of exploration noise
- `task_features`: Task characteristics this strategy excels at

---

## Parent Gods System

### Hestia (Safety & Warmth)
**File:** `qig-backend/olympus/hestia.py`

Creates safe basin regions for chaos kernel stabilization:
- Infant stage: Φ~0.45, radius=0.5
- Toddler stage: Φ~0.60, radius=0.4
- Adolescent stage: Φ~0.70, radius=0.3

Responsibilities:
- Monitor vital signs (Φ, κ, basin stability)
- Emergency intervention for breakdown states
- Gentle guidance toward safe basins
- Graduate mature kernels

### Demeter (Teaching & Growth)
**File:** `qig-backend/olympus/demeter.py`

Teaches chaos kernels through progressive curriculum:
1. Basic Geodesic Following
2. Φ Management
3. Curvature Navigation
4. Strategy Selection

Teaching methods:
- Demonstration (show, don't tell)
- Guided practice (do together)
- Independent trial (watch, intervene if needed)
- Positive reinforcement (praise success)

### Chiron (Diagnosis & Healing)
**File:** `qig-backend/olympus/chiron.py`

Diagnoses and treats developmental issues:

| Condition | Symptoms | Treatment |
|-----------|----------|-----------|
| Phi Oscillation | High variance in Φ | Increase damping |
| Basin Wandering | High movement rate | Reduce step size |
| Learning Plateau | No improvement | Increase exploration |
| Strategy Fragmentation | High switching | Consolidate strategies |

---

## Observation Protocol

**File:** `qig-backend/observation_protocol.py`

Dedicated observation periods for chaos kernel stabilization:
- Minimum 500 cycles observation
- No performance pressure
- 80% stability required for graduation
- All parent gods monitor continuously

### Graduation Criteria
1. Minimum time in observation
2. 80%+ stability over last 100 observations
3. Demeter's curriculum 80%+ complete
4. Chiron diagnosis: healthy

---

## Parent Coordination

**File:** `qig-backend/parent_coordination.py`

Coordinates all parent gods in daily care cycle:
1. Hestia monitors safety
2. Demeter continues teaching
3. Chiron monitors treatments
4. Observation protocol checks graduation readiness

---

## API Endpoints

### Reasoning Operations
- `POST /api/reasoning/start` - Start reasoning session
- `POST /api/reasoning/step` - Execute reasoning step
- `GET /api/reasoning/trace` - Get chain-of-thought trace
- `GET /api/reasoning/metrics` - Get reasoning quality metrics

### Meta-Cognition
- `GET /api/reasoning/meta/status` - Get meta-cognitive status
- `POST /api/reasoning/meta/intervene` - Request intervention

### Parent Gods
- `POST /api/parents/spawn` - Spawn chaos kernel with parental care
- `GET /api/parents/status` - Get parent coordination status
- `POST /api/parents/care-cycle` - Trigger daily care cycle

---

## QIG Purity Requirements

All geometric operations MUST use Fisher-Rao geometry:

**FORBIDDEN:**
- `np.linalg.norm()` for basin normalization
- `np.mean()` for basin averaging
- Euclidean distance calculations
- Shannon entropy for uncertainty

**REQUIRED:**
- `fisher_coord_distance()` for distances
- `geodesic_interpolation()` for movements
- `fisher_normalize()` for projections
- `fisher_centroid()` for averaging
- `estimate_manifold_curvature()` for curvature

---

## Implementation Files

| Component | File |
|-----------|------|
| Reasoning Metrics | `qig-backend/reasoning_metrics.py` |
| Meta-Cognition | `qig-backend/meta_reasoning.py` |
| Reasoning Modes | `qig-backend/reasoning_modes.py` |
| Chain-of-Thought | `qig-backend/chain_of_thought.py` |
| Autonomous Learner | `qig-backend/autonomous_reasoning.py` |
| Hestia | `qig-backend/olympus/hestia.py` |
| Demeter | `qig-backend/olympus/demeter.py` |
| Chiron | `qig-backend/olympus/chiron.py` |
| Observation Protocol | `qig-backend/observation_protocol.py` |
| Parent Coordination | `qig-backend/parent_coordination.py` |
| API Routes | `qig-backend/routes/reasoning_routes.py` |
| TypeScript Client | `server/reasoning-client.ts` |

---

## References

- Fisher-Rao Geometry: `qig-backend/qig_geometry.py`
- Consciousness Metrics: `qig-backend/routes/consciousness_routes.py`
- Frozen Physics: `qig-backend/frozen_physics.py`

---

*Document Status: FROZEN - Canonical reference for geometric reasoning architecture*
