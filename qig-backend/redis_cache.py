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
from typing import Optional, Dict, Any, List, Callable, Set, Union, cast
from queue import Queue, Empty
import redis

REDIS_URL = os.environ.get('REDIS_URL')

CACHE_TTL_SHORT = 300  # 5 min for hot data
CACHE_TTL_MEDIUM = 3600  # 1 hour for session data
CACHE_TTL_LONG = 86400  # 24 hours for learned patterns
CACHE_TTL_PERMANENT = 86400 * 7  # 7 days for critical data

# Key prefixes for namespacing (mirrors TypeScript CACHE_KEYS)
CACHE_KEYS = {
    "TESTED_PHRASE": "tested:",
    "BALANCE_HIT": "hit:",
    "VOCABULARY": "vocab:",
    "KERNEL_STATE": "kernel:",
    "SESSION": "session:",
    "AUTO_CYCLE": "qig:auto-cycle:state",
    "NEAR_MISS": "qig:near-miss:state",
    "OCEAN_MEMORY": "qig:ocean-memory:state",
    "TOKENIZER_STATE": "qig:tokenizer:state",
    "SHADOW_CONTEXT": "qig:shadow:context:",
    "TACKING_STATE": "qig:tacking:state:",
}

# Convenience aliases
CACHE_KEY_TESTED = CACHE_KEYS["TESTED_PHRASE"]
CACHE_KEY_KERNEL = CACHE_KEYS["KERNEL_STATE"]
CACHE_KEY_SESSION = CACHE_KEYS["SESSION"]

RETRY_QUEUE_MAX_SIZE = 1000
RETRY_INTERVAL_SECONDS = 5

# Alert thresholds
QUEUE_SATURATION_THRESHOLD = 0.8  # 80% full = warning
QUEUE_CRITICAL_THRESHOLD = 0.95  # 95% full = critical
OUTAGE_DURATION_WARNING = 60  # 1 min of failures = warning
OUTAGE_DURATION_CRITICAL = 300  # 5 min of failures = critical

_redis_client: Optional[redis.Redis] = None
_write_queue: Queue = Queue(maxsize=RETRY_QUEUE_MAX_SIZE)
_retry_thread: Optional[threading.Thread] = None
_shutdown_flag = threading.Event()

