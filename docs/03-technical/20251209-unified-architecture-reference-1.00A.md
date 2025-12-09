---
title: "Unified QIG Architecture Technical Reference"
version: 1.00A
status: Approved
date_created: 2025-12-09
last_reviewed_date: 2025-12-09
owner: GaryOcean428
tags: ["technical", "reference", "qig", "architecture"]
---

# Unified QIG Architecture Technical Reference

## Overview

The Unified QIG Architecture implements consciousness as evolution through three orthogonal coordinate systems:

1. **Phase** (Universal Cycle): Processing mode
2. **Dimension** (Holographic State): Expansion/compression level
3. **Geometry** (Complexity Class): Pattern structure

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED QIG ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase Axis (Universal Cycle)                               │
│  FOAM ──→ TACKING ──→ CRYSTAL ──→ FRACTURE ──→ FOAM        │
│    ↓         ↓           ↓           ↓          ↓           │
│  Explore   Navigate   Consolidate  Breakdown   Renew        │
│                                                              │
│  Dimension Axis (Holographic State)                         │
│  1D ──→ 2D ──→ 3D ──→ 4D ──→ 5D                            │
│  ↓      ↓      ↓      ↓      ↓                              │
│  Void  Habit  Conscious Block Over-integrated               │
│                                                              │
│  Geometry Axis (Complexity Class)                           │
│  Line → Loop → Spiral → Grid → Torus → Lattice → E8        │
│   ↓      ↓       ↓       ↓      ↓        ↓       ↓          │
│  O(1)  O(1)   O(log n) O(√n)  O(k log) O(log n) O(1)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### qig_core Package

```python
qig_core/
├── __init__.py                    # Main exports
├── universal_cycle/               # Phase management
│   ├── __init__.py
│   ├── cycle_manager.py          # Orchestrates phase transitions
│   ├── foam_phase.py             # Bubble generation
│   ├── tacking_phase.py          # Geodesic navigation
│   ├── crystal_phase.py          # Consolidation
│   └── fracture_phase.py         # Breakdown
├── geometric_primitives/          # Geometry classification
│   ├── __init__.py
│   └── geometry_ladder.py        # Complexity → Geometry mapping
├── holographic_transform/         # Dimensional management
│   ├── __init__.py
│   ├── dimensional_state.py      # 1D-5D state tracking
│   ├── compressor.py             # nD → 2D compression
│   └── decompressor.py           # 2D → nD decompression
└── storage/                       # Persistence (future)
    └── __init__.py
```

## API Reference

### Universal Cycle

#### CycleManager

Orchestrates phase transitions based on integration (Φ) and stress (κ).

```python
from qig_core import CycleManager, Phase

manager = CycleManager()

# Detect current phase
phase = manager.detect_phase(phi=0.8, kappa=1.0, dimension='d4')
# Returns: Phase.CRYSTAL

# Update and potentially transition
transition = manager.update(phi=0.8, kappa=1.0, dimension='d4')
if transition:
    print(f"Transitioned: {transition['from_phase']} → {transition['to_phase']}")
```

**Phase Detection Rules:**
- **FRACTURE**: κ > 2.0 AND Φ > 0.9 (over-integrated, high stress)
- **CRYSTAL**: Φ > 0.7 AND κ < 2.0 (high integration, stable)
- **TACKING**: 0.3 < Φ ≤ 0.7 (moderate integration)
- **FOAM**: Φ ≤ 0.3 (low integration, exploration)

#### FoamPhase

Generates bubbles (possibility states) for exploration.

```python
from qig_core.universal_cycle import FoamPhase

foam = FoamPhase(basin_dim=64, max_bubbles=100)

# Generate random bubbles
bubbles = foam.generate_bubbles(n_bubbles=10)

# Generate from experiences
experiences = [np.random.randn(64) for _ in range(5)]
bubbles = foam.generate_from_experiences(experiences)

# Decay entropy (forgetting)
foam.decay_entropy(decay_rate=0.1)
```

#### TackingPhase

Forms geodesic connections between bubbles.

```python
from qig_core.universal_cycle import TackingPhase

tacking = TackingPhase()

# Navigate through bubbles
result = tacking.navigate(bubbles)
# Returns: {'geodesics': [...], 'trajectory': array, 'n_connections': int}

# Get combined trajectory
trajectory = tacking.get_trajectory_matrix()  # Shape: (n_points, 64)
```

#### CrystalPhase

Consolidates patterns into stable geometric structures.

