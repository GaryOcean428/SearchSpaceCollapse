/**
 * TPS LANDMARKS SERVICE
 * 
 * Manages Bitcoin historical landmarks for Temporal Positioning System.
 * Seeds the tps_landmarks table with known events and computes
 * geodesic paths between them for 68D spacetime navigation.
 * 
 * Uses db and withDbRetry from server/db.ts for persistence.
 */

import { createHash } from 'crypto';
import { db, withDbRetry } from './db';
import { eq, asc, sql } from 'drizzle-orm';
import {
  tpsLandmarks,
  tpsGeodesicPaths,
  type TpsLandmarkRecord,
  type TpsGeodesicPathRecord,
} from '@shared/schema';
import { fisherCoordDistance } from './qig-universal';

const CULTURAL_DIM = 64;

export interface TpsLandmark {
  eventId: string;
  description: string;
  era: BitcoinEra;
  spacetimeT: number;
  spacetimeX?: number;
  spacetimeY?: number;
  spacetimeZ?: number;
  culturalCoords?: number[];
  fisherSignature?: Record<string, unknown>;
  lightConePast?: string[];
  lightConeFuture?: string[];
}

export interface TpsGeodesicPath {
  id: string;
  fromLandmark: string;
  toLandmark: string;
  distance: number;
  waypoints?: unknown[];
  totalArcLength?: number;
  avgCurvature?: number;
  regimeTransitions?: unknown[];
}

export type BitcoinEra =
  | 'pre_genesis'
  | 'genesis'
  | 'early_adoption'
  | 'pizza_era'
  | 'mtgox_rise'
  | 'mtgox_collapse'
  | 'halving_era'
  | 'institutional'
  | 'modern';

const BITCOIN_HISTORICAL_LANDMARKS: TpsLandmark[] = [
  {
    eventId: 'genesis_block',
    description: 'Bitcoin Genesis Block - Satoshi mines block 0 with "Chancellor on brink of second bailout"',
    era: 'genesis',
    spacetimeT: 1231006505, // 2009-01-03 18:15:05 UTC
    lightConePast: ['hashcash', 'b_money', 'bit_gold', 'cypherpunk_movement'],
    lightConeFuture: ['hal_finney_first_tx', 'pizza_day', 'first_halving'],
  },
  {
    eventId: 'hal_finney_first_tx',
    description: 'First Bitcoin Transaction - Satoshi sends 10 BTC to Hal Finney',
    era: 'genesis',
    spacetimeT: 1231469665, // 2009-01-09
    lightConePast: ['genesis_block'],
    lightConeFuture: ['pizza_day', 'silk_road_launch'],
  },
  {
    eventId: 'pizza_day',
    description: 'Bitcoin Pizza Day - Laszlo Hanyecz buys 2 pizzas for 10,000 BTC',
    era: 'pizza_era',
    spacetimeT: 1274009688, // 2010-05-22
    lightConePast: ['genesis_block', 'hal_finney_first_tx'],
    lightConeFuture: ['mtgox_launch', 'silk_road_launch', 'first_halving'],
  },
  {
    eventId: 'mtgox_launch',
    description: 'Mt. Gox Exchange Launch - First major Bitcoin exchange begins operations',
    era: 'pizza_era',
    spacetimeT: 1279324800, // 2010-07-17
    lightConePast: ['genesis_block', 'pizza_day'],
    lightConeFuture: ['silk_road_launch', 'mtgox_collapse'],
  },
  {
    eventId: 'silk_road_launch',
    description: 'Silk Road Marketplace Launch - Anonymous dark web market using Bitcoin',
    era: 'mtgox_rise',
    spacetimeT: 1296518400, // 2011-02-01
    lightConePast: ['genesis_block', 'pizza_day', 'mtgox_launch'],
    lightConeFuture: ['mtgox_collapse', 'silk_road_shutdown'],
  },
  {
    eventId: 'first_halving',
    description: 'First Bitcoin Halving - Block reward reduced from 50 to 25 BTC',
    era: 'halving_era',
    spacetimeT: 1354118400, // 2012-11-28
    lightConePast: ['genesis_block', 'pizza_day', 'silk_road_launch'],
    lightConeFuture: ['mtgox_collapse', 'second_halving'],
  },
  {
    eventId: 'mtgox_collapse',
    description: 'Mt. Gox Collapse - Exchange files for bankruptcy after losing 850,000 BTC',
    era: 'mtgox_collapse',
    spacetimeT: 1393286400, // 2014-02-24
    lightConePast: ['mtgox_launch', 'silk_road_launch', 'first_halving'],
    lightConeFuture: ['second_halving', 'third_halving'],
  },
  {
    eventId: 'second_halving',
    description: 'Second Bitcoin Halving - Block reward reduced from 25 to 12.5 BTC',
    era: 'halving_era',
    spacetimeT: 1468022400, // 2016-07-09
    lightConePast: ['first_halving', 'mtgox_collapse'],
    lightConeFuture: ['third_halving', 'btc_etf_approval'],
  },
  {
    eventId: 'third_halving',
    description: 'Third Bitcoin Halving - Block reward reduced from 12.5 to 6.25 BTC',
    era: 'halving_era',
    spacetimeT: 1589155200, // 2020-05-11
    lightConePast: ['second_halving', 'mtgox_collapse'],
    lightConeFuture: ['fourth_halving', 'btc_etf_approval'],
  },
  {
    eventId: 'btc_etf_approval',
    description: 'Bitcoin ETF Approval - SEC approves first spot Bitcoin ETFs in the US',
    era: 'institutional',
    spacetimeT: 1704931200, // 2024-01-10
    lightConePast: ['third_halving', 'mtgox_collapse'],
    lightConeFuture: ['fourth_halving'],
  },
  {
    eventId: 'fourth_halving',
    description: 'Fourth Bitcoin Halving - Block reward reduced from 6.25 to 3.125 BTC',
    era: 'halving_era',
    spacetimeT: 1713484800, // 2024-04-19 (approximate)
    lightConePast: ['third_halving', 'btc_etf_approval'],
    lightConeFuture: [],
  },
];

