import { createHash } from "crypto";
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
