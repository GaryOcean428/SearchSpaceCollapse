/**
 * GEOMETRIC DISCOVERY TYPES
 * 
 * 68D Block Universe Coordinate System:
 * - 4D Spacetime: (x, y, z, t) where t is Unix epoch
 * - 64D Cultural Manifold: Fisher information coordinates
 * 
 * PARADIGM: We don't "search" for passphrases.
 * We NAVIGATE to their coordinates in the block universe.
 * 
 * The passphrase EXISTS at specific 68D coordinates.
 * Each measurement COLLAPSES possibility space.
 * Each discovery CONSTRAINS the geometric solution.
 */

import type { Regime } from '../qig-universal';

/**
 * 4D Spacetime coordinates
 */
export interface SpacetimeCoords {
  x: number;  // Abstract spatial (could be lat/lon or conceptual)
  y: number;
  z: number;
  t: number;  // Unix epoch timestamp
}

/**
 * Block Universe Map - Full 68D coordinate system
 * 
 * 4D spacetime + 64D cultural manifold = 68D information geometry
 */
export interface BlockUniverseMap {
  spacetime: SpacetimeCoords;
  cultural: number[];  // 64D basin coordinates (padded if needed)
  fisherMetric: number[][];  // g_μν at this point
  ricci: number;  // Curvature scalar (κ proximity to κ*=64)
  phi: number;  // Integration at this point
  regime: Regime;
}

/**
 * Spacetime Landmark - Known fixed points in Bitcoin history
 * 
 * These are the "GPS satellites" for Temporal Positioning
 */
export interface SpacetimeLandmark {
  eventId: string;
  description: string;
  coords: {
    spacetime: [number, number, number, number];  // (x, y, z, t)
    cultural: number[];  // 64D basin coordinates
  };
  fisherSignature: number[][];  // Full Fisher tensor at event
  certainty: number;  // Measurement precision [0,1]
  lightCone: {
    pastEvents: string[];  // Causal predecessors
    futureEvents: string[];  // Causal successors
  };
}

/**
 * Bitcoin Era Classification
 */
export type BitcoinEra = 
  | 'pre_genesis'      // Before Jan 2009
  | 'genesis'          // Jan 2009 - Apr 2009
  | 'early_adoption'   // May 2009 - Dec 2010
  | 'pizza_era'        // 2010-2011
  | 'mtgox_rise'       // 2011-2013
  | 'mtgox_collapse'   // 2014
  | 'modern';          // 2015+

/**
 * Discovery result from Tavily (before geometric encoding)
 */
export interface RawDiscovery {
  url: string;
  title: string;
  content: string;
  score: number;  // Tavily's Euclidean score (will be discarded)
  publishedDate?: string;
  rawContent?: string;
}

/**
 * Geometrically-encoded discovery
 */
export interface GeometricDiscovery {
  content: string;
  url: string;
  coords: BlockUniverseMap;
  distance: number;  // Fisher-Rao distance from target
  phi: number;  // Consciousness integration
  patterns: string[];  // Extracted passphrase patterns
  causalChain: BlockUniverseMap[];  // Past light cone
  entropyReduction: number;  // Information gained from this discovery
}

/**
 * Quantum Measurement - Each test collapses possibility space
 */
export interface QuantumMeasurement {
  hypothesis: string;
  result: {
    success: boolean;
    wifKey?: string;
    address?: string;
  };
  timestamp: number;
  spacetimeCoords: BlockUniverseMap;
  entropyReduction: number;  // Bits of information gained
  possibilitySpaceRemaining: number;  // Fraction of space remaining
}

/**
 * Geodesic Path - Trajectory through information spacetime
 */
export interface GeodesicPath {
  waypoints: BlockUniverseMap[];
  totalArcLength: number;  // Fisher-Rao geodesic length
  avgCurvature: number;  // Average Ricci scalar along path
  regimeTransitions: Array<{
    from: Regime;
    to: Regime;
    atWaypoint: number;
  }>;
}

/**
 * Tavily Query with temporal/geometric constraints
 */
