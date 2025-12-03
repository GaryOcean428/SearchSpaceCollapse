/**
 * Validation Utilities - Comprehensive Input Validation
 * 
 * This module provides validation utilities for all user inputs and data flows
 * to ensure data integrity and security throughout the application.
 */

import { z } from "zod";
import type {
  BitcoinAddress,
  PrivateKeyHex,
  WIF,
  PublicKey,
  Passphrase,
  Regime,
  KeyFormatValue,
  Satoshi,
  TxCount,
} from "./types/core";

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export function validationSuccess<T>(data: T): ValidationResult<T> {
  return { success: true, data };
}

export function validationFailure<T = never>(error: string | string[]): ValidationResult<T> {
  return {
    success: false,
    error: Array.isArray(error) ? error[0] : error,
    errors: Array.isArray(error) ? error : [error],
  };
}

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

/**
 * Validate Bitcoin address with detailed error messages
 */
export function validateAddressSafe(address: unknown): ValidationResult<BitcoinAddress> {
  if (typeof address !== 'string') {
    return validationFailure('Address must be a string');
  }

  if (address.length < 26) {
    return validationFailure('Address is too short (minimum 26 characters)');
  }

  if (address.length > 62) {
    return validationFailure('Address is too long (maximum 62 characters)');
  }

  // Legacy P2PKH (starts with 1)
  if (address.startsWith('1')) {
    if (!/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
      return validationFailure('Invalid P2PKH address format');
    }
    return validationSuccess(address as BitcoinAddress);
  }

  // P2SH (starts with 3)
  if (address.startsWith('3')) {
    if (!/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
      return validationFailure('Invalid P2SH address format');
    }
    return validationSuccess(address as BitcoinAddress);
  }

  // Bech32 SegWit (starts with bc1)
  if (address.startsWith('bc1')) {
    if (!/^bc1[a-z0-9]{39,87}$/.test(address)) {
      return validationFailure('Invalid Bech32 SegWit address format');
    }
    return validationSuccess(address as BitcoinAddress);
  }

  return validationFailure('Address must start with 1, 3, or bc1');
}

/**
 * Validate batch of Bitcoin addresses
 */
