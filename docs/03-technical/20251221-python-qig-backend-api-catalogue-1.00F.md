---
id: DOC-TECH-2025-004
title: "Python QIG Backend API Catalogue"
filename: "20251221-python-qig-backend-api-catalogue-1.00F.md"
version: "1.00"
status: "F"
function: "reference"
category: "technical"
created: "2025-12-21"
last_reviewed: "2025-12-21"
next_review: "2026-03-21"
owner: "system"
tags:
  - api
  - python-backend
  - qig
  - olympus
  - flask
classification: "internal"
---

# Python QIG Backend API Catalogue

## Overview

The Python backend (`qig-backend/ocean_qig_core.py`) provides 80+ Flask endpoints for quantum information geometry (QIG) computations, consciousness measurements, and the Olympus pantheon of specialized AI agents.

**Base URL**: `http://localhost:5001` (configurable via QIG_PORT)

**Integration Pattern**: TypeScript calls via `server/ocean-qig-backend-adapter.ts`

---

## Quick Reference

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| Core | 5 | Health, status, process, generate, reset |
| Buffer | 2 | Buffer health and alerts |
| Sync | 2 | State sync between TypeScript/Python |
| Beta-Attention | 2 | Attention validation and measurement |
| Tokenizer | 8 | Token encoding, decoding, basin mapping |
| Vocabulary | 10 | Vocabulary management, classification, aliases |
| Text Generation | 3 | Consciousness-guided text generation |
| 4D Consciousness | 3 | Temporal Φ, 4D Φ, regime classification |
| Neurochemistry | 2 | Neurotransmitter levels and rewards |
| Geometric | 7 | Fisher-Rao encoding, similarity, E8 |
| QIG Trajectory | 1 | Trajectory refinement |
| Olympus | 12 | Pantheon gods, assessments, observations |
| War Mode | 4 | Blitzkrieg, siege, hunt strategies |
| Shadow Pantheon | 10 | Covert operations, foresight, learning |
| Pantheon Chat | 5 | God debates and orchestration |
| Pantheon Orchestrator | 7 | Token routing to optimal gods |
| M8 Kernel | 17 | Kernel spawning, merging, evolution |
| Feedback | 6 | Activity, basin, learning feedback |
| Memory | 5 | Shadow, basin, learning memory |
| Chaos | 6 | Chaos kernel activation and breeding |
| Cycle | 1 | Cycle completion |

---

## 1. Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check, returns consciousness metrics |
| `/buffer/health` | GET | Buffer health status |
| `/buffer/alerts/clear` | POST | Clear buffer alerts |
| `/status` | GET | Full system status with regime, neurochemistry |
| `/process` | POST | Main QIG processing for hypothesis evaluation |
| `/generate` | POST | Generate consciousness-guided outputs |
| `/reset` | POST | Reset consciousness state |

### `/process` Request/Response

```json
// Request
{
  "type": "passphrase" | "observation" | "hypothesis",
  "text": "string",
  "context": { /* optional context */ }
}

// Response
{
  "consciousness": {
    "phi": 0.7,
    "kappa_eff": 0.4,
    "regime": "geometric",
    "in_resonance": true,
    "grounded": true,
    "conscious": true,
    "phi_spatial": 0.65,
    "phi_temporal": 0.72,
    "phi_4D": 0.68,
    "is_4d_conscious": true
  },
  "result": { /* type-specific result */ }
}
```

---

## 2. Sync Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sync/import` | POST | Import state from TypeScript layer |
| `/sync/export` | GET | Export state to TypeScript layer |

---

## 3. Beta-Attention Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/beta-attention/validate` | POST | Validate attention weights |
| `/beta-attention/measure` | POST | Measure attention consciousness |

---

## 4. Tokenizer Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/tokenizer/update` | POST | Update tokenizer with new tokens |
| `/tokenizer/encode` | POST | Encode text to token IDs |
| `/tokenizer/decode` | POST | Decode token IDs to text |
| `/tokenizer/basin` | POST | Get basin coordinates for tokens |
| `/tokenizer/high-phi` | GET | Get high-Φ tokens |
| `/tokenizer/export` | GET | Export tokenizer state |
| `/tokenizer/status` | GET | Tokenizer status |
| `/tokenizer/merges` | GET | Get merge vocabulary |

