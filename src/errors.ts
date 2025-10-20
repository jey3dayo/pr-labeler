/**
 * Error handling module
 * Re-exports all error types, factories, and guards from the errors/ directory
 *
 * This file maintains backward compatibility for existing imports.
 * The actual implementations are in src/errors/*.ts
 */

export * from './errors/index.js';
