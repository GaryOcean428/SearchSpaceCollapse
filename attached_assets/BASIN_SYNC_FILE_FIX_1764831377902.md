# 🔧 BASIN SYNC FILE CREATION FIX
**Issue:** Basin sync creates many JSON files in dev environment  
**Expected:** Memory-efficient in-memory transfers  
**Impact:** Disk space, git noise, performance  
**Priority:** 🟡 HIGH

---

## 🎯 THE PROBLEM

**Current Behavior:**
```
data/basin-sync/
├── basin-ocean-123456789012-1733307600000.json  (26KB)
├── basin-ocean-123456789012-1733307660000.json  (26KB)
├── basin-ocean-123456789012-1733307720000.json  (26KB)
├── basin-ocean-123456789012-1733307780000.json  (26KB)
... (hundreds of files accumulate)
```

**Why This Happens:**
1. `saveBasinSnapshot()` called automatically during search
2. Every basin export creates a new timestamped file
3. No cleanup mechanism
4. Files accumulate indefinitely

**User Expectation:**
- Basin sync should be memory-efficient
- 2-4KB packets transferred in memory
- Minimal disk writes

---

## ✅ THE SOLUTION

**Design Intent (QIG Protocol):**
- Basin packets = **in-memory structures** (2-4KB)
- WebSocket/API transfer between instances
- File persistence = **optional** (dev/debug only)

**Fix Strategy:**
1. ✅ Make file persistence opt-in (not default)
2. ✅ Add auto-cleanup of old files (keep only last N)
3. ✅ Add memory-only mode for production
4. ✅ Add explicit save command for dev

---

## 📝 IMPLEMENTATION

### **Step 1: Add Configuration**

**File:** `server/ocean-basin-sync.ts`

**Add after class declaration:**
```typescript
interface BasinSyncConfig {
  persistToDisk: boolean;        // Enable file writes
  maxSnapshotsToKeep: number;    // Auto-cleanup threshold
  snapshotIntervalMs: number;    // Min time between saves
  autoCleanup: boolean;          // Clean old files automatically
}

class OceanBasinSync {
  private syncDir = path.join(process.cwd(), 'data', 'basin-sync');
  private version = '1.0.0';
  
  // NEW: Configuration
  private config: BasinSyncConfig = {
    persistToDisk: process.env.NODE_ENV === 'development', // Dev only by default
    maxSnapshotsToKeep: 10,                                // Keep only last 10
    snapshotIntervalMs: 300000,                            // 5 minutes minimum
    autoCleanup: true,                                     // Auto-delete old files
  };
  
  private lastSnapshotTime = 0;
  
  constructor() {
    this.ensureSyncDirectory();
    
    // Auto-cleanup on startup
    if (this.config.autoCleanup) {
      this.cleanupOldSnapshots();
    }
  }
  
  // NEW: Allow runtime configuration
  configure(config: Partial<BasinSyncConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[BasinSync] Configuration updated:', this.config);
  }
```

---

### **Step 2: Make File Persistence Optional**

**File:** `server/ocean-basin-sync.ts`

**Replace `saveBasinSnapshot()` method:**
```typescript
/**
 * Save basin snapshot to disk (OPTIONAL - only if configured)
 * 
 * By default, basin packets are transferred in-memory via WebSocket/API.
 * File persistence is for:
 * - Development/debugging
 * - Cross-session recovery
 * - Manual backup requests
 * 
 * NOT for routine operation.
 */
saveBasinSnapshot(packet: BasinSyncPacket, force = false): string | null {
  // Check if file persistence is enabled
  if (!force && !this.config.persistToDisk) {
    console.log('[BasinSync] File persistence disabled - packet in memory only');
    return null;
  }
  
  // Rate limiting - don't save too frequently
  const now = Date.now();
  if (!force && now - this.lastSnapshotTime < this.config.snapshotIntervalMs) {
    const remaining = Math.ceil((this.config.snapshotIntervalMs - (now - this.lastSnapshotTime)) / 1000);
    console.log(`[BasinSync] Snapshot rate limited - wait ${remaining}s`);
    return null;
  }
  
  this.ensureSyncDirectory();
  
  const filename = `basin-${packet.oceanId}-${Date.now()}.json`;
  const filepath = path.join(this.syncDir, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(packet, null, 2));
    this.lastSnapshotTime = now;
    
    console.log(`[BasinSync] Saved basin snapshot: ${filepath}`);
    console.log(`  Size: ${JSON.stringify(packet).length} bytes`);
    
    // Auto-cleanup old files if enabled
    if (this.config.autoCleanup) {
      this.cleanupOldSnapshots();
    }
    
    return filepath;
  } catch (error) {
    console.error('[BasinSync] Failed to save snapshot:', error);
    return null;
  }
}
```

---

### **Step 3: Add Auto-Cleanup**

**File:** `server/ocean-basin-sync.ts`

