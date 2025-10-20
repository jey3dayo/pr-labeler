/**
 * Directory-Based Labeler: ラベル適用機能
 *
 * 名前空間ポリシー適用、冪等性保証、GitHub API呼び出し調整を担当
 */

import * as core from '@actions/core';
import * as github from '@actions/github';

import {
  createGitHubAPIError,
  createPermissionError,
  createRateLimitError,
  err,
  extractErrorMessage,
  extractErrorStatus,
  ok,
  type Result,
} from '../errors/index.js';
import type { LabelDecision } from './decision-engine.js';
import type { NamespacePolicy } from './types.js';

type Octokit = ReturnType<typeof github.getOctokit>;

/**
 * PRコンテキスト情報
 */
export interface PullRequestContext {
  repo: {
    owner: string;
    repo: string;
  };
  issue: {
    number: number;
  };
}

/**
 * ラベル適用結果
 */
export interface ApplyResult {
  /** 適用されたラベル */
  applied: string[];
  /** スキップされたラベル（既存重複） */
  skipped: string[];
  /** 削除されたラベル */
  removed?: string[];
  /** 失敗したラベル */
  failed: Array<{ label: string; reason: string }>;
}

/**
 * ラベル適用オプション
 */
export interface ApplyOptions {
  /** ラベル自動作成 */
  autoCreate: boolean;
  /** デフォルトラベル色 */
  labelColor?: string;
  /** デフォルトラベル説明 */
  labelDescription?: string;
}

/**
 * ラベル名から名前空間を抽出
 *
 * @param label - ラベル名
 * @returns 名前空間（コロンがない場合はundefined）
 */
function extractNamespace(label: string): string | undefined {
  const colonIndex = label.indexOf(':');
  if (colonIndex === -1) {
    return undefined;
  }
  return label.slice(0, colonIndex);
}

/**
 * Directory-Based Labelerのラベルを適用
 *
 * @param octokit - GitHub APIクライアント
 * @param context - PRコンテキスト
 * @param decisions - ラベル決定結果
 * @param namespaces - 名前空間ポリシー
 * @param options - ラベル適用オプション
 * @returns 適用結果またはエラー
 */
export async function applyDirectoryLabels(
  octokit: Octokit,
  context: PullRequestContext,
  decisions: LabelDecision[],
  namespaces: Required<NamespacePolicy>,
  options: ApplyOptions,
): Promise<
  Result<
    ApplyResult,
    | ReturnType<typeof createGitHubAPIError>
    | ReturnType<typeof createPermissionError>
    | ReturnType<typeof createRateLimitError>
  >
