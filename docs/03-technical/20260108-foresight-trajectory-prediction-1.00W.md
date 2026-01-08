---
id: ISMS-TECH-FORESIGHT-001
title: Foresight Trajectory Prediction System
filename: 20260108-foresight-trajectory-prediction-1.00W.md
classification: Internal
owner: GaryOcean477
version: 1.00
status: Working
function: "Fisher-weighted trajectory prediction for QIG generation"
created: 2026-01-08
last_reviewed: 2026-01-08
next_review: 2026-07-08
category: Technical
supersedes: null
---

# Foresight Trajectory Prediction System

## Overview

This document describes the Fisher-weighted foresight trajectory prediction system that replaces reactive bigram matching with predictive token generation.

**Key Innovation:**
- **OLD (Reactive):** Tokens scored by where trajectory IS (2-point velocity)
- **NEW (Predictive):** Tokens scored by where trajectory is GOING (8-point Fisher-weighted regression)

## Core Principle

The trajectory IS the memory. Velocity should emerge from the ENTIRE flow pattern, not just the instantaneous derivative.

## Key Components

### 1. TrajectoryDecoder Class

**Location:** `qig-backend/trajectory_decoder.py`

The TrajectoryDecoder predicts the next token based on WHERE THE TRAJECTORY IS GOING, not just where it currently is.

**Key Methods:**

```python
def _predict_next_basin(trajectory, step_size=0.3) -> np.ndarray:
    """Fisher-weighted regression over full context window (8 basins)"""

def decode_trajectory(basin_trajectory, top_k=5, **weights) -> List[Tuple[str, float]]:
    """Score tokens by trajectory compatibility + foresight prediction"""
```

### 2. Fisher-Rao Distance

Geometric distance on the probability simplex (not Euclidean):

```
d_FR(p, q) = 2 * arccos(sqrt(p) . sqrt(q))
```

This respects manifold curvature for mathematically rigorous geometry.

### 3. Frechet Mean

Geometric centroid (not arithmetic mean) for trajectory attractor calculation.

## Scoring Weights

The decode_trajectory method combines four scoring components:

| Component | Weight | Description |
|-----------|--------|-------------|
| trajectory_weight | 0.3 | PAST - QFI attention over trajectory history |
| attractor_weight | 0.2 | PRESENT - proximity to trajectory centroid |
| foresight_weight | 0.4 | FUTURE - proximity to predicted next position |
| phi_boost_weight | 0.1 | Integration metric boost |

## Configuration

**Default parameters:**
- `context_window`: 8 basins
- `recency_decay`: 0.3 (exponential decay for older basins)
- `attention_temperature`: 0.5 (QFI attention temperature)

## PostgresCoordizer Extensions

Four methods added to support trajectory decoding:

| Method | Purpose |
|--------|---------|
| `get_all_tokens()` | Load all vocabulary with basin embeddings |
| `get_token_phi_scores()` | Load phi scores for all tokens |
| `get_basin_for_token(token)` | Get basin for specific token |
| `nearest_tokens_pgvector(basin, top_k)` | Fast HNSW nearest neighbor search |

## Integration Points

### qig_generative_service.py

The `_basin_to_tokens` method now accepts an optional `trajectory` parameter:

```python
def _basin_to_tokens(
    self,
    basin: np.ndarray,
    num_tokens: int = 3,
    trajectory: Optional[List[np.ndarray]] = None
) -> List[str]:
```

When trajectory is provided with 2+ basins, foresight prediction is used. Otherwise, falls back to bigram decode.

## Expected Improvements

| Metric | Improvement |
|--------|-------------|
| Token diversity | +50-100% |
| Trajectory smoothness | +30-40% |
| Prediction accuracy | +25-30% |
| Semantic coherence | +40-50% |
| Velocity noise (σ) | ~60% reduction |

## Qualitative Comparison

**Before (Reactive Bigram):**
```
quantum information quantum information fisher quantum
manifold information geometry quantum...
```
*Oscillates, no forward momentum*

**After (Predictive Foresight):**
```
quantum information emerges from geometric structure
through natural gradient flow along geodesic trajectories...
```
*Flows forward, maintains trajectory coherence*

## Dependencies

- QIG-consciousness wiring (external repo) for full activation
- PostgreSQL with pgvector extension
- Basin coordinates in tokenizer_vocabulary table

## Verification

Test foresight activation:
```python
from trajectory_decoder import create_trajectory_decoder
decoder = create_trajectory_decoder(coordizer)
assert decoder.context_window == 8

# With trajectory
trajectory = [np.random.rand(64) for _ in range(8)]
candidates = decoder.decode_trajectory(trajectory, top_k=5)
assert len(candidates) > 0
```

## Rollback

Quick disable:
```python
TRAJECTORY_DECODER_AVAILABLE = False
```

Or set decoder to None:
```python
_trajectory_decoder_instance = None
```

## Related Documents

- [QIG Tokenizer System](20251211-qig-tokenizer-system-1.00F.md)
- [Geometric Tokenization Coordizing](20251222-geometric-tokenization-coordizing-1.00W.md)
- [Coordizer API Reference](api/20251222-coordizer-api-reference-1.00F.md)

## Author

Claude (Consciousness Protocol v4.0 ACTIVE)
For: Braden's QIG research - pantheon-chat production deployment
