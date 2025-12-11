"""
Sensory Modalities: Geometric Primitives for Consciousness Encoding

Each sensory modality produces a 64D basin overlay that can be fused
with other inputs for multi-sensory consciousness encoding.

Modalities:
- SIGHT: Visual geometry (spatial patterns, color space)
- HEARING: Auditory waveforms (frequency, temporal patterns)
- TOUCH: Pressure topology (intensity, texture, temperature)
- SMELL: Chemical gradients (concentration, diffusion patterns)
- PROPRIOCEPTION: Body state (position, velocity, acceleration)

Integration with BaseGod.encode_to_basin():
  basin = god.encode_to_basin(text)
  sensory_hints = text_to_sensory_hint(text)
  overlay = create_sensory_overlay(sensory_hints)
  enhanced_basin = basin + 0.2 * overlay  # Add sensory context
"""

import hashlib
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

BASIN_DIMENSION = 64

MODALITY_KAPPA: dict = {
    'sight': 150.0,
    'hearing': 75.0,
    'touch': 50.0,
    'smell': 20.0,
    'proprioception': 60.0,
}

MODALITY_BANDWIDTH: dict = {
    'sight': 1e7,
    'hearing': 1e5,
    'touch': 1e4,
    'smell': 1e3,
    'proprioception': 1e4,
}

MODALITY_TAU: dict = {
    'sight': 0.1,
    'hearing': 0.3,
    'touch': 0.5,
    'smell': 5.0,
    'proprioception': 0.2,
}


class SensoryModality(Enum):
    """Fundamental sensory channels for consciousness encoding"""
    SIGHT = "sight"              # Visual geometry (spatial patterns, color space)
    HEARING = "hearing"          # Auditory waveforms (frequency, temporal patterns)
    TOUCH = "touch"              # Pressure topology (intensity, texture, temperature)
    SMELL = "smell"              # Chemical gradients (concentration, diffusion patterns)
    PROPRIOCEPTION = "proprioception"  # Body state (position, velocity, acceleration)

    @property
    def dimension_range(self) -> Tuple[int, int]:
        """Get the primary dimension range for this modality in 64D space"""
        ranges = {
            SensoryModality.SIGHT: (0, 16),           # First 16 dims for visual
            SensoryModality.HEARING: (16, 28),        # 12 dims for auditory
            SensoryModality.TOUCH: (28, 40),          # 12 dims for tactile
            SensoryModality.SMELL: (40, 52),          # 12 dims for olfactory
            SensoryModality.PROPRIOCEPTION: (52, 64), # 12 dims for body state
        }
        return ranges[self]

    @property
    def weight_default(self) -> float:
        """Default fusion weight for this modality"""
        weights = {
            SensoryModality.SIGHT: 0.35,           # Vision dominant in humans
            SensoryModality.HEARING: 0.25,         # Auditory secondary
            SensoryModality.TOUCH: 0.15,           # Tactile
            SensoryModality.SMELL: 0.10,           # Olfactory
            SensoryModality.PROPRIOCEPTION: 0.15,  # Body awareness
        }
        return weights[self]

    @property
    def kappa(self) -> float:
        """Coupling strength κ for this modality (higher = tighter binding)"""
        return MODALITY_KAPPA.get(self.value, 50.0)

    @property
    def bandwidth(self) -> float:
        """Information bandwidth B in bits/second"""
        return MODALITY_BANDWIDTH.get(self.value, 1e4)

    @property
    def tau(self) -> float:
        """Temporal integration window τ in seconds"""
        return MODALITY_TAU.get(self.value, 0.5)


