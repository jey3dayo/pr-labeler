/**
 * Tests for error helper functions
 */

import { describe, expect, it, vi } from 'vitest';

import * as actionsIo from '../src/actions-io.js';
import { BaseError } from '../src/errors/base-error.js';
import { ensureError, extractAggregateError, handleErrorLevel, processError } from '../src/errors/helpers.js';

// Mock actions-io module
vi.mock('../src/actions-io.js', () => ({
  logWarning: vi.fn(),
  logInfo: vi.fn(),
}));

/**
 * Test implementation of BaseError
 */
class TestBaseError extends BaseError {
  constructor(message: string, errorLevel: 'warning' | 'info' = 'warning') {
    super(message, errorLevel);
  }
}

describe('ensureError', () => {
  describe('Error conversion', () => {
    it('should return Error instance as-is', () => {
      const error = new Error('Test error');
      const result = ensureError(error);

      expect(result).toBe(error);
      expect(result.message).toBe('Test error');
    });

    it('should convert string to Error', () => {
      const result = ensureError('Error message');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Error message');
    });

    it('should convert unknown to Error with default message', () => {
      const result = ensureError(null);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should convert number to Error with default message', () => {
      const result = ensureError(42);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should convert object to Error with default message', () => {
      const result = ensureError({ foo: 'bar' });

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should use custom default message', () => {
      const result = ensureError(null, 'Custom default message');

      expect(result.message).toBe('Custom default message');
    });
  });

  describe('Custom Error class conversion', () => {
    class CustomError extends Error {
      code: string;
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
        this.code = 'CUSTOM';
      }
    }

    it('should return matching custom Error instance as-is', () => {
      const error = new CustomError('Custom error');
      const result = ensureError(error, 'Default', CustomError);

      expect(result).toBe(error);
      expect(result).toBeInstanceOf(CustomError);
      expect(result.code).toBe('CUSTOM');
    });

    it('should convert Error to custom Error class', () => {
      const error = new Error('Standard error');
      const result = ensureError(error, 'Default', CustomError);

      expect(result).toBeInstanceOf(CustomError);
      expect(result.message).toBe('Standard error');
    });

    it('should convert string to custom Error class', () => {
      const result = ensureError('Error message', 'Default', CustomError);

      expect(result).toBeInstanceOf(CustomError);
      expect(result.message).toBe('Error message');
    });
  });

  describe('BaseError handling', () => {
    it('should return BaseError instance as-is', () => {
      const error = new TestBaseError('Base error', 'warning');
      const result = ensureError(error);

      expect(result).toBe(error);
      expect(result).toBeInstanceOf(BaseError);
    });

    it('should convert to BaseError subclass', () => {
      const error = new Error('Standard error');
      const result = ensureError(error, 'Default', TestBaseError);

      expect(result).toBeInstanceOf(TestBaseError);
      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Standard error');
      expect(result.errorLevel).toBe('warning');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined', () => {
      const result = ensureError(undefined);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should handle empty string', () => {
      const result = ensureError('');

      expect(result).toBeInstanceOf(Error);
      // Empty string is truthy, so it's used as-is
      expect(result.message).toBe('');
    });

    it('should handle Error with empty message', () => {
      const error = new Error('');
      const result = ensureError(error);

      expect(result).toBe(error);
      expect(result.message).toBe('');
    });
  });
});

describe('handleErrorLevel', () => {
  it('should return warning for standard Error', () => {
    const error = new Error('Standard error');
    const level = handleErrorLevel(error);

    expect(level).toBe('warning');
  });

  it('should return errorLevel from BaseError', () => {
    const warningError = new TestBaseError('Warning error', 'warning');
    const infoError = new TestBaseError('Info error', 'info');

    expect(handleErrorLevel(warningError)).toBe('warning');
    expect(handleErrorLevel(infoError)).toBe('info');
  });

  it('should return warning for non-Error values', () => {
    expect(handleErrorLevel('error string')).toBe('warning');
    expect(handleErrorLevel(null)).toBe('warning');
    expect(handleErrorLevel(42)).toBe('warning');
    expect(handleErrorLevel({ message: 'error' })).toBe('warning');
  });

  it('should handle TypeError as warning', () => {
    const error = new TypeError('Type error');
    const level = handleErrorLevel(error);

    expect(level).toBe('warning');
  });
});

