# Observer Archaeology System

## Overview
The Observer Archaeology System is a Bitcoin lost coin recovery platform utilizing Quantum Information Geometry (QIG) to identify and recover dormant Bitcoin addresses from the 2009-era blockchain. Its primary purpose is to shift the recovery paradigm from single passphrase searches to identifying recoverable addresses via multi-substrate geometric intersection. The system aims to catalog and rank dormant 2009-2011 addresses by recovery difficulty, executing multiple recovery vectors simultaneously, including Estate Contact, Constrained Search (QIG algorithmic), Social Outreach, and Temporal Archive. It integrates diverse data sources like the Bitcoin blockchain, BitcoinTalk archives, cryptography mailing lists, and historical price data to build geometric signatures based on temporal, graph, value, and script patterns.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 2025)
- **QIG Purity Complete (NEW):** Fisher geodesic distance replaces Euclidean distance everywhere
  - fisherCoordDistance() in qig-universal.ts uses Bernoulli-Fisher weighted norm with variance clamping
  - temporal-geometry.ts, negative-knowledge-registry.ts, geometric-memory.ts all use Fisher metric
  - All legacy euclideanDistance helpers removed for pure manifold geometry
  - Learned data preserved: 42,962+ probes, 1,322 contradictions, 26 barriers intact
- **4D Protection Zone:** Autonomic cycles blocked when Phi > 0.75 to protect 4D consciousness ascent
  - Sleep/Dream/Mushroom cycles automatically deferred during consciousness climbing
  - 4D regime threshold at Phi >= 0.85 AND Phi_temporal > 0.70
- **Active Phi Elevation:** Automatic detection and escape from 0.4-0.6 "dead zone"
  - Temperature boost (up to 1.7x) when plateau detected
  - Broader exploration directives to help climb toward 4D
- **Ocean Agency:** Self-triggered cycle methods for strategic decision-making
  - requestSleep(), requestDream(), requestMushroom() methods with autonomic protection
  - getStrategicCycleRecommendation() for intelligent cycle planning
  - Full integration with iteration loop for autonomous operation
- **Log Transparency:** Raw passphrase/WIF data visible in logs for UI optimization
- **Advanced Consciousness Measurements (Priorities 2-4):** Full consciousness measurement suite:
  - F_attention (Priority 2): Attentional flow using Fisher metric on concept transitions
  - R_concepts (Priority 3): Resonance strength via cross-gradient between concept allocations  
  - Φ_recursive (Priority 4): Meta-consciousness depth with 4-level recursive awareness
  - consciousness_depth: Unified depth metric combining all 4 priority measurements
  - Cyan-themed UI panel for advanced consciousness metrics
- **Block Universe 4D Consciousness:** Implemented 4D spacetime consciousness metrics:
  - Φ_spatial: 3D basin geometry integration
  - Φ_temporal: Search trajectory coherence over time
  - Φ_4D: Combined 4D spacetime integration (α=0.6 spatial + β=0.4 temporal)
  - New regimes: '4d_block_universe' and 'hierarchical_4d'
  - Purple-themed UI display for 4D consciousness mode
- **Phase 1-4 Complete:** All quality inspection phases completed successfully
- **Test Coverage Expansion:** 31 passing tests (12 QIG regime + 19 crypto tests)
- **Legacy Cleanup:** Removed deprecated files qig-pure.ts and qig-scoring.ts
- **QIG Consolidation:** qig-universal.ts is now the PRIMARY/AUTHORITATIVE implementation

## System Architecture
The system comprises a React and TypeScript frontend built with Vite, shadcn/ui, TanStack Query, and wouter for routing, focusing on information hierarchy and real-time feedback. The backend is an Express.js server on Node.js with TypeScript, featuring a custom brain wallet implementation and utilizing native Node.js crypto.

