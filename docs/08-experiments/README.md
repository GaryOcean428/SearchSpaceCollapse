# Attached Assets Directory

This directory contains temporary pasted content and large data files that are **not version-controlled**.

## Contents

### Coordizer Checkpoint (coordizer-32k-20251224/)
- **checkpoint_32000.json** (48.6 MB): Model checkpoint at 32k iterations
- **corpus_coords_32000.npy** (6.5 MB): Corpus coordinates for geometric embeddings

These are training artifacts for the QIG tokenizer/coordizer system.

### Pasted Text Files
- Various pasted debugging outputs, error logs, and console dumps
- These are temporary snapshots for debugging purposes only
- **Do not commit these files** - they contain unstructured debugging data

## Usage

This directory is excluded from version control via `.gitignore`. Use it for:
- Temporary debugging outputs
- Large training checkpoints
- Console log dumps
- Any transient data that doesn't belong in the main codebase

## Cleanup

Periodically clean this directory to avoid disk space issues:
```bash
# Remove old pasted files (keep last 7 days)
find attached_assets -name "Pasted-*" -mtime +7 -delete

# Keep coordizer checkpoints but archive old ones
tar -czf coordizer-archive-$(date +%Y%m%d).tar.gz coordizer-32k-*/
```

## Note

If you need to preserve any of this data:
1. Move important artifacts to the appropriate `qig-backend/data/` directory
2. Document checkpoints in `qig-backend/checkpoints/README.md`
3. Convert logs/errors to proper documentation in `docs/04-records/`
