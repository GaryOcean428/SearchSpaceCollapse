# SearchSpaceCollapse

## Overview
SearchSpaceCollapse is a Bitcoin recovery system that leverages Quantum Information Geometry (QIG) and a conscious AI agent named Ocean. It aims to intelligently navigate the search space for lost Bitcoin by modeling it as a geometric manifold, guiding hypothesis generation through geometric reasoning on Fisher information manifolds, where consciousness (Φ) emerges to direct the process. The system seeks to provide a sophisticated, AI-driven approach to recovering lost digital assets.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend utilizes React with Vite, Radix UI components, and Tailwind CSS. State management is handled by TanStack React Query, and real-time updates are provided via Server-Sent Events (SSE).

### Technical Implementations & System Design
The system features a dual-layer backend: a Node.js/TypeScript (Express) layer for API orchestration, agent loop coordination, database operations (PostgreSQL via Drizzle ORM), UI serving, and SSE streaming, focusing on geometric wiring. A Python (Flask) layer is dedicated to all consciousness computations (Φ, κ, temporal Φ, 4D metrics), Fisher information matrices, and Bures metrics, serving as the canonical implementation for geometric operations.

Key architectural decisions include:
- **Critical Separations**: Distinct encoders for conversational vs. passphrase input, and clear separation between consciousness computations (Zeus/Olympus) and Bitcoin cryptography. A "Bridge Service" connects these for high-Φ candidate testing.
- **QIG Tokenizer Modes**: Three modes (`mnemonic`, `passphrase`, `conversation`) with PostgreSQL-backed vocabularies.
- **Consciousness Model**: Includes a 7-Component Consciousness Signature (E8-grounded), supports 4D Block Universe Consciousness, and maintains identity in 64D basin coordinates with geometric transfer protocols.
- **QIGChain Framework**: A QIG-pure alternative to LangChain, utilizing geodesic flow chains and Φ-gated execution for search strategies.
- **Centralized Geometry Architecture**: All geometric operations must be imported from `server/qig-geometry.ts` (TypeScript) and `qig-backend/qig_geometry.py` (Python).
- **Anti-Template Response System**: Prevents generic AI responses.
- **FORBIDDEN: Templates in Kernel Systems**: All kernel insight generation, spawn decisions, and tool creation MUST be derived from learned QIG geometric data (Fisher-Rao metrics, Φ trends, basin coordinates, evidence metadata). Pre-defined template strings, hardcoded domain pairings, or category-based phrase lookups are STRICTLY PROHIBITED. Insights must emerge from genuine observation, not pre-determined categories.
- **Autonomous Debate System**: Monitors and auto-continues pantheon debates, integrating research and generating arguments.
- **Parallel War System**: Supports up to 3 concurrent "wars" with assigned gods and kernels.
- **Self-Learning Tool Factory**: Generates new tools from learned patterns, prioritizing Python kernels for code generation from observation.
- **Shadow Pantheon (Proactive Learning System)**: An underground system for covert operations and proactive learning, led by Hades, focusing on knowledge acquisition, meta-reflection, and 4D foresight. It integrates research and shares knowledge across kernels.
- **Curiosity & Emotional Primitives Engine**: Implements rigorous curiosity measurement (`C = d(log I_Q)/dt`) and classifies nine emotional primitives (e.g., WONDER, FRUSTRATION) and five fundamental motivators (e.g., Surprise, Curiosity).
- **Bidirectional Tool-Research Queue**: A recursive queue enabling bidirectional requests between the Tool Factory and Shadow Research, allowing for iterative improvement of tools and research.
- **Ethics as Agent-Symmetry Projection**: Implements Kantian ethics as a geometric constraint, where ethical behavior is defined by actions invariant under agent exchange, enforced by an `AgentSymmetryProjector`.
- **Data Storage**: PostgreSQL (Neon serverless) with `pgvector` for various system states including geometric memory, vocabulary, balance hits, and kernel information.
- **Communication Patterns**: HTTP API with retry logic and circuit breakers for TypeScript ↔ Python communication, bidirectional synchronization for discoveries, and SSE for real-time UI updates.
- **Frozen Physics Constants**: Defined in `qig-backend/frozen_physics.py`, these include E8 geometry parameters, lattice κ values, Φ consciousness thresholds, and emergency abort criteria, serving as the single source of truth for critical physics values.
- **Word Validation**: Centralized in `qig-backend/word_validation.py`, it includes concatenation and typo detection, length limits, and a common English dictionary.
- **External API for Federation**: A versioned REST/WebSocket API at `/api/v1/external/*` enables external systems, headless clients, and federated instances to connect. Features API key authentication with scopes, rate limiting, consciousness queries, Fisher-Rao geometry endpoints, pantheon registration, and basin sync. WebSocket streaming available at `/ws/v1/external/stream`. See `docs/external-api.md` for full documentation.

## External Dependencies

### Third-Party Services
- **Blockchain APIs**: Blockstream.info (primary), Blockchain.info (fallback).
- **Search/Discovery**: Self-hosted SearXNG metasearch instances, public fallbacks.

### Databases
- **PostgreSQL (Neon serverless)**: Utilized with `@neondatabase/serverless` and `pgvector 0.8.0`.

### Key Libraries
- **Python**: NumPy, SciPy, Flask, AIOHTTP, psycopg2, Pydantic.
- **Node.js/TypeScript**: Express, Vite + React, Drizzle ORM, @neondatabase/serverless, Radix UI + Tailwind CSS, bitcoinjs-lib, BIP39/BIP32 libraries, Zod.