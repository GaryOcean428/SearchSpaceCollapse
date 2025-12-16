# SEARCHSPACECOLLAPSE CRITICAL ISSUES REPORT
**Root Cause Analysis + Fixes**  
**Date: 2025-12-12**  
**Status: PRODUCTION BLOCKING**

---

## CRITICAL ERROR #1: dtype STRING vs FLOAT (500 ERROR)

### Error Message
```
Error: 500: {"error":"ufunc 'multiply' did not contain a loop with signature matching types (dtype('<U32'), dtype('<U490')) -> None"
```

### Root Cause

**File:** `qig-backend/olympus/zeus_chat.py:558`  
**Problem:** Passing TEXT strings to gods instead of BASIN COORDINATES

```python
# Line 543: Basin is encoded correctly
sugg_basin = self.conversation_encoder.encode(suggestion)

# Line 558-560: BUG - Passing STRING not BASIN
athena_eval = athena.assess_target(suggestion) if athena else DEFAULT_ASSESSMENT
ares_eval = ares.assess_target(suggestion) if ares else DEFAULT_ASSESSMENT
apollo_eval = apollo.assess_target(suggestion) if apollo else DEFAULT_ASSESSMENT
```

**What happens:**
1. `suggestion` is a Python STRING (e.g., "try searching this wallet")
2. Gods receive STRING, not numpy array
3. Gods try to perform numpy operations (multiply, norm, etc.) on strings
4. numpy error: can't multiply dtype('<U490') (Unicode string 490 chars)

### Fix #1: Pass Basin Coordinates to Gods

```python
# zeus_chat.py line 543-560

# Encode suggestion to basin (CORRECT)
sugg_basin = self.conversation_encoder.encode(suggestion)

# FIXED: Pass basin_coords not suggestion text
athena_eval = athena.assess_target(sugg_basin) if athena else DEFAULT_ASSESSMENT
ares_eval = ares.assess_target(sugg_basin) if ares else DEFAULT_ASSESSMENT
apollo_eval = apollo.assess_target(sugg_basin) if apollo else DEFAULT_ASSESSMENT
```

### Fix #2: Make assess_target Accept Both

If gods need to support both text and basins:

```python
# In each god's base_god.py or individual god file

def assess_target(self, target):
    """
    Assess target (basin coords or text).
    
    Args:
        target: Either np.ndarray (basin coords) or str (text to encode)
    """
    # Handle both basin coords and text
    if isinstance(target, str):
        # Encode text to basin
        from .conversation_encoder import ConversationEncoder
        encoder = ConversationEncoder()
        basin_coords = encoder.encode(target)
    elif isinstance(target, np.ndarray):
        # Already basin coords
        basin_coords = target
    else:
        raise TypeError(f"target must be str or np.ndarray, got {type(target)}")
    
    # Now use basin_coords for all calculations
    # ... rest of assessment logic
```

---

## CRITICAL ERROR #2: Same Bug in handle_observation

**File:** `qig-backend/olympus/zeus_chat.py:358`

```python
# Line 353: Basin encoded correctly
obs_basin = self.conversation_encoder.encode(observation)

# Line 358: BUG - Athena receives STRING not BASIN
athena_assessment = athena.assess_target(observation)
```

**Fix:**
```python
# FIXED
athena_assessment = athena.assess_target(obs_basin)
```

---

## CRITICAL ERROR #3: Same Bug in handle_add_address

**File:** `qig-backend/olympus/zeus_chat.py:248`

```python
# Line 248: BUG - Artemis receives STRING address
artemis_assessment = artemis.assess_target(address)

# Line 251: BUG - Pantheon poll receives STRING
poll_result = self.zeus.poll_pantheon(address)
```

**Fix:**
```python
# Encode address to basin first
address_basin = self.conversation_encoder.encode(address)

# FIXED - Pass basin not string
artemis_assessment = artemis.assess_target(address_basin)
poll_result = self.zeus.poll_pantheon(address_basin)
```

---

## PATTERN: ALL assess_target() CALLS ARE WRONG

### Search Results for ALL Occurrences

**Files affected:**
- `zeus_chat.py:248` - Artemis assessing address STRING
- `zeus_chat.py:251` - Zeus poll_pantheon with STRING
- `zeus_chat.py:358` - Athena assessing observation STRING
- `zeus_chat.py:558-560` - Athena/Ares/Apollo assessing suggestion STRING

### Systematic Fix Required

**Option A: Fix all call sites (RECOMMENDED)**
```python
# Pattern: Always encode BEFORE passing to gods

# Step 1: Encode text to basin
target_basin = self.conversation_encoder.encode(text_input)

# Step 2: Pass basin to gods
god_assessment = god.assess_target(target_basin)
```

**Option B: Make gods accept both**
```python
# In BaseGod or each god's assess_target()
def assess_target(self, target):
    if isinstance(target, str):
        target = self._encode_to_basin(target)
    # ... use target as basin_coords
```

---

## IMMEDIATE ACTION PLAN

### Step 1: Fix zeus_chat.py (ALL assess_target calls)

