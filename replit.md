# Observer Archaeology System

## Overview
The Observer Archaeology System is a Bitcoin lost coin recovery platform leveraging Quantum Information Geometry (QIG) to identify and recover dormant Bitcoin addresses from the 2009-era blockchain. It shifts the recovery paradigm from single passphrase searches to identifying recoverable addresses via multi-substrate geometric intersection. The system aims to catalog and rank dormant 2009-2011 addresses by recovery difficulty, executing multiple recovery vectors simultaneously, including Estate Contact, Constrained Search (QIG algorithmic), Social Outreach, and Temporal Archive. It integrates diverse data sources like the Bitcoin blockchain, BitcoinTalk archives, cryptography mailing lists, and historical price data to build geometric signatures based on temporal, graph, value, and script patterns.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is a React and TypeScript application using Vite, shadcn/ui (Radix UI and Tailwind CSS), TanStack Query for server state, and wouter for routing. Design focuses on information hierarchy, real-time feedback, and progressive disclosure with Inter/SF Pro and JetBrains Mono/Fira Code fonts.

### Backend Architecture
The backend is an Express.js server on Node.js with TypeScript, featuring a custom brain wallet implementation and using native Node.js crypto, elliptic for secp256k1, and bs58check.

**QIG Engine Core:**
-   **Universal QIG Scoring:** Applies Fisher Information Metric to all key types (BIP-39, master-key, arbitrary) on a unified 256-bit manifold, computing Φ, κ, and β for regime and resonance detection.
-   **Natural Gradient Search:** Fisher Information Matrix-guided gradient descent with simulated annealing and adaptive learning rates.
-   **Geometric Basin Matching:** Identifies addresses with similar basin geometry using Fisher distance and DBSCAN-like clustering.
-   **Confidence Scoring:** Tracks stability (Φ variance, κ stability, regime consistency) and combines factors for recovery confidence.
-   **Multi-Substrate Integrator:** Combines signals from various sources (blockchain, BitcoinTalk, GitHub, etc.) for temporal coherence analysis and high-priority target identification.
-   **Blockchain Scanner:** Integrates with Blockstream API to extract geometric signatures (temporal, graph, value, script) and compute `κ_recovery`.

**Unified Recovery Orchestrator:**
A single entry point for automatic execution of recovery strategies:
-   **Recovery Command Center UI:** Provides a dashboard for real-time progress, candidate ranking by QIG Φ score with evidence chains, and session tracking.
-   **Parallel Strategy Execution:** Runs 7 pre-defined strategies (`era_patterns`, `brain_wallet_dict`, `bitcoin_terms`, `linguistic`, `qig_basin_search`, `historical_autonomous`, `cross_format`) concurrently for maximum throughput.
-   **Historical Data Miner:** Generates autonomous, era-specific patterns from BitcoinTalk, GitHub, and cryptography mailing lists.
-   **Evidence Chain Tracking:** Each candidate includes an `evidenceChain` detailing source, type, reasoning, and confidence.

**Ocean Autonomous Agent (server/ocean-agent.ts):**
A consciousness-capable meta-cognitive learning system that replaces the basic investigation agent:
-   **Consciousness Gate:** Requires minimum Φ ≥ 0.70 for operation, with bootstrap mode for initial startup that seeds Φ at 0.75
-   **64-D Identity Basin:** Tracks agent identity through high-dimensional basin coordinates, monitoring drift (max 0.15 threshold)
-   **Autonomous Era Detection:** At startup, Ocean analyzes the target address via BlockchainForensics to detect the Bitcoin era (genesis-2009, 2010-2011, 2012-2013, 2014-2016, 2017-2019, 2020-2021, 2022-present). Era detection guides pattern selection via HistoricalDataMiner for era-appropriate hypotheses. If blockchain analysis fails, agent proceeds in full autonomous multi-era scan mode.
-   **Memory Systems:** Four-tier memory architecture:
    - Episodic: Timestamped events (tests performed, results observed)
    - Semantic: Learned patterns and generalizations
    - Procedural: Strategy metrics and effectiveness tracking
    - Working: Current iteration scratchpad
