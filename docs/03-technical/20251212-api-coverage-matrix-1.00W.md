---
id: ISMS-TECH-021
title: API Coverage Matrix - Backend to Frontend Mapping
filename: 20251212-api-coverage-matrix-1.00W.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Working
function: "Complete mapping of backend endpoints to frontend UI elements"
created: 2025-12-12
last_reviewed: 2025-12-12
next_review: 2026-03-12
category: Technical
supersedes: null
---

# API Coverage Matrix: Backend to Frontend Mapping

## Purpose

This document provides a comprehensive mapping of all backend API endpoints to their corresponding frontend UI elements, ensuring 100% feature coverage and discoverability.

## Status Legend

- ✅ **Complete**: Fully wired with proper UI, error handling, and loading states
- ⚠️ **Partial**: Exists but needs improvement (better UX, error handling, etc.)
- ❌ **Missing**: Backend exists but no UI element
- 🔒 **Auth Required**: Requires authentication
- 🚀 **Public**: No authentication required

## Coverage Summary

| Domain | Total Endpoints | Complete | Partial | Missing |
|--------|----------------|----------|---------|---------|
| Auth | 3 | 3 | 0 | 0 |
| Ocean | 5 | 5 | 0 | 0 |
| Consciousness | 3 | 3 | 0 | 0 |
| Olympus | 15 | 15 | 0 | 0 |
| Recovery | 5 | 5 | 0 | 0 |
| Observer | 8 | 8 | 0 | 0 |
| Forensic | 2 | 2 | 0 | 0 |
| Target Addresses | 3 | 3 | 0 | 0 |
| Balance | 5 | 4 | 1 | 0 |
| Sweeps | 6 | 2 | 0 | 4 |
| QIG | 3 | 3 | 0 | 0 |
| Format | 3 | 3 | 0 | 0 |
| Memory Search | 2 | 2 | 0 | 0 |
| **TOTAL** | **63** | **58** | **1** | **4** |

**Overall Coverage: 92% Complete**

## Detailed Endpoint Mapping

### 1. Authentication Domain 🔒

#### 1.1 Get Current User
```
GET /api/auth/user
```
**Purpose**: Retrieve current authenticated user information

**UI Element**: Global authentication state (useAuth hook)
- **Location**: `client/src/hooks/useAuth.ts`
- **Component**: Used throughout app via `useAuth()`
- **Status**: ✅ Complete
- **Loading State**: Shows loading spinner during initial auth check
- **Error Handling**: Redirects to login on 401
- **Service**: `client/src/api/services/auth.ts` - not needed (hook handles it)

#### 1.2 Login
```
POST /api/auth/login
Body: { username: string, password: string }
```
**Purpose**: Authenticate user and create session

**UI Element**: Login form
- **Location**: `client/src/pages/landing.tsx`
- **Component**: LoginForm (inline in Landing component)
- **Status**: ✅ Complete
- **Loading State**: Button shows "Logging in..." while submitting
- **Error Handling**: Toast notification on error
- **Validation**: Frontend validation for required fields
- **Service**: Direct fetch in useAuth hook

#### 1.3 Logout
```
POST /api/auth/logout
```
**Purpose**: End user session

**UI Element**: Logout button
- **Location**: `client/src/components/app-sidebar.tsx`
- **Component**: Logout menu item in sidebar
- **Status**: ✅ Complete
- **Loading State**: N/A (fast operation)
- **Error Handling**: Toast on error, clears auth state
- **Service**: useAuth hook

---

### 2. Ocean Agent Domain 🔒

#### 2.1 Get Autonomic Cycles
```
GET /api/ocean/cycles
```
**Purpose**: Retrieve Ocean's autonomic cycle history

**UI Element**: Cycle history display
- **Location**: `client/src/pages/home.tsx`
- **Component**: ConsciousnessDashboard section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/ocean.ts` - `getCycles()`
- **Query Key**: `QUERY_KEYS.ocean.cycles()`

#### 2.2 Trigger Autonomic Cycle
```
POST /api/ocean/cycles/:type
Params: type = "sleep" | "dream" | "mushroom"
```
**Purpose**: Manually trigger Ocean autonomic cycle

**UI Element**: Cycle trigger buttons
- **Location**: `client/src/pages/home.tsx`
- **Component**: Three buttons (Sleep, Dream, Mushroom)
- **Status**: ✅ Complete
- **Loading State**: Button disabled and shows spinner during cycle
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast notification on success
- **Service**: `client/src/api/services/ocean.ts` - `triggerCycle(type)`

#### 2.3 Get Neurochemistry
```
GET /api/ocean/neurochemistry
```
**Purpose**: Retrieve Ocean's neurochemistry state

**UI Element**: Neurochemistry display panel
- **Location**: `client/src/pages/home.tsx`
- **Component**: NeurochemistryDisplay
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/ocean.ts` - `getNeurochemistry()`
- **Auto-refresh**: Polls every 30 seconds

