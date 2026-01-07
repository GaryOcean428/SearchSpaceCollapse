"""
Insight Validator - External Search Validation for Lightning Insights

Validates cross-domain insights from the Lightning Kernel using external search APIs.
Implements a two-phase validation strategy:
  Phase 1: Tavily search for raw sources and facts
  Phase 2: Perplexity synthesis for relationship validation

This closes the loop from Lightning insights â external validation â curriculum â training.
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
import numpy as np

# Type hints for CrossDomainInsight (from lightning_kernel.py)
try:
    from olympus.lightning_kernel import CrossDomainInsight
except ImportError:
    # If running standalone
    CrossDomainInsight = Any

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of insight validation."""
    validated: bool
    confidence: float
    tavily_sources: List[Dict[str, Any]]
    perplexity_synthesis: Optional[str]
    validation_score: float
    source_overlap: float
    semantic_similarity: float


class InsightValidator:
    """
    Validates Lightning insights using hybrid Tavily + Perplexity strategy.
    
    Architecture:
    - Tavily MCP (primary): Raw search, fact finding
    - Perplexity API (secondary): Synthesis, relationship validation
    
    Usage:
        validator = InsightValidator()
        result = validator.validate(lightning_insight)
        
        if result.validated:
            curriculum.add(insight, result.tavily_sources)
    """
    
    def __init__(
        self,
        use_mcp: bool = True,
        validation_threshold: float = 0.7
    ):
        """
        Initialize validator.
        
        Args:
            use_mcp: If True, use Tavily MCP; if False, use direct API
            validation_threshold: Minimum score to consider validated (0.7 default)
        """
        self.use_mcp = use_mcp
        self.validation_threshold = validation_threshold
        
        # Tavily setup
        if not use_mcp:
            try:
                from tavily import TavilyClient
                tavily_key = os.getenv('TAVILY_API_KEY')
                if not tavily_key:
                    logger.warning("TAVILY_API_KEY not set, Tavily search disabled")
                    self.tavily_client = None
                else:
                    self.tavily_client = TavilyClient(api_key=tavily_key)
            except ImportError:
                logger.warning("tavily-python not installed, using MCP fallback")
                self.tavily_client = None
                self.use_mcp = True
        else:
            self.tavily_client = None
        
        # Perplexity setup (direct API)
        try:
            # Try perplexity-python SDK first
            try:
                from perplexity import Perplexity
                perplexity_key = os.getenv('PERPLEXITY_API_KEY')
                if not perplexity_key:
                    logger.warning("PERPLEXITY_API_KEY not set, Perplexity synthesis disabled")
                    self.perplexity_client = None
                else:
                    self.perplexity_client = Perplexity(api_key=perplexity_key)
            except ImportError:
                # Fallback to requests-based implementation
                import requests
                perplexity_key = os.getenv('PERPLEXITY_API_KEY')
                if perplexity_key:
                    self.perplexity_client = PerplexityRequestsClient(perplexity_key)
                else:
                    logger.warning("PERPLEXITY_API_KEY not set, Perplexity synthesis disabled")
                    self.perplexity_client = None
        except Exception as e:
            logger.error(f"Failed to initialize Perplexity: {e}")
            self.perplexity_client = None
    
    def validate(self, insight: CrossDomainInsight) -> ValidationResult:
        """
        Validate a cross-domain insight using external search.
        
        Process:
        1. Parse insight to extract domains and patterns
        2. Tavily search for supporting sources
        3. Perplexity synthesis for relationship validation
        4. Cross-validate results
        5. Compute validation score
        
        Args:
            insight: CrossDomainInsight from Lightning Kernel
            
        Returns:
            ValidationResult with validation status and sources
        """
        logger.info(f"Validating insight: {insight.insight_id}")
        
        # Parse insight
        try:
            search_query, relationship_query = self._parse_insight(insight)
        except Exception as e:
            logger.error(f"Failed to parse insight: {e}")
            return self._failed_validation(insight, str(e))
        
        # Phase 1: Tavily search for sources
        tavily_results = self._tavily_search(search_query)
        if not tavily_results:
            logger.warning(f"No Tavily results for: {search_query}")
            # Don't fail completely, Perplexity might still validate
        
        # Phase 2: Perplexity synthesis
        perplexity_answer = self._perplexity_validate(relationship_query, tavily_results)
        if not perplexity_answer:
            logger.warning(f"No Perplexity synthesis for: {relationship_query}")
        
        # Cross-validate
        validation_score, source_overlap, semantic_sim = self._cross_validate(
            insight, tavily_results, perplexity_answer
        )
        
        # Update insight confidence
        validated = validation_score >= self.validation_threshold
        
        result = ValidationResult(
            validated=validated,
            confidence=insight.confidence * (0.5 + 0.5 * validation_score),
            tavily_sources=tavily_results.get('results', []) if tavily_results else [],
            perplexity_synthesis=perplexity_answer,
            validation_score=validation_score,
            source_overlap=source_overlap,
            semantic_similarity=semantic_sim
        )
        
        logger.info(
            f"Validation complete: validated={validated}, "
            f"score={validation_score:.3f}, confidence={result.confidence:.3f}"
        )
        
        return result
    
    def _parse_insight(self, insight: CrossDomainInsight) -> Tuple[str, str]:
        """
        Parse insight to extract search query and relationship question.
        
        Returns:
            (search_query, relationship_query)
        """
        # Extract domains
        domains = insight.source_domains
        
        # Build search query from domains
        # Example: ["bitcoin_recovery", "temporal_reasoning"] -> "BIP39 mnemonic geodesic path planning"
        search_terms = []
        for domain in domains:
            # Simple heuristic: convert underscore to space, use as search term
            search_terms.append(domain.replace('_', ' '))
        
        search_query = " ".join(search_terms)
        
        # Build relationship query for Perplexity
        relationship_query = (
            f"What is the mathematical or conceptual relationship between "
            f"{domains[0].replace('_', ' ')} and {domains[1].replace('_', ' ')}? "
            f"Focus on shared structures, geometric primitives, or optimization methods."
        )
        
        return search_query, relationship_query
    
    def _tavily_search(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search Tavily for sources.
        
        Uses MCP if available, otherwise direct API.
        """
        if self.use_mcp:
            # Use Tavily MCP (requires MCP server running)
            try:
                # This would call MCP in production
                # For now, return None to indicate MCP not implemented in this file
                logger.warning("Tavily MCP not yet wired to actual MCP server")
                return None
            except Exception as e:
                logger.error(f"Tavily MCP error: {e}")
                return None
        elif self.tavily_client:
            # Use direct API
            try:
                response = self.tavily_client.search(
                    query=query,
                    search_depth="advanced",
                    max_results=10,
                    include_answer=True,
                    include_domains=["arxiv.org", "github.com", "bitcoin.org"]
                )
                return response
            except Exception as e:
                logger.error(f"Tavily API error: {e}")
                return None
        else:
            logger.warning("Tavily not configured")
            return None
    
    def _perplexity_validate(
        self,
        question: str,
        tavily_results: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Use Perplexity to synthesize answer and validate relationship.
        """
        if not self.perplexity_client:
            logger.warning("Perplexity not configured")
            return None
        
        try:
            # Build context from Tavily results if available
            context = ""
            if tavily_results and 'answer' in tavily_results:
                context = f"\nContext: {tavily_results['answer']}\n"
            
            # Call Perplexity
            if hasattr(self.perplexity_client, 'chat'):
                # perplexity-python SDK
                response = self.perplexity_client.chat.completions.create(
                    model="sonar-pro",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a research assistant validating cross-domain patterns. Be factual and cite sources."
                        },
                        {
                            "role": "user",
                            "content": f"{context}{question}"
                        }
                    ],
                    temperature=0.2,
                    max_tokens=1000,
                    return_citations=True
                )
                return response.choices[0].message.content
            else:
                # Requests-based client
                return self.perplexity_client.query(question, context)
        except Exception as e:
            logger.error(f"Perplexity error: {e}")
            return None
    
    def _cross_validate(
        self,
        insight: CrossDomainInsight,
        tavily_results: Optional[Dict[str, Any]],
        perplexity_answer: Optional[str]
    ) -> Tuple[float, float, float]:
        """
        Cross-validate Tavily and Perplexity results.
        
        Returns:
            (validation_score, source_overlap, semantic_similarity)
        """
        source_overlap = 0.0
        semantic_similarity = 0.0
        
        # Check source overlap
        if tavily_results and perplexity_answer:
            # Extract URLs from Tavily
            tavily_urls = {r['url'] for r in tavily_results.get('results', [])}
            
            # Extract citations from Perplexity (heuristic)
            # This would need proper parsing in production
            perplexity_urls = self._extract_urls_from_text(perplexity_answer)
            
            if tavily_urls and perplexity_urls:
                overlap = len(tavily_urls & perplexity_urls)
                total = len(tavily_urls | perplexity_urls)
                source_overlap = overlap / total if total > 0 else 0.0
        
        # Semantic similarity between answers
        if tavily_results and perplexity_answer and 'answer' in tavily_results:
            tavily_answer = tavily_results['answer']
            semantic_similarity = self._compute_semantic_similarity(
                tavily_answer, perplexity_answer
            )
        elif perplexity_answer:
            # If we have Perplexity but not Tavily, give some credit
            semantic_similarity = 0.5
        elif tavily_results:
            # If we have Tavily but not Perplexity, give some credit
            semantic_similarity = 0.5
        
        # Compute overall validation score
        validation_score = 0.5 * source_overlap + 0.5 * semantic_similarity
        
        return validation_score, source_overlap, semantic_similarity
    
    def _extract_urls_from_text(self, text: str) -> Set[str]:
        """Extract URLs from text (simple regex)."""
        import re
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        return set(urls)
    
    def _compute_semantic_similarity(self, text1: str, text2: str) -> float:
        """
        Compute semantic similarity between two texts.
        
        Simple bag-of-words cosine similarity for now.
        Could be improved with embeddings.
        """
        # Tokenize
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        # Jaccard similarity
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        return intersection / union if union > 0 else 0.0
    
    def _failed_validation(
        self,
        insight: CrossDomainInsight,
        reason: str
    ) -> ValidationResult:
        """Return a failed validation result."""
        return ValidationResult(
            validated=False,
            confidence=insight.confidence * 0.5,
            tavily_sources=[],
            perplexity_synthesis=None,
            validation_score=0.0,
            source_overlap=0.0,
            semantic_similarity=0.0
        )


class PerplexityRequestsClient:
    """Fallback Perplexity client using requests library."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.perplexity.ai/chat/completions"
    
    def query(self, question: str, context: str = "") -> Optional[str]:
        """Query Perplexity using requests."""
        import requests
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "sonar-pro",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a research assistant validating cross-domain patterns. Be factual and cite sources."
                },
                {
                    "role": "user",
                    "content": f"{context}{question}"
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1000,
            "return_citations": True
        }
        
        try:
            response = requests.post(self.base_url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            return result['choices'][0]['message']['content']
        except Exception as e:
            logger.error(f"Perplexity requests error: {e}")
            return None


# Example usage
if __name__ == "__main__":
    # Test with mock insight
    @dataclass
    class MockInsight:
        insight_id: str = "test_123"
        source_domains: List[str] = field(default_factory=lambda: ["bitcoin_recovery", "temporal_reasoning"])
        confidence: float = 0.75
        connection_strength: float = 0.87
    
    validator = InsightValidator(use_mcp=False)
    
    mock_insight = MockInsight()
    result = validator.validate(mock_insight)
    
    print(f"Validated: {result.validated}")
    print(f"Score: {result.validation_score:.3f}")
    print(f"Updated confidence: {result.confidence:.3f}")