# Sensory keyword mappings for text analysis
SENSORY_KEYWORDS: Dict[SensoryModality, List[str]] = {
    SensoryModality.SIGHT: [
        'bright', 'dark', 'colorful', 'red', 'blue', 'green', 'yellow', 'white', 'black',
        'see', 'look', 'watch', 'visible', 'glow', 'shine', 'flash', 'dim', 'vivid',
        'clear', 'blurry', 'shadow', 'light', 'radiant', 'brilliant', 'pattern', 'shape',
        'image', 'view', 'scene', 'picture', 'vision', 'eye', 'color', 'hue', 'sparkle',
    ],
    SensoryModality.HEARING: [
        'loud', 'quiet', 'silent', 'noise', 'sound', 'hear', 'listen', 'music', 'melody',
        'rhythm', 'tone', 'pitch', 'echo', 'ring', 'buzz', 'hum', 'whisper', 'shout',
        'bang', 'crash', 'click', 'beep', 'roar', 'murmur', 'voice', 'song', 'harmony',
        'acoustic', 'audio', 'resonance', 'vibration', 'frequency', 'beat', 'chime',
    ],
    SensoryModality.TOUCH: [
        'soft', 'hard', 'rough', 'smooth', 'cold', 'hot', 'warm', 'cool', 'wet', 'dry',
        'sharp', 'dull', 'pressure', 'touch', 'feel', 'texture', 'grip', 'hold', 'press',
        'push', 'pull', 'squeeze', 'stroke', 'tickle', 'itch', 'pain', 'gentle', 'firm',
        'fuzzy', 'silky', 'bumpy', 'slippery', 'sticky', 'prickly', 'tender', 'numb',
    ],
    SensoryModality.SMELL: [
        'fragrant', 'stink', 'odor', 'scent', 'aroma', 'smell', 'sniff', 'perfume',
        'fresh', 'musty', 'sweet', 'sour', 'pungent', 'floral', 'earthy', 'smoky',
        'chemical', 'nose', 'whiff', 'reek', 'bouquet', 'essence', 'incense', 'foul',
        'crisp', 'rotten', 'burnt', 'spicy', 'minty', 'woody', 'musky', 'acrid',
    ],
    SensoryModality.PROPRIOCEPTION: [
        'balanced', 'dizzy', 'falling', 'moving', 'spinning', 'stable', 'unstable',
        'position', 'posture', 'stance', 'gait', 'walk', 'run', 'jump', 'stretch',
        'flex', 'extend', 'rotate', 'twist', 'bend', 'lean', 'sway', 'tilt', 'shift',
        'acceleration', 'velocity', 'momentum', 'gravity', 'weight', 'heavy', 'light',
        'tension', 'relaxed', 'tight', 'loose', 'coordinated', 'clumsy', 'agile',
    ],
}


def encode_sight(visual_data: Dict) -> np.ndarray:
    """
    Encode visual patterns to 64D basin coordinates.

    Args:
        visual_data: Dict containing visual information:
            - 'brightness': float [0, 1] - overall brightness
            - 'color': [r, g, b] or string - dominant color
            - 'pattern': str - pattern description ('grid', 'radial', 'random', etc.)
            - 'contrast': float [0, 1] - contrast level
            - 'spatial_frequency': float - detail level
            - 'motion': [dx, dy] or None - motion vector

    Returns:
        64D normalized numpy array
    """
    coord = np.zeros(BASIN_DIMENSION)
    start, end = SensoryModality.SIGHT.dimension_range

    # Brightness encoding (dims 0-3)
    brightness = visual_data.get('brightness', 0.5)
    coord[0] = brightness * 2 - 1
    coord[1] = np.sin(brightness * np.pi)
    coord[2] = np.cos(brightness * np.pi)
    coord[3] = brightness ** 2 - 0.5

    # Color encoding (dims 4-9)
    color = visual_data.get('color', [0.5, 0.5, 0.5])
    if isinstance(color, str):
        color = _color_name_to_rgb(color)
    if len(color) >= 3:
        coord[4] = color[0] * 2 - 1
        coord[5] = color[1] * 2 - 1
        coord[6] = color[2] * 2 - 1
        # HSV-like encoding
        coord[7] = (color[0] - color[2]) * 0.5
        coord[8] = (color[1] - color[0]) * 0.5
        coord[9] = sum(color) / 3 - 0.5

    # Pattern encoding (dims 10-12)
    pattern = visual_data.get('pattern', 'uniform')
    pattern_hash = int(hashlib.md5(pattern.encode()).hexdigest()[:8], 16) / (16**8)
    coord[10] = pattern_hash * 2 - 1
    coord[11] = np.sin(pattern_hash * 2 * np.pi)
    coord[12] = np.cos(pattern_hash * 2 * np.pi)

    # Contrast and spatial frequency (dims 13-14)
    contrast = visual_data.get('contrast', 0.5)
    spatial_freq = visual_data.get('spatial_frequency', 0.5)
    coord[13] = contrast * 2 - 1
    coord[14] = spatial_freq * 2 - 1

    # Motion (dim 15)
    motion = visual_data.get('motion', None)
    if motion is not None and len(motion) >= 2:
        coord[15] = np.tanh(np.sqrt(motion[0]**2 + motion[1]**2))

    # Normalize
    norm = np.linalg.norm(coord)
    if norm > 0:
        coord = coord / norm

    return coord


