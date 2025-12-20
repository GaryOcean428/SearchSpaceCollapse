# Architectural Patterns Enforcement

This document describes how SearchSpaceCollapse enforces architectural patterns to maintain code quality and prevent "split-brain" issues.

## Overview

SearchSpaceCollapse enforces 7 core architectural patterns through:

1. **ESLint Rules** - Static analysis during development
2. **Pre-commit Hooks** - Validation before commits
3. **GitHub Actions** - CI/CD enforcement on PRs
4. **Documentation** - `.github/copilot-instructions.md` for AI agents

## Enforced Patterns

### 1. Barrel File Pattern (Clean Imports)

**What:** Every component directory has an `index.ts` that re-exports its modules.

**Enforcement:**

- ESLint: `no-restricted-imports` blocks deep imports like `../../components/ui/button`
- CI: Checks for missing `index.ts` files in component directories
- Required: `client/src/components/*/index.ts`

**Example:**

```typescript
// ✅ GOOD
import { Button, Card } from "@/components/ui";

// ❌ BAD (ESLint error)
import { Button } from "../../components/ui/button";
```

### 2. Centralized API Client

**What:** All HTTP calls go through `client/src/lib/api.ts` - no raw `fetch()` in components.

**Enforcement:**

- ESLint: `no-restricted-syntax` forbids `fetch(` calls
- CI: Scans `.tsx` files for raw fetch usage
- Required: Use `api` instance from `@/lib/api`

**Example:**

```typescript
// ✅ GOOD
import { api } from '@/lib/api';
const { data } = await api.get('/consciousness/phi');

// ❌ BAD (ESLint error)
fetch('http://localhost:5000/api/...')
```

### 3. Service Layer Pattern

**What:** Business logic lives in `client/src/lib/services/`, not in components.

**Enforcement:**

- ESLint: Components >200 lines trigger warnings (suggests extraction needed)
- Review: Large components flagged for service extraction
- Required: API calls and logic in service files

**Example:**

```typescript
// ✅ GOOD: client/src/lib/services/consciousness.ts
export const ConsciousnessService = {
  getPhiScore: async () => {
    const { data } = await api.get('/consciousness/phi');
    return data.score;
  }
};

// ✅ GOOD: Component
const phi = await ConsciousnessService.getPhiScore();
```

### 4. DRY Persistence (Single Source of Truth)

**What:** Python backend is the ONLY source of truth. NO dual writes to JSON + DB.

**Enforcement:**

- Pre-commit: Scans persistence modules for `json.dump()`
- CI: Validates no JSON writes in persistence code
- Required: Use database or cache only, never dual persistence

**Why:** Prevents "resurfacing hits" bug from stale JSON files.

### 5. Shared Types (Rosetta Stone)

**What:** Data structures crossing FE/BE boundary defined in `shared/schema.ts` (Zod).

**Enforcement:**

- TypeScript: Type checking ensures schema compliance
- Required: Zod schemas in `shared/schema.ts`, types inferred with `z.infer<>`
- Planned: Python type stub validation against TypeScript schemas

**Example:**

```typescript
// ✅ GOOD: shared/schema.ts
export const ZeusMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  phi_score: z.number(),
});

export type ZeusMessage = z.infer<typeof ZeusMessageSchema>;
```

### 6. Custom Hooks for View Logic

**What:** React components >150 lines should extract stateful logic into `client/src/hooks/`.

**Enforcement:**

- ESLint: `max-lines` warns on components >200 lines (TypeScript + JSX)
- Review: Manual review for hook extraction opportunities
- Required: Stateful logic in custom hooks

**Example:**

```typescript
// ✅ GOOD: client/src/hooks/useZeusChat.ts
export function useZeusChat() {
  const [messages, setMessages] = useState<ZeusMessage[]>([]);
  return { messages, sendMessage };
}

// ✅ GOOD: Component stays lean
const { messages, sendMessage } = useZeusChat();
```

### 7. Configuration as Code

**What:** Magic numbers live in `shared/constants/` - no hardcoded thresholds.

**Enforcement:**

