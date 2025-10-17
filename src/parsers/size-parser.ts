/**
 * Size parser - converts human-readable size strings to bytes
 */

import { Result, ok, err } from 'neverthrow';
import { createParseError } from '../errors';
import type { ParseError } from '../errors';
import bytes from 'bytes';

/**
 * Parse size string to bytes
 * Supports formats like: "100KB", "1.5MB", "500000", "2GB"
 *
 * @param input - Size string to parse
 * @returns Result with bytes value or ParseError
 */
export function parseSize(input: string): Result<number, ParseError> {
  // Trim whitespace
  const trimmed = input.trim();

  // Check for empty string
  if (!trimmed) {
    return err(createParseError(input, 'Size cannot be empty'));
  }

  // Check for negative values first
  if (trimmed.startsWith('-')) {
    return err(createParseError(input, 'Size cannot be negative'));
  }

  // Check for invalid units (TB and above)
  if (/\d+(\.\d+)?\s*TB/i.test(trimmed)) {
    return err(createParseError(input, `Invalid size format: ${input}. TB and larger units are not supported.`));
  }

  // Check for multiple units (e.g., 100KBMB)
  // Look for patterns like KBMB, MBB, etc. (units followed by more units)
  if (/(KB|MB|GB|kB)\s*(KB|MB|GB|B|K|M|G)/i.test(trimmed) || /[KMGB]{4,}/i.test(trimmed)) {
    return err(createParseError(input, `Invalid size format: ${input}. Multiple units detected.`));
  }

  // Special handling for single letter units like "1K" -> interpret as KB
  if (/^\d+(\.\d+)?\s*K$/i.test(trimmed)) {
    const numValue = parseFloat(trimmed.replace(/K$/i, ''));
    return ok(Math.round(numValue * 1024));
  }
  if (/^\d+(\.\d+)?\s*M$/i.test(trimmed)) {
    const numValue = parseFloat(trimmed.replace(/M$/i, ''));
    return ok(Math.round(numValue * 1024 * 1024));
  }
  if (/^\d+(\.\d+)?\s*G$/i.test(trimmed)) {
    const numValue = parseFloat(trimmed.replace(/G$/i, ''));
    return ok(Math.round(numValue * 1024 * 1024 * 1024));
  }

  // Use bytes library for parsing
  const parsed = bytes.parse(trimmed);

  if (parsed === null) {
    // Fallback for plain numbers
    const plainNumber = Number(trimmed);
    if (Number.isFinite(plainNumber) && plainNumber >= 0) {
      return ok(Math.round(plainNumber));
    }
    return err(
      createParseError(input, `Invalid size format: ${input}. Use formats like "100KB", "1.5MB", or plain numbers.`),
    );
  }

  // Double-check for negative values (should not happen with bytes library)
  if (parsed < 0) {
    return err(createParseError(input, 'Size cannot be negative'));
  }

  // Return parsed bytes value
  return ok(Math.round(parsed));
}

/**
 * Parse multiple size strings
 *
 * @param inputs - Array of size strings
 * @returns Result with array of bytes values or first ParseError
 */
export function parseSizes(inputs: string[]): Result<number[], ParseError> {
  const results: number[] = [];

  for (const input of inputs) {
    const result = parseSize(input);
    if (result.isErr()) {
      return err(result.error);
    }
    results.push(result.value);
  }

  return ok(results);
}
