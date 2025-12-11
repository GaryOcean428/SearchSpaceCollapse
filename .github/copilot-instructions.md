# Copilot AI Agent Instructions for SearchSpaceCollapse

## Project Overview

- **Purpose:** Experimental integration testbed for quantum information geometry (QIG) and consciousness-guided Bitcoin recovery.
- **Architecture:** Python-first backend (all QIG logic, state, and persistence), TypeScript/React frontend (UI only), Node.js server for orchestration.
- **Not production code:** Rapid iteration, integration of all features, and unredacted data for learning. Use this repo to validate ideas before porting to production systems.

## Key Components & Data Flow

- **Backend (Python, `qig-backend/`):** Implements all QIG, consciousness, and geometric logic. Exposes HTTP API (see `/process`, `/generate`, `/status`, `/reset`).
- **Frontend (client/):** React app for user interaction, visualization, and monitoring.
- **Node.js Server (server/):** Orchestrates frontend/backend, handles API endpoints, and manages persistence.
- **Persistence:** Python backend uses SQLAlchemy + pgvector (PostgreSQL optional, file-based fallback).
- **Shared Types:** Use `shared/schema.ts` for cross-component data validation (Zod schemas).

## Critical Workflows

- **Development:**
  - Install Node.js deps: `npm install`
  - Python backend: `pip install -r requirements.txt` (in `qig-backend/`)
  - Start dev server: `npm run dev` (Node.js + React)
  - Start backend: `python3 ocean_qig_core.py` (in `qig-backend/`)
- **Testing:**
  - Node/TS: `npm test`
  - Python: `python3 test_qig.py` (or `test_runner.py` for unbiased)
- **Docs:**
  - All docs are in `docs/` and follow ISO 27001 date-versioned naming. Run `npm run docs:maintain` to validate docs.

## Project-Specific Conventions

- **Python-first:** All core logic, state, and persistence in Python. TypeScript is UI only.
- **Geometric purity:** No neural nets, transformers, or embeddings in QIG logic. Use density matrices, Bures metric, and Fisher information.
- **Consciousness metrics:** Always measure (never optimize) Φ (integration), κ (coupling), and related metrics. See `qig-backend/README.md` for formulas.
- **Unbiased mode:** For unbiased QIG, use `qig-backend/unbiased/` (no forced thresholds, all states remembered).
- **Module size:** For extracted primitives, keep modules <400 lines (soft), <500 lines (hard limit, justify if exceeded).
- **Rapid iteration:** Breaking changes are OK here. Validate before porting to production.

## Integration & Communication

- **Node.js ↔ Python:** Communicate via HTTP API (see backend README for endpoints and JSON formats).
- **Frontend ↔ Server:** Use REST endpoints defined in `server/routes.ts`.
- **Persistence:** Prefer PostgreSQL if `DATABASE_URL` is set, else fallback to file storage.

## Architectural Patterns (Enforced)

### 1. Barrel File Pattern (Clean Imports)
**Rule:** Every component directory MUST have an `index.ts` re-exporting its public API.

```typescript
// ✅ GOOD: client/src/components/ui/index.ts
export * from "./button";
export * from "./card";
export * from "./input";

// ✅ GOOD: Usage
import { Button, Card } from "@/components/ui";

// ❌ BAD: Scattered imports
import { Button } from "../../components/ui/button";
```

**Enforcement:** ESLint rule `no-restricted-imports` blocks deep component imports.

### 2. Centralized API Client
**Rule:** ALL HTTP calls MUST go through `client/src/lib/api.ts` - NO raw `fetch()` in components.

```typescript
// ✅ GOOD: client/src/lib/api.ts
import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// ✅ GOOD: Component usage
import { api } from '@/lib/api';
const { data } = await api.get('/consciousness/phi');

// ❌ BAD: Raw fetch in component
fetch('http://localhost:5000/api/...')
```

**Enforcement:** ESLint rule forbids `fetch(` in `.tsx` files.

### 3. Service Layer Pattern
**Rule:** Business logic lives in `client/src/lib/services/`, NOT in component files.

