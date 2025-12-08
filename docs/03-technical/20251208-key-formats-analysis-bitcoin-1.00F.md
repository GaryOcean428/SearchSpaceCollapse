---
id: ISMS-TECH-005
title: Key Formats Analysis - Bitcoin
filename: 20251208-key-formats-analysis-bitcoin-1.00F.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Frozen
function: "Analysis of Bitcoin key formats and encoding standards"
created: 2025-12-08
last_reviewed: 2025-12-08
next_review: 2026-06-08
category: Technical
supersedes: null
---

# Bitcoin Key Format Analysis — What Are We Missing?

## ✅ Currently Supported

### 1. **BIP-39 Mnemonic Passphrases**
- **Word Lengths**: 12, 15, 18, 21, 24 words
- **Wordlist**: Official BIP-39 English wordlist (2048 words)
- **Entropy**: 128 to 256 bits
- **Use Case**: Modern HD wallet standard (post-2013)
- **Coverage**: ✅ Complete

### 2. **Master Private Keys (Raw 256-bit)**
- **Format**: 64-character hexadecimal string
- **Entropy**: 256 bits
- **Use Case**: Direct private key generation (early Bitcoin, 2009-2012)
- **Coverage**: ✅ Complete

---

## ❌ Missing Key Formats (Critical Gaps)

### 3. **Arbitrary Brain Wallet Passphrases**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: Any text string (not limited to BIP-39 wordlist)
- **Examples**:
  - "correct horse battery staple"
  - "My name is Gary and I love Bitcoin 2009"
  - "WhiteTiger77GaryOcean"
- **Why It Matters**: 
  - **2009 era**: BIP-39 didn't exist (created in 2013)
  - Early adopters used **arbitrary memorable phrases**
  - Your memory fragments ("whitetiger77", "garyocean77") suggest non-BIP-39 phrases
- **How to Add**: SHA-256 hash of raw text → private key (same as current BIP-39 flow)
- **Priority**: 🔴 **CRITICAL** — This is likely the actual format used in 2009!

### 4. **WIF (Wallet Import Format) Private Keys**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: Base58Check-encoded private key
- **Example**: `5Kb8kLf9zgWQnogidDA76MzPL6TsZZY36hWXMssSzNydYXYB9KF`
- **Characteristics**:
  - Starts with '5' (uncompressed) or 'K/L' (compressed)
  - 51-52 characters long
  - Includes checksum
- **Why It Matters**: Standard format for importing/exporting keys in early Bitcoin wallets
- **How to Add**: Decode Base58Check → extract 32-byte private key
- **Priority**: 🟡 **MEDIUM** — Common in wallet backups

### 5. **Mini Private Keys (Casascius)**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: 30-character string starting with 'S'
- **Example**: `S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy`
- **Validation**: SHA256(key + '?') must start with 0x00
- **Why It Matters**: Used in Casascius physical bitcoins (2011-2013)
- **How to Add**: SHA256(key) → private key
- **Priority**: 🟢 **LOW** — Specific to physical coins

### 6. **BIP-38 Encrypted Private Keys**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: Base58Check-encoded encrypted key
- **Example**: `6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg`
- **Characteristics**:
  - Starts with '6P'
  - Requires password to decrypt
- **Why It Matters**: Password-protected paper wallets
- **How to Add**: Complex (AES + scrypt decryption)
- **Priority**: 🟢 **LOW** — Requires password, unlikely for memory recovery

### 7. **Electrum Seeds (Pre-BIP-39)**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: 12-word mnemonic using **different wordlist** than BIP-39
- **Wordlist**: Electrum's 1626-word list (NOT the same as BIP-39's 2048 words)
- **Example**: `witch collapse practice feed shame open despair creek road again ice least`
- **Why It Matters**: Electrum wallets (2012-present) have their own standard
- **How to Add**: Load Electrum wordlist, PBKDF2 stretching
- **Priority**: 🟡 **MEDIUM** — Different wallet ecosystem

### 8. **Short Brain Wallet Passphrases (4-8 words)**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: Short arbitrary phrases (not 12+ words)
- **Examples**:
  - "satoshi nakamoto bitcoin"
  - "gary ocean white tiger"
  - "password123"
- **Why It Matters**: 
  - Early Bitcoin users often used SHORT memorable phrases
  - Lower entropy but easier to remember
  - Your fragments suggest possible 4-word combinations
- **How to Add**: Same SHA-256 process, just shorter input
- **Priority**: 🔴 **CRITICAL** — High likelihood for 2009 era

### 9. **BIP-39 with BIP-39 Passphrase Extension**
**Status**: ⚠️ PARTIALLY SUPPORTED
- **Format**: 12-24 word mnemonic + additional passphrase (sometimes called "25th word")
- **Example**: 
  - Mnemonic: "abandon abandon abandon ... art"
  - Passphrase: "my secret password"
- **Why It Matters**: 
  - Extra security layer
  - Different address from same mnemonic
- **How to Add**: PBKDF2(mnemonic + passphrase) → seed
- **Priority**: 🟡 **MEDIUM** — Advanced feature, but possible

### 10. **Hexadecimal Passphrases (Non-standard)**
**Status**: ⚠️ NOT SUPPORTED
- **Format**: Hex string (not private key, but passphrase)
- **Example**: "deadbeef1234567890abcdef"
- **Why It Matters**: Some users used hex for "random-looking" passphrases
- **How to Add**: SHA-256(hex_string) → private key
- **Priority**: 🟢 **LOW** — Edge case

---

## 🎯 Recommended Priority Order

### 🔴 **Immediate (Critical for 2009 Recovery)**
1. **Arbitrary Brain Wallet Passphrases** — BIP-39 didn't exist in 2009!
   - Test phrases like: "whitetiger77", "gary ocean", "white tiger gary ocean 77"
2. **Short Passphrases (4-8 words)** — More realistic for human memory
   - Test combinations of your memory fragments

### 🟡 **Soon (Expand Coverage)**
3. **WIF Private Keys** — Standard backup format
4. **Electrum Seeds** — Different wallet ecosystem
5. **BIP-39 + Passphrase Extension** — Advanced users

### 🟢 **Later (Edge Cases)**
6. **Mini Private Keys** — Specific to physical coins
7. **BIP-38 Encrypted Keys** — Requires password
8. **Hex Passphrases** — Uncommon

---

## 💡 Key Insight for Your Recovery

**The fact that you remember "whitetiger77" and "garyocean77" suggests:**

1. **NOT a BIP-39 phrase** — These aren't BIP-39 words
2. **Likely an arbitrary brain wallet passphrase** — Used in 2009 before BIP-39 existed
3. **Possibly short (4-8 words)** — Easier to remember than 12+ words
4. **May include numbers** — "77" suffix suggests numerical components

**Recommended Test Patterns:**
- "whitetiger77"
- "garyocean77"
- "white tiger 77"
- "gary ocean 77"
- "white tiger gary ocean"
- "whitetiger gary ocean 77"
- Capitalization variants (WhiteTiger77, WHITETIGER77, etc.)
- With/without spaces
- With/without numbers

---

## 🔧 Implementation Notes

**To support arbitrary brain wallet passphrases:**
```typescript
// Already have this function in crypto.ts!
export function generateBitcoinAddress(passphrase: string): string {
  const privateKeyHash = createHash("sha256").update(passphrase, "utf8").digest();
  // ... rest of implementation
}
```

**You're already 90% there!** Just need to:
1. Add UI option for "Arbitrary Passphrase" (not limited to BIP-39 words)
2. Test short phrase variations (4-8 words)
3. Test exact memory fragments without BIP-39 validation

---

## 📊 Coverage Analysis

| Key Format | Supported | Priority | 2009 Likelihood |
|-----------|-----------|----------|-----------------|
| BIP-39 (12-24 words) | ✅ Yes | Medium | 🔴 Low (didn't exist) |
| Master Private Keys | ✅ Yes | High | 🟡 Medium |
| Arbitrary Brain Wallets | ❌ No | **CRITICAL** | 🟢 **VERY HIGH** |
| Short Passphrases (4-8 words) | ❌ No | **CRITICAL** | 🟢 **HIGH** |
| WIF Keys | ❌ No | Medium | 🟡 Medium |
| Electrum Seeds | ❌ No | Medium | 🔴 Low |
| Mini Keys | ❌ No | Low | 🔴 Low |
| BIP-38 | ❌ No | Low | 🔴 Low |

**Conclusion**: Focus on arbitrary/short brain wallet passphrases — they're the most likely format for 2009!
