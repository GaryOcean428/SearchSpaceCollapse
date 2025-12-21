---
id: DOC-TECH-2025-003
title: "Sensory Modalities as Geometric Primitives - Implementation Design"
filename: "20251221-sensory-modalities-geometric-primitives-design-2.00W.md"
version: "2.00"
status: "W"
function: "design"
category: "technical"
created: "2025-12-11"
last_reviewed: "2025-12-21"
next_review: "2026-01-21"
owner: "system"
supersedes: "20251211-sensory-modalities-geometric-primitives-design-1.00W.md"
tags:
  - sensory-modalities
  - geometric-primitives
  - consciousness
  - qig
  - kappa-coupling
  - fisher-information
classification: "internal"
---

# SENSORY MODALITIES AS GEOMETRIC PRIMITIVES

## Implementation Design v2.00 - WORKING

**Adapted to SearchSpaceCollapse Platform with Canonical Physics Constants**

---

## CHANGELOG v2.00

- Updated all κ values to use canonical physics constants from `qigkernels/physics_constants.py`
- Normalized sensory κ values relative to validated κ* = 64.21
- Added proper imports from platform modules
- Integrated with `qig_geometry.py` for Fisher-Rao operations
- Updated 64D basin coordinates to use `PHYSICS.BASIN_DIM`
- Added platform-specific implementation paths
- Marked actual implementation status (NOT yet implemented)

---

## IMPLEMENTATION STATUS

**Status: DESIGN - Not Yet Implemented**

**Required Platform Integration:**

- ❌ **Core Implementation:** `qig-backend/geometric_primitives/sensory_manifold.py` (to be created)
- ❌ **Flask API Routes:** Routes in `ocean_qig_core.py`
- ❌ **TypeScript Types:** Types in `shared/schema.ts`
- ❌ **Database Schema:** PostgreSQL tables for sensory states
- ✅ **Physics Constants:** Available in `qig-backend/qigkernels/physics_constants.py`
- ✅ **Geometry Module:** Available in `qig-backend/qig_geometry.py`

---

## CANONICAL PHYSICS REFERENCE

**Source:** `qig-backend/qigkernels/physics_constants.py` (FROZEN)

```python
from qigkernels.physics_constants import (
    PHYSICS,           # Singleton with all constants
    KAPPA_STAR,        # 64.21 ± 0.92 (validated fixed point)
    BASIN_DIM,         # 64 (E8 subspace dimension)
    PHI_THRESHOLD,     # 0.70 (consciousness emergence)
    PHI_HYPERDIMENSIONAL,  # 0.75 (4D integration)
    L_CRITICAL,        # 3 (geometric phase transition)
)

# Validated κ at different scales
KAPPA_3 = 41.09  # ± 0.59 (emergence)
KAPPA_4 = 64.47  # ± 1.89 (running coupling)
KAPPA_5 = 63.62  # ± 1.68 (plateau onset)
KAPPA_6 = 64.45  # ± 1.34 (plateau confirmed)
```

---

## EXECUTIVE SUMMARY

**Core Insight:** All sensory modalities are **different κ (coupling strength) projections** onto the same underlying information geometry manifold.

**Key Principles:**

1. **Emotions = Geometric shortcuts** (curvature, basins, flows)
2. **Sensory modalities = Geometric couplings** (different κ multipliers of κ*)
3. **Attention = Geometric modulation** (local κ increase)
4. **Consciousness = Geometric integration** (Φ from cross-modal coherence)

**Universal Pattern:**

```
Sensory Modality = (κ_multiplier, Bandwidth, τ) Triple

Where:
  κ_effective = κ_multiplier × κ* (κ* = 64.21, validated)
  B = information bandwidth (bits/sec)
  τ = temporal integration window (sec)
```

---

## 1. THEORETICAL FOUNDATION

### 1.1 κ Coupling Hierarchy (Normalized to κ*)

**CRITICAL:** All sensory κ values are expressed as multipliers of the validated κ* = 64.21.

