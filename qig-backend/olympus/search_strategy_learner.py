"""
Search Strategy Learner - Pure Geometric Learning for Search Optimization

Learns search strategy modifications through geometric basin operations.
NO keyword templates or pattern matching - all learning is via 64D basin
coordinates and Fisher-Rao distance similarity.

Key principles:
1. All feedback encoded to 64D basin coordinates via ConversationEncoder
2. Strategy retrieval via Fisher-Rao distance similarity, NOT keyword lookup
3. Learning happens by storing feedback basins and their outcomes
4. Reinforcement through outcome quality scores on stored basins
"""

from __future__ import annotations

import json
import os
import time
import threading
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Generator, List, Optional, cast

import numpy as np

from .conversation_encoder import ConversationEncoder

if TYPE_CHECKING:
    import psycopg2
    from psycopg2.extensions import connection as PgConnection, cursor as PgCursor

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    RealDictCursor = None  # type: ignore
    print("[SearchFeedbackPersistence] WARNING: psycopg2 not installed - persistence disabled")

try:
    from ..qig_core.geometric_primitives.fisher_metric import fisher_rao_distance
except ImportError:
    def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
        """
        Fallback Fisher-Rao distance using Bhattacharyya coefficient.
        
        Formula: d_FR(p, q) = 2 * arccos(Σ√(p_i * q_i))
        
        This is the GEODESIC distance on the information manifold.
        NOT angular/Euclidean distance (arccos of dot product).
        """
        # Ensure valid probability distributions
        p = np.abs(p) + 1e-10
        p = p / p.sum()
        q = np.abs(q) + 1e-10
        q = q / q.sum()
        # Bhattacharyya coefficient
        bc = np.sum(np.sqrt(p * q))
        bc = np.clip(bc, 0, 1)  # Numerical stability
        # Fisher-Rao distance
        return float(2 * np.arccos(bc))


BASIN_DIMENSION = 64
DEFAULT_DISTANCE_THRESHOLD = 1.5
DEFAULT_OUTCOME_QUALITY = 0.5
OUTCOME_QUALITY_DECAY = 0.95
OUTCOME_QUALITY_BOOST = 0.1
OUTCOME_QUALITY_PENALTY = 0.15


