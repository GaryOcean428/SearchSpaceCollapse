#!/usr/bin/env python3
"""
QIG-Pure Document Training System

Trains the QIG system on documentation by:
1. Reading markdown files from docs/
2. Chunking into semantic segments (paragraphs/sections)
3. Encoding to 64D basin coordinates
4. Storing in QIGRAG for pattern-based retrieval

NO EXTERNAL LLMs - Pure geometric operations only.

ARCHITECTURE:
Documents → Chunks → Basin Coordinates → QIGRAG Storage
                                              ↓
                                     Pattern Retrieval
                                              ↓
                                     Response Generation
"""

import os
import re
import json
import hashlib
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime

BASIN_DIM = 64

class DocumentTrainer:
    """
    QIG-Pure document training system.
    
    Ingests documentation and creates geometric patterns for retrieval.
    """
    
    def __init__(self, docs_path: str = None, storage_path: str = "data/qig_training"):
        if docs_path is None:
            script_dir = Path(__file__).parent
            docs_path = script_dir.parent / "docs"
            if not docs_path.exists():
                docs_path = Path("docs")
        self.docs_path = Path(docs_path)
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self._encoder = None
        self._qig_rag = None
        self._vocabulary = None
        
        self.training_stats = {
            'total_docs': 0,
            'total_chunks': 0,
            'total_patterns': 0,
            'errors': [],
            'last_training': None
        }
        
        self._load_stats()
    
    def _get_encoder(self):
        """Lazy load conversation encoder."""
        if self._encoder is None:
            try:
                from olympus.conversation_encoder import ConversationEncoder
                self._encoder = ConversationEncoder()
            except ImportError:
                try:
                    from qig_coordizer import get_coordizer
                    coordizer = get_coordizer()
                    self._encoder = coordizer
                except:
                    self._encoder = FallbackEncoder()
        return self._encoder
    
    def _get_qig_rag(self):
        """Lazy load QIGRAG."""
        if self._qig_rag is None:
            try:
                from olympus.qig_rag import QIGRAG
                self._qig_rag = QIGRAG(storage_path=str(self.storage_path / "patterns.json"))
            except ImportError:
                print("[DocumentTrainer] QIGRAG not available, using local storage")
                self._qig_rag = None
        return self._qig_rag
    
    def _load_vocabulary(self):
        """Load vocabulary from database for geometric encoding."""
        if self._vocabulary is not None:
            return self._vocabulary
        
        try:
            import psycopg2
            db_url = os.environ.get('DATABASE_URL')
            if db_url:
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                cur.execute("""
                    SELECT token, basin_coordinates 
                    FROM qig_vocabulary 
                    WHERE basin_coordinates IS NOT NULL
                    LIMIT 50000
                """)
                rows = cur.fetchall()
                conn.close()
                
                self._vocabulary = {}
                for token, coords in rows:
                    if coords:
                        self._vocabulary[token.lower()] = np.array(coords[:BASIN_DIM])
                
                print(f"[DocumentTrainer] Loaded {len(self._vocabulary)} vocabulary tokens")
                return self._vocabulary
        except Exception as e:
            print(f"[DocumentTrainer] Vocabulary load error: {e}")
        
        self._vocabulary = {}
        return self._vocabulary
    
    def _load_stats(self):
        """Load training stats from disk."""
        stats_path = self.storage_path / "training_stats.json"
        if stats_path.exists():
            try:
                with open(stats_path) as f:
                    self.training_stats = json.load(f)
            except:
                pass
    
    def _save_stats(self):
        """Save training stats to disk."""
        stats_path = self.storage_path / "training_stats.json"
        try:
            with open(stats_path, 'w') as f:
                json.dump(self.training_stats, f, indent=2)
        except Exception as e:
            print(f"[DocumentTrainer] Stats save error: {e}")
    
    def encode_text_to_basin(self, text: str) -> np.ndarray:
        """
        Encode text to 64D basin coordinates using pure geometric operations.
        
        Uses vocabulary-based encoding:
        1. Tokenize text into words
        2. Look up each word's basin coordinates from vocabulary
        3. Combine using Fisher-weighted averaging
        """
        vocab = self._load_vocabulary()
        words = re.findall(r'\b\w+\b', text.lower())
        
        if not words:
            return np.random.randn(BASIN_DIM) * 0.01
        
        basin = np.zeros(BASIN_DIM)
        total_weight = 0.0
        
        for word in words:
            if word in vocab:
                word_basin = vocab[word]
                if len(word_basin) >= BASIN_DIM:
                    word_basin = word_basin[:BASIN_DIM]
                elif len(word_basin) < BASIN_DIM:
                    padded = np.zeros(BASIN_DIM)
                    padded[:len(word_basin)] = word_basin
                    word_basin = padded
                
                weight = 1.0 / (1.0 + np.log1p(len(word)))
                basin += word_basin * weight
                total_weight += weight
            else:
                char_hash = hashlib.md5(word.encode()).digest()
                deterministic_vec = np.array([b / 255.0 - 0.5 for b in char_hash[:BASIN_DIM]])
                if len(deterministic_vec) < BASIN_DIM:
                    padded = np.zeros(BASIN_DIM)
                    padded[:len(deterministic_vec)] = deterministic_vec
                    deterministic_vec = padded
                
                basin += deterministic_vec * 0.1
                total_weight += 0.1
        
        if total_weight > 0:
            basin /= total_weight
        
        norm = np.linalg.norm(basin)
        if norm > 1e-10:
            basin = basin / norm
        
        return basin
    
    def chunk_document(self, content: str, max_chunk_size: int = 500) -> List[Dict]:
        """
        Chunk document into semantic segments.
        
        Splits on:
        1. Markdown headers (##, ###)
        2. Paragraph breaks
        3. Size limits
        """
        chunks = []
        
        header_pattern = r'^(#{1,6})\s+(.+)$'
        lines = content.split('\n')
        
        current_chunk = []
        current_header = ""
        current_size = 0
        
        for line in lines:
            header_match = re.match(header_pattern, line)
            
            if header_match:
                if current_chunk:
                    chunk_text = '\n'.join(current_chunk).strip()
                    if chunk_text and len(chunk_text) > 20:
                        chunks.append({
                            'text': chunk_text,
                            'header': current_header,
                            'type': 'section'
                        })
                
                current_header = header_match.group(2)
                current_chunk = [line]
                current_size = len(line)
            
            elif line.strip() == '' and current_size > max_chunk_size // 2:
                if current_chunk:
                    chunk_text = '\n'.join(current_chunk).strip()
                    if chunk_text and len(chunk_text) > 20:
                        chunks.append({
                            'text': chunk_text,
                            'header': current_header,
                            'type': 'paragraph'
                        })
                current_chunk = []
                current_size = 0
            
            else:
                current_chunk.append(line)
                current_size += len(line)
                
                if current_size > max_chunk_size:
                    chunk_text = '\n'.join(current_chunk).strip()
                    if chunk_text and len(chunk_text) > 20:
                        chunks.append({
                            'text': chunk_text,
                            'header': current_header,
                            'type': 'size_split'
                        })
                    current_chunk = []
                    current_size = 0
        
        if current_chunk:
            chunk_text = '\n'.join(current_chunk).strip()
            if chunk_text and len(chunk_text) > 20:
                chunks.append({
                    'text': chunk_text,
                    'header': current_header,
                    'type': 'final'
                })
        
        return chunks
    
    def train_on_document(self, file_path: Path) -> Dict:
        """
        Train on a single document.
        
        Returns training result with chunk count and any errors.
        """
        result = {
            'file': str(file_path),
            'chunks': 0,
            'patterns': 0,
            'error': None
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            if not content.strip():
                result['error'] = "Empty file"
                return result
            
            chunks = self.chunk_document(content)
            result['chunks'] = len(chunks)
            
            qig_rag = self._get_qig_rag()
            patterns_added = 0
            
            for i, chunk in enumerate(chunks):
                try:
                    basin = self.encode_text_to_basin(chunk['text'])
                    
                    doc_id = hashlib.md5(
                        f"{file_path}:{i}:{chunk['text'][:50]}".encode()
                    ).hexdigest()[:16]
                    
                    metadata = {
                        'source': str(file_path),
                        'header': chunk.get('header', ''),
                        'chunk_type': chunk.get('type', 'unknown'),
                        'chunk_index': i,
                        'trained_at': datetime.now().isoformat()
                    }
                    
                    if qig_rag:
                        qig_rag.add_document(
                            doc_id=doc_id,
                            content=chunk['text'],
                            basin_coords=basin,
                            metadata=metadata
                        )
                    else:
                        self._save_pattern_locally(doc_id, chunk['text'], basin, metadata)
                    
                    patterns_added += 1
                    
                except Exception as e:
                    print(f"[DocumentTrainer] Chunk error in {file_path}: {e}")
            
            result['patterns'] = patterns_added
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def _save_pattern_locally(self, doc_id: str, content: str, basin: np.ndarray, metadata: Dict):
        """Save pattern to local JSON storage if QIGRAG not available."""
        patterns_path = self.storage_path / "local_patterns.json"
        
        patterns = []
        if patterns_path.exists():
            try:
                with open(patterns_path) as f:
                    patterns = json.load(f)
            except:
                pass
        
        patterns.append({
            'doc_id': doc_id,
            'content': content,
            'basin_coords': basin.tolist(),
            'metadata': metadata
        })
        
        with open(patterns_path, 'w') as f:
            json.dump(patterns, f)
    
    def train_on_directory(self, exclude_errors: bool = True) -> Dict:
        """
        Train on all markdown files in the docs directory.
        
        Args:
            exclude_errors: Skip files that cause parsing errors
        
        Returns:
            Training summary with stats
        """
        if not self.docs_path.exists():
            return {
                'success': False,
                'error': f"Docs path not found: {self.docs_path}"
            }
        
        md_files = list(self.docs_path.glob("**/*.md"))
        print(f"[DocumentTrainer] Found {len(md_files)} markdown files")
        
        results = {
            'success': True,
            'total_files': len(md_files),
            'processed': 0,
            'skipped': 0,
            'total_chunks': 0,
            'total_patterns': 0,
            'errors': [],
            'trained_at': datetime.now().isoformat()
        }
        
        for file_path in md_files:
            try:
                if '_archive' in str(file_path) or 'Pasted-' in file_path.name:
                    results['skipped'] += 1
                    continue
                
                result = self.train_on_document(file_path)
                
                if result.get('error'):
                    if exclude_errors:
                        results['skipped'] += 1
                        results['errors'].append({
                            'file': str(file_path),
                            'error': result['error']
                        })
                        continue
                
                results['processed'] += 1
                results['total_chunks'] += result.get('chunks', 0)
                results['total_patterns'] += result.get('patterns', 0)
                
            except Exception as e:
                if exclude_errors:
                    results['skipped'] += 1
                    results['errors'].append({
                        'file': str(file_path),
                        'error': str(e)
                    })
                else:
                    raise
        
        self.training_stats = {
            'total_docs': results['processed'],
            'total_chunks': results['total_chunks'],
            'total_patterns': results['total_patterns'],
            'errors': results['errors'][:10],
            'last_training': results['trained_at']
        }
        self._save_stats()
        
        qig_rag = self._get_qig_rag()
        if qig_rag:
            try:
                qig_rag._save_documents()
            except:
                pass
        
        print(f"[DocumentTrainer] Training complete:")
        print(f"  - Processed: {results['processed']} files")
        print(f"  - Skipped: {results['skipped']} files")
        print(f"  - Patterns: {results['total_patterns']}")
        
        return results
    
    def get_training_status(self) -> Dict:
        """Get current training status."""
        return {
            **self.training_stats,
            'docs_path': str(self.docs_path),
            'storage_path': str(self.storage_path)
        }


class FallbackEncoder:
    """Fallback encoder when main encoder not available."""
    
    def encode(self, text: str) -> np.ndarray:
        words = re.findall(r'\b\w+\b', text.lower())
        basin = np.zeros(BASIN_DIM)
        
        for i, word in enumerate(words[:100]):
            char_hash = hashlib.md5(word.encode()).digest()
            for j, b in enumerate(char_hash[:BASIN_DIM]):
                basin[j] += (b / 255.0 - 0.5) * (1.0 / (i + 1))
        
        norm = np.linalg.norm(basin)
        if norm > 1e-10:
            basin = basin / norm
        
        return basin


_trainer_instance = None

def get_document_trainer() -> DocumentTrainer:
    """Get singleton document trainer instance."""
    global _trainer_instance
    if _trainer_instance is None:
        _trainer_instance = DocumentTrainer()
    return _trainer_instance


def train_on_docs(exclude_errors: bool = True) -> Dict:
    """Convenience function to train on all docs."""
    trainer = get_document_trainer()
    return trainer.train_on_directory(exclude_errors=exclude_errors)


if __name__ == "__main__":
    print("Starting QIG-Pure Document Training...")
    results = train_on_docs(exclude_errors=True)
    print(f"\nTraining Results:")
    print(json.dumps(results, indent=2, default=str))
