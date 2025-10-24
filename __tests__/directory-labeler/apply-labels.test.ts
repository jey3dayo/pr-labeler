import { describe, expect, it, vi } from 'vitest';

import { applyDirectoryLabels, type ApplyResult } from '../../src/directory-labeler/label-applicator';
import { createGitHubAPIError, createPermissionError, createRateLimitError } from '../../src/errors/index.js';

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const baseContext = {
  repo: { owner: 'owner', repo: 'repo' },
  issue: { number: 1 },
};

const baseNamespaces = {
  exclusive: ['area'],
  additive: ['scope'],
};

const createOctokit = () => ({
  rest: {
    issues: {
      listLabelsOnIssue: vi.fn(),
      removeLabel: vi.fn(),
      addLabels: vi.fn(),
      createLabel: vi.fn(),
    },
  },
});

describe('directory-labeler/applyDirectoryLabels', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok when there are no decisions', async () => {
    const octokit = createOctokit();

    const result = await applyDirectoryLabels(octokit as any, baseContext, [], baseNamespaces);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const value: ApplyResult = result.value;
      expect(value.applied).toHaveLength(0);
      expect(value.skipped).toHaveLength(0);
    }
  });

  it('converts permission errors from listing labels', async () => {
    const octokit = createOctokit();
    const error = new Error('forbidden') as Error & { status?: number };
    error.status = 403;
    octokit.rest.issues.listLabelsOnIssue.mockRejectedValue(error);

    const result = await applyDirectoryLabels(
      octokit as any,
      baseContext,
      [{ label: 'area:ui', reason: '' }],
      baseNamespaces,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe(createPermissionError('issues: read', '').type);
    }
  });

  it('converts rate limit errors when listing labels', async () => {
    const octokit = createOctokit();
    const rateError = { response: { headers: { 'retry-after': '30' } }, status: 429 };
    octokit.rest.issues.listLabelsOnIssue.mockRejectedValue(rateError);

    const result = await applyDirectoryLabels(
      octokit as any,
      baseContext,
      [{ label: 'area:ui', reason: '' }],
      baseNamespaces,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe(createRateLimitError(30).type);
    }
  });

  it('converts other API errors when listing labels', async () => {
    const octokit = createOctokit();
    const apiError = new Error('boom') as Error & { status?: number };
    apiError.status = 500;
    octokit.rest.issues.listLabelsOnIssue.mockRejectedValue(apiError);

    const result = await applyDirectoryLabels(
      octokit as any,
      baseContext,
      [{ label: 'area:ui', reason: '' }],
      baseNamespaces,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe(createGitHubAPIError('', undefined).type);
    }
  });

  it('removes conflicting labels and records failures', async () => {
    const octokit = createOctokit();
    octokit.rest.issues.listLabelsOnIssue.mockResolvedValue({ data: [{ name: 'area:backend' }] });
    const removalError = new Error('cannot remove');
    octokit.rest.issues.removeLabel.mockRejectedValue(removalError);
    octokit.rest.issues.addLabels.mockResolvedValue({});

    const result = await applyDirectoryLabels(
      octokit as any,
      baseContext,
      [{ label: 'area:frontend', reason: '' }],
      baseNamespaces,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.failed).toHaveLength(1);
      expect(result.value.failed[0].label).toBe('area:backend');
      expect(result.value.applied).toContain('area:frontend');
    }
  });

  it('creates missing labels when addLabels returns 422', async () => {
    const octokit = createOctokit();
    octokit.rest.issues.listLabelsOnIssue.mockResolvedValue({ data: [] });

    octokit.rest.issues.addLabels
      .mockImplementationOnce(() => {
        const err = new Error('missing') as Error & { status?: number };
        err.status = 422;
        throw err;
      })
      .mockImplementationOnce(() => {
        const err = new Error('still missing') as Error & { status?: number };
        err.status = 422;
        throw err;
      })
      .mockResolvedValue({});

    octokit.rest.issues.createLabel.mockResolvedValue({});

    const result = await applyDirectoryLabels(
      octokit as any,
      baseContext,
      [{ label: 'scope/api', reason: '' }],
      baseNamespaces,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.applied).toContain('scope/api');
    }
  });

  it('records failures when label creation fails', async () => {
    const octokit = createOctokit();
    octokit.rest.issues.listLabelsOnIssue.mockResolvedValue({ data: [] });

    octokit.rest.issues.addLabels
      .mockImplementationOnce(() => {
        const err = new Error('missing') as Error & { status?: number };
        err.status = 422;
        throw err;
      })
      .mockImplementationOnce(() => {
        const err = new Error('still missing') as Error & { status?: number };
        err.status = 422;
        throw err;
      })
      .mockResolvedValue({});

    const createFailure = new Error('create failed') as Error & { status?: number };
    createFailure.status = 500;
    octokit.rest.issues.createLabel.mockRejectedValue(createFailure);

    const result = await applyDirectoryLabels(
      octokit as any,
      baseContext,
      [{ label: 'scope/api', reason: '' }],
      baseNamespaces,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.failed).toHaveLength(1);
      expect(result.value.failed[0].label).toBe('scope/api');
      expect(result.value.failed[0].reason).toContain('Failed to create');
    }
  });
});
