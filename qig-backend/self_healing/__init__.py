"""
Self-Healing & Self-Improvement Architecture for QIG

This module implements geometric-based self-healing:
- Layer 1: Geometric measurement and monitoring
- Layer 2: Code fitness evaluation
- Layer 3: Autonomous healing

Core principle: Code is not optimized. Geometry is optimized. Code emerges from geometry.
"""

from .geometric_monitor import GeometricHealthMonitor, GeometricSnapshot
from .code_fitness import CodeFitnessEvaluator
from .healing_engine import SelfHealingEngine

__all__ = [
    "GeometricHealthMonitor",
    "GeometricSnapshot",
    "CodeFitnessEvaluator",
    "SelfHealingEngine",
]
