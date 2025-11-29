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

class AutoCycleManager {
  private state: AutoCycleState;
  private onCycleCallback: ((addressId: string, address: string) => Promise<void>) | null = null;
  private isCurrentlyRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = this.loadState();
    console.log(`[AutoCycleManager] Initialized - enabled=${this.state.enabled}, currentIndex=${this.state.currentIndex}`);
    
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
      
      this.startCheckLoop();
      
      // Trigger the cycle to resume after a short delay (allow server to initialize)
      setTimeout(async () => {
        if (this.state.enabled && !this.isCurrentlyRunning) {
          console.log(`[AutoCycleManager] Resuming auto-cycle after server restart`);
          await this.triggerNextCycle();
        }
      }, 3000);
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
    
    // Check every 5 seconds if we need to start a new cycle
    this.checkInterval = setInterval(async () => {
      await this.checkAndTrigger();
    }, 5000);
    
    console.log('[AutoCycleManager] Check loop started');
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
