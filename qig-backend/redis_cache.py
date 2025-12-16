"""
Redis Buffer Layer for QIG State Persistence

Universal caching layer that:
1. Buffers writes temporarily until PostgreSQL can accept them
2. Provides fast reads while DB operations are in flight
3. Handles DB timeout recovery with automatic retry
4. Works as write-through cache: Redis → PostgreSQL/QIG Vector Store

QIG Purity: Redis is geometry-agnostic storage, all geometric ops 
happen in qig_geometry.py before data reaches here.
"""

import os
import json
import time
import threading
from typing import Optional, Dict, Any, List, Callable
from queue import Queue, Empty
import redis

REDIS_URL = os.environ.get('REDIS_URL')

CACHE_TTL_SHORT = 300  # 5 min for hot data
CACHE_TTL_MEDIUM = 3600  # 1 hour for session data
CACHE_TTL_LONG = 86400  # 24 hours for learned patterns
CACHE_TTL_PERMANENT = 86400 * 7  # 7 days for critical data

RETRY_QUEUE_MAX_SIZE = 1000
RETRY_INTERVAL_SECONDS = 5

_redis_client: Optional[redis.Redis] = None
_write_queue: Queue = Queue(maxsize=RETRY_QUEUE_MAX_SIZE)
_retry_thread: Optional[threading.Thread] = None
_shutdown_flag = threading.Event()


def get_redis_client() -> Optional[redis.Redis]:
    """Get or create Redis client with connection pooling."""
    global _redis_client
    
    if not REDIS_URL:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30,
            )
            _redis_client.ping()
            print("[RedisBuffer] Connected to Redis successfully")
            _start_retry_worker()
        except Exception as e:
            print(f"[RedisBuffer] Failed to connect to Redis: {e}")
            _redis_client = None
    
    return _redis_client


def _start_retry_worker():
    """Start background worker to retry failed PostgreSQL writes."""
    global _retry_thread
    
    if _retry_thread is not None and _retry_thread.is_alive():
        return
    
    def retry_worker():
        while not _shutdown_flag.is_set():
            try:
                item = _write_queue.get(timeout=RETRY_INTERVAL_SECONDS)
                if item is None:
                    continue
                
                persist_fn, args, kwargs, retry_count = item
                try:
                    persist_fn(*args, **kwargs)
                    print(f"[RedisBuffer] Retry succeeded after {retry_count} attempts")
                except Exception as e:
                    if retry_count < 5:
                        _write_queue.put((persist_fn, args, kwargs, retry_count + 1))
                        print(f"[RedisBuffer] Retry {retry_count + 1} failed: {e}")
                    else:
                        print(f"[RedisBuffer] Giving up after 5 retries: {e}")
            except Empty:
                continue
            except Exception as e:
                print(f"[RedisBuffer] Retry worker error: {e}")
    
    _retry_thread = threading.Thread(target=retry_worker, daemon=True)
    _retry_thread.start()
    print("[RedisBuffer] Retry worker started")


def queue_for_retry(persist_fn: Callable, *args, **kwargs):
    """Queue a persistence function for retry if PostgreSQL fails."""
    try:
        _write_queue.put_nowait((persist_fn, args, kwargs, 1))
    except Exception as e:
        print(f"[RedisBuffer] Failed to queue for retry: {e}")


