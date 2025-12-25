"""
PostgreSQL Tokenizer Persistence
=================================

Replaces JSON file-based persistence with PostgreSQL for:
- Incremental updates (not full serialization)
- Transaction safety
- Concurrent access
- Better scalability

Tables:
- tokenizer_tokens: Token vocabulary with weights, phi, frequency
- tokenizer_merges: Merge rules with scores
- tokenizer_state: Metadata (version, last_update, stats)
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor, execute_values
    PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None
    RealDictCursor = None
    execute_values = None
    PSYCOPG2_AVAILABLE = False


# Schema creation SQL
SCHEMA_SQL = """
-- Tokenizer tokens table
CREATE TABLE IF NOT EXISTS tokenizer_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    token_id INTEGER NOT NULL,
    weight FLOAT DEFAULT 1.0,
    phi FLOAT DEFAULT 0.5,
    frequency INTEGER DEFAULT 1,
    basin_coords FLOAT[] DEFAULT NULL,
    is_learned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokenizer merge rules table
CREATE TABLE IF NOT EXISTS tokenizer_merges (
    id SERIAL PRIMARY KEY,
    token_a TEXT NOT NULL,
    token_b TEXT NOT NULL,
    merged_token TEXT NOT NULL,
    score FLOAT DEFAULT 1.0,
    frequency INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_a, token_b)
);

