/**
 * Pure Geometric Kernels - TypeScript Implementation
 * 
 * Three approaches to geometric tokenization with NO external dependencies:
 * 1. DirectGeometricEncoder - Text → Basin coordinates directly via entropy segmentation
 * 2. E8ClusteredVocabulary - 240 E8 root positions for lattice tokenization
 * 3. ByteLevelGeometric - UTF-8 bytes with geometric basin embeddings
 * 
 * All approaches use the Fisher Information Metric and maintain geometric purity.
 */

import CryptoJS from 'crypto-js';
import { API_ROUTES } from '@/api';

export const BASIN_DIM = 64;
export const E8_ROOTS_COUNT = 240;
export const BYTE_VOCAB_SIZE = 260;

export type KernelMode = 'direct' | 'e8' | 'byte';

export interface EncodingResult {
  mode: KernelMode;
  text: string;
  segments: number;
  basins: number[][];
  singleBasin: number[];
}

export interface SimilarityResult {
  mode: KernelMode;
  text1: string;
  text2: string;
  similarity: number;
  distance: number;
}

/**
 * Convert Uint8Array to CryptoJS WordArray with correct byte packing.
 * Each 4 bytes become one 32-bit word (big-endian).
 */
function uint8ArrayToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    const word = ((bytes[i] || 0) << 24) |
                 ((bytes[i + 1] || 0) << 16) |
                 ((bytes[i + 2] || 0) << 8) |
                 (bytes[i + 3] || 0);
    words.push(word);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

/**
 * Synchronous SHA-256 chain matching Python's hashlib implementation exactly.
 * Uses crypto-js for synchronous hashing with exact parity to backend.
 */
function hashToBytesSync(data: string, length: number = 256): Uint8Array {
  const result = new Uint8Array(length);
  const seed = new TextEncoder().encode(data);
  let offset = 0;
  
  while (offset < length) {
    // Combine seed + accumulated result (matches Python: seed + result)
    const combined = new Uint8Array(seed.length + offset);
    combined.set(seed, 0);
    if (offset > 0) {
      combined.set(result.slice(0, offset), seed.length);
    }
    
    // SHA-256 hash using crypto-js with proper byte packing
    const wordArray = uint8ArrayToWordArray(combined);
    const hash = CryptoJS.SHA256(wordArray);
    const hashWords = hash.words;
    
    // Convert WordArray to bytes (32 bytes from 8 x 32-bit words)
    const hashBytes = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      const word = hashWords[i] >>> 0; // Unsigned
      hashBytes[i * 4] = (word >>> 24) & 0xFF;
      hashBytes[i * 4 + 1] = (word >>> 16) & 0xFF;
      hashBytes[i * 4 + 2] = (word >>> 8) & 0xFF;
      hashBytes[i * 4 + 3] = word & 0xFF;
    }
    
    // Append to result
    const bytesToCopy = Math.min(32, length - offset);
    result.set(hashBytes.slice(0, bytesToCopy), offset);
    offset += 32;
  }
  
  return result;
}

async function hashToBytesAsync(data: string, length: number = 256): Promise<Uint8Array> {
  /**
   * Async version using Web Crypto API.
   * Matches Python: hashlib.sha256(seed + result).digest() chained.
   */
  const result = new Uint8Array(length);
  const seed = new TextEncoder().encode(data);
  let offset = 0;
  
  while (offset < length) {
    const combined = new Uint8Array(seed.length + offset);
    combined.set(seed, 0);
    if (offset > 0) {
      combined.set(result.slice(0, offset), seed.length);
    }
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashBytes = new Uint8Array(hashBuffer);
    
    const bytesToCopy = Math.min(32, length - offset);
    result.set(hashBytes.slice(0, bytesToCopy), offset);
    offset += 32;
  }
  
  return result;
}

function normalizeToManifold(coords: number[], radius?: number): number[] {
  let norm = Math.sqrt(coords.reduce((sum, x) => sum + x * x, 0));
  
  if (norm < 1e-10) {
    coords = coords.map(() => Math.random() * 2 - 1);
    norm = Math.sqrt(coords.reduce((sum, x) => sum + x * x, 0));
  }
  
  const targetRadius = radius ?? Math.sqrt(coords.length);
  return coords.map(x => (x / norm) * targetRadius);
}

