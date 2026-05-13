import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import configPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/.output/**',
      '**/.temp/**',
      '**/.vitepress/dist/**',
      '**/.vitepress/cache/**',
      'node_modules/**',
    ],
  },

  // Base JS/TS config
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Vue config
  ...pluginVue.configs['flat/recommended'],

  // Custom rules and language options
  {
    files: ['**/*.{ts,vue,mts}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // TypeScript handles undefined variables better than ESLint
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console for now
    },
  },

  // Prettier config (must be last to override styling rules)
  configPrettier,
);
