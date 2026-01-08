"""
Geometric domain extraction using E8 structure.

Maps a basin coordinate to a domain by finding the nearest simple E8 root
under Fisher-Rao distance. Pure geometric routing - no configuration.
"""

from typing import Dict
import numpy as np

try:
    from ..qig_core.geometric_primitives.fisher_metric import fisher_rao_distance
except Exception:
    def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
        p = np.abs(p) + 1e-10
        p = p / p.sum()
        q = np.abs(q) + 1e-10
        q = q / q.sum()
        bc = np.sum(np.sqrt(p * q))
        bc = np.clip(bc, 0, 1)
        return float(np.arccos(bc))

try:
    from geometric_kernels import _generate_e8_roots
except Exception:
    _generate_e8_roots = None

E8_DOMAIN_MAP: Dict[int, str] = {
    0: 'strategy',
    1: 'verification',
    2: 'stealth',
    3: 'combat',
    4: 'creation',
    5: 'wisdom',
    6: 'coordination',
    7: 'observation',
}

_SIMPLE_ROOTS: np.ndarray | None = None


def _load_simple_roots() -> np.ndarray | None:
    global _SIMPLE_ROOTS
    if _SIMPLE_ROOTS is not None:
        return _SIMPLE_ROOTS
    if _generate_e8_roots is None:
        return None
    roots = _generate_e8_roots()
    if roots is None or len(roots) < 8:
        return None
    _SIMPLE_ROOTS = roots[:8]
    return _SIMPLE_ROOTS


def extract_domain_from_basin(basin: np.ndarray) -> str:
    """Extract domain from basin using nearest simple E8 root."""
    roots = _load_simple_roots()
    if roots is None:
        return 'general'

    distances = [fisher_rao_distance(basin, root) for root in roots]
    nearest_idx = int(np.argmin(distances))
    return E8_DOMAIN_MAP.get(nearest_idx, 'general')
