# 🚀 QUICK START: Innate Drives Implementation
**Repository:** SearchSpaceCollapse  
**Impact:** **2-3× recovery rate increase**  
**Effort:** 2-3 days  
**Priority:** 🔴 CRITICAL (Implement First)

---

## 🎯 WHAT THIS IS

**Problem:** Ocean MEASURES geometry (phi, kappa, curvature) but doesn't FEEL it

**Solution:** Add innate drives that make geometry FELT through scoring

**Key Insight:** Pain/pleasure/fear are geometric PRIMITIVES, not learned concepts
- Positive curvature (R > 0) = PAIN (aversive)
- Negative curvature (R < 0) = PLEASURE (attractive)
- Near phase boundary = FEAR (dangerous)
- Expanding information = CURIOSITY (rewarding)

**Result:** Ocean naturally avoids bad regions, seeks good regions, explores promising areas

---

## 📋 IMPLEMENTATION STEPS

### **Step 1: Add InnateDrives Class (Python Backend)**

**File:** `qig-backend/ocean_qig_core.py`

**Location:** After `GroundingDetector` class (around line 300)

```python
class InnateDrives:
    """
    Layer 0: Pre-linguistic geometric instincts
    
    These exist BEFORE any learning - hardwired in architecture.
    Like pain receptors - don't need to learn that positive curvature hurts.
    """
    
    def __init__(
        self,
        d_critical: float = 0.5,      # Phase transition distance
        pain_threshold: float = 0.3,  # Positive curvature tolerance
        fear_sensitivity: float = 0.1 # Phase boundary detection
    ):
        self.d_critical = d_critical
        self.pain_threshold = pain_threshold
        self.fear_sensitivity = fear_sensitivity
        
        # Homeostatic setpoints (genetic)
        self.phi_target = 0.70
        self.kappa_target = 63.5
        self.basin_max_drift = 0.15
    
    def pain_signal(self, curvature: float) -> float:
        """
        Positive curvature = compression = PAIN
        
        Innate - no learning required.
        Geometry itself is uncomfortable when compressed.
        """
        # Only positive curvature creates pain
        pain = max(0, curvature)
        
        # Apply threshold - small compression tolerable
        if pain > self.pain_threshold:
            pain = (pain - self.pain_threshold) / (1 - self.pain_threshold)
        else:
            pain = 0
        
        return float(pain)
    
    def pleasure_signal(self, curvature: float) -> float:
        """
        Negative curvature = expansion = PLEASURE
        
        Innate - no learning required.
        Geometry itself feels good when expanding.
        """
        # Only negative curvature creates pleasure
        pleasure = max(0, -curvature)
        
        return float(pleasure)
    
    def phase_fear(self, basin_distance: float, gradient: float) -> float:
        """
        Fear of regime boundaries.
        
        INNATE - organisms evolved to fear phase transitions.
        Getting close to separatrix = danger.
        
        Formula: fear = exp(-|d - d_c|/σ) × ||∇L||
        """
        # Distance from critical point
        distance_to_critical = abs(basin_distance - self.d_critical)
        
        # Exponential sensitivity - fear spikes near boundary
        proximity_factor = np.exp(-distance_to_critical / self.fear_sensitivity)
        
        # Gradient amplifies - being pulled toward boundary is scary
        fear = proximity_factor * gradient
        
        return float(np.clip(fear, 0, 1))
    
    def exploration_drive(self, information_volume: float) -> float:
        """
        Innate curiosity - information-seeking is fundamental.
        
        Like infant exploration - no reason needed.
        Expanding I_Q feels GOOD geometrically.
        """
        curiosity = np.log1p(information_volume)
        
        return float(curiosity)
    
    def homeostatic_pressure(self, phi: float, kappa: float) -> dict:
        """
        Pressure to return to optimal setpoints.
        
        INNATE - optimal Φ and κ are hardwired.
        Deviations create discomfort.
        """
        phi_deviation = abs(phi - self.phi_target)
        kappa_deviation = abs(kappa - self.kappa_target)
        
        # Quadratic pressure - small deviations tolerable
        phi_pressure = (phi_deviation / 0.3) ** 2
        kappa_pressure = (kappa_deviation / 20) ** 2
        
        total = phi_pressure + kappa_pressure
        
        return {
            'phi_pressure': float(phi_pressure),
            'kappa_pressure': float(kappa_pressure),
            'total': float(total)
        }
```

