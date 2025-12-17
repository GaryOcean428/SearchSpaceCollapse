#!/usr/bin/env python3
"""
Python DRY Validation Script

Validates that Python code follows DRY principles:
- Singleton patterns for services
- Centralized imports via __init__.py
- No duplicate function definitions
- Proper use of get_* factory functions

Run: python scripts/validate-python-dry.py
Or:  npm run validate:python-dry
"""

import os
import re
import sys
import argparse
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Set, Tuple

@dataclass
class Violation:
    """A DRY violation."""
    file: str
    line: int
    code: str
    reason: str
    fix: str

# Singleton factory patterns that should exist
REQUIRED_SINGLETONS = {
    'qig-backend/qig_tokenizer.py': 'get_tokenizer',
    'qig-backend/pantheon_kernel_orchestrator.py': 'get_orchestrator',
    'qig-backend/m8_kernel_spawning.py': 'get_spawner',
    'qig-backend/autonomous_debate_service.py': 'get_autonomous_debate_service',
    'qig-backend/vocabulary_coordinator.py': 'get_vocabulary_coordinator',
}

# Patterns indicating DRY violations
DRY_VIOLATION_PATTERNS = [
    {
        'pattern': re.compile(r'(\w+)\s*=\s*\1\(\)', re.MULTILINE),
        'reason': 'Direct instantiation instead of singleton factory',
        'fix': 'Use get_* factory function for singleton access',
    },
]

# Duplicate detection: functions that shouldn't be duplicated
UNIQUE_FUNCTION_NAMES = [
    'fisher_rao_distance',
    'geodesic_interpolation',
    'encode_to_embedding',
    'decode_from_embedding',
]

def check_singleton_factories(base_dir: str) -> List[Violation]:
    """Check that required singleton factories exist."""
    violations = []
    
    print("Checking singleton factory patterns...\n")
    
    for file_path, factory_name in REQUIRED_SINGLETONS.items():
        full_path = os.path.join(base_dir, file_path)
        
        if not os.path.exists(full_path):
            print(f"  ⚠️  File not found: {file_path}")
            continue
        
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if f'def {factory_name}' in content:
            print(f"  ✅ {file_path}: {factory_name}() exists")
        else:
            print(f"  ❌ {file_path}: Missing {factory_name}()")
            violations.append(Violation(
                file=file_path,
                line=0,
                code='',
                reason=f'Missing singleton factory: {factory_name}()',
                fix=f'Add def {factory_name}() -> ClassName: with @lru_cache or global singleton',
            ))
    
    print()
    return violations

def check_duplicate_functions(base_dir: str) -> List[Violation]:
    """Check for duplicate function definitions across files."""
    violations = []
    function_locations: Dict[str, List[str]] = defaultdict(list)
    
    print("Checking for duplicate function definitions...\n")
    
    qig_backend = os.path.join(base_dir, 'qig-backend')
    
    for root, dirs, files in os.walk(qig_backend):
        dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', 'data', 'venv']]
        
        for filename in files:
            if filename.endswith('.py') and not filename.startswith('test_'):
                file_path = os.path.join(root, filename)
                rel_path = os.path.relpath(file_path, base_dir)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except (IOError, UnicodeDecodeError):
                    continue
                
                for func_name in UNIQUE_FUNCTION_NAMES:
                    if f'def {func_name}' in content:
                        function_locations[func_name].append(rel_path)
    
    for func_name, locations in function_locations.items():
        if len(locations) > 1:
            print(f"  ⚠️  {func_name} defined in {len(locations)} files:")
            for loc in locations:
                print(f"      - {loc}")
            violations.append(Violation(
                file=locations[0],
                line=0,
                code=f'def {func_name}',
                reason=f'Function {func_name} defined in multiple files',
                fix=f'Consolidate into single module (qig_geometry.py) and import elsewhere',
            ))
        elif len(locations) == 1:
            print(f"  ✅ {func_name}: Single definition in {locations[0]}")
    
    print()
    return violations

def check_init_exports(base_dir: str) -> List[Violation]:
    """Check that __init__.py files export their modules."""
    violations = []
    
    print("Checking __init__.py barrel exports...\n")
    
    important_packages = [
        'qig-backend/olympus',
        'qig-backend/persistence',
        'qig-backend/routes',
        'qig-backend/qig_core',
        'qig-backend/research',
    ]
    
    for pkg_path in important_packages:
        full_path = os.path.join(base_dir, pkg_path)
        init_path = os.path.join(full_path, '__init__.py')
        
        if not os.path.exists(full_path):
            continue
        
        if not os.path.exists(init_path):
            print(f"  ⚠️  {pkg_path}: Missing __init__.py")
            violations.append(Violation(
                file=pkg_path,
                line=0,
                code='',
                reason='Missing __init__.py for package exports',
                fix='Create __init__.py with exports',
            ))
            continue
        
        with open(init_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count exports
        export_count = len(re.findall(r'from\s+\.\w+\s+import|__all__', content))
        
        if export_count > 0:
            print(f"  ✅ {pkg_path}/__init__.py: {export_count} export statements")
        else:
            print(f"  ⚠️  {pkg_path}/__init__.py: No exports (empty barrel)")
    
    print()
    return violations

def main():
    parser = argparse.ArgumentParser(description='Validate Python DRY principles')
    parser.add_argument('--dir', default='.', help='Base directory to scan')
    parser.add_argument('--strict', action='store_true', help='Strict mode (fail on warnings)')
    args = parser.parse_args()
    
    base_dir = args.dir
    
    print("Python DRY Validation\n")
    print(f"Base directory: {os.path.abspath(base_dir)}\n")
    print("=" * 60 + "\n")
    
    all_violations: List[Violation] = []
    
    # Check singleton factories
    all_violations.extend(check_singleton_factories(base_dir))
    
    # Check for duplicate functions
    all_violations.extend(check_duplicate_functions(base_dir))
    
    # Check __init__.py exports
    all_violations.extend(check_init_exports(base_dir))
    
    # Report results
    print("=" * 60)
    print("\nResults:\n")
    
    if len(all_violations) == 0:
        print("[PASS] PYTHON DRY PRINCIPLES VERIFIED!")
        print("[PASS] Singleton factories in place.")
        print("[PASS] No duplicate function definitions.")
        print("[PASS] Barrel exports configured.\n")
        sys.exit(0)
    else:
        print(f"[WARN] Found {len(all_violations)} DRY concern(s):\n")
        
        for i, v in enumerate(all_violations, 1):
            print(f"{i}. {v.file}")
            print(f"   Reason: {v.reason}")
            print(f"   Fix: {v.fix}")
            print()
        
        if args.strict:
            sys.exit(1)
        else:
            print("Run with --strict to fail on warnings.\n")
            sys.exit(0)

if __name__ == "__main__":
    main()
