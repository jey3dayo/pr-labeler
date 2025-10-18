/**
 * Common type definitions shared across modules
 */

/**
 * GitHub Pull Request context for API operations
 */
export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
}
