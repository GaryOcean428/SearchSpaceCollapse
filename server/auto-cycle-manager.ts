import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";

export interface AutoCycleState {
  enabled: boolean;
  currentIndex: number;
  addressIds: string[];
  lastCycleTime: string | null;
  totalCycles: number;
  currentAddressId: string | null;
  pausedUntil: string | null;
  // Session quality tracking for gates
  lastSessionMetrics: SessionMetrics | null;
  consecutiveZeroPassSessions: number;
  rateLimitBackoffUntil: string | null;
}

/**
 * Session metrics for quality gates
 */
export interface SessionMetrics {
  explorationPasses: number;
  hypothesesTested: number;
  nearMisses: number;
  pantheonConsulted: boolean;
  duration: number; // ms
  completedAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "auto-cycle-state.json");

// Development mode detection
const IS_DEV = process.env.NODE_ENV === "development";
// ALWAYS auto-resume on restart - user requested always-on behavior
const AUTO_RESUME_ON_RESTART = true;
// Longer check interval in development to reduce CPU usage
const CHECK_INTERVAL = IS_DEV ? 15000 : 5000; // 15s in dev, 5s in prod
// ALWAYS_ON mode - system must run continuously, cannot be disabled
// Ensures the system auto-restarts if somehow stopped
const ALWAYS_ON = true;

// Session quality gates
const ZERO_PASS_PAUSE_MS = 30000; // 30s pause after 0-pass session
const MAX_CONSECUTIVE_ZERO_PASS = 3; // Force longer pause after 3 consecutive 0-pass
const EXTENDED_PAUSE_MS = 120000; // 2min pause after repeated failures
const MIN_EXPLORATION_PASSES = 1; // Minimum passes for session to count as "explored"

class AutoCycleManager {
  private state: AutoCycleState;
  private onCycleCallback:
    | ((addressId: string, address: string) => Promise<void>)
    | null = null;
  private isCurrentlyRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private guardianInterval: NodeJS.Timeout | null = null;

  // Session start time for duration tracking
  private sessionStartTime: number | null = null;

  // Callback for session metrics (set by session manager)
  private onSessionMetricsCallback: (() => SessionMetrics | null) | null = null;

  // Throttle counter for "no metrics" warning (reduce log spam)
  private noMetricsWarningCount = 0;

