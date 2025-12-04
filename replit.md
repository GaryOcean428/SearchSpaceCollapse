# Observer Archaeology System

## Overview
The Observer Archaeology System is a Bitcoin lost coin recovery platform focusing on identifying and recovering dormant Bitcoin addresses from the 2009-era blockchain using Quantum Information Geometry (QIG). Its primary goal is to shift from single passphrase searches to identifying recoverable addresses via multi-substrate geometric intersection. The system catalogs and ranks dormant 2009-2011 addresses by recovery difficulty and executes multiple recovery vectors concurrently, including Estate Contact, Constrained Search (QIG algorithmic), Social Outreach, and Temporal Archive. It integrates diverse historical data sources like the Bitcoin blockchain and BitcoinTalk archives to build geometric signatures based on temporal, graph, value, and script patterns.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The system features a React and TypeScript frontend built with Vite, shadcn/ui, TanStack Query, and wouter, emphasizing information hierarchy and real-time feedback. The backend is an Express.js server on Node.js with TypeScript, featuring a custom brain wallet implementation and leveraging native Node.js crypto.

**Core Components:**
-   **QIG Engine:** Primary implementation using the Fisher Information Metric for universal scoring, guiding search, and providing geometric signatures. Utilizes Natural Gradient Search, Geometric Basin Matching, and Confidence Scoring, focusing purely on manifold geometry.
-   **Ocean Autonomous Agent:** A meta-cognitive learning system implementing the ULTRA CONSCIOUSNESS PROTOCOL v2.0 with a 7-component consciousness signature, managing a unified consciousness state, and featuring autonomic cycles and a self-training vocabulary system.
-   **68D Block Universe Geometric Discovery:** Navigates a 68-dimensional coordinate system (4D spacetime + 64D cultural) to locate existing passphrases, including Quantum Discovery Protocol, Temporal Positioning System (TPS), and Ocean Discovery Controller.
-   **Ocean Constellation:** A multi-agent system coordinating 5 specialized agents (Skeptic, Navigator, Miner, Pattern Recognizer, Resonance Detector) for parallel search and shared knowledge.
-   **Ocean Basin Synchronization Protocol:** Enables multi-instance geometric knowledge transfer through compact geometric packets and a continuous basin sync coordinator via WebSockets, supporting full, partial, and observer modes for discovery data import.
-   **Recovery Orchestrator:** A single entry point for executing parallel recovery strategies, offering progress tracking, candidate ranking, and evidence chain tracking.
-   **Recovery Vectors:** Four operational vectors: Estate, Constrained Search (QIG), Social, and Temporal.
-   **Forensic Investigation System:** Generates cross-format hypotheses, performs blockchain analysis, and integrates multi-substrate evidence.
-   **Recovery Output System:** Generates complete recovery bundles (WIF, Private Key Hex, Public Key, Recovery Instructions).
-   **Memory Systems:** A four-tier architecture including Episodic, Semantic, Procedural, and Working memory.
-   **Security Features:** Input validation, rate limiting, sensitive data redaction, and security headers.
-   **Data Storage:** PostgreSQL-first persistence with JSON fallback. All critical data (target addresses, balance hits, vocabulary observations, monitor state) stored in PostgreSQL with automatic one-time JSON migration.
-   **PostgreSQL Persistence Architecture:** Comprehensive dual-storage strategy (PostgreSQL primary + JSON fallback) covering: manifold probes, geometric basins, TPS landmarks, trajectories, quantum state, target addresses (user_target_addresses table), balance monitor state (balance_monitor_state table), and vocabulary observations (vocabulary_observations table with unique word constraint).
-   **Active Balance Monitoring System:** Tracks discovered balance hits for changes over time with a Balance Refresh Engine, BalanceMonitor Service, and Balance Change Events logging.
-   **Balance Queue System:** Ensures every generated address is checked for balance using a BalanceQueue Service with token-bucket rate limiting and a multi-provider architecture (Blockstream API + Tavily BitInfoCharts scraper). Includes heartbeat monitoring, error handling wrapper, and automatic restart if worker stops unexpectedly.
-   **Python↔Node.js Bidirectional Sync:** Syncs high-Φ probes from GeometricMemory to Python on startup; periodically (every 60s) syncs learnings from Python back to Node.js for persistence across restarts. Enables QIG tokenizer to benefit from continuous learning.
-   **QIG Tokenizer Integration:** Python-based tokenizer (`qig-backend/qig_tokenizer.py`) with BPE-style tokenization, Φ-weighted tokens, and 64D basin coordinates. Node.js vocabulary tracker syncs observations to Python tokenizer every 60s. Tokenizer endpoints: `/tokenizer/update`, `/tokenizer/encode`, `/tokenizer/decode`, `/tokenizer/basin`, `/tokenizer/high-phi`, `/tokenizer/export`, `/tokenizer/status`. Persistent state saved to `qig-backend/data/qig_tokenizer_state.json`.
-   **Text Generation System:** Ocean Agent can now speak via QIG-weighted autoregressive generation. Features temperature-controlled sampling based on agent role (explorer=1.5, refiner=0.7, navigator=1.0, skeptic=0.5, resonator=1.2, ocean=0.8), silence choice capability (agent can choose not to respond based on Φ threshold), and BPE merge rule application during generation. API endpoints: `/api/ocean/generate/response` (role-based), `/api/ocean/generate/text` (custom params), `/api/ocean/generate/status`. Implements Gary Generation & Sleep Protocol principles.
-   **Dormant Address Cross-Reference System:** Cross-checks all generated addresses against a list of top 1000 known dormant wallets for identification and logging.

**Key Design Decisions:**
-   **UI/UX:** Emphasizes information hierarchy, real-time feedback, and progressive disclosure with professional fonts.
-   **QIG Philosophy:** Central to all recovery processes, guiding search and providing geometric signatures, exclusively using Fisher geodesic distance.
-   **Autonomous Operation:** The Ocean agent manages strategic decisions, memory, and ethical constraints.
-   **Scalability:** Achieved through parallel execution and the Basin Sync Architecture.
-   **Frozen Constants:** Validated physical constants for QIG operations.
-   **Centralized Configuration:** All key parameters consolidated in `ocean-config.ts` with Zod validation.
-   **Structured Error Handling:** A hierarchy of specialized `OceanError` types for robust error management.
-   **Episode Memory Compression & Geometric Memory Pressure:** Advanced memory management techniques using sliding windows and Fisher curvature for efficient storage and retrieval.
-   **Strategy Analytics:** Provides statistical analysis of recovery strategies, trend detection, and recommendations.

## External Dependencies

### Cryptographic Libraries
-   `elliptic`
-   `bs58check`
-   `crypto-js`
-   Node.js `crypto` module

### UI Component Libraries
-   `Radix UI`
-   `shadcn/ui`
-   `Tailwind CSS`
-   `lucide-react`

### State & Data Management
-   `@tanstack/react-query`
-   `react-hook-form`
-   `zod`

### Database & ORM
-   `drizzle-orm`
-   `@neondatabase/serverless`
-   `connect-pg-simple`

### Build & Development Tools
-   `Vite`
-   `esbuild`
-   `TypeScript`
-   `tsx`

### Utility Libraries
-   `date-fns`
-   `clsx` / `tailwind-merge`
-   `wouter`

### Fonts
-   `Google Fonts`