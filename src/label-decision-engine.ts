/**
 * Label Decision Engine for PR Labeler
 * Determines which labels to apply based on PR metrics and configuration
 */

import { minimatch } from 'minimatch';
import { ok, Result } from 'neverthrow';

import { allCIPassed, anyCIFailed } from './ci-status.js';
import type { LabelDecisions, LabelerConfig, LabelReasoning, PRMetrics } from './labeler-types.js';
import type { ChangeType, PRContext } from './types.js';
import type { RiskConfig } from './types/config.js';
import { extractNamespace, matchesNamespacePattern } from './utils/namespace-utils.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

/**
 * Decide labels based on PR metrics and configuration
 * Pure function with no side effects
 *
 * @param metrics - PR metrics (additions, files, complexity)
 * @param config - Labeler configuration
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns LabelDecisions with labels to add/remove and reasoning
 */
export function decideLabels(
  metrics: PRMetrics,
  config: LabelerConfig,
  prContext?: PRContext,
): Result<LabelDecisions, never> {
  const reasoning: LabelReasoning[] = [];
  const labelsToAdd: string[] = [];

  // 1. Decide size label (if enabled)
  if (config.size.enabled) {
    const sizeLabel = decideSizeLabel(metrics.totalAdditions, config.size.thresholds);
    labelsToAdd.push(sizeLabel);
    reasoning.push({
      label: sizeLabel,
      reason: `additions (${metrics.totalAdditions}) falls in ${sizeLabel} range`,
      category: 'size',
    });
  }

  // 2. Decide complexity label (if complexity metrics available and enabled)
  if (metrics.complexity && config.complexity.enabled) {
    const complexityLabel = decideComplexityLabel(metrics.complexity.maxComplexity, config.complexity.thresholds);
    if (complexityLabel) {
      labelsToAdd.push(complexityLabel);
      reasoning.push({
        label: complexityLabel,
        reason: `max complexity (${metrics.complexity.maxComplexity}) exceeds ${complexityLabel.split('/')[1]} threshold`,
        category: 'complexity',
      });
    }
  }

  // 3. Decide category labels (if enabled)
  if (config.categoryLabeling.enabled) {
    const categoryLabels = decideCategoryLabels(
      metrics.files.map(f => f.path),
      config.categories,
    );
    labelsToAdd.push(...categoryLabels);
    for (const label of categoryLabels) {
      reasoning.push({
        label,
        reason: `file patterns match ${label} category`,
        category: 'category',
      });
    }
  }

  // 4. Decide risk label (if enabled)
  if (config.risk.enabled) {
    const riskLabel = decideRiskLabel(
      metrics.files.map(f => f.path),
      config.risk,
      prContext,
    );
    if (riskLabel) {
      labelsToAdd.push(riskLabel);
      reasoning.push({
        label: riskLabel,
        reason: getRiskReason(
          metrics.files.map(f => f.path),
          config.risk,
          riskLabel,
          prContext,
        ),
        category: 'risk',
      });
    }
  }

  // Determine labels to remove based on namespace policies
  const labelsToRemove = determineLabelsToRemove(labelsToAdd, config.labels.namespace_policies);

  return ok({
    labelsToAdd,
    labelsToRemove,
    reasoning,
  });
}

/**
 * Decide size label based on additions
 *
 * @param additions - Total additions in PR
 * @param thresholds - Size thresholds configuration
 * @returns Size label (size/small, size/medium, size/large, size/xlarge, or size/xxlarge)
 */
export function decideSizeLabel(
  additions: number,
  thresholds: { small: number; medium: number; large: number; xlarge: number },
): string {
  return calculateSizeLabel(additions, thresholds);
}

/**
 * Decide complexity label based on max complexity
 *
 * @param complexity - Maximum complexity in PR
 * @param thresholds - Complexity thresholds configuration
 * @returns Complexity label or null if complexity is low
 */
export function decideComplexityLabel(complexity: number, thresholds: { medium: number; high: number }): string | null {
  if (complexity >= thresholds.high) {
    return 'complexity/high';
  }
  if (complexity >= thresholds.medium) {
    return 'complexity/medium';
  }
  return null; // 低複雑度はラベルなし
}

/**
 * Decide category labels based on file patterns
 *
 * @param files - List of changed file paths
 * @param categories - Category configuration
 * @returns List of category labels
 */
export function decideCategoryLabels(
  files: string[],
  categories: Array<{ label: string; patterns: string[]; exclude?: string[] }>,
): string[] {
  const matchedLabels: string[] = [];

  for (const category of categories) {
    const hasMatch = files.some(file => {
      // パターンにマッチするかチェック
      const matchesPattern = category.patterns.some(pattern => minimatch(file, pattern));
      if (!matchesPattern) {
        return false;
      }

      // 除外パターンがある場合、除外パターンにマッチしないことを確認
      if (category.exclude) {
        const matchesExclude = category.exclude.some(pattern => minimatch(file, pattern));
        if (matchesExclude) {
          return false;
        }
      }

      return true;
    });
    if (hasMatch) {
      matchedLabels.push(category.label);
    }
  }

  return matchedLabels;
}

/**
 * Detect change type from commit messages
 * Checks each message prefix for conventional commits to avoid false positives
 *
 * @param commitMessages - List of commit messages (subject lines)
 * @returns Detected change type
 */
