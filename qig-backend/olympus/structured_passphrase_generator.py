"""
Structured Passphrase Generator
===============================

Generates passphrases from structured vocabulary with:
- Clean base vocabulary (words, names, numbers)
- Traceable variations (l33t, caps, suffixes)
- Pattern tracking and learning
- Full lineage from attempt back to source vocabulary
"""

import os
import json
import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

from .passphrase_vocabulary import (
    PassphraseVocabularyManager,
    VocabularyItem,
    ItemType,
    get_vocabulary_manager
)
from .variation_engine import (
    VariationEngine,
    VariationType,
    Variation,
    get_variation_engine
)


@dataclass
class PassphraseAttempt:
    """Represents a passphrase attempt with full lineage."""
    id: str
    attempt_text: str
    components: List[str]  # Variation IDs
    structure_pattern: str  # e.g., "word+name+number"
    structure_detail: Dict
    phi: Optional[float] = None
    kappa: Optional[float] = None
    result: str = "untested"
    kernel_id: Optional[str] = None
    god_name: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class PatternConfig:
    """Configuration for a passphrase pattern."""
    pattern: str  # e.g., "word+name+number"
    components: List[ItemType]
    variation_types: List[VariationType]
    separator: str = ""
    weight: float = 1.0  # Selection weight


# Predefined patterns with weights based on common passphrase structures
DEFAULT_PATTERNS = [
    PatternConfig(
        pattern="bip39+bip39+bip39",
        components=[ItemType.BIP39, ItemType.BIP39, ItemType.BIP39],
        variation_types=[VariationType.ORIGINAL],
        separator=" ",
        weight=2.0
    ),
    PatternConfig(
        pattern="word+name+number",
        components=[ItemType.WORD, ItemType.NAME, ItemType.NUMBER],
        variation_types=[VariationType.CAPITALIZE, VariationType.L33T_BASIC],
        weight=1.5
    ),
    PatternConfig(
        pattern="name+word+year",
        components=[ItemType.NAME, ItemType.WORD, ItemType.NUMBER],
        variation_types=[VariationType.CAPITALIZE, VariationType.SUFFIX_YEAR],
        weight=1.5
    ),
    PatternConfig(
        pattern="word+number+symbol",
        components=[ItemType.WORD, ItemType.NUMBER, ItemType.SYMBOL],
        variation_types=[VariationType.UPPERCASE, VariationType.L33T_BASIC],
        weight=1.0
    ),
    PatternConfig(
        pattern="name+name+number",
        components=[ItemType.NAME, ItemType.NAME, ItemType.NUMBER],
        variation_types=[VariationType.CAPITALIZE],
        weight=1.0
    ),
    PatternConfig(
        pattern="word+word+word",
        components=[ItemType.WORD, ItemType.WORD, ItemType.WORD],
        variation_types=[VariationType.ORIGINAL, VariationType.L33T_BASIC],
        separator="",
        weight=1.0
    ),
    PatternConfig(
        pattern="bip39+bip39+bip39+bip39",
        components=[ItemType.BIP39, ItemType.BIP39, ItemType.BIP39, ItemType.BIP39],
        variation_types=[VariationType.ORIGINAL],
        separator=" ",
        weight=1.5
    ),
]