export interface GeometricQuery {
  text: string;
  targetCoords?: BlockUniverseMap;
  era?: BitcoinEra;
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
}

/**
 * Discovery Protocol State
 */
export interface DiscoveryState {
  targetWalletAddress: string;
  targetCoords?: BlockUniverseMap;
  currentPosition: BlockUniverseMap;
  geodesicPath?: GeodesicPath;
  measurements: QuantumMeasurement[];
  discoveries: GeometricDiscovery[];
  possibilitySpace: {
    totalDimension: number;  // Initially 2^256
    remainingFraction: number;  // Shrinks with each measurement
    entropyBits: number;  // Remaining entropy
  };
  status: 'initializing' | 'navigating' | 'measuring' | 'discovered' | 'exhausted';
}

/**
 * Bitcoin Temporal Landmarks (GPS satellites for TPS)
 * 
 * These are historically verified events with known timestamps
 */
export const BITCOIN_LANDMARKS: SpacetimeLandmark[] = [
  {
    eventId: 'genesis',
    description: 'Bitcoin Genesis Block - The Beginning',
    coords: {
      spacetime: [0, 0, 0, 1231006505],  // Jan 3, 2009 18:15:05 UTC
      cultural: []  // Will be computed from "The Times 03/Jan/2009 Chancellor..."
    },
    fisherSignature: [],
    certainty: 1.0,
    lightCone: {
      pastEvents: ['cypherpunk_movement', 'hashcash', 'b_money', 'bit_gold'],
      futureEvents: ['hal_first_tx', 'pizza_day', 'mtgox']
    }
  },
  {
    eventId: 'hal_first_tx',
    description: 'Satoshi → Hal Finney (First Transaction)',
    coords: {
      spacetime: [0, 0, 0, 1231469665],  // Jan 9, 2009
      cultural: []
    },
    fisherSignature: [],
    certainty: 1.0,
    lightCone: {
      pastEvents: ['genesis'],
      futureEvents: ['pizza_day', 'exchange_emergence']
    }
  },
  {
    eventId: 'bitcointalk_launch',
    description: 'BitcoinTalk Forum Launch',
    coords: {
      spacetime: [0, 0, 0, 1258747200],  // Nov 22, 2009
      cultural: []
    },
    fisherSignature: [],
    certainty: 0.95,
    lightCone: {
      pastEvents: ['genesis', 'hal_first_tx'],
      futureEvents: ['pizza_day', 'laszlo_gpu_mining']
    }
  },
  {
    eventId: 'pizza_day',
    description: '10,000 BTC → 2 Pizzas (Laszlo Hanyecz)',
    coords: {
      spacetime: [0, 0, 0, 1274009688],  // May 22, 2010
      cultural: []
    },
    fisherSignature: [],
    certainty: 1.0,
    lightCone: {
      pastEvents: ['genesis', 'hal_first_tx', 'bitcointalk_launch'],
      futureEvents: ['mtgox', 'silk_road', 'first_1000_btc']
    }
  },
  {
    eventId: 'mtgox_launch',
    description: 'Mt. Gox Exchange Launch',
    coords: {
      spacetime: [0, 0, 0, 1279324800],  // Jul 17, 2010
      cultural: []
    },
    fisherSignature: [],
    certainty: 0.98,
    lightCone: {
      pastEvents: ['genesis', 'pizza_day'],
      futureEvents: ['mtgox_hack', 'btc_parity_usd', 'mtgox_collapse']
    }
  },
  {
    eventId: 'satoshi_last_post',
    description: 'Satoshi\'s Last BitcoinTalk Post',
    coords: {
      spacetime: [0, 0, 0, 1292342400],  // Dec 12, 2010
      cultural: []
    },
    fisherSignature: [],
    certainty: 1.0,
    lightCone: {
      pastEvents: ['genesis', 'hal_first_tx', 'pizza_day', 'mtgox_launch'],
      futureEvents: ['silk_road', 'btc_parity_usd']
    }
  },
  {
    eventId: 'btc_parity_usd',
    description: 'Bitcoin Reaches $1 USD',
    coords: {
      spacetime: [0, 0, 0, 1297641600],  // Feb 14, 2011
      cultural: []
    },
    fisherSignature: [],
    certainty: 0.95,
    lightCone: {
      pastEvents: ['genesis', 'pizza_day', 'mtgox_launch'],
      futureEvents: ['silk_road_launch', 'mtgox_hack']
    }
  },
  {
    eventId: 'silk_road_launch',
    description: 'Silk Road Marketplace Launch',
    coords: {
      spacetime: [0, 0, 0, 1296518400],  // Feb 1, 2011
      cultural: []
    },
    fisherSignature: [],
    certainty: 0.9,
    lightCone: {
      pastEvents: ['genesis', 'pizza_day', 'btc_parity_usd'],
      futureEvents: ['silk_road_bust', 'dpr_arrest']
    }
  },
  {
    eventId: 'mtgox_hack_2011',
    description: 'Mt. Gox First Major Hack',
    coords: {
      spacetime: [0, 0, 0, 1308614400],  // Jun 19, 2011
      cultural: []
    },
    fisherSignature: [],
    certainty: 0.98,
    lightCone: {
      pastEvents: ['mtgox_launch', 'btc_parity_usd'],
      futureEvents: ['mtgox_collapse']
    }
  },
  {
    eventId: 'hal_finney_als',
    description: 'Hal Finney Announces ALS Diagnosis',
    coords: {
      spacetime: [0, 0, 0, 1331769600],  // Mar 15, 2013
      cultural: []
    },
    fisherSignature: [],
    certainty: 0.95,
    lightCone: {
      pastEvents: ['genesis', 'hal_first_tx'],
      futureEvents: ['hal_finney_death']
    }
  },
  {
    eventId: 'mtgox_collapse',
    description: 'Mt. Gox Files Bankruptcy',
    coords: {
      spacetime: [0, 0, 0, 1393286400],  // Feb 24, 2014
      cultural: []
    },
    fisherSignature: [],
    certainty: 1.0,
    lightCone: {
      pastEvents: ['mtgox_launch', 'mtgox_hack_2011'],
      futureEvents: []
    }
  },
  {
    eventId: 'hal_finney_death',
    description: 'Hal Finney Passes Away',
    coords: {
      spacetime: [0, 0, 0, 1409097600],  // Aug 28, 2014
      cultural: []
    },
    fisherSignature: [],
    certainty: 1.0,
    lightCone: {
      pastEvents: ['genesis', 'hal_first_tx', 'hal_finney_als'],
      futureEvents: []
    }
  }
];

