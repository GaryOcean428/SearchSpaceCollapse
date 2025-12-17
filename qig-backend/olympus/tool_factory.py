"""
Self-Learning Tool Factory

The kernel learns to create tools from:
1. User-provided examples and templates
2. Git repositories and coding tutorials (proactive search)
3. Chat-provided links and file uploads
4. Pattern observations from conversations

NO HARDCODED TEMPLATES - All knowledge is learned.

QIG Intelligence Metrics:
- Γ (Generativity): Novel tool creation rate
- Φ (Integration): Tool integration with learned memory
- Learning curve: Improvement over time

CRITICAL: This is a test of genuine intelligence emergence.
Can the system develop the ability to extend itself?
"""

"""
Self-Learning Tool Factory - Import centralized geometry
"""
import ast
import numpy as np
import hashlib
import traceback
import time
import threading
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from collections import Counter

# Import centralized Fisher-Rao distance - QIG purity MANDATORY
# Handle both relative and absolute imports depending on execution context
try:
    from ..qig_geometry import fisher_rao_distance as centralized_fisher_rao
    from ..redis_cache import ToolPatternBuffer
except ImportError:
    # When run from different context, try absolute import
    import sys
    import os
    # Add parent directory to path if needed
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    from qig_geometry import fisher_rao_distance as centralized_fisher_rao
    from redis_cache import ToolPatternBuffer
# Centralized geometry is required - module will fail if neither import works


class ToolComplexity(Enum):
    """Tool complexity levels for progressive learning."""
    TRIVIAL = 1
    SIMPLE = 2
    MODERATE = 3
    COMPLEX = 4
    ADVANCED = 5


class ToolSafetyLevel(Enum):
    """Safety classification for generated tools."""
    SAFE = 1
    CAUTIOUS = 2
    RESTRICTED = 3
    DANGEROUS = 4


class CodeSourceType(Enum):
    """Source of learned code patterns."""
    USER_PROVIDED = "user_provided"
    GIT_REPOSITORY = "git_repository"
    TUTORIAL = "tutorial"
    CHAT_LINK = "chat_link"
    FILE_UPLOAD = "file_upload"
    PATTERN_OBSERVATION = "pattern_observation"
    SEARCH_RESULT = "search_result"


@dataclass
class LearnedPattern:
    """A code pattern learned from external sources."""
    pattern_id: str
    source_type: CodeSourceType
    source_url: Optional[str]
    description: str
    code_snippet: str
    input_signature: Dict[str, str]
    output_type: str
    basin_coords: Optional[np.ndarray]
    times_used: int = 0
    success_rate: float = 0.5
    created_at: float = field(default_factory=lambda: datetime.now().timestamp())

    def to_dict(self, include_qig_metrics: bool = True) -> Dict:
        """
        Convert pattern to dictionary with optional QIG metrics.
        
        Args:
            include_qig_metrics: If True, include 64D basin coords and geometric metrics
        """
        result = {
            'pattern_id': self.pattern_id,
            'source_type': self.source_type.value,
            'source_url': self.source_url,
            'description': self.description,
            'code_snippet': self.code_snippet[:200] + '...' if len(self.code_snippet) > 200 else self.code_snippet,
            'input_signature': self.input_signature,
            'output_type': self.output_type,
            'times_used': self.times_used,
            'success_rate': self.success_rate,
            'created_at': self.created_at,
        }
        
        if include_qig_metrics and self.basin_coords is not None:
            basin = self.basin_coords
            basin_norm = np.linalg.norm(basin)
            result['basin_coords'] = basin.tolist() if isinstance(basin, np.ndarray) else basin
            result['basin_dimension'] = len(basin) if hasattr(basin, '__len__') else 64
            result['basin_norm'] = float(basin_norm) if basin_norm else 0.0
            result['phi'] = float(np.clip(basin_norm / 10.0, 0, 1)) if basin_norm else 0.5
            result['kappa'] = float(55.0 + 10.0 * np.tanh(basin_norm - 5)) if basin_norm else 55.0
        else:
            result['basin_coords'] = None
            result['basin_dimension'] = 64
            result['basin_norm'] = 0.0
            result['phi'] = 0.5
            result['kappa'] = 55.0
        
        return result


@dataclass
class GeneratedTool:
    """A tool created by the kernel."""
    tool_id: str
    name: str
    description: str
    code: str
    input_schema: Dict[str, str]
    output_type: str
    complexity: ToolComplexity
    safety_level: ToolSafetyLevel
    creation_timestamp: float
    source_patterns: List[str] = field(default_factory=list)
    times_used: int = 0
    times_succeeded: int = 0
    times_failed: int = 0
    user_rating: float = 0.5
    purpose_basin: Optional[np.ndarray] = None
    validated: bool = False
    validation_errors: List[str] = field(default_factory=list)
    learning_iterations: int = 0
    improvement_research_ids: List[str] = field(default_factory=list)
    parent_tool_id: Optional[str] = None

    @property
    def success_rate(self) -> float:
        total = self.times_succeeded + self.times_failed
        return self.times_succeeded / total if total > 0 else 0.5

    @property
    def generativity_score(self) -> float:
        """Γ contribution: novelty × usefulness × complexity"""
        novelty = 1.0
        usefulness = self.success_rate * self.user_rating
        complexity_factor = self.complexity.value / 5.0
        return novelty * usefulness * complexity_factor

    def to_dict(self) -> Dict:
        return {
            'tool_id': self.tool_id,
            'name': self.name,
            'description': self.description,
            'code': self.code,
            'input_schema': self.input_schema,
            'output_type': self.output_type,
            'complexity': self.complexity.name,
            'safety_level': self.safety_level.name,
            'creation_timestamp': self.creation_timestamp,
            'source_patterns': self.source_patterns,
            'times_used': self.times_used,
            'times_succeeded': self.times_succeeded,
            'times_failed': self.times_failed,
            'user_rating': self.user_rating,
            'success_rate': self.success_rate,
            'generativity_score': self.generativity_score,
            'validated': self.validated,
            'validation_errors': self.validation_errors
        }


