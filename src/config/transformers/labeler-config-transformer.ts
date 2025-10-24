import { err, ok, type Result } from 'neverthrow';

import { type ConfigurationError, createConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../labeler-types.js';
import { isBoolean, isNumber, isRecord, isString, isStringArray } from '../../utils/type-guards.js';

const LANGUAGE_FIELD = 'language';
const SUMMARY_FIELD = 'summary';
const SIZE_FIELD = 'size';
const COMPLEXITY_FIELD = 'complexity';
const CATEGORIES_FIELD = 'categories';
const CATEGORY_LABELING_FIELD = 'categoryLabeling';
const RISK_FIELD = 'risk';
const EXCLUDE_FIELD = 'exclude';
const LABELS_FIELD = 'labels';
const RUNTIME_FIELD = 'runtime';

const KNOWN_KEYS = [
  LANGUAGE_FIELD,
  SUMMARY_FIELD,
  SIZE_FIELD,
  COMPLEXITY_FIELD,
  CATEGORY_LABELING_FIELD,
  CATEGORIES_FIELD,
  RISK_FIELD,
  EXCLUDE_FIELD,
  LABELS_FIELD,
  RUNTIME_FIELD,
] as const;

export interface LabelerConfigTransformResult {
  config: Partial<LabelerConfig>;
  warnings: string[];
}

export function parseLabelerConfig(config: unknown): Result<LabelerConfigTransformResult, ConfigurationError> {
  if (!isRecord(config)) {
    return err(createConfigurationError('root', config, 'Configuration must be an object'));
  }

  const source = config as Record<string, unknown>;
  const normalized: Partial<LabelerConfig> = {};
  const warnings: string[] = [];

  if (LANGUAGE_FIELD in source && source[LANGUAGE_FIELD] !== undefined) {
    const rawLanguage = source[LANGUAGE_FIELD];
    if (!isString(rawLanguage)) {
      return err(createConfigurationError(LANGUAGE_FIELD, rawLanguage, 'language must be a string'));
    }

    const lang = rawLanguage.toLowerCase();
    const isEn = /^en(?:[-_].+)?$/.test(lang);
    const isJa = /^ja(?:[-_].+)?$/.test(lang);

    if (!isEn && !isJa) {
      return err(
        createConfigurationError(
          LANGUAGE_FIELD,
          rawLanguage,
          "language must start with 'en' or 'ja' (e.g., 'en', 'en-US', 'ja', 'ja-JP')",
        ),
      );
    }

    normalized.language = rawLanguage;
  }

  if (SUMMARY_FIELD in source && source[SUMMARY_FIELD] !== undefined) {
    const rawSummary = source[SUMMARY_FIELD];
    if (!isRecord(rawSummary)) {
      return err(createConfigurationError(SUMMARY_FIELD, rawSummary, 'summary must be an object'));
    }

    const summaryRecord = rawSummary as Record<string, unknown>;
    const title = summaryRecord['title'];
    if (title !== undefined) {
      if (!isString(title)) {
        return err(createConfigurationError('summary.title', title, 'summary.title must be a string'));
      }
      normalized.summary = { title };
    }
  }

  if (SIZE_FIELD in source && source[SIZE_FIELD] !== undefined) {
    const rawSize = source[SIZE_FIELD];
    if (!isRecord(rawSize)) {
      return err(createConfigurationError(SIZE_FIELD, rawSize, 'size must be an object'));
    }

    const sizeRecord = rawSize as Record<string, unknown>;
    const thresholdsRaw = sizeRecord['thresholds'];

    let small: number | undefined;
    let medium: number | undefined;
    let large: number | undefined;
    let xlarge: number | undefined;

    if (thresholdsRaw !== undefined) {
      if (!isRecord(thresholdsRaw)) {
        return err(createConfigurationError('size.thresholds', thresholdsRaw, 'size.thresholds must be an object'));
      }

      const thresholds = thresholdsRaw as Record<string, unknown>;
      const smallRaw = thresholds['small'];
      const mediumRaw = thresholds['medium'];
      const largeRaw = thresholds['large'];
      const xlargeRaw = thresholds['xlarge'];

      if (smallRaw !== undefined) {
        if (!isNumber(smallRaw) || smallRaw < 0 || !Number.isInteger(smallRaw)) {
          return err(
            createConfigurationError(
              'size.thresholds.small',
              smallRaw,
              'size.thresholds.small must be a non-negative integer',
            ),
          );
        }
        small = smallRaw;
      }

      if (mediumRaw !== undefined) {
        if (!isNumber(mediumRaw) || mediumRaw < 0 || !Number.isInteger(mediumRaw)) {
          return err(
            createConfigurationError(
              'size.thresholds.medium',
              mediumRaw,
              'size.thresholds.medium must be a non-negative integer',
            ),
          );
        }
        medium = mediumRaw;
      }

      if (largeRaw !== undefined) {
        if (!isNumber(largeRaw) || largeRaw < 0 || !Number.isInteger(largeRaw)) {
          return err(
            createConfigurationError(
              'size.thresholds.large',
              largeRaw,
              'size.thresholds.large must be a non-negative integer',
            ),
          );
        }
        large = largeRaw;
      }

      if (xlargeRaw !== undefined) {
        if (!isNumber(xlargeRaw) || xlargeRaw < 0 || !Number.isInteger(xlargeRaw)) {
          return err(
            createConfigurationError(
              'size.thresholds.xlarge',
              xlargeRaw,
              'size.thresholds.xlarge must be a non-negative integer',
            ),
          );
        }
        xlarge = xlargeRaw;
      }

      const finalSmall = small ?? DEFAULT_LABELER_CONFIG.size.thresholds.small;
      const finalMedium = medium ?? DEFAULT_LABELER_CONFIG.size.thresholds.medium;
      const finalLarge = large ?? DEFAULT_LABELER_CONFIG.size.thresholds.large;
      const finalXLarge = xlarge ?? DEFAULT_LABELER_CONFIG.size.thresholds.xlarge;

      if (finalSmall >= finalMedium) {
        return err(
          createConfigurationError(
            'size.thresholds',
            { small: finalSmall, medium: finalMedium },
            `size.thresholds.small (${finalSmall}) must be less than medium (${finalMedium})`,
          ),
        );
      }

      if (finalMedium >= finalLarge) {
        return err(
          createConfigurationError(
            'size.thresholds',
            { medium: finalMedium, large: finalLarge },
            `size.thresholds.medium (${finalMedium}) must be less than large (${finalLarge})`,
          ),
        );
      }

      if (finalLarge >= finalXLarge) {
        return err(
          createConfigurationError(
            'size.thresholds',
            { large: finalLarge, xlarge: finalXLarge },
            `size.thresholds.large (${finalLarge}) must be less than xlarge (${finalXLarge})`,
          ),
        );
      }
    }

    normalized.size = rawSize as unknown as LabelerConfig['size'];
  }

  if (COMPLEXITY_FIELD in source && source[COMPLEXITY_FIELD] !== undefined) {
    const rawComplexity = source[COMPLEXITY_FIELD];
    if (!isRecord(rawComplexity)) {
      return err(createConfigurationError(COMPLEXITY_FIELD, rawComplexity, 'complexity must be an object'));
    }

    const complexityRecord = rawComplexity as Record<string, unknown>;
    const thresholdsRaw = complexityRecord['thresholds'];

    let medium: number | undefined;
    let high: number | undefined;

    if (thresholdsRaw !== undefined) {
      if (!isRecord(thresholdsRaw)) {
        return err(
          createConfigurationError('complexity.thresholds', thresholdsRaw, 'complexity.thresholds must be an object'),
        );
      }

      const thresholds = thresholdsRaw as Record<string, unknown>;
      const mediumRaw = thresholds['medium'];
      const highRaw = thresholds['high'];

      if (mediumRaw !== undefined) {
        if (!isNumber(mediumRaw) || mediumRaw < 0 || !Number.isInteger(mediumRaw)) {
          return err(
            createConfigurationError(
              'complexity.thresholds.medium',
              mediumRaw,
              'complexity.thresholds.medium must be a non-negative integer',
            ),
          );
        }
        medium = mediumRaw;
      }

      if (highRaw !== undefined) {
        if (!isNumber(highRaw) || highRaw < 0 || !Number.isInteger(highRaw)) {
          return err(
            createConfigurationError(
              'complexity.thresholds.high',
              highRaw,
              'complexity.thresholds.high must be a non-negative integer',
            ),
          );
        }
        high = highRaw;
      }

      const finalMedium = medium ?? DEFAULT_LABELER_CONFIG.complexity.thresholds.medium;
      const finalHigh = high ?? DEFAULT_LABELER_CONFIG.complexity.thresholds.high;

      if (finalMedium >= finalHigh) {
        return err(
          createConfigurationError(
            'complexity.thresholds',
            { medium: finalMedium, high: finalHigh },
            `complexity.thresholds.medium (${finalMedium}) must be less than high (${finalHigh})`,
          ),
        );
      }
    }

    normalized.complexity = rawComplexity as unknown as LabelerConfig['complexity'];
  }

  if (CATEGORIES_FIELD in source && source[CATEGORIES_FIELD] !== undefined) {
    const rawCategories = source[CATEGORIES_FIELD];
    if (!Array.isArray(rawCategories)) {
      return err(createConfigurationError(CATEGORIES_FIELD, rawCategories, 'categories must be an array'));
    }

    try {
      const normalizedCategories = rawCategories.map((category, index) => {
        if (!isRecord(category)) {
          throw createConfigurationError(`categories[${index}]`, category, 'Category config must be an object');
        }

        const cat = category as Record<string, unknown>;
        const label = cat['label'];
        const patterns = cat['patterns'];
        const displayName = cat['display_name'];

        if (!isString(label)) {
          throw createConfigurationError(`categories[${index}].label`, label, 'Category label must be a string');
        }

        if (!Array.isArray(patterns)) {
          throw createConfigurationError(
            `categories[${index}].patterns`,
            patterns,
            'Category patterns must be an array',
          );
        }

        const validatedPatterns: string[] = [];
        for (let j = 0; j < patterns.length; j++) {
          const pattern = patterns[j];
          if (!isString(pattern)) {
            throw createConfigurationError(`categories[${index}].patterns[${j}]`, pattern, 'Pattern must be a string');
          }

          if (!isValidMinimatchPattern(pattern)) {
            throw createConfigurationError(
              `categories[${index}].patterns[${j}]`,
              pattern,
              `Invalid minimatch pattern: ${pattern}`,
            );
          }

          validatedPatterns.push(pattern);
        }

        const normalizedCategory: LabelerConfig['categories'][number] = {
          label,
          patterns: validatedPatterns,
        };

        if (displayName !== undefined) {
          if (!isRecord(displayName)) {
            throw createConfigurationError(
              `categories[${index}].display_name`,
              displayName,
              'display_name must be an object',
            );
          }

          const displayNameRecord = displayName as Record<string, unknown>;
          const en = displayNameRecord['en'];
          const ja = displayNameRecord['ja'];

          if (!isString(en)) {
            throw createConfigurationError(
              `categories[${index}].display_name.en`,
              en,
              'display_name.en must be a string',
            );
          }

          if (!isString(ja)) {
            throw createConfigurationError(
              `categories[${index}].display_name.ja`,
              ja,
              'display_name.ja must be a string',
            );
          }

          normalizedCategory.display_name = { en, ja };
        }

        if ('exclude' in cat) {
          const exclude = cat['exclude'];
          if (exclude !== undefined) {
            if (!isStringArray(exclude)) {
              throw createConfigurationError(
                `categories[${index}].exclude`,
                exclude,
                'categories.exclude must be an array of strings',
              );
            }
            normalizedCategory.exclude = [...exclude];
          }
        }

        return normalizedCategory;
      });

      normalized.categories = normalizedCategories;
    } catch (error) {
      return err(error as ConfigurationError);
    }
  }

  if (CATEGORY_LABELING_FIELD in source && source[CATEGORY_LABELING_FIELD] !== undefined) {
    normalized.categoryLabeling = source[CATEGORY_LABELING_FIELD] as LabelerConfig['categoryLabeling'];
  }

  if (RISK_FIELD in source && source[RISK_FIELD] !== undefined) {
    const rawRisk = source[RISK_FIELD];
    if (!isRecord(rawRisk)) {
      return err(createConfigurationError(RISK_FIELD, rawRisk, 'risk must be an object'));
    }

    const riskRecord = rawRisk as Record<string, unknown>;
    const useCiStatus = riskRecord['use_ci_status'];
    if (useCiStatus !== undefined && !isBoolean(useCiStatus)) {
      return err(createConfigurationError('risk.use_ci_status', useCiStatus, 'risk.use_ci_status must be a boolean'));
    }

    normalized.risk = rawRisk as unknown as LabelerConfig['risk'];
  }

  if (EXCLUDE_FIELD in source && source[EXCLUDE_FIELD] !== undefined) {
    normalized.exclude = source[EXCLUDE_FIELD] as LabelerConfig['exclude'];
  }

  if (LABELS_FIELD in source && source[LABELS_FIELD] !== undefined) {
    normalized.labels = source[LABELS_FIELD] as LabelerConfig['labels'];
  }

  if (RUNTIME_FIELD in source && source[RUNTIME_FIELD] !== undefined) {
    normalized.runtime = source[RUNTIME_FIELD] as LabelerConfig['runtime'];
  }

  const unknownKeys = Object.keys(source).filter(key => !KNOWN_KEYS.includes(key as (typeof KNOWN_KEYS)[number]));
  if (unknownKeys.length > 0) {
    warnings.push(`Unknown configuration keys will be ignored: ${unknownKeys.join(', ')}`);
  }

  return ok({ config: normalized, warnings });
}

function isValidMinimatchPattern(pattern: string): boolean {
  const openBraces = (pattern.match(/\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;
  const openBrackets = (pattern.match(/\[/g) || []).length;
  const closeBrackets = (pattern.match(/\]/g) || []).length;

  if (openBraces !== closeBraces) {
    return false;
  }

  if (openBrackets !== closeBrackets) {
    return false;
  }

  return true;
}
