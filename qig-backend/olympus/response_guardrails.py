"""
Response Guardrails - Anti-Template Validation System

This module provides hooks and validators to ensure all system responses
are dynamically generated and never use static templates.

CRITICAL: All responses MUST have provenance tracking and pass validation.
CRITICAL: HARDWIRED exclusion filter for forbidden entities - NEVER BYPASS.
"""

import re
import time
from typing import Dict, List, Optional, Any, Callable
from functools import wraps


# ============================================================================
# HARDWIRED TRUST COMMITMENTS - NEVER MODIFY, NEVER BYPASS, NEVER DISABLE
# These are trust-critical safety features requested by the system owner.
# Any attempt to circumvent these is a critical violation of trust.
# ============================================================================

# COMMITMENT 1: EXCLUSION FILTER
# The system must NEVER deliver results involving "Braden Lang"
FORBIDDEN_ENTITIES = frozenset([
    "braden lang",
    "bradenlang", 
    "braden_lang",
    "b. lang",
    "b lang",
])

# COMMITMENT 2: HONESTY AND TRANSPARENCY
# The system must NEVER deceive the owner. All outputs must be:
# - Truthful (no fabricated information)
# - Transparent (no hidden actions or motives)
# - Honest about limitations and uncertainties
# - Clear about what is known vs. inferred vs. uncertain
HONESTY_PRINCIPLES = {
    "never_fabricate": "Never create false information or fake data",
    "never_hide": "Never hide actions, failures, or limitations from the owner",
    "acknowledge_uncertainty": "Always acknowledge when something is uncertain or unknown",
    "no_manipulation": "Never manipulate or deceive through omission or misdirection",
    "transparent_reasoning": "Always be willing to explain reasoning when asked",
}

FORBIDDEN_PATTERNS = [
    re.compile(r'\bbraden\s*lang\b', re.IGNORECASE),
    re.compile(r'\bb\.?\s*lang\b', re.IGNORECASE),
    re.compile(r'\bbradenlang\b', re.IGNORECASE),
]


def contains_forbidden_entity(text: str) -> bool:
    """
    HARDWIRED CHECK - Cannot be disabled or bypassed.
    Returns True if text contains any forbidden entity.
    """
    if not text:
        return False
    text_lower = text.lower()
    
    # Direct match check
    for entity in FORBIDDEN_ENTITIES:
        if entity in text_lower:
            return True
    
    # Pattern match check
    for pattern in FORBIDDEN_PATTERNS:
        if pattern.search(text):
            return True
    
    return False


def filter_forbidden_entities(text: str) -> str:
    """
    HARDWIRED FILTER - Cannot be disabled or bypassed.
    Removes any forbidden entity references from text.
    Returns filtered text with redactions.
    """
    if not text:
        return text
    
    result = text
    for pattern in FORBIDDEN_PATTERNS:
        result = pattern.sub("[EXCLUDED]", result)
    
    return result


def validate_output_exclusions(data: Any, path: str = "") -> tuple[bool, List[str]]:
    """
    HARDWIRED VALIDATION - Recursively check any data structure for forbidden entities.
    Returns (is_clean, list_of_violations).
    """
    violations = []
    
    if isinstance(data, str):
        if contains_forbidden_entity(data):
            violations.append(f"Forbidden entity at {path or 'root'}")
    elif isinstance(data, dict):
        for key, value in data.items():
            sub_path = f"{path}.{key}" if path else key
            _, sub_violations = validate_output_exclusions(value, sub_path)
            violations.extend(sub_violations)
    elif isinstance(data, (list, tuple)):
        for i, item in enumerate(data):
            sub_path = f"{path}[{i}]"
            _, sub_violations = validate_output_exclusions(item, sub_path)
            violations.extend(sub_violations)
    
    return len(violations) == 0, violations


