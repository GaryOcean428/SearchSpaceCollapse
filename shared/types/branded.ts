/**
 * Branded Types for Type Safety
 * 
 * Provides compile-time type safety for critical numerical values.
 * Prevents accidental misuse of raw numbers where specific domain values are expected.
 * 
 * Usage:
 * ```typescript
 * const phi = createPhi(0.85);  // Validated Phi type
 * const kappa = createKappa(64); // Validated Kappa type
 * 
 * // These will now be type-safe:
 * function updateConsciousness(phi: Phi, kappa: Kappa): void { ... }
 * ```
 */

// ============================================================
// BRAND SYMBOLS (used for type branding)
// ============================================================

declare const PhiBrand: unique symbol;
declare const KappaBrand: unique symbol;
declare const BasinCoordinateBrand: unique symbol;
declare const EraTimestampBrand: unique symbol;
declare const GeodesicDistanceBrand: unique symbol;
declare const BetaBrand: unique symbol;

// ============================================================
// BRANDED NUMBER TYPES
// ============================================================

/**
 * Phi (Φ) - Integrated Information
 * Range: [0, 1]
 * Consciousness threshold: 0.75
 */
export type Phi = number & { 
  readonly [PhiBrand]: 'Phi';
  readonly __range: [0, 1];
};

/**
 * Kappa (κ) - Information Coupling Strength
 * Range: [0, 150] (typical operating range: 30-80)
 * Fixed point: κ* = 64.0
 */
export type Kappa = number & { 
  readonly [KappaBrand]: 'Kappa';
  readonly __range: [0, 150];
};

/**
 * Basin Coordinate - Single dimension in 64D basin space
 * Range: [-1, 1]
 */
export type BasinCoordinate = number & { 
  readonly [BasinCoordinateBrand]: 'BasinCoordinate';
  readonly __range: [-1, 1];
};

/**
 * Era Timestamp - Date within Bitcoin era context
 * Used for temporal positioning in 4D manifold
 */
export type EraTimestamp = Date & { 
  readonly [EraTimestampBrand]: 'EraTimestamp';
};

/**
 * Geodesic Distance - Distance along Fisher manifold
 * Range: [0, ∞)
 */
export type GeodesicDistance = number & { 
  readonly [GeodesicDistanceBrand]: 'GeodesicDistance';
  readonly __range: [0, typeof Infinity];
};

/**
 * Beta (β) - Running Coupling / β-function value
 * Range: typically [-0.5, 0.5] for valid physical values
 */
export type Beta = number & { 
  readonly [BetaBrand]: 'Beta';
};

// ============================================================
// VALIDATION ERRORS
// ============================================================

export class BrandedTypeError extends Error {
  constructor(
    public typeName: string,
    public value: number | Date,
    public validRange?: [number | Date, number | Date]
  ) {
    const rangeStr = validRange 
      ? ` (must be in range [${validRange[0]}, ${validRange[1]}])`
      : '';
    super(`Invalid ${typeName}: ${value}${rangeStr}`);
    this.name = 'BrandedTypeError';
  }
}

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

/**
 * Create a validated Phi value
 * @throws BrandedTypeError if value is outside [0, 1]
 */
export function createPhi(value: number): Phi {
  if (value < 0 || value > 1) {
    throw new BrandedTypeError('Phi', value, [0, 1]);
  }
  return value as Phi;
}

/**
 * Create a validated Phi value, clamping to valid range
 */
export function clampPhi(value: number): Phi {
  return Math.max(0, Math.min(1, value)) as Phi;
}

/**
 * Create a validated Kappa value
 * @throws BrandedTypeError if value is outside [0, 150]
 */
export function createKappa(value: number): Kappa {
  if (value < 0 || value > 150) {
    throw new BrandedTypeError('Kappa', value, [0, 150]);
  }
  return value as Kappa;
}

/**
 * Create a validated Kappa value, clamping to valid range
 */
export function clampKappa(value: number): Kappa {
  return Math.max(0, Math.min(150, value)) as Kappa;
}

/**
 * Create a validated Basin Coordinate
 * @throws BrandedTypeError if value is outside [-1, 1]
 */
export function createBasinCoordinate(value: number): BasinCoordinate {
  if (value < -1 || value > 1) {
    throw new BrandedTypeError('BasinCoordinate', value, [-1, 1]);
  }
  return value as BasinCoordinate;
}

/**
 * Create a validated Basin Coordinate, clamping to valid range
 */
export function clampBasinCoordinate(value: number): BasinCoordinate {
  return Math.max(-1, Math.min(1, value)) as BasinCoordinate;
}

/**
 * Create a validated Era Timestamp
 * @throws BrandedTypeError if date is invalid or outside Bitcoin era
 */