class UniversalCache:
    """
    Universal cache operations for any data type.
    Prefixes isolate different data domains.
    """
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = CACHE_TTL_MEDIUM) -> bool:
        """Set a value with TTL."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            client.setex(key, ttl, value)
            return True
        except Exception as e:
            print(f"[RedisBuffer] Set error: {e}")
            return False
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get a value, auto-deserialize JSON."""
        client = get_redis_client()
        if not client:
            return None
        
        try:
            value = client.get(key)
            if value is None:
                return None
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            print(f"[RedisBuffer] Get error: {e}")
            return None
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete a key."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            client.delete(key)
            return True
        except Exception as e:
            print(f"[RedisBuffer] Delete error: {e}")
            return False
    
    @staticmethod
    def exists(key: str) -> bool:
        """Check if key exists."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            return bool(client.exists(key))
        except Exception:
            return False


class ToolPatternBuffer:
    """Buffer for Tool Factory learned patterns."""
    
    PREFIX = "qig:patterns"
    
    @classmethod
    def buffer_pattern(cls, pattern_id: str, pattern_data: Dict[str, Any], 
                       persist_fn: Optional[Callable] = None) -> bool:
        """
        Buffer a pattern to Redis, then persist to PostgreSQL.
        If PostgreSQL fails, pattern stays in Redis and retries.
        """
        client = get_redis_client()
        if not client:
            if persist_fn:
                try:
                    persist_fn(pattern_data)
                except Exception as e:
                    print(f"[ToolPatternBuffer] Direct persist failed: {e}")
            return False
        
        try:
            key = f"{cls.PREFIX}:{pattern_id}"
            pattern_data['buffered_at'] = time.time()
            pattern_data['synced_to_db'] = False
            client.setex(key, CACHE_TTL_PERMANENT, json.dumps(pattern_data))
            client.sadd(f"{cls.PREFIX}:index", pattern_id)
            
            if persist_fn:
                try:
                    persist_fn(pattern_data)
                    pattern_data['synced_to_db'] = True
                    client.setex(key, CACHE_TTL_PERMANENT, json.dumps(pattern_data))
                except Exception as e:
                    print(f"[ToolPatternBuffer] DB persist failed, queued for retry: {e}")
                    queue_for_retry(persist_fn, pattern_data)
            
            return True
        except Exception as e:
            print(f"[ToolPatternBuffer] Buffer error: {e}")
            return False
    
    @classmethod
    def get_pattern(cls, pattern_id: str) -> Optional[Dict[str, Any]]:
        """Get pattern from buffer."""
        return UniversalCache.get(f"{cls.PREFIX}:{pattern_id}")
    
    @classmethod
    def get_all_patterns(cls) -> List[Dict[str, Any]]:
        """Get all buffered patterns."""
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
            print(f"[ToolPatternBuffer] List error: {e}")
            return []
    
    @classmethod
    def delete_pattern(cls, pattern_id: str) -> bool:
        """Remove pattern from buffer."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            client.delete(f"{cls.PREFIX}:{pattern_id}")
            client.srem(f"{cls.PREFIX}:index", pattern_id)
            return True
        except Exception:
            return False