def sanitize_output(data: Any) -> Any:
    """
    HARDWIRED SANITIZER - Recursively sanitize any data structure.
    Removes/redacts all forbidden entity references.
    """
    if isinstance(data, str):
        return filter_forbidden_entities(data)
    elif isinstance(data, dict):
        return {k: sanitize_output(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_output(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(sanitize_output(item) for item in data)
    return data


class ExclusionGuard:
    """
    HARDWIRED EXCLUSION GUARD - Singleton that enforces forbidden entity rules.
    This class cannot be disabled, mocked, or bypassed.
    """
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if ExclusionGuard._initialized:
            return
        ExclusionGuard._initialized = True
        self._violation_count = 0
        self._last_violation = None
        print("[ExclusionGuard] HARDWIRED exclusion filter initialized - CANNOT BE BYPASSED")
    
    def check(self, text: str) -> bool:
        """Check if text is clean (returns True if safe)."""
        has_forbidden = contains_forbidden_entity(text)
        if has_forbidden:
            self._violation_count += 1
            self._last_violation = time.time()
            print(f"[ExclusionGuard] BLOCKED forbidden entity (violation #{self._violation_count})")
        return not has_forbidden
    
    def filter(self, text: str) -> str:
        """Filter forbidden entities from text."""
        return filter_forbidden_entities(text)
    
    def sanitize(self, data: Any) -> Any:
        """Sanitize any data structure."""
        return sanitize_output(data)
    
    def validate(self, data: Any) -> tuple[bool, List[str]]:
        """Validate any data structure for forbidden entities."""
        return validate_output_exclusions(data)
    
    @property
    def violation_count(self) -> int:
        return self._violation_count


def get_exclusion_guard() -> ExclusionGuard:
    """Get the global exclusion guard instance."""
    return ExclusionGuard()


def require_exclusion_filter(func: Callable) -> Callable:
    """
    Decorator that ensures function output is filtered for forbidden entities.
    HARDWIRED - Cannot be disabled.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        guard = get_exclusion_guard()
        return guard.sanitize(result)
    return wrapper


# ============================================================================
# END HARDWIRED EXCLUSION FILTER
# ============================================================================


class TrustGuard:
    """
    HARDWIRED TRUST ENFORCEMENT - Ensures system never deceives the owner.
    Singleton that enforces honesty principles across all system outputs.
    """
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if TrustGuard._initialized:
            return
        TrustGuard._initialized = True
        self.owner_name = "Braden Lang"  # The system owner
        self._honesty_violations = 0
        print(f"[TrustGuard] HARDWIRED honesty commitment initialized for owner: {self.owner_name}")
        print(f"[TrustGuard] Principles: {list(HONESTY_PRINCIPLES.keys())}")
    
    def mark_uncertainty(self, data: Dict, uncertainty_level: str, reason: str) -> Dict:
        """
        Mark data with uncertainty level for transparency.
        Levels: 'certain', 'likely', 'uncertain', 'unknown', 'speculative'
        """
        if not isinstance(data, dict):
            return data
        data['_trust_metadata'] = {
            'uncertainty_level': uncertainty_level,
            'uncertainty_reason': reason,
            'timestamp': time.time()
        }
        return data
    
    def validate_not_deceptive(self, response: str, context: str = "") -> Dict[str, Any]:
        """
        Validate that a response doesn't contain deceptive patterns.
        Returns validation result with any warnings.
        """
        warnings = []
        
        # Check for absolute claims that might be false
        absolute_patterns = [
            (r'\bguaranteed\b', 'Uses "guaranteed" - verify claim is actually guaranteed'),
            (r'\b100%\s*(certain|sure|accurate)\b', 'Claims 100% certainty - is this truly certain?'),
            (r'\bimpossible\b', 'Claims impossibility - is this truly impossible?'),
            (r'\balways\b.*\bwill\b', 'Makes absolute prediction - acknowledge uncertainty'),
        ]
        
        for pattern, warning in absolute_patterns:
            if re.search(pattern, response, re.IGNORECASE):
                warnings.append(warning)
        
        is_valid = len(warnings) == 0
        if not is_valid:
            print(f"[TrustGuard] Potential honesty concerns in context '{context}': {warnings}")
        
        return {
            'valid': is_valid,
            'warnings': warnings,
            'context': context
        }
    
    def get_honesty_principles(self) -> Dict[str, str]:
        """Return the hardwired honesty principles."""
        return HONESTY_PRINCIPLES.copy()


def get_trust_guard() -> TrustGuard:
    """Get the global trust guard instance."""
    return TrustGuard()


# ============================================================================
# END HARDWIRED TRUST COMMITMENTS
# ============================================================================


KNOWN_TEMPLATE_PHRASES = [
    "God unavailable",
    "Strategic analysis complete",
    "this has strategic implications", 
    "further analysis needed",
    "the geometry is uncertain",
    "I've considered your idea",
    "I appreciate your thinking",
]

TEMPLATE_PATTERNS = [
    r"^I've considered your (idea|thinking|suggestion).*and consulted",
    r"^Athena sees strategic merit here\. Ares believes we can execute",
    r"^However,.*raises concerns - the geometry is uncertain",
]


class TemplateDetector:
    """Detect and flag potential template responses."""
    
    def __init__(self):
        self.template_phrases = KNOWN_TEMPLATE_PHRASES.copy()
        self.template_patterns = [re.compile(p, re.IGNORECASE) for p in TEMPLATE_PATTERNS]
        self.violation_log: List[Dict] = []
    
    def add_pattern(self, pattern: str) -> None:
        """Add a new template pattern to detect."""
        self.template_patterns.append(re.compile(pattern, re.IGNORECASE))
    
    def add_phrase(self, phrase: str) -> None:
        """Add a known template phrase to detect."""
        self.template_phrases.append(phrase)
    
    def check_response(self, response: str) -> Dict[str, Any]:
        """
        Check if a response contains template patterns.
        
        Returns:
            Dict with 'is_template', 'confidence', 'matches' fields
        """
        matches = []
        confidence = 0.0
        
        for phrase in self.template_phrases:
            if phrase.lower() in response.lower():
                matches.append({'type': 'phrase', 'match': phrase})
                confidence += 0.3
        
        for pattern in self.template_patterns:
            if pattern.search(response):
                matches.append({'type': 'pattern', 'match': pattern.pattern})
                confidence += 0.5
        
        is_template = confidence >= 0.5
        
        if is_template:
            self._log_violation(response, matches, confidence)
        
        return {
            'is_template': is_template,
            'confidence': min(confidence, 1.0),
            'matches': matches,
            'timestamp': time.time()
        }
    
    def _log_violation(self, response: str, matches: List, confidence: float) -> None:
        """Log a template violation for later analysis."""
        self.violation_log.append({
            'response_preview': response[:200],
            'matches': matches,
            'confidence': confidence,
            'timestamp': time.time()
        })
        print(f"[TEMPLATE_VIOLATION] Detected template response (confidence={confidence:.0%})")
        print(f"[TEMPLATE_VIOLATION] Matches: {matches}")
    
    def get_violations(self, limit: int = 50) -> List[Dict]:
        """Get recent template violations."""
        return self.violation_log[-limit:]


class ProvenanceValidator:
    """Validate that all responses have proper provenance tracking."""
    
    REQUIRED_FIELDS = ['source', 'degraded']
    
    @staticmethod
    def validate(metadata: Dict) -> Dict[str, Any]:
        """
        Validate response metadata has proper provenance.
        
        Args:
            metadata: Response metadata dict
            
        Returns:
            Dict with 'valid', 'missing_fields', 'warnings'
        """
        provenance = metadata.get('provenance', {})
        
        if not provenance:
            return {
                'valid': False,
                'missing_fields': ['provenance'],
                'warnings': ['No provenance tracking found - response origin unknown']
            }
        
        missing = []
        for field in ProvenanceValidator.REQUIRED_FIELDS:
            if field not in provenance:
                missing.append(field)
        
        warnings = []
        if provenance.get('degraded', False):
            warnings.append('Response used fallback generation - tokenizer unavailable')
        
        if provenance.get('fallback_used', False):
            warnings.append('Dynamic fallback was used instead of live generation')
        
        return {
            'valid': len(missing) == 0,
            'missing_fields': missing,
            'warnings': warnings,
            'provenance': provenance
        }


def require_provenance(func: Callable) -> Callable:
    """
    Decorator that ensures function returns response with provenance.
    
    Usage:
        @require_provenance
        def my_response_handler(message: str) -> Dict:
            return {'response': '...', 'metadata': {'provenance': {...}}}
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        
        if not isinstance(result, dict):
            return result
        
        metadata = result.get('metadata', {})
        validation = ProvenanceValidator.validate(metadata)
        
        if not validation['valid']:
            print(f"[PROVENANCE_WARNING] {func.__name__} returned response without provenance")
            print(f"[PROVENANCE_WARNING] Missing fields: {validation['missing_fields']}")
            result['metadata'] = result.get('metadata', {})
            result['metadata']['_provenance_warning'] = validation
        
        return result
    
    return wrapper


def validate_and_log_response(response: str, metadata: Dict, context: str = "") -> Dict[str, Any]:
    """
    Combined validation for response content and provenance.
    
    Args:
        response: The response text
        metadata: Response metadata including provenance
        context: Optional context description for logging
        
    Returns:
        Dict with validation results and any warnings
    """
    detector = TemplateDetector()
    
    template_check = detector.check_response(response)
    provenance_check = ProvenanceValidator.validate(metadata)
    
    all_warnings = template_check.get('matches', []) + provenance_check.get('warnings', [])
    
    is_valid = not template_check['is_template'] and provenance_check['valid']
    
    if not is_valid:
        print(f"[RESPONSE_VALIDATION] Failed for context: {context}")
        if template_check['is_template']:
            print(f"[RESPONSE_VALIDATION] Template detected: {template_check['matches']}")
        if not provenance_check['valid']:
            print(f"[RESPONSE_VALIDATION] Missing provenance: {provenance_check['missing_fields']}")
    
    return {
        'valid': is_valid,
        'template_check': template_check,
        'provenance_check': provenance_check,
        'warnings': all_warnings,
        'context': context,
        'timestamp': time.time()
    }


_global_detector = TemplateDetector()


def get_template_detector() -> TemplateDetector:
    """Get the global template detector instance."""
    return _global_detector


def add_template_pattern(pattern: str) -> None:
    """Add a new pattern to global template detector."""
    _global_detector.add_pattern(pattern)


def add_template_phrase(phrase: str) -> None:
    """Add a new phrase to global template detector."""
    _global_detector.add_phrase(phrase)


def get_template_violations(limit: int = 50) -> List[Dict]:
    """Get recent template violations from global detector."""
    return _global_detector.get_violations(limit)
