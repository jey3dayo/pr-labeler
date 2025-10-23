import * as core from '@actions/core';
import * as github from '@actions/github';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import { createConfigurationError, ensureError, extractErrorStatus, type ConfigurationError } from '../../errors/index.js';

export const CONFIG_FILE_PATH = '.github/pr-labeler.yml';
export const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB

export interface FetchRepositoryConfigParams {
  token: string;
  owner: string;
  repo: string;
  ref: string;
}

/**
 * Fetch configuration file content from GitHub repository
 */
export function fetchRepositoryConfig(
  params: FetchRepositoryConfigParams,
): ResultAsync<string, ConfigurationError> {
  const { token, owner, repo, ref } = params;
  const octokit = github.getOctokit(token);

  return ResultAsync.fromPromise(
    octokit.rest.repos.getContent({
      owner,
      repo,
      path: CONFIG_FILE_PATH,
      ref,
    }),
    error => {
      const status = extractErrorStatus(error);
      if (status === 404) {
        core.info(`Configuration file ${CONFIG_FILE_PATH} not found, using defaults`);
        return createConfigurationError(CONFIG_FILE_PATH, 'not found', 'Configuration file not found');
      }
      return createConfigurationError(
        CONFIG_FILE_PATH,
        error,
        `Failed to fetch configuration file: ${ensureError(error).message}`,
      );
    },
  ).andThen(response => {
    if (!('content' in response.data)) {
      return errAsync(
        createConfigurationError(CONFIG_FILE_PATH, response.data, 'Response does not contain file content'),
      );
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const byteLen = Buffer.byteLength(content, 'utf-8');

    if (byteLen > MAX_CONFIG_SIZE) {
      core.warning(`Configuration file exceeds size limit (${byteLen} > ${MAX_CONFIG_SIZE} bytes), using defaults`);
      return errAsync(createConfigurationError(CONFIG_FILE_PATH, byteLen, 'Configuration file too large'));
    }

    return okAsync(content);
  });
}
