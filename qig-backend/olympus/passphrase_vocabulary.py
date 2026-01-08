"""
Passphrase Vocabulary Manager
============================

Manages the clean vocabulary database for structured passphrase generation.
Separates base items (words, names, numbers) from variations and attempts.
"""

import os
import json
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import psycopg2
from psycopg2.extras import RealDictCursor


class ItemType(Enum):
    WORD = "word"
    BIP39 = "bip39"
    NAME = "name"
    NUMBER = "number"
    SYMBOL = "symbol"
    PHRASE = "phrase"


class ItemSource(Enum):
    BIP39_WORDLIST = "bip39_wordlist"
    COMMON_NAMES = "common_names"
    ENGLISH_DICT = "english_dict"
    USER_DEFINED = "user_defined"
    LEARNED = "learned"
    MANUAL = "manual"


@dataclass
class VocabularyItem:
    """Represents a vocabulary item."""
    id: str
    base_item: str
    item_type: ItemType
    source: ItemSource
    frequency: int = 0
    phi_avg: float = 0.0
    success_count: int = 0
    near_miss_count: int = 0
    metadata: Dict = None


class PassphraseVocabularyManager:
    """
    Manages passphrase vocabulary - clean words, names, numbers.

    Responsibilities:
    - Load and manage base vocabulary items
    - Track usage statistics
    - Learn new items from high-phi attempts
    - Provide vocabulary for generation
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
            print(f"[VocabManager] Query error: {e}")
            raise

    # =========================================================================
    # Vocabulary Loading
    # =========================================================================

    def load_bip39_wordlist(self, wordlist_path: Optional[str] = None) -> int:
        """Load the full BIP39 wordlist into vocabulary."""
        # Try multiple paths
        possible_paths = [
            wordlist_path,
            os.path.join(os.path.dirname(__file__), '..', 'server', 'bip39-wordlist.txt'),
            os.path.join(os.path.dirname(__file__), '..', 'bip39-wordlist.txt'),
            '/home/braden/Desktop/Dev/pantheon-projects/SearchSpaceCollapse/server/bip39-wordlist.txt',
        ]

        words = []
        for path in possible_paths:
            if path and os.path.exists(path):
                with open(path, 'r') as f:
                    words = [line.strip().lower() for line in f if line.strip()]
                if len(words) == 2048:
                    print(f"[VocabManager] Loaded {len(words)} BIP39 words from {path}")
                    break

        if not words:
            print("[VocabManager] WARNING: Could not load BIP39 wordlist")
            return 0

        # Batch insert
        query = """
            INSERT INTO passphrase_vocabulary (base_item, item_type, source)
            VALUES (%s, 'bip39', 'bip39_wordlist')
            ON CONFLICT (base_item, item_type) DO NOTHING
        """

        conn = self._get_connection()
        inserted = 0
        with conn.cursor() as cur:
            for word in words:
                try:
                    cur.execute(query, (word,))
                    if cur.rowcount > 0:
                        inserted += 1
                except Exception:
                    pass
            conn.commit()

        print(f"[VocabManager] Inserted {inserted} new BIP39 words")
        return inserted

    def load_common_names(self, names: List[str], source: str = "common_names") -> int:
        """Load a list of names into vocabulary."""
        query = """
            INSERT INTO passphrase_vocabulary (base_item, item_type, source)
            VALUES (%s, 'name', %s)
            ON CONFLICT (base_item, item_type) DO NOTHING
        """

        conn = self._get_connection()
        inserted = 0
        with conn.cursor() as cur:
            for name in names:
                try:
                    cur.execute(query, (name.lower(), source))
                    if cur.rowcount > 0:
                        inserted += 1
                except Exception:
                    pass
            conn.commit()

        print(f"[VocabManager] Inserted {inserted} names")
        return inserted

    def add_vocabulary_item(
        self,
        base_item: str,
        item_type: ItemType,
        source: ItemSource = ItemSource.MANUAL,
        metadata: Dict = None
    ) -> Optional[str]:
        """Add a single vocabulary item. Returns ID if successful."""
        query = """
            INSERT INTO passphrase_vocabulary (base_item, item_type, source, metadata)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (base_item, item_type) DO NOTHING
            RETURNING id
        """

        result = self._execute(query, (
            base_item.lower(),
            item_type.value,
            source.value,
            json.dumps(metadata or {})
        ))

        if result and len(result) > 0:
            return result[0]['id']
        return None

    # =========================================================================
    # Vocabulary Retrieval
    # =========================================================================

    def get_vocabulary_by_type(
        self,
        item_type: ItemType,
        limit: int = 100,
        min_phi: float = 0.0,
        order_by: str = "phi_avg"
    ) -> List[VocabularyItem]:
        """Get vocabulary items of a specific type."""
        query = f"""
            SELECT id, base_item, item_type, source, frequency, phi_avg,
                   success_count, near_miss_count, metadata
            FROM passphrase_vocabulary
            WHERE item_type = %s AND phi_avg >= %s
            ORDER BY {order_by} DESC
            LIMIT %s
        """

        results = self._execute(query, (item_type.value, min_phi, limit))
        return [self._row_to_item(row) for row in (results or [])]

    def get_top_vocabulary(
        self,
        limit: int = 50,
        types: List[ItemType] = None
    ) -> List[VocabularyItem]:
        """Get top performing vocabulary items across types."""
        type_filter = ""
        params = [limit]

        if types:
            type_values = [t.value for t in types]
            placeholders = ','.join(['%s'] * len(type_values))
            type_filter = f"WHERE item_type IN ({placeholders})"
            params = type_values + [limit]

        query = f"""
            SELECT id, base_item, item_type, source, frequency, phi_avg,
                   success_count, near_miss_count, metadata
            FROM passphrase_vocabulary
            {type_filter}
            ORDER BY
                CASE WHEN success_count > 0 THEN 1 ELSE 2 END,
                phi_avg DESC,
                frequency DESC
            LIMIT %s
        """

        results = self._execute(query, tuple(params))
        return [self._row_to_item(row) for row in (results or [])]

    def get_random_vocabulary(
        self,
        item_type: ItemType,
        count: int = 10,
        weighted_by_phi: bool = True
    ) -> List[VocabularyItem]:
        """Get random vocabulary items, optionally weighted by phi."""
        if weighted_by_phi:
            # Weighted random selection using phi_avg
            query = """
                SELECT id, base_item, item_type, source, frequency, phi_avg,
                       success_count, near_miss_count, metadata
                FROM passphrase_vocabulary
                WHERE item_type = %s
                ORDER BY random() * (phi_avg + 0.1)  -- Add 0.1 to avoid zero weights
                LIMIT %s
            """
        else:
            query = """
                SELECT id, base_item, item_type, source, frequency, phi_avg,
                       success_count, near_miss_count, metadata
                FROM passphrase_vocabulary
                WHERE item_type = %s
                ORDER BY random()
                LIMIT %s
            """

        results = self._execute(query, (item_type.value, count))
        return [self._row_to_item(row) for row in (results or [])]

    def search_vocabulary(self, pattern: str, limit: int = 20) -> List[VocabularyItem]:
        """Search vocabulary by pattern (supports % wildcards)."""
        query = """
            SELECT id, base_item, item_type, source, frequency, phi_avg,
                   success_count, near_miss_count, metadata
            FROM passphrase_vocabulary
            WHERE base_item LIKE %s
            ORDER BY frequency DESC
            LIMIT %s
        """

        results = self._execute(query, (pattern.lower(), limit))
        return [self._row_to_item(row) for row in (results or [])]

    # =========================================================================
    # Statistics Updates
    # =========================================================================

    def update_item_stats(
        self,
        item_id: str,
        phi: float,
        is_success: bool = False,
        is_near_miss: bool = False
    ) -> bool:
        """Update statistics for a vocabulary item after an attempt."""
        query = """
            UPDATE passphrase_vocabulary
            SET
                frequency = frequency + 1,
                phi_sum = phi_sum + %s,
                success_count = success_count + %s,
                near_miss_count = near_miss_count + %s
            WHERE id = %s
        """

        try:
            self._execute(query, (
                phi,
                1 if is_success else 0,
                1 if is_near_miss else 0,
                item_id
            ), fetch=False)
            return True
        except Exception as e:
            print(f"[VocabManager] Failed to update stats: {e}")
            return False

    def learn_from_attempt(
        self,
        words: List[str],
        phi: float,
        is_success: bool = False,
        is_near_miss: bool = False
    ) -> int:
        """Learn vocabulary from an attempt - adds new items if high phi."""
        learned = 0

        # Only learn from high-phi attempts
        if phi < 0.6 and not is_success:
            return 0

        for word in words:
            word = word.lower().strip()
            if len(word) < 2:
                continue

            # Check if it exists
            existing = self.search_vocabulary(word, limit=1)

            if existing and existing[0].base_item == word:
                # Update existing
                self.update_item_stats(
                    existing[0].id,
                    phi,
                    is_success,
                    is_near_miss
                )
            elif phi >= 0.7 or is_success:
                # Add new learned vocabulary
                # Determine type heuristically
                if word.isdigit():
                    item_type = ItemType.NUMBER
                elif word.isalpha() and len(word) >= 3:
                    item_type = ItemType.WORD
                else:
                    continue  # Skip ambiguous items

                item_id = self.add_vocabulary_item(
                    word,
                    item_type,
                    ItemSource.LEARNED,
                    {"learned_phi": phi, "from_success": is_success}
                )

                if item_id:
                    learned += 1
                    self.update_item_stats(item_id, phi, is_success, is_near_miss)

        return learned

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def get_vocabulary_stats(self) -> Dict:
        """Get overall vocabulary statistics."""
        query = """
            SELECT
                item_type,
                COUNT(*) as count,
                AVG(phi_avg) as avg_phi,
                SUM(frequency) as total_uses,
                SUM(success_count) as total_successes
            FROM passphrase_vocabulary
            GROUP BY item_type
        """

        results = self._execute(query)
        stats = {}
        for row in (results or []):
            stats[row['item_type']] = {
                'count': row['count'],
                'avg_phi': float(row['avg_phi'] or 0),
                'total_uses': row['total_uses'] or 0,
                'total_successes': row['total_successes'] or 0
            }

        return stats

    def _row_to_item(self, row: Dict) -> VocabularyItem:
        """Convert a database row to VocabularyItem."""
        return VocabularyItem(
            id=row['id'],
            base_item=row['base_item'],
            item_type=ItemType(row['item_type']),
            source=ItemSource(row['source']),
            frequency=row['frequency'] or 0,
            phi_avg=float(row['phi_avg'] or 0),
            success_count=row['success_count'] or 0,
            near_miss_count=row['near_miss_count'] or 0,
            metadata=row['metadata'] if isinstance(row['metadata'], dict) else {}
        )

    def close(self):
        """Close database connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()


# Singleton instance
_instance: Optional[PassphraseVocabularyManager] = None


def get_vocabulary_manager() -> PassphraseVocabularyManager:
    """Get singleton vocabulary manager instance."""
    global _instance
    if _instance is None:
        _instance = PassphraseVocabularyManager()
    return _instance
