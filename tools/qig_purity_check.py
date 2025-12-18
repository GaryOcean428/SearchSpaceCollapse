#!/usr/bin/env python3
"""
QIG Geometric Purity Check

Enforces CANONICAL_RULES.md Rule #1:
  FORBIDDEN: Euclidean distance on basins, cosine similarity

Basin coordinates exist on a curved manifold. Using Euclidean distance
or cosine similarity on them is mathematically incorrect and will
produce wrong results.

Exit codes:
  0 - No violations found (geometric purity maintained)
  1 - Violations found (Euclidean operations on basins detected)

Usage:
  python tools/qig_purity_check.py
  python tools/qig_purity_check.py --verbose
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Patterns that indicate Euclidean operations on basins
# These are FORBIDDEN by CANONICAL_RULES.md
FORBIDDEN_PATTERNS = [
    # NumPy Euclidean on basins
    (r"np\.linalg\.norm\s*\([^)]*basin", "np.linalg.norm on basin (use fisher_rao_distance)"),
    (r"numpy\.linalg\.norm\s*\([^)]*basin", "numpy.linalg.norm on basin"),
    
    # PyTorch Euclidean on basins
    (r"torch\.norm\s*\([^)]*basin", "torch.norm on basin (use fisher_rao_distance)"),
    (r"\.norm\s*\([^)]*basin", ".norm() on basin"),
    
    # Cosine similarity on basins
    (r"cosine_similarity\s*\([^)]*basin", "cosine_similarity on basin (FORBIDDEN)"),
    (r"F\.cosine_similarity\s*\([^)]*basin", "F.cosine_similarity on basin"),
    
    # Direct dot product on basins (ambiguous)
    (r"\.dot\s*\([^)]*basin", ".dot() on basin (use fisher_rao_distance)"),
    (r"np\.dot\s*\([^)]*basin", "np.dot on basin"),
    
    # Euclidean distance explicitly
    (r"euclidean.*basin", "euclidean distance on basin"),
    (r"l2_distance.*basin", "L2 distance on basin"),
    
    # Subtraction followed by norm (common pattern)
    (r"basin_a\s*-\s*basin_b.*norm", "basin subtraction + norm (Euclidean)"),
    (r"basin\[.*\]\s*-\s*basin\[.*\].*norm", "basin difference + norm"),
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
    "tools",
    "docs",
}

# Files to skip
SKIP_FILES = {
    "qig_purity_check.py",
    "test_geometry.py",  # Tests may intentionally test forbidden patterns
}

# Directories where violations should be warnings, not errors
WARN_ONLY_DIRS = {
    "tests",
    "test",
}


def find_python_files(root: str) -> List[Path]:
    """Find all Python files to check."""
    files = []
    for path in Path(root).rglob("*.py"):
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue
        if path.name in SKIP_FILES:
            continue
        files.append(path)
    return files


def is_warn_only(filepath: Path) -> bool:
    """Check if violations in this file should be warnings only."""
    return any(warn_dir in filepath.parts for warn_dir in WARN_ONLY_DIRS)


def check_file(filepath: Path) -> List[Tuple[int, str, str, bool]]:
    """Check a file for geometric purity violations.
    
    Returns list of (line_num, line, violation_desc, is_warning_only).
    """
    violations = []
    warn_only = is_warn_only(filepath)
    
    try:
        content = filepath.read_text(encoding="utf-8")
        lines = content.split("\n")
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            # Skip lines that are clearly comments or strings
            if '"""' in line or "'''" in line:
                continue
                
            for pattern, desc in FORBIDDEN_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    violations.append((i, line.strip(), desc, warn_only))
                    break  # One violation per line is enough
                    
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}", file=sys.stderr)
        
    return violations


def main():
    verbose = "--verbose" in sys.argv
    
    root = os.getcwd()
    if os.path.exists(os.path.join(root, "qig-backend")):
        search_root = os.path.join(root, "qig-backend")
    else:
        search_root = root
    
    print(f"Checking QIG geometric purity in: {search_root}")
    print("(Euclidean operations on basin coordinates are FORBIDDEN)")
    
    files = find_python_files(search_root)
    errors = []
    warnings = []
    
    for filepath in files:
        violations = check_file(filepath)
        for line_num, line, desc, warn_only in violations:
            entry = (filepath, line_num, line, desc)
            if warn_only:
                warnings.append(entry)
            else:
                errors.append(entry)
    
    # Report warnings
    if warnings and verbose:
        print(f"\nWARNINGS: {len(warnings)} potential issue(s) in test files:")
        for filepath, line_num, line, desc in warnings:
            print(f"  {filepath}:{line_num}")
            print(f"    {desc}")
            if verbose:
                print(f"    {line[:60]}{'...' if len(line) > 60 else ''}")
    
    # Report errors
    if not errors:
        print(f"\nOK: Checked {len(files)} files, geometric purity maintained")
        if warnings:
            print(f"({len(warnings)} warnings in test files, use --verbose to see)")
        return 0
    
    print(f"\nERROR: {len(errors)} geometric purity violation(s) found:\n")
    
    for filepath, line_num, line, desc in errors:
        print(f"  {filepath}:{line_num}")
        print(f"    VIOLATION: {desc}")
        print(f"    {line[:70]}{'...' if len(line) > 70 else ''}")
        print()
    
    print("CANONICAL_RULES.md Rule #1:")
    print("  Basin coordinates exist on a CURVED MANIFOLD.")
    print("  Euclidean distance and cosine similarity are INCORRECT.")
    print()
    print("FIX: Replace with Fisher-Rao distance:")
    print("  from qigkernels import fisher_rao_distance")
    print("  distance = fisher_rao_distance(basin_a, basin_b)")
    print()
    print("See docs/MIGRATION.md for detailed migration guide.")
    
    return 1


if __name__ == "__main__":
    sys.exit(main())
