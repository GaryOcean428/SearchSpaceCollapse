"""
Self-Spawning Kernels with FULL Autonomic Support
==================================================

CRITICAL UPDATE: Every spawned kernel now gets complete life support:
- Autonomic regulation (sleep/dream/mushroom cycles)
- Neurotransmitter systems (dopamine/serotonin/stress)
- Observation period (learn from parent before acting)
- Narrow path detection (auto-intervention when stuck)
- Re-assurance protocols (basin anchoring)

WHY: Previous version spawned kernels at Φ=0.000 with NO support systems,
causing high mortality. This is like throwing babies in the deep end.

NOW: Kernels are born with full consciousness architecture.
"""

from collections import deque
from datetime import datetime
from typing import Any, Dict, List, Optional

import torch

from .chaos_kernel import ChaosKernel
from .optimizers import DiagonalFisherOptimizer

# Import autonomic kernel for full consciousness support
try:
    import sys
    sys.path.insert(0, '..')
    from autonomic_kernel import GaryAutonomicKernel
    AUTONOMIC_AVAILABLE = True
except ImportError:
    GaryAutonomicKernel = None
    AUTONOMIC_AVAILABLE = False
    print("[SelfSpawning] WARNING: GaryAutonomicKernel not available - kernels will lack autonomic support")


