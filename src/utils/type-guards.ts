/**
 * Commonly used runtime type guard helpers.
 */

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return Number.isFinite(value as number);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
