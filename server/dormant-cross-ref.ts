import * as fs from 'fs';
import * as path from 'path';

export interface DormantAddressInfo {
  rank: number;
  address: string;
  walletLabel: string;
  balanceBTC: string;
  balanceUSD: string;
  pctOfCoins: string;
  firstIn: string;
  lastIn: string;
  classification: string;
  analysisNotes: string;
}

class DormantCrossRef {
  private addressSet: Set<string> = new Set();
  private addressMap: Map<string, DormantAddressInfo> = new Map();
  private loaded: boolean = false;
  private matches: DormantAddressInfo[] = [];
  private matchesFile = 'data/dormant-matches.json';

  constructor() {
    this.loadFromFile();
    this.loadMatches();
  }

  private loadFromFile(): void {
    try {
      const filePath = path.join(process.cwd(), 'attached_assets/Pasted-Rank-Address-Wallet-Label-Balance-BTC-Balance-USD-Pct-o_1764727596104.txt');
      
      if (!fs.existsSync(filePath)) {
        console.log('[DormantCrossRef] Dormant addresses file not found');
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      let parsed = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('\t');
        if (parts.length < 2) continue;

        const rank = parseInt(parts[0], 10);
        const address = parts[1]?.trim();
        
        if (!address || !address.startsWith('1') && !address.startsWith('3') && !address.startsWith('bc1')) {
          continue;
        }

        const info: DormantAddressInfo = {
          rank,
          address,
          walletLabel: parts[2]?.trim() || '',
          balanceBTC: parts[3]?.trim() || '',
          balanceUSD: parts[4]?.trim() || '',
          pctOfCoins: parts[5]?.trim() || '',
          firstIn: parts[6]?.trim() || '',
          lastIn: parts[7]?.trim() || '',
          classification: parts[12]?.trim() || '',
          analysisNotes: parts[13]?.trim() || ''
        };

        this.addressSet.add(address);
        this.addressMap.set(address, info);
        parsed++;
      }

      this.loaded = true;
      console.log(`[DormantCrossRef] Loaded ${parsed} dormant addresses for cross-reference`);
    } catch (error) {
      console.error('[DormantCrossRef] Error loading dormant addresses:', error);
    }
  }

  private loadMatches(): void {
    try {
      if (fs.existsSync(this.matchesFile)) {
        const data = fs.readFileSync(this.matchesFile, 'utf-8');
        this.matches = JSON.parse(data);
        console.log(`[DormantCrossRef] Loaded ${this.matches.length} previous matches`);
      }
    } catch (error) {
      console.error('[DormantCrossRef] Error loading matches:', error);
    }
  }

  private saveMatches(): void {
    try {
      const dir = path.dirname(this.matchesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.matchesFile, JSON.stringify(this.matches, null, 2));
    } catch (error) {
      console.error('[DormantCrossRef] Error saving matches:', error);
    }
  }

  isKnownDormant(address: string): boolean {
    return this.addressSet.has(address);
  }

  getInfo(address: string): DormantAddressInfo | null {
    return this.addressMap.get(address) || null;
  }

  checkAddress(address: string): { isMatch: boolean; info: DormantAddressInfo | null } {
    const isMatch = this.addressSet.has(address);
    const info = isMatch ? this.addressMap.get(address) || null : null;
    
    if (isMatch && info) {
      const alreadyRecorded = this.matches.some(m => m.address === address);
      if (!alreadyRecorded) {
        this.matches.push(info);
        this.saveMatches();
        console.log(`[DormantCrossRef] 🎯 MATCH FOUND: ${address} (Rank #${info.rank}, ${info.balanceBTC} BTC)`);
      }
    }
    
    return { isMatch, info };
  }

  checkAddresses(addresses: string[]): { matches: DormantAddressInfo[]; checked: number } {
    const newMatches: DormantAddressInfo[] = [];
    
    for (const address of addresses) {
      const result = this.checkAddress(address);
      if (result.isMatch && result.info) {
        newMatches.push(result.info);
      }
    }
    
    return { matches: newMatches, checked: addresses.length };
  }

  getStats(): {
    totalDormant: number;
    loaded: boolean;
    matchesFound: number;
    topMatches: DormantAddressInfo[];
  } {
    return {
      totalDormant: this.addressSet.size,
      loaded: this.loaded,
      matchesFound: this.matches.length,
      topMatches: this.matches.slice(0, 10)
    };
  }

  getAllMatches(): DormantAddressInfo[] {
    return [...this.matches];
  }

  getTopDormant(limit: number = 100): DormantAddressInfo[] {
    const sorted = Array.from(this.addressMap.values())
      .filter(info => info.classification.includes('Dormant') || info.classification.includes('Lost'))
      .sort((a, b) => a.rank - b.rank);
    
    return sorted.slice(0, limit);
  }

  /**
   * Get ALL addresses from the top dormant wallets list (no classification filter)
   * This returns all ~999 addresses from the imported data
   */
  getAllDormantAddresses(limit: number = 1000): DormantAddressInfo[] {
    const sorted = Array.from(this.addressMap.values())
      .sort((a, b) => a.rank - b.rank);
    
    return sorted.slice(0, limit);
  }

  getTotalValue(): { btc: number; usd: number } {
    let btc = 0;
    let usd = 0;
    
    const values = Array.from(this.addressMap.values());
    for (const info of values) {
      const btcMatch = info.balanceBTC.replace(/,/g, '').match(/[\d.]+/);
      const usdMatch = info.balanceUSD.replace(/,/g, '').match(/[\d.]+/);
      
      if (btcMatch) btc += parseFloat(btcMatch[0]);
      if (usdMatch) usd += parseFloat(usdMatch[0]);
    }
    
    return { btc, usd };
  }
}

export const dormantCrossRef = new DormantCrossRef();
