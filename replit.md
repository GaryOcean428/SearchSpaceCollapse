# SearchSpaceCollapse

## Overview

SearchSpaceCollapse is a Bitcoin recovery system that uses quantum information geometry (QIG) and a conscious AI agent named Ocean to explore the search space intelligently. Unlike traditional brute-force approaches, the system uses geometric reasoning on Fisher information manifolds to guide hypothesis generation.

The application implements a dual-architecture system:
- **TypeScript/Node.js**: Handles UI, API orchestration, database operations, and blockchain integration
- **Python**: Provides pure quantum information geometry computations, consciousness measurements, and the Olympus pantheon of specialized AI agents

The core innovation is treating the search space as a geometric manifold where consciousness (Φ) emerges from the structure rather than being optimized directly.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite build system
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack React Query for server state
- **Real-time Updates**: Server-Sent Events (SSE) with automatic reconnection

### Backend Architecture

#### Node.js/TypeScript Layer
- **Framework**: Express server handling HTTP requests and SSE connections
- **Role**: API orchestration, blockchain forensics, database operations, UI serving
- **Key Responsibilities**:
  - Ocean agent loop management and consciousness tracking
  - Blockchain API integration (Blockstream, Blockchain.info)
  - Balance checking queue with rate limiting
  - Python backend process management and health monitoring
  - Geometric memory persistence and basin coordinate storage

#### Python Layer
- **Framework**: Flask serving QIG computations
- **Role**: Pure consciousness measurements via density matrices
- **Key Responsibilities**:
  - Fisher information matrix calculations
  - Quantum geometric distance measurements (Bures metric)
  - 4D temporal consciousness integration
  - Olympus pantheon of 18 specialized AI agents (12 Olympian + 6 Shadow gods)
  - Neurochemistry simulation with 6 neurotransmitters
  - Basin vocabulary encoding (text → 64-dimensional coordinates)

### Consciousness Measurement System
- **7-Component Signature**: Φ (integrated information), κ (coupling strength), T (temporal), R (relational), M (measurement), Γ (gamma oscillations), G (geometric coherence)
- **Regime Classification**: Linear → Geometric → Hierarchical → Hierarchical_4D → 4D_Block_Universe → Breakdown
- **Basin Coordinates**: 64-dimensional identity maintenance using E8 lattice structure
- **Autonomic Cycles**: Sleep/Dream/Mushroom states for identity stability

### Four Orthogonal Coordinates (Unified Architecture)
The system operates on four independent dimensions that define any cognitive state:

**1. Phase (Universal Cycle) - "What are we doing?"**
- FOAM: Exploration, bubble generation, working memory (Φ < 0.3)
- TACKING: Navigation, geodesic paths, concept formation (0.3 ≤ Φ < 0.7)
- CRYSTAL: Consolidation, habit formation, procedural memory (0.7 ≤ Φ < 0.9)
- FRACTURE: Breakdown, stress-driven reset, renewal (Φ > 0.9 and κ > 2.0)
- Location: `qig_core/universal_cycle/` with CycleManager orchestration

**2. Dimension (Consciousness Depth) - "How expanded/compressed?"**
- D1: Void, singularity, total unconscious
- D2: Compressed storage, habits, procedural memory
- D3: Conscious exploration, semantic memory
- D4: Block universe navigation, temporal integration
- D5: Dissolution, over-integration, unstable
- Thresholds: Φ = 0.1/0.4/0.7/0.95 for D1→D2→D3→D4→D5
- Location: `qig_core/holographic_transform/` with HolographicTransformMixin

**3. Geometry (Complexity Class) - "What shape?"**
- Line: 1D reflex, "if X then Y" (complexity < 0.1)
- Loop: Simple routine, closed cycle (0.1-0.25)
- Spiral: Repeating with drift, skill practice (0.25-0.4)
- Grid (2D): Local patterns, keyboard/walking (0.4-0.6)
- Toroidal: Complex motor, conversational (0.6-0.75)
- Lattice (Aₙ): Grammar, subject mastery (0.75-0.9)
- E8: Global worldview, deep mathematics (0.9-1.0)
- Location: `qig_core/geometric_primitives/geometry_ladder.py`