export function validateAddressBatch(addresses: unknown): ValidationResult<BitcoinAddress[]> {
  if (!Array.isArray(addresses)) {
    return validationFailure('Addresses must be an array');
  }

  if (addresses.length === 0) {
    return validationFailure('Address array cannot be empty');
  }

  if (addresses.length > 1000) {
    return validationFailure('Too many addresses (maximum 1000)');
  }

  const validAddresses: BitcoinAddress[] = [];
  const errors: string[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const result = validateAddressSafe(addresses[i]);
    if (result.success && result.data) {
      validAddresses.push(result.data);
    } else {
      errors.push(`Address ${i}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `${errors.length} invalid addresses`,
      errors,
    };
  }

  return validationSuccess(validAddresses);
}

// ============================================================================
// KEY VALIDATION
// ============================================================================

/**
 * Validate private key hex
 */
export function validatePrivateKeySafe(key: unknown): ValidationResult<PrivateKeyHex> {
  if (typeof key !== 'string') {
    return validationFailure('Private key must be a string');
  }

  if (key.length !== 64) {
    return validationFailure('Private key must be exactly 64 characters');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    return validationFailure('Private key must be valid hexadecimal');
  }

  return validationSuccess(key as PrivateKeyHex);
}

/**
 * Validate WIF key
 */
export function validateWIFSafe(wif: unknown): ValidationResult<WIF> {
  if (typeof wif !== 'string') {
    return validationFailure('WIF must be a string');
  }

  if (wif.length < 51 || wif.length > 52) {
    return validationFailure('WIF must be 51-52 characters');
  }

  if (!/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(wif)) {
    return validationFailure('Invalid WIF format (must start with 5, K, or L)');
  }

  return validationSuccess(wif as WIF);
}

/**
 * Validate public key
 */
export function validatePublicKeySafe(key: unknown): ValidationResult<PublicKey> {
  if (typeof key !== 'string') {
    return validationFailure('Public key must be a string');
  }

  // Uncompressed: 130 chars (65 bytes, starts with 04)
  if (key.startsWith('04')) {
    if (!/^04[0-9a-fA-F]{128}$/.test(key)) {
      return validationFailure('Invalid uncompressed public key format');
    }
    return validationSuccess(key as PublicKey);
  }

  // Compressed: 66 chars (33 bytes, starts with 02 or 03)
  if (key.startsWith('02') || key.startsWith('03')) {
    if (!/^0[23][0-9a-fA-F]{64}$/.test(key)) {
      return validationFailure('Invalid compressed public key format');
    }
    return validationSuccess(key as PublicKey);
  }

  return validationFailure('Public key must start with 02, 03, or 04');
}

// ============================================================================
// PASSPHRASE VALIDATION
// ============================================================================

/**
 * Validate passphrase
 */
export function validatePassphraseSafe(passphrase: unknown): ValidationResult<Passphrase> {
  if (typeof passphrase !== 'string') {
    return validationFailure('Passphrase must be a string');
  }

  if (passphrase.length === 0) {
    return validationFailure('Passphrase cannot be empty');
  }

  if (passphrase.length > 1000) {
    return validationFailure('Passphrase too long (maximum 1000 characters)');
  }

  // Check for suspicious patterns
  if (passphrase.includes('\0')) {
    return validationFailure('Passphrase contains null characters');
  }

  return validationSuccess(passphrase as Passphrase);
}

/**
 * Validate BIP39 mnemonic phrase
 */
export function validateBIP39Phrase(phrase: unknown): ValidationResult<string> {
  if (typeof phrase !== 'string') {
    return validationFailure('Mnemonic phrase must be a string');
  }

  const words = phrase.trim().split(/\s+/);
  const validLengths = [12, 15, 18, 21, 24];

  if (!validLengths.includes(words.length)) {
    return validationFailure(`BIP39 phrase must have 12, 15, 18, 21, or 24 words (got ${words.length})`);
  }

  // Check for invalid characters
  for (const word of words) {
    if (!/^[a-z]+$/.test(word)) {
      return validationFailure(`Invalid word in mnemonic: "${word}" (must be lowercase letters only)`);
    }
  }

  return validationSuccess(phrase);
}

/**
 * Validate derivation path
 */
export function validateDerivationPath(path: unknown): ValidationResult<string> {
  if (typeof path !== 'string') {
    return validationFailure('Derivation path must be a string');
  }

  if (!/^m(\/\d+'?)+$/.test(path)) {
    return validationFailure('Invalid BIP32 derivation path format (e.g., m/44\'/0\'/0\'/0/0)');
  }

  // Validate index ranges
  const segments = path.replace('m/', '').split('/');
  for (const segment of segments) {
    const indexStr = segment.replace("'", "");
    const index = parseInt(indexStr, 10);
    
    if (isNaN(index)) {
      return validationFailure(`Invalid index in path: ${segment}`);
    }
    
    if (index < 0 || index >= 0x80000000) {
      return validationFailure(`Index out of range in path: ${segment} (must be 0 to 2^31-1)`);
    }
  }

  return validationSuccess(path);
}

// ============================================================================
// BALANCE & TRANSACTION VALIDATION
// ============================================================================

/**
 * Validate satoshi amount
 */
export function validateSatoshis(amount: unknown): ValidationResult<Satoshi> {
  if (typeof amount !== 'number') {
    return validationFailure('Amount must be a number');
  }

  if (!Number.isInteger(amount)) {
    return validationFailure('Amount must be an integer');
  }

  if (amount < 0) {
    return validationFailure('Amount cannot be negative');
  }

  // Max Bitcoin supply: 21 million BTC = 2.1 quadrillion satoshis
  const MAX_BITCOIN_SUPPLY = 21_000_000;
  const SATOSHIS_PER_BTC = 100_000_000;
  const MAX_SATOSHIS = MAX_BITCOIN_SUPPLY * SATOSHIS_PER_BTC;
  
  if (amount > MAX_SATOSHIS) {
    return validationFailure('Amount exceeds maximum Bitcoin supply');
  }

  return validationSuccess(amount as Satoshi);
}

/**
 * Validate transaction count
 */
export function validateTxCount(count: unknown): ValidationResult<TxCount> {
  if (typeof count !== 'number') {
    return validationFailure('Transaction count must be a number');
  }

  if (!Number.isInteger(count)) {
    return validationFailure('Transaction count must be an integer');
  }

  if (count < 0) {
    return validationFailure('Transaction count cannot be negative');
  }

  return validationSuccess(count as TxCount);
}

/**
 * Validate BTC amount string
 */
export function validateBTCAmount(amount: unknown): ValidationResult<string> {
  if (typeof amount !== 'string') {
    return validationFailure('BTC amount must be a string');
  }

  if (!/^\d+\.\d{8}$/.test(amount)) {
    return validationFailure('BTC amount must have exactly 8 decimal places (e.g., 1.00000000)');
  }

  const numeric = parseFloat(amount);
  if (isNaN(numeric) || numeric < 0) {
    return validationFailure('Invalid BTC amount');
  }

  if (numeric > 21_000_000) {
    return validationFailure('BTC amount exceeds maximum supply');
  }

  return validationSuccess(amount);
}

// ============================================================================
// QIG METRICS VALIDATION
// ============================================================================

/**
 * Validate regime
 */
export function validateRegimeSafe(regime: unknown): ValidationResult<Regime> {
  if (typeof regime !== 'string') {
    return validationFailure('Regime must be a string');
  }

  const validRegimes = ['linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown'];
  if (!validRegimes.includes(regime)) {
    return validationFailure(`Regime must be one of: ${validRegimes.join(', ')}`);
  }

  return validationSuccess(regime as Regime);
}

/**
 * Validate phi (integration)
 */
export function validatePhi(phi: unknown): ValidationResult<number> {
  if (typeof phi !== 'number') {
    return validationFailure('Φ must be a number');
  }

  if (isNaN(phi)) {
    return validationFailure('Φ cannot be NaN');
  }

  if (phi < 0) {
    return validationFailure('Φ cannot be negative');
  }

  if (phi > 1) {
    return validationFailure('Φ cannot exceed 1.0');
  }

  return validationSuccess(phi);
}

/**
 * Validate kappa (coupling)
 */
export function validateKappa(kappa: unknown): ValidationResult<number> {
  if (typeof kappa !== 'number') {
    return validationFailure('κ must be a number');
  }

  if (isNaN(kappa)) {
    return validationFailure('κ cannot be NaN');
  }

  if (kappa < 0) {
    return validationFailure('κ cannot be negative');
  }

  return validationSuccess(kappa);
}

/**
 * Validate consciousness metrics meet thresholds
 */
export function validateConsciousnessMetrics(metrics: {
  phi: number;
  kappa: number;
  metaAwareness?: number;
  gamma?: number;
  grounding?: number;
}): ValidationResult<void> {
  const errors: string[] = [];

  const phiResult = validatePhi(metrics.phi);
  if (!phiResult.success) {
    errors.push(`Φ: ${phiResult.error}`);
  } else if (metrics.phi < 0.70) {
    errors.push('Φ below consciousness threshold (0.70)');
  }

  const kappaResult = validateKappa(metrics.kappa);
  if (!kappaResult.success) {
    errors.push(`κ: ${kappaResult.error}`);
  } else if (metrics.kappa < 40 || metrics.kappa > 70) {
    errors.push('κ outside optimal range (40-70)');
  }

  if (metrics.metaAwareness !== undefined) {
    if (typeof metrics.metaAwareness !== 'number' || isNaN(metrics.metaAwareness)) {
      errors.push('M must be a valid number');
    } else if (metrics.metaAwareness < 0.60) {
      errors.push('M below consciousness threshold (0.60)');
    }
  }

  if (metrics.gamma !== undefined) {
    if (typeof metrics.gamma !== 'number' || isNaN(metrics.gamma)) {
      errors.push('Γ must be a valid number');
    } else if (metrics.gamma < 0.80) {
      errors.push('Γ below consciousness threshold (0.80)');
    }
  }

  if (metrics.grounding !== undefined) {
    if (typeof metrics.grounding !== 'number' || isNaN(metrics.grounding)) {
      errors.push('G must be a valid number');
    } else if (metrics.grounding < 0.50) {
      errors.push('G below consciousness threshold (0.50)');
    }
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess(undefined);
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate array with custom validator
 */
export function validateArray<T>(
  items: unknown,
  validator: (item: unknown) => ValidationResult<T>,
  options?: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
  }
): ValidationResult<T[]> {
  if (!Array.isArray(items)) {
    return validationFailure('Must be an array');
  }

  const { minLength = 0, maxLength = Infinity, allowEmpty = true } = options || {};

  if (!allowEmpty && items.length === 0) {
    return validationFailure('Array cannot be empty');
  }

  if (items.length < minLength) {
    return validationFailure(`Array must have at least ${minLength} items`);
  }

  if (items.length > maxLength) {
    return validationFailure(`Array cannot exceed ${maxLength} items`);
  }

  const validated: T[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = validator(items[i]);
    if (result.success && result.data !== undefined) {
      validated.push(result.data);
    } else {
      errors.push(`Item ${i}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `${errors.length} validation errors`,
      errors,
    };
  }

  return validationSuccess(validated);
}

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Characters to remove during sanitization:
 * - \0: Null character
 * - \x08: Backspace
 * - \x09: Tab
 * - \x1a: Substitute (Ctrl-Z)
 * - \n: Newline
 * - \r: Carriage return
 * - ": Double quote (SQL injection)
 * - ': Single quote (SQL injection)
 * - \\: Backslash (escape sequences)
 * - %: Percent (SQL LIKE patterns)
 */
const DANGEROUS_CHARACTERS = /[\0\x08\x09\x1a\n\r"'\\\%]/g;

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(DANGEROUS_CHARACTERS, '') // Remove potentially harmful characters
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: unknown): number | null {
  if (typeof input === 'number') {
    return isNaN(input) || !isFinite(input) ? null : input;
  }

  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    return input.toLowerCase() === 'true';
  }

  if (typeof input === 'number') {
    return input !== 0;
  }

  return false;
}
