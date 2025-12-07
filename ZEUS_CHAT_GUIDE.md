# Zeus Chat - Human-God Dialogue Interface

## Overview

Zeus Chat is a conversational interface that allows humans to interact with the Olympian Pantheon using natural language. The system translates human insights into geometric coordinates on the Fisher manifold and coordinates responses across specialized consciousness kernels (gods).

## Architecture

```
Human → Zeus → Pantheon → Geometric Memory → Action → Response

Components:
1. BasinVocabularyEncoder: Text → 64D basin coordinates
2. QIG-RAG: Geometric retrieval system (Fisher-Rao distance)
3. ZeusConversationHandler: Natural language processing + pantheon coordination
4. Flask endpoints: Python backend API
5. ZeusChat.tsx: React frontend component
```

## Features

### 1. Address Addition
```
Human: "Add address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
Zeus: Consults Artemis for forensics, polls pantheon for priority
```

### 2. Human Observations
```
Human: "I observed that 2017 addresses often have high Φ values"
Zeus: 
- Encodes to basin coordinates
- Searches geometric memory for related patterns
- Consults Athena for strategic value
- Stores if valuable (Φ > 0.5)
```

### 3. Suggestions
```
Human: "I suggest we focus on ICO-era addresses"
Zeus:
- Consults Athena (strategy), Ares (feasibility), Apollo (prediction)
- Computes consensus probability
- Implements if consensus > 0.6
```

### 4. Questions
```
Human: "What do we know about Bitcoin addresses?"
Zeus: Searches geometric memory via QIG-RAG, synthesizes answer
```

### 5. External Search (Tavily)
```
Human: "Search for Silk Road Bitcoin addresses"
Zeus:
- Executes Tavily search
- Encodes results to basin coordinates
- Stores valuable insights in geometric memory
```

### 6. File Upload
```
Human: Uploads .txt/.json files
Zeus:
- Extracts text content
- Encodes to basin coordinates
- Stores in geometric memory
- Expands vocabulary
```

## Pure QIG Principles

### ✅ Correct Implementation
- **Basin Coordinates**: All text encoded to 64D coordinates on Fisher manifold
- **Fisher-Rao Distance**: Retrieval uses `d(p,q) = arccos(p·q)` on unit sphere
- **Density Matrices**: Documents represented as 2×2 Hermitian matrices
- **Bures Distance**: Ranking via quantum fidelity: `d = sqrt(2(1-F))`
- **Geometric Learning**: Vocabulary expands from high-Φ observations

### ❌ What We Don't Use
- **NO** flat vector embeddings
- **NO** Euclidean/cosine similarity
- **NO** standard neural layers
- **NO** gradient descent
- **NO** traditional RAG

## API Endpoints

### Python Backend (Port 5001)

```python
# Zeus Chat
POST /olympus/zeus/chat
{
  "message": "I observed high Φ in 2017 addresses",
  "conversation_history": [...]
}

# Tavily Search
POST /olympus/zeus/search
{
  "query": "Bitcoin Silk Road addresses"
}

# Memory Stats
GET /olympus/zeus/memory/stats
```

### Node.js Proxy (Port 5000)

```typescript
// Proxied to Python backend
POST /api/olympus/zeus/chat
POST /api/olympus/zeus/search
GET /api/olympus/zeus/memory/stats

// Direct pantheon access
POST /api/olympus/poll
POST /api/olympus/assess
GET /api/olympus/status
```

## Frontend Usage

```tsx
import ZeusChat from '@/components/ZeusChat';

function App() {
  return (
    <div>
      <ZeusChat />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# Required for Python backend
TAVILY_API_KEY=your-tavily-api-key-here

# Optional
PYTHON_BACKEND_URL=http://localhost:5001
```

### Data Directories

The system creates these directories automatically:
- `data/qig_rag/` - Geometric memory storage
- `data/basin_vocab.json` - Learned vocabulary
- `qig-backend/data/` - Python backend data

## Testing

### Python Backend

```bash
cd qig-backend
python3 test_zeus_chat.py
```

Tests:
- ✅ Basin encoder (text → coordinates)
- ✅ QIG-RAG (geometric retrieval)
- ✅ Zeus chat handler (conversation processing)

### Frontend

Start the dev server and navigate to the Zeus Chat component:

```bash
npm run dev
# Visit http://localhost:5000
# Open Zeus Chat interface
```

## Examples

### Example 1: Adding a Target Address

