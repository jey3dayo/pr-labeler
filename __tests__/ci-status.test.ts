import { describe, expect, it, vi } from 'vitest';

import { allCIPassed, anyCIFailed, getCIStatus } from '../src/ci-status';

describe('ci-status utilities', () => {
  it('aggregates CI statuses from check runs', async () => {
    const checkRuns = [
      { name: 'Test Suite', conclusion: 'success' },
      { name: 'Type Check', conclusion: 'timed_out' },
      { name: 'Build Pipeline', conclusion: 'neutral' },
      { name: 'Lint', conclusion: null },
    ];

    const octokit = {
      paginate: vi.fn().mockResolvedValue(checkRuns),
      rest: { checks: { listForRef: vi.fn() } },
    } as any;

    const statusResult = await getCIStatus(octokit, 'owner', 'repo', 'sha');

    expect(statusResult.isOk()).toBe(true);
    expect(statusResult._unsafeUnwrap()).toEqual({
      tests: 'passed',
      typeCheck: 'failed',
      build: 'unknown',
      lint: 'pending',
    });
  });

  it('returns null when no check runs are available', async () => {
    const octokit = {
      paginate: vi.fn().mockResolvedValue([]),
      rest: { checks: { listForRef: vi.fn() } },
    } as any;

    const statusResult = await getCIStatus(octokit, 'owner', 'repo', 'sha');
    expect(statusResult.isOk()).toBe(true);
    expect(statusResult._unsafeUnwrap()).toBeNull();
  });

  it('returns error when API call fails', async () => {
    const octokit = {
      paginate: vi.fn().mockRejectedValue(new Error('network error')),
      rest: { checks: { listForRef: vi.fn() } },
    } as any;

    const statusResult = await getCIStatus(octokit, 'owner', 'repo', 'sha');
    expect(statusResult.isErr()).toBe(true);
    expect(statusResult._unsafeUnwrapErr().type).toBe('GitHubAPIError');
  });

  it('evaluates consolidated CI results', () => {
    const passed = {
      tests: 'passed' as const,
      typeCheck: 'passed' as const,
      build: 'passed' as const,
      lint: 'passed' as const,
    };

    expect(allCIPassed(passed)).toBe(true);
    expect(anyCIFailed(passed)).toBe(false);

    const failing = { ...passed, lint: 'failed' as const };
    expect(allCIPassed(failing)).toBe(false);
    expect(anyCIFailed(failing)).toBe(true);

    expect(allCIPassed(null)).toBe(false);
    expect(anyCIFailed(null)).toBe(false);
  });
});
