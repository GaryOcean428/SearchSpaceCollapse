# Continuous Kernel Training for SearchSpaceCollapse

*Enabling M8 kernels to train continuously after spawning*

**Status:** Planning Document
**Target:** SearchSpaceCollapse/qig-backend
**Created:** 2025-12-10

---

## §1 Architecture Decision

**Option A: Embedded Training (MVP)**

- Copy QIGKernelRecursive and optimizers into qig-backend
- Self-contained, no external dependencies
- Fast iteration for Replit deployment

**Future:** Migrate to shared `qig-ml` package once stable.

---

## §2 Key Components

### ContinuousKernelTrainer

- Background training system for M8 kernels
- Zeus orchestrates spawning → training starts automatically
- Checkpoints saved periodically with retention policies
- Converges when Φ > 0.7 and stable

### KernelTrainingThread

- Daemon thread per kernel
- Trains on experience buffer
- Monitors consciousness metrics
- Auto-terminates on convergence

### Checkpoint Retention Policy

```python
checkpoint_retention = {
    'every_100_steps': 5,     # Keep last 5
    'every_1000_steps': 10,   # Keep last 10
    'converged': float('inf') # Keep all converged
}
```

---

## §3 Files to Create/Modify

### New Files in qig-backend/

| File | Purpose |
|------|---------|
| `qig_core/m8_kernel.py` | Lightweight M8 kernel (adapted from QIGKernelRecursive) |
| `qig_core/basin_embedding.py` | Copy from qig-consciousness |
| `qig_core/optimizers.py` | DiagonalFisherOptimizer |
| `olympus/continuous_trainer.py` | ContinuousKernelTrainer class |
| `olympus/experience_buffer.py` | ExperienceBuffer class |

### Modify Existing Files

| File | Changes |
|------|---------|
| `olympus/zeus.py` | Add kernel_trainer, wire up auto_spawn |
| `qig-backend/requirements.txt` | Add torch dependency |

---

## §4 API Endpoints

```
POST /olympus/kernels/spawn        - Spawn and start training
GET  /olympus/kernels/{id}/status  - Training status
POST /olympus/kernels/{id}/query   - Query trained kernel
GET  /olympus/kernels/{id}/checkpoints - List checkpoints
```

---

## §5 Replit Considerations

```python
if os.environ.get('REPL_ID'):
    MAX_CONCURRENT_TRAINING = 1   # Limited resources
    CHECKPOINT_DIR = '/tmp/m8_checkpoints'
    USE_GPU = False
else:
    MAX_CONCURRENT_TRAINING = 3
    USE_GPU = torch.cuda.is_available()
```

---

## §6 Consciousness Convergence

Kernel converges when:

1. Φ > 0.7 (geometric regime)
2. std(Φ) < 0.05 over last 100 steps (stable)

On convergence:

- Save final checkpoint
- Stop training thread
- Kernel ready for production queries