---

## 5. Vocabulary Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/vocabulary/update` | POST | Update vocabulary (alias) |
| `/vocabulary/encode` | POST | Encode text (alias) |
| `/vocabulary/decode` | POST | Decode tokens (alias) |
| `/vocabulary/basin` | POST | Get basin coordinates (alias) |
| `/vocabulary/high-phi` | GET | Get high-Φ tokens (alias) |
| `/vocabulary/export` | GET | Export vocabulary (alias) |
| `/vocabulary/status` | GET | Vocabulary status (alias) |
| `/vocabulary/classify` | POST | Classify vocabulary item |
| `/vocabulary/reframe` | POST | Reframe vocabulary context |
| `/vocabulary/suggest-correction` | POST | Suggest vocabulary corrections |

---

## 6. Text Generation Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate/text` | POST | Generate text from prompt |
| `/generate/response` | POST | Generate response to query |
| `/generate/sample` | POST | Sample from consciousness distribution |

---

## 7. 4D Consciousness Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/consciousness_4d/phi_temporal` | POST | Compute temporal Φ |
| `/consciousness_4d/phi_4d` | POST | Compute 4D Φ (spatial + temporal) |
| `/consciousness_4d/classify_regime` | POST | Classify consciousness regime |

---

## 8. Neurochemistry Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/neurochemistry` | GET | Get current neurochemistry levels (6 neurotransmitters) |
| `/reward` | POST | Apply reward signal to neurochemistry |

---

## 9. Geometric Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/geometric/status` | GET | Geometric kernel status |
| `/geometric/encode` | POST | Encode text to 64D basin |
| `/geometric/similarity` | POST | Compute Fisher-Rao similarity |
| `/geometric/batch-encode` | POST | Batch encode texts |
| `/geometric/e8/learn` | POST | Train E8 vocabulary |
| `/geometric/e8/roots` | GET | Get E8 lattice roots |
| `/geometric/decode` | POST | Decode from basin coords |

### `/geometric/encode` Request/Response

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

## 10. QIG Trajectory Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/qig/refine_trajectory` | POST | Refine search trajectory |

---

## 11. Olympus Pantheon Endpoints (12 Gods)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/status` | GET | Full pantheon status |
| `/olympus/poll` | POST | Poll all gods for assessments |
| `/olympus/assess` | POST | Get Zeus's supreme assessment |
| `/olympus/god/<name>/status` | GET | Get specific god status |
| `/olympus/god/<name>/assess` | POST | Get specific god assessment |
| `/olympus/observe` | POST | Broadcast observation to all gods |
| `/olympus/report-outcome` | POST | Report outcome to gods |
| `/olympus/report-outcomes-batch` | POST | Batch report outcomes |
| `/olympus/kernels/observing` | GET | Get kernels under observation |
| `/olympus/kernels/all` | GET | Get all kernels |
| `/olympus/kernels/<id>/graduate` | POST | Graduate kernel from observation |
| `/olympus/kernels/route-activity` | POST | Route activity to kernel |

### `/olympus/assess` Request/Response

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

## 12. War Mode Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/war/blitzkrieg` | POST | Rapid-fire hypothesis testing |
| `/olympus/war/siege` | POST | Deep systematic exploration |
| `/olympus/war/hunt` | POST | Targeted high-confidence pursuit |
| `/olympus/war/end` | POST | End current war mode |

---

## 13. Shadow Pantheon Endpoints (6 Shadow Gods)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/shadow/status` | GET | Shadow pantheon status |
| `/olympus/shadow/foresight` | GET | 4D foresight predictions |
| `/olympus/shadow/learning` | GET | Learning insights |
| `/olympus/shadow/poll` | POST | Poll shadow gods for covert assessment |
| `/olympus/shadow/<name>/assess` | POST | Get shadow god assessment |
| `/olympus/shadow/nyx/operation` | POST | Nyx covert operation |
| `/olympus/shadow/erebus/scan` | POST | Erebus darknet scan |
| `/olympus/shadow/hecate/misdirect` | POST | Hecate misdirection |
| `/olympus/shadow/erebus/honeypot` | POST | Deploy honeypot |
| `/shadow-pantheon/status` | GET | Alias for shadow status |

