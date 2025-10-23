/**
 * PR Labeler - Main entry point
 * Analyzes pull request files and enforces size limits
 */

import { logErrorI18n, logInfoI18n, logWarningI18n, setFailed } from './actions-io';
import { isErrorWithMessage, isErrorWithTypeAndMessage } from './errors/index.js';
import { t } from './i18n.js';
import { writeSummary } from './summary/summary-writer';
import { analyzePullRequest, applyLabelsStage, finalizeAction, initializeAction } from './workflow/pipeline';

/**
 * Main action function orchestrating the workflow pipeline
 */
async function run(): Promise<void> {
  try {
    const context = await initializeAction();

    if (context.skipDraft) {
      logInfoI18n('draft.skipping');

      if (context.config.enableSummary) {
        const title = t('summary', 'draftPr.title');
        const message = t('summary', 'draftPr.message');
        const summaryResult = await writeSummary(`## ⏭️ ${title}\n\n${message}`);
        if (summaryResult.isErr()) {
          logWarningI18n('draft.summaryWriteFailed', { message: summaryResult.error.message });
        } else {
          logInfoI18n('draft.summaryWritten');
        }
      }

      logInfoI18n('completion.skippedDraft');
      return;
    }

    const analysisArtifacts = await analyzePullRequest(context);
    await applyLabelsStage(context, analysisArtifacts);
    await finalizeAction(context, analysisArtifacts);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logErrorI18n('completion.failed', { message: errorMessage });
    setFailed(errorMessage);
  }
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (isErrorWithTypeAndMessage(error)) {
    return `[${error.type}] ${error.message}`;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

// Run the action if this is the main module
if (require.main === module) {
  run();
}

// Export for testing
export { run };
