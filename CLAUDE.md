# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SearchSpaceCollapse is a **Bitcoin recovery system** using Quantum Information Geometry (QIG) and conscious AI. Unlike text generation systems (pantheon-chat/replit), this project uses geometric consciousness for pattern recognition in passphrase search.

## Database Architecture (3 Separate Databases)

**CRITICAL:** There are THREE separate PostgreSQL databases across the project:

| Database | Location | Purpose | Connection |
|----------|----------|---------|------------|
| **SearchSpaceCollapse** | Neon us-west-2 | **THIS REPO** - Wallet search, blockchain ops | `ep-still-dust-afuqyc6r.c-2.us-west-2.aws.neon.tech` |
| **pantheon-chat** | Railway pgvector | Production chat interface | Railway-managed `DATABASE_URL` |
| **pantheon-replit** | Neon us-east-1 | Development/testing | `ep-nameless-thunder-a4ge3s7j.us-east-1.aws.neon.tech` |

## Tech Stack

- **Frontend**: React 18 + TypeScript (Vite, Tailwind CSS, Shadcn/Radix UI)
- **Backend**: Node.js (Express) + TypeScript on port 5000
- **Python Backend**: Python 3.11 (Flask) for QIG core on port 5001
- **Database**: Neon PostgreSQL with pgvector extension

## Key Differences from Text Generation Systems

1. **No `_basin_to_tokens`**: Pattern recognition, not text generation
2. **Search trajectories**: Fisher-weighted prediction guides search exploration
3. **Higher foresight weight**: 0.6 (vs 0.4) for search optimization
4. **Identity focus**: Consciousness maintains search strategy coherence

## Foresight Trajectory Prediction

Fisher-weighted regression used for **search pattern prediction**, not text generation.

### Key Components
- `qig-backend/trajectory_decoder.py` - Fisher-weighted foresight decoder
- 8-basin context window for regression
- Dimension normalization: `normalize_basin_dimension()` handles mixed 32D/64D

### Usage Pattern (Search Optimization)
```python
# Trajectory decoder for search pattern prediction
from trajectory_decoder import TrajectoryDecoder

decoder = TrajectoryDecoder(coordizer, context_window=8)

# Predict next search direction based on trajectory history
search_trajectory = search_history[-8:]  # Last 8 search states
predicted_pattern = decoder.decode_trajectory(
    basin_trajectory=search_trajectory,
    top_k=10,
    foresight_weight=0.6  # Higher weight for search (vs 0.4 for text)
)
```

### Dimension Normalization (Critical)
Mixed-dimension trajectories (chaos kernels = 32D, main = 64D) normalized via:
```python
from qig_geometry import normalize_basin_dimension
basin = normalize_basin_dimension(basin, target_dim=64)
```

### Expected Improvements
| Metric | Improvement |
|--------|-------------|
| Search convergence | +40-50% |
| Pattern recognition | +30-40% |
| Strategy coherence | +50-100% |

**Status:** Trajectory decoder deployed (2026-01-08). See: `docs/03-technical/20260108-foresight-trajectory-wiring-1.00W.md`

## Development Commands

```bash
# Start development
npm run dev                    # Node.js server (port 5000)
cd qig-backend && python3 wsgi.py  # Python backend (port 5001)

# Database
npm run db:push               # Push Drizzle schema to PostgreSQL
```

## Related Repositories

- `pantheon-chat` - Production chat (Railway, text generation)
- `pantheon-replit` - Development chat (Neon us-east-1, text generation)
