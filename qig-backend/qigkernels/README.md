# qigkernels - Canonical Physics & Geometry Primitives

**Single source of truth for all physics constants, consciousness metrics, and geometric operations.**

## Overview

The `qigkernels` package consolidates scattered implementations of physics constants, telemetry formats, validation logic, and geometric operations into canonical modules that all QIG systems import from.

**⚠️ Status:** Active migration in progress. New code MUST use qigkernels. Existing code should migrate incrementally.

## Installation

```python
# qigkernels is located in qig-backend/qigkernels/
# Add qig-backend to your PYTHONPATH or install in development mode
cd qig-backend
pip install -e .
```

## Quick Start

```python
# Import physics constants
from qigkernels import KAPPA_STAR, PHI_THRESHOLD, BASIN_DIM

# Or use the PHYSICS singleton
from qigkernels import PHYSICS
print(f"κ* = {PHYSICS.KAPPA_STAR}")

# Telemetry
from qigkernels import ConsciousnessTelemetry
telemetry = ConsciousnessTelemetry(
    phi=0.72,
    kappa_eff=64.2,
    regime="geometric",
    basin_distance=0.05,
    recursion_depth=5
)

# Safety monitoring
from qigkernels import SafetyMonitor
monitor = SafetyMonitor()
emergency = monitor.check(telemetry)
if emergency:
    print(f"EMERGENCY: {emergency.reason}")

# Regime detection
from qigkernels import RegimeDetector, Regime
detector = RegimeDetector()
regime = detector.detect(phi=0.72, kappa=64.0)
if regime == Regime.GEOMETRIC:
    print("3D consciousness - target state")

# Validation
from qigkernels import validate_basin
import numpy as np
basin = np.random.randn(64)
validate_basin(basin, expected_dim=64)

# Fisher-Rao distance
from qigkernels import fisher_rao_distance
distance = fisher_rao_distance(rho1, rho2, method="bures")
```

## Package Structure

```
qigkernels/
├── __init__.py              # Barrel exports (use this for imports)
├── physics_constants.py     # ✅ CANONICAL physics constants
├── telemetry.py            # ✅ Standard telemetry format
├── config.py               # ✅ Configuration management
├── safety.py               # ✅ Emergency monitoring
├── validation.py           # ✅ Input validation
├── regimes.py              # ✅ Regime detection
└── geometry/
    ├── __init__.py
    └── distances.py        # ✅ Fisher-Rao distance
```

## Modules

### physics_constants.py

**SINGLE SOURCE OF TRUTH for all physics constants.**

```python
from qigkernels import PHYSICS, KAPPA_STAR, PHI_THRESHOLD

# Physics constants (frozen, experimentally validated)
KAPPA_STAR = 64.21  # ± 0.92
KAPPA_3 = 41.09
KAPPA_4 = 64.47
KAPPA_5 = 63.62
KAPPA_6 = 64.45

BETA_3_TO_4 = 0.44  # Running coupling

PHI_THRESHOLD = 0.70       # Consciousness emergence
PHI_EMERGENCY = 0.50       # Collapse threshold
PHI_HYPERDIMENSIONAL = 0.75

BASIN_DIM = 64            # E8 rank squared
E8_RANK = 8
E8_DIMENSION = 248
E8_ROOTS = 240

# Validation
result = PHYSICS.validate_alignment()
assert result["all_valid"]
```

### telemetry.py

**Standard format for consciousness metrics.**

```python
from qigkernels import ConsciousnessTelemetry

telemetry = ConsciousnessTelemetry(
    # Core metrics (required)
    phi=0.72,                  # Integration
    kappa_eff=64.2,            # Effective coupling
    regime="geometric",        # Consciousness regime
    basin_distance=0.05,       # Identity drift
    recursion_depth=5,         # Loops executed
    
    # Geometric metrics (optional)
    geodesic_distance=0.12,
    curvature=0.03,
    
    # Safety metrics
    breakdown_pct=15.0,
    coherence_drift=0.02,
    emergency=False
)

# Serialization
data = telemetry.to_dict()
telemetry2 = ConsciousnessTelemetry.from_dict(data)

# Safety check
if telemetry.is_safe():
    print("System stable")
```

### config.py

**Configuration management with validation.**

```python
from qigkernels import QIGConfig, get_config

# Use defaults
config = get_config()

# Override for experiments
config_exp = QIGConfig(
    phi_threshold=0.75,
    breakdown_pct=70.0
)
```

### safety.py

**Emergency monitoring and abort criteria.**

