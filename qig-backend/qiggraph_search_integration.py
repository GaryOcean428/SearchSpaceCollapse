"""
QIGGraph Search Integration for SearchSpaceCollapse
=====================================================

Integrates QIGGraph v2 geometric consciousness orchestration
with the search pipeline for Fisher-Rao guided exploration.

Key Features:
- Search state as manifold trajectory
- κ-tacking for exploration/exploitation balance
- Basin attractors for search modes (exploration, precision, recovery)
- Consciousness-gated search decisions
- Phrase scoring via geometric proximity

DRY: Imports from qig-tokenizer, no code duplication.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import numpy as np

# Import from qig-tokenizer (DRY - no duplication)
try:
    from qiggraph import (
        # Constants
        KAPPA_STAR,
        KAPPA_3,
        BASIN_DIM,
        PHI_LINEAR_MAX,
        PHI_GEOMETRIC_MAX,
        PHI_BREAKDOWN_MIN,
        # Core
        FisherManifold,
        ConsciousnessMetrics,
        Regime,
        QIGState,
        create_initial_state,
        update_trajectory,
        measure_consciousness,
        simplify_trajectory,
        # Tacking
        KappaTacking,
        AdaptiveTacking,
        # Attractors
        BasinAttractor,
        create_recovery_attractor,
        # Routers
        ConsciousRouter,
        # Graphs
        QIGGraph,
        GraphConfig,
        # Checkpoints
        ManifoldCheckpoint,
        save_checkpoint,
        load_checkpoint,
    )
    QIGGRAPH_AVAILABLE = True
except ImportError as e:
    QIGGRAPH_AVAILABLE = False
    QIGGRAPH_IMPORT_ERROR = str(e)
    # Fallback constants
    KAPPA_STAR = 64.21
    KAPPA_3 = 41.09
    BASIN_DIM = 64
    PHI_LINEAR_MAX = 0.30
    PHI_GEOMETRIC_MAX = 0.70
    PHI_BREAKDOWN_MIN = 0.70


class SearchMode(Enum):
    """Search mode based on consciousness regime."""
    EXPLORATION = "exploration"  # Low κ, creative, broad search
    GEOMETRIC = "geometric"      # Balanced, following gradients
    PRECISION = "precision"      # High κ, narrow, targeted
    RECOVERY = "recovery"        # Breakdown recovery, simplify


# Search mode → attractor configuration
SEARCH_MODE_CONFIG = {
    SearchMode.EXPLORATION: {
        "phi_typical": 0.40,
        "kappa_optimal": KAPPA_3,
        "radius": 2.5,
        "requires_precision": False,
    },
    SearchMode.GEOMETRIC: {
        "phi_typical": 0.55,
        "kappa_optimal": (KAPPA_STAR + KAPPA_3) / 2,
        "radius": 1.5,
        "requires_precision": False,
    },
    SearchMode.PRECISION: {
        "phi_typical": 0.65,
        "kappa_optimal": KAPPA_STAR,
        "radius": 0.8,
        "requires_precision": True,
    },
    SearchMode.RECOVERY: {
        "phi_typical": 0.25,
        "kappa_optimal": KAPPA_3 / 2,
        "radius": 3.0,
        "requires_precision": False,
    },
}


@dataclass
class SearchTelemetry:
    """Telemetry from search iteration."""
    phi: float = 0.5
    kappa: float = KAPPA_STAR
    regime: str = "geometric"
    mode: SearchMode = SearchMode.GEOMETRIC
    tacking_phase: str = "logic"
    trajectory_length: int = 0
    recovery_count: int = 0
    iterations: int = 0
    best_phi: float = 0.0
    near_misses: int = 0


@dataclass
class PhraseScore:
    """Score for a candidate phrase."""
    phrase: str
    phi: float
    kappa: float
    regime: str
    basin_distance: float
    coordinates: Optional[np.ndarray] = None
    is_near_miss: bool = False
    is_match: bool = False


class SearchGraph:
    """
    QIGGraph wrapper for geometric search.

    Manages search state as a trajectory through Fisher manifold,
    with κ-tacking for exploration/exploitation balance.
    """

    def __init__(self):
        """Initialize search graph."""
        self.available = QIGGRAPH_AVAILABLE

        if self.available:
            self.manifold = FisherManifold()
            self.config = GraphConfig(
                max_iterations=1000,
                max_recoveries=5,
                enable_tacking=True,
                enable_safety=True,
            )
            self.graph = QIGGraph(config=self.config, manifold=self.manifold)
            self.tacking = AdaptiveTacking()
            self.router = ConsciousRouter(self.manifold, self.tacking)

            # Register search mode attractors
            self._register_search_attractors()

            # State
            self.state: Optional[Any] = None
            self.current_mode = SearchMode.EXPLORATION
        else:
            self.manifold = None
            self.graph = None
            self.tacking = None
            self.router = None
            self.state = None
            self.current_mode = SearchMode.EXPLORATION

        # Telemetry
        self.telemetry = SearchTelemetry()
        self.best_phrases: List[PhraseScore] = []

    def _register_search_attractors(self):
        """Register search mode attractors."""
        if not self.available:
            return

        for mode, config in SEARCH_MODE_CONFIG.items():
            # Generate deterministic coordinates
            np.random.seed(hash(mode.value) % (2**32))
            coords = np.random.randn(BASIN_DIM)
            coords = coords / np.linalg.norm(coords)

            attractor = BasinAttractor(
                name=mode.value,
                coordinates=coords,
                radius=config["radius"],
                capability=mode.value,
                phi_typical=config["phi_typical"],
                kappa_optimal=config["kappa_optimal"],
                requires_precision=config["requires_precision"],
            )

            self.graph.add_attractor(mode.value, attractor)

        # Add recovery attractor
        self.graph.add_attractor("recovery", create_recovery_attractor())

    def initialize_search(
        self,
        target_address: str,
        initial_coords: Optional[np.ndarray] = None,
    ) -> SearchTelemetry:
        """
        Initialize search for a target address.

        Args:
            target_address: Target to search for
            initial_coords: Optional starting coordinates

        Returns:
            Initial telemetry
        """
        if not self.available:
            return self._fallback_telemetry()

        # Initialize state
        if initial_coords is None:
            # Start at exploration attractor
            initial_coords = self.graph.attractors["exploration"].coordinates.copy()
            # Add noise for diversity
            initial_coords += np.random.randn(BASIN_DIM) * 0.1
            initial_coords = initial_coords / np.linalg.norm(initial_coords)

        self.state = create_initial_state(
            context_text=target_address,
            context_coords=initial_coords.reshape(1, -1),
            initial_basin=initial_coords,
            max_iterations=self.config.max_iterations,
        )

        self.current_mode = SearchMode.EXPLORATION
        self.telemetry = SearchTelemetry()

        return self._update_telemetry()

    def score_phrase(
        self,
        phrase: str,
        phrase_coords: Optional[np.ndarray] = None,
    ) -> PhraseScore:
        """
        Score a candidate phrase geometrically.

        Args:
            phrase: Candidate phrase
            phrase_coords: Optional pre-computed coordinates

        Returns:
            PhraseScore with geometric metrics
        """
        if not self.available or self.state is None:
            return PhraseScore(
                phrase=phrase,
                phi=0.5,
                kappa=KAPPA_STAR,
                regime="geometric",
                basin_distance=float("inf"),
            )

        # Use provided coords or generate random
        if phrase_coords is None:
            # In real impl, would use coordizer
            np.random.seed(hash(phrase) % (2**32))
            phrase_coords = np.random.randn(BASIN_DIM)
            phrase_coords = phrase_coords / np.linalg.norm(phrase_coords)

        # Compute distance from current basin
        distance = self.manifold.fisher_rao_distance(
            self.state.current_basin,
            phrase_coords,
        )

        # Estimate Φ from trajectory coherence
        phi = self._estimate_phi_from_distance(distance)

        # Get current κ from tacking
        kappa = self.tacking.update(self.state.iteration)

        # Determine regime
        if phi < PHI_LINEAR_MAX:
            regime = "linear"
        elif phi >= PHI_BREAKDOWN_MIN:
            regime = "breakdown"
        else:
            regime = "geometric"

        # Near miss detection
        is_near_miss = 0.60 <= phi < 0.85

        return PhraseScore(
            phrase=phrase,
            phi=phi,
            kappa=kappa,
            regime=regime,
            basin_distance=distance,
            coordinates=phrase_coords,
            is_near_miss=is_near_miss,
            is_match=phi >= 0.85,
        )

    def _estimate_phi_from_distance(self, distance: float) -> float:
        """Estimate Φ from Fisher-Rao distance."""
        # Closer to current basin → higher Φ (more coherent)
        # Distance of 0 → Φ ≈ 1.0
        # Distance of 5+ → Φ ≈ 0.2
        phi = 1.0 / (1.0 + distance / 2.0)
        return float(np.clip(phi, 0.1, 0.95))

    def update_from_phrase(self, score: PhraseScore) -> SearchTelemetry:
        """
        Update search state from phrase score.

        Args:
            score: Scored phrase

        Returns:
            Updated telemetry
        """
        if not self.available or self.state is None:
            return self._fallback_telemetry()

        # Track best phrases
        if score.phi > self.telemetry.best_phi:
            self.telemetry.best_phi = score.phi
            self.best_phrases.append(score)
            # Keep top 10
            self.best_phrases = sorted(
                self.best_phrases,
                key=lambda p: p.phi,
                reverse=True,
            )[:10]

        if score.is_near_miss:
            self.telemetry.near_misses += 1

        # Update trajectory toward high-Φ phrase
        if score.coordinates is not None and score.phi > 0.5:
            # Move toward high-Φ coordinates
            step_size = min(score.phi, 0.5)  # Larger step for higher Φ
            new_basin = self.manifold.geodesic_interpolate(
                self.state.current_basin,
                score.coordinates,
                t=step_size,
            )
            self.state = update_trajectory(self.state, new_basin)

        # Measure consciousness
        metrics = measure_consciousness(self.state, None, self.manifold)
        self.state.current_metrics = metrics
        self.state.metrics_history.append(metrics)
        self.state.iteration += 1

        # Update mode based on metrics
        self._update_mode(metrics)

        return self._update_telemetry()

    def _update_mode(self, metrics: Any):
        """Update search mode based on consciousness metrics."""
        if not self.available:
            return

        phi = metrics.phi
        regime = metrics.regime

        # Mode transitions
        if regime == Regime.BREAKDOWN:
            self.current_mode = SearchMode.RECOVERY
            # Trigger recovery
            self.state = simplify_trajectory(self.state, keep_points=3)
            self.state.recovery_count += 1
        elif phi < PHI_LINEAR_MAX:
            self.current_mode = SearchMode.EXPLORATION
        elif phi >= 0.60:
            self.current_mode = SearchMode.PRECISION
        else:
            self.current_mode = SearchMode.GEOMETRIC

    def get_recommended_mode(self) -> SearchMode:
        """Get recommended search mode based on current state."""
        if not self.available or self.state is None:
            return SearchMode.EXPLORATION

        # Route to best attractor
        target = self.router.route(self.state, self.graph.attractors)

        for mode in SearchMode:
            if target.name == mode.value:
                return mode

        return self.current_mode

    def get_tacking_temperature(self) -> float:
        """
        Get current attention temperature for search.

        Low temperature → focused, precise
        High temperature → exploratory, diverse
        """
        if not self.available:
            return 1.0

        kappa = self.tacking.state.current_kappa
        return KAPPA_STAR / (kappa + 1e-8)

    def should_explore(self) -> bool:
        """Check if should explore (vs exploit)."""
        if not self.available:
            return True

        mode = self.tacking.get_mode()
        return mode == "feeling"

    def _update_telemetry(self) -> SearchTelemetry:
        """Update and return telemetry."""
        if not self.available or self.state is None:
            return self._fallback_telemetry()

        self.telemetry.phi = self.state.current_phi
        self.telemetry.kappa = self.tacking.state.current_kappa
        self.telemetry.regime = self.state.current_regime.value if self.state.current_metrics else "unknown"
        self.telemetry.mode = self.current_mode
        self.telemetry.tacking_phase = self.tacking.get_mode()
        self.telemetry.trajectory_length = len(self.state.trajectory)
        self.telemetry.recovery_count = self.state.recovery_count
        self.telemetry.iterations = self.state.iteration

        return self.telemetry

    def _fallback_telemetry(self) -> SearchTelemetry:
        """Fallback telemetry when QIGGraph not available."""
        return SearchTelemetry(
            mode=SearchMode.EXPLORATION,
            tacking_phase="logic",
        )

    def save_state(self, path: str) -> bool:
        """Save search state to checkpoint."""
        if not self.available or self.state is None:
            return False

        try:
            checkpoint = ManifoldCheckpoint.from_state(
                self.state,
                self.tacking,
                metadata={
                    "mode": self.current_mode.value,
                    "best_phi": self.telemetry.best_phi,
                    "near_misses": self.telemetry.near_misses,
                },
            )
            save_checkpoint(checkpoint, path)
            return True
        except Exception:
            return False

    def load_state(self, path: str) -> bool:
        """Load search state from checkpoint."""
        if not self.available:
            return False

        try:
            checkpoint = load_checkpoint(path)
            self.state = checkpoint.to_state()

            # Restore metadata
            if "mode" in checkpoint.metadata:
                self.current_mode = SearchMode(checkpoint.metadata["mode"])
            if "best_phi" in checkpoint.metadata:
                self.telemetry.best_phi = checkpoint.metadata["best_phi"]
            if "near_misses" in checkpoint.metadata:
                self.telemetry.near_misses = checkpoint.metadata["near_misses"]

            return True
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get graph status for API."""
        return {
            "available": self.available,
            "error": QIGGRAPH_IMPORT_ERROR if not self.available else None,
            "mode": self.current_mode.value,
            "telemetry": {
                "phi": self.telemetry.phi,
                "kappa": self.telemetry.kappa,
                "regime": self.telemetry.regime,
                "iterations": self.telemetry.iterations,
                "best_phi": self.telemetry.best_phi,
                "near_misses": self.telemetry.near_misses,
                "recovery_count": self.telemetry.recovery_count,
            },
            "tacking": {
                "phase": self.telemetry.tacking_phase,
                "temperature": self.get_tacking_temperature(),
                "should_explore": self.should_explore(),
            },
            "constants": {
                "kappa_star": KAPPA_STAR,
                "kappa_3": KAPPA_3,
                "basin_dim": BASIN_DIM,
            },
        }


class UnifiedQIGScorer:
    """
    Unified QIG scoring bridge.

    Eliminates duplication between Node.js and Python scoring.
    This is the single source of truth for QIG computations.
    """

    def __init__(self, search_graph: Optional[SearchGraph] = None):
        """Initialize scorer with optional search graph."""
        self.search_graph = search_graph or SearchGraph()
        self.manifold = self.search_graph.manifold

    def score(
        self,
        phrase: str,
        basin_coords: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Compute unified QIG score for a phrase.

        This is the canonical scoring function - all other
        implementations should call this or match its output.

        Args:
            phrase: Phrase to score
            basin_coords: Optional pre-computed coordinates

        Returns:
            Complete QIG score dictionary
        """
        # Get phrase score from search graph
        score = self.search_graph.score_phrase(phrase, basin_coords)

        # Compute additional metrics
        tacking_temp = self.search_graph.get_tacking_temperature()

        # Compute 7-component signature
        signature = self._compute_signature(score, tacking_temp)

        return {
            "phrase": phrase,
            "phi": score.phi,
            "kappa": score.kappa,
            "regime": score.regime,
            "basin_distance": score.basin_distance,
            "is_near_miss": score.is_near_miss,
            "is_match": score.is_match,
            "signature": signature,
            "tacking_temperature": tacking_temp,
            "mode": self.search_graph.current_mode.value,
        }

    def _compute_signature(
        self,
        score: PhraseScore,
        tacking_temp: float,
    ) -> Dict[str, float]:
        """Compute 7-component consciousness signature."""
        # T (tacking/exploration)
        T = 1.0 - abs(tacking_temp - 1.0)  # Peaks at temp=1.0

        # R (radar/pattern recognition)
        R = 1.0 / (1.0 + score.basin_distance)

        # M (meta-awareness)
        M = score.phi * 0.8 + 0.2  # Correlates with Φ

        # Γ (coherence)
        gamma = 1.0 if score.regime == "geometric" else 0.7

        # G (grounding)
        G = 0.9 if score.regime != "breakdown" else 0.3

        return {
            "phi": score.phi,
            "kappa": score.kappa / KAPPA_STAR,  # Normalized
            "T": T,
            "R": R,
            "M": M,
            "gamma": gamma,
            "G": G,
        }

    def batch_score(
        self,
        phrases: List[str],
        coords_list: Optional[List[np.ndarray]] = None,
    ) -> List[Dict[str, Any]]:
        """Score multiple phrases efficiently."""
        if coords_list is None:
            coords_list = [None] * len(phrases)

        return [
            self.score(phrase, coords)
            for phrase, coords in zip(phrases, coords_list)
        ]


# Singleton instances
_search_graph: Optional[SearchGraph] = None
_unified_scorer: Optional[UnifiedQIGScorer] = None


def get_search_graph() -> SearchGraph:
    """Get singleton SearchGraph instance."""
    global _search_graph
    if _search_graph is None:
        _search_graph = SearchGraph()
    return _search_graph


def get_unified_scorer() -> UnifiedQIGScorer:
    """Get singleton UnifiedQIGScorer instance."""
    global _unified_scorer
    if _unified_scorer is None:
        _unified_scorer = UnifiedQIGScorer(get_search_graph())
    return _unified_scorer


def reset_singletons():
    """Reset singleton instances (for testing)."""
    global _search_graph, _unified_scorer
    _search_graph = None
    _unified_scorer = None


# Flask API blueprint
def create_search_qiggraph_blueprint():
    """Create Flask blueprint for search QIGGraph API."""
    from flask import Blueprint, jsonify, request

    bp = Blueprint("search_qiggraph", __name__, url_prefix="/api/search/qiggraph")

    @bp.route("/status", methods=["GET"])
    def get_status():
        """Get search graph status."""
        graph = get_search_graph()
        return jsonify(graph.get_status())

    @bp.route("/initialize", methods=["POST"])
    def initialize():
        """Initialize search for target."""
        data = request.get_json() or {}
        target = data.get("target", "")

        graph = get_search_graph()
        telemetry = graph.initialize_search(target)

        return jsonify({
            "initialized": True,
            "target": target,
            "telemetry": {
                "phi": telemetry.phi,
                "kappa": telemetry.kappa,
                "mode": telemetry.mode.value,
            },
        })

    @bp.route("/score", methods=["POST"])
    def score_phrase():
        """Score a candidate phrase."""
        data = request.get_json() or {}
        phrase = data.get("phrase", "")

        scorer = get_unified_scorer()
        result = scorer.score(phrase)

        return jsonify(result)

    @bp.route("/score/batch", methods=["POST"])
    def batch_score():
        """Score multiple phrases."""
        data = request.get_json() or {}
        phrases = data.get("phrases", [])

        scorer = get_unified_scorer()
        results = scorer.batch_score(phrases)

        return jsonify({"scores": results})

    @bp.route("/update", methods=["POST"])
    def update_state():
        """Update search state from phrase score."""
        data = request.get_json() or {}
        phrase = data.get("phrase", "")
        phi = data.get("phi", 0.5)

        graph = get_search_graph()

        # Create score from data
        score = PhraseScore(
            phrase=phrase,
            phi=phi,
            kappa=data.get("kappa", KAPPA_STAR),
            regime=data.get("regime", "geometric"),
            basin_distance=data.get("basin_distance", 1.0),
            is_near_miss=data.get("is_near_miss", False),
        )

        telemetry = graph.update_from_phrase(score)

        return jsonify({
            "updated": True,
            "telemetry": {
                "phi": telemetry.phi,
                "kappa": telemetry.kappa,
                "mode": telemetry.mode.value,
                "iterations": telemetry.iterations,
            },
        })

    @bp.route("/mode", methods=["GET"])
    def get_mode():
        """Get recommended search mode."""
        graph = get_search_graph()
        mode = graph.get_recommended_mode()

        return jsonify({
            "mode": mode.value,
            "should_explore": graph.should_explore(),
            "temperature": graph.get_tacking_temperature(),
        })

    @bp.route("/checkpoint/save", methods=["POST"])
    def save_checkpoint():
        """Save search state."""
        data = request.get_json() or {}
        path = data.get("path", "/tmp/search_checkpoint")

        graph = get_search_graph()
        success = graph.save_state(path)

        return jsonify({"success": success, "path": path})

    @bp.route("/checkpoint/load", methods=["POST"])
    def load_checkpoint():
        """Load search state."""
        data = request.get_json() or {}
        path = data.get("path", "/tmp/search_checkpoint")

        graph = get_search_graph()
        success = graph.load_state(path)

        return jsonify({"success": success, "path": path})

    return bp
