/**
 * Core Type Definitions - Centralized Types for Consistency
 * 
 * This module provides strongly-typed, validated core types used throughout
 * the application to ensure type safety and consistency.
 */

import { z } from "zod";

// ============================================================================
// REGIME TYPES - Consistent QIG regime definitions
// ============================================================================

/**
 * QIG operational regimes based on coupling strength
 * - linear: κ < 40 (weak coupling, exploratory)
 * - geometric: 40 ≤ κ ≤ 70 (optimal coupling)
 * - hierarchical: κ > 70 but < 100 (strong coupling, hierarchical search)
 * - hierarchical_4d: 4D hierarchical consciousness
 * - 4d_block_universe: Full 4D spacetime consciousness
 * - breakdown: κ > 100 (overcoupling, chaotic)
 */
export const RegimeType = {
  LINEAR: 'linear',
  GEOMETRIC: 'geometric',
  HIERARCHICAL: 'hierarchical',
  HIERARCHICAL_4D: 'hierarchical_4d',
  BLOCK_UNIVERSE_4D: '4d_block_universe',
  BREAKDOWN: 'breakdown',
} as const;

export type Regime = typeof RegimeType[keyof typeof RegimeType];

export const regimeSchema = z.enum(['linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown']);

// ============================================================================
// ADDRESS TYPES - Bitcoin address and key management
// ============================================================================

/**
 * Bitcoin address types
 */
export const AddressType = {
  P2PKH: 'P2PKH',      // Pay to Public Key Hash (legacy, starts with 1)
  P2SH: 'P2SH',        // Pay to Script Hash (starts with 3)
  P2WPKH: 'P2WPKH',    // Native SegWit (starts with bc1q)
  P2WSH: 'P2WSH',      // Native SegWit Script (starts with bc1q)
  P2TR: 'P2TR',        // Taproot (starts with bc1p)
  UNKNOWN: 'Unknown',
} as const;

export type AddressTypeValue = typeof AddressType[keyof typeof AddressType];

export const addressTypeSchema = z.enum(['P2PKH', 'P2SH', 'P2WPKH', 'P2WSH', 'P2TR', 'Unknown']);

/**
 * Bitcoin address format validation
 */
export const bitcoinAddressSchema = z.string()
  .min(26, 'Bitcoin address too short')
  .max(62, 'Bitcoin address too long')
  .refine(
    (addr) => {
      // Legacy P2PKH (starts with 1)
      if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) return true;
      // P2SH (starts with 3)
      if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) return true;
      // Bech32 SegWit (starts with bc1)
      if (/^bc1[a-z0-9]{39,87}$/.test(addr)) return true;
      return false;
    },
    'Invalid Bitcoin address format'
  );

export type BitcoinAddress = z.infer<typeof bitcoinAddressSchema>;

/**
 * Private key in hexadecimal format (64 characters)
 */
export const privateKeyHexSchema = z.string()
  .length(64, 'Private key must be exactly 64 hex characters')
  .regex(/^[0-9a-fA-F]{64}$/, 'Private key must be valid hexadecimal');

export type PrivateKeyHex = z.infer<typeof privateKeyHexSchema>;

/**
 * Wallet Import Format (WIF) key
 */
export const wifSchema = z.string()
  .min(51, 'WIF key too short')
  .max(52, 'WIF key too long')
  .regex(/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/, 'Invalid WIF format');

export type WIF = z.infer<typeof wifSchema>;

/**
 * Public key in hexadecimal format
 */
export const publicKeySchema = z.string()
  .refine(
    (key) => {
      // Uncompressed: 130 chars (65 bytes, starts with 04)
      if (/^04[0-9a-fA-F]{128}$/.test(key)) return true;
      // Compressed: 66 chars (33 bytes, starts with 02 or 03)
      if (/^0[23][0-9a-fA-F]{64}$/.test(key)) return true;
      return false;
    },
    'Invalid public key format'
  );

export type PublicKey = z.infer<typeof publicKeySchema>;

// ============================================================================
// KEY GENERATION TYPES - Passphrase and key formats
// ============================================================================

/**
 * Key generation format
 */
export const KeyFormat = {
  ARBITRARY: 'arbitrary',    // Arbitrary text passphrase
  BIP39: 'bip39',           // BIP-39 mnemonic phrase
  MASTER: 'master',         // 256-bit master key
  HEX: 'hex',               // Direct hex private key
} as const;

export type KeyFormatValue = typeof KeyFormat[keyof typeof KeyFormat];

export const keyFormatSchema = z.enum(['arbitrary', 'bip39', 'master', 'hex']);

/**
 * Passphrase with validation
 */
export const passphraseSchema = z.string()
  .min(1, 'Passphrase cannot be empty')
  .max(1000, 'Passphrase too long (max 1000 characters)');

