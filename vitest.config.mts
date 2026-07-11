import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    // Needed so React Testing Library's auto-cleanup (which hooks into a
    // global `afterEach`) runs between tests in the same file.
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest's own defaults (**/node_modules/**, **/dist/**, etc.) are
    // REPLACED, not extended, once `exclude` is set here -- so the bare
    // 'node_modules' literal below only ever matched the root folder, not
    // any nested one. That was invisible until mobile/ became this repo's
    // first subdirectory with its own node_modules: without the recursive
    // pattern, Vitest was collecting test-like fixture files from deep
    // inside mobile/node_modules. mobile/** is also excluded outright --
    // it's a separate project with its own toolchain (see mobile/AGENTS.md).
    exclude: ['**/node_modules/**', '.next/**', 'e2e/**', 'mobile/**'],
  },
});
