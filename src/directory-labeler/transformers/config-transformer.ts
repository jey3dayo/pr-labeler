import { err, ok, type Result } from 'neverthrow';

import { createConfigurationError } from '../../errors/index.js';
import { validateObjectInput } from '../../utils/config-transformer-utils.js';
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

type ConfigError = ReturnType<typeof createConfigurationError>;

function validateVersion(cfg: Record<string, unknown>): Result<void, ConfigError> {
  if (!('version' in cfg)) {
    return err(createConfigurationError('version', cfg['version'], 'Field "version" is required'));
  }
  if (cfg['version'] !== 1) {
    return err(
      createConfigurationError('version', cfg['version'], 'Field "version" must be 1 (current schema version)'),
    );
  }
  return ok(undefined);
}

function parseSingleRule(
  rule: unknown,
  index: number,
  labelsSeen: Set<string>,
  warnings: string[],
): Result<LabelRule, ConfigError> {
  if (!isRecord(rule)) {
    return err(createConfigurationError(`rules[${index}]`, rule, `Rule at index ${index} must be an object`));
  }

  const label = rule['label'];
  if (!isString(label)) {
    return err(
      createConfigurationError(
        `rules[${index}].label`,
        label,
        `Field "label" is required and must be a string in rule at index ${index}`,
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
        `rules[${index}].include`,
        rule['include'],
        `Field "include" is required in rule at index ${index}`,
      ),
    );
  }

  const include = rule['include'];
  if (!isNonEmptyStringArray(include)) {
    return err(
      createConfigurationError(
        `rules[${index}].include`,
        include,
        `Field "include" must be a non-empty array in rule at index ${index}`,
      ),
    );
  }

  let exclude: string[] | undefined;
  if ('exclude' in rule && rule['exclude'] !== undefined) {
    const rawExclude = rule['exclude'];
    if (!isStringArray(rawExclude)) {
      return err(
        createConfigurationError(
          `rules[${index}].exclude`,
          rawExclude,
          `Field "exclude" must be an array in rule at index ${index}`,
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
          `rules[${index}].priority`,
          rawPriority,
          `Field "priority" must be a number in rule at index ${index}`,
        ),
      );
    }
    priority = rawPriority;
  }

  const normalizedRule: LabelRule = { label, include: [...include] };
  if (exclude) {normalizedRule.exclude = exclude;}
  if (priority !== undefined) {normalizedRule.priority = priority;}

  return ok(normalizedRule);
}

function parseRulesField(
  cfg: Record<string, unknown>,
): Result<{ rules: LabelRule[]; warnings: string[] }, ConfigError> {
  if (!('rules' in cfg)) {
    return err(createConfigurationError('rules', cfg['rules'], 'Field "rules" is required'));
  }

  const rawRules = cfg['rules'];
  if (!Array.isArray(rawRules)) {
    return err(createConfigurationError('rules', rawRules, 'Field "rules" must be an array'));
  }

  const warnings: string[] = [];
  if (rawRules.length === 0) {
    warnings.push('Configuration has no rules defined. No labels will be applied.');
  }

  const normalizedRules: LabelRule[] = [];
  const labelsSeen = new Set<string>();

  for (let i = 0; i < rawRules.length; i++) {
    const ruleResult = parseSingleRule(rawRules[i], i, labelsSeen, warnings);
    if (ruleResult.isErr()) {return err(ruleResult.error);}
    normalizedRules.push(ruleResult.value);
  }

  return ok({ rules: normalizedRules, warnings });
}

function parseBooleanOption(
  record: Record<string, unknown>,
  key: string,
  fieldPath: string,
): Result<boolean | undefined, ConfigError> {
  if (!(key in record) || record[key] === undefined) {return ok(undefined);}
  const value = record[key];
  if (!isBoolean(value)) {
    return err(createConfigurationError(fieldPath, value, `Field "${fieldPath}" must be a boolean`));
  }
  return ok(value);
}

