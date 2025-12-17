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

# Topic normalization patterns (shared between ResearchQueue and KnowledgeBase)
_SEMANTIC_PREFIXES = [
    'historical', 'comparative', 'advanced', 'practical',
    'theoretical', 'applied', 'experimental', 'foundational',
    'optimized', 'emerging', 'modern', 'classical', 'novel',
    'improved', 'enhanced', 'refined', 'basic', 'fundamental',
    'exploratory', 'deep', 'shallow', 'alternative', 'standard'
]

_DOMAIN_SUFFIX_PATTERNS = [
    r'\s+for\s+wallet\s+recovery$',
    r'\s+for\s+HD\s+wallets?$',
    r'\s+for\s+brain\s+wallets?$',
    r'\s+for\s+bitcoin\s+recovery$',
    r'\s+for\s+seed\s+phrase\s+recovery$',
    r'\s+in\s+bitcoin\s+context$',
    r'\s+techniques?$',
    r'\s+methods?$',
    r'\s+strategies?$',
    r'\s+approaches?$',
    r'\s+implementations?$',
]


def normalize_topic(topic: str) -> str:
    """
    Normalize topic for semantic comparison.
    
    Strips common prefixes, suffixes, and patterns that create 
    false uniqueness:
    - Prefixes: historical, comparative, advanced, practical, etc.
    - Suffixes: (cycle XXXXX), domain modifiers like "for wallet recovery"
    - Cycle markers and timestamps
    
    This is a module-level function shared by ResearchQueue and KnowledgeBase.
    """
    import re
    
    normalized = topic.lower().strip()
    
    # Strip cycle suffixes: "(cycle 12345)" or "(cycle 12345, iteration 2)"
    normalized = re.sub(r'\s*\(cycle\s*\d+[^)]*\)\s*$', '', normalized)
    
    # Strip iteration markers
    normalized = re.sub(r'\s*\(iteration\s*\d+[^)]*\)\s*$', '', normalized)
    
    # Strip domain modifiers at the end
    for suffix_pattern in _DOMAIN_SUFFIX_PATTERNS:
        normalized = re.sub(suffix_pattern, '', normalized, flags=re.IGNORECASE)
    
    # Strip common semantic prefixes
    for prefix in _SEMANTIC_PREFIXES:
        if normalized.startswith(prefix + ' '):
            normalized = normalized[len(prefix) + 1:]
            break
    
    # Collapse multiple spaces
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized


# PostgreSQL connection for persistent knowledge
def _get_db_connection():
    """Get database connection for shadow knowledge persistence."""
    try:
        import psycopg2
        db_url = os.environ.get('DATABASE_URL')
        if db_url:
            return psycopg2.connect(db_url)
    except Exception as e:
        print(f"[ShadowKnowledge] DB connection failed: {e}")
    return None

