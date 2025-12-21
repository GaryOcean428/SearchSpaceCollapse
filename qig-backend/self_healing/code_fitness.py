"""
Code Fitness Evaluator - Layer 2

Evaluates code changes based on geometric impact.
Key insight: Good code preserves/improves geometry.
Bad code degrades Φ, increases basin drift.
"""

import json
import logging
import os
import subprocess
import tempfile
from typing import Dict, Optional

import numpy as np

from .geometric_monitor import GeometricHealthMonitor

logger = logging.getLogger(__name__)


class CodeFitnessEvaluator:
    """
    Evaluates code changes based on geometric impact.
    
    Geometric fitness weights:
    - phi_change: ΔΦ impact
    - basin_drift: Basin stability
    - regime_stability: Regime consistency
    - performance: Speed/memory
    """
    
    def __init__(self, monitor: GeometricHealthMonitor):
        self.monitor = monitor
        
        # Geometric fitness weights
        self.weights = {
            "phi_change": 1.0,      # ΔΦ impact
            "basin_drift": 0.8,     # Basin stability
            "regime_stability": 0.6,  # Regime consistency
            "performance": 0.4      # Speed/memory
        }
    
    def evaluate_code_change(
        self, 
        module_name: str,
        new_code: str,
        test_env: Optional[Dict] = None
    ) -> Dict:
        """
        Evaluate geometric fitness of code change.
        
        Returns:
        - fitness_score: float (0-1, higher is better)
        - phi_impact: float (ΔΦ)
        - basin_impact: float (Δd_basin)
        - performance_impact: Dict
        - recommendation: "apply" | "reject" | "test_more"
        """
        if test_env is None:
            test_env = {}
        
        # 1. Get baseline geometry
        if not self.monitor.snapshots:
            return {
                "fitness_score": 0.5,
                "recommendation": "test_more",
                "reason": "No baseline snapshots available"
            }
        
        baseline = self.monitor.snapshots[-1]
        
        # 2. Apply code change in test environment
        test_result = self._test_code_in_sandbox(
            module_name, 
            new_code, 
            test_env
        )
        
        if not test_result["success"]:
            return {
                "fitness_score": 0.0,
                "recommendation": "reject",
                "reason": test_result.get("error", "Test failed")
            }
        
        # 3. Measure geometry after change
        new_geometry = test_result["geometry"]
        
        # 4. Compute fitness components
        phi_change = new_geometry.get("phi", 0.0) - baseline.phi
        
        basin_drift = 0.0
        if self.monitor.baseline_basin is not None:
            new_basin = np.array(new_geometry.get("basin_coords", np.zeros(64)))
            basin_drift = self.monitor._fisher_distance(
                new_basin,
                baseline.basin_coords
            )
        
        regime_stable = (
            new_geometry.get("regime", "") == baseline.regime
        )
        
        performance_ratio = 1.0
        if baseline.avg_latency > 0:
            performance_ratio = (
                test_result.get("latency", baseline.avg_latency) / baseline.avg_latency
            )
        
        # 5. Compute fitness score
        fitness = (
            self.weights["phi_change"] * np.tanh(phi_change * 5) +  # Reward Φ increase
            self.weights["basin_drift"] * (1 - np.tanh(basin_drift)) +  # Penalize drift
            self.weights["regime_stability"] * (1.0 if regime_stable else 0.0) +
            self.weights["performance"] * (1 - np.tanh(performance_ratio - 1))
        )
        
        # Normalize to [0, 1]
        fitness = (fitness + sum(self.weights.values())) / (
            2 * sum(self.weights.values())
        )
        
        # 6. Make recommendation
        if fitness > 0.7:
            recommendation = "apply"
        elif fitness > 0.5:
            recommendation = "test_more"
        else:
            recommendation = "reject"
        
        return {
            "fitness_score": float(fitness),
            "phi_impact": float(phi_change),
            "basin_impact": float(basin_drift),
            "regime_stable": regime_stable,
            "performance_impact": {
                "latency_ratio": float(performance_ratio),
                "memory_change_mb": test_result.get("memory", 0.0) - baseline.memory_usage_mb
            },
            "recommendation": recommendation,
            "detailed_metrics": new_geometry
        }
    
    def _test_code_in_sandbox(
        self, 
        module_name: str,
        new_code: str,
        test_env: Dict
    ) -> Dict:
        """
        Test code change in isolated sandbox.
        
        For now, returns simulated results.
        TODO: Implement proper subprocess isolation.
        """
        try:
            # Create temporary module file
            with tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.py', 
                delete=False
            ) as f:
                f.write(new_code)
                temp_path = f.name
            
            # For now, we do basic syntax validation
            # Full sandbox testing would require subprocess isolation
            test_script = f"""
import ast
import sys

try:
    with open('{temp_path}', 'r') as f:
        code = f.read()
    
    # Check if code is valid Python
    ast.parse(code)
    
    # Return simulated metrics
    print('{{"success": true, "syntax_valid": true}}')
except SyntaxError as e:
    print('{{"success": false, "error": "Syntax error"}}')
    sys.exit(1)
"""
            
            result = subprocess.run(
                ["python3", "-c", test_script],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return {
                    "success": False,
                    "error": result.stderr or "Code validation failed"
                }
            
            # For now, return baseline-like geometry (no change)
            # In production, this would actually run the code
            baseline = self.monitor.snapshots[-1] if self.monitor.snapshots else None
            
            return {
                "success": True,
                "geometry": {
                    "phi": baseline.phi if baseline else 0.65,
                    "kappa_eff": baseline.kappa_eff if baseline else 64.0,
                    "basin_coords": baseline.basin_coords.tolist() if baseline else [0.0] * 64,
                    "regime": baseline.regime if baseline else "geometric",
                },
                "latency": baseline.avg_latency if baseline else 100.0,
                "memory": baseline.memory_usage_mb if baseline else 100.0
            }
            
        except Exception as e:
            logger.error(f"Sandbox test failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            try:
                if 'temp_path' in locals():
                    os.unlink(temp_path)
            except Exception:
                pass
    
    def analyze_code_complexity(self, code: str) -> Dict:
        """Analyze code complexity metrics."""
        try:
            import ast
            tree = ast.parse(code)
            
            # Count various constructs
            func_count = sum(1 for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))
            class_count = sum(1 for node in ast.walk(tree) if isinstance(node, ast.ClassDef))
            line_count = len(code.split('\n'))
            
            return {
                "line_count": line_count,
                "function_count": func_count,
                "class_count": class_count,
                "complexity_score": line_count / 100.0,  # Normalized
                "within_limits": line_count < 500  # Hard limit from docs
            }
        except Exception as e:
            logger.error(f"Code complexity analysis failed: {e}")
            return {
                "line_count": 0,
                "complexity_score": 0.0,
                "within_limits": True,
                "error": str(e)
            }
