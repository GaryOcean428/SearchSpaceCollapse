import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status?: {
    confirmed: boolean;
    block_height?: number;
  };
}

interface SweepResult {
  success: boolean;
  txId?: string;
  txHex?: string;
  error?: string;
  details?: {
    sourceAddress: string;
    destinationAddress: string;
    inputs: number;
    totalInput: number;
    outputAmount: number;
    fee: number;
    feeRate: number;
    explorerUrl?: string;
  };
}

interface AddressType {
  type: 'p2pkh' | 'p2wpkh' | 'p2sh-p2wpkh';
  addressStarts: string;
}

const BLOCKSTREAM_API = 'https://blockstream.info/api';
const MEMPOOL_API = 'https://mempool.space/api';

// SECURITY: Hardcoded destination address - NEVER load from environment
// This is the user's Electrum wallet for receiving recovered funds
// Changing this requires code change + review, not just env modification
const HARDCODED_DESTINATION_ADDRESS = 'bc1qcc0ln7gg92vlclfw8t39zfw2cfqtytcwum733l';

class BitcoinSweepService {
  private network: bitcoin.Network;
  private readonly destinationAddress: string = HARDCODED_DESTINATION_ADDRESS;
  private feeRate: number = 5;

  constructor() {
    this.network = bitcoin.networks.bitcoin;
    this.loadConfig();
    console.log('[BitcoinSweep] Service initialized');
    
    // Security assertion: Verify destination is hardcoded correctly
    if (this.destinationAddress !== HARDCODED_DESTINATION_ADDRESS) {
      throw new Error('[BitcoinSweep] SECURITY: Destination address mismatch - funds could be misdirected!');
    }
    console.log(`[BitcoinSweep] SECURITY: Destination HARDCODED to ${this.destinationAddress.slice(0, 20)}...`);
  }

  private loadConfig(): void {
    // Fee rate can be configured via env (not security critical)
    const feeRateEnv = process.env.SWEEP_FEE_RATE;
    if (feeRateEnv) {
      this.feeRate = parseInt(feeRateEnv, 10) || 5;
    }
    
    // SECURITY: Warn if env tries to override the hardcoded destination
    const envDestination = process.env.SWEEP_DESTINATION_ADDRESS;
    if (envDestination && envDestination !== HARDCODED_DESTINATION_ADDRESS) {
      console.warn('[BitcoinSweep] SECURITY WARNING: Env destination ignored - using hardcoded address');
    }
    
    console.log(`[BitcoinSweep] Destination configured: ${this.destinationAddress.slice(0, 20)}...`);
  }

  isConfigured(): boolean {
    return !!this.destinationAddress;
  }

  getDestinationAddress(): string {
    return this.destinationAddress;
  }

  // SECURITY: setDestinationAddress REMOVED - destination is hardcoded and immutable
  // Any attempt to change destination requires code modification + review
  // This method was identified as a security vulnerability that could bypass hardcoding

  setFeeRate(satPerByte: number): void {
    this.feeRate = satPerByte;
    console.log(`[BitcoinSweep] Fee rate updated: ${satPerByte} sat/byte`);
  }

