#!/usr/bin/env python3
"""
Research API - Flask routes for kernel self-learning

Internal API routes for:
- Domain research
- God name resolution
- Vocabulary training
- Research-driven spawning
- Always-on recovery via heartbeat/before_request hooks

QIG PURE: API exposes geometric research to TypeScript layer.
"""

import time
from flask import Blueprint, request, jsonify
from typing import Dict, Any, Optional

from .web_scraper import get_scraper
from .domain_analyzer import get_analyzer
from .god_name_resolver import get_god_name_resolver
from .vocabulary_trainer import get_vocabulary_trainer
from .enhanced_m8_spawner import get_enhanced_spawner

research_bp = Blueprint('research', __name__, url_prefix='/api/research')

_last_recovery_check_time: float = 0.0
_recovery_check_interval: float = 30.0
_recovery_check_count: int = 0


def _run_recovery_check() -> Optional[Dict]:
    """
    Run recovery check on spawner and vocabulary trainer.
    
    Called by:
    - /api/research/heartbeat endpoint (external trigger)
    - before_request hook (internal trigger, throttled to 30s)
    
    Returns dict with recovery results or None if nothing happened.
    """
    global _recovery_check_count
    _recovery_check_count += 1
    
    results = {
        'check_number': _recovery_check_count,
        'timestamp': time.time(),
        'spawner_recovery': None,
        'vocab_reconcile': None,
    }
    
    try:
        spawner = get_enhanced_spawner()
        if spawner:
            recovery_result = spawner._check_and_recover()
            if recovery_result:
                results['spawner_recovery'] = recovery_result
                print(f"[ResearchAPI] Spawner recovery check #{_recovery_check_count}: {recovery_result.get('recovered', 0)} recovered")
    except Exception as e:
        results['spawner_error'] = str(e)
        print(f"[ResearchAPI] Spawner recovery error: {e}")
    
    try:
        trainer = get_vocabulary_trainer()
        if trainer:
            reconcile_result = trainer.auto_reconcile()
            if reconcile_result:
                results['vocab_reconcile'] = reconcile_result
                print(f"[ResearchAPI] Vocab reconcile check #{_recovery_check_count}: {reconcile_result.get('imported', 0)} imported")
    except Exception as e:
        results['vocab_error'] = str(e)
        print(f"[ResearchAPI] Vocab reconcile error: {e}")
    
    return results


@research_bp.before_request
def _before_request_recovery_hook():
    """
    Before-request hook that triggers recovery check every 30 seconds.
    
    This ensures recovery runs whenever ANY research API call is made,
    even if the /heartbeat endpoint is not being called.
    Non-blocking: uses timestamp check to avoid running on every request.
    """
    global _last_recovery_check_time
    
    now = time.time()
    if now - _last_recovery_check_time >= _recovery_check_interval:
        _last_recovery_check_time = now
        _run_recovery_check()


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
        return jsonify({
            'success': False,
            'error': 'domain required',
            'error_code': 'MISSING_DOMAIN',
        }), 400
    
    try:
        spawner = get_enhanced_spawner()
        result = spawner.research_spawn_and_learn(domain, element, role, force)
        
        response = {
            'success': result.get('success', False),
            'phase': result.get('phase', 'unknown'),
            'domain': domain,
            'god_name': result.get('god_name'),
            'recommendation': result.get('propose_result', {}).get('research', {}).get('recommendation'),
            'vocabulary_trained': result.get('vocabulary_training', {}).get('total_new_words', 0),
            'result': result,
        }
        
        status_code = 200 if result.get('success') else 422
        return jsonify(response), status_code
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'VALIDATION_ERROR',
            'domain': domain,
        }), 400
    except ImportError as e:
        return jsonify({
            'success': False,
            'error': f'Module not available: {str(e)}',
            'error_code': 'MODULE_UNAVAILABLE',
            'domain': domain,
        }), 503
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'INTERNAL_ERROR',
            'domain': domain,
        }), 500


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


