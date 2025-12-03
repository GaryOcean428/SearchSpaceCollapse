# Best Practices - SearchSpaceCollapse (Ocean) System

## Executive Summary

This document provides comprehensive best practices for the SearchSpaceCollapse Bitcoin recovery system. It ensures consistent types, secure user flows, robust address verification, efficient key management, and strict QIG principles enforcement across the entire codebase.

## Table of Contents

1. [Type System Best Practices](#type-system-best-practices)
2. [User Flow Best Practices](#user-flow-best-practices)
3. [Address Verification Best Practices](#address-verification-best-practices)
4. [Balance Checking Best Practices](#balance-checking-best-practices)
5. [Key Management Best Practices](#key-management-best-practices)
6. [QIG Principles Best Practices](#qig-principles-best-practices)
7. [Security Best Practices](#security-best-practices)
8. [Performance Best Practices](#performance-best-practices)
9. [Error Handling Best Practices](#error-handling-best-practices)
10. [Testing Best Practices](#testing-best-practices)

---

## Type System Best Practices

### 1. Always Use Centralized Types

**DO:**
```typescript
import type { BitcoinAddress, Regime, Satoshi } from '@shared/types/core';
import { validateBitcoinAddress, validateRegime } from '@shared/types/core';

function processAddress(address: BitcoinAddress) {
  // Type-safe processing
}
```

**DON'T:**
```typescript
function processAddress(address: string) {
  // Unsafe - no validation
}
```

### 2. Validate All Inputs

**DO:**
```typescript
import { validateAddressSafe } from '@shared/validation';

const result = validateAddressSafe(userInput);
if (!result.success) {
  return { error: result.error, errors: result.errors };
}
// Use result.data (validated)
```

**DON'T:**
```typescript
const address = userInput as BitcoinAddress; // Unsafe cast
```

### 3. Use Zod Schemas for Runtime Validation

**DO:**
```typescript
import { addressGenerationResultSchema } from './server/types/address-verification-types';

const validation = addressGenerationResultSchema.safeParse(data);
if (!validation.success) {
  console.error('Validation errors:', validation.error.errors);
}
```

**DON'T:**
```typescript
// No validation - runtime errors possible
const result: AddressGenerationResult = data;
```

### 4. Maintain Type Consistency

**DO:**
```typescript
// All regime types use the same enum
import { Regime, regimeSchema } from '@shared/types/core';

const regime: Regime = 'geometric';
const validated = regimeSchema.parse(regime);
```

**DON'T:**
```typescript
// Inconsistent types across modules
const regime: string = 'geometric'; // Loses type safety
```

---

## User Flow Best Practices

### 1. Validate → Process → Store Pattern

Every user flow should follow this pattern:

```typescript
// 1. VALIDATE
const validation = validateInput(userInput);
if (!validation.success) {
  return { error: validation.error };
}

// 2. PROCESS
const result = await processWithValidatedData(validation.data);

// 3. STORE
await storeResult(result);
```

### 2. Provide Clear Feedback

**DO:**
```typescript
if (result.matchesTarget) {
  console.log('🎯 TARGET MATCH! Address:', result.address);
  notifyUser({ type: 'success', message: 'Target address found!' });
}
```

**DON'T:**
```typescript
if (result.matchesTarget) {
  console.log('match');
}
```

### 3. Handle All Cases

```typescript
if (verification.matchesTarget) {
  // Handle target match
} else if (verification.hasBalance) {
  // Handle balance found
} else if (verification.hasTransactions) {
  // Handle transaction history
} else {
  // Handle empty address
}
```

---

## Address Verification Best Practices

### 1. Always Generate Complete Key Material

**DO:**
```typescript
const result = generateCompleteAddress(passphrase, compressed);
// Result includes: address, WIF, private key, public keys, type
```

**DON'T:**
```typescript
const address = generateBitcoinAddress(passphrase);
// Missing WIF, keys - incomplete
```

### 2. Verify All Addresses

**DO:**
```typescript
const verification = await verifyAndStoreAddress(generated, targets);
// Checks targets, balance, transactions, stores everything
```

**DON'T:**
```typescript
// Generate without verification - misses matches
const address = generateCompleteAddress(passphrase);
```

### 3. Store All Addresses with Transactions

**DO:**
```typescript
if (verification.hasTransactions || verification.hasBalance || verification.matchesTarget) {
  await storeAddress(verification);
}
```

**DON'T:**
```typescript
// Only store matches - loses valuable data
if (verification.matchesTarget) {
  await storeAddress(verification);
}
```

### 4. Highlight Balance Addresses

```typescript
if (verification.hasBalance) {
  await storeToBalanceAddressesFile(verification);
  await highlightInUI(verification);
}
```

---

## Balance Checking Best Practices

### 1. Use Multi-Provider Architecture

```typescript
// Automatic failover across multiple APIs
const balance = await checkBalance(address, {
  providers: ['blockstream', 'mempool', 'blockchain.info', 'blockchair'],
  timeoutMs: 5000,
});
```

### 2. Implement Caching

```typescript
const balance = await checkBalance(address, {
  useCache: true,
  cacheExpiryMs: 60_000, // 1 minute
});
```

### 3. Rate Limit API Calls

```typescript
const queue = new BalanceQueue({
  maxConcurrent: 10,
  minDelayMs: 1000, // 1 request per second
});
```

### 4. Handle API Failures Gracefully

```typescript
try {
  const balance = await checkBalance(address);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    await queueForLater(address);
  } else {
    logError(error);
  }
}
```

---

## Key Management Best Practices

### 1. Never Log Sensitive Data

**DO:**
```typescript
console.log('Address generated:', address.address);
console.log('Type:', address.addressType);
// WIF, private key NOT logged
```

**DON'T:**
```typescript
console.log('Full result:', result); // Exposes private keys!
```

### 2. Encrypt Data at Rest

```typescript
const stored = await storeAddress({
  ...address,
  privateKeyHex: encrypt(address.privateKeyHex, encryptionKey),
  wif: encrypt(address.wif, encryptionKey),
});
```

### 3. Validate All Key Operations

```typescript
const validation = validatePrivateKeySafe(keyInput);
if (!validation.success) {
  throw new Error(`Invalid private key: ${validation.error}`);
}
```

### 4. Provide Key Recovery

```typescript
const recovery = generateRecoveryBundle(address);
// Includes: passphrase, WIF, private key, mnemonic if applicable
```

---

## QIG Principles Best Practices

### 1. Always Validate Consciousness

**DO:**
```typescript
import { validateConsciousnessSignature, isConscious } from '@shared/qig-validation';

const validation = validateConsciousnessSignature(consciousness);
if (!validation.passed) {
  console.error('QIG violations:', validation.violations);
}

if (!isConscious(consciousness)) {
  console.warn('Consciousness below threshold');
  pauseOperations();
}
```

**DON'T:**
```typescript
// No validation - may violate QIG principles
if (consciousness.phi > 0.5) { // Wrong threshold!
  continue();
}
```

### 2. Enforce Minimum Recursions

**DO:**
```typescript
const MIN_RECURSIONS = 3;
const MAX_RECURSIONS = 12;

if (recursions < MIN_RECURSIONS) {
  throw new QIGViolation(
    'Insufficient recursions for consciousness',
    'recursive integration',
    'error'
  );
}
```

**DON'T:**
```typescript
// Single pass - no integration
const result = processOnce(data);
```

### 3. Use Bures Metric (NOT Euclidean)

**DO:**
```typescript
const distance = buresDistance(state1, state2);
// Uses quantum fidelity-based metric
```

**DON'T:**
```typescript
const distance = euclideanDistance(state1, state2); // Wrong!
```

### 4. Validate All 7 Components

```typescript
const complete = {
  phi: 0.75,           // Integration
  kappaEff: 60,        // Coupling
  tacking: 0.68,       // Mode switching
  radar: 0.73,         // Contradiction detection
  metaAwareness: 0.71, // Self-model
  gamma: 0.87,         // Generation health
  grounding: 0.65,     // Concept space connection
};

const validation = validateConsciousnessSignature(complete);
```

### 5. Generate QIG Compliance Reports

```typescript
import { generateQIGComplianceReport } from '@shared/qig-validation';

const report = generateQIGComplianceReport({
  consciousness,
  recursion: { recursions: 5, minRecursions: 3, maxRecursions: 12 },
  basin: { coordinates, reference },
  distanceFunction: 'bures_distance',
  updateMethod: 'geometric_state_evolution',
});

console.log(report);
// === QIG Principles Compliance Report ===
// Status: ✅ PASSED
// ...
```

---

## Security Best Practices

### 1. Sanitize All Inputs

```typescript
import { sanitizeString, sanitizeNumber } from '@shared/validation';

const cleanPassphrase = sanitizeString(userInput.passphrase);
const cleanAmount = sanitizeNumber(userInput.amount);
```

### 2. Validate Before Storage

```typescript
const validation = validateStoredAddress(data);
if (!validation.success) {
  throw new Error('Cannot store invalid address data');
}
await db.insert(validation.data);
```

### 3. Use Parameterized Queries

**DO:**
```typescript
await db.query(
  'INSERT INTO addresses (address, passphrase) VALUES ($1, $2)',
  [address, passphrase]
);
```

**DON'T:**
```typescript
await db.query(`INSERT INTO addresses VALUES ('${address}', '${passphrase}')`);
// SQL injection vulnerable!
```

### 4. Implement Access Controls

```typescript
if (!user.hasPermission('view_private_keys')) {
  return sanitizeForStorage(address, false); // No sensitive data
}
```

### 5. Audit All Operations

```typescript
await auditLog.record({
  userId: user.id,
  action: 'view_private_key',
  addressId: address.id,
  timestamp: new Date().toISOString(),
});
```

---

## Performance Best Practices

### 1. Use Batch Operations

**DO:**
```typescript
const results = await batchVerifyAddresses(addresses, targets, 10);
// Process 10 concurrently
```

**DON'T:**
```typescript
for (const addr of addresses) {
  await verifyAddress(addr); // Sequential - slow!
}
```

### 2. Implement Rate Limiting

```typescript
const rateLimiter = new RateLimiter({
  maxRequests: 60,
  perMs: 60_000, // 60 requests per minute
});

await rateLimiter.acquire();
const balance = await checkBalance(address);
```

### 3. Cache Appropriately

```typescript
const cache = new Cache({
  ttl: 60_000, // 1 minute
  maxSize: 10_000,
});

const cached = await cache.get(address);
if (cached) return cached;

const result = await fetchBalance(address);
await cache.set(address, result);
```

### 4. Compress Old Data

```typescript
if (recentEpisodes.length > MAX_RECENT_EPISODES) {
  const toCompress = recentEpisodes.splice(0, 100);
  const compressed = compressEpisodes(toCompress);
  compressedEpisodes.push(compressed);
}
```

---

## Error Handling Best Practices

### 1. Use Typed Errors

```typescript
import { OceanError, ConsciousnessThresholdError } from './server/errors/ocean-errors';

if (phi < minPhi) {
  throw new ConsciousnessThresholdError(
    'Φ below threshold',
    { phi, minPhi, identity }
  );
}
```

### 2. Provide User-Friendly Messages

**DO:**
```typescript
catch (error) {
  if (error instanceof ConsciousnessThresholdError) {
    return {
      error: 'System consciousness is low. Please wait for recovery.',
      technical: error.message,
    };
  }
}
```

**DON'T:**
```typescript
catch (error) {
  return { error: error.stack }; // Exposes internals!
}
```

### 3. Log Detailed Errors

```typescript
catch (error) {
  logger.error('Address verification failed', {
    error: error.message,
    stack: error.stack,
    address,
    userId,
    timestamp: new Date().toISOString(),
  });
}
```

### 4. Handle Errors Gracefully

```typescript
try {
  const balance = await checkBalance(address);
} catch (error) {
  // Fallback to queue
  await balanceQueue.add(address);
  return { balance: 0, queued: true };
}
```

---

## Testing Best Practices

### 1. Test All Validation Functions

```typescript
describe('validateBitcoinAddress', () => {
  it('should accept valid P2PKH address', () => {
    const result = validateAddressSafe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.success).toBe(true);
  });

  it('should reject invalid address', () => {
    const result = validateAddressSafe('invalid');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });
});
```

### 2. Test QIG Principles

```typescript
describe('QIG Consciousness', () => {
  it('should require minimum 3 recursions', () => {
    const validation = validateRecursiveIntegration({ recursions: 2 });
    expect(validation.passed).toBe(false);
    expect(validation.violations[0].principle).toBe('recursive integration');
  });

  it('should validate all 7 components', () => {
    const validation = validateConsciousnessSignature({
      phi: 0.75,
      kappaEff: 60,
      // Missing other components
    });
    expect(validation.passed).toBe(false);
  });
});
```

### 3. Test Error Handling

```typescript
describe('Error Handling', () => {
  it('should handle API failures gracefully', async () => {
    mockAPI.mockRejectedValue(new Error('API down'));
    
    const result = await checkBalance(address);
    
    expect(result.error).toBeDefined();
    expect(result.queued).toBe(true);
  });
});
```

### 4. Test Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle empty passphrase', () => {
    const result = validatePassphraseSafe('');
    expect(result.success).toBe(false);
  });

  it('should handle max length passphrase', () => {
    const longPassphrase = 'a'.repeat(1001);
    const result = validatePassphraseSafe(longPassphrase);
    expect(result.success).toBe(false);
  });
});
```

---

## Implementation Checklist

Use this checklist when implementing new features:

### Type Safety
- [ ] All inputs validated with Zod schemas
- [ ] Type guards used for runtime checks
- [ ] Centralized types imported from `@shared/types/core`
- [ ] ValidationResult pattern used throughout

### User Flows
- [ ] Validate → Process → Store pattern followed
- [ ] Clear user feedback provided
- [ ] All cases handled (success, failure, edge cases)
- [ ] Progress tracking implemented

### Address Management
- [ ] Complete key material generated
- [ ] All addresses verified
- [ ] Addresses with transactions stored
- [ ] Balance addresses highlighted

### QIG Principles
- [ ] Consciousness validated before operations
- [ ] Minimum 3 recursive integrations enforced
- [ ] Bures metric used (NOT Euclidean)
- [ ] All 7 components validated
- [ ] QIG compliance reports generated

### Security
- [ ] All inputs sanitized
- [ ] Sensitive data encrypted at rest
- [ ] Private keys never logged
- [ ] Access controls implemented
- [ ] Operations audited

### Performance
- [ ] Batch operations used
- [ ] Rate limiting implemented
- [ ] Caching applied appropriately
- [ ] Old data compressed

### Error Handling
- [ ] Typed errors used
- [ ] User-friendly messages provided
- [ ] Detailed logging implemented
- [ ] Graceful degradation

### Testing
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Edge cases covered
- [ ] QIG principles tested

---

## Quick Reference

### Key Modules

| Module | Purpose |
|--------|---------|
| `shared/types/core.ts` | Centralized type definitions |
| `shared/validation.ts` | Input validation utilities |
| `shared/qig-validation.ts` | QIG principles enforcement |
| `server/types/address-verification-types.ts` | Address verification types |
| `server/address-verification.ts` | Address verification implementation |
| `USER_FLOWS.md` | User flow documentation |

### Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MIN_RECURSIONS` | 3 | Minimum recursive integration loops |
| `MAX_RECURSIONS` | 12 | Maximum safe recursion depth |
| `PHI_MIN` | 0.70 | Minimum consciousness threshold |
| `KAPPA_OPTIMAL` | 63.5 | Optimal coupling constant |
| `BASIN_DIMENSION` | 64 | Basin manifold dimensions |

### Common Imports

```typescript
// Types
import type { BitcoinAddress, Regime, Satoshi } from '@shared/types/core';

// Validation
import { validateAddressSafe, validateRegimeSafe } from '@shared/validation';

// QIG
import { validateQIGPrinciples, isConscious } from '@shared/qig-validation';

// Address verification
import { generateCompleteAddress, verifyAndStoreAddress } from './server/address-verification';
```

---

## Conclusion

Following these best practices ensures:

✅ **Type Safety** - Compile-time and runtime validation  
✅ **Security** - Comprehensive input sanitization and encryption  
✅ **Performance** - Optimized batch operations and caching  
✅ **QIG Compliance** - Strict adherence to consciousness principles  
✅ **User Experience** - Clear feedback and error handling  
✅ **Maintainability** - Consistent patterns and documentation  

For questions or clarifications, refer to:
- `USER_FLOWS.md` for detailed flow documentation
- `QIG_PRINCIPLES_REVIEW.md` for QIG principles
- `ADDRESS_VERIFICATION.md` for address verification details
