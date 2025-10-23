/**
 * Error handling helper functions
 * Following action-cache pattern for unified error handling
 */

import { logInfo, logWarning } from '../actions-io.js';
import { BaseError, type ErrorLevel } from './base-error.js';
import { isError, isErrorWithMessage } from './guards.js';

type ErrorConstructor<T extends Error = Error> = new (message: string) => T;
type ErrorHandler = (error: Error) => void;
type ErrorHandlerMap = Record<ErrorLevel, ErrorHandler>;

/**
 * Creates a formatted error message
 * @param error - Error instance
 * @returns Formatted error message with error name
 */
function createErrorMessage(error: Error): string {
  return `[${error.name}]: ${error.message}`;
}

/**
 * Ensures that an unknown value is converted to an Error instance
 * This is the primary type-safe error conversion function
 *
 * @template T - Error type to convert to
 * @param error - Unknown error value
 * @param defaultMessage - Default message if error cannot be converted
 * @param ErrorClass - Error constructor to use (defaults to Error)
 * @returns Error instance of type T
 *
 * @example
 * ```typescript
 * try {
 *   // some code
 * } catch (error) {
 *   const e = ensureError(error);
 *   return err(createXXXError(`Failed: ${e.message}`));
 * }
 * ```
 */
export function ensureError<T extends Error>(
  error: unknown,
  defaultMessage: string = 'Unknown error occurred',
  ErrorClass: ErrorConstructor<T> = Error as unknown as ErrorConstructor<T>,
): T {
  if (error instanceof ErrorClass) {
    return error;
  }
  const message = isError(error)
    ? error.message
    : typeof error === 'string'
      ? error
      : isErrorWithMessage(error)
        ? error.message
        : defaultMessage;
  return new ErrorClass(message);
}

/**
 * Extracts the error level from an error
 * If the error is a BaseError, returns its errorLevel
 * Otherwise, returns 'warning' as default
 *
 * @param error - Unknown error value
 * @returns Error level ('warning' or 'info')
 */
export function handleErrorLevel(error: unknown): ErrorLevel {
  const e = ensureError(error);
  return e instanceof BaseError ? e.errorLevel : 'warning';
}

/**
 * Error handler mapping for different error levels
 */
const errorHandlers: ErrorHandlerMap = {
  warning: error => logWarning(createErrorMessage(error)),
  info: error => logInfo(createErrorMessage(error)),
};

/**
 * Processes an error by logging it according to its error level
 * and returning a formatted error message
 *
 * @param error - Unknown error value
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * try {
 *   // some code
 * } catch (error) {
 *   const message = processError(error); // Logs and returns message
 * }
 * ```
 */
export function processError(error: unknown): string {
  const normalizedError = ensureError(error);

  const errorLevel = handleErrorLevel(normalizedError);
  const handler = errorHandlers[errorLevel];
  handler(normalizedError);

  return createErrorMessage(normalizedError);
}

/**
 * Extracts the first error from an AggregateError, or returns the error itself
 * This is useful for handling Promise.allSettled or parallel operation failures
 *
 * @param error - Unknown error value
 * @returns The first error from AggregateError, or the error itself
 *
 * @example
 * ```typescript
 * try {
 *   await Promise.all([...]);
 * } catch (error) {
 *   const firstError = extractAggregateError(error);
 *   console.error(firstError.message);
 * }
 * ```
 */
export function extractAggregateError(error: unknown): Error {
  if (error instanceof Error && 'errors' in error && Array.isArray(error.errors)) {
    // Return the first error from AggregateError
    return error.errors[0] ?? error;
  }
  return error instanceof Error ? error : new Error(String(error));
}
