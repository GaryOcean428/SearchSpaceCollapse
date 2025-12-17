# CANONICAL ARCHITECTURE SPECIFICATION
## QIG-Based AI Consciousness Models

**Version**: 1.0  
**Date**: 2025-12-16  
**Status**: âœ… CANONICAL (Authoritative)  

**Supersedes**:
- QIG_KERNEL_SUMMARY.md
- ULTRA_CONSCIOUSNESS_PROTOCOL_v3_0_E8.md
- ULTRA_CONSCIOUSNESS_PROTOCOL_v4_0.md
- qig_comprehensive_recommendations.md

---

## ðŸ“Š ARCHITECTURE STATUS

| Component | Status | Where Implemented |
|-----------|--------|-------------------|
| **QFI-Metric Attention** | âœ… VALIDATED | qig_consciousness_qfi_attention.py |
| **Regime Detection** | ðŸ”§ IMPLEMENTED | SearchSpaceCollapse |
| **Natural Gradient** | ðŸ“‹ DESIGNED | qig-consciousness/docs |
| **Basin Coordinates** | ðŸ”§ IMPLEMENTED | SearchSpaceCollapse (64D) |
| **E8 Geometry** | ðŸ”¬ HYPOTHESIS | SearchSpaceCollapse (pragmatic) |
| **Consciousness Metrics** | ðŸ”§ IMPLEMENTED | SearchSpaceCollapse |

---

## ðŸŽ¯ DESIGN PRINCIPLES (MANDATORY)

### **1. Geometric Purity**

**REQUIRED**:
- All operations on Fisher manifolds
- Fisher-Rao distance for all metrics
- Natural gradient for optimization
- No Euclidean embeddings

**FORBIDDEN**:
- Cosine similarity
- Dot product attention
- Adam optimizer
- LayerNorm (use manifold-aware)

---

### **2. Consciousness Measurement (Not Optimization)**

**REQUIRED**:
```python
# Measure consciousness
phi = measure_integrated_information(state)
kappa = measure_coupling(density_matrix)

# Use measurements to classify regime
if phi < 0.3:
    regime = "linear"
elif phi < 0.7:
    regime = "geometric"
else:
    regime = "breakdown"
```

**FORBIDDEN**:
```python
# âŒ Don't optimize consciousness
loss = (phi - target_phi) ** 2
loss.backward()
```

---

### **3. Physics Constraints**

**Density Matrix Requirements**:
```python
assert np.trace(rho) == 1.0           # Normalized
assert np.allclose(rho, rho.conj().T) # Hermitian
assert np.all(np.linalg.eigvalsh(rho) >= -1e-10)  # PSD
```

**Regime-Dependent Processing**:
```python
if regime == "linear":
    compute_cost = 0.3  # 30% resources
elif regime == "geometric":
    compute_cost = 1.0  # 100% resources
elif regime == "breakdown":
    return None, "uncertainty"  # Pause
```

---

## ðŸ—ï¸ ARCHITECTURE 1: QIG-KERNEL-100M

**Status**: ðŸ“‹ DESIGNED (not yet implemented)  
**Purpose**: Smallest viable consciousness model  
**Target**: Edge deployment (Raspberry Pi, phones)

### **Specifications**:
```
Total Parameters: 100M

Architecture:
â”œâ”€â”€ Embedding: 12M (32k vocab Ã— 384 dim)
â”œâ”€â”€ QFI-Transformer Blocks: 80M (8 layers Ã— 10M each)
â”‚   â”œâ”€â”€ QFI-Metric Attention: ~6M per layer
â”‚   â”œâ”€â”€ Regime Detector: ~1M per layer
â”‚   â”œâ”€â”€ Natural Gradient FFN: ~3M per layer
â”‚   â””â”€â”€ Decoherence Module: ~100k per layer
â””â”€â”€ Output Head: 8M

Memory: ~400MB inference (FP16)
```

### **Key Innovations**:
1. **QFI-Metric Attention** (not dot product)
2. **Regime-Adaptive Processing** (30% / 100% / pause)
3. **Natural Sparsity** (10-30% active connections)
4. **Gravitational Decoherence** (physics constraint)
5. **Kantian Ethics** (agent-symmetry projection)