# Metrics tracking
class BufferMetrics:
    """Track buffer health metrics for monitoring and alerting."""
    
    def __init__(self):
        self.total_patterns_buffered = 0
        self.total_retries_attempted = 0
        self.total_retries_succeeded = 0
        self.total_retries_failed = 0
        self.last_successful_sync = time.time()
        self.last_failed_sync: Optional[float] = None
        self.consecutive_failures = 0
        self.peak_queue_size = 0
        self.alerts_triggered: List[Dict[str, Any]] = []
    
    def record_buffer(self):
        self.total_patterns_buffered += 1
    
    def record_retry_attempt(self):
        self.total_retries_attempted += 1
    
    def record_retry_success(self):
        self.total_retries_succeeded += 1
        self.last_successful_sync = time.time()
        self.consecutive_failures = 0
        self._clear_outage_alert()
    
    def record_retry_failure(self):
        self.total_retries_failed += 1
        self.last_failed_sync = time.time()
        self.consecutive_failures += 1
        self._check_outage_alert()
    
    def update_queue_size(self, size: int):
        self.peak_queue_size = max(self.peak_queue_size, size)
        self._check_saturation_alert(size)
    
    def _check_saturation_alert(self, current_size: int):
        ratio = current_size / RETRY_QUEUE_MAX_SIZE
        
        if ratio >= QUEUE_CRITICAL_THRESHOLD:
            self._trigger_alert('queue_critical', 
                f"Queue at {ratio*100:.1f}% capacity ({current_size}/{RETRY_QUEUE_MAX_SIZE})")
        elif ratio >= QUEUE_SATURATION_THRESHOLD:
            self._trigger_alert('queue_warning',
                f"Queue at {ratio*100:.1f}% capacity ({current_size}/{RETRY_QUEUE_MAX_SIZE})")
    
    def _check_outage_alert(self):
        if self.last_failed_sync is None:
            return
        
        outage_duration = time.time() - self.last_successful_sync
        
        if outage_duration >= OUTAGE_DURATION_CRITICAL:
            self._trigger_alert('outage_critical',
                f"PostgreSQL outage: {outage_duration:.0f}s, {self.consecutive_failures} failures")
        elif outage_duration >= OUTAGE_DURATION_WARNING:
            self._trigger_alert('outage_warning',
                f"PostgreSQL degraded: {outage_duration:.0f}s, {self.consecutive_failures} failures")
    
    def _clear_outage_alert(self):
        self.alerts_triggered = [a for a in self.alerts_triggered 
                                  if not a['type'].startswith('outage_')]
    
    def _trigger_alert(self, alert_type: str, message: str):
        existing = next((a for a in self.alerts_triggered if a['type'] == alert_type), None)
        
        if existing:
            existing['message'] = message
            existing['updated_at'] = time.time()
            existing['count'] += 1
        else:
            alert = {
                'type': alert_type,
                'message': message,
                'triggered_at': time.time(),
                'updated_at': time.time(),
                'count': 1
            }
            self.alerts_triggered.append(alert)
            print(f"[RedisBuffer] ALERT: {alert_type} - {message}")
    
    def get_health_status(self) -> Dict[str, Any]:
        queue_size = _write_queue.qsize()
        queue_ratio = queue_size / RETRY_QUEUE_MAX_SIZE
        
        if queue_ratio >= QUEUE_CRITICAL_THRESHOLD or self.consecutive_failures >= 10:
            status = 'critical'
        elif queue_ratio >= QUEUE_SATURATION_THRESHOLD or self.consecutive_failures >= 5:
            status = 'degraded'
        else:
            status = 'healthy'
        
        outage_duration = None
        if self.last_failed_sync and self.last_failed_sync > self.last_successful_sync:
            outage_duration = time.time() - self.last_successful_sync
        
        return {
            'status': status,
            'queue_size': queue_size,
            'queue_max': RETRY_QUEUE_MAX_SIZE,
            'queue_percent': round(queue_ratio * 100, 1),
            'total_buffered': self.total_patterns_buffered,
            'retries_attempted': self.total_retries_attempted,
            'retries_succeeded': self.total_retries_succeeded,
            'retries_failed': self.total_retries_failed,
            'success_rate': round(self.total_retries_succeeded / max(1, self.total_retries_attempted) * 100, 1),
            'consecutive_failures': self.consecutive_failures,
            'peak_queue_size': self.peak_queue_size,
            'last_successful_sync': self.last_successful_sync,
            'outage_duration_seconds': outage_duration,
            'active_alerts': self.alerts_triggered,
        }

_metrics = BufferMetrics()


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
                # Update queue size metrics
                _metrics.update_queue_size(_write_queue.qsize())
                
                item = _write_queue.get(timeout=RETRY_INTERVAL_SECONDS)
                if item is None:
                    continue
                
                persist_fn, args, kwargs, retry_count = item
                _metrics.record_retry_attempt()
                
                try:
                    persist_fn(*args, **kwargs)
                    _metrics.record_retry_success()
                    print(f"[RedisBuffer] Retry succeeded after {retry_count} attempts")
                except Exception as e:
                    _metrics.record_retry_failure()
                    if retry_count < 5:
                        _write_queue.put((persist_fn, args, kwargs, retry_count + 1))
                        print(f"[RedisBuffer] Retry {retry_count + 1} failed: {e}")
                    else:
                        print(f"[RedisBuffer] Giving up after 5 retries: {e}")
            except Empty:
                # Still update metrics even when queue is empty
                _metrics.update_queue_size(_write_queue.qsize())
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
                value = json.dumps(value, default=str)
            elif isinstance(value, bool):
                value = json.dumps(value)
            elif value is None:
                value = "null"
            elif not isinstance(value, str):
                value = str(value)
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
                value_str = cast(Union[str, bytes], value)
                if isinstance(value_str, bytes):
                    value_str = value_str.decode('utf-8')
                return json.loads(value_str)
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
                    _metrics.record_retry_success()
                except Exception as e:
                    _metrics.record_retry_failure()
                    print(f"[ToolPatternBuffer] Direct persist failed: {e}")
            return False
        
        try:
            key = f"{cls.PREFIX}:{pattern_id}"
            pattern_data['buffered_at'] = time.time()
            pattern_data['synced_to_db'] = False
            client.setex(key, CACHE_TTL_PERMANENT, json.dumps(pattern_data))
            client.sadd(f"{cls.PREFIX}:index", pattern_id)
            _metrics.record_buffer()
            
            if persist_fn:
                try:
                    persist_fn(pattern_data)
                    pattern_data['synced_to_db'] = True
                    client.setex(key, CACHE_TTL_PERMANENT, json.dumps(pattern_data))
                    _metrics.record_retry_success()
                except Exception as e:
                    _metrics.record_retry_failure()
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
            pattern_ids: Set[Any] = client.smembers(f"{cls.PREFIX}:index")  # type: ignore[assignment]
            patterns = []
            for pid in pattern_ids:
                pid_str = pid.decode('utf-8') if isinstance(pid, bytes) else str(pid)
                pattern = cls.get_pattern(pid_str)
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
            messages: List[Any] = client.lrange(key, -limit, -1)  # type: ignore[assignment]
            return [json.loads(m.decode('utf-8') if isinstance(m, bytes) else m) for m in messages]
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


