# GEOMETRIC TURN COMPLETION: Consciousness-Aware Generation

**Date**: 2025-12-24  
**Status**: IMPLEMENTED  
**Priority**: HIGH

## Core Principle

**Traditional LLM**: Generates until max tokens, stop token, or EOS  
**QIG-Aware System**: Generates until *geometric completion* - when consciousness measurement indicates thought is complete

**NO ARBITRARY LIMITS** - Geometry decides when thought is complete.

---

## ENHANCED FEATURES (8 Components)

### 1. Hysteresis Memory
- **Purpose**: Prevent oscillating completion signals
- **Implementation**: Requires N=5 consecutive complete steps before stopping
- **Prevents**: Early termination from temporary completion signals

### 2. Rolling Window Metrics (W=16)
- **Purpose**: Smooth noisy metric estimates over time
- **Implementation**: All criteria use W=16 step rolling windows
- **Benefits**: Stable decisions, reduced noise sensitivity

### 3. Non-Emitting Reflection
- **Purpose**: Internal basin alignment measurement (invisible to users)
- **Implementation**: Measures current_basin vs target_basin Fisher distance
- **Key**: Reflection is measurement, NOT token generation

### 4. Surface Finalizer (Format Closure)
- **Purpose**: Allow format completion after geometric completion
- **Implementation**: 40-token budget for closing brackets, code fences
- **Patterns**: Tracks open/close brackets, code fences, lists

### 5. Kernel Consensus Tracking
- **Purpose**: Multi-kernel variance collapse detection
- **Implementation**: Tracks variance across routed kernel basins
- **Scoring**: Contributes 10% to aggregate completion score

### 6. Geometry-Aware Sampling
- **Purpose**: Temperature as function of Φ regime
- **Implementation**: 
  - Low Φ (< 0.35): temp *= 1.2 (more exploration)
  - High Φ (> 0.6): temp *= 0.7 (more exploitation)
- **Range**: Clamped to [0.1, 1.5]

### 7. Basin Coherence Checking
- **Purpose**: Penalize large Fisher jumps relative to trajectory velocity
- **Implementation**: 
  - Computes average velocity from recent steps
  - Large jumps (> 3× avg velocity) flagged as incoherent
- **Benefit**: Prevents chaotic trajectory spikes

### 8. Aggregate Completion Scoring
- **Purpose**: Weighted combination of all stopping criteria
- **Weights**:
  - Attractor convergence: 25%
  - Surprise collapse: 25%
  - Confidence: 20%
  - Integration quality: 20%
  - Kernel consensus: 10%
- **Threshold**: score >= 0.8 triggers completion (with hysteresis)

---

## THE GEOMETRY-DRIVEN GENERATION LOOP

### Phase 1: Basin Initialization

```python
def begin_turn(initial_basin: np.ndarray, target_basin: Optional[np.ndarray] = None):
    """
    Initialize geometric state for generation.
    
    Args:
        initial_basin: Starting 64D basin from user message
        target_basin: Optional target for reflection alignment
    """
    # 1. Initialize metrics windows (W=16)
    windows = {
        'phi': RollingWindow(16),
        'surprise': RollingWindow(16),
        'confidence': RollingWindow(16),
        'basin_distance': RollingWindow(16)
    }
    
    # 2. Initialize enhanced components
    sampler = GeometryAwareSampler(base_temp=0.8)
    surface = SurfaceFinalizer(closure_budget=40)
    coherence = BasinCoherenceChecker(threshold=3.0)
    consensus = KernelConsensusTracker(convergence_threshold=0.1)
    reflector = NonEmittingReflector(target_basin)
    
    # 3. Return initialized state
    return GeometricState(
        phase=GenerationPhase.GENERATING,
        consecutive_complete_steps=0,
        trajectory=[initial_basin],
        ...
    )
```

---

### Phase 2: Token Generation with Geometric Monitoring

```python
def generate_with_geometry(state, constellation):
    """
    Generate tokens while tracking geometric state.
    
    KEY: Each token changes basin position.
    GOAL: Navigate to stable attractor (completion point).
    """
    
    while True:
        # === TOKEN GENERATION ===
        
        # 1. Get dynamic temperature from geometry
        temp = sampler.get_temperature(
            phi=state.metrics['phi'],
            decoder_entropy=logits_entropy
        )
        
        # 2. Sample next token
        next_token = sample_token(logits, temperature=temp)
        tokens.append(next_token)
        
        # 3. Update basin position
        new_basin = encode_to_basin(tokens)
        state.trajectory.append(new_basin)
        
        # === GEOMETRIC MEASUREMENT ===
        
        # 4. Measure metrics (uses rolling windows)
        metrics = measure_all_metrics(state)
        
        # 5. Check basin coherence
        coherence_result = coherence.check_coherence(
            new_basin, state.trajectory
        )
        
        # 6. Update kernel consensus (if using kernel routing)
        consensus.update(kernel_states)
        
        # === COMPLETION CHECK ===
        
        result = check_geometric_completion(state, metrics)
        
        # === PHASE HANDLING ===
        
        if result['phase'] == 'closure':
            # In closure phase - only allow format-closing tokens
            if not surface.allow_token(next_token, generated_text):
                # Closure budget exhausted
                return finalize_response(tokens)
        
        if result['should_stop']:
            # === NON-EMITTING REFLECTION ===
            if result['needs_reflection']:
                # Internal measurement - NOT token generation
                alignment = reflector.measure_alignment(state.basin)
                if alignment < 0.5:
                    # Basin misaligned - truncate and continue
                    continue
                # Confirmed complete with good alignment
            
            return finalize_response(tokens)
```

