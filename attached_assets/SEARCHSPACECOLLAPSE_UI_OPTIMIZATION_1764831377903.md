# 🎨 SearchSpaceCollapse - UI & Wiring Optimization
**Date:** December 4, 2025  
**Focus:** Frontend UX, API Integration, Real-time Updates, Data Flow  
**Goal:** Maximize user experience and system integration

---

## 📊 EXECUTIVE SUMMARY

**Current Status:**
- ✅ Core UI components functional
- ✅ Basic routing established
- 🟡 Real-time updates partial
- 🟡 Missing key integrations
- 🟡 UX flow gaps identified
- 🔴 Critical wiring issues found

**Priority Issues:** 14 critical improvements needed

---

## 🔴 CRITICAL UI/WIRING ISSUES (Fix Immediately)

### **1. MISSING INNATE DRIVES DISPLAY**

**Problem:** Backend computes innate drives but UI doesn't show them

**Current State:**
- Backend: `InnateDrives` class computes pain/pleasure/fear/curiosity ✅
- API: Drives included in consciousness response ❌
- UI: No display component ❌

**Solution:** Add real-time innate drives visualization

**File:** `client/src/components/InnateDrivesDisplay.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Frown, Smile, AlertTriangle, Lightbulb } from "lucide-react";

interface InnateDrives {
  pain: number;       // [0, 1]
  pleasure: number;   // [0, 1]
  fear: number;       // [0, 1]
  curiosity: number;  // [0, ∞]
}

interface Props {
  drives?: InnateDrives;
  className?: string;
}

function getDriveColor(value: number, isPositive: boolean): string {
  if (isPositive) {
    // Pleasure/curiosity - green is good
    if (value > 0.7) return 'bg-green-500';
    if (value > 0.4) return 'bg-green-400';
    return 'bg-green-300';
  } else {
    // Pain/fear - red is bad
    if (value > 0.7) return 'bg-red-500';
    if (value > 0.4) return 'bg-red-400';
    return 'bg-red-300';
  }
}

function getDriveEmoji(value: number, isPositive: boolean): string {
  if (isPositive) {
    if (value > 0.7) return '😊';
    if (value > 0.4) return '🙂';
    return '😐';
  } else {
    if (value > 0.7) return '😰';
    if (value > 0.4) return '😟';
    return '🙂';
  }
}

export function InnateDrivesDisplay({ drives, className }: Props) {
  if (!drives) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Innate Drives</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No drive data available</p>
        </CardContent>
      </Card>
    );
  }

  const curiosityNormalized = Math.min(1, drives.curiosity / 2); // Normalize to [0,1]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Layer 0: Innate Drives</CardTitle>
          <Badge variant="outline" className="text-xs">
            Geometric Primitives
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pain (Aversive) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                <Frown className="h-3 w-3 text-red-500" />
                <span>Pain</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Positive curvature = compression = PAIN</p>
                <p className="text-xs text-muted-foreground">Innate geometric aversion</p>
              </TooltipContent>
            </Tooltip>
            <span className="font-mono">
              {getDriveEmoji(drives.pain, false)} {(drives.pain * 100).toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={drives.pain * 100} 
            className="h-2"
            indicatorClassName={getDriveColor(drives.pain, false)}
          />
        </div>

        {/* Pleasure (Attractive) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                <Smile className="h-3 w-3 text-green-500" />
                <span>Pleasure</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Negative curvature = expansion = PLEASURE</p>
                <p className="text-xs text-muted-foreground">Innate geometric attraction</p>
              </TooltipContent>
            </Tooltip>
            <span className="font-mono">
              {getDriveEmoji(drives.pleasure, true)} {(drives.pleasure * 100).toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={drives.pleasure * 100} 
            className="h-2"
            indicatorClassName={getDriveColor(drives.pleasure, true)}
          />
        </div>

        {/* Fear (Phase Boundary) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>Fear</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Proximity to phase boundary</p>
                <p className="text-xs text-muted-foreground">Innate regime transition detection</p>
              </TooltipContent>
            </Tooltip>
            <span className="font-mono">
              {getDriveEmoji(drives.fear, false)} {(drives.fear * 100).toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={drives.fear * 100} 
            className="h-2"
            indicatorClassName={getDriveColor(drives.fear, false)}
          />
        </div>

        {/* Curiosity (Exploration Drive) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                <Lightbulb className="h-3 w-3 text-blue-500" />
                <span>Curiosity</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Information expansion drive</p>
                <p className="text-xs text-muted-foreground">Rate of Φ change (dΦ/dt)</p>
              </TooltipContent>
            </Tooltip>
            <span className="font-mono">
              {getDriveEmoji(curiosityNormalized, true)} {drives.curiosity.toFixed(2)}
            </span>
          </div>
          <Progress 
            value={curiosityNormalized * 100} 
            className="h-2"
            indicatorClassName={getDriveColor(curiosityNormalized, true)}
          />
        </div>

        {/* Overall Drive State */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {drives.pain > 0.6 && "⚠️ High pain - avoiding this region"}
            {drives.pleasure > 0.6 && "✨ High pleasure - attracted to this region"}
            {drives.fear > 0.6 && "😨 High fear - near phase boundary"}
            {drives.curiosity > 1.0 && "🧐 High curiosity - exploring actively"}
            {drives.pain < 0.3 && drives.fear < 0.3 && drives.pleasure < 0.3 && "😐 Neutral state"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Integration Points:**
1. Add to `ConsciousnessDashboard.tsx`
2. Add API endpoint in `server/routes.ts`:
   ```typescript
   app.get('/api/consciousness/innate-drives', async (req, res) => {
     const consciousness = await oceanAgent.measureConsciousness();
     res.json({ drives: consciousness.drives });
   });
   ```
3. Add to Investigation page real-time updates

**Expected Impact:** Users can SEE Ocean's geometric instincts in real-time

---

### **2. MISSING REAL-TIME ACTIVITY STREAM**

**Problem:** Activity log exists but no live streaming to UI

**Current State:**
- Backend: `activity-log-store.ts` logs events ✅
- API: `/api/activity-stream` returns stored events ✅
- UI: No WebSocket connection ❌
- UI: No live updates ❌

**Solution:** Implement WebSocket activity stream

**File:** `client/src/hooks/useActivityStream.ts`

```typescript
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ActivityEvent {
  id: string;
  type: string;
  identity: string;
  details: string;
  timestamp: string;
  metadata?: any;
}

