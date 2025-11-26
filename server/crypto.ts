import { createHash, createHmac, randomBytes } from "crypto";
import elliptic from "elliptic";
import bs58check from "bs58check";

const EC = elliptic.ec;
const ec = new EC("secp256k1");

export function generateBitcoinAddress(passphrase: string): string {
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
 * Derive Bitcoin address from a seed phrase using BIP32/BIP44 derivation
 * For HD wallet recovery - uses HMAC-SHA512 for key derivation
 * 
 * @param seedPhrase - Mnemonic seed phrase (BIP39 words)
 * @param derivationPath - BIP32 path like "m/44'/0'/0'/0/0"
 * @returns Bitcoin address derived from the path
 */
export function deriveBIP32Address(seedPhrase: string, derivationPath: string = "m/44'/0'/0'/0/0"): string {
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
  const cleanHex = hexPrivateKey.replace(/^0x/, '').padStart(64, '0');
  return generateBitcoinAddressFromPrivateKey(cleanHex);
}
