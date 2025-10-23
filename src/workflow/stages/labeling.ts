import * as github from '@actions/github';

import { logDebugI18n, logErrorI18n, logInfoI18n, logWarningI18n, setFailed } from '../../actions-io';
import { getCIStatus } from '../../ci-status.js';
import { loadDirectoryLabelerConfig } from '../../directory-labeler/config-loader.js';
import { decideLabelsForFiles, filterByMaxLabels } from '../../directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from '../../directory-labeler/label-applicator.js';
import { t } from '../../i18n.js';
import { applyLabels } from '../../label-applicator';
import { decideLabels } from '../../label-decision-engine';
import type { PRContext } from '../../types';
import type { AnalysisArtifacts, InitializationArtifacts } from '../types';

/**
 * Apply PR labels including directory-based labeling
 */
export async function applyLabelsStage(context: InitializationArtifacts, artifacts: AnalysisArtifacts): Promise<void> {
  const { token, prContext, config, labelerConfig } = context;
  const { analysis, files, complexityMetrics } = artifacts;

  logInfoI18n('labels.decidingLabels');
  const prMetrics = {
    totalAdditions: analysis.metrics.totalAdditions,
    files: analysis.metrics.filesAnalyzed,
    ...(complexityMetrics && { complexity: complexityMetrics }),
  };

  const octokit = github.getOctokit(token);
  const extendedPRContext: PRContext = {
    owner: prContext.owner,
    repo: prContext.repo,
    pullNumber: prContext.pullNumber,
  };

  const useCiStatus = labelerConfig.risk.use_ci_status ?? true;
  if (useCiStatus) {
    logInfoI18n('ciStatus.fetching');
    const ciStatus = await getCIStatus(octokit, prContext.owner, prContext.repo, prContext.headSha);
    if (ciStatus) {
      extendedPRContext.ciStatus = ciStatus;
      logInfoI18n('ciStatus.status', {
        tests: ciStatus.tests,
        typeCheck: ciStatus.typeCheck,
        build: ciStatus.build,
        lint: ciStatus.lint,
      });
    } else {
      logInfoI18n('ciStatus.notAvailable');
    }

    try {
      const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
        owner: prContext.owner,
        repo: prContext.repo,
        pull_number: prContext.pullNumber,
        per_page: 100,
      });
      const messages: string[] = [];
      for (const commit of commits) {
        const msg = commit.commit.message;
        if (msg !== null && msg !== undefined) {
          const subject = msg.split('\n')[0];
          if (subject) {
            messages.push(subject);
          }
        }
      }
      extendedPRContext.commitMessages = messages;
      logInfoI18n('ciStatus.fetchedCommits', { count: messages.length });
    } catch (_error) {
      logInfoI18n('ciStatus.fetchCommitsFailed');
    }
  }

  const labelerDecisions = decideLabels(prMetrics, labelerConfig, extendedPRContext);
  if (labelerDecisions.isOk()) {
    const decisions = labelerDecisions.value;
    logInfoI18n('labels.labelsToAdd', { labels: decisions.labelsToAdd.join(', ') || 'none' });
    logInfoI18n('labels.labelsToRemove', { labels: decisions.labelsToRemove.join(', ') || 'none' });

    if (labelerConfig.runtime.dry_run) {
      logInfoI18n('labels.dryRun');
    } else {
      logInfoI18n('labels.applying');
      const applyResult = await applyLabels(
        token,
        {
          owner: prContext.owner,
          repo: prContext.repo,
          pullNumber: prContext.pullNumber,
        },
        decisions,
        labelerConfig.labels,
      );

      if (applyResult.isErr()) {
        if (applyResult.error.status === 403) {
          logWarningI18n('labels.skipped');
        } else if (labelerConfig.runtime.fail_on_error) {
          logErrorI18n('labels.applyFailed', { message: applyResult.error.message });
          setFailed(t('logs', 'completion.failed', { message: 'Failed to apply labels' }));
        } else {
          logWarningI18n('labels.applyFailed', { message: applyResult.error.message });
        }
      } else {
        const update = applyResult.value;
        logInfoI18n('labels.applied', { added: update.added.length, removed: update.removed.length });
        logInfoI18n('labels.apiCalls', { count: update.apiCalls });
      }
    }
  }

  if (!config.enableDirectoryLabeling) {
    return;
  }

  logInfoI18n('directoryLabeling.starting');
  const dirConfigResult = loadDirectoryLabelerConfig(config.directoryLabelerConfigPath);

  if (dirConfigResult.isErr()) {
    if (dirConfigResult.error.type === 'FileSystemError') {
      logInfoI18n('directoryLabeling.configNotFound', { path: config.directoryLabelerConfigPath });
      logInfoI18n('directoryLabeling.skipped');
    } else {
      logWarningI18n('directoryLabeling.configLoadFailed', { message: dirConfigResult.error.message });
      logInfoI18n('directoryLabeling.skipped');
    }
    return;
  }

  const dirConfig = dirConfigResult.value;
  dirConfig.useDefaultExcludes = config.useDefaultExcludes;

  const fileList = files.map(file => file.filename);
  const directoryDecisionsResult = decideLabelsForFiles(fileList, dirConfig);

  if (directoryDecisionsResult.isErr()) {
    logWarningI18n('directoryLabeling.decideFailed', { message: directoryDecisionsResult.error.message });
    return;
  }

  const directoryDecisions = directoryDecisionsResult.value;

  if (directoryDecisions.length === 0) {
    logInfoI18n('directoryLabeling.noLabelsMatched');
    return;
  }

  logInfoI18n('directoryLabeling.decided', { count: directoryDecisions.length });

  const { selected, rejected } = filterByMaxLabels(directoryDecisions, config.maxLabels);

  if (rejected.length > 0) {
    logWarningI18n('directoryLabeling.rejected', { count: rejected.length });
    for (const rejectedDecision of rejected) {
      logDebugI18n('directoryLabeling.rejectedDetail', {
        label: rejectedDecision.label,
        reason: rejectedDecision.reason,
      });
    }
  }

  const applyResult = await applyDirectoryLabels(
    octokit,
    {
      repo: {
        owner: prContext.owner,
        repo: prContext.repo,
      },
      issue: {
        number: prContext.pullNumber,
      },
    },
    selected,
    dirConfig.namespaces || { exclusive: ['size', 'area', 'type'], additive: ['scope', 'meta'] },
  );

  if (applyResult.isErr()) {
    if (applyResult.error.type === 'PermissionError') {
      logWarningI18n('directoryLabeling.permissionError', { message: applyResult.error.message });
      logWarningI18n('directoryLabeling.permissionHint');
    } else {
      logWarningI18n('directoryLabeling.applyFailed', { message: applyResult.error.message });
    }
    return;
  }

  const result = applyResult.value;
  logInfoI18n('directoryLabeling.applyResult', {
    applied: result.applied.length,
    skipped: result.skipped.length,
    removed: result.removed?.length || 0,
    failed: result.failed.length,
  });

  if (result.failed.length > 0) {
    for (const failed of result.failed) {
      logWarningI18n('directoryLabeling.failedDetail', { label: failed.label, reason: failed.reason });
    }
  }
}