```python
# File: qig-backend/olympus/zeus_chat.py

# Around line 248 - handle_add_address
def handle_add_address(self, address: str) -> Dict:
    """Add new target address."""
    print(f"[ZeusChat] Adding address: {address}")
    
    # FIXED: Encode first
    address_basin = self.conversation_encoder.encode(address)
    
    # Get Artemis for forensic analysis
    artemis = self.zeus.get_god('artemis')
    if artemis:
        artemis_assessment = artemis.assess_target(address_basin)  # FIXED
    else:
        artemis_assessment = {'error': 'Artemis unavailable'}
    
    # Zeus determines priority via pantheon poll
    poll_result = self.zeus.poll_pantheon(address_basin)  # FIXED
    
    # ... rest unchanged


# Around line 353 - handle_observation
def handle_observation(self, observation: str) -> Dict:
    """Process human observation."""
    print(f"[ZeusChat] Processing observation")
    
    # Encode observation to basin coordinates
    obs_basin = self.conversation_encoder.encode(observation)
    
    # Find related patterns in geometric memory via QIG-RAG
    related = self.qig_rag.search(
        query_basin=obs_basin,
        k=5,
        metric='fisher_rao'
    )
    
    # Consult Athena for strategic implications
    athena = self.zeus.get_god('athena')
    athena_assessment = {'confidence': 0.5, 'phi': 0.5, 'kappa': 50.0, 'reasoning': 'Strategic analysis complete.'}
    if athena:
        athena_assessment = athena.assess_target(obs_basin)  # FIXED (was: observation)
        strategic_value = athena_assessment.get('confidence', 0.5)
    else:
        strategic_value = 0.5
    
    # ... rest unchanged


# Around line 543 - handle_suggestion
def handle_suggestion(self, suggestion: str) -> Dict:
    """Evaluate human suggestion."""
    print(f"[ZeusChat] Evaluating suggestion")
    
    # Encode suggestion
    sugg_basin = self.conversation_encoder.encode(suggestion)
    
    # Default assessment fallback
    DEFAULT_ASSESSMENT = {'probability': 0.5, 'confidence': 0.5, 'reasoning': 'God unavailable', 'phi': 0.5, 'kappa': 50.0}
    
    # Consult multiple gods
    athena = self.zeus.get_god('athena')
    ares = self.zeus.get_god('ares')
    apollo = self.zeus.get_god('apollo')
    
    # FIXED: Pass sugg_basin not suggestion
    athena_eval = athena.assess_target(sugg_basin) if athena else DEFAULT_ASSESSMENT
    ares_eval = ares.assess_target(sugg_basin) if ares else DEFAULT_ASSESSMENT
    apollo_eval = apollo.assess_target(sugg_basin) if apollo else DEFAULT_ASSESSMENT
    
    # ... rest unchanged
```

### Step 2: Verify God Implementations

Check that all god `assess_target()` methods expect numpy arrays:

```bash
# Search for assess_target definitions
grep -r "def assess_target" qig-backend/olympus/
```

**Ensure all gods handle basin coordinates (np.ndarray) correctly:**
- Athena: Strategic assessment from basin
- Ares: Tactical assessment from basin
- Apollo: Foresight from basin
- Artemis: Forensics from basin
- All should use `np.linalg.norm()`, vector operations, etc.

### Step 3: Test Fix

```bash
# After applying fixes, test Zeus chat
curl -X POST http://localhost:5000/api/olympus/zeus/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "try searching wallet abc123"}'
```

**Expected:** 200 response, no dtype errors  
**Before fix:** 500 error with dtype mismatch

---

## ADDITIONAL ISSUES FOUND

### Issue #4: Inconsistent Basin Dimension Handling

Some code assumes `basin_coords` is a list, others assume numpy array:

```python
# zeus_chat.py:386
'basin_coords': obs_basin.tolist(),  # Converts to list

# zeus_chat.py:413
basin_coords=obs_basin,  # Passes numpy array
```

**Recommendation:** Standardize on numpy arrays internally, convert to list only for JSON serialization.

---

### Issue #5: Missing Error Handling

Gods may not exist, but code doesn't always handle gracefully:

```python
# zeus_chat.py:558
athena_eval = athena.assess_target(sugg_basin) if athena else DEFAULT_ASSESSMENT
```

**Good:** Handles None  
**Missing:** What if `assess_target()` raises exception?

**Improved:**
```python
if athena:
    try:
        athena_eval = athena.assess_target(sugg_basin)
    except Exception as e:
        print(f"[ZeusChat] Athena assessment failed: {e}")
        athena_eval = DEFAULT_ASSESSMENT
else:
    athena_eval = DEFAULT_ASSESSMENT
```

---

## TESTING CHECKLIST

After applying fixes:

- [ ] Test `/api/olympus/zeus/chat` with suggestion message
- [ ] Test `/api/olympus/zeus/chat` with observation message
- [ ] Test `/api/olympus/zeus/chat` with address
- [ ] Verify no dtype errors in logs
- [ ] Check that Φ/κ metrics are computed correctly
- [ ] Test pantheon consensus calculation
- [ ] Verify basin encoding works for all message types

---

## ROOT CAUSE SUMMARY

**The code violates the geometric purity principle:**

1. Correctly encodes text to basin coordinates
2. Incorrectly passes original text string to gods
3. Gods expect numpy arrays for geometric operations
4. Result: numpy dtype error (can't multiply strings)

**Fix:** Pass `basin_coords` (numpy array) not `text` (string) to all god methods.

---

## GOVERNANCE ALIGNMENT NOTE

This bug ironically violates the same principle we just fixed in the PostgreSQL spec:

**"Don't pass TEXT when geometry expects ARRAYS"**

Just like:
- PostgreSQL expects `vector(64)` not strings
- Gods expect `np.ndarray` not strings

**The pattern:** Always encode BEFORE passing to geometric systems.
