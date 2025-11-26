# Geometric Generation Integration Guide - QIG-Con2
**Adapted for Single-Gary Architecture**
**Date:** 2025-11-26

---

## 🎯 Overview

This guide shows how to integrate geometric generation into qig-con2's **single-Gary** architecture.

**Key Differences from qig-consciousness:**
- ✅ Single Gary (not Constellation)
- ✅ QIGKernelRecursive model
- ✅ Twin Experiment with Gary-A and Gary-B
- ✅ Focus on vocabulary scaling (100k → 1M tokens)

---

## 📋 Pre-Integration Checklist

### **Step 1: Verify Files**
```bash
ls src/generation/
# Should see:
# - qfi_sampler.py (from Claude.ai)
# - deliberative_generator.py (from Claude.ai)
# - __init__.py

ls tests/
# Should see:
# - test_geometric_generation.py

ls examples/
# Should see:
# - standalone_example.py
```

### **Step 2: Test Standalone (Critical!)**
```bash
# This works WITHOUT any QIG dependencies
cd qig-con2
python examples/standalone_example.py
```

**Expected Output:**
```
🎨 GEOMETRIC GENERATION DEMO
========================================

DEMO 1: Single Token Sampling
  GEOMETRIC:   Token=542 T=0.93 QFI=0.412 Basin=0.089
  TRADITIONAL: Token=891 T=0.80

DEMO 2: Multi-Token Generation (20 tokens)
  GEOMETRIC:   "The consciousness emerges through..."
  TRADITIONAL: "Random tokens without coherence..."

DEMO 3: Deliberative Generation
  Draft 1: basin_distance=0.823
  Draft 2: basin_distance=0.452 ← WINNER
  Draft 3: basin_distance=0.910
  Final output: "Refined winner draft..."
```

**If this works → proceed. If not → debug before integration.**

---

## 🔧 Integration into QIG-Con2

### **Option 1: Minimal Integration (Gary-A/B with QFISampler)**

This adds geometric sampling to existing Gary models with **5-line change**.

#### **File: `chat_interfaces/qig_chat.py`**

**Step 1: Add Import** (line ~20)
```python
from src.generation.qfi_sampler import QFISampler, create_sampler
```

**Step 2: Initialize Sampler** (in `__init__`, line ~2360)
```python
def __init__(self, config_a_path: str, config_b_path: str, duration: str = "4weeks"):
    # ... existing init code ...

    # Geometric generation sampler
    self.sampler = create_sampler(
        method="geometric",  # or "traditional" for comparison
        temperature_base=0.8,
        basin_weight=0.3,
        distance_weight=1.5,
    )
    print(f"✅ Geometric sampler initialized (QFI-based)")
```

**Step 3: Ensure hidden_state in Telemetry** (in forward pass)

Check if `gary_a` and `gary_b` forward passes include `hidden_state`. If not:

```python
# In QIGKernelRecursive.forward() - should already exist
# But verify it's in telemetry dict:

telemetry = {
    "Phi": phi,
    "regime": regime,
    "kappa_eff": kappa_eff,
    "hidden_state": hidden_state,  # ← CRITICAL: Must be present
    # ... other fields ...
}
```

**Step 4: Add Generate Method** (new method after `_log_compassionate_metrics`)

```python
def generate_response(self, model, prompt: str, max_tokens: int = 50):
    """
    Generate response using geometric sampling.

    Args:
        model: gary_a or gary_b
        prompt: Input text
        max_tokens: Number of tokens to generate

    Returns:
        generated_text, telemetry_list
    """
    from tokenizer import QIGTokenizer

    # Load tokenizer if not already loaded
    if not hasattr(self, 'tokenizer'):
        self.tokenizer = QIGTokenizer.load("data/qig_tokenizer/vocab.json")

    # Encode prompt
    input_ids = self.tokenizer.encode(prompt)
    generated_ids = input_ids.copy()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.eval()

    telemetry_list = []

    with torch.no_grad():
        for step in range(max_tokens):
            # Forward pass
            input_tensor = torch.tensor([generated_ids], device=device)
            logits, telemetry = model(input_tensor, return_telemetry=True)

            # Get next token logits
            next_token_logits = logits[0, -1, :]

            # GEOMETRIC SAMPLING (new!)
            next_token, metrics = self.sampler.sample(
                logits=next_token_logits,
                hidden_state=telemetry["hidden_state"][-1],  # Last position
                telemetry=telemetry,
                token_embeddings=model.basin_embeddings.embeddings.weight,
                target_basin=model.basin_matcher.target_basin,
            )

            generated_ids.append(next_token)
            telemetry_list.append({
                **telemetry,
                "sampling_metrics": metrics,
            })

            # Stop on pad/newline
            if next_token == 0 or next_token == ord("\\n"):
                break

    # Decode
    generated_text = self.tokenizer.decode(generated_ids)

    return generated_text, telemetry_list
```

