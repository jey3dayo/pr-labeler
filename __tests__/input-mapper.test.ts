import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionInputs } from '../src/actions-io';
import {
  mapActionInputsToConfig,
  parseBoolean,
  parseCommentMode,
  parseExcludePatterns,
  parseSizeThresholds,
} from '../src/input-mapper';

// Mock @actions/core
vi.mock('@actions/core');

describe('InputMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseBoolean', () => {
    it('should parse true values', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
      expect(parseBoolean('YES')).toBe(true);
      expect(parseBoolean('on')).toBe(true);
      expect(parseBoolean('ON')).toBe(true);
      expect(parseBoolean(' true ')).toBe(true); // with spaces
    });

    it('should parse false values', () => {
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('no')).toBe(false);
      expect(parseBoolean('off')).toBe(false);
      expect(parseBoolean('anything')).toBe(false);
      expect(parseBoolean('')).toBe(false);
    });
  });

  describe('parseCommentMode', () => {
    it('should parse valid comment modes', () => {
      expect(parseCommentMode('auto')).toBe('auto');
      expect(parseCommentMode('always')).toBe('always');
      expect(parseCommentMode('never')).toBe('never');
      expect(parseCommentMode('AUTO')).toBe('auto');
      expect(parseCommentMode(' always ')).toBe('always');
    });

    it('should default to auto for invalid values', () => {
      expect(parseCommentMode('invalid')).toBe('auto');
      expect(parseCommentMode('')).toBe('auto');
      expect(parseCommentMode('sometimes')).toBe('auto');
    });
  });

  describe('parseExcludePatterns', () => {
    it('should parse comma-separated patterns', () => {
      const result = parseExcludePatterns('*.test.ts,*.spec.ts,*.md');
      expect(result).toEqual(['*.test.ts', '*.spec.ts', '*.md']);
    });

    it('should parse newline-separated patterns', () => {
      const result = parseExcludePatterns('*.test.ts\n*.spec.ts\n*.md');
      expect(result).toEqual(['*.test.ts', '*.spec.ts', '*.md']);
    });

    it('should parse mixed separators', () => {
      const result = parseExcludePatterns('*.test.ts,*.spec.ts\n*.md,*.txt');
      expect(result).toEqual(['*.test.ts', '*.spec.ts', '*.md', '*.txt']);
    });

    it('should trim whitespace', () => {
      const result = parseExcludePatterns('  *.test.ts  ,  *.spec.ts  ');
      expect(result).toEqual(['*.test.ts', '*.spec.ts']);
    });

    it('should filter empty patterns', () => {
      const result = parseExcludePatterns('*.test.ts,,\n\n,*.spec.ts');
      expect(result).toEqual(['*.test.ts', '*.spec.ts']);
    });

    it('should return empty array for empty input', () => {
      expect(parseExcludePatterns('')).toEqual([]);
      expect(parseExcludePatterns('  ')).toEqual([]);
    });
  });

  describe('parseSizeThresholds', () => {
    it('should parse valid JSON thresholds', () => {
      const json = JSON.stringify({
        S: { additions: 100, files: 10 },
        M: { additions: 500, files: 30 },
        L: { additions: 1000, files: 50 },
      });
      const result = parseSizeThresholds(json);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.S.additions).toBe(100);
        expect(result.value.S.files).toBe(10);
        expect(result.value.M.additions).toBe(500);
        expect(result.value.M.files).toBe(30);
        expect(result.value.L.additions).toBe(1000);
        expect(result.value.L.files).toBe(50);
      }
    });

    it('should return error for invalid JSON', () => {
      const result = parseSizeThresholds('invalid json');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ParseError');
        expect(result.error.message).toContain('Invalid JSON');
      }
    });

    it('should return error for missing required thresholds', () => {
      const json = JSON.stringify({
        S: { additions: 100, files: 10 },
        // Missing M and L
      });
      const result = parseSizeThresholds(json);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ParseError');
        expect(result.error.message).toContain('Missing required size thresholds');
      }
    });

    it('should return error for invalid threshold structure', () => {
      const json = JSON.stringify({
        S: { additions: 100 }, // Missing files
        M: { additions: 500, files: 30 },
        L: { additions: 1000, files: 50 },
      });
      const result = parseSizeThresholds(json);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ParseError');
      }
    });
  });

  describe('mapActionInputsToConfig', () => {
    it('should map all inputs to config with defaults', () => {
      const inputs: ActionInputs = {
        github_token: 'test-token',
        file_size_limit: '100KB',
        file_lines_limit: '500',
        pr_additions_limit: '5000',
        pr_files_limit: '50',
        apply_labels: 'true',
        auto_remove_labels: 'true',
        apply_size_labels: 'true',
        size_label_thresholds: JSON.stringify({
          S: { additions: 100, files: 10 },
          M: { additions: 500, files: 30 },
          L: { additions: 1000, files: 50 },
        }),
        large_files_label: 'auto:large-files',
        too_many_files_label: 'auto:too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        fail_on_violation: 'false',
        enable_summary: 'true',
        additional_exclude_patterns: '*.test.ts,*.spec.ts',
      };

      const result = mapActionInputsToConfig(inputs);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.fileSizeLimit).toBe(102400); // 100KB in bytes
        expect(config.fileLinesLimit).toBe(500);
        expect(config.prAdditionsLimit).toBe(5000);
        expect(config.prFilesLimit).toBe(50);
        expect(config.applyLabels).toBe(true);
        expect(config.autoRemoveLabels).toBe(true);
        expect(config.applySizeLabels).toBe(true);
        expect(config.sizeThresholds.S.additions).toBe(100);
        expect(config.largeFilesLabel).toBe('auto:large-files');
        expect(config.tooManyFilesLabel).toBe('auto:too-many-files');
        expect(config.skipDraftPr).toBe(true);
        expect(config.commentOnPr).toBe('auto');
        expect(config.failOnViolation).toBe(false);
        expect(config.additionalExcludePatterns).toEqual(['*.test.ts', '*.spec.ts']);
        expect(config.githubToken).toBe('test-token');
      }
    });

    it('should handle invalid file size limit', () => {
      const inputs: ActionInputs = {
        github_token: 'test-token',
        file_size_limit: 'invalid',
        file_lines_limit: '500',
        pr_additions_limit: '5000',
        pr_files_limit: '50',
        apply_labels: 'true',
        auto_remove_labels: 'true',
        apply_size_labels: 'true',
        size_label_thresholds: JSON.stringify({
          S: { additions: 100, files: 10 },
          M: { additions: 500, files: 30 },
          L: { additions: 1000, files: 50 },
        }),
        large_files_label: 'auto:large-files',
        too_many_files_label: 'auto:too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        fail_on_violation: 'false',
        enable_summary: 'true',
        additional_exclude_patterns: '',
      };

      const result = mapActionInputsToConfig(inputs);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ParseError');
      }
    });

    it('should handle invalid size thresholds', () => {
      const inputs: ActionInputs = {
        github_token: 'test-token',
        file_size_limit: '100KB',
        file_lines_limit: '500',
        pr_additions_limit: '5000',
        pr_files_limit: '50',
        apply_labels: 'true',
        auto_remove_labels: 'true',
        apply_size_labels: 'true',
        size_label_thresholds: 'invalid json',
        large_files_label: 'auto:large-files',
        too_many_files_label: 'auto:too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        fail_on_violation: 'false',
        enable_summary: 'true',
        additional_exclude_patterns: '',
      };

      const result = mapActionInputsToConfig(inputs);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ParseError');
      }
    });

    it('should handle non-numeric limits', () => {
      const inputs: ActionInputs = {
        github_token: 'test-token',
        file_size_limit: '100KB',
        file_lines_limit: 'not-a-number',
        pr_additions_limit: '5000',
        pr_files_limit: '50',
        apply_labels: 'true',
        auto_remove_labels: 'true',
        apply_size_labels: 'true',
        size_label_thresholds: JSON.stringify({
          S: { additions: 100, files: 10 },
          M: { additions: 500, files: 30 },
          L: { additions: 1000, files: 50 },
        }),
        large_files_label: 'auto:large-files',
        too_many_files_label: 'auto:too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        fail_on_violation: 'false',
        enable_summary: 'true',
        additional_exclude_patterns: '',
      };

      const result = mapActionInputsToConfig(inputs);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        if (result.error.type === 'ConfigurationError') {
          expect(result.error.field).toBe('file_lines_limit');
        }
      }
    });
  });
});
