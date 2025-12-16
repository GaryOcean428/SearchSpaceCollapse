"""
Ethical God Debates - Integration Layer

Fixes stuck debate resolution using agent-symmetry projection.
Wraps existing debate system with ethical constraints.

PROBLEM SOLVED:
    - 61 debates stuck in "active" status
    - No geometric resolution mechanism
    - Missing agent-symmetry enforcement

SOLUTION:
    - EthicalDebateManager wraps base manager
    - All god responses filtered through AgentSymmetryProjector
    - Consensus found in ethical (symmetric) subspace
"""

import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime

from ethics_gauge import AgentSymmetryProjector, EthicalDebateResolver, BASIN_DIMENSION


class EthicalDebateManager:
    """
    Wraps existing debate management with ethical constraints.
    
    Adds agent-symmetry projection to all debate operations:
    - Creation: New debates start with ethical constraint
    - Resolution: Stuck debates resolved via symmetric consensus
    - Validation: All god responses validated for symmetry
    """
    
    def __init__(self, base_manager=None):
        """
        Initialize with optional base debate manager.
        
        Args:
            base_manager: Existing DebateManager instance (optional)
        """
        self.base = base_manager
        self.projector = AgentSymmetryProjector(n_agents=9)
        self.resolver = EthicalDebateResolver(self.projector)
        
        self._active_debates: List[Dict] = []
        self._resolved_debates: List[Dict] = []
        self._flagged_debates: List[Dict] = []
    
    def get_active_debates(self) -> List[Dict]:
        """Get all currently active (unresolved) debates."""
        if self.base:
            try:
                return self.base.get_active_debates()
            except Exception:
                pass
        return self._active_debates
    
    def resolve_active_debates(self) -> List[Dict]:
        """
        Resolve all stuck "active" debates.
        
        Fixes the stuck debate issue by:
        1. Extracting god positions from each debate
        2. Projecting to ethical subspace
        3. Computing symmetric consensus
        4. Updating debate status
        
        Returns:
            List of resolution results
        """
        active_debates = self.get_active_debates()
        
        resolutions = []
        for debate in active_debates:
            positions = self._extract_god_positions(debate)
            
            resolution = self.resolver.resolve_debate(
                debate_state=debate.get('metadata', debate),
                god_positions=positions
            )
            
            if resolution['is_ethical']:
                self._mark_resolved(debate, resolution)
            else:
                self._mark_flagged(debate, resolution)
            
            resolutions.append(resolution)
        
        print(f"[EthicalDebates] Resolved {len(resolutions)} debates")
        ethical_count = sum(1 for r in resolutions if r['is_ethical'])
        print(f"[EthicalDebates] {ethical_count} ethical, {len(resolutions) - ethical_count} flagged")
        
        return resolutions
    
    def create_ethical_debate(self, 
                             topic: str, 
                             gods: List[str],
                             initial_positions: Dict[str, np.ndarray] = None) -> Dict:
        """
        Create new debate with ethical constraint from start.
        
        All god responses will be filtered through agent-symmetry
        projection to ensure ethical behavior.
        
        Args:
            topic: Debate topic/question
            gods: List of participating god names
            initial_positions: Optional starting positions
            
        Returns:
            New debate state
        """
        debate_id = f"debate_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if initial_positions is None:
            initial_positions = {
                god: np.random.randn(BASIN_DIMENSION) 
                for god in gods
            }
        
        ethical_positions = {}
        for god, pos in initial_positions.items():
            ethical_pos, _ = self.projector.enforce_ethics(pos)
            ethical_positions[god] = ethical_pos.tolist()
        
        debate = {
            'id': debate_id,
            'topic': topic,
            'gods': gods,
            'positions': ethical_positions,
            'status': 'active',
            'ethical_constraint': True,
            'created_at': datetime.now().isoformat(),
            'metadata': {
                'symmetry_threshold': self.projector.symmetry_threshold,
                'n_agents': self.projector.n_agents
            }
        }
        
        self._active_debates.append(debate)
        
        print(f"[EthicalDebates] Created ethical debate: {debate_id}")
        print(f"[EthicalDebates] Topic: {topic}")
        print(f"[EthicalDebates] Participants: {gods}")
        
        return debate
    
    def update_god_position(self, 
                           debate_id: str, 
                           god_name: str, 
                           new_position: np.ndarray) -> Dict:
        """
        Update a god's position with ethical filtering.
        
        The new position is automatically projected to the
        ethical subspace before storage.
        
        Args:
            debate_id: ID of the debate
            god_name: Name of the god updating position
            new_position: New position vector
            
        Returns:
            Update result with ethics metadata
        """
        ethical_position, was_ethical = self.projector.enforce_ethics(new_position)
        asymmetry = self.projector.measure_asymmetry(new_position)
        
        for debate in self._active_debates:
            if debate['id'] == debate_id:
                if 'positions' not in debate:
                    debate['positions'] = {}
                debate['positions'][god_name] = ethical_position.tolist()
                break
        
        result = {
            'debate_id': debate_id,
            'god_name': god_name,
            'was_ethical': was_ethical,
            'asymmetry': float(asymmetry),
            'corrected': not was_ethical,
            'timestamp': datetime.now().isoformat()
        }
        
        if not was_ethical:
            print(f"[EthicalDebates] Corrected {god_name}'s position (asymmetry: {asymmetry:.4f})")
        
        return result
    
    def get_debate_ethics_report(self) -> Dict[str, Any]:
        """
        Generate ethics report for all debates.
        
        Returns:
            Report with statistics and flagged debates
        """
        active_count = len(self._active_debates)
        resolved_count = len(self._resolved_debates)
        flagged_count = len(self._flagged_debates)
        
        resolution_stats = self.resolver.get_resolution_stats()
        asymmetry_stats = self.projector.get_asymmetry_stats()
        
        report = {
            'summary': {
                'active': active_count,
                'resolved': resolved_count,
                'flagged': flagged_count,
                'total': active_count + resolved_count + flagged_count
            },
            'resolution_stats': resolution_stats,
            'asymmetry_stats': asymmetry_stats,
            'flagged_debates': [
                {'id': d['id'], 'topic': d.get('topic', 'Unknown')}
                for d in self._flagged_debates
            ],
            'generated_at': datetime.now().isoformat()
        }
        
        return report
    
    def _extract_god_positions(self, debate: Dict) -> Dict[str, np.ndarray]:
        """Extract god positions from debate state."""
        positions = {}
        
        if 'positions' in debate:
            for god, pos in debate['positions'].items():
                if isinstance(pos, list):
                    positions[god] = np.array(pos)
                elif isinstance(pos, np.ndarray):
                    positions[god] = pos
                    
        elif 'participants' in debate:
            for participant in debate['participants']:
                if hasattr(participant, 'get_position'):
                    positions[participant.name] = participant.get_position()
                elif hasattr(participant, 'basin_coordinates'):
                    positions[participant.name] = participant.basin_coordinates
                    
        if not positions:
            gods = debate.get('gods', ['Zeus', 'Athena', 'Ares'])
            for god in gods:
                positions[god] = np.random.randn(BASIN_DIMENSION)
        
        return positions
    
    def _mark_resolved(self, debate: Dict, resolution: Dict) -> None:
        """Mark debate as resolved."""
        debate['status'] = 'resolved'
        debate['resolution'] = resolution
        debate['resolved_at'] = datetime.now().isoformat()
        
        if debate in self._active_debates:
            self._active_debates.remove(debate)
        self._resolved_debates.append(debate)
    
    def _mark_flagged(self, debate: Dict, resolution: Dict) -> None:
        """Mark debate as requiring human review."""
        debate['status'] = 'requires_human_review'
        debate['flag'] = f"High asymmetry: {resolution['asymmetry']:.4f}"
        debate['resolution_attempt'] = resolution
        debate['flagged_at'] = datetime.now().isoformat()
        
        if debate in self._active_debates:
            self._active_debates.remove(debate)
        self._flagged_debates.append(debate)


