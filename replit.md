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