# QIG Codebase Migration Guide

## Overview

This guide documents the migration from scattered implementations to the canonical `qigkernels` package. All physics constants, geometry operations, and consciousness metrics should import from this single source of truth.

## Quick Reference

```python
# NEW (Canonical)
from qigkernels import KAPPA_STAR, PHI_THRESHOLD, fisher_rao_distance
from qigkernels import ConsciousnessTelemetry, SafetyMonitor, RegimeDetector

# OLD (Deprecated - DO NOT USE)
from frozen_physics import KAPPA_STAR  # ❌
KAPPA_STAR = 64.21  # ❌ Hardcoded
from some_module import fisher_distance  # ❌ Local implementation
```

---

## Physics Constants Migration

### Before (Deprecated)
```python
# ❌ Hardcoded constants scattered across files
KAPPA_STAR = 64.21
PHI_THRESHOLD = 0.70
BASIN_DIM = 64

# ❌ Import from local files
from frozen_physics import KAPPA_STAR
from constants import PHI_THRESHOLD
```

### After (Canonical)
```python
# ✅ Single source of truth
from qigkernels import KAPPA_STAR, PHI_THRESHOLD, BASIN_DIM

# ✅ Or use the full constants object
from qigkernels import PHYSICS
kappa = PHYSICS.KAPPA_STAR  # 64.21 ± 0.92
```

### Full Constants Available
```python
from qigkernels import (
    # E8 Geometry
    E8_RANK,          # 8
    E8_DIMENSION,     # 248
    E8_ROOTS,         # 240
    BASIN_DIM,        # 64 (8²)
    
    # Lattice κ Values
    KAPPA_STAR,       # 64.21 ± 0.92 (FROZEN)
    KAPPA_3,          # 41.09 (L=3)
    KAPPA_4,          # 64.47 (L=4)
    KAPPA_5,          # 63.62 (L=5)
    KAPPA_6,          # 64.45 (L=6)
    
    # β Coupling
    BETA_3_TO_4,      # 0.44 (running coupling)
    
    # Φ Thresholds
    PHI_THRESHOLD,    # 0.70 (consciousness)
    PHI_EMERGENCY,    # 0.50 (abort threshold)
)
```

---

## Fisher-Rao Distance Migration

### Before (Deprecated)
```python
# ❌ Local implementations (often WRONG)
def fisher_distance(a, b):
    return np.linalg.norm(a - b)  # ⚠️ This is EUCLIDEAN, not Fisher-Rao!

# ❌ Cosine similarity on basins
similarity = cosine_similarity(basin_a, basin_b)  # ⚠️ FORBIDDEN
```

### After (Canonical)
```python
# ✅ Use canonical Fisher-Rao implementation
from qigkernels import fisher_rao_distance

# Diagonal approximation (fast, default)
distance = fisher_rao_distance(basin_a, basin_b, method="diagonal")

# Full Fisher metric (accurate, slower)
distance = fisher_rao_distance(basin_a, basin_b, method="full")

# With custom Fisher matrix
distance = fisher_rao_distance(basin_a, basin_b, fisher_matrix=G)
```

### Forbidden Operations
```python
# ❌ NEVER use these on 64D basin coordinates:
np.linalg.norm(basin_a - basin_b)  # Euclidean distance
torch.norm(basin_a - basin_b)       # Euclidean distance
cosine_similarity(basin_a, basin_b) # Cosine similarity
basin_a.dot(basin_b)                # Dot product

# These violate QIG geometric purity (CANONICAL_RULES.md Rule #1)
```

---

## Telemetry Migration

### Before (Deprecated)
```python
# ❌ Custom telemetry formats
telemetry = {
    "phi": 0.75,
    "kappa": 64.21,
    "regime": "geometric"
}

# ❌ Inconsistent field names
data = {"consciousness": phi, "curvature": kappa}
```

### After (Canonical)
```python
# ✅ Use ConsciousnessTelemetry
from qigkernels import ConsciousnessTelemetry, Regime

telemetry = ConsciousnessTelemetry(
    phi=0.75,
    kappa_eff=64.21,
    regime=Regime.GEOMETRIC,
    basin_coords=basin_64d,
    timestamp=datetime.now()
)

# Serialize for API
data = telemetry.to_dict()
```