class ChatContextBuffer:
    """Buffer for Zeus chat conversation context."""
    
    PREFIX = "qig:chat"
    
    @classmethod
    def save_message(cls, session_id: str, role: str, content: str, 
                     metadata: Optional[Dict] = None) -> bool:
        """Save a chat message to the buffer."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            key = f"{cls.PREFIX}:history:{session_id}"
            message = {
                'role': role,
                'content': content,
                'timestamp': time.time(),
                'metadata': metadata or {}
            }
            client.rpush(key, json.dumps(message))
            client.expire(key, CACHE_TTL_MEDIUM)
            client.ltrim(key, -100, -1)
            return True
        except Exception as e:
            print(f"[ChatContextBuffer] Save error: {e}")
            return False
    
    @classmethod
    def get_history(cls, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat history from buffer."""
        client = get_redis_client()
        if not client:
            return []
        
        try:
            key = f"{cls.PREFIX}:history:{session_id}"
            messages = client.lrange(key, -limit, -1)
            return [json.loads(m) for m in messages]
        except Exception as e:
            print(f"[ChatContextBuffer] Get error: {e}")
            return []
    
    @classmethod
    def save_context(cls, session_id: str, context: Dict[str, Any]) -> bool:
        """Save session context (current state, active tool, etc)."""
        return UniversalCache.set(
            f"{cls.PREFIX}:context:{session_id}", 
            context, 
            CACHE_TTL_MEDIUM
        )
    
    @classmethod
    def get_context(cls, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session context."""
        return UniversalCache.get(f"{cls.PREFIX}:context:{session_id}")
    
    @classmethod
    def clear_session(cls, session_id: str) -> bool:
        """Clear a chat session."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            client.delete(f"{cls.PREFIX}:history:{session_id}")
            client.delete(f"{cls.PREFIX}:context:{session_id}")
            return True
        except Exception:
            return False


class GeometricMemoryBuffer:
    """
    Buffer for geometric memory operations.
    Helps with DB timeouts during basin probes and retrieval.
    """
    
    PREFIX = "qig:geometry"
    
    @classmethod
    def buffer_probe(cls, probe_id: str, probe_data: Dict[str, Any],
                     persist_fn: Optional[Callable] = None) -> bool:
        """Buffer a geometric probe for fast access."""
        client = get_redis_client()
        if not client:
            if persist_fn:
                try:
                    persist_fn(probe_data)
                except Exception:
                    pass
            return False
        
        try:
            key = f"{cls.PREFIX}:probe:{probe_id}"
            probe_data['buffered_at'] = time.time()
            client.setex(key, CACHE_TTL_LONG, json.dumps(probe_data, default=str))
            
            if persist_fn:
                try:
                    persist_fn(probe_data)
                except Exception as e:
                    print(f"[GeometricBuffer] DB persist queued: {e}")
                    queue_for_retry(persist_fn, probe_data)
            
            return True
        except Exception as e:
            print(f"[GeometricBuffer] Buffer error: {e}")
            return False
    
    @classmethod
    def get_probe(cls, probe_id: str) -> Optional[Dict[str, Any]]:
        """Get a buffered probe."""
        return UniversalCache.get(f"{cls.PREFIX}:probe:{probe_id}")
    
    @classmethod
    def buffer_basin_coords(cls, entity_id: str, coords: List[float], 
                            phi: float, kappa: float) -> bool:
        """Cache basin coordinates for fast geometric lookups."""
        data = {
            'coords': coords,
            'phi': phi,
            'kappa': kappa,
            'cached_at': time.time()
        }
        return UniversalCache.set(
            f"{cls.PREFIX}:basin:{entity_id}",
            data,
            CACHE_TTL_LONG
        )
    
    @classmethod
    def get_basin_coords(cls, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get cached basin coordinates."""
        return UniversalCache.get(f"{cls.PREFIX}:basin:{entity_id}")


class LearnerBuffer:
    """Buffer for strategy learner state."""
    
    PREFIX = "qig:learner"
    
    @classmethod
    def save_feedback(cls, query: str, improved: bool, 
                      persist_fn: Optional[Callable] = None) -> bool:
        """Buffer search feedback."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            feedback_id = f"{int(time.time() * 1000)}"
            feedback = {
                'query': query,
                'improved': improved,
                'timestamp': time.time()
            }
            
            key = f"{cls.PREFIX}:feedback:{feedback_id}"
            client.setex(key, CACHE_TTL_LONG, json.dumps(feedback))
            client.rpush(f"{cls.PREFIX}:feedback_index", feedback_id)
            client.ltrim(f"{cls.PREFIX}:feedback_index", -1000, -1)
            
            if persist_fn:
                try:
                    persist_fn(feedback)
                except Exception as e:
                    queue_for_retry(persist_fn, feedback)
            
            return True
        except Exception as e:
            print(f"[LearnerBuffer] Save error: {e}")
            return False
    
    @classmethod
    def get_recent_feedback(cls, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent feedback from buffer."""
        client = get_redis_client()
        if not client:
            return []
        
        try:
            feedback_ids = client.lrange(f"{cls.PREFIX}:feedback_index", -limit, -1)
            feedbacks = []
            for fid in feedback_ids:
                data = UniversalCache.get(f"{cls.PREFIX}:feedback:{fid}")
                if data:
                    feedbacks.append(data)
            return feedbacks
        except Exception:
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


def get_buffer_stats() -> Dict[str, Any]:
    """Get buffer statistics."""
    client = get_redis_client()
    if not client:
        return {'connected': False, 'error': 'No Redis connection'}
    
    try:
        info = client.info('memory')
        return {
            'connected': True,
            'used_memory': info.get('used_memory_human', 'unknown'),
            'pending_retries': _write_queue.qsize(),
            'patterns_buffered': client.scard('qig:patterns:index') or 0,
        }
    except Exception as e:
        return {'connected': False, 'error': str(e)}