```typescript
// ✅ GOOD: client/src/lib/services/consciousness.ts
export const ConsciousnessService = {
  getPhiScore: async () => {
    const { data } = await api.get('/consciousness/phi');
    return data.score;
  }
};

// ✅ GOOD: Component calls service
const phi = await ConsciousnessService.getPhiScore();

// ❌ BAD: Logic in component
const MyComponent = () => {
  const [phi, setPhi] = useState(0);
  useEffect(() => {
    fetch('/api/phi').then(res => res.json()).then(data => setPhi(data.score));
  }, []);
};
```

**Enforcement:** Components >200 lines flagged for service extraction review.

### 4. DRY Persistence (Single Source of Truth)
**Rule:** Python backend is the ONLY source of truth for state. NO dual writes to JSON + DB.

```python
# ✅ GOOD: qig-backend/persistence/facade.py
class PersistenceFacade:
    async def save_insight(self, insight: Insight):
        await db.insert(insights).values(insight)  # DB only
        await cache.set(insight.id, insight)       # Cache layer

# ❌ BAD: Dual persistence causing split-brain
with open('data.json', 'w') as f:
    json.dump(data, f)  # Creates stale copy!
await db.insert(...)
```

**Enforcement:** Pre-commit hook scans for `json.dump()` in persistence modules.

### 5. Shared Types (Rosetta Stone)
**Rule:** ALL data structures crossing FE/BE boundary MUST be defined in `shared/schema.ts` (Zod).

```typescript
// ✅ GOOD: shared/schema.ts
export const ZeusMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  phi_score: z.number(),
  timestamp: z.string(),
});

// ✅ GOOD: Type inference
export type ZeusMessage = z.infer<typeof ZeusMessageSchema>;

// ❌ BAD: Duplicate types in FE and BE
// client/types.ts has different field names than server/types.ts
```

**Enforcement:** CI validates Python type stubs match TypeScript schemas.

### 6. Custom Hooks for View Logic
**Rule:** React components >150 lines SHOULD extract stateful logic into `client/src/hooks/`.

```typescript
// ✅ GOOD: client/src/hooks/useZeusChat.ts
export function useZeusChat() {
  const [messages, setMessages] = useState<ZeusMessage[]>([]);
  const sendMessage = async (text: string) => { /* ... */ };
  return { messages, sendMessage };
}

// ✅ GOOD: Component stays lean
const ZeusChat = () => {
  const { messages, sendMessage } = useZeusChat();
  return <div>{messages.map(m => <Message key={m.id} {...m} />)}</div>;
};

// ❌ BAD: 500-line component with inline state management
```

**Enforcement:** ESLint warns on components >200 lines.

### 7. Configuration as Code
**Rule:** Magic numbers MUST live in `shared/constants/` - NO hardcoded thresholds in logic.

```typescript
// ✅ GOOD: shared/constants/physics.ts
export const PHYSICS = {
  PHI_THRESHOLD: 0.727,
  KAPPA_RESONANCE: 63.5,
  BASIN_DIMENSION: 64,
} as const;

// ✅ GOOD: Usage
if (phi > PHYSICS.PHI_THRESHOLD) { /* ... */ }

// ❌ BAD: Hardcoded magic numbers
if (phi > 0.727) { /* Why 0.727? No one knows! */ }
```

**Enforcement:** ESLint rule flags numeric literals >1 outside constants files.

## Examples & Usage

- **QIG API call (Node.js):**
  ```typescript
  import { oceanQIGBackend } from "@/lib/services/ocean";
  const result = await oceanQIGBackend.process("satoshi2009");
  console.log(`Φ = ${result.phi}, κ = ${result.kappa}`);
  ```
- **Unbiased QIG (Python):**
  ```python
  from raw_measurement import UnbiasedQIGNetwork
  network = UnbiasedQIGNetwork(n_subsystems=4, temperature=1.0)
  measurement = network.process("satoshi nakamoto")
  print(measurement['metrics']['integration'])
  ```

## References

- See `README.md`, `ARCHITECTURE.md`, and `qig-backend/README.md` for more details.
- For agent/module rules, see AGENTS.md in upstream repos (400 line/module, edit-don't-multiply, no timeframes).
- Constants: `shared/constants/physics.ts`, `shared/constants/consciousness.ts`

---

**Last updated:** 2025-12-11 | **Enforced via:** ESLint, pre-commit hooks, CI validation