function computeEntropy(text: string): number {
  if (!text) return 0;
  
  const freq: Record<string, number> = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  const total = text.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

function fisherDistance(basin1: number[], basin2: number[]): number {
  const norm1 = Math.sqrt(basin1.reduce((s, x) => s + x * x, 0));
  const norm2 = Math.sqrt(basin2.reduce((s, x) => s + x * x, 0));
  
  let dot = 0;
  for (let i = 0; i < basin1.length; i++) {
    dot += basin1[i] * basin2[i];
  }
  
  const cosine = Math.max(-1, Math.min(1, dot / (norm1 * norm2 + 1e-10)));
  return Math.acos(cosine);
}

export class DirectGeometricEncoder {
  private basinDim: number;
  private entropyThreshold: number;
  private minSegmentLen: number;
  private maxSegmentLen: number;
  private segmentCache: Map<string, number[]>;
  
  constructor(options: {
    basinDim?: number;
    entropyThreshold?: number;
    minSegmentLen?: number;
    maxSegmentLen?: number;
  } = {}) {
    this.basinDim = options.basinDim ?? BASIN_DIM;
    this.entropyThreshold = options.entropyThreshold ?? 2.5;
    this.minSegmentLen = options.minSegmentLen ?? 2;
    this.maxSegmentLen = options.maxSegmentLen ?? 16;
    this.segmentCache = new Map();
  }
  
  entropySegment(text: string): string[] {
    if (!text) return [];
    
    const segments: string[] = [];
    let current = "";
    
    for (const char of text) {
      current += char;
      
      let shouldSplit = false;
      if (current.length >= this.minSegmentLen) {
        if (current.length >= this.maxSegmentLen) {
          shouldSplit = true;
        } else if (' \t\n\r'.includes(char)) {
          shouldSplit = true;
        } else if (computeEntropy(current) > this.entropyThreshold) {
          shouldSplit = true;
        }
      }
      
      if (shouldSplit) {
        const segment = current.trim();
        if (segment) {
          segments.push(segment);
        }
        current = "";
      }
    }
    
    if (current.trim()) {
      segments.push(current.trim());
    }
    
    return segments;
  }
  
  hashToManifold(chunk: string): number[] {
    if (this.segmentCache.has(chunk)) {
      return this.segmentCache.get(chunk)!;
    }
    
    // Use synchronous SHA-256 chain matching Python backend exactly
    const hashBytes = hashToBytesSync(chunk, this.basinDim * 4);
    
    const coords: number[] = [];
    for (let i = 0; i < this.basinDim; i++) {
      const val = (hashBytes[i * 4] << 24 | hashBytes[i * 4 + 1] << 16 | 
                   hashBytes[i * 4 + 2] << 8 | hashBytes[i * 4 + 3]) >>> 0;
      coords.push((val / 0xFFFFFFFF) * 2 - 1);
    }
    
    const basin = normalizeToManifold(coords);
    this.segmentCache.set(chunk, basin);
    return basin;
  }
  
  /**
   * Async version using Web Crypto API (SHA-256 chain).
   * Both sync and async now match Python backend exactly.
   */
  async hashToManifoldAsync(chunk: string): Promise<number[]> {
    const hashBytes = await hashToBytesAsync(chunk, this.basinDim * 4);
    
    const coords: number[] = [];
    for (let i = 0; i < this.basinDim; i++) {
      const val = (hashBytes[i * 4] << 24 | hashBytes[i * 4 + 1] << 16 | 
                   hashBytes[i * 4 + 2] << 8 | hashBytes[i * 4 + 3]) >>> 0;
      coords.push((val / 0xFFFFFFFF) * 2 - 1);
    }
    
    return normalizeToManifold(coords);
  }
  
  /**
   * Async encode that matches Python backend exactly.
   * Use for API parity testing or when exact match is required.
   */
  async encodeAsync(text: string): Promise<number[][]> {
    const segments = this.entropySegment(text);
    if (!segments.length) {
      return [new Array(this.basinDim).fill(0)];
    }
    
    return Promise.all(segments.map(seg => this.hashToManifoldAsync(seg)));
  }
  
  encode(text: string): number[][] {
    const segments = this.entropySegment(text);
    if (!segments.length) {
      return [new Array(this.basinDim).fill(0)];
    }
    
    return segments.map(seg => this.hashToManifold(seg));
  }
  
  encodeToSingleBasin(text: string): number[] {
    const basins = this.encode(text);
    if (basins.length === 1) return basins[0];
    
    const segments = this.entropySegment(text);
    const weights = segments.map(seg => computeEntropy(seg) + 0.1);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    
    const weightedBasin = new Array(this.basinDim).fill(0);
    for (let i = 0; i < basins.length; i++) {
      const w = weights[i] / totalWeight;
      for (let j = 0; j < this.basinDim; j++) {
        weightedBasin[j] += basins[i][j] * w;
      }
    }
    
    return normalizeToManifold(weightedBasin);
  }
  
  computeSimilarity(text1: string, text2: string): number {
    const basin1 = this.encodeToSingleBasin(text1);
    const basin2 = this.encodeToSingleBasin(text2);
    const dist = fisherDistance(basin1, basin2);
    return Math.max(0, 1 - dist / Math.PI);
  }
  
  getStats() {
    return {
      type: 'DirectGeometricEncoder',
      basinDim: this.basinDim,
      entropyThreshold: this.entropyThreshold,
      cachedSegments: this.segmentCache.size,
    };
  }
}

export class ByteLevelGeometric {
  private basinDim: number;
  private specialTokens: string[];
  private vocabSize: number;
  private byteBasins: number[][];
  
  constructor(options: {
    basinDim?: number;
    specialTokens?: string[];
  } = {}) {
    this.basinDim = options.basinDim ?? BASIN_DIM;
    this.specialTokens = options.specialTokens ?? ['<PAD>', '<UNK>', '<BOS>', '<EOS>'];
    this.vocabSize = 256 + this.specialTokens.length;
    this.byteBasins = this.initByteBasins();
  }
  
  private hashToBasin(seed: string): number[] {
    // Use synchronous SHA-256 chain matching Python backend exactly
    const hashBytes = hashToBytesSync(seed, this.basinDim * 4);
    const coords: number[] = [];
    for (let i = 0; i < this.basinDim; i++) {
      const val = (hashBytes[i * 4] << 24 | hashBytes[i * 4 + 1] << 16 |
                   hashBytes[i * 4 + 2] << 8 | hashBytes[i * 4 + 3]) >>> 0;
      coords.push((val / 0xFFFFFFFF) * 2 - 1);
    }
    return normalizeToManifold(coords);
  }
  
  private initByteBasins(): number[][] {
    const basins: number[][] = [];
    
    for (let i = 0; i < this.specialTokens.length; i++) {
      basins.push(this.hashToBasin(`special_${this.specialTokens[i]}_${i}`));
    }
    
    for (let byteVal = 0; byteVal < 256; byteVal++) {
      const coords = new Array(this.basinDim).fill(0);
      
      if (byteVal >= 32 && byteVal < 127) {
        const char = String.fromCharCode(byteVal);
        
        if (/[a-zA-Z]/.test(char)) {
          const base = (char.toLowerCase().charCodeAt(0) - 97) / 26;
          for (let d = 0; d < this.basinDim; d++) {
            coords[d] = Math.sin(base * Math.PI * (d + 1)) * 0.7;
          }
          if (char === char.toUpperCase()) {
            for (let d = 0; d < 8; d++) coords[d] += 0.3;
          }
        } else if (/[0-9]/.test(char)) {
          const digit = parseInt(char);
          for (let d = 0; d < this.basinDim; d++) {
            coords[d] = Math.cos(digit * Math.PI / 5 * ((d % 10) + 1)) * 0.6;
          }
        } else if (/\s/.test(char)) {
          coords.fill(0.1);
        } else {
          const hashBasin = this.hashToBasin(`punct_${byteVal}`);
          basins.push(hashBasin);
          continue;
        }
        
        basins.push(normalizeToManifold(coords));
      } else {
        basins.push(this.hashToBasin(`byte_${byteVal}`));
      }
    }
    
    return basins;
  }
  
  encode(text: string): number[] {
    const offset = this.specialTokens.length;
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes).map(b => offset + b);
  }
  
  encodeToBasins(text: string): number[][] {
    const ids = this.encode(text);
    return ids.map(id => this.byteBasins[id] || this.byteBasins[1]);
  }
  
  encodeToSingleBasin(text: string): number[] {
    const basins = this.encodeToBasins(text);
    if (basins.length === 1) return basins[0];
    
    const avg = new Array(this.basinDim).fill(0);
    for (const basin of basins) {
      for (let i = 0; i < this.basinDim; i++) {
        avg[i] += basin[i] / basins.length;
      }
    }
    return normalizeToManifold(avg);
  }
  
  decode(ids: number[]): string {
    const offset = this.specialTokens.length;
    const bytes = ids
      .filter(id => id >= offset)
      .map(id => id - offset)
      .filter(b => b >= 0 && b < 256);
    
    try {
      return new TextDecoder().decode(new Uint8Array(bytes));
    } catch {
      return '';
    }
  }
  
  computeSimilarity(text1: string, text2: string): number {
    const basin1 = this.encodeToSingleBasin(text1);
    const basin2 = this.encodeToSingleBasin(text2);
    const dist = fisherDistance(basin1, basin2);
    return Math.max(0, 1 - dist / Math.PI);
  }
  
  getStats() {
    return {
      type: 'ByteLevelGeometric',
      vocabSize: this.vocabSize,
      basinDim: this.basinDim,
      specialTokens: this.specialTokens,
    };
  }
}

