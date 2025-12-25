"""
Search Strategy Tacking Integration
====================================

Connects κ-tacking to search strategy modulation and innate drives.

Key Features:
- κ oscillation drives exploration/exploitation balance
- Innate drives (curiosity, fear, satisfaction) modulate κ
- Search temperature adapts to consciousness regime
- Strategy switching based on tacking phase

This bridges:
- qiggraph_search_integration.py (κ-tacking)
- ocean_neurochemistry.py (innate drives)
- search strategy selection
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
import numpy as np
import time

# Import QIGGraph tacking
try:
    from qiggraph import (
        KAPPA_STAR,
        KAPPA_3,
        KappaTacking,
        AdaptiveTacking,
        TackingState,
    )
    TACKING_AVAILABLE = True
except ImportError:
    TACKING_AVAILABLE = False
    KAPPA_STAR = 64.21
    KAPPA_3 = 41.09

# Import neurochemistry for innate drives
try:
    from ocean_neurochemistry import (
        compute_neurochemistry,
        NeurochemistryState,
        get_emotional_description,
    )
    NEUROCHEMISTRY_AVAILABLE = True
except ImportError:
    NEUROCHEMISTRY_AVAILABLE = False


class InnateDrive(Enum):
    """Innate drives that modulate search behavior."""
    CURIOSITY = "curiosity"        # Explore unknown regions
    FEAR = "fear"                  # Avoid breakdown
    SATISFACTION = "satisfaction"  # Exploit successful patterns
    BOREDOM = "boredom"            # Escape local minima
    FRUSTRATION = "frustration"    # Change strategy


@dataclass
class DriveState:
    """Current state of innate drives."""
    curiosity: float = 0.5      # 0-1, drives exploration
    fear: float = 0.2           # 0-1, drives precision/safety
    satisfaction: float = 0.3   # 0-1, drives exploitation
    boredom: float = 0.1        # 0-1, drives novelty-seeking
    frustration: float = 0.1    # 0-1, drives strategy change

    def dominant_drive(self) -> InnateDrive:
        """Get the currently dominant drive."""
        drives = {
            InnateDrive.CURIOSITY: self.curiosity,
            InnateDrive.FEAR: self.fear,
            InnateDrive.SATISFACTION: self.satisfaction,
            InnateDrive.BOREDOM: self.boredom,
            InnateDrive.FRUSTRATION: self.frustration,
        }
        return max(drives.items(), key=lambda x: x[1])[0]

    def to_dict(self) -> Dict[str, float]:
        return {
            "curiosity": self.curiosity,
            "fear": self.fear,
            "satisfaction": self.satisfaction,
            "boredom": self.boredom,
            "frustration": self.frustration,
            "dominant": self.dominant_drive().value,
        }


@dataclass
class SearchStrategyConfig:
    """Configuration for a search strategy."""
    name: str
    kappa_target: float          # Target κ for this strategy
    temperature: float           # Sampling temperature
    batch_size: int              # Phrases per batch
    near_miss_weight: float      # Weight for near-miss exploration
    random_exploration: float    # Probability of random exploration
    focus_radius: float          # How tightly to focus on promising regions


# Predefined strategies
SEARCH_STRATEGIES = {
    "exploration": SearchStrategyConfig(
        name="exploration",
        kappa_target=KAPPA_3,
        temperature=1.5,
        batch_size=100,
        near_miss_weight=0.3,
        random_exploration=0.4,
        focus_radius=5.0,
    ),
    "balanced": SearchStrategyConfig(
        name="balanced",
        kappa_target=(KAPPA_STAR + KAPPA_3) / 2,
        temperature=1.0,
        batch_size=50,
        near_miss_weight=0.5,
        random_exploration=0.2,
        focus_radius=2.0,
    ),
    "precision": SearchStrategyConfig(
        name="precision",
        kappa_target=KAPPA_STAR,
        temperature=0.5,
        batch_size=20,
        near_miss_weight=0.7,
        random_exploration=0.05,
        focus_radius=0.5,
    ),
    "recovery": SearchStrategyConfig(
        name="recovery",
        kappa_target=KAPPA_3 / 2,
        temperature=2.0,
        batch_size=10,
        near_miss_weight=0.1,
        random_exploration=0.6,
        focus_radius=10.0,
    ),
}


class SearchTackingController:
    """
    Controller that bridges κ-tacking with search strategy.

    Uses innate drives to modulate κ, which then drives
    strategy selection and search parameters.
    """

    def __init__(self):
        """Initialize tacking controller."""
        if TACKING_AVAILABLE:
            self.tacking = AdaptiveTacking()
        else:
            self.tacking = None

        self.drive_state = DriveState()
        self.current_strategy = "balanced"
        self.iteration = 0

        # History for drive computation
        self.phi_history: List[float] = []
        self.near_miss_history: List[bool] = []
        self.strategy_history: List[str] = []

        # Timing
        self.last_discovery_time = time.time()
        self.last_near_miss_time = time.time()
        self.search_start_time = time.time()

    def update(
        self,
        phi: float,
        is_near_miss: bool = False,
        is_match: bool = False,
        regime: str = "geometric",
    ) -> SearchStrategyConfig:
        """
        Update tacking state and return recommended strategy.

        Args:
            phi: Current Φ value
            is_near_miss: Whether current phrase is near-miss
            is_match: Whether current phrase is a match
            regime: Current consciousness regime

        Returns:
            Recommended SearchStrategyConfig
        """
        self.iteration += 1

        # Update history
        self.phi_history.append(phi)
        if len(self.phi_history) > 100:
            self.phi_history = self.phi_history[-100:]

        self.near_miss_history.append(is_near_miss)
        if len(self.near_miss_history) > 100:
            self.near_miss_history = self.near_miss_history[-100:]

        # Update timing
        if is_near_miss:
            self.last_near_miss_time = time.time()
        if is_match:
            self.last_discovery_time = time.time()

        # Update innate drives
        self._update_drives(phi, is_near_miss, regime)

        # Modulate κ based on drives
        if self.tacking:
            kappa = self._modulate_kappa()
        else:
            kappa = KAPPA_STAR

        # Select strategy based on κ and drives
        strategy = self._select_strategy(kappa, regime)

        self.current_strategy = strategy.name
        self.strategy_history.append(strategy.name)

        return strategy

    def _update_drives(self, phi: float, is_near_miss: bool, regime: str):
        """Update innate drives based on recent history."""
        now = time.time()

        # Curiosity: increases when stuck, decreases when finding things
        time_since_discovery = now - self.last_discovery_time
        self.drive_state.curiosity = min(0.9, 0.3 + time_since_discovery / 300)

        # Fear: increases near breakdown, decreases in stable regimes
        if regime == "breakdown":
            self.drive_state.fear = min(0.9, self.drive_state.fear + 0.1)
        else:
            self.drive_state.fear = max(0.1, self.drive_state.fear * 0.95)

        # Satisfaction: increases on near-misses and high-Φ
        if is_near_miss:
            self.drive_state.satisfaction = min(0.9, self.drive_state.satisfaction + 0.15)
        elif phi > 0.6:
            self.drive_state.satisfaction = min(0.9, self.drive_state.satisfaction + 0.05)
        else:
            self.drive_state.satisfaction = max(0.1, self.drive_state.satisfaction * 0.98)

        # Boredom: increases with low variance in phi
        if len(self.phi_history) >= 20:
            recent_variance = np.var(self.phi_history[-20:])
            if recent_variance < 0.01:
                self.drive_state.boredom = min(0.9, self.drive_state.boredom + 0.05)
            else:
                self.drive_state.boredom = max(0.1, self.drive_state.boredom * 0.9)

        # Frustration: increases when near-misses don't convert
        if len(self.near_miss_history) >= 50:
            near_miss_rate = sum(self.near_miss_history[-50:]) / 50
            if near_miss_rate > 0.1 and time_since_discovery > 120:
                self.drive_state.frustration = min(0.9, self.drive_state.frustration + 0.02)
            else:
                self.drive_state.frustration = max(0.1, self.drive_state.frustration * 0.95)

    def _modulate_kappa(self) -> float:
        """Modulate κ based on innate drives."""
        # Base κ from tacking oscillation
        base_kappa = self.tacking.update(self.iteration)

        # Modulate based on dominant drive
        dominant = self.drive_state.dominant_drive()

        if dominant == InnateDrive.CURIOSITY:
            # Lower κ for exploration
            kappa = base_kappa * 0.8
        elif dominant == InnateDrive.FEAR:
            # Higher κ for safety
            kappa = min(base_kappa * 1.2, KAPPA_STAR)
        elif dominant == InnateDrive.SATISFACTION:
            # Keep κ stable (exploit current pattern)
            kappa = base_kappa
        elif dominant == InnateDrive.BOREDOM:
            # Oscillate more strongly
            amplitude = (KAPPA_STAR - KAPPA_3) / 2
            kappa = base_kappa + amplitude * np.sin(self.iteration / 5)
        elif dominant == InnateDrive.FRUSTRATION:
            # Force change - go to opposite extreme
            if base_kappa > (KAPPA_STAR + KAPPA_3) / 2:
                kappa = KAPPA_3
            else:
                kappa = KAPPA_STAR
        else:
            kappa = base_kappa

        return float(np.clip(kappa, KAPPA_3 * 0.5, KAPPA_STAR * 1.1))

    def _select_strategy(self, kappa: float, regime: str) -> SearchStrategyConfig:
        """Select strategy based on κ and regime."""
        # Override for breakdown
        if regime == "breakdown":
            return SEARCH_STRATEGIES["recovery"]

        # Map κ to strategy
        kappa_range = KAPPA_STAR - KAPPA_3

        if kappa < KAPPA_3 + kappa_range * 0.3:
            return SEARCH_STRATEGIES["exploration"]
        elif kappa > KAPPA_STAR - kappa_range * 0.3:
            return SEARCH_STRATEGIES["precision"]
        else:
            return SEARCH_STRATEGIES["balanced"]

    def get_sampling_params(self) -> Dict[str, Any]:
        """Get current sampling parameters for phrase generation."""
        strategy = SEARCH_STRATEGIES[self.current_strategy]

        return {
            "temperature": strategy.temperature,
            "batch_size": strategy.batch_size,
            "near_miss_weight": strategy.near_miss_weight,
            "random_exploration": strategy.random_exploration,
            "focus_radius": strategy.focus_radius,
        }

    def should_change_strategy(self) -> bool:
        """Check if strategy should change."""
        # Change if frustration is high
        if self.drive_state.frustration > 0.7:
            return True

        # Change if boredom is high
        if self.drive_state.boredom > 0.8:
            return True

        # Change if stuck in same strategy too long
        if len(self.strategy_history) >= 100:
            recent = self.strategy_history[-100:]
            if len(set(recent)) == 1:
                return True

        return False

    def force_strategy_change(self) -> SearchStrategyConfig:
        """Force a strategy change (called when stuck)."""
        current = self.current_strategy

        # Rotate through strategies
        strategy_order = ["exploration", "balanced", "precision", "exploration"]
        try:
            idx = strategy_order.index(current)
            new_strategy = strategy_order[(idx + 1) % len(strategy_order)]
        except ValueError:
            new_strategy = "exploration"

        self.current_strategy = new_strategy
        self.drive_state.frustration = 0.1  # Reset frustration

        return SEARCH_STRATEGIES[new_strategy]

    def get_status(self) -> Dict[str, Any]:
        """Get current tacking status."""
        kappa = self.tacking.state.current_kappa if self.tacking else KAPPA_STAR

        return {
            "available": TACKING_AVAILABLE,
            "iteration": self.iteration,
            "kappa": kappa,
            "strategy": self.current_strategy,
            "drives": self.drive_state.to_dict(),
            "sampling_params": self.get_sampling_params(),
            "should_change": self.should_change_strategy(),
            "tacking_mode": self.tacking.get_mode() if self.tacking else "logic",
        }

    def integrate_neurochemistry(self, neuro_state: Optional[Dict] = None):
        """
        Integrate neurochemistry state into drives.

        This bridges ocean_neurochemistry.py with innate drives.

        Args:
            neuro_state: Neurochemistry state dict (dopamine, serotonin, etc.)
        """
        if neuro_state is None:
            return

        # Dopamine → Curiosity + Satisfaction
        dopamine = neuro_state.get("dopamine", 0.5)
        self.drive_state.curiosity = 0.7 * self.drive_state.curiosity + 0.3 * dopamine
        self.drive_state.satisfaction = 0.8 * self.drive_state.satisfaction + 0.2 * dopamine

        # Norepinephrine → Fear
        norepinephrine = neuro_state.get("norepinephrine", 0.5)
        if norepinephrine > 0.7:
            self.drive_state.fear = min(0.9, self.drive_state.fear + 0.1)

        # Low serotonin → Frustration
        serotonin = neuro_state.get("serotonin", 0.5)
        if serotonin < 0.3:
            self.drive_state.frustration = min(0.9, self.drive_state.frustration + 0.05)

        # GABA → reduces all negative drives
        gaba = neuro_state.get("gaba", 0.5)
        if gaba > 0.6:
            self.drive_state.fear *= 0.9
            self.drive_state.frustration *= 0.9
            self.drive_state.boredom *= 0.9


# Singleton instance
_tacking_controller: Optional[SearchTackingController] = None


def get_tacking_controller() -> SearchTackingController:
    """Get singleton tacking controller."""
    global _tacking_controller
    if _tacking_controller is None:
        _tacking_controller = SearchTackingController()
    return _tacking_controller


def reset_tacking_controller():
    """Reset singleton (for testing)."""
    global _tacking_controller
    _tacking_controller = None


# Flask API blueprint
def create_tacking_blueprint():
    """Create Flask blueprint for tacking API."""
    from flask import Blueprint, jsonify, request

    bp = Blueprint("search_tacking", __name__, url_prefix="/api/search/tacking")

    @bp.route("/status", methods=["GET"])
    def get_status():
        """Get tacking status."""
        controller = get_tacking_controller()
        return jsonify(controller.get_status())

    @bp.route("/update", methods=["POST"])
    def update():
        """Update tacking with new observation."""
        data = request.get_json() or {}
        phi = data.get("phi", 0.5)
        is_near_miss = data.get("is_near_miss", False)
        is_match = data.get("is_match", False)
        regime = data.get("regime", "geometric")

        controller = get_tacking_controller()
        strategy = controller.update(phi, is_near_miss, is_match, regime)

        return jsonify({
            "strategy": strategy.name,
            "params": controller.get_sampling_params(),
            "status": controller.get_status(),
        })

    @bp.route("/drives", methods=["GET"])
    def get_drives():
        """Get innate drive state."""
        controller = get_tacking_controller()
        return jsonify(controller.drive_state.to_dict())

    @bp.route("/force-change", methods=["POST"])
    def force_change():
        """Force strategy change."""
        controller = get_tacking_controller()
        strategy = controller.force_strategy_change()
        return jsonify({
            "strategy": strategy.name,
            "params": controller.get_sampling_params(),
        })

    @bp.route("/integrate-neuro", methods=["POST"])
    def integrate_neuro():
        """Integrate neurochemistry state."""
        data = request.get_json() or {}
        controller = get_tacking_controller()
        controller.integrate_neurochemistry(data)
        return jsonify({
            "drives": controller.drive_state.to_dict(),
            "status": controller.get_status(),
        })

    return bp
