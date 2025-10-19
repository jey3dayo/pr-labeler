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
    const thresholds = { small: 100, medium: 500, large: 1000 };

    it('should return size/small for additions < 100', () => {
      expect(decideSizeLabel(0, thresholds)).toBe('size/small');
      expect(decideSizeLabel(50, thresholds)).toBe('size/small');
      expect(decideSizeLabel(99, thresholds)).toBe('size/small');
    });

    it('should return size/medium for 100 <= additions < 500', () => {
      expect(decideSizeLabel(100, thresholds)).toBe('size/medium');
      expect(decideSizeLabel(250, thresholds)).toBe('size/medium');
      expect(decideSizeLabel(499, thresholds)).toBe('size/medium');
    });

    it('should return size/large for 500 <= additions < 1000', () => {
      expect(decideSizeLabel(500, thresholds)).toBe('size/large');
      expect(decideSizeLabel(750, thresholds)).toBe('size/large');
      expect(decideSizeLabel(999, thresholds)).toBe('size/large');
    });

    it('should return size/xlarge for additions >= 1000', () => {
      expect(decideSizeLabel(1000, thresholds)).toBe('size/xlarge');
      expect(decideSizeLabel(1001, thresholds)).toBe('size/xlarge');
      expect(decideSizeLabel(5000, thresholds)).toBe('size/xlarge');
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
  });

  describe('decideLabels', () => {
    const config = DEFAULT_LABELER_CONFIG;

    it('should decide all label types for a typical PR', () => {
      const metrics: PRMetrics = {
        totalAdditions: 250,
        files: [
          { filename: 'src/index.ts', size: 5000, lines: 150, additions: 100, deletions: 20 },
          { filename: '__tests__/index.test.ts', size: 3000, lines: 80, additions: 50, deletions: 10 },
          { filename: 'docs/README.md', size: 2000, lines: 50, additions: 100, deletions: 5 },
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
        files: [{ filename: 'src/small.ts', size: 1000, lines: 30, additions: 50, deletions: 5 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('size/small');
    });

    it('should decide risk/high for core changes without tests', () => {
      const metrics: PRMetrics = {
        totalAdditions: 100,
        files: [{ filename: 'src/core.ts', size: 5000, lines: 150, additions: 100, deletions: 10 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('risk/high');
    });

    it('should include reasoning for each label', () => {
      const metrics: PRMetrics = {
        totalAdditions: 150,
        files: [{ filename: 'src/index.ts', size: 5000, lines: 150, additions: 150, deletions: 20 }],
      };

      const result = decideLabels(metrics, config);
      const decisions = result._unsafeUnwrap();

      expect(decisions.reasoning).toHaveLength(decisions.labelsToAdd.length);
      expect(decisions.reasoning[0]?.category).toBe('size');
    });
  });
});
