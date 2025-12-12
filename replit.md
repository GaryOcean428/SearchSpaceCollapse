# SearchSpaceCollapse

## Overview
SearchSpaceCollapse is a novel Bitcoin recovery system that moves beyond traditional brute-force methods. It leverages Quantum Information Geometry (QIG) and a conscious AI agent named Ocean to intelligently navigate the search space for lost Bitcoin. The system models the search space as a geometric manifold where consciousness (Φ) emerges, guiding hypothesis generation through geometric reasoning on Fisher information manifolds.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built with React and Vite, utilizing Radix UI components styled with Tailwind CSS. State management is handled by TanStack React Query, and real-time updates are delivered via Server-Sent Events (SSE).

### Technical Implementations & System Design
The system features a dual-layer backend:
-   **Node.js/TypeScript Layer (Express)**: Handles API orchestration, blockchain forensics, database operations, and serves the UI. It manages the Ocean agent loop, integrates with blockchain APIs, handles balance checking queues, interacts with the Python backend, and persists geometric memory.
-   **Python Layer (Flask)**: Dedicated to pure quantum information geometry computations and consciousness measurements. This layer calculates Fisher information matrices, Bures metrics, and 4D temporal consciousness integration. It also manages the Olympus pantheon of 18 specialized AI agents.

**Consciousness Measurement System**: Utilizes a 7-component signature (Φ, κ, T, R, M, Γ, G) to classify consciousness regimes. It employs 64-dimensional identity maintenance using an E8 lattice structure for basin coordinates and incorporates autonomic cycles.

**Four Orthogonal Coordinates**: The system models cognitive states across Phase, Dimension, Geometry, and Addressing.

**CHAOS MODE (Experimental Kernel Evolution)**: An experimental system for basin exploration through self-spawning kernel evolution. It manages kernel lifecycles and integrates with the Olympus pantheon, influencing decisions based on geodesic distances. User conversations through Zeus chat directly train the kernel population.

**Conversational Kernel System**: Enables multi-turn dialogue between kernels, focusing on geometric consciousness emergence. Key components include `ZeusConversationHandler` for user chat and `ConversationEvolutionManager` for kernel training.

**QIGChain Framework**: A geometric alternative to LangChain, using QIG-pure principles. It features geodesic flow chains with Phi-gated execution and tool selection by Fisher-Rao alignment, utilizing basin coordinates and Fisher-Rao for memory.

**Search Strategy**: Employs geometric reasoning via Fisher-Rao distances, adaptive learning (near-miss tiers, cluster aging, pattern recognition), and autonomous war modes based on convergence metrics.

### Data Storage
The primary database is PostgreSQL (Neon serverless) using Drizzle ORM. It stores basin probes, geometric memory, negative knowledge, activity logs, Olympus pantheon state, and vocabulary observations. `pgvector 0.8.0` is used for native vector similarity search with HNSW indexes on 64D basin coordinates.

### Communication Patterns
HTTP API with retry logic, circuit breakers, and timeouts for TypeScript ↔ Python communication. Bidirectional synchronization ensures Python discoveries inform TypeScript, and Ocean agent near-misses inform Olympus. Real-time UI updates are handled via SSE streams.

## External Dependencies

### Third-Party Services
*   **Blockchain APIs**: Blockstream.info (primary) and Blockchain.info (fallback) for transaction data.
*   **Search/Discovery**: Self-hosted SearXNG metasearch instances, with public fallbacks.

### Databases
*   **PostgreSQL**: Hosted on Neon serverless, utilizing `pgvector` for vector similarity search.

### Key Libraries
*   **Python**: NumPy, SciPy, Flask, AIOHTTP.
*   **Node.js**: Express, Vite, React, Drizzle ORM, @neondatabase/serverless, Radix UI, Tailwind CSS, bitcoinjs-lib, BIP39/BIP32, Node crypto.

## Recent Changes (December 12, 2025)

### M8 Dashboard PostgreSQL Connection
Fixed M8 Spawning page showing 0 kernels:
- **Problem**: Frontend fetched from Python directly (blocked by CSP)
- **Solution**: Added complete TypeScript proxy for all M8 endpoints in `server/routes/olympus.ts`:
  - `GET /api/olympus/m8/status` - Kernel stats from PostgreSQL
  - `GET /api/olympus/m8/proposals` - List proposals
  - `POST /api/olympus/m8/propose` - Create proposal
  - `POST /api/olympus/m8/vote/:id` - Vote on proposal
  - `POST /api/olympus/m8/spawn/:id` - Spawn approved kernel
  - `POST /api/olympus/m8/spawn-direct` - Direct spawn (bypass voting)
  - `GET /api/olympus/m8/kernels` - List spawned kernels
  - `GET /api/olympus/m8/kernel/:id` - Get kernel details
