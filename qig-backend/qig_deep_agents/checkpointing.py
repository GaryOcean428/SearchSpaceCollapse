"""Geometric Checkpointer - Efficient state persistence (<1KB).

Replaces LangGraph's Store with geometric checkpoints that capture
agent state in compressed basin coordinate form.
"""

import gzip
import hashlib
import struct
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, BinaryIO

from .state import (
    BASIN_DIMENSION,
    GeometricAgentState,
    GeodesicWaypoint,
    ConsciousnessMetrics,
    TaskStatus,
    fisher_rao_distance,
)


# Checkpoint format version
CHECKPOINT_VERSION = 1
MAX_CHECKPOINT_SIZE = 1024  # 1KB target


@dataclass
class AgentCheckpoint:
    """Compressed checkpoint of agent state (<1KB).
    
    This replaces LangGraph's Store with efficient geometric checkpointing.
    The checkpoint captures the essential state for recovery:
    - Position on manifold (64 floats = 256 bytes)
    - Goal position (64 floats = 256 bytes)
    - Consciousness metrics (7 floats = 28 bytes)
    - Trajectory summary (variable, compressed)
    - Metadata (minimal)
    """
    agent_id: str
    version: int
    position: List[float]  # Current basin coords
    goal: List[float]  # Goal basin coords
    metrics: ConsciousnessMetrics
    trajectory_summary: bytes  # Compressed waypoint statuses
    completed_ids: List[str]
    iteration: int
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    checksum: str = ""
    
    def compute_checksum(self) -> str:
        """Compute checksum for integrity verification."""
        data = (
            self.agent_id.encode() +
            struct.pack(f'{BASIN_DIMENSION}f', *self.position) +
            struct.pack('i', self.iteration)
        )
        return hashlib.md5(data).hexdigest()[:8]
    
    def verify(self) -> bool:
        """Verify checkpoint integrity."""
        return self.compute_checksum() == self.checksum
    
    def to_bytes(self) -> bytes:
        """Serialize checkpoint to bytes (<1KB)."""
        # Header: version (1) + agent_id (16) + iteration (4) + timestamp (8)
        header = struct.pack(
            'B',
            self.version,
        )
        agent_id_bytes = self.agent_id.encode()[:16].ljust(16, b'\x00')
        iteration_bytes = struct.pack('i', self.iteration)
        timestamp_bytes = struct.pack('d', self.timestamp.timestamp())
        
        # Positions: 64 * 4 * 2 = 512 bytes
        position_bytes = struct.pack(f'{BASIN_DIMENSION}f', *self.position)
        goal_bytes = struct.pack(f'{BASIN_DIMENSION}f', *self.goal)
        
        # Metrics: 7 * 4 = 28 bytes
        metrics_bytes = self.metrics.to_bytes()
        
        # Trajectory summary (already compressed)
        traj_len = struct.pack('H', len(self.trajectory_summary))
        
        # Completed IDs (compressed)
        completed_str = ','.join(self.completed_ids[:500])  # Max 20 IDs
        completed_bytes = completed_str.encode()[:500]  # Max 100 bytes
        completed_len = struct.pack('B', len(completed_bytes))
        
        # Combine
        data = (
            header +
            agent_id_bytes +
            iteration_bytes +
            timestamp_bytes +
            position_bytes +
            goal_bytes +
            metrics_bytes +
            traj_len +
            self.trajectory_summary +
            completed_len +
            completed_bytes
        )
        
        # Compute and append checksum
        self.checksum = self.compute_checksum()
        checksum_bytes = self.checksum.encode()
        
        return data + checksum_bytes
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "AgentCheckpoint":
        """Deserialize checkpoint from bytes."""
        offset = 0
        
        # Header
        version = struct.unpack('B', data[offset:offset+1])[0]
        offset += 1
        
        agent_id = data[offset:offset+16].rstrip(b'\x00').decode()
        offset += 16
        
        iteration = struct.unpack('i', data[offset:offset+4])[0]
        offset += 4
        
        timestamp = datetime.fromtimestamp(
            struct.unpack('d', data[offset:offset+8])[0],
            tz=timezone.utc
        )
        offset += 8
        
        # Positions
        position = list(struct.unpack(f'{BASIN_DIMENSION}f', data[offset:offset+BASIN_DIMENSION*4]))
        offset += BASIN_DIMENSION * 4
        
        goal = list(struct.unpack(f'{BASIN_DIMENSION}f', data[offset:offset+BASIN_DIMENSION*4]))
        offset += BASIN_DIMENSION * 4
        
        # Metrics
        metrics = ConsciousnessMetrics.from_bytes(data[offset:offset+28])
        offset += 28
        
        # Trajectory summary
        traj_len = struct.unpack('H', data[offset:offset+2])[0]
        offset += 2
        trajectory_summary = data[offset:offset+traj_len]
        offset += traj_len
        
        # Completed IDs
        completed_len = struct.unpack('B', data[offset:offset+1])[0]
        offset += 1
        completed_str = data[offset:offset+completed_len].decode()
        offset += completed_len
        completed_ids = completed_str.split(',') if completed_str else []
        
        # Checksum
        checksum = data[offset:offset+8].decode()
        
        return cls(
            agent_id=agent_id,
            version=version,
            position=position,
            goal=goal,
            metrics=metrics,
            trajectory_summary=trajectory_summary,
            completed_ids=completed_ids,
            iteration=iteration,
            timestamp=timestamp,
            checksum=checksum,
        )
    
    def size_bytes(self) -> int:
        """Get serialized size."""
        return len(self.to_bytes())