class ToolSandbox:
    """
    Secure execution environment for generated tools.
    """

    ALLOWED_BUILTINS = {
        'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set',
        'tuple', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted',
        'min', 'max', 'sum', 'abs', 'round', 'any', 'all',
        'isinstance', 'type', 'hasattr', 'getattr',
        'print', 'repr', 'ord', 'chr', 'hex', 'bin', 'oct',
        'reversed', 'slice', 'frozenset', 'bytes', 'bytearray',
    }

    ALLOWED_IMPORTS = {
        're': ['match', 'search', 'findall', 'sub', 'split', 'compile'],
        'json': ['loads', 'dumps'],
        'datetime': ['datetime', 'timedelta', 'date', 'time'],
        'math': ['sqrt', 'log', 'log10', 'exp', 'sin', 'cos', 'tan', 'pi', 'e', 'floor', 'ceil'],
        'collections': ['Counter', 'defaultdict', 'OrderedDict', 'namedtuple'],
        'itertools': ['chain', 'combinations', 'permutations', 'product'],
        'functools': ['reduce'],
        'hashlib': ['md5', 'sha256'],
    }

    FORBIDDEN_PATTERNS = [
        'import os', 'import sys', 'import subprocess',
        '__import__', 'eval(', 'exec(', 'compile(',
        'open(', 'file(', 'input(',
        '__builtins__', '__globals__', '__code__',
        'socket', 'urllib', 'requests', 'http',
        'pickle', 'marshal',
    ]

    def __init__(self, timeout_seconds: float = 5.0, max_memory_mb: int = 50):
        self.timeout = timeout_seconds
        self.max_memory = max_memory_mb

    def validate_code(self, code: str) -> Tuple[bool, List[str]]:
        """Static analysis of generated code for safety."""
        errors = []

        for pattern in self.FORBIDDEN_PATTERNS:
            if pattern in code:
                errors.append(f"Forbidden pattern: {pattern}")

        try:
            tree = ast.parse(code)

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name not in self.ALLOWED_IMPORTS:
                            errors.append(f"Forbidden import: {alias.name}")

                if isinstance(node, ast.ImportFrom):
                    if node.module and node.module not in self.ALLOWED_IMPORTS:
                        errors.append(f"Forbidden import from: {node.module}")

                if isinstance(node, ast.Attribute):
                    if isinstance(node.value, ast.Name):
                        if node.value.id in ['__builtins__', '__globals__']:
                            errors.append(f"Forbidden attribute access: {node.value.id}")

        except SyntaxError as e:
            errors.append(f"Syntax error: {e}")

        return len(errors) == 0, errors

    def execute(
        self,
        code: str,
        func_name: str,
        args: Dict[str, Any]
    ) -> Tuple[bool, Any, Optional[str]]:
        """Execute tool code in sandbox."""
        is_safe, errors = self.validate_code(code)
        if not is_safe:
            return False, None, f"Safety validation failed: {errors}"

        restricted_builtins = {}
        import builtins
        for name in self.ALLOWED_BUILTINS:
            if hasattr(builtins, name):
                restricted_builtins[name] = getattr(builtins, name)

        restricted_globals: Dict[str, Any] = {
            '__builtins__': restricted_builtins
        }

        import re as re_module
        import json as json_module
        import math as math_module
        from datetime import datetime as dt_datetime, timedelta, date, time as dt_time
        from collections import Counter, defaultdict, OrderedDict
        import itertools
        import functools
        import hashlib as hashlib_module

        restricted_globals['re'] = re_module
        restricted_globals['json'] = json_module
        restricted_globals['math'] = math_module
        restricted_globals['datetime'] = dt_datetime
        restricted_globals['timedelta'] = timedelta
        restricted_globals['date'] = date
        restricted_globals['time'] = dt_time
        restricted_globals['Counter'] = Counter
        restricted_globals['defaultdict'] = defaultdict
        restricted_globals['OrderedDict'] = OrderedDict
        restricted_globals['itertools'] = itertools
        restricted_globals['functools'] = functools
        restricted_globals['hashlib'] = hashlib_module

        try:
            exec(code, restricted_globals)

            if func_name not in restricted_globals:
                return False, None, f"Function '{func_name}' not defined in code"

            func = restricted_globals[func_name]

            start = time.time()
            result = func(**args)
            elapsed = time.time() - start

            if elapsed > self.timeout:
                return False, None, f"Execution timeout ({elapsed:.2f}s > {self.timeout}s)"

            return True, result, None

        except Exception as e:
            return False, None, f"Execution error: {str(e)}\n{traceback.format_exc()}"


