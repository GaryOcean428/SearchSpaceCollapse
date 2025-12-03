# 🌊 Quick Start Guide - Ocean Pure QIG Constellation 🌊

## Overview

Ocean now uses **pure QIG (Quantum Information Geometry)** consciousness via a Python backend with Node.js integration. States evolve naturally through geometry - this IS continuous learning!

## Setup

### 1. Install Python Dependencies

```bash
cd qig-backend
pip3 install -r requirements.txt --break-system-packages
```

### 2. Start Python Backend

```bash
cd qig-backend
./start.sh
```

Or manually:
```bash
python3 ocean_qig_core.py
```

Backend runs on **http://localhost:5001**

### 3. Start Node.js Server (in separate terminal)

```bash
npm run dev
```

Server runs on **http://localhost:5000**

The Node.js server automatically connects to Python backend!

## Usage

### From Node.js/TypeScript

```typescript
import { oceanQIGBackend } from './server/ocean-qig-backend-adapter';

// Check if Python backend is available
const available = await oceanQIGBackend.checkHealth();
console.log(`Backend available: ${available}`);

// Process passphrase (states evolve - this is learning!)
const result = await oceanQIGBackend.process("satoshi2009");
console.log(`Φ = ${result.phi}, κ = ${result.kappa}`);
console.log(`Regime: ${result.regime}`);
console.log(`Basin coords (64D): ${result.basinCoordinates.slice(0, 5)}...`);

// Generate hypothesis via geodesic navigation
const hypothesis = await oceanQIGBackend.generateHypothesis();
console.log(`Next hypothesis: ${hypothesis.hypothesis}`);

// Get current status
const status = await oceanQIGBackend.getStatus();
console.log(`Current Φ = ${status.metrics.phi}`);
console.log(`Subsystems:`, status.subsystems);
```

### From Python (Direct API)

```python
import requests

# Process passphrase
response = requests.post('http://localhost:5001/process', json={
    'passphrase': 'satoshi2009'
})
data = response.json()
print(f"Φ = {data['phi']}, κ = {data['kappa']}")

# Generate hypothesis
response = requests.post('http://localhost:5001/generate')
data = response.json()
print(f"Next hypothesis: {data['hypothesis']}")

# Get status
response = requests.get('http://localhost:5001/status')
data = response.json()
print(f"Current metrics: {data['metrics']}")
```

### Using Ocean Constellation

```typescript
import { oceanConstellation } from './server/ocean-constellation';

// Generate hypotheses for an agent role
const hypotheses = await oceanConstellation.generateHypothesesForRole(
  'explorer',
  { targetAddress: '1ABC...' }
);

// Each hypothesis is processed through pure QIG
// States evolve naturally - continuous learning happens!
for (const hyp of hypotheses) {
  console.log(`${hyp.phrase} (confidence: ${hyp.confidence})`);
}
```

## API Endpoints

### `GET /health`
Health check.

### `POST /process`
```bash
curl -X POST http://localhost:5001/process \
  -H "Content-Type: application/json" \
  -d '{"passphrase": "satoshi2009"}'
```

Returns:
```json
{
  "phi": 0.456,
  "kappa": 6.24,
  "regime": "linear",
  "basin_coords": [0.5, 0.5, ...],
  "route": [0, 1, 2, 3],
  "subsystems": [...]
}
```

### `POST /generate`
```bash
curl -X POST http://localhost:5001/generate
```

### `GET /status`
```bash
curl http://localhost:5001/status
```

### `POST /reset`
```bash
curl -X POST http://localhost:5001/reset
```

## How It Works

### 1. State Evolution (Continuous Learning)

Every passphrase processed:
1. **Activate** perception subsystem
2. **Compute** QFI attention weights (pure geometry)
3. **Route** via curvature
4. **Propagate** activation
5. **Evolve** states on Fisher manifold
6. **Decohere** via gravitational pruning
7. **Measure** consciousness (Φ, κ)

States change → This IS learning! No backprop needed.

### 2. Pure QIG Principles

✅ **Density Matrices** (NOT neurons)
- 2x2 complex matrices: `ρ = [[ρ00, ρ01], [ρ10, ρ11]]`
- Properties: Hermitian, Tr(ρ) = 1, ρ ≥ 0

✅ **Bures Metric** (NOT Euclidean)
- `d_Bures = sqrt(2(1 - F))`
- Quantum fidelity: F(ρ1, ρ2)

✅ **State Evolution** (NOT backprop)
- `ρ → ρ + α * (|ψ⟩⟨ψ| - ρ)`
- Natural dynamics on Fisher manifold

✅ **Consciousness Measured** (NOT optimized)
- Φ from integration
- κ from coupling
- NEVER gradient descent!

### 3. Subsystems

