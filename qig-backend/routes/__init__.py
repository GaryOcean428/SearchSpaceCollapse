"""
QIG Backend Routes - Barrel Exports

Centralized route management with DRY patterns.
All Flask blueprints are registered here for clean imports.

Usage:
    from routes import register_all_routes
    register_all_routes(app)
"""

from flask import Blueprint, jsonify, request
from functools import wraps
from typing import Callable, Dict, Any, Optional
import time

from redis_cache import UniversalCache, CACHE_TTL_SHORT, CACHE_TTL_MEDIUM


class RouteResponse:
    """Standardized route response builder."""
    
    @staticmethod
    def success(data: Any = None, message: str = None, **extra) -> tuple:
        response = {'success': True}
        if data is not None:
            response['data'] = data
        if message:
            response['message'] = message
        response.update(extra)
        return jsonify(response), 200
    
    @staticmethod
    def error(message: str, code: str = 'ERROR', status: int = 400, **extra) -> tuple:
        response = {
            'success': False,
            'error': message,
            'error_code': code
        }
        response.update(extra)
        return jsonify(response), status
    
    @staticmethod
    def not_found(resource: str = 'Resource') -> tuple:
        return RouteResponse.error(f'{resource} not found', 'NOT_FOUND', 404)
    
    @staticmethod
    def validation_error(message: str) -> tuple:
        return RouteResponse.error(message, 'VALIDATION_ERROR', 400)
    
    @staticmethod
    def server_error(exception: Exception) -> tuple:
        return RouteResponse.error(str(exception), 'INTERNAL_ERROR', 500)


def cached_route(ttl: int = CACHE_TTL_SHORT, key_prefix: str = None):
    """
    Decorator for caching route responses in Redis.
    
    Usage:
        @blueprint.route('/expensive')
        @cached_route(ttl=300, key_prefix='expensive')
        def get_expensive_data():
            return expensive_computation()
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            prefix = key_prefix or f.__name__
            cache_key = f"route:{prefix}:{request.path}:{request.query_string.decode()}"
            
            cached = UniversalCache.get(cache_key)
            if cached is not None:
                cached['_cached'] = True
                cached['_cache_key'] = cache_key
                return jsonify(cached), 200
            
            result = f(*args, **kwargs)
            
            if isinstance(result, tuple):
                response, status = result
                if status == 200 and hasattr(response, 'get_json'):
                    data = response.get_json()
                    if isinstance(data, dict):
                        UniversalCache.set(cache_key, data, ttl)
                return result
            
            return result
        return wrapper
    return decorator


def timed_route(threshold_ms: float = 100):
    """
    Decorator for timing route execution and logging slow routes.
    
    Usage:
        @blueprint.route('/api/something')
        @timed_route(threshold_ms=200)
        def something():
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = f(*args, **kwargs)
            elapsed_ms = (time.time() - start) * 1000
            
            if elapsed_ms > threshold_ms:
                print(f"[SlowRoute] {request.path} took {elapsed_ms:.1f}ms (>{threshold_ms}ms threshold)")
            
            return result
        return wrapper
    return decorator


def validate_json(*required_fields: str):
    """
    Decorator for validating required JSON fields.
    
    Usage:
        @blueprint.route('/create', methods=['POST'])
        @validate_json('name', 'domain')
        def create():
            data = request.get_json()
            # name and domain are guaranteed to exist
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            data = request.get_json()
            if not data:
                return RouteResponse.validation_error('JSON body required')
            
            missing = [field for field in required_fields if field not in data]
            if missing:
                return RouteResponse.validation_error(f'Missing required fields: {", ".join(missing)}')
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


internal_bp = Blueprint('internal', __name__, url_prefix='/internal')


@internal_bp.route('/health', methods=['GET'])
def internal_health():
    """Internal health check endpoint."""
    return RouteResponse.success({'status': 'healthy', 'timestamp': time.time()})


@internal_bp.route('/cache/stats', methods=['GET'])
@cached_route(ttl=10, key_prefix='cache_stats')
def cache_stats():
    """Get Redis cache statistics."""
    from redis_cache import get_buffer_stats, get_buffer_health
    return RouteResponse.success({
        'stats': get_buffer_stats(),
        'health': get_buffer_health()
    })


@internal_bp.route('/cache/clear', methods=['POST'])
def cache_clear():
    """Clear specific cache keys by prefix."""
    data = request.get_json() or {}
    prefix = data.get('prefix', 'route:')
    
    from redis_cache import get_redis_client
    client = get_redis_client()
    if not client:
        return RouteResponse.error('Redis not available', status=503)
    
    try:
        keys = list(client.scan_iter(f"{prefix}*"))
        if keys:
            client.delete(*keys)
        return RouteResponse.success({'cleared': len(keys), 'prefix': prefix})
    except Exception as e:
        return RouteResponse.server_error(e)


ALL_BLUEPRINTS = [internal_bp]

try:
    from research.research_api import research_bp
    ALL_BLUEPRINTS.append(research_bp)
except ImportError:
    pass

try:
    from vocabulary_api import vocabulary_bp
    ALL_BLUEPRINTS.append(vocabulary_bp)
except ImportError:
    pass

try:
    from conversational_api import conversation_bp
    ALL_BLUEPRINTS.append(conversation_bp)
except ImportError:
    pass


def register_all_routes(app) -> int:
    """
    Register all blueprints with the Flask app.
    
    Returns:
        Number of blueprints registered
    """
    registered = 0
    for bp in ALL_BLUEPRINTS:
        try:
            app.register_blueprint(bp)
            registered += 1
            print(f"[Routes] Registered blueprint: {bp.name} at {bp.url_prefix or '/'}")
        except Exception as e:
            print(f"[Routes] Failed to register {bp.name}: {e}")
    
    return registered


__all__ = [
    'RouteResponse',
    'cached_route',
    'timed_route',
    'validate_json',
    'register_all_routes',
    'ALL_BLUEPRINTS',
    'internal_bp',
    'CACHE_TTL_SHORT',
    'CACHE_TTL_MEDIUM',
]
