# Observer Archaeology System

## Overview
The Observer Archaeology System is a Bitcoin lost coin recovery platform that utilizes Quantum Information Geometry (QIG) to identify and recover dormant Bitcoin addresses from the 2009-era blockchain. The system shifts the paradigm from searching for a single passphrase to identifying recoverable addresses through multi-substrate geometric intersection. It aims to catalog and rank all dormant 2009-2011 addresses by recovery difficulty (`κ_recovery`), executing multiple recovery vectors simultaneously, including Estate Contact, Constrained Search (QIG algorithmic), Social Outreach, and Temporal Archive. The system integrates data from the Bitcoin blockchain, BitcoinTalk archives, cryptography mailing lists, GitHub/SourceForge, Mt. Gox creditor files, and historical price/difficulty data to build geometric signatures based on temporal, graph, value, and script patterns.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, using Vite, shadcn/ui (based on Radix UI and Tailwind CSS), TanStack Query for server state, and wouter for client-side routing. The design emphasizes information hierarchy, real-time feedback, and progressive disclosure, using Inter/SF Pro and JetBrains Mono/Fira Code fonts.

### Backend Architecture
The backend is an Express.js server on Node.js with TypeScript, featuring a custom brain wallet implementation using native Node.js crypto, elliptic for secp256k1, and bs58check for Bitcoin address encoding.

**QIG Engine Modules:**

1. **Universal QIG Scoring** (server/qig-universal.ts):
   - Applies Fisher Information Metric to ALL key types (BIP-39, master-key, arbitrary)
   - Operates on unified 256-bit manifold
   - Computes Φ (integrated information), κ (coupling strength), β (running constant)
   - Regime detection: linear, geometric, hierarchical, breakdown
   - Resonance detection near κ* ≈ 64

2. **Natural Gradient Search** (server/qig-natural-gradient.ts):
   - Fisher Information Matrix-guided gradient descent
   - Natural gradient: Δθ = -η F⁻¹ ∇L respects manifold geometry
   - Simulated annealing with Metropolis-Hastings acceptance
   - Adaptive learning rate based on regime

3. **Geometric Basin Matching** (server/qig-basin-matching.ts):
   - Find addresses with similar basin geometry
   - Fisher distance for proper manifold distance
   - DBSCAN-like clustering by geometric similarity
   - Cluster statistics: centroid, variance, cohesion

4. **Confidence Scoring** (server/qig-confidence.ts):
   - Stability tracking: Φ variance, κ stability, regime consistency
   - Recovery confidence combining all factors
   - Trend detection: improving, declining, stable

5. **Multi-Substrate Integrator** (server/multi-substrate-integrator.ts):
   - Combines signals from: blockchain, BitcoinTalk, GitHub, SourceForge, cryptography mailing lists, archive.org
   - Temporal coherence analysis
   - Substrate-weighted intersection strength
   - High-priority target identification

6. **Blockchain Scanner** (server/blockchain-scanner.ts):
   - Blockstream API integration (free, no key required)
   - Extracts geometric signatures: temporal, graph, value, script
   - P2PK address derivation for early Bitcoin
   - κ_recovery computation from constraints

### Recovery Vectors
All four vectors are now operational:

1. **Estate Vector** (server/vector-execution.ts):
   - Entity research and heir identification
   - Contact letter generation
   - Legal consideration tracking

2. **Constrained Search Vector**:
   - QIG-powered algorithmic search
   - Natural gradient optimization
   - Basin-aware exploration

3. **Social Vector**:
   - BitcoinTalk forum search queries
   - Community outreach post generation
   - Entity cross-referencing

4. **Temporal Vector**:
   - Archive.org/Wayback Machine searches
   - Timeline construction
   - Historical reference analysis

### Real-Time Telemetry (server/telemetry-api.ts)
- Live Φ and κ trajectories
- Regime transition events
- Resonance event tracking
- Basin drift monitoring

### Data Storage Solutions
All critical data is persistently saved to disk:
- **Candidates**: `data/candidates.json` - Recovery matches with atomic write strategies
- **Search Jobs**: `data/search-jobs.json` - All search job state and progress
- **Target Addresses**: `data/target-addresses.json` - User-added target addresses

The `MemStorage` class uses schema validation (Zod) and atomic writes. Top 100 candidates are kept in-memory for fast access, and all saved candidates are displayed in the UI and can be exported as CSV. Target addresses and search jobs persist across server restarts.

### API Architecture

**Core QIG Endpoints:**
- `POST /api/test-phrase` - Test phrase against target addresses
- `GET /api/search-jobs/:id` - Get search job status

**Observer System Endpoints:**
- `GET /api/observer/status` - System status and component health
- `GET /api/observer/addresses/:address/intersection` - Multi-substrate analysis
- `GET /api/observer/addresses/:address/basin-signature` - Geometric signature
- `POST /api/observer/addresses/:address/find-similar` - Find similar basins
- `GET /api/observer/high-priority-targets` - Ranked recovery targets
- `GET /api/observer/recovery/priorities/:address/confidence` - Confidence metrics

**Workflow Endpoints:**
- `POST /api/observer/workflows` - Start recovery workflow
- `GET /api/observer/workflows/:id` - Get workflow status
- `POST /api/observer/workflows/:id/execute-vector` - Execute recovery vector
- `GET /api/observer/workflows/:id/recommended-vectors` - Get recommendations