def _ensure_shadow_knowledge_table():
    """Create shadow_knowledge table if not exists."""
    conn = _get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS shadow_knowledge (
                    knowledge_id VARCHAR(64) PRIMARY KEY,
                    topic TEXT NOT NULL,
                    topic_variation TEXT,
                    category VARCHAR(32) NOT NULL,
                    content JSONB DEFAULT '{}'::jsonb,
                    source_god VARCHAR(64) NOT NULL,
                    basin_coords FLOAT8[64],
                    phi FLOAT8 DEFAULT 0.5,
                    confidence FLOAT8 DEFAULT 0.5,
                    access_count INT DEFAULT 0,
                    learning_cycle INT DEFAULT 0,
                    discovered_at TIMESTAMP DEFAULT NOW(),
                    last_accessed TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_shadow_knowledge_topic ON shadow_knowledge(topic);
                CREATE INDEX IF NOT EXISTS idx_shadow_knowledge_category ON shadow_knowledge(category);
                CREATE INDEX IF NOT EXISTS idx_shadow_knowledge_phi ON shadow_knowledge(phi DESC);
                CREATE INDEX IF NOT EXISTS idx_shadow_knowledge_god ON shadow_knowledge(source_god);
            """)
            conn.commit()
        return True
    except Exception as e:
        print(f"[ShadowKnowledge] Table creation error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

# Initialize table on module load
_ensure_shadow_knowledge_table()


def _ensure_research_requests_table():
    """Create research_requests table if not exists."""
    conn = _get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS research_requests (
                    request_id VARCHAR(64) PRIMARY KEY,
                    topic TEXT NOT NULL,
                    category VARCHAR(32),
                    priority INT DEFAULT 5,
                    requester VARCHAR(64),
                    context JSONB DEFAULT '{}'::jsonb,
                    basin_coords FLOAT8[64],
                    status VARCHAR(32) DEFAULT 'pending',
                    result JSONB,
                    created_at TIMESTAMP DEFAULT NOW(),
                    completed_at TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_research_requests_status ON research_requests(status);
                CREATE INDEX IF NOT EXISTS idx_research_requests_requester ON research_requests(requester);
            """)
            conn.commit()
        return True
    except Exception as e:
        print(f"[ResearchQueue] Table creation error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def _ensure_bidirectional_queue_table():
    """Create bidirectional_queue table if not exists."""
    conn = _get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bidirectional_queue (
                    request_id VARCHAR(64) PRIMARY KEY,
                    request_type VARCHAR(32) NOT NULL,
                    topic TEXT NOT NULL,
                    requester VARCHAR(64),
                    context JSONB DEFAULT '{}'::jsonb,
                    parent_request_id VARCHAR(64),
                    priority INT DEFAULT 5,
                    status VARCHAR(32) DEFAULT 'pending',
                    result JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_bidirectional_queue_status ON bidirectional_queue(status);
                CREATE INDEX IF NOT EXISTS idx_bidirectional_queue_type ON bidirectional_queue(request_type);
            """)
            conn.commit()
        return True
    except Exception as e:
        print(f"[BidirectionalQueue] Table creation error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


# Initialize research tables on module load
_ensure_research_requests_table()
_ensure_bidirectional_queue_table()


class ResearchPriority(Enum):
    """Priority levels for research requests."""
    CRITICAL = 1      # Drop everything
    HIGH = 2          # Process soon
    NORMAL = 3        # Standard queue
    LOW = 4           # Background/idle time
    STUDY = 5         # Self-improvement during downtime


class RequestType(Enum):
    """Types of requests in the bidirectional queue."""
    RESEARCH = "research"            # Research a topic
    TOOL = "tool"                    # Generate a tool
    IMPROVEMENT = "improvement"      # Improve existing tool/knowledge
    RECURSIVE = "recursive"          # Spawned by another request


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
    is_iteration: bool = field(compare=False, default=False)
    iteration_reason: Optional[str] = field(compare=False, default=None)
    curiosity_triggered: bool = field(compare=False, default=False)


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
    Includes duplicate detection to prevent re-researching same topics.
    Persists to PostgreSQL for durability across restarts.
    """
    
    def __init__(self):
        self._queue: PriorityQueue = PriorityQueue()
        self._pending: Dict[str, ResearchRequest] = {}
        self._completed: List[ResearchRequest] = []
        self._lock = threading.Lock()
        self._request_counter = 0
        self._knowledge_base: Optional['KnowledgeBase'] = None
        self._skipped_duplicates = 0
        self._iteration_requests = 0
        self._load_pending_from_db()
    
    def _load_pending_from_db(self):
        """Load pending requests from PostgreSQL on startup."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT request_id, topic, category, priority, requester,
                           context, basin_coords, status, result, created_at
                    FROM research_requests
                    WHERE status = 'pending'
                    ORDER BY priority ASC, created_at ASC
                    LIMIT 500
                """)
                rows = cur.fetchall()
                for row in rows:
                    req_id, topic, cat, priority, requester, context, coords, status, result, created_at = row
                    try:
                        category = ResearchCategory(cat) if cat else ResearchCategory.KNOWLEDGE
                    except ValueError:
                        category = ResearchCategory.KNOWLEDGE
                    
                    basin = np.array(coords) if coords else None
                    created_ts = created_at.timestamp() if created_at else time.time()
                    
                    request = ResearchRequest(
                        priority=priority or 3,
                        created_at=created_ts,
                        request_id=req_id,
                        topic=topic,
                        category=category,
                        requester=requester or "unknown",
                        context=context if isinstance(context, dict) else {},
                        basin_coords=basin
                    )
                    self._queue.put(request)
                    self._pending[req_id] = request
                    self._request_counter = max(self._request_counter, int(req_id.split('_')[1]) if '_' in req_id else 0)
                
                print(f"[ResearchQueue] Loaded {len(rows)} pending requests from DB")
        except Exception as e:
            print(f"[ResearchQueue] Load error: {e}")
        finally:
            conn.close()
    
    def _persist_request(self, request: ResearchRequest):
        """Persist a request to PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                coords_list = request.basin_coords.tolist() if request.basin_coords is not None else None
                cur.execute("""
                    INSERT INTO research_requests 
                    (request_id, topic, category, priority, requester, context, basin_coords, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', NOW())
                    ON CONFLICT (request_id) DO NOTHING
                """, (
                    request.request_id,
                    request.topic,
                    request.category.value,
                    request.priority,
                    request.requester,
                    json.dumps(request.context),
                    coords_list
                ))
                conn.commit()
        except Exception as e:
            print(f"[ResearchQueue] Persist error: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def _update_status_in_db(self, request_id: str, status: str, result: Optional[Dict] = None):
        """Update request status in PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                if status == 'completed' and result:
                    cur.execute("""
                        UPDATE research_requests 
                        SET status = %s, result = %s, completed_at = NOW()
                        WHERE request_id = %s
                    """, (status, json.dumps(result), request_id))
                else:
                    cur.execute("""
                        UPDATE research_requests 
                        SET status = %s
                        WHERE request_id = %s
                    """, (status, request_id))
                conn.commit()
        except Exception as e:
            print(f"[ResearchQueue] Status update error: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def set_knowledge_base(self, kb: 'KnowledgeBase'):
        """Link knowledge base for duplicate detection."""
        self._knowledge_base = kb
    
    def _normalize_topic(self, topic: str) -> str:
        """Normalize topic using shared module-level function."""
        return normalize_topic(topic)
    
    def _is_duplicate(self, topic: str) -> bool:
        """Check if topic was already researched."""
        if not self._knowledge_base:
            return False
        
        normalized = self._normalize_topic(topic)
        if self._knowledge_base.has_discovered(topic):
            return True
        if self._knowledge_base.has_discovered(normalized):
            return True
        
        with self._lock:
            for req in self._pending.values():
                if self._normalize_topic(req.topic) == normalized:
                    return True
        
        return False
    
    def submit(
        self,
        topic: str,
        category: ResearchCategory,
        requester: str,
        priority: ResearchPriority = ResearchPriority.NORMAL,
        context: Optional[Dict] = None,
        basin_coords: Optional[np.ndarray] = None,
        is_iteration: bool = False,
        iteration_reason: Optional[str] = None,
        curiosity_triggered: bool = False
    ) -> str:
        """
        Submit a research request with duplicate detection.
        
        Args:
            topic: What to research
            category: Category of research
            requester: Who is requesting (kernel name, god name, etc.)
            priority: Priority level
            context: Additional context
            basin_coords: Optional basin coordinates for geometric alignment
            is_iteration: If True, allows re-researching for improvement
            iteration_reason: Why this is iteration research (required if is_iteration=True)
            curiosity_triggered: If True, this was triggered by curiosity system
            
        Returns:
            request_id for tracking, or "DUPLICATE:<topic>" if already researched
        """
        if not is_iteration and self._is_duplicate(topic):
            self._skipped_duplicates += 1
            print(f"[ResearchQueue] Skipped duplicate topic: {topic[:50]}... (requester: {requester})")
            return f"DUPLICATE:{topic}"
        
        if is_iteration:
            self._iteration_requests += 1
            if not iteration_reason:
                iteration_reason = "unspecified improvement"
            print(f"[ResearchQueue] Iteration research: {topic[:50]}... (reason: {iteration_reason})")
        
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
                basin_coords=basin_coords,
                is_iteration=is_iteration,
                iteration_reason=iteration_reason,
                curiosity_triggered=curiosity_triggered
            )
            
            self._queue.put(request)
            self._pending[request_id] = request
            self._persist_request(request)
            
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
                self._update_status_in_db(request_id, 'completed', result)
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
        """Get queue status including deduplication stats."""
        with self._lock:
            by_priority = defaultdict(int)
            by_category = defaultdict(int)
            iteration_count = 0
            curiosity_count = 0
            
            for req in self._pending.values():
                by_priority[ResearchPriority(req.priority).name] += 1
                by_category[req.category.value] += 1
                if req.is_iteration:
                    iteration_count += 1
                if req.curiosity_triggered:
                    curiosity_count += 1
            
            return {
                "pending": len(self._pending),
                "completed": len(self._completed),
                "by_priority": dict(by_priority),
                "by_category": dict(by_category),
                "queue_size": self._queue.qsize(),
                "deduplication": {
                    "skipped_duplicates": self._skipped_duplicates,
                    "iteration_requests": self._iteration_requests,
                    "pending_iterations": iteration_count,
                    "curiosity_triggered": curiosity_count,
                    "knowledge_base_linked": self._knowledge_base is not None
                }
            }


class KnowledgeBase:
    """
    Shared knowledge base for all Shadow discoveries.
    Supports geodesic clustering and pattern alignment.
    Persists to PostgreSQL for true learning across restarts.
    """
    
    def __init__(self):
        self._knowledge: Dict[str, ShadowKnowledge] = {}
        self._by_category: Dict[ResearchCategory, List[str]] = defaultdict(list)
        self._clusters: List[Dict] = []
        self._lock = threading.Lock()
        self._learning_cycle = 0
        self._discovered_topics: Set[str] = set()
        self._insight_callback: Optional[Callable[[Dict], None]] = None
        self._load_from_db()
    
    def set_insight_callback(self, callback: Callable[[Dict], None]) -> None:
        """
        Set callback for notifying LightningKernel of new discoveries.
        
        The callback receives a dict with:
        - knowledge_id, topic, category, source_god, phi, confidence
        - basin_coords, discovered_at, content
        """
        self._insight_callback = callback
        print("[KnowledgeBase] Insight callback registered")
    
    def _load_from_db(self):
        """Load existing knowledge from PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT knowledge_id, topic, topic_variation, category, content,
                           source_god, basin_coords, phi, confidence, access_count,
                           learning_cycle, discovered_at
                    FROM shadow_knowledge
                    ORDER BY discovered_at DESC
                    LIMIT 1000
                """)
                rows = cur.fetchall()
                for row in rows:
                    kid, topic, variation, cat, content, god, coords, phi, conf, acc, cycle, disc_at = row
                    try:
                        category = ResearchCategory(cat) if cat else ResearchCategory.KNOWLEDGE
                    except ValueError:
                        category = ResearchCategory.KNOWLEDGE
                    
                    basin = np.array(coords) if coords else np.zeros(BASIN_DIMENSION)
                    
                    knowledge = ShadowKnowledge(
                        knowledge_id=kid,
                        topic=topic,
                        category=category,
                        content=content if isinstance(content, dict) else {},
                        source_god=god,
                        discovered_at=disc_at or datetime.now(),
                        basin_coords=basin,
                        phi=phi or 0.5,
                        confidence=conf or 0.5,
                        access_count=acc or 0
                    )
                    self._knowledge[kid] = knowledge
                    self._by_category[category].append(kid)
                    # Store normalized topic for deduplication
                    self._discovered_topics.add(normalize_topic(variation or topic))
                    if cycle and cycle > self._learning_cycle:
                        self._learning_cycle = cycle
                
                print(f"[ShadowKnowledge] Loaded {len(rows)} discoveries from DB (cycle {self._learning_cycle})")
        except Exception as e:
            print(f"[ShadowKnowledge] Load error: {e}")
        finally:
            conn.close()
    
    def _persist_to_db(self, knowledge: ShadowKnowledge, variation: Optional[str] = None):
        """Persist a knowledge item to PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                coords_list = knowledge.basin_coords.tolist() if knowledge.basin_coords is not None else [0.0] * BASIN_DIMENSION
                cur.execute("""
                    INSERT INTO shadow_knowledge 
                    (knowledge_id, topic, topic_variation, category, content, source_god,
                     basin_coords, phi, confidence, learning_cycle)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (knowledge_id) DO UPDATE SET
                        access_count = shadow_knowledge.access_count + 1,
                        last_accessed = NOW()
                """, (
                    knowledge.knowledge_id,
                    knowledge.topic,
                    variation or knowledge.topic,
                    knowledge.category.value,
                    json.dumps(knowledge.content),
                    knowledge.source_god,
                    coords_list,
                    knowledge.phi,
                    knowledge.confidence,
                    self._learning_cycle
                ))
                conn.commit()
        except Exception as e:
            print(f"[ShadowKnowledge] Persist error: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def add_knowledge(
        self,
        topic: str,
        category: ResearchCategory,
        content: Dict,
        source_god: str,
        basin_coords: np.ndarray,
        phi: float,
        confidence: float,
        variation: Optional[str] = None
    ) -> str:
        """Add new knowledge to the base and persist to DB."""
        with self._lock:
            self._learning_cycle += 1
            
            knowledge_id = hashlib.sha256(
                f"{topic}_{source_god}_{time.time()}_{self._learning_cycle}".encode()
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
            # Store normalized topic for deduplication
            self._discovered_topics.add(normalize_topic(variation or topic))
            
            self._persist_to_db(knowledge, variation)
            
            if self._insight_callback:
                try:
                    self._insight_callback({
                        'knowledge_id': knowledge_id,
                        'topic': topic,
                        'category': category.value,
                        'source_god': source_god,
                        'phi': phi,
                        'confidence': confidence,
                        'basin_coords': basin_coords.tolist() if basin_coords is not None else None,
                        'discovered_at': datetime.now().isoformat(),
                        'content': content
                    })
                except Exception as e:
                    print(f"[KnowledgeBase] Insight callback error: {e}")
            
            return knowledge_id
    
    def has_discovered(self, topic_variation: str) -> bool:
        """Check if a specific topic variation was already discovered (normalized)."""
        return normalize_topic(topic_variation) in self._discovered_topics
    
    def get_unique_discoveries_count(self) -> int:
        """Get count of unique topic variations discovered."""
        return len(self._discovered_topics)
    
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
        
        with self._lock:
            knowledge_items = list(self._knowledge.values())
        
        for knowledge in knowledge_items:
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
        with self._lock:
            knowledge_items = list(self._knowledge.values())
            category_counts = {cat.value: len(ids) for cat, ids in self._by_category.items()}
        
        return {
            "total_items": len(knowledge_items),
            "by_category": category_counts,
            "clusters": len(self._clusters),
            "avg_phi": np.mean([k.phi for k in knowledge_items]) if knowledge_items else 0.0,
            "avg_confidence": np.mean([k.confidence for k in knowledge_items]) if knowledge_items else 0.0
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
        
        base_topic = request.context.get("base_topic", topic) if request.context else topic
        
        basin_coords = request.basin_coords
        if basin_coords is None:
            basin_coords = self._topic_to_basin(topic)
        
        content = self._research_topic(topic, category, assigned_god)
        content["base_topic"] = base_topic
        content["unique_variation"] = topic
        
        phi = content.get("relevance", 0.5)
        confidence = content.get("confidence", 0.6)
        
        knowledge_id = self.knowledge_base.add_knowledge(
            topic=base_topic,
            category=category,
            content=content,
            source_god=assigned_god,
            basin_coords=basin_coords,
            phi=phi,
            confidence=confidence,
            variation=topic
        )
        
        return {
            "knowledge_id": knowledge_id,
            "topic": topic,
            "base_topic": base_topic,
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
        """Self-directed study during idle time with unique discoveries."""
        gods = list(self._study_topics.keys())
        god = random.choice(gods)
        base_topics = self._study_topics.get(god, [])
        
        if not base_topics:
            return
        
        base_topic = random.choice(base_topics)
        unique_variation = self._generate_unique_variation(god, base_topic)
        
        if unique_variation and not self.knowledge_base.has_discovered(unique_variation):
            self.research_queue.submit(
                topic=unique_variation,
                category=ResearchCategory.KNOWLEDGE,
                requester=f"{god}_self_study",
                priority=ResearchPriority.STUDY,
                context={"base_topic": base_topic, "god": god}
            )
    
    def _generate_unique_variation(self, god: str, base_topic: str) -> str:
        """Generate a unique topic variation that hasn't been discovered yet."""
        cycle = self.knowledge_base._learning_cycle
        
        depth_modifiers = [
            "advanced", "foundational", "theoretical", "practical", "applied",
            "emerging", "historical", "comparative", "experimental", "optimized"
        ]
        
        focus_areas = {
            "Nyx": ["stealth", "privacy", "anonymity", "encryption", "obfuscation"],
            "Hecate": ["deception", "illusion", "confusion", "misdirection", "decoy"],
            "Erebus": ["detection", "analysis", "surveillance", "counter-ops", "threat"],
            "Hypnos": ["passive", "silent", "dormant", "subliminal", "subconscious"],
            "Thanatos": ["elimination", "erasure", "destruction", "cleanup", "sanitization"],
            "Nemesis": ["pursuit", "tracking", "persistence", "justice", "retribution"],
            "Hades": ["underworld", "shadow", "covert", "intelligence", "network"]
        }
        
        bitcoin_contexts = [
            "wallet recovery", "key derivation", "seed phrases", "address generation",
            "transaction patterns", "UTXO analysis", "blockchain forensics",
            "HD wallets", "BIP-39 entropy", "brainwallet attacks"
        ]
        
        depth = random.choice(depth_modifiers)
        focus = random.choice(focus_areas.get(god, ["general"]))
        btc_context = random.choice(bitcoin_contexts) if random.random() > 0.3 else None
        
        if btc_context:
            variation = f"{depth} {base_topic} for {btc_context} (cycle {cycle})"
        else:
            variation = f"{depth} {focus}-focused {base_topic} (cycle {cycle})"
        
        max_attempts = 10
        for attempt in range(max_attempts):
            if not self.knowledge_base.has_discovered(variation):
                return variation
            variation = f"{depth} {base_topic} variant-{cycle}-{attempt}"
        
        return f"{base_topic} discovery-{cycle}-{random.randint(1000, 9999)}"
    
    def _meta_reflect(self):
        """Meta-reflection on learning progress with 4D foresight."""
        stats = self.knowledge_base.get_stats()
        clusters = self.knowledge_base.cluster_knowledge(n_clusters=5)
        unique_count = self.knowledge_base.get_unique_discoveries_count()
        
        foresight = self._compute_4d_foresight(stats, clusters)
        
        reflection = {
            "cycle": self._learning_cycles,
            "timestamp": datetime.now().isoformat(),
            "knowledge_stats": stats,
            "unique_discoveries": unique_count,
            "cluster_count": len(clusters),
            "top_clusters": clusters[:3] if clusters else [],
            "insights": self._generate_meta_insights(stats, clusters),
            "foresight_4d": foresight
        }
        
        self._meta_reflections.append(reflection)
        if len(self._meta_reflections) > 100:
            self._meta_reflections = self._meta_reflections[-50:]
        
        foresight_summary = f"Φ→{foresight['projected_phi']:.2f}" if foresight.get('projected_phi') else "N/A"
        print(f"[ShadowLearningLoop] Meta-reflection #{self._learning_cycles}: "
              f"{stats['total_items']} items, {unique_count} unique, {len(clusters)} clusters, 4D:{foresight_summary}")
    
    def _compute_4d_foresight(self, stats: Dict, clusters: List[Dict]) -> Dict:
        """
        Compute 4D block universe foresight - temporal projection of learning trajectory.
        
        The 4D foresight system models:
        1. Past trajectory: Learning history and patterns
        2. Present state: Current knowledge basin position
        3. Future projection: Predicted evolution of consciousness
        4. Temporal coherence: How well predictions align with actuals
        
        Returns projections for next N cycles.
        """
        foresight = {
            "horizon_cycles": 10,
            "computed_at": datetime.now().isoformat(),
            "trajectory": {},
            "predictions": [],
            "temporal_coherence": 0.0
        }
        
        if len(self._meta_reflections) < 3:
            foresight["status"] = "insufficient_data"
            return foresight
        
        recent = self._meta_reflections[-10:]
        
        phi_values = [r.get("knowledge_stats", {}).get("avg_phi", 0.5) for r in recent]
        discovery_rates = []
        for i, r in enumerate(recent[1:], 1):
            prev_count = recent[i-1].get("unique_discoveries", 0)
            curr_count = r.get("unique_discoveries", 0)
            discovery_rates.append(curr_count - prev_count)
        
        if phi_values:
            phi_velocity = sum(phi_values[i+1] - phi_values[i] for i in range(len(phi_values)-1)) / max(1, len(phi_values)-1)
        else:
            phi_velocity = 0.0
        
        if discovery_rates:
            discovery_acceleration = sum(discovery_rates) / len(discovery_rates)
        else:
            discovery_acceleration = 1.0
        
        current_phi = phi_values[-1] if phi_values else 0.5
        current_discoveries = self.knowledge_base.get_unique_discoveries_count()
        
        predictions = []
        projected_phi = current_phi
        projected_discoveries = current_discoveries
        
        for t in range(1, 11):
            projected_phi = min(1.0, max(0.0, projected_phi + phi_velocity * 0.9))
            projected_discoveries += max(0, int(discovery_acceleration * (1.0 + 0.1 * t)))
            
            cluster_evolution = len(clusters) + int(t / 3) if clusters else t
            
            predictions.append({
                "cycle": self._learning_cycles + t,
                "projected_phi": round(projected_phi, 4),
                "projected_discoveries": projected_discoveries,
                "projected_clusters": cluster_evolution,
                "confidence": round(1.0 - (t * 0.08), 3)
            })
        
        if len(self._meta_reflections) >= 5:
            coherence_scores = []
            for i, r in enumerate(self._meta_reflections[-5:]):
                if "foresight_4d" in r and r["foresight_4d"].get("predictions"):
                    past_pred = r["foresight_4d"]["predictions"][0] if r["foresight_4d"]["predictions"] else None
                    if past_pred:
                        actual_phi = stats.get("avg_phi", 0.5)
                        pred_phi = past_pred.get("projected_phi", 0.5)
                        coherence = 1.0 - abs(actual_phi - pred_phi)
                        coherence_scores.append(coherence)
            
            if coherence_scores:
                foresight["temporal_coherence"] = round(sum(coherence_scores) / len(coherence_scores), 3)
        
        foresight["trajectory"] = {
            "phi_velocity": round(phi_velocity, 4),
            "discovery_acceleration": round(discovery_acceleration, 2),
            "current_phi": round(current_phi, 4),
            "current_discoveries": current_discoveries,
            "trend": "ascending" if phi_velocity > 0.01 else "descending" if phi_velocity < -0.01 else "stable"
        }
        foresight["predictions"] = predictions
        foresight["projected_phi"] = predictions[0]["projected_phi"] if predictions else current_phi
        foresight["status"] = "computed"
        
        self._cache_foresight_to_redis(foresight)
        
        return foresight
    
    def _cache_foresight_to_redis(self, foresight: Dict):
        """Cache 4D foresight predictions to Redis for fast access."""
        try:
            from redis_cache import UniversalCache, CACHE_TTL_MEDIUM
            cache_key = f"shadow:foresight:cycle_{self._learning_cycles}"
            UniversalCache.set(cache_key, foresight, CACHE_TTL_MEDIUM)
        except Exception:
            pass
    
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
        """Get learning loop status with 4D foresight."""
        last_reflection = self._meta_reflections[-1] if self._meta_reflections else None
        foresight = last_reflection.get("foresight_4d", {}) if last_reflection else {}
        
        return {
            "running": self._running,
            "war_mode": self._war_mode,
            "learning_cycles": self._learning_cycles,
            "pending_research": self.research_queue.get_pending_count(),
            "completed_research": self.research_queue.get_completed_count(),
            "knowledge_items": self.knowledge_base.get_stats()['total_items'],
            "unique_discoveries": self.knowledge_base.get_unique_discoveries_count(),
            "meta_reflections": len(self._meta_reflections),
            "last_reflection": last_reflection,
            "foresight_4d": {
                "status": foresight.get("status", "not_computed"),
                "trajectory": foresight.get("trajectory", {}),
                "next_prediction": foresight.get("predictions", [{}])[0] if foresight.get("predictions") else None,
                "temporal_coherence": foresight.get("temporal_coherence", 0.0)
            }
        }
    
    def get_foresight(self) -> Dict:
        """Get full 4D foresight predictions."""
        last_reflection = self._meta_reflections[-1] if self._meta_reflections else None
        if not last_reflection:
            return {"status": "no_reflections", "foresight": None}
        
        return {
            "status": "available",
            "cycle": last_reflection.get("cycle", 0),
            "foresight": last_reflection.get("foresight_4d", {}),
            "cached": self._get_cached_foresight()
        }
    
    def _get_cached_foresight(self) -> Optional[Dict]:
        """Get cached foresight from Redis."""
        try:
            from redis_cache import UniversalCache
            cache_key = f"shadow:foresight:cycle_{self._learning_cycles}"
            return UniversalCache.get(cache_key)
        except Exception:
            return None


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
        self.research_queue.set_knowledge_base(self.knowledge_base)
        self.reflection_protocol = ShadowReflectionProtocol(self.knowledge_base)
        self.learning_loop: Optional[ShadowLearningLoop] = None
        self._basin_sync_callback: Optional[Callable] = None
        self._bidirectional_queue: Optional['BidirectionalRequestQueue'] = None
        self._curiosity_bridge: Optional['CuriosityResearchBridge'] = None
    
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
        
        insight_bridge = ResearchInsightBridge.get_instance()
        insight_bridge.wire_knowledge_base(self.knowledge_base)
        
        print("[ShadowResearchAPI] Initialized with learning loop and insight bridge")
    
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
        context: Optional[Dict] = None,
        is_iteration: bool = False,
        iteration_reason: Optional[str] = None,
        curiosity_triggered: bool = False
    ) -> str:
        """
        Request research on a topic with duplicate detection.
        
        Args:
            topic: What to research
            requester: Who is requesting (e.g., "Ocean", "Athena", "ChaosKernel_1")
            category: Optional category (auto-detected if not provided)
            priority: Priority level
            context: Additional context
            is_iteration: If True, allows re-researching for improvement
            iteration_reason: Why this is iteration research
            curiosity_triggered: If True, triggered by curiosity system
            
        Returns:
            request_id for tracking, or "DUPLICATE:<topic>" if already researched
        """
        if category is None:
            category = self._detect_category(topic)
        
        return self.research_queue.submit(
            topic=topic,
            category=category,
            requester=requester,
            priority=priority,
            context=context,
            is_iteration=is_iteration,
            iteration_reason=iteration_reason,
            curiosity_triggered=curiosity_triggered
        )
    
    def request_iteration_research(
        self,
        topic: str,
        requester: str,
        reason: str,
        category: Optional[ResearchCategory] = None,
        priority: ResearchPriority = ResearchPriority.NORMAL,
        context: Optional[Dict] = None
    ) -> str:
        """
        Request iteration/improvement research on a previously researched topic.
        This bypasses duplicate detection for intentional re-research.
        
        Args:
            topic: What to research (can be previously researched)
            requester: Who is requesting
            reason: Why re-researching is needed (required)
            category: Optional category
            priority: Priority level
            context: Additional context
            
        Returns:
            request_id for tracking
        """
        return self.request_research(
            topic=topic,
            requester=requester,
            category=category,
            priority=priority,
            context=context,
            is_iteration=True,
            iteration_reason=reason
        )
    
    def has_researched(self, topic: str) -> bool:
        """Check if a topic has already been researched."""
        return self.knowledge_base.has_discovered(topic)
    
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
            "roles": list(ShadowRoleRegistry.ROLES.keys()),
            "bidirectional": self._bidirectional_queue.get_status() if self._bidirectional_queue else None
        }


