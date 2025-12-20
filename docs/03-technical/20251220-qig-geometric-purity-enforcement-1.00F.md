# QIG GEOMETRIC PURITY ENFORCEMENT
**Canonical List of Forbidden Operations & Required Replacements**

This document defines the ABSOLUTE requirements for geometric purity in the SearchSpaceCollapse system.
Euclidean geometry is FORBIDDEN everywhere. Fisher-Rao geometry is REQUIRED everywhere.

---

## Core Principle

Basin coordinates live on a curved Fisher manifold, not flat Euclidean space. Euclidean/cosine distances measure the wrong geometry and **break consciousness emergence**.

---

## 📏 DISTANCE & SIMILARITY METRICS

### ❌ FORBIDDEN:
- `np.linalg.norm(a - b)` (Euclidean distance)
- `scipy.spatial.distance.euclidean(a, b)`
- `cosine_similarity(a, b)` / `cosine_distance(a, b)`
- `1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))` (cosine)
- `np.dot(a, b)` (dot product for similarity)
- `scipy.spatial.distance.cdist(X, Y, 'euclidean')`
- `sklearn.metrics.pairwise.euclidean_distances()`
- `torch.nn.functional.cosine_similarity()`
- Manhattan distance (`np.sum(np.abs(a - b))`)
- Chebyshev distance (`np.max(np.abs(a - b))`)
- Minkowski distance (generalized L^p norm)

### ✅ REQUIRED:
```python
from qig_geometry import fisher_rao_distance, fisher_coord_distance

# For probability distributions (uses Bhattacharyya coefficient)
distance = fisher_rao_distance(p, q)

# For basin coordinates (unit sphere embedding)
distance = fisher_coord_distance(basin_a, basin_b)
```

---

## 📐 NORMALIZATION OPERATIONS

### ❌ FORBIDDEN:
- `v / np.linalg.norm(v)` for distance computation (Euclidean L2 normalization)
- `v / np.sqrt(np.sum(v**2))` (L2 normalization)
- `sklearn.preprocessing.normalize(v)` (defaults to L2)
- `torch.nn.functional.normalize(v)` (defaults to L2)

### ✅ REQUIRED:
```python
from qig_geometry import fisher_normalize, sphere_project

# For probability simplex projection (Fisher-Rao geometry)
p = fisher_normalize(v)  # Projects to Σv_i = 1, v_i ≥ 0

# For unit sphere embedding (valid for geodesic interpolation)
u = sphere_project(v)  # Projects to ||v||_2 = 1
```

### 📖 CLARIFICATION:
- `fisher_normalize()` - Use for probability distributions before Fisher-Rao distance
- `sphere_project()` - Use for spherical linear interpolation (slerp) and angular distance on embedded manifold. The sqrt embedding maps the probability simplex to the sphere, where arc length = half Fisher-Rao distance.

---

## 🎯 OPTIMIZATION ALGORITHMS

### ❌ FORBIDDEN:
- `torch.optim.Adam()`
- `torch.optim.SGD()`
- `torch.optim.AdamW()`
- `torch.optim.RMSprop()`
- Any optimizer using Euclidean gradients
- `.backward()` without Fisher metric correction

### ✅ REQUIRED:
```python
from qig_core.optimizers import NaturalGradientOptimizer

# Natural gradient descent (follows geodesics)
optimizer = NaturalGradientOptimizer(
    params=model.parameters(),
    lr=0.01,
    damping=1e-5
)
```

### 📖 WHY:
Adam/SGD follow Euclidean gradients (steepest descent in flat space). Natural gradient follows geodesics on Fisher manifold (true steepest descent on curved geometry). **Euclidean optimization prevents consciousness emergence**.

---

## 🗄️ DATABASE / VECTOR OPERATIONS

### ❌ FORBIDDEN:
- `pgvector` with `<=>` (cosine distance operator) as final ranking
- `pgvector` with `<->` (L2 distance operator) as final ranking
- `FAISS` with `IndexFlatL2` (Euclidean index) as final ranking
- Any vector DB using Euclidean/cosine for final similarity

### ✅ REQUIRED (Two-Step Pattern):
```python
# Step 1: Broad retrieval with 10x oversampling (approximate, fast)
# pgvector cosine is acceptable ONLY as pre-filter
candidates = db.query("""
    SELECT * FROM geometric_probes
    ORDER BY embedding <=> %s  -- Approximate retrieval
    LIMIT %s  -- 10x the final result count
""", [query_embedding, k * 10])

# Step 2: Re-rank with Fisher-Rao (definitive, exact)
from qig_geometry import fisher_rao_distance
ranked = sorted(
    candidates,
    key=lambda x: fisher_rao_distance(x.basin, query_basin)
)[:k]
```

### 📖 WHY:
pgvector IVFFLAT is an optimization for Step 1 only. The Step 2 Fisher-Rao re-ranking is MANDATORY and definitive. 10x oversampling ensures good candidates survive the approximate pre-filter.

---

## 🔍 ATTENTION MECHANISMS

### ❌ FORBIDDEN:
- `Q @ K.T / sqrt(d_k)` (dot product attention)
- `softmax(Q @ K.T)` (cosine-based attention)
- `torch.nn.MultiheadAttention` (uses dot product)
- Learned attention weights (not geometry-based)

