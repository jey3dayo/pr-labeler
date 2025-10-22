/**
 * Base Error class and ErrorLevel type
 * Following action-cache pattern for unified error handling
 */

/**
 * Error severity levels
 * - warning: Non-critical error that doesn't prevent execution
 * - info: Informational error for logging purposes
 */
export type ErrorLevel = 'warning' | 'info';

/**
 * Base Error class with errorLevel support
 * All application errors that need custom error levels should extend this class
 */
export abstract class BaseError extends Error {
  readonly errorLevel: ErrorLevel;

  constructor(message: string, errorLevel: ErrorLevel = 'warning') {
    super(message);
    this.name = this.constructor.name;
    this.errorLevel = errorLevel;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
