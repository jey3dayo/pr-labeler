import { Result } from 'neverthrow';
import type { DiffError } from './errors';
export interface DiffFile {
    filename: string;
    additions: number;
    deletions: number;
    status: 'added' | 'modified' | 'renamed' | 'copied';
}
export interface DiffResult {
    files: DiffFile[];
    strategy: 'local-git' | 'github-api';
}
export interface PullRequestContext {
    owner: string;
    repo: string;
    pullNumber: number;
    baseSha: string;
    headSha: string;
}
export declare class DiffStrategy {
    execute(context: PullRequestContext, token: string): Promise<Result<DiffResult, DiffError>>;
}
export declare function getDiffFiles(context: PullRequestContext, token: string): Promise<Result<DiffResult, DiffError>>;
//# sourceMappingURL=diff-strategy.d.ts.map