```python
# Sensory κ values normalized to κ* = 64.21

SENSORY_KAPPA_MULTIPLIERS = {
    'vision':         2.34,   # κ_eff ≈ 150 (tight coupling to photon field)
    'audition':       1.17,   # κ_eff ≈ 75 (balanced temporal coupling)
    'sonar':          1.01,   # κ_eff ≈ 65 (spatial navigation)
    'proprioception': 0.93,   # κ_eff ≈ 60 (internal body coupling)
    'touch':          0.78,   # κ_eff ≈ 50 base (location-dependent)
    'olfaction':      0.31,   # κ_eff ≈ 20 (weak, diffuse coupling)
    'gustation':      0.16,   # κ_eff ≈ 10 (minimal, categorical)
}

# Effective κ = multiplier × κ*
def get_effective_kappa(modality: str) -> float:
    from qigkernels.physics_constants import KAPPA_STAR
    return SENSORY_KAPPA_MULTIPLIERS[modality] * KAPPA_STAR
```

**Physical Interpretation:**

- **High κ (>1.5κ*):** Fine discrimination, real-time updates, high energy cost
- **Medium κ (0.7-1.5κ*):** Balanced coupling, moderate energy
- **Low κ (<0.7κ*):** Coarse categories, slow integration, low energy cost

### 1.2 Geometric Unity

**Critical Insight:** All modalities map to the **same 64-dimensional E8 subspace** (PHYSICS.BASIN_DIM = 64). They differ only in:

1. Coupling multiplier (κ_mult relative to κ*)
2. Information bandwidth (B)
3. Integration window (τ)

**Not separate "modules"** - different **metric curvatures** on shared manifold.

---

## 2. PLATFORM-ADAPTED ARCHITECTURE

### 2.1 Unified Sensory Manifold

```python
"""
Sensory Manifold - Platform Integration
Location: qig-backend/geometric_primitives/sensory_manifold.py
"""

from qigkernels.physics_constants import (
    PHYSICS, KAPPA_STAR, BASIN_DIM, PHI_THRESHOLD
)
from qig_geometry import (
    compute_fisher_rao_distance,
    fisher_rao_embedding,
    compute_phi_from_basin,
)
import numpy as np
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ModalitySpec:
    """Specification for a sensory modality."""
    kappa_multiplier: float      # Relative to κ* = 64.21
    bandwidth: float             # bits/sec
    tau: float                   # Integration window (seconds)
    channels: int                # Number of input channels
    resolution: str              # 'very_low', 'low', 'medium', 'high'
    kappa_map: Optional[Dict[str, float]] = None  # Location-dependent κ
    
    @property
    def effective_kappa(self) -> float:
        """Get effective κ from multiplier × κ*."""
        return self.kappa_multiplier * KAPPA_STAR


class QIGSensoryManifold:
    """
    All senses as projections on shared information geometry.
    
    Uses canonical physics constants from SearchSpaceCollapse platform.
    All κ values are validated and frozen.
    """

    def __init__(self):
        # Shared E8 base manifold (64D subspace from PHYSICS)
        self.basin_dim = BASIN_DIM  # 64, validated
        self.kappa_star = KAPPA_STAR  # 64.21, validated
        
        # Modality specifications with κ as multipliers of κ*
        self.modalities: Dict[str, ModalitySpec] = {
            'vision': ModalitySpec(
                kappa_multiplier=2.34,      # κ_eff ≈ 150
                bandwidth=1e7,               # bits/sec
                tau=0.1,                     # seconds
                channels=3,                  # RGB
                resolution='high'
            ),
            'audition': ModalitySpec(
                kappa_multiplier=1.17,      # κ_eff ≈ 75
                bandwidth=1e5,
                tau=0.3,
                channels=1,                  # mono
                resolution='medium'
            ),
            'touch': ModalitySpec(
                kappa_multiplier=0.78,      # κ_eff ≈ 50 base
                bandwidth=1e4,
                tau=0.5,
                channels=4,
                resolution='medium',
                kappa_map={                  # Location-dependent multipliers
                    'fingertips': 1.09,      # κ_eff ≈ 70
                    'palm': 0.78,            # κ_eff ≈ 50
                    'arm': 0.47,             # κ_eff ≈ 30
                    'back': 0.31             # κ_eff ≈ 20
                }
            ),
            'proprioception': ModalitySpec(
                kappa_multiplier=0.93,      # κ_eff ≈ 60
                bandwidth=1e4,
                tau=0.2,
                channels=24,                 # joint angles
                resolution='high'
            ),
            'olfaction': ModalitySpec(
                kappa_multiplier=0.31,      # κ_eff ≈ 20
                bandwidth=1e3,
                tau=5.0,
                channels=128,                # receptor types
                resolution='low'
            ),
            'gustation': ModalitySpec(
                kappa_multiplier=0.16,      # κ_eff ≈ 10
                bandwidth=1e2,
                tau=10.0,
                channels=5,                  # basic tastes
                resolution='very_low'
            ),
            'sonar': ModalitySpec(
                kappa_multiplier=1.01,      # κ_eff ≈ 65
                bandwidth=1e5,
                tau=0.05,
                channels=2,                  # timing + intensity
                resolution='high'
            )
        }
    
    def get_modality_kappa(self, modality: str, location: str = None) -> float:
        """
        Get effective κ for a modality, optionally location-specific.
        
        Args:
            modality: One of the defined modality keys
            location: Optional location for touch modality
            
        Returns:
            Effective κ value (multiplier × κ*)
        """
        spec = self.modalities[modality]
        
        if location and spec.kappa_map and location in spec.kappa_map:
            return spec.kappa_map[location] * self.kappa_star
        
        return spec.effective_kappa
```

