#!/usr/bin/env python3
"""
Discovery Client for Observer Archaeology System

Posts discovered addresses to the Node.js backend for:
- Balance checking
- Dormancy cross-referencing
- Persistence to PostgreSQL

This ensures ALL addresses discovered by Python components
are captured and checked, not just lost in process memory.

Usage:
    from discovery_client import post_discovery, post_passphrase, post_address
    
    # Post a passphrase discovery
    result = post_passphrase("satoshi nakamoto", source="ocean-qig")
    
    # Post an address for checking
    result = post_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", source="geometric-probe")
    
    # Post multiple addresses
    result = post_discovery(addresses=["addr1", "addr2"], source="batch")
"""

import requests
import os
from typing import Optional, List, Dict, Any
from functools import wraps
import time
import threading
from urllib.parse import urljoin

def _get_backend_url() -> str:
    """
    Get the Node.js backend URL with proper validation.
    
    Supports multiple environment configurations:
    - NODE_BACKEND_URL: Direct URL (e.g., "http://localhost:5000")
    - REPLIT_DEV_DOMAIN: Replit development environment (prepends https://)
    - Default: localhost:5000 for local development
    """
    # Check for direct URL configuration
    if os.environ.get("NODE_BACKEND_URL"):
        url = os.environ["NODE_BACKEND_URL"].strip()
        if not url.startswith("http"):
            url = f"http://{url}"
        return url
    
    # Check for Replit environment
    if os.environ.get("REPLIT_DEV_DOMAIN"):
        return f"https://{os.environ['REPLIT_DEV_DOMAIN']}"
    
    # Check for Replit deployment URL
    if os.environ.get("REPL_SLUG") and os.environ.get("REPL_OWNER"):
        return f"https://{os.environ['REPL_SLUG']}.{os.environ['REPL_OWNER']}.repl.co"
    
    # Default to localhost for local development
    return "http://localhost:5000"

# Node.js backend URL (configurable via environment)
NODE_BACKEND_URL = _get_backend_url()
DISCOVERY_ENDPOINT = urljoin(NODE_BACKEND_URL, "/api/observer/discoveries")
STATS_ENDPOINT = urljoin(NODE_BACKEND_URL, "/api/observer/discoveries/stats")

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.0

def get_configured_url() -> str:
    """Return the currently configured backend URL (for debugging)"""
    return NODE_BACKEND_URL

# Thread-safe counters
_discovery_stats = {
    "posted": 0,
    "failed": 0,
    "dormant_matches": 0,
    "balance_hits": 0,
}
_stats_lock = threading.Lock()


def _update_stats(posted: int = 0, failed: int = 0, dormant: int = 0, balance: int = 0, queue_errors: int = 0):
    """Thread-safe stats update"""
    with _stats_lock:
        _discovery_stats["posted"] += posted
        _discovery_stats["failed"] += failed
        _discovery_stats["dormant_matches"] += dormant
        _discovery_stats["balance_hits"] += balance
        if "queue_errors" not in _discovery_stats:
            _discovery_stats["queue_errors"] = 0
        _discovery_stats["queue_errors"] += queue_errors


class DiscoveryError(Exception):
    """Raised when discovery submission fails or has critical errors"""
    def __init__(self, message: str, queue_errors: list = None, persistence_errors: list = None):
        super().__init__(message)
        self.queue_errors = queue_errors or []
        self.persistence_errors = persistence_errors or []


