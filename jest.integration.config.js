const path = require('path');

// babel-preset-expo is a dependency of `expo`, so resolve it from there.
const babelPresetExpo = require.resolve('babel-preset-expo', {
  paths: [path.dirname(require.resolve('expo/package.json'))],
});

// Real HTTP against a local Supabase. Not the Expo preset: it swaps fetch for a React Native mock.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/lib/query/integration.test.ts'],
  transform: { '^.+\\.(ts|tsx)$': ['babel-jest', { presets: [babelPresetExpo] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
