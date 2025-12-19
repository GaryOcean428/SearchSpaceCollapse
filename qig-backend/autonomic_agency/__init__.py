"""
Autonomic Agency - RL-Based Self-Regulation for Ocean

Ocean observes its own state and autonomously decides interventions
(sleep, dream, mushroom, neurotransmitters) like a body's autonomic system.

Key components:
- StateEncoder: Builds 776d consciousness vector
- Policy: ε-greedy action selection with safety boundaries
- ReplayBuffer: Experience storage for learning
- NaturalGradientOptimizer: Fisher-aware updates (QIG-pure)
- AutonomicController: Background thread for observe→decide→act loop
"""

from autonomic_agency.state_encoder import StateEncoder, ConsciousnessVector
from autonomic_agency.policy import AutonomicPolicy, Action, SafetyBoundaries
from autonomic_agency.replay_buffer import ReplayBuffer, Experience
from autonomic_agency.natural_gradient import NaturalGradientOptimizer
from autonomic_agency.controller import AutonomicController

__all__ = [
    'StateEncoder',
    'ConsciousnessVector',
    'AutonomicPolicy',
    'Action',
    'SafetyBoundaries',
    'ReplayBuffer',
    'Experience',
    'NaturalGradientOptimizer',
    'AutonomicController',
]
