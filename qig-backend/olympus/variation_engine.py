"""
Variation Engine
================

Generates and tracks variations on vocabulary items:
- L33t speak (a→4, e→3, etc.)
- Case variations (UPPER, lower, Title)
- Suffixes/prefixes (numbers, years, symbols)
- Phonetic substitutions
- Keyboard patterns
"""

import os
import json
import random
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import psycopg2
from psycopg2.extras import RealDictCursor

from .passphrase_vocabulary import VocabularyItem, ItemType


class VariationType(Enum):
    ORIGINAL = "original"
    UPPERCASE = "uppercase"
    LOWERCASE = "lowercase"
    CAPITALIZE = "capitalize"
    TITLE_CASE = "title_case"
    L33T_BASIC = "l33t_basic"
    L33T_ADVANCED = "l33t_advanced"
    SUFFIX_NUM = "suffix_num"
    PREFIX_NUM = "prefix_num"
    SUFFIX_YEAR = "suffix_year"
    SUFFIX_SPECIAL = "suffix_special"
    PREFIX_SPECIAL = "prefix_special"
    REVERSED = "reversed"
    DOUBLED = "doubled"
    ABBREVIATED = "abbreviated"
    PHONETIC = "phonetic"
    KEYBOARD_SHIFT = "keyboard_shift"
    CUSTOM = "custom"


@dataclass
class Variation:
    """Represents a variation of a vocabulary item."""
    id: str
    vocabulary_id: str
    variation_text: str
    variation_type: VariationType
    rules_applied: Dict
    frequency: int = 0
    phi_avg: float = 0.0
    success_count: int = 0
    base_item: str = ""  # From joined vocabulary


# L33t speak mappings
L33T_BASIC = {
    'a': '4', 'e': '3', 'i': '1', 'o': '0',
    'A': '4', 'E': '3', 'I': '1', 'O': '0'
}

L33T_ADVANCED = {
    'a': ['4', '@'], 'e': ['3'], 'i': ['1', '!'], 'o': ['0'],
    's': ['$', '5'], 't': ['7', '+'], 'l': ['1', '|'],
    'b': ['8'], 'g': ['9', '6'], 'z': ['2'],
    'A': ['4', '@'], 'E': ['3'], 'I': ['1', '!'], 'O': ['0'],
    'S': ['$', '5'], 'T': ['7', '+'], 'L': ['1', '|'],
    'B': ['8'], 'G': ['9', '6'], 'Z': ['2']
}

# Common suffixes
COMMON_NUMBERS = ['1', '12', '123', '1234', '69', '420', '007', '99', '00']
COMMON_YEARS = ['2024', '2023', '2022', '2021', '2020', '1990', '1989', '1988']
COMMON_SPECIALS = ['!', '@', '#', '$', '!@#', '!!!', '?', '.']

# Phonetic substitutions
PHONETIC_SUBS = {
    'ph': 'f', 'ck': 'k', 'tion': 'shun', 'sion': 'zhun',
    'ight': 'ite', 'ough': 'o', 'ee': 'i', 'oo': 'u'
}


