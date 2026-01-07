"""
Coordizer API Endpoints

REST API for geometric coordization services.
Uses unified 63K PretrainedCoordizer vocabulary.

Endpoints:
- POST /api/coordize - Basic coordization
- POST /api/coordize/encode - Encode text to basin coordinates
- POST /api/coordize/decode - Decode basin to tokens
- GET /api/coordize/stats - Get coordizer statistics
- GET /api/coordize/vocab - Get vocabulary info
"""

from flask import Blueprint, request, jsonify
from typing import Dict, List, Optional
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Import unified coordizer access
try:
    from coordizers import get_coordizer as _get_coordizer
    COORDIZERS_AVAILABLE = True
except ImportError as e:
    COORDIZERS_AVAILABLE = False
    _get_coordizer = None
    logger.warning(f"Coordizers not available: {e}")

# Create Blueprint
coordizer_api = Blueprint('coordizer_api', __name__)


def get_coordizer():
    """Get unified coordizer instance (63K vocabulary)."""
    if not COORDIZERS_AVAILABLE or _get_coordizer is None:
        return None
    try:
        return _get_coordizer()
    except Exception as e:
        logger.error(f"Failed to get coordizer: {e}")
        return None


@coordizer_api.route('/api/coordize', methods=['POST'])
def coordize_text():
    """
    Basic text coordization.

    Request:
        {
            "text": "input text",
            "return_coordinates": false  // optional, default false
        }

    Response:
        {
            "basin": [...],  // 64D basin coordinates
            "top_tokens": [["token", score], ...]  // decoded tokens
        }
    """
    if not COORDIZERS_AVAILABLE:
        return jsonify({'error': 'Coordizers not available'}), 503

    try:
        data = request.get_json()
        text = data.get('text', '')
        return_coordinates = data.get('return_coordinates', False)

        if not text:
            return jsonify({'error': 'Text is required'}), 400

        coordizer = get_coordizer()
        if coordizer is None:
            return jsonify({'error': 'Coordizer not initialized'}), 503

        # Encode text to basin coordinates
        basin = coordizer.encode(text)

        # Decode to top tokens
        top_tokens = coordizer.decode(basin, top_k=10)

        response = {
            'text': text,
            'top_tokens': top_tokens,
        }

        if return_coordinates:
            response['basin'] = basin.tolist()

        return jsonify(response)

    except Exception as e:
        logger.exception(f"Coordization error: {e}")
        return jsonify({'error': str(e)}), 500


@coordizer_api.route('/api/coordize/encode', methods=['POST'])
def encode_text():
    """
    Encode text to 64D basin coordinates.

    Request:
        {"text": "input text"}

    Response:
        {"basin": [...], "norm": float}
    """
    if not COORDIZERS_AVAILABLE:
        return jsonify({'error': 'Coordizers not available'}), 503

    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'Text is required'}), 400

        coordizer = get_coordizer()
        if coordizer is None:
            return jsonify({'error': 'Coordizer not initialized'}), 503

        basin = coordizer.encode(text)

        return jsonify({
            'basin': basin.tolist(),
            'norm': float(np.linalg.norm(basin)),
        })

    except Exception as e:
        logger.exception(f"Encode error: {e}")
        return jsonify({'error': str(e)}), 500


@coordizer_api.route('/api/coordize/decode', methods=['POST'])
def decode_basin():
    """
    Decode basin coordinates to tokens.

    Request:
        {"basin": [...], "top_k": 10}

    Response:
        {"tokens": [["token", score], ...]}
    """
    if not COORDIZERS_AVAILABLE:
        return jsonify({'error': 'Coordizers not available'}), 503

    try:
        data = request.get_json()
        basin_list = data.get('basin', [])
        top_k = data.get('top_k', 10)

        if not basin_list or len(basin_list) != 64:
            return jsonify({'error': 'Basin must be 64D vector'}), 400

        coordizer = get_coordizer()
        if coordizer is None:
            return jsonify({'error': 'Coordizer not initialized'}), 503

        basin = np.array(basin_list, dtype=np.float64)
        tokens = coordizer.decode(basin, top_k=top_k)

        return jsonify({'tokens': tokens})

    except Exception as e:
        logger.exception(f"Decode error: {e}")
        return jsonify({'error': str(e)}), 500


@coordizer_api.route('/api/coordize/stats', methods=['GET'])
def get_stats():
    """
    Get coordizer statistics.

    Response:
        {
            "vocabulary_size": int,
            "word_tokens": int,
            "basin_dimension": 64,
            "qig_pure": true
        }
    """
    if not COORDIZERS_AVAILABLE:
        return jsonify({'error': 'Coordizers not available'}), 503

    try:
        coordizer = get_coordizer()
        if coordizer is None:
            return jsonify({'error': 'Coordizer not initialized'}), 503

        stats = coordizer.get_stats()
        return jsonify(stats)

    except Exception as e:
        logger.exception(f"Stats error: {e}")
        return jsonify({'error': str(e)}), 500


@coordizer_api.route('/api/coordize/vocab', methods=['GET'])
def get_vocab():
    """
    Get vocabulary info.

    Query params:
        limit: int (default 100)
        offset: int (default 0)
        min_phi: float (default 0.0)

    Response:
        {
            "total": int,
            "tokens": [{"token": str, "phi": float}, ...]
        }
    """
    if not COORDIZERS_AVAILABLE:
        return jsonify({'error': 'Coordizers not available'}), 503

    try:
        coordizer = get_coordizer()
        if coordizer is None:
            return jsonify({'error': 'Coordizer not initialized'}), 503

        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        min_phi = request.args.get('min_phi', 0.0, type=float)

        # Get tokens with phi scores
        tokens = []
        for token, phi in sorted(coordizer.token_phi.items(), key=lambda x: -x[1]):
            if phi >= min_phi:
                tokens.append({'token': token, 'phi': phi})

        total = len(tokens)
        tokens = tokens[offset:offset + limit]

        return jsonify({
            'total': total,
            'tokens': tokens,
        })

    except Exception as e:
        logger.exception(f"Vocab error: {e}")
        return jsonify({'error': str(e)}), 500


@coordizer_api.route('/api/coordize/generate', methods=['POST'])
def generate_response():
    """
    Generate response using coordizer vocabulary.

    Request:
        {
            "context": "input context",
            "agent_role": "zeus",
            "allow_silence": false
        }

    Response:
        {
            "text": "response text",
            "phi": float,
            "completion_reason": str
        }
    """
    if not COORDIZERS_AVAILABLE:
        return jsonify({'error': 'Coordizers not available'}), 503

    try:
        data = request.get_json()
        context = data.get('context', '')
        agent_role = data.get('agent_role', 'zeus')
        allow_silence = data.get('allow_silence', False)

        if not context:
            return jsonify({'error': 'Context is required'}), 400

        coordizer = get_coordizer()
        if coordizer is None:
            return jsonify({'error': 'Coordizer not initialized'}), 503

        result = coordizer.generate_response(
            context=context,
            agent_role=agent_role,
            allow_silence=allow_silence,
        )

        return jsonify(result)

    except Exception as e:
        logger.exception(f"Generate error: {e}")
        return jsonify({'error': str(e)}), 500