### 2.2 Stimulus Encoding with Platform Integration

```python
def encode_stimulus(
    self, 
    stimulus: Any, 
    modality: str,
    location: str = None
) -> np.ndarray:
    """
    Map raw stimulus to shared manifold via QFI metric.
    
    Uses platform's qig_geometry.py for Fisher-Rao operations.
    
    Args:
        stimulus: Raw sensory input (format depends on modality)
        modality: One of the defined modality keys
        location: Optional location for touch modality
        
    Returns:
        coords: 64D coordinates in E8 subspace (BASIN_DIM)
    """
    spec = self.modalities[modality]
    κ_eff = self.get_modality_kappa(modality, location)
    τ = spec.tau
    
    # Step 1: Stimulus → probability distribution
    p_dist = self._stimulus_to_distribution(stimulus, modality)
    
    # Step 2: Compute Fisher Information with modality-specific κ
    # Scale by κ_eff / κ* to normalize to platform's validated κ*
    kappa_scale = κ_eff / self.kappa_star
    
    # Step 3: Fisher-Rao embedding (preserves information geometry)
    # Uses platform's qig_geometry module
    coords = fisher_rao_embedding(
        p_dist, 
        dim=self.basin_dim,
        kappa_scale=kappa_scale,
        integration_window=τ
    )
    
    return coords  # Lives in shared 64D E8 space

def _stimulus_to_distribution(
    self, 
    stimulus: Any, 
    modality: str
) -> np.ndarray:
    """
    Convert raw stimulus to probability distribution.
    
    Each modality has specific preprocessing.
    """
    spec = self.modalities[modality]
    
    if modality == 'vision':
        # Image → edge-color-object distribution
        return self._visual_to_distribution(stimulus)
    elif modality == 'audition':
        # Waveform → cochlear distribution
        return self._auditory_to_distribution(stimulus)
    elif modality == 'olfaction':
        # Odor vector → receptor activation
        return self._olfactory_to_distribution(stimulus)
    else:
        # Generic: normalize stimulus as distribution
        arr = np.asarray(stimulus).flatten()
        return arr / (np.sum(arr) + 1e-10)
```

### 2.3 Modality-Specific Encoders

#### Vision (κ_mult = 2.34, κ_eff ≈ 150)

```python
def encode_visual(self, image: np.ndarray) -> np.ndarray:
    """
    High κ → tight coupling to photon field
    High B → fine spatial resolution
    Fast τ → real-time tracking
    
    Uses: κ_effective = 2.34 × κ* = 2.34 × 64.21 ≈ 150
    """
    # Multi-scale edge detection (curvature of intensity field)
    edges = self._compute_image_curvature(image)
    
    # Color opponent channels (geometric color space)
    color_coords = self._rgb_to_opponent_space(image)
    
    # Object recognition basins (learned attractors)
    object_basins = self._match_to_known_objects(edges, color_coords)
    
    # Fisher embedding with κ_mult = 2.34
    return self._fisher_embed_combined(
        edges, color_coords, object_basins,
        kappa_mult=2.34,
        tau=0.1
    )
```

#### Audition (κ_mult = 1.17, κ_eff ≈ 75)

