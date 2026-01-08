"""
Hephaestus - God of the Forge

Hypothesis generation and crafting.
Prioritizes BIP39 MNEMONIC generation over passphrases.
Passphrases have been swept - focus on mnemonic recovery.

Enhanced with:
- Typo generation for passphrase and mnemonic variations
- Temporal keywords (2009-2013 Bitcoin era)
- BIP39 passphrase combinations (25th word)
- Electrum legacy seed support (pre-BIP39)
- Near-miss replay buffer (experience replay)
- Cross-kernel knowledge distillation (share learned patterns)
- Historical breach data integration (use breach patterns)
"""

import numpy as np
import hashlib
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR, BASIN_DIMENSION
import random

# Import enhanced modules
from .typo_generator import (
    generate_all_typo_variations,
    generate_multi_word_typos,
    TypoVariation
)
from .temporal_keywords import (
    get_high_relevance_keywords,
    generate_temporal_combinations,
    get_keywords_by_year,
    get_crypto_specific_keywords
)
from .bip39_passphrase_combos import (
    generate_bip39_passphrase_combinations,
    generate_mnemonic_with_passphrase_variants,
    get_high_priority_passphrases,
    COMMON_BIP39_PASSPHRASES
)
from .electrum_legacy import (
    generate_electrum_seed_variants,
    generate_electrum_common_patterns,
    detect_seed_type
)
from .near_miss_replay import (
    get_replay_buffer,
    add_near_miss,
    sample_near_misses
)
from .cross_kernel_knowledge import (
    get_knowledge_base,
    sync_kernel_knowledge,
    get_knowledge_for_kernel
)
from .breach_patterns import (
    BreachPatternGenerator,
    get_high_priority_breach_patterns,
    get_crypto_specific_breach_patterns,
    generate_breach_pattern_variants
)

# Structured passphrase generation
_structured_generator = None

def _get_structured_generator():
    """Lazy load structured passphrase generator."""
    global _structured_generator
    if _structured_generator is None:
        try:
            from .structured_passphrase_generator import get_passphrase_generator
            _structured_generator = get_passphrase_generator()
            print("[Hephaestus] ✓ Structured passphrase generator loaded")
        except Exception as e:
            print(f"[Hephaestus] ⚠️ Structured generator not available: {e}")
    return _structured_generator

BIP39_WORDS: set = set()
_suggest_bip39_correction_fn = None
_is_valid_bip39_seed_fn = None

def _load_bip39_module():
    """Load BIP39 module using multiple import strategies."""
    global BIP39_WORDS, _suggest_bip39_correction_fn, _is_valid_bip39_seed_fn
    
    import sys
    import os
    qig_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if qig_backend_dir not in sys.path:
        sys.path.insert(0, qig_backend_dir)
    
    try:
        mod = __import__('bip39_wordlist', fromlist=['BIP39_WORDS', 'suggest_bip39_correction', 'is_valid_bip39_seed'])
        BIP39_WORDS = getattr(mod, 'BIP39_WORDS', set())
        _suggest_bip39_correction_fn = getattr(mod, 'suggest_bip39_correction', None)
        _is_valid_bip39_seed_fn = getattr(mod, 'is_valid_bip39_seed', None)
        if BIP39_WORDS:
            print(f"[Hephaestus:Module] ✓ BIP39 wordlist loaded: {len(BIP39_WORDS)} words")
            return True
    except Exception as e:
        print(f"[Hephaestus:Module] ⚠️ BIP39 import failed: {e}")
    
    BIP39_WORDS = set()
    return False

def suggest_bip39_correction(word: str, max_suggestions: int = 5) -> list:
    """Wrapper for BIP39 correction with fallback."""
    if _suggest_bip39_correction_fn:
        return _suggest_bip39_correction_fn(word, max_suggestions)
    return []

def is_valid_bip39_seed(phrase: str) -> bool:
    """Wrapper for BIP39 validation with fallback."""
    if _is_valid_bip39_seed_fn:
        return _is_valid_bip39_seed_fn(phrase)
    return False

