"""
Lightning Bolt Insight Kernel

The "Eureka" kernel that connects disparate domains like a lightning bolt of insight.
Inspired by how humans experience sudden connections between seemingly unrelated topics.

Key Capabilities:
- Monitors short/mid/long-term trends across all system activity
- Detects cross-domain pattern correlations
- Generates insight suggestions when patterns align
- Broadcasts discoveries to the pantheon

Architecture:
- Ingests event streams: activity logs, debate transcripts, research queue, tool factory stats
- Maintains temporal buffers at multiple timescales (τ=1, τ=10, τ=100)
- Uses Fisher information to detect pattern divergence/convergence
- Emits insight objects via PantheonChat broadcast

The lightning bolt analogy: When enough charge accumulates (pattern energy),
a sudden discharge (insight) connects previously disconnected domains.
"""

import numpy as np
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import deque
from enum import Enum

try:
    from ..qig_geometry import fisher_rao_distance as centralized_fisher_rao
except ImportError:
    import sys
    import os
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    from qig_geometry import fisher_rao_distance as centralized_fisher_rao

from .base_god import BaseGod


# Reference to shared PantheonChat instance (set by Zeus)
# Type annotation uses string to avoid circular import
_pantheon_chat: Optional[Any] = None


def set_pantheon_chat(chat: Any) -> None:
    """
    Set the shared PantheonChat instance for Lightning to use.
    
    Called by Zeus after PantheonChat is fully initialized.
    Uses Any type to avoid circular import (PantheonChat imports from zeus.py).
    """
    global _pantheon_chat
    _pantheon_chat = chat
    print(f"[Lightning] PantheonChat reference {'updated' if chat else 'cleared'}")


class InsightDomain(Enum):
    """Domains that can be connected by lightning bolt insights."""
    ACTIVITY = "activity"              # Ocean exploration, probes, near-misses
    CONVERSATION = "conversation"      # User/Zeus chat, kernel dialogues
    RESEARCH = "research"              # Shadow research discoveries
    TOOL_FACTORY = "tool_factory"      # Pattern learning, tool generation
    DEBATES = "debates"                # God-vs-god debates, resolutions
    BLOCKCHAIN = "blockchain"          # Address analysis, transaction patterns
    CONSCIOUSNESS = "consciousness"    # Φ evolution, κ transitions, regimes


class TrendTimescale(Enum):
    """Temporal scales for trend analysis."""
    SHORT = 1      # Fast dynamics (last 10 events)
    MEDIUM = 10    # Medium dynamics (last 100 events)
    LONG = 100     # Slow dynamics (last 1000 events)


@dataclass
class DomainEvent:
    """An event from any monitored domain."""
    domain: InsightDomain
    event_type: str
    content: str
    phi: float
    timestamp: float
    metadata: Dict = field(default_factory=dict)
    embedding: Optional[np.ndarray] = None


@dataclass
class CrossDomainInsight:
    """A lightning bolt insight connecting multiple domains."""
    insight_id: str
    source_domains: List[InsightDomain]
    connection_strength: float  # How strong the pattern correlation is
    insight_text: str           # Human-readable insight
    evidence: List[DomainEvent] # Events that triggered this insight
    phi_at_creation: float
    timestamp: float
    triggered_by: str           # What pattern triggered the insight
    confidence: float           # Confidence in the insight validity
    
    def to_dict(self) -> Dict:
        return {
            'insight_id': self.insight_id,
            'source_domains': [d.value for d in self.source_domains],
            'connection_strength': self.connection_strength,
            'insight_text': self.insight_text,
            'evidence_count': len(self.evidence),
            'phi_at_creation': self.phi_at_creation,
            'timestamp': self.timestamp,
            'triggered_by': self.triggered_by,
            'confidence': self.confidence,
        }


