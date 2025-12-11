#!/usr/bin/env python3
"""Vocabulary System API Endpoints - Complete Flask integration"""

from datetime import datetime
from flask import Blueprint, jsonify, request

try:
    from vocabulary_coordinator import get_vocabulary_coordinator
    COORDINATOR_AVAILABLE = True
except ImportError:
    COORDINATOR_AVAILABLE = False

try:
    from god_training_integration import patch_all_gods
    GOD_TRAINING_AVAILABLE = True
except ImportError:
    GOD_TRAINING_AVAILABLE = False

vocabulary_api = Blueprint('vocabulary_api', __name__)


@vocabulary_api.route('/vocabulary/health', methods=['GET'])
def vocabulary_health():
    return jsonify({'status': 'healthy', 'coordinator_available': COORDINATOR_AVAILABLE, 'god_training_available': GOD_TRAINING_AVAILABLE, 'timestamp': datetime.now().isoformat()})


@vocabulary_api.route('/vocabulary/record', methods=['POST'])
def vocabulary_record():
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        data = request.json or {}
        phrase = data.get('phrase', '')
        phi = data.get('phi', 0.0)
        kappa = data.get('kappa', 50.0)
        source = data.get('source', 'unknown')
        details = data.get('details')
        if not phrase:
            return jsonify({'error': 'phrase required'}), 400
        coordinator = get_vocabulary_coordinator()
        result = coordinator.record_discovery(phrase, phi, kappa, source, details)
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/record-batch', methods=['POST'])
def vocabulary_record_batch():
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        data = request.json or {}
        discoveries = data.get('discoveries', [])
        if not discoveries:
            return jsonify({'error': 'discoveries array required'}), 400
        coordinator = get_vocabulary_coordinator()
        results = []
        for discovery in discoveries:
            try:
                result = coordinator.record_discovery(phrase=discovery.get('phrase', ''), phi=discovery.get('phi', 0.0), kappa=discovery.get('kappa', 50.0), source=discovery.get('source', 'unknown'), details=discovery.get('details'))
                results.append(result)
            except Exception as e:
                results.append({'learned': False, 'error': str(e)})
        successful = sum(1 for r in results if r.get('learned', False))
        return jsonify({'success': True, 'total': len(discoveries), 'successful': successful, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/sync/export', methods=['GET'])
def vocabulary_sync_export():
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        coordinator = get_vocabulary_coordinator()
        data = coordinator.sync_to_typescript()
        return jsonify({'success': True, **data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/sync/import', methods=['POST'])
def vocabulary_sync_import():
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        data = request.json or {}
        coordinator = get_vocabulary_coordinator()
        result = coordinator.sync_from_typescript(data)
        return jsonify({'success': True, **result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/stats', methods=['GET'])
def vocabulary_stats():
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        coordinator = get_vocabulary_coordinator()
        stats = coordinator.get_stats()
        return jsonify({'success': True, 'stats': stats, 'timestamp': datetime.now().isoformat()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/god/<god_name>', methods=['GET'])
def vocabulary_get_god_vocab(god_name: str):
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        min_relevance = float(request.args.get('min_relevance', 0.5))
        limit = int(request.args.get('limit', 100))
        coordinator = get_vocabulary_coordinator()
        vocabulary = coordinator.get_god_specialized_vocabulary(god_name=god_name, min_relevance=min_relevance, limit=limit)
        return jsonify({'success': True, 'god_name': god_name, 'vocabulary': vocabulary, 'count': len(vocabulary)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/train-gods', methods=['POST'])
def vocabulary_train_gods():
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    try:
        data = request.json or {}
        target = data.get('target', '')
        success = data.get('success', False)
        details = data.get('details', {})
        if not target:
            return jsonify({'error': 'target required'}), 400
        coordinator = get_vocabulary_coordinator()
        phi = details.get('phi', 0.6 if success else 0.4)
        kappa = details.get('kappa', 50.0)
        vocab_result = coordinator.record_discovery(phrase=target, phi=phi, kappa=kappa, source='outcome', details=details)
        training_results = []
        if GOD_TRAINING_AVAILABLE:
            try:
                from olympus import zeus
                patch_all_gods(zeus)
                for god_name, god in zeus.pantheon.items():
                    try:
                        if hasattr(god, 'train_kernel_from_outcome'):
                            result = god.train_kernel_from_outcome(target, success, details)
                            training_results.append({'god': god_name, **result})
                    except Exception as e:
                        training_results.append({'god': god_name, 'trained': False, 'error': str(e)})
            except Exception as e:
                print(f"[VocabularyAPI] Failed to train gods: {e}")
        return jsonify({'success': True, 'vocabulary_learning': vocab_result, 'gods_trained': len([r for r in training_results if r.get('trained', False)]), 'training_results': training_results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@vocabulary_api.route('/vocabulary/god/<god_name>/train', methods=['POST'])
def vocabulary_train_specific_god(god_name: str):
    if not GOD_TRAINING_AVAILABLE:
        return jsonify({'error': 'God training not available'}), 503
    try:
        data = request.json or {}
        target = data.get('target', '')
        success = data.get('success', False)
        details = data.get('details', {})
        if not target:
            return jsonify({'error': 'target required'}), 400
        from olympus import zeus
        patch_all_gods(zeus)
        god = zeus.get_god(god_name)
        if not god:
            return jsonify({'error': f'God {god_name} not found'}), 404
        result = god.train_kernel_from_outcome(target, success, details)
        return jsonify({'success': True, 'god': god_name, **result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def register_vocabulary_routes(app):
    app.register_blueprint(vocabulary_api, url_prefix='/api')
    print("[VocabularyAPI] Registered vocabulary routes at /api/vocabulary/*")