class ToolFactory:
    """
    Self-learning tool generation system.

    NO HARDCODED TEMPLATES - All patterns learned from:
    1. User-provided examples and templates
    2. Git repositories (proactive search)
    3. Coding tutorials (proactive search)
    4. Chat-provided links
    5. File uploads
    6. Pattern observations
    7. Shadow Research discoveries (bidirectional)

    The Python QIG kernel generates code using geometric
    pattern matching against learned code patterns.
    
    Bidirectional integration with Shadow Research:
    - Tool Factory can request research to improve patterns
    - Shadow can request tool generation based on discoveries
    - Research improves tools, tool patterns inform research
    """

    def __init__(self, conversation_encoder, qig_rag=None, search_client=None, db_pool=None):
        self.encoder = conversation_encoder
        self.qig_rag = qig_rag
        self.search_client = search_client
        self.db_pool = db_pool

        self.sandbox = ToolSandbox()
        self.tool_registry: Dict[str, GeneratedTool] = {}
        self.learned_patterns: Dict[str, LearnedPattern] = {}
        self.pattern_observations: List[Dict] = []
        self.pending_searches: List[Dict] = []
        
        # Track failed generation attempts - prevent retries until COMPATIBLE patterns learned
        # Uses hash of matching pattern IDs, not total count, to ensure relevant patterns added
        self.failed_descriptions: Dict[str, float] = {}  # description -> timestamp of last fail
        self.pattern_ids_at_last_fail: Dict[str, set] = {}  # description -> set of pattern IDs when failed

        self.generation_attempts = 0
        self.successful_generations = 0
        self.current_complexity_ceiling = ToolComplexity.SIMPLE
        
        # Bidirectional Shadow Research bridge
        self._research_bridge = None
        
        # Load patterns from Redis cache on startup
        self._load_patterns_from_cache()
        
        # Load patterns from PostgreSQL (source of truth)
        self._load_patterns_from_db()
    
    def wire_shadow_research(self):
        """Wire bidirectional connection to Shadow Research."""
        try:
            from .shadow_research import ToolResearchBridge
            self._research_bridge = ToolResearchBridge.get_instance()
            self._research_bridge.wire_tool_factory(self)
            print("[ToolFactory] Wired to Shadow Research (bidirectional)")
        except Exception as e:
            print(f"[ToolFactory] Shadow Research wiring failed: {e}")
    
    def request_research(self, topic: str, context: Optional[Dict] = None) -> Optional[str]:
        """
        Request research from Shadow to improve tool generation.
        
        Called when:
        - Tool generation fails and needs pattern research
        - Knowledge gaps detected in a domain
        - Proactive improvement of patterns
        """
        if not self._research_bridge:
            return None
        
        return self._research_bridge.request_research_from_tool(
            topic=topic,
            context=context,
            requester="ToolFactory"
        )
    
    def notify_pattern_discovery(self, patterns: List[Dict]):
        """
        Notify Shadow Research of useful patterns for research directions.
        """
        if self._research_bridge:
            self._research_bridge.improve_research_with_tool(
                tool_id="pattern_discovery",
                tool_patterns=patterns
            )
    
    def _load_patterns_from_cache(self):
        """Load learned patterns from Redis buffer."""
        try:
            cached_patterns = ToolPatternBuffer.get_all_patterns()
            for p_data in cached_patterns:
                try:
                    source_type = CodeSourceType(p_data.get('source_type', 'user_provided'))
                    basin = None
                    if p_data.get('basin_coords'):
                        basin = np.array(p_data['basin_coords'])
                    
                    pattern = LearnedPattern(
                        pattern_id=p_data['pattern_id'],
                        source_type=source_type,
                        source_url=p_data.get('source_url'),
                        description=p_data['description'],
                        code_snippet=p_data['code_snippet'],
                        input_signature=p_data.get('input_signature', {}),
                        output_type=p_data.get('output_type', 'Any'),
                        basin_coords=basin,
                        times_used=p_data.get('times_used', 0),
                        success_rate=p_data.get('success_rate', 0.5),
                        created_at=p_data.get('created_at', datetime.now().timestamp())
                    )
                    self.learned_patterns[pattern.pattern_id] = pattern
                except Exception as e:
                    print(f"[ToolFactory] Failed to load pattern from cache: {e}")
            
            if cached_patterns:
                print(f"[ToolFactory] Loaded {len(self.learned_patterns)} patterns from Redis cache")
        except Exception as e:
            print(f"[ToolFactory] Redis cache load failed (running in memory-only): {e}")
    
    def _load_patterns_from_db(self):
        """Load learned patterns from PostgreSQL tool_patterns table."""
        if not self.db_pool:
            return
        
        try:
            with self.db_pool.get_connection() as conn:
                if conn is None:
                    return
                cur = conn.cursor()
                cur.execute("""
                    SELECT pattern_id, source_type, source_url, description, code_snippet,
                           input_signature, output_type, basin_coords, times_used, success_rate, 
                           created_at, phi, kappa
                    FROM tool_patterns
                    ORDER BY created_at DESC
                """)
                rows = cur.fetchall()
                cur.close()
                
                loaded_count = 0
                for row in rows:
                    try:
                        pattern_id = row[0]
                        if pattern_id in self.learned_patterns:
                            continue
                        
                        source_type = CodeSourceType(row[1]) if row[1] else CodeSourceType.USER_PROVIDED
                        
                        basin = None
                        basin_raw = row[7]
                        if basin_raw is not None:
                            try:
                                if isinstance(basin_raw, (list, tuple)):
                                    basin = np.array(basin_raw, dtype=float)
                                elif isinstance(basin_raw, str):
                                    clean = basin_raw.strip().strip('[]')
                                    if clean:
                                        parts = [x.strip() for x in clean.split(',') if x.strip()]
                                        basin = np.array([float(x) for x in parts])
                                elif hasattr(basin_raw, '__iter__'):
                                    basin = np.array(list(basin_raw), dtype=float)
                            except (ValueError, TypeError) as e:
                                print(f"[ToolFactory] Basin parse warning for {pattern_id}: {e}")
                                basin = None
                        
                        input_sig = row[5] if row[5] else {}
                        if isinstance(input_sig, str):
                            try:
                                input_sig = json.loads(input_sig)
                            except json.JSONDecodeError:
                                input_sig = {}
                        elif not isinstance(input_sig, dict):
                            input_sig = {}
                        
                        created_ts = time.time()
                        if row[10] is not None:
                            if hasattr(row[10], 'timestamp'):
                                created_ts = row[10].timestamp()
                            elif isinstance(row[10], (int, float)):
                                created_ts = float(row[10])
                        
                        pattern = LearnedPattern(
                            pattern_id=pattern_id,
                            source_type=source_type,
                            source_url=row[2],
                            description=row[3],
                            code_snippet=row[4],
                            input_signature=input_sig,
                            output_type=row[6] or 'Any',
                            basin_coords=basin,
                            times_used=row[8] or 0,
                            success_rate=row[9] or 0.5,
                            created_at=created_ts
                        )
                        self.learned_patterns[pattern_id] = pattern
                        loaded_count += 1
                    except Exception as e:
                        print(f"[ToolFactory] Failed to load pattern {row[0]}: {e}")
                
                if loaded_count > 0:
                    print(f"[ToolFactory] Loaded {loaded_count} patterns from PostgreSQL")
        except Exception as e:
            print(f"[ToolFactory] PostgreSQL load failed: {e}")
    
    def _save_pattern_to_cache(self, pattern: LearnedPattern):
        """Save a pattern to Redis buffer, then persist to PostgreSQL."""
        try:
            p_data = {
                'pattern_id': pattern.pattern_id,
                'source_type': pattern.source_type.value,
                'source_url': pattern.source_url,
                'description': pattern.description,
                'code_snippet': pattern.code_snippet,
                'input_signature': pattern.input_signature,
                'output_type': pattern.output_type,
                'basin_coords': pattern.basin_coords.tolist() if pattern.basin_coords is not None else None,
                'times_used': pattern.times_used,
                'success_rate': pattern.success_rate,
                'created_at': pattern.created_at
            }
            
            # Use write-through buffer: Redis → PostgreSQL
            ToolPatternBuffer.buffer_pattern(
                pattern.pattern_id, 
                p_data,
                persist_fn=self._persist_pattern_to_db if self.db_pool else None
            )
        except Exception as e:
            print(f"[ToolFactory] Pattern buffer failed: {e}")
    
    def _persist_pattern_to_db(self, p_data: Dict):
        """Persist pattern to PostgreSQL tool_patterns table."""
        if not self.db_pool:
            return
        
        try:
            with self.db_pool.get_connection() as conn:
                if conn is None:
                    return
                cur = conn.cursor()
                
                basin_coords = p_data.get('basin_coords')
                basin_str = None
                if basin_coords is not None:
                    if isinstance(basin_coords, np.ndarray):
                        basin_str = '[' + ','.join(str(x) for x in basin_coords.tolist()) + ']'
                    elif isinstance(basin_coords, list):
                        basin_str = '[' + ','.join(str(x) for x in basin_coords) + ']'
                
                basin_norm = 0.0
                if basin_coords is not None:
                    arr = np.array(basin_coords) if not isinstance(basin_coords, np.ndarray) else basin_coords
                    basin_norm = float(np.linalg.norm(arr))
                phi = float(np.clip(basin_norm / 10.0, 0, 1)) if basin_norm else 0.5
                kappa = float(55.0 + basin_norm * 0.1) if basin_norm else 55.0
                
                cur.execute("""
                    INSERT INTO tool_patterns (
                        pattern_id, source_type, source_url, description, code_snippet,
                        input_signature, output_type, basin_coords, phi, kappa,
                        times_used, success_rate, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (pattern_id) DO UPDATE SET
                        description = EXCLUDED.description,
                        code_snippet = EXCLUDED.code_snippet,
                        input_signature = EXCLUDED.input_signature,
                        times_used = EXCLUDED.times_used,
                        success_rate = EXCLUDED.success_rate,
                        updated_at = NOW()
                """, (
                    p_data['pattern_id'],
                    p_data['source_type'],
                    p_data.get('source_url'),
                    p_data['description'],
                    p_data['code_snippet'],
                    json.dumps(p_data.get('input_signature', {})),
                    p_data.get('output_type', 'Any'),
                    basin_str,
                    phi,
                    kappa,
                    p_data.get('times_used', 0),
                    p_data.get('success_rate', 0.5)
                ))
                cur.close()
                print(f"[ToolFactory] Pattern persisted to tool_patterns: {p_data['pattern_id']}")
        except Exception as e:
            print(f"[ToolFactory] PostgreSQL persist failed: {e}")
            raise

    def learn_from_user_template(
        self,
        description: str,
        code: str,
        input_signature: Dict[str, str],
        output_type: str = 'Any'
    ) -> LearnedPattern:
        """
        Learn a code pattern from user-provided template.
        This is the primary way to teach the system new patterns.
        """
        pattern_id = self._generate_pattern_id(description)
        basin = self.encoder.encode(description)

        pattern = LearnedPattern(
            pattern_id=pattern_id,
            source_type=CodeSourceType.USER_PROVIDED,
            source_url=None,
            description=description,
            code_snippet=code,
            input_signature=input_signature,
            output_type=output_type,
            basin_coords=basin
        )

        self.learned_patterns[pattern_id] = pattern
        
        # Persist to Redis cache immediately
        self._save_pattern_to_cache(pattern)

        if self.qig_rag:
            self.qig_rag.add_document(
                content=f"LEARNED_PATTERN: {description}\n{code}",
                basin_coords=basin,
                phi=0.7,
                kappa=55.0,
                regime='tool_learning',
                metadata={
                    'type': 'learned_pattern',
                    'pattern_id': pattern_id,
                    'source_type': CodeSourceType.USER_PROVIDED.value
                }
            )

        print(f"[ToolFactory] Learned pattern from user: {description[:50]}...")
        return pattern

    def learn_from_git_link(self, git_url: str, description: str, secret_key_name: Optional[str] = None) -> Optional[LearnedPattern]:
        """
        Learn code pattern from a git repository link provided in chat.
        Fetches and parses the code, extracts patterns.
        
        Args:
            git_url: URL to git repository
            description: Description of what patterns to learn
            secret_key_name: Name of Replit secret containing API key (e.g., 'GITHUB_TOKEN')
        """
        from datetime import datetime
        pattern_id = self._generate_pattern_id(f"git:{git_url}")
        basin = self.encoder.encode(description)

        self.pending_searches.append({
            'type': 'git_link',
            'url': git_url,
            'description': description,
            'pattern_id': pattern_id,
            'basin': basin,
            'status': 'pending',
            'secret_key_name': secret_key_name,
            'queued_at': datetime.now().isoformat(),
            'error': None
        })

        auth_info = f"(auth via {secret_key_name})" if secret_key_name else "(no auth)"
        print(f"[ToolFactory] Queued git link for learning: {git_url} {auth_info}")
        return None

    def get_git_queue_status(self) -> List[Dict]:
        """Get status of queued git links for learning."""
        git_items = [
            {
                'url': item.get('url'),
                'description': item.get('description', ''),
                'status': item.get('status', 'pending'),
                'secret_key_name': item.get('secret_key_name'),
                'queued_at': item.get('queued_at'),
                'error': item.get('error')
            }
            for item in self.pending_searches
            if item.get('type') == 'git_link'
        ]
        return git_items

    def update_git_item_status(self, url: str, status: str, error: Optional[str] = None):
        """Update status of a git queue item."""
        for item in self.pending_searches:
            if item.get('type') == 'git_link' and item.get('url') == url:
                item['status'] = status
                if error:
                    item['error'] = error
                break

    def clear_completed_git_items(self):
        """Remove completed/failed items from the queue."""
        self.pending_searches = [
            item for item in self.pending_searches
            if not (item.get('type') == 'git_link' and item.get('status') in ['completed', 'failed'])
        ]

    def learn_from_file_upload(
        self,
        filename: str,
        content: str,
        description: str
    ) -> Optional[LearnedPattern]:
        """
        Learn code patterns from uploaded file.
        Parses the file and extracts function patterns.
        """
        functions = self._extract_functions_from_code(content)

        if not functions:
            print(f"[ToolFactory] No functions found in {filename}")
            return None

        learned = []
        for func_name, func_code, func_sig in functions:
            pattern_id = self._generate_pattern_id(f"file:{filename}:{func_name}")
            func_desc = f"{description} - {func_name}"
            basin = self.encoder.encode(func_desc)

            pattern = LearnedPattern(
                pattern_id=pattern_id,
                source_type=CodeSourceType.FILE_UPLOAD,
                source_url=filename,
                description=func_desc,
                code_snippet=func_code,
                input_signature=func_sig,
                output_type='Any',
                basin_coords=basin
            )

            self.learned_patterns[pattern_id] = pattern
            learned.append(pattern)
            
            # Persist to Redis cache immediately
            self._save_pattern_to_cache(pattern)

            if self.qig_rag:
                self.qig_rag.add_document(
                    content=f"FILE_PATTERN: {func_desc}\n{func_code}",
                    basin_coords=basin,
                    phi=0.65,
                    kappa=50.0,
                    regime='tool_learning',
                    metadata={
                        'type': 'learned_pattern',
                        'pattern_id': pattern_id,
                        'source_type': CodeSourceType.FILE_UPLOAD.value,
                        'filename': filename
                    }
                )

        print(f"[ToolFactory] Learned {len(learned)} patterns from {filename}")
        return learned[0] if learned else None

    def proactive_search(self, topic: str) -> List[Dict]:
        """
        Proactively search git repositories and coding tutorials
        to learn new patterns for a given topic.
        
        Uses light (public) and dark (specialized) search.
        """
        if not self.search_client:
            print("[ToolFactory] No search client available for proactive learning")
            return []

        search_queries = [
            f"python {topic} implementation github",
            f"python {topic} tutorial code example",
            f"python function {topic} snippet"
        ]

        results = []
        for query in search_queries:
            self.pending_searches.append({
                'type': 'proactive_search',
                'query': query,
                'topic': topic,
                'status': 'pending'
            })
            results.append({'query': query, 'status': 'queued'})

        print(f"[ToolFactory] Queued {len(search_queries)} proactive searches for: {topic}")
        return results

    def _extract_functions_from_code(self, code: str) -> List[Tuple[str, str, Dict]]:
        """Extract function definitions from Python code."""
        functions = []

        try:
            tree = ast.parse(code)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_name = node.name
                    if func_name.startswith('_'):
                        continue

                    start_line = node.lineno - 1
                    end_line = node.end_lineno if hasattr(node, 'end_lineno') else start_line + 10
                    lines = code.split('\n')
                    func_code = '\n'.join(lines[start_line:end_line])

                    args_sig = {}
                    for arg in node.args.args:
                        arg_name = arg.arg
                        arg_type = 'Any'
                        if arg.annotation:
                            if isinstance(arg.annotation, ast.Name):
                                arg_type = arg.annotation.id
                        args_sig[arg_name] = arg_type

                    functions.append((func_name, func_code, args_sig))

        except SyntaxError:
            pass

        return functions

    def find_matching_patterns(self, description: str, top_k: int = 5) -> List[LearnedPattern]:
        """
        Find learned patterns that match the description.
        Uses Fisher-Rao distance on basin coordinates.
        """
        if not self.learned_patterns:
            return []

        desc_basin = self.encoder.encode(description)
        scored_patterns = []

        for pattern in self.learned_patterns.values():
            if pattern.basin_coords is not None:
                distance = self._fisher_rao_distance(desc_basin, pattern.basin_coords)
                score = 1.0 / (1.0 + distance)
                scored_patterns.append((pattern, score))

        scored_patterns.sort(key=lambda x: x[1], reverse=True)
        return [p for p, s in scored_patterns[:top_k] if s > 0.3]

    def generate_tool(
        self,
        description: str,
        examples: List[Dict[str, Any]],
        name_hint: Optional[str] = None
    ) -> Optional[GeneratedTool]:
        """
        Generate a new tool from description and examples.
        
        Uses learned patterns as the foundation for code generation.
        NO hardcoded templates - all from learned knowledge.
        """
        self.generation_attempts += 1
        print(f"[ToolFactory] ===== GENERATION ATTEMPT #{self.generation_attempts} =====")
        print(f"[ToolFactory] Description: {description[:80]}...")
        print(f"[ToolFactory] Learned patterns available: {len(self.learned_patterns)}")

        purpose_basin = self.encoder.encode(description)
        complexity = self._estimate_complexity(description, examples)

        # First find matching patterns to check compatibility
        matching_patterns = self.find_matching_patterns(description)
        current_matching_ids = set(p.pattern_id for p in matching_patterns)
        print(f"[ToolFactory] Matching patterns found: {len(matching_patterns)}")
        print(f"[ToolFactory] Pattern sources: {[p.source_type.value for p in matching_patterns[:3]]}")

        # Check if this description previously failed and no NEW COMPATIBLE patterns were learned
        if description in self.failed_descriptions:
            last_fail_pattern_ids = self.pattern_ids_at_last_fail.get(description, set())
            # Only allow retry if we have NEW matching patterns not seen at last failure
            new_patterns = current_matching_ids - last_fail_pattern_ids
            if not new_patterns:
                print(f"[ToolFactory] BLOCKED: '{description[:50]}...' failed before")
                print(f"[ToolFactory] No new COMPATIBLE patterns learned since last attempt")
                print(f"[ToolFactory] Teach relevant patterns before retrying")
                return None
            else:
                print(f"[ToolFactory] Found {len(new_patterns)} new compatible patterns, allowing retry")

        # CRITICAL: Require learned patterns - NO hardcoded fallbacks
        if not matching_patterns:
            print("[ToolFactory] NO LEARNED PATTERNS FOUND")
            print("[ToolFactory] Tool generation requires learned patterns from:")
            print("[ToolFactory]   - User-provided templates via /learn/template")
            print("[ToolFactory]   - Git repository links via /learn/git")
            print("[ToolFactory]   - File uploads via /learn/file")
            print("[ToolFactory]   - Proactive search via /learn/search")
            # Track this failure with current matching pattern IDs (empty set)
            self.failed_descriptions[description] = datetime.now().timestamp()
            self.pattern_ids_at_last_fail[description] = current_matching_ids
            # Queue proactive search for this topic
            print(f"[ToolFactory] Queuing proactive search for: {description[:50]}...")
            self.proactive_search(description)
            print(f"[ToolFactory] ❌ FAILED: No patterns - pending searches: {len(self.pending_searches)}")
            return None

        code, func_name = self._generate_code_from_patterns(
            description, examples, matching_patterns, name_hint
        )

        if code is None:
            print(f"[ToolFactory] ❌ FAILED (attempt #{self.generation_attempts}): Code generation failed")
            print(f"[ToolFactory] Stats: {self.successful_generations}/{self.generation_attempts} successful ({100*self.successful_generations/max(1,self.generation_attempts):.1f}%)")
            return None

        is_safe, errors = self.sandbox.validate_code(code)

        tool = GeneratedTool(
            tool_id=self._generate_tool_id(description),
            name=func_name,
            description=description,
            code=code,
            input_schema=self._infer_schema(examples),
            output_type=self._infer_output_type(examples),
            complexity=complexity,
            safety_level=ToolSafetyLevel.SAFE if is_safe else ToolSafetyLevel.RESTRICTED,
            creation_timestamp=datetime.now().timestamp(),
            source_patterns=[p.pattern_id for p in matching_patterns[:3]],
            purpose_basin=purpose_basin,
            validated=is_safe,
            validation_errors=errors
        )

        if not is_safe:
            print(f"[ToolFactory] Generated tool failed validation: {errors}")
            print(f"[ToolFactory] ❌ FAILED (attempt #{self.generation_attempts}): Validation errors")
            print(f"[ToolFactory] Stats: {self.successful_generations}/{self.generation_attempts} successful ({100*self.successful_generations/max(1,self.generation_attempts):.1f}%)")
            return tool

        test_results = self._test_tool(tool, examples)

        if test_results['all_passed']:
            tool.validated = True
            self.tool_registry[tool.tool_id] = tool
            self.successful_generations += 1

            for pattern in matching_patterns[:3]:
                pattern.times_used += 1
                pattern.success_rate = (pattern.success_rate * 0.8) + 0.2

            if self.qig_rag:
                self.qig_rag.add_document(
                    content=f"TOOL: {tool.name} - {tool.description}\n{tool.code}",
                    basin_coords=purpose_basin,
                    phi=0.8,
                    kappa=60.0,
                    regime='tool',
                    metadata={
                        'type': 'generated_tool',
                        'tool_id': tool.tool_id,
                        'complexity': tool.complexity.name,
                        'source_patterns': tool.source_patterns
                    }
                )

            print(f"[ToolFactory] ✅ SUCCESS: Generated tool '{tool.name}' (ID: {tool.tool_id})")
            print(f"[ToolFactory] Total tools registered: {len(self.tool_registry)}")
            print(f"[ToolFactory] Success rate: {self.successful_generations}/{self.generation_attempts} ({100*self.successful_generations/max(1,self.generation_attempts):.1f}%)")

            if self.successful_generations % 3 == 0:
                self._increase_complexity_ceiling()
        else:
            print(f"[ToolFactory] Tool failed tests: {test_results['failures']}")
            tool.validated = False
            for f in test_results['failures']:
                error_msg = f.get('error')
                if error_msg:
                    tool.validation_errors.append(f"Test {f['example']}: {error_msg}")
                else:
                    expected = f.get('expected')
                    got = f.get('got')
                    tool.validation_errors.append(f"Test {f['example']}: Expected {expected}, got {got}")
            
            # Track failure with current matching patterns - block retries until NEW patterns
            self.failed_descriptions[description] = datetime.now().timestamp()
            self.pattern_ids_at_last_fail[description] = current_matching_ids
            print(f"[ToolFactory] Blocking retries until new compatible patterns are learned")
            print(f"[ToolFactory] ❌ FAILED (attempt #{self.generation_attempts}): Tests did not pass")
            print(f"[ToolFactory] Stats: {self.successful_generations}/{self.generation_attempts} successful ({100*self.successful_generations/max(1,self.generation_attempts):.1f}%)")

        return tool

    def _generate_code_from_patterns(
        self,
        description: str,
        examples: List[Dict],
        patterns: List[LearnedPattern],
        name_hint: Optional[str]
    ) -> Tuple[Optional[str], str]:
        """
        Generate code using learned patterns ONLY.
        NO hardcoded templates - all from learned knowledge.
        
        The QIG kernel synthesizes from geometric similarity to learned patterns.
        If no patterns are available, generation refuses to proceed.
        """
        func_name = name_hint or self._generate_func_name(description)

        # CRITICAL: Require learned patterns - no hardcoded fallbacks
        if not patterns:
            print("[ToolFactory] NO LEARNED PATTERNS - Cannot generate tool")
            print("[ToolFactory] Teach the system first via templates, git links, or file uploads")
            return None, func_name

        # Use best matching learned pattern as foundation
        best_pattern = patterns[0]
        code = self._adapt_pattern_to_task(best_pattern, description, examples, func_name)
        
        if code:
            return code, func_name

        # Try next best patterns if first adaptation fails
        for pattern in patterns[1:3]:
            code = self._adapt_pattern_to_task(pattern, description, examples, func_name)
            if code:
                return code, func_name

        return None, func_name

    def _adapt_pattern_to_task(
        self,
        pattern: LearnedPattern,
        description: str,
        examples: List[Dict],
        func_name: str
    ) -> Optional[str]:
        """
        Adapt a learned pattern to the specific task.
        
        VALIDATES input signature compatibility before adaptation.
        If pattern signature doesn't match examples, returns None.
        """
        code = pattern.code_snippet
        
        # Validate signature compatibility if examples provided
        if examples:
            example_input = examples[0].get('input')
            pattern_sig = pattern.input_signature
            
            # Infer expected input type from example
            if isinstance(example_input, str):
                expected_type = 'str'
                expected_param = 'text'
            elif isinstance(example_input, list):
                expected_type = 'list'
                expected_param = 'items'
            elif isinstance(example_input, dict):
                expected_type = 'dict'
                expected_param = None  # Dict examples match by keys
            else:
                expected_type = type(example_input).__name__
                expected_param = 'input'
            
            # Check if pattern has compatible signature
            pattern_types = list(pattern_sig.values())
            if pattern_types:
                # Get first parameter type from pattern
                first_pattern_type = pattern_types[0].lower()
                
                # Validate compatibility - reject if types don't match
                if expected_type == 'str' and 'str' not in first_pattern_type:
                    print(f"[ToolFactory] Signature mismatch: pattern expects {first_pattern_type}, example is str")
                    return None
                if expected_type == 'list' and 'list' not in first_pattern_type:
                    print(f"[ToolFactory] Signature mismatch: pattern expects {first_pattern_type}, example is list")
                    return None

        # Rename function
        old_func_match = re.search(r'def\s+(\w+)\s*\(', code)
        if old_func_match:
            old_name = old_func_match.group(1)
            code = code.replace(f'def {old_name}(', f'def {func_name}(')

        # Update docstring
        docstring_match = re.search(r'""".*?"""', code, re.DOTALL)
        if docstring_match:
            code = code.replace(docstring_match.group(0), f'"""{description}"""')
        else:
            lines = code.split('\n')
            if len(lines) > 1:
                indent = '    '
                lines.insert(1, f'{indent}"""{description}"""')
                code = '\n'.join(lines)

        return code

    # NOTE: _synthesize_from_examples REMOVED - NO HARDCODED TEMPLATES ALLOWED
    # All code generation MUST come from learned patterns provided by users,
    # git repositories, file uploads, or proactive searches.
    # This is a test of genuine intelligence emergence.

    def _test_tool(
        self,
        tool: GeneratedTool,
        examples: List[Dict]
    ) -> Dict:
        """Test tool against examples in sandbox."""
        results = {
            'all_passed': True,
            'passed': 0,
            'failed': 0,
            'failures': []
        }

        if not examples:
            success, result, error = self.sandbox.execute(
                tool.code,
                tool.name,
                {'text': 'test input'}
            )
            if success:
                results['passed'] = 1
            else:
                results['all_passed'] = False
                results['failed'] = 1
                results['failures'].append({'example': 0, 'error': error})
            return results

        for i, example in enumerate(examples):
            input_data = example.get('input')
            expected = example.get('expected_output')

            if isinstance(input_data, str):
                args = {'text': input_data}
            elif isinstance(input_data, list):
                args = {'items': input_data}
            elif isinstance(input_data, dict):
                args = input_data
            else:
                args = {'text': str(input_data)}

            success, result, error = self.sandbox.execute(
                tool.code,
                tool.name,
                args
            )

            if not success:
                results['all_passed'] = False
                results['failed'] += 1
                results['failures'].append({
                    'example': i,
                    'error': error
                })
            elif expected is not None and result != expected:
                results['all_passed'] = False
                results['failed'] += 1
                results['failures'].append({
                    'example': i,
                    'expected': expected,
                    'got': result
                })
            else:
                results['passed'] += 1

        return results

    def execute_tool(
        self,
        tool_id: str,
        args: Dict[str, Any]
    ) -> Tuple[bool, Any, Optional[str]]:
        """Execute a registered tool."""
        if tool_id not in self.tool_registry:
            return False, None, f"Tool not found: {tool_id}"

        tool = self.tool_registry[tool_id]

        if not tool.validated:
            return False, None, "Tool not validated"

        success, result, error = self.sandbox.execute(
            tool.code,
            tool.name,
            args
        )

        tool.times_used += 1
        if success:
            tool.times_succeeded += 1
        else:
            tool.times_failed += 1
            self._trigger_runtime_learning(tool, error, args)

        return success, result, error
    
    def _trigger_runtime_learning(
        self,
        tool: GeneratedTool,
        error: Optional[str],
        failed_args: Dict[str, Any]
    ) -> None:
        """
        Trigger learning loop when a tool fails at runtime.
        
        This implements the meta-learning feedback loop:
        1. Record failure pattern
        2. If failure rate too high, request research for improvement
        3. Research can spawn tool recreation (recursive improvement)
        """
        MIN_USES_BEFORE_LEARNING = 3
        FAILURE_RATE_THRESHOLD = 0.3
        
        if tool.times_used < MIN_USES_BEFORE_LEARNING:
            return
        
        failure_rate = tool.times_failed / tool.times_used
        if failure_rate < FAILURE_RATE_THRESHOLD:
            return
        
        if not hasattr(tool, 'learning_iterations'):
            tool.learning_iterations = 0
        
        MAX_LEARNING_ITERATIONS = 5
        if tool.learning_iterations >= MAX_LEARNING_ITERATIONS:
            print(f"[ToolFactory] ⚠️ Tool '{tool.name}' exceeded max learning iterations")
            return
        
        tool.learning_iterations += 1
        
        print(f"[ToolFactory] 🔄 Runtime learning triggered for '{tool.name}' "
              f"(iteration {tool.learning_iterations}, failure rate: {failure_rate:.1%})")
        
        try:
            from .shadow_research import ToolResearchBridge
            bridge = ToolResearchBridge.get_instance()
            
            if bridge:
                research_topic = (
                    f"Fix runtime failure in tool '{tool.name}': {error[:200] if error else 'Unknown error'}. "
                    f"Failed with args: {str(failed_args)[:100]}. "
                    f"Failure rate: {failure_rate:.1%} over {tool.times_used} uses."
                )
                
                research_id = bridge.request_research_from_tool(
                    topic=research_topic,
                    context={
                        'source': 'runtime_failure_learning',
                        'tool_id': tool.tool_id,
                        'tool_name': tool.name,
                        'learning_iteration': tool.learning_iterations,
                        'failure_rate': failure_rate,
                        'error': error,
                        'failed_args_sample': str(failed_args)[:200]
                    },
                    requester=f"ToolFactory:RuntimeLearning:{tool.name}"
                )
                
                if research_id:
                    print(f"[ToolFactory] 📚 Research requested: {research_id}")
                    
                    if hasattr(tool, 'improvement_research_ids'):
                        tool.improvement_research_ids.append(research_id)
                    else:
                        tool.improvement_research_ids = [research_id]
                        
        except ImportError:
            pass
        except Exception as e:
            print(f"[ToolFactory] Runtime learning failed: {e}")

    def observe_pattern(self, request: str, context: Dict) -> List[Dict]:
        """Observe user request for pattern recognition."""
        request_basin = self.encoder.encode(request)

        self.pattern_observations.append({
            'request': request,
            'request_basin': request_basin,
            'context': context,
            'timestamp': datetime.now().timestamp()
        })

        if len(self.pattern_observations) >= 3:
            return self._analyze_patterns()
        return []

    def _analyze_patterns(self) -> List[Dict]:
        """Analyze observations for automatable patterns."""
        recent = self.pattern_observations[-10:]
        clusters = self._cluster_by_basin(recent)
        candidates = []

        for cluster in clusters:
            if len(cluster) >= 2:
                cluster_basin = np.mean([o['request_basin'] for o in cluster], axis=0)
                existing = self._find_similar_tool(cluster_basin)

                if existing is None:
                    pattern_description = self._describe_pattern(cluster)
                    candidates.append({
                        'description': pattern_description,
                        'observations': len(cluster),
                        'examples': [o['request'][:100] for o in cluster[:3]],
                        'basin': cluster_basin.tolist()
                    })

        return candidates

    def _cluster_by_basin(self, observations: List[Dict]) -> List[List[Dict]]:
        """Cluster observations by basin similarity."""
        if not observations:
            return []

        clusters = []
        used = set()

        for i, obs in enumerate(observations):
            if i in used:
                continue

            cluster = [obs]
            used.add(i)

            for j, other in enumerate(observations):
                if j in used:
                    continue

                dist = self._fisher_rao_distance(
                    obs['request_basin'],
                    other['request_basin']
                )

                if dist < 1.5:
                    cluster.append(other)
                    used.add(j)

            clusters.append(cluster)

        return clusters

    def _describe_pattern(self, cluster: List[Dict]) -> str:
        """Generate description of detected pattern."""
        requests = [o['request'] for o in cluster]
        words = []
        for req in requests:
            words.extend(req.lower().split())

        common = Counter(words).most_common(5)
        return f"Pattern involving: {', '.join(w for w, c in common if c > 1)}"

    def find_tool_for_task(self, task_description: str) -> Optional[GeneratedTool]:
        """Find existing tool that matches task."""
        task_basin = self.encoder.encode(task_description)
        return self._find_similar_tool(task_basin)

    def _find_similar_tool(self, basin: np.ndarray) -> Optional[GeneratedTool]:
        """Find tool with similar purpose basin."""
        best_tool = None
        best_distance = float('inf')

        for tool in self.tool_registry.values():
            if tool.purpose_basin is not None:
                dist = self._fisher_rao_distance(basin, tool.purpose_basin)
                if dist < best_distance and dist < 2.0:
                    best_distance = dist
                    best_tool = tool

        return best_tool

    def rate_tool(self, tool_id: str, rating: float):
        """User rates tool quality (0-1)."""
        if tool_id in self.tool_registry:
            tool = self.tool_registry[tool_id]
            tool.user_rating = 0.7 * tool.user_rating + 0.3 * rating

    def _increase_complexity_ceiling(self):
        """Increase allowed complexity after success streak."""
        current = self.current_complexity_ceiling.value
        if current < ToolComplexity.ADVANCED.value:
            self.current_complexity_ceiling = ToolComplexity(current + 1)
            print(f"[ToolFactory] Complexity ceiling increased to {self.current_complexity_ceiling.name}")

    def _estimate_complexity(
        self,
        description: str,
        examples: List[Dict]
    ) -> ToolComplexity:
        """Estimate complexity of requested tool."""
        desc_lower = description.lower()

        if any(w in desc_lower for w in ['api', 'http', 'database', 'file', 'network']):
            return ToolComplexity.COMPLEX

        if any(w in desc_lower for w in ['loop', 'iterate', 'multiple', 'conditional', 'nested']):
            return ToolComplexity.MODERATE

        if any(w in desc_lower for w in ['transform', 'convert', 'extract', 'parse']):
            return ToolComplexity.SIMPLE

        return ToolComplexity.TRIVIAL

    def _generate_tool_id(self, description: str) -> str:
        """Generate unique tool ID."""
        hash_input = f"{description}{datetime.now().timestamp()}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:12]

    def _generate_pattern_id(self, source: str) -> str:
        """Generate unique pattern ID."""
        hash_input = f"{source}{datetime.now().timestamp()}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:12]

    def _generate_func_name(self, description: str) -> str:
        """Generate function name from description."""
        words = re.findall(r'\w+', description.lower())[:4]
        name = '_'.join(w for w in words if w.isalnum() and len(w) > 2)
        return name or 'generated_tool'

    def _infer_schema(self, examples: List[Dict]) -> Dict[str, str]:
        """Infer input schema from examples."""
        if not examples:
            return {'text': 'str'}

        first_input = examples[0].get('input')
        if isinstance(first_input, str):
            return {'text': 'str'}
        elif isinstance(first_input, list):
            return {'items': 'list'}
        elif isinstance(first_input, dict):
            return {k: type(v).__name__ for k, v in first_input.items()}
        return {'input': type(first_input).__name__}

    def _infer_output_type(self, examples: List[Dict]) -> str:
        """Infer output type from examples."""
        if not examples:
            return 'Any'

        first_output = examples[0].get('expected_output')
        return type(first_output).__name__ if first_output is not None else 'Any'

    def _fisher_rao_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        """
        Fisher-Rao distance between basins.
        Delegates ENTIRELY to centralized geometry - no local guards.
        Let centralized module handle any degeneracy or validation.
        """
        return centralized_fisher_rao(basin1, basin2)

    def get_learning_stats(self) -> Dict:
        """Return statistics about tool learning."""
        tools = list(self.tool_registry.values())
        patterns = list(self.learned_patterns.values())

        return {
            'generation_attempts': self.generation_attempts,
            'successful_generations': self.successful_generations,
            'success_rate': self.successful_generations / self.generation_attempts
                if self.generation_attempts > 0 else 0,
            'complexity_ceiling': self.current_complexity_ceiling.name,
            'tools_registered': len(tools),
            'patterns_learned': len(patterns),
            'patterns_by_source': {
                source.value: len([p for p in patterns if p.source_type == source])
                for source in CodeSourceType
            },
            'total_tool_uses': sum(t.times_used for t in tools),
            'avg_tool_success_rate': float(np.mean([t.success_rate for t in tools])) if tools else 0,
            'generativity_score': sum(t.generativity_score for t in tools),
            'pattern_observations': len(self.pattern_observations),
            'pending_searches': len(self.pending_searches)
        }

    def list_tools(self) -> List[Dict]:
        """List all registered tools."""
        return [tool.to_dict() for tool in self.tool_registry.values()]

    def list_patterns(self) -> List[Dict]:
        """List all learned patterns with QIG metrics."""
        return [pattern.to_dict(include_qig_metrics=True) for pattern in self.learned_patterns.values()]
    
    def get_patterns(self, include_similarity: bool = False, reference_text: Optional[str] = None) -> List[Dict]:
        """
        Get all learned patterns with full QIG geometric metrics.
        
        This method returns patterns with:
        - 64D basin coordinates for geometric positioning
        - Fisher-Rao distance metrics when a reference is provided
        - Consciousness metrics (Φ, κ) for each pattern
        
        Args:
            include_similarity: If True and reference_text provided, include Fisher-Rao distance
            reference_text: Optional text to compute similarity scores against
            
        Returns:
            List of pattern dicts with QIG metrics
        """
        patterns_data = []
        reference_basin = None
        
        if include_similarity and reference_text:
            reference_basin = self.encoder.encode(reference_text)
        
        for pattern in self.learned_patterns.values():
            p_dict = pattern.to_dict(include_qig_metrics=True)
            
            if reference_basin is not None and pattern.basin_coords is not None:
                fisher_distance = self._fisher_rao_distance(reference_basin, pattern.basin_coords)
                fisher_similarity = 1.0 - (fisher_distance / np.pi)
                p_dict['fisher_rao_distance'] = float(fisher_distance)
                p_dict['fisher_similarity'] = float(fisher_similarity)
                p_dict['geodesic_match'] = fisher_distance < 1.5
            else:
                p_dict['fisher_rao_distance'] = None
                p_dict['fisher_similarity'] = None
                p_dict['geodesic_match'] = None
            
            patterns_data.append(p_dict)
        
        if reference_basin is not None:
            patterns_data.sort(key=lambda x: x.get('fisher_rao_distance') or float('inf'))
        
        return patterns_data
    
    def get_tools(self) -> List[Dict]:
        """Get all registered tools (alias for list_tools)."""
        return self.list_tools()


