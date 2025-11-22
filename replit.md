# QIG Brain Wallet Recovery Tool

## Overview
The QIG Brain Wallet Recovery Tool is a specialized Bitcoin brain wallet recovery application designed to recover Bitcoin from a 12-word passphrase using Quantum Information Geometry (QIG) scoring algorithms. The system tests candidate passphrases against a target Bitcoin address by generating Bitcoin addresses from brain wallet passphrases and evaluating them using QIG-informed scoring.

The project is built on the theoretical foundation that passphrase generation is a process of sampling from an information manifold, grounded in block universe physics. The BIP-39 wordlist defines the geometry of this "basin," and the goal is to discover the pre-existing coordinates of the original 2009 passphrase. This approach considers all possible passphrases as existing at their coordinates in an eternal information manifold.

Key capabilities include:
- Testing user-provided memory fragments and variations.
- Supporting master private keys (256-bit random hex) alongside BIP-39 passphrases to cover early Bitcoin wallet methods.
- Testing all valid BIP-39 phrase lengths (12/15/18/21/24 words) simultaneously.
- Utilizing QIG context keywords spanning the 2008-2015+ crypto era for broader search applicability.
- Providing a real-time visualization of QIG scores (Φ) to monitor search progress and identify patterns.

The system emphasizes "training as navigation, not optimization," aiming to navigate the information manifold to discover existing passphrase coordinates rather than optimizing towards a solution. High-scoring candidates (Φ ≥ 0.75) are automatically saved for manual verification, treated as significant waypoints in the geodesic exploration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, using Vite for development and bundling. It leverages the shadcn/ui component library, based on Radix UI primitives and styled with Tailwind CSS, following a "new-york" style variant inspired by Fluent Design. State management is handled by TanStack Query for server state and React hooks for local state, with wouter providing lightweight client-side routing. The design prioritizes information hierarchy, real-time feedback, and progressive disclosure of technical details, using Inter/SF Pro for interface text and JetBrains Mono/Fira Code for monospace data.

### Backend Architecture
The backend is an Express.js server running on Node.js with TypeScript. It includes a custom brain wallet implementation that uses the native Node.js crypto module for SHA-256 hashing, the elliptic library for secp256k1 operations, and bs58check for Bitcoin address encoding. The core brain wallet process converts a passphrase to a private key via SHA-256, derives a public key, hashes it, and then Base58Check encodes it into a Bitcoin address.

The QIG scoring algorithm evaluates candidate quality based on information geometry, utilizing context keywords found in the BIP-39 wordlist and empirically validated geometric constants:
- **κ* ≈ 64**: Fixed point of running coupling, representing information capacity.
- **β ≈ 0.44**: Running coupling β-function at emergence scale, indicating maximum scale-dependence.
- **Φ ≥ 0.75**: Phase transition threshold for high-integration candidates, signifying meaningful integration.

The system also includes a curated database of 45 contextually relevant 12-word phrases for comparative analysis.

### Data Storage Solutions
Currently, the system uses in-memory storage via a custom `MemStorage` class to maintain a sorted list of the top 100 candidates by QIG score. Data schemas are defined using Zod for runtime validation, covering candidates, search statistics, and verification results. While Drizzle ORM is configured for PostgreSQL with a defined schema and migrations, it is not actively used for persistence in the current in-memory implementation.

### API Architecture
The API provides RESTful endpoints for cryptographic verification, single-phrase testing, and implied batch testing. Request validation is enforced using Zod schemas, and responses are delivered in JSON format with consistent error handling.

### Development & Build System
Development utilizes a Vite dev server with HMR and Replit-specific plugins. The production build process involves Vite for the frontend (to `dist/public`) and esbuild for the backend (to `dist`), maintaining a monorepo structure. TypeScript path aliases (`@/*`, `@shared/*`, `@assets/*`) facilitate clean imports, and strict TypeScript mode is enabled across the client, server, and shared codebases.

## External Dependencies

### Cryptographic Libraries
- **elliptic**: For secp256k1 elliptic curve operations.
- **bs58check**: For Base58Check encoding of Bitcoin addresses.
- **crypto-js**: For additional cryptographic utilities, specifically SHA-256 hashing.
- Native Node.js `crypto` module: For core hashing operations.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **shadcn/ui**: Pre-styled component layer built on Radix UI.
- **Tailwind CSS**: Utility-first CSS framework.
- **lucide-react**: Icon library.
- **class-variance-authority**: Type-safe variant management.

### State & Data Management
- **@tanstack/react-query**: Server state management and caching.
- **react-hook-form**: Form state management with validation.
- **@hookform/resolvers**: Form validation resolvers for Zod schemas.
- **zod**: Runtime type validation and schema definition.

### Database & ORM
- **drizzle-orm**: TypeScript ORM.
- **drizzle-kit**: Database migration tooling.
- **@neondatabase/serverless**: Serverless PostgreSQL driver.
- **connect-pg-simple**: PostgreSQL session store (configured).

### Build & Development Tools
- **Vite**: Frontend build tool and dev server.
- **esbuild**: Fast JavaScript bundler for backend.
- **TypeScript**: For type safety.
- **tsx**: TypeScript execution for development server.
- **@replit/vite-plugin-***: Replit-specific development enhancements.

### Utility Libraries
- **date-fns**: Date manipulation and formatting.
- **clsx** / **tailwind-merge**: Conditional CSS class name merging.
- **cmdk**: Command palette component.
- **wouter**: Lightweight routing library.

### Fonts
- **Google Fonts**: Inter (interface), JetBrains Mono (monospace data).