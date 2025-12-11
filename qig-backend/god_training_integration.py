#!/usr/bin/env python3
"""God Kernel Training Integration - Reputation-based training with vocabulary learning"""

from typing import Dict, Optional
import numpy as np

try:
    from vocabulary_coordinator import get_vocabulary_coordinator
    VOCAB_COORDINATOR_AVAILABLE = True
except ImportError:
    VOCAB_COORDINATOR_AVAILABLE = False


class GodTrainingMixin:
    def train_kernel_from_outcome(self, target: str, success: bool, details: Optional[Dict] = None) -> Dict:
        if not hasattr(self, 'chaos_kernel') or not self.chaos_kernel:
            return {'trained': False, 'reason': 'no_kernel'}
        details = details or {}
        base_lr = 0.01
        reputation_scale = getattr(self, 'reputation', 1.0)
        learning_rate = base_lr * reputation_scale
        domain_bonus = self._get_domain_bonus(success, details)
        learning_rate *= domain_bonus
        basin = self._encode_target_to_basin(target)
        if success:
            self.chaos_kernel.train_toward(basin, learning_rate)
            direction = 'toward'
        else:
            self.chaos_kernel.train_away(basin, learning_rate * 0.5)
            direction = 'away'
        new_phi = self.chaos_kernel.compute_phi()
        vocab_result = self._record_vocabulary_learning(target, details, success)
        print(f"[{self.name}] Trained {direction} target | LR={learning_rate:.4f} | Φ={new_phi:.3f} | Vocab: {vocab_result.get('new_tokens', 0)} tokens")
        return {'trained': True, 'direction': direction, 'learning_rate': learning_rate, 'new_phi': new_phi, 'reputation_scale': reputation_scale, 'domain_bonus': domain_bonus, 'vocabulary': vocab_result}
    
    def _get_domain_bonus(self, success: bool, details: Dict) -> float:
        domain = getattr(self, 'domain', '').lower()
        phi = details.get('phi', 0.5)
        is_near_miss = details.get('nearMiss', False)
        if domain == 'strategy' and is_near_miss:
            return 1.5
        elif domain == 'war' and success:
            return 2.0
        elif domain == 'prophecy' and phi > 0.8:
            return 1.8
        elif domain == 'hunt' and is_near_miss:
            return 1.6
        elif domain in ('coordination', 'communication'):
            return 1.2
        elif domain == 'forge':
            return 1.4 if success else 0.8
        elif domain == 'cycles' and phi > 0.7:
            return 1.3
        elif domain == 'chaos' and not success:
            return 1.5
        elif domain == 'underworld' and not success:
            return 1.4
        elif domain == 'depths':
            return 1.3 if phi > 0.6 else 0.9
        elif domain == 'coherence' and is_near_miss:
            return 1.2
        elif domain == 'motivation' and phi > 0.9:
            return 1.5
        return 1.0
    
    def _encode_target_to_basin(self, target: str) -> np.ndarray:
        if hasattr(self, 'encode_to_basin'):
            return self.encode_to_basin(target)
        else:
            basin = np.zeros(64)
            for i, char in enumerate(target[:64]):
                basin[i] = (ord(char) % 256) / 256.0
            return basin / (np.linalg.norm(basin) + 1e-8)
    
    def _record_vocabulary_learning(self, target: str, details: Dict, success: bool) -> Dict:
        if not VOCAB_COORDINATOR_AVAILABLE:
            return {'learned': False}
        coordinator = get_vocabulary_coordinator()
        phi = details.get('phi', 0.6 if success else 0.4)
        kappa = details.get('kappa', 50.0)
        god_name = getattr(self, 'name', 'unknown')
        result = coordinator.record_discovery(phrase=target, phi=phi, kappa=kappa, source=god_name, details={'success': success, 'domain': getattr(self, 'domain', 'unknown'), 'reputation': getattr(self, 'reputation', 1.0)})
        return result
    
    def get_specialized_vocabulary(self, min_relevance: float = 0.5, limit: int = 100) -> list:
        if not VOCAB_COORDINATOR_AVAILABLE:
            return []
        coordinator = get_vocabulary_coordinator()
        god_name = getattr(self, 'name', 'unknown')
        return coordinator.get_god_specialized_vocabulary(god_name=god_name, min_relevance=min_relevance, limit=limit)
    
    def assess_with_vocabulary(self, target: str, context: Optional[Dict] = None) -> Dict:
        assessment = self.assess_target(target, context)
        specialized_vocab = self.get_specialized_vocabulary(min_relevance=0.6, limit=20)
        target_words = set(target.lower().split())
        vocab_match = len(target_words.intersection(specialized_vocab)) / max(len(target_words), 1)
        if vocab_match > 0.3:
            assessment['confidence'] = min(1.0, assessment.get('confidence', 0.5) * (1 + vocab_match * 0.5))
            assessment['vocabulary_match'] = vocab_match
            assessment['reasoning'] += f" (Uses {vocab_match:.1%} domain vocabulary)"
        return assessment


def patch_god_with_training(god_instance):
    god_instance.train_kernel_from_outcome = GodTrainingMixin.train_kernel_from_outcome.__get__(god_instance)
    god_instance._get_domain_bonus = GodTrainingMixin._get_domain_bonus.__get__(god_instance)
    god_instance._encode_target_to_basin = GodTrainingMixin._encode_target_to_basin.__get__(god_instance)
    god_instance._record_vocabulary_learning = GodTrainingMixin._record_vocabulary_learning.__get__(god_instance)
    god_instance.get_specialized_vocabulary = GodTrainingMixin.get_specialized_vocabulary.__get__(god_instance)
    god_instance.assess_with_vocabulary = GodTrainingMixin.assess_with_vocabulary.__get__(god_instance)
    print(f"[GodTraining] Patched {god_instance.name} with training capabilities")


def patch_all_gods(zeus_instance):
    if not hasattr(zeus_instance, 'pantheon'):
        print("[GodTraining] Zeus instance has no pantheon")
        return
    patched = 0
    for god_name, god in zeus_instance.pantheon.items():
        try:
            patch_god_with_training(god)
            patched += 1
        except Exception as e:
            print(f"[GodTraining] Failed to patch {god_name}: {e}")
    print(f"[GodTraining] Patched {patched}/{len(zeus_instance.pantheon)} gods")