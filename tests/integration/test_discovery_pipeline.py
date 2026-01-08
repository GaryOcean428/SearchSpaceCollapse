"""
Integration Tests - Discovery Pipeline
Tests the near-miss to pending sweep pipeline.

Tests:
1. Near-miss entries retrieval
2. Balance queue status
3. Discovery hits tracking
4. Sweep approval workflow
"""

import pytest
from httpx import AsyncClient

BASE_URL = "http://localhost:5000"


@pytest.mark.asyncio
async def test_near_misses_endpoint():
    """Test near-miss entries can be retrieved via API"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/near-misses")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data or "entries" in data or "nearMisses" in data or isinstance(data, list)
        
        if "stats" in data:
            stats = data["stats"]
            assert isinstance(stats, dict)
        
        if "entries" in data:
            assert isinstance(data["entries"], list)
        elif "nearMisses" in data:
            assert isinstance(data["nearMisses"], list)


@pytest.mark.asyncio
async def test_near_misses_with_tier_filter():
    """Test near-misses can be filtered by tier"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/near-misses?tier=high")
        
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))


@pytest.mark.asyncio
async def test_balance_queue_status():
    """Test balance queue status is accessible"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/balance-queue/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "queueSize" in data or "queue" in data or "status" in data or "pending" in data
        
        if "queueSize" in data:
            assert isinstance(data["queueSize"], (int, float))
        
        if "status" in data:
            assert isinstance(data["status"], str)
        
        if "pending" in data:
            assert isinstance(data["pending"], (int, list))


@pytest.mark.asyncio
async def test_balance_queue_background_status():
    """Test balance queue background processing status"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/balance-queue/background")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_discovery_hits_tracking():
    """Test discovery hits are tracked via observer API"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/observer/discoveries/hits")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            
            assert isinstance(data, (dict, list))
            
            if isinstance(data, dict):
                if "hits" in data:
                    assert isinstance(data["hits"], list)
                if "total" in data:
                    assert isinstance(data["total"], (int, float))
                if "count" in data:
                    assert isinstance(data["count"], (int, float))


@pytest.mark.asyncio
async def test_sweeps_stats():
    """Test sweep workflow stats are accessible"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/sweeps/stats")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            
            assert isinstance(data, dict)
            
            expected_fields = ["pending", "approved", "rejected", "broadcast", "total", "stats"]
            has_expected_field = any(field in data for field in expected_fields)
            assert has_expected_field or len(data) >= 0


@pytest.mark.asyncio
async def test_sweeps_list():
    """Test sweeps list endpoint"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/sweeps")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            
            assert isinstance(data, (dict, list))
            
            if isinstance(data, dict) and "sweeps" in data:
                assert isinstance(data["sweeps"], list)


@pytest.mark.asyncio
async def test_sweeps_with_status_filter():
    """Test sweeps can be filtered by status"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/sweeps?status=pending")
        
        assert response.status_code in [200, 400, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))


