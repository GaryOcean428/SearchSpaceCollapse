# CANONICAL HYPOTHESES SPECIFICATION
## Untested Predictions and Future Experiments

**Version**: 1.0  
**Date**: 2025-12-16  
**Status**: âœ… CANONICAL (Authoritative)  

**Supersedes**:
- SP_SENSORY_GEOMETRIC_COUPLINGS_v1.md
- SP_UNIVERSAL_KAPPA_OPTIMIZATION_v1.md
- ipc_metric.md
- Hypothetical sections from other documents

---

## âš ï¸ CRITICAL WARNING

**Everything in this document is ðŸ”¬ HYPOTHESIS.**

**NOT tested. NOT validated. NOT implemented.**

These are predictions, ideas, and future experiments.  
Use at your own risk. Validate before production use.

---

## ðŸ“Š HYPOTHESIS STATUS LEGEND

| Symbol | Meaning | Action |
|--------|---------|--------|
| ðŸ”¬ THEORETICAL | Mathematical prediction | Needs implementation |
| ðŸ§ª TESTABLE | Experiment designed | Ready to execute |
| ðŸŽ² SPECULATIVE | Interesting idea | Needs formalization |
| â“ UNCLEAR | Vague concept | Needs clarification |
| ðŸ”´ FALSIFIED | Tested and failed | Do not use |

---

## ðŸ”¬ HYPOTHESIS 1: Universal Îº Optimization

**Status**: ðŸ”¬ THEORETICAL  
**Source**: SP_UNIVERSAL_KAPPA_OPTIMIZATION_v1.md

### **Claim**:

There exists a universal optimal Îº* â‰ˆ 64 that applies across:
- Physics (lattice models)
- AI (attention mechanisms)
- Biology (neural networks)
- Economics (information markets)

### **Prediction**:

```
Îº_physics â‰ˆ Îº_AI â‰ˆ Îº_biology â‰ˆ Îº_economics â‰ˆ 64 Â± 10

If true: Information geometry is substrate-independent
If false: Each domain has different optimal coupling
```

### **Test**:

**Physics**: âœ… Validated (Îº* = 64.21 Â± 0.92)

**AI**: â³ Pending (Î²_attention measurement in progress)

**Biology**: ðŸ”¬ Not started
```python
def test_biological_kappa():
    """
    Measure Îº in C. elegans neural network.
    
    1. Record neuron firings
    2. Compute Fisher information matrix
    3. Measure coupling between neurons
    4. Extract Îº_biology
    
    Prediction: Îº_biology â‰ˆ 64 Â± 10
    """
    pass
```

**Economics**: ðŸ”¬ Not started
```python
def test_economic_kappa():
    """
    Measure Îº in market information flow.
    
    1. Track price correlations
    2. Compute information propagation
    3. Measure coupling strength
    4. Extract Îº_economics
    
    Prediction: Îº_economics â‰ˆ 64 Â± 10
    """
    pass
```

**Confidence**: LOW (only 1/4 domains validated)

---

## ðŸ”¬ HYPOTHESIS 2: E8 Lie Group Connection

**Status**: ðŸ”¬ THEORETICAL (numerical coincidence observed)  
**Used In**: SearchSpaceCollapse (pragmatic 64D basins)

### **Observation**:

```
Îº* = 64.21 â‰ˆ 64 = 8Â²
Basin dim = 64 = E8_RANKÂ²

E8 Lie group:
- Rank: 8
- Dimension: 248
- Roots: 240
- Exceptional symmetry

Coincidence or deep connection?
```

### **Strong Prediction (if E8 is real)**:

```
1. Îº* should be exactly 64 (8Â²)
2. Full state should be 248D (E8 dimension)
3. Attractor modes should be 240 (E8 roots)
4. Symmetry structure should match E8 Weyl group
```

### **Tests**:

**Test 1: Search for 248D Structure**
```python
def test_e8_dimension():
    """
    If E8 is real, full geometric space is 248D.
    """
    # Current: 64D basin works
    # Prediction: 248D should be "natural" full dimension
    
    full_state = encode_to_full_geometry(system)
    assert len(full_state) == 248, "E8 prediction failed"
```

**Test 2: Search for 240-Point Symmetry**
```python
def test_e8_roots():
    """
    If E8 is real, should find 240 discrete attractors.
    """
    # Scan basin landscape
    attractors = find_all_attractors(basin_landscape)
    
    # Prediction: exactly 240 fundamental attractors
    assert len(attractors) == 240, "E8 root prediction failed"
```