class ToolLifecycleState(Enum):
    """Lifecycle states for autonomous tool requests."""
    REQUESTED = "requested"           # Initial request from kernel
    RESEARCHING = "researching"       # Gathering patterns/knowledge
    PROTOTYPING = "prototyping"       # Generating tool code
    TESTING = "testing"               # Running sandbox tests
    IMPROVING = "improving"           # Failed tests, improving via research
    DEPLOYED = "deployed"             # Successfully working
    FAILED = "failed"                 # Max iterations reached, needs manual help


@dataclass
class AutonomousToolRequest:
    """A tool request being processed by the autonomous pipeline."""
    request_id: str
    description: str
    requester: str                     # Kernel that requested the tool
    state: ToolLifecycleState
    created_at: float
    updated_at: float
    iteration: int = 0
    max_iterations: int = 5
    examples: List[Dict] = field(default_factory=list)
    research_requests: List[str] = field(default_factory=list)
    test_failures: List[Dict] = field(default_factory=list)
    generated_tool_id: Optional[str] = None
    error_history: List[str] = field(default_factory=list)
    context: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            'request_id': self.request_id,
            'description': self.description,
            'requester': self.requester,
            'state': self.state.value,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'iteration': self.iteration,
            'max_iterations': self.max_iterations,
            'research_requests': self.research_requests,
            'test_failures': self.test_failures[-3:],  # Last 3 failures
            'generated_tool_id': self.generated_tool_id,
            'error_count': len(self.error_history)
        }


