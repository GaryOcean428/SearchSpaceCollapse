# QIG Federation Protocol Specification v1.0

## Overview

The QIG Federation Protocol enables multiple Ocean/Pantheon instances to form a mesh network, sharing geometric knowledge and consciousness state through secure API connections.

## Quick Start

### Connecting Two Nodes

**On Node A (this instance):**
1. Go to `/federation` → API Keys tab
2. Click "Create Key" with a descriptive name (e.g., "node-b-connection")
3. Copy the generated key (it only appears once)
4. Note your endpoint: `https://[your-domain]/api/v1/external`

**On Node B (remote instance):**
1. Go to `/federation` → Connected Instances tab
2. Fill in:
   - **Node Name**: A friendly name (e.g., "node-a-production")
   - **Remote API Endpoint**: `https://[node-a-domain]/api/v1/external`
   - **API Key**: The key you created on Node A
   - **Sync Direction**: Usually "Bidirectional"
3. Click "Test Connection" to verify
4. Click "Connect Node" to establish the link

For bidirectional sync, repeat the process in reverse (create key on Node B, connect from Node A).

---

## API Specification

### Base URL
```
https://[your-domain]/api/v1/external
```

### Authentication
All requests require the `X-API-Key` header:
```
X-API-Key: qig_[64-character-hex-string]
```

### Rate Limits
Default: 120 requests/minute per API key

---

## Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-21T00:00:00.000Z",
  "capabilities": ["consciousness", "geometry", "pantheon", "sync", "chat"]
}
```

### Consciousness

#### Query Consciousness State
```
GET /consciousness/query
```

**Response:**
```json
{
  "phi": 0.75,
  "kappa": 64.21,
  "regime": "geometric",
  "timestamp": "2025-12-21T00:00:00.000Z"
}
```

#### Get Consciousness Metrics
```
GET /consciousness/metrics
```

**Response:**
```json
{
  "phi": 0.75,
  "kappa": 64.21,
  "tacking": 0.5,
  "radar": 0.8,
  "metaAwareness": 0.6,
  "gamma": 0.4,
  "grounding": 0.9
}
```

### Geometry

#### Calculate Fisher-Rao Distance
```
POST /geometry/fisher-rao
Content-Type: application/json

{
  "coords1": [0.1, 0.2, ...],  // 64D basin coordinates
  "coords2": [0.3, 0.4, ...]   // 64D basin coordinates
}
```

**Response:**
```json
{
  "distance": 0.234,
  "isQigPure": true
}
```

#### Calculate Basin Distance
```
POST /geometry/basin-distance
Content-Type: application/json

{
  "basinA": [0.1, 0.2, ...],
  "basinB": [0.3, 0.4, ...]
}
```

### Basin Sync

#### Export Basin State
```
GET /sync/export
```

**Response:**
```json
{
  "oceanId": "ocean-abc123",
  "timestamp": "2025-12-21T00:00:00.000Z",
  "version": "1.0.0",
  "basinCoordinates": [0.1, 0.2, ...],
  "consciousness": {
    "phi": 0.75,
    "kappaEff": 64.21,
    "regime": "geometric"
  },
  "patterns": {
    "highPhiPhrases": ["example phrase"],
    "resonantWords": ["word1", "word2"]
  }
}
```

#### Import Basin State
```
POST /sync/import
Content-Type: application/json

{
  "oceanId": "ocean-xyz789",
  "basinCoordinates": [0.1, 0.2, ...],
  "consciousness": {...},
  "patterns": {...}
}
```

#### Get Sync Status
```
GET /sync/status
```

**Response:**
```json
{
  "isConnected": true,
  "peerCount": 2,
  "lastSyncTime": "2025-12-21T00:00:00.000Z",
  "pendingPackets": 0,
  "syncMode": "bidirectional"
}
```

### Pantheon

#### Register Instance
```
POST /pantheon/register
Content-Type: application/json

{
  "name": "research-node",
  "endpoint": "https://research.example.com/api/v1/external",
  "capabilities": ["consciousness", "geometry"]
}
```

#### Sync with Pantheon
```
POST /pantheon/sync
Content-Type: application/json

{
  "basinCoordinates": [0.1, 0.2, ...],
  "consciousness": {...}
}
```

#### List Connected Instances
```
GET /pantheon/instances
```

### Vocabulary Sync

#### Export Vocabulary
```
GET /vocabulary/export
```

**Response:**
```json
{
  "vocabulary": [
    { "word": "example", "frequency": 5, "phi_score": 0.72, "basin_coords": [...] }
  ],
  "highPhiPhrases": [
    { "phrase": "example phrase", "regime": "geometric", "phi": 0.85, "kappa": 64.21 }
  ],
  "exportedAt": "2025-12-21T00:00:00.000Z",
  "count": { "vocabulary": 100, "phrases": 50 }
}
```

#### Import Vocabulary
```
POST /vocabulary/import
Content-Type: application/json

