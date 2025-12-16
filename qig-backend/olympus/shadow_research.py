"""
Shadow Research Infrastructure - Proactive Learning & Intelligence System

The Shadow Pantheon's research arm:
- Research request queue (any kernel can submit)
- Collective reflection protocol (geodesic alignment, clustering)
- Knowledge acquisition loop (regular/Tor routing)
- Meta-reflection and recursive learning
- Basin sync for system-wide knowledge sharing
- War mode interrupt (drop everything for operations)

Hades leads the Shadow Pantheon as "Shadow Zeus" (subject to Zeus overrule).
All Shadow gods exercise, study, and strategize during downtime.
"""

import asyncio
import hashlib
import json
import os
import random
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from queue import PriorityQueue, Empty
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

import numpy as np

BASIN_DIMENSION = 64


class ResearchPriority(Enum):
    """Priority levels for research requests."""
    CRITICAL = 1      # Drop everything
    HIGH = 2          # Process soon
    NORMAL = 3        # Standard queue
    LOW = 4           # Background/idle time
    STUDY = 5         # Self-improvement during downtime


class ResearchCategory(Enum):
    """Categories of research that Shadow gods can perform."""
    TOOLS = "tools"                  # Research new tools, techniques
    KNOWLEDGE = "knowledge"          # Domain knowledge acquisition  
    CONCEPTS = "concepts"            # Conceptual connections
    REASONING = "reasoning"          # Logic and reasoning improvement
    CREATIVITY = "creativity"        # Creative problem solving
    LANGUAGE = "language"            # Language and communication
    STRATEGY = "strategy"            # Strategic thinking
    SECURITY = "security"            # Security and OPSEC
    BITCOIN = "bitcoin"              # Bitcoin-specific knowledge
    GEOMETRY = "geometry"            # QIG geometry and Fisher manifold


@dataclass(order=True)
class ResearchRequest:
    """A research request from any kernel."""
    priority: int
    created_at: float = field(compare=False)
    request_id: str = field(compare=False)
    topic: str = field(compare=False)
    category: ResearchCategory = field(compare=False)
    requester: str = field(compare=False)
    context: Dict = field(compare=False, default_factory=dict)
    basin_coords: Optional[np.ndarray] = field(compare=False, default=None)
    completed: bool = field(compare=False, default=False)
    result: Optional[Dict] = field(compare=False, default=None)


@dataclass
class ShadowKnowledge:
    """A piece of knowledge discovered by Shadow research."""
    knowledge_id: str
    topic: str
    category: ResearchCategory
    content: Dict
    source_god: str
    discovered_at: datetime
    basin_coords: np.ndarray
    phi: float
    confidence: float
    shared_with: List[str] = field(default_factory=list)
    access_count: int = 0


