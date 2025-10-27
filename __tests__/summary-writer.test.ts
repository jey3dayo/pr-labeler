import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComplexityConfig, ComplexityMetrics } from '../src/labeler-types.js';
import * as reportFormatter from '../src/report-formatter';
import { writeSummary, writeSummaryWithAnalysis } from '../src/summary/summary-writer';
import type { AnalysisResult } from '../src/types/analysis.js';

vi.mock('../src/actions-io', () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logWarning: vi.fn(),
}));

const { summaryMock } = vi.hoisted(() => {
  const summary = {
    addRaw: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
  };

  return { summaryMock: summary };
});

vi.mock('@actions/core', () => ({
  summary: summaryMock,
}));

describe('summary-writer', () => {
  const baseAnalysis: AnalysisResult = {
    metrics: {
      totalFiles: 2,
      totalAdditions: 150,
      excludedAdditions: 0,
      filesAnalyzed: [
        { path: 'src/a.ts', size: 1024, lines: 200, additions: 120, deletions: 10 },
        { path: 'src/b.ts', size: 512, lines: 80, additions: 30, deletions: 5 },
      ],
      filesExcluded: ['package-lock.json'],
      filesSkippedBinary: [],
      filesWithErrors: ['src/error.ts'],
    },
    violations: {
      largeFiles: [
        {
          file: 'src/a.ts',
          actualValue: 1024,
          limit: 512,
          violationType: 'size',
          severity: 'warning',
        },
      ],
      exceedsFileLines: [],
      exceedsAdditions: true,
      exceedsFileCount: false,
    },
  };

  const complexityMetrics: ComplexityMetrics = {
    maxComplexity: 25,
    avgComplexity: 12.4,
    analyzedFiles: 3,
    files: [
      {
        path: 'src/a.ts',
        complexity: 25,
        functions: [
          { name: 'f1', complexity: 12, loc: { start: 10, end: 30 } },
          { name: 'f2', complexity: 11, loc: { start: 40, end: 60 } },
        ],
      },
    ],
    skippedFiles: [],
    syntaxErrorFiles: [],
    truncated: false,
    hasTsconfig: true,
  };

  const complexityConfig: ComplexityConfig = {
    enabled: true,
    metric: 'cyclomatic',
    thresholds: { medium: 10, high: 20 },
    extensions: ['.ts'],
    exclude: [],
  };

  beforeEach(() => {
    summaryMock.addRaw.mockReset();
    summaryMock.write.mockReset();
    summaryMock.clear.mockReset?.();
    summaryMock.addRaw.mockImplementation((_content: string) => summaryMock);
    summaryMock.write.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('writeSummary should resolve when core summary succeeds', async () => {
    const result = await writeSummary('# content');
    expect(result.isOk()).toBe(true);
    expect(summaryMock.addRaw).toHaveBeenCalledWith('# content');
    expect(summaryMock.write).toHaveBeenCalled();
  });

  it('writeSummary should wrap errors from summary.write', async () => {
    const error = new Error('disk full');
    summaryMock.write.mockRejectedValue(error);

    const result = await writeSummary('body');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Failed to write GitHub Actions Summary');
      expect(result.error.message).toContain('disk full');
    }
  });

  it('writeSummaryWithAnalysis should include complexity and disabled labels', async () => {
    const summaryResult = await writeSummaryWithAnalysis(
      baseAnalysis,
      { enableSummary: true },
      { metrics: complexityMetrics, config: complexityConfig, context: { owner: 'org', repo: 'repo', sha: 'abc' } },
      { disabledFeatures: ['risk', 'category'], title: 'Custom Title' },
    );

    expect(summaryResult.isOk()).toBe(true);
    expect(summaryMock.addRaw).toHaveBeenCalledTimes(1);
    const markdown = summaryMock.addRaw.mock.calls[0][0] as string;
    expect(markdown).toContain('# 📊 Custom Title');
    expect(markdown).toContain('Disabled label types');
    expect(markdown).toContain('complexity.title');
    expect(summaryResult.isOk() && summaryResult.value.bytesWritten).toBeGreaterThan(0);
  });

  it('writeSummaryWithAnalysis should return error when markdown generation fails', async () => {
    const formatStub = vi.spyOn(reportFormatter, 'formatBasicMetrics').mockImplementation(() => {
      throw new Error('format failed');
    });

    const result = await writeSummaryWithAnalysis(baseAnalysis, { enableSummary: true });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Failed to generate GitHub Actions Summary content');
    }

    formatStub.mockRestore();
  });

  it('writeSummaryWithAnalysis should forward write errors', async () => {
    summaryMock.write.mockRejectedValue(new Error('write failed'));

    const result = await writeSummaryWithAnalysis(baseAnalysis, { enableSummary: true });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Failed to write GitHub Actions Summary');
    }
  });
});
