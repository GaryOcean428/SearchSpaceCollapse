#!/usr/bin/env python3
"""
Unbiased QIG Validation Test Suite
===================================

Runs complete validation WITHOUT forced classifications.

Tests:
1. Phi-Kappa Linkage (Einstein relation in consciousness)
2. Basin Dimensionality (E8 hypothesis)
3. Temporal Coherence (time-dependent geometry)
4. Threshold Discovery (empirical phase transitions)
5. Bias Quantification (forced vs emergent)

Version: 1.0
Date: 2025-12-07
"""

import numpy as np
import json
from datetime import datetime
from typing import Dict, List
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(__file__))

from raw_measurement import UnbiasedQIGNetwork
from pattern_discovery import PatternDiscovery, BiasComparison


class UnbiasedValidationSuite:
    """
    Complete validation suite for unbiased QIG measurements.
    """
    
    def __init__(self, output_dir: str = '/tmp/qig_validation'):
        """
        Initialize validation suite.
        
        Args:
            output_dir: Directory for output files
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self.network = UnbiasedQIGNetwork(n_subsystems=4, temperature=1.0)
        self.results = {}
    
    def test_1_phi_kappa_linkage(self, n_samples: int = 100) -> Dict:
        """
        Test 1: Phi-Kappa Linkage
        
        Does ΔG ≈ κ·ΔT emerge naturally in consciousness?
        
        Protocol:
        1. Generate diverse inputs
        2. Measure (integration, coupling, curvature)
        3. Compute deltas between consecutive states
        4. Fit linear regression
        5. Test if Einstein relation emerges
        
        Args:
            n_samples: Number of samples to test
        
        Returns:
            Test results dictionary
        """
        print("\n" + "=" * 60)
        print("TEST 1: PHI-KAPPA LINKAGE")
        print("=" * 60)
        print("Testing if ΔG ≈ κ·ΔT emerges naturally...")
        
        # Generate diverse test inputs
        inputs = self._generate_diverse_inputs(n_samples)
        
        print(f"\nProcessing {n_samples} samples...")
        measurements = []
        
        for i, input_text in enumerate(inputs):
            if (i + 1) % 20 == 0:
                print(f"  Progress: {i+1}/{n_samples}")
            
            measurement = self.network.process(input_text, n_recursions=3)
            measurements.append(measurement)
        
        # Compute deltas between consecutive states
        deltas = []
        for i in range(1, len(measurements)):
            prev = measurements[i-1]['metrics']
            curr = measurements[i]['metrics']
            
            delta_curvature = curr['curvature'] - prev['curvature']
            delta_coupling = curr['coupling'] - prev['coupling']
            delta_integration = curr['integration'] - prev['integration']
            
            deltas.append({
                'delta_G': delta_curvature,  # Curvature change (ΔG)
                'delta_T': delta_coupling,    # "Stress-energy" change (ΔT)
                'delta_phi': delta_integration,
                'phi': curr['integration'],
                'kappa': curr['coupling'],
            })
        
        # Linear regression: ΔG = κ·ΔT + b
        from scipy import stats
        
        delta_T = np.array([d['delta_T'] for d in deltas])
        delta_G = np.array([d['delta_G'] for d in deltas])
        
        slope, intercept, r_value, p_value, std_err = stats.linregress(delta_T, delta_G)
        
        # Group by integration level
        phi_low = [d for d in deltas if d['phi'] < 0.3]
        phi_mid = [d for d in deltas if 0.3 <= d['phi'] < 0.6]
        phi_high = [d for d in deltas if d['phi'] >= 0.6]
        
        kappa_by_regime = {
            'low_phi': np.mean([d['kappa'] for d in phi_low]) if phi_low else None,
            'mid_phi': np.mean([d['kappa'] for d in phi_mid]) if phi_mid else None,
            'high_phi': np.mean([d['kappa'] for d in phi_high]) if phi_high else None,
        }
        
        result = {
            'n_samples': n_samples,
            'einstein_relation': {
                'slope': float(slope),
                'intercept': float(intercept),
                'r_squared': float(r_value ** 2),
                'p_value': float(p_value),
                'std_err': float(std_err),
            },
            'kappa_by_phi_regime': kappa_by_regime,
            'phi_clustering': {
                'n_low': len(phi_low),
                'n_mid': len(phi_mid),
                'n_high': len(phi_high),
            },
            'verdict': {
                'einstein_relation_significant': bool(p_value < 0.05),
                'good_fit': bool(r_value ** 2 > 0.7),
                'kappa_clusters_by_phi': bool(
                    kappa_by_regime['low_phi'] is not None and
                    kappa_by_regime['high_phi'] is not None and
                    abs(kappa_by_regime['low_phi'] - kappa_by_regime['high_phi']) > 10
                ),
            },
        }
        
        # Save
        with open(f'{self.output_dir}/test1_phi_kappa_linkage.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        # Print results
        print("\n" + "-" * 60)
        print("RESULTS:")
        print(f"  ΔG = {slope:.4f}·ΔT + {intercept:.4f}")
        print(f"  R² = {r_value**2:.3f}")
        print(f"  p-value = {p_value:.2e}")
        print(f"\n  κ(Φ<0.3) = {kappa_by_regime['low_phi']:.1f}" if kappa_by_regime['low_phi'] else "  κ(Φ<0.3) = N/A")
        print(f"  κ(0.3≤Φ<0.6) = {kappa_by_regime['mid_phi']:.1f}" if kappa_by_regime['mid_phi'] else "  κ(0.3≤Φ<0.6) = N/A")
        print(f"  κ(Φ≥0.6) = {kappa_by_regime['high_phi']:.1f}" if kappa_by_regime['high_phi'] else "  κ(Φ≥0.6) = N/A")
        print("\n  VERDICT:")
        for key, value in result['verdict'].items():
            status = "✅ PASS" if value else "❌ FAIL"
            print(f"    {key}: {status}")
        
        self.results['test_1'] = result
        return result
    
    def test_2_basin_dimensionality(self, min_samples: int = 100) -> Dict:
        """
        Test 2: Basin Dimensionality
        
        Is consciousness geometry 8-dimensional (E8)?
        
        Protocol:
        1. Collect basin coordinates from diverse inputs
        2. Run PCA
        3. Find effective dimension (90%, 95% variance)
        4. Test E8 hypothesis: dims ≈ 8?
        
        Args:
            min_samples: Minimum samples for reliable PCA
        
        Returns:
            Test results dictionary
        """
        print("\n" + "=" * 60)
        print("TEST 2: BASIN DIMENSIONALITY (E8 HYPOTHESIS)")
        print("=" * 60)
        
        # Ensure enough measurements
        if len(self.network.measurement_history) < min_samples:
            needed = min_samples - len(self.network.measurement_history)
            print(f"Need {needed} more samples, generating...")
            
            inputs = self._generate_diverse_inputs(needed)
            for input_text in inputs:
                self.network.process(input_text, n_recursions=3)
        
        print(f"\nAnalyzing {len(self.network.measurement_history)} basin coordinates...")
        
        # Pattern discovery
        discovery = PatternDiscovery(self.network.measurement_history)
        dim_analysis = discovery.discover_dimensionality(variance_threshold=0.95)
        
        # E8 validation
        dims_90 = dim_analysis['effective_dimension_90']
        e8_detected = dim_analysis['e8_signature_detected']
        
        result = {
            'n_samples': len(self.network.measurement_history),
            'full_dimension': dim_analysis['full_dimension'],
            'effective_dimensions': {
                '90_percent': dims_90,
                '95_percent': dim_analysis['effective_dimension_95'],
                '99_percent': dim_analysis['effective_dimension_99'],
            },
            'eigenvalues': dim_analysis['eigenvalues'],
            'variance_explained': dim_analysis['variance_explained'],
            'e8_signature': e8_detected,
            'verdict': {
                'low_dimensional': bool(dims_90 < 15),
                'e8_validated': bool(e8_detected),
                'sharp_eigenvalue_dropoff': bool(
                    dim_analysis['max_eigenvalue_drop']['ratio'] > 2.0
                ),
            },
        }
        
        # Save
        with open(f'{self.output_dir}/test2_basin_dimensionality.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        # Print results
        print("\n" + "-" * 60)
        print("RESULTS:")
        print(f"  Full dimension: {dim_analysis['full_dimension']}")
        print(f"  90% variance: {dims_90} dimensions")
        print(f"  95% variance: {dim_analysis['effective_dimension_95']} dimensions")
        print(f"  99% variance: {dim_analysis['effective_dimension_99']} dimensions")
        print(f"\n  E8 signature: {'YES ✨' if e8_detected else 'NO'}")
        print(f"  Max eigenvalue drop: {dim_analysis['max_eigenvalue_drop']['ratio']:.2f}× at dim {dim_analysis['max_eigenvalue_drop']['dimension']}")
        print("\n  VERDICT:")
        for key, value in result['verdict'].items():
            status = "✅ PASS" if value else "❌ FAIL"
            print(f"    {key}: {status}")
        
        self.results['test_2'] = result
        return result
    
    def test_3_temporal_coherence(self, n_samples: int = 50) -> Dict:
        """
        Test 3: Temporal Coherence
        
        Does temporal Einstein relation emerge?
        
        Protocol:
        1. Process sequence of related inputs
        2. Track temporal evolution
        3. Compute temporal derivatives
        4. Test dG/dt ≈ κ·dT/dt
        
        Args:
            n_samples: Number of temporal samples
        
        Returns:
            Test results dictionary
        """
        print("\n" + "=" * 60)
        print("TEST 3: TEMPORAL COHERENCE")
        print("=" * 60)
        
        # Generate temporal sequence
        print(f"\nGenerating temporal sequence ({n_samples} steps)...")
        
        temporal_measurements = []
        base_input = "bitcoin"
        
        for t in range(n_samples):
            # Vary input slightly over time
            input_text = f"{base_input} {t % 10}"
            measurement = self.network.process(input_text, n_recursions=3)
            measurement['time_step'] = t
            temporal_measurements.append(measurement)
        
        # Compute temporal derivatives
        print("\nComputing temporal derivatives...")
        
        G_temporal = [m['metrics']['curvature'] for m in temporal_measurements]
        T_temporal = [m['metrics']['coupling'] for m in temporal_measurements]
        
        dG_dt = np.diff(G_temporal)
        dT_dt = np.diff(T_temporal)
        
        # Linear regression (with protection for identical values)
        from scipy import stats
        
        # Check if there's enough variance for regression
        if np.std(dT_dt) < 1e-10 or np.std(dG_dt) < 1e-10:
            print("  ⚠️ Insufficient variance in temporal data for regression")
            slope, intercept, r_value, p_value, std_err = 0.0, 0.0, 0.0, 1.0, 0.0
        else:
            slope, intercept, r_value, p_value, std_err = stats.linregress(dT_dt, dG_dt)
        
        # Compare to spatial κ
        spatial_kappas = [m['metrics']['coupling'] for m in temporal_measurements]
        avg_spatial_kappa = np.mean(spatial_kappas)
        
        result = {
            'n_samples': n_samples,
            'temporal_einstein_relation': {
                'kappa_temporal': float(slope),
                'intercept': float(intercept),
                'r_squared': float(r_value ** 2),
                'p_value': float(p_value),
            },
            'spatial_kappa': {
                'mean': float(avg_spatial_kappa),
                'std': float(np.std(spatial_kappas)),
            },
            'temporal_spatial_agreement': {
                'kappa_ratio': float(slope / avg_spatial_kappa) if avg_spatial_kappa != 0 else None,
                'within_20_percent': bool(abs(slope - avg_spatial_kappa) / avg_spatial_kappa < 0.2) if avg_spatial_kappa != 0 else False,
            },
            'verdict': {
                'temporal_relation_significant': bool(p_value < 0.05),
                'temporal_spatial_consistent': bool(
                    avg_spatial_kappa != 0 and abs(slope - avg_spatial_kappa) / avg_spatial_kappa < 0.3
                ),
            },
        }
        
        # Save
        with open(f'{self.output_dir}/test3_temporal_coherence.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        # Print results
        print("\n" + "-" * 60)
        print("RESULTS:")
        print(f"  Temporal: dG/dt = {slope:.4f}·dT/dt + {intercept:.4f}")
        print(f"  R² = {r_value**2:.3f}")
        print(f"  Spatial κ = {avg_spatial_kappa:.1f} ± {np.std(spatial_kappas):.1f}")
        print(f"  κ_temporal / κ_spatial = {slope / avg_spatial_kappa:.2f}" if avg_spatial_kappa != 0 else "  Ratio: N/A")
        print("\n  VERDICT:")
        for key, value in result['verdict'].items():
            status = "✅ PASS" if value else "❌ FAIL"
            print(f"    {key}: {status}")
        
        self.results['test_3'] = result
        return result
    
    def test_4_threshold_discovery(self) -> Dict:
        """
        Test 4: Threshold Discovery
        
        Find natural thresholds WITHOUT forcing Φ=0.7.
        
        Protocol:
        1. Analyze integration distribution
        2. Find change points
        3. Compare to forced threshold (0.7)
        4. Check if 0.7 is actually special
        
        Returns:
            Test results dictionary
        """
        print("\n" + "=" * 60)
        print("TEST 4: THRESHOLD DISCOVERY")
        print("=" * 60)
        
        if len(self.network.measurement_history) < 20:
            print("Not enough measurements, skipping...")
            return {'error': 'Insufficient data'}
        
        print("\nDiscovering natural thresholds...")
        
        discovery = PatternDiscovery(self.network.measurement_history)
        threshold_analysis = discovery.discover_thresholds(metric='integration')
        
        # Check if forced threshold (0.7) appears
        discovered_thresholds = threshold_analysis['thresholds']
        forced_threshold = 0.7
        
        # Find nearest discovered threshold to 0.7
        if discovered_thresholds:
            distances = [abs(t - forced_threshold) for t in discovered_thresholds]
            nearest_idx = np.argmin(distances)
            nearest_threshold = discovered_thresholds[nearest_idx]
            nearest_distance = distances[nearest_idx]
        else:
            nearest_threshold = None
            nearest_distance = None
        
        result = {
            'discovered_thresholds': discovered_thresholds,
            'n_thresholds': len(discovered_thresholds),
            'regions': threshold_analysis['regions'],
            'forced_threshold_check': {
                'forced_value': forced_threshold,
                'nearest_discovered': float(nearest_threshold) if nearest_threshold is not None else None,
                'distance': float(nearest_distance) if nearest_distance is not None else None,
                'appears_natural': bool(nearest_distance is not None and nearest_distance < 0.05),
            },
            'verdict': {
                'thresholds_discovered': bool(len(discovered_thresholds) > 0),
                'multiple_regimes': bool(len(discovered_thresholds) >= 2),
                'forced_threshold_validated': bool(nearest_distance is not None and nearest_distance < 0.1),
            },
        }
        
        # Save
        with open(f'{self.output_dir}/test4_threshold_discovery.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        # Print results
        print("\n" + "-" * 60)
        print("RESULTS:")
        print(f"  Discovered {len(discovered_thresholds)} natural thresholds:")
        for i, t in enumerate(discovered_thresholds):
            print(f"    {i+1}. {t:.3f}")
        
        print(f"\n  Forced threshold (0.7) check:")
        if nearest_threshold is not None:
            print(f"    Nearest discovered: {nearest_threshold:.3f}")
            print(f"    Distance: {nearest_distance:.3f}")
            print(f"    Appears natural: {'YES' if nearest_distance < 0.05 else 'NO'}")
        
        print("\n  VERDICT:")
        for key, value in result['verdict'].items():
            status = "✅ PASS" if value else "❌ FAIL"
            print(f"    {key}: {status}")
        
        self.results['test_4'] = result
        return result
    
    def _generate_diverse_inputs(self, n: int) -> List[str]:
        """Generate diverse test inputs"""
        bases = [
            "bitcoin", "satoshi", "nakamoto", "blockchain", "cryptocurrency",
            "genesis", "halfinney", "mining", "wallet", "private key",
            "transaction", "ledger", "network", "protocol", "cryptography",
            "digital currency", "decentralized", "peer to peer", "consensus",
            "merkle tree", "hash function", "public key", "signature",
        ]
        
        inputs = []
        for i in range(n):
            if i < len(bases):
                inputs.append(bases[i])
            else:
                # Combinations
                base1 = bases[i % len(bases)]
                base2 = bases[(i * 7) % len(bases)]
                inputs.append(f"{base1} {base2}")
        
        return inputs
    
    def run_all_tests(self, n_samples: int = 100) -> Dict:
        """Run complete validation suite"""
        print("\n" + "=" * 60)
        print("UNBIASED QIG VALIDATION SUITE")
        print("=" * 60)
        print(f"Output directory: {self.output_dir}")
        print(f"Samples per test: {n_samples}")
        print("=" * 60)
        
        # Run all tests
        self.test_1_phi_kappa_linkage(n_samples=n_samples)
        self.test_2_basin_dimensionality(min_samples=n_samples)
        self.test_3_temporal_coherence(n_samples=min(n_samples, 50))
        self.test_4_threshold_discovery()
        
        # Generate summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'n_samples': n_samples,
            'tests': self.results,
            'overall_verdict': self._compute_overall_verdict(),
        }
        
        with open(f'{self.output_dir}/validation_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Print summary
        print("\n" + "=" * 60)
        print("OVERALL SUMMARY")
        print("=" * 60)
        
        overall = summary['overall_verdict']
        print(f"\nTests passed: {overall['tests_passed']}/{overall['total_tests']}")
        print(f"Overall score: {overall['score']:.1%}")
        
        print("\nKey findings:")
        for finding in overall['key_findings']:
            print(f"  • {finding}")
        
        print(f"\n✅ Validation complete. Results saved to {self.output_dir}/")
        
        return summary
    
    def _compute_overall_verdict(self) -> Dict:
        """Compute overall validation verdict"""
        total_tests = 0
        passed_tests = 0
        key_findings = []
        
        # Test 1
        if 'test_1' in self.results:
            t1 = self.results['test_1']['verdict']
            total_tests += len(t1)
            passed_tests += sum(t1.values())
            
            if t1['einstein_relation_significant']:
                key_findings.append("Einstein relation (ΔG ≈ κ·ΔT) emerges naturally in consciousness")
            if t1['kappa_clusters_by_phi']:
                key_findings.append("κ clusters by Φ regime (coupling depends on integration)")
        
        # Test 2
        if 'test_2' in self.results:
            t2 = self.results['test_2']['verdict']
            total_tests += len(t2)
            passed_tests += sum(t2.values())
            
            if t2['e8_validated']:
                key_findings.append("E8 signature detected (8D consciousness manifold)")
            elif t2['low_dimensional']:
                key_findings.append(f"Low-dimensional manifold ({self.results['test_2']['effective_dimensions']['90_percent']}D)")
        
        # Test 3
        if 'test_3' in self.results:
            t3 = self.results['test_3']['verdict']
            total_tests += len(t3)
            passed_tests += sum(t3.values())
            
            if t3['temporal_spatial_consistent']:
                key_findings.append("Temporal and spatial κ are consistent (substrate independence)")
        
        # Test 4
        if 'test_4' in self.results and 'verdict' in self.results['test_4']:
            t4 = self.results['test_4']['verdict']
            total_tests += len(t4)
            passed_tests += sum(t4.values())
            
            if t4['forced_threshold_validated']:
                key_findings.append("Forced threshold Φ=0.7 appears in natural data")
            elif t4['thresholds_discovered']:
                key_findings.append("Natural thresholds discovered (different from forced)")
        
        return {
            'total_tests': total_tests,
            'tests_passed': passed_tests,
            'score': passed_tests / total_tests if total_tests > 0 else 0,
            'key_findings': key_findings,
        }


if __name__ == '__main__':
    print("🔬 Unbiased QIG Validation Suite")
    print("=" * 60)
    
    # Parse arguments
    import argparse
    parser = argparse.ArgumentParser(description='Run unbiased QIG validation')
    parser.add_argument('--samples', type=int, default=100, help='Samples per test')
    parser.add_argument('--output', type=str, default='/tmp/qig_validation', help='Output directory')
    args = parser.parse_args()
    
    # Run validation
    suite = UnbiasedValidationSuite(output_dir=args.output)
    summary = suite.run_all_tests(n_samples=args.samples)
    
    print("\n" + "=" * 60)
    print("✅ VALIDATION COMPLETE")
    print("=" * 60)
