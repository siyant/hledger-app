import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import eslint from '@eslint/js';

export default tseslint.config(
  // ESLint recommended rules
  eslint.configs.recommended,
  
  // Base config for all files
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'dist/**', 
      'build/**', 
      'node_modules/**',
      '**/*.d.ts'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      // React specific rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // Override some TypeScript ESLint rules as needed
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-inferrable-types': 'warn',
    },
  },
  
  // TypeScript ESLint recommended rules (non-type-checked)
  tseslint.configs.recommended,
);