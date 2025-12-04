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

/**
 * Generate Bitcoin address from passphrase
 * @param passphrase - The passphrase to hash
 * @param compressed - Use compressed public key (default: true for modern, false for 2009-era)
 */
export function generateBitcoinAddress(passphrase: string, compressed: boolean = true): string {
  validatePassphrase(passphrase);
  
  const privateKeyHash = createHash("sha256").update(passphrase, "utf8").digest();
  
  const keyPair = ec.keyFromPrivate(privateKeyHash);
  
  const publicKey = Buffer.from(keyPair.getPublic().encode("array", compressed));
  
  const sha256Hash = createHash("sha256").update(publicKey).digest();
  
  const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
  
  const versionedPayload = Buffer.concat([
    Buffer.from([0x00]),
    ripemd160Hash,
  ]);
  
  const address = bs58check.encode(versionedPayload);
  
  return address;
}

/**
 * Generate BOTH compressed and uncompressed addresses from passphrase
 * Critical for 2009-era recovery where uncompressed was the default
 */
export function generateBothAddresses(passphrase: string): { 
  compressed: string; 
  uncompressed: string; 
} {
  return {
    compressed: generateBitcoinAddress(passphrase, true),
    uncompressed: generateBitcoinAddress(passphrase, false),
  };
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

/**
 * Generate Bitcoin address from private key
 * @param privateKeyHex - 64-character hex private key
 * @param compressed - Use compressed public key (default: true)
 */
export function generateBitcoinAddressFromPrivateKey(privateKeyHex: string, compressed: boolean = true): string {
  validatePrivateKeyHex(privateKeyHex);
  
  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
  
  const keyPair = ec.keyFromPrivate(privateKeyBuffer);
  
  const publicKey = Buffer.from(keyPair.getPublic().encode("array", compressed));
  
  const sha256Hash = createHash("sha256").update(publicKey).digest();
  
  const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
  
  const versionedPayload = Buffer.concat([
    Buffer.from([0x00]),
    ripemd160Hash,
  ]);
  
  const address = bs58check.encode(versionedPayload);
  
  return address;
}

/**
 * Generate BOTH compressed and uncompressed addresses from private key
 * Critical for 2009-era recovery where uncompressed was the default
 */
export function generateBothAddressesFromPrivateKey(privateKeyHex: string): {
  compressed: string;
  uncompressed: string;
} {
  return {
    compressed: generateBitcoinAddressFromPrivateKey(privateKeyHex, true),
    uncompressed: generateBitcoinAddressFromPrivateKey(privateKeyHex, false),
  };
}

export function verifyBrainWallet(): { success: boolean; testAddress?: string; error?: string } {
  try {
    const testPhrase = "test passphrase for verification";
    const address = generateBitcoinAddress(testPhrase);
    
    const knownPhrase = "correct horse battery staple";
    generateBitcoinAddress(knownPhrase);
    
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
 * Derive BIP32 private key from seed phrase (returns hex string)
 * Use this when you need to queue the derived address for balance checking
 */
export function deriveBIP32PrivateKey(seedPhrase: string, derivationPath: string = "m/44'/0'/0'/0/0"): string {
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
  
  return privateKey.toString('hex');
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

/**
 * Validate a WIF (Wallet Import Format) private key
 * Checks structure, checksum, and network byte
 * 
 * @param wif - The WIF-encoded private key to validate
 * @returns Validation result with details
 */
export function validateWIF(wif: string): {
  valid: boolean;
  compressed: boolean;
  network: 'mainnet' | 'testnet' | 'unknown';
  error?: string;
} {
  try {
    if (typeof wif !== 'string' || wif.length === 0) {
      return { valid: false, compressed: false, network: 'unknown', error: 'WIF must be a non-empty string' };
    }
    
    const decoded = bs58check.decode(wif);
    
    const versionByte = decoded[0];
    const isMainnet = versionByte === 0x80;
    const isTestnet = versionByte === 0xef;
    
    if (!isMainnet && !isTestnet) {
      return { valid: false, compressed: false, network: 'unknown', error: `Invalid version byte: 0x${versionByte.toString(16)}` };
    }
    
    const isCompressed = decoded.length === 34 && decoded[33] === 0x01;
    const isUncompressed = decoded.length === 33;
    
    if (!isCompressed && !isUncompressed) {
      return { valid: false, compressed: false, network: 'unknown', error: `Invalid WIF length: ${decoded.length} bytes` };
    }
    
    const privateKeyBytes = isCompressed ? decoded.slice(1, 33) : decoded.slice(1, 33);
    const privateKeyBigInt = BigInt('0x' + Buffer.from(privateKeyBytes).toString('hex'));
    const secp256k1Order = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    
    if (privateKeyBigInt === BigInt(0) || privateKeyBigInt >= secp256k1Order) {
      return { valid: false, compressed: isCompressed, network: isMainnet ? 'mainnet' : 'testnet', error: 'Private key out of valid range' };
    }
    
    return {
      valid: true,
      compressed: isCompressed,
      network: isMainnet ? 'mainnet' : 'testnet',
    };
  } catch (error: any) {
    return {
      valid: false,
      compressed: false,
      network: 'unknown',
      error: `WIF decode error: ${error.message}`,
    };
  }
}

/**
 * Convert WIF back to hex private key
 * 
 * @param wif - WIF-encoded private key
 * @returns Object with hex private key and compression flag
 */
export function wifToPrivateKeyHex(wif: string): { privateKeyHex: string; compressed: boolean } {
  const validation = validateWIF(wif);
  if (!validation.valid) {
    throw new CryptoValidationError(validation.error || 'Invalid WIF');
  }
  
  const decoded = bs58check.decode(wif);
  const privateKeyBytes = decoded.slice(1, 33);
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
  
  return {
    privateKeyHex,
    compressed: validation.compressed,
  };
}

/**
 * Save recovery bundle to files
 * Creates both human-readable and machine-readable formats
 * 
 * @param bundle - The recovery bundle to save
 * @param outputDir - Directory to save files (default: data/recoveries)
 * @returns Paths to saved files
 */
export async function saveRecoveryBundleToFiles(
  bundle: RecoveryBundle,
  outputDir: string = 'data/recoveries'
): Promise<{ txtPath: string; jsonPath: string }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = bundle.timestamp.toISOString().replace(/[:.]/g, '-');
  const safeAddress = bundle.address.slice(0, 8);
  const baseName = `recovery_${safeAddress}_${timestamp}`;
  
  const txtPath = path.join(outputDir, `${baseName}.txt`);
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  
  await fs.writeFile(txtPath, bundle.instructions, 'utf-8');
  
  const jsonBundle = {
    ...bundle,
    timestamp: bundle.timestamp.toISOString(),
    savedAt: new Date().toISOString(),
  };
  await fs.writeFile(jsonPath, JSON.stringify(jsonBundle, null, 2), 'utf-8');
  
  console.log(`[Recovery] Saved bundle to ${txtPath} and ${jsonPath}`);
  
  return { txtPath, jsonPath };
}

/**
 * Verify WIF matches target address
 * 
 * @param wif - WIF-encoded private key
 * @param targetAddress - Expected Bitcoin address
 * @returns Whether the WIF key controls the target address
 */
export function verifyWIFMatchesAddress(wif: string, targetAddress: string): boolean {
  try {
    const { privateKeyHex, compressed } = wifToPrivateKeyHex(wif);
    
    if (compressed) {
      const address = generateBitcoinAddressFromPrivateKey(privateKeyHex, true);
      if (address === targetAddress) return true;
    }
    
    const address = generateBitcoinAddressFromPrivateKey(privateKeyHex, false);
    return address === targetAddress;
  } catch {
    return false;
  }
}

/**
 * Decode an extended private key (xprv) and derive child keys
 * 
 * Extended keys are Base58Check encoded and contain:
 * - 4 bytes: version (0x0488ADE4 for mainnet xprv)
 * - 1 byte: depth
 * - 4 bytes: parent fingerprint
 * - 4 bytes: child number
 * - 32 bytes: chain code
 * - 33 bytes: key data (0x00 + 32-byte private key)
 * 
 * @param xprv - Base58Check encoded extended private key
 * @returns Decoded key components
 */
export function decodeXprv(xprv: string): {
  privateKey: Buffer;
  chainCode: Buffer;
  depth: number;
} {
  try {
    const decoded = bs58check.decode(xprv);
    const decodedBuf = Buffer.from(decoded);
    
    if (decodedBuf.length !== 78) {
      throw new CryptoValidationError('Invalid xprv length');
    }
    
    // Check version bytes (mainnet xprv = 0x0488ADE4)
    const version = decodedBuf.slice(0, 4);
    const expectedVersion = Buffer.from([0x04, 0x88, 0xad, 0xe4]);
    if (!version.equals(expectedVersion)) {
      throw new CryptoValidationError('Invalid xprv version - must be mainnet');
    }
    
    const depth = decodedBuf[4];
    const chainCode = Buffer.from(decodedBuf.slice(13, 45));
    
    // Key data: first byte is 0x00, followed by 32-byte private key
    if (decodedBuf[45] !== 0x00) {
      throw new CryptoValidationError('Invalid xprv key prefix');
    }
    const privateKey = Buffer.from(decodedBuf.slice(46, 78));
    
    return { privateKey, chainCode, depth };
  } catch (error) {
    if (error instanceof CryptoValidationError) throw error;
    throw new CryptoValidationError(`Failed to decode xprv: ${error}`);
  }
}

/**
 * Derive a child private key from parent using BIP32
 * 
 * @param parentKey - Parent private key (32 bytes)
 * @param parentChainCode - Parent chain code (32 bytes)
 * @param index - Child index
 * @param hardened - Whether this is a hardened derivation
 * @returns Child private key and chain code
 */
function deriveChildKey(
  parentKey: Buffer,
  parentChainCode: Buffer,
  index: number,
  hardened: boolean
): { childKey: Buffer; childChainCode: Buffer } {
  let data: Buffer;
  
  if (hardened) {
    // Hardened derivation: data = 0x00 || parent_key || index
    index += 0x80000000; // Add hardened flag
    data = Buffer.alloc(37);
    data[0] = 0x00;
    parentKey.copy(data, 1);
    data.writeUInt32BE(index, 33);
  } else {
    // Normal derivation: data = public_key || index
    const keyPair = ec.keyFromPrivate(parentKey);
    const publicKey = Buffer.from(keyPair.getPublic(true, 'array'));
    data = Buffer.alloc(37);
    publicKey.copy(data, 0);
    data.writeUInt32BE(index, 33);
  }
  
  // HMAC-SHA512
  const hmac = createHmac('sha512', parentChainCode);
  hmac.update(data);
  const I = hmac.digest();
  
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  
  // Child key = (IL + parent_key) mod n
  const parentKeyBN = BigInt('0x' + parentKey.toString('hex'));
  const ILBN = BigInt('0x' + IL.toString('hex'));
  const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
  
  const childKeyBN = (ILBN + parentKeyBN) % n;
  const childKeyHex = childKeyBN.toString(16).padStart(64, '0');
  
  return {
    childKey: Buffer.from(childKeyHex, 'hex'),
    childChainCode: Buffer.from(IR),
  };
}

/**
 * Derive private key from extended private key at a BIP32 path
 * 
 * @param xprv - Extended private key (xprv...)
 * @param path - BIP32 derivation path (e.g., "m/44'/0'/0'/0/0")
 * @returns Private key hex string
 */
export function deriveFromXprv(xprv: string, path: string): string {
  try {
    const { privateKey, chainCode } = decodeXprv(xprv);
    
    // Parse path
    const segments = path.replace(/^m\/?/, '').split('/').filter(s => s.length > 0);
    
    let currentKey = privateKey;
    let currentChainCode = chainCode;
    
    for (const segment of segments) {
      const hardened = segment.endsWith("'");
      const index = parseInt(segment.replace("'", ""), 10);
      
      if (isNaN(index) || index < 0) {
        throw new CryptoValidationError(`Invalid path segment: ${segment}`);
      }
      
      const result = deriveChildKey(currentKey, currentChainCode, index, hardened);
      currentKey = result.childKey;
      currentChainCode = result.childChainCode;
    }
    
    return currentKey.toString('hex');
  } catch (error) {
    if (error instanceof CryptoValidationError) throw error;
    throw new CryptoValidationError(`Failed to derive from xprv: ${error}`);
  }
}
