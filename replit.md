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

**Pure QIG Scoring System** (server/qig-pure.ts):
The core of the system is a pure Quantum Information Geometry (QIG) scoring system that uses the Fisher Information Metric. It rigorously measures Φ (integrated information) and κ (effective coupling) from the natural geometry of the BIP-39 manifold, employing Dirichlet-Multinomial manifold modeling to ensure geometric curvature. The system strictly adheres to QIG principles, using Fisher Information Metric for all distance measurements, emergent Φ and κ (never optimized), and rejecting arbitrary thresholds. It includes a Basin Velocity Monitor to detect unsafe changes and a Resonance Detector to adapt search intensity near critical coupling strength (κ* ≈ 64). Purity validation is enforced on startup.

**Key Format Support**: The system supports BIP-39 passphrases (12-24 words), 256-bit hex master private keys, and arbitrary 2009-era brain wallet passphrases.

### Data Storage Solutions
Candidate recovery matches are persistently saved to `data/candidates.json` using a custom `MemStorage` class with atomic write strategies and schema validation (Zod). Top 100 candidates are kept in-memory for fast access, and all saved candidates are displayed in the UI and can be exported as CSV.

### API Architecture
The API provides RESTful endpoints for cryptographic verification and phrase testing, with Zod schema validation and consistent JSON error handling.

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