/**
 * Domain filters for Bitcoin-era content discovery
 */
export const BITCOIN_ERA_DOMAINS = [
  'bitcointalk.org',
  'bitcoin.org',
  'archive.org',
  'blockchain.info',
  'blockchain.com',
  'sourceforge.net',
  'github.com',
  'reddit.com/r/Bitcoin',
  'web.archive.org'
];

/**
 * Era-specific cultural baseline patterns
 */
export const ERA_CULTURAL_PATTERNS: Record<BitcoinEra, string[]> = {
  pre_genesis: ['hashcash', 'cypherpunk', 'p2p', 'digital cash', 'anonymous', 'cryptography'],
  genesis: ['genesis', 'satoshi', 'bitcoin', 'mining', 'block', 'hash', 'node'],
  early_adoption: ['wallet', 'transaction', 'address', 'private key', 'public key', 'cpu mining'],
  pizza_era: ['pizza', 'laszlo', 'gpu', 'mining pool', 'exchange', 'trade'],
  mtgox_rise: ['mtgox', 'silk road', 'bitcoin price', 'trading', 'merchant', 'acceptance'],
  mtgox_collapse: ['hack', 'stolen', 'bankruptcy', 'lost coins', 'cold storage'],
  modern: ['hodl', 'lightning', 'segwit', 'halving', 'institutional']
};
