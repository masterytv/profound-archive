import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Characterization tests stub network/DB at the module boundary; nothing
    // here should ever reach a real Supabase project or AI provider.
    setupFiles: ['tests/setup.ts'],
  },
});
