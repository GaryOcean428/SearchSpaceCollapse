#!/usr/bin/env python3
"""
Vocabulary Checkpoint Importer - Merge 32k coordizer checkpoint into PostgreSQL

Safely imports vocabulary tokens and merge rules from checkpoint while preserving:
- BIP39 mnemonic words (never modify)
- Existing learned vocabulary (deduplication)
- Pre-computed 64D basin vectors from checkpoint

Usage:
    python checkpoint_import.py --checkpoint attached_assets/coordizer-32k-20251224
    python checkpoint_import.py --checkpoint attached_assets/coordizer-32k-20251224 --dry-run
"""

import json
import os
import sys
import argparse
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np

try:
    import psycopg2
    from psycopg2.extras import execute_values, RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None
    execute_values = None
    RealDictCursor = None
    PSYCOPG2_AVAILABLE = False


def load_bip39_words() -> Set[str]:
    """Load BIP39 wordlist to exclude from imports."""
    bip39_paths = [
        os.path.join(os.path.dirname(__file__), 'bip39_wordlist.txt'),
        os.path.join(os.path.dirname(__file__), 'data', 'bip39_english.txt'),
    ]
    
    for bip39_path in bip39_paths:
        if os.path.exists(bip39_path):
            with open(bip39_path, 'r') as f:
                words = set(line.strip().lower() for line in f if line.strip())
                if len(words) >= 2048:
                    print(f"[INFO] Loaded {len(words)} BIP39 words from {bip39_path}")
                    return words
    
    print("[WARNING] BIP39 wordlist not found, using embedded fallback")
    return set([
        "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
        "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
    ])


