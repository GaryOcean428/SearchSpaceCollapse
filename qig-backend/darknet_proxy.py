"""
Darknet Proxy Configuration

Implements real Tor/SOCKS5 proxy support for stealth blockchain queries.
Replaces fake "darknet" labels with actual network anonymization.

Features:
- Tor SOCKS5 proxy support (default: 127.0.0.1:9050)
- HTTP/HTTPS proxy support as fallback
- Automatic detection of Tor availability
- Session management for request identity separation
- User agent rotation per request
- Fallback to clearnet if proxy unavailable

Usage:
    from darknet_proxy import get_session, is_tor_available
    
    session = get_session(use_tor=True)
    response = session.get('https://blockchain.info/balance?active=...')
"""

import os
import subprocess
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional, Dict
import random
import logging

logger = logging.getLogger(__name__)

# Track Tor subprocess if we started it
_tor_process: Optional[subprocess.Popen] = None

# User agents for rotation (appears as normal web traffic)
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
]

# Configuration from environment
ENABLE_TOR = os.getenv('ENABLE_TOR', 'false').lower() == 'true'
TOR_PROXY = os.getenv('TOR_PROXY', 'socks5h://127.0.0.1:9050')
HTTP_PROXY = os.getenv('HTTP_PROXY', '')
HTTPS_PROXY = os.getenv('HTTPS_PROXY', '')

# Session cache to reuse connections
_tor_session: Optional[requests.Session] = None
_clearnet_session: Optional[requests.Session] = None
_tor_available: Optional[bool] = None


def get_random_user_agent() -> str:
    """Get a random user agent for this request."""
    return random.choice(USER_AGENTS)


