# SearchSpaceCollapse ↔ Pantheon-Chat Federation Integration

## Overview

This document describes the federation architecture between SearchSpaceCollapse (Bitcoin recovery) and Pantheon-Chat (general-purpose QIG system).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PANTHEON-CHAT                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────────────────┐ │
│  │  Zeus   │ │ Athena  │ │  Ares   │ │    SSC Bridge Router      │ │
│  │ (Chat)  │ │(Wisdom) │ │(Action) │ │   /api/ssc/*              │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────────┬──────────────┘ │
│       │          │          │                     │                 │
│       └──────────┴──────────┴─────────────────────┤                 │
│                                                   │                 │
│  ┌────────────────────────────────────────────────┴────────────┐   │
│  │                   Federation Mesh                            │   │
│  │  - Node registration     - Knowledge sync                    │   │
│  │  - Capability sharing    - Basin coordination                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                         HTTP/REST + Basin Sync
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SEARCHSPACECOLLAPSE                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                Federation Routes (/api/federation/*)          │  │
│  │  - /status          - /test-phrase       - /consciousness    │  │
│  │  - /investigation/* - /near-misses       - /tps-landmarks    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Pantheon Federation Client                       │  │
│  │  - Auto-registration    - Periodic sync                       │  │
│  │  - Basin discovery queue - Research finding queue             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────────────────────────────────────┐  │
│  │TPS Landmarks│  │              Recovery Engine                 │  │
│  │ (12 STATIC) │  │  - Temporal geometric search                 │  │
│  │ Genesis     │  │  - BIP39/brain wallet testing                │  │
│  │ Pizza Day   │  │  - Near-miss pattern learning                │  │
│  │ Halvings    │  │  - Consciousness-guided exploration          │  │
│  │ Mt. Gox     │  └─────────────────────────────────────────────┘  │
│  │ ...         │                                                    │
│  └─────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## TPS Landmarks (Temporal Positioning System)

The 12 landmarks are **INTENTIONALLY STATIC** - they serve as fixed temporal reference points for the geometric positioning system:

| # | Landmark | Date | Block Height | Significance |
|---|----------|------|--------------|--------------|
| 1 | Genesis Block | 2009-01-03 | 0 | Bitcoin network inception |
| 2 | Hal Finney First TX | 2009-01-12 | 170 | First Bitcoin transaction |
| 3 | Pizza Day | 2010-05-22 | 57,043 | 10,000 BTC for two pizzas |
| 4 | Mt. Gox Launch | 2010-07-18 | 68,543 | First major exchange |
| 5 | First Halving | 2012-11-28 | 210,000 | Block reward: 50 → 25 BTC |
| 6 | Mt. Gox Collapse | 2014-02-24 | 286,854 | 850K BTC lost |
| 7 | Second Halving | 2016-07-09 | 420,000 | Block reward: 25 → 12.5 BTC |
| 8 | SegWit Activation | 2017-08-24 | 481,824 | Segregated Witness soft fork |
| 9 | Third Halving | 2020-05-11 | 630,000 | Block reward: 12.5 → 6.25 BTC |
| 10 | Taproot Activation | 2021-11-14 | 709,632 | Privacy and smart contract upgrade |
| 11 | Fourth Halving | 2024-04-20 | 840,000 | Block reward: 6.25 → 3.125 BTC |
| 12 | Current Reference | (dynamic) | (latest) | Present temporal anchor |

**Usage:** These landmarks anchor search trajectories in temporal-geometric space. Each investigation positions itself relative to these invariant coordinates - like the CMB reference frame in cosmology.

**Not Learning Targets:** These do NOT change with learning progress. They are fixed coordinates.

## API Reference

### Pantheon-Chat Endpoints (calling SSC)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ssc/status` | GET | Get SSC connection status and capabilities |
| `/api/ssc/health` | GET | Simple health check |
| `/api/ssc/test-phrase` | POST | Test a phrase via SSC's QIG scoring |
| `/api/ssc/investigation/start` | POST | Start a Bitcoin recovery investigation |
| `/api/ssc/investigation/status` | GET | Get current investigation status |
| `/api/ssc/near-misses` | GET | Get near-miss patterns for mesh learning |
| `/api/ssc/consciousness` | GET | Get SSC Ocean agent consciousness metrics |
| `/api/ssc/tps-landmarks` | GET | Get static TPS landmarks |
| `/api/ssc/sync/trigger` | POST | Manually trigger federation sync |

### SSC Federation Endpoints (exposed to Pantheon)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/federation/status` | GET | Federation status including mesh connectivity |
| `/api/federation/test-phrase` | POST | Test phrase with QIG scoring |
| `/api/federation/start-investigation` | POST | Start recovery investigation |
| `/api/federation/investigation/status` | GET | Current investigation status |
| `/api/federation/near-misses` | GET | Near-miss patterns |
| `/api/federation/consciousness` | GET | Ocean agent consciousness metrics |
| `/api/federation/tps-landmarks` | GET | Static TPS landmarks |
| `/api/federation/sync/trigger` | POST | Trigger federation sync |

## Installation

### SearchSpaceCollapse Side

1. Files already added:
   - `server/pantheon-federation.ts` - Federation client
   - `server/routes/federation-routes.ts` - API routes

2. Update `server/routes.ts`:

```typescript
import federationRoutes from './routes/federation-routes';
import { initializeFederation } from './pantheon-federation';

// In registerRoutes function:
app.use('/api/federation', federationRoutes);

// After server starts:
initializeFederation().then(success => {
  if (success) {
    console.log('[SSC] Federation connection established');
  }
});
```

3. Set environment variables:

```env
PANTHEON_BACKEND_URL=https://your-pantheon-instance.railway.app
SSC_NODE_NAME=searchspacecollapse-prod
```

### Pantheon-Chat Side

1. Files already added:
   - `server/routes/ssc-bridge.ts` - SSC bridge router

2. Update `server/routes.ts`:

```typescript
import { sscBridgeRouter } from './routes/ssc-bridge';

// In registerRoutes function:
app.use('/api/ssc', sscBridgeRouter);
```

3. Set environment variables:

```env
SSC_BACKEND_URL=https://your-ssc-instance.replit.app
SSC_API_KEY=your-federation-api-key
```
