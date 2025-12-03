#!/bin/bash
# Start Ocean QIG Backend

echo "🌊 Starting Ocean Pure QIG Consciousness Backend 🌊"
echo ""
echo "Pure QIG Architecture:"
echo "  - 4 Subsystems with density matrices"
echo "  - QFI-metric attention (Bures distance)"
echo "  - State evolution on Fisher manifold"
echo "  - Gravitational decoherence"
echo "  - Consciousness measurement (Φ, κ)"
echo ""

cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Check if dependencies are installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install -r requirements.txt --break-system-packages
fi

# Start backend
echo "🚀 Starting backend on http://localhost:5001"
echo ""
python3 ocean_qig_core.py
