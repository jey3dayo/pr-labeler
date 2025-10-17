import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as github from '@actions/github';
import * as core from '@actions/core';

// Setup mocks
vi.mock('@actions/github');
vi.mock('@actions/core');

// Import after mocking
import {
  generateCommentBody,
  findExistingComment,
  postComment,
  updateComment,
  deleteComment,
  manageComment,
  CommentConfig,
  COMMENT_SIGNATURE,
} from '../src/comment-manager';
import type { AnalysisResult } from '../src/file-metrics';

describe('CommentManager', () => {
  let mockOctokit: any;
  let mockListComments: ReturnType<typeof vi.fn>;
  let mockCreateComment: ReturnType<typeof vi.fn>;
  let mockUpdateComment: ReturnType<typeof vi.fn>;
  let mockDeleteComment: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup GitHub mock
    mockListComments = vi.fn();
    mockCreateComment = vi.fn();
    mockUpdateComment = vi.fn();
    mockDeleteComment = vi.fn();

    mockOctokit = {
      rest: {
        issues: {
          listComments: mockListComments,
          createComment: mockCreateComment,
          updateComment: mockUpdateComment,
          deleteComment: mockDeleteComment,
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

  describe('generateCommentBody', () => {
    it('should generate success message when no violations', () => {
      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 100,
          filesAnalyzed: [],
          filesExcluded: ['package-lock.json'],
          filesSkippedBinary: ['image.png'],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const body = generateCommentBody(analysisResult);

      expect(body).toContain('✅ PR Size Check Passed');
      expect(body).toContain('All files are within size limits');
      expect(body).toContain('Total additions: **100**');
      expect(body).toContain('Files analyzed: **0**');
      expect(body).toContain('Files excluded: **1**');
      expect(body).toContain('Binary files skipped: **1**');
      expect(body).toContain(COMMENT_SIGNATURE);
    });

    it('should generate warning message with violations', () => {
      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 10,
          totalAdditions: 1500,
          filesAnalyzed: [
            {
              filename: 'src/large.ts',
              size: 2000000,
              lines: 2000,
              additions: 1000,
              deletions: 0,
            },
            {
              filename: 'src/normal.ts',
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
          largeFiles: [
            {
              file: 'src/large.ts',
              actualValue: 2000000,
              limit: 1000000,
              violationType: 'size',
              severity: 'critical',
            },
          ],
          exceedsFileLines: [
            {
              file: 'src/large.ts',
              actualValue: 2000,
              limit: 1000,
              violationType: 'lines',
              severity: 'warning',
            },
          ],
          exceedsAdditions: true,
          exceedsFileCount: false,
        },
      };

      const body = generateCommentBody(analysisResult);

      expect(body).toContain('⚠️ PR Size Check - Violations Found');
      expect(body).toContain('### 📊 Violations Summary');
      expect(body).toContain('Large files detected');
      expect(body).toContain('Files exceed line limit');
      expect(body).toContain('Total additions exceed limit');
      expect(body).toContain('| File | Size | Limit | Status |');
      expect(body).toContain('src/large.ts');
      expect(body).toContain('2.00 MB');
      expect(body).toContain('1.00 MB');
      expect(body).toContain('🚫 Critical');
      expect(body).toContain('| File | Lines | Limit | Status |');
      expect(body).toContain('2,000');
      expect(body).toContain('1,000');
      expect(body).toContain('⚠️ Warning');
      expect(body).toContain(COMMENT_SIGNATURE);
    });

    it('should include top large files table', () => {
      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 200,
          filesAnalyzed: [
            {
              filename: 'src/file1.ts',
              size: 50000,
              lines: 500,
              additions: 100,
              deletions: 20,
            },
            {
              filename: 'src/file2.ts',
              size: 30000,
              lines: 300,
              additions: 50,
              deletions: 10,
            },
            {
              filename: 'src/file3.ts',
              size: 20000,
              lines: 200,
              additions: 30,
              deletions: 5,
            },
            {
              filename: 'src/file4.ts',
              size: 10000,
              lines: 100,
              additions: 15,
              deletions: 2,
            },
            {
              filename: 'src/file5.ts',
              size: 5000,
              lines: 50,
              additions: 5,
              deletions: 1,
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

      const body = generateCommentBody(analysisResult);

      expect(body).toContain('### 📈 Top Large Files');
      expect(body).toContain('| File | Size | Lines | Changes |');
      expect(body).toContain('src/file1.ts');
      expect(body).toContain('48.83 KB');
      expect(body).toContain('500');
      expect(body).toContain('+100/-20');
    });

    it('should format bytes correctly', () => {
      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 1,
          totalAdditions: 10,
          filesAnalyzed: [
            {
              filename: 'small.ts',
              size: 512,
              lines: 10,
              additions: 10,
              deletions: 0,
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

      const body = generateCommentBody(analysisResult);
      expect(body).toContain('512 B'); // Should show bytes for small files
    });

    it('should handle empty analysis result', () => {
      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 0,
          totalAdditions: 0,
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

      const body = generateCommentBody(analysisResult);

      expect(body).toContain('✅ PR Size Check Passed');
      expect(body).toContain('No files to analyze');
    });

    it('should show files with errors if present', () => {
      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 3,
          totalAdditions: 50,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: ['src/error1.ts', 'src/error2.ts'],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const body = generateCommentBody(analysisResult);

      expect(body).toContain('Files with errors: **2**');
      expect(body).toContain('⚠️ Some files could not be analyzed');
    });
  });

  describe('findExistingComment', () => {
    it('should find comment with signature', async () => {
      mockListComments.mockResolvedValue({
        data: [
          { id: 1, body: 'Regular comment' },
          { id: 2, body: `Some content\n${COMMENT_SIGNATURE}` },
          { id: 3, body: 'Another comment' },
        ],
      });

      const result = await findExistingComment('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(2);
      }
    });

    it('should return null when no matching comment', async () => {
      mockListComments.mockResolvedValue({
        data: [
          { id: 1, body: 'Regular comment' },
          { id: 2, body: 'Another comment' },
        ],
      });

      const result = await findExistingComment('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle pagination', async () => {
      mockListComments
        .mockResolvedValueOnce({
          data: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            body: `Comment ${i + 1}`,
          })),
        })
        .mockResolvedValueOnce({
          data: [
            { id: 101, body: `Match\n${COMMENT_SIGNATURE}` },
            { id: 102, body: 'Last comment' },
          ],
        })
        .mockResolvedValueOnce({ data: [] });

      const result = await findExistingComment('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(101);
      }
      expect(mockListComments).toHaveBeenCalledTimes(2);
    });

    it('should return error on API failure', async () => {
      mockListComments.mockRejectedValue(new Error('API error'));

      const result = await findExistingComment('token', {
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

  describe('postComment', () => {
    it('should create new comment', async () => {
      mockCreateComment.mockResolvedValue({
        data: { id: 123, body: 'Test comment' },
      });

      const result = await postComment('Test comment', 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        body: 'Test comment',
      });
    });

    it('should return error on failure', async () => {
      mockCreateComment.mockRejectedValue(new Error('Permission denied'));

      const result = await postComment('Test', 'token', {
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

  describe('updateComment', () => {
    it('should update existing comment', async () => {
      mockUpdateComment.mockResolvedValue({
        data: { id: 123, body: 'Updated' },
      });

      const result = await updateComment(123, 'Updated', 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 123,
        body: 'Updated',
      });
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      mockDeleteComment.mockResolvedValue({});

      const result = await deleteComment(123, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockDeleteComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 123,
      });
    });
  });

  describe('manageComment', () => {
    it('should create comment when mode is always', async () => {
      const config: CommentConfig = {
        commentMode: 'always',
      };

      const analysisResult: AnalysisResult = {
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

      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      const result = await manageComment(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('created');
        expect(result.value.commentId).toBe(123);
      }
    });

    it('should update existing comment when mode is always', async () => {
      const config: CommentConfig = {
        commentMode: 'always',
      };

      const analysisResult: AnalysisResult = {
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

      mockListComments.mockResolvedValue({
        data: [{ id: 456, body: `Old\n${COMMENT_SIGNATURE}` }],
      });
      mockUpdateComment.mockResolvedValue({ data: { id: 456 } });

      const result = await manageComment(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('updated');
        expect(result.value.commentId).toBe(456);
      }
    });

    it('should create comment only on violations when mode is auto', async () => {
      const config: CommentConfig = {
        commentMode: 'auto',
      };

      // With violations
      const withViolations: AnalysisResult = {
        metrics: {
          totalFiles: 1,
          totalAdditions: 1000,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: true,
          exceedsFileCount: false,
        },
      };

      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 789 } });

      let result = await manageComment(withViolations, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('created');
      }

      // Without violations - should delete existing comment
      const noViolations: AnalysisResult = {
        ...withViolations,
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      mockListComments.mockResolvedValue({
        data: [{ id: 789, body: `Old\n${COMMENT_SIGNATURE}` }],
      });
      mockDeleteComment.mockResolvedValue({});

      result = await manageComment(noViolations, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('deleted');
        expect(result.value.commentId).toBe(789);
      }
    });

    it('should never create comment when mode is never', async () => {
      const config: CommentConfig = {
        commentMode: 'never',
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 1,
          totalAdditions: 1000,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: true,
          exceedsFileCount: false,
        },
      };

      // Should delete existing comment if present
      mockListComments.mockResolvedValue({
        data: [{ id: 999, body: `Old\n${COMMENT_SIGNATURE}` }],
      });
      mockDeleteComment.mockResolvedValue({});

      const result = await manageComment(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('deleted');
      }
      expect(mockCreateComment).not.toHaveBeenCalled();
    });
  });
});