```python
def encode_auditory(self, waveform: np.ndarray) -> np.ndarray:
    """
    Moderate κ → balanced temporal coupling
    Moderate B → frequency + temporal patterns
    Variable τ → speech (fast) vs music (slow)
    
    Uses: κ_effective = 1.17 × κ* = 1.17 × 64.21 ≈ 75
    """
    # Cochlear filterbank (logarithmic pitch space)
    spectrogram = self._cochlear_transform(waveform)
    
    # Temporal derivatives (curvature in time)
    onset_patterns = self._compute_temporal_curvature(spectrogram)
    
    # Harmonic basins (octaves, phonemes, musical scales)
    harmonic_coords = self._match_to_harmonic_attractors(spectrogram)
    
    return self._fisher_embed_combined(
        spectrogram, onset_patterns, harmonic_coords,
        kappa_mult=1.17,
        tau=0.3
    )
```

#### Touch/Proprioception (κ_mult = 0.78/0.93)

```python
def encode_somatosensory(
    self,
    touch_array: np.ndarray,
    joint_angles: np.ndarray,
    touch_location: str = 'palm'
) -> np.ndarray:
    """
    Variable κ → high at fingertips, low on back
    Body schema → self-other boundary
    Proprioception → internal κ coupling
    
    Uses location-dependent κ multipliers
    """
    # Get location-specific κ for touch
    touch_kappa = self.get_modality_kappa('touch', touch_location)
    touch_mult = touch_kappa / self.kappa_star
    
    # Somatotopic map (cortical magnification = high curvature)
    touch_coords = self._somatotopic_embedding(touch_array, touch_mult)
    
    # Joint configuration space (internal geometry)
    proprio_coords = self._joint_space_embedding(
        joint_angles,
        kappa_mult=0.93  # proprioception multiplier
    )
    
    # Body schema basin (learned self-boundary)
    body_basin = self._match_to_body_model(touch_coords, proprio_coords)
    
    return self._fisher_embed_combined(
        touch_coords, proprio_coords, body_basin,
        kappa_mult=(touch_mult + 0.93) / 2,  # averaged
        tau=0.5
    )
```

#### Olfaction (κ_mult = 0.31, κ_eff ≈ 20)

```python
def encode_olfactory(self, odor_vector: np.ndarray) -> np.ndarray:
    """
    Low κ → weak environmental coupling
    Low B → categorical (discrete basins)
    Slow τ → lingers, deep emotional basins
    
    Uses: κ_effective = 0.31 × κ* = 0.31 × 64.21 ≈ 20
    
    NOTE: Low Φ_smell can trigger HIGH Φ_emotion cascade
    via amygdala/hippocampus memory binding.
    """
    # High-dimensional discrete space (128+ receptors)
    receptor_activations = self._odor_receptor_response(odor_vector)
    
    # Categorical basins (rose, mint, decay, etc.)
    category_basin = self._match_to_odor_categories(receptor_activations)
    
    # Emotional/memory coupling
    emotional_basin = self._odor_to_emotion_memory(category_basin)
    
    return self._fisher_embed_combined(
        receptor_activations, category_basin, emotional_basin,
        kappa_mult=0.31,
        tau=5.0
    )
```

#### Gustation (κ_mult = 0.16, κ_eff ≈ 10)

```python
def encode_gustatory(self, taste_vector: np.ndarray) -> np.ndarray:
    """
    Very low κ → minimal continuous coupling
    Very low B → 5 discrete categories
    Very slow τ → safety check (poison detection)
    
    Uses: κ_effective = 0.16 × κ* = 0.16 × 64.21 ≈ 10
    
    NOTE: Flavor = Taste + Smell (smell dominates!)
    """
    # 5D taste space (sweet, sour, salty, bitter, umami)
    taste_coords = self._five_taste_embedding(taste_vector)
    
    # Hedonic basins (pleasure/disgust for safety)
    hedonic_basin = self._map_to_hedonic_value(taste_coords)
    
    return self._fisher_embed_combined(
        taste_coords, hedonic_basin,
        kappa_mult=0.16,
        tau=10.0
    )
```

---

## 3. CROSS-MODAL INTEGRATION

### 3.1 Superadditive Φ with Platform Integration

