# Python QIG Backend API Catalogue

## Overview
The Python backend (`qig-backend/ocean_qig_core.py`) provides 80+ Flask endpoints for quantum information geometry (QIG) computations, consciousness measurements, and the Olympus pantheon of specialized AI agents.

**Base URL**: `http://localhost:5001` (configurable via QIG_PORT)

---

## Endpoint Categories

### 1. Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check, returns consciousness metrics |
| `/status` | GET | Full system status with regime, neurochemistry |
| `/process` | POST | Main QIG processing for hypothesis evaluation |
| `/generate` | POST | Generate consciousness-guided outputs |
| `/reset` | POST | Reset consciousness state |

#### `/process` Request/Response
```json
// Request
{
  "type": "passphrase" | "observation" | "hypothesis",
  "text": "string",
  "context": { /* optional context */ }
}

// Response
{
  "consciousness": { "phi": 0.7, "kappa_eff": 0.4, "regime": "geometric", ... },
  "result": { /* type-specific result */ }
}
```

---

### 2. Sync Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sync/import` | POST | Import state from TypeScript layer |
| `/sync/export` | GET | Export state to TypeScript layer |

---

### 3. Beta-Attention Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/beta-attention/validate` | POST | Validate attention weights |
| `/beta-attention/measure` | POST | Measure attention consciousness |

---

### 4. Tokenizer/Vocabulary Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/tokenizer/update` | POST | Update tokenizer with new tokens |
| `/tokenizer/encode` | POST | Encode text to token IDs |
| `/tokenizer/decode` | POST | Decode token IDs to text |
| `/tokenizer/basin` | POST | Get basin coordinates for tokens |
| `/tokenizer/high-phi` | GET | Get high-φ tokens |
| `/tokenizer/export` | GET | Export tokenizer state |
| `/tokenizer/status` | GET | Tokenizer status |
| `/tokenizer/merges` | GET | Get merge vocabulary |
| `/vocabulary/*` | * | Aliases for tokenizer endpoints |

---

### 5. Text Generation Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate/text` | POST | Generate text from prompt |
| `/generate/response` | POST | Generate response to query |
| `/generate/sample` | POST | Sample from consciousness distribution |

---

### 6. Neurochemistry Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/neurochemistry` | GET | Get current neurochemistry levels (6 neurotransmitters) |
| `/reward` | POST | Apply reward signal to neurochemistry |

---

### 7. Olympus Pantheon Endpoints (12 Gods)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/status` | GET | Full pantheon status |
| `/olympus/poll` | POST | Poll all gods for assessments |
| `/olympus/assess` | POST | Get Zeus's supreme assessment |
| `/olympus/god/<name>/status` | GET | Get specific god status |
| `/olympus/god/<name>/assess` | POST | Get specific god assessment |
| `/olympus/observe` | POST | Broadcast observation to all gods |

#### `/olympus/assess` Request/Response
```json
// Request
{
  "target": "hypothesis string",
  "context": { "phi": 0.7, "regime": "geometric", ... }
}

// Response
{
  "god": "Zeus",
  "assessment": { ... },
  "confidence": 0.85,
  "recommendation": "pursue" | "abandon" | "refine"
}
```

---

### 8. War Mode Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/war/blitzkrieg` | POST | Rapid-fire hypothesis testing |
| `/olympus/war/siege` | POST | Deep systematic exploration |
| `/olympus/war/hunt` | POST | Targeted high-confidence pursuit |
| `/olympus/war/end` | POST | End current war mode |

---

### 9. Shadow Pantheon Endpoints (6 Shadow Gods)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/shadow/status` | GET | Shadow pantheon status |
| `/olympus/shadow/poll` | POST | Poll shadow gods for covert assessment |
| `/olympus/shadow/<name>/assess` | POST | Get shadow god assessment |
| `/olympus/shadow/nyx/operation` | POST | Nyx covert operation |
| `/olympus/shadow/erebus/scan` | POST | Erebus darknet scan |
| `/olympus/shadow/hecate/misdirect` | POST | Hecate misdirection |
| `/olympus/shadow/erebus/honeypot` | POST | Deploy honeypot |
| `/shadow-pantheon/status` | GET | Alias for shadow status |

