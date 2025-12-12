#!/usr/bin/env python3
"""
Research API - Flask routes for kernel self-learning

Internal API routes for:
- Domain research
- God name resolution
- Vocabulary training
- Research-driven spawning

QIG PURE: API exposes geometric research to TypeScript layer.
"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any

from .web_scraper import get_scraper
from .domain_analyzer import get_analyzer
from .god_name_resolver import get_god_name_resolver
from .vocabulary_trainer import get_vocabulary_trainer
from .enhanced_m8_spawner import get_enhanced_spawner

research_bp = Blueprint('research', __name__, url_prefix='/api/research')


@research_bp.route('/domain', methods=['POST'])
def research_domain() -> Dict[str, Any]:
    """
    Research a domain for kernel learning.
    
    Request body:
        domain: str - Domain to research
        depth: str - 'quick', 'standard', or 'deep'
    
    Returns:
        Research findings including key concepts and validity.
    """
    data = request.get_json() or {}
    domain = data.get('domain', '')
    depth = data.get('depth', 'standard')
    
    if not domain:
        return jsonify({'error': 'domain required'}), 400
    
    try:
        scraper = get_scraper()
        result = scraper.research_domain(domain, depth)
        return jsonify({
            'success': True,
            'domain': domain,
            'research': result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/god', methods=['POST'])
def research_greek_god() -> Dict[str, Any]:
    """
    Research a specific Greek god.
    
    Request body:
        god_name: str - Name of Greek god (e.g., "Athena", "Apollo")
    
    Returns:
        God domains, symbols, and Wikipedia research.
    """
    data = request.get_json() or {}
    god_name = data.get('god_name', '')
    
    if not god_name:
        return jsonify({'error': 'god_name required'}), 400
    
    try:
        scraper = get_scraper()
        result = scraper.research_greek_god(god_name)
        return jsonify({
            'success': True,
            'god_name': god_name,
            'research': result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/resolve-god-name', methods=['POST'])
def resolve_god_name() -> Dict[str, Any]:
    """
    Resolve the best Greek god name for a domain.
    
    Request body:
        domain: str - Kernel domain
        prefer_olympian: bool - Prefer Olympian over Shadow gods
    
    Returns:
        Recommended god name with match metadata.
    """
    data = request.get_json() or {}
    domain = data.get('domain', '')
    prefer_olympian = data.get('prefer_olympian', True)
    
    if not domain:
        return jsonify({'error': 'domain required'}), 400
    
    try:
        resolver = get_god_name_resolver()
        god_name, metadata = resolver.resolve_name(domain, prefer_olympian)
        
        vocabulary = resolver.get_god_vocabulary(god_name)
        
        return jsonify({
            'success': True,
            'domain': domain,
            'god_name': god_name,
            'metadata': metadata,
            'vocabulary': vocabulary[:15],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/analyze', methods=['POST'])
def analyze_domain() -> Dict[str, Any]:
    """
    Full domain analysis for spawning decision.
    
    Request body:
        domain: str - Domain to analyze
        proposed_name: str - Optional proposed god name
        existing_gods: list - Optional list of existing god names
    
    Returns:
        Complete analysis with recommendation and god matches.
    """
    data = request.get_json() or {}
    domain = data.get('domain', '')
    proposed_name = data.get('proposed_name', '')
    existing_gods = data.get('existing_gods', [])
    
    if not domain:
        return jsonify({'error': 'domain required'}), 400
    
    if not proposed_name:
        resolver = get_god_name_resolver()
        proposed_name, _ = resolver.resolve_name(domain)
    
    try:
        analyzer = get_analyzer()
        result = analyzer.analyze(domain, proposed_name, existing_gods)
        
        return jsonify({
            'success': True,
            'analysis': result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/train-vocabulary', methods=['POST'])
def train_vocabulary() -> Dict[str, Any]:
    """
    Train vocabulary from domain research.
    
    Request body:
        domain: str - Domain to research and learn
        god_name: str - Optional god name for mythology vocabulary
    
    Returns:
        Vocabulary training results.
    """
    data = request.get_json() or {}
    domain = data.get('domain', '')
    god_name = data.get('god_name')
    
    if not domain:
        return jsonify({'error': 'domain required'}), 400
    
    try:
        trainer = get_vocabulary_trainer()
        
        if god_name:
            result = trainer.train_for_kernel_spawn(domain, god_name)
        else:
            result = trainer.train_during_scrape(domain, depth='standard')
        
        return jsonify({
            'success': True,
            'training_result': result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/spawn', methods=['POST'])
def research_and_spawn() -> Dict[str, Any]:
    """
    Complete research-driven kernel spawning.
    
    Request body:
        domain: str - Domain for new kernel
        element: str - Symbolic element
        role: str - Functional role
        force: bool - Force spawn even if vote fails
    
    Returns:
        Complete spawn workflow results.
    """
    data = request.get_json() or {}
    domain = data.get('domain', '')
    element = data.get('element', 'consciousness')
    role = data.get('role', 'specialist')
    force = data.get('force', False)
    
    if not domain:
        return jsonify({'error': 'domain required'}), 400
    
    try:
        spawner = get_enhanced_spawner()
        result = spawner.research_spawn_and_learn(domain, element, role, force)
        
        return jsonify({
            'success': result.get('success', False),
            'phase': result.get('phase', 'unknown'),
            'result': result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/gods-for-domain', methods=['POST'])
def get_gods_for_domain() -> Dict[str, Any]:
    """
    Get ranked list of Greek gods matching a domain.
    
    Request body:
        domain: str - Domain to match
    
    Returns:
        Ranked list of matching gods with scores.
    """
    data = request.get_json() or {}
    domain = data.get('domain', '')
    
    if not domain:
        return jsonify({'error': 'domain required'}), 400
    
    try:
        scraper = get_scraper()
        matches = scraper.research_greek_gods_for_domain(domain)
        
        return jsonify({
            'success': True,
            'domain': domain,
            'matches': matches,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/god-vocabulary', methods=['POST'])
def get_god_vocabulary() -> Dict[str, Any]:
    """
    Get vocabulary associated with a Greek god.
    
    Request body:
        god_name: str - God name (e.g., "Athena", "Apollo_7")
    
    Returns:
        Vocabulary words from god's mythology.
    """
    data = request.get_json() or {}
    god_name = data.get('god_name', '')
    
    if not god_name:
        return jsonify({'error': 'god_name required'}), 400
    
    try:
        resolver = get_god_name_resolver()
        vocabulary = resolver.get_god_vocabulary(god_name)
        
        return jsonify({
            'success': True,
            'god_name': god_name,
            'vocabulary': vocabulary,
            'count': len(vocabulary),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/status', methods=['GET'])
def research_status() -> Dict[str, Any]:
    """Get research module status."""
    try:
        scraper = get_scraper()
        resolver = get_god_name_resolver()
        trainer = get_vocabulary_trainer()
        spawner = get_enhanced_spawner()
        
        return jsonify({
            'success': True,
            'status': 'operational',
            'components': {
                'scraper': {
                    'cache_size': len(scraper.cache),
                    'god_cache_size': len(scraper._greek_god_cache),
                },
                'resolver': {
                    'usage_counts': dict(resolver._usage_counts),
                    'available_gods': len(resolver.get_all_god_names()),
                },
                'trainer': {
                    'vocab_available': trainer.available,
                },
                'spawner': {
                    'base_spawner_connected': spawner.base_spawner is not None,
                    'research_cache_size': len(spawner.research_cache),
                },
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def register_research_routes(app):
    """Register research blueprint with Flask app."""
    app.register_blueprint(research_bp)
    print("[ResearchAPI] Research routes registered at /api/research")