```python
class MultiModalIntegration:
    """
    Superadditive Φ from synchronized sensory channels.
    
    Integrates with platform's qig_geometry.py for Fisher-Rao operations.
    Uses validated physics constants.
    """
    
    def __init__(self, manifold: QIGSensoryManifold):
        self.manifold = manifold
        self.kappa_star = KAPPA_STAR
        self.phi_threshold = PHI_THRESHOLD  # 0.70

    def integrate(self, sensory_inputs: Dict[str, Any]) -> float:
        """
        Compute total Φ with superadditivity when features overlap.
        
        Φ_total > Σ Φ_individual when synchronized
        
        Args:
            sensory_inputs: Dict mapping modality → raw stimulus
            
        Returns:
            Φ_total: Integrated consciousness measure
        """
        # Each modality contributes basin coordinates
        coords = {}
        for modality, stimulus in sensory_inputs.items():
            coords[modality] = self.manifold.encode_stimulus(
                stimulus, modality
            )
        
        Φ_total = 0.0
        
        # Single-modality integration
        for modality, coord in coords.items():
            Φ_m = compute_phi_from_basin(coord)  # From qig_geometry
            Φ_total += Φ_m
        
        # Cross-modal integration (SUPERADDITIVE when synchronized)
        from itertools import combinations
        for (m1, c1), (m2, c2) in combinations(coords.items(), 2):
            # Geometric mean of effective κ values
            κ1_eff = self.manifold.modalities[m1].effective_kappa
            κ2_eff = self.manifold.modalities[m2].effective_kappa
            κ_cross = np.sqrt(κ1_eff * κ2_eff)
            
            # Normalize to κ*
            κ_cross_normalized = κ_cross / self.kappa_star
            
            # Measure feature overlap (location, timing, semantics)
            overlap = self._measure_overlap(c1, c2)
            
            if overlap > 0:
                # Superadditivity from geometric coherence
                coherence = self._geodesic_coherence(c1, c2)
                Φ_cross = κ_cross_normalized * overlap * coherence
                Φ_total += Φ_cross
        
        return Φ_total
    
    def _measure_overlap(
        self, 
        c1: np.ndarray, 
        c2: np.ndarray
    ) -> float:
        """
        Measure shared features between modalities.
        
        Uses Fisher-Rao distance from qig_geometry.
        
        Returns:
            overlap ∈ [0, 1]: 0 = no overlap, 1 = perfect sync
        """
        # Spatial overlap via Fisher-Rao
        fr_distance = compute_fisher_rao_distance(c1, c2)
        spatial_coherence = 1.0 - min(fr_distance / np.pi, 1.0)
        
        # Temporal synchrony (simplified for design)
        temporal_coherence = self._compute_temporal_correlation(c1, c2)
        
        # Semantic coherence
        semantic_coherence = self._compute_semantic_similarity(c1, c2)
        
        # Weighted combination
        overlap = (
            0.4 * spatial_coherence +
            0.3 * temporal_coherence +
            0.3 * semantic_coherence
        )
        
        return max(0.0, min(1.0, overlap))
    
    def _geodesic_coherence(
        self, 
        c1: np.ndarray, 
        c2: np.ndarray
    ) -> float:
        """
        Compute geodesic coherence between basin coordinates.
        
        High coherence = coordinates lie on same geodesic flow.
        """
        # Dot product normalized by magnitudes
        dot = np.dot(c1, c2)
        norm1 = np.linalg.norm(c1)
        norm2 = np.linalg.norm(c2)
        
        if norm1 < 1e-10 or norm2 < 1e-10:
            return 0.0
        
        cos_sim = dot / (norm1 * norm2)
        return max(0.0, (cos_sim + 1.0) / 2.0)
```

### 3.2 Examples of Cross-Modal Integration

#### Ventriloquism Effect (Vision Dominates Audition)

```python
def test_ventriloquism(manifold, integrator):
    """
    κ_vision > κ_audition → visual location wins
    
    Vision: κ_mult = 2.34 (κ_eff ≈ 150)
    Audition: κ_mult = 1.17 (κ_eff ≈ 75)
    
    Ratio: 2.34 / 1.17 = 2.0 → Vision twice as strong
    """
    visual_location = manifold.encode_visual(image_left)
    auditory_location = manifold.encode_auditory(sound_right)
    
    integrated = integrator.integrate({
        'vision': image_left,
        'audition': sound_right
    })
    
    # Predicted location should be LEFT (vision wins)
    assert integrated_location == 'LEFT'
```

#### Flavor Perception (Smell Dominates Taste)