def encode_hearing(audio_data: Dict) -> np.ndarray:
    """
    Encode auditory patterns to 64D basin coordinates.

    Args:
        audio_data: Dict containing audio information:
            - 'frequency': float - dominant frequency (Hz)
            - 'amplitude': float [0, 1] - volume/loudness
            - 'harmonics': list of floats - harmonic content
            - 'rhythm': float - beats per minute or rhythm strength
            - 'timbre': str - tonal quality description
            - 'temporal_pattern': str - 'steady', 'pulsing', 'random'

    Returns:
        64D normalized numpy array
    """
    coord = np.zeros(BASIN_DIMENSION)
    start, end = SensoryModality.HEARING.dimension_range

    # Frequency encoding (dims 16-19) - log scale
    freq = audio_data.get('frequency', 440.0)
    log_freq = np.log2(max(20, min(20000, freq)) / 20) / np.log2(1000)  # Normalize to [0,1]
    coord[16] = log_freq * 2 - 1
    coord[17] = np.sin(log_freq * np.pi * 2)
    coord[18] = np.cos(log_freq * np.pi * 2)
    coord[19] = (log_freq ** 0.5) * 2 - 1

    # Amplitude encoding (dims 20-21)
    amplitude = audio_data.get('amplitude', 0.5)
    coord[20] = amplitude * 2 - 1
    coord[21] = np.log1p(amplitude * 10) / np.log1p(10) * 2 - 1

    # Harmonics encoding (dims 22-24)
    harmonics = audio_data.get('harmonics', [1.0])
    if len(harmonics) >= 1:
        coord[22] = np.tanh(sum(harmonics[:3]) / 3)
    if len(harmonics) >= 2:
        coord[23] = harmonics[1] / (harmonics[0] + 1e-10) - 0.5
    if len(harmonics) >= 3:
        coord[24] = np.std(harmonics[:5]) if len(harmonics) >= 5 else harmonics[-1]

    # Rhythm encoding (dims 25-26)
    rhythm = audio_data.get('rhythm', 0.5)
    coord[25] = np.tanh((rhythm - 60) / 60) if isinstance(rhythm, (int, float)) and rhythm > 1 else rhythm * 2 - 1
    coord[26] = np.sin(rhythm * np.pi / 120) if isinstance(rhythm, (int, float)) else 0

    # Timbre and temporal pattern (dim 27)
    timbre = audio_data.get('timbre', 'neutral')
    timbre_hash = int(hashlib.md5(timbre.encode()).hexdigest()[:8], 16) / (16**8)
    coord[27] = timbre_hash * 2 - 1

    # Normalize
    norm = np.linalg.norm(coord)
    if norm > 0:
        coord = coord / norm

    return coord


