import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Only pure-TypeScript domain logic is unit tested (no React Native imports),
// so a plain node environment is enough. The alias mirrors tsconfig "paths".
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
