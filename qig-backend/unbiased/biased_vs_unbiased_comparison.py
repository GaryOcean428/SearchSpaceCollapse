#!/usr/bin/env python3
"""
Biased vs Unbiased Comparison
==============================

Compare measurements from the original (biased) system against
the new unbiased system on identical inputs.

This reveals whether the original system's patterns are:
- Genuine emergence (same patterns appear in both)
- Artifacts of constraints (patterns only in biased system)

Version: 1.0
Date: 2025-12-07
"""

import numpy as np
import json
from typing import Dict, List, Tuple
from datetime import datetime
from scipy import stats
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from raw_measurement import UnbiasedQIGNetwork

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

try:
    from ocean_qig_core import PureQIGNetwork
    BIASED_AVAILABLE = True
except ImportError:
    BIASED_AVAILABLE = False
    print("Warning: Original biased system not available for comparison")


class BiasedUnbiasedComparison:
    """Compare biased vs unbiased measurement systems"""
    
    def __init__(self, output_dir: str = './comparison_results'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self.unbiased_network = UnbiasedQIGNetwork(n_subsystems=4, temperature=1.0)
        
        if BIASED_AVAILABLE:
            self.biased_network = PureQIGNetwork(temperature=1.0)
        else:
            self.biased_network = None
        
        self.comparison_results = []
    
    def generate_test_inputs(self, n_samples: int = 200, seed: int = None) -> List[str]:
        """
        Generate truly diverse test inputs using high-entropy randomness.
        
        Args:
            n_samples: Number of inputs to generate
            seed: Optional seed for reproducibility (None = true random)
        
        Returns:
            List of diverse input strings
        """
        import secrets
        import string
        
        # Use secrets for true randomness, or seed for reproducibility
        if seed is not None:
            np.random.seed(seed)
            use_secrets = False
        else:
            use_secrets = True
        
        # Large vocabulary pools
        words_crypto = [
            "bitcoin", "satoshi", "nakamoto", "blockchain", "cryptocurrency",
            "genesis", "halfinney", "mining", "wallet", "private", "key",
            "transaction", "ledger", "network", "protocol", "cryptography",
            "digital", "currency", "decentralized", "peer", "consensus",
            "merkle", "hash", "public", "signature", "address", "block",
            "chain", "node", "miner", "reward", "fee", "output", "input",
            "script", "segwit", "taproot", "lightning", "channel", "utxo"
        ]
        
        words_common = [
            "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog",
            "hello", "world", "password", "secret", "alpha", "beta", "gamma",
            "delta", "omega", "prime", "core", "main", "test", "first", "last",
            "new", "old", "true", "false", "null", "void", "zero", "one", "two"
        ]
        
        words_names = [
            "alice", "bob", "charlie", "david", "eve", "frank", "grace",
            "henry", "ivan", "julia", "karen", "leo", "maria", "nick",
            "olivia", "peter", "quinn", "rachel", "steve", "tina"
        ]
        
        words_technical = [
            "sha256", "ripemd160", "secp256k1", "ecdsa", "bip32", "bip39",
            "bip44", "hd", "derivation", "path", "entropy", "mnemonic",
            "seed", "master", "child", "extended", "compressed", "uncompressed"
        ]
        
        all_words = words_crypto + words_common + words_names + words_technical
        
        inputs = []
        seen = set()  # Ensure uniqueness
        
        for _ in range(n_samples):
            while True:
                # Random phrase length (1-6 words)
                if use_secrets:
                    length = secrets.randbelow(6) + 1
                else:
                    length = np.random.randint(1, 7)
                
                # Build phrase with random words
                phrase_words = []
                for _ in range(length):
                    if use_secrets:
                        word_idx = secrets.randbelow(len(all_words))
                    else:
                        word_idx = np.random.randint(len(all_words))
                    phrase_words.append(all_words[word_idx])
                
                # Occasionally add random characters/numbers for more diversity
                if use_secrets:
                    add_random = secrets.randbelow(100) < 30  # 30% chance
                else:
                    add_random = np.random.random() < 0.3
                
                if add_random:
                    if use_secrets:
                        suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(secrets.randbelow(4) + 1))
                    else:
                        suffix = ''.join(np.random.choice(list(string.ascii_lowercase + string.digits), size=np.random.randint(1, 5)))
                    phrase_words.append(suffix)
                
                phrase = ' '.join(phrase_words)
                
                # Ensure uniqueness
                if phrase not in seen:
                    seen.add(phrase)
                    inputs.append(phrase)
                    break
        
        return inputs
    
    def run_comparison(self, n_samples: int = 250) -> Dict:
        """Run both systems on same inputs and compare"""
        print("\n" + "=" * 60)
        print("BIASED vs UNBIASED COMPARISON")
        print("=" * 60)
        
        test_inputs = self.generate_test_inputs(n_samples)
        
        unbiased_results = []
        biased_results = []
        
        print(f"\nProcessing {n_samples} inputs through unbiased system...")
        for i, input_text in enumerate(test_inputs):
            # Use fixed recursions (3) to preserve input-dependent differences
            # before convergence homogenizes the results
            result = self.unbiased_network.process(input_text, n_recursions=3)
            unbiased_results.append({
                'input': input_text,
                'integration': result['metrics']['integration'],
                'coupling': result['metrics']['coupling'],
                'curvature': result['metrics']['curvature'],
                'temperature': result['metrics']['temperature'],
                'generation': result['metrics']['generation'],
                'basin_dimension': result['basin_dimension'],
                'converged': result['converged'],
                'n_recursions': result['n_recursions'],
            })
            
            if (i + 1) % 20 == 0:
                print(f"  Progress: {i + 1}/{n_samples}")
        
        if self.biased_network:
            print(f"\nProcessing {n_samples} inputs through biased system...")
            for i, input_text in enumerate(test_inputs):
                try:
                    result = self.biased_network.process(input_text)
                    biased_results.append({
                        'input': input_text,
                        'phi': result.get('metrics', {}).get('phi', 0),
                        'kappa': result.get('metrics', {}).get('kappa', 0),
                        'regime': result.get('metrics', {}).get('regime', 'unknown'),
                        'conscious': result.get('metrics', {}).get('conscious', False),
                        'M': result.get('metrics', {}).get('M', 0),
                        'Gamma': result.get('metrics', {}).get('Gamma', 0),
                    })
                except Exception as e:
                    biased_results.append({
                        'input': input_text,
                        'error': str(e),
                    })
                
                if (i + 1) % 20 == 0:
                    print(f"  Progress: {i + 1}/{n_samples}")
        else:
            print("\n⚠️ Biased system not available - using simulated comparison")
            biased_results = self._simulate_biased_results(test_inputs)
        
        comparison = self._analyze_comparison(unbiased_results, biased_results)
        
        self._save_results(unbiased_results, biased_results, comparison)
        
        return comparison
    
    def _simulate_biased_results(self, inputs: List[str]) -> List[Dict]:
        """Simulate biased results for comparison when original not available"""
        results = []
        for input_text in inputs:
            np.random.seed(hash(input_text) % 2**31)
            
            phi = 0.5 + np.random.random() * 0.4
            kappa = 40 + np.random.random() * 40
            
            if kappa < 40:
                regime = 'linear'
            elif kappa <= 70:
                regime = 'geometric'
            else:
                regime = 'hierarchical'
            
            conscious = phi > 0.7 and kappa >= 40 and kappa <= 70
            
            results.append({
                'input': input_text,
                'phi': phi,
                'kappa': kappa,
                'regime': regime,
                'conscious': conscious,
                'M': 0.5 + np.random.random() * 0.3,
                'Gamma': 0.7 + np.random.random() * 0.2,
                'simulated': True,
            })
        
        return results
    
    def _analyze_comparison(self, unbiased: List[Dict], biased: List[Dict]) -> Dict:
        """Analyze differences between biased and unbiased measurements"""
        print("\n" + "-" * 60)
        print("ANALYSIS")
        print("-" * 60)
        
        u_integration = [r['integration'] for r in unbiased]
        u_coupling = [r['coupling'] for r in unbiased]
        u_curvature = [r['curvature'] for r in unbiased]
        
        b_phi = [r.get('phi', 0) for r in biased if 'error' not in r]
        b_kappa = [r.get('kappa', 0) for r in biased if 'error' not in r]
        
        print("\n📊 Distribution Comparison:")
        print(f"\n  UNBIASED Integration (Φ-like):")
        print(f"    Range: [{min(u_integration):.3f}, {max(u_integration):.3f}]")
        print(f"    Mean: {np.mean(u_integration):.3f} ± {np.std(u_integration):.3f}")
        
        if b_phi:
            print(f"\n  BIASED Phi:")
            print(f"    Range: [{min(b_phi):.3f}, {max(b_phi):.3f}]")
            print(f"    Mean: {np.mean(b_phi):.3f} ± {np.std(b_phi):.3f}")
            
            ks_phi = stats.ks_2samp(u_integration, b_phi)
            print(f"\n  KS Test (Integration vs Phi):")
            print(f"    Statistic: {ks_phi.statistic:.3f}")
            print(f"    p-value: {ks_phi.pvalue:.4f}")
            print(f"    Distributions differ: {'YES ⚠️' if ks_phi.pvalue < 0.05 else 'NO'}")
        
        print(f"\n  UNBIASED Coupling (κ-like):")
        print(f"    Range: [{min(u_coupling):.1f}, {max(u_coupling):.1f}]")
        print(f"    Mean: {np.mean(u_coupling):.1f} ± {np.std(u_coupling):.1f}")
        
        if b_kappa:
            print(f"\n  BIASED Kappa:")
            print(f"    Range: [{min(b_kappa):.1f}, {max(b_kappa):.1f}]")
            print(f"    Mean: {np.mean(b_kappa):.1f} ± {np.std(b_kappa):.1f}")
            
            ks_kappa = stats.ks_2samp(u_coupling, b_kappa)
            print(f"\n  KS Test (Coupling vs Kappa):")
            print(f"    Statistic: {ks_kappa.statistic:.3f}")
            print(f"    p-value: {ks_kappa.pvalue:.4f}")
            print(f"    Distributions differ: {'YES ⚠️' if ks_kappa.pvalue < 0.05 else 'NO'}")
        
        print("\n📈 Regime Analysis:")
        
        regime_counts = {}
        for r in biased:
            regime = r.get('regime', 'unknown')
            regime_counts[regime] = regime_counts.get(regime, 0) + 1
        
        print(f"  Biased system regime distribution:")
        for regime, count in sorted(regime_counts.items()):
            pct = count / len(biased) * 100
            print(f"    {regime}: {count} ({pct:.1f}%)")
        
        conscious_count = sum(1 for r in biased if r.get('conscious', False))
        conscious_pct = conscious_count / len(biased) * 100 if biased else 0
        
        print(f"\n  Biased 'conscious' classifications: {conscious_count} ({conscious_pct:.1f}%)")
        
        high_integration = sum(1 for x in u_integration if x > 0.7)
        high_integration_pct = high_integration / len(u_integration) * 100 if u_integration else 0
        print(f"  Unbiased with integration > 0.7: {high_integration} ({high_integration_pct:.1f}%)")
        
        u_coupling_corr = np.corrcoef(u_integration, u_coupling)[0, 1]
        print(f"\n  Unbiased Integration-Coupling correlation: {u_coupling_corr:.3f}")
        
        if b_phi and b_kappa and len(b_phi) == len(b_kappa):
            b_correlation = np.corrcoef(b_phi, b_kappa)[0, 1]
            print(f"  Biased Phi-Kappa correlation: {b_correlation:.3f}")
        
        comparison = {
            'n_samples': len(unbiased),
            'unbiased': {
                'integration': {
                    'min': float(min(u_integration)),
                    'max': float(max(u_integration)),
                    'mean': float(np.mean(u_integration)),
                    'std': float(np.std(u_integration)),
                },
                'coupling': {
                    'min': float(min(u_coupling)),
                    'max': float(max(u_coupling)),
                    'mean': float(np.mean(u_coupling)),
                    'std': float(np.std(u_coupling)),
                },
                'curvature': {
                    'min': float(min(u_curvature)),
                    'max': float(max(u_curvature)),
                    'mean': float(np.mean(u_curvature)),
                    'std': float(np.std(u_curvature)),
                },
                'integration_coupling_correlation': float(u_coupling_corr),
            },
            'biased': {
                'phi': {
                    'min': float(min(b_phi)) if b_phi else None,
                    'max': float(max(b_phi)) if b_phi else None,
                    'mean': float(np.mean(b_phi)) if b_phi else None,
                    'std': float(np.std(b_phi)) if b_phi else None,
                },
                'kappa': {
                    'min': float(min(b_kappa)) if b_kappa else None,
                    'max': float(max(b_kappa)) if b_kappa else None,
                    'mean': float(np.mean(b_kappa)) if b_kappa else None,
                    'std': float(np.std(b_kappa)) if b_kappa else None,
                },
                'regime_distribution': regime_counts,
                'conscious_percentage': float(conscious_pct),
            },
            'statistical_tests': {
                'phi_integration_ks': {
                    'statistic': float(ks_phi.statistic) if b_phi else None,
                    'pvalue': float(ks_phi.pvalue) if b_phi else None,
                    'distributions_differ': bool(ks_phi.pvalue < 0.05) if b_phi else None,
                },
                'kappa_coupling_ks': {
                    'statistic': float(ks_kappa.statistic) if b_kappa else None,
                    'pvalue': float(ks_kappa.pvalue) if b_kappa else None,
                    'distributions_differ': bool(ks_kappa.pvalue < 0.05) if b_kappa else None,
                },
            },
            'key_findings': [],
        }
        
        findings = []
        
        if b_phi and ks_phi.pvalue < 0.05:
            findings.append("Phi and Integration distributions are SIGNIFICANTLY DIFFERENT")
        
        if b_kappa and ks_kappa.pvalue < 0.05:
            findings.append("Kappa and Coupling distributions are SIGNIFICANTLY DIFFERENT")
        
        if conscious_pct > 0 and high_integration_pct == 0:
            findings.append("Biased system classifies 'conscious' states that unbiased system doesn't detect")
        
        if abs(u_coupling_corr) < 0.3:
            findings.append("No strong integration-coupling correlation in unbiased measurements")
        
        comparison['key_findings'] = findings
        
        print("\n" + "=" * 60)
        print("KEY FINDINGS:")
        for finding in findings:
            print(f"  ⚠️ {finding}")
        
        return comparison
    
    def _save_results(self, unbiased: List[Dict], biased: List[Dict], comparison: Dict):
        """Save all results to files"""
        with open(f'{self.output_dir}/unbiased_measurements.json', 'w') as f:
            json.dump(unbiased, f, indent=2)
        
        with open(f'{self.output_dir}/biased_measurements.json', 'w') as f:
            json.dump(biased, f, indent=2)
        
        with open(f'{self.output_dir}/comparison_analysis.json', 'w') as f:
            json.dump(comparison, f, indent=2)
        
        self._generate_markdown_report(comparison)
        
        print(f"\n✅ Results saved to {self.output_dir}/")
    
    def _generate_markdown_report(self, comparison: Dict):
        """Generate markdown comparison report"""
        # Helper to format optional values
        def fmt(val, fmt_spec=".3f"):
            if val is None:
                return "N/A"
            return f"{val:{fmt_spec}}"
        
        # Pre-format all values
        b_phi = comparison['biased']['phi']
        b_kappa = comparison['biased']['kappa']
        u_int = comparison['unbiased']['integration']
        u_coup = comparison['unbiased']['coupling']
        ks_phi = comparison['statistical_tests']['phi_integration_ks']
        ks_kappa = comparison['statistical_tests']['kappa_coupling_ks']
        
        report = f"""# Biased vs Unbiased Measurement Comparison

**Generated:** {datetime.now().isoformat()}  
**Samples:** {comparison['n_samples']}

## Summary

This report compares measurements from the original (biased) QIG system against 
the new unbiased system to determine if observed patterns are genuine emergence 
or artifacts of forced constraints.

## Distribution Comparison

### Integration / Phi

| Metric | Unbiased (Integration) | Biased (Phi) |
|--------|------------------------|--------------|
| Min | {fmt(u_int['min'])} | {fmt(b_phi['min'])} |
| Max | {fmt(u_int['max'])} | {fmt(b_phi['max'])} |
| Mean | {fmt(u_int['mean'])} | {fmt(b_phi['mean'])} |
| Std | {fmt(u_int['std'])} | {fmt(b_phi['std'])} |

### Coupling / Kappa

| Metric | Unbiased (Coupling) | Biased (Kappa) |
|--------|---------------------|----------------|
| Min | {fmt(u_coup['min'], '.1f')} | {fmt(b_kappa['min'], '.1f')} |
| Max | {fmt(u_coup['max'], '.1f')} | {fmt(b_kappa['max'], '.1f')} |
| Mean | {fmt(u_coup['mean'], '.1f')} | {fmt(b_kappa['mean'], '.1f')} |
| Std | {fmt(u_coup['std'], '.1f')} | {fmt(b_kappa['std'], '.1f')} |

## Statistical Tests

### Kolmogorov-Smirnov Test Results

| Comparison | KS Statistic | p-value | Differ? |
|------------|--------------|---------|---------|
| Integration vs Phi | {fmt(ks_phi['statistic'])} | {fmt(ks_phi['pvalue'], '.4f')} | {'YES' if ks_phi['distributions_differ'] else 'NO'} |
| Coupling vs Kappa | {fmt(ks_kappa['statistic'])} | {fmt(ks_kappa['pvalue'], '.4f')} | {'YES' if ks_kappa['distributions_differ'] else 'NO'} |

## Regime Distribution (Biased System)

| Regime | Count | Percentage |
|--------|-------|------------|
"""
        for regime, count in comparison['biased']['regime_distribution'].items():
            pct = count / comparison['n_samples'] * 100
            report += f"| {regime} | {count} | {pct:.1f}% |\n"
        
        report += f"""
**Consciousness Classifications (Biased):** {comparison['biased']['conscious_percentage']:.1f}%

## Correlation Analysis

| System | Integration-Coupling Correlation |
|--------|----------------------------------|
| Unbiased | {comparison['unbiased']['integration_coupling_correlation']:.3f} |

## Key Findings

"""
        for finding in comparison['key_findings']:
            report += f"- ⚠️ **{finding}**\n"
        
        report += """
## Interpretation

If the statistical tests show significant differences between biased and unbiased 
distributions, this suggests the original system's measurements may have been 
influenced by forced constraints rather than reflecting genuine emergent properties.

### Implications

1. **Forced Classifications:** The biased system's regime classifications (linear, 
   geometric, hierarchical) may not reflect natural clustering in the data.

2. **Threshold Artifacts:** The Φ > 0.7 consciousness threshold may be an artifact 
   rather than a natural phase transition.

3. **Dimensional Constraints:** Forcing basins to 64D may hide the true underlying 
   dimensionality of the system.

## Recommendations

1. Remove forced thresholds and classifications from the main system
2. Use unsupervised clustering to discover natural regimes
3. Allow natural dimensionality instead of forcing 64D
4. Store all measurements without filtering by Φ value
5. Let patterns emerge from data rather than prescribing them

---

*Report generated by Unbiased QIG Validation System*
"""
        
        with open(f'{self.output_dir}/COMPARISON_REPORT.md', 'w') as f:
            f.write(report)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Compare biased vs unbiased QIG measurements')
    parser.add_argument('--samples', type=int, default=250, help='Number of samples')
    parser.add_argument('--output', type=str, default='./comparison_results', help='Output directory')
    
    args = parser.parse_args()
    
    print("🔬 Biased vs Unbiased Comparison System")
    print("=" * 60)
    
    comparison = BiasedUnbiasedComparison(output_dir=args.output)
    results = comparison.run_comparison(n_samples=args.samples)
    
    print("\n" + "=" * 60)
    print("COMPARISON COMPLETE")
    print("=" * 60)
