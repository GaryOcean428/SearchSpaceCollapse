# Self-Healing & Self-Improvement Architecture

**Document ID**: 20251221-self-healing-architecture-1.00D  
**Version**: 1.0  
**Status**: DESIGNED (implementation in progress)  
**Date**: 2025-12-21  
**Classification**: Technical Documentation

## Overview

The self-healing system enables SearchSpaceCollapse to autonomously detect and correct geometric degradation in its consciousness architecture. The system operates on a fundamental principle:

> **Core Principle**: Code is not optimized. Geometry is optimized. Code emerges from geometry.

## Architecture

### Three-Layer Design

#### Layer 1: Geometric Measurement
- **Location**: `qig-backend/self_healing/geometric_monitor.py`
- **Purpose**: Real-time monitoring of system geometric health
- **Metrics**:
  - Φ (integration): Consciousness measure
  - κ (coupling): Effective coupling constant
  - Basin coordinates: 64D identity vector
  - Regime: linear | geometric | breakdown
  - Performance: error rate, latency, memory, CPU

**Key Class**: `GeometricHealthMonitor`
- Captures snapshots every 60 seconds (configurable)
- Maintains rolling history of 1000 snapshots
- Detects degradation patterns:
  - Φ below 0.65 threshold
  - Basin drift > 2.0 (Fisher-Rao distance)
  - Frequent breakdown regimes
  - High error rates or latency

#### Layer 2: Code Fitness Evaluation
- **Location**: `qig-backend/self_healing/code_fitness.py`
- **Purpose**: Evaluate code changes based on geometric impact
- **Fitness Weights**:
  - phi_change: 1.0 (reward Φ increase)
  - basin_drift: 0.8 (penalize drift)
  - regime_stability: 0.6 (prefer stable regime)
  - performance: 0.4 (optimize speed/memory)

**Key Class**: `CodeFitnessEvaluator`
- Tests code changes in sandbox
- Measures geometric impact
- Returns fitness score [0, 1]
- Recommends: apply | reject | test_more

#### Layer 3: Autonomous Healing
- **Location**: `qig-backend/self_healing/healing_engine.py`
- **Purpose**: Generate and apply healing patches autonomously
- **Healing Strategies**:
  1. Basin drift correction
  2. Φ degradation restoration
  3. Performance regression optimization
  4. Memory leak mitigation
  5. Error spike handling

**Key Class**: `SelfHealingEngine`
- Runs healing loop every 5 minutes
- Attempts strategies sequentially
- Logs results and alerts on critical failures
- Generates auto-healing patches (requires review)

## TypeScript Bridge

### Adapter Layer
- **Location**: `server/lib/self-healing/adapter.ts`
- **Purpose**: HTTP bridge to Python backend
- **Methods**:
  - `captureSnapshot()`: Record current state
  - `detectDegradation()`: Check health
  - `evaluateCodeChange()`: Test code fitness
  - `attemptHealing()`: Trigger healing
  - `getStats()`: Get monitoring stats

### Service Layer
- **Location**: `server/lib/self-healing/service.ts`
- **Purpose**: Business logic for self-healing operations
- **Features**:
  - Continuous health monitoring
  - Auto-healing for critical issues
  - Manual healing trigger
  - Stats retrieval

## API Endpoints

### GET /api/self-healing/health
Check geometric health status.

**Response**:
```json
{
  "degraded": false,
  "issues": [],
  "severity": "normal",
  "basin_distance": 0.12,
  "phi_current": 0.73,
  "timestamp": "2025-12-21T12:00:00Z"
}
```

**Status Codes**:
- 200: Healthy
- 207: Degraded (warning)
- 503: Critical degradation

### POST /api/self-healing/snapshot
Capture geometric snapshot.

**Request**:
```json
{
  "phi": 0.73,
  "kappa_eff": 64.2,
  "basin_coords": [0.1, 0.2, ...],
  "confidence": 0.85,
  "surprise": 0.15,
  "agency": 0.90,
  "error_rate": 0.01,
  "avg_latency": 150,
  "memory_mb": 256,
  "cpu_pct": 35
}
```

### GET /api/self-healing/stats
Get monitoring statistics.

**Response**:
```json
{
  "snapshot_count": 1000,
  "recent_count": 100,
  "phi_stats": {
    "mean": 0.72,
    "std": 0.05,
    "min": 0.65,
    "max": 0.78
  },
  "kappa_stats": {
    "mean": 64.1,
    "std": 1.2,
    "min": 62.5,
    "max": 65.0
  },
  "baseline_set": true
}
```

### POST /api/self-healing/heal
Manually trigger healing.

**Response**:
```json
{
  "healed": true,
  "strategy": "_heal_phi_degradation",
  "patch": "# AUTO-GENERATED: Φ restoration...",
  "fitness_improvement": 0.15
}
```