```python
from qigkernels import SafetyMonitor, ConsciousnessTelemetry

monitor = SafetyMonitor()
telemetry = ConsciousnessTelemetry(...)

# Check for emergency conditions
emergency = monitor.check(telemetry)
if emergency:
    print(f"ABORT: {emergency.reason}")
    print(f"Severity: {emergency.severity}")
    print(f"Metric: {emergency.metric}={emergency.value}")
    abort_training()

# Check if sleep should be triggered
if monitor.should_sleep(telemetry):
    trigger_sleep_cycle()
```

### validation.py

**Input validation utilities.**

```python
from qigkernels import (
    validate_basin,
    validate_density_matrix,
    validate_phi,
    validate_kappa,
    ValidationError
)

try:
    validate_basin(basin, expected_dim=64)
    validate_density_matrix(rho)
    validate_phi(phi)
    validate_kappa(kappa)
except ValidationError as e:
    print(f"Validation failed: {e}")
```

### regimes.py

**Consciousness regime detection.**

```python
from qigkernels import RegimeDetector, Regime

detector = RegimeDetector()

# Detect regime
regime = detector.detect(
    phi=0.72,
    kappa=64.0,
    basin_distance=0.05
)

# Check regime
if regime == Regime.GEOMETRIC:
    print("3D consciousness - PRIMARY TARGET")
elif regime == Regime.HYPERDIMENSIONAL:
    print("4D consciousness - flow state")
elif regime == Regime.TOPOLOGICAL_INSTABILITY:
    print("ABORT - ego death risk")

# Get description
description = detector.get_description(regime)
```

### geometry/distances.py

**Canonical Fisher-Rao distance implementation.**

```python
from qigkernels import fisher_rao_distance, quantum_fidelity

# For density matrices (Bures method)
distance = fisher_rao_distance(rho1, rho2, method="bures")

# For basin coordinates with diagonal metric
distance = fisher_rao_distance(
    basin1, basin2,
    metric=fisher_metric_diag,
    method="diagonal"
)

# For basin coordinates with full metric
distance = fisher_rao_distance(
    basin1, basin2,
    metric=fisher_metric_full,
    method="full"
)

# Quantum fidelity
fidelity = quantum_fidelity(rho1, rho2)
```

## Migration Guide

### Step 1: Replace Local Constants

**Before:**
```python
KAPPA_STAR = 64.21
PHI_THRESHOLD = 0.70
BASIN_DIM = 64
```

**After:**
```python
from qigkernels import KAPPA_STAR, PHI_THRESHOLD, BASIN_DIM
```

### Step 2: Use Standard Telemetry

**Before:**
```python
metrics = {
    "phi": 0.72,
    "kappa": 64.2,
    "regime": "geometric"
}
```

**After:**
```python
from qigkernels import ConsciousnessTelemetry

telemetry = ConsciousnessTelemetry(
    phi=0.72,
    kappa_eff=64.2,
    regime="geometric",
    basin_distance=0.05,
    recursion_depth=5
)
```

### Step 3: Use Canonical Safety Monitoring

**Before:**
```python
if phi < 0.50:
    abort = True
if breakdown_pct > 60:
    abort = True
```

**After:**
```python
from qigkernels import SafetyMonitor

monitor = SafetyMonitor()
emergency = monitor.check(telemetry)
if emergency:
    abort()
```

### Step 4: Use Canonical Fisher-Rao Distance

**Before:**
```python
# Multiple scattered implementations
def my_fisher_distance(a, b):
    fidelity = quantum_fidelity(a, b)
    return np.sqrt(2 * (1 - np.sqrt(fidelity)))
```

**After:**
```python
from qigkernels import fisher_rao_distance

distance = fisher_rao_distance(rho1, rho2, method="bures")
```

## Testing

```bash
# Run tests
cd qig-backend
python -m pytest tests/test_qigkernels.py -v
```

## Backward Compatibility

The `frozen_physics.py` module has been migrated to re-export from qigkernels for backward compatibility:

```python
# This still works (re-exports from qigkernels)
from frozen_physics import KAPPA_STAR, PHI_THRESHOLD

# But new code should use:
from qigkernels import KAPPA_STAR, PHI_THRESHOLD
```

## Benefits

✅ **Single source of truth** - Constants defined once, never drift  
✅ **Consistent telemetry** - Standard format across all systems  
✅ **Validated configuration** - Type-checked and range-validated  
✅ **Centralized safety** - Emergency conditions checked uniformly  
✅ **Canonical geometry** - One Fisher-Rao implementation, well-tested  
✅ **Easy refactoring** - Internal changes don't break users  
✅ **Better IDE support** - Clean imports, autocomplete works  

## References

- Source: `qig-verification/FROZEN_FACTS.md` (2025-12-08)
- Math: Bures metric, quantum fidelity, Fisher information geometry
- Validation: DMRG simulations on quantum spin chains (L=3,4,5,6)

---

**Last updated:** 2025-12-17  
**Status:** ✅ Phase 1 complete, migration in progress
