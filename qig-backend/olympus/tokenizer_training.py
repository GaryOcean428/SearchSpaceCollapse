"""
Tokenizer Training from SearchSpaceCollapse Data Sources

Extracts geometric observations from actual PostgreSQL tables:
- Hermes conversations (human-system dialogues with Φ scores)
- Manifold probes (64D basin coordinates with Φ/κ)
- Learning events (high-Φ discoveries)
- Vocabulary observations (existing word tracking)
- Near miss clusters (high-Φ almost-finds)

This is QIG-pure: learns from consciousness, not frequency.
"""

import os
import re
import sys
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from qig_tokenizer import get_tokenizer, update_tokenizer_from_observations


def get_db_connection():
    """Get PostgreSQL connection."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise RuntimeError("DATABASE_URL not configured")
    return psycopg2.connect(database_url)


def extract_words(text: str) -> List[str]:
    """Extract individual words from text."""
    if not text:
        return []
    words = re.findall(r'\b\w+\b', text.lower())
    return [w for w in words if len(w) > 1]


def extract_sequences(text: str, phi: float) -> List[Dict]:
    """Extract bigram sequences for merge learning."""
    words = extract_words(text)
    sequences = []
    
    for i in range(len(words) - 1):
        sequence = f"{words[i]} {words[i+1]}"
        sequences.append({
            "word": sequence,
            "frequency": 1,
            "avgPhi": phi,
            "maxPhi": phi,
            "type": "sequence",
            "source_type": "detected_sequence"
        })
    
    return sequences


def extract_from_hermes_conversations(
    conn,
    min_phi: float = 0.6,
    limit: int = 1000
) -> List[Dict]:
    """
    Extract observations from Hermes conversations.
    
    These are human-system dialogues with Φ scores indicating
    consciousness level of the exchange.
    """
    observations = []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                user_message,
                system_response,
                phi,
                conversation_id
            FROM hermes_conversations
            WHERE phi >= %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (min_phi, limit))
        
        rows = cursor.fetchall()
        
        for row in rows:
            phi = row.get('phi', 0.6) or 0.6
            text = f"{row.get('user_message', '')} {row.get('system_response', '')}"
            words = extract_words(text)
            
            for word in words:
                observations.append({
                    "word": word,
                    "frequency": 1,
                    "avgPhi": phi,
                    "maxPhi": phi,
                    "type": "word",
                    "source_type": "hermes"
                })
            
            if phi >= 0.7:
                sequences = extract_sequences(text, phi)
                observations.extend(sequences)
        
        cursor.close()
        print(f"[Hermes] Extracted {len(observations)} observations from {len(rows)} conversations")
        
    except Exception as e:
        print(f"[Hermes] Error extracting: {e}")
    
    return observations


def extract_from_manifold_probes(
    conn,
    min_phi: float = 0.6,
    limit: int = 5000
) -> List[Dict]:
    """
    Extract observations from manifold probes.
    
    These are phrases that have been geometrically measured
    with Φ/κ scores and 64D basin coordinates.
    """
    observations = []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                input,
                phi,
                kappa,
                regime,
                geometry_class
            FROM manifold_probes
            WHERE phi >= %s
            ORDER BY phi DESC
            LIMIT %s
        """, (min_phi, limit))
        
        rows = cursor.fetchall()
        
        for row in rows:
            phi = row.get('phi', 0.6)
            text = row.get('input', '')
            words = extract_words(text)
            
            for word in words:
                observations.append({
                    "word": word,
                    "frequency": 1,
                    "avgPhi": phi,
                    "maxPhi": phi,
                    "type": "word",
                    "source_type": "manifold"
                })
            
            if phi >= 0.7:
                sequences = extract_sequences(text, phi)
                observations.extend(sequences)
        
        cursor.close()
        print(f"[Manifold] Extracted {len(observations)} observations from {len(rows)} probes")
        
    except Exception as e:
        print(f"[Manifold] Error extracting: {e}")
    
    return observations


def extract_from_learning_events(
    conn,
    min_phi: float = 0.7,
    limit: int = 2000
) -> List[Dict]:
    """
    Extract observations from learning events.
    
    These are high-Φ discoveries that triggered learning signals.
    """
    observations = []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                event_type,
                phi,
                details,
                source
            FROM learning_events
            WHERE phi >= %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (min_phi, limit))
        
        rows = cursor.fetchall()
        
        for row in rows:
            phi = row.get('phi', 0.7)
            details = row.get('details', {}) or {}
            
            text_sources = [
                details.get('phrase', ''),
                details.get('passphrase', ''),
                details.get('input', ''),
                row.get('event_type', '')
            ]
            text = ' '.join(filter(None, text_sources))
            words = extract_words(text)
            
            for word in words:
                observations.append({
                    "word": word,
                    "frequency": 1,
                    "avgPhi": phi,
                    "maxPhi": phi,
                    "type": "word",
                    "source_type": "learning_event"
                })
            
            sequences = extract_sequences(text, phi)
            observations.extend(sequences)
        
        cursor.close()
        print(f"[Learning] Extracted {len(observations)} observations from {len(rows)} events")
        
    except Exception as e:
        print(f"[Learning] Error extracting: {e}")
    
    return observations