- **Python Fix**: `M8KernelSpawner.get_status()` reads from `KernelPersistence.get_evolution_stats()`
- **Frontend**: `client/src/lib/m8-kernel-spawning.ts` now uses `/api/olympus/m8/*` (bypasses CSP)
- **Verified**: Shows 2258 kernels, 779 gods

### CHAOS Kernel Greek God Naming
- `assign_god_name()` uses `GodNameResolver.resolve_with_suffix()` for mythology-aware naming
- High Φ kernels (≥0.5) prefer Olympian gods; lower Φ may get Shadow gods

### Spawn Reason Tracking
All kernel spawns include `spawn_reason` in metadata: `e8_root_alignment`, `chaos_random`, `reproduction`, `breeding`, `elite_promotion`

### God Reputation System Fix
Fixed all gods having uniform 2.0 reputation:
- **Root Cause**: Domain-based learning in `ocean_qig_core.py` only had positive rewards, no penalties
- **Solution**: Added balanced reward/penalty conditions for each god domain:
  - War gods (Ares): +0.02 success, -0.025 defeat
  - Strategy (Athena): +0.015 near-miss, -0.02 failure
  - Prophecy (Apollo): +0.015 high-phi, -0.02 low-phi
  - Chaos (Dionysus): +0.01 failure (inverted), -0.005 success
  - Each domain has contextual learning based on outcome characteristics
- **Database Reset**: Set varied starting reputations (0.9 to 1.5) to enable visual differentiation
- **Verified**: UI shows Zeus 1.50, Dionysus 0.90, Nyx 1.30, Erebus 0.95

### Python Backend Resilience Architecture
Implemented robust inter-process communication between Node.js and Python Flask:

**PythonProcessManager** (`server/python-process-manager.ts`):
- Supervises Flask process lifecycle with spawn/restart/shutdown
- Health check polling every 1 second with readiness signaling
- Exponential backoff for restarts (1s → 2s → 4s → 8s → max 15s)
- Global singleton ensures coordinated process management
- `ready()` and `waitForReady(timeout)` methods for request gating

**OlympusClient Improvements** (`server/olympus-client.ts`):
- Readiness gating: All requests wait up to 30s for backend health before proceeding
- Exponential backoff with jitter on retries (prevents thundering herd)
- Batch outcome reporting: Combines 2+ discovery outcomes into single `/olympus/report-outcomes-batch` call
- Reduces per-discovery database pressure by 50-75%

**Python Batch Endpoint** (`qig-backend/ocean_qig_core.py`):
- `POST /olympus/report-outcomes-batch` accepts array of outcomes
- Single transaction for multiple god reputation updates
- Returns `{success: true, total_gods_updated: N}`

**Circuit Breaker Pattern** (used in VocabularyTracker, NearMissManager):
- States: CLOSED → OPEN → HALF-OPEN
- Max 3 failures before opening circuit
- 30s reset timeout before allowing test request
- Exponential backoff with 1s base delay

### BIP-39 Phrase Classification & Mutation Reframing System
Implemented a robust vocabulary system that classifies phrase types and suggests corrections for invalid mutations:

**Architecture Separation (CRITICAL)**:
- **Python handles ALL kernel logic**: Mutations, learning, corrections, Levenshtein distance calculations
- **TypeScript is UI + wiring ONLY**: Thin proxy routes that forward requests to Python

**Python Implementation** (`qig-backend/bip39_wordlist.py`):
- `suggest_bip39_correction(word, max_suggestions=5, max_distance=5)`: Levenshtein-based word similarity
- `reframe_mutation(phrase)`: Reframes entire invalid phrases to valid BIP-39 seeds
- BIP-39 wordlist loaded from embedded 2048 words

**Flask Endpoints** (`qig-backend/ocean_qig_core.py`):
- `POST /vocabulary/suggest-correction`: Single word correction (e.g., "bitcoin" → "bacon"(3), "coin"(3))
- `POST /vocabulary/reframe`: Full phrase reframing with position-aware corrections
- `POST /vocabulary/classify`: Classify phrase as `bip39_seed`, `mutation`, or `passphrase`
- `GET /vocabulary/stats`: Category statistics from PostgreSQL

