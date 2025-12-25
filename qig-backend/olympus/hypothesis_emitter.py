"""
Hypothesis Emitter - Bridge between Python hypothesis generation and TypeScript balance checking

PRIORITY: MNEMONIC GENERATION (80%+)
Passphrases have been swept by others - focus on BIP39 mnemonics for recovery.

This is the missing link that connects:
- Python vocabulary learning and research discoveries
- Hephaestus MNEMONIC hypothesis generation (primary)
- Hephaestus passphrase hypothesis generation (deprioritized)
- TypeScript queueAddressForBalanceCheck()

ARCHITECTURE NOTE (2025-12-25):
- Uses async HTTP via httpx to prevent blocking the emission loop
- Implements exponential backoff on failures (1s → 2s → 4s → 8s → 16s → 30s max)
- Fire-and-forget submission with bounded in-flight queue to prevent memory leak
- Circuit breaker pattern: 5 consecutive failures → 30s cooldown
"""

import asyncio
import os
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from queue import Queue, Full
from typing import Dict, List, Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    import requests
    HTTPX_AVAILABLE = False
    print("[HypothesisEmitter] httpx not available, falling back to requests (blocking)")

from .hephaestus import Hephaestus

try:
    from ..qig_geometry import compute_pure_phi
except ImportError:
    def compute_pure_phi(basin):
        return 0.5


MNEMONIC_RATIO = 0.85
MNEMONIC_STRATEGIES = ['random', 'basin_guided', 'semantic_cluster', 'permutation', 'typo_correction']
PASSPHRASE_STRATEGIES = ['high_phi', 'basin_guided', 'random', 'mutation']


