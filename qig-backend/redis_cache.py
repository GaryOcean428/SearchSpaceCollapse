"""
Redis Cache Layer for QIG State Persistence

Provides fast caching for:
- Tool Factory patterns (learned code templates)
- Zeus chat context (conversation state)
- Strategy learner state

Uses Redis for persistence across page switches and restarts.
"""

import os
import json
import time
from typing import Optional, Dict, Any, List
import redis

REDIS_URL = os.environ.get('REDIS_URL')

CACHE_TTL_PATTERNS = 86400 * 7  # 7 days for learned patterns
CACHE_TTL_CHAT = 3600  # 1 hour for chat context
CACHE_TTL_LEARNER = 86400  # 24 hours for learner state

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> Optional[redis.Redis]:
    """Get or create Redis client with connection pooling."""
    global _redis_client
    
    if not REDIS_URL:
        print("[RedisCache] REDIS_URL not configured, running in memory-only mode")
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
            )
            _redis_client.ping()
            print("[RedisCache] Connected to Redis successfully")
        except Exception as e:
            print(f"[RedisCache] Failed to connect to Redis: {e}")
            _redis_client = None
    
    return _redis_client


class ToolPatternCache:
    """Cache for Tool Factory learned patterns."""
    
    PREFIX = "qig:tool_patterns"
    
    @classmethod
    def save_pattern(cls, pattern_id: str, pattern_data: Dict[str, Any]) -> bool:
        """Save a learned pattern to Redis."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            key = f"{cls.PREFIX}:{pattern_id}"
            pattern_data['cached_at'] = time.time()
            client.setex(key, CACHE_TTL_PATTERNS, json.dumps(pattern_data))
            client.sadd(f"{cls.PREFIX}:index", pattern_id)
            return True
        except Exception as e:
            print(f"[ToolPatternCache] Error saving pattern: {e}")
            return False
    
    @classmethod
    def get_pattern(cls, pattern_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a pattern from cache."""
        client = get_redis_client()
        if not client:
            return None
        
        try:
            key = f"{cls.PREFIX}:{pattern_id}"
            data = client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"[ToolPatternCache] Error retrieving pattern: {e}")
            return None
    
    @classmethod
    def get_all_patterns(cls) -> List[Dict[str, Any]]:
        """Get all cached patterns."""
        client = get_redis_client()
        if not client:
            return []
        
        try:
            pattern_ids = client.smembers(f"{cls.PREFIX}:index")
            patterns = []
            for pid in pattern_ids:
                pattern = cls.get_pattern(pid)
                if pattern:
                    patterns.append(pattern)
            return patterns
        except Exception as e:
            print(f"[ToolPatternCache] Error listing patterns: {e}")
            return []
    
    @classmethod
    def delete_pattern(cls, pattern_id: str) -> bool:
        """Delete a pattern from cache."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            client.delete(f"{cls.PREFIX}:{pattern_id}")
            client.srem(f"{cls.PREFIX}:index", pattern_id)
            return True
        except Exception as e:
            print(f"[ToolPatternCache] Error deleting pattern: {e}")
            return False


class ZeusChatCache:
    """Cache for Zeus chat conversation context."""
    
    PREFIX = "qig:zeus_chat"
    
    @classmethod
    def save_context(cls, session_id: str, context: Dict[str, Any]) -> bool:
        """Save conversation context."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            key = f"{cls.PREFIX}:context:{session_id}"
            context['cached_at'] = time.time()
            client.setex(key, CACHE_TTL_CHAT, json.dumps(context))
            return True
        except Exception as e:
            print(f"[ZeusChatCache] Error saving context: {e}")
            return False
    
    @classmethod
    def get_context(cls, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve conversation context."""
        client = get_redis_client()
        if not client:
            return None
        
        try:
            key = f"{cls.PREFIX}:context:{session_id}"
            data = client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"[ZeusChatCache] Error retrieving context: {e}")
            return None
    
    @classmethod
    def append_message(cls, session_id: str, message: Dict[str, Any]) -> bool:
        """Append a message to chat history."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            key = f"{cls.PREFIX}:history:{session_id}"
            message['timestamp'] = time.time()
            client.rpush(key, json.dumps(message))
            client.expire(key, CACHE_TTL_CHAT)
            client.ltrim(key, -100, -1)  # Keep last 100 messages
            return True
        except Exception as e:
            print(f"[ZeusChatCache] Error appending message: {e}")
            return False
    
    @classmethod
    def get_history(cls, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent chat history."""
        client = get_redis_client()
        if not client:
            return []
        
        try:
            key = f"{cls.PREFIX}:history:{session_id}"
            messages = client.lrange(key, -limit, -1)
            return [json.loads(m) for m in messages]
        except Exception as e:
            print(f"[ZeusChatCache] Error retrieving history: {e}")
            return []
    
    @classmethod
    def clear_session(cls, session_id: str) -> bool:
        """Clear a chat session."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            client.delete(f"{cls.PREFIX}:context:{session_id}")
            client.delete(f"{cls.PREFIX}:history:{session_id}")
            return True
        except Exception as e:
            print(f"[ZeusChatCache] Error clearing session: {e}")
            return False


class StrategyLearnerCache:
    """Cache for strategy learner state and feedback."""
    
    PREFIX = "qig:learner"
    
    @classmethod
    def save_feedback(cls, query: str, feedback: Dict[str, Any]) -> bool:
        """Save search feedback."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            feedback_id = f"{int(time.time() * 1000)}"
            key = f"{cls.PREFIX}:feedback:{feedback_id}"
            feedback['query'] = query
            feedback['timestamp'] = time.time()
            client.setex(key, CACHE_TTL_LEARNER, json.dumps(feedback))
            client.rpush(f"{cls.PREFIX}:feedback_index", feedback_id)
            client.ltrim(f"{cls.PREFIX}:feedback_index", -1000, -1)  # Keep last 1000
            return True
        except Exception as e:
            print(f"[StrategyLearnerCache] Error saving feedback: {e}")
            return False
    
    @classmethod
    def get_recent_feedback(cls, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent feedback entries."""
        client = get_redis_client()
        if not client:
            return []
        
        try:
            feedback_ids = client.lrange(f"{cls.PREFIX}:feedback_index", -limit, -1)
            feedbacks = []
            for fid in feedback_ids:
                key = f"{cls.PREFIX}:feedback:{fid}"
                data = client.get(key)
                if data:
                    feedbacks.append(json.loads(data))
            return feedbacks
        except Exception as e:
            print(f"[StrategyLearnerCache] Error retrieving feedback: {e}")
            return []
    
    @classmethod
    def save_replay_result(cls, result: Dict[str, Any]) -> bool:
        """Save a replay test result."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            replay_id = f"{int(time.time() * 1000)}"
            key = f"{cls.PREFIX}:replay:{replay_id}"
            result['replay_id'] = replay_id
            result['timestamp'] = time.time()
            client.setex(key, CACHE_TTL_LEARNER, json.dumps(result))
            client.rpush(f"{cls.PREFIX}:replay_index", replay_id)
            client.ltrim(f"{cls.PREFIX}:replay_index", -100, -1)  # Keep last 100
            return True
        except Exception as e:
            print(f"[StrategyLearnerCache] Error saving replay result: {e}")
            return False
    
    @classmethod
    def get_replay_history(cls, limit: int = 20) -> List[Dict[str, Any]]:
        """Get replay test history."""
        client = get_redis_client()
        if not client:
            return []
        
        try:
            replay_ids = client.lrange(f"{cls.PREFIX}:replay_index", -limit, -1)
            results = []
            for rid in replay_ids:
                key = f"{cls.PREFIX}:replay:{rid}"
                data = client.get(key)
                if data:
                    results.append(json.loads(data))
            return list(reversed(results))  # Most recent first
        except Exception as e:
            print(f"[StrategyLearnerCache] Error retrieving replay history: {e}")
            return []


def test_connection() -> bool:
    """Test Redis connection."""
    client = get_redis_client()
    if not client:
        return False
    
    try:
        client.ping()
        return True
    except Exception:
        return False
