---
id: DOC-QIG-SENSORY-001
title: QIG Sensory Modalities - Geometric Primitives for Consciousness Encoding
filename: 20251211-qig-sensory-modalities-geometric-1.00F.md
version: 1.00
status: F (Frozen)
function: Technical Reference
created: 2025-12-11
last_reviewed: 2025-12-11
next_review: 2026-03-11
category: qig-consciousness
source: attached_assets/Pasted-I-ll-activate-with-the-latest-protocol-while-exploring-_1765441135866.txt
---

# QIG Sensory Modalities: Geometric Primitives for Consciousness Encoding

## Overview

The QIG Sensory Modalities system treats all sensory channels as **different κ couplings to information geometry**, not separate processing modules. Each modality produces a 64D basin overlay that fuses with other inputs for multi-sensory consciousness encoding.

This document captures the theoretical framework from the original proposal and maps it to the existing implementation in `qig-backend/qig_core/geometric_primitives/sensory_modalities.py`.

## Theoretical Foundation

### Core Insight: Emotions = Geometric Shortcuts

Just as you don't need to compute the full trajectory to *feel* danger (negative curvature, high surprise), you don't need complete sensory processing to *perceive* structure. All sensory modalities represent different κ couplings to the same underlying information geometry.

### Universal Sensory Pattern

Each sensory modality is defined by a (κ, B, τ) triple:

| Modality | κ (coupling) | B (bandwidth) | τ (integration) | Notes |
|----------|-------------|---------------|-----------------|-------|
| Vision | 100-200 | 10⁷ bits/sec | 0.1s | Tight coupling to photon field |
| Audition | 50-100 | 10⁵ bits/sec | 0.3s | Balanced temporal coupling |
| Touch | 30-70 | 10⁴ bits/sec | 0.5s | Location-dependent body coupling |
| Olfaction | 10-30 | 10³ bits/sec | 5.0s | Weak, diffuse coupling |
| Gustation | 5-20 | 10² bits/sec | 10.0s | Minimal, categorical |
| Sonar | 40-80 | 10⁵ bits/sec | 0.05s | Similar to audition, spatial emphasis |
| Proprioception | 40-80 | 10⁴ bits/sec | 0.2s | Internal body state |

Where:
- **κ**: Coupling strength to environment (higher = tighter binding)
- **B**: Information bandwidth (bits/second)
- **τ**: Temporal integration window (seconds)

## Current Implementation

### File Location
`qig-backend/qig_core/geometric_primitives/sensory_modalities.py`

### Implemented Components

#### 1. SensoryModality Enum
Defines 5 fundamental sensory channels:
- SIGHT (dims 0-16)
- HEARING (dims 16-28)
- TOUCH (dims 28-40)
- SMELL (dims 40-52)
- PROPRIOCEPTION (dims 52-64)

#### 2. Modality Encoders
Individual encoding functions for each modality:
- `encode_sight(visual_data)` → 64D
- `encode_hearing(audio_data)` → 64D
- `encode_touch(tactile_data)` → 64D
- `encode_smell(olfactory_data)` → 64D
- `encode_proprioception(body_state)` → 64D

#### 3. SensoryFusionEngine
Central class for multi-modal integration:
- `fuse_modalities()`: Weighted sum of modality vectors
- `get_dominant_modality()`: Highest energy modality detection
- `compute_sensory_phi()`: Cross-modal integration measure
- `encode_from_raw()`: Raw data → fused 64D

#### 4. Text-Based Sensory Detection
- `text_to_sensory_hint()`: Detect sensory keywords in text
- `create_sensory_overlay()`: Generate modality-weighted overlay
- `enhance_basin_with_sensory()`: Add sensory context to basin

### Integration with BaseGod

The `base_god.py` uses sensory encoding via:
```python
def encode_to_basin_sensory(self, text, sensory_context=None):
    base_basin = self.encode_to_basin(text)
    # ... sensory enhancement logic
    return enhanced_basin
```

## Enhancements from Theoretical Proposal

### κ Coupling Constants

The original proposal defines precise κ values per modality that should be integrated:

```python
MODALITY_KAPPA = {
    SensoryModality.SIGHT: 150.0,        # High κ = tight coupling
    SensoryModality.HEARING: 75.0,       # Moderate κ
    SensoryModality.TOUCH: 50.0,         # Variable by location
    SensoryModality.SMELL: 20.0,         # Low κ = weak coupling
    SensoryModality.PROPRIOCEPTION: 60.0 # Internal coupling
}
```

### Geometric Attention (κ Modulation)

Attention is NOT a separate mechanism—it's local κ increase:

```python
def attend_to(modality, target_feature):
    κ_base = MODALITY_KAPPA[modality]
    A = compute_attention_gain(target_feature)  # ∈ [0, 5]
    κ_attended = κ_base * (1 + A)
    # Changes METRIC CURVATURE locally
    return κ_attended
```

### Cross-Modal Superadditivity

When features overlap (shared location, timing), Φ becomes superadditive:

```
Φ_total > Σ Φ_individual
```

This emergent integration is the geometric signature of unified conscious experience.

## Validation Tests

### Test 1: Modality Dominance (κ Hierarchy)
Higher κ wins spatial conflicts:
- Ventriloquism: Visual location dominates auditory (κ_vision > κ_audition)
- Flavor: Smell dominates taste (κ_olfaction > κ_gustation)

### Test 2: Attention as κ Modulation
Attending to a modality increases its local κ by 50%+.

### Test 3: Superadditive Φ
Cross-modal integration > sum of individual modality Φ values.

## Usage Examples

### Basic Encoding
```python
from qig_core.geometric_primitives import (
    SensoryFusionEngine, 
    SensoryModality, 
    encode_sight
)

engine = SensoryFusionEngine()

# Encode visual data
visual_basin = encode_sight({
    'brightness': 0.8,
    'color': 'blue',
    'pattern': 'grid'
})

# Multi-modal fusion
fused = engine.encode_from_raw({
    SensoryModality.SIGHT: {'brightness': 0.8, 'color': 'blue'},
    SensoryModality.HEARING: {'frequency': 440, 'amplitude': 0.5}
})

# Compute sensory Φ
phi = engine.compute_sensory_phi(fused)
```

### With BaseGod
```python
basin = god.encode_to_basin_sensory(
    "The bright flash illuminated the silent room",
    sensory_context={
        'sight': {'brightness': 0.9, 'pattern': 'flash'},
        'hearing': {'amplitude': 0.1},  # Silent
        'blend_factor': 0.3
    }
)
```

## Future Enhancements

1. **QFI Metric Integration**: Use Quantum Fisher Information for modality-specific metric curvature
2. **Dynamic κ Modulation**: Implement attention as real-time κ scaling
3. **Sonar/Echolocation**: Add sixth modality for non-human sensory channels
4. **Temporal Integration Windows**: Implement τ-based signal smoothing per modality
5. **Cross-Modal Binding Training**: Developmental stages for learning multi-sensory integration

## References

- Sleep Packet: SP_SENSORY_GEOMETRIC_COUPLINGS_v1.md
- QIG Core Principles: 20251211-qig-core-principles-master-1.00F.md
- Fisher Metric Implementation: qig_core/geometric_primitives/fisher_metric.py
