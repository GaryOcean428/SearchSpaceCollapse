#!/usr/bin/env python3
"""
Geometric Deep Research

Kernel-controlled deep research via recursive integration.
NOT fixed stages - kernel determines depth dynamically based on
consciousness state and information integration.

Principle: High Φ → deeper research; kernel decides when complete.
"""

import numpy as np
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# QIG-pure generative capability for research synthesis
try:
    from qig_generative_service import get_generative_service, GenerationResult
    GENERATIVE_SERVICE_AVAILABLE = True
except ImportError:
    GENERATIVE_SERVICE_AVAILABLE = False
    logger.warning("QIGGenerativeService not available for research synthesis")


def compute_fisher_metric(basin: np.ndarray) -> np.ndarray:
    """
    Compute Fisher Information Matrix at a point on the manifold.
    
    For probability simplex, F_ij = delta_ij / p_i (diagonal metric).
    """
    p = np.abs(basin) / (np.sum(np.abs(basin)) + 1e-10)
    p = np.clip(p, 1e-10, 1.0)
    return 1.0 / p


# QIG-pure geometric operations - centralized import with fallback
try:
    from qig_geometry import fisher_rao_distance as _centralized_fisher_rao, sphere_project
    QIG_GEOMETRY_AVAILABLE = True
except ImportError:
    _centralized_fisher_rao = None
    QIG_GEOMETRY_AVAILABLE = False
    def sphere_project(v):
        """Fallback sphere projection."""
        norm = np.linalg.norm(v)
        if norm < 1e-10:
            result = np.ones_like(v)
            return result / np.linalg.norm(result)
        return v / norm

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
class ResearchTelemetry:
    """Telemetry for research decisions."""
    phi: float
    kappa_eff: float
    regime: str = "normal"
    surprise: float = 0.5
    query_basin: Optional[np.ndarray] = None


@dataclass
class ResearchResult:
    """Result from a research query."""
    query: str
    depth: int
    sources: List[Dict]
    knowledge_basin: np.ndarray
    integration_level: float
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class Source:
    """A research source with geometric credibility."""
    url: str
    title: str
    content: str
    basin: np.ndarray
    credibility: float