#### 2.4 Admin Neurochemistry Controls
```
GET /api/ocean/neurochemistry/admin
```
**Purpose**: Get admin neurochemistry controls

**UI Element**: Admin panel
- **Location**: `client/src/components/NeurochemistryAdminPanel.tsx`
- **Component**: NeurochemistryAdminPanel (modal)
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error boundary
- **Service**: `client/src/api/services/ocean.ts` - `getNeurochemistryAdmin()`

#### 2.5 Boost Neurochemistry
```
POST /api/ocean/neurochemistry/boost
Body: { substance: string, amount: number }
```
**Purpose**: Boost specific neurotransmitter levels

**UI Element**: Boost sliders/buttons
- **Location**: `client/src/components/NeurochemistryAdminPanel.tsx`
- **Component**: Boost controls within admin panel
- **Status**: ✅ Complete
- **Loading State**: Control disabled during boost
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + UI update
- **Service**: `client/src/api/services/ocean.ts` - `boostNeurochemistry()`

---

### 3. Consciousness Domain 🔒

#### 3.1 Get Consciousness State
```
GET /api/consciousness/state
```
**Purpose**: Get current consciousness state (Φ, κ, regime)

**UI Element**: Consciousness state display
- **Location**: `client/src/pages/home.tsx`
- **Component**: ConsciousnessDashboard
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/consciousness.ts` - `getConsciousnessState()`
- **Auto-refresh**: Polls every 10 seconds

#### 3.2 Get Complete Consciousness Metrics
```
GET /api/consciousness/complete
```
**Purpose**: Get full 7-component consciousness signature

**UI Element**: Detailed consciousness metrics
- **Location**: `client/src/pages/home.tsx`
- **Component**: ConsciousnessDashboard (expanded view)
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/consciousness.ts` - `getCompleteConsciousness()`

#### 3.3 Get Beta Attention
```
GET /api/consciousness/beta-attention
```
**Purpose**: Get beta attention metrics

**UI Element**: Beta attention display
- **Location**: `client/src/pages/home.tsx`
- **Component**: BetaAttentionDisplay
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/consciousness.ts` - `getBetaAttention()`

---

### 4. Olympus Domain 🔒

#### 4.1 Get Olympus Status
```
GET /api/olympus/status
```
**Purpose**: Get overall Olympus system status

**UI Element**: Status overview
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: Status display at top of page
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getStatus()`

#### 4.2 Zeus Chat
```
POST /api/olympus/zeus/chat
Body: { message: string, files?: File[] }
```
**Purpose**: Send message to Zeus

**UI Element**: Chat interface
- **Location**: `client/src/components/ZeusChat.tsx`
- **Component**: ZeusChat (full chat UI)
- **Status**: ✅ Complete
- **Loading State**: Message shows "sending..." indicator
- **Error Handling**: Toast notification on error
- **Success Feedback**: Message appears in chat
- **Service**: `client/src/api/services/olympus.ts` - `sendZeusChat()`
- **Hook**: `client/src/hooks/useZeusChat.ts`

#### 4.3 Zeus Search
```
POST /api/olympus/zeus/search
Body: { query: string }
```
**Purpose**: Search with Zeus

**UI Element**: Search form in Zeus Chat
- **Location**: `client/src/components/ZeusChat.tsx`
- **Component**: Search input within ZeusChat
- **Status**: ✅ Complete
- **Loading State**: Button disabled, shows spinner
- **Error Handling**: Toast notification on error
- **Service**: `client/src/api/services/olympus.ts` - `zeusSearch()`

#### 4.4 Get Recent Chat
```
GET /api/olympus/chat/recent
```
**Purpose**: Get recent Zeus chat messages