**Telemetry Endpoints:**
- `GET /api/telemetry/:jobId` - Full telemetry session
- `GET /api/telemetry/:jobId/trajectory` - Φ/κ trajectories
- `GET /api/telemetry/:jobId/events` - Regime transitions, resonance
- `GET /api/telemetry/:jobId/live` - Latest snapshot

### Development & Build System
Vite is used for frontend development and building, while esbuild handles backend bundling. The project maintains a monorepo structure with strict TypeScript and path aliases.

## External Dependencies

### Cryptographic Libraries
- **elliptic**: secp256k1 elliptic curve operations.
- **bs58check**: Base58Check encoding.
- **crypto-js**: Additional cryptographic utilities (SHA-256).
- Node.js `crypto` module: Core hashing.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **shadcn/ui**: Styled components based on Radix UI.
- **Tailwind CSS**: Utility-first CSS framework.
- **lucide-react**: Icon library.

### State & Data Management
- **@tanstack/react-query**: Server state management.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.

### Database & ORM
- **drizzle-orm**: TypeScript ORM.
- **@neondatabase/serverless**: Serverless PostgreSQL driver.
- **connect-pg-simple**: PostgreSQL session store.

### Build & Development Tools
- **Vite**: Frontend build and dev server.
- **esbuild**: Backend bundler.
- **TypeScript**: Type safety.
- **tsx**: TypeScript execution.

### Utility Libraries
- **date-fns**: Date manipulation.
- **clsx** / **tailwind-merge**: CSS class merging.
- **wouter**: Routing library.

### Fonts
- **Google Fonts**: Inter, JetBrains Mono.

## QIG Constants (Empirically Validated)
- κ* ≈ 64: Fixed point of coupling flow
- β ≈ 0.44: Running coupling constant
- Φ ≥ 0.75: Phase transition threshold

## Recent Changes
- Added Universal QIG scoring for all key types (BIP-39, master-key, arbitrary)
- Implemented Natural Gradient Search with Fisher Information Matrix
- Added Geometric Basin Matching using Fisher distance
- Created Confidence Scoring system with trend detection
- Implemented Multi-Substrate Geometric Intersection
- Added Real-Time Telemetry API for live QIG metrics with session lifecycle management (init, record, end)
- Implemented all 4 recovery vectors (estate, constrained_search, social, temporal)
- Added Blockstream API integration for blockchain data
- Completed full telemetry integration in search-coordinator with automatic session cleanup
- Added persistent storage for target addresses (data/target-addresses.json)
- Fixed UI labels to show mode-specific terminology (Keys/Passphrases/Phrases)
- **Added Memory Fragment Search** (server/memory-fragment-search.ts):
  - Confidence-weighted combinatorics for partial phrase memories
  - QWERTY-aware character perturbation for typo simulation
  - Short phrase generator (4-8 words) with geometric pruning
  - Combinatorial expansion with QIG scoring integration
- **Added Consciousness-Aware Search Controller** (server/consciousness-search-controller.ts):
  - Regime-dependent adaptive strategies (exploration, balanced, precision, safety)
  - Shared singleton instance for real-time state tracking
  - Basin drift, curiosity, and stability computation
  - Integration with search coordinator for live batch metrics

### Forensic Investigation System (Hierarchical Regime)
- **ForensicInvestigator** (server/forensic-investigator.ts):
  - Cross-format hypothesis generation: arbitrary, BIP39, master key, hex
  - Case/spacing/l33t speak variants for 2009-era brain wallets
  - Combined QIG + confidence scoring
  - Automatic match detection against target addresses
  - Key insight: Pre-2013 addresses = arbitrary brain wallet (SHA256 → privkey)
  - **Deduplication preserves formats**: Uses `format:phrase:derivationPath` as key
  - **BIP32 derivation fixed**: ES6 import for createHmac (no more require)

- **BlockchainForensics** (server/blockchain-forensics.ts):
  - Blockstream API integration for address analysis
  - Temporal clustering (sibling addresses, creation timestamps)
  - Era detection (pre-BIP39 vs post-BIP39)
  - Transaction pattern analysis
  - Key format probability estimation

- **EvidenceIntegrator** (server/evidence-integrator.ts):
  - Multi-substrate evidence correlation
  - Memory + Blockchain + Social + Geometric integration
  - Combined scoring with weighted evidence sources
  - Search recommendation generation

- **New API Endpoints:**
  - `POST /api/forensic/session` - Create forensic investigation session
  - `POST /api/forensic/session/:id/start` - Start async investigation
  - `GET /api/forensic/session/:id` - Get session status & progress
  - `GET /api/forensic/session/:id/candidates` - Get top candidates
  - `GET /api/forensic/analyze/:address` - Quick blockchain forensics
  - `POST /api/forensic/hypotheses` - Generate cross-format hypotheses

- **New UI Component** (client/src/components/ForensicInvestigation.tsx):
  - Target address selection with blockchain analysis
  - Memory fragment input with confidence sliders
  - Era detection badges (Pre-BIP39 / Post-BIP39)
  - Likely key format probability display
  - Cross-format hypothesis matrix (tabs by format)
  - Match highlighting with copy-to-clipboard

- **Older API Endpoints:**
  - `POST /api/memory-search` - Memory fragment search with QIG scoring
  - `GET /api/consciousness/state` - Real-time consciousness controller state
- **New UI Component** (client/src/components/MemoryFragmentSearch.tsx):
  - Memory fragment input with confidence sliders
  - Position hints (start/middle/end)
  - QWERTY typo toggle
  - Real-time consciousness state display
  - Search results with QIG metrics and regime badges