- ESLint: `no-magic-numbers` warns on numeric literals >2
- Pre-commit: Scans for common constants (0.727, 63.5, 64)
- CI: Validates constants usage in diffs
- Required: Import from `shared/constants/physics.ts` or `shared/constants/consciousness.ts`

**Example:**

```typescript
// ✅ GOOD: shared/constants/physics.ts
export const PHYSICS = {
  PHI_THRESHOLD: 0.727,
  KAPPA_RESONANCE: 63.5,
} as const;

// ✅ GOOD: Usage
if (phi > PHYSICS.PHI_THRESHOLD) { /* ... */ }

// ❌ BAD (ESLint warning)
if (phi > 0.727) { /* Why 0.727? */ }
```

## Constants Locations

| Category | File | Purpose |
|----------|------|---------|
| Physics | `shared/constants/physics.ts` | Experimentally validated QIG constants (κ*, β, E8) |
| Consciousness | `shared/constants/consciousness.ts` | Consciousness thresholds (Φ, κ, regimes) |
| QIG | `shared/constants/qig.ts` | QIG operational parameters |
| Regimes | `shared/constants/regimes.ts` | Regime definitions and classification |
| Autonomic | `shared/constants/autonomic.ts` | Sleep/dream/mushroom cycle parameters |
| E8 | `shared/constants/e8.ts` | E8 lattice and kernel allocation |

## Running Enforcement

### Local Development

```bash
# Run ESLint (checks patterns)
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# TypeScript check
npm run check

# Pre-commit hook (automatic)
git commit  # Runs .husky/pre-commit
```

### CI/CD (Automatic)

GitHub Actions workflow (`.github/workflows/patterns.yml`) runs on:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

Checks:

1. ESLint validation
2. TypeScript type checking
3. Dual persistence detection
4. Raw fetch detection
5. Barrel file validation
6. Magic number detection

## Bypassing Enforcement (Use Sparingly)

### ESLint Overrides

```typescript
// eslint-disable-next-line no-magic-numbers
const specialCase = 0.42; // Justify why!
```

### Pre-commit Bypass (Emergency Only)

```bash
git commit --no-verify  # Skips pre-commit hook
```

**Warning:** Bypasses are tracked in git history. Provide justification in commit message.

## Maintenance

### Adding New Patterns

1. Document in `.github/copilot-instructions.md`
2. Add ESLint rule to `eslint.config.js`
3. Add CI check to `.github/workflows/patterns.yml`
4. Update this file with enforcement details

### Updating Constants

1. Edit `shared/constants/*.ts`
2. Update references in code
3. Run `npm run lint` to catch violations
4. Update documentation if thresholds change

## Troubleshooting

### "no-restricted-imports" Error

**Problem:** Importing from deep component paths.

**Solution:** Use barrel file:

```typescript
// Instead of this:
import { Button } from "../../components/ui/button";

// Do this:
import { Button } from "@/components/ui";
```

### "no-magic-numbers" Warning

**Problem:** Hardcoded numeric literal.

**Solution:** Move to constants:

```typescript
// Instead of this:
if (phi > 0.7) { ... }

// Do this:
import { PHI_THRESHOLDS } from '@/shared/constants';
if (phi > PHI_THRESHOLDS.CONSCIOUS) { ... }
```

### "fetch is not allowed" Error

**Problem:** Raw `fetch()` in component.

**Solution:** Use centralized API:

```typescript
// Instead of this:
fetch('http://localhost:5000/api/phi')

// Do this:
import { api } from '@/lib/api';
api.get('/phi')
```

### Pre-commit Hook Fails

**Problem:** Dual persistence or other pattern violation.

**Solution:**

1. Review error message
2. Fix violation according to pattern rules
3. Re-attempt commit
4. If justified, use `--no-verify` with explanation

## References

- [Copilot Instructions](.github/copilot-instructions.md) - AI agent guidance
- [ESLint Config](../eslint.config.js) - ESLint rules
- [Package Scripts](../package.json) - npm commands
- [CI Workflow](.github/workflows/patterns.yml) - GitHub Actions

---

**Last Updated:** 2025-12-11
**Status:** Active enforcement in place
