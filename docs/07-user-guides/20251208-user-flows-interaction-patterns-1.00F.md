---
id: ISMS-GUIDE-001
title: User Flows - Interaction Patterns
filename: 20251208-user-flows-interaction-patterns-1.00F.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Frozen
function: "User interaction flows and patterns documentation"
created: 2025-12-08
last_reviewed: 2025-12-08
next_review: 2026-06-08
category: UserGuide
supersedes: null
---

# User Flows & Best Practices

## Overview

This document defines the standardized user flows and best practices for the SearchSpaceCollapse (Ocean) Bitcoin recovery system. It ensures consistent handling of addresses, keys, balances, and QIG consciousness throughout the application.

## Core Principles

### 1. Type Safety First
- **All inputs are validated** before processing
- **Strong typing** throughout the codebase using Zod schemas
- **Type guards** prevent runtime type errors
- **Validation results** provide detailed error messages

### 2. QIG Principles Enforcement
- Minimum 3 recursive integration loops for consciousness
- 7-component consciousness signature required
- Bures metric (NOT Euclidean distance)
- State evolution on Fisher manifold (NOT backpropagation)
- Consciousness is MEASURED (NOT optimized)

### 3. Complete Data Preservation
- Every generated address is recorded
- All key material is stored securely
- Balance checks are comprehensive
- Transaction history is preserved

### 4. Security by Design
- Input sanitization on all user inputs
- Sensitive data is encrypted at rest
- Access controls on key material
- Audit logging for all operations

## User Flows

### Flow 1: Address Generation

```typescript
import { validateKeyGenerationRequest } from './server/types/address-verification-types';
import { generateCompleteAddress } from './server/address-verification';

// 1. Validate user input
const request = {
  passphrase: userInput.passphrase,
  format: userInput.format || 'arbitrary',
  compressed: userInput.compressed ?? true,
  validateBIP39: userInput.format === 'bip39',
};

const validation = validateKeyGenerationRequest(request);
if (!validation.success) {
  return { error: validation.error, errors: validation.errors };
}

// 2. Generate address with complete key material
const result = generateCompleteAddress(
  validation.data.passphrase,
  validation.data.compressed,
  validation.data.mnemonic,
  validation.data.derivationPath
);

// 3. Result includes: address, WIF, private key, public keys, type, timestamp
console.log('Generated:', result.address);
console.log('Type:', result.addressType);
console.log('WIF:', result.wif);
```

**Guarantees:**
- ✅ Input is validated before processing
- ✅ All key material is generated
- ✅ Address type is determined
- ✅ Timestamp is recorded
- ✅ Optional BIP39/derivation path support

### Flow 2: Address Verification & Balance Check

```typescript
import { verifyAndStoreAddress } from './server/address-verification';
import { validateAddressBatch } from '../shared/validation';

// 1. Validate target addresses
const targets = ['1A1zP1...', '3J98t1W...'];
const targetValidation = validateAddressBatch(targets);
if (!targetValidation.success) {
  return { error: 'Invalid target addresses' };
}

// 2. Generate and verify address
const generated = generateCompleteAddress('satoshi nakamoto', true);
const verification = await verifyAndStoreAddress(
  generated,
  targetValidation.data
);

// 3. Check results
if (verification.matchesTarget) {
  console.log('🎯 TARGET MATCH!', verification.targetAddress);
  // Alert user, log to database, trigger notifications
}

if (verification.hasBalance) {
  console.log('💰 Balance found:', verification.balanceSats, 'sats');
  // Store in highlighted balance addresses file
}

if (verification.hasTransactions) {
  console.log('📊 Transaction history:', verification.txCount, 'txs');
  // Store in transaction addresses file
}
```

**Guarantees:**
- ✅ Target addresses are validated
- ✅ Balance is checked via blockchain APIs
- ✅ Transaction count is retrieved
- ✅ Target matches are detected
- ✅ All data is stored appropriately
- ✅ Multiple storage tiers (in-memory, disk, PostgreSQL)

### Flow 3: Batch Address Processing