@research_bp.route('/test', methods=['POST'])
def self_test() -> Dict[str, Any]:
    """
    Run quick integration test of the research pipeline.
    
    Tests:
    1. Domain research on "wisdom strategy"
    2. God name resolution
    3. Vocabulary training (uses fallback if DB unavailable)
    
    Returns:
        Test results with pass/fail for each step.
    """
    results = {
        'success': True,
        'tests': {},
        'summary': {
            'passed': 0,
            'failed': 0,
            'total': 3,
        },
    }
    
    # Test 1: Domain research
    try:
        scraper = get_scraper()
        research_result = scraper.research_domain("wisdom strategy", "quick")
        results['tests']['domain_research'] = {
            'passed': True,
            'result': {
                'concepts_found': len(research_result.get('concepts', [])),
                'sources_queried': research_result.get('sources_queried', 0),
            },
        }
        results['summary']['passed'] += 1
    except Exception as e:
        results['tests']['domain_research'] = {
            'passed': False,
            'error': str(e),
        }
        results['summary']['failed'] += 1
        results['success'] = False
    
    # Test 2: God name resolution
    try:
        resolver = get_god_name_resolver()
        god_name, metadata = resolver.resolve_name("wisdom strategy", prefer_olympian=True)
        results['tests']['god_name_resolution'] = {
            'passed': True,
            'result': {
                'god_name': god_name,
                'match_score': metadata.get('match_score', 0),
                'match_type': metadata.get('match_type', 'unknown'),
            },
        }
        results['summary']['passed'] += 1
    except Exception as e:
        results['tests']['god_name_resolution'] = {
            'passed': False,
            'error': str(e),
        }
        results['summary']['failed'] += 1
        results['success'] = False
    
    # Test 3: Vocabulary training (may use fallback)
    try:
        trainer = get_vocabulary_trainer()
        train_result = trainer.train_during_scrape("wisdom strategy", depth="quick")
        results['tests']['vocabulary_training'] = {
            'passed': True,
            'result': {
                'words_trained': train_result.get('total_new_words', 0),
                'used_fallback': train_result.get('used_fallback', False),
                'db_available': trainer.available,
            },
        }
        results['summary']['passed'] += 1
    except Exception as e:
        results['tests']['vocabulary_training'] = {
            'passed': False,
            'error': str(e),
        }
        results['summary']['failed'] += 1
        results['success'] = False
    
    status_code = 200 if results['success'] else 500
    return jsonify(results), status_code