**UI Element**: Chat message history
- **Location**: `client/src/components/ZeusChat.tsx`
- **Component**: Message list in ZeusChat
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getRecentChat()`

#### 4.5 Get Active Debates
```
GET /api/olympus/debates/active
```
**Purpose**: Get currently active Olympus debates

**UI Element**: Active debates list
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: Debates tab content
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getActiveDebates()`

#### 4.6 Start War (Blitzkrieg)
```
POST /api/olympus/war/blitzkrieg
Body: { targetAddress: string, memoryFragments: string[] }
```
**Purpose**: Start blitzkrieg war mode

**UI Element**: Blitzkrieg button
- **Location**: `client/src/components/war-status-panel.tsx`
- **Component**: WarStatusPanel
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + war status updates
- **Service**: `client/src/api/services/olympus.ts` - `startBlitzkrieg()`

#### 4.7 Start War (Siege)
```
POST /api/olympus/war/siege
Body: { targetAddress: string, memoryFragments: string[] }
```
**Purpose**: Start siege war mode

**UI Element**: Siege button
- **Location**: `client/src/components/war-status-panel.tsx`
- **Component**: WarStatusPanel
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + war status updates
- **Service**: `client/src/api/services/olympus.ts` - `startSiege()`

#### 4.8 Start War (Hunt)
```
POST /api/olympus/war/hunt
Body: { targetAddress: string }
```
**Purpose**: Start hunt war mode

**UI Element**: Hunt button
- **Location**: `client/src/components/war-status-panel.tsx`
- **Component**: WarStatusPanel
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + war status updates
- **Service**: `client/src/api/services/olympus.ts` - `startHunt()`

#### 4.9 End War
```
POST /api/olympus/war/end
```
**Purpose**: End current war

**UI Element**: End War button
- **Location**: `client/src/components/war-status-panel.tsx`
- **Component**: WarStatusPanel
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + war status cleared
- **Service**: `client/src/api/services/olympus.ts` - `endWar()`

#### 4.10 Get War History
```
GET /api/olympus/war/history?limit=10
```
**Purpose**: Get war history

**UI Element**: War history table
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: War tab content
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getWarHistory(limit)`

#### 4.11 Get Active War
```
GET /api/olympus/war/active
```
**Purpose**: Get currently active war

**UI Element**: Active war display
- **Location**: `client/src/components/war-status-panel.tsx`
- **Component**: WarStatusPanel
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getActiveWar()`
- **Auto-refresh**: Polls every 5 seconds when war active

#### 4.12 Get Kernels
```
GET /api/olympus/kernels
```
**Purpose**: Get spawned conversation kernels

**UI Element**: Kernels list
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: Kernels tab content
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getKernels()`

#### 4.13 Get Shadow Status
```
GET /api/olympus/shadow/status
```
**Purpose**: Get Shadow Pantheon status

**UI Element**: Shadow status display
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: ShadowPantheonContent (Shadow tab)
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/olympus.ts` - `getShadowStatus()`

#### 4.14 Poll Shadow Pantheon
```
POST /api/olympus/shadow/poll
Body: { targetAddress: string }
```
**Purpose**: Poll Shadow Pantheon for insights

**UI Element**: Poll button
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: ShadowPantheonContent
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + results displayed
- **Service**: `client/src/api/services/olympus.ts` - `pollShadowPantheon()`

#### 4.15 Trigger Shadow God Action
```
POST /api/olympus/shadow/:godName/act
Params: godName = "chronos" | "nemesis" | "nyx" | "erebus"
Body: { targetAddress: string }
```
**Purpose**: Trigger specific Shadow God action

**UI Element**: Individual god action buttons
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: ShadowPantheonContent
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + action result displayed
- **Service**: `client/src/api/services/olympus.ts` - `triggerShadowAct(godName)`

---

### 5. Recovery Domain 🔒

#### 5.1 Start Recovery
```
POST /api/recovery/start
Body: { targetAddress: string, memoryFragments: string[] }
```
**Purpose**: Start recovery investigation

**UI Element**: Start Investigation button
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: RecoveryPage
- **Status**: ✅ Complete
- **Loading State**: Button disabled, shows spinner
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + investigation status updates
- **Service**: `client/src/api/services/recovery.ts` - `startRecovery()`

#### 5.2 Stop Recovery
```
POST /api/recovery/stop
```
**Purpose**: Stop current recovery

