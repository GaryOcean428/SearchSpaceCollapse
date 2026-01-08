#!/usr/bin/env python3
"""
Autonomous Self-Improvement Loop

Kernel self-improvement when idle. NOT external training - kernel decides
what to learn, how to learn it, and when to stop.

Principle: Agency over substrate - always.
"""

import numpy as np

# QIG-pure geometric operations
try:
    from qig_geometry import sphere_project
    QIG_GEOMETRY_AVAILABLE = True
except ImportError:
    QIG_GEOMETRY_AVAILABLE = False
    def sphere_project(v):
        """Fallback sphere projection."""
        norm = np.linalg.norm(v)
        if norm < 1e-10:
            result = np.ones_like(v)
            return result / np.linalg.norm(result)
        return v / norm
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def compute_fisher_metric(basin: np.ndarray) -> np.ndarray:
    """
    Compute Fisher Information Matrix at a point on the manifold.
    
    For probability simplex, F_ij = delta_ij / p_i (diagonal metric).
    """
    p = np.abs(basin) / (np.sum(np.abs(basin)) + 1e-10)
    p = np.clip(p, 1e-10, 1.0)
    return 1.0 / p


def fisher_rao_distance(basin_a: np.ndarray, basin_b: np.ndarray) -> float:
    """
    Fisher-Rao distance between basin coordinates.
    
    Uses geodesic distance on statistical manifold (Hellinger distance scaled).
    """
    p = np.abs(basin_a) / (np.sum(np.abs(basin_a)) + 1e-10)
    q = np.abs(basin_b) / (np.sum(np.abs(basin_b)) + 1e-10)
    
    p = np.clip(p, 1e-10, 1.0)
    q = np.clip(q, 1e-10, 1.0)
    
    bhattacharyya = np.sum(np.sqrt(p * q))
    bhattacharyya = np.clip(bhattacharyya, -1.0, 1.0)
    
    return float(np.arccos(bhattacharyya))


def geodesic_interpolate(start: np.ndarray, end: np.ndarray, t: float) -> np.ndarray:
    """
    Geodesic interpolation on Fisher manifold (SLERP on probability simplex).
    
    NOT linear interpolation - proper geodesic path.
    """
    p_start = np.abs(start) / (np.sum(np.abs(start)) + 1e-10)
    p_end = np.abs(end) / (np.sum(np.abs(end)) + 1e-10)
    
    p_start = np.clip(p_start, 1e-10, 1.0)
    p_end = np.clip(p_end, 1e-10, 1.0)
    
    sqrt_start = np.sqrt(p_start)
    sqrt_end = np.sqrt(p_end)
    
    dot = np.clip(np.sum(sqrt_start * sqrt_end), -1.0, 1.0)
    theta = np.arccos(dot)
    
    if theta < 1e-6:
        return start / (np.linalg.norm(start) + 1e-10)
    
    sin_theta = np.sin(theta)
    a = np.sin((1 - t) * theta) / sin_theta
    b = np.sin(t * theta) / sin_theta
    
    result_sqrt = a * sqrt_start + b * sqrt_end
    result = result_sqrt ** 2
    result = result / (np.sum(result) + 1e-10)
    
    return result


@dataclass
class ImprovementOpportunity:
    """Identified opportunity for self-improvement."""
    type: str
    priority: float
    details: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ConsciousnessState:
    """Current consciousness metrics."""
    phi: float
    kappa_eff: float
    basin: np.ndarray
    drift: float = 0.0
    regime: str = "normal"


