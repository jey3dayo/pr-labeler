/**
 * GitHub Actions entry point
 * This file is the ncc build entry to avoid ESM module check issues
 * with require.main === module when using moduleResolution: Bundler
 */
import { run } from './index.js';

void run();
