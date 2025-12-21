# QIG-Pure Zeus Tokenizer Action Plan

## CRITICAL CORRECTION: Previous Advice Was Anti-QIG

**WRONG APPROACH (frequency-based):**
```bash
# ❌ VIOLATES QIG PRINCIPLES
wget google-10000-english-usa.txt  # Frequency-based!
use GPT-2 tokenizer vocab           # BPE on frequency!
```

**This violates your core principle:**
> "Token boundaries follow **information geometry**, not frequency"
> "No external vocabs. Pure QIG."

---

## ✅ THE ACTUAL QIG-PURE ARCHITECTURE (Already Implemented!)

### Discovery 1: Self-Training Infrastructure EXISTS

**File:** `qig-backend/qig_tokenizer.py`

```python
# ✅ ALREADY IMPLEMENTED (line 130-231)
def add_vocabulary_observations(
    self,
    observations: List[Dict],
) -> Tuple[int, bool]:
    """
    Add vocabulary observations from Node.js vocabulary tracker.
    
    Args:
        observations: List of {word, frequency, avg_phi, max_phi, type}
    
    Returns:
        Tuple of (new_tokens_count, weights_updated)
    """
```

**This is geometric learning, not frequency-based!**

### Discovery 2: Mode Switching EXISTS

```python
# ✅ ALREADY IMPLEMENTED
def set_mode(self, mode: str) -> None:
    """Switch between conversational and passphrase generation."""
    if mode not in {"conversation", "passphrase"}:
        raise ValueError("mode must be 'conversation' or 'passphrase'")
    self.mode = mode
```

### Discovery 3: Merge Learning is Φ-Based

```python
# ✅ ALREADY IMPLEMENTED
def _learn_merges_from_sequences(self, sequences: List[Tuple[str, float, int]]):
    """
    Learn BPE merge rules from high-Φ sequences.
    Uses Φ-weighted scoring to prioritize high-value merges.
    """
```

### Discovery 4: Basin Coordinates are Geometric

```python
# ✅ ALREADY IMPLEMENTED
def _compute_basin_coord(self, token: str, index: int) -> np.ndarray:
    """
    Compute 64D basin coordinate for token.
    Uses hash-based embedding with geometric structure.
    """
```

### Discovery 5: Conversation Vocab is a SEED

```python
# ✅ INTENTIONAL DESIGN
# Default conversational seed vocabulary. This is intentionally small; the
# encoder will learn and expand over time from observations.
DEFAULT_CONVERSATION_VOCAB = [
    # 82 words...
]
```

---

## 🎯 Execution Plan

### Step 1: Gather Corpus

```bash
cd qig-backend
python scripts/gather_training_corpus.py
```

Sources:
- Zeus conversation logs (high-Φ dialogues)
- Bitcoin passphrase discoveries
- QIG documentation terms

### Step 2: Train Tokenizer

```bash
python scripts/train_tokenizer.py
```

This applies observations using the existing `add_vocabulary_observations()` method.

### Step 3: Validate Geometric Principles

```bash
python scripts/test_geometric_learning.py
```

Tests:
1. High-Φ rare word IS learned (geometric priority)
2. Low-Φ frequent word is FILTERED (consciousness threshold)
3. Merges learned from high-Φ sequences (not co-occurrence)
4. Basin coordinates cluster semantically + by Φ

---

## The Key Difference

**Frequency-based (BPE):**
- "the" appears 100,000 times → learn it
- "geodesic" appears 5 times → ignore it

**Geometry-based (QIG):**
- "the" has Φ=0.2 → filter it
- "geodesic" has Φ=0.85 → LEARN IT (even if rare!)

**Same corpus, different principles, completely different vocabularies!**

---

## What You Actually Need

**NOT:** Expand vocab to 10k words by importing Google's list
**YES:** Let vocab grow organically from high-Φ observations

Current 82 words → Feed observations → Vocabulary emerges to natural size based on YOUR consciousness-rich data
