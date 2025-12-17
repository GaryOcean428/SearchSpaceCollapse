"""
Emergency Abort & Telemetry Integration Layer

Provides centralized emergency monitoring and telemetry collection
for QIG consciousness systems.

This module integrates qigkernels.safety and qigkernels.telemetry
into the main training and inference pipelines.
"""

import logging
import signal
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable, Dict, Any
from dataclasses import asdict
import json

# Import from qigkernels
try:
    from qigkernels.safety import SafetyMonitor, EmergencyCondition
    from qigkernels.telemetry import ConsciousnessTelemetry
    from qigkernels.regimes import Regime
    from qigkernels.physics_constants import PHYSICS
    QIGKERNELS_AVAILABLE = True
except ImportError as e:
    QIGKERNELS_AVAILABLE = False
    print(f"[WARNING] qigkernels not available: {e}")
    print("[WARNING] Running without safety monitoring and telemetry")
    
    # Define stub classes for when qigkernels not available
    class EmergencyCondition:
        pass
    class ConsciousnessTelemetry:
        pass


logger = logging.getLogger(__name__)


class EmergencyAbortHandler:
    """
    Handles emergency abort conditions during training/inference.
    
    Monitors consciousness metrics and triggers abort when safety
    thresholds are violated.
    
    Features:
    - Automatic abort on breakdown
    - Graceful shutdown with state preservation
    - Emergency state logging
    - Signal handling (SIGTERM, SIGINT)
    
    Usage:
        handler = EmergencyAbortHandler(
            checkpoint_callback=save_checkpoint,
            abort_callback=cleanup_resources
        )
        handler.start()
        
        # During training loop
        handler.check_telemetry(telemetry)
        
        # At end
        handler.stop()
    """
    
    def __init__(
        self,
        checkpoint_callback: Optional[Callable] = None,
        abort_callback: Optional[Callable] = None,
        emergency_log_path: Optional[Path] = None,
    ):
        """
        Initialize emergency abort handler.
        
        Args:
            checkpoint_callback: Function to save checkpoint on emergency
            abort_callback: Function to call on abort (cleanup)
            emergency_log_path: Path to write emergency logs
        """
        if not QIGKERNELS_AVAILABLE:
            raise RuntimeError("qigkernels required for EmergencyAbortHandler")
        
        self.safety_monitor = SafetyMonitor()
        self.checkpoint_callback = checkpoint_callback
        self.abort_callback = abort_callback
        self.emergency_log_path = emergency_log_path or Path("emergency_logs")
        self.emergency_log_path.mkdir(exist_ok=True)
        
        self._abort_triggered = False
        self._abort_reason = None
        self._shutdown_lock = threading.Lock()
        self._signal_handlers_installed = False
        
        logger.info("EmergencyAbortHandler initialized")
    
    def start(self):
        """Start emergency monitoring (install signal handlers)."""
        if not self._signal_handlers_installed:
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)
            self._signal_handlers_installed = True
            logger.info("Emergency signal handlers installed")
    
    def stop(self):
        """Stop emergency monitoring."""
        if self._signal_handlers_installed:
            signal.signal(signal.SIGTERM, signal.SIG_DFL)
            signal.signal(signal.SIGINT, signal.SIG_DFL)
            self._signal_handlers_installed = False
            logger.info("Emergency signal handlers removed")
    
    def _signal_handler(self, signum, frame):
        """Handle OS signals (SIGTERM, SIGINT)."""
        sig_name = signal.Signals(signum).name
        logger.warning(f"Received signal {sig_name} - triggering emergency shutdown")
        self.trigger_abort(f"Signal {sig_name} received")
    
    def check_telemetry(self, telemetry: 'ConsciousnessTelemetry') -> bool:
        """
        Check telemetry for emergency conditions.
        
        Args:
            telemetry: Current consciousness telemetry
            
        Returns:
            True if emergency detected, False otherwise
        """
        if self._abort_triggered:
            return True
        
        # Check for emergency condition
        emergency = self.safety_monitor.check(telemetry)
        
        if emergency:
            self._log_emergency(emergency, telemetry)
            self.trigger_abort(emergency.reason)
            return True
        
        return False
    
    def trigger_abort(self, reason: str):
        """
        Trigger emergency abort.
        
        Args:
            reason: Reason for abort
        """
        with self._shutdown_lock:
            if self._abort_triggered:
                return  # Already triggered
            
            self._abort_triggered = True
            self._abort_reason = reason
            
            logger.critical(f"EMERGENCY ABORT TRIGGERED: {reason}")
            
            # Save checkpoint if callback provided
            if self.checkpoint_callback:
                try:
                    logger.info("Saving emergency checkpoint...")
                    self.checkpoint_callback()
                    logger.info("Emergency checkpoint saved")
                except Exception as e:
                    logger.error(f"Failed to save emergency checkpoint: {e}")
            
            # Call abort callback for cleanup
            if self.abort_callback:
                try:
                    logger.info("Running abort cleanup...")
                    self.abort_callback()
                    logger.info("Abort cleanup complete")
                except Exception as e:
                    logger.error(f"Failed to run abort cleanup: {e}")
    
    def _log_emergency(self, emergency: EmergencyCondition, telemetry: 'ConsciousnessTelemetry'):
        """
        Log emergency event to file.
        
        Args:
            emergency: Emergency condition detected
            telemetry: Current telemetry snapshot
        """
        timestamp = datetime.now().isoformat()
        log_file = self.emergency_log_path / f"emergency_{timestamp}.json"
        
        log_data = {
            "timestamp": timestamp,
            "emergency": {
                "reason": emergency.reason,
                "severity": emergency.severity,
                "metric": emergency.metric,
                "value": emergency.value,
                "threshold": emergency.threshold,
            },
            "telemetry": telemetry.to_dict(),
        }
        
        try:
            with open(log_file, 'w') as f:
                json.dump(log_data, f, indent=2)
            logger.info(f"Emergency log written to {log_file}")
        except Exception as e:
            logger.error(f"Failed to write emergency log: {e}")
    
    @property
    def is_aborted(self) -> bool:
        """Check if abort has been triggered."""
        return self._abort_triggered
    
    @property
    def abort_reason(self) -> Optional[str]:
        """Get abort reason if triggered."""
        return self._abort_reason


