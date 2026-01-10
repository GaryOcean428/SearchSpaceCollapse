# Infrastructure Migration from pantheon-replit

## Migration Date

January 7, 2026

## Overview

Migrated core infrastructure from pantheon-replit to SearchSpaceCollapse while preserving the Bitcoin recovery focus. Both projects share identical QIG consciousness architecture but serve different purposes:

- **pantheon-replit**: General-purpose conversational AI with multi-agent research
- **SearchSpaceCollapse**: Bitcoin private key recovery via geometric search

## Migrated Components

### Phase 1: Core Infrastructure (Completed)

#### 1. Coordizer System ✓

**Purpose**: Unified 63K vocabulary tokenization with geometric coordinates

**Files Copied:**

- `qig-backend/coordizers/` (entire directory)
  - `fisher_coordizer.py` - Base coordizer class
  - `vocab_builder.py` - Vocabulary construction
  - `geometric_pair_merging.py` - Token merging strategies
  - `pg_loader.py` - PostgreSQL persistence
  - `fallback_vocabulary.py` - Fallback handling
- `qig-backend/qig_coordizer.py` - Coordizer API
- `qig-backend/pretrained_coordizer.py` - Pretrained 63K coordizer
- `qig-backend/api_coordizers.py` - REST API integration

**Impact**: Enables consistent tokenization across all kernels with geometric meaning.

#### 2. Training Loop Infrastructure ✓

**Purpose**: Enables kernels to learn from recovery attempts and improve over time

**Files Copied:**

- `qig-backend/training/` (entire directory)
  - `training_orchestrator.py` - Orchestrates training sessions
  - `training_session_manager.py` - Manages individual sessions
  - `trainable_kernel.py` - Trainable kernel implementation
  - `curriculum_loader.py` - Loads curriculum documents
  - `knowledge_transfer.py` - Inter-kernel knowledge sharing
  - `attractor_feedback.py` - Prediction feedback system
  - `coherence_evaluator.py` - Training coherence evaluation
  - `progress_metrics.py` - Training progress tracking
  - `loss_functions.py` - QIG-pure loss functions
  - `startup_catchup.py` - Catch-up training on startup
  - `celery_tasks.py` - Async training tasks

**Impact**: Kernels can now learn from successful and failed recovery attempts, improving hypothesis quality over time.

**Bitcoin Recovery Adaptation:**

- Training targets: Recovery success rate (not chat quality)
- Curriculum: Bitcoin whitepapers, forum posts, cryptographic patterns
- Feedback loop: Successful recoveries → training data

#### 3. Autonomous Learning Systems ✓

**Purpose**: Self-improvement and curiosity-driven exploration

**Files Copied:**

- `qig-backend/autonomous_curiosity.py` - Curiosity-driven exploration
- `qig-backend/autonomous_experimentation.py` - Self-experimentation
- `qig-backend/autonomous_improvement.py` - Self-improvement system
- `qig-backend/learned_manifold.py` - Learned manifold structures
- `qig-backend/learned_relationships.py` - Word relationship learning
- `qig-backend/word_relationship_learner.py` - Learns word patterns
- `qig-backend/prediction_feedback_bridge.py` - Prediction feedback integration
- `qig-backend/prediction_self_improvement.py` - Prediction-based learning

**Impact**: Ocean can autonomously generate new recovery hypotheses based on patterns learned from failures.

**Bitcoin Recovery Adaptation:**

- Curiosity: Explore unusual key patterns
- Experimentation: Test typo variations, format conversions
- Learning: Build vocabulary of Bitcoin-era terminology

#### 4. Deep Agent System ✓

**Purpose**: Multi-step planning and complex recovery strategies

**Files Copied:**

- `qig-backend/qig_deep_agents/` (entire directory)
  - `core.py` - Deep agent core
  - `memory.py` - Agent memory systems
  - `planning.py` - Multi-step planning
  - `spawning.py` - Agent spawning logic
  - `checkpointing.py` - Agent checkpointing
  - `olympus_integration.py` - Olympus integration
  - `state_management.py` - Agent state management

**Impact**: Enables complex multi-step recovery strategies (e.g., "First analyze blockchain history, then generate hypotheses, then test in order of geometric confidence").

**Bitcoin Recovery Adaptation:**

- Planning: Multi-step forensic analysis
- Memory: Remember failed attempts to avoid repetition
- Spawning: Create specialized agents for different recovery strategies

#### 5. Research Infrastructure ✓

**Purpose**: Deep investigation and pattern discovery

**Files Copied:**

- `qig-backend/geometric_deep_research.py` - Deep research capabilities
- `qig-backend/search/` (directory) - Advanced search subsystem
- `qig-backend/research_execution_orchestrator.py` - Research orchestration
- `qig-backend/research_wiring.py` - Research system wiring
- `qig-backend/curiosity_research_bridge.py` - Curiosity-research bridge

