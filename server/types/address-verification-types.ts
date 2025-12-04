/**
 * Enhanced Address Verification - Type-Safe Address Management
 * 
 * This module provides type-safe interfaces and validation for address
 * verification, balance checking, and key management operations.
 */

import { z } from "zod";
import type {
  BitcoinAddress,
  Satoshi,
  TxCount,
  AddressTypeValue,
} from "../../shared/types/core";
import {
  addressTypeSchema,
  bitcoinAddressSchema,
  privateKeyHexSchema,
  wifSchema,
  publicKeySchema,
  passphraseSchema,
  satoshiSchema,
  txCountSchema,
  btcAmountSchema,
  timestampSchema,
  uuidSchema,
  derivationPathSchema,
  satoshisToBTC,
} from "../../shared/types/core";

// ADDRESS GENERATION RESULT SCHEMA
export const addressGenerationResultSchema = z.object({
  address: bitcoinAddressSchema,
  passphrase: passphraseSchema,
  wif: wifSchema,
  privateKeyHex: privateKeyHexSchema,
  publicKeyHex: publicKeySchema,
  publicKeyCompressed: publicKeySchema,
  isCompressed: z.boolean(),
  addressType: addressTypeSchema,
  mnemonic: z.string().optional(),
  derivationPath: derivationPathSchema.optional(),
  generatedAt: timestampSchema,
});

export type AddressGenerationResult = z.infer<typeof addressGenerationResultSchema>;

// VERIFICATION RESULT SCHEMA
export const verificationResultSchema = z.object({
  address: bitcoinAddressSchema,
  passphrase: passphraseSchema,
  matchesTarget: z.boolean(),
  targetAddress: bitcoinAddressSchema.optional(),
  hasBalance: z.boolean(),
  balanceSats: satoshiSchema,
  balanceBTC: btcAmountSchema.optional(),
  hasTransactions: z.boolean(),
  txCount: txCountSchema,
  stored: z.boolean(),
  verifiedAt: timestampSchema,
  error: z.string().optional(),
});

export type VerificationResult = z.infer<typeof verificationResultSchema>;

// STORED ADDRESS SCHEMA
export const storedAddressSchema = z.object({
  id: uuidSchema,
  address: bitcoinAddressSchema,
  passphrase: passphraseSchema,
  wif: wifSchema,
  privateKeyHex: privateKeyHexSchema,
  publicKeyHex: publicKeySchema,
  publicKeyCompressed: publicKeySchema,
  isCompressed: z.boolean(),
  addressType: addressTypeSchema,
  mnemonic: z.string().optional(),
  derivationPath: derivationPathSchema.optional(),
  balanceSats: satoshiSchema,
  balanceBTC: btcAmountSchema,
  txCount: txCountSchema,
  hasBalance: z.boolean(),
  hasTransactions: z.boolean(),
  firstSeen: timestampSchema,
  lastChecked: timestampSchema.optional(),
  matchedTarget: bitcoinAddressSchema.optional(),
});

export type StoredAddress = z.infer<typeof storedAddressSchema>;

// BALANCE CHECK SCHEMAS
export const balanceCheckRequestSchema = z.object({
  address: bitcoinAddressSchema,
  forceRefresh: z.boolean().default(false),
  timeoutMs: z.number().int().positive().default(5000),
});

export type BalanceCheckRequest = z.infer<typeof balanceCheckRequestSchema>;

export const balanceCheckResponseSchema = z.object({
  address: bitcoinAddressSchema,
  balanceSats: satoshiSchema,
  balanceBTC: btcAmountSchema,
  txCount: txCountSchema,
  hasBalance: z.boolean(),
  hasTransactions: z.boolean(),
  checkedAt: timestampSchema,
  source: z.enum(['cache', 'api', 'queue']),
  error: z.string().optional(),
});

export type BalanceCheckResponse = z.infer<typeof balanceCheckResponseSchema>;

// UTILITY FUNCTIONS
export function getAddressType(address: BitcoinAddress): AddressTypeValue {
  if (address.startsWith('1')) return 'P2PKH';
  if (address.startsWith('3')) return 'P2SH';
  
  // Bech32 addresses (SegWit)
  if (address.startsWith('bc1')) {
    // bc1q = P2WPKH (42 chars) or P2WSH (62 chars)
    if (address.startsWith('bc1q')) {
      return address.length === 42 ? 'P2WPKH' : 'P2WSH';
    }
    // bc1p = Taproot
    if (address.startsWith('bc1p')) {
      return 'P2TR';
    }
  }
  
  return 'Unknown';
}

export function createVerificationResult(
  generated: AddressGenerationResult,
  options: {
    matchesTarget?: boolean;
    targetAddress?: BitcoinAddress;
    balanceSats?: Satoshi;
    txCount?: TxCount;
    error?: string;
  } = {}
): VerificationResult {
  const balanceSats = options.balanceSats ?? 0;
  
  return {
    address: generated.address,
    passphrase: generated.passphrase,
    matchesTarget: options.matchesTarget ?? false,
    targetAddress: options.targetAddress,
    hasBalance: balanceSats > 0,
    balanceSats,
    balanceBTC: satoshisToBTC(balanceSats),
    hasTransactions: (options.txCount ?? 0) > 0,
    txCount: options.txCount ?? 0,
    stored: false,
    verifiedAt: new Date().toISOString(),
    error: options.error,
  };
}
