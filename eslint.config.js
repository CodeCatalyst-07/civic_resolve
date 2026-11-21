import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.vercel/**',
      '**/coverage/**',
      '**/*.d.ts',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Web application accessibility and React hook verification
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Architectural Boundary & Purity Enforcement for Domain Layer:
    // 1. apps/api/src/domain/ is strictly pure domain functions.
    // 2. It must NEVER import from ai/, repo/, or http/ layers.
    // 3. It must NEVER use non-deterministic Date.now, new Date(), Math.random, or crypto imports.
    files: ['apps/api/src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'crypto',
              message:
                'Purity Violation: Do not import crypto in domain layer. Randomness must be injected as parameters.',
            },
            {
              name: 'node:crypto',
              message:
                'Purity Violation: Do not import node:crypto in domain layer. Randomness must be injected as parameters.',
            },
          ],
          patterns: [
            {
              group: [
                '**/ai',
                '**/ai/**',
                '**/repo',
                '**/repo/**',
                '**/http',
                '**/http/**',
                '../ai',
                '../ai/**',
                '../repo',
                '../repo/**',
                '../http',
                '../http/**',
                '../../ai',
                '../../ai/**',
                '../../repo',
                '../../repo/**',
                '../../http',
                '../../http/**',
              ],
              message:
                'Architectural Boundary Violation: Domain layer must remain pure and cannot import from ai/, repo/, or http/ layers.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message:
            'Purity Violation: Date.now() is non-deterministic. Inject time as a `now: Date` parameter.',
        },
        {
          object: 'Math',
          property: 'random',
          message:
            'Purity Violation: Math.random() is non-deterministic. Inject randomness as parameters (e.g. randomBytes: Uint8Array).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
          message:
            'Purity Violation: new Date() with no arguments is non-deterministic. Inject time as a `now: Date` parameter.',
        },
      ],
    },
  },
  // Architecture boundaries: AI layer cannot import from http/, repo/, or services/
  {
    files: ['apps/api/src/ai/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/repo',
                '**/repo/**',
                '**/http',
                '**/http/**',
                '**/services',
                '**/services/**',
                '../repo',
                '../repo/**',
                '../http',
                '../http/**',
                '../services',
                '../services/**',
                '../../repo',
                '../../repo/**',
                '../../http',
                '../../http/**',
                '../../services',
                '../../services/**',
              ],
              message:
                'Architectural Boundary Violation: AI layer cannot import from http/, repo/, or services/ layers.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundaries: Repo layer cannot import from http/, ai/, or services/
  {
    files: ['apps/api/src/repo/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/http',
                '**/http/**',
                '**/ai',
                '**/ai/**',
                '**/services',
                '**/services/**',
                '../http',
                '../http/**',
                '../ai',
                '../ai/**',
                '../services',
                '../services/**',
                '../../http',
                '../../http/**',
                '../../ai',
                '../../ai/**',
                '../../services',
                '../../services/**',
              ],
              message:
                'Architectural Boundary Violation: Repo layer cannot import from http/, ai/, or services/ layers.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundaries: Services layer cannot import from http/ or concrete repo implementations
  {
    files: ['apps/api/src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/http',
                '**/http/**',
                '../http',
                '../http/**',
                '../../http',
                '../../http/**',
                '**/repo/memory*',
                '**/repo/firestore*',
                '**/repo/factory*',
                '../repo/memory*',
                '../repo/firestore*',
                '../repo/factory*',
                '../../repo/memory*',
                '../../repo/firestore*',
                '../../repo/factory*',
              ],
              message:
                'Architectural Boundary Violation: Services layer cannot import from http/ or concrete repo implementations (only repo/types.js is permitted).',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundaries: HTTP routes cannot import ai/ or repo/ directly
  {
    files: ['apps/api/src/http/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/ai',
                '**/ai/**',
                '**/repo',
                '**/repo/**',
                '../ai',
                '../ai/**',
                '../repo',
                '../repo/**',
                '../../ai',
                '../../ai/**',
                '../../repo',
                '../../repo/**',
              ],
              message:
                'Architectural Boundary Violation: HTTP layer cannot import from ai/ or repo/ directly (use compose/services).',
            },
          ],
        },
      ],
    },
  },
  // Scripts environment (Node.js globals)
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  }
);
