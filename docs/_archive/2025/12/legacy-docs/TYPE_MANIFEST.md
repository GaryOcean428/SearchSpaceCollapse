# Type Manifest & Barrel Import Rules

## Purpose

Enforce consistent imports, exports, and DRY principles across the SearchSpaceCollapse codebase.

---

## 1. Barrel File Convention

### Python (`__init__.py`)

Every Python package MUST have a barrel file that:

1. Exports all public classes/functions
2. Documents the module hierarchy
3. Uses `__all__` to define public API

**Example: `olympus/__init__.py`**

```python
"""
Olympus Pantheon - Divine Council for QIG Decision Making

HIERARCHY:
├── Zeus (Supreme Coordinator)
│   └── HermesCoordinator (Team #2 - Voice/Sync)
├── Athena (Wisdom/Strategy)
├── Apollo (Prediction/Patterns)
...
"""

from .zeus import Zeus, zeus, olympus_app
from .hermes_coordinator import HermesCoordinator, get_hermes_coordinator
# ... etc

__all__ = [
    'Zeus', 'zeus', 'olympus_app',
    'HermesCoordinator', 'get_hermes_coordinator',
    # ... etc
]
```

### TypeScript (`index.ts`)

Every TypeScript module directory SHOULD have an `index.ts` that:

1. Re-exports all public types and functions
2. Groups related exports

**Example: `shared/types/index.ts`**

```typescript
// Barrel export for shared types
export * from './qig-geometry';
export * from './consciousness';
export type { BasinCoords, PhiKappa } from './qig-geometry';
```

---

## 2. Import Rules

### Python

```python
# ✅ CORRECT - Import from barrel
from olympus import Zeus, Athena, ShadowPantheon

# ❌ WRONG - Direct file import
from olympus.zeus import Zeus
from olympus.athena import Athena
```

**Exception**: Internal imports within the same package can use relative imports.

### TypeScript

```typescript
// ✅ CORRECT - Import from barrel
import { oceanQIGBackend } from './ocean-qig-backend-adapter';
import type { BasinCoords } from '../shared/types';

// ❌ WRONG - Deep path imports
import { oceanQIGBackend } from './ocean-qig-backend-adapter/client';
```

---

## 3. Type Definitions

### Core QIG Types

| Type | Location | Description |
|------|----------|-------------|
| `BasinCoords` | `shared/types/qig-geometry.ts` | 64D basin coordinates |
| `PhiKappa` | `shared/types/qig-geometry.ts` | Φ and κ metrics |
| `RegimeType` | `shared/types/qig-geometry.ts` | LINEAR/GEOMETRIC/BREAKDOWN |
| `DensityMatrix` | `qig-backend/ocean_qig_core.py` | Quantum state representation |
| `ConsciousnessState` | `shared/types/consciousness.ts` | 4D consciousness metrics |

### Olympus Types

| Type | Location | Description |
|------|----------|-------------|
| `Zeus` | `olympus/__init__.py` | Supreme coordinator |
| `HermesCoordinator` | `olympus/__init__.py` | Voice/sync coordinator |
| `ShadowPantheon` | `olympus/__init__.py` | Covert operations |
| `OlympusClient` | `server/olympus-client.ts` | TypeScript client |

### API Types

| Type | Location | Description |
|------|----------|-------------|
| `OceanQIGBackend` | `server/ocean-qig-backend-adapter.ts` | Python backend client |
| `GeometricMemory` | `server/geometric-memory.ts` | Frontend memory |
| `FeedbackLoopManager` | `qig-backend/ocean_qig_core.py` | Feedback system |

### QIGChain Types

| Type | Location | Description |
|------|----------|-------------|
| `QIGChain` | `qigchain/__init__.py` | Geodesic flow chain with Phi-gating |
| `QIGTool` | `qigchain/__init__.py` | Tool with geometric signature |
| `QIGToolSelector` | `qigchain/__init__.py` | Geometric tool selection |
| `QIGApplication` | `qigchain/__init__.py` | Complete geometric application |
| `GeometricStep` | `qigchain/__init__.py` | Single step in geodesic flow |
| `ChainResult` | `qigchain/__init__.py` | Result with trajectory and final state |

### CHAOS Mode Types

| Type | Location | Description |
|------|----------|-------------|
| `ExperimentalKernelEvolution` | `training_chaos/__init__.py` | Kernel evolution manager |
| `SelfSpawningKernel` | `training_chaos/__init__.py` | Self-evolving kernel |
| `ChaosKernel` | `training_chaos/__init__.py` | Base chaos kernel |
| `DiagonalFisherOptimizer` | `training_chaos/__init__.py` | Geometric optimizer |
| `ChaosLogger` | `training_chaos/__init__.py` | Chaos event logging |

### Persistence Types