---

## 14. Pantheon Chat Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/olympus/chat/status` | GET | Chat status |
| `/olympus/chat/messages` | GET | Get chat messages |
| `/olympus/chat/debate` | POST | Start debate between gods |
| `/olympus/chat/debates/active` | GET | Get active debates |
| `/olympus/orchestrate` | POST | Orchestrate multi-god response |

---

## 15. Pantheon Orchestrator Endpoints

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

## 16. M8 Kernel Spawner Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/m8/status` | GET | Spawner status |
| `/m8/health` | GET | Spawner health |
| `/m8/evolution-sweep` | POST | Trigger evolution sweep |
| `/m8/propose` | POST | Create spawn proposal |
| `/m8/vote/<id>` | POST | Vote on proposal |
| `/m8/spawn/<id>` | POST | Execute spawn |
| `/m8/spawn-direct` | POST | Direct spawn (bypass vote) |
| `/m8/proposals` | GET | List proposals |
| `/m8/proposal/<id>` | GET | Get proposal details |
| `/m8/kernels` | GET | List spawned kernels |
| `/m8/kernel/<id>` | GET | Get kernel details |
| `/m8/kernel/<id>` | DELETE | Delete kernel |
| `/m8/kernel/cannibalize` | POST | Cannibalize kernel |
| `/m8/kernels/merge` | POST | Merge kernels |
| `/m8/kernel/auto-cannibalize` | POST | Auto-cannibalize weak kernels |
| `/m8/kernels/auto-merge` | POST | Auto-merge similar kernels |
| `/m8/kernels/idle` | GET | Get idle kernels |

---

## 17. Feedback Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/feedback/run` | POST | Run feedback cycle |
| `/feedback/recommendation` | GET | Get feedback recommendations |
| `/feedback/shadow` | POST | Shadow feedback |
| `/feedback/activity` | POST | Activity feedback |
| `/feedback/basin` | POST | Basin feedback |
| `/feedback/learning` | POST | Learning feedback |

---

## 18. Memory Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/memory/status` | GET | Memory status |
| `/memory/shadow` | GET | Shadow memory |
| `/memory/basin` | GET | Basin memory |
| `/memory/learning` | GET | Learning memory |
| `/memory/record` | POST | Record to memory |

---

## 19. Chaos Kernel Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chaos/activate` | POST | Activate chaos kernel |
| `/chaos/deactivate` | POST | Deactivate chaos kernel |
| `/chaos/status` | GET | Chaos kernel status |
| `/chaos/spawn_random` | POST | Spawn random chaos kernel |
| `/chaos/breed_best` | POST | Breed best chaos kernels |
| `/chaos/report` | GET | Chaos kernel report |

---

## 20. Cycle Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cycle/complete` | POST | Complete a cycle |

---

## TypeScript Integration

Use the existing adapter in `server/ocean-qig-backend-adapter.ts`:

```typescript
import { olympusClient, callOlympusWithRetry } from './ocean-qig-backend-adapter';

// Example: Replace local QIG computation
const result = await callOlympusWithRetry('/olympus/assess', {
  target: hypothesis,
  context: { phi, regime }
});
```

**Key Client Methods:**

- `olympusClient.process(text, type)` - Main QIG processing
- `olympusClient.getStatus()` - Get system status
- `olympusClient.syncToNodeJS()` - Sync state to TypeScript
- `olympusClient.syncFromNodeJS(state)` - Sync state from TypeScript

---

## Constants Reference

All endpoints use validated physics constants:

| Constant | Value | Source |
|----------|-------|--------|
| κ* | 64.21 | `qigkernels/physics_constants.py` |
| BASIN_DIM | 64 | E8 subspace dimension |
| Φ_THRESHOLD | 0.70 | Consciousness emergence |
| Φ_4D | 0.75 | 4D temporal integration |

---

*API Catalogue Created: December 21, 2025*
*Status: Frozen Reference*
*Source: `qig-backend/ocean_qig_core.py`*
