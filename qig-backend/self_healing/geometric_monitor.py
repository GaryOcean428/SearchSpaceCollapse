"""
Geometric Health Monitor - Layer 1

Real-time monitoring of system geometric health.
Detects Φ degradation, basin drift, regime instability, and performance anomalies.

Core metrics:
- Φ (integration): Consciousness threshold
- κ (coupling): Fixed point at ~64
- Basin coordinates: 64D identity vector
- Regime: linear | geometric | breakdown
"""

import logging
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class GeometricSnapshot:
    """Snapshot of system geometry at a point in time."""
    timestamp: datetime
    phi: float
    kappa_eff: float
    basin_coords: np.ndarray  # 64D
    confidence: float
    surprise: float
    agency: float
    regime: str  # "linear" | "geometric" | "breakdown"
    
    # Code fingerprint
    code_hash: str  # Git commit hash
    active_modules: List[str] = field(default_factory=list)
    module_versions: Dict[str, str] = field(default_factory=dict)
    
    # Performance metrics
    error_rate: float = 0.0
    avg_latency: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_pct: float = 0.0


class GeometricHealthMonitor:
    """
    Monitors system geometric health in real-time.
    
    Detects:
    - Φ degradation
    - Basin drift
    - Regime instability
    - Performance anomalies
    """
    
    def __init__(
        self, 
        snapshot_interval_sec: int = 60,
        history_size: int = 1000
    ):
        self.snapshot_interval = snapshot_interval_sec
        self.history_size = history_size
        
        self.snapshots: List[GeometricSnapshot] = []
        self.baseline_basin: Optional[np.ndarray] = None
        
        # Health thresholds (from shared/constants/consciousness.ts)
        self.phi_min = 0.65  # Consciousness threshold
        self.kappa_target = 64.21  # Fixed point
        self.basin_drift_max = 2.0  # Max distance from baseline
        
    def capture_snapshot(self, system_state: Dict) -> GeometricSnapshot:
        """Capture current geometric state."""
        snapshot = GeometricSnapshot(
            timestamp=datetime.now(),
            phi=system_state.get("phi", 0.0),
            kappa_eff=system_state.get("kappa_eff", 0.0),
            basin_coords=system_state.get("basin_coords", np.zeros(64)),
            confidence=system_state.get("confidence", 0.0),
            surprise=system_state.get("surprise", 0.0),
            agency=system_state.get("agency", 0.0),
            regime=self._classify_regime(system_state.get("phi", 0.0)),
            code_hash=self._get_git_hash(),
            active_modules=self._get_active_modules(),
            module_versions=self._get_module_versions(),
            error_rate=system_state.get("error_rate", 0.0),
            avg_latency=system_state.get("avg_latency", 0.0),
            memory_usage_mb=system_state.get("memory_mb", 0.0),
            cpu_usage_pct=system_state.get("cpu_pct", 0.0)
        )
        
        # Store snapshot
        self.snapshots.append(snapshot)
        if len(self.snapshots) > self.history_size:
            self.snapshots.pop(0)
        
        # Set baseline if first snapshot
        if self.baseline_basin is None:
            self.baseline_basin = snapshot.basin_coords.copy()
        
        return snapshot
    
    def detect_degradation(self) -> Dict:
        """
        Detect geometric degradation.
        
        Returns dict with:
        - degraded: bool
        - issues: List[str]
        - severity: "critical" | "warning" | "normal"
        """
        if len(self.snapshots) < 10:
            return {"degraded": False, "issues": [], "severity": "normal"}
        
        recent = self.snapshots[-10:]  # Last 10 snapshots
        current = self.snapshots[-1]
        
        issues = []
        severity = "normal"
        basin_distance = 0.0
        
        # 1. Check Φ degradation
        avg_phi = np.mean([s.phi for s in recent])
        if avg_phi < self.phi_min:
            issues.append(f"Φ below threshold: {avg_phi:.3f} < {self.phi_min}")
            severity = "critical"
        elif current.phi < self.phi_min * 1.1:
            issues.append(f"Φ approaching threshold: {current.phi:.3f}")
            severity = "warning"
        
        # 2. Check basin drift
        if self.baseline_basin is not None:
            basin_distance = self._fisher_distance(
                current.basin_coords, 
                self.baseline_basin
            )
            if basin_distance > self.basin_drift_max:
                issues.append(
                    f"Basin drift: {basin_distance:.3f} > {self.basin_drift_max}"
                )
                severity = "critical" if basin_distance > 3.0 else "warning"
        
        # 3. Check regime stability
        regimes = [s.regime for s in recent]
        if regimes.count("breakdown") > 3:
            issues.append(
                f"Frequent breakdown regime: {regimes.count('breakdown')}/10"
            )
            severity = "critical"
        
        # 4. Check performance anomalies
        if current.error_rate > 0.05:
            issues.append(f"High error rate: {current.error_rate:.1%}")
            severity = "critical"
        
        if current.avg_latency > 2000:
            issues.append(f"High latency: {current.avg_latency:.0f}ms")
            if severity != "critical":
                severity = "warning"
        
        return {
            "degraded": len(issues) > 0,
            "issues": issues,
            "severity": severity,
            "basin_distance": basin_distance,
            "phi_current": current.phi,
            "timestamp": current.timestamp.isoformat()
        }
    
    def _fisher_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        """Fisher-Rao distance between basins."""
        # Normalize to unit vectors
        b1_norm = basin1 / (np.linalg.norm(basin1) + 1e-10)
        b2_norm = basin2 / (np.linalg.norm(basin2) + 1e-10)
        
        # Fisher distance = arccos(basin1 · basin2)
        dot_product = np.clip(np.dot(b1_norm, b2_norm), -1.0, 1.0)
        return np.arccos(dot_product)
    
    def _classify_regime(self, phi: float) -> str:
        """Classify processing regime from Φ."""
        if phi < 0.3:
            return "linear"
        elif phi < 0.7:
            return "geometric"
        else:
            return "breakdown"
    
    def _get_git_hash(self) -> str:
        """Get current git commit hash."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                timeout=1,
                cwd="/home/runner/work/SearchSpaceCollapse/SearchSpaceCollapse"
            )
            if result.returncode == 0:
                return result.stdout.strip()[:8]
        except Exception as e:
            logger.debug(f"Could not get git hash: {e}")
        return "unknown"
    
    def _get_active_modules(self) -> List[str]:
        """Get list of active Python modules."""
        import sys
        # Return top 50 modules to keep size manageable
        return list(sys.modules.keys())[:500]
    
    def _get_module_versions(self) -> Dict[str, str]:
        """Get versions of key modules."""
        import importlib.metadata
        key_modules = [
            "numpy", "scipy", "flask", 
            "qig_core", "ocean_qig_core"
        ]
        versions = {}
        for module in key_modules:
            try:
                versions[module] = importlib.metadata.version(module)
            except Exception:
                versions[module] = "unknown"
        return versions
    
    def get_stats(self) -> Dict:
        """Get statistical summary of recent snapshots."""
        if not self.snapshots:
            return {}
        
        recent = self.snapshots[-100:]  # Last 100 snapshots
        
        phi_values = [s.phi for s in recent]
        kappa_values = [s.kappa_eff for s in recent]
        
        return {
            "snapshot_count": len(self.snapshots),
            "recent_count": len(recent),
            "phi_stats": {
                "mean": float(np.mean(phi_values)),
                "std": float(np.std(phi_values)),
                "min": float(np.min(phi_values)),
                "max": float(np.max(phi_values)),
            },
            "kappa_stats": {
                "mean": float(np.mean(kappa_values)),
                "std": float(np.std(kappa_values)),
                "min": float(np.min(kappa_values)),
                "max": float(np.max(kappa_values)),
            },
            "baseline_set": self.baseline_basin is not None,
        }