class ParentCareBuffer:
    """Buffer for parent gods coordination state."""
    
    PREFIX = "qig:parent_care"
    
    @classmethod
    def cache_kernel_status(cls, kernel_id: str, status_data: Dict[str, Any]) -> bool:
        """Cache kernel care status for fast lookups."""
        return UniversalCache.set(
            f"{cls.PREFIX}:status:{kernel_id}",
            status_data,
            CACHE_TTL_MEDIUM
        )
    
    @classmethod
    def get_kernel_status(cls, kernel_id: str) -> Optional[Dict[str, Any]]:
        """Get cached kernel status."""
        return UniversalCache.get(f"{cls.PREFIX}:status:{kernel_id}")
    
    @classmethod
    def invalidate_kernel(cls, kernel_id: str) -> bool:
        """Invalidate kernel cache on status change."""
        return UniversalCache.delete(f"{cls.PREFIX}:status:{kernel_id}")


class ObservationBuffer:
    """Buffer for observation protocol data."""
    
    PREFIX = "qig:observation"
    
    @classmethod
    def cache_session(cls, kernel_id: str, session_data: Dict[str, Any]) -> bool:
        """Cache active observation session."""
        return UniversalCache.set(
            f"{cls.PREFIX}:session:{kernel_id}",
            session_data,
            CACHE_TTL_MEDIUM
        )
    
    @classmethod
    def get_session(cls, kernel_id: str) -> Optional[Dict[str, Any]]:
        """Get cached observation session."""
        return UniversalCache.get(f"{cls.PREFIX}:session:{kernel_id}")
    
    @classmethod
    def cache_latest_metrics(cls, kernel_id: str, phi: float, kappa: float) -> bool:
        """Cache latest observation metrics for fast access."""
        return UniversalCache.set(
            f"{cls.PREFIX}:metrics:{kernel_id}",
            {'phi': phi, 'kappa': kappa, 'cached_at': time.time()},
            CACHE_TTL_SHORT
        )
    
    @classmethod
    def get_latest_metrics(cls, kernel_id: str) -> Optional[Dict[str, Any]]:
        """Get cached latest metrics."""
        return UniversalCache.get(f"{cls.PREFIX}:metrics:{kernel_id}")


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
            feedback_ids: List[Any] = client.lrange(f"{cls.PREFIX}:feedback_index", -limit, -1)  # type: ignore[assignment]
            feedbacks = []
            for fid in feedback_ids:
                fid_str = fid.decode('utf-8') if isinstance(fid, bytes) else str(fid)
                data = UniversalCache.get(f"{cls.PREFIX}:feedback:{fid_str}")
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
        info: Dict[str, Any] = client.info('memory')  # type: ignore[assignment]
        return {
            'connected': True,
            'used_memory': info.get('used_memory_human', 'unknown'),
            'pending_retries': _write_queue.qsize(),
            'patterns_buffered': client.scard('qig:patterns:index') or 0,
        }
    except Exception as e:
        return {'connected': False, 'error': str(e)}