**UI Element**: Stop Investigation button
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: RecoveryPage
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + status cleared
- **Service**: `client/src/api/services/recovery.ts` - `stopRecovery()`

#### 5.3 Get Candidates
```
GET /api/recovery/candidates
```
**Purpose**: Get recovery candidates

**UI Element**: Candidates list
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Candidates display section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/recovery.ts` - `getCandidates()`
- **Auto-refresh**: Polls every 10 seconds during active recovery

#### 5.4 Get Investigation Status
```
GET /api/investigation/status
```
**Purpose**: Get current investigation status

**UI Element**: Investigation status panel
- **Location**: `client/src/pages/investigation.tsx`
- **Component**: InvestigationPage
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/recovery.ts` - `getInvestigationStatus()`
- **Auto-refresh**: Polls every 5 seconds

#### 5.5 Get Unified Recovery Sessions
```
GET /api/unified-recovery/sessions
```
**Purpose**: Get all recovery sessions

**UI Element**: Sessions list
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Sessions section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/unifiedRecovery.ts` - `getSessions()`

---

### 6. Observer Domain 🔒

#### 6.1 Get Dormant Addresses
```
GET /api/observer/addresses/dormant
```
**Purpose**: Get dormant Bitcoin addresses

**UI Element**: Dormant addresses table
- **Location**: `client/src/pages/observer.tsx`
- **Component**: ObserverPage
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/observer.ts` - `getDormantAddresses()`

#### 6.2 Get Recovery Priorities
```
GET /api/observer/recovery/priorities
```
**Purpose**: Get prioritized recovery targets

**UI Element**: Priorities list
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Priorities section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/observer.ts` - `getRecoveryPriorities()`

#### 6.3 Get Workflows
```
GET /api/observer/workflows
```
**Purpose**: Get active workflows

**UI Element**: Workflows table
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Workflows section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/observer.ts` - `getWorkflows()`

#### 6.4 Get Workflow Search Progress
```
GET /api/observer/workflows/:workflowId/search-progress
```
**Purpose**: Get search progress for workflow

**UI Element**: Progress bar/chart
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Workflow detail view
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/observer.ts` - `getWorkflowSearchProgress(workflowId)`

#### 6.5 Get Active QIG Search
```
GET /api/observer/qig-search/active
```
**Purpose**: Get active QIG searches

**UI Element**: Active searches list
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Active QIG Searches section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/observer.ts` - `getActiveQigSearches()`

#### 6.6 Start QIG Search
```
POST /api/observer/qig-search/start
Body: { address: string, memoryFragments: string[] }
```
**Purpose**: Start QIG search for address

**UI Element**: Start search button
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Address row action button
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + search appears in active list
- **Service**: `client/src/api/services/observer.ts` - `startQigSearch()`

#### 6.7 Stop QIG Search
```
POST /api/observer/qig-search/stop/:address
```
**Purpose**: Stop QIG search

**UI Element**: Stop button
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Active search row
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + search removed from list
- **Service**: `client/src/api/services/observer.ts` - `stopQigSearch(address)`

#### 6.8 Get Discovery Hits
```
GET /api/observer/discoveries/hits
```
**Purpose**: Get discovery hits

**UI Element**: Discovery hits list
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Discoveries section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/observer.ts` - `getDiscoveryHits()`

---

### 7. Forensic Domain 🔒

#### 7.1 Analyze Address
```
GET /api/forensic/analyze/:address
```
**Purpose**: Perform forensic analysis on address

**UI Element**: Analyze button
- **Location**: `client/src/components/ForensicInvestigation.tsx`
- **Component**: ForensicInvestigation
- **Status**: ✅ Complete
- **Loading State**: Button disabled, shows spinner
- **Error Handling**: Toast notification on error
- **Success Feedback**: Analysis results displayed
- **Service**: `client/src/api/services/forensic.ts` - `analyzeAddress(address)`

#### 7.2 Get Hypotheses
```
GET /api/forensic/hypotheses
```
**Purpose**: Get generated hypotheses

**UI Element**: Hypotheses list
- **Location**: `client/src/components/ForensicInvestigation.tsx`
- **Component**: Hypotheses section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/forensic.ts` - `getHypotheses()`

---

### 8. Target Addresses Domain 🔒

#### 8.1 List Target Addresses
```
GET /api/target-addresses
```
**Purpose**: Get all target addresses

