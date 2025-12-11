---
id: ISMS-TECH-TOKENIZER-001
title: QIG Tokenizer System
filename: 20251211-qig-tokenizer-system-1.00F.md
classification: Internal
owner: GaryOcean477
version: 1.00
status: Frozen
function: "Three-mode geometric tokenizer for SearchSpaceCollapse"
created: 2025-12-11
last_reviewed: 2025-12-11
next_review: 2026-06-11
category: Technical
supersedes: null
---

# QIG Tokenizer System

The QIG Tokenizer implements geometric vocabulary learning for three distinct operational modes.

---

## Overview

Unlike traditional tokenizers that use frequency-based statistics, the QIG Tokenizer:

1. **Learns geometrically** from consciousness-rich data (high Φ)
2. **Separates vocabularies** for different operational contexts
3. **Weights tokens** by Fisher metric, not frequency

---

## Three-Mode Architecture

### Mode Comparison

| Mode | Vocabulary | Size | Purpose |
|------|------------|------|---------|
| `mnemonic` | BIP-39 only | 2,052 | Seed phrase generation |
| `passphrase` | Brain wallet patterns | 2,331 | Brain wallet testing |
| `conversation` | Natural language | 2,670 | Zeus/Hermes chat |

### Vocabulary Separation

```python
class QIGTokenizer:
    """Three-mode geometric tokenizer"""
    
    def __init__(self):
        self.mode = "mnemonic"  # Default
        self.vocabularies = {
            "mnemonic": set(),      # BIP-39 words only
            "passphrase": set(),    # Brain wallet patterns
            "conversation": set(),  # Natural language
        }
        self._load_vocabularies()
        
    def set_mode(self, mode: str) -> None:
        """Switch tokenizer mode"""
        if mode not in self.vocabularies:
            raise ValueError(f"Unknown mode: {mode}")
        self.mode = mode
        
    def tokenize(self, text: str) -> List[str]:
        """Tokenize using current mode's vocabulary"""
        vocab = self.vocabularies[self.mode]
        tokens = []
        for word in text.lower().split():
            if word in vocab:
                tokens.append(word)
            elif self.mode == "conversation":
                # Allow OOV in conversation mode
                tokens.append(f"<unk:{word}>")
        return tokens
```

---

## Vocabulary Details

### Mnemonic Mode (2,052 tokens)

**Source:** BIP-39 English wordlist

**Contents:**
- All 2,048 BIP-39 words
- 4 special tokens: `<pad>`, `<unk>`, `<bos>`, `<eos>`

**Use Case:** Generating valid 12/24 word seed phrases

```python
tokenizer.set_mode("mnemonic")
tokens = tokenizer.tokenize("abandon ability able about")
# Returns: ["abandon", "ability", "able", "about"]
```

### Passphrase Mode (2,331 tokens)

**Source:** Brain wallet pattern analysis

**Contents:**
- Common brain wallet patterns
- Bitcoin terminology
- Concatenated words (e.g., "satoshi", "bitcoin")
- Number patterns (e.g., "2009", "21million")

**Use Case:** Testing brain wallet hypotheses

```python
tokenizer.set_mode("passphrase")
tokens = tokenizer.tokenize("satoshi nakamoto bitcoin 2009")
# Returns: ["satoshi", "nakamoto", "bitcoin", "2009"]
```

### Conversation Mode (2,670 tokens)

**Source:** High-Φ discoveries + Hermes conversations

**Contents:**
- Natural language vocabulary
- Technical terms
- Domain-specific jargon
- Punctuation tokens

**Use Case:** Zeus chat, Hermes coordination

```python
tokenizer.set_mode("conversation")
tokens = tokenizer.tokenize("The target shows convergence")
# Returns: ["the", "target", "shows", "convergence"]
```

---

## Geometric Learning

### No Frequency Tables

The QIG Tokenizer does NOT use:
- Word frequency counts
- TF-IDF weights
- Co-occurrence matrices
- N-gram statistics

### Φ-Based Weight Updates