def create_session(use_proxy: bool = False) -> requests.Session:
    """
    Create a configured requests session.
    
    Args:
        use_proxy: If True, configures session with Tor/SOCKS5 proxy
        
    Returns:
        Configured requests.Session
    """
    session = requests.Session()
    
    # Retry strategy for transient failures
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"]
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    # Configure proxy if requested
    if use_proxy:
        proxies: Dict[str, str] = {}
        
        if TOR_PROXY:
            proxies['http'] = TOR_PROXY
            proxies['https'] = TOR_PROXY
            logger.info(f"[DarknetProxy] Configured Tor proxy: {TOR_PROXY}")
        elif HTTP_PROXY or HTTPS_PROXY:
            if HTTP_PROXY:
                proxies['http'] = HTTP_PROXY
            if HTTPS_PROXY:
                proxies['https'] = HTTPS_PROXY
            logger.info("[DarknetProxy] Configured HTTP/HTTPS proxy")
        
        if proxies:
            session.proxies.update(proxies)
    
    # Set random user agent
    session.headers.update({
        'User-Agent': get_random_user_agent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    
    return session


def _start_tor_daemon() -> bool:
    """
    Attempt to start the Tor daemon if not already running.
    
    Returns:
        True if Tor was started or is already running, False if failed
    """
    global _tor_process
    
    import socket
    
    # Check if something is already listening on port 9050
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.settimeout(2)
        sock.connect(('127.0.0.1', 9050))
        sock.close()
        logger.info("[DarknetProxy] Tor SOCKS port 9050 already listening")
        return True
    except (socket.error, socket.timeout):
        sock.close()
    
    # Try to start Tor
    try:
        # Find tor binary
        tor_bin = None
        for path in ['/usr/bin/tor', '/usr/local/bin/tor']:
            if os.path.exists(path):
                tor_bin = path
                break
        
        # Also check in Nix store (common on Replit)
        if not tor_bin:
            result = subprocess.run(['which', 'tor'], capture_output=True, text=True)
            if result.returncode == 0:
                tor_bin = result.stdout.strip()
        
        if not tor_bin:
            logger.warning("[DarknetProxy] Tor binary not found")
            return False
        
        logger.info(f"[DarknetProxy] Starting Tor daemon from: {tor_bin}")
        
        # Start Tor as a background process
        _tor_process = subprocess.Popen(
            [tor_bin],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True  # Detach from parent process
        )
        
        # Wait for Tor to bootstrap (up to 60 seconds)
        max_wait = 60
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            # Check if Tor is responding on port 9050
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                sock.settimeout(2)
                sock.connect(('127.0.0.1', 9050))
                sock.close()
                logger.info("[DarknetProxy] ✓ Tor daemon started and listening on port 9050")
                return True
            except (socket.error, socket.timeout):
                sock.close()
                time.sleep(2)
        
        logger.warning("[DarknetProxy] Tor daemon started but not responding within timeout")
        return False
        
    except Exception as e:
        logger.warning(f"[DarknetProxy] Failed to start Tor daemon: {e}")
        return False


def is_tor_available() -> bool:
    """
    Check if Tor proxy is available and responding.
    
    If ENABLE_TOR is true but Tor isn't running, attempts to start it.
    Caches result to avoid repeated checks.
    
    Returns:
        True if Tor is available, False otherwise
    """
    global _tor_available
    
    # Return cached result if available
    if _tor_available is not None:
        return _tor_available
    
    if not TOR_PROXY:
        _tor_available = False
        return False
    
    # If Tor is enabled, try to start the daemon first
    if ENABLE_TOR:
        if not _start_tor_daemon():
            logger.warning("[DarknetProxy] Could not start Tor daemon")
            _tor_available = False
            return False
    
    try:
        # Try to connect through Tor to check.torproject.org
        session = create_session(use_proxy=True)
        response = session.get(
            'https://check.torproject.org/api/ip',
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            is_tor = data.get('IsTor', False)
            
            if is_tor:
                logger.info("[DarknetProxy] ✓ Tor connection verified - traffic is anonymized")
                _tor_available = True
                return True
            else:
                logger.warning("[DarknetProxy] ✗ Proxy configured but not routing through Tor")
                _tor_available = False
                return False
        else:
            logger.warning(f"[DarknetProxy] ✗ Tor check failed: HTTP {response.status_code}")
            _tor_available = False
            return False
            
    except Exception as e:
        logger.warning(f"[DarknetProxy] ✗ Tor not available: {e}")
        _tor_available = False
        return False


def get_session(use_tor: Optional[bool] = None) -> requests.Session:
    """
    Get a configured session for making requests.
    
    Args:
        use_tor: If True, use Tor proxy. If False, use clearnet.
                 If None, use Tor if ENABLE_TOR=true and Tor is available.
    
    Returns:
        Configured requests.Session
    """
    global _tor_session, _clearnet_session
    
    # Determine whether to use Tor
    if use_tor is None:
        use_tor = ENABLE_TOR and is_tor_available()
    elif use_tor:
        # Explicitly requested Tor - verify it's available
        if not is_tor_available():
            logger.warning("[DarknetProxy] Tor requested but not available, falling back to clearnet")
            use_tor = False
    
    # Return cached session or create new one
    if use_tor:
        if _tor_session is None:
            logger.info("[DarknetProxy] Creating Tor session")
            _tor_session = create_session(use_proxy=True)
        else:
            # Rotate user agent for each request batch
            _tor_session.headers['User-Agent'] = get_random_user_agent()
        return _tor_session
    else:
        if _clearnet_session is None:
            logger.info("[DarknetProxy] Creating clearnet session")
            _clearnet_session = create_session(use_proxy=False)
        else:
            # Rotate user agent for each request batch
            _clearnet_session.headers['User-Agent'] = get_random_user_agent()
        return _clearnet_session


def reset_tor_check():
    """Force re-check of Tor availability on next call."""
    global _tor_available
    _tor_available = None


def get_status() -> Dict:
    """
    Get current darknet configuration status.
    
    Returns:
        Dict with configuration and availability status
    """
    return {
        'enabled': ENABLE_TOR,
        'tor_proxy': TOR_PROXY if TOR_PROXY else None,
        'http_proxy': HTTP_PROXY if HTTP_PROXY else None,
        'https_proxy': HTTPS_PROXY if HTTPS_PROXY else None,
        'tor_available': is_tor_available() if ENABLE_TOR else False,
        'mode': 'tor' if (ENABLE_TOR and is_tor_available()) else 'clearnet',
    }


# Initialize and log status
if __name__ != '__main__':
    status = get_status()
    if status['enabled']:
        if status['tor_available']:
            logger.info(f"[DarknetProxy] ✓ Operating in DARKNET mode via Tor")
        else:
            logger.warning(f"[DarknetProxy] ⚠ DARKNET mode enabled but Tor unavailable - using clearnet")
    else:
        logger.info("[DarknetProxy] Operating in CLEARNET mode")
