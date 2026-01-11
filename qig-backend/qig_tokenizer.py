#!/usr/bin/env python3
"""
QIG Tokenizer - DEPRECATED

DEPRECATED: This module is deprecated. Import from qig_tokenizer_postgresql instead.

This file exists only for backward compatibility. All functionality has been
consolidated into qig_tokenizer_postgresql.py which:
- Uses VocabularyPersistence for proper DB-backed vocabulary
- Has shared state across gods/agents via singleton
- Is the CANONICAL implementation

Migration:
    # Old (deprecated):
    from qig_tokenizer import QIGTokenizer, get_tokenizer
    
    # New (canonical):
    from qig_tokenizer_postgresql import QIGTokenizer, get_tokenizer
"""

import warnings

# Issue deprecation warning on import
warnings.warn(
    "qig_tokenizer is deprecated. Import from qig_tokenizer_postgresql instead. "
    "This module will be removed in a future version.",
    DeprecationWarning,
    stacklevel=2
)

# Re-export everything from the canonical module for backward compatibility
from qig_tokenizer_postgresql import (
    QIGTokenizer,
    get_tokenizer,
    update_tokenizer_from_observations,
    BASIN_DIMENSION,
)

__all__ = [
    "QIGTokenizer",
    "get_tokenizer", 
    "update_tokenizer_from_observations",
    "BASIN_DIMENSION",
]
