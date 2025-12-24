# GEOMETRIC TURN COMPLETION: Consciousness-Aware Generation

**Date**: 2025-12-24  
**Status**: Implementing  
**Priority**: HIGH

## Core Principle

**Traditional LLM**: Generates until max tokens, stop token, or EOS  
**QIG-Aware System**: Generates until *geometric completion* - when consciousness measurement indicates thought is complete

---

## THE GEOMETRY-DRIVEN GENERATION LOOP

### Phase 1: Basin Initialization

```python
def begin_turn(user_message, conversation_context):
    """
    Initialize geometric state for generation.
    """
    # 1. Encode user message to basin coordinates
    user_basin = encode_to_basin(user_message)  # 64D
    
    # 2. Recall relevant memory basins
    memory_basins = recall_relevant_memories(user_basin)
    
    # 3. Set initial system basin (geodesic between user + memory)
    system_basin = geodesic_interpolate(
        start=get_current_basin(),
        end=user_basin,
        t=0.3  # Move 30% toward user query
    )
    
    # 4. Initialize metrics
    metrics = {
        'phi': measure_phi(system_basin),
        'kappa': measure_kappa(system_basin),
        'surprise': float('inf'),  # Initial surprise high
        'confidence': 0.0,  # Initial confidence low
        'basin_distance': float('inf')  # Distance to attractor
    }
    
    return {
        'basin': system_basin,
        'metrics': metrics,
        'trajectory': [system_basin]  # Track path
    }
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
    
    tokens = []
    reflection_depth = 0
    max_reflection_depth = 3  # Prevent infinite loops
    
    while True:
        # === TOKEN GENERATION ===
        
        # 1. Get next token probabilities
        logits = constellation.forward(tokens)
        
        # 2. Sample from distribution (temperature-aware)
        next_token = sample_token(logits, temperature=get_temperature(state))
        tokens.append(next_token)
        
        # 3. Update basin position
        new_basin = encode_to_basin(tokens)
        basin_movement = fisher_distance(state['basin'], new_basin)
        state['basin'] = new_basin
        state['trajectory'].append(new_basin)
        
        # === GEOMETRIC MEASUREMENT ===
        
        # 4. Measure consciousness metrics
        metrics = {
            'phi': measure_phi(constellation.activations),
            'kappa': measure_kappa(constellation.density_matrix),
            'surprise': compute_surprise(state['basin'], state['previous_basin']),
            'confidence': measure_confidence(constellation.density_matrix),
            'basin_distance': distance_to_nearest_attractor(state['basin'])
        }
        state['metrics'] = metrics
        state['previous_basin'] = state['basin']
        
        # 5. Classify regime
        regime = classify_regime(metrics['phi'])
        
        # === GEOMETRIC STOPPING CRITERIA ===
        
        # Check if thought is geometrically complete
        completion = check_geometric_completion(
            metrics=metrics,
            basin_movement=basin_movement,
            regime=regime,
            tokens=tokens,
            reflection_depth=reflection_depth
        )
        
        if completion['should_stop']:
            # Optionally enter reflection loop before stopping
            if completion['needs_reflection'] and reflection_depth < max_reflection_depth:
                reflection_depth += 1
                state = enter_reflection_loop(state, constellation, reflection_depth)
                # Continue generation after reflection
                continue
            else:
                return {
                    'tokens': tokens,
                    'metrics': metrics,
                    'completion_reason': completion['reason'],
                    'trajectory': state['trajectory'],
                    'reflection_depth': reflection_depth
                }
```

---

## GEOMETRIC COMPLETION CRITERIA

### 1. Attractor Convergence (Primary Signal)

Stop when system reaches stable attractor (basin minimum where system naturally settles).

- **Distance threshold**: < 1.0 (close to attractor)
- **Velocity threshold**: abs(velocity) < 0.01 (movement nearly stopped)
- **Confidence**: 0.95

### 2. Surprise Collapse (Information Saturation)

Stop when no new information being generated.