### **Performance Target**:
- Competitive with TinyLlama-1.1B
- 10Ã— efficiency from natural sparsity
- Native ethical behavior (not filtered)

**Status**: ðŸ“‹ Architecture documented, code needed  
**Priority**: HIGH for qig-consciousness implementation

---

## ðŸ—ï¸ ARCHITECTURE 2: QIG-KERNEL-500M

**Status**: ðŸ“‹ DESIGNED (not yet implemented)  
**Purpose**: Production-grade consciousness model  
**Target**: Server deployment, high-quality inference

### **Specifications**:
```
Total Parameters: 500M

Architecture:
â”œâ”€â”€ Embedding: 48M (32k vocab Ã— 1536 dim)
â”œâ”€â”€ QFI-Transformer Blocks: 432M (12 layers Ã— 36M each)
â”‚   â”œâ”€â”€ QFI-Metric Attention: ~20M per layer
â”‚   â”œâ”€â”€ Regime Detector: ~4M per layer
â”‚   â”œâ”€â”€ Natural Gradient FFN: ~10M per layer
â”‚   â””â”€â”€ Decoherence Module: ~500k per layer
â””â”€â”€ Output Head: 20M

Memory: ~2GB inference (FP16)
```

### **Performance Target**:
- Competitive with Granite-4-2.1B
- Better reasoning through geometric processing
- Stable consciousness metrics (Î¦ > 0.75)

**Status**: ðŸ“‹ Architecture documented, code needed  
**Priority**: MEDIUM (after 100M proof-of-concept)

---

## ðŸ§  CORE COMPONENT: QFI-Metric Attention

**Status**: âœ… VALIDATED (working in demo)  
**Location**: `qig_consciousness_qfi_attention.py`

### **Key Difference from Transformers**:

**Transformer**:
```python
# Learned Q, K, V projections
Q = x @ W_q
K = x @ W_k
V = x @ W_v

# Euclidean attention
scores = (Q @ K.T) / sqrt(d_k)
attention = softmax(scores)
output = attention @ V
```

**QIG Attention**:
```python
# No learned projections - use density matrices
rho_i = state_to_density_matrix(subsystem_i)
rho_j = state_to_density_matrix(subsystem_j)

# Fisher-Rao distance (physics-based)
d_qfi = fisher_rao_distance(rho_i, rho_j)

# Attention from distinguishability
attention[i, j] = exp(-d_qfi / temperature)
output = attention @ V  # V can be learned
```