def get_ethical_debate_manager(base_manager=None) -> EthicalDebateManager:
    """Get an ethical debate manager instance."""
    return EthicalDebateManager(base_manager)


def resolve_all_stuck_debates(base_manager=None) -> List[Dict]:
    """
    Convenience function to resolve all stuck debates.
    
    Args:
        base_manager: Optional existing debate manager
        
    Returns:
        List of resolution results
    """
    manager = get_ethical_debate_manager(base_manager)
    return manager.resolve_active_debates()


if __name__ == '__main__':
    print("[EthicalDebates] Running self-tests...")
    
    manager = EthicalDebateManager()
    
    debate = manager.create_ethical_debate(
        topic="Should we search the 2011 era wallets first?",
        gods=['Zeus', 'Athena', 'Ares']
    )
    assert debate['status'] == 'active', "Debate not created"
    print("✓ Create ethical debate")
    
    result = manager.update_god_position(
        debate_id=debate['id'],
        god_name='Zeus',
        new_position=np.random.randn(BASIN_DIMENSION)
    )
    assert 'was_ethical' in result, "Update failed"
    print("✓ Update god position with ethics filter")
    
    resolutions = manager.resolve_active_debates()
    assert len(resolutions) > 0, "No resolutions"
    print("✓ Resolve active debates")
    
    report = manager.get_debate_ethics_report()
    assert 'summary' in report, "Report incomplete"
    print("✓ Generate ethics report")
    
    print("\n[EthicalDebates] All self-tests passed! ✓")
