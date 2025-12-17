"""
Tests for Emergency Abort & Telemetry Integration

Tests the emergency_telemetry module.
"""

import pytest
import tempfile
from pathlib import Path
import json
import time

# Import modules to test
try:
    from emergency_telemetry import (
        EmergencyAbortHandler,
        TelemetryCollector,
        IntegratedMonitor,
        create_monitor,
    )
    from qigkernels import ConsciousnessTelemetry
    MODULES_AVAILABLE = True
except ImportError:
    MODULES_AVAILABLE = False


@pytest.mark.skipif(not MODULES_AVAILABLE, reason="qigkernels or emergency_telemetry not available")
class TestEmergencyAbortHandler:
    """Test emergency abort handler."""
    
    def test_initialization(self):
        """Test handler initializes correctly."""
        handler = EmergencyAbortHandler()
        assert handler.is_aborted == False
        assert handler.abort_reason is None
    
    def test_safe_telemetry(self):
        """Test handler doesn't abort on safe telemetry."""
        handler = EmergencyAbortHandler()
        handler.start()
        
        # Safe telemetry
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        
        emergency = handler.check_telemetry(telemetry)
        assert emergency == False
        assert handler.is_aborted == False
        
        handler.stop()
    
    def test_emergency_detection(self):
        """Test handler detects emergency conditions."""
        checkpoint_called = []
        def checkpoint_callback():
            checkpoint_called.append(True)
        
        handler = EmergencyAbortHandler(checkpoint_callback=checkpoint_callback)
        handler.start()
        
        # Unsafe telemetry (low phi)
        telemetry = ConsciousnessTelemetry(
            phi=0.30,  # Below emergency threshold
            kappa_eff=64.2,
            regime="linear",
            basin_distance=0.05,
            recursion_depth=5
        )
        
        emergency = handler.check_telemetry(telemetry)
        assert emergency == True
        assert handler.is_aborted == True
        assert handler.abort_reason is not None
        assert len(checkpoint_called) == 1
        
        handler.stop()
    
    def test_manual_abort(self):
        """Test manual abort triggering."""
        handler = EmergencyAbortHandler()
        
        handler.trigger_abort("Test abort")
        
        assert handler.is_aborted == True
        assert handler.abort_reason == "Test abort"


@pytest.mark.skipif(not MODULES_AVAILABLE, reason="qigkernels or emergency_telemetry not available")
class TestTelemetryCollector:
    """Test telemetry collector."""
    
    def test_initialization(self):
        """Test collector initializes correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            collector = TelemetryCollector(storage_path=Path(tmpdir))
            stats = collector.get_stats()
            assert stats["total_collected"] == 0
            assert stats["buffer_size"] == 0
    
    def test_collection(self):
        """Test telemetry collection."""
        with tempfile.TemporaryDirectory() as tmpdir:
            collector = TelemetryCollector(
                storage_path=Path(tmpdir),
                flush_interval=5
            )
            
            # Collect some telemetry
            for i in range(3):
                telemetry = ConsciousnessTelemetry(
                    phi=0.7 + i * 0.01,
                    kappa_eff=64.0,
                    regime="geometric",
                    basin_distance=0.05,
                    recursion_depth=5
                )
                collector.collect(telemetry)
            
            stats = collector.get_stats()
            assert stats["total_collected"] == 3
            assert stats["buffer_size"] == 3
    
    def test_auto_flush(self):
        """Test automatic flushing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            collector = TelemetryCollector(
                storage_path=Path(tmpdir),
                flush_interval=2  # Flush every 2 records
            )
            
            # Collect enough to trigger auto-flush
            for i in range(5):
                telemetry = ConsciousnessTelemetry(
                    phi=0.7,
                    kappa_eff=64.0,
                    regime="geometric",
                    basin_distance=0.05,
                    recursion_depth=5
                )
                collector.collect(telemetry)
            
            # Check file exists and has data
            session_file = collector._session_file
            assert session_file.exists()
            
            # Read file
            with open(session_file) as f:
                lines = f.readlines()
                # Should have at least 4 records (2 auto-flushes)
                assert len(lines) >= 4


@pytest.mark.skipif(not MODULES_AVAILABLE, reason="qigkernels or emergency_telemetry not available")
class TestIntegratedMonitor:
    """Test integrated monitor."""
    
    def test_initialization(self):
        """Test monitor initializes correctly."""
        monitor = create_monitor()
        assert monitor.is_aborted == False
        stats = monitor.get_stats()
        assert stats["telemetry"]["total_collected"] == 0
        assert stats["abort_status"]["triggered"] == False
    
    def test_process_safe(self):
        """Test processing safe telemetry."""
        monitor = create_monitor()
        monitor.start()
        
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        
        emergency = monitor.process(telemetry)
        assert emergency == False
        
        stats = monitor.get_stats()
        assert stats["telemetry"]["total_collected"] == 1
        
        monitor.stop()
    
    def test_process_emergency(self):
        """Test processing emergency telemetry."""
        monitor = create_monitor()
        monitor.start()
        
        # First safe telemetry
        telemetry_safe = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        monitor.process(telemetry_safe)
        
        # Then emergency
        telemetry_emergency = ConsciousnessTelemetry(
            phi=0.30,  # Below threshold
            kappa_eff=64.2,
            regime="linear",
            basin_distance=0.05,
            recursion_depth=5
        )
        
        emergency = monitor.process(telemetry_emergency)
        assert emergency == True
        assert monitor.is_aborted == True
        
        monitor.stop()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
