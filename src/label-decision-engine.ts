/**
 * Label Decision Engine for PR Labeler
 * Determines which labels to apply based on PR metrics and configuration
 */

import { minimatch } from 'minimatch';
import { ok, Result } from 'neverthrow';

import type { LabelDecisions, LabelerConfig, LabelReasoning, PRMetrics } from './labeler-types.js';

/**
 * Decide labels based on PR metrics and configuration
 * Pure function with no side effects
 *
 * @param metrics - PR metrics (additions, files, complexity)
 * @param config - Labeler configuration
 * @returns LabelDecisions with labels to add/remove and reasoning
 */
export function decideLabels(metrics: PRMetrics, config: LabelerConfig): Result<LabelDecisions, never> {
  const reasoning: LabelReasoning[] = [];
  const labelsToAdd: string[] = [];

  // 1. Decide size label
  const sizeLabel = decideSizeLabel(metrics.totalAdditions, config.size.thresholds);
  labelsToAdd.push(sizeLabel);
  reasoning.push({
    label: sizeLabel,
    reason: `additions (${metrics.totalAdditions}) falls in ${sizeLabel} range`,
    category: 'size',
  });

  // 2. Decide complexity label (if complexity metrics available)
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

  // 3. Decide category labels
  const categoryLabels = decideCategoryLabels(
    metrics.files.map(f => f.filename),
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

  // 4. Decide risk label
  const riskLabel = decideRiskLabel(
    metrics.files.map(f => f.filename),
    config.risk,
  );
  if (riskLabel) {
    labelsToAdd.push(riskLabel);
    reasoning.push({
      label: riskLabel,
      reason: getRiskReason(
        metrics.files.map(f => f.filename),
        config.risk,
        riskLabel,
      ),
      category: 'risk',
    });
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
 * @returns Size label (size/small, size/medium, size/large, or size/xlarge)
 */
export function decideSizeLabel(
  additions: number,
  thresholds: { small: number; medium: number; large: number },
): string {
  if (additions < thresholds.small) {
    return 'size/small';
  }
  if (additions < thresholds.medium) {
    return 'size/medium';
  }
  if (additions < thresholds.large) {
    return 'size/large';
  }
  return 'size/xlarge';
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
  categories: Array<{ label: string; patterns: string[] }>,
): string[] {
  const matchedLabels: string[] = [];

  for (const category of categories) {
    const hasMatch = files.some(file => category.patterns.some(pattern => minimatch(file, pattern)));
    if (hasMatch) {
      matchedLabels.push(category.label);
    }
  }

  return matchedLabels;
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
    hasTestFiles: files.some(f => f.includes('__tests__/') || f.match(/\.test\.(ts|tsx|js|jsx)$/) !== null),
    hasCoreChanges: files.some(f => config.core_paths.some(pattern => minimatch(f, pattern))),
    hasConfigChanges: files.some(f => config.config_files.some(pattern => minimatch(f, pattern))),
  };
}

/**
 * Decide risk label based on file changes and configuration
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @returns Risk label or null
 */
export function decideRiskLabel(
  files: string[],
  config: {
    high_if_no_tests_for_core: boolean;
    core_paths: string[];
    coverage_threshold?: number;
    config_files: string[];
  },
): string | null {
  const { hasTestFiles, hasCoreChanges, hasConfigChanges } = analyzeRiskFactors(files, config);

  // High risk: No tests + core changes
  if (!hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
    return 'risk/high';
  }

  // Medium risk: Config file changes
  if (hasConfigChanges) {
    return 'risk/medium';
  }

  return null;
}

/**
 * Get risk reason for label reasoning
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param label - Risk label
 * @returns Reason string
 */
function getRiskReason(
  files: string[],
  config: {
    high_if_no_tests_for_core: boolean;
    core_paths: string[];
    config_files: string[];
  },
  label: string,
): string {
  const { hasTestFiles, hasCoreChanges, hasConfigChanges } = analyzeRiskFactors(files, config);

  if (label === 'risk/high' && !hasTestFiles && hasCoreChanges) {
    return 'core functionality changed without test files';
  }
  if (label === 'risk/medium' && hasConfigChanges) {
    return 'configuration files changed';
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

/**
 * Extract namespace from label (e.g., "size/small" -> "size")
 *
 * @param label - Full label name
 * @returns Namespace or null if no slash found
 */
function extractNamespace(label: string): string | null {
  const slashIndex = label.indexOf('/');
  if (slashIndex === -1) {
    return null;
  }
  return label.substring(0, slashIndex);
}

/**
 * Check if namespace matches a pattern (supports wildcard)
 *
 * @param namespace - Namespace string (e.g., "size")
 * @param pattern - Pattern string (e.g., "size/*" or "size")
 * @returns True if namespace matches pattern
 */
function matchesNamespacePattern(namespace: string, pattern: string): boolean {
  // Remove trailing /* if present
  const normalizedPattern = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
  return namespace === normalizedPattern;
}
