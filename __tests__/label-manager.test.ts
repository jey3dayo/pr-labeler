import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as github from '@actions/github';
import * as core from '@actions/core';

// Setup mocks
vi.mock('@actions/github');
vi.mock('@actions/core');

// Import after mocking
import {
  getSizeLabel,
  getDetailLabels,
  getCurrentLabels,
  addLabels,
  removeLabels,
  updateLabels,
  LabelConfig,
} from '../src/label-manager';
import type { AnalysisResult } from '../src/file-metrics';
import type { Violations } from '../src/errors';

describe('LabelManager', () => {
  let mockOctokit: any;
  let mockListLabels: ReturnType<typeof vi.fn>;
  let mockAddLabels: ReturnType<typeof vi.fn>;
  let mockRemoveLabel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup GitHub mock
    mockListLabels = vi.fn();
    mockAddLabels = vi.fn();
    mockRemoveLabel = vi.fn();

    mockOctokit = {
      rest: {
        issues: {
          listLabelsOnIssue: mockListLabels,
          addLabels: mockAddLabels,
          removeLabel: mockRemoveLabel,
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
    vi.mocked(core.info).mockImplementation(() => {});
    vi.mocked(core.warning).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSizeLabel', () => {
    const defaultThresholds = {
      small: 10,
      medium: 100,
      large: 500,
      xlarge: 1000,
    };

    it('should return size:S for small PRs', () => {
      expect(getSizeLabel(5, defaultThresholds)).toBe('size:S');
      expect(getSizeLabel(10, defaultThresholds)).toBe('size:S');
    });

    it('should return size:M for medium PRs', () => {
      expect(getSizeLabel(11, defaultThresholds)).toBe('size:M');
      expect(getSizeLabel(50, defaultThresholds)).toBe('size:M');
      expect(getSizeLabel(100, defaultThresholds)).toBe('size:M');
    });

    it('should return size:L for large PRs', () => {
      expect(getSizeLabel(101, defaultThresholds)).toBe('size:L');
      expect(getSizeLabel(300, defaultThresholds)).toBe('size:L');
      expect(getSizeLabel(500, defaultThresholds)).toBe('size:L');
    });

    it('should return size:XL for xlarge PRs', () => {
      expect(getSizeLabel(501, defaultThresholds)).toBe('size:XL');
      expect(getSizeLabel(1000, defaultThresholds)).toBe('size:XL');
    });

    it('should return size:XXL for huge PRs', () => {
      expect(getSizeLabel(1001, defaultThresholds)).toBe('size:XXL');
      expect(getSizeLabel(5000, defaultThresholds)).toBe('size:XXL');
    });

    it('should handle 0 additions', () => {
      expect(getSizeLabel(0, defaultThresholds)).toBe('size:S');
    });

    it('should handle custom thresholds', () => {
      const customThresholds = {
        small: 5,
        medium: 20,
        large: 50,
        xlarge: 100,
      };

      expect(getSizeLabel(4, customThresholds)).toBe('size:S');
      expect(getSizeLabel(10, customThresholds)).toBe('size:M');
      expect(getSizeLabel(30, customThresholds)).toBe('size:L');
      expect(getSizeLabel(80, customThresholds)).toBe('size:XL');
      expect(getSizeLabel(200, customThresholds)).toBe('size:XXL');
    });
  });

  describe('getDetailLabels', () => {
    it('should return empty array for no violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toEqual([]);
    });

    it('should return auto:large-files for large file violations', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'test.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toContain('auto:large-files');
    });

    it('should return auto:too-many-lines for line count violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'test.ts',
            actualValue: 2000,
            limit: 1000,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toContain('auto:too-many-lines');
    });

    it('should return auto:excessive-changes for addition violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: true,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toContain('auto:excessive-changes');
    });

    it('should return auto:too-many-files for file count violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: true,
      };

      expect(getDetailLabels(violations)).toContain('auto:too-many-files');
    });

    it('should return multiple labels for multiple violations', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'test1.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
        ],
        exceedsFileLines: [
          {
            file: 'test2.ts',
            actualValue: 2000,
            limit: 1000,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: true,
        exceedsFileCount: true,
      };

      const labels = getDetailLabels(violations);
      expect(labels).toContain('auto:large-files');
      expect(labels).toContain('auto:too-many-lines');
      expect(labels).toContain('auto:excessive-changes');
      expect(labels).toContain('auto:too-many-files');
      expect(labels).toHaveLength(4);
    });

    it('should not duplicate labels for multiple files with same violation type', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'test1.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
          {
            file: 'test2.ts',
            actualValue: 3000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const labels = getDetailLabels(violations);
      expect(labels).toContain('auto:large-files');
      expect(labels).toHaveLength(1);
    });
  });

  describe('getCurrentLabels', () => {
    it('should get current labels from PR', async () => {
      mockListLabels.mockResolvedValue({
        data: [{ name: 'bug' }, { name: 'feature' }, { name: 'size:M' }],
      });

      const result = await getCurrentLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(['bug', 'feature', 'size:M']);
      }
      expect(mockListLabels).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
      });
    });

    it('should handle empty label list', async () => {
      mockListLabels.mockResolvedValue({
        data: [],
      });

      const result = await getCurrentLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return GitHubAPIError on failure', async () => {
      mockListLabels.mockRejectedValue(new Error('API error'));

      const result = await getCurrentLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('GitHubAPIError');
      }
    });
  });

  describe('addLabels', () => {
    it('should add new labels to PR', async () => {
      mockAddLabels.mockResolvedValue({
        data: [{ name: 'size:L' }, { name: 'auto:large-files' }],
      });

      const result = await addLabels(['size:L', 'auto:large-files'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        labels: ['size:L', 'auto:large-files'],
      });
    });

    it('should handle empty label list (no-op)', async () => {
      const result = await addLabels([], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockAddLabels).not.toHaveBeenCalled();
    });

    it('should return GitHubAPIError on failure', async () => {
      mockAddLabels.mockRejectedValue(new Error('Permission denied'));

      const result = await addLabels(['size:L'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('GitHubAPIError');
        expect(result.error.message).toContain('Failed to add labels');
      }
    });
  });

  describe('removeLabels', () => {
    it('should remove labels from PR', async () => {
      mockRemoveLabel.mockResolvedValue({});

      const result = await removeLabels(['size:S', 'auto:old'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockRemoveLabel).toHaveBeenCalledTimes(2);
      expect(mockRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        name: 'size:S',
      });
      expect(mockRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        name: 'auto:old',
      });
    });

    it('should handle empty label list (no-op)', async () => {
      const result = await removeLabels([], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockRemoveLabel).not.toHaveBeenCalled();
    });

    it('should continue removing even if one fails', async () => {
      mockRemoveLabel
        .mockRejectedValueOnce(new Error('Label not found'))
        .mockResolvedValueOnce({});

      const result = await removeLabels(['nonexistent', 'size:M'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockRemoveLabel).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateLabels', () => {
    it('should update labels with size and violations', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 150,
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

      // Current labels on PR
      mockListLabels.mockResolvedValue({
        data: [{ name: 'bug' }, { name: 'size:S' }, { name: 'auto:old-violation' }],
      });

      // Adding new labels
      mockAddLabels.mockResolvedValue({
        data: [],
      });

      // Removing old labels
      mockRemoveLabel.mockResolvedValue({});

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toContain('size:L'); // 150 additions = Large
        expect(result.value.removed).toContain('size:S'); // Old size label
        expect(result.value.removed).toContain('auto:old-violation'); // Old auto label
        expect(result.value.current).toContain('bug'); // Preserved
        expect(result.value.current).toContain('size:L'); // New size
      }
    });

    it('should add violation labels', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 50,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [
            {
              file: 'test.ts',
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

      mockListLabels.mockResolvedValue({
        data: [],
      });

      mockAddLabels.mockResolvedValue({
        data: [],
      });

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toContain('size:M'); // 50 additions
        expect(result.value.added).toContain('auto:large-files');
        expect(result.value.added).toContain('auto:excessive-changes');
      }
    });

    it('should handle no changes needed', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 50,
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

      // Current labels already correct
      mockListLabels.mockResolvedValue({
        data: [{ name: 'size:M' }],
      });

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toHaveLength(0);
        expect(result.value.removed).toHaveLength(0);
        expect(result.value.current).toEqual(['size:M']);
      }
      expect(mockAddLabels).not.toHaveBeenCalled();
      expect(mockRemoveLabel).not.toHaveBeenCalled();
    });

    it('should remove all auto labels when no violations', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 2,
          totalAdditions: 5,
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

      mockListLabels.mockResolvedValue({
        data: [
          { name: 'size:L' },
          { name: 'auto:large-files' },
          { name: 'auto:excessive-changes' },
          { name: 'feature' },
        ],
      });

      mockAddLabels.mockResolvedValue({ data: [] });
      mockRemoveLabel.mockResolvedValue({});

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toContain('size:S'); // 5 additions = Small
        expect(result.value.removed).toContain('size:L');
        expect(result.value.removed).toContain('auto:large-files');
        expect(result.value.removed).toContain('auto:excessive-changes');
        expect(result.value.current).toContain('feature'); // Preserved
        expect(result.value.current).not.toContain('auto:large-files');
      }
    });
  });
});