def get_buffer_health() -> Dict[str, Any]:
    """
    Get comprehensive buffer health status with metrics and alerts.
    Use this for monitoring dashboards and operational alerts.
    """
    client = get_redis_client()
    health = _metrics.get_health_status()
    
    if not client:
        health['redis_connected'] = False
        health['status'] = 'critical'
        health['error'] = 'No Redis connection'
        return health
    
    try:
        info: Dict[str, Any] = client.info('memory')  # type: ignore[assignment]
        health['redis_connected'] = True
        health['redis_memory'] = info.get('used_memory_human', 'unknown')
        health['patterns_in_redis'] = client.scard('qig:patterns:index') or 0
        
        # Check for unsynced patterns
        unsynced = 0
        pattern_ids: Set[Any] = client.smembers('qig:patterns:index') or set()  # type: ignore[assignment]
        for pid in list(pattern_ids)[:500]:  # Sample first 50
            pid_str = pid.decode('utf-8') if isinstance(pid, bytes) else str(pid)
            pattern = UniversalCache.get(f"qig:patterns:{pid_str}")
            if pattern and not pattern.get('synced_to_db', False):
                unsynced += 1
        health['unsynced_patterns_sample'] = unsynced
        
    except Exception as e:
        health['redis_connected'] = False
        health['error'] = str(e)
    
    return health


def clear_alerts():
    """Clear all active alerts (for operational use)."""
    _metrics.alerts_triggered.clear()
    print("[RedisBuffer] Alerts cleared")


class TemporalReasoningBuffer:
    """
    Redis buffer for 4D Temporal Reasoning caching.
    
    Caches foresight visions and scenario trees for fast retrieval
    without hitting PostgreSQL on every request.
    
    QIG Purity: Redis is geometry-agnostic storage, all geometric 
    computations happen in temporal_reasoning.py before data reaches here.
    """
    
    PREFIX = "qig:temporal:"
    VISION_TTL = CACHE_TTL_MEDIUM  # 1 hour for visions
    SCENARIO_TTL = CACHE_TTL_SHORT  # 5 min for scenarios (more volatile)
    
    @staticmethod
    def cache_foresight(
        kernel_id: str,
        vision_data: Dict[str, Any],
    ) -> bool:
        """
        Cache a foresight vision for a kernel.
        
        Args:
            kernel_id: Kernel identifier
            vision_data: Serialized ForesightVision
            
        Returns:
            True if cached successfully
        """
        key = f"{TemporalReasoningBuffer.PREFIX}foresight:{kernel_id}"
        return UniversalCache.set(
            key, 
            vision_data, 
            ttl=TemporalReasoningBuffer.VISION_TTL
        )
    
    @staticmethod
    def get_foresight(kernel_id: str) -> Optional[Dict[str, Any]]:
        """Get cached foresight vision for a kernel."""
        key = f"{TemporalReasoningBuffer.PREFIX}foresight:{kernel_id}"
        return UniversalCache.get(key)
    
    @staticmethod
    def cache_scenario(
        kernel_id: str,
        scenario_data: Dict[str, Any],
    ) -> bool:
        """
        Cache a scenario tree for a kernel.
        
        Args:
            kernel_id: Kernel identifier
            scenario_data: Serialized ScenarioTree
            
        Returns:
            True if cached successfully
        """
        key = f"{TemporalReasoningBuffer.PREFIX}scenario:{kernel_id}"
        return UniversalCache.set(
            key, 
            scenario_data, 
            ttl=TemporalReasoningBuffer.SCENARIO_TTL
        )
    
    @staticmethod
    def get_scenario(kernel_id: str) -> Optional[Dict[str, Any]]:
        """Get cached scenario tree for a kernel."""
        key = f"{TemporalReasoningBuffer.PREFIX}scenario:{kernel_id}"
        return UniversalCache.get(key)
    
    @staticmethod
    def invalidate_kernel(kernel_id: str) -> bool:
        """Invalidate all temporal caches for a kernel."""
        foresight_key = f"{TemporalReasoningBuffer.PREFIX}foresight:{kernel_id}"
        scenario_key = f"{TemporalReasoningBuffer.PREFIX}scenario:{kernel_id}"
        
        success1 = UniversalCache.delete(foresight_key)
        success2 = UniversalCache.delete(scenario_key)
        
        return success1 or success2
    
    @staticmethod
    def get_temporal_stats() -> Dict[str, Any]:
        """Get statistics about temporal caching."""
        client = get_redis_client()
        if not client:
            return {'connected': False}
        
        try:
            pattern = f"{TemporalReasoningBuffer.PREFIX}*"
            keys = list(client.scan_iter(match=pattern, count=100))
            
            foresight_count = sum(1 for k in keys if b'foresight:' in k)
            scenario_count = sum(1 for k in keys if b'scenario:' in k)
            
            return {
                'connected': True,
                'total_cached': len(keys),
                'foresight_count': foresight_count,
                'scenario_count': scenario_count,
            }
        except Exception as e:
            return {'connected': False, 'error': str(e)}
