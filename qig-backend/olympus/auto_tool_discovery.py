"""
Automatic Tool Discovery System

Enables gods to periodically analyze their research patterns and request tools
when they identify recurring needs or knowledge gaps.

Features:
- Periodic pattern analysis (every N assessments)
- Automatic tool request generation based on patterns
- Cross-god collaboration on tool discoveries
- Continuous improvement feedback loop
"""

import hashlib
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from collections import Counter, defaultdict

logger = logging.getLogger(__name__)

try:
    from .tool_request_persistence import (
        get_tool_request_persistence,
        ToolRequest,
        PatternDiscovery,
        RequestStatus,
        RequestPriority
    )
    PERSISTENCE_AVAILABLE = True
except ImportError:
    PERSISTENCE_AVAILABLE = False
    logger.warning("[AutoToolDiscovery] Persistence not available")


class ToolDiscoveryEngine:
    """
    Analyzes god activity patterns and automatically requests tools
    when recurring needs or opportunities are identified.
    """
    
    def __init__(
        self,
        god_name: str,
        analysis_interval: int = 50,  # Analyze every N assessments
        min_pattern_confidence: float = 0.7,
        min_discoveries_for_request: int = 3
    ):
        self.god_name = god_name
        self.analysis_interval = analysis_interval
        self.min_pattern_confidence = min_pattern_confidence
        self.min_discoveries_for_request = min_discoveries_for_request
        
        # Track activity for pattern analysis
        self.assessment_count = 0
        self.recent_topics: List[str] = []
        self.recent_challenges: List[Dict] = []
        self.recent_insights: List[Dict] = []
        self.topic_frequency: Counter = Counter()
        self.challenge_patterns: Dict[str, List[Dict]] = defaultdict(list)
        
        # Track what we've already requested
        self.requested_tools: Set[str] = set()
        self.last_discovery_check = datetime.now()
        
        # Get persistence layer
        self.persistence = get_tool_request_persistence() if PERSISTENCE_AVAILABLE else None
        
        logger.info(f"[AutoToolDiscovery:{god_name}] Initialized (interval={analysis_interval})")
    
    def record_assessment(
        self,
        topic: str,
        result: Dict,
        challenges: Optional[List[str]] = None,
        insights: Optional[List[str]] = None
    ):
        """
        Record an assessment for pattern analysis.
        
        Args:
            topic: What was being assessed
            result: Assessment result dict
            challenges: Any challenges encountered
            insights: Any insights gained
        """
        self.assessment_count += 1
        
        # Track topic frequency
        self.recent_topics.append(topic)
        self.topic_frequency[topic] += 1
        
        # Track challenges
        if challenges:
            for challenge in challenges:
                challenge_type = self._categorize_challenge(challenge)
                self.challenge_patterns[challenge_type].append({
                    'topic': topic,
                    'challenge': challenge,
                    'timestamp': datetime.now()
                })
                self.recent_challenges.append({
                    'type': challenge_type,
                    'description': challenge,
                    'topic': topic
                })
        
        # Track insights
        if insights:
            for insight in insights:
                self.recent_insights.append({
                    'topic': topic,
                    'insight': insight,
                    'timestamp': datetime.now()
                })
        
        # Keep recent lists bounded
        if len(self.recent_topics) > 200:
            self.recent_topics = self.recent_topics[-100:]
        if len(self.recent_challenges) > 100:
            self.recent_challenges = self.recent_challenges[-50:]
        if len(self.recent_insights) > 100:
            self.recent_insights = self.recent_insights[-50:]
        
        # Periodic analysis
        if self.assessment_count % self.analysis_interval == 0:
            self._analyze_and_request_tools()
    
    def _categorize_challenge(self, challenge: str) -> str:
        """Categorize a challenge to identify patterns."""
        challenge_lower = challenge.lower()
        
        if any(word in challenge_lower for word in ['parse', 'extract', 'format']):
            return 'data_parsing'
        elif any(word in challenge_lower for word in ['validate', 'check', 'verify']):
            return 'validation'
        elif any(word in challenge_lower for word in ['analyze', 'compute', 'calculate']):
            return 'analysis'
        elif any(word in challenge_lower for word in ['search', 'find', 'lookup']):
            return 'search'
        elif any(word in challenge_lower for word in ['generate', 'create', 'produce']):
            return 'generation'
        elif any(word in challenge_lower for word in ['integrate', 'combine', 'merge']):
            return 'integration'
        else:
            return 'general'
    
    def _analyze_and_request_tools(self):
        """Analyze patterns and request tools for recurring needs."""
        logger.info(f"[AutoToolDiscovery:{self.god_name}] Analyzing patterns from {self.assessment_count} assessments")
        
        discoveries = []
        
        # Analyze challenge patterns
        for challenge_type, challenges in self.challenge_patterns.items():
            if len(challenges) >= self.min_discoveries_for_request:
                # Found a recurring challenge - might need a tool
                discovery = self._create_discovery(
                    pattern_type='challenge',
                    description=f"Recurring {challenge_type} challenges ({len(challenges)} instances)",
                    confidence=min(0.9, 0.5 + 0.1 * len(challenges)),
                    context={'challenge_type': challenge_type, 'instances': challenges[:5]}
                )
                discoveries.append(discovery)
        
        # Analyze topic frequency - tools for common topics
        common_topics = self.topic_frequency.most_common(5)
        for topic, count in common_topics:
            if count >= 10:  # Topic appears frequently
                discovery = self._create_discovery(
                    pattern_type='frequent_topic',
                    description=f"Frequent assessments of '{topic}' ({count} times)",
                    confidence=min(0.85, 0.6 + 0.02 * count),
                    context={'topic': topic, 'count': count}
                )
                discoveries.append(discovery)
        
        # Analyze insights for tool opportunities
        insight_topics = Counter()
        for insight in self.recent_insights:
            insight_topics[insight['topic']] += 1
        
        for topic, count in insight_topics.most_common(3):
            if count >= 5:
                discovery = self._create_discovery(
                    pattern_type='insight_cluster',
                    description=f"Insight cluster around '{topic}' ({count} insights)",
                    confidence=min(0.8, 0.55 + 0.05 * count),
                    context={'topic': topic, 'count': count}
                )
                discoveries.append(discovery)
        
        # Save discoveries and potentially request tools
        for discovery in discoveries:
            if discovery.confidence >= self.min_pattern_confidence:
                self._save_and_maybe_request_tool(discovery)
        
        # Check for pending requests that completed
        self._check_completed_requests()
        
        logger.info(f"[AutoToolDiscovery:{self.god_name}] Found {len(discoveries)} patterns, {len([d for d in discoveries if d.confidence >= self.min_pattern_confidence])} high-confidence")
    
    def _create_discovery(
        self,
        pattern_type: str,
        description: str,
        confidence: float,
        context: Dict
    ) -> PatternDiscovery:
        """Create a pattern discovery record."""
        discovery_id = hashlib.sha256(
            f"{self.god_name}:{pattern_type}:{description}:{time.time()}".encode()
        ).hexdigest()[:32]
        
        return PatternDiscovery(
            discovery_id=discovery_id,
            god_name=self.god_name,
            pattern_type=pattern_type,
            description=description,
            confidence=confidence,
            phi_score=confidence * 0.8,  # Rough approximation
            basin_coords=None,  # Could compute from description
            created_at=datetime.now(),
            tool_requested=False,
            tool_request_id=None
        )
    
    def _save_and_maybe_request_tool(self, discovery: PatternDiscovery):
        """Save discovery and request tool if appropriate."""
        if not self.persistence:
            logger.warning(f"[AutoToolDiscovery:{self.god_name}] No persistence - skipping discovery")
            return
        
        # Save discovery
        self.persistence.save_pattern_discovery(discovery)
        
        # Check if we should request a tool
        request_hash = hashlib.sha256(
            f"{discovery.pattern_type}:{discovery.description}".encode()
        ).hexdigest()[:16]
        
        if request_hash in self.requested_tools:
            logger.debug(f"[AutoToolDiscovery:{self.god_name}] Already requested tool for this pattern")
            return
        
        # Request tool for high-confidence discoveries
        if discovery.confidence >= 0.8:
            tool_request = self._create_tool_request(discovery)
            if self.persistence.save_tool_request(tool_request):
                self.requested_tools.add(request_hash)
                discovery.tool_requested = True
                discovery.tool_request_id = tool_request.request_id
                self.persistence.save_pattern_discovery(discovery)
                logger.info(f"[AutoToolDiscovery:{self.god_name}] Requested tool: {tool_request.description}")
    
    def _create_tool_request(self, discovery: PatternDiscovery) -> ToolRequest:
        """Create a tool request from a pattern discovery."""
        request_id = hashlib.sha256(
            f"tool_request:{self.god_name}:{discovery.discovery_id}".encode()
        ).hexdigest()[:32]
        
        # Generate description and examples based on discovery type
        if discovery.pattern_type == 'challenge':
            description = f"Tool to handle {discovery.description}"
            examples = [{"input": "challenge_data", "output": "processed_result"}]
        elif discovery.pattern_type == 'frequent_topic':
            description = f"Specialized tool for {discovery.description}"
            examples = [{"input": "topic_data", "output": "analysis"}]
        elif discovery.pattern_type == 'insight_cluster':
            description = f"Tool to extract insights from {discovery.description}"
            examples = [{"input": "data", "output": "insights"}]
        else:
            description = f"Tool for {discovery.description}"
            examples = [{"input": "data", "output": "result"}]
        
        # Determine priority based on confidence
        if discovery.confidence >= 0.85:
            priority = RequestPriority.HIGH
        elif discovery.confidence >= 0.75:
            priority = RequestPriority.NORMAL
        else:
            priority = RequestPriority.LOW
        
        return ToolRequest(
            request_id=request_id,
            requester_god=self.god_name,
            description=description,
            examples=examples,
            context={
                'discovery_id': discovery.discovery_id,
                'pattern_type': discovery.pattern_type,
                'confidence': discovery.confidence
            },
            priority=priority,
            status=RequestStatus.PENDING,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            pattern_discoveries=[discovery.discovery_id]
        )
    
    def _check_completed_requests(self):
        """Check if any of our pending requests have completed."""
        if not self.persistence:
            return
        
        # Only check every 5 minutes to avoid excessive DB queries
        if (datetime.now() - self.last_discovery_check).total_seconds() < 300:
            return
        
        self.last_discovery_check = datetime.now()
        
        pending = self.persistence.get_pending_requests(requester_god=self.god_name)
        completed_count = 0
        
        for request in pending:
            if request.status == RequestStatus.COMPLETED and request.tool_id:
                logger.info(f"[AutoToolDiscovery:{self.god_name}] Tool request completed: {request.tool_id}")
                completed_count += 1
        
        if completed_count > 0:
            logger.info(f"[AutoToolDiscovery:{self.god_name}] {completed_count} tool requests completed")
    
    def force_discovery_check(self):
        """Manually trigger a discovery check (for testing)."""
        logger.info(f"[AutoToolDiscovery:{self.god_name}] Force-checking for unrequested discoveries")
        
        if not self.persistence:
            logger.warning(f"[AutoToolDiscovery:{self.god_name}] No persistence available")
            return []
        
        discoveries = self.persistence.get_unrequested_discoveries(
            god_name=self.god_name,
            min_confidence=self.min_pattern_confidence
        )
        
        logger.info(f"[AutoToolDiscovery:{self.god_name}] Found {len(discoveries)} unrequested discoveries")
        return discoveries
    
    def get_stats(self) -> Dict:
        """Get discovery statistics."""
        stats = {
            'god_name': self.god_name,
            'assessment_count': self.assessment_count,
            'recent_topics_count': len(self.recent_topics),
            'unique_topics': len(self.topic_frequency),
            'top_topics': self.topic_frequency.most_common(5),
            'challenge_types': len(self.challenge_patterns),
            'total_challenges': sum(len(v) for v in self.challenge_patterns.values()),
            'total_insights': len(self.recent_insights),
            'tools_requested': len(self.requested_tools)
        }
        
        if self.persistence:
            db_stats = self.persistence.get_stats()
            stats['database'] = db_stats
        
        return stats


def create_discovery_engine_for_god(god_name: str, **kwargs) -> ToolDiscoveryEngine:
    """Factory function to create a discovery engine for a god."""
    return ToolDiscoveryEngine(god_name=god_name, **kwargs)
