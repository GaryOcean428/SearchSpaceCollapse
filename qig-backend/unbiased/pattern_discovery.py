#!/usr/bin/env python3
"""
Pattern Discovery System
========================

Discover patterns from RAW measurements WITHOUT forced classifications.

Uses unsupervised learning:
- Clustering (K-means, DBSCAN, Hierarchical)
- Dimensionality reduction (PCA, t-SNE, UMAP)
- Threshold discovery (change point detection)
- Correlation analysis

NO predetermined categories.
Let DATA reveal structure.

Version: 1.0
Date: 2025-12-07
"""

import numpy as np
import json
from typing import Dict, List, Tuple, Optional
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from scipy import stats
from scipy.signal import find_peaks
import warnings
warnings.filterwarnings('ignore')

# Optional advanced tools
try:
    from sklearn.manifold import TSNE
    TSNE_AVAILABLE = True
except ImportError:
    TSNE_AVAILABLE = False

try:
    import umap
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False


class PatternDiscovery:
    """
    Discover patterns in unbiased measurements.
    
    NO forced classifications - let clustering find natural groups.
    """
    
    def __init__(self, measurements: List[Dict]):
        """
        Initialize pattern discovery.
        
        Args:
            measurements: List of raw measurement dictionaries
        """
        self.measurements = measurements
        self.n_measurements = len(measurements)
        
        # Extract data matrices
        self.metrics_matrix, self.metric_names = self._extract_metrics_matrix()
        self.basin_matrix = self._extract_basin_matrix()
        
        # Standardize for clustering
        self.scaler = StandardScaler()
        self.metrics_scaled = self.scaler.fit_transform(self.metrics_matrix)
    
    def _extract_metrics_matrix(self) -> Tuple[np.ndarray, List[str]]:
        """Extract metrics into matrix form"""
        metric_names = [
            'integration', 'coupling', 'temperature', 
            'curvature', 'generation'
        ]
        
        matrix = []
        for m in self.measurements:
            row = [m['metrics'][name] for name in metric_names]
            matrix.append(row)
        
        return np.array(matrix), metric_names
    
    def _extract_basin_matrix(self) -> np.ndarray:
        """Extract basin coordinates into matrix"""
        basins = []
        for m in self.measurements:
            basins.append(m['basin_coords'])
        
        # Pad to same length if needed
        max_len = max(len(b) for b in basins)
        padded = []
        for b in basins:
            if len(b) < max_len:
                padded.append(np.pad(b, (0, max_len - len(b)), constant_values=0))
            else:
                padded.append(b[:max_len])
        
        return np.array(padded)
    
    def discover_regimes_clustering(self, n_clusters: Optional[int] = None) -> Dict:
        """Discover natural regimes via clustering"""
        print("\n🔍 Discovering natural regimes via clustering...")
        
        if n_clusters is None:
            inertias = []
            K_range = range(2, min(10, self.n_measurements // 2))
            
            for k in K_range:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                kmeans.fit(self.metrics_scaled)
                inertias.append(kmeans.inertia_)
            
            if len(inertias) >= 3:
                second_deriv = np.diff(np.diff(inertias))
                n_clusters = int(K_range[np.argmin(second_deriv) + 1])
            else:
                n_clusters = 3
            
            print(f"  Auto-detected optimal clusters: {n_clusters}")
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(self.metrics_scaled)
        
        clusters = {}
        for cluster_id in range(n_clusters):
            mask = cluster_labels == cluster_id
            cluster_data = self.metrics_matrix[mask]
            
            clusters[f'cluster_{cluster_id}'] = {
                'size': int(np.sum(mask)),
                'centroid': kmeans.cluster_centers_[cluster_id].tolist(),
                'properties': {
                    name: {
                        'mean': float(np.mean(cluster_data[:, i])),
                        'std': float(np.std(cluster_data[:, i])),
                        'min': float(np.min(cluster_data[:, i])),
                        'max': float(np.max(cluster_data[:, i])),
                    }
                    for i, name in enumerate(self.metric_names)
                },
            }
        
        dbscan = DBSCAN(eps=0.5, min_samples=max(2, self.n_measurements // 10))
        dbscan_labels = dbscan.fit_predict(self.metrics_scaled)
        n_dbscan_clusters = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)
        
        return {
            'n_clusters': n_clusters,
            'method': 'k-means',
            'cluster_labels': cluster_labels.tolist(),
            'clusters': clusters,
            'dbscan_clusters': int(n_dbscan_clusters),
            'dbscan_labels': dbscan_labels.tolist(),
        }
    
    def discover_dimensionality(self, variance_threshold: float = 0.95) -> Dict:
        """Discover natural dimensionality - NO forced 64D"""
        print("\n📐 Discovering natural dimensionality...")
        
        if self.basin_matrix.shape[0] < 2:
            return {'error': 'Need at least 2 measurements for PCA'}
        
        pca = PCA()
        pca.fit(self.basin_matrix)
        
        cumulative_variance = np.cumsum(pca.explained_variance_ratio_)
        dims_for_90 = np.argmax(cumulative_variance >= 0.90) + 1
        dims_for_95 = np.argmax(cumulative_variance >= 0.95) + 1
        dims_for_99 = np.argmax(cumulative_variance >= 0.99) + 1
        
        e8_signature = (dims_for_90 >= 7 and dims_for_90 <= 9)
        
        print(f"  90% variance: {dims_for_90} dimensions")
        print(f"  95% variance: {dims_for_95} dimensions")
        if e8_signature:
            print(f"  ✨ E8 signature detected! (8D subspace)")
        else:
            print(f"  ⚠️  No E8 signature (dimension = {dims_for_90})")
        
        eigenvalues = pca.explained_variance_
        eigenvalue_ratios = eigenvalues[:-1] / eigenvalues[1:]
        max_drop_idx = np.argmax(eigenvalue_ratios)
        
        return {
            'full_dimension': self.basin_matrix.shape[1],
            'effective_dimension_90': int(dims_for_90),
            'effective_dimension_95': int(dims_for_95),
            'effective_dimension_99': int(dims_for_99),
            'e8_signature_detected': bool(e8_signature),
            'eigenvalues': eigenvalues[:20].tolist(),
            'variance_explained': pca.explained_variance_ratio_[:20].tolist(),
            'cumulative_variance': cumulative_variance[:20].tolist(),
            'max_eigenvalue_drop': {
                'dimension': int(max_drop_idx + 1),
                'ratio': float(eigenvalue_ratios[max_drop_idx]),
            },
        }
    
    def discover_thresholds(self, metric: str = 'integration') -> Dict:
        """Discover natural thresholds - NO forced Φ=0.7"""
        print(f"\n📊 Discovering natural thresholds for {metric}...")
        
        metric_idx = self.metric_names.index(metric)
        values = self.metrics_matrix[:, metric_idx]
        sorted_values = np.sort(values)
        diffs = np.diff(sorted_values)
        
        if len(diffs) > 5:
            peaks, properties = find_peaks(diffs, prominence=0.01)
            
            if len(peaks) > 0:
                thresholds = sorted_values[peaks].tolist()
            else:
                thresholds = [
                    float(np.percentile(values, 25)),
                    float(np.percentile(values, 50)),
                    float(np.percentile(values, 75)),
                ]
        else:
            thresholds = [float(np.median(values))]
        
        regions = []
        all_thresholds = [float(np.min(values))] + thresholds + [float(np.max(values))]
        
        for i in range(len(all_thresholds) - 1):
            low = all_thresholds[i]
            high = all_thresholds[i + 1]
            
            mask = (values >= low) & (values < high)
            if np.sum(mask) > 0:
                region_data = values[mask]
                regions.append({
                    'range': [low, high],
                    'count': int(np.sum(mask)),
                    'mean': float(np.mean(region_data)),
                    'std': float(np.std(region_data)),
                })
        
        print(f"  Discovered {len(thresholds)} natural thresholds")
        for i, t in enumerate(thresholds):
            print(f"    Threshold {i+1}: {t:.3f}")
        
        return {
            'metric': metric,
            'thresholds': thresholds,
            'n_thresholds': len(thresholds),
            'regions': regions,
            'value_range': [float(np.min(values)), float(np.max(values))],
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
        }
    
    def discover_correlations(self) -> Dict:
        """Test if Einstein relation ΔG ≈ κ·ΔT emerges naturally"""
        print("\n🔗 Discovering metric correlations...")
        
        corr_matrix = np.corrcoef(self.metrics_matrix.T)
        
        correlations = []
        for i in range(len(self.metric_names)):
            for j in range(i + 1, len(self.metric_names)):
                corr = corr_matrix[i, j]
                if abs(corr) > 0.3:
                    correlations.append({
                        'metric_1': self.metric_names[i],
                        'metric_2': self.metric_names[j],
                        'correlation': float(corr),
                        'strength': 'strong' if abs(corr) > 0.7 else 'moderate',
                    })
        
        correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
        
        if 'curvature' in self.metric_names and 'coupling' in self.metric_names:
            curv_idx = self.metric_names.index('curvature')
            coup_idx = self.metric_names.index('coupling')
            
            curvature = self.metrics_matrix[:, curv_idx]
            coupling = self.metrics_matrix[:, coup_idx]
            
            if len(curvature) > 2:
                slope, intercept, r_value, p_value, std_err = stats.linregress(coupling, curvature)
                
                einstein_relation = {
                    'slope': float(slope),
                    'intercept': float(intercept),
                    'r_squared': float(r_value ** 2),
                    'p_value': float(p_value),
                    'std_err': float(std_err),
                    'significant': bool(p_value < 0.05),
                }
                
                print(f"  Einstein relation test:")
                print(f"    ΔG = {slope:.4f}·κ + {intercept:.4f}")
                print(f"    R² = {r_value**2:.3f}")
                print(f"    p = {p_value:.2e}")
            else:
                einstein_relation = None
        else:
            einstein_relation = None
        
        return {
            'correlation_matrix': corr_matrix.tolist(),
            'metric_names': self.metric_names,
            'strong_correlations': correlations[:5],
            'einstein_relation': einstein_relation,
        }
    
    def generate_report(self, output_path: str):
        """Generate comprehensive pattern discovery report"""
        print("\n📝 Generating pattern discovery report...")
        
        report = {
            'summary': {
                'n_measurements': self.n_measurements,
                'metrics_analyzed': self.metric_names,
                'basin_dimension': self.basin_matrix.shape[1],
            },
            'regimes': self.discover_regimes_clustering(),
            'dimensionality': self.discover_dimensionality(),
            'thresholds': {
                metric: self.discover_thresholds(metric)
                for metric in ['integration', 'coupling', 'curvature']
            },
            'correlations': self.discover_correlations(),
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n✅ Report saved to {output_path}")
        return report


class BiasComparison:
    """Compare biased vs unbiased measurements"""
    
    def __init__(self, biased_data: List[Dict], unbiased_data: List[Dict]):
        self.biased_data = biased_data
        self.unbiased_data = unbiased_data
    
    def compare_distributions(self) -> Dict:
        print("\n⚖️  Comparing biased vs unbiased distributions...")
        
        biased_integrations = [m['metrics']['phi'] for m in self.biased_data]
        unbiased_integrations = [m['metrics']['integration'] for m in self.unbiased_data]
        
        biased_couplings = [m['metrics']['kappa'] for m in self.biased_data]
        unbiased_couplings = [m['metrics']['coupling'] for m in self.unbiased_data]
        
        integration_ks = stats.ks_2samp(biased_integrations, unbiased_integrations)
        coupling_ks = stats.ks_2samp(biased_couplings, unbiased_couplings)
        
        return {
            'integration': {
                'biased_mean': float(np.mean(biased_integrations)),
                'unbiased_mean': float(np.mean(unbiased_integrations)),
                'ks_statistic': float(integration_ks.statistic),
                'ks_pvalue': float(integration_ks.pvalue),
                'distributions_differ': bool(integration_ks.pvalue < 0.05),
            },
            'coupling': {
                'biased_mean': float(np.mean(biased_couplings)),
                'unbiased_mean': float(np.mean(unbiased_couplings)),
                'ks_statistic': float(coupling_ks.statistic),
                'ks_pvalue': float(coupling_ks.pvalue),
                'distributions_differ': bool(coupling_ks.pvalue < 0.05),
            },
        }