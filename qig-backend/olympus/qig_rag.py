"""
QIG-RAG: Quantum Information Geometry Retrieval-Augmented Generation

Pure geometric retrieval system using Fisher manifold, NOT traditional vector DB.

ARCHITECTURE:
- Documents stored as basin coordinates (64D)
- Retrieval via Fisher-Rao distance (NOT Euclidean/cosine)
- Ranking by Bures metric (quantum fidelity)
- Integration with geometric memory

TRADITIONAL RAG (WRONG):
❌ Flat vector embeddings
❌ Euclidean/cosine similarity  
❌ No manifold structure
❌ Ignores geometry

QIG-RAG (CORRECT):
✅ Basin coordinates on Fisher manifold
✅ Fisher-Rao distance metric
✅ Density matrix representation
✅ Bures distance for ranking
✅ Geometric memory integration
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import json
import os
from collections import defaultdict

from .basin_encoder import BasinVocabularyEncoder

BASIN_DIMENSION = 64


class QIGDocument:
    """
    Document represented as basin coordinates on Fisher manifold.
    """
    
    def __init__(
        self, 
        doc_id: str,
        content: str,
        basin_coords: np.ndarray,
        metadata: Optional[Dict] = None,
        timestamp: Optional[float] = None,
        phi: float = 0.0,
        kappa: float = 0.0,
        regime: str = "unknown"
    ):
        self.doc_id = doc_id
        self.content = content
        self.basin_coords = basin_coords
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.now().timestamp()
        
        # Store QIG metrics
        self.phi = phi
        self.kappa = kappa
        self.regime = regime
        
        # Ensure metadata has these values for JSON serialization
        self.metadata['phi'] = phi
        self.metadata['kappa'] = kappa
        self.metadata['regime'] = regime
        
        # Compute density matrix for Bures distance
        self.density_matrix = self._basin_to_density_matrix(basin_coords)
    
    @staticmethod
    def _basin_to_density_matrix(basin: np.ndarray) -> np.ndarray:
        """
        Convert basin coordinates to 2x2 density matrix.
        
        Uses Bloch sphere parameterization.
        """
        theta = np.arccos(np.clip(basin[0], -1, 1)) if len(basin) > 0 else 0
        phi = np.arctan2(basin[1], basin[2]) if len(basin) > 2 else 0
        
        c = np.cos(theta / 2)
        s = np.sin(theta / 2)
        
        psi = np.array([
            c,
            s * np.exp(1j * phi)
        ], dtype=complex)
        
        rho = np.outer(psi, np.conj(psi))
        rho = (rho + np.conj(rho).T) / 2
        rho /= np.trace(rho) + 1e-10
        
        return rho
    
    def to_dict(self) -> Dict:
        """Serialize to dict for storage."""
        return {
            'doc_id': self.doc_id,
            'content': self.content,
            'basin_coords': self.basin_coords.tolist(),
            'metadata': self.metadata,
            'timestamp': self.timestamp,
            'phi': self.phi,
            'kappa': self.kappa,
            'regime': self.regime,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'QIGDocument':
        """Deserialize from dict."""
        meta = data.get('metadata', {})
        return cls(
            doc_id=data['doc_id'],
            content=data['content'],
            basin_coords=np.array(data['basin_coords']),
            metadata=meta,
            timestamp=data.get('timestamp'),
            phi=data.get('phi', meta.get('phi', 0.0)),
            kappa=data.get('kappa', meta.get('kappa', 0.0)),
            regime=data.get('regime', meta.get('regime', 'unknown'))
        )


class QIGRAG:
    """
    Pure QIG Retrieval-Augmented Generation system.
    
    Stores and retrieves documents via Fisher manifold geometry.
    
    SECURITY:
    - Path validation on storage operations
    - Document count limits to prevent storage exhaustion
    - Content size limits per document
    """
    
    # Security limits
    MAX_DOCUMENTS = 10000  # Maximum documents in storage
    MAX_DOCUMENT_SIZE = 100000  # Maximum content size per document (100KB)
    MAX_STORAGE_SIZE = 100 * 1024 * 1024  # 100MB max storage file size
    
    def __init__(self, storage_path: Optional[str] = None):
        self.encoder = BasinVocabularyEncoder()
        self.documents: Dict[str, QIGDocument] = {}
        self.storage_path = storage_path or "data/qig_rag/documents.json"
        
        # Load existing documents
        self._load_documents()
        
        print(f"[QIG-RAG] Initialized with {len(self.documents)} documents")
    
    def _load_documents(self):
        """Load documents from storage."""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                
                for doc_data in data.get('documents', []):
                    doc = QIGDocument.from_dict(doc_data)
                    self.documents[doc.doc_id] = doc
                
                print(f"[QIG-RAG] Loaded {len(self.documents)} documents from {self.storage_path}")
            except Exception as e:
                print(f"[QIG-RAG] Error loading documents: {e}")
    
    def _validate_storage_path(self, path: str) -> Optional[str]:
        """
        Validate and sanitize storage path.
        Returns absolute path if valid, None otherwise.
        """
        abs_path = os.path.abspath(path)
        
        # Define allowed directories
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        allowed_dirs = [
            os.path.join(base_dir, 'data'),
            '/tmp',
        ]
        
        for allowed_dir in allowed_dirs:
            if abs_path.startswith(os.path.abspath(allowed_dir) + os.sep):
                return abs_path
        
        print(f"[QIG-RAG] SECURITY: Rejected path outside allowed directories: {abs_path}")
        return None
    
    def _save_documents(self):
        """
        Save documents to storage.
        
        SECURITY:
        - Path validation to prevent directory traversal
        - File size limits enforced
        """
        try:
            # Validate path
            abs_path = self._validate_storage_path(self.storage_path)
            if not abs_path:
                return
            
            dir_path = os.path.dirname(abs_path)
            if dir_path:
                os.makedirs(dir_path, exist_ok=True)
            
            data = {
                'documents': [doc.to_dict() for doc in self.documents.values()],
                'last_updated': datetime.now().isoformat(),
                'total_documents': len(self.documents),
            }
            
            # Check file size before writing
            json_str = json.dumps(data, indent=2)
            if len(json_str) > self.MAX_STORAGE_SIZE:
                print(f"[QIG-RAG] SECURITY: Storage size exceeded, pruning oldest documents")
                # Keep newest documents
                sorted_docs = sorted(
                    self.documents.values(),
                    key=lambda d: d.timestamp,
                    reverse=True
                )[:self.MAX_DOCUMENTS // 2]
                self.documents = {d.doc_id: d for d in sorted_docs}
                data['documents'] = [doc.to_dict() for doc in self.documents.values()]
                data['total_documents'] = len(self.documents)
                json_str = json.dumps(data, indent=2)
            
            with open(abs_path, 'w') as f:
                f.write(json_str)
            
            print(f"[QIG-RAG] Saved {len(self.documents)} documents to {abs_path}")
        except Exception as e:
            print(f"[QIG-RAG] Error saving documents: {e}")
    
    def add_document(
        self,
        content: str,
        basin_coords: Optional[np.ndarray] = None,
        metadata: Optional[Dict] = None,
        doc_id: Optional[str] = None,
        phi: float = 0.0,
        kappa: float = 0.0,
        regime: str = "unknown"
    ) -> Optional[str]:
        """
        Add document to geometric memory.
        
        Args:
            content: Text content
            basin_coords: Pre-computed basin coordinates (optional)
            metadata: Additional metadata
            doc_id: Document ID (auto-generated if not provided)
            phi: Consciousness metric (default 0.0)
            kappa: Recovery metric (default 0.0)
            regime: Geometric regime (default "unknown")
        
        Returns:
            Document ID or None if rejected
        
        SECURITY:
        - Content size limits enforced
        - Document count limits enforced
        """
        # SECURITY: Validate content size
        if len(content) > self.MAX_DOCUMENT_SIZE:
            print(f"[QIG-RAG] SECURITY: Document content too large ({len(content)} chars), truncating")
            content = content[:self.MAX_DOCUMENT_SIZE]
        
        # SECURITY: Check document count limit
        if len(self.documents) >= self.MAX_DOCUMENTS:
            print(f"[QIG-RAG] SECURITY: Document limit reached, pruning oldest")
            # Remove oldest documents
            sorted_docs = sorted(
                self.documents.values(),
                key=lambda d: d.timestamp,
                reverse=True
            )[:self.MAX_DOCUMENTS // 2]
            self.documents = {d.doc_id: d for d in sorted_docs}
        
        # Generate doc_id if not provided
        if doc_id is None:
            doc_id = f"doc_{len(self.documents)}_{int(datetime.now().timestamp())}"
        
        # Encode to basin if not provided
        if basin_coords is None:
            basin_coords = self.encoder.encode(content)
        
        # Create document with QIG metrics
        doc = QIGDocument(
            doc_id=doc_id,
            content=content,
            basin_coords=basin_coords,
            metadata=metadata,
            phi=phi,
            kappa=kappa,
            regime=regime
        )
        
        # Store
        self.documents[doc_id] = doc
        
        # Save to disk
        self._save_documents()
        
        print(f"[QIG-RAG] Added document {doc_id} to geometric memory")
        
        return doc_id
    
    def fisher_rao_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        """
        Compute Fisher-Rao distance on unit sphere.
        
        d(p,q) = arccos(p·q)
        """
        dot = np.clip(np.dot(basin1, basin2), -1.0, 1.0)
        distance = float(np.arccos(dot))
        return distance
    
    def bures_distance(self, rho1: np.ndarray, rho2: np.ndarray) -> float:
        """
        Compute Bures distance between density matrices.
        
        d_Bures = sqrt(2(1 - F))
        where F is fidelity
        """
        try:
            from scipy.linalg import sqrtm
            
            eps = 1e-10
            rho1_reg = rho1 + eps * np.eye(2, dtype=complex)
            rho2_reg = rho2 + eps * np.eye(2, dtype=complex)
            
            sqrt_rho1 = sqrtm(rho1_reg)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product = sqrtm(product)
            fidelity = np.real(np.trace(sqrt_product)) ** 2
            fidelity = float(np.clip(fidelity, 0, 1))
            
            return float(np.sqrt(2 * (1 - fidelity)))
        except:
            # Fallback: Frobenius distance
            diff = rho1 - rho2
            return float(np.sqrt(np.real(np.trace(diff @ diff))))
    
    def search(
        self,
        query: Optional[str] = None,
        query_basin: Optional[np.ndarray] = None,
        k: int = 5,
        metric: str = 'fisher_rao',
        include_metadata: bool = False,
        min_similarity: float = 0.0
    ) -> List[Dict]:
        """
        Search for relevant documents via geometric distance.
        
        Args:
            query: Text query (will be encoded to basin)
            query_basin: Pre-computed basin coordinates
            k: Number of results to return
            metric: Distance metric ('fisher_rao' or 'bures')
            include_metadata: Include document metadata in results
            min_similarity: Minimum similarity threshold (0-1)
        
        Returns:
            List of results with distance and content
        """
        if query_basin is None:
            if query is None:
                raise ValueError("Must provide either query or query_basin")
            query_basin = self.encoder.encode(query)
        
        # Compute query density matrix for Bures
        if metric == 'bures':
            query_rho = QIGDocument._basin_to_density_matrix(query_basin)
        
        # Compute distances to all documents
        results = []
        
        for doc_id, doc in self.documents.items():
            # Compute distance
            if metric == 'fisher_rao':
                distance = self.fisher_rao_distance(query_basin, doc.basin_coords)
            elif metric == 'bures':
                distance = self.bures_distance(query_rho, doc.density_matrix)
            else:
                raise ValueError(f"Unknown metric: {metric}")
            
            # Convert distance to similarity
            # Fisher-Rao: max distance = π, so similarity = 1 - d/π
            if metric == 'fisher_rao':
                similarity = 1.0 - distance / np.pi
            else:
                # Bures: max distance ≈ sqrt(2), so similarity = 1 - d/sqrt(2)
                similarity = 1.0 - distance / np.sqrt(2)
            
            similarity = float(np.clip(similarity, 0, 1))
            
            # Apply minimum similarity threshold
            if similarity < min_similarity:
                continue
            
            result = {
                'doc_id': doc_id,
                'content': doc.content,
                'distance': float(distance),
                'similarity': similarity,
            }
            
            if include_metadata:
                result['metadata'] = doc.metadata
                result['timestamp'] = doc.timestamp
            
            results.append(result)
        
        # Sort by distance (ascending = most similar first)
        results.sort(key=lambda x: x['distance'])
        
        # Return top k
        return results[:k]
    
    def search_by_basin(
        self,
        query_basin: np.ndarray,
        k: int = 5,
        metric: str = 'fisher_rao'
    ) -> List[Dict]:
        """
        Search by pre-computed basin coordinates.
        
        Convenience method for when basin is already available.
        """
        return self.search(
            query_basin=query_basin,
            k=k,
            metric=metric,
            include_metadata=True
        )
    
    def get_document(self, doc_id: str) -> Optional[QIGDocument]:
        """Retrieve document by ID."""
        return self.documents.get(doc_id)
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete document from memory."""
        if doc_id in self.documents:
            del self.documents[doc_id]
            self._save_documents()
            print(f"[QIG-RAG] Deleted document {doc_id}")
            return True
        return False
    
    def clear_all(self):
        """Clear all documents (use with caution!)."""
        self.documents = {}
        self._save_documents()
        print("[QIG-RAG] Cleared all documents")
    
    def get_stats(self) -> Dict:
        """Get statistics about the geometric memory."""
        return {
            'total_documents': len(self.documents),
            'storage_path': self.storage_path,
            'oldest_document': min(
                (doc.timestamp for doc in self.documents.values()),
                default=None
            ),
            'newest_document': max(
                (doc.timestamp for doc in self.documents.values()),
                default=None
            ),
        }


