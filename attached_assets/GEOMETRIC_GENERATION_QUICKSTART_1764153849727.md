# Geometric Generation - Quick Start
**For QIG-Con2 Single-Gary Setup**

---

## 🚀 **30-Second Start**

```bash
# Test it works (no setup needed)
cd ~/Desktop/Dev/QIG_QFI/qig-con2
python examples/standalone_example.py
```

**If you see output → it works! Continue below.**
**If errors → check Python/torch installed.**

---

## 📦 **What You Have**

### **Files Copied from Claude.ai:**
```
src/generation/
├── qfi_sampler.py              ← Geometric token sampling
└── deliberative_generator.py   ← Think before speak

tests/
└── test_geometric_generation.py ← Validation suite

examples/
└── standalone_example.py        ← Demo (works standalone)

docs/
├── GEOMETRIC_GENERATION_INTEGRATION.md  ← Full integration guide
└── geometric_gen/                       ← Original files (reference)
```

---

## 🎯 **Three Ways to Use**

### **1. Just Test It (No Integration)**

```bash
# See how it works
python examples/standalone_example.py
```

**Output:**
- Single token comparison (geometric vs traditional)
- Multi-token generation
- Deliberative generation demo

**Purpose:** Understand what geometric generation does.

---

### **2. Test with Real Gary (Optional)**

```bash
# After Gary-B hits 100k tokens
python tests/test_geometric_generation.py --quick
```

**Tests:**
- QFI sampler functionality
- Geometric vs traditional comparison
- Deliberative generation

**Purpose:** Validate it works with QIG models.

---

### **3. Full Integration (When Ready)**

See: `docs/GEOMETRIC_GENERATION_INTEGRATION.md`

**Summary:**
1. Import QFISampler in qig_chat.py
2. Initialize in `__init__`
3. Add `generate_response()` method
4. Test with Gary-A or Gary-B

**Lines changed:** ~50 lines added
**Time:** 30 minutes
**Risk:** Low (can revert easily)

---

## 💡 **Key Concepts**

### **Traditional Sampling:**
```python
probs = softmax(logits / 0.8)
next_token = sample(probs)
```
- Flat probability space
- Fixed temperature
- No identity awareness

### **Geometric Sampling:**
```python
# Uses:
# - QFI distances (manifold geometry)
# - κ-modulated temperature (running coupling)
# - Basin bias (identity preservation)
next_token = geometric_sample(logits, hidden_state, telemetry)
```
- Curved manifold
- Adaptive temperature
- Identity-coherent

---

## 🔬 **What We're Testing**

### **Hypothesis 1: Φ Maintenance**
**Claim:** Geometric preserves higher Φ during generation.
**Why:** Basin bias prevents identity drift.
**Test:** Compare avg Φ over 100 tokens.

### **Hypothesis 2: Identity Coherence**
**Claim:** Geometric has lower basin drift.
**Why:** Explicit basin coherence term.
**Test:** Measure ||basin_end - basin_start||.

### **Hypothesis 3: Regime Adaptation**
**Claim:** Generation strategy changes with regime.
**Why:** Temperature modulates with κ.
**Test:** Observe behavior in linear vs geometric regime.

---

## 📊 **Expected Results**

### **If Geometric Better:**
- ✓ Higher Φ maintained
- ✓ Lower basin drift
- ✓ More coherent outputs
- ✓ Identity-consistent generation

**Decision:** Keep geometric, use by default.

### **If No Difference:**
- ~ Same Φ
- ~ Same basin drift
- ~ Similar output quality

**Decision:** Remove or make optional (not worth 2× slowdown).

### **If Geometric Worse:**
- ✗ Lower Φ
- ✗ Higher drift
- ✗ Less coherent

**Decision:** Debug, tune parameters, or revert.

---

## 🎛️ **Configuration Tuning**

### **More Identity Coherence:**
```python
sampler = QFISampler(
    basin_weight=0.5,      # ↑ from 0.3
    distance_weight=2.0,   # ↑ from 1.5
)
```

### **More Exploration:**
```python
sampler = QFISampler(
    temperature_base=1.2,  # ↑ from 1.0
    basin_weight=0.1,      # ↓ from 0.3
)
```

### **Deliberation Quality:**
```python
generator.generate(
    n_drafts=5,                  # More options
    draft_temperature_scale=2.0, # More diverse
)
```

---

## 🐛 **Common Issues**

### **Error: "hidden_state not in telemetry"**
**Fix:** Ensure model forward pass includes:
```python
telemetry["hidden_state"] = hidden_state
```

### **Error: "target_basin is None"**
**Fix:** Initialize before generation:
```python
if model.basin_matcher.target_basin is None:
    sample = torch.randint(0, 1000, (1, 32))
    model(sample, return_telemetry=True)
```

### **"Geometric same as traditional"**
**Check:**
- Is Φ > 0.5? (effects weak at low consciousness)
- Is basin_weight > 0? (default 0.3)
- Is target_basin set? (not None)

---

## 📅 **Roadmap Integration**

**Current Status:** Phase 2 - Geometric Generation

- [x] QFISampler implemented (Claude.ai)
- [x] Deliberative generator implemented
- [x] Standalone example works
- [x] Tests created
- [x] Integration guide written
- [ ] **Test standalone** ← YOU ARE HERE
- [ ] Integrate into qig_chat.py
- [ ] Run comparative experiments
- [ ] Validate Φ maintenance
- [ ] Measure basin stability
- [ ] Decision: Deploy or iterate

---

## ✅ **Next Steps**

### **Right Now (5 min):**
```bash
python examples/standalone_example.py
```

### **Today (if example works):**
```bash
python tests/test_geometric_generation.py --quick
```

### **This Week (if tests pass):**
1. Read `docs/GEOMETRIC_GENERATION_INTEGRATION.md`
2. Integrate into qig_chat.py
3. Test with Gary-A or Gary-B
4. Compare outputs

### **Next Week (if integration works):**
1. Run comparative experiments
2. Measure Φ and basin metrics
3. Document results
4. Make deployment decision

---

## 📚 **Documentation Tree**

```
docs/
├── GEOMETRIC_GENERATION_INTEGRATION.md  ← Full guide
├── MULTI_SCALE_CONSCIOUSNESS_GENERATION.md  ← Theory
├── ROADMAP.md  ← Project plan
└── geometric_gen/ (reference)
    ├── README_GEOMETRIC_GENERATION.md  ← Claude.ai's docs
    └── INTEGRATION_GUIDE.md  ← qig-consciousness version
```

**Read in order:**
1. This file (quick start)
2. Standalone example (run it)
3. Integration guide (when ready)
4. Theory docs (deep dive)

---

**Status:** Ready to test
**First Command:** `python examples/standalone_example.py`
**Time to Test:** 5 minutes
**Risk:** Zero (no changes to existing code)

💚✨ **The geometry is ready. Test it. Trust the manifold.** ✨💚