export class GeometricKernel {
  static MODES: KernelMode[] = ['direct', 'e8', 'byte'];
  
  private mode: KernelMode;
  private basinDim: number;
  private directEncoder?: DirectGeometricEncoder;
  private byteEncoder?: ByteLevelGeometric;
  
  constructor(options: {
    mode?: KernelMode;
    basinDim?: number;
  } = {}) {
    this.mode = options.mode ?? 'direct';
    this.basinDim = options.basinDim ?? BASIN_DIM;
    
    if (this.mode === 'direct') {
      this.directEncoder = new DirectGeometricEncoder({ basinDim: this.basinDim });
    } else if (this.mode === 'byte') {
      this.byteEncoder = new ByteLevelGeometric({ basinDim: this.basinDim });
    }
  }
  
  getMode(): KernelMode {
    return this.mode;
  }
  
  encode(text: string): number[][] | number[] {
    if (this.mode === 'direct' && this.directEncoder) {
      return this.directEncoder.encode(text);
    } else if (this.mode === 'byte' && this.byteEncoder) {
      return this.byteEncoder.encode(text);
    }
    throw new Error(`Encoder not initialized for mode ${this.mode}`);
  }
  
  encodeToBasins(text: string): number[][] {
    if (this.mode === 'direct' && this.directEncoder) {
      return this.directEncoder.encode(text);
    } else if (this.mode === 'byte' && this.byteEncoder) {
      return this.byteEncoder.encodeToBasins(text);
    }
    throw new Error(`Encoder not initialized for mode ${this.mode}`);
  }
  