class VariationEngine:
    """
    Engine for generating and managing variations on vocabulary items.

    Creates traceable variations with applied rules, stores them in DB,
    and tracks their performance.
    """

    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.environ.get('DATABASE_URL')
        self._conn = None

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
            print(f"[VariationEngine] Query error: {e}")
            raise

    # =========================================================================
    # Variation Generation
    # =========================================================================

    def generate_variation(
        self,
        text: str,
        variation_type: VariationType,
        **kwargs
    ) -> Tuple[str, Dict]:
        """
        Generate a single variation of text.
        Returns (varied_text, rules_applied).
        """
        rules = {"type": variation_type.value}

        if variation_type == VariationType.ORIGINAL:
            return text, rules

        elif variation_type == VariationType.UPPERCASE:
            return text.upper(), rules

        elif variation_type == VariationType.LOWERCASE:
            return text.lower(), rules

        elif variation_type == VariationType.CAPITALIZE:
            return text.capitalize(), rules

        elif variation_type == VariationType.TITLE_CASE:
            return text.title(), rules

        elif variation_type == VariationType.L33T_BASIC:
            varied = text
            subs = {}
            for char, replacement in L33T_BASIC.items():
                if char in varied:
                    varied = varied.replace(char, replacement)
                    subs[char] = replacement
            rules["substitutions"] = subs
            return varied, rules

        elif variation_type == VariationType.L33T_ADVANCED:
            varied = text
            subs = {}
            for char, replacements in L33T_ADVANCED.items():
                if char in varied:
                    replacement = random.choice(replacements)
                    varied = varied.replace(char, replacement, 1)  # Only first occurrence
                    subs[char] = replacement
            rules["substitutions"] = subs
            return varied, rules

        elif variation_type == VariationType.SUFFIX_NUM:
            num = kwargs.get('number') or random.choice(COMMON_NUMBERS)
            rules["suffix"] = num
            return text + num, rules

        elif variation_type == VariationType.PREFIX_NUM:
            num = kwargs.get('number') or random.choice(COMMON_NUMBERS)
            rules["prefix"] = num
            return num + text, rules

        elif variation_type == VariationType.SUFFIX_YEAR:
            year = kwargs.get('year') or random.choice(COMMON_YEARS)
            rules["suffix"] = year
            return text + year, rules

        elif variation_type == VariationType.SUFFIX_SPECIAL:
            special = kwargs.get('special') or random.choice(COMMON_SPECIALS)
            rules["suffix"] = special
            return text + special, rules

        elif variation_type == VariationType.PREFIX_SPECIAL:
            special = kwargs.get('special') or random.choice(COMMON_SPECIALS)
            rules["prefix"] = special
            return special + text, rules

        elif variation_type == VariationType.REVERSED:
            return text[::-1], rules

        elif variation_type == VariationType.DOUBLED:
            return text + text, rules

        elif variation_type == VariationType.ABBREVIATED:
            # Remove vowels (keep first letter)
            if len(text) > 2:
                abbrev = text[0] + ''.join(c for c in text[1:] if c.lower() not in 'aeiou')
                rules["method"] = "remove_vowels"
                return abbrev, rules
            return text, rules

        elif variation_type == VariationType.PHONETIC:
            varied = text.lower()
            subs = {}
            for pattern, replacement in PHONETIC_SUBS.items():
                if pattern in varied:
                    varied = varied.replace(pattern, replacement)
                    subs[pattern] = replacement
            rules["substitutions"] = subs
            return varied, rules

        elif variation_type == VariationType.KEYBOARD_SHIFT:
            # Shift right on QWERTY keyboard
            shift_map = {
                'q': 'w', 'w': 'e', 'e': 'r', 'r': 't', 't': 'y',
                'a': 's', 's': 'd', 'd': 'f', 'f': 'g',
                'z': 'x', 'x': 'c', 'c': 'v', 'v': 'b'
            }
            varied = ''.join(shift_map.get(c.lower(), c) for c in text)
            rules["shift"] = "right"
            return varied, rules

        return text, rules

    def generate_all_variations(
        self,
        vocab_item: VocabularyItem,
        types: List[VariationType] = None
    ) -> List[Tuple[str, VariationType, Dict]]:
        """
        Generate multiple variations of a vocabulary item.
        Returns list of (varied_text, type, rules).
        """
        if types is None:
            # Default set of variations to generate
            types = [
                VariationType.ORIGINAL,
                VariationType.UPPERCASE,
                VariationType.CAPITALIZE,
                VariationType.L33T_BASIC,
                VariationType.SUFFIX_NUM,
                VariationType.SUFFIX_YEAR,
            ]

        variations = []
        seen = set()

        for vtype in types:
            varied_text, rules = self.generate_variation(vocab_item.base_item, vtype)

            # Avoid duplicates
            if varied_text not in seen:
                seen.add(varied_text)
                variations.append((varied_text, vtype, rules))

        return variations

    # =========================================================================
    # Database Operations
    # =========================================================================

    def store_variation(
        self,
        vocabulary_id: str,
        variation_text: str,
        variation_type: VariationType,
        rules_applied: Dict
    ) -> Optional[str]:
        """Store a variation in the database. Returns variation ID."""
        query = """
            INSERT INTO passphrase_variations
            (vocabulary_id, variation_text, variation_type, rules_applied)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (vocabulary_id, variation_text) DO UPDATE SET
                rules_applied = EXCLUDED.rules_applied
            RETURNING id
        """

        result = self._execute(query, (
            vocabulary_id,
            variation_text,
            variation_type.value,
            json.dumps(rules_applied)
        ))

        if result and len(result) > 0:
            return result[0]['id']
        return None

    def get_or_create_variation(
        self,
        vocabulary_id: str,
        variation_text: str,
        variation_type: VariationType,
        rules_applied: Dict
    ) -> str:
        """Get existing variation or create new one. Returns variation ID."""
        # Check if exists
        query = """
            SELECT id FROM passphrase_variations
            WHERE vocabulary_id = %s AND variation_text = %s
        """
        result = self._execute(query, (vocabulary_id, variation_text))

        if result and len(result) > 0:
            return result[0]['id']

        # Create new
        return self.store_variation(vocabulary_id, variation_text, variation_type, rules_applied)

    def get_variations_for_vocab(
        self,
        vocabulary_id: str,
        limit: int = 50
    ) -> List[Variation]:
        """Get all variations for a vocabulary item."""
        query = """
            SELECT
                pv.id, pv.vocabulary_id, pv.variation_text, pv.variation_type,
                pv.rules_applied, pv.frequency, pv.phi_avg, pv.success_count,
                v.base_item
            FROM passphrase_variations pv
            JOIN passphrase_vocabulary v ON pv.vocabulary_id = v.id
            WHERE pv.vocabulary_id = %s
            ORDER BY pv.phi_avg DESC
            LIMIT %s
        """

        results = self._execute(query, (vocabulary_id, limit))
        return [self._row_to_variation(row) for row in (results or [])]

    def get_top_variations(
        self,
        variation_type: VariationType = None,
        limit: int = 50
    ) -> List[Variation]:
        """Get top performing variations."""
        if variation_type:
            query = """
                SELECT
                    pv.id, pv.vocabulary_id, pv.variation_text, pv.variation_type,
                    pv.rules_applied, pv.frequency, pv.phi_avg, pv.success_count,
                    v.base_item
                FROM passphrase_variations pv
                JOIN passphrase_vocabulary v ON pv.vocabulary_id = v.id
                WHERE pv.variation_type = %s AND pv.frequency > 0
                ORDER BY pv.phi_avg DESC, pv.success_count DESC
                LIMIT %s
            """
            params = (variation_type.value, limit)
        else:
            query = """
                SELECT
                    pv.id, pv.vocabulary_id, pv.variation_text, pv.variation_type,
                    pv.rules_applied, pv.frequency, pv.phi_avg, pv.success_count,
                    v.base_item
                FROM passphrase_variations pv
                JOIN passphrase_vocabulary v ON pv.vocabulary_id = v.id
                WHERE pv.frequency > 0
                ORDER BY pv.phi_avg DESC, pv.success_count DESC
                LIMIT %s
            """
            params = (limit,)

        results = self._execute(query, params)
        return [self._row_to_variation(row) for row in (results or [])]

    def update_variation_stats(
        self,
        variation_id: str,
        phi: float,
        is_success: bool = False
    ) -> bool:
        """Update statistics for a variation after an attempt."""
        query = """
            UPDATE passphrase_variations
            SET
                frequency = frequency + 1,
                phi_sum = phi_sum + %s,
                success_count = success_count + %s
            WHERE id = %s
        """

        try:
            self._execute(query, (
                phi,
                1 if is_success else 0,
                variation_id
            ), fetch=False)
            return True
        except Exception as e:
            print(f"[VariationEngine] Failed to update stats: {e}")
            return False

    # =========================================================================
    # Batch Operations
    # =========================================================================

    def generate_and_store_variations(
        self,
        vocab_item: VocabularyItem,
        types: List[VariationType] = None
    ) -> List[str]:
        """Generate all variations and store them. Returns list of variation IDs."""
        variations = self.generate_all_variations(vocab_item, types)
        ids = []

        for varied_text, vtype, rules in variations:
            var_id = self.store_variation(
                vocab_item.id,
                varied_text,
                vtype,
                rules
            )
            if var_id:
                ids.append(var_id)

        return ids

    def get_random_variation(
        self,
        vocabulary_id: str = None,
        variation_type: VariationType = None
    ) -> Optional[Variation]:
        """Get a random variation, optionally filtered."""
        conditions = []
        params = []

        if vocabulary_id:
            conditions.append("pv.vocabulary_id = %s")
            params.append(vocabulary_id)

        if variation_type:
            conditions.append("pv.variation_type = %s")
            params.append(variation_type.value)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        query = f"""
            SELECT
                pv.id, pv.vocabulary_id, pv.variation_text, pv.variation_type,
                pv.rules_applied, pv.frequency, pv.phi_avg, pv.success_count,
                v.base_item
            FROM passphrase_variations pv
            JOIN passphrase_vocabulary v ON pv.vocabulary_id = v.id
            {where_clause}
            ORDER BY random()
            LIMIT 1
        """

        results = self._execute(query, tuple(params) if params else None)
        if results and len(results) > 0:
            return self._row_to_variation(results[0])
        return None

    # =========================================================================
    # Utility
    # =========================================================================

    def _row_to_variation(self, row: Dict) -> Variation:
        """Convert a database row to Variation."""
        rules = row['rules_applied']
        if isinstance(rules, str):
            rules = json.loads(rules)

        return Variation(
            id=row['id'],
            vocabulary_id=row['vocabulary_id'],
            variation_text=row['variation_text'],
            variation_type=VariationType(row['variation_type']),
            rules_applied=rules,
            frequency=row['frequency'] or 0,
            phi_avg=float(row['phi_avg'] or 0),
            success_count=row['success_count'] or 0,
            base_item=row.get('base_item', '')
        )

    def close(self):
        """Close database connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()


# Singleton instance
_instance: Optional[VariationEngine] = None


def get_variation_engine() -> VariationEngine:
    """Get singleton variation engine instance."""
    global _instance
    if _instance is None:
        _instance = VariationEngine()
    return _instance