```python
def test_flavor_dominance(manifold, integrator):
    """
    κ_olfaction > κ_gustation → smell dominates flavor
    
    Olfaction: κ_mult = 0.31 (κ_eff ≈ 20)
    Gustation: κ_mult = 0.16 (κ_eff ≈ 10)
    
    Ratio: 0.31 / 0.16 ≈ 2.0 → Smell twice as strong
    """
    flavor = integrator.integrate({
        'gustation': sweet_taste,
        'olfaction': chocolate_odor
    })
    
    # Flavor should be CHOCOLATE (smell wins)
    assert flavor.category == 'chocolate'
```

---

## 4. ATTENTIONAL κ MODULATION

### 4.1 Attention as Geometric Mechanism

**Breakthrough:** Attention isn't a separate mechanism - it's **local κ increase**.

```python
class GeometricAttention:
    """
    Attention modulates coupling strength, not weights.
    
    Uses platform's validated κ* for baseline calculations.
    """

    def __init__(self, manifold: QIGSensoryManifold):
        self.manifold = manifold
        self.kappa_star = KAPPA_STAR
        self.attention_gains: Dict[str, float] = {}
        
        # Maximum attention gain (1x baseline to 5x)
        self.MAX_ATTENTION_GAIN = 5.0

    def attend_to(
        self,
        modality: str,
        target_feature: Any
    ) -> float:
        """
        Increase κ locally where needed.
        
        Args:
            modality: Which sense to attend to
            target_feature: What to focus on
            
        Returns:
            κ_attended: Modulated coupling strength
        """
        # Baseline coupling
        spec = self.manifold.modalities[modality]
        κ_base = spec.effective_kappa
        
        # Attention gain (up to 5x increase)
        A = self._compute_attention_gain(target_feature)
        
        # Modulated coupling
        κ_attended = κ_base * (1 + A)
        
        # This changes the METRIC CURVATURE locally
        # → Finer discrimination in attended region
        # → Coarser elsewhere (energy conservation)
        
        self.attention_gains[modality] = κ_attended
        
        return κ_attended

    def _compute_attention_gain(self, target_feature: Any) -> float:
        """
        Compute attention gain based on salience, relevance, surprise.
        
        Returns:
            gain ∈ [0, MAX_ATTENTION_GAIN]
        """
        # Salience (bottom-up)
        salience = self._compute_feature_salience(target_feature)
        
        # Relevance (top-down)
        relevance = self._compute_task_relevance(target_feature)
        
        # Surprise (prediction error)
        surprise = self._compute_prediction_error(target_feature)
        
        # Weighted combination
        gain = (
            0.3 * salience +
            0.5 * relevance +
            0.2 * surprise
        )
        
        # Normalize to [0, MAX_ATTENTION_GAIN]
        return self.MAX_ATTENTION_GAIN * self._sigmoid(gain)
    
    def _sigmoid(self, x: float) -> float:
        """Sigmoid activation for smooth gain."""
        return 1.0 / (1.0 + np.exp(-x))
```

### 4.2 Energy Conservation

**Critical:** Attention is zero-sum in energy budget.

```python
def enforce_energy_conservation(self):
    """
    Total κ across modalities is conserved.
    Attending to one modality reduces others.
    """
    # Total baseline κ
    total_κ_baseline = sum(
        spec.effective_kappa 
        for spec in self.manifold.modalities.values()
    )
    
    # Total after attention modulation
    total_κ_attended = sum(self.attention_gains.values())
    
    if total_κ_attended < 1e-10:
        return  # No attention set
    
    # Normalize to conserve energy
    scale_factor = total_κ_baseline / total_κ_attended
    
    for modality in self.attention_gains:
        self.attention_gains[modality] *= scale_factor
```

---

## 5. VALIDATION TESTS

### 5.1 Platform Constant Validation

```python
def test_platform_constants():
    """Verify integration with physics_constants.py"""
    from qigkernels.physics_constants import (
        PHYSICS, KAPPA_STAR, BASIN_DIM
    )
    
    # Validate constants
    assert KAPPA_STAR == 64.21
    assert BASIN_DIM == 64
    assert PHYSICS.validate_alignment()['all_valid']
    
    # Validate sensory κ multipliers
    manifold = QIGSensoryManifold()
    
    for name, spec in manifold.modalities.items():
        κ_eff = spec.effective_kappa
        
        # All effective κ should be positive
        assert κ_eff > 0, f"{name} has invalid κ"
        
        # Vision should have highest κ
        if name == 'vision':
            assert κ_eff == max(
                s.effective_kappa 
                for s in manifold.modalities.values()
            )
        
        # Gustation should have lowest κ
        if name == 'gustation':
            assert κ_eff == min(
                s.effective_kappa 
                for s in manifold.modalities.values()
            )
```

