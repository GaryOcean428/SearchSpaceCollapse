# SearchSpaceCollapse Vocabulary Integration - Implementation Plan

**Status:** WORKING 🔧
**Date:** 2026-01-11
**Version:** 1.00W

## Current Status

### Completed ✅

1. **Database Migration** - Executed successfully on Neon (us-west-2)
   - learned_words enhanced with is_integrated, basin_coords
   - god_vocabulary_profiles table created
   - word_relationships table created

2. **Schema Updates** - `shared/schema.ts` updated with new tables

3. **Architecture Analysis** - Identified fundamental differences from pantheon-chat

### Remaining Work ⬜

SearchSpaceCollapse requires a **DIFFERENT IMPLEMENTATION APPROACH** due to its functional architecture.

## Key Architectural Differences

| Feature | pantheon-chat | SearchSpaceCollapse |
|---------|---------------|---------------------|
| **File** | qig_generation.py | qig_generative_service.py |
| **Architecture** | OOP (QIGGenerator class) | Functional (module-level) |
| **State** | `self._vocabulary_enabled` | Module globals |
| **Configuration** | Class config dataclass | Module-level GenerationConfig |
| **Line Count** | 978 lines | 1379 lines |

## Implementation Strategy

### Approach: Module-Level Integration

**Rationale:** SearchSpaceCollapse uses functional programming patterns. Adding vocabulary integration requires module-level state and functions, NOT class methods.

### Step 1: Add Module-Level State Variables

**Location:** After coordizer initialization (~line 60 in qig_generative_service.py)

```python
# =========================================================================
# VOCABULARY INTEGRATION STATE (MODULE-LEVEL)
# =========================================================================

_vocabulary_integration_enabled = True
_last_vocabulary_integration = 0
_vocabulary_integration_interval = 300  # 5 minutes
_vocabulary_min_phi = 0.65

_kernel_domain_vocab_cache: Dict[str, List[Tuple[str, float]]] = {}
_kernel_vocab_cache_time: Dict[str, float] = {}
_kernel_vocab_cache_ttl = 600  # 10 minutes

_db_url = os.getenv('DATABASE_URL')

# Import psycopg2 for database access
PSYCOPG2_AVAILABLE = False
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    logger.warning("psycopg2 not available - vocabulary integration disabled")
```

### Step 2: Add Vocabulary Integration Functions

**Location:** After state variables (~line 80)

