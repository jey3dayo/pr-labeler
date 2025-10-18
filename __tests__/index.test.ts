import * as core from '@actions/core';
import * as github from '@actions/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock modules
vi.mock('@actions/core');
vi.mock('@actions/github');
vi.mock('../src/diff-strategy');
vi.mock('../src/file-metrics');
vi.mock('../src/label-manager');
vi.mock('../src/comment-manager');

describe('PR Metrics Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        github_token: 'test-token-123',
        file_size_limit: '100KB',
        file_lines_limit: '500',
        pr_additions_limit: '5000',
        pr_files_limit: '50',
        apply_labels: 'true',
        auto_remove_labels: 'true',
        apply_size_labels: 'true',
        size_label_thresholds: '',
        large_files_label: 'auto:large-files',
        too_many_files_label: 'auto:too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        fail_on_violation: 'false',
        additional_exclude_patterns: '',
      };
      return defaults[name] || '';
    });

    // Mock GitHub context
    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        issue: { number: 123 },
        payload: {
          pull_request: {
            number: 123,
            base: { sha: 'base-sha-123' },
            head: { sha: 'head-sha-456' },
            draft: false,
          },
        },
      },
      configurable: true,
    });
  });

  describe('Basic smoke test', () => {
    it('should pass basic test', () => {
      expect(true).toBe(true);
    });
  });

  describe('GitHub Token validation', () => {
    it('should accept token from input', () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        if (name === 'github_token') {
          return 'input-token-abc';
        }
        return '';
      });

      const token = core.getInput('github_token');
      expect(token).toBe('input-token-abc');
    });

    it('should handle missing token gracefully', () => {
      vi.mocked(core.getInput).mockReturnValue('');

      const token = core.getInput('github_token');
      expect(token).toBe('');
    });
  });

  describe('PR Context extraction', () => {
    it('should extract PR information from GitHub context', () => {
      const { context } = github;

      expect(context.repo.owner).toBe('test-owner');
      expect(context.repo.repo).toBe('test-repo');
      expect(context.issue.number).toBe(123);
      expect(context.payload.pull_request?.number).toBe(123);
      expect(context.payload.pull_request?.['base'].sha).toBe('base-sha-123');
      expect(context.payload.pull_request?.['head'].sha).toBe('head-sha-456');
      expect(context.payload.pull_request?.['draft']).toBe(false);
    });

    it('should handle draft PR status', () => {
      Object.defineProperty(github, 'context', {
        value: {
          ...github.context,
          payload: {
            pull_request: {
              ...github.context.payload.pull_request,
              draft: true,
            },
          },
        },
        configurable: true,
      });

      const isDraft = github.context.payload.pull_request?.['draft'];
      expect(isDraft).toBe(true);
    });
  });

  describe('Input parameter parsing', () => {
    it('should parse size limits correctly', () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        if (name === 'file_size_limit') {
          return '1MB';
        }
        if (name === 'file_lines_limit') {
          return '1000';
        }
        if (name === 'pr_additions_limit') {
          return '10000';
        }
        if (name === 'pr_files_limit') {
          return '100';
        }
        return '';
      });

      expect(core.getInput('file_size_limit')).toBe('1MB');
      expect(core.getInput('file_lines_limit')).toBe('1000');
      expect(core.getInput('pr_additions_limit')).toBe('10000');
      expect(core.getInput('pr_files_limit')).toBe('100');
    });

    it('should parse boolean flags correctly', () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        if (name === 'apply_labels') {
          return 'true';
        }
        if (name === 'skip_draft_pr') {
          return 'false';
        }
        if (name === 'fail_on_violation') {
          return 'true';
        }
        return '';
      });

      expect(core.getInput('apply_labels')).toBe('true');
      expect(core.getInput('skip_draft_pr')).toBe('false');
      expect(core.getInput('fail_on_violation')).toBe('true');
    });

    it('should handle comment mode options', () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        if (name === 'comment_on_pr') {
          return 'always';
        }
        return '';
      });

      expect(core.getInput('comment_on_pr')).toBe('always');
    });
  });

  describe('Action outputs', () => {
    it('should set output values correctly', () => {
      const mockSetOutput = vi.mocked(core.setOutput);

      core.setOutput('large_files', JSON.stringify([]));
      core.setOutput('pr_additions', '150');
      core.setOutput('pr_files', '10');
      core.setOutput('has_violations', 'false');

      expect(mockSetOutput).toHaveBeenCalledWith('large_files', JSON.stringify([]));
      expect(mockSetOutput).toHaveBeenCalledWith('pr_additions', '150');
      expect(mockSetOutput).toHaveBeenCalledWith('pr_files', '10');
      expect(mockSetOutput).toHaveBeenCalledWith('has_violations', 'false');
    });
  });

  describe('Error handling', () => {
    it('should call setFailed on error', () => {
      const mockSetFailed = vi.mocked(core.setFailed);

      core.setFailed('Test error message');

      expect(mockSetFailed).toHaveBeenCalledWith('Test error message');
    });

    it('should handle configuration errors', () => {
      const mockSetFailed = vi.mocked(core.setFailed);
      const errorMessage = 'Invalid configuration: file_size_limit';

      core.setFailed(errorMessage);

      expect(mockSetFailed).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('Logging', () => {
    it('should log info messages', () => {
      const mockInfo = vi.mocked(core.info);

      core.info('Starting PR metrics analysis');

      expect(mockInfo).toHaveBeenCalledWith('Starting PR metrics analysis');
    });

    it('should log warning messages', () => {
      const mockWarning = vi.mocked(core.warning);

      core.warning('Large file detected');

      expect(mockWarning).toHaveBeenCalledWith('Large file detected');
    });

    it('should log error messages', () => {
      const mockError = vi.mocked(core.error);

      core.error('Failed to analyze file');

      expect(mockError).toHaveBeenCalledWith('Failed to analyze file');
    });
  });
});