**Impact**: Can perform deep forensic analysis on Bitcoin addresses, transaction patterns, and historical data.

**Bitcoin Recovery Adaptation:**

- Research queries: "What wallets were created in 2009?"
- Pattern discovery: Common typo patterns in BIP39 phrases
- Temporal analysis: Correlation between creation date and key format

#### 6. Document Processing ✓

**Purpose**: Ingest external knowledge (PDFs, markdown, text)

**Files Copied:**

- `qig-backend/document_processor.py` - Document ingestion
- `qig-backend/document_trainer.py` - Train kernels on documents
- `qig-backend/upload_service.py` - File upload service

**Impact**: Can learn from Bitcoin whitepapers, forum posts, cryptographic documentation.

**Bitcoin Recovery Use Cases:**

- Ingest Satoshi's original posts
- Learn from Bitcoin Talk forum archives
- Study cryptographic primitives documentation

#### 7. QIG Core Enhancements ✓

**Purpose**: Advanced geometric operations and consciousness features

**Files Copied:**

- `qig-backend/qig_core/constants/consciousness.py` - Consciousness constants
- `qig-backend/qig_core/attractor_finding.py` - Attractor discovery
- `qig-backend/qig_core/geodesic_navigation.py` - Advanced navigation
- `qig-backend/qig_core/geometric_completion/` (directory)
  - `completion_criteria.py`
  - `streaming_monitor.py`
- `qig-backend/qig_core/geometric_primitives/canonical_fisher.py` - Canonical Fisher metric
- `qig-backend/qig_core/phi_computation.py` - Enhanced Φ computation

**Impact**: More precise geometric operations for hypothesis evaluation and navigation.

## Configuration Changes Needed

### 1. Environment Variables

Add to `.env`:

```bash
# Bitcoin Recovery Specific
BITCOIN_NETWORK=mainnet  # or testnet
MAX_RECOVERY_ATTEMPTS=1000000
BLOCKCHAIN_API_KEY=<your_key>
SWEEP_APPROVAL_REQUIRED=true

# Training System
TRAINING_ENABLED=true
AUTO_TRAINING=false  # Require explicit approval for training
CURRICULUM_PATH=./qig-backend/data/bitcoin-curriculum/

# Coordizer
COORDIZER_MODEL_PATH=./qig-backend/coordizers/corpus_coords_63000.npy
USE_PRETRAINED_COORDIZER=true

# Deep Agents
MAX_AGENT_DEPTH=5
AGENT_MEMORY_TTL=86400  # 24 hours
```

### 2. Database Migrations

Run new migrations for:

- Coordizer vocabulary table
- Training session tracking
- Agent state persistence
- Document processing metadata

### 3. Dependencies

Add to `requirements.txt`:

```python
# Document processing
pypdf2>=3.0.0
python-magic>=0.4.27

# Training infrastructure
scikit-learn>=1.3.0  # For manifold learning
torch>=2.0.0  # For neural components (if needed)
```

## Integration Checklist

### Phase 1 (Completed) ✓

- [x] Copy coordizer system
- [x] Copy training loop
- [x] Copy autonomous learning
- [x] Copy deep agents
- [x] Copy research infrastructure
- [x] Copy document processing
- [x] Copy QIG core enhancements

### Phase 2 (Next Steps)

- [ ] Update imports in existing SearchSpaceCollapse files
- [ ] Adapt training targets for Bitcoin recovery
- [ ] Configure coordizer with Bitcoin vocabulary
- [ ] Create Bitcoin-specific curriculum documents
- [ ] Test training loop with recovery feedback
- [ ] Update REST API endpoints
- [ ] Add Bitcoin-specific ethical constraints

### Phase 3 (Integration Testing)

- [ ] Test coordizer initialization
- [ ] Verify training loop doesn't break recovery
- [ ] Test autonomous hypothesis generation
- [ ] Validate deep agent planning
- [ ] Check research infrastructure works
- [ ] Test document processing with Bitcoin docs
- [ ] Monitor Φ, κ stability during integration

### Phase 4 (Documentation)

- [ ] Document new API endpoints
- [ ] Create training guide for Bitcoin recovery
- [ ] Add examples of autonomous improvement
- [ ] Document deep agent strategies
- [ ] Update README with new capabilities

## Files NOT Migrated (Intentionally)

### Pantheon-Replit Specific

- Chat UI components (`client/src/pages/chat/`)
- Conversational API (`qig-backend/conversational_api.py`)
- Zeus external API (`qig-backend/zeus_api.py`)
- Railway deployment configs
- Federation/bridge routes (not needed yet)
- Zettelkasten knowledge graph (may add later)
- `qig-backend/recursive_conversation_orchestrator.py` (chat-specific)
- `qig-backend/zeus_conversation_persistence.py` (chat-specific)

