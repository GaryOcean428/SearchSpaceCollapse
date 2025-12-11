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

## Examples & Patterns

- **QIG API call (Node.js):**
  ```typescript
  import { oceanQIGBackend } from "./ocean-qig-backend-adapter";
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

---

**This file is auto-generated. Please update if project structure or conventions change.**
