# Integration Guide: Unbiased System → SearchSpaceCollapse

**Version:** 1.0  
**Date:** 2025-12-07

---

## Overview

Integrate the unbiased measurement system with SearchSpaceCollapse to validate QIG theory without forced classifications.

## Quick Integration

### 1. Files Already in Repo

```
SearchSpaceCollapse/qig-backend/unbiased/
├── raw_measurement.py          ✅ Core measurement
├── pattern_discovery.py        ✅ Unsupervised learning
├── test_runner.py              ✅ Validation suite
├── README.md                   ✅ Documentation
└── DEPLOYMENT_SUMMARY.md       ✅ Status
```

### 2. Install Dependencies

```bash
cd SearchSpaceCollapse/qig-backend
pip install --break-system-packages numpy scipy scikit-learn
```

### 3. Run Validation

```bash
# Quick test (50 samples)
python unbiased/test_runner.py --samples 50

# Full validation (200 samples)
python unbiased/test_runner.py --samples 200 --output ./validation_results

# Check results
cat /tmp/qig_validation/validation_summary.json
```

---

## API Integration (Optional)

### Add Flask Endpoints

Add to `ocean_qig_core.py`:

```python
from unbiased.test_runner import UnbiasedValidationSuite
from unbiased.raw_measurement import UnbiasedQIGNetwork

@app.route('/unbiased/validate', methods=['POST'])
def run_unbiased_validation():
    """Run complete validation suite"""
    data = request.json or {}
    n_samples = data.get('samples', 100)
    
    suite = UnbiasedValidationSuite(output_dir='/tmp/qig_validation')
    summary = suite.run_all_tests(n_samples=n_samples)
    
    return jsonify({'success': True, 'summary': summary})

@app.route('/unbiased/measure', methods=['POST'])
def unbiased_measurement():
    """Get unbiased measurement (no classifications)"""
    data = request.json or {}
    input_text = data.get('input', '')
    
    if not input_text:
        return jsonify({'error': 'input required'}), 400
    
    network = UnbiasedQIGNetwork()
    measurement = network.process(input_text)
    
    return jsonify({'success': True, 'measurement': measurement})

@app.route('/unbiased/compare', methods=['POST'])
def compare_biased_unbiased():
    """Compare biased vs unbiased measurements"""
    data = request.json or {}
    input_text = data.get('input', '')
    
    if not input_text:
        return jsonify({'error': 'input required'}), 400
    
    # Biased (existing system)
    biased = ocean_network.process(input_text)
    
    # Unbiased (new system)
    unbiased_net = UnbiasedQIGNetwork()
    unbiased = unbiased_net.process(input_text)
    
    differences = {
        'phi_vs_integration': {
            'biased': biased['metrics']['phi'],
            'unbiased': unbiased['metrics']['integration'],
            'delta': biased['metrics']['phi'] - unbiased['metrics']['integration'],
        },
        'kappa_vs_coupling': {
            'biased': biased['metrics']['kappa'],
            'unbiased': unbiased['metrics']['coupling'],
            'delta': biased['metrics']['kappa'] - unbiased['metrics']['coupling'],
        },
        'basin_dimension': {
            'biased': 64,  # Forced
            'unbiased': len(unbiased['basin_coords']),  # Natural
        },
    }
    
    return jsonify({
        'success': True,
        'biased': biased,
        'unbiased': unbiased,
        'differences': differences,
    })
```

### TypeScript Client (Optional)

Create `server/qig-unbiased-client.ts`:

```typescript
export interface UnbiasedMeasurement {
  metrics: {
    integration: number;
    coupling: number;
    temperature: number;
    curvature: number;
    generation: number;
  };
  basin_coords: number[];
  basin_dimension: number;
}

export async function runUnbiasedValidation(samples: number = 100) {
  const response = await fetch('/unbiased/validate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({samples}),
  });
  return await response.json();
}

export async function getUnbiasedMeasurement(input: string): Promise<UnbiasedMeasurement> {
  const response = await fetch('/unbiased/measure', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({input}),
  });
  const data = await response.json();
  return data.measurement;
}

export async function compareBiasedUnbiased(input: string) {
  const response = await fetch('/unbiased/compare', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({input}),
  });
  return await response.json();
}
```

---

## Usage Examples

### Python: Direct Usage