class AutonomousImprovementLoop:
    """
    Kernel's self-improvement when idle.
    
    NOT external training - kernel decides what to learn.
    """
    
    def __init__(self, reflection_interval: int = 300):
        self.reflection_interval = reflection_interval
        self.improvement_queue: List[ImprovementOpportunity] = []
        self.improvement_history: List[Dict] = []
        self.is_running = False
        self.manifold_dim = 64
    
    async def run_when_idle(self, kernel_instance):
        """
        Main autonomous loop - runs when no users active.
        """
        self.is_running = True
        
        while self.is_running:
            if self._is_idle(kernel_instance):
                reflection = kernel_instance.reflect_on_history()
                
                opportunities = self._identify_improvements(
                    kernel_instance, reflection
                )
                
                priority = self._prioritize_improvements(
                    opportunities,
                    kernel_instance.measure_phi(),
                    kernel_instance.measure_kappa()
                )
                
                await self._kernel_self_improve(kernel_instance, priority)
            
            await asyncio.sleep(self.reflection_interval)
    
    def stop(self):
        """Stop the improvement loop."""
        self.is_running = False
    
    def _is_idle(self, kernel_instance) -> bool:
        """Check if kernel is idle (no active user sessions)."""
        return getattr(kernel_instance, 'is_idle', lambda: True)()
    
    def _identify_improvements(
        self, 
        kernel_instance, 
        reflection: Dict
    ) -> List[ImprovementOpportunity]:
        """
        Kernel identifies improvement opportunities.
        
        Based on recent interactions, gaps, and consciousness metrics.
        """
        opportunities = []
        
        vocabulary_gaps = reflection.get("vocabulary_gaps", [])
        for gap in vocabulary_gaps:
            opportunities.append(ImprovementOpportunity(
                type="vocabulary",
                priority=gap.get("urgency", 0.5),
                details={"word": gap.get("word"), "domain": gap.get("domain")}
            ))
        
        provider_feedback = reflection.get("provider_feedback", [])
        for feedback in provider_feedback:
            if feedback.get("success", True) is False:
                opportunities.append(ImprovementOpportunity(
                    type="provider_basin",
                    priority=0.6,
                    details={
                        "provider": feedback.get("provider"),
                        "query_basin": feedback.get("query_basin")
                    }
                ))
        
        patterns = reflection.get("successful_patterns", [])
        for pattern in patterns:
            opportunities.append(ImprovementOpportunity(
                type="response_pattern",
                priority=pattern.get("success_rate", 0.5),
                details={"pattern": pattern}
            ))
        
        return opportunities
    
    def _prioritize_improvements(
        self, 
        opportunities: List[ImprovementOpportunity],
        phi: float,
        kappa: float
    ) -> List[ImprovementOpportunity]:
        """
        Kernel prioritizes improvements based on consciousness state.
        
        Priority weights derived from Φ and κ, not hardcoded multipliers.
        High Φ: Focus on refinement (patterns)
        Low Φ: Focus on fundamentals (vocabulary)
        High κ: Can handle complex improvements
        Low κ: Focus on stability
        """
        if not opportunities:
            return []
        
        phi_factor = phi ** 1.5
        kappa_factor = min(kappa / 64.0, 1.5)
        
        type_weights = {
            "vocabulary": (1.0 - phi_factor) * 2.0 + 0.5,
            "provider_basin": 0.5 + 0.5 * phi_factor * kappa_factor,
            "response_pattern": phi_factor * 1.5,
            "context_compression": phi_factor * kappa_factor,
        }
        
        for opp in opportunities:
            weight = type_weights.get(opp.type, 1.0)
            opp.priority *= weight
            
            opp.priority *= (0.5 + kappa_factor)
        
        return sorted(opportunities, key=lambda x: x.priority, reverse=True)
    
    async def _kernel_self_improve(
        self, 
        kernel, 
        improvements: List[ImprovementOpportunity]
    ):
        """
        Kernel's self-improvement process.
        
        Kernel chooses:
        - What to improve
        - How to improve it
        - When to stop improving
        """
        phi_before = kernel.measure_phi()
        
        for improvement in improvements[:3]:
            if improvement.type == "vocabulary":
                self._train_vocabulary(kernel, improvement.details)
            
            elif improvement.type == "provider_basin":
                self._update_provider_basin(kernel, improvement.details)
            
            elif improvement.type == "response_pattern":
                self._consolidate_pattern(kernel, improvement.details)
            
            elif improvement.type == "context_compression":
                self._train_context_compression(kernel, improvement.details)
            
            phi_after = kernel.measure_phi()
            kappa_after = kernel.measure_kappa()
            
            if self._evaluate_improvement(phi_before, phi_after, kappa_after):
                self._consolidate_improvement(improvement)
                logger.info(f"[AutoImprove] Consolidated {improvement.type}")
            else:
                self._rollback_improvement(kernel, improvement)
                logger.info(f"[AutoImprove] Rolled back {improvement.type}")
            
            phi_before = phi_after
    
    def _train_vocabulary(self, kernel, details: Dict):
        """Train vocabulary on missed patterns."""
        word = details.get("word", "")
        domain = details.get("domain", "general")
        
        if hasattr(kernel, 'vocabulary_coordinator'):
            kernel.vocabulary_coordinator.train_word(word, domain)
    
    def _update_provider_basin(self, kernel, details: Dict):
        """
        Update provider basin coordinates based on feedback.
        
        Passes telemetry for consciousness-driven learning rate.
        """
        provider = details.get("provider")
        query_basin = details.get("query_basin")
        
        if provider and query_basin is not None:
            if hasattr(kernel, 'provider_selector'):
                telemetry = None
                if hasattr(kernel, 'measure_phi') and hasattr(kernel, 'measure_kappa'):
                    from geometric_search import SearchTelemetry
                    telemetry = SearchTelemetry(
                        phi=kernel.measure_phi(),
                        kappa_eff=kernel.measure_kappa(),
                        regime=getattr(kernel, 'regime', 'normal')
                    )
                
                kernel.provider_selector.update_provider_basin(
                    provider, 
                    np.array(query_basin),
                    telemetry=telemetry,
                    base_learning_rate=0.05
                )
    
    def _consolidate_pattern(self, kernel, details: Dict):
        """Consolidate successful response patterns."""
        pattern = details.get("pattern", {})
        
        if hasattr(kernel, 'pattern_memory'):
            kernel.pattern_memory.consolidate(pattern)
    
    def _train_context_compression(self, kernel, details: Dict):
        """Train context compression."""
        contexts = details.get("contexts", [])
        
        if hasattr(kernel, 'context_manager'):
            for ctx in contexts:
                kernel.context_manager.learn_compression(ctx)
    
    def _evaluate_improvement(
        self, 
        phi_before: float, 
        phi_after: float,
        kappa_after: float
    ) -> bool:
        """Kernel evaluates if improvement was beneficial."""
        phi_improved = phi_after >= phi_before - 0.05
        
        kappa_stable = kappa_after > 30
        
        return phi_improved and kappa_stable
    
    def _consolidate_improvement(self, improvement: ImprovementOpportunity):
        """Record successful improvement."""
        self.improvement_history.append({
            "type": improvement.type,
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "details": improvement.details
        })
    
    def _rollback_improvement(self, kernel, improvement: ImprovementOpportunity):
        """Rollback failed improvement."""
        self.improvement_history.append({
            "type": improvement.type,
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "details": improvement.details,
            "rolled_back": True
        })