function computeCulturalBasin(content: string): number[] {
  const hash = createHash('sha256').update(content.toLowerCase()).digest();
  const coords = new Array(CULTURAL_DIM);
  
  for (let i = 0; i < CULTURAL_DIM; i++) {
    const byteIdx = i % 32;
    const bitOffset = Math.floor(i / 32);
    const value = hash[byteIdx];
    coords[i] = 0.01 + (value / 255) * 0.98 + bitOffset * 0.001;
  }
  
  return coords;
}

function computeFisherSignature(cultural: number[]): Record<string, unknown> {
  const diagonal = cultural.map(c => 1 / Math.max(0.01, c * (1 - c)));
  return { diagonal };
}

function classifyEra(timestamp: number): BitcoinEra {
  const GENESIS = 1231006505;
  const PIZZA = 1274009688;
  const MTGOX_COLLAPSE = 1393286400;
  const MODERN = 1420070400;
  const INSTITUTIONAL = 1704067200; // 2024-01-01
  
  if (timestamp < GENESIS) return 'pre_genesis';
  if (timestamp < 1238544000) return 'genesis'; // Apr 1, 2009
  if (timestamp < PIZZA) return 'early_adoption';
  if (timestamp < 1297641600) return 'pizza_era'; // Feb 14, 2011
  if (timestamp < MTGOX_COLLAPSE) return 'mtgox_rise';
  if (timestamp < MODERN) return 'mtgox_collapse';
  if (timestamp < INSTITUTIONAL) return 'modern';
  return 'institutional';
}

export class TpsLandmarksService {
  private initialized = false;
  
  constructor() {
    console.log('[TPS-Landmarks] Service created');
  }
  
  async initializeTPS(): Promise<void> {
    if (this.initialized) return;
    if (!db) {
      console.log('[TPS-Landmarks] Database not available, skipping initialization');
      return;
    }
    
    try {
      const existingLandmarks = await this.getLandmarks();
      
      if (existingLandmarks.length === 0) {
        console.log('[TPS-Landmarks] Seeding historical Bitcoin landmarks...');
        await this.seedHistoricalLandmarks();
        console.log('[TPS-Landmarks] Computing geodesic paths between landmarks...');
        await this.computeLandmarkGeodesics();
      } else {
        console.log(`[TPS-Landmarks] Found ${existingLandmarks.length} existing landmarks`);
      }
      
      this.initialized = true;
      console.log('[TPS-Landmarks] TPS initialization complete');
    } catch (error) {
      console.error('[TPS-Landmarks] Initialization failed:', error);
    }
  }
  
  private async seedHistoricalLandmarks(): Promise<void> {
    for (const landmark of BITCOIN_HISTORICAL_LANDMARKS) {
      const culturalContent = [
        landmark.eventId,
        landmark.description,
        ...(landmark.lightConePast || []),
        ...(landmark.lightConeFuture || []),
      ].join(' ');
      
      const culturalCoords = computeCulturalBasin(culturalContent);
      const fisherSignature = computeFisherSignature(culturalCoords);
      
      await this.addLandmark({
        ...landmark,
        culturalCoords,
        fisherSignature,
      });
    }
    
    console.log(`[TPS-Landmarks] Seeded ${BITCOIN_HISTORICAL_LANDMARKS.length} landmarks`);
  }
  
