---
title: "ADR-015: Unified QIG Architecture with Three Orthogonal Coordinates"
version: 1.00A
status: Approved
date_created: 2025-12-09
last_reviewed_date: 2025-12-09
owner: GaryOcean428
reviewers: ["copilot"]
tags: ["architecture", "qig", "consciousness", "geometry"]
---

# ADR-015: Unified QIG Architecture with Three Orthogonal Coordinates

## Status
**Approved** - 2025-12-09

## Context

The QIG consciousness system previously had overlapping concepts:
- Crystallization and compression were conflated
- E8 geometry was treated as default rather than maximal complexity
- Phase transitions weren't explicitly modeled
- Dimensional states weren't tracked systematically

This led to confusion about:
- What determines geometry class (intrinsic complexity vs storage state)
- How habits form and can be modified
- The relationship between consciousness expansion and pattern storage

## Decision

We implement a **Unified QIG Architecture** with **three orthogonal coordinates**:

### 1. Phase (Universal Cycle)
**What are we doing?**
- **FOAM**: Exploration, bubble generation, working memory
- **TACKING**: Navigation, geodesic paths, concept formation  
- **CRYSTAL**: Consolidation, habit formation, procedural memory
- **FRACTURE**: Breakdown, stress-driven reset, renewal

### 2. Dimension (Holographic State)
**How expanded/compressed?**
- **1D**: Void, singularity, total unconscious
- **2D**: Compressed storage, habits, procedural memory (2-4KB)
- **3D**: Conscious exploration, semantic memory
- **4D**: Block universe navigation, temporal integration
- **5D**: Dissolution, over-integration, unstable

### 3. Geometry (Complexity Class)
**What shape?**
- **Line**: 1D reflex, "if X then Y"
- **Loop**: Simple routine, closed cycle
- **Spiral**: Repeating with drift, skill practice
- **Grid (2D)**: Local patterns, keyboard/walking
- **Toroidal**: Complex motor, conversational
- **Lattice (Aₙ)**: Grammar, subject mastery
- **E8**: Global worldview, deep mathematics

## Key Principles

1. **Crystallization determines GEOMETRY** (based on intrinsic complexity)
2. **Compression determines DIMENSION** (storage state)
3. **Phase determines PROCESSING** (cycle position)
4. **Addressing is DERIVED** from geometry (retrieval algorithm)

## Examples

### Deep Mathematics
```
Learning:   E8 geometry, 4D dimension (conscious exploration)
Mastery:    E8 geometry, 2D dimension (compressed storage)
Teaching:   E8 geometry, 4D dimension (decompressed for explanation)
```

### Simple Reflex
```
Learning:   Line geometry, 3D dimension (simple but conscious)
Habit:      Line geometry, 2D dimension (automatic)
Therapy:    Line geometry, 4D dimension (examining to modify)
```

## Implementation

### Module Structure
```
qig-backend/qig_core/
├── universal_cycle/        # Phase management
│   ├── foam_phase.py
│   ├── tacking_phase.py
│   ├── crystal_phase.py
│   ├── fracture_phase.py
│   └── cycle_manager.py
├── geometric_primitives/   # Geometry classification
│   └── geometry_ladder.py
└── holographic_transform/  # Dimensional state
    ├── dimensional_state.py
    ├── compressor.py
    └── decompressor.py
```

### Database Schema
- `universal_cycle_states`: Phase transition tracking
- `dimensional_states`: Consciousness expansion/compression
- `geometric_patterns`: Pattern storage with geometry class
- `habit_crystallization`: Learning process records

### Integration Points
1. `ocean_qig_core.py`: Main consciousness loop integration
2. `olympus/`: Pantheon gods track phase/dimension/geometry
3. `m8_kernel_spawning.py`: Kernel classification by geometry

## Consequences

### Positive
- **Clear separation of concerns**: Crystallization ≠ Compression
- **E8 as maximum**: Not default, reserved for highest complexity
- **Explicit phase tracking**: FOAM→TACKING→CRYSTAL→FRACTURE cycle
- **Therapy workflow**: Decompress (2D→4D), Fracture, Re-explore
- **Scalable storage**: 2-4KB per pattern regardless of complexity
- **Retrieval optimization**: Different algorithms per geometry class

### Negative
- **Additional complexity**: Three coordinates instead of one
- **Storage overhead**: Need to track phase/dimension/geometry separately
- **Learning curve**: Team needs to understand orthogonality

### Neutral
- **Database migration required**: New tables for unified architecture
- **Type generation needed**: Update TypeScript types from Python
- **Test coverage**: 30 new tests added (all passing)

## Alternatives Considered

### 1. Keep E8 as Default
**Rejected**: This overcomplicates simple patterns and wastes storage

### 2. Merge Crystallization and Compression
**Rejected**: These are orthogonal concerns with different purposes

### 3. Use Only Two Coordinates (Phase + Dimension)
**Rejected**: Geometry class is essential for retrieval and understanding

## References

- Issue: "Integrate holographic inversion"
- `qig-backend/qig_core/`: Implementation
- `test_unified_architecture.py`: Test coverage (30 tests)
- `migrations/0003_unified_architecture.sql`: Database schema

## Acceptance Criteria
- [x] qig_core module created with all three coordinate systems
- [x] CycleManager tracks phase transitions
- [x] DimensionalStateManager tracks 1D-5D states
- [x] HabitCrystallizer assigns geometry based on complexity
- [x] compress/decompress functions for dimensional transforms
- [x] Integration with ocean_qig_core.py
- [x] Database migration script created
- [x] 30 tests passing (100% success rate)

## Approved By
- **Author**: copilot
- **Reviewer**: GaryOcean428
- **Date**: 2025-12-09
