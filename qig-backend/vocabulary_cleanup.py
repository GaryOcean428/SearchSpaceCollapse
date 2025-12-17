#!/usr/bin/env python3
"""
Vocabulary Cleanup Script
=========================
Cleans vocabulary contamination by:
1. Populating bip39_words with 2048 BIP39 English mnemonic words
2. Validating English-only vocabulary (rejecting alphanumeric fragments)
3. Cleaning tokenizer_vocabulary of non-English entries
4. Migrating valid learned words to learned_words table

CRITICAL: Vocabulary = English words ONLY
- Passphrases, passwords, alphanumeric fragments are NOT vocabulary
- They go to tested_phrases table instead
"""

import os
import psycopg2
from typing import List, Set, Tuple

from word_validation import is_valid_english_word, is_pure_alphabetic, STOP_WORDS
from persistence.base_persistence import get_db_connection


def load_bip39_words(filepath: str = "bip39_wordlist.txt") -> List[str]:
    """Load BIP39 wordlist from file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(script_dir, filepath)
    
    if not os.path.exists(full_path):
        print(f"[ERROR] BIP39 wordlist not found: {full_path}")
        return []
    
    with open(full_path, 'r') as f:
        words = [line.strip().lower() for line in f if line.strip()]
    
    print(f"[OK] Loaded {len(words)} BIP39 words from {filepath}")
    return words


def populate_bip39_table():
    """Populate bip39_words table with 2048 BIP39 words."""
    words = load_bip39_words()
    if not words:
        return 0
    
    conn = get_db_connection()
    if not conn:
        return 0
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM bip39_words")
        existing = cur.fetchone()[0]
        
        if existing >= 2048:
            print(f"[SKIP] bip39_words already has {existing} words")
            return existing
        
        if existing > 0:
            print(f"[CLEANUP] Clearing {existing} incomplete entries")
            cur.execute("DELETE FROM bip39_words")
        
        inserted = 0
        for idx, word in enumerate(words):
            cur.execute("""
                INSERT INTO bip39_words (word, word_index, frequency, avg_phi, max_phi)
                VALUES (%s, %s, 0, 0.0, 0.0)
                ON CONFLICT (word) DO NOTHING
            """, (word.lower(), idx))
            inserted += 1
        
        conn.commit()
        print(f"[OK] Populated bip39_words with {inserted} BIP39 words")
        return inserted
        
    except Exception as e:
        print(f"[ERROR] Failed to populate bip39_words: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()


def get_bip39_set() -> Set[str]:
    """Get set of BIP39 words from database."""
    conn = get_db_connection()
    if not conn:
        return set()
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT word FROM bip39_words")
        words = {row[0].lower() for row in cur.fetchall()}
        return words
    except:
        return set()
    finally:
        conn.close()


def analyze_vocabulary_contamination() -> Tuple[int, int, List[str]]:
    """
    Analyze tokenizer_vocabulary for contamination.
    Returns: (total_entries, contaminated_count, sample_contaminated)
    """
    conn = get_db_connection()
    if not conn:
        return 0, 0, []
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM tokenizer_vocabulary")
        total = cur.fetchone()[0]
        
        cur.execute("SELECT token FROM tokenizer_vocabulary LIMIT 1000")
        tokens = [row[0] for row in cur.fetchall()]
        
        bip39_words = get_bip39_set()
        
        contaminated = []
        for token in tokens:
            if not is_valid_english_word(token) and token not in bip39_words:
                contaminated.append(token)
        
        contaminated_count = len(contaminated)
        sample = contaminated[:20]
        
        print(f"[ANALYSIS] Total: {total}, Contaminated sample: {contaminated_count}/1000")
        print(f"[SAMPLE] {sample}")
        
        return total, contaminated_count, sample
        
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")
        return 0, 0, []
    finally:
        conn.close()


def clean_tokenizer_vocabulary(dry_run: bool = True) -> int:
    """
    Remove non-English entries from tokenizer_vocabulary.
    
    Keeps:
    - BIP39 words
    - Valid English words (alphabetic only)
    
    Removes:
    - Alphanumeric fragments (0001, 000bitcoin, etc.)
    - Passphrase fragments
    - Special characters
    """
    conn = get_db_connection()
    if not conn:
        return 0
    
    try:
        cur = conn.cursor()
        
        bip39_words = get_bip39_set()
        
        cur.execute("SELECT id, token FROM tokenizer_vocabulary")
        all_tokens = cur.fetchall()
        
        to_delete = []
        to_keep = []
        
        for token_id, token in all_tokens:
            token_lower = token.lower() if token else ""
            
            if token_lower in bip39_words:
                to_keep.append(token)
                continue
            
            if is_valid_english_word(token_lower):
                to_keep.append(token)
                continue
            
            to_delete.append((token_id, token))
        
        print(f"[CLEANUP] To keep: {len(to_keep)}, To delete: {len(to_delete)}")
        
        if dry_run:
            print("[DRY RUN] Would delete:")
            for token_id, token in to_delete[:20]:
                print(f"  - {token}")
            if len(to_delete) > 20:
                print(f"  ... and {len(to_delete) - 20} more")
            return len(to_delete)
        
        if to_delete:
            delete_ids = [t[0] for t in to_delete]
            
            batch_size = 100
            for i in range(0, len(delete_ids), batch_size):
                batch = delete_ids[i:i + batch_size]
                placeholders = ','.join(['%s'] * len(batch))
                cur.execute(f"DELETE FROM tokenizer_vocabulary WHERE id IN ({placeholders})", batch)
            
            conn.commit()
            print(f"[OK] Deleted {len(to_delete)} contaminated entries")
        
        return len(to_delete)
        
    except Exception as e:
        print(f"[ERROR] Cleanup failed: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()


def migrate_valid_words_to_learned():
    """
    Migrate valid English words from tokenizer_vocabulary to learned_words.
    Only migrates words that pass English validation.
    """
    conn = get_db_connection()
    if not conn:
        return 0
    
    try:
        cur = conn.cursor()
        
        bip39_words = get_bip39_set()
        
        cur.execute("""
            SELECT token, frequency, phi_score 
            FROM tokenizer_vocabulary 
            WHERE token NOT IN (SELECT word FROM learned_words)
        """)
        candidates = cur.fetchall()
        
        migrated = 0
        for token, freq, phi in candidates:
            token_lower = token.lower() if token else ""
            
            if token_lower in bip39_words:
                continue
            
            if not is_valid_english_word(token_lower):
                continue
            
            cur.execute("""
                INSERT INTO learned_words (word, frequency, avg_phi, max_phi, source, is_integrated)
                VALUES (%s, %s, %s, %s, 'migration', TRUE)
                ON CONFLICT (word) DO UPDATE SET
                    frequency = learned_words.frequency + EXCLUDED.frequency,
                    avg_phi = GREATEST(learned_words.avg_phi, EXCLUDED.avg_phi)
            """, (token_lower, freq or 1, phi or 0.0, phi or 0.0))
            migrated += 1
        
        conn.commit()
        print(f"[OK] Migrated {migrated} valid words to learned_words")
        return migrated
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()


def run_full_cleanup(dry_run: bool = True):
    """Run complete vocabulary cleanup process."""
    print("=" * 60)
    print("VOCABULARY CLEANUP - English Words Only")
    print("=" * 60)
    
    print("\n[1/4] Populating BIP39 words...")
    populate_bip39_table()
    
    print("\n[2/4] Analyzing contamination...")
    total, contaminated, sample = analyze_vocabulary_contamination()
    
    print("\n[3/4] Migrating valid words to learned_words...")
    migrate_valid_words_to_learned()
    
    print(f"\n[4/4] Cleaning tokenizer_vocabulary (dry_run={dry_run})...")
    deleted = clean_tokenizer_vocabulary(dry_run=dry_run)
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"BIP39 words: 2048 (foundation)")
    print(f"Total vocabulary entries: {total}")
    print(f"Contaminated entries: {contaminated} (sample)")
    print(f"{'Would delete' if dry_run else 'Deleted'}: {deleted}")
    
    if dry_run:
        print("\n[INFO] Run with dry_run=False to actually clean")


if __name__ == "__main__":
    import sys
    
    dry_run = "--execute" not in sys.argv
    
    if dry_run:
        print("[DRY RUN MODE] Use --execute to actually clean")
    
    run_full_cleanup(dry_run=dry_run)