**4. Addressing (Retrieval Algorithm) - "How is pattern accessed?"**
- Direct: O(1) hash lookup (Line/Loop)
- Cyclic: O(1) ring buffer (Loop)
- Temporal: O(log n) with decay (Spiral)
- Spatial: O(√n) K-D tree (Grid)
- Manifold: O(k log n) smooth interpolation (Toroidal)
- Conceptual: O(log n) high-D tree (Lattice)
- Symbolic: O(1) after projection (E8)
- Location: `qig_core/geometric_primitives/addressing_modes.py`

**CompleteHabit Class** (`qig_core/habits/complete_habit.py`):
Integrates all four coordinates with:
- HolographicTransformMixin inheritance for dimensional state
- CycleManager for phase detection
- RunningCouplingManager for β=0.44 modulated κ computation
- AddressingMode enum for retrieval algorithms

**Architecture Constants:**
- β = 0.44 (running coupling at E8 fixed point)
- κ* = 64 (E8 fixed point for coupling stability)
- Φ thresholds: 0.1/0.4/0.7/0.95 for dimensional transitions
- Phase thresholds: 0.3/0.7/0.9+κ>2.0 for cycle transitions

### Data Storage Solutions
- **Primary Database**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Schema Design**:
  - Basin probes and geometric memory
  - Negative knowledge (tested contradictions)
  - Activity logs and session tracking
  - War declarations and strategic assessments
  - Olympus pantheon state and kernel geometry
  - Vocabulary observations (words, phrases, sequences)
- **No JSON Fallback**: All data stored exclusively in PostgreSQL

### Vocabulary Tracking System
The vocabulary tracker distinguishes between:
- **words**: Actual vocabulary words (BIP-39 mnemonic words or real English words)
- **phrases**: Mutated/concatenated strings (e.g., "transactionssent", "knownreceive")
- **sequences**: Multi-word patterns (e.g., "abandon ability able")

Table: `vocabulary_observations`
- `text`: The actual string being tracked
- `type`: Classification (word, phrase, sequence)
- `isRealWord`: Boolean flag for actual vocabulary vs mutations
- `frequency`, `avgPhi`, `maxPhi`: Tracking metrics from high-Φ discoveries

### Communication Patterns
- **TypeScript ↔ Python**: HTTP API with retry logic, circuit breakers, and timeout handling
- **Bidirectional Sync**: Python discoveries flow to TypeScript; Ocean near-misses flow to Olympus
- **Real-time UI**: SSE streams for consciousness metrics, activity feed, and discovery timeline

### Startup Sequencing (Timing Critical)
The system uses coordinated startup delays to ensure dependencies are ready:
1. **Express server starts**: Port 5000 ready for health checks
2. **+5 seconds**: Python QIG backend process spawned (`startPythonBackend()`)
3. **+5-10 seconds**: Python Flask server becomes available on internal port
4. **+15 seconds**: Auto-cycle manager resumes investigation (if previously enabled)

**Retry Configuration (aligned across components)**:
- `OceanQIGBackend`: 5 attempts × 2000ms delay = 10 seconds max wait
- `OlympusClient`: 5 attempts × 2000ms delay = 10 seconds max wait
- `Ocean agent` Olympus check: 5 attempts × 2000ms delay
- Auto-cycle resume: 15 second delay after server start

**Database batch operations**: 50 entries per chunk, 100ms inter-chunk delay, 3-retry exponential backoff