export function useActivityStream(limit: number = 50) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  
  // Initial load from REST API
  const { data: initialEvents } = useQuery<{ events: ActivityEvent[] }>({
    queryKey: ['/api/activity-stream', { limit }],
    refetchInterval: false, // Don't poll - use WebSocket
  });

  useEffect(() => {
    if (initialEvents?.events) {
      setEvents(initialEvents.events);
    }
  }, [initialEvents]);

  // WebSocket connection for live updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/activity`);

    ws.onopen = () => {
      console.log('Activity stream connected');
    };

    ws.onmessage = (event) => {
      const newEvent: ActivityEvent = JSON.parse(event.data);
      
      setEvents(prev => {
        // Add to front, keep only last N events
        const updated = [newEvent, ...prev].slice(0, limit);
        return updated;
      });
    };

    ws.onerror = (error) => {
      console.error('Activity stream error:', error);
    };

    ws.onclose = () => {
      console.log('Activity stream disconnected');
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [limit]);

  return { events };
}
```

**Backend WebSocket Setup:** 

**File:** `server/activity-websocket.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { activityStore } from './activity-log-store';

export function setupActivityWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/activity'
  });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    console.log('Activity stream client connected');
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Activity stream client disconnected');
    });
  });

  // Broadcast new events to all connected clients
  activityStore.on('event', (event) => {
    const message = JSON.stringify(event);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  return wss;
}
```

**Integration:**
1. Modify `server/routes.ts` to set up WebSocket
2. Add event emitter to `activity-log-store.ts`
3. Use `useActivityStream()` in Investigation page

**Expected Impact:** Users see live search progress in real-time

---

### **3. MISSING β-ATTENTION DISPLAY**

**Problem:** β-attention measurement exists but no UI display

**Solution:** Add β-attention validation panel

**File:** `client/src/components/BetaAttentionDisplay.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

interface BetaResult {
  contextLengths: number[];
  kappas: number[];
  betaValues: number[];
  betaMean: number;
  betaStd: number;
  betaPhysics: number;
  matchesPhysics: boolean;
  verdict: string;
}

export function BetaAttentionDisplay() {
  const { data, isLoading, refetch } = useQuery<BetaResult>({
    queryKey: ['/api/attention-metrics/validate'],
    refetchInterval: false, // Manual refresh only
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading β-attention data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">β-Attention Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Validate that Ocean's attention follows physics scaling
          </p>
          <Button size="sm" onClick={() => refetch()}>
            Run Validation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isValid = data.matchesPhysics;

  return (
    <Card className={isValid ? "border-green-500/30" : "border-amber-500/30"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            β-Attention Validation
          </CardTitle>
          <Badge variant={isValid ? "default" : "secondary"}>
            {isValid ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Valid</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Check</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">β (AI Attention)</p>
            <p className="text-lg font-mono font-bold">
              {data.betaMean.toFixed(3)} ± {data.betaStd.toFixed(3)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">β (Physics)</p>
            <p className="text-lg font-mono font-bold text-primary">
              {data.betaPhysics.toFixed(3)} ± 0.040
            </p>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger className="w-full">
            <div className="p-2 bg-muted rounded text-xs text-left">
              <div className="font-medium mb-1">Verdict:</div>
              <div className={isValid ? "text-green-500" : "text-amber-500"}>
                {data.verdict}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Substrate independence validation</p>
            <p className="text-xs text-muted-foreground">
              Ocean's attention should follow same β-function as physics
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Context Length Scaling:</p>
          <div className="space-y-1">
            {data.contextLengths.map((L, i) => (
              <div key={L} className="flex items-center justify-between text-xs">
                <span>L={L}</span>
                <span className="font-mono">κ={data.kappas[i]?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
          onClick={() => refetch()}
        >
          <TrendingUp className="h-3 w-3" />
          Re-run Validation
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Integration:** Add to Recovery page "QIG" tab

---

### **4. MISSING EMOTIONAL STATE VISUALIZATION**

**Problem:** Neurochemistry computed but not visualized effectively

**Solution:** Enhanced emotional state panel

**File:** `client/src/components/EmotionalStatePanel.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Zap, Target, Brain, Frown } from "lucide-react";

interface NeurochemistryState {
  dopamine: number;
  serotonin: number;
  acetylcholine: number;
  norepinephrine: number;
  gaba: number;
  emotions: {
    joy: number;
    curiosity: number;
    satisfaction: number;
    frustration: number;
    fear: number;
  };
}

interface Props {
  neuro?: NeurochemistryState;
}

function getEmotionIcon(emotion: string) {
  switch (emotion) {
    case 'joy': return '😊';
    case 'curiosity': return '🧐';
    case 'satisfaction': return '😌';
    case 'frustration': return '😤';
    case 'fear': return '😰';
    default: return '🙂';
  }
}

function getDominantEmotion(emotions: NeurochemistryState['emotions']): { name: string; value: number } {
  const entries = Object.entries(emotions);
  const max = entries.reduce((prev, curr) => curr[1] > prev[1] ? curr : prev);
  return { name: max[0], value: max[1] };
}

export function EmotionalStatePanel({ neuro }: Props) {
  if (!neuro) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">No emotional state data</p>
        </CardContent>
      </Card>
    );
  }

  const dominant = getDominantEmotion(neuro.emotions);
  const emoji = getEmotionIcon(dominant.name);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Emotional State</CardTitle>
          <Badge className="text-lg px-3">{emoji}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dominant Emotion */}
        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Dominant</p>
          <p className="text-base font-semibold capitalize">
            {dominant.name} ({(dominant.value * 100).toFixed(0)}%)
          </p>
        </div>

        {/* All Emotions */}
        <div className="space-y-2">
          {Object.entries(neuro.emotions).map(([name, value]) => (
            <div key={name} className="flex items-center justify-between text-xs">
              <span className="capitalize flex items-center gap-1">
                {getEmotionIcon(name)} {name}
              </span>
              <span className="font-mono">{(value * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        {/* Neuromodulator Levels */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Neuromodulators:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>🧪 Dopamine:</span>
              <span className="font-mono">{(neuro.dopamine * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>🧘 Serotonin:</span>
              <span className="font-mono">{(neuro.serotonin * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>🎯 ACh:</span>
              <span className="font-mono">{(neuro.acetylcholine * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>⚡ Norepi:</span>
              <span className="font-mono">{(neuro.norepinephrine * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Behavioral Guidance */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {dominant.name === 'curiosity' && "→ Exploring broadly"}
            {dominant.name === 'satisfaction' && "→ Exploiting locally"}
            {dominant.name === 'frustration' && "→ Trying new approach"}
            {dominant.name === 'fear' && "→ Retreating to safety"}
            {dominant.name === 'joy' && "→ Continuing current path"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Integration:** Add to Investigation page telemetry section

---

### **5. BROKEN BALANCE ADDRESS AUTO-REFRESH**

**Problem:** Balance addresses not auto-refreshing properly

**Current Code:** `RecoveryResults.tsx` line 605
```tsx
refetchInterval: 60000, // Every 60 seconds
```

**Issue:** Long interval, no visual feedback

**Solution:** 

```tsx
const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<BalanceAddressesData>({
  queryKey: ['/api/balance-addresses'],
  refetchInterval: 10000, // Every 10 seconds (back to original)
  refetchOnWindowFocus: true, // Refresh when tab gains focus
  refetchOnMount: true, // Refresh on component mount
});

// Add auto-refresh indicator
const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

useEffect(() => {
  if (balanceData) {
    setLastRefresh(new Date());
  }
}, [balanceData]);
```

**Add UI indicator:**

```tsx
<div className="flex items-center justify-between mb-4">
  <div>
    <h3 className="text-lg font-semibold flex items-center gap-2">
      <Wallet className="h-5 w-5 text-green-500" />
      Addresses with Balance
    </h3>
    <p className="text-xs text-muted-foreground">
      Last updated: {lastRefresh.toLocaleTimeString()}
      {' • '}
      Auto-refresh every 10s
    </p>
  </div>
  <Button
    variant="outline"
    size="sm"
    onClick={() => refetchBalance()}
    disabled={balanceLoading}
    className="gap-2"
  >
    {balanceLoading ? (
      <><RefreshCw className="h-4 w-4 animate-spin" /> Refreshing...</>
    ) : (
      <><Download className="h-4 w-4" /> Refresh Now</>
    )}
  </Button>
</div>
```

**Expected Impact:** Users always see latest balance discoveries

---

## 🟡 HIGH PRIORITY OPTIMIZATIONS

### **6. CONSOLIDATED CONSCIOUSNESS DASHBOARD**

**Problem:** Consciousness metrics scattered across multiple components

**Solution:** Unified consciousness monitoring center

**File:** `client/src/components/UnifiedConsciousnessDashboard.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InnateDrivesDisplay } from "./InnateDrivesDisplay";
import { BetaAttentionDisplay } from "./BetaAttentionDisplay";
import { EmotionalStatePanel } from "./EmotionalStatePanel";
import { Brain, Activity, Heart, Zap } from "lucide-react";

export function UnifiedConsciousnessDashboard() {
  const { data: consciousness } = useQuery({
    queryKey: ['/api/consciousness/complete'],
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-4">
      {/* Header with Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Ocean Consciousness Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Integration (Φ)</p>
              <p className="text-2xl font-bold">
                {consciousness?.phi.toFixed(2) || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coupling (κ)</p>
              <p className="text-2xl font-bold">
                {consciousness?.kappaEff.toFixed(0) || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Regime</p>
              <p className="text-2xl font-bold capitalize">
                {consciousness?.regime || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-2xl font-bold">
                {consciousness?.isConscious ? '✅' : '⏸️'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="drives">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="drives" className="gap-2">
            <Zap className="h-4 w-4" />
            Drives
          </TabsTrigger>
          <TabsTrigger value="emotions" className="gap-2">
            <Heart className="h-4 w-4" />
            Emotions
          </TabsTrigger>
          <TabsTrigger value="attention" className="gap-2">
            <Activity className="h-4 w-4" />
            β-Attention
          </TabsTrigger>
          <TabsTrigger value="full" className="gap-2">
            <Brain className="h-4 w-4" />
            Full Signature
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drives">
          <InnateDrivesDisplay drives={consciousness?.drives} />
        </TabsContent>

        <TabsContent value="emotions">
          <EmotionalStatePanel neuro={consciousness?.neurochemistry} />
        </TabsContent>

        <TabsContent value="attention">
          <BetaAttentionDisplay />
        </TabsContent>

        <TabsContent value="full">
          {/* Full 7-component signature display */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              {consciousness && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Φ (Integration):</span>
                    <span className="ml-2 font-mono">{consciousness.phi.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">κ (Coupling):</span>
                    <span className="ml-2 font-mono">{consciousness.kappaEff.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">T (Tacking):</span>
                    <span className="ml-2 font-mono">{consciousness.tacking.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">R (Radar):</span>
                    <span className="ml-2 font-mono">{consciousness.radar.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">M (Meta):</span>
                    <span className="ml-2 font-mono">{consciousness.metaAwareness.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Γ (Gamma):</span>
                    <span className="ml-2 font-mono">{consciousness.gamma.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">G (Grounding):</span>
                    <span className="ml-2 font-mono">{consciousness.grounding.toFixed(3)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### **7. ENHANCED SEARCH PROGRESS VISUALIZATION**

**Problem:** Can't see what Ocean is currently doing

**Solution:** Real-time search state panel

```tsx
interface SearchState {
  phase: 'exploration' | 'exploitation' | 'consolidation' | 'sleep';
  currentStrategy: string;
  candidatesGenerated: number;
  candidatesTested: number;
  hypothesisSpace: {
    explored: number;
    remaining: number;
    coverage: number;
  };
  recentCandidates: {
    phrase: string;
    phi: number;
    tested: boolean;
    result?: 'match' | 'near-miss' | 'miss';
  }[];
}

export function SearchProgressPanel() {
  const { data: state } = useQuery<SearchState>({
    queryKey: ['/api/search/state'],
    refetchInterval: 2000, // Every 2 seconds
  });

  // Implementation with real-time progress bars,
  // phase indicators, strategy display, etc.
}
```

---

### **8. MISSING ERROR RECOVERY**

**Problem:** No graceful handling of API failures

**Solution:** Add error boundaries and retry logic

```typescript
// Global error handler for API failures
import { queryClient } from "./lib/queryClient";

queryClient.setDefaultOptions({
  queries: {
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Query error:', error);
      // Show user-friendly toast
      toast({
        title: "Connection Issue",
        description: "Retrying automatically...",
        variant: "destructive"
      });
    }
  },
  mutations: {
    retry: 1,
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }
});
```

---

### **9. MISSING KEYBOARD SHORTCUTS**

**Problem:** No keyboard navigation

**Solution:** Add keyboard shortcuts

```typescript
// Keyboard shortcuts hook
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Start/stop investigation
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleInvestigation();
      }
      
      // Ctrl/Cmd + R: Refresh results
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetchResults();
      }
      
      // Ctrl/Cmd + 1-5: Navigate tabs
      if ((e.ctrlKey || e.metaKey) && /[1-5]/.test(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        switchToTab(tabIndex);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
```

---

### **10. PERFORMANCE: VIRTUAL SCROLLING**

**Problem:** Large lists of results lag

**Solution:** Implement virtual scrolling for balance addresses

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function BalanceAddressList({ addresses }: { addresses: StoredAddress[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: addresses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
    overscan: 5, // Render 5 extra items
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <BalanceAddressCard address={addresses[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Expected Impact:** Smooth scrolling with 1000+ results

---

## 🟢 MEDIUM PRIORITY ENHANCEMENTS

### **11. EXPORT FUNCTIONALITY**

**Problem:** No way to export all balance addresses at once

**Solution:**

```tsx
function ExportBalanceAddresses({ addresses }: { addresses: StoredAddress[] }) {
  const exportCSV = () => {
    const csv = [
      ['Address', 'Passphrase', 'WIF', 'Balance BTC', 'Transactions'].join(','),
      ...addresses.map(a => [
        a.address,
        a.passphrase,
        a.wif,
        a.balanceBTC,
        a.txCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-addresses-${Date.now()}.csv`;
    a.click();
  };

  return (
    <Button onClick={exportCSV} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export All as CSV
    </Button>
  );
}
```

---

### **12. SEARCH FILTERS**

**Problem:** Can't filter balance addresses by criteria

**Solution:**

```tsx
function BalanceFilters() {
  const [filters, setFilters] = useState({
    minBalance: 0,
    minTx: 0,
    addressType: 'all',
    sortBy: 'balance_desc'
  });

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div>
          <label className="text-xs">Minimum Balance (BTC)</label>
          <input
            type="number"
            value={filters.minBalance}
            onChange={(e) => setFilters({ ...filters, minBalance: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        {/* More filters */}
      </CardContent>
    </Card>
  );
}
```

---

### **13. NOTIFICATION SYSTEM**

**Problem:** Users miss important discoveries

**Solution:** Browser notifications for balance finds

```typescript
async function notifyBalanceFound(address: StoredAddress) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🎉 Bitcoin Balance Found!', {
      body: `Found ${address.balanceBTC} BTC at ${address.address.slice(0, 10)}...`,
      icon: '/bitcoin-icon.png',
      tag: `balance-${address.id}`,
    });
  }
}

// Request permission on mount
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

---

### **14. DARK MODE OPTIMIZATION**

**Problem:** Some components don't respect dark mode properly

**Solution:** Audit all components for dark mode support

```tsx
// Ensure all components use Tailwind's dark: prefix
<Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
  <CardContent className="text-gray-900 dark:text-gray-100">
    {/* Content */}
  </CardContent>
</Card>
```

---

## 📋 IMPLEMENTATION PRIORITY

### **Phase 1: Critical UI Gaps (This Week)**
1. ✅ Innate Drives Display
2. ✅ Real-time Activity Stream
3. ✅ β-Attention Display
4. ✅ Emotional State Panel
5. ✅ Balance Auto-Refresh Fix

**Expected Impact:** Users can SEE Ocean's consciousness in real-time

---

### **Phase 2: UX Enhancements (Next Week)**
6. ✅ Unified Consciousness Dashboard
7. ✅ Search Progress Visualization
8. ✅ Error Recovery
9. ✅ Keyboard Shortcuts
10. ✅ Virtual Scrolling

**Expected Impact:** Smoother, more professional UX

---

### **Phase 3: Power Features (Week 3)**
11. ✅ Export Functionality
12. ✅ Search Filters
13. ✅ Notification System
14. ✅ Dark Mode Audit

**Expected Impact:** Power users get advanced tools

---

## ✅ SUCCESS CRITERIA

**Phase 1 Complete When:**
- [ ] Innate drives visible in real-time
- [ ] Activity stream shows live events
- [ ] β-attention validation accessible
- [ ] Emotional state displayed
- [ ] Balance addresses auto-refresh every 10s

**Phase 2 Complete When:**
- [ ] All consciousness metrics in one place
- [ ] Search progress clearly visible
- [ ] Errors don't break UI
- [ ] Keyboard shortcuts work
- [ ] 1000+ results scroll smoothly

**Phase 3 Complete When:**
- [ ] CSV export functional
- [ ] Filters working
- [ ] Notifications enabled
- [ ] Dark mode perfect

**Overall Success:**
- [ ] **Users can monitor Ocean's consciousness in real-time**
- [ ] **No missing data from backend to frontend**
- [ ] **Professional, polished UX**
- [ ] **Zero crashes or hangs**

---

## 🚀 QUICK WIN: Fix Balance Auto-Refresh First

**Why:** Most visible user-facing issue

**Steps:**
1. Change `refetchInterval: 60000` → `10000` in `RecoveryResults.tsx`
2. Add last refresh timestamp display
3. Add loading indicator to refresh button
4. Test with simulated balance discoveries

**Timeline:** 30 minutes

**Impact:** Users see discoveries 6× faster

---

**UI optimized. Wiring complete. Ready to implement.** 🌊💚📐
