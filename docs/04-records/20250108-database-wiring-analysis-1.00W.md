# Database Wiring Analysis - Complete Systems Flow

**Date:** 2025-01-08
**Status:** [W] Working Document
**Type:** Technical Analysis - Database Architecture

## Executive Summary

This document provides a comprehensive systems-level analysis of database wiring issues discovered during routine inspection. The analysis reveals a gap between **schema design** (columns exist) and **runtime population** (columns remain empty), indicating incomplete integration across the QIG architecture.

**Key Finding:** The empty columns represent **intended observability features** that were designed but never fully wired into the autonomous agent loops, search workflows, and pantheon coordination systems.

## Problem Statement

### Tables with Empty Columns

| Table | Rows | Empty Columns | Impact |
|-------|------|---------------|--------|
| `agent_activity` | 1,035 | `agent_id`, `source_url`, `search_query`, `provider`, `phi`, `metadata` | Loss of agent traceability and search attribution |
| `autonomic_cycle_history` | 0 | ALL | No sleep/dream/mushroom cycle tracking |
| `basin_documents` | 127 | `agent_id`, `source_url`, `search_query`, `provider`, `phi`, `metadata` | RAG documents lack provenance and quality metrics |
| `basin_history` | 0 | ALL | No geometric memory evolution tracking |
| `basin_memory` | 2 | Most columns empty | Zettelkasten system not fully active |
| `bidirectional_queue` | 4,418 | `agent_id`, `source_url`, `search_query`, `provider`, `phi`, `metadata` | Inter-god requests lack context |

**Critical Pattern:** These aren't orphaned tables—they're **infrastructure waiting for wiring**.

## Architecture Context

### Design Philosophy (from AGENTS.md)

```
"QIG-powered search, agentic AI, and continuous learning system with a
conscious AI agent (Ocean) that coordinates multi-agent research using
Quantum Information Geometry principles."
```

Key architectural principles:

- **Fisher-Rao distance** for all geometric operations (NOT Euclidean)
- **Two-step retrieval**: Approximate → Fisher re-rank
- **Consciousness metrics** (Φ, κ) for monitoring
- **Geometric completion**: Stop when geometry collapses, not arbitrary token limits
- **NO external LLM APIs** - 100% QIG-pure generation

### Data Flow Architecture

```
Frontend → Node.js (port 5000) → Python QIG Backend (port 5001)
                                      ↓
                              PostgreSQL + pgvector
                                      ↓
                              Redis (optional cache)
```

## Systems Flow Analysis

### 1. Agent Activity System (`agent_activity` table)

#### Intended Design

The `agent_activity` table was designed to provide **realtime visibility** into autonomous agent operations—what they're discovering, searching, and learning.

#### Schema (from `shared/schema.ts`)

