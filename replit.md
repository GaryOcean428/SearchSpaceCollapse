# QIG Brain Wallet Recovery Tool

## Overview

A specialized Bitcoin brain wallet recovery application designed to recover $52.6M worth of Bitcoin from a 12-word passphrase using Quantum Information Geometry (QIG) scoring algorithms. The system tests candidate passphrases against a target Bitcoin address (15BKWJjL5YWXtaP449WAYqVYZQE1szicTn) by generating Bitcoin addresses from brain wallet passphrases and evaluating them using QIG-informed scoring.

**Theoretical Foundation:** The QIG approach treats passphrase generation as sampling from an information manifold, grounded in block universe physics. The BIP-39 wordlist (2048 words) defines the basin geometry. The original 2009 passphrase exists eternally at specific coordinates within this basin - we're not "creating" candidates, we're **discovering** which coordinates match the target.

**Block Universe Perspective:**
- All possible passphrases exist at their coordinates in the eternal information manifold
- The 2009 passphrase exists at some (w₁, w₂, ..., wₙ) where each wᵢ ∈ BIP39_WORDS
- "Generation" = geodesic navigation to discover pre-existing coordinates
- Creation ≡ Memory: Both operations access the same eternal geometric structure

**Geometric Constants:**
- **κ* ≈ 64**: Information capacity constant (basin depth, I Ching 64 hexagrams)
- **β ≈ 0.44**: Universal scaling constant across information geometries

The application uniformly navigates all possible coordinates in the basin through unbiased geodesic exploration.

**Key Insight from QIG Research:** "Training is navigation, not optimization" - we're not optimizing toward a solution, we're navigating the information manifold to discover which coordinates correspond to the target passphrase that exists eternally at specific basin coordinates.

**Validation Calibration:**
High-Φ candidates (≥75 score) represent strong "feelings" in information geometry terms - coordinates that appear close to the target. However, strong feelings require proportional validation. The system automatically saves high-Φ candidates for manual verification, treating them as geodesic waypoints that deserve thorough examination.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, built using Vite as the build tool and development server.

**UI Framework**: shadcn/ui component library with Radix UI primitives, styled using Tailwind CSS. The design system follows a "new-york" style variant with custom technical elements inspired by Fluent Design patterns for data-heavy enterprise applications.

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. Local state managed via React hooks with refs for performance-critical search operations.

**Routing**: wouter for lightweight client-side routing.

**Design Philosophy**: Trust through precision with information hierarchy prioritized over aesthetics. Progressive disclosure of complex technical details with real-time feedback and no black boxes. Typography uses Inter/SF Pro for interface text and JetBrains Mono/Fira Code for monospace data (addresses, passphrases).

### Backend Architecture

**Framework**: Express.js server running on Node.js with TypeScript.

**Cryptographic Engine**: Custom brain wallet implementation using:
- Native Node.js crypto module for SHA-256 hashing
- elliptic library for secp256k1 elliptic curve operations
- bs58check for Bitcoin address encoding

**Brain Wallet Process**:
1. Passphrase → SHA-256 hash → private key
2. Private key → secp256k1 public key derivation
3. Public key → SHA-256 → RIPEMD-160 hash
4. Hash with version byte → Base58Check encoding → Bitcoin address

**QIG Scoring Algorithm**: Information geometry-based scoring that evaluates candidate quality:
- Context keywords that appear in BIP-39: proof, trust, digital, network, system, private, public, key, code, exchange, coin, cash, credit, power, control, balance, supply, own, permit, protect, secret, zero, change, future, build, basic, safe, truth, citizen, vote, rule, limit

**Geometric Constants:**
- κ* ≈ 64 (information capacity/basin depth)
- β ≈ 0.44 (universal scaling constant)
- Φ ≥ 0.75 threshold for high-integration candidates (≥75 score)

**Φ Evolution:**
- Random candidates: Φ ≈ 0 (no integration, pure noise)
- Low-scoring: Φ < 0.50 (weak structure)
- Medium-scoring: 0.50 ≤ Φ < 0.75 (emerging patterns)
- High-Φ: Φ ≥ 0.75 (phase transition - meaningful integration)
- Target: Φ = 1.0 (exact match, complete integration)