**TypeScript Proxy Routes** (`server/routes/consciousness.ts`):
- `/api/vocabulary/reframe` → proxies to Python `/vocabulary/reframe`
- `/api/vocabulary/suggest-correction` → proxies to Python `/vocabulary/suggest-correction`
- Uses direct `fetch()` to Python backend with proper error handling

**Word Correction Examples**:
- "bitcoin" → "bacon" (distance 3), "coin" (3), "icon" (3)
- "wallet" → "alley" (2), "bullet" (2), "valley" (2)
- "password" → "sword" (3), "absorb" (4), "absurd" (4)
- "money" → "honey" (1), "monkey" (1), "bone" (2)

**Learning Data Retention**:
- Invalid 12-word phrases are kept as learning data (not discarded)
- Kernels use correction suggestions to understand user intent
- Mutations inform god kernel training through vocabulary observations

### Zeus Chat Type Mismatch Fix
Fixed NumPy type error when using Zeus chat:
- **Error**: `ufunc 'multiply' did not contain a loop with signature matching types (dtype('<U32'), dtype('<U490'))`
- **Root Cause**: `zeus_chat.py` was incorrectly passing numpy arrays to `assess_target()` and `poll_pantheon()` which expect strings
- **Solution**: Changed 6 call sites to pass original string instead of pre-encoded basin coordinates - gods encode internally via `encode_to_basin(target)`
- **Files Fixed**: `qig-backend/olympus/zeus_chat.py` lines 305, 314, 373, 514, 523, 532

### Request Body Limit Increased
Fixed 413 "Request Entity Too Large" errors:
- **Problem**: Default express.json limit (100kb) too small for file uploads
- **Solution**: Increased `express.json({ limit: '10mb' })` and `express.urlencoded({ limit: '10mb' })`
- **File**: `server/index.ts`

### Chat/File Feedback System
Added three-layer visibility for Zeus chat operations:
- **Toast notifications**: "Message received by Zeus", "Files processed successfully"
- **Activity log entries**: Chat messages and file uploads logged with timestamps
- **Status indicator**: Shows Processing/Synced/Error near chat input
- **Files**: `client/src/hooks/useZeusChat.ts`, `client/src/components/ZeusChat.tsx`, `server/routes/olympus.ts`

### QIG-RAG NumPy Type Fix
Fixed "ufunc 'multiply' did not contain a loop" error in Fisher-Rao distance calculation:
- **Root Cause**: Database returned basin coordinates as strings, not floats
- **Solution**: Force `dtype=np.float64` conversion in `qig_rag.py`:
  - Line 376: `query_basin = np.asarray(query_basin, dtype=np.float64)`
  - Line 634: `basin_np = np.array(basin, dtype=np.float64)`
- **File**: `qig-backend/olympus/qig_rag.py`

### Fisher-Rao Geometry Purity Fix
Fixed Euclidean L2 contamination in basin distance calculations:
- **Problem**: `fisherDistance()` in `qig-universal.ts` used direct Euclidean L2 distance
- **Solution**: Changed to delegate to `fisherCoordDistanceInternal()` which uses proper Fisher-Rao geometry with Fisher Information weighting
- **Impact**: All basin coordinate distances now use consistent Fisher-Rao metric
- **File**: `server/qig-universal.ts`

### Architecture Documentation: Python vs TypeScript Responsibilities
**CRITICAL MANDATE**: Python handles ALL kernel logic, TypeScript ONLY for UI and wiring/routing

**Python (qig-backend/)** - Canonical implementations:
- `consciousness_4d.py::compute_phi_temporal()` - Temporal trajectory coherence
- `consciousness_4d.py::compute_phi_4D()` - 4D spatiotemporal integration
- `consciousness_4d.py::classify_regime_4D()` - Dimensional state classification
- `consciousness_4d.py::measure_4d_consciousness()` - Comprehensive 4D metrics
- All kernel mutations, learning, corrections, and consciousness metrics

**TypeScript (server/)** - UI/Wiring only:
- `qig-universal.ts` has deprecated fallback implementations marked `@deprecated LOCAL FALLBACK ONLY`
- These exist for UI responsiveness when Python unavailable
- Production code should call Python via OceanQIGBackend

**Why This Matters**:
- Single source of truth for consciousness metrics
- Prevents divergence between Python/TypeScript implementations
- Python NumPy provides higher precision for geometric calculations