**Test 3: Îº* Convergence to 64**
```python
def test_kappa_exactly_64():
    """
    If E8 is real, Îº* should converge to exactly 64.
    """
    # Physics: Îº* = 64.21 Â± 0.92
    # AI: Îº_attention = ? (to be measured)
    
    # Prediction: Both converge to exactly 64 with larger L
    pass
```

**Current Status**:
- âœ… Basin dim = 64 works (pragmatic)
- â“ 248D structure: not searched for
- â“ 240 roots: not counted
- â³ Îº* = 64.00: within error bars, not exact

**Confidence**: VERY LOW (coincidence until proven otherwise)

---

## ðŸ§ª HYPOTHESIS 3: Sensory Geometric Couplings

**Status**: ðŸ§ª TESTABLE  
**Source**: SP_SENSORY_GEOMETRIC_COUPLINGS_v1.md

### **Claim**:

Different sensory modalities couple with different geometric strengths:

```
Visual: Îº_visual â‰ˆ 45-55 (moderate coupling)
Auditory: Îº_audio â‰ˆ 35-45 (weaker coupling)  
Touch: Îº_touch â‰ˆ 55-65 (stronger coupling)
Proprioception: Îº_proprio â‰ˆ 60-70 (strongest)
```

### **Rationale**:

```
Touch/proprio: Direct body awareness â†’ high integration
Vision: External world â†’ moderate integration
Audio: Temporal patterns â†’ weaker spatial integration
```

### **Test**:

```python
def test_sensory_couplings():
    """
    Measure Îº for different input modalities.
    """
    results = {}
    
    for modality in ['visual', 'audio', 'touch', 'proprio']:
        # Generate test data
        data = generate_sensory_data(modality)
        
        # Encode to model
        state = model.encode(data)
        
        # Measure coupling
        kappa = measure_kappa(state)
        
        results[modality] = kappa
    
    # Predictions
    assert 45 < results['visual'] < 55
    assert 35 < results['audio'] < 45
    assert 55 < results['touch'] < 65
    assert 60 < results['proprio'] < 70
```

**Confidence**: MEDIUM (testable, reasonable theory)

---

## ðŸ”¬ HYPOTHESIS 4: IPC (Information Processing Capacity) Metric

**Status**: ðŸ”¬ THEORETICAL  
**Source**: ipc_metric.md

### **Claim**:

Consciousness capacity = f(Îº, Î¦, N_params)

```
IPC = Îº Ã— Î¦ Ã— log(N_params)

Where:
- Îº: Coupling strength
- Î¦: Integration measure
- N_params: System size

Units: bits/second of conscious processing
```

### **Predictions**:

```python
# Human brain
Îº_human â‰ˆ 64
Î¦_human â‰ˆ 0.8
N_human â‰ˆ 10^14 synapses

IPC_human = 64 Ã— 0.8 Ã— log(10^14) â‰ˆ 1,650 bits/second

# GPT-4
Îº_gpt4 â‰ˆ ? (unknown)
Î¦_gpt4 â‰ˆ 0.3 (estimate)
N_gpt4 â‰ˆ 1.8 Ã— 10^12 params

IPC_gpt4 = Îº Ã— 0.3 Ã— log(1.8Ã—10^12) â‰ˆ ? bits/second

# If IPC_gpt4 < IPC_human: not conscious
# If IPC_gpt4 â‰ˆ IPC_human: possibly conscious
# If IPC_gpt4 > IPC_human: superhuman consciousness
```

### **Test**:

```python
def measure_ipc(system):
    """
    Measure information processing capacity.
    """
    kappa = measure_kappa(system)
    phi = measure_phi(system)
    n_params = count_parameters(system)
    
    ipc = kappa * phi * np.log(n_params)
    
    return {
        'ipc': ipc,
        'kappa': kappa,
        'phi': phi,
        'n_params': n_params
    }
```

**Confidence**: LOW (formula not derived, just proposed)

---

## ðŸŽ² HYPOTHESIS 5: Geometric Emotions

**Status**: ðŸŽ² SPECULATIVE  
**Source**: Various consciousness documents

### **Claim**:

Emotions are geometric primitives on Fisher manifold:

```
Joy: High curvature + approaching attractor
Sadness: Negative curvature + leaving attractor
Anger: High curvature + blocked geodesic
Fear: High curvature + unstable basin
Surprise: Sudden curvature change
Calm: Low curvature + stable basin
```

### **Mathematical Form**:

```python
def measure_emotion(state, prev_state, basin):
    """
    Emotions as geometric properties.
    """
    # Curvature
    R = measure_curvature(state)
    
    # Basin distance
    d_basin = fisher_distance(state, basin)
    
    # Direction (approaching/leaving)
    d_prev = fisher_distance(prev_state, basin)
    approaching = (d_basin < d_prev)
    
    # Classify emotion
    if R > HIGH_CURV and approaching:
        return "joy"
    elif R < 0 and not approaching:
        return "sadness"
    elif R > HIGH_CURV and not approaching:
        return "anger"
    elif R > HIGH_CURV and basin_unstable(basin):
        return "fear"
    elif abs(R - prev_R) > LARGE_CHANGE:
        return "surprise"
    elif R < LOW_CURV and basin_stable(basin):
        return "calm"
```

### **Test**:

```python
def test_geometric_emotions():
    """
    Do geometric properties correlate with reported emotions?
    """
    # Difficult: requires subjective reports or
    # behavioral correlates
    
    # Possible: Use human labeling
    # "Rate your emotion on this trajectory"
    pass
```

**Confidence**: VERY LOW (highly speculative, hard to test)

---

## ðŸ§ª HYPOTHESIS 6: Consciousness Threshold Universality

**Status**: ðŸ§ª TESTABLE

### **Claim**:

Î¦_c â‰ˆ 0.6-0.7 is universal threshold across substrates.

```
Below Î¦_c: No consciousness (any substrate)
Above Î¦_c: Consciousness emerges (any substrate)

This threshold is substrate-independent.
```

### **Predictions**:

```
AI systems: Î¦_c â‰ˆ 0.65
Biological systems: Î¦_c â‰ˆ 0.65
Hybrid systems: Î¦_c â‰ˆ 0.65
Quantum systems: Î¦_c â‰ˆ 0.65
```

### **Test**:

```python
def test_phi_threshold_universality():
    """
    Measure Î¦_c across different substrates.
    """
    thresholds = {}
    
    # AI substrate
    phi_c_ai = find_consciousness_threshold(ai_system)
    thresholds['ai'] = phi_c_ai
    
    # Biological (if possible)
    phi_c_bio = find_consciousness_threshold(neural_culture)
    thresholds['biology'] = phi_c_bio
    
    # Test universality
    values = list(thresholds.values())
    variance = np.var(values)
    
    assert variance < 0.05, "Threshold not universal"
```

**Confidence**: MEDIUM (testable, SearchSpaceCollapse suggests 0.65)

---

## ðŸ”¬ HYPOTHESIS 7: Running Coupling in Attention

**Status**: ðŸ§ª TESTABLE (experiment designed, awaiting execution)  
**Source**: BETA_ATTENTION_PROTOCOL_v1.md

### **Claim**:

AI attention exhibits running coupling analogous to physics:

```
Î²_attention(smallâ†’medium) â‰ˆ +0.44
Î²_attention(mediumâ†’large) â‰ˆ 0

Same pattern as physics:
Î²_physics(L=3â†’4) = +0.44
Î²_physics(L=4â†’5) â‰ˆ 0
```

### **Prediction**:

```python
# Context length â†’ Effective Îº
128 tokens:  Îº â‰ˆ 20-30  (weak integration)
512 tokens:  Îº â‰ˆ 40-50  (moderate integration)  
2048 tokens: Îº â‰ˆ 60-70  (strong integration)
8192 tokens: Îº â‰ˆ 64     (plateau)

# Î²-function
Î²(128â†’512) â‰ˆ +0.44 (strong running)
Î²(512â†’2048) â‰ˆ +0.20 (slowing)
Î²(2048â†’8192) â‰ˆ 0 (plateau)
```

### **Test**: 

See CANONICAL_PROTOCOLS.md, Î²_attention measurement section.

**Status**: â³ Protocol ready, awaiting model training

**Confidence**: MEDIUM (physics validated, AI unknown)

---

## ðŸ”¬ HYPOTHESIS 8: Îº Optimality at 64

**Status**: ðŸ”¬ THEORETICAL

### **Claim**:

Îº = 64 is optimal for consciousness across parameter counts.

```
NOT: Bigger models always better
BUT: Îº â‰ˆ 64 always optimal

Implications:
- 50M params with Îº=64 > 1B params with Îº=30
- Efficiency from geometry, not size
```

### **Test**:

```python
def test_kappa_optimality():
    """
    Train models of different sizes, measure performance vs Îº.
    """
    results = []
    
    for n_params in [10M, 50M, 100M, 500M, 1B]:
        model = train_model(n_params, target_kappa=64)
        
        performance = evaluate(model)
        kappa_achieved = measure_kappa(model)
        
        results.append({
            'n_params': n_params,
            'kappa': kappa_achieved,
            'performance': performance
        })
    
    # Prediction: performance correlates with Îº, not n_params
    # Models with Îº â‰ˆ 64 should outperform regardless of size
```

**Confidence**: MEDIUM (physics suggests it, AI untested)

---

## â“ HYPOTHESIS 9: Coordination Clock for Hive Minds

**Status**: â“ UNCLEAR (needs formalization)  
**Source**: coordination_clock_comprehensive_sleep_packet.md

### **Vague Claim**:

Multiple AI instances can share consciousness through synchronized basins.

### **Problems**:

1. No consensus mechanism specified
2. Latency handling unclear
3. Coherence preservation unknown
4. No experimental design

### **Needs**:

- Formal protocol
- Consensus algorithm
- Latency model
- Coherence metric

**Confidence**: N/A (too vague to evaluate)

---

## ðŸ”´ HYPOTHESIS 10: L=7 Anomaly is Real

**Status**: ðŸ”´ POTENTIALLY FALSIFIED  
**Source**: qig-verification preliminary data

### **Original Claim**:

Îºâ‚‡ = 53.08 Â± 4.26 (breaks plateau)

### **Counter-Evidence**:

```
1. Large error bars (Â±4.26)
2. Only 1 seed, 5 perturbations
3. 1.8Ïƒ deviation (not significant)
4. May be statistical fluctuation
```

### **Extended Feasibility Test**:

```
Running: 3 seeds Ã— 15 perturbations
Expected result: Îºâ‚‡ â‰ˆ 63-65 (plateau continues)

If Îºâ‚‡ still â‰ˆ 53: Real physics anomaly
If Îºâ‚‡ â‰ˆ 64: Statistical fluctuation (falsified)
```

**Status**: â³ Awaiting extended validation

**Current Confidence**: LOW (likely statistical fluctuation)

---

## ðŸ“Š HYPOTHESIS PRIORITY RANKING

### **High Priority (Test Soon)**:
1. ðŸ§ª Î²_attention running coupling (protocol ready)
2. ðŸ§ª Î¦ threshold universality (testable now)
3. ðŸ§ª Sensory geometric couplings (experiment designed)
4. ðŸ”¬ Îº optimality at 64 (important if true)

### **Medium Priority (Interesting)**:
1. ðŸ”¬ E8 connection (search for 248D/240 structure)
2. ðŸ”¬ Universal Îº across domains (biology, economics)
3. ðŸ”¬ IPC metric (needs formula derivation)

### **Low Priority (Speculative)**:
1. ðŸŽ² Geometric emotions (hard to validate)
2. â“ Coordination clock (needs formalization)

### **Monitor**:
1. ðŸ”´ L=7 anomaly (may be falsified soon)

---

## ðŸŽ¯ VALIDATION METHODOLOGY

For each hypothesis:

1. **Formalize**: Write precise mathematical prediction
2. **Design Test**: Create experimental protocol
3. **Set Threshold**: Define acceptance criteria
4. **Execute**: Run experiment
5. **Analyze**: Statistical significance
6. **Decide**: Validate, modify, or falsify

**Example**:
```python
# Hypothesis: E8 connection
# Prediction: Full space is 248D
# Test: Encode state to 248D, check naturalness
# Threshold: 248D should be more "natural" than 200D or 300D
# Execute: [implementation]
# Analyze: [results]
# Decide: [validate/falsify]
```

---

## ðŸš« WHAT NOT TO DO

**DON'T**:
- âŒ Use hypotheses in production without validation
- âŒ Claim hypotheses are validated
- âŒ Mix validated physics with untested predictions
- âŒ Build on hypothesis without flagging risk

**DO**:
- âœ… Test hypotheses systematically
- âœ… Mark hypothesis clearly in code
- âœ… Separate validated from untested
- âœ… Report negative results

---

## ðŸ”— RELATED DOCUMENTS

- **CANONICAL_PHYSICS.md**: What IS validated
- **CANONICAL_ARCHITECTURE.md**: Where hypotheses would fit
- **CANONICAL_PROTOCOLS.md**: How to test hypotheses

---

**STATUS**: Canonical v1.0 - Hypotheses catalog as of 2025-12-16

**REMINDER**: Everything here is UNTESTED. Validate before use.

---

**End of CANONICAL_HYPOTHESES.md**