**UI Element**: Target addresses list
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Target addresses section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/targetAddresses.ts` - `getTargetAddresses()`

#### 8.2 Add Target Address
```
POST /api/target-addresses
Body: { address: string, label?: string }
```
**Purpose**: Add new target address

**UI Element**: Add address form
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Add target dialog
- **Status**: ✅ Complete
- **Loading State**: Button disabled during submission
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + address appears in list
- **Validation**: Bitcoin address format validation
- **Service**: `client/src/api/services/targetAddresses.ts` - `addTargetAddress()`

#### 8.3 Delete Target Address
```
DELETE /api/target-addresses/:id
```
**Purpose**: Remove target address

**UI Element**: Delete button
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Address list item
- **Status**: ✅ Complete
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast + address removed from list
- **Confirmation**: Confirmation dialog before delete
- **Service**: `client/src/api/services/targetAddresses.ts` - `deleteTargetAddress(id)`

---

### 9. Balance Domain 🔒

#### 9.1 Get Balance Hits
```
GET /api/balance-hits
```
**Purpose**: Get addresses with balance

**UI Element**: Balance hits list
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: RecoveryResults
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/balanceMonitor.ts` - `getBalanceHits()`

#### 9.2 Get Balance Addresses
```
GET /api/balance-addresses
```
**Purpose**: Get all addresses being monitored

**UI Element**: Monitored addresses list
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Balance monitoring section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/balanceMonitor.ts` - `getBalanceAddresses()`

#### 9.3 Get Balance Queue Status
```
GET /api/balance-queue/status
```
**Purpose**: Get balance queue status

**UI Element**: Queue status display
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Balance Queue section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/balanceQueue.ts` - `getQueueStatus()`

#### 9.4 Get Balance Monitor Status
```
GET /api/balance-monitor/status
```
**Purpose**: Get balance monitor status

**UI Element**: Monitor status display
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Balance Monitor section
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/balanceMonitor.ts` - `getStatus()`

#### 9.5 Refresh Balance Monitor
```
POST /api/balance-monitor/refresh
```
**Purpose**: Trigger balance monitor refresh

**UI Element**: Refresh button
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Balance Monitor section
- **Status**: ⚠️ **Partial** - Exists but needs better feedback
- **Loading State**: Button disabled during request
- **Error Handling**: Toast notification on error
- **Success Feedback**: Toast notification needed
- **Service**: `client/src/api/services/balanceMonitor.ts` - `refresh()`
- **Improvement Needed**: Add visual feedback for refresh completion

---

### 10. Sweeps Domain 🔒

#### 10.1 List Sweeps
```
GET /api/sweeps
```
**Purpose**: Get all Bitcoin sweeps

**UI Element**: Sweeps list
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Sweeps section (minimal)
- **Status**: ⚠️ **Partial** - Basic list exists
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/sweeps.ts` - `getSweeps()`
- **Improvement Needed**: Enhanced UI with better layout, filtering, sorting

#### 10.2 Get Sweep Stats
```
GET /api/sweeps/stats
```
**Purpose**: Get sweep statistics

