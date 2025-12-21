"""
Self-Healing API Routes for Flask

Exposes self-healing capabilities via HTTP endpoints.
"""

from flask import Blueprint, jsonify, request

from .geometric_monitor import GeometricHealthMonitor
from .code_fitness import CodeFitnessEvaluator
from .healing_engine import SelfHealingEngine

# Create blueprint
self_healing_bp = Blueprint('self_healing', __name__, url_prefix='/self-healing')

# Initialize components (will be set by main app)
monitor: GeometricHealthMonitor = None
evaluator: CodeFitnessEvaluator = None
engine: SelfHealingEngine = None


def init_self_healing_components():
    """Initialize self-healing components."""
    global monitor, evaluator, engine
    
    monitor = GeometricHealthMonitor(
        snapshot_interval_sec=60,
        history_size=1000
    )
    
    evaluator = CodeFitnessEvaluator(monitor)
    
    engine = SelfHealingEngine(monitor, evaluator)
    
    return monitor, evaluator, engine


@self_healing_bp.route('/snapshot', methods=['POST'])
def capture_snapshot():
    """Capture geometric snapshot."""
    try:
        system_state = request.get_json()
        
        if monitor is None:
            return jsonify({"error": "Monitor not initialized"}), 503
        
        snapshot = monitor.capture_snapshot(system_state)
        
        return jsonify({
            "timestamp": snapshot.timestamp.isoformat(),
            "phi": snapshot.phi,
            "kappa_eff": snapshot.kappa_eff,
            "basin_coords": snapshot.basin_coords.tolist(),
            "confidence": snapshot.confidence,
            "surprise": snapshot.surprise,
            "agency": snapshot.agency,
            "regime": snapshot.regime,
            "code_hash": snapshot.code_hash,
            "active_modules": snapshot.active_modules[:10],  # First 10
            "module_versions": snapshot.module_versions,
            "error_rate": snapshot.error_rate,
            "avg_latency": snapshot.avg_latency,
            "memory_usage_mb": snapshot.memory_usage_mb,
            "cpu_usage_pct": snapshot.cpu_usage_pct,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@self_healing_bp.route('/health', methods=['GET'])
def check_health():
    """Check for geometric degradation."""
    try:
        if monitor is None:
            return jsonify({"error": "Monitor not initialized"}), 503
        
        health = monitor.detect_degradation()
        return jsonify(health)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@self_healing_bp.route('/evaluate', methods=['POST'])
def evaluate_code():
    """Evaluate code change fitness."""
    try:
        data = request.get_json()
        
        if evaluator is None:
            return jsonify({"error": "Evaluator not initialized"}), 503
        
        module_name = data.get('module_name', '')
        new_code = data.get('new_code', '')
        test_env = data.get('test_env', {})
        
        result = evaluator.evaluate_code_change(
            module_name,
            new_code,
            test_env
        )
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@self_healing_bp.route('/heal', methods=['POST'])
def attempt_healing():
    """Attempt autonomous healing."""
    try:
        if engine is None or monitor is None:
            return jsonify({"error": "Healing engine not initialized"}), 503
        
        # Get current health
        health = monitor.detect_degradation()
        
        if not health["degraded"]:
            return jsonify({
                "healed": False,
                "reason": "System is healthy, no healing needed"
            })
        
        # Attempt healing (synchronous version)
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(engine._attempt_healing(health))
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@self_healing_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get monitoring statistics."""
    try:
        if monitor is None:
            return jsonify({"error": "Monitor not initialized"}), 503
        
        stats = monitor.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