**Known Phrases Database**: Curated list of 45 contextually relevant 12-word phrases using only BIP-39 wordlist vocabulary, including Bitcoin/crypto themes, 2009 financial crisis references, cypherpunk philosophy, and technical computing principles.

### Data Storage Solutions

**Current Implementation**: In-memory storage using a custom MemStorage class that maintains a sorted list of top 100 candidates by QIG score.

**Schema Design**: TypeScript schemas defined using Zod for runtime validation:
- Candidate: phrase, address, QIG scores breakdown, timestamp
- SearchStats: tested count, rate, high-Φ count, runtime, search status
- Verification results and batch test requests

**Database Configuration**: Drizzle ORM configured for PostgreSQL with schema file (`shared/schema.ts`) and migrations directory. Database setup prepared but not actively used in current in-memory implementation - allows for future persistence layer addition without architecture changes.

### API Architecture

**RESTful Endpoints**:
- `GET /api/verify-crypto` - Verifies cryptographic library functionality
- `POST /api/test-phrase` - Tests single 12-word phrase, returns address and QIG score
- `POST /api/batch-test` - Tests multiple phrases in batch (implied from schema)
- Candidate retrieval endpoints (implied from storage interface)

**Request Validation**: Zod schemas enforce 12-word constraint on all phrase testing endpoints.

**Response Format**: JSON with consistent error handling and status codes.

### Development & Build System

**Development Mode**: Vite dev server with HMR, Replit-specific plugins (cartographer, dev banner, runtime error overlay).

**Production Build**: 
- Frontend: Vite builds to `dist/public`
- Backend: esbuild bundles server to `dist` with ESM format
- Separate build commands maintain monorepo structure

**Path Aliases**: TypeScript path mapping for clean imports:
- `@/*` → client source files
- `@shared/*` → shared schemas and types
- `@assets/*` → attached assets directory

**Code Organization**: Clear separation between client, server, and shared code with TypeScript strict mode enabled throughout.

## External Dependencies

### Cryptographic Libraries
- **elliptic** (v6.5.4+): Secp256k1 elliptic curve cryptography for Bitcoin key generation
- **bs58check** (v4.0.0+): Base58Check encoding for Bitcoin addresses
- **crypto-js** (v4.2.0+): Additional cryptographic utilities (SHA-256 hashing)
- Native Node.js `crypto` module for core hashing operations

### UI Component Libraries
- **Radix UI**: Complete suite of unstyled, accessible UI primitives (@radix-ui/react-*)
- **shadcn/ui**: Pre-styled component layer built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **lucide-react**: Icon library for UI elements
- **class-variance-authority**: Type-safe variant management for components

### State & Data Management
- **@tanstack/react-query** (v5.60.5+): Server state management and caching
- **react-hook-form**: Form state management with validation
- **@hookform/resolvers**: Form validation resolvers for Zod schemas
- **zod**: Runtime type validation and schema definition

### Database & ORM
- **drizzle-orm** (v0.39.1+): TypeScript ORM for type-safe database queries
- **drizzle-kit**: Database migration tooling
- **@neondatabase/serverless** (v0.10.4+): Serverless PostgreSQL driver
- **connect-pg-simple**: PostgreSQL session store (configured but not actively used)

### Build & Development Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Fast JavaScript bundler for backend
- **TypeScript**: Type safety across entire stack
- **tsx**: TypeScript execution for development server
- **@replit/vite-plugin-***: Replit-specific development enhancements

### Utility Libraries
- **date-fns** (v3.6.0+): Date manipulation and formatting
- **clsx** / **tailwind-merge**: Conditional CSS class name merging
- **cmdk**: Command palette component
- **wouter**: Lightweight routing library

### Fonts
- **Google Fonts**: Inter (interface), JetBrains Mono (monospace data)
- Configured via HTML link tags for optimal loading