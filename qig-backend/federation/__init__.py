"""
Federation Package - Cross-Instance Synchronization
====================================================

This package provides the core federation functionality for Pantheon instances:

- FederationService: Core service for vocabulary/basin/kernel sync
- federation_routes: HTTP endpoints for federation protocol

Usage:
    from federation import get_federation_service, init_federation_async

    # During app startup (non-blocking):
    init_federation_async()

    # When you need the service:
    service = get_federation_service()
    service.sync_all_peers()
"""

from .federation_service import (
    FederationService,
    get_federation_service,
    is_federation_available,
    init_federation_async,
    SyncType,
    SyncDirection,
    SyncResult,
    PeerInfo,
)

__all__ = [
    'FederationService',
    'get_federation_service',
    'is_federation_available',
    'init_federation_async',
    'SyncType',
    'SyncDirection',
    'SyncResult',
    'PeerInfo',
]
