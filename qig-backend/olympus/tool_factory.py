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

    def to_dict(self) -> Dict:
        return {
            'pattern_id': self.pattern_id,
            'source_type': self.source_type.value,
            'source_url': self.source_url,
            'description': self.description,
            'code_snippet': self.code_snippet[:200] + '...' if len(self.code_snippet) > 200 else self.code_snippet,
            'input_signature': self.input_signature,
            'output_type': self.output_type,
            'times_used': self.times_used,
            'success_rate': self.success_rate,
        }


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

    The Python QIG kernel generates code using geometric
    pattern matching against learned code patterns.
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
        
        # Load patterns from Redis cache on startup
        self._load_patterns_from_cache()
    
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
        """Persist pattern to PostgreSQL via db_pool."""
        if not self.db_pool:
            return
        
        try:
            with self.db_pool.get_connection() as conn:
                if conn is None:
                    return
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO tool_observations (request, request_basin, context, timestamp)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    p_data['description'],
                    p_data.get('basin_coords'),
                    json.dumps({
                        'pattern_id': p_data['pattern_id'],
                        'source_type': p_data['source_type'],
                        'code_snippet': p_data['code_snippet'][:500]
                    }),
                    p_data.get('created_at', time.time())
                ))
                cur.close()
                print(f"[ToolFactory] Pattern persisted to PostgreSQL: {p_data['pattern_id']}")
        except Exception as e:
            print(f"[ToolFactory] PostgreSQL persist failed: {e}")
            raise  # Re-raise so buffer can queue for retry

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

        purpose_basin = self.encoder.encode(description)
        complexity = self._estimate_complexity(description, examples)

        # First find matching patterns to check compatibility
        matching_patterns = self.find_matching_patterns(description)
        current_matching_ids = set(p.pattern_id for p in matching_patterns)

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
            self.proactive_search(description)
            return None

        code, func_name = self._generate_code_from_patterns(
            description, examples, matching_patterns, name_hint
        )

        if code is None:
            print("[ToolFactory] Failed to generate code from patterns")
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

            print(f"[ToolFactory] Successfully generated tool: {tool.name}")

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

        return success, result, error

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
        """List all learned patterns."""
        return [pattern.to_dict() for pattern in self.learned_patterns.values()]
