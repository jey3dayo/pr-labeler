/**
 * Convert CategoryConfig to DirectoryLabelerConfig
 * Provides fallback configuration when .github/directory-labeler.yml does not exist
 */

import type { CategoryConfig } from '../types/config.js';
import type { DirectoryLabelerConfig, LabelRule } from './types.js';

/**
 * Convert CategoryConfig array to DirectoryLabelerConfig
 *
 * @param categories - Array of CategoryConfig (e.g., DEFAULT_CATEGORIES)
 * @returns DirectoryLabelerConfig for Directory-Based Labeler
 */
export function convertCategoriesToDirectoryConfig(categories: CategoryConfig[]): DirectoryLabelerConfig {
  const rules: LabelRule[] = categories.map(category => {
    const rule: LabelRule = {
      label: category.label,
      include: [...category.patterns],
    };

    if (category.exclude && category.exclude.length > 0) {
      rule.exclude = [...category.exclude];
    }

    return rule;
  });

  return {
    version: 1,
    rules,
    useDefaultExcludes: true,
  };
}
