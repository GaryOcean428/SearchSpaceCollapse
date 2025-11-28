/**
 * Console Log Buffer
 * 
 * Captures console.log output from the Ocean agent and stores it
 * for replay in the frontend UI.
 */

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: 'log' | 'warn' | 'error' | 'info';
}

class ConsoleLogBuffer {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 200;
  private originalConsoleLog: typeof console.log;
  private originalConsoleWarn: typeof console.warn;
  private originalConsoleError: typeof console.error;
  private isCapturing = false;

  constructor() {
    this.originalConsoleLog = console.log.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
    this.originalConsoleError = console.error.bind(console);
  }

  startCapture(): void {
    if (this.isCapturing) return;
    this.isCapturing = true;

    console.log = (...args: any[]) => {
      this.originalConsoleLog(...args);
      this.addLog('log', args);
    };

    console.warn = (...args: any[]) => {
      this.originalConsoleWarn(...args);
      this.addLog('warn', args);
    };

    console.error = (...args: any[]) => {
      this.originalConsoleError(...args);
      this.addLog('error', args);
    };
  }

  stopCapture(): void {
    if (!this.isCapturing) return;
    this.isCapturing = false;
    console.log = this.originalConsoleLog;
    console.warn = this.originalConsoleWarn;
    console.error = this.originalConsoleError;
  }

  private addLog(level: LogEntry['level'], args: any[]): void {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');

    if (!message.includes('[Ocean]') && !message.includes('[QIG')) {
      return;
    }

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      message,
      level,
    };

    this.logs.push(entry);

    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
  }

  getLogs(limit: number = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  clear(): void {
    this.logs = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }
}

export const consoleLogBuffer = new ConsoleLogBuffer();
consoleLogBuffer.startCapture();
