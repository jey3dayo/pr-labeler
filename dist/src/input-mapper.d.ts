import { Result } from 'neverthrow';
import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors/index.js';
export interface SizeThresholds {
    S: {
        additions: number;
        files: number;
    };
    M: {
        additions: number;
        files: number;
    };
    L: {
        additions: number;
        files: number;
    };
}
export interface Config {
    fileSizeLimit: number;
    fileLinesLimit: number;
    prAdditionsLimit: number;
    prFilesLimit: number;
    applyLabels: boolean;
    autoRemoveLabels: boolean;
    sizeEnabled: boolean;
    sizeThresholdsV2: {
        small: number;
        medium: number;
        large: number;
    };
    complexityEnabled: boolean;
    complexityThresholdsV2: {
        medium: number;
        high: number;
    };
    categoryEnabled: boolean;
    riskEnabled: boolean;
    largeFilesLabel: string;
    tooManyFilesLabel: string;
    skipDraftPr: boolean;
    commentOnPr: 'auto' | 'always' | 'never';
    failOnViolation: boolean;
    enableSummary: boolean;
    additionalExcludePatterns: string[];
    githubToken: string;
    enableDirectoryLabeling: boolean;
    directoryLabelerConfigPath: string;
    autoCreateLabels: boolean;
    labelColor: string;
    labelDescription: string;
    maxLabels: number;
    useDefaultExcludes: boolean;
}
export declare function parseBoolean(value: string): boolean;
export declare function parseBooleanStrict(value: string): Result<boolean, ConfigurationError>;
export declare function parseCommentMode(value: string): 'auto' | 'always' | 'never';
export declare function parseExcludePatterns(value: string): string[];
export declare function parseSizeThresholds(value: string): Result<SizeThresholds, ParseError>;
export declare function parseSizeThresholdsV2(value: string): Result<{
    small: number;
    medium: number;
    large: number;
}, ParseError>;
export declare function parseComplexityThresholdsV2(value: string): Result<{
    medium: number;
    high: number;
}, ParseError>;
export declare function mapActionInputsToConfig(inputs: ActionInputs): Result<Config, ConfigurationError | ParseError>;
