import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default (() => {
  try {
    return defineConfig([
      globalIgnores(['dist']),
      {
        files: ['**/*.{ts,tsx}'],
        extends: [
          js.configs?.recommended ?? {},
          ...(tseslint.configs?.recommended ? [tseslint.configs.recommended] : []),
          ...(reactHooks.configs?.['recommended-latest'] ? [reactHooks.configs['recommended-latest']] : []),
          ...(reactRefresh.configs?.vite ? [reactRefresh.configs.vite] : []),
        ],
        languageOptions: {
          ecmaVersion: 2020,
          globals: globals.browser,
        },
      },
    ]);
  } catch (error) {
    console.error('ESLint configuration error:', error);
    throw error;
  }
})()
