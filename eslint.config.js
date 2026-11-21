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
    // Architectural Boundary Enforcement:
    // apps/api/src/domain/ is strictly pure domain functions.
    // It must NEVER import from ai/, repo/, or http/ layers.
    files: ['apps/api/src/domain/**/*.{ts,tsx}'],
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
    },
  }
);
