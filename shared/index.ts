/**
 * SHARED MODULE - Main Barrel Export
 * 
 * Re-exports all shared types, constants, and schema definitions.
 * Import from '@shared' for access to everything.
 * 
 * Example:
 *   import { QIG_CONSTANTS, Phi, regimeSchema } from '@shared';
 */

// Types - All shared TypeScript types
export * from './types';

// Constants - All physics, QIG, and system constants
export * from './constants';

// Schema - Drizzle schema and Zod validators
export * from './schema';

// Validation utilities
export * from './validation';

// QIG validation
export * from './qig-validation';