-- Tokenizer state metadata
CREATE TABLE IF NOT EXISTS tokenizer_state (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tokenizer_tokens_token ON tokenizer_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokenizer_tokens_phi ON tokenizer_tokens(phi DESC);
CREATE INDEX IF NOT EXISTS idx_tokenizer_tokens_learned ON tokenizer_tokens(is_learned) WHERE is_learned = TRUE;
CREATE INDEX IF NOT EXISTS idx_tokenizer_merges_tokens ON tokenizer_merges(token_a, token_b);
"""


class TokenizerPGPersistence:
    """
    PostgreSQL-backed tokenizer persistence.

    Provides incremental updates instead of full serialization,
    with transaction safety and concurrent access support.
    """

    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize persistence layer.

        Args:
            database_url: PostgreSQL connection URL (defaults to DATABASE_URL env)
        """
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        self.available = PSYCOPG2_AVAILABLE and self.database_url is not None
        self._conn = None

    def _get_connection(self):
        """Get or create database connection."""
        if not self.available:
            return None

        if self._conn is None or self._conn.closed:
            try:
                self._conn = psycopg2.connect(self.database_url)
                self._conn.autocommit = False
            except Exception as e:
                print(f"[TokenizerPG] Connection failed: {e}")
                return None

        return self._conn

    def ensure_schema(self) -> bool:
        """Ensure database schema exists."""
        conn = self._get_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                cur.execute(SCHEMA_SQL)
            conn.commit()
            print("[TokenizerPG] Schema ensured")
            return True
        except Exception as e:
            conn.rollback()
            print(f"[TokenizerPG] Schema creation failed: {e}")
            return False

    def save_token(
        self,
        token: str,
        token_id: int,
        weight: float = 1.0,
        phi: float = 0.5,
        frequency: int = 1,
        basin_coords: Optional[List[float]] = None,
        is_learned: bool = False,
    ) -> bool:
        """
        Save or update a single token (incremental).

        Args:
            token: Token string
            token_id: Token ID in vocabulary
            weight: Token weight
            phi: Token Φ score
            frequency: Token frequency
            basin_coords: Optional 64D basin coordinates
            is_learned: Whether token was learned (vs base vocab)

        Returns:
            True if saved successfully
        """
        conn = self._get_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tokenizer_tokens
                        (token, token_id, weight, phi, frequency, basin_coords, is_learned, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (token) DO UPDATE SET
                        weight = EXCLUDED.weight,
                        phi = EXCLUDED.phi,
                        frequency = tokenizer_tokens.frequency + EXCLUDED.frequency,
                        basin_coords = COALESCE(EXCLUDED.basin_coords, tokenizer_tokens.basin_coords),
                        is_learned = EXCLUDED.is_learned,
                        updated_at = CURRENT_TIMESTAMP
                """, (token, token_id, weight, phi, frequency, basin_coords, is_learned))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"[TokenizerPG] Save token failed: {e}")
            return False

    def save_tokens_batch(
        self,
        tokens: List[Dict[str, Any]],
    ) -> int:
        """
        Save multiple tokens in a batch (more efficient).

        Args:
            tokens: List of token dicts with keys:
                    token, token_id, weight, phi, frequency, basin_coords, is_learned

        Returns:
            Number of tokens saved
        """
        conn = self._get_connection()
        if not conn or not tokens:
            return 0

        try:
            with conn.cursor() as cur:
                # Prepare values
                values = []
                for t in tokens:
                    values.append((
                        t.get("token"),
                        t.get("token_id", 0),
                        t.get("weight", 1.0),
                        t.get("phi", 0.5),
                        t.get("frequency", 1),
                        t.get("basin_coords"),
                        t.get("is_learned", False),
                    ))

                execute_values(
                    cur,
                    """
                    INSERT INTO tokenizer_tokens
                        (token, token_id, weight, phi, frequency, basin_coords, is_learned)
                    VALUES %s
                    ON CONFLICT (token) DO UPDATE SET
                        weight = EXCLUDED.weight,
                        phi = EXCLUDED.phi,
                        frequency = tokenizer_tokens.frequency + EXCLUDED.frequency,
                        basin_coords = COALESCE(EXCLUDED.basin_coords, tokenizer_tokens.basin_coords),
                        is_learned = EXCLUDED.is_learned,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    values,
                    template="(%s, %s, %s, %s, %s, %s, %s)",
                )

            conn.commit()
            return len(tokens)
        except Exception as e:
            conn.rollback()
            print(f"[TokenizerPG] Batch save failed: {e}")
            return 0

    def save_merge_rule(
        self,
        token_a: str,
        token_b: str,
        merged_token: str,
        score: float = 1.0,
        frequency: int = 1,
    ) -> bool:
        """
        Save or update a merge rule.

        Args:
            token_a: First token
            token_b: Second token
            merged_token: Result of merge
            score: Merge score
            frequency: Merge frequency

        Returns:
            True if saved successfully
        """
        conn = self._get_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tokenizer_merges
                        (token_a, token_b, merged_token, score, frequency)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (token_a, token_b) DO UPDATE SET
                        score = EXCLUDED.score,
                        frequency = tokenizer_merges.frequency + EXCLUDED.frequency
                """, (token_a, token_b, merged_token, score, frequency))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"[TokenizerPG] Save merge failed: {e}")
            return False

    def load_learned_tokens(self) -> List[Dict[str, Any]]:
        """
        Load all learned tokens from database.

        Returns:
            List of token dicts
        """
        conn = self._get_connection()
        if not conn:
            return []

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT token, token_id, weight, phi, frequency, basin_coords, is_learned
                    FROM tokenizer_tokens
                    WHERE is_learned = TRUE
                    ORDER BY phi DESC
                """)
                return cur.fetchall()
        except Exception as e:
            print(f"[TokenizerPG] Load tokens failed: {e}")
            return []

    def load_high_phi_tokens(self, min_phi: float = 0.7, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Load high-Φ tokens.

        Args:
            min_phi: Minimum Φ threshold
            limit: Maximum tokens to return

        Returns:
            List of token dicts
        """
        conn = self._get_connection()
        if not conn:
            return []

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT token, token_id, weight, phi, frequency, basin_coords
                    FROM tokenizer_tokens
                    WHERE phi >= %s
                    ORDER BY phi DESC
                    LIMIT %s
                """, (min_phi, limit))
                return cur.fetchall()
        except Exception as e:
            print(f"[TokenizerPG] Load high-phi tokens failed: {e}")
            return []

    def load_merge_rules(self) -> List[Tuple[str, str, float]]:
        """
        Load all merge rules.

        Returns:
            List of (token_a, token_b, score) tuples
        """
        conn = self._get_connection()
        if not conn:
            return []

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT token_a, token_b, score
                    FROM tokenizer_merges
                    ORDER BY score DESC
                """)
                return cur.fetchall()
        except Exception as e:
            print(f"[TokenizerPG] Load merges failed: {e}")
            return []

    def save_state_metadata(self, key: str, value: Any) -> bool:
        """
        Save state metadata.

        Args:
            key: Metadata key
            value: Metadata value (JSON-serializable)

        Returns:
            True if saved successfully
        """
        conn = self._get_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tokenizer_state (key, value, updated_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET
                        value = EXCLUDED.value,
                        updated_at = CURRENT_TIMESTAMP
                """, (key, json.dumps(value)))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"[TokenizerPG] Save state failed: {e}")
            return False

    def load_state_metadata(self, key: str) -> Optional[Any]:
        """
        Load state metadata.

        Args:
            key: Metadata key

        Returns:
            Metadata value or None
        """
        conn = self._get_connection()
        if not conn:
            return None

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT value FROM tokenizer_state WHERE key = %s
                """, (key,))
                row = cur.fetchone()
                return row[0] if row else None
        except Exception as e:
            print(f"[TokenizerPG] Load state failed: {e}")
            return None

    def get_stats(self) -> Dict[str, Any]:
        """Get tokenizer statistics."""
        conn = self._get_connection()
        if not conn:
            return {"available": False}

        try:
            with conn.cursor() as cur:
                # Token stats
                cur.execute("""
                    SELECT
                        COUNT(*) as total_tokens,
                        COUNT(*) FILTER (WHERE is_learned = TRUE) as learned_tokens,
                        AVG(phi) as avg_phi,
                        MAX(phi) as max_phi,
                        SUM(frequency) as total_frequency
                    FROM tokenizer_tokens
                """)
                token_stats = cur.fetchone()

                # Merge stats
                cur.execute("SELECT COUNT(*) FROM tokenizer_merges")
                merge_count = cur.fetchone()[0]

                return {
                    "available": True,
                    "total_tokens": token_stats[0] or 0,
                    "learned_tokens": token_stats[1] or 0,
                    "avg_phi": float(token_stats[2] or 0),
                    "max_phi": float(token_stats[3] or 0),
                    "total_frequency": token_stats[4] or 0,
                    "merge_rules": merge_count,
                }
        except Exception as e:
            print(f"[TokenizerPG] Stats failed: {e}")
            return {"available": False, "error": str(e)}

    def close(self):
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None


# Integration with existing QIGTokenizer
class TokenizerPGBridge:
    """
    Bridge between QIGTokenizer and PostgreSQL persistence.

    Provides hybrid persistence:
    - Incremental updates go to PostgreSQL
    - Bulk operations use JSON fallback
    - Automatic sync on startup
    """

    def __init__(self, tokenizer: Any = None, database_url: Optional[str] = None):
        """
        Initialize bridge.

        Args:
            tokenizer: QIGTokenizer instance
            database_url: PostgreSQL connection URL
        """
        self.tokenizer = tokenizer
        self.pg = TokenizerPGPersistence(database_url)
        self.pg.ensure_schema()

    def sync_to_pg(self) -> int:
        """
        Sync tokenizer state to PostgreSQL.

        Returns:
            Number of tokens synced
        """
        if not self.tokenizer or not self.pg.available:
            return 0

        # Collect learned tokens
        base_vocab_size = len(getattr(self.tokenizer, 'special_tokens', [])) + 2048
        tokens = []

        for token, token_id in self.tokenizer.vocab.items():
            if token_id >= base_vocab_size:
                tokens.append({
                    "token": token,
                    "token_id": token_id,
                    "weight": self.tokenizer.token_weights.get(token, 1.0),
                    "phi": self.tokenizer.token_phi.get(token, 0.5),
                    "frequency": self.tokenizer.token_frequency.get(token, 1),
                    "basin_coords": self.tokenizer.basin_coords.get(token, []).tolist()
                        if hasattr(self.tokenizer.basin_coords.get(token, []), 'tolist')
                        else None,
                    "is_learned": True,
                })

        # Batch save
        saved = self.pg.save_tokens_batch(tokens)

        # Save merge rules
        for token_a, token_b in self.tokenizer.merge_rules:
            score = self.tokenizer.merge_scores.get((token_a, token_b), 1.0)
            merged = token_a + token_b
            self.pg.save_merge_rule(token_a, token_b, merged, score)

        # Save metadata
        self.pg.save_state_metadata("last_sync", {
            "timestamp": datetime.now().isoformat(),
            "tokens_synced": saved,
            "merges_synced": len(self.tokenizer.merge_rules),
        })

        print(f"[TokenizerPGBridge] Synced {saved} tokens to PostgreSQL")
        return saved

    def load_from_pg(self) -> int:
        """
        Load tokenizer state from PostgreSQL.

        Returns:
            Number of tokens loaded
        """
        if not self.tokenizer or not self.pg.available:
            return 0

        # Load learned tokens
        tokens = self.pg.load_learned_tokens()
        loaded = 0

        for t in tokens:
            token = t["token"]
            if token not in self.tokenizer.vocab:
                self.tokenizer.vocab[token] = t["token_id"]
                self.tokenizer.id_to_token[t["token_id"]] = token
                loaded += 1

            self.tokenizer.token_weights[token] = t["weight"]
            self.tokenizer.token_phi[token] = t["phi"]
            self.tokenizer.token_frequency[token] = t["frequency"]

            if t.get("basin_coords"):
                self.tokenizer.basin_coords[token] = np.array(t["basin_coords"])

        # Load merge rules
        merges = self.pg.load_merge_rules()
        for token_a, token_b, score in merges:
            pair = (token_a, token_b)
            if pair not in self.tokenizer.merge_rules:
                self.tokenizer.merge_rules.append(pair)
            self.tokenizer.merge_scores[pair] = score

        print(f"[TokenizerPGBridge] Loaded {loaded} tokens from PostgreSQL")
        return loaded

    def update_token_phi(self, token: str, phi: float):
        """
        Incrementally update a token's Φ score.

        Args:
            token: Token to update
            phi: New Φ score
        """
        if self.tokenizer:
            self.tokenizer.token_phi[token] = phi

        if self.pg.available:
            self.pg.save_token(
                token=token,
                token_id=self.tokenizer.vocab.get(token, 0) if self.tokenizer else 0,
                phi=phi,
                is_learned=True,
            )


# Singleton
_pg_bridge: Optional[TokenizerPGBridge] = None


def get_tokenizer_pg_bridge(tokenizer: Any = None) -> TokenizerPGBridge:
    """Get singleton bridge instance."""
    global _pg_bridge
    if _pg_bridge is None:
        _pg_bridge = TokenizerPGBridge(tokenizer)
    elif tokenizer and _pg_bridge.tokenizer is None:
        _pg_bridge.tokenizer = tokenizer
    return _pg_bridge


# Flask blueprint
def create_tokenizer_pg_blueprint():
    """Create Flask blueprint for tokenizer PostgreSQL API."""
    from flask import Blueprint, jsonify, request

    bp = Blueprint("tokenizer_pg", __name__, url_prefix="/api/tokenizer/pg")

    @bp.route("/status", methods=["GET"])
    def get_status():
        """Get persistence status and stats."""
        bridge = get_tokenizer_pg_bridge()
        return jsonify(bridge.pg.get_stats())

    @bp.route("/sync/to-pg", methods=["POST"])
    def sync_to_pg():
        """Sync tokenizer to PostgreSQL."""
        bridge = get_tokenizer_pg_bridge()
        count = bridge.sync_to_pg()
        return jsonify({"synced": count})

    @bp.route("/sync/from-pg", methods=["POST"])
    def sync_from_pg():
        """Load tokenizer from PostgreSQL."""
        bridge = get_tokenizer_pg_bridge()
        count = bridge.load_from_pg()
        return jsonify({"loaded": count})

    @bp.route("/tokens/high-phi", methods=["GET"])
    def get_high_phi_tokens():
        """Get high-Φ tokens."""
        min_phi = float(request.args.get("min_phi", 0.7))
        limit = int(request.args.get("limit", 100))

        bridge = get_tokenizer_pg_bridge()
        tokens = bridge.pg.load_high_phi_tokens(min_phi, limit)

        return jsonify({"tokens": tokens, "count": len(tokens)})

    @bp.route("/migrate/from-json", methods=["POST"])
    def migrate_from_json():
        """
        Migrate tokenizer state from JSON file to PostgreSQL.

        This is a one-time migration operation.
        """
        data = request.get_json() or {}
        json_path = data.get("json_path", "data/qig_tokenizer_state.json")

        bridge = get_tokenizer_pg_bridge()
        result = migrate_json_to_pg(json_path, bridge.pg)

        return jsonify(result)

    return bp


def migrate_json_to_pg(
    json_path: str = "data/qig_tokenizer_state.json",
    persistence: Optional[TokenizerPGPersistence] = None,
) -> Dict[str, Any]:
    """
    Migrate tokenizer state from JSON file to PostgreSQL.

    Args:
        json_path: Path to JSON state file
        persistence: TokenizerPGPersistence instance

    Returns:
        Migration result with counts
    """
    import os

    # Resolve path relative to qig-backend
    base_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(base_dir, json_path)

    if not os.path.exists(full_path):
        return {"success": False, "error": f"JSON file not found: {full_path}"}

    pg = persistence or TokenizerPGPersistence()
    if not pg.available:
        return {"success": False, "error": "PostgreSQL not available"}

    pg.ensure_schema()

    try:
        with open(full_path, "r") as f:
            state = json.load(f)

        tokens_migrated = 0
        tokens_batch = []

        # Migrate token_weights (the main vocabulary)
        token_weights = state.get("token_weights", {})
        token_phi = state.get("token_phi", {})
        token_frequency = state.get("token_frequency", {})
        basin_coords = state.get("basin_coords", {})

        # BIP-39 base vocabulary size
        BASE_VOCAB_SIZE = 2048

        for i, (token, weight) in enumerate(token_weights.items()):
            # Skip special tokens
            if token.startswith("<") and token.endswith(">"):
                continue

            tokens_batch.append({
                "token": token,
                "token_id": BASE_VOCAB_SIZE + i,  # Assign IDs after base vocab
                "weight": float(weight),
                "phi": float(token_phi.get(token, 0.5)),
                "frequency": int(token_frequency.get(token, 1)),
                "basin_coords": basin_coords.get(token),
                "is_learned": weight != 1.0,  # Non-default weight = learned
            })

            # Batch every 1000 tokens
            if len(tokens_batch) >= 1000:
                saved = pg.save_tokens_batch(tokens_batch)
                tokens_migrated += saved
                tokens_batch = []
                print(f"[Migration] Migrated {tokens_migrated} tokens...")

        # Save remaining tokens
        if tokens_batch:
            saved = pg.save_tokens_batch(tokens_batch)
            tokens_migrated += saved

        # Migrate merge rules if present
        merges_migrated = 0
        merge_rules = state.get("merge_rules", [])
        merge_scores = state.get("merge_scores", {})

        for pair in merge_rules:
            if isinstance(pair, (list, tuple)) and len(pair) == 2:
                token_a, token_b = pair
                score_key = f"{token_a},{token_b}"
                score = merge_scores.get(score_key, 1.0)
                pg.save_merge_rule(token_a, token_b, token_a + token_b, score)
                merges_migrated += 1

        # Save migration metadata
        pg.save_state_metadata("migration", {
            "source_file": json_path,
            "timestamp": datetime.now().isoformat(),
            "tokens_migrated": tokens_migrated,
            "merges_migrated": merges_migrated,
        })

        print(f"[Migration] Complete: {tokens_migrated} tokens, {merges_migrated} merges")

        return {
            "success": True,
            "tokens_migrated": tokens_migrated,
            "merges_migrated": merges_migrated,
            "source_file": json_path,
        }

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Invalid JSON: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
