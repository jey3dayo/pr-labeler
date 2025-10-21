import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Violations } from '../src/errors';
import type { AnalysisResult, FileMetrics } from '../src/file-metrics';
import type { ComplexityConfig, ComplexityMetrics } from '../src/labeler-types';
import type { SummaryContext } from '../src/report-formatter';
import {
  escapeMarkdown,
  formatBasicMetrics,
  formatBytes,
  formatFileDetails,
  formatNumber,
  formatViolations,
  generateComplexitySummary,
} from '../src/report-formatter';

describe('ReportFormatter', () => {
  beforeEach(() => {
    // Mock Date for consistent timestamp
    vi.setSystemTime(new Date('2025-10-18T15:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes (< 1KB)', () => {
      expect(formatBytes(512)).toBe('512.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(5120)).toBe('5.00 KB');
      expect(formatBytes(50000)).toBe('48.83 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(2000000)).toBe('1.91 MB');
      expect(formatBytes(1000000)).toBe('976.56 KB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1.00 GB');
      expect(formatBytes(5368709120)).toBe('5.00 GB');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers without separators', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(99)).toBe('99');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(2000)).toBe('2,000');
      expect(formatNumber(10000)).toBe('10,000');
    });

    it('should format large numbers with multiple separators', () => {
      expect(formatNumber(100000)).toBe('100,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });
  });

  describe('formatBasicMetrics', () => {
    it('should format basic metrics with header', () => {
      const metrics: AnalysisResult['metrics'] = {
        totalFiles: 10,
        totalAdditions: 500,
        filesAnalyzed: [{} as any, {} as any, {} as any],
        filesExcluded: ['package-lock.json'],
        filesSkippedBinary: ['image.png'],
        filesWithErrors: [],
      };

      const result = formatBasicMetrics(metrics, { includeHeader: true });

      expect(result).toContain('### 📊 Summary');
      expect(result).toContain('Total additions: **500**');
      expect(result).toContain('Files analyzed: **3**');
      expect(result).toContain('2025-10-18T15:30:00');
    });

    it('should format basic metrics without header', () => {
      const metrics: AnalysisResult['metrics'] = {
        totalFiles: 5,
        totalAdditions: 200,
        filesAnalyzed: [{} as any],
        filesExcluded: [],
        filesSkippedBinary: [],
        filesWithErrors: [],
      };

      const result = formatBasicMetrics(metrics, { includeHeader: false });

      expect(result).not.toContain('### 📊 Summary');
      expect(result).toContain('Total additions: **200**');
      expect(result).toContain('Files analyzed: **1**');
    });

    it('should handle zero files', () => {
      const metrics: AnalysisResult['metrics'] = {
        totalFiles: 0,
        totalAdditions: 0,
        filesAnalyzed: [],
        filesExcluded: [],
        filesSkippedBinary: [],
        filesWithErrors: [],
      };

      const result = formatBasicMetrics(metrics);

      expect(result).toContain('**No files to analyze**');
    });

    it('should show excluded and skipped files', () => {
      const metrics: AnalysisResult['metrics'] = {
        totalFiles: 10,
        totalAdditions: 300,
        filesAnalyzed: [{} as any, {} as any],
        filesExcluded: ['lock1', 'lock2', 'lock3'],
        filesSkippedBinary: ['img1.png', 'img2.jpg'],
        filesWithErrors: [],
      };

      const result = formatBasicMetrics(metrics);

      expect(result).toContain('Files excluded: **3**');
      expect(result).toContain('Binary files skipped: **2**');
    });

    it('should show files with errors when present', () => {
      const metrics: AnalysisResult['metrics'] = {
        totalFiles: 5,
        totalAdditions: 100,
        filesAnalyzed: [{} as any],
        filesExcluded: [],
        filesSkippedBinary: [],
        filesWithErrors: ['error1.ts', 'error2.ts'],
      };

      const result = formatBasicMetrics(metrics);

      expect(result).toContain('Files with errors: **2** ⚠️');
    });
  });

  describe('formatViolations', () => {
    it('should format no violations with success message', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const result = formatViolations(violations, { includeHeader: true });

      expect(result).toContain('**All files are within size limits** ✅');
      expect(result).not.toContain('### 📊 Size Summary');
    });

    it('should format large file violations', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'src/large.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
          {
            file: 'src/big.ts',
            actualValue: 1500000,
            limit: 1000000,
            violationType: 'size',
            severity: 'warning',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const result = formatViolations(violations);

      expect(result).toContain('### 📊 Size Summary');
      expect(result).toContain('**2** file(s) exceed size limit');
      expect(result).toContain('### 🚫 Large Files Detected');
      expect(result).toContain('| File | Size | Limit | Status |');
      expect(result).toContain('src/large.ts');
      expect(result).toContain('1.91 MB');
      expect(result).toContain('976.56 KB');
      expect(result).toContain('🚫 Critical');
      expect(result).toContain('src/big.ts');
      expect(result).toContain('⚠️ Warning');
    });

    it('should format file lines violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'src/long.ts',
            actualValue: 2000,
            limit: 1000,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const result = formatViolations(violations);

      expect(result).toContain('### 📊 Size Summary');
      expect(result).toContain('**1** file(s) exceed line limit');
      expect(result).toContain('### ⚠️ Files Exceed Line Limit');
      expect(result).toContain('| File | Lines | Limit | Status |');
      expect(result).toContain('src/long.ts');
      expect(result).toContain('2,000');
      expect(result).toContain('1,000');
    });

    it('should format PR additions violation', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: true,
        exceedsFileCount: false,
      };

      const result = formatViolations(violations);

      expect(result).toContain('### 📊 Size Summary');
      expect(result).toContain('**Total additions exceed limit**');
    });

    it('should format file count violation', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: true,
      };

      const result = formatViolations(violations);

      expect(result).toContain('### 📊 Size Summary');
      expect(result).toContain('**File count exceeds limit**');
    });

    it('should format all violations combined', () => {
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
        exceedsFileLines: [
          {
            file: 'long.ts',
            actualValue: 1500,
            limit: 1000,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: true,
        exceedsFileCount: true,
      };

      const result = formatViolations(violations);

      expect(result).toContain('### 📊 Size Summary');
      expect(result).toContain('**1** file(s) exceed size limit');
      expect(result).toContain('**1** file(s) exceed line limit');
      expect(result).toContain('**Total additions exceed limit**');
      expect(result).toContain('**File count exceeds limit**');
      expect(result).toContain('### 🚫 Large Files Detected');
      expect(result).toContain('### ⚠️ Files Exceed Line Limit');
    });

    it('should format without header when specified', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: true,
        exceedsFileCount: false,
      };

      const result = formatViolations(violations, { includeHeader: false });

      expect(result).not.toContain('### 📊 Size Summary');
      expect(result).toContain('Total additions exceed limit');
    });
  });

  describe('formatFileDetails', () => {
    it('should format file details table', () => {
      const files: FileMetrics[] = [
        {
          path: 'src/file1.ts',
          size: 50000,
          lines: 500,
          additions: 100,
          deletions: 20,
        },
        {
          path: 'src/file2.ts',
          size: 30000,
          lines: 300,
          additions: 50,
          deletions: 10,
        },
      ];

      const result = formatFileDetails(files);

      expect(result).toContain('### 📈 Top Large Files');
      expect(result).toContain('| File | Size | Lines | Changes |');
      expect(result).toContain('src/file1.ts');
      expect(result).toContain('48.83 KB');
      expect(result).toContain('500');
      expect(result).toContain('+100/-20');
      expect(result).toContain('src/file2.ts');
    });

    it('should limit files when limit specified', () => {
      const files: FileMetrics[] = Array.from({ length: 15 }, (_, i) => ({
        path: `file${i}.ts`,
        size: 10000,
        lines: 100,
        additions: 10,
        deletions: 5,
      }));

      const result = formatFileDetails(files, 5);

      expect(result).toContain('file0.ts');
      expect(result).toContain('file4.ts');
      expect(result).not.toContain('file5.ts');
      expect(result).not.toContain('file10.ts');
    });

    it('should handle empty file list', () => {
      const result = formatFileDetails([]);

      expect(result).toBe('');
    });

    it('should sort files by size descending', () => {
      const files: FileMetrics[] = [
        { path: 'small.ts', size: 1000, lines: 10, additions: 5, deletions: 0 },
        { path: 'large.ts', size: 100000, lines: 1000, additions: 500, deletions: 100 },
        { path: 'medium.ts', size: 50000, lines: 500, additions: 100, deletions: 20 },
      ];

      const result = formatFileDetails(files);
      const lines = result.split('\n');
      const fileLines = lines.filter(line => line.includes('.ts'));

      // First file should be the largest
      expect(fileLines[0]).toContain('large.ts');
      expect(fileLines[1]).toContain('medium.ts');
      expect(fileLines[2]).toContain('small.ts');
    });
  });

  describe('escapeMarkdown', () => {
    it('should escape special markdown characters', () => {
      expect(escapeMarkdown('test_file.ts')).toBe('test\\_file.ts');
      expect(escapeMarkdown('test*file.ts')).toBe('test\\*file.ts');
      expect(escapeMarkdown('test[file].ts')).toBe('test\\[file\\].ts');
      expect(escapeMarkdown('test`file.ts')).toBe('test\\`file.ts');
    });

    it('should handle multiple special characters', () => {
      expect(escapeMarkdown('test_*[file].ts')).toBe('test\\_\\*\\[file\\].ts');
    });

    it('should not escape normal text', () => {
      expect(escapeMarkdown('normalfile.ts')).toBe('normalfile.ts');
    });

    it('should handle empty string', () => {
      expect(escapeMarkdown('')).toBe('');
    });
  });

  describe('generateComplexitySummary', () => {
    const baseContext: SummaryContext = {
      owner: 'test-owner',
      repo: 'test-repo',
      sha: 'abc123',
    };

    const baseConfig: ComplexityConfig = {
      enabled: true,
      thresholds: { medium: 10, high: 20 },
      exclude: [],
    };

    it('should generate summary with high complexity files', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 25,
        avgComplexity: 15.5,
        analyzedFiles: 5,
        files: [
          {
            path: 'src/complex1.ts',
            complexity: 25,
            functions: [
              { name: 'complexFunc1', complexity: 15, loc: { start: 10, end: 50 } },
              { name: 'complexFunc2', complexity: 10, loc: { start: 60, end: 80 } },
            ],
          },
          {
            path: 'src/complex2.ts',
            complexity: 18,
            functions: [{ name: 'func1', complexity: 18, loc: { start: 5, end: 30 } }],
          },
        ],
        skippedFiles: [],
        syntaxErrorFiles: [],
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('## 📊 コード複雑度分析');
      expect(result).toContain('最大複雑度');
      expect(result).toContain('25');
      expect(result).toContain('平均複雑度');
      expect(result).toContain('15.5');
      expect(result).toContain('高複雑度ファイル（上位10件）');
      expect(result).toContain('src/complex1.ts');
      expect(result).toContain('src/complex2.ts');
    });

    it('should display function details for high complexity files', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 30,
        avgComplexity: 20,
        analyzedFiles: 1,
        files: [
          {
            path: 'src/multi-function.ts',
            complexity: 30,
            functions: [
              { name: 'func1', complexity: 15, loc: { start: 10, end: 50 } },
              { name: 'func2', complexity: 10, loc: { start: 60, end: 80 } },
              { name: 'func3', complexity: 8, loc: { start: 90, end: 110 } },
              { name: 'func4', complexity: 6, loc: { start: 120, end: 140 } },
              { name: 'func5', complexity: 4, loc: { start: 150, end: 160 } },
              { name: 'func6', complexity: 2, loc: { start: 170, end: 180 } },
              { name: 'func7', complexity: 1, loc: { start: 190, end: 195 } },
            ],
          },
        ],
        skippedFiles: [],
        syntaxErrorFiles: [],
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('関数別複雑度（上位5件）');
      expect(result).toContain('func1');
      expect(result).toContain('func2');
      expect(result).toContain('func3');
      expect(result).toContain('func4');
      expect(result).toContain('func5');
      expect(result).toContain('+2個の関数（表示省略）');
    });

    it('should show remaining files message when more than 10 high complexity files', () => {
      const files = Array.from({ length: 15 }, (_, i) => ({
        path: `src/file${i + 1}.ts`,
        complexity: 15 + i,
        functions: [],
      }));

      const metrics: ComplexityMetrics = {
        maxComplexity: 29,
        avgComplexity: 20,
        analyzedFiles: 15,
        files,
        skippedFiles: [],
        syntaxErrorFiles: [],
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('+5件のファイルが複雑度閾値を超過（表示省略）');
    });

    it('should show all files below threshold message when no high complexity files', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 5,
        avgComplexity: 3,
        analyzedFiles: 10,
        files: [
          { path: 'src/simple1.ts', complexity: 5, functions: [] },
          { path: 'src/simple2.ts', complexity: 3, functions: [] },
        ],
        skippedFiles: [],
        syntaxErrorFiles: [],
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('✅ すべてのファイルが複雑度閾値以下です');
      expect(result).toContain('medium閾値: 10未満');
    });

    it('should display skipped files warning with various reasons', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 10,
        avgComplexity: 5,
        analyzedFiles: 5,
        files: [],
        skippedFiles: [
          { path: 'large-file.ts', reason: 'too_large' },
          { path: 'binary-file.bin', reason: 'binary' },
          { path: 'error-file.ts', reason: 'analysis_failed', details: 'Parse error' },
          { path: 'timeout-file.ts', reason: 'timeout' },
        ],
        syntaxErrorFiles: [],
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('⚠️ スキップされたファイル');
      expect(result).toContain('large-file.ts');
      expect(result).toContain('ファイルサイズ超過（1MB以上）');
      expect(result).toContain('binary-file.bin');
      expect(result).toContain('バイナリファイル');
      expect(result).toContain('error-file.ts');
      expect(result).toContain('Parse error');
      expect(result).toContain('timeout-file.ts');
      expect(result).toContain('タイムアウト');
    });

    it('should display syntax error files warning', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 10,
        avgComplexity: 5,
        analyzedFiles: 5,
        files: [],
        skippedFiles: [],
        syntaxErrorFiles: ['src/error1.ts', 'src/error2.ts'],
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('⚠️ 構文エラーファイル');
      expect(result).toContain('複雑度0として集計対象に含まれています');
      expect(result).toContain('src/error1.ts');
      expect(result).toContain('src/error2.ts');
      expect(result).toContain('構文エラーは開発者の修正対象');
    });

    it('should display PR file truncation warning', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 10,
        avgComplexity: 5,
        analyzedFiles: 3000,
        files: [],
        skippedFiles: [],
        syntaxErrorFiles: [],
        truncated: true,
        totalPRFiles: 3500,
        hasTsconfig: true,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('⚠️ PRファイル数制限');
      expect(result).toContain('PR全体のファイル数: 3,500');
      expect(result).toContain('分析対象ファイル数: 3,000');
      expect(result).toContain('未分析ファイル数: 500');
      expect(result).toContain('GitHub APIの3000ファイル制限');
    });

    it('should display tsconfig not found warning', () => {
      const metrics: ComplexityMetrics = {
        maxComplexity: 10,
        avgComplexity: 5,
        analyzedFiles: 5,
        files: [],
        skippedFiles: [],
        syntaxErrorFiles: [],
        hasTsconfig: false,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      expect(result).toContain('⚠️ tsconfig.json未検出');
      expect(result).toContain('既定の設定');
      expect(result).toContain("ecmaVersion: 'latest'");
    });

    it('should display all warnings in a complex scenario', () => {
      // Create files with the first one having highest complexity to ensure it's in top 10
      const files = Array.from({ length: 12 }, (_, i) => ({
        path: `src/complex${i + 1}.ts`,
        complexity: i === 0 ? 30 : 15 + i, // First file has highest complexity
        functions:
          i === 0
            ? Array.from({ length: 7 }, (_, j) => ({
                name: `func${j + 1}`,
                complexity: 10 - j,
                loc: { start: j * 10, end: j * 10 + 8 },
              }))
            : [],
      }));

      const metrics: ComplexityMetrics = {
        maxComplexity: 30,
        avgComplexity: 18,
        analyzedFiles: 3000,
        files,
        skippedFiles: [{ path: 'large.ts', reason: 'too_large' }],
        syntaxErrorFiles: ['error.ts'],
        truncated: true,
        totalPRFiles: 3500,
        hasTsconfig: false,
      };

      const result = generateComplexitySummary(metrics, baseConfig, baseContext);

      // All warnings should be present
      expect(result).toContain('高複雑度ファイル（上位10件）');
      expect(result).toContain('関数別複雑度（上位5件）');
      expect(result).toContain('+2件のファイルが複雑度閾値を超過');
      expect(result).toContain('⚠️ スキップされたファイル');
      expect(result).toContain('⚠️ 構文エラーファイル');
      expect(result).toContain('⚠️ PRファイル数制限');
      expect(result).toContain('⚠️ tsconfig.json未検出');
    });
  });
});