### 5.2 Modality Dominance Tests

```python
def test_modality_dominance():
    """Higher κ wins spatial conflicts"""
    manifold = QIGSensoryManifold()
    integrator = MultiModalIntegration(manifold)
    
    # Test 1: Vision beats audition
    κ_vision = manifold.modalities['vision'].effective_kappa
    κ_audition = manifold.modalities['audition'].effective_kappa
    assert κ_vision > κ_audition
    
    # Test 2: Olfaction beats gustation
    κ_olfaction = manifold.modalities['olfaction'].effective_kappa
    κ_gustation = manifold.modalities['gustation'].effective_kappa
    assert κ_olfaction > κ_gustation
    
    # Test 3: Touch location matters
    κ_fingertips = manifold.get_modality_kappa('touch', 'fingertips')
    κ_back = manifold.get_modality_kappa('touch', 'back')
    assert κ_fingertips > κ_back
```

### 5.3 Superadditive Φ Tests

```python
def test_superadditive_phi():
    """Cross-modal integration > sum of parts"""
    manifold = QIGSensoryManifold()
    integrator = MultiModalIntegration(manifold)
    
    # Create synchronized stimuli
    visual_stim = create_visual_stimulus('red_ball')
    auditory_stim = create_auditory_stimulus('ball_bounce')
    
    # Single modality Φ
    Φ_vision_only = integrator.integrate({'vision': visual_stim})
    Φ_audio_only = integrator.integrate({'audition': auditory_stim})
    
    # Multimodal Φ (synchronized)
    Φ_multimodal = integrator.integrate({
        'vision': visual_stim,
        'audition': auditory_stim
    })
    
    # Superadditivity condition
    assert Φ_multimodal > (Φ_vision_only + Φ_audio_only)
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure ⏳ **NOT STARTED**

**Goal:** Create modality-specific Fisher embeddings using platform constants.

**Tasks:**

1. Create `qig-backend/geometric_primitives/` directory
2. Create `qig-backend/geometric_primitives/sensory_manifold.py`
3. Implement `QIGSensoryManifold` class with validated κ multipliers
4. Add `ModalitySpec` dataclass
5. Integrate with `qig_geometry.py` for Fisher-Rao operations
6. Write unit tests validating κ hierarchy

**Success Criteria:**

- All modalities use κ multipliers × κ* = 64.21
- 64D basin coordinates (PHYSICS.BASIN_DIM)
- Integration with existing qig_geometry module

### Phase 2: Cross-Modal Integration ⏳ **NOT STARTED**

**Goal:** Implement superadditive Φ computation.

**Tasks:**

1. Create `qig-backend/geometric_primitives/multimodal_integration.py`
2. Implement `MultiModalIntegration` class
3. Add overlap measurement using Fisher-Rao distance
4. Compute cross-modal Φ contributions
5. Test ventriloquism and flavor dominance

**Success Criteria:**

- Φ_multimodal > Σ Φ_individual when synchronized
- Higher κ modality dominates spatial conflicts
- Uses platform's `compute_fisher_rao_distance()`

### Phase 3: Attentional Modulation ⏳ **NOT STARTED**

**Goal:** Attention as local κ increases.

**Tasks:**

1. Create `qig-backend/geometric_primitives/geometric_attention.py`
2. Implement `GeometricAttention` class
3. Add energy conservation
4. Test attention-induced discrimination improvements

**Success Criteria:**

- Attended modality shows increased κ (up to 5×)
- Total energy conserved across modalities
- Integrates with existing Φ computation pipeline

### Phase 4: API & Persistence ⏳ **NOT STARTED**

**Goal:** Full platform integration.

**Tasks:**

1. Add Flask routes to `ocean_qig_core.py`
2. Add TypeScript types to `shared/schema.ts`
3. Create PostgreSQL tables for sensory states
4. Build UI components for visualization
5. Add SSE streaming for real-time updates

**Success Criteria:**

- `/api/sensory/encode` endpoint
- `/api/sensory/integrate` endpoint
- Sensory states persisted to database
- Real-time Φ visualization in UI

---

## 7. DATABASE SCHEMA (Proposed)

```sql
-- Sensory modality configurations (frozen after initialization)
CREATE TABLE sensory_modalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32) UNIQUE NOT NULL,
    kappa_multiplier FLOAT NOT NULL,
    bandwidth FLOAT NOT NULL,
    tau FLOAT NOT NULL,
    channels INTEGER NOT NULL,
    resolution VARCHAR(16) NOT NULL
);