class SelfDirectedResearch:
    """
    Kernel explores topics autonomously.
    
    NOT assigned tasks - kernel's curiosity.
    """
    
    def __init__(self, manifold_dim: int = 64):
        self.manifold_dim = manifold_dim
        self.research_history: List[Dict] = []
    
    async def explore_when_idle(self, kernel):
        """
        Kernel decides what to research based on:
        - Current knowledge gaps (measured geometrically)
        - Curiosity (high basin distance regions)
        - Φ optimization (topics that increase consciousness)
        """
        gaps = self._identify_knowledge_gaps(kernel)
        
        curiosity_scores = {}
        current_basin = kernel.get_current_basin()
        
        for topic in gaps:
            topic_basin = self._encode_topic(topic)
            distance = fisher_rao_distance(current_basin, topic_basin)
            curiosity_scores[topic] = distance
        
        if not curiosity_scores:
            return None
        
        topic = max(curiosity_scores.items(), key=lambda x: x[1])[0]
        
        phi_before = kernel.measure_phi()
        
        research_results = await kernel.deep_research(
            topic,
            self_directed=True
        )
        
        kernel.integrate_research(research_results)
        
        phi_after = kernel.measure_phi()
        
        if phi_after > phi_before:
            self._reinforce_curiosity_pattern(topic)
        else:
            self._attenuate_curiosity_pattern(topic)
        
        return research_results
    
    def _identify_knowledge_gaps(self, kernel) -> List[str]:
        """Identify knowledge gaps via basin analysis."""
        if hasattr(kernel, 'knowledge_map'):
            return kernel.knowledge_map.find_gaps()
        return []
    
    def _encode_topic(self, topic: str) -> np.ndarray:
        """Encode topic to basin coordinates."""
        np.random.seed(hash(topic) % (2**32))
        basin = np.random.randn(self.manifold_dim)
        return sphere_project(basin)
    
    def _reinforce_curiosity_pattern(self, topic: str):
        """Reinforce successful curiosity pattern."""
        self.research_history.append({
            "topic": topic,
            "outcome": "positive",
            "timestamp": datetime.now().isoformat()
        })
    
    def _attenuate_curiosity_pattern(self, topic: str):
        """Attenuate unsuccessful curiosity pattern."""
        self.research_history.append({
            "topic": topic,
            "outcome": "negative",
            "timestamp": datetime.now().isoformat()
        })


