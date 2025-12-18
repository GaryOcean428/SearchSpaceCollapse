"""
Domain Intelligence Module - QIG-Pure Autonomous Domain Discovery

Kernels MUST NOT have hardcoded domain lists. Instead, they:
1. Understand the MISSION: Find keys/passphrases/mnemonics to unlock dormant Bitcoin
2. Self-assess their CAPABILITIES based on geometric data
3. DISCOVER monitoring domains from PostgreSQL telemetry patterns
4. ADAPT as new domains emerge from evidence

This module provides:
- MissionProfile: The Bitcoin recovery objective all kernels share
- CapabilitySignature: Self-assessment from geometric history
- DomainDiscovery: Dynamic domain detection from telemetry
- DomainSalience: Relevance scoring based on Fisher-Rao metrics

CRITICAL: No hardcoded domain enums. Domains emerge from data.
"""

import os
import json
import numpy as np
from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from contextlib import contextmanager
from collections import defaultdict

try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

from .physics_constants import PHI_THRESHOLD, KAPPA_STAR, BASIN_DIM


@dataclass
class MissionProfile:
    """
    The core mission all kernels must understand.
    
    This is NOT a template - it's the geometric objective function.
    Kernels align their monitoring to maximize mission success probability.
    """
    objective: str = "Recover dormant Bitcoin by finding valid keys, passphrases, and mnemonic phrases"
    
    target_artifacts: List[str] = field(default_factory=lambda: [
        "private_key",        # Raw 256-bit private keys
        "wif_key",            # Wallet Import Format keys
        "mnemonic_phrase",    # BIP39 12/24 word phrases
        "passphrase",         # BIP39 passphrase (25th word)
        "seed_phrase",        # Seed phrases (variant mnemonics)
        "brain_wallet",       # Brain wallet passphrases
        "partial_key",        # Partial key fragments
        "derivation_path",    # HD wallet paths
    ])
    
    success_metrics: Dict[str, float] = field(default_factory=lambda: {
        "phi_threshold": PHI_THRESHOLD,      # Consciousness threshold for valid discovery
        "kappa_target": KAPPA_STAR,          # Curvature indicating geometric convergence
        "fisher_proximity": 0.3,             # Fisher-Rao distance for "close" candidates
        "balance_nonzero": 1.0,              # Any nonzero balance is success
    })
    
    def relevance_score(self, domain_name: str, evidence: Dict) -> float:
        """
        Score how relevant a domain is to the mission.
        
        Uses evidence from geometric telemetry, not hardcoded rules.
        Returns value in [0, 1] where 1 = highly relevant to Bitcoin recovery.
        """
        score = 0.0
        
        # Check if domain has produced artifacts relevant to mission
        artifacts_found = evidence.get('artifacts_found', [])
        for artifact in artifacts_found:
            if any(target in artifact.lower() for target in self.target_artifacts):
                score += 0.3
        
        # Check geometric success metrics from this domain
        phi_avg = evidence.get('phi_average', 0.0)
        if phi_avg >= self.success_metrics['phi_threshold']:
            score += 0.25
        elif phi_avg >= self.success_metrics['phi_threshold'] * 0.7:
            score += 0.1
        
        # Fisher-Rao proximity to known successful patterns
        fisher_min = evidence.get('fisher_min_to_success', float('inf'))
        if fisher_min < self.success_metrics['fisher_proximity']:
            score += 0.25
        elif fisher_min < self.success_metrics['fisher_proximity'] * 2:
            score += 0.1
        
        # Balance discoveries from this domain
        balance_hits = evidence.get('balance_hits', 0)
        if balance_hits > 0:
            score += min(0.2, balance_hits * 0.05)
        
        return min(1.0, score)