function detectChangeType(commitMessages: string[]): ChangeType {
  if (commitMessages.length === 0) {
    return 'unknown';
  }

  // Check each message prefix for conventional commits
  for (const message of commitMessages) {
    const lower = message.toLowerCase().trim();

    if (lower.startsWith('refactor:') || lower.startsWith('refactor(')) {
      return 'refactor';
    }
    if (lower.startsWith('fix:') || lower.startsWith('fix(')) {
      return 'fix';
    }
    if (lower.startsWith('feat:') || lower.startsWith('feat(')) {
      return 'feature';
    }
    if (lower.startsWith('docs:') || lower.startsWith('docs(')) {
      return 'docs';
    }
    if (lower.startsWith('test:') || lower.startsWith('test(')) {
      return 'test';
    }
    if (lower.startsWith('style:') || lower.startsWith('style(')) {
      return 'style';
    }
    if (lower.startsWith('chore:') || lower.startsWith('chore(')) {
      return 'chore';
    }
  }

  return 'unknown';
}

/**
 * Analyze risk factors from file changes
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration (core_paths and config_files)
 * @returns Risk factors analysis
 */
function analyzeRiskFactors(
  files: string[],
  config: { core_paths: string[]; config_files: string[] },
): { hasTestFiles: boolean; hasCoreChanges: boolean; hasConfigChanges: boolean } {
  return {
    hasTestFiles: files.some(
      f => f.includes('__tests__/') || f.includes('tests/') || /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(f),
    ),
    hasCoreChanges: files.some(f => config.core_paths.some(pattern => minimatch(f, pattern))),
    hasConfigChanges: files.some(f => config.config_files.some(pattern => minimatch(f, pattern))),
  };
}

/**
 * Risk evaluation result containing both label and reason
 */
type RiskEvaluation = {
  label: string | null;
  reason: string;
};

type RiskEvaluationConfig = Pick<
  RiskConfig,
  'high_if_no_tests_for_core' | 'core_paths' | 'config_files' | 'use_ci_status'
>;

/**
 * Evaluate risk based on file changes, CI status, and commit messages
 * Combines label decision and reason generation
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns Risk evaluation with label and reason
 */
function evaluateRisk(files: string[], config: RiskEvaluationConfig, prContext?: PRContext): RiskEvaluation {
  const { hasTestFiles, hasCoreChanges, hasConfigChanges } = analyzeRiskFactors(files, config);
  const useCIStatus = config.use_ci_status ?? true;

  // If CI status is available and enabled, consider it
  if (useCIStatus && prContext?.ciStatus) {
    const ciStatus = prContext.ciStatus;

    // High risk: CI checks failed
    if (anyCIFailed(ciStatus)) {
      return {
        label: 'risk/high',
        reason: 'CI checks failed (tests, type-check, build, or lint)',
      };
    }

    // Detect change type from commit messages
    const changeType = prContext.commitMessages ? detectChangeType(prContext.commitMessages) : 'unknown';

    // Low risk: Refactoring with all CI passed
    if (changeType === 'refactor' && allCIPassed(ciStatus)) {
      return {
        label: null,
        reason: 'refactoring with all CI checks passed',
      };
    }

    // High risk: Feature addition without test files + core changes
    if (changeType === 'feature' && !hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
      return {
        label: 'risk/high',
        reason: 'new feature in core functionality without test files',
      };
    }
  }

  // Fallback to original logic when CI status is not available or disabled
  // High risk: No tests + core changes
  if (!hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
    return {
      label: 'risk/high',
      reason: 'core functionality changed without test files',
    };
  }

  // Medium risk: Config file changes
  if (hasConfigChanges) {
    return {
      label: 'risk/medium',
      reason: 'configuration files changed',
    };
  }

  return {
    label: null,
    reason: '',
  };
}

/**
 * Decide risk label based on file changes, configuration, and PR context
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns Risk label or null
 */
export function decideRiskLabel(files: string[], config: RiskEvaluationConfig, prContext?: PRContext): string | null {
  return evaluateRisk(files, config, prContext).label;
}

/**
 * Get risk reason for label reasoning
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param label - Risk label (for validation)
 * @returns Reason string
 */
function getRiskReason(files: string[], config: RiskEvaluationConfig, label: string, prContext?: PRContext): string {
  const evaluation = evaluateRisk(files, config, prContext);

  // Validate that the provided label matches the evaluated label
  if (evaluation.label === label) {
    return evaluation.reason;
  }

  return 'unknown risk condition';
}

/**
 * Determine labels to remove based on namespace policies
 * For 'replace' policies, existing labels in that namespace should be removed
 *
 * @param labelsToAdd - Labels that will be added
 * @param policies - Namespace policies (replace/additive)
 * @returns Labels to remove
 */
function determineLabelsToRemove(labelsToAdd: string[], policies: Record<string, 'replace' | 'additive'>): string[] {
  // Extract namespaces from labels to add
  const namespacesToReplace = new Set<string>();

  for (const label of labelsToAdd) {
    const namespace = extractNamespace(label);
    if (namespace) {
      // Check if this namespace has a replace policy
      for (const [policyPattern, policy] of Object.entries(policies)) {
        if (policy === 'replace' && matchesNamespacePattern(namespace, policyPattern)) {
          namespacesToReplace.add(policyPattern);
        }
      }
    }
  }

  // Return list of namespace patterns to remove
  // The actual removal will be done by comparing with current labels in the applicator
  return Array.from(namespacesToReplace);
}