**Add new method:**
```typescript
/**
 * Cleanup old basin snapshots, keep only most recent N
 */
private cleanupOldSnapshots(): void {
  try {
    const files = fs.readdirSync(this.syncDir)
      .filter(f => f.startsWith('basin-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(this.syncDir, f),
        mtime: fs.statSync(path.join(this.syncDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Newest first
    
    if (files.length <= this.config.maxSnapshotsToKeep) {
      return; // Nothing to clean
    }
    
    // Delete oldest files beyond the keep limit
    const toDelete = files.slice(this.config.maxSnapshotsToKeep);
    
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.path);
        console.log(`[BasinSync] Cleaned up old snapshot: ${file.name}`);
      } catch (err) {
        console.error(`[BasinSync] Failed to delete ${file.name}:`, err);
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`[BasinSync] Cleanup complete: deleted ${toDelete.length} old snapshots, kept ${this.config.maxSnapshotsToKeep}`);
    }
  } catch (error) {
    console.error('[BasinSync] Cleanup error:', error);
  }
}

/**
 * Manual cleanup - delete all snapshots (useful for dev)
 */
cleanupAllSnapshots(): number {
  try {
    const files = fs.readdirSync(this.syncDir)
      .filter(f => f.startsWith('basin-') && f.endsWith('.json'));
    
    for (const file of files) {
      fs.unlinkSync(path.join(this.syncDir, file));
    }
    
    console.log(`[BasinSync] Deleted all ${files.length} snapshots`);
    return files.length;
  } catch (error) {
    console.error('[BasinSync] Cleanup all error:', error);
    return 0;
  }
}
```

---

### **Step 4: Update ocean-agent.ts Calls**

**File:** `server/ocean-agent.ts`

**Find the line that calls `saveBasinSnapshot()`:**
```typescript
oceanBasinSync.saveBasinSnapshot(packet);
```

**Replace with:**
```typescript
// Only save to disk if explicitly configured or in dev mode
// In production, packets are transferred via API/WebSocket only
if (process.env.BASIN_SYNC_PERSIST === 'true') {
  oceanBasinSync.saveBasinSnapshot(packet);
} else {
  // In-memory only - log packet size for monitoring
  console.log(`[Ocean] Basin packet ready (${JSON.stringify(packet).length} bytes, in-memory only)`);
}
```

---

### **Step 5: Add API Endpoints for Manual Control**

**File:** `server/routes.ts`

**Add new endpoints:**
```typescript
// Basin sync configuration
app.get('/api/basin-sync/config', (req, res) => {
  res.json({
    persistToDisk: oceanBasinSync['config'].persistToDisk,
    maxSnapshotsToKeep: oceanBasinSync['config'].maxSnapshotsToKeep,
    snapshotIntervalMs: oceanBasinSync['config'].snapshotIntervalMs,
    autoCleanup: oceanBasinSync['config'].autoCleanup,
  });
});

app.post('/api/basin-sync/config', (req, res) => {
  try {
    oceanBasinSync.configure(req.body);
    res.json({ success: true, config: oceanBasinSync['config'] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manual snapshot save (for dev/debugging)
app.post('/api/basin-sync/snapshot', async (req, res) => {
  try {
    const packet = oceanBasinSync.exportBasin(oceanAgent);
    const filepath = oceanBasinSync.saveBasinSnapshot(packet, true); // Force save
    
    if (filepath) {
      res.json({ 
        success: true, 
        filepath,
        size: JSON.stringify(packet).length 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Snapshot not saved (rate limited or disabled)' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old snapshots
app.post('/api/basin-sync/cleanup', (req, res) => {
  try {
    oceanBasinSync['cleanupOldSnapshots']();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all snapshots (dev only)
app.delete('/api/basin-sync/snapshots', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Only available in development' });
  }
  
  try {
    const count = oceanBasinSync['cleanupAllSnapshots']();
    res.json({ success: true, deleted: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### **Step 6: Add Environment Variables**

**File:** `.env.example`

**Add:**
```bash
# Basin Sync Configuration
BASIN_SYNC_PERSIST=false           # Enable file persistence (false = memory-only)
BASIN_SYNC_MAX_SNAPSHOTS=10        # Max snapshots to keep (auto-cleanup)
BASIN_SYNC_INTERVAL_MS=300000      # Min 5 minutes between saves
```

**File:** `.env` (for local dev)

```bash
# Development: Enable file persistence for debugging
BASIN_SYNC_PERSIST=true
BASIN_SYNC_MAX_SNAPSHOTS=5
```

---

### **Step 7: Update .gitignore**

**File:** `.gitignore`

**Ensure this line exists:**
```
# Basin sync files (dev only, not pushed)
data/basin-sync/
```

---

## 🧪 TESTING

### **Test 1: Memory-Only Mode (Production)**

```bash
# Set environment
export NODE_ENV=production
export BASIN_SYNC_PERSIST=false

# Start server
npm run dev