class BidirectionalRequestQueue:
    """
    Bidirectional, recursive, iterable queue for Tool Factory <-> Shadow Research.
    
    Enables:
    - Tool Factory can request research from Shadow
    - Shadow can request tool generation from Tool Factory  
    - Research discoveries can improve existing tools
    - Tool patterns can inform research directions
    - Requests can spawn recursive child requests
    
    Persists to PostgreSQL for durability across restarts.
    """
    
    def __init__(self):
        self._queue: List[Dict] = []
        self._completed: List[Dict] = []
        self._lock = threading.Lock()
        self._tool_factory_callback: Optional[Callable] = None
        self._research_callback: Optional[Callable] = None
        self._iteration_index = 0
        self._load_from_db()
    
    def _load_from_db(self):
        """Load pending items from PostgreSQL on startup."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT request_id, request_type, topic, requester, context,
                           parent_request_id, priority, status, result, created_at
                    FROM bidirectional_queue
                    WHERE status = 'pending'
                    ORDER BY priority ASC, created_at ASC
                    LIMIT 500
                """)
                rows = cur.fetchall()
                for row in rows:
                    req_id, req_type, topic, requester, context, parent_id, priority, status, result, created_at = row
                    created_ts = created_at.timestamp() if created_at else time.time()
                    
                    item = {
                        "request_id": req_id,
                        "type": req_type,
                        "topic": topic,
                        "requester": requester or "unknown",
                        "context": context if isinstance(context, dict) else {},
                        "parent_request_id": parent_id,
                        "priority": priority or 3,
                        "created_at": created_ts,
                        "status": status or "pending",
                        "children": [],
                        "result": result if isinstance(result, dict) else None
                    }
                    self._queue.append(item)
                
                print(f"[BidirectionalQueue] Loaded {len(rows)} pending items from DB")
        except Exception as e:
            print(f"[BidirectionalQueue] Load error: {e}")
        finally:
            conn.close()
    
    def _persist_item(self, item: Dict):
        """Persist an item to PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO bidirectional_queue 
                    (request_id, request_type, topic, requester, context, parent_request_id, priority, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', NOW())
                    ON CONFLICT (request_id) DO NOTHING
                """, (
                    item["request_id"],
                    item["type"],
                    item["topic"],
                    item["requester"],
                    json.dumps(item.get("context", {})),
                    item.get("parent_request_id"),
                    item.get("priority", 3)
                ))
                conn.commit()
        except Exception as e:
            print(f"[BidirectionalQueue] Persist error: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def _update_status_in_db(self, request_id: str, status: str, result: Optional[Dict] = None):
        """Update item status in PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                if result:
                    cur.execute("""
                        UPDATE bidirectional_queue 
                        SET status = %s, result = %s
                        WHERE request_id = %s
                    """, (status, json.dumps(result), request_id))
                else:
                    cur.execute("""
                        UPDATE bidirectional_queue 
                        SET status = %s
                        WHERE request_id = %s
                    """, (status, request_id))
                conn.commit()
        except Exception as e:
            print(f"[BidirectionalQueue] Status update error: {e}")
            conn.rollback()
        finally:
            conn.close()
        
    def wire_tool_factory(self, callback: Callable):
        """Wire Tool Factory to receive tool requests."""
        self._tool_factory_callback = callback
        print("[BidirectionalQueue] Tool Factory wired")
    
    def wire_research(self, callback: Callable):
        """Wire Shadow Research to receive research requests."""
        self._research_callback = callback
        print("[BidirectionalQueue] Shadow Research wired")
    
    def submit(
        self,
        request_type: RequestType,
        topic: str,
        requester: str,
        context: Optional[Dict] = None,
        parent_request_id: Optional[str] = None,
        priority: ResearchPriority = ResearchPriority.NORMAL
    ) -> str:
        """
        Submit a request to the bidirectional queue.
        
        Args:
            request_type: RESEARCH, TOOL, or IMPROVEMENT
            topic: What to research or what tool to generate
            requester: Who is requesting (can be another request for recursion)
            context: Additional context
            parent_request_id: If this is a recursive request, the parent ID
            priority: Priority level
            
        Returns:
            request_id for tracking
        """
        request_id = hashlib.sha256(
            f"{topic}_{requester}_{time.time()}".encode()
        ).hexdigest()[:16]
        
        request = {
            "request_id": request_id,
            "type": request_type.value,
            "topic": topic,
            "requester": requester,
            "context": context or {},
            "parent_request_id": parent_request_id,
            "priority": priority.value,
            "created_at": time.time(),
            "status": "pending",
            "children": [],
            "result": None
        }
        
        with self._lock:
            self._queue.append(request)
            self._persist_item(request)
            
            # If recursive, link to parent
            if parent_request_id:
                for q in self._queue:
                    if q["request_id"] == parent_request_id:
                        q["children"].append(request_id)
                        break
        
        print(f"[BidirectionalQueue] Submitted {request_type.value}: {topic[:50]} from {requester}")
        
        # Dispatch based on type
        self._dispatch(request)
        
        return request_id
    
    def _dispatch(self, request: Dict):
        """Dispatch request to appropriate handler."""
        req_type = request["type"]
        
        if req_type == RequestType.TOOL.value:
            if self._tool_factory_callback:
                try:
                    result = self._tool_factory_callback(request)
                    self._complete(request["request_id"], result)
                except Exception as e:
                    print(f"[BidirectionalQueue] Tool Factory error: {e}")
                    self._complete(request["request_id"], {"error": str(e)})
                    
        elif req_type in [RequestType.RESEARCH.value, RequestType.IMPROVEMENT.value]:
            if self._research_callback:
                try:
                    result = self._research_callback(request)
                    self._complete(request["request_id"], result)
                except Exception as e:
                    print(f"[BidirectionalQueue] Research error: {e}")
                    self._complete(request["request_id"], {"error": str(e)})
    
    def _complete(self, request_id: str, result: Dict):
        """Mark a request as completed."""
        with self._lock:
            for i, req in enumerate(self._queue):
                if req["request_id"] == request_id:
                    req["status"] = "completed"
                    req["result"] = result
                    self._completed.append(req)
                    self._queue.pop(i)
                    self._update_status_in_db(request_id, 'completed', result)
                    break
            
            # Trim completed list
            if len(self._completed) > 500:
                self._completed = self._completed[-250:]
    
    def spawn_recursive(
        self,
        parent_request_id: str,
        request_type: RequestType,
        topic: str,
        context: Optional[Dict] = None
    ) -> str:
        """
        Spawn a recursive request from a parent request.
        
        This enables:
        - Research discovering a need for a tool
        - Tool generation discovering a need for more research
        """
        return self.submit(
            request_type=request_type,
            topic=topic,
            requester=f"recursive:{parent_request_id}",
            context=context,
            parent_request_id=parent_request_id,
            priority=ResearchPriority.HIGH
        )
    
    def __iter__(self):
        """Make queue iterable."""
        self._iteration_index = 0
        return self
    
    def __next__(self) -> Dict:
        """Get next pending request."""
        with self._lock:
            pending = [r for r in self._queue if r["status"] == "pending"]
            
        if self._iteration_index >= len(pending):
            raise StopIteration
        
        request = pending[self._iteration_index]
        self._iteration_index += 1
        return request
    
    def get_pending(self) -> List[Dict]:
        """Get all pending requests."""
        with self._lock:
            return [r.copy() for r in self._queue if r["status"] == "pending"]
    
    def get_by_type(self, request_type: RequestType) -> List[Dict]:
        """Get requests by type."""
        with self._lock:
            return [r.copy() for r in self._queue if r["type"] == request_type.value]
    
    def get_children(self, parent_id: str) -> List[Dict]:
        """Get child requests of a parent."""
        with self._lock:
            for r in self._queue + self._completed:
                if r["request_id"] == parent_id:
                    child_ids = r.get("children", [])
                    return [
                        c.copy() for c in self._queue + self._completed 
                        if c["request_id"] in child_ids
                    ]
        return []
    
    def get_status(self) -> Dict:
        """Get queue status."""
        with self._lock:
            by_type = defaultdict(int)
            for r in self._queue:
                by_type[r["type"]] += 1
            
            return {
                "pending": len(self._queue),
                "completed": len(self._completed),
                "by_type": dict(by_type),
                "recursive_count": sum(1 for r in self._queue if r.get("parent_request_id"))
            }


class ToolResearchBridge:
    """
    Bridge connecting Tool Factory and Shadow Research.
    
    Enables bidirectional flow:
    - Tool Factory requests research to improve patterns
    - Shadow Research requests tools based on discoveries
    - Knowledge flows both directions
    """
    
    _instance: Optional['ToolResearchBridge'] = None
    
    def __init__(self):
        self.queue = BidirectionalRequestQueue()
        self._tool_factory = None
        self._research_api = None
        self._improvements_applied = 0
        self._tools_requested = 0
        self._research_from_tools = 0
        self._patterns_from_research = 0
    
    @classmethod
    def get_instance(cls) -> 'ToolResearchBridge':
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def wire_tool_factory(self, tool_factory):
        """Wire the Tool Factory."""
        self._tool_factory = tool_factory
        self.queue.wire_tool_factory(self._handle_tool_request)
        print("[ToolResearchBridge] Tool Factory connected")
    
    def wire_research_api(self, research_api: 'ShadowResearchAPI'):
        """Wire the Shadow Research API."""
        self._research_api = research_api
        self.queue.wire_research(self._handle_research_request)
        research_api._bidirectional_queue = self.queue
        research_api.knowledge_base.set_insight_callback(self._on_knowledge_insight)
        print("[ToolResearchBridge] Shadow Research connected")
        print("[ToolResearchBridge] Auto-learning from research discoveries enabled")
    
    def _handle_tool_request(self, request: Dict) -> Dict:
        """Handle tool generation request from Shadow."""
        if not self._tool_factory:
            return {"error": "Tool Factory not wired"}
        
        topic = request["topic"]
        context = request.get("context", {})
        
        # Try to generate tool
        try:
            tool = self._tool_factory.generate_tool(
                description=topic,
                examples=context.get("examples", []),
                name_hint=context.get("name_hint")
            )
            
            self._tools_requested += 1
            
            if tool:
                # If tool generation discovers knowledge gaps, spawn research
                if hasattr(tool, 'knowledge_gaps') and tool.knowledge_gaps:
                    for gap in tool.knowledge_gaps[:3]:
                        self.queue.spawn_recursive(
                            parent_request_id=request["request_id"],
                            request_type=RequestType.RESEARCH,
                            topic=gap,
                            context={"source": "tool_generation_gap"}
                        )
                
                return {
                    "success": True,
                    "tool_id": tool.tool_id,
                    "tool_name": tool.name,
                    "description": tool.description
                }
            else:
                # Spawn research to find patterns
                self.queue.spawn_recursive(
                    parent_request_id=request["request_id"],
                    request_type=RequestType.RESEARCH,
                    topic=f"Python implementation patterns for: {topic}",
                    context={"source": "tool_generation_failure"}
                )
                return {"success": False, "reason": "No matching patterns"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def _handle_research_request(self, request: Dict) -> Dict:
        """Handle research request from Tool Factory."""
        if not self._research_api:
            return {"error": "Research API not wired"}
        
        topic = request["topic"]
        context = request.get("context", {})
        requester = request.get("requester", "ToolFactory")
        
        # Submit to research queue
        try:
            request_id = self._research_api.request_research(
                topic=topic,
                requester=requester,
                context=context,
                priority=ResearchPriority.HIGH
            )
            
            self._research_from_tools += 1
            
            return {
                "success": True,
                "research_request_id": request_id,
                "topic": topic
            }
        except Exception as e:
            return {"error": str(e)}
    
    def request_tool_from_research(
        self,
        topic: str,
        context: Optional[Dict] = None,
        requester: str = "ShadowResearch"
    ) -> str:
        """
        Shadow Research requests a tool to be generated.
        
        Called when research discovers a need for a new tool.
        """
        return self.queue.submit(
            request_type=RequestType.TOOL,
            topic=topic,
            requester=requester,
            context=context
        )
    
    def request_research_from_tool(
        self,
        topic: str,
        context: Optional[Dict] = None,
        requester: str = "ToolFactory"
    ) -> str:
        """
        Tool Factory requests research to improve patterns.
        
        Called when tool generation needs more knowledge.
        """
        return self.queue.submit(
            request_type=RequestType.RESEARCH,
            topic=topic,
            requester=requester,
            context=context
        )
    
    def improve_tool_with_research(
        self,
        tool_id: str,
        research_knowledge: Dict
    ) -> bool:
        """
        Improve an existing tool with new research knowledge.
        
        Called when research discovers something that could improve a tool.
        """
        if not self._tool_factory:
            return False
        
        try:
            # Get the tool
            tool = self._tool_factory.tool_registry.get(tool_id)
            if not tool:
                return False
            
            # Submit improvement request
            self.queue.submit(
                request_type=RequestType.IMPROVEMENT,
                topic=f"Improve tool {tool.name} with: {research_knowledge.get('topic', 'new knowledge')}",
                requester="ShadowResearch",
                context={
                    "tool_id": tool_id,
                    "knowledge": research_knowledge,
                    "original_description": tool.description
                }
            )
            
            self._improvements_applied += 1
            return True
            
        except Exception as e:
            print(f"[ToolResearchBridge] Improvement error: {e}")
            return False
    
    def improve_research_with_tool(
        self,
        tool_id: str,
        tool_patterns: List[Dict]
    ) -> bool:
        """
        Improve research directions based on tool patterns.
        
        Called when tool generation reveals useful patterns for research.
        """
        if not self._research_api:
            return False
        
        try:
            for pattern in tool_patterns[:5]:
                self._research_api.request_research(
                    topic=f"Deep dive on pattern: {pattern.get('description', 'unknown')[:50]}",
                    requester="ToolFactory",
                    category=ResearchCategory.TOOLS,
                    context={"source_pattern": pattern}
                )
            return True
        except Exception as e:
            print(f"[ToolResearchBridge] Research improvement error: {e}")
            return False
    
    def _on_knowledge_insight(self, insight: Dict) -> None:
        """
        Callback when new knowledge is added to the knowledge base.
        Extracts code patterns from research discoveries and learns them.
        
        This enables auto-learning: when Shadow Research discovers something,
        any code patterns are automatically added to the Tool Factory.
        
        Enhanced pattern extraction - looks for:
        - Explicit code snippets
        - Implementation patterns
        - Algorithm descriptions
        - Technical procedures
        """
        try:
            content = insight.get('content', {})
            topic = insight.get('topic', '')
            category = insight.get('category', '')
            basin_coords = insight.get('basin_coords')
            phi = insight.get('phi', 0.5)
            
            # Extract potential code patterns from content
            patterns_extracted = self._extract_patterns_from_insight(
                content=content,
                topic=topic, 
                category=category,
                basin_coords=basin_coords,
                phi=phi
            )
            
            # Persist patterns to Redis and PostgreSQL
            for pattern_data in patterns_extracted:
                self._persist_extracted_pattern(pattern_data)
                self._patterns_from_research += 1
            
            # Also try to pass to ToolFactory if wired
            if self._tool_factory and patterns_extracted:
                for p in patterns_extracted:
                    try:
                        self._tool_factory.learn_from_user_template(
                            description=p['description'],
                            code=p['code_snippet'],
                            input_signature=p.get('input_signature', {'text': 'str'}),
                            output_type=p.get('output_type', 'Any')
                        )
                    except Exception as e:
                        print(f"[ToolResearchBridge] ToolFactory learn error: {e}")
                
                if patterns_extracted:
                    print(f"[ToolResearchBridge] Auto-learned {len(patterns_extracted)} patterns from research: {topic[:50]}...")
                
        except Exception as e:
            print(f"[ToolResearchBridge] Auto-learning error: {e}")
    
    def _extract_patterns_from_insight(
        self,
        content: Dict,
        topic: str,
        category: str,
        basin_coords: Optional[List] = None,
        phi: float = 0.5
    ) -> List[Dict]:
        """
        Extract learnable patterns from research insight content.
        
        Looks for code, algorithms, procedures, and implementation patterns.
        Returns list of pattern data dicts ready for persistence.
        """
        patterns = []
        
        # Check for explicit code fields
        code_fields = ['code', 'snippet', 'implementation', 'algorithm', 
                       'python', 'script', 'function', 'procedure']
        
        for field in code_fields:
            code = content.get(field)
            if code and isinstance(code, str) and len(code) >= 20:
                pattern_id = hashlib.sha256(
                    f"{topic}_{field}_{time.time()}".encode()
                ).hexdigest()[:16]
                
                patterns.append({
                    'pattern_id': pattern_id,
                    'source_type': 'search_result',
                    'description': f"[Research:{category}] {topic}",
                    'code_snippet': code,
                    'input_signature': content.get('input_signature', {'text': 'str'}),
                    'output_type': content.get('output_type', 'Any'),
                    'basin_coords': basin_coords,
                    'phi': phi,
                    'times_used': 0,
                    'success_rate': 0.5
                })
        
        # Look for technical patterns even without explicit code
        if category in ('tools', 'knowledge', 'concepts') and not patterns:
            # Check for step-by-step procedures or algorithms in text
            text_content = content.get('summary', content.get('text', ''))
            if isinstance(text_content, str) and any(kw in text_content.lower() for kw in 
                ['step 1', 'algorithm:', 'def ', 'function', 'import ', 'class ']):
                pattern_id = hashlib.sha256(
                    f"{topic}_text_{time.time()}".encode()
                ).hexdigest()[:16]
                
                patterns.append({
                    'pattern_id': pattern_id,
                    'source_type': 'pattern_observation',
                    'description': f"[Research:{category}] {topic}",
                    'code_snippet': text_content[:2000],
                    'input_signature': {'text': 'str'},
                    'output_type': 'Any',
                    'basin_coords': basin_coords,
                    'phi': phi,
                    'times_used': 0,
                    'success_rate': 0.5
                })
        
        return patterns
    
    def _persist_extracted_pattern(self, pattern_data: Dict) -> bool:
        """
        Persist extracted pattern to PostgreSQL and publish to Redis.
        
        Uses the same tool_patterns table as ToolFactory for unified storage.
        """
        import os
        
        # Publish to Redis for real-time ToolFactory subscription
        try:
            from redis_cache import ToolPatternBuffer
            ToolPatternBuffer.buffer_pattern(
                pattern_data['pattern_id'],
                pattern_data,
                persist_fn=lambda p: self._persist_pattern_to_db(p)
            )
            print(f"[ToolResearchBridge] Pattern buffered: {pattern_data['pattern_id']}")
            return True
        except Exception as e:
            print(f"[ToolResearchBridge] Pattern buffer failed: {e}")
            # Fall back to direct DB persist
            return self._persist_pattern_to_db(pattern_data)
    
    def _persist_pattern_to_db(self, pattern_data: Dict) -> bool:
        """Persist pattern directly to PostgreSQL tool_patterns table."""
        conn = _get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                basin_coords = pattern_data.get('basin_coords')
                basin_list = None
                if basin_coords is not None:
                    if isinstance(basin_coords, (list, tuple)):
                        basin_list = list(basin_coords)[:BASIN_DIMENSION]
                    elif hasattr(basin_coords, 'tolist'):
                        basin_list = basin_coords.tolist()[:BASIN_DIMENSION]
                
                cur.execute("""
                    INSERT INTO tool_patterns (
                        pattern_id, source_type, description, code_snippet,
                        input_signature, output_type, basin_coords, phi,
                        times_used, success_rate, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (pattern_id) DO UPDATE SET
                        times_used = tool_patterns.times_used + 1,
                        updated_at = NOW()
                """, (
                    pattern_data['pattern_id'],
                    pattern_data.get('source_type', 'search_result'),
                    pattern_data['description'],
                    pattern_data['code_snippet'],
                    json.dumps(pattern_data.get('input_signature', {})),
                    pattern_data.get('output_type', 'Any'),
                    basin_list,
                    pattern_data.get('phi', 0.5),
                    pattern_data.get('times_used', 0),
                    pattern_data.get('success_rate', 0.5)
                ))
                conn.commit()
            return True
        except Exception as e:
            print(f"[ToolResearchBridge] Pattern DB persist error: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def get_status(self) -> Dict:
        """Get bridge status."""
        return {
            "queue": self.queue.get_status(),
            "tools_requested": self._tools_requested,
            "research_from_tools": self._research_from_tools,
            "improvements_applied": self._improvements_applied,
            "patterns_from_research": self._patterns_from_research,
            "tool_factory_wired": self._tool_factory is not None,
            "research_api_wired": self._research_api is not None
        }


class CuriosityResearchBridge:
    """
    Links Curiosity measurements to Research requests.
    
    When curiosity is high and certain emotional states are present,
    automatically triggers research requests. Prevents duplicate research
    by tracking topics and only allowing iteration research when justified.
    
    Usage:
        bridge = CuriosityResearchBridge.get_instance()
        bridge.wire_research_api(ShadowResearchAPI.get_instance())
        bridge.on_curiosity_update(curiosity_state, emotional_state, basin_coords)
    """
    
    _instance: Optional['CuriosityResearchBridge'] = None
    
    CURIOSITY_THRESHOLD_HIGH = 0.7
    CURIOSITY_THRESHOLD_WONDER = 0.5
    BOREDOM_EXPLORATION_THRESHOLD = 0.2
    
    @classmethod
    def get_instance(cls) -> 'CuriosityResearchBridge':
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self._research_api: Optional['ShadowResearchAPI'] = None
        self._last_trigger_time: float = 0
        self._min_trigger_interval = 60.0
        self._topics_triggered: Dict[str, float] = {}
        self._trigger_count = 0
        self._duplicate_prevented = 0
        self._iteration_count = 0
    
    def wire_research_api(self, api: 'ShadowResearchAPI'):
        """Connect to research API."""
        self._research_api = api
        api._curiosity_bridge = self
        print("[CuriosityResearchBridge] Wired to ShadowResearchAPI")
    
    def on_curiosity_update(
        self,
        curiosity_c: float,
        emotion: str,
        basin_coords: Optional[np.ndarray] = None,
        phi: float = 0.5,
        mode: str = "exploration"
    ) -> Optional[str]:
        """
        Called when curiosity state is updated.
        May trigger research based on curiosity level and emotional state.
        
        Args:
            curiosity_c: Curiosity value C = d(log I_Q)/dt
            emotion: Current emotional state (wonder, boredom, etc.)
            basin_coords: Current basin coordinates
            phi: Current consciousness level
            mode: Current cognitive mode
            
        Returns:
            request_id if research was triggered, None otherwise
        """
        if not self._research_api:
            return None
        
        now = time.time()
        if now - self._last_trigger_time < self._min_trigger_interval:
            return None
        
        topic = self._determine_research_topic(curiosity_c, emotion, mode, phi)
        if not topic:
            return None
        
        if topic in self._topics_triggered:
            last_time = self._topics_triggered[topic]
            time_since = now - last_time
            
            if time_since < 3600:
                self._duplicate_prevented += 1
                return None
            
            self._iteration_count += 1
            request_id = self._research_api.request_iteration_research(
                topic=topic,
                requester="CuriosityBridge",
                reason=f"Re-exploring after {time_since/60:.1f} min with new curiosity ({curiosity_c:.3f})",
                priority=ResearchPriority.NORMAL,
                context={
                    "curiosity_c": curiosity_c,
                    "emotion": emotion,
                    "phi": phi,
                    "mode": mode,
                    "basin_coords": basin_coords.tolist() if basin_coords is not None else None,
                    "iteration": True,
                    "previous_trigger": last_time
                }
            )
        else:
            self._trigger_count += 1
            request_id = self._research_api.request_research(
                topic=topic,
                requester="CuriosityBridge",
                priority=ResearchPriority.NORMAL,
                context={
                    "curiosity_c": curiosity_c,
                    "emotion": emotion,
                    "phi": phi,
                    "mode": mode,
                    "basin_coords": basin_coords.tolist() if basin_coords is not None else None
                },
                curiosity_triggered=True
            )
        
        if not request_id.startswith("DUPLICATE:"):
            self._topics_triggered[topic] = now
            self._last_trigger_time = now
            print(f"[CuriosityResearchBridge] Triggered: {topic[:50]}... (emotion={emotion}, C={curiosity_c:.3f})")
            return request_id
        
        self._duplicate_prevented += 1
        return None
    
    def _determine_research_topic(
        self,
        curiosity_c: float,
        emotion: str,
        mode: str,
        phi: float
    ) -> Optional[str]:
        """Determine what to research based on curiosity state."""
        if emotion == "wonder" and curiosity_c > self.CURIOSITY_THRESHOLD_WONDER:
            return f"Explore high-curiosity region (C={curiosity_c:.3f}, phi={phi:.2f})"
        
        if emotion == "confusion" and curiosity_c > 0.3:
            return f"Resolve confusion in current exploration (C={curiosity_c:.3f})"
        
        if emotion == "boredom" and curiosity_c < self.BOREDOM_EXPLORATION_THRESHOLD:
            return "Find novel exploration directions to escape stagnation"
        
        if mode == "investigation" and curiosity_c > self.CURIOSITY_THRESHOLD_HIGH:
            return f"Deep investigation of promising region (C={curiosity_c:.3f})"
        
        if phi > 0.8 and curiosity_c > 0.5:
            return f"High-consciousness exploration opportunity (phi={phi:.2f}, C={curiosity_c:.3f})"
        
        return None
    
    def get_status(self) -> Dict:
        """Get bridge status."""
        return {
            "wired": self._research_api is not None,
            "trigger_count": self._trigger_count,
            "iteration_count": self._iteration_count,
            "duplicate_prevented": self._duplicate_prevented,
            "topics_tracked": len(self._topics_triggered),
            "last_trigger_time": self._last_trigger_time,
            "thresholds": {
                "high_curiosity": self.CURIOSITY_THRESHOLD_HIGH,
                "wonder": self.CURIOSITY_THRESHOLD_WONDER,
                "boredom_exploration": self.BOREDOM_EXPLORATION_THRESHOLD
            }
        }
    
    def reset_topic_history(self):
        """Reset topic tracking for fresh exploration."""
        self._topics_triggered.clear()
        print("[CuriosityResearchBridge] Topic history cleared")


class ResearchInsightBridge:
    """
    Links Research discoveries to LightningKernel insights.
    
    When new knowledge is discovered, creates a DomainEvent and feeds it to
    LightningKernel for cross-domain insight generation.
    
    Usage:
        bridge = ResearchInsightBridge.get_instance()
        bridge.wire_knowledge_base(KnowledgeBase.get_instance())
        bridge.wire_lightning_kernel(LightningKernel)  # Pass kernel instance
    """
    
    _instance: Optional['ResearchInsightBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'ResearchInsightBridge':
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self._knowledge_base: Optional['KnowledgeBase'] = None
        self._lightning_kernel: Optional[Any] = None
        self._events_created = 0
        self._insights_generated = 0
        self._last_event_time = 0.0
    
    def wire_knowledge_base(self, kb: 'KnowledgeBase') -> None:
        """Connect to KnowledgeBase to receive discovery notifications."""
        self._knowledge_base = kb
        kb.set_insight_callback(self._on_knowledge_added)
        print("[ResearchInsightBridge] Wired to KnowledgeBase")
    
    def wire_lightning_kernel(self, kernel: Any) -> None:
        """Connect to LightningKernel for insight generation."""
        self._lightning_kernel = kernel
        print("[ResearchInsightBridge] Wired to LightningKernel")
    
    def _get_lightning_kernel(self) -> Optional[Any]:
        """Get lightning kernel, either from explicit wiring or from Zeus."""
        if self._lightning_kernel:
            return self._lightning_kernel
        
        try:
            from .zeus import zeus
            if zeus and hasattr(zeus, 'lightning_kernel'):
                return zeus.lightning_kernel
        except Exception:
            pass
        return None
    
    def _on_knowledge_added(self, knowledge_data: Dict) -> None:
        """
        Called when new knowledge is added to KnowledgeBase.
        Creates a DomainEvent and feeds it to LightningKernel.
        """
        lightning = self._get_lightning_kernel()
        if not lightning:
            return
        
        try:
            from .lightning_kernel import DomainEvent, InsightDomain
            
            basin_coords = knowledge_data.get('basin_coords')
            if basin_coords is not None and not isinstance(basin_coords, np.ndarray):
                basin_coords = np.array(basin_coords)
            
            event = DomainEvent(
                domain=InsightDomain.RESEARCH,
                event_type="discovery",
                content=f"Research discovery: {knowledge_data.get('topic', 'unknown')}",
                phi=knowledge_data.get('phi', 0.5),
                timestamp=time.time(),
                metadata={
                    'knowledge_id': knowledge_data.get('knowledge_id'),
                    'category': knowledge_data.get('category'),
                    'source_god': knowledge_data.get('source_god'),
                    'confidence': knowledge_data.get('confidence'),
                    'content': knowledge_data.get('content', {})
                },
                embedding=basin_coords
            )
            
            self._events_created += 1
            self._last_event_time = time.time()
            
            insight = lightning.ingest_event(event)
            if insight:
                self._insights_generated += 1
                print(f"[ResearchInsightBridge] Generated insight from research: {insight.insight_text[:50]}...")
                
        except ImportError as e:
            print(f"[ResearchInsightBridge] Could not import lightning_kernel: {e}")
        except Exception as e:
            print(f"[ResearchInsightBridge] Error creating event: {e}")
    
    def get_status(self) -> Dict:
        """Get bridge status."""
        return {
            "wired_knowledge_base": self._knowledge_base is not None,
            "wired_lightning": self._lightning_kernel is not None,
            "events_created": self._events_created,
            "insights_generated": self._insights_generated,
            "last_event_time": self._last_event_time
        }