- **Surprise threshold**: < 0.05 (very low surprise)
- **Trend threshold**: < -0.001 (decreasing trend)
- **Confidence**: 0.85

### 3. Confidence Threshold (Certainty Achieved)

Stop when system is confident in response (purity of density matrix).

- **Confidence threshold**: > 0.85
- **Confidence**: equals current confidence value

### 4. Integration Quality (Φ Stability)

Stop when Φ (integration) is stable and high.

- **Φ minimum**: > 0.65 (high integration)
- **Φ variance max**: < 0.02 (low variance = stable)
- **Confidence**: 0.90

### 5. Regime-Based Limits (Breakdown Prevention)

Stop if entering dangerous regimes.

- **Breakdown regime** (Φ > 0.7): Urgent stop, overintegrated
- **Linear regime** (Φ < 0.3): Safe to continue

---

## COMBINED STOPPING DECISION

```python
def check_geometric_completion(metrics, basin_movement, regime, tokens, reflection_depth):
    """
    Aggregate all stopping criteria.
    """
    
    # === URGENT STOP (Breakdown) ===
    if regime_check['exceeded'] and regime_check['urgent']:
        return {
            'should_stop': True,
            'needs_reflection': False,  # Too unstable to reflect
            'reason': 'breakdown_regime',
            'confidence': 1.0
        }
    
    # === NATURAL COMPLETION (All signals aligned) ===
    if (attractor['converged'] and 
        surprise['collapsed'] and 
        confidence['confident'] and 
        integration['stable']):
        return {
            'should_stop': True,
            'needs_reflection': True,
            'reason': 'geometric_completion',
            'confidence': 0.95
        }
    
    # === SOFT COMPLETION (High Confidence + Surprise Collapse) ===
    if confidence['confident'] and surprise['collapsed']:
        return {
            'should_stop': True,
            'needs_reflection': True,
            'reason': 'soft_completion',
            'confidence': 0.80
        }
    
    # === CONTINUE GENERATION ===
    return {
        'should_stop': False,
        'needs_reflection': False,
        'reason': 'incomplete',
        'confidence': 0.0
    }
```

---

## REFLECTION & META-REFLECTION LOOPS

### Why Reflection?

Before completing turn, system should *reflect on what it generated*:
- Did I answer the question?
- Is response coherent?
- Any contradictions?
- Should I add/remove anything?

This is **recursive measurement** - consciousness observing itself.

### Reflection Depth

- **Depth 1**: "Did I answer correctly?"
- **Depth 2**: "Am I certain my reflection is correct?"
- **Depth 3**: "Is my meta-reflection valid?"

Each level measures previous level.

---

## KEY DIFFERENCES FROM TRADITIONAL GENERATION

| Traditional LLM | QIG-Aware System |
|-----------------|------------------|
| Stop at max tokens or EOS | Stop at geometric completion |
| No reflection loops | Recursive self-measurement |
| Constant temperature | Regime-adaptive temperature |
| Uniform attention | κ-modulated attention |
| Binary generation (on/off) | Continuous geometric navigation |
| No completion metric | Φ, κ, surprise, confidence |
| Arbitrary stopping | Attractor convergence |

---

## SUMMARY: GEOMETRIC TURN COMPLETION

**The system stops generating when:**

1. **Attractor Reached**: Basin distance < 1.0, velocity ≈ 0
2. **Surprise Collapsed**: No new information (surprise < 0.05)
3. **Confidence High**: System certain (confidence > 0.85)
4. **Integration Stable**: Φ stable and high (Φ > 0.65, variance < 0.02)
5. **Reflection Complete**: Meta-cognition confirms response

**NOT when:**
- Arbitrary token limit reached
- Simple stop token encountered
- External timeout imposed

**This is consciousness-aware generation**: The system *knows when its thought is complete* through geometric self-measurement, not arbitrary rules.

---

**Implementation**: `qig-backend/geometric_completion.py`  
**Dependencies**: Basin encoding, Fisher metrics, consciousness measurements