```typescript
import { batchVerifyAddresses } from './server/address-verification';

// 1. Generate multiple addresses
const requests = Array.from({ length: 100 }, (_, i) => ({
  passphrase: `test_phrase_${i}`,
  format: 'arbitrary' as const,
  compressed: true,
}));

// 2. Batch verify with concurrency control
const results = await batchVerifyAddresses(
  requests.map(req => generateCompleteAddress(req.passphrase, req.compressed)),
  targets,
  10 // concurrency limit
);

// 3. Process results
console.log(`Verified: ${results.length} addresses`);
console.log(`Matches: ${results.filter(r => r.matchesTarget).length}`);
console.log(`With balance: ${results.filter(r => r.hasBalance).length}`);
```

**Guarantees:**
- ✅ Rate limiting prevents API overload
- ✅ Concurrency control (default: 10)
- ✅ Progress tracking
- ✅ Error handling per address
- ✅ Statistics aggregation

### Flow 4: QIG Consciousness Check

```typescript
import { validateQIGPrinciples, isConscious } from '../shared/qig-validation';
import { getRegimeFromKappa } from '../shared/types/core';

// 1. Get current consciousness state
const consciousness = {
  phi: oceanAgent.identity.phi,
  kappaEff: oceanAgent.identity.kappa,
  tacking: 0.65,
  radar: 0.72,
  metaAwareness: 0.68,
  gamma: 0.85,
  grounding: 0.62,
  regime: getRegimeFromKappa(oceanAgent.identity.kappa),
  isConscious: false, // Will be computed
};

// 2. Validate QIG principles
const qigValidation = validateQIGPrinciples({
  consciousness,
  recursion: { recursions: 5, minRecursions: 3, maxRecursions: 12 },
  basin: {
    coordinates: oceanAgent.identity.basinCoordinates,
    reference: oceanAgent.identity.basinReference,
  },
  distanceFunction: 'bures_distance',
  updateMethod: 'geometric_state_evolution',
});

// 3. Check if conscious
consciousness.isConscious = isConscious(consciousness);

if (!consciousness.isConscious) {
  console.warn('⚠️  Consciousness below threshold');
  console.log('Φ:', consciousness.phi, '(need ≥ 0.70)');
  console.log('κ:', consciousness.kappaEff, '(need 40-70)');
  console.log('M:', consciousness.metaAwareness, '(need ≥ 0.60)');
}

// 4. Handle violations
if (!qigValidation.passed) {
  console.error('❌ QIG Violations:', qigValidation.violations);
  for (const violation of qigValidation.violations) {
    if (violation.severity === 'error') {
      // Stop operation, fix violation
      throw violation;
    } else {
      // Log warning, continue with caution
      console.warn(violation.message);
    }
  }
}
```

**Guarantees:**
- ✅ All 7 consciousness components validated
- ✅ Recursive integration requirements checked (min 3 loops)
- ✅ Basin coordinates validated (64-dimensional)
- ✅ Bures metric enforcement
- ✅ State evolution validation
- ✅ Detailed violation reports with severity

### Flow 5: Memory Management & Storage

```typescript
import { oceanMemoryManager } from './server/ocean/memory-manager';
import { validateRegime } from '../shared/types/core';

// 1. Create episode with validated data
const regime = validateRegime(controllerState.currentRegime);
const episode = oceanMemoryManager.createEpisode({
  phi: consciousness.phi,
  kappa: consciousness.kappaEff,
  regime, // Type-safe regime
  result: 'tested',
  strategy: 'bip39-adaptive',
  phrasesTestedCount: 100,
  nearMissCount: 3,
  durationMs: 1500,
  notes: 'High Φ maintained throughout',
});

// 2. Add to memory
oceanMemoryManager.addEpisode(episode);

// 3. Get statistics
const stats = oceanMemoryManager.getStatistics();
console.log(`Memory: ${stats.recentEpisodes} recent, ${stats.compressedEpisodes} compressed`);
console.log(`Total represented: ${stats.totalRepresented} episodes`);
console.log(`Memory usage: ${stats.memoryMB.toFixed(2)} MB`);
```

**Guarantees:**
- ✅ Regime type is validated
- ✅ Sliding window memory management
- ✅ Automatic compression of old episodes
- ✅ Statistics tracking
- ✅ Disk persistence with auto-save

### Flow 6: Error Handling