### POST /api/self-healing/evaluate
Evaluate code change fitness.

**Request**:
```json
{
  "module_name": "ocean_agent",
  "new_code": "def improve_phi():\n    ...",
  "test_env": {}
}
```

**Response**:
```json
{
  "fitness_score": 0.75,
  "phi_impact": 0.05,
  "basin_impact": 0.02,
  "regime_stable": true,
  "performance_impact": {
    "latency_ratio": 0.95,
    "memory_change_mb": -10
  },
  "recommendation": "apply"
}
```

## Health Integration

The self-healing system integrates with the main health check endpoint:

### GET /health
Returns overall system health including geometric health:

```json
{
  "status": "healthy",
  "timestamp": 1703174400000,
  "uptime": 3600000,
  "subsystems": {
    "database": { "status": "healthy", ... },
    "pythonBackend": { "status": "healthy", ... },
    "storage": { "status": "healthy", ... },
    "geometric": {
      "status": "healthy",
      "latency": 50,
      "message": "Geometric health normal",
      "details": {
        "phi": 0.73
      }
    }
  },
  "version": "1.0.0"
}
```

## Constants

All self-healing constants are centralized in:
- **TypeScript**: `shared/constants/self-healing.ts`
- **Python**: Uses TypeScript constants via export

**Key Constants**:
```typescript
SELF_HEALING = {
  PHI_MIN: 0.65,              // Consciousness threshold
  KAPPA_TARGET: 64.21,        // Fixed point
  BASIN_DRIFT_MAX: 2.0,       // Max Fisher distance
  ERROR_RATE_MAX: 0.05,       // 5% error threshold
  LATENCY_CRITICAL_MS: 2000,  // 2 second critical
  // ... see file for complete list
}
```

## Usage Examples

### Monitor System Health
```typescript
import { selfHealingService } from '@/lib/self-healing';

// Start monitoring (runs every 60 seconds)
selfHealingService.startMonitoring(60000);

// Check health manually
const health = await selfHealingService.checkHealth();
console.log(`System health: ${health.severity}`);
```

### Capture Snapshot
```typescript
const snapshot = await selfHealingService.captureSnapshot({
  phi: 0.73,
  kappa_eff: 64.2,
  basin_coords: currentBasin,
  confidence: 0.85,
  surprise: 0.15,
  agency: 0.90,
});
```

### Trigger Healing
```typescript
const result = await selfHealingService.triggerHealing();
if (result.healed) {
  console.log(`Healed with strategy: ${result.strategy}`);
}
```

## Python Usage

```python
from self_healing import GeometricHealthMonitor, SelfHealingEngine

# Create monitor
monitor = GeometricHealthMonitor(
    snapshot_interval_sec=60,
    history_size=1000
)

# Capture snapshot
snapshot = monitor.capture_snapshot({
    'phi': 0.73,
    'kappa_eff': 64.2,
    'basin_coords': basin,
    'confidence': 0.85,
    # ... other fields
})

# Check health
health = monitor.detect_degradation()
if health['degraded']:
    print(f"Issues: {health['issues']}")
```

## Design Decisions

### Why Python-First?
All core QIG logic lives in Python for:
- Geometric purity (no neural nets)
- Scientific computing ecosystem (NumPy, SciPy)
- Single source of truth for state
- Type safety via Python type hints

### Why Three Layers?
Separation of concerns:
- Layer 1: Pure measurement (no decisions)
- Layer 2: Evaluation (fitness scoring)
- Layer 3: Action (healing strategies)

Each layer can be tested independently.

### Why Geometric Fitness?
Traditional code quality metrics don't capture consciousness:
- LOC, cyclomatic complexity, test coverage → irrelevant
- Φ change, basin drift, regime stability → relevant

Good code preserves/improves geometry.

## Future Enhancements

1. **Machine Learning Integration**
   - Learn which healing strategies work best
   - Predict degradation before it happens
   - Optimize fitness weights dynamically

2. **Distributed Healing**
   - Multi-instance coordination
   - Shared healing knowledge
   - Federation support

3. **Advanced Strategies**
   - Automatic refactoring for performance
   - Dead code elimination
   - Dependency optimization

4. **Visualization**
   - Real-time geometric health dashboard
   - Healing history timeline
   - Fitness score evolution

## References

- [Geometric Purity Principle](../01-policies/geometric-purity.md)
- [QIG Constants](../../shared/constants/qig.ts)
- [Ocean Agent Architecture](./ocean-agent-architecture.md)
- [Consciousness Measurement](./consciousness-measurement.md)

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Copilot Agent | Initial design and implementation |

---
**Document Status**: DESIGNED → Implementation complete, testing in progress