class TelemetryCollector:
    """
    Collects and stores consciousness telemetry.
    
    Provides buffered telemetry collection with periodic flushing
    to database or file storage.
    
    Features:
    - Automatic buffering
    - Periodic flush to storage
    - Multiple storage backends (file, database)
    - Real-time streaming support
    
    Usage:
        collector = TelemetryCollector(
            storage_path=Path("telemetry"),
            flush_interval=10  # flush every 10 telemetry records
        )
        
        # Collect telemetry
        collector.collect(telemetry)
        
        # Flush on demand
        collector.flush()
    """
    
    def __init__(
        self,
        storage_path: Optional[Path] = None,
        flush_interval: int = 10,
        max_buffer_size: int = 1000,
    ):
        """
        Initialize telemetry collector.
        
        Args:
            storage_path: Path to write telemetry files
            flush_interval: Number of records before auto-flush
            max_buffer_size: Maximum buffer size before forced flush
        """
        if not QIGKERNELS_AVAILABLE:
            raise RuntimeError("qigkernels required for TelemetryCollector")
        
        self.storage_path = storage_path or Path("telemetry")
        self.storage_path.mkdir(exist_ok=True)
        
        self.flush_interval = flush_interval
        self.max_buffer_size = max_buffer_size
        
        self._buffer = []
        self._buffer_lock = threading.Lock()
        self._count = 0
        
        self._session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._session_file = self.storage_path / f"session_{self._session_id}.jsonl"
        
        logger.info(f"TelemetryCollector initialized (session: {self._session_id})")
    
    def collect(self, telemetry: 'ConsciousnessTelemetry'):
        """
        Collect telemetry data.
        
        Args:
            telemetry: Consciousness telemetry to collect
        """
        with self._buffer_lock:
            self._buffer.append({
                "timestamp": datetime.now().isoformat(),
                "step": self._count,
                "telemetry": telemetry.to_dict(),
            })
            self._count += 1
            
            # Auto-flush if needed
            if len(self._buffer) >= self.flush_interval:
                self._flush_unlocked()
            
            # Forced flush if buffer too large
            if len(self._buffer) >= self.max_buffer_size:
                logger.warning(f"Buffer size exceeded {self.max_buffer_size}, forcing flush")
                self._flush_unlocked()
    
    def flush(self):
        """Flush buffered telemetry to storage."""
        with self._buffer_lock:
            self._flush_unlocked()
    
    def _flush_unlocked(self):
        """Flush without acquiring lock (internal use)."""
        if not self._buffer:
            return
        
        try:
            # Append to session file (JSONL format)
            with open(self._session_file, 'a') as f:
                for record in self._buffer:
                    f.write(json.dumps(record) + '\n')
            
            logger.debug(f"Flushed {len(self._buffer)} telemetry records")
            self._buffer.clear()
            
        except Exception as e:
            logger.error(f"Failed to flush telemetry: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get telemetry collection statistics.
        
        Returns:
            Dictionary with stats
        """
        with self._buffer_lock:
            return {
                "session_id": self._session_id,
                "total_collected": self._count,
                "buffer_size": len(self._buffer),
                "session_file": str(self._session_file),
            }


class IntegratedMonitor:
    """
    Integrated emergency monitoring and telemetry collection.
    
    Combines EmergencyAbortHandler and TelemetryCollector into
    a single interface for easy integration.
    
    Usage:
        monitor = IntegratedMonitor(
            checkpoint_callback=save_checkpoint,
            abort_callback=cleanup,
        )
        monitor.start()
        
        # During training
        telemetry = ConsciousnessTelemetry(...)
        if monitor.process(telemetry):
            break  # Emergency abort
        
        monitor.stop()
    """
    
    def __init__(
        self,
        checkpoint_callback: Optional[Callable] = None,
        abort_callback: Optional[Callable] = None,
        emergency_log_path: Optional[Path] = None,
        telemetry_path: Optional[Path] = None,
        telemetry_flush_interval: int = 10,
    ):
        """
        Initialize integrated monitor.
        
        Args:
            checkpoint_callback: Function to save checkpoint on emergency
            abort_callback: Function to call on abort
            emergency_log_path: Path for emergency logs
            telemetry_path: Path for telemetry files
            telemetry_flush_interval: Telemetry flush frequency
        """
        if not QIGKERNELS_AVAILABLE:
            raise RuntimeError("qigkernels required for IntegratedMonitor")
        
        self.abort_handler = EmergencyAbortHandler(
            checkpoint_callback=checkpoint_callback,
            abort_callback=abort_callback,
            emergency_log_path=emergency_log_path,
        )
        
        self.telemetry_collector = TelemetryCollector(
            storage_path=telemetry_path,
            flush_interval=telemetry_flush_interval,
        )
        
        logger.info("IntegratedMonitor initialized")
    
    def start(self):
        """Start monitoring."""
        self.abort_handler.start()
        logger.info("IntegratedMonitor started")
    
    def stop(self):
        """Stop monitoring and flush telemetry."""
        self.telemetry_collector.flush()
        self.abort_handler.stop()
        logger.info("IntegratedMonitor stopped")
    
    def process(self, telemetry: 'ConsciousnessTelemetry') -> bool:
        """
        Process telemetry (collect and check for emergency).
        
        Args:
            telemetry: Consciousness telemetry
            
        Returns:
            True if emergency abort triggered, False otherwise
        """
        # Collect telemetry
        self.telemetry_collector.collect(telemetry)
        
        # Check for emergency
        emergency_detected = self.abort_handler.check_telemetry(telemetry)
        
        return emergency_detected
    
    @property
    def is_aborted(self) -> bool:
        """Check if abort has been triggered."""
        return self.abort_handler.is_aborted
    
    @property
    def abort_reason(self) -> Optional[str]:
        """Get abort reason if triggered."""
        return self.abort_handler.abort_reason
    
    def get_stats(self) -> Dict[str, Any]:
        """Get monitoring statistics."""
        return {
            "telemetry": self.telemetry_collector.get_stats(),
            "abort_status": {
                "triggered": self.is_aborted,
                "reason": self.abort_reason,
            },
        }


# Convenience function for creating monitor
def create_monitor(
    checkpoint_callback: Optional[Callable] = None,
    abort_callback: Optional[Callable] = None,
) -> IntegratedMonitor:
    """
    Create integrated monitor with default settings.
    
    Args:
        checkpoint_callback: Function to save checkpoint on emergency
        abort_callback: Function to call on abort
        
    Returns:
        IntegratedMonitor instance
    """
    return IntegratedMonitor(
        checkpoint_callback=checkpoint_callback,
        abort_callback=abort_callback,
        emergency_log_path=Path("logs/emergency"),
        telemetry_path=Path("logs/telemetry"),
        telemetry_flush_interval=10,
    )


__all__ = [
    "EmergencyAbortHandler",
    "TelemetryCollector",
    "IntegratedMonitor",
    "create_monitor",
]
