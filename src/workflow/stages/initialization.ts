import { ResultAsync } from 'neverthrow';

import { getEnvVar, getPullRequestContext, logInfoI18n, logWarningI18n } from '../../actions-io';
import { buildCompleteConfig } from '../../config-builder.js';
import { getDefaultLabelerConfig, loadConfig } from '../../config-loader';
import { loadEnvironmentConfig } from '../../environment-loader.js';
import type { AppError } from '../../errors/index.js';
import { toAppError } from '../../errors/index.js';
import { initializeI18n } from '../../i18n.js';
import { parseActionInputs } from '../../input-parser.js';
import type { InitializationArtifacts, PullRequestRuntimeContext } from '../types';

/**
 * Resolve the ref used to read the labeler policy file (`.github/pr-labeler.yml`).
 *
 * Under `pull_request_target` the head ref is fork-controlled while the workflow runs with
 * base repository permissions, so reading policy from head would let a PR rewrite its own
 * policy (e.g. disable `runtime.dry_run`, alter risk paths). Policy is therefore read from
 * base, and never falls back to head: an unavailable base SHA falls back to the default
 * branch (no ref).
 */
function resolvePolicyConfigRef(prContext: PullRequestRuntimeContext): string | undefined {
  if (getEnvVar('GITHUB_EVENT_NAME') !== 'pull_request_target') {
    return prContext.headSha;
  }

  if (prContext.baseSha) {
    logInfoI18n('initialization.policyConfigFromBase', { ref: prContext.baseSha });
    return prContext.baseSha;
  }

  logWarningI18n('initialization.policyConfigBaseShaMissing');
  return undefined;
}

/**
 * Initialize action inputs, configuration, and i18n
 */
export function initializeAction(): ResultAsync<InitializationArtifacts, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      logInfoI18n('initialization.gettingInputs');
      const parsedInputsResult = parseActionInputs();
      if (parsedInputsResult.isErr()) {
        throw parsedInputsResult.error;
      }
      const parsedInputs = parsedInputsResult.value;

      const token = parsedInputs.githubToken;
      const prContext: PullRequestRuntimeContext = getPullRequestContext();

      logInfoI18n('initialization.analyzingPr', {
        prNumber: prContext.pullNumber,
        owner: prContext.owner,
        repo: prContext.repo,
      });

      const envConfig = loadEnvironmentConfig();

      logInfoI18n('labels.loading');
      const labelerConfigResult = await loadConfig(
        token,
        prContext.owner,
        prContext.repo,
        resolvePolicyConfigRef(prContext),
      );
      const labelerConfig = labelerConfigResult.unwrapOr(getDefaultLabelerConfig());

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      const i18nResult = initializeI18n(config.language);
      if (i18nResult.isErr()) {
        logWarningI18n('initialization.i18nFailed', { message: i18nResult.error.message });
      }

      const skipDraft = prContext.isDraft && config.skipDraftPr;

      return {
        token,
        prContext,
        config,
        labelerConfig,
        skipDraft,
      } satisfies InitializationArtifacts;
    })(),
    toAppError,
  );
}
