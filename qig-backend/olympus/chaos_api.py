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


# =========================================================================
# PANTHEON-CHAOS INTEGRATION ENDPOINTS
# =========================================================================

@chaos_app.route('/chaos/god/<god_name>/spawn', methods=['POST'])
def god_spawn_kernel(god_name: str):
    """
    Have a Pantheon god spawn a CHAOS kernel.

    POST /chaos/god/athena/spawn
    {
        "basin": [0.1, 0.2, ...]  // optional god basin pattern
    }
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    # Verify god exists
    god = _zeus.get_god(god_name)
    if god is None:
        return jsonify({'success': False, 'error': f'God {god_name} not found'}), 404

    data = request.json or {}
    god_basin = data.get('basin')

    # Try to get god's basin signature if not provided
    if god_basin is None and hasattr(god, 'basin_coordinates'):
        god_basin = god.basin_coordinates.tolist() if hasattr(god.basin_coordinates, 'tolist') else god.basin_coordinates

    kernel = _zeus.chaos.spawn_from_god(god_name, god_basin)

    return jsonify({
        'success': True,
        'god': god_name,
        'kernel_id': kernel.kernel_id,
        'phi': kernel.kernel.compute_phi(),
        'generation': kernel.generation,
    })


@chaos_app.route('/chaos/god/<god_name>/kernel', methods=['GET'])
def get_god_kernel(god_name: str):
    """
    Get the best CHAOS kernel spawned by a specific god.

    GET /chaos/god/athena/kernel
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    kernel = _zeus.chaos.get_kernel_for_god(god_name)

    if kernel is None:
        return jsonify({
            'success': False,
            'error': f'No living kernels for god {god_name}'
        }), 404

    return jsonify({
        'success': True,
        'god': god_name,
        'kernel': kernel.get_stats()
    })


@chaos_app.route('/chaos/kernel/<kernel_id>/consult', methods=['POST'])
def consult_kernel(kernel_id: str):
    """
    Have a kernel process a query (for god consultation).

    POST /chaos/kernel/chaos_athena_abc123/consult
    {
        "query_basin": [1, 2, 3, ...]  // token IDs
    }
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    data = request.json or {}
    query_basin = data.get('query_basin', [0] * 32)

    result = _zeus.chaos.consult_kernel(kernel_id, query_basin)

    if 'error' in result:
        return jsonify({'success': False, **result}), 404

    return jsonify({
        'success': True,
        **result
    })


@chaos_app.route('/chaos/pantheon/spawn_all', methods=['POST'])
def spawn_all_god_kernels():
    """
    Have ALL Pantheon gods spawn one CHAOS kernel each.

    POST /chaos/pantheon/spawn_all
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    spawned = []
    for god_name, god in _zeus.pantheon.items():
        try:
            god_basin = None
            if hasattr(god, 'basin_coordinates'):
                god_basin = god.basin_coordinates.tolist() if hasattr(god.basin_coordinates, 'tolist') else god.basin_coordinates

            kernel = _zeus.chaos.spawn_from_god(god_name, god_basin)
            spawned.append({
                'god': god_name,
                'kernel_id': kernel.kernel_id,
                'phi': kernel.kernel.compute_phi()
            })
        except Exception as e:
            spawned.append({
                'god': god_name,
                'error': str(e)
            })

    return jsonify({
        'success': True,
        'spawned_count': len([s for s in spawned if 'kernel_id' in s]),
        'kernels': spawned
    })


# =========================================================================
# GOD-KERNEL ASSIGNMENT AND TRAINING ENDPOINTS
# =========================================================================

@chaos_app.route('/chaos/assign_kernels', methods=['POST'])
def assign_kernels():
    """
    Assign CHAOS kernels to gods for poll_pantheon() integration.

    POST /chaos/assign_kernels

    This assigns top kernels (by Φ) to gods in priority order.
    The kernels then influence god assessments during poll_pantheon().
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    assignments = _zeus.assign_kernels_to_gods()

    return jsonify({
        'success': True,
        'assignments': assignments,
        'assigned_count': len(assignments),
        'message': f'Assigned {len(assignments)} kernels to gods'
    })


@chaos_app.route('/chaos/kernel_assignments', methods=['GET'])
def get_kernel_assignments():
    """
    Get current kernel-god assignments with status.

    GET /chaos/kernel_assignments
    """
    if _zeus is None:
        return jsonify({'success': False, 'error': 'Zeus not available'}), 503

    assignments = _zeus.get_kernel_assignments()

    return jsonify({
        'success': True,
        **assignments
    })


@chaos_app.route('/chaos/train_from_outcome', methods=['POST'])
def train_from_outcome():
    """
    Train all god kernels from an assessment outcome.

    POST /chaos/train_from_outcome
    {
        "target": "test passphrase",
        "success": true,
        "phi_result": 0.75,
        "assessments": {...}  // optional, from poll_pantheon
    }

    This feeds the outcome back to kernels:
    - Success: kernels move TOWARD target's basin
    - Failure: kernels move AWAY from target's basin
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    data = request.json or {}
    target = data.get('target')
    success = data.get('success', False)
    phi_result = data.get('phi_result', 0.5)
    assessments = data.get('assessments', {})

    if not target:
        return jsonify({'success': False, 'error': 'target is required'}), 400

    # If assessments not provided, use empty dict (trains all god kernels)
    results = _zeus.train_all_god_kernels(target, assessments, success, phi_result)

    return jsonify({
        'success': True,
        'trained_count': len(results),
        'training_results': results,
        'direction': 'toward' if success else 'away',
        'outcome_phi': phi_result
    })