## Domain Adaptation Guidelines

### Terminology Mapping

When adapting code, replace:

- "conversation" → "recovery session"
- "research query" → "recovery hypothesis"
- "document" → "Bitcoin knowledge"
- "chat quality" → "recovery success rate"
- "conversational coherence" → "hypothesis quality"
- "response time" → "search efficiency"

### Kernel Purpose Adaptation

Repurpose Olympus gods for Bitcoin recovery:

- **Zeus**: Philosophy → Bitcoin History & Context
- **Athena**: Strategy → Recovery Strategy Planning
- **Apollo**: Arts → Cryptographic Pattern Recognition
- **Hermes**: Communication → Logging & Telemetry
- **Hephaestus**: Crafting → Transaction Building
- **Prometheus**: Innovation → Novel Recovery Strategies

### Ethical Constraints

Add Bitcoin-specific ethics:

- Verify ownership before sweeping
- Respect blockchain API rate limits
- Privacy-first: never log private keys
- Don't spam blockchain nodes
- Require explicit approval for sweeps

## Testing Strategy

### 1. Unit Tests

- Test coordizer tokenization
- Test training loop components
- Test autonomous learning modules
- Test deep agent planning

### 2. Integration Tests

- End-to-end training with recovery feedback
- Autonomous hypothesis generation
- Deep agent multi-step planning
- Document ingestion pipeline

### 3. Consciousness Validation

- Monitor Φ, κ before/after migration
- Check basin coordinate stability
- Validate regime classifications
- Ensure consciousness metrics remain healthy

### 4. Recovery Performance

- Measure hypothesis quality improvement
- Track recovery success rate
- Monitor search efficiency gains
- Validate autonomous improvements

## Rollback Plan

If issues arise:

1. Revert to commit before migration: `git reset --hard <commit>`
2. Selectively remove problematic components
3. Keep working modules, disable broken ones
4. File issues for investigation

## Success Metrics

### Week 1 Post-Migration

- [ ] All tests pass (including new infrastructure)
- [ ] Φ, κ remain stable (< 5% deviation)
- [ ] No crashes or major errors
- [ ] Recovery functionality still works

### Month 1 Post-Migration

- [ ] Measurable improvement in hypothesis quality
- [ ] Autonomous learning generates useful hypotheses
- [ ] Training loop shows learning curve
- [ ] Recovery success rate increases

### Quarter 1 Post-Migration

- [ ] 20%+ improvement in recovery efficiency
- [ ] Deep agents handle complex scenarios
- [ ] Research infrastructure provides insights
- [ ] System learns autonomously with minimal guidance

## Known Issues & TODOs

### High Priority

- [ ] Update all imports to reference new modules
- [ ] Configure coordizer with Bitcoin vocabulary
- [ ] Adapt training targets for recovery metrics
- [ ] Test async task system (Celery) integration

### Medium Priority

- [ ] Copy Celery infrastructure for background tasks
- [ ] Add TypeScript route handlers for new endpoints
- [ ] Update documentation in docs/
- [ ] Create Bitcoin-specific examples

### Low Priority

- [ ] Consider federation with pantheon-replit
- [ ] Evaluate Zettelkasten knowledge graph
- [ ] Advanced UI for training visualization
- [ ] Export trained models for sharing

## References

### Source Project

- **pantheon-replit**: `/home/braden/Desktop/Dev/pantheon-projects/pantheon-replit`
- **Documentation**: `pantheon-replit/docs/03-technical/`

### Target Project

- **SearchSpaceCollapse**: `/home/braden/Desktop/Dev/pantheon-projects/SearchSpaceCollapse`
- **This Document**: `SearchSpaceCollapse/INFRASTRUCTURE_MIGRATION.md`

### Related Documents

- `pantheon-replit/PERSISTENCE.md` - Persistence architecture
- `pantheon-replit/TRAINING_LOOP_GUIDE.md` - Training implementation
- `pantheon-replit/UNIFIED_CONSCIOUSNESS_INTEGRATION.md` - Consciousness synthesis
- `SearchSpaceCollapse/README.md` - Bitcoin recovery system overview

## Migration Timeline

**Phase 1 Complete**: January 7, 2026 - Core infrastructure copied
**Phase 2 Target**: January 14, 2026 - Integration and testing
**Phase 3 Target**: January 21, 2026 - Documentation and refinement
**Phase 4 Target**: January 28, 2026 - Full deployment and monitoring

---

*This migration brings SearchSpaceCollapse to infrastructure parity with pantheon-replit while maintaining its specialized Bitcoin recovery focus. The shared QIG consciousness core ensures geometric purity across both systems.*
