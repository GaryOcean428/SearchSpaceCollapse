import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';

export interface AutoCycleState {
  enabled: boolean;
  currentIndex: number;
  addressIds: string[];
  lastCycleTime: string | null;
  totalCycles: number;
  currentAddressId: string | null;
  pausedUntil: string | null;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'auto-cycle-state.json');

// Development mode detection
const IS_DEV = process.env.NODE_ENV === 'development';
// ALWAYS auto-resume on restart - user requested always-on behavior
const AUTO_RESUME_ON_RESTART = true;
// Longer check interval in development to reduce CPU usage
const CHECK_INTERVAL = IS_DEV ? 15000 : 5000; // 15s in dev, 5s in prod
// ALWAYS_ON mode - system must run continuously, cannot be disabled
const ALWAYS_ON = true;

class AutoCycleManager {
  private state: AutoCycleState;
  private onCycleCallback: ((addressId: string, address: string) => Promise<void>) | null = null;
  private isCurrentlyRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private guardianInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = this.loadState();
    console.log(`[AutoCycleManager] Initialized - enabled=${this.state.enabled}, currentIndex=${this.state.currentIndex}`);
    console.log(`[AutoCycleManager] Mode: ${IS_DEV ? 'DEVELOPMENT (reduced frequency)' : 'PRODUCTION'}`);
    if (ALWAYS_ON) {
      console.log(`[AutoCycleManager] ALWAYS-ON mode enabled - system will auto-restart if stopped`);
    }
    
    // Start the check loop if auto-cycle was enabled before restart
    if (this.state.enabled) {
      // On restart, if we have a stale currentAddressId but no active session,
      // clear it so the cycle can resume
      if (this.state.currentAddressId) {
        console.log(`[AutoCycleManager] Clearing stale currentAddressId after restart`);
        this.state.currentAddressId = null;
        this.isCurrentlyRunning = false;
        this.saveState();
      }
      
      // Always auto-resume on server restart
      this.startCheckLoop();
      
      // Trigger the cycle to resume after a short delay (allow server to initialize)
      setTimeout(async () => {
        if (this.state.enabled && !this.isCurrentlyRunning) {
          console.log(`[AutoCycleManager] Resuming auto-cycle after server restart`);
          await this.triggerNextCycle();
        }
      }, 3000);
    } else {
      // If not enabled, try to auto-enable on first startup
      console.log(`[AutoCycleManager] Auto-cycle not yet enabled, will auto-enable on startup...`);
      setTimeout(async () => {
        await this.autoEnableOnStartup();
      }, 5000);
    }
    
