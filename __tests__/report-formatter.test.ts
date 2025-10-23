import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Violations } from '../src/errors';
import type { AnalysisResult, FileMetrics } from '../src/file-metrics';
import { changeLanguage, initializeI18n, resetI18n } from '../src/i18n';
import type { ComplexityConfig, ComplexityMetrics } from '../src/labeler-types';
import type { SummaryContext } from '../src/report-formatter';
import {
  escapeMarkdown,
  formatBasicMetrics,
  formatBestPractices,
  formatBytes,
  formatFileAnalysis,
  formatFileDetails,
  formatImprovementActions,
  formatNumber,
  formatViolations,
  generateComplexitySummary,
} from '../src/report-formatter';

describe('ReportFormatter', () => {
  beforeEach(() => {
    // Mock Date for consistent timestamp
    vi.setSystemTime(new Date('2025-10-18T15:30:00Z'));

    // Initialize i18n with English for consistent test results
    resetI18n();
    initializeI18n('en');
    changeLanguage('en'); // 明示的に英語に変更
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes (< 1KB)', () => {
      expect(formatBytes(512)).toBe('512 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(5120)).toBe('5 KB');
      expect(formatBytes(50000)).toBe('48.8 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(2000000)).toBe('1.9 MB');
      expect(formatBytes(1000000)).toBe('976.6 KB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(5368709120)).toBe('5 GB');
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

      expect(result).toContain('### 📈 Basic Metrics');
      expect(result).toContain('Total Additions: **500**');
      expect(result).toContain('Total Files Changed: **3**');
      expect(result).toContain('2025-10-18 15:30:00 (UTC)');
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

      expect(result).not.toContain('### 📈 Basic Metrics');
      expect(result).toContain('Total Additions: **200**');
      expect(result).toContain('Total Files Changed: **1**');
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

      expect(result).toContain('**No files to display**');
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

      expect(result).toContain('Excluded Files: **3**');
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
      expect(result).not.toContain('Size Summary');
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
      expect(result).toContain('2 file(s) exceed size limit');
      // Detailed table removed - now shown in formatFileAnalysis
      expect(result).not.toContain('### 🚫 Large Files Detected');
      expect(result).not.toContain('| File Name | Size | Limit | Status |');
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
      expect(result).toContain('1 file(s) exceed line limit');
      // Detailed table removed - now shown in formatFileAnalysis
      expect(result).not.toContain('### ⚠️ Files Exceed Line Limit');
      expect(result).not.toContain('| File Name | Lines | Limit | Status |');
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
      expect(result).toContain('Total additions exceed limit');
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
      expect(result).toContain('File count exceeds limit');
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
      expect(result).toContain('1 file(s) exceed size limit');
      expect(result).toContain('1 file(s) exceed line limit');
      expect(result).toContain('Total additions exceed limit');
      expect(result).toContain('File count exceeds limit');
      // Detailed tables removed - now shown in formatFileAnalysis
      expect(result).not.toContain('### 🚫 Large Files Detected');
      expect(result).not.toContain('### ⚠️ Files Exceed Line Limit');
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

      expect(result).toContain('### 📈 Largest Files');
      expect(result).toContain('| File Name | Size | Lines | Changes |');
      expect(result).toContain('src/file1.ts');
      expect(result).toContain('48.8 KB');
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

      expect(result).toContain('## 📊 Code Complexity Analysis');
      expect(result).toContain('Maximum Complexity');
      expect(result).toContain('25');
      expect(result).toContain('Average Complexity');
      expect(result).toContain('15.5');
      expect(result).toContain('High Complexity Files (Top 10)');
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

      expect(result).toContain('Function Complexity (Top 5)');
      expect(result).toContain('func1');
      expect(result).toContain('func2');
      expect(result).toContain('func3');
      expect(result).toContain('func4');
      expect(result).toContain('func5');
      expect(result).toContain('+2 more functions (not shown)');
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

      expect(result).toContain('+5 more files exceed complexity threshold (not shown)');
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

      expect(result).toContain('✅ All files are below complexity threshold');
      expect(result).toContain('medium threshold: 10');
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

      expect(result).toContain('⚠️ Skipped Files');
      expect(result).toContain('large-file.ts');
      expect(result).toContain('File size exceeded (1MB or more)');
      expect(result).toContain('binary-file.bin');
      expect(result).toContain('Binary file');
      expect(result).toContain('error-file.ts');
      expect(result).toContain('Parse error');
      expect(result).toContain('timeout-file.ts');
      expect(result).toContain('Timeout');
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

      expect(result).toContain('⚠️ Syntax Error Files');
      expect(result).toContain('counted with complexity 0 in the metrics');
      expect(result).toContain('src/error1.ts');
      expect(result).toContain('src/error2.ts');
      expect(result).toContain('Syntax errors should be fixed by developers');
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

      expect(result).toContain('⚠️ PR File Count Limitation');
      expect(result).toContain('Total PR Files: 3,500');
      expect(result).toContain('Analyzed Files: 3,000');
      expect(result).toContain('Unanalyzed Files: 500');
      expect(result).toContain("GitHub API's 3000 file limit");
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

      expect(result).toContain('⚠️ tsconfig.json Not Found');
      expect(result).toContain('using default settings');
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
      expect(result).toContain('High Complexity Files (Top 10)');
      expect(result).toContain('Function Complexity (Top 5)');
      expect(result).toContain('+2 more files exceed complexity threshold');
      expect(result).toContain('⚠️ Skipped Files');
      expect(result).toContain('⚠️ Syntax Error Files');
      expect(result).toContain('⚠️ PR File Count Limitation');
      expect(result).toContain('⚠️ tsconfig.json Not Found');
    });
  });

  describe('formatImprovementActions', () => {
    it('should return empty string when no violations exist', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const result = formatImprovementActions(violations);

      expect(result).toBe('');
    });

    it('should return improvement actions when violations exist', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'large-file.ts',
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

      const result = formatImprovementActions(violations);

      expect(result).toContain('### 💡 Improvement Actions');
      expect(result).toContain('Here are some ways to reduce your PR size');
    });

    it('should include all improvement sections', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'long-file.ts',
            actualValue: 1000,
            limit: 500,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const result = formatImprovementActions(violations);

      expect(result).toContain('#### 📦 PR Splitting Strategies');
      expect(result).toContain('Split by feature');
      expect(result).toContain('Split by file groups');
      expect(result).toContain('Separate refactoring and new features');

      expect(result).toContain('#### 🔨 Large File Refactoring');
      expect(result).toContain('Split functions or classes into multiple files');
      expect(result).toContain('Extract common logic into separate modules');
      expect(result).toContain('Organize files by layer');

      expect(result).toContain('#### 📄 Handling Generated/Lock Files');
      expect(result).toContain('Exclude lock files');
      expect(result).toContain('Manage build artifacts');
      expect(result).toContain('auto-generated code in separate PRs');
    });

    it('should return improvement actions when exceedsAdditions is true', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: true,
        exceedsFileCount: false,
      };

      const result = formatImprovementActions(violations);

      expect(result).not.toBe('');
      expect(result).toContain('### 💡 Improvement Actions');
    });

    it('should return improvement actions when exceedsFileCount is true', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: true,
      };

      const result = formatImprovementActions(violations);

      expect(result).not.toBe('');
      expect(result).toContain('### 💡 Improvement Actions');
    });
  });

  describe('formatBestPractices', () => {
    const createViolations = (overrides: Partial<Violations> = {}): Violations => ({
      largeFiles: [],
      exceedsFileLines: [],
      exceedsAdditions: false,
      exceedsFileCount: false,
      ...overrides,
    });

    it('should return an empty string when no violations are present', () => {
      const result = formatBestPractices(createViolations());

      expect(result).toBe('');
    });

    it('should include only PR size guidelines when total additions exceed limit', () => {
      const result = formatBestPractices(createViolations({ exceedsAdditions: true }));

      expect(result).toContain('#### Recommended PR Size');
      expect(result).toContain('✅ **Recommended: Under 400 lines**');
      expect(result).not.toContain('#### File Size Guidelines');
      expect(result).not.toContain('#### Review Efficiency Tips');
    });

    it('should include only file size guidelines when large files are detected', () => {
      const result = formatBestPractices(
        createViolations({
          largeFiles: [
            {
              file: 'big-file.ts',
              actualValue: 15000,
              limit: 10000,
              violationType: 'size',
              severity: 'warning',
            },
          ],
        }),
      );

      expect(result).toContain('#### File Size Guidelines');
      expect(result).not.toContain('#### Recommended PR Size');
      expect(result).not.toContain('#### Review Efficiency Tips');
    });

    it('should include file size guidelines when line count violations occur', () => {
      const result = formatBestPractices(
        createViolations({
          exceedsFileLines: [
            {
              file: 'long-file.ts',
              actualValue: 1200,
              limit: 500,
              violationType: 'lines',
              severity: 'warning',
            },
          ],
        }),
      );

      expect(result).toContain('#### File Size Guidelines');
      expect(result).not.toContain('#### Recommended PR Size');
      expect(result).not.toContain('#### Review Efficiency Tips');
    });

    it('should include review efficiency tips when file count exceeds limit', () => {
      const result = formatBestPractices(createViolations({ exceedsFileCount: true }));

      expect(result).toContain('#### Review Efficiency Tips');
      expect(result).not.toContain('#### Recommended PR Size');
      expect(result).not.toContain('#### File Size Guidelines');
    });

    it('should include all relevant sections when multiple violations exist', () => {
      const result = formatBestPractices(
        createViolations({
          exceedsAdditions: true,
          exceedsFileCount: true,
          largeFiles: [
            {
              file: 'big-file.ts',
              actualValue: 15000,
              limit: 10000,
              violationType: 'size',
              severity: 'warning',
            },
          ],
        }),
      );

      expect(result).toContain('#### Recommended PR Size');
      expect(result).toContain('#### File Size Guidelines');
      expect(result).toContain('#### Review Efficiency Tips');
    });

    it('should render content inside a collapsible details block', () => {
      const result = formatBestPractices(createViolations({ exceedsAdditions: true }));

      expect(result.startsWith('<details>')).toBe(true);
      expect(result).toContain('<summary>📚 Best Practices (Click to expand)</summary>');
      expect(result.trim().endsWith('</details>')).toBe(true);
    });
  });

  describe('Summary Output Snapshots (Multilingual)', () => {
    interface TestContext {
      analysisResult: AnalysisResult;
      hasViolations: boolean;
      prContext: { owner: string; repo: string; pullNumber: number };
      complexityMetrics: ComplexityMetrics;
      complexityConfig: ComplexityConfig;
      labels: string[];
      summaryContext: SummaryContext;
    }

    const createTestContext = (): TestContext => {
      const fileMetrics: FileMetrics = {
        path: 'src/example.ts',
        size: 51200, // 50 KB
        lines: 450,
        additions: 120,
        deletions: 30,
      };

      const violations: Violations = {
        largeFiles: [
          {
            file: 'src/example.ts',
            actualValue: 51200, // 50 KB
            limit: 10000, // 10 KB limit
            violationType: 'size',
            severity: 'warning',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 10,
          totalAdditions: 500,
          filesAnalyzed: [fileMetrics],
          filesExcluded: ['node_modules/package.json', 'dist/index.js'],
          filesSkippedBinary: ['icon.png', 'logo.svg'],
          filesWithErrors: [],
        },
        violations,
      };

      const complexityMetrics: ComplexityMetrics = {
        maxComplexity: 15,
        avgComplexity: 5.2,
        analyzedFiles: 15,
        files: [
          {
            path: 'src/complex.ts',
            complexity: 15,
            functions: [
              { name: 'processData', complexity: 15, loc: { start: 42, end: 58 } },
              { name: 'validateInput', complexity: 8, loc: { start: 120, end: 135 } },
            ],
          },
        ],
        syntaxErrorFiles: [],
        skippedFiles: [],
        truncated: false,
        hasTsconfig: true,
      };

      const complexityConfig: ComplexityConfig = {
        enabled: true,
        thresholds: { medium: 10, high: 20 },
        maxFileSize: 1048576,
        timeout: 30000,
        excludePatterns: [],
      };

      const summaryContext: SummaryContext = {
        owner: 'test',
        repo: 'repo',
        sha: 'abc123def456',
      };

      return {
        analysisResult,
        hasViolations: true,
        prContext: { owner: 'test', repo: 'repo', pullNumber: 123 },
        complexityMetrics,
        complexityConfig,
        labels: ['size/large', 'complexity/medium'],
        summaryContext,
      };
    };

    beforeEach(() => {
      resetI18n();
    });

    it('should match English snapshot', () => {
      initializeI18n('en');
      changeLanguage('en');

      const context = createTestContext();
      const basicMetrics = formatBasicMetrics(context.analysisResult.metrics);
      const violations = formatViolations(context.analysisResult.violations);
      const complexitySummary = generateComplexitySummary(
        context.complexityMetrics,
        context.complexityConfig,
        context.summaryContext,
      );
      const fileDetails = formatFileDetails(context.analysisResult.metrics.filesAnalyzed, 10);
      const improvementActions = formatImprovementActions(context.analysisResult.violations);
      const bestPractices = formatBestPractices(context.analysisResult.violations, context.analysisResult.metrics);

      expect(basicMetrics).toMatchSnapshot('basic-metrics-en');
      expect(violations).toMatchSnapshot('violations-en');
      expect(complexitySummary).toMatchSnapshot('complexity-summary-en');
      expect(fileDetails).toMatchSnapshot('file-details-en');
      expect(improvementActions).toMatchSnapshot('improvement-actions-en');
      expect(bestPractices).toMatchSnapshot('best-practices-en');
    });

    it('should match Japanese snapshot', () => {
      initializeI18n('ja');
      changeLanguage('ja');

      const context = createTestContext();
      const basicMetrics = formatBasicMetrics(context.analysisResult.metrics);
      const violations = formatViolations(context.analysisResult.violations);
      const complexitySummary = generateComplexitySummary(
        context.complexityMetrics,
        context.complexityConfig,
        context.summaryContext,
      );
      const fileDetails = formatFileDetails(context.analysisResult.metrics.filesAnalyzed, 10);
      const improvementActions = formatImprovementActions(context.analysisResult.violations);
      const bestPractices = formatBestPractices(context.analysisResult.violations, context.analysisResult.metrics);

      expect(basicMetrics).toMatchSnapshot('basic-metrics-ja');
      expect(violations).toMatchSnapshot('violations-ja');
      expect(complexitySummary).toMatchSnapshot('complexity-summary-ja');
      expect(fileDetails).toMatchSnapshot('file-details-ja');
      expect(improvementActions).toMatchSnapshot('improvement-actions-ja');
      expect(bestPractices).toMatchSnapshot('best-practices-ja');
    });

    it('should detect regression in English output', () => {
      initializeI18n('en');
      changeLanguage('en');

      const context = createTestContext();
      const output1 = formatBasicMetrics(context.analysisResult.metrics);
      const output2 = formatBasicMetrics(context.analysisResult.metrics);

      // Should be idempotent
      expect(output1).toBe(output2);
      // Should contain expected English phrases
      expect(output1).toContain('Total Additions');
      expect(output1).not.toContain('合計追加行数'); // Not Japanese
    });

    it('should detect regression in Japanese output', () => {
      initializeI18n('ja');
      changeLanguage('ja');

      const context = createTestContext();
      const output1 = formatBasicMetrics(context.analysisResult.metrics);
      const output2 = formatBasicMetrics(context.analysisResult.metrics);

      // Should be idempotent
      expect(output1).toBe(output2);
      // Should contain expected Japanese phrases
      expect(output1).toContain('総追加行数');
      expect(output1).not.toContain('Total Additions'); // Not English
    });
  });

  describe('formatFileAnalysis', () => {
    it('should return empty string when no files provided', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const result = formatFileAnalysis(violations, [], 10);
      expect(result).toBe('');
    });

    it('should format unified table with OK status for files without violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = [
        {
          path: 'src/index.ts',
          size: 19400,
          lines: 501,
          additions: 85,
          deletions: 87,
        },
        {
          path: 'src/utils.ts',
          size: 5000,
          lines: 150,
          additions: 20,
          deletions: 10,
        },
      ];

      const result = formatFileAnalysis(violations, files, 10);

      expect(result).toContain('### 📊 File Analysis');
      expect(result).toContain('src/index.ts');
      expect(result).toContain('18.9 KB'); // 19400 bytes = 18.9 KB
      expect(result).toContain('501');
      expect(result).toContain('+85/-87');
      expect(result).toContain('✅ OK');
      expect(result).toContain('src/utils.ts');
      expect(result).toContain('4.9 KB');
      expect(result).toContain('150');
      expect(result).toContain('+20/-10');
    });

    it('should show line exceed status for files violating line limits', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'src/index.ts',
            limit: 500,
            actualValue: 501,
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = [
        {
          path: 'src/index.ts',
          size: 19400,
          lines: 501,
          additions: 85,
          deletions: 87,
        },
        {
          path: 'src/utils.ts',
          size: 5000,
          lines: 150,
          additions: 20,
          deletions: 10,
        },
      ];

      const result = formatFileAnalysis(violations, files, 10);

      expect(result).toContain('src/index.ts');
      expect(result).toContain('⚠️ Line Exceed (500)');
      expect(result).toContain('src/utils.ts');
      expect(result).toContain('✅ OK');
    });

    it('should show size exceed status for files violating size limits', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'src/large.ts',
            limit: 10000,
            actualValue: 50000,
            severity: 'critical',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = [
        {
          path: 'src/large.ts',
          size: 50000,
          lines: 1000,
          additions: 500,
          deletions: 200,
        },
        {
          path: 'src/small.ts',
          size: 5000,
          lines: 150,
          additions: 20,
          deletions: 10,
        },
      ];

      const result = formatFileAnalysis(violations, files, 10);

      expect(result).toContain('src/large.ts');
      expect(result).toContain('🚫 Size Exceed (9.8 KB)');
      expect(result).toContain('src/small.ts');
      expect(result).toContain('✅ OK');
    });

    it('should prioritize line violations over size violations', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'src/both.ts',
            limit: 10000,
            actualValue: 50000,
            severity: 'critical',
          },
        ],
        exceedsFileLines: [
          {
            file: 'src/both.ts',
            limit: 500,
            actualValue: 1000,
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = [
        {
          path: 'src/both.ts',
          size: 50000,
          lines: 1000,
          additions: 500,
          deletions: 200,
        },
      ];

      const result = formatFileAnalysis(violations, files, 10);

      expect(result).toContain('⚠️ Line Exceed (500)');
      expect(result).not.toContain('Size Exceed');
    });

    it('should sort files by size descending', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = [
        {
          path: 'src/small.ts',
          size: 5000,
          lines: 150,
          additions: 20,
          deletions: 10,
        },
        {
          path: 'src/large.ts',
          size: 50000,
          lines: 1000,
          additions: 500,
          deletions: 200,
        },
        {
          path: 'src/medium.ts',
          size: 25000,
          lines: 500,
          additions: 250,
          deletions: 100,
        },
      ];

      const result = formatFileAnalysis(violations, files, 10);

      const largeIndex = result.indexOf('src/large.ts');
      const mediumIndex = result.indexOf('src/medium.ts');
      const smallIndex = result.indexOf('src/small.ts');

      expect(largeIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(smallIndex);
    });

    it('should limit results to specified limit', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = Array.from({ length: 15 }, (_, i) => ({
        path: `src/file${i}.ts`,
        size: 10000 - i * 100,
        lines: 200,
        additions: 50,
        deletions: 20,
      }));

      const result = formatFileAnalysis(violations, files, 5);

      const fileMatches = result.match(/src\/file\d+\.ts/g);
      expect(fileMatches).toHaveLength(5);
      expect(result).toContain('src/file0.ts'); // Largest
      expect(result).not.toContain('src/file10.ts'); // Outside limit
    });

    it('should handle Japanese language', () => {
      changeLanguage('ja');

      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'src/index.ts',
            limit: 500,
            actualValue: 501,
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const files: FileMetrics[] = [
        {
          path: 'src/index.ts',
          size: 19400,
          lines: 501,
          additions: 85,
          deletions: 87,
        },
      ];

      const result = formatFileAnalysis(violations, files, 10);

      expect(result).toContain('### 📊 ファイル分析結果');
      expect(result).toContain('⚠️ 行数超過 (500)');
      expect(result).not.toContain('File Analysis');
      expect(result).not.toContain('Line Exceed');

      // Reset to English for other tests
      changeLanguage('en');
    });
  });
});