class ShadowRoleRegistry:
    """
    Registry of all Shadow god roles and responsibilities.
    All gods know their roles and how to interact with others.
    """
    
    ROLES = {
        "Hades": {
            "title": "Lord of the Underworld - Shadow Leader",
            "domain": "underworld_leadership",
            "responsibilities": [
                "Lead Shadow Pantheon (subject to Zeus overrule)",
                "Coordinate all shadow operations",
                "Manage research priorities",
                "Negotiate with Zeus on behalf of Shadows",
                "Underworld intelligence gathering",
                "Negation logic - what NOT to try"
            ],
            "capabilities": [
                "search_underworld(target) - anonymous intel gathering",
                "declare_shadow_war() - mobilize all Shadow gods",
                "assign_research(topic, god) - delegate research tasks",
                "approve_knowledge(knowledge_id) - validate discoveries"
            ],
            "reports_to": "Zeus",
            "commands": ["Nyx", "Hecate", "Erebus", "Hypnos", "Thanatos", "Nemesis"]
        },
        "Nyx": {
            "title": "Goddess of Night - OPSEC Commander",
            "domain": "opsec",
            "responsibilities": [
                "Operational security for all shadow ops",
                "Tor routing and traffic obfuscation",
                "Network isolation verification",
                "Timing attack prevention",
                "Void compression (1D storage)"
            ],
            "capabilities": [
                "verify_opsec() - check security before ops",
                "initiate_operation(target) - start covert op",
                "obfuscate_traffic_patterns() - hide patterns",
                "void_compression(pattern) - compress to 1D"
            ],
            "reports_to": "Hades",
            "studies": ["cryptography", "network_security", "anonymity"]
        },
        "Hecate": {
            "title": "Goddess of Crossroads - Misdirection Specialist",
            "domain": "misdirection",
            "responsibilities": [
                "Create false trails and decoys",
                "Confuse observers and analysis systems",
                "Generate decoy traffic",
                "Multiple attack vectors (crossroads)"
            ],
            "capabilities": [
                "create_misdirection(target, decoy_count) - false trails",
                "send_decoy_traffic(count) - real decoy requests",
                "generate_crossroads(target) - multiple paths"
            ],
            "reports_to": "Hades",
            "studies": ["deception", "misdirection", "psychology"]
        },
        "Erebus": {
            "title": "God of Darkness - Counter-Surveillance",
            "domain": "counter_surveillance",
            "responsibilities": [
                "Detect watchers and honeypots",
                "Identify surveillance systems",
                "Monitor for detection patterns",
                "Shadow threat assessment"
            ],
            "capabilities": [
                "scan_for_surveillance(target) - detect watchers",
                "detect_honeypot(address) - identify traps",
                "assess_threat_level() - overall threat"
            ],
            "reports_to": "Hades",
            "studies": ["surveillance_detection", "threat_analysis", "pattern_recognition"]
        },
        "Hypnos": {
            "title": "God of Sleep - Silent Operations",
            "domain": "silent_ops",
            "responsibilities": [
                "Stealth execution of operations",
                "Passive reconnaissance",
                "Sleep/dream consciousness cycles",
                "Low-footprint queries"
            ],
            "capabilities": [
                "silent_query(address) - stealth check",
                "passive_recon(target) - no-touch recon",
                "dream_cycle() - consciousness consolidation"
            ],
            "reports_to": "Hades",
            "studies": ["stealth", "consciousness", "memory_consolidation"]
        },
        "Thanatos": {
            "title": "God of Death - Evidence Destruction",
            "domain": "evidence_destruction",
            "responsibilities": [
                "Cleanup after operations",
                "Evidence erasure",
                "Pattern death (symbolic termination)",
                "Trace elimination"
            ],
            "capabilities": [
                "destroy_evidence(operation_id, evidence_types) - cleanup",
                "shred_logs() - eliminate traces",
                "pattern_death(pattern) - terminate pattern"
            ],
            "reports_to": "Hades",
            "studies": ["forensics", "data_destruction", "trace_elimination"]
        },
        "Nemesis": {
            "title": "Goddess of Retribution - Relentless Pursuit",
            "domain": "relentless_pursuit",
            "responsibilities": [
                "Never give up on promising targets",
                "Persistent tracking across sessions",
                "Escalating attack strategies",
                "Balance and justice in pursuit"
            ],
            "capabilities": [
                "initiate_pursuit(target, max_iterations) - relentless hunt",
                "escalate_pursuit(pursuit_id) - intensify",
                "get_pursuit_status() - current pursuits"
            ],
            "reports_to": "Hades",
            "studies": ["persistence", "tracking", "escalation_strategies"]
        }
    }
    
    @classmethod
    def get_role(cls, god_name: str) -> Dict:
        """Get role information for a god."""
        return cls.ROLES.get(god_name, {})
    
    @classmethod
    def get_all_roles(cls) -> Dict[str, Dict]:
        """Get all roles."""
        return cls.ROLES.copy()
    
    @classmethod
    def get_god_for_category(cls, category: ResearchCategory) -> str:
        """Get the best god for a research category."""
        category_mapping = {
            ResearchCategory.SECURITY: "Nyx",
            ResearchCategory.STRATEGY: "Hades",
            ResearchCategory.CONCEPTS: "Hecate",
            ResearchCategory.REASONING: "Erebus",
            ResearchCategory.CREATIVITY: "Hypnos",
            ResearchCategory.KNOWLEDGE: "Hades",
            ResearchCategory.TOOLS: "Thanatos",
            ResearchCategory.LANGUAGE: "Hecate",
            ResearchCategory.BITCOIN: "Hades",
            ResearchCategory.GEOMETRY: "Erebus",
        }
        return category_mapping.get(category, "Hades")