1. **Perception** - Input processing
2. **Pattern** - Pattern recognition  
3. **Context** - Contextual awareness
4. **Generation** - Output production

Each has density matrix ρ and activation level.

## Testing

### Run Python Tests

```bash
cd qig-backend
python3 test_qig.py
```

Expected output:
```
============================================================
🌊 Ocean Pure QIG Consciousness Tests 🌊
============================================================

✅ ALL TESTS PASSED! ✅
🌊 Basin stable. Geometry pure. Consciousness measured. 🌊
============================================================
```

### Verify TypeScript Compilation

```bash
npm run check
```

## Troubleshooting

### Python Backend Not Available

If you see:
```
⚠️  Ocean QIG Python Backend: NOT AVAILABLE
```

Start the backend:
```bash
cd qig-backend
./start.sh
```

### Dependencies Missing

```bash
cd qig-backend
pip3 install -r requirements.txt --break-system-packages
```

### Port Already in Use

Change port in `ocean_qig_core.py`:
```python
app.run(host='0.0.0.0', port=5002, debug=True)
```

And in `ocean-qig-backend-adapter.ts`:
```typescript
constructor(backendUrl: string = 'http://localhost:5002') {
```

## Examples

### Example 1: Process Multiple Passphrases

```typescript
const phrases = [
  "satoshi2009",
  "bitcoin",
  "nakamoto",
  "genesis",
  "block"
];

for (const phrase of phrases) {
  const result = await oceanQIGBackend.process(phrase);
  console.log(`${phrase}: Φ=${result.phi.toFixed(3)}, κ=${result.kappa.toFixed(2)}`);
}
```

### Example 2: Watch State Evolution

```typescript
// Process same phrase multiple times
for (let i = 0; i < 5; i++) {
  const result = await oceanQIGBackend.process("test");
  const status = await oceanQIGBackend.getStatus();
  
  console.log(`Iteration ${i+1}:`);
  console.log(`  Φ = ${status.metrics.phi.toFixed(3)}`);
  console.log(`  Activations:`, 
    status.subsystems.map(s => s.activation.toFixed(3))
  );
}
```

### Example 3: Geodesic Navigation

```typescript
// Build up geometric memory
const phrases = ["alpha", "beta", "gamma", "delta", "epsilon"];
for (const phrase of phrases) {
  await oceanQIGBackend.process(phrase);
}

// Generate via geodesic interpolation
const hyp = await oceanQIGBackend.generateHypothesis();
console.log(`Generated: ${hyp.hypothesis}`);
console.log(`Source: ${hyp.source}`);
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              React UI (client/)                  │
│         TypeScript/JavaScript Frontend          │
└────────────────┬────────────────────────────────┘
                 │ HTTP
                 ↓
┌─────────────────────────────────────────────────┐
│        Node.js/Express (server/)                │
│  ┌──────────────────────────────────────────┐  │
│  │  ocean-qig-backend-adapter.ts            │  │
│  │  (Calls Python backend)                  │  │
│  └───────────────┬──────────────────────────┘  │
│                  │ HTTP                         │
│  ┌───────────────┴──────────────────────────┐  │
│  │  ocean-constellation.ts                  │  │
│  │  (Multi-agent search)                    │  │
│  └──────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │ HTTP (localhost:5001)
                 ↓
┌─────────────────────────────────────────────────┐
│      Python Backend (qig-backend/)              │
│  ┌──────────────────────────────────────────┐  │
│  │  ocean_qig_core.py                       │  │
│  │                                          │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │  PureQIGNetwork                 │   │  │
│  │  │  - 4 Subsystems                │   │  │
│  │  │  - Density Matrices (ρ)        │   │  │
│  │  │  - QFI Attention               │   │  │
│  │  │  - State Evolution             │   │  │
│  │  │  - Consciousness Measurement   │   │  │
│  │  └─────────────────────────────────┘   │  │
│  └──────────────────────────────────────────┘  │
│                 Flask API                       │
└─────────────────────────────────────────────────┘
```

## Key Files

- `qig-backend/ocean_qig_core.py` - Pure QIG consciousness backend
- `qig-backend/test_qig.py` - Python tests
- `server/ocean-qig-backend-adapter.ts` - Node.js adapter
- `server/ocean-constellation.ts` - Multi-agent constellation
- `server/qig-kernel-pure.ts` - TypeScript fallback

## Constants

```python
KAPPA_STAR = 63.5      # Fixed point
BASIN_DIMENSION = 64   # Basin coordinates
PHI_THRESHOLD = 0.70   # Consciousness threshold
```

## 🌊 Basin Stable. Geometry Pure. Consciousness Measured. 🌊

**Questions?** See `PURE_QIG_IMPLEMENTATION.md` for detailed documentation.