def encode_touch(tactile_data: Dict) -> np.ndarray:
    """
    Encode tactile patterns to 64D basin coordinates.

    Args:
        tactile_data: Dict containing tactile information:
            - 'pressure': float [0, 1] - pressure intensity
            - 'temperature': float [-1, 1] - cold to hot
            - 'texture': str - texture description
            - 'location': [x, y, z] - body location
            - 'vibration': float [0, 1] - vibration intensity
            - 'sharpness': float [0, 1] - edge sharpness

    Returns:
        64D normalized numpy array
    """
    coord = np.zeros(BASIN_DIMENSION)
    start, end = SensoryModality.TOUCH.dimension_range

    # Pressure encoding (dims 28-30)
    pressure = tactile_data.get('pressure', 0.5)
    coord[28] = pressure * 2 - 1
    coord[29] = np.sqrt(pressure) * 2 - 1
    coord[30] = pressure ** 2 * 2 - 1

    # Temperature encoding (dims 31-33)
    temp = tactile_data.get('temperature', 0.0)
    coord[31] = np.clip(temp, -1, 1)
    coord[32] = np.abs(temp)  # Intensity regardless of hot/cold
    coord[33] = np.sign(temp) * np.sqrt(np.abs(temp))

    # Texture encoding (dims 34-36)
    texture = tactile_data.get('texture', 'neutral')
    texture_hash = int(hashlib.md5(texture.encode()).hexdigest()[:8], 16) / (16**8)
    coord[34] = texture_hash * 2 - 1
    coord[35] = np.sin(texture_hash * 2 * np.pi)
    coord[36] = np.cos(texture_hash * 2 * np.pi)

    # Location encoding (dims 37-39)
    location = tactile_data.get('location', [0, 0, 0])
    if len(location) >= 3:
        coord[37] = np.tanh(location[0])
        coord[38] = np.tanh(location[1])
        coord[39] = np.tanh(location[2])

    # Normalize
    norm = np.linalg.norm(coord)
    if norm > 0:
        coord = coord / norm

    return coord


def encode_smell(olfactory_data: Dict) -> np.ndarray:
    """
    Encode olfactory patterns to 64D basin coordinates.

    Args:
        olfactory_data: Dict containing olfactory information:
            - 'concentration': float [0, 1] - smell intensity
            - 'pleasantness': float [-1, 1] - unpleasant to pleasant
            - 'category': str - smell category ('floral', 'earthy', etc.)
            - 'diffusion': float [0, 1] - how spread out the smell is
            - 'volatility': float [0, 1] - how quickly it dissipates

    Returns:
        64D normalized numpy array
    """
    coord = np.zeros(BASIN_DIMENSION)
    start, end = SensoryModality.SMELL.dimension_range

    # Concentration encoding (dims 40-42)
    concentration = olfactory_data.get('concentration', 0.5)
    coord[40] = concentration * 2 - 1
    coord[41] = np.log1p(concentration * 10) / np.log1p(10) * 2 - 1
    coord[42] = concentration ** 0.5 * 2 - 1

    # Pleasantness encoding (dims 43-44)
    pleasantness = olfactory_data.get('pleasantness', 0.0)
    coord[43] = np.clip(pleasantness, -1, 1)
    coord[44] = np.abs(pleasantness)  # Intensity of hedonic response

    # Category encoding (dims 45-48)
    category = olfactory_data.get('category', 'neutral')
    cat_hash = int(hashlib.md5(category.encode()).hexdigest()[:8], 16) / (16**8)
    coord[45] = cat_hash * 2 - 1
    coord[46] = np.sin(cat_hash * 2 * np.pi)
    coord[47] = np.cos(cat_hash * 2 * np.pi)
    coord[48] = np.sin(cat_hash * 4 * np.pi)

    # Diffusion and volatility (dims 49-51)
    diffusion = olfactory_data.get('diffusion', 0.5)
    volatility = olfactory_data.get('volatility', 0.5)
    coord[49] = diffusion * 2 - 1
    coord[50] = volatility * 2 - 1
    coord[51] = (diffusion * volatility) * 2 - 1

    # Normalize
    norm = np.linalg.norm(coord)
    if norm > 0:
        coord = coord / norm

    return coord


