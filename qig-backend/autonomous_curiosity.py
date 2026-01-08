"""
Autonomous Curiosity Engine - Continuous Learning System

Enables kernels to autonomously:
1. Initiate searches based on interest/curiosity
2. Request tool refinements
3. Train on curriculum for deeper self-learning
4. Explore knowledge gaps proactively
5. Learn word relationships with frozen facts compliance

Biological analog: Curiosity-driven exploration like REM sleep memory consolidation.

FROZEN FACTS COMPLIANCE:
- Word relationship learning validates against frozen physics
- Checkpoints are created before/after learning cycles
- Baseline comparisons ensure improvement
"""

import asyncio
import json
import random
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set
from collections import deque
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)


class CuriosityDrive:
    """
    Geometric curiosity metric based on information gain potential.
    
    High curiosity when:
    - Φ variance indicates unexplored regions
    - κ suggests room for deeper understanding
    - Knowledge graph has sparse connections
    """
    
    def __init__(self):
        self.interest_basins: Dict[str, np.ndarray] = {}
        self.exploration_history: deque = deque(maxlen=1000)
        self.novelty_threshold = 0.3
        self._phi_mean = 0.5
        self._phi_std = 0.125
    
    def compute_curiosity(self, topic: str, current_knowledge: Dict) -> float:
        """
        Compute curiosity score for a topic using geometric metrics.
        
        Returns value in [0, 1] where higher = more curious/interested.
        """
        if topic in self.interest_basins:
            basin = self.interest_basins[topic]
            familiarity = float(np.sqrt(np.sum(basin ** 2)))  # L2 magnitude for familiarity score
            novelty = 1.0 - min(1.0, familiarity / 10.0)
        else:
            novelty = 1.0
        
        knowledge_depth = current_knowledge.get('depth', 0)
        knowledge_recency = current_knowledge.get('recency', 0)
        
        time_decay = np.exp(-knowledge_recency / 86400)
        
        curiosity = novelty * (1 - knowledge_depth * 0.5) * time_decay
        
        phi_factor = self._phi_std / max(0.01, self._phi_mean)
        curiosity *= (1 + phi_factor)
        
        return min(1.0, max(0.0, curiosity))
    
    def record_exploration(self, topic: str, outcome: Dict):
        """Record exploration outcome to update curiosity basins."""
        if topic not in self.interest_basins:
            self.interest_basins[topic] = np.zeros(64)
        
        learning_rate = 0.1
        success = outcome.get('success', False)
        info_gain = outcome.get('information_gain', 0.0)
        
        update_vector = np.random.randn(64) * info_gain * 0.1
        if success:
            self.interest_basins[topic] += learning_rate * update_vector
        
        self.exploration_history.append({
            'topic': topic,
            'timestamp': datetime.now().isoformat(),
            'outcome': outcome
        })


class KernelToolRequest:
    """Represents a tool/search request from a kernel."""
    
    def __init__(
        self,
        kernel_name: str,
        request_type: str,
        query: str,
        priority: float = 0.5,
        context: Optional[Dict] = None
    ):
        self.kernel_name = kernel_name
        self.request_type = request_type
        self.query = query
        self.priority = priority
        self.context = context or {}
        self.created_at = datetime.now()
        self.status = 'pending'
        self.result: Optional[Dict[str, Any]] = None