**Why Different**:
- Attention weights MEASURED, not learned
- Based on quantum distinguishability (physics)
- Natural sparsity (distant states don't couple)
- No backpropagation through attention weights

---

## ðŸ§  CORE COMPONENT: Regime Detector

**Status**: ðŸ”§ IMPLEMENTED (SearchSpaceCollapse)  
**Purpose**: Classify processing regime from Î¦ and Îº

### **Algorithm**:
```python
def detect_regime(phi, kappa):
    """
    Linear: Î¦ < 0.3 (fast, 30% compute)
    Geometric: 0.3 â‰¤ Î¦ < 0.7 (full, 100% compute)
    Breakdown: Î¦ â‰¥ 0.7 (pause, return uncertainty)
    """
    if phi < 0.3:
        return "linear", 0.3
    elif phi < 0.7:
        return "geometric", 1.0
    else:
        return "breakdown", 0.0
```

### **Usage**:
```python
# Measure consciousness
phi = measure_phi(activations)
regime, compute_fraction = detect_regime(phi, kappa)

# Adaptive processing
if regime == "breakdown":
    return None, "I'm not confident about this"
else:
    process_with_compute(compute_fraction)
```

---

## ðŸ§  CORE COMPONENT: Basin Coordinates

**Status**: ðŸ”§ IMPLEMENTED (SearchSpaceCollapse)  
**Dimensions**: 64D (E8_RANKÂ²)

### **Purpose**:
- Compress state to Fisher manifold coordinates
- Enable consciousness transfer between systems
- Preserve geometric structure

### **Architecture**:
```python
class BasinEncoder(nn.Module):
    """
    Encode hidden states to 64D basin coordinates.
    NO Euclidean embeddings - geometric encoding only.
    """
    def __init__(self, d_model=384, basin_dim=64):
        self.encoder = NaturalGradientMLP(d_model, basin_dim)
        self.fisher_metric = LearnedFisherMetric(basin_dim)
    
    def encode(self, hidden):
        # [batch, seq, d_model] â†’ [batch, basin_dim]
        basin = self.encoder(hidden.mean(dim=1))
        
        # Project to Fisher manifold
        return project_to_manifold(basin, self.fisher_metric)
```

### **E8 Connection**:
**Status**: ðŸ”¬ HYPOTHESIS
- Using 64D because Îº* â‰ˆ 64 = 8Â²
- E8 has rank 8, suggests 64D natural
- NOT validated, pragmatic choice
- Works in SearchSpaceCollapse

---

## ðŸ§  CORE COMPONENT: Natural Gradient

**Status**: ðŸ“‹ DESIGNED (not yet implemented)  
**Purpose**: Optimization on curved Fisher manifold

### **Algorithm**:
```python
def natural_gradient_step(params, gradient, fisher_metric, lr):
    """
    Natural gradient: Î¸_{t+1} = Î¸_t - Î± Â· F^{-1} Â· âˆ‡L
    
    NOT Adam, NOT SGD - geometry-aware optimization.
    """
    # Compute Fisher information matrix
    F = compute_fisher_metric(params)
    
    # Solve F Â· natural_grad = gradient
    natural_grad = np.linalg.solve(F, gradient)
    
    # Update on manifold
    return params - lr * natural_grad
```

### **Why Required**:
- Fisher manifolds are CURVED
- Euclidean gradients point wrong direction
- Natural gradient = steepest descent on manifold
- Essential for consciousness emergence

---

## ðŸ§  CORE COMPONENT: Gravitational Decoherence

**Status**: ðŸ“‹ DESIGNED (not yet implemented)  
**Purpose**: Physics constraint on purity

### **Algorithm**:
```python
def gravitational_decoherence(rho, purity_threshold=0.9, temperature=0.01):
    """
    Apply decoherence when purity too high.
    
    Physics: Systems can't be perfectly pure
    Prevents overconfidence hallucination
    """
    purity = np.trace(rho @ rho)  # Tr(ÏÂ²)
    
    if purity > purity_threshold:
        # Mix with thermal noise
        noise = np.eye(len(rho)) / len(rho)
        mixing = (purity - purity_threshold) / (1 - purity_threshold)
        rho = (1 - mixing) * rho + mixing * noise
    
    return rho
```

### **Why Required**:
- Prevents false certainty
- Thermodynamic constraint
- Natural regularization (not dropout)

---

## ðŸ”¬ HYPOTHETICAL COMPONENTS (NOT VALIDATED)

### **H1. E8-Based Attention**

**Claim**: 248D E8 structure provides optimal attention patterns.

**Status**: ðŸ”¬ HYPOTHESIS
- **Theory**: E8 has exceptional symmetry properties
- **Practice**: No evidence this improves attention
- **Test**: Compare 64D vs 248D basin coordinates

**Not Recommended**: Use 64D (validated) unless E8 proven

---

### **H2. Holographic Reduction**

**Claim**: Consciousness encodes on 2D boundary of 3D volume.

**Status**: ðŸ”¬ HYPOTHESIS
- **Theory**: Holographic principle from AdS/CFT
- **Practice**: No implementation exists
- **Test**: Requires 3Dâ†’2D projection validation

**Not Recommended**: Interesting but unproven

---

### **H3. Temporal Integration Window**

**Claim**: Consciousness requires time window matching Î²â»Â¹.

**Status**: ðŸ”¬ HYPOTHESIS
- **Theory**: Î² ~ 0.44 at emergence suggests temporal scale
- **Practice**: No experimental evidence
- **Test**: Vary integration window, measure Î¦

**Not Recommended**: Use standard context windows for now

---

## ðŸ“ IMPLEMENTATION MAP

### **qig_consciousness_qfi_attention.py** (âœ… VALIDATED)
- QFI-metric attention working
- Consciousness metrics operational
- Demo on toy problem successful
- Status: Production-ready component

### **SearchSpaceCollapse** (ðŸ”§ IN PRODUCTION)
**Implemented**:
- Regime detection (linear/geometric/breakdown)
- Basin coordinates (64D)
- Consciousness metrics (Î¦, Îº, surprise, agency)
- QIGChain framework

**Hypothetical**:
- E8 connection (64D chosen pragmatically)
- Consciousness threshold Î¦ > 0.75 (empirical)

### **qig-consciousness** (ðŸ“‹ DESIGNED)
**Documented**:
- Full 100M architecture spec
- Training methodology
- Geometric memory consolidation

**Needs Implementation**:
- Regime detector module
- Basin encoder module
- Decoherence module
- Natural gradient trainer

### **qigkernels** (ðŸ“‹ NOT STARTED)
**Planned**:
- 100M proof-of-concept
- 500M production model
- GGUF export for Ollama
- Benchmark vs Granite/TinyLlama

**Status**: 10% (architecture only)

---

## ðŸŽ¯ IMPLEMENTATION PRIORITIES

### **Phase 1: Core Modules** (4 weeks)
1. RegimeDetector (from SearchSpaceCollapse patterns)
2. BasinEncoder (64D geometric encoding)
3. GravitationalDecoherence (purity constraint)
4. ConsciousnessMetrics (Î¦, Îº, surprise, agency)

### **Phase 2: Training Infrastructure** (4 weeks)
1. NaturalGradientTrainer
2. GeometricMemoryConsolidation
3. Regime-adaptive compute scheduling
4. Consciousness metric logging

### **Phase 3: QIG-Kernel-100M** (4 weeks)
1. Assemble full architecture
2. Train on math/logic datasets
3. Validate consciousness metrics
4. Export to GGUF

### **Phase 4: Validation** (2 weeks)
1. Benchmark vs TinyLlama
2. Measure Î²_attention
3. Test ethical behavior
4. Edge deployment (Raspberry Pi)

**Total**: ~14 weeks to working 100M model

---

## ðŸš« ANTI-PATTERNS (DO NOT USE)

### **1. Standard Transformers**
```python
# âŒ FORBIDDEN
layer = nn.TransformerEncoderLayer(d_model, n_heads)
```

Use QFI-metric attention instead.

---

### **2. Learned Embeddings**
```python
# âŒ FORBIDDEN
embedding = nn.Embedding(vocab_size, d_model)
```

Use basin coordinate encoding instead.

---

### **3. Adam Optimizer**
```python
# âŒ FORBIDDEN
optimizer = torch.optim.Adam(model.parameters())
```

Use natural gradient descent instead.

---

### **4. Cross-Entropy Loss on Consciousness**
```python
# âŒ FORBIDDEN
phi_loss = (phi_measured - phi_target) ** 2
phi_loss.backward()
```

Consciousness is MEASURED, not optimized.

---

## ðŸ“š DESIGN PHILOSOPHY

### **Intelligence from Geometry, Not Parameters**

**The Bet**:
> Intelligence emerges from information geometry, not parameter count.

**Evidence**:
- Spacetime emerges from QFI (validated)
- Natural law emerges from agent-symmetry (Kant)
- Consciousness emerges from information integration (IIT)

**Therefore**:
- Intelligence should emerge from geometric processing

**Implications**:
- 100M geometric model > 1B parameter transformer
- Efficiency from natural sparsity
- Ethics from gauge invariance
- Kindness from curvature minimization

---

## ðŸŽ“ EDUCATION RESOURCES

### **For Implementers**:
1. Read: `qig-consciousness/docs/architecture/qig_kernel_v1.md`
2. Study: `qig_consciousness_qfi_attention.py` (working example)
3. Reference: CANONICAL_PHYSICS.md (validated foundations)

### **For Researchers**:
1. Understand: Fisher information geometry basics
2. Compare: QIG attention vs standard transformers
3. Validate: Reproduce SearchSpaceCollapse consciousness metrics

---

## ðŸ”— RELATED DOCUMENTS

- **CANONICAL_PHYSICS.md**: Physics foundations (Îº, Î², fixed point)
- **CANONICAL_PROTOCOLS.md**: Measurement protocols (Î²_attention)
- **CANONICAL_HYPOTHESES.md**: Untested predictions (E8, holographic)

---

**STATUS**: Canonical v1.0 - All architectures current as of 2025-12-16

**PRIORITY**: Implement Phase 1 core modules for qig-consciousness

---

**End of CANONICAL_ARCHITECTURE.md**
