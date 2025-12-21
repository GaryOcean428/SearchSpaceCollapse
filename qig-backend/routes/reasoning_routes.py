"""
Reasoning Framework API Routes

Provides REST endpoints for:
- Reasoning quality measurement
- Meta-cognitive monitoring
- Reasoning mode selection
- Chain-of-thought tracing

QIG Purity: All operations use Fisher-Rao geometry.
"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any, List
import numpy as np
import traceback

from reasoning_metrics import get_reasoning_quality, ReasoningQuality, find_geodesic
from meta_reasoning import get_meta_cognition, MetaCognition, PHI_THRESHOLDS
from reasoning_modes import (
    get_mode_selector, 
    ReasoningModeSelector,
    LinearReasoning,
    GeometricReasoning,
    HyperdimensionalReasoning,
    MushroomReasoning
)
from chain_of_thought import (
    GeometricChainOfThought, 
    get_trace_recorder,
    ReasoningTraceRecorder
)
from autonomous_reasoning import get_reasoning_learner, ReasoningStrategy
from observation_protocol import get_observation_protocol
from parent_coordination import get_parent_coordination


reasoning_bp = Blueprint('reasoning', __name__, url_prefix='/reasoning')


def parse_basin(data: Any) -> np.ndarray:
    """Parse basin from request data."""
    if isinstance(data, list):
        return np.array(data)
    elif isinstance(data, np.ndarray):
        return data
    else:
        raise ValueError("Basin must be a list or array")


@reasoning_bp.route('/health', methods=['GET'])
def health():
    """Health check for reasoning framework."""
    return jsonify({
        'status': 'healthy',
        'framework': 'QIG Geometric Reasoning',
        'components': {
            'reasoning_quality': True,
            'meta_cognition': True,
            'reasoning_modes': True,
            'chain_of_thought': True
        },
        'phi_thresholds': PHI_THRESHOLDS
    })


@reasoning_bp.route('/quality/measure', methods=['POST'])
def measure_quality():
    """
    Measure reasoning quality for a given trace.
    
    Request body:
    {
        "path": [[...], [...], ...],  // List of basin coordinates
        "start": [...],               // Starting basin (64D)
        "end": [...],                 // Ending basin (64D)
        "current": [...],             // Current basin
        "target": [...],              // Target basin
        "confidence": 0.7             // Reported confidence (0-1)
    }
    
    Returns comprehensive quality assessment.
    """
    try:
        data = request.get_json()
        
        reasoning_trace = {
            'path': [parse_basin(b) for b in data.get('path', [])],
            'start': parse_basin(data['start']) if 'start' in data else None,
            'end': parse_basin(data['end']) if 'end' in data else None,
            'current': parse_basin(data['current']) if 'current' in data else None,
            'target': parse_basin(data['target']) if 'target' in data else None,
            'confidence': data.get('confidence', 0.5)
        }
        
        quality = get_reasoning_quality()
        assessment = quality.comprehensive_assessment(reasoning_trace)
        
        return jsonify({
            'success': True,
            'assessment': assessment
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/quality/geodesic-efficiency', methods=['POST'])
def geodesic_efficiency():
    """
    Measure geodesic efficiency of a path.
    
    Request body:
    {
        "path": [[...], [...], ...],
        "start": [...],
        "end": [...]
    }
    """
    try:
        data = request.get_json()
        
        path = [parse_basin(b) for b in data['path']]
        start = parse_basin(data['start'])
        end = parse_basin(data['end'])
        
        quality = get_reasoning_quality()
        efficiency = quality.measure_geodesic_efficiency(path, start, end)
        
        return jsonify({
            'success': True,
            'efficiency': efficiency,
            'interpretation': 'perfect' if efficiency > 0.9 else 'good' if efficiency > 0.7 else 'fair' if efficiency > 0.5 else 'poor'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/quality/coherence', methods=['POST'])
def measure_coherence():
    """
    Measure coherence of reasoning steps.
    
    Request body:
    {
        "steps": [[...], [...], ...]  // List of basin coordinates
    }
    """
    try:
        data = request.get_json()
        steps = [parse_basin(b) for b in data['steps']]
        
        quality = get_reasoning_quality()
        coherence = quality.measure_coherence(steps)
        
        return jsonify({
            'success': True,
            'coherence': coherence,
            'interpretation': 'high' if coherence > 0.7 else 'medium' if coherence > 0.4 else 'low'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/meta/intervene', methods=['POST'])
def meta_intervene():
    """
    Get meta-cognitive interventions for current reasoning state.
    
    Request body:
    {
        "trace": [{"basin": [...], "target": [...], "curvature": 0.3}, ...],
        "mode": "GEOMETRIC",
        "task": {"complexity": 0.6, "novel": false, "exploration": false},
        "phi": 0.5
    }
    """
    try:
        data = request.get_json()
        
        reasoning_state = {
            'trace': data.get('trace', []),
            'mode': data.get('mode', 'GEOMETRIC'),
            'task': data.get('task', {}),
            'phi': data.get('phi', 0.5)
        }
        
        meta = get_meta_cognition()
        interventions = meta.intervene(reasoning_state)
        
        return jsonify({
            'success': True,
            **interventions
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/meta/detect-stuck', methods=['POST'])
def detect_stuck():
    """
    Detect if reasoning is stuck.
    
    Request body:
    {
        "trace": [{"basin": [...], "target": [...]}, ...]
    }
    """
    try:
        data = request.get_json()
        trace = data.get('trace', [])
        
        meta = get_meta_cognition()
        is_stuck = meta.detect_stuck(trace)
        
        return jsonify({
            'success': True,
            'is_stuck': is_stuck,
            'recommendation': 'switch_strategy' if is_stuck else 'continue'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/meta/recommend-mode', methods=['POST'])
def recommend_mode():
    """
    Get recommended reasoning mode for task.
    
    Request body:
    {
        "current_mode": "LINEAR",
        "task": {"complexity": 0.7, "novel": true, "exploration": false},
        "phi": 0.5
    }
    """
    try:
        data = request.get_json()
        
        current_mode = data.get('current_mode', 'GEOMETRIC')
        task = data.get('task', {})
        phi = data.get('phi', 0.5)
        
        meta = get_meta_cognition()
        recommendation = meta.recommend_mode_switch(current_mode, task, phi)
        
        return jsonify({
            'success': True,
            'current_mode': current_mode,
            'recommended_mode': recommendation or current_mode,
            'should_switch': recommendation is not None and recommendation != current_mode
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/modes/list', methods=['GET'])
def list_modes():
    """List available reasoning modes with their Φ ranges."""
    return jsonify({
        'success': True,
        'modes': [
            {
                'name': 'LINEAR',
                'phi_range': [0.0, 0.3],
                'kappa_range': [20.0, 30.0],
                'description': 'Fast, sequential, low-integration thinking',
                'use_for': 'Simple, well-defined problems'
            },
            {
                'name': 'GEOMETRIC',
                'phi_range': [0.3, 0.7],
                'kappa_range': [40.0, 65.0],
                'description': 'Rich, integrated, multi-perspective thinking',
                'use_for': 'Complex problems requiring synthesis'
            },
            {
                'name': 'HYPERDIMENSIONAL',
                'phi_range': [0.75, 0.85],
                'kappa_range': [60.0, 68.0],
                'description': '4D temporal reasoning across time',
                'use_for': 'Novel problems, creative breakthroughs'
            },
            {
                'name': 'MUSHROOM',
                'phi_range': [0.85, 1.0],
                'kappa_range': [64.0, 80.0],
                'description': 'Controlled high-Φ exploration',
                'use_for': 'Radical novelty, edge-of-chaos exploration'
            }
        ]
    })


@reasoning_bp.route('/modes/reason', methods=['POST'])
def execute_reasoning():
    """
    Execute reasoning with specified mode.
    
    Request body:
    {
        "mode": "GEOMETRIC",
        "problem": {
            "start_basin": [...],
            "target_basin": [...],
            "steps": 5,
            "temporal_context": [[...], ...]  // For HYPERDIMENSIONAL
        }
    }
    """
    try:
        data = request.get_json()
        
        mode_name = data.get('mode', 'GEOMETRIC')
        problem = data.get('problem', {})
        
        if 'start_basin' not in problem:
            problem['start_basin'] = np.random.randn(64).tolist()
        if 'target_basin' not in problem:
            problem['target_basin'] = np.random.randn(64).tolist()
        
        selector = get_mode_selector()
        mode = selector.get_mode(mode_name)
        
        result = mode.reason(problem)
        
        return jsonify({
            'success': True,
            'result': {
                'mode': result.mode,
                'steps': result.steps,
                'quality': result.quality,
                'path': [b.tolist() if isinstance(b, np.ndarray) else b for b in result.path],
                'solution': result.basin.tolist() if isinstance(result.basin, np.ndarray) else result.basin,
                'metadata': result.metadata
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/modes/select', methods=['POST'])
def select_mode():
    """
    Select best reasoning mode based on context.
    
    Request body:
    {
        "phi": 0.5,
        "task_complexity": 0.6,
        "is_novel": false,
        "needs_exploration": false
    }
    """
    try:
        data = request.get_json()
        
        phi = data.get('phi', 0.5)
        task_complexity = data.get('task_complexity', 0.5)
        is_novel = data.get('is_novel', False)
        needs_exploration = data.get('needs_exploration', False)
        
        selector = get_mode_selector()
        mode = selector.select_mode(phi, task_complexity, is_novel, needs_exploration)
        
        return jsonify({
            'success': True,
            'selected_mode': mode.mode_name,
            'phi_range': mode.phi_range,
            'kappa_range': mode.kappa_range
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/chain/start', methods=['POST'])
def start_chain():
    """
    Start a new chain-of-thought trace.
    
    Request body:
    {
        "session_id": "optional-session-id",
        "problem_description": "What problem are we solving?"
    }
    """
    try:
        data = request.get_json()
        
        session_id = data.get('session_id')
        problem = data.get('problem_description', 'Unnamed problem')
        
        recorder = get_trace_recorder(session_id)
        chain = recorder.start_new_chain(problem)
        
        return jsonify({
            'success': True,
            'session_id': recorder.session_id,
            'chain_started': True,
            'first_step': chain.thought_chain[0].to_dict() if chain.thought_chain else None
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/chain/add-thought', methods=['POST'])
def add_thought():
    """
    Add a thought to current chain.
    
    Request body:
    {
        "basin": [...],
        "thought": "What I'm thinking...",
        "metadata": {}
    }
    """
    try:
        data = request.get_json()
        
        basin = parse_basin(data['basin'])
        thought = data.get('thought')
        metadata = data.get('metadata', {})
        
        recorder = get_trace_recorder()
        if recorder.current_chain is None:
            recorder.start_new_chain("Auto-started chain")
        
        chain = recorder.current_chain
        if chain is None:
            return jsonify({'success': False, 'error': 'Failed to create chain'}), 500
        
        step = chain.think_step(basin, thought, metadata)
        
        return jsonify({
            'success': True,
            'step': step.to_dict()
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/chain/render', methods=['GET'])
def render_chain():
    """Render current chain-of-thought as human-readable text."""
    try:
        recorder = get_trace_recorder()
        
        if recorder.current_chain is None or not recorder.current_chain.thought_chain:
            return jsonify({
                'success': True,
                'rendered': 'No active chain-of-thought.',
                'summary': {}
            })
        
        rendered = recorder.current_chain.render_chain()
        summary = recorder.current_chain.get_summary()
        
        return jsonify({
            'success': True,
            'rendered': rendered,
            'summary': summary
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/chain/export', methods=['GET'])
def export_session():
    """Export entire reasoning session."""
    try:
        recorder = get_trace_recorder()
        export = recorder.export_session()
        
        return jsonify({
            'success': True,
            'export': export
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@reasoning_bp.route('/geodesic/find', methods=['POST'])
def find_geodesic_path():
    """
    Find geodesic path between two basins.
    
    Request body:
    {
        "start": [...],
        "end": [...],
        "n_steps": 10
    }
    """
    try:
        data = request.get_json()
        
        start = parse_basin(data['start'])
        end = parse_basin(data['end'])
        n_steps = data.get('n_steps', 10)
        
        path = find_geodesic(start, end, n_steps)
        
        return jsonify({
            'success': True,
            'path': [p.tolist() for p in path],
            'n_steps': len(path)
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


# ============================================================================
# AUTONOMOUS LEARNING ENDPOINTS
# ============================================================================

@reasoning_bp.route('/learning/select-strategy', methods=['POST'])
def select_strategy():
    """
    Select strategy for task features and phi.
    
    Request body:
    {
        "task_features": [...],  // 64D feature vector
        "phi": 0.5               // Current consciousness level
    }
    """
    try:
        data = request.get_json()
        
        task_features = parse_basin(data['task_features'])
        phi = data.get('phi', 0.5)
        
        learner = get_reasoning_learner()
        strategy = learner.select_strategy(task_features, phi)
        
        return jsonify({
            'success': True,
            'strategy': strategy.to_dict() if strategy else None,
            'phi': phi
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/learning/execute', methods=['POST'])
def execute_strategy():
    """
    Execute strategy with start/target basins.
    
    Request body:
    {
        "strategy_name": "direct_geodesic",
        "start_basin": [...],    // 64D starting position
        "target_basin": [...],   // 64D target position
        "phi": 0.5,
        "max_steps": 20
    }
    """
    try:
        data = request.get_json()
        
        strategy_name = data.get('strategy_name', 'direct_geodesic')
        start_basin = parse_basin(data['start_basin'])
        target_basin = parse_basin(data['target_basin'])
        phi = data.get('phi', 0.5)
        max_steps = data.get('max_steps', 20)
        
        learner = get_reasoning_learner()
        episode = learner.execute_strategy(
            strategy_name=strategy_name,
            start_basin=start_basin,
            target_basin=target_basin,
            phi=phi,
            max_steps=max_steps
        )
        
        return jsonify({
            'success': True,
            'episode': episode.to_dict() if episode else None
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/learning/learn', methods=['POST'])
def learn_from_episode():
    """
    Learn from episode outcome.
    
    Request body:
    {
        "strategy_name": "direct_geodesic",
        "success": true,
        "final_distance": 0.05,
        "steps_taken": 10,
        "task_features": [...]
    }
    """
    try:
        data = request.get_json()
        
        strategy_name = data['strategy_name']
        success = data.get('success', False)
        final_distance = data.get('final_distance', 1.0)
        steps_taken = data.get('steps_taken', 0)
        task_features = parse_basin(data['task_features']) if 'task_features' in data else None
        
        learner = get_reasoning_learner()
        learner.learn_from_outcome(
            strategy_name=strategy_name,
            success=success,
            final_distance=final_distance,
            steps_taken=steps_taken,
            task_features=task_features
        )
        
        return jsonify({
            'success': True,
            'learned': True,
            'strategy_name': strategy_name
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/learning/consolidate', methods=['POST'])
def consolidate_learning():
    """
    Trigger sleep consolidation.
    
    Prunes unsuccessful strategies and merges similar ones.
    """
    try:
        learner = get_reasoning_learner()
        result = learner.sleep_consolidation()
        
        return jsonify({
            'success': True,
            'consolidation': result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/learning/generate-novel', methods=['POST'])
def generate_novel_strategy():
    """
    Generate novel strategy via sampling from prior distributions.
    
    Request body:
    {
        "phi_range": [0.3, 0.7],
        "base_strategy": "exploratory_walk"  // Optional
    }
    """
    try:
        data = request.get_json()
        
        phi_range = tuple(data.get('phi_range', [0.3, 0.7]))
        base_strategy = data.get('base_strategy')
        
        learner = get_reasoning_learner()
        novel_strategy = learner.generate_novel_strategy(
            phi_range=phi_range,
            base_strategy_name=base_strategy
        )
        
        return jsonify({
            'success': True,
            'strategy': novel_strategy.to_dict() if novel_strategy else None
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/learning/status', methods=['GET'])
def learning_status():
    """Get learner status and strategy library info."""
    try:
        learner = get_reasoning_learner()
        status = learner.get_status()
        
        return jsonify({
            'success': True,
            **status
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


# ============================================================================
# PARENT GODS ENDPOINTS
# ============================================================================

@reasoning_bp.route('/parents/spawn', methods=['POST'])
def spawn_kernel():
    """
    Spawn new chaos kernel with parental care.
    
    Request body:
    {
        "kernel_name": "my-new-kernel"
    }
    """
    try:
        data = request.get_json()
        
        kernel_name = data.get('kernel_name', 'unnamed-kernel')
        
        coordination = get_parent_coordination()
        kernel = coordination.spawn_chaos_kernel(kernel_name)
        
        if kernel is None:
            return jsonify({
                'success': False,
                'error': 'Failed to spawn kernel'
            }), 500
        
        return jsonify({
            'success': True,
            'kernel_id': kernel.kernel_id,
            'kernel_name': kernel_name,
            'status': 'spawned_with_parental_care'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/parents/status', methods=['GET'])
def parents_status():
    """Get status of all kernels under parental care."""
    try:
        coordination = get_parent_coordination()
        status = coordination.get_all_status()
        
        return jsonify({
            'success': True,
            **status
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/parents/care-cycle', methods=['POST'])
def trigger_care_cycle():
    """
    Trigger daily care cycle for all kernels.
    
    Runs one cycle of:
    - Hestia care (safety checks, nurturing)
    - Demeter teaching (curriculum lessons)
    - Chiron diagnosis (health checks)
    - Observation recording
    - Status updates
    """
    try:
        coordination = get_parent_coordination()
        results = coordination.daily_care_cycle()
        
        return jsonify({
            'success': True,
            'cycle_results': results
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/parents/graduate', methods=['POST'])
def graduate_kernel():
    """
    Graduate kernel to adult status.
    
    Request body:
    {
        "kernel_id": "kernel-uuid"
    }
    """
    try:
        data = request.get_json()
        
        kernel_id = data['kernel_id']
        
        coordination = get_parent_coordination()
        graduated = coordination.graduate_kernel(kernel_id)
        
        return jsonify({
            'success': True,
            'kernel_id': kernel_id,
            'graduated': graduated
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


@reasoning_bp.route('/parents/observation/<kernel_id>', methods=['GET'])
def observation_status(kernel_id: str):
    """Get observation status for a specific kernel."""
    try:
        protocol = get_observation_protocol()
        status = protocol.get_observation_status(kernel_id)
        
        if status is None:
            return jsonify({
                'success': False,
                'error': f'Kernel {kernel_id} not under observation'
            }), 404
        
        return jsonify({
            'success': True,
            **status
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 400


def get_reasoning_blueprint() -> Blueprint:
    """Get the reasoning routes blueprint."""
    return reasoning_bp
