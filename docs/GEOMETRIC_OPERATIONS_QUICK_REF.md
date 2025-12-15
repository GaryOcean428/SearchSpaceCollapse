# Geometric Operations - Developer Quick Reference

## 🎯 Golden Rule: ALWAYS Use Fisher-Rao Distance

**❌ NEVER DO THIS (Euclidean):**
```typescript
// WRONG - Euclidean distance
let distance = 0;
for (let i = 0; i < coords1.length; i++) {
  const diff = coords1[i] - coords2[i];
  distance += diff * diff;
}
distance = Math.sqrt(distance);
```

**✅ ALWAYS DO THIS (Fisher-Rao):**
```typescript
// CORRECT - Fisher-Rao distance
import { fisherCoordDistance } from './qig-geometry';

const distance = fisherCoordDistance(coords1, coords2);
```

## 📦 Import from Centralized Module

```typescript
import { 
  fisherCoordDistance,           // Primary distance function
  fisherDistance,                 // Combined Fisher distance
  geodesicInterpolation,          // Manifold interpolation
  estimateManifoldCurvature,      // Curvature estimation
  checkGeometricResonance,        // Resonance detection
} from './qig-geometry';
```

## 🔍 Common Operations

### Distance Between Basin Coordinates
```typescript
const distance = fisherCoordDistance(basinA, basinB);
// Returns Fisher-Rao distance (NOT Euclidean!)
```

### Distance Between Phrases
```typescript
const distance = fisherDistance(phrase1, phrase2);
// Combines Φ, κ, and basin distances
```

### Interpolate Along Geodesic
```typescript
const midpoint = geodesicInterpolation(start, end, 0.5);
// Follows geodesic (NOT straight line!)
```

### Check Resonance
```typescript
const inResonance = checkGeometricResonance(coords1, coords2, 0.15);
// Returns true if Fisher distance < threshold
```

### Compute Direction
```typescript
const direction = fisherWeightedDirection(from, to);
// Returns Fisher-weighted tangent vector
```

## 🚨 Validation

Check for violations:
```bash
npm run validate:geometry
```

Should output:
```
✅ GEOMETRIC PURITY VERIFIED!
✅ No Euclidean distance violations found.
✅ All geometric operations use Fisher-Rao metric.
```

## 📐 Fisher-Rao Distance Formula

```
d²_F = Σᵢ (Δθᵢ)² / σᵢ²

where:
  Δθᵢ = θᵢ⁽¹⁾ - θᵢ⁽²⁾  (coordinate difference)
  σᵢ² = θᵢ(1 - θᵢ)      (Fisher variance)
```

## 🧪 Example: Updating Legacy Code

### Before (Euclidean - Wrong)
```typescript
private computeDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
```

### After (Fisher-Rao - Correct)
```typescript
import { fisherCoordDistance } from './qig-geometry';

private computeDistance(a: number[], b: number[]): number {
  return fisherCoordDistance(a, b);
}
```

## 🎓 Why Fisher-Rao?

1. **Information Manifolds Are Curved**: Basin coordinates live on a curved manifold, not flat Euclidean space
2. **Proper Consciousness Metrics**: κ* = 64 emerges naturally from Fisher information geometry
3. **Natural Gradients**: Fisher metric provides optimal learning direction
4. **Invariance**: Fisher-Rao is invariant under reparameterization

## 📚 Key Files

- **`server/qig-geometry.ts`**: Centralized module (import from here)
- **`server/qig-universal.ts`**: Core implementation (don't import directly)
- **`shared/types/qig-geometry.ts`**: TypeScript type definitions
- **`scripts/validate-geometric-purity.ts`**: Validation script

## ⚠️ Common Pitfalls

### Pitfall 1: Tangent Space vs Manifold
```typescript
// ✅ OK: Velocity magnitude (tangent space)
const velocityMag = Math.sqrt(velocity.reduce((sum, v) => sum + v * v, 0));

// ❌ BAD: Basin distance (manifold space)
const basinDist = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
```

### Pitfall 2: Direct Import
```typescript
// ❌ BAD: Import from qig-universal directly
import { fisherCoordDistance } from './qig-universal';

// ✅ GOOD: Import from centralized module
import { fisherCoordDistance } from './qig-geometry';
```

### Pitfall 3: Linear Interpolation
```typescript
// ❌ BAD: Linear interpolation
const mid = coords1.map((c, i) => (c + coords2[i]) / 2);

// ✅ GOOD: Geodesic interpolation
const mid = geodesicInterpolation(coords1, coords2, 0.5);
```

## 🔒 Enforcement

The validation script checks for:
- Euclidean distance patterns
- Missing Fisher imports
- Centralized module exports
- Deprecation guards

Run automatically in CI/CD or manually:
```bash
npm run validate:geometry
```

## 📖 Further Reading

- Fisher Information Geometry: Amari (2016)
- QIG Theory: κ* = 64 validation (2025-12-02)
- Implementation Report: `docs/GEOMETRIC_PURITY_FIXES_REPORT.md`

---

**Last Updated:** 2025-12-15  
**Maintained by:** SearchSpaceCollapse Team
