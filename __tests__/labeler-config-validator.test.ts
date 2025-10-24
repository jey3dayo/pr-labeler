import * as core from '@actions/core';
import { describe, expect, it, vi } from 'vitest';

import { mergeWithDefaults, validateLabelerConfig } from '../src/config/loaders/labeler-config-validator';
import { DEFAULT_LABELER_CONFIG } from '../src/labeler-types.js';

vi.mock('@actions/core', () => ({
  warning: vi.fn(),
}));

describe('labeler-config-validator', () => {
  afterEach(() => {
    vi.mocked(core.warning).mockReset();
  });

  it('returns error when config is not an object', async () => {
    const result = await validateLabelerConfig(null);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('root');
    }
  });

  it('returns error for invalid language format', async () => {
    const result = await validateLabelerConfig({ language: 'fr-FR' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('language');
    }
  });

  it('validates summary object structure', async () => {
    const result = await validateLabelerConfig({ summary: { title: 123 } });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('summary.title');
    }
  });

  it('rejects negative size thresholds', async () => {
    const result = await validateLabelerConfig({
      size: { thresholds: { small: -1 } },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('size.thresholds.small');
    }
  });

  it('validates size threshold order', async () => {
    const result = await validateLabelerConfig({
      size: { thresholds: { small: 500, medium: 400 } },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('size.thresholds');
    }
  });

  it('rejects invalid complexity threshold order', async () => {
    const result = await validateLabelerConfig({
      complexity: { thresholds: { medium: 20, high: 10 } },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('complexity.thresholds');
    }
  });

  it('requires categories to be arrays', async () => {
    const result = await validateLabelerConfig({ categories: {} });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('categories');
    }
  });

  it('validates category entries recursively', async () => {
    const result = await validateLabelerConfig({
      categories: [
        {
          label: 123,
          patterns: ['src/**'],
        },
      ],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('categories[0].label');
    }
  });

  it('rejects invalid minimatch patterns', async () => {
    const result = await validateLabelerConfig({
      categories: [
        {
          label: 'feature',
          patterns: ['{invalid'],
        },
      ],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('categories[0].patterns[0]');
    }
  });

  it('validates risk.use_ci_status boolean', async () => {
    const result = await validateLabelerConfig({ risk: { use_ci_status: 'yes' } });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('risk.use_ci_status');
    }
  });

  it('warns about unknown keys but succeeds', async () => {
    const result = await validateLabelerConfig({ unknown: true });

    expect(result.isOk()).toBe(true);
    expect(core.warning).toHaveBeenCalledWith('Unknown configuration keys will be ignored: unknown');
  });

  it('merges overrides with defaults correctly', () => {
    const merged = mergeWithDefaults({
      language: 'ja-JP',
      summary: { title: 'Custom' },
      size: { thresholds: { small: 50 } },
      risk: { use_ci_status: false },
    });

    expect(merged.language).toBe('ja-JP');
    expect(merged.summary?.title).toBe('Custom');
    expect(merged.size.thresholds.small).toBe(50);
    expect(merged.size.thresholds.medium).toBe(DEFAULT_LABELER_CONFIG.size.thresholds.medium);
    expect(merged.risk.use_ci_status).toBe(false);
  });
});
