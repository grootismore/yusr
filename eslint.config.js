const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { files: ['src/__tests__/**'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  { ignores: ['dist/*', '.expo/*', 'classic-yusr/*', 'supabase/*', 'scripts/*'] },
];
