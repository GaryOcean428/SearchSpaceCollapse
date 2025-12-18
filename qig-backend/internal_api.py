"""
Internal API Utilities - Centralized DRY Pattern

Provides shared utilities for internal API communication between
Python and TypeScript backends.

Security: Internal API key must be set via environment variable.
No hardcoded fallbacks in production - fail fast if missing.
"""

import os
import logging
import time
from typing import Optional, Dict, Any
from urllib.parse import urljoin
import requests

logger = logging.getLogger(__name__)

# Retry configuration
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_DELAY = 0.5  # seconds
RETRY_BACKOFF_FACTOR = 2.0


class InternalAPIKeyMissingError(Exception):
    """Raised when INTERNAL_API_KEY is required but not set."""
    pass


def is_production() -> bool:
    """Check if running in production environment."""
    return bool(os.environ.get('REPLIT_DEPLOYMENT'))


def get_internal_api_key() -> str:
    """
    Get the internal API key for authenticating with TypeScript backend.
    
    Returns:
        The internal API key from environment
        
    Raises:
        InternalAPIKeyMissingError: In production when key is not set
        
    Note:
        In production, INTERNAL_API_KEY MUST be set - no fallback allowed.
        Dev fallback only used in local development environments.
    """
    key = os.environ.get('INTERNAL_API_KEY')
    if key:
        return key
    
    # In production, fail fast - no dev fallback allowed
    if is_production():
        raise InternalAPIKeyMissingError(
            "INTERNAL_API_KEY must be set in production! "
            "Set this secret in your environment variables."
        )
    
    # Only allow dev fallback in local development
    logger.debug("[InternalAPI] Using dev fallback key (local development only)")
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
    timeout: int = 5,
    max_retries: int = DEFAULT_MAX_RETRIES,
    retry_delay: float = DEFAULT_RETRY_DELAY
) -> InternalAPIResult:
    """
    Make an authenticated internal API call to the TypeScript backend.
    
    Includes exponential backoff retry logic for transient failures.
    
    Args:
        endpoint: API endpoint path (e.g., "/api/olympus/war/internal-start")
        method: HTTP method (GET, POST, PUT, DELETE)
        payload: JSON payload for POST/PUT requests
        timeout: Request timeout in seconds
        max_retries: Maximum retry attempts (default 3)
        retry_delay: Initial delay between retries in seconds
        
    Returns:
        InternalAPIResult with success flag and optional data/error
    """
    last_error: Optional[str] = None
    
    for attempt in range(max_retries):
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
            
            # Don't retry on client errors (4xx) except 429 (rate limit)
            if 400 <= response.status_code < 500 and response.status_code != 429:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.warning(f"[InternalAPI] {method} {endpoint} failed (no retry): {error_msg}")
                return InternalAPIResult(False, error=error_msg)
            
            # Retry on 5xx errors and 429
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            
        except requests.RequestException as e:
            last_error = str(e)
        
        # Calculate backoff delay with exponential growth
        if attempt < max_retries - 1:
            delay = retry_delay * (RETRY_BACKOFF_FACTOR ** attempt)
            logger.debug(f"[InternalAPI] Retry {attempt + 1}/{max_retries} for {endpoint} in {delay:.2f}s")
            time.sleep(delay)
    
    logger.warning(f"[InternalAPI] {method} {endpoint} failed after {max_retries} attempts: {last_error}")
    return InternalAPIResult(False, error=last_error)


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
    'InternalAPIKeyMissingError',
    'InternalAPIResult',
    'is_production',
    'get_internal_api_key',
    'get_node_backend_url',
    'get_internal_headers',
    'call_internal_api',
    'sync_war_to_database',
]