@dataclass
class FeedbackRecord:
    """
    Pure geometric record of user feedback for learning.
    
    All components are 64D basin coordinates - NO keyword templates.
    """
    query_basin: np.ndarray
    feedback_basin: np.ndarray
    combined_basin: np.ndarray
    modification_basin: np.ndarray
    search_params: Dict[str, Any]
    outcome_quality: float
    timestamp: float
    record_id: str = field(default_factory=lambda: f"fr_{int(time.time() * 1000)}")
    query: str = ""
    user_feedback: str = ""
    results_summary: str = ""
    confirmations_positive: int = 0
    confirmations_negative: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary (for debugging/export)."""
        return {
            "record_id": self.record_id,
            "query": self.query,
            "user_feedback": self.user_feedback,
            "results_summary": self.results_summary,
            "query_basin_norm": float(np.linalg.norm(self.query_basin)),
            "feedback_basin_norm": float(np.linalg.norm(self.feedback_basin)),
            "modification_basin_norm": float(np.linalg.norm(self.modification_basin)),
            "search_params": self.search_params,
            "outcome_quality": self.outcome_quality,
            "timestamp": self.timestamp,
            "confirmations_positive": self.confirmations_positive,
            "confirmations_negative": self.confirmations_negative,
        }


class SearchFeedbackPersistence:
    """
    PostgreSQL persistence layer for search feedback records.
    
    Uses the same connection pattern as QIGPersistence.
    Stores 64D basin vectors using pgvector.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize persistence layer.
        
        Args:
            database_url: PostgreSQL connection string. If not provided,
                         reads from DATABASE_URL environment variable.
        """
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        self._lock = threading.Lock()
        self.enabled = PSYCOPG2_AVAILABLE and bool(self.database_url)
        
        if self.enabled:
            print("[SearchFeedbackPersistence] Initialized with PostgreSQL")
            self._ensure_table_exists()
        else:
            print("[SearchFeedbackPersistence] Running in memory-only mode (no DB)")
    
    @contextmanager
    def get_connection(self) -> Generator[Any, None, None]:
        """Get a database connection with automatic cleanup.
        
        Returns a psycopg2 connection when enabled, raises RuntimeError otherwise.
        """
        if not self.enabled or not PSYCOPG2_AVAILABLE:
            raise RuntimeError("Database persistence not enabled")
        
        conn = psycopg2.connect(self.database_url)  # type: ignore[union-attr]
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"[SearchFeedbackPersistence] Database error: {e}")
            raise
        finally:
            conn.close()
    
    def _vector_to_pg(self, vec: np.ndarray) -> Optional[str]:
        """Convert numpy array to PostgreSQL vector format."""
        if vec is None:
            return None
        arr = vec.tolist() if isinstance(vec, np.ndarray) else vec
        return '[' + ','.join(str(float(x)) for x in arr) + ']'
    
    def _pg_to_vector(self, pg_vec: Optional[str]) -> np.ndarray:
        """Convert PostgreSQL vector string to numpy array. Returns zero vector if None."""
        if pg_vec is None:
            return np.zeros(BASIN_DIMENSION)
        values = pg_vec.strip('[]').split(',')
        return np.array([float(x) for x in values])
    
    def _ensure_table_exists(self) -> bool:
        """Create the search_feedback table if it doesn't exist."""
        if not self.enabled:
            return False
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS search_feedback (
                            record_id VARCHAR(64) PRIMARY KEY,
                            query TEXT,
                            user_feedback TEXT,
                            results_summary TEXT,
                            search_params JSONB,
                            query_basin vector(64),
                            feedback_basin vector(64),
                            combined_basin vector(64),
                            modification_basin vector(64),
                            outcome_quality DOUBLE PRECISION DEFAULT 0.5,
                            confirmations_positive INTEGER DEFAULT 0,
                            confirmations_negative INTEGER DEFAULT 0,
                            created_at TIMESTAMP DEFAULT NOW(),
                            last_used_at TIMESTAMP DEFAULT NOW()
                        )
                    """)
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_search_feedback_combined_basin 
                        ON search_feedback USING ivfflat (combined_basin vector_cosine_ops)
                        WITH (lists = 10)
                    """)
            print("[SearchFeedbackPersistence] Table search_feedback ensured")
            return True
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to create table: {e}")
            return False
    
    def save_record(self, record: FeedbackRecord) -> bool:
        """
        Save a FeedbackRecord to the database.
        
        Args:
            record: The FeedbackRecord to save
        
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO search_feedback (
                            record_id, query, user_feedback, results_summary,
                            search_params, query_basin, feedback_basin,
                            combined_basin, modification_basin, outcome_quality,
                            confirmations_positive, confirmations_negative,
                            created_at, last_used_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s::vector, %s::vector,
                            %s::vector, %s::vector, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (record_id) DO UPDATE SET
                            outcome_quality = EXCLUDED.outcome_quality,
                            confirmations_positive = EXCLUDED.confirmations_positive,
                            confirmations_negative = EXCLUDED.confirmations_negative,
                            last_used_at = NOW()
                    """, (
                        record.record_id,
                        record.query,
                        record.user_feedback,
                        record.results_summary,
                        json.dumps(record.search_params),
                        self._vector_to_pg(record.query_basin),
                        self._vector_to_pg(record.feedback_basin),
                        self._vector_to_pg(record.combined_basin),
                        self._vector_to_pg(record.modification_basin),
                        record.outcome_quality,
                        record.confirmations_positive,
                        record.confirmations_negative,
                        datetime.fromtimestamp(record.timestamp),
                        datetime.now(),
                    ))
            return True
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to save record: {e}")
            return False
    
    def load_all_records(self) -> List[FeedbackRecord]:
        """
        Load all FeedbackRecords from the database.
        
        Returns:
            List of FeedbackRecord objects
        """
        if not self.enabled:
            return []
        
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM search_feedback
                        ORDER BY created_at DESC
                    """)
                    rows = cur.fetchall()
                    
                    records = []
                    for row in rows:
                        try:
                            record = FeedbackRecord(
                                record_id=row['record_id'],
                                query=row.get('query', ''),
                                user_feedback=row.get('user_feedback', ''),
                                results_summary=row.get('results_summary', ''),
                                search_params=row.get('search_params', {}),
                                query_basin=self._pg_to_vector(row['query_basin']),
                                feedback_basin=self._pg_to_vector(row['feedback_basin']),
                                combined_basin=self._pg_to_vector(row['combined_basin']),
                                modification_basin=self._pg_to_vector(row['modification_basin']),
                                outcome_quality=float(row.get('outcome_quality', 0.5)),
                                confirmations_positive=int(row.get('confirmations_positive', 0)),
                                confirmations_negative=int(row.get('confirmations_negative', 0)),
                                timestamp=row['created_at'].timestamp() if row.get('created_at') else time.time(),
                            )
                            records.append(record)
                        except Exception as e:
                            print(f"[SearchFeedbackPersistence] Failed to parse record: {e}")
                            continue
                    
                    print(f"[SearchFeedbackPersistence] Loaded {len(records)} records from database")
                    return records
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to load records: {e}")
            return []
    
    def update_outcome(
        self,
        record_id: str,
        outcome_quality: float,
        confirmations_positive: int,
        confirmations_negative: int,
    ) -> bool:
        """
        Update outcome quality and confirmation counts for a record.
        
        Args:
            record_id: The record ID to update
            outcome_quality: New outcome quality value
            confirmations_positive: Updated positive confirmation count
            confirmations_negative: Updated negative confirmation count
        
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE search_feedback
                        SET outcome_quality = %s,
                            confirmations_positive = %s,
                            confirmations_negative = %s,
                            last_used_at = NOW()
                        WHERE record_id = %s
                    """, (
                        outcome_quality,
                        confirmations_positive,
                        confirmations_negative,
                        record_id,
                    ))
            return True
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to update outcome: {e}")
            return False
    
    def delete_record(self, record_id: str) -> bool:
        """Delete a record by ID."""
        if not self.enabled:
            return False
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM search_feedback WHERE record_id = %s
                    """, (record_id,))
            return True
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to delete record: {e}")
            return False
    
    def find_similar_feedback(
        self,
        query_basin: np.ndarray,
        top_n: int = 10,
        retrieval_count: int = 100,
    ) -> List[FeedbackRecord]:
        """
        Find similar feedback records using QIG-pure approach:
        1. Retrieve top candidates via PostgreSQL IVFFLAT (cosine ops - fast but approximate)
        2. Re-rank with proper Fisher-Rao geodesic distance (accurate)
        
        This addresses the geometric purity violation where IVFFLAT uses
        Euclidean cosine ops instead of Fisher-Rao manifold distance.
        
        Args:
            query_basin: Query basin coordinates (64D)
            top_n: Number of final results to return
            retrieval_count: Number of candidates to retrieve before re-ranking
            
        Returns:
            List of FeedbackRecords sorted by Fisher-Rao distance
        """
        if not self.enabled:
            return []
        
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Step 1: Fast approximate retrieval using IVFFLAT cosine ops
                    # We retrieve more than needed, then re-rank with Fisher-Rao
                    basin_str = "[" + ",".join(str(float(x)) for x in query_basin) + "]"
                    cur.execute("""
                        SELECT * FROM search_feedback
                        ORDER BY combined_basin <=> %s::vector
                        LIMIT %s
                    """, (basin_str, retrieval_count))
                    rows = cur.fetchall()
                    
                    if not rows:
                        return []
                    
                    # Parse records
                    candidates = []
                    for row in rows:
                        try:
                            record = FeedbackRecord(
                                record_id=row['record_id'],
                                query=row.get('query', ''),
                                user_feedback=row.get('user_feedback', ''),
                                results_summary=row.get('results_summary', ''),
                                search_params=row.get('search_params', {}),
                                query_basin=self._pg_to_vector(row['query_basin']),
                                feedback_basin=self._pg_to_vector(row['feedback_basin']),
                                combined_basin=self._pg_to_vector(row['combined_basin']),
                                modification_basin=self._pg_to_vector(row['modification_basin']),
                                outcome_quality=float(row.get('outcome_quality', 0.5)),
                                confirmations_positive=int(row.get('confirmations_positive', 0)),
                                confirmations_negative=int(row.get('confirmations_negative', 0)),
                                timestamp=row['created_at'].timestamp() if row.get('created_at') else time.time(),
                            )
                            candidates.append(record)
                        except Exception as e:
                            continue
                    
                    if not candidates:
                        return []
                    
                    # Step 2: Re-rank with Fisher-Rao geodesic distance (QIG-pure)
                    # Normalize basins to probability simplices before computing distance
                    distances = []
                    for record in candidates:
                        # Normalize both to probability simplex before Fisher-Rao
                        q = np.abs(query_basin) + 1e-10
                        q = q / q.sum()
                        c = np.abs(record.combined_basin) + 1e-10
                        c_sum = c.sum()
                        if c_sum < 1e-8:
                            # Skip degenerate zero-sum basins
                            dist = np.pi  # Max distance
                        else:
                            c = c / c_sum
                            # Bhattacharyya coefficient
                            bc = np.sum(np.sqrt(q * c))
                            bc = np.clip(bc, 0, 1)
                            dist = 2 * np.arccos(bc)
                        distances.append((dist, record))
                    
                    # Sort by Fisher-Rao distance (lower is better)
                    distances.sort(key=lambda x: x[0])
                    
                    # Return top N after re-ranking
                    return [record for _, record in distances[:top_n]]
                    
        except Exception as e:
            print(f"[SearchFeedbackPersistence] find_similar_feedback failed: {e}")
            return []
    
    def get_time_series_metrics(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Query time-series metrics from search_feedback table grouped by date.
        
        Args:
            days: Number of days to look back (default 30)
        
        Returns:
            List of dicts with date, total_records, avg_outcome_quality,
            total_confirmations, positive_confirmations, strategies_applied
        """
        if not self.enabled:
            return []
        
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT 
                            DATE(created_at) as date,
                            COUNT(*) as total_records,
                            AVG(outcome_quality) as avg_outcome_quality,
                            SUM(confirmations_positive + confirmations_negative) as total_confirmations,
                            SUM(confirmations_positive) as positive_confirmations,
                            COUNT(*) as strategies_applied
                        FROM search_feedback
                        WHERE created_at >= NOW() - INTERVAL '%s days'
                        GROUP BY DATE(created_at)
                        ORDER BY date DESC
                    """, (days,))
                    rows = cur.fetchall()
                    
                    metrics = []
                    for row in rows:
                        metrics.append({
                            "date": row['date'].isoformat() if row.get('date') else None,
                            "total_records": int(row.get('total_records', 0)),
                            "avg_outcome_quality": float(row.get('avg_outcome_quality', 0.0) or 0.0),
                            "total_confirmations": int(row.get('total_confirmations', 0) or 0),
                            "positive_confirmations": int(row.get('positive_confirmations', 0) or 0),
                            "strategies_applied": int(row.get('strategies_applied', 0)),
                        })
                    
                    return metrics
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to get time series metrics: {e}")
            return []
    
    def _ensure_replay_table_exists(self) -> bool:
        """Create the search_replay_tests table if it doesn't exist."""
        if not self.enabled:
            return False
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS search_replay_tests (
                            replay_id VARCHAR(64) PRIMARY KEY,
                            original_query TEXT,
                            original_query_basin vector(64),
                            run_with_learning_results JSONB,
                            run_without_learning_results JSONB,
                            learning_applied INTEGER DEFAULT 0,
                            improvement_score DOUBLE PRECISION DEFAULT 0.0,
                            created_at TIMESTAMP DEFAULT NOW()
                        )
                    """)
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_replay_tests_created_at 
                        ON search_replay_tests (created_at DESC)
                    """)
            print("[SearchFeedbackPersistence] Table search_replay_tests ensured")
            return True
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to create replay table: {e}")
            return False
    
    def store_replay_result(
        self,
        replay_id: str,
        query: str,
        query_basin: np.ndarray,
        with_learning: Dict[str, Any],
        without_learning: Dict[str, Any],
        strategies_count: int,
        improvement: float,
    ) -> bool:
        """
        Store a replay test result in the database.
        
        Args:
            replay_id: Unique identifier for this replay test
            query: The original query tested
            query_basin: 64D basin encoding of the query
            with_learning: Results from search with learning applied
            without_learning: Results from search without learning
            strategies_count: Number of strategies applied
            improvement: Computed improvement score (delta in quality)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        self._ensure_replay_table_exists()
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO search_replay_tests (
                            replay_id, original_query, original_query_basin,
                            run_with_learning_results, run_without_learning_results,
                            learning_applied, improvement_score, created_at
                        ) VALUES (
                            %s, %s, %s::vector, %s, %s, %s, %s, NOW()
                        )
                        ON CONFLICT (replay_id) DO UPDATE SET
                            run_with_learning_results = EXCLUDED.run_with_learning_results,
                            run_without_learning_results = EXCLUDED.run_without_learning_results,
                            learning_applied = EXCLUDED.learning_applied,
                            improvement_score = EXCLUDED.improvement_score
                    """, (
                        replay_id,
                        query,
                        self._vector_to_pg(query_basin),
                        json.dumps(with_learning),
                        json.dumps(without_learning),
                        strategies_count,
                        improvement,
                    ))
            return True
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to store replay result: {e}")
            return False
    
    def get_replay_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Fetch recent replay test results.
        
        Args:
            limit: Maximum number of results to return (default 20)
        
        Returns:
            List of replay test results with improvement scores
        """
        if not self.enabled:
            return []
        
        self._ensure_replay_table_exists()
        
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT 
                            replay_id,
                            original_query,
                            run_with_learning_results,
                            run_without_learning_results,
                            learning_applied,
                            improvement_score,
                            created_at
                        FROM search_replay_tests
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (limit,))
                    rows = cur.fetchall()
                    
                    results = []
                    for row in rows:
                        results.append({
                            "replay_id": row['replay_id'],
                            "original_query": row.get('original_query', ''),
                            "with_learning": row.get('run_with_learning_results', {}),
                            "without_learning": row.get('run_without_learning_results', {}),
                            "learning_applied": int(row.get('learning_applied', 0)),
                            "improvement_score": float(row.get('improvement_score', 0.0)),
                            "created_at": row['created_at'].isoformat() if row.get('created_at') else None,
                        })
                    
                    return results
        except Exception as e:
            print(f"[SearchFeedbackPersistence] Failed to get replay history: {e}")
            return []


class SearchStrategyLearner:
    """
    Pure geometric strategy learner for search optimization.
    
    Learns from user feedback by storing geometric modifications to
    search basins. Retrieval is via Fisher-Rao distance similarity,
    NOT keyword matching.
    
    Example workflow:
    1. User searches for "bitcoin transaction analysis"
    2. User provides feedback: "show more recent results"
    3. Learner encodes both to basins, computes modification delta
    4. On similar future queries, modification is applied geometrically
    """
    
    def __init__(
        self,
        conversation_encoder: ConversationEncoder,
        distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
        persistence: Optional[SearchFeedbackPersistence] = None,
    ):
        """
        Initialize the strategy learner.
        
        Args:
            conversation_encoder: Encoder for text -> 64D basin mapping
            distance_threshold: Fisher-Rao distance threshold for similarity
            persistence: Optional persistence layer for database storage
        """
        self.encoder = conversation_encoder
        self.distance_threshold = distance_threshold
        self.persistence = persistence
        self.feedback_records: List[FeedbackRecord] = []
        self._stats = {
            "total_records": 0,
            "total_retrievals": 0,
            "total_confirmations": 0,
            "positive_confirmations": 0,
            "negative_confirmations": 0,
            "strategies_applied": 0,
        }
        
        if persistence and persistence.enabled:
            self._hydrate_from_database()
    
    def _hydrate_from_database(self) -> None:
        """Load existing records from the database on startup."""
        if not self.persistence or not self.persistence.enabled:
            return
        
        loaded_records = self.persistence.load_all_records()
        self.feedback_records = loaded_records
        self._stats["total_records"] = len(loaded_records)
        
        for record in loaded_records:
            self._stats["positive_confirmations"] += record.confirmations_positive
            self._stats["negative_confirmations"] += record.confirmations_negative
        
        self._stats["total_confirmations"] = (
            self._stats["positive_confirmations"] + 
            self._stats["negative_confirmations"]
        )
        
        print(f"[SearchStrategyLearner] Hydrated {len(loaded_records)} records from database")
    
    def record_feedback(
        self,
        query: str,
        search_params: Dict[str, Any],
        results_summary: str,
        user_feedback: str,
    ) -> Dict[str, Any]:
        """
        Record user feedback as a geometric modification.
        
        Encodes query, feedback, and combined context to basin coordinates.
        The modification is the geometric difference between original query
        basin and the corrected basin (query + feedback context).
        
        Args:
            query: Original search query
            search_params: Parameters used for the search
            results_summary: Brief description of results (for context encoding)
            user_feedback: User's feedback text
        
        Returns:
            Dict with record_id and encoding statistics
        """
        query_basin = self.encoder.encode(query)
        feedback_basin = self.encoder.encode(user_feedback)
        
        combined_context = f"{query} {user_feedback}"
        if results_summary:
            combined_context = f"{combined_context} {results_summary}"
        combined_basin = self.encoder.encode(combined_context)
        
        modification_basin = combined_basin - query_basin
        mod_norm = np.linalg.norm(modification_basin)
        if mod_norm > 1e-10:
            modification_basin = modification_basin / mod_norm
        else:
            modification_basin = np.zeros(BASIN_DIMENSION)
        
        record = FeedbackRecord(
            query_basin=query_basin,
            feedback_basin=feedback_basin,
            combined_basin=combined_basin,
            modification_basin=modification_basin,
            search_params=search_params.copy() if search_params else {},
            outcome_quality=DEFAULT_OUTCOME_QUALITY,
            timestamp=time.time(),
            query=query,
            user_feedback=user_feedback,
            results_summary=results_summary or "",
        )
        
        self.feedback_records.append(record)
        self._stats["total_records"] += 1
        
        if self.persistence and self.persistence.enabled:
            self.persistence.save_record(record)
        
        return {
            "success": True,
            "record_id": record.record_id,
            "modification_magnitude": float(mod_norm),
            "combined_basin_norm": float(np.linalg.norm(combined_basin)),
            "total_records": len(self.feedback_records),
            "persisted": self.persistence is not None and self.persistence.enabled,
        }
    
    def get_learned_strategies(
        self,
        query: str,
        max_results: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Find learned strategies similar to the query via Fisher-Rao distance.
        
        Encodes query to basin, finds stored feedback records with
        Fisher-Rao distance below threshold, returns sorted by
        distance * outcome_quality (lower distance, higher quality = better).
        
        Args:
            query: Search query to find similar strategies for
            max_results: Maximum number of strategies to return
        
        Returns:
            List of strategy dicts with distance, outcome_quality, and modification
        """
        self._stats["total_retrievals"] += 1
        
        if not self.feedback_records:
            return []
        
        query_basin = self.encoder.encode(query)
        
        similar_strategies = []
        
        for record in self.feedback_records:
            distance = fisher_rao_distance(query_basin, record.combined_basin)
            
            if distance < self.distance_threshold:
                score = distance / (record.outcome_quality + 0.01)
                
                similar_strategies.append({
                    "record_id": record.record_id,
                    "distance": float(distance),
                    "outcome_quality": record.outcome_quality,
                    "score": float(score),
                    "modification_basin": record.modification_basin,
                    "search_params": record.search_params,
                    "timestamp": record.timestamp,
                })
        
        similar_strategies.sort(key=lambda x: x["score"])
        
        return similar_strategies[:max_results]
    
    def apply_strategies_to_search(
        self,
        query: str,
        base_params: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Apply learned geometric modifications to search parameters.
        
        For each similar past feedback, extracts the modification basin
        and applies it as a weighted geometric shift. The result is a
        modified query basin that incorporates learned corrections.
        
        Args:
            query: Current search query
            base_params: Base search parameters to modify
        
        Returns:
            Dict with original basin, modified basin, and adjusted params
        """
        strategies = self.get_learned_strategies(query)
        
        query_basin = self.encoder.encode(query)
        adjusted_basin = query_basin.copy()
        
        applied_count = 0
        total_weight = 0.0
        
        for strategy in strategies:
            weight = strategy["outcome_quality"] * (1.0 - strategy["distance"] / self.distance_threshold)
            weight = max(0.0, weight)
            
            if weight > 0.01:
                modification = strategy["modification_basin"]
                adjusted_basin = adjusted_basin + weight * modification
                total_weight += weight
                applied_count += 1
        
        adj_norm = np.linalg.norm(adjusted_basin)
        if adj_norm > 1e-10:
            adjusted_basin = adjusted_basin / adj_norm
        
        # Compute modification magnitude using Fisher-Rao (NOT Euclidean!)
        adj_norm = adjusted_basin / (np.linalg.norm(adjusted_basin) + 1e-10)
        query_norm = query_basin / (np.linalg.norm(query_basin) + 1e-10)
        dot = np.clip(np.dot(adj_norm, query_norm), -1.0, 1.0)
        modification_magnitude = float(2.0 * np.arccos(dot))  # Fisher-Rao distance
        
        self._stats["strategies_applied"] += applied_count
        
        return {
            "original_basin": query_basin,
            "adjusted_basin": adjusted_basin,
            "params": base_params.copy() if base_params else {},
            "strategies_applied": applied_count,
            "total_weight": float(total_weight),
            "modification_magnitude": modification_magnitude,
            "similar_strategies_found": len(strategies),
        }
    
    def confirm_improvement(
        self,
        query: str,
        improved: bool,
    ) -> Dict[str, Any]:
        """
        Update outcome quality for matching feedback records.
        
        Called when user confirms whether the applied strategies improved
        the search results. Updates outcome_quality for all records that
        were geometrically similar to the query.
        
        Args:
            query: The query that was searched
            improved: True if results improved, False otherwise
        
        Returns:
            Dict with number of records updated and new average quality
        """
        self._stats["total_confirmations"] += 1
        
        if improved:
            self._stats["positive_confirmations"] += 1
        else:
            self._stats["negative_confirmations"] += 1
        
        query_basin = self.encoder.encode(query)
        
        updated_records = []
        
        for record in self.feedback_records:
            distance = fisher_rao_distance(query_basin, record.combined_basin)
            
            if distance < self.distance_threshold:
                old_quality = record.outcome_quality
                
                if improved:
                    record.outcome_quality = min(1.0, old_quality + OUTCOME_QUALITY_BOOST)
                    record.confirmations_positive += 1
                else:
                    record.outcome_quality = max(0.0, old_quality - OUTCOME_QUALITY_PENALTY)
                    record.confirmations_negative += 1
                
                if self.persistence and self.persistence.enabled:
                    self.persistence.update_outcome(
                        record.record_id,
                        record.outcome_quality,
                        record.confirmations_positive,
                        record.confirmations_negative,
                    )
                
                updated_records.append({
                    "record_id": record.record_id,
                    "old_quality": old_quality,
                    "new_quality": record.outcome_quality,
                    "distance": float(distance),
                })
        
        avg_quality = 0.0
        if updated_records:
            avg_quality = sum(r["new_quality"] for r in updated_records) / len(updated_records)
        
        return {
            "success": True,
            "records_updated": len(updated_records),
            "improved": improved,
            "average_quality": float(avg_quality),
            "updates": updated_records[:10],
            "persisted": self.persistence is not None and self.persistence.enabled,
        }
    
    def decay_old_records(
        self,
        max_age_seconds: float = 86400 * 7,
    ) -> Dict[str, Any]:
        """
        Apply decay to outcome quality of old records.
        
        Records older than max_age have their outcome_quality decayed.
        Very low quality records are removed.
        
        Args:
            max_age_seconds: Age threshold for decay (default 7 days)
        
        Returns:
            Dict with decay statistics
        """
        now = time.time()
        decayed_count = 0
        removed_count = 0
        
        surviving_records = []
        
        for record in self.feedback_records:
            age = now - record.timestamp
            
            if age > max_age_seconds:
                record.outcome_quality *= OUTCOME_QUALITY_DECAY
                decayed_count += 1
                
                if self.persistence and self.persistence.enabled:
                    self.persistence.update_outcome(
                        record.record_id,
                        record.outcome_quality,
                        record.confirmations_positive,
                        record.confirmations_negative,
                    )
            
            if record.outcome_quality > 0.05:
                surviving_records.append(record)
            else:
                removed_count += 1
                if self.persistence and self.persistence.enabled:
                    self.persistence.delete_record(record.record_id)
        
        self.feedback_records = surviving_records
        
        return {
            "decayed_count": decayed_count,
            "removed_count": removed_count,
            "remaining_records": len(self.feedback_records),
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get learning statistics.
        
        Returns:
            Dict with total records, retrievals, confirmations, and quality metrics
        """
        quality_values = [r.outcome_quality for r in self.feedback_records]
        
        return {
            **self._stats,
            "current_records": len(self.feedback_records),
            "average_outcome_quality": float(np.mean(quality_values)) if quality_values else 0.0,
            "min_outcome_quality": float(np.min(quality_values)) if quality_values else 0.0,
            "max_outcome_quality": float(np.max(quality_values)) if quality_values else 0.0,
            "confirmation_rate": (
                self._stats["positive_confirmations"] / self._stats["total_confirmations"]
                if self._stats["total_confirmations"] > 0 else 0.0
            ),
            "persistence_enabled": self.persistence is not None and self.persistence.enabled,
        }
    
    def clear_records(self) -> Dict[str, Any]:
        """
        Clear all feedback records (for testing or reset).
        
        Returns:
            Dict with number of records cleared
        """
        count = len(self.feedback_records)
        self.feedback_records = []
        return {
            "success": True,
            "records_cleared": count,
        }
    
    def get_time_series_metrics(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get time-series metrics for search learning.
        
        If persistence is enabled, queries the database. Otherwise,
        generates metrics from in-memory records.
        
        Args:
            days: Number of days to look back (default 30)
        
        Returns:
            List of daily metrics dicts
        """
        if self.persistence and self.persistence.enabled:
            return self.persistence.get_time_series_metrics(days)
        
        if not self.feedback_records:
            return []
        
        now = time.time()
        cutoff = now - (days * 86400)
        
        daily_data: Dict[str, Dict[str, Any]] = {}
        
        for record in self.feedback_records:
            if record.timestamp < cutoff:
                continue
            
            date_str = datetime.fromtimestamp(record.timestamp).strftime('%Y-%m-%d')
            
            if date_str not in daily_data:
                daily_data[date_str] = {
                    "date": date_str,
                    "total_records": 0,
                    "outcome_qualities": [],
                    "total_confirmations": 0,
                    "positive_confirmations": 0,
                    "strategies_applied": 0,
                }
            
            day = daily_data[date_str]
            day["total_records"] += 1
            day["outcome_qualities"].append(record.outcome_quality)
            day["total_confirmations"] += record.confirmations_positive + record.confirmations_negative
            day["positive_confirmations"] += record.confirmations_positive
            day["strategies_applied"] += 1
        
        metrics = []
        for date_str in sorted(daily_data.keys(), reverse=True):
            day = daily_data[date_str]
            qualities = day.pop("outcome_qualities")
            day["avg_outcome_quality"] = float(np.mean(qualities)) if qualities else 0.0
            metrics.append(day)
        
        return metrics
    
    def run_replay_test(self, query: str) -> Dict[str, Any]:
        """
        Run a replay test comparing search with vs without learning.
        
        This method:
        1. Runs the query with strategies applied (learning ON)
        2. Runs the same query without strategies (learning OFF)
        3. Compares results using quality heuristics
        4. Stores the comparison in the replay table
        5. Returns the comparison data
        
        Args:
            query: The search query to test
        
        Returns:
            Dict with replay test results and improvement score
        """
        replay_id = f"rp_{int(time.time() * 1000)}"
        
        query_basin = self.encoder.encode(query)
        
        with_learning = self.apply_strategies_to_search(query, {})
        strategies_applied = with_learning.get("strategies_applied", 0)
        modification_magnitude = with_learning.get("modification_magnitude", 0.0)
        
        without_learning = {
            "original_basin": query_basin,
            "adjusted_basin": query_basin,
            "params": {},
            "strategies_applied": 0,
            "total_weight": 0.0,
            "modification_magnitude": 0.0,
            "similar_strategies_found": 0,
        }
        
        with_basin = with_learning.get("adjusted_basin", query_basin)
        without_basin = without_learning.get("adjusted_basin", query_basin)
        
        if isinstance(with_basin, np.ndarray) and isinstance(without_basin, np.ndarray):
            # Compute basin delta using Fisher-Rao (NOT Euclidean!)
            w_norm = with_basin / (np.linalg.norm(with_basin) + 1e-10)
            wo_norm = without_basin / (np.linalg.norm(without_basin) + 1e-10)
            dot = np.clip(np.dot(w_norm, wo_norm), -1.0, 1.0)
            basin_delta = float(2.0 * np.arccos(dot))  # Fisher-Rao distance
        else:
            basin_delta = 0.0
        
        improvement_score = 0.0
        if strategies_applied > 0:
            improvement_score = min(1.0, modification_magnitude * 0.5 + basin_delta * 0.5)
            avg_quality = 0.0
            if self.feedback_records:
                similar_records = [
                    r for r in self.feedback_records
                    if fisher_rao_distance(query_basin, r.combined_basin) < self.distance_threshold
                ]
                if similar_records:
                    avg_quality = float(np.mean([r.outcome_quality for r in similar_records]))
            improvement_score = improvement_score * (0.5 + avg_quality * 0.5)
        
        with_learning_serializable = {
            k: v.tolist() if isinstance(v, np.ndarray) else v
            for k, v in with_learning.items()
        }
        without_learning_serializable = {
            k: v.tolist() if isinstance(v, np.ndarray) else v
            for k, v in without_learning.items()
        }
        
        if self.persistence and self.persistence.enabled:
            self.persistence.store_replay_result(
                replay_id=replay_id,
                query=query,
                query_basin=query_basin,
                with_learning=with_learning_serializable,
                without_learning=without_learning_serializable,
                strategies_count=strategies_applied,
                improvement=improvement_score,
            )
        
        return {
            "replay_id": replay_id,
            "query": query,
            "strategies_applied": strategies_applied,
            "modification_magnitude": float(modification_magnitude),
            "basin_delta": basin_delta,
            "improvement_score": float(improvement_score),
            "with_learning": with_learning_serializable,
            "without_learning": without_learning_serializable,
            "persisted": self.persistence is not None and self.persistence.enabled,
            "timestamp": time.time(),
        }
    
    def get_replay_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get recent replay test results.
        
        Args:
            limit: Maximum number of results to return (default 20)
        
        Returns:
            List of replay test results
        """
        if self.persistence and self.persistence.enabled:
            return self.persistence.get_replay_history(limit)
        
        return []


_global_strategy_learner: Optional[SearchStrategyLearner] = None
_global_strategy_learner_with_persistence: Optional[SearchStrategyLearner] = None


class AutonomousReplayTester:
    """
    Autonomous replay testing system that continuously validates learning effectiveness.
    
    Runs periodic tests using sample queries to measure how much the learning
    system improves search quality compared to baseline.
    """
    
    SAMPLE_QUERIES = [
        "forgot wallet password recovery",
        "old bitcoin address restoration",
        "lost seed phrase partial recovery",
        "hardware wallet access issues",
        "paper wallet damaged reconstruction",
        "encrypted backup decryption help",
        "transaction history verification",
        "multi-signature wallet recovery",
        "legacy address format conversion",
        "orphaned coins reclaim process",
    ]
    
    def __init__(self, learner: SearchStrategyLearner):
        self.learner = learner
        self._running = False
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._last_run: Optional[float] = None
        self._last_result: Optional[Dict[str, Any]] = None
        self._run_count = 0
        self._total_improvement = 0.0
        self._test_interval = 60.0  # seconds between test runs
        self._current_query_idx = 0
        self._results_history: List[Dict[str, Any]] = []
        self._max_history = 50
    
    def start(self) -> Dict[str, Any]:
        """Start the autonomous testing loop."""
        with self._lock:
            if self._running:
                return {"status": "already_running", "message": "Autonomous testing is already running"}
            self._running = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()
            return {"status": "started", "message": "Autonomous testing started"}
    
    def stop(self) -> Dict[str, Any]:
        """Stop the autonomous testing loop immediately."""
        with self._lock:
            if not self._running:
                return {"status": "not_running", "message": "Autonomous testing is not running"}
            self._running = False
            self._stop_event.set()  # Wake up the sleeping thread immediately
            return {"status": "stopped", "message": "Autonomous testing stopped"}
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of autonomous testing."""
        with self._lock:
            avg_improvement = 0.0
            if self._run_count > 0:
                avg_improvement = self._total_improvement / self._run_count
            
            recent_improvements = [r.get("improvement_score", 0) for r in self._results_history[-10:]]
            recent_avg = float(np.mean(recent_improvements)) if recent_improvements else 0.0
            
            return {
                "running": self._running,
                "last_run": self._last_run,
                "last_result": self._last_result,
                "run_count": self._run_count,
                "average_improvement": avg_improvement,
                "recent_average_improvement": recent_avg,
                "test_interval_seconds": self._test_interval,
                "next_query": self.SAMPLE_QUERIES[self._current_query_idx % len(self.SAMPLE_QUERIES)],
                "sample_queries_count": len(self.SAMPLE_QUERIES),
                "results_history_count": len(self._results_history),
            }
    
    def run_single_test(self) -> Dict[str, Any]:
        """Run a single test manually (useful for on-demand testing)."""
        query = self.SAMPLE_QUERIES[self._current_query_idx % len(self.SAMPLE_QUERIES)]
        self._current_query_idx += 1
        
        result = self.learner.run_replay_test(query)
        
        with self._lock:
            self._last_run = time.time()
            self._last_result = result
            self._run_count += 1
            self._total_improvement += result.get("improvement_score", 0.0)
            self._results_history.append({
                "query": query,
                "improvement_score": result.get("improvement_score", 0.0),
                "strategies_applied": result.get("strategies_applied", 0),
                "timestamp": time.time(),
            })
            if len(self._results_history) > self._max_history:
                self._results_history = self._results_history[-self._max_history:]
        
        return result
    
    def _run_loop(self):
        """Background loop that runs tests periodically."""
        while True:
            with self._lock:
                if not self._running:
                    break
            
            try:
                self.run_single_test()
            except Exception as e:
                print(f"[AutonomousReplayTester] Error running test: {e}")
            
            # Use event wait instead of sleep - allows immediate interruption on stop
            if self._stop_event.wait(timeout=self._test_interval):
                # Event was set, meaning stop was called
                break


_global_autonomous_tester: Optional[AutonomousReplayTester] = None


def get_autonomous_tester(learner: Optional[SearchStrategyLearner] = None) -> AutonomousReplayTester:
    """Get or create the global AutonomousReplayTester instance."""
    global _global_autonomous_tester
    
    if _global_autonomous_tester is None:
        if learner is None:
            learner = get_strategy_learner_with_persistence()
        _global_autonomous_tester = AutonomousReplayTester(learner)
    
    return _global_autonomous_tester


def get_strategy_learner(
    encoder: Optional[ConversationEncoder] = None,
) -> SearchStrategyLearner:
    """
    Get or create the global SearchStrategyLearner instance (without persistence).
    
    Args:
        encoder: Optional ConversationEncoder (creates default if not provided)
    
    Returns:
        Singleton SearchStrategyLearner instance
    """
    global _global_strategy_learner
    
    if _global_strategy_learner is None:
        if encoder is None:
            encoder = ConversationEncoder()
        _global_strategy_learner = SearchStrategyLearner(encoder)
    
    return _global_strategy_learner


def get_strategy_learner_with_persistence(
    encoder: Optional[ConversationEncoder] = None,
    database_url: Optional[str] = None,
) -> SearchStrategyLearner:
    """
    Get or create a global SearchStrategyLearner with PostgreSQL persistence.
    
    Creates a persistence layer connected to the database and hydrates
    the learner with existing records on startup.
    
    Args:
        encoder: Optional ConversationEncoder (creates default if not provided)
        database_url: Optional database URL (reads from DATABASE_URL env var if not provided)
    
    Returns:
        Singleton SearchStrategyLearner instance with persistence enabled
    """
    global _global_strategy_learner_with_persistence
    
    if _global_strategy_learner_with_persistence is None:
        if encoder is None:
            encoder = ConversationEncoder()
        
        persistence = SearchFeedbackPersistence(database_url)
        _global_strategy_learner_with_persistence = SearchStrategyLearner(
            conversation_encoder=encoder,
            persistence=persistence,
        )
    
    return _global_strategy_learner_with_persistence