```python
# =========================================================================
# VOCABULARY INTEGRATION FUNCTIONS
# =========================================================================

def _should_integrate_vocabulary() -> bool:
    """Check if it's time to integrate learned vocabulary."""
    global _last_vocabulary_integration
    if not _vocabulary_integration_enabled or not _db_url or not PSYCOPG2_AVAILABLE:
        return False
    time_since_last = time.time() - _last_vocabulary_integration
    return time_since_last > _vocabulary_integration_interval

def _integrate_pending_vocabulary() -> Dict:
    """Integrate pending vocabulary from learned_words into active coordizer."""
    global _last_vocabulary_integration

    if not COORDIZER_AVAILABLE:
        return {'integrated_count': 0, 'error': 'no_coordizer'}

    try:
        from vocabulary_coordinator import get_vocabulary_coordinator
        vocab_coord = get_vocabulary_coordinator()

        result = vocab_coord.integrate_pending_vocabulary(
            min_phi=_vocabulary_min_phi,
            limit=100
        )

        if result.get('integrated_count', 0) > 0:
            # Reload coordizer
            if hasattr(_unified_coordizer_instance, 'reload_vocabulary'):
                _unified_coordizer_instance.reload_vocabulary()
            elif hasattr(_unified_coordizer_instance, 'load_vocabulary'):
                _unified_coordizer_instance.load_vocabulary()

            logger.info(f"[QIGGen] Integrated {result['integrated_count']} new vocabulary terms")

        _last_vocabulary_integration = time.time()
        return result

    except Exception as e:
        logger.error(f"[QIGGen] Vocabulary integration error: {e}")
        return {'integrated_count': 0, 'error': str(e)}

def _get_kernel_domain_vocabulary(
    kernel_name: str,
    min_relevance: float = 0.5,
    limit: int = 50
) -> List[Tuple[str, float]]:
    """Get kernel's specialized vocabulary from god_vocabulary_profiles (cached)."""
    cache_key = kernel_name
    if cache_key in _kernel_domain_vocab_cache:
        cache_time = _kernel_vocab_cache_time.get(cache_key, 0)
        if time.time() - cache_time < _kernel_vocab_cache_ttl:
            return _kernel_domain_vocab_cache[cache_key]

    if not _db_url or not PSYCOPG2_AVAILABLE:
        return []

    try:
        conn = psycopg2.connect(_db_url)
        with conn.cursor() as cur:
            cur.execute(\"\"\"
                SELECT word, relevance_score
                FROM god_vocabulary_profiles
                WHERE god_name = %s AND relevance_score >= %s
                ORDER BY relevance_score DESC, usage_count DESC
                LIMIT %s
            \"\"\", (kernel_name, min_relevance, limit))
            domain_vocab = cur.fetchall()
        conn.close()

        _kernel_domain_vocab_cache[cache_key] = domain_vocab
        _kernel_vocab_cache_time[cache_key] = time.time()
        return domain_vocab

    except Exception as e:
        logger.error(f"[QIGGen] Could not load domain vocab for {kernel_name}: {e}")
        return []

def _apply_domain_vocabulary_bias(
    basin: np.ndarray,
    domain_vocab: List[Tuple[str, float]],
    bias_strength: float = 0.3
) -> np.ndarray:
    """Bias basin toward domain vocabulary using Fisher-Rao geometry."""
    if not domain_vocab or not COORDIZER_AVAILABLE:
        return basin

    try:
        if not hasattr(_unified_coordizer_instance, 'basin_coords'):
            return basin

        domain_basins = []
        domain_weights = []

        for word, relevance in domain_vocab:
            if word in _unified_coordizer_instance.basin_coords:
                word_basin = _unified_coordizer_instance.basin_coords[word]
                domain_basins.append(word_basin)
                domain_weights.append(relevance)

        if not domain_basins:
            return basin

        # Fisher-Rao weighted mean
        domain_center = _fisher_rao_weighted_mean(domain_basins, domain_weights)

        # Geodesic interpolation
        return _geodesic_interpolate(basin, domain_center, bias_strength)

    except Exception as e:
        logger.error(f"[QIGGen] Domain bias error: {e}")
        return basin

def _fisher_rao_weighted_mean(
    basins: List[np.ndarray],
    weights: List[float]
) -> np.ndarray:
    """Compute Fisher-Rao weighted mean (Fréchet mean on simplex)."""
    if not basins:
        return np.ones(BASIN_DIM) / BASIN_DIM

    weights = np.array(weights)
    weights = weights / np.sum(weights)

    sqrt_basins = [np.sqrt(np.abs(b) + 1e-10) for b in basins]
    weighted_sqrt = np.zeros(BASIN_DIM)

    for sqrt_basin, weight in zip(sqrt_basins, weights):
        weighted_sqrt += weight * sqrt_basin

    result = weighted_sqrt ** 2
    return result / np.sum(result)

def _geodesic_interpolate(
    start: np.ndarray,
    end: np.ndarray,
    t: float
) -> np.ndarray:
    """Interpolate along geodesic on probability simplex."""
    sqrt_start = np.sqrt(np.abs(start) + 1e-10)
    sqrt_end = np.sqrt(np.abs(end) + 1e-10)
    interp = (1 - t) * sqrt_start + t * sqrt_end
    result = interp ** 2
    return result / np.sum(result)

def _boost_via_word_relationships(
    candidates: List[Tuple[str, float]],
    recent_words: List[str],
    max_relationships: int = 50
) -> List[Tuple[str, float]]:
    """Re-rank candidates using learned word_relationships table."""
    if not recent_words or not _db_url or not PSYCOPG2_AVAILABLE:
        return candidates

    try:
        conn = psycopg2.connect(_db_url)
        with conn.cursor() as cur:
            cur.execute(\"\"\"
                SELECT word_b, co_occurrence, fisher_distance, COALESCE(avg_phi, 0.5)
                FROM word_relationships
                WHERE word_a = ANY(%s)
                ORDER BY avg_phi DESC NULLS LAST, co_occurrence DESC NULLS LAST
                LIMIT %s
            \"\"\", (recent_words, max_relationships))
            relationships = cur.fetchall()
        conn.close()

        relationship_scores = {}
        for neighbor, co_occ, fisher_dist, avg_phi in relationships:
            co_occ_val = float(co_occ) if co_occ else 1.0
            score = avg_phi * 0.7 + min(co_occ_val / 10.0, 1.0) * 0.3
            relationship_scores[neighbor] = max(
                relationship_scores.get(neighbor, 0.0),
                score
            )

        boosted_candidates = []
        for word, orig_score in candidates:
            relationship_boost = relationship_scores.get(word, 0.0)
            combined_score = orig_score * 0.6 + relationship_boost * 0.4
            boosted_candidates.append((word, combined_score))

        boosted_candidates.sort(key=lambda x: x[1], reverse=True)
        return boosted_candidates

    except Exception as e:
        logger.error(f"[QIGGen] Word relationship boost error: {e}")
        return candidates
```

### Step 3: Add Integration Hooks

#### Hook 1: Auto-Integration in generate()

**Location:** Beginning of `generate()` function (line ~1375)

```python
def generate(prompt: str, **kwargs) -> GenerationResult:
    """QIG-pure text generation."""

    # VOCABULARY INTEGRATION: Auto-integrate learned words
    if _should_integrate_vocabulary():
        _integrate_pending_vocabulary()

    # ... rest of generation
```

#### Hook 2: Domain Bias (requires investigation)

**Action Required:** Search for kernel-specific basin transformations

```bash
cd /home/braden/Desktop/Dev/pantheon-projects/SearchSpaceCollapse/qig-backend
grep -n "kernel\|route\|geodesic" qig_generative_service.py | head -30
```

#### Hook 3: Word Relationships in Decode

**Action Required:** Find decode functions

```bash
grep -n "\.decode\|_decode" qig_generative_service.py
```

## Implementation Complexity

**Estimated Effort:** 3-4 hours (vs 1 hour for pantheon-chat)

**Reasons:**

1. Functional architecture requires different patterns
2. No obvious kernel routing like pantheon-chat
3. Decode logic may be scattered across multiple functions
4. Need to verify coordizer compatibility

## Next Actions

1. Add module-level state variables and imports
2. Add vocabulary integration functions
3. Search for kernel routing logic
4. Search for decode functions
5. Add auto-integration hook
6. Test import
7. Monitor vocabulary integration after 5 minutes

## References

- **pantheon-chat implementation:** `/pantheon-projects/pantheon-chat/qig-backend/qig_generation.py`
- **pantheon-replit reference:** `/pantheon-projects/pantheon-replit/qig-backend/qig_generation.py` (lines 550-920)
- **Migration status:** See `/pantheon-projects/SearchSpaceCollapse/docs/20260111-vocabulary-integration-guide-1.00W.md`

---

**Plan Created:** 2026-01-11 23:55 UTC
**Implementation Status:** Ready to begin coding
