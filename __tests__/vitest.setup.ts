/**
 * Vitest global setup file
 * Runs before all tests to configure mocks and test environment
 */

import * as core from '@actions/core';
import { vi } from 'vitest';

// Mock @actions/core globally
vi.mock('@actions/core', async () => {
  const actual = await vi.importActual<typeof core>('@actions/core');
  return {
    ...actual,
    // Suppress debug logs and secret masking in test output
    debug: vi.fn(),
    setSecret: vi.fn(),
    // Keep other functions for tests to spy on
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    setFailed: vi.fn(),
    setOutput: vi.fn(),
    getInput: vi.fn(),
    getBooleanInput: vi.fn(),
    getMultilineInput: vi.fn(),
  };
});