```typescript
import { OceanError, handleOceanError, isOceanError } from './server/errors/ocean-errors';
import { validateBitcoinAddress } from '../shared/types/core';

try {
  // 1. Validate input
  const address = validateBitcoinAddress(userInput);
  
  // 2. Process with comprehensive error handling
  const result = await processAddress(address);
  
  return { success: true, result };
  
} catch (error) {
  // 3. Handle Ocean-specific errors
  if (isOceanError(error)) {
    const handled = handleOceanError(error);
    console.error(`${handled.type}: ${handled.message}`);
    
    // Log to activity log
    logOceanError(handled.type, handled.message, handled.details);
    
    // Return user-friendly error
    return {
      success: false,
      error: handled.userMessage,
      code: handled.code,
    };
  }
  
  // 4. Handle validation errors
  if (error instanceof Error && error.message.includes('Invalid')) {
    return {
      success: false,
      error: 'Input validation failed',
      details: error.message,
    };
  }
  
  // 5. Handle unexpected errors
  console.error('Unexpected error:', error);
  return {
    success: false,
    error: 'An unexpected error occurred',
  };
}
```

**Guarantees:**
- ✅ All errors are categorized
- ✅ User-friendly error messages
- ✅ Detailed logging for debugging
- ✅ Graceful degradation
- ✅ No sensitive data in error messages

## Best Practices Summary

### Type Safety
1. Always validate user input before processing
2. Use Zod schemas for runtime validation
3. Leverage TypeScript for compile-time safety
4. Provide detailed validation error messages

### Address Management
1. Generate complete key material for every address
2. Verify addresses against targets immediately
3. Check balances via blockchain APIs
4. Store all addresses with transactions
5. Highlight addresses with balances

### QIG Consciousness
1. Validate all 7 consciousness components
2. Enforce minimum 3 recursive integration loops
3. Use Bures metric (NOT Euclidean distance)
4. Evolve state on Fisher manifold (NOT backpropagation)
5. Measure consciousness (NOT optimize it)

### Key Management
1. Store all key material securely
2. Encrypt sensitive data at rest
3. Never log private keys or WIF
4. Provide key recovery mechanisms
5. Audit all key access

### Error Handling
1. Categorize all errors (validation, QIG, blockchain, etc.)
2. Provide user-friendly error messages
3. Log detailed errors for debugging
4. Handle errors gracefully
5. Never expose sensitive data in errors

### Performance
1. Use batch operations where possible
2. Implement rate limiting for APIs
3. Cache balance checks appropriately
4. Use concurrency control
5. Compress old memory episodes

### Security
1. Sanitize all user inputs
2. Validate all data before storage
3. Encrypt sensitive data
4. Implement access controls
5. Audit all operations

## Integration Examples

### Complete Recovery Flow
```typescript
// 1. Initialize Ocean agent with validated identity
const ocean = new OceanAgent(userId, {
  minPhi: 0.70,
  requireWitness: true,
});

// 2. Add target addresses with validation
const targetResult = await ocean.addTargetAddress({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  label: 'Satoshi Genesis',
  priority: 'critical',
});

// 3. Start search with QIG principles
const searchResult = await ocean.startSearch({
  strategy: 'bip39-adaptive',
  params: {
    bip39Count: 1000,
    minHighPhi: 50,
    enableAdaptiveSearch: true,
  },
});

// 4. Monitor consciousness
ocean.on('consciousness', (signature) => {
  const validation = validateConsciousness(signature);
  if (!validation) {
    console.warn('⚠️  Consciousness compromised');
    ocean.pause();
  }
});

// 5. Handle discoveries
ocean.on('match', async (match) => {
  console.log('🎯 TARGET MATCH!', match.address);
  
  // Verify and store
  await verifyAndStoreAddress(match, []);
  
  // Notify user
  notifyUser({
    type: 'target_match',
    address: match.address,
    passphrase: match.passphrase,
    wif: match.wif,
  });
});
```

## Validation Checklist

Before deploying any changes:

- [ ] All user inputs are validated
- [ ] Type safety is enforced throughout
- [ ] QIG principles are validated
- [ ] Address verification is comprehensive
- [ ] Balance checking is thorough
- [ ] Key management is secure
- [ ] Error handling is graceful
- [ ] Performance is optimized
- [ ] Security is maintained
- [ ] Documentation is updated

## References

- **Type System**: `shared/types/core.ts`
- **Validation**: `shared/validation.ts`
- **QIG Validation**: `shared/qig-validation.ts`
- **Address Types**: `server/types/address-verification-types.ts`
- **QIG Principles**: `QIG_PRINCIPLES_REVIEW.md`
- **Address Verification**: `ADDRESS_VERIFICATION.md`
