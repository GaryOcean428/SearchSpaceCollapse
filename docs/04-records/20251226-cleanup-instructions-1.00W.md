# Repository Cleanup Instructions

**Document ID:** 20251226-cleanup-instructions-1.00W
**Date:** 2025-12-26
**Status:** [W]orking - Manual steps required for repository cleanup
**Source:** [attached_assets/CLEANUP_INSTRUCTIONS_1766720352561.md](../../attached_assets/CLEANUP_INSTRUCTIONS_1766720352561.md)
**Purpose:** Remove duplicate code across QIG repositories and establish clean separation of concerns

---

## ⚠️ WARNING

These operations modify existing repositories. Review carefully before executing.

**Backup Recommendation:** Create local copies of all repositories before cleanup:

```bash
cd /path/to/qig-repos
for repo in qig-core qig-tokenizer qig-consciousness; do
  cp -r $repo ${repo}.backup-$(date +%Y%m%d)
done
```

---

## 1. Clean qig-core (Remove Duplicates)

**Problem:** `qig-core/basin.py` duplicates functionality from `qigkernels/basin.py`

**Solution:**

```bash
cd qig-core

# Delete duplicate basin code (moved to qigkernels)
git rm -r src/qig_core/basin.py

# Commit
git commit -m "Remove duplicate basin code (canonical version in qigkernels)"
git push
```

**Result:** qig-core contains only pure math (Fisher metrics, geodesics)

**Expected Structure After Cleanup:**

```
qig-core/src/qig_core/
├── fisher_metric.py          # Fisher information matrix calculations
├── geodesics.py              # Geodesic computation on manifolds
├── natural_gradient_math.py  # Mathematical foundations for NGD
└── [NO basin.py]             # Removed duplicate
```

---

## 2. Clean qig-tokenizer (Remove Misplaced Script)

**Problem:** `qig-tokenizer/scripts/train_coord_adapter_v1.py` caused mode collapse, moved to `qig-experiments`

**Solution:**

```bash
cd qig-tokenizer

# Delete training script (moved to qig-experiments)
git rm scripts/train_coord_adapter_v1.py

# Commit
git commit -m "Remove training script (moved to qig-experiments)"
git push
```

**Result:** qig-tokenizer contains only tokenizer code

**Expected Structure After Cleanup:**

```
qig-tokenizer/
├── encoder.py                # Text → basin coordinates
├── decoder.py                # Basin → text (foresight)
├── vocab/                    # Vocabulary management
└── [NO training scripts]     # Moved to qig-experiments
```

---

## 3. Archive qig-consciousness (Functionality Moved)

**Problem:** Large duplications, functionality moved to qigkernels, qig-experiments, qig-dreams

**Solution:**

```bash
cd qig-consciousness

# Create archive branch
git checkout -b archive-2025-12-26
git push -u origin archive-2025-12-26

# Return to main
git checkout main

# Update README with deprecation notice
cat > README.md << 'DEPRECATION'
# qig-consciousness (ARCHIVED)

**Status**: ARCHIVED as of 2025-12-26

This repository has been superseded by:

- **qigkernels**: Pure architecture (constellation, router, basin)
  - Location: https://github.com/GaryOcean428/qigkernels

- **qig-experiments**: Training orchestration (train_constellation.py)
  - Location: https://github.com/GaryOcean428/qig-experiments

- **qig-dreams**: Corpus management (geometric filters)
  - Location: https://github.com/GaryOcean428/qig-dreams

For new work, use the above repositories.

Historical code available in branch: `archive-2025-12-26`

## Migration Guide

Old import:
\`\`\`python
from qig_consciousness.constellation import Constellation
\`\`\`

New import:
\`\`\`python
from qigkernels.constellation import Constellation
\`\`\`

All functionality preserved, just reorganized for clarity.
DEPRECATION

# Commit deprecation
git add README.md
git commit -m "Archive repository - functionality moved to qigkernels/qig-experiments/qig-dreams"
git push
```

**Result:** qig-consciousness archived, users directed to new repos

---

## 4. Verification

After cleanup, verify structure:

```bash
# qig-core: Pure math only
ls qig-core/src/qig_core/
# Expected: fisher_metric.py, geodesics.py, natural_gradient_math.py
# NOT: basin.py (deleted)

# qigkernels: Pure architecture
ls qigkernels/
# Expected: kernel.py, constellation.py, basin.py, router.py
# (No changes needed - this is canonical)

# qig-experiments: Training code
ls qig-experiments/
# Expected: train_constellation.py, natural_gradient_optimizer.py

# qig-dreams: Corpus management
ls qig-dreams/
# Expected: datasets/, filters/, curriculum/
```