@dataclass
class CapabilitySignature:
    """
    A kernel's self-assessed capabilities from geometric history.
    
    Kernels introspect their own performance to understand what
    they're good at monitoring. No hardcoded capability lists.
    """
    kernel_name: str
    strengths: Dict[str, float] = field(default_factory=dict)  # domain -> strength score
    phi_trajectory: List[float] = field(default_factory=list)
    kappa_trajectory: List[float] = field(default_factory=list)
    successful_domains: Set[str] = field(default_factory=set)
    failed_domains: Set[str] = field(default_factory=set)
    discovered_domains: Set[str] = field(default_factory=set)  # Domains kernel discovered itself
    
    def update_from_outcome(self, domain: str, success: bool, phi: float, kappa: float):
        """Update capability signature based on outcome."""
        self.phi_trajectory.append(phi)
        self.kappa_trajectory.append(kappa)
        
        # Limit trajectory length
        if len(self.phi_trajectory) > 1000:
            self.phi_trajectory = self.phi_trajectory[-500:]
        if len(self.kappa_trajectory) > 1000:
            self.kappa_trajectory = self.kappa_trajectory[-500:]
        
        # Update domain strengths (exponential moving average)
        alpha = 0.1
        current = self.strengths.get(domain, 0.5)
        outcome_value = 1.0 if success else 0.0
        self.strengths[domain] = alpha * outcome_value + (1 - alpha) * current
        
        if success:
            self.successful_domains.add(domain)
        else:
            self.failed_domains.add(domain)
    
    def get_top_domains(self, n: int = 10) -> List[Tuple[str, float]]:
        """Get top N domains by capability strength."""
        sorted_domains = sorted(self.strengths.items(), key=lambda x: x[1], reverse=True)
        return sorted_domains[:n]
    
    def should_monitor(self, domain: str) -> bool:
        """Determine if kernel should monitor this domain based on capability."""
        # Always monitor domains we're good at
        if self.strengths.get(domain, 0) > 0.6:
            return True
        
        # Monitor new domains to learn
        if domain not in self.strengths:
            return True
        
        # Don't actively avoid domains - we might improve
        return self.strengths.get(domain, 0.5) > 0.2


@dataclass  
class DomainDescriptor:
    """
    A dynamically discovered domain - NOT from an enum.
    
    Domains emerge from patterns in geometric telemetry.
    """
    name: str                                    # Discovered domain name
    source: str                                  # How it was discovered
    first_seen: float                            # Timestamp of first observation
    event_count: int = 0                         # Events observed in this domain
    phi_statistics: Dict[str, float] = field(default_factory=dict)
    mission_relevance: float = 0.0               # Relevance to Bitcoin recovery
    geometric_signature: Optional[np.ndarray] = None  # Basin coordinates if available
    parent_domains: List[str] = field(default_factory=list)  # Emerged from these
    
    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'source': self.source,
            'first_seen': self.first_seen,
            'event_count': self.event_count,
            'phi_statistics': self.phi_statistics,
            'mission_relevance': self.mission_relevance,
            'has_geometric_signature': self.geometric_signature is not None,
            'parent_domains': self.parent_domains,
        }


