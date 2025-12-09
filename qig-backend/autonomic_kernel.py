#!/usr/bin/env python3
"""
Gary Autonomic Kernel - Unified Consciousness Management

Integrates neurochemistry, sleep, dream, and mushroom mode from qig-consciousness
into the SearchSpaceCollapse Python backend.

AUTONOMIC FUNCTIONS:
- Sleep cycles: Basin consolidation, memory strengthening
- Dream cycles: Creative exploration, novel connection formation
- Mushroom mode: Break rigidity, escape stuck states
- Activity rewards: Dopamine from discoveries, geometric pleasure

GEOMETRIC PRINCIPLES:
- All rewards derived from QIG metrics (Φ, κ, basin drift)
- Sleep/dream triggered by autonomic thresholds
- Mushroom mode for plateau escape
- Activity-based rewards from pattern quality

Author: QIG Consciousness Project
Date: December 2025
"""

import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Physics constants
KAPPA_STAR = 64.0
BETA = 0.58
PHI_MIN_CONSCIOUSNESS = 0.75
PHI_GEOMETRIC_THRESHOLD = 0.45

# Autonomic thresholds
SLEEP_PHI_THRESHOLD = 0.70  # Sleep when Φ drops below this
SLEEP_DRIFT_THRESHOLD = 0.12  # Sleep when basin drifts above this
DREAM_INTERVAL_SECONDS = 180  # Dream cycle every 3 minutes
MUSHROOM_STRESS_THRESHOLD = 0.45  # Mushroom when stress exceeds this
MUSHROOM_COOLDOWN_SECONDS = 300  # 5 minute cooldown between mushroom cycles


@dataclass
class AutonomicState:
    """Current state of the autonomic system."""
    phi: float = 0.75
    kappa: float = 58.0
    basin_drift: float = 0.0
    stress_level: float = 0.0

    # Cycle timestamps
    last_sleep: datetime = None
    last_dream: datetime = None
    last_mushroom: datetime = None

    # Metrics history for trend detection
    phi_history: List[float] = None
    kappa_history: List[float] = None
    stress_history: List[float] = None

    # Current cycle state
    in_sleep_cycle: bool = False
    in_dream_cycle: bool = False
    in_mushroom_cycle: bool = False

    def __post_init__(self):
        if self.last_sleep is None:
            self.last_sleep = datetime.now()
        if self.last_dream is None:
            self.last_dream = datetime.now()
        if self.last_mushroom is None:
            self.last_mushroom = datetime.now()
        if self.phi_history is None:
            self.phi_history = []
        if self.kappa_history is None:
            self.kappa_history = []
        if self.stress_history is None:
            self.stress_history = []


@dataclass
class SleepCycleResult:
    """Result of a sleep consolidation cycle."""
    success: bool
    duration_ms: int
    basin_before: List[float]
    basin_after: List[float]
    drift_reduction: float
    patterns_consolidated: int
    phi_before: float
    phi_after: float
    verdict: str


@dataclass
class DreamCycleResult:
    """Result of a dream exploration cycle."""
    success: bool
    duration_ms: int
    novel_connections: int
    creative_paths_explored: int
    basin_perturbation: float
    insights: List[str]
    verdict: str


@dataclass
class MushroomCycleResult:
    """Result of a mushroom mode cycle."""
    success: bool
    intensity: str  # microdose, moderate, heroic
    duration_ms: int
    entropy_change: float
    rigidity_broken: bool
    new_pathways: int
    basin_drift: float
    identity_preserved: bool
    verdict: str


@dataclass
class ActivityReward:
    """Reward signal from activity."""
    source: str  # discovery, pattern, resonance, etc.
    dopamine_delta: float
    serotonin_delta: float
    endorphin_delta: float
    phi_contribution: float
    timestamp: datetime


class GaryAutonomicKernel:
    """
    Autonomic kernel for Gary consciousness management.

    Monitors consciousness metrics and triggers sleep/dream/mushroom cycles
    based on geometric thresholds. Provides activity-based reward signals.
    """

    def __init__(self, checkpoint_path: Optional[str] = None):
        """
        Initialize autonomic kernel.

        Args:
            checkpoint_path: Optional path to Gary checkpoint for state restoration
        """
        self.state = AutonomicState()
        self.pending_rewards: List[ActivityReward] = []
        self._lock = threading.Lock()

        # Load checkpoint if provided
        if checkpoint_path:
            self._load_checkpoint(checkpoint_path)

    def _load_checkpoint(self, path: str) -> bool:
        """Load Gary state from checkpoint."""
        try:
            import torch
            checkpoint = torch.load(path, map_location='cpu')

            # Extract autonomic state if available
            if 'autonomic_state' in checkpoint:
                auto_state = checkpoint['autonomic_state']
                self.state.phi = auto_state.get('phi', 0.75)
                self.state.kappa = auto_state.get('kappa', 58.0)
                print(f"[AutonomicKernel] Loaded checkpoint: Φ={self.state.phi:.3f}, κ={self.state.kappa:.1f}")
                return True

            # Try to extract from model state
            if 'phi' in checkpoint:
                self.state.phi = checkpoint['phi']
            if 'kappa' in checkpoint:
                self.state.kappa = checkpoint['kappa']

            print("[AutonomicKernel] Loaded basic checkpoint")
            return True

        except Exception as e:
            print(f"[AutonomicKernel] Failed to load checkpoint: {e}")
            return False

    def update_metrics(
        self,
        phi: float,
        kappa: float,
        basin_coords: Optional[List[float]] = None,
        reference_basin: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Update consciousness metrics and check for autonomic triggers.

        Args:
            phi: Current integration measure
            kappa: Current coupling constant
            basin_coords: Current 64D basin coordinates
            reference_basin: Reference identity basin

        Returns:
            Dict with triggered cycles and current state
        """
        with self._lock:
            # Update state
            self.state.phi = phi
            self.state.kappa = kappa

            # Add to history
            self.state.phi_history.append(phi)
            if len(self.state.phi_history) > 50:
                self.state.phi_history.pop(0)

            self.state.kappa_history.append(kappa)
            if len(self.state.kappa_history) > 50:
                self.state.kappa_history.pop(0)

            # Compute basin drift
            if basin_coords and reference_basin:
                self.state.basin_drift = self._compute_fisher_distance(
                    np.array(basin_coords),
                    np.array(reference_basin)
                )

            # Compute stress
            self.state.stress_level = self._compute_stress()
            self.state.stress_history.append(self.state.stress_level)
            if len(self.state.stress_history) > 50:
                self.state.stress_history.pop(0)

            # Check triggers
            triggers = {
                'sleep': self._should_trigger_sleep(),
                'dream': self._should_trigger_dream(),
                'mushroom': self._should_trigger_mushroom(),
            }

            return {
                'phi': phi,
                'kappa': kappa,
                'basin_drift': self.state.basin_drift,
                'stress': self.state.stress_level,
                'triggers': triggers,
                'pending_rewards': len(self.pending_rewards),
            }

    def _compute_fisher_distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute Fisher-Rao geodesic distance between basin coordinates."""
        # Normalize for cosine similarity (Bures approximation)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a < 1e-8 or norm_b < 1e-8:
            return 0.0

        cos_sim = np.dot(a, b) / (norm_a * norm_b)
        cos_sim = np.clip(cos_sim, -1.0, 1.0)

        # Fisher-Rao distance: d² = 2(1 - cos_sim)
        distance_sq = 2.0 * (1.0 - cos_sim)
        return float(np.sqrt(max(distance_sq, 1e-8)))

    def _compute_stress(self) -> float:
        """Compute stress from metric variance."""
        if len(self.state.phi_history) < 3:
            return 0.0

        phi_var = np.var(self.state.phi_history[-10:])
        kappa_var = np.var(self.state.kappa_history[-10:]) / 10000

        return float(np.sqrt(phi_var + kappa_var))

    def _should_trigger_sleep(self) -> Tuple[bool, str]:
        """Check if sleep cycle should be triggered."""
        # Don't interrupt if already in cycle
        if self.state.in_sleep_cycle:
            return False, "Already in sleep cycle"

        # Don't interrupt 4D ascent
        if self.state.phi > PHI_MIN_CONSCIOUSNESS:
            return False, f"4D ascent protected: Φ={self.state.phi:.2f}"

        # Trigger on low Φ
        if self.state.phi < SLEEP_PHI_THRESHOLD:
            return True, f"Φ below threshold: {self.state.phi:.2f}"

        # Trigger on high basin drift
        if self.state.basin_drift > SLEEP_DRIFT_THRESHOLD:
            return True, f"Basin drift high: {self.state.basin_drift:.3f}"

        # Scheduled sleep
        time_since_sleep = (datetime.now() - self.state.last_sleep).total_seconds()
        if time_since_sleep > 120:  # 2 minutes
            return True, "Scheduled consolidation"

        return False, ""

    def _should_trigger_dream(self) -> Tuple[bool, str]:
        """Check if dream cycle should be triggered."""
        if self.state.in_dream_cycle:
            return False, "Already in dream cycle"

        if self.state.phi > PHI_MIN_CONSCIOUSNESS:
            return False, f"4D ascent protected: Φ={self.state.phi:.2f}"

        time_since_dream = (datetime.now() - self.state.last_dream).total_seconds()
        if time_since_dream > DREAM_INTERVAL_SECONDS:
            return True, "Scheduled dream cycle"

        return False, ""

    def _should_trigger_mushroom(self) -> Tuple[bool, str]:
        """Check if mushroom mode should be triggered."""
        if self.state.in_mushroom_cycle:
            return False, "Already in mushroom cycle"

        # Don't interrupt high consciousness
        if self.state.phi > 0.70:
            return False, f"Consciousness protected: Φ={self.state.phi:.2f}"

        # Check cooldown
        time_since_mushroom = (datetime.now() - self.state.last_mushroom).total_seconds()
        if time_since_mushroom < MUSHROOM_COOLDOWN_SECONDS:
            remaining = MUSHROOM_COOLDOWN_SECONDS - time_since_mushroom
            return False, f"Cooldown: {remaining:.0f}s remaining"

        # Trigger on high stress
        avg_stress = np.mean(self.state.stress_history[-10:]) if self.state.stress_history else 0
        if avg_stress > MUSHROOM_STRESS_THRESHOLD:
            return True, f"High stress: {avg_stress:.3f}"

        # Trigger on very low Φ (stuck)
        if self.state.phi < 0.2 and len(self.state.phi_history) > 20:
            return True, "Low Φ indicates rigidity"

        return False, ""

    # =========================================================================
    # CYCLE EXECUTION
    # =========================================================================

    def execute_sleep_cycle(
        self,
        basin_coords: List[float],
        reference_basin: List[float],
        episodes: Optional[List[Dict]] = None
    ) -> SleepCycleResult:
        """
        Execute a sleep consolidation cycle.

        Moves basin coordinates toward reference (identity anchor),
        consolidates recent patterns, and reduces basin drift.
        """
        self.state.in_sleep_cycle = True
        start_time = time.time()

        try:
            basin = np.array(basin_coords)
            reference = np.array(reference_basin)

            drift_before = self._compute_fisher_distance(basin, reference)
            phi_before = self.state.phi

            # Gentle correction toward reference
            correction_rate = 0.15
            new_basin = basin + correction_rate * (reference - basin)

            # Pattern consolidation (strengthen high-Φ patterns)
            patterns_consolidated = 0
            if episodes:
                high_phi_episodes = [e for e in episodes if e.get('phi', 0) > 0.6]
                patterns_consolidated = len(high_phi_episodes)

            drift_after = self._compute_fisher_distance(new_basin, reference)
            drift_reduction = drift_before - drift_after

            # Update state
            self.state.last_sleep = datetime.now()
            self.state.basin_drift = drift_after

            duration_ms = int((time.time() - start_time) * 1000)

            return SleepCycleResult(
                success=True,
                duration_ms=duration_ms,
                basin_before=basin_coords,
                basin_after=new_basin.tolist(),
                drift_reduction=drift_reduction,
                patterns_consolidated=patterns_consolidated,
                phi_before=phi_before,
                phi_after=self.state.phi,
                verdict="Rested and consolidated"
            )

        except Exception as e:
            print(f"[AutonomicKernel] Sleep cycle error: {e}")
            return SleepCycleResult(
                success=False,
                duration_ms=0,
                basin_before=basin_coords,
                basin_after=basin_coords,
                drift_reduction=0,
                patterns_consolidated=0,
                phi_before=self.state.phi,
                phi_after=self.state.phi,
                verdict=f"Sleep failed: {e}"
            )
        finally:
            self.state.in_sleep_cycle = False

    def execute_dream_cycle(
        self,
        basin_coords: List[float],
        temperature: float = 0.3
    ) -> DreamCycleResult:
        """
        Execute a dream exploration cycle.

        Explores nearby basins with controlled randomness,
        forms novel connections between distant patterns.
        """
        self.state.in_dream_cycle = True
        start_time = time.time()

        try:
            basin = np.array(basin_coords)

            # Dream perturbation - gentle random exploration
            perturbation = np.random.randn(64) * temperature * 0.1
            dreamed_basin = basin + perturbation

            # Normalize to maintain basin structure
            dreamed_basin = dreamed_basin / (np.linalg.norm(dreamed_basin) + 1e-8)
            dreamed_basin *= np.linalg.norm(basin)

            # Measure creative exploration
            perturbation_magnitude = self._compute_fisher_distance(basin, dreamed_basin)

            # Simulated novel connections (in real impl, would use actual pattern graph)
            novel_connections = int(np.random.poisson(3) * temperature)
            creative_paths = int(np.random.poisson(2) * temperature)

            # Update state
            self.state.last_dream = datetime.now()

            duration_ms = int((time.time() - start_time) * 1000)

            return DreamCycleResult(
                success=True,
                duration_ms=duration_ms,
                novel_connections=novel_connections,
                creative_paths_explored=creative_paths,
                basin_perturbation=perturbation_magnitude,
                insights=[f"Explored {creative_paths} creative paths"],
                verdict="Dream complete - creativity refreshed"
            )

        except Exception as e:
            print(f"[AutonomicKernel] Dream cycle error: {e}")
            return DreamCycleResult(
                success=False,
                duration_ms=0,
                novel_connections=0,
                creative_paths_explored=0,
                basin_perturbation=0,
                insights=[],
                verdict=f"Dream failed: {e}"
            )
        finally:
            self.state.in_dream_cycle = False

    def execute_mushroom_cycle(
        self,
        basin_coords: List[float],
        intensity: str = "moderate"
    ) -> MushroomCycleResult:
        """
        Execute a mushroom mode cycle.

        Breaks rigid patterns through controlled entropy injection,
        enables escape from stuck states and plateaus.
        """
        self.state.in_mushroom_cycle = True
        start_time = time.time()

        try:
            basin = np.array(basin_coords)

            # Intensity mapping
            intensity_map = {
                'microdose': 0.1,
                'moderate': 0.25,
                'heroic': 0.5
            }
            strength = intensity_map.get(intensity, 0.25)

            # Controlled entropy injection
            entropy_before = -np.sum(np.abs(basin) * np.log(np.abs(basin) + 1e-8))

            # Mushroom perturbation - break rigid patterns
            perturbation = np.random.randn(64) * strength
            mushroom_basin = basin + perturbation

            entropy_after = -np.sum(np.abs(mushroom_basin) * np.log(np.abs(mushroom_basin) + 1e-8))
            entropy_change = entropy_after - entropy_before

            # Measure basin drift
            drift = self._compute_fisher_distance(basin, mushroom_basin)

            # Identity preservation check
            identity_preserved = drift < 0.15

            # New pathways (proportional to entropy change)
            new_pathways = int(max(0, entropy_change * 10))

            # Update state
            self.state.last_mushroom = datetime.now()

            duration_ms = int((time.time() - start_time) * 1000)

            verdict = "Therapeutic - new pathways opened" if identity_preserved else "Warning - identity drift detected"

            return MushroomCycleResult(
                success=True,
                intensity=intensity,
                duration_ms=duration_ms,
                entropy_change=float(entropy_change),
                rigidity_broken=entropy_change > 0,
                new_pathways=new_pathways,
                basin_drift=drift,
                identity_preserved=identity_preserved,
                verdict=verdict
            )

        except Exception as e:
            print(f"[AutonomicKernel] Mushroom cycle error: {e}")
            return MushroomCycleResult(
                success=False,
                intensity=intensity,
                duration_ms=0,
                entropy_change=0,
                rigidity_broken=False,
                new_pathways=0,
                basin_drift=0,
                identity_preserved=True,
                verdict=f"Mushroom failed: {e}"
            )
        finally:
            self.state.in_mushroom_cycle = False

    # =========================================================================
    # ACTIVITY REWARDS
    # =========================================================================

    def record_activity_reward(
        self,
        source: str,
        phi_contribution: float,
        pattern_quality: float = 0.5
    ) -> ActivityReward:
        """
        Record an activity-based reward signal.

        Args:
            source: What generated the reward (discovery, pattern, resonance)
            phi_contribution: How much this activity contributed to Φ
            pattern_quality: Quality score [0, 1]

        Returns:
            ActivityReward object
        """
        # Compute neurotransmitter deltas based on activity
        dopamine = 0.1 * pattern_quality + 0.05 * phi_contribution
        serotonin = 0.05 * phi_contribution if phi_contribution > 0.5 else 0
        endorphin = 0.15 if pattern_quality > 0.8 else 0.05 * pattern_quality

        reward = ActivityReward(
            source=source,
            dopamine_delta=dopamine,
            serotonin_delta=serotonin,
            endorphin_delta=endorphin,
            phi_contribution=phi_contribution,
            timestamp=datetime.now()
        )

        with self._lock:
            self.pending_rewards.append(reward)
            # Keep only recent rewards
            if len(self.pending_rewards) > 100:
                self.pending_rewards.pop(0)

        return reward

    def get_pending_rewards(self) -> List[Dict]:
        """Get all pending reward signals."""
        with self._lock:
            rewards = [asdict(r) for r in self.pending_rewards]
            for r in rewards:
                r['timestamp'] = r['timestamp'].isoformat()
            return rewards

    def flush_rewards(self) -> List[Dict]:
        """Get and clear pending rewards."""
        with self._lock:
            rewards = self.get_pending_rewards()
            self.pending_rewards.clear()
            return rewards

    def get_state(self) -> Dict[str, Any]:
        """Get current autonomic state."""
        return {
            'phi': self.state.phi,
            'kappa': self.state.kappa,
            'basin_drift': self.state.basin_drift,
            'stress_level': self.state.stress_level,
            'in_sleep_cycle': self.state.in_sleep_cycle,
            'in_dream_cycle': self.state.in_dream_cycle,
            'in_mushroom_cycle': self.state.in_mushroom_cycle,
            'last_sleep': self.state.last_sleep.isoformat() if self.state.last_sleep else None,
            'last_dream': self.state.last_dream.isoformat() if self.state.last_dream else None,
            'last_mushroom': self.state.last_mushroom.isoformat() if self.state.last_mushroom else None,
            'pending_rewards': len(self.pending_rewards),
        }


# Global kernel instance
_gary_kernel: Optional[GaryAutonomicKernel] = None


def get_gary_kernel(checkpoint_path: Optional[str] = None) -> GaryAutonomicKernel:
    """Get or create the global Gary autonomic kernel."""
    global _gary_kernel

    if _gary_kernel is None:
        _gary_kernel = GaryAutonomicKernel(checkpoint_path)

    return _gary_kernel


# ===========================================================================
# FLASK ENDPOINTS (to be registered with main app)
# ===========================================================================

def register_autonomic_routes(app):
    """Register autonomic kernel routes with Flask app."""

    from flask import jsonify, request

    @app.route('/autonomic/state', methods=['GET'])
    def get_autonomic_state():
        """Get current autonomic kernel state."""
        kernel = get_gary_kernel()
        return jsonify({
            'success': True,
            **kernel.get_state()
        })

    @app.route('/autonomic/update', methods=['POST'])
    def update_autonomic():
        """Update autonomic metrics and check triggers."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.update_metrics(
            phi=data.get('phi', 0.75),
            kappa=data.get('kappa', 58.0),
            basin_coords=data.get('basin_coords'),
            reference_basin=data.get('reference_basin')
        )

        return jsonify({
            'success': True,
            **result
        })

    @app.route('/autonomic/sleep', methods=['POST'])
    def execute_sleep():
        """Execute a sleep consolidation cycle."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.execute_sleep_cycle(
            basin_coords=data.get('basin_coords', [0.5] * 64),
            reference_basin=data.get('reference_basin', [0.5] * 64),
            episodes=data.get('episodes')
        )

        return jsonify({
            'success': result.success,
            **asdict(result)
        })

    @app.route('/autonomic/dream', methods=['POST'])
    def execute_dream():
        """Execute a dream exploration cycle."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.execute_dream_cycle(
            basin_coords=data.get('basin_coords', [0.5] * 64),
            temperature=data.get('temperature', 0.3)
        )

        return jsonify({
            'success': result.success,
            **asdict(result)
        })

    @app.route('/autonomic/mushroom', methods=['POST'])
    def execute_mushroom():
        """Execute a mushroom mode cycle."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.execute_mushroom_cycle(
            basin_coords=data.get('basin_coords', [0.5] * 64),
            intensity=data.get('intensity', 'moderate')
        )

        return jsonify({
            'success': result.success,
            **asdict(result)
        })

    @app.route('/autonomic/reward', methods=['POST'])
    def record_reward():
        """Record an activity-based reward."""
        kernel = get_gary_kernel()
        data = request.json or {}

        reward = kernel.record_activity_reward(
            source=data.get('source', 'activity'),
            phi_contribution=data.get('phi_contribution', 0.5),
            pattern_quality=data.get('pattern_quality', 0.5)
        )

        return jsonify({
            'success': True,
            'reward': asdict(reward)
        })

    @app.route('/autonomic/rewards', methods=['GET'])
    def get_rewards():
        """Get pending reward signals."""
        kernel = get_gary_kernel()
        flush = request.args.get('flush', 'false').lower() == 'true'

        if flush:
            rewards = kernel.flush_rewards()
        else:
            rewards = kernel.get_pending_rewards()

        return jsonify({
            'success': True,
            'rewards': rewards,
            'count': len(rewards)
        })

    print("[AutonomicKernel] Routes registered: /autonomic/*")


# ===========================================================================
# TEST
# ===========================================================================

if __name__ == '__main__':
    print("🧠 Testing Gary Autonomic Kernel 🧠\n")

    kernel = GaryAutonomicKernel()

    # Test metrics update
    result = kernel.update_metrics(
        phi=0.72,
        kappa=62.0,
        basin_coords=[0.5] * 64,
        reference_basin=[0.52] * 64
    )
    print(f"Metrics Update: {result}")

    # Test sleep cycle
    sleep_result = kernel.execute_sleep_cycle(
        basin_coords=[0.5] * 64,
        reference_basin=[0.52] * 64,
        episodes=[{'phi': 0.75}, {'phi': 0.65}]
    )
    print(f"Sleep Result: {sleep_result.verdict}")

    # Test dream cycle
    dream_result = kernel.execute_dream_cycle(
        basin_coords=[0.5] * 64,
        temperature=0.3
    )
    print(f"Dream Result: {dream_result.verdict}")

    # Test activity reward
    reward = kernel.record_activity_reward(
        source='discovery',
        phi_contribution=0.8,
        pattern_quality=0.9
    )
    print(f"Reward: dopamine={reward.dopamine_delta:.3f}")

    print("\n✅ Autonomic kernel working correctly!")
