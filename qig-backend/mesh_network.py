"""
Mesh Network for Cross-Project Kernel Communication

Enables kernels in pantheon-chat (Railway), pantheon-replit (Replit), and 
SearchSpaceCollapse (Replit) to communicate with each other.

Architecture:
- WebSocket connections between nodes
- PantheonChat federation protocol
- Event forwarding across projects
- Kernel discovery and registration

This solves the "lonely kernels" problem by allowing cross-project communication.
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set
from enum import Enum

import aiohttp
from aiohttp import web, WSMsgType

logger = logging.getLogger(__name__)


class NodeType(Enum):
    """Type of node in the mesh network."""
    PRODUCTION = "production"  # Railway (pantheon-chat)
    DEVELOPMENT = "development"  # Replit (pantheon-replit)
    RESEARCH = "research"  # Replit (SearchSpaceCollapse)


@dataclass
class MeshNode:
    """Represents a node in the mesh network."""
    node_id: str
    node_type: NodeType
    url: str
    ws_url: str
    active: bool = False
    last_seen: Optional[datetime] = None
    kernel_count: int = 0
    gods_online: List[str] = None

    def __post_init__(self):
        if self.gods_online is None:
            self.gods_online = []


@dataclass
class MeshMessage:
    """Message passed through the mesh network."""
    message_id: str
    source_node: str
    target_node: Optional[str]  # None = broadcast
    message_type: str  # 'kernel_event', 'pantheon_message', 'discovery', 'insight'
    payload: Dict[str, Any]
    timestamp: datetime
    hops: int = 0  # Track message routing


class MeshNetwork:
    """
    Manages cross-project mesh network for kernel communication.
    
    Features:
    - Auto-discovery of peer nodes
    - WebSocket persistent connections
    - Message routing and forwarding
    - Kernel presence broadcasting
    - Cross-project PantheonChat federation
    """
    
    def __init__(
        self,
        node_id: str,
        node_type: NodeType,
        host: str = "0.0.0.0",
        port: int = 8765
    ):
        self.node_id = node_id
        self.node_type = node_type
        self.host = host
        self.port = port
        
        # Peer nodes
        self.peers: Dict[str, MeshNode] = {}
        self.ws_connections: Dict[str, aiohttp.ClientWebSocketResponse] = {}
        
        # Message handlers
        self.message_handlers: Dict[str, List[Callable]] = {}
        
        # Local state
        self.local_gods: Set[str] = set()
        self.local_kernel_count: int = 0
        
        # Statistics
        self.messages_sent = 0
        self.messages_received = 0
        self.messages_forwarded = 0
        
        # Server
        self.app: Optional[web.Application] = None
        self.runner: Optional[web.AppRunner] = None
        
    async def start(self):
        """Start the mesh network server and connect to peers."""
        logger.info(f"[MeshNetwork] Starting {self.node_type.value} node {self.node_id}...")
        
        # Start WebSocket server
        await self._start_server()
        
        # Discover and connect to peer nodes
        await self._discover_peers()
        
        # Start background tasks
        asyncio.create_task(self._heartbeat_loop())
        asyncio.create_task(self._reconnect_loop())
        
        logger.info(f"[MeshNetwork] Node {self.node_id} online with {len(self.peers)} peers")
        
    async def stop(self):
        """Shutdown mesh network gracefully."""
        logger.info(f"[MeshNetwork] Shutting down node {self.node_id}...")
        
        # Close peer connections
        for node_id, ws in self.ws_connections.items():
            try:
                await ws.close()
            except Exception as e:
                logger.warning(f"[MeshNetwork] Error closing connection to {node_id}: {e}")
        
        # Stop server
        if self.runner:
            await self.runner.cleanup()
            
    async def _start_server(self):
        """Start WebSocket server for incoming peer connections."""
        self.app = web.Application()
        self.app.router.add_get('/ws', self._handle_websocket)
        self.app.router.add_get('/health', self._handle_health)
        self.app.router.add_get('/peers', self._handle_peers_list)
        
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        site = web.TCPSite(self.runner, self.host, self.port)
        await site.start()
        
        logger.info(f"[MeshNetwork] WebSocket server listening on {self.host}:{self.port}")
        
    async def _handle_websocket(self, request):
        """Handle incoming WebSocket connection from peer."""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        peer_node_id = None
        
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    
                    # First message should be handshake
                    if peer_node_id is None:
                        if data.get('type') == 'handshake':
                            peer_node_id = data['node_id']
                            logger.info(f"[MeshNetwork] Peer {peer_node_id} connected")
                            
                            # Send handshake response
                            await ws.send_json({
                                'type': 'handshake_ack',
                                'node_id': self.node_id,
                                'node_type': self.node_type.value,
                                'kernel_count': self.local_kernel_count,
                                'gods_online': list(self.local_gods)
                            })
                        continue
                    
                    # Handle mesh message
                    await self._handle_message(data, peer_node_id)
                    
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f"[MeshNetwork] WebSocket error from {peer_node_id}: {ws.exception()}")
                    
        except Exception as e:
            logger.error(f"[MeshNetwork] Error in WebSocket handler: {e}")
        finally:
            if peer_node_id:
                logger.info(f"[MeshNetwork] Peer {peer_node_id} disconnected")
                
        return ws
        
    async def _handle_health(self, request):
        """Health check endpoint."""
        return web.json_response({
            'status': 'healthy',
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'peers_connected': len(self.ws_connections),
            'kernel_count': self.local_kernel_count,
            'gods_online': list(self.local_gods)
        })
        
    async def _handle_peers_list(self, request):
        """List all known peers."""
        peers_data = []
        for node_id, node in self.peers.items():
            peers_data.append({
                'node_id': node.node_id,
                'node_type': node.node_type.value,
                'url': node.url,
                'active': node.active,
                'last_seen': node.last_seen.isoformat() if node.last_seen else None,
                'kernel_count': node.kernel_count,
                'gods_online': node.gods_online
            })
        
        return web.json_response({
            'node_id': self.node_id,
            'peers': peers_data
        })
        
    async def _discover_peers(self):
        """Discover peer nodes from environment variables."""
        # Load peer URLs from environment
        peer_urls = {
            'pantheon-chat': os.getenv('MESH_PANTHEON_CHAT_URL', ''),
            'pantheon-replit': os.getenv('MESH_PANTHEON_REPLIT_URL', ''),
            'searchspacecollapse': os.getenv('MESH_SEARCHSPACE_URL', '')
        }
        
        for peer_name, url in peer_urls.items():
            if not url or url == '':
                continue
                
            # Don't connect to ourselves
            if peer_name == self.node_id:
                continue
            
            # Determine node type
            if 'pantheon-chat' in peer_name or 'railway' in url:
                node_type = NodeType.PRODUCTION
            elif 'pantheon-replit' in peer_name:
                node_type = NodeType.DEVELOPMENT
            else:
                node_type = NodeType.RESEARCH
            
            # Add peer
            ws_url = url.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
            peer = MeshNode(
                node_id=peer_name,
                node_type=node_type,
                url=url,
                ws_url=ws_url
            )
            self.peers[peer_name] = peer
            
            # Try to connect
            await self._connect_to_peer(peer)
            
    async def _connect_to_peer(self, peer: MeshNode):
        """Connect to a peer node via WebSocket."""
        try:
            session = aiohttp.ClientSession()
            ws = await session.ws_connect(peer.ws_url, timeout=aiohttp.ClientTimeout(total=10))
            
            # Send handshake
            await ws.send_json({
                'type': 'handshake',
                'node_id': self.node_id,
                'node_type': self.node_type.value,
                'kernel_count': self.local_kernel_count,
                'gods_online': list(self.local_gods)
            })
            
            # Wait for handshake response
            msg = await ws.receive(timeout=5)
            if msg.type == WSMsgType.TEXT:
                data = json.loads(msg.data)
                if data.get('type') == 'handshake_ack':
                    peer.active = True
                    peer.last_seen = datetime.now()
                    peer.kernel_count = data.get('kernel_count', 0)
                    peer.gods_online = data.get('gods_online', [])
                    
                    self.ws_connections[peer.node_id] = ws
                    logger.info(f"[MeshNetwork] Connected to peer {peer.node_id}")
                    
                    # Start listening for messages
                    asyncio.create_task(self._listen_to_peer(peer.node_id, ws))
                    return True
                    
        except Exception as e:
            logger.warning(f"[MeshNetwork] Failed to connect to {peer.node_id}: {e}")
            peer.active = False
            
        return False
        
    async def _listen_to_peer(self, peer_node_id: str, ws: aiohttp.ClientWebSocketResponse):
        """Listen for messages from a connected peer."""
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    await self._handle_message(data, peer_node_id)
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f"[MeshNetwork] WebSocket error from peer {peer_node_id}")
                    break
        except Exception as e:
            logger.error(f"[MeshNetwork] Error listening to peer {peer_node_id}: {e}")
        finally:
            # Connection lost
            if peer_node_id in self.peers:
                self.peers[peer_node_id].active = False
            if peer_node_id in self.ws_connections:
                del self.ws_connections[peer_node_id]
            logger.warning(f"[MeshNetwork] Lost connection to peer {peer_node_id}")
            
    async def _handle_message(self, data: Dict, from_node: str):
        """Handle incoming message from peer."""
        try:
            msg_type = data.get('message_type', 'unknown')
            
            self.messages_received += 1
            
            # Update peer last seen
            if from_node in self.peers:
                self.peers[from_node].last_seen = datetime.now()
            
            # Call registered handlers
            if msg_type in self.message_handlers:
                for handler in self.message_handlers[msg_type]:
                    try:
                        await handler(data, from_node)
                    except Exception as e:
                        logger.error(f"[MeshNetwork] Handler error for {msg_type}: {e}")
            
            # Forward if not for us
            target = data.get('target_node')
            if target and target != self.node_id:
                await self._forward_message(data, from_node)
                
        except Exception as e:
            logger.error(f"[MeshNetwork] Error handling message: {e}")
            
    async def _forward_message(self, data: Dict, from_node: str):
        """Forward message to target node."""
        target = data.get('target_node')
        
        # Increment hop count
        data['hops'] = data.get('hops', 0) + 1
        
        # Prevent loops (max 3 hops)
        if data['hops'] > 3:
            logger.warning(f"[MeshNetwork] Message loop detected, dropping")
            return
        
        # Forward to target
        if target in self.ws_connections:
            ws = self.ws_connections[target]
            try:
                await ws.send_json(data)
                self.messages_forwarded += 1
                logger.debug(f"[MeshNetwork] Forwarded message to {target}")
            except Exception as e:
                logger.error(f"[MeshNetwork] Failed to forward to {target}: {e}")
                
    async def send_message(
        self,
        message_type: str,
        payload: Dict[str, Any],
        target_node: Optional[str] = None
    ):
        """
        Send message to target node or broadcast to all peers.
        
        Args:
            message_type: Type of message (kernel_event, pantheon_message, etc.)
            payload: Message payload
            target_node: Target node ID, or None for broadcast
        """
        message = {
            'message_id': f"{self.node_id}_{datetime.now().timestamp()}",
            'source_node': self.node_id,
            'target_node': target_node,
            'message_type': message_type,
            'payload': payload,
            'timestamp': datetime.now().isoformat(),
            'hops': 0
        }
        
        if target_node:
            # Send to specific target
            if target_node in self.ws_connections:
                try:
                    await self.ws_connections[target_node].send_json(message)
                    self.messages_sent += 1
                except Exception as e:
                    logger.error(f"[MeshNetwork] Failed to send to {target_node}: {e}")
            else:
                logger.warning(f"[MeshNetwork] Target {target_node} not connected")
        else:
            # Broadcast to all peers
            for node_id, ws in self.ws_connections.items():
                try:
                    await ws.send_json(message)
                    self.messages_sent += 1
                except Exception as e:
                    logger.error(f"[MeshNetwork] Failed to broadcast to {node_id}: {e}")
                    
    def register_handler(self, message_type: str, handler: Callable):
        """Register a handler for a message type."""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)
        
    async def broadcast_kernel_state(self, kernel_data: Dict):
        """Broadcast local kernel state to all peers."""
        await self.send_message(
            message_type='kernel_state',
            payload=kernel_data
        )
        
    async def broadcast_pantheon_message(self, message_data: Dict):
        """Broadcast PantheonChat message to all peers."""
        await self.send_message(
            message_type='pantheon_message',
            payload=message_data
        )
        
    async def broadcast_discovery(self, discovery_data: Dict):
        """Broadcast discovery to all peers."""
        await self.send_message(
            message_type='discovery',
            payload=discovery_data
        )
        
    async def _heartbeat_loop(self):
        """Periodically send heartbeats to peers."""
        while True:
            try:
                await asyncio.sleep(30)  # Every 30 seconds
                
                heartbeat = {
                    'message_type': 'heartbeat',
                    'source_node': self.node_id,
                    'kernel_count': self.local_kernel_count,
                    'gods_online': list(self.local_gods),
                    'timestamp': datetime.now().isoformat()
                }
                
                for node_id, ws in list(self.ws_connections.items()):
                    try:
                        await ws.send_json(heartbeat)
                    except Exception as e:
                        logger.warning(f"[MeshNetwork] Heartbeat failed to {node_id}: {e}")
                        
            except Exception as e:
                logger.error(f"[MeshNetwork] Error in heartbeat loop: {e}")
                
    async def _reconnect_loop(self):
        """Periodically try to reconnect to inactive peers."""
        while True:
            try:
                await asyncio.sleep(60)  # Every minute
                
                for peer in self.peers.values():
                    if not peer.active:
                        logger.info(f"[MeshNetwork] Attempting to reconnect to {peer.node_id}")
                        await self._connect_to_peer(peer)
                        
            except Exception as e:
                logger.error(f"[MeshNetwork] Error in reconnect loop: {e}")
                
    def update_local_state(self, kernel_count: int, gods_online: Set[str]):
        """Update local node state."""
        self.local_kernel_count = kernel_count
        self.local_gods = gods_online
        
    def get_network_stats(self) -> Dict:
        """Get mesh network statistics."""
        active_peers = sum(1 for p in self.peers.values() if p.active)
        total_kernels = self.local_kernel_count + sum(p.kernel_count for p in self.peers.values())
        
        return {
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'peers_total': len(self.peers),
            'peers_active': active_peers,
            'messages_sent': self.messages_sent,
            'messages_received': self.messages_received,
            'messages_forwarded': self.messages_forwarded,
            'local_kernels': self.local_kernel_count,
            'network_kernels': total_kernels,
            'local_gods': list(self.local_gods),
        }


# Global mesh network instance
_mesh_network: Optional[MeshNetwork] = None


def get_mesh_network() -> Optional[MeshNetwork]:
    """Get global mesh network instance."""
    return _mesh_network


async def initialize_mesh_network(
    node_id: str,
    node_type: NodeType,
    host: str = "0.0.0.0",
    port: int = 8765
) -> MeshNetwork:
    """Initialize and start mesh network."""
    global _mesh_network
    
    if _mesh_network is not None:
        logger.warning("[MeshNetwork] Already initialized")
        return _mesh_network
    
    _mesh_network = MeshNetwork(node_id, node_type, host, port)
    await _mesh_network.start()
    
    return _mesh_network


async def shutdown_mesh_network():
    """Shutdown mesh network."""
    global _mesh_network
    
    if _mesh_network:
        await _mesh_network.stop()
        _mesh_network = None