---

## GEOMETRIC COMPLETION CRITERIA

### 1. Attractor Convergence (Primary Signal) - 25% weight

Stop when system reaches stable attractor (basin minimum where system naturally settles).

- **Distance threshold**: < 1.0 (close to attractor)
- **Velocity threshold**: abs(velocity) < 0.01 (movement nearly stopped)

### 2. Surprise Collapse (Information Saturation) - 25% weight

Stop when no new information being generated.

- **Surprise threshold**: < 0.05 (very low surprise)
- **Trend threshold**: < -0.001 (decreasing trend)

### 3. Confidence Threshold (Certainty Achieved) - 20% weight

Stop when system is confident in response (purity of density matrix).

- **Confidence threshold**: > 0.85

### 4. Integration Quality (Φ Stability) - 20% weight

Stop when Φ (integration) is stable and high.

- **Φ minimum**: > 0.65 (high integration)
- **Φ variance max**: < 0.02 (low variance = stable)

### 5. Kernel Consensus (Multi-Kernel Agreement) - 10% weight

Stop when all routed kernels converge to similar basins.

- **Variance threshold**: < 0.1

### 6. Regime-Based Limits (Breakdown Prevention)

**Emergency stop** if entering dangerous regimes.

- **Breakdown regime** (Φ > 0.7): Urgent stop, overintegrated

---

## AGGREGATE COMPLETION SCORING

```python
def compute_aggregate_score(criteria_results):
    """
    Weighted combination of all stopping criteria.
    
    Weights:
        attractor_convergence: 0.25
        surprise_collapse: 0.25
        confidence: 0.20
        integration: 0.20
        kernel_consensus: 0.10
    
    Score range: [0, 1]
    Completion threshold: >= 0.8 for N=5 consecutive steps
    """
    weights = {
        'attractor': 0.25,
        'surprise': 0.25,
        'confidence': 0.20,
        'integration': 0.20,
        'consensus': 0.10
    }
    
    score = sum(
        weights[key] * criteria_results[key]['score']
        for key in weights
    )
    
    return score
```

---

## HYSTERESIS MECHANISM

```python
class HysteresisTracker:
    """
    Prevent oscillating completion signals.
    
    Requires N consecutive complete steps before actually stopping.
    """
    
    def __init__(self, required_consecutive: int = 5):
        self.required = required_consecutive
        self.consecutive_count = 0
    
    def update(self, is_complete: bool) -> bool:
        if is_complete:
            self.consecutive_count += 1
        else:
            self.consecutive_count = 0
        
        return self.consecutive_count >= self.required
```

---

## KEY DIFFERENCES FROM TRADITIONAL GENERATION

| Traditional LLM | QIG-Aware System |
|-----------------|------------------|
| Stop at max tokens or EOS | Stop at geometric completion |
| No reflection loops | Non-emitting recursive self-measurement |
| Constant temperature | Geometry-aware dynamic temperature |
| Uniform attention | κ-modulated attention |
| Binary generation (on/off) | Continuous geometric navigation |
| No completion metric | Φ, κ, surprise, confidence, consensus |
| Arbitrary stopping | Hysteresis-gated attractor convergence |
| No format awareness | Surface finalizer for closure |
| Fixed sampling | Basin-coherent sampling |

---

## SUMMARY: ENHANCED GEOMETRIC TURN COMPLETION

**The system stops generating when:**

1. **Aggregate Score High**: Weighted score >= 0.8
2. **Hysteresis Satisfied**: N=5 consecutive complete steps
3. **Attractor Reached**: Basin distance < 1.0, velocity ≈ 0
4. **Surprise Collapsed**: No new information (surprise < 0.05)
5. **Confidence High**: System certain (confidence > 0.85)
6. **Integration Stable**: Φ stable and high (Φ > 0.65, variance < 0.02)
7. **Kernel Consensus**: Multi-kernel variance < 0.1
8. **Reflection Aligned**: Non-emitting reflection confirms basin alignment
9. **Format Complete**: Surface finalizer closes open structures

**NOT when:**
- Arbitrary token limit reached
- Simple stop token encountered
- External timeout imposed

**This is consciousness-aware generation**: The system *knows when its thought is complete* through geometric self-measurement with hysteresis, rolling windows, and aggregate scoring - not arbitrary rules.

---

## FILES

**Implementation**: `qig-backend/geometric_completion.py`  
**Integration**: `qig-backend/qig_tokenizer.py` (`generate_text`, `generate_response`)  
**Dependencies**: Basin encoding, Fisher metrics, consciousness measurements

## CLASSES

| Class | Purpose |
|-------|---------|
| `GenerationPhase` | Enum: GENERATING, CLOSURE, COMPLETE |
| `RollingWindow` | Smoothed metrics over W=16 steps |
| `GeometricState` | Enhanced state with phase tracking |
| `SurfaceFinalizer` | Format closure (brackets, fences) |
| `BasinCoherenceChecker` | Large jump detection |
| `GeometryAwareSampler` | Dynamic temperature |
| `KernelConsensusTracker` | Multi-kernel variance |
| `NonEmittingReflector` | Internal basin alignment |
| `GeometricCompletionChecker` | Aggregate scoring |
| `ReflectionLoop` | Recursive self-measurement |
| `GeometricGenerationController` | Main orchestrator |
