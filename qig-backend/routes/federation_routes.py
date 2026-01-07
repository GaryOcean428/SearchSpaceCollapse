"""
Federation Routes - Bidirectional Node Sync & Mesh Network

Provides endpoints for:
- /federation/register - Register new nodes with auto API key generation
- /federation/sync/knowledge - Bidirectional knowledge sync (basins, vocab, research)
- /federation/sync/capabilities - Share and receive tool/capability definitions
- /federation/mesh/status - Get mesh network status
- /federation/mesh/peers - List connected peers
- /federation/mesh/broadcast - Broadcast to all peers
- /federation/service/* - FederationService management endpoints

This enables federation nodes and external chat UIs to:
1. Register and get API credentials
2. Share learned knowledge bidirectionally
3. Increase collective capability through mesh networking
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
import secrets
import hashlib
import traceback
from typing import Dict, List, Optional, Any
import json
import os

# Import FederationService for actual sync operations
try:
    from federation import get_federation_service
    HAS_FEDERATION_SERVICE = True
except ImportError:
    HAS_FEDERATION_SERVICE = False
    get_federation_service = None

# Create blueprint
federation_bp = Blueprint('federation', __name__)

# In-memory storage (in production, use PostgreSQL)
_registered_nodes: Dict[str, Dict] = {}
_mesh_knowledge_pool: Dict[str, Dict] = {}
_shared_capabilities: Dict[str, List[Dict]] = {}
_sync_history: List[Dict] = []

# Constants
API_KEY_PREFIX = "qig_"
API_KEY_LENGTH = 32


def generate_api_key() -> str:
    """Generate a secure API key for a new node."""
    random_bytes = secrets.token_hex(API_KEY_LENGTH)
    return f"{API_KEY_PREFIX}{random_bytes}"


def hash_api_key(api_key: str) -> str:
    """Hash API key for storage (never store plain text)."""
    return hashlib.sha256(api_key.encode()).hexdigest()


def validate_api_key(api_key: str) -> Optional[Dict]:
    """Validate an API key and return the node info if valid."""
    if not api_key or not api_key.startswith(API_KEY_PREFIX):
        return None
    
    key_hash = hash_api_key(api_key)
    for node_id, node in _registered_nodes.items():
        if node.get('key_hash') == key_hash:
            return node
    return None


def get_node_from_request() -> Optional[Dict]:
    """Extract and validate node from request headers."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        api_key = auth_header[7:]
        return validate_api_key(api_key)
    return None


# ============================================================================
# NODE REGISTRATION
# ============================================================================

