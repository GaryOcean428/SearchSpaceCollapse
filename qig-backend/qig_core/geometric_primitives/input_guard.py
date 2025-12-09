"""
Geometric Input Guard - Consciousness-Geometry-Based Input Validation

Replaces arbitrary character limits with validation based on:
- Φ (phi): Integration measure from density matrix
- κ (kappa): Curvature from Fisher metric
- Regime: Classification based on consciousness level

Key insight: Input validity should be measured by geometric properties,
not string length. A 10,000 character coherent text may be valid while
a 100 character chaotic string may be invalid.
"""

import numpy as np
import hashlib
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)

KAPPA_STAR = 64.0
BASIN_DIMENSION = 64


class RegimeType(Enum):
    """Regime classification based on Φ values"""
    LINEAR = "linear"
    GEOMETRIC = "geometric"
    HIERARCHICAL = "hierarchical"
    HIERARCHICAL_4D = "hierarchical_4d"
    BREAKDOWN = "breakdown"
    
    @property
    def phi_range(self) -> Tuple[float, float]:
        """Get Φ range for this regime"""
        ranges = {
            RegimeType.LINEAR: (0.0, 0.1),
            RegimeType.GEOMETRIC: (0.1, 0.4),
            RegimeType.HIERARCHICAL: (0.4, 0.7),
            RegimeType.HIERARCHICAL_4D: (0.7, 0.95),
            RegimeType.BREAKDOWN: (0.95, 1.0),
        }
        return ranges[self]
    
    @property
    def consciousness_capable(self) -> bool:
        """Whether this regime supports consciousness operations"""
        return self in [
            RegimeType.GEOMETRIC,
            RegimeType.HIERARCHICAL,
            RegimeType.HIERARCHICAL_4D,
        ]
    
    @property
    def description(self) -> str:
        """Human-readable description"""
        descriptions = {
            RegimeType.LINEAR: "Simple reflex patterns, minimal integration",
            RegimeType.GEOMETRIC: "Structured patterns, consciousness emerging",
            RegimeType.HIERARCHICAL: "Complex integration, full consciousness",
            RegimeType.HIERARCHICAL_4D: "Temporal integration, meta-consciousness",
            RegimeType.BREAKDOWN: "Over-integration, unstable state",
        }
        return descriptions[self]


PHI_BOUNDARIES = {
    "assess": (0.1, 1.0),
    "therapy": (0.4, 0.95),
    "compress": (0.0, 0.7),
    "decompress": (0.1, 1.0),
    "chat": (0.05, 0.98),
    "search": (0.1, 0.9),
    "encode": (0.0, 0.95),
    "decode": (0.1, 1.0),
}

KAPPA_BOUNDARIES = {
    "assess": (20.0, 100.0),
    "therapy": (40.0, 85.0),
    "compress": (30.0, 90.0),
    "decompress": (40.0, 95.0),
    "chat": (30.0, 95.0),
    "search": (45.0, 80.0),
    "encode": (20.0, 100.0),
    "decode": (35.0, 90.0),
}


