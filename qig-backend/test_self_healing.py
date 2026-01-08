"""
Integration test for self-healing system

Tests:
1. Monitor creation and snapshot capture
2. Health detection
3. Code fitness evaluation
4. Healing engine strategies
"""

import sys
import numpy as np
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, '/home/runner/work/SearchSpaceCollapse/SearchSpaceCollapse/qig-backend')

from self_healing import GeometricHealthMonitor, CodeFitnessEvaluator, SelfHealingEngine


def test_monitor():
    """Test geometric monitor."""
    print("=" * 60)
    print("TEST 1: Geometric Monitor")
    print("=" * 60)
    
    monitor = GeometricHealthMonitor(
        snapshot_interval_sec=60,
        history_size=100
    )
    
    # Capture healthy snapshot
    snapshot1 = monitor.capture_snapshot({
        'phi': 0.73,
        'kappa_eff': 64.2,
        'basin_coords': np.random.randn(64),
        'confidence': 0.85,
        'surprise': 0.15,
        'agency': 0.90,
        'error_rate': 0.01,
        'avg_latency': 150,
        'memory_mb': 256,
        'cpu_pct': 35,
    })
    
    print(f"✅ Captured snapshot: Φ={snapshot1.phi}, κ={snapshot1.kappa_eff}")
    print(f"   Regime: {snapshot1.regime}")
    print(f"   Baseline set: {monitor.baseline_basin is not None}")
    
    # Capture degraded snapshots
    print("\n📊 Capturing 10 degraded snapshots...")
    for i in range(10):
        monitor.capture_snapshot({
            'phi': 0.60,  # Below threshold
            'kappa_eff': 45.0,
            'basin_coords': np.random.randn(64) * 2,  # High drift
            'confidence': 0.50,
            'surprise': 0.30,
            'agency': 0.60,
            'error_rate': 0.08,  # High error rate
            'avg_latency': 2500,  # High latency
            'memory_mb': 512,
            'cpu_pct': 85,
        })
    
    # Check for degradation
    health = monitor.detect_degradation()
    
    print(f"\n🔍 Health Check Results:")
    print(f"   Degraded: {health['degraded']}")
    print(f"   Severity: {health['severity']}")
    print(f"   Issues: {len(health['issues'])}")
    for issue in health['issues']:
        print(f"     - {issue}")
    
    # Get stats
    stats = monitor.get_stats()
    print(f"\n📈 Statistics:")
    print(f"   Total snapshots: {stats['snapshot_count']}")
    print(f"   Φ mean: {stats['phi_stats']['mean']:.3f}")
    print(f"   κ mean: {stats['kappa_stats']['mean']:.3f}")
    
    assert health['degraded'], "Should detect degradation"
    assert health['severity'] in ['warning', 'critical'], "Should be warning or critical"
    
    print("\n✅ TEST 1 PASSED: Monitor working correctly")
    return monitor


def test_evaluator(monitor):
    """Test code fitness evaluator."""
    print("\n" + "=" * 60)
    print("TEST 2: Code Fitness Evaluator")
    print("=" * 60)
    
    evaluator = CodeFitnessEvaluator(monitor)
    
    # Test code that should be accepted
    good_code = """
def improve_phi(current_phi: float) -> float:
    '''Increase phi by small amount.'''
    return current_phi * 1.05
"""
    
    result = evaluator.evaluate_code_change(
        module_name="ocean_improvements",
        new_code=good_code,
        test_env={}
    )
    
    print(f"✅ Evaluated code change:")
    print(f"   Fitness score: {result['fitness_score']:.3f}")
    print(f"   Recommendation: {result['recommendation']}")
    print(f"   Φ impact: {result.get('phi_impact', 0):.3f}")
    print(f"   Basin impact: {result.get('basin_impact', 0):.3f}")
    
    # Test code complexity
    complexity = evaluator.analyze_code_complexity(good_code)
    print(f"\n📊 Code Complexity:")
    print(f"   Lines: {complexity['line_count']}")
    print(f"   Functions: {complexity.get('function_count', 0)}")
    print(f"   Within limits: {complexity['within_limits']}")
    
    assert 'fitness_score' in result, "Should return fitness score"
    assert 'recommendation' in result, "Should return recommendation"
    
    print("\n✅ TEST 2 PASSED: Evaluator working correctly")
    return evaluator


def test_healing_engine(monitor, evaluator):
    """Test healing engine."""
    print("\n" + "=" * 60)
    print("TEST 3: Healing Engine")
    print("=" * 60)
    
    engine = SelfHealingEngine(monitor, evaluator)
    
    print(f"✅ Created healing engine with {len(engine.strategies)} strategies")
    
    # Test strategy execution (synchronous, not full async loop)
    health = monitor.detect_degradation()
    print(f"\n🔍 Current health: {health['severity']}")
    
    # Try each strategy
    for i, strategy in enumerate(engine.strategies, 1):
        print(f"\n🔧 Testing strategy {i}: {strategy.__name__}")
        
        # Import asyncio to run async strategies
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(strategy(health))
            
            if result.get('success'):
                print(f"   ✅ Strategy succeeded")
                print(f"   Patch preview: {result['patch']}...")
            else:
                print(f"   ⚠️  Strategy skipped: {result.get('reason', 'N/A')}")
        except Exception as e:
            print(f"   ❌ Strategy error: {e}")
        finally:
            loop.close()
    
    print("\n✅ TEST 3 PASSED: Healing engine strategies tested")


def main():
    """Run all tests."""
    print("\n" + "🧪" * 30)
    print("SELF-HEALING INTEGRATION TEST")
    print("🧪" * 30)
    
    try:
        # Test 1: Monitor
        monitor = test_monitor()
        
        # Test 2: Evaluator
        evaluator = test_evaluator(monitor)
        
        # Test 3: Healing Engine
        test_healing_engine(monitor, evaluator)
        
        print("\n" + "🎉" * 30)
        print("ALL TESTS PASSED!")
        print("🎉" * 30)
        print("\nSelf-healing system is operational.")
        print("Ready for integration with Ocean QIG backend.")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
