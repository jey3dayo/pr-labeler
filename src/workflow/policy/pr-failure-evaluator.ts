/**
 * PR failure evaluation policy wrapper
 */

import type { FailureEvaluationInput } from '../../failure-evaluator.js';
import { evaluateFailureConditions } from '../../failure-evaluator.js';

/**
 * Thin wrapper to encapsulate failure evaluation rules
 */
export class PRFailureEvaluator {
  public evaluate(input: FailureEvaluationInput): string[] {
    return evaluateFailureConditions(input);
  }
}

export type { FailureEvaluationInput };