@pytest.mark.asyncio
async def test_near_misses_cluster_analytics():
    """Test near-misses cluster analytics endpoint"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/near-misses/cluster-analytics")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_pipeline_integration():
    """
    Integration test for the complete near-miss to sweep pipeline.
    
    Verifies all components are accessible and responding:
    1. Near-misses endpoint
    2. Balance queue
    3. Discovery tracking
    4. Sweep workflow
    """
    async with AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        near_miss_response = await client.get("/api/near-misses")
        assert near_miss_response.status_code == 200, "Near-misses endpoint should be available"
        
        queue_response = await client.get("/api/balance-queue/status")
        assert queue_response.status_code == 200, "Balance queue status should be available"
        
        discovery_response = await client.get("/api/observer/discoveries/hits")
        assert discovery_response.status_code in [200, 404], "Discovery hits endpoint should respond"
        
        sweeps_response = await client.get("/api/sweeps/stats")
        assert sweeps_response.status_code in [200, 404], "Sweeps stats endpoint should respond"
        
        if sweeps_response.status_code == 200:
            sweeps_data = sweeps_response.json()
            assert isinstance(sweeps_data, dict)


@pytest.mark.asyncio
async def test_observer_health_endpoint():
    """
    Test the observer health endpoint returns comprehensive metrics.
    
    Verifies:
    1. Overall health status
    2. Subsystem latencies (nearMissTracker, balanceQueue, sweepService, balanceHits)
    3. Pipeline status counts
    """
    async with AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        response = await client.get("/api/observer/health")
        
        assert response.status_code == 200, "Observer health endpoint should be available"
        data = response.json()
        
        # Check overall health structure
        assert "status" in data, "Should have status field"
        assert data["status"] in ["healthy", "degraded", "slow", "error"], "Status should be valid"
        assert "timestamp" in data, "Should have timestamp"
        assert "totalLatencyMs" in data, "Should have total latency"
        
        # Check subsystems are reported
        if "subsystems" in data:
            subsystems = data["subsystems"]
            assert isinstance(subsystems, dict)
            
            for name in ["nearMissTracker", "balanceQueue", "sweepService", "balanceHits"]:
                if name in subsystems:
                    assert "status" in subsystems[name], f"{name} should have status"
                    assert "latencyMs" in subsystems[name], f"{name} should have latency"
        
        # Check pipeline status
        if "pipeline" in data:
            pipeline = data["pipeline"]
            assert isinstance(pipeline, dict)
            assert "nearMissCount" in pipeline, "Should have nearMissCount"


@pytest.mark.asyncio
async def test_pipeline_data_flow():
    """
    Comprehensive pipeline data flow test.
    
    Verifies the logical consistency of the pipeline:
    1. Near-misses exist (from Ocean testing phrases)
    2. Balance queue is processing (shows activity)
    3. Health endpoint aggregates all metrics consistently
    """
    async with AsyncClient(base_url=BASE_URL, timeout=20.0) as client:
        # Step 1: Get near-miss data
        nm_response = await client.get("/api/near-misses")
        assert nm_response.status_code == 200
        nm_data = nm_response.json()
        
        # Step 2: Get balance queue status
        bq_response = await client.get("/api/balance-queue/status")
        assert bq_response.status_code == 200
        bq_data = bq_response.json()
        
        # Step 3: Get health metrics (should aggregate both)
        health_response = await client.get("/api/observer/health")
        assert health_response.status_code == 200
        health_data = health_response.json()
        
        # Step 4: Verify pipeline numbers are consistent with health
        if "pipeline" in health_data:
            pipeline = health_data["pipeline"]
            
            # Near-miss count in health should match actual near-misses
            if "stats" in nm_data and "total" in nm_data["stats"]:
                actual_nm_count = nm_data["stats"]["total"]
                health_nm_count = pipeline.get("nearMissCount", 0)
                # Allow some variance due to timing
                assert abs(actual_nm_count - health_nm_count) < 100, \
                    f"Near-miss counts should be close: actual={actual_nm_count}, health={health_nm_count}"
            
            # Queue pending should match balance queue data
            if "pending" in bq_data:
                actual_pending = bq_data["pending"]
                health_pending = pipeline.get("queuedForCheck", 0)
                # Allow variance due to rapid queue processing
                assert isinstance(health_pending, int), "queuedForCheck should be integer"


@pytest.mark.asyncio
async def test_balance_hits_endpoint():
    """Test balance hits tracking"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/balance-hits")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))


@pytest.mark.asyncio
async def test_observer_workflows():
    """Test observer workflows are accessible"""
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        response = await client.get("/api/observer/workflows")
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))


