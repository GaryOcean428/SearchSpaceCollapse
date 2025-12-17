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


import re

def _parse_markdown_content(content: str) -> list:
    """
    Parse markdown content and extract words/phrases for vocabulary learning.
    Skips code blocks, inline code, and URLs.
    Uses word_validation to filter valid English words.
    """
    from word_validation import is_valid_english_word
    
    code_block_pattern = re.compile(r'```[\s\S]*?```', re.MULTILINE)
    inline_code_pattern = re.compile(r'`[^`]+`')
    url_pattern = re.compile(r'https?://\S+')
    markdown_link_pattern = re.compile(r'\[([^\]]+)\]\([^)]+\)')
    html_tag_pattern = re.compile(r'<[^>]+>')
    
    text = code_block_pattern.sub(' ', content)
    text = inline_code_pattern.sub(' ', text)
    text = url_pattern.sub(' ', text)
    text = markdown_link_pattern.sub(r'\1', text)
    text = html_tag_pattern.sub(' ', text)
    
    word_pattern = re.compile(r"[a-zA-Z][a-zA-Z'-]*[a-zA-Z]|[a-zA-Z]")
    raw_words = word_pattern.findall(text.lower())
    
    valid_words = []
    for word in raw_words:
        if is_valid_english_word(word, include_stop_words=False, strict=True):
            if len(word) >= 3:
                valid_words.append(word)
    
    return valid_words


@vocabulary_api.route('/vocabulary/upload-markdown', methods=['POST'])
def vocabulary_upload_markdown():
    """
    Upload a markdown file and extract vocabulary for learning.
    Accepts multipart/form-data with 'file' field containing .md file.
    """
    if not COORDINATOR_AVAILABLE:
        return jsonify({'error': 'Vocabulary coordinator not available'}), 503
    
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided. Use "file" field in multipart/form-data'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.md'):
            return jsonify({'error': 'Only .md (markdown) files are accepted'}), 400
        
        content = file.read().decode('utf-8', errors='ignore')
        
        valid_words = _parse_markdown_content(content)
        
        if not valid_words:
            return jsonify({
                'success': True,
                'filename': file.filename,
                'words_processed': 0,
                'words_learned': 0,
                'message': 'No valid vocabulary words found in the markdown file'
            })
        
        word_counts = {}
        for word in valid_words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        coordinator = get_vocabulary_coordinator()
        words_learned = 0
        learning_results = []
        
        for word, count in word_counts.items():
            phi = min(0.5 + (count * 0.05), 0.95)
            
            result = coordinator.record_discovery(
                phrase=word,
                phi=phi,
                kappa=50.0,
                source='markdown_upload',
                details={'filename': file.filename, 'frequency': count}
            )
            
            if result.get('learned', False):
                words_learned += 1
            learning_results.append({'word': word, 'frequency': count, 'learned': result.get('learned', False)})
        
        return jsonify({
            'success': True,
            'filename': file.filename,
            'words_processed': len(word_counts),
            'words_learned': words_learned,
            'unique_words': len(word_counts),
            'total_occurrences': len(valid_words),
            'sample_words': list(word_counts.keys())[:20],
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def register_vocabulary_routes(app):
    app.register_blueprint(vocabulary_api, url_prefix='/api')
    print("[VocabularyAPI] Registered vocabulary routes at /api/vocabulary/*")