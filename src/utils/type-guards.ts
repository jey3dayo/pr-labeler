/**
 * Shared runtime type guard utilities
 */

/**
 * Checks whether a value is a non-null object (including arrays, dates, etc.)
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks whether a value is a plain record (non-null object excluding arrays)
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

/**
 * Checks whether a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks whether a value is a number (finite)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks whether a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks whether an object has the provided property key
 */
export function hasProperty<TKey extends PropertyKey>(
  value: unknown,
  key: TKey,
): value is Record<TKey, unknown> & Record<PropertyKey, unknown> {
  return isObject(value) && key in value;
}