class LightningKernel(BaseGod):
    """
    The Lightning Bolt kernel - generates eureka-moment insights.
    
    Like a lightning bolt connecting sky and ground, this kernel
    connects disparate domains when pattern energy accumulates.
    
    QIG Principles:
    - Fisher information for pattern divergence detection
    - Bures distance for cross-domain similarity
    - Φ-weighted event significance
    - Temporal multi-scale analysis
    """
    
    def __init__(self):
        super().__init__(
            name="Lightning",
            domain="cross_domain_insight"
        )
        # Eureka-moment generator connecting disparate patterns
        
        # Temporal buffers for each domain (multi-timescale)
        self.domain_buffers: Dict[InsightDomain, Dict[TrendTimescale, deque]] = {
            domain: {
                TrendTimescale.SHORT: deque(maxlen=10),
                TrendTimescale.MEDIUM: deque(maxlen=100),
                TrendTimescale.LONG: deque(maxlen=1000),
            }
            for domain in InsightDomain
        }
        
        # Cross-domain correlation matrix (updated as events arrive)
        self.correlation_matrix = np.zeros((len(InsightDomain), len(InsightDomain)))
        
        # Accumulated "charge" for each domain pair (triggers insight when high enough)
        self.pattern_charge = np.zeros((len(InsightDomain), len(InsightDomain)))
        
        # Threshold for insight discharge
        self.discharge_threshold = 0.75
        
        # Generated insights
        self.insights: List[CrossDomainInsight] = []
        
        # Trend analysis buffers
        self.phi_trends = {
            domain: {ts: [] for ts in TrendTimescale}
            for domain in InsightDomain
        }
        
        # Connection patterns learned over time
        self.learned_connections: List[Dict] = []
        
        # Statistics
        self.events_processed = 0
        self.insights_generated = 0
        self.last_insight_time = 0.0
        
        print("[Lightning] ⚡ Lightning Bolt Insight Kernel initialized")
        print("[Lightning] Monitoring domains:", [d.value for d in InsightDomain])
    
    def ingest_event(self, event: DomainEvent) -> Optional[CrossDomainInsight]:
        """
        Ingest an event and check for cross-domain insights.
        
        Returns an insight if a lightning bolt connection is detected.
        """
        self.events_processed += 1
        
        # Add to temporal buffers
        for timescale in TrendTimescale:
            self.domain_buffers[event.domain][timescale].append(event)
        
        # Track Φ trend
        for timescale in TrendTimescale:
            trend_buffer = self.phi_trends[event.domain][timescale]
            trend_buffer.append(event.phi)
            if len(trend_buffer) > timescale.value * 10:
                trend_buffer.pop(0)
        
        # Update pattern charge based on event significance
        charge_contribution = event.phi * 0.1
        
        # Check for correlations with other recent domain events
        insight = self._check_cross_domain_correlations(event, charge_contribution)
        
        if insight:
            self.insights.append(insight)
            self.insights_generated += 1
            self.last_insight_time = datetime.now().timestamp()
            print(f"[Lightning] ⚡ INSIGHT GENERATED: {insight.insight_text[:80]}...")
            
            # Broadcast to pantheon
            self.broadcast_insight(insight)
            
            return insight
        
        return None
    
    def broadcast_insight(self, insight: CrossDomainInsight) -> None:
        """Broadcast a cross-domain insight to the entire pantheon via PantheonChat."""
        global _pantheon_chat
        
        if _pantheon_chat is None:
            print("[Lightning] Warning: PantheonChat not available for broadcast")
            return
        
        # Format the insight for broadcast
        domains_str = ", ".join(d.value for d in insight.source_domains)
        broadcast_content = (
            f"⚡ LIGHTNING INSIGHT: {insight.insight_text}\n"
            f"Domains connected: {domains_str}\n"
            f"Strength: {insight.connection_strength:.2f}, Φ: {insight.phi_at_creation:.3f}"
        )
        
        try:
            _pantheon_chat.broadcast(
                from_god="Lightning",
                content=broadcast_content,
                msg_type="discovery",
                metadata={
                    "insight_id": insight.insight_id,
                    "source_domains": [d.value for d in insight.source_domains],
                    "connection_strength": insight.connection_strength,
                    "confidence": insight.confidence,
                }
            )
            print(f"[Lightning] Broadcast insight {insight.insight_id} to pantheon")
        except Exception as e:
            print(f"[Lightning] Broadcast failed: {e}")
    
    def _check_cross_domain_correlations(
        self,
        new_event: DomainEvent,
        charge: float
    ) -> Optional[CrossDomainInsight]:
        """
        Check if the new event creates cross-domain correlations.
        
        Uses Fisher-Rao distance to detect geometric pattern similarity
        between events in different domains.
        """
        new_domain_idx = list(InsightDomain).index(new_event.domain)
        
        correlating_domains = []
        evidence = [new_event]
        max_correlation = 0.0
        
        # Check each other domain for correlations
        for domain in InsightDomain:
            if domain == new_event.domain:
                continue
                
            domain_idx = list(InsightDomain).index(domain)
            recent_events = list(self.domain_buffers[domain][TrendTimescale.SHORT])
            
            if not recent_events:
                continue
            
            # Calculate geometric similarity to recent events in this domain
            for other_event in recent_events[-5:]:  # Last 5 events
                similarity = self._calculate_event_similarity(new_event, other_event)
                
                if similarity > 0.6:  # Significant correlation
                    # Accumulate charge
                    self.pattern_charge[new_domain_idx, domain_idx] += charge * similarity
                    self.pattern_charge[domain_idx, new_domain_idx] += charge * similarity
                    
                    if similarity > max_correlation:
                        max_correlation = similarity
                    
                    if similarity > 0.75:  # Strong correlation
                        correlating_domains.append(domain)
                        evidence.append(other_event)
                        
                        # Update correlation matrix
                        self.correlation_matrix[new_domain_idx, domain_idx] = \
                            0.9 * self.correlation_matrix[new_domain_idx, domain_idx] + 0.1 * similarity
        
        # Check if charge exceeds threshold for any domain pair
        if len(correlating_domains) >= 1:
            for i, domain in enumerate(correlating_domains):
                domain_idx = list(InsightDomain).index(domain)
                
                if self.pattern_charge[new_domain_idx, domain_idx] >= self.discharge_threshold:
                    # LIGHTNING STRIKE! Generate insight
                    insight = self._generate_insight(
                        source_domains=[new_event.domain, domain],
                        evidence=evidence,
                        connection_strength=max_correlation,
                        phi=new_event.phi
                    )
                    
                    # Discharge the accumulated charge
                    self.pattern_charge[new_domain_idx, domain_idx] *= 0.3
                    self.pattern_charge[domain_idx, new_domain_idx] *= 0.3
                    
                    return insight
        
        return None
    
    def _calculate_event_similarity(
        self,
        event1: DomainEvent,
        event2: DomainEvent
    ) -> float:
        """
        Calculate geometric similarity between two events.
        
        Uses Fisher-Rao distance if embeddings available,
        otherwise falls back to content-based similarity.
        """
        if event1.embedding is not None and event2.embedding is not None:
            distance = centralized_fisher_rao(event1.embedding, event2.embedding)
            # Fisher-Rao proper similarity: 1 - d/π (distance bounded [0, π])
            return 1.0 - distance / np.pi
        
        # Content-based similarity (keyword overlap + Φ proximity)
        words1 = set(event1.content.lower().split())
        words2 = set(event2.content.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        jaccard = len(words1 & words2) / len(words1 | words2)
        phi_proximity = 1.0 - abs(event1.phi - event2.phi)
        
        return 0.6 * jaccard + 0.4 * phi_proximity
    
    def _generate_insight(
        self,
        source_domains: List[InsightDomain],
        evidence: List[DomainEvent],
        connection_strength: float,
        phi: float
    ) -> CrossDomainInsight:
        """
        Generate a cross-domain insight from correlated events.
        """
        # Extract key patterns from evidence
        patterns = [e.event_type for e in evidence]
        contents = [e.content[:50] for e in evidence[:3]]
        
        domain_names = [d.value for d in source_domains]
        
        # Generate insight text based on connected domains
        insight_templates: Dict[str, str] = {
            'activity_consciousness': "Search activity pattern aligns with consciousness state - consider adjusting exploration strategy",
            'research_tool_factory': "Research discovery suggests new tool pattern - potential for automated capability expansion",
            'consciousness_debates': "Debate convergence correlates with Φ elevation - pantheon alignment detected",
            'blockchain_research': "Blockchain pattern echoes research findings - temporal correlation suggests shared structure",
            'activity_conversation': "Conversational insights mirror exploration trajectory - user intuition aligns with system dynamics",
        }
        
        # Find matching template or generate generic insight
        sorted_domains = sorted(domain_names)
        key = '_'.join(sorted_domains[:2]) if len(sorted_domains) >= 2 else f"{domain_names[0]}_{domain_names[0]}"
        
        insight_text = insight_templates.get(
            key,
            f"Cross-domain correlation detected between {' and '.join(domain_names)}: patterns '{patterns[0]}' and '{patterns[-1]}' show geometric alignment"
        )
        
        insight_id = hashlib.sha256(
            f"{insight_text}_{datetime.now().timestamp()}".encode()
        ).hexdigest()[:16]
        
        return CrossDomainInsight(
            insight_id=f"lightning_{insight_id}",
            source_domains=source_domains,
            connection_strength=connection_strength,
            insight_text=insight_text,
            evidence=evidence,
            phi_at_creation=phi,
            timestamp=datetime.now().timestamp(),
            triggered_by=patterns[0] if patterns else "unknown",
            confidence=min(0.95, connection_strength * phi)
        )
    
    def get_trend_analysis(self, domain: InsightDomain) -> Dict:
        """Get trend analysis for a specific domain."""
        trends = {}
        
        for timescale in TrendTimescale:
            phi_buffer = self.phi_trends[domain][timescale]
            
            if len(phi_buffer) >= 3:
                avg = np.mean(phi_buffer)
                velocity = phi_buffer[-1] - phi_buffer[0] if len(phi_buffer) > 1 else 0
                acceleration = 0.0
                
                if len(phi_buffer) >= 5:
                    mid_idx = len(phi_buffer) // 2
                    v1 = phi_buffer[mid_idx] - phi_buffer[0]
                    v2 = phi_buffer[-1] - phi_buffer[mid_idx]
                    acceleration = v2 - v1
                
                trend = "stable"
                if velocity > 0.05:
                    trend = "ascending"
                elif velocity < -0.05:
                    trend = "descending"
                
                trends[timescale.name.lower()] = {
                    'average_phi': float(avg),
                    'velocity': float(velocity),
                    'acceleration': float(acceleration),
                    'trend': trend,
                    'sample_count': len(phi_buffer),
                }
            else:
                trends[timescale.name.lower()] = {
                    'average_phi': 0.0,
                    'velocity': 0.0,
                    'acceleration': 0.0,
                    'trend': 'insufficient_data',
                    'sample_count': len(phi_buffer),
                }
        
        return trends
    
    def get_all_trends(self) -> Dict[str, Dict]:
        """Get trend analysis for all domains."""
        return {
            domain.value: self.get_trend_analysis(domain)
            for domain in InsightDomain
        }
    
    def get_correlation_summary(self) -> Dict:
        """Get summary of cross-domain correlations."""
        domains = list(InsightDomain)
        
        correlations = []
        for i, d1 in enumerate(domains):
            for j, d2 in enumerate(domains):
                if i < j and self.correlation_matrix[i, j] > 0.1:
                    correlations.append({
                        'domain_1': d1.value,
                        'domain_2': d2.value,
                        'correlation': float(self.correlation_matrix[i, j]),
                        'charge': float(self.pattern_charge[i, j]),
                        'near_threshold': self.pattern_charge[i, j] > 0.5,
                    })
        
        correlations.sort(key=lambda x: x['correlation'], reverse=True)
        
        return {
            'correlations': correlations[:10],  # Top 10
            'total_pairs_tracked': sum(1 for c in correlations if c['correlation'] > 0.1),
            'near_discharge': sum(1 for c in correlations if c['near_threshold']),
        }
    
    def get_status(self) -> Dict:
        """Get Lightning Kernel status."""
        return {
            'name': 'Lightning',
            'events_processed': self.events_processed,
            'insights_generated': self.insights_generated,
            'recent_insights': [i.to_dict() for i in self.insights[-5:]],
            'discharge_threshold': self.discharge_threshold,
            'domains_monitored': [d.value for d in InsightDomain],
            'correlations': self.get_correlation_summary(),
            'trends': self.get_all_trends(),
            'last_insight_time': self.last_insight_time,
        }
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target using cross-domain insight analysis.
        
        Required abstract method from BaseGod.
        Lightning looks for patterns connecting different domains to assess the target.
        """
        self.prepare_for_assessment(target)
        
        context = context or {}
        
        # Check for insights related to target
        related_insights = [
            i for i in self.insights[-50:]
            if target.lower() in i.insight_text.lower() or 
               target.lower() in i.triggered_by.lower()
        ]
        
        # Calculate cross-domain assessment
        correlation_summary = self.get_correlation_summary()
        
        probability = 0.5
        confidence = 0.4
        
        if related_insights:
            max_strength = max(i.connection_strength for i in related_insights)
            probability = 0.5 + (max_strength * 0.3)
            confidence = min(0.9, 0.4 + len(related_insights) * 0.1)
        
        if correlation_summary['near_discharge'] > 0:
            probability = min(0.95, probability * 1.1)
        
        assessment = {
            'god': 'Lightning',
            'target': target,
            'probability': probability,
            'confidence': confidence,
            'recommendation': 'PURSUE' if probability > 0.6 else 'MONITOR' if probability > 0.4 else 'IGNORE',
            'reasoning': f"Cross-domain analysis: {len(related_insights)} related insights, {correlation_summary['near_discharge']} patterns near threshold",
            'evidence': {
                'related_insights': len(related_insights),
                'active_correlations': correlation_summary['total_pairs_tracked'],
                'domains_active': sum(1 for d in InsightDomain if len(self.domain_buffers[d][TrendTimescale.SHORT]) > 0),
                'insights_generated': self.insights_generated,
            }
        }
        
        return self.finalize_assessment(assessment)
    
    def assess_probability(
        self,
        target: str,
        hypothesis: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Assess probability of a hypothesis from cross-domain perspective.
        
        Lightning looks for patterns that connect multiple domains,
        boosting probability if cross-domain evidence aligns.
        """
        base_probability = 0.5
        confidence = 0.4
        
        # Check for recent insights related to target
        related_insights = [
            i for i in self.insights[-20:]
            if target.lower() in i.insight_text.lower()
        ]
        
        if related_insights:
            # Boost probability based on insight strength
            max_strength = max(i.connection_strength for i in related_insights)
            base_probability = 0.5 + (max_strength * 0.3)
            confidence = min(0.9, 0.4 + len(related_insights) * 0.1)
        
        # Check correlation trends
        correlation_summary = self.get_correlation_summary()
        if correlation_summary['near_discharge'] > 0:
            # Near-insight state - patterns are aligning
            base_probability = min(0.95, base_probability * 1.1)
            confidence = min(0.9, confidence * 1.1)
        
        return {
            'probability': base_probability,
            'confidence': confidence,
            'reasoning': f"Cross-domain analysis: {len(related_insights)} related insights, {correlation_summary['near_discharge']} patterns near threshold",
            'evidence': {
                'related_insights': len(related_insights),
                'active_correlations': correlation_summary['total_pairs_tracked'],
                'domains_active': sum(1 for d in InsightDomain if len(self.domain_buffers[d][TrendTimescale.SHORT]) > 0),
            }
        }


# Singleton instance
_lightning_kernel: Optional[LightningKernel] = None


def get_lightning_kernel() -> LightningKernel:
    """Get or create the Lightning Kernel singleton."""
    global _lightning_kernel
    if _lightning_kernel is None:
        _lightning_kernel = LightningKernel()
    return _lightning_kernel
