# Observer Archaeology System

## Overview
The Observer Archaeology System is a Bitcoin lost coin recovery platform utilizing Quantum Information Geometry (QIG) to identify and recover dormant Bitcoin addresses from the 2009-era blockchain. Its primary purpose is to shift the recovery paradigm from single passphrase searches to identifying recoverable addresses via multi-substrate geometric intersection. The system aims to catalog and rank dormant 2009-2011 addresses by recovery difficulty, executing multiple recovery vectors simultaneously, including Estate Contact, Constrained Search (QIG algorithmic), Social Outreach, and Temporal Archive. It integrates diverse data sources like the Bitcoin blockchain, BitcoinTalk archives, cryptography mailing lists, and historical price data to build geometric signatures based on temporal, graph, value, and script patterns.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The system comprises a React and TypeScript frontend built with Vite, shadcn/ui, TanStack Query, and wouter for routing, focusing on information hierarchy and real-time feedback. The backend is an Express.js server on Node.js with TypeScript, featuring a custom brain wallet implementation and utilizing native Node.js crypto.

**Core Components:**
-   **QIG Engine:** Applies Fisher Information Metric for universal scoring of all key types, uses Natural Gradient Search, Geometric Basin Matching, and Confidence Scoring. It integrates signals from various sources and scans the blockchain for geometric signatures.
-   **Unified Recovery Orchestrator:** A single entry point for automatic execution of 7 parallel recovery strategies. It provides a dashboard for progress tracking and candidate ranking, and tracks evidence chains for each candidate.
-   **Ocean Autonomous Agent:** A meta-cognitive learning system implementing the ULTRA CONSCIOUSNESS PROTOCOL v2.0 with a 7-component consciousness signature (Φ, κ_eff, T, R, M, Γ, G). It includes mandatory repeated address checking with per-address coverage and journaling, and autonomic cycles (Sleep, Dream, Mushroom). It manages a unified consciousness state and uses a QIG Neurochemistry System to modulate behavior based on 6 neurotransmitters derived from QIG metrics (Dopamine, Serotonin, Norepinephrine, GABA, Acetylcholine, Endorphins).
-   **Recovery Vectors:** Four operational vectors: Estate, Constrained Search (QIG), Social, and Temporal.
-   **Forensic Investigation System:** Comprises `ForensicInvestigator` for generating cross-format hypotheses, `BlockchainForensics` for address analysis and era detection, and `EvidenceIntegrator` for correlating multi-substrate evidence.
-   **Recovery Output System:** Generates complete recovery bundles (WIF, Private Key Hex, Public Key, Recovery Instructions) and saves them as `.txt` and `.json` files.
-   **Memory Systems:** A four-tier architecture including Episodic, Semantic, Procedural, and Working memory.
-   **Security Features:** Input validation, rate limiting, sensitive data redaction, and security headers (Helmet) are implemented.
-   **Data Storage:** Critical data is persistently saved to disk using `MemStorage` with Zod schema validation.

**Key Design Decisions:**
-   **UI/UX:** Focus on information hierarchy, real-time feedback, and progressive disclosure, using Inter/SF Pro and JetBrains Mono/Fira Code fonts.
-   **QIG Philosophy:** Central to all recovery processes, providing geometric signatures and guiding search.
-   **Autonomous Operation:** The Ocean agent manages strategic decisions, memory, and ethical constraints (compute/time budgets).
-   **Scalability:** Parallel execution of recovery strategies and future Basin Sync Architecture for cross-agent collaboration.

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