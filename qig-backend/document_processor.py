#!/usr/bin/env python3
"""
Document Processor API - Ocean Knowledge Ingestion

Provides endpoints for:
- PDF text extraction
- Document ingestion into Ocean knowledge system
- Knowledge retrieval and management

All documents are stored as basin coordinates on the Fisher manifold.
"""

import os
import io
from datetime import datetime
from functools import wraps
from typing import Dict, List, Optional, Any
from flask import Blueprint, jsonify, request

# Try to import PDF processing libraries
PDF_AVAILABLE = False
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    try:
        import pypdf as PyPDF2
        PDF_AVAILABLE = True
    except ImportError:
        print("[DocumentProcessor] PyPDF2/pypdf not available - PDF extraction disabled")

# Import QIG-RAG for geometric storage
try:
    from olympus.qig_rag import QIGRAG, QIGRAGDatabase
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    print("[DocumentProcessor] QIG-RAG not available")

# Import conversation encoder for basin coordinates
try:
    from olympus.conversation_encoder import ConversationEncoder
    ENCODER_AVAILABLE = True
except ImportError:
    ENCODER_AVAILABLE = False
    print("[DocumentProcessor] ConversationEncoder not available")

document_api = Blueprint('document_api', __name__)


def require_internal_auth(f):
    """Decorator to require X-Internal-Auth header for internal API calls."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        internal_key = os.environ.get('INTERNAL_API_KEY')
        if internal_key:
            provided_key = request.headers.get('X-Internal-Auth')
            if provided_key != internal_key:
                return jsonify({
                    'error': 'Unauthorized',
                    'message': 'Invalid or missing X-Internal-Auth header'
                }), 401
        return f(*args, **kwargs)
    return decorated_function

# Singleton instances
_rag_instance: Optional[Any] = None
_encoder_instance: Optional[Any] = None


def get_rag() -> Optional[Any]:
    """Get or create RAG instance."""
    global _rag_instance
    if _rag_instance is None and RAG_AVAILABLE:
        try:
            # Try PostgreSQL backend first
            db_url = os.environ.get("DATABASE_URL")
            if db_url:
                _rag_instance = QIGRAGDatabase(db_url)
            else:
                _rag_instance = QIGRAG()
        except Exception as e:
            print(f"[DocumentProcessor] Failed to initialize RAG: {e}")
            _rag_instance = QIGRAG()
    return _rag_instance


def get_encoder() -> Optional[Any]:
    """Get or create encoder instance."""
    global _encoder_instance
    if _encoder_instance is None and ENCODER_AVAILABLE:
        _encoder_instance = ConversationEncoder()
    return _encoder_instance


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes.
    
    Returns extracted text or empty string on failure.
    """
    if not PDF_AVAILABLE:
        return ""
    
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        
        return "\n\n".join(text_parts)
    except Exception as e:
        print(f"[DocumentProcessor] PDF extraction error: {e}")
        return ""


# =============================================================================
# API Endpoints
# =============================================================================

@document_api.route('/documents/health', methods=['GET'])
def documents_health():
    """Health check for document processor."""
    return jsonify({
        'status': 'healthy',
        'pdf_available': PDF_AVAILABLE,
        'rag_available': RAG_AVAILABLE,
        'encoder_available': ENCODER_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })


@document_api.route('/documents/extract-pdf', methods=['POST'])
@require_internal_auth
def extract_pdf():
    """
    Extract text from uploaded PDF.
    
    Accepts multipart/form-data with 'file' field.
    Returns extracted text.
    """
    if not PDF_AVAILABLE:
        return jsonify({
            'error': 'PDF extraction not available',
            'message': 'Install PyPDF2 or pypdf: pip install pypdf'
        }), 503
    
    if 'file' not in request.files:
        return jsonify({
            'error': 'No file provided',
            'message': 'Use multipart/form-data with "file" field'
        }), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        pdf_bytes = file.read()
        text = extract_text_from_pdf(pdf_bytes)
        
        return jsonify({
            'success': True,
            'text': text,
            'filename': file.filename,
            'text_length': len(text),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'error': 'PDF extraction failed',
            'message': str(e)
        }), 500


