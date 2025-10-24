import { describe, expect, it } from 'vitest';

import { parseLabelerConfig } from '../src/config/transformers/labeler-config-transformer.js';

describe('parseLabelerConfig', () => {
  it('returns normalized config when input is valid', () => {
    const result = parseLabelerConfig({
      language: 'ja-JP',
      summary: { title: 'Custom Summary' },
      size: {
        thresholds: {
          small: 100,
          medium: 300,
          large: 600,
          xlarge: 900,
        },
      },
      complexity: {
        thresholds: {
          medium: 10,
          high: 20,
        },
      },
      categories: [
        {
          label: 'category/tests',
          patterns: ['**/*.test.ts'],
          display_name: { en: 'Tests', ja: 'テスト' },
        },
      ],
      risk: {
        use_ci_status: true,
      },
      unknownKey: 'will be ignored',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const { config, warnings } = result.value;
      expect(config.language).toBe('ja-JP');
      expect(config.summary?.title).toBe('Custom Summary');
      expect(config.size?.thresholds?.small).toBe(100);
      expect(config.categories).toHaveLength(1);
      expect(warnings).toContain('Unknown configuration keys will be ignored: unknownKey');
    }
  });

  it('fails when language is invalid', () => {
    const result = parseLabelerConfig({
      language: 'fr',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('language');
    }
  });

  it('fails when size thresholds are not monotonic', () => {
    const result = parseLabelerConfig({
      size: {
        thresholds: {
          small: 300,
          medium: 200,
          large: 400,
          xlarge: 600,
        },
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('size.thresholds');
      expect(result.error.message).toContain('must be less than medium');
    }
  });

  it('fails when category patterns are invalid', () => {
    const result = parseLabelerConfig({
      categories: [
        {
          label: 'category/tests',
          patterns: ['**/tests/{'],
        },
      ],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('categories[0].patterns[0]');
    }
  });

  it('fails when risk.use_ci_status is not boolean', () => {
    const result = parseLabelerConfig({
      risk: {
        use_ci_status: 'true',
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('risk.use_ci_status');
    }
  });
});
