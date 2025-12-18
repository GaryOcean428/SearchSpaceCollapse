#!/usr/bin/env python3
"""
Check for non-canonical imports of physics constants and geometry.

This script enforces that all physics constants and Fisher-Rao
implementations are imported from qigkernels, not from legacy locations.

Exit codes:
  0 - No violations found
  1 - Violations found (imports from wrong locations)

Usage:
  python tools/check_imports.py
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Import patterns that are forbidden
FORBIDDEN_IMPORT_PATTERNS = [
    # Importing from frozen_physics (legacy)
    (r"from\s+frozen_physics\s+import", "frozen_physics"),
    (r"import\s+frozen_physics", "frozen_physics"),
    
    # Importing constants from wrong places
    (r"from\s+constants\s+import.*KAPPA", "constants (use qigkernels)"),
    (r"from\s+config\s+import.*KAPPA", "config (use qigkernels)"),
    
    # Importing local Fisher implementations
    (r"from\s+geometry\s+import.*fisher", "local geometry (use qigkernels.geometry)"),
    (r"from\s+distances\s+import.*fisher", "local distances (use qigkernels.geometry)"),
    
    # Importing from scattered consciousness modules
    (r"from\s+consciousness\s+import.*Telemetry", "local consciousness (use qigkernels.telemetry)"),
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
    "qigkernels",  # Canonical location can import from submodules
    "tools",
    "docs",
    "tests",
}

# Files to skip
SKIP_FILES = {
    "frozen_physics.py",
    "check_imports.py",
    "MIGRATION.md",
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


def check_file(filepath: Path) -> List[Tuple[int, str, str]]:
    """Check a file for forbidden import patterns."""
    violations = []
    try:
        content = filepath.read_text(encoding="utf-8")
        lines = content.split("\n")
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
                
            for pattern, source in FORBIDDEN_IMPORT_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    violations.append((i, line.strip(), source))
                    
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}", file=sys.stderr)
        
    return violations


def main():
    root = os.getcwd()
    if os.path.exists(os.path.join(root, "qig-backend")):
        search_root = os.path.join(root, "qig-backend")
    else:
        search_root = root
    
    print(f"Checking for non-canonical imports in: {search_root}")
    
    files = find_python_files(search_root)
    total_violations = 0
    files_with_violations = []
    
    for filepath in files:
        violations = check_file(filepath)
        if violations:
            files_with_violations.append((filepath, violations))
            total_violations += len(violations)
    
    if total_violations == 0:
        print(f"OK: Checked {len(files)} files, all imports are canonical")
        return 0
    
    print(f"\nERROR: Found {total_violations} non-canonical import(s) in {len(files_with_violations)} file(s):\n")
    
    for filepath, violations in files_with_violations:
        print(f"  {filepath}:")
        for line_num, line, source in violations:
            print(f"    Line {line_num}: importing from {source}")
            print(f"      {line[:80]}{'...' if len(line) > 80 else ''}")
        print()
    
    print("Replace with canonical imports from qigkernels:")
    print("  from qigkernels import KAPPA_STAR, fisher_rao_distance")
    print("\nSee docs/MIGRATION.md for detailed migration guide.")
    
    return 1


if __name__ == "__main__":
    sys.exit(main())