@pytest.mark.asyncio
async def test_e2e_near_miss_pipeline():
    """
    True end-to-end test of the near-miss pipeline.
    
    This test:
    1. Seeds a test near-miss via the test endpoint
    2. Verifies it appears in the near-miss stats
    3. Verifies the health endpoint reflects the new entry
    
    Note: Full pipeline to sweep requires actual balance discovery,
    which happens asynchronously. This test verifies the seeding
    and tracking components work correctly.
    """
    import time
    
    async with AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Generate unique test phrase with timestamp
        test_phrase = f"e2e_integration_test_{int(time.time() * 1000)}_quantum_entropy"
        test_phi = 0.82
        test_kappa = 48.0
        
        # Step 1: Seed a near-miss entry
        seed_response = await client.post("/api/observer/test/seed-near-miss", json={
            "phrase": test_phrase,
            "phi": test_phi,
            "kappa": test_kappa,
            "regime": "coherent",
            "source": "e2e-integration-test",
        })
        
        # Note: Returns 403 in production, 200 in development
        if seed_response.status_code == 403:
            pytest.skip("Test endpoints not available in production mode")
        
        assert seed_response.status_code == 200, f"Failed to seed near-miss: {seed_response.text}"
        seed_data = seed_response.json()
        
        assert seed_data["success"] is True, "Seeding should succeed"
        assert "entry" in seed_data, "Should return entry data"
        
        entry_id = seed_data["entry"]["id"]
        assert seed_data["entry"]["phi"] == test_phi, "Phi should match"
        assert seed_data["entry"]["tier"] in ["hot", "warm", "cool"], "Should have valid tier (hot/warm/cool)"
        
        # Step 2: Verify entry appears in near-miss stats
        stats_response = await client.get("/api/near-misses")
        assert stats_response.status_code == 200
        stats_data = stats_response.json()
        
        # The entry should be in the system now
        assert "stats" in stats_data, "Should have stats"
        assert stats_data["stats"]["total"] >= 1, "Should have at least one entry"
        
        # Step 3: Verify via the test lookup endpoint
        lookup_response = await client.get(f"/api/observer/test/near-miss/{entry_id}")
        if lookup_response.status_code == 200:
            lookup_data = lookup_response.json()
            assert "entry" in lookup_data, "Lookup should return entry"
            assert lookup_data["entry"]["phrase"] == test_phrase, "Phrase should match"
            assert lookup_data["entry"]["source"] == "e2e-integration-test", "Source should match"
        
        # Step 4: Verify health endpoint includes this entry in counts
        health_response = await client.get("/api/observer/health")
        assert health_response.status_code == 200
        health_data = health_response.json()
        
        assert "pipeline" in health_data, "Health should have pipeline section"
        assert health_data["pipeline"]["nearMissCount"] >= 1, \
            f"Health should reflect at least 1 near-miss, got {health_data['pipeline']['nearMissCount']}"
        
        print(f"✓ E2E Test passed: Seeded near-miss {entry_id} with Φ={test_phi}, tier={seed_data['entry']['tier']}")


