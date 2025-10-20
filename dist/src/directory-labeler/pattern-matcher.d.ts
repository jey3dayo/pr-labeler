import type { MinimatchOptions } from './types.js';
export interface CompiledPattern {
    pattern: string;
    matcher: (path: string) => boolean;
    priority?: number;
}
export interface MatchResult {
    matched: boolean;
    matchedPattern?: string;
    matchLength?: number;
    priority?: number;
}
export declare function normalizePath(path: string): string;
export declare function compilePatterns(patterns: string[], options: MinimatchOptions, priority?: number): CompiledPattern[];
export declare function matchIncludePatterns(filePath: string, includePatterns: CompiledPattern[], excludePatterns: CompiledPattern[]): MatchResult;