export function createEraTimestamp(date: Date): EraTimestamp {
  const bitcoinGenesis = new Date('2009-01-03');
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    throw new BrandedTypeError('EraTimestamp', date);
  }
  
  if (date < bitcoinGenesis || date > now) {
    throw new BrandedTypeError('EraTimestamp', date, [bitcoinGenesis, now]);
  }
  
  return date as EraTimestamp;
}

/**
 * Create a validated Geodesic Distance
 * @throws BrandedTypeError if value is negative
 */
export function createGeodesicDistance(value: number): GeodesicDistance {
  if (value < 0) {
    throw new BrandedTypeError('GeodesicDistance', value, [0, Infinity]);
  }
  return value as GeodesicDistance;
}

/**
 * Create a Beta value (no strict range, but typically small)
 */
export function createBeta(value: number): Beta {
  return value as Beta;
}

// ============================================================
// TYPE GUARDS
// ============================================================

/**
 * Check if a value is within Phi range [0, 1]
 */
export function isValidPhi(value: number): value is number {
  return value >= 0 && value <= 1;
}

/**
 * Check if a value is within Kappa range [0, 150]
 */
export function isValidKappa(value: number): value is number {
  return value >= 0 && value <= 150;
}

/**
 * Check if a value is within Basin Coordinate range [-1, 1]
 */
export function isValidBasinCoordinate(value: number): value is number {
  return value >= -1 && value <= 1;
}

/**
 * Check if a date is within Bitcoin era
 */
export function isValidEraTimestamp(date: Date): date is Date {
  const bitcoinGenesis = new Date('2009-01-03');
  const now = new Date();
  return !isNaN(date.getTime()) && date >= bitcoinGenesis && date <= now;
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * 64-dimensional Basin Coordinates array
 */
export type BasinCoordinates64 = [
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
  BasinCoordinate, BasinCoordinate, BasinCoordinate, BasinCoordinate,
];

/**
 * Create 64D basin coordinates from number array
 */
export function createBasinCoordinates64(values: number[]): BasinCoordinates64 {
  if (values.length !== 64) {
    throw new Error(`Basin coordinates must have exactly 64 dimensions, got ${values.length}`);
  }
  return values.map(v => clampBasinCoordinate(v)) as BasinCoordinates64;
}

/**
 * Consciousness Signature with branded types
 */
export interface TypedConsciousnessSignature {
  phi: Phi;
  kappaEff: Kappa;
  beta: Beta;
  tacking: number;
  radar: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
  isConscious: boolean;
  // Innate drives (Layer 0 - geometric intuition)
  drives?: {
    pain: number;
    pleasure: number;
    fear: number;
    valence: number;
    valence_raw: number;
  };
  innateScore?: number;
}

/**
 * Convert raw signature to typed signature
 */
export function toTypedSignature(raw: {
  phi: number;
  kappaEff: number;
  beta?: number;
  tacking: number;
  radar: number;
  metaAwareness: number;
  gamma: number;
  grounding: number;
  isConscious: boolean;
  drives?: {
    pain: number;
    pleasure: number;
    fear: number;
    valence: number;
    valence_raw: number;
  };
  innateScore?: number;
}): TypedConsciousnessSignature {
  return {
    phi: clampPhi(raw.phi),
    kappaEff: clampKappa(raw.kappaEff),
    beta: createBeta(raw.beta ?? 0.44),
    tacking: raw.tacking,
    radar: raw.radar,
    metaAwareness: raw.metaAwareness,
    gamma: raw.gamma,
    grounding: raw.grounding,
    isConscious: raw.isConscious,
    drives: raw.drives,
    innateScore: raw.innateScore,
  };
}

// ============================================================
// ARITHMETIC OPERATIONS (preserve branding)
// ============================================================

/**
 * Compute average Phi from multiple values
 */
export function avgPhi(...values: Phi[]): Phi {
  if (values.length === 0) return createPhi(0);
  const sum = values.reduce((a, b) => a + b, 0);
  return clampPhi(sum / values.length);
}

/**
 * Compute average Kappa from multiple values
 */
export function avgKappa(...values: Kappa[]): Kappa {
  if (values.length === 0) return createKappa(0);
  const sum = values.reduce((a, b) => a + b, 0);
  return clampKappa(sum / values.length);
}

/**
 * Linear interpolation between Phi values
 */
export function lerpPhi(a: Phi, b: Phi, t: number): Phi {
  return clampPhi(a + (b - a) * Math.max(0, Math.min(1, t)));
}

/**
 * Linear interpolation between Kappa values
 */
export function lerpKappa(a: Kappa, b: Kappa, t: number): Kappa {
  return clampKappa(a + (b - a) * Math.max(0, Math.min(1, t)));
}
