#!/usr/bin/env python3
"""
Check for hardcoded physics constants outside qigkernels.

This script enforces that all physics constants are imported from
qigkernels rather than being hardcoded in individual files.

Exit codes:
  0 - No violations found
  1 - Violations found (constants hardcoded outside qigkernels)

Usage:
  python tools/check_constants.py
  python tools/check_constants.py --fix  # Show suggested fixes
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Patterns that indicate hardcoded constants
FORBIDDEN_PATTERNS = [
    # KAPPA_STAR hardcoded
    (r"KAPPA_STAR\s*=\s*64\.?2?1?", "KAPPA_STAR"),
    (r"kappa_star\s*=\s*64\.?2?1?", "kappa_star"),
    
    # PHI thresholds hardcoded
    (r"PHI_THRESHOLD\s*=\s*0\.7", "PHI_THRESHOLD"),
    (r"PHI_EMERGENCY\s*=\s*0\.5", "PHI_EMERGENCY"),
    
    # Basin dimension hardcoded
    (r"BASIN_DIM\s*=\s*64", "BASIN_DIM"),
    
    # E8 constants hardcoded
    (r"E8_DIMENSION\s*=\s*248", "E8_DIMENSION"),
    (r"E8_ROOTS\s*=\s*240", "E8_ROOTS"),
    (r"E8_RANK\s*=\s*8", "E8_RANK"),
    
    # Lattice kappa values
    (r"KAPPA_3\s*=\s*41", "KAPPA_3"),
    (r"KAPPA_4\s*=\s*64\.4", "KAPPA_4"),
    (r"KAPPA_5\s*=\s*63\.6", "KAPPA_5"),
    (r"KAPPA_6\s*=\s*64\.4", "KAPPA_6"),
    
    # Beta coupling
    (r"BETA_3_TO_4\s*=\s*0\.44", "BETA_3_TO_4"),
]

# Directories to skip
SKIP_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    ".pythonlibs",
    "venv",
    ".venv",
    "dist",
    "build",
    "qigkernels",  # This is the canonical location
    "tools",       # This script itself
    "docs",        # Documentation examples
    "tests",       # Test files may have fixtures
}

# Files to skip
SKIP_FILES = {
    "frozen_physics.py",     # Legacy reference file
    "physics_constants.py",  # Canonical definition
    "check_constants.py",    # This script
    "MIGRATION.md",          # Documentation
}


def find_python_files(root: str) -> List[Path]:
    """Find all Python files to check."""
    files = []
    for path in Path(root).rglob("*.py"):
        # Skip excluded directories
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue
        # Skip excluded files
        if path.name in SKIP_FILES:
            continue
        files.append(path)
    return files


def check_file(filepath: Path) -> List[Tuple[int, str, str]]:
    """Check a file for forbidden patterns. Returns list of (line_num, line, constant_name)."""
    violations = []
    try:
        content = filepath.read_text(encoding="utf-8")
        lines = content.split("\n")
        
        for i, line in enumerate(lines, 1):
            # Skip comments and imports
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if "from qigkernels import" in line:
                continue
            if "from qigkernels." in line:
                continue
                
            for pattern, const_name in FORBIDDEN_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    violations.append((i, line.strip(), const_name))
                    
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}", file=sys.stderr)
        
    return violations


def main():
    show_fix = "--fix" in sys.argv
    
    # Find project root (where qig-backend is)
    root = os.getcwd()
    if os.path.exists(os.path.join(root, "qig-backend")):
        search_root = os.path.join(root, "qig-backend")
    else:
        search_root = root
    
    print(f"Checking for hardcoded physics constants in: {search_root}")
    
    files = find_python_files(search_root)
    total_violations = 0
    files_with_violations = []
    
    for filepath in files:
        violations = check_file(filepath)
        if violations:
            files_with_violations.append((filepath, violations))
            total_violations += len(violations)
    
    if total_violations == 0:
        print(f"OK: Checked {len(files)} files, no hardcoded constants found")
        return 0
    
    print(f"\nERROR: Found {total_violations} hardcoded constant(s) in {len(files_with_violations)} file(s):\n")
    
    for filepath, violations in files_with_violations:
        print(f"  {filepath}:")
        for line_num, line, const_name in violations:
            print(f"    Line {line_num}: {const_name}")
            print(f"      {line[:500]}{'...' if len(line) > 80 else ''}")
            if show_fix:
                print(f"      FIX: from qigkernels import {const_name}")
        print()
    
    print("To fix, replace hardcoded values with imports from qigkernels:")
    print("  from qigkernels import KAPPA_STAR, PHI_THRESHOLD, BASIN_DIM")
    print("\nSee docs/MIGRATION.md for detailed migration guide.")
    
    return 1


if __name__ == "__main__":
    sys.exit(main())
