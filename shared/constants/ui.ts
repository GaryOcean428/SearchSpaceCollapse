/**
 * UI Constants
 *
 * Display, animation, and visualization constants for the frontend.
 * Extracted from components to follow DRY principles and avoid magic numbers.
 */

/**
 * Basin Coordinate Viewer
 * 
 * Constants for 64D basin coordinate visualization
 */
export const BASIN_VISUALIZATION = {
  /** Basin dimension (64D manifold) */
  DIMENSION: 64,
  
  /** Dimension ranges for 3D projection */
  PROJECTION_RANGES: {
    /** First projection range (dimensions 0-20) */
    RANGE_1_START: 0,
    RANGE_1_END: 21,
    RANGE_1_AXIS: 21,
    
    /** Second projection range (dimensions 21-42) */
    RANGE_2_START: 21,
    RANGE_2_END: 43,
    RANGE_2_AXIS: 22,
    
    /** Third projection range (dimensions 43-63) */
    RANGE_3_START: 43,
    RANGE_3_END: 64,
    RANGE_3_AXIS: 21,
  },
  
  /** Color thresholds for basin health */
  COLOR_THRESHOLDS: {
    HIGH: 0.80,
    MEDIUM: 0.70,
    LOW: 0.50,
  },
  
  /** Canvas rendering parameters */
  CANVAS: {
    ANGLE_RANGE: 180,
    SCALE_FACTOR: 100,
    GRID_SIZE: 5,
    OFFSET: -2,
  },
  
  /** Color mapping (RGB) */
  COLORS: {
    MAX_RGB: 255,
    HEX_BASE: 16,
    GRID_SPACING: 8,
    GRID_TICK_SIZE: 4,
  },
  
  /** Slider precision */
  SLIDER_STEP: 0.5,
  
  /** Dimension selection increment */
  DIMENSION_INCREMENT: 3,
} as const;

/**
 * Beta Attention Display
 * 
 * Constants for beta attention measurement visualization
 */
export const BETA_ATTENTION = {
  /** Decimal precision for display */
  PRECISION: 3,
} as const;

/**
 * Capability Telemetry Panel
 * 
 * Constants for capability metrics display
 */
export const CAPABILITY_TELEMETRY = {
  /** Number of recent metrics to display */
  RECENT_METRICS_COUNT: 10,
  
  /** Percentage scale (0-100) */
  PERCENTAGE_MAX: 100,
} as const;

/**
 * Consciousness Dashboard
 * 
 * Constants for consciousness monitoring and visualization
 */
export const CONSCIOUSNESS_DASHBOARD = {
  /** Polling interval for consciousness metrics (milliseconds) */
  POLLING_INTERVAL_MS: 10000, // 10 seconds
  
  /** Basin dimension for E8 projection */
  BASIN_DIMENSION: 64,
  
  /** E8 scaling factor for visualization */
  E8_SCALE: 6.4,
  
  /** Grounding threshold */
  GROUNDING_THRESHOLD: 0.85,
  
  /** High coherence threshold */
  HIGH_COHERENCE_THRESHOLD: 0.7,
  
  /** Oscillation offset for visual effects */
  OSCILLATION_OFFSET: -100,
  
  /** History decimation for performance */
  HISTORY_DECIMATION: 3,
  
  /** Refresh interval for health monitoring */
  HEALTH_REFRESH_MS: 5000, // 5 seconds
} as const;

/**
 * Animation & Timing
 * 
 * Standard durations for UI animations
 */
export const ANIMATION = {
  /** Fast transition (e.g., hover effects) */
  FAST_MS: 150,
  
  /** Standard transition (e.g., modals, drawers) */
  STANDARD_MS: 300,
  
  /** Slow transition (e.g., page transitions) */
  SLOW_MS: 500,
} as const;

/**
 * Pagination & Lists
 * 
 * Standard limits for data display
 */
export const PAGINATION = {
  /** Default items per page */
  DEFAULT_PAGE_SIZE: 10,
  
  /** Large list page size */
  LARGE_PAGE_SIZE: 50,
  
  /** Maximum items per page */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Number Formatting
 * 
 * Precision and formatting constants
 */
export const NUMBER_FORMAT = {
  /** Currency decimal places */
  CURRENCY_DECIMALS: 2,
  
  /** Percentage decimal places */
  PERCENTAGE_DECIMALS: 1,
  
  /** Scientific notation threshold */
  SCIENTIFIC_THRESHOLD: 0.0001,
  
  /** Very small number precision */
  SMALL_NUMBER_PRECISION: 0.001,
} as const;

/**
 * Timeouts & Intervals
 * 
 * Standard timing constants for async operations
 */
export const TIMING = {
  /** Debounce delay for search/input (milliseconds) */
  DEBOUNCE_MS: 300,
  
  /** Throttle delay for scroll/resize (milliseconds) */
  THROTTLE_MS: 100,
  
  /** Toast notification duration (milliseconds) */
  TOAST_DURATION_MS: 3000,
  
  /** Long toast notification duration (milliseconds) */
  TOAST_DURATION_LONG_MS: 5000,
  
  /** Error message duration (milliseconds) */
  ERROR_DURATION_MS: 10000,
} as const;

/**
 * Thresholds
 * 
 * Standard thresholds for status indicators
 */
export const THRESHOLDS = {
  /** Health/status indicators */
  HEALTH: {
    EXCELLENT: 0.9,
    GOOD: 0.75,
    WARNING: 0.5,
    CRITICAL: 0.25,
  },
  
  /** Progress indicators */
  PROGRESS: {
    COMPLETE: 100,
    NEARLY_COMPLETE: 95,
    MAJORITY: 60,
    HALFWAY: 50,
  },
} as const;