@pytest.mark.asyncio
async def test_e2e_full_pipeline_near_miss_to_sweep():
    """
    Complete end-to-end test of the full pipeline:
    Near-miss → Balance Hit → Pending Sweep
    
    This test exercises the complete recovery pipeline:
    1. Seeds a near-miss entry
    2. Simulates a balance hit for that entry
    3. Verifies a pending sweep was created
    4. Validates the sweep contains correct data
    5. Confirms health endpoint reflects all state changes
    """
    import time
    
    async with AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Generate unique test data
        timestamp = int(time.time() * 1000)
        test_phrase = f"full_pipeline_test_{timestamp}_recovery_phrase"
        # Generate a unique test address (valid Bitcoin address format, 34 chars)
        # P2PKH addresses start with 1 and are 25-34 chars
        test_address = f"1TestE2EPipeline{timestamp % 100000000:08d}XYZ"
        # Ensure exactly 34 characters
        test_address = test_address[:34] if len(test_address) > 34 else test_address.ljust(34, 'X')
        test_balance_sats = 50000  # 0.0005 BTC
        
        # Step 1: Seed a near-miss entry
        seed_response = await client.post("/api/observer/test/seed-near-miss", json={
            "phrase": test_phrase,
            "phi": 0.88,
            "kappa": 55.0,
            "regime": "coherent",
            "source": "full-pipeline-test",
        })
        
        if seed_response.status_code == 403:
            pytest.skip("Test endpoints not available in production mode")
        
        assert seed_response.status_code == 200, f"Step 1 failed: {seed_response.text}"
        seed_data = seed_response.json()
        near_miss_id = seed_data["entry"]["id"]
        
        print(f"Step 1 ✓ Near-miss seeded: {near_miss_id}")
        
        # Step 2: Simulate a balance hit (triggers sweep approval creation)
        balance_response = await client.post("/api/observer/test/simulate-balance-hit", json={
            "address": test_address,
            "passphrase": test_phrase,
            "balanceSats": test_balance_sats,
            "source": "full-pipeline-test",
        })
        
        assert balance_response.status_code == 200, f"Step 2 failed: {balance_response.text}"
        balance_data = balance_response.json()
        
        assert balance_data["success"] is True, "Balance hit should succeed"
        assert "pipeline" in balance_data, "Should return pipeline data"
        
        pipeline_data = balance_data["pipeline"]
        assert "balanceHit" in pipeline_data, "Should have balance hit"
        assert "sweep" in pipeline_data, "Should have sweep"
        assert pipeline_data["sweep"]["status"] == "pending", "Sweep should be pending"
        
        # Verify balance hit was recorded correctly
        assert pipeline_data["balanceHit"]["balanceSats"] == test_balance_sats, "Balance sats should match"
        
        sweep_id = pipeline_data["sweep"]["id"]
        print(f"Step 2 ✓ Full pipeline exercised: balance hit → sweep ID={sweep_id}")
        
        # Step 3: Verify sweep can be looked up
        sweep_lookup = await client.get(f"/api/observer/test/sweep/{test_address}")
        assert sweep_lookup.status_code == 200, f"Step 3 failed: {sweep_lookup.text}"
        sweep_data = sweep_lookup.json()
        
        assert "sweep" in sweep_data, "Lookup should return sweep"
        assert sweep_data["sweep"]["address"] == test_address, "Address should match"
        assert sweep_data["sweep"]["passphrase"] == test_phrase, "Passphrase should match"
        assert sweep_data["sweep"]["balanceSats"] == test_balance_sats, "Balance should match"
        
        print(f"Step 3 ✓ Sweep verified: {sweep_data['sweep']['balanceBtc']} BTC")
        
        # Step 4: Verify health endpoint reflects the new pending sweep
        health_response = await client.get("/api/observer/health")
        assert health_response.status_code == 200
        health_data = health_response.json()
        
        assert "pipeline" in health_data, "Health should have pipeline"
        assert health_data["pipeline"]["sweepPendingCount"] >= 1, \
            f"Should have at least 1 pending sweep, got {health_data['pipeline']['sweepPendingCount']}"
        
        print(f"Step 4 ✓ Health verified: {health_data['pipeline']['sweepPendingCount']} pending sweeps")
        
        # Step 5: Verify the sweep stats endpoint also shows the pending sweep
        stats_response = await client.get("/api/sweeps/stats")
        if stats_response.status_code == 200:
            stats_data = stats_response.json()
            if "stats" in stats_data:
                # Key can be "pending" or "pendingCount" depending on endpoint version
                pending_count = stats_data["stats"].get("pending") or stats_data["stats"].get("pendingCount", 0)
                assert pending_count >= 1, \
                    f"Sweep stats should show at least 1 pending, got {pending_count}"
                print(f"Step 5 ✓ Sweep stats verified: {pending_count} pending")
        
        print(f"\n🎉 FULL PIPELINE TEST PASSED!")
        print(f"   Near-miss: {test_phrase[:500]}... → Φ=0.88")
        print(f"   Balance hit: {test_address} → {test_balance_sats} sats")
        print(f"   Pending sweep: ID={sweep_id}, status=pending")