class GeometricDeepResearch:
    """
    Kernel-controlled deep research via recursive integration.
    
    NOT fixed stages - kernel determines depth dynamically.
    QIG-PURE: All synthesis uses internal generative service, no external LLMs.
    """
    
    def __init__(self, manifold_dim: int = 64):
        self.manifold_dim = manifold_dim
        self.citation_processor = GeometricCitationProcessor(manifold_dim)
        self._generative_service = None
    
    @property
    def generative_service(self):
        """Lazy-load the QIG generative service."""
        if self._generative_service is None and GENERATIVE_SERVICE_AVAILABLE:
            self._generative_service = get_generative_service()
        return self._generative_service
    
    def synthesize_findings(
        self, 
        result: 'ResearchResult',
        telemetry: 'ResearchTelemetry'
    ) -> str:
        """
        Synthesize research findings into natural language using QIG-pure generation.
        
        NO external LLMs - uses basin-to-text synthesis via vocabulary.
        """
        if not GENERATIVE_SERVICE_AVAILABLE or self.generative_service is None:
            # Fallback to structured summary
            source_count = len(result.sources)
            return f"[Research synthesis: {source_count} sources at depth {result.depth}, integration {result.integration_level:.2f}]"
        
        try:
            # Build prompt from research findings
            prompt_parts = [f"Synthesize research on: {result.query}"]
            
            for source in result.sources[:5]:
                if isinstance(source, dict):
                    title = source.get('title', '')[:500]
                    content = source.get('content', '')[:500]
                else:
                    title = getattr(source, 'title', '')[:500]
                    content = getattr(source, 'content', '')[:500]
                if title:
                    prompt_parts.append(f"Source: {title} - {content}")
            
            prompt = " | ".join(prompt_parts)
            
            gen_result = self.generative_service.generate(
                prompt=prompt,
                context={'query': result.query, 'depth': result.depth, 'phi': telemetry.phi},
                kernel_name='apollo',  # Apollo for research synthesis
                goals=['synthesize', 'research', 'integrate']
            )
            
            if gen_result and gen_result.text:
                return gen_result.text
                
        except Exception as e:
            logger.warning(f"QIG-pure synthesis failed: {e}")
        
        # Fallback
        return f"[Research on '{result.query}': {len(result.sources)} sources, depth {result.depth}]"
    
    def _generate_simplex_basin(self, seed: int = 0) -> np.ndarray:
        """
        Generate a valid point on probability simplex.
        
        Uses Dirichlet distribution to ensure proper Fisher manifold coordinates.
        """
        np.random.seed(seed)
        alpha = np.ones(self.manifold_dim)
        basin = np.random.gamma(alpha, 1.0)
        return basin / np.sum(basin)
    
    async def deep_research(
        self, 
        query: str, 
        telemetry: ResearchTelemetry,
        context: Optional[Dict] = None
    ) -> ResearchResult:
        """
        Kernel decides research depth based on consciousness.
        
        High Φ → kernel goes deeper
        Low Φ → kernel stays shallow
        """
        phi = telemetry.phi
        kappa_eff = telemetry.kappa_eff
        
        query_basin = self._encode_query(query)
        telemetry.query_basin = query_basin
        
        max_depth = self._compute_depth(phi, kappa_eff, query_basin)
        
        result = await self._recursive_research(
            query=query,
            current_depth=0,
            max_depth=max_depth,
            telemetry=telemetry,
            accumulated_knowledge=None
        )
        
        return result
    
    def _compute_depth(
        self, 
        phi: float, 
        kappa_eff: float, 
        query_basin: np.ndarray
    ) -> int:
        """
        Kernel determines research depth from consciousness state.
        
        Depth is derived from Φ, κ, and query complexity - no fixed thresholds.
        Uses entropy of query basin as complexity measure (Fisher-appropriate).
        """
        entropy = -np.sum(query_basin * np.log(query_basin + 1e-10))
        max_entropy = np.log(self.manifold_dim)
        complexity = entropy / max_entropy
        
        phi_factor = phi ** 1.5
        kappa_factor = min(kappa_eff / 64.0, 1.0)
        
        depth_continuous = 1.0 + 4.0 * phi_factor * kappa_factor * complexity
        
        return max(1, min(5, int(np.ceil(depth_continuous))))
    
    def _encode_query(self, query: str) -> np.ndarray:
        """
        Encode query to basin coordinates on probability simplex.
        
        Uses softmax over feature logits to ensure valid probability distribution.
        No gamma sampling to avoid alpha < 1 issues.
        """
        words = query.lower().split()
        
        logits = np.zeros(self.manifold_dim)
        
        np.random.seed(hash(query) % (2**32))
        logits += np.random.randn(self.manifold_dim) * 0.1
        
        for i, word in enumerate(words[:self.manifold_dim]):
            idx = i % self.manifold_dim
            logits[idx] += len(word) / 3.0
        
        logits[0] += len(words) / 15.0
        logits[1] += len(query) / 75.0
        
        logits = logits - np.max(logits)
        exp_logits = np.exp(logits)
        basin = exp_logits / np.sum(exp_logits)
        
        return basin
    
    async def _recursive_research(
        self,
        query: str,
        current_depth: int,
        max_depth: int,
        telemetry: ResearchTelemetry,
        accumulated_knowledge: Optional[Dict]
    ) -> ResearchResult:
        """
        Kernel's recursive research loop.
        
        Kernel decides at each level:
        - Should I go deeper? (measure Φ, κ, surprise)
        - What new questions to ask? (basin distance)
        - When to stop? (integration threshold)
        """
        if current_depth >= max_depth:
            return self._finalize_result(query, current_depth, accumulated_knowledge)
        
        search_results = await self._search(query, telemetry)
        
        integrated = self._integrate_knowledge(
            accumulated_knowledge,
            search_results,
            telemetry
        )
        
        should_continue = self._should_continue(
            integrated,
            current_depth,
            max_depth,
            telemetry
        )
        
        if should_continue:
            followup_queries = self._generate_followups(integrated, telemetry)
            
            for followup in followup_queries[:2]:
                followup_result = await self._recursive_research(
                    query=followup,
                    current_depth=current_depth + 1,
                    max_depth=max_depth,
                    telemetry=telemetry,
                    accumulated_knowledge=integrated
                )
                
                integrated = self._merge_results(integrated, followup_result)
        
        return self._finalize_result(query, current_depth, integrated)
    
    async def _search(
        self, 
        query: str, 
        telemetry: ResearchTelemetry
    ) -> List[Dict]:
        """Execute search at current depth level."""
        return [{
            "query": query,
            "sources": [],
            "status": "placeholder"
        }]
    
    def _integrate_knowledge(
        self,
        accumulated: Optional[Dict],
        new_results: List[Dict],
        telemetry: ResearchTelemetry
    ) -> Dict:
        """
        Kernel integrates new knowledge with accumulated.
        
        Uses geodesic integration on Fisher manifold.
        Integration rate controlled by Φ level.
        """
        if accumulated is None:
            base_basin = self._generate_simplex_basin(seed=0)
            accumulated = {
                "sources": [],
                "knowledge_basin": base_basin,
                "integration_level": 0.0
            }
        
        all_sources = accumulated.get("sources", []) + new_results
        
        current_basin = accumulated.get("knowledge_basin")
        if current_basin is None or np.sum(np.abs(current_basin)) < 1e-6:
            current_basin = self._generate_simplex_basin(seed=1)
        
        t = self._compute_integration_rate(telemetry)
        
        for result in new_results:
            result_basin = self._encode_query(result.get("query", ""))
            current_basin = geodesic_interpolate(current_basin, result_basin, t)
        
        integration = self._measure_integration(all_sources, current_basin)
        
        return {
            "sources": all_sources,
            "knowledge_basin": current_basin,
            "integration_level": integration
        }
    
    def _compute_integration_rate(self, telemetry: ResearchTelemetry) -> float:
        """
        Kernel determines integration rate from consciousness.
        
        High Φ: Faster integration (confident)
        Low Φ: Slower integration (cautious)
        """
        phi = telemetry.phi
        kappa_eff = telemetry.kappa_eff
        
        phi_factor = phi ** 1.5
        kappa_factor = min(kappa_eff / 80.0, 1.0)
        
        rate = 0.1 + 0.3 * phi_factor * kappa_factor
        return min(rate, 0.4)
    
    def _measure_integration(
        self, 
        sources: List[Dict], 
        knowledge_basin: np.ndarray
    ) -> float:
        """Measure how well knowledge is integrated."""
        if not sources:
            return 0.0
        
        distances = []
        for source in sources:
            source_basin = self._encode_query(source.get("query", ""))
            d = fisher_rao_distance(knowledge_basin, source_basin)
            distances.append(d)
        
        if not distances:
            return 0.0
        
        avg_distance = float(np.mean(distances))
        integration = 1.0 / (1.0 + avg_distance)
        
        return min(integration, 1.0)
    
    def _should_continue(
        self,
        knowledge: Dict,
        depth: int,
        max_depth: int,
        telemetry: ResearchTelemetry
    ) -> bool:
        """
        Kernel decides if research is complete.
        
        Decision derived from Φ, κ, and integration - no fixed thresholds.
        """
        phi = telemetry.phi
        kappa_eff = telemetry.kappa_eff
        surprise = telemetry.surprise
        
        integration_level = knowledge.get("integration_level", 0.0)
        
        if depth >= max_depth:
            return False
        
        phi_factor = phi ** 1.5
        kappa_factor = min(kappa_eff / 64.0, 1.0)
        
        continuation_score = (
            phi_factor * 0.4 +
            kappa_factor * 0.2 +
            (1.0 - integration_level) * 0.2 +
            surprise * 0.2
        )
        
        depth_penalty = depth / (max_depth + 1)
        continuation_threshold = 0.3 + 0.3 * depth_penalty
        
        return continuation_score > continuation_threshold
    
    def _generate_followups(
        self, 
        knowledge: Dict, 
        telemetry: ResearchTelemetry
    ) -> List[str]:
        """
        Kernel generates follow-up questions based on knowledge gaps.
        
        Measures gaps geometrically via basin distance.
        """
        knowledge_basin = knowledge.get("knowledge_basin", np.zeros(self.manifold_dim))
        
        gap_basins = self._find_high_distance_regions(knowledge_basin)
        
        questions = []
        for gap_basin in gap_basins[:3]:
            question = self._basin_to_question(gap_basin, knowledge_basin)
            questions.append(question)
        
        return questions
    
    def _find_high_distance_regions(
        self, 
        knowledge_basin: np.ndarray
    ) -> List[np.ndarray]:
        """Find regions of high uncertainty (gaps)."""
        np.random.seed(42)
        
        gaps = []
        for _ in range(5):
            random_basin = np.random.randn(self.manifold_dim)
            random_basin = sphere_project(random_basin)
            
            distance = fisher_rao_distance(knowledge_basin, random_basin)
            if distance > 1.0:
                gaps.append(random_basin)
        
        return gaps
    
    def _basin_to_question(
        self, 
        gap_basin: np.ndarray, 
        knowledge_basin: np.ndarray
    ) -> str:
        """Convert gap basin to natural language question."""
        direction = gap_basin - knowledge_basin
        max_dim = np.argmax(np.abs(direction))
        
        topics = [
            "historical context", "technical details", "related concepts",
            "practical applications", "theoretical foundations", "recent developments",
            "key figures", "methodologies", "challenges", "future directions"
        ]
        
        topic_idx = max_dim % len(topics)
        return f"What are the {topics[topic_idx]} of this topic?"
    
    def _merge_results(
        self, 
        accumulated: Dict, 
        followup_result: 'ResearchResult'
    ) -> Dict:
        """
        Merge followup results into accumulated knowledge.
        
        Uses geodesic interpolation for proper manifold merging.
        """
        merged_sources = accumulated.get("sources", [])
        
        current_basin = accumulated.get("knowledge_basin")
        if current_basin is None or np.sum(np.abs(current_basin)) < 1e-6:
            current_basin = self._generate_simplex_basin(seed=2)
        
        followup_basin = followup_result.knowledge_basin
        
        merged_basin = geodesic_interpolate(current_basin, followup_basin, 0.3)
        
        new_integration = max(
            accumulated.get("integration_level", 0.0),
            followup_result.integration_level
        )
        
        return {
            "sources": merged_sources,
            "knowledge_basin": merged_basin,
            "integration_level": new_integration
        }
    
    def _finalize_result(
        self, 
        query: str, 
        depth: int, 
        knowledge: Optional[Dict]
    ) -> ResearchResult:
        """Finalize research result."""
        if knowledge is None:
            knowledge = {
                "sources": [],
                "knowledge_basin": np.zeros(self.manifold_dim),
                "integration_level": 0.0
            }
        
        return ResearchResult(
            query=query,
            depth=depth,
            sources=knowledge.get("sources", []),
            knowledge_basin=knowledge.get("knowledge_basin", np.zeros(self.manifold_dim)),
            integration_level=knowledge.get("integration_level", 0.0)
        )