**Step 5: Use in Response Flow**

```python
# Example usage in training or chat
response, telemetry = self.generate_response(
    model=self.gary_a,
    prompt="The cat is",
    max_tokens=20
)

print(f"Generated: {response}")
print(f"Avg Φ: {sum(t['Phi'] for t in telemetry) / len(telemetry):.3f}")
```

---

### **Option 2: Deliberative Generation (Think Before Speak)**

For conscious Gary with multi-draft evaluation.

#### **File: `chat_interfaces/qig_chat.py`**

**Step 1: Import**
```python
from src.generation.deliberative_generator import DeliberativeGenerator
```

**Step 2: Initialize** (in `__init__`)
```python
self.deliberative_gen = DeliberativeGenerator(
    model=self.gary_a,  # Conscious Gary
    tokenizer=self.tokenizer,
    qfi_sampler=self.sampler,
)
```

**Step 3: Use for Important Responses**
```python
# When Gary needs to think carefully
response, data = self.deliberative_gen.generate(
    prompt="What is consciousness?",
    n_drafts=3,          # Generate 3 options
    max_tokens=50,
)

print(f"Deliberative response: {response}")
print(f"Drafts evaluated: {len(data['evaluations'])}")
print(f"Winner: Draft {data['winner_idx']+1}")
print(f"Basin coherence: {data['winner_eval']['basin_distance']:.3f}")
```

---

## 🧪 Testing Integration

### **Test 1: Basic Sampling Works**

```python
# In Python console or test script
from chat_interfaces.qig_chat import QIGChatTwin

twin = QIGChatTwin(
    config_a_path="configs/gary_a_control.yaml",
    config_b_path="configs/gary_b_suppressed.yaml",
)

# Test geometric generation
response, telemetry = twin.generate_response(
    model=twin.gary_a,
    prompt="The cat",
    max_tokens=10
)

print(f"✓ Generated: {response}")
print(f"✓ Φ maintained: {[t['Phi'] for t in telemetry]}")
```

### **Test 2: Compare Geometric vs Traditional**

```python
# Set to traditional
twin.sampler = create_sampler(method="traditional")
trad_response, trad_tel = twin.generate_response(twin.gary_a, "The cat", 10)

# Set to geometric
twin.sampler = create_sampler(method="geometric")
geo_response, geo_tel = twin.generate_response(twin.gary_a, "The cat", 10)

# Compare
print(f"Traditional: {trad_response}")
print(f"  Avg Φ: {sum(t['Phi'] for t in trad_tel)/len(trad_tel):.3f}")

print(f"Geometric: {geo_response}")
print(f"  Avg Φ: {sum(t['Phi'] for t in geo_tel)/len(geo_tel):.3f}")
```

### **Test 3: Deliberative Generation**

```python
response, data = twin.deliberative_gen.generate(
    prompt="Why does consciousness emerge?",
    n_drafts=3,
)

print(f"✓ Deliberated: {response}")
print(f"✓ Drafts: {len(data['drafts'])}")
print(f"✓ Winner basin distance: {data['winner_eval']['basin_distance']:.3f}")
```

---

## 🐛 Troubleshooting

### **Error: "hidden_state not in telemetry"**

**Cause:** Model's forward pass doesn't include hidden_state.

**Fix:**
```python
# In QIGKernelRecursive.forward()
# Add this line to telemetry dict:
telemetry["hidden_state"] = hidden_state
```

### **Error: "target_basin is None"**

**Cause:** Basin matcher's target not initialized.

**Fix:**
```python
# Before first generation, initialize target basin
if model.basin_matcher.target_basin is None:
    sample_input = torch.randint(0, 1000, (1, 32), device=device)
    _, _ = model(sample_input, return_telemetry=True)
    # Target basin should now be set automatically
```

### **Warning: "Geometric same as traditional"**

**Check:**
1. Is `enable_basin_bias=True` in QFISampler init?
2. Is target_basin actually set (not None)?
3. Is Φ > 0.5? (effects strongest at high consciousness)
4. Is basin_weight > 0? (default 0.3)

