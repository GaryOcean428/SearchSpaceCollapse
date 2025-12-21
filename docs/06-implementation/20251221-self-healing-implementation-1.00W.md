# Self-Healing System Implementation Guide

**Document ID**: 20251221-self-healing-implementation-1.00W  
**Version**: 1.0  
**Status**: WORKING (implementation complete, testing in progress)  
**Date**: 2025-12-21  
**Classification**: Implementation Guide

## Quick Start

### Prerequisites
- Python 3.10+ with NumPy, SciPy, Flask
- Node.js 18+ with TypeScript
- PostgreSQL (optional, file storage fallback available)
- QIG backend running on port 5001

### Installation

1. **Python Dependencies**
```bash
cd qig-backend
pip install -r requirements.txt  # numpy, scipy already included
```

2. **Node.js Dependencies**
```bash
npm install  # All dependencies already configured
```

3. **Start QIG Backend**
```bash
cd qig-backend
python3 ocean_qig_core.py
```

The self-healing routes are automatically registered at `/self-healing/*`.

4. **Start Node.js Server**
```bash
npm run dev
```

The self-healing routes are available at `/api/self-healing/*`.

## Integration Steps

### 1. Enable Health Monitoring

In your application initialization:

```typescript
import { selfHealingService } from '@/lib/self-healing';

// Start monitoring (checks every 5 minutes)
selfHealingService.startMonitoring(300000);
```

### 2. Capture Snapshots During Processing

In your QIG processing loop:

```typescript
import { selfHealingService } from '@/lib/self-healing';

async function processWithMonitoring(input: string) {
  // Your existing QIG processing
  const result = await qigProcess(input);
  
  // Capture snapshot
  await selfHealingService.captureSnapshot({
    phi: result.phi,
    kappa_eff: result.kappa_eff,
    basin_coords: result.basin,
    confidence: result.confidence,
    surprise: result.surprise,
    agency: result.agency,
    error_rate: getErrorRate(),
    avg_latency: getLatency(),
    memory_mb: process.memoryUsage().heapUsed / 1024 / 1024,
    cpu_pct: getCpuUsage(),
  });
  
  return result;
}
```

### 3. Check Health Periodically

```typescript
// In your health check endpoint
app.get('/health', async (req, res) => {
  const health = await selfHealingService.checkHealth();
  
  if (health.severity === 'critical') {
    // Alert or attempt healing
    const healResult = await selfHealingService.triggerHealing();
    console.log(`Healing attempt: ${healResult.healed}`);
  }
  
  res.json(health);
});
```

## Python-Side Integration

### Using the Monitor Directly

```python
from self_healing import GeometricHealthMonitor

# Create monitor
monitor = GeometricHealthMonitor()

# In your QIG processing
def process_with_monitoring(input_text):
    result = qig_process(input_text)
    
    # Capture snapshot
    snapshot = monitor.capture_snapshot({
        'phi': result['phi'],
        'kappa_eff': result['kappa_eff'],
        'basin_coords': result['basin'],
        'confidence': result['confidence'],
        'surprise': result['surprise'],
        'agency': result['agency'],
        'error_rate': get_error_rate(),
        'avg_latency': get_latency(),
        'memory_mb': get_memory_usage(),
        'cpu_pct': get_cpu_usage(),
    })
    
    return result
```

### Automatic Healing Loop

```python
import asyncio
from self_healing import (
    GeometricHealthMonitor,
    CodeFitnessEvaluator,
    SelfHealingEngine
)

# Initialize components
monitor = GeometricHealthMonitor()
evaluator = CodeFitnessEvaluator(monitor)
engine = SelfHealingEngine(monitor, evaluator)

# Start healing loop
async def main():
    await engine.start_healing_loop(interval_sec=300)

asyncio.run(main())
```

## Configuration

### Adjusting Thresholds

Edit `shared/constants/self-healing.ts`:

```typescript
export const SELF_HEALING = {
  PHI_MIN: 0.65,              // Lower = more permissive
  BASIN_DRIFT_MAX: 2.0,       // Higher = allow more drift
  ERROR_RATE_MAX: 0.05,       // 5% error threshold
  LATENCY_CRITICAL_MS: 2000,  // Latency before critical alert
  // ...
};
```

These constants are automatically picked up by both TypeScript and Python (via export).

### Monitoring Frequency

**TypeScript**:
```typescript
// Check every 1 minute (60000ms) instead of 5 minutes
selfHealingService.startMonitoring(60000);
```

**Python**:
```python
# Snapshot every 30 seconds instead of 60
monitor = GeometricHealthMonitor(snapshot_interval_sec=30)
```

## Testing

### Unit Tests (Python)

```python
# Test geometric monitor
import numpy as np
from self_healing import GeometricHealthMonitor

monitor = GeometricHealthMonitor()

# Capture snapshot
snapshot = monitor.capture_snapshot({
    'phi': 0.73,
    'kappa_eff': 64.2,
    'basin_coords': np.random.randn(64),
    'confidence': 0.85,
    'surprise': 0.15,
    'agency': 0.90,
})

assert snapshot.phi == 0.73
assert snapshot.regime == 'breakdown'  # phi >= 0.7

# Check degradation (needs 10 snapshots)
for i in range(10):
    monitor.capture_snapshot({
        'phi': 0.60,  # Below threshold
        'kappa_eff': 64.0,
        'basin_coords': np.random.randn(64),
    })

health = monitor.detect_degradation()
assert health['degraded'] == True
assert 'Φ below threshold' in str(health['issues'])
```