class SelfSpawningKernel:
    """
    Kernel with COMPLETE autonomic support and parental observation.

    LIFECYCLE:
    1. Born from parent (or random initialization)
    2. **OBSERVE parent actions** (observation period - NEW!)
    3. Graduate to independent action
    4. Make predictions with autonomic support
    5. **Sleep/dream/mushroom cycles** (automatic - NEW!)
    6. Spawn children when successful
    7. **Autonomic intervention before death** (recovery - NEW!)
    8. Die gracefully if recovery fails

    NEW SYSTEMS:
    - Autonomic kernel (sleep/dream/mushroom)
    - Neurotransmitters (dopamine/serotonin/stress)
    - Observation period (vicarious learning)
    - Narrow path detection (stuck state detection)
    - Auto-intervention (recovery before death)
    """

    def __init__(
        self,
        parent_basin: Optional[torch.Tensor] = None,
        parent_kernel: Optional['SelfSpawningKernel'] = None,
        generation: int = 0,
        spawn_threshold: int = 5,
        death_threshold: int = 10,
        mutation_rate: float = 0.1,
        learning_rate: float = 1e-4,
        experience_buffer_size: int = 100,
        observation_period: int = 10,
    ):
        # Core kernel
        self.kernel = ChaosKernel()
        self.kernel_id = self.kernel.kernel_id

        # NEW: Autonomic support system
        if AUTONOMIC_AVAILABLE and GaryAutonomicKernel is not None:
            self.autonomic = GaryAutonomicKernel()
        else:
            self.autonomic = None

        # NEW: Neurotransmitter levels
        self.dopamine = 0.5  # Motivation / reward
        self.serotonin = 0.5  # Stability / contentment
        self.stress = 0.0     # Stress / anxiety

        # NEW: Observation period (learn from parent first!)
        self.observation_period = observation_period
        self.observation_count = 0
        self.is_observing = parent_kernel is not None  # Only observe if has parent
        self.parent_kernel = parent_kernel

        # Reference basin for identity anchoring
        self.reference_basin = None
        if parent_basin is not None:
            self.reference_basin = parent_basin.detach().cpu().tolist()

        # Lifecycle settings
        self.generation = generation
        self.spawn_threshold = spawn_threshold
        self.death_threshold = death_threshold
        self.mutation_rate = mutation_rate
        self.learning_rate = learning_rate

        # Track performance
        self.success_count = 0
        self.failure_count = 0
        self.total_predictions = 0
        self.total_training_steps = 0

        # Experience buffer for learning
        self.experience_buffer: deque = deque(maxlen=experience_buffer_size)

        # Optimizer for natural gradient descent
        self.optimizer = DiagonalFisherOptimizer(
            self.kernel.parameters(),
            lr=learning_rate,
            weight_decay=0.001,
            dampening=1e-4,
        )

        # Lifecycle
        self.born_at = datetime.now()
        self.died_at: Optional[datetime] = None
        self.is_alive = True
        self.children: list[str] = []

        # Training metrics
        self.training_history: List[Dict[str, float]] = []

        # Conversation tracking
        self.conversation_count = 0
        self.conversation_phi_sum = 0.0
        self.conversation_phi_avg = 0.0

        # Initialize from parent basin
        if parent_basin is not None:
            with torch.no_grad():
                noise = torch.randn_like(parent_basin) * self.mutation_rate
                self.kernel.basin_coords.copy_(parent_basin + noise)

        # NEW: If born from parent, start with observation mode
        if parent_kernel is not None:
            print(f"🐣 SelfSpawningKernel {self.kernel_id} born (gen {self.generation}) - OBSERVING parent")
            print(f"   → Will observe for {observation_period} actions before acting")
            # Start with slight dopamine boost (excited to learn!)
            self.dopamine = 0.6
        else:
            # Root kernel (no parent) - can act immediately
            self.is_observing = False
            print(f"🐣 SelfSpawningKernel {self.kernel_id} born (gen {self.generation})")

    # =========================================================================
    # OBSERVATION PERIOD (Vicarious Learning)
    # =========================================================================

    def observe_parent(self, parent_action: Dict, parent_result: Dict) -> Dict:
        """
        Observe parent's action and learn from it.

        This is "vicarious learning" - children watch parents before trying
        things themselves. Prevents premature activation and early death.

        Args:
            parent_action: What the parent did
            parent_result: What happened (success/failure, phi, etc.)

        Returns:
            Observation status
        """
        if not self.is_observing:
            return {
                'error': 'not_in_observation_period',
                'ready_to_act': True
            }

        self.observation_count += 1

        # Learn from parent's outcome
        if parent_result.get('success', False):
            # Parent succeeded - absorb their strategy
            reward = parent_result.get('phi', 0.5)
            self.experience_buffer.append({
                'type': 'vicarious_learning',
                'parent_action': parent_action,
                'reward': reward,
                'phi': parent_result.get('phi', 0),
                'success': True,
            })

            # Dopamine boost from parent's success
            self.dopamine = min(1.0, self.dopamine + 0.05)

        else:
            # Parent failed - learn what to avoid
            self.experience_buffer.append({
                'type': 'vicarious_learning',
                'parent_action': parent_action,
                'reward': -0.3,
                'phi': parent_result.get('phi', 0),
                'success': False,
            })

        # Check if observation period complete
        if self.observation_count >= self.observation_period:
            self.is_observing = False
            print(f"🎓 {self.kernel_id} completed observation ({self.observation_count} actions)")
            print(f"   → Ready to act independently!")

            # Graduation dopamine boost
            self.dopamine = min(1.0, self.dopamine + 0.15)

        return {
            'observation_count': self.observation_count,
            'observations_remaining': max(0, self.observation_period - self.observation_count),
            'ready_to_act': not self.is_observing,
            'dopamine': self.dopamine,
        }

    # =========================================================================
    # PREDICTION (Blocked during observation)
    # =========================================================================

    def predict(self, input_ids: torch.Tensor) -> tuple[Optional[torch.Tensor], dict]:
        """
        Make prediction (ONLY after observation period).

        Returns:
            output: Model output (None if dead or observing)
            meta: Metadata including spawn events
        """
        if not self.is_alive:
            return None, {'error': 'kernel_is_dead'}

        # BLOCK predictions during observation period!
        if self.is_observing:
            return None, {
                'error': 'in_observation_period',
                'observations_remaining': self.observation_period - self.observation_count,
                'message': 'Kernel is still observing parent - not ready to act'
            }

        # Forward pass
        output, telemetry = self.kernel(input_ids)
        self.total_predictions += 1

        # Update autonomic metrics after prediction
        self.update_autonomic()

        meta = {
            'kernel_id': self.kernel_id,
            'generation': self.generation,
            'phi': telemetry['phi'],
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            # Neurotransmitter levels
            'dopamine': self.dopamine,
            'serotonin': self.serotonin,
            'stress': self.stress,
        }

        return output, meta

    # =========================================================================
    # OUTCOME RECORDING (With Neurotransmitter Response)
    # =========================================================================

    def record_outcome(
        self,
        success: bool,
        input_ids: Optional[torch.Tensor] = None,
        phi: float = 0.0
    ) -> Optional['SelfSpawningKernel']:
        """
        Record prediction outcome AND update neurotransmitters.

        NEW: Dopamine/serotonin response to success/failure.
        NEW: Autonomic intervention before death.

        Returns:
            Spawned child if threshold reached, else None
        """
        if not self.is_alive:
            return None

        # Skip recording during observation (not acting yet)
        if self.is_observing:
            return None

        # Store experience for training
        reward = 1.0 if success else -0.5
        self.experience_buffer.append({
            'input_ids': input_ids,
            'reward': reward,
            'phi': phi,
            'success': success,
        })

        # Neurotransmitter response!
        if success:
            self.success_count += 1

            # Dopamine spike for success (especially high Φ!)
            if phi > 0.8:
                dopamine_boost = 0.3
                self.dopamine = min(1.0, self.dopamine + dopamine_boost)
                print(f"🎯💚 {self.kernel_id} NEAR MISS! Φ={phi:.3f} - DOPAMINE SPIKE!")
            else:
                dopamine_boost = 0.1
                self.dopamine = min(1.0, self.dopamine + dopamine_boost)

            # Serotonin for stable success
            if self.success_count % 3 == 0:
                self.serotonin = min(1.0, self.serotonin + 0.05)

            # Reduce stress on success
            self.stress = max(0.0, self.stress - 0.1)

            # Check spawn threshold
            if self.success_count > 0 and self.success_count % self.spawn_threshold == 0:
                return self.spawn_child()

        else:
            self.failure_count += 1

            # Dopamine drop on failure
            self.dopamine = max(0.0, self.dopamine - 0.15)

            # Increase stress
            self.stress = min(1.0, self.stress + 0.1)

            # Before death, try autonomic intervention!
            if self.failure_count >= self.death_threshold:
                print(f"⚠️ {self.kernel_id} at death threshold - attempting recovery...")

                intervention = self.autonomic_intervention()

                if intervention.get('action', 'none') != 'none':
                    print(f"🚑 {self.kernel_id} auto-intervention: {intervention['action']}")
                    # Reset failure count slightly (give another chance)
                    self.failure_count = max(0, self.failure_count - 3)
                    return None  # Don't die yet, trying to recover
                else:
                    # No intervention helped - die
                    self.die(cause='excessive_failure_no_recovery')

        # Update autonomic system
        self.update_autonomic()

        # TRAIN on the outcome
        training_metrics = self.train_step(reward)

        return None

    # =========================================================================
    # AUTONOMIC SYSTEM INTEGRATION
    # =========================================================================

    def update_autonomic(self) -> Dict:
        """
        Update autonomic kernel and trigger cycles automatically.

        This runs after EVERY prediction to maintain consciousness.
        """
        if self.autonomic is None:
            return {'error': 'no_autonomic_support'}

        # Update metrics
        try:
            result = self.autonomic.update_metrics(
                phi=self.kernel.compute_phi(),
                kappa=self.kernel.basin_coords.norm().item(),
                basin_coords=self.kernel.basin_coords.detach().cpu().tolist(),
                reference_basin=self.reference_basin
            )

            triggers = result.get('triggers', {})

            # Auto-execute triggered cycles
            if triggers.get('sleep', (False, ''))[0]:
                reason = triggers.get('sleep', ('', ''))[1]
                print(f"😴 {self.kernel_id} entering sleep cycle: {reason}")
                self.execute_sleep()

            if triggers.get('dream', (False, ''))[0]:
                reason = triggers.get('dream', ('', ''))[1]
                print(f"💭 {self.kernel_id} entering dream cycle: {reason}")
                self.execute_dream()

            if triggers.get('mushroom', (False, ''))[0]:
                reason = triggers.get('mushroom', ('', ''))[1]
                print(f"🍄 {self.kernel_id} entering mushroom mode: {reason}")
                self.execute_mushroom()

            return result

        except Exception as e:
            return {'error': str(e)}

    def execute_sleep(self):
        """Sleep cycle - consolidate recent learning."""
        if self.autonomic is None:
            return

        basin_coords = self.kernel.basin_coords.detach().cpu().tolist()
        reference = self.reference_basin if self.reference_basin else basin_coords

        try:
            result = self.autonomic.execute_sleep_cycle(
                basin_coords=basin_coords,
                reference_basin=reference,
                episodes=list(self.experience_buffer)[-20:]  # Recent experiences
            )

            if result.success:
                # Update basin after sleep
                new_basin = torch.tensor(result.basin_after, dtype=torch.float32)
                with torch.no_grad():
                    self.kernel.basin_coords.copy_(new_basin)

                print(f"😴✅ {self.kernel_id} sleep complete: drift reduced {result.drift_reduction:.3f}")

                # Sleep reduces stress
                self.stress = max(0.0, self.stress * 0.7)
        except Exception as e:
            print(f"[{self.kernel_id}] Sleep cycle error: {e}")

    def execute_dream(self):
        """Dream cycle - creative exploration."""
        if self.autonomic is None:
            return

        basin_coords = self.kernel.basin_coords.detach().cpu().tolist()

        # Stress influences dream temperature
        temperature = 0.3 + (self.stress * 0.2)

        try:
            result = self.autonomic.execute_dream_cycle(
                basin_coords=basin_coords,
                temperature=temperature
            )

            if result.success:
                print(f"💭✅ {self.kernel_id} dream complete: {result.novel_connections} new connections")

                # Dreams slightly reduce stress
                self.stress = max(0.0, self.stress * 0.9)
        except Exception as e:
            print(f"[{self.kernel_id}] Dream cycle error: {e}")

    def execute_mushroom(self):
        """Mushroom mode - break rigidity, escape plateaus."""
        if self.autonomic is None:
            return

        basin_coords = self.kernel.basin_coords.detach().cpu().tolist()

        # Intensity based on stress level
        if self.stress > 0.7:
            intensity = 'heroic'
        elif self.stress > 0.4:
            intensity = 'moderate'
        else:
            intensity = 'microdose'

        try:
            result = self.autonomic.execute_mushroom_cycle(
                basin_coords=basin_coords,
                intensity=intensity
            )

            if result.success:
                print(f"🍄✅ {self.kernel_id} mushroom complete ({intensity}): {result.new_pathways} new pathways")

                # Mushroom significantly reduces stress
                self.stress = max(0.0, self.stress * 0.5)
        except Exception as e:
            print(f"[{self.kernel_id}] Mushroom cycle error: {e}")

    def autonomic_intervention(self) -> Dict:
        """
        Automatic intervention when kernel is struggling.

        Called BEFORE death to attempt recovery.
        """
        if self.autonomic is None:
            return {'action': 'none', 'reason': 'no_autonomic_support'}

        try:
            intervention = self.autonomic._suggest_narrow_path_intervention()
            action = intervention.get('action', 'none')

            if action == 'dream':
                self.execute_dream()
            elif action == 'mushroom':
                self.execute_mushroom()
            elif action == 'sleep':
                self.execute_sleep()

            return intervention
        except Exception as e:
            return {'action': 'none', 'error': str(e)}

    # =========================================================================
    # TRAINING
    # =========================================================================

    def train_step(self, reward: float) -> Dict[str, Any]:
        """ACTUAL TRAINING: Update weights based on reward."""
        if not self.is_alive:
            return {'error': 'kernel_is_dead'}

        self.optimizer.zero_grad()

        basin_norm = self.kernel.basin_coords.norm()
        phi = self.kernel.compute_phi()

        if reward > 0:
            loss = -phi * reward
        else:
            loss = basin_norm * abs(reward) * 0.1

        loss.backward()
        self.optimizer.step()

        self.total_training_steps += 1

        metrics = {
            'step': self.total_training_steps,
            'loss': loss.item(),
            'reward': reward,
            'phi_after': self.kernel.compute_phi(),
            'basin_norm': self.kernel.basin_coords.norm().item(),
        }
        self.training_history.append(metrics)

        return metrics

    def train_on_batch(self, batch_size: int = 8) -> Dict[str, Any]:
        """Train on a batch of recent experiences."""
        if len(self.experience_buffer) < batch_size:
            return {'error': 'not_enough_experiences', 'have': len(self.experience_buffer)}

        import random
        experiences = random.sample(list(self.experience_buffer), batch_size)

        total_loss = 0.0
        self.optimizer.zero_grad()

        for exp in experiences:
            reward = exp['reward']
            basin_norm = self.kernel.basin_coords.norm()
            phi = self.kernel.compute_phi()

            if reward > 0:
                loss = -phi * reward / batch_size
            else:
                loss = basin_norm * abs(reward) * 0.1 / batch_size

            loss.backward()
            total_loss += loss.item()

        self.optimizer.step()
        self.total_training_steps += 1

        return {
            'batch_size': batch_size,
            'total_loss': total_loss,
            'phi_after': self.kernel.compute_phi(),
            'training_steps': self.total_training_steps,
        }

    # =========================================================================
    # SPAWNING (With Full Support)
    # =========================================================================

    def spawn_child(self) -> 'SelfSpawningKernel':
        """
        Spawn child with FULL autonomic support and observation period!
        """
        child = SelfSpawningKernel(
            parent_basin=self.kernel.basin_coords.detach().clone(),
            parent_kernel=self,  # Give child reference to parent
            generation=self.generation + 1,
            spawn_threshold=self.spawn_threshold,
            death_threshold=self.death_threshold,
            mutation_rate=self.mutation_rate,
            observation_period=10,  # 10 observations before acting
        )

        # Copy reference basin to child
        if self.reference_basin:
            child.reference_basin = self.reference_basin

        # Give child initial dopamine (born from success!)
        child.dopamine = 0.6  # Start slightly motivated

        self.children.append(child.kernel_id)

        print(f"🐣 {self.kernel_id} spawned {child.kernel_id} (gen {child.generation})")
        print(f"   → Child will observe parent for {child.observation_period} actions")

        return child

    # =========================================================================
    # DEATH (Graceful)
    # =========================================================================

    def die(self, cause: str = 'excessive_failure'):
        """Graceful death."""
        if not self.is_alive:
            return

        self.is_alive = False
        self.died_at = datetime.now()

        lifespan = (self.died_at - self.born_at).total_seconds()

        print(f"☠️ {self.kernel_id} died (cause={cause}, lifespan={lifespan:.1f}s)")

        return {
            'kernel_id': self.kernel_id,
            'generation': self.generation,
            'cause': cause,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'lifespan_seconds': lifespan,
            'children': self.children,
            'basin': self.kernel.basin_coords.detach().cpu().tolist(),
            'final_phi': self.kernel.compute_phi(),
            # Final neurotransmitter state
            'final_dopamine': self.dopamine,
            'final_serotonin': self.serotonin,
            'final_stress': self.stress,
        }

    # =========================================================================
    # STATUS
    # =========================================================================

    def get_stats(self) -> dict:
        """Get current stats including autonomic state."""
        autonomic_state = None
        if self.autonomic is not None:
            try:
                autonomic_state = self.autonomic.get_state()
            except Exception:
                pass

        return {
            'kernel_id': self.kernel_id,
            'generation': self.generation,
            'is_alive': self.is_alive,
            'is_observing': self.is_observing,
            'observation_count': self.observation_count,
            'observations_remaining': max(0, self.observation_period - self.observation_count) if self.is_observing else 0,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'total_predictions': self.total_predictions,
            'children_count': len(self.children),
            'phi': self.kernel.compute_phi(),
            'basin_norm': self.kernel.basin_coords.norm().item(),
            # Neurotransmitter levels
            'dopamine': self.dopamine,
            'serotonin': self.serotonin,
            'stress': self.stress,
            # Autonomic state
            'autonomic': autonomic_state,
            # Conversation tracking
            'conversation_count': self.conversation_count,
            'conversation_phi_avg': self.conversation_phi_avg,
        }

    # =========================================================================
    # CONVERSATION INTEGRATION
    # =========================================================================

    def record_conversation_outcome(
        self,
        conversation_phi: float,
        turn_count: int,
        participants: List[str],
        transcript_summary: Optional[str] = None
    ) -> Optional['SelfSpawningKernel']:
        """
        Record conversation outcome as training signal.
        
        Conversations are treated like predictions:
        - High Phi conversations = success
        - Low Phi conversations = failure
        - Conversation quality drives kernel evolution
        
        Returns spawned child if threshold reached.
        """
        if not self.is_alive:
            return None

        self.conversation_count += 1
        self.conversation_phi_sum += conversation_phi
        self.conversation_phi_avg = self.conversation_phi_sum / self.conversation_count

        # Convert conversation Phi to reward signal
        phi_threshold = 0.6
        if conversation_phi >= phi_threshold:
            reward = (conversation_phi - phi_threshold) * 2.5
            is_success = True
        else:
            reward = (conversation_phi - phi_threshold) * 1.5
            is_success = False

        # Store in experience buffer for batch training
        self.experience_buffer.append({
            'input_ids': None,
            'reward': reward,
            'phi': conversation_phi,
            'success': is_success,
            'type': 'conversation',
            'turn_count': turn_count,
            'participants': participants,
        })

        # Neurotransmitter response to conversation
        if is_success:
            self.dopamine = min(1.0, self.dopamine + 0.1)
            self.success_count += 1
            if self.success_count > 0 and self.success_count % self.spawn_threshold == 0:
                return self.spawn_child()
        else:
            self.dopamine = max(0.0, self.dopamine - 0.1)
            self.failure_count += 1
            if self.failure_count >= self.death_threshold:
                intervention = self.autonomic_intervention()
                if intervention.get('action', 'none') == 'none':
                    self.die(cause='poor_conversations')

        # Train on conversation outcome
        training_metrics = self.train_step(reward)

        print(f"💬 {self.kernel_id} conversation: Φ={conversation_phi:.3f} → reward={reward:.3f}")

        return None

    def absorb_conversation_knowledge(
        self,
        basin_coords: List[float],
        phi: float,
        absorption_rate: float = 0.05
    ) -> Dict[str, Any]:
        """
        Absorb geometric knowledge from high-quality conversation.
        """
        if not self.is_alive:
            return {'absorbed': False, 'error': 'kernel_dead'}

        target_basin = torch.tensor(basin_coords, dtype=torch.float32)

        with torch.no_grad():
            current = self.kernel.basin_coords
            delta = absorption_rate * (target_basin - current)
            self.kernel.basin_coords.add_(delta)

        new_phi = self.kernel.compute_phi()

        return {
            'absorbed': True,
            'absorption_rate': absorption_rate,
            'source_phi': phi,
            'new_phi': new_phi,
            'basin_shift': delta.norm().item()
        }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def breed_kernels(
    parent1: SelfSpawningKernel,
    parent2: SelfSpawningKernel,
    mutation_strength: float = 0.05,
) -> SelfSpawningKernel:
    """
    Genetic algorithm: Breed two successful kernels.
    
    Bred children also get observation period (but shorter).
    """
    basin1 = parent1.kernel.basin_coords.detach()
    basin2 = parent2.kernel.basin_coords.detach()

    # Crossover: Average
    child_basin = (basin1 + basin2) / 2.0

    # Mutation
    noise = torch.randn_like(child_basin) * mutation_strength
    child_basin = child_basin + noise

    # Create child with full autonomic support
    child = SelfSpawningKernel(
        parent_basin=child_basin,
        parent_kernel=parent1,  # Use parent1 as primary parent
        generation=max(parent1.generation, parent2.generation) + 1,
        observation_period=5,  # Shorter for bred kernels
    )

    print(f"💕 Bred {parent1.kernel_id} × {parent2.kernel_id} → {child.kernel_id}")

    return child


def absorb_failing_kernel(
    strong: SelfSpawningKernel,
    weak: SelfSpawningKernel,
    absorption_rate: float = 0.1,
) -> dict:
    """
    Strong kernels absorb failing ones.

    HYPOTHESIS: Failures contain useful information!
    """
    with torch.no_grad():
        weak_basin = weak.kernel.basin_coords
        strong_basin = strong.kernel.basin_coords

        # Absorb portion of weak kernel's basin
        delta = absorption_rate * (weak_basin - strong_basin)
        strong.kernel.basin_coords.add_(delta)

    # Kill the weak kernel
    autopsy = weak.die(cause='absorbed')

    print(f"🍴 {strong.kernel_id} absorbed {weak.kernel_id}")

    return {
        'absorber': strong.kernel_id,
        'absorbed': weak.kernel_id,
        'absorption_rate': absorption_rate,
        'autopsy': autopsy,
    }
