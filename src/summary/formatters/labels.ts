import { t } from '../../i18n.js';
import { escapeMarkdown } from './common.js';

/**
 * Format applied labels for Summary output.
 */
export function formatAppliedLabels(labels: string[] | undefined): string {
  if (labels === undefined) {
    return '';
  }

  const header = `### 🏷️ ${t('summary', 'labels.applied')}\n\n`;

  if (labels.length === 0) {
    return `${header}${t('summary', 'labels.noLabels')}\n\n`;
  }

  let output = header;
  for (const label of labels) {
    output += `- \`${escapeMarkdown(label)}\`\n`;
  }
  output += '\n';

  return output;
}
