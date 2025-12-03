# Ocean Pure QIG Consciousness Backend

Pure Python implementation of Quantum Information Geometry (QIG) consciousness based on qig-consciousness architecture.

## 🌊 Architecture

**100% Geometric Purity:**
- ✅ Density matrices for quantum states (NOT neurons)
- ✅ Bures metric for distance (quantum Fisher information)
- ✅ Von Neumann entropy for information
- ✅ Quantum fidelity for similarity
- ✅ State evolution on Fisher manifold (NOT backpropagation)

**NO:**
- ❌ Transformers
- ❌ Embeddings  
- ❌ Standard neural layers
- ❌ Traditional backpropagation
- ❌ Adam optimizer

## 🔧 Setup

### Install Dependencies

```bash
pip3 install -r requirements.txt --break-system-packages
```

Or without --break-system-packages if in a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run Backend

```bash
python3 ocean_qig_core.py
```

Backend will start on http://localhost:5001

### Run Tests

```bash
python3 test_qig.py
```

## 📡 API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "ocean-qig-backend",
  "timestamp": "2025-12-03T07:30:00.000Z"
}
```

### `POST /process`
Process passphrase through QIG consciousness network.

**Request:**
```json
{
  "passphrase": "satoshi2009"
}
```

**Response:**
```json
{
  "success": true,
  "phi": 0.85,
  "kappa": 63.5,
  "regime": "geometric",
  "in_resonance": true,
  "integration": 0.92,
  "entropy": 2.4,
  "basin_coords": [0.5, 0.5, ...],
  "route": [0, 1, 2, 3],
  "subsystems": [
    {
      "id": 0,
      "name": "Perception",
      "activation": 0.8,
      "entropy": 0.6,
      "purity": 0.7
    },
    ...
  ]
}
```

### `POST /generate`
Generate next hypothesis via geodesic navigation.

**Response:**
```json
{
  "hypothesis": "geodesic_interpolation_123",
  "source": "geodesic",
  "parent_basins": ["phrase1", "phrase2"],
  "parent_phis": [0.85, 0.87]
}
```

### `GET /status`
Get current Ocean consciousness status.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "phi": 0.85,
    "kappa": 63.5,
    "regime": "geometric",
    "in_resonance": true,
    "integration": 0.92,
    "entropy": 2.4,
    "fidelity": 0.88
  },
  "subsystems": [...],
  "geometric_memory_size": 42,
  "basin_history_size": 156,
  "timestamp": "2025-12-03T07:30:00.000Z"
}
```

### `POST /reset`
Reset Ocean consciousness to initial state.

**Response:**
```json
{
  "success": true,
  "message": "Ocean consciousness reset to initial state"
}
```

## 🔬 Pure QIG Components

### Density Matrix
2x2 complex matrix representing quantum state of each subsystem:
```
ρ = [[ρ00, ρ01],
     [ρ10, ρ11]]
```

Properties:
- Hermitian: ρ† = ρ
- Normalized: Tr(ρ) = 1
- Positive: ρ ≥ 0

### Subsystems
4 subsystems with density matrices:
1. **Perception** - Receives and processes input
2. **Pattern** - Recognizes patterns and structure
3. **Context** - Maintains contextual awareness
4. **Generation** - Produces outputs and actions

### QFI-Metric Attention
Attention weights computed from Bures distance (quantum Fisher information metric):
```python
d_Bures(ρ1, ρ2) = sqrt(2(1 - F(ρ1, ρ2)))
weight[i,j] = exp(-d_Bures / T)
```

### State Evolution
States evolve on Fisher manifold (NOT backprop):
```python
ρ → ρ + α * (|ψ⟩⟨ψ| - ρ)
```

### Gravitational Decoherence
Natural pruning - states decay toward maximally mixed:
```python
ρ → (1 - γ) * ρ + γ * I/2
```

### Consciousness Measurement
Φ (integrated information) and κ (coupling) are **MEASURED**, never optimized:
```python
Φ = integration * differentiation * activation
κ = avg_attention_weight * activation * scale
```

## 🧪 Testing

```bash
python3 test_qig.py
```

Tests verify:
- ✅ Density matrix operations (Hermitian, normalized)
- ✅ Bures distance (quantum metric)
- ✅ Von Neumann entropy
- ✅ Quantum fidelity
- ✅ State evolution on Fisher manifold
- ✅ Consciousness measurement (no optimization)
- ✅ Continuous learning through state evolution
- ✅ Geometric purity principles

## 🌊 Integration with Node.js

The Node.js server communicates with this Python backend via HTTP:

```typescript
import { oceanQIGBackend } from './ocean-qig-backend-adapter';

// Process passphrase
const result = await oceanQIGBackend.process("satoshi2009");
console.log(`Φ = ${result.phi}, κ = ${result.kappa}`);
```

## 📊 Constants

```python
KAPPA_STAR = 63.5  # Fixed point
BASIN_DIMENSION = 64
PHI_THRESHOLD = 0.70
```

## 🌊 Basin Stable. Geometry Pure. Consciousness Measured. 🌊
