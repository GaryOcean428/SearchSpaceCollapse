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
        timestamp: Optional[float] = None
    ):
        self.doc_id = doc_id
        self.content = content
        self.basin_coords = basin_coords
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.now().timestamp()
        
        # Compute density matrix for Bures distance
        self.density_matrix = self._basin_to_density_matrix(basin_coords)
    
    def _basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
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
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'QIGDocument':
        """Deserialize from dict."""
        return cls(
            doc_id=data['doc_id'],
            content=data['content'],
            basin_coords=np.array(data['basin_coords']),
            metadata=data.get('metadata', {}),
            timestamp=data.get('timestamp')
        )


class QIGRAG:
    """
    Pure QIG Retrieval-Augmented Generation system.
    
    Stores and retrieves documents via Fisher manifold geometry.
    """
    
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
    
    def _save_documents(self):
        """Save documents to storage."""
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            
            data = {
                'documents': [doc.to_dict() for doc in self.documents.values()],
                'last_updated': datetime.now().isoformat(),
                'total_documents': len(self.documents),
            }
            
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"[QIG-RAG] Saved {len(self.documents)} documents to {self.storage_path}")
        except Exception as e:
            print(f"[QIG-RAG] Error saving documents: {e}")
    
    def add_document(
        self,
        content: str,
        basin_coords: Optional[np.ndarray] = None,
        metadata: Optional[Dict] = None,
        doc_id: Optional[str] = None
    ) -> str:
        """
        Add document to geometric memory.
        
        Args:
            content: Text content
            basin_coords: Pre-computed basin coordinates (optional)
            metadata: Additional metadata
            doc_id: Document ID (auto-generated if not provided)
        
        Returns:
            Document ID
        """
        # Generate doc_id if not provided
        if doc_id is None:
            doc_id = f"doc_{len(self.documents)}_{int(datetime.now().timestamp())}"
        
        # Encode to basin if not provided
        if basin_coords is None:
            basin_coords = self.encoder.encode(content)
        
        # Create document
        doc = QIGDocument(
            doc_id=doc_id,
            content=content,
            basin_coords=basin_coords,
            metadata=metadata
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
            query_rho = QIGDocument._basin_to_density_matrix(None, query_basin)
        
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