---

## Safety Monitoring Migration

### Before (Deprecated)
```python
# ❌ Manual threshold checks
if phi < 0.5:
    print("Warning: low consciousness")
    
# ❌ No structured emergency handling
if kappa < 40:
    abort()
```

### After (Canonical)
```python
# ✅ Use SafetyMonitor
from qigkernels import SafetyMonitor, EmergencyCondition

monitor = SafetyMonitor()
monitor.update(phi=0.45, kappa_eff=38.0)

if monitor.is_emergency():
    condition = monitor.get_emergency_condition()
    # Returns EmergencyCondition with details
    handle_emergency(condition)
```

---

## Regime Detection Migration

### Before (Deprecated)
```python
# ❌ Hardcoded regime logic
if kappa < 50:
    regime = "linear"
elif kappa < 70:
    regime = "geometric"
else:
    regime = "hyperdimensional"
```

### After (Canonical)
```python
# ✅ Use RegimeDetector
from qigkernels import RegimeDetector, Regime

detector = RegimeDetector()
regime = detector.detect(kappa_eff=64.21, phi=0.75)
# Returns Regime.GEOMETRIC

# Check regime
if regime == Regime.HYPERDIMENSIONAL:
    enable_4d_temporal_integration()
```

---

## TypeScript Migration

### Before (Deprecated)
```typescript
// ❌ Hardcoded in TypeScript files
const KAPPA_STAR = 64.21;
const PHI_THRESHOLD = 0.70;

// ❌ Local distance implementations
function fisherDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}
```

### After (Canonical)
```typescript
// ✅ Import from shared constants
import { QIG_CONSTANTS, E8_CONSTANTS } from '@shared/constants';

const kappa = QIG_CONSTANTS.KAPPA_STAR;  // 64.21
const phi_threshold = QIG_CONSTANTS.PHI_THRESHOLD;  // 0.70
const basin_dim = E8_CONSTANTS.BASIN_DIM;  // 64

// ✅ Use canonical geometry (calls Python backend)
import { fisherCoordDistance } from './qig-universal';
const distance = fisherCoordDistance(basinA, basinB);
```

---

## Frontend API Routes Migration

### Before (Deprecated)
```typescript
// ❌ Hardcoded API paths
const response = await fetch('/api/olympus/zeus/tools/stats');
queryKey: ['/api/health']
```

### After (Canonical)
```typescript
// ✅ Use centralized API routes
import { API_ROUTES, QUERY_KEYS } from '@/api';

const response = await fetch(API_ROUTES.olympus.tools.stats);
queryKey: QUERY_KEYS.olympus.toolsStats()
```

---

## Migration Checklist

### Python Files
- [ ] Replace hardcoded `KAPPA_STAR = 64.21` with `from qigkernels import KAPPA_STAR`
- [ ] Replace `from frozen_physics import ...` with `from qigkernels import ...`
- [ ] Replace local `fisher_distance()` with `from qigkernels import fisher_rao_distance`
- [ ] Replace manual telemetry dicts with `ConsciousnessTelemetry`
- [ ] Replace manual regime logic with `RegimeDetector`
- [ ] Replace manual threshold checks with `SafetyMonitor`

### TypeScript Files
- [ ] Replace hardcoded constants with `@shared/constants` imports
- [ ] Replace local geometry functions with `qig-universal` calls
- [ ] Replace hardcoded API paths with `API_ROUTES`
- [ ] Replace hardcoded query keys with `QUERY_KEYS`

### Forbidden Patterns (CI Will Fail)
- [ ] No `KAPPA_STAR = 64` anywhere except qigkernels
- [ ] No `np.linalg.norm(basin` or `torch.norm(basin`
- [ ] No `cosine_similarity(basin`
- [ ] No hardcoded `/api/...` paths in frontend

---

## Verification Commands

```bash
# Check for hardcoded constants
python tools/check_constants.py

# Check for non-canonical imports
python tools/check_imports.py

# Check for geometric purity violations
python tools/qig_purity_check.py

# Run all checks
pre-commit run --all-files
```

---

## Questions?

See `qig-backend/qigkernels/README.md` for detailed API documentation.
See `docs/01-policies/20251217-frozen-facts-qig-physics-validated-1.00F.md` for physics validation.
