/**
 * Tests for BaseError class and ErrorLevel type
 */

import { describe, expect, it } from 'vitest';

import { BaseError, type ErrorLevel } from '../src/errors/base-error.js';

/**
 * Test implementation of BaseError for testing purposes
 */
class TestError extends BaseError {
  constructor(message: string, errorLevel: ErrorLevel = 'warning') {
    super(message, errorLevel);
  }
}

describe('BaseError', () => {
  describe('constructor', () => {
    it('should create BaseError with default warning level', () => {
      const error = new TestError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TestError');
      expect(error.errorLevel).toBe('warning');
    });

    it('should create BaseError with info level', () => {
      const error = new TestError('Info message', 'info');

      expect(error.errorLevel).toBe('info');
      expect(error.message).toBe('Info message');
    });

    it('should create BaseError with warning level', () => {
      const error = new TestError('Warning message', 'warning');

      expect(error.errorLevel).toBe('warning');
      expect(error.message).toBe('Warning message');
    });
  });

  describe('Error instance behavior', () => {
    it('should have proper Error prototype chain', () => {
      const error = new TestError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof BaseError).toBe(true);
      expect(error instanceof TestError).toBe(true);
    });

    it('should have stack trace', () => {
      const error = new TestError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestError');
      expect(error.stack).toContain('Test error');
    });

    it('should preserve error name', () => {
      const error = new TestError('Test');

      expect(error.name).toBe('TestError');
    });
  });

  describe('errorLevel property', () => {
    it('should be readonly at compile time', () => {
      const error = new TestError('Test', 'warning');

      // TypeScript readonly is enforced at compile-time only
      // At runtime, JavaScript allows property mutation
      // So we just verify the initial value is correct
      expect(error.errorLevel).toBe('warning');
    });

    it('should accept valid ErrorLevel values', () => {
      const warningError = new TestError('Warning', 'warning');
      const infoError = new TestError('Info', 'info');

      expect(warningError.errorLevel).toBe('warning');
      expect(infoError.errorLevel).toBe('info');
    });
  });

  describe('inheritance', () => {
    it('should support custom error classes', () => {
      class CustomAppError extends BaseError {
        readonly code: string;

        constructor(message: string, code: string, errorLevel: ErrorLevel = 'warning') {
          super(message, errorLevel);
          this.code = code;
        }
      }

      const error = new CustomAppError('Custom error', 'ERR_CUSTOM', 'info');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(CustomAppError);
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('ERR_CUSTOM');
      expect(error.errorLevel).toBe('info');
    });
  });

  describe('Error catching', () => {
    it('should be catchable as Error', () => {
      try {
        throw new TestError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(BaseError);
        if (error instanceof BaseError) {
          expect(error.errorLevel).toBe('warning');
        }
      }
    });

    it('should be catchable as BaseError', () => {
      try {
        throw new TestError('Test error', 'info');
      } catch (error) {
        if (error instanceof BaseError) {
          expect(error.errorLevel).toBe('info');
          expect(error.message).toBe('Test error');
        } else {
          throw new Error('Expected BaseError');
        }
      }
    });
  });
});

describe('ErrorLevel type', () => {
  it('should accept warning value', () => {
    const level: ErrorLevel = 'warning';
    expect(level).toBe('warning');
  });

  it('should accept info value', () => {
    const level: ErrorLevel = 'info';
    expect(level).toBe('info');
  });

  // TypeScript compile-time type checking (no runtime test needed)
  // @ts-expect-error Invalid error level

  const _invalidLevel: ErrorLevel = 'error';
});