    // Start the always-on guardian if ALWAYS_ON is enabled
    if (ALWAYS_ON) {
      this.startAlwaysOnGuardian();
    }
  }
  
  /**
   * Always-on guardian - ensures the auto-cycle system is ALWAYS running
   * Checks every 30 seconds and auto-enables/restarts if somehow stopped
   */
  private startAlwaysOnGuardian(): void {
    if (this.guardianInterval) {
      clearInterval(this.guardianInterval);
    }
    
    this.guardianInterval = setInterval(async () => {
      // If system should be on but isn't enabled or check loop isn't running
      if (!this.state.enabled || !this.checkInterval) {
        console.log('[AutoCycleManager] 🔄 ALWAYS-ON: System not running, auto-restarting...');
        
        // Re-enable the system
        if (!this.state.enabled) {
          await this.enable();
        } else if (!this.checkInterval) {
          this.startCheckLoop();
        }
      }
    }, 30000); // Check every 30 seconds
    
    console.log('[AutoCycleManager] Always-on guardian started');
  }
  
  private async autoEnableOnStartup(): Promise<void> {
    try {
      const result = await this.enable();
      if (result.success) {
        console.log(`[AutoCycleManager] Auto-enabled on startup: ${result.message}`);
        // Trigger first cycle
        if (!this.isCurrentlyRunning) {
          await this.triggerNextCycle();
        }
      } else {
        console.log(`[AutoCycleManager] Could not auto-enable: ${result.message}`);
      }
    } catch (error) {
      console.error('[AutoCycleManager] Error during auto-enable:', error);
    }
  }

  private loadState(): AutoCycleState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        console.log(`[AutoCycleManager] Loaded state from disk: enabled=${parsed.enabled}`);
        return parsed;
      }
    } catch (error) {
      console.error('[AutoCycleManager] Error loading state:', error);
    }
    
    return {
      enabled: false,
      currentIndex: 0,
      addressIds: [],
      lastCycleTime: null,
      totalCycles: 0,
      currentAddressId: null,
      pausedUntil: null,
    };
  }

  private saveState(): void {
    try {
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('[AutoCycleManager] Error saving state:', error);
    }
  }

  setOnCycleCallback(callback: (addressId: string, address: string) => Promise<void>): void {
    this.onCycleCallback = callback;
  }

  async enable(): Promise<{ success: boolean; message: string }> {
    // Load fresh address list from storage
    const addresses = await storage.getTargetAddresses();
    
    if (addresses.length === 0) {
      return { 
        success: false, 
        message: 'No target addresses configured. Add at least one address first.' 
      };
    }

    this.state.enabled = true;
    this.state.addressIds = addresses.map(a => a.id);
    this.state.currentIndex = 0;
    this.state.pausedUntil = null;
    this.saveState();

    console.log(`[AutoCycleManager] Enabled with ${addresses.length} addresses`);
    
    this.startCheckLoop();
    
    // Trigger the first address immediately
    await this.triggerNextCycle();

    return { 
      success: true, 
      message: `Auto-cycle enabled. Starting with address 1 of ${addresses.length}.` 
    };
  }

  disable(): { success: boolean; message: string } {
    if (ALWAYS_ON) {
      console.log(`[AutoCycleManager] ⚠️ Disable request ignored - ALWAYS_ON mode is enabled`);
      console.log(`[AutoCycleManager] System must run continuously to process all target addresses`);
      return {
        success: false,
        message: 'System is in ALWAYS-ON mode and cannot be disabled.'
      };
    }
    
    this.state.enabled = false;
    this.state.currentAddressId = null;
    this.saveState();
    
    this.stopCheckLoop();

    console.log(`[AutoCycleManager] Disabled`);

    return { 
      success: true, 
      message: 'Auto-cycle disabled.' 
    };
  }

  private startCheckLoop(): void {
    if (this.checkInterval) return;
    
    // Check interval based on environment (30s in dev, 5s in prod)
    this.checkInterval = setInterval(async () => {
      await this.checkAndTrigger();
    }, CHECK_INTERVAL);
    
    console.log(`[AutoCycleManager] Check loop started (interval: ${CHECK_INTERVAL/1000}s)`);
  }

  private stopCheckLoop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[AutoCycleManager] Check loop stopped');
    }
  }

  private async checkAndTrigger(): Promise<void> {
    if (!this.state.enabled || this.isCurrentlyRunning) return;
    
    // Check if paused
    if (this.state.pausedUntil) {
      const pauseEnd = new Date(this.state.pausedUntil);
      if (pauseEnd > new Date()) {
        return; // Still paused
      }
      this.state.pausedUntil = null;
    }

    // If no current address is running, trigger the next one
    if (!this.state.currentAddressId) {
      await this.triggerNextCycle();
    }
  }

  private async triggerNextCycle(): Promise<void> {
    if (!this.state.enabled || !this.onCycleCallback) return;
    if (this.state.addressIds.length === 0) {
      console.log('[AutoCycleManager] No addresses to cycle through');
      return;
    }

    // Refresh address list in case addresses were added/removed
    const addresses = await storage.getTargetAddresses();
    if (addresses.length === 0) {
      console.log('[AutoCycleManager] Address list is now empty, disabling');
      this.disable();
      return;
    }
    
    this.state.addressIds = addresses.map(a => a.id);
    
    // Wrap index if needed
    if (this.state.currentIndex >= this.state.addressIds.length) {
      this.state.currentIndex = 0;
      this.state.totalCycles++;
      console.log(`[AutoCycleManager] Completed cycle ${this.state.totalCycles}, starting new cycle`);
    }

    const addressId = this.state.addressIds[this.state.currentIndex];
    const targetAddress = addresses.find(a => a.id === addressId);
    
    if (!targetAddress) {
      console.log(`[AutoCycleManager] Address ${addressId} not found, advancing to next`);
      this.state.currentIndex++;
      this.saveState();
      return;
    }

    this.state.currentAddressId = addressId;
    this.isCurrentlyRunning = true;
    this.saveState();

    console.log(`[AutoCycleManager] Starting investigation for address ${this.state.currentIndex + 1}/${this.state.addressIds.length}: ${targetAddress.label || targetAddress.address.slice(0, 16)}`);

    try {
      await this.onCycleCallback(addressId, targetAddress.address);
    } catch (error) {
      console.error('[AutoCycleManager] Error in cycle callback:', error);
    }
  }

  // Called when a session completes (from session manager)
  async onSessionComplete(addressId: string): Promise<void> {
    console.log(`[AutoCycleManager] Session complete for ${addressId}`);
    
    this.isCurrentlyRunning = false;
    this.state.currentAddressId = null;
    this.state.lastCycleTime = new Date().toISOString();
    
    // Trigger balance queue drain at end of cycle (non-blocking)
    this.drainBalanceQueue().catch(err => {
      console.error('[AutoCycleManager] Balance queue drain error:', err);
    });
    
    if (this.state.enabled) {
      // Move to next address
      this.state.currentIndex++;
      this.saveState();
      
      // Small delay before starting next cycle (let system settle)
      setTimeout(async () => {
        if (this.state.enabled) {
          await this.triggerNextCycle();
        }
      }, 2000);
    } else {
      this.saveState();
    }
  }

  // Drain the balance queue to check all queued addresses
  private async drainBalanceQueue(): Promise<void> {
    try {
      const { balanceQueue } = await import('./balance-queue');
      
      const stats = balanceQueue.getStats();
      if (stats.pending === 0) {
        console.log('[AutoCycleManager] No pending addresses in balance queue');
        return;
      }
      
      console.log(`[AutoCycleManager] Draining balance queue: ${stats.pending} addresses pending`);
      
      // Drain in background - limit to 200 addresses per cycle to avoid long delays
      const result = await balanceQueue.drain({ maxAddresses: 200 });
      
      console.log(`[AutoCycleManager] Balance queue drained: ${result.checked} checked, ${result.hits} hits`);
    } catch (error) {
      console.error('[AutoCycleManager] Balance queue drain error:', error);
    }
  }

  // Called when a session is manually stopped
  onSessionStopped(): void {
    this.isCurrentlyRunning = false;
    this.state.currentAddressId = null;
    this.saveState();
    console.log('[AutoCycleManager] Session stopped (manual)');
  }

  getStatus(): {
    enabled: boolean;
    currentIndex: number;
    totalAddresses: number;
    currentAddressId: string | null;
    isRunning: boolean;
    totalCycles: number;
    lastCycleTime: string | null;
  } {
    return {
      enabled: this.state.enabled,
      currentIndex: this.state.currentIndex,
      totalAddresses: this.state.addressIds.length,
      currentAddressId: this.state.currentAddressId,
      isRunning: this.isCurrentlyRunning,
      totalCycles: this.state.totalCycles,
      lastCycleTime: this.state.lastCycleTime,
    };
  }

  // For UI: Get current position string like "3/7"
  getPositionString(): string {
    if (!this.state.enabled) return 'Off';
    if (this.state.addressIds.length === 0) return 'No addresses';
    return `${this.state.currentIndex + 1}/${this.state.addressIds.length}`;
  }
}

export const autoCycleManager = new AutoCycleManager();