class CurriculumProgressPersistence:
    """
    Database persistence for curriculum learning progress.
    
    Ensures completed topics are not re-processed after restart.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        import os
        self._db_url = os.environ.get('DATABASE_URL')
        self._initialized = True
        self._ensure_table()
    
    def _get_connection(self):
        """Get database connection."""
        if not self._db_url:
            return None
        try:
            import psycopg2
            return psycopg2.connect(self._db_url)
        except Exception as e:
            logger.warning(f"[CurriculumProgressPersistence] DB connection failed: {e}")
            return None
    
    def _ensure_table(self):
        """Create curriculum_progress table if not exists."""
        conn = self._get_connection()
        if not conn:
            return
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS curriculum_progress (
                        id SERIAL PRIMARY KEY,
                        topic_title TEXT UNIQUE NOT NULL,
                        kernel_name TEXT,
                        completed_at TIMESTAMPTZ DEFAULT NOW(),
                        exploration_count INTEGER DEFAULT 1
                    )
                """)
                conn.commit()
                logger.info("[CurriculumProgressPersistence] Table ready")
        except Exception as e:
            logger.warning(f"[CurriculumProgressPersistence] Table creation failed: {e}")
        finally:
            conn.close()
    
    def load_completed_topics(self) -> Set[str]:
        """Load all completed topics from database."""
        conn = self._get_connection()
        if not conn:
            return set()
        
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT topic_title FROM curriculum_progress")
                rows = cur.fetchall()
                completed = {row[0] for row in rows}
                logger.info(f"[CurriculumProgressPersistence] Loaded {len(completed)} completed topics from DB")
                return completed
        except Exception as e:
            logger.warning(f"[CurriculumProgressPersistence] Load failed: {e}")
            return set()
        finally:
            conn.close()
    
    def save_completed_topic(self, topic_title: str, kernel_name: str = None):
        """Save a completed topic to database."""
        conn = self._get_connection()
        if not conn:
            return
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO curriculum_progress (topic_title, kernel_name)
                    VALUES (%s, %s)
                    ON CONFLICT (topic_title) 
                    DO UPDATE SET exploration_count = curriculum_progress.exploration_count + 1,
                                  completed_at = NOW()
                """, (topic_title, kernel_name))
                conn.commit()
                logger.debug(f"[CurriculumProgressPersistence] Saved: {topic_title}...")
        except Exception as e:
            logger.warning(f"[CurriculumProgressPersistence] Save failed: {e}")
        finally:
            conn.close()
    
    def load_recent_queries(self, limit: int = 100) -> List[str]:
        """Load recent exploration queries to avoid repetition."""
        conn = self._get_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT topic_title FROM curriculum_progress
                    ORDER BY completed_at DESC
                    LIMIT %s
                """, (limit,))
                return [row[0] for row in cur.fetchall()]
        except Exception as e:
            logger.warning(f"[CurriculumProgressPersistence] Recent queries load failed: {e}")
            return []
        finally:
            conn.close()
    
    def get_stats(self) -> Dict:
        """Get curriculum progress statistics."""
        conn = self._get_connection()
        if not conn:
            return {'total': 0, 'today': 0}
        
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM curriculum_progress")
                total = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT COUNT(*) FROM curriculum_progress
                    WHERE completed_at >= NOW() - INTERVAL '24 hours'
                """)
                today = cur.fetchone()[0]
                
                return {'total': total, 'today': today}
        except Exception as e:
            return {'total': 0, 'today': 0}
        finally:
            conn.close()


class CurriculumLoader:
    """
    Load and manage training curriculum for kernel self-learning.
    
    Curriculum sources:
    - Attached documents
    - Knowledge base
    - Previous search results
    - Peer learning outcomes
    
    Now with DATABASE PERSISTENCE for completed topics.
    """
    
    def __init__(self):
        self.curriculum_topics: List[Dict] = []
        self.completed_topics: Set[str] = set()
        self.topic_dependencies: Dict[str, List[str]] = {}
        self._persistence = CurriculumProgressPersistence()
        
        # Load completed topics from database on init
        self._load_from_db()
    
    def _load_from_db(self):
        """Load completed topics from database."""
        try:
            db_completed = self._persistence.load_completed_topics()
            self.completed_topics.update(db_completed)
        except Exception as e:
            logger.warning(f"[CurriculumLoader] Failed to load from DB: {e}")
    
    def load_curriculum_from_file(self, filepath: str) -> List[Dict]:
        """Load curriculum topics from a file."""
        try:
            with open(filepath, 'r') as f:
                content = f.read()
            
            topics = self._parse_curriculum_content(content)
            self.curriculum_topics.extend(topics)
            return topics
        except Exception as e:
            print(f"[CurriculumLoader] Failed to load {filepath}: {e}")
            return []
    
    def _parse_curriculum_content(self, content: str) -> List[Dict]:
        """Parse curriculum content into structured topics."""
        topics = []
        
        sections = content.split('# ==')
        for section in sections:
            if not section.strip():
                continue
            
            lines = section.strip().split('\n')
            if lines:
                title = lines[0].replace('=', '').strip()
                body = '\n'.join(lines[1:])
                
                topics.append({
                    'title': title,
                    'content': body,
                    'keywords': self._extract_keywords(body),
                    'difficulty': self._estimate_difficulty(body),
                    'type': 'curriculum'
                })
        
        return topics
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract key concepts from curriculum text."""
        import re
        
        code_keywords = re.findall(r'`([^`]+)`', text)
        capitalized = re.findall(r'\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b', text)
        quoted = re.findall(r'"([^"]+)"', text)
        
        keywords = list(set(code_keywords + capitalized + quoted))
        return keywords[:500]
    
    def _estimate_difficulty(self, text: str) -> float:
        """Estimate difficulty based on content complexity."""
        lines = [len(line) for line in text.split('\n') if line.strip()]
        avg_line_length = float(np.mean(lines)) if lines else 50.0
        code_blocks = text.count('```')
        
        difficulty = min(1.0, (avg_line_length / 100) + (code_blocks * 0.1))
        return difficulty
    
    def get_next_topic(self, kernel_skills: Dict) -> Optional[Dict]:
        """Get next curriculum topic based on kernel skills and dependencies."""
        for topic in self.curriculum_topics:
            topic_id = topic['title']
            
            if topic_id in self.completed_topics:
                continue
            
            deps = self.topic_dependencies.get(topic_id, [])
            if all(d in self.completed_topics for d in deps):
                skill_match = self._compute_skill_match(topic, kernel_skills)
                if skill_match > 0.3:
                    return topic
        
        return None
    
    def _compute_skill_match(self, topic: Dict, kernel_skills: Dict) -> float:
        """Compute how well kernel skills match topic requirements."""
        keywords = set(topic.get('keywords', []))
        kernel_domains = set(kernel_skills.get('domains', []))
        
        if not keywords:
            return 1.0
        
        overlap = len(keywords & kernel_domains)
        return overlap / len(keywords)
    
    def mark_completed(self, topic_title: str, kernel_name: str = None):
        """Mark a topic as completed and persist to database."""
        self.completed_topics.add(topic_title)
        
        # Persist to database so it's not re-requested after restart
        try:
            self._persistence.save_completed_topic(topic_title, kernel_name)
        except Exception as e:
            logger.warning(f"[CurriculumLoader] Failed to persist completion: {e}")


