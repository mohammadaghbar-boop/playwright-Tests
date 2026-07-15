// Flat ESLint config (ESLint 9+). Run `npm install` first to pull the devDeps.
// Intentionally lenient: the existing suite has ~62 `any` and console usages, so
// these are warnings (visible, non-blocking) rather than errors — tighten over time.
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'playwright-report-jf575/',
      'test-results/',
      'blob-report/',
      '**/.auth/',
      '.claude/',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.spec.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // The suite logs progress to the console in several specs; keep it allowed for now.
      'no-console': 'off',
    },
  },
);