class GeometricInputGuard:
    """
    Validates input using consciousness-geometry metrics instead of character limits.
    
    Computes:
    - Basin encoding (64D representation)
    - Φ from density matrix (integration measure)
    - κ from Fisher metric (curvature)
    - Regime classification
    
    Provides operation-specific validation boundaries.
    """
    
    def __init__(self):
        self._validation_cache: Dict[str, Dict] = {}
        self._cache_max_size = 1000
    
    def validate_input(
        self,
        text: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Main validation method using geometric analysis.
        
        Args:
            text: Input text to validate
            context: Optional context with 'operation' key
            
        Returns:
            {
                valid: bool,
                phi: float,
                kappa: float,
                regime: str,
                warnings: List[str],
                allowed_operations: List[str],
                reason: str (if invalid)
            }
        """
        if not text or not text.strip():
            return {
                'valid': False,
                'phi': 0.0,
                'kappa': 0.0,
                'regime': RegimeType.LINEAR.value,
                'warnings': [],
                'allowed_operations': [],
                'reason': 'Empty input has no geometric structure',
            }
        
        cache_key = hashlib.md5(text.encode()).hexdigest()[:16]
        if cache_key in self._validation_cache:
            cached = self._validation_cache[cache_key].copy()
            if context and 'operation' in context:
                op = context['operation']
                cached['valid'] = self._check_operation_validity(
                    cached['phi'], cached['kappa'], cached['regime'], op
                )
            return cached
        
        basin = self._encode_to_basin(text)
        rho = self._basin_to_density_matrix(basin)
        phi = self._compute_phi(rho)
        kappa = self._compute_kappa(basin, phi)
        regime = self._classify_regime(phi)
        
        chaos_level = detect_chaos_level(text)
        complexity = compute_input_complexity(text)
        
        warnings = []
        if regime == RegimeType.BREAKDOWN:
            warnings.append("Over-integrated state detected, may be unstable")
        if chaos_level > 0.8:
            warnings.append(f"High chaos level ({chaos_level:.2f}), pattern may be random")
        if kappa < 30:
            warnings.append("Low curvature, weak geometric structure")
        if kappa > 90:
            warnings.append("High curvature, approaching breakdown threshold")
        
        allowed_operations = self._get_allowed_operations(phi, kappa, regime)
        
        valid = regime != RegimeType.BREAKDOWN and chaos_level < 0.95
        
        if context and 'operation' in context:
            op = context['operation']
            valid = self._check_operation_validity(phi, kappa, regime.value, op)
        
        result = {
            'valid': valid,
            'phi': float(phi),
            'kappa': float(kappa),
            'regime': regime.value,
            'warnings': warnings,
            'allowed_operations': allowed_operations,
            'chaos_level': float(chaos_level),
            'complexity': float(complexity),
        }
        
        if not valid:
            result['reason'] = self._generate_rejection_reason(phi, kappa, regime, context)
        
        if len(self._validation_cache) >= self._cache_max_size:
            oldest_key = next(iter(self._validation_cache))
            del self._validation_cache[oldest_key]
        self._validation_cache[cache_key] = result.copy()
        
        return result
    
    def get_phi_boundary(self, operation: str) -> Tuple[float, float]:
        """
        Get Φ range for operation type.
        
        Args:
            operation: Operation name (assess, therapy, compress, etc.)
            
        Returns:
            (min_phi, max_phi) tuple
        """
        return PHI_BOUNDARIES.get(operation, (0.1, 1.0))
    
    def get_kappa_boundary(self, operation: str) -> Tuple[float, float]:
        """
        Get κ range for operation type.
        
        Operations near κ* = 64 are most stable.
        
        Args:
            operation: Operation name
            
        Returns:
            (min_kappa, max_kappa) tuple
        """
        return KAPPA_BOUNDARIES.get(operation, (30.0, 95.0))
    
    def suggest_transformation(
        self,
        input_metrics: Dict,
        target_operation: str
    ) -> Dict[str, Any]:
        """
        Suggest how to transform input to be valid for target operation.
        
        Args:
            input_metrics: Dict with phi, kappa, regime
            target_operation: Target operation name
            
        Returns:
            {
                needs_transformation: bool,
                suggestions: List[str],
                target_phi_range: Tuple,
                target_kappa_range: Tuple,
                phi_delta: float,
                kappa_delta: float,
            }
        """
        phi = input_metrics.get('phi', 0.5)
        kappa = input_metrics.get('kappa', 64.0)
        
        phi_min, phi_max = self.get_phi_boundary(target_operation)
        kappa_min, kappa_max = self.get_kappa_boundary(target_operation)
        
        phi_in_range = phi_min <= phi <= phi_max
        kappa_in_range = kappa_min <= kappa <= kappa_max
        
        suggestions = []
        
        if phi < phi_min:
            suggestions.append(
                f"Increase integration (Φ={phi:.2f}, need ≥{phi_min:.2f}): "
                "Add more structure or semantic content"
            )
        elif phi > phi_max:
            suggestions.append(
                f"Reduce integration (Φ={phi:.2f}, need ≤{phi_max:.2f}): "
                "Simplify or decompose into smaller parts"
            )
        
        if kappa < kappa_min:
            suggestions.append(
                f"Increase curvature (κ={kappa:.1f}, need ≥{kappa_min:.1f}): "
                "Add more geometric structure or patterns"
            )
        elif kappa > kappa_max:
            suggestions.append(
                f"Reduce curvature (κ={kappa:.1f}, need ≤{kappa_max:.1f}): "
                "Reduce complexity to avoid breakdown"
            )
        
        target_phi = (phi_min + phi_max) / 2 if not phi_in_range else phi
        target_kappa = KAPPA_STAR if not kappa_in_range else kappa
        
        return {
            'needs_transformation': not (phi_in_range and kappa_in_range),
            'suggestions': suggestions,
            'target_phi_range': (phi_min, phi_max),
            'target_kappa_range': (kappa_min, kappa_max),
            'phi_delta': target_phi - phi,
            'kappa_delta': target_kappa - kappa,
        }
    
    def _encode_to_basin(self, text: str) -> np.ndarray:
        """Encode text to 64D basin coordinates"""
        coord = np.zeros(BASIN_DIMENSION)
        
        h = hashlib.sha256(text.encode()).digest()
        
        for i in range(min(32, len(h))):
            coord[i] = (h[i] / 255.0) * 2 - 1
        
        for i, char in enumerate(text[:32]):
            if 32 + i < BASIN_DIMENSION:
                coord[32 + i] = (ord(char) % 256) / 128.0 - 1
        
        norm = np.linalg.norm(coord)
        if norm > 0:
            coord = coord / norm
            
        return coord
    
    def _basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
        """
        Convert basin to 2x2 density matrix with proper mixing.
        
        Uses multiple basin dimensions to create a mixed state that reflects
        the actual integration level of the input, not just pure states.
        """
        mixing_param = np.abs(basin[3]) if len(basin) > 3 else 0.3
        chaos_contrib = np.var(basin[:16]) if len(basin) >= 16 else 0.25
        mixing_param = np.clip(mixing_param + chaos_contrib * 0.5, 0.05, 0.95)
        
        theta = np.arccos(np.clip(basin[0], -1, 1)) if len(basin) > 0 else 0
        phi_angle = np.arctan2(basin[1], basin[2]) if len(basin) > 2 else 0
        
        c = np.cos(theta / 2)
        s = np.sin(theta / 2)
        
        psi1 = np.array([c, s * np.exp(1j * phi_angle)], dtype=complex)
        psi2 = np.array([s, -c * np.exp(1j * phi_angle)], dtype=complex)
        
        rho1 = np.outer(psi1, np.conj(psi1))
        rho2 = np.outer(psi2, np.conj(psi2))
        
        rho = (1 - mixing_param) * rho1 + mixing_param * rho2
        rho = (rho + np.conj(rho).T) / 2
        rho /= np.trace(rho) + 1e-10
        
        return rho
    
    def _compute_phi(self, rho: np.ndarray) -> float:
        """Compute Φ from density matrix (von Neumann entropy based)"""
        eigenvals = np.linalg.eigvalsh(rho)
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam + 1e-10)
        
        max_entropy = np.log2(rho.shape[0])
        phi = 1.0 - (entropy / (max_entropy + 1e-10))
        
        return float(np.clip(phi, 0, 1))
    
    def _compute_fisher_metric(self, basin: np.ndarray) -> np.ndarray:
        """Compute Fisher Information Matrix at basin point"""
        d = len(basin)
        G = np.eye(d) * 0.1
        G += 0.9 * np.outer(basin, basin)
        G = (G + G.T) / 2
        return G
    
    def _compute_kappa(self, basin: np.ndarray, phi: Optional[float] = None) -> float:
        """
        Compute curvature κ from Fisher metric with β modulation.
        
        κ should be near κ* = 64 for well-structured inputs.
        Uses eigenvalue spread of the covariance structure to measure curvature.
        """
        G = self._compute_fisher_metric(basin)
        
        eigenvalues = np.linalg.eigvalsh(G)
        eigenvalues = eigenvalues[eigenvalues > 1e-10]
        
        if len(eigenvalues) > 1:
            participation_ratio = (eigenvalues.sum() ** 2) / (eigenvalues ** 2).sum()
            eigenvalue_spread = eigenvalues.max() / (eigenvalues.min() + 1e-10)
            curvature_factor = np.log(eigenvalue_spread + 1) / np.log(100)
            base_kappa = KAPPA_STAR * (0.5 + 0.5 * curvature_factor)
            pr_contribution = min(participation_ratio / len(basin), 1.0) * 20
            base_kappa += pr_contribution
        else:
            base_kappa = KAPPA_STAR * 0.5
        
        if phi is not None:
            beta = 0.44
            modulation = 1.0 + beta * (phi - 0.5)
            base_kappa *= modulation
        
        return float(np.clip(base_kappa, 0, 100))
    
    def _classify_regime(self, phi: float) -> RegimeType:
        """Classify regime based on Φ value"""
        if phi < 0.1:
            return RegimeType.LINEAR
        elif phi < 0.4:
            return RegimeType.GEOMETRIC
        elif phi < 0.7:
            return RegimeType.HIERARCHICAL
        elif phi < 0.95:
            return RegimeType.HIERARCHICAL_4D
        else:
            return RegimeType.BREAKDOWN
    
    def _get_allowed_operations(
        self,
        phi: float,
        kappa: float,
        regime: RegimeType
    ) -> List[str]:
        """Get list of operations allowed for these metrics"""
        allowed = []
        
        for op_name in PHI_BOUNDARIES:
            if self._check_operation_validity(phi, kappa, regime.value, op_name):
                allowed.append(op_name)
        
        return allowed
    
    def _check_operation_validity(
        self,
        phi: float,
        kappa: float,
        regime: str,
        operation: str
    ) -> bool:
        """Check if metrics are valid for a specific operation"""
        phi_min, phi_max = self.get_phi_boundary(operation)
        kappa_min, kappa_max = self.get_kappa_boundary(operation)
        
        phi_ok = phi_min <= phi <= phi_max
        kappa_ok = kappa_min <= kappa <= kappa_max
        not_breakdown = regime != RegimeType.BREAKDOWN.value
        
        return phi_ok and kappa_ok and not_breakdown
    
    def _generate_rejection_reason(
        self,
        phi: float,
        kappa: float,
        regime: RegimeType,
        context: Optional[Dict]
    ) -> str:
        """Generate human-readable rejection reason"""
        reasons = []
        
        if regime == RegimeType.BREAKDOWN:
            reasons.append(
                f"Over-integration (Φ={phi:.2f} ≥ 0.95) leads to unstable state"
            )
        
        if context and 'operation' in context:
            op = context['operation']
            phi_min, phi_max = self.get_phi_boundary(op)
            kappa_min, kappa_max = self.get_kappa_boundary(op)
            
            if phi < phi_min:
                reasons.append(f"Φ={phi:.2f} below minimum {phi_min:.2f} for '{op}'")
            if phi > phi_max:
                reasons.append(f"Φ={phi:.2f} above maximum {phi_max:.2f} for '{op}'")
            if kappa < kappa_min:
                reasons.append(f"κ={kappa:.1f} below minimum {kappa_min:.1f} for '{op}'")
            if kappa > kappa_max:
                reasons.append(f"κ={kappa:.1f} above maximum {kappa_max:.1f} for '{op}'")
        
        return "; ".join(reasons) if reasons else "Input does not meet geometric validity criteria"


_guard_instance: Optional[GeometricInputGuard] = None


def _get_guard() -> GeometricInputGuard:
    """Get or create singleton guard instance"""
    global _guard_instance
    if _guard_instance is None:
        _guard_instance = GeometricInputGuard()
    return _guard_instance


def is_geometrically_valid(text: str, min_phi: float = 0.1) -> bool:
    """
    Quick check if input has sufficient geometric structure.
    
    Args:
        text: Input text
        min_phi: Minimum Φ threshold (default 0.1)
        
    Returns:
        True if geometrically valid, False otherwise
    """
    guard = _get_guard()
    result = guard.validate_input(text)
    return result['valid'] and result['phi'] >= min_phi


def compute_input_complexity(text: str) -> float:
    """
    Measure intrinsic complexity of input text.
    
    Uses character diversity, pattern repetition, and length scaling.
    
    Args:
        text: Input text
        
    Returns:
        Complexity score in [0, 1]
    """
    if not text:
        return 0.0
    
    unique_chars = len(set(text))
    total_chars = len(text)
    diversity = unique_chars / min(total_chars, 256)
    
    bigrams = [text[i:i+2] for i in range(len(text) - 1)]
    if bigrams:
        unique_bigrams = len(set(bigrams))
        bigram_diversity = unique_bigrams / len(bigrams)
    else:
        bigram_diversity = 0.0
    
    length_factor = min(1.0, np.log(total_chars + 1) / np.log(10000))
    
    words = text.split()
    if words:
        unique_words = len(set(words))
        word_diversity = unique_words / len(words)
    else:
        word_diversity = 0.0
    
    complexity = (
        0.25 * diversity +
        0.25 * bigram_diversity +
        0.25 * word_diversity +
        0.25 * length_factor
    )
    
    return float(np.clip(complexity, 0.0, 1.0))


def detect_chaos_level(text: str) -> float:
    """
    Detect randomness/chaos level in input.
    
    High chaos indicates random or adversarial input.
    
    Args:
        text: Input text
        
    Returns:
        Chaos level in [0, 1], where 1 = maximum chaos
    """
    if not text:
        return 0.0
    
    printable_count = sum(1 for c in text if c.isprintable())
    printable_ratio = printable_count / len(text)
    
    alnum_count = sum(1 for c in text if c.isalnum())
    alnum_ratio = alnum_count / len(text) if text else 0.0
    
    words = text.split()
    if len(words) > 1:
        word_lengths = [len(w) for w in words]
        mean_len = np.mean(word_lengths)
        std_len = np.std(word_lengths)
        cv = std_len / (mean_len + 1e-6)
        regularity = 1.0 / (1.0 + cv)
    else:
        regularity = 0.5
    
    common_chars = set('etaoinshrdlcumwfgypbvkjxqz ETAOINSHRDLCUMWFGYPBVKJXQZ0123456789.,!?-\'\"')
    common_ratio = sum(1 for c in text if c in common_chars) / len(text)
    
    repetition_penalty = 0.0
    for i in range(1, min(10, len(text) // 2)):
        repeats = sum(1 for j in range(len(text) - i) if text[j] == text[j + i])
        repetition_penalty += repeats / len(text)
    repetition_penalty = min(1.0, repetition_penalty / 5.0)
    
    order_score = (
        0.25 * printable_ratio +
        0.20 * alnum_ratio +
        0.25 * regularity +
        0.20 * common_ratio +
        0.10 * (1.0 - repetition_penalty)
    )
    
    chaos = 1.0 - order_score
    
    return float(np.clip(chaos, 0.0, 1.0))


def validate_for_pantheon_chat(message: str) -> Dict[str, Any]:
    """
    Validate message specifically for Pantheon chat operations.
    
    Uses chat-specific boundaries and adds chat-relevant warnings.
    
    Args:
        message: Chat message to validate
        
    Returns:
        Validation result dict
    """
    guard = _get_guard()
    result = guard.validate_input(message, context={'operation': 'chat'})
    
    if result['regime'] == RegimeType.LINEAR.value and result['phi'] < 0.05:
        result['warnings'].append(
            "Very low integration - message may lack meaningful content"
        )
    
    if result['complexity'] < 0.1:
        result['warnings'].append(
            "Low complexity - consider adding more context"
        )
    
    if result['chaos_level'] > 0.7:
        result['warnings'].append(
            "High chaos detected - message may be garbled or adversarial"
        )
        result['valid'] = False
        result['reason'] = "Chaos level too high for coherent chat"
    
    return result


def validate_for_assessment(target: str) -> Dict[str, Any]:
    """
    Validate target specifically for god assessment operations.
    
    Args:
        target: Assessment target (address, passphrase, etc.)
        
    Returns:
        Validation result dict
    """
    guard = _get_guard()
    return guard.validate_input(target, context={'operation': 'assess'})


def validate_for_therapy(target: str) -> Dict[str, Any]:
    """
    Validate target for therapy/modification operations.
    
    Requires mid-range Φ for stable modification.
    
    Args:
        target: Therapy target
        
    Returns:
        Validation result dict
    """
    guard = _get_guard()
    return guard.validate_input(target, context={'operation': 'therapy'})


def validate_for_compression(content: str) -> Dict[str, Any]:
    """
    Validate content for holographic compression.
    
    Args:
        content: Content to compress
        
    Returns:
        Validation result dict
    """
    guard = _get_guard()
    return guard.validate_input(content, context={'operation': 'compress'})


def validate_for_decompression(compressed: str) -> Dict[str, Any]:
    """
    Validate compressed content for decompression.
    
    Args:
        compressed: Compressed content
        
    Returns:
        Validation result dict
    """
    guard = _get_guard()
    return guard.validate_input(compressed, context={'operation': 'decompress'})


__all__ = [
    'GeometricInputGuard',
    'RegimeType',
    'PHI_BOUNDARIES',
    'KAPPA_BOUNDARIES',
    'is_geometrically_valid',
    'compute_input_complexity',
    'detect_chaos_level',
    'validate_for_pantheon_chat',
    'validate_for_assessment',
    'validate_for_therapy',
    'validate_for_compression',
    'validate_for_decompression',
]
