import { describe, expect, it } from 'vitest';

import * as pipeline from '../../src/workflow/pipeline';

describe('workflow pipeline re-exports', () => {
  it('should expose stage functions', () => {
    expect(typeof pipeline.initializeAction).toBe('function');
    expect(typeof pipeline.analyzePullRequest).toBe('function');
    expect(typeof pipeline.applyLabelsStage).toBe('function');
    expect(typeof pipeline.finalizeAction).toBe('function');
  });
});