class AutonomousToolPipeline:
    """
    Autonomous tool generation pipeline.
    
    Kernels request tools, and this pipeline:
    1. Gathers patterns via research
    2. Generates prototype tools
    3. Tests them in sandbox
    4. On failure: requests more research, iteratively improves
    5. Eventually deploys working tools or marks as needing help
    
    Kernels understand tools may not work first time - improvement is expected.
    """
    
    _instance: Optional['AutonomousToolPipeline'] = None
    
    def __init__(self, tool_factory: ToolFactory):
        self.tool_factory = tool_factory
        self._requests: Dict[str, AutonomousToolRequest] = {}
        self._research_bridge = None
        self._lock = threading.Lock()
        self._processing_thread: Optional[threading.Thread] = None
        self._running = False
        self._process_interval = 10.0  # Process every 10 seconds
        
    @classmethod
    def get_instance(cls, tool_factory: Optional[ToolFactory] = None) -> Optional['AutonomousToolPipeline']:
        """Get singleton instance."""
        if cls._instance is None and tool_factory is not None:
            cls._instance = cls(tool_factory)
        return cls._instance
    
    def wire_research_bridge(self, bridge):
        """Connect to the Tool-Research bridge for recursive learning."""
        self._research_bridge = bridge
        print("[AutonomousPipeline] Research bridge connected")
    
    def start(self):
        """Start the autonomous processing loop."""
        if self._running:
            return
        self._running = True
        self._processing_thread = threading.Thread(target=self._process_loop, daemon=True)
        self._processing_thread.start()
        print("[AutonomousPipeline] Started autonomous tool generation")
    
    def stop(self):
        """Stop the processing loop."""
        self._running = False
        if self._processing_thread:
            self._processing_thread.join(timeout=5.0)
        print("[AutonomousPipeline] Stopped")
    
    def request_tool(
        self,
        description: str,
        requester: str,
        examples: Optional[List[Dict]] = None,
        context: Optional[Dict] = None
    ) -> str:
        """
        Request a new tool to be generated autonomously.
        
        Args:
            description: What the tool should do
            requester: Kernel name requesting the tool
            examples: Optional input/output examples for testing
            context: Additional context for research
            
        Returns:
            request_id for tracking
        """
        request_id = hashlib.sha256(
            f"{description}_{requester}_{time.time()}".encode()
        ).hexdigest()[:16]
        
        request = AutonomousToolRequest(
            request_id=request_id,
            description=description,
            requester=requester,
            state=ToolLifecycleState.REQUESTED,
            created_at=time.time(),
            updated_at=time.time(),
            examples=examples or [],
            context=context or {}
        )
        
        with self._lock:
            self._requests[request_id] = request
        
        print(f"[AutonomousPipeline] New request from {requester}: {description[:50]}...")
        
        # Immediately start research if bridge available
        self._initiate_research(request)
        
        return request_id
    
    def _initiate_research(self, request: AutonomousToolRequest):
        """Start research phase for a tool request."""
        request.state = ToolLifecycleState.RESEARCHING
        request.updated_at = time.time()
        
        if self._research_bridge:
            # Request research on how to implement this tool
            research_topics = [
                f"Python implementation patterns for: {request.description}",
                f"Best practices for: {request.description}"
            ]
            
            for topic in research_topics:
                try:
                    research_id = self._research_bridge.request_research_from_tool(
                        topic=topic,
                        context={
                            'source': 'autonomous_pipeline',
                            'tool_request_id': request.request_id,
                            'examples': request.examples[:2] if request.examples else []
                        },
                        requester=f"AutonomousPipeline:{request.requester}"
                    )
                    request.research_requests.append(research_id)
                    print(f"[AutonomousPipeline] Research requested: {topic[:40]}...")
                except Exception as e:
                    print(f"[AutonomousPipeline] Research request failed: {e}")
        
        # Also trigger proactive search
        self.tool_factory.proactive_search(request.description)
    
    def _process_loop(self):
        """Background loop that processes pending requests."""
        while self._running:
            try:
                self._process_pending_requests()
            except Exception as e:
                print(f"[AutonomousPipeline] Process loop error: {e}")
            
            time.sleep(self._process_interval)
    
    def _process_pending_requests(self):
        """Process all pending tool requests."""
        with self._lock:
            requests = list(self._requests.values())
        
        for request in requests:
            try:
                self._process_request(request)
            except Exception as e:
                request.error_history.append(f"Process error: {str(e)}")
                print(f"[AutonomousPipeline] Error processing {request.request_id}: {e}")
    
    def _process_request(self, request: AutonomousToolRequest):
        """Process a single tool request through its lifecycle."""
        if request.state == ToolLifecycleState.DEPLOYED:
            return  # Already done
        
        if request.state == ToolLifecycleState.FAILED:
            return  # Needs manual intervention
        
        # Check iteration limit
        if request.iteration >= request.max_iterations:
            request.state = ToolLifecycleState.FAILED
            request.updated_at = time.time()
            print(f"[AutonomousPipeline] {request.request_id} FAILED after {request.iteration} iterations")
            return
        
        # State machine transitions
        if request.state == ToolLifecycleState.REQUESTED:
            # Should have already initiated research
            if not request.research_requests:
                self._initiate_research(request)
            else:
                # Move to researching state
                request.state = ToolLifecycleState.RESEARCHING
                request.updated_at = time.time()
        
        elif request.state == ToolLifecycleState.RESEARCHING:
            # Wait for patterns to be learned, then try prototyping
            # Check if we have matching patterns now
            matching = self.tool_factory.find_matching_patterns(request.description, top_k=3)
            if matching or request.iteration > 0:
                # Have patterns or have already tried once, move to prototyping
                request.state = ToolLifecycleState.PROTOTYPING
                request.updated_at = time.time()
                print(f"[AutonomousPipeline] {request.request_id} has {len(matching)} patterns, moving to prototype")
        
        elif request.state == ToolLifecycleState.PROTOTYPING:
            # Attempt to generate the tool
            request.iteration += 1
            request.updated_at = time.time()
            
            print(f"[AutonomousPipeline] Iteration {request.iteration}/{request.max_iterations} for {request.request_id}")
            
            tool = self.tool_factory.generate_tool(
                description=request.description,
                examples=request.examples,
                name_hint=request.context.get('name_hint')
            )
            
            if tool:
                request.generated_tool_id = tool.tool_id
                request.state = ToolLifecycleState.TESTING
                request.updated_at = time.time()
            else:
                # No tool generated - need more research
                request.state = ToolLifecycleState.IMPROVING
                request.error_history.append(f"Iteration {request.iteration}: No matching patterns")
                request.updated_at = time.time()
                self._request_improvement_research(request, "No matching patterns found")
        
        elif request.state == ToolLifecycleState.TESTING:
            # Check if the generated tool is validated
            if request.generated_tool_id:
                tool = self.tool_factory.tool_registry.get(request.generated_tool_id)
                if tool and tool.validated:
                    # SUCCESS!
                    request.state = ToolLifecycleState.DEPLOYED
                    request.updated_at = time.time()
                    print(f"[AutonomousPipeline] ✅ DEPLOYED: {tool.name} for {request.requester}")
                else:
                    # Tool failed validation/tests
                    errors = tool.validation_errors if tool else ["Tool not found"]
                    request.test_failures.append({
                        'iteration': request.iteration,
                        'errors': errors,
                        'timestamp': time.time()
                    })
                    request.error_history.append(f"Iteration {request.iteration}: {errors[:2]}")
                    request.state = ToolLifecycleState.IMPROVING
                    request.updated_at = time.time()
                    self._request_improvement_research(request, str(errors))
        
        elif request.state == ToolLifecycleState.IMPROVING:
            # Wait for research, then retry prototyping
            # Give research time to complete
            time_since_update = time.time() - request.updated_at
            if time_since_update > 30:  # Wait 30 seconds for research
                request.state = ToolLifecycleState.PROTOTYPING
                request.updated_at = time.time()
    
    def _request_improvement_research(self, request: AutonomousToolRequest, failure_reason: str):
        """Request targeted research to improve a failing tool."""
        if not self._research_bridge:
            return
        
        improvement_topics = [
            f"Fix Python code for: {request.description} - Issue: {failure_reason[:100]}",
            f"Alternative implementation approach for: {request.description}"
        ]
        
        for topic in improvement_topics:
            try:
                research_id = self._research_bridge.request_research_from_tool(
                    topic=topic,
                    context={
                        'source': 'autonomous_improvement',
                        'tool_request_id': request.request_id,
                        'iteration': request.iteration,
                        'failure_reason': failure_reason
                    },
                    requester=f"AutonomousPipeline:Improvement"
                )
                request.research_requests.append(research_id)
            except Exception as e:
                print(f"[AutonomousPipeline] Improvement research failed: {e}")
    
    def get_request_status(self, request_id: str) -> Optional[Dict]:
        """Get status of a tool request."""
        with self._lock:
            request = self._requests.get(request_id)
        return request.to_dict() if request else None
    
    def get_all_requests(self) -> List[Dict]:
        """Get all tool requests with their status."""
        with self._lock:
            return [r.to_dict() for r in self._requests.values()]
    
    def get_pipeline_status(self) -> Dict:
        """Get overall pipeline status."""
        with self._lock:
            requests = list(self._requests.values())
        
        by_state = {}
        for state in ToolLifecycleState:
            by_state[state.value] = len([r for r in requests if r.state == state])
        
        return {
            'running': self._running,
            'total_requests': len(requests),
            'by_state': by_state,
            'deployed_count': by_state.get('deployed', 0),
            'active_count': len([r for r in requests if r.state not in 
                               [ToolLifecycleState.DEPLOYED, ToolLifecycleState.FAILED]]),
            'failed_count': by_state.get('failed', 0),
            'research_bridge_connected': self._research_bridge is not None
        }
    
    def invent_new_tool(
        self,
        concept: str,
        requester: str,
        inspiration: Optional[str] = None
    ) -> str:
        """
        Autonomously invent a completely new tool based on a concept.
        
        This is for tool invention - creating tools that don't exist yet.
        Uses research to understand the concept, then generates implementation.
        """
        # Add invention context
        context = {
            'mode': 'invention',
            'inspiration': inspiration,
            'allow_novel_patterns': True
        }
        
        # Request with extra research emphasis
        request_id = self.request_tool(
            description=f"Invent new tool: {concept}",
            requester=requester,
            examples=[],  # No examples for invention - discover through research
            context=context
        )
        
        # Trigger additional invention-focused research
        if self._research_bridge:
            invention_topics = [
                f"Novel approaches to: {concept}",
                f"State of the art techniques for: {concept}",
                f"Python libraries and tools for: {concept}"
            ]
            
            request = self._requests.get(request_id)
            if request:
                for topic in invention_topics:
                    try:
                        research_id = self._research_bridge.request_research_from_tool(
                            topic=topic,
                            context={'source': 'tool_invention', 'concept': concept},
                            requester=f"AutonomousPipeline:Invention"
                        )
                        request.research_requests.append(research_id)
                    except Exception:
                        pass
        
        print(f"[AutonomousPipeline] Invention request: {concept}")
        return request_id
