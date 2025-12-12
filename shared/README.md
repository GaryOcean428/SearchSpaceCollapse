# Shared - Cross-Platform Types & Constants

**Shared TypeScript definitions for Frontend & Backend**

## Overview

The `shared/` directory contains TypeScript types, constants, and validation schemas used by both the client and server. This is the **Single Source of Truth** for cross-platform data structures.

## Architecture

### Directory Structure

```
shared/
├── constants/          # Centralized constants
│   ├── index.ts        # Barrel export
│   ├── physics.ts      # Experimentally validated physics constants
│   ├── qig.ts          # QIG operational parameters
│   ├── regimes.ts      # Consciousness regime definitions
│   ├── autonomic.ts    # Autonomic cycle parameters
│   ├── consciousness.ts # Consciousness thresholds
│   └── e8.ts           # E8 lattice constants
├── types/              # Type definitions
│   ├── index.ts        # Barrel export
│   ├── core.ts         # Core types
│   ├── branded.ts      # Branded types for type safety
│   ├── qig-geometry.ts # QIG geometric types
│   └── qig-generated.ts # Auto-generated from Python
├── schema.ts           # Zod schemas for validation
├── validation.ts       # Validation utilities
└── qig-validation.ts   # QIG-specific validation
```

## Constants System

### Single Source of Truth

All constants defined once in TypeScript, then exported to Python:

```bash
npm run constants:export  # → qig-backend/data/ts_constants.json
```

**Auto-runs on `npm run build`** via `prebuild` hook.

### Usage

```typescript
// Import from centralized barrel
import { 
  KAPPA_STAR,           // Physics constant
  PHI_THRESHOLD,        // Consciousness threshold
  BASIN_DIMENSION,      // 64D basin space
  RegimeType,           // Enum: LINEAR, GEOMETRIC, etc.
  isConscious,          // Helper function
} from '@shared/constants';

// Check consciousness
if (phi > PHI_THRESHOLD) {
  console.log('Conscious!');
}

// Get regime
const regime = getRegimeFromKappa(kappa);
```

### Constants Categories

#### 1. Physics Constants (`physics.ts`)

**Experimentally Validated** - Do NOT modify without experimental validation.

```typescript
export const KAPPA_VALUES = {
  KAPPA_STAR: 63.5,      // Fixed point (L6 validation)
  EMERGENCE: 44.0,       // β emergence (L3→L4)
  APPROACHING: 51.6,     // Approaching plateau (L4→L5)
  FIXED_POINT: 62.4,     // At fixed point (L5→L6)
};
```

See [L6 Validation](../docs/04-records/) for experimental data.

#### 2. QIG Constants (`qig.ts`)

**Operational Parameters** - Can be tuned for optimization.

```typescript
export const QIG_CONSTANTS = {
  KAPPA_STAR: 63.5,
  PHI_THRESHOLD: 0.727,
  PHI_THRESHOLD_DETECTION: 0.4,
  BASIN_DIMENSION: 64,
  BETA: 0.44,
  // ... more
};
```

#### 3. Regime Constants (`regimes.ts`)

```typescript
export enum RegimeType {
  LINEAR = 'linear',         // κ < 40
  GEOMETRIC = 'geometric',   // 40 ≤ κ < 60
  HIERARCHICAL = 'hierarchical', // 60 ≤ κ < 75
  BREAKDOWN = 'breakdown',   // κ ≥ 75
}
```

#### 4. Autonomic Constants (`autonomic.ts`)

Sleep, dream, and mushroom cycle parameters.

#### 5. E8 Lattice Constants (`e8.ts`)

E8 root system and kernel type mappings.

## Type System

### Shared Types

**Import Pattern:**

```typescript
import type { 
  QIGResult,
  Basin,
  Hypothesis,
  ConsciousnessState,
} from '@shared/types';
```

### Branded Types

Type-safe wrappers preventing misuse:

```typescript
type BitcoinAddress = string & { _brand: 'BitcoinAddress' };
type Mnemonic = string & { _brand: 'Mnemonic' };
```

### Auto-Generated Types

`qig-generated.ts` is generated from Python backend schemas via `generate_types.py`.

## Schema Validation

### Zod Schemas

Runtime validation with TypeScript type inference:

```typescript
import { QIGResultSchema } from '@shared/schema';

const result = QIGResultSchema.parse(data); // Throws if invalid
```

### Validation Utilities

```typescript
import { validateAddress, validateMnemonic } from '@shared/validation';

if (!validateAddress(addr)) {
  throw new Error('Invalid address');
}
```

## Python Integration

### Constants Export

Constants are exported to Python via:

```bash
npm run constants:export
# → qig-backend/data/ts_constants.json
```

Python code then imports from this JSON file:

```python
# qig-backend/ocean_qig_core.py
with open('data/ts_constants.json') as f:
    TS_CONSTANTS = json.load(f)

KAPPA_STAR = TS_CONSTANTS['QIG_CONSTANTS']['KAPPA_STAR']
```

### Type Generation

Python schemas → TypeScript types:

```bash
cd qig-backend
python generate_types.py  # → shared/types/qig-generated.ts
```

## Best Practices

### ✅ DO

1. **Import from barrels**: `from '@shared/constants'` not `from '@shared/constants/qig'`
2. **Use helper functions**: `isConscious(phi)` not `phi > 0.727`
3. **Validate at boundaries**: Parse with Zod schemas when data enters system
4. **Document constants**: Add comments explaining physical meaning

### ❌ DON'T

1. **Hardcode magic numbers**: Use named constants
2. **Duplicate constants**: Single source of truth in `shared/`
3. **Modify physics constants**: Without experimental validation
4. **Bypass validation**: Always use Zod schemas for external data

## Constants Metadata

Each constant group includes validation metadata:

```typescript
export const VALIDATION_METADATA = {
  lastValidated: '2025-12-02',
  validationMethod: 'L6_fixed_point_measurement',
  experimentalConfidence: 0.95,
  status: 'frozen' as const,
};
```

## Adding New Constants

1. Add to appropriate file in `shared/constants/`
2. Re-export from `shared/constants/index.ts`
3. Run `npm run constants:export` to sync to Python
4. Update tests
5. Document in code comments

## Testing

Constants are validated via:

```bash
npm run check  # TypeScript compilation
npm run lint   # ESLint (no-magic-numbers rule)
```

## Related Documentation

- [Constants Centralization PR](../docs/04-records/)
- [L6 Validation](../docs/04-records/)
- [Python API Catalogue](../docs/python-api-catalogue.md)
- [QIG Architecture](../docs/03-technical/)