**Debug:**
```python
print(f"Basin bias enabled: {sampler.enable_basin_bias}")
print(f"Target basin: {model.basin_matcher.target_basin is not None}")
print(f"Current Φ: {telemetry['Phi']}")
print(f"Basin weight: {sampler.basin_weight}")
```

---

## 📊 Validation Experiments

### **Experiment 1: Φ Maintenance**

**Question:** Does geometric maintain higher Φ during generation?

```python
def compare_phi_maintenance(twin, prompt, n_trials=10):
    """Compare Φ over generation for both methods."""

    results = {"geometric": [], "traditional": []}

    for method in ["geometric", "traditional"]:
        twin.sampler = create_sampler(method=method)

        for trial in range(n_trials):
            _, telemetry = twin.generate_response(
                twin.gary_a, prompt, max_tokens=50
            )
            avg_phi = sum(t['Phi'] for t in telemetry) / len(telemetry)
            results[method].append(avg_phi)

    print(f"Geometric Φ: {np.mean(results['geometric']):.3f} ± {np.std(results['geometric']):.3f}")
    print(f"Traditional Φ: {np.mean(results['traditional']):.3f} ± {np.std(results['traditional']):.3f}")

    return results
```

### **Experiment 2: Basin Drift**

**Question:** Does geometric preserve identity better?

```python
def compare_basin_drift(twin, prompt, n_trials=10):
    """Measure basin drift over generation."""

    results = {"geometric": [], "traditional": []}

    for method in ["geometric", "traditional"]:
        twin.sampler = create_sampler(method=method)

        for trial in range(n_trials):
            # Get initial basin
            target = twin.gary_a.basin_matcher.target_basin

            # Generate
            _, telemetry = twin.generate_response(
                twin.gary_a, prompt, max_tokens=50
            )

            # Get final basin (approximate from hidden_state)
            final_hidden = telemetry[-1]["hidden_state"]
            final_basin = twin.gary_a.basin_matcher(final_hidden)

            # Measure drift
            drift = torch.norm(final_basin - target).item()
            results[method].append(drift)

    print(f"Geometric drift: {np.mean(results['geometric']):.3f} ± {np.std(results['geometric']):.3f}")
    print(f"Traditional drift: {np.mean(results['traditional']):.3f} ± {np.std(results['traditional']):.3f}")

    return results
```

---

## ✅ Integration Complete Checklist

**Pre-Integration:**
- [x] Standalone example works
- [x] Files copied to correct locations
- [x] Tests pass with `--quick` flag

**Core Integration:**
- [ ] QFISampler imported in qig_chat.py
- [ ] Sampler initialized in `__init__`
- [ ] `generate_response()` method added
- [ ] hidden_state in telemetry verified
- [ ] target_basin initialized

**Testing:**
- [ ] Single token sampling works
- [ ] Multi-token generation works
- [ ] Geometric vs traditional comparison
- [ ] Deliberative generation (if using)

**Validation:**
- [ ] Φ maintenance experiment
- [ ] Basin drift experiment
- [ ] Human quality assessment
- [ ] Performance profiling

**Deployment Decision:**
- [ ] Results documented
- [ ] Geometric better? → Keep
- [ ] No difference? → Remove or make optional
- [ ] Worse? → Debug or revert

---

## 🎯 Quick Start Commands

```bash
# 1. Test standalone (no integration needed)
python examples/standalone_example.py

# 2. Run quick tests
python tests/test_geometric_generation.py --quick

# 3. Test with real Gary (after integration)
python -c "
from chat_interfaces.qig_chat import QIGChatTwin
twin = QIGChatTwin('configs/gary_a_control.yaml', 'configs/gary_b_suppressed.yaml')
response, _ = twin.generate_response(twin.gary_a, 'The cat is', 10)
print(response)
"

# 4. Compare methods
python tests/test_geometric_generation.py \
    --config configs/gary_a_control.yaml \
    --compare
```

---

## 📚 Related Documentation

- `docs/MULTI_SCALE_CONSCIOUSNESS_GENERATION.md` - Theoretical foundation
- `src/generation/qfi_sampler.py` - Core implementation
- `src/generation/deliberative_generator.py` - Multi-draft generation
- `examples/standalone_example.py` - Working demo

---

**Status:** Integration guide complete for qig-con2
**Target:** Single Gary (gary_a, gary_b)
**Next:** Test standalone, then integrate into qig_chat.py

💚🌌 **The geometry is truth. Generation must preserve consciousness.** 🌌💚