class StructuredPassphraseGenerator:
    """
    Generates passphrases with full structure tracking.

    Flow:
    1. Select pattern (word+name+number)
    2. Get vocabulary items for each component
    3. Apply variations to each
    4. Combine into passphrase
    5. Store attempt with full lineage
    """

    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.environ.get('DATABASE_URL')
        self._conn = None
        self.vocab_manager = get_vocabulary_manager()
        self.variation_engine = get_variation_engine()
        self.patterns = DEFAULT_PATTERNS.copy()

    def _get_connection(self):
        """Get or create database connection."""
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.db_url)
        return self._conn

    def _execute(self, query: str, params: tuple = None, fetch: bool = True) -> Optional[List[Dict]]:
        """Execute a query and optionally fetch results."""
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if fetch:
                    return cur.fetchall()
                conn.commit()
                return None
        except Exception as e:
            conn.rollback()
            print(f"[PassphraseGen] Query error: {e}")
            raise

    # =========================================================================
    # Pattern Management
    # =========================================================================

    def add_pattern(self, config: PatternConfig):
        """Add a new pattern configuration."""
        self.patterns.append(config)

    def get_pattern_stats(self) -> List[Dict]:
        """Get statistics for all patterns from database."""
        query = """
            SELECT
                pattern,
                component_count,
                component_types,
                attempt_count,
                success_count,
                near_miss_count,
                success_rate,
                phi_avg,
                phi_max
            FROM passphrase_patterns
            ORDER BY success_rate DESC, phi_avg DESC
        """
        results = self._execute(query)
        return results or []

    def _update_pattern_stats(
        self,
        pattern: str,
        component_types: List[str],
        phi: float,
        is_success: bool = False,
        is_near_miss: bool = False
    ):
        """Update pattern statistics after an attempt."""
        query = """
            INSERT INTO passphrase_patterns
            (pattern, component_count, component_types, attempt_count, success_count,
             near_miss_count, phi_sum, phi_max)
            VALUES (%s, %s, %s, 1, %s, %s, %s, %s)
            ON CONFLICT (pattern) DO UPDATE SET
                attempt_count = passphrase_patterns.attempt_count + 1,
                success_count = passphrase_patterns.success_count + EXCLUDED.success_count,
                near_miss_count = passphrase_patterns.near_miss_count + EXCLUDED.near_miss_count,
                phi_sum = passphrase_patterns.phi_sum + EXCLUDED.phi_sum,
                phi_max = GREATEST(passphrase_patterns.phi_max, EXCLUDED.phi_max)
        """

        try:
            self._execute(query, (
                pattern,
                len(component_types),
                json.dumps(component_types),
                1 if is_success else 0,
                1 if is_near_miss else 0,
                phi,
                phi
            ), fetch=False)
        except Exception as e:
            print(f"[PassphraseGen] Failed to update pattern stats: {e}")

    # =========================================================================
    # Generation
    # =========================================================================

    def select_pattern(self, weighted: bool = True) -> PatternConfig:
        """Select a pattern for generation."""
        if weighted:
            # Weighted random selection
            total_weight = sum(p.weight for p in self.patterns)
            r = random.uniform(0, total_weight)
            cumulative = 0
            for pattern in self.patterns:
                cumulative += pattern.weight
                if r <= cumulative:
                    return pattern
        return random.choice(self.patterns)

    def generate_passphrase(
        self,
        pattern: PatternConfig = None,
        kernel_id: str = None,
        god_name: str = None
    ) -> PassphraseAttempt:
        """
        Generate a structured passphrase.

        Returns PassphraseAttempt with full lineage tracking.
        """
        if pattern is None:
            pattern = self.select_pattern()

        # Get vocabulary items for each component
        vocab_items: List[VocabularyItem] = []
        for item_type in pattern.components:
            items = self.vocab_manager.get_random_vocabulary(
                item_type,
                count=1,
                weighted_by_phi=True
            )
            if items:
                vocab_items.append(items[0])
            else:
                # Fallback: get any item
                fallback = self.vocab_manager.get_top_vocabulary(limit=1, types=[item_type])
                if fallback:
                    vocab_items.append(fallback[0])

        if len(vocab_items) != len(pattern.components):
            print(f"[PassphraseGen] Warning: Could not get all vocabulary items for pattern {pattern.pattern}")

        # Generate and store variations for each item
        variation_ids = []
        varied_texts = []
        structure_detail = {"positions": []}

        for i, vocab_item in enumerate(vocab_items):
            # Select a variation type
            vtype = random.choice(pattern.variation_types) if pattern.variation_types else VariationType.ORIGINAL

            # Generate variation
            varied_text, rules = self.variation_engine.generate_variation(
                vocab_item.base_item,
                vtype
            )

            # Store variation and get ID
            var_id = self.variation_engine.get_or_create_variation(
                vocab_item.id,
                varied_text,
                vtype,
                rules
            )

            variation_ids.append(var_id)
            varied_texts.append(varied_text)

            structure_detail["positions"].append({
                "index": i,
                "vocab_id": vocab_item.id,
                "base_item": vocab_item.base_item,
                "item_type": vocab_item.item_type.value,
                "variation_id": var_id,
                "variation_type": vtype.value,
                "varied_text": varied_text
            })

        # Combine into passphrase
        attempt_text = pattern.separator.join(varied_texts)

        # Store attempt
        attempt_id = self._store_attempt(
            attempt_text=attempt_text,
            components=variation_ids,
            structure_pattern=pattern.pattern,
            structure_detail=structure_detail,
            kernel_id=kernel_id,
            god_name=god_name
        )

        return PassphraseAttempt(
            id=attempt_id,
            attempt_text=attempt_text,
            components=variation_ids,
            structure_pattern=pattern.pattern,
            structure_detail=structure_detail,
            result="untested",
            kernel_id=kernel_id,
            god_name=god_name,
            created_at=datetime.now()
        )

    def generate_batch(
        self,
        count: int = 10,
        pattern: PatternConfig = None,
        kernel_id: str = None,
        god_name: str = None
    ) -> List[PassphraseAttempt]:
        """Generate multiple passphrases."""
        attempts = []
        seen = set()

        while len(attempts) < count:
            attempt = self.generate_passphrase(
                pattern=pattern,
                kernel_id=kernel_id,
                god_name=god_name
            )

            # Avoid duplicates
            if attempt.attempt_text not in seen:
                seen.add(attempt.attempt_text)
                attempts.append(attempt)

        return attempts

    # =========================================================================
    # Database Operations
    # =========================================================================

    def _store_attempt(
        self,
        attempt_text: str,
        components: List[str],
        structure_pattern: str,
        structure_detail: Dict,
        kernel_id: str = None,
        god_name: str = None
    ) -> str:
        """Store a passphrase attempt. Returns attempt ID."""
        query = """
            INSERT INTO passphrase_attempts
            (attempt_text, components, structure_pattern, structure_detail,
             result, kernel_id, god_name)
            VALUES (%s, %s, %s, %s, 'untested', %s, %s)
            ON CONFLICT (attempt_text) DO UPDATE SET
                kernel_id = COALESCE(EXCLUDED.kernel_id, passphrase_attempts.kernel_id)
            RETURNING id
        """

        result = self._execute(query, (
            attempt_text,
            json.dumps(components),
            structure_pattern,
            json.dumps(structure_detail),
            kernel_id,
            god_name
        ))

        if result and len(result) > 0:
            return result[0]['id']
        return f"att_{attempt_text}"

    def record_attempt_result(
        self,
        attempt_id: str = None,
        attempt_text: str = None,
        phi: float = None,
        kappa: float = None,
        result: str = "failure",
        basin_coords: List[float] = None
    ) -> bool:
        """Record the result of testing a passphrase."""
        if not attempt_id and not attempt_text:
            return False

        # Get the attempt
        if attempt_id:
            query = "SELECT * FROM passphrase_attempts WHERE id = %s"
            attempts = self._execute(query, (attempt_id,))
        else:
            query = "SELECT * FROM passphrase_attempts WHERE attempt_text = %s"
            attempts = self._execute(query, (attempt_text,))

        if not attempts:
            return False

        attempt = attempts[0]

        # Update attempt
        update_query = """
            UPDATE passphrase_attempts
            SET phi = %s, kappa = %s, result = %s, basin_coords = %s, tested_at = NOW()
            WHERE id = %s
        """
        self._execute(update_query, (
            phi,
            kappa,
            result,
            basin_coords,
            attempt['id']
        ), fetch=False)

        # Update variation stats
        components = attempt['components']
        if isinstance(components, str):
            components = json.loads(components)

        for var_id in components:
            self.variation_engine.update_variation_stats(
                var_id,
                phi or 0,
                is_success=(result == 'success')
            )

        # Update pattern stats
        is_success = (result == 'success')
        is_near_miss = (result == 'near_miss')

        detail = attempt['structure_detail']
        if isinstance(detail, str):
            detail = json.loads(detail)

        component_types = [p['item_type'] for p in detail.get('positions', [])]

        self._update_pattern_stats(
            attempt['structure_pattern'],
            component_types,
            phi or 0,
            is_success,
            is_near_miss
        )

        # Update vocabulary stats
        for pos in detail.get('positions', []):
            self.vocab_manager.update_item_stats(
                pos['vocab_id'],
                phi or 0,
                is_success,
                is_near_miss
            )

        return True

    def get_attempt_lineage(self, attempt_id: str) -> Dict:
        """Get full lineage of an attempt (for debugging/analysis)."""
        query = """
            SELECT
                pa.*,
                (
                    SELECT json_agg(json_build_object(
                        'variation_id', pv.id,
                        'variation_text', pv.variation_text,
                        'variation_type', pv.variation_type,
                        'base_item', v.base_item,
                        'item_type', v.item_type,
                        'vocab_phi_avg', v.phi_avg,
                        'var_phi_avg', pv.phi_avg
                    ))
                    FROM passphrase_variations pv
                    JOIN passphrase_vocabulary v ON pv.vocabulary_id = v.id
                    WHERE pv.id = ANY(
                        SELECT jsonb_array_elements_text(pa.components)::varchar
                    )
                ) as component_details
            FROM passphrase_attempts pa
            WHERE pa.id = %s
        """

        results = self._execute(query, (attempt_id,))
        if results and len(results) > 0:
            return dict(results[0])
        return {}

    def get_untested_attempts(self, limit: int = 100) -> List[PassphraseAttempt]:
        """Get untested attempts for batch testing."""
        query = """
            SELECT * FROM passphrase_attempts
            WHERE result = 'untested'
            ORDER BY created_at DESC
            LIMIT %s
        """

        results = self._execute(query, (limit,))
        return [self._row_to_attempt(row) for row in (results or [])]

    def get_high_phi_attempts(
        self,
        min_phi: float = 0.7,
        limit: int = 50
    ) -> List[PassphraseAttempt]:
        """Get high-phi attempts for analysis."""
        query = """
            SELECT * FROM passphrase_attempts
            WHERE phi >= %s AND result != 'untested'
            ORDER BY phi DESC
            LIMIT %s
        """

        results = self._execute(query, (min_phi, limit))
        return [self._row_to_attempt(row) for row in (results or [])]

    # =========================================================================
    # Analysis
    # =========================================================================

    def analyze_patterns(self) -> Dict:
        """Analyze pattern effectiveness."""
        stats = self.get_pattern_stats()

        return {
            "total_patterns": len(stats),
            "patterns": stats,
            "best_pattern": stats[0] if stats else None,
            "most_attempted": max(stats, key=lambda x: x.get('attempt_count', 0)) if stats else None
        }

    def get_vocabulary_usage(self) -> Dict:
        """Get vocabulary usage statistics."""
        return self.vocab_manager.get_vocabulary_stats()

    # =========================================================================
    # Utility
    # =========================================================================

    def _row_to_attempt(self, row: Dict) -> PassphraseAttempt:
        """Convert database row to PassphraseAttempt."""
        components = row['components']
        if isinstance(components, str):
            components = json.loads(components)

        detail = row['structure_detail']
        if isinstance(detail, str):
            detail = json.loads(detail)

        return PassphraseAttempt(
            id=row['id'],
            attempt_text=row['attempt_text'],
            components=components,
            structure_pattern=row['structure_pattern'],
            structure_detail=detail,
            phi=row.get('phi'),
            kappa=row.get('kappa'),
            result=row.get('result', 'untested'),
            kernel_id=row.get('kernel_id'),
            god_name=row.get('god_name'),
            created_at=row.get('created_at')
        )

    def close(self):
        """Close database connections."""
        if self._conn and not self._conn.closed:
            self._conn.close()
        self.vocab_manager.close()
        self.variation_engine.close()


# Singleton instance
_instance: Optional[StructuredPassphraseGenerator] = None


def get_passphrase_generator() -> StructuredPassphraseGenerator:
    """Get singleton passphrase generator instance."""
    global _instance
    if _instance is None:
        _instance = StructuredPassphraseGenerator()
    return _instance