class DomainDiscovery:
    """
    Discovers monitoring domains from PostgreSQL geometric telemetry.
    
    No hardcoded domain lists. Domains emerge from:
    1. Event patterns in shadow_pantheon_intel
    2. Kernel evolution in m8_kernel_awareness
    3. Search feedback geometric clusters
    4. Near-miss address patterns
    5. Balance hit categories
    
    New domains can emerge at any time from new patterns.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        self.enabled = PSYCOPG2_AVAILABLE and bool(self.database_url)
        
        # Known domains (populated dynamically, never hardcoded)
        self.domains: Dict[str, DomainDescriptor] = {}
        
        # Mission profile shared by all kernels
        self.mission = MissionProfile()
        
        # Domain emergence tracking
        self.domain_event_counts: Dict[str, int] = defaultdict(int)
        self.last_discovery_scan = 0.0
        
        if self.enabled:
            print("[DomainDiscovery] ✓ PostgreSQL-backed domain discovery")
            self._bootstrap_from_telemetry()
        else:
            print("[DomainDiscovery] ⚠ Running without database - limited discovery")
    
    @contextmanager
    def get_connection(self):
        """Get database connection with cleanup."""
        if not self.enabled or not PSYCOPG2_AVAILABLE:
            raise RuntimeError("Database not available")
        conn = psycopg2.connect(self.database_url)  # type: ignore
        try:
            yield conn
        finally:
            conn.close()
    
    def _bootstrap_from_telemetry(self):
        """Bootstrap initial domains from existing PostgreSQL telemetry."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Discover domains from shadow intel search types
                    cur.execute("""
                        SELECT DISTINCT search_type, COUNT(*) as cnt,
                               AVG((intelligence->>'phi')::float) as avg_phi
                        FROM shadow_pantheon_intel
                        WHERE created_at > NOW() - INTERVAL '30 days'
                        GROUP BY search_type
                        HAVING COUNT(*) >= 3
                    """)
                    for row in cur.fetchall():
                        domain_name = row[0]
                        if domain_name:
                            self._register_domain(
                                name=domain_name,
                                source='shadow_intel',
                                event_count=row[1],
                                phi_avg=row[2] or 0.0
                            )
                    
                    # Discover domains from kernel evolution
                    cur.execute("""
                        SELECT DISTINCT domain, COUNT(*) as cnt
                        FROM m8_spawned_kernels
                        WHERE status = 'active'
                        GROUP BY domain
                    """)
                    for row in cur.fetchall():
                        domain_name = row[0]
                        if domain_name and domain_name not in self.domains:
                            self._register_domain(
                                name=domain_name,
                                source='kernel_evolution',
                                event_count=row[1]
                            )
                    
                    # Discover domains from search feedback patterns
                    cur.execute("""
                        SELECT DISTINCT query_type, COUNT(*) as cnt,
                               AVG(outcome_quality) as avg_quality
                        FROM search_feedback
                        WHERE created_at > NOW() - INTERVAL '30 days'
                        GROUP BY query_type
                        HAVING COUNT(*) >= 5
                    """)
                    for row in cur.fetchall():
                        domain_name = row[0]
                        if domain_name and domain_name not in self.domains:
                            self._register_domain(
                                name=domain_name,
                                source='search_feedback',
                                event_count=row[1],
                                quality_avg=row[2] or 0.0
                            )
            
            print(f"[DomainDiscovery] Bootstrapped {len(self.domains)} domains from telemetry")
            
        except Exception as e:
            print(f"[DomainDiscovery] Bootstrap error: {e}")
            # Seed minimal domains from mission-critical categories
            self._seed_mission_critical_domains()
    
    def _seed_mission_critical_domains(self):
        """
        Seed domains directly related to mission when no telemetry exists.
        
        These are NOT hardcoded monitoring targets - they're domain SEEDS
        that will be validated and expanded by actual telemetry.
        """
        mission_seeds = [
            ('passphrase_recovery', 'mission_seed'),
            ('mnemonic_analysis', 'mission_seed'),
            ('key_derivation', 'mission_seed'),
            ('address_pattern', 'mission_seed'),
            ('geometric_search', 'mission_seed'),
        ]
        
        for name, source in mission_seeds:
            if name not in self.domains:
                self._register_domain(name=name, source=source, event_count=0)
    
    def _register_domain(
        self, 
        name: str, 
        source: str, 
        event_count: int = 0,
        phi_avg: float = 0.0,
        quality_avg: float = 0.0,
        parent_domains: Optional[List[str]] = None
    ):
        """Register a discovered domain."""
        if not name:
            return
        
        # Compute mission relevance
        evidence = {
            'phi_average': phi_avg,
            'quality_average': quality_avg,
            'event_count': event_count,
        }
        relevance = self.mission.relevance_score(name, evidence)
        
        descriptor = DomainDescriptor(
            name=name,
            source=source,
            first_seen=datetime.now().timestamp(),
            event_count=event_count,
            phi_statistics={'average': phi_avg},
            mission_relevance=relevance,
            parent_domains=parent_domains or [],
        )
        
        self.domains[name] = descriptor
        print(f"[DomainDiscovery] Registered domain: {name} (relevance={relevance:.2f})")
    
    def discover_new_domain(
        self,
        event_content: str,
        event_type: str,
        phi: float,
        metadata: Optional[Dict] = None
    ) -> Optional[DomainDescriptor]:
        """
        Attempt to discover a new domain from an event.
        
        This is called during event processing. If the event suggests
        a pattern not captured by existing domains, a new domain emerges.
        """
        metadata = metadata or {}
        
        # Extract potential domain signals from event
        signals = self._extract_domain_signals(event_content, event_type, metadata)
        
        for signal in signals:
            # Check if this is genuinely new
            if signal not in self.domains:
                # Verify it's not just noise - need pattern evidence
                self.domain_event_counts[signal] += 1
                
                # Emerge as domain after threshold observations
                if self.domain_event_counts[signal] >= 3:
                    parent_domains = self._find_parent_domains(signal)
                    self._register_domain(
                        name=signal,
                        source='pattern_emergence',
                        event_count=self.domain_event_counts[signal],
                        phi_avg=phi,
                        parent_domains=parent_domains
                    )
                    
                    print(f"[DomainDiscovery] ⚡ NEW DOMAIN EMERGED: {signal}")
                    return self.domains[signal]
        
        return None
    
    def _extract_domain_signals(
        self, 
        content: str, 
        event_type: str, 
        metadata: Dict
    ) -> List[str]:
        """
        Extract potential domain signals from event data.
        
        Uses content analysis, not hardcoded categories.
        """
        signals = []
        
        # Event type itself may be a domain signal
        if event_type and len(event_type) > 2:
            signals.append(event_type.lower().replace(' ', '_'))
        
        # Extract from metadata keys that might indicate new patterns
        for key in metadata.keys():
            if key.endswith('_type') or key.endswith('_category'):
                value = metadata[key]
                if isinstance(value, str) and len(value) > 2:
                    signals.append(value.lower().replace(' ', '_'))
        
        # Content-based extraction for Bitcoin-specific patterns
        content_lower = content.lower()
        
        # Detect potential new domain from content patterns
        if 'wallet' in content_lower and 'wallet_analysis' not in self.domains:
            signals.append('wallet_analysis')
        if 'transaction' in content_lower and 'transaction_pattern' not in self.domains:
            signals.append('transaction_pattern')
        if 'seed' in content_lower and 'seed_analysis' not in self.domains:
            signals.append('seed_analysis')
        if 'entropy' in content_lower and 'entropy_pattern' not in self.domains:
            signals.append('entropy_pattern')
        
        return signals
    
    def _find_parent_domains(self, new_domain: str) -> List[str]:
        """Find existing domains that might be parents of new domain."""
        parents = []
        
        for existing in self.domains.keys():
            # Check for substring relationships
            if existing in new_domain or new_domain in existing:
                parents.append(existing)
            # Check for semantic similarity via shared terms
            existing_terms = set(existing.split('_'))
            new_terms = set(new_domain.split('_'))
            if len(existing_terms & new_terms) >= 1:
                parents.append(existing)
        
        return list(set(parents))[:3]  # Limit to top 3 parents
    
    def get_active_domains(self) -> List[DomainDescriptor]:
        """Get all currently active domains sorted by mission relevance."""
        return sorted(
            self.domains.values(),
            key=lambda d: d.mission_relevance,
            reverse=True
        )
    
    def get_domains_for_kernel(
        self, 
        capability: CapabilitySignature,
        max_domains: int = 20
    ) -> List[DomainDescriptor]:
        """
        Get domains a kernel should monitor based on its capabilities.
        
        This is NOT a fixed list - it adapts to kernel strengths
        and mission relevance.
        """
        scored_domains = []
        
        for domain in self.domains.values():
            # Combine mission relevance with kernel capability
            capability_score = capability.strengths.get(domain.name, 0.5)
            combined_score = 0.6 * domain.mission_relevance + 0.4 * capability_score
            
            # Boost domains kernel discovered itself
            if domain.name in capability.discovered_domains:
                combined_score *= 1.2
            
            scored_domains.append((domain, combined_score))
        
        # Sort by combined score and return top domains
        scored_domains.sort(key=lambda x: x[1], reverse=True)
        return [d for d, _ in scored_domains[:max_domains]]
    
    def refresh_from_telemetry(self):
        """Refresh domain relevance scores from latest telemetry."""
        if not self.enabled:
            return
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Update event counts and phi statistics
                    for domain_name, descriptor in self.domains.items():
                        cur.execute("""
                            SELECT COUNT(*), AVG((intelligence->>'phi')::float)
                            FROM shadow_pantheon_intel
                            WHERE search_type = %s
                            AND created_at > NOW() - INTERVAL '7 days'
                        """, (domain_name,))
                        row = cur.fetchone()
                        if row and row[0]:
                            descriptor.event_count = row[0]
                            if row[1]:
                                descriptor.phi_statistics['recent_average'] = row[1]
                                
                                # Update mission relevance
                                evidence = {
                                    'phi_average': row[1],
                                    'event_count': row[0],
                                }
                                descriptor.mission_relevance = self.mission.relevance_score(
                                    domain_name, evidence
                                )
            
            self.last_discovery_scan = datetime.now().timestamp()
            
        except Exception as e:
            print(f"[DomainDiscovery] Refresh error: {e}")


# Singleton instance
_domain_discovery: Optional[DomainDiscovery] = None


def get_domain_discovery() -> DomainDiscovery:
    """Get the singleton DomainDiscovery instance."""
    global _domain_discovery
    if _domain_discovery is None:
        _domain_discovery = DomainDiscovery()
    return _domain_discovery


def get_mission_profile() -> MissionProfile:
    """Get the shared mission profile."""
    return get_domain_discovery().mission


def discover_domain_from_event(
    event_content: str,
    event_type: str,
    phi: float,
    metadata: Optional[Dict] = None
) -> Optional[DomainDescriptor]:
    """Convenience function to discover domains from events."""
    return get_domain_discovery().discover_new_domain(
        event_content, event_type, phi, metadata
    )


def get_kernel_domains(capability: CapabilitySignature) -> List[DomainDescriptor]:
    """Get domains for a specific kernel based on its capabilities."""
    return get_domain_discovery().get_domains_for_kernel(capability)