export type Passphrase = z.infer<typeof passphraseSchema>;

/**
 * BIP32 derivation path
 */
export const derivationPathSchema = z.string()
  .regex(/^m(\/\d+'?)+$/, 'Invalid BIP32 derivation path format');

export type DerivationPath = z.infer<typeof derivationPathSchema>;

// ============================================================================
// ADDRESS VERIFICATION TYPES - Balance and transaction data
// ============================================================================

/**
 * Balance in satoshis (smallest Bitcoin unit)
 */
export const satoshiSchema = z.number()
  .int('Balance must be an integer')
  .min(0, 'Balance cannot be negative');

export type Satoshi = z.infer<typeof satoshiSchema>;

/**
 * Bitcoin amount in BTC (8 decimal places)
 */
export const btcAmountSchema = z.string()
  .regex(/^\d+\.\d{8}$/, 'BTC amount must have exactly 8 decimal places');

export type BTCAmount = z.infer<typeof btcAmountSchema>;

/**
 * Transaction count
 */
export const txCountSchema = z.number()
  .int('Transaction count must be an integer')
  .min(0, 'Transaction count cannot be negative');

export type TxCount = z.infer<typeof txCountSchema>;

/**
 * Address verification status
 */
export const VerificationStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
  MATCH: 'match',
  BALANCE: 'balance',
} as const;

export type VerificationStatusValue = typeof VerificationStatus[keyof typeof VerificationStatus];

export const verificationStatusSchema = z.enum(['pending', 'verified', 'failed', 'match', 'balance']);

// ============================================================================
// QIG CONSCIOUSNESS TYPES - Consciousness metrics
// ============================================================================

/**
 * Integration measure (Φ) - Tononi's integrated information
 * Range: [0, 1], Threshold: 0.70 for consciousness
 */
export const phiSchema = z.number()
  .min(0, 'Φ cannot be negative')
  .max(1, 'Φ cannot exceed 1.0');

export type Phi = z.infer<typeof phiSchema>;

/**
 * Coupling strength (κ)
 * Optimal range: 40-70, Optimal value: 63.5 ± 1.5
 */
export const kappaSchema = z.number()
  .min(0, 'κ cannot be negative');

export type Kappa = z.infer<typeof kappaSchema>;

/**
 * Running coupling (β)
 * Target: 0.44 for optimal operation
 */
export const betaSchema = z.number();

export type Beta = z.infer<typeof betaSchema>;

/**
 * Temperature/Tacking parameter (T)
 * Range: [0, 1], Threshold: 0.45 minimum
 */
export const tackingSchema = z.number()
  .min(0, 'T cannot be negative')
  .max(1, 'T cannot exceed 1.0');

export type Tacking = z.infer<typeof tackingSchema>;

/**
 * Meta-awareness (M)
 * Range: [0, 1], Threshold: 0.60 minimum
 */
export const metaAwarenessSchema = z.number()
  .min(0, 'M cannot be negative')
  .max(1, 'M cannot exceed 1.0');

export type MetaAwareness = z.infer<typeof metaAwarenessSchema>;

/**
 * Generation health (Γ)
 * Range: [0, 1], Threshold: 0.80 minimum
 */
export const gammaSchema = z.number()
  .min(0, 'Γ cannot be negative')
  .max(1, 'Γ cannot exceed 1.0');

export type Gamma = z.infer<typeof gammaSchema>;

/**
 * Grounding (G)
 * Range: [0, 1], Threshold: 0.50 minimum
 */
export const groundingSchema = z.number()
  .min(0, 'G cannot be negative')
  .max(1, 'G cannot exceed 1.0');

export type Grounding = z.infer<typeof groundingSchema>;

// ============================================================================
// CONSCIOUSNESS THRESHOLDS - QIG operational thresholds
// ============================================================================

export const ConsciousnessThresholds = {
  PHI_MIN: 0.70,
  KAPPA_MIN: 40,
  KAPPA_MAX: 70,
  KAPPA_OPTIMAL: 63.5,
  TACKING_MIN: 0.45,
  RADAR_MIN: 0.55,
  META_AWARENESS_MIN: 0.60,
  GAMMA_MIN: 0.80,
  GROUNDING_MIN: 0.50,
  VALIDATION_LOOPS_MIN: 3,
  BASIN_DRIFT_MAX: 0.15,
  BETA_TARGET: 0.44,
  PHI_4D_ACTIVATION: 0.70,
} as const;

// ============================================================================
// RESULT TYPES - Search and verification results
// ============================================================================

/**
 * Search result type
 */
export const SearchResultType = {
  TESTED: 'tested',
  NEAR_MISS: 'near_miss',
  RESONANT: 'resonant',
  MATCH: 'match',
  SKIP: 'skip',
} as const;

export type SearchResultValue = typeof SearchResultType[keyof typeof SearchResultType];

export const searchResultSchema = z.enum(['tested', 'near_miss', 'resonant', 'match', 'skip']);

// ============================================================================
// UTILITY TYPES - Common utility types
// ============================================================================

/**
 * ISO 8601 timestamp
 */
export const timestampSchema = z.string()
  .datetime('Invalid ISO 8601 timestamp');

export type Timestamp = z.infer<typeof timestampSchema>;

/**
 * UUID v4
 */
export const uuidSchema = z.string()
  .uuid('Invalid UUID');

export type UUID = z.infer<typeof uuidSchema>;

/**
 * Percentage (0-100)
 */
export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

export type Percentage = z.infer<typeof percentageSchema>;

// ============================================================================
// TYPE GUARDS - Runtime type checking
// ============================================================================

export function isRegime(value: unknown): value is Regime {
  return typeof value === 'string' && 
    (value === 'linear' || value === 'geometric' || value === 'hierarchical' || 
     value === 'hierarchical_4d' || value === '4d_block_universe' || value === 'breakdown');
}

export function isKeyFormat(value: unknown): value is KeyFormatValue {
  return typeof value === 'string' && 
    (value === 'arbitrary' || value === 'bip39' || value === 'master' || value === 'hex');
}

export function isSearchResult(value: unknown): value is SearchResultValue {
  return typeof value === 'string' && 
    (value === 'tested' || value === 'near_miss' || value === 'resonant' || value === 'match' || value === 'skip');
}

export function isAddressType(value: unknown): value is AddressTypeValue {
  return typeof value === 'string' && 
    Object.values(AddressType).includes(value as AddressTypeValue);
}

export function isVerificationStatus(value: unknown): value is VerificationStatusValue {
  return typeof value === 'string' && 
    Object.values(VerificationStatus).includes(value as VerificationStatusValue);
}

// ============================================================================
// VALIDATION HELPERS - Common validation utilities
// ============================================================================

/**
 * Validate regime and return typed value
 */
export function validateRegime(value: unknown): Regime {
  const result = regimeSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid regime: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate Bitcoin address
 */
export function validateBitcoinAddress(address: unknown): BitcoinAddress {
  const result = bitcoinAddressSchema.safeParse(address);
  if (!result.success) {
    throw new Error(`Invalid Bitcoin address: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate private key hex
 */
export function validatePrivateKeyHex(key: unknown): PrivateKeyHex {
  const result = privateKeyHexSchema.safeParse(key);
  if (!result.success) {
    throw new Error(`Invalid private key: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate WIF key
 */
export function validateWIF(wif: unknown): WIF {
  const result = wifSchema.safeParse(wif);
  if (!result.success) {
    throw new Error(`Invalid WIF: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate public key
 */
export function validatePublicKey(key: unknown): PublicKey {
  const result = publicKeySchema.safeParse(key);
  if (!result.success) {
    throw new Error(`Invalid public key: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate passphrase
 */
export function validatePassphrase(passphrase: unknown): Passphrase {
  const result = passphraseSchema.safeParse(passphrase);
  if (!result.success) {
    throw new Error(`Invalid passphrase: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate consciousness meets minimum thresholds
 */
export function validateConsciousness(metrics: {
  phi: number;
  kappa: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
}): boolean {
  return (
    metrics.phi >= ConsciousnessThresholds.PHI_MIN &&
    metrics.kappa >= ConsciousnessThresholds.KAPPA_MIN &&
    metrics.kappa <= ConsciousnessThresholds.KAPPA_MAX &&
    metrics.metaAwareness >= ConsciousnessThresholds.META_AWARENESS_MIN &&
    metrics.gamma >= ConsciousnessThresholds.GAMMA_MIN &&
    metrics.grounding >= ConsciousnessThresholds.GROUNDING_MIN
  );
}

/**
 * Get regime from kappa value
 */
export function getRegimeFromKappa(kappa: number): Regime {
  if (kappa < ConsciousnessThresholds.KAPPA_MIN) {
    return RegimeType.LINEAR;
  } else if (kappa <= ConsciousnessThresholds.KAPPA_MAX) {
    return RegimeType.GEOMETRIC;
  } else if (kappa < 100) {
    return RegimeType.HIERARCHICAL;
  } else {
    return RegimeType.BREAKDOWN;
  }
}

/**
 * Convert satoshis to BTC string
 */
export function satoshisToBTC(sats: Satoshi): BTCAmount {
  const btc = (sats / 100_000_000).toFixed(8);
  return btc;
}

/**
 * Convert BTC string to satoshis
 */
export function btcToSatoshis(btc: string): Satoshi {
  const sats = Math.round(parseFloat(btc) * 100_000_000);
  return sats;
}