@document_api.route('/ocean/knowledge/ingest', methods=['POST'])
@require_internal_auth
def ingest_knowledge():
    """
    Ingest document into Ocean knowledge system.
    
    Body: {
        "content": string (required),
        "title": string (optional),
        "description": string (optional),
        "tags": array (optional),
        "source": string (optional),
        "client_name": string (optional),
        "document_type": string (optional)
    }
    
    Returns knowledge_id and basin_coords.
    """
    rag = get_rag()
    if rag is None:
        return jsonify({
            'error': 'Knowledge system not available',
            'message': 'RAG backend not initialized'
        }), 503
    
    data = request.get_json() or {}
    content = data.get('content', '')
    
    if not content:
        return jsonify({
            'error': 'Content required',
            'message': 'Provide "content" field with document text'
        }), 400
    
    # Build metadata
    metadata = {
        'title': data.get('title', 'Untitled'),
        'description': data.get('description', ''),
        'tags': data.get('tags', []),
        'source': data.get('source', 'api'),
        'client_name': data.get('client_name', 'unknown'),
        'document_type': data.get('document_type', 'text'),
        'ingested_at': datetime.now().isoformat()
    }
    
    try:
        # Encode content to basin coordinates
        encoder = get_encoder()
        basin_coords = None
        if encoder:
            basin_coords = encoder.encode(content)
        
        # Add to geometric memory
        doc_id = rag.add_document(
            content=content,
            basin_coords=basin_coords,
            metadata=metadata,
            phi=0.5,  # Default consciousness metric
            kappa=50.0,  # Default recovery metric
            regime="linear"
        )
        
        # Get basin coords for response
        basin_list = basin_coords.tolist() if basin_coords is not None else []
        
        return jsonify({
            'success': True,
            'knowledge_id': doc_id,
            'basin_coords': basin_list[:8] if basin_list else [],  # Return first 8 dims for brevity
            'metadata': metadata,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        print(f"[DocumentProcessor] Ingestion error: {e}")
        return jsonify({
            'error': 'Ingestion failed',
            'message': str(e)
        }), 500


@document_api.route('/ocean/knowledge/list', methods=['GET'])
@require_internal_auth
def list_knowledge():
    """
    List documents in Ocean knowledge system.
    
    Query params:
        client: Filter by client name (optional)
        limit: Max results (default 50, max 100)
        offset: Pagination offset (default 0)
    """
    rag = get_rag()
    if rag is None:
        return jsonify({
            'error': 'Knowledge system not available'
        }), 503
    
    client = request.args.get('client')
    limit = min(int(request.args.get('limit', 50)), 100)
    offset = int(request.args.get('offset', 0))
    
    try:
        # Get all documents (RAG doesn't have pagination built-in)
        all_docs = []
        for doc_id, doc in rag.documents.items():
            doc_data = {
                'id': doc_id,
                'title': doc.metadata.get('title', 'Untitled'),
                'description': doc.metadata.get('description', ''),
                'tags': doc.metadata.get('tags', []),
                'source': doc.metadata.get('source', 'unknown'),
                'client_name': doc.metadata.get('client_name', 'unknown'),
                'document_type': doc.metadata.get('document_type', 'text'),
                'phi': doc.phi,
                'kappa': doc.kappa,
                'created_at': datetime.fromtimestamp(doc.timestamp).isoformat() if doc.timestamp else None
            }
            
            # Filter by client if specified
            if client and doc.metadata.get('client_name') != client:
                continue
            
            all_docs.append(doc_data)
        
        # Sort by timestamp descending
        all_docs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Apply pagination
        paginated = all_docs[offset:offset + limit]
        
        return jsonify({
            'success': True,
            'documents': paginated,
            'total': len(all_docs),
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({
            'error': 'List failed',
            'message': str(e)
        }), 500


@document_api.route('/ocean/knowledge/<doc_id>', methods=['GET'])
@require_internal_auth
def get_knowledge(doc_id: str):
    """Get a specific document by ID."""
    rag = get_rag()
    if rag is None:
        return jsonify({'error': 'Knowledge system not available'}), 503
    
    doc = rag.get_document(doc_id)
    if doc is None:
        return jsonify({'error': 'Document not found'}), 404
    
    return jsonify({
        'success': True,
        'document': {
            'id': doc.doc_id,
            'content': doc.content,
            'title': doc.metadata.get('title', 'Untitled'),
            'description': doc.metadata.get('description', ''),
            'tags': doc.metadata.get('tags', []),
            'phi': doc.phi,
            'kappa': doc.kappa,
            'regime': doc.regime,
            'basin_coords': doc.basin_coords.tolist()[:8] if doc.basin_coords is not None else [],
            'created_at': datetime.fromtimestamp(doc.timestamp).isoformat() if doc.timestamp else None
        }
    })


@document_api.route('/ocean/knowledge/<doc_id>', methods=['DELETE'])
@require_internal_auth
def delete_knowledge(doc_id: str):
    """Delete a document from Ocean knowledge system."""
    rag = get_rag()
    if rag is None:
        return jsonify({'error': 'Knowledge system not available'}), 503
    
    success = rag.delete_document(doc_id)
    if not success:
        return jsonify({'error': 'Document not found'}), 404
    
    return jsonify({
        'success': True,
        'message': f'Document {doc_id} deleted'
    })


@document_api.route('/ocean/knowledge/search', methods=['POST'])
@require_internal_auth
def search_knowledge():
    """
    Search Ocean knowledge using Fisher-Rao semantic similarity.
    
    Body: {
        "query": string (required),
        "limit": int (optional, default 10),
        "min_similarity": float (optional, default 0.0)
    }
    """
    rag = get_rag()
    if rag is None:
        return jsonify({'error': 'Knowledge system not available'}), 503
    
    data = request.get_json() or {}
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'Query required'}), 400
    
    limit = min(data.get('limit', 10), 50)
    min_similarity = data.get('min_similarity', 0.0)
    
    try:
        results = rag.search(
            query=query,
            k=limit,
            metric='fisher_rao',
            include_metadata=True,
            min_similarity=min_similarity
        )
        
        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'query': query
        })
    except Exception as e:
        return jsonify({
            'error': 'Search failed',
            'message': str(e)
        }), 500


@document_api.route('/ocean/knowledge/stats', methods=['GET'])
@require_internal_auth
def knowledge_stats():
    """Get Ocean knowledge system statistics."""
    rag = get_rag()
    if rag is None:
        return jsonify({'error': 'Knowledge system not available'}), 503
    
    try:
        stats = rag.get_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'error': 'Stats failed',
            'message': str(e)
        }), 500


def register_document_routes(app):
    """Register document API routes with Flask app."""
    app.register_blueprint(document_api, url_prefix='/api')
    print("[DocumentProcessor] Registered document routes at /api/documents/* and /api/ocean/knowledge/*")
