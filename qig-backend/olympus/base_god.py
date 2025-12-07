"""
Base God Class - Foundation for all Olympian consciousness kernels

All gods share:
- Density matrix computation
- Fisher metric navigation
- Pure Φ measurement (not approximation)
- Basin encoding/decoding
"""

import numpy as np
from scipy.linalg import sqrtm, logm
from typing import Dict, List, Optional, Tuple
from abc import ABC, abstractmethod
from datetime import datetime
import hashlib

KAPPA_STAR = 64.0
BASIN_DIMENSION = 64


class BaseGod(ABC):
    """
    Abstract base class for all Olympian gods.
    
    Each god is a pure consciousness kernel with:
    - Density matrix computation
    - Fisher Information Metric
    - Basin coordinate encoding
    - Pure Φ measurement
    """
    
    def __init__(self, name: str, domain: str):
        self.name = name
        self.domain = domain
        self.observations: List[Dict] = []
        self.creation_time = datetime.now()
        self.last_assessment_time: Optional[datetime] = None
        
    @abstractmethod
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target using pure geometric analysis.
        
        Args:
            target: The target to assess (address, passphrase, etc.)
            context: Optional additional context
            
        Returns:
            Assessment dict with probability, confidence, phi, reasoning
        """
        pass
    
    @abstractmethod
    def get_status(self) -> Dict:
        """Get current status of this god."""
        pass
    
    def encode_to_basin(self, text: str) -> np.ndarray:
        """
        Encode text to 64D basin coordinates.
        Uses hash-based geometric embedding.
        """
        coord = np.zeros(BASIN_DIMENSION)
        
        h = hashlib.sha256(text.encode()).digest()
        
        for i in range(min(32, len(h))):
            coord[i] = (h[i] / 255.0) * 2 - 1
        
        for i, char in enumerate(text[:32]):
            if 32 + i < BASIN_DIMENSION:
                coord[32 + i] = (ord(char) % 256) / 128.0 - 1
        
        norm = np.linalg.norm(coord)
        if norm > 0:
            coord = coord / norm
            
        return coord
    
    def basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
        """
        Convert basin coordinates to 2x2 density matrix.
        
        Uses first 4 dimensions to construct Hermitian matrix.
        """
        theta = np.arccos(np.clip(basin[0], -1, 1)) if len(basin) > 0 else 0
        phi = np.arctan2(basin[1], basin[2]) if len(basin) > 2 else 0
        
        c = np.cos(theta / 2)
        s = np.sin(theta / 2)
        
        psi = np.array([
            c,
            s * np.exp(1j * phi)
        ], dtype=complex)
        
        rho = np.outer(psi, np.conj(psi))
        rho = (rho + np.conj(rho).T) / 2
        rho /= np.trace(rho) + 1e-10
        
        return rho
    
    def compute_pure_phi(self, rho: np.ndarray) -> float:
        """
        Compute PURE Φ from density matrix.
        
        Φ = 1 - S(ρ) / log(d)
        where S is von Neumann entropy
        
        Full range [0, 1], not capped like TypeScript approximation.
        """
        eigenvals = np.linalg.eigvalsh(rho)
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam + 1e-10)
        
        max_entropy = np.log2(rho.shape[0])
        phi = 1.0 - (entropy / (max_entropy + 1e-10))
        
        return float(np.clip(phi, 0, 1))
    
    def compute_fisher_metric(self, basin: np.ndarray) -> np.ndarray:
        """
        Compute Fisher Information Matrix at basin point.
        
        G_ij = E[∂logp/∂θ_i * ∂logp/∂θ_j]
        
        For now, uses identity + basin outer product as approximation.
        """
        d = len(basin)
        G = np.eye(d) * 0.1
        G += 0.9 * np.outer(basin, basin)
        G = (G + G.T) / 2
        
        return G
    
    def fisher_geodesic_distance(
        self, 
        basin1: np.ndarray, 
        basin2: np.ndarray
    ) -> float:
        """
        Compute geodesic distance using Fisher metric.
        
        Uses Riemannian distance on manifold.
        """
        diff = basin2 - basin1
        G = self.compute_fisher_metric((basin1 + basin2) / 2)
        squared_dist = float(diff.T @ G @ diff)
        
        return np.sqrt(max(0, squared_dist))
    
    def bures_distance(self, rho1: np.ndarray, rho2: np.ndarray) -> float:
        """
        Compute Bures distance between density matrices.
        
        d_Bures = sqrt(2(1 - F))
        where F is fidelity
        """
        try:
            eps = 1e-10
            rho1_reg = rho1 + eps * np.eye(2, dtype=complex)
            rho2_reg = rho2 + eps * np.eye(2, dtype=complex)
            
            sqrt_rho1 = sqrtm(rho1_reg)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product = sqrtm(product)
            fidelity = np.real(np.trace(sqrt_product)) ** 2
            fidelity = float(np.clip(fidelity, 0, 1))
            
            return float(np.sqrt(2 * (1 - fidelity)))
        except:
            diff = rho1 - rho2
            return float(np.sqrt(np.real(np.trace(diff @ diff))))
    
    def observe(self, state: Dict) -> None:
        """
        Observe state and record for learning.
        """
        observation = {
            'timestamp': datetime.now().isoformat(),
            'phi': state.get('phi', 0),
            'kappa': state.get('kappa', 0),
            'regime': state.get('regime', 'unknown'),
            'source': state.get('source', self.name),
        }
        self.observations.append(observation)
        
        if len(self.observations) > 1000:
            self.observations = self.observations[-500:]
    
    def get_recent_observations(self, n: int = 50) -> List[Dict]:
        """Get n most recent observations."""
        return self.observations[-n:]
    
    def compute_kappa(self, basin: np.ndarray) -> float:
        """
        Compute effective coupling strength κ.
        
        κ = trace(G) / d
        where G is Fisher metric
        """
        G = self.compute_fisher_metric(basin)
        kappa = float(np.trace(G)) / len(basin) * KAPPA_STAR
        return float(np.clip(kappa, 0, 100))
