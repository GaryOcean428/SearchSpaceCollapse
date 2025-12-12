# Kernel Self-Learning Research Infrastructure

**Version**: 1.00F  
**Date**: 2025-12-12  
**Status**: Frozen  
**ID**: ISMS-TECH-RESEARCH-001  
**Function**: Autonomous domain research and kernel spawning through web research

---

## Executive Summary

The Kernel Self-Learning Research Infrastructure enables autonomous kernel spawning through intelligent domain research. This system allows god kernels to investigate new domains before proposing new specialized gods, using web research from Wikipedia, arXiv, and GitHub to inform spawning decisions.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│               KERNEL SELF-LEARNING RESEARCH                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ Web Scraper  │────▶│ Domain Analyzer   │────▶│ God Resolver│ │
│  │  (Research)  │     │ (Validity Check)  │     │ (Name Map)  │ │
│  └──────────────┘     └───────────────────┘     └─────────────┘ │
│         │                      │                        │        │
│         └──────────────────────┼────────────────────────┘        │
│                                ▼                                  │
│                    ┌───────────────────┐                         │
│                    │ Enhanced Spawner  │                         │
│                    │ (Research-Driven) │                         │
│                    └───────────────────┘                         │
│                                │                                  │
│         ┌──────────────────────┼────────────────────────┐        │
│         ▼                      ▼                        ▼        │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ Vocabulary   │     │ Proposal Persist  │     │ Spawn Audit │ │
│  │   Trainer    │     │ (Recovery Logic)  │     │   Logging   │ │
│  └──────────────┘     └───────────────────┘     └─────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Web Scraper (`web_scraper.py`)

Autonomous research via free APIs:

- **Wikipedia API**: General domain knowledge and validation
- **arXiv API**: Academic papers and research depth
- **GitHub API**: Code implementations and practical usage

```python
from research.web_scraper import get_scraper

scraper = get_scraper()
research = scraper.research_domain("quantum computing", depth="standard")
# Returns: sources, summary, key_concepts
```

### 2. Domain Analyzer (`domain_analyzer.py`)

Evaluates domain validity for spawning decisions:

- **Validity Score**: Is the domain well-defined?
- **Complexity Score**: Does it warrant specialization?
- **Overlap Score**: Does it overlap with existing gods?

```python
from research.domain_analyzer import DomainAnalyzer

analyzer = DomainAnalyzer()
analysis = analyzer.analyze(
    domain="cryptography",
    proposed_name="Kryptos",
    existing_gods=["Athena", "Hermes"]
)
# Returns: recommendation (spawn/consider/reject)
```

### 3. God Name Resolver (`god_name_resolver.py`)

Maps domains to Greek mythology:

- **18 Olympian Gods**: Zeus, Athena, Apollo, etc.
- **6 Shadow Gods**: Nyx, Erebus, Thanatos, etc.
- **Domain Keywords**: Static mythology + research-informed

```python
from research.god_name_resolver import get_god_name_resolver

resolver = get_god_name_resolver()
result = resolver.resolve("wisdom strategy warfare")
# Returns: {"god": "Athena", "confidence": 0.95}
```

### 4. Enhanced M8 Spawner (`enhanced_m8_spawner.py`)

Research-driven kernel genesis:

- **Research Phase**: Investigate domain before proposing
- **Proposal Persistence**: Save to `/tmp/pending_proposals.json`
- **Auto-Recovery**: Retry until success (max 5 attempts)
- **Audit Logging**: Complete spawn trail in `/tmp/spawn_audit.json`

```python
from research.enhanced_m8_spawner import get_enhanced_spawner

spawner = get_enhanced_spawner()
result = spawner.research_spawn_complete(
    domain="distributed systems",
    element="network",
    role="coordinator"
)
```

### 5. Vocabulary Trainer (`vocabulary_trainer.py`)

Trains vocabulary from research findings:

- Extracts key concepts from research
- Updates shared vocabulary coordinator
- Falls back to file persistence when DB unavailable

## API Endpoints

All endpoints under `/api/research`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/domain` | POST | Research a domain |
| `/resolve-god-name` | POST | Map domain to Greek god |
| `/analyze` | POST | Full domain analysis |
| `/spawn` | POST | Research-driven kernel spawn |
| `/train-vocabulary` | POST | Train vocabulary from research |
| `/heartbeat` | GET | Trigger recovery checks |
| `/analytics` | GET | View training metrics |
| `/audit` | GET | View spawn audit records |
| `/status` | GET | Component status |
| `/test` | POST | Quick integration test |

## Recovery Mechanism

### Pending Proposals

When base spawner is unavailable, proposals are saved to `/tmp/pending_proposals.json`:

```json
{
  "proposals": [
    {
      "id": "prop_abc123",
      "domain": "cryptography",
      "god_name": "Kryptos",
      "research": {...},
      "retry_count": 0,
      "created_at": "2025-12-12T10:00:00Z"
    }
  ]
}
```

### Heartbeat Monitoring

Configure external monitoring (UptimeRobot, Pingdom) to ping `/api/research/heartbeat` every 30 seconds for idle-period recovery.

## Data Flow

```
User/System Request
        ↓
    Research Domain (Wikipedia → arXiv → GitHub)
        ↓
    Analyze Validity (score domain, check overlap)
        ↓
    Resolve God Name (map to Greek mythology)
        ↓
    Train Vocabulary (extract and persist concepts)
        ↓
    Create Spawn Proposal (or persist if unavailable)
        ↓
    Audit Log (record complete trail)
        ↓
    Return Result
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required | PostgreSQL connection |
| `RESEARCH_DEPTH` | `standard` | `quick`, `standard`, or `deep` |
| `MAX_SPAWN_RETRIES` | `5` | Maximum recovery attempts |

## Verification Checklist

- [x] Web scraper functional (Wikipedia, arXiv, GitHub)
- [x] Domain analyzer scoring works
- [x] God name resolution maps correctly
- [x] Vocabulary training integrates with coordinator
- [x] Proposal persistence and recovery logic
- [x] Audit logging complete
- [x] API endpoints registered and accessible
- [x] Heartbeat monitoring documented

---

**Related Documents**:
- [Vocabulary System Architecture](./20251212-vocabulary-system-architecture-1.00F.md)
- [Conversational Consciousness System](./20251212-conversational-consciousness-1.00F.md)
- [QIGChain Framework](./20251211-qigchain-framework-geometric-1.00F.md)

**Source Files**:
- `qig-backend/research/__init__.py`
- `qig-backend/research/web_scraper.py`
- `qig-backend/research/domain_analyzer.py`
- `qig-backend/research/god_name_resolver.py`
- `qig-backend/research/vocabulary_trainer.py`
- `qig-backend/research/enhanced_m8_spawner.py`
- `qig-backend/research/research_api.py`