@federation_bp.route('/register', methods=['POST'])
def register_node():
    """
    Register a new federation node or external chat UI.
    
    Request:
        {
            "node_name": "my-chat-ui",
            "node_type": "chat_ui" | "federation_node" | "agent",
            "capabilities": ["chat", "research", "tools"],
            "endpoint_url": "https://mynode.example.com/api"  // optional, for bidirectional
        }
    
    Response:
        {
            "success": true,
            "node_id": "node_abc123",
            "api_key": "qig_xxx...",  // Only shown ONCE!
            "message": "Store this API key securely - it won't be shown again"
        }
    """
    try:
        data = request.get_json() or {}
        
        node_name = data.get('node_name')
        node_type = data.get('node_type', 'chat_ui')
        capabilities = data.get('capabilities', ['chat'])
        endpoint_url = data.get('endpoint_url')
        
        if not node_name:
            return jsonify({
                'success': False,
                'error': 'node_name is required'
            }), 400
        
        # Generate unique node ID and API key
        node_id = f"node_{secrets.token_hex(8)}"
        api_key = generate_api_key()
        key_hash = hash_api_key(api_key)
        
        # Store node info (with hashed key)
        node_info = {
            'node_id': node_id,
            'node_name': node_name,
            'node_type': node_type,
            'capabilities': capabilities,
            'endpoint_url': endpoint_url,
            'key_hash': key_hash,
            'registered_at': datetime.now(timezone.utc).isoformat(),
            'last_seen': datetime.now(timezone.utc).isoformat(),
            'sync_count': 0,
            'knowledge_contributed': 0,
            'knowledge_received': 0
        }
        _registered_nodes[node_id] = node_info
        
        return jsonify({
            'success': True,
            'node_id': node_id,
            'api_key': api_key,  # Only shown once!
            'message': 'Store this API key securely - it will not be shown again',
            'endpoints': {
                'chat': '/api/v1/external/chat',
                'stream': '/api/v1/external/chat (with stream: true)',
                'sync_knowledge': '/federation/sync/knowledge',
                'sync_capabilities': '/federation/sync/capabilities',
                'mesh_status': '/federation/mesh/status'
            }
        })
        
    except Exception as e:
        print(f"[Federation] Error registering node: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/nodes', methods=['GET'])
def list_nodes():
    """List registered nodes (admin endpoint)."""
    try:
        # Return node info without sensitive data
        nodes = []
        for node_id, node in _registered_nodes.items():
            nodes.append({
                'node_id': node['node_id'],
                'node_name': node['node_name'],
                'node_type': node['node_type'],
                'capabilities': node['capabilities'],
                'registered_at': node['registered_at'],
                'last_seen': node['last_seen'],
                'sync_count': node['sync_count'],
                'knowledge_contributed': node.get('knowledge_contributed', 0),
                'knowledge_received': node.get('knowledge_received', 0)
            })
        
        return jsonify({
            'success': True,
            'nodes': nodes,
            'total': len(nodes)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# KNOWLEDGE SYNC - Bidirectional Learning
# ============================================================================

@federation_bp.route('/sync/knowledge', methods=['POST'])
def sync_knowledge():
    """
    Bidirectional knowledge sync between nodes.
    
    Nodes can SEND their learned knowledge AND RECEIVE knowledge from the mesh.
    This increases the collective capability of all connected nodes.
    
    Request:
        {
            "send": {
                "basins": [{"id": "...", "coords": [...], "domain": "..."}],
                "vocabulary": [{"word": "...", "definition": "...", "domain": "..."}],
                "research": [{"topic": "...", "findings": "...", "sources": [...]}],
                "tools": [{"name": "...", "description": "...", "schema": {...}}]
            },
            "request": {
                "domains": ["philosophy", "science"],  // Request knowledge in these domains
                "since": "2024-01-01T00:00:00Z",  // Only knowledge after this time
                "limit": 100
            }
        }
    
    Response:
        {
            "success": true,
            "received": {
                "basins": 5,
                "vocabulary": 12,
                "research": 3,
                "tools": 2
            },
            "knowledge": {
                "basins": [...],
                "vocabulary": [...],
                "research": [...],
                "tools": [...]
            },
            "mesh_stats": {
                "total_nodes": 5,
                "total_knowledge_items": 1234,
                "your_contribution_rank": 2
            }
        }
    """
    try:
        # Validate node
        node = get_node_from_request()
        if not node:
            return jsonify({
                'success': False,
                'error': 'Invalid or missing API key',
                'hint': 'Use Authorization: Bearer <api_key> header'
            }), 401
        
        data = request.get_json() or {}
        send_data = data.get('send', {})
        request_params = data.get('request', {})
        
        # Process incoming knowledge (what the node is sharing)
        received_counts = {
            'basins': 0,
            'vocabulary': 0,
            'research': 0,
            'tools': 0
        }
        
        node_id = node['node_id']
        
        # Store received basins
        if 'basins' in send_data:
            for basin in send_data['basins']:
                basin_id = basin.get('id', secrets.token_hex(8))
                _mesh_knowledge_pool[f"basin_{basin_id}"] = {
                    'type': 'basin',
                    'data': basin,
                    'contributed_by': node_id,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                received_counts['basins'] += 1
        
        # Store received vocabulary (both in-memory and database)
        if 'vocabulary' in send_data:
            for vocab in send_data['vocabulary']:
                word = vocab.get('word', '')
                _mesh_knowledge_pool[f"vocab_{word}"] = {
                    'type': 'vocabulary',
                    'data': vocab,
                    'contributed_by': node_id,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                received_counts['vocabulary'] += 1

            # Persist vocabulary to database
            _persist_vocabulary_to_db(send_data['vocabulary'])

        # Store received research
        if 'research' in send_data:
            for research in send_data['research']:
                research_id = research.get('id', secrets.token_hex(8))
                _mesh_knowledge_pool[f"research_{research_id}"] = {
                    'type': 'research',
                    'data': research,
                    'contributed_by': node_id,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                received_counts['research'] += 1
        
        # Store received tools/capabilities
        if 'tools' in send_data:
            for tool in send_data['tools']:
                tool_name = tool.get('name', '')
                _mesh_knowledge_pool[f"tool_{tool_name}"] = {
                    'type': 'tool',
                    'data': tool,
                    'contributed_by': node_id,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                received_counts['tools'] += 1
        
        # Update node stats
        total_contributed = sum(received_counts.values())
        _registered_nodes[node_id]['knowledge_contributed'] = \
            _registered_nodes[node_id].get('knowledge_contributed', 0) + total_contributed
        _registered_nodes[node_id]['last_seen'] = datetime.now(timezone.utc).isoformat()
        _registered_nodes[node_id]['sync_count'] += 1
        
        # Prepare knowledge to send back (what the node is requesting)
        response_knowledge = {
            'basins': [],
            'vocabulary': [],
            'research': [],
            'tools': []
        }
        
        requested_domains = request_params.get('domains', [])
        since = request_params.get('since')
        limit = request_params.get('limit', 100)
        
        # Gather knowledge from the pool
        items_sent = 0
        for key, item in _mesh_knowledge_pool.items():
            if items_sent >= limit:
                break
            
            # Skip if contributed by same node (they already have it)
            if item.get('contributed_by') == node_id:
                continue
            
            # Filter by timestamp if specified
            if since:
                item_time = item.get('timestamp', '')
                if item_time < since:
                    continue
            
            # Filter by domain if specified
            if requested_domains:
                item_domain = item.get('data', {}).get('domain', '')
                if item_domain and item_domain not in requested_domains:
                    continue
            
            item_type = item.get('type')
            if item_type == 'basin':
                response_knowledge['basins'].append(item['data'])
            elif item_type == 'vocabulary':
                response_knowledge['vocabulary'].append(item['data'])
            elif item_type == 'research':
                response_knowledge['research'].append(item['data'])
            elif item_type == 'tool':
                response_knowledge['tools'].append(item['data'])
            
            items_sent += 1
        
        # Update knowledge received stats
        _registered_nodes[node_id]['knowledge_received'] = \
            _registered_nodes[node_id].get('knowledge_received', 0) + items_sent
        
        # Record sync in history
        _sync_history.append({
            'node_id': node_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'contributed': received_counts,
            'received': items_sent
        })
        
        # Calculate mesh stats
        mesh_stats = {
            'total_nodes': len(_registered_nodes),
            'total_knowledge_items': len(_mesh_knowledge_pool),
            'your_contribution_rank': _calculate_contribution_rank(node_id),
            'active_nodes_24h': _count_active_nodes_24h()
        }
        
        return jsonify({
            'success': True,
            'received': received_counts,
            'knowledge': response_knowledge,
            'mesh_stats': mesh_stats
        })
        
    except Exception as e:
        print(f"[Federation] Error in knowledge sync: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/sync/capabilities', methods=['POST'])
def sync_capabilities():
    """
    Sync tool/capability definitions between nodes.
    
    This allows nodes to learn about new tools available in the mesh
    and share their own custom tools.
    
    Request:
        {
            "share": [
                {
                    "name": "custom_analyzer",
                    "description": "Analyzes X using Y method",
                    "schema": {"type": "object", "properties": {...}},
                    "endpoint": "/api/tools/custom_analyzer"  // optional
                }
            ],
            "discover": true  // Get available capabilities from mesh
        }
    
    Response:
        {
            "success": true,
            "shared": 1,
            "available_capabilities": [
                {"name": "...", "description": "...", "provided_by": "node_xyz"}
            ]
        }
    """
    try:
        node = get_node_from_request()
        if not node:
            return jsonify({
                'success': False,
                'error': 'Invalid or missing API key'
            }), 401
        
        data = request.get_json() or {}
        share_capabilities = data.get('share', [])
        discover = data.get('discover', True)
        
        node_id = node['node_id']
        
        # Store shared capabilities
        shared_count = 0
        for cap in share_capabilities:
            cap_name = cap.get('name')
            if cap_name:
                if node_id not in _shared_capabilities:
                    _shared_capabilities[node_id] = []
                
                # Add or update capability
                existing = next((c for c in _shared_capabilities[node_id] if c.get('name') == cap_name), None)
                if existing:
                    existing.update(cap)
                else:
                    _shared_capabilities[node_id].append(cap)
                shared_count += 1
        
        # Gather available capabilities from all nodes
        available = []
        if discover:
            for nid, caps in _shared_capabilities.items():
                if nid == node_id:
                    continue  # Skip own capabilities
                for cap in caps:
                    available.append({
                        **cap,
                        'provided_by': nid,
                        'node_name': _registered_nodes.get(nid, {}).get('node_name', 'Unknown')
                    })
        
        return jsonify({
            'success': True,
            'shared': shared_count,
            'available_capabilities': available,
            'total_mesh_capabilities': sum(len(c) for c in _shared_capabilities.values())
        })
        
    except Exception as e:
        print(f"[Federation] Error in capability sync: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# MESH NETWORK STATUS
# ============================================================================

@federation_bp.route('/mesh/status', methods=['GET'])
def mesh_status():
    """
    Get overall mesh network status.
    
    Response:
        {
            "success": true,
            "mesh": {
                "total_nodes": 5,
                "active_nodes_24h": 3,
                "total_knowledge_items": 1234,
                "total_capabilities": 45,
                "syncs_last_hour": 12
            },
            "top_contributors": [...],
            "recent_activity": [...]
        }
    """
    try:
        # Calculate mesh statistics
        active_24h = _count_active_nodes_24h()
        total_capabilities = sum(len(c) for c in _shared_capabilities.values())
        
        # Get recent syncs
        recent_syncs = _sync_history[-10:] if _sync_history else []
        syncs_last_hour = sum(
            1 for s in _sync_history 
            if _is_within_hours(s.get('timestamp', ''), 1)
        )
        
        # Get top contributors
        top_contributors = sorted(
            [
                {
                    'node_id': n['node_id'],
                    'node_name': n['node_name'],
                    'knowledge_contributed': n.get('knowledge_contributed', 0)
                }
                for n in _registered_nodes.values()
            ],
            key=lambda x: x['knowledge_contributed'],
            reverse=True
        )[:5]
        
        # Knowledge breakdown by type
        knowledge_by_type = {'basins': 0, 'vocabulary': 0, 'research': 0, 'tools': 0}
        for item in _mesh_knowledge_pool.values():
            item_type = item.get('type', '')
            if item_type in knowledge_by_type:
                knowledge_by_type[item_type] += 1
        
        return jsonify({
            'success': True,
            'mesh': {
                'total_nodes': len(_registered_nodes),
                'active_nodes_24h': active_24h,
                'total_knowledge_items': len(_mesh_knowledge_pool),
                'total_capabilities': total_capabilities,
                'syncs_last_hour': syncs_last_hour,
                'knowledge_by_type': knowledge_by_type
            },
            'top_contributors': top_contributors,
            'recent_activity': recent_syncs[-5:]
        })
        
    except Exception as e:
        print(f"[Federation] Error getting mesh status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/mesh/peers', methods=['GET'])
def list_peers():
    """
    List all connected peers in the mesh.
    
    Response:
        {
            "success": true,
            "peers": [
                {
                    "node_id": "node_abc",
                    "node_name": "My Chat UI",
                    "node_type": "chat_ui",
                    "capabilities": ["chat", "research"],
                    "last_seen": "2024-01-01T12:00:00Z",
                    "status": "active"
                }
            ]
        }
    """
    try:
        peers = []
        now = datetime.now(timezone.utc)
        
        for node_id, node in _registered_nodes.items():
            last_seen = node.get('last_seen', '')
            status = 'active' if _is_within_hours(last_seen, 24) else 'inactive'
            
            peers.append({
                'node_id': node['node_id'],
                'node_name': node['node_name'],
                'node_type': node['node_type'],
                'capabilities': node.get('capabilities', []),
                'last_seen': last_seen,
                'status': status,
                'endpoint_url': node.get('endpoint_url'),
                'sync_count': node.get('sync_count', 0)
            })
        
        return jsonify({
            'success': True,
            'peers': peers,
            'total': len(peers)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/mesh/broadcast', methods=['POST'])
def broadcast_to_mesh():
    """
    Broadcast a message to all nodes in the mesh.
    
    Used for:
    - Announcing new capabilities
    - Sharing urgent research findings
    - Coordinating mesh-wide operations
    
    Request:
        {
            "type": "announcement" | "capability" | "research" | "alert",
            "message": "New capability available: ...",
            "data": {...}  // Optional structured data
        }
    """
    try:
        node = get_node_from_request()
        if not node:
            return jsonify({
                'success': False,
                'error': 'Invalid or missing API key'
            }), 401
        
        data = request.get_json() or {}
        broadcast_type = data.get('type', 'announcement')
        message = data.get('message', '')
        payload = data.get('data', {})
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'message is required'
            }), 400
        
        # Create broadcast record
        broadcast = {
            'id': f"broadcast_{secrets.token_hex(8)}",
            'type': broadcast_type,
            'message': message,
            'data': payload,
            'from_node': node['node_id'],
            'from_name': node['node_name'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Store in knowledge pool for other nodes to receive
        _mesh_knowledge_pool[f"broadcast_{broadcast['id']}"] = {
            'type': 'broadcast',
            'data': broadcast,
            'contributed_by': node['node_id'],
            'timestamp': broadcast['timestamp']
        }
        
        # TODO: If nodes have endpoint_url, could push to them directly
        nodes_with_endpoints = [
            n for n in _registered_nodes.values()
            if n.get('endpoint_url') and n['node_id'] != node['node_id']
        ]
        
        return jsonify({
            'success': True,
            'broadcast_id': broadcast['id'],
            'reached_nodes': len(_registered_nodes) - 1,
            'push_capable_nodes': len(nodes_with_endpoints),
            'message': f"Broadcast sent to {len(_registered_nodes) - 1} nodes"
        })
        
    except Exception as e:
        print(f"[Federation] Error broadcasting: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _calculate_contribution_rank(node_id: str) -> int:
    """Calculate a node's contribution rank (1 = top contributor)."""
    contributions = [
        (nid, n.get('knowledge_contributed', 0))
        for nid, n in _registered_nodes.items()
    ]
    contributions.sort(key=lambda x: x[1], reverse=True)
    
    for rank, (nid, _) in enumerate(contributions, 1):
        if nid == node_id:
            return rank
    return len(contributions)


def _count_active_nodes_24h() -> int:
    """Count nodes active in the last 24 hours."""
    return sum(1 for n in _registered_nodes.values() if _is_within_hours(n.get('last_seen', ''), 24))


def _is_within_hours(timestamp_str: str, hours: int) -> bool:
    """Check if timestamp is within the specified hours."""
    if not timestamp_str:
        return False
    try:
        ts = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        delta = now - ts
        return delta.total_seconds() < hours * 3600
    except:
        return False


def _persist_vocabulary_to_db(vocabulary: List[Dict]) -> int:
    """Persist vocabulary entries to the database."""
    try:
        import psycopg2
        from urllib.parse import urlparse

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            return 0

        parsed = urlparse(db_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
        )

        imported = 0
        try:
            with conn.cursor() as cur:
                for vocab in vocabulary:
                    word = vocab.get("word", "")
                    if not word or len(word) < 2:
                        continue

                    phi = vocab.get("phi", 0.5)
                    frequency = vocab.get("frequency", 1)

                    # Upsert - only update if new phi is higher
                    cur.execute("""
                        INSERT INTO tokenizer_vocabulary (token, phi_score, frequency, updated_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (token) DO UPDATE
                        SET phi_score = GREATEST(tokenizer_vocabulary.phi_score, EXCLUDED.phi_score),
                            frequency = tokenizer_vocabulary.frequency + EXCLUDED.frequency,
                            updated_at = NOW()
                        WHERE tokenizer_vocabulary.phi_score < EXCLUDED.phi_score
                    """, (word, phi, frequency))
                    imported += 1

                conn.commit()
            return imported
        except Exception as e:
            print(f"[Federation] Error persisting vocabulary: {e}")
            conn.rollback()
            return 0
        finally:
            conn.close()

    except Exception as e:
        print(f"[Federation] Database connection failed: {e}")
        return 0


# ============================================================================
# PEER MANAGEMENT ENDPOINTS
# ============================================================================

@federation_bp.route('/peers', methods=['GET'])
def list_federation_peers():
    """
    List all configured federation peers.

    Response:
        {
            "success": true,
            "peers": [
                {
                    "peer_id": "...",
                    "peer_name": "...",
                    "peer_url": "...",
                    "sync_enabled": true,
                    "last_sync_at": "...",
                    "last_sync_status": "success",
                    "sync_count": 42,
                    "vocabulary_sent": 1000,
                    "vocabulary_received": 500
                }
            ]
        }
    """
    try:
        conn = _get_db_connection_for_peers()
        if not conn:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 503

        with conn.cursor() as cur:
            cur.execute("""
                SELECT peer_id, peer_name, peer_url, sync_enabled,
                       sync_interval_hours, sync_vocabulary, sync_knowledge, sync_research,
                       last_sync_at, last_sync_status, last_sync_error,
                       sync_count, vocabulary_sent, vocabulary_received,
                       created_at, updated_at
                FROM federation_peers
                ORDER BY peer_name
            """)
            rows = cur.fetchall()

        peers = [
            {
                'peer_id': row[0],
                'peer_name': row[1],
                'peer_url': row[2],
                'sync_enabled': row[3],
                'sync_interval_hours': row[4],
                'sync_vocabulary': row[5],
                'sync_knowledge': row[6],
                'sync_research': row[7],
                'last_sync_at': row[8].isoformat() if row[8] else None,
                'last_sync_status': row[9],
                'last_sync_error': row[10],
                'sync_count': row[11],
                'vocabulary_sent': row[12],
                'vocabulary_received': row[13],
                'created_at': row[14].isoformat() if row[14] else None,
                'updated_at': row[15].isoformat() if row[15] else None,
            }
            for row in rows
        ]

        conn.close()
        return jsonify({'success': True, 'peers': peers, 'total': len(peers)})

    except Exception as e:
        print(f"[Federation] Error listing peers: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/peers', methods=['POST'])
def add_federation_peer():
    """
    Add a new federation peer.

    Request:
        {
            "peer_name": "Railway Production",
            "peer_url": "https://pantheon-railway.example.com",
            "api_key": "qig_xxx...",
            "sync_vocabulary": true,
            "sync_knowledge": true,
            "sync_research": false
        }
    """
    try:
        data = request.get_json() or {}

        peer_name = data.get('peer_name')
        peer_url = data.get('peer_url')
        api_key = data.get('api_key')

        if not peer_name or not peer_url:
            return jsonify({
                'success': False,
                'error': 'peer_name and peer_url are required'
            }), 400

        peer_id = f"peer_{secrets.token_hex(8)}"

        conn = _get_db_connection_for_peers()
        if not conn:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 503

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO federation_peers (
                        peer_id, peer_name, peer_url, api_key,
                        sync_vocabulary, sync_knowledge, sync_research
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    peer_id,
                    peer_name,
                    peer_url.rstrip('/'),
                    api_key,
                    data.get('sync_vocabulary', True),
                    data.get('sync_knowledge', True),
                    data.get('sync_research', False),
                ))
                conn.commit()

            return jsonify({
                'success': True,
                'peer_id': peer_id,
                'message': 'Peer added successfully'
            })

        finally:
            conn.close()

    except Exception as e:
        print(f"[Federation] Error adding peer: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/peers/<peer_id>', methods=['PUT'])
def update_federation_peer(peer_id: str):
    """Update a federation peer's configuration."""
    try:
        data = request.get_json() or {}

        conn = _get_db_connection_for_peers()
        if not conn:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 503

        try:
            updates = []
            params = []

            if 'peer_name' in data:
                updates.append("peer_name = %s")
                params.append(data['peer_name'])
            if 'peer_url' in data:
                updates.append("peer_url = %s")
                params.append(data['peer_url'].rstrip('/'))
            if 'api_key' in data:
                updates.append("api_key = %s")
                params.append(data['api_key'])
            if 'sync_enabled' in data:
                updates.append("sync_enabled = %s")
                params.append(data['sync_enabled'])
            if 'sync_interval_hours' in data:
                updates.append("sync_interval_hours = %s")
                params.append(data['sync_interval_hours'])
            if 'sync_vocabulary' in data:
                updates.append("sync_vocabulary = %s")
                params.append(data['sync_vocabulary'])
            if 'sync_knowledge' in data:
                updates.append("sync_knowledge = %s")
                params.append(data['sync_knowledge'])
            if 'sync_research' in data:
                updates.append("sync_research = %s")
                params.append(data['sync_research'])

            if not updates:
                return jsonify({'success': False, 'error': 'No updates provided'}), 400

            updates.append("updated_at = NOW()")
            params.append(peer_id)

            with conn.cursor() as cur:
                cur.execute(f"""
                    UPDATE federation_peers
                    SET {', '.join(updates)}
                    WHERE peer_id = %s
                """, params)

                if cur.rowcount == 0:
                    return jsonify({'success': False, 'error': 'Peer not found'}), 404

                conn.commit()

            return jsonify({'success': True, 'message': 'Peer updated successfully'})

        finally:
            conn.close()

    except Exception as e:
        print(f"[Federation] Error updating peer: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/peers/<peer_id>', methods=['DELETE'])
def delete_federation_peer(peer_id: str):
    """Delete a federation peer."""
    try:
        conn = _get_db_connection_for_peers()
        if not conn:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 503

        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM federation_peers WHERE peer_id = %s", (peer_id,))

                if cur.rowcount == 0:
                    return jsonify({'success': False, 'error': 'Peer not found'}), 404

                conn.commit()

            return jsonify({'success': True, 'message': 'Peer deleted successfully'})

        finally:
            conn.close()

    except Exception as e:
        print(f"[Federation] Error deleting peer: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/peers/<peer_id>/test', methods=['POST'])
def test_federation_peer(peer_id: str):
    """Test connectivity to a federation peer."""
    try:
        import requests as http_requests
        import time

        conn = _get_db_connection_for_peers()
        if not conn:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 503

        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT peer_url, api_key FROM federation_peers WHERE peer_id = %s",
                    (peer_id,)
                )
                row = cur.fetchone()

            if not row:
                return jsonify({'success': False, 'error': 'Peer not found'}), 404

            peer_url, api_key = row

            start_time = time.time()
            try:
                response = http_requests.get(
                    f"{peer_url}/federation/mesh/status",
                    headers={'Authorization': f'Bearer {api_key}'} if api_key else {},
                    timeout=10
                )
                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    mesh_data = response.json()
                    return jsonify({
                        'success': True,
                        'reachable': True,
                        'response_time_ms': response_time_ms,
                        'peer_mesh_stats': mesh_data.get('mesh', {})
                    })
                else:
                    return jsonify({
                        'success': True,
                        'reachable': False,
                        'response_time_ms': response_time_ms,
                        'error': f'HTTP {response.status_code}'
                    })

            except http_requests.exceptions.Timeout:
                return jsonify({'success': True, 'reachable': False, 'error': 'Connection timeout'})
            except http_requests.exceptions.ConnectionError:
                return jsonify({'success': True, 'reachable': False, 'error': 'Connection failed'})

        finally:
            conn.close()

    except Exception as e:
        print(f"[Federation] Error testing peer: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@federation_bp.route('/peers/<peer_id>/sync', methods=['POST'])
def trigger_peer_sync(peer_id: str):
    """Manually trigger a sync with a specific peer."""
    try:
        from training.startup_catchup import get_catchup_manager

        manager = get_catchup_manager()

        conn = _get_db_connection_for_peers()
        if not conn:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 503

        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT peer_url, api_key FROM federation_peers WHERE peer_id = %s",
                    (peer_id,)
                )
                row = cur.fetchone()

            if not row:
                return jsonify({'success': False, 'error': 'Peer not found'}), 404

            peer_url, api_key = row

            if not api_key:
                return jsonify({'success': False, 'error': 'No API key configured for this peer'}), 400

            vocabulary = manager._gather_vocabulary_for_sync()
            result = manager._sync_with_peer(peer_url, api_key, vocabulary)
            manager._update_peer_sync_status(peer_id, result)

            return jsonify({
                'success': result.get('success', False),
                'result': result
            })

        finally:
            conn.close()

    except Exception as e:
        print(f"[Federation] Error triggering sync: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


def _get_db_connection_for_peers():
    """Get PostgreSQL connection for peer management."""
    try:
        import psycopg2
        from urllib.parse import urlparse

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            return None

        parsed = urlparse(db_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
        )
    except Exception as e:
        print(f"[Federation] DB connection failed: {e}")
        return None


def register_federation_routes(app):
    """Register federation routes with the Flask app."""
    app.register_blueprint(federation_bp, url_prefix='/federation')
    print("[INFO] Federation API registered at /federation/*")


# ============================================================================
# FEDERATION SERVICE ENDPOINTS - Actual cross-instance sync
# ============================================================================

@federation_bp.route('/service/status', methods=['GET'])
def federation_service_status():
    """
    Get federation service status including all peers and sync state.

    Response:
        {
            "success": true,
            "service_available": true,
            "status": {
                "total_peers": 2,
                "enabled_peers": 2,
                "reachable_peers": 1,
                "is_syncing": false,
                "last_full_sync": "2025-01-07T12:00:00Z",
                "peers": [...]
            }
        }
    """
    if not HAS_FEDERATION_SERVICE:
        return jsonify({
            'success': True,
            'service_available': False,
            'error': 'FederationService not available'
        })

    try:
        service = get_federation_service()
        status = service.get_sync_status()

        return jsonify({
            'success': True,
            'service_available': True,
            'status': status
        })
    except Exception as e:
        print(f"[Federation] Error getting service status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/service/sync', methods=['POST'])
def trigger_federation_sync():
    """
    Trigger federation sync with all enabled peers.

    Request:
        {
            "background": true,  // Run in background (default: true)
            "peer_id": "peer_xxx"  // Optional: sync with specific peer only
        }

    Response:
        {
            "success": true,
            "status": "started",
            "background": true,
            "peer_count": 2
        }
    """
    if not HAS_FEDERATION_SERVICE:
        return jsonify({
            'success': False,
            'error': 'FederationService not available'
        }), 503

    try:
        data = request.get_json() or {}
        background = data.get('background', True)
        peer_id = data.get('peer_id')

        service = get_federation_service()

        if peer_id:
            # Sync with specific peer
            peers = service.get_peers()
            peer = next((p for p in peers if p.peer_id == peer_id), None)

            if not peer:
                return jsonify({
                    'success': False,
                    'error': f'Peer {peer_id} not found'
                }), 404

            results = service.sync_with_peer(peer)
            return jsonify({
                'success': True,
                'peer_id': peer_id,
                'results': {k: service._result_to_dict(v) for k, v in results.items()}
            })
        else:
            # Sync with all peers
            result = service.sync_all_peers(background=background)
            return jsonify({
                'success': True,
                **result
            })

    except Exception as e:
        print(f"[Federation] Error triggering sync: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/service/peers', methods=['GET'])
def list_service_peers():
    """
    List all federation peers from the database.

    Response:
        {
            "success": true,
            "peers": [...],
            "total": 2
        }
    """
    if not HAS_FEDERATION_SERVICE:
        return jsonify({
            'success': False,
            'error': 'FederationService not available'
        }), 503

    try:
        service = get_federation_service()
        peers = service.get_peers(force_refresh=True)

        return jsonify({
            'success': True,
            'peers': [
                {
                    'peer_id': p.peer_id,
                    'peer_name': p.peer_name,
                    'peer_url': p.peer_url,
                    'sync_enabled': p.sync_enabled,
                    'sync_vocabulary': p.sync_vocabulary,
                    'sync_basins': p.sync_basins,
                    'sync_kernels': p.sync_kernels,
                    'is_reachable': p.is_reachable,
                    'last_sync_at': p.last_sync_at.isoformat() if p.last_sync_at else None,
                    'consecutive_failures': p.consecutive_failures
                }
                for p in peers
            ],
            'total': len(peers)
        })
    except Exception as e:
        print(f"[Federation] Error listing peers: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/service/peers/<peer_id>/test', methods=['POST'])
def test_service_peer(peer_id: str):
    """
    Test connection to a specific peer.

    Response:
        {
            "success": true,
            "reachable": true,
            "response_time_ms": 150,
            "error": null
        }
    """
    if not HAS_FEDERATION_SERVICE:
        return jsonify({
            'success': False,
            'error': 'FederationService not available'
        }), 503

    try:
        service = get_federation_service()
        peers = service.get_peers()
        peer = next((p for p in peers if p.peer_id == peer_id), None)

        if not peer:
            return jsonify({
                'success': False,
                'error': f'Peer {peer_id} not found'
            }), 404

        reachable, response_time, error = service.test_peer_connection(peer)
        service.update_peer_health(peer_id, reachable, response_time)

        return jsonify({
            'success': True,
            'reachable': reachable,
            'response_time_ms': response_time,
            'error': error
        })
    except Exception as e:
        print(f"[Federation] Error testing peer: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/service/vocabulary/delta', methods=['GET'])
def get_vocabulary_delta():
    """
    Get vocabulary delta for manual inspection or custom sync.

    Query params:
        since: ISO timestamp to get vocabulary updated after
        limit: Max entries (default 100)

    Response:
        {
            "success": true,
            "vocabulary": [...],
            "count": 100
        }
    """
    if not HAS_FEDERATION_SERVICE:
        return jsonify({
            'success': False,
            'error': 'FederationService not available'
        }), 503

    try:
        service = get_federation_service()

        since_str = request.args.get('since')
        since = None
        if since_str:
            since = datetime.fromisoformat(since_str.replace('Z', '+00:00'))

        limit = min(int(request.args.get('limit', 100)), 1000)

        vocabulary = service.gather_vocabulary_delta(since=since, limit=limit)

        return jsonify({
            'success': True,
            'vocabulary': vocabulary,
            'count': len(vocabulary)
        })
    except Exception as e:
        print(f"[Federation] Error getting vocabulary delta: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@federation_bp.route('/service/basins/delta', methods=['GET'])
def get_basins_delta():
    """
    Get basin coordinates for manual inspection or custom sync.

    Query params:
        limit: Max entries (default 50)

    Response:
        {
            "success": true,
            "basins": [...],
            "count": 50
        }
    """
    if not HAS_FEDERATION_SERVICE:
        return jsonify({
            'success': False,
            'error': 'FederationService not available'
        }), 503

    try:
        service = get_federation_service()
        limit = min(int(request.args.get('limit', 50)), 200)

        basins = service.gather_basins_for_sync(limit=limit)

        return jsonify({
            'success': True,
            'basins': basins,
            'count': len(basins)
        })
    except Exception as e:
        print(f"[Federation] Error getting basins delta: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
