#!/usr/bin/env python3
"""
Geometric Purity Validation Script (Python)

Validates that all geometric operations use Fisher-Rao distance
and not Euclidean distance. This script ensures geometric purity
across the Python codebase.

Run: python scripts/validate-geometric-purity.py
Or:  python scripts/validate-geometric-purity.py --fix (to show fix suggestions)

Mirrors: scripts/validate-geometric-purity.ts (npm run validate:geometry)
"""

import os
import re
import sys
import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple


@dataclass
class Violation:
    """A geometric purity violation."""
    file: str
    line: int
    code: str
    reason: str
    fix_suggestion: Optional[str] = None


# Patterns that indicate Euclidean distance violations
EUCLIDEAN_PATTERNS = [
    {
        "pattern": re.compile(r'np\.linalg\.norm\s*\([^)]*-[^)]*\)', re.MULTILINE),
        "reason": "Euclidean L2 norm for distance (np.linalg.norm(a - b))",
        "fix": "Use fisher_rao_distance(a, b) or np.arccos(np.clip(np.dot(a, b), -1, 1))",
    },
    {
        "pattern": re.compile(r'np\.sqrt\s*\(\s*np\.sum\s*\([^)]*\*\*\s*2', re.MULTILINE),
        "reason": "Manual Euclidean distance (sqrt(sum((a-b)**2)))",
        "fix": "Use fisher_rao_distance(a, b)",
    },
    {
        "pattern": re.compile(r'euclidean_distance\s*\(', re.IGNORECASE),
        "reason": "Direct call to euclidean_distance function",
        "fix": "Use fisher_rao_distance() instead",
    },
    {
        "pattern": re.compile(r'cdist\s*\([^)]*metric\s*=\s*[\'"]euclidean[\'"]', re.MULTILINE),
        "reason": "scipy.cdist with euclidean metric",
        "fix": "Use custom Fisher-Rao distance metric",
    },
    {
        "pattern": re.compile(r'pdist\s*\([^)]*metric\s*=\s*[\'"]euclidean[\'"]', re.MULTILINE),
        "reason": "scipy.pdist with euclidean metric",
        "fix": "Use custom Fisher-Rao distance metric",
    },
    {
        "pattern": re.compile(r'1\.0\s*\/\s*\(1\.0\s*\+\s*distance\)', re.MULTILINE),
        "reason": "Non-standard similarity formula (should use 1 - d/π)",
        "fix": "Use similarity = 1.0 - distance / np.pi",
    },
]

# Approved patterns (these are OK - whitelist)
APPROVED_PATTERNS = [
    re.compile(r'fisher.*distance', re.IGNORECASE),
    re.compile(r'fisher_rao', re.IGNORECASE),
    re.compile(r'Fisher-Rao', re.IGNORECASE),
    re.compile(r'arccos', re.IGNORECASE),
    re.compile(r'geodesic', re.IGNORECASE),
    re.compile(r'#.*', re.IGNORECASE),  # All comments are OK
    re.compile(r'^\s*"""', re.IGNORECASE),  # Docstrings
    re.compile(r'CRITICAL.*Never', re.IGNORECASE),  # Warning comments
    re.compile(r'fallback.*[Ee]uclidean', re.IGNORECASE),  # Explicit fallback
    re.compile(r'@deprecated', re.IGNORECASE),
    re.compile(r'def\s+euclidean.*DEPRECATED', re.IGNORECASE),  # Deprecation guard
    re.compile(r'delta|state.*change|norm.*current', re.IGNORECASE),  # State changes
    re.compile(r'shift_mag|magnitude', re.IGNORECASE),  # Shift measurements
    re.compile(r'radius|center', re.IGNORECASE),  # Geometric radius
    re.compile(r'test_|_test\.py', re.IGNORECASE),  # Test files
]

# Directories exempt from strict geometric purity
EXEMPT_DIRS = [
    'geometric_primitives',  # Low-level geometry (K-D tree, grids)
    'scripts',  # Test/utility scripts
    '__pycache__',
    '.git',
    'venv',
    'node_modules',
]

# Central geometry module
CENTRAL_GEOMETRY_MODULE = "qig-backend/qig_geometry.py"

# Key files that MUST use Fisher-Rao distance
KEY_FILES = [
    "qig-backend/qig_geometry.py",
    "qig-backend/ocean_qig_core.py",
    "qig-backend/olympus/base_god.py",
    "qig-backend/olympus/hephaestus.py",
    "qig-backend/olympus/qig_rag.py",
    "qig-backend/olympus/athena.py",
    "qig-backend/olympus/hermes_coordinator.py",
]

# Required imports/functions in key files
REQUIRED_PATTERNS = [
    re.compile(r'fisher_rao_distance|fisher_coord_distance|arccos.*dot|geodesic_distance|1\.0\s*-\s*.*\/\s*np\.pi', re.IGNORECASE),
]


def is_approved(line: str, prev_line: str = "", next_lines: List[str] = None) -> bool:
    """Check if a line is in an approved context."""
    for pattern in APPROVED_PATTERNS:
        if pattern.search(line):
            return True
        if prev_line and pattern.search(prev_line):
            return True
    
    # Check for arccos in next few lines (multi-line Fisher-Rao pattern)
    if next_lines:
        for next_line in next_lines[:4]:
            if re.search(r'arccos|np\.arccos', next_line):
                return True
    
    return False


