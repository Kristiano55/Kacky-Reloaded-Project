// ESLint (flat config, no packages to install): `npm run lint`.
const browser = Object.fromEntries(['window', 'document', 'location', 'history', 'navigator', 'fetch', 'URL', 'URLSearchParams',
  'matchMedia', 'IntersectionObserver', 'setTimeout', 'clearTimeout', 'console', 'performance'].map((g) => [g, 'readonly']));
const node = Object.fromEntries(['process', 'console', 'fetch', 'URL', 'URLSearchParams', 'setTimeout', 'clearTimeout'].map((g) => [g, 'readonly']));

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-unreachable': 'error',
  'no-const-assign': 'error',
  'no-self-assign': 'error',
  'no-shadow-restricted-names': 'error',
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'eqeqeq': ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-implied-eval': 'error',
  'no-eval': 'error',
  'no-new-func': 'error',
  'no-script-url': 'error',
};

export default [
  { ignores: ['_site/**', 'm/**', 'p/**', 'data/**', 'tools/**', 'thumbs/**', '**/*.min.js', 'node_modules/**'] },
  { files: ['js/**/*.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: browser }, rules },
  { files: ['scripts/**/*.mjs', 'tests/**/*.js', 'tests/**/*.mjs', 'eslint.config.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: node }, rules },
  // tests feed javascript: links on purpose, to check they are rejected
  { files: ['tests/**'], rules: { 'no-script-url': 'off' } },
];
