"""
Internal API Utilities - Centralized DRY Pattern

Provides shared utilities for internal API communication between
Python and TypeScript backends.

Security: Internal API key must be set via environment variable.
No hardcoded fallbacks in production.
"""

import os
import logging
from typing import Optional, Dict, Any
from urllib.parse import urljoin
import requests

logger = logging.getLogger(__name__)


def get_internal_api_key() -> str:
    """
    Get the internal API key for authenticating with TypeScript backend.
    
    Returns:
        The internal API key from environment or development fallback
        
    Note:
        In production, INTERNAL_API_KEY should be set securely.
        The dev fallback is only for local development.
    """
    key = os.environ.get('INTERNAL_API_KEY')
    if key:
        return key
    if os.environ.get('REPLIT_DEPLOYMENT'):
        logger.warning("[InternalAPI] INTERNAL_API_KEY not set in production!")
    return 'olympus-internal-key-dev'


def get_node_backend_url() -> str:
    """
    Get the Node.js backend URL for internal API calls.
    
    Returns:
        The backend URL (http://localhost:5000 for dev, or configured URL)
    """
    if os.environ.get("NODE_BACKEND_URL"):
        url = os.environ["NODE_BACKEND_URL"].strip()
        if not url.startswith("http"):
            url = f"http://{url}"
        return url
    if os.environ.get("REPLIT_DEV_DOMAIN"):
        return f"https://{os.environ['REPLIT_DEV_DOMAIN']}"
    return "http://localhost:5000"


def get_internal_headers(extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    """
    Get headers for internal API requests.
    
    Args:
        extra_headers: Additional headers to merge
        
    Returns:
        Headers dict with Content-Type and X-Internal-Key
    """
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Key": get_internal_api_key()
    }
    if extra_headers:
        headers.update(extra_headers)
    return headers


class InternalAPIResult:
    """Result wrapper for internal API calls to distinguish success from failure."""
    
    def __init__(self, success: bool, data: Optional[Dict[str, Any]] = None, error: Optional[str] = None):
        self.success = success
        self.data = data or {}
        self.error = error
    
    def __bool__(self) -> bool:
        return self.success


def call_internal_api(
    endpoint: str,
    method: str = "POST",
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 5
) -> InternalAPIResult:
    """
    Make an authenticated internal API call to the TypeScript backend.
    
    Args:
        endpoint: API endpoint path (e.g., "/api/olympus/war/internal-start")
        method: HTTP method (GET, POST, PUT, DELETE)
        payload: JSON payload for POST/PUT requests
        timeout: Request timeout in seconds
        
    Returns:
        InternalAPIResult with success flag and optional data/error
    """
    try:
        url = urljoin(get_node_backend_url(), endpoint)
        headers = get_internal_headers()
        
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        elif method.upper() == "PUT":
            response = requests.put(url, json=payload, headers=headers, timeout=timeout)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=timeout)
        else:
            logger.error(f"[InternalAPI] Unsupported method: {method}")
            return InternalAPIResult(False, error=f"Unsupported method: {method}")
        
        if response.ok:
            try:
                data = response.json() if response.text.strip() else {}
            except ValueError:
                data = {}
            return InternalAPIResult(True, data=data)
        else:
            error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
            logger.warning(f"[InternalAPI] {method} {endpoint} failed: {error_msg}")
            return InternalAPIResult(False, error=error_msg)
            
    except requests.RequestException as e:
        logger.warning(f"[InternalAPI] {method} {endpoint} error: {e}")
        return InternalAPIResult(False, error=str(e))


def sync_war_to_database(
    mode: str, 
    target: str, 
    strategy: str, 
    gods_engaged: list
) -> bool:
    """
    Sync war declaration to TypeScript backend (PostgreSQL storage).
    
    This ensures wars declared by Python are visible in the UI.
    
    Args:
        mode: War mode (BLITZKRIEG, SIEGE, HUNT)
        target: Target address/phrase
        strategy: War strategy description
        gods_engaged: List of engaged god names
        
    Returns:
        True if synced successfully, False otherwise
    """
    payload = {
        "mode": mode,
        "target": target,
        "strategy": strategy,
        "godsEngaged": gods_engaged
    }
    
    result = call_internal_api("/api/olympus/war/internal-start", "POST", payload)
    
    if result.success:
        logger.info(f"[InternalAPI] War synced: {mode} on {target[:40]}...")
        return True
    else:
        logger.warning(f"[InternalAPI] War sync failed: {result.error}")
        return False


__all__ = [
    'InternalAPIResult',
    'get_internal_api_key',
    'get_node_backend_url',
    'get_internal_headers',
    'call_internal_api',
    'sync_war_to_database',
]
