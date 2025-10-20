import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ActionOutputs,
  getActionInputs,
  getGitHubToken,
  logDebug,
  logError,
  logInfo,
  logWarning,
  setActionOutputs,
  setFailed,
  writeSummaryWithAnalysis,
} from '../src/actions-io';
import type { AnalysisResult } from '../src/file-metrics';

// Mock @actions/core
vi.mock('@actions/core');

describe('GitHub Actions I/O', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env['GITHUB_TOKEN'];
    delete process.env['GH_TOKEN'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGitHubToken', () => {
    it('should get token from input parameter', () => {
      vi.mocked(core.getInput).mockReturnValue('input-token-123');

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('input-token-123');
      }
      expect(core.getInput).toHaveBeenCalledWith('github_token');
    });

    it('should fallback to GITHUB_TOKEN env variable', () => {
      vi.mocked(core.getInput).mockReturnValue('');
      process.env['GITHUB_TOKEN'] = 'env-github-token-456';

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('env-github-token-456');
      }
    });

    it('should fallback to GH_TOKEN env variable', () => {
      vi.mocked(core.getInput).mockReturnValue('');
      process.env['GH_TOKEN'] = 'env-gh-token-789';

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('env-gh-token-789');
      }
    });

    it('should prioritize input over env variables', () => {
      vi.mocked(core.getInput).mockReturnValue('input-token');
      process.env['GITHUB_TOKEN'] = 'env-token';
      process.env['GH_TOKEN'] = 'gh-token';

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('input-token');
      }
    });

    it('should return error when no token is available', () => {
      vi.mocked(core.getInput).mockReturnValue('');

      const result = getGitHubToken();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('github_token');
        expect(result.error.message).toContain('GitHub token is required');
      }
    });
  });

  describe('getActionInputs', () => {
    it('should get all action inputs with defaults', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'test-token',
          file_size_limit: '',
          file_lines_limit: '',
          pr_additions_limit: '',
          pr_files_limit: '',
          apply_labels: '',
          auto_remove_labels: '',
          apply_size_labels: '',
          size_label_thresholds: '',
          large_files_label: '',
          too_many_files_label: '',
          skip_draft_pr: '',
          comment_on_pr: '',
          fail_on_violation: '',
          additional_exclude_patterns: '',
        };
        return inputs[name] || '';
      });

      const inputs = getActionInputs();

      expect(inputs.github_token).toBe('test-token');
      expect(inputs.file_size_limit).toBe('100KB');
      expect(inputs.file_lines_limit).toBe('500');
      expect(inputs.pr_additions_limit).toBe('5000');
      expect(inputs.pr_files_limit).toBe('50');
      expect(inputs.apply_labels).toBe('true');
      expect(inputs.auto_remove_labels).toBe('true');
      expect(inputs.apply_size_labels).toBe('true');
      expect(inputs.large_files_label).toBe('auto:large-files');
      expect(inputs.too_many_files_label).toBe('auto:too-many-files');
      expect(inputs.skip_draft_pr).toBe('true');
      expect(inputs.comment_on_pr).toBe('auto');
      expect(inputs.fail_on_violation).toBe('false');
      expect(inputs.additional_exclude_patterns).toBe('');
    });

    it('should use provided values over defaults', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'custom-token',
          file_size_limit: '1MB',
          file_lines_limit: '1000',
          pr_additions_limit: '10000',
          pr_files_limit: '100',
          apply_labels: 'false',
          auto_remove_labels: 'false',
          apply_size_labels: 'false',
          large_files_label: 'custom:large',
          too_many_files_label: 'custom:many-files',
          skip_draft_pr: 'false',
          comment_on_pr: 'never',
          fail_on_violation: 'true',
          additional_exclude_patterns: '*.test.ts,*.spec.ts',
        };
        return inputs[name] || '';
      });

      const inputs = getActionInputs();

      expect(inputs.file_size_limit).toBe('1MB');
      expect(inputs.file_lines_limit).toBe('1000');
      expect(inputs.pr_additions_limit).toBe('10000');
      expect(inputs.pr_files_limit).toBe('100');
      expect(inputs.apply_labels).toBe('false');
      expect(inputs.auto_remove_labels).toBe('false');
      expect(inputs.apply_size_labels).toBe('false');
      expect(inputs.large_files_label).toBe('custom:large');
      expect(inputs.too_many_files_label).toBe('custom:many-files');
      expect(inputs.skip_draft_pr).toBe('false');
      expect(inputs.comment_on_pr).toBe('never');
      expect(inputs.fail_on_violation).toBe('true');
      expect(inputs.additional_exclude_patterns).toBe('*.test.ts,*.spec.ts');
    });
  });

  describe('setActionOutputs', () => {
    it('should set all output values', () => {
      const mockSetOutput = vi.mocked(core.setOutput);
      const outputs: ActionOutputs = {
        large_files: JSON.stringify([
          {
            file: 'src/large.ts',
            actualValue: 150000,
            limit: 102400,
            violationType: 'size',
            severity: 'critical',
          },
        ]),
        pr_additions: '6234',
        pr_files: '75',
        exceeds_file_size: 'true',
        exceeds_file_lines: 'false',
        exceeds_additions: 'true',
        exceeds_file_count: 'true',
        has_violations: 'true',
      };

      setActionOutputs(outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('large_files', outputs.large_files);
      expect(mockSetOutput).toHaveBeenCalledWith('pr_additions', '6234');
      expect(mockSetOutput).toHaveBeenCalledWith('pr_files', '75');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_file_size', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_file_lines', 'false');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_additions', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_file_count', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('has_violations', 'true');
      expect(mockSetOutput).toHaveBeenCalledTimes(8);
    });
  });

  describe('Logging functions', () => {
    it('should call core.info for logInfo', () => {
      const mockInfo = vi.mocked(core.info);
      logInfo('Test info message');
      expect(mockInfo).toHaveBeenCalledWith('Test info message');
    });

    it('should call core.debug for logDebug', () => {
      const mockDebug = vi.mocked(core.debug);
      logDebug('Test debug message');
      expect(mockDebug).toHaveBeenCalledWith('Test debug message');
    });

    it('should call core.warning for logWarning', () => {
      const mockWarning = vi.mocked(core.warning);
      logWarning('Test warning message');
      expect(mockWarning).toHaveBeenCalledWith('Test warning message');
    });

    it('should call core.error for logError', () => {
      const mockError = vi.mocked(core.error);
      logError('Test error message');
      expect(mockError).toHaveBeenCalledWith('Test error message');
    });

    it('should call core.setFailed for setFailed', () => {
      const mockSetFailed = vi.mocked(core.setFailed);
      setFailed('Test failure message');
      expect(mockSetFailed).toHaveBeenCalledWith('Test failure message');
    });
  });

  describe('setSecret', () => {
    it('should mask sensitive values', () => {
      const mockSetSecret = vi.mocked(core.setSecret);
      vi.mocked(core.getInput).mockReturnValue('secret-token-123');

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      expect(mockSetSecret).toHaveBeenCalledWith('secret-token-123');
    });
  });

  describe('writeSummaryWithAnalysis', () => {
    let mockSummary: any;

    beforeEach(() => {
      mockSummary = {
        addRaw: vi.fn().mockReturnThis(),
        write: vi.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(core, 'summary', {
        get: () => mockSummary,
        configurable: true,
      });
    });

    it('should skip summary when enableSummary is false', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 100,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: false });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('skipped');
      }
      expect(mockSummary.addRaw).not.toHaveBeenCalled();
      expect(mockSummary.write).not.toHaveBeenCalled();
    });

    it('should write summary when enableSummary is true', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 3,
          totalAdditions: 200,
          filesAnalyzed: [
            {
              path: 'src/test.ts',
              size: 5000,
              lines: 100,
              additions: 50,
              deletions: 10,
            },
          ],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('written');
        expect(result.value.bytesWritten).toBeGreaterThan(0);
      }
      expect(mockSummary.addRaw).toHaveBeenCalled();
      expect(mockSummary.write).toHaveBeenCalled();

      // Verify markdown content includes expected sections
      const markdown = mockSummary.addRaw.mock.calls[0][0];
      expect(markdown).toContain('# 📊 PR Labeler');
      expect(markdown).toContain('### 📊 Summary');
      expect(markdown).toContain('Total additions:');
    });

    it('should handle summary write errors gracefully', async () => {
      mockSummary.write.mockRejectedValue(new Error('Write failed'));

      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 1,
          totalAdditions: 10,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to write GitHub Actions Summary');
      }
    });

    it('should include violations in summary', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 2,
          totalAdditions: 1000,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [
            {
              file: 'src/large.ts',
              actualValue: 2000000,
              limit: 1000000,
              violationType: 'size',
              severity: 'critical',
            },
          ],
          exceedsFileLines: [],
          exceedsAdditions: true,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true });

      expect(result.isOk()).toBe(true);
      const markdown = mockSummary.addRaw.mock.calls[0][0];
      expect(markdown).toContain('### 📊 Size Summary');
      expect(markdown).toContain('### 🚫 Large Files Detected');
      expect(markdown).toContain('src/large.ts');
    });
  });
});