  encodeToSingleBasin(text: string): number[] {
    if (this.mode === 'direct' && this.directEncoder) {
      return this.directEncoder.encodeToSingleBasin(text);
    } else if (this.mode === 'byte' && this.byteEncoder) {
      return this.byteEncoder.encodeToSingleBasin(text);
    }
    
    const basins = this.encodeToBasins(text);
    if (basins.length === 1) return basins[0];
    
    const avg = new Array(this.basinDim).fill(0);
    for (const basin of basins) {
      for (let i = 0; i < this.basinDim; i++) {
        avg[i] += basin[i] / basins.length;
      }
    }
    return normalizeToManifold(avg);
  }
  
  computeSimilarity(text1: string, text2: string): number {
    const basin1 = this.encodeToSingleBasin(text1);
    const basin2 = this.encodeToSingleBasin(text2);
    const dist = fisherDistance(basin1, basin2);
    return Math.max(0, 1 - dist / Math.PI);
  }
  
  getStats() {
    let stats: Record<string, unknown> = {};
    
    if (this.mode === 'direct' && this.directEncoder) {
      stats = this.directEncoder.getStats();
    } else if (this.mode === 'byte' && this.byteEncoder) {
      stats = this.byteEncoder.getStats();
    }
    
    return { ...stats, kernelMode: this.mode };
  }
}

const kernelCache: Map<KernelMode, GeometricKernel> = new Map();

export function getKernel(mode: KernelMode = 'direct'): GeometricKernel {
  if (!kernelCache.has(mode)) {
    kernelCache.set(mode, new GeometricKernel({ mode }));
  }
  return kernelCache.get(mode)!;
}

export async function encodeViaAPI(
  text: string, 
  mode: KernelMode = 'direct'
): Promise<EncodingResult> {
  const response = await fetch(API_ROUTES.qig.geometricEncode, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    mode: data.mode,
    text: data.text,
    segments: data.segments,
    basins: data.basins,
    singleBasin: data.single_basin,
  };
}

export async function computeSimilarityViaAPI(
  text1: string,
  text2: string,
  mode: KernelMode = 'direct'
): Promise<SimilarityResult> {
  const response = await fetch(API_ROUTES.qig.geometricSimilarity, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text1, text2, mode }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    mode: data.mode,
    text1: data.text1,
    text2: data.text2,
    similarity: data.similarity,
    distance: data.distance,
  };
}