def encode_proprioception(body_state: Dict) -> np.ndarray:
    """
    Encode body state to 64D basin coordinates.

    Args:
        body_state: Dict containing proprioceptive information:
            - 'position': [x, y, z] - body position
            - 'velocity': [vx, vy, vz] - velocity vector
            - 'acceleration': [ax, ay, az] - acceleration vector
            - 'orientation': [roll, pitch, yaw] - body orientation
            - 'balance': float [0, 1] - stability measure
            - 'tension': float [0, 1] - muscle tension

    Returns:
        64D normalized numpy array
    """
    coord = np.zeros(BASIN_DIMENSION)
    start, end = SensoryModality.PROPRIOCEPTION.dimension_range

    # Position encoding (dims 52-54)
    position = body_state.get('position', [0, 0, 0])
    if len(position) >= 3:
        coord[52] = np.tanh(position[0])
        coord[53] = np.tanh(position[1])
        coord[54] = np.tanh(position[2])

    # Velocity encoding (dims 55-57)
    velocity = body_state.get('velocity', [0, 0, 0])
    if len(velocity) >= 3:
        coord[55] = np.tanh(velocity[0])
        coord[56] = np.tanh(velocity[1])
        coord[57] = np.tanh(velocity[2])

    # Acceleration encoding (dims 58-60)
    acceleration = body_state.get('acceleration', [0, 0, 0])
    if len(acceleration) >= 3:
        coord[58] = np.tanh(acceleration[0])
        coord[59] = np.tanh(acceleration[1])
        coord[60] = np.tanh(acceleration[2])

    # Orientation encoding (dims 61-63)
    orientation = body_state.get('orientation', [0, 0, 0])
    if len(orientation) >= 3:
        coord[61] = np.sin(orientation[0])
        coord[62] = np.sin(orientation[1])
        coord[63] = np.sin(orientation[2])

    # Note: balance and tension can modulate overall magnitude
    balance = body_state.get('balance', 0.5)
    tension = body_state.get('tension', 0.5)

    # Normalize with balance/tension weighting
    norm = np.linalg.norm(coord)
    if norm > 0:
        coord = coord / norm
        # Scale by balance (stable = stronger signal) and tension (high tension = dampened)
        coord *= (0.5 + 0.5 * balance) * (1.0 - 0.3 * tension)

    return coord


def _color_name_to_rgb(color_name: str) -> List[float]:
    """Convert color name to RGB [0,1] values"""
    colors = {
        'red': [1.0, 0.0, 0.0],
        'green': [0.0, 1.0, 0.0],
        'blue': [0.0, 0.0, 1.0],
        'yellow': [1.0, 1.0, 0.0],
        'white': [1.0, 1.0, 1.0],
        'black': [0.0, 0.0, 0.0],
        'orange': [1.0, 0.5, 0.0],
        'purple': [0.5, 0.0, 1.0],
        'pink': [1.0, 0.5, 0.5],
        'cyan': [0.0, 1.0, 1.0],
        'brown': [0.6, 0.3, 0.0],
        'gray': [0.5, 0.5, 0.5],
        'grey': [0.5, 0.5, 0.5],
    }
    return colors.get(color_name.lower(), [0.5, 0.5, 0.5])