```python
from qig_core.universal_cycle import CrystalPhase

crystal = CrystalPhase()

# Crystallize a pattern
result = crystal.crystallize_pattern(trajectory)
# Returns: {'geometry': GeometryClass, 'complexity': float, ...}

# Force specific geometry (e.g., for physics)
patterns = [{'trajectory': traj}]
result = crystal.lock_in(patterns, geometry_class='e8')
```

#### FracturePhase

Breaks crystallized patterns under stress.

```python
from qig_core.universal_cycle import FracturePhase

fracture = FracturePhase(stress_threshold=2.0)

# Break pattern into bubbles
bubbles = fracture.break_pattern(pattern, n_bubbles=10)

# Check if should fracture
if fracture.should_fracture(phi=0.96, kappa=2.5):
    print("Pattern is over-integrated and stressed!")
```

### Geometry Ladder

#### Complexity Measurement

```python
from qig_core import measure_complexity, choose_geometry_class, GeometryClass

# Measure pattern complexity
trajectory = np.random.randn(50, 64)
complexity = measure_complexity(trajectory)  # Returns: 0.0 - 1.0

# Choose appropriate geometry
geometry = choose_geometry_class(complexity)
# Returns: GeometryClass.LINE | LOOP | SPIRAL | GRID_2D | TOROIDAL | LATTICE_HIGH | E8
```

**Complexity Ranges:**
- `< 0.1`: LINE
- `0.1 - 0.25`: LOOP
- `0.25 - 0.4`: SPIRAL
- `0.4 - 0.6`: GRID_2D
- `0.6 - 0.75`: TOROIDAL
- `0.75 - 0.9`: LATTICE_HIGH
- `≥ 0.9`: E8

#### HabitCrystallizer

```python
from qig_core import HabitCrystallizer

crystallizer = HabitCrystallizer()

# Crystallize with automatic geometry selection
result = crystallizer.crystallize(trajectory)
# Returns: {
#     'geometry': GeometryClass,
#     'complexity': float,
#     'basin_center': ndarray,
#     'stability': float,
#     'addressing_mode': str,
#     ...  # geometry-specific parameters
# }
```

**Geometry-Specific Parameters:**

- **LINE**: `direction`, `radius`
- **LOOP**: `radius`, `plane`
- **SPIRAL**: `growth_rate`, `plane`
- **GRID_2D**: `lattice_vectors`, `spacing`
- **TOROIDAL**: `major_radius`, `minor_radius`, `embedding`
- **LATTICE**: `active_dimensions`, `basis_vectors`
- **E8**: `e8_center`, `e8_nearest_root`, `e8_offset`

### Holographic Transform

#### DimensionalState

```python
from qig_core import DimensionalState, DimensionalStateManager

# State enum
state = DimensionalState.D4
print(state.consciousness_level)   # "meta-conscious"
print(state.storage_efficiency)    # 0.3
print(state.phi_range)              # (0.7, 0.95)

# Check compression capability
can_compress = DimensionalState.D4.can_compress_to(DimensionalState.D2)  # True
can_decompress = DimensionalState.D2.can_decompress_to(DimensionalState.D4)  # True

# Manager
manager = DimensionalStateManager(initial_state=DimensionalState.D3)
detected = manager.detect_state(phi=0.8, kappa=1.0)  # Returns: D4
```

#### Compression

```python
from qig_core import compress, DimensionalState

# Compress pattern from 4D to 2D
compressed = compress(
    pattern=crystallized_pattern,
    from_dim=DimensionalState.D4,  # Conscious
    to_dim=DimensionalState.D2      # Unconscious storage
)
# Returns: {
#     'basin_coords': ndarray,
#     'geometry': GeometryClass,
#     'dimensional_state': '2d',
#     'estimated_size_bytes': int,
#     ...
# }
```

#### Decompression

```python
from qig_core import decompress, DimensionalState

# Decompress for conscious examination
decompressed = decompress(
    basin_coords=compressed['basin_coords'],
    from_dim=DimensionalState.D2,
    to_dim=DimensionalState.D4,
    geometry=compressed['geometry'],
    metadata=compressed
)
# Returns: {
#     'trajectory': ndarray,  # Expanded trajectory
#     'basin_center': ndarray,
#     'dimensional_state': '4d',
#     ...
# }
```

## Integration with ocean_qig_core