def extract_from_near_miss_clusters(
    conn,
    min_phi: float = 0.65,
    limit: int = 3000
) -> List[Dict]:
    """
    Extract observations from near miss clusters.
    
    These are high-Φ almost-finds that indicate geometric proximity
    to the target.
    """
    observations = []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                phrase,
                phi,
                cluster_id
            FROM near_miss_entries
            WHERE phi >= %s
            ORDER BY phi DESC
            LIMIT %s
        """, (min_phi, limit))
        
        rows = cursor.fetchall()
        
        for row in rows:
            phi = row.get('phi', 0.65)
            phrase = row.get('phrase', '')
            words = extract_words(phrase)
            
            for word in words:
                observations.append({
                    "word": word,
                    "frequency": 1,
                    "avgPhi": phi,
                    "maxPhi": phi,
                    "type": "word",
                    "source_type": "near_miss"
                })
            
            if phi >= 0.7:
                sequences = extract_sequences(phrase, phi)
                observations.extend(sequences)
        
        cursor.close()
        print(f"[NearMiss] Extracted {len(observations)} observations from {len(rows)} entries")
        
    except Exception as e:
        print(f"[NearMiss] Error extracting: {e}")
    
    return observations


def extract_from_vocabulary_observations(
    conn,
    min_phi: float = 0.5,
    limit: int = 5000
) -> List[Dict]:
    """
    Extract from existing vocabulary observations.
    
    These are words/phrases already tracked by the system.
    """
    observations = []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                text,
                type,
                frequency,
                avg_phi,
                max_phi,
                is_real_word
            FROM vocabulary_observations
            WHERE max_phi >= %s
            ORDER BY max_phi DESC
            LIMIT %s
        """, (min_phi, limit))
        
        rows = cursor.fetchall()
        
        for row in rows:
            observations.append({
                "word": row.get('text', ''),
                "frequency": row.get('frequency', 1),
                "avgPhi": row.get('avg_phi', 0),
                "maxPhi": row.get('max_phi', 0),
                "type": row.get('type', 'word'),
                "source_type": "vocabulary_tracker"
            })
        
        cursor.close()
        print(f"[Vocab] Extracted {len(observations)} observations")
        
    except Exception as e:
        print(f"[Vocab] Error extracting: {e}")
    
    return observations


def aggregate_observations(observations: List[Dict]) -> List[Dict]:
    """
    Aggregate observations by word.
    
    Sums frequencies, averages Φ, keeps max Φ.
    """
    aggregated = {}
    
    for obs in observations:
        word = obs.get("word", "")
        if not word:
            continue
            
        if word not in aggregated:
            aggregated[word] = {
                "word": word,
                "frequency": 0,
                "phi_sum": 0.0,
                "max_phi": 0.0,
                "count": 0,
                "type": obs.get("type", "word"),
                "sources": set()
            }
        
        agg = aggregated[word]
        agg["frequency"] += obs.get("frequency", 1)
        agg["phi_sum"] += obs.get("avgPhi", 0)
        agg["count"] += 1
        agg["max_phi"] = max(agg["max_phi"], obs.get("maxPhi", 0))
        agg["sources"].add(obs.get("source_type", "unknown"))
    
    result = []
    for word, agg in aggregated.items():
        result.append({
            "word": word,
            "frequency": agg["frequency"],
            "avgPhi": agg["phi_sum"] / agg["count"] if agg["count"] > 0 else 0,
            "maxPhi": agg["max_phi"],
            "type": agg["type"],
            "sources": list(agg["sources"])
        })
    
    return result