def retry_on_failure(max_retries: int = MAX_RETRIES, delay: float = RETRY_DELAY):
    """Decorator for retrying failed HTTP requests"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except requests.RequestException as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        time.sleep(delay * (attempt + 1))
            _update_stats(failed=1)
            print(f"[DiscoveryClient] Failed after {max_retries} attempts: {last_error}")
            return None
        return wrapper
    return decorator


@retry_on_failure()
def post_discovery(
    source: str = "python",
    address: Optional[str] = None,
    addresses: Optional[List[str]] = None,
    passphrase: Optional[str] = None,
    private_key_hex: Optional[str] = None,
    mnemonic: Optional[str] = None,
    wif: Optional[str] = None,
    priority: int = 5,
    check_dormancy: bool = True,
    check_balance: bool = True,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Post a discovery to the Node.js backend for processing
    
    Args:
        source: Identifier for the discovery source (e.g., "qig-backend", "ocean-agent")
        address: Single Bitcoin address to check
        addresses: List of Bitcoin addresses to check
        passphrase: Brain wallet passphrase
        private_key_hex: 64-character hex private key
        mnemonic: BIP39 mnemonic phrase
        wif: Wallet Import Format key
        priority: Queue priority (1-100, higher = checked first)
        check_dormancy: Whether to check against dormant wallet list
        check_balance: Whether to check blockchain balance
        metadata: Additional context to store with discovery
        
    Returns:
        Response dict with processed results, or None on failure
    """
    payload = {
        "source": source,
        "priority": priority,
        "checkDormancy": check_dormancy,
        "checkBalance": check_balance,
    }
    
    if address:
        payload["address"] = address
    if addresses:
        payload["addresses"] = addresses
    if passphrase:
        payload["passphrase"] = passphrase
    if private_key_hex:
        payload["privateKeyHex"] = private_key_hex
    if mnemonic:
        payload["mnemonic"] = mnemonic
    if wif:
        payload["wif"] = wif
    if metadata:
        payload["metadata"] = metadata
    
    response = requests.post(
        DISCOVERY_ENDPOINT,
        json=payload,
        timeout=30,
        headers={"Content-Type": "application/json"}
    )
    
    result = response.json()
    
    # Check for HTTP errors - 500 indicate hard failures that need retry
    if response.status_code >= 500:
        _update_stats(failed=1)  # Increment failed, NOT posted
        persistence_errors = result.get("persistenceErrors", [])
        queue_errors = result.get("queueErrors", [])
        hard_failures = result.get("hardFailures", [])
        error_msg = result.get("error", "Server error")
        print(f"[DiscoveryClient] Server error (will retry): {error_msg}")
        if hard_failures:
            print(f"   Hard failures: {hard_failures}")
        if persistence_errors:
            print(f"   Persistence errors: {persistence_errors}")
        if queue_errors:
            print(f"   Queue errors: {queue_errors}")
        raise requests.RequestException(f"Server error: {error_msg}")
    
    # 207 Multi-Status means partial success (addresses processed but ALL queue ops failed)
    if response.status_code == 207:
        # Don't increment posted - nothing was actually queued
        _update_stats(failed=1, queue_errors=len(result.get("queueErrors", [])))
        queue_errors = result.get("queueErrors", [])
        print(f"[DiscoveryClient] Partial failure (207): addresses checked but ALL queue operations failed")
        print(f"   Queue errors: {queue_errors}")
        print(f"   Dormancy was checked, but balance queue failed completely - consider retry")
        # Raise for retry so automation can handle
        raise requests.RequestException(f"Partial failure: queue errors {queue_errors}")
    
    response.raise_for_status()
    
    # Check for queue errors in successful 200 response
    queue_errors = result.get("queueErrors", [])
    persistence_errors = result.get("persistenceErrors", [])
    
    # Only count as "posted" the addresses that were actually queued
    processed = result.get("processed", {})
    addresses_processed = processed.get("addresses", 0)
    
    # Check if any addresses were actually queued (not just duplicates skipped)
    any_queued = any(r.get("queued", False) for r in result.get("results", []))
    posted_count = addresses_processed if any_queued else 0
    
    _update_stats(
        posted=posted_count,
        dormant=processed.get("dormantMatches", 0),
        balance=processed.get("balanceHits", 0),
        queue_errors=len(queue_errors) if not any_queued and queue_errors else 0,
    )
    
    # Log info for queue errors (duplicates are expected, queue just skips them)
    if queue_errors:
        if any_queued:
            print(f"[DiscoveryClient] INFO: Some addresses skipped (duplicates): {queue_errors}")
        else:
            print(f"[DiscoveryClient] WARNING: All addresses skipped: {queue_errors}")
            print(f"   Dormancy check still ran. Balance check not queued (duplicates/full queue).")
    
    # Persistence errors in 200 response means partial success - still return but warn
    if persistence_errors:
        print(f"[DiscoveryClient] WARNING: Persistence errors (partial success): {persistence_errors}")
    
    return result