describe('processError', () => {
  it('should log warning for standard Error', () => {
    const logWarningSpy = vi.mocked(actionsIo.logWarning);
    const error = new Error('Test error');

    const message = processError(error);

    expect(message).toBe('[Error]: Test error');
    expect(logWarningSpy).toHaveBeenCalledWith('[Error]: Test error');
  });

  it('should log warning for BaseError with warning level', () => {
    const logWarningSpy = vi.mocked(actionsIo.logWarning);
    const error = new TestBaseError('Warning error', 'warning');

    const message = processError(error);

    expect(message).toBe('[TestBaseError]: Warning error');
    expect(logWarningSpy).toHaveBeenCalledWith('[TestBaseError]: Warning error');
  });

  it('should log info for BaseError with info level', () => {
    const logInfoSpy = vi.mocked(actionsIo.logInfo);
    const error = new TestBaseError('Info message', 'info');

    const message = processError(error);

    expect(message).toBe('[TestBaseError]: Info message');
    expect(logInfoSpy).toHaveBeenCalledWith('[TestBaseError]: Info message');
  });

  it('should handle non-Error values', () => {
    const logWarningSpy = vi.mocked(actionsIo.logWarning);
    logWarningSpy.mockClear(); // Clear previous calls

    const message1 = processError('error string');
    const message2 = processError(null);

    expect(message1).toBe('[Error]: error string');
    expect(message2).toBe('[Error]: Unknown error occurred');
    expect(logWarningSpy).toHaveBeenCalledTimes(2);
  });

  it('should format custom Error names correctly', () => {
    const logWarningSpy = vi.mocked(actionsIo.logWarning);

    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const error = new CustomError('Custom message');
    const message = processError(error);

    expect(message).toBe('[CustomError]: Custom message');
    expect(logWarningSpy).toHaveBeenCalledWith('[CustomError]: Custom message');
  });
});

describe('extractAggregateError', () => {
  it('should return Error instance as-is', () => {
    const error = new Error('Test error');
    const result = extractAggregateError(error);

    expect(result).toBe(error);
  });

  it('should extract first error from AggregateError', () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');
    const aggregateError = new AggregateError([error1, error2], 'Multiple errors');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(error1);
    expect(result.message).toBe('Error 1');
  });

  it('should return AggregateError if errors array is empty', () => {
    const aggregateError = new AggregateError([], 'No errors');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(aggregateError);
    expect(result.message).toBe('No errors');
  });

  it('should convert non-Error values to Error', () => {
    const result1 = extractAggregateError('error string');
    const result2 = extractAggregateError(null);
    const result3 = extractAggregateError(42);

    expect(result1).toBeInstanceOf(Error);
    expect(result1.message).toBe('error string');

    expect(result2).toBeInstanceOf(Error);
    expect(result2.message).toBe('null');

    expect(result3).toBeInstanceOf(Error);
    expect(result3.message).toBe('42');
  });

  it('should handle object with errors array but not AggregateError', () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');
    // Must be an actual Error instance with errors property
    const fakeAggregateError = Object.assign(new Error('Fake aggregate'), {
      errors: [error1, error2],
    });

    const result = extractAggregateError(fakeAggregateError);

    // Should extract first error even if not actual AggregateError
    expect(result).toBe(error1);
  });

  it('should handle Promise.allSettled rejection with AggregateError', () => {
    const error1 = new Error('Promise 1 failed');
    const error2 = new Error('Promise 2 failed');
    const aggregateError = new AggregateError([error1, error2], 'Multiple promises failed');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(error1);
    expect(result.message).toBe('Promise 1 failed');
  });

  it('should preserve TypeError from AggregateError', () => {
    const typeError = new TypeError('Type error');
    const rangeError = new RangeError('Range error');
    const aggregateError = new AggregateError([typeError, rangeError], 'Multiple errors');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(typeError);
    expect(result).toBeInstanceOf(TypeError);
  });
});
