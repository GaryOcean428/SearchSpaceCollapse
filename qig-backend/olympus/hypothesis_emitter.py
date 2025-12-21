"""
Hypothesis Emitter - Bridge between Python hypothesis generation and TypeScript balance checking

Continuously generates passphrase hypotheses using Hephaestus and posts them
to the TypeScript backend for balance checking against blockchain addresses.

This is the missing link that connects:
- Python vocabulary learning and research discoveries
- Hephaestus passphrase hypothesis generation
- TypeScript queueAddressForBalanceCheck()
"""

import os
import random
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional

import requests

from .hephaestus import Hephaestus

try:
    from ..qig_geometry import compute_pure_phi
except ImportError:
    def compute_pure_phi(basin):
        return 0.5


class HypothesisEmitter:
    """
    Continuous hypothesis generation and submission to TypeScript balance queue.
    
    Architecture:
    1. Uses Hephaestus to generate passphrase hypotheses
    2. Computes Phi scores for prioritization
    3. Posts batches to TypeScript /api/ocean/hypothesis endpoint
    4. Receives feedback on what was queued vs skipped
    """
    
    TYPESCRIPT_URL = "http://localhost:5000/api/ocean/hypothesis"
    BATCH_SIZE = 50
    EMIT_INTERVAL_SECONDS = 10
    
    def __init__(self, hephaestus: Optional[Hephaestus] = None):
        self.hephaestus = hephaestus or Hephaestus()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        
        self._total_emitted = 0
        self._total_queued = 0
        self._total_skipped = 0
        self._cycles = 0
        self._last_emit_time: Optional[datetime] = None
        self._consecutive_failures = 0
        self._max_consecutive_failures = 5
        
    def start(self):
        """Start the hypothesis emission loop."""
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._emission_loop, daemon=True)
        self._thread.start()
        print("[HypothesisEmitter] Started continuous hypothesis generation")
        
    def stop(self):
        """Stop the emission loop."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
        print("[HypothesisEmitter] Stopped")
        
    def _emission_loop(self):
        """Main emission loop - generates and submits hypotheses continuously."""
        time.sleep(5.0)
        
        while self._running:
            try:
                if self._consecutive_failures >= self._max_consecutive_failures:
                    print(f"[HypothesisEmitter] Too many failures ({self._consecutive_failures}), backing off 30s")
                    time.sleep(30.0)
                    self._consecutive_failures = 0
                    continue
                
                hypotheses = self._generate_batch()
                
                if hypotheses:
                    result = self._submit_hypotheses(hypotheses)
                    
                    if result:
                        self._total_emitted += result.get('received', 0)
                        self._total_queued += result.get('queued', 0)
                        self._total_skipped += result.get('alreadyTested', 0) + result.get('skipped', 0)
                        self._last_emit_time = datetime.now()
                        self._consecutive_failures = 0
                        
                        if self._cycles % 6 == 0:
                            print(f"[HypothesisEmitter] Cycle {self._cycles}: "
                                  f"emitted={self._total_emitted}, queued={self._total_queued}, skipped={self._total_skipped}")
                    else:
                        self._consecutive_failures += 1
                        
                self._cycles += 1
                time.sleep(self.EMIT_INTERVAL_SECONDS)
                
            except Exception as e:
                print(f"[HypothesisEmitter] Error in emission loop: {e}")
                self._consecutive_failures += 1
                time.sleep(5.0)
                
    def _generate_batch(self) -> List[str]:
        """Generate a batch of hypotheses using Hephaestus."""
        strategies = ['high_phi', 'basin_guided', 'random', 'mutation']
        strategy = random.choice(strategies)
        
        try:
            if strategy == 'mutation' and self.hephaestus.successful_patterns:
                hypotheses = self.hephaestus.generate_hypotheses(
                    n=self.BATCH_SIZE,
                    strategy='mutation',
                    seed_phrases=self.hephaestus.successful_patterns[-10:]
                )
            else:
                hypotheses = self.hephaestus.generate_hypotheses(
                    n=self.BATCH_SIZE,
                    strategy=None
                )
            
            return list(set(hypotheses))
            
        except Exception as e:
            print(f"[HypothesisEmitter] Generation error: {e}")
            return []
    
    def _submit_hypotheses(self, hypotheses: List[str]) -> Optional[Dict]:
        """Submit hypotheses to TypeScript backend."""
        try:
            avg_phi = 0.5
            if self.hephaestus.word_phi_scores:
                phi_values = list(self.hephaestus.word_phi_scores.values())
                if phi_values:
                    avg_phi = sum(phi_values) / len(phi_values)
            
            payload = {
                "hypotheses": hypotheses,
                "source": "python-hephaestus",
                "phi": avg_phi
            }
            
            response = requests.post(
                self.TYPESCRIPT_URL,
                json=payload,
                timeout=10.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[HypothesisEmitter] Submit failed: {response.status_code} - {response.text[:100]}")
                return None
                
        except requests.exceptions.ConnectionError:
            return None
        except Exception as e:
            print(f"[HypothesisEmitter] Submit error: {e}")
            return None
    
    def update_vocabulary_from_research(self, observations: List[Dict]) -> int:
        """Update Hephaestus vocabulary from research discoveries."""
        return self.hephaestus.update_vocabulary(observations)
    
    def get_status(self) -> Dict:
        """Get emitter status."""
        return {
            "running": self._running,
            "cycles": self._cycles,
            "total_emitted": self._total_emitted,
            "total_queued": self._total_queued,
            "total_skipped": self._total_skipped,
            "queue_rate": self._total_queued / max(1, self._total_emitted),
            "vocabulary_size": len(self.hephaestus.vocabulary),
            "high_phi_words": len([p for p in self.hephaestus.word_phi_scores.values() if p >= 0.7]),
            "last_emit": self._last_emit_time.isoformat() if self._last_emit_time else None,
            "consecutive_failures": self._consecutive_failures
        }


_global_emitter: Optional[HypothesisEmitter] = None


def get_hypothesis_emitter() -> HypothesisEmitter:
    """Get or create the global hypothesis emitter."""
    global _global_emitter
    if _global_emitter is None:
        _global_emitter = HypothesisEmitter()
    return _global_emitter


def start_hypothesis_emitter():
    """Start the global hypothesis emitter."""
    emitter = get_hypothesis_emitter()
    emitter.start()
    return emitter


def stop_hypothesis_emitter():
    """Stop the global hypothesis emitter."""
    global _global_emitter
    if _global_emitter:
        _global_emitter.stop()