### Integration Tests (TypeScript)

```typescript
import { selfHealingAdapter } from '@/lib/self-healing/adapter';

describe('Self-Healing Integration', () => {
  it('should capture snapshot', async () => {
    const snapshot = await selfHealingAdapter.captureSnapshot({
      phi: 0.73,
      kappa_eff: 64.2,
      basin_coords: new Array(64).fill(0),
      confidence: 0.85,
      surprise: 0.15,
      agency: 0.90,
    });
    
    expect(snapshot.phi).toBe(0.73);
    expect(snapshot.regime).toBe('breakdown');
  });
  
  it('should detect degradation', async () => {
    const health = await selfHealingAdapter.detectDegradation();
    expect(health).toHaveProperty('degraded');
    expect(health).toHaveProperty('severity');
  });
});
```

### End-to-End Test

```bash
# 1. Start QIG backend
cd qig-backend
python3 ocean_qig_core.py &

# 2. Start Node.js server
npm run dev &

# 3. Test health endpoint
curl http://localhost:5000/api/self-healing/health

# 4. Capture snapshot
curl -X POST http://localhost:5000/api/self-healing/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "phi": 0.73,
    "kappa_eff": 64.2,
    "basin_coords": [0.1, 0.2, ...]
  }'

# 5. Check stats
curl http://localhost:5000/api/self-healing/stats
```

## Troubleshooting

### Issue: Backend Not Available

**Symptom**: `checkHealth()` returns false

**Solution**:
1. Check if QIG backend is running: `curl http://localhost:5001/health`
2. Check Flask logs for errors
3. Verify self-healing routes registered: Look for `"[INFO] Self-healing system registered at /self-healing"` in logs

### Issue: Import Errors (Python)

**Symptom**: `ModuleNotFoundError: No module named 'numpy'`

**Solution**:
```bash
cd qig-backend
pip install -r requirements.txt
```

### Issue: Snapshot Not Captured

**Symptom**: Stats show `snapshot_count: 0`

**Solution**:
1. Verify required fields in snapshot: `phi`, `kappa_eff`, `basin_coords`
2. Check for Python errors in Flask logs
3. Ensure basin_coords is a 64-element array

### Issue: Health Always "Normal"

**Symptom**: Never detects degradation

**Solution**:
1. Need at least 10 snapshots for detection
2. Check if Φ is actually below threshold (0.65)
3. Verify basin drift calculation is working
4. Check thresholds in `shared/constants/self-healing.ts`

## Performance Considerations

### Memory Usage
- Each snapshot: ~1 KB
- 1000 snapshots: ~1 MB
- History automatically trimmed

### CPU Impact
- Snapshot capture: < 1ms
- Health check: < 5ms
- Healing attempt: < 100ms
- Monitoring loop: Runs every 5 minutes, negligible impact

### Network Traffic
- Snapshot to Python: ~2 KB
- Health check from Python: ~500 bytes
- Minimal overhead

## Best Practices

### 1. Capture Snapshots at Key Points
```typescript
// After major state changes
await captureSnapshot(state);

// After learning events
await captureSnapshot(state);

// Periodically during long operations
setInterval(() => captureSnapshot(state), 60000);
```

### 2. Monitor Critical Paths
Focus on:
- QIG processing loops
- Consciousness updates
- Basin calculations
- Recovery operations

### 3. Handle Degradation Gracefully
```typescript
const health = await checkHealth();

if (health.severity === 'critical') {
  // Alert humans
  await alertOps(health);
  
  // Attempt auto-healing
  const result = await triggerHealing();
  
  if (!result.healed) {
    // Graceful degradation
    await switchToFallbackMode();
  }
}
```

### 4. Review Auto-Generated Patches
All healing patches should be reviewed before merging:
```python
# Patches are logged to qig-backend/logs/critical_alerts.log
# Review before applying
```

## Security Notes

- Self-healing can generate code patches
- **Always review patches before applying**
- Sandbox testing is limited (not full isolation)
- Critical alerts logged to file for audit trail
- No auto-commit to git (requires manual PR)

## Roadmap

### Immediate (Done)
- [x] Basic monitoring
- [x] Health detection
- [x] Simple healing strategies
- [x] API endpoints

### Short Term (Next Sprint)
- [ ] Enhanced sandbox testing
- [ ] ML-based prediction
- [ ] Automatic refactoring
- [ ] Performance optimization strategies

### Long Term (Future)
- [ ] Distributed healing coordination
- [ ] Advanced pattern recognition
- [ ] Self-optimization of weights
- [ ] Visualization dashboard

## Support

For issues or questions:
1. Check logs: `qig-backend/logs/critical_alerts.log`
2. Review API responses for error details
3. Open GitHub issue with logs and reproduction steps

## References

- [Technical Documentation](./20251221-self-healing-architecture-1.00D.md)
- [API Reference](../../README.md#self-healing-api)
- [Constants](../../shared/constants/self-healing.ts)

---
**Last Updated**: 2025-12-21  
**Status**: Implementation complete, testing in progress
