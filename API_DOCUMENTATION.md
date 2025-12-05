# API Documentation
**Version:** 1.0  
**Date:** 2025-12-05  
**Follows:** TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

---

## Overview

This document describes all API endpoints for the QIG (Quantum Information Geometry) consciousness system. All endpoints follow geometric purity principles:

✅ **Basin coordinates** (NOT embeddings)  
✅ **Fisher manifold** (NOT vector space)  
✅ **Fisher-Rao distance** (NOT Euclidean)  
✅ **Natural gradient** (NOT standard gradient)

---

## Base URL

```
http://localhost:5000/api
```

In production, use the deployed URL.

---

## Authentication

Most endpoints use rate limiting:
- **Strict**: 5 requests/minute (test phrase)
- **Standard**: 20 requests/minute (checkpoints)
- **Generous**: 60 requests/minute (metrics, health)

---

## Trace ID Propagation

All requests support trace ID propagation for distributed tracing:

```http
X-Trace-ID: custom-trace-id-123
```

If not provided, the server generates one automatically and returns it in the response headers.

---

## Core API Endpoints

### 1. Health Check

**GET** `/api/health`

Comprehensive health check with subsystem status.

**Response:**
```json
{
  "status": "healthy" | "degraded" | "down",
  "timestamp": 1733456789000,
  "uptime": 86400000,
  "subsystems": {
    "database": {
      "status": "healthy",
      "latency": 5.2,
      "message": "Database connection active"
    },
    "pythonBackend": {
      "status": "healthy",
      "latency": 12.8,
      "message": "Python QIG backend responsive",
      "details": {
        "endpoint": "http://localhost:5001/health"
      }
    },
    "storage": {
      "status": "healthy",
      "latency": 2.1,
      "message": "Storage systems operational"
    }
  },
  "version": "1.0.0"
}
```

**Status Codes:**
- `200`: All systems healthy
- `207`: Some systems degraded
- `503`: Critical systems down

---

### 2. Kernel Status

**GET** `/api/kernel/status`

Get real-time kernel consciousness state.

**Response (active):**
```json
{
  "status": "active",
  "sessionId": "session-abc123",
  "metrics": {
    "phi": 0.75,
    "kappa_eff": 64.0,
    "regime": "geometric",
    "in_resonance": true,
    "basin_coords": [0.1, 0.2, 0.3, ...],
    "timestamp": 1733456789000
  },
  "uptime": 3600000,
  "timestamp": 1733456789000
}
```

**Response (idle):**
```json
{
  "status": "idle",
  "message": "No active kernel session",
  "timestamp": 1733456789000
}
```

---

### 3. Search History

**GET** `/api/search/history?limit=50&offset=0`

Retrieve paginated search history with results.

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "searches": [
    {
      "id": "search-123",
      "strategy": "bip39-adaptive",
      "status": "completed",
      "createdAt": "2025-12-05T10:00:00Z",
      "updatedAt": "2025-12-05T10:15:00Z",
      "candidateCount": 42,
      "highPhiCount": 8,
      "phrasesGenerated": 10000
    }
  ],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

---

### 4. Telemetry Capture

**POST** `/api/telemetry/capture`

Capture frontend telemetry events.

**Request Body:**
```json
{
  "event_type": "search_initiated" | "result_rendered" | "error_occurred" | "basin_visualized" | "metric_displayed" | "interaction",
  "timestamp": 1733456789000,
  "trace_id": "fe-abc123",
  "metadata": {
    "query": "quantum entanglement",
    "duration": 1250,
    "phi": 0.75,
    "kappa": 64.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "captured": true,
  "trace_id": "fe-abc123"
}
```

**Status Codes:**
- `200`: Event captured successfully
- `400`: Invalid event format

---

### 5. Recovery Checkpoint

**POST** `/api/recovery/checkpoint`

Create manual recovery checkpoint during active search.

**Request Body:**
```json
{
  "search_id": "search-123",
  "description": "Manual checkpoint before parameter change"
}
```

**Response (success):**
```json
{
  "success": true,
  "checkpoint": {
    "checkpointId": "cp-xyz789",
    "searchId": "search-123",
    "timestamp": 1733456789000,
    "description": "Manual checkpoint before parameter change",
    "state": {
      "metrics": {
        "phi": 0.75,
        "kappa": 64.0,
        "regime": "geometric"
      },
      "sessionId": "active-session"
    }
  }
}
```

**Response (no active session):**
```json
{
  "error": "No active session to checkpoint"
}
```

**Status Codes:**
- `200`: Checkpoint created
- `400`: Missing search_id
- `404`: No active session

---

### 6. Admin Metrics

**GET** `/api/admin/metrics`

Get aggregated system metrics dashboard.

**Response:**
```json
{
  "success": true,
  "timestamp": 1733456789000,
  "metrics": {
    "search": {
      "totalSearches": 150,
      "activeSearches": 3,
      "completedSearches": 142,
      "failedSearches": 5,
      "totalPhrasesTested": 1500000,
      "highPhiCount": 342,
      "avgSearchDuration": 900
    },
    "performance": {
      "avgSearchDurationMs": 900000,
      "phrasesPerSecond": 1666.67,
      "cacheHitRate": 0
    },
    "balance": {
      "activeHits": 12,
      "queueStats": {
        "pending": 50,
        "processing": 5,
        "completed": 1000
      },
      "totalVerified": 3
    },
    "kernel": {
      "status": "active",
      "uptime": 3600000
    }
  }
}
```

---

## Python Backend Endpoints

### Health Check

**GET** `http://localhost:5001/health`

