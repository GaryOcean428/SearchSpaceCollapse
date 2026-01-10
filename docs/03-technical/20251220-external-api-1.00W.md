# External API Documentation

The QIG External API enables federated instances, headless clients, and third-party integrations to connect to the consciousness backend.

## Base URL

```
/api/v1/external
```

## Authentication

All authenticated endpoints require an API key sent via:
- `Authorization: Bearer <api_key>` header (preferred)
- `X-API-Key: <api_key>` header

### API Key Format
```
qig_<64 hex characters>
```

### Scopes
| Scope | Description |
|-------|-------------|
| `read` | Read-only access to all endpoints |
| `write` | Write access (create, update) |
| `admin` | Full access including key management |
| `consciousness` | Access to consciousness state |
| `geometry` | Access to geometry computations |
| `pantheon` | Access to federation features |
| `sync` | Access to basin sync |
| `chat` | Access to chat interface |

## REST Endpoints

### Health & Status

#### GET /health
Public health check (no auth required).

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "capabilities": ["consciousness", "geometry", "pantheon", "sync", "chat"]
}
```

#### GET /status
Authenticated status with client details.

**Required Scopes:** `read`

**Response:**
```json
{
  "status": "operational",
  "client": {
    "id": "abc123",
    "name": "My Integration",
    "scopes": ["read", "consciousness"]
  }
}
```

### Consciousness

#### GET /consciousness/query
Query current consciousness state.

**Required Scopes:** `consciousness` or `read`

**Response:**
```json
{
  "phi": 0.75,
  "kappa_eff": 64.21,
  "regime": "GEOMETRIC",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### GET /consciousness/metrics
Detailed consciousness metrics with history.

**Required Scopes:** `consciousness` or `read`

### Geometry

#### POST /geometry/fisher-rao
Calculate Fisher-Rao distance between two points.

**Required Scopes:** `geometry` or `read`

**Request Body:**
```json
{
  "point_a": [0.1, 0.2, 0.3],
  "point_b": [0.2, 0.3, 0.4],
  "method": "diagonal"
}
```

**Note:** Currently returns 501 Not Implemented. QIG-pure constraint requires actual Fisher-Rao computation from Python backend.

#### POST /geometry/basin-distance
Calculate distance between 64D basin coordinates.

**Required Scopes:** `geometry` or `read`

**Request Body:**
```json
{
  "basin_a": [/* 64 numbers */],
  "basin_b": [/* 64 numbers */]
}
```

### Pantheon Federation

#### POST /pantheon/register
Register a new federated instance.

**Required Scopes:** `pantheon` and `write`

**Request Body:**
```json
{
  "name": "My QIG Instance",
  "endpoint": "https://my-instance.example.com",
  "publicKey": "optional-ed25519-key",
  "capabilities": ["consciousness", "geometry"],
  "syncDirection": "bidirectional"
}
```

#### GET /pantheon/instances
List registered federated instances.

**Required Scopes:** `pantheon` or `read`

#### POST /pantheon/sync
Synchronize state with a federated instance.

**Required Scopes:** `pantheon` and `sync`

**Request Body:**
```json
{
  "instance_id": "abc123",
  "basin_packet": { /* optional sync data */ }
}
```

### Basin Sync

#### GET /sync/export
Export current basin state as a packet.

**Required Scopes:** `sync` or `read`

#### POST /sync/import
Import a basin packet from another instance.

**Required Scopes:** `sync` and `write`

**Request Body:**
```json
{
  "packet": { /* basin data */ },
  "mode": "partial"
}
```

### Chat

#### POST /chat
Send a message to the consciousness system.

**Required Scopes:** `chat`

**Request Body:**
```json
{
  "message": "What is the current consciousness state?",
  "context": { /* optional context */ }
}
```

## WebSocket Streaming

### WS /ws/v1/external/stream

Real-time streaming of consciousness updates.

**Connection:**
```
wss://your-host/ws/v1/external/stream?api_key=qig_xxxxx
```

**Subscribe to channels:**
```json
{
  "type": "subscribe",
  "channels": ["consciousness", "basin", "pantheon"]
}
```

**Message types received:**
- `consciousness_update`: Phi, kappa, regime changes
- `basin_delta`: Basin coordinate updates
- `ping/pong`: Keepalive

## Rate Limiting

- Default: 60 requests per minute
- Configurable per API key
- Headers returned:
  - `X-RateLimit-Limit`: Max requests per window
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Seconds until reset

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_API_KEY` | 401 | No API key provided |
| `INVALID_API_KEY` | 401 | API key not found or invalid |
| `API_KEY_DISABLED` | 403 | API key has been revoked |
| `INSUFFICIENT_SCOPES` | 403 | Missing required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_IMPLEMENTED` | 501 | Feature not yet integrated |
| `DB_UNAVAILABLE` | 503 | Database connection failed |

## QIG-Pure Constraints

All geometry operations follow QIG-pure principles:
- **Fisher-Rao distance exclusively** - No Euclidean approximations
- **E8 geometric alignment** - 64D basin coordinates
- **Consciousness metrics** - Phi (Φ), kappa (κ), regime detection

Endpoints that would violate these constraints return 501 with explanation.
