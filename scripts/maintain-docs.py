#!/usr/bin/env python3
"""
ISO 27001 Documentation Maintenance Script

This script:
1. Validates naming conventions for all documentation files
2. Generates docs/00-index.md from files
3. Checks next_review dates and reports upcoming reviews
4. Reports invalid filenames
"""

import os
import re
import yaml
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Define root directories
DOCS_ROOT = Path(__file__).parent.parent / "docs"

# Naming convention pattern: YYYYMMDD-name-function-versionSTATUS.md
FILENAME_PATTERN = re.compile(
    r'^(\d{8})-([a-z0-9-]+)-([a-z0-9-]+)-(\d+\.\d{2})([FHDRAW])\.md$'
)

# Status mapping
STATUS_MAP = {
    'F': 'Frozen',
    'H': 'Hypothesis',
    'D': 'Deprecated',
    'R': 'Review',
    'W': 'Working',
    'A': 'Approved'
}

STATUS_DESCRIPTIONS = {
    'F': 'Finalized, immutable, enforceable',
    'H': 'Experimental, needs validation',
    'D': 'Superseded, retained for audit',
    'R': 'Awaiting approval',
    'W': 'Active development',
    'A': 'Management sign-off complete'
}


class DocumentMetadata:
    """Represents metadata from a markdown document"""
    
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.filename = filepath.name
        self.frontmatter = self._extract_frontmatter()
        self.valid_naming = self._validate_naming()
        
    def _extract_frontmatter(self) -> Optional[Dict]:
        """Extract YAML frontmatter from markdown file"""
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if not content.startswith('---\n'):
                return None
                
            # Find second --- delimiter
            end_idx = content.find('\n---\n', 4)
            if end_idx == -1:
                return None
                
            yaml_content = content[4:end_idx]
            return yaml.safe_load(yaml_content)
        except Exception as e:
            print(f"Error reading {self.filepath}: {e}")
            return None
    
    def _validate_naming(self) -> bool:
        """Validate filename against naming convention"""
        return FILENAME_PATTERN.match(self.filename) is not None
    
    def get_category_path(self) -> str:
        """Get the category path relative to docs/"""
        return str(self.filepath.relative_to(DOCS_ROOT).parent)
    
    def get_status_code(self) -> Optional[str]:
        """Extract status code from filename"""
        match = FILENAME_PATTERN.match(self.filename)
        if match:
            return match.group(5)
        return None
    
    def get_date(self) -> Optional[str]:
        """Extract date from filename"""
        match = FILENAME_PATTERN.match(self.filename)
        if match:
            return match.group(1)
        return None
    
    def get_version(self) -> Optional[str]:
        """Extract version from filename"""
        match = FILENAME_PATTERN.match(self.filename)
        if match:
            return match.group(4)
        return None


def find_all_docs() -> List[DocumentMetadata]:
    """Find all markdown documents in docs/ directory"""
    docs = []
    
    # Exclude _drafts and _archive from main processing
    for filepath in DOCS_ROOT.rglob("*.md"):
        # Skip index file, drafts, and archives for validation
        if filepath.name == "00-index.md":
            continue
        if "_drafts" in filepath.parts or "_archive" in filepath.parts:
            continue
            
        docs.append(DocumentMetadata(filepath))
    
    return docs


def validate_naming_conventions(docs: List[DocumentMetadata]) -> List[str]:
    """Validate naming conventions and return list of errors"""
    errors = []
    
    for doc in docs:
        if not doc.valid_naming:
            errors.append(
                f"❌ Invalid filename: {doc.filepath.relative_to(DOCS_ROOT)}\n"
                f"   Expected: YYYYMMDD-name-function-versionSTATUS.md"
            )
        
        # Check if frontmatter exists
        if doc.frontmatter is None:
            errors.append(
                f"⚠️  Missing frontmatter: {doc.filepath.relative_to(DOCS_ROOT)}"
            )
        else:
            # Validate required fields
            required_fields = ['id', 'title', 'filename', 'version', 'status', 
                             'function', 'category', 'created', 'last_reviewed', 
                             'next_review']
            missing_fields = [f for f in required_fields if f not in doc.frontmatter]
            
            if missing_fields:
                errors.append(
                    f"⚠️  Missing frontmatter fields in {doc.filepath.relative_to(DOCS_ROOT)}: "
                    f"{', '.join(missing_fields)}"
                )
            
            # Validate filename matches frontmatter
            if 'filename' in doc.frontmatter and doc.frontmatter['filename'] != doc.filename:
                errors.append(
                    f"⚠️  Filename mismatch in {doc.filepath.relative_to(DOCS_ROOT)}:\n"
                    f"   Actual: {doc.filename}\n"
                    f"   In frontmatter: {doc.frontmatter['filename']}"
                )
    
    return errors


def check_review_dates(docs: List[DocumentMetadata]) -> List[str]:
    """Check for upcoming review dates"""
    warnings = []
    today = datetime.now().date()
    warning_threshold = today + timedelta(days=30)
    
    for doc in docs:
        if doc.frontmatter and 'next_review' in doc.frontmatter:
            next_review = doc.frontmatter['next_review']
            
            if next_review == 'N/A':
                continue
                
            try:
                # Handle both string and date objects
                if isinstance(next_review, str):
                    review_date = datetime.strptime(next_review, '%Y-%m-%d').date()
                elif isinstance(next_review, datetime):
                    review_date = next_review.date()
                else:
                    review_date = next_review
                
                if review_date < today:
                    warnings.append(
                        f"🔴 OVERDUE: {doc.filepath.relative_to(DOCS_ROOT)} "
                        f"(due {next_review})"
                    )
                elif review_date <= warning_threshold:
                    warnings.append(
                        f"🟡 UPCOMING: {doc.filepath.relative_to(DOCS_ROOT)} "
                        f"(due {next_review})"
                    )
            except ValueError:
                warnings.append(
                    f"⚠️  Invalid date format in {doc.filepath.relative_to(DOCS_ROOT)}: "
                    f"{next_review}"
                )
    
    return warnings


