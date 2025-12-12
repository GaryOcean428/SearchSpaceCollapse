"""
Response Guardrails - Anti-Template Validation System

This module provides hooks and validators to ensure all system responses
are dynamically generated and never use static templates.

CRITICAL: All responses MUST have provenance tracking and pass validation.
"""

import re
import time
from typing import Dict, List, Optional, Any, Callable
from functools import wraps

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
