import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/domain/**/*.ts',
        'src/ai/**/*.ts',
        'src/services/**/*.ts',
        'src/data/**/*.ts',
        'src/repo/**/*.ts',
        'src/http/**/*.ts',
      ],
      exclude: [
        'src/domain/**/*.test.ts',
        'src/domain/index.ts',
        'src/ai/index.ts',
        'src/ai/types.ts',
        'src/services/index.ts',
        'src/services/geocoding/index.ts',
        'src/services/geocoding/types.ts',
        'src/repo/index.ts',
        'src/repo/types.ts',
        // Firestore live client requires emulator or network; verified via firestoreSmoke.ts and test:firestore
        'src/repo/firestore.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        'src/domain/**': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        'src/ai/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
        'src/services/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
        'src/repo/**': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
        },
        'src/http/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
      },
      reporter: ['text', 'json', 'html'],
    },
  },
});