function parseOptionsField(cfg: Record<string, unknown>): Result<Partial<MinimatchOptions> | undefined, ConfigError> {
  if (!('options' in cfg) || cfg['options'] === undefined) {return ok(undefined);}

  const rawOptions = cfg['options'];
  if (!isRecord(rawOptions)) {
    return err(createConfigurationError('options', rawOptions, 'Field "options" must be an object'));
  }

  const optionsRecord = rawOptions as Record<string, unknown>;
  const optionOverrides: Partial<MinimatchOptions> = {};

  const dotResult = parseBooleanOption(optionsRecord, 'dot', 'options.dot');
  if (dotResult.isErr()) {return err(dotResult.error);}
  if (dotResult.value !== undefined) {optionOverrides.dot = dotResult.value;}

  const nocaseResult = parseBooleanOption(optionsRecord, 'nocase', 'options.nocase');
  if (nocaseResult.isErr()) {return err(nocaseResult.error);}
  if (nocaseResult.value !== undefined) {optionOverrides.nocase = nocaseResult.value;}

  const matchBaseResult = parseBooleanOption(optionsRecord, 'matchBase', 'options.matchBase');
  if (matchBaseResult.isErr()) {return err(matchBaseResult.error);}
  if (matchBaseResult.value !== undefined) {optionOverrides.matchBase = matchBaseResult.value;}

  return ok(Object.keys(optionOverrides).length > 0 ? optionOverrides : undefined);
}

function parseStringArrayOption(
  record: Record<string, unknown>,
  key: string,
  fieldPath: string,
): Result<string[] | undefined, ConfigError> {
  if (!(key in record) || record[key] === undefined) {return ok(undefined);}
  const value = record[key];
  if (!isStringArray(value)) {
    return err(createConfigurationError(fieldPath, value, `Field "${fieldPath}" must be an array`));
  }
  return ok([...value]);
}

function parseNamespacesField(cfg: Record<string, unknown>): Result<Partial<NamespacePolicy> | undefined, ConfigError> {
  if (!('namespaces' in cfg) || cfg['namespaces'] === undefined) {return ok(undefined);}

  const rawNamespaces = cfg['namespaces'];
  if (!isRecord(rawNamespaces)) {
    return err(createConfigurationError('namespaces', rawNamespaces, 'Field "namespaces" must be an object'));
  }

  const namespacesRecord = rawNamespaces as Record<string, unknown>;
  const overrides: Partial<NamespacePolicy> = {};

  const exclusiveResult = parseStringArrayOption(namespacesRecord, 'exclusive', 'namespaces.exclusive');
  if (exclusiveResult.isErr()) {return err(exclusiveResult.error);}
  if (exclusiveResult.value !== undefined) {overrides.exclusive = exclusiveResult.value;}

  const additiveResult = parseStringArrayOption(namespacesRecord, 'additive', 'namespaces.additive');
  if (additiveResult.isErr()) {return err(additiveResult.error);}
  if (additiveResult.value !== undefined) {overrides.additive = additiveResult.value;}

  return ok(Object.keys(overrides).length > 0 ? overrides : undefined);
}

function parseUseDefaultExcludesField(cfg: Record<string, unknown>): Result<boolean | undefined, ConfigError> {
  if (!('useDefaultExcludes' in cfg) || cfg['useDefaultExcludes'] === undefined) {return ok(undefined);}
  const rawUseDefault = cfg['useDefaultExcludes'];
  if (!isBoolean(rawUseDefault)) {
    return err(
      createConfigurationError('useDefaultExcludes', rawUseDefault, 'Field "useDefaultExcludes" must be a boolean'),
    );
  }
  return ok(rawUseDefault);
}

export function parseDirectoryLabelerConfig(
  config: unknown,
): Result<DirectoryLabelerConfigTransformResult, ConfigError> {
  const objectValidation = validateObjectInput(config, 'config');
  if (objectValidation.isErr()) {return err(objectValidation.error);}

  const cfg = objectValidation.value;

  const versionResult = validateVersion(cfg);
  if (versionResult.isErr()) {return err(versionResult.error);}

  const rulesResult = parseRulesField(cfg);
  if (rulesResult.isErr()) {return err(rulesResult.error);}

  const optionsResult = parseOptionsField(cfg);
  if (optionsResult.isErr()) {return err(optionsResult.error);}

  const namespacesResult = parseNamespacesField(cfg);
  if (namespacesResult.isErr()) {return err(namespacesResult.error);}

  const useDefaultExcludesResult = parseUseDefaultExcludesField(cfg);
  if (useDefaultExcludesResult.isErr()) {return err(useDefaultExcludesResult.error);}

  const normalizedConfig: DirectoryLabelerConfig = {
    version: 1,
    rules: rulesResult.value.rules,
  };

  if (optionsResult.value) {normalizedConfig.options = optionsResult.value as MinimatchOptions;}
  if (namespacesResult.value) {normalizedConfig.namespaces = namespacesResult.value as NamespacePolicy;}
  if (useDefaultExcludesResult.value !== undefined) {normalizedConfig.useDefaultExcludes = useDefaultExcludesResult.value;}

  return ok({ config: normalizedConfig, warnings: rulesResult.value.warnings });
}
