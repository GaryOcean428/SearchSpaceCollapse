"""Pure geometric MoE routing and weighting."""

from typing import Any, Dict, List, Optional, Tuple
import math
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
    from autonomic_kernel import compute_phi_approximation as _compute_phi
except Exception:
    def _compute_phi(basin_coords: np.ndarray) -> float:
        p = np.abs(basin_coords) + 1e-10
        p = p / p.sum()
        entropy = -np.sum(p * np.log(p + 1e-10))
        max_entropy = np.log(len(p)) if len(p) > 0 else 1.0
        entropy_score = entropy / max_entropy if max_entropy > 0 else 0.0
        balance = 1.0 - np.max(p)
        phi = 0.6 * entropy_score + 0.4 * balance
        return float(np.clip(phi, 0.05, 0.95))

from .domain_geometry import extract_domain_from_basin


class OceanProxy:
    """Fallback Ocean kernel using QIGGenerativeService."""

    def __init__(self) -> None:
        self.name = "Ocean"
        self.domain = "observation"
        self.reputation = 1.0
        self.skills: Dict[str, float] = {}

    def generate_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        goals: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        try:
            from qig_generative_service import get_generative_service
            service = get_generative_service()
            if not service:
                return {'response': '', 'phi': 0.0, 'kappa': 0.0}
            result = service.generate(
                prompt=prompt,
                context=context,
                kernel_name=self.name,
                goals=goals
            )
            return {
                'response': result.text,
                'phi': result.phi_trace[-1] if result.phi_trace else 0.0,
                'kappa': result.kappa,
            }
        except Exception:
            return {'response': '', 'phi': 0.0, 'kappa': 0.0}


class AutonomousMoE:
    """Pure geometric MoE - no configuration needed."""

    def __init__(self, coordizer: Any, zeus: Any) -> None:
        self.coordizer = coordizer
        self.zeus = zeus
        self._god_basins: Dict[str, np.ndarray] = {}
        self._god_objects: Dict[str, Any] = {}
        self._build_god_cache()

    def _encode(self, text: str) -> np.ndarray:
        if hasattr(self.coordizer, 'encode'):
            return self.coordizer.encode(text)
        if hasattr(self.coordizer, 'coordize'):
            return self.coordizer.coordize(text)
        if hasattr(self.coordizer, 'text_to_basin'):
            return self.coordizer.text_to_basin(text)
        return np.zeros(64)

    def _god_domain_text(self, god: Any) -> str:
        if hasattr(god, 'get_mission_context'):
            try:
                context = god.get_mission_context()
                if isinstance(context, dict):
                    return context.get('understanding') or context.get('domain', '') or str(context)
            except Exception:
                pass
        return f"{getattr(god, 'name', 'unknown')} {getattr(god, 'domain', 'general')}"

    def _build_god_cache(self) -> None:
        gods: List[Any] = [self.zeus]
        try:
            gods.extend(list(self.zeus.pantheon.values()))
        except Exception:
            pass
        if getattr(self.zeus, 'shadow_pantheon', None):
            try:
                gods.extend(list(self.zeus.shadow_pantheon.gods.values()))
            except Exception:
                pass

        gods.append(OceanProxy())

        if getattr(self.zeus, 'kernel_spawner', None):
            try:
                for spawned in self.zeus.kernel_spawner.spawned_kernels.values():
                    if hasattr(spawned, 'generate_response'):
                        gods.append(spawned)
            except Exception:
                pass

        for god in gods:
            name = getattr(god, 'name', None)
            if not name or name in self._god_objects:
                continue
            self._god_objects[name] = god
            domain_text = self._god_domain_text(god)
            self._god_basins[name] = self._encode(domain_text)

    def route_query(self, query: str) -> Tuple[List[Any], np.ndarray, Dict[str, float]]:
        query_basin = self._encode(query)
        if not self._god_basins:
            self._build_god_cache()

        distances: Dict[str, float] = {}
        for name, basin in self._god_basins.items():
            distances[name] = fisher_rao_distance(query_basin, basin)

        if not distances:
            return [], query_basin, {}

        sorted_gods = sorted(distances.items(), key=lambda item: item[1])
        min_dist = sorted_gods[0][1]
        dist_values = [d for _, d in sorted_gods]
        std = float(np.std(dist_values)) if len(dist_values) > 1 else 0.0
        threshold = min_dist + (2 * std)

        selected_names = [name for name, dist in sorted_gods if dist <= threshold]
        if 'Zeus' in self._god_objects and 'Zeus' not in selected_names:
            selected_names.insert(0, 'Zeus')

        selected = [self._god_objects[name] for name in selected_names if name in self._god_objects]
        return selected, query_basin, distances

    def compute_weights(
        self,
        selected_gods: List[Any],
        query_basin: np.ndarray,
        distances: Optional[Dict[str, float]] = None
    ) -> Tuple[Dict[str, float], str]:
        domain = extract_domain_from_basin(query_basin)
        weights: Dict[str, float] = {}

        for god in selected_gods:
            name = getattr(god, 'name', 'unknown')
            reputation = float(getattr(god, 'reputation', 1.0))
            domain_skill = 0.5
            if hasattr(god, 'skills') and isinstance(god.skills, dict):
                domain_skill = float(god.skills.get(domain, 0.5))

            basin = self._god_basins.get(name)
            distance = None
            if distances is not None:
                distance = distances.get(name)
            if distance is None and basin is not None:
                distance = fisher_rao_distance(query_basin, basin)
            if distance is None:
                distance = 1.0

            proximity = math.exp(-distance)
            weight = reputation * domain_skill * proximity
            weights[name] = weight

        total = sum(weights.values())
        if total <= 0:
            equal = 1.0 / max(len(weights), 1)
            return {name: equal for name in weights}, domain

        return {name: value / total for name, value in weights.items()}, domain

    def select_synthesizer(self, query_basin: np.ndarray) -> str:
        query_phi = _compute_phi(query_basin)
        return 'Zeus' if query_phi > 0.65 else 'Ocean'