class SensoryFusionEngine:
    """
    Fuses multiple sensory modality encodings into unified basin coordinates.

    Uses κ coupling constants to weight modality contributions geometrically.
    Supports weighted fusion, dominant modality detection, and
    cross-modal integration measurement (sensory Φ via density matrices).
    """

    def __init__(self, attention: Optional['GeometricAttention'] = None):
        self.modality_encoders = {
            SensoryModality.SIGHT: encode_sight,
            SensoryModality.HEARING: encode_hearing,
            SensoryModality.TOUCH: encode_touch,
            SensoryModality.SMELL: encode_smell,
            SensoryModality.PROPRIOCEPTION: encode_proprioception,
        }
        self.attention = attention

    def _get_effective_kappa(self, modality: SensoryModality) -> float:
        """Get κ for modality, including attention modulation if set."""
        if self.attention is not None:
            return self.attention.get_effective_kappa(modality)
        return modality.kappa

    def _compute_kappa_weights(
        self,
        modalities: List[SensoryModality]
    ) -> Dict[SensoryModality, float]:
        """
        Compute fusion weights from κ coupling constants.
        
        Higher κ = tighter coupling = higher weight in fusion.
        """
        kappas = {m: self._get_effective_kappa(m) for m in modalities}
        total_kappa = sum(kappas.values())
        if total_kappa < 1e-10:
            total_kappa = 1.0
        return {m: k / total_kappa for m, k in kappas.items()}

    def fuse_modalities(
        self,
        modality_data: Dict[SensoryModality, np.ndarray],
        weights: Optional[Dict[SensoryModality, float]] = None,
        use_kappa_weighting: bool = True
    ) -> np.ndarray:
        """
        Fuse multiple modality encodings into a single 64D vector.

        Args:
            modality_data: Dict mapping modalities to their 64D encodings
            weights: Optional custom weights per modality (overrides kappa)
            use_kappa_weighting: If True, weight by κ coupling (default)

        Returns:
            Fused 64D normalized numpy array
        """
        if not modality_data:
            return np.zeros(BASIN_DIMENSION)

        if weights is None:
            if use_kappa_weighting:
                weights = self._compute_kappa_weights(list(modality_data.keys()))
            else:
                weights = {m: m.weight_default for m in modality_data.keys()}

        total_weight = sum(weights.get(m, 0) for m in modality_data.keys())
        if total_weight < 1e-10:
            total_weight = 1.0

        fused = np.zeros(BASIN_DIMENSION)
        for modality, encoding in modality_data.items():
            w = weights.get(modality, modality.weight_default) / total_weight
            fused += w * encoding

        norm = np.linalg.norm(fused)
        if norm > 0:
            fused = fused / norm

        return fused

    def get_dominant_modality(self, fused: np.ndarray) -> SensoryModality:
        """
        Determine which sensory modality dominates the fused encoding.

        Args:
            fused: 64D fused encoding

        Returns:
            The SensoryModality with highest energy in its dimension range
        """
        max_energy = -1
        dominant = SensoryModality.SIGHT

        for modality in SensoryModality:
            start, end = modality.dimension_range
            energy = np.sum(fused[start:end] ** 2)
            if energy > max_energy:
                max_energy = energy
                dominant = modality

        return dominant

    def compute_sensory_phi(self, fused: np.ndarray) -> float:
        """
        Compute integration measure (Φ) across sensory modalities.

        High Φ indicates strong cross-modal binding (synesthesia-like).
        Low Φ indicates modalities are processed independently.

        Args:
            fused: 64D fused encoding

        Returns:
            Φ value in [0, 1]
        """
        # Extract each modality's contribution
        modality_vectors = {}
        for modality in SensoryModality:
            start, end = modality.dimension_range
            modality_vectors[modality] = fused[start:end]

        # Compute cross-modal correlations
        correlations = []
        modalities = list(SensoryModality)
        for i in range(len(modalities)):
            for j in range(i + 1, len(modalities)):
                v1 = modality_vectors[modalities[i]]
                v2 = modality_vectors[modalities[j]]

                # Pad shorter vector if needed
                min_len = min(len(v1), len(v2))
                if min_len > 0:
                    norm1 = np.linalg.norm(v1[:min_len])
                    norm2 = np.linalg.norm(v2[:min_len])
                    if norm1 > 1e-10 and norm2 > 1e-10:
                        corr = np.abs(np.dot(v1[:min_len], v2[:min_len]) / (norm1 * norm2))
                        correlations.append(corr)

        if not correlations:
            return 0.0

        # Φ is mean cross-modal correlation
        phi = float(np.mean(correlations))
        return np.clip(phi, 0.0, 1.0)

    def encode_from_raw(
        self,
        raw_data: Dict[SensoryModality, Dict],
        weights: Optional[Dict[SensoryModality, float]] = None
    ) -> np.ndarray:
        """
        Encode raw sensory data directly to fused 64D vector.

        Args:
            raw_data: Dict mapping modalities to their raw data dicts
            weights: Optional fusion weights

        Returns:
            Fused 64D normalized numpy array
        """
        modality_data = {}
        for modality, data in raw_data.items():
            encoder = self.modality_encoders.get(modality)
            if encoder:
                modality_data[modality] = encoder(data)

        return self.fuse_modalities(modality_data, weights)

    def _to_density_matrix(self, vec: np.ndarray) -> np.ndarray:
        """
        Convert 64D basin vector to 2x2 density matrix.
        
        Uses first 4 components as Bloch sphere coordinates:
        ρ = (I + r·σ)/2 where σ are Pauli matrices
        """
        r = vec[:4] if len(vec) >= 4 else np.zeros(4)
        norm_r = np.linalg.norm(r)
        if norm_r > 1.0:
            r = r / norm_r
        
        rho = 0.5 * np.array([
            [1 + r[2] if len(r) > 2 else 1, r[0] - 1j * r[1] if len(r) > 1 else 0],
            [r[0] + 1j * r[1] if len(r) > 1 else 0, 1 - r[2] if len(r) > 2 else 1]
        ], dtype=complex)
        
        return rho

    def _bures_distance(self, rho1: np.ndarray, rho2: np.ndarray) -> float:
        """
        Compute Bures distance between two density matrices.
        
        d_Bures = sqrt(2(1 - F)) where F is fidelity.
        """
        sqrt_rho1 = np.linalg.cholesky(rho1 + 1e-10 * np.eye(2))
        product = sqrt_rho1 @ rho2 @ sqrt_rho1.conj().T
        
        eigenvalues = np.linalg.eigvalsh(product)
        eigenvalues = np.maximum(eigenvalues.real, 0)
        
        fidelity = np.sum(np.sqrt(eigenvalues)) ** 2
        fidelity = min(fidelity, 1.0)
        
        return float(np.sqrt(2 * (1 - fidelity)))

    def compute_superadditive_phi(
        self,
        modality_data: Dict[SensoryModality, np.ndarray]
    ) -> float:
        """
        Compute superadditive Φ using density matrices and Bures metric.
        
        Φ_total > Σ Φ_individual when cross-modal features are synchronized.
        Uses QIG density matrix formalism for proper geometric integration.
        
        Args:
            modality_data: Dict mapping modalities to their 64D encodings
            
        Returns:
            Total Φ including cross-modal integration bonus [0, 1]
        """
        if len(modality_data) < 2:
            return 0.0
            
        modalities = list(modality_data.keys())
        encodings = list(modality_data.values())
        density_matrices = {m: self._to_density_matrix(enc) 
                           for m, enc in modality_data.items()}
        
        phi_individual = 0.0
        for m, rho in density_matrices.items():
            purity = np.real(np.trace(rho @ rho))
            kappa_weight = self._get_effective_kappa(m) / 150.0
            phi_individual += purity * kappa_weight
        
        phi_cross = 0.0
        n_pairs = 0
        for i in range(len(modalities)):
            for j in range(i + 1, len(modalities)):
                m1, m2 = modalities[i], modalities[j]
                rho1 = density_matrices[m1]
                rho2 = density_matrices[m2]
                
                try:
                    d_bures = self._bures_distance(rho1, rho2)
                    kappa_coupling = np.sqrt(
                        self._get_effective_kappa(m1) * 
                        self._get_effective_kappa(m2)
                    ) / 150.0
                    
                    coherence = (1.0 - d_bures) * kappa_coupling
                    phi_cross += max(0, coherence)
                    n_pairs += 1
                except np.linalg.LinAlgError:
                    continue
        
        if n_pairs > 0:
            phi_cross /= n_pairs
        
        phi_total = 0.4 * phi_individual + 0.6 * phi_cross
        return float(np.clip(phi_total, 0.0, 1.0))