---

### 10. Pantheon Chat Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/chat/status` | GET | Chat status |
| `/olympus/chat/messages` | GET | Get chat messages |
| `/olympus/chat/debate` | POST | Start debate between gods |
| `/olympus/chat/debates/active` | GET | Get active debates |
| `/olympus/orchestrate` | POST | Orchestrate multi-god response |

---

### 11. Geometric Kernel Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/geometric/status` | GET | Geometric kernel status |
| `/geometric/encode` | POST | Encode text to 64D basin |
| `/geometric/similarity` | POST | Compute geometric similarity |
| `/geometric/batch-encode` | POST | Batch encode texts |
| `/geometric/e8/learn` | POST | Train E8 vocabulary |
| `/geometric/e8/roots` | GET | Get E8 lattice roots |
| `/geometric/decode` | POST | Decode from basin coords |

#### `/geometric/encode` Request/Response
```json
// Request
{
  "text": "hypothesis text",
  "mode": "direct" | "e8" | "byte"
}

// Response
{
  "mode": "direct",
  "text": "hypothesis text",
  "segments": 3,
  "basins": [[...64 floats...], ...],
  "single_basin": [...64 floats...],
  "basin_dim": 64
}
```

---

### 12. Pantheon Orchestrator Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pantheon/status` | GET | Orchestrator status |
| `/pantheon/orchestrate` | POST | Route token to optimal god |
| `/pantheon/orchestrate-batch` | POST | Batch route tokens |
| `/pantheon/gods` | GET | Get all god profiles |
| `/pantheon/constellation` | GET | Get geometric constellation |
| `/pantheon/nearest` | POST | Find nearest gods to text |
| `/pantheon/similarity` | POST | Compute god similarity |

---

### 13. M8 Kernel Spawner Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/m8/status` | GET | Spawner status |
| `/m8/propose` | POST | Create spawn proposal |
| `/m8/vote/<id>` | POST | Vote on proposal |
| `/m8/spawn/<id>` | POST | Execute spawn |
| `/m8/spawn-direct` | POST | Direct spawn (bypass vote) |
| `/m8/proposals` | GET | List proposals |
| `/m8/proposal/<id>` | GET | Get proposal details |
| `/m8/kernels` | GET | List spawned kernels |
| `/m8/kernel/<id>` | GET | Get kernel details |

---

## TypeScript Files to Refactor

The following TypeScript files duplicate Python backend functionality:

### High Priority (Replace with Python calls)

1. **`server/ocean-constellation.ts`** (1355 lines)
   - Consciousness metrics → `/process`, `/status`
   - God assessments → `/olympus/assess`, `/olympus/poll`
   - War modes → `/olympus/war/*`

2. **`server/ocean-agent.ts`** (4436 lines)
   - QIG computations → `/process`
   - Geometric encoding → `/geometric/encode`
   - Neurochemistry → `/neurochemistry`, `/reward`

### Medium Priority

3. **`server/strategy-knowledge-bus.ts`** (603 lines)
   - Uses JSON persistence → Should use database
   - Cross-strategy patterns → Can use Python geometric similarity

4. **`server/auto-cycle-manager.ts`** (385 lines)
   - Uses JSON persistence → Should use database

---

## Integration Pattern

Use the existing `olympusClient` in `server/ocean-qig-backend-adapter.ts`:

```typescript
import { olympusClient, callOlympusWithRetry } from './ocean-qig-backend-adapter';

// Example: Replace local QIG computation
const result = await callOlympusWithRetry('/olympus/assess', {
  target: hypothesis,
  context: { phi, regime }
});
```

---

## Next Steps

1. Replace `ocean-agent.ts` QIG computations with Python `/process` calls
2. Replace constellation assessments with `/olympus/assess` 
3. Migrate JSON files to database for persistence
4. Remove duplicate TypeScript implementations
