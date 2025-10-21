import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Setup mocks with factory functions - no external references
vi.mock('child_process');
vi.mock('util', () => {
  // Create the mock function inside the factory to avoid hoisting issues
  const mockFn = vi.fn();
  return {
    promisify: vi.fn(() => mockFn),
  };
});
vi.mock('@actions/github');
vi.mock('@actions/core');

// Import after mocking
import { promisify } from 'node:util';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { getDiffFiles } from '../src/diff-strategy';

describe('DiffStrategy', () => {
  let mockExecAsync: ReturnType<typeof vi.fn>;
  let mockListFiles: ReturnType<typeof vi.fn>;
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked execAsync function
    // promisify is already mocked to return the same function every time
    // @ts-expect-error - Mocking promisify to return a vi.fn
    mockExecAsync = promisify() as ReturnType<typeof vi.fn>;

    // Setup GitHub mock
    mockListFiles = vi.fn();
    mockOctokit = {
      rest: {
        pulls: {
          listFiles: mockListFiles,
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);

    // Setup core mocks
    vi.mocked(core.debug).mockImplementation(() => {});
    vi.mocked(core.info).mockImplementation(() => {});
    vi.mocked(core.warning).mockImplementation(() => {});
    vi.mocked(core.error).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDiffFiles', () => {
    const context = {
      owner: 'test-owner',
      repo: 'test-repo',
      pullNumber: 123,
      baseSha: 'base-sha',
      headSha: 'head-sha',
    };

    it('should use local git strategy when available', async () => {
      const gitOutput = `100\t0\tsrc/file1.ts
50\t10\tsrc/file2.ts
0\t0\tsrc/file3.md`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(3);
        expect(result.value.files[0]).toEqual({
          filename: 'src/file1.ts',
          additions: 100,
          deletions: 0,
          status: 'added',
        });
        expect(result.value.files[1]).toEqual({
          filename: 'src/file2.ts',
          additions: 50,
          deletions: 10,
          status: 'modified',
        });
        expect(result.value.files[2]).toEqual({
          filename: 'src/file3.md',
          additions: 0,
          deletions: 0,
          status: 'renamed',
        });
        expect(result.value.strategy).toBe('local-git');
      }
    });

    it('should fallback to GitHub API when local git fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      mockListFiles
        .mockResolvedValueOnce({
          data: [
            {
              filename: 'api/file1.ts',
              additions: 200,
              deletions: 50,
              status: 'modified',
            },
            {
              filename: 'api/file2.ts',
              additions: 100,
              deletions: 0,
              status: 'added',
            },
          ],
        })
        .mockResolvedValueOnce({ data: [] });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(2);
        expect(result.value.files[0]?.filename).toBe('api/file1.ts');
        expect(result.value.strategy).toBe('github-api');
      }
    });

    it('should handle pagination for GitHub API', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        filename: `file${i}.ts`,
        additions: 10,
        deletions: 5,
        status: 'modified' as const,
      }));

      const page2 = Array.from({ length: 50 }, (_, i) => ({
        filename: `file${i + 100}.ts`,
        additions: 20,
        deletions: 10,
        status: 'modified' as const,
      }));

      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      mockListFiles
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })
        .mockResolvedValueOnce({ data: [] });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(150);
        expect(mockListFiles).toHaveBeenCalledTimes(3);
      }
    });

    it('should filter out removed files', async () => {
      const gitOutput = `100\t0\tsrc/added.ts
50\t10\tsrc/modified.ts
0\t100\tsrc/removed.ts
10\t0\tsrc/renamed.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(3); // removed file should be filtered out
        const filenames = result.value.files.map(f => f.filename);
        expect(filenames).not.toContain('src/removed.ts');
      }
    });

    it('should return DiffError when both strategies fail', async () => {
      mockExecAsync.mockRejectedValue(new Error('Git command failed'));
      mockListFiles.mockRejectedValue(new Error('API error'));

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('DiffError');
        expect(result.error.message).toContain('Failed to get diff files');
      }
    });

    it('should handle empty diff', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(0);
        expect(result.value.strategy).toBe('local-git');
      }
    });

    it('should parse git diff with various statuses correctly', async () => {
      const gitOutput = `100\t0\tsrc/added.ts
0\t0\tsrc/renamed.ts
50\t20\tsrc/modified.ts
30\t30\tsrc/changed.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const files = result.value.files;
        expect(files[0]?.status).toBe('added'); // only additions
        expect(files[1]?.status).toBe('renamed'); // 0 additions, 0 deletions
        expect(files[2]?.status).toBe('modified'); // both additions and deletions
        expect(files[3]?.status).toBe('modified'); // equal additions and deletions
      }
    });

    it('should handle malformed git output gracefully', async () => {
      const gitOutput = `100\t0\tsrc/valid.ts
invalid line
50\tsrc/missing-field.ts
\t\t
100\t0\tsrc/another-valid.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should only parse valid lines
        expect(result.value.files).toHaveLength(2);
        expect(result.value.files[0]?.filename).toBe('src/valid.ts');
        expect(result.value.files[1]?.filename).toBe('src/another-valid.ts');
      }
    });

    it('should use correct git command with diff-filter', async () => {
      const gitOutput = '10\t0\tfile.ts';
      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      await getDiffFiles(context, 'test-token');

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git diff --numstat -M -C --diff-filter=ACMR'),
        expect.objectContaining({
          cwd: expect.any(String),
          maxBuffer: 16 * 1024 * 1024,
        }),
      );
    });

    it('should handle GitHub API with removed files', async () => {
      mockExecAsync.mockRejectedValue(new Error('Git not available'));

      mockListFiles
        .mockResolvedValueOnce({
          data: [
            {
              filename: 'file1.ts',
              additions: 100,
              deletions: 0,
              status: 'added',
            },
            {
              filename: 'file2.ts',
              additions: 0,
              deletions: 100,
              status: 'removed', // Should be filtered
            },
            {
              filename: 'file3.ts',
              additions: 50,
              deletions: 10,
              status: 'modified',
            },
          ],
        })
        .mockResolvedValueOnce({ data: [] });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(2);
        const filenames = result.value.files.map(f => f.filename);
        expect(filenames).not.toContain('file2.ts');
      }
    });
  });
});