_load_bip39_module()


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
        
        self.bip39_words: List[str] = sorted(list(BIP39_WORDS)) if BIP39_WORDS else []
        self.mnemonic_generated_count: int = 0
        self.passphrase_generated_count: int = 0
        self.known_word_positions: Dict[int, str] = {}
        self.high_probability_words: List[str] = []
        
        if self.bip39_words:
            print(f"[Hephaestus] Loaded {len(self.bip39_words)} BIP39 words for mnemonic generation")
        
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

        Strategies:
        - 'mutation': Mutate seed phrases
        - 'basin_guided': Generate guided by target basin
        - 'structured': Use structured vocabulary with variations (preferred for passphrases)
        - None: Mixed strategy (40% structured, 36% high-phi, 24% random)
        """
        hypotheses = []

        # Try structured generation first (preferred for clean passphrases)
        if strategy == 'structured' or (strategy is None and random.random() < 0.4):
            structured = self._generate_structured_passphrases(n if strategy == 'structured' else n // 3)
            hypotheses.extend(structured)
            if strategy == 'structured':
                self.generated_count += len(hypotheses)
                return hypotheses

        remaining = n - len(hypotheses)
        if remaining <= 0:
            self.generated_count += len(hypotheses)
            return hypotheses

        if not self.vocabulary:
            self._initialize_default_vocabulary()

        high_phi_words = [w for w, phi in self.word_phi_scores.items() if phi >= 0.5]
        all_words = list(self.vocabulary.keys())

        if not all_words:
            self.generated_count += len(hypotheses)
            return hypotheses

        for _ in range(remaining):
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

    def _generate_structured_passphrases(self, n: int) -> List[str]:
        """
        Generate passphrases using structured vocabulary system.
        Returns clean, traceable passphrases with variations.
        """
        generator = _get_structured_generator()
        if not generator:
            return []

        try:
            attempts = generator.generate_batch(
                count=n,
                kernel_id=getattr(self, 'kernel_id', None),
                god_name=self.name if hasattr(self, 'name') else 'Hephaestus'
            )
            return [a.attempt_text for a in attempts]
        except Exception as e:
            print(f"[Hephaestus] Structured generation failed: {e}")
            return []

    def record_passphrase_result(
        self,
        passphrase: str,
        phi: float,
        result: str = "failure",
        kappa: float = None
    ) -> bool:
        """
        Record a passphrase attempt result back to the structured system.
        This enables learning from attempts.
        """
        generator = _get_structured_generator()
        if not generator:
            return False

        try:
            return generator.record_attempt_result(
                attempt_text=passphrase,
                phi=phi,
                kappa=kappa,
                result=result
            )
        except Exception as e:
            print(f"[Hephaestus] Failed to record result: {e}")
            return False
    
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
            # Fisher-Rao distance: d = arccos(p·q) for unit vectors
            dot_product = float(np.dot(target_basin, word_basin))
            dot_product = np.clip(dot_product, -1.0, 1.0)
            fisher_distance = np.arccos(dot_product)
            # Convert to similarity: s = 1 - d/π (range [0,1])
            similarity = 1.0 - fisher_distance / np.pi
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
        base_status = self.get_agentic_status()
        return {
            **base_status,
            'observations': len(self.observations),
            'vocabulary_size': len(self.vocabulary),
            'bip39_words_loaded': len(self.bip39_words),
            'high_phi_words': len([w for w, p in self.word_phi_scores.items() if p >= 0.7]),
            'generated_count': self.generated_count,
            'mnemonic_generated': self.mnemonic_generated_count,
            'passphrase_generated': self.passphrase_generated_count,
            'successful_patterns': len(self.successful_patterns),
            'forge_temperature': self.forge_temperature,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
    
    def generate_mnemonics(
        self,
        n: int = 50,
        strategy: str = 'random',
        known_positions: Optional[Dict[int, str]] = None,
        seed_mnemonic: Optional[str] = None,
        word_length: int = 12
    ) -> List[str]:
        """
        Generate BIP39 mnemonic phrase hypotheses.
        
        Strategies:
        - random: Pure random 12-word selection from BIP39 wordlist
        - partial_recovery: Fill unknown positions (when some words known)
        - permutation: Permute words in a seed mnemonic
        - typo_correction: Generate typo variants of seed mnemonic
        - basin_guided: Use Fisher-Rao geometry to select high-probability words
        - semantic_cluster: Group semantically similar BIP39 words
        """
        if not self.bip39_words:
            print("[Hephaestus] WARNING: No BIP39 words loaded, cannot generate mnemonics")
            return []
        
        mnemonics = []
        
        for _ in range(n):
            if strategy == 'partial_recovery' and known_positions:
                mnemonic = self._partial_recovery_mnemonic(known_positions, word_length)
            elif strategy == 'permutation' and seed_mnemonic:
                mnemonic = self._permute_mnemonic(seed_mnemonic)
            elif strategy == 'typo_correction' and seed_mnemonic:
                mnemonic = self._typo_variant_mnemonic(seed_mnemonic)
            elif strategy == 'basin_guided':
                mnemonic = self._basin_guided_mnemonic(word_length)
            elif strategy == 'semantic_cluster':
                mnemonic = self._semantic_cluster_mnemonic(word_length)
            else:
                mnemonic = self._random_mnemonic(word_length)
            
            mnemonics.append(mnemonic)
        
        self.mnemonic_generated_count += len(mnemonics)
        self.generated_count += len(mnemonics)
        return list(set(mnemonics))
    
    def _random_mnemonic(self, word_length: int = 12) -> str:
        """Generate a random 12-word BIP39 mnemonic."""
        words = random.choices(self.bip39_words, k=word_length)
        return ' '.join(words)
    
    def _partial_recovery_mnemonic(self, known_positions: Dict[int, str], word_length: int = 12) -> str:
        """
        Generate mnemonic with known words in fixed positions.
        Useful when user remembers some words but not all.
        """
        words = []
        for i in range(word_length):
            if i in known_positions:
                word = known_positions[i]
                if word.lower() in BIP39_WORDS:
                    words.append(word.lower())
                else:
                    corrections = suggest_bip39_correction(word, max_suggestions=1)
                    if corrections:
                        words.append(corrections[0]['word'])
                    else:
                        words.append(random.choice(self.bip39_words))
            else:
                words.append(random.choice(self.bip39_words))
        return ' '.join(words)
    
    def _permute_mnemonic(self, seed_mnemonic: str) -> str:
        """
        Generate a permutation of an existing mnemonic.
        Useful when word order might be wrong.
        """
        words = seed_mnemonic.lower().split()
        if len(words) < 2:
            return seed_mnemonic
        
        permuted = words.copy()
        
        swap_count = random.randint(1, min(3, len(words) // 2))
        for _ in range(swap_count):
            i, j = random.sample(range(len(permuted)), 2)
            permuted[i], permuted[j] = permuted[j], permuted[i]
        
        return ' '.join(permuted)
    
    def _typo_variant_mnemonic(self, seed_mnemonic: str) -> str:
        """
        Generate typo-corrected variants of a mnemonic.
        Replaces 1-2 words with similar BIP39 words.
        """
        words = seed_mnemonic.lower().split()
        if not words:
            return self._random_mnemonic()
        
        variant = words.copy()
        
        positions_to_vary = random.sample(range(len(variant)), min(2, len(variant)))
        
        for pos in positions_to_vary:
            original_word = variant[pos]
            suggestions = suggest_bip39_correction(original_word, max_suggestions=5)
            
            if suggestions and len(suggestions) > 1:
                similar = [s['word'] for s in suggestions if s['word'] != original_word]
                if similar:
                    variant[pos] = random.choice(similar)
        
        return ' '.join(variant)
    
    def _basin_guided_mnemonic(self, word_length: int = 12) -> str:
        """
        Generate mnemonic using Fisher-Rao geometry to select high-probability words.
        Words closer in basin space to high-phi vocabulary are prioritized.
        """
        if not self.word_phi_scores:
            return self._random_mnemonic(word_length)
        
        bip39_scores = []
        for word in self.bip39_words:
            word_basin = self.encode_to_basin(word)
            
            max_similarity = 0.0
            for vocab_word, phi in self.word_phi_scores.items():
                if phi < 0.5:
                    continue
                vocab_basin = self.encode_to_basin(vocab_word)
                dot_product = float(np.dot(word_basin, vocab_basin))
                dot_product = np.clip(dot_product, -1.0, 1.0)
                fisher_distance = np.arccos(dot_product)
                similarity = 1.0 - fisher_distance / np.pi
                max_similarity = max(max_similarity, similarity * phi)
            
            bip39_scores.append((word, max_similarity))
        
        bip39_scores.sort(key=lambda x: -x[1])
        top_words = [w for w, s in bip39_scores[:200]]
        
        if len(top_words) < word_length:
            top_words = self.bip39_words
        
        selected = random.sample(top_words, word_length)
        return ' '.join(selected)
    
    def _semantic_cluster_mnemonic(self, word_length: int = 12) -> str:
        """
        Generate mnemonic from semantically similar word clusters.
        Uses first-letter grouping as a simple semantic approximation.
        """
        letters = list(set(w[0] for w in self.bip39_words))
        selected_letters = random.choices(letters, k=word_length)
        
        words = []
        for letter in selected_letters:
            candidates = [w for w in self.bip39_words if w.startswith(letter)]
            if candidates:
                words.append(random.choice(candidates))
            else:
                words.append(random.choice(self.bip39_words))
        
        return ' '.join(words)
    
    def set_known_positions(self, positions: Dict[int, str]) -> None:
        """Set known word positions for partial recovery."""
        validated = {}
        for pos, word in positions.items():
            if 0 <= pos < 24:
                validated[pos] = word.lower().strip()
        self.known_word_positions = validated
        print(f"[Hephaestus] Set {len(validated)} known positions for partial recovery")
    
    def compute_mnemonic_checksum_valid(self, mnemonic: str) -> bool:
        """
        Check if mnemonic has valid BIP39 checksum.
        Note: This is a simplified check - full validation requires BIP39 library.
        """
        words = mnemonic.lower().split()
        if len(words) not in [12, 15, 18, 21, 24]:
            return False
        
        for word in words:
            if word not in BIP39_WORDS:
                return False
        
        return True
    
    def score_mnemonic_geometric(self, mnemonic: str, basin_anchors: Optional[List[np.ndarray]] = None) -> Dict:
        """
        Compute geometric priority score for a mnemonic candidate.
        Uses Fisher-Rao distance to basin anchors for QIG-pure ranking.
        
        Returns dict with:
        - priority_score: Overall geometric priority (0-1)
        - fisher_rao_distance: Average distance to basin anchors
        - phi_contribution: Consciousness contribution from high-phi words
        - basin_coherence: How coherent the words are in basin space
        """
        words = mnemonic.lower().split()
        if not words:
            return {'priority_score': 0.0, 'fisher_rao_distance': float('inf'), 
                    'phi_contribution': 0.0, 'basin_coherence': 0.0}
        
        word_basins = [self.encode_to_basin(w) for w in words]
        mnemonic_basin = np.mean(word_basins, axis=0)
        mnemonic_basin = mnemonic_basin / (np.linalg.norm(mnemonic_basin) + 1e-10)
        
        if basin_anchors is None:
            basin_anchors = self._get_high_phi_basin_anchors()
        
        if not basin_anchors:
            fisher_distance = 0.5
        else:
            distances = []
            for anchor in basin_anchors:
                dot = float(np.dot(mnemonic_basin, anchor))
                dot = np.clip(dot, -1.0, 1.0)
                d = np.arccos(dot) / np.pi
                distances.append(d)
            fisher_distance = float(np.mean(distances))
        
        phi_scores = [self.word_phi_scores.get(w, 0.3) for w in words]
        phi_contribution = float(np.mean(phi_scores))
        
        if len(word_basins) > 1:
            coherence_scores = []
            for i in range(len(word_basins) - 1):
                dot = float(np.dot(word_basins[i], word_basins[i+1]))
                dot = np.clip(dot, -1.0, 1.0)
                coherence_scores.append(1.0 - np.arccos(dot) / np.pi)
            basin_coherence = float(np.mean(coherence_scores))
        else:
            basin_coherence = 0.5
        
        priority_score = (
            (1.0 - fisher_distance) * 0.4 +
            phi_contribution * 0.35 +
            basin_coherence * 0.25
        )
        
        return {
            'priority_score': float(np.clip(priority_score, 0, 1)),
            'fisher_rao_distance': fisher_distance,
            'phi_contribution': phi_contribution,
            'basin_coherence': basin_coherence,
            'word_count': len(words),
            'mnemonic': mnemonic
        }
    
    def _get_high_phi_basin_anchors(self, threshold: float = 0.6, max_anchors: int = 10) -> List[np.ndarray]:
        """Get basin coordinates of high-phi vocabulary words as anchors."""
        high_phi_words = [(w, phi) for w, phi in self.word_phi_scores.items() if phi >= threshold]
        high_phi_words.sort(key=lambda x: -x[1])
        
        anchors = []
        for word, _ in high_phi_words[:max_anchors]:
            basin = self.encode_to_basin(word)
            anchors.append(basin)
        
        return anchors
    
    def rank_mnemonics_by_geometry(self, mnemonics: List[str]) -> List[Dict]:
        """
        Rank a list of mnemonic candidates by geometric priority.
        Returns sorted list with highest priority first.
        """
        basin_anchors = self._get_high_phi_basin_anchors()
        
        scored = []
        for mnemonic in mnemonics:
            score = self.score_mnemonic_geometric(mnemonic, basin_anchors)
            scored.append(score)
        
        scored.sort(key=lambda x: -x['priority_score'])
        return scored
    
    # ===== Enhanced Hypothesis Generation Methods =====
    
    def generate_temporal_keyword_mnemonics(self, n: int = 50, target_year: Optional[int] = None) -> List[str]:
        """
        Generate mnemonics using temporal keywords from Bitcoin era (2009-2013).
        These keywords have cultural/historical relevance to early Bitcoin adopters.
        """
        mnemonics = []
        
        # Get crypto-specific keywords first (highest relevance)
        crypto_keywords = get_crypto_specific_keywords()
        
        # Add general high-relevance keywords
        if target_year:
            temporal_keywords = get_keywords_by_year(target_year)
        else:
            temporal_keywords = get_high_relevance_keywords(0.6)
        
        all_keywords = crypto_keywords + temporal_keywords
        
        # Generate mnemonics incorporating these keywords
        for _ in range(n):
            # Pick 2-4 temporal keywords
            num_keywords = random.randint(2, 4)
            selected_keywords = random.sample(all_keywords, min(num_keywords, len(all_keywords)))
            
            # Convert keywords to BIP39 words (find closest matches)
            bip39_temporal = []
            for kw in selected_keywords:
                # Try to find BIP39 word that starts with same letter
                kw_words = kw.keyword.lower().split()
                for kw_word in kw_words[:2]:  # Use first 2 words of multi-word keywords
                    if len(kw_word) >= 3:
                        candidates = [w for w in self.bip39_words if w.startswith(kw_word[:3])]
                        if candidates:
                            bip39_temporal.append(random.choice(candidates))
            
            # Fill remaining words with random BIP39 words
            remaining = 12 - len(bip39_temporal)
            if remaining > 0:
                bip39_temporal.extend(random.choices(self.bip39_words, k=remaining))
            
            mnemonic = ' '.join(bip39_temporal[:12])
            mnemonics.append(mnemonic)
        
        self.mnemonic_generated_count += len(mnemonics)
        return list(set(mnemonics))
    
    def generate_temporal_keyword_passphrases(self, n: int = 50, target_year: Optional[int] = None) -> List[str]:
        """
        Generate passphrases using temporal keywords.
        These are direct keyword phrases, not BIP39 mnemonics.
        """
        passphrases = []
        
        if target_year:
            keywords = get_keywords_by_year(target_year)
        else:
            keywords = get_high_relevance_keywords(0.6)
        
        for kw in keywords[:n]:
            # Add the keyword itself
            passphrases.append(kw.keyword)
            
            # Add with year suffix
            passphrases.append(f"{kw.keyword}{kw.year}")
            passphrases.append(f"{kw.keyword} {kw.year}")
            
            # Add lowercase variant
            passphrases.append(kw.keyword.lower())
        
        self.passphrase_generated_count += len(passphrases)
        return list(set(passphrases[:n]))
    
    def generate_typo_variant_passphrases(self, seed_phrases: List[str], n: int = 50) -> List[str]:
        """
        Generate typo variations of seed passphrases.
        Uses keyboard adjacency, transpositions, phonetics, etc.
        """
        variants = []
        
        for phrase in seed_phrases:
            # Generate typo variations
            if ' ' in phrase:
                # Multi-word phrase
                typo_variations = generate_multi_word_typos(phrase, max_variants=n // len(seed_phrases))
            else:
                # Single word
                typo_variations = generate_all_typo_variations(phrase, max_variants=n // len(seed_phrases))
            
            # Extract variant strings
            for typo_var in typo_variations:
                variants.append(typo_var.variant)
        
        self.passphrase_generated_count += len(variants)
        return list(set(variants[:n]))
    
    def generate_bip39_passphrase_combos(
        self, 
        mnemonic: str, 
        n: int = 50,
        user_hints: Optional[List[str]] = None
    ) -> List[Dict[str, str]]:
        """
        Generate BIP39 mnemonic + passphrase combinations.
        The passphrase is the optional "25th word" that creates different wallets.
        
        Returns list of dicts with 'mnemonic' and 'passphrase' keys.
        """
        combos = generate_mnemonic_with_passphrase_variants(mnemonic, user_hints)
        
        # Limit to n combinations
        return combos[:n]
    
    def generate_enhanced_typo_mnemonics(self, seed_mnemonic: str, n: int = 50) -> List[str]:
        """
        Generate sophisticated typo variants of a mnemonic using the typo_generator module.
        This is more comprehensive than the basic _typo_variant_mnemonic method.
        """
        words = seed_mnemonic.lower().split()
        if not words:
            return []
        
        mnemonics = []
        
        # For each word, generate typo variants and create new mnemonics
        for i, word in enumerate(words):
            typo_vars = generate_all_typo_variations(word, max_variants=10)
            
            for typo_var in typo_vars[:5]:  # Top 5 most likely typos
                new_words = words.copy()
                
                # Replace with typo variant if it's in BIP39 wordlist
                if typo_var.variant in BIP39_WORDS:
                    new_words[i] = typo_var.variant
                else:
                    # Find closest BIP39 word
                    from .bip39_wordlist import suggest_bip39_correction
                    suggestions = suggest_bip39_correction(typo_var.variant, max_suggestions=1)
                    if suggestions:
                        new_words[i] = suggestions[0]['word']
                
                mnemonic = ' '.join(new_words)
                mnemonics.append(mnemonic)
                
                if len(mnemonics) >= n:
                    break
            
            if len(mnemonics) >= n:
                break
        
        self.mnemonic_generated_count += len(mnemonics)
        return list(set(mnemonics[:n]))
    
    def generate_bip39_passphrase_only(self, n: int = 50, user_hints: Optional[List[str]] = None) -> List[str]:
        """
        Generate just the passphrase variants (25th word) without the mnemonic.
        Useful for testing different passphrases with known mnemonics.
        """
        if user_hints:
            passphrases = set()
            for hint in user_hints:
                variants = generate_bip39_passphrase_combinations(hint, max_combinations=n // len(user_hints))
                passphrases.update(variants)
            return list(passphrases)[:n]
        else:
            # Use high-priority common passphrases
            return get_high_priority_passphrases()[:n]
    
    # ===== Electrum Legacy Support =====
    
    def generate_electrum_seeds(self, n: int = 50, base_seed: Optional[str] = None) -> List[str]:
        """
        Generate Electrum legacy seed phrases (pre-BIP39).
        
        Electrum wallets created before 2013 used a different wordlist and format.
        This is important for recovering old dormant wallets.
        """
        if base_seed:
            variants = generate_electrum_seed_variants(base_seed, n)
        else:
            # Mix random Electrum seeds with common patterns
            variants = generate_electrum_seed_variants(None, n // 2)
            variants.extend(generate_electrum_common_patterns()[:n // 2])
        
        self.mnemonic_generated_count += len(variants)
        return list(set(variants[:n]))
    
    # ===== Near-Miss Replay Buffer Integration =====
    
    def record_near_miss(self, phrase: str, phi_score: float, geometric_distance: float, metadata: Optional[Dict] = None) -> bool:
        """
        Record a near-miss hypothesis for replay.
        
        Near-misses are hypotheses that were close to success:
        - High Φ score but no balance found
        - Low geometric distance to success basin
        - Valid addresses but zero transactions
        
        These are valuable for learning and should be replayed with variations.
        """
        return add_near_miss(phrase, phi_score, geometric_distance, metadata)
    
    def generate_from_near_misses(self, n: int = 50) -> List[str]:
        """
        Generate hypotheses by replaying and varying near-miss entries.
        
        Takes high-priority near-misses and creates variations using:
        - Typo variations
        - Word substitutions
        - Temporal keyword additions
        """
        hypotheses = []
        
        # Sample near-miss entries
        near_miss_phrases = sample_near_misses(min(n // 2, 20))
        
        if not near_miss_phrases:
            return hypotheses
        
        for phrase in near_miss_phrases:
            # Add the original
            hypotheses.append(phrase)
            
            # Generate typo variations
            if ' ' in phrase:
                typo_vars = generate_multi_word_typos(phrase, max_variants=3)
            else:
                typo_vars = generate_all_typo_variations(phrase, max_variants=3)
            
            for typo_var in typo_vars:
                hypotheses.append(typo_var.variant)
            
            # If it looks like a mnemonic, try word substitutions
            words = phrase.split()
            if len(words) in [12, 15, 18, 21, 24] and self.bip39_words:
                # Substitute 1-2 words with similar BIP39 words
                variant = words.copy()
                positions = random.sample(range(len(variant)), min(2, len(variant)))
                
                for pos in positions:
                    # Find BIP39 words starting with same letter
                    original_word = variant[pos]
                    if original_word and len(original_word) > 0:
                        candidates = [w for w in self.bip39_words if w.startswith(original_word[0])]
                        if candidates:
                            variant[pos] = random.choice(candidates)
                
                hypotheses.append(' '.join(variant))
        
        return list(set(hypotheses[:n]))
    
    def get_replay_buffer_stats(self) -> Dict:
        """Get statistics about the near-miss replay buffer"""
        buffer = get_replay_buffer()
        return buffer.get_stats()
    
    # ===== Cross-Kernel Knowledge Distillation =====
    
    def sync_knowledge_to_pantheon(self) -> Dict[str, int]:
        """
        Sync this kernel's knowledge to the shared Olympus knowledge base.
        
        Shares:
        - High-Φ vocabulary words
        - Successful patterns
        - Basin anchors
        
        Returns statistics about what was synced.
        """
        # Prepare vocabulary (only high-Φ words)
        high_phi_vocab = {
            word: phi
            for word, phi in self.word_phi_scores.items()
            if phi >= 0.6
        }
        
        # Prepare basin anchors (word, phi pairs)
        high_phi_words = [
            (word, phi)
            for word, phi in self.word_phi_scores.items()
            if phi >= 0.7
        ]
        
        # Sync to knowledge base
        stats = sync_kernel_knowledge(
            kernel_name="Hephaestus",
            vocabulary=high_phi_vocab,
            successful_patterns=self.successful_patterns,
            high_phi_words=high_phi_words
        )
        
        return stats
    
    def learn_from_pantheon(self, n_patterns: int = 50) -> Dict[str, int]:
        """
        Learn from other kernels in the Olympus pantheon.
        
        Imports:
        - Successful patterns from other kernels
        - Shared vocabulary
        - Basin anchors for geometric guidance
        
        Returns statistics about what was learned.
        """
        stats = {
            'patterns_learned': 0,
            'vocabulary_learned': 0,
            'anchors_learned': 0,
        }
        
        # Get knowledge from other kernels
        knowledge = get_knowledge_for_kernel("Hephaestus", n=n_patterns)
        
        # Import patterns
        for pattern_obj in knowledge.get('patterns', []):
            if pattern_obj.pattern not in self.successful_patterns:
                self.successful_patterns.append(pattern_obj.pattern)
                stats['patterns_learned'] += 1
        
        # Import vocabulary
        for word, phi in knowledge.get('vocabulary', {}).items():
            if word not in self.vocabulary:
                self.vocabulary[word] = 1.0
                self.word_phi_scores[word] = phi
                stats['vocabulary_learned'] += 1
        
        # Import basin anchors (as high-Φ vocabulary)
        for word, phi in knowledge.get('basin_anchors', []):
            if word not in self.word_phi_scores or self.word_phi_scores[word] < phi:
                self.word_phi_scores[word] = phi
                stats['anchors_learned'] += 1
        
        return stats
    
    def generate_with_pantheon_knowledge(self, n: int = 50) -> List[str]:
        """
        Generate hypotheses using knowledge learned from other kernels.
        
        First syncs knowledge from pantheon, then generates hypotheses
        using the learned patterns.
        """
        # Learn from pantheon
        self.learn_from_pantheon()
        
        # Generate hypotheses using learned patterns
        hypotheses = []
        
        kb = get_knowledge_base()
        patterns = kb.get_patterns_for_kernel("Hephaestus", n=n)
        
        for pattern_obj in patterns:
            # Add the pattern itself
            hypotheses.append(pattern_obj.pattern)
            
            # Generate variations if it looks like a passphrase
            if len(pattern_obj.pattern.split()) <= 5:
                # Try typo variations
                typo_vars = generate_all_typo_variations(pattern_obj.pattern, max_variants=2)
                for typo_var in typo_vars:
                    hypotheses.append(typo_var.variant)
        
        return list(set(hypotheses[:n]))
    
    # ===== Historical Breach Data Integration =====
    
    def generate_breach_pattern_hypotheses(
        self,
        n: int = 50,
        wallet_year: Optional[int] = None,
        crypto_only: bool = False
    ) -> List[str]:
        """
        Generate hypotheses based on historical breach patterns.
        
        Uses patterns from known data breaches (2009-2013 era) as seeds.
        Many users reuse passwords across services, including Bitcoin wallets.
        
        Args:
            n: Number of hypotheses to generate
            wallet_year: Year wallet was created (for temporal filtering)
            crypto_only: Only use crypto-specific breach patterns
        
        Returns:
            List of password hypotheses based on breach patterns
        """
        generator = BreachPatternGenerator(wallet_year=wallet_year)
        
        if crypto_only:
            # Get crypto-specific patterns
            base_patterns = get_crypto_specific_breach_patterns()
            hypotheses = []
            
            for pattern in base_patterns:
                hypotheses.append(pattern)
                # Add common variants
                variants = generate_breach_pattern_variants(pattern, max_variants=3)
                hypotheses.extend(variants)
        else:
            # Get all breach patterns with variants
            hypotheses = generator.generate_hypotheses(
                n=n,
                include_crypto=True,
                include_leetspeak=True,
                temporal_filter=wallet_year is not None
            )
        
        self.passphrase_generated_count += len(hypotheses)
        return list(set(hypotheses[:n]))
    
    def generate_breach_pattern_mnemonics(
        self,
        n: int = 50,
        wallet_year: Optional[int] = None
    ) -> List[str]:
        """
        Generate mnemonics seeded with breach pattern words.
        
        Combines BIP39 words with patterns from historical breaches.
        For example, if "bitcoin123" is a common breach pattern,
        we might generate mnemonics with BIP39 words that start with 'b'.
        """
        if not self.bip39_words:
            return []
        
        mnemonics = []
        
        # Get high-priority breach patterns
        breach_patterns = get_high_priority_breach_patterns()
        
        for pattern in breach_patterns[:20]:
            # Extract first letters from pattern words
            pattern_words = pattern.lower().split()
            
            # Build mnemonic using BIP39 words with similar starting letters
            mnemonic_words = []
            for word in pattern_words[:4]:  # Use first 4 words max
                if len(word) > 0:
                    candidates = [w for w in self.bip39_words if w.startswith(word[0])]
                    if candidates:
                        mnemonic_words.append(random.choice(candidates))
            
            # Fill to 12 words
            while len(mnemonic_words) < 12:
                mnemonic_words.append(random.choice(self.bip39_words))
            
            mnemonics.append(' '.join(mnemonic_words[:12]))
        
        self.mnemonic_generated_count += len(mnemonics)
        return list(set(mnemonics[:n]))
    
    def get_breach_pattern_stats(self) -> Dict:
        """Get statistics about available breach patterns"""
        generator = BreachPatternGenerator()
        return generator.get_stats()
    
    def get_pantheon_knowledge_stats(self) -> Dict:
        """Get statistics about the pantheon knowledge base"""
        kb = get_knowledge_base()
        return kb.get_stats()