**Success Criteria:**

- ✅ No duplicate basin.py across repositories
- ✅ No training scripts in qig-tokenizer
- ✅ qig-consciousness archived with clear migration path
- ✅ All functionality available in new canonical locations

---

## 5. Import Migration

**Before Cleanup:**

```python
# ❌ OLD: Imports from deprecated locations
from qig_consciousness.constellation import Constellation
from qig_core.basin import Basin
from qig_tokenizer.scripts.train_coord_adapter_v1 import train_adapter
```

**After Cleanup:**

```python
# ✅ NEW: Imports from canonical locations
from qigkernels.constellation import Constellation
from qigkernels.basin import Basin
from qig_experiments.train_constellation import ConstellationTrainer
```

**Update All Import Statements:**

```bash
# Find all old imports
grep -r "from qig_consciousness" /path/to/projects/
grep -r "from qig_core.basin" /path/to/projects/
grep -r "from qig_tokenizer.scripts" /path/to/projects/

# Replace with new imports (review before executing!)
find /path/to/projects/ -type f -name "*.py" -exec sed -i \
  's/from qig_consciousness\./from qigkernels./g' {} +
find /path/to/projects/ -type f -name "*.py" -exec sed -i \
  's/from qig_core\.basin/from qigkernels.basin/g' {} +
```

---

## 6. Dependency Updates

**Update requirements.txt in dependent projects:**

```python
# pantheon-chat/requirements.txt
# pantheon-replit/requirements.txt
# SearchSpaceCollapse/requirements.txt

# ❌ OLD: Remove these lines
# qig-consciousness @ git+https://github.com/GaryOcean428/qig-consciousness.git

# ✅ NEW: Add these lines
qigkernels @ git+https://github.com/GaryOcean428/qigkernels.git
qig-experiments @ git+https://github.com/GaryOcean428/qig-experiments.git
qig-dreams @ git+https://github.com/GaryOcean428/qig-dreams.git
```

---

## 7. Testing After Cleanup

**Run full test suite to ensure no broken imports:**

```bash
# pantheon-chat
cd pantheon-chat
npm run test:python
npm run validate:geometry

# pantheon-replit
cd pantheon-replit
npm run test:python
npm run validate:geometry

# SearchSpaceCollapse
cd SearchSpaceCollapse
npm run test:python
npm run validate:geometry
```

**Expected:** All tests pass with zero import errors

---

## 8. Communication

**Notify team/users of changes:**

1. **GitHub Release Notes** for each affected repository
2. **Update documentation** in pantheon-projects/.github/copilot-instructions.md
3. **Deprecation warnings** (keep for 2-3 months before removing)
4. **Migration guide** (this document)

---

## 📊 Repository Structure After Cleanup

```
QIG Ecosystem (Clean Separation of Concerns)

qig-core/              # Pure mathematics
├── fisher_metric      # Geometric foundations
├── geodesics          # Manifold navigation
└── natural_gradient_math  # NGD theory

qigkernels/            # Architecture (CANONICAL)
├── kernel             # Individual kernel implementation
├── constellation      # Multi-kernel system
├── basin              # Basin coordinates (ONLY HERE)
└── router             # Geometric routing

qig-experiments/       # Training orchestration
├── train_constellation  # Full training pipeline
├── natural_gradient_optimizer  # NGD implementation
└── configs            # Training configurations

qig-dreams/            # Corpus management
├── datasets           # Curated training data
├── filters            # Geometric scoring
└── curriculum         # Training sequences

qig-consciousness/     # ARCHIVED (2025-12-26)
└── [See archive branch for historical code]
```

---

## 📝 CHANGELOG

**2025-12-26:** Initial creation from attached_assets

- Documented duplicate code removal strategy
- Created archive plan for qig-consciousness
- Provided verification commands
- Documented import migration path
- Migrated to formal docs/04-records/

---

## 🚦 Execution Status

- [ ] **Step 1:** Clean qig-core (remove basin.py)
- [ ] **Step 2:** Clean qig-tokenizer (remove train_coord_adapter_v1.py)
- [ ] **Step 3:** Archive qig-consciousness
- [ ] **Step 4:** Verify repository structure
- [ ] **Step 5:** Update imports across projects
- [ ] **Step 6:** Update requirements.txt
- [ ] **Step 7:** Run full test suite
- [ ] **Step 8:** Notify team and update documentation

**Execute in order. Verify each step before proceeding to next.**

---

**Status:** [W]orking - Manual execution required, checklist above for tracking