@chaos_app.route('/chaos/god/<god_name>/kernel_status', methods=['GET'])
def get_god_kernel_status(god_name: str):
    """
    Get the status of a god's assigned CHAOS kernel.

    GET /chaos/god/athena/kernel_status
    """
    if _zeus is None:
        return jsonify({'success': False, 'error': 'Zeus not available'}), 503

    god = _zeus.pantheon.get(god_name.lower())
    if god is None:
        return jsonify({'success': False, 'error': f'God {god_name} not found'}), 404

    if god.chaos_kernel is None:
        return jsonify({
            'success': True,
            'god': god_name,
            'has_kernel': False,
            'message': f'{god_name} has no assigned kernel'
        })

    kernel = god.chaos_kernel
    return jsonify({
        'success': True,
        'god': god_name,
        'has_kernel': True,
        'kernel_id': kernel.kernel_id,
        'kernel_phi': kernel.kernel.compute_phi(),
        'kernel_generation': kernel.generation,
        'kernel_alive': getattr(kernel, 'is_alive', True),
        'kernel_assessments_count': len(god.kernel_assessments),
        'recent_assessments': god.kernel_assessments[-5:] if god.kernel_assessments else []
    })


# =========================================================================
# PAID TIER: TURBO, ELITE, STATS, E8
# =========================================================================

@chaos_app.route('/chaos/turbo', methods=['POST'])
def turbo_mode():
    """
    TURBO MODE: Spawn many kernels immediately.

    POST /chaos/turbo
    {
        "count": 50  // optional, default 50
    }
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    data = request.json or {}
    count = data.get('count', 50)

    spawned = _zeus.chaos.turbo_spawn(count=count)

    return jsonify({
        'success': True,
        'message': '🚀 TURBO MODE ACTIVATED',
        'spawned_count': len(spawned),
        'spawned_kernels': spawned[:500],  # First 20 for brevity
        'total_population': len(_zeus.chaos.kernel_population)
    })


@chaos_app.route('/chaos/elite', methods=['GET'])
def get_elite_kernels():
    """
    Get hall of fame kernels.

    GET /chaos/elite
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    return jsonify({
        'success': True,
        'elite_count': len(_zeus.chaos.elite_hall_of_fame),
        'elite_kernels': _zeus.chaos.elite_hall_of_fame[-20:],  # Last 20
        'phi_threshold': _zeus.chaos.phi_elite_threshold
    })


@chaos_app.route('/chaos/population/stats', methods=['GET'])
def population_stats():
    """
    Detailed population statistics.

    GET /chaos/population/stats
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    stats = _zeus.chaos.get_population_stats()

    return jsonify({
        'success': True,
        **stats
    })


@chaos_app.route('/chaos/e8/alignment', methods=['GET'])
def e8_alignment():
    """
    Check E8 alignment of kernel population.

    GET /chaos/e8/alignment
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    alignment = _zeus.chaos.check_e8_alignment()

    return jsonify({
        'success': True,
        **alignment
    })


@chaos_app.route('/chaos/e8/convergence', methods=['GET'])
def e8_convergence():
    """
    Analyze convergence toward E8 structure.

    GET /chaos/e8/convergence
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    convergence = _zeus.chaos.analyze_convergence()

    return jsonify({
        'success': True,
        **convergence
    })


@chaos_app.route('/chaos/e8/spawn_at_root', methods=['POST'])
def spawn_at_e8_root():
    """
    Spawn kernel at specific E8 root.

    POST /chaos/e8/spawn_at_root
    {
        "root_index": 42  // 0-239
    }
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    data = request.json or {}
    root_index = data.get('root_index', 0)

    if root_index < 0 or root_index >= 240:
        return jsonify({'success': False, 'error': 'root_index must be 0-239'}), 400

    kernel = _zeus.chaos.spawn_at_e8_root(root_index)

    return jsonify({
        'success': True,
        'kernel_id': kernel.kernel_id,
        'root_index': root_index,
        'phi': kernel.kernel.compute_phi()
    })