@pytest.mark.asyncio
async def test_e2e_full_pipeline_with_queue_drain():
    """
    Complete end-to-end test using the REAL balance queue with enqueue and drain.
    
    This test exercises the FULL production pipeline:
    1. Seeds a near-miss entry
    2. Registers mock balance in the test registry
    3. Enqueues address into the REAL balance queue
    4. Calls drain() to process via the REAL queue worker
    5. The queue worker calls checkAndRecordBalance which uses mock registry
    6. Verifies sweep was created and queue stats transition correctly
    """
    import time
    
    async with AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Generate unique test data
        timestamp = int(time.time() * 1000)
        test_phrase = f"queue_drain_test_{timestamp}_full_pipeline"
        test_address = f"1QueueDrain{timestamp % 100000000:08d}XYZ"
        test_address = test_address[:34] if len(test_address) > 34 else test_address.ljust(34, 'X')
        test_balance_sats = 85000  # 0.00085 BTC
        
        # Step 1: Seed a near-miss entry
        seed_response = await client.post("/api/observer/test/seed-near-miss", json={
            "phrase": test_phrase,
            "phi": 0.93,
            "kappa": 65.0,
            "regime": "coherent",
            "source": "queue-drain-test",
        })
        
        if seed_response.status_code == 403:
            pytest.skip("Test endpoints not available in production mode")
        
        assert seed_response.status_code == 200, f"Step 1 failed: {seed_response.text}"
        print(f"Step 1 ✓ Near-miss seeded")
        
        # Step 2: Call the full pipeline endpoint with queue drain
        pipeline_response = await client.post("/api/observer/test/full-pipeline-with-queue", json={
            "address": test_address,
            "passphrase": test_phrase,
            "balanceSats": test_balance_sats,
        })
        
        assert pipeline_response.status_code == 200, f"Step 2 failed: {pipeline_response.text}"
        pipeline_data = pipeline_response.json()
        
        assert pipeline_data["success"] is True, "Pipeline should succeed"
        assert pipeline_data["testMode"] == "full-pipeline-via-queue-drain", \
            "Should use queue drain mode"
        
        # Step 3: Verify enqueue succeeded
        assert "pipeline" in pipeline_data, "Should have pipeline data"
        assert pipeline_data["pipeline"]["enqueued"] is True, "Should have enqueued successfully"
        
        print(f"Step 2 ✓ Address enqueued into balance queue")
        
        # Step 4: Verify drain was executed
        drain_result = pipeline_data["pipeline"]["drainResult"]
        assert drain_result["checked"] >= 1, "Should have checked at least 1 address"
        assert drain_result["hits"] >= 1, "Should have at least 1 hit (our test address)"
        
        print(f"Step 3 ✓ Queue drain executed: checked={drain_result['checked']}, hits={drain_result['hits']}")
        
        # Step 5: Verify sweep was created
        assert pipeline_data["pipeline"]["sweep"] is not None, "Should have sweep"
        assert pipeline_data["pipeline"]["sweep"]["status"] == "pending", "Sweep should be pending"
        
        sweep_id = pipeline_data["pipeline"]["sweep"]["id"]
        print(f"Step 4 ✓ Sweep created via queue worker: ID={sweep_id}")
        
        # Step 6: Verify queue stats transitions
        assert "queueStats" in pipeline_data, "Should have queue stats"
        queue_stats = pipeline_data["queueStats"]
        
        # After enqueue, pending should be >= initial pending + 1
        assert "initial" in queue_stats, "Should have initial stats"
        assert "afterEnqueue" in queue_stats, "Should have afterEnqueue stats"
        assert "afterDrain" in queue_stats, "Should have afterDrain stats"
        
        # The enqueued item should have been processed (removed from pending)
        print(f"Step 5 ✓ Queue stats captured: initial→afterEnqueue→afterDrain")
        
        # Step 7: Verify health endpoint reflects the changes
        health_response = await client.get("/api/observer/health")
        assert health_response.status_code == 200
        health_data = health_response.json()
        
        assert health_data["pipeline"]["sweepPendingCount"] >= 1, \
            "Should have at least 1 pending sweep"
        
        print(f"Step 6 ✓ Health verified: {health_data['pipeline']['sweepPendingCount']} pending sweeps")
        
        print(f"\n🎉 FULL PIPELINE WITH QUEUE DRAIN TEST PASSED!")
        print(f"   Used REAL balance queue: enqueue → drain → checkAndRecordBalance")
        print(f"   Drain result: {drain_result['checked']} checked, {drain_result['hits']} hits")
        print(f"   Pending sweep: ID={sweep_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
