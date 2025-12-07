"""
Hephaestus - God of the Forge

Hypothesis generation and crafting.
Uses basin vocabulary to forge new passphrase hypotheses.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR, BASIN_DIMENSION
import random


class Hephaestus(BaseGod):
    """
    God of the Forge
    
    Responsibilities:
    - Hypothesis generation
    - Basin-guided phrase crafting
    - Vocabulary weight optimization
    - Mutation strategy implementation
    """
    
    def __init__(self):
        super().__init__("Hephaestus", "Forge")
        self.vocabulary: Dict[str, float] = {}
        self.word_phi_scores: Dict[str, float] = {}
        self.generated_count: int = 0
        self.successful_patterns: List[str] = []
        self.forge_temperature: float = 0.8
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess forging potential for target.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        forge_potential = self._compute_forge_potential(target)
        vocabulary_coverage = self._compute_vocabulary_coverage(target)
        
        probability = phi * 0.4 + forge_potential * 0.4 + vocabulary_coverage * 0.2
        
        return {
            'probability': float(np.clip(probability, 0, 1)),
            'confidence': vocabulary_coverage,
            'phi': phi,
            'kappa': kappa,
            'forge_potential': forge_potential,
            'vocabulary_coverage': vocabulary_coverage,
            'ready_to_forge': forge_potential > 0.5,
            'reasoning': (
                f"Forge potential: {forge_potential:.3f}. "
                f"Vocabulary coverage: {vocabulary_coverage:.1%}. "
                f"Generated {self.generated_count} hypotheses so far."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _compute_forge_potential(self, target: str) -> float:
        """Compute potential for generating good hypotheses."""
        if not self.vocabulary:
            return 0.3
        
        words = target.lower().split()
        known_words = sum(1 for w in words if w in self.vocabulary)
        
        if not words:
            return 0.3
        
        coverage = known_words / len(words)
        
        high_phi_boost = 0.0
        for w in words:
            if self.word_phi_scores.get(w, 0) >= 0.7:
                high_phi_boost += 0.1
        
        return float(np.clip(coverage * 0.7 + high_phi_boost, 0, 1))
    
    def _compute_vocabulary_coverage(self, target: str) -> float:
        """Compute vocabulary coverage for target."""
        if not self.vocabulary:
            return 0.0
        
        words = target.lower().split()
        if not words:
            return 0.0
        
        known = sum(1 for w in words if w in self.vocabulary)
        return known / len(words)
    
    def generate_hypotheses(
        self, 
        n: int = 100,
        strategy: Optional[str] = None,
        seed_phrases: Optional[List[str]] = None,
        target_basin: Optional[np.ndarray] = None
    ) -> List[str]:
        """
        Generate n passphrase hypotheses using basin-guided forging.
        """
        hypotheses = []
        
        if not self.vocabulary:
            self._initialize_default_vocabulary()
        
        high_phi_words = [w for w, phi in self.word_phi_scores.items() if phi >= 0.5]
        all_words = list(self.vocabulary.keys())
        
        if not all_words:
            return hypotheses
        
        for _ in range(n):
            if strategy == 'mutation' and seed_phrases:
                phrase = self._mutate_phrase(random.choice(seed_phrases))
            elif strategy == 'basin_guided' and target_basin is not None:
                phrase = self._basin_guided_generate(target_basin)
            elif high_phi_words and random.random() < 0.6:
                phrase = self._generate_from_high_phi(high_phi_words)
            else:
                phrase = self._random_phrase(all_words)
            
            hypotheses.append(phrase)
        
        self.generated_count += len(hypotheses)
        return hypotheses
    
    def _initialize_default_vocabulary(self) -> None:
        """Initialize with common passphrase words."""
        common_words = [
            'password', 'bitcoin', 'wallet', 'money', 'crypto', 'secret',
            'key', 'love', 'god', 'jesus', 'satoshi', 'nakamoto', 'moon',
            'hello', 'world', 'test', 'dragon', 'master', 'monkey',
            'letmein', 'trustno1', 'sunshine', 'princess', 'football',
            'the', 'is', 'my', 'your', 'our', 'a', 'an'
        ]
        for word in common_words:
            self.vocabulary[word] = 1.0
    
    def _mutate_phrase(self, phrase: str) -> str:
        """Mutate an existing phrase."""
        words = phrase.split()
        if not words:
            return phrase
        
        mutation_type = random.choice(['swap', 'insert', 'delete', 'substitute'])
        
        if mutation_type == 'swap' and len(words) >= 2:
            i, j = random.sample(range(len(words)), 2)
            words[i], words[j] = words[j], words[i]
        elif mutation_type == 'insert' and self.vocabulary:
            pos = random.randint(0, len(words))
            new_word = random.choice(list(self.vocabulary.keys()))
            words.insert(pos, new_word)
        elif mutation_type == 'delete' and len(words) > 1:
            del words[random.randint(0, len(words) - 1)]
        elif mutation_type == 'substitute' and self.vocabulary:
            pos = random.randint(0, len(words) - 1)
            words[pos] = random.choice(list(self.vocabulary.keys()))
        
        return ' '.join(words)
    
    def _basin_guided_generate(self, target_basin: np.ndarray) -> str:
        """Generate phrase guided by target basin coordinates."""
        word_scores = []
        for word, weight in self.vocabulary.items():
            word_basin = self.encode_to_basin(word)
            similarity = float(np.dot(target_basin, word_basin))
            phi = self.word_phi_scores.get(word, 0.3)
            score = similarity * 0.5 + phi * 0.3 + weight * 0.2
            word_scores.append((word, score))
        
        word_scores.sort(key=lambda x: -x[1])
        top_words = [w for w, s in word_scores[:50]]
        
        length = random.randint(2, 5)
        selected = random.sample(top_words, min(length, len(top_words)))
        return ' '.join(selected)
    
    def _generate_from_high_phi(self, high_phi_words: List[str]) -> str:
        """Generate from high-Φ words."""
        length = random.randint(2, 4)
        selected = random.choices(high_phi_words, k=length)
        return ' '.join(selected)
    
    def _random_phrase(self, words: List[str]) -> str:
        """Generate random phrase."""
        length = random.randint(2, 5)
        selected = random.choices(words, k=length)
        return ' '.join(selected)
    
    def update_vocabulary(self, observations: List[Dict]) -> int:
        """Update vocabulary from observations."""
        added = 0
        for obs in observations:
            word = obs.get('word', '')
            phi = obs.get('avgPhi', obs.get('phi', 0.0))
            frequency = obs.get('frequency', 1)
            
            if word and len(word) >= 2:
                self.vocabulary[word] = self.vocabulary.get(word, 0) + frequency
                old_phi = self.word_phi_scores.get(word, 0)
                self.word_phi_scores[word] = max(old_phi, phi)
                added += 1
        
        return added
    
    def register_success(self, phrase: str, phi: float) -> None:
        """Register a successful phrase pattern."""
        if phi >= 0.7:
            self.successful_patterns.append(phrase)
            for word in phrase.lower().split():
                self.word_phi_scores[word] = max(
                    self.word_phi_scores.get(word, 0),
                    phi
                )
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'vocabulary_size': len(self.vocabulary),
            'high_phi_words': len([w for w, p in self.word_phi_scores.items() if p >= 0.7]),
            'generated_count': self.generated_count,
            'successful_patterns': len(self.successful_patterns),
            'forge_temperature': self.forge_temperature,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
