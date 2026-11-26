import js from '@eslint/js';
import globals from 'globals';

// `npm run lint`. no-undef is the important rule here: a name used without being defined or
// imported (the "s is not defined" kind of bug) is reported before the game ever runs.
export default [
  { ignores: ['dist/', 'dist-single/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      // leftovers are worth a look but should not fail the lint
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-useless-assignment': 'warn',
    },
  },
  {
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
];
