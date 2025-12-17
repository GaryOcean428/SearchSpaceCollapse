#!/usr/bin/env python3
"""
Migration script to update physics constant imports.

Replaces local KAPPA_STAR definitions with imports from qigkernels.
"""

import re
from pathlib import Path

# Files to update
FILES_TO_UPDATE = [
    "autonomic_kernel.py",
    "autonomous_debate_service.py",
    "beta_attention_measurement.py",
    "consciousness_ethical.py",
    "neural_oscillators.py",
    "neuromodulation_engine.py",
    "ocean_neurochemistry.py",
    "ocean_qig_core.py",
    "ocean_qig_types.py",
    "qig_consciousness_qfi_attention.py",
]

# Pattern to match local KAPPA_STAR definitions
KAPPA_STAR_PATTERN = r"^KAPPA_STAR\s*[:=]\s*[\d.]+.*$"
KAPPA_STAR_ERROR_PATTERN = r"^KAPPA_STAR_ERROR\s*[:=]\s*[\d.]+.*$"


def migrate_file(filepath: Path) -> bool:
    """
    Migrate a single file to use qigkernels imports.
    
    Returns:
        True if file was modified, False otherwise
    """
    print(f"Processing {filepath.name}...")
    
    with open(filepath, 'r') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Check if already imports from qigkernels
    if 'from qigkernels' in content:
        print(f"  ✓ Already imports from qigkernels")
        return False
    
    # Find import section (after docstring)
    import_insert_idx = 0
    in_docstring = False
    for i, line in enumerate(lines):
        if '"""' in line or "'''" in line:
            in_docstring = not in_docstring
        elif not in_docstring and (line.startswith('import ') or line.startswith('from ')):
            import_insert_idx = i
            break
    
    # Find and remove local KAPPA_STAR definitions
    modified = False
    new_lines = []
    for line in lines:
        # Skip local KAPPA_STAR definitions
        if re.match(KAPPA_STAR_PATTERN, line, re.MULTILINE):
            print(f"  - Removed: {line.strip()}")
            modified = True
            continue
        elif re.match(KAPPA_STAR_ERROR_PATTERN, line, re.MULTILINE):
            print(f"  - Removed: {line.strip()}")
            modified = True
            continue
        new_lines.append(line)
    
    if not modified:
        print(f"  ✓ No local KAPPA_STAR found")
        return False
    
    # Add qigkernels import at appropriate location
    import_line = "from qigkernels import KAPPA_STAR, KAPPA_STAR_ERROR, PHI_THRESHOLD, PHI_EMERGENCY, BASIN_DIM"
    
    # Find where to insert (after other imports)
    insert_idx = 0
    for i, line in enumerate(new_lines):
        if line.startswith('import ') or line.startswith('from '):
            insert_idx = i + 1
    
    new_lines.insert(insert_idx, import_line)
    
    # Write back
    with open(filepath, 'w') as f:
        f.write('\n'.join(new_lines))
    
    print(f"  ✓ Added qigkernels import")
    print(f"  ✓ File migrated successfully")
    return True


def main():
    """Run migration on all target files."""
    base_dir = Path(__file__).parent
    
    print("=" * 60)
    print("Migrating Python files to use qigkernels")
    print("=" * 60)
    print()
    
    modified_count = 0
    for filename in FILES_TO_UPDATE:
        filepath = base_dir / filename
        if not filepath.exists():
            print(f"⚠️  Skipping {filename} (not found)")
            continue
        
        if migrate_file(filepath):
            modified_count += 1
        print()
    
    print("=" * 60)
    print(f"Migration complete: {modified_count}/{len(FILES_TO_UPDATE)} files modified")
    print("=" * 60)


if __name__ == "__main__":
    main()