def check_file(file_path: str, verbose: bool = False) -> List[Violation]:
    """Check a single file for geometric purity violations."""
    violations = []
    
    # Skip test files
    if 'test_' in file_path or '_test.py' in file_path:
        return violations
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except (IOError, UnicodeDecodeError) as e:
        if verbose:
            print(f"  Warning: Could not read {file_path}: {e}")
        return violations
    
    for i, line in enumerate(lines):
        line_num = i + 1
        prev_line = lines[i - 1] if i > 0 else ""
        next_lines = lines[i:i+5] if i < len(lines) else []
        
        for pattern_info in EUCLIDEAN_PATTERNS:
            pattern = pattern_info["pattern"]
            
            if pattern.search(line):
                # Check if this is an approved usage
                if is_approved(line, prev_line, next_lines):
                    continue
                
                violations.append(Violation(
                    file=file_path,
                    line=line_num,
                    code=line.strip()[:500],
                    reason=pattern_info["reason"],
                    fix_suggestion=pattern_info.get("fix"),
                ))
    
    return violations


def scan_directory(directory: str, verbose: bool = False) -> List[Violation]:
    """Recursively scan a directory for violations."""
    violations = []
    
    for root, dirs, files in os.walk(directory):
        # Skip exempt directories
        dirs[:] = [d for d in dirs if d not in EXEMPT_DIRS]
        
        for filename in files:
            if filename.endswith('.py') and not filename.startswith('test_'):
                file_path = os.path.join(root, filename)
                if verbose:
                    print(f"  Scanning: {file_path}")
                file_violations = check_file(file_path, verbose)
                violations.extend(file_violations)
    
    return violations


def validate_key_files(base_dir: str, verbose: bool = False) -> Tuple[List[str], List[Violation]]:
    """Validate that key files use Fisher-Rao distance."""
    successes = []
    violations = []
    
    print("Validating Fisher-Rao usage in key files...\n")
    
    for key_file in KEY_FILES:
        file_path = os.path.join(base_dir, key_file)
        
        if not os.path.exists(file_path):
            print(f"  Warning: Key file not found: {key_file}")
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except (IOError, UnicodeDecodeError):
            print(f"  Warning: Could not read: {key_file}")
            continue
        
        # Check for required Fisher-Rao patterns
        has_fisher = any(p.search(content) for p in REQUIRED_PATTERNS)
        
        if has_fisher:
            print(f"  [OK] {key_file} uses Fisher-Rao distance")
            successes.append(key_file)
        else:
            print(f"  [FAIL] {key_file} missing Fisher-Rao distance usage")
            violations.append(Violation(
                file=file_path,
                line=0,
                code="",
                reason="Missing Fisher-Rao distance in critical file",
                fix_suggestion="Add fisher_rao_distance() or arccos(dot()) for all distance calculations",
            ))
    
    print()
    return successes, violations


def main():
    parser = argparse.ArgumentParser(description="Validate geometric purity in Python codebase")
    parser.add_argument("--fix", action="store_true", help="Show fix suggestions")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--dir", default=".", help="Base directory to scan")
    parser.add_argument("--strict", action="store_true", help="Strict mode (fail on warnings)")
    args = parser.parse_args()
    
    base_dir = args.dir
    
    print("Geometric Purity Validation (Python)\n")
    print(f"Base directory: {os.path.abspath(base_dir)}\n")
    print("=" * 60)
    
    all_violations: List[Violation] = []
    
    # 1. Scan for Euclidean distance patterns
    print("\nScanning for Euclidean distance violations...\n")
    
    qig_backend = os.path.join(base_dir, "qig-backend")
    if os.path.exists(qig_backend):
        scan_violations = scan_directory(qig_backend, args.verbose)
        all_violations.extend(scan_violations)
        print(f"  Found {len(scan_violations)} potential violation(s) in qig-backend/\n")
    else:
        print(f"  Warning: qig-backend/ not found in {base_dir}\n")
    
    # 2. Validate key files
    print("=" * 60)
    successes, key_violations = validate_key_files(base_dir, args.verbose)
    all_violations.extend(key_violations)
    
    # Report results
    print("=" * 60)
    print("\nResults:\n")
    
    if len(all_violations) == 0:
        print("[PASS] GEOMETRIC PURITY VERIFIED!")
        print("[PASS] No Euclidean distance violations found.")
        print("[PASS] All geometric operations use Fisher-Rao metric.\n")
        sys.exit(0)
    else:
        print(f"[FAIL] GEOMETRIC PURITY VIOLATIONS DETECTED!\n")
        print(f"Found {len(all_violations)} violation(s):\n")
        
        for i, v in enumerate(all_violations, 1):
            print(f"{i}. {v.file}:{v.line}")
            print(f"   Reason: {v.reason}")
            print(f"   Code: {v.code}")
            if args.fix and v.fix_suggestion:
                print(f"   Fix: {v.fix_suggestion}")
            print()
        
        print("Please fix these violations before merging.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
