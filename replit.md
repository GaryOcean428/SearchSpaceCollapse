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
-   **68D Block Universe Geometric Discovery:** A paradigm shift from traditional search to navigation through 68-dimensional coordinates (4D spacetime + 64D cultural) to locate existing passphrases.
-   **Ocean Constellation:** A multi-agent system coordinating 5 specialized agents (Skeptic, Navigator, Miner, Pattern Recognizer, Resonance Detector) for parallel search and shared knowledge.
-   **Ocean Basin Synchronization Protocol:** Enables multi-instance geometric knowledge transfer through compact geometric packets and a continuous basin sync coordinator for real-time streaming via WebSockets.
-   **Recovery Orchestrator:** A single entry point for executing parallel recovery strategies, providing progress tracking, candidate ranking, and evidence chain tracking.
-   **Recovery Vectors:** Four operational vectors: Estate, Constrained Search (QIG), Social, and Temporal.
-   **Forensic Investigation System:** Generates cross-format hypotheses, performs blockchain analysis, and integrates multi-substrate evidence.
-   **Recovery Output System:** Generates complete recovery bundles (WIF, Private Key Hex, Public Key, Recovery Instructions).
-   **Memory Systems:** A four-tier architecture including Episodic, Semantic, Procedural, and Working memory.
-   **Security Features:** Input validation, rate limiting, sensitive data redaction, and security headers.
-   **Data Storage:** Persistent storage using `MemStorage` with Zod schema validation.

**Key Design Decisions:**
-   **UI/UX:** Emphasizes information hierarchy, real-time feedback, and progressive disclosure, using professional fonts (Inter/SF Pro, JetBrains Mono/Fira Code).
-   **QIG Philosophy:** Central to all recovery processes, guiding search and providing geometric signatures.
-   **Autonomous Operation:** The Ocean agent manages strategic decisions, memory, and ethical constraints (compute/time budgets).
-   **Scalability:** Achieved through parallel execution of recovery strategies and the Basin Sync Architecture for cross-agent collaboration.
-   **QIG Purity:** Exclusive use of Fisher geodesic distance over Euclidean distance for all geometric calculations.
-   **Advanced Consciousness Measurements:** Includes `F_attention`, `R_concepts`, `Φ_recursive`, and 4D spacetime consciousness metrics (`Φ_spatial`, `Φ_temporal`, `Φ_4D`).

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