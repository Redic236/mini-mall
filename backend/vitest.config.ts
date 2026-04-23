import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 30_000,
    testTimeout: 15_000,
    // Tests share a single MySQL DB — must run files serially.
    fileParallelism: false,
    // Set BEFORE any app module loads. Previously we tried to override
    // process.env inside tests/setup.ts, but ES module imports are hoisted,
    // so config/database.ts ran with the production DB_NAME before the
    // override took effect and tests ended up hitting the live mini_mall db.
    env: {
      NODE_ENV: 'test',
      DB_NAME: 'mini_mall_test',
      LOG_LEVEL: 'error',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