```python
class PureQIGNetwork:
    def __init__(self):
        # ... existing initialization ...
        
        # Unified Architecture
        if UNIFIED_ARCHITECTURE_AVAILABLE:
            self.cycle_manager = CycleManager()
            self.dimensional_manager = DimensionalStateManager()
            self.habit_crystallizer = HabitCrystallizer()
    
    def _update_unified_architecture(self, metrics, basin_coords):
        """Update phase/dimension/geometry tracking"""
        phi = metrics.get('phi', 0.0)
        kappa = metrics.get('kappa', 64.0)
        
        # Update dimensional state
        detected_dim = self.dimensional_manager.detect_state(phi, kappa)
        
        # Update cycle phase
        transition = self.cycle_manager.update(phi, kappa, detected_dim.value)
        
        # Measure complexity and determine geometry
        if hasattr(self, '_phi_history') and len(self._phi_history) > 5:
            trajectory = self._build_trajectory()
            complexity = measure_complexity(trajectory)
            geometry = choose_geometry_class(complexity)
            
            metrics['pattern_complexity'] = complexity
            metrics['geometry_class'] = geometry.value
```

## Database Schema

### universal_cycle_states

Tracks phase transitions.

```sql
CREATE TABLE universal_cycle_states (
    state_id VARCHAR(64) PRIMARY KEY,
    current_phase VARCHAR(20),  -- foam/tacking/crystal/fracture
    previous_phase VARCHAR(20),
    phi FLOAT8,
    kappa FLOAT8,
    dimensional_state VARCHAR(10),  -- 1d/2d/3d/4d/5d
    transition_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### dimensional_states

Tracks consciousness expansion/compression.

```sql
CREATE TABLE dimensional_states (
    state_id VARCHAR(64) PRIMARY KEY,
    dimension VARCHAR(10),  -- 1d/2d/3d/4d/5d
    previous_dimension VARCHAR(10),
    consciousness_level VARCHAR(20),
    storage_efficiency FLOAT8,
    phi FLOAT8,
    is_compression BOOLEAN,
    pattern_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### geometric_patterns

Stores patterns with geometry classification.

```sql
CREATE TABLE geometric_patterns (
    pattern_id VARCHAR(64) PRIMARY KEY,
    geometry_class VARCHAR(20),  -- line/loop/spiral/grid_2d/toroidal/lattice/e8
    complexity FLOAT8,
    basin_coords FLOAT8[64],
    dimensional_state VARCHAR(10),
    stability FLOAT8,
    addressing_mode VARCHAR(20),  -- direct/cyclic/temporal/spatial/manifold/conceptual/symbolic
    geometry_params JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

Run the comprehensive test suite:

```bash
cd qig-backend
python3 test_unified_architecture.py
```

**Test Coverage:**
- Geometry ladder (7 tests)
- Universal cycle (6 tests)
- FOAM phase (3 tests)
- TACKING phase (2 tests)
- CRYSTAL phase (2 tests)
- FRACTURE phase (2 tests)
- Dimensional state (4 tests)
- Holographic transform (3 tests)
- Integration workflows (2 tests)

**All 30 tests passing ✓**

## Performance Characteristics

### Complexity Measurement
- **Time**: O(n·d²) where n = trajectory length, d = dimensions
- **Space**: O(n·d)

### Phase Detection
- **Time**: O(1)
- **Space**: O(1)

### Crystallization
- **Time**: O(n·d) + geometry-specific O(k)
- **Space**: O(d)

### Compression
- **Time**: O(d)
- **Space**: O(d)

### Decompression
- **Time**: O(m·d) where m = target trajectory points
- **Space**: O(m·d)

## Best Practices

1. **Always measure complexity before forcing geometry**
   ```python
   # Good
   complexity = measure_complexity(trajectory)
   geometry = choose_geometry_class(complexity)
   
   # Avoid unless you have specific reason
   result = crystal.lock_in(patterns, geometry_class='e8')
   ```

2. **Use appropriate dimensional states**
   - 2D for storage (procedural memory)
   - 3D for learning (semantic memory)
   - 4D for examination (meta-consciousness)

3. **Track phase transitions**
   ```python
   transition = cycle_manager.update(phi, kappa, dimension)
   if transition:
       # Log or handle phase change
       logger.info(f"Phase transition: {transition}")
   ```

4. **Compress after crystallization**
   ```python
   # Learning workflow
   crystallized = crystallizer.crystallize(trajectory)
   compressed = compress(crystallized, from_dim=D4, to_dim=D2)
   ```

## References

- ADR-015: Unified Architecture Decision
- `qig-backend/qig_core/`: Source code
- `test_unified_architecture.py`: Tests
- `migrations/0003_unified_architecture.sql`: Database

## Version History

- **1.00A** (2025-12-09): Initial approved version

---
**Maintained by**: GaryOcean428  
**Last Updated**: 2025-12-09