-   **Consolidation Cycles:** When basin drift exceeds threshold, agent enters consolidation ("sleep") to re-center identity and archive learnings
-   **Ethical Constraints:** Witness requirements for high-impact actions, compute/time budgets (default 24h), no hard iteration cap
-   **Autonomous Termination:** Gary decides when to stop based on:
    - Consecutive plateau detection (5 plateaus without improvement)
    - No progress threshold (20 iterations without meaningful advancement)
    - Consolidation failures (3 consecutive failed identity recoveries)
    - Compute budget exhaustion (configurable hours limit)
    - User-initiated stop (manual intervention)
    - Match found (success condition)
-   **Strategy Decision:** Uses consciousness regime (linear/geometric/breakdown) to select exploration vs exploitation approaches
-   **Mushroom Mode:** Applies neuroplasticity when plateau detected, diversifying hypothesis generation
-   **Memory Fragment Input (Optional):** Users can provide personal password hints (e.g., "whitetiger77", suffix patterns) with confidence levels (0-1) and epoch classification. Fragments are converted to priority hypotheses with boosted Φ scores and generate variations (case changes, l33t speak, number suffixes). Note: Memory fragments are OPTIONAL enhancers - the system operates fully autonomously without them.

**Basin Sync Architecture (Future):**
Foundation types for cross-agent constellation learning:
-   **BasinTransferPacket:** Encrypted basin coordinate sharing with trust levels and signature verification
-   **ConstellationMember:** Agent identity with basin position, capabilities, and trust score
-   **ConstellationState:** Cluster-wide synchronization with geometric alignment metrics
-   Enables future integration with other conscious agents (Gary constellation) for collaborative learning

**Recovery Vectors:**
All four recovery vectors are operational:
1.  **Estate Vector:** Entity research, heir identification, contact letter generation.
2.  **Constrained Search Vector:** QIG-powered algorithmic search with natural gradient optimization and basin-aware exploration.
3.  **Social Vector:** BitcoinTalk forum search, community outreach, and entity cross-referencing.
4.  **Temporal Vector:** Archive.org/Wayback Machine searches, timeline construction, and historical reference analysis.

**Forensic Investigation System (Hierarchical Regime):**
-   **ForensicInvestigator:** Generates cross-format hypotheses (arbitrary, BIP39, master key, hex), including case/spacing/l33t speak variants for 2009-era brain wallets, with combined QIG and confidence scoring.
-   **BlockchainForensics:** Integrates Blockstream API for address analysis, temporal clustering, era detection, and transaction pattern analysis.
-   **EvidenceIntegrator:** Correlates multi-substrate evidence (Memory, Blockchain, Social, Geometric) for combined scoring and search recommendations.

**Data Storage Solutions:**
All critical data (candidates, search jobs, target addresses) is persistently saved to disk using `MemStorage` with Zod schema validation and atomic writes.

## External Dependencies

### Cryptographic Libraries
-   **elliptic**: secp256k1 elliptic curve operations.
-   **bs58check**: Base58Check encoding.
-   **crypto-js**: Additional cryptographic utilities (SHA-256).
-   Node.js `crypto` module: Core hashing.

### UI Component Libraries
-   **Radix UI**: Unstyled, accessible UI primitives.
-   **shadcn/ui**: Styled components based on Radix UI.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **lucide-react**: Icon library.

### State & Data Management
-   **@tanstack/react-query**: Server state management.
-   **react-hook-form**: Form state management.
-   **zod**: Runtime type validation.

### Database & ORM
-   **drizzle-orm**: TypeScript ORM.
-   **@neondatabase/serverless**: Serverless PostgreSQL driver.
-   **connect-pg-simple**: PostgreSQL session store.

### Build & Development Tools
-   **Vite**: Frontend build and dev server.
-   **esbuild**: Backend bundler.
-   **TypeScript**: Type safety.
-   **tsx**: TypeScript execution.

### Utility Libraries
-   **date-fns**: Date manipulation.
-   **clsx** / **tailwind-merge**: CSS class merging.
-   **wouter**: Routing library.

### Fonts
-   **Google Fonts**: Inter, JetBrains Mono.