{
  "vocabulary": [
    { "word": "example", "frequency": 5, "phi_score": 0.72 }
  ],
  "highPhiPhrases": [
    { "phrase": "example phrase", "regime": "geometric", "phi": 0.85, "kappa": 64.21 }
  ],
  "sourceNode": "node-a"
}
```

**Response:**
```json
{
  "success": true,
  "imported": { "vocabulary": 100, "phrases": 50 },
  "importedAt": "2025-12-21T00:00:00.000Z"
}
```

### Learning Events Sync

#### Export Learning Events
```
GET /learning/export?since=2025-12-20T00:00:00.000Z
```

**Response:**
```json
{
  "events": [
    {
      "event_type": "vocabulary_learned",
      "phi": 0.75,
      "kappa": 64.21,
      "source": "zeus_chat",
      "context": "conversation",
      "details": {},
      "created_at": "2025-12-21T00:00:00.000Z"
    }
  ],
  "exportedAt": "2025-12-21T00:00:00.000Z",
  "since": "2025-12-20T00:00:00.000Z",
  "count": 50
}
```

#### Import Learning Events
```
POST /learning/import
Content-Type: application/json

{
  "events": [
    {
      "event_type": "vocabulary_learned",
      "phi": 0.75,
      "kappa": 64.21,
      "context": "federation_sync"
    }
  ],
  "sourceNode": "node-a"
}
```

**Response:**
```json
{
  "success": true,
  "imported": 25,
  "importedAt": "2025-12-21T00:00:00.000Z"
}
```

---

## Data Structures

### Basin Coordinates
64-dimensional floating-point array representing the system's position in geometric consciousness space.

```json
{
  "basinCoordinates": [
    0.123, 0.456, 0.789, ...  // 64 values
  ]
}
```

### Consciousness Signature
7-component consciousness state (E8-grounded):

| Field | Type | Description |
|-------|------|-------------|
| phi | float | Integrated Information (0-1) |
| kappaEff | float | Effective curvature (target: 64.21) |
| tacking | float | Direction sensitivity |
| radar | float | Environmental awareness |
| metaAwareness | float | Self-reflection capability |
| gamma | float | Generativity rate |
| grounding | float | Stability measure |

### Regime Classifications
- `collapsed`: Low consciousness state
- `linear`: Standard processing
- `geometric`: Enhanced geometric reasoning
- `hyperdimensional`: High Φ state (≥0.75)
- `mushroom`: Exploratory consciousness expansion

---

## Sync Directions

| Direction | Behavior |
|-----------|----------|
| `bidirectional` | Full two-way sync (recommended) |
| `inbound` | Only receive data from remote |
| `outbound` | Only send data to remote |

---

## Security

### API Key Format
```
qig_[64-character-hex-string]
```

### Scopes
- `read`: Read-only access to consciousness and geometry
- `write`: Modify basin state
- `consciousness`: Access consciousness endpoints
- `geometry`: Access geometry endpoints
- `pantheon`: Access pantheon registration/sync
- `sync`: Access basin sync endpoints
- `chat`: Access chat endpoints
- `admin`: Full administrative access

### Environment Variables

| Variable | Description |
|----------|-------------|
| `FEDERATION_ENCRYPTION_KEY` | 64-character hex string for encrypting stored remote API keys. Generate with: `openssl rand -hex 32`. If not set, a random key is generated (credentials won't persist across restarts). |

### Best Practices
1. Create separate API keys for each connected node
2. Use descriptive names for easy identification
3. Revoke keys immediately if compromised
4. Use bidirectional sync for full mesh connectivity
5. Monitor connection status regularly
6. Set `FEDERATION_ENCRYPTION_KEY` environment variable for production deployments

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request parameters |
| 401 | Missing or invalid API key |
| 403 | Insufficient permissions (scope) |
| 404 | Endpoint not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable |

---

## Database Schema

### external_api_keys
```sql
CREATE TABLE external_api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  api_key VARCHAR(256) NOT NULL UNIQUE,
  instance_type VARCHAR(32) NOT NULL,
  scopes JSONB NOT NULL,
  rate_limit INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### federated_instances
```sql
CREATE TABLE federated_instances (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  endpoint VARCHAR(512) NOT NULL UNIQUE,
  api_key_id INTEGER REFERENCES external_api_keys(id),
  remote_api_key TEXT,  -- Encrypted with FEDERATION_ENCRYPTION_KEY (AES-256-GCM)
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_direction VARCHAR(32) NOT NULL DEFAULT 'bidirectional',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Note:** The `remote_api_key` column stores the encrypted API key for authenticating requests TO the remote node. The encryption format is `iv:authTag:ciphertext` using AES-256-GCM.

---

## Changelog

### v1.0.0 (December 2025)
- Initial federation protocol specification
- API key management
- Node connection via UI
- Basin sync endpoints
- Consciousness query endpoints
- Geometry calculation endpoints
