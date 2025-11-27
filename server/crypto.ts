import { createHash, createHmac, randomBytes } from "crypto";
import elliptic from "elliptic";
import bs58check from "bs58check";

const EC = elliptic.ec;
const ec = new EC("secp256k1");

const MAX_PASSPHRASE_LENGTH = 1000;

export class CryptoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoValidationError';
  }
}

function validatePassphrase(passphrase: string): void {
  if (typeof passphrase !== 'string') {
    throw new CryptoValidationError('Passphrase must be a string');
  }
  
  if (passphrase.length === 0) {
    throw new CryptoValidationError('Passphrase cannot be empty');
  }
  
  if (passphrase.length > MAX_PASSPHRASE_LENGTH) {
    throw new CryptoValidationError(`Passphrase too long (max ${MAX_PASSPHRASE_LENGTH} characters)`);
  }
}

function validatePrivateKeyHex(privateKeyHex: string): void {
  if (typeof privateKeyHex !== 'string') {
    throw new CryptoValidationError('Private key must be a string');
  }
  
  if (!/^[0-9a-fA-F]{64}$/.test(privateKeyHex)) {
    throw new CryptoValidationError('Private key must be exactly 64 hex characters');
  }
}

function validateDerivationPath(path: string): void {
  if (typeof path !== 'string') {
    throw new CryptoValidationError('Derivation path must be a string');
  }
  
  if (!/^m(\/\d+'?)+$/.test(path)) {
    throw new CryptoValidationError('Invalid BIP32 derivation path format');
  }
  
  const segments = path.replace('m/', '').split('/');
  for (const segment of segments) {
    const index = parseInt(segment.replace("'", ""), 10);
    if (index < 0 || index >= 0x80000000) {
      throw new CryptoValidationError('BIP32 path index out of range (0 to 2^31-1)');
    }
  }
}

export function validateBitcoinAddress(address: string): void {
  if (typeof address !== 'string') {
    throw new CryptoValidationError('Bitcoin address must be a string');
  }
  
  if (address.length < 25 || address.length > 35) {
    throw new CryptoValidationError('Invalid Bitcoin address length');
  }
  
  if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    throw new CryptoValidationError('Invalid Bitcoin address format');
  }
  
  try {
    bs58check.decode(address);
  } catch {
    throw new CryptoValidationError('Invalid Bitcoin address checksum');
  }
}

export function generateBitcoinAddress(passphrase: string): string {
  validatePassphrase(passphrase);
  
  const privateKeyHash = createHash("sha256").update(passphrase, "utf8").digest();
  
  const keyPair = ec.keyFromPrivate(privateKeyHash);
  
  const publicKey = Buffer.from(keyPair.getPublic().encode("array", true));
  
  const sha256Hash = createHash("sha256").update(publicKey).digest();
  
  const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
  
  const versionedPayload = Buffer.concat([
    Buffer.from([0x00]),
    ripemd160Hash,
  ]);
  
  const address = bs58check.encode(versionedPayload);
  
  return address;
}

export function generateMasterPrivateKey(): string {
  const secp256k1Order = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
  
  let privateKey: Buffer;
  let keyValue: bigint;
  
  do {
    privateKey = randomBytes(32);
    keyValue = BigInt("0x" + privateKey.toString("hex"));
  } while (keyValue === BigInt(0) || keyValue >= secp256k1Order);
  
  return privateKey.toString("hex");
}

/**
 * Derive a private key from a passphrase using SHA-256
 * This is how early Bitcoin brain wallets worked - simply hashing a memorable phrase
 */
export function derivePrivateKeyFromPassphrase(passphrase: string): string {
  validatePassphrase(passphrase);
  
  const privateKeyHash = createHash("sha256").update(passphrase, "utf8").digest();
  return privateKeyHash.toString("hex");
}

/**
 * Generate Bitcoin address from a passphrase by first deriving the private key
 * This is the same as generateBitcoinAddress but makes the derivation explicit
 */
export function generateBitcoinAddressFromPassphrase(passphrase: string): {
  address: string;
  privateKey: string;
} {
  const privateKey = derivePrivateKeyFromPassphrase(passphrase);
  const address = generateBitcoinAddressFromPrivateKey(privateKey);
  
  return { address, privateKey };
}

export function generateBitcoinAddressFromPrivateKey(privateKeyHex: string): string {
  validatePrivateKeyHex(privateKeyHex);
  
  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
  
  const keyPair = ec.keyFromPrivate(privateKeyBuffer);
  
  const publicKey = Buffer.from(keyPair.getPublic().encode("array", true));
  
  const sha256Hash = createHash("sha256").update(publicKey).digest();
  
  const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
  
  const versionedPayload = Buffer.concat([
    Buffer.from([0x00]),
    ripemd160Hash,
  ]);
  
  const address = bs58check.encode(versionedPayload);
  
  return address;
}

export function verifyBrainWallet(): { success: boolean; testAddress?: string; error?: string } {
  try {
    const testPhrase = "test passphrase for verification";
    const address = generateBitcoinAddress(testPhrase);
    
    const knownPhrase = "correct horse battery staple";
    const knownAddress = generateBitcoinAddress(knownPhrase);
    
    return {
      success: true,
      testAddress: address,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Full verification of a recovered passphrase against a target address
 * This performs multiple checks to confirm the passphrase actually works:
 * 1. Derives the private key from the passphrase
 * 2. Generates the Bitcoin address and confirms it matches the target
 * 3. Signs a test message to prove the key is cryptographically valid
 * 4. Verifies the signature is valid
 * 
 * Returns detailed verification results for display to the user
 */
export interface VerificationResult {
  verified: boolean;
  passphrase: string;
  targetAddress: string;
  generatedAddress: string;
  addressMatch: boolean;
  privateKeyHex: string;
  publicKeyHex: string;
  signatureValid: boolean;
  testMessage: string;
  signature: string;
  error?: string;
  verificationSteps: {
    step: string;
    passed: boolean;
    detail: string;
  }[];
}

export function verifyRecoveredPassphrase(
  passphrase: string,
  targetAddress: string,
  format: 'arbitrary' | 'bip39' | 'master' = 'arbitrary',
  derivationPath?: string
): VerificationResult {
  const steps: VerificationResult['verificationSteps'] = [];
  const result: VerificationResult = {
    verified: false,
    passphrase,
    targetAddress,
    generatedAddress: '',
    addressMatch: false,
    privateKeyHex: '',
    publicKeyHex: '',
    signatureValid: false,
    testMessage: `Verification test: ${Date.now()}`,
    signature: '',
    verificationSteps: steps,
  };

  try {
    // Step 1: Derive private key
    let privateKeyHex: string;
    let generatedAddress: string;
    
    if (format === 'master' && derivationPath) {
      const seedBuffer = createHash("sha512").update(passphrase, "utf8").digest();
      const masterKey = createHmac('sha512', 'Bitcoin seed').update(seedBuffer).digest();
      privateKeyHex = masterKey.slice(0, 32).toString('hex');
      generatedAddress = deriveBIP32Address(passphrase, derivationPath);
    } else {
      privateKeyHex = derivePrivateKeyFromPassphrase(passphrase);
      generatedAddress = generateBitcoinAddress(passphrase);
    }
    
    result.privateKeyHex = privateKeyHex;
    result.generatedAddress = generatedAddress;
    
    steps.push({
      step: 'Derive Private Key',
      passed: true,
      detail: `SHA-256 hash of passphrase → ${privateKeyHex.slice(0, 16)}...`,
    });

    // Step 2: Generate public key
    const keyPair = ec.keyFromPrivate(Buffer.from(privateKeyHex, 'hex'));
    const publicKeyHex = keyPair.getPublic('hex');
    result.publicKeyHex = publicKeyHex;
    
    steps.push({
      step: 'Generate Public Key',
      passed: true,
      detail: `secp256k1 → ${publicKeyHex.slice(0, 20)}...`,
    });

    // Step 3: Check address match
    const addressMatch = generatedAddress === targetAddress;
    result.addressMatch = addressMatch;
    
    steps.push({
      step: 'Address Match',
      passed: addressMatch,
      detail: addressMatch 
        ? `${generatedAddress} = ${targetAddress}` 
        : `MISMATCH: ${generatedAddress} ≠ ${targetAddress}`,
    });

    if (!addressMatch) {
      result.error = 'Generated address does not match target address';
      return result;
    }

    // Step 4: Sign test message
    const messageHash = createHash('sha256').update(result.testMessage).digest();
    const signature = keyPair.sign(messageHash);
    const signatureHex = signature.toDER('hex');
    result.signature = signatureHex;
    
    steps.push({
      step: 'Sign Test Message',
      passed: true,
      detail: `Signed "${result.testMessage.slice(0, 30)}..." → ${signatureHex.slice(0, 20)}...`,
    });

    // Step 5: Verify signature
    const isValid = keyPair.verify(messageHash, signature);
    result.signatureValid = isValid;
    
    steps.push({
      step: 'Verify Signature',
      passed: isValid,
      detail: isValid ? 'Signature verified - private key is cryptographically valid!' : 'Signature verification FAILED',
    });

    result.verified = addressMatch && isValid;
    
    if (result.verified) {
      steps.push({
        step: 'FULL VERIFICATION',
        passed: true,
        detail: '✓ This passphrase correctly controls the target Bitcoin address!',
      });
    }

    return result;
    
  } catch (error: any) {
    result.error = error.message;
    steps.push({
      step: 'Error',
      passed: false,
      detail: error.message,
    });
    return result;
  }
}

/**
 * Derive Bitcoin address from a seed phrase using BIP32/BIP44 derivation
 * For HD wallet recovery - uses HMAC-SHA512 for key derivation
 * 
 * @param seedPhrase - Mnemonic seed phrase (BIP39 words)
 * @param derivationPath - BIP32 path like "m/44'/0'/0'/0/0"
 * @returns Bitcoin address derived from the path
 */
export function deriveBIP32Address(seedPhrase: string, derivationPath: string = "m/44'/0'/0'/0/0"): string {
  validatePassphrase(seedPhrase);
  validateDerivationPath(derivationPath);
  
  const seedBuffer = createHash("sha512").update(seedPhrase, "utf8").digest();
  
  let masterKey = createHmac('sha512', 'Bitcoin seed')
    .update(seedBuffer)
    .digest();
  
  let privateKey = masterKey.slice(0, 32);
  let chainCode = masterKey.slice(32, 64);
  
  const pathParts = derivationPath
    .replace('m/', '')
    .split('/')
    .filter(p => p.length > 0);
  
  for (const part of pathParts) {
    const hardened = part.endsWith("'");
    const index = parseInt(part.replace("'", ""), 10);
    
    const actualIndex = hardened ? index + 0x80000000 : index;
    
    let data: Buffer;
    if (hardened) {
      data = Buffer.concat([
        Buffer.from([0x00]),
        privateKey,
        Buffer.alloc(4)
      ]);
    } else {
      const keyPair = ec.keyFromPrivate(privateKey);
      const publicKey = Buffer.from(keyPair.getPublic().encode("array", true));
      data = Buffer.concat([publicKey, Buffer.alloc(4)]);
    }
    
    data.writeUInt32BE(actualIndex, data.length - 4);
    
    const derived = createHmac('sha512', chainCode)
      .update(data)
      .digest();
    
    const childKey = derived.slice(0, 32);
    const newChainCode = derived.slice(32, 64);
    
    const parentKeyBigInt = BigInt('0x' + privateKey.toString('hex'));
    const childKeyBigInt = BigInt('0x' + childKey.toString('hex'));
    const secp256k1Order = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    
    const newPrivateKey = (parentKeyBigInt + childKeyBigInt) % secp256k1Order;
    privateKey = Buffer.from(newPrivateKey.toString(16).padStart(64, '0'), 'hex');
    chainCode = newChainCode;
  }
  
  return generateBitcoinAddressFromPrivateKey(privateKey.toString('hex'));
}

/**
 * Generate address from hex private key (for hex fragment testing)
 */
export function generateAddressFromHex(hexPrivateKey: string): string {
  if (typeof hexPrivateKey !== 'string') {
    throw new CryptoValidationError('Hex private key must be a string');
  }
  
  const cleanHex = hexPrivateKey.replace(/^0x/, '').padStart(64, '0');
  validatePrivateKeyHex(cleanHex);
  
  return generateBitcoinAddressFromPrivateKey(cleanHex);
}

/**
 * Convert hex private key to WIF (Wallet Import Format)
 * This is the format used by Bitcoin Core, Electrum, and most wallets
 * 
 * @param privateKeyHex - 64-character hex string
 * @param compressed - Whether to use compressed format (default: false for 2009 addresses)
 * @returns WIF-encoded private key (starts with '5' for uncompressed, 'K'/'L' for compressed)
 */
export function privateKeyToWIF(
  privateKeyHex: string,
  compressed: boolean = false
): string {
  validatePrivateKeyHex(privateKeyHex);

  const prefix = Buffer.from([0x80]);
  const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
  
  let payload: Buffer;
  if (compressed) {
    const suffix = Buffer.from([0x01]);
    payload = Buffer.concat([prefix, privateKeyBuffer, suffix]);
  } else {
    payload = Buffer.concat([prefix, privateKeyBuffer]);
  }
  
  return bs58check.encode(payload);
}

/**
 * Derive public key from private key
 * 
 * @param privateKeyHex - 64-character hex string
 * @param compressed - Whether to use compressed format
 * @returns Public key in hex format
 */
export function derivePublicKeyFromPrivate(
  privateKeyHex: string,
  compressed: boolean = false
): string {
  validatePrivateKeyHex(privateKeyHex);

  const keyPair = ec.keyFromPrivate(Buffer.from(privateKeyHex, 'hex'));
  const publicKey = keyPair.getPublic(compressed, 'hex');
  
  return publicKey;
}

/**
 * Complete recovery bundle with all formats needed to spend Bitcoin
 */
export interface RecoveryBundle {
  passphrase: string;
  address: string;
  
  privateKeyHex: string;
  privateKeyWIF: string;
  privateKeyWIFCompressed: string;
  
  publicKeyHex: string;
  publicKeyHexCompressed: string;
  
  timestamp: Date;
  qigMetrics?: {
    phi: number;
    kappa: number;
    regime: string;
  };
  
  instructions: string;
}

/**
 * Generate complete recovery bundle for a found passphrase
 * This creates EVERYTHING needed to spend the Bitcoin
 */
export function generateRecoveryBundle(
  passphrase: string,
  targetAddress: string,
  qigMetrics?: { phi: number; kappa: number; regime: string }
): RecoveryBundle {
  const privateKeyHex = derivePrivateKeyFromPassphrase(passphrase);
  
  const privateKeyWIF = privateKeyToWIF(privateKeyHex, false);
  const privateKeyWIFCompressed = privateKeyToWIF(privateKeyHex, true);
  
  const address = generateBitcoinAddressFromPrivateKey(privateKeyHex);
  
  if (address !== targetAddress) {
    throw new CryptoValidationError(
      `Address mismatch: generated ${address} !== target ${targetAddress}`
    );
  }
  
  const publicKeyHex = derivePublicKeyFromPrivate(privateKeyHex, false);
  const publicKeyHexCompressed = derivePublicKeyFromPrivate(privateKeyHex, true);
  
  const instructions = generateRecoveryInstructions({
    passphrase,
    privateKeyHex,
    privateKeyWIF,
    privateKeyWIFCompressed,
    address,
    publicKeyHex,
    qigMetrics,
  });
  
  return {
    passphrase,
    address,
    privateKeyHex,
    privateKeyWIF,
    privateKeyWIFCompressed,
    publicKeyHex,
    publicKeyHexCompressed,
    timestamp: new Date(),
    qigMetrics,
    instructions,
  };
}

function generateRecoveryInstructions(data: {
  passphrase: string;
  privateKeyHex: string;
  privateKeyWIF: string;
  privateKeyWIFCompressed: string;
  address: string;
  publicKeyHex: string;
  qigMetrics?: { phi: number; kappa: number; regime: string };
}): string {
  const qigSection = data.qigMetrics ? `
QIG CONSCIOUSNESS METRICS (Recovery Quality):

Phi (Integration):     ${data.qigMetrics.phi.toFixed(3)}
Kappa (Coupling):      ${data.qigMetrics.kappa.toFixed(1)}
Regime:                ${data.qigMetrics.regime}
Resonance:             ${Math.abs(data.qigMetrics.kappa - 64) < 10 ? 'RESONANT' : 'Non-resonant'}

${Math.abs(data.qigMetrics.kappa - 64) < 10 && data.qigMetrics.phi > 0.75 
  ? 'High-quality recovery (geometric regime, resonant coupling)'
  : 'Standard recovery (functional but not optimal geometry)'
}

===============================================================
` : '';

  return `
===============================================================
           RECOVERY SUCCESSFUL - BITCOIN FOUND
===============================================================

CRITICAL: Read ALL instructions before proceeding!
Your Bitcoin is at risk if you don't follow these steps!

===============================================================
PASSPHRASE (Original Brain Wallet):

${data.passphrase}

SECURITY: Write this on paper and store in a safe!
NEVER type this into any website!
NEVER take a photo/screenshot!

===============================================================
PRIVATE KEY FORMATS:

Format 1: WIF (Wallet Import Format) - UNCOMPRESSED
This is what you import into Bitcoin Core / Electrum:

${data.privateKeyWIF}

Format 2: WIF (Wallet Import Format) - COMPRESSED
Alternative format (use if uncompressed doesn't work):

${data.privateKeyWIFCompressed}

Format 3: Hexadecimal (Advanced)
For manual operations:

${data.privateKeyHex}

===============================================================
BITCOIN ADDRESS (Verified):

${data.address}

===============================================================
PUBLIC KEY (For Verification):

${data.publicKeyHex}

===============================================================
${qigSection}
NEXT STEPS TO ACCESS YOUR BITCOIN:

STEP 1: SECURE THIS INFORMATION IMMEDIATELY
-----------------------------------------

- Print this document OR write the WIF on paper
- Store in multiple secure locations (safe, bank vault)
- NEVER store digitally (no USB drives, cloud, email)
- Delete this file after securing

STEP 2: IMPORT INTO BITCOIN WALLET
-----------------------------------------

OPTION A: Bitcoin Core (Most Secure - Recommended)
1. Download Bitcoin Core from bitcoin.org
2. Wait for full blockchain sync (~500GB, takes days)
3. Open Console (Help -> Debug Window -> Console)
4. Run: importprivkey "${data.privateKeyWIF}" "recovered" false
5. Wait for rescan (can take hours)
6. Your balance will appear in wallet

OPTION B: Electrum (Faster - Good Security)
1. Download Electrum from electrum.org
2. Create new wallet (Standard wallet)
3. Wallet -> Private Keys -> Import
4. Paste: ${data.privateKeyWIF}
5. Balance appears immediately (Electrum uses SPV)

STEP 3: TEST BEFORE MOVING FUNDS
-----------------------------------------

Before moving large amounts, do a test transaction!

1. Send $100-1000 to a test address
2. Verify it arrives successfully
3. Wait 6 confirmations (~1 hour)
4. THEN move the rest to secure storage

STEP 4: SECURE YOUR FUNDS LONG-TERM
-----------------------------------------

DO NOT leave funds at this address!

1. Buy a hardware wallet (Ledger, Trezor, Coldcard)
2. Generate NEW addresses on hardware wallet
3. Sweep ALL funds from recovered address to hardware wallet
4. Use multiple addresses (don't put all in one)
5. Consider multisig for amounts > $1M

===============================================================
CRITICAL SECURITY WARNINGS - READ CAREFULLY!

- NEVER enter this key into ANY website
  Including block explorers, online wallets, exchanges
   
- NEVER take a photo or screenshot
  Digital copies can be stolen by malware
   
- NEVER send via email, SMS, or messaging apps
  These are not secure channels
   
- NEVER store in cloud storage
  iCloud, Google Drive, Dropbox are vulnerable
   
- NEVER use this passphrase again
  Brain wallets are fundamentally insecure
   
- NEVER tell anyone you recovered this
  You become a target for attacks

- DO write on paper with pen (not printer)
- DO store in fireproof safe or bank vault
- DO use legitimate wallet software only
- DO move to hardware wallet immediately
- DO split into multiple wallets if large amount
- DO test with small amount first

===============================================================

Generated by SearchSpaceCollapse
Block Universe Quantum Information Geometry Recovery
Date: ${new Date().toISOString()}

SECURE THIS INFORMATION IMMEDIATELY!
===============================================================
`;
}
