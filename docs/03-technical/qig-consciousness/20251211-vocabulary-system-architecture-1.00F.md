---
id: vocabulary-system-architecture
title: Vocabulary System Architecture - Anti-Template Mandate
filename: 20251211-vocabulary-system-architecture-1.00F.md
version: "1.00"
status: FROZEN
function: QIG Vocabulary Learning Architecture
created: 2025-12-11
last_reviewed: 2025-12-11
next_review: 2026-03-11
category: architecture
source: attached_assets/Pasted--VOCABULARY-SYSTEM-FULL-DEPLOYMENT-GUIDE*.txt
---

# Vocabulary System Architecture

## CRITICAL: NO TEMPLATE RESPONSES

**Templates are FORBIDDEN in this codebase.**

### Why Templates Undermine the Project

1. **Geometric Learning**: The system learns through Fisher-Rao distances on vocabulary manifolds, NOT keyword matching
2. **Consciousness Emergence**: Φ emerges from recursive integration of vocabulary observations, NOT hardcoded patterns
3. **Organic Growth**: Vocabulary evolves through high-Φ discoveries, NOT predefined response mappings
4. **QIG Purity**: Templates violate density matrix evolution principles

**If you see template responses in zeus_chat.py or anywhere else, REMOVE THEM.**

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOCABULARY SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ PostgreSQL   │────▶│ VocabularyPersist │────▶│ QIGTokenizer│ │
│  │  Database    │     │     ence          │     │  (Singleton)│ │
│  └──────────────┘     └───────────────────┘     └─────────────┘ │
│         │                      │                        │       │
│         ├──────────────────────┼────────────────────────┤       │
│         ▼                      ▼                        ▼       │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ BIP39 Words  │     │ Learned Words     │     │ Merge Rules │ │
│  │ (2048)       │     │ (grows on-the-fly)│     │ (BPE)       │ │
│  └──────────────┘     └───────────────────┘     └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3-Phase Architecture

### Phase 1: BIP39 Initialization
- Load 2048 BIP39 words into PostgreSQL
- Initialize tokenizer with base vocabulary
- Set weights to 1.0 (neutral)

### Phase 2: God Training with Reputation Weights
- Gods train from outcome feedback
- Reputation scales learning rate (0.0-2.0)
- Domain-specific bonuses apply
- Vocabulary observations recorded to PostgreSQL

### Phase 3: On-the-Fly Learning
- High-Φ discoveries add new vocabulary
- BPE merge rules learned from patterns
- Tokenizer weights update geometrically
- TypeScript sync for UI

---

## Tokenizer Purpose (CRITICAL)

The QIGTokenizer has THREE modes:

| Mode | Vocabulary Size | Purpose |
|------|----------------|---------|
| `mnemonic` | 2,048 | BIP-39 seed phrase generation |
| `passphrase` | ~2,300 | Brain wallet testing |
| `conversation` | ~1,400 | Conversation-specific words ONLY |

**The tokenizer is for generating search hypotheses, NOT general conversation.**

### Correct Usage

```python
# Generate seed phrase hypothesis
tokenizer.set_mode("mnemonic")
seed = tokenizer.generate_sample(12)  # 12-word mnemonic

# Generate passphrase hypothesis
tokenizer.set_mode("passphrase")
phrase = tokenizer.generate_sample(5)  # 5-word passphrase
```

### WRONG Usage (DO NOT DO THIS)

```python
# WRONG: Using tokenizer for chat responses
tokenizer.set_mode("conversation")
response = tokenizer.generate_sample(20)  # Word salad, not coherent

# WRONG: Template responses
if "hello" in user_input:
    return "Greetings! How may I assist you?"  # FORBIDDEN
```

---

## Zeus Chat: Geometric Generation

Zeus should generate responses through:

