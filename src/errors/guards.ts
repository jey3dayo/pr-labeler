/**
 * Type guard functions for runtime type checking
 */

import type { ComplexityAnalysisError } from './types.js';

// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Checks if value is an Error instance
 * @param error - Value to check
 * @returns True if the value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Checks if value is a non-null object
 * @param value - Value to check
 * @returns True if the value is an object and not null
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks if value is a string
 * @param value - Value to check
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if object has a message property
 * @param obj - Object to check
 * @returns True if the object has a string message property
 */
export function isErrorWithMessage(obj: unknown): obj is { message: string } {
  return isObject(obj) && 'message' in obj && typeof obj.message === 'string';
}

/**
 * Checks if object has type and message properties
 * @param obj - Object to check
 * @returns True if the object has string type and message properties
 */
export function isErrorWithTypeAndMessage(obj: unknown): obj is { type: string; message: string } {
  return (
    isObject(obj) &&
    'type' in obj &&
    'message' in obj &&
    typeof obj.type === 'string' &&
    typeof obj.message === 'string'
  );
}

// ============================================================================
// Specific Error Type Guards
// ============================================================================

/**
 * Checks if an unknown error is a ComplexityAnalysisError
 * @param e - Unknown error to check
 * @returns True if the error is a ComplexityAnalysisError
 */
export function isComplexityAnalysisError(e: unknown): e is ComplexityAnalysisError {
  return !!e && typeof e === 'object' && 'type' in e && e.type === 'ComplexityAnalysisError';
}

// ============================================================================
// Error Message Extraction
// ============================================================================

/**
 * Extracts error message from unknown error value
 * Handles Error instances, objects with message property, and other types
 * @param error - Unknown error value
 * @returns Error message string
 */
export function extractErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}