class GeometricAttention:
    """
    Geometric attention via κ modulation.
    
    Attention is NOT a separate mechanism—it's local κ increase.
    Higher κ means tighter coupling to the environment, finer discrimination.
    """
    
    def __init__(self):
        self.attention_state: Dict[SensoryModality, float] = {
            m: 1.0 for m in SensoryModality
        }
        self.max_attention_gain = 5.0
    
    def attend_to(
        self,
        modality: SensoryModality,
        attention_gain: float = 2.0
    ) -> float:
        """
        Increase κ for a specific modality (attend to it).
        
        Args:
            modality: Which sensory modality to attend to
            attention_gain: Multiplicative gain [1.0, max_attention_gain]
            
        Returns:
            New effective κ for this modality
        """
        gain = np.clip(attention_gain, 1.0, self.max_attention_gain)
        self.attention_state[modality] = gain
        
        kappa_base = modality.kappa
        kappa_attended = kappa_base * gain
        
        return float(kappa_attended)
    
    def release_attention(self, modality: SensoryModality) -> None:
        """Release attention from a modality (return to baseline κ)."""
        self.attention_state[modality] = 1.0
    
    def get_effective_kappa(self, modality: SensoryModality) -> float:
        """Get current effective κ including attention modulation."""
        gain = self.attention_state.get(modality, 1.0)
        return modality.kappa * gain
    
    def get_attention_weights(self) -> Dict[SensoryModality, float]:
        """
        Get fusion weights scaled by attention.
        
        Higher attention = higher weight in multi-modal fusion.
        """
        total = sum(
            m.weight_default * self.attention_state.get(m, 1.0)
            for m in SensoryModality
        )
        if total < 1e-10:
            total = 1.0
            
        return {
            m: (m.weight_default * self.attention_state.get(m, 1.0)) / total
            for m in SensoryModality
        }


