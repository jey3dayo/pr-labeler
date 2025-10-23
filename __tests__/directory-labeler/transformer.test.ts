import { describe, expect, it } from 'vitest';

import { parseDirectoryLabelerConfig } from '../../src/directory-labeler/transformers/config-transformer.js';

describe('parseDirectoryLabelerConfig', () => {
  it('parses valid configuration', () => {
    const result = parseDirectoryLabelerConfig({
      version: 1,
      rules: [
        {
          label: 'area:components',
          include: ['src/components/**'],
          exclude: ['src/components/**/__tests__/**'],
          priority: 10,
        },
      ],
      options: {
        dot: false,
        nocase: true,
      },
      namespaces: {
        exclusive: ['size'],
      },
      useDefaultExcludes: false,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const { config, warnings } = result.value;
      expect(config.version).toBe(1);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.label).toBe('area:components');
      expect(config.options?.nocase).toBe(true);
      expect(config.namespaces?.exclusive).toEqual(['size']);
      expect(config.useDefaultExcludes).toBe(false);
      expect(warnings).toHaveLength(0);
    }
  });

  it('fails when version is missing', () => {
    const result = parseDirectoryLabelerConfig({
      rules: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('version');
    }
  });

  it('fails when include array is empty', () => {
    const result = parseDirectoryLabelerConfig({
      version: 1,
      rules: [
        {
          label: 'area:empty',
          include: [],
        },
      ],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe('rules[0].include');
    }
  });

  it('adds warning when duplicate labels are present', () => {
    const result = parseDirectoryLabelerConfig({
      version: 1,
      rules: [
        {
          label: 'area:components',
          include: ['src/components/**'],
        },
        {
          label: 'area:components',
          include: ['src/legacy/**'],
        },
      ],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.warnings[0]).toContain('Duplicate label "area:components"');
    }
  });
});