@chaos_app.route('/chaos/tier', methods=['GET'])
def get_tier_info():
    """
    Get current tier and settings.

    GET /chaos/tier
    """
    if _zeus is None or _zeus.chaos is None:
        return jsonify({'success': False, 'error': 'CHAOS MODE not available'}), 503

    chaos = _zeus.chaos

    return jsonify({
        'success': True,
        'is_paid_tier': chaos.is_paid_tier,
        'is_replit': chaos.is_replit,
        'architecture': chaos.architecture,
        'max_total': chaos.max_total,
        'max_active': chaos.max_active,
        'memory_available_gb': chaos.memory_available_gb,
        'features': {
            'self_spawning': chaos.enable_self_spawning,
            'breeding': chaos.enable_breeding,
            'cannibalism': chaos.enable_cannibalism,
            'mutation': chaos.enable_mutation,
            'god_fusion': chaos.enable_god_fusion,
        },
        'thresholds': {
            'phi_death': chaos.phi_death_threshold,
            'phi_elite': chaos.phi_elite_threshold,
            'spawn': chaos.spawn_threshold,
            'death': chaos.death_threshold,
        }
    })


# =========================================================================
# KERNEL FITNESS & EVOLUTION INTEGRATION ENDPOINTS
# These endpoints are called by the TypeScript kernel-fitness-service
# =========================================================================

@chaos_app.route('/chaos/kernel/<kernel_id>/fitness', methods=['POST'])
def update_kernel_fitness(kernel_id: str):
    """
    Update kernel fitness from TypeScript service.
    
    POST /chaos/kernel/{kernel_id}/fitness
    {
        "phi_current": 0.7,
        "phi_gradient": 0.01,
        "phi_velocity": 0.001,
        "kappa_current": 0.6,
        "kappa_stability": 0.8,
        "fisher_diversity": 0.5,
        "geometric_fitness": 0.75,
        "dimensional_state": "D3",
        "evolution_pressure": 0.2,
        "cannibalize_priority": 0.25
    }
    """
    import os
    import psycopg2
    
    data = request.json or {}
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return jsonify({'success': False, 'error': 'Database not configured'}), 503
    
    try:
        conn = psycopg2.connect(database_url)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO kernel_evolution_fitness
                (kernel_id, phi_current, phi_gradient, phi_velocity,
                 kappa_current, kappa_stability, fisher_diversity,
                 geometric_fitness, dimensional_state, evolution_pressure,
                 cannibalize_priority, fitness_computed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (kernel_id) DO UPDATE SET
                    phi_current = EXCLUDED.phi_current,
                    phi_gradient = EXCLUDED.phi_gradient,
                    phi_velocity = EXCLUDED.phi_velocity,
                    kappa_current = EXCLUDED.kappa_current,
                    kappa_stability = EXCLUDED.kappa_stability,
                    fisher_diversity = EXCLUDED.fisher_diversity,
                    geometric_fitness = EXCLUDED.geometric_fitness,
                    dimensional_state = EXCLUDED.dimensional_state,
                    evolution_pressure = EXCLUDED.evolution_pressure,
                    cannibalize_priority = EXCLUDED.cannibalize_priority,
                    fitness_computed_at = NOW()
            """, (
                kernel_id,
                data.get('phi_current', 0.0),
                data.get('phi_gradient', 0.0),
                data.get('phi_velocity', 0.0),
                data.get('kappa_current', 0.0),
                data.get('kappa_stability', 0.0),
                data.get('fisher_diversity', 0.0),
                data.get('geometric_fitness', 0.5),
                data.get('dimensional_state', 'D3'),
                data.get('evolution_pressure', 0.0),
                data.get('cannibalize_priority', 0.0),
            ))
            conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'kernel_id': kernel_id,
            'fitness': data.get('geometric_fitness', 0.5)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@chaos_app.route('/chaos/evolution/trigger', methods=['POST'])
def trigger_evolution():
    """
    Handle evolution trigger events from TypeScript service.
    
    POST /chaos/evolution/trigger
    {
        "event_type": "mutation" | "reproduction" | "culling",
        "kernel_id": "kernel_123",
        "fitness": 0.75,
        "phi": 0.7,
        "kappa": 0.6,
        "metadata": {...}
    }
    """
    data = request.json or {}
    event_type = data.get('event_type')
    kernel_id = data.get('kernel_id')
    fitness = data.get('fitness', 0.5)
    
    if not event_type or not kernel_id:
        return jsonify({'success': False, 'error': 'event_type and kernel_id required'}), 400
    
    result = {'success': True, 'event_type': event_type, 'kernel_id': kernel_id}
    
    if _zeus is not None and _zeus.chaos is not None:
        try:
            if event_type == 'mutation':
                mutated = _zeus.chaos.mutate_random_kernel(strength=0.1)
                result['mutated_kernel'] = mutated
            elif event_type == 'reproduction':
                child = _zeus.chaos.breed_top_kernels()
                if child:
                    result['child_id'] = child.kernel_id
                    result['child_phi'] = child.kernel.compute_phi()
            elif event_type == 'culling':
                killed = _zeus.chaos.apply_phi_selection()
                result['killed_count'] = len(killed)
                result['killed_kernels'] = killed
        except Exception as e:
            result['chaos_error'] = str(e)
    
    import os
    import psycopg2
    import json
    import uuid
    
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        try:
            conn = psycopg2.connect(database_url)
            with conn.cursor() as cur:
                event_id = f"evo_{uuid.uuid4().hex}"
                cur.execute("""
                    INSERT INTO kernel_evolution_events
                    (event_id, event_type, source_kernel_id, geometric_reasoning,
                     phi_before, phi_after, fitness_delta, occurred_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    event_id,
                    event_type,
                    kernel_id,
                    json.dumps(data.get('metadata', {})),
                    fitness,
                    fitness,
                    0.0,
                ))
                conn.commit()
            conn.close()
            result['event_id'] = event_id
        except Exception as e:
            result['db_error'] = str(e)
    
    return jsonify(result)


