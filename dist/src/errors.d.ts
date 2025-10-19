export interface Violations {
    largeFiles: ViolationDetail[];
    exceedsFileLines: ViolationDetail[];
    exceedsAdditions: boolean;
    exceedsFileCount: boolean;
}
export interface ViolationDetail {
    file: string;
    actualValue: number;
    limit: number;
    violationType: 'size' | 'lines';
    severity: 'critical' | 'warning';
}
export interface FileAnalysisError {
    type: 'FileAnalysisError';
    file: string;
    message: string;
}
export interface GitHubAPIError {
    type: 'GitHubAPIError';
    status?: number;
    message: string;
}
export interface ConfigurationError {
    type: 'ConfigurationError';
    field: string;
    value: unknown;
    message: string;
}
export interface ParseError {
    type: 'ParseError';
    input: string;
    message: string;
}
export interface FileSystemError {
    type: 'FileSystemError';
    path?: string;
    message: string;
}
export interface ViolationError {
    type: 'ViolationError';
    violations: Violations;
    message: string;
}
export interface DiffError {
    type: 'DiffError';
    source: 'local-git' | 'github-api' | 'both';
    message: string;
}
export interface PatternError {
    type: 'PatternError';
    pattern: string;
    message: string;
}
export interface CacheError {
    type: 'CacheError';
    key?: string;
    message: string;
}
export interface ComplexityAnalysisError {
    type: 'ComplexityAnalysisError';
    filename?: string;
    message: string;
}
export type AppError = FileAnalysisError | GitHubAPIError | ConfigurationError | ParseError | FileSystemError | ViolationError | DiffError | PatternError | CacheError | ComplexityAnalysisError;
export declare const createFileAnalysisError: (file: string, message: string) => FileAnalysisError;
export declare const createGitHubAPIError: (message: string, status?: number) => GitHubAPIError;
export declare const createConfigurationError: (field: string, value: unknown, message: string) => ConfigurationError;
export declare const createParseError: (input: string, message: string) => ParseError;
export declare const createFileSystemError: (message: string, path?: string) => FileSystemError;
export declare const createViolationError: (violations: Violations, message: string) => ViolationError;
export declare const createDiffError: (source: "local-git" | "github-api" | "both", message: string) => DiffError;
export declare const createPatternError: (pattern: string, message: string) => PatternError;
export declare const createCacheError: (message: string, key?: string) => CacheError;
export declare const createComplexityAnalysisError: (message: string, filename?: string) => ComplexityAnalysisError;
export type { Err, Ok } from 'neverthrow';
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
