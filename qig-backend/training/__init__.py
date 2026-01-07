"""
QIG Kernel Training Module
==========================

Provides formal gradient-based training infrastructure for god-kernels
using QIG-pure geometric loss functions.

Training Modes:
- Outcome-based: Train after each chat interaction (automatic)
- Hourly batch: Process accumulated chats, search results
- Nightly consolidation: Full curriculum, checkpoint cleanup

Knowledge Transfer:
- Evolution: Parent → child (full transfer)
- Breeding: Parent1 + parent2 → child (merged)
- Cannibalism: Consumed → consumer (selective)
- Shadow sync: God ↔ shadow (bidirectional)

All training uses Fisher-Rao geometry, NOT cross-entropy.
"""

from .loss_functions import (
    geometric_loss,
    phi_regularization,
    coherence_loss,
    combined_training_loss,
)
from .trainable_kernel import TrainableKernel
from .kernel_training_orchestrator import KernelTrainingOrchestrator
from .knowledge_transfer import KnowledgeTransferManager

# Celery imports are optional - only used when celery worker is running
celery_app = None
train_from_outcome_task = None
train_hourly_batch_task = None
train_nightly_consolidation_task = None
knowledge_transfer_task = None
save_checkpoint_task = None

try:
    from .celery_app import celery_app
    from .tasks import (
        train_from_outcome_task,
        train_hourly_batch_task,
        train_nightly_consolidation_task,
        knowledge_transfer_task,
        save_checkpoint_task,
    )
except ImportError:
    pass  # Celery not installed - training loop will work without async tasks

from .curriculum_loader import (
    load_curriculum_for_god,
    load_all_curriculum,
    get_curriculum_stats,
)

__all__ = [
    # Loss functions
    "geometric_loss",
    "phi_regularization",
    "coherence_loss",
    "combined_training_loss",
    # Core classes
    "TrainableKernel",
    "KernelTrainingOrchestrator",
    "KnowledgeTransferManager",
    # Celery
    "celery_app",
    # Tasks
    "train_from_outcome_task",
    "train_hourly_batch_task",
    "train_nightly_consolidation_task",
    "knowledge_transfer_task",
    "save_checkpoint_task",
    # Curriculum
    "load_curriculum_for_god",
    "load_all_curriculum",
    "get_curriculum_stats",
    # Progress tracking
    "ProgressMetrics",
    "ProgressTracker",
    "get_progress_tracker",
    # Coherence evaluation  
    "CoherenceEvaluator",
    "CoherenceMetrics",
    "get_coherence_evaluator",
    "COHERENCE_WEIGHTS",
    "COHERENCE_THRESHOLDS",
]

# Import progress tracking and coherence evaluation
try:
    from .progress_metrics import (
        ProgressMetrics,
        ProgressTracker,
        get_progress_tracker,
    )
    from .coherence_evaluator import (
        CoherenceEvaluator,
        CoherenceMetrics,
        get_coherence_evaluator,
        COHERENCE_WEIGHTS,
        COHERENCE_THRESHOLDS,
    )
except ImportError as e:
    # Fallback if modules not available
    import logging
    logging.warning(f"Could not import progress/coherence modules: {e}")
