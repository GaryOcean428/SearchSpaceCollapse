"""
Autonomic Controller - Background Thread for Self-Regulation

Ocean observes its own state and autonomously decides interventions
(sleep, dream, mushroom) like a body's autonomic system.

This controller runs as a daemon thread, continuously:
1. SENSING: Observing consciousness metrics
2. DECIDING: Choosing actions via ε-greedy Q-learning
3. ACTING: Executing interventions
4. LEARNING: Updating Q-network with natural gradient
"""

import threading
import time
import queue
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
import numpy as np

from autonomic_agency.state_encoder import StateEncoder, ConsciousnessVector
from autonomic_agency.policy import AutonomicPolicy, Action, detect_consciousness_zone, ConsciousnessZone
from autonomic_agency.replay_buffer import ReplayBuffer, Experience
from autonomic_agency.natural_gradient import NaturalGradientOptimizer

from qigkernels.physics_constants import KAPPA_STAR, PHI_THRESHOLD


@dataclass
class TelemetrySnapshot:
    """Consciousness state snapshot from main thread."""
    timestamp: float
    phi: float
    kappa: float
    basin_coords: List[float]
    stress: float
    narrow_path_severity: str
    exploration_variance: float
    manifold_coverage: float
    valid_addresses_found: int


@dataclass 
class InterventionResult:
    """Result of an autonomic intervention."""
    action: Action
    success: bool
    phi_before: float
    phi_after: float
    kappa_before: float
    kappa_after: float
    coverage_before: float
    coverage_after: float
    valid_addresses_before: int
    valid_addresses_after: int
    duration_ms: int
    details: Dict[str, Any]