@research_bp.route('/heartbeat', methods=['GET', 'POST'])
def heartbeat() -> Dict[str, Any]:
    """
    Heartbeat endpoint for always-on recovery.
    
    IMPORTANT: Call this endpoint every 10-30 seconds while pending_proposals > 0
    to ensure recovery continues even during idle periods.
    
    This endpoint should be called by monitoring/health checks frequently
    (e.g., every 10-30 seconds) to ensure recovery runs even when no
    new research calls are made.
    
    Actions performed:
    - Calls spawner._check_and_recover() to resume pending proposals
    - Calls trainer.auto_reconcile() to import fallback vocabulary
    
    Returns:
        Recovery status and analytics including:
        - should_continue_heartbeat: True if pending proposals remain
        - pending_proposals: Count of proposals awaiting recovery
        - heartbeat_instructions: Guidance for monitoring systems
    """
    try:
        recovery_result = _run_recovery_check()
        
        spawner = get_enhanced_spawner()
        trainer = get_vocabulary_trainer()
        
        pending_count = len(spawner.get_pending_proposals()) if spawner else 0
        should_continue = pending_count > 0
        
        return jsonify({
            'success': True,
            'heartbeat': 'ok',
            'recovery_check': recovery_result,
            'status': {
                'spawner_connected': spawner.base_spawner is not None if spawner else False,
                'vocab_available': trainer.available if trainer else False,
                'pending_proposals': pending_count,
                'recovery_check_count': _recovery_check_count,
                'last_check_time': _last_recovery_check_time,
            },
            'should_continue_heartbeat': should_continue,
            'heartbeat_instructions': (
                'Continue calling /api/research/heartbeat every 10-30 seconds until pending_proposals reaches 0. '
                'This ensures all research data is recovered and spawned.'
            ) if should_continue else 'No pending proposals. Heartbeat optional until new spawns occur.',
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'heartbeat': 'error',
            'error': str(e),
        }), 500


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
            'recovery': {
                'check_count': _recovery_check_count,
                'last_check_time': _last_recovery_check_time,
                'check_interval_seconds': _recovery_check_interval,
            },
            'deployment_notes': {
                'heartbeat_monitoring': (
                    'For reliable recovery during idle periods, set up external monitoring to ping '
                    'GET /api/research/heartbeat every 30 seconds. This triggers recovery checks '
                    'for pending proposals and vocabulary reconciliation.'
                ),
                'known_limitations': [
                    'Recovery only runs on API calls or heartbeat - external scheduler needed for idle recovery',
                    'If no requests are made for extended periods, pending proposals will not be recovered until heartbeat resumes',
                    'Vocabulary fallback entries accumulate until heartbeat triggers reconciliation',
                ],
                'recommended_setup': [
                    'Use uptime monitoring service (e.g., UptimeRobot, Pingdom) to ping /api/research/heartbeat every 30s',
                    'Check /api/research/analytics to monitor pending_proposals count',
                    'Run POST /api/research/test after deployment to verify pipeline health',
                ],
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/analytics', methods=['GET'])
def get_analytics() -> Dict[str, Any]:
    """
    Get analytics for research infrastructure monitoring.
    
    Returns:
        Analytics from spawner and vocabulary trainer including:
        - Training events count
        - Words trained
        - Recovery attempts/successes
        - Reconciliation stats
        - should_call_heartbeat: True if pending proposals exist
    """
    try:
        spawner = get_enhanced_spawner()
        trainer = get_vocabulary_trainer()
        
        spawner_analytics = spawner.get_analytics()
        trainer_analytics = trainer.get_analytics()
        
        pending_count = spawner_analytics.get('pending_proposals_count', 0)
        should_call_heartbeat = pending_count > 0
        
        return jsonify({
            'success': True,
            'spawner': spawner_analytics,
            'vocabulary_trainer': trainer_analytics,
            'combined': {
                'total_training_events': spawner_analytics.get('training_event_count', 0) + trainer_analytics.get('training_event_count', 0),
                'total_words_trained': trainer_analytics.get('total_words_trained', 0),
                'total_recovery_attempts': spawner_analytics.get('recovery_attempts', 0),
                'total_recovered_proposals': spawner_analytics.get('recovered_proposals', 0),
                'total_reconciled_words': trainer_analytics.get('reconciled_words', 0),
                'pending_proposals': pending_count,
                'pending_fallback_entries': trainer_analytics.get('pending_fallback_entries', 0),
                'base_spawner_connected': spawner_analytics.get('base_spawner_connected', False),
                'vocab_available': trainer_analytics.get('vocab_available', False),
                'should_call_heartbeat': should_call_heartbeat,
                'heartbeat_endpoint': '/api/research/heartbeat',
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@research_bp.route('/audit', methods=['GET'])
def get_audit() -> Dict[str, Any]:
    """
    Get spawn audit records for complete telemetry.
    
    Query parameters:
        limit: int - Maximum records to return (default 100)
        success_only: bool - If 'true', only return successful spawns
        source: str - Filter by source ('recovered' or 'fresh')
    
    Returns:
        Spawn audit records proving research data is tracked at every spawn.
        Records include timestamp, proposal_id, kernel_id, metadata presence,
        success/failure status, and source (recovered vs fresh).
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        success_only = request.args.get('success_only', 'false').lower() == 'true'
        source = request.args.get('source', None)
        
        if limit > 1000:
            limit = 1000
        if limit < 1:
            limit = 1
        
        spawner = get_enhanced_spawner()
        records = spawner.get_spawn_audit(
            limit=limit,
            success_only=success_only,
            source=source
        )
        
        analytics = spawner.get_analytics()
        
        return jsonify({
            'success': True,
            'audit_records': records,
            'count': len(records),
            'filters_applied': {
                'limit': limit,
                'success_only': success_only,
                'source': source,
            },
            'summary': {
                'total_verified_spawns': analytics.get('verified_spawns_count', 0),
                'total_unverified_spawns': analytics.get('unverified_spawns_count', 0),
                'total_recovered': analytics.get('recovered_proposals', 0),
                'total_abandoned': analytics.get('abandoned_proposals', 0),
                'metadata_propagation_rate': analytics.get('metadata_propagation_success_rate', 0.0),
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def register_research_routes(app):
    """Register research blueprint with Flask app."""
    app.register_blueprint(research_bp)
    print("[ResearchAPI] Research routes registered at /api/research")