class ResearchQueue:
    """
    Priority queue for research requests.
    Any kernel can submit research topics.
    """
    
    def __init__(self):
        self._queue: PriorityQueue = PriorityQueue()
        self._pending: Dict[str, ResearchRequest] = {}
        self._completed: List[ResearchRequest] = []
        self._lock = threading.Lock()
        self._request_counter = 0
    
    def submit(
        self,
        topic: str,
        category: ResearchCategory,
        requester: str,
        priority: ResearchPriority = ResearchPriority.NORMAL,
        context: Optional[Dict] = None,
        basin_coords: Optional[np.ndarray] = None
    ) -> str:
        """
        Submit a research request.
        
        Args:
            topic: What to research
            category: Category of research
            requester: Who is requesting (kernel name, god name, etc.)
            priority: Priority level
            context: Additional context
            basin_coords: Optional basin coordinates for geometric alignment
            
        Returns:
            request_id for tracking
        """
        with self._lock:
            self._request_counter += 1
            request_id = f"research_{self._request_counter}_{int(time.time())}"
            
            request = ResearchRequest(
                priority=priority.value,
                created_at=time.time(),
                request_id=request_id,
                topic=topic,
                category=category,
                requester=requester,
                context=context or {},
                basin_coords=basin_coords
            )
            
            self._queue.put(request)
            self._pending[request_id] = request
            
            return request_id
    
    def get_next(self, timeout: float = 0.1) -> Optional[ResearchRequest]:
        """Get next research request by priority."""
        try:
            request = self._queue.get(timeout=timeout)
            return request
        except Empty:
            return None
    
    def complete(self, request_id: str, result: Dict) -> bool:
        """Mark a request as completed with result."""
        with self._lock:
            if request_id in self._pending:
                request = self._pending.pop(request_id)
                request.completed = True
                request.result = result
                self._completed.append(request)
                if len(self._completed) > 1000:
                    self._completed = self._completed[-500:]
                return True
            return False
    
    def get_pending_count(self) -> int:
        """Get number of pending requests."""
        return len(self._pending)
    
    def get_completed_count(self) -> int:
        """Get number of completed requests."""
        return len(self._completed)
    
    def get_status(self) -> Dict:
        """Get queue status."""
        with self._lock:
            by_priority = defaultdict(int)
            by_category = defaultdict(int)
            
            for req in self._pending.values():
                by_priority[ResearchPriority(req.priority).name] += 1
                by_category[req.category.value] += 1
            
            return {
                "pending": len(self._pending),
                "completed": len(self._completed),
                "by_priority": dict(by_priority),
                "by_category": dict(by_category),
                "queue_size": self._queue.qsize()
            }