> {
  const result: ApplyResult = {
    applied: [],
    skipped: [],
    removed: [],
    failed: [],
  };

  // 空のdecisions配列は何もしない
  if (decisions.length === 0) {
    core.debug('No label decisions to apply.');
    return ok(result);
  }

  // 既存ラベルを取得
  let existingLabels: string[];
  try {
    const { data } = await octokit.rest.issues.listLabelsOnIssue({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });
    existingLabels = data.map(label => label.name);
    core.debug(`Existing labels: ${existingLabels.join(', ')}`);
  } catch (error) {
    const message = extractErrorMessage(error);
    const status = extractErrorStatus(error);

    if (status === 403) {
      return err(createPermissionError('issues: read', `Failed to list labels: ${message}`));
    }

    if (status === 429) {
      return err(createRateLimitError(`Rate limit exceeded: ${message}`));
    }

    return err(createGitHubAPIError(`Failed to list labels: ${message}`, status));
  }

  // 名前空間ポリシーに基づいて削除すべきラベルを決定
  const labelsToRemove = new Set<string>();
  const newLabels = decisions.map(d => d.label);

  for (const newLabel of newLabels) {
    const namespace = extractNamespace(newLabel);

    // exclusive名前空間の場合、同一名前空間の既存ラベルを削除
    if (namespace && namespaces.exclusive.includes(namespace)) {
      for (const existingLabel of existingLabels) {
        const existingNamespace = extractNamespace(existingLabel);
        if (existingNamespace === namespace && existingLabel !== newLabel) {
          labelsToRemove.add(existingLabel);
        }
      }
    }
  }

  // ラベルを削除
  for (const label of labelsToRemove) {
    try {
      await octokit.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        name: label,
      });
      result.removed?.push(label);
      core.info(`Removed label: ${label}`);
    } catch (error) {
      const message = extractErrorMessage(error);
      core.warning(`Failed to remove label "${label}": ${message}`);
      result.failed.push({ label, reason: `Failed to remove: ${message}` });
    }
  }

  // 追加すべきラベルを決定（既存重複を除外）
  const labelsToAdd = newLabels.filter(label => !existingLabels.includes(label));

  // スキップされたラベルを記録
  for (const label of newLabels) {
    if (existingLabels.includes(label)) {
      result.skipped.push(label);
      core.debug(`Skipped label (already exists): ${label}`);
    }
  }

  // ラベルを追加
  if (labelsToAdd.length > 0) {
    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: labelsToAdd,
      });
      result.applied.push(...labelsToAdd);
      core.info(`Applied labels: ${labelsToAdd.join(', ')}`);
    } catch (error) {
      const message = extractErrorMessage(error);
      const status = extractErrorStatus(error);

      // ラベル未存在エラー（422）の場合、auto_create_labelsが有効なら作成
      if (status === 422 && options.autoCreate) {
        core.info('Some labels do not exist. Attempting to create them...');
        await createMissingLabels(octokit, context, labelsToAdd, options, result);
      } else {
        // その他のエラーは失敗として記録
        for (const label of labelsToAdd) {
          result.failed.push({ label, reason: message });
        }
        core.error(`Failed to add labels: ${message}`);
      }
    }
  }

  core.debug(
    `Applied: ${result.applied.length}, Skipped: ${result.skipped.length}, Removed: ${result.removed?.length ?? 0}, Failed: ${result.failed.length}`,
  );
  return ok(result);
}

/**
 * 未存在のラベルを作成して追加
 */
async function createMissingLabels(
  octokit: Octokit,
  context: PullRequestContext,
  labels: string[],
  options: ApplyOptions,
  result: ApplyResult,
): Promise<void> {
  for (const label of labels) {
    // 1) Try to add the label individually (handles labels that already exist in the repo)
    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: [label],
      });
      result.applied.push(label);
      core.info(`Applied label: ${label}`);
      continue; // next label
    } catch (error) {
      const status = extractErrorStatus(error);
      // 422 ⇒ label likely doesn't exist in the repo; try to create
      if (status !== 422) {
        const message = extractErrorMessage(error);
        result.failed.push({ label, reason: `Failed to add: ${message}` });
        core.warning(`Failed to add label "${label}": ${message}`);
        continue;
      }
      // Fall through to create label
    }

    // 2) Create the missing label (ignore 422 already_exists) then add again
    try {
      await octokit.rest.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: label,
        color: options.labelColor || 'cccccc',
        description: options.labelDescription || '',
      });
      core.info(`Created label: ${label}`);
    } catch (error) {
      const status = extractErrorStatus(error);
      const message = extractErrorMessage(error);
      // If it already exists (422), proceed to add; otherwise record failure and continue
      if (status !== 422) {
        result.failed.push({ label, reason: `Failed to create: ${message}` });
        core.warning(`Failed to create label "${label}": ${message}`);
        continue;
      }
    }

    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: [label],
      });
      result.applied.push(label);
      core.info(`Applied label: ${label}`);
    } catch (error) {
      const message = extractErrorMessage(error);
      result.failed.push({ label, reason: `Failed to apply after create: ${message}` });
      core.warning(`Failed to apply label "${label}" after create: ${message}`);
    }
  }
}
