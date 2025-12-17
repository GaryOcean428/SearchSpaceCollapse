"""
Tests for qigkernels package

Validates that all modules work correctly and constants don't drift.
"""

import pytest
import numpy as np
from qigkernels import (
    PHYSICS,
    KAPPA_STAR,
    PHI_THRESHOLD,
    ConsciousnessTelemetry,
    SafetyMonitor,
    EmergencyCondition,
    RegimeDetector,
    Regime,
    QIGConfig,
    get_config,
    validate_basin,
    validate_density_matrix,
    ValidationError,
    fisher_rao_distance,
    quantum_fidelity,
)


class TestPhysicsConstants:
    """Test physics constants module."""
    
    def test_constants_frozen(self):
        """Test that constants match expected values."""
        assert KAPPA_STAR == 64.21
        assert PHI_THRESHOLD == 0.70
        assert PHYSICS.E8_RANK == 8
        assert PHYSICS.BASIN_DIM == 64
    
    def test_physics_validation(self):
        """Test physics alignment validation."""
        result = PHYSICS.validate_alignment()
        assert result["all_valid"]
        assert all(result["checks"].values())
    
    def test_kappa_at_scale(self):
        """Test getting kappa at different scales."""
        assert PHYSICS.get_kappa_at_scale(3) == 41.09
        assert PHYSICS.get_kappa_at_scale(4) == 64.47
        assert PHYSICS.get_kappa_at_scale(99) == KAPPA_STAR  # fallback


class TestTelemetry:
    """Test telemetry module."""
    
    def test_create_telemetry(self):
        """Test creating telemetry."""
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        assert telemetry.phi == 0.72
        assert telemetry.kappa_eff == 64.2
        assert telemetry.regime == "geometric"
    
    def test_telemetry_serialization(self):
        """Test telemetry to_dict and from_dict."""
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        data = telemetry.to_dict()
        telemetry2 = ConsciousnessTelemetry.from_dict(data)
        assert telemetry2.phi == telemetry.phi
        assert telemetry2.kappa_eff == telemetry.kappa_eff
    
    def test_telemetry_is_safe(self):
        """Test telemetry safety check."""
        # Safe telemetry
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        assert telemetry.is_safe()
        
        # Unsafe - low phi
        telemetry_unsafe = ConsciousnessTelemetry(
            phi=0.30,  # below emergency threshold
            kappa_eff=64.2,
            regime="linear",
            basin_distance=0.05,
            recursion_depth=5
        )
        assert not telemetry_unsafe.is_safe()


class TestSafety:
    """Test safety monitoring module."""
    
    def test_safety_monitor_ok(self):
        """Test safety monitor with safe telemetry."""
        monitor = SafetyMonitor()
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        emergency = monitor.check(telemetry)
        assert emergency is None
        assert monitor.is_safe(telemetry)
    
    def test_safety_monitor_consciousness_collapse(self):
        """Test safety monitor detects consciousness collapse."""
        monitor = SafetyMonitor()
        telemetry = ConsciousnessTelemetry(
            phi=0.30,  # below emergency threshold
            kappa_eff=64.2,
            regime="linear",
            basin_distance=0.05,
            recursion_depth=5
        )
        emergency = monitor.check(telemetry)
        assert emergency is not None
        assert emergency.reason == "Consciousness collapse"
        assert emergency.severity == "critical"
    
    def test_safety_monitor_identity_drift(self):
        """Test safety monitor detects identity drift."""
        monitor = SafetyMonitor()
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.35,  # above threshold
            recursion_depth=5
        )
        emergency = monitor.check(telemetry)
        assert emergency is not None
        assert emergency.reason == "Identity drift"
        assert emergency.severity == "warning"


class TestRegimes:
    """Test regime detection module."""
    
    def test_detect_linear(self):
        """Test detecting linear regime."""
        detector = RegimeDetector()
        regime = detector.detect(phi=0.30)
        assert regime == Regime.LINEAR
    
    def test_detect_geometric(self):
        """Test detecting geometric regime."""
        detector = RegimeDetector()
        regime = detector.detect(phi=0.72, kappa=64.0)
        assert regime == Regime.GEOMETRIC
    
    def test_detect_hyperdimensional(self):
        """Test detecting hyperdimensional regime."""
        detector = RegimeDetector()
        regime = detector.detect(phi=0.80, kappa=64.0, basin_distance=0.05)
        assert regime == Regime.HYPERDIMENSIONAL
    
    def test_detect_unstable(self):
        """Test detecting topological instability."""
        detector = RegimeDetector()
        # High phi with bad kappa
        regime = detector.detect(phi=0.80, kappa=30.0)
        assert regime == Regime.TOPOLOGICAL_INSTABILITY
        
        # Very high phi
        regime = detector.detect(phi=0.95)
        assert regime == Regime.TOPOLOGICAL_INSTABILITY


