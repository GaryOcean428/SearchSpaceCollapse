/**
 * Federation Encryption Utilities
 * 
 * AES-256-GCM encryption for securing remote API keys stored in the database.
 * Uses FEDERATION_ENCRYPTION_KEY environment variable for the encryption key.
 * Format: iv:authTag:ciphertext (all base64 encoded)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get the encryption key from environment, or generate a random one
 * (random keys won't persist across restarts)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.FEDERATION_ENCRYPTION_KEY;
  
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  
  console.warn(
    '[FederationEncryption] FEDERATION_ENCRYPTION_KEY not set or invalid. ' +
    'Using random key - encrypted credentials will not persist across restarts.'
  );
  
  return randomBytes(KEY_LENGTH);
}

let encryptionKey: Buffer | null = null;

function getKey(): Buffer {
  if (!encryptionKey) {
    encryptionKey = getEncryptionKey();
  }
  return encryptionKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - The text to encrypt (e.g., an API key)
 * @returns Encrypted string in format: iv:authTag:ciphertext (base64)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (invalid key, corrupted data, etc.)
 */
export function decryptApiKey(encryptedData: string): string {
  const key = getKey();
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivB64, authTagB64, ciphertext] = parts;
  
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Check if the encryption key is properly configured (persistent)
 */
export function isEncryptionKeyConfigured(): boolean {
  const envKey = process.env.FEDERATION_ENCRYPTION_KEY;
  return Boolean(envKey && envKey.length === 64);
}