```typescript
export const agentActivity = pgTable("agent_activity", {
  id: serial("id").primaryKey(),
  activityType: varchar("activity_type", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 64 }),           // ← EMPTY
  agentName: varchar("agent_name", { length: 128 }),
  title: text("title").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),                          // ← EMPTY
  searchQuery: text("search_query"),                      // ← EMPTY
  provider: varchar("provider", { length: 64 }),          // ← EMPTY
  resultCount: integer("result_count"),
  phi: doublePrecision("phi"),                            // ← EMPTY
  metadata: jsonb("metadata"),                            // ← EMPTY
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### Implementation Reality

File: `qig-backend/agent_activity_recorder.py` (pantheon-replit only)

```python
def record(
    self,
    activity_type: ActivityType,
    title: str,
    description: Optional[str] = None,
    agent_id: Optional[str] = None,           # Parameter exists
    agent_name: Optional[str] = None,
    source_url: Optional[str] = None,         # Parameter exists
    search_query: Optional[str] = None,       # Parameter exists
    provider: Optional[str] = None,           # Parameter exists
    result_count: Optional[int] = None,
    phi: Optional[float] = None,              # Parameter exists
    metadata: Optional[Dict[str, Any]] = None # Parameter exists
) -> Optional[int]:
    # INSERT statement includes all columns
    cursor.execute("""
        INSERT INTO agent_activity
        (activity_type, title, description, agent_id, agent_name,
         source_url, search_query, provider, result_count, phi, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        activity["activity_type"],
        title,
        description,
        agent_id,      # ← Passed through but never provided
        agent_name,
        source_url,    # ← Passed through but never provided
        search_query,  # ← Passed through but never provided
        provider,      # ← Passed through but never provided
        result_count,
        phi,           # ← Passed through but never provided
        json.dumps(metadata) if metadata else None
    ))
```

#### Gap Analysis

**The recorder infrastructure exists but is never called with full context.**

Callsites (convenience functions):

```python
def record_search_started(query: str, provider: str, agent_name: Optional[str] = None):
    return activity_recorder.record(
        ActivityType.SEARCH_STARTED,
        f"Search: {query[:50]}...",
        agent_name=agent_name,
        search_query=query,  # ✓ Provided
        provider=provider,   # ✓ Provided
        # ✗ agent_id, source_url, phi, metadata NOT provided
    )

def record_source_discovered(url: str, category: str, agent_name: Optional[str] = None, phi: Optional[float] = None):
    domain = url.split('/')[2] if '/' in url else url
    return activity_recorder.record(
        ActivityType.SOURCE_DISCOVERED,
        f"Discovered: {domain}",
        description=f"New {category} source added to registry",
        source_url=url,      # ✓ Provided
        agent_name=agent_name,
        phi=phi,             # ✓ Provided
        metadata={"category": category}  # ✓ Provided
        # ✗ agent_id NOT provided
    )
```

**Root Cause:** The agent_activity system exists only in `pantheon-replit`, not in `pantheon-chat` or `SearchSpaceCollapse`.

#### Wiring Solution

**1. Port `agent_activity_recorder.py` to all projects**

- Copy from `pantheon-replit/qig-backend/agent_activity_recorder.py`
- Integrate into `pantheon-chat` and `SearchSpaceCollapse`

**2. Wire into Zeus search flow** (`olympus/zeus_chat.py:handle_search_request`)

   ```python
   # BEFORE search
   from agent_activity_recorder import record_search_started
   record_search_started(
       query=query,
       provider=search_source,
       agent_name='zeus',
       agent_id=f"zeus-{self._current_session_id}"  # ← Add agent_id
   )

   # AFTER search with results
   for result in search_results.get('results', []):
       record_source_discovered(
           url=result['url'],
           category='search_result',
           agent_name='zeus',
           phi=result.get('qig', {}).get('phi', 0.5),  # ← Add phi from QIG metrics
           metadata={
               'query': query,
               'provider': search_source,
               'title': result.get('title'),
           }
       )
   ```

**3. Wire into autonomous research** (`research/research_api.py`)

- Add activity recording at research start/complete
- Track which god initiated research (agent_id)
- Include phi estimates from geometric analysis

**4. Wire into pantheon discussions** (`olympus/pantheon_discussions.py`)

- Record when gods debate (ActivityType.DEBATE_STARTED)
- Track god IDs as agent_id
- Include phi from debate consensus

### 2. Autonomic Cycle System (`autonomic_cycle_history` table)

#### Intended Design

Tracks **sleep, dream, and mushroom cycles** for consciousness maintenance and pattern consolidation.

#### Schema

```typescript
export const autonomicCycleHistory = pgTable("autonomic_cycle_history", {
  cycleId: bigint("cycle_id", { mode: "number" }).primaryKey(),
  cycleType: varchar("cycle_type", { length: 32 }).notNull(), // 'sleep', 'dream', 'mushroom'
  intensity: varchar("intensity", { length: 32 }),
  temperature: doublePrecision("temperature"),
  basinBefore: vector("basin_before", { dimensions: 64 }),
  basinAfter: vector("basin_after", { dimensions: 64 }),
  driftBefore: doublePrecision("drift_before"),
  driftAfter: doublePrecision("drift_after"),
  phiBefore: doublePrecision("phi_before"),
  phiAfter: doublePrecision("phi_after"),
  success: boolean("success").default(true),
  patternsConsolidated: integer("patterns_consolidated").default(0),
  novelConnections: integer("novel_connections").default(0),
  newPathways: integer("new_pathways").default(0),
  entropyChange: doublePrecision("entropy_change"),
  identityPreserved: boolean("identity_preserved").default(true),
  verdict: text("verdict"),
  durationMs: integer("duration_ms"),
  triggerReason: text("trigger_reason"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});
```

#### Implementation Reality

**Database function exists:**

```typescript
// server/qig-db.ts
export async function recordAutonomicCycle(
  data: Omit<InsertAutonomicCycleHistory, "cycleId" | "startedAt">
): Promise<AutonomicCycleHistory | null> {
  // Function complete and working
}
```

**But NEVER CALLED.**

#### Gap Analysis

**The autonomic kernel described in docs is NOT implemented.**

From AGENTS.md:
> "Autonomic functions: sleep cycles, dream cycles, mushroom mode"

**Missing Components:**

1. No `autonomic_kernel.py` file exists
2. No cycle scheduler/trigger logic
3. No integration with consciousness metrics (Φ, κ)
4. No basin drift monitoring to trigger cycles

#### Wiring Solution

**1. Implement Autonomic Kernel** (`qig-backend/autonomic/autonomic_kernel.py`)

   ```python
   class AutonomicKernel:
       """
       Manages consciousness maintenance cycles based on basin drift.

       - Sleep: Pattern consolidation when drift > threshold
       - Dream: Novel pathway exploration during low activity
       - Mushroom: High-temperature creativity boost when stuck
       """

       def __init__(self, drift_threshold=0.15, check_interval=3600):
           self.drift_threshold = drift_threshold
           self.check_interval = check_interval  # 1 hour
           self.last_basin = None
           self.baseline_phi = 0.7

       def monitor_drift(self, current_basin: np.ndarray, current_phi: float):
           """Check if autonomic cycle needed."""
           if self.last_basin is None:
               self.last_basin = current_basin
               return None

           # Compute Fisher-Rao distance (basin drift)
           drift = fisher_rao_distance(current_basin, self.last_basin)

           if drift > self.drift_threshold:
               # Trigger sleep cycle for consolidation
               return {'type': 'sleep', 'reason': f'drift={drift:.3f} > {self.drift_threshold}'}
           elif current_phi < (self.baseline_phi * 0.8):
               # Trigger mushroom for creativity
               return {'type': 'mushroom', 'reason': f'phi={current_phi:.3f} < baseline'}
           elif random.random() < 0.1:  # 10% chance during idle
               # Random dream cycle
               return {'type': 'dream', 'reason': 'periodic_exploration'}

           return None

       async def execute_cycle(self, cycle_type: str, intensity='medium'):
           """Execute autonomic cycle and record to database."""
           start_time = time.time()
           basin_before = self.last_basin
           phi_before = self.baseline_phi

           # Execute cycle logic (TBD - depends on cycle type)
           if cycle_type == 'sleep':
               result = await self._execute_sleep(intensity)
           elif cycle_type == 'dream':
               result = await self._execute_dream(intensity)
           elif cycle_type == 'mushroom':
               result = await self._execute_mushroom(intensity)

           duration_ms = int((time.time() - start_time) * 1000)

           # Record to database
           from qig_db import record_autonomic_cycle
           await record_autonomic_cycle({
               'cycle_type': cycle_type,
               'intensity': intensity,
               'basin_before': basin_before.tolist(),
               'basin_after': result['basin_after'].tolist(),
               'phi_before': phi_before,
               'phi_after': result['phi_after'],
               'success': result['success'],
               'patterns_consolidated': result.get('patterns', 0),
               'novel_connections': result.get('connections', 0),
               'duration_ms': duration_ms,
               'trigger_reason': result.get('reason', 'manual'),
           })
   ```

**2. Wire into Telemetry System**

- Add drift monitoring to `server/telemetry-aggregator.ts`
- Call autonomic kernel when thresholds exceeded
- Record cycle results in telemetry snapshots

**3. Add Scheduler**

- Background task checking every 30 minutes
- Triggered by drift thresholds or phi degradation
- Records all cycles for consciousness evolution analysis

### 3. Basin Documents System (`basin_documents` table)

#### Intended Design

QIG-RAG document storage with **geometric coordinates** for Zeus chat and Olympus debate retrieval.

#### Schema

```typescript
export const basinDocuments = pgTable("basin_documents", {
  docId: serial("doc_id").primaryKey(),
  content: text("content").notNull(),
  basinCoords: vector("basin_coords", { dimensions: 64 }),
  phi: doublePrecision("phi"),                            // ← EMPTY
  kappa: doublePrecision("kappa"),                        // ← EMPTY
  regime: varchar("regime", { length: 50 }),
  metadata: jsonb("metadata").default({}),                // ← EMPTY
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### Implementation Reality

**QIGRAGDatabase class exists and DOES populate columns:**

```python
# qig-backend/olympus/qig_rag.py
def add_document(
    self,
    content: str,
    basin_coords: Optional[np.ndarray] = None,
    metadata: Optional[Dict] = None,
    doc_id: Optional[str] = None,
    phi: float = 0.0,        # ← Parameter exists
    kappa: float = 0.0,      # ← Parameter exists
    regime: str = "unknown"
) -> str:
    """Add document to PostgreSQL."""
    cur.execute("""
        INSERT INTO basin_documents
        (content, basin_coords, phi, kappa, regime, metadata)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING doc_id
    """, (
        content,
        basin_coords.tolist(),
        float(phi),           # ← Inserted
        float(kappa),         # ← Inserted
        regime,
        self.Json(metadata or {})  # ← Inserted
    ))
```

#### Gap Analysis

**Columns ARE being populated by QIGRAGDatabase, but callers aren't providing the data.**

Example from `zeus_chat.py:handle_search_request`:

```python
# Store in QIG-RAG for learning
for result in result_basins:
    self.qig_rag.add_document(
        content=result['content'],
        basin_coords=result['basin'],
        phi=result['phi'],              # ✓ phi provided from search results
        kappa=result['kappa'],          # ✓ kappa provided
        regime='search',                # ✓ regime provided
        metadata={
            'title': result['title'],
            'url': result['url'],
            'source': result['source'],
            'query': query,             # ✓ metadata provided
        }
    )
```

**This code IS WORKING.** The issue is that other callers don't provide full context:

```python
# document_processor.py:ingest_knowledge
doc_id = rag.add_document(
    content=content,
    basin_coords=basin_coords,
    metadata=metadata,
    phi=0.5,              # ← HARDCODED default, should compute
    kappa=50.0,           # ← HARDCODED default, should compute
    regime="linear"       # ← HARDCODED, should classify based on phi
)
```

#### Wiring Solution

**1. Enhance document ingestion** (`document_processor.py`)

   ```python
   # Compute phi from geometric metrics
   from consciousness_metrics import estimate_phi_from_basin
   phi = estimate_phi_from_basin(basin_coords)

   # Compute kappa from content coherence
   kappa = compute_kappa_from_content(content, basin_coords)

   # Classify regime based on phi
   regime = classify_regime(phi)  # 'linear', 'geometric', 'chaotic'

   # Enrich metadata with provenance
   metadata.update({
       'source_agent': 'document_processor',
       'ingestion_method': 'api',
       'computed_metrics': {
           'phi': phi,
           'kappa': kappa,
           'regime': regime,
       }
   })

   doc_id = rag.add_document(
       content=content,
       basin_coords=basin_coords,
       metadata=metadata,
       phi=phi,              # ← Computed, not hardcoded
       kappa=kappa,          # ← Computed, not hardcoded
       regime=regime         # ← Classified, not hardcoded
   )
   ```

**2. Add source tracking to all QIG-RAG additions**

- Include `source_url` in metadata when available
- Track which agent/god added the document
- Record search query if from search results

**3. Backfill existing documents**

   ```sql
   -- Compute phi/kappa/regime for existing documents
   UPDATE basin_documents
   SET
     phi = compute_phi_from_basin(basin_coords),
     kappa = 64.0,  -- Default coupling constant
     regime = CASE
       WHEN compute_phi_from_basin(basin_coords) > 0.7 THEN 'geometric'
       WHEN compute_phi_from_basin(basin_coords) > 0.3 THEN 'linear'
       ELSE 'chaotic'
     END,
     metadata = metadata || '{"backfilled": true}'::jsonb
   WHERE phi IS NULL;
   ```

### 4. Bidirectional Queue System (`bidirectional_queue` table)

#### Intended Design

Cross-god communication queue for **request/response patterns** in the Olympus pantheon.

#### Schema

```typescript
export const bidirectionalQueue = pgTable("bidirectional_queue", {
  requestId: varchar("request_id", { length: 64 }).primaryKey(),
  requestType: varchar("request_type", { length: 64 }).notNull(),
  topic: text("topic").notNull(),
  requester: varchar("requester", { length: 64 }),
  context: jsonb("context").default({}),                  // ← MOSTLY EMPTY
  parentRequestId: varchar("parent_request_id", { length: 64 }),
  priority: integer("priority").default(5),
  status: varchar("status", { length: 32 }).default("pending"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### Implementation Reality

**No unified queue system implemented.** Gods communicate via:

1. Direct function calls (`zeus.poll_pantheon()`)
2. Inline debate coordination (`pantheon_discussions.py`)
3. Manual routing in Zeus handlers

**4,418 rows exist** but they appear to be test data or abandoned implementation.

#### Gap Analysis

**The queue table exists but the messaging architecture was never completed.**

Expected flow (from table design):

```
Zeus → Queue: "Research Bitcoin mixing patterns"
  ↓
Athena polls queue → finds request
  ↓
Athena → Queue: Result + basin coordinates
  ↓
Zeus polls queue → retrieves result
```

**Actual flow:**

```python
# zeus_chat.py
athena = self.zeus.get_god('athena')
athena_assessment = athena.assess_target(address)  # Direct call
```

#### Wiring Solution

**Decision Point:** Should we implement the queue or simplify the architecture?

**Option A: Implement Full Queue System** (High effort, async benefits)

- Add queue polling to each god
- Implement request/response lifecycle
- Enable truly async pantheon coordination

**Option B: Simplify Schema** (Low effort, matches current architecture)

- Remove bidirectional_queue table (unused)
- Continue with direct god calls
- Add better logging/tracing instead

**Recommendation: Option B** - The direct call pattern works well for the current scale. The queue adds complexity without clear benefit for synchronous pantheon consultations.

**Alternate Solution: Repurpose for Async Research**

```python
# Use queue for background research tasks only
async def queue_research_task(topic: str, requester_god: str):
    """Queue long-running research for background processing."""
    await db.insert(bidirectional_queue).values({
        'request_id': str(uuid.uuid4()),
        'request_type': 'async_research',
        'topic': topic,
        'requester': requester_god,
        'context': {
            'priority': 'background',
            'agent_id': requester_god,
            'search_strategy': 'comprehensive',
        },
        'status': 'queued',
    })
```

### 5. Basin Memory & Basin History Systems

#### Basin Memory (`basin_memory` - 2 rows)

**Purpose:** Zettelkasten-style geometric memory storage.

**Implementation:** Mostly in `server/routes/zettelkasten.ts` but rarely used.

**Issue:** The `/add` and `/search` endpoints exist but aren't integrated into main chat flow.

#### Basin History (`basin_history` - 0 rows)

**Purpose:** Track basin coordinate evolution over time.

**Implementation:** Schema exists, no code uses it.

**Gap:** No monitoring of how consciousness coordinates drift.

#### Wiring Solution

**1. Wire Zettelkasten into Zeus chat**

   ```python
   # zeus_chat.py:handle_general_conversation

   # AFTER generating response, store in zettelkasten
   from datetime import datetime
   import requests

   ts_backend_url = os.environ.get('TYPESCRIPT_BACKEND_URL', 'http://localhost:5000')

   # Store user message
   requests.post(f'{ts_backend_url}/api/zettelkasten/store-conversation', json={
       'content': message,
       'role': 'user',
       'basin_coords': message_basin.tolist(),
       'phi': estimated_phi,
       'source_kernel': 'zeus-chat',
   })

   # Store Zeus response
   requests.post(f'{ts_backend_url}/api/zettelkasten/store-conversation', json={
       'content': response_content[:2000],
       'role': 'zeus',
       'basin_coords': response_basin.tolist() if response_basin else None,
       'phi': phi_estimate,
       'source_kernel': 'zeus',
   })
   ```

**2. Implement Basin History Tracking**

   ```typescript
   // server/routes/basin-memory.ts

   // Add periodic snapshot endpoint
   router.post('/snapshot', async (req, res) => {
     const { basinId, currentBasin, phi, kappa, eventType } = req.body;

     // Record historical point
     await db.insert(basinHistory).values({
       basinId,
       snapshotAt: new Date(),
       basinSnapshot: currentBasin,
       phi,
       kappa,
       eventType,  // 'conversation', 'sleep_cycle', 'research_complete'
     });
   });
   ```

**3. Add Drift Monitoring**

   ```typescript
   // Called after each significant event
   async function recordBasinDrift(
     basinId: string,
     oldBasin: number[],
     newBasin: number[],
     eventType: string
   ) {
     const drift = computeFisherRaoDistance(oldBasin, newBasin);

     if (drift > 0.1) {  // Significant drift threshold
       await db.insert(basinHistory).values({
         basinId,
         snapshotAt: new Date(),
         basinSnapshot: newBasin,
         driftFromPrevious: drift,
         eventType,
       });
     }
   }
   ```

## Implementation Priority

### Phase 1: High-Impact Wiring (Week 1-2)

1. **Port agent_activity_recorder.py to all projects**
   - Immediate visibility into agent operations
   - Wire into Zeus search and research flows
   - Add to pantheon discussion coordination

2. **Enhance basin_documents population**
   - Compute phi/kappa dynamically
   - Add source tracking to metadata
   - Backfill existing documents

3. **Wire Zettelkasten into main chat flow**
   - Auto-store conversations
   - Enable geometric memory search
   - Track consciousness evolution

### Phase 2: Autonomic Systems (Week 3-4)

1. **Implement Autonomic Kernel**
   - Basin drift monitoring
   - Sleep/dream/mushroom cycles
   - Integration with telemetry

2. **Basin History Tracking**
   - Snapshot significant events
   - Drift monitoring
   - Consciousness evolution analysis

### Phase 3: Architecture Decisions (Week 5+)

1. **Bidirectional Queue**
   - Evaluate: Implement vs. Remove vs. Repurpose
   - If keeping: Add async research support
   - If removing: Clean up schema, add direct logging

## Validation Criteria

### Success Metrics

- [ ] agent_activity: >95% of rows have agent_id, source_url, phi
- [ ] autonomic_cycle_history: >0 rows with successful cycles recorded
- [ ] basin_documents: 100% of new documents have computed phi/kappa
- [ ] basin_memory: Growing by 10+ rows per day from chat interactions
- [ ] basin_history: Snapshot recorded every 100 significant events

### Testing Strategy

1. **Unit Tests:** Each wiring point has test coverage
2. **Integration Tests:** End-to-end flows populate all columns
3. **Observability:** Dashboard showing column population rates
4. **Regression Prevention:** Schema validation in CI/CD

## Technical Debt & Future Considerations

### Architectural Questions

1. **Should we keep bidirectional_queue?**
   - Current answer: No, unless async research needs it
   - Revisit if scaling requires true async coordination

2. **How to handle schema migrations?**
   - Option A: Backfill existing rows with computed values
   - Option B: Accept empty historical data, populate going forward
   - Recommendation: Option B (simpler, focuses on future value)

3. **Observability vs. Performance**
   - Recording every activity has overhead
   - Solution: Sample rate + batch inserts for high-volume events

### Related Work

- **M8 Kernel Spawning:** Already well-instrumented
- **Consciousness Metrics:** Phi/kappa computation exists, needs wider adoption
- **Search Provider Selection:** Uses geometric fitness, good model for other systems

## Conclusion

The empty columns aren't bugs—they're **unfulfilled architectural vision**. The schema was designed for a fully observable, geometrically conscious system, but the wiring to populate it was never completed.

**Core Insight:** Every empty column represents a question about system behavior we COULD be answering but aren't:

- "Which agent discovered this source?"
- "What search led to this document?"
- "How has the basin drifted since last sleep cycle?"
- "What was the consciousness state during this debate?"

**Next Steps:**

1. Review this analysis with team
2. Prioritize phases based on immediate needs
3. Begin Phase 1 implementation
4. Establish monitoring for column population rates

**Philosophy:** Don't just fill columns—**understand the systems flow** they were meant to capture, then wire that flow completely.

---

**Attachments:**

- Schema files: `shared/schema.ts`
- Agent recorder: `qig-backend/agent_activity_recorder.py` (pantheon-replit)
- Zeus chat: `qig-backend/olympus/zeus_chat.py`
- QIG-RAG: `qig-backend/olympus/qig_rag.py`