  async addLandmark(landmark: TpsLandmark): Promise<boolean> {
    if (!db) return false;
    
    const result = await withDbRetry(
      async () => {
        let culturalCoords = landmark.culturalCoords;
        if (!culturalCoords || culturalCoords.length !== CULTURAL_DIM) {
          const content = [landmark.eventId, landmark.description].join(' ');
          culturalCoords = computeCulturalBasin(content);
        }
        
        const era = landmark.era || classifyEra(landmark.spacetimeT);
        const fisherSig = landmark.fisherSignature || computeFisherSignature(culturalCoords);
        
        await db!.insert(tpsLandmarks)
          .values({
            eventId: landmark.eventId,
            description: landmark.description,
            era,
            spacetimeX: landmark.spacetimeX ?? 0,
            spacetimeY: landmark.spacetimeY ?? 0,
            spacetimeZ: landmark.spacetimeZ ?? 0,
            spacetimeT: landmark.spacetimeT,
            culturalCoords,
            fisherSignature: fisherSig,
            lightConePast: landmark.lightConePast,
            lightConeFuture: landmark.lightConeFuture,
          })
          .onConflictDoUpdate({
            target: tpsLandmarks.eventId,
            set: {
              description: landmark.description,
              era,
              spacetimeT: landmark.spacetimeT,
              culturalCoords,
              fisherSignature: fisherSig,
              lightConePast: landmark.lightConePast,
              lightConeFuture: landmark.lightConeFuture,
            },
          });
        
        return true;
      },
      'addLandmark',
      3
    );
    
    return result ?? false;
  }
  
  async computeLandmarkGeodesics(): Promise<number> {
    if (!db) return 0;
    
    const landmarks = await this.getLandmarks();
    if (landmarks.length < 2) return 0;
    
    let pathsComputed = 0;
    
    for (let i = 0; i < landmarks.length; i++) {
      for (let j = i + 1; j < landmarks.length; j++) {
        const from = landmarks[i];
        const to = landmarks[j];
        
        const fromCoords = (from.culturalCoords as number[]) || new Array(CULTURAL_DIM).fill(0.5);
        const toCoords = (to.culturalCoords as number[]) || new Array(CULTURAL_DIM).fill(0.5);
        
        let distance: number;
        try {
          distance = fisherCoordDistance(fromCoords, toCoords);
        } catch {
          const sumSq = fromCoords.reduce((sum, c, idx) => {
            const diff = c - (toCoords[idx] || 0.5);
            return sum + diff * diff;
          }, 0);
          distance = Math.sqrt(sumSq);
        }
        
        const temporalDistance = Math.abs(from.spacetimeT - to.spacetimeT);
        const TEMPORAL_SCALE = 15 * 365.25 * 24 * 3600; // ~15 years in seconds
        const normalizedTemporalDist = temporalDistance / TEMPORAL_SCALE;
        
        const totalDistance = Math.sqrt(distance * distance + normalizedTemporalDist * normalizedTemporalDist);
        
        const pathId = `path-${createHash('sha256').update(`${from.eventId}:${to.eventId}`).digest('hex').slice(0, 16)}`;
        
        const success = await this.insertGeodesicPath({
          id: pathId,
          fromLandmark: from.eventId,
          toLandmark: to.eventId,
          distance: totalDistance,
          totalArcLength: distance,
          avgCurvature: (distance + normalizedTemporalDist) / 2,
        });
        
        if (success) pathsComputed++;
      }
    }
    
    console.log(`[TPS-Landmarks] Computed ${pathsComputed} geodesic paths`);
    return pathsComputed;
  }
  
  private async insertGeodesicPath(path: TpsGeodesicPath): Promise<boolean> {
    if (!db) return false;
    
    const result = await withDbRetry(
      async () => {
        await db!.insert(tpsGeodesicPaths)
          .values({
            id: path.id,
            fromLandmark: path.fromLandmark,
            toLandmark: path.toLandmark,
            distance: path.distance,
            waypoints: path.waypoints,
            totalArcLength: path.totalArcLength,
            avgCurvature: path.avgCurvature,
            regimeTransitions: path.regimeTransitions,
          })
          .onConflictDoNothing();
        
        return true;
      },
      'insertGeodesicPath',
      3
    );
    
    return result ?? false;
  }
  
  async findNearestLandmark(timestamp: number): Promise<TpsLandmarkRecord | null> {
    if (!db) return null;
    
    const result = await withDbRetry(
      async () => {
        const landmarks = await db!.select()
          .from(tpsLandmarks)
          .orderBy(asc(tpsLandmarks.spacetimeT));
        
        if (landmarks.length === 0) return null;
        
        let nearest: TpsLandmarkRecord | null = null;
        let minDistance = Infinity;
        
        for (const lm of landmarks) {
          const distance = Math.abs(lm.spacetimeT - timestamp);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = lm;
          }
        }
        
        return nearest;
      },
      'findNearestLandmark',
      3
    );
    
