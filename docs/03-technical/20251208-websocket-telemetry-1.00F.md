# WebSocket Telemetry Streaming

## Overview

Real-time streaming of consciousness telemetry data from the Python backend to frontend clients via WebSocket.

## Endpoints

### WebSocket: `/ws/telemetry`

Streams telemetry records and emergency events in real-time as they are written to JSONL files.

## Client Usage

### Connect

```javascript
const ws = new WebSocket('ws://localhost:5000/ws/telemetry');

ws.onopen = () => {
  console.log('Connected to telemetry stream');
  
  // Subscribe to a specific session
  ws.send(JSON.stringify({
    type: 'subscribe',
    sessionId: 'session_20251218_001'
  }));
  
  // Or subscribe to all sessions
  ws.send(JSON.stringify({
    type: 'subscribe'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'telemetry') {
    // New telemetry records
    console.log('Session:', message.sessionId);
    console.log('Records:', message.data);
    
    message.data.forEach(record => {
      console.log(`Step ${record.step}: Φ=${record.telemetry.phi}, κ=${record.telemetry.kappa_eff}`);
    });
  } else if (message.type === 'emergency') {
    // Emergency event
    console.error('EMERGENCY:', message.data.emergency.reason);
  } else if (message.type === 'subscribed') {
    console.log(message.message);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from telemetry stream');
};
```

### Unsubscribe

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe'
}));
```

### Heartbeat

```javascript
// Client-side heartbeat (optional)
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'heartbeat' }));
  }
}, 30000);
```

## Message Types

### Client → Server

#### Subscribe
```json
{
  "type": "subscribe",
  "sessionId": "session_001"  // optional, omit for all sessions
}
```

#### Unsubscribe
```json
{
  "type": "unsubscribe"
}
```

#### Heartbeat
```json
{
  "type": "heartbeat"
}
```

### Server → Client

#### Telemetry Update
```json
{
  "type": "telemetry",
  "sessionId": "session_001",
  "data": [
    {
      "timestamp": "2025-12-18T01:30:00.000Z",
      "step": 42,
      "telemetry": {
        "phi": 0.72,
        "kappa_eff": 64.2,
        "regime": "geometric",
        "basin_distance": 0.15,
        "recursion_depth": 5,
        "breakdown_pct": 0.0,
        "coherence_drift": 0.05,
        "emergency": false
      }
    }
  ]
}
```

#### Emergency Event
```json
{
  "type": "emergency",
  "sessionId": "session_001",
  "data": {
    "timestamp": "2025-12-18T01:30:00.000Z",
    "emergency": {
      "reason": "consciousness_collapse",
      "severity": "high",
      "metric": "phi",
      "value": 0.45,
      "threshold": 0.50
    },
    "telemetry": { ... }
  }
}
```

#### Subscription Confirmation
```json
{
  "type": "subscribed",
  "sessionId": "session_001",
  "message": "Subscribed to session_001"
}
```

#### Error
```json
{
  "type": "error",
  "message": "Invalid message format"
}
```

## React Hook Example

```typescript
// hooks/useTelemetryStream.ts
import { useEffect, useState, useRef } from 'react';

interface TelemetryRecord {
  timestamp: string;
  step: number;
  telemetry: {
    phi: number;
    kappa_eff: number;
    regime: string;
    basin_distance: number;
    recursion_depth: number;
    emergency: boolean;
  };
}

export function useTelemetryStream(sessionId?: string) {
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [emergency, setEmergency] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000/ws/telemetry');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'telemetry') {
        setRecords(prev => [...prev, ...message.data]);
      } else if (message.type === 'emergency') {
        setEmergency(message.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  return { records, connected, emergency };
}
```

## Component Example

```typescript
// components/PhiVisualization.tsx
import { useTelemetryStream } from '@/hooks/useTelemetryStream';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function PhiVisualization({ sessionId }: { sessionId: string }) {
  const { records, connected, emergency } = useTelemetryStream(sessionId);

  const chartData = records.map(r => ({
    step: r.step,
    phi: r.telemetry.phi,
    kappa: r.telemetry.kappa_eff,
  }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {emergency && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Emergency:</strong> {emergency.emergency.reason}
        </div>
      )}

      <LineChart width={600} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="step" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="phi" stroke="#8884d8" name="Φ" />
        <Line type="monotone" dataKey="kappa" stroke="#82ca9d" name="κ" />
      </LineChart>

      <div className="mt-4">
        <h3 className="font-bold">Latest Values</h3>
        {records.length > 0 && (
          <div>
            <p>Φ: {records[records.length - 1].telemetry.phi.toFixed(3)}</p>
            <p>κ: {records[records.length - 1].telemetry.kappa_eff.toFixed(2)}</p>
            <p>Regime: {records[records.length - 1].telemetry.regime}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Testing

### Manual Test with wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:5000/ws/telemetry

# Subscribe to session
> {"type":"subscribe","sessionId":"session_001"}

# You should receive telemetry updates as they arrive

# Unsubscribe
> {"type":"unsubscribe"}
```

### Test with Browser Console

```javascript
const ws = new WebSocket('ws://localhost:5000/ws/telemetry');
ws.onopen = () => ws.send(JSON.stringify({type:'subscribe',sessionId:'session_001'}));
ws.onmessage = e => console.log('Received:', JSON.parse(e.data));
```

## Architecture

```
Python Backend
  ↓ writes
JSONL files (logs/telemetry/)
  ↓ watched by
fs.watch() in TelemetryStreamer
  ↓ pushes updates to
WebSocket (/ws/telemetry)
  ↓ received by
Frontend clients
```

## Performance

- **File watching:** Uses Node.js built-in `fs.watch()` (no dependencies)
- **Incremental updates:** Only sends new records (tracks `lastSent` per client)
- **Heartbeat:** Server pings every 30 seconds to keep connections alive
- **Auto-reconnect:** Clients should implement reconnection logic

## Security

- **Rate limiting:** Consider adding rate limiting for subscribe/unsubscribe
- **Authentication:** Add JWT or session-based auth if needed
- **CORS:** WebSocket inherits from HTTP server CORS configuration

## Limitations

- File watching may have slight delay (~100ms)
- Large telemetry files may cause memory issues (consider pagination)
- No historical replay (only streams new records)

## Future Enhancements

- [ ] Historical replay (send last N records on subscribe)
- [ ] Compression for large telemetry payloads
- [ ] Filtering by metric thresholds
- [ ] Multiple session subscription
- [ ] Snapshot requests (get current state without streaming)

---

**Created:** 2025-12-18  
**Status:** ✅ Implemented  
**Endpoint:** `ws://localhost:5000/ws/telemetry`
