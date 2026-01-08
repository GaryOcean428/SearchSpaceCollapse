"""
Upload Service for Curriculum and Chat RAG

Two upload pathways:
1. Curriculum Upload - Persistent learning (adds to docs/09-curriculum/)
2. Chat Upload - Immediate RAG discussion (optional curriculum toggle)

Production: Uses object storage with signed URLs
Development: Uses local filesystem
"""

import os
import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import json

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'.md', '.txt', '.markdown'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
CURRICULUM_DIR = Path(__file__).parent.parent / 'docs' / '09-curriculum'
RAG_CACHE_DIR = Path(__file__).parent / 'data' / 'rag_cache'


class UploadService:
    """
    Handles file uploads for curriculum learning and chat RAG.
    
    Usage:
        service = get_upload_service()
        
        # Curriculum upload (persistent learning)
        result = service.upload_curriculum(file_content, filename)
        
        # Chat upload (immediate RAG, optional curriculum)
        result = service.upload_chat(file_content, filename, add_to_curriculum=False)
    """
    
    def __init__(self):
        self.curriculum_dir = CURRICULUM_DIR
        self.rag_cache_dir = RAG_CACHE_DIR
        
        self.curriculum_dir.mkdir(parents=True, exist_ok=True)
        self.rag_cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.upload_log: List[Dict] = []
        self._load_upload_log()
        
        logger.info(f"[UploadService] Initialized. Curriculum: {self.curriculum_dir}")
    
    def _load_upload_log(self):
        """Load upload history from disk."""
        log_path = self.rag_cache_dir / 'upload_log.json'
        if log_path.exists():
            try:
                with open(log_path) as f:
                    self.upload_log = json.load(f)
            except Exception:
                self.upload_log = []
    
    def _save_upload_log(self):
        """Save upload history to disk."""
        log_path = self.rag_cache_dir / 'upload_log.json'
        try:
            with open(log_path, 'w') as f:
                json.dump(self.upload_log[-1000:], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save upload log: {e}")
    
    def _compute_checksum(self, content: bytes) -> str:
        """Compute SHA256 checksum for deduplication."""
        return hashlib.sha256(content).hexdigest()[:16]
    
    def _validate_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        """Validate file for upload."""
        errors = []
        
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append(f"Invalid file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
        
        if len(content) > MAX_FILE_SIZE:
            errors.append(f"File too large: {len(content)} bytes. Max: {MAX_FILE_SIZE}")
        
        if len(content) == 0:
            errors.append("File is empty")
        
        try:
            content.decode('utf-8')
        except UnicodeDecodeError:
            errors.append("File must be valid UTF-8 text")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'size': len(content),
            'extension': ext
        }
    
    def _check_duplicate(self, checksum: str, target_dir: Path) -> Optional[Path]:
        """Check if file already exists (by checksum prefix in filename)."""
        for existing in target_dir.glob(f'*_{checksum}*'):
            return existing
        return None
    
    def upload_curriculum(
        self, 
        content: bytes, 
        filename: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Upload file to curriculum for persistent learning.
        
        Files are stored in docs/09-curriculum/ and will be learned
        in the next hourly learning cycle.
        
        Args:
            content: File content as bytes
            filename: Original filename
            metadata: Optional metadata (author, tags, etc.)
        
        Returns:
            Upload result with path and status
        """
        validation = self._validate_file(filename, content)
        if not validation['valid']:
            return {
                'success': False,
                'error': 'Validation failed',
                'details': validation['errors']
            }
        
        checksum = self._compute_checksum(content)
        
        existing = self._check_duplicate(checksum, self.curriculum_dir)
        if existing:
            return {
                'success': True,
                'action': 'deduplicated',
                'path': str(existing),
                'message': 'File already exists in curriculum'
            }
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_name = Path(filename).stem.replace(' ', '_')[:500]
        new_filename = f"{timestamp}_{safe_name}_{checksum}{Path(filename).suffix}"
        
        file_path = self.curriculum_dir / new_filename
        
        try:
            with open(file_path, 'wb') as f:
                f.write(content)
            
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'type': 'curriculum',
                'filename': filename,
                'stored_as': new_filename,
                'checksum': checksum,
                'size': len(content),
                'metadata': metadata or {}
            }
            self.upload_log.append(log_entry)
            self._save_upload_log()
            
            logger.info(f"[UploadService] Curriculum upload: {new_filename}")
            
            return {
                'success': True,
                'action': 'created',
                'path': str(file_path),
                'filename': new_filename,
                'will_learn_next_cycle': True,
                'message': 'File added to curriculum. Will be learned in next cycle.'
            }
            
        except Exception as e:
            logger.error(f"[UploadService] Curriculum upload failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_chat(
        self,
        content: bytes,
        filename: str,
        add_to_curriculum: bool = False,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload file for immediate chat RAG discussion.
        
        File is processed for immediate use in conversation.
        Optionally also adds to curriculum for long-term learning.
        
        Args:
            content: File content as bytes
            filename: Original filename  
            add_to_curriculum: If True, also persist to curriculum
            session_id: Chat session ID for context
        
        Returns:
            Upload result with extracted content for RAG
        """
        validation = self._validate_file(filename, content)
        if not validation['valid']:
            return {
                'success': False,
                'error': 'Validation failed',
                'details': validation['errors']
            }
        
        checksum = self._compute_checksum(content)
        text_content = content.decode('utf-8')
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        cache_filename = f"chat_{timestamp}_{checksum}.txt"
        cache_path = self.rag_cache_dir / cache_filename
        
        try:
            with open(cache_path, 'w') as f:
                f.write(text_content)
            
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'type': 'chat_rag',
                'filename': filename,
                'cached_as': cache_filename,
                'checksum': checksum,
                'size': len(content),
                'session_id': session_id,
                'added_to_curriculum': add_to_curriculum
            }
            self.upload_log.append(log_entry)
            self._save_upload_log()
            
            result = {
                'success': True,
                'action': 'processed',
                'rag_content': text_content,
                'cache_path': str(cache_path),
                'word_count': len(text_content.split()),
                'ready_for_discussion': True
            }
            
            if add_to_curriculum:
                curriculum_result = self.upload_curriculum(content, filename)
                result['curriculum_added'] = curriculum_result.get('success', False)
                result['curriculum_path'] = curriculum_result.get('path')
            
            logger.info(f"[UploadService] Chat upload: {filename} (curriculum: {add_to_curriculum})")
            
            return result
            
        except Exception as e:
            logger.error(f"[UploadService] Chat upload failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_rag_content(self, cache_path: str) -> Optional[str]:
        """Retrieve cached RAG content for discussion."""
        try:
            with open(cache_path) as f:
                return f.read()
        except Exception:
            return None
    
    def list_curriculum_files(self) -> List[Dict]:
        """List all curriculum files."""
        files = []
        for f in sorted(self.curriculum_dir.glob('*')):
            if f.suffix.lower() in ALLOWED_EXTENSIONS:
                files.append({
                    'filename': f.name,
                    'path': str(f),
                    'size': f.stat().st_size,
                    'modified': datetime.fromtimestamp(f.stat().st_mtime).isoformat()
                })
        return files
    
    def get_upload_stats(self) -> Dict[str, Any]:
        """Get upload statistics."""
        curriculum_count = len(list(self.curriculum_dir.glob('*')))
        rag_cache_count = len(list(self.rag_cache_dir.glob('chat_*.txt')))
        
        return {
            'curriculum_files': curriculum_count,
            'rag_cache_files': rag_cache_count,
            'total_uploads': len(self.upload_log),
            'recent_uploads': self.upload_log[-10:]
        }


_upload_service: Optional[UploadService] = None


def get_upload_service() -> UploadService:
    """Get or create singleton upload service."""
    global _upload_service
    if _upload_service is None:
        _upload_service = UploadService()
    return _upload_service