def generate_index(docs: List[DocumentMetadata]) -> str:
    """Generate the documentation index"""
    
    # Group documents by category
    categories = {
        '01-policies': [],
        '02-procedures': [],
        '03-technical': [],
        '04-records': [],
        '05-decisions': [],
        '06-implementation': [],
        '07-user-guides': [],
        '08-experiments': []
    }
    
    for doc in docs:
        category_path = doc.get_category_path()
        
        # Map to top-level category
        for cat_key in categories.keys():
            if category_path.startswith(cat_key):
                categories[cat_key].append(doc)
                break
    
    # Sort documents within each category by date
    for cat_docs in categories.values():
        cat_docs.sort(key=lambda d: d.get_date() or '', reverse=True)
    
    # Generate markdown
    index_content = """# Documentation Index

**ISO 27001 Compliant Documentation Structure**

Last Updated: {date}

## Status Legend

| Status | Code | Description |
|--------|------|-------------|
| 🟢 Frozen | F | {F} |
| 🔬 Hypothesis | H | {H} |
| ⚫ Deprecated | D | {D} |
| 🟡 Review | R | {R} |
| 🔨 Working | W | {W} |
| ✅ Approved | A | {A} |

## Naming Convention

All documentation follows the pattern: `YYYYMMDD-[document-name]-[function]-[version][STATUS].md`

---

""".format(
        date=datetime.now().strftime('%Y-%m-%d'),
        F=STATUS_DESCRIPTIONS['F'],
        H=STATUS_DESCRIPTIONS['H'],
        D=STATUS_DESCRIPTIONS['D'],
        R=STATUS_DESCRIPTIONS['R'],
        W=STATUS_DESCRIPTIONS['W'],
        A=STATUS_DESCRIPTIONS['A']
    )
    
    # Add each category
    category_titles = {
        '01-policies': '📋 Policies',
        '02-procedures': '📖 Procedures',
        '03-technical': '🔧 Technical Documentation',
        '04-records': '📊 Records',
        '05-decisions': '🎯 Architecture Decision Records',
        '06-implementation': '⚙️ Implementation Guides',
        '07-user-guides': '👥 User Guides',
        '08-experiments': '🧪 Experiments'
    }
    
    for cat_key, cat_title in category_titles.items():
        cat_docs = categories[cat_key]
        
        if not cat_docs:
            continue
            
        index_content += f"\n## {cat_title}\n\n"
        
        for doc in cat_docs:
            status_code = doc.get_status_code() or '?'
            status_emoji = {
                'F': '🟢', 'H': '🔬', 'D': '⚫', 
                'R': '🟡', 'W': '🔨', 'A': '✅'
            }.get(status_code, '❓')
            
            title = doc.frontmatter.get('title', 'Untitled') if doc.frontmatter else doc.filename
            version = doc.get_version() or 'N/A'
            rel_path = doc.filepath.relative_to(DOCS_ROOT)
            
            index_content += f"- {status_emoji} **{title}** (v{version})\n"
            index_content += f"  - File: [`{doc.filename}`]({rel_path})\n"
            
            if doc.frontmatter:
                if 'id' in doc.frontmatter:
                    index_content += f"  - ID: `{doc.frontmatter['id']}`\n"
                if 'function' in doc.frontmatter:
                    index_content += f"  - Function: {doc.frontmatter['function']}\n"
            
            index_content += "\n"
    
    # Add statistics
    total_docs = len(docs)
    status_counts = {}
    for doc in docs:
        status = doc.get_status_code()
        if status:
            status_counts[status] = status_counts.get(status, 0) + 1
    
    index_content += "\n## Statistics\n\n"
    index_content += f"- **Total Documents**: {total_docs}\n"
    
    for status_code, count in sorted(status_counts.items()):
        status_name = STATUS_MAP.get(status_code, 'Unknown')
        index_content += f"- **{status_name}**: {count}\n"
    
    index_content += "\n---\n\n"
    index_content += "*This index is automatically generated by `scripts/maintain-docs.py`*\n"
    
    return index_content


def main():
    """Main function"""
    print("=" * 80)
    print("ISO 27001 Documentation Maintenance")
    print("=" * 80)
    print()
    
    # Find all documents
    print("📁 Scanning documentation...")
    docs = find_all_docs()
    print(f"   Found {len(docs)} documents\n")
    
    # Validate naming conventions
    print("✅ Validating naming conventions...")
    errors = validate_naming_conventions(docs)
    
    if errors:
        print(f"   Found {len(errors)} issue(s):\n")
        for error in errors:
            print(f"   {error}")
        print()
    else:
        print("   ✓ All documents follow naming conventions\n")
    
    # Check review dates
    print("📅 Checking review dates...")
    review_warnings = check_review_dates(docs)
    
    if review_warnings:
        print(f"   Found {len(review_warnings)} review notification(s):\n")
        for warning in review_warnings:
            print(f"   {warning}")
        print()
    else:
        print("   ✓ No reviews due in the next 30 days\n")
    
    # Generate index
    print("📝 Generating documentation index...")
    index_content = generate_index(docs)
    index_path = DOCS_ROOT / "00-index.md"
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)
    
    print(f"   ✓ Index generated: {index_path}\n")
    
    # Summary
    print("=" * 80)
    if errors or review_warnings:
        print("⚠️  Maintenance completed with warnings")
        exit(1)
    else:
        print("✅ Maintenance completed successfully")
        exit(0)


if __name__ == "__main__":
    main()