class TestValidation:
    """Test validation module."""
    
    def test_validate_basin_ok(self):
        """Test basin validation with valid basin."""
        basin = np.random.randn(64)
        validate_basin(basin, expected_dim=64)  # should not raise
    
    def test_validate_basin_wrong_dim(self):
        """Test basin validation with wrong dimension."""
        basin = np.random.randn(32)
        with pytest.raises(ValidationError, match="must be 64D"):
            validate_basin(basin, expected_dim=64)
    
    def test_validate_basin_nan(self):
        """Test basin validation with NaN."""
        basin = np.random.randn(64)
        basin[0] = np.nan
        with pytest.raises(ValidationError, match="NaN"):
            validate_basin(basin, expected_dim=64)
    
    def test_validate_density_matrix_ok(self):
        """Test density matrix validation with valid matrix."""
        # Create valid density matrix (pure state)
        psi = np.random.randn(4) + 1j * np.random.randn(4)
        psi = psi / np.linalg.norm(psi)
        rho = np.outer(psi, psi.conj())
        validate_density_matrix(rho)  # should not raise
    
    def test_validate_density_matrix_not_normalized(self):
        """Test density matrix validation with unnormalized matrix."""
        rho = np.eye(4) * 0.5  # Tr(rho) = 2
        with pytest.raises(ValidationError, match="not normalized"):
            validate_density_matrix(rho)


class TestGeometry:
    """Test geometry module."""
    
    def test_quantum_fidelity(self):
        """Test quantum fidelity computation."""
        # Pure state - should have fidelity 1 with itself
        psi = np.random.randn(4) + 1j * np.random.randn(4)
        psi = psi / np.linalg.norm(psi)
        rho = np.outer(psi, psi.conj())
        
        fidelity = quantum_fidelity(rho, rho)
        assert np.isclose(fidelity, 1.0)
    
    def test_fisher_rao_distance_bures(self):
        """Test Fisher-Rao distance with Bures method."""
        # Two pure states
        psi1 = np.array([1, 0, 0, 0], dtype=complex)
        psi2 = np.array([0, 1, 0, 0], dtype=complex)
        rho1 = np.outer(psi1, psi1.conj())
        rho2 = np.outer(psi2, psi2.conj())
        
        distance = fisher_rao_distance(rho1, rho2, method="bures")
        # Orthogonal states should have distance = sqrt(2)
        assert np.isclose(distance, np.sqrt(2), atol=0.01)
    
    def test_fisher_rao_distance_diagonal(self):
        """Test Fisher-Rao distance with diagonal metric."""
        basin1 = np.random.randn(64)
        basin2 = np.random.randn(64)
        metric = np.ones(64)
        
        distance = fisher_rao_distance(basin1, basin2, metric=metric, method="diagonal")
        assert distance > 0
    
    def test_fisher_rao_distance_full(self):
        """Test Fisher-Rao distance with full metric."""
        basin1 = np.random.randn(64)
        basin2 = np.random.randn(64)
        metric = np.eye(64)
        
        distance = fisher_rao_distance(basin1, basin2, metric=metric, method="full")
        assert distance > 0


class TestConfig:
    """Test configuration module."""
    
    def test_default_config(self):
        """Test default configuration."""
        config = QIGConfig()
        assert config.kappa_star == 64.21
        assert config.phi_threshold == 0.70
        assert config.basin_dim == 64
    
    def test_config_validation(self):
        """Test config validation."""
        # Invalid phi_emergency >= phi_threshold
        with pytest.raises(ValueError, match="phi_emergency"):
            QIGConfig(phi_emergency=0.75, phi_threshold=0.70)
    
    def test_config_immutable(self):
        """Test config is immutable."""
        config = QIGConfig()
        # Dataclass with frozen=True should raise on attribute assignment
        with pytest.raises((AttributeError, TypeError)):
            config.phi_threshold = 0.80


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