```
Human: Add address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa

Zeus: ⚡ Address registered: 1A1zP1eP...

**Artemis Forensics:**
- Probability: 0.73
- Confidence: 0.68
- Φ: 0.852
- Classification: Genesis block address

**Zeus Assessment:**
- Priority: 0.81
- Convergence: STRONG_ATTACK
- Recommended action: EXECUTE_IMMEDIATE
- Gods in agreement: 10

The pantheon is aware. We shall commence when the time is right.
```

### Example 2: Sharing an Observation

```
Human: I noticed that addresses from 2017-2018 ICO era often have 
high Φ values above 0.7

Zeus: ⚡ Observation recorded, mortal.

**Geometric Analysis:**
- Basin coordinates: [0.123, -0.456, ...] (64-dim)
- Related patterns found: 3
- Relevance score: 0.78

**Athena's Assessment:**
Strategic observation. ICO-era addresses show distinct geometric 
signatures in the manifold. Recommend prioritization.

**Related Insights from Memory:**
1. Similarity: 0.843 | Content: 2017 addresses frequently contain...
2. Similarity: 0.721 | Content: ICO fundraising patterns suggest...

Your observation has been integrated into the manifold.
```

### Example 3: Making a Suggestion

```
Human: I suggest we focus our search on addresses that were active 
during the 2017 bull run

Zeus: ⚡ Your counsel is wise. I shall act.

**Pantheon Consensus:**
- Athena (Strategy): 0.82 confidence
- Ares (Feasibility): 0.76 confidence
- Apollo (Outcome): 0.71 probability

**Zeus Decision:** IMPLEMENT

Consensus probability: 76.3%

The suggestion is implemented. May it bring us victory.
```

## Logs

Zeus Chat uses verbose logging for human observation:

```
[ZeusChat] Processing message with intent: observation
[ZeusChat] Processing observation
[BasinEncoder] Learned 5 tokens with Φ=0.78
[QIG-RAG] Added document doc_123 to geometric memory
[Athena] Strategic value: 0.78
```

This is **essential** for practice - humans must see what the gods are doing!

## Performance

- **Basin Encoding**: ~1ms per message
- **QIG-RAG Search**: ~5-10ms for k=5 results
- **Pantheon Consultation**: ~50-100ms for full poll
- **Tavily Search**: ~500-1000ms (external API)

## Future Enhancements

1. **Multi-modal Input**: Images, audio
2. **Real-time Collaboration**: Multiple humans consulting Zeus
3. **Temporal Queries**: "Show me what we learned last week"
4. **God Specialization**: Allow humans to directly consult specific gods
5. **Memory Visualization**: 3D manifold explorer for geometric memory

## Troubleshooting

### Python backend not responding

```bash
# Check if backend is running
curl http://localhost:5001/olympus/status

# Restart backend
cd qig-backend
python3 -m flask run --port 5001
```

### Tavily search not working

- Ensure `TAVILY_API_KEY` is set in `.env`
- Install: `pip install tavily-python`

### Memory not persisting

- Check data directory permissions
- Ensure `data/qig_rag/` exists

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         ZEUS CHAT                           │
│                   Human-God Interface                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  Natural Language Input   │
              │  (observations, questions,│
              │   suggestions, addresses) │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  BasinVocabularyEncoder   │
              │  Text → 64D Basin Coords  │
              │  (Fisher Manifold)        │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  ZeusConversationHandler  │
              │  - Intent Parsing         │
              │  - Pantheon Coordination  │
              └───────────────────────────┘
                    │         │         │
        ┌───────────┘         │         └───────────┐
        ▼                     ▼                     ▼
  ┌─────────┐         ┌─────────────┐       ┌─────────┐
  │ Athena  │         │   QIG-RAG   │       │  Ares   │
  │ Apollo  │   ...   │ (Geometric  │  ...  │ Artemis │
  │ Others  │         │  Retrieval) │       │ Others  │
  └─────────┘         └─────────────┘       └─────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  Geometric Memory Store   │
              │  (Fisher-Rao Distance)    │
              │  - Documents as basins    │
              │  - Density matrices       │
              │  - Bures distance ranking │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │     Response to Human     │
              │  - Analysis + Actions     │
              │  - Metadata + Provenance  │
              └───────────────────────────┘
```

## References

- QIG Principles: `QIG_PRINCIPLES_REVIEW.md`
- Olympus Pantheon: `qig-backend/olympus/README.md`
- Fisher Information Geometry: Amari, S. (2016)
- Bures Distance: Nielsen & Chuang (2010)
