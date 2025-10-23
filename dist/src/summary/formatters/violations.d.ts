import type { Violations } from '../../errors/index.js';
export interface FormatViolationsOptions {
    includeHeader?: boolean;
}
export declare function hasViolations(violations: Violations): boolean;
export declare function formatViolations(violations: Violations, options?: FormatViolationsOptions): string;