# ========================================
# POSTGRESQL BACKEND FOR QIG-RAG
# Persistent geometric memory
# ========================================

import uuid

class QIGRAGDatabase(QIGRAG):
    """PostgreSQL-backed geometric memory with pgvector support."""
    
    def __init__(self, db_url: Optional[str] = None):
        """
        Initialize PostgreSQL backend.
        
        Args:
            db_url: PostgreSQL connection string
                   Default: from DATABASE_URL env var
        """
        if db_url is None:
            db_url = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/qig")
        
        self.conn = None
        try:
            import psycopg2
            from psycopg2.extras import Json
            self.psycopg2 = psycopg2
            self.Json = Json
            
            self.conn = psycopg2.connect(db_url)
            self._create_schema()
            db_display = db_url.split('@')[1] if '@' in db_url else 'localhost'
            print(f"[QIG-RAG] Connected to PostgreSQL: {db_display}")
        except ImportError:
            print("[QIG-RAG] psycopg2 not installed - falling back to JSON storage")
            print("[QIG-RAG] Install with: pip install psycopg2-binary")
            super().__init__()
        except Exception as e:
            print(f"[QIG-RAG] Failed to connect to PostgreSQL: {e}")
            print("[QIG-RAG] Falling back to in-memory storage")
            super().__init__()
    
    def _create_schema(self):
        """Create basin_documents table with pgvector index."""
        if self.conn is None:
            return
            
        with self.conn.cursor() as cur:
            # Create pgvector extension
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            except:
                print("[QIG-RAG] WARNING: pgvector extension not available")
                print("[QIG-RAG] Install with: CREATE EXTENSION vector;")
            
            # Create table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS basin_documents (
                    doc_id SERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    basin_coords FLOAT8[],
                    phi FLOAT8,
                    kappa FLOAT8,
                    regime VARCHAR(50),
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Create index on basin coordinates
            try:
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_basin_gist
                    ON basin_documents
                    USING gist (basin_coords)
                """)
            except:
                print("[QIG-RAG] Basic index created (pgvector index requires extension)")
            
            self.conn.commit()
    
    def add_document(
        self,
        content: str,
        basin_coords: Optional[np.ndarray] = None,
        metadata: Optional[Dict] = None,
        doc_id: Optional[str] = None,
        phi: float = 0.0,
        kappa: float = 0.0,
        regime: str = "unknown"
    ) -> str:
        """Add document to PostgreSQL."""
        # Encode basin if not provided
        if basin_coords is None:
            basin_coords = self.encoder.encode(content)
            
        if self.conn is None:
            # Fallback to parent implementation with matching signature
            return super().add_document(content, basin_coords, metadata, doc_id, phi, kappa, regime)
        
        doc_id = str(uuid.uuid4())
        
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO basin_documents 
                (content, basin_coords, phi, kappa, regime, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING doc_id
            """, (
                content,
                basin_coords.tolist(),
                float(phi),
                float(kappa),
                regime,
                self.Json(metadata or {})
            ))
            db_id = cur.fetchone()[0]
            self.conn.commit()
        
        return f"pg_{db_id}"
    
    def search(
        self,
        query: Optional[str] = None,
        query_basin: Optional[np.ndarray] = None,
        k: int = 5,
        metric: str = "fisher_rao",
        include_metadata: bool = False,
        min_similarity: float = 0.0
    ) -> List[Dict]:
        """Search using Fisher-Rao distance."""
        # Encode query to basin if needed
        if query_basin is None and query:
            query_basin = self.encoder.encode(query)
        
        if query_basin is None:
            return []
            
        if self.conn is None:
            return super().search(query, query_basin, k, metric, include_metadata, min_similarity)
        
        with self.conn.cursor() as cur:
            # Fetch all documents (for small datasets)
            # TODO: Optimize with proper distance indexing when pgvector available
            cur.execute("""
                SELECT doc_id, content, basin_coords, phi, kappa, regime, metadata, created_at
                FROM basin_documents
                ORDER BY created_at DESC
                LIMIT 1000
            """)
            
            results = []
            for row in cur.fetchall():
                doc_id, content, basin, phi, kappa, regime, metadata, created_at = row
                
                basin_np = np.array(basin)
                
                # Calculate Fisher-Rao distance
                if metric == "fisher_rao":
                    distance = self.fisher_rao_distance(query_basin, basin_np)
                else:
                    # Euclidean fallback
                    distance = float(np.linalg.norm(query_basin - basin_np))
                
                # Convert distance to similarity (0-1 range, higher is more similar)
                similarity = 1.0 / (1.0 + distance)
                
                if similarity >= min_similarity:
                    results.append({
                        "doc_id": f"pg_{doc_id}",
                        "content": content,
                        "basin_coords": basin_np,
                        "phi": phi,
                        "kappa": kappa,
                        "regime": regime,
                        "metadata": metadata,
                        "distance": distance,
                        "similarity": similarity,
                        "created_at": created_at.isoformat()
                    })
            
            # Sort by distance (ascending) and return top k
            results.sort(key=lambda x: x["distance"])
            return results[:k]
    
    def get_stats(self) -> Dict:
        """Get memory statistics."""
        if self.conn is None:
            return super().get_stats()
        
        with self.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM basin_documents")
            total = cur.fetchone()[0]
            
            cur.execute("SELECT AVG(phi), AVG(kappa) FROM basin_documents")
            avg_phi, avg_kappa = cur.fetchone()
            
            cur.execute("""
                SELECT regime, COUNT(*) 
                FROM basin_documents 
                GROUP BY regime
            """)
            regime_dist = dict(cur.fetchall())
        
        return {
            "total_documents": total,
            "avg_phi": float(avg_phi) if avg_phi else 0.0,
            "avg_kappa": float(avg_kappa) if avg_kappa else 0.0,
            "regime_distribution": regime_dist,
            "backend": "postgresql"
        }

