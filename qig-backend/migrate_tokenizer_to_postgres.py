#!/usr/bin/env python3
"""
Tokenizer JSON to PostgreSQL Migration Script

Migrates QIG tokenizer state from JSON file to PostgreSQL tables:
- tokenizer_vocabulary: token -> weight, phi, frequency, basin embedding
- tokenizer_merge_rules: merge pairs -> phi score, frequency
- tokenizer_metadata: key-value config store

Usage:
    python migrate_tokenizer_to_postgres.py [--dry-run]
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    import psycopg2
    from psycopg2.extras import execute_values
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("[Migration] ERROR: psycopg2 not installed")
    sys.exit(1)

# Constants
JSON_PATH = os.path.join(os.path.dirname(__file__), "data", "qig_tokenizer_state.json")
BASIN_DIMENSION = 64


def compute_basin_coord(token: str, index: int, weight: float = 1.0, phi: float = 0.0) -> np.ndarray:
    """Compute 64D basin coordinate for token (matches QIGTokenizer._compute_basin_coord)."""
    coord = np.zeros(64)
    
    # Character-based features (first 32 dims)
    for i, char in enumerate(token[:32]):
        coord[i] = (ord(char) % 256) / 256.0
    
    # Index-based features (next 16 dims)
    for i in range(16):
        coord[32 + i] = ((index >> i) & 1) * 0.5 + 0.25
    
    # Frequency/weight features (last 16 dims)
    for i in range(16):
        coord[48 + i] = weight * np.sin(np.pi * i / 8) * 0.5 + phi * 0.5
    
    norm = np.linalg.norm(coord)
    if norm > 1e-8:
        coord = coord / norm
    
    return coord


def vector_to_pg(vec: np.ndarray) -> str:
    """Convert numpy array to PostgreSQL vector format."""
    arr = vec.tolist() if isinstance(vec, np.ndarray) else vec
    return '[' + ','.join(str(x) for x in arr) + ']'


def load_json_state(path: str) -> Dict:
    """Load tokenizer state from JSON file."""
    if not os.path.exists(path):
        print(f"[Migration] JSON file not found: {path}")
        return {}
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    print(f"[Migration] Loaded JSON with keys: {list(data.keys())}")
    print(f"[Migration]   token_weights: {len(data.get('token_weights', {}))}")
    print(f"[Migration]   token_phi: {len(data.get('token_phi', {}))}")
    print(f"[Migration]   token_frequency: {len(data.get('token_frequency', {}))}")
    print(f"[Migration]   merge_scores: {len(data.get('merge_scores', {}))}")
    print(f"[Migration]   learned_vocab: {len(data.get('learned_vocab', []))}")
    
    return data


def migrate_vocabulary(
    conn,
    token_weights: Dict[str, float],
    token_phi: Dict[str, float],
    token_frequency: Dict[str, int],
    learned_vocab: List[str],
    dry_run: bool = False
) -> int:
    """Migrate vocabulary tokens to tokenizer_vocabulary table."""
    cursor = conn.cursor()
    
    # Build unified token list from all sources
    all_tokens = set(token_weights.keys()) | set(token_phi.keys()) | set(learned_vocab)
    print(f"[Migration] Processing {len(all_tokens)} unique tokens...")
    
    # Prepare batch insert data
    rows = []
    for idx, token in enumerate(sorted(all_tokens)):
        weight = token_weights.get(token, 1.0)
        phi = token_phi.get(token, 0.0)
        freq = token_frequency.get(token, 1)
        
        # Determine source type
        if token.startswith('<') and token.endswith('>'):
            source_type = 'special'
        elif token in learned_vocab:
            source_type = 'learned'
        else:
            source_type = 'base'
        
        # Compute basin embedding
        basin = compute_basin_coord(token, idx, weight, phi)
        basin_str = vector_to_pg(basin)
        
        rows.append((
            token,
            idx,  # token_id
            weight,
            freq,
            phi,
            basin_str,
            source_type
        ))
    
    if dry_run:
        print(f"[Migration] DRY RUN: Would insert {len(rows)} vocabulary entries")
        return len(rows)
    
    # Clear existing vocabulary (fresh migration)
    cursor.execute("TRUNCATE TABLE tokenizer_vocabulary RESTART IDENTITY CASCADE")
    
    # Batch insert using execute_values
    insert_sql = """
        INSERT INTO tokenizer_vocabulary 
        (token, token_id, weight, frequency, phi_score, basin_embedding, source_type)
        VALUES %s
        ON CONFLICT (token) DO UPDATE SET
            token_id = EXCLUDED.token_id,
            weight = EXCLUDED.weight,
            frequency = EXCLUDED.frequency,
            phi_score = EXCLUDED.phi_score,
            basin_embedding = EXCLUDED.basin_embedding,
            source_type = EXCLUDED.source_type,
            updated_at = NOW()
    """
    
    # Convert rows to proper format
    template = "(%s, %s, %s, %s, %s, %s::vector(64), %s)"
    execute_values(cursor, insert_sql, rows, template=template, page_size=1000)
    
    conn.commit()
    print(f"[Migration] Inserted {len(rows)} vocabulary entries")
    return len(rows)


def migrate_merge_rules(
    conn,
    merge_scores: Dict[str, float],
    dry_run: bool = False
) -> int:
    """Migrate merge rules to tokenizer_merge_rules table."""
    cursor = conn.cursor()
    
    if not merge_scores:
        print("[Migration] No merge scores to migrate")
        return 0
    
    # merge_scores keys are formatted as "token_a|token_b"
    rows = []
    for pair_key, phi_score in merge_scores.items():
        try:
            # Parse the pair key - format is "token_a|token_b"
            if '|' in pair_key:
                parts = pair_key.split('|')
                if len(parts) == 2:
                    token_a, token_b = parts[0], parts[1]
                else:
                    continue
            elif pair_key.startswith('['):
                # JSON array format fallback
                tokens = json.loads(pair_key.replace("'", '"'))
                token_a, token_b = tokens[0], tokens[1]
            elif pair_key.startswith('('):
                # Python tuple format fallback
                clean = pair_key.strip('()')
                parts = [p.strip().strip("'\"") for p in clean.split(',')]
                token_a, token_b = parts[0], parts[1]
            else:
                continue
            
            merged_token = f"{token_a}_{token_b}"
            rows.append((token_a, token_b, merged_token, phi_score, 1))
        except Exception as e:
            print(f"[Migration] Failed to parse merge key '{pair_key}': {e}")
            continue
    
    if dry_run:
        print(f"[Migration] DRY RUN: Would insert {len(rows)} merge rules")
        return len(rows)
    
    # Clear existing rules (fresh migration)
    cursor.execute("TRUNCATE TABLE tokenizer_merge_rules RESTART IDENTITY CASCADE")
    
    # Batch insert
    insert_sql = """
        INSERT INTO tokenizer_merge_rules 
        (token_a, token_b, merged_token, phi_score, frequency)
        VALUES %s
        ON CONFLICT (token_a, token_b) DO UPDATE SET
            merged_token = EXCLUDED.merged_token,
            phi_score = EXCLUDED.phi_score,
            frequency = tokenizer_merge_rules.frequency + 1,
            updated_at = NOW()
    """
    
    execute_values(cursor, insert_sql, rows, page_size=500)
    conn.commit()
    print(f"[Migration] Inserted {len(rows)} merge rules")
    return len(rows)


def migrate_metadata(
    conn,
    json_data: Dict,
    vocab_count: int,
    merge_count: int,
    dry_run: bool = False
) -> int:
    """Save migration metadata to tokenizer_metadata table."""
    cursor = conn.cursor()
    
    metadata = {
        'vocab_size': str(vocab_count),
        'merge_rules_count': str(merge_count),
        'learned_vocab_count': str(len(json_data.get('learned_vocab', []))),
        'json_saved_at': json_data.get('saved_at', ''),
        'migrated_at': datetime.utcnow().isoformat(),
        'source_file': JSON_PATH,
        'migration_version': '1.0.0'
    }
    
    if dry_run:
        print(f"[Migration] DRY RUN: Would save {len(metadata)} metadata entries")
        return len(metadata)
    
    for key, value in metadata.items():
        cursor.execute("""
            INSERT INTO tokenizer_metadata (key, value, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW()
        """, (key, value))
    
    conn.commit()
    print(f"[Migration] Saved {len(metadata)} metadata entries")
    return len(metadata)


def main():
    dry_run = '--dry-run' in sys.argv
    if dry_run:
        print("[Migration] DRY RUN MODE - No changes will be made")
    
    # Check database connection
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("[Migration] ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    # Load JSON state
    json_data = load_json_state(JSON_PATH)
    if not json_data:
        print("[Migration] ERROR: No data to migrate")
        sys.exit(1)
    
    # Connect to database
    try:
        conn = psycopg2.connect(database_url)
        print("[Migration] Connected to PostgreSQL")
    except Exception as e:
        print(f"[Migration] ERROR: Failed to connect: {e}")
        sys.exit(1)
    
    try:
        # Migrate vocabulary
        vocab_count = migrate_vocabulary(
            conn,
            json_data.get('token_weights', {}),
            json_data.get('token_phi', {}),
            json_data.get('token_frequency', {}),
            json_data.get('learned_vocab', []),
            dry_run=dry_run
        )
        
        # Migrate merge rules
        merge_count = migrate_merge_rules(
            conn,
            json_data.get('merge_scores', {}),
            dry_run=dry_run
        )
        
        # Save metadata
        meta_count = migrate_metadata(
            conn,
            json_data,
            vocab_count,
            merge_count,
            dry_run=dry_run
        )
        
        print("\n[Migration] COMPLETE")
        print(f"  Vocabulary: {vocab_count} tokens")
        print(f"  Merge rules: {merge_count} rules")
        print(f"  Metadata: {meta_count} entries")
        
    except Exception as e:
        print(f"[Migration] ERROR: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