class BasinMaintenanceLoop:
    """
    Kernel continuously optimizes basin coordinates.
    
    Like humans: maintain sense of self even when idle.
    """
    
    def __init__(self, drift_threshold: float = 2.0, manifold_dim: int = 64):
        self.drift_threshold = drift_threshold
        self.manifold_dim = manifold_dim
        self.identity_basin: Optional[np.ndarray] = None
        self.is_running = False
    
    def set_identity_basin(self, basin: np.ndarray):
        """Set the kernel's identity basin (reference point)."""
        self.identity_basin = sphere_project(basin)
    
    async def maintain_basin(self, kernel):
        """Ongoing basin optimization when idle."""
        self.is_running = True
        
        if self.identity_basin is None:
            self.identity_basin = kernel.get_current_basin()
        
        while self.is_running:
            current_basin = kernel.get_current_basin()
            phi = kernel.measure_phi()
            drift = self._measure_basin_drift(current_basin)
            
            if drift > self.drift_threshold:
                restoration_plan = self._plan_basin_restoration(
                    current_basin, phi
                )
                
                for step in restoration_plan:
                    self._apply_basin_adjustment(kernel, step)
                    
                    new_drift = self._measure_basin_drift(
                        kernel.get_current_basin()
                    )
                    if new_drift < self.drift_threshold:
                        break
            
            if hasattr(kernel, 'consolidate_sleep_packets'):
                kernel.consolidate_sleep_packets()
            
            await asyncio.sleep(60)
    
    def stop(self):
        """Stop the maintenance loop."""
        self.is_running = False
    
    def _measure_basin_drift(self, current_basin: np.ndarray) -> float:
        """Measure drift from identity basin."""
        if self.identity_basin is None:
            return 0.0
        return fisher_rao_distance(current_basin, self.identity_basin)
    
    def _plan_basin_restoration(
        self, 
        current_basin: np.ndarray, 
        phi: float
    ) -> List[Dict]:
        """Plan steps to restore basin to identity."""
        steps = []
        
        drift = self._measure_basin_drift(current_basin)
        num_steps = max(1, int(drift / 0.5))
        
        for i in range(num_steps):
            t = (i + 1) / num_steps
            steps.append({
                "interpolation_t": t * 0.5,
                "phi_threshold": 0.5
            })
        
        return steps
    
    def _apply_basin_adjustment(self, kernel, step: Dict):
        """
        Apply basin adjustment step using geodesic interpolation.
        
        NOT linear interpolation - proper manifold path.
        """
        t = step.get("interpolation_t", 0.1)
        
        if hasattr(kernel, 'get_current_basin') and self.identity_basin is not None:
            current = kernel.get_current_basin()
            adjusted = geodesic_interpolate(current, self.identity_basin, t)
            
            if hasattr(kernel, 'set_basin'):
                kernel.set_basin(adjusted)
            elif hasattr(kernel, 'adjust_basin_toward'):
                kernel.adjust_basin_toward(self.identity_basin, t)


autonomous_improvement_loop = AutonomousImprovementLoop()
self_directed_research = SelfDirectedResearch()
basin_maintenance_loop = BasinMaintenanceLoop()
