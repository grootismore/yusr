const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', '.agents/*', '.claude/*', 'supabase/functions/*'] },
  // Standalone Node scripts (the accept-page browser check) run in CommonJS.
  { files: ['web/**/*.cjs'], languageOptions: { globals: { __dirname: 'readonly' } } },
];