def post_passphrase(
    passphrase: str,
    source: str = "python-passphrase",
    priority: int = 5,
) -> Optional[Dict[str, Any]]:
    """
    Post a passphrase (brain wallet) for address generation and checking
    
    Args:
        passphrase: The passphrase to derive addresses from
        source: Identifier for the discovery source
        priority: Queue priority
        
    Returns:
        Response dict with generated addresses and check results
    """
    return post_discovery(
        source=source,
        passphrase=passphrase,
        priority=priority,
    )


def post_address(
    address: str,
    source: str = "python-address",
    passphrase: Optional[str] = None,
    wif: Optional[str] = None,
    priority: int = 5,
) -> Optional[Dict[str, Any]]:
    """
    Post an address for dormancy check and optional balance check
    
    Args:
        address: Bitcoin address to check
        source: Identifier for the discovery source
        passphrase: Associated passphrase if known
        wif: WIF key if known (enables immediate balance check)
        priority: Queue priority
        
    Returns:
        Response dict with check results
    """
    return post_discovery(
        source=source,
        address=address,
        passphrase=passphrase,
        wif=wif,
        priority=priority,
        check_balance=wif is not None,
    )


def post_mnemonic(
    mnemonic: str,
    source: str = "python-mnemonic",
    priority: int = 7,
) -> Optional[Dict[str, Any]]:
    """
    Post a BIP39 mnemonic for HD wallet derivation and checking
    
    Args:
        mnemonic: BIP39 mnemonic phrase (12-24 words)
        source: Identifier for the discovery source
        priority: Queue priority (default higher for mnemonics)
        
    Returns:
        Response dict with derived addresses and check results
    """
    return post_discovery(
        source=source,
        mnemonic=mnemonic,
        priority=priority,
    )


def post_batch(
    addresses: List[str],
    source: str = "python-batch",
    priority: int = 3,
) -> Optional[Dict[str, Any]]:
    """
    Post a batch of addresses for checking
    
    Args:
        addresses: List of Bitcoin addresses
        source: Identifier for the discovery source
        priority: Queue priority
        
    Returns:
        Response dict with batch check results
    """
    return post_discovery(
        source=source,
        addresses=addresses,
        priority=priority,
    )


def get_discovery_stats() -> Optional[Dict[str, Any]]:
    """
    Get discovery capture statistics from Node.js backend
    
    Returns:
        Stats dict with queue, balance hits, and dormant matches info
    """
    try:
        response = requests.get(STATS_ENDPOINT, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"[DiscoveryClient] Failed to get stats: {e}")
        return None


def get_local_stats() -> Dict[str, int]:
    """Get local posting statistics"""
    with _stats_lock:
        return dict(_discovery_stats)


# Async-friendly wrapper for use with asyncio
async def async_post_discovery(**kwargs) -> Optional[Dict[str, Any]]:
    """Async wrapper for post_discovery (runs in thread pool)"""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: post_discovery(**kwargs))


if __name__ == "__main__":
    # Test the client
    print("Testing Discovery Client...")
    
    # Test posting a test passphrase
    result = post_passphrase("test passphrase 12345", source="test-client")
    if result:
        print(f"Posted successfully: {result.get('processed', {})}")
    else:
        print("Failed to post discovery")
    
    # Get stats
    stats = get_discovery_stats()
    if stats:
        print(f"Backend stats: {stats}")
    
    local = get_local_stats()
    print(f"Local stats: {local}")