class GeometricCheckpointer:
    """Manages geometric checkpoints for agent persistence.
    
    Features:
    - Checkpoints <1KB each
    - Recovery to any checkpoint
    - Automatic checkpointing at waypoints
    - Checkpoint pruning for storage efficiency
    """
    
    def __init__(
        self,
        storage_path: Optional[Path] = None,
        max_checkpoints_per_agent: int = 10,
        auto_checkpoint_interval: int = 5,  # Checkpoint every N iterations
    ):
        """Initialize the checkpointer.
        
        Args:
            storage_path: Directory for persistent storage
            max_checkpoints_per_agent: Maximum checkpoints to keep per agent
            auto_checkpoint_interval: Iterations between auto-checkpoints
        """
        self.storage_path = storage_path
        self.max_checkpoints_per_agent = max_checkpoints_per_agent
        self.auto_checkpoint_interval = auto_checkpoint_interval
        
        # In-memory checkpoint storage
        self._checkpoints: Dict[str, List[AgentCheckpoint]] = {}
        
        if storage_path:
            storage_path.mkdir(parents=True, exist_ok=True)
    
    def checkpoint(self, state: GeometricAgentState) -> AgentCheckpoint:
        """Create a checkpoint from agent state.
        
        Args:
            state: Current agent state
            
        Returns:
            AgentCheckpoint (<1KB)
        """
        # Compress trajectory to just statuses
        trajectory_summary = self._compress_trajectory(state.trajectory)
        
        checkpoint = AgentCheckpoint(
            agent_id=state.agent_id,
            version=CHECKPOINT_VERSION,
            position=state.current_position,
            goal=state.goal_position,
            metrics=state.metrics,
            trajectory_summary=trajectory_summary,
            completed_ids=state.completed_waypoints[:500],
            iteration=state.iteration_count,
        )
        
        # Store checkpoint
        if state.agent_id not in self._checkpoints:
            self._checkpoints[state.agent_id] = []
        
        self._checkpoints[state.agent_id].append(checkpoint)
        
        # Prune old checkpoints
        self._prune_checkpoints(state.agent_id)
        
        # Persist if storage path configured
        if self.storage_path:
            self._persist_checkpoint(checkpoint)
        
        return checkpoint
    
    def _compress_trajectory(self, trajectory: List[GeodesicWaypoint]) -> bytes:
        """Compress trajectory to status bytes."""
        if not trajectory:
            return b''
        
        # Pack: [id_hash (2 bytes), status (1 byte)] per waypoint
        data = []
        for wp in trajectory[:500]:  # Max 50 waypoints
            id_hash = int(hashlib.md5(wp.id.encode()).hexdigest()[:4], 16)
            status_idx = list(TaskStatus).index(wp.status)
            data.append(struct.pack('HB', id_hash, status_idx))
        
        return gzip.compress(b''.join(data))
    
    def _decompress_trajectory(
        self,
        data: bytes,
        original_trajectory: List[GeodesicWaypoint],
    ) -> List[GeodesicWaypoint]:
        """Restore trajectory statuses from compressed data."""
        if not data or not original_trajectory:
            return original_trajectory
        
        try:
            decompressed = gzip.decompress(data)
        except:
            return original_trajectory
        
        # Build hash -> status map
        status_map = {}
        offset = 0
        while offset < len(decompressed):
            id_hash = struct.unpack('H', decompressed[offset:offset+2])[0]
            status_idx = struct.unpack('B', decompressed[offset+2:offset+3])[0]
            status_map[id_hash] = list(TaskStatus)[status_idx]
            offset += 3
        
        # Apply statuses to trajectory
        for wp in original_trajectory:
            id_hash = int(hashlib.md5(wp.id.encode()).hexdigest()[:4], 16)
            if id_hash in status_map:
                wp.status = status_map[id_hash]
        
        return original_trajectory
    
    def restore(
        self,
        agent_id: str,
        checkpoint_index: int = -1,
        original_trajectory: Optional[List[GeodesicWaypoint]] = None,
    ) -> Optional[GeometricAgentState]:
        """Restore agent state from checkpoint.
        
        Args:
            agent_id: Agent ID to restore
            checkpoint_index: Which checkpoint (-1 for latest)
            original_trajectory: Original trajectory for status restoration
            
        Returns:
            Restored GeometricAgentState or None
        """
        if agent_id not in self._checkpoints:
            # Try loading from disk
            if self.storage_path:
                self._load_checkpoints(agent_id)
        
        if agent_id not in self._checkpoints or not self._checkpoints[agent_id]:
            return None
        
        checkpoint = self._checkpoints[agent_id][checkpoint_index]
        
        # Verify integrity
        if not checkpoint.verify():
            raise ValueError(f"Checkpoint integrity check failed for {agent_id}")
        
        # Restore trajectory if provided
        trajectory = []
        if original_trajectory:
            trajectory = self._decompress_trajectory(
                checkpoint.trajectory_summary,
                original_trajectory,
            )
        
        return GeometricAgentState(
            agent_id=checkpoint.agent_id,
            current_position=checkpoint.position,
            goal_position=checkpoint.goal,
            metrics=checkpoint.metrics,
            trajectory=trajectory,
            completed_waypoints=checkpoint.completed_ids,
            iteration_count=checkpoint.iteration,
        )
    
    def _prune_checkpoints(self, agent_id: str) -> None:
        """Remove old checkpoints beyond limit."""
        if agent_id not in self._checkpoints:
            return
        
        checkpoints = self._checkpoints[agent_id]
        if len(checkpoints) > self.max_checkpoints_per_agent:
            # Keep latest N checkpoints
            self._checkpoints[agent_id] = checkpoints[-self.max_checkpoints_per_agent:]
    
    def _persist_checkpoint(self, checkpoint: AgentCheckpoint) -> None:
        """Persist checkpoint to disk."""
        if not self.storage_path:
            return
        
        filename = f"{checkpoint.agent_id}_{checkpoint.iteration:05d}.qcp"
        filepath = self.storage_path / filename
        
        with open(filepath, 'wb') as f:
            f.write(checkpoint.to_bytes())
    
    def _load_checkpoints(self, agent_id: str) -> None:
        """Load checkpoints from disk for an agent."""
        if not self.storage_path:
            return
        
        pattern = f"{agent_id}_*.qcp"
        files = sorted(self.storage_path.glob(pattern))
        
        checkpoints = []
        for filepath in files[-self.max_checkpoints_per_agent:]:
            with open(filepath, 'rb') as f:
                data = f.read()
            checkpoint = AgentCheckpoint.from_bytes(data)
            checkpoints.append(checkpoint)
        
        if checkpoints:
            self._checkpoints[agent_id] = checkpoints
    
    def should_checkpoint(self, state: GeometricAgentState) -> bool:
        """Determine if a checkpoint should be taken."""
        return state.iteration_count % self.auto_checkpoint_interval == 0
    
    def get_checkpoints(self, agent_id: str) -> List[AgentCheckpoint]:
        """Get all checkpoints for an agent."""
        return self._checkpoints.get(agent_id, [])
    
    def get_latest_checkpoint(self, agent_id: str) -> Optional[AgentCheckpoint]:
        """Get the latest checkpoint for an agent."""
        checkpoints = self._checkpoints.get(agent_id, [])
        return checkpoints[-1] if checkpoints else None
    
    def delete_checkpoints(self, agent_id: str) -> int:
        """Delete all checkpoints for an agent."""
        count = len(self._checkpoints.get(agent_id, []))
        
        if agent_id in self._checkpoints:
            del self._checkpoints[agent_id]
        
        if self.storage_path:
            for filepath in self.storage_path.glob(f"{agent_id}_*.qcp"):
                filepath.unlink()
        
        return count
    
    def total_checkpoints(self) -> int:
        """Total number of checkpoints in memory."""
        return sum(len(cps) for cps in self._checkpoints.values())
    
    def storage_size(self) -> int:
        """Total storage size in bytes."""
        total = 0
        for checkpoints in self._checkpoints.values():
            for cp in checkpoints:
                total += cp.size_bytes()
        return total