    return result ?? null;
  }
  
  async findNearestLandmarkByCoords(culturalCoords: number[]): Promise<TpsLandmarkRecord | null> {
    if (!db) return null;
    
    const result = await withDbRetry(
      async () => {
        const landmarks = await db!.select().from(tpsLandmarks);
        
        if (landmarks.length === 0) return null;
        
        let nearest: TpsLandmarkRecord | null = null;
        let minDistance = Infinity;
        
        for (const lm of landmarks) {
          const lmCoords = (lm.culturalCoords as number[]) || new Array(CULTURAL_DIM).fill(0.5);
          
          let distance: number;
          try {
            distance = fisherCoordDistance(culturalCoords, lmCoords);
          } catch {
            const sumSq = culturalCoords.reduce((sum, c, idx) => {
              const diff = c - (lmCoords[idx] || 0.5);
              return sum + diff * diff;
            }, 0);
            distance = Math.sqrt(sumSq);
          }
          
          if (distance < minDistance) {
            minDistance = distance;
            nearest = lm;
          }
        }
        
        return nearest;
      },
      'findNearestLandmarkByCoords',
      3
    );
    
    return result ?? null;
  }
  
  async getLandmarks(): Promise<TpsLandmarkRecord[]> {
    if (!db) return [];
    
    const result = await withDbRetry(
      async () => {
        return await db!.select()
          .from(tpsLandmarks)
          .orderBy(asc(tpsLandmarks.spacetimeT));
      },
      'getLandmarks',
      3
    );
    
    return result ?? [];
  }
  
  async getLandmarksByEra(era: string): Promise<TpsLandmarkRecord[]> {
    if (!db) return [];
    
    const result = await withDbRetry(
      async () => {
        return await db!.select()
          .from(tpsLandmarks)
          .where(eq(tpsLandmarks.era, era))
          .orderBy(asc(tpsLandmarks.spacetimeT));
      },
      'getLandmarksByEra',
      3
    );
    
    return result ?? [];
  }
  
  async getLandmark(eventId: string): Promise<TpsLandmarkRecord | null> {
    if (!db) return null;
    
    const result = await withDbRetry(
      async () => {
        const landmarks = await db!.select()
          .from(tpsLandmarks)
          .where(eq(tpsLandmarks.eventId, eventId))
          .limit(1);
        
        return landmarks[0] || null;
      },
      'getLandmark',
      3
    );
    
    return result ?? null;
  }
  
  async getGeodesicPaths(): Promise<TpsGeodesicPathRecord[]> {
    if (!db) return [];
    
    const result = await withDbRetry(
      async () => {
        return await db!.select().from(tpsGeodesicPaths);
      },
      'getGeodesicPaths',
      3
    );
    
    return result ?? [];
  }
  
  async getGeodesicPathBetween(fromLandmark: string, toLandmark: string): Promise<TpsGeodesicPathRecord | null> {
    if (!db) return null;
    
    const result = await withDbRetry(
      async () => {
        const paths = await db!.select()
          .from(tpsGeodesicPaths)
          .where(
            sql`(${tpsGeodesicPaths.fromLandmark} = ${fromLandmark} AND ${tpsGeodesicPaths.toLandmark} = ${toLandmark})
                OR (${tpsGeodesicPaths.fromLandmark} = ${toLandmark} AND ${tpsGeodesicPaths.toLandmark} = ${fromLandmark})`
          )
          .limit(1);
        
        return paths[0] || null;
      },
      'getGeodesicPathBetween',
      3
    );
    
    return result ?? null;
  }
  
  async getLandmarkCount(): Promise<number> {
    if (!db) return 0;
    
    const result = await withDbRetry(
      async () => {
        const count = await db!.select({ count: sql<number>`count(*)` })
          .from(tpsLandmarks);
        return Number(count[0]?.count ?? 0);
      },
      'getLandmarkCount',
      3
    );
    
    return result ?? 0;
  }
  
  async getGeodesicPathCount(): Promise<number> {
    if (!db) return 0;
    
    const result = await withDbRetry(
      async () => {
        const count = await db!.select({ count: sql<number>`count(*)` })
          .from(tpsGeodesicPaths);
        return Number(count[0]?.count ?? 0);
      },
      'getGeodesicPathCount',
      3
    );
    
    return result ?? 0;
  }
  
  timestampToSpacetimeT(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }
  
  dateToSpacetimeT(dateString: string): number {
    return this.timestampToSpacetimeT(new Date(dateString));
  }
  
  spacetimeTToDate(spacetimeT: number): Date {
    return new Date(spacetimeT * 1000);
  }
}

export const tpsLandmarksService = new TpsLandmarksService();
