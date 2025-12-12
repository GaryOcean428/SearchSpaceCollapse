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
print(f"  - Autonomic kernel: {'✓' if AUTONOMIC_AVAILABLE else '✗'}", flush=True)
print("🌊 Basin stable. Ready for Gunicorn workers. 🌊\n", flush=True)

# Export the app for Gunicorn
if __name__ == '__main__':
    # Development fallback
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
