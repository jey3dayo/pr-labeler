import { describe, expect, it } from 'vitest';

import {
  decideCategoryLabels,
  decideComplexityLabel,
  decideLabels,
  decideRiskLabel,
  decideSizeLabel,
} from '../src/label-decision-engine';
import type { PRMetrics } from '../src/labeler-types';
import { DEFAULT_LABELER_CONFIG } from '../src/labeler-types';

describe('Label Decision Engine', () => {
  describe('decideSizeLabel', () => {
    const thresholds = { small: 200, medium: 500, large: 1000, xlarge: 3000 };

    it('should return size/small for additions < 200', () => {
      expect(decideSizeLabel(0, thresholds)).toBe('size/small');
      expect(decideSizeLabel(100, thresholds)).toBe('size/small');
      expect(decideSizeLabel(199, thresholds)).toBe('size/small');
    });

    it('should return size/medium for 200 <= additions < 500', () => {
      expect(decideSizeLabel(200, thresholds)).toBe('size/medium');
      expect(decideSizeLabel(350, thresholds)).toBe('size/medium');
      expect(decideSizeLabel(499, thresholds)).toBe('size/medium');
    });

    it('should return size/large for 500 <= additions < 1000', () => {
      expect(decideSizeLabel(500, thresholds)).toBe('size/large');
      expect(decideSizeLabel(750, thresholds)).toBe('size/large');
      expect(decideSizeLabel(999, thresholds)).toBe('size/large');
    });

    it('should return size/xlarge for 1000 <= additions < 3000', () => {
      expect(decideSizeLabel(1000, thresholds)).toBe('size/xlarge');
      expect(decideSizeLabel(2000, thresholds)).toBe('size/xlarge');
      expect(decideSizeLabel(2999, thresholds)).toBe('size/xlarge');
    });

    it('should return size/xxlarge for additions >= 3000', () => {
      expect(decideSizeLabel(3000, thresholds)).toBe('size/xxlarge');
      expect(decideSizeLabel(5000, thresholds)).toBe('size/xxlarge');
      expect(decideSizeLabel(10000, thresholds)).toBe('size/xxlarge');
    });
  });

  describe('decideComplexityLabel', () => {
    const thresholds = { medium: 10, high: 20 };

    it('should return null for low complexity', () => {
      expect(decideComplexityLabel(0, thresholds)).toBeNull();
      expect(decideComplexityLabel(5, thresholds)).toBeNull();
      expect(decideComplexityLabel(9, thresholds)).toBeNull();
    });

    it('should return complexity/medium for medium complexity', () => {
      expect(decideComplexityLabel(10, thresholds)).toBe('complexity/medium');
      expect(decideComplexityLabel(15, thresholds)).toBe('complexity/medium');
      expect(decideComplexityLabel(19, thresholds)).toBe('complexity/medium');
    });

    it('should return complexity/high for high complexity', () => {
      expect(decideComplexityLabel(20, thresholds)).toBe('complexity/high');
      expect(decideComplexityLabel(25, thresholds)).toBe('complexity/high');
      expect(decideComplexityLabel(100, thresholds)).toBe('complexity/high');
    });
  });

  describe('decideCategoryLabels', () => {
    const categories = [
      { label: 'category/tests', patterns: ['__tests__/**', '**/*.test.ts'] },
      { label: 'category/ci-cd', patterns: ['.github/workflows/**'] },
      { label: 'category/docs', patterns: ['docs/**', '**/*.md'] },
    ];

    it('should return empty array for no matches', () => {
      const files = ['src/index.ts', 'src/utils.ts'];
      expect(decideCategoryLabels(files, categories)).toEqual([]);
    });

    it('should return single category label', () => {
      const files = ['__tests__/foo.test.ts'];
      expect(decideCategoryLabels(files, categories)).toEqual(['category/tests']);
    });

    it('should return multiple category labels', () => {
      const files = ['__tests__/foo.test.ts', 'docs/README.md', '.github/workflows/ci.yml'];
      const result = decideCategoryLabels(files, categories);
      expect(result).toContain('category/tests');
      expect(result).toContain('category/ci-cd');
      expect(result).toContain('category/docs');
      expect(result).toHaveLength(3);
    });

    it('should match glob patterns correctly', () => {
      const files = ['src/components/Button.test.ts'];
      expect(decideCategoryLabels(files, categories)).toEqual(['category/tests']);
    });
  });

  describe('decideRiskLabel', () => {
    const config = {
      high_if_no_tests_for_core: true,
      core_paths: ['src/**'],
      config_files: ['.github/workflows/**', 'package.json', 'tsconfig.json'],
    };

    it('should return null for docs-only changes', () => {
      const files = ['docs/README.md', 'CHANGELOG.md'];
      expect(decideRiskLabel(files, config)).toBeNull();
    });

    it('should return risk/high for core changes without tests', () => {
      const files = ['src/index.ts', 'src/utils.ts'];
      expect(decideRiskLabel(files, config)).toBe('risk/high');
    });

    it('should return null for core changes with tests', () => {
      const files = ['src/index.ts', '__tests__/index.test.ts'];
      expect(decideRiskLabel(files, config)).toBeNull();
    });

    it('should return risk/medium for config file changes', () => {
      const files = ['package.json', '__tests__/foo.test.ts'];
      expect(decideRiskLabel(files, config)).toBe('risk/medium');
    });

    it('should return risk/medium for workflow changes', () => {
      const files = ['.github/workflows/ci.yml'];
      expect(decideRiskLabel(files, config)).toBe('risk/medium');
    });

    it('should prioritize risk/high over risk/medium', () => {
      const files = ['src/index.ts', 'package.json'];
      expect(decideRiskLabel(files, config)).toBe('risk/high');
    });

    describe('with CI status and commit messages', () => {
      const configWithCI = {
        ...config,
        use_ci_status: true,
      };

      it('should return null for refactoring with all CI passed', () => {
        const files = ['src/index.ts', 'src/utils.ts'];
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'passed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['refactor: improve code structure'],
        };
        expect(decideRiskLabel(files, configWithCI, prContext)).toBeNull();
      });

      it('should return risk/high for feature without tests', () => {
        const files = ['src/index.ts', 'src/new-feature.ts'];
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'passed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['feat: add new feature'],
        };
        expect(decideRiskLabel(files, configWithCI, prContext)).toBe('risk/high');
      });

      it('should return risk/high when CI checks fail', () => {
        const files = ['src/index.ts', '__tests__/index.test.ts'];
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'failed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['refactor: improve code structure'],
        };
        expect(decideRiskLabel(files, configWithCI, prContext)).toBe('risk/high');
      });

      it('should fallback to original logic when use_ci_status is false', () => {
        const files = ['src/index.ts', 'src/utils.ts'];
        const configNoCi = {
          ...config,
          use_ci_status: false,
        };
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'passed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['refactor: improve code structure'],
        };
        // Should use original logic (no tests + core changes = risk/high)
        expect(decideRiskLabel(files, configNoCi, prContext)).toBe('risk/high');
      });

      it('should work without prContext (backward compatibility)', () => {
        const files = ['src/index.ts', 'src/utils.ts'];
        // Should use original logic without prContext
        expect(decideRiskLabel(files, configWithCI)).toBe('risk/high');
      });
    });
  });

  describe('decideLabels', () => {
    const config = DEFAULT_LABELER_CONFIG;

    it('should decide all label types for a typical PR', () => {
      const metrics: PRMetrics = {
        totalAdditions: 250,
        files: [
          { path: 'src/index.ts', size: 5000, lines: 150, additions: 100, deletions: 20 },
          { path: '__tests__/index.test.ts', size: 3000, lines: 80, additions: 50, deletions: 10 },
          { path: 'docs/README.md', size: 2000, lines: 50, additions: 100, deletions: 5 },
        ],
      };

      const result = decideLabels(metrics, config);
      expect(result.isOk()).toBe(true);

      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('size/medium');
      expect(decisions.labelsToAdd).toContain('category/tests');
      expect(decisions.labelsToAdd).toContain('category/documentation');
      expect(decisions.labelsToRemove).toContain('size/*');
    });

    it('should decide size/small for small PRs', () => {
      const metrics: PRMetrics = {
        totalAdditions: 50,
        files: [{ path: 'src/small.ts', size: 1000, lines: 30, additions: 50, deletions: 5 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('size/small');
    });

    it('should decide risk/high for core changes without tests', () => {
      const metrics: PRMetrics = {
        totalAdditions: 100,
        files: [{ path: 'src/core.ts', size: 5000, lines: 150, additions: 100, deletions: 10 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('risk/high');
    });

    it('should include reasoning for each label', () => {
      const metrics: PRMetrics = {
        totalAdditions: 150,
        files: [{ path: 'src/index.ts', size: 5000, lines: 150, additions: 150, deletions: 20 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();

      expect(decisions.reasoning).toHaveLength(decisions.labelsToAdd.length);
      expect(decisions.reasoning[0]?.category).toBe('size');
    });

    it('should not add complexity label when metrics.complexity is undefined', () => {
      const metrics: PRMetrics = {
        totalAdditions: 120,
        files: [{ path: 'src/a.ts', size: 1000, lines: 50, additions: 120, deletions: 0 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('complexity/'))).toBeUndefined();
    });

    it('should not add complexity label when disabled in config', () => {
      const customConfig = {
        ...config,
        complexity: { ...config.complexity, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 120,
        files: [{ path: 'src/a.ts', size: 1000, lines: 50, additions: 120, deletions: 0 }],
        complexity: {
          maxComplexity: 99,
          avgComplexity: 50,
          analyzedFiles: 0,
          files: [],
          skippedFiles: [],
          syntaxErrorFiles: [],
          truncated: false,
          hasTsconfig: true,
        },
      };

      const result = decideLabels(metrics, customConfig);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('complexity/'))).toBeUndefined();
    });

    it('should not add size label when disabled in config', () => {
      const customConfig = {
        ...config,
        size: { ...config.size, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 1200,
        files: [{ path: 'src/a.ts', size: 1000, lines: 50, additions: 1200, deletions: 0 }],
      };

      const result = decideLabels(metrics, customConfig);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('size/'))).toBeUndefined();
      expect(decisions.reasoning.find(r => r.category === 'size')).toBeUndefined();
    });

    it('should not add category labels when disabled in config', () => {
      const customConfig = {
        ...config,
        categoryLabeling: { enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 120,
        files: [
          { path: '__tests__/foo.test.ts', size: 1000, lines: 50, additions: 120, deletions: 0 },
          { path: 'docs/guide.md', size: 500, lines: 20, additions: 30, deletions: 0 },
        ],
      };

      const result = decideLabels(metrics, customConfig);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('category/'))).toBeUndefined();
      expect(decisions.reasoning.find(r => r.category === 'category')).toBeUndefined();
    });

    it('should not add risk label when disabled in config', () => {
      const customConfig = {
        ...config,
        risk: { ...config.risk, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 120,
        files: [{ path: 'src/critical.ts', size: 1000, lines: 50, additions: 120, deletions: 0 }],
      };

      const result = decideLabels(metrics, customConfig);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('risk/'))).toBeUndefined();
      expect(decisions.reasoning.find(r => r.category === 'risk')).toBeUndefined();
    });

    it('should work with all label types disabled', () => {
      const customConfig = {
        ...config,
        size: { ...config.size, enabled: false },
        complexity: { ...config.complexity, enabled: false },
        categoryLabeling: { enabled: false },
        risk: { ...config.risk, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 1200,
        files: [{ path: '__tests__/foo.test.ts', size: 1000, lines: 50, additions: 1200, deletions: 0 }],
        complexity: {
          maxComplexity: 99,
          avgComplexity: 50,
          analyzedFiles: 1,
          files: [],
          skippedFiles: [],
          syntaxErrorFiles: [],
          truncated: false,
          hasTsconfig: true,
        },
      };

      const result = decideLabels(metrics, customConfig);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toEqual([]);
      expect(decisions.reasoning).toEqual([]);
    });
  });
});
