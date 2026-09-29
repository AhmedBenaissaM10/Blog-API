// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true, // replaces the plugin — same effect, built in
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts', './tests/helpers/setupTestDb.ts'],
    fileParallelism: false,
    testTimeout: 10000,
    alias: {
      '@middlewares/rateLimiter': path.resolve(__dirname, 'tests/mocks/rateLimiter.ts'),
    },
  },
});