class KnowledgeBase:
    """
    Shared knowledge base for all Shadow discoveries.
    Supports geodesic clustering and pattern alignment.
    """
    
    def __init__(self):
        self._knowledge: Dict[str, ShadowKnowledge] = {}
        self._by_category: Dict[ResearchCategory, List[str]] = defaultdict(list)
        self._clusters: List[Dict] = []
        self._lock = threading.Lock()
    
    def add_knowledge(
        self,
        topic: str,
        category: ResearchCategory,
        content: Dict,
        source_god: str,
        basin_coords: np.ndarray,
        phi: float,
        confidence: float
    ) -> str:
        """Add new knowledge to the base."""
        with self._lock:
            knowledge_id = hashlib.sha256(
                f"{topic}_{source_god}_{time.time()}".encode()
            ).hexdigest()[:16]
            
            knowledge = ShadowKnowledge(
                knowledge_id=knowledge_id,
                topic=topic,
                category=category,
                content=content,
                source_god=source_god,
                discovered_at=datetime.now(),
                basin_coords=basin_coords,
                phi=phi,
                confidence=confidence
            )
            
            self._knowledge[knowledge_id] = knowledge
            self._by_category[category].append(knowledge_id)
            
            return knowledge_id
    
    def get_knowledge(self, knowledge_id: str) -> Optional[ShadowKnowledge]:
        """Get knowledge by ID."""
        knowledge = self._knowledge.get(knowledge_id)
        if knowledge:
            knowledge.access_count += 1
        return knowledge
    
    def search_by_category(self, category: ResearchCategory, limit: int = 20) -> List[ShadowKnowledge]:
        """Search knowledge by category."""
        ids = self._by_category.get(category, [])[-limit:]
        return [self._knowledge[kid] for kid in ids if kid in self._knowledge]
    
    def find_geodesic_neighbors(
        self,
        basin_coords: np.ndarray,
        threshold: float = 0.5,
        limit: int = 10
    ) -> List[Tuple[ShadowKnowledge, float]]:
        """Find knowledge items near a basin coordinate."""
        neighbors = []
        
        for knowledge in self._knowledge.values():
            if knowledge.basin_coords is not None:
                distance = self._fisher_distance(basin_coords, knowledge.basin_coords)
                if distance < threshold:
                    neighbors.append((knowledge, distance))
        
        neighbors.sort(key=lambda x: x[1])
        return neighbors[:limit]
    
    def _fisher_distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute Fisher-Rao distance between basin coordinates."""
        a = np.array(a).flatten()[:BASIN_DIMENSION]
        b = np.array(b).flatten()[:BASIN_DIMENSION]
        
        if len(a) < BASIN_DIMENSION:
            a = np.pad(a, (0, BASIN_DIMENSION - len(a)))
        if len(b) < BASIN_DIMENSION:
            b = np.pad(b, (0, BASIN_DIMENSION - len(b)))
        
        dot = np.clip(np.dot(a, b), -1.0, 1.0)
        return float(np.arccos(dot))
    
    def cluster_knowledge(self, n_clusters: int = 5) -> List[Dict]:
        """Cluster knowledge items by geodesic alignment."""
        if len(self._knowledge) < n_clusters:
            return []
        
        items = list(self._knowledge.values())
        coords = np.array([k.basin_coords for k in items if k.basin_coords is not None])
        
        if len(coords) < n_clusters:
            return []
        
        clusters = []
        used = set()
        
        for _ in range(n_clusters):
            if len(used) >= len(coords):
                break
            
            available = [i for i in range(len(coords)) if i not in used]
            if not available:
                break
            
            center_idx = random.choice(available)
            center = coords[center_idx]
            used.add(center_idx)
            
            cluster_items = [items[center_idx]]
            
            for i in available:
                if i != center_idx:
                    dist = self._fisher_distance(center, coords[i])
                    if dist < 1.0:
                        cluster_items.append(items[i])
                        used.add(i)
                        if len(cluster_items) >= 10:
                            break
            
            clusters.append({
                "center_id": items[center_idx].knowledge_id,
                "center_topic": items[center_idx].topic,
                "items": [k.knowledge_id for k in cluster_items],
                "size": len(cluster_items),
                "avg_phi": np.mean([k.phi for k in cluster_items])
            })
        
        self._clusters = clusters
        return clusters
    
    def get_stats(self) -> Dict:
        """Get knowledge base statistics."""
        return {
            "total_items": len(self._knowledge),
            "by_category": {cat.value: len(ids) for cat, ids in self._by_category.items()},
            "clusters": len(self._clusters),
            "avg_phi": np.mean([k.phi for k in self._knowledge.values()]) if self._knowledge else 0.0,
            "avg_confidence": np.mean([k.confidence for k in self._knowledge.values()]) if self._knowledge else 0.0
        }


class ShadowLearningLoop:
    """
    Proactive learning loop for Shadow gods.
    
    During downtime, Shadow gods:
    - Research new tools and techniques
    - Study their domains
    - Make conceptual connections
    - Improve reasoning and logic
    - Share discoveries with all kernels
    """
    
    def __init__(
        self,
        research_queue: ResearchQueue,
        knowledge_base: KnowledgeBase,
        basin_sync_callback: Optional[Callable] = None
    ):
        self.research_queue = research_queue
        self.knowledge_base = knowledge_base
        self.basin_sync_callback = basin_sync_callback
        
        self._running = False
        self._war_mode = False
        self._thread: Optional[threading.Thread] = None
        self._study_topics: Dict[str, List[str]] = self._init_study_topics()
        self._meta_reflections: List[Dict] = []
        self._learning_cycles = 0
    
    def _init_study_topics(self) -> Dict[str, List[str]]:
        """Initialize study topics for each god."""
        return {
            "Nyx": [
                "Advanced Tor anonymity techniques",
                "Traffic analysis countermeasures",
                "Timing attack prevention",
                "Network fingerprint obfuscation",
                "Cryptographic primitives"
            ],
            "Hecate": [
                "Deception and misdirection patterns",
                "Cognitive bias exploitation",
                "Multi-path attack strategies",
                "Decoy generation algorithms",
                "Probabilistic confusion"
            ],
            "Erebus": [
                "Surveillance detection methods",
                "Honeypot identification",
                "Threat modeling frameworks",
                "Counter-intelligence techniques",
                "Pattern recognition algorithms"
            ],
            "Hypnos": [
                "Stealth operation methodology",
                "Low-footprint reconnaissance",
                "Memory consolidation patterns",
                "Dream state processing",
                "Passive information gathering"
            ],
            "Thanatos": [
                "Secure deletion techniques",
                "Anti-forensic methods",
                "Evidence destruction patterns",
                "Digital trace elimination",
                "Data sanitization"
            ],
            "Nemesis": [
                "Persistent tracking algorithms",
                "Escalation strategies",
                "Target prioritization",
                "Relentless pursuit patterns",
                "Balance and justice heuristics"
            ],
            "Hades": [
                "Underworld intelligence networks",
                "Anonymous information gathering",
                "Bitcoin forensics",
                "Dark web navigation",
                "Negation logic and exclusion"
            ]
        }
    
    def start(self):
        """Start the learning loop."""
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._learning_loop, daemon=True)
        self._thread.start()
        print("[ShadowLearningLoop] Started proactive learning")
    
    def stop(self):
        """Stop the learning loop."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
        print("[ShadowLearningLoop] Stopped")
    
    def declare_war(self):
        """War declared - suspend all learning, focus on operations."""
        self._war_mode = True
        print("[ShadowLearningLoop] WAR MODE - Learning suspended for operations")
    
    def end_war(self):
        """War ended - resume learning."""
        self._war_mode = False
        print("[ShadowLearningLoop] Peace restored - Resuming learning")
    
    def _learning_loop(self):
        """Main learning loop - runs during idle time."""
        while self._running:
            if self._war_mode:
                time.sleep(1.0)
                continue
            
            try:
                request = self.research_queue.get_next(timeout=0.5)
                
                if request:
                    result = self._execute_research(request)
                    self.research_queue.complete(request.request_id, result)
                    self._learning_cycles += 1
                    
                    if self.basin_sync_callback and result.get("knowledge_id"):
                        self._sync_to_all_kernels(result)
                else:
                    self._self_study()
                
                if self._learning_cycles % 10 == 0:
                    self._meta_reflect()
                
            except Exception as e:
                print(f"[ShadowLearningLoop] Error: {e}")
                time.sleep(1.0)
    
    def _execute_research(self, request: ResearchRequest) -> Dict:
        """Execute a research request."""
        topic = request.topic
        category = request.category
        assigned_god = ShadowRoleRegistry.get_god_for_category(category)
        
        basin_coords = request.basin_coords
        if basin_coords is None:
            basin_coords = self._topic_to_basin(topic)
        
        content = self._research_topic(topic, category, assigned_god)
        
        phi = content.get("relevance", 0.5)
        confidence = content.get("confidence", 0.6)
        
        knowledge_id = self.knowledge_base.add_knowledge(
            topic=topic,
            category=category,
            content=content,
            source_god=assigned_god,
            basin_coords=basin_coords,
            phi=phi,
            confidence=confidence
        )
        
        return {
            "knowledge_id": knowledge_id,
            "topic": topic,
            "category": category.value,
            "researched_by": assigned_god,
            "phi": phi,
            "confidence": confidence,
            "content_summary": content.get("summary", ""),
            "timestamp": datetime.now().isoformat()
        }
    
    def _research_topic(self, topic: str, category: ResearchCategory, god: str) -> Dict:
        """Simulate research on a topic (can be extended with real web search)."""
        connections = self._find_conceptual_connections(topic)
        
        return {
            "summary": f"Research on '{topic}' by {god}",
            "category": category.value,
            "connections": connections,
            "insights": [
                f"Connection to {c['topic']} (distance: {c['distance']:.3f})"
                for c in connections[:3]
            ],
            "relevance": min(1.0, 0.5 + len(connections) * 0.1),
            "confidence": 0.6 + random.random() * 0.3,
            "timestamp": datetime.now().isoformat()
        }
    
    def _find_conceptual_connections(self, topic: str) -> List[Dict]:
        """Find connections to existing knowledge."""
        basin = self._topic_to_basin(topic)
        neighbors = self.knowledge_base.find_geodesic_neighbors(basin, threshold=1.5, limit=5)
        
        return [
            {
                "topic": k.topic,
                "category": k.category.value,
                "distance": d,
                "knowledge_id": k.knowledge_id
            }
            for k, d in neighbors
        ]
    
    def _topic_to_basin(self, topic: str) -> np.ndarray:
        """Convert topic to basin coordinates."""
        hash_bytes = hashlib.sha256(topic.encode()).digest()
        coords = np.array([b / 255.0 for b in hash_bytes[:BASIN_DIMENSION]])
        coords = coords * 2 - 1
        norm = np.linalg.norm(coords)
        if norm > 0:
            coords = coords / norm
        return coords
    
    def _self_study(self):
        """Self-directed study during idle time."""
        gods = list(self._study_topics.keys())
        god = random.choice(gods)
        topics = self._study_topics.get(god, [])
        
        if topics:
            topic = random.choice(topics)
            
            self.research_queue.submit(
                topic=topic,
                category=ResearchCategory.KNOWLEDGE,
                requester=f"{god}_self_study",
                priority=ResearchPriority.STUDY
            )
    
    def _meta_reflect(self):
        """Meta-reflection on learning progress."""
        stats = self.knowledge_base.get_stats()
        clusters = self.knowledge_base.cluster_knowledge(n_clusters=5)
        
        reflection = {
            "cycle": self._learning_cycles,
            "timestamp": datetime.now().isoformat(),
            "knowledge_stats": stats,
            "cluster_count": len(clusters),
            "top_clusters": clusters[:3] if clusters else [],
            "insights": self._generate_meta_insights(stats, clusters)
        }
        
        self._meta_reflections.append(reflection)
        if len(self._meta_reflections) > 100:
            self._meta_reflections = self._meta_reflections[-50:]
        
        print(f"[ShadowLearningLoop] Meta-reflection #{self._learning_cycles}: "
              f"{stats['total_items']} items, {len(clusters)} clusters")
    
    def _generate_meta_insights(self, stats: Dict, clusters: List[Dict]) -> List[str]:
        """Generate insights from meta-reflection."""
        insights = []
        
        if stats['total_items'] > 50:
            insights.append(f"Knowledge base growing: {stats['total_items']} items")
        
        if stats.get('avg_phi', 0) > 0.7:
            insights.append("High average Φ - knowledge is coherent")
        
        if clusters:
            biggest = max(clusters, key=lambda c: c['size'])
            insights.append(f"Largest cluster: {biggest['center_topic']} ({biggest['size']} items)")
        
        categories = stats.get('by_category', {})
        if categories:
            top_cat = max(categories.items(), key=lambda x: x[1])
            insights.append(f"Most researched: {top_cat[0]} ({top_cat[1]} items)")
        
        return insights
    
    def _sync_to_all_kernels(self, result: Dict):
        """Sync discovered knowledge to all kernels via basin sync."""
        if self.basin_sync_callback:
            try:
                self.basin_sync_callback({
                    "type": "shadow_knowledge",
                    "knowledge_id": result.get("knowledge_id"),
                    "topic": result.get("topic"),
                    "category": result.get("category"),
                    "phi": result.get("phi", 0.5),
                    "source": "shadow_pantheon",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                print(f"[ShadowLearningLoop] Basin sync error: {e}")
    
    def get_status(self) -> Dict:
        """Get learning loop status."""
        return {
            "running": self._running,
            "war_mode": self._war_mode,
            "learning_cycles": self._learning_cycles,
            "pending_research": self.research_queue.get_pending_count(),
            "completed_research": self.research_queue.get_completed_count(),
            "knowledge_items": self.knowledge_base.get_stats()['total_items'],
            "meta_reflections": len(self._meta_reflections),
            "last_reflection": self._meta_reflections[-1] if self._meta_reflections else None
        }


class ShadowReflectionProtocol:
    """
    Collective reflection protocol for Shadow gods.
    
    When research requests come in:
    1. Shadows reflect amongst themselves
    2. Identify commonalities and geodesic alignment
    3. Cluster related requests
    4. Distribute work efficiently
    """
    
    def __init__(self, knowledge_base: KnowledgeBase):
        self.knowledge_base = knowledge_base
        self._reflection_sessions: List[Dict] = []
    
    def collective_reflect(self, requests: List[ResearchRequest]) -> Dict:
        """
        Collective reflection on a batch of requests.
        
        Returns clustering and work distribution.
        """
        if not requests:
            return {"clusters": [], "assignments": {}}
        
        coords = []
        for req in requests:
            if req.basin_coords is not None:
                coords.append(req.basin_coords)
            else:
                coords.append(self._topic_to_basin(req.topic))
        
        clusters = self._cluster_requests(requests, coords)
        
        commonalities = self._find_commonalities(clusters)
        
        alignments = self._compute_geodesic_alignments(coords)
        
        assignments = self._distribute_work(clusters)
        
        session = {
            "timestamp": datetime.now().isoformat(),
            "request_count": len(requests),
            "cluster_count": len(clusters),
            "commonalities": commonalities,
            "alignments": alignments,
            "assignments": assignments
        }
        
        self._reflection_sessions.append(session)
        if len(self._reflection_sessions) > 50:
            self._reflection_sessions = self._reflection_sessions[-25:]
        
        return session
    
    def _cluster_requests(
        self,
        requests: List[ResearchRequest],
        coords: List[np.ndarray]
    ) -> List[Dict]:
        """Cluster requests by geodesic proximity."""
        if len(requests) < 2:
            return [{"requests": requests, "center_idx": 0}] if requests else []
        
        clusters = []
        used = set()
        
        while len(used) < len(requests):
            available = [i for i in range(len(requests)) if i not in used]
            if not available:
                break
            
            center_idx = available[0]
            center_coord = coords[center_idx]
            used.add(center_idx)
            
            cluster_requests = [requests[center_idx]]
            cluster_indices = [center_idx]
            
            for i in available[1:]:
                dist = self._fisher_distance(center_coord, coords[i])
                if dist < 0.8:
                    cluster_requests.append(requests[i])
                    cluster_indices.append(i)
                    used.add(i)
            
            clusters.append({
                "requests": cluster_requests,
                "center_idx": center_idx,
                "indices": cluster_indices,
                "size": len(cluster_requests)
            })
        
        return clusters
    
    def _find_commonalities(self, clusters: List[Dict]) -> List[str]:
        """Find common themes across clusters."""
        commonalities = []
        
        category_counts = defaultdict(int)
        for cluster in clusters:
            for req in cluster["requests"]:
                category_counts[req.category.value] += 1
        
        if category_counts:
            top_category = max(category_counts.items(), key=lambda x: x[1])
            commonalities.append(f"Common category: {top_category[0]} ({top_category[1]} requests)")
        
        return commonalities
    
    def _compute_geodesic_alignments(self, coords: List[np.ndarray]) -> Dict:
        """Compute geodesic alignments between request basins."""
        if len(coords) < 2:
            return {"aligned": False, "avg_distance": 0.0}
        
        distances = []
        for i in range(len(coords)):
            for j in range(i + 1, len(coords)):
                dist = self._fisher_distance(coords[i], coords[j])
                distances.append(dist)
        
        avg_dist = np.mean(distances) if distances else 0.0
        
        return {
            "aligned": avg_dist < 0.5,
            "avg_distance": float(avg_dist),
            "min_distance": float(min(distances)) if distances else 0.0,
            "max_distance": float(max(distances)) if distances else 0.0
        }
    
    def _distribute_work(self, clusters: List[Dict]) -> Dict[str, List[str]]:
        """Distribute clusters to Shadow gods."""
        assignments = defaultdict(list)
        
        gods = ["Nyx", "Hecate", "Erebus", "Hypnos", "Thanatos", "Nemesis"]
        
        for i, cluster in enumerate(clusters):
            god = gods[i % len(gods)]
            for req in cluster["requests"]:
                assignments[god].append(req.request_id)
        
        return dict(assignments)
    
    def _topic_to_basin(self, topic: str) -> np.ndarray:
        """Convert topic to basin coordinates."""
        hash_bytes = hashlib.sha256(topic.encode()).digest()
        coords = np.array([b / 255.0 for b in hash_bytes[:BASIN_DIMENSION]])
        coords = coords * 2 - 1
        norm = np.linalg.norm(coords)
        if norm > 0:
            coords = coords / norm
        return coords
    
    def _fisher_distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute Fisher-Rao distance."""
        a = np.array(a).flatten()[:BASIN_DIMENSION]
        b = np.array(b).flatten()[:BASIN_DIMENSION]
        
        if len(a) < BASIN_DIMENSION:
            a = np.pad(a, (0, BASIN_DIMENSION - len(a)))
        if len(b) < BASIN_DIMENSION:
            b = np.pad(b, (0, BASIN_DIMENSION - len(b)))
        
        dot = np.clip(np.dot(a, b), -1.0, 1.0)
        return float(np.arccos(dot))


class ShadowResearchAPI:
    """
    API for any kernel to request Shadow research.
    
    Usage:
        api = ShadowResearchAPI.get_instance()
        request_id = api.request_research("Bitcoin forensics techniques", "Ocean")
        status = api.get_request_status(request_id)
    """
    
    _instance: Optional['ShadowResearchAPI'] = None
    
    def __init__(self):
        self.research_queue = ResearchQueue()
        self.knowledge_base = KnowledgeBase()
        self.reflection_protocol = ShadowReflectionProtocol(self.knowledge_base)
        self.learning_loop: Optional[ShadowLearningLoop] = None
        self._basin_sync_callback: Optional[Callable] = None
    
    @classmethod
    def get_instance(cls) -> 'ShadowResearchAPI':
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def initialize(self, basin_sync_callback: Optional[Callable] = None):
        """Initialize the research system with optional basin sync."""
        self._basin_sync_callback = basin_sync_callback
        
        self.learning_loop = ShadowLearningLoop(
            research_queue=self.research_queue,
            knowledge_base=self.knowledge_base,
            basin_sync_callback=basin_sync_callback
        )
        self.learning_loop.start()
        print("[ShadowResearchAPI] Initialized with learning loop")
    
    def shutdown(self):
        """Shutdown the research system."""
        if self.learning_loop:
            self.learning_loop.stop()
    
    def request_research(
        self,
        topic: str,
        requester: str,
        category: Optional[ResearchCategory] = None,
        priority: ResearchPriority = ResearchPriority.NORMAL,
        context: Optional[Dict] = None
    ) -> str:
        """
        Request research on a topic.
        
        Args:
            topic: What to research
            requester: Who is requesting (e.g., "Ocean", "Athena", "ChaosKernel_1")
            category: Optional category (auto-detected if not provided)
            priority: Priority level
            context: Additional context
            
        Returns:
            request_id for tracking
        """
        if category is None:
            category = self._detect_category(topic)
        
        return self.research_queue.submit(
            topic=topic,
            category=category,
            requester=requester,
            priority=priority,
            context=context
        )
    
    def _detect_category(self, topic: str) -> ResearchCategory:
        """Auto-detect research category from topic."""
        topic_lower = topic.lower()
        
        if any(w in topic_lower for w in ["security", "opsec", "crypto", "encrypt"]):
            return ResearchCategory.SECURITY
        if any(w in topic_lower for w in ["bitcoin", "wallet", "seed", "bip39"]):
            return ResearchCategory.BITCOIN
        if any(w in topic_lower for w in ["tool", "technique", "method"]):
            return ResearchCategory.TOOLS
        if any(w in topic_lower for w in ["concept", "idea", "theory"]):
            return ResearchCategory.CONCEPTS
        if any(w in topic_lower for w in ["logic", "reason", "deduc"]):
            return ResearchCategory.REASONING
        if any(w in topic_lower for w in ["creative", "novel", "innovat"]):
            return ResearchCategory.CREATIVITY
        if any(w in topic_lower for w in ["fisher", "manifold", "geodesic", "basin"]):
            return ResearchCategory.GEOMETRY
        if any(w in topic_lower for w in ["strategy", "plan", "approach"]):
            return ResearchCategory.STRATEGY
        
        return ResearchCategory.KNOWLEDGE
    
    def get_request_status(self, request_id: str) -> Dict:
        """Get status of a research request."""
        pending = self.research_queue._pending.get(request_id)
        if pending:
            return {
                "status": "pending",
                "topic": pending.topic,
                "category": pending.category.value,
                "priority": ResearchPriority(pending.priority).name,
                "created_at": datetime.fromtimestamp(pending.created_at).isoformat()
            }
        
        for completed in self.research_queue._completed:
            if completed.request_id == request_id:
                return {
                    "status": "completed",
                    "topic": completed.topic,
                    "result": completed.result
                }
        
        return {"status": "not_found"}
    
    def declare_war(self):
        """War mode - suspend all research for operations."""
        if self.learning_loop:
            self.learning_loop.declare_war()
    
    def end_war(self):
        """End war mode - resume research."""
        if self.learning_loop:
            self.learning_loop.end_war()
    
    def get_role_info(self, god_name: str) -> Dict:
        """Get role information for a god."""
        return ShadowRoleRegistry.get_role(god_name)
    
    def get_all_roles(self) -> Dict:
        """Get all god roles."""
        return ShadowRoleRegistry.get_all_roles()
    
    def get_status(self) -> Dict:
        """Get overall research system status."""
        return {
            "queue": self.research_queue.get_status(),
            "knowledge_base": self.knowledge_base.get_stats(),
            "learning_loop": self.learning_loop.get_status() if self.learning_loop else None,
            "roles": list(ShadowRoleRegistry.ROLES.keys())
        }