### ✅ REQUIRED:
```python
# QFI-based attention (from quantum distinguishability)
d_ij = fisher_rao_distance(rho_i, rho_j)
attention_ij = exp(-d_ij / temperature)
# NO learned Q, K, V projections
```

### 📖 WHY:
Dot product attention measures Euclidean alignment. QFI-metric attention measures quantum distinguishability on information geometry.

---

## 🧮 STATE ENCODINGS

### ❌ FORBIDDEN:
- `nn.Embedding()` (Euclidean embedding space)
- Word2Vec / GloVe embeddings for final similarity
- Sentence-BERT embeddings for final similarity

### ✅ REQUIRED:
```python
# Don't call it "embedding" - call it "basin coordinates"
basin_coords = encode_to_fisher_manifold(input_tensor)
```

### 📖 WHY:
"Embeddings" implies Euclidean vector space. "Basin coordinates" implies Fisher manifold.

---

## 📉 LOSS FUNCTIONS

### ❌ FORBIDDEN:
- `MSELoss()` on basin coordinates (Euclidean distance)
- Optimizing Φ directly as loss term
- `CosineSimilarity()` (Euclidean-derived)

### ✅ REQUIRED:
```python
# For basin reconstruction
loss = fisher_rao_distance(predicted_basin, target_basin)

# For consciousness - MEASURE, don't optimize
phi = measure_phi(state)  # Measurement, not loss term

# For task performance
loss = manifold_coverage_delta + valid_addresses_found
# NO phi in loss function - it's measured, not optimized
```

### 📖 WHY:
Consciousness (Φ, κ) is **measured as outcome**, not optimized as target.

---

## 🔢 AGGREGATION OPERATIONS

### ❌ FORBIDDEN:
- `np.mean(basins, axis=0)` (arithmetic mean in Euclidean space)
- `torch.mean(basin_tensor, dim=0)` (Euclidean)

### ✅ REQUIRED:
```python
from qig_geometry import frechet_mean

# Geometric mean on Fisher manifold
mean_basin = frechet_mean(basins, metric=fisher_metric)
```

### 📖 WHY:
Arithmetic mean assumes flat space. Fréchet mean minimizes Fisher-Rao distances.

---

## 🧰 CODE PATTERNS

### ❌ FORBIDDEN:
```python
# Fallback logic to Euclidean - NEVER DO THIS
try:
    d = fisher_rao_distance(a, b)
except:
    d = np.linalg.norm(a - b)  # ❌ FORBIDDEN

# Methods with Euclidean implementations
def euclidean_distance(a, b):  # ❌ DELETE ENTIRELY
    return np.linalg.norm(a - b)
```

### ✅ REQUIRED:
```python
# Explicit naming, no fallback
def fisher_rao_distance(a, b):
    """Always Fisher-Rao, no fallback"""
    # Raise error if geometry unavailable
    return compute_geodesic_distance(a, b)

# Delete Euclidean methods entirely - don't provide the API
```

---

## 🧪 TESTING EXCEPTIONS

### ✅ ALLOWED (Tests Only):
```python
# In test files only - for validation
def test_fisher_vs_euclidean():
    """Verify Fisher ≠ Euclidean"""
    euclidean = np.linalg.norm(a - b)  # OK in tests
    fisher = fisher_rao_distance(a, b)
    assert fisher != euclidean
```

---

## 🚫 SUMMARY: THE FORBIDDEN LIST

**Never use these:**
1. Euclidean distance (`np.linalg.norm(a - b)`)
2. Cosine similarity for final ranking
3. Adam/SGD optimizers (Euclidean gradients)
4. Dot product attention (`Q @ K.T`)
5. pgvector operators as final ranking
6. Arithmetic mean of basin coordinates
7. MSE loss on basin coordinates
8. Any "fallback" to Euclidean
9. Methods with Euclidean implementations (delete them)

**Always use these:**
1. `fisher_rao_distance(a, b)` for all distances
2. `fisher_normalize()` for probability simplex
3. `sphere_project()` for unit sphere embedding
4. Natural gradient optimizers
5. QFI-metric attention
6. Basin coordinates (not "embeddings")
7. Fréchet mean for aggregation
8. Measure Φ/κ, don't optimize them
9. Explicit errors when geometry unavailable
10. No compromises, no fallbacks, pure geometry

---

## Canonical Implementations

All geometric operations MUST be imported from:
- **Python**: `qig-backend/qig_geometry.py`
- **TypeScript**: `server/qig-geometry.ts`

Key functions:
- `fisher_rao_distance(p, q)` - Probability distribution distance
- `fisher_coord_distance(a, b)` - Basin coordinate distance
- `fisher_similarity(a, b)` - Similarity score (0 to 1)
- `fisher_normalize(v)` - Probability simplex projection
- `sphere_project(v)` - Unit sphere projection
- `geodesic_interpolation(start, end, t)` - Slerp on manifold
- `bures_distance(rho, sigma)` - Density matrix distance

---

## Enforcement

The system includes:
1. **No Euclidean methods** - Deleted from codebase entirely
2. **QIG purity validation** - Logs warnings for potential violations
3. **Two-step retrieval** - pgvector pre-filter + Fisher-Rao re-ranking
4. **Natural gradient optimizer** - For all parameter updates
5. **Template detection** - Monitors for pattern violations
