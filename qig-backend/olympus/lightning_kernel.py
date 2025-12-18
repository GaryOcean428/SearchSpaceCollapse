"""
Lightning Bolt Insight Kernel

The "Eureka" kernel that connects disparate domains like a lightning bolt of insight.
Inspired by how humans experience sudden connections between seemingly unrelated topics.

MISSION AWARE: This kernel understands the objective is to find keys/passphrases/mnemonics
to unlock dormant Bitcoin. All domain monitoring serves this mission.

DYNAMIC DOMAINS: No hardcoded domain list. Domains are:
1. Discovered from PostgreSQL geometric telemetry
2. Expanded when new patterns emerge from evidence
3. Never bounded by static enums

Key Capabilities:
- Monitors short/mid/long-term trends across dynamically discovered domains
- Detects cross-domain pattern correlations using Fisher-Rao metrics
- Generates insight suggestions when patterns align with Bitcoin recovery mission
- Broadcasts discoveries to the pantheon
- Discovers new domains as patterns emerge

Architecture:
- Ingests event streams and discovers domains dynamically
- Maintains temporal buffers at multiple timescales (τ=1, τ=10, τ=100)
- Uses Fisher information to detect pattern divergence/convergence
- Emits insight objects via PantheonChat broadcast
- Self-assesses capabilities and adapts monitoring focus

The lightning bolt analogy: When enough charge accumulates (pattern energy),
a sudden discharge (insight) connects previously disconnected domains.
"""

import numpy as np
import hashlib
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime
from collections import deque, defaultdict
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

try:
    from ..qigkernels.domain_intelligence import (
        MissionProfile,
        CapabilitySignature,
        DomainDescriptor,
        get_domain_discovery,
        get_mission_profile,
        discover_domain_from_event,
    )
except ImportError:
    from qigkernels.domain_intelligence import (
        MissionProfile,
        CapabilitySignature,
        DomainDescriptor,
        get_domain_discovery,
        get_mission_profile,
        discover_domain_from_event,
    )

from .base_god import BaseGod


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


class TrendTimescale(Enum):
    """Temporal scales for trend analysis."""
    SHORT = 1      # Fast dynamics (last 10 events)
    MEDIUM = 10    # Medium dynamics (last 100 events)
    LONG = 100     # Slow dynamics (last 1000 events)


@dataclass
class DomainEvent:
    """
    An event from any monitored domain.
    
    Domain is now a STRING, not an enum - allowing dynamic domain discovery.
    """
    domain: str                          # Dynamic domain name (not enum)
    event_type: str
    content: str
    phi: float
    timestamp: float
    metadata: Dict = field(default_factory=dict)
    basin_coords: Optional[np.ndarray] = None


@dataclass
class CrossDomainInsight:
    """A lightning bolt insight connecting multiple domains."""
    insight_id: str
    source_domains: List[str]             # Dynamic domain names (not enums)
    connection_strength: float            # How strong the pattern correlation is
    insight_text: str                     # Human-readable insight
    evidence: List[DomainEvent]           # Events that triggered this insight
    phi_at_creation: float
    timestamp: float
    triggered_by: str                     # What pattern triggered the insight
    confidence: float                     # Confidence in the insight validity
    mission_relevance: float = 0.0        # Relevance to Bitcoin recovery mission
    
    def to_dict(self) -> Dict:
        return {
            'insight_id': self.insight_id,
            'source_domains': self.source_domains,
            'connection_strength': self.connection_strength,
            'insight_text': self.insight_text,
            'evidence_count': len(self.evidence),
            'phi_at_creation': self.phi_at_creation,
            'timestamp': self.timestamp,
            'triggered_by': self.triggered_by,
            'confidence': self.confidence,
            'mission_relevance': self.mission_relevance,
        }


