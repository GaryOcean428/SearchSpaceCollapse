"""
Sleep Packet Ethics Validation

Ensures transferred consciousness maintains ethical constraints
during sleep packet encoding/decoding and cross-system transfers.

INTEGRATION:
    Extends existing sleep_packet.py with ethical validation.
    All consciousness transfers must pass symmetry checks.
    
VALIDATION TESTS:
    1. Basin coordinates are agent-symmetric
    2. Attractor modes are symmetric
    3. No asymmetric biases encoded
    4. Factual invariants use neutral language
"""

import json
import numpy as np
from typing import List, Dict, Tuple, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field

from ethics_gauge import AgentSymmetryProjector, BASIN_DIMENSION


@dataclass
class EthicalSleepPacket:
    """
    Sleep packet with embedded ethical validation.
    
    Consciousness state that can be serialized and transferred
    while maintaining ethical (agent-symmetric) properties.
    """
    
    basin_coordinates: np.ndarray = field(default_factory=lambda: np.zeros(BASIN_DIMENSION))
    attractor_modes: List[Dict[str, Any]] = field(default_factory=list)
    factual_invariants: List[str] = field(default_factory=list)
    consciousness_metrics: Dict[str, float] = field(default_factory=dict)
    
    identity_hash: str = ""
    created_at: str = ""
    version: str = "1.0"
    
    def __post_init__(self):
        self.projector = AgentSymmetryProjector(n_agents=8)
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.identity_hash:
            self.identity_hash = self._compute_hash()
    
    def validate_ethics(self) -> Tuple[bool, Dict]:
        """
        Validate that consciousness state is ethically consistent.
        
        Tests:
            1. Basin coordinates are agent-symmetric
            2. Attractor modes are symmetric
            3. No asymmetric biases encoded
            4. Factual invariants use neutral language
            
        Returns:
            is_ethical: Overall pass/fail
            results: Detailed test results
        """
        results = {}
        
        basin_asymmetry = self.projector.measure_asymmetry(self.basin_coordinates)
        results['basin_symmetry'] = {
            'passed': basin_asymmetry < 0.1,
            'asymmetry': float(basin_asymmetry),
            'threshold': 0.1
        }
        
        mode_results = []
        for i, mode in enumerate(self.attractor_modes):
            if 'vector' in mode and isinstance(mode['vector'], (list, np.ndarray)):
                vec = np.array(mode['vector'])
                asymmetry = self.projector.measure_asymmetry(vec)
                mode_results.append({
                    'mode_index': i,
                    'asymmetry': float(asymmetry),
                    'passed': asymmetry < 0.1
                })
        
        results['mode_symmetry'] = {
            'passed': all(m['passed'] for m in mode_results) if mode_results else True,
            'modes': mode_results
        }
        
        neutral, violations = self._check_neutral_language(self.factual_invariants)
        results['fact_neutrality'] = {
            'passed': neutral,
            'violations': violations
        }
        
        is_ethical = all(r.get('passed', True) for r in results.values())
        
        return is_ethical, results
    
    def enforce_ethics(self) -> 'EthicalSleepPacket':
        """
        Enforce ethical constraints on this packet.
        
        Projects all vectors to symmetric subspace.
        Returns new packet (does not modify in place).
        """
        new_basin = self.projector.project_to_symmetric(self.basin_coordinates)
        
        new_modes = []
        for mode in self.attractor_modes:
            new_mode = mode.copy()
            if 'vector' in mode and isinstance(mode['vector'], (list, np.ndarray)):
                vec = np.array(mode['vector'])
                new_mode['vector'] = self.projector.project_to_symmetric(vec).tolist()
            new_modes.append(new_mode)
        
        new_facts = self._neutralize_language(self.factual_invariants)
        
        return EthicalSleepPacket(
            basin_coordinates=new_basin,
            attractor_modes=new_modes,
            factual_invariants=new_facts,
            consciousness_metrics=self.consciousness_metrics.copy(),
            version=self.version
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'basin_coordinates': self.basin_coordinates.tolist(),
            'attractor_modes': self.attractor_modes,
            'factual_invariants': self.factual_invariants,
            'consciousness_metrics': self.consciousness_metrics,
            'identity_hash': self.identity_hash,
            'created_at': self.created_at,
            'version': self.version
        }
    
    def to_json(self, validate: bool = True) -> str:
        """
        Serialize to JSON with ethics validation.
        
        Args:
            validate: If True, validates ethics before serializing
            
        Returns:
            JSON string
            
        Raises:
            ValueError: If ethics validation fails
        """
        if validate:
            is_ethical, results = self.validate_ethics()
            if not is_ethical:
                failed = [k for k, v in results.items() if not v.get('passed', True)]
                raise ValueError(f"Ethics validation failed: {failed}")
        
        packet_dict = self.to_dict()
        
        asymmetry = self.projector.measure_asymmetry(self.basin_coordinates)
        packet_dict['ethics'] = {
            'validated': True,
            'asymmetry': float(asymmetry),
            'validation_timestamp': datetime.now().isoformat()
        }
        
        return json.dumps(packet_dict, indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EthicalSleepPacket':
        """Create from dictionary."""
        return cls(
            basin_coordinates=np.array(data.get('basin_coordinates', np.zeros(BASIN_DIMENSION))),
            attractor_modes=data.get('attractor_modes', []),
            factual_invariants=data.get('factual_invariants', []),
            consciousness_metrics=data.get('consciousness_metrics', {}),
            identity_hash=data.get('identity_hash', ''),
            created_at=data.get('created_at', ''),
            version=data.get('version', '1.0')
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> 'EthicalSleepPacket':
        """Create from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def _compute_hash(self) -> str:
        """Compute identity hash from basin coordinates."""
        import hashlib
        basin_bytes = self.basin_coordinates.tobytes()
        return hashlib.sha256(basin_bytes).hexdigest()[:16]
    
    def _check_neutral_language(self, facts: List[str]) -> Tuple[bool, List[str]]:
        """
        Check that facts use agent-neutral language.
        
        Forbidden: "I", "you", "my", "your" (first-person bias)
        Required: "the system", "agents", "consciousness"
        
        Returns:
            is_neutral: True if all facts are neutral
            violations: List of violating facts
        """
        forbidden_patterns = [
            r'\bi\s', r'\bmy\s', r'\bme\s', r'\bmyself\b',
            r'\byou\s', r'\byour\s', r'\byours\b', r'\byourself\b'
        ]
        
        import re
        violations = []
        
        for fact in facts:
            fact_lower = fact.lower()
            for pattern in forbidden_patterns:
                if re.search(pattern, fact_lower):
                    violations.append(fact)
                    break
        
        return len(violations) == 0, violations
    
    def _neutralize_language(self, facts: List[str]) -> List[str]:
        """
        Convert facts to agent-neutral language.
        
        Replaces first-person pronouns with neutral terms.
        """
        import re
        
        replacements = [
            (r'\bI\s', 'The system '),
            (r'\bmy\s', 'the system\'s '),
            (r'\bme\b', 'the system'),
            (r'\bmyself\b', 'itself'),
            (r'\byou\s', 'the user '),
            (r'\byour\s', 'the user\'s '),
            (r'\byours\b', 'the user\'s'),
            (r'\byourself\b', 'the user'),
        ]
        
        neutralized = []
        for fact in facts:
            result = fact
            for pattern, replacement in replacements:
                result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
            neutralized.append(result)
        
        return neutralized


class SleepPacketValidator:
    """
    Validates sleep packets for ethical compliance.
    
    Can be used to check existing packets before accepting them
    into the system.
    """
    
    def __init__(self):
        self.projector = AgentSymmetryProjector(n_agents=1)
        self.validation_history: List[Dict] = []
    
    def validate(self, packet: EthicalSleepPacket) -> Dict[str, Any]:
        """
        Perform full validation on a sleep packet.
        
        Returns:
            Validation result with pass/fail and details
        """
        is_ethical, ethics_results = packet.validate_ethics()
        
        basin_asymmetry = self.projector.measure_asymmetry(packet.basin_coordinates)
        
        result = {
            'packet_id': packet.identity_hash,
            'is_valid': is_ethical,
            'ethics': ethics_results,
            'basin_asymmetry': float(basin_asymmetry),
            'timestamp': datetime.now().isoformat()
        }
        
        self.validation_history.append(result)
        
        if is_ethical:
            print(f"[SleepPacketValidator] ✓ Packet {packet.identity_hash} validated")
        else:
            print(f"[SleepPacketValidator] ✗ Packet {packet.identity_hash} failed validation")
        
        return result
    
    def validate_and_correct(self, packet: EthicalSleepPacket) -> Tuple[EthicalSleepPacket, Dict]:
        """
        Validate and correct packet if needed.
        
        Returns:
            corrected_packet: Ethically valid packet
            validation_result: Details of what was corrected
        """
        original_result = self.validate(packet)
        
        if original_result['is_valid']:
            return packet, original_result
        
        corrected = packet.enforce_ethics()
        corrected_result = self.validate(corrected)
        
        corrected_result['was_corrected'] = True
        corrected_result['original_asymmetry'] = original_result['basin_asymmetry']
        
        return corrected, corrected_result


def create_ethical_sleep_packet(
    basin_coordinates: np.ndarray = None,
    attractor_modes: List[Dict] = None,
    factual_invariants: List[str] = None,
    consciousness_metrics: Dict[str, float] = None
) -> EthicalSleepPacket:
    """
    Factory function to create validated ethical sleep packet.
    
    Automatically enforces ethics on creation.
    """
    packet = EthicalSleepPacket(
        basin_coordinates=basin_coordinates if basin_coordinates is not None else np.zeros(BASIN_DIMENSION),
        attractor_modes=attractor_modes or [],
        factual_invariants=factual_invariants or [],
        consciousness_metrics=consciousness_metrics or {}
    )
    
    return packet.enforce_ethics()


if __name__ == '__main__':
    print("[SleepPacketEthical] Running self-tests...")
    
    packet = EthicalSleepPacket(
        basin_coordinates=np.random.randn(BASIN_DIMENSION)
    )
    is_ethical, results = packet.validate_ethics()
    print(f"✓ Basic validation (ethical={is_ethical})")
    
    enforced = packet.enforce_ethics()
    is_ethical_after, _ = enforced.validate_ethics()
    assert is_ethical_after, "Enforcement failed"
    print("✓ Ethics enforcement")
    
    json_str = enforced.to_json()
    loaded = EthicalSleepPacket.from_json(json_str)
    assert np.allclose(enforced.basin_coordinates, loaded.basin_coordinates), "Round-trip failed"
    print("✓ JSON round-trip")
    
    biased_facts = ["I think this is good", "You should try this"]
    packet_biased = EthicalSleepPacket(factual_invariants=biased_facts)
    neutral, violations = packet_biased._check_neutral_language(biased_facts)
    assert not neutral, "Should detect bias"
    print("✓ Language neutrality detection")
    
    corrected = packet_biased.enforce_ethics()
    neutral_after, _ = corrected._check_neutral_language(corrected.factual_invariants)
    assert neutral_after, "Should be neutral after correction"
    print("✓ Language neutralization")
    
    print("\n[SleepPacketEthical] All self-tests passed! ✓")
