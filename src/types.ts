/**
 * Common type definitions shared across modules
 */

/**
 * CI check status
 */
export type CICheckStatus = 'passed' | 'failed' | 'pending' | 'unknown';

/**
 * CI status for risk evaluation
 */
export interface CIStatus {
  tests: CICheckStatus;
  typeCheck: CICheckStatus;
  build: CICheckStatus;
  lint: CICheckStatus;
}

/**
 * Change type detected from commit messages
 */
export type ChangeType = 'refactor' | 'fix' | 'feature' | 'docs' | 'test' | 'style' | 'chore' | 'unknown';

/**
 * GitHub Pull Request context for API operations
 */
export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
  ciStatus?: CIStatus;
  commitMessages?: string[];
}