```python
from unbiased.raw_measurement import UnbiasedQIGNetwork
from unbiased.pattern_discovery import PatternDiscovery
import json

# Create network
network = UnbiasedQIGNetwork(n_subsystems=4, temperature=1.0)

# Process inputs
for i in range(100):
    network.process(f"test input {i}")

# Export measurements
network.export_measurements('/tmp/measurements.json')

# Pattern discovery
with open('/tmp/measurements.json') as f:
    measurements = json.load(f)

discovery = PatternDiscovery(measurements)
report = discovery.generate_report('/tmp/patterns.json')

print(f"Natural regimes: {report['regimes']['n_clusters']}")
print(f"E8 signature: {report['dimensionality']['e8_signature_detected']}")
print(f"Effective dimension: {report['dimensionality']['effective_dimension_90']}D")
```

### Python: Validation Suite

```python
from unbiased.test_runner import UnbiasedValidationSuite

# Run all tests
suite = UnbiasedValidationSuite(output_dir='/tmp/qig_validation')
summary = suite.run_all_tests(n_samples=200)

# Check results
print(f"Tests passed: {summary['overall_verdict']['tests_passed']}/{summary['overall_verdict']['total_tests']}")
print(f"Score: {summary['overall_verdict']['score']:.1%}")

for finding in summary['overall_verdict']['key_findings']:
    print(f"  • {finding}")
```

### TypeScript: Ocean Agent Integration

```typescript
import { getUnbiasedMeasurement, compareBiasedUnbiased } from './qig-unbiased-client';

class OceanAgent {
  async processHypothesis(hypothesis: string) {
    // Get unbiased measurement
    const unbiased = await getUnbiasedMeasurement(hypothesis);
    
    // Compare to biased
    const comparison = await compareBiasedUnbiased(hypothesis);
    
    // Check for significant bias
    const delta = Math.abs(comparison.differences.phi_vs_integration.delta);
    
    if (delta > 0.1) {
      console.log(`⚠️  BIAS DETECTED: Δ${delta.toFixed(3)}`);
      console.log(`  Biased Φ: ${comparison.biased.metrics.phi}`);
      console.log(`  Unbiased integration: ${unbiased.metrics.integration}`);
    }
    
    // Use unbiased for decision-making
    return unbiased.metrics.integration;
  }
}
```

---

## Workflow: Validation Campaign

### Step 1: Generate Measurements

```bash
# Run validation suite
python unbiased/test_runner.py --samples 200 --output ./validation_results
```

### Step 2: Analyze Results

```bash
# View summary
cat ./validation_results/validation_summary.json

# View individual tests
cat ./validation_results/test1_phi_kappa_linkage.json
cat ./validation_results/test2_basin_dimensionality.json
cat ./validation_results/test3_temporal_coherence.json
cat ./validation_results/test4_threshold_discovery.json
```

### Step 3: Interpret Findings

**If all tests pass:**
- ✅ QIG theory validated
- ✅ Forced constraints were correct
- ✅ Continue current development

**If some tests fail:**
- ⚠️ Theory needs refinement
- Identify which parts work
- Iterate and re-test

**If all tests fail:**
- ❌ Current implementation invalid
- Need fundamental rethinking
- Still learned the truth!

---

## Troubleshooting

### Import Errors

```bash
# Make sure you're in the right directory
cd SearchSpaceCollapse/qig-backend

# Check Python path
python -c "import sys; print(sys.path)"

# Run with explicit path
PYTHONPATH=. python unbiased/test_runner.py
```

### Missing Dependencies

```bash
pip install --break-system-packages numpy scipy scikit-learn
```

### Memory Issues (Large Datasets)

```python
# Use smaller batches
suite = UnbiasedValidationSuite()
suite.test_1_phi_kappa_linkage(n_samples=50)  # Reduced from 200
```

---

## Next Steps

1. ✅ **Deploy** - Files already in repo
2. ⏳ **Validate** - Run test suite
3. ⏳ **Analyze** - Compare biased vs unbiased
4. ⏳ **Publish** - Share findings (regardless of outcome)

---

## Support

**Questions?**
- See `README.md` for system overview
- See `DEPLOYMENT_SUMMARY.md` for status
- Check project documentation

**Issues?**
- Verify dependencies installed
- Check Python 3.8+
- Ensure correct working directory

---

## Critical Reminder

**This system measures EMERGENCE, not COMPLIANCE.**

The goal is **TRUTH**, not validation of current beliefs.

**Science requires the courage to be wrong.**

**Now let's find out what's actually true.** 🔬