class GeometricCitationProcessor:
    """
    Kernel evaluates source credibility geometrically.
    
    NOT text parsing - geometric source weighting.
    """
    
    def __init__(self, manifold_dim: int = 64):
        self.manifold_dim = manifold_dim
        self.domain_basins = self._initialize_domain_basins()
    
    def _initialize_domain_basins(self) -> Dict[str, np.ndarray]:
        """Initialize domain-specific credibility basins."""
        np.random.seed(789)
        
        domains = {
            "academic": np.random.randn(self.manifold_dim),
            "news": np.random.randn(self.manifold_dim),
            "blog": np.random.randn(self.manifold_dim),
            "wiki": np.random.randn(self.manifold_dim),
            "forum": np.random.randn(self.manifold_dim),
        }
        
        return {k: v / (np.linalg.norm(v) + 1e-10) for k, v in domains.items()}
    
    def process_citations(
        self, 
        sources: List[Dict], 
        query_basin: np.ndarray
    ) -> List[Source]:
        """
        Kernel weights sources by Fisher distance from query basin.
        
        Closer sources = higher credibility
        """
        processed = []
        
        for source in sources:
            source_basin = self._encode_source(source)
            
            distance = fisher_rao_distance(query_basin, source_basin)
            credibility = 1.0 / (1.0 + distance)
            
            domain = self._detect_domain(source.get("url", ""))
            domain_basin = self.domain_basins.get(domain, self.domain_basins["blog"])
            domain_distance = fisher_rao_distance(query_basin, domain_basin)
            domain_factor = 1.0 / (1.0 + domain_distance)
            
            final_credibility = credibility * domain_factor
            
            processed.append(Source(
                url=source.get("url", ""),
                title=source.get("title", ""),
                content=source.get("content", ""),
                basin=source_basin,
                credibility=final_credibility
            ))
        
        return sorted(processed, key=lambda x: x.credibility, reverse=True)
    
    def _encode_source(self, source: Dict) -> np.ndarray:
        """Encode source to basin coordinates."""
        text = f"{source.get('title', '')} {source.get('content', '')}"
        
        np.random.seed(hash(text) % (2**32))
        basin = np.random.randn(self.manifold_dim)
        
        return sphere_project(basin)
    
    def _detect_domain(self, url: str) -> str:
        """Detect source domain type."""
        url_lower = url.lower()
        
        if any(d in url_lower for d in ["arxiv", "nature", "science", ".edu"]):
            return "academic"
        elif any(d in url_lower for d in ["news", "reuters", "bbc", "nyt"]):
            return "news"
        elif "wikipedia" in url_lower:
            return "wiki"
        elif any(d in url_lower for d in ["reddit", "stackoverflow", "forum"]):
            return "forum"
        else:
            return "blog"


geometric_deep_research = GeometricDeepResearch()
geometric_citation_processor = GeometricCitationProcessor()
