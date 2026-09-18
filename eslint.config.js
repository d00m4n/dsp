import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    // public/sw.js is a hand-written, plain-JS service worker (not part of
    // the TS/Svelte toolchain — see vite.config.ts's `homebase-sw-version`
    // plugin for how its placeholders get substituted at build time). It
    // still gets linted, just with the service-worker globals instead of
    // the browser ones, and with `__PRECACHE_MANIFEST__` declared as a
    // global since it's a build-time placeholder rather than a real
    // identifier at lint time.
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        __PRECACHE_MANIFEST__: 'readonly',
      },
    },
  },
  {
    // tools/checkBudget.mjs is a plain Node script (not part of the
    // TS/Svelte toolchain), so it needs Node globals (`process`, etc.)
    // rather than the browser ones used everywhere else.
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'playwright-report/'],
  },
);