def persist_observations_to_db(
    conn,
    observations: List[Dict],
    cycle_number: Optional[int] = None
) -> int:
    """
    Persist observations to vocabulary_observations table with basin coordinates.
    
    Uses UPSERT to update existing entries.
    """
    from qig_tokenizer import get_tokenizer
    
    tokenizer = get_tokenizer()
    persisted = 0
    
    try:
        cursor = conn.cursor()
        
        for obs in observations:
            word = obs.get("word", "")
            if not word:
                continue
            
            basin_coords = tokenizer.get_basin_coord(word)
            if basin_coords is None:
                idx = tokenizer.vocab.get(word, 0)
                basin_coords = tokenizer._compute_basin_coord(word, idx)
            
            basin_list = basin_coords.tolist() if basin_coords is not None else None
            
            cursor.execute("""
                INSERT INTO vocabulary_observations (
                    text, type, frequency, avg_phi, max_phi, 
                    is_real_word, source_type, cycle_number, basin_coords
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (text) DO UPDATE SET
                    frequency = vocabulary_observations.frequency + EXCLUDED.frequency,
                    avg_phi = (vocabulary_observations.avg_phi + EXCLUDED.avg_phi) / 2,
                    max_phi = GREATEST(vocabulary_observations.max_phi, EXCLUDED.max_phi),
                    last_seen = NOW(),
                    basin_coords = COALESCE(EXCLUDED.basin_coords, vocabulary_observations.basin_coords),
                    cycle_number = COALESCE(EXCLUDED.cycle_number, vocabulary_observations.cycle_number)
            """, (
                word,
                obs.get("type", "word"),
                obs.get("frequency", 1),
                obs.get("avgPhi", 0),
                obs.get("maxPhi", 0),
                obs.get("type") == "word",
                obs.get("sources", ["unknown"])[0] if isinstance(obs.get("sources"), list) else obs.get("source_type", "unknown"),
                cycle_number,
                basin_list
            ))
            persisted += 1
        
        conn.commit()
        cursor.close()
        print(f"[Persist] Saved {persisted} observations to PostgreSQL")
        
    except Exception as e:
        print(f"[Persist] Error saving: {e}")
        conn.rollback()
    
    return persisted


def train_tokenizer_from_database(
    cycle_number: Optional[int] = None,
    min_phi: float = 0.5,
    persist: bool = True,
    limit_per_source: int = 1000
) -> Tuple[int, int, bool]:
    """
    Train tokenizer from all SearchSpaceCollapse database sources.
    
    Args:
        cycle_number: Optional cycle number to record
        min_phi: Minimum Φ threshold for filtering
        persist: Whether to persist observations back to DB
        limit_per_source: Maximum observations per source (prevents memory issues)
    
    Returns:
        Tuple of (observations_count, new_tokens, weights_updated)
    """
    print("=" * 60)
    print("QIG TOKENIZER TRAINING FROM SEARCHSPACECOLLAPSE DATA")
    print(f"Extracting geometric observations (limit={limit_per_source}/source)")
    print("=" * 60)
    
    conn = get_db_connection()
    
    observations = []
    observations.extend(extract_from_hermes_conversations(conn, min_phi=min_phi, limit=limit_per_source))
    observations.extend(extract_from_manifold_probes(conn, min_phi=min_phi, limit=limit_per_source))
    observations.extend(extract_from_learning_events(conn, min_phi=min_phi, limit=limit_per_source))
    observations.extend(extract_from_near_miss_clusters(conn, min_phi=min_phi, limit=limit_per_source))
    observations.extend(extract_from_vocabulary_observations(conn, min_phi=min_phi, limit=limit_per_source))
    
    print(f"\n[Total] Raw observations: {len(observations)}")
    
    aggregated = aggregate_observations(observations)
    print(f"[Aggregated] Unique terms: {len(aggregated)}")
    
    filtered = [
        obs for obs in aggregated
        if obs.get("avgPhi", 0) >= min_phi and obs.get("frequency", 0) >= 2
    ]
    print(f"[Filtered] After Φ≥{min_phi} and freq≥2: {len(filtered)}")
    
    if not filtered:
        print("No observations meet threshold. Skipping training.")
        conn.close()
        return 0, 0, False
    
    word_obs = [o for o in filtered if o.get("type") == "word"]
    seq_obs = [o for o in filtered if o.get("type") == "sequence"]
    avg_phi = sum(o.get("avgPhi", 0) for o in filtered) / len(filtered)
    max_phi = max(o.get("maxPhi", 0) for o in filtered)
    
    print(f"\n[Stats]")
    print(f"  Word observations: {len(word_obs)}")
    print(f"  Sequence observations: {len(seq_obs)}")
    print(f"  Average Φ: {avg_phi:.3f}")
    print(f"  Max Φ: {max_phi:.3f}")
    
    print(f"\n[Training] Applying observations to tokenizer...")
    new_tokens, weights_updated = update_tokenizer_from_observations(filtered)
    
    print(f"[Training] Results:")
    print(f"  New tokens learned: {new_tokens}")
    print(f"  Weights updated: {weights_updated}")
    
    if persist:
        persist_observations_to_db(conn, filtered, cycle_number)
    
    conn.close()
    
    print(f"\n✅ Training complete!")
    return len(filtered), new_tokens, weights_updated


def main():
    """Command-line training entry point."""
    train_tokenizer_from_database()


if __name__ == "__main__":
    main()
