# Repository Cleanup Instructions

**WARNING**: These operations modify existing repositories. Review carefully.

## 1. Clean qig-core (Remove Duplicates)

```bash
cd qig-core

# Delete duplicate basin code (moved to qigkernels)
git rm -r src/qig_core/basin.py

# Commit
git commit -m "Remove duplicate basin code (canonical version in qigkernels)"
git push
```

**Result**: qig-core contains only pure math (Fisher metrics, geodesics)

---

## 2. Clean qig-tokenizer (Remove Misplaced Script)

```bash
cd qig-tokenizer

# Delete training script (moved to qig-experiments)
git rm scripts/train_coord_adapter_v1.py

# Commit
git commit -m "Remove training script (moved to qig-experiments)"
git push
```

**Result**: qig-tokenizer contains only tokenizer code

---

## 3. Archive qig-consciousness (Functionality Moved)

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
```python
from qig_consciousness.constellation import Constellation
```

New import:
```python
from qigkernels.constellation import Constellation
```

All functionality preserved, just reorganized for clarity.
DEPRECATION

# Commit deprecation
git add README.md
git commit -m "Archive repository - functionality moved to qigkernels/qig-experiments/qig-dreams"
git push
```

**Result**: qig-consciousness archived, users directed to new repos

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

All duplications removed, clean separation of concerns ✓