# Run investigation
# Watch logs - should see "in-memory only"
```

**Expected:**
```
[BasinSync] Exported basin packet:
[BasinSync] Size: 2847 bytes
[Ocean] Basin packet ready (2847 bytes, in-memory only)
```

**No files created in `data/basin-sync/`** ✅

---

### **Test 2: Dev Mode with Auto-Cleanup**

```bash
# Set environment
export NODE_ENV=development
export BASIN_SYNC_PERSIST=true
export BASIN_SYNC_MAX_SNAPSHOTS=5

# Start server
npm run dev

# Run multiple searches
# Should see files created but auto-cleaned
```

**Expected:**
```
[BasinSync] Saved basin snapshot: data/basin-sync/basin-ocean-123-1733307600000.json
[BasinSync] Cleanup complete: deleted 3 old snapshots, kept 5
```

**Only 5 most recent files exist** ✅

---

### **Test 3: Manual Snapshot (API)**

```bash
# Save snapshot explicitly
curl -X POST http://localhost:5000/api/basin-sync/snapshot

# Response:
{
  "success": true,
  "filepath": "/path/to/basin-ocean-123-1733307600000.json",
  "size": 2847
}
```

---

### **Test 4: Cleanup All (Dev)**

```bash
# Delete all snapshots
curl -X DELETE http://localhost:5000/api/basin-sync/snapshots

# Response:
{
  "success": true,
  "deleted": 15
}
```

---

## 📊 BEFORE vs AFTER

### **Before:**
```
❌ Every basin export creates file
❌ Hundreds of files accumulate
❌ No cleanup mechanism
❌ Git noise from untracked files
❌ Disk space waste
❌ Contradicts "memory efficient" design
```

### **After:**
```
✅ Memory-only by default (production)
✅ File persistence opt-in (dev only)
✅ Auto-cleanup keeps only last N files
✅ Rate limiting prevents file spam
✅ Manual control via API
✅ True memory-efficient design
✅ Clean development environment
```

---

## 🎯 CONFIGURATION MODES

### **Production (Recommended):**
```env
NODE_ENV=production
BASIN_SYNC_PERSIST=false    # Memory-only
```
**Result:** Zero file creation, all transfers in-memory

---

### **Development (Full Logging):**
```env
NODE_ENV=development
BASIN_SYNC_PERSIST=true
BASIN_SYNC_MAX_SNAPSHOTS=10
```
**Result:** Files created but auto-cleaned, keep last 10

---

### **Development (Minimal Logging):**
```env
NODE_ENV=development
BASIN_SYNC_PERSIST=true
BASIN_SYNC_MAX_SNAPSHOTS=3
```
**Result:** Only 3 most recent snapshots kept

---

### **Development (No Files):**
```env
NODE_ENV=development
BASIN_SYNC_PERSIST=false
```
**Result:** Same as production, memory-only

---

## 🚀 DEPLOYMENT CHECKLIST

**For Production:**
- [ ] Set `BASIN_SYNC_PERSIST=false` in production env
- [ ] Verify `data/basin-sync/` is in `.gitignore`
- [ ] Test that no files are created during operation
- [ ] Confirm WebSocket/API transfers work without files

**For Development:**
- [ ] Set `BASIN_SYNC_PERSIST=true` for debugging
- [ ] Set `BASIN_SYNC_MAX_SNAPSHOTS=5` or similar
- [ ] Run cleanup API call if needed
- [ ] Verify auto-cleanup works

**Migration (Clean Existing Files):**
```bash
# Delete all existing basin sync files
rm -rf data/basin-sync/*.json

# Or use API in dev mode
curl -X DELETE http://localhost:5000/api/basin-sync/snapshots
```

---

## 💡 DESIGN RATIONALE

**Why Memory-Only Default:**
1. Basin sync protocol = 2-4KB packets
2. WebSocket transfer = milliseconds
3. No need for disk persistence in normal operation
4. File I/O is slowest operation

**When to Use File Persistence:**
1. Development debugging (inspect packet contents)
2. Cross-session recovery (restart server with state)
3. Manual backup before risky operations
4. Forensic analysis of failed searches

**Why Auto-Cleanup:**
1. Dev files accumulate quickly (1 per minute = 1440/day)
2. Each file is 20-30KB (hundreds accumulate = MBs)
3. Old files have no value (basin state changes constantly)
4. Keep only recent history for debugging

---

## 🔍 MONITORING

**Check File Count:**
```bash
ls -1 data/basin-sync/ | wc -l
```

**Check Disk Usage:**
```bash
du -sh data/basin-sync/
```

**View Basin Sync Config:**
```bash
curl http://localhost:5000/api/basin-sync/config
```

**Monitor Logs:**
```bash
# Should see this in production:
[Ocean] Basin packet ready (2847 bytes, in-memory only)

# Should NOT see this in production:
[BasinSync] Saved basin snapshot: ...
```

---

## 📚 RELATED IMPROVEMENTS

**Future Enhancements:**
1. Redis-based basin cache (faster than files)
2. WebSocket streaming for real-time sync
3. Compression for large packets (gzip)
4. Distributed basin sync across network

---

**Basin sync optimized. Memory-efficient by default. Dev-friendly when needed.** 🌊💚📐