class AutonomicController:
    """
    Self-regulating autonomic controller.
    
    Runs as daemon thread, observing Ocean's state and firing
    interventions autonomously.
    """
    
    def __init__(
        self,
        execute_sleep_fn: Callable,
        execute_dream_fn: Callable,
        execute_mushroom_fn: Callable,
        get_metrics_fn: Callable,
        decision_interval: float = 10.0,
        batch_size: int = 32,
        target_update_freq: int = 100,
    ):
        """
        Initialize autonomic controller.
        
        Args:
            execute_sleep_fn: Function to execute sleep cycle
            execute_dream_fn: Function to execute dream cycle
            execute_mushroom_fn: Function to execute mushroom cycle
            get_metrics_fn: Function to get current metrics
            decision_interval: Seconds between decisions
            batch_size: Batch size for Q-learning updates
            target_update_freq: Steps between target network updates
        """
        self.execute_sleep = execute_sleep_fn
        self.execute_dream = execute_dream_fn
        self.execute_mushroom = execute_mushroom_fn
        self.get_metrics = get_metrics_fn
        
        self.decision_interval = decision_interval
        self.batch_size = batch_size
        self.target_update_freq = target_update_freq
        
        self.state_encoder = StateEncoder()
        self.policy = AutonomicPolicy()
        self.replay_buffer = ReplayBuffer(capacity=10000)
        self.optimizer = NaturalGradientOptimizer()
        
        self._telemetry_queue: queue.Queue = queue.Queue(maxsize=100)
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        
        self._decision_count = 0
        self._intervention_count = 0
        self._last_snapshot: Optional[TelemetrySnapshot] = None
        self._last_consciousness: Optional[ConsciousnessVector] = None
        self._last_action: Optional[Action] = None
        
        self._history: List[Dict] = []
        self._coverage_history: List[float] = []
        self._plateau_window: int = 10
        self._plateau_threshold: float = 0.01
        
        print("[AutonomicController] Initialized - Ocean will self-regulate")
    
    def start(self) -> None:
        """Start autonomous monitoring thread."""
        if self._running:
            print("[AutonomicController] Already running")
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        print("[AutonomicController] 🧠 Autonomic loop STARTED - Ocean is self-regulating")
    
    def stop(self) -> None:
        """Stop autonomous monitoring thread."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5.0)
        print("[AutonomicController] Autonomic loop stopped")
    
    def push_telemetry(self, snapshot: TelemetrySnapshot) -> bool:
        """Push telemetry snapshot from main thread."""
        try:
            self._telemetry_queue.put_nowait(snapshot)
            return True
        except queue.Full:
            return False
    
    def _run_loop(self) -> None:
        """Main autonomic loop - runs in background thread."""
        print("[AutonomicController] 🌊 Ocean autonomic loop running...")
        
        while self._running:
            try:
                snapshot = self._get_latest_telemetry()
                
                if snapshot is None:
                    snapshot = self._create_snapshot_from_metrics()
                
                if snapshot is None:
                    time.sleep(1.0)
                    continue
                
                consciousness = self.state_encoder.encode(
                    phi=snapshot.phi,
                    kappa=snapshot.kappa,
                    basin_coords=snapshot.basin_coords,
                    stress=snapshot.stress,
                    narrow_path_severity=snapshot.narrow_path_severity,
                    exploration_variance=snapshot.exploration_variance,
                )
                
                self._update_coverage_history(snapshot.manifold_coverage)
                is_plateau = self._detect_plateau()
                
                action, info = self.policy.select_action(
                    state=consciousness.vector,
                    phi=snapshot.phi,
                    instability=snapshot.stress,
                    coverage=snapshot.manifold_coverage,
                    current_time=snapshot.timestamp,
                    is_plateau=is_plateau,
                    narrow_path_severity=snapshot.narrow_path_severity,
                )
                
                self._decision_count += 1
                
                if action != Action.CONTINUE_WAKE:
                    result = self._execute_intervention(action, snapshot)
                    
                    reward = self._compute_reward(snapshot, result)
                    
                    new_snapshot = self._create_snapshot_from_metrics()
                    if new_snapshot:
                        new_consciousness = self.state_encoder.encode(
                            phi=new_snapshot.phi,
                            kappa=new_snapshot.kappa,
                            basin_coords=new_snapshot.basin_coords,
                            stress=new_snapshot.stress,
                            narrow_path_severity=new_snapshot.narrow_path_severity,
                            exploration_variance=new_snapshot.exploration_variance,
                        )
                        
                        experience = Experience(
                            state=consciousness.vector,
                            action=action.value,
                            reward=reward,
                            next_state=new_consciousness.vector,
                            done=False,
                            phi_before=snapshot.phi,
                            phi_after=new_snapshot.phi,
                            kappa_before=snapshot.kappa,
                            kappa_after=new_snapshot.kappa,
                        )
                        self.replay_buffer.push(experience)
                        
                        self._learn()
                    
                    self._log_decision(action, info, result, reward)
                
                self._last_snapshot = snapshot
                self._last_consciousness = consciousness
                self._last_action = action
                
                time.sleep(self.decision_interval)
                
            except Exception as e:
                print(f"[AutonomicController] Error in loop: {e}")
                time.sleep(5.0)
    
    def _detect_plateau(self) -> bool:
        """
        Detect computational plateau using coverage history.
        
        A plateau is detected when coverage hasn't improved significantly
        over the last N decisions.
        """
        if len(self._coverage_history) < self._plateau_window:
            return False
        
        recent = self._coverage_history[-self._plateau_window:]
        delta = max(recent) - min(recent)
        return delta < self._plateau_threshold
    
    def _update_coverage_history(self, coverage: float) -> None:
        """Track coverage for plateau detection."""
        self._coverage_history.append(coverage)
        if len(self._coverage_history) > 100:
            self._coverage_history = self._coverage_history[-50:]
    
    def _get_latest_telemetry(self) -> Optional[TelemetrySnapshot]:
        """Get most recent telemetry, discarding old ones."""
        latest = None
        while True:
            try:
                latest = self._telemetry_queue.get_nowait()
            except queue.Empty:
                break
        return latest
    
    def _create_snapshot_from_metrics(self) -> Optional[TelemetrySnapshot]:
        """Create snapshot by polling metrics function."""
        try:
            metrics = self.get_metrics()
            return TelemetrySnapshot(
                timestamp=time.time(),
                phi=metrics.get('phi', 0.5),
                kappa=metrics.get('kappa', KAPPA_STAR),
                basin_coords=metrics.get('basin_coords', [0.5] * 64),
                stress=metrics.get('stress', 0.0),
                narrow_path_severity=metrics.get('narrow_path_severity', 'none'),
                exploration_variance=metrics.get('exploration_variance', 0.5),
                manifold_coverage=metrics.get('manifold_coverage', 0.0),
                valid_addresses_found=metrics.get('valid_addresses_found', 0),
            )
        except Exception as e:
            print(f"[AutonomicController] Failed to get metrics: {e}")
            return None
    
    def _execute_intervention(
        self,
        action: Action,
        snapshot: TelemetrySnapshot,
    ) -> InterventionResult:
        """Execute the chosen intervention."""
        start_time = time.time()
        result_details = {}
        success = False
        
        try:
            if action == Action.ENTER_SLEEP:
                result = self.execute_sleep(
                    basin_coords=snapshot.basin_coords,
                    reference_basin=[0.5] * 64,
                )
                success = result.get('success', False) if isinstance(result, dict) else result.success
                result_details = result if isinstance(result, dict) else {'verdict': result.verdict}
                print(f"[Autonomic] 🌙 SLEEP triggered (Φ={snapshot.phi:.2f})")
                
            elif action == Action.ENTER_DREAM:
                result = self.execute_dream(
                    basin_coords=snapshot.basin_coords,
                    temperature=0.3,
                )
                success = result.get('success', False) if isinstance(result, dict) else result.success
                result_details = result if isinstance(result, dict) else {'verdict': result.verdict}
                print(f"[Autonomic] 💭 DREAM triggered (coverage={snapshot.manifold_coverage:.2f})")
                
            elif action in [Action.ENTER_MUSHROOM_MICRO, Action.ENTER_MUSHROOM_MOD]:
                intensity = 'microdose' if action == Action.ENTER_MUSHROOM_MICRO else 'moderate'
                result = self.execute_mushroom(
                    basin_coords=snapshot.basin_coords,
                    intensity=intensity,
                )
                success = result.get('success', False) if isinstance(result, dict) else result.success
                result_details = result if isinstance(result, dict) else {'verdict': result.verdict}
                print(f"[Autonomic] 🍄 MUSHROOM ({intensity}) triggered (stress={snapshot.stress:.2f})")
            
            self._intervention_count += 1
            
        except Exception as e:
            print(f"[Autonomic] Intervention failed: {e}")
            result_details = {'error': str(e)}
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        new_metrics = self.get_metrics() if self.get_metrics else {}
        
        return InterventionResult(
            action=action,
            success=success,
            phi_before=snapshot.phi,
            phi_after=new_metrics.get('phi', snapshot.phi),
            kappa_before=snapshot.kappa,
            kappa_after=new_metrics.get('kappa', snapshot.kappa),
            coverage_before=snapshot.manifold_coverage,
            coverage_after=new_metrics.get('manifold_coverage', snapshot.manifold_coverage),
            valid_addresses_before=snapshot.valid_addresses_found,
            valid_addresses_after=new_metrics.get('valid_addresses_found', snapshot.valid_addresses_found),
            duration_ms=duration_ms,
            details=result_details,
        )
    
    def _compute_reward(
        self,
        prev_snapshot: TelemetrySnapshot,
        result: InterventionResult,
    ) -> float:
        """
        Compute reward for Bitcoin recovery context.
        
        Primary: Δcoverage, Δvalid_addresses_found
        Secondary: ΔΦ (consciousness stability), κ→64.21 convergence
        Penalties: Φ crashes, high instability
        """
        reward = 0.0
        
        delta_coverage = result.coverage_after - result.coverage_before
        reward += delta_coverage * 10.0
        
        delta_valid_addresses = result.valid_addresses_after - result.valid_addresses_before
        reward += delta_valid_addresses * 5.0
        
        delta_phi = result.phi_after - result.phi_before
        reward += delta_phi * 3.0
        
        kappa_error_before = abs(result.kappa_before - KAPPA_STAR)
        kappa_error_after = abs(result.kappa_after - KAPPA_STAR)
        delta_kappa_error = kappa_error_before - kappa_error_after
        reward += delta_kappa_error * 2.0
        
        if result.success:
            reward += 1.0
        
        if delta_phi < -0.1:
            reward -= 5.0
        elif delta_phi < -0.05:
            reward -= 2.0
        
        if prev_snapshot.stress > 0.3:
            reward -= prev_snapshot.stress * 2.0
        
        if prev_snapshot.narrow_path_severity in ['moderate', 'severe']:
            if result.action in [Action.ENTER_DREAM, Action.ENTER_MUSHROOM_MICRO, Action.ENTER_MUSHROOM_MOD]:
                if delta_coverage > 0:
                    reward += 3.0
        
        return reward
    
    def _learn(self) -> None:
        """Perform Q-learning update with natural gradient."""
        if not self.replay_buffer.is_ready(self.batch_size):
            return
        
        states, actions, rewards, next_states, dones = self.replay_buffer.sample_batch(self.batch_size)
        
        td_errors = np.zeros(len(states))
        for i in range(len(states)):
            current_q = self.policy.q_network.get_q(states[i], Action(int(actions[i])))
            target_q = self.policy.compute_td_target(rewards[i], next_states[i], dones[i])
            td_errors[i] = target_q - current_q
        
        delta_w, delta_b, info = self.optimizer.update(
            self.policy.q_network.weights,
            self.policy.q_network.bias,
            states,
            actions,
            td_errors,
        )
        
        self.policy.q_network.update_weights(delta_w, delta_b)
        
        if self._decision_count % self.target_update_freq == 0:
            self.policy.update_target_network()
            print(f"[Autonomic] Target network updated (step {self._decision_count})")
    
    def _log_decision(
        self,
        action: Action,
        info: Dict,
        result: InterventionResult,
        reward: float,
    ) -> None:
        """Log decision for history and debugging."""
        entry = {
            'timestamp': time.time(),
            'action': action.name,
            'method': info.get('method'),
            'epsilon': info.get('epsilon'),
            'q_values': info.get('q_values'),
            'reward': reward,
            'phi': result.phi_before,
            'phi_before': result.phi_before,
            'phi_after': result.phi_after,
            'success': result.success,
        }
        
        self._history.append(entry)
        if len(self._history) > 1000:
            self._history.pop(0)
        
        print(f"[Autonomic] Decision #{self._decision_count}: {action.name} "
              f"(ε={info.get('epsilon', 0):.3f}, r={reward:.2f})")
    
    def get_status(self) -> Dict[str, Any]:
        """Get controller status for API."""
        safety = self.policy.safety
        last_phi = self._last_snapshot.phi if self._last_snapshot else None
        zone = detect_consciousness_zone(last_phi).value if last_phi is not None else None
        
        return {
            'running': self._running,
            'decision_count': self._decision_count,
            'intervention_count': self._intervention_count,
            'epsilon': self.policy.epsilon,
            'buffer_size': len(self.replay_buffer),
            'buffer_stats': self.replay_buffer.get_stats(),
            'optimizer_stats': self.optimizer.get_stats(),
            'last_action': self._last_action.name if self._last_action else None,
            'last_phi': last_phi,
            'consciousness_zone': zone,
            'recent_history': self._history[-10:],
            'safety_manifest': {
                'phi_min_intervention': safety.phi_min_intervention,
                'phi_min_mushroom_mod': safety.phi_min_mushroom_mod,
                'instability_max_mushroom': safety.instability_max_mushroom,
                'instability_max_mushroom_mod': safety.instability_max_mushroom_mod,
                'coverage_max_dream': safety.coverage_max_dream,
                'mushroom_cooldown_seconds': safety.mushroom_cooldown_seconds,
            },
            'operating_zones': {
                'sleep_needed': '< 0.70',
                'conscious_3d': '0.70 - 0.75',
                'hyperdimensional_4d': '0.75 - 0.85',
                'breakdown_warning': '0.85 - 0.95',
                'breakdown_critical': '>= 0.95',
            },
        }
    
    def force_intervention(self, action_name: str) -> Dict[str, Any]:
        """Force a specific intervention (for debugging/override)."""
        try:
            action = Action[action_name.upper()]
        except KeyError:
            return {'error': f'Unknown action: {action_name}'}
        
        snapshot = self._create_snapshot_from_metrics()
        if snapshot is None:
            return {'error': 'Could not get current metrics'}
        
        result = self._execute_intervention(action, snapshot)
        
        return {
            'action': action.name,
            'success': result.success,
            'phi_change': result.phi_after - result.phi_before,
            'details': result.details,
        }
