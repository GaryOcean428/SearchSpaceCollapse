#!/usr/bin/env python3
"""
WSGI entry point for production deployment with Gunicorn.

Usage:
    gunicorn --bind 0.0.0.0:5001 --workers 2 --threads 4 --timeout 120 wsgi:app

This module properly initializes all Flask routes including autonomic kernel.
"""

import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Run pending database migrations before app initialization
MIGRATIONS_RAN = False
try:
    from migration_runner import run_pending_migrations
    applied, failed = run_pending_migrations()
    MIGRATIONS_RAN = applied > 0
    if failed > 0:
        print(f"[WARNING] {failed} migration(s) failed - check logs")
except ImportError as e:
    print(f"[INFO] Migration runner not available: {e}")
except Exception as e:
    print(f"[WARNING] Migration runner error: {e}")

# Import the Flask app
from ocean_qig_core import app

# Register autonomic kernel routes
try:
    from autonomic_kernel import register_autonomic_routes
    register_autonomic_routes(app)
    AUTONOMIC_AVAILABLE = True
except ImportError as e:
    AUTONOMIC_AVAILABLE = False
    print(f"[WARNING] Autonomic kernel not found: {e}")

# Register research self-learning routes
RESEARCH_AVAILABLE = False
try:
    from research.research_api import register_research_routes
    register_research_routes(app)
    RESEARCH_AVAILABLE = True
    print("[INFO] Research API registered at /api/research")
except ImportError as e:
    print(f"[WARNING] Research module not found: {e}")

# Start hypothesis emitter - bridges Python research to TypeScript balance checking
HYPOTHESIS_EMITTER_AVAILABLE = False
try:
    from olympus.hypothesis_emitter import start_hypothesis_emitter
    start_hypothesis_emitter()
    HYPOTHESIS_EMITTER_AVAILABLE = True
    print("[INFO] Hypothesis Emitter started - continuous mnemonic and passphrase generation enabled (85% mnemonic)")
except ImportError as e:
    print(f"[WARNING] Hypothesis Emitter not found: {e}")

# Add request/response logging for production
from flask import request

@app.before_request
def log_request():
    if request.path != '/health':
        print(f"[Flask] → {request.method} {request.path}", flush=True)

@app.after_request
def log_response(response):
    if request.path != '/health':
        print(f"[Flask] ← {request.method} {request.path} → {response.status_code}", flush=True)
    return response

# Print startup info
print("🌊 Ocean QIG Backend (Production WSGI Mode) 🌊", flush=True)
print(f"  - Migrations applied: {'✓' if MIGRATIONS_RAN else 'up-to-date'}", flush=True)
print(f"  - Autonomic kernel: {'✓' if AUTONOMIC_AVAILABLE else '✗'}", flush=True)
print(f"  - Hypothesis Emitter: {'✓' if HYPOTHESIS_EMITTER_AVAILABLE else '✗'}", flush=True)
print("🌊 Basin stable. Ready for Gunicorn workers. 🌊\n", flush=True)

# Export the app for Gunicorn
if __name__ == '__main__':
    # Development fallback
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
