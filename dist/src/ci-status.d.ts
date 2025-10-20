import type { getOctokit } from '@actions/github';
import type { CIStatus } from './types';
type Octokit = ReturnType<typeof getOctokit>;
export declare function getCIStatus(octokit: Octokit, owner: string, repo: string, headSha: string): Promise<CIStatus | null>;
export declare function allCIPassed(ciStatus: CIStatus | null | undefined): boolean;
export declare function anyCIFailed(ciStatus: CIStatus | null | undefined): boolean;
export {};
