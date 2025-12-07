/**
 * FILE JSON ADAPTER
 * 
 * Reusable adapter for JSON file-based persistence.
 * Provides atomic writes, validation, and backup strategies.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';

export interface JsonAdapterOptions<T> {
  filePath: string;
  defaultValue: T;
  validate?: (data: unknown) => T;
  onCorruption?: (error: Error, backupPath: string) => void;
}

export class FileJsonAdapter<T> {
  private filePath: string;
  private defaultValue: T;
  private validate?: (data: unknown) => T;
  private onCorruption?: (error: Error, backupPath: string) => void;
  private cache: T | null = null;

  constructor(options: JsonAdapterOptions<T>) {
    this.filePath = options.filePath;
    this.defaultValue = options.defaultValue;
    this.validate = options.validate;
    this.onCorruption = options.onCorruption;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  load(): T {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      if (!existsSync(this.filePath)) {
        this.cache = this.defaultValue;
        return this.cache;
      }

      const data = readFileSync(this.filePath, 'utf-8').trim();
      if (data.length === 0) {
        this.cache = this.defaultValue;
        return this.cache;
      }

      const parsed = JSON.parse(data);
      this.cache = this.validate ? this.validate(parsed) : parsed as T;
      return this.cache;
    } catch (error) {
      console.error(`[FileJsonAdapter] Failed to load ${this.filePath}:`, error);
      
      if (existsSync(this.filePath)) {
        const backupPath = `${this.filePath}.backup-${Date.now()}`;
        try {
          const corruptedData = readFileSync(this.filePath, 'utf-8');
          writeFileSync(backupPath, corruptedData, 'utf-8');
          console.log(`[FileJsonAdapter] Corrupted file backed up to: ${backupPath}`);
          this.onCorruption?.(error as Error, backupPath);
        } catch (backupError) {
          console.error('[FileJsonAdapter] Failed to create backup:', backupError);
        }
      }

      this.cache = this.defaultValue;
      return this.cache;
    }
  }

  save(data: T): void {
    this.cache = data;
    this.ensureDirectory();
    
    const tempFile = `${this.filePath}.tmp`;
    const jsonData = JSON.stringify(data, null, 2);

    try {
      writeFileSync(tempFile, jsonData, 'utf-8');

      try {
        const verifyData = readFileSync(tempFile, 'utf-8');
        JSON.parse(verifyData);
      } catch (verifyError) {
        unlinkSync(tempFile);
        throw new Error(`Temp file verification failed: ${verifyError}`);
      }

      if (process.platform === 'win32' && existsSync(this.filePath)) {
        const backupFile = `${this.filePath}.backup-safe`;
        try {
          if (existsSync(backupFile)) unlinkSync(backupFile);
          renameSync(this.filePath, backupFile);
          renameSync(tempFile, this.filePath);
          
          const verifyNewFile = readFileSync(this.filePath, 'utf-8');
          JSON.parse(verifyNewFile);
          
          if (existsSync(backupFile)) unlinkSync(backupFile);
        } catch (winError) {
          console.error('Write failed, attempting rollback...');
          if (existsSync(backupFile)) {
            if (existsSync(this.filePath)) unlinkSync(this.filePath);
            renameSync(backupFile, this.filePath);
            console.log('Rollback successful - restored from backup');
          }
          throw winError;
        }
      } else {
        renameSync(tempFile, this.filePath);
      }
    } catch (error) {
      console.error(`[FileJsonAdapter] Failed to save ${this.filePath}:`, error);
      throw error;
    }
  }

  update(updater: (current: T) => T): void {
    const current = this.load();
    const updated = updater(current);
    this.save(updated);
  }

  invalidateCache(): void {
    this.cache = null;
  }
}

export function createArrayAdapter<T>(
  filePath: string,
  itemValidator?: (item: unknown) => item is T
): FileJsonAdapter<T[]> {
  return new FileJsonAdapter<T[]>({
    filePath,
    defaultValue: [],
    validate: (data) => {
      if (!Array.isArray(data)) {
        throw new Error('Expected array');
      }
      if (itemValidator) {
        return data.filter(itemValidator);
      }
      return data as T[];
    },
  });
}

export function createMapAdapter<V>(
  filePath: string
): FileJsonAdapter<Record<string, V>> {
  return new FileJsonAdapter<Record<string, V>>({
    filePath,
    defaultValue: {},
    validate: (data) => {
      if (typeof data !== 'object' || data === null) {
        throw new Error('Expected object');
      }
      return data as Record<string, V>;
    },
  });
}