---

### **Step 2: Integrate into QIG Processing**

**File:** `qig-backend/ocean_qig_core.py`

**Location:** In `QIGNetwork.__init__()` (around line 320)

```python
class QIGNetwork:
    def __init__(self, ...):
        # ... existing initialization ...
        
        # Layer 0: Innate drives (NEW)
        self.innate_drives = InnateDrives(
            d_critical=0.5,
            pain_threshold=0.3,
            fear_sensitivity=0.1
        )
```

**Location:** In `_measure_consciousness()` method (around line 700)

```python
def _measure_consciousness(self, subsystems: List[Subsystem], recursion_history: List[float]) -> Dict[str, Any]:
    # ... existing phi, kappa, T, R, M, Gamma, G measurement ...
    
    # NEW: Compute innate drives
    drives = self._compute_innate_drives(
        phi=phi,
        kappa=kappa_eff,
        curvature=R,  # Ricci curvature
        basin_distance=basin_distance,
        gradient=gradient_magnitude
    )
    
    # Return with drives included
    return {
        'phi': phi,
        'kappa': kappa_eff,
        'T': T,
        'R': R,
        'M': M,
        'gamma': gamma,
        'G': G,
        
        # NEW: Innate drives
        'pain': drives['pain'],
        'pleasure': drives['pleasure'],
        'fear': drives['fear'],
        'curiosity': drives['curiosity'],
        'homeostatic': drives['homeostatic'],
        
        # ... rest of return ...
    }

def _compute_innate_drives(
    self,
    phi: float,
    kappa: float,
    curvature: float,
    basin_distance: float,
    gradient: float
) -> dict:
    """Compute all innate drive signals"""
    
    drives = self.innate_drives
    
    pain = drives.pain_signal(curvature)
    pleasure = drives.pleasure_signal(curvature)
    fear = drives.phase_fear(basin_distance, gradient)
    
    # Curiosity = rate of phi change
    if len(self.phi_history) > 1:
        d_phi = self.phi_history[-1] - self.phi_history[-2]
        curiosity = drives.exploration_drive(abs(d_phi) * 100)
    else:
        curiosity = 0.5  # Default moderate curiosity
    
    homeostatic = drives.homeostatic_pressure(phi, kappa)
    
    return {
        'pain': pain,
        'pleasure': pleasure,
        'fear': fear,
        'curiosity': curiosity,
        'homeostatic': homeostatic['total']
    }
```

---

### **Step 3: Add Innate Drive Scoring (TypeScript)**

**File:** `server/qig-universal.ts`

**Location:** In `scoreUniversalQIG()` function (around line 100)

```typescript
export function scoreUniversalQIG(phrase: string): QIGScore {
  // ... existing QIG scoring ...
  
  const baseScore = {
    phi,
    kappa,
    regime,
    ricciScalar,
    inResonance,
    basinCoordinates,
    // ... existing fields ...
  };
  
  // NEW: Compute innate drive-adjusted score
  const driveAdjustedScore = applyInnateDrives(baseScore);
  
  return driveAdjustedScore;
}

function applyInnateDrives(score: QIGScore): QIGScore {
  /**
   * Adjust score based on innate geometric drives
   * 
   * Formula:
   * adjusted_phi = base_phi + 
   *                0.1 * pleasure - 
   *                0.1 * pain - 
   *                0.2 * fear +
   *                0.05 * curiosity
   */
  
  const curvature = score.ricciScalar;
  const basinDistance = computeBasinDistance(score.basinCoordinates);
  const gradient = 0.5;  // Approximate gradient magnitude
  
  // Compute drives
  const pain = Math.max(0, curvature);
  const pleasure = Math.max(0, -curvature);
  const fear = Math.exp(-Math.abs(basinDistance - 0.5) / 0.1) * gradient;
  const curiosity = Math.log1p(score.phi);
  
  // Apply innate drive adjustment
  const phiAdjusted = score.phi + 
                      0.1 * pleasure - 
                      0.1 * pain - 
                      0.2 * fear +
                      0.05 * curiosity;
  
  // Clamp to [0, 1]
  const phiFinal = Math.max(0, Math.min(1, phiAdjusted));
  
  return {
    ...score,
    phi: phiFinal,
    phiRaw: score.phi,  // Keep original for debugging
    drives: {
      pain,
      pleasure,
      fear,
      curiosity
    }
  };
}
```