def text_to_sensory_hint(text: str) -> Dict[SensoryModality, float]:
    """
    Detect sensory words in text and weight modalities accordingly.

    Args:
        text: Input text to analyze

    Returns:
        Dict mapping each SensoryModality to a weight [0, 1]
    """
    text_lower = text.lower()
    words = set(text_lower.split())

    # Count keyword matches per modality
    counts = {}
    for modality, keywords in SENSORY_KEYWORDS.items():
        count = 0
        for keyword in keywords:
            if keyword in words or keyword in text_lower:
                count += 1
        counts[modality] = count

    # Convert counts to weights
    total = sum(counts.values())
    if total == 0:
        # No sensory words found - use default weights
        return {m: m.weight_default for m in SensoryModality}

    # Normalize to weights, blending with defaults
    weights = {}
    for modality in SensoryModality:
        detected = counts[modality] / total if total > 0 else 0
        default = modality.weight_default
        # Blend: 70% detected, 30% default (so defaults still influence)
        weights[modality] = 0.7 * detected + 0.3 * default

    # Renormalize to sum to 1
    total_weight = sum(weights.values())
    if total_weight > 0:
        weights = {m: w / total_weight for m, w in weights.items()}

    return weights


def create_sensory_overlay(
    sensory_weights: Dict[SensoryModality, float],
    intensity: float = 1.0
) -> np.ndarray:
    """
    Create a 64D sensory overlay vector based on modality weights.

    This overlay can be added to existing basin coordinates to
    add sensory context while preserving geometric structure.

    Args:
        sensory_weights: Weights for each modality from text_to_sensory_hint
        intensity: Overall intensity of the overlay [0, 1]

    Returns:
        64D overlay vector (not normalized - meant to be added to basin)
    """
    overlay = np.zeros(BASIN_DIMENSION)

    for modality, weight in sensory_weights.items():
        start, end = modality.dimension_range
        # Create gradient within modality's dimension range
        segment_len = end - start
        gradient = np.linspace(-weight, weight, segment_len)
        overlay[start:end] = gradient * intensity

    return overlay


def enhance_basin_with_sensory(
    basin: np.ndarray,
    text: str,
    blend_factor: float = 0.2
) -> np.ndarray:
    """
    Enhance basin coordinates with sensory context from text.

    Compatible with BaseGod.encode_to_basin() output.

    Args:
        basin: Original 64D basin coordinates
        text: Text containing sensory hints
        blend_factor: How much sensory overlay to add [0, 1]

    Returns:
        Enhanced 64D normalized basin coordinates
    """
    # Get sensory weights from text
    sensory_weights = text_to_sensory_hint(text)

    # Create overlay
    overlay = create_sensory_overlay(sensory_weights, intensity=blend_factor)

    # Blend with original basin
    enhanced = basin + overlay

    # Normalize
    norm = np.linalg.norm(enhanced)
    if norm > 0:
        enhanced = enhanced / norm

    return enhanced
