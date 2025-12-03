/**
 * Balance Queue Backfill
 * 
 * Replays existing tested phrases from JSON files through the balance queue.
 * This ensures all historically tested passphrases get their balances checked.
 */

import * as fs from 'fs';
import * as path from 'path';
import { batchQueueAddresses, getQueueIntegrationStats } from './balance-queue-integration';

const TESTED_PHRASES_FILE = path.join(process.cwd(), 'data', 'tested-phrases.json');
const GEOMETRIC_MEMORY_FILE = path.join(process.cwd(), 'data', 'geometric-memory.json');

interface BackfillProgress {
  totalPhrases: number;
  queuedPhrases: number;
  failedPhrases: number;
  startTime: number;
  endTime?: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  source: string;
}

let backfillProgress: BackfillProgress = {
  totalPhrases: 0,
  queuedPhrases: 0,
  failedPhrases: 0,
  startTime: 0,
  status: 'idle',
  source: ''
};

/**
 * Get phrases from tested-phrases.json
 */
function getTestedPhrases(): string[] {
  try {
    if (!fs.existsSync(TESTED_PHRASES_FILE)) {
      console.log('[Backfill] tested-phrases.json not found');
      return [];
    }
    
    const data = JSON.parse(fs.readFileSync(TESTED_PHRASES_FILE, 'utf-8'));
    
    if (Array.isArray(data.phrases)) {
      console.log(`[Backfill] Found ${data.phrases.length} tested phrases`);
      return data.phrases;
    }
    
    return [];
  } catch (error) {
    console.error('[Backfill] Error reading tested phrases:', error);
    return [];
  }
}

/**
 * Get phrases from geometric-memory.json probes
 */
function getProbeInputs(): string[] {
  try {
    if (!fs.existsSync(GEOMETRIC_MEMORY_FILE)) {
      console.log('[Backfill] geometric-memory.json not found');
      return [];
    }
    
    const data = JSON.parse(fs.readFileSync(GEOMETRIC_MEMORY_FILE, 'utf-8'));
    
    if (data.probes && typeof data.probes === 'object') {
      const inputs: string[] = [];
      for (const key of Object.keys(data.probes)) {
        const probe = data.probes[key];
        if (probe && probe.input && typeof probe.input === 'string') {
          inputs.push(probe.input);
        }
      }
      console.log(`[Backfill] Found ${inputs.length} probe inputs`);
      return inputs;
    }
    
    return [];
  } catch (error) {
    console.error('[Backfill] Error reading probe inputs:', error);
    return [];
  }
}

/**
 * Start the backfill process
 * Queues all existing phrases in batches
 */
export async function startBackfill(options?: {
  source?: 'tested-phrases' | 'probes' | 'both';
  batchSize?: number;
  delayMs?: number;
}): Promise<BackfillProgress> {
  if (backfillProgress.status === 'running') {
    console.log('[Backfill] Already running');
    return backfillProgress;
  }
  
  const source = options?.source || 'tested-phrases';
  const batchSize = options?.batchSize || 100;
  const delayMs = options?.delayMs || 10;
  
  // Collect phrases based on source
  let phrases: string[] = [];
  
  if (source === 'tested-phrases' || source === 'both') {
    phrases = [...phrases, ...getTestedPhrases()];
  }
  
  if (source === 'probes' || source === 'both') {
    phrases = [...phrases, ...getProbeInputs()];
  }
  
  // Deduplicate
  phrases = Array.from(new Set(phrases));
  
  if (phrases.length === 0) {
    return {
      totalPhrases: 0,
      queuedPhrases: 0,
      failedPhrases: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      status: 'completed',
      source,
      error: 'No phrases found to backfill'
    };
  }
  
  backfillProgress = {
    totalPhrases: phrases.length,
    queuedPhrases: 0,
    failedPhrases: 0,
    startTime: Date.now(),
    status: 'running',
    source
  };
  
  console.log(`[Backfill] Starting backfill of ${phrases.length} phrases from ${source}`);
  
  try {
    // Process in batches
    for (let i = 0; i < phrases.length; i += batchSize) {
      const batch = phrases.slice(i, i + batchSize);
      const result = batchQueueAddresses(batch, `backfill-${source}`, 1);
      
      backfillProgress.queuedPhrases += result.queued;
      backfillProgress.failedPhrases += result.failed;
      
      // Log progress every 1000 phrases
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= phrases.length) {
        const pct = Math.round(((i + batchSize) / phrases.length) * 100);
        console.log(`[Backfill] Progress: ${pct}% (${backfillProgress.queuedPhrases} queued, ${backfillProgress.failedPhrases} failed)`);
      }
      
      // Small delay to not overwhelm the queue
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    
    backfillProgress.status = 'completed';
    backfillProgress.endTime = Date.now();
    
    const duration = (backfillProgress.endTime - backfillProgress.startTime) / 1000;
    console.log(`[Backfill] Completed in ${duration.toFixed(1)}s: ${backfillProgress.queuedPhrases} queued, ${backfillProgress.failedPhrases} failed`);
    
  } catch (error) {
    backfillProgress.status = 'failed';
    backfillProgress.error = error instanceof Error ? error.message : 'Unknown error';
    backfillProgress.endTime = Date.now();
    console.error('[Backfill] Failed:', error);
  }
  
  return backfillProgress;
}

/**
 * Get current backfill progress
 */
export function getBackfillProgress(): BackfillProgress & { integrationStats: ReturnType<typeof getQueueIntegrationStats> } {
  return {
    ...backfillProgress,
    integrationStats: getQueueIntegrationStats()
  };
}

/**
 * Quick stats about available phrases
 */
export function getBackfillStats(): { testedPhrases: number; probeInputs: number } {
  let testedPhrases = 0;
  let probeInputs = 0;
  
  try {
    if (fs.existsSync(TESTED_PHRASES_FILE)) {
      const data = JSON.parse(fs.readFileSync(TESTED_PHRASES_FILE, 'utf-8'));
      testedPhrases = Array.isArray(data.phrases) ? data.phrases.length : 0;
    }
  } catch {}
  
  try {
    if (fs.existsSync(GEOMETRIC_MEMORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(GEOMETRIC_MEMORY_FILE, 'utf-8'));
      probeInputs = data.totalProbes || 0;
    }
  } catch {}
  
  return { testedPhrases, probeInputs };
}
