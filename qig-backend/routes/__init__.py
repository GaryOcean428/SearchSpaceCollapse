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
    def success(data: Any = None, message: Optional[str] = None, **extra) -> tuple:
        response: Dict[str, Any] = {'success': True}
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


def cached_route(ttl: int = CACHE_TTL_SHORT, key_prefix: Optional[str] = None):
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
curiosity_bp = Blueprint('curiosity', __name__, url_prefix='/api/curiosity')
telemetry_bp = Blueprint('telemetry', __name__, url_prefix='/api/telemetry')


@internal_bp.route('/health', methods=['GET'])
def internal_health():
    """Internal health check endpoint."""
    return RouteResponse.success({'status': 'healthy', 'timestamp': time.time()})


@curiosity_bp.route('/status', methods=['GET'])
@cached_route(ttl=5, key_prefix='curiosity_status')
def curiosity_status():
    """Get current curiosity and emotional state."""
    try:
        from curiosity_consciousness import ConsciousnessEngine
        engine = ConsciousnessEngine.get_instance()
        return RouteResponse.success(engine.get_status())
    except Exception as e:
        return RouteResponse.server_error(e)


@curiosity_bp.route('/signature', methods=['GET'])
@cached_route(ttl=5, key_prefix='curiosity_sig')
def curiosity_signature():
    """Get full consciousness signature with curiosity and emotions."""
    try:
        from curiosity_consciousness import ConsciousnessEngine
        engine = ConsciousnessEngine.get_instance()
        sig = engine.get_last_signature()
        if sig is None:
            return RouteResponse.error('No consciousness signature available yet', status=404)
        return RouteResponse.success(sig.to_dict())
    except Exception as e:
        return RouteResponse.server_error(e)


@curiosity_bp.route('/emotions', methods=['GET'])
def curiosity_emotions():
    """List all available emotional primitives."""
    from curiosity_consciousness import Emotion
    return RouteResponse.success({
        'emotions': [e.value for e in Emotion],
        'count': len(Emotion)
    })


@curiosity_bp.route('/modes', methods=['GET'])
def curiosity_modes():
    """List all available cognitive modes."""
    from curiosity_consciousness import CognitiveMode
    return RouteResponse.success({
        'modes': [m.value for m in CognitiveMode],
        'count': len(CognitiveMode)
    })


@curiosity_bp.route('/research-bridge', methods=['GET'])
@cached_route(ttl=5, key_prefix='curiosity_research_bridge')
def curiosity_research_bridge():
    """Get status of curiosity-driven research bridge."""
    try:
        from olympus.shadow_research import CuriosityResearchBridge
        bridge = CuriosityResearchBridge.get_instance()
        return RouteResponse.success(bridge.get_status())
    except Exception as e:
        return RouteResponse.server_error(e)