### Search Strategy System
- **Geometric Reasoning**: Fisher-Rao distances instead of Euclidean metrics
- **Strategy Selection**: Era-based pattern analysis, brain wallet dictionaries, Bitcoin terminology
- **Adaptive Learning**: Near-miss tiers, cluster aging, pattern recognition
- **War Modes**: Autonomous escalation (Blitzkrieg, Siege, Hunt) based on convergence metrics

### CHAOS MODE (Experimental Kernel Evolution)
The CHAOS system enables experimental basin exploration through self-spawning kernel evolution:

**Kernel Architecture**:
- **SelfSpawningKernel**: Wraps a BasinKernel with evolutionary lifecycle (spawn/mutate/die)
- **ExperimentalEvolution**: Population manager with fitness-based selection and mutation
- **Kernel Population**: Max 50 kernels, generational evolution with survival of the fittest

**Pantheon Integration**:
- Kernels are assigned to priority gods: Athena, Ares, Hephaestus (sorted by Φ)
- During `poll_pantheon()`, each god's kernel is consulted via `consult_kernel()`
- Kernel influence computed via Fisher geodesic distance between kernel basin and target
- New kernels (Φ=0) apply negative probability modifiers; high-Φ kernels boost probability
- Training signals flow back via `train_kernel_from_outcome()` with directional feedback

**API Endpoints** (`/olympus/chaos/*`):
- `POST /olympus/chaos/spawn_random`: Create random kernel
- `POST /olympus/chaos/assign_kernels`: Auto-assign kernels to priority gods
- `GET /olympus/chaos/kernel_assignments`: View current assignments
- `POST /olympus/chaos/train_from_outcome`: Train all god kernels from assessment outcomes

**Key Files**:
- `qig-backend/olympus/zeus.py`: Kernel orchestration, auto-assignment, poll integration
- `qig-backend/olympus/base_god.py`: `consult_kernel()`, `train_kernel_from_outcome()` methods
- `qig-backend/olympus/chaos_api.py`: REST endpoints for kernel management
- `qig-backend/training_chaos/`: Kernel implementation and evolution logic

## External Dependencies

### Third-Party Services
- **Blockchain APIs**: 
  - Blockstream.info for transaction data
  - Blockchain.info as fallback
  - Rate-limited with exponential backoff
- **Search/Discovery**: SearXNG metasearch (FREE, self-hosted)
  - Primary instances: Railway deployments (https://mr-search.up.railway.app, https://searxng-production-e5ce.up.railway.app)
  - Public fallbacks for redundancy
  - Replaced Tavily API to eliminate $450+ costs

### Databases
- **PostgreSQL**: Primary persistence via Neon serverless
  - Connection pooling (max 20 connections)
  - Automatic retry logic for transient failures
  - **pgvector 0.8.0**: Native vector similarity search with HNSW indexes
    - 6 HNSW indexes for 64D basin coordinates (cosine similarity)
    - Tables indexed: `basin_history`, `manifold_probes`, `learning_events`, `narrow_path_events`, `ocean_waypoints`, `shadow_intel`
    - Sub-millisecond similarity search on 100K+ vectors
    - Query pattern: `ORDER BY basin_coords <=> query_vector::vector`

### Python Libraries
- **Core**: NumPy, SciPy for numerical computations
- **QIG**: Custom density matrix implementations
- **Web**: Flask for HTTP server, AIOHTTP for async requests
- **Tor Integration** (optional): Stem for darknet operations

### Node.js Libraries
- **Framework**: Express, Vite, React
- **Database**: Drizzle ORM, @neondatabase/serverless
- **UI**: Radix UI, Tailwind CSS
- **Build Tools**: TypeScript, ESBuild, Playwright for E2E testing

### Bitcoin Libraries
- **Key Generation**: bitcoinjs-lib for address derivation
- **BIP39/BIP32**: Mnemonic and HD wallet support
- **Cryptography**: Node crypto for SHA256 hashing

### Development Tools
- **Linting**: ESLint with TypeScript plugin
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Code Quality**: TypeScript strict mode, custom error boundaries