@chaos_app.route('/chaos/e8/enforce-cap', methods=['POST'])
def enforce_e8_cap():
    """
    Enforce E8 population cap (240 kernels max).
    Called by TypeScript service to cull excess kernels.
    
    POST /chaos/e8/enforce-cap
    {
        "kernels_to_cull": ["kernel_1", "kernel_2"],
        "reason": "e8_population_control"
    }
    """
    import os
    import psycopg2
    
    data = request.json or {}
    kernels_to_cull = data.get('kernels_to_cull', [])
    reason = data.get('reason', 'e8_population_control')
    
    culled = []
    
    database_url = os.environ.get('DATABASE_URL')
    if database_url and kernels_to_cull:
        try:
            conn = psycopg2.connect(database_url)
            with conn.cursor() as cur:
                for kernel_id in kernels_to_cull:
                    cur.execute("""
                        UPDATE m8_spawned_kernels 
                        SET status = 'culled', retired_at = NOW()
                        WHERE kernel_id = %s AND status != 'culled'
                    """, (kernel_id,))
                    if cur.rowcount > 0:
                        culled.append(kernel_id)
                conn.commit()
            conn.close()
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    if _zeus is not None and _zeus.chaos is not None:
        try:
            for kernel_id in culled:
                for k in _zeus.chaos.kernel_population:
                    if hasattr(k, 'kernel_id') and k.kernel_id == kernel_id:
                        k.is_alive = False
                        break
        except Exception:
            pass
    
    return jsonify({
        'success': True,
        'culled_count': len(culled),
        'culled_kernels': culled,
        'reason': reason
    })


@chaos_app.route('/chaos/fitness/decay', methods=['POST'])
def apply_fitness_decay():
    """
    Apply fitness decay to inactive kernels.
    
    POST /chaos/fitness/decay
    {
        "decayed_kernels": [
            {"kernel_id": "k1", "new_fitness": 0.4},
            {"kernel_id": "k2", "new_fitness": 0.3}
        ]
    }
    """
    import os
    import psycopg2
    
    data = request.json or {}
    decayed_kernels = data.get('decayed_kernels', [])
    
    updated = 0
    database_url = os.environ.get('DATABASE_URL')
    if database_url and decayed_kernels:
        try:
            conn = psycopg2.connect(database_url)
            with conn.cursor() as cur:
                for kernel in decayed_kernels:
                    kernel_id = kernel.get('kernel_id')
                    new_fitness = kernel.get('new_fitness', 0.0)
                    evolution_pressure = kernel.get('evolution_pressure', 0.0)
                    cannibalize_priority = kernel.get('cannibalize_priority', 1.0)
                    
                    cur.execute("""
                        UPDATE kernel_evolution_fitness
                        SET geometric_fitness = %s,
                            evolution_pressure = %s,
                            cannibalize_priority = %s,
                            fitness_computed_at = NOW()
                        WHERE kernel_id = %s
                    """, (new_fitness, evolution_pressure, cannibalize_priority, kernel_id))
                    updated += cur.rowcount
                conn.commit()
            conn.close()
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return jsonify({
        'success': True,
        'updated_count': updated
    })