  private async fetchWithFallback<T>(
    primaryUrl: string,
    fallbackUrl: string
  ): Promise<T> {
    try {
      const response = await fetch(primaryUrl);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (primaryError) {
      console.log(`[BitcoinSweep] Primary API failed, trying fallback...`);
      const response = await fetch(fallbackUrl);
      if (!response.ok) {
        throw new Error(`Both APIs failed: ${primaryError}`);
      }
      return await response.json();
    }
  }

  private async fetchUTXOs(address: string): Promise<UTXO[]> {
    const primaryUrl = `${BLOCKSTREAM_API}/address/${address}/utxo`;
    const fallbackUrl = `${MEMPOOL_API}/address/${address}/utxo`;
    
    const utxos = await this.fetchWithFallback<UTXO[]>(primaryUrl, fallbackUrl);
    return utxos.filter(utxo => utxo.status?.confirmed);
  }

  private async fetchRawTransaction(txid: string): Promise<string> {
    const primaryUrl = `${BLOCKSTREAM_API}/tx/${txid}/hex`;
    const fallbackUrl = `${MEMPOOL_API}/tx/${txid}/hex`;
    
    try {
      const response = await fetch(primaryUrl);
      if (response.ok) {
        return await response.text();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch {
      const response = await fetch(fallbackUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch raw tx ${txid}`);
      }
      return await response.text();
    }
  }

  private estimateFee(inputCount: number, outputCount: number, addressType: AddressType['type']): number {
    let inputSize: number;
    let outputSize: number;
    
    switch (addressType) {
      case 'p2wpkh':
        inputSize = 68;
        outputSize = 31;
        break;
      case 'p2sh-p2wpkh':
        inputSize = 91;
        outputSize = 32;
        break;
      case 'p2pkh':
      default:
        inputSize = 148;
        outputSize = 34;
        break;
    }
    
    const overhead = 10;
    const estimatedSize = overhead + (inputCount * inputSize) + (outputCount * outputSize);
    
    return Math.ceil(estimatedSize * this.feeRate);
  }

  private detectAddressType(address: string): AddressType {
    if (address.startsWith('bc1q')) {
      return { type: 'p2wpkh', addressStarts: 'bc1' };
    } else if (address.startsWith('3')) {
      return { type: 'p2sh-p2wpkh', addressStarts: '3' };
    } else {
      return { type: 'p2pkh', addressStarts: '1' };
    }
  }

  private createPayment(
    keyPair: ReturnType<typeof ECPair.fromWIF>,
    addressType: AddressType['type']
  ): { address: string; output: Uint8Array; redeemScript?: Uint8Array } {
    switch (addressType) {
      case 'p2wpkh': {
        const p2wpkh = bitcoin.payments.p2wpkh({
          pubkey: keyPair.publicKey,
          network: this.network,
        });
        return {
          address: p2wpkh.address!,
          output: p2wpkh.output!,
        };
      }
      case 'p2sh-p2wpkh': {
        const p2wpkh = bitcoin.payments.p2wpkh({
          pubkey: keyPair.publicKey,
          network: this.network,
        });
        const p2sh = bitcoin.payments.p2sh({
          redeem: p2wpkh,
          network: this.network,
        });
        return {
          address: p2sh.address!,
          output: p2sh.output!,
          redeemScript: p2wpkh.output,
        };
      }
      case 'p2pkh':
      default: {
        const p2pkh = bitcoin.payments.p2pkh({
          pubkey: keyPair.publicKey,
          network: this.network,
        });
        return {
          address: p2pkh.address!,
          output: p2pkh.output!,
        };
      }
    }
  }

  async sweep(wif: string, sourceAddress?: string): Promise<SweepResult> {
    if (!this.destinationAddress) {
      return {
        success: false,
        error: 'No destination address configured. Set SWEEP_DESTINATION_ADDRESS environment variable.',
      };
    }

    try {
      const keyPair = ECPair.fromWIF(wif, this.network);
      
      const addressType = sourceAddress 
        ? this.detectAddressType(sourceAddress)
        : { type: 'p2pkh' as const, addressStarts: '1' };
      
      const payment = this.createPayment(keyPair, addressType.type);
      const actualSourceAddress = sourceAddress || payment.address;
      
      console.log(`[BitcoinSweep] Sweeping from ${actualSourceAddress} to ${this.destinationAddress}`);
      
      const utxos = await this.fetchUTXOs(actualSourceAddress);
      
      if (!utxos || utxos.length === 0) {
        return {
          success: false,
          error: 'No confirmed UTXOs found for this address. Balance may be unconfirmed or already spent.',
          details: {
            sourceAddress: actualSourceAddress,
            destinationAddress: this.destinationAddress,
            inputs: 0,
            totalInput: 0,
            outputAmount: 0,
            fee: 0,
            feeRate: this.feeRate,
          },
        };
      }

      const totalBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
      console.log(`[BitcoinSweep] Found ${utxos.length} UTXOs, total: ${totalBalance} satoshis`);

      const estimatedFee = this.estimateFee(utxos.length, 1, addressType.type);
      const sendAmount = totalBalance - estimatedFee;

      if (sendAmount <= 546) {
        return {
          success: false,
          error: `Insufficient funds after fee. Balance: ${totalBalance} sats, Fee: ${estimatedFee} sats, Dust threshold: 546 sats`,
          details: {
            sourceAddress: actualSourceAddress,
            destinationAddress: this.destinationAddress,
            inputs: utxos.length,
            totalInput: totalBalance,
            outputAmount: sendAmount,
            fee: estimatedFee,
            feeRate: this.feeRate,
          },
        };
      }

      const psbt = new bitcoin.Psbt({ network: this.network });

      for (const utxo of utxos) {
        const rawTxHex = await this.fetchRawTransaction(utxo.txid);
        
        if (addressType.type === 'p2pkh') {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            nonWitnessUtxo: Buffer.from(rawTxHex, 'hex'),
          });
        } else if (addressType.type === 'p2wpkh') {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              script: Buffer.from(payment.output),
              value: BigInt(utxo.value),
            },
          });
        } else if (addressType.type === 'p2sh-p2wpkh') {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              script: Buffer.from(payment.output),
              value: BigInt(utxo.value),
            },
            redeemScript: payment.redeemScript ? Buffer.from(payment.redeemScript) : undefined,
          });
        }
      }

      psbt.addOutput({
        address: this.destinationAddress,
        value: BigInt(sendAmount),
      });

      for (let i = 0; i < utxos.length; i++) {
        psbt.signInput(i, keyPair);
      }

      psbt.finalizeAllInputs();

      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();
      const txId = tx.getId();

      console.log(`[BitcoinSweep] Transaction created: ${txId}`);
      console.log(`[BitcoinSweep] Sending ${sendAmount} sats (fee: ${estimatedFee} sats @ ${this.feeRate} sat/byte)`);

      const broadcastResult = await this.broadcastTransaction(txHex);

      if (broadcastResult.success) {
        console.log(`[BitcoinSweep] Transaction broadcast successfully: ${txId}`);
        return {
          success: true,
          txId,
          txHex,
          details: {
            sourceAddress: actualSourceAddress,
            destinationAddress: this.destinationAddress,
            inputs: utxos.length,
            totalInput: totalBalance,
            outputAmount: sendAmount,
            fee: estimatedFee,
            feeRate: this.feeRate,
            explorerUrl: `https://blockstream.info/tx/${txId}`,
          },
        };
      } else {
        return {
          success: false,
          txId,
          txHex,
          error: broadcastResult.error,
          details: {
            sourceAddress: actualSourceAddress,
            destinationAddress: this.destinationAddress,
            inputs: utxos.length,
            totalInput: totalBalance,
            outputAmount: sendAmount,
            fee: estimatedFee,
            feeRate: this.feeRate,
          },
        };
      }
    } catch (error: any) {
      console.error(`[BitcoinSweep] Error:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async broadcastTransaction(txHex: string): Promise<{ success: boolean; txId?: string; error?: string }> {
    const blockstreamUrl = `${BLOCKSTREAM_API}/tx`;
    const mempoolUrl = `${MEMPOOL_API}/tx`;
    
    try {
      const response = await fetch(blockstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: txHex,
      });
      
      if (response.ok) {
        const txId = await response.text();
        return { success: true, txId };
      }
      
      const errorText = await response.text();
      console.log(`[BitcoinSweep] Blockstream broadcast failed: ${errorText}, trying Mempool.space...`);
      
      const mempoolResponse = await fetch(mempoolUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: txHex,
      });
      
      if (mempoolResponse.ok) {
        const txId = await mempoolResponse.text();
        return { success: true, txId };
      }
      
      const mempoolError = await mempoolResponse.text();
      return { success: false, error: `Broadcast failed: ${mempoolError}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createSweepTransactionOnly(wif: string, sourceAddress?: string): Promise<SweepResult> {
    if (!this.destinationAddress) {
      return {
        success: false,
        error: 'No destination address configured',
      };
    }

    try {
      const keyPair = ECPair.fromWIF(wif, this.network);
      const addressType = sourceAddress 
        ? this.detectAddressType(sourceAddress)
        : { type: 'p2pkh' as const, addressStarts: '1' };
      
      const payment = this.createPayment(keyPair, addressType.type);
      const actualSourceAddress = sourceAddress || payment.address;
      
      const utxos = await this.fetchUTXOs(actualSourceAddress);
      
      if (!utxos || utxos.length === 0) {
        return {
          success: false,
          error: 'No confirmed UTXOs found',
        };
      }

      const totalBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
      const estimatedFee = this.estimateFee(utxos.length, 1, addressType.type);
      const sendAmount = totalBalance - estimatedFee;

      if (sendAmount <= 546) {
        return {
          success: false,
          error: `Insufficient funds after fee`,
        };
      }

      const psbt = new bitcoin.Psbt({ network: this.network });

      for (const utxo of utxos) {
        const rawTxHex = await this.fetchRawTransaction(utxo.txid);
        
        if (addressType.type === 'p2pkh') {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            nonWitnessUtxo: Buffer.from(rawTxHex, 'hex'),
          });
        } else if (addressType.type === 'p2wpkh') {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              script: Buffer.from(payment.output),
              value: BigInt(utxo.value),
            },
          });
        } else if (addressType.type === 'p2sh-p2wpkh') {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              script: Buffer.from(payment.output),
              value: BigInt(utxo.value),
            },
            redeemScript: payment.redeemScript ? Buffer.from(payment.redeemScript) : undefined,
          });
        }
      }

      psbt.addOutput({
        address: this.destinationAddress,
        value: BigInt(sendAmount),
      });

      for (let i = 0; i < utxos.length; i++) {
        psbt.signInput(i, keyPair);
      }

      psbt.finalizeAllInputs();

      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();
      const txId = tx.getId();

      return {
        success: true,
        txId,
        txHex,
        details: {
          sourceAddress: actualSourceAddress,
          destinationAddress: this.destinationAddress,
          inputs: utxos.length,
          totalInput: totalBalance,
          outputAmount: sendAmount,
          fee: estimatedFee,
          feeRate: this.feeRate,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async estimateSweep(address: string): Promise<{
    utxoCount: number;
    totalBalance: number;
    estimatedFee: number;
    estimatedOutput: number;
    canSweep: boolean;
    error?: string;
  }> {
    try {
      const utxos = await this.fetchUTXOs(address);
      
      if (!utxos || utxos.length === 0) {
        return {
          utxoCount: 0,
          totalBalance: 0,
          estimatedFee: 0,
          estimatedOutput: 0,
          canSweep: false,
          error: 'No confirmed UTXOs',
        };
      }

      const addressType = this.detectAddressType(address);
      const totalBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
      const estimatedFee = this.estimateFee(utxos.length, 1, addressType.type);
      const estimatedOutput = totalBalance - estimatedFee;

      return {
        utxoCount: utxos.length,
        totalBalance,
        estimatedFee,
        estimatedOutput,
        canSweep: estimatedOutput > 546,
        error: estimatedOutput <= 546 ? 'Output below dust threshold' : undefined,
      };
    } catch (error: any) {
      return {
        utxoCount: 0,
        totalBalance: 0,
        estimatedFee: 0,
        estimatedOutput: 0,
        canSweep: false,
        error: error.message,
      };
    }
  }
}

export const bitcoinSweepService = new BitcoinSweepService();
export type { SweepResult };