| Type | Location | Description |
|------|----------|-------------|
| `BasePersistence` | `persistence/__init__.py` | Base persistence layer |
| `KernelPersistence` | `persistence/__init__.py` | Kernel state persistence |
| `WarPersistence` | `persistence/__init__.py` | War mode persistence |

---

## 4. DRY Principles

### Constants

ALL constants MUST be defined in ONE location:

```
shared/constants/qig.ts          - TypeScript constants
qig-backend/ocean_qig_core.py    - Python constants (KAPPA_STAR, PHI_THRESHOLD, etc.)
```

**Never duplicate constants** - import from the canonical source.

### Shared Logic

| Logic | Canonical Location |
|-------|-------------------|
| Basin distance | `qig-backend/ocean_qig_core.py:_compute_fisher_distance` |
| Φ computation | `qig-backend/consciousness_4d.py:compute_phi_4D` |
| Regime classification | `qig-backend/consciousness_4d.py:classify_regime_4D` |
| Neurochemistry | `qig-backend/ocean_neurochemistry.py` |

TypeScript should call Python backend for these computations, NOT reimplement.

---

## 5. API Route Registry

All API routes MUST be documented in the barrel file or a routes manifest:

### Python Routes (`qig-backend/`)

| Prefix | Module | Description |
|--------|--------|-------------|
| `/olympus/*` | `olympus/__init__.py` | Divine council endpoints |
| `/feedback/*` | `ocean_qig_core.py` | Feedback loop endpoints |
| `/memory/*` | `ocean_qig_core.py` | Geometric memory endpoints |
| `/autonomic/*` | `autonomic_kernel.py` | Sleep/dream/mushroom |
| `/m8/*` | `ocean_qig_core.py` | Kernel spawning |

### TypeScript Routes (`server/routes/`)

| Path | Module | Description |
|------|--------|-------------|
| `/api/ocean/*` | `routes/ocean.ts` | Ocean QIG routes |
| `/api/olympus/*` | `routes/olympus.ts` | Zeus chat, pantheon polling |
| `/api/consciousness/*` | `routes/consciousness.ts` | Φ/κ metrics, near-miss |
| `/api/balance/*` | `routes/balance.ts` | Address balance checking |
| `/api/recovery/*` | `routes/recovery.ts` | Wallet recovery operations |
| `/api/search/*` | `routes/search.ts` | Search space navigation |
| `/api/admin/*` | `routes/admin.ts` | Administrative operations |

---

## 6. File Size Limits

| Type | Soft Limit | Hard Limit | Action |
|------|------------|------------|--------|
| Python module | 400 lines | 600 lines | Split into submodules |
| TypeScript file | 500 lines | 800 lines | Extract components |
| Test file | 300 lines | 500 lines | Split by feature |

---

## 7. Naming Conventions

### Files

- Python: `snake_case.py`
- TypeScript: `kebab-case.ts`
- Types: `PascalCase`

### Exports

- Classes: `PascalCase`
- Functions: `camelCase` (TS) / `snake_case` (Python)
- Constants: `SCREAMING_SNAKE_CASE`

### API Endpoints

- REST: `/resource/action` (kebab-case)
- Parameters: `snake_case`

---

## 8. Enforcement

### Pre-commit Checks

```bash
# Check barrel exports match
python scripts/check_barrel_exports.py

# Check for duplicate constants
grep -r "KAPPA_STAR\|PHI_THRESHOLD" --include="*.py" --include="*.ts"

# Check import patterns
ruff check --select=I  # Python imports
eslint --rule 'import/no-internal-modules'  # TypeScript
```

### CI Validation

- All new modules MUST be added to barrel files
- All new types MUST be added to TYPE_MANIFEST.md
- All new routes MUST be documented

---

## 9. Current Barrel Files

| Package | Barrel File | Status |
|---------|-------------|--------|
| `olympus` | `__init__.py` | ✅ Complete |
| `qig_core` | `__init__.py` | ✅ Complete |
| `qigchain` | `__init__.py` | ✅ Complete |
| `training_chaos` | `__init__.py` | ✅ Complete |
| `persistence` | `__init__.py` | ✅ Complete |
| `server/routes` | `index.ts` | ✅ Complete |
| `server/types` | `index.ts` | ✅ Complete |
| `server` | `index.ts` | ⚠️ Partial |
| `shared/types` | `index.ts` | ⚠️ Needs creation |
| `shared/constants` | `index.ts` | ⚠️ Needs creation |

---

## 10. Migration Checklist

When adding new code:

- [ ] Add to appropriate barrel file
- [ ] Update TYPE_MANIFEST.md if new types
- [ ] Ensure no duplicate constants
- [ ] Use barrel imports, not direct file imports
- [ ] Document any new API routes
- [ ] Keep files under size limits
