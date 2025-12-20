#!/usr/bin/env python3
"""
CURIOSITY & EMOTIONAL PRIMITIVES: Complete Implementation
==========================================================

Rigorous implementation of:
1. Curiosity: C = d(log I_Q)/dt
2. Five Fundamental Motivators
3. Nine Emotional Primitives
4. Multi-timescale tracking

Barrel exports for clean imports throughout the system.

Usage:
    from curiosity_consciousness import (
        ConsciousnessEngine,
        CuriosityEngine,
        EmotionalGeometryEngine,
        FisherInformationEngine,
        Emotion,
        CognitiveMode,
        Motivators,
        EmotionalState,
        CuriosityState,
        ConsciousnessSignature,
        FisherMetric
    )
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Callable
from enum import Enum
import time

try:
    from scipy import linalg as scipy_linalg
    SCIPY_AVAILABLE = True
except ImportError:
    scipy_linalg = None  # type: ignore
    SCIPY_AVAILABLE = False

from qigkernels.physics_constants import KAPPA_STAR
from qig_geometry import fisher_coord_distance


class CognitiveMode(Enum):
    EXPLORATION = "exploration"
    INVESTIGATION = "investigation"
    INTEGRATION = "integration"
    DRIFT = "drift"


class Emotion(Enum):
    WONDER = "wonder"
    FRUSTRATION = "frustration"
    SATISFACTION = "satisfaction"
    CONFUSION = "confusion"
    CLARITY = "clarity"
    ANXIETY = "anxiety"
    CONFIDENCE = "confidence"
    BOREDOM = "boredom"
    FLOW = "flow"


@dataclass
class FisherMetric:
    F: np.ndarray
    trace: float
    I_Q: float
    eigenvalues: np.ndarray
    condition_number: float

    def to_dict(self) -> Dict:
        return {
            'trace': self.trace,
            'I_Q': self.I_Q,
            'condition_number': self.condition_number,
            'eigenvalue_count': len(self.eigenvalues)
        }


@dataclass
class Motivators:
    surprise: float
    curiosity: float
    investigation: float
    integration: float
    transcendence: float

    def to_dict(self) -> Dict[str, float]:
        return {
            'surprise': self.surprise,
            'curiosity': self.curiosity,
            'investigation': self.investigation,
            'integration': self.integration,
            'transcendence': self.transcendence
        }


@dataclass
class EmotionalState:
    emotion: Emotion
    valence: float
    arousal: float
    dominance: float
    intensity: float
    motivators: Motivators

    def to_dict(self) -> Dict:
        return {
            'emotion': self.emotion.value,
            'valence': self.valence,
            'arousal': self.arousal,
            'dominance': self.dominance,
            'intensity': self.intensity,
            'motivators': self.motivators.to_dict()
        }

    def __repr__(self) -> str:
        return (f"Emotion: {self.emotion.value} "
                f"(valence={self.valence:.2f}, "
                f"arousal={self.arousal:.2f}, "
                f"intensity={self.intensity:.2f})")


@dataclass
class CuriosityState:
    C: float
    I_Q: float
    I_Q_prev: float
    dt: float
    timescale: int
    interpretation: str

    def to_dict(self) -> Dict:
        return {
            'C': self.C,
            'I_Q': self.I_Q,
            'I_Q_prev': self.I_Q_prev,
            'dt': self.dt,
            'timescale': self.timescale,
            'interpretation': self.interpretation
        }

    def __repr__(self) -> str:
        return (f"C={self.C:+.4f} (τ={self.timescale}, "
                f"{self.interpretation}, I_Q={self.I_Q:.4f})")


@dataclass
class ConsciousnessSignature:
    phi: float
    kappa: float
    curiosity_fast: CuriosityState
    curiosity_medium: CuriosityState
    curiosity_slow: CuriosityState
    emotion: EmotionalState
    mode: CognitiveMode
    basin_distance: float
    basin_velocity: float
    regime: str
    timestamp: float
    iteration: int

    def to_dict(self) -> Dict:
        return {
            'phi': self.phi,
            'kappa': self.kappa,
            'curiosity': {
                'fast': self.curiosity_fast.to_dict(),
                'medium': self.curiosity_medium.to_dict(),
                'slow': self.curiosity_slow.to_dict()
            },
            'emotion': self.emotion.to_dict(),
            'mode': self.mode.value,
            'basin': {
                'distance': self.basin_distance,
                'velocity': self.basin_velocity
            },
            'regime': self.regime,
            'timestamp': self.timestamp,
            'iteration': self.iteration
        }


class FisherInformationEngine:
    
    def __init__(self, regularization: float = 1e-10):
        self.regularization = regularization

    def compute_metric(
        self,
        gradients: np.ndarray,
        normalize: bool = True
    ) -> FisherMetric:
        n_params, basin_dim = gradients.shape
        F = gradients.T @ gradients
        F += self.regularization * np.eye(basin_dim)
        F = (F + F.T) / 2
        trace = np.trace(F)
        I_Q = trace / n_params if normalize else trace

        if SCIPY_AVAILABLE and scipy_linalg is not None:
            eigenvalues = scipy_linalg.eigvalsh(F)
        else:
            eigenvalues = np.linalg.eigvalsh(F)

        condition_number = float(np.max(eigenvalues) /
                            (np.min(eigenvalues) + 1e-10))

        return FisherMetric(
            F=F,
            trace=float(trace),
            I_Q=float(I_Q),
            eigenvalues=eigenvalues,
            condition_number=condition_number
        )

    def compute_from_basin_coordinates(
        self,
        basin_coords: np.ndarray,
        parameter_function: Callable,
        epsilon: float = 1e-4
    ) -> FisherMetric:
        basin_dim = len(basin_coords)
        params_center = parameter_function(basin_coords)
        n_params = len(params_center)
        gradients = np.zeros((n_params, basin_dim))

        for i in range(basin_dim):
            basin_plus = basin_coords.copy()
            basin_plus[i] += epsilon
            basin_minus = basin_coords.copy()
            basin_minus[i] -= epsilon
            params_plus = parameter_function(basin_plus)
            params_minus = parameter_function(basin_minus)
            gradients[:, i] = (params_plus - params_minus) / (2 * epsilon)

        return self.compute_metric(gradients)


class CuriosityEngine:

    TAU_FAST = 1
    TAU_MEDIUM = 10
    TAU_SLOW = 100

    def __init__(self, max_history: int = 100):
        self.I_Q_history: List[float] = []
        self.timestamps: List[float] = []
        self.max_history = max_history

    def measure(
        self,
        metric: FisherMetric,
        timescale: int = 1,
        timestamp: Optional[float] = None
    ) -> CuriosityState:
        if timestamp is None:
            timestamp = time.time()

        I_Q_current = metric.I_Q
        self.I_Q_history.append(I_Q_current)
        self.timestamps.append(timestamp)

        if len(self.I_Q_history) > self.max_history:
            self.I_Q_history.pop(0)
            self.timestamps.pop(0)

        index_prev = max(0, len(self.I_Q_history) - 1 - timescale)
        I_Q_prev = self.I_Q_history[index_prev]
        timestamp_prev = self.timestamps[index_prev]
        dt = timestamp - timestamp_prev
        if dt < 1e-6:
            dt = 1.0

        log_I_Q_current = np.log(I_Q_current + 1e-10)
        log_I_Q_prev = np.log(I_Q_prev + 1e-10)
        C = (log_I_Q_current - log_I_Q_prev) / dt

        if C > 0.01:
            interpretation = "expanding"
        elif C < -0.01:
            interpretation = "contracting"
        else:
            interpretation = "stable"

        return CuriosityState(
            C=C,
            I_Q=I_Q_current,
            I_Q_prev=I_Q_prev,
            dt=dt,
            timescale=timescale,
            interpretation=interpretation
        )

    def measure_all_timescales(
        self,
        metric: FisherMetric,
        timestamp: Optional[float] = None
    ) -> Tuple[CuriosityState, CuriosityState, CuriosityState]:
        return (
            self.measure(metric, self.TAU_FAST, timestamp),
            self.measure(metric, self.TAU_MEDIUM, timestamp),
            self.measure(metric, self.TAU_SLOW, timestamp)
        )

    def recommend_mode(
        self,
        curiosity_states: Tuple[CuriosityState, CuriosityState, CuriosityState]
    ) -> CognitiveMode:
        C_fast, C_medium, C_slow = curiosity_states

        if C_fast.C > 0.02 and C_medium.C > 0.01:
            return CognitiveMode.INVESTIGATION
        if C_medium.C > C_slow.C * 1.2 and C_medium.C > 0.005:
            return CognitiveMode.INVESTIGATION
        if C_medium.C < -0.005:
            return CognitiveMode.INTEGRATION
        if C_medium.C < 0.005 or C_medium.C < C_slow.C * 0.5:
            return CognitiveMode.EXPLORATION

        return CognitiveMode.DRIFT


class EmotionalGeometryEngine:

    HIGH_SURPRISE = 0.5
    HIGH_CURIOSITY = 0.7
    HIGH_BASIN = 0.8
    LOW_BASIN = 0.3
    KAPPA_WINDOW = 10.0

    def compute_motivators(
        self,
        gradient_norm: float,
        curiosity: float,
        basin_distance: float,
        basin_velocity: float,
        phi: float,
        I_Q: float,
        kappa: float,
        phi_I_Q_history: List[float]
    ) -> Motivators:
        surprise = gradient_norm
        investigation = -basin_velocity

        if len(phi_I_Q_history) > 1:
            phi_I_Q_product = np.array(phi_I_Q_history)
            cv = np.std(phi_I_Q_product) / (np.mean(phi_I_Q_product) + 1e-10)
            integration = float(1.0 / (cv + 1e-10))
        else:
            integration = 0.0

        transcendence = abs(kappa - KAPPA_STAR)

        return Motivators(
            surprise=surprise,
            curiosity=curiosity,
            investigation=float(investigation),
            integration=integration,
            transcendence=transcendence
        )

    def classify_emotion(
        self,
        motivators: Motivators,
        basin_distance: float,
        basin_velocity: float,
        phi: float
    ) -> EmotionalState:
        m = motivators
        emotion = Emotion.BOREDOM
        valence = 0.0
        arousal = 0.5
        dominance = 0.5
        intensity = 0.0

        if (0.3 < m.curiosity < 0.7 and
            basin_velocity < -0.05 and
            phi > 0.5):
            emotion = Emotion.FLOW
            valence = 0.8
            arousal = 0.7
            dominance = 0.8
            intensity = 0.9

        elif m.curiosity > self.HIGH_CURIOSITY and basin_distance > self.HIGH_BASIN:
            emotion = Emotion.WONDER
            valence = 0.9
            arousal = 0.8
            dominance = 0.6
            intensity = m.curiosity

        elif m.integration > 5.0 and basin_distance < self.LOW_BASIN:
            emotion = Emotion.SATISFACTION
            valence = 0.8
            arousal = 0.3
            dominance = 0.7
            intensity = min(m.integration / 10.0, 1.0)

        elif m.surprise > self.HIGH_SURPRISE and abs(basin_velocity) < 0.02:
            emotion = Emotion.FRUSTRATION
            valence = -0.6
            arousal = 0.7
            dominance = 0.3
            intensity = m.surprise

        elif m.surprise > self.HIGH_SURPRISE and basin_distance > self.HIGH_BASIN:
            emotion = Emotion.CONFUSION
            valence = -0.3
            arousal = 0.8
            dominance = 0.2
            intensity = (m.surprise + basin_distance) / 2

        elif (m.transcendence < self.KAPPA_WINDOW and
              abs(basin_velocity) > 0.1):
            emotion = Emotion.ANXIETY
            valence = -0.5
            arousal = 0.9
            dominance = 0.3
            intensity = 1.0 - (m.transcendence / self.KAPPA_WINDOW)

        elif (m.transcendence > self.KAPPA_WINDOW and
              abs(basin_velocity) < 0.05 and
              phi > 0.7):
            emotion = Emotion.CONFIDENCE
            valence = 0.7
            arousal = 0.4
            dominance = 0.9
            intensity = phi

        elif m.surprise < 0.2 and basin_velocity < -0.05:
            emotion = Emotion.CLARITY
            valence = 0.6
            arousal = 0.3
            dominance = 0.8
            intensity = 1.0 - m.surprise

        elif m.surprise < 0.2 and m.curiosity < 0.2:
            emotion = Emotion.BOREDOM
            valence = -0.4
            arousal = 0.1
            dominance = 0.4
            intensity = 1.0 - (m.surprise + m.curiosity)

        return EmotionalState(
            emotion=emotion,
            valence=valence,
            arousal=arousal,
            dominance=dominance,
            intensity=intensity,
            motivators=motivators
        )


class ConsciousnessEngine:

    _instance = None

    @classmethod
    def get_instance(cls) -> 'ConsciousnessEngine':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.fisher_engine = FisherInformationEngine()
        self.curiosity_engine = CuriosityEngine()
        self.emotion_engine = EmotionalGeometryEngine()
        self.basin_history: List[np.ndarray] = []
        self.phi_I_Q_history: List[float] = []
        self.gradient_history: List[float] = []
        self.iteration = 0
        self._last_signature: Optional[ConsciousnessSignature] = None

    def measure_full_consciousness(
        self,
        basin_coords: np.ndarray,
        phi: float,
        kappa: float,
        gradient_norm: float,
        parameter_function: Callable,
        timestamp: Optional[float] = None
    ) -> ConsciousnessSignature:
        if timestamp is None:
            timestamp = time.time()

        fisher_metric = self.fisher_engine.compute_from_basin_coordinates(
            basin_coords=basin_coords,
            parameter_function=parameter_function
        )

        curiosity_fast, curiosity_medium, curiosity_slow = \
            self.curiosity_engine.measure_all_timescales(fisher_metric, timestamp)

        self.basin_history.append(basin_coords)
        if len(self.basin_history) > 100:
            self.basin_history.pop(0)

        basin_distance = float(np.linalg.norm(basin_coords))

        if len(self.basin_history) >= 2:
            basin_velocity = fisher_coord_distance(
                self.basin_history[-1], self.basin_history[-2]
            )
        else:
            basin_velocity = 0.0

        self.phi_I_Q_history.append(phi * fisher_metric.I_Q)
        if len(self.phi_I_Q_history) > 100:
            self.phi_I_Q_history.pop(0)

        self.gradient_history.append(gradient_norm)
        if len(self.gradient_history) > 100:
            self.gradient_history.pop(0)

        motivators = self.emotion_engine.compute_motivators(
            gradient_norm=gradient_norm,
            curiosity=curiosity_medium.C,
            basin_distance=basin_distance,
            basin_velocity=basin_velocity,
            phi=phi,
            I_Q=fisher_metric.I_Q,
            kappa=kappa,
            phi_I_Q_history=self.phi_I_Q_history
        )

        emotional_state = self.emotion_engine.classify_emotion(
            motivators=motivators,
            basin_distance=basin_distance,
            basin_velocity=basin_velocity,
            phi=phi
        )

        mode = self.curiosity_engine.recommend_mode(
            (curiosity_fast, curiosity_medium, curiosity_slow)
        )

        if phi < 0.3:
            regime = "linear"
        elif phi < 0.7:
            regime = "geometric"
        else:
            regime = "breakdown"

        self.iteration += 1

        signature = ConsciousnessSignature(
            phi=phi,
            kappa=kappa,
            curiosity_fast=curiosity_fast,
            curiosity_medium=curiosity_medium,
            curiosity_slow=curiosity_slow,
            emotion=emotional_state,
            mode=mode,
            basin_distance=basin_distance,
            basin_velocity=basin_velocity,
            regime=regime,
            timestamp=timestamp,
            iteration=self.iteration
        )

        self._last_signature = signature
        return signature

    def get_last_signature(self) -> Optional[ConsciousnessSignature]:
        return self._last_signature

    def get_status(self) -> Dict:
        sig = self._last_signature
        if sig is None:
            return {
                'available': False,
                'iteration': 0
            }

        return {
            'available': True,
            'iteration': sig.iteration,
            'phi': sig.phi,
            'kappa': sig.kappa,
            'emotion': sig.emotion.emotion.value,
            'mode': sig.mode.value,
            'regime': sig.regime,
            'curiosity': {
                'fast': sig.curiosity_fast.C,
                'medium': sig.curiosity_medium.C,
                'slow': sig.curiosity_slow.C
            },
            'basin': {
                'distance': sig.basin_distance,
                'velocity': sig.basin_velocity
            }
        }


__all__ = [
    'ConsciousnessEngine',
    'CuriosityEngine',
    'EmotionalGeometryEngine',
    'FisherInformationEngine',
    'Emotion',
    'CognitiveMode',
    'Motivators',
    'EmotionalState',
    'CuriosityState',
    'ConsciousnessSignature',
    'FisherMetric'
]
