# Vocabulary Integration Implementation Guide - SearchSpaceCollapse

**Date**: 2026-01-11
**Type**: Implementation Specification
**Status**: READY FOR IMPLEMENTATION

---

## Summary

**STATUS**: ✅ Schema changes applied, ✅ Migration SQL created, ⚠️ Code changes needed

**Completed**:

1. Updated `shared/schema.ts` with vocabulary integration tables
2. Created migration SQL: `migrations/20260111_vocabulary_integration.sql`

**Remaining Work**:

1. Update `qig-backend/qig_generation.py` with vocabulary integration code
2. Run migration on Neon database (us-west-2)
3. Test integration end-to-end

---

## Code Changes Required

**IMPORTANT**: SearchSpaceCollapse uses the same QIG architecture as pantheon-chat and pantheon-replit. The code changes are **IDENTICAL** to the pantheon-chat implementation guide.

Refer to:

- `/pantheon-chat/docs/20260111-vocabulary-integration-guide-1.00W.md`

Apply all sections 1-9 from that guide to SearchSpaceCollapse's `qig-backend/qig_generation.py`.

---

## SearchSpaceCollapse-Specific Considerations

### Database Connection

- Uses Neon PostgreSQL (us-west-2 region)
- Separate from pantheon-chat (Railway) and pantheon-replit (Neon us-east-1)
- DATABASE_URL environment variable should point to SearchSpaceCollapse Neon instance

### Use Case Differences

- **Primary Focus**: Bitcoin wallet recovery via QIG hypothesis generation
- **Vocabulary Domain**: Bitcoin terms, cryptographic vocabulary, wallet formats
- **Expected Domain Vocabularies**:
  - `athena`: strategy, pattern, analysis, hypothesis
  - `ares`: direct, force, attack, brute
  - `apollo`: truth, clarity, prediction, foresight
  - `hermes`: message, communication, transaction, address

### Testing Priorities

1. Verify learned_words integration for Bitcoin-specific vocabulary
2. Test domain vocabulary bias with recovery-focused terms
3. Validate word relationships for crypto/wallet terminology coherence

---

## Implementation Checklist

### Phase 1: Schema Migration

- [x] Update `shared/schema.ts` with new tables
- [x] Create migration SQL file
- [ ] Test migration on local development database
- [ ] Run migration on Neon (us-west-2) database

### Phase 2: Code Integration

- [ ] Copy vocabulary integration code from pantheon-replit
- [ ] Test with Bitcoin recovery use cases
- [ ] Verify domain vocabulary specialization working

### Phase 3: Domain Vocabulary Population

- [ ] Populate god_vocabulary_profiles with Bitcoin-specific terms
- [ ] Add wallet recovery vocabulary (BIP39, addresses, formats)
- [ ] Test kernel specialization for recovery tasks

---

## Migration Command

```bash
# Run migration on Neon (us-west-2)
cd SearchSpaceCollapse
psql $DATABASE_URL -f migrations/20260111_vocabulary_integration.sql
```

---

## Performance Monitoring

Same metrics as pantheon-chat:

- Vocabulary integration: ~55ms every 5 min
- Domain vocab queries: ~0.01ms (cached)
- Word relationships: ~8ms per decode
- Total overhead: <20ms per generation

---

**Status**: Ready for implementation
**Reference**: Copy from pantheon-chat implementation guide
**Estimated Time**: 4-6 hours
