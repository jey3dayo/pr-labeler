import { err, ok, type Result } from 'neverthrow';

import { createConfigurationError } from '../../errors/index.js';
import {
  isBoolean,
  isNonEmptyStringArray,
  isNumber,
  isRecord,
  isString,
  isStringArray,
} from '../../utils/type-guards.js';
import { type DirectoryLabelerConfig, type LabelRule, type MinimatchOptions, type NamespacePolicy } from '../types.js';

export interface DirectoryLabelerConfigTransformResult {
  config: DirectoryLabelerConfig;
  warnings: string[];
}

export function parseDirectoryLabelerConfig(
  config: unknown,
): Result<DirectoryLabelerConfigTransformResult, ReturnType<typeof createConfigurationError>> {
  if (!isRecord(config)) {
    return err(createConfigurationError('config', config, 'Configuration must be an object'));
  }

  const cfg = config as Record<string, unknown>;
  const warnings: string[] = [];

  if (!('version' in cfg)) {
    return err(createConfigurationError('version', cfg['version'], 'Field "version" is required'));
  }

  if (cfg['version'] !== 1) {
    return err(
      createConfigurationError('version', cfg['version'], 'Field "version" must be 1 (current schema version)'),
    );
  }

  if (!('rules' in cfg)) {
    return err(createConfigurationError('rules', cfg['rules'], 'Field "rules" is required'));
  }

  const rawRules = cfg['rules'];
  if (!Array.isArray(rawRules)) {
    return err(createConfigurationError('rules', rawRules, 'Field "rules" must be an array'));
  }

  if (rawRules.length === 0) {
    warnings.push('Configuration has no rules defined. No labels will be applied.');
  }

  const normalizedRules: LabelRule[] = [];
  const labelsSeen = new Set<string>();

  for (let i = 0; i < rawRules.length; i++) {
    const rule = rawRules[i];
    if (!isRecord(rule)) {
      return err(createConfigurationError(`rules[${i}]`, rule, `Rule at index ${i} must be an object`));
    }

    const label = rule['label'];
    if (!isString(label)) {
      return err(
        createConfigurationError(
          `rules[${i}].label`,
          label,
          `Field "label" is required and must be a string in rule at index ${i}`,
        ),
      );
    }

    if (labelsSeen.has(label)) {
      warnings.push(`Duplicate label "${label}" found in rules. The first definition will be prioritized.`);
    } else {
      labelsSeen.add(label);
    }

    if (!('include' in rule)) {
      return err(
        createConfigurationError(
          `rules[${i}].include`,
          rule['include'],
          `Field "include" is required in rule at index ${i}`,
        ),
      );
    }

    const include = rule['include'];
    if (!isNonEmptyStringArray(include)) {
      return err(
        createConfigurationError(
          `rules[${i}].include`,
          include,
          `Field "include" must be a non-empty array in rule at index ${i}`,
        ),
      );
    }

    let exclude: string[] | undefined;
    if ('exclude' in rule && rule['exclude'] !== undefined) {
      const rawExclude = rule['exclude'];
      if (!isStringArray(rawExclude)) {
        return err(
          createConfigurationError(
            `rules[${i}].exclude`,
            rawExclude,
            `Field "exclude" must be an array in rule at index ${i}`,
          ),
        );
      }
      exclude = [...rawExclude];
    }

    let priority: number | undefined;
    if ('priority' in rule && rule['priority'] !== undefined) {
      const rawPriority = rule['priority'];
      if (!isNumber(rawPriority)) {
        return err(
          createConfigurationError(
            `rules[${i}].priority`,
            rawPriority,
            `Field "priority" must be a number in rule at index ${i}`,
          ),
        );
      }
      priority = rawPriority;
    }

    const normalizedRule: LabelRule = {
      label,
      include: [...include],
    };

    if (exclude) {
      normalizedRule.exclude = exclude;
    }

    if (priority !== undefined) {
      normalizedRule.priority = priority;
    }

    normalizedRules.push(normalizedRule);
  }

  let optionsOverride: Partial<MinimatchOptions> | undefined;
  if ('options' in cfg && cfg['options'] !== undefined) {
    const rawOptions = cfg['options'];
    if (!isRecord(rawOptions)) {
      return err(createConfigurationError('options', rawOptions, 'Field "options" must be an object'));
    }

    const optionsRecord = rawOptions as Record<string, unknown>;
    const optionOverrides: Partial<MinimatchOptions> = {};

    if ('dot' in optionsRecord && optionsRecord['dot'] !== undefined) {
      const value = optionsRecord['dot'];
      if (!isBoolean(value)) {
        return err(createConfigurationError('options.dot', value, 'Field "options.dot" must be a boolean'));
      }
      optionOverrides.dot = value;
    }

    if ('nocase' in optionsRecord && optionsRecord['nocase'] !== undefined) {
      const value = optionsRecord['nocase'];
      if (!isBoolean(value)) {
        return err(createConfigurationError('options.nocase', value, 'Field "options.nocase" must be a boolean'));
      }
      optionOverrides.nocase = value;
    }

    if ('matchBase' in optionsRecord && optionsRecord['matchBase'] !== undefined) {
      const value = optionsRecord['matchBase'];
      if (!isBoolean(value)) {
        return err(createConfigurationError('options.matchBase', value, 'Field "options.matchBase" must be a boolean'));
      }
      optionOverrides.matchBase = value;
    }

    if (Object.keys(optionOverrides).length > 0) {
      optionsOverride = optionOverrides;
    }
  }

  let namespaceOverrides: Partial<NamespacePolicy> | undefined;
  if ('namespaces' in cfg && cfg['namespaces'] !== undefined) {
    const rawNamespaces = cfg['namespaces'];
    if (!isRecord(rawNamespaces)) {
      return err(createConfigurationError('namespaces', rawNamespaces, 'Field "namespaces" must be an object'));
    }

    const namespacesRecord = rawNamespaces as Record<string, unknown>;
    const overrides: Partial<NamespacePolicy> = {};

    if ('exclusive' in namespacesRecord && namespacesRecord['exclusive'] !== undefined) {
      const value = namespacesRecord['exclusive'];
      if (!isStringArray(value)) {
        return err(
          createConfigurationError('namespaces.exclusive', value, 'Field "namespaces.exclusive" must be an array'),
        );
      }
      overrides.exclusive = [...value];
    }

    if ('additive' in namespacesRecord && namespacesRecord['additive'] !== undefined) {
      const value = namespacesRecord['additive'];
      if (!isStringArray(value)) {
        return err(
          createConfigurationError('namespaces.additive', value, 'Field "namespaces.additive" must be an array'),
        );
      }
      overrides.additive = [...value];
    }

    if (Object.keys(overrides).length > 0) {
      namespaceOverrides = overrides;
    }
  }

  let useDefaultExcludes: boolean | undefined;
  if ('useDefaultExcludes' in cfg && cfg['useDefaultExcludes'] !== undefined) {
    const rawUseDefault = cfg['useDefaultExcludes'];
    if (!isBoolean(rawUseDefault)) {
      return err(
        createConfigurationError('useDefaultExcludes', rawUseDefault, 'Field "useDefaultExcludes" must be a boolean'),
      );
    }
    useDefaultExcludes = rawUseDefault;
  }

  const normalizedConfig: DirectoryLabelerConfig = {
    version: 1,
    rules: normalizedRules,
  };

  if (optionsOverride) {
    normalizedConfig.options = optionsOverride as MinimatchOptions;
  }

  if (namespaceOverrides) {
    normalizedConfig.namespaces = namespaceOverrides as NamespacePolicy;
  }

  if (useDefaultExcludes !== undefined) {
    normalizedConfig.useDefaultExcludes = useDefaultExcludes;
  }

  return ok({ config: normalizedConfig, warnings });
}