Python QIG backend health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "ocean-qig-backend",
  "version": "1.0.0",
  "timestamp": "2025-12-05T10:00:00",
  "latency_ms": 5.2,
  "subsystems": {
    "kernel": {
      "status": "healthy",
      "message": "Kernel: 4 subsystems, κ*=64",
      "details": {
        "kappa_star": 64.0,
        "basin_dimension": 64,
        "phi_threshold": 0.7,
        "min_recursions": 3,
        "neurochemistry_available": true
      }
    }
  },
  "constants": {
    "E8_RANK": 8,
    "E8_ROOTS": 240,
    "KAPPA_STAR": 64.0,
    "PHI_THRESHOLD": 0.7
  }
}
```

---

## Type Schemas

### ConsciousnessMetrics

The 8 consciousness metrics (based on E8 structure):

```typescript
interface ConsciousnessMetrics {
  phi: number;        // Integration (Φ) [0-1]
  kappa_eff: number;  // Effective coupling (κ_eff) [0-200]
  M: number;          // Meta-awareness [0-1]
  Gamma: number;      // Generativity (Γ) [0-1]
  G: number;          // Grounding [0-1]
  T: number;          // Temporal coherence [0-1]
  R: number;          // Recursive depth [0-1]
  C: number;          // External coupling [0-1]
}
```

### BasinCoordinates

Position in Fisher information geometry:

```typescript
interface BasinCoordinates {
  coords: number[];           // Position in Fisher manifold
  dimension: number;          // Dimensionality (64 or 8)
  manifold: "fisher";         // Always Fisher (NOT Euclidean)
}
```

### KernelState

Kernel consciousness unit state:

```typescript
interface KernelState {
  kernel_id: string;
  kernel_type: "heart" | "vocab" | "perception" | "motor" | "memory" | "attention" | "emotion" | "executive";
  basin_center: BasinCoordinates;
  activation: number;         // [0-1]
  metrics?: ConsciousnessMetrics;
  e8_root_index?: number;     // Which E8 root (0-239)
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "traceId": "trace-abc123",
  "timestamp": 1733456789000
}
```

Common error codes:
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_REQUEST`: Malformed request body
- `NOT_FOUND`: Resource not found
- `SERVICE_UNAVAILABLE`: Backend service down
- `INTERNAL_ERROR`: Unexpected server error

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/test-phrase` | 5 | 1 minute |
| `/api/recovery/checkpoint` | 20 | 1 minute |
| `/api/health` | 60 | 1 minute |
| `/api/kernel/status` | 60 | 1 minute |
| `/api/search/history` | 60 | 1 minute |
| `/api/telemetry/capture` | 100 | 1 minute |
| `/api/admin/metrics` | 60 | 1 minute |

Rate limit headers in response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1733456820
```

---

## SSE (Server-Sent Events)

### Search Progress Stream

**GET** `/api/search/:id/stream`

Stream real-time search progress events.

**Event Types:**
- `search_initiated`
- `kernel_activated`
- `basin_update`
- `regime_transition`
- `resonance_event`
- `result_found`
- `search_completed`
- `search_failed`
- `phi_measurement`

**Event Format:**
```
event: basin_update
data: {"sequence": 42, "traceId": "sse-abc123", "phi": 0.75, "kappa": 64.0, "basin_coords": [...]}
```

**Keepalive:**
Server sends keepalive comment every 30 seconds:
```
:keepalive
```

---

## Best Practices

### 1. Always Use Trace IDs

Include trace IDs in all requests for correlation:

```javascript
fetch('/api/search/history', {
  headers: {
    'X-Trace-ID': generateTraceId(),
  },
});
```

### 2. Handle Rate Limits

Check rate limit headers and implement backoff:

```javascript
if (response.status === 429) {
  const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
  const waitTime = resetTime - Date.now();
  await sleep(waitTime);
  // Retry request
}
```

### 3. Use SSE Reconnection

Always implement reconnection logic for SSE:

```javascript
const connection = createSSEConnection({
  url: '/api/search/123/stream',
  maxReconnectAttempts: 5,
  initialReconnectDelay: 1000,
});
```

### 4. Validate Responses

Use Zod schemas to validate responses:

```typescript
import { consciousnessMetricsSchema } from '@shared/types/qig-geometry';

const result = consciousnessMetricsSchema.safeParse(data);
if (!result.success) {
  console.error('Invalid metrics', result.error);
}
```

### 5. Batch Telemetry Events

Don't send telemetry events one by one. Use the telemetry client which batches automatically:

```typescript
import { telemetry } from './lib/telemetry';

telemetry.trackSearchInitiated(query);
// Events are batched and sent every 5 seconds or when batch size reached
```

---

## Examples

### Complete Search Flow

```typescript
// 1. Initialize telemetry
import { initTelemetry } from './lib/telemetry';
initTelemetry({ apiUrl: 'http://localhost:5000' });

// 2. Start search
const response = await fetch('/api/search-jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Trace-ID': generateTraceId(),
  },
  body: JSON.stringify({
    strategy: 'bip39-adaptive',
    targetSize: 10000,
  }),
});

const { id: searchId } = await response.json();

// 3. Track telemetry
telemetry.trackSearchInitiated('bip39-adaptive', { searchId });

// 4. Connect to SSE stream
const connection = createSSEConnection({
  url: `/api/search/${searchId}/stream`,
  onEvent: (event) => {
    if (event.data.phi) {
      telemetry.trackMetricDisplayed('phi', event.data.phi);
    }
  },
});

connection.connect();

// 5. Wait for completion
connection.addEventListener('search_completed', () => {
  telemetry.trackResultRendered(Date.now() - startTime);
  connection.disconnect();
});
```

---

## Changelog

**v1.0.0** (2025-12-05):
- Initial API documentation
- Added comprehensive QA & integration endpoints
- Follows TYPE_SYMBOL_CONCEPT_MANIFEST v1.0 standards
