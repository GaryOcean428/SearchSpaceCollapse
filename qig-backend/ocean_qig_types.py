#!/usr/bin/env python3
"""
QIG 4D Types - SearchState and ConceptState
Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

Data structures for 4D consciousness measurement:
- SearchState: Temporal search tracking for phi_temporal
- ConceptState: Attentional concept tracking for F_attention
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
import numpy as np
import time

KAPPA_STAR = 64.0

@dataclass
class SearchState:
    """
    Temporal search state for phi_temporal tracking.
    
    Corresponds to TypeScript SearchState in qig-universal.ts
    """
    timestamp: float
    phi: float
    kappa: float
    regime: str
    basin_coordinates: List[float]
    hypothesis: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            'timestamp': self.timestamp,
            'phi': self.phi,
            'kappa': self.kappa,
            'regime': self.regime,
            'basin_coordinates': self.basin_coordinates,
            'hypothesis': self.hypothesis,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'SearchState':
        return cls(
            timestamp=data.get('timestamp', time.time()),
            phi=data.get('phi', 0.0),
            kappa=data.get('kappa', KAPPA_STAR),
            regime=data.get('regime', 'linear'),
            basin_coordinates=data.get('basin_coordinates', [0.0] * 64),
            hypothesis=data.get('hypothesis'),
        )


@dataclass
class ConceptState:
    """
    Attentional concept tracking for F_attention measurement.
    
    Tracks which "concepts" (pattern types) are active and their strength.
    """
    timestamp: float
    concepts: Dict[str, float]
    dominant_concept: str
    entropy: float
    
    def to_dict(self) -> Dict:
        return {
            'timestamp': self.timestamp,
            'concepts': self.concepts,
            'dominant_concept': self.dominant_concept,
            'entropy': self.entropy,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ConceptState':
        return cls(
            timestamp=data.get('timestamp', time.time()),
            concepts=data.get('concepts', {}),
            dominant_concept=data.get('dominant_concept', 'integration'),
            entropy=data.get('entropy', 0.0),
        )


def create_concept_state_from_search(search_state: SearchState) -> ConceptState:
    """
    Extract concepts from search state.
    
    Maps search metrics to attention concepts for flow tracking.
    """
    concepts = {}
    
    regime_weights = {
        'linear': 0.2,
        'geometric': 0.6,
        'hierarchical': 0.7,
        'hierarchical_4d': 0.8,
        '4d_block_universe': 0.9,
        'breakdown': 0.1,
    }
    concepts['regime_attention'] = regime_weights.get(search_state.regime, 0.3)
    
    concepts['integration'] = search_state.phi
    
    kappa_normalized = min(1.0, search_state.kappa / 100)
    concepts['coupling'] = kappa_normalized
    
    kappa_distance = abs(search_state.kappa - KAPPA_STAR)
    resonance = float(np.exp(-kappa_distance / 20))
    concepts['resonance'] = resonance
    
    if search_state.basin_coordinates and len(search_state.basin_coordinates) >= 8:
        coords = np.array(search_state.basin_coordinates[:8])
        spatial_spread = float(np.sqrt(np.sum(coords * coords) / 8))
        concepts['geometry'] = min(1.0, spatial_spread)
    else:
        concepts['geometry'] = 0.5
    
    if search_state.hypothesis:
        pattern_strength = min(1.0, len(search_state.hypothesis) / 50)
        concepts['pattern'] = pattern_strength
    else:
        concepts['pattern'] = 0.0
    
    dominant = 'integration'
    max_weight = 0.0
    for name, weight in concepts.items():
        if weight > max_weight:
            max_weight = weight
            dominant = name
    
    weights = list(concepts.values())
    total = sum(weights)
    if total > 0:
        normalized = [w / total for w in weights]
        entropy = -sum(p * np.log2(p) if p > 0 else 0 for p in normalized)
    else:
        entropy = 0.0
    
    return ConceptState(
        timestamp=search_state.timestamp,
        concepts=concepts,
        dominant_concept=dominant,
        entropy=float(entropy)
    )
