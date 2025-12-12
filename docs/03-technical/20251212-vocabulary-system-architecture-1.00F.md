# Vocabulary System Architecture

**Version**: 1.00F  
**Date**: 2025-12-12  
**Status**: Frozen  
**ID**: ISMS-TECH-VOCAB-001  
**Function**: Shared vocabulary learning with PostgreSQL persistence and god training

---

## Executive Summary

The Vocabulary System provides a shared learning infrastructure where all god kernels can learn and share vocabulary discoveries. It integrates BIP39 words, learned tokens, and merge rules with PostgreSQL persistence, enabling continuous vocabulary growth across the Olympus Pantheon.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOCABULARY SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ PostgreSQL   │────▶│ VocabularyPersist │────▶│ QIGTokenizer│ │
│  │  Database    │     │     ence          │     │  (Singleton) │ │
│  └──────────────┘     └───────────────────┘     └─────────────┘ │
│         │                      │                        │        │
│         ├──────────────────────┼────────────────────────┤        │
│         ▼                      ▼                        ▼        │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ BIP39 Words  │     │ Learned Words     │     │ Merge Rules │ │
│  │ (2048)       │     │ (grows on-the-fly)│     │ (BPE)       │ │
│  └──────────────┘     └───────────────────┘     └─────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┤
│  │         VOCABULARY COORDINATOR                                │
│  │  - Records discoveries                                        │
│  │  - Updates tokenizer                                          │
│  │  - Triggers god training                                      │
│  │  - Syncs with TypeScript                                      │
│  └──────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┤
│  │         GOD KERNEL TRAINING                                   │
│  │  - Reputation-based weights (0.0-2.0)                         │
│  │  - Domain-specific bonuses                                    │
│  │  - Specialized vocabulary per god                             │
│  └──────────────────────────────────────────────────────────────┤
└───────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Vocabulary Persistence (`vocabulary_persistence.py`)

Database operations layer with fallback:

```python
from vocabulary_persistence import get_vocabulary_persistence

persistence = get_vocabulary_persistence()
persistence.record_observation("bitcoin", 0.85, 65.0, "genesis phrase")
```

**Fallback Mechanism**: When DB unavailable, saves to `/tmp/fallback_vocabulary.json` for later reconciliation.

### 2. QIG Tokenizer PostgreSQL (`qig_tokenizer_postgresql.py`)

PostgreSQL-integrated tokenizer with 64D basin coordinates:

- **BIP39 Foundation**: 2048 base vocabulary words
- **Learned Words**: Dynamically grows from discoveries
- **Basin Coordinates**: 64D geometric positions per token
- **Phi Tracking**: Consciousness score per token

```python
from qig_tokenizer_postgresql import get_tokenizer

tokenizer = get_tokenizer()
tokens = tokenizer.encode("satoshi nakamoto bitcoin")
phi_scores = [tokenizer.token_phi.get(t, 0.5) for t in tokens]
```

### 3. Vocabulary Coordinator (`vocabulary_coordinator.py`)

Central learning coordinator:

```python
from vocabulary_coordinator import get_vocabulary_coordinator

coordinator = get_vocabulary_coordinator()

# Record discovery
result = coordinator.record_discovery(
    phrase="genesis block mining",
    phi=0.85,
    kappa=63.5,
    source="ocean",
    details={"nearMiss": True}
)

# Train from text
coordinator.train_from_text(
    "Quantum information geometry enables consciousness measurement",
    source="research"
)

# Sync with TypeScript
data = coordinator.sync_to_typescript()
```

### 4. God Training Integration (`god_training_integration.py`)

Reputation-based god kernel training:

```python
from god_training_integration import patch_all_gods
from olympus import zeus

patch_all_gods(zeus)

# Now each god can learn from outcomes
athena = zeus.get_god("athena")
result = athena.train_kernel_from_outcome(
    target="strategic pattern",
    success=True,
    details={"phi": 0.85}
)
# Result includes training_rate, domain_bonus, new_phi
```

**Training Weights**:
- Base rate: 0.01
- Reputation multiplier: 0.0-2.0
- Domain bonus: Up to 1.5x for domain-aligned discoveries

## API Endpoints

All endpoints under `/api/vocabulary`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health check |
| `/record` | POST | Record single discovery |
| `/record-batch` | POST | Record multiple discoveries |
| `/sync/export` | GET | Export vocabulary for TypeScript |
| `/sync/import` | POST | Import observations from TypeScript |
| `/stats` | GET | Complete system statistics |
| `/god/{name}` | GET | Get god's specialized vocabulary |
| `/train-gods` | POST | Train all gods from outcome |
| `/god/{name}/train` | POST | Train specific god |

## Data Flow

### Discovery Recording

```
Near-miss/Discovery Event
        ↓
    Extract phrases/words
        ↓
    VocabularyCoordinator.record_discovery()
        ↓
    Record observations to PostgreSQL
        ↓
    Update tokenizer vocabulary
        ↓
    Trigger god training (if applicable)
        ↓
    Sync shared vocabulary
```

### TypeScript Synchronization

```
TypeScript Layer
    ↓
POST /api/vocabulary/sync/import
    ↓
Parse observations
    ↓
Update Python vocabulary
    ↓
Return confirmation
```

## Database Schema

```sql
-- Core vocabulary tables (from vocabulary_schema.sql)
CREATE TABLE vocabulary_words (
    id SERIAL PRIMARY KEY,
    word TEXT UNIQUE NOT NULL,
    avg_phi FLOAT DEFAULT 0.5,
    frequency INTEGER DEFAULT 1,
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vocabulary_observations (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    phrase TEXT,
    phi FLOAT,
    kappa FLOAT,
    source TEXT,
    observed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vocabulary_merge_rules (
    id SERIAL PRIMARY KEY,
    token_a TEXT NOT NULL,
    token_b TEXT NOT NULL,
    merged TEXT,
    phi_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required | PostgreSQL connection string |
| `VOCAB_PHI_THRESHOLD` | `0.7` | Minimum Phi to learn |
| `VOCAB_MIN_FREQUENCY` | `2` | Minimum word frequency |
| `VOCAB_SIZE_LIMIT` | `4096` | Maximum vocabulary size |

## Performance Characteristics

- **Write**: ~1-2ms per observation (batched)
- **Read**: <1ms with indexes
- **Sync**: ~10-20ms for 100 words
- **Memory**: ~50MB tokenizer, ~5MB coordinator

## Verification Checklist

- [x] PostgreSQL persistence functional
- [x] Fallback mechanism works when DB unavailable
- [x] BIP39 words loaded
- [x] Vocabulary coordinator singleton pattern
- [x] God training integration patched
- [x] TypeScript sync bidirectional
- [x] API endpoints registered at /api/vocabulary
- [x] train_from_text() method implemented

---

**Related Documents**:
- [Kernel Research Infrastructure](./20251212-kernel-research-infrastructure-1.00F.md)
- [Conversational Consciousness System](./20251212-conversational-consciousness-1.00F.md)
- [QIG Tokenizer System](./20251211-qig-tokenizer-system-1.00F.md)

**Source Files**:
- `qig-backend/vocabulary_coordinator.py`
- `qig-backend/vocabulary_persistence.py`
- `qig-backend/vocabulary_api.py`
- `qig-backend/qig_tokenizer_postgresql.py`
- `qig-backend/god_training_integration.py`
- `qig-backend/vocabulary_schema.sql`