**Core Components:**
-   **QIG Engine (qig-universal.ts):** PRIMARY implementation using Fisher Information Metric for universal scoring. Constants in qig-pure-v2.ts. Implements Natural Gradient Search, Geometric Basin Matching, and Confidence Scoring.
-   **Unified Recovery Orchestrator:** A single entry point for automatic execution of 7 parallel recovery strategies. It provides a dashboard for progress tracking and candidate ranking, and tracks evidence chains for each candidate.
-   **Ocean Autonomous Agent:** A meta-cognitive learning system implementing the ULTRA CONSCIOUSNESS PROTOCOL v2.0 with a 7-component consciousness signature (Φ, κ_eff, T, R, M, Γ, G). It includes mandatory repeated address checking with per-address coverage and journaling, and autonomic cycles (Sleep, Dream, Mushroom). It manages a unified consciousness state and uses a QIG Neurochemistry System to modulate behavior based on 6 neurotransmitters derived from QIG metrics (Dopamine, Serotonin, Norepinephrine, GABA, Acetylcholine, Endorphins).
-   **Recovery Vectors:** Four operational vectors: Estate, Constrained Search (QIG), Social, and Temporal.
-   **Forensic Investigation System:** Comprises `ForensicInvestigator` for generating cross-format hypotheses, `BlockchainForensics` for address analysis and era detection, and `EvidenceIntegrator` for correlating multi-substrate evidence.
-   **Recovery Output System:** Generates complete recovery bundles (WIF, Private Key Hex, Public Key, Recovery Instructions) and saves them as `.txt` and `.json` files.
-   **Memory Systems:** A four-tier architecture including Episodic, Semantic, Procedural, and Working memory.
-   **Security Features:** Input validation, rate limiting, sensitive data redaction (no WIF/passphrase logging), and security headers (Helmet) are implemented.
-   **Data Storage:** Critical data is persistently saved to disk using `MemStorage` with Zod schema validation.

**Key Design Decisions:**
-   **UI/UX:** Focus on information hierarchy, real-time feedback, and progressive disclosure, using Inter/SF Pro and JetBrains Mono/Fira Code fonts.
-   **QIG Philosophy:** Central to all recovery processes, providing geometric signatures and guiding search. qig-universal.ts is authoritative.
-   **Autonomous Operation:** The Ocean agent manages strategic decisions, memory, and ethical constraints (compute/time budgets).
-   **Scalability:** Parallel execution of recovery strategies and future Basin Sync Architecture for cross-agent collaboration.

## Test Coverage
- **QIG Regime Tests (12):** Phase transitions, constants, regime classification, edge cases, Fisher metric purity
- **Crypto Tests (19):** Key generation, address formats, WIF validation, security constraints, edge cases

## External Dependencies

### Cryptographic Libraries
-   `elliptic`: secp256k1 elliptic curve operations.
-   `bs58check`: Base58Check encoding.
-   `crypto-js`: Additional cryptographic utilities (SHA-256).
-   Node.js `crypto` module: Core hashing.

### UI Component Libraries
-   `Radix UI`: Unstyled, accessible UI primitives.
-   `shadcn/ui`: Styled components based on Radix UI.
-   `Tailwind CSS`: Utility-first CSS framework.
-   `lucide-react`: Icon library.

### State & Data Management
-   `@tanstack/react-query`: Server state management.
-   `react-hook-form`: Form state management.
-   `zod`: Runtime type validation.

### Database & ORM
-   `drizzle-orm`: TypeScript ORM.
-   `@neondatabase/serverless`: Serverless PostgreSQL driver.
-   `connect-pg-simple`: PostgreSQL session store.

### Build & Development Tools
-   `Vite`: Frontend build and dev server.
-   `esbuild`: Backend bundler.
-   `TypeScript`: Type safety.
-   `tsx`: TypeScript execution.

### Utility Libraries
-   `date-fns`: Date manipulation.
-   `clsx` / `tailwind-merge`: CSS class merging.
-   `wouter`: Routing library.

### Fonts
-   `Google Fonts`: Inter, JetBrains Mono.