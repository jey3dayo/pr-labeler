import { Result } from 'neverthrow';
import type { GitHubAPIError } from './errors';
import type { AnalysisResult } from './file-metrics';
import type { PRContext } from './types';
export interface CommentConfig {
    commentMode: 'always' | 'auto' | 'never';
}
export interface CommentResult {
    action: 'created' | 'updated' | 'deleted' | 'skipped';
    commentId: number | null;
}
export declare const COMMENT_SIGNATURE = "<!-- pr-metrics-action -->";
export declare function generateCommentBody(analysisResult: AnalysisResult): string;
export declare function findExistingComment(token: string, context: PRContext): Promise<Result<number | null, GitHubAPIError>>;
export declare function postComment(body: string, token: string, context: PRContext): Promise<Result<number, GitHubAPIError>>;
export declare function updateComment(commentId: number, body: string, token: string, context: PRContext): Promise<Result<void, GitHubAPIError>>;
export declare function deleteComment(commentId: number, token: string, context: PRContext): Promise<Result<void, GitHubAPIError>>;
export declare function manageComment(analysisResult: AnalysisResult, config: CommentConfig, token: string, context: PRContext): Promise<Result<CommentResult, GitHubAPIError>>;