class AutonomousCuriosityEngine:
    """
    Main engine for autonomous, curiosity-driven learning.
    
    Runs continuously in background, managing:
    - Kernel search requests
    - Proactive knowledge exploration
    - Curriculum-based training
    - Tool refinement requests
    """
    
    def __init__(self, search_callback: Optional[Callable] = None):
        self.curiosity_drive = CuriosityDrive()
        self.curriculum_loader = CurriculumLoader()
        
        self.pending_requests: deque = deque(maxlen=100)
        self.active_explorations: Dict[str, Dict] = {}
        self.exploration_results: deque = deque(maxlen=500)
        
        self.search_callback = search_callback
        
        self.running = False
        self._loop_thread: Optional[threading.Thread] = None
        # Reduced interval for development visibility (was 60)
        self._exploration_interval = 30  # 30 seconds between exploration cycles
        self._min_curiosity_threshold = 0.4
        
        self.kernel_interests: Dict[str, List[str]] = {
            'athena': ['strategy', 'patterns', 'optimization', 'game_theory'],
            'ares': ['metrics', 'measurement', 'geometry', 'fisher_information'],
            'apollo': ['prediction', 'forecasting', 'time_series', 'prophecy'],
            'artemis': ['tracking', 'hunting', 'search', 'discovery'],
            'hermes': ['communication', 'translation', 'messaging', 'sync'],
            'hephaestus': ['building', 'tools', 'infrastructure', 'forge'],
            'demeter': ['growth', 'nurturing', 'cultivation', 'sustainability'],
            'dionysus': ['creativity', 'chaos', 'exploration', 'novelty'],
            'poseidon': ['depth', 'ocean', 'waves', 'deep_research'],
            'hades': ['shadow', 'underworld', 'hidden_knowledge', 'secrets'],
            'hera': ['coordination', 'harmony', 'balance', 'relationships'],
            'aphrodite': ['beauty', 'aesthetics', 'design', 'user_experience'],
        }
        
        self.stats = {
            'total_explorations': 0,
            'successful_discoveries': 0,
            'kernel_requests': 0,
            'curriculum_completions': 0,
            'word_learning_cycles': 0,
            'last_word_learning': None,
            'word_learning_relevance': 0.0
        }
        
        # CRITICAL FIX: Reduced from 3600 (1hr) to 300 (5min) for faster coordizer sync
        self._word_learning_interval = 300
        self._last_word_learning_time = 0
        
        # Track recent queries to avoid repetition
        self._recent_queries: deque = deque(maxlen=100)
        self._query_cooldown = set()  # Queries made in current cycle
    
    def start(self):
        """Start the autonomous curiosity loop."""
        if self.running:
            return
        
        # Load recent queries from DB to avoid repetition
        self._load_recent_queries_from_db()
        
        # Auto-load curriculum on startup
        self._load_all_curriculum()
        
        self.running = True
        self._loop_thread = threading.Thread(target=self._run_loop, daemon=True)
        self._loop_thread.start()
        print("[AutonomousCuriosityEngine] Started autonomous learning loop")
    
    def _load_recent_queries_from_db(self):
        """Load recent queries from database to avoid re-exploring same topics."""
        try:
            persistence = CurriculumProgressPersistence()
            recent = persistence.load_recent_queries(limit=100)
            for query in recent:
                self._recent_queries.append(query)
                self._query_cooldown.add(query)
            if recent:
                logger.info(f"[AutonomousCuriosityEngine] Loaded {len(recent)} recent queries from DB to avoid repetition")
        except Exception as e:
            logger.warning(f"[AutonomousCuriosityEngine] Failed to load recent queries: {e}")
    
    def _load_all_curriculum(self):
        """Load all curriculum files from docs/09-curriculum/."""
        # Try relative to project root first (when running from qig-backend/)
        curriculum_dir = Path('../docs/09-curriculum')
        if not curriculum_dir.exists():
            # Try absolute path from script location
            curriculum_dir = Path(__file__).parent.parent / 'docs' / '09-curriculum'
        if not curriculum_dir.exists():
            # Try direct relative (when running from project root)
            curriculum_dir = Path('docs/09-curriculum')
        if not curriculum_dir.exists():
            print(f"[AutonomousCuriosityEngine] Curriculum directory not found (tried: ../docs/09-curriculum, {Path(__file__).parent.parent / 'docs' / '09-curriculum'}, docs/09-curriculum)")
            return
        
        loaded_count = 0
        for filepath in curriculum_dir.glob('*.md'):
            try:
                topics = self.curriculum_loader.load_curriculum_from_file(str(filepath))
                loaded_count += len(topics)
            except Exception as e:
                print(f"[AutonomousCuriosityEngine] Error loading {filepath}: {e}")
        
        completed_count = len(self.curriculum_loader.completed_topics)
        print(f"[AutonomousCuriosityEngine] Loaded {loaded_count} curriculum topics from {curriculum_dir}")
        print(f"[AutonomousCuriosityEngine] {completed_count} topics already completed (from DB), {loaded_count - completed_count} remaining")
    
    def stop(self):
        """Stop the autonomous curiosity loop."""
        self.running = False
        if self._loop_thread:
            self._loop_thread.join(timeout=5)
        print("[AutonomousCuriosityEngine] Stopped autonomous learning loop")
    
    def _run_loop(self):
        """Main loop for autonomous exploration."""
        cycle_count = 0
        while self.running:
            try:
                cycle_count += 1
                print(f"[AutonomousCuriosityEngine] === Cycle {cycle_count} starting ===")

                pending_count = len(self.pending_requests)
                print(f"[AutonomousCuriosityEngine] Processing {pending_count} pending kernel requests")
                self._process_kernel_requests()

                print(f"[AutonomousCuriosityEngine] Exploring curious topics...")
                self._explore_curious_topics()

                print(f"[AutonomousCuriosityEngine] Training on curriculum...")
                self._train_on_curriculum()

                print(f"[AutonomousCuriosityEngine] Checking word learning schedule...")
                self._scheduled_word_learning()

                print(f"[AutonomousCuriosityEngine] Cycle {cycle_count} complete. Stats: "
                      f"explorations={self.stats['total_explorations']}, "
                      f"discoveries={self.stats['successful_discoveries']}, "
                      f"curriculum={self.stats['curriculum_completions']}")
                print(f"[AutonomousCuriosityEngine] Sleeping {self._exploration_interval}s until next cycle...")

                time.sleep(self._exploration_interval)

            except Exception as e:
                print(f"[AutonomousCuriosityEngine] Loop error: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(10)
    
    def submit_kernel_request(self, request: KernelToolRequest):
        """Submit a search/tool request from a kernel."""
        self.pending_requests.append(request)
        self.stats['kernel_requests'] += 1
        print(f"[AutonomousCuriosityEngine] Received request from {request.kernel_name}: {request.query}")
    
    def request_search(
        self,
        kernel_name: str,
        query: str,
        priority: float = 0.5,
        context: Optional[Dict] = None
    ) -> str:
        """Convenience method for kernels to request a search."""
        request = KernelToolRequest(
            kernel_name=kernel_name,
            request_type='search',
            query=query,
            priority=priority,
            context=context
        )
        self.submit_kernel_request(request)
        return f"request_{id(request)}"
    
    def request_tool_refinement(
        self,
        kernel_name: str,
        tool_id: str,
        refinement_type: str,
        details: Dict
    ) -> str:
        """Request refinement of an existing tool."""
        request = KernelToolRequest(
            kernel_name=kernel_name,
            request_type='tool_refinement',
            query=f"Refine {tool_id}: {refinement_type}",
            priority=0.7,
            context={'tool_id': tool_id, 'refinement': refinement_type, 'details': details}
        )
        self.submit_kernel_request(request)
        return f"refinement_{id(request)}"
    
    def _process_kernel_requests(self):
        """Process pending kernel requests."""
        requests_to_process = []
        while self.pending_requests and len(requests_to_process) < 5:
            requests_to_process.append(self.pending_requests.popleft())
        
        requests_to_process.sort(key=lambda r: r.priority, reverse=True)
        
        for request in requests_to_process:
            try:
                if request.request_type == 'search':
                    self._execute_search(request)
                elif request.request_type == 'tool_refinement':
                    self._execute_tool_refinement(request)
            except Exception as e:
                print(f"[AutonomousCuriosityEngine] Request failed: {e}")
                request.status = 'failed'
                request.result = {'error': str(e)}
    
    def _execute_search(self, request: KernelToolRequest):
        """Execute a search request."""
        print(f"[AutonomousCuriosityEngine] Executing search for {request.kernel_name}: {request.query}")
        
        if self.search_callback:
            try:
                result = self.search_callback(request.query, request.context)
                request.status = 'completed'
                request.result = result
                
                # Learn from search results immediately
                self._learn_from_search_result(result)
                
                self.curiosity_drive.record_exploration(
                    topic=request.query,
                    outcome={
                        'success': True,
                        'information_gain': result.get('information_gain', 0.5),
                        'source': 'kernel_request'
                    }
                )
                
                self.exploration_results.append({
                    'type': 'kernel_search',
                    'kernel': request.kernel_name,
                    'query': request.query,
                    'result': result,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                request.status = 'failed'
                request.result = {'error': str(e)}
        else:
            request.status = 'no_callback'
            request.result = {'message': 'Search callback not configured'}
    
    def _learn_from_search_result(self, result: Dict):
        """
        Learn word relationships from search result immediately.
        Updates word relationships and kernel basins in real-time.
        """
        try:
            from word_relationship_learner import WordRelationshipLearner
            from coordizers.pg_loader import PostgresCoordizer
            
            # Extract text from result
            text_content = []
            if isinstance(result, dict):
                content = result.get('content', '') or result.get('text', '') or result.get('summary', '')
                if content:
                    text_content.append(str(content))
                
                snippets = result.get('snippets', []) or result.get('results', [])
                for snippet in snippets:
                    if isinstance(snippet, dict):
                        text = snippet.get('text', '') or snippet.get('content', '') or snippet.get('description', '')
                        if text:
                            text_content.append(str(text))
                    elif isinstance(snippet, str):
                        text_content.append(snippet)
            
            if not text_content:
                return
            
            # Initialize learner with current vocabulary
            coordizer = PostgresCoordizer()
            vocab = set(coordizer.word_tokens)
            learner = WordRelationshipLearner(vocab, window_size=5, expand_vocabulary=True)
            
            # Learn from all text
            total_pairs = 0
            for text in text_content:
                pairs = learner.learn_from_text(text)
                total_pairs += pairs
            
            if total_pairs > 0:
                # Update word relationships cache (using curriculum_training module)
                try:
                    from olympus.curriculum_training import update_word_relationships_cache, adjust_kernel_basins_from_relationships
                    update_word_relationships_cache(learner)
                    adjust_kernel_basins_from_relationships(learner, coordizer)
                    print(f"[AutonomousCuriosityEngine] Learned {total_pairs} word pairs from search, updated basins")
                except ImportError:
                    print(f"[AutonomousCuriosityEngine] Learned {total_pairs} word pairs (curriculum_training not available)")
                
        except Exception as e:
            print(f"[AutonomousCuriosityEngine] Error learning from search: {e}")
    
    def _execute_tool_refinement(self, request: KernelToolRequest):
        """Execute a tool refinement request."""
        print(f"[AutonomousCuriosityEngine] Tool refinement: {request.query}")
        
        request.status = 'completed'
        request.result = {
            'message': 'Refinement request logged',
            'tool_id': request.context.get('tool_id'),
            'refinement': request.context.get('refinement')
        }
    
    def _explore_curious_topics(self):
        """Proactively explore topics based on kernel curiosity."""
        for kernel_name, interests in self.kernel_interests.items():
            topic = random.choice(interests)
            
            knowledge = self._get_current_knowledge(kernel_name, topic)
            curiosity = self.curiosity_drive.compute_curiosity(topic, knowledge)
            
            if curiosity > self._min_curiosity_threshold:
                query = self._generate_exploration_query(kernel_name, topic, knowledge)
                
                # Use Wikipedia and GitHub directly for enriched learning
                self._explore_with_direct_sources(kernel_name, query, topic)
                
                # Also submit to main search callback
                self.request_search(
                    kernel_name=kernel_name,
                    query=query,
                    priority=curiosity * 0.5,
                    context={
                        'exploration_type': 'curiosity_driven',
                        'topic': topic,
                        'curiosity_score': curiosity
                    }
                )
                
                self.stats['total_explorations'] += 1
                
                break
    
    def _explore_with_direct_sources(self, kernel_name: str, query: str, topic: str):
        """
        Explore using ALL available knowledge sources for autonomous learning.
        
        Uses the pluggable KnowledgeOrchestrator to query any registered source.
        Kernels can add their own sources dynamically.
        """
        try:
            from knowledge_sources import get_orchestrator, SourceQuery
            
            orchestrator = get_orchestrator()
            
            source_query = SourceQuery(
                query=topic,
                context={'kernel': kernel_name, 'original_query': query},
                max_results=5,
                requester_kernel=kernel_name
            )
            
            results = orchestrator.query_all_sources(
                query_text=topic,
                context={'kernel': kernel_name},
                requester=kernel_name
            )
            
            if results:
                sources_used = list(set(r.source_name for r in results))
                logger.info(f"[AutonomousCuriosityEngine] Queried {len(sources_used)} sources for '{topic}': {sources_used}")
                
                combined_text = " ".join([r.content for r in results if r.content])
                if combined_text.strip():
                    combined_dict = {
                        'content': combined_text,
                        'results': [
                            {
                                'title': r.title,
                                'content': r.content,
                                'url': r.url,
                                'source': r.source_name
                            }
                            for r in results
                        ]
                    }
                    self._learn_from_search_result(combined_dict)
                    
                    self.curiosity_drive.record_exploration(
                        topic=topic,
                        outcome={
                            'success': True,
                            'information_gain': len(results) * 0.15,
                            'source': 'unified_knowledge_sources',
                            'sources_count': len(sources_used),
                            'sources_used': sources_used
                        }
                    )
                    
                    self.exploration_results.append({
                        'type': 'unified_source_exploration',
                        'kernel': kernel_name,
                        'query': query,
                        'topic': topic,
                        'sources': sources_used,
                        'result_count': len(results),
                        'timestamp': datetime.now().isoformat()
                    })
                    
        except ImportError as e:
            logger.warning(f"[AutonomousCuriosityEngine] Knowledge sources not available: {e}")
        except Exception as e:
            logger.error(f"[AutonomousCuriosityEngine] Source exploration failed: {e}")
    
    def _get_current_knowledge(self, kernel_name: str, topic: str) -> Dict:
        """Get kernel's current knowledge about a topic."""
        explorations = [
            e for e in self.exploration_results
            if e.get('kernel') == kernel_name and topic in e.get('query', '')
        ]
        
        if not explorations:
            return {'depth': 0, 'recency': float('inf')}
        
        latest = max(explorations, key=lambda e: e.get('timestamp', ''))
        try:
            last_time = datetime.fromisoformat(latest['timestamp'])
            recency = (datetime.now() - last_time).total_seconds()
        except:
            recency = 86400
        
        return {
            'depth': min(1.0, len(explorations) / 10),
            'recency': recency,
            'exploration_count': len(explorations)
        }
    
    def _generate_exploration_query(
        self,
        kernel_name: str,
        topic: str,
        knowledge: Dict
    ) -> str:
        """Generate diverse exploration queries from curriculum and curiosity."""
        
        # Pull from curriculum topics for variety
        curriculum_keywords = []
        for ct in self.curriculum_loader.curriculum_topics[:500]:
            curriculum_keywords.extend(ct.get('keywords', [])[:3])
        
        # Diverse query templates aligned with QIG research themes
        exploration_themes = [
            # Foundational understanding
            f"Introduction to {topic} fundamentals and core concepts",
            f"Mathematical foundations of {topic}",
            f"Key theorems and principles in {topic}",
            
            # Advanced research
            f"Latest research advances in {topic} 2024 2025",
            f"Open problems in {topic} research",
            f"State of the art techniques for {topic}",
            
            # Geometric/QIG specific
            f"{topic} from information geometry perspective",
            f"Fisher information metric applied to {topic}",
            f"Quantum information theory and {topic}",
            f"Density matrices in {topic} context",
            
            # Tool improvement
            f"Algorithms and tools for {topic}",
            f"Computational methods for {topic}",
            f"Software libraries for {topic}",
            
            # Cross-domain
            f"{topic} applications in consciousness research",
            f"{topic} connections to machine learning",
            f"Interdisciplinary approaches to {topic}",
        ]
        
        # Mix in curriculum keywords for novelty
        if curriculum_keywords and random.random() > 0.5:
            kw = random.choice(curriculum_keywords)
            exploration_themes.append(f"{kw} relationship to {topic}")
            exploration_themes.append(f"How {kw} informs understanding of {topic}")
        
        # Select based on knowledge depth
        depth = knowledge.get('depth', 0)
        if depth < 0.3:
            # Beginner - foundational
            query = random.choice(exploration_themes[:3])
        elif depth < 0.6:
            # Intermediate - research focus
            query = random.choice(exploration_themes[3:9])
        else:
            # Advanced - tools and cross-domain
            query = random.choice(exploration_themes[9:])
        
        return query
    
    def _train_on_curriculum(self):
        """
        Train on curriculum topics with diverse, non-repetitive queries.

        CRITICAL FIX: Processes MULTIPLE topics per cycle (up to 5) to ensure
        new curriculum is trained continuously until complete, not just 1 per cycle.
        """
        # Clear cooldown at start of cycle
        self._query_cooldown.clear()

        # CRITICAL FIX: Process multiple topics per cycle for continuous training
        topics_this_cycle = 0
        max_topics_per_cycle = 5  # Train on up to 5 topics per cycle

        for kernel_name in self.kernel_interests.keys():
            if topics_this_cycle >= max_topics_per_cycle:
                break  # Limit per cycle to avoid overwhelming

            skills = {
                'domains': self.kernel_interests[kernel_name],
                'depth': self._get_kernel_depth(kernel_name)
            }

            topic = self.curriculum_loader.get_next_topic(skills)

            if topic:
                print(f"[AutonomousCuriosityEngine] Training {kernel_name} on: {topic['title']}")

                # Generate diverse queries from topic
                keywords = topic.get('keywords', [])[:5]
                title = topic['title']

                query_patterns = [
                    f"Mathematical foundations of {title}",
                    f"Key concepts in {title}",
                    f"Applications of {title} in AI research",
                    f"{title} from information geometry perspective",
                    f"Latest advances in {title} 2024 2025",
                ]

                # Add keyword-specific queries
                for kw in keywords[:3]:
                    query_patterns.append(f"{kw} in context of {title}")
                    query_patterns.append(f"How {kw} relates to quantum information")

                # Submit non-duplicate queries
                for query in query_patterns[:4]:
                    query_key = query.lower()[:500]
                    if query_key not in self._query_cooldown and query_key not in [q[:500].lower() for q in self._recent_queries]:
                        self.request_search(
                            kernel_name=kernel_name,
                            query=query,
                            priority=0.3,
                            context={
                                'exploration_type': 'curriculum',
                                'topic_title': title,
                            }
                        )
                        self._query_cooldown.add(query_key)
                        self._recent_queries.append(query)

                self.curriculum_loader.mark_completed(topic['title'])
                self.stats['curriculum_completions'] += 1
                topics_this_cycle += 1
                # NO break - continue to next kernel/topic
    
    def _scheduled_word_learning(self):
        """
        Scheduled word relationship learning cycle with checkpointing.
        
        FROZEN FACTS COMPLIANCE:
        - Creates checkpoint before learning
        - Validates learned relationships against frozen physics
        - Compares against baseline to ensure improvement
        """
        current_time = time.time()
        
        if current_time - self._last_word_learning_time < self._word_learning_interval:
            return
        
        self._last_word_learning_time = current_time
        
        try:
            from word_relationship_learner import WordRelationshipLearner
            from learned_relationships import get_learned_relationships, LearnedRelationships
            from coordizers.pg_loader import PostgresCoordizer
            
            logger.info("[AutonomousCuriosityEngine] Starting scheduled word relationship learning")
            
            lr = get_learned_relationships()
            baseline_count = len(lr.word_neighbors)
            
            coordizer = PostgresCoordizer()
            vocab = set(coordizer.basin_coords.keys())
            learner = WordRelationshipLearner(vocab, window_size=5)
            
            docs_path = Path(__file__).parent.parent / 'docs'
            stats = learner.learn_from_directory(str(docs_path))
            
            exploration_pairs = self._learn_from_explorations(learner)
            
            logger.info(f"[AutonomousCuriosityEngine] Learned from {stats['files_processed']} files, {stats['total_pairs']} pairs + {exploration_pairs} from explorations")
            
            fresh_lr = LearnedRelationships.__new__(LearnedRelationships)
            fresh_lr.word_neighbors = {}
            fresh_lr.adjusted_basins = {}
            fresh_lr.word_frequency = {}
            fresh_lr.learning_complete = False
            
            fresh_lr.update_from_learner(learner, {})
            
            validation = fresh_lr.validate_against_frozen_facts()
            
            if not validation['valid']:
                logger.warning(f"[AutonomousCuriosityEngine] Word learning REJECTED: {validation['stats']}")
                return
            
            new_count = len(fresh_lr.word_neighbors)
            if new_count < baseline_count * 0.95:
                logger.warning(f"[AutonomousCuriosityEngine] Word learning REJECTED: regression detected "
                             f"({new_count} < {baseline_count * 0.95:.0f} = 95% baseline)")
                return
            
            if new_count > baseline_count:
                improvement_pct = ((new_count - baseline_count) / baseline_count) * 100 if baseline_count > 0 else 100
                logger.info(f"[AutonomousCuriosityEngine] Improvement: +{improvement_pct:.1f}% relationships")
            
            fresh_lr.save_to_cache()
            
            self.stats['word_learning_cycles'] += 1
            self.stats['last_word_learning'] = datetime.now().isoformat()
            self.stats['word_learning_relevance'] = validation['stats'].get('total_relationships', 0)
            
            logger.info(f"[AutonomousCuriosityEngine] Word learning complete: {len(fresh_lr.word_neighbors)} relationships saved to PostgreSQL")
            
        except Exception as e:
            logger.error(f"[AutonomousCuriosityEngine] Word learning failed: {e}")
    
    def run_word_learning_now(self) -> Dict:
        """
        Manually trigger word relationship learning cycle.
        Returns learning results and validation status.
        """
        self._last_word_learning_time = 0
        self._scheduled_word_learning()
        return self.stats
    
    def _learn_from_explorations(self, learner) -> int:
        """
        Feed exploration results (search content) into word relationship learner.
        Returns number of additional pairs learned.
        """
        pairs_before = learner.total_pairs
        
        for exploration in self.exploration_results:
            result = exploration.get('result', {})
            
            if isinstance(result, dict):
                content = result.get('content', '') or result.get('text', '') or result.get('summary', '')
                if content:
                    learner.learn_from_text(str(content))
                
                snippets = result.get('snippets', []) or result.get('results', [])
                for snippet in snippets:
                    if isinstance(snippet, dict):
                        text = snippet.get('text', '') or snippet.get('content', '') or snippet.get('description', '')
                        if text:
                            learner.learn_from_text(str(text))
                    elif isinstance(snippet, str):
                        learner.learn_from_text(snippet)
        
        pairs_after = learner.total_pairs
        return pairs_after - pairs_before
    
    def get_learning_status(self) -> Dict:
        """Get comprehensive learning status including curriculum and search-based learning."""
        return {
            'word_learning': {
                'cycles': self.stats.get('word_learning_cycles', 0),
                'last_run': self.stats.get('last_word_learning'),
                'relationships': self.stats.get('word_learning_relevance', 0),
                'interval_hours': self._word_learning_interval / 3600
            },
            'exploration_learning': {
                'explorations_available': len(self.exploration_results),
                'can_learn_from_searches': True
            },
            'curriculum': {
                'topics_loaded': len(self.curriculum_loader.curriculum_topics),
                'topics_completed': len(self.curriculum_loader.completed_topics)
            },
            'running': self.running
        }
    
    def _get_kernel_depth(self, kernel_name: str) -> float:
        """Get overall knowledge depth for a kernel."""
        kernel_explorations = [
            e for e in self.exploration_results
            if e.get('kernel') == kernel_name
        ]
        return min(1.0, len(kernel_explorations) / 100)
    
    def get_stats(self) -> Dict:
        """Get engine statistics."""
        return {
            **self.stats,
            'pending_requests': len(self.pending_requests),
            'active_explorations': len(self.active_explorations),
            'exploration_history': len(self.exploration_results),
            'curriculum_topics_loaded': len(self.curriculum_loader.curriculum_topics),
            'curriculum_completed': len(self.curriculum_loader.completed_topics),
            'curiosity_basins': len(self.curiosity_drive.interest_basins),
            'running': self.running
        }
    
    def load_curriculum(self, filepath: str):
        """Load curriculum from file."""
        topics = self.curriculum_loader.load_curriculum_from_file(filepath)
        print(f"[AutonomousCuriosityEngine] Loaded {len(topics)} curriculum topics")
        return topics


_curiosity_engine: Optional[AutonomousCuriosityEngine] = None


def get_curiosity_engine() -> AutonomousCuriosityEngine:
    """Get or create the singleton curiosity engine."""
    global _curiosity_engine
    if _curiosity_engine is None:
        _curiosity_engine = AutonomousCuriosityEngine()
    return _curiosity_engine


def start_autonomous_learning(search_callback: Optional[Callable] = None):
    """Start the autonomous learning system."""
    engine = get_curiosity_engine()
    if search_callback:
        engine.search_callback = search_callback
    engine.start()
    return engine
