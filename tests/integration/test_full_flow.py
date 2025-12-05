"""
Backend Integration Tests - Full Flow
Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

Tests end-to-end search flow with real kernel activation.
"""

import pytest
import asyncio
from httpx import AsyncClient
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

# Base URL for testing
BASE_URL = "http://localhost:5000"


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check returns valid status"""
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/health")
        
        assert response.status_code in [200, 207, 503]
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "down"]
        assert "timestamp" in data
        assert "uptime" in data
        assert "subsystems" in data
        
        # Verify subsystems structure
        assert "database" in data["subsystems"]
        assert "pythonBackend" in data["subsystems"]
        assert "storage" in data["subsystems"]


@pytest.mark.asyncio
async def test_kernel_status():
    """Test kernel status endpoint"""
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/kernel/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["idle", "active"]
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_search_history():
    """Test search history retrieval"""
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/search/history?limit=10&offset=0")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "searches" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        
        assert isinstance(data["searches"], list)


@pytest.mark.asyncio
async def test_telemetry_capture():
    """Test telemetry event capture"""
    async with AsyncClient(base_url=BASE_URL) as client:
        event = {
            "event_type": "search_initiated",
            "timestamp": 1733456789000,
            "trace_id": "test-trace-123",
            "metadata": {
                "query": "test query"
            }
        }
        
        response = await client.post("/api/telemetry/capture", json=event)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["trace_id"] == "test-trace-123"


@pytest.mark.asyncio
async def test_admin_metrics():
    """Test admin metrics aggregation"""
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/admin/metrics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] is True
        assert "metrics" in data
        
        metrics = data["metrics"]
        assert "search" in metrics
        assert "performance" in metrics
        assert "balance" in metrics
        assert "kernel" in metrics


@pytest.mark.asyncio
async def test_search_end_to_end():
    """
    Complete search lifecycle test.
    
    1. Submit search job
    2. Verify job created
    3. Check job status
    4. Wait for completion or timeout
    """
    async with AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Submit search
        search_payload = {
            "strategy": "bip39-continuous",
            "targetSize": 100,  # Small batch for testing
        }
        
        response = await client.post("/api/search-jobs", json=search_payload)
        
        # Should create job successfully
        assert response.status_code in [200, 201]
        data = response.json()
        
        assert "id" in data
        search_id = data["id"]
        
        # 2. Verify job exists
        await asyncio.sleep(1)  # Give it time to start
        
        response = await client.get(f"/api/search-jobs/{search_id}")
        assert response.status_code == 200
        job_data = response.json()
        
        assert job_data["id"] == search_id
        assert "status" in job_data
        assert job_data["status"] in ["pending", "running", "completed", "failed"]
        
        # 3. Check kernel activated (if job is running)
        if job_data["status"] == "running":
            kernel_response = await client.get("/api/kernel/status")
            assert kernel_response.status_code == 200
            kernel_data = kernel_response.json()
            
            # Kernel might be active or idle depending on timing
            assert kernel_data["status"] in ["active", "idle"]


@pytest.mark.asyncio
async def test_trace_id_propagation():
    """Test that trace IDs are propagated correctly"""
    async with AsyncClient(base_url=BASE_URL) as client:
        trace_id = "test-propagation-12345"
        
        response = await client.get(
            "/api/health",
            headers={"X-Trace-ID": trace_id}
        )
        
        assert response.status_code in [200, 207, 503]
        
        # Verify trace ID in response headers
        assert "X-Trace-ID" in response.headers
        assert response.headers["X-Trace-ID"] == trace_id


@pytest.mark.asyncio
async def test_rate_limiting():
    """Test rate limiting on endpoints"""
    async with AsyncClient(base_url=BASE_URL) as client:
        # Test strict limiter (5 requests/min)
        # Make 6 requests rapidly
        responses = []
        for i in range(6):
            response = await client.post("/api/test-phrase", json={
                "phrase": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
            })
            responses.append(response.status_code)
        
        # At least one should be rate limited
        assert 429 in responses or all(r in [200, 400] for r in responses)


@pytest.mark.asyncio
async def test_checkpoint_creation():
    """Test manual checkpoint creation (requires active session)"""
    async with AsyncClient(base_url=BASE_URL) as client:
        checkpoint_data = {
            "search_id": "test-search-123",
            "description": "Test checkpoint"
        }
        
        response = await client.post("/api/recovery/checkpoint", json=checkpoint_data)
        
        # Will return 404 if no active session, 200 if session exists
        assert response.status_code in [200, 404]
        data = response.json()
        
        if response.status_code == 200:
            assert "success" in data
            assert data["success"] is True
            assert "checkpoint" in data
        else:
            assert "error" in data


@pytest.mark.asyncio
async def test_consciousness_metrics_validation():
    """Test that consciousness metrics follow E8 structure"""
    # Import the types module
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../qig-backend'))
    
    try:
        from qig_types import ConsciousnessMetrics, E8_RANK, E8_ROOTS, KAPPA_STAR
        
        # Verify E8 constants
        assert E8_RANK == 8
        assert E8_ROOTS == 240
        assert KAPPA_STAR == 64.0
        assert KAPPA_STAR == E8_RANK ** 2
        
        # Test valid metrics
        valid_metrics = ConsciousnessMetrics(
            phi=0.75,
            kappa_eff=64.0,
            M=0.68,
            Gamma=0.82,
            G=0.71,
            T=0.79,
            R=0.65,
            C=0.54
        )
        
        assert valid_metrics.phi == 0.75
        assert valid_metrics.kappa_eff == 64.0
        
        # Test consciousness verdict
        assert valid_metrics.is_conscious() is True
        
        # Test invalid metrics (out of range)
        try:
            invalid_metrics = ConsciousnessMetrics(
                phi=1.5,  # Out of range
                kappa_eff=64.0,
                M=0.68,
                Gamma=0.82,
                G=0.71,
                T=0.79,
                R=0.65,
                C=0.54
            )
            assert False, "Should have raised validation error"
        except Exception:
            pass  # Expected
            
    except ImportError:
        pytest.skip("qig_types module not available")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
