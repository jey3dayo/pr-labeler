import { err, ok, type Result } from 'neverthrow';

export interface PatternValidationError {
  pattern: string;
  reason: string;
  details?: string;
}

/**
 * Validates a minimatch pattern for syntax correctness.
 *
 * Checks for:
 * - Balanced braces {} (for brace expansion)
 * - Balanced brackets [] (for character classes)
 * - Invalid escape sequences
 * - Empty patterns
 * - Common problematic patterns
 *
 * @param pattern - The minimatch pattern to validate
 * @returns Result containing the validated pattern or a validation error
 */
export function validateMinimatchPattern(pattern: string): Result<string, PatternValidationError> {
  // Check for empty pattern
  if (pattern.trim().length === 0) {
    return err({
      pattern,
      reason: 'Empty pattern',
      details: 'Pattern cannot be empty or whitespace-only',
    });
  }

  // Check for balanced braces
  const openBraces = (pattern.match(/\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    return err({
      pattern,
      reason: 'Unbalanced braces',
      details: `Found ${openBraces} opening brace(s) and ${closeBraces} closing brace(s)`,
    });
  }

  // Check for balanced brackets
  const openBrackets = (pattern.match(/\[/g) || []).length;
  const closeBrackets = (pattern.match(/\]/g) || []).length;

  if (openBrackets !== closeBrackets) {
    return err({
      pattern,
      reason: 'Unbalanced brackets',
      details: `Found ${openBrackets} opening bracket(s) and ${closeBrackets} closing bracket(s)`,
    });
  }

  // Check for invalid escape sequences
  // Look for backslash followed by invalid characters in minimatch context
  const invalidEscapeMatch = pattern.match(/\\[^*?[\]{}!()@+\\/-]/);
  if (invalidEscapeMatch) {
    return err({
      pattern,
      reason: 'Invalid escape sequence',
      details: `Found invalid escape sequence: ${invalidEscapeMatch[0]}`,
    });
  }

  // Check for empty brace expansion
  if (pattern.includes('{}')) {
    return err({
      pattern,
      reason: 'Empty brace expansion',
      details: 'Brace expansion cannot be empty: {}',
    });
  }

  // Check for empty character class
  if (pattern.includes('[]')) {
    return err({
      pattern,
      reason: 'Empty character class',
      details: 'Character class cannot be empty: []',
    });
  }

  // Check for unescaped special characters in problematic positions
  // e.g., pattern starting with } or ] without proper context
  if (/^[}\]]/.test(pattern)) {
    return err({
      pattern,
      reason: 'Invalid pattern start',
      details: 'Pattern cannot start with } or ] without proper context',
    });
  }

  // Check for nested brace expansion issues
  // Detect patterns like {{}} which are likely errors
  if (/\{\{|\}\}/.test(pattern)) {
    return err({
      pattern,
      reason: 'Nested braces detected',
      details: 'Nested brace expansion may cause unexpected behavior',
    });
  }

  // All checks passed
  return ok(pattern);
}

/**
 * Validates multiple minimatch patterns.
 *
 * @param patterns - Array of patterns to validate
 * @returns Result containing array of validated patterns or first validation error
 */
export function validateMinimatchPatterns(patterns: string[]): Result<string[], PatternValidationError> {
  const validated: string[] = [];

  for (const pattern of patterns) {
    const result = validateMinimatchPattern(pattern);
    if (result.isErr()) {
      return err(result.error);
    }
    validated.push(result.value);
  }

  return ok(validated);
}

/**
 * Checks if a pattern is valid without returning detailed errors.
 * Useful for quick validation checks.
 *
 * @param pattern - The minimatch pattern to check
 * @returns true if valid, false otherwise
 */
export function isValidMinimatchPattern(pattern: string): boolean {
  return validateMinimatchPattern(pattern).isOk();
}