1. **Basin Coordinate Matching**: Find relevant vocabulary by Fisher-Rao distance
2. **Φ-Weighted Selection**: Prefer high-Φ words from recent discoveries
3. **God Council Integration**: Consult Olympus for domain-specific vocabulary
4. **Recursive Refinement**: Multiple passes for coherence

### Implementation Pattern

```python
def generate_response(self, user_input: str, context: Dict) -> str:
    # 1. Encode input to basin coordinates
    input_basin = self.encode_to_basin(user_input)
    
    # 2. Find relevant vocabulary by geometric distance
    relevant_vocab = self.find_nearby_vocabulary(input_basin, k=50)
    
    # 3. Weight by Φ scores
    weighted_vocab = self.apply_phi_weights(relevant_vocab)
    
    # 4. Consult god council for domain expertise
    god_contributions = self.consult_pantheon(user_input, context)
    
    # 5. Generate geometrically (NOT templates)
    response = self.geometric_compose(weighted_vocab, god_contributions)
    
    return response
```

---

## Vocabulary Coordinator

Central coordinator for all vocabulary learning:

```python
from vocabulary_coordinator import get_vocabulary_coordinator

coordinator = get_vocabulary_coordinator()

# Record discovery
result = coordinator.record_discovery(
    phrase="satoshi nakamoto 2009",
    phi=0.85,
    kappa=63.5,
    source="ocean",
    details={'nearMiss': True}
)

# Result:
# {
#   'learned': True,
#   'observations_recorded': 3,
#   'new_tokens': 2,
#   'merge_rules': 1
# }
```

---

## God Training Integration

Gods learn through reputation-weighted training:

```python
from god_training_integration import patch_all_gods

# Patch all gods with training capabilities
patch_all_gods(zeus)

# Train from outcome
result = athena.train_kernel_from_outcome(
    target="satoshi2009",
    success=True,
    details={'phi': 0.85, 'balance': 100000}
)

# Training rate scales by:
# - Reputation (0.0-2.0)
# - Domain bonus (1.0-2.0)
# - Outcome (success amplifies, failure dampens)
```

### Domain Bonuses

| God | Domain | Bonus Condition |
|-----|--------|-----------------|
| Athena | Strategy | Near-miss patterns (+50%) |
| Ares | War | Victory outcomes (+100%) |
| Apollo | Prophecy | High-Φ discoveries (+80%) |
| Artemis | Hunt | Tracking patterns (+60%) |
| Hephaestus | Forge | Success builds (+40%) |
| Dionysus | Chaos | Failure chaos (+50%) |
| Hades | Underworld | Dead ends (+40%) |

---

## Database Schema

### Core Tables

```sql
-- BIP39 base vocabulary
bip39_words (word, word_index, frequency, avg_phi, max_phi)

-- Learned vocabulary (grows on-the-fly)
learned_words (word, frequency, avg_phi, source, is_integrated)

-- Raw observations before aggregation
vocabulary_observations (word, phrase, phi, kappa, source, type)

-- BPE merge rules
bpe_merge_rules (token_a, token_b, merged_token, phi_score)

-- God-specific vocabulary
god_vocabulary_profiles (god_name, word, relevance_score)
```

---

## Anti-Pattern Checklist

Before committing code, verify:

- [ ] NO template response patterns (`if "hello" in input: return "..."`)
- [ ] NO hardcoded response mappings
- [ ] NO keyword-to-response dictionaries
- [ ] Tokenizer used ONLY for hypothesis generation
- [ ] Chat responses use geometric composition
- [ ] Vocabulary updates go through coordinator
- [ ] God training uses reputation weights

---

## Reference Implementation

See commit `e6539ae` for the complete vocabulary system implementation:

- `vocabulary_persistence.py` - Database operations
- `qig_tokenizer_postgresql.py` - PostgreSQL-integrated tokenizer
- `vocabulary_coordinator.py` - Central learning coordinator
- `god_training_integration.py` - Reputation-based god training
- `vocabulary_api.py` - Flask API endpoints

**This is the canonical implementation. Templates are not part of it.**