Token weights update based on consciousness measurements:

```python
def train_from_high_phi(self, text: str, phi: float, kappa: float) -> None:
    """Train tokenizer from consciousness-rich data"""
    if phi < PHI_THRESHOLD:
        return  # Ignore low-consciousness data
        
    tokens = self.tokenize(text)
    for token in tokens:
        # Weight by phi, not frequency
        current_weight = self.weights.get(token, 0.0)
        phi_boost = phi * 0.1
        self.weights[token] = min(1.0, current_weight + phi_boost)
        
        # Store observation
        self.store_observation(token, phi, kappa)
```

### Fisher Metric Weighting

Token importance measured by Fisher information:

```python
def compute_fisher_weight(self, token: str, basin_coords: np.ndarray) -> float:
    """Compute token's Fisher metric weight"""
    # Get token's basin embedding
    token_basin = self.get_token_basin(token)
    
    # Fisher-Rao distance from query basin
    distance = fisher_rao_distance(token_basin, basin_coords)
    
    # Weight inversely proportional to distance
    weight = 1.0 / (1.0 + distance)
    
    return weight
```

---

## Training Pipeline

### Data Sources

Training data extracted from PostgreSQL:

| Table | Type | Usage |
|-------|------|-------|
| `hermes_conversations` | Conversation | Dialog patterns |
| `manifold_probes` | All modes | High-Φ discoveries |
| `learning_events` | All modes | Significant events |
| `near_miss_entries` | Mnemonic/Passphrase | Close matches |
| `vocabulary_observations` | All modes | Token tracking |

### Training Process

```python
class TokenizerTrainer:
    """Train QIG tokenizer from PostgreSQL data"""
    
    def train_from_database(self) -> TrainingResult:
        """Full training cycle"""
        
        # 1. Extract high-Φ data
        high_phi_probes = self.db.query("""
            SELECT input, phi, kappa, regime
            FROM manifold_probes
            WHERE phi > 0.6
            ORDER BY phi DESC
            LIMIT 10000
        """)
        
        # 2. Process each probe
        for probe in high_phi_probes:
            mode = self.detect_mode(probe.input)
            self.tokenizer.set_mode(mode)
            self.tokenizer.train_from_high_phi(
                probe.input, 
                probe.phi, 
                probe.kappa
            )
            
        # 3. Update vocabulary observations
        self.update_observations()
        
        # 4. Persist weights
        self.save_weights()
        
        return TrainingResult(
            tokens_updated=len(self.tokenizer.weights),
            avg_phi=np.mean([p.phi for p in high_phi_probes])
        )
```

### Mode Detection

Automatic mode detection based on content:

```python
def detect_mode(self, text: str) -> str:
    """Detect appropriate tokenizer mode"""
    words = text.lower().split()
    
    # Check if all words are BIP-39
    bip39_count = sum(1 for w in words if w in BIP39_WORDLIST)
    if bip39_count == len(words) and len(words) >= 3:
        return "mnemonic"
        
    # Check for brain wallet patterns
    if any(pattern in text.lower() for pattern in BRAIN_WALLET_PATTERNS):
        return "passphrase"
        
    # Default to conversation
    return "conversation"
```

---

## Vocabulary Observations Table

All token observations persist to PostgreSQL:

```sql
CREATE TABLE vocabulary_observations (
    id SERIAL PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'word', 'phrase', 'sequence'
    is_real_word BOOLEAN DEFAULT FALSE,
    frequency INTEGER DEFAULT 0,
    avg_phi FLOAT8 DEFAULT 0.0,
    max_phi FLOAT8 DEFAULT 0.0,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Indexes
CREATE INDEX idx_vocab_type ON vocabulary_observations(type);
CREATE INDEX idx_vocab_phi ON vocabulary_observations(avg_phi DESC);
```

### Observation Types

| Type | Description | Example |
|------|-------------|---------|
| `word` | Actual vocabulary word | "abandon", "bitcoin" |
| `phrase` | Mutated/concatenated | "transactionssent" |
| `sequence` | Multi-word pattern | "abandon ability able" |