class HypothesisEmitter:
    """
    Continuous hypothesis generation and submission to TypeScript balance queue.

    Architecture:
    1. Uses Hephaestus to generate MNEMONIC hypotheses (85% priority)
    2. Uses Hephaestus to generate passphrase hypotheses (15% backfill)
    3. Computes Phi scores for prioritization
    4. Posts batches to TypeScript /api/ocean/hypothesis endpoint (async, non-blocking)
    5. Receives feedback on what was queued vs skipped

    Resilience (2025-12-25 upgrade):
    - Async HTTP with httpx (fire-and-forget with bounded queue)
    - Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max
    - Circuit breaker: 5 failures → 30s cooldown, then reset
    - Bounded in-flight queue (max 10) prevents memory leaks
    """

    TYPESCRIPT_URL = "http://localhost:5000/api/ocean/hypothesis"
    BATCH_SIZE = 50
    EMIT_INTERVAL_SECONDS = 5  # Reduced from 10s - async allows faster emission

    # Backoff configuration
    INITIAL_BACKOFF_SECONDS = 1.0
    MAX_BACKOFF_SECONDS = 30.0
    BACKOFF_MULTIPLIER = 2.0

    # Request configuration
    REQUEST_TIMEOUT_SECONDS = 15.0  # Increased from 10s for reliability
    MAX_IN_FLIGHT_REQUESTS = 10  # Bounded queue for fire-and-forget

    def __init__(self, hephaestus: Optional[Hephaestus] = None):
        self.hephaestus = hephaestus or Hephaestus()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._async_loop: Optional[asyncio.AbstractEventLoop] = None
        self._async_thread: Optional[threading.Thread] = None

        self._total_emitted = 0
        self._total_queued = 0
        self._total_skipped = 0
        self._cycles = 0
        self._last_emit_time: Optional[datetime] = None
        self._consecutive_failures = 0
        self._max_consecutive_failures = 5

        # Backoff state
        self._current_backoff = self.INITIAL_BACKOFF_SECONDS
        self._last_success_time: Optional[datetime] = None

        # Async HTTP client (initialized on start)
        self._http_client: Optional[httpx.AsyncClient] = None

        # In-flight request tracking (bounded queue for fire-and-forget)
        self._in_flight_queue: Queue = Queue(maxsize=self.MAX_IN_FLIGHT_REQUESTS)
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="hypothesis-async")
        
    def start(self):
        """Start the hypothesis emission loop."""
        if self._running:
            return

        self._running = True

        # Start async event loop in background thread (for non-blocking HTTP)
        if HTTPX_AVAILABLE:
            self._async_loop = asyncio.new_event_loop()
            self._async_thread = threading.Thread(
                target=self._run_async_loop, daemon=True, name="hypothesis-async-loop"
            )
            self._async_thread.start()

            # Wait for loop to be ready
            time.sleep(0.1)

        self._thread = threading.Thread(target=self._emission_loop, daemon=True, name="hypothesis-emitter")
        self._thread.start()
        print(f"[HypothesisEmitter] Started continuous hypothesis generation (async={HTTPX_AVAILABLE})")

    def _run_async_loop(self):
        """Run the async event loop in a background thread."""
        asyncio.set_event_loop(self._async_loop)
        self._async_loop.run_forever()
        
    def stop(self):
        """Stop the emission loop."""
        self._running = False

        # Stop the async loop
        if self._async_loop:
            self._async_loop.call_soon_threadsafe(self._async_loop.stop)

        if self._thread:
            self._thread.join(timeout=2.0)
        if self._async_thread:
            self._async_thread.join(timeout=2.0)

        # Shutdown executor
        self._executor.shutdown(wait=False)

        print("[HypothesisEmitter] Stopped")
        
    def _emission_loop(self):
        """Main emission loop - generates and submits hypotheses continuously.

        Uses fire-and-forget async submission to prevent blocking.
        Implements exponential backoff with circuit breaker pattern.
        """
        time.sleep(5.0)

        while self._running:
            try:
                # Circuit breaker: Too many consecutive failures → long cooldown
                if self._consecutive_failures >= self._max_consecutive_failures:
                    print(f"[HypothesisEmitter] Circuit breaker tripped ({self._consecutive_failures} failures), cooling down {self.MAX_BACKOFF_SECONDS}s")
                    time.sleep(self.MAX_BACKOFF_SECONDS)
                    self._consecutive_failures = 0
                    self._current_backoff = self.INITIAL_BACKOFF_SECONDS
                    continue

                hypotheses = self._generate_batch()

                if hypotheses:
                    # Fire-and-forget async submission (non-blocking)
                    self._submit_hypotheses_async(hypotheses)

                self._cycles += 1

                # Use current backoff interval (exponential on failure, reset on success)
                sleep_time = max(self.EMIT_INTERVAL_SECONDS, self._current_backoff)
                time.sleep(sleep_time)

            except Exception as e:
                print(f"[HypothesisEmitter] Error in emission loop: {e}")
                self._record_failure()
                time.sleep(self._current_backoff)

    def _submit_hypotheses_async(self, hypotheses: List[str]) -> None:
        """
        Submit hypotheses asynchronously (fire-and-forget).

        Uses a bounded queue to prevent memory leaks from piling up requests.
        If queue is full, drops the batch (backpressure).
        """
        if not HTTPX_AVAILABLE or not self._async_loop:
            # Fallback to blocking submission
            result = self._submit_hypotheses_blocking(hypotheses)
            self._handle_submission_result(result, len(hypotheses))
            return

        try:
            # Check if we can queue this request (bounded queue)
            if self._in_flight_queue.full():
                print("[HypothesisEmitter] In-flight queue full, dropping batch (backpressure)")
                return

            # Track this request
            request_id = f"{self._cycles}-{time.time()}"
            self._in_flight_queue.put_nowait(request_id)

            # Submit to async loop (fire-and-forget)
            future = asyncio.run_coroutine_threadsafe(
                self._submit_hypotheses_async_impl(hypotheses, request_id),
                self._async_loop
            )

            # Handle result in background (don't block emission loop)
            self._executor.submit(self._wait_for_async_result, future, request_id, len(hypotheses))

        except Full:
            print("[HypothesisEmitter] In-flight queue full, dropping batch")
        except Exception as e:
            print(f"[HypothesisEmitter] Async submission error: {e}")
            self._record_failure()

    async def _submit_hypotheses_async_impl(self, hypotheses: List[str], request_id: str) -> Optional[Dict]:
        """Async implementation of hypothesis submission using httpx."""
        try:
            avg_phi = 0.5
            if self.hephaestus.word_phi_scores:
                phi_values = list(self.hephaestus.word_phi_scores.values())
                if phi_values:
                    avg_phi = sum(phi_values) / len(phi_values)

            top_priority = 0.5
            if hypotheses:
                try:
                    top_scored = self.hephaestus.score_mnemonic_geometric(hypotheses[0])
                    top_priority = top_scored.get('priority_score', 0.5)
                except:
                    pass

            payload = {
                "hypotheses": hypotheses,
                "source": "python-hephaestus",
                "phi": max(avg_phi, top_priority),
                "geometricPriority": top_priority,
                "isMnemonic": any(len(h.split()) in [12, 15, 18, 21, 24] for h in hypotheses[:5])
            }

            async with httpx.AsyncClient(timeout=self.REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    self.TYPESCRIPT_URL,
                    json=payload,
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"[HypothesisEmitter] Async submit failed: {response.status_code}")
                    return None

        except httpx.ConnectError:
            return None
        except httpx.TimeoutException:
            print("[HypothesisEmitter] Async submit timeout")
            return None
        except Exception as e:
            print(f"[HypothesisEmitter] Async submit error: {e}")
            return None

    def _wait_for_async_result(self, future, request_id: str, batch_size: int) -> None:
        """Wait for async result and handle it (runs in thread pool)."""
        try:
            result = future.result(timeout=self.REQUEST_TIMEOUT_SECONDS + 5)
            self._handle_submission_result(result, batch_size)
        except Exception as e:
            print(f"[HypothesisEmitter] Async result error: {e}")
            self._record_failure()
        finally:
            # Remove from in-flight queue
            try:
                self._in_flight_queue.get_nowait()
            except:
                pass

    def _handle_submission_result(self, result: Optional[Dict], batch_size: int) -> None:
        """Handle the result of a hypothesis submission."""
        if result:
            self._total_emitted += result.get('received', 0)
            self._total_queued += result.get('queued', 0)
            self._total_skipped += result.get('alreadyTested', 0) + result.get('skipped', 0)
            self._last_emit_time = datetime.now()
            self._record_success()

            if self._cycles % 6 == 0:
                print(f"[HypothesisEmitter] Cycle {self._cycles}: "
                      f"emitted={self._total_emitted}, queued={self._total_queued}, skipped={self._total_skipped}")
        else:
            self._record_failure()

    def _record_success(self) -> None:
        """Record a successful submission - reset backoff."""
        self._consecutive_failures = 0
        self._current_backoff = self.INITIAL_BACKOFF_SECONDS
        self._last_success_time = datetime.now()

    def _record_failure(self) -> None:
        """Record a failed submission - increase backoff."""
        self._consecutive_failures += 1
        self._current_backoff = min(
            self._current_backoff * self.BACKOFF_MULTIPLIER,
            self.MAX_BACKOFF_SECONDS
        )
        print(f"[HypothesisEmitter] Failure {self._consecutive_failures}, backoff now {self._current_backoff}s")

    def _submit_hypotheses_blocking(self, hypotheses: List[str]) -> Optional[Dict]:
        """Blocking fallback submission using requests library."""
        try:
            import requests as req

            avg_phi = 0.5
            if self.hephaestus.word_phi_scores:
                phi_values = list(self.hephaestus.word_phi_scores.values())
                if phi_values:
                    avg_phi = sum(phi_values) / len(phi_values)

            top_priority = 0.5
            if hypotheses:
                try:
                    top_scored = self.hephaestus.score_mnemonic_geometric(hypotheses[0])
                    top_priority = top_scored.get('priority_score', 0.5)
                except:
                    pass

            payload = {
                "hypotheses": hypotheses,
                "source": "python-hephaestus",
                "phi": max(avg_phi, top_priority),
                "geometricPriority": top_priority,
                "isMnemonic": any(len(h.split()) in [12, 15, 18, 21, 24] for h in hypotheses[:5])
            }

            response = req.post(
                self.TYPESCRIPT_URL,
                json=payload,
                timeout=self.REQUEST_TIMEOUT_SECONDS
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"[HypothesisEmitter] Blocking submit failed: {response.status_code}")
                return None

        except Exception as e:
            print(f"[HypothesisEmitter] Blocking submit error: {e}")
            return None
                
    def _generate_batch(self) -> List[str]:
        """
        Generate a batch of hypotheses using Hephaestus.
        
        PRIORITY: 85% MNEMONICS, 15% PASSPHRASES
        Passphrases have been swept - focus on mnemonic recovery.
        """
        hypotheses = []
        
        try:
            use_mnemonic = random.random() < MNEMONIC_RATIO
            
            if use_mnemonic and self.hephaestus.bip39_words:
                strategy = random.choice(MNEMONIC_STRATEGIES)
                
                if strategy == 'permutation' and self.hephaestus.successful_patterns:
                    seed = random.choice(self.hephaestus.successful_patterns[-10:])
                    hypotheses = self.hephaestus.generate_mnemonics(
                        n=self.BATCH_SIZE,
                        strategy='permutation',
                        seed_mnemonic=seed
                    )
                elif strategy == 'typo_correction' and self.hephaestus.successful_patterns:
                    seed = random.choice(self.hephaestus.successful_patterns[-10:])
                    hypotheses = self.hephaestus.generate_mnemonics(
                        n=self.BATCH_SIZE,
                        strategy='typo_correction',
                        seed_mnemonic=seed
                    )
                elif self.hephaestus.known_word_positions:
                    hypotheses = self.hephaestus.generate_mnemonics(
                        n=self.BATCH_SIZE,
                        strategy='partial_recovery',
                        known_positions=self.hephaestus.known_word_positions
                    )
                else:
                    hypotheses = self.hephaestus.generate_mnemonics(
                        n=self.BATCH_SIZE,
                        strategy=strategy
                    )
                
                if self._cycles % 6 == 0:
                    print(f"[HypothesisEmitter] MNEMONIC batch ({strategy}): {len(hypotheses)} generated")
            
            else:
                strategy = random.choice(PASSPHRASE_STRATEGIES)
                
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
                
                if self._cycles % 6 == 0:
                    print(f"[HypothesisEmitter] PASSPHRASE batch ({strategy}): {len(hypotheses)} generated")
            
            unique_hypotheses = list(set(hypotheses))
            
            if use_mnemonic and len(unique_hypotheses) > 1:
                ranked = self._rank_by_geometry(unique_hypotheses)
                return ranked
            
            return unique_hypotheses
            
        except Exception as e:
            print(f"[HypothesisEmitter] Generation error: {e}")
            return []
    
    def _rank_by_geometry(self, mnemonics: List[str]) -> List[str]:
        """
        Rank mnemonic candidates by geometric priority using Fisher-Rao distance.
        Returns mnemonics sorted by priority (highest first).
        """
        try:
            scored = self.hephaestus.rank_mnemonics_by_geometry(mnemonics)
            ranked = [s['mnemonic'] for s in scored]
            
            if self._cycles % 12 == 0 and scored:
                top_score = scored[0]['priority_score'] if scored else 0
                avg_score = sum(s['priority_score'] for s in scored) / len(scored) if scored else 0
                print(f"[HypothesisEmitter] Geometric ranking: top={top_score:.3f}, avg={avg_score:.3f}")
            
            return ranked
        except Exception as e:
            print(f"[HypothesisEmitter] Geometric ranking error: {e}")
            return mnemonics
    
    
    def update_vocabulary_from_research(self, observations: List[Dict]) -> int:
        """Update Hephaestus vocabulary from research discoveries."""
        return self.hephaestus.update_vocabulary(observations)
    
    def get_status(self) -> Dict:
        """Get emitter status including async metrics."""
        return {
            "running": self._running,
            "cycles": self._cycles,
            "total_emitted": self._total_emitted,
            "total_queued": self._total_queued,
            "total_skipped": self._total_skipped,
            "queue_rate": self._total_queued / max(1, self._total_emitted),
            "vocabulary_size": len(self.hephaestus.vocabulary),
            "bip39_words_loaded": len(self.hephaestus.bip39_words),
            "mnemonic_generated": self.hephaestus.mnemonic_generated_count,
            "passphrase_generated": self.hephaestus.passphrase_generated_count,
            "mnemonic_ratio_target": MNEMONIC_RATIO,
            "high_phi_words": len([p for p in self.hephaestus.word_phi_scores.values() if p >= 0.7]),
            "last_emit": self._last_emit_time.isoformat() if self._last_emit_time else None,
            "consecutive_failures": self._consecutive_failures,
            # Async metrics (2025-12-25)
            "async_enabled": HTTPX_AVAILABLE,
            "current_backoff_seconds": self._current_backoff,
            "in_flight_requests": self._in_flight_queue.qsize(),
            "max_in_flight": self.MAX_IN_FLIGHT_REQUESTS,
            "last_success": self._last_success_time.isoformat() if self._last_success_time else None,
        }
    
    def set_known_positions(self, positions: Dict[int, str]) -> None:
        """
        Set known mnemonic word positions for partial recovery.
        Use when user remembers some but not all words.
        
        Example: {0: "abandon", 5: "wallet", 11: "zoo"}
        """
        self.hephaestus.set_known_positions(positions)
    
    def set_mnemonic_ratio(self, ratio: float) -> None:
        """Set the mnemonic vs passphrase generation ratio (0.0 to 1.0)."""
        global MNEMONIC_RATIO
        MNEMONIC_RATIO = max(0.0, min(1.0, ratio))
        print(f"[HypothesisEmitter] Mnemonic ratio set to {MNEMONIC_RATIO:.0%}")


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


def register_balance_hit(phrase: str, phi: float = 0.9, is_mnemonic: bool = False) -> Dict:
    """
    Register a balance hit to reinforce success patterns.
    Called from TypeScript when a hypothesis yields a positive balance.
    """
    emitter = get_hypothesis_emitter()
    
    emitter.hephaestus.register_success(phrase, phi)
    
    if is_mnemonic:
        emitter.hephaestus.successful_patterns.append(phrase)
        if len(emitter.hephaestus.successful_patterns) > 100:
            emitter.hephaestus.successful_patterns = emitter.hephaestus.successful_patterns[-50:]
    
    for word in phrase.lower().split():
        emitter.hephaestus.word_phi_scores[word] = max(
            emitter.hephaestus.word_phi_scores.get(word, 0.0),
            phi
        )
    
    print(f"[HypothesisEmitter] 💰 Balance hit registered: {phrase[:30]}... (phi={phi:.2f}, mnemonic={is_mnemonic})")
    
    return {
        "registered": True,
        "phrase": phrase[:30] + "...",
        "phi": phi,
        "is_mnemonic": is_mnemonic,
        "successful_patterns": len(emitter.hephaestus.successful_patterns)
    }
