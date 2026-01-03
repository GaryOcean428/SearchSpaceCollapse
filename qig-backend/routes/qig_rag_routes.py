"""
QIG-RAG API Routes

FastAPI routes for Enhanced QIG-RAG with external knowledge integration.
Provides HTTP endpoints for TypeScript client to access geometric memory
and external knowledge sources.

ENDPOINTS:
- POST /qig-rag/search - Search local memory
- POST /qig-rag/search-external - Search with Wikipedia + DuckDuckGo
- POST /qig-rag/add - Add document to memory
- GET /qig-rag/stats - Get memory statistics
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
import logging

# Import EnhancedQIGRAG
try:
    from olympus.qig_rag import EnhancedQIGRAG, QIGRAGDatabase
    qig_rag_available = True
except ImportError:
    qig_rag_available = False
    EnhancedQIGRAG = None
    QIGRAGDatabase = None

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/qig-rag", tags=["qig-rag"])

# Global QIG-RAG instance
_enhanced_rag: Optional[Any] = None


def get_enhanced_rag():
    """Get or create EnhancedQIGRAG instance."""
    global _enhanced_rag
    
    if not qig_rag_available:
        raise HTTPException(
            status_code=503,
            detail="QIG-RAG not available (import failed)"
        )
    
    if _enhanced_rag is None:
        try:
            # Try to initialize with PostgreSQL
            import os
            db_url = os.environ.get("DATABASE_URL")
            _enhanced_rag = EnhancedQIGRAG(db_url=db_url, enable_external=True)
            logger.info("EnhancedQIGRAG initialized")
        except Exception as e:
            logger.error(f"Failed to initialize EnhancedQIGRAG: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"QIG-RAG initialization failed: {e}"
            )
    
    return _enhanced_rag


# Request/Response Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query text")
    k: int = Field(5, ge=1, le=100, description="Number of results")
    use_two_step: bool = Field(True, description="Use two-step retrieval")
    min_similarity: float = Field(0.0, ge=0, le=1, description="Minimum similarity")


class SearchExternalRequest(BaseModel):
    query: str = Field(..., description="Search query text")
    k: int = Field(5, ge=1, le=100, description="Number of results")
    external_weight: float = Field(0.3, ge=0, le=1, description="External source weight")
    temporal_filter: Optional[Tuple[int, int]] = Field(None, description="Year range filter")
    use_two_step: bool = Field(True, description="Use two-step retrieval")
    min_similarity: float = Field(0.0, ge=0, le=1, description="Minimum similarity")


class AddDocumentRequest(BaseModel):
    content: str = Field(..., description="Document content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Document metadata")
    phi: float = Field(0.0, description="Phi consciousness metric")
    kappa: float = Field(0.0, description="Kappa coupling metric")
    regime: str = Field("unknown", description="Geometric regime")


class QIGRAGResult(BaseModel):
    doc_id: str
    content: str
    distance: float
    similarity: float
    phi: Optional[float] = None
    kappa: Optional[float] = None
    regime: Optional[str] = None
    source: str = "local"
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[QIGRAGResult]
    query: str
    k: int
    took_ms: float


class AddDocumentResponse(BaseModel):
    doc_id: str
    success: bool


class StatsResponse(BaseModel):
    total_documents: int
    avg_phi: float
    avg_kappa: float
    regime_distribution: Dict[str, int]
    backend: str


# Routes
@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Search local geometric memory."""
    import time
    start = time.time()
    
    try:
        rag = get_enhanced_rag()
        results = rag.search(
            query=request.query,
            k=request.k,
            use_two_step=request.use_two_step,
            min_similarity=request.min_similarity
        )
        
        # Convert to response format
        formatted_results = [
            QIGRAGResult(
                doc_id=r.get("doc_id", ""),
                content=r.get("content", ""),
                distance=r.get("distance", 0.0),
                similarity=r.get("similarity", 0.0),
                phi=r.get("phi"),
                kappa=r.get("kappa"),
                regime=r.get("regime"),
                source="local",
                metadata=r.get("metadata"),
                created_at=r.get("created_at")
            )
            for r in results
        ]
        
        return SearchResponse(
            results=formatted_results,
            query=request.query,
            k=request.k,
            took_ms=(time.time() - start) * 1000
        )
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search-external", response_model=SearchResponse)
async def search_external(request: SearchExternalRequest):
    """Search with external knowledge integration (Wikipedia + DuckDuckGo)."""
    import time
    start = time.time()
    
    try:
        rag = get_enhanced_rag()
        results = rag.search_with_external(
            query=request.query,
            k=request.k,
            external_weight=request.external_weight,
            temporal_filter=request.temporal_filter
        )
        
        # Convert to response format
        formatted_results = [
            QIGRAGResult(
                doc_id=r.get("doc_id", ""),
                content=r.get("content", ""),
                distance=r.get("distance", 0.0),
                similarity=r.get("similarity", 0.0),
                phi=r.get("phi"),
                kappa=r.get("kappa"),
                regime=r.get("regime"),
                source=r.get("source", "local"),
                metadata=r.get("metadata"),
                created_at=r.get("created_at")
            )
            for r in results
        ]
        
        return SearchResponse(
            results=formatted_results,
            query=request.query,
            k=request.k,
            took_ms=(time.time() - start) * 1000
        )
    except Exception as e:
        logger.error(f"External search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add", response_model=AddDocumentResponse)
async def add_document(request: AddDocumentRequest):
    """Add document to geometric memory."""
    try:
        rag = get_enhanced_rag()
        doc_id = rag.add_document(
            content=request.content,
            metadata=request.metadata,
            phi=request.phi,
            kappa=request.kappa,
            regime=request.regime
        )
        
        return AddDocumentResponse(
            doc_id=doc_id or "",
            success=doc_id is not None
        )
    except Exception as e:
        logger.error(f"Add document failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get geometric memory statistics."""
    try:
        rag = get_enhanced_rag()
        stats = rag.get_stats()
        
        return StatsResponse(
            total_documents=stats.get("total_documents", 0),
            avg_phi=stats.get("avg_phi", 0.0),
            avg_kappa=stats.get("avg_kappa", 0.0),
            regime_distribution=stats.get("regime_distribution", {}),
            backend=stats.get("backend", "unknown")
        )
    except Exception as e:
        logger.error(f"Get stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
