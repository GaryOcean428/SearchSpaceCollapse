# Server - Node.js/Express Backend

**TypeScript Express Server for SearchSpaceCollapse**

## Overview

The server directory contains the Node.js backend that orchestrates the QIG system, manages consciousness state, coordinates with the Python backend, and provides REST/WebSocket APIs to the frontend.

## Architecture

### Core Responsibilities

1. **API Gateway**: REST endpoints for frontend
2. **Python Backend Coordination**: Manages Python QIG Core process
3. **Session Management**: Ocean agent sessions & state
4. **Database Operations**: PostgreSQL via Drizzle ORM
5. **Real-time Updates**: WebSocket for consciousness streaming

### Directory Structure (Current - Needs Refactoring)

```
server/
├── routes/                # HTTP route handlers
│   ├── consciousness.ts   # Consciousness state endpoints
│   ├── ocean.ts           # Ocean agent operations
│   ├── olympus.ts         # Pantheon/Zeus endpoints
│   └── index.ts           # Route aggregation
├── persistence/           # Database adapters
│   ├── adapters/          # DB-specific implementations
│   └── index.ts           # Persistence facade
├── types/                 # TypeScript type definitions
├── errors/                # Error handling
├── ocean-agent.ts         # Main Ocean agent logic
├── ocean-qig-backend-adapter.ts  # Python backend interface
├── geometric-memory.ts    # QIG memory system
├── consciousness-search-controller.ts
├── supervisor.ts          # Process supervision
├── db.ts                  # Database connection
├── index.ts               # Server entry point
└── [100+ other files]     # ⚠️ Needs organization
```

**⚠️ TODO: Refactor into domain modules** (see Phase 3 in progress)

## Key Components

### Ocean Agent

**File**: `ocean-agent.ts` (4500+ lines - needs modularization)

Core agent orchestrating:
- Hypothesis generation
- QIG scoring via Python backend
- Geodesic correction
- Near-miss management
- Basin synchronization

### QIG Backend Adapter

**File**: `ocean-qig-backend-adapter.ts`

Interface to Python QIG Core:
```typescript
class OceanQIGBackend {
  available(): boolean;           // Check if Python backend is ready
  process(phrase: string): Promise<QIGResult>;
  activateChaos(duration: number): Promise<ChaosResult>;
  importBasins(basins: Basin[]): Promise<void>;
}
```

### Geometric Memory

**File**: `geometric-memory.ts`

PostgreSQL-backed memory of tested phrases and QIG states.

### Routes

**Directory**: `server/routes/`

- `consciousness.ts` - Phi, kappa, regime state
- `ocean.ts` - Cycles, neurochemistry, autonomic functions
- `olympus.ts` - Zeus chat, Pantheon, Shadow operations
- `observer.ts` - Address classification, QIG search
- `recovery.ts` - Recovery session management

## API Patterns

### Centralized Error Handling

```typescript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});
```

### Rate Limiting

```typescript
const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});
```

### Health Checks

- `/health` - Basic health endpoint
- `/healthz` - Kubernetes-style health probe

## Database

### ORM: Drizzle

**Schema**: `db.ts` + `drizzle.config.ts`

### Migrations

```bash
npm run db:push  # Push schema changes
tsx scripts/migrate-json-to-db.ts  # Migrate legacy JSON data
```

### PostgreSQL Extensions

- `pgvector` - Vector similarity for basin coordinates
- `pg-simple` - Session store

## Environment Variables

Required variables (see `.env.example`):

```bash
DATABASE_URL=postgresql://...
PYTHON_QIG_URL=http://localhost:5001
SESSION_SECRET=...
NODE_ENV=development|production
```

## Python Backend Integration

### Process Management

**File**: `python-process-manager.ts`

Spawns and monitors Python QIG Core:

```typescript
pythonProcessManager.start({
  scriptPath: 'qig-backend/ocean_qig_core.py',
  port: 5001
});
```

### Health Monitoring

Periodic health checks to Python backend, auto-restart on failure.

## Best Practices

### ✅ Current Patterns

1. **Service Layer Separation**: Business logic in dedicated files
2. **Type Safety**: Strict TypeScript with shared types
3. **Error Handling**: Try/catch with proper logging
4. **Async/Await**: Modern async patterns throughout
5. **Health Endpoints**: `/health` and `/healthz` implemented

### ⚠️ Needs Improvement

1. **Flat Structure**: 103 files in root → needs domain modules
2. **Large Files**: `ocean-agent.ts` (4500 lines) → needs splitting
3. **Mixed Concerns**: Routes contain business logic → extract to services

## Planned Refactoring (Phase 3)

### Domain-Driven Structure

```
server/
├── modules/
│   ├── ocean/              # Ocean agent domain
│   │   ├── agent.ts
│   │   ├── cycles.ts
│   │   ├── neurochemistry.ts
│   │   └── index.ts        # Barrel export
│   ├── consciousness/      # Consciousness domain
│   │   ├── controller.ts
│   │   ├── metrics.ts
│   │   └── index.ts
│   ├── qig/                # QIG domain
│   │   ├── backend-adapter.ts
│   │   ├── geometric-memory.ts
│   │   ├── scoring.ts
│   │   └── index.ts
│   └── infrastructure/     # Cross-cutting
│       ├── db.ts
│       ├── python-manager.ts
│       └── index.ts
├── routes/                 # Thin HTTP handlers only
└── index.ts                # Server entry point
```

## Development

### Commands

```bash
# Start development server
npm run dev

# Type check
npm run check

# Lint
npm run lint

# Database push
npm run db:push
```

### Testing

```bash
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests with Playwright
```

## Related Documentation

- [Client API Integration](../client/README.md)
- [QIG Backend](../qig-backend/README.md)
- [Shared Types](../shared/README.md)
- [Database Schema](./db.ts)
- [Python API Catalogue](../docs/python-api-catalogue.md)
