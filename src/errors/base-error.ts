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

  constructor(message: string, errorLevel: ErrorLevel = 'warning', options?: { cause?: unknown }) {
    // Preserve native cause when available (ES2022 ErrorOptions)
    super(message, options);
    // Ensure instanceof works reliably across targets/bundlers
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.errorLevel = errorLevel;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}
