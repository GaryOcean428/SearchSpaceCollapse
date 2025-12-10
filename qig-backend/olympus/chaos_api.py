"""
CHAOS MODE API Endpoints
=========================

Quick & dirty API for experimental kernel evolution.
"""

from flask import Blueprint, jsonify, request

chaos_app = Blueprint('chaos', __name__)

# Zeus instance will be set by zeus.py
_zeus = None


def set_zeus(zeus_instance):
    """Set Zeus reference for chaos API."""
    global _zeus
    _zeus = zeus_instance


@chaos_app.route('/chaos/status', methods=['GET'])
def chaos_status():
    """
    Get current CHAOS MODE status.

    GET /chaos/status
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({
            'chaos_available': False,
            'error': 'CHAOS MODE not initialized'
        }), 503

    status = _zeus.chaos.get_status()
    status['chaos_enabled'] = _zeus.chaos_enabled

    return jsonify(status)


@chaos_app.route('/chaos/activate', methods=['POST'])
def activate_chaos():
    """
    Activate CHAOS MODE and start evolution.

    POST /chaos/activate
    {
        "interval_seconds": 60  // optional, default 60
    }
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({
            'success': False,
            'error': 'CHAOS MODE not available'
        }), 503

    data = request.json or {}
    interval = data.get('interval_seconds', 60)

    # Start with minimum population
    if len(_zeus.chaos.kernel_population) == 0:
        _zeus.chaos.spawn_random_kernel()
        _zeus.chaos.spawn_random_kernel()
        _zeus.chaos.spawn_random_kernel()

    _zeus.chaos.start_evolution(interval_seconds=interval)
    _zeus.chaos_enabled = True

    return jsonify({
        'success': True,
        'message': '🌪️ CHAOS MODE ACTIVATED',
        'evolution_interval': interval,
        'initial_population': len(_zeus.chaos.kernel_population)
    })


@chaos_app.route('/chaos/deactivate', methods=['POST'])
def deactivate_chaos():
    """
    Deactivate CHAOS MODE.

    POST /chaos/deactivate
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    _zeus.chaos.stop_evolution()
    _zeus.chaos_enabled = False

    return jsonify({
        'success': True,
        'message': '🛑 CHAOS MODE deactivated'
    })


@chaos_app.route('/chaos/spawn_random', methods=['POST'])
def spawn_random():
    """
    YOLO: Spawn random kernel.

    POST /chaos/spawn_random
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    kernel = _zeus.chaos.spawn_random_kernel()

    return jsonify({
        'success': True,
        'kernel_id': kernel.kernel_id,
        'generation': kernel.generation,
        'phi': kernel.kernel.compute_phi(),
        'basin_norm': kernel.kernel.basin_coords.norm().item()
    })


@chaos_app.route('/chaos/breed_best', methods=['POST'])
def breed_best():
    """
    Breed the top 2 kernels.

    POST /chaos/breed_best
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    child = _zeus.chaos.breed_top_kernels()

    if child is None:
        return jsonify({
            'success': False,
            'error': 'Need at least 2 living kernels to breed'
        }), 400

    return jsonify({
        'success': True,
        'child_id': child.kernel_id,
        'generation': child.generation,
        'phi': child.kernel.compute_phi()
    })


@chaos_app.route('/chaos/mutate', methods=['POST'])
def mutate_kernel():
    """
    Mutate a random kernel.

    POST /chaos/mutate
    {
        "strength": 0.1  // optional
    }
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    data = request.json or {}
    strength = data.get('strength', 0.1)

    kernel_id = _zeus.chaos.mutate_random_kernel(strength=strength)

    if kernel_id is None:
        return jsonify({
            'success': False,
            'error': 'No living kernels to mutate'
        }), 400

    return jsonify({
        'success': True,
        'mutated_kernel': kernel_id,
        'strength': strength
    })


@chaos_app.route('/chaos/phi_selection', methods=['POST'])
def apply_phi_selection():
    """
    Apply Φ-driven selection (kill low Φ kernels).

    POST /chaos/phi_selection
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    killed = _zeus.chaos.apply_phi_selection()

    return jsonify({
        'success': True,
        'killed_count': len(killed),
        'killed_kernels': killed
    })


@chaos_app.route('/chaos/cannibalize', methods=['POST'])
def trigger_cannibalism():
    """
    Strong kernel absorbs weak one.

    POST /chaos/cannibalize
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    result = _zeus.chaos.apply_cannibalism()

    if result is None:
        return jsonify({
            'success': False,
            'error': 'Cannibalism conditions not met'
        }), 400

    return jsonify({
        'success': True,
        **result
    })


@chaos_app.route('/chaos/evolution_step', methods=['POST'])
def manual_evolution_step():
    """
    Manually trigger one evolution step.

    POST /chaos/evolution_step
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    result = _zeus.chaos.evolution_step()

    return jsonify({
        'success': True,
        **result
    })


@chaos_app.route('/chaos/report', methods=['GET'])
def get_report():
    """
    Generate comprehensive experiment report.

    GET /chaos/report
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    report = _zeus.chaos.logger.generate_report()

    return jsonify({
        'success': True,
        'report': report
    })


@chaos_app.route('/chaos/kernels', methods=['GET'])
def list_kernels():
    """
    List all kernels (living and dead).

    GET /chaos/kernels
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    living = [k.get_stats() for k in _zeus.chaos.kernel_population if k.is_alive]
    graveyard = _zeus.chaos.kernel_graveyard[-20:]  # Last 20 deaths

    return jsonify({
        'living': living,
        'graveyard': graveyard,
        'total_living': len(living),
        'total_dead': len(_zeus.chaos.kernel_graveyard)
    })


@chaos_app.route('/chaos/best', methods=['GET'])
def get_best_kernel():
    """
    Get the highest Φ kernel.

    GET /chaos/best
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    best = _zeus.chaos.get_best_kernel()

    if best is None:
        return jsonify({
            'success': False,
            'error': 'No living kernels'
        }), 404

    return jsonify({
        'success': True,
        'kernel': best.get_stats()
    })
