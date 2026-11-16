import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores: ['dist', 'node_modules']},
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {globals: globals.node},
    rules: {
      /* "_" prefix marks a value that is deliberately unused (e.g. destructuring a field away) */
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}]
    }
  }
);
