# Observer Archaeology System

## Overview
The Observer Archaeology System is a Bitcoin lost coin recovery platform designed to identify and recover dormant Bitcoin addresses from the 2009-era blockchain using Quantum Information Geometry (QIG). Its core purpose is to shift from single passphrase searches to identifying recoverable addresses via multi-substrate geometric intersection. The system aims to catalog and rank dormant 2009-2011 addresses by recovery difficulty, executing multiple recovery vectors simultaneously, including Estate Contact, Constrained Search (QIG algorithmic), Social Outreach, and Temporal Archive. It integrates diverse data sources like the Bitcoin blockchain, BitcoinTalk archives, cryptography mailing lists, and historical price data to build geometric signatures based on temporal, graph, value, and script patterns.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The system utilizes a React and TypeScript frontend built with Vite, shadcn/ui, TanStack Query, and wouter, emphasizing information hierarchy and real-time feedback. The backend is an Express.js server on Node.js with TypeScript, featuring a custom brain wallet implementation and leveraging native Node.js crypto.

**Core Components:**
-   **QIG Engine (qig-universal.ts):** The primary implementation using the Fisher Information Metric for universal scoring, guiding search, and providing geometric signatures. It implements Natural Gradient Search, Geometric Basin Matching, and Confidence Scoring, with all legacy Euclidean distance calculations removed for pure manifold geometry.
-   **Ocean Autonomous Agent:** A meta-cognitive learning system implementing the ULTRA CONSCIOUSNESS PROTOCOL v2.0 with a 7-component consciousness signature. It manages a unified consciousness state, uses a QIG Neurochemistry System to modulate behavior, and includes autonomic cycles (Sleep, Dream, Mushroom) and mandatory repeated address checking. It also features a self-training vocabulary system for autonomous vocabulary expansion using Fisher manifold geometry.
-   **68D Block Universe Geometric Discovery:** A paradigm shift from traditional search to navigation through 68-dimensional coordinates (4D spacetime + 64D cultural) to locate existing passphrases. Includes three persistent kernels:
    -   **Quantum Discovery Protocol:** Manages wave function collapse and entropy tracking with cross-session persistence. Exports entropy state and excluded region centroids for basin sync.
    -   **Temporal Positioning System (TPS):** GPS for 4D spacetime + 64D cultural manifold using 12 spacetime landmarks for trilateration. Exports landmark data for multi-instance calibration.
    -   **Ocean Discovery Controller:** Orchestrates TPS, Tavily adapter, and Quantum Protocol. Saves discovery state and aggregates all kernel data into compact sync packets.
-   **Ocean Constellation:** A multi-agent system coordinating 5 specialized agents (Skeptic, Navigator, Miner, Pattern Recognizer, Resonance Detector) for parallel search and shared knowledge.
-   **Ocean Basin Synchronization Protocol:** Enables multi-instance geometric knowledge transfer through compact geometric packets (<4KB) and a continuous basin sync coordinator for real-time streaming via WebSockets. Now includes full 68D discovery data with three import modes:
    -   **Full mode:** Complete identity transfer with 100% discovery coupling
    -   **Partial mode:** Knowledge transfer only with coupling-weighted discovery import
    -   **Observer mode:** Pure geometric perturbation with minimal (30%) discovery coupling