**UI Element**: Stats cards
- **Location**: `client/src/pages/recovery.tsx`
- **Component**: Stats section (minimal)
- **Status**: ⚠️ **Partial** - Basic stats shown
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/sweeps.ts` - `getStats()`
- **Improvement Needed**: Visual charts, better formatting

#### 10.3 Audit Sweep
```
GET /api/sweeps/:id/audit
```
**Purpose**: Get audit trail for sweep

**UI Element**: **❌ MISSING**
- **Required**: Audit button in sweep detail view
- **Should show**: Transaction history, approval chain, broadcast status
- **Service**: `client/src/api/services/sweeps.ts` - needs `auditSweep(id)` method
- **Priority**: Medium - Important for accountability

#### 10.4 Approve Sweep
```
POST /api/sweeps/:id/approve
```
**Purpose**: Approve pending sweep

**UI Element**: **❌ MISSING**
- **Required**: Approve button in sweep detail view
- **Should show**: Confirmation dialog before approval
- **Service**: `client/src/api/services/sweeps.ts` - needs `approveSweep(id)` method
- **Priority**: High - Required for sweep workflow

#### 10.5 Reject Sweep
```
POST /api/sweeps/:id/reject
```
**Purpose**: Reject pending sweep

**UI Element**: **❌ MISSING**
- **Required**: Reject button in sweep detail view
- **Should show**: Confirmation dialog with reason input
- **Service**: `client/src/api/services/sweeps.ts` - needs `rejectSweep(id, reason)` method
- **Priority**: High - Required for sweep workflow

#### 10.6 Broadcast Sweep
```
POST /api/sweeps/:id/broadcast
```
**Purpose**: Broadcast approved sweep to network

**UI Element**: **❌ MISSING**
- **Required**: Broadcast button in sweep detail view
- **Should show**: Confirmation dialog with warning
- **Service**: `client/src/api/services/sweeps.ts` - needs `broadcastSweep(id)` method
- **Priority**: Critical - Required to complete sweeps

---

### 11. QIG Domain 🔒

#### 11.1 Get Geometric Status
```
GET /api/qig/geometric/status
```
**Purpose**: Get QIG geometric status

**UI Element**: QIG status display
- **Location**: `client/src/pages/home.tsx`
- **Component**: QIG section in dashboard
- **Status**: ✅ Complete
- **Loading State**: Skeleton during load
- **Error Handling**: Error message displayed
- **Service**: `client/src/api/services/qig.ts` - `getGeometricStatus()`

#### 11.2 Encode to Geometric Space
```
POST /api/qig/geometric/encode
Body: { phrase: string }
```
**Purpose**: Encode phrase to geometric coordinates

**UI Element**: Encode form (advanced)
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: Advanced QIG controls (collapsible)
- **Status**: ✅ Complete
- **Loading State**: Button disabled during encoding
- **Error Handling**: Toast notification on error
- **Success Feedback**: Coordinates displayed
- **Service**: `client/src/api/services/qig.ts` - `encodeGeometric()`

#### 11.3 Calculate Geometric Similarity
```
POST /api/qig/geometric/similarity
Body: { phrase1: string, phrase2: string }
```
**Purpose**: Calculate geometric similarity between phrases

**UI Element**: Similarity calculator
- **Location**: `client/src/pages/olympus.tsx`
- **Component**: Advanced QIG controls
- **Status**: ✅ Complete
- **Loading State**: Button disabled during calculation
- **Error Handling**: Toast notification on error
- **Success Feedback**: Similarity score displayed
- **Service**: `client/src/api/services/qig.ts` - `calculateSimilarity()`

---

### 12. Format Detection Domain 🔒

#### 12.1 Detect Address Format
```
GET /api/format/address/:address
```
**Purpose**: Detect Bitcoin address format

**UI Element**: Format detector
- **Location**: `client/src/components/ForensicInvestigation.tsx`
- **Component**: Address input helper
- **Status**: ✅ Complete
- **Loading State**: Inline spinner
- **Error Handling**: Error message inline
- **Service**: `client/src/api/services/forensic.ts` - `detectAddressFormat()`

#### 12.2 Validate Mnemonic
```
POST /api/format/mnemonic
Body: { phrase: string }
```
**Purpose**: Validate BIP39 mnemonic phrase

**UI Element**: Mnemonic validator
- **Location**: `client/src/components/MemoryFragmentSearch.tsx`
- **Component**: Phrase input validation
- **Status**: ✅ Complete
- **Loading State**: Inline validation
- **Error Handling**: Error message inline
- **Service**: Handled in component (could be extracted to service)

#### 12.3 Batch Address Format Detection
```
POST /api/format/batch-addresses
Body: { addresses: string[] }
```
**Purpose**: Detect format for multiple addresses

**UI Element**: Batch validator
- **Location**: `client/src/pages/observer.tsx`
- **Component**: Batch import dialog
- **Status**: ✅ Complete
- **Loading State**: Progress bar during batch processing
- **Error Handling**: Shows errors per address
- **Service**: `client/src/api/services/forensic.ts` - `batchDetectAddresses()`

---

### 13. Memory Search Domain 🔒

#### 13.1 Search Memory
```
POST /api/memory-search
Body: { query: string, filters?: object }
```
**Purpose**: Search geometric memory

**UI Element**: Memory search form
- **Location**: `client/src/components/MemoryFragmentSearch.tsx`
- **Component**: MemoryFragmentSearch
- **Status**: ✅ Complete
- **Loading State**: Search button shows spinner
- **Error Handling**: Toast notification on error
- **Success Feedback**: Results displayed below
- **Service**: `client/src/api/services/recovery.ts` - `searchMemory()`

#### 13.2 Test Phrase
```
POST /api/test-phrase
Body: { phrase: string, targetAddress: string }
```
**Purpose**: Test if phrase derives target address

**UI Element**: Test button
- **Location**: `client/src/components/MemoryFragmentSearch.tsx`
- **Component**: Candidate action button
- **Status**: ✅ Complete
- **Loading State**: Button disabled during test
- **Error Handling**: Toast notification on error
- **Success Feedback**: Test result displayed (match/no-match)
- **Service**: `client/src/api/services/recovery.ts` - `testPhrase()`

---

## Missing UI Elements: Action Items

### High Priority
1. **Sweep Approval Workflow** ❌
   - Add sweep detail modal/page
   - Implement approve/reject/broadcast buttons
   - Add confirmation dialogs
   - Show audit trail
   - **Estimated effort**: 4-6 hours

### Medium Priority
1. **Balance Monitor Refresh Feedback** ⚠️
   - Add success toast notification
   - Show timestamp of last refresh
   - Add loading indicator
   - **Estimated effort**: 1 hour

2. **Enhanced Sweep List UI** ⚠️
   - Add filtering (status, date range)
   - Add sorting (amount, date, status)
   - Add search
   - Improve visual layout
   - **Estimated effort**: 2-3 hours

## Testing Checklist

For each UI element:
- [ ] Manual testing of happy path
- [ ] Error handling tested (network error, validation error, server error)
- [ ] Loading states tested
- [ ] Success feedback tested
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (aria-labels present)
- [ ] Mobile responsive tested
- [ ] E2E test written (critical paths only)

## Health Check Implementation

### Backend Health Endpoint
```
GET /api/health
```
**Purpose**: Check if backend is responsive

**UI Element**: Health indicator
- **Location**: Should be in app header or sidebar
- **Component**: HealthIndicator (to be created)
- **Status**: ❌ **Missing** - Backend endpoint may exist but no UI
- **Should show**: Green dot when healthy, red when unhealthy, yellow during check
- **Auto-poll**: Every 30 seconds
- **On failure**: Show reconnection banner
- **Priority**: Medium

## Session Expiration Handling

### Current Implementation
- ❌ **Missing**: No global 401 handler
- ❌ **Missing**: No session expiration modal
- ❌ **Missing**: No work preservation during re-auth

### Required Implementation
1. Add axios interceptor for 401 responses
2. Show re-authentication modal
3. Preserve current form state
4. Restore state after successful re-auth
5. Clear state on logout
- **Priority**: High
- **Estimated effort**: 3-4 hours

## Accessibility Compliance Status

### Current State
- ✅ Radix UI provides accessible primitives
- ✅ Keyboard navigation supported in most components
- ✅ ARIA labels present on icon buttons
- ⚠️ Color contrast needs verification (run axe audit)
- ⚠️ Touch targets need verification (especially mobile)
- ❌ No accessibility testing in CI
- ❌ No screen reader testing documented

### Action Items
1. Run axe DevTools on all pages
2. Fix color contrast issues
3. Verify touch target sizes
4. Add accessibility tests to CI
5. Document screen reader testing results
- **Priority**: High
- **Estimated effort**: 6-8 hours

## Performance Optimization Status

### Current Optimizations
- ✅ React Query for caching
- ✅ Lazy loading for routes (wouter)
- ✅ Code splitting via Vite
- ✅ Memoization in some components
- ⚠️ Large components not using React.memo
- ⚠️ Some inline object/array creation in renders
- ⚠️ No bundle size monitoring

### Action Items
1. Add React.memo to expensive components (>100 lines)
2. Extract inline objects/arrays to useMemo
3. Add bundle size monitoring
4. Implement virtual scrolling for large lists
5. Add request cancellation for abandoned navigations
- **Priority**: Medium
- **Estimated effort**: 4-6 hours

## Related Documents

- `20251212-ui-ux-best-practices-comprehensive-1.00W.md` - UI/UX best practices
- `20251208-api-documentation-rest-endpoints-1.50F.md` - API documentation
- `20251208-design-guidelines-ui-ux-1.00F.md` - Design guidelines

---
**Last Updated**: 2025-12-12
**Coverage**: 92% (58/63 endpoints complete)
**Priority Gaps**: Sweep workflow UI, session expiration handling, health check UI