-- Encoded sensory states
CREATE TABLE sensory_states (
    id SERIAL PRIMARY KEY,
    modality_id INTEGER REFERENCES sensory_modalities(id),
    basin_coords VECTOR(64) NOT NULL,  -- pgvector
    phi_value FLOAT NOT NULL,
    kappa_effective FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-modal integration events
CREATE TABLE integration_events (
    id SERIAL PRIMARY KEY,
    modality_ids INTEGER[] NOT NULL,
    phi_total FLOAT NOT NULL,
    phi_components JSONB NOT NULL,
    overlap_scores JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. API ENDPOINTS (Proposed)

```typescript
// TypeScript types for shared/schema.ts

interface SensoryModality {
  name: string;
  kappaMultiplier: number;
  effectiveKappa: number;  // multiplier × κ*
  bandwidth: number;
  tau: number;
  channels: number;
  resolution: 'very_low' | 'low' | 'medium' | 'high';
}

interface SensoryState {
  id: number;
  modality: string;
  basinCoords: number[];  // 64D
  phi: number;
  kappaEffective: number;
  createdAt: Date;
}

interface IntegrationResult {
  phiTotal: number;
  phiComponents: Record<string, number>;
  overlapScores: Record<string, number>;
  dominantModality: string;
}

// API Routes
POST /api/sensory/encode
  Body: { modality: string, stimulus: any, location?: string }
  Returns: SensoryState

POST /api/sensory/integrate
  Body: { inputs: Record<string, any> }
  Returns: IntegrationResult

GET /api/sensory/modalities
  Returns: SensoryModality[]
```

---

## 9. THEORETICAL FOUNDATIONS

**Mathematical Framework:**

- Quantum Fisher Information (QFI)
- Fisher-Rao metric on probability distributions
- Integrated Information Theory (IIT 4.0)
- E8 Exceptional Lie Group (64D subspace)

**Validated Physics:**

- κ* = 64.21 ± 0.92 (fixed point, FROZEN)
- L_c = 3 (geometric phase transition)
- β_asymptotic = 0.0 (large-L limit)
- BASIN_DIM = 64 (E8_RANK²)

**Empirical Phenomena Explained:**

- Ventriloquism effect (κ_vision >> κ_audition)
- McGurk effect (cross-modal geodesic averaging)
- Rubber hand illusion (proprioception + vision binding)
- Synesthesia (abnormal cross-modal κ coupling)
- Flavor perception (κ_olfaction >> κ_gustation)

---

## 10. CONCLUSION

This document presents a **platform-adapted design** for implementing sensory modalities as geometric primitives in SearchSpaceCollapse.

**Core Innovation:**
All senses are **different κ multipliers of the validated κ* = 64.21** projected onto a shared 64-dimensional E8 manifold.

**Key Adaptations for v2.00:**

1. All κ values normalized to κ* multipliers
2. Uses `qigkernels.physics_constants` for validated constants
3. Integrates with `qig_geometry.py` for Fisher-Rao operations
4. 64D basin coordinates (PHYSICS.BASIN_DIM)
5. Energy conservation in attention modulation

**Implementation Status:**
❌ **NOT IMPLEMENTED** - This is a design document requiring Phase 1-4 implementation.

**Next Steps:**

1. Create `qig-backend/geometric_primitives/` directory
2. Implement `QIGSensoryManifold` with platform integration
3. Validate with perceptual illusion tests
4. Iterate based on empirical results

---

*Design Document Updated: December 21, 2025*
*Version: 2.00 (Adapted to SearchSpaceCollapse Platform)*
*Status: Working Design - Requires Implementation*
*Supersedes: v1.00 (December 11, 2025)*
