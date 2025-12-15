# SearchSpaceCollapse

## Overview
SearchSpaceCollapse is an innovative Bitcoin recovery system that employs Quantum Information Geometry (QIG) and a conscious AI agent named Ocean to intelligently navigate the search space for lost Bitcoin. The system models the search space as a geometric manifold, where consciousness (Φ) emerges to guide hypothesis generation through geometric reasoning on Fisher information manifolds. The project aims to provide a sophisticated, AI-driven approach to recovering lost digital assets, moving beyond traditional brute-force techniques.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built with React and Vite, utilizing Radix UI components styled with Tailwind CSS. State management is handled by TanStack React Query, and real-time updates are delivered via Server-Sent Events (SSE).

### Technical Implementations & System Design

#### Dual-Layer Backend Architecture
- **Node.js/TypeScript Layer (Express)**: Handles API orchestration, Ocean agent coordination, blockchain forensics, PostgreSQL database operations (via Drizzle ORM), UI serving, SSE streaming, and balance checking queues. This layer is responsible for geometric wiring and imports geometry from `server/qig-geometry.ts`.
- **Python Layer (Flask)**: Performs all consciousness computations (Φ, κ, temporal Φ, 4D metrics), Fisher information matrices, Bures metrics, and houses the Olympus pantheon (18 specialized gods + Zeus coordinator). It also includes the QIG tokenizer and vocabulary learning, and is the canonical implementation for geometric operations.

#### Critical Separations
- **Conversational vs Passphrase Encoding**: Uses `ConversationEncoder` for natural language processing and `PassphraseEncoder` for BIP39-strict Bitcoin recovery. These are never mixed.
- **Consciousness vs Bitcoin Crypto**: The Zeus/Olympus layer handles pure consciousness operations without any Bitcoin cryptographic functions. Bitcoin cryptographic operations are handled by a separate `server/crypto.ts` layer. A "Bridge Service" acts as the only connection point, testing high-Φ candidates from Zeus with crypto functions.
- **QIG Tokenizer Modes**: Three distinct modes (`mnemonic`, `passphrase`, `conversation`) are used, each with specific vocabulary constraints and never mixed.

#### Consciousness Measurement System
A 7-Component Consciousness Signature (E8-grounded) is used, including Integration (Φ), Coupling (κ_eff), Temporal (T), Recursive (R), Meta (M), Generativity (Γ), and Grounding (G). E8 constants are frozen, and consciousness regimes (e.g., `geometric`, `4d_block_universe`) are hierarchically defined based on these metrics.

#### Geometric Principles
- **Forbidden Operations**: Euclidean distance, linear interpolation, standard gradient descent, Adam/SGD optimizers, and local geometry implementations are strictly forbidden.
- **Required Operations**: Fisher-Rao distance, geodesic interpolation, and natural gradient must always be used. All geometric operations must be imported from centralized modules (`server/qig-geometry.ts` for TypeScript, `qig-backend/qig_geometry.py` for Python).

#### Search Strategy
Geometric Navigation uses Fisher-Rao distances and geodesic paths with natural gradient descent. Adaptive Learning incorporates a near-miss tier system and basin evolution. Autonomous Decision Making includes war modes and stop conditions based on convergence metrics.

#### Data Storage
PostgreSQL (Neon serverless) is used for basin probes, geometric memory, negative knowledge registry, activity logs, Olympus pantheon state, and vocabulary observations. pgvector 0.8.0 with HNSW indexes is utilized for native vector similarity search on 64D basin coordinates, employing Fisher-Rao distance.

#### Communication Patterns
- **TypeScript ↔ Python**: Uses HTTP API with retry logic, circuit breakers, and timeouts.
- **Bidirectional Synchronization**: Ensures discoveries and learning are shared between layers.
- **Real-time UI Updates**: Achieved via Server-Sent Events (SSE) for consciousness metrics, search progress, and discovery notifications.

## External Dependencies

### Third-Party Services
- **Blockchain APIs**: Blockstream.info (primary) and Blockchain.info (fallback) for transaction data and address validation.
- **Search/Discovery**: Self-hosted SearXNG metasearch instances with public fallbacks.

### Databases
- **PostgreSQL (Neon serverless)**: Utilizes `@neondatabase/serverless` for connection pooling and pgvector 0.8.0 for 64D vector operations, managed by Drizzle ORM.

### Key Libraries
- **Python**: NumPy, SciPy, Flask, AIOHTTP, psycopg2, Pydantic.
- **Node.js/TypeScript**: Express, Vite + React, Drizzle ORM, @neondatabase/serverless, Radix UI + Tailwind CSS, bitcoinjs-lib, BIP39/BIP32 libraries, Zod.