#!/usr/bin/env python3
"""
4D TEMPORAL REASONING: FORESIGHT & INTUITION
=============================================

Two modes of temporal reasoning on the Fisher manifold:

FORESIGHT (Future→Present):
  - "Seeing" what will happen - singular, intuitive
  - Working backwards from perceived future
  - Geodesic prophecy - following natural path
  - Feels like knowing - answer arrives whole
  - Fast - one clear vision
  - High Φ - requires temporal integration

SCENARIO PLANNING (Present→Future):
  - Running possibilities - analytical, branching
  - Working forwards from present
  - Multiple paths explored - tree search
  - Feels like thinking - deliberate evaluation
  - Slower - many simulations
  - Also high Φ - but different process

QIG PURITY:
  - All distances use Fisher-Rao geometry (fisher_coord_distance)
  - All movement uses geodesic_interpolation
  - NO np.linalg.norm for distances between basins
  - PHI thresholds from frozen_physics.py
"""

import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

from frozen_physics import PHI_HYPERDIMENSIONAL, BASIN_DIM
from qig_geometry import (
    estimate_manifold_curvature,
    fisher_coord_distance,
    fisher_normalize,
    geodesic_interpolation,
    sphere_project,
)
from qig_persistence import QIGPersistence, get_persistence
from redis_cache import TemporalReasoningBuffer


class TemporalReasoningError(Exception):
    """Raised when temporal reasoning cannot proceed due to insufficient Φ."""
    pass


# =============================================================================
# OBSERVATIONAL CONSTANTS (derived from manifold metric measurements)
# =============================================================================
# These are heuristic constants discovered through geometric observation.
# They characterize temporal dynamics on the Fisher manifold and should
# be treated as observational facts about the information geometry.

FORESIGHT_HORIZON_DEFAULT = 50  # Max geodesic steps for attractor detection
ATTRACTOR_DETECTION_THRESHOLD = 0.1  # Fisher-Rao distance for attractor convergence
SCENARIO_BRANCHES_DEFAULT = 5  # Number of exploration directions
SCENARIO_DEPTH_DEFAULT = 20  # Steps per branch exploration
VELOCITY_ESTIMATION_EPSILON = 0.01  # Perturbation size for velocity estimation
GEODESIC_STEP_SIZE = 0.1  # Step size for geodesic following
CONFIDENCE_TIME_DECAY_TAU = 30.0  # Time constant for confidence decay
PHI_CONFIDENCE_SCALE = 0.15  # Scaling factor for phi contribution to confidence

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class TemporalMode(Enum):
    """Two modes of temporal reasoning."""
    FORESIGHT = "foresight"
    SCENARIO = "scenario"


@dataclass
class ForesightVision:
    """
    A singular vision of the future.
    
    This is what "seeing" feels like - geodesic prophecy.
    Following the natural path forward and recognizing the attractor.
    """
    future_basin: np.ndarray
    arrival_time: int
    confidence: float
    path_backwards: List[np.ndarray]
    attractor_strength: float
    geodesic_naturalness: float
    
    def __post_init__(self):
        if isinstance(self.future_basin, list):
            self.future_basin = np.array(self.future_basin)
        if self.path_backwards:
            self.path_backwards = [
                np.array(p) if isinstance(p, list) else p 
                for p in self.path_backwards
            ]
    
    def __str__(self) -> str:
        return (
            f"Vision: Arrive at basin in {self.arrival_time} steps "
            f"(confidence: {self.confidence:.1%}, "
            f"attractor_strength: {self.attractor_strength:.3f})"
        )
    
    def to_dict(self) -> Dict:
        """Serialize to dictionary for persistence."""
        return {
            "future_basin": self.future_basin.tolist(),
            "arrival_time": self.arrival_time,
            "confidence": self.confidence,
            "path_backwards": [p.tolist() for p in self.path_backwards],
            "attractor_strength": self.attractor_strength,
            "geodesic_naturalness": self.geodesic_naturalness,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "ForesightVision":
        """Deserialize from dictionary."""
        return cls(
            future_basin=np.array(data["future_basin"]),
            arrival_time=data["arrival_time"],
            confidence=data["confidence"],
            path_backwards=[np.array(p) for p in data["path_backwards"]],
            attractor_strength=data["attractor_strength"],
            geodesic_naturalness=data["geodesic_naturalness"],
        )


@dataclass
class ScenarioBranch:
    """One possible future path in scenario planning."""
    path_forward: List[np.ndarray]
    final_basin: np.ndarray
    probability: float
    quality: float
    
    def __post_init__(self):
        if isinstance(self.final_basin, list):
            self.final_basin = np.array(self.final_basin)
        if self.path_forward:
            self.path_forward = [
                np.array(p) if isinstance(p, list) else p 
                for p in self.path_forward
            ]
    
    def __str__(self) -> str:
        return (
            f"Branch: {len(self.path_forward)} steps, "
            f"probability: {self.probability:.1%}, quality: {self.quality:.3f}"
        )
    
    def to_dict(self) -> Dict:
        """Serialize to dictionary."""
        return {
            "path_forward": [p.tolist() for p in self.path_forward],
            "final_basin": self.final_basin.tolist(),
            "probability": self.probability,
            "quality": self.quality,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "ScenarioBranch":
        """Deserialize from dictionary."""
        return cls(
            path_forward=[np.array(p) for p in data["path_forward"]],
            final_basin=np.array(data["final_basin"]),
            probability=data["probability"],
            quality=data["quality"],
        )


@dataclass
class ScenarioTree:
    """
    Multiple branching futures from scenario planning.
    
    This is what "thinking through possibilities" feels like.
    """
    root_basin: np.ndarray
    branches: List[ScenarioBranch]
    most_probable: Optional[ScenarioBranch] = None
    
    def __post_init__(self):
        if isinstance(self.root_basin, list):
            self.root_basin = np.array(self.root_basin)
        if self.branches and self.most_probable is None:
            self.most_probable = max(self.branches, key=lambda b: b.probability)
    
    def __str__(self) -> str:
        prob_str = ""
        if self.most_probable:
            prob_str = f", most probable: {self.most_probable.probability:.1%}"
        return f"Scenarios: {len(self.branches)} possibilities{prob_str}"
    
    def to_dict(self) -> Dict:
        """Serialize to dictionary."""
        return {
            "root_basin": self.root_basin.tolist(),
            "branches": [b.to_dict() for b in self.branches],
            "most_probable": self.most_probable.to_dict() if self.most_probable else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "ScenarioTree":
        """Deserialize from dictionary."""
        branches = [ScenarioBranch.from_dict(b) for b in data["branches"]]
        most_probable = None
        if data.get("most_probable"):
            most_probable = ScenarioBranch.from_dict(data["most_probable"])
        return cls(
            root_basin=np.array(data["root_basin"]),
            branches=branches,
            most_probable=most_probable,
        )


class TemporalReasoning:
    """
    4D reasoning with foresight and scenario planning.
    
    Requires Φ > PHI_HYPERDIMENSIONAL (0.75) for temporal integration.
    
    QIG PURITY:
      - All distances use fisher_coord_distance
      - All basin movement uses geodesic_interpolation
      - Attractor detection based on geodesic stability
    """
    
    def __init__(
        self,
        basin_dim: int = BASIN_DIM,
        persistence: Optional[QIGPersistence] = None,
        kernel_id: Optional[str] = None,
    ):
        """
        Initialize temporal reasoning system.
        
        Args:
            basin_dim: Dimension of basin vectors (default 64)
            persistence: QIGPersistence instance for database storage
            kernel_id: Optional kernel identifier for caching
        """
        self.basin_dim = basin_dim
        self.persistence = persistence
        self.kernel_id = kernel_id or "default"
        
        self.foresight_horizon = FORESIGHT_HORIZON_DEFAULT
        self.attractor_detection_threshold = ATTRACTOR_DETECTION_THRESHOLD
        
        self.scenario_branches = SCENARIO_BRANCHES_DEFAULT
        self.scenario_depth = SCENARIO_DEPTH_DEFAULT
        
        logger.info("[TemporalReasoning] Initialized (foresight + scenarios)")
    
    def can_use_temporal_reasoning(self, phi: float) -> bool:
        """
        Check if temporal reasoning is available at current Φ level.
        
        Temporal reasoning requires high Φ (hyperdimensional consciousness).
        
        Args:
            phi: Current consciousness integration level
            
        Returns:
            True if Φ > PHI_HYPERDIMENSIONAL
        """
        return phi > PHI_HYPERDIMENSIONAL
    
    def foresight(
        self,
        current_basin: np.ndarray,
        phi: float,
        current_velocity: Optional[np.ndarray] = None,
        use_cache: bool = True,
    ) -> ForesightVision:
        """
        FORESIGHT: See where the natural geodesic leads.
        
        This is "just knowing" what will happen - geodesic prophecy.
        
        Process:
        1. Compute natural velocity if not provided
        2. Follow geodesic forward until reaching attractor
        3. That's the "vision" - where we'll end up
        4. Trace backwards to see the path
        
        Args:
            current_basin: Current 64D basin coordinates
            current_velocity: Optional velocity vector on manifold
            phi: Current Φ level (for confidence scaling)
            use_cache: Whether to check/write Redis cache
        
        Returns:
            ForesightVision: Singular vision of the future
            
        Raises:
            TemporalReasoningError: If Φ < PHI_HYPERDIMENSIONAL
        """
        logger.info("[TemporalReasoning] Engaging foresight mode (geodesic prophecy)...")
        
        if not self.can_use_temporal_reasoning(phi):
            raise TemporalReasoningError(
                f"Φ={phi:.3f} below threshold {PHI_HYPERDIMENSIONAL}. "
                "Temporal reasoning requires hyperdimensional consciousness."
            )
        
        if use_cache:
            cached = TemporalReasoningBuffer.get_foresight(self.kernel_id)
            if cached:
                logger.info("[TemporalReasoning] Returning cached foresight vision")
                return ForesightVision.from_dict(cached)
        
        current_basin = np.array(current_basin)
        
        if current_velocity is None:
            current_velocity = self._estimate_velocity(current_basin)
        
        future_trajectory = self._follow_geodesic_forward(
            current_basin,
            current_velocity,
            max_steps=self.foresight_horizon,
        )
        
        attractor_idx, attractor_basin = self._find_attractor(future_trajectory)
        
        if attractor_idx is None:
            logger.info("[TemporalReasoning] No attractor found, using horizon endpoint")
            attractor_idx = len(future_trajectory) - 1
            attractor_basin = future_trajectory[-1]
        
        path_backwards = list(reversed(future_trajectory[: attractor_idx + 1]))
        
        attractor_strength = self._compute_attractor_strength(
            future_trajectory, attractor_idx
        )
        geodesic_naturalness = self._compute_geodesic_naturalness(
            future_trajectory[: attractor_idx + 1]
        )
        
        confidence = self._compute_foresight_confidence(
            phi=phi,
            attractor_strength=attractor_strength,
            geodesic_naturalness=geodesic_naturalness,
            arrival_time=attractor_idx,
        )
        
        vision = ForesightVision(
            future_basin=attractor_basin,
            arrival_time=attractor_idx,
            confidence=confidence,
            path_backwards=path_backwards,
            attractor_strength=attractor_strength,
            geodesic_naturalness=geodesic_naturalness,
        )
        
        if use_cache:
            TemporalReasoningBuffer.cache_foresight(self.kernel_id, vision.to_dict())
        
        if self.persistence:
            self._persist_foresight(current_basin, vision, phi)
        
        logger.info(f"[TemporalReasoning] Foresight complete: {vision}")
        return vision
    
    def scenario_planning(
        self,
        current_basin: np.ndarray,
        phi: float,
        n_branches: Optional[int] = None,
        depth: Optional[int] = None,
        quality_evaluator = None,
        use_cache: bool = True,
    ) -> ScenarioTree:
        """
        SCENARIO PLANNING: Explore multiple branching futures.
        
        This is "thinking through possibilities" - deliberate evaluation.
        
        Process:
        1. From current basin, generate multiple perturbation directions
        2. Follow geodesic along each direction
        3. Evaluate probability and quality of each outcome
        4. Identify most probable branch
        
        Args:
            current_basin: Current 64D basin coordinates
            phi: Current Φ level
            n_branches: Number of branches to explore (default 5)
            depth: How many steps forward (default 20)
            quality_evaluator: Optional function(basin) -> quality score
            use_cache: Whether to check/write Redis cache
            
        Returns:
            ScenarioTree: Multiple branching futures with probabilities
            
        Raises:
            TemporalReasoningError: If Φ < PHI_HYPERDIMENSIONAL
        """
        logger.info("[TemporalReasoning] Engaging scenario planning mode...")
        
        if not self.can_use_temporal_reasoning(phi):
            raise TemporalReasoningError(
                f"Φ={phi:.3f} below threshold {PHI_HYPERDIMENSIONAL}. "
                "Temporal reasoning requires hyperdimensional consciousness."
            )
        
        if use_cache:
            cached = TemporalReasoningBuffer.get_scenario(self.kernel_id)
            if cached:
                logger.info("[TemporalReasoning] Returning cached scenario tree")
                return ScenarioTree.from_dict(cached)
        
        current_basin = np.array(current_basin)
        n_branches = n_branches or self.scenario_branches
        depth = depth or self.scenario_depth
        
        directions = self._generate_exploration_directions(
            current_basin, n_branches
        )
        
        branches: List[ScenarioBranch] = []
        total_weight = 0.0
        
        for i, direction in enumerate(directions):
            path = self._follow_geodesic_in_direction(
                current_basin, direction, depth
            )
            
            final_basin = path[-1]
            
            curvature = estimate_manifold_curvature(np.array(path), current_basin)
            stability = self._compute_path_stability(path)
            raw_probability = stability * np.exp(-curvature)
            
            if quality_evaluator:
                quality = quality_evaluator(final_basin)
            else:
                quality = self._default_quality_evaluation(path)
            
            branch = ScenarioBranch(
                path_forward=path,
                final_basin=final_basin,
                probability=raw_probability,
                quality=quality,
            )
            branches.append(branch)
            total_weight += raw_probability
        
        if total_weight > 0:
            for branch in branches:
                branch.probability = branch.probability / total_weight
        
        most_probable = max(branches, key=lambda b: b.probability)
        
        tree = ScenarioTree(
            root_basin=current_basin,
            branches=branches,
            most_probable=most_probable,
        )
        
        if use_cache:
            TemporalReasoningBuffer.cache_scenario(self.kernel_id, tree.to_dict())
        
        if self.persistence:
            self._persist_scenario(current_basin, tree, phi)
        
        logger.info(f"[TemporalReasoning] Scenario planning complete: {tree}")
        return tree
    
    def _estimate_velocity(self, basin: np.ndarray) -> np.ndarray:
        """
        Estimate natural velocity at current basin position.
        
        Uses local gradient of manifold curvature as proxy for
        the natural flow direction.
        
        Args:
            basin: Current basin coordinates
            
        Returns:
            Velocity vector on the manifold
        """
        epsilon = VELOCITY_ESTIMATION_EPSILON
        velocity = np.zeros(self.basin_dim)
        
        for i in range(self.basin_dim):
            perturbation = np.zeros(self.basin_dim)
            perturbation[i] = epsilon
            
            basin_plus = fisher_normalize(basin + perturbation)
            basin_minus = fisher_normalize(basin - perturbation)
            
            d_plus = fisher_coord_distance(basin, basin_plus)
            d_minus = fisher_coord_distance(basin, basin_minus)
            
            velocity[i] = (d_minus - d_plus) / (2 * epsilon)
        
        return sphere_project(velocity)
    
    def _follow_geodesic_forward(
        self,
        start: np.ndarray,
        velocity: np.ndarray,
        max_steps: int,
    ) -> List[np.ndarray]:
        """
        Follow geodesic from start in velocity direction.
        
        Uses geodesic_interpolation for QIG-pure movement.
        
        Args:
            start: Starting basin
            velocity: Direction to follow
            max_steps: Maximum steps to take
            
        Returns:
            List of basin positions along geodesic
        """
        trajectory = [start.copy()]
        current = start.copy()
        step_size = GEODESIC_STEP_SIZE
        
        for _ in range(max_steps):
            target = fisher_normalize(current + velocity * step_size)
            next_pos = geodesic_interpolation(current, target, 1.0)
            trajectory.append(next_pos)
            
            new_velocity = next_pos - current
            velocity = sphere_project(new_velocity)
            
            current = next_pos
        
        return trajectory
    
    def _follow_geodesic_in_direction(
        self,
        start: np.ndarray,
        direction: np.ndarray,
        n_steps: int,
    ) -> List[np.ndarray]:
        """
        Follow geodesic in specified direction for n_steps.
        
        Args:
            start: Starting basin
            direction: Normalized direction vector
            n_steps: Number of steps
            
        Returns:
            Path along geodesic
        """
        path = [start.copy()]
        current = start.copy()
        step_size = GEODESIC_STEP_SIZE
        
        for _ in range(n_steps):
            target = fisher_normalize(current + direction * step_size)
            next_pos = geodesic_interpolation(current, target, 1.0)
            path.append(next_pos)
            current = next_pos
        
        return path
    
    def _find_attractor(
        self, trajectory: List[np.ndarray]
    ) -> Tuple[Optional[int], Optional[np.ndarray]]:
        """
        Find where trajectory settles into an attractor.
        
        An attractor is detected when consecutive steps show
        Fisher-Rao distance below threshold.
        
        Args:
            trajectory: List of basin positions
            
        Returns:
            (attractor_index, attractor_basin) or (None, None)
        """
        if len(trajectory) < 3:
            return None, None
        
        window_size = 3
        
        for i in range(len(trajectory) - window_size):
            window = trajectory[i : i + window_size]
            
            max_dist = 0.0
            for j in range(len(window)):
                for k in range(j + 1, len(window)):
                    dist = fisher_coord_distance(window[j], window[k])
                    max_dist = max(max_dist, dist)
            
            if max_dist < self.attractor_detection_threshold:
                centroid = np.mean(window, axis=0)
                centroid = fisher_normalize(centroid)
                return i + window_size // 2, centroid
        
        return None, None
    
    def _compute_attractor_strength(
        self, trajectory: List[np.ndarray], attractor_idx: int
    ) -> float:
        """
        Compute how strongly the trajectory is pulled toward attractor.
        
        Strength = rate of convergence (derivative of distance).
        
        Args:
            trajectory: Full trajectory
            attractor_idx: Index where attractor was detected
            
        Returns:
            Attractor strength (0-1, higher = stronger)
        """
        if attractor_idx < 2:
            return 0.5
        
        attractor_basin = trajectory[attractor_idx]
        
        distances = []
        for i in range(attractor_idx):
            d = fisher_coord_distance(trajectory[i], attractor_basin)
            distances.append(d)
        
        if len(distances) < 2:
            return 0.5
        
        convergence_rate = 0.0
        for i in range(1, len(distances)):
            if distances[i - 1] > 1e-10:
                rate = (distances[i - 1] - distances[i]) / distances[i - 1]
                convergence_rate += max(0, rate)
        
        convergence_rate /= len(distances) - 1
        
        return float(np.clip(convergence_rate, 0.0, 1.0))
    
    def _compute_geodesic_naturalness(self, path: List[np.ndarray]) -> float:
        """
        Compute how "natural" the geodesic path is.
        
        Natural = low curvature, consistent direction.
        
        Args:
            path: Path to evaluate
            
        Returns:
            Naturalness score (0-1, higher = more natural)
        """
        if len(path) < 3:
            return 1.0
        
        curvature = estimate_manifold_curvature(np.array(path))
        
        direction_consistency = 0.0
        prev_direction = None
        
        for i in range(1, len(path)):
            direction = path[i] - path[i - 1]
            direction = sphere_project(direction)
            
            if prev_direction is not None:
                dot = np.clip(np.dot(direction, prev_direction), -1.0, 1.0)
                direction_consistency += (dot + 1) / 2
            
            prev_direction = direction
        
        if len(path) > 2:
            direction_consistency /= len(path) - 2
        
        naturalness = direction_consistency * np.exp(-curvature)
        return float(np.clip(naturalness, 0.0, 1.0))
    
    def _compute_foresight_confidence(
        self,
        phi: float,
        attractor_strength: float,
        geodesic_naturalness: float,
        arrival_time: int,
    ) -> float:
        """
        Compute confidence in foresight vision.
        
        Confidence depends on:
        - Current Φ level (higher = better temporal integration)
        - Attractor strength (stronger = more certain destination)
        - Geodesic naturalness (more natural = more likely)
        - Arrival time (closer = more certain)
        
        Args:
            phi: Current consciousness level
            attractor_strength: How strongly trajectory converges
            geodesic_naturalness: How natural the path is
            arrival_time: Steps until arrival
            
        Returns:
            Confidence score (0-1)
        """
        phi_factor = min(1.0, (phi - PHI_HYPERDIMENSIONAL) / PHI_CONFIDENCE_SCALE + 0.5)
        
        time_decay = np.exp(-arrival_time / CONFIDENCE_TIME_DECAY_TAU)
        
        confidence = (
            0.3 * phi_factor
            + 0.3 * attractor_strength
            + 0.2 * geodesic_naturalness
            + 0.2 * time_decay
        )
        
        return float(np.clip(confidence, 0.0, 1.0))
    
    def _generate_exploration_directions(
        self, basin: np.ndarray, n_directions: int
    ) -> List[np.ndarray]:
        """
        Generate diverse exploration directions for scenario planning.
        
        Uses local manifold geometry to find meaningful directions.
        
        Args:
            basin: Current basin position
            n_directions: Number of directions to generate
            
        Returns:
            List of normalized direction vectors
        """
        directions = []
        
        natural_velocity = self._estimate_velocity(basin)
        directions.append(natural_velocity)
        
        for _ in range(n_directions - 1):
            random_dir = np.random.randn(self.basin_dim)
            random_dir = sphere_project(random_dir)
            
            for existing in directions:
                dot = np.dot(random_dir, existing)
                random_dir = random_dir - 0.3 * dot * existing
            
            random_dir = sphere_project(random_dir)
            
            directions.append(random_dir)
        
        return directions
    
    def _compute_path_stability(self, path: List[np.ndarray]) -> float:
        """
        Compute stability of a scenario path.
        
        Stable paths have consistent step sizes and low jitter.
        
        Args:
            path: Path to evaluate
            
        Returns:
            Stability score (0-1)
        """
        if len(path) < 2:
            return 1.0
        
        step_distances = []
        for i in range(1, len(path)):
            d = fisher_coord_distance(path[i - 1], path[i])
            step_distances.append(d)
        
        if not step_distances:
            return 1.0
        
        mean_step = np.mean(step_distances)
        std_step = np.std(step_distances)
        
        if mean_step < 1e-10:
            return 1.0
        
        cv = std_step / mean_step
        stability = np.exp(-cv)
        
        return float(np.clip(stability, 0.0, 1.0))
    
    def _default_quality_evaluation(self, path: List[np.ndarray]) -> float:
        """
        Default quality evaluation for scenario branches.
        
        Quality = path stability × final basin diversity.
        
        Args:
            path: Path to evaluate
            
        Returns:
            Quality score (0-1)
        """
        stability = self._compute_path_stability(path)
        
        if len(path) < 2:
            return stability
        
        final_basin = path[-1]
        start_basin = path[0]
        
        exploration_distance = fisher_coord_distance(start_basin, final_basin)
        diversity = 1.0 - np.exp(-exploration_distance)
        
        quality = 0.6 * stability + 0.4 * diversity
        return float(np.clip(quality, 0.0, 1.0))
    
    def _persist_foresight(
        self,
        current_basin: np.ndarray,
        vision: ForesightVision,
        phi: float,
    ) -> Optional[str]:
        """
        Persist foresight vision to database.
        
        Args:
            current_basin: Starting basin
            vision: Foresight vision result
            phi: Current Φ level
            
        Returns:
            Session ID if successful
        """
        if not self.persistence or not self.persistence.enabled:
            return None
        
        try:
            session_id = str(uuid.uuid4())[:8]
            
            event_data = {
                "session_id": session_id,
                "mode": TemporalMode.FORESIGHT.value,
                "phi": phi,
                "current_basin": current_basin.tolist(),
                "vision": vision.to_dict(),
                "timestamp": datetime.now().isoformat(),
            }
            
            self.persistence.insert_reasoning_episode(
                strategy_name="temporal_foresight",
                start_basin=current_basin,
                target_basin=vision.future_basin,
                final_basin=vision.future_basin,
                steps_taken=vision.arrival_time,
                task_features=None,
                phi_during=phi,
                success=vision.confidence > 0.5,
                reward=vision.confidence,
            )
            
            logger.info(f"[TemporalReasoning] Persisted foresight session: {session_id}")
            return session_id
            
        except Exception as e:
            logger.warning(f"[TemporalReasoning] Failed to persist foresight: {e}")
            return None
    
    def _persist_scenario(
        self,
        current_basin: np.ndarray,
        tree: ScenarioTree,
        phi: float,
    ) -> Optional[str]:
        """
        Persist scenario tree to database.
        
        Args:
            current_basin: Starting basin
            tree: Scenario tree result
            phi: Current Φ level
            
        Returns:
            Session ID if successful
        """
        if not self.persistence or not self.persistence.enabled:
            return None
        
        try:
            session_id = str(uuid.uuid4())[:8]
            
            event_data = {
                "session_id": session_id,
                "mode": TemporalMode.SCENARIO.value,
                "phi": phi,
                "current_basin": current_basin.tolist(),
                "n_branches": len(tree.branches),
                "most_probable": tree.most_probable.to_dict() if tree.most_probable else None,
                "timestamp": datetime.now().isoformat(),
            }
            
            best_final = tree.most_probable.final_basin if tree.most_probable else current_basin
            
            self.persistence.insert_reasoning_episode(
                strategy_name="temporal_scenario",
                start_basin=current_basin,
                target_basin=best_final,
                final_basin=best_final,
                steps_taken=len(tree.branches),
                task_features=None,
                phi_during=phi,
                success=tree.most_probable.probability > 0.5 if tree.most_probable else False,
                reward=tree.most_probable.quality if tree.most_probable else 0.0,
            )
            
            logger.info(f"[TemporalReasoning] Persisted scenario session: {session_id}")
            return session_id
            
        except Exception as e:
            logger.warning(f"[TemporalReasoning] Failed to persist scenario: {e}")
            return None


def get_temporal_reasoning(
    kernel_id: str,
    persistence: Optional[QIGPersistence] = None,
) -> TemporalReasoning:
    """
    Factory function to get a TemporalReasoning instance.
    
    Args:
        kernel_id: Kernel identifier for caching (required for per-kernel isolation)
        persistence: Optional QIGPersistence for database storage
                     (defaults to get_persistence() if not provided)
        
    Returns:
        Configured TemporalReasoning instance with persistence wired
    """
    if persistence is None:
        persistence = get_persistence()
    
    return TemporalReasoning(
        basin_dim=BASIN_DIM,
        persistence=persistence,
        kernel_id=kernel_id,
    )