  constructor() {
    this.state = this.loadState();
    console.log(
      `[AutoCycleManager] Initialized - enabled=${this.state.enabled}, currentIndex=${this.state.currentIndex}`
    );
    console.log(
      `[AutoCycleManager] Mode: ${
        IS_DEV ? "DEVELOPMENT (reduced frequency)" : "PRODUCTION"
      }`
    );
    if (ALWAYS_ON) {
      console.log(
        `[AutoCycleManager] ALWAYS-ON mode enabled - system will auto-restart if stopped`
      );
    }

    // Start the check loop if auto-cycle was enabled before restart
    if (this.state.enabled) {
      // On restart, if we have a stale currentAddressId but no active session,
      // clear it so the cycle can resume
      if (this.state.currentAddressId) {
        console.log(
          `[AutoCycleManager] Clearing stale currentAddressId after restart`
        );
        this.state.currentAddressId = null;
        this.isCurrentlyRunning = false;
        this.saveState();
      }

      // Always auto-resume on server restart
      this.startCheckLoop();

      // Trigger the cycle to resume after Python backend has time to start
      // Python starts 5s after server ready, then needs ~5-10s to be fully available
      setTimeout(async () => {
        if (this.state.enabled && !this.isCurrentlyRunning) {
          console.log(
            `[AutoCycleManager] Resuming auto-cycle after server restart`
          );
          await this.triggerNextCycle();
        }
      }, 15000);
    } else {
      // If not enabled, try to auto-enable on first startup
      console.log(
        `[AutoCycleManager] Auto-cycle not enabled - will auto-enable on startup`
      );
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
        console.log(
          "[AutoCycleManager] 🔄 ALWAYS-ON: System not running, auto-restarting..."
        );

        // Re-enable the system
        if (!this.state.enabled) {
          await this.enable();
        } else if (!this.checkInterval) {
          this.startCheckLoop();
        }
      }
    }, 30000); // Check every 30 seconds

    console.log("[AutoCycleManager] Always-on guardian started");
  }

  private async autoEnableOnStartup(): Promise<void> {
    try {
      const result = await this.enable();
      if (result.success) {
        console.log(
          `[AutoCycleManager] Auto-enabled on startup: ${result.message}`
        );
        // Trigger first cycle
        if (!this.isCurrentlyRunning) {
          await this.triggerNextCycle();
        }
      } else {
        console.log(
          `[AutoCycleManager] Could not auto-enable: ${result.message}`
        );
      }
    } catch (error) {
      console.error("[AutoCycleManager] Error during auto-enable:", error);
    }
  }

  private loadState(): AutoCycleState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        const parsed = JSON.parse(data);
        console.log(
          `[AutoCycleManager] Loaded state from disk: enabled=${parsed.enabled}`
        );
        return parsed;
      }
    } catch (error) {
      console.error("[AutoCycleManager] Error loading state:", error);
    }

    return {
      enabled: false,
      currentIndex: 0,
      addressIds: [],
      lastCycleTime: null,
      totalCycles: 0,
      currentAddressId: null,
      pausedUntil: null,
      lastSessionMetrics: null,
      consecutiveZeroPassSessions: 0,
      rateLimitBackoffUntil: null,
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
      console.error("[AutoCycleManager] Error saving state:", error);
    }
  }

  setOnCycleCallback(
    callback: (addressId: string, address: string) => Promise<void>
  ): void {
    this.onCycleCallback = callback;
  }

  async enable(): Promise<{ success: boolean; message: string }> {
    // Load fresh address list from storage
    const addresses = await storage.getTargetAddresses();

    if (addresses.length === 0) {
      return {
        success: false,
        message:
          "No target addresses configured. Add at least one address first.",
      };
    }

    this.state.enabled = true;
    this.state.addressIds = addresses.map((a) => a.id);
    this.state.currentIndex = 0;
    this.state.pausedUntil = null;
    this.saveState();

    console.log(
      `[AutoCycleManager] Enabled with ${addresses.length} addresses`
    );

    this.startCheckLoop();

    // Trigger the first address immediately
    await this.triggerNextCycle();

    return {
      success: true,
      message: `Auto-cycle enabled. Starting with address 1 of ${addresses.length}.`,
    };
  }

  disable(): { success: boolean; message: string } {
    if (ALWAYS_ON) {
      console.log(
        `[AutoCycleManager] ⚠️ Disable request ignored - ALWAYS_ON mode is enabled`
      );
      console.log(
        `[AutoCycleManager] System must run continuously to process all target addresses`
      );
      return {
        success: false,
        message: "System is in ALWAYS-ON mode and cannot be disabled.",
      };
    }

    this.state.enabled = false;
    this.state.currentAddressId = null;
    this.saveState();

    this.stopCheckLoop();

    console.log(`[AutoCycleManager] Disabled`);

    return {
      success: true,
      message: "Auto-cycle disabled.",
    };
  }

  private startCheckLoop(): void {
    if (this.checkInterval) return;

    // Check interval based on environment (30s in dev, 5s in prod)
    this.checkInterval = setInterval(async () => {
      await this.checkAndTrigger();
    }, CHECK_INTERVAL);

    console.log(
      `[AutoCycleManager] Check loop started (interval: ${
        CHECK_INTERVAL / 1000
      }s)`
    );
  }

  private stopCheckLoop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("[AutoCycleManager] Check loop stopped");
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
      // Pause ended - reset counters to prevent immediate re-pause
      console.log(
        `[AutoCycleManager] Pause ended - resetting zero-pass counter`
      );
      this.state.pausedUntil = null;
      this.state.consecutiveZeroPassSessions = 0;
      this.state.lastSessionMetrics = null; // Clear stale metrics
      this.saveState();
    }

    // If no current address is running, trigger the next one
    if (!this.state.currentAddressId) {
      await this.triggerNextCycle();
    }
  }

  private async triggerNextCycle(): Promise<void> {
    if (!this.state.enabled || !this.onCycleCallback) return;
    if (this.state.addressIds.length === 0) {
      console.log("[AutoCycleManager] No addresses to cycle through");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SESSION QUALITY GATES - Prevent rapid cycling without actual exploration
    // ═══════════════════════════════════════════════════════════════════════

    // GATE 1: Check rate limit backoff
    if (this.state.rateLimitBackoffUntil) {
      const backoffEnd = new Date(this.state.rateLimitBackoffUntil);
      if (backoffEnd > new Date()) {
        const remainingMs = backoffEnd.getTime() - Date.now();
        console.log(
          `[AutoCycleManager] ⏸️ Rate limit backoff active - ${Math.ceil(
            remainingMs / 1000
          )}s remaining`
        );
        return;
      }
      this.state.rateLimitBackoffUntil = null;
    }

    // GATE 2: Check if previous session had zero exploration passes
    if (this.state.lastSessionMetrics) {
      const lastMetrics = this.state.lastSessionMetrics;

      if (lastMetrics.explorationPasses < MIN_EXPLORATION_PASSES) {
        this.state.consecutiveZeroPassSessions++;

        // Extended pause after repeated failures
        if (
          this.state.consecutiveZeroPassSessions >= MAX_CONSECUTIVE_ZERO_PASS
        ) {
          console.log(
            `[AutoCycleManager] ⚠️ ${
              this.state.consecutiveZeroPassSessions
            } consecutive zero-pass sessions - extended pause (${
              EXTENDED_PAUSE_MS / 1000
            }s)`
          );
          this.state.pausedUntil = new Date(
            Date.now() + EXTENDED_PAUSE_MS
          ).toISOString();
          // Clear metrics so we don't re-trigger on same data after pause
          this.state.lastSessionMetrics = null;
          this.saveState();
          return;
        }

        // Standard pause after zero-pass session
        console.log(
          `[AutoCycleManager] ⏸️ Previous session had ${
            lastMetrics.explorationPasses
          } passes - pausing ${ZERO_PASS_PAUSE_MS / 1000}s`
        );
        await this.delay(ZERO_PASS_PAUSE_MS);
      } else {
        // Reset consecutive counter on successful exploration
        this.state.consecutiveZeroPassSessions = 0;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════

    // Refresh address list in case addresses were added/removed
    const addresses = await storage.getTargetAddresses();
    if (addresses.length === 0) {
      console.log("[AutoCycleManager] Address list is now empty, disabling");
      this.disable();
      return;
    }

    this.state.addressIds = addresses.map((a) => a.id);

    // Wrap index if needed
    if (this.state.currentIndex >= this.state.addressIds.length) {
      this.state.currentIndex = 0;
      this.state.totalCycles++;
      console.log(
        `[AutoCycleManager] Completed cycle ${this.state.totalCycles}, starting new cycle`
      );
    }

    const addressId = this.state.addressIds[this.state.currentIndex];
    const targetAddress = addresses.find((a) => a.id === addressId);

    if (!targetAddress) {
      console.log(
        `[AutoCycleManager] Address ${addressId} not found, advancing to next`
      );
      this.state.currentIndex++;
      this.saveState();
      return;
    }

    this.state.currentAddressId = addressId;
    this.isCurrentlyRunning = true;
    this.sessionStartTime = Date.now(); // Track session start
    this.saveState();

    console.log(
      `[AutoCycleManager] Starting investigation for address ${
        this.state.currentIndex + 1
      }/${this.state.addressIds.length}: ${
        targetAddress.label || targetAddress.address.slice(0, 16)
      }`
    );

    try {
      await this.onCycleCallback(addressId, targetAddress.address);
    } catch (error) {
      console.error("[AutoCycleManager] Error in cycle callback:", error);
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Set callback to get session metrics from session manager
   */
  setSessionMetricsCallback(callback: () => SessionMetrics | null): void {
    this.onSessionMetricsCallback = callback;
  }

  /**
   * Report session metrics (called by session manager)
   */
  reportSessionMetrics(metrics: SessionMetrics): void {
    this.state.lastSessionMetrics = metrics;
    console.log(
      `[AutoCycleManager] 📊 Session metrics: passes=${metrics.explorationPasses}, hypotheses=${metrics.hypothesesTested}, nearMisses=${metrics.nearMisses}, pantheon=${metrics.pantheonConsulted}`
    );
  }

  /**
   * Report rate limit hit - triggers backoff
   */
  reportRateLimitHit(backoffMs: number = 60000): void {
    this.state.rateLimitBackoffUntil = new Date(
      Date.now() + backoffMs
    ).toISOString();
    console.log(
      `[AutoCycleManager] ⚠️ Rate limit hit - backing off for ${
        backoffMs / 1000
      }s`
    );
    this.saveState();
  }

  // Called when a session completes (from session manager)
  async onSessionComplete(
    addressId: string,
    metrics?: SessionMetrics
  ): Promise<void> {
    console.log(`[AutoCycleManager] Session complete for ${addressId}`);

    // Calculate session duration
    const duration = this.sessionStartTime
      ? Date.now() - this.sessionStartTime
      : 0;
    this.sessionStartTime = null;

    // Collect session metrics if provided or via callback
    let sessionMetrics: SessionMetrics | undefined = metrics;
    if (!sessionMetrics && this.onSessionMetricsCallback) {
      const callbackMetrics = this.onSessionMetricsCallback();
      if (callbackMetrics) {
        sessionMetrics = callbackMetrics;
      }
    }

    // Store metrics with duration
    if (sessionMetrics) {
      this.state.lastSessionMetrics = {
        ...sessionMetrics,
        duration,
        completedAt: new Date().toISOString(),
      };
      console.log(
        `[AutoCycleManager] 📊 Session metrics recorded: ${sessionMetrics.explorationPasses} passes, ${sessionMetrics.hypothesesTested} hypotheses`
      );
    } else {
      // Default metrics if none provided (assume 0 passes - will trigger gate)
      this.state.lastSessionMetrics = {
        explorationPasses: 0,
        hypothesesTested: 0,
        nearMisses: 0,
        pantheonConsulted: false,
        duration,
        completedAt: new Date().toISOString(),
      };
      // Throttle this warning - only log every 10th occurrence
      this.noMetricsWarningCount++;
      if (this.noMetricsWarningCount === 1 || this.noMetricsWarningCount % 10 === 0) {
        console.log(
          `[AutoCycleManager] ⚠️ No session metrics provided - defaulting to 0 passes (${this.noMetricsWarningCount} total)`
        );
      }
    }

    this.isCurrentlyRunning = false;
    this.state.currentAddressId = null;
    this.state.lastCycleTime = new Date().toISOString();

    // Trigger balance queue drain at end of cycle (non-blocking)
    this.drainBalanceQueue().catch((err) => {
      console.error("[AutoCycleManager] Balance queue drain error:", err);
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
      const { balanceQueue } = await import("./balance-queue");

      const stats = balanceQueue.getStats();
      if (stats.pending === 0) {
        console.log("[AutoCycleManager] No pending addresses in balance queue");
        return;
      }

      console.log(
        `[AutoCycleManager] Draining balance queue: ${stats.pending} addresses pending`
      );

      // Drain in background - limit to 200 addresses per cycle to avoid long delays
      const result = await balanceQueue.drain({ maxAddresses: 200 });

      console.log(
        `[AutoCycleManager] Balance queue drained: ${result.checked} checked, ${result.hits} hits`
      );
    } catch (error) {
      console.error("[AutoCycleManager] Balance queue drain error:", error);
    }
  }

  // Called when a session is manually stopped
  onSessionStopped(): void {
    this.isCurrentlyRunning = false;
    this.state.currentAddressId = null;
    this.saveState();
    console.log("[AutoCycleManager] Session stopped (manual)");
  }

  getStatus(): {
    enabled: boolean;
    currentIndex: number;
    totalAddresses: number;
    currentAddressId: string | null;
    isRunning: boolean;
    totalCycles: number;
    lastCycleTime: string | null;
    pausedUntil: string | null;
    consecutiveZeroPassSessions: number;
    lastSessionMetrics: SessionMetrics | null;
  } {
    return {
      enabled: this.state.enabled,
      currentIndex: this.state.currentIndex,
      totalAddresses: this.state.addressIds.length,
      currentAddressId: this.state.currentAddressId,
      isRunning: this.isCurrentlyRunning,
      totalCycles: this.state.totalCycles,
      lastCycleTime: this.state.lastCycleTime,
      pausedUntil: this.state.pausedUntil,
      consecutiveZeroPassSessions: this.state.consecutiveZeroPassSessions,
      lastSessionMetrics: this.state.lastSessionMetrics,
    };
  }

  // For UI: Get current position string like "3/7"
  getPositionString(): string {
    if (!this.state.enabled) return "Off";
    if (this.state.addressIds.length === 0) return "No addresses";
    return `${this.state.currentIndex + 1}/${this.state.addressIds.length}`;
  }

  /**
   * Force resume - clears all pause states and triggers next cycle
   * Use when system is stuck in pause loop
   */
  async forceResume(): Promise<{ success: boolean; message: string }> {
    console.log(`[AutoCycleManager] 🔧 Force resume requested`);

    // Clear all pause-related state
    this.state.pausedUntil = null;
    this.state.consecutiveZeroPassSessions = 0;
    this.state.lastSessionMetrics = null;
    this.state.rateLimitBackoffUntil = null;
    this.state.currentAddressId = null;
    this.isCurrentlyRunning = false;
    this.saveState();

    // Ensure check loop is running
    if (!this.checkInterval) {
      this.startCheckLoop();
    }

    // Trigger next cycle immediately
    await this.triggerNextCycle();

    return {
      success: true,
      message: `Force resumed. Cleared pause state and triggered next cycle.`,
    };
  }
}

export const autoCycleManager = new AutoCycleManager();
