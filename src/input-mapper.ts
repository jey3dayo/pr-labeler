/**
 * Input mapper - converts action inputs to internal config
 */

import { err, ok, Result } from 'neverthrow';

import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors';
import { createConfigurationError, createParseError } from './errors';
import { parseSize } from './parsers/size-parser';

/**
 * Size threshold configuration
 */
export interface SizeThresholds {
  S: { additions: number; files: number };
  M: { additions: number; files: number };
  L: { additions: number; files: number };
  // XL is determined when L thresholds are exceeded
}

/**
 * Internal configuration (camelCase, parsed)
 */
export interface Config {
  fileSizeLimit: number; // bytes
  fileLinesLimit: number; // number
  prAdditionsLimit: number; // number
  prFilesLimit: number; // number
  applyLabels: boolean;
  autoRemoveLabels: boolean;
  applySizeLabels: boolean;
  sizeThresholds: SizeThresholds;
  largeFilesLabel: string;
  tooManyFilesLabel: string;
  skipDraftPr: boolean;
  commentOnPr: 'auto' | 'always' | 'never';
  failOnViolation: boolean;
  enableSummary: boolean;
  additionalExcludePatterns: string[];
  githubToken: string;
}

/**
 * Parse boolean value
 * Accepts: true, 1, yes, on (case insensitive, with spaces)
 */
export function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

/**
 * Parse comment mode
 * Valid values: auto, always, never
 * Default: auto
 */
export function parseCommentMode(value: string): 'auto' | 'always' | 'never' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'never') {
    return normalized;
  }
  return 'auto'; // default
}

/**
 * Parse exclude patterns
 * Splits by comma or newline, trims, filters empty values and comments
 * Also removes duplicate patterns
 */
export function parseExcludePatterns(value: string): string[] {
  const patterns = value
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('#')); // Skip empty and comment lines

  // Remove duplicates
  return [...new Set(patterns)];
}

/**
 * Parse size thresholds from JSON string
 */
export function parseSizeThresholds(value: string): Result<SizeThresholds, ParseError> {
  try {
    const parsed = JSON.parse(value);

    // Validate required fields
    if (!parsed.S || !parsed.M || !parsed.L) {
      return err(createParseError(value, 'Missing required size thresholds (S, M, L)'));
    }

    // Validate structure and non-negative values
    const sizes = ['S', 'M', 'L'] as const;
    for (const size of sizes) {
      if (typeof parsed[size].additions !== 'number' || typeof parsed[size].files !== 'number') {
        return err(createParseError(value, `Invalid threshold structure for size ${size}`));
      }
      if (parsed[size].additions < 0 || parsed[size].files < 0) {
        return err(createParseError(value, `Threshold values for size ${size} must be non-negative`));
      }
    }

    // Validate monotonicity (S ≤ M ≤ L)
    if (parsed.S.additions > parsed.M.additions || parsed.M.additions > parsed.L.additions) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for additions)'));
    }
    if (parsed.S.files > parsed.M.files || parsed.M.files > parsed.L.files) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for files)'));
    }

    return ok(parsed as SizeThresholds);
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for size thresholds'));
  }
}

/**
 * Map action inputs to internal config
 */
export function mapActionInputsToConfig(inputs: ActionInputs): Result<Config, ConfigurationError | ParseError> {
  // Parse file size limit
  const fileSizeLimitResult = parseSize(inputs.file_size_limit);
  if (fileSizeLimitResult.isErr()) {
    return err(fileSizeLimitResult.error);
  }

  // Parse numeric limits
  const fileLinesLimit = parseInt(inputs.file_lines_limit, 10);
  if (isNaN(fileLinesLimit)) {
    return err(
      createConfigurationError('file_lines_limit', inputs.file_lines_limit, 'File lines limit must be a number'),
    );
  }

  const prAdditionsLimit = parseInt(inputs.pr_additions_limit, 10);
  if (isNaN(prAdditionsLimit)) {
    return err(
      createConfigurationError('pr_additions_limit', inputs.pr_additions_limit, 'PR additions limit must be a number'),
    );
  }

  const prFilesLimit = parseInt(inputs.pr_files_limit, 10);
  if (isNaN(prFilesLimit)) {
    return err(createConfigurationError('pr_files_limit', inputs.pr_files_limit, 'PR files limit must be a number'));
  }

  // Parse size thresholds
  const sizeThresholdsResult = parseSizeThresholds(inputs.size_label_thresholds);
  if (sizeThresholdsResult.isErr()) {
    return err(sizeThresholdsResult.error);
  }

  // Construct config object
  const config: Config = {
    fileSizeLimit: fileSizeLimitResult.value,
    fileLinesLimit,
    prAdditionsLimit,
    prFilesLimit,
    applyLabels: parseBoolean(inputs.apply_labels),
    autoRemoveLabels: parseBoolean(inputs.auto_remove_labels),
    applySizeLabels: parseBoolean(inputs.apply_size_labels),
    sizeThresholds: sizeThresholdsResult.value,
    largeFilesLabel: inputs.large_files_label,
    tooManyFilesLabel: inputs.too_many_files_label,
    skipDraftPr: parseBoolean(inputs.skip_draft_pr),
    commentOnPr: parseCommentMode(inputs.comment_on_pr),
    failOnViolation: parseBoolean(inputs.fail_on_violation),
    enableSummary: parseBoolean(inputs.enable_summary),
    additionalExcludePatterns: parseExcludePatterns(inputs.additional_exclude_patterns),
    githubToken: inputs.github_token,
  };

  return ok(config);
}