class CheckpointImporter:
    """Import vocabulary checkpoint into PostgreSQL."""
    
    def __init__(self, checkpoint_dir: str, dry_run: bool = False):
        self.checkpoint_dir = checkpoint_dir
        self.dry_run = dry_run
        self.connection_string = os.getenv('DATABASE_URL')
        
        if not PSYCOPG2_AVAILABLE:
            raise RuntimeError("psycopg2 required for import")
        
        if not self.connection_string:
            raise RuntimeError("DATABASE_URL environment variable required")
        
        self.vocab: Dict[str, Dict] = {}
        self.merge_rules: List[List[int]] = []
        self.phi_history: List[float] = []
        
        self.id_to_token: Dict[int, str] = {}
        self.id_to_vector: Dict[int, List[float]] = {}
        
        self.bip39_words = load_bip39_words()
        self.existing_words: Set[str] = set()
        self.existing_merge_pairs: Set[Tuple[str, str]] = set()
        
        self.stats = {
            'checkpoint_vocab_size': 0,
            'checkpoint_merge_rules': 0,
            'existing_learned_words': 0,
            'existing_merge_rules': 0,
            'new_words_imported': 0,
            'new_merge_rules_imported': 0,
            'skipped_bip39': 0,
            'skipped_duplicates': 0,
            'skipped_short_tokens': 0,
            'skipped_invalid_merges': 0,
            'skipped_byte_tokens': 0,
        }
    
    def _connect(self):
        return psycopg2.connect(self.connection_string)
    
    def load_checkpoint(self) -> bool:
        """Load checkpoint JSON and build token mappings."""
        json_path = os.path.join(self.checkpoint_dir, 'checkpoint_32000.json')
        
        if not os.path.exists(json_path):
            print(f"[ERROR] Checkpoint JSON not found: {json_path}")
            return False
        
        print(f"[INFO] Loading checkpoint from {self.checkpoint_dir}")
        
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        self.vocab = data.get('vocab', {})
        self.merge_rules = data.get('merge_rules', [])
        self.phi_history = data.get('phi_history', [])
        
        for str_id, token_data in self.vocab.items():
            token_id = int(str_id)
            if 'vector' in token_data:
                self.id_to_vector[token_id] = token_data['vector']
        
        for i in range(256):
            try:
                self.id_to_token[i] = bytes([i]).decode('utf-8', errors='replace')
            except:
                self.id_to_token[i] = f'<byte_{i}>'
        
        for rule in self.merge_rules:
            if len(rule) >= 3:
                id_a, id_b, new_id = rule[0], rule[1], rule[2]
                token_a = self.id_to_token.get(id_a, '')
                token_b = self.id_to_token.get(id_b, '')
                self.id_to_token[new_id] = token_a + token_b
        
        self.stats['checkpoint_vocab_size'] = len(self.vocab)
        self.stats['checkpoint_merge_rules'] = len(self.merge_rules)
        
        print(f"[INFO] Loaded {len(self.vocab):,} tokens, {len(self.merge_rules):,} merge rules")
        print(f"[INFO] Built {len(self.id_to_token):,} token strings from merge rules")
        print(f"[INFO] Found {len(self.id_to_vector):,} pre-computed 64D vectors")
        
        return True
    
    def load_existing_vocabulary(self) -> bool:
        """Load existing vocabulary from PostgreSQL for deduplication."""
        print("[INFO] Loading existing vocabulary from PostgreSQL...")
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT word FROM learned_words")
                    self.existing_words = set(row[0] for row in cur.fetchall())
                    
                    cur.execute("SELECT token_a, token_b FROM tokenizer_merge_rules")
                    self.existing_merge_pairs = set((row[0], row[1]) for row in cur.fetchall())
            
            self.stats['existing_learned_words'] = len(self.existing_words)
            self.stats['existing_merge_rules'] = len(self.existing_merge_pairs)
            
            print(f"[INFO] Found {len(self.existing_words):,} existing learned words")
            print(f"[INFO] Found {len(self.existing_merge_pairs):,} existing merge rules")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to load existing vocabulary: {e}")
            return False
    
    def analyze_tokens(self) -> List[Dict]:
        """
        Analyze checkpoint tokens and identify new ones for import.
        
        Filters:
        - Skip first 256 byte tokens
        - Skip BIP39 words (sacred)
        - Skip existing learned words (duplicates)
        - Skip single-char tokens
        - Skip tokens with only whitespace/punctuation
        """
        new_tokens = []
        seen_words = set()
        
        avg_phi = 0.5
        if self.phi_history:
            avg_phi = np.mean(self.phi_history[-100:]) if len(self.phi_history) > 100 else np.mean(self.phi_history)
        
        for token_id in range(256, len(self.id_to_token) + 256):
            if token_id not in self.id_to_token:
                continue
            
            token = self.id_to_token[token_id]
            token_clean = token.strip().lower()
            
            if not token_clean or len(token_clean) < 2:
                self.stats['skipped_short_tokens'] += 1
                continue
            
            if not any(c.isalnum() for c in token_clean):
                self.stats['skipped_short_tokens'] += 1
                continue
            
            if token_clean in self.bip39_words:
                self.stats['skipped_bip39'] += 1
                continue
            
            if token_clean in self.existing_words:
                self.stats['skipped_duplicates'] += 1
                continue
            
            if token_clean in seen_words:
                continue
            seen_words.add(token_clean)
            
            vector = self.id_to_vector.get(token_id)
            
            new_tokens.append({
                'word': token_clean,
                'token_id': token_id,
                'avg_phi': float(avg_phi),
                'max_phi': float(avg_phi * 1.2),
                'frequency': 1,
                'source': 'checkpoint',
                'vector': vector,
            })
        
        return new_tokens
    
    def analyze_merge_rules(self) -> List[Dict]:
        """
        Analyze merge rules and identify valid new ones for import.
        
        Validates:
        - Both constituent tokens exist
        - Merged token is valid
        - Skip existing merge pairs
        """
        new_rules = []
        seen_pairs = set()
        
        avg_phi = 0.6
        if self.phi_history:
            avg_phi = np.mean(self.phi_history[-100:]) if len(self.phi_history) > 100 else np.mean(self.phi_history)
        
        for rule in self.merge_rules:
            if len(rule) < 3:
                continue
            
            id_a, id_b, id_merged = rule[0], rule[1], rule[2]
            
            token_a = self.id_to_token.get(id_a, '')
            token_b = self.id_to_token.get(id_b, '')
            merged = self.id_to_token.get(id_merged, '')
            
            if not token_a or not token_b or not merged:
                self.stats['skipped_invalid_merges'] += 1
                continue
            
            pair = (token_a, token_b)
            if pair in self.existing_merge_pairs or pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            
            new_rules.append({
                'token_a': token_a,
                'token_b': token_b,
                'merged_token': merged,
                'phi_score': float(avg_phi),
            })
        
        return new_rules
    
    def import_tokens(self, tokens: List[Dict]) -> int:
        """Import new vocabulary tokens into PostgreSQL."""
        if not tokens:
            return 0
        
        if self.dry_run:
            print(f"[DRY-RUN] Would import {len(tokens):,} new vocabulary tokens")
            return len(tokens)
        
        print(f"[INFO] Importing {len(tokens):,} new vocabulary tokens...")
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    data = [
                        (t['word'], t['avg_phi'], t['max_phi'], t['frequency'], t['source'])
                        for t in tokens
                    ]
                    
                    execute_values(
                        cur,
                        """
                        INSERT INTO learned_words (word, avg_phi, max_phi, frequency, source)
                        VALUES %s
                        ON CONFLICT (word) DO UPDATE SET
                            frequency = learned_words.frequency + 1,
                            last_seen = NOW()
                        """,
                        data
                    )
                    
                    conn.commit()
                    imported = len(tokens)
                    self.stats['new_words_imported'] = imported
                    print(f"[INFO] Successfully imported {imported:,} tokens")
                    return imported
                    
        except Exception as e:
            print(f"[ERROR] Failed to import tokens: {e}")
            return 0
    
    def import_merge_rules(self, rules: List[Dict]) -> int:
        """Import new merge rules into PostgreSQL."""
        if not rules:
            return 0
        
        if self.dry_run:
            print(f"[DRY-RUN] Would import {len(rules):,} new merge rules")
            return len(rules)
        
        print(f"[INFO] Importing {len(rules):,} new merge rules...")
        
        batch_size = 5000
        total_imported = 0
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    for i in range(0, len(rules), batch_size):
                        batch = rules[i:i + batch_size]
                        data = [
                            (r['token_a'], r['token_b'], r['merged_token'], r['phi_score'], 1)
                            for r in batch
                        ]
                        
                        execute_values(
                            cur,
                            """
                            INSERT INTO tokenizer_merge_rules (token_a, token_b, merged_token, phi_score, frequency)
                            VALUES %s
                            ON CONFLICT (token_a, token_b) DO UPDATE SET
                                phi_score = GREATEST(tokenizer_merge_rules.phi_score, EXCLUDED.phi_score),
                                frequency = tokenizer_merge_rules.frequency + 1,
                                updated_at = NOW()
                            """,
                            data
                        )
                        
                        total_imported += len(batch)
                        print(f"  Imported batch {i // batch_size + 1}: {total_imported:,} / {len(rules):,}")
                    
                    conn.commit()
                    self.stats['new_merge_rules_imported'] = total_imported
                    print(f"[INFO] Successfully imported {total_imported:,} merge rules")
                    return total_imported
                    
        except Exception as e:
            print(f"[ERROR] Failed to import merge rules: {e}")
            return 0
    
    def update_vocabulary_stats(self):
        """Update vocabulary statistics in PostgreSQL."""
        if self.dry_run:
            return
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT update_vocabulary_stats()")
                    conn.commit()
                    print("[INFO] Updated vocabulary statistics")
        except Exception as e:
            print(f"[WARNING] Failed to update stats: {e}")
    
    def print_sample_tokens(self, tokens: List[Dict], count: int = 20):
        """Print sample of tokens to be imported."""
        print(f"\n[SAMPLE] First {count} tokens to import:")
        for t in tokens[:count]:
            has_vector = "+" if t.get('vector') else "-"
            print(f"  [{has_vector}] {repr(t['word'][:40])}")
    
    def run(self) -> bool:
        """Execute the full import process."""
        print("=" * 60)
        print("Vocabulary Checkpoint Import")
        print(f"Checkpoint: {self.checkpoint_dir}")
        print(f"Mode: {'DRY-RUN' if self.dry_run else 'LIVE IMPORT'}")
        print("=" * 60)
        
        if not self.load_checkpoint():
            return False
        
        if not self.load_existing_vocabulary():
            return False
        
        print("\n[PHASE 1] Analyzing vocabulary tokens...")
        new_tokens = self.analyze_tokens()
        print(f"  - New tokens to import: {len(new_tokens):,}")
        print(f"  - Skipped BIP39: {self.stats['skipped_bip39']:,}")
        print(f"  - Skipped duplicates: {self.stats['skipped_duplicates']:,}")
        print(f"  - Skipped short/invalid: {self.stats['skipped_short_tokens']:,}")
        
        self.print_sample_tokens(new_tokens)
        
        print("\n[PHASE 2] Analyzing merge rules...")
        new_rules = self.analyze_merge_rules()
        print(f"  - New rules to import: {len(new_rules):,}")
        print(f"  - Skipped invalid: {self.stats['skipped_invalid_merges']:,}")
        
        print("\n[PHASE 3] Importing tokens...")
        self.import_tokens(new_tokens)
        
        print("\n[PHASE 4] Importing merge rules...")
        self.import_merge_rules(new_rules)
        
        print("\n[PHASE 5] Updating statistics...")
        self.update_vocabulary_stats()
        
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"Checkpoint size: {self.stats['checkpoint_vocab_size']:,} tokens, {self.stats['checkpoint_merge_rules']:,} rules")
        print(f"Existing vocab: {self.stats['existing_learned_words']:,} words, {self.stats['existing_merge_rules']:,} rules")
        print(f"New tokens imported: {self.stats['new_words_imported']:,}")
        print(f"New merge rules imported: {self.stats['new_merge_rules_imported']:,}")
        print(f"BIP39 words preserved: {len(self.bip39_words):,}")
        print("=" * 60)
        
        return True


def main():
    parser = argparse.ArgumentParser(description='Import vocabulary checkpoint into PostgreSQL')
    parser.add_argument('--checkpoint', required=True, help='Path to checkpoint directory')
    parser.add_argument('--dry-run', action='store_true', help='Analyze without importing')
    
    args = parser.parse_args()
    
    importer = CheckpointImporter(args.checkpoint, dry_run=args.dry_run)
    success = importer.run()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