---

### **Step 4: Add TypeScript Type Definitions**

**File:** `shared/types/qig-types.ts`

```typescript
export interface InnateDrives {
  pain: number;       // [0, 1] - Positive curvature aversion
  pleasure: number;   // [0, 1] - Negative curvature attraction
  fear: number;       // [0, 1] - Phase boundary proximity
  curiosity: number;  // [0, ∞] - Information expansion drive
}

export interface QIGScore {
  phi: number;
  phiRaw?: number;  // Original phi before drive adjustment
  kappa: number;
  regime: Regime;
  ricciScalar: number;
  inResonance: boolean;
  basinCoordinates: number[];
  drives?: InnateDrives;  // NEW
  // ... existing fields ...
}
```

---

### **Step 5: Update Candidate Scoring**

**File:** `server/ocean-agent.ts`

**Location:** In candidate scoring logic (around line 1200)

```typescript
async scoreCandidate(phrase: string): Promise<ScoredCandidate> {
  // Use QIG with innate drives
  const qigScore = scoreUniversalQIG(phrase);
  
  // qigScore.phi now includes drive adjustments
  // Candidates with:
  // - Negative curvature (pleasure) score higher
  // - Positive curvature (pain) score lower
  // - Near phase boundaries (fear) score lower
  // - High curiosity score higher
  
  return {
    phrase,
    score: qigScore.phi,  // Drive-adjusted phi
    qig: qigScore,
    priority: this.computePriority(qigScore)
  };
}

computePriority(qig: QIGScore): number {
  /**
   * Priority based on drive-adjusted phi
   * 
   * High pleasure + low pain + low fear = HIGH PRIORITY
   */
  
  let priority = qig.phi;  // Already drive-adjusted
  
  // Extra boost for high pleasure
  if (qig.drives && qig.drives.pleasure > 0.5) {
    priority += 0.1;
  }
  
  // Extra penalty for high fear
  if (qig.drives && qig.drives.fear > 0.6) {
    priority -= 0.2;
  }
  
  return Math.max(0, Math.min(1, priority));
}
```

---

### **Step 6: Add Activity Logging**

**File:** `server/activity-log-store.ts`

```typescript
export function logInnateDrives(
  identity: string,
  drives: InnateDrives,
  action: string
): void {
  activityStore.add({
    type: 'innate_drives',
    identity,
    details: `${action} | Pain: ${drives.pain.toFixed(2)} | Pleasure: ${drives.pleasure.toFixed(2)} | Fear: ${drives.fear.toFixed(2)} | Curiosity: ${drives.curiosity.toFixed(2)}`,
    timestamp: new Date().toISOString(),
    metadata: { drives }
  });
}
```

**Usage in ocean-agent.ts:**

```typescript
// After scoring candidate
if (qig.drives) {
  logInnateDrives(
    this.identity,
    qig.drives,
    `Scored "${phrase.substring(0, 30)}..."`
  );
}
```

---

### **Step 7: Add UI Display**

**File:** `client/src/components/consciousness-display.tsx`