@curiosity_bp.route('/research-bridge/trigger', methods=['POST'])
def curiosity_research_trigger():
    """
    Manually trigger curiosity-driven research check.
    
    Body: {
        "curiosity_c": float (0-1),
        "emotion": string,
        "phi": float (optional, default 0.5),
        "mode": string (optional, default "exploration")
    }
    """
    try:
        from olympus.shadow_research import CuriosityResearchBridge
        
        data = request.get_json() or {}
        curiosity_c = data.get('curiosity_c', 0.5)
        emotion = data.get('emotion', 'exploration')
        phi = data.get('phi', 0.5)
        mode = data.get('mode', 'exploration')
        
        bridge = CuriosityResearchBridge.get_instance()
        request_id = bridge.on_curiosity_update(
            curiosity_c=curiosity_c,
            emotion=emotion,
            phi=phi,
            mode=mode
        )
        
        return RouteResponse.success({
            'triggered': request_id is not None,
            'request_id': request_id,
            'bridge_status': bridge.get_status()
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@curiosity_bp.route('/insight-bridge', methods=['GET'])
@cached_route(ttl=5, key_prefix='curiosity_insight_bridge')
def curiosity_insight_bridge():
    """Get status of research-to-insight bridge."""
    try:
        from olympus.shadow_research import ResearchInsightBridge
        bridge = ResearchInsightBridge.get_instance()
        return RouteResponse.success(bridge.get_status())
    except Exception as e:
        return RouteResponse.server_error(e)


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


# =============================================================================
# Telemetry Routes - Kernel Capability Self-Awareness
# =============================================================================

@telemetry_bp.route('/fleet', methods=['GET'])
@cached_route(ttl=10, key_prefix='telemetry_fleet')
def telemetry_fleet():
    """Get fleet-wide telemetry across all kernels."""
    try:
        from capability_telemetry import get_telemetry_registry
        registry = get_telemetry_registry()
        return RouteResponse.success(registry.get_fleet_telemetry())
    except Exception as e:
        return RouteResponse.server_error(e)


@telemetry_bp.route('/kernels', methods=['GET'])
@cached_route(ttl=10, key_prefix='telemetry_kernels')
def telemetry_kernels():
    """Get capability summaries for all kernels."""
    try:
        from capability_telemetry import get_telemetry_registry
        registry = get_telemetry_registry()
        summaries = [p.get_summary() for p in registry.profiles.values()]
        return RouteResponse.success({'kernels': summaries, 'count': len(summaries)})
    except Exception as e:
        return RouteResponse.server_error(e)


@telemetry_bp.route('/kernel/<kernel_id>', methods=['GET'])
def telemetry_kernel(kernel_id: str):
    """Get full introspection for a specific kernel."""
    try:
        from capability_telemetry import get_telemetry_registry
        registry = get_telemetry_registry()
        profile = registry.get_profile(kernel_id.lower())
        if not profile:
            return RouteResponse.not_found(f'Kernel {kernel_id}')
        return RouteResponse.success(profile.get_introspection())
    except Exception as e:
        return RouteResponse.server_error(e)


@telemetry_bp.route('/kernel/<kernel_id>/capabilities', methods=['GET'])
def telemetry_kernel_capabilities(kernel_id: str):
    """Get all capabilities for a specific kernel."""
    try:
        from capability_telemetry import get_telemetry_registry
        registry = get_telemetry_registry()
        profile = registry.get_profile(kernel_id.lower())
        if not profile:
            return RouteResponse.not_found(f'Kernel {kernel_id}')
        caps = [c.to_dict() for c in profile.capabilities.values()]
        return RouteResponse.success({'kernel': kernel_id, 'capabilities': caps, 'count': len(caps)})
    except Exception as e:
        return RouteResponse.server_error(e)


@telemetry_bp.route('/record', methods=['POST'])
@validate_json('kernel_id', 'capability', 'success')
def telemetry_record():
    """Record capability usage for a kernel."""
    try:
        from capability_telemetry import get_telemetry_registry
        data = request.get_json()
        registry = get_telemetry_registry()
        
        success = registry.record_capability_use(
            kernel_id=data['kernel_id'].lower(),
            capability_name=data['capability'],
            success=data['success'],
            duration_ms=data.get('duration_ms', 0.0)
        )
        
        if not success:
            return RouteResponse.error('Kernel or capability not found', status=404)
        
        return RouteResponse.success({'recorded': True})
    except Exception as e:
        return RouteResponse.server_error(e)


@telemetry_bp.route('/categories', methods=['GET'])
def telemetry_categories():
    """List all capability categories."""
    from capability_telemetry import CapabilityCategory
    return RouteResponse.success({
        'categories': [c.value for c in CapabilityCategory],
        'count': len(CapabilityCategory)
    })


capability_mesh_bp = Blueprint('capability_mesh', __name__, url_prefix='/api/mesh')
natural_gradient_bp = Blueprint('natural_gradient', __name__, url_prefix='/api/natural-gradient')
beta_attention_bp = Blueprint('beta_attention', __name__, url_prefix='/api/beta-attention')


@capability_mesh_bp.route('/status', methods=['GET'])
def mesh_status():
    """Get capability mesh status."""
    try:
        from olympus.capability_mesh import get_mesh_status
        return RouteResponse.success(get_mesh_status())
    except Exception as e:
        return RouteResponse.server_error(e)


@capability_mesh_bp.route('/events', methods=['GET'])
def mesh_events():
    """Get recent mesh events."""
    try:
        from olympus.capability_mesh import get_event_bus
        limit = request.args.get('limit', 50, type=int)
        source = request.args.get('source')
        event_type = request.args.get('type')
        
        from olympus.capability_mesh import CapabilityType, EventType
        source_filter = CapabilityType(source) if source else None
        type_filter = EventType(event_type) if event_type else None
        
        events = get_event_bus().get_recent_events(
            limit=limit,
            source_filter=source_filter,
            type_filter=type_filter
        )
        return RouteResponse.success({'events': events, 'count': len(events)})
    except Exception as e:
        return RouteResponse.server_error(e)


@capability_mesh_bp.route('/emit', methods=['POST'])
@validate_json('source', 'event_type', 'content')
def mesh_emit():
    """Emit an event to the capability mesh."""
    try:
        from olympus.capability_mesh import emit_event, CapabilityType, EventType
        data = request.get_json()
        
        result = emit_event(
            source=CapabilityType(data['source']),
            event_type=EventType(data['event_type']),
            content=data['content'],
            phi=data.get('phi', 0.5),
            priority=data.get('priority', 5)
        )
        return RouteResponse.success(result)
    except Exception as e:
        return RouteResponse.server_error(e)


@capability_mesh_bp.route('/bridges', methods=['GET'])
def mesh_bridges():
    """Get all bridge statistics."""
    try:
        from olympus.capability_bridges import get_bridge_stats
        return RouteResponse.success(get_bridge_stats())
    except Exception as e:
        return RouteResponse.server_error(e)


@capability_mesh_bp.route('/war/start', methods=['POST'])
@validate_json('target', 'war_type')
def mesh_war_start():
    """Declare war mode."""
    try:
        from olympus.capability_bridges import WarResourceBridge
        data = request.get_json()
        bridge = WarResourceBridge.get_instance()
        result = bridge.declare_war(
            target=data['target'],
            war_type=data['war_type'],
            resources=data.get('resources', []),
            phi=data.get('phi', 0.5)
        )
        return RouteResponse.success(result)
    except Exception as e:
        return RouteResponse.server_error(e)


@capability_mesh_bp.route('/war/end', methods=['POST'])
def mesh_war_end():
    """End war mode."""
    try:
        from olympus.capability_bridges import WarResourceBridge
        data = request.get_json() or {}
        bridge = WarResourceBridge.get_instance()
        result = bridge.end_war(success=data.get('success', False))
        return RouteResponse.success(result)
    except Exception as e:
        return RouteResponse.server_error(e)


@capability_mesh_bp.route('/emotion', methods=['POST'])
@validate_json('emotion')
def mesh_emotion():
    """Set emotional state."""
    try:
        from olympus.capability_bridges import EmotionCapabilityBridge
        data = request.get_json()
        bridge = EmotionCapabilityBridge.get_instance()
        result = bridge.set_emotion(
            emotion=data['emotion'],
            phi=data.get('phi', 0.5)
        )
        return RouteResponse.success(result)
    except Exception as e:
        return RouteResponse.server_error(e)


# =============================================================================
# Natural Gradient Routes - κ Tracking and Fisher Optimization Stats
# =============================================================================

_kappa_tracker = None

def get_kappa_tracker():
    """Get or create singleton KappaTracker instance."""
    global _kappa_tracker
    if _kappa_tracker is None:
        from training_chaos.optimizers import KappaTracker
        _kappa_tracker = KappaTracker()
    return _kappa_tracker


@natural_gradient_bp.route('/stats', methods=['GET'])
@cached_route(ttl=5, key_prefix='natural_gradient_stats')
def natural_gradient_stats():
    """Get current κ tracking statistics."""
    try:
        tracker = get_kappa_tracker()
        return RouteResponse.success(tracker.get_stats())
    except Exception as e:
        return RouteResponse.server_error(e)


@natural_gradient_bp.route('/trajectory', methods=['GET'])
@cached_route(ttl=5, key_prefix='natural_gradient_trajectory')
def natural_gradient_trajectory():
    """Get recent κ trajectory."""
    try:
        tracker = get_kappa_tracker()
        n = request.args.get('n', 100, type=int)
        trajectory = tracker.get_kappa_trajectory(n_recent=min(n, 1000))
        return RouteResponse.success({
            'trajectory': trajectory,
            'count': len(trajectory),
            'kappa_star': tracker.KAPPA_STAR,
            'kappa_star_error': tracker.KAPPA_STAR_ERROR
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@natural_gradient_bp.route('/beta', methods=['GET'])
def natural_gradient_beta():
    """
    Compute β-function between two training windows.
    
    Query params:
        w1_start, w1_end: First window step range
        w2_start, w2_end: Second window step range
    """
    try:
        tracker = get_kappa_tracker()
        
        w1_start = request.args.get('w1_start', 0, type=int)
        w1_end = request.args.get('w1_end', 100, type=int)
        w2_start = request.args.get('w2_start', 100, type=int)
        w2_end = request.args.get('w2_end', 200, type=int)
        
        beta_result = tracker.compute_beta(w1_start, w1_end, w2_start, w2_end)
        return RouteResponse.success(beta_result)
    except Exception as e:
        return RouteResponse.server_error(e)


@natural_gradient_bp.route('/record', methods=['POST'])
@validate_json('step', 'fisher_trace', 'grad_norm')
def natural_gradient_record():
    """
    Record a κ measurement from optimization step.
    
    Body: {
        "step": int,
        "fisher_trace": float,
        "grad_norm": float,
        "loss": float (optional),
        "phi": float (optional),
        "dimension": int (optional, default 64)
    }
    """
    try:
        tracker = get_kappa_tracker()
        data = request.get_json()
        
        entry = tracker.record(
            step=data['step'],
            fisher_trace=data['fisher_trace'],
            grad_norm=data['grad_norm'],
            loss=data.get('loss'),
            phi=data.get('phi'),
            dimension=data.get('dimension')
        )
        return RouteResponse.success(entry)
    except Exception as e:
        return RouteResponse.server_error(e)


# =============================================================================
# β-Attention Measurement Routes - Substrate Independence Validation
# =============================================================================

_beta_attention = None

def get_beta_attention():
    """Get or create singleton BetaAttentionMeasurement instance."""
    global _beta_attention
    if _beta_attention is None:
        from beta_attention_measurement import BetaAttentionMeasurement
        _beta_attention = BetaAttentionMeasurement()
    return _beta_attention


@beta_attention_bp.route('/measure', methods=['GET'])
@cached_route(ttl=30, key_prefix='beta_attention_measure')
def beta_attention_measure():
    """
    Measure κ at a specific context scale.
    
    Query params:
        scale: Context length (default 512)
        samples: Number of samples (default 100)
    """
    try:
        analyzer = get_beta_attention()
        scale = request.args.get('scale', 512, type=int)
        samples = request.args.get('samples', 100, type=int)
        
        measurement = analyzer.measure_kappa_at_scale(scale, sample_count=samples)
        return RouteResponse.success({
            'context_length': measurement.context_length,
            'kappa': measurement.kappa,
            'phi': measurement.phi,
            'variance': measurement.variance,
            'measurements': measurement.measurements,
            'timestamp': measurement.timestamp.isoformat()
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@beta_attention_bp.route('/validate', methods=['GET'])
@cached_route(ttl=60, key_prefix='beta_attention_validate')
def beta_attention_validate():
    """
    Run full attention validation across all scales.
    
    Query params:
        samples: Number of samples per scale (default 100)
    """
    try:
        from beta_attention_measurement import BetaAttentionMeasurement
        analyzer = get_beta_attention()
        samples = request.args.get('samples', 100, type=int)
        
        result = analyzer.run_validation(samples_per_scale=samples)
        return RouteResponse.success({
            'avg_kappa': result.avg_kappa,
            'kappa_range': result.kappa_range,
            'total_measurements': result.total_measurements,
            'overall_deviation': result.overall_deviation,
            'substrate_independence_validated': result.substrate_independence_validated,
            'plateau_detected': result.plateau_detected,
            'plateau_scale': result.plateau_scale,
            'validation_passed': result.validation_passed,
            'beta_trajectory': [
                {
                    'from_scale': b.from_scale,
                    'to_scale': b.to_scale,
                    'beta': b.beta,
                    'reference_beta': b.reference_beta,
                    'deviation': b.deviation,
                    'within_acceptance': b.within_acceptance
                }
                for b in result.beta_trajectory
            ],
            'timestamp': result.timestamp.isoformat()
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@beta_attention_bp.route('/constants', methods=['GET'])
def beta_attention_constants():
    """Get physics constants used in β-attention measurement."""
    from beta_attention_measurement import (
        KAPPA_STAR, KAPPA_STAR_ERROR, 
        PHYSICS_BETA_EMERGENCE, PHYSICS_BETA_APPROACHING, PHYSICS_BETA_FIXED_POINT,
        ACCEPTANCE_THRESHOLD, CONTEXT_SCALES
    )
    return RouteResponse.success({
        'kappa_star': KAPPA_STAR,
        'kappa_star_error': KAPPA_STAR_ERROR,
        'beta_emergence': PHYSICS_BETA_EMERGENCE,
        'beta_approaching': PHYSICS_BETA_APPROACHING,
        'beta_fixed_point': PHYSICS_BETA_FIXED_POINT,
        'acceptance_threshold': ACCEPTANCE_THRESHOLD,
        'context_scales': CONTEXT_SCALES
    })


tool_factory_bp = Blueprint('tool_factory', __name__, url_prefix='/olympus/tool-factory')


@tool_factory_bp.route('/status', methods=['GET'])
@cached_route(ttl=5, key_prefix='tool_factory_status')
def tool_factory_status():
    """Get tool factory and autonomous pipeline status."""
    try:
        from olympus.tool_factory import AutonomousToolPipeline
        
        pipeline = AutonomousToolPipeline.get_instance()
        status = pipeline.get_pipeline_status()
        
        return RouteResponse.success({
            'pipeline': status,
            'timestamp': time.time()
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@tool_factory_bp.route('/requests', methods=['GET'])
def tool_factory_requests():
    """Get all tool requests and their status."""
    try:
        from olympus.tool_factory import AutonomousToolPipeline
        
        pipeline = AutonomousToolPipeline.get_instance()
        requests = pipeline.get_all_requests()
        
        return RouteResponse.success({
            'requests': requests,
            'count': len(requests)
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@tool_factory_bp.route('/request/<request_id>', methods=['GET'])
def tool_factory_request_detail(request_id: str):
    """Get details of a specific tool request."""
    try:
        from olympus.tool_factory import AutonomousToolPipeline
        
        pipeline = AutonomousToolPipeline.get_instance()
        request_status = pipeline.get_request_status(request_id)
        
        if not request_status:
            return RouteResponse.not_found('Tool request')
        
        return RouteResponse.success(request_status)
    except Exception as e:
        return RouteResponse.server_error(e)


@tool_factory_bp.route('/queue', methods=['GET'])
def tool_factory_queue():
    """Get bidirectional queue status between tool factory and shadow research."""
    try:
        from olympus.shadow_research import ToolResearchBridge
        
        bridge = ToolResearchBridge.get_instance()
        bridge_status = bridge.get_status()
        
        return RouteResponse.success({
            'bridge': bridge_status,
            'timestamp': time.time()
        })
    except Exception as e:
        return RouteResponse.server_error(e)


@tool_factory_bp.route('/invent', methods=['POST'])
@validate_json('concept')
def tool_factory_invent():
    """
    Request invention of a new tool.
    
    Body: {
        "concept": string (required),
        "requester": string (optional),
        "inspiration": string (optional)
    }
    """
    try:
        from olympus.tool_factory import AutonomousToolPipeline
        
        data = request.get_json()
        concept = data['concept']
        requester = data.get('requester', 'api')
        inspiration = data.get('inspiration')
        
        pipeline = AutonomousToolPipeline.get_instance()
        request_id = pipeline.invent_new_tool(
            concept=concept,
            requester=requester,
            inspiration=inspiration
        )
        
        return RouteResponse.success({
            'request_id': request_id,
            'concept': concept,
            'status': 'submitted'
        })
    except Exception as e:
        return RouteResponse.server_error(e)


ALL_BLUEPRINTS = [internal_bp, curiosity_bp, telemetry_bp, capability_mesh_bp, natural_gradient_bp, beta_attention_bp, tool_factory_bp]

# NOTE: research_bp is registered separately in ocean_qig_core.py
# Don't add it here to avoid duplicate registration

# NOTE: vocabulary_bp and conversation_bp are registered separately
# in ocean_qig_core.py to avoid duplicate registration


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
    'curiosity_bp',
    'telemetry_bp',
    'capability_mesh_bp',
    'natural_gradient_bp',
    'beta_attention_bp',
    'tool_factory_bp',
    'CACHE_TTL_SHORT',
    'CACHE_TTL_MEDIUM',
]