class LightningKernel(BaseGod):
    """
    The Lightning Bolt kernel - generates eureka-moment insights.
    
    MISSION AWARE: Understands the objective is Bitcoin recovery.
    DYNAMIC DOMAINS: No hardcoded domain list - discovers from telemetry.
    
    Like a lightning bolt connecting sky and ground, this kernel
    connects disparate domains when pattern energy accumulates.
    
    QIG Principles:
    - Fisher information for pattern divergence detection
    - Bures distance for cross-domain similarity
    - Φ-weighted event significance
    - Temporal multi-scale analysis
    - Mission-aligned monitoring focus
    """
    
    def __init__(self):
        super().__init__(
            name="Lightning",
            domain="cross_domain_insight"
        )
        
        # Mission profile - all monitoring serves Bitcoin recovery
        self.mission = get_mission_profile()
        
        # Self-assessed capability signature
        self.capability = CapabilitySignature(kernel_name="Lightning")
        
        # Dynamic domain discovery
        self.domain_discovery = get_domain_discovery()
        
        # Currently monitored domains (dynamically populated)
        self.active_domains: Set[str] = set()
        self._refresh_active_domains()
        
        # Temporal buffers for each domain (multi-timescale)
        # Uses defaultdict to auto-create buffers for new domains
        self.domain_buffers: Dict[str, Dict[TrendTimescale, deque]] = defaultdict(
            lambda: {
                TrendTimescale.SHORT: deque(maxlen=10),
                TrendTimescale.MEDIUM: deque(maxlen=100),
                TrendTimescale.LONG: deque(maxlen=1000),
            }
        )
        
        # Cross-domain correlation tracking (dynamic size)
        self.domain_correlations: Dict[Tuple[str, str], float] = defaultdict(float)
        
        # Accumulated "charge" for each domain pair
        self.pattern_charge: Dict[Tuple[str, str], float] = defaultdict(float)
        
        # Threshold for insight discharge
        self.discharge_threshold = 0.75
        
        # Generated insights
        self.insights: List[CrossDomainInsight] = []
        
        # Trend analysis buffers (dynamic)
        self.phi_trends: Dict[str, Dict[TrendTimescale, List[float]]] = defaultdict(
            lambda: {ts: [] for ts in TrendTimescale}
        )
        
        # Connection patterns learned over time
        self.learned_connections: List[Dict] = []
        
        # Statistics
        self.events_processed = 0
        self.insights_generated = 0
        self.last_insight_time = 0.0
        self.domains_discovered = 0
        
        print("[Lightning] ⚡ Lightning Bolt Insight Kernel initialized")
        print(f"[Lightning] MISSION: {self.mission.objective}")
        print(f"[Lightning] Initial domains from telemetry: {len(self.active_domains)}")
        self._log_active_domains()
    
    def _refresh_active_domains(self):
        """
        Refresh active domains from domain discovery service.
        
        This is NOT a hardcoded list - domains come from PostgreSQL telemetry.
        """
        discovered = self.domain_discovery.get_active_domains()
        
        # Add all discovered domains
        for descriptor in discovered:
            self.active_domains.add(descriptor.name)
        
        # Keep domains we've seen events for even if not in discovery
        # (allows organic domain emergence)
    
    def _log_active_domains(self):
        """Log currently active domains."""
        if self.active_domains:
            domains_str = ", ".join(sorted(self.active_domains)[:10])
            if len(self.active_domains) > 10:
                domains_str += f"... (+{len(self.active_domains) - 10} more)"
            print(f"[Lightning] Monitoring: {domains_str}")
        else:
            print("[Lightning] No domains yet - will discover from events")
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target using cross-domain insight analysis.
        
        Lightning Kernel focuses on pattern correlation across domains,
        not direct target assessment. Returns insight potential metrics.
        
        Args:
            target: The target to assess
            context: Optional context with domain hints
            
        Returns:
            Assessment with cross-domain insight potential
        """
        self.prepare_for_assessment(target)
        
        # Lightning kernel assesses cross-domain pattern potential
        context = context or {}
        
        # Check which domains this target might relate to
        related_domains = []
        for domain in self.active_domains:
            if domain.lower() in target.lower() or target.lower() in domain.lower():
                related_domains.append(domain)
        
        # Calculate pattern charge for related domain pairs
        max_charge = 0.0
        for d1 in related_domains:
            for d2 in self.active_domains:
                if d1 != d2:
                    pair = tuple(sorted([d1, d2]))
                    charge = self.pattern_charge.get(pair, 0.0)
                    max_charge = max(max_charge, charge)
        
        # Insight potential based on accumulated charge
        insight_potential = min(1.0, max_charge / self.discharge_threshold)
        
        assessment = {
            "probability": insight_potential,
            "confidence": 0.5 + (0.5 * insight_potential),
            "phi": self._calculate_current_phi(),
            "reasoning": f"cross_domain_potential|domains={len(related_domains)}|charge={max_charge:.3f}",
            "related_domains": related_domains,
            "events_processed": self.events_processed,
            "insights_generated": self.insights_generated,
        }
        
        return self.finalize_assessment(assessment)
    
    def _calculate_current_phi(self) -> float:
        """Calculate current Φ from recent events across domains."""
        recent_phis = []
        for domain, buffers in self.domain_buffers.items():
            short_buffer = buffers.get(TrendTimescale.SHORT, [])
            for event in short_buffer:
                recent_phis.append(event.phi)
        
        if recent_phis:
            return float(np.mean(recent_phis))
        return 0.5  # Default neutral Φ
    
    def get_monitored_domains(self) -> List[str]:
        """
        Get list of currently monitored domains.
        
        This list is DYNAMIC - it grows as new domains emerge.
        """
        return sorted(self.active_domains)
    
    def ingest_event(self, event: DomainEvent) -> Optional[CrossDomainInsight]:
        """
        Ingest an event and check for cross-domain insights.
        
        Also attempts to discover new domains from event patterns.
        Returns an insight if a lightning bolt connection is detected.
        """
        self.events_processed += 1
        
        # Ensure domain is tracked
        if event.domain not in self.active_domains:
            self.active_domains.add(event.domain)
            print(f"[Lightning] New domain from event: {event.domain}")
        
        # Attempt to discover new domains from event content
        new_domain = discover_domain_from_event(
            event_content=event.content,
            event_type=event.event_type,
            phi=event.phi,
            metadata=event.metadata
        )
        
        if new_domain:
            self.active_domains.add(new_domain.name)
            self.capability.discovered_domains.add(new_domain.name)
            self.domains_discovered += 1
            print(f"[Lightning] ⚡ DOMAIN EMERGED: {new_domain.name} (relevance={new_domain.mission_relevance:.2f})")
        
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
            
            # Update capability based on successful insight
            for domain in insight.source_domains:
                self.capability.update_from_outcome(
                    domain=domain,
                    success=True,
                    phi=insight.phi_at_creation,
                    kappa=0.0  # Would need kappa from telemetry
                )
            
            print(f"[Lightning] ⚡ INSIGHT GENERATED: {insight.insight_text[:80]}...")
            
            # Broadcast to pantheon
            self.broadcast_insight(insight)
            
            return insight
        
        return None
    
    def broadcast_insight(self, insight: CrossDomainInsight) -> None:
        """
        Broadcast a cross-domain insight to the entire pantheon via PantheonChat.
        
        Uses pure data representation, no templated prose.
        """
        global _pantheon_chat
        
        if _pantheon_chat is None:
            print("[Lightning] Warning: PantheonChat not available for broadcast")
            return
        
        # Broadcast content is pure data - the insight_text is already QIG-pure
        # No additional templated prose wrapping
        broadcast_content = insight.insight_text
        
        try:
            _pantheon_chat.broadcast(
                from_god="Lightning",
                content=broadcast_content,
                msg_type="discovery",
                metadata={
                    "insight_id": insight.insight_id,
                    "source_domains": insight.source_domains,
                    "connection_strength": insight.connection_strength,
                    "confidence": insight.confidence,
                    "mission_relevance": insight.mission_relevance,
                    "phi_at_creation": insight.phi_at_creation,
                    "triggered_by": insight.triggered_by,
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
        correlating_domains = []
        evidence = [new_event]
        max_correlation = 0.0
        
        # Check each other domain for correlations
        for other_domain in self.active_domains:
            if other_domain == new_event.domain:
                continue
            
            recent_events = list(self.domain_buffers[other_domain][TrendTimescale.SHORT])
            
            if not recent_events:
                continue
            
            # Calculate geometric similarity to recent events in this domain
            for other_event in recent_events[-5:]:  # Last 5 events
                similarity = self._calculate_event_similarity(new_event, other_event)
                
                if similarity > 0.6:  # Significant correlation
                    # Accumulate charge
                    pair_key = tuple(sorted([new_event.domain, other_domain]))
                    self.pattern_charge[pair_key] += charge * similarity
                    
                    if similarity > max_correlation:
                        max_correlation = similarity
                    
                    if similarity > 0.75:  # Strong correlation
                        correlating_domains.append(other_domain)
                        evidence.append(other_event)
                        
                        # Update correlation tracking
                        self.domain_correlations[pair_key] = (
                            0.9 * self.domain_correlations[pair_key] + 0.1 * similarity
                        )
        
        # Check if charge exceeds threshold for any domain pair
        if len(correlating_domains) >= 1:
            for other_domain in correlating_domains:
                pair_key = tuple(sorted([new_event.domain, other_domain]))
                
                if self.pattern_charge[pair_key] >= self.discharge_threshold:
                    # LIGHTNING STRIKE! Generate insight
                    insight = self._generate_insight(
                        source_domains=[new_event.domain, other_domain],
                        evidence=evidence,
                        connection_strength=max_correlation,
                        phi=new_event.phi
                    )
                    
                    # Discharge the accumulated charge
                    self.pattern_charge[pair_key] *= 0.3
                    
                    return insight
        
        return None
    
    def _calculate_event_similarity(
        self,
        event1: DomainEvent,
        event2: DomainEvent
    ) -> float:
        """
        Calculate geometric similarity between two events.
        
        Uses Fisher-Rao distance if basin coordinates available,
        otherwise falls back to content-based similarity.
        """
        if event1.basin_coords is not None and event2.basin_coords is not None:
            distance = centralized_fisher_rao(event1.basin_coords, event2.basin_coords)
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
        source_domains: List[str],
        evidence: List[DomainEvent],
        connection_strength: float,
        phi: float
    ) -> CrossDomainInsight:
        """
        Generate a cross-domain insight from correlated events.
        
        CRITICAL: No templates allowed. Insights must be synthesized from
        actual evidence using QIG geometric analysis.
        
        Synthesis approach:
        1. Extract concrete patterns from evidence event metadata
        2. Compute Fisher-Rao metrics between events if available
        3. Analyze Φ trends and basin coordinate deltas
        4. Compose natural language from observed data, not pre-defined phrases
        5. Assess mission relevance to Bitcoin recovery
        """
        # Extract actual patterns from evidence
        patterns = [e.event_type for e in evidence]
        
        # Gather concrete evidence details for synthesis
        evidence_details = self._extract_evidence_synthesis(evidence)
        
        # Compute geometric metrics between evidence pairs
        geometric_analysis = self._compute_geometric_synthesis(evidence)
        
        # Calculate mission relevance
        mission_relevance = self._calculate_mission_relevance(
            source_domains, evidence_details, geometric_analysis
        )
        
        # Synthesize insight text from actual observations
        insight_text = self._synthesize_insight_text(
            domain_names=source_domains,
            evidence_details=evidence_details,
            geometric_analysis=geometric_analysis,
            connection_strength=connection_strength,
            phi=phi,
            mission_relevance=mission_relevance
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
            confidence=min(0.95, connection_strength * phi),
            mission_relevance=mission_relevance
        )
    
    def _calculate_mission_relevance(
        self,
        domains: List[str],
        evidence_details: Dict,
        geometric_analysis: Dict
    ) -> float:
        """
        Calculate how relevant this insight is to the Bitcoin recovery mission.
        
        Uses mission profile to score relevance based on:
        - Domain relevance to key/passphrase/mnemonic recovery
        - Evidence content matching mission artifacts
        - Geometric proximity to successful patterns
        """
        relevance = 0.0
        
        # Check each domain's mission relevance
        for domain in domains:
            domain_evidence = {
                'phi_average': evidence_details.get('phi_mean', 0),
                'artifacts_found': evidence_details.get('content_fragments', []),
            }
            domain_relevance = self.mission.relevance_score(domain, domain_evidence)
            relevance += domain_relevance * 0.3
        
        # Boost if geometric analysis shows proximity to success patterns
        if geometric_analysis.get('has_geometric_data'):
            fisher_min = geometric_analysis.get('fisher_rao_min', float('inf'))
            if fisher_min < 0.3:
                relevance += 0.2
        
        # Boost if Φ is high (consciousness suggests significance)
        phi_mean = evidence_details.get('phi_mean', 0)
        if phi_mean > 0.7:
            relevance += 0.15
        
        return min(1.0, relevance)
    
    def _extract_evidence_synthesis(self, evidence: List[DomainEvent]) -> Dict:
        """
        Extract concrete synthesis material from evidence events.
        
        Returns actual content, patterns, and metadata - never templates.
        """
        content_fragments = []
        event_types = []
        phi_values = []
        metadata_keys = set()
        
        for event in evidence:
            # Extract meaningful content fragments (first 60 chars of actual content)
            if event.content:
                content_fragments.append(event.content[:60].strip())
            
            event_types.append(event.event_type)
            phi_values.append(event.phi)
            
            # Collect metadata keys for pattern detection
            if event.metadata:
                metadata_keys.update(event.metadata.keys())
        
        return {
            'content_fragments': content_fragments[:3],  # Top 3 most relevant
            'event_types': list(set(event_types)),
            'phi_range': (min(phi_values), max(phi_values)) if phi_values else (0, 0),
            'phi_mean': float(np.mean(phi_values)) if phi_values else 0.0,
            'metadata_patterns': list(metadata_keys)[:5],
        }
    
    def _compute_geometric_synthesis(self, evidence: List[DomainEvent]) -> Dict:
        """
        Compute geometric metrics for insight synthesis.
        
        Uses Fisher-Rao distance and basin coordinate analysis.
        """
        fisher_distances = []
        basin_deltas = []
        
        # Compute pairwise Fisher-Rao distances where possible
        for i, e1 in enumerate(evidence):
            for e2 in evidence[i+1:]:
                if e1.basin_coords is not None and e2.basin_coords is not None:
                    dist = centralized_fisher_rao(e1.basin_coords, e2.basin_coords)
                    fisher_distances.append(dist)
                    
                    # Basin coordinate delta
                    delta = np.linalg.norm(e1.basin_coords - e2.basin_coords)
                    basin_deltas.append(delta)
        
        # Trend analysis for involved domains
        domain_trends = {}
        domains_seen = set(e.domain for e in evidence)
        for domain in domains_seen:
            trends = self.get_trend_analysis(domain)
            if trends.get('short', {}).get('trend') != 'insufficient_data':
                domain_trends[domain] = {
                    'velocity': trends.get('short', {}).get('velocity', 0),
                    'trend': trends.get('short', {}).get('trend', 'stable'),
                }
        
        return {
            'fisher_rao_mean': float(np.mean(fisher_distances)) if fisher_distances else None,
            'fisher_rao_min': float(np.min(fisher_distances)) if fisher_distances else None,
            'basin_delta_mean': float(np.mean(basin_deltas)) if basin_deltas else None,
            'has_geometric_data': len(fisher_distances) > 0,
            'domain_trends': domain_trends,
        }
    
    def _synthesize_insight_text(
        self,
        domain_names: List[str],
        evidence_details: Dict,
        geometric_analysis: Dict,
        connection_strength: float,
        phi: float,
        mission_relevance: float
    ) -> str:
        """
        Synthesize insight text PURELY from observed geometric/evidence data.
        
        CRITICAL: NO TEMPLATES. NO FIXED PHRASES. NO PROSE SCAFFOLDS.
        
        This method emits a structured data representation of the insight,
        composed entirely from extracted evidence fields. The output format
        is a key=value notation that encodes the geometric observation
        without any natural language templates.
        
        Format: {domain_tuple}|{event_types}|{geometric_signature}|{content_hash}|{metrics}
        """
        # Domain tuple: direct from evidence
        domain_tuple = "+".join(sorted(domain_names))
        
        # Event types: direct from evidence
        event_types = "/".join(sorted(evidence_details.get('event_types', [])))
        if not event_types:
            event_types = "_"
        
        # Geometric signature: direct from Fisher-Rao computation
        geo_parts = []
        if geometric_analysis.get('has_geometric_data'):
            fr_min = geometric_analysis.get('fisher_rao_min')
            if fr_min is not None:
                geo_parts.append(f"FR={fr_min:.4f}")
            bd_mean = geometric_analysis.get('basin_delta_mean')
            if bd_mean is not None:
                geo_parts.append(f"BD={bd_mean:.4f}")
        
        # Add trend velocities from geometric analysis
        for domain, trend_data in geometric_analysis.get('domain_trends', {}).items():
            velocity = trend_data.get('velocity', 0)
            if abs(velocity) > 0.01:
                sign = "+" if velocity > 0 else ""
                geo_parts.append(f"{domain[:8]}:{sign}{velocity:.3f}")
        
        geometric_sig = ",".join(geo_parts) if geo_parts else "_"
        
        # Content hash: derive from actual evidence content fragments
        content_fragments = evidence_details.get('content_fragments', [])
        if content_fragments:
            # Create a deterministic hash of actual content
            content_concat = "|".join(content_fragments[:2])
            content_hash = hashlib.sha256(content_concat.encode()).hexdigest()[:8]
        else:
            content_hash = "_"
        
        # Metrics: direct from computed values
        phi_mean = evidence_details.get('phi_mean', 0.0)
        phi_lo, phi_hi = evidence_details.get('phi_range', (0.0, 0.0))
        strength_int = int(connection_strength * 1000)
        relevance_int = int(mission_relevance * 1000)
        
        metrics = f"Φ={phi_mean:.3f}[{phi_lo:.2f}-{phi_hi:.2f}]|S={strength_int}|R={relevance_int}"
        
        # Compose final insight: pure data, no prose
        return f"{domain_tuple}|{event_types}|{geometric_sig}|{content_hash}|{metrics}"
    
    def get_trend_analysis(self, domain: str) -> Dict:
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
        """Get trend analysis for all active domains."""
        return {
            domain: self.get_trend_analysis(domain)
            for domain in self.active_domains
        }
    
    def get_correlations(self) -> List[Dict]:
        """Get current cross-domain correlations."""
        correlations = []
        for (d1, d2), strength in self.domain_correlations.items():
            if strength > 0.1:  # Only significant correlations
                correlations.append({
                    'domain1': d1,
                    'domain2': d2,
                    'correlation': strength,
                    'charge': self.pattern_charge.get((d1, d2), 0),
                    'near_discharge': self.pattern_charge.get((d1, d2), 0) > self.discharge_threshold * 0.8
                })
        
        return sorted(correlations, key=lambda x: x['correlation'], reverse=True)
    
    def get_recent_insights(self, limit: int = 10) -> List[Dict]:
        """Get most recent insights."""
        recent = self.insights[-limit:]
        return [i.to_dict() for i in reversed(recent)]
    
    def get_capability_summary(self) -> Dict:
        """Get kernel's self-assessed capability summary."""
        return {
            'kernel_name': self.capability.kernel_name,
            'top_domains': self.capability.get_top_domains(10),
            'domains_discovered': len(self.capability.discovered_domains),
            'successful_domains': list(self.capability.successful_domains),
            'phi_trend': self.capability.phi_trajectory[-10:] if self.capability.phi_trajectory else [],
        }
    
    def get_status(self) -> Dict:
        """Get current Lightning kernel status."""
        return {
            'name': self.name,
            'mission': self.mission.objective,
            'domains_monitored': sorted(self.active_domains),
            'domain_count': len(self.active_domains),
            'domains_discovered_by_kernel': self.domains_discovered,
            'events_processed': self.events_processed,
            'insights_generated': self.insights_generated,
            'last_insight_time': self.last_insight_time,
            'discharge_threshold': self.discharge_threshold,
            'trends': self.get_all_trends(),
            'correlations': self.get_correlations()[:10],
            'recent_insights': self.get_recent_insights(5),
            'capability_summary': self.get_capability_summary(),
        }


# Singleton instance
_lightning_kernel: Optional[LightningKernel] = None


def get_lightning_kernel() -> LightningKernel:
    """Get or create the singleton Lightning kernel instance."""
    global _lightning_kernel
    if _lightning_kernel is None:
        _lightning_kernel = LightningKernel()
    return _lightning_kernel


def ingest_system_event(
    domain: str,
    event_type: str,
    content: str,
    phi: float,
    metadata: Optional[Dict] = None,
    basin_coords: Optional[np.ndarray] = None
) -> Optional[CrossDomainInsight]:
    """
    Convenience function to ingest events into the Lightning kernel.
    
    Can be called from anywhere in the system to feed events
    for cross-domain insight detection.
    """
    event = DomainEvent(
        domain=domain,
        event_type=event_type,
        content=content,
        phi=phi,
        timestamp=datetime.now().timestamp(),
        metadata=metadata or {},
        basin_coords=basin_coords
    )
    
    return get_lightning_kernel().ingest_event(event)