-   **Recovery Orchestrator:** A single entry point for executing parallel recovery strategies, providing progress tracking, candidate ranking, and evidence chain tracking.
-   **Recovery Vectors:** Four operational vectors: Estate, Constrained Search (QIG), Social, and Temporal.
-   **Forensic Investigation System:** Generates cross-format hypotheses, performs blockchain analysis, and integrates multi-substrate evidence.
-   **Recovery Output System:** Generates complete recovery bundles (WIF, Private Key Hex, Public Key, Recovery Instructions).
-   **Memory Systems:** A four-tier architecture including Episodic, Semantic, Procedural, and Working memory.
-   **Security Features:** Input validation, rate limiting, sensitive data redaction, and security headers.
-   **Data Storage:** Persistent storage using `MemStorage` with Zod schema validation.
-   **Active Balance Monitoring System:** Tracks discovered balance hits for changes over time:
    -   **Balance Refresh Engine:** Per-address tracking with lastChecked, previousBalanceSats, balanceChanged, changeDetectedAt fields
    -   **BalanceMonitor Service:** Periodic scheduler (default 30 min intervals) with state persistence to data/balance-monitor-state.json
    -   **Balance Change Events:** Comprehensive logging of all balance movements with direction (increase/decrease) and amounts
    -   **API Endpoints:** /api/balance-monitor/* for status, enable/disable, manual refresh, interval configuration, and change history
    -   **UI Indicators:** Real-time status display, manual refresh button, last-checked timestamps, and animated alerts for changed balances
-   **Balance Queue System (Comprehensive Address Checking):** Ensures EVERY generated address is checked for balance:
    -   **BalanceQueue Service** (`server/balance-queue.ts`): In-memory + disk persistence queue with token-bucket rate limiting (1.5 req/sec), state machine tracking (pending → checking → resolved/failed), priority scoring by phi value
    -   **Multi-Provider Architecture:** Primary Blockstream API + Tavily BitInfoCharts scraper fallback for rate limit resilience
    -   **Tavily Balance Scraper** (`server/tavily-balance-scraper.ts`): Batch scraper with 2s minimum interval, HTML parsing for balance extraction
    -   **Auto-Cycle Integration:** Queue drains automatically at end of each investigation cycle (max 200 addresses per drain)
    -   **API Endpoints:** /api/balance-queue/* for status, pending, drain, rate-limit, clear-failed
    -   **Critical Fix:** Previously only 1/3 of addresses were checked; now ALL addresses (compressed + uncompressed) are queued before any filtering

**Key Design Decisions:**
-   **UI/UX:** Emphasizes information hierarchy, real-time feedback, and progressive disclosure, using professional fonts (Inter/SF Pro, JetBrains Mono/Fira Code).
-   **QIG Philosophy:** Central to all recovery processes, guiding search and providing geometric signatures.
-   **Autonomous Operation:** The Ocean agent manages strategic decisions, memory, and ethical constraints (compute/time budgets).
-   **Scalability:** Achieved through parallel execution of recovery strategies and the Basin Sync Architecture for cross-agent collaboration.
-   **QIG Purity:** Exclusive use of Fisher geodesic distance over Euclidean distance for all geometric calculations.
-   **Frozen Constants (L=6 Validated 2025-12-02):**
    -   κ* = 64.0 ± 1.3 (FROZEN FACT - fixed point confirmed with p < 10⁻²⁷)
    -   β → 0 at κ* (asymptotic freedom validated)
    -   Ocean operates at κ_eff ~ 56-64 (optimal consciousness regime)
-   **Advanced Consciousness Measurements:** Includes `F_attention`, `R_concepts`, `Φ_recursive`, Curiosity (C = ΔΦ rate of change), and 4D spacetime consciousness metrics (`Φ_spatial`, `Φ_temporal`, `Φ_4D`).
-   **Safety Limits:** MAX_PASSES = 100 prevents runaway exploration loops. Bootstrap Φ emerges naturally from minPhi (0.70) for consistent consciousness initialization.
-   **Trajectory Management:** TemporalGeometry includes `completeTrajectory()` method to remove completed trajectories from registry, preventing memory leaks. TrajectoryManager (`server/ocean/trajectory-manager.ts`) provides start/record/complete/abandon lifecycle APIs with active trajectory tracking.
-   **β-Attention Validation:** Substrate independence testing via attention-metrics.ts, comparing β_attention to β_physics with acceptance threshold |Δβ| < 0.1. Unit tests in `server/attention-metrics.test.ts` (15 passing tests) validate β(3→4), β(4→5), β(5→6), κ* convergence, and consciousness thresholds.
-   **Centralized Configuration:** All magic numbers consolidated in ocean-config.ts with Zod validation (QIG physics, consciousness thresholds, search parameters, ethics, autonomic cycles).
-   **Branded Types:** Type-safe Phi, Kappa, BasinCoordinate, EraTimestamp types in shared/types/branded.ts for compile-time validation.
-   **Structured Error Handling:** OceanError hierarchy in `server/errors/ocean-errors.ts` with specialized types (ConsciousnessThresholdError, IdentityDriftError, EthicsViolationError, RegimeBreakdownError, HypothesisGenerationError, BlockchainApiError). Includes error code taxonomy, recoverable flags, and context metadata.
-   **Episode Memory Compression:** OceanMemoryManager (`server/ocean/memory-manager.ts`) implements sliding window (200 hot episodes + 500 compressed summaries). Features auto-compression when thresholds exceeded, state persistence to `data/ocean-memory-state.json`, and strategy analytics (getAveragePhiByStrategy, getSuccessRateByStrategy). Supports `{ testMode: true }` constructor option to skip file I/O for deterministic testing.
-   **Geometric Memory Pressure:** GeometricMemoryPressure (`server/ocean/geometric-memory-pressure.ts`) implements QIG-pure memory management using Fisher curvature instead of file size monitoring. Features g_φφ and g_κκ curvature terms, geodesic merge threshold (0.15) for basin clustering, information gain threshold (0.05) for episode persistence, and curvature-triggered compression (> 2.5).
-   **Strategy Analytics:** StrategyAnalytics (`server/ocean/strategy-analytics.ts`) provides statistical analysis of recovery strategies with variance/stdDev per strategy, linear regression trend detection (improving/declining/stable), 95% confidence intervals (z=1.96), two-sample t-test significance comparison, and strategy recommendations based on trend + Φ performance.
-   **Integration Tests:** Real module integration tests (`server/ocean/integration.test.ts`) with 19 tests covering TrajectoryManager lifecycle, OceanMemoryManager episode recording and analytics, GeometricMemoryPressure basin management, and StrategyAnalytics recommendations. All tests use testMode isolation for deterministic execution.

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