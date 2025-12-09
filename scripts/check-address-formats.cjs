#!/usr/bin/env node
/**
 * Check both compressed and uncompressed addresses for a passphrase
 *
 * Usage: node scripts/check-address-formats.js "passphrase"
 */

const crypto = require('crypto');
const elliptic = require('elliptic');
const bs58checkModule = require('bs58check');
const bs58check = bs58checkModule.default || bs58checkModule;

const EC = elliptic.ec;
const ec = new EC('secp256k1');

function deriveAddresses(passphrase) {
  const privateKeyHash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
  const keyPair = ec.keyFromPrivate(privateKeyHash);

  const pubUncompressed = Buffer.from(keyPair.getPublic().encode('array', false));
  const pubCompressed = Buffer.from(keyPair.getPublic().encode('array', true));

  function toAddress(pubKey) {
    const sha256 = crypto.createHash('sha256').update(pubKey).digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
    return bs58check.encode(Buffer.concat([Buffer.from([0x00]), ripemd160]));
  }

  function toWIF(privKey, compressed) {
    const prefix = Buffer.from([0x80]);
    if (compressed) {
      return bs58check.encode(Buffer.concat([prefix, privKey, Buffer.from([0x01])]));
    }
    return bs58check.encode(Buffer.concat([prefix, privKey]));
  }

  return {
    privateKeyHex: privateKeyHash.toString('hex'),
    uncompressed: {
      address: toAddress(pubUncompressed),
      wif: toWIF(privateKeyHash, false),
      publicKey: pubUncompressed.toString('hex')
    },
    compressed: {
      address: toAddress(pubCompressed),
      wif: toWIF(privateKeyHash, true),
      publicKey: pubCompressed.toString('hex')
    }
  };
}

const passphrase = process.argv[2] || 'signature';

console.log(`\n=== Address Formats for: "${passphrase}" ===\n`);

const result = deriveAddresses(passphrase);

console.log('Private Key (hex):', result.privateKeyHex);
console.log('');
console.log('UNCOMPRESSED (legacy 2009-era format):');
console.log('  Address:', result.uncompressed.address);
console.log('  WIF:    ', result.uncompressed.wif);
console.log('  PubKey: ', result.uncompressed.publicKey.slice(0, 66) + '...');
console.log('');
console.log('COMPRESSED (modern format):');
console.log('  Address:', result.compressed.address);
console.log('  WIF:    ', result.compressed.wif);
console.log('  PubKey: ', result.compressed.publicKey);
console.log('');
console.log('Note: The same private key generates BOTH addresses.');
console.log('Check if your target matches either address format.\n');