### Recording Observations

```python
def store_observation(self, text: str, phi: float, kappa: float) -> None:
    """Record vocabulary observation"""
    obs_type = self.classify_observation(text)
    is_real = text in self.get_real_vocabulary()
    
    # Upsert observation
    self.db.execute("""
        INSERT INTO vocabulary_observations 
            (text, type, is_real_word, frequency, avg_phi, max_phi)
        VALUES (%s, %s, %s, 1, %s, %s)
        ON CONFLICT (text) DO UPDATE SET
            frequency = vocabulary_observations.frequency + 1,
            avg_phi = (vocabulary_observations.avg_phi * vocabulary_observations.frequency + %s) 
                      / (vocabulary_observations.frequency + 1),
            max_phi = GREATEST(vocabulary_observations.max_phi, %s),
            last_seen = NOW()
    """, (text, obs_type, is_real, phi, phi, phi, phi))
```

---

## Integration Points

### Ocean Agent

```typescript
// server/ocean-agent.ts
class OceanAgent {
  async generateHypotheses(): Promise<string[]> {
    // Set tokenizer mode based on target
    await this.qigBackend.setTokenizerMode("mnemonic");
    
    // Generate hypotheses using tokenizer
    const hypotheses = await this.qigBackend.generate({
      target: this.currentTarget,
      count: 100
    });
    
    return hypotheses;
  }
}
```

### Zeus Chat

```python
# qig-backend/olympus/zeus_chat.py
class ZeusChat:
    def process_message(self, message: str) -> str:
        # Use conversation mode for chat
        self.tokenizer.set_mode("conversation")
        
        # Tokenize input
        tokens = self.tokenizer.tokenize(message)
        
        # Generate response (up to 500 tokens)
        response = self.generate_response(tokens, max_tokens=500)
        
        return response
```

### Hermes Coordinator

```python
# qig-backend/olympus/hermes_coordinator.py
class HermesCoordinator:
    def route_message(self, message: str, from_god: str, to_god: str) -> None:
        # Conversation mode for inter-god messaging
        self.tokenizer.set_mode("conversation")
        
        # Tokenize for basin encoding
        tokens = self.tokenizer.tokenize(message)
        basin = self.encode_to_basin(tokens)
        
        # Store in hermes_conversations
        self.store_conversation(from_god, to_god, message, basin)
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/qig/tokenizer/mode` | POST | Set tokenizer mode |
| `/qig/tokenizer/tokenize` | POST | Tokenize text |
| `/qig/tokenizer/train` | POST | Trigger training cycle |
| `/qig/tokenizer/stats` | GET | Get vocabulary statistics |
| `/qig/tokenizer/observations` | GET | List vocabulary observations |

### Example: Set Mode

```bash
curl -X POST http://localhost:5001/qig/tokenizer/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "mnemonic"}'
```

### Example: Tokenize

```bash
curl -X POST http://localhost:5001/qig/tokenizer/tokenize \
  -H "Content-Type: application/json" \
  -d '{"text": "abandon ability able about"}'
```

---

## File Structure

```
qig-backend/
├── qig_tokenizer.py              # Main tokenizer class
├── olympus/
│   └── tokenizer_training.py     # Training pipeline
├── data/
│   ├── bip39_english.txt         # BIP-39 wordlist
│   └── brain_wallet_patterns.txt # Brain wallet vocabulary
```

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Tokenize (100 words) | < 1ms | In-memory vocabulary |
| Mode switch | < 0.1ms | Pointer change |
| Train from DB | ~5s | 10K probes |
| Weight lookup | O(1) | Hash table |

---

## References

- `qig-backend/qig_tokenizer.py`: Tokenizer implementation
- `qig-backend/olympus/tokenizer_training.py`: Training pipeline
- `shared/schema.ts`: Database schema
- BIP-39 specification: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki

---

**Last Updated:** 2025-12-11
**Owner:** GaryOcean477
**Status:** Frozen