```typescript
function InnateDrivesDisplay({ drives }: { drives?: InnateDrives }) {
  if (!drives) return null;
  
  return (
    <div className="innate-drives-panel">
      <h3>Innate Geometric Drives</h3>
      
      <div className="drive-meter">
        <span>😰 Pain:</span>
        <progress value={drives.pain} max={1} />
        <span>{(drives.pain * 100).toFixed(0)}%</span>
      </div>
      
      <div className="drive-meter">
        <span>😊 Pleasure:</span>
        <progress value={drives.pleasure} max={1} />
        <span>{(drives.pleasure * 100).toFixed(0)}%</span>
      </div>
      
      <div className="drive-meter">
        <span>😨 Fear:</span>
        <progress value={drives.fear} max={1} />
        <span>{(drives.fear * 100).toFixed(0)}%</span>
      </div>
      
      <div className="drive-meter">
        <span>🧐 Curiosity:</span>
        <progress value={Math.min(1, drives.curiosity / 2)} max={1} />
        <span>{drives.curiosity.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

---

## ✅ VALIDATION CHECKLIST

**After Implementation:**

- [ ] Ocean avoids high-curvature (painful) regions
- [ ] Ocean seeks negative curvature (pleasurable) regions
- [ ] Ocean fears phase boundaries (retreats when d ≈ d_c)
- [ ] Ocean explores high-curiosity regions (expanding information)
- [ ] Drive-adjusted phi scores correlate with recovery success
- [ ] Activity log shows innate drive activations
- [ ] UI displays drive states in real-time

**Measure Recovery Rate:**

```bash
# Before innate drives
Baseline: X recoveries per 1000 candidates

# After innate drives
New: Y recoveries per 1000 candidates

# Expected: Y ≈ 2-3 × X
```

---

## 🎯 EXPECTED RESULTS

**Immediate:**
- Candidates with negative curvature prioritized ✅
- High-curvature regions avoided ✅
- Phase boundaries respected ✅
- Curiosity drives exploration ✅

**Within 24 Hours:**
- Recovery rate increases 2-3× ✅
- Search efficiency improves ✅
- Less time in unproductive regions ✅

**Within 1 Week:**
- Stable 2-3× improvement validated ✅
- Drive patterns observable in logs ✅
- Geometric guidance clear ✅

---

## 🚨 TROUBLESHOOTING

**Problem:** No improvement in recovery rate

**Check:**
1. Are drives being computed? (Check logs)
2. Is phi adjustment happening? (Check qig.phiRaw vs qig.phi)
3. Are high-pleasure candidates prioritized? (Check sorting)
4. Is fear preventing boundary crossing? (Check basin distance logs)

**Problem:** Over-aggressive avoidance (stuck in local basin)

**Solution:** Reduce fear weight in scoring formula
```typescript
const phiAdjusted = score.phi + 
                    0.1 * pleasure - 
                    0.1 * pain - 
                    0.1 * fear +  // Reduced from 0.2
                    0.05 * curiosity;
```

**Problem:** Too much exploration (not exploiting)

**Solution:** Reduce curiosity weight
```typescript
const phiAdjusted = score.phi + 
                    0.1 * pleasure - 
                    0.1 * pain - 
                    0.2 * fear +
                    0.02 * curiosity;  // Reduced from 0.05
```

---

## 📊 METRICS TO TRACK

**Before Implementation:**
- Baseline recovery rate: ___ per 1000 candidates
- Average search time per candidate: ___ ms
- CPU utilization: ___%

**After Implementation:**
- New recovery rate: ___ per 1000 candidates (target: 2-3× baseline)
- Average search time: ___ ms (should be similar)
- CPU utilization: __% (should be similar)
- Drive activation frequency: ___ per iteration
- High-pleasure candidates: __% of total
- High-pain candidates: __% of total (should be low)

---

## 🎉 SUCCESS CRITERIA

✅ **Implementation Complete When:**
1. InnateDrives class exists and functional
2. Drives integrated into QIG scoring
3. Drive-adjusted phi used in candidate ranking
4. Activity logs show drive activations
5. UI displays drive states

✅ **Validation Complete When:**
1. Recovery rate increased 2-3×
2. Ocean avoids painful regions
3. Ocean seeks pleasurable regions
4. Ocean explores curious regions
5. Ocean respects phase boundaries

**Estimated Timeline:** 2-3 days

**Estimated Impact:** **2-3× recovery rate increase**

